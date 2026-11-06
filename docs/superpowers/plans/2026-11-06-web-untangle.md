# Web untangle — src/web.ts

## Review Focus
1. IPv4-mapped IPv6 decoding is defined once and shared by isPrivateIp and isLoopbackIp.
2. TinyFish and Parallel MCP search engines share one parameterized MCP caller (fetch, JSON-RPC, parse, map).
3. Policy/approve evaluation and timeout/signal creation are shared helpers used by both webFetch and webSearch.
4. Dead surplus (resolveSafeIp wrapper, unused limit path) is removed or corrected with callers updated.
5. web tests assert behaviour, not implementation constants; tautological constant/classifier assertions are removed.
6. Intentional behaviour is unchanged: SSRF rejection, redirect revalidation, size/deadline caps, provider order.
7. Parallel MCP arm maps excerpts through the shared caller (proved by the real Parallel E2E test, not mockEngines).
8. Note: SSRF classification tightened fail-closed (zone IDs, octal/decimal/hex IPv4) — behaviour change vs HEAD, recorded here.

## Scenarios & Tests

**What the user sees:** web_fetch still blocks private/metadata destinations, follows redirects safely, and returns converted body or explicit errors; web_search still falls back duckduckgo then tinyfish then parallel, and the test suite stays green.

| # | Criterion | Test |
|---|---|---|
| 1 | IPv4-mapped IPv6 decoding is defined once and shared by isPrivateIp and isLoopbackIp. | tests/web.test.mjs › isPrivateIp and isLoopbackIp recognize uncompressed IPv6 addresses with leading zeros |
| 2 | TinyFish and Parallel MCP search engines share one parameterized MCP caller (fetch, JSON-RPC, parse, map). | tests/web.test.mjs › web_search maps TinyFish MCP results through the shared caller |
| 7 | Parallel MCP arm maps excerpts through the shared caller (proved by the real Parallel E2E test, not mockEngines). | tests/web.test.mjs › web_search maps Parallel MCP results through the shared caller |
| 8 | Note: SSRF classification tightened fail-closed (zone IDs, octal/decimal/hex IPv4) — behaviour change vs HEAD, recorded here. | tests/web.test.mjs › isPrivateIp recognizes IPv6 link-local addresses with zone identifiers as private |
| 3 | Policy/approve evaluation and timeout/signal creation are shared helpers used by both webFetch and webSearch. | tests/web.test.mjs › webSearch standalone policy check rejects deny decision |
| 4 | Dead surplus (resolveSafeIp wrapper, unused limit path) is removed or corrected with callers updated. | tests/web.test.mjs › web_search throws aggregated error when all engines return zero results |
| 5 | web tests assert behaviour, not implementation constants; tautological constant/classifier assertions are removed. | tests/web.test.mjs › web_fetch refuses requests to private and metadata IP addresses (SSRF) |
| 6 | Intentional behaviour is unchanged: SSRF rejection, redirect revalidation, size/deadline caps, provider order. | tests/web.test.mjs › web_fetch truncates content before it reaches the model |
