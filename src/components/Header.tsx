import React, { useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { Search, RefreshCw, Database, Lock, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { SyncSettings } from '../types';
import { storageService } from '../services/storage';

interface HeaderProps {
  activeTab: number;
  onTabChange: (index: number) => void;
  onOpenSync: () => void;
  onOpenSearch: () => void;
  syncSettings: SyncSettings;
  pendingSyncCount: number;
  onDataRefreshed?: () => void;
}

const NAV_ITEMS = ['1. Dashboard', '2. Pomodoro', '3. Habit Tracker', '4. Study Tracker'];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenSync,
  onOpenSearch,
  syncSettings,
  pendingSyncCount,
  onDataRefreshed,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (isPulling) return;
    setIsPulling(true);
    setLastSyncResult(null);
    try {
      await storageService.syncPendingMutations();
      const res = await storageService.pullFromGoogleSheets();
      if (onDataRefreshed) {
        onDataRefreshed();
      }
      setLastSyncResult(res.success ? 'SYNCED' : 'ERR');
      setTimeout(() => setLastSyncResult(null), 3000);
    } catch {
      setLastSyncResult('OFFLINE');
      setTimeout(() => setLastSyncResult(null), 3000);
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#060A08]/95 backdrop-blur-md border-b border-[#172a1e]">
      {/* Primary Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 h-14">
        {/* Brand & Student Profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded border border-emerald-500/80 bg-emerald-950/40 flex items-center justify-center font-mono font-bold text-emerald-400 text-xs shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            MA
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-extrabold tracking-tight text-white font-mono">
                NextStudy OS
              </span>
            </div>
            <div className="text-[10px] text-emerald-400/90 font-mono tracking-tight">
              Munshi MD Atif • B.Tech CSE (BWU)
            </div>
          </div>
        </div>

        {/* Desktop Nav Pills */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-mono">
          {NAV_ITEMS.map((label, idx) => (
            <button
              key={label}
              onClick={() => onTabChange(idx)}
              className={`px-3 py-1.5 rounded border transition-all cursor-pointer ${
                activeTab === idx
                  ? 'bg-emerald-500 text-black font-bold border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0B130E] text-slate-400 hover:text-emerald-300 border-[#172a1e]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#1e3827] bg-[#0c1610] text-xs font-mono text-emerald-400 hover:border-emerald-500 transition-all cursor-pointer"
            title="Search (Cmd+K)"
          >
            <span>SEARCH</span>
            <span className="px-1 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-300">
              ⌘K
            </span>
          </button>

          <button
            onClick={handleManualSync}
            disabled={isPulling}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#1e3827] bg-[#0c1610] text-xs font-mono text-slate-300 hover:border-emerald-500 transition-all cursor-pointer"
            title="Sync with Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isPulling ? 'animate-spin' : ''}`} />
            <span className="text-[11px] text-emerald-400">
              {isPulling ? 'SYNCING...' : lastSyncResult || 'SYNC'}
            </span>
          </button>

          <button
            onClick={onOpenSync}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded border border-[#1e3827] bg-[#0c1610] text-xs font-mono text-slate-300 hover:border-emerald-500"
            title="Google Sheets Settings"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            {pendingSyncCount > 0 && (
              <span className="px-1 text-[10px] bg-amber-950 text-amber-300 border border-amber-800 rounded">
                {pendingSyncCount}
              </span>
            )}
          </button>

          <PWAInstallButton />
        </div>
      </div>

      {/* Subheader Status Strip */}
      <div className="px-3 sm:px-6 py-1 bg-[#040705] border-t border-[#122016] flex items-center justify-between text-[10px] font-mono text-slate-400 overflow-x-auto no-scrollbar gap-4">
        <div className="flex items-center gap-1.5 shrink-0">
          <Database className="w-3 h-3 text-emerald-400" />
          <span>
            <strong className="text-emerald-400">Offline Storage:</strong> Active (IndexedDB)
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-cyan-400">
            <Lock className="w-3 h-3" />
            <span>IST Timezone Protected</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Google Sheets Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
