"""Các adapter nền tảng cụ thể.

Trạng thái hỗ trợ được khai báo THÀNH PHẦN và trung thực dựa trên khả năng
thực tế của yt-dlp tại thời điểm phát triển (yt-dlp 2026.10.x). Không đánh dấu
Supported chỉ vì URL được nhận diện — cần test thực tế mới nâng cấp trạng thái.
"""
from __future__ import annotations

import json
import logging
import re
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

from backend.adapters.base import BaseAdapter
from backend.errors import InvalidURLError, VideoUnavailableError
from backend.models.schemas import SupportStatus

log = logging.getLogger("umd.adapters")


class YouTubeAdapter(BaseAdapter):
    key = "youtube"
    display_name = "YouTube"
    status = SupportStatus.SUPPORTED
    domains = ("youtube.com", "youtu.be", "music.youtube.com", "www.youtube.com")
    url_patterns = (
        re.compile(r"https?://(www\.|m\.)?(youtube\.com/(watch\?.*v=|shorts/|live/|embed/)|youtu\.be/)[\w-]{11}"),
        re.compile(r"https?://music\.youtube\.com/watch\?.*v=[\w-]{11}"),
    )
    description_vi = "Video, Shorts và playlist YouTube."
    conditions_vi = ("Hỗ trợ video công khai và video bạn có quyền. Video riêng tư/giới hạn tuổi "
                     "cần cookie cục bộ hợp lệ. Không vượt DRM YouTube Premium/Originals.")
    max_resolution = None  # tùy nguồn (tới 4K/8K nếu nguồn cung cấp)

    def ydl_extra_opts(self) -> dict:
        return {
            "extractor_args": {
                "youtube": {
                    "player_client": ["web_embedded", "android"],
                }
            }
        }


class FacebookAdapter(BaseAdapter):
    key = "facebook"
    display_name = "Facebook"
    status = SupportStatus.LIMITED
    domains = ("facebook.com", "fb.watch", "m.facebook.com", "web.facebook.com")
    description_vi = "Video công khai trên Facebook (watch, reel, fb.watch)."
    conditions_vi = ("Chỉ hoạt động ổn định với video CÔNG KHAI. Video trong nhóm kín/trang cá nhân "
                     "yêu cầu đăng nhập → trạng thái needs-authentication khi dùng cookie. "
                     "Hay thay đổi theo phía Facebook.")


class TikTokAdapter(BaseAdapter):
    key = "tiktok"
    display_name = "TikTok"
    status = SupportStatus.SUPPORTED
    domains = ("tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "www.tiktok.com", "m.tiktok.com")
    description_vi = "Video TikTok công khai."
    conditions_vi = "Một số region/URL rút gọn có thể cần thử lại hoặc cần cookie nếu tài khoản giới hạn."

    def ydl_extra_opts(self) -> dict:
        return {
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Referer": "https://www.tiktok.com/",
            }
        }


class DouyinAdapter(BaseAdapter):
    key = "douyin"
    display_name = "Douyin (抖音)"
    status = SupportStatus.LIMITED
    domains = ("douyin.com", "iesdouyin.com", "v.douyin.com", "www.douyin.com")
    description_vi = "Video Douyin công khai (nền tảng nội địa Trung Quốc của TikTok)."
    conditions_vi = ("Thường cần yt-dlp phiên bản mới; một số nội dung giới hạn khu vực "
                     "hoặc yêu cầu xác minh thiết bị / cookie.")

    def transform_url(self, url: str) -> str:
        # 1. Tham số ?modal_id=<digits>
        m = re.search(r"[?&]modal_id=(\d+)", url)
        if m:
            return f"https://www.douyin.com/video/{m.group(1)}"
        # 2. Link iesdouyin share
        m = re.search(r"iesdouyin\.com/share/video/(\d+)", url)
        if m:
            return f"https://www.douyin.com/video/{m.group(1)}"
        # 3. Link v.douyin.com rút gọn
        if "v.douyin.com" in url:
            try:
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                class _NoRedir(urllib.request.HTTPRedirectHandler):
                    def redirect_request(self, req, fp, code, msg, headers, newurl):
                        req.dest_url = newurl
                        return None
                opener = urllib.request.build_opener(_NoRedir)
                req = urllib.request.Request(url, headers=headers)
                try:
                    opener.open(req)
                except urllib.error.HTTPError as err:
                    loc = err.headers.get("Location")
                    if loc:
                        m_loc = re.search(r"/video/(\d+)", loc) or re.search(r"modal_id=(\d+)", loc)
                        if m_loc:
                            return f"https://www.douyin.com/video/{m_loc.group(1)}"
            except Exception:
                pass
        return url

    def is_feed_url(self, url: str) -> bool:
        norm = self.transform_url(url)
        if "/video/" in norm:
            return False
        low = url.lower()
        return any(feed in low for feed in ("/jingxuan", "?recommend", "/discover", "/channel", "/hot", "/follow")) or norm.rstrip("/").endswith("douyin.com")

    def detect_message(self, url: str) -> str | None:
        if self.is_feed_url(url):
            return ("Nhận diện: Douyin (抖音). Lưu ý: Đây là trang bảng tin/khám phá tổng hợp. "
                    "Vui lòng bấm mở video muốn tải rồi sao chép liên kết (dạng https://www.douyin.com/video/<id> "
                    "hoặc link có tham số ?modal_id=<id>).")
        return None

    def validate_url(self, url: str) -> bool:
        if not self.can_handle(url):
            return False
        norm = self.transform_url(url)
        if self.is_feed_url(norm):
            raise InvalidURLError(
                message=f"URL '{url}' là trang bảng tin tổng hợp (feed/khám phá) của Douyin, không chứa ID video cụ thể.",
                hint_vi=(
                    "👉 Cách lấy link tải video Douyin:\n"
                    "1. Trên trang Douyin, hãy bấm chuột để mở xem video bạn muốn tải.\n"
                    "2. Bấm vào nút 'Chia sẻ' (Share) trên video -> chọn 'Sao chép liên kết' (Copy link).\n"
                    "3. Hoặc sao chép đường dẫn trên thanh địa chỉ có chứa ID (ví dụ https://www.douyin.com/video/<id> hoặc link có tham số ?modal_id=<id>)."
                )
            )
        return True

    def ydl_extra_opts(self) -> dict:
        return {
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Referer": "https://www.douyin.com/",
            }
        }


