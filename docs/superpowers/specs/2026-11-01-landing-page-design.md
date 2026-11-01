# Vyen CLI Official Landing Page Design Specification

Status: draft for review  
Date: 2026-11-01  
Target Path: `docs/index.html`  
Author: Antigravity & Huu Manh  

---

## 1. Intent & Why

Like leading autonomous coding agents and harnesses (Aider, Claude Code, Goose, OpenHands), **Vyen** requires a dedicated, developer-centric landing page to introduce the project, showcase its unique capabilities, facilitate immediate adoption, and publish a transparent release history.

Vyen's unique value proposition (USP) in the coding agent landscape:
1. **First-Class Termux & Mobile Support:** Unlike heavy Python or native C++ harnesses that require root, glibc hacks, or proot containers, Vyen runs directly in Termux on Android with zero native addons, using pure compiled JavaScript on Node >= 22.16.
2. **True Independence & Bring Your Own Key (BYOK):** No subscription lock-in, no mandatory proprietary cloud gateway. Connects directly to OpenAI-compatible, OpenAI Responses, Anthropic Messages, or local LLMs (Ollama, vLLM).
3. **Layered Security & Control:** Built-in Ask/Auto/Read-Only modes, Workspace Trust (`--trust-workspace`), fail-closed lifecycle hooks (`PreToolUse`, `PostToolUse`, `Stop`, etc.), command chaining guardrails, and audit logging.
4. **Extensible Agent Architecture:** Full TUI with streaming diffs, subagents, MCP (Model Context Protocol) client, and remote pairing (`/pair`).

This landing page serves as the public face of Vyen on GitHub Pages (`https://syxgamer122.github.io/Vyen-cli/` or custom domain), giving developers instant clarity on what Vyen is, how to install it in one command, and how the project evolves across releases.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Deliver a modern, high-performance, dark-themed responsive landing page located at `docs/index.html`.
- Maintain a **zero-build, zero-dependency** architecture so the page loads instantly, requires no build pipeline in CI, and can be viewed locally or hosted directly via GitHub Pages (serving `/docs`).
- **Hero Section:**
  - Punchy headline and subtitle emphasizing terminal & Termux coding.
  - One-click copy installation badge (`npm install -g @nguyenhuumanh/vyen`).
  - Animated, interactive Terminal Mockup demonstrating a real Vyen session (prompting, analyzing workspace, streaming file diff, running tests).
- **Core Pillars (4 USP cards):**
  - *Termux Native:* Mobile-first terminal coding without root or native compiling.
  - *Multi-Provider Freedom:* OpenAI, Anthropic, Responses, Local endpoints.
  - *Fortified Security:* Ask/Auto modes, Workspace Trust, lifecycle hooks, local JSONL audit logs.
  - *Autonomous Power:* Subagents, MCP integrations, interactive TUI, session resume.
- **Quick Start Section:**
  - Tabbed interface switching between **Termux (Android)**, **Linux**, **macOS**, and **Windows PowerShell**.
  - Setup wizard guide (`vyen setup` / `vyen init`).
- **Interactive Changelog / Release History:**
  - Timeline showcasing releases (current `0.5.0` with Headless Contract v1 and Structured Outputs, `0.4.0` with Lifecycle Hooks and Workspace Trust, `0.3.1`, `0.3.0`, and milestones leading to `v1.0.0`).
  - Expandable changelog notes highlighting features, fixes, and security patches directly synced with `CHANGELOG.md`.
- **Developer Footer:**
  - Quick links to GitHub repository (`syxgamer122/Vyen-cli`), npm package (`@nguyenhuumanh/vyen`), MIT License, and documentation (`docs/SPEC.md`, `docs/ROADMAP.md`).

### Non-Goals
- Building an elaborate multi-page documentation wiki (project technical specs remain in existing markdown docs like `docs/SPEC.md` and `docs/ROADMAP.md`).
- Introducing heavy JavaScript frameworks (Astro, Next.js, VitePress, React) into the repository.
- Backend API server or form-handling backend.

