# Vyen CLI

Vyen CLI là một agent lập trình dòng lệnh (CLI coding agent) độc lập, siêu nhẹ và bảo mật cao, được thiết kế tối ưu cho lập trình viên trên Termux (Android) cũng như các môi trường Linux, macOS và Windows sử dụng API riêng của bạn (BYOK).

> Lộ trình phát triển và các quyết định kiến trúc: [docs/ROADMAP.md](docs/ROADMAP.md). Chi tiết lịch sử phiên bản xem tại [CHANGELOG.md](CHANGELOG.md).

---

## Tính năng nổi bật

- **TUI tối giản & Transcript toàn màn hình**: Hiển thị Markdown thời gian thực, bảng căn cột, unified diff màu sắc nét; bật/tắt Transcript mode (`Ctrl+T`) xem toàn bộ quá trình suy luận; hàng đợi lệnh chạy ngay khi agent đang bận.
- **Hỗ trợ đa nhà cung cấp (BYOK)**: Tương thích mượt mà với OpenAI-compatible, OpenAI Responses và Anthropic Messages; tự động quét danh sách model từ endpoint và bảo toàn nguyên vẹn `reasoning_content` (DeepSeek, GLM, Kimi).
- **Phân tầng quyền hạn & Workspace Trust**: Kiểm soát chi tiết qua `.vyen/settings.json` với chính sách `permissions.allow`, `permissions.ask`, `permissions.deny`. Cờ `--trust-workspace` kích hoạt cả `hooks` lẫn quy tắc `permissions.allow`, đồng thời xác thực mã băm SHA-256 cho toàn bộ script được tham chiếu.
- **Hệ thống Hook vòng đời (Lifecycle Hooks)**: 8 sự kiện chuẩn (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, v.v.) lấy cảm hứng từ Claude Code, cơ chế fail-closed chặn thực thi tool khi có lỗi hoặc mã thoát 2.
- **Bộ công cụ tích hợp toàn diện**: Thao tác file an toàn, bảo vệ chống lỗi thiết bị `nul` trên Windows, tìm kiếm nội bộ không rò rỉ context, cùng bộ công cụ Web (`web_fetch`, `web_search`) tích hợp sẵn cơ chế chống SSRF và DNS rebinding.
- **Subagents & Tự động hóa thông minh**: Khởi chạy agent con chạy nền (`spawn_agent`/`wait_agent`), ủy thác theo lô (`delegate_task`, `delegate_edit`), pipeline đa bước Custom Workflows (`.vyen/workflows/`), và hội đồng phản biện Agent Network.
- **Hệ sinh thái MCP 2 chiều**: Hỗ trợ chuẩn Model Context Protocol qua stdio và HTTP Streamable, quản lý server theo dự án qua `.vyen/mcp.json`, tương tác Elicitation, Bounded Sampling và bộ nhớ đồ thị Knowledge Graph.
- **Hoàn tác & Checkpoint tức thì**: Rollback an toàn 100% qua `/rewind`, `/revert`, `/undo` mà không bao giờ ghi đè lên các thay đổi thủ công người dùng tạo ra sau lượt chạy.
- **Điều khiển từ xa qua Mobile Pair**: Mở Cloudflared Quick Tunnel miễn phí (`/pair`), tạo mã QR ngay trên terminal để điều khiển phiên và duyệt quyền trực tiếp từ điện thoại.

---

## Yêu cầu hệ thống

| Thành phần | Yêu cầu tối thiểu | Chi tiết & Khuyến nghị |
|---|---|---|
| **Hệ điều hành** | Termux (Android), Linux, macOS, Windows | Trên Termux, chạy trong thư mục `$HOME` để đảm bảo quyền thực thi file |
| **Node.js** | `>= 22.16.0` | Khuyên dùng Node 22.16 LTS hoặc Node 24 (không cần native compiler/proot) |
| **Trình quản lý gói** | `npm` (hoặc `pnpm`, `yarn`, `bun`) | Bản npm chứa JS biên dịch sẵn, tự động nạp dependencies khi cài đặt |
| **Công cụ hệ thống** | `git`, `bash` | Khuyến nghị cài `ripgrep` (có search JavaScript nội bộ dự phòng nếu thiếu) |
| **API Endpoint** | OpenAI / Anthropic Compatible | Endpoint hỗ trợ tool calling; nếu không cấu hình sẽ dùng gateway mặc định `https://api.yuristore.xyz/v1` |

---

