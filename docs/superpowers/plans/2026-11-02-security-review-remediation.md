# Plan: Security Code Review Remediation

**Date:** 2026-11-02  
**Goal:** Remediate all critical vulnerabilities and runner desynchronization flaws identified in the full-repo code review, following `ub-mode` (Make it Work, Make it Right, Follow Practice) and `AGENTS.md`.

## Review Focus

1. apply_patch policy path evaluation extracts target paths from patch header so deny rules cannot be bypassed.
2. HookBus PreToolUse fails closed when hook execution is aborted via signal.
3. executeWorkflow fails closed when shell step has no policy and no approval handler.
4. run_workflow tool wires confirmStep to require approval for approval steps.
5. run_workflow tool forwards subagent and network handlers to workflow runner.
6. search policy matching extracts query argument rather than default path.
7. bash deny rules strip dash, zsh, ksh, and busybox wrappers.
8. sanitizeEnvironment strips database and cache connection URIs.
9. SPEC documents that allowed-tools does not override persistent deny rules.
10. ToolRegistry allows web_search when user approves ask policy decision.

## Scenarios & Tests

**What the user sees:** Security policy deny rules for apply_patch and search are strictly enforced, PreToolUse hook aborts fail closed, workflow approval gates cannot be bypassed by tool calls, and sensitive database URIs are scrubbed from execution environments.

| # | Criterion | Test |
|---|---|---|
| 1 | apply_patch policy path evaluation extracts target paths from patch header so deny rules cannot be bypassed. | tests/policy.test.mjs › apply_patch deny rules match against touched file paths inside the patch |
| 2 | HookBus PreToolUse fails closed when hook execution is aborted via signal. | tests/hooks.test.mjs › PreToolUse hook aborted by signal fails closed with denied: true |
| 3 | executeWorkflow fails closed when shell step has no policy and no approval handler. | tests/features.test.mjs › executeWorkflow fails closed when shell step has no policy and no approval handler |
| 4 | run_workflow tool wires confirmStep to require approval for approval steps. | tests/features.test.mjs › run_workflow tool wires confirmStep to require approval for approval steps |
| 5 | run_workflow tool forwards subagent and network handlers to workflow runner. | tests/features.test.mjs › run_workflow tool forwards subagent and network handlers to workflow runner |
| 6 | search policy matching extracts query argument rather than default path. | tests/policy.test.mjs › search policy matching extracts query argument rather than default path |
| 7 | bash deny rules strip dash, zsh, ksh, and busybox wrappers. | tests/policy.test.mjs › bash deny rules strip dash, zsh, ksh, and busybox wrappers |
| 8 | sanitizeEnvironment strips database and cache connection URIs. | tests/features.test.mjs › sanitizeEnvironment strips database and cache connection URIs |
| 9 | SPEC documents that allowed-tools does not override persistent deny rules. | tests/docs-contract.test.mjs › SPEC documents that allowed-tools does not override persistent deny rules |
| 10 | ToolRegistry allows web_search when user approves ask policy decision. | tests/web.test.mjs › ToolRegistry allows web_search when user approves ask policy decision |

## Implementation Steps

### Step 1: Mock fetch in `tests/web.test.mjs`
Ensure `ToolRegistry allows web_search when user approves ask policy decision` uses mock fetch so it is deterministic offline.

### Step 2: Red Tests for Policy, Hooks, Workflow, and Environment
Add tests 1..9 to `tests/policy.test.mjs`, `tests/hooks.test.mjs`, `tests/features.test.mjs`, and `tests/docs-contract.test.mjs`. Prove they are RED before fixing.

### Step 3: Implement Fixes
- `src/policy.ts`: Extract patch target paths in `matchToolPattern` / `extractToolArgumentString` for `apply_patch`; prioritize `query` for `search`; add `dash`, `zsh`, `ksh`, `busybox` to `WRAPPER_PREFIX_REGEX`.
- `src/hooks.ts`: Check `aborted` before nullish `code` in `executeCommand` to ensure `denied: true` on abort; add database/cache URI patterns to `sanitizeEnvironment`.
- `src/process.ts`: Add database URI keys to `DEFAULT_PROTECTED_SECRETS`.
- `src/workflow.ts`: Fail closed if neither `hooks.policy` nor `hooks.approveShell` exists.
- `src/cli.ts`: In `run_workflow` registration, wire `confirmStep`, `runSubagents`, and `runNetwork`.
- `docs/SPEC.md`: Clarify that `--allowed-tools` does not override persistent deny rules.

### Step 4: Verification
Run `npm run typecheck`, `npm run lint`, and `npm test`. All 10 tests green, 0 failures.
