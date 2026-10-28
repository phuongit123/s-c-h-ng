export type SupportStatus = 'supported' | 'limited' | 'official-only' | 'unsupported' | 'needs-authentication';

export type TaskState =
  | 'pending'
  | 'queued'
  | 'analyzing'
  | 'downloading'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface FormatInfo {
  format_id: string;
  ext: string;
  resolution: string;
  quality_label: string;
  height: number | null;
  vcodec: string;
  acodec: string;
  filesize: number | null;
  tbr: number | null;
  has_video: boolean;
  has_audio: boolean;
  note: string;
}

export interface PlatformInfo {
  key: string;
  display_name: string;
  status: SupportStatus;
  description_vi: string;
  conditions_vi: string;
  needs_authentication: boolean;
  supports_audio_only: boolean;
  max_resolution: number | null;
}

export interface DetectResponse {
  url: string;
  platform_key: string | null;
  platform_display_name: string | null;
  recognized: boolean;
  status: SupportStatus | null;
  message_vi: string;
}

export interface MediaMetadata {
  url: string;
  platform_key: string;
  platform_display_name?: string;
  is_generic_fallback?: boolean;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string;
  webpage_url: string;
  formats: FormatInfo[];
  requested_formats_note: string;
  requires_auth: boolean;
  is_live: boolean;
  raw_id: string;
}

export interface DownloadOptions {
  url: string;
  format_id?: string | null;
  audio_only?: boolean;
  audio_format?: string | null;
  download_mode?: 'fast' | 'medium' | 'slow';
  output_dir?: string | null;
  filename_template?: string | null;
  skip_duplicate?: boolean;
}

export interface TaskProgress {
  percent: number;
  downloaded_bytes: number;
  total_bytes: number | null;
  speed_bps: number | null;
  eta_seconds: number | null;
  status_text: string;
}

export interface TaskOut {
  id: string;
  url: string;
  platform_key: string;
  title: string;
  state: TaskState;
  progress: TaskProgress;
  options: DownloadOptions;
  error?: { error_code?: string; message?: string; hint_vi?: string } | null;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
  attempts: number;
}

export interface HistoryEntry {
  id: string;
  url: string;
  platform_key: string;
  title: string;
  file_path: string;
  file_size: number;
  completed_at: string;
  state: TaskState;
  file_exists?: boolean;
  file_size_on_disk?: number | null;
}

export interface QueueStats {
  total: number;
  active: number;
  pending: number;
  completed: number;
  failed: number;
  cancelled: number;
  max_concurrent: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  ffmpeg_available: boolean;
  yt_dlp_version: string | null;
  download_dir: string;
  free_disk_bytes: number;
  warnings: string[];
}
