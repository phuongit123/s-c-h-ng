"""Download engine dựa trên yt-dlp (thư viện, KHÔNG sinh shell command từ URL).

- Chạy blocking code của yt-dlp trong thread pool → không chặn event loop.
- Callback tiến độ cập nhật task + publish sự kiện SSE.
- Hủy tác vụ qua CancelFlag (yt_dlp.utils.DownloadCancelled).
- Chỉ báo COMPLETED khi file đầu ra TỒN TẠI và có kích thước > 0 sau khi
  yt-dlp kết thúc (kể cả post-process FFmpeg).
- Phân loại lỗi yt-dlp thành AppError có thông báo tiếng Việt + cách khắc phục.
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
import shutil
import time
from pathlib import Path
from typing import Callable

import yt_dlp
from yt_dlp.utils import DownloadCancelled

from backend.adapters.base import BaseAdapter
from backend.config import ffmpeg_available, settings
from backend.errors import (
    AuthenticationRequiredError,
    DependencyMissingError,
    ExtractionOutdatedError,
    FormatNotAvailableError,
    InsufficientDiskSpaceError,
    NetworkError,
    VideoUnavailableError,
)
from backend.models.schemas import FormatInfo, MediaMetadata
from backend.services.security import sanitize_filename, unique_destination, validate_url

log = logging.getLogger("umd.engine")


class CancelFlag:
    """Cờ hủy an toàn giữa threads."""

    def __init__(self) -> None:
        self.cancelled = False

    def raise_if(self) -> None:
        if self.cancelled:
            raise DownloadCancelled("Người dùng đã hủy tác vụ.")


def classify_ydl_error(exc: Exception) -> Exception:
    """Chuyển lỗi yt-dlp thô thành AppError có hướng dẫn (không lộ chi tiết nhạy cảm).

    Thứ tự kiểm tra quan trọng: các tín hiệu đặc thù (ffmpeg, unsupported url,
    private/removed, login) phải được xét TRƯỚC nhóm từ khóa chung như "format".
    """
    msg = str(exc)
    low = msg.lower()
    if isinstance(exc, DownloadCancelled):
        return exc
    # FFmpeg / post-processing — xét sớm vì chuỗi thường chứa cả từ "format"
    if any(k in low for k in ("ffmpeg", "ffprobe", "postprocessing", "post-process")):
        return DependencyMissingError(msg[:300])
    if "unsupported url" in low or "no suitable extractor" in low:
        return ExtractionOutdatedError(msg[:300])
    if any(k in low for k in ("login", "sign in", "sign in to confirm",
                              "authentication", "auth required", "members-only",
                              "account needed", "cookies")):
        return AuthenticationRequiredError(msg[:300])
    # Định dạng không khả dụng — xét TRƯỚC VideoUnavailable vì chuỗi
    # "Requested format is not available" cũng chứa "not available".
    if any(k in low for k in ("requested format is not available", "no formats",
                              "format is not available", "is not a valid format")):
        return FormatNotAvailableError(msg[:300])
    # "private" → video bị ẩn/xóa (VideoUnavailable), KHÔNG phải lỗi đăng nhập.
    # "age-restricted" → yêu cầu xác minh tuổi/đăng nhập → AuthenticationRequired.
    if "private" in low or any(
            k in low for k in ("removed", "unavailable", "does not exist",
                               "video unavailable", "not available", "deleted")):
        return VideoUnavailableError(msg[:300])
    if "age-restricted" in low:
        return AuthenticationRequiredError(msg[:300])
    if any(k in low for k in ("timed out", "timeout", "temporary failure", "connection reset",
                              "network", "getaddrinfo", "ssl", "urlopen error")):
        return NetworkError(msg[:300])
    return NetworkError(f"Lỗi không phân loại được từ nguồn: {msg[:200]}")


def _quality_label(f: dict) -> str:
    h = f.get("height")
    if h:
        return f"{h}p"
    if f.get("vcodec") == "none" or not f.get("height"):
        return "Audio only"
    return f.get("format_note") or f.get("ext", "")


def extract_formats(info: dict) -> list[FormatInfo]:
    """Sinh DANH SÁCH ĐỊNH DẠNG THỰC TẾ từ metadata yt-dlp. Không tạo tùy chọn ảo."""
    out: list[FormatInfo] = []
    seen: set[str] = set()
    for f in info.get("formats") or []:
        fid = str(f.get("format_id", ""))
        ext = f.get("ext") or ""
        if not fid or not ext:
            continue
        vcodec = f.get("vcodec") or "none"
        acodec = f.get("acodec") or "none"
        has_video = vcodec != "none"
        has_audio = acodec != "none"

        # Loại bỏ hoàn toàn storyboard, thumbnails mhtml và các định dạng không có cả audio lẫn video
        if not has_video and not has_audio:
            continue
        if ext == "mhtml" or f.get("protocol") == "mhtml" or "storyboard" in (f.get("format_note") or "").lower() or fid.startswith("sb"):
            continue

        height = f.get("height")
        fi = FormatInfo(
            format_id=fid,
            ext=ext,
            resolution=f.get("resolution") or (f"{f.get('width', '')}x{height}" if height else ""),
            quality_label=_quality_label(f),
            height=height,
            vcodec=vcodec,
            acodec=acodec,
            filesize=f.get("filesize") or f.get("filesize_approx"),
            tbr=f.get("tbr"),
            has_video=has_video,
            has_audio=has_audio,
            note=f.get("format_note") or "",
        )
        key = f"{fid}|{ext}|{height}"
        if key in seen:
            continue
        seen.add(key)
        out.append(fi)

    # Sắp xếp định dạng: video lên trước (theo độ phân giải giảm dần), sau đó audio (theo bitrate giảm dần)
    def _sort_key(item: FormatInfo):
        video_prio = 1 if item.has_video else 0
        h = item.height or 0
        tbr = item.tbr or 0
        return (video_prio, h, tbr)

    out.sort(key=_sort_key, reverse=True)
    return out


def build_progress_hook(task_cb: Callable[[dict], None], flag: CancelFlag):
    last = {"t": 0.0}

    def hook(d: dict) -> None:
        flag.raise_if()
        now = time.monotonic()
        if d.get("status") == "downloading":
            if now - last["t"] < 0.25:  # throttle UI updates
                return
            last["t"] = now
            downloaded = d.get("downloaded_bytes") or 0
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded_int = int(round(float(downloaded))) if downloaded is not None else 0
            total_int = int(round(float(total))) if total is not None else None
            speed = d.get("speed")
            speed_val = float(speed) if speed is not None else None
            eta = d.get("eta")
            eta_val = float(eta) if eta is not None else None
            payload = {
                "event": "progress",
                "percent": round(downloaded_int / total_int * 100, 1) if total_int else 0.0,
                "downloaded_bytes": downloaded_int,
                "total_bytes": total_int,
                "speed_bps": speed_val,
                "eta_seconds": eta_val,
                "status_text": "Đang tải...",
            }
            task_cb(payload)
        elif d.get("status") == "finished":
            task_cb({"event": "progress", "percent": 100.0, "status_text": "Tải xong, xử lý hậu kỳ..."})
        elif d.get("status") == "error":
            task_cb({"event": "progress", "status_text": "Lỗi khi tải fragment"})
    return hook


def _postprocessor_hooks(task_cb: Callable[[dict], None]):
    def pp_hook(d: dict) -> None:
        stage = d.get("status")
        if stage == "started_processing":
            task_cb({"event": "progress", "status_text": "FFmpeg đang ghép/chuyển đổi..."})
    return [pp_hook]


def _parse_movy_master_m3u8(stream_url: str, details: dict) -> dict:
    """Fallback phân tích trực tiếp master.m3u8 khi yt-dlp gặp timeout với CDN."""
    import re
    import urllib.request
    from urllib.parse import urljoin

    req = urllib.request.Request(stream_url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Referer": "https://www.movy.sx/",
        "Origin": "https://www.movy.sx",
    })
    with urllib.request.urlopen(req, timeout=15) as res:
        content = res.read().decode("utf-8", errors="ignore")

    lines = [l.strip() for l in content.splitlines() if l.strip()]
    formats = []
    for i, line in enumerate(lines):
        if line.startswith("#EXT-X-STREAM-INF:"):
            sub_url = lines[i + 1] if i + 1 < len(lines) else ""
            if sub_url.startswith("#"):
                continue
            abs_url = urljoin(stream_url, sub_url)
            res_m = re.search(r"RESOLUTION=(\d+)x(\d+)", line)
            bw_m = re.search(r"BANDWIDTH=(\d+)", line)
            w, h = (int(res_m.group(1)), int(res_m.group(2))) if res_m else (0, 0)
            bw = int(bw_m.group(1)) if bw_m else 0
            fid = str(bw // 1000) if bw else (sub_url.split("/")[-1].replace(".m3u8", "") or f"{h}p")

            tag = f"{h}p" if h else ""
            if h >= 1600 or "2160" in sub_url:
                tag = "4K (2160p)"
            elif h >= 1080 or "1080" in sub_url:
                tag = "Full HD (1080p)"
            elif h >= 720 or "720" in sub_url:
                tag = "HD (720p)"
            elif h >= 480 or "480" in sub_url:
                tag = "SD (480p)"

            formats.append({
                "format_id": fid,
                "url": abs_url,
                "ext": "mp4",
                "width": w,
                "height": h,
                "resolution": f"{w}x{h}" if w else "",
                "tbr": bw // 1000 if bw else None,
                "vcodec": "avc1",
                "acodec": "mp4a",
                "protocol": "m3u8",
                "format_note": tag,
            })

    formats.sort(key=lambda x: (x.get("height") or 0, x.get("tbr") or 0), reverse=True)
    dur = details.get("duration")
    duration_sec = float(dur) * 60.0 if dur and float(dur) < 1000 else float(dur or 0.0)

    return {
        "id": f"movy-{details.get('tmdbId') or details.get('trailerId')}",
        "title": details.get("title") or "Movy Media",
        "duration": duration_sec,
        "thumbnail": f"https://www.movy.sx{details.get('poster')}" if details.get("poster") else None,
        "formats": formats,
        "webpage_url": stream_url,
    }


async def analyze(url: str, adapter: BaseAdapter) -> MediaMetadata:
    """Phân tích metadata trong thread pool với timeout."""
    validate_url(url)
    url = adapter.transform_url(url)
    adapter.validate_url(url)

    if adapter.key == "movy":
        def _fetch_movy() -> tuple[dict, str]:
            return adapter.resolve_stream_source(url)

        details, stream_url = await asyncio.to_thread(_fetch_movy)
        is_youtube = "youtube.com" in stream_url or "youtu.be" in stream_url
        info = None
        last_exc = None

        if is_youtube:
            from backend.adapters.registry import registry
            yt_adapter = registry.get("youtube") or adapter
            info = await asyncio.to_thread(lambda: yt_dlp.YoutubeDL(_base_opts(yt_adapter, quiet=True)).extract_info(stream_url, download=False))
        else:
            for _ in range(2):
                try:
                    opts = _base_opts(adapter, quiet=True)
                    opts["extractor_retries"] = 3
                    opts["socket_timeout"] = 35
                    info = await asyncio.to_thread(lambda: yt_dlp.YoutubeDL(opts).extract_info(stream_url, download=False))
                    if info:
                        break
                except Exception as exc:
                    last_exc = exc
                    await asyncio.sleep(0.5)

            if not info:
                try:
                    info = await asyncio.to_thread(lambda: _parse_movy_master_m3u8(stream_url, details))
                except Exception:
                    if last_exc:
                        raise classify_ydl_error(last_exc) from last_exc
                    raise

        title = details.get("title") or details.get("titleEnglish") or "Movy Media"
        year = details.get("year")
        display_title = f"{title} ({year})" if year else title
        if is_youtube:
            display_title += " - Official Trailer"
        poster_path = details.get("poster")
        poster_url = f"https://www.movy.sx{poster_path}" if poster_path else (info.get("thumbnail") if info else None)

        dur = (info.get("duration") if info else None) or details.get("duration")
        dur_sec = float(dur) * 60.0 if dur and float(dur) < 1000 else float(dur or 0.0)

        return MediaMetadata(
            url=url,
            platform_key="movy",
            title=sanitize_filename(display_title, fallback="movy_media"),
            thumbnail=poster_url,
            duration=dur_sec or None,
            uploader=f"Movy ({details.get('mediaType', 'movie').upper()})",
            webpage_url=url,
            formats=extract_formats(info) if info else [],
            requires_auth=False,
            is_live=False,
            raw_id=f"movy-{details.get('tmdbId') or details.get('trailerId')}",
        )

    def _run() -> dict:
        opts = _base_opts(adapter, quiet=True)
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(url, download=False)
        except Exception as exc:
            err_str = str(exc).lower()
            if adapter.key == "youtube" and any(k in err_str for k in ("confirm you're not a bot", "sign in", "bot")):
                opts_fb = dict(opts)
                opts_fb["extractor_args"] = {"youtube": {"player_client": ["web_embedded", "android"]}}
                with yt_dlp.YoutubeDL(opts_fb) as ydl:
                    return ydl.extract_info(url, download=False)
            raise

    try:
        info = await asyncio.wait_for(
            asyncio.to_thread(_run), timeout=settings.analyze_timeout_seconds)
    except asyncio.TimeoutError as exc:
        raise NetworkError("Hết thời gian phân tích URL (timeout).") from exc
    except DownloadCancelled:
        raise
    except Exception as exc:
        raise classify_ydl_error(exc) from exc

    if not info:
        raise VideoUnavailableError("Nguồn trả về dữ liệu rỗng.")
    if info.get("_type") == "playlist":
        entries = info.get("entries") or []
        if not entries:
            raise VideoUnavailableError("Playlist trống hoặc không khả dụng.")
        info = entries[0]  # giai đoạn này hỗ trợ từng video một

    return MediaMetadata(
        url=url,
        platform_key=adapter.key,
        title=sanitize_filename(info.get("title") or "", fallback="video"),
        thumbnail=info.get("thumbnail"),
        duration=info.get("duration"),
        uploader=info.get("uploader") or info.get("channel") or "",
        webpage_url=info.get("webpage_url") or url,
        formats=extract_formats(info),
        requires_auth=bool(info.get("requires_login")),
        is_live=bool(info.get("is_live")),
        raw_id=str(info.get("id") or ""),
    )


def _base_opts(adapter: BaseAdapter, *, quiet: bool = True) -> dict:
    opts: dict = {
        "quiet": quiet,
        "no_warnings": quiet,
        "noprogress": True,
        "socket_timeout": 35,
        "retries": 3,
        "fragment_retries": 5,
        "extractor_retries": 3,
        "overwrites": False,
        "windowsfilenames": True,   # an toàn tên file trên Windows
        "restrictfilenames": False,  # giữ Unicode — tự sanitize ở tầng app
        "ignoreerrors": False,
        "nocheckcertificate": False,
        "js_runtimes": {"node": {}},
        "remote_components": ["ejs:github"],
    }
    if settings.cookie_file and settings.cookie_file.exists():
        opts["cookiefile"] = str(settings.cookie_file)
    opts.update(adapter.ydl_extra_opts())
    return opts


def _build_format_fmt(options: dict, adapter: BaseAdapter) -> tuple[str, str | None]:
    """Trả (format_selector, target_ext) từ lựa chọn người dùng — chỉ dựa trên format THỰC."""
    fmt_id = options.get("format_id")
    audio_only = options.get("audio_only", False)
    audio_fmt = (options.get("audio_format") or "").lower() or None

    if audio_only:
        if not adapter.supports_audio_only:
            raise FormatNotAvailableError("Nền tảng này không cung cấp tùy chọn âm thanh riêng.")
        if audio_fmt in {"mp3"} :
            if not ffmpeg_available():
                raise DependencyMissingError("Chuyển đổi MP3 cần FFmpeg nhưng chưa được cài.")
            return ("bestaudio/best", "mp3")
        if audio_fmt in {"m4a", "opus", "webm"}:
            return (f"bestaudio[ext={audio_fmt}]/bestaudio/best", audio_fmt)
        return ("bestaudio/best", None)

    if fmt_id and not fmt_id.startswith("sb") and "mhtml" not in fmt_id.lower():
        # Nếu chọn format_id cụ thể (ví dụ 1080p, 720p, 480p):
        # Trên YouTube và hầu hết các nền tảng, 1080p là stream video-only.
        # Để video có đầy đủ âm thanh và đạt chuẩn 1080p, bắt buộc phải ghép format_id + bestaudio!
        return (f"{fmt_id}+bestaudio/{fmt_id}/best", None)
    # Mặc định: video chất lượng cao nhất (1080p/4K) + audio chất lượng cao nhất
    return ("bestvideo+bestaudio/best", None)


async def download_file(
    url: str,
    adapter: BaseAdapter,
    options: dict,
    progress_cb: Callable[[dict], None],
    cancel: CancelFlag,
) -> Path:
    """Tải và xác minh file thật. Trả về đường dẫn cuối cùng đã lưu."""
    validate_url(url)
    url = adapter.transform_url(url)
    adapter.validate_url(url)
    resolved_url = adapter.resolve_download_url(url)
    actual_adapter = adapter
    if resolved_url != url:
        from backend.adapters.registry import registry
        target_adapter, _ = registry.resolve(resolved_url)
        if target_adapter and target_adapter.key != "generic":
            actual_adapter = target_adapter

    if settings.free_disk_bytes() < settings.min_free_disk_bytes:
        raise InsufficientDiskSpaceError(
            f"Còn {settings.free_disk_bytes() // (1024*1024)} MB dung lượng trống.")

    out_dir: Path = options["output_dir"]
    fmt_sel, target_ext = _build_format_fmt(options, actual_adapter)

    def _run() -> Path:
        opts = _base_opts(actual_adapter)
        opts["paths"] = {"temp": str(out_dir / ".tmp")}
        opts["progress_hooks"] = [build_progress_hook(progress_cb, cancel)]
        opts["postprocessor_hooks"] = _postprocessor_hooks(progress_cb)
        opts["format"] = fmt_sel

        need_merge = "+" in fmt_sel and not options.get("audio_only")
        want_convert = bool(target_ext) and target_ext not in {"m4a", "opus", "webm"}
        if (need_merge or want_convert) and not ffmpeg_available():
            # Trung thực: không hứa ghép audio/video nếu thiếu FFmpeg
            if need_merge:
                raise DependencyMissingError(
                    "Video này cần FFmpeg để ghép audio+video nhưng FFmpeg chưa được cài.")
        if need_merge:
            opts["merge_output_format"] = "mp4"
        if options.get("audio_only"):
            opts["format"] = fmt_sel
            if target_ext == "mp3":
                opts["postprocessors"] = [
                    {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"},
                ]
            elif target_ext in {"m4a", "opus", "webm"}:
                opts["postprocessors"] = [
                    {"key": "FFmpegExtractAudio", "preferredcodec": target_ext},
                ]
            else:
                opts["noplaylist"] = True

        stem = sanitize_filename(options.get("filename_stem") or "video")
        ext_guess = target_ext or "mp4"
        dest = unique_destination(out_dir, stem, ext_guess)
        opts["outtmpl"] = {
            "default": str(dest.with_name(dest.stem + ".%(ext)s")),
        }

        mode = options.get("download_mode") or "medium"
        if mode == "fast":
            num_parts = 8
            concurrent_frags = 8
        elif mode == "slow":
            num_parts = 2
            concurrent_frags = 1
        else:  # medium
            num_parts = 4
            concurrent_frags = 4

        opts["concurrent_fragment_downloads"] = concurrent_frags

        # Kiểm tra thời lượng video: nếu phim dài (>= 300s) và FFmpeg sẵn sàng -> kích hoạt tải chia nhỏ N phần rồi ghép
        duration = 0.0
        with contextlib.suppress(Exception):
            with yt_dlp.YoutubeDL(opts) as ydl:
                probe = ydl.extract_info(resolved_url, download=False)
                if probe:
                    if probe.get("_type") == "playlist":
                        ents = [e for e in (probe.get("entries") or []) if e]
                        probe = ents[0] if ents else {}
                    duration = float(probe.get("duration") or 0.0)

        if duration >= 300.0 and ffmpeg_available() and num_parts > 1:
            try:
                parts_dir = out_dir / ".tmp" / f"parts_{dest.stem}_{int(time.time())}"
                parts_dir.mkdir(parents=True, exist_ok=True)
                part_files: list[Path] = []
                chunk_duration = duration / num_parts

                for part_idx in range(num_parts):
                    flag.raise_if()
                    start_sec = round(part_idx * chunk_duration, 2)
                    end_sec = round((part_idx + 1) * chunk_duration, 2) if part_idx < num_parts - 1 else duration
                    part_target = parts_dir / f"part_{part_idx + 1:03d}.mp4"

                    progress_cb({
                        "event": "progress",
                        "percent": round(part_idx / num_parts * 100, 1),
                        "status_text": f"Đang tải phần {part_idx + 1}/{num_parts} ({mode.upper()})...",
                    })

                    part_opts = dict(opts)
                    part_opts["download_ranges"] = lambda info_dict, ydl, s=start_sec, e=end_sec: [{"start_time": s, "end_time": e}]
                    part_opts["outtmpl"] = {"default": str(part_target)}
                    part_opts["overwrites"] = True

                    with yt_dlp.YoutubeDL(part_opts) as ydl:
                        ydl.download([resolved_url])

                    part_found = None
                    if part_target.exists() and part_target.stat().st_size > 0:
                        part_found = part_target
                    else:
                        for p in parts_dir.glob(f"part_{part_idx + 1:03d}.*"):
                            if p.is_file() and p.stat().st_size > 0:
                                part_found = p
                                break
                    if not part_found:
                        raise RuntimeError(f"Không tạo được file part {part_idx + 1}")
                    part_files.append(part_found)

                flag.raise_if()
                progress_cb({
                    "event": "progress",
                    "percent": 99.0,
                    "status_text": f"Đã tải xong {num_parts} phần. Đang ghép file hoàn chỉnh...",
                })

                concat_list = parts_dir / "concat_list.txt"
                with open(concat_list, "w", encoding="utf-8") as f:
                    for pf in part_files:
                        f.write(f"file '{pf.resolve().as_posix()}'\n")

                target_dest = dest.with_suffix(part_files[0].suffix) if part_files else dest

                ffmpeg_res = subprocess.run([
                    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(concat_list),
                    "-c", "copy",
                    str(target_dest),
                ], capture_output=True, text=True)

                if ffmpeg_res.returncode == 0 and target_dest.exists() and target_dest.stat().st_size > 0:
                    with contextlib.suppress(OSError):
                        shutil.rmtree(parts_dir, ignore_errors=True)
                    progress_cb({
                        "event": "progress",
                        "percent": 100.0,
                        "status_text": f"Ghép hoàn tất {num_parts} phần thành công!",
                    })
                    return target_dest
                else:
                    log.warning("FFmpeg concat -c copy thất bại: %s", ffmpeg_res.stderr)
            except Exception as seg_err:
                log.warning("Tách phần tải thất bại (%s), fallback về tải một lượt", seg_err)

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(resolved_url, download=True)
        except Exception as dl_exc:
            err_str = str(dl_exc).lower()
            if actual_adapter.key == "youtube" and any(k in err_str for k in ("confirm you're not a bot", "sign in", "bot")):
                opts_fb = dict(opts)
                opts_fb["extractor_args"] = {"youtube": {"player_client": ["web_embedded", "android"]}}
                with yt_dlp.YoutubeDL(opts_fb) as ydl:
                    info = ydl.extract_info(resolved_url, download=True)
            else:
                raise
            if info and info.get("_type") == "playlist":
                entries = [e for e in (info.get("entries") or []) if e]
                if entries:
                    info = entries[0]
            final_path = None
            with contextlib.suppress(Exception):
                req = ydl.prepare_filename(info or {})
                final_path = Path(req)
        # Tìm file thật sự được tạo (extension có thể khác dự đoán)
        candidates: list[Path] = []
        if final_path and final_path.exists():
            candidates.append(final_path)
        for p in sorted(out_dir.glob(dest.stem + ".*")):
            if p.suffix.lower() not in (".part", ".ytdl", ".tmp") and p not in candidates:
                candidates.append(p)
        real = next((p for p in candidates if p.is_file() and p.stat().st_size > 0), None)
        if real is None:
            raise RuntimeError("yt-dlp kết thúc nhưng không tìm thấy file kết quả hợp lệ.")
        # Dọn phần tạm
        with contextlib.suppress(OSError):
            tmpdir = out_dir / ".tmp"
            if tmpdir.exists():
                shutil.rmtree(tmpdir, ignore_errors=True)
        return real

    try:
        return await asyncio.to_thread(_run)
    except DownloadCancelled:
        raise
    except (InsufficientDiskSpaceError, DependencyMissingError):
        raise
    except Exception as exc:
        mapped = classify_ydl_error(exc)
        if mapped is exc:
            raise
        raise mapped from exc