## Cài đặt & Bắt đầu nhanh

### 1. Cài đặt toàn cục từ npm

```bash
# Trên Termux (cài thêm công cụ hệ thống nếu chưa có):
pkg install nodejs-lts git bash ripgrep

# Cài đặt Vyen CLI:
npm install -g @nguyenhuumanh/vyen

# Kiểm tra cài đặt:
vyen --version
```

### 2. Thiết lập nhanh (`vyen setup` hoặc `vyen init`)

Chạy wizard tương tác để chọn provider, nhập Base URL, quét danh sách model từ endpoint và lưu API key an toàn vào `credentials.json` (quyền `0600`):

```bash
vyen setup
```

Hoặc cấu hình nhanh qua lệnh:

```bash
vyen init \
  --provider openai-compatible \
  --base-url 'https://YOUR_PROVIDER/v1' \
  --model 'YOUR_MODEL_ID' \
  --effort xhigh

# Nhập key ẩn qua biến môi trường:
read -rsp 'API key: ' VYEN_API_KEY; echo
export VYEN_API_KEY
```

### 3. Khởi chạy dự án

```bash
cd your-project
vyen doctor     # Kiểm tra kết nối và môi trường
vyen            # Mở giao diện TUI làm việc
```

---

## Cách dùng CLI cơ bản

```bash
vyen                                              # Mở giao diện TUI toàn màn hình
vyen resume                                       # Chọn phiên để tiếp tục (hỗ trợ chuyển workspace tự động)
vyen -p 'Đọc repo, tìm nguyên nhân lỗi và sửa'     # Chạy headless với prompt trực tiếp
vyen --effort max -p 'Phân tích sâu kiến trúc'     # Tăng mức độ suy luận tối đa
vyen --read-only -p 'Giải thích các module chính'  # Chế độ chỉ đọc (không sửa file hay chạy shell)
vyen --yes -p 'Tự động duyệt mọi thao tác'        # Tự động chấp thuận (auto-approve)
vyen --output-format stream-json -p 'Audit repo'  # Xuất luồng NDJSON chuẩn v1 (--json là alias)
vyen upgrade                                      # Tự động cập nhật bản mới nhất (hỗ trợ npm/pnpm/yarn/bun)
```

---

## Lưu ý bảo mật

- **Gateway mặc định:** Khi không đặt `baseUrl`, prompt và API key được gửi tới `https://api.yuristore.xyz/v1`, một dịch vụ bên thứ ba. Hãy đặt `baseUrl` (flag `--base-url` hoặc config) nếu bạn không muốn dữ liệu đi qua gateway mặc định. Vyen in cảnh báo một lần trước request mô hình đầu tiên khi dùng gateway mặc định; wizard setup cũng cảnh báo trước khi dò `/models` nếu lần thiết lập đầu tiên vẫn chọn gateway mặc định. Ở chế độ `vyen doctor --json`, trường `baseUrl` vẫn giữ giá trị cấu hình (hoặc `"provider default"`), kèm `effectiveBaseUrl` (đích thực tế sau chuẩn hoá) và `defaultGateway` để script/CI kiểm tra nơi dữ liệu sẽ đi.
- **Cách ly API Key:** API key của vyen (`VYEN_API_KEY` và `keyEnv`) hoàn toàn bị loại khỏi môi trường thực thi của mọi tiến trình con (`bash`, `!cmd`, `git`, `rg`), chống rò rỉ qua prompt injection.
- **An toàn Workspace:** Lệnh đọc ảnh (`view_image`, `@ảnh`) ngoài workspace cần người dùng phê duyệt rõ ràng. Approval không phải sandbox của hệ điều hành; lệnh shell được duyệt sẽ chạy với quyền của user hiện tại.

---

## Repository & Tự động Release

- **Source Code**: [syxgamer122/Vyen-cli](https://github.com/syxgamer122/Vyen-cli)
- **NPM Package**: [@nguyenhuumanh/vyen](https://www.npmjs.com/package/@nguyenhuumanh/vyen)
- **Tài liệu chi tiết**: [docs/SPEC.md](docs/SPEC.md) · [docs/AUDIT.md](docs/AUDIT.md) · [docs/MCP.md](docs/MCP.md)

GitHub Releases hiện **không** được tạo tự động; workflow chỉ publish lên npm. Job publish chỉ chạy khi push tag `v*`; tag phải khớp `package.json`, sau đó npm publish qua OIDC trusted publishing (không lưu token, có provenance).
