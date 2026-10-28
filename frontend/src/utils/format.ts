import { SupportStatus, TaskState } from '../types/api';

export function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatSpeed(bps?: number | null): string {
  if (bps === null || bps === undefined || isNaN(bps) || bps <= 0) return '—';
  return `${formatBytes(bps)}/s`;
}

export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '—';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remainingS = s % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${remainingS.toString().padStart(2, '0')}`;
  }
  return `${m}:${remainingS.toString().padStart(2, '0')}`;
}

export function formatDate(isoStr?: string): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export function getStatusBadge(status?: SupportStatus | null): { text: string; bg: string; border: string; textCol: string } {
  switch (status) {
    case 'supported':
      return { text: 'Hỗ trợ tốt', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', textCol: 'text-emerald-700 dark:text-emerald-400' };
    case 'limited':
      return { text: 'Hỗ trợ hạn chế', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', textCol: 'text-amber-700 dark:text-amber-400' };
    case 'needs-authentication':
      return { text: 'Cần cookie / Đăng nhập', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800', textCol: 'text-orange-700 dark:text-orange-400' };
    case 'official-only':
      return { text: 'Chỉ chính thức (DRM)', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', textCol: 'text-purple-700 dark:text-purple-400' };
    case 'unsupported':
    default:
      return { text: 'Chưa hỗ trợ', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', textCol: 'text-rose-700 dark:text-rose-400' };
  }
}

export function getTaskStateBadge(state: TaskState): { label: string; badgeClass: string } {
  switch (state) {
    case 'downloading':
      return { label: 'Đang tải', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 animate-pulse' };
    case 'processing':
      return { label: 'Đang xử lý ghép file', badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 animate-pulse' };
    case 'analyzing':
      return { label: 'Đang phân tích', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' };
    case 'completed':
      return { label: 'Hoàn thành', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' };
    case 'failed':
      return { label: 'Thất bại', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' };
    case 'cancelled':
      return { label: 'Đã hủy', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    case 'paused':
      return { label: 'Tạm dừng', badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300' };
    case 'queued':
      return { label: 'Đang chờ hàng đợi', badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300' };
    case 'pending':
    default:
      return { label: 'Đang chuẩn bị', badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  }
}
