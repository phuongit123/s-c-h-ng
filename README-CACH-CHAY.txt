================================================================================
           UNIVERSAL MEDIA DOWNLOADER (UMD) — HƯỚNG DẪN KHỞI CHẠY NHANH
================================================================================

Dự án hỗ trợ 100% tự động trên mọi hệ điều hành (Windows, Linux, macOS, Docker).

--------------------------------------------------------------------------------
1. CÁCH NHANH NHẤT TRÊN WINDOWS (1-CLICK)
--------------------------------------------------------------------------------
- Nhấp đúp chuột vào file:
    run-umd.bat
  hoặc
    run-umd.cmd   (Khuyên dùng nếu Windows SmartScreen cảnh báo file .bat)

- Script sẽ tự động:
  + Tìm kiếm phiên bản Python phù hợp (3.10 -> 3.14)
  + Tự động tạo môi trường ảo .venv (chỉ lần đầu)
  + Tự động cài đặt đầy đủ các thư viện cần thiết
  + Tự động mở trình duyệt web tại địa chỉ: http://127.0.0.1:8756

- Nếu muốn chia sẻ link ra ngoài Internet để điều khiển từ điện thoại:
  + Nhấp đúp file: run-online.bat
  + Script sẽ tự tạo Cloudflare Tunnel và cung cấp đường dẫn HTTPS an toàn.

--------------------------------------------------------------------------------
2. CÁCH CHẠY THỦ CÔNG QUA TERMINAL (WINDOWS CMD)
--------------------------------------------------------------------------------
Mở CMD (Command Prompt), chuyển vào thư mục dự án và chạy các lệnh:

  cd /d "ĐƯỜNG_DẪN_THƯ_MỤC_DỰ_ÁN"
  py -3.12 -m venv .venv
  ".venv\Scripts\activate.bat"
  python -m pip install -r requirements.txt
  python -m uvicorn backend.main:app --host 127.0.0.1 --port 8756

Sau đó mở trình duyệt truy cập: http://127.0.0.1:8756

--------------------------------------------------------------------------------
3. TRÊN LINUX VÀ MACOS
--------------------------------------------------------------------------------
Mở Terminal tại thư mục dự án:

  chmod +x run-umd.sh
  ./run-umd.sh

Script sẽ tự kiểm tra Python 3, tạo virtualenv, cài thư viện và mở trình duyệt.

--------------------------------------------------------------------------------
4. CHẠY BẰNG DOCKER (CHO MỌI MÁY / SERVER / NAS)
--------------------------------------------------------------------------------
Nếu máy có Docker Desktop hoặc Docker Engine:

  docker compose up -d

Sau đó truy cập: http://localhost:8756

--------------------------------------------------------------------------------
5. CÀI ĐẶT FFMPEG (KHUYẾN NGHỊ ĐỂ GHÉP VIDEO + AUDIO 1080P/4K)
--------------------------------------------------------------------------------
- Windows: mở PowerShell chạy:
    winget install Gyan.FFmpeg
- macOS:
    brew install ffmpeg
- Linux (Ubuntu/Debian):
    sudo apt update && sudo apt install -y ffmpeg

--------------------------------------------------------------------------------
6. ĐỊA CHỈ TRUY CẬP HỆ THỐNG
--------------------------------------------------------------------------------
- Giao diện người dùng Web UI:  http://127.0.0.1:8756
- Kiểm tra trạng thái Backend:  http://127.0.0.1:8756/api/health
- Tài liệu API (Swagger):       http://127.0.0.1:8756/docs
================================================================================