### Anti-Goals
- **Bloated assets:** Avoid heavy multi-megabyte bundles, third-party analytics trackers, or intrusive scripts.
- **Desktop-only design:** Termux developers frequently browse from mobile devices; the layout must be fully responsive, legible, and touch-friendly on mobile screens.
- **BOM in source files:** The generated HTML must be strictly clean UTF-8 without BOM per repository hygiene rules (`tests/repo-hygiene.test.mjs`).

---

## 3. Constraints & Operating Agreements

- **File Path:** The landing page will live in `docs/index.html` so GitHub Pages can serve it directly from the default `/docs` folder of the `master` branch.
- **Hygiene & Formatting:** Clean UTF-8, no BOM, semantic HTML5, modern CSS with Tailwind utility classes (via lightweight Tailwind CDN or clean bundled CSS) and vanilla JavaScript.
- **Offline / Graceful Fallback:** Fonts fallback cleanly to system monospace (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) and system sans-serif.
- **Mobile First:** Responsive grid layouts, sticky navigation bar, mobile menu drawer, and horizontal-scroll-protected code blocks.

---

## 4. Approaches & Decision

### Approach 1 (Selected): Standalone Single-File Static Web Page (`docs/index.html`)
- **Structure:** All HTML structure, Tailwind CSS styling, and lightweight vanilla JS interactions (terminal typing simulator, tab switcher, copy-to-clipboard, changelog accordion) contained cleanly in `docs/index.html` (with optional companion CSS/SVG if preferred).
- **Pros:**
  - Instant deployment: GitHub Pages serves `/docs` out of the box with zero build steps or GitHub Actions.
  - Zero repository footprint increase (no new `package.json` dependencies, no build script overhead).
  - Can be tested directly on Termux (`python3 -m http.server -d docs 8080` or `termux-open docs/index.html`).
- **Cons:**
  - Content updates in the changelog section must be maintained in HTML or rendered via small embedded JSON.

### Approach 2 (Rejected): Documentation Site Framework (Astro / VitePress / Starlight)
- **Structure:** Separate sub-project in `website/` or `docs/` with its own `package.json`, build pipeline, and static generation.
- **Pros:**
  - Can transpile Markdown files (`CHANGELOG.md`) automatically during build.
- **Cons:**
  - Adds dozens of MBs in dependencies to the repository.
  - Requires continuous CI build steps to update static output.
  - Complicates offline or low-resource development on mobile Termux environments.

**Decision:** Approach 1 was selected by user agreement.

---

## 5. Detailed Component & Section Specifications

