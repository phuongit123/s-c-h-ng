import React, { useState } from 'react';
import { MediaMetadata, DownloadOptions, FormatInfo } from '../types/api';
import { formatBytes, formatDuration } from '../utils/format';
import { api, ApiError } from '../api/client';
import {
  Download,
  Music,
  Video,
  Clock,
  User,
  ExternalLink,
  Check,
  AlertCircle,
  FileCheck,
  Loader2,
  Zap,
} from 'lucide-react';

interface MediaPreviewCardProps {
  metadata: MediaMetadata;
  onTaskCreated: (taskId: string) => void;
  onClose: () => void;
}

export const MediaPreviewCard: React.FC<MediaPreviewCardProps> = ({
  metadata,
  onTaskCreated,
  onClose,
}) => {
  // Group formats into video and audio
  const videoFormats = metadata.formats.filter((f) => f.has_video);
  const audioFormats = metadata.formats.filter((f) => !f.has_video && f.has_audio);

  const [audioOnly, setAudioOnly] = useState(false);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(
    videoFormats.length > 0 ? videoFormats[0].format_id : (metadata.formats.length > 0 ? metadata.formats[0].format_id : null)
  );
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'm4a'>('mp3');
  const [downloadMode, setDownloadMode] = useState<'fast' | 'medium' | 'slow'>('medium');
  const [skipDuplicate, setSkipDuplicate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartDownload = async () => {
    setSubmitting(true);
    setError(null);

    const options: DownloadOptions = {
      url: metadata.url,
      format_id: audioOnly ? undefined : selectedFormatId || undefined,
      audio_only: audioOnly,
      audio_format: audioOnly ? audioFormat : undefined,
      download_mode: downloadMode,
      skip_duplicate: skipDuplicate,
    };

    try {
      const task = await api.createTask(options);
      onTaskCreated(task.id);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(`${err.message} ${err.hintVi ? `(${err.hintVi})` : ''}`);
      } else {
        setError(err.message || 'Lỗi khi tạo tác vụ tải.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden transition">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Thumbnail Preview */}
          <div className="relative md:w-72 flex-shrink-0 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700">
            {metadata.thumbnail ? (
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <Video className="w-12 h-12 stroke-[1.5]" />
              </div>
            )}

            {metadata.duration && (
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-white text-xs font-mono font-medium flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(metadata.duration)}</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                {metadata.title || 'Không có tiêu đề'}
              </h3>
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {metadata.uploader && (
                <span className="flex items-center space-x-1 font-medium text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{metadata.uploader}</span>
                </span>
              )}

              {metadata.platform_display_name && (
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-medium">
                  {metadata.platform_display_name}
                </span>
              )}

              {metadata.webpage_url && (
                <a
                  href={metadata.webpage_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-indigo-600 hover:underline"
                >
                  <span>Mở trang gốc</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Mode Selector: Video vs Audio-Only */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setAudioOnly(false)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  !audioOnly
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video & Âm thanh</span>
              </button>

              <button
                type="button"
                onClick={() => setAudioOnly(true)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  audioOnly
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Chỉ lấy âm thanh (Audio Only)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Format Selection Box */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
          {!audioOnly ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                Chọn độ phân giải & định dạng ({videoFormats.length} tùy chọn)
              </label>

              {videoFormats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {videoFormats.map((f) => {
                    const isSelected = selectedFormatId === f.format_id;
                    return (
                      <div
                        key={f.format_id}
                        onClick={() => setSelectedFormatId(f.format_id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                              {f.quality_label || f.resolution || 'Mặc định'}
                            </span>
                            <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                              {f.ext}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {f.filesize ? formatBytes(f.filesize) : f.note || 'Tự động tính'}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Không tìm thấy danh sách video format riêng lẻ — Hệ thống sẽ tự động chọn bản tốt nhất có sẵn.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Định dạng âm thanh xuất ra (Chuyển đổi qua FFmpeg)
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="audioFormat"
                    value="mp3"
                    checked={audioFormat === 'mp3'}
                    onChange={() => setAudioFormat('mp3')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold">MP3 (Phổ biến, tương thích mọi thiết bị)</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="audioFormat"
                    value="m4a"
                    checked={audioFormat === 'm4a'}
                    onChange={() => setAudioFormat('m4a')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold">M4A (Chất lượng gốc AAC)</span>
                </label>
              </div>
            </div>
          )}

          {/* Chế độ chia nhỏ file khi tải phim/video dài */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Chế độ tải & Tách file (Dành cho phim dài / video nặng)</span>
              </label>
              <span className="text-[11px] text-slate-400">Tự động ghép nối bằng FFmpeg</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDownloadMode('fast')}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                  downloadMode === 'fast'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    🚀 Tải nhanh
                  </span>
                  {downloadMode === 'fast' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Tách nhiều phần (8 phần), tải đồng thời tốc độ tối đa rồi tự ghép.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDownloadMode('medium')}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                  downloadMode === 'medium'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    ⚡ Tải vừa (Khuyên dùng)
                  </span>
                  {downloadMode === 'medium' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Tách làm 4 phần, tải ổn định cân bằng rồi tự ghép lại.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDownloadMode('slow')}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                  downloadMode === 'slow'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    🐢 Tải chậm
                  </span>
                  {downloadMode === 'slow' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Tách 1 - 2 phần, tuần tự nhẹ máy, tiết kiệm băng thông.
                </p>
              </button>
            </div>
          </div>

          {/* Options & Start Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDuplicate}
                onChange={(e) => setSkipDuplicate(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center space-x-1">
                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Bỏ qua nếu đã tải trước đó (Tránh trùng lặp)</span>
              </span>
            </label>

            <button
              onClick={handleStartDownload}
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang thêm vào hàng đợi...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Thêm vào Hàng Đợi Tải</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
