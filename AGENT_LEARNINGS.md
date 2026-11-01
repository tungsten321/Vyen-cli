# AGENT_LEARNINGS.md — Empirical Lessons & Anti-Patterns for AI Agents

Loaded by `loadProjectInstructions` in `src/context.ts`. Append empirical lessons here.

## 1. System Seams: Four Execution Runners
- `cli.ts`, `subagents.ts`, `network.ts`, `workflow.ts` must inherit live policy evaluator & hooks.

## 2. Shell Security: Segment-Aware Matching
- Split on operators (`;`, `&&`, `||`, `|`, newline, `$()`, `<()`, `>()`, backticks); strip subshells, quotes, wrappers (`sudo`, `env`, `sh/bash -c`, `eval`, `exec`); deny if ANY segment matches.
- **Seen (2026-10-25):** stripping only outer quotes allowed `"rm" -rf /`, `r\m -rf /`, `/bin/rm -rf /` to bypass `deny: ["bash(rm *)"]`.
- **Guard:** `tests/policy.test.mjs` › "bash deny and ask rules cannot be bypassed by quoting or escaping the command word".

## 3. Trust Coverage
- Hash scripts in `permissions.allow`; non-existent targets hash `file:<path>:missing`.

## 4. Fail-Closed Architecture
- `isTrusted` defaults `false`, hook timeouts default `denied: true`, corrupt config throws.
- **HookBus Spawn (2026-10-30):** wrap `spawn()` in `try...catch` so synchronous spawn errors resolve fail-closed (`denied: true`).

## 5. Lifecycle Synchronization
- Key lifecycle to `SessionStore`, not transient `Harness`.
- **Guard:** `tests/hooks.test.mjs` › "Harness emits SessionStart once on the first turn of a resumed session and SessionEnd at most once".

## 6. Testing Rigor
- Test tools run without prompts and adversarial vectors; at least one test spawns real hook process.

## 7. Review Findings Become Rules
- Confirmed findings land as rules before turn ends; never defer to unwritten TODOs.

## 8. Build, Loader & Guard Pitfalls
- **Tests import from `dist/`:** compile before single test runs (`npm.cmd` needs shell on Windows).
- **Loader verification:** grep `loadProjectInstructions` to ensure files are actually loaded.
- **Self-reporting guards:** spell self-referential guard patterns in pieces.

## 9. Readers Fail on Corrupt JSON
- `{}` only for `ENOENT`. Parse errors throw; strip BOM before `JSON.parse`; corrupt reads must not overwrite (`tests/config.test.mjs`).

## 10. Command Surfaces Reuse Guarded Primitives
- Slash commands that write/delete must use throwing store methods (`tests/files.test.mjs`, `tests/session.test.mjs`).

## 11. Multi-Branch Regex Tokenizers
- Regex alternation branches `(A)|(B)|(C)` must have identical capturing group counts to avoid destructuring shift (`tests/tui.test.mjs`).

## 12. Wire Schemas
- Wire schemas must reuse canonical types; every event family requires a stream-level test (`tests/headless.test.mjs`).

## 13. Audit Logger Singletons & Flushing
- Mutate options (`addSecretKey`) instead of recreating singletons. Flush audit queue in `endSession()` and `stop()` (`tests/audit-log.test.mjs`).

## 14. Custom `lookup` Honors Node `all` Contract
- Node ≥20 `lookup(host, { all: true }, cb)` expects `{ address, family }[]`. Custom lookup must branch on `options.all` (`tests/web.test.mjs`).

## 15. SSRF Documentation Range Coverage
- `isPrivateIp` must cover IPv6 doc range `2001:db8::/32` (RFC 3849) alongside IPv4 ranges (`tests/web.test.mjs`).

## 16. Paired Element Parsing Over Flat Arrays
- Match paired HTML nodes by DOM proximity; never assume 1-to-1 index alignment across separate query matches (`tests/web.test.mjs`).

## 17. Workflow Shell Step Approval & Wrapper Matching
- Shell steps must treat policy `'default'` as requiring `approveShell`, failing closed if absent. `su` wrapper requires dedicated `-c` matching, differing from positional wrappers (`tests/features.test.mjs`, `tests/policy.test.mjs`).