### 5.1 Header & Navigation
- **Logo:** `vyen` in bold monospace with an emerald terminal accent (`>_ vyen`).
- **Nav Links:**
  - `Features` (smooth scroll to #features)
  - `Quick Start` (smooth scroll to #quickstart)
  - `Changelog` (smooth scroll to #changelog)
  - `Docs` (link to GitHub repository `docs/SPEC.md`)
- **Action Buttons:**
  - GitHub link with Star icon.
  - npm badge linking to `@nguyenhuumanh/vyen`.

### 5.2 Hero Section
- **Badge:** `v0.5.0 Released · Headless Contract v1 & Structured Outputs`.
- **Title:** `AI Coding Agent Ngay Trong Terminal Của Bạn`.
- **Subtitle:** `Độc lập. Siêu nhẹ. Tối ưu cho Termux trên Android và đa nền tảng Linux, macOS, Windows. Mang API key của riêng bạn, không phụ thuộc máy chủ trung gian.`
- **Call to Actions:**
  - Install Command Box: `npm install -g @nguyenhuumanh/vyen` with 1-click copy button and copied tooltip.
  - Secondary button: `Xem Hướng Dẫn Thiết Lập` (scroll to quickstart).
- **Interactive Terminal Mockup:**
  - Styled as a macOS/Linux dark terminal window with traffic light window controls (red/yellow/green dots) and title `vyen — ~/project`.
  - Realistic animated typing loop:
    1. User enters: `vyen -p "Sửa lỗi crash khi load config và chạy kiểm tra"`
    2. Agent status bar: `Thinking... [effort: high | model: claude-3-7-sonnet]`
    3. Tool call: `read_file path="src/config.ts"`
    4. Tool call: `apply_patch path="src/config.ts"` with real diff highlighting (`+` green, `-` red).
    5. Tool call: `bash command="npm test"` -> `✓ 249 tests passed`.
    6. Completion badge: `Done in 2.8s (Tokens: 1,420 prompt · 280 completion)`.

### 5.3 Core Pillars / Features Grid
Four cards with subtle glowing borders, distinct SVG icons, and clear technical descriptions:
1. **Termux & Mobile First-Class:**
   - Hoàn toàn bằng JavaScript thuần trên Node >= 22.16. Không cần root, không cần proot hay glibc, không tải addon native C++. Lập trình viên có thể code trực tiếp trên điện thoại mọi lúc mọi nơi.
2. **Bring Your Own Key & Multi-Provider:**
   - Kết nối trực tiếp tới OpenAI-compatible, OpenAI Responses, Anthropic Messages hoặc Local LLM (Ollama/vLLM). Không thu phí thuê bao, không ép dùng model chỉ định.
3. **Bảo Mật Phân Tầng & Workspace Trust:**
   - Chế độ Ask / Auto / Read-only. Hệ thống kiểm soát quyền đa tầng với Workspace Trust SHA-256. 8 hook vòng đời (`PreToolUse`, `PostToolUse`...) fail-closed bảo vệ workspace an toàn tuyệt đối.
4. **Hệ Sinh Thái Mở Rộng & Autonomous:**
   - Giao diện TUI toàn màn hình, hỗ trợ Subagents giải quyết bài toán phức tạp, Model Context Protocol (MCP) kết nối dữ liệu ngoại vi, và ghép đôi thiết bị từ xa qua `/pair`.

### 5.4 Quick Start & Installation Tabs
A tabbed container allowing users to click between their target operating system:
- **Tab 1: Termux (Android)**
  ```bash
  pkg install nodejs-lts git bash ripgrep
  npm install -g @nguyenhuumanh/vyen
  vyen setup
  ```
- **Tab 2: Linux / macOS**
  ```bash
  npm install -g @nguyenhuumanh/vyen
  vyen setup
  ```
- **Tab 3: Windows (PowerShell)**
  ```powershell
  npm install -g @nguyenhuumanh/vyen
  vyen setup
  ```
- Highlights the interactive wizard `vyen setup` which automatically discovers available models from the `/models` endpoint, securely stores credentials with restricted permissions, and selects reasoning effort.

### 5.5 Changelog & Release History Timeline
- Displays the evolution of Vyen with clean timeline nodes, version badges, release dates, and tag chips:
  - **v0.5.0 (Latest):** Headless Contract v1 (`--output-format stream-json`), Structured Outputs (`--json-schema`), module tách biệt `src/events.ts`.
  - **v0.4.0:** Phân tầng cấu hình (`.vyen/settings.json`), Lifecycle Hooks (8 sự kiện fail-closed), Workspace Trust SHA-256, Project MCP, Ghép đôi Cloudflared (`/pair`), Agent Network.
  - **v0.3.1:** Lệnh `vyen upgrade` tự động phát hiện package manager và cập nhật phiên bản.
  - **v0.3.0:** Đại tu TUI tối giản siêu tốc (nhanh gấp 80 lần), vá bảo mật, sửa lỗi regex patch và audit log JSONL.
  - **Launch Milestone / v1.0.0 Ready:** Dọn đường cho bản phát hành chính thức toàn diện.
- Each entry has an accordion or expand button to inspect detailed bullet points matching `CHANGELOG.md`.

### 5.6 Footer
- Minimal dark footer with copyright, MIT License notice, GitHub repo link, and npm link.
- Smooth "Back to top" button.

---

## 6. What's Left to the Builder

The builder implementing this specification has full discretion over:
1. Exact styling tokens: Palette based on slate-900/950 (`#090d16` background, `#10172a` cards, `#10b981` emerald and `#06b6d4` cyan glowing accents).
2. Typing simulation mechanics: Animation intervals, character typing speeds, and looping delay.
3. Copy-to-clipboard feedback duration (default 2000ms with checkmark icon).
4. Exact SVG icons for operating systems, copy button, and feature badges.
