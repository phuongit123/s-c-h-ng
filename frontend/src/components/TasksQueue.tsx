import React from 'react';
import { TaskOut, QueueStats } from '../types/api';
import { formatBytes, formatSpeed, formatDuration, getTaskStateBadge } from '../utils/format';
import { api } from '../api/client';
import {
  Pause,
  Play,
  RotateCcw,
  Trash2,
  XCircle,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Download,
} from 'lucide-react';

interface TasksQueueProps {
  tasks: TaskOut[];
  stats: QueueStats | null;
  onRefresh: () => void;
  onRevealFolder?: (filePath: string) => void;
}

export const TasksQueue: React.FC<TasksQueueProps> = ({
  tasks,
  stats,
  onRefresh,
  onRevealFolder,
}) => {
  const handlePause = async (id: string) => {
    try {
      await api.pauseTask(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.resumeTask(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.cancelTask(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await api.retryTask(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTask(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Đang chạy (Active)</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {stats?.active ?? 0}
              <span className="text-xs font-normal text-slate-400"> / {stats?.max_concurrent ?? 2}</span>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Đang chờ (Pending)</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {stats?.pending ?? 0}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Hoàn thành</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {stats?.completed ?? 0}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Thất bại / Hủy</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {(stats?.failed ?? 0) + (stats?.cancelled ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
            <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              Hàng đợi tải hiện đang trống
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Dán URL ở thanh trên để thêm video mới vào hàng đợi.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const { label, badgeClass } = getTaskStateBadge(task.state);
            const isDownloading = task.state === 'downloading' || task.state === 'processing';
            const isPaused = task.state === 'paused';
            const isFailed = task.state === 'failed';
            const isCompleted = task.state === 'completed';

            return (
              <div
                key={task.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${badgeClass}`}>
                        {label}
                      </span>
                      <span className="text-xs text-slate-400 uppercase font-mono">
                        {task.platform_key}
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate mt-1">
                      {task.title || task.url}
                    </h4>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {isDownloading && (
                      <button
                        onClick={() => handlePause(task.id)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Tạm dừng"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}

                    {isPaused && (
                      <button
                        onClick={() => handleResume(task.id)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Tiếp tục tải"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}

                    {isDownloading && (
                      <button
                        onClick={() => handleCancel(task.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Hủy tác vụ"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    {isFailed && (
                      <button
                        onClick={() => handleRetry(task.id)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Thử lại"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    {isCompleted && task.file_path && (
                      <a
                        href={`/api/tasks/${task.id}/download`}
                        download
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition"
                        title="Tải file về máy"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}

                    {isCompleted && task.file_path && onRevealFolder && (
                      <button
                        onClick={() => onRevealFolder(task.file_path!)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Mở thư mục chứa file (Desktop)"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                      title="Xóa khỏi danh sách"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-mono">
                    <span>
                      {formatBytes(task.progress.downloaded_bytes)}
                      {task.progress.total_bytes ? ` / ${formatBytes(task.progress.total_bytes)}` : ''}
                    </span>

                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {task.progress.percent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isFailed
                          ? 'bg-rose-500'
                          : isPaused
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, task.progress.percent))}%` }}
                    />
                  </div>
                </div>

                {/* Sub details: Speed & ETA */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <div className="flex items-center space-x-3">
                    {task.progress.speed_bps !== null && task.progress.speed_bps !== undefined && (
                      <span>Tốc độ: {formatSpeed(task.progress.speed_bps)}</span>
                    )}

                    {task.progress.eta_seconds !== null && task.progress.eta_seconds !== undefined && (
                      <span>Còn lại: {formatDuration(task.progress.eta_seconds)}</span>
                    )}

                    {task.progress.status_text && (
                      <span className="text-slate-400 font-sans italic">{task.progress.status_text}</span>
                    )}
                  </div>

                  {task.file_path && (
                    <span className="truncate max-w-xs font-sans text-xs text-slate-400">
                      📁 {task.file_path}
                    </span>
                  )}
                </div>

                {/* Error message */}
                {task.error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs space-y-0.5">
                    <p className="font-semibold">{task.error.message || 'Lỗi không xác định'}</p>
                    {task.error.hint_vi && <p className="text-rose-500">💡 {task.error.hint_vi}</p>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
