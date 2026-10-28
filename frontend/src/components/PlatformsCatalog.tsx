import React from 'react';
import { PlatformInfo } from '../types/api';
import { getStatusBadge } from '../utils/format';
import { Globe, Music, ShieldAlert, Key } from 'lucide-react';

interface PlatformsCatalogProps {
  platforms: PlatformInfo[];
}

export const PlatformsCatalog: React.FC<PlatformsCatalogProps> = ({ platforms }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hệ thống hỗ trợ hơn 15+ nền tảng đa phương tiện phổ biến thông qua bộ chuyển đổi Adapter riêng biệt và engine yt-dlp.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((p) => {
          const badge = getStatusBadge(p.status);
          return (
            <div
              key={p.key}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {p.display_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {p.display_name}
                      </h4>
                      <span className="text-xs font-mono text-slate-400">key: {p.key}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${badge.bg} ${badge.border} ${badge.textCol}`}>
                    {badge.text}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                  {p.description_vi || 'Nền tảng chia sẻ video trực tuyến.'}
                </p>

                {p.conditions_vi && (
                  <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{p.conditions_vi}</span>
                  </div>
                )}
              </div>

              {/* Badges footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  {p.supports_audio_only && (
                    <span className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 font-medium" title="Hỗ trợ tải chỉ âm thanh">
                      <Music className="w-3 h-3" />
                      <span>Audio</span>
                    </span>
                  )}
                  {p.needs_authentication && (
                    <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-medium" title="Cần cookie đăng nhập">
                      <Key className="w-3 h-3" />
                      <span>Cookie</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-mono text-slate-400">
                  {p.max_resolution ? `Tối đa ${p.max_resolution}p` : 'Auto Max'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
