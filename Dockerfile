# ==============================================================================
# Universal Media Downloader — Multi-stage Production Dockerfile
# ==============================================================================

# ----------------------------- Stage 1: Build UI ------------------------------
FROM node:20-alpine AS ui-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# -------------------------- Stage 2: Production App ---------------------------
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8756 \
    UMD_DATA_DIR=/app/data \
    UMD_DOWNLOAD_DIR=/app/downloads

# Install system dependencies:
# - ffmpeg (cần thiết để ghép audio+video, xử lý phân đoạn phim)
# - nodejs (cần thiết để yt-dlp giải mã JS challenge của YouTube)
# - curl & ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    gnupg \
    ca-certificates \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Tự động cài đặt bgutil-pot (Rust BotGuard PO-Token generator) để bypass YouTube botwall trên Cloud
RUN curl -fsSL -o /usr/local/bin/bgutil-pot https://github.com/jim60105/bgutil-ytdlp-pot-provider-rs/releases/download/v0.8.1/bgutil-pot-linux-x86_64 \
    && chmod +x /usr/local/bin/bgutil-pot

WORKDIR /app

# Cài đặt Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code & yt-dlp plugins
COPY backend/ ./backend
COPY yt_dlp_plugins/ ./yt_dlp_plugins

# Copy static frontend đã build từ Stage 1
COPY --from=ui-builder /app/frontend/dist ./web

# Tạo thư mục dữ liệu và thư mục tải về
RUN mkdir -p /app/data /app/downloads

EXPOSE 8756

# Khởi chạy bgutil-pot server ngầm ở cổng 4416 và khởi chạy Uvicorn
CMD ["sh", "-c", "bgutil-pot server --port 4416 --host 127.0.0.1 & python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
