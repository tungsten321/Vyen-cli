# AGENT_LEARNINGS.md — Empirical Lessons & Anti-Patterns for AI Agents

Loaded by `loadProjectInstructions` in `src/context.ts`. Append empirical lessons here.

- **1. System Seams:** `cli.ts`, `subagents.ts`, `network.ts`, `workflow.ts` inherit live policy & hooks.
- **2. Shell Security:** Split on `;`, `&&`, `||`, `|`, `\n`, `$()`, `<()`, `>()`, backticks; strip subshells, quotes, wrappers (`sudo`, `env`, `sh/bash -c`, `eval`, `exec`); deny if ANY segment matches (`tests/policy.test.mjs`).
- **3. Trust Coverage:** Hash scripts in `permissions.allow`; missing targets hash `file:<path>:missing`.
- **4. Fail-Closed Invariants:** `isTrusted` defaults `false`, hook timeouts default `denied: true`, corrupt config throws. Wrap `spawn()` in `try...catch` to fail closed.
- **5. Lifecycle Sync:** Key lifecycle to `SessionStore` (WeakSet), not transient `Harness` (`tests/hooks.test.mjs`).
- **6. Testing Rigor:** Test tools run without prompts; >=1 test spawns real hook process.
- **7. Review Findings Become Rules:** Confirmed findings land as rules before turn ends; never defer.
- **8. Build & Loader Pitfalls:** Tests import from `dist/`: compile before test runs. Grep `loadProjectInstructions` to ensure loaded. Spell self-referential guards in pieces.
- **9. Readers Fail on Corrupt JSON:** `{}` only for `ENOENT`. Parse errors throw; strip BOM; corrupt reads never overwrite (`tests/config.test.mjs`).
- **10. Command Surfaces Reuse Primitives:** Slash commands that write/delete use throwing store methods (`tests/files.test.mjs`, `tests/session.test.mjs`).
- **11. Multi-Branch Regex:** Alternations `(A)|(B)|(C)` must have identical capture counts to avoid destructuring shift (`tests/tui.test.mjs`).
- **12. Wire Schemas:** Wire schemas reuse canonical types; every event family requires stream-level test (`tests/headless.test.mjs`).
- **13. Audit Logger Singletons:** Mutate options (`addSecretKey`); flush queue in `endSession()` and `stop()` (`tests/audit-log.test.mjs`).
- **14. Custom Lookup:** Node >=20 `lookup(host, { all: true })` expects `{ address, family }[]`. Branch on `options.all` (`tests/web.test.mjs`).
- **15. SSRF Doc Range:** `isPrivateIp` covers IPv6 doc range `2001:db8::/32` (RFC 3849) and IPv4 ranges (`tests/web.test.mjs`).
- **16. Paired Element Parsing:** Match paired HTML nodes by DOM proximity; never assume 1:1 index alignment across matches (`tests/web.test.mjs`).
- **17. Workflow Shell Step & Su:** Shell steps treat `'default'` as requiring `approveShell`, failing closed if absent. `su` requires `-c` matching (`tests/features.test.mjs`, `tests/policy.test.mjs`).
- **18. Patch Target Paths:** `apply_patch` policy parses touched headers; deny/ask matches if ANY matches; allow matches if ALL match (`tests/policy.test.mjs`).
- **19. Hook Abort Priority:** In `HookBus.executeCommand()`, abort precedes exit 0 (`aborted ? 130 : (code ?? 1)`) so `PreToolUse` strictly resolves `denied: true` (`tests/hooks.test.mjs`).
- **20. Workflow Registration & URI Scrub:** `run_workflow` wires `confirmStep`. `sanitizeEnvironment` strips DB/cache URIs (`DATABASE_URL`, `POSTGRES_URL`, `REDIS_URL`, `MONGO_URI`) (`tests/features.test.mjs`).
- **21. Absolute Wrappers & Wildcards:** `WRAPPER_PREFIX_REGEX` uses `(?:(?:\/usr)?\/bin\/)?` for all binaries. Wildcard allows verify unwrapped commands against `ARGUMENT_DRIVEN_COMMAND_RE` (`tests/policy.test.mjs`).
- **22. Workflow Approval Gates:** `approval` step requires `confirmStep`; absence aborts/fails closed (`tests/features.test.mjs`).
- **23. Protected Credentials & Subagent Errors:** `DEFAULT_PROTECTED_SECRETS` covers provider keys; subagent cleanup uses `managed.lastError ??=` (`tests/audit.test.mjs`, `src/subagents.ts`).
- **24. Quoted Wrapper Peeling:** `WRAPPER_PREFIX_REGEX` tests unquoted tokens (`normalizeCommandWord`) so quoted wrappers ("sudo", \sudo, 'env') cannot bypass deny policies (`tests/policy.test.mjs`).
- **25. Scheme-less URL Matching:** `domain:` matching prepends `https://` before `new URL()` and fails closed on error so scheme-less URLs cannot bypass domain deny rules (`tests/policy.test.mjs`).
- **26. URI Passwords & Package Installs:** Redact URI passwords (`proto://user:pass@host`) and protected env keys in `src/errors.ts`. Wildcards reject package install subcommands (`npm install`, `cargo install`) (`tests/errors.test.mjs`, `tests/policy.test.mjs`).
