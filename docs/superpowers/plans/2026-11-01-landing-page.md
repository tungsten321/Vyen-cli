# Vyen CLI Official Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-dependency, standalone, modern dark-themed responsive official landing page for Vyen CLI in `docs/index.html` with an animated terminal simulator, feature pillars, multi-platform quick start tabs, and an interactive changelog timeline.

**Architecture:** Deliver a single-file static web application at `docs/index.html` using semantic HTML5, modern Tailwind utility styling (via Tailwind CDN or embedded styles), and clean vanilla JavaScript for terminal typing simulation, copy-to-clipboard interactions, OS tab switching, and collapsible changelog items. Zero build steps, zero external server dependencies, and immediate compatibility with GitHub Pages `/docs`.

**Tech Stack:** HTML5, CSS3 / Tailwind CSS, Vanilla JavaScript (ES6+), Node.js test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-11-01-landing-page-design.md`

## Global Constraints

- Must live in `docs/index.html` with no build pipeline required to preview or serve via GitHub Pages (`/docs`).
- Source files must be clean UTF-8 with zero BOM (`tests/repo-hygiene.test.mjs`).
- Mobile-first responsiveness: all layouts, tables, code snippets, and terminal mockups must render cleanly on mobile viewports (Termux users).
- Zero subscription/external tracker bloat: no external analytics or heavy fonts that degrade offline or slow network loading.
- Every test in `tests/landing-page.test.mjs` must pass and verify against `package.json` version (`0.5.0`) and `CHANGELOG.md`.

## Review Focus

1. Mobile viewport and encoding: Page contains valid HTML5 doctype, viewport meta, UTF-8 encoding without BOM, and responsive container wrapping.
2. Hero copy and interactive terminal: Hero contains accurate copy, one-click copy install command (`npm install -g @nguyenhuumanh/vyen`), and realistic looping terminal typing simulation.
3. Feature pillars completeness: Grid contains all 4 USP pillars: Termux Native, Multi-Provider BYOK, Layered Security & Hooks, and Extensible Agent.
4. Multi-platform quick start tabs: Tabs for Termux, Linux, macOS, and Windows PowerShell switch code blocks dynamically and showcase `vyen setup`.
5. Changelog synchronization: Timeline presents version `0.5.0` (matching `package.json`) and release entries for `0.4.0`, `0.3.1`, and `0.3.0` (matching `CHANGELOG.md`).

## Scenarios & Tests

**What the user sees:** Navigating to the landing page presents a polished, high-contrast dark developer portal featuring the Vyen branding, a one-click copyable `npm install -g @nguyenhuumanh/vyen` badge, an animated terminal mockup demonstrating Vyen solving a code issue, an overview of the 4 core pillars (Termux, BYOK, Security, Subagents/MCP), tabbed setup commands for Android Termux, Linux, macOS and Windows, and an expandable changelog timeline from initial releases to v0.5.0.

| # | Criterion | Test |
|---|---|---|
| 1 | landing page exists, has no BOM, and includes mobile responsive viewport meta tag | tests/landing-page.test.mjs › landing page exists, has no BOM, and includes mobile responsive viewport meta tag |
| 2 | landing page hero contains punchy copy, copyable install snippet, and terminal mockup | tests/landing-page.test.mjs › landing page hero contains punchy copy, copyable install snippet, and terminal mockup |
| 3 | landing page features section contains all four core USP pillars | tests/landing-page.test.mjs › landing page features section contains all four core USP pillars |
| 4 | landing page quick start provides multi-platform tabs including Termux and setup wizard | tests/landing-page.test.mjs › landing page quick start provides multi-platform tabs including Termux and setup wizard |
| 5 | landing page changelog timeline renders v0.5.0 and release history matching package.json and CHANGELOG.md | tests/landing-page.test.mjs › landing page changelog timeline renders v0.5.0 and release history matching package.json and CHANGELOG.md |

---

### Task 1: Page Shell, Meta, Navigation, and Design Tokens

**Files:**
- Create: `docs/index.html`
- Test: `tests/landing-page.test.mjs`

**Interfaces:**
- Produces: HTML5 skeleton with Tailwind CSS styling, responsive viewport meta, favicon/logo, and sticky navigation bar (#features, #quickstart, #changelog, GitHub repo, npm link).

- [ ] **Step 1: Verify test failure (RED)**
  Run: `node --test tests/landing-page.test.mjs` (Confirms fail on missing `docs/index.html`).

- [ ] **Step 2: Scaffold `docs/index.html`**
  Implement HTML5 skeleton, UTF-8 charset, viewport meta tag, dark background theme (`#090d16`), Tailwind CSS inclusion via CDN, custom glow styles, and sticky navigation bar with Vyen branding.

