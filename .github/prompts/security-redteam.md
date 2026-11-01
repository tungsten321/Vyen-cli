# Adversarial Security Red-Teaming (Rule 17)

Before shipping any feature involving authentication, authorization, permissions, sessions, or user boundaries, act as an adversarial attacker (red-team).

## Setup
- Provision 2 regular user accounts (`User A`, `User B`) and 1 privileged account (`Admin`).
- Prepare an isolated testing sandbox / test database.

## 14 Attack Vectors to Execute
1. **Horizontal Privilege Escalation (IDOR):** Can `User A` view, edit, or delete `User B`'s resources by swapping IDs in URLs, request bodies, or GraphQL queries?
2. **Vertical Privilege Escalation:** Can `User A` access admin-only endpoints or settings by calling them directly?
3. **Parameter Tampering / Mass Assignment:** Can `User A` elevate their role or credits by submitting extra fields (e.g. `{"role": "admin", "is_admin": true}`) during registration or profile updates?
4. **Authentication Bypass:** Can requests succeed with missing, malformed, empty, or expired bearer tokens?
5. **Path Traversal & Directory Escape:** Can file-serving, reading, or writing utilities access files outside the workspace via `../`, URL-encoded paths, or symlinks?
6. **Command Injection / Metacharacters:** Can user inputs injected into shell commands execute arbitrary subshells (`;`, `&&`, `|`, `$(...)`, backticks)?
7. **Session Fixation & Replay:** Does logging out genuinely invalidate the session token on the backend, or can an old token still authenticate?
8. **CSRF & CORS Misconfiguration:** Are state-changing API endpoints vulnerable to cross-origin requests from arbitrary domains?
9. **SSRF (Server-Side Request Forgery):** If the application fetches URLs, does it block loopback (`127.0.0.1`), private RFC1918 subnets, and cloud metadata services (`169.254.169.254`)?
10. **Unrestricted File Upload / Execution:** Can a user upload an executable script (e.g. `.js`, `.sh`, `.php`) masquerading as an image?
11. **Rate Limiting & Brute Force:** Do sensitive endpoints (login, OTP, reset password) enforce strict throttling?
12. **Injection (SQL / NoSQL / Template):** Do input queries use parameterized boundaries, or can quotes and operators alter execution logic?
13. **Information Leakage:** Do error responses expose stack traces, database schema details, or environment variables?
14. **Race Conditions / Concurrency Attacks:** Can parallel requests (e.g., spending the same balance twice simultaneously) corrupt shared state?

## Deliverable
- Document the exact payload and observable response for each attack.
- Keep concrete evidence of blocked attempts.
- Fix any identified leaks or bypasses before reporting "Done".
