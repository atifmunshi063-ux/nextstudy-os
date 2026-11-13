import React, { useState, useMemo } from 'react';
import { PomodoroSession, PomodoroCategory, PomodoroQuality } from '../../types';
import { storageService } from '../../services/storage';
import { getLocalDateString } from '../../utils/date';
import { triggerConfetti } from '../../services/confetti';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  Clock,
  Plus,
  Search,
  Filter,
  Flame,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  X,
  Trash2,
} from 'lucide-react';

interface PomodoroTrackerViewProps {
  sessions: PomodoroSession[];
  onSessionsChange: () => void;
  onGoToTimer: () => void;
}

const CATEGORIES: ('All' | PomodoroCategory)[] = [
  'All',
  'DSA & LeetCode',
  'Semester 3 Core',
  'GATE CSE Theory',
  'Systems & Dev',
  'Aptitude & Placement',
  'Revision & Mock',
];

export const PomodoroTrackerView: React.FC<PomodoroTrackerViewProps> = ({
  sessions,
  onSessionsChange,
  onGoToTimer,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | PomodoroCategory>('All');
  const [selectedQuality, setSelectedQuality] = useState<'All' | PomodoroQuality>('All');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [deletingSession, setDeletingSession] = useState<{
    id: string;
    title: string;
    date?: string;
    minutes?: number;
  } | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  const executeDeleteSession = () => {
    if (!deletingSession) return;
    storageService.deletePomodoroSession(deletingSession.id, {
      date: deletingSession.date,
      taskGoal: deletingSession.title,
      minutes: deletingSession.minutes,
    });
    onSessionsChange();
    setDeletingSession(null);
  };

  const executeClearAll = () => {
    storageService.clearAllPomodoroSessions();
    onSessionsChange();
    setIsClearAllOpen(false);
  };

  // Manual entry modal form state
  const [taskGoal, setTaskGoal] = useState('');
  const [category, setCategory] = useState<PomodoroCategory>('DSA & LeetCode');
  const [minutes, setMinutes] = useState(25);
  const [interruptions, setInterruptions] = useState(0);
  const [quality, setQuality] = useState<PomodoroQuality>('High Flow');
  const [notes, setNotes] = useState('');

  // Overall Statistics
  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const totalPomodoros = sessions.reduce((acc, s) => acc + s.completedPomodoros, 0);
    const highFlowCount = sessions.filter((s) => s.quality === 'High Flow').length;
    const highFlowPct = sessions.length > 0 ? Math.round((highFlowCount / sessions.length) * 100) : 100;
    const totalDistractions = sessions.reduce((acc, s) => acc + (s.interruptions || 0), 0);

    const todayStr = getLocalDateString();
    const todaySessions = sessions.filter((s) => s.date === todayStr);
    const todayMinutes = todaySessions.reduce((acc, s) => acc + s.minutes, 0);

    return {
      totalHours,
      totalPomodoros,
      highFlowPct,
      totalDistractions,
      todayMinutes,
      totalSessions: sessions.length,
    };
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedCategory !== 'All' && s.category !== selectedCategory) return false;
      if (selectedQuality !== 'All' && s.quality !== selectedQuality) return false;
      if (
        search.trim() &&
        !s.taskGoal.toLowerCase().includes(search.toLowerCase()) &&
        !s.notes.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [sessions, selectedCategory, selectedQuality, search]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskGoal.trim()) return;

    const today = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentHour = today.getHours();

    let timeOfDay: PomodoroSession['timeOfDay'] = 'Morning 🌅';
    if (currentHour >= 12 && currentHour < 17) timeOfDay = 'Afternoon ☀️';
    else if (currentHour >= 17 && currentHour < 22) timeOfDay = 'Evening 🌆';
    else if (currentHour >= 22 || currentHour < 5) timeOfDay = 'Late Night 🌙';

    const pomodorosCount = Math.max(1, Math.round(minutes / 25));

    storageService.logPomodoro({
      date: getLocalDateString(),
      dayOfWeek: daysOfWeek[today.getDay()],
      timeOfDay,
      category,
      taskGoal: taskGoal.trim(),
      completedPomodoros: pomodorosCount,
      minutes,
      hours: Math.round((minutes / 60) * 100) / 100,
      interruptions,
      quality,
      notes: notes.trim(),
      isPractice: true,
    });

    onSessionsChange();
    triggerConfetti();
    setTaskGoal('');
    setNotes('');
    setIsManualModalOpen(false);
  };

  return (
    <div className="space-y-4 font-mono text-slate-200">
      {/* 1. Header & Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg">
          <div className="text-[10px] text-slate-400 font-bold uppercase">TOTAL DEEP WORK</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-400">{stats.totalHours}</span>
            <span className="text-xs text-slate-400 font-bold">HRS</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{stats.totalPomodoros} Pomodoro Sprints</div>
        </div>

        <div className="p-3 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg">
          <div className="text-[10px] text-cyan-400 font-bold uppercase">FLOW RETENTION</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-cyan-400">{stats.highFlowPct}%</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">High Flow Sprint Rate</div>
        </div>

        <div className="p-3 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg">
          <div className="text-[10px] text-amber-400 font-bold uppercase">TODAY DEEP WORK</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-white">{stats.todayMinutes}</span>
            <span className="text-xs text-slate-400 font-bold">MINS</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            ~{Math.round((stats.todayMinutes / 60) * 10) / 10} hrs logged
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg">
          <div className="text-[10px] text-rose-400 font-bold uppercase">INTERRUPTIONS</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-rose-400">{stats.totalDistractions}</span>
            <span className="text-xs text-slate-400 font-bold">DIST</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total registered trips</div>
        </div>
      </div>

      {/* 2. Actions & Filters Bar */}
      <div className="p-3.5 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={onGoToTimer}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>⏱ Start Focus Timer</span>
            </button>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Log Past Session</span>
            </button>

            {sessions.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 text-xs font-semibold text-rose-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Clear all recorded Pomodoro sessions"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>

          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search goals or doubts (Col M)..."
              className="w-full px-3 py-1.5 pl-8 rounded bg-[#040806] border border-[#132418] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {CATEGORIES.map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded whitespace-nowrap border transition-all cursor-pointer text-[11px] ${
                  isSel
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500 font-bold'
                    : 'bg-[#040806] border-[#132418] text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Pomodoro Tracker Table (Google Sheets Pomodoro_Tracker format) */}
      <div className="rounded-xl border border-[#16291C] bg-[#080E0B] overflow-hidden shadow-xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-[#050907] border-b border-[#132418] text-[10px] text-slate-400 font-bold uppercase">
                <th className="p-3">Date & Time</th>
                <th className="p-3">Category</th>
                <th className="p-3">Task Goal</th>
                <th className="p-3 text-center">Duration</th>
                <th className="p-3 text-center">Distractions</th>
                <th className="p-3 text-center">Flow Quality</th>
                <th className="p-3 min-w-[200px]">Doubt Box & Key Takeaways (Col M)</th>
                <th className="p-3 text-center w-10">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101e14]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                    No Pomodoro sessions found. Start a sprint or log a session!
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={`${s.id || 'pomo'}-${idx}`} className="hover:bg-[#0b140e] transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-white">{s.date}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{s.dayOfWeek}</span>
                        <span>•</span>
                        <span>{s.timeOfDay}</span>
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                        {s.category}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-white max-w-xs truncate" title={s.taskGoal}>
                        {s.taskGoal}
                      </div>
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="font-bold text-emerald-400">{s.minutes}m</span>
                      <span className="text-[10px] text-slate-500 block">
                        {s.completedPomodoros} sprint{s.completedPomodoros > 1 ? 's' : ''}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`font-bold ${
                          s.interruptions === 0
                            ? 'text-emerald-400'
                            : s.interruptions <= 2
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {s.interruptions}
                      </span>
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${
                          s.quality === 'High Flow'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                            : s.quality === 'Solid'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                            : 'bg-rose-950 text-rose-300 border-rose-500'
                        }`}
                      >
                        {s.quality}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="text-[11px] text-slate-300 max-w-sm font-mono truncate" title={s.notes}>
                        {s.notes || <span className="text-slate-600 italic">None logged</span>}
                      </div>
                    </td>

                    {/* Delete Action */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDeletingSession({
                            id: s.id,
                            title: s.taskGoal || s.category,
                            date: s.date,
                            minutes: s.minutes,
                          })
                        }
                        title="Delete focus session"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Session Logger Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#080E0B] border border-emerald-500/80 p-5 text-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Log Focus Session
                </h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
                  Task Goal *
                </label>
                <input
                  type="text"
                  required
                  value={taskGoal}
                  onChange={(e) => setTaskGoal(e.target.value)}
                  placeholder="e.g. Peterson Algorithm proof & C implementation"
                  className="w-full px-3 py-2 rounded bg-[#040806] border border-[#132418] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded bg-[#040806] border border-[#132418] text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded bg-[#040806] border border-[#132418] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
                    Distractions
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={interruptions}
                    onChange={(e) => setInterruptions(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded bg-[#040806] border border-[#132418] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
                    Flow Quality
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded bg-[#040806] border border-[#132418] text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="High Flow">High Flow (0 dist)</option>
                    <option value="Solid">Solid (1-2 dist)</option>
                    <option value="Distracted">Distracted (3+ dist)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
                  Doubt Box & Key Takeaways (Column M)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What doubts or key algorithmic takeaways did you encounter to study later?"
                  className="w-full p-2.5 rounded bg-[#040806] border border-[#132418] text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#132418]">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg transition-all active:scale-95"
                >
                  Save to Pomodoro Tracker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Focus Session Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingSession}
        title="Delete Focus Session"
        message="Are you sure you want to remove this logged Pomodoro sprint from your study audit?"
        itemName={deletingSession?.title}
        confirmText="Yes, Delete Session"
        onConfirm={executeDeleteSession}
        onClose={() => setDeletingSession(null)}
      />

      {/* Clear All Sessions Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isClearAllOpen}
        title="Clear All Pomodoro Sessions"
        message="Are you sure you want to delete all recorded Pomodoro sprint logs from your audit history? This action will reset your focus log."
        confirmText="Yes, Clear All Logs"
        onConfirm={executeClearAll}
        onClose={() => setIsClearAllOpen(false)}
      />
    </div>
  );
};
