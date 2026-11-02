# AGENT_LEARNINGS.md — Empirical Lessons & Anti-Patterns for AI Agents

Loaded by `loadProjectInstructions` in `src/context.ts`. Append empirical lessons here.

- **1. System Seams:** `cli.ts`, `subagents.ts`, `network.ts`, `workflow.ts` must inherit live policy evaluator & hooks.
- **2. Shell Security:** Split on operators (`;`, `&&`, `||`, `|`, newline, `$()`, `<()`, `>()`, backticks); strip subshells, quotes, wrappers (`sudo`, `env`, `sh/bash -c`, `eval`, `exec`); deny if ANY segment matches. Stripping only outer quotes allowed `"rm" -rf /` bypass (`tests/policy.test.mjs`).
- **3. Trust Coverage:** Hash scripts in `permissions.allow`; non-existent targets hash `file:<path>:missing`.
- **4. Fail-Closed Architecture:** `isTrusted` defaults `false`, hook timeouts default `denied: true`, corrupt config throws. Wrap `spawn()` in `try...catch` so synchronous spawn errors resolve fail-closed (`denied: true`).
- **5. Lifecycle Synchronization:** Key lifecycle to `SessionStore`, not transient `Harness` (`tests/hooks.test.mjs`).
- **6. Testing Rigor:** Test tools run without prompts; at least one test spawns real hook process.
- **7. Review Findings Become Rules:** Confirmed findings land as rules before turn ends; never defer to unwritten TODOs.
- **8. Build & Loader Pitfalls:** Tests import from `dist/`: compile before single test runs. Grep `loadProjectInstructions` to ensure files are loaded. Spell self-referential guard patterns in pieces.
- **9. Readers Fail on Corrupt JSON:** `{}` only for `ENOENT`. Parse errors throw; strip BOM before `JSON.parse`; corrupt reads must not overwrite (`tests/config.test.mjs`).
- **10. Command Surfaces Reuse Primitives:** Slash commands that write/delete must use throwing store methods (`tests/files.test.mjs`, `tests/session.test.mjs`).
- **11. Multi-Branch Regex Tokenizers:** Alternation branches `(A)|(B)|(C)` must have identical capture counts to avoid destructuring shift (`tests/tui.test.mjs`).
- **12. Wire Schemas:** Wire schemas must reuse canonical types; every event family requires a stream-level test (`tests/headless.test.mjs`).
- **13. Audit Logger Singletons & Flushing:** Mutate options (`addSecretKey`) instead of recreating singletons; flush queue in `endSession()` and `stop()` (`tests/audit-log.test.mjs`).
- **14. Custom lookup Honors Node Contract:** Node ≥20 `lookup(host, { all: true }, cb)` expects `{ address, family }[]`. Custom lookup must branch on `options.all` (`tests/web.test.mjs`).
- **15. SSRF Doc Range Coverage:** `isPrivateIp` must cover IPv6 doc range `2001:db8::/32` (RFC 3849) alongside IPv4 ranges (`tests/web.test.mjs`).
- **16. Paired Element Parsing:** Match paired HTML nodes by DOM proximity; never assume 1-to-1 index alignment across separate matches (`tests/web.test.mjs`).
- **17. Workflow Shell Step Approval & Wrapper Matching:** Shell steps treat policy `'default'` as requiring `approveShell`, failing closed if absent. `su` wrapper requires dedicated `-c` matching (`tests/features.test.mjs`, `tests/policy.test.mjs`).
- **18. Patch Target Path Extraction:** `apply_patch` policy matching parses touched headers; deny/ask matches if ANY matches; allow matches if ALL match (`tests/policy.test.mjs`).
- **19. Hook Abort Priority:** In `HookBus.executeCommand()`, aborted state precedes child exit code `0` (`aborted ? 130 : (code ?? 1)`) so `PreToolUse` strictly resolves `denied: true` (`tests/hooks.test.mjs`).
- **20. Workflow Registration & URI Scrubbing:** `run_workflow` wires `confirmStep` to guard approval gates. `sanitizeEnvironment` strips database/cache URIs (`DATABASE_URL`, `POSTGRES_URL`, `REDIS_URL`, `MONGO_URI`) (`tests/features.test.mjs`).
- **21. Absolute Wrapper Paths & Wildcard Allows:** `WRAPPER_PREFIX_REGEX` requires `(?:(?:\/usr)?\/bin\/)?` for all binaries (`nohup`, `timeout`, `nice`, `setsid`, `time`, `stdbuf`, `xargs`). Wildcard allows verify unwrapped command texts against `ARGUMENT_DRIVEN_COMMAND_RE` (`tests/policy.test.mjs`).
- **22. Workflow Approval Gates Fail-Closed:** `approval` step requires `confirmStep` in execution hooks; absence must abort/fail-closed (`tests/features.test.mjs`).
- **23. Protected Credentials & Subagent Errors:** `DEFAULT_PROTECTED_SECRETS` covers all provider keys; subagent cleanup uses `managed.lastError ??=` (`tests/audit.test.mjs`, `src/subagents.ts`).

