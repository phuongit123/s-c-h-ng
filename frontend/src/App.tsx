import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import { HealthResponse, PlatformInfo, MediaMetadata, TaskOut, QueueStats, HistoryEntry } from './types/api';
import { Navbar } from './components/Navbar';
import { UrlInputSection } from './components/UrlInputSection';
import { MediaPreviewCard } from './components/MediaPreviewCard';
import { TasksQueue } from './components/TasksQueue';
import { HistoryList } from './components/HistoryList';
import { PlatformsCatalog } from './components/PlatformsCatalog';
import { SettingsModal } from './components/SettingsModal';
import { Download, Layers, History as HistoryIcon, Globe, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentMeta, setCurrentMeta] = useState<MediaMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [activeTab, setActiveTab] = useState<'download' | 'queue' | 'history' | 'platforms'>('download');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('umd_theme') === 'dark' ||
      (!('umd_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('umd_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('umd_theme', 'light');
    }
  }, [darkMode]);

  const fetchHealth = useCallback(async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch (e) {
      console.error('Lỗi lấy health:', e);
    }
  }, []);

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await api.getPlatforms();
      setPlatforms(res.platforms);
    } catch (e) {
      console.error('Lỗi lấy platforms:', e);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.getTasks();
      setTasks(res.tasks);
      setStats(res.stats);
    } catch (e) {
      console.error('Lỗi lấy tasks:', e);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.getHistory();
      setHistory(res.history);
    } catch (e) {
      console.error('Lỗi lấy history:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHealth();
    fetchPlatforms();
    fetchTasks();
    fetchHistory();
  }, [fetchHealth, fetchPlatforms, fetchTasks, fetchHistory]);

  // SSE Realtime subscription + Fallback Polling
  useEffect(() => {
    const unsubscribe = api.subscribeEvents((event) => {
      // Refresh tasks when any SSE event arrives
      if (event && (event.event === 'progress' || event.event === 'state_change' || event.task_id)) {
        fetchTasks();
        fetchHistory();
      }
    });

    // Background interval to refresh tasks every 4 seconds
    const interval = setInterval(() => {
      fetchTasks();
      if (activeTab === 'history') {
        fetchHistory();
      }
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchTasks, fetchHistory, activeTab]);

  const handleRevealDownloadDir = async () => {
    if (health?.download_dir) {
      try {
        await api.revealInFolder(health.download_dir);
      } catch (err: any) {
        alert(`Không thể mở thư mục: ${err.message}`);
      }
    }
  };

  const handleTaskCreated = (_taskId: string) => {
    setCurrentMeta(null);
    fetchTasks();
    setActiveTab('queue');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar
        health={health}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRevealFolder={handleRevealDownloadDir}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('download')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'download'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Tải xuống</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition relative ${
                activeTab === 'queue'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Hàng đợi</span>
              {stats && stats.active > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-2 right-2" />
              )}
              {stats && stats.active > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono">
                  {stats.active}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                fetchHistory();
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HistoryIcon className="w-4 h-4" />
              <span>Lịch sử ({history.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('platforms')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'platforms'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Nền tảng ({platforms.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Tải tốc độ cao đa luồng</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'download' && (
          <div className="space-y-6">
            <UrlInputSection
              onMetadataReady={(meta) => setCurrentMeta(meta)}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
            />

            {currentMeta && (
              <MediaPreviewCard
                metadata={currentMeta}
                onTaskCreated={handleTaskCreated}
                onClose={() => setCurrentMeta(null)}
              />
            )}

            {/* Quick Mini Queue Status */}
            {tasks.length > 0 && (
              <div className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Tác vụ đang chạy gần đây
                  </h3>
                  <button
                    onClick={() => setActiveTab('queue')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Xem tất cả ({tasks.length}) →
                  </button>
                </div>
                <TasksQueue
                  tasks={tasks.slice(0, 3)}
                  stats={stats}
                  onRefresh={fetchTasks}
                  onRevealFolder={api.revealInFolder}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <TasksQueue
            tasks={tasks}
            stats={stats}
            onRefresh={fetchTasks}
            onRevealFolder={api.revealInFolder}
          />
        )}

        {activeTab === 'history' && (
          <HistoryList history={history} onRefresh={fetchHistory} />
        )}

        {activeTab === 'platforms' && (
          <PlatformsCatalog platforms={platforms} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Universal Media Downloader — FastAPI + yt-dlp + React + Vite</span>
          <span>Cục bộ 100% offline an toàn • Không gửi dữ liệu ra ngoài</span>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        health={health}
        onRefreshHealth={fetchHealth}
      />
    </div>
  );
};
export default App;