class BilibiliAdapter(BaseAdapter):
    key = "bilibili"
    display_name = "Bilibili (哔哩哔哩)"
    status = SupportStatus.LIMITED
    domains = ("bilibili.com", "b23.tv", "m.bilibili.com", "www.bilibili.com")
    description_vi = "Video Bilibili công khai."
    conditions_vi = ("Chất lượng cao (>1080p) và nội dung premium cần tài khoản đăng nhập hợp lệ "
                     "(cookie cục bộ). Giới hạn khu vực có thể áp dụng.")

    def ydl_extra_opts(self) -> dict:
        return {
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Referer": "https://www.bilibili.com/",
            }
        }


class InstagramAdapter(BaseAdapter):
    key = "instagram"
    display_name = "Instagram"
    status = SupportStatus.NEEDS_AUTHENTICATION
    domains = ("instagram.com", "instagr.am")
    description_vi = "Reels/video Instagram."
    conditions_vi = ("Instagram thường yêu cầu đăng nhập để xem và tải. Ứng dụng chỉ cho phép "
                     "dùng cookie CỤC BỘ do chính người dùng cung cấp cho nội dung họ có quyền.")
    needs_authentication = True


class TwitterAdapter(BaseAdapter):
    key = "twitter"
    display_name = "X (Twitter)"
    status = SupportStatus.LIMITED
    domains = ("twitter.com", "x.com")
    description_vi = "Video công khai trên X/Twitter."
    conditions_vi = ("Tweet riêng tư hoặc tài khoản khóa cần đăng nhập (cookie cục bộ). "
                     "API thay đổi thường xuyên, cần yt-dlp mới.")


class RedditAdapter(BaseAdapter):
    key = "reddit"
    display_name = "Reddit"
    status = SupportStatus.SUPPORTED
    domains = ("reddit.com", "redd.it", "old.reddit.com")
    description_vi = "Video nhúng/link trực tiếp trong bài viết Reddit."
    conditions_vi = "Nội dung bị xóa hoặc subreddit riêng tư sẽ không tải được."


class VimeoAdapter(BaseAdapter):
    key = "vimeo"
    display_name = "Vimeo"
    status = SupportStatus.LIMITED
    domains = ("vimeo.com", "player.vimeo.com")
    description_vi = "Video Vimeo công khai."
    conditions_vi = "Video private/password cần quyền truy cập hợp lệ."


class DailymotionAdapter(BaseAdapter):
    key = "dailymotion"
    display_name = "Dailymotion"
    status = SupportStatus.SUPPORTED
    domains = ("dailymotion.com", "dai.ly")
    description_vi = "Video Dailymotion công khai."


class PinterestAdapter(BaseAdapter):
    key = "pinterest"
    display_name = "Pinterest"
    status = SupportStatus.LIMITED
    domains = ("pinterest.com", "pin.it", "it.pinterest.com")
    description_vi = "Video Pin công khai."
    conditions_vi = "Chỉ pin dạng video; ảnh/idea pin không áp dụng."


