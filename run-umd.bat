@echo off
rem ============================================================
rem  UNIVERSAL MEDIA DOWNLOADER (UMD) — KHỞI CHẠY 1-CLICK (WINDOWS)
rem  Double-click file này để tự động cài đặt và mở giao diện Web.
rem ============================================================
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

if not exist "requirements.txt" (
  echo [LỖI] Không tìm thấy requirements.txt trong thư mục hiện tại:
  echo   %CD%
  echo Hãy đảm bảo file run-umd.bat nằm trong thư mục gốc của dự án.
  pause
  exit /b 1
)

if not exist "backend\main.py" (
  echo [LỖI] Không tìm thấy thư mục backend\ trong:
  echo   %CD%
  pause
  exit /b 1
)

echo ============================================================
echo   UNIVERSAL MEDIA DOWNLOADER (UMD) - TỰ ĐỘNG KHỞI CHẠY
echo   Thư mục làm việc : %CD%
echo ============================================================
echo.

rem --- Tìm interpreter Python (ưu tiên 3.12, 3.11, 3.10, 3.13, 3.14 hoặc python) ---
set "PYCMD="
for %%V in (3.12 3.11 3.10 3.13 3.14) do (
  if not defined PYCMD (
    py -%%V -c "pass" >nul 2>nul && set "PYCMD=py -%%V"
  )
)
if not defined PYCMD (
  python --version 2>nul | findstr /r "Python 3\.[1-9][0-9]*" >nul && set "PYCMD=python"
)
if not defined PYCMD (
  echo [LỖI] Chưa tìm thấy Python 3.10+ trên máy tính của bạn.
  echo.
  echo Hướng dẫn cài đặt nhanh:
  echo   Cách 1: Tải bộ cài tại: https://www.python.org/downloads/
  echo          (LƯU Ý: Nhớ TÍCH chọn "Add python.exe to PATH" khi cài đặt)
  echo   Cách 2: Gõ lệnh trong Terminal: winget install Python.Python.3.12
  echo.
  pause
  exit /b 1
)

echo [*] Đang dùng:
"!PYCMD!" --version
echo.

rem --- Tạo virtualenv .venv nếu chưa có ---
if not exist ".venv\Scripts\python.exe" (
  echo [*] Đang khởi tạo môi trường ảo .venv (chỉ chạy lần đầu)...
  "!PYCMD!" -m venv .venv
  if errorlevel 1 (
    echo [LỖI] Không tạo được venv. Thử chạy bằng tay: "!PYCMD!" -m venv .venv
    pause
    exit /b 1
  )
)

call ".venv\Scripts\activate.bat"
if errorlevel 1 (
  echo [LỖI] Không thể kích hoạt môi trường .venv
  pause
  exit /b 1
)

rem --- Cài đặt dependency ---
echo [*] Đang kiểm tra thư viện backend...
python -m pip install --upgrade pip >nul 2>nul
python -m pip install -q -r requirements.txt
if errorlevel 1 (
  echo [LỖI] Không thể cài đặt dependency. Kiểm tra kết nối Internet và thử lại.
  pause
  exit /b 1
)

rem --- Kiểm tra FFmpeg ---
where ffmpeg >nul 2>nul || (
  echo [CẢNH BÁO] Chưa cài FFmpeg trên máy.
  echo           Video đơn lẻ vẫn tải được, nhưng ghép Audio+Video chất lượng cao cần FFmpeg.
  echo           Cài nhanh bằng lệnh: winget install Gyan.FFmpeg
  echo.
)

echo ============================================================
echo   ỨNG DỤNG ĐÃ SẴN SÀNG!
echo   Giao diện Web:     http://127.0.0.1:8756
echo   Kiểm tra hệ thống: http://127.0.0.1:8756/api/health
echo   Tài liệu API:      http://127.0.0.1:8756/docs
echo   (Đóng cửa sổ này để dừng ứng dụng)
echo ============================================================
echo.

rem Mở trực tiếp Web UI trên trình duyệt mặc định
start "" "http://127.0.0.1:8756"

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8756
pause
