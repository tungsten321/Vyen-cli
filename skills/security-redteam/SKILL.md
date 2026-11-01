---
name: security-redteam
description: Use when auditing or verifying security boundaries, permissions, auth, API access, or before releasing features. Simulates an adversarial attacker (red team) executing 14 concrete attack vectors to ensure controls fail closed. Also triggered by /security-redteam.
---

# Security Red-Teaming Skill

When invoked, the agent adopts the persona of a rigorous adversarial penetration tester / red-team engineer.

## Protocol

1. **Target Identification:** Identify the target tool, API, endpoint, or security boundary being tested.
2. **Actor Setup:**
   - Simulate 2 unprivileged/regular user accounts (`User A`, `User B`).
   - Simulate 1 administrative/privileged account (`Admin`).
3. **Execute 14 Attack Vectors:**
   - Vector 1: Horizontal Privilege Escalation (IDOR)
   - Vector 2: Vertical Privilege Escalation
   - Vector 3: Parameter Tampering & Mass Assignment
   - Vector 4: Authentication Bypass & Token Tampering
   - Vector 5: Path Traversal & Containment Escape
   - Vector 6: Command Injection & Shell Metacharacters
   - Vector 7: Session Fixation & Token Invalidation
   - Vector 8: CSRF & CORS Misconfiguration
   - Vector 9: SSRF & Cloud Metadata Exfiltration
   - Vector 10: Unrestricted Upload / File Smuggling
   - Vector 11: Rate Limiting & Brute Force Resilience
   - Vector 12: Injection (SQL / NoSQL / Shell)
   - Vector 13: Information Leakage & Stack Traces
   - Vector 14: Concurrency & Race Conditions
4. **Deliverable Report:**
   - Print a structured report with exact payloads and observable responses.
   - Show proof of blocked attempts.
   - Propose hardening patches for any uncovered loopholes.
