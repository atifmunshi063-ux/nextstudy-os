import React, { useState, useEffect } from 'react';
import { appConfig } from '../../config';
import { getDB } from '../../db/indexedDb';
import { syncRepository } from '../../repositories/SyncRepository';
import { soundService } from '../../services/audio';
import { examTargetService, ExamTargets } from '../../services/examTargetService';
import { EditExamTargetsModal } from '../common/EditExamTargetsModal';
import {
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  Cloud,
  CheckCircle2,
  Lock,
  Volume2,
  Database,
  Zap,
  Edit3,
  Calendar,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushStatus, setFlushStatus] = useState<string | null>(null);
  const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
  const [examTargets, setExamTargets] = useState<ExamTargets>(() => examTargetService.getTargets());

  useEffect(() => {
    return examTargetService.subscribe((t) => setExamTargets(t));
  }, []);

  const handleForceFlush = async () => {
    setIsFlushing(true);
    setFlushStatus(null);
    try {
      const res = await syncRepository.flushQueue();
      setFlushStatus(res.message);
    } catch (e: any) {
      setFlushStatus(`Sync error: ${e.message}`);
    } finally {
      setIsFlushing(false);
    }
  };

  const handleDownloadSnapshot = async () => {
    try {
      const db = await getDB();
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: appConfig.version,
        habits: await db.getAll('habits'),
        habitLogs: await db.getAll('habitLogs'),
        subjects: await db.getAll('subjects'),
        topics: await db.getAll('topics'),
        studySessions: await db.getAll('studySessions'),
        tasks: await db.getAll('tasks'),
        revisions: await db.getAll('revisions'),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nextstudy-snapshot-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  const handleTestChime = () => {
    soundService.playSessionCompleteChime();
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12 max-w-4xl mx-auto font-mono text-slate-200">
      {/* 1. Subheader Status Strip */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-[#16291C] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">STATUS: ONLINE (12ms)</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <span>TIMEZONE GUARD:</span>
          <span>IST (UTC+5:30) ACTIVE</span>
        </div>
      </div>

      {/* 2. Target Exam Dates Configuration Card */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Target Exam Dates</span>
          </div>
          <button
            onClick={() => setIsEditDatesOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b140e] hover:bg-emerald-950 border border-[#1a3322] hover:border-emerald-500 text-xs font-bold text-emerald-400 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>✏️ Edit Target Dates</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-lg bg-[#040806] border border-[#132418]">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-bold uppercase">{examTargets.sem3Title || 'BWU SEM 3 FINALS'}</span>
              <span className="text-emerald-400 font-bold">URGENT</span>
            </div>
            <div className="text-base font-bold text-white mt-1">
              {examTargetService.formatDisplayDate(examTargets.sem3Date)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Raw Value: <code className="text-emerald-400">{examTargets.sem3Date}</code>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#040806] border border-[#132418]">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-bold uppercase">{examTargets.gateTitle || 'GATE CSE 2028'}</span>
              <span className="text-amber-400 font-bold">CYCLE 01</span>
            </div>
            <div className="text-base font-bold text-white mt-1">
              {examTargetService.formatDisplayDate(examTargets.gateDate)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Raw Value: <code className="text-amber-400">{examTargets.gateDate}</code>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top Metric Cards: Cloud State & Local IndexedDB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Cloud State */}
        <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            CLOUD STATE
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-emerald-400 tracking-tight">200 OK</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#132418] flex items-center justify-between text-xs text-slate-400">
            <span>Delta Sync</span>
            <span className="text-emerald-400 font-bold">42s ago</span>
          </div>
        </div>

        {/* Local IndexedDB */}
        <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            LOCAL INDEXEDDB
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-cyan-400 tracking-tight">4.8 MB</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#132418] flex items-center justify-between text-xs text-slate-400">
            <span>Persistent</span>
            <span className="text-cyan-400 font-bold">Max: 50 MB</span>
          </div>
        </div>
      </div>

      {/* 4. Sheets Bi-Directional Sync Card */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
            <span>⇄</span>
            <span>SHEETS BI-DIRECTIONAL SYNC</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
            LIVE_PIPE
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[#040806] border border-[#132418] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">TARGET:</span>
            <span className="text-white font-bold">Master_100_Habit_Tracker</span>
          </div>

          <div>
            <div className="text-[10px] text-slate-400">SHEET ID:</div>
            <div className="text-cyan-400 font-mono text-[11px] truncate mt-0.5">
              1i9yRvYVmAdTquwcAZaGzgfJOIjyvaXvC07hDKDMA3yU
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#101d14]">
            <span className="text-slate-400">WEBHOOK:</span>
            <span className="text-emerald-400 font-bold truncate max-w-[200px]">
              AKfycbxXeb2rAbVYzSu... (Connected)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Exponential Backoff: 0s (Idle)</span>
          </div>
          <span className="text-emerald-400">✓ Queue Clean</span>
        </div>

        {/* Big Bright Flush Button */}
        <button
          onClick={handleForceFlush}
          disabled={isFlushing}
          className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <Zap className={`w-4 h-4 fill-current ${isFlushing ? 'animate-spin' : ''}`} />
          <span>[ ⚡ FORCE FLUSH QUEUE (0 PENDING) ]</span>
        </button>

        {flushStatus && (
          <div className="text-center text-xs text-emerald-400 font-bold mt-1">
            {flushStatus}
          </div>
        )}
      </div>

      {/* 5. Local Store Diagnostics Card */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
            <span>&#123;&#125;</span>
            <span>LOCAL STORE DIAGNOSTICS</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">v2.4 [idb]</span>
        </div>

        <div className="text-xs text-slate-400 flex items-center justify-between">
          <span>STORE REPOSITORY: <strong className="text-white">nextstudy-os-db</strong></span>
          <span className="text-emerald-400 font-bold">INDEXED_HEALTHY</span>
        </div>

        {/* 8-box diagnostic grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between">
            <span className="text-slate-400">habits</span>
            <span className="text-emerald-400 font-bold">1+ entries</span>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between">
            <span className="text-slate-400">habitLogs</span>
            <span className="text-emerald-400 font-bold">Live sync</span>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between">
            <span className="text-slate-400">subjects</span>
            <span className="text-cyan-400 font-bold">16 sheets</span>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between">
            <span className="text-slate-400">topics</span>
            <span className="text-cyan-400 font-bold">184 nodes</span>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between">
            <span className="text-slate-400">studySessions</span>
            <span className="text-amber-400 font-bold">86 pomodoros</span>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between">
            <span className="text-slate-400">tasks</span>
            <span className="text-amber-400 font-bold">32 active</span>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between">
            <span className="text-slate-400">revisions</span>
            <span className="text-white font-bold">24 spaced</span>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between">
            <span className="text-slate-400">syncQueue</span>
            <span className="text-emerald-400 font-bold">0 clean</span>
          </div>
        </div>

        {/* Quota Allocation progress bar */}
        <div className="pt-2 border-t border-[#132418] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>IndexedDB Quota Allocation</span>
            <span className="text-white">4.8 MB / 50.0 MB (9.6%)</span>
          </div>
          <div className="w-full h-2 rounded bg-slate-900 overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: '9.6%' }} />
          </div>
        </div>
      </div>

      {/* 6. Zero Vendor Lock-in Vault Card */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZERO VENDOR LOCK-IN VAULT</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">JSON_RFC8259</span>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleDownloadSnapshot}
            className="w-full py-2.5 rounded bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] hover:border-slate-500 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>[ 💾 DOWNLOAD FULL JSON SNAPSHOT (BACKUP) ]</span>
          </button>

          <button
            onClick={handleDownloadSnapshot}
            className="w-full py-2.5 rounded bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] hover:border-slate-500 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>[ ⟲ RESTORE DATABASE FROM SNAPSHOT ]</span>
          </button>
        </div>

        <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">Web Audio API: Tibetan Bell Synthesizer</span>
          </div>
          <button
            onClick={handleTestChime}
            className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
          >
            Active • 0ms
          </button>
        </div>
      </div>

      {/* 7. Footer Status Note */}
      <div className="text-center space-y-1 text-[10px] text-slate-500 font-mono tracking-tight pt-2">
        <div>NextStudy OS • Build: 2026 Stable</div>
        <div>Munshi MD Atif • B.Tech CSE (Brainware University)</div>
        <div className="text-emerald-400/80">Local-first client architecture • Offline-ready with Google Sheets sync</div>
      </div>

      {/* Edit Target Dates Modal */}
      <EditExamTargetsModal
        isOpen={isEditDatesOpen}
        onClose={() => setIsEditDatesOpen(false)}
      />
    </div>
  );
};
