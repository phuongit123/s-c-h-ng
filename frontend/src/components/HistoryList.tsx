import React from 'react';
import { HistoryEntry } from '../types/api';
import { formatBytes, formatDate } from '../utils/format';
import { api } from '../api/client';
import {
  FolderOpen,
  Trash2,
  History,
  FileCheck2,
  FileX,
  ExternalLink,
  Download,
} from 'lucide-react';

interface HistoryListProps {
  history: HistoryEntry[];
  onRefresh: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onRefresh }) => {
  const handleReveal = async (filePath: string) => {
    try {
      await api.revealInFolder(filePath);
    } catch (err: any) {
      alert(`Không thể mở thư mục: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa mục này khỏi lịch sử tải? (File gốc trên máy tính sẽ không bị xóa)')) {
      return;
    }
    try {
      await api.deleteHistory(id);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi xóa lịch sử: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {history.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
          <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Chưa có lịch sử tải xuống nào
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Các tệp sau khi tải hoàn tất sẽ được tự động lưu lại ở đây.
          </p>
        </div>
      ) : (
        history.map((item) => (
          <div
            key={item.id}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {item.platform_key}
                </span>

                {item.file_exists ? (
                  <span className="flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Tệp còn trên đĩa</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-xs text-slate-400 font-medium">
                    <FileX className="w-3.5 h-3.5" />
                    <span>Đã di chuyển hoặc xóa</span>
                  </span>
                )}
              </div>

              <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                {item.title}
              </h4>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Dung lượng: {formatBytes(item.file_size_on_disk || item.file_size)}</span>
                <span>•</span>
                <span>Hoàn tất: {formatDate(item.completed_at)}</span>
              </div>

              <p className="text-xs text-slate-400 truncate max-w-lg font-sans">
                {item.file_path}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Mở liên kết gốc"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {item.file_exists && (
                <a
                  href={`/api/tasks/${item.id}/download`}
                  download
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition"
                  title="Tải file về máy"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải về</span>
                </a>
              )}

              <button
                onClick={() => handleReveal(item.file_path)}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition"
                title="Mở thư mục chứa tệp trong Explorer (Desktop)"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Mở thư mục</span>
              </button>

              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Xóa khỏi lịch sử"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
