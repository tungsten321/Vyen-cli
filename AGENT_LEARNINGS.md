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
- **Seen (2026-10-28):** non-capturing group `(?://...)` in fallback regex shifted destructuring offsets by 1.
- **Rule:** regex alternation branches `(A)|(B)|(C)|(D)` must have identical capturing group counts.
- **Guard:** `tests/tui.test.mjs` › "syntax highlighting: Markdown fenced code blocks highlight keywords, strings, comments, numbers, and JSON keys in TUI".

## 12. Wire Schemas
- Wire schemas must reuse canonical types; every event family requires a stream-level test.
- **Guard:** `tests/headless.test.mjs` › "every emitted event validates against the v1 schema during tool use".

## 13. Audit Logger Singletons & Flushing
- Mutate options (`addSecretKey`) instead of recreating logger singletons. Flush audit queue in `endSession()` and `stop()`.
- **Guard:** `tests/audit-log.test.mjs` › "pair session lifecycle and remote approvals write audit records with origin".

## 14. Custom `lookup` Honors Node `all` Contract
- Node ≥20 with `autoSelectFamily` calls `lookup(host, { all: true }, cb)` expecting `{ address, family }[]`. Custom lookup must branch on `options.all` and return `dns.LookupAddress[]`.
- **Guard:** `tests/web.test.mjs` › "web_fetch fetches a hostname through the pinned lookup contract".

## 15. SSRF Documentation Range Coverage
- **Seen (2026-11-01):** `isPrivateIp` blocked IPv4 test ranges but missed IPv6 doc range `2001:db8::/32` (RFC 3849).
- **Guard:** `tests/web.test.mjs` › "web_fetch refuses requests to private and metadata IP addresses (SSRF)".

## 16. Paired Element Parsing Over Flat Arrays
- **Seen (2026-11-01):** Parallel index arrays broke when ads lacked snippets, misaligning organic results.
- **Rule:** Match paired HTML nodes by DOM proximity, never assume 1-to-1 index alignment across separate query matches.
- **Guard:** `tests/web.test.mjs` › "parseDuckDuckGoLiteHtml handles ads without snippets without misaligning organic results".
