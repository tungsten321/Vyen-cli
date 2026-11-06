---
name: untangle-codebase
description: Use when a codebase (or one area of it) has become tangled — duplicated logic, hidden coupling, special cases everywhere — and needs a structural untangle so future changes land in one place. Adapted from caldoai/skills untangle-codebase to comply with this repo's AGENTS.md gate. Also triggered by /untangle-codebase.
---

# Untangle Codebase Skill — Vyen-adapted

When invoked, the agent untangles the codebase (or the user-named area) so agents
working in it read less per change, break less without noticing, and debug faster.

**Why do this at all?**

- **Better output:** agents write better code in a well-structured codebase.
- **Cheaper & faster changes:** agents spend fewer tokens searching and more on the problem.
- **Fewer silent breaks:** agents break less without noticing.
- **Faster debugging:** agents find root causes faster.

> **Hard constraint — this repo's AGENTS.md overrides the "fix everything in one
> pass" idea.** A whole-repo big-bang refactor is forbidden (§6 surgical rule,
> §1 gate). This skill runs as: **audit whole scope → fix one decision-log entry
> at a time, each through the full gate**. The audit part may cover everything;
> the fixing part never does.

## 1. Ask

Besides untangling, there are two other things you may do:

| Addition | What it does |
| --- | --- |
| **Comments** | Remove comments that only restate the code. |
| **Tests** | Remove tests that wouldn't catch a real bug, and fix the ones that fail without one. |

List these (with their exact descriptions) for the user and ask which ones to do.
Then do only those. Also ask which **area** to focus on if they didn't say —
default to the single highest-leverage module, not the whole repo.

## 2. List every problem (audit — no code changes yet)

