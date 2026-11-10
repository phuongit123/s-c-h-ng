# Universal Media Downloader (UMD)

Ứng dụng tải video & âm thanh đa nền tảng hiện đại, hiệu năng cao: **FastAPI backend + yt-dlp engine + React UI + Server-Sent Events (SSE)** theo dõi tiến độ thời gian thực.

![Universal Media Downloader](web/index.html)

---

## ✨ Tính năng nổi bật

- 🎯 **Hỗ trợ hơn 17 nền tảng phổ biến**: YouTube, Facebook, TikTok, Instagram, Bilibili, Douyin, X (Twitter), SoundCloud, Vimeo, Reddit, Threads, Pinterest, Dailymotion, Twitch, ZingMP3, v.v.
- ⚡ **Tiến độ thời gian thực qua SSE**: Hiển thị phần trăm %, tốc độ tải (MB/s), thời gian còn lại (ETA), dung lượng file.
- 🖥️ **Giao diện Web React dựng sẵn**: Giao diện người dùng hiện đại, tối ưu cho cả máy tính và điện thoại di động (responsive), hỗ trợ Dark mode, sao chép link tự động, lọc danh sách tải.
- 🚀 **Khởi chạy 1-Click trên mọi hệ điều hành**: Script tự động tạo venv, cài dependencies và mở trình duyệt cho Windows, Linux, macOS.
- 🌐 **Chế độ Mobile & Remote Access (Cloudflare Tunnel)**: Chạy `run-online.bat` để nhận ngay link HTTPS truy cập từ điện thoại di động ở bất kỳ đâu mà không cần mở cổng modem.
- 🐳 **Docker & Docker Compose**: Đóng gói multi-stage Dockerfile sẵn sàng triển khai trên Render, Railway, VPS hoặc Synology NAS. Tích hợp sẵn `bgutil-pot` PO-Token generator để giải quyết triệt để vấn đề bot detection của YouTube trên cloud.
- 🍪 **Quản lý Cookie linh hoạt**: Hỗ trợ tải file cookie (`cookies.txt`) qua giao diện để tải các video yêu cầu đăng nhập, giới hạn độ tuổi hoặc video riêng tư.
- 🛡️ **Bảo mật & Ổn định**: Tích hợp cơ chế chống SSRF, chống Path Traversal, chuẩn hóa tên file an toàn với Unicode tiếng Việt, lưu trữ hàng đợi và lịch sử tải qua SQLite.

---

## 🚀 Hướng dẫn khởi chạy nhanh

### 1. Trên Windows (Khuyên dùng)

Chỉ cần **nhấp đúp chuột** vào một trong hai file sau:
- `run-umd.bat` (File chạy tự động tiêu chuẩn)
- `run-umd.cmd` (Dành cho máy bật Windows SmartScreen)

> Script sẽ tự động tìm Python (3.10 – 3.14), tạo môi trường ảo `.venv`, cài đặt thư viện và tự mở trình duyệt tại: **http://127.0.0.1:8756**

Nếu muốn **truy cập từ điện thoại di động qua Internet**:
- Nhấp đúp vào `run-online.bat`
- Script sẽ tự động kết nối Cloudflare Tunnel và cung cấp đường link `https://[ten-ngau-nhien].trycloudflare.com` để mở trên điện thoại.

---

### 2. Chạy thủ công trên Terminal (Windows)

```bat
# Mở Command Prompt (cmd.exe) tại thư mục dự án
py -3.12 -m venv .venv
".venv\Scripts\activate.bat"
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8756
```

---

### 3. Trên Linux & macOS

```bash
chmod +x run-umd.sh
./run-umd.sh
```

---

### 4. Khởi chạy bằng Docker / Docker Compose

Phù hợp cho Server, VPS, NAS hoặc máy đã cài Docker:

```bash
docker compose up -d
```

Truy cập giao diện tại: **http://localhost:8756**

---

## 🛠️ Yêu cầu hệ thống

