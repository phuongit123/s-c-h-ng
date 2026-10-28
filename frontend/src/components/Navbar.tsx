import React from 'react';
import { HealthResponse } from '../types/api';
import { formatBytes } from '../utils/format';
import {
  Download,
  FolderOpen,
  Settings,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
} from 'lucide-react';

interface NavbarProps {
  health: HealthResponse | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onRevealFolder: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  onRevealFolder,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 flex-shrink-0">
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent truncate">
                <span className="sm:hidden">UMD Media</span>
                <span className="hidden sm:inline">Universal Media Downloader</span>
              </span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-medium flex-shrink-0">
                v{health?.version || '0.1.0'}
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
              FastAPI + yt-dlp + SSE Realtime Engine
            </p>
          </div>
        </div>

        {/* Center / System Health Metrics */}
        <div className="hidden lg:flex items-center space-x-3 text-xs">
          {/* Backend Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Backend Online</span>
          </div>

          {/* FFmpeg */}
          <div
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full font-medium ${
              health?.ffmpeg_available
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}
            title={health?.ffmpeg_available ? 'FFmpeg đã sẵn sàng để xử lý ghép âm thanh và video' : 'FFmpeg chưa được cài đặt'}
          >
            {health?.ffmpeg_available ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>FFmpeg: {health?.ffmpeg_available ? 'Sẵn sàng' : 'Chưa cài'}</span>
          </div>

          {/* yt-dlp Engine */}
          {health?.yt_dlp_version && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>yt-dlp: {health.yt_dlp_version}</span>
            </div>
          )}

          {/* Disk space */}
          {health?.free_disk_bytes !== undefined && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Trống: {formatBytes(health.free_disk_bytes)}</span>
            </div>
          )}
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {/* Reveal Download Folder (Desktop only) */}
          <button
            onClick={onRevealFolder}
            className="hidden md:inline-flex p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Mở thư mục tải về trong Explorer"
          >
            <FolderOpen className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Cài đặt hệ thống"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