class ThreadsAdapter(BaseAdapter):
    key = "threads"
    display_name = "Threads"
    status = SupportStatus.LIMITED
    domains = ("threads.net", "www.threads.net", "threads.com")
    description_vi = "Video công khai trên Threads."
    conditions_vi = "Hỗ trợ còn hạn chế, phụ thuộc phiên bản yt-dlp gần nhất."


class MovyAdapter(BaseAdapter):
    key = "movy"
    display_name = "Movy (Phim & Series)"
    status = SupportStatus.SUPPORTED
    domains = ("movy.sx", "www.movy.sx")
    description_vi = "Trang xem và tải phim Full HD / 4K từ Movy (movy.sx)."
    conditions_vi = ("Hỗ trợ tải toàn bộ phim Full Movie (1080p, 4K, 720p) và series đa tập. "
                     "Tự động giải mã luồng phát trực tiếp (HLS/m3u8) từ hạ tầng Movy.")

    def detect_message(self, url: str) -> str | None:
        if not ("/movie/" in url or "/tv/" in url):
            return ("Nhận diện: Movy (movy.sx). Lưu ý: Đây là trang chủ danh mục. "
                    "Vui lòng dán liên kết bộ phim cụ thể (ví dụ https://www.movy.sx/movie/<id> "
                    "hoặc https://www.movy.sx/tv/<id>) để tải đầy đủ phim.")
        return ("Nhận diện: Movy (Phim / Series). Hệ thống sẽ trích xuất stream Full Movie/Series "
                "chất lượng cao (1080p/4K) để tải về.")

    def validate_url(self, url: str) -> bool:
        if not self.can_handle(url):
            return False
        if not ("/movie/" in url or "/tv/" in url):
            raise InvalidURLError(
                message=f"URL '{url}' là trang chủ/danh mục của Movy (movy.sx).",
                hint_vi="Vui lòng bấm vào một bộ phim hoặc series cụ thể (link dạng https://www.movy.sx/movie/<id>) rồi sao chép liên kết để tải về."
            )
        return True

    def _get_page(self, url: str, headers: dict | None = None) -> str:
        h = headers or {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Referer": "https://www.movy.sx/",
            "Origin": "https://www.movy.sx",
            "Accept-Language": "en-US,en;q=0.9",
        }
        try:
            from curl_cffi import requests as cffi_requests
            r = cffi_requests.get(url, headers=h, impersonate="chrome120", timeout=12)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, timeout=12) as resp:
            return resp.read().decode("utf-8", errors="ignore")

    def fetch_details(self, url: str) -> dict:
        try:
            html = self._get_page(url)
        except Exception as exc:
            raise VideoUnavailableError(f"Không thể truy cập trang Movy: {exc}") from exc

        m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
        if not m:
            raise VideoUnavailableError("Không tìm thấy cấu trúc dữ liệu trên trang Movy.")
        try:
            props = json.loads(m.group(1)).get("props", {}).get("pageProps", {})
        except Exception as exc:
            raise VideoUnavailableError(f"Không thể giải mã dữ liệu Movy: {exc}") from exc

        details = props.get("details")
        if not details:
            raise VideoUnavailableError("Không tìm thấy chi tiết bộ phim trên trang Movy này.")
        return details

    def resolve_stream_source(self, url: str) -> tuple[dict, str]:
        """Giải mã nguồn phát trực tiếp (HLS master.m3u8) cho full phim."""
        details = self.fetch_details(url)
        tmdb_id = details.get("tmdbId")
        if not tmdb_id:
            raise VideoUnavailableError("Không tìm thấy TMDB ID của phim trên Movy.")

        title = details.get("title") or details.get("titleEnglish") or "Movie"
        year = details.get("year", "")
        media_type = details.get("mediaType", "movie")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.movy.sx/",
            "Origin": "https://www.movy.sx",
        }

        # 1. Lấy seed từ wecollege
        seed_url = f"https://api.wecollege.net/seed?mediaId={tmdb_id}"
        seed = None
        try:
            seed_data = json.loads(self._get_page(seed_url, headers=headers))
            seed = seed_data.get("seed")
        except Exception as err:
            log.warning("Lỗi lấy seed từ wecollege: %s", err)

        if seed:
            decrypt_script = Path(__file__).resolve().parent / "movy_decrypt.js"
            providers = ["miami", "boise", "atlanta", "phoenix", "portland", "vegas", "chicago"]
            params = {
                "title": urllib.parse.quote(title),
                "mediaType": media_type,
                "year": str(year),
                "tmdbId": str(tmdb_id),
                "imdbId": details.get("imdbId", ""),
                "enc": "2",
                "seed": seed,
            }

            for p in providers:
                p_url = f"https://api.wecollege.net/{p}/sources?" + urllib.parse.urlencode(params)
                try:
                    payload = self._get_page(p_url, headers=headers).strip()
                    proc = subprocess.run(
                        ["node", str(decrypt_script)],
                        input=json.dumps({"payload": payload, "seed": seed, "tmdbId": tmdb_id}),
                        text=True, capture_output=True, timeout=10
                    )
                    if proc.returncode == 0 and proc.stdout.strip():
                        data = json.loads(proc.stdout)
                        playlist = data.get("playlist")
                        sources = data.get("sources", [])
                        stream_url = playlist or (sources[0].get("url") if sources else None)
                        if stream_url:
                            return details, stream_url
                except Exception:
                    continue

        # Fallback về trailer nếu nhà cung cấp chưa có bản phát hành
        trailer_id = details.get("trailerId")
        if trailer_id:
            return details, f"https://www.youtube.com/watch?v={trailer_id}"

        raise VideoUnavailableError("Không thể tìm thấy nguồn phát phim khả dụng cho phim này.")

    def resolve_download_url(self, url: str) -> str:
        self.validate_url(url)
        _, stream_url = self.resolve_stream_source(url)
        return stream_url

    def ydl_extra_opts(self) -> dict:
        return {
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Referer": "https://www.movy.sx/",
                "Origin": "https://www.movy.sx",
            }
        }


