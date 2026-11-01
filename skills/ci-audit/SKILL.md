---
name: ci-audit
description: Use when checking, diagnosing, or speeding up CI/CD pipelines (GitHub Actions). Analyzes queue times, setup/caching bottlenecks, matrix redundancy, and test execution without making unapproved changes. Also triggered by /ci-audit.
---

# CI/CD Optimization & Audit Skill

When invoked, the agent performs a systematic audit of the repository's GitHub Actions workflows and CI execution history to eliminate bottlenecks and reduce runtimes.

## Protocol

1. **Information Gathering:**
   - If `gh` CLI is authenticated: pull historical runs (`gh run list --limit 150 --json ...`) to measure queue time, setup time, and run time.
   - If `gh` is unavailable: inspect local workflow definitions (`.github/workflows/*.ya?ml`).
2. **Audit Checklist (Check 9 Bottlenecks):**
   - Queueing on default runners (`cancel-in-progress` missing)
   - Slow linting
   - Slow typechecking (matrix redundancy)
   - Test sharding & machine sizing
   - App context reload in tests
   - Setup & caching misses (missing `cache: npm`, full clones)
   - Sequential vs. parallel jobs
   - Path filtering missing on documentation/style changes
   - Missing local pre-push checks
3. **Reporting Before Action:**
   - Present the audit findings first with estimated time savings.
   - Do NOT modify workflow files without explicit user consent.
