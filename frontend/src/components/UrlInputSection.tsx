import React, { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '../api/client';
import { DetectResponse, MediaMetadata } from '../types/api';
import { getStatusBadge } from '../utils/format';
import { Link2, Search, Loader2, X, Clipboard, AlertCircle, Info } from 'lucide-react';

interface UrlInputSectionProps {
  onMetadataReady: (meta: MediaMetadata) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
}

export const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  onMetadataReady,
  isAnalyzing,
  setIsAnalyzing,
}) => {
  const [url, setUrl] = useState('');
  const [detectInfo, setDetectInfo] = useState<DetectResponse | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<{ message: string; hint_vi?: string } | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setError(null);
    if (!url.trim() || !url.startsWith('http')) {
      setDetectInfo(null);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setDetecting(true);
      try {
        const res = await api.detectUrl(url.trim());
        setDetectInfo(res);
      } catch {
        setDetectInfo(null);
      } finally {
        setDetecting(false);
      }
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // clipboard access denied
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || isAnalyzing) return;

    setError(null);
    setIsAnalyzing(true);

    try {
      const meta = await api.analyzeUrl(url.trim());
      onMetadataReady(meta);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError({
          message: err.message,
          hint_vi: err.hintVi,
        });
      } else {
        setError({
          message: err.message || 'Không thể phân tích đường dẫn này.',
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusBadge = detectInfo?.status ? getStatusBadge(detectInfo.status) : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
      <form onSubmit={handleAnalyze} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Dán đường dẫn Video hoặc Tệp đa phương tiện
        </label>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3.5 sm:left-4 text-slate-400 pointer-events-none">
              <Link2 className="w-5 h-5" />
            </div>

            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Dán link YouTube, TikTok, Facebook, Movy, Douyin..."
              className="w-full pl-11 pr-14 py-3 sm:py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm font-normal"
              required
            />

            {/* Quick Paste or Clear Button */}
            <div className="absolute right-2.5 flex items-center space-x-1">
              {url ? (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                  title="Xóa nội dung"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-200/60 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                  title="Dán từ Clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Dán</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!url.trim() || isAnalyzing}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 sm:py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition shadow-md shadow-indigo-600/20 flex-shrink-0"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang quét...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Phân tích</span>
              </>
            )}
          </button>
        </div>

        {/* Live Detection Info Banner */}
        {detecting && (
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span>Đang nhận diện nền tảng...</span>
          </div>
        )}

        {detectInfo && !detecting && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            {detectInfo.platform_display_name ? (
              <span className="font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {detectInfo.platform_display_name}
              </span>
            ) : (
              <span className="font-medium px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                Nền tảng chung
              </span>
            )}

            {statusBadge && (
              <span className={`px-2 py-0.5 rounded-md font-medium border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.textCol}`}>
                {statusBadge.text}
              </span>
            )}

            {detectInfo.message_vi && (
              <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>{detectInfo.message_vi}</span>
              </span>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm space-y-1">
            <div className="flex items-center space-x-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{error.message}</span>
            </div>
            {error.hint_vi && (
              <p className="text-xs text-rose-600 dark:text-rose-400 pl-6">
                💡 Gợi ý: {error.hint_vi}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
