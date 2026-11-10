#!/usr/bin/env bash
# ============================================================
#  UNIVERSAL MEDIA DOWNLOADER (UMD) — 1-CLICK RUN (LINUX / MACOS)
#  Usage: chmod +x run-umd.sh && ./run-umd.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "requirements.txt" ] || [ ! -f "backend/main.py" ]; then
    echo "[LỖI] Vui lòng chạy script từ thư mục gốc của dự án."
    exit 1
fi

echo "============================================================"
echo "  UNIVERSAL MEDIA DOWNLOADER (UMD) - LINUX / MACOS RUNNER"
echo "  Thư mục: $SCRIPT_DIR"
echo "============================================================"

# Kiểm tra python3
if ! command -v python3 &>/dev/null; then
    echo "[LỖI] Không tìm thấy python3 trên hệ thống."
    echo "  - Ubuntu/Debian: sudo apt update && sudo apt install -y python3 python3-venv python3-pip"
    echo "  - macOS: brew install python"
    echo "  - Arch: sudo pacman -S python python-pip"
    exit 1
fi

# Kiểm tra version Python >= 3.10
python3 -c "import sys; assert sys.version_info >= (3, 10), 'Cần Python >= 3.10'" || {
    echo "[LỖI] Phiên bản Python hiện tại quá cũ (< 3.10). Vui lòng cập nhật Python 3.10+."
    exit 1
}

echo "[*] Python: $(python3 --version)"

# Khởi tạo virtualenv nếu chưa có
if [ ! -f ".venv/bin/python" ]; then
    echo "[*] Đang khởi tạo môi trường ảo .venv..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# Cài đặt dependency
echo "[*] Đang kiểm tra thư viện backend..."
python -m pip install --upgrade pip >/dev/null 2>&1
python -m pip install -q -r requirements.txt

# Kiểm tra FFmpeg
if ! command -v ffmpeg &>/dev/null; then
    echo "[CẢNH BÁO] Chưa tìm thấy FFmpeg trên máy."
    echo "  - Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  - macOS: brew install ffmpeg"
    echo "  - Arch: sudo pacman -S ffmpeg"
    echo "  (Video đơn lẻ vẫn tải được, nhưng ghép âm thanh/4K cần FFmpeg)"
fi

echo "============================================================"
echo "  ỨNG DỤNG ĐÃ SẴN SÀNG!"
echo "  Giao diện Web:     http://127.0.0.1:8756"
echo "  Kiểm tra hệ thống: http://127.0.0.1:8756/api/health"
echo "  (Nhấn Ctrl+C để dừng ứng dụng)"
echo "============================================================"

# Mở trình duyệt mặc định
if command -v xdg-open &>/dev/null; then
    xdg-open "http://127.0.0.1:8756" &>/dev/null &
elif command -v open &>/dev/null; then
    open "http://127.0.0.1:8756" &>/dev/null &
fi

exec python -m uvicorn backend.main:app --host 127.0.0.1 --port 8756
