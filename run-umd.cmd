@echo off
rem ============================================================
rem  UNIVERSAL MEDIA DOWNLOADER (UMD) — KHỞI CHẠY 1-CLICK (.CMD)
rem  File định dạng .cmd giúp tránh SmartScreen cảnh báo.
rem ============================================================
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

if not exist "requirements.txt" (
  echo [LỖI] Thiếu file requirements.txt trong: %CD%
  echo Hãy đảm bảo file run-umd.cmd nằm đúng thư mục gốc dự án.
  pause & exit /b 1
)
if not exist "backend\main.py" (
  echo [LỖI] Thiếu thư mục backend\ trong: %CD%
  pause & exit /b 1
)

rem ---- Tìm Python 3.10-3.14 ----
set "PYCMD="
for %%V in (3.12 3.11 3.10 3.13 3.14) do if not defined PYCMD py -%%V -c "pass" >nul 2>nul && set "PYCMD=py -%%V"
if not defined PYCMD python --version 2>nul | findstr /r "Python 3\.[1-9][0-9]*" >nul && set "PYCMD=python"
if not defined PYCMD (
  echo [LỖI] Cần Python 3.10+. Tải tại: https://www.python.org/downloads/
  echo (Nhớ tích chọn "Add python.exe to PATH")
  pause & exit /b 1
)

rem ---- Tạo venv nếu chưa có ----
if not exist ".venv\Scripts\python.exe" (
  echo [*] Đang tạo môi trường ảo .venv (chỉ lần đầu)...
  "!PYCMD!" -m venv .venv || (echo [LỖI] Không tạo được venv & pause & exit /b 1)
)
call ".venv\Scripts\activate.bat"

rem ---- Cài dependency ----
echo [*] Đang kiểm tra thư viện backend...
python -m pip install --upgrade pip >nul 2>nul
python -m pip install -q -r requirements.txt || (echo [LỖI] pip install thất bại & pause & exit /b 1)

where ffmpeg >nul 2>nul || (
  echo [CẢNH BÁO] Chưa có FFmpeg - để tải chất lượng cao 1080p/4K, gõ: winget install Gyan.FFmpeg
  echo.
)

echo ============================================================
echo   UMD ĐÃ SẴN SÀNG!
echo   Giao diện Web:     http://127.0.0.1:8756
echo   Kiểm tra hệ thống: http://127.0.0.1:8756/api/health
echo   (Đóng cửa sổ này để dừng ứng dụng)
echo ============================================================
echo.

start "" "http://127.0.0.1:8756"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8756
pause