class ShopeeVideoAdapter(BaseAdapter):
    key = "shopee_video"
    display_name = "Shopee Video"
    status = SupportStatus.UNSUPPORTED
    domains = ("shopee.vn", "shopee.com", "s.shopee.vn", "video.shopee.vn")
    description_vi = "Shopee Video."
    conditions_vi = ("Chưa có extractor tương thích ổn định trong yt-dlp. Trang chủ Shopee là "
                     "sàn thương mại điện tử, nội dung video nằm sau API riêng và điều khoản sử dụng. "
                     "Để trống chức năng thay vì giả mạo kết quả.")


class DongBaoAdapter(BaseAdapter):
    key = "dongbao"
    display_name = "Đông Báo / ĐôngBao"
    status = SupportStatus.UNSUPPORTED
    domains = ()  # Chưa xác minh được tên miền chính thức.
    description_vi = "Nền tảng 'ĐôngBao/Đông Báo' theo yêu cầu người dùng."
    conditions_vi = ("CẦN XÁC MINH: chưa xác định chắc chắn tên miền và bản chất nền tảng "
                     "(có thể nhầm với dongphim/báo điện tử). Không bật adapter khi chưa xác minh; "
                     "người dùng cung cấp URL mẫu thì hệ thống generic extractor sẽ thử phân tích "
                     "và báo cáo trung thực kết quả.")

    def can_handle(self, url: str) -> bool:
        return False  # an toàn: không nhận bừa


class NetflixAdapter(BaseAdapter):
    key = "netflix"
    display_name = "Netflix"
    status = SupportStatus.OFFICIAL_ONLY
    domains = ("netflix.com",)
    description_vi = "Netflix (dịch vụ DRM)."
    conditions_vi = ("CHỈ hỗ trợ tính năng tải ngoại tuyến CHÍNH THỨC của ứng dụng Netflix. "
                     "Không phá DRM, không trích xuất khóa giải mã, không vượt xác thực. "
                     "Ứng dụng này từ chối mọi URL Netflix.")
    supports_audio_only = False

    @property
    def download_allowed(self) -> bool:
        return False


class GenericWebsiteAdapter(BaseAdapter):
    """Fallback cho các website video công khai khác (HTML5 video, HLS công khai...)."""
    key = "generic"
    display_name = "Website công khai khác"
    status = SupportStatus.LIMITED
    relies_on_generic = True
    description_vi = "Những trang web chứa video công khai mà yt-dlp generic extractor xử lý được."
    conditions_vi = ("Kết quả phụ thuộc cấu trúc trang. Trang dùng DRM/paywall/login bắt buộc "
                     "sẽ KHÔNG hoạt động — đây là giới hạn kỹ thuật thật, không phải lỗi app.")

    def can_handle(self, url: str) -> bool:
        return True  # fallback cuối cùng


ADAPTERS: list[BaseAdapter] = [
    YouTubeAdapter(),
    FacebookAdapter(),
    TikTokAdapter(),
    DouyinAdapter(),
    BilibiliAdapter(),
    InstagramAdapter(),
    TwitterAdapter(),
    RedditAdapter(),
    VimeoAdapter(),
    DailymotionAdapter(),
    PinterestAdapter(),
    ThreadsAdapter(),
    MovyAdapter(),
    ShopeeVideoAdapter(),
    DongBaoAdapter(),
    NetflixAdapter(),
    GenericWebsiteAdapter(),
]