- [ ] **Step 3: Run Test 1**
  Run: `node --test --test-name-pattern="has no BOM" tests/landing-page.test.mjs`
  Expected: PASS.

---

### Task 2: Hero Section & Animated Terminal Simulator

**Files:**
- Modify: `docs/index.html`
- Test: `tests/landing-page.test.mjs`

**Interfaces:**
- Produces: Hero container, version badge (`v0.5.0`), headline, subheadline, one-click copy install snippet (`npm install -g @nguyenhuumanh/vyen`) with clipboard feedback, and animated terminal mockup with simulated typing and tool execution loop.

- [ ] **Step 1: Implement Hero markup and copy in `docs/index.html`**
  Add headline, subtitle highlighting Termux & cross-platform capabilities, copyable install command with SVG copy icon and tooltip.

- [ ] **Step 2: Implement Animated Terminal Simulator in `docs/index.html`**
  Create `#terminal-mockup` with traffic light dots, simulated prompt typing, reasoning status bar, file diff view with green/red additions/deletions, and bash test verification output.

- [ ] **Step 3: Run Test 2**
  Run: `node --test --test-name-pattern="hero contains" tests/landing-page.test.mjs`
  Expected: PASS.

---

### Task 3: Core Feature Pillars & Multi-Platform Quick Start Tabs

**Files:**
- Modify: `docs/index.html`
- Test: `tests/landing-page.test.mjs`

**Interfaces:**
- Produces: 4 feature cards (Termux Native, Multi-Provider BYOK, Layered Security & Hooks, Extensible Agent) and tabbed OS switcher (Termux, Linux, macOS, Windows) with interactive JavaScript tab controller.

- [ ] **Step 1: Implement Feature Pillars Grid**
  Build 4 responsive cards with glowing borders, SVG icons, and copy from spec §5.3.

- [ ] **Step 2: Implement Quick Start Section with OS Switcher**
  Build tabs for Termux (Android), Linux, macOS, and Windows (PowerShell) detailing package installations, `vyen setup`, and environment variables.

- [ ] **Step 3: Run Tests 3 & 4**
  Run: `node --test --test-name-pattern="features section|quick start" tests/landing-page.test.mjs`
  Expected: PASS.

---

### Task 4: Interactive Changelog Timeline & Developer Footer

**Files:**
- Modify: `docs/index.html`
- Test: `tests/landing-page.test.mjs`

**Interfaces:**
- Produces: Interactive timeline with version tags (`v0.5.0`, `v0.4.0`, `v0.3.1`, `v0.3.0`), expandable accordion notes matching `CHANGELOG.md`, and footer with GitHub, npm, and MIT license links.

- [ ] **Step 1: Implement Changelog Timeline markup and accordion JS**
  Add timeline nodes for v0.5.0, v0.4.0, v0.3.1, and v0.3.0 with release badges, dates, and detailed feature bullet points matching `CHANGELOG.md`.

- [ ] **Step 2: Implement Footer**
  Add footer with repository link, npm package link, MIT license notice, and back-to-top button.

- [ ] **Step 3: Run Test 5**
  Run: `node --test --test-name-pattern="changelog timeline" tests/landing-page.test.mjs`
  Expected: PASS.

---

### Task 5: Full Suite Verification & Repo Hygiene

**Files:**
- Verify: `docs/index.html`, `tests/landing-page.test.mjs`

- [ ] **Step 1: Run full test suite**
  Run: `npm test`
  Expected: All tests pass (including `tests/plan-traceability.test.mjs` and `tests/repo-hygiene.test.mjs`).

- [ ] **Step 2: Run linter and typechecker**
  Run: `npm run lint` and `npm run typecheck`
  Expected: 0 errors.

- [ ] **Step 3: Git status hygiene check**
  Ensure only `docs/index.html`, `docs/superpowers/plans/2026-11-01-landing-page.md`, `docs/superpowers/specs/2026-11-01-landing-page-design.md`, and `tests/landing-page.test.mjs` are staged.
