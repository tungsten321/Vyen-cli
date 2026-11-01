# AGENT_LEARNINGS.md — Empirical Lessons & Anti-Patterns for AI Agents

Loaded by `loadProjectInstructions` in `src/context.ts`. When a mistake is confirmed
(red test, review verdict, user correction), append evidence here—never duplicate
rules from `AGENTS.md`.

## 1. System Seams: The Four Execution Runners Rule
- **Detail:** `cli.ts`, `subagents.ts`, `network.ts`, and `workflow.ts` must all inherit policy & hooks.
- **"Attach" means live:** pass live policy evaluator, not a snapshot; test updates after construction.

## 2. Shell Security: Segment-Aware Matching
- **Detail:** split on compound operators (`;`, `&&`, `||`, `|`, newline, `$()`, `<()`, `>()`, backticks); strip subshells, quotes, wrappers (`sudo`, `env`, `sh/bash -c`, `eval`, `exec`); deny if ANY segment matches.
- **Seen (2026-10-25):** stripping only outer quotes allowed `"rm" -rf /`, `r\m -rf /`, `/bin/rm -rf /` to bypass `deny: ["bash(rm *)"]`.
- **Guard:** `tests/policy.test.mjs` › "bash deny and ask rules cannot be bypassed by quoting or escaping the command word".

## 3. Trust Coverage: Executables in Auto-Allow Rules
- **Detail:** hash script targets in `permissions.allow`; non-existent targets hash `file:<path>:missing`.

## 4. Fail-Closed Architecture
- **Detail:** `isTrusted` defaults `false`, hook timeouts default `denied: true`, corrupt config throws.
- **HookBus Spawn (2026-10-30):** wrap `spawn()` in `try...catch` so synchronous spawn errors resolve fail-closed (`denied: true`).

## 5. Lifecycle Synchronization
- **Detail:** key lifecycle to `SessionStore`, not transient `Harness`.
- **Guard:** `tests/hooks.test.mjs` › "Harness emits SessionStart once on the first turn of a resumed session and SessionEnd at most once".

## 6. Testing Rigor: Negative Baselines
- **Detail:** test unconfigured tools run without prompts and adversarial vectors (subshells, quotes); at least one test spawns real hook process.

## 7. Review Findings Become Rules
- **Detail:** confirmed findings land as rules before turn ends; never defer to unwritten TODOs.

## 8. Build, Loader & Guard Pitfalls
- **Tests import from `dist/`:** compile before single test runs (`npm.cmd` needs shell on Windows).
- **Loader verification:** grep `loadProjectInstructions` to ensure files are actually loaded.
- **Self-reporting guards:** spell self-referential guard patterns in pieces.

## 9. Readers Must Not Turn Corruption Into Empty Document
- **Detail (2026-10-25):** `{}` is only for `ENOENT`. Parse errors throw; strip BOM before `JSON.parse`. Corrupt reads must not overwrite on save (`tests/config.test.mjs`).

## 10. Command Surfaces Must Reuse Guarded Primitives
- **Detail (2026-10-25):** slash commands that write/delete must use throwing store methods (`tests/files.test.mjs`, `tests/session.test.mjs`).

## 11. Multi-Branch Regex Tokenizers
- **Seen (2026-10-28):** non-capturing group `(?://...)` in fallback regex shifted destructuring offsets by 1.
- **Rule:** regex alternation branches `(A)|(B)|(C)|(D)` must have identical capturing group counts.
- **Guard:** `tests/tui.test.mjs` › "syntax highlighting: Markdown fenced code blocks highlight keywords, strings, comments, numbers, and JSON keys in TUI".

## 12. Wire Schemas
- **Detail:** wire schemas must reuse canonical types; every event family requires a stream-level test.
- **Guard:** `tests/headless.test.mjs` › "every emitted event validates against the v1 schema during tool use".

## 13. Audit Logger Singletons & Flushing
- **Detail:** mutate options (`addSecretKey`) instead of recreating logger singletons. Flush audit queue in `endSession()` and `stop()`.
- **Guard:** `tests/audit-log.test.mjs` › "pair session lifecycle and remote approvals write audit records with origin".

## 14. Custom `lookup` Must Honor Node's `all` Contract
- **Symptom (2026-11-01):** `web_fetch('https://example.com')` failed with `Invalid IP address: undefined`.
- **Root cause:** pinned `lookup` returned `cb(null, ip, family)`. Node ≥20 with `autoSelectFamily` calls `lookup(host, { all: true }, cb)` expecting `{ address, family }[]`; passing a string corrupted the array.
- **Rule:** custom lookup must branch on `options.all` and return `dns.LookupAddress[]`; tests must fetch hostnames (not only IP literals).
- **Guard:** `tests/web.test.mjs` › "web_fetch fetches a hostname through the pinned lookup contract".