Go through the area asking one thing: **should these pieces change together?**
Write down every place the code gets the answer wrong, as in the
[decision log example](#decision-log-example). There are only three ways to get
it wrong.

**Hidden links:** pieces that must change together, where the code doesn't show it.

- Copies of logic or values: change one and the others must change too, but nothing says so.
- A module that reads a global or file set by another module: change that module and this one breaks, but nothing shows it.
- A feature split across folders by layer, or related code in different folders: one change needs all of them, but the layout hides that.
- A call order or convention callers just have to know: change it and callers break, but nothing warns them.

**Needless links:** pieces tied together that change for different reasons.

- Callers that depend on internals: the internals change for their own reasons, and the callers break anyway.
- Stable code that imports something more volatile: the stable code has to change whenever the volatile code does (dependency direction).
- A general function with a parameter only one workflow understands: the function has to change whenever that workflow does.
- A shallow module: its interface changes whenever its internals do, so its callers change with it.

**Surplus:** pieces with no reason of their own to change.

- Wrappers: they only change when the thing they wrap does (pass-through wrappers).
- Extension points and config for things that never vary: nothing will ever change them (speculative generality).
- Dead code: nothing uses it, so nothing will ever need it to change. → **In this
  repo: if dead code is outside the current fix's scope, REPORT it, do not delete
  it here (§6). Delete only dead code created by your own change or inside the
  module you are fixing.**

Also write down every **special case**: code that exists for one situation
instead of following from how the system works. Each one is a requirement the
design never accounted for, so use them to work out what the system needs to be.

- An `if` for one value
- A parameter for a specific caller
- A swallowed exception
- A retry or sleep
- A disabled test

## 3. Redesign from first principles

Work out the fixes as if the system had known today's requirements from the
start. Look for the one fix behind several problems, which often looks nothing
like them. Don't fix special cases one by one.

Ask the same thing of every fix, even one that looks better in the code: pieces
that change together end up together, pieces that don't aren't tied, and
everything depends on what changes less.

Write each fix above the problems it solves, as in the
[decision log example](#decision-log-example). **Rank fixes by leverage** (how
many problems each one kills) and fix in that order — one at a time.

Before starting each fix, check for contract impact (§7.3): if the fix changes
a signature, return type, or behaviour, grep every caller over the whole tree
first and fix it in the shared place, once. Check whether it is a new tool /
slash command / config key / event — if so, all seams in AGENTS.md §3 / §3.1
apply. Check SPEC drift: if code and `docs/SPEC.md` disagree, say which is the
bug.

## 4. Fix ONE entry at a time, through the gate

Never fix the whole list in one diff. For each decision-log entry, run a full
surgical turn:

1. **RED test first (§2):** write the test, prove it fails on the current code,
   restore, prove green. Expectations from the requirement, not from the code.
2. **Implement** only that entry. Remove the special cases the redesign makes
   unnecessary; keep the ones the system still needs.
3. **Gate (§1):** `npm run typecheck` exit 0, `npm run lint` no new errors,
   `npm test` exit 0. Report exact output — never claim "done" without it.
4. **Independent review (Law 4):** a fresh-context subagent reviews the diff
   against `REVIEW.md` and runs an end-to-end probe. Max 3 rounds per fix; if
   it still fails after three, **stop and come back to the user** — do not keep
   churning.
5. Report, then move to the next entry. Unrelated dead code noticed along the
   way: mention it in the report, do not touch it.

If the user chose Comments:

- Comments that restate the implementation only change when it does — remove them.
- Comments about something outside the code (e.g. `// the proxy drops websockets, so we poll`) — keep them.
- Comments explaining a workaround go when the redesign removes that problem.

If the user chose Tests, do this last (tests are the regression safety net). A
test should fail on a regression, and only then:

- Tests repeating the implementation check the same interpretation against
  itself — remove them.
- Tests tied to internals: rewrite them to depend on behaviour, which changes less.
- Tests that can't fail aren't checking anything — remove them.

## 5. Check, and repeat until done

Have subagents search the area for remaining special cases, hidden links,
needless links and surplus. **Do not stop until there is nothing worth fixing
left in the area.**

You're done when:

- **As few special cases are left in the area as possible.** How many remain is
  the best measure of how close you are.
- A typical change lands in one place.
- Every import is reasonable, and nothing imports anything more volatile than itself.
- Subagents have no issues left that are worth fixing.
- Intended behaviour is the same as when you started, apart from bugs the
  refactor fixed. Verify with the gate + end-to-end scenario output.

**Tips**

- **Start from a skeleton:** script away the function bodies, so the whole codebase fits in context.
- **Summarize with subagents:** have them summarize parts of the codebase, so you can reason across all of it at once.
- **Check the dependency graph often:** script one that shows what imports what, and rerun it as you go.
- **Enter where leverage is highest:** start looking there first.
- **Keep a decision log:** compaction is less of a problem that way.
- **Use Git as evidence:** for how often pieces change, and what changes together.

<a id="decision-log-example"></a>**Decision log example**

The list of problems:

```md
- `ui/LogoutDialog.tsx:30` waits 100ms after closing and hopes the message input can take focus by then.
- `ui/Toolbar.tsx:40` and `ui/Menu.tsx:22` call the same actions, each with its own check for when they're disabled.
- `checkout/submit.ts:9` depends directly on `payments/stripe.ts`.
- `shortcuts/keymap.ts:18` has a switch with one case per action, separate from the menu's list.
- `ui/CommandPalette.tsx:55` keeps its own list of actions, and it's missing the newer ones.
- `ui/SettingsDialog.tsx:61` sets a global `skipRefocus` flag to stop the logout dialog it opens from sending focus to the message input.
- `history/undo.ts:30` has a special case for every action that can be undone.
- `refunds/refund.ts:22` wraps every Stripe call in `if (order.provider === "paypal")`.
- Every action handler has to call `track()` by hand, and some don't.
- `ui/Toolbar.test.tsx` and `ui/Menu.test.tsx` test the same actions separately.
```

Then with the fixes:

```md
- Make the general `Dialog` give focus back to whatever had it before it opened, so the wait and the flag can both go.
  - `ui/LogoutDialog.tsx:30` waits 100ms after closing and hopes the message input can take focus by then.
  - `ui/SettingsDialog.tsx:61` sets a global `skipRefocus` flag to stop the logout dialog it opens from sending focus to the message input.
- Define a `PaymentProvider` interface that Stripe and PayPal both implement, so checkout and refunds no longer know which one they're using.
  - `checkout/submit.ts:9` depends directly on `payments/stripe.ts`.
  - `refunds/refund.ts:22` wraps every Stripe call in `if (order.provider === "paypal")`.
- Make every user action a command with a name, a handler and an undo, so the toolbar, menu, shortcuts, palette and undo history all run from one list.
  - `ui/Toolbar.tsx:40` and `ui/Menu.tsx:22` call the same actions, each with its own check for when they're disabled.
  - `shortcuts/keymap.ts:18` has a switch with one case per action, separate from the menu's list.
  - `ui/CommandPalette.tsx:55` keeps its own list of actions, and it's missing the newer ones.
  - `history/undo.ts:30` has a special case for every action that can be undone.
  - Every action handler has to call `track()` by hand, and some don't.
  - `ui/Toolbar.test.tsx` and `ui/Menu.test.tsx` test the same actions separately.
```