1. **Python**: Phiên bản 3.10 trở lên (khuyến nghị 3.11 hoặc 3.12).
2. **FFmpeg** (Bắt buộc để ghép video chất lượng cao 1080p, 2K, 4K cùng âm thanh):
   - **Windows**: Chạy PowerShell: `winget install Gyan.FFmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Linux (Ubuntu/Debian)**: `sudo apt update && sudo apt install -y ffmpeg`
3. *(Tùy chọn)* **Node.js 18+**: Chỉ cần nếu bạn muốn sửa đổi mã nguồn frontend trong thư mục `frontend/`. Bản phân phối đã tích hợp sẵn thư mục `web/` đã build hoàn chỉnh, người dùng bình thường **không cần cài Node.js**.

---

## ⚙️ Cấu hình hệ thống (`.env`)

Bạn có thể tạo file `.env` từ file mẫu `.env.example` để tùy chỉnh:

| Biến môi trường | Mặc định | Mô tả |
|---|---|---|
| `UMD_DATA_DIR` | `./data` | Thư mục lưu database SQLite và cookie |
| `UMD_DOWNLOAD_DIR` | `./downloads` | Thư mục lưu các video/tập tin tải về |
| `UMD_MAX_CONCURRENT` | `3` | Số tác vụ tải song song tối đa |
| `UMD_TASK_TIMEOUT` | `7200` | Thời gian timeout tối đa cho một file tải (giây) |
| `UMD_ANALYZE_TIMEOUT` | `60` | Thời gian timeout phân tích link video (giây) |
| `UMD_FFMPEG_PATH` | Tự tìm trong PATH | Đường dẫn tùy chỉnh tới binary ffmpeg |

---

## 🧪 Kiểm thử (Testing)

Dự án đi kèm bộ test toàn diện 91 test cases kiểm tra cấu hình, cơ sở dữ liệu SQLite, hệ thống hàng đợi, cơ chế retry, bảo mật chống path traversal và phân loại adapter:

```bash
# Kích hoạt virtualenv trước
python -m pytest backend/tests
```

Tất cả các test đều được cấu hình mock để có thể chạy offline mà không cần kết nối mạng.

---

## 📂 Cấu trúc thư mục

```
universal-media-downloader/
├── backend/                  # FastAPI Application
│   ├── adapters/             # Bộ điều phối từng nền tảng (YouTube, TikTok, Facebook, ...)
│   ├── config.py             # Cấu hình hệ thống & biến môi trường
│   ├── database.py           # Quản lý SQLite database (aiosqlite)
│   ├── download_engine.py    # Nhân tải yt-dlp tích hợp SSE events & hooks
│   ├── main.py               # FastAPI router, REST API & SSE endpoint
│   ├── models.py             # Schema Pydantic cho Task, Format, Platform
│   ├── queue_manager.py      # Bộ lập lịch và điều phối tải đa luồng
│   ├── security.py           # Chống SSRF, Path Traversal, sanitize tên file
│   └── tests/                # 91 unit & integration tests
├── web/                      # Giao diện React SPA đã build sẵn (chạy ngay)
├── yt_dlp_plugins/           # Plugin mở rộng cho yt-dlp (bgutil PO token)
├── frontend/                 # Mã nguồn React + Vite + Tailwind CSS gốc
├── scripts/                  # Scripts hỗ trợ cài đặt và quản trị
├── Dockerfile                # Dockerfile đa giai đoạn tối ưu hóa production
├── docker-compose.yml        # Cấu hình triển khai container 1 lệnh
├── requirements.txt          # Danh sách thư viện Python
├── run-umd.bat               # 1-Click launcher cho Windows (.bat)
├── run-umd.cmd               # 1-Click launcher cho Windows (.cmd chống SmartScreen)
├── run-umd.sh                # 1-Click launcher cho Linux & macOS
├── run-online.bat            # 1-Click launcher kết nối Cloudflare Tunnel cho điện thoại
├── README-CACH-CHAY.txt      # Hướng dẫn chi tiết bằng tiếng Việt
└── README.md                 # Tài liệu dự án đầy đủ
```

---

## 📄 Bản quyền & Trách nhiệm

Dự án được xây dựng cho mục đích học tập, lưu trữ cá nhân và nghiên cứu kỹ thuật. Vui lòng tuân thủ điều khoản dịch vụ của các nền tảng và tôn trọng bản quyền của tác giả nội dung. Không hỗ trợ tải các nội dung có mã hóa DRM bảo vệ (Netflix, Spotify Premium, v.v.).
