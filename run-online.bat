@echo off
chcp 65001 >nul
title Universal Media Downloader - Online Mode (Cloudflare Tunnel)

echo ======================================================================
echo    UNIVERSAL MEDIA DOWNLOADER — ONLINE CLOUDFLARE TUNNEL
echo    Truy cập ứng dụng từ điện thoại hoặc mạng ngoài (Không bị chặn YouTube)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Kiểm tra Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [LỖI] Không tìm thấy Python trong hệ thống. Vui lòng cài Python 3.10+.
    pause
    exit /b 1
)

:: 2. Kiểm tra venv
if not exist "universal-media-downloader\.venv\Scripts\python.exe" (
    echo [1/3] Đang khởi tạo môi trường Python cục bộ...
    python -m venv universal-media-downloader\.venv
    call universal-media-downloader\.venv\Scripts\activate.bat
    pip install -q -r requirements.txt
) else (
    echo [1/3] Môi trường Python đã sẵn sàng.
)

:: 3. Kiểm tra cloudflared
if not exist "cloudflared.exe" (
    echo [2/3] Đang tải Cloudflare Tunnel (cloudflared.exe)...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    if not exist "cloudflared.exe" (
        echo [LỖI] Không thể tải cloudflared.exe. Kiểm tra kết nối mạng.
        pause
        exit /b 1
    )
) else (
    echo [2/3] Cloudflare Tunnel đã sẵn sàng.
)

:: 4. Khởi động backend uvicorn chạy ngầm
echo [3/3] Khởi động máy chủ Universal Media Downloader...
start /b "" "universal-media-downloader\.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8756 >nul 2>&1

:: Chờ backend khởi động 2 giây
timeout /t 2 /nobreak >nul

echo.
echo ======================================================================
echo    ĐANG TẠO ĐƯỜNG LINK PUBLIC CHO ĐIỆN THOẠI...
echo    Hãy tìm dòng chữ có định dạng:
echo    https://[tên-ngẫu-nhiên].trycloudflare.com
echo ======================================================================
echo.

:: 5. Chạy tunnel và hiển thị link
cloudflared.exe tunnel --url http://127.0.0.1:8756
