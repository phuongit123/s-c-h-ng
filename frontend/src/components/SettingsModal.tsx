import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { HealthResponse } from '../types/api';
import { formatBytes } from '../utils/format';
import {
  X,
  FolderOpen,
  Check,
  AlertCircle,
  HardDrive,
  Cpu,
  Layers,
  Save,
  Loader2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthResponse | null;
  onRefreshHealth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  health,
  onRefreshHealth,
}) => {
  const [downloadDir, setDownloadDir] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.getDownloadDir();
      setDownloadDir(res.download_dir);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể lấy cấu hình.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadDir.trim() || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await api.setDownloadDir(downloadDir.trim());
      setDownloadDir(res.download_dir);
      setMessage({ type: 'success', text: 'Đã cập nhật thư mục tải về thành công!' });
      onRefreshHealth();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể lưu đường dẫn.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReveal = async () => {
    try {
      await api.revealInFolder(downloadDir);
    } catch (err: any) {
      alert(`Lỗi mở thư mục: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>⚙️ Cài Đặt Hệ Thống</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Download Directory Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Thư mục lưu trữ tệp tải về
            </label>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={downloadDir}
                onChange={(e) => setDownloadDir(e.target.value)}
                disabled={loading}
                placeholder="C:\Users\...\Downloads\UniversalMediaDownloader"
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                type="button"
                onClick={handleReveal}
                className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition"
                title="Mở trong File Explorer"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Hệ thống tự động bảo vệ chống path traversal.
              </span>

              <button
                type="submit"
                disabled={saving || loading}
                className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* System Hardware Diagnostics */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Thông số môi trường hoạt động
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Dung lượng ổ đĩa</span>
                </span>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {formatBytes(health?.free_disk_bytes)} còn trống
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>yt-dlp Engine</span>
                </span>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
                  {health?.yt_dlp_version || 'Chưa cài đặt'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Hỗ trợ FFmpeg</span>
                </span>
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {health?.ffmpeg_available ? '✅ Đã kích hoạt' : '⚠️ Chưa cài đặt'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Cổng API cục bộ</span>
                </span>
                <p className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                  127.0.0.1:8756
                </p>
              </div>
            </div>

            {health?.warnings && health.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                <p className="font-semibold flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Cảnh báo từ hệ thống:</span>
                </p>
                <ul className="list-disc list-inside text-[11px] space-y-0.5">
                  {health.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
