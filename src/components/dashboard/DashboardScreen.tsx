import React, { useState, useEffect, useMemo } from 'react';
import { Habit, PomodoroSession } from '../../types';
import { examTargetService, ExamTargets, ExamTargetItem } from '../../services/examTargetService';
import { EditExamTargetsModal } from '../common/EditExamTargetsModal';
import { getLocalDateString } from '../../utils/date';
import {
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Gauge,
  Sparkles,
  Zap,
  Target,
  Edit3,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

interface DashboardScreenProps {
  habits: Habit[];
  sessions: PomodoroSession[];
  onNavigateTab: (tabIndex: number) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  habits,
  sessions,
  onNavigateTab,
}) => {
  const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
  const [allTargetExams, setAllTargetExams] = useState<ExamTargetItem[]>(() =>
    examTargetService.getAllTargets()
  );
  const [, setTickerTick] = useState<number>(0);

  const today = useMemo(() => new Date(), []);
  const todayDayNumber = today.getDate(); // 1 to 31
  const todayStr = useMemo(() => getLocalDateString(), []);

  // Subscribe to dynamic exam target dates updates & 1s countdown ticker
  useEffect(() => {
    const handleUpdate = () => {
      setAllTargetExams(examTargetService.getAllTargets());
    };

    const unsubscribe = examTargetService.subscribe(handleUpdate);
    const interval = setInterval(() => {
      setTickerTick((t) => t + 1);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Today's Quick Scorecard Metrics
  const habitsDoneToday = habits.filter((h) => h.checks[todayDayNumber - 1]).length;
  const habitCompletionRateToday =
    habits.length > 0 ? Math.round((habitsDoneToday / habits.length) * 100) : 0;

  // Active consistency streak: compute consecutive days ending today where at least 1 habit was checked
  const activeStreak = useMemo(() => {
    let streak = 0;
    for (let day = todayDayNumber; day >= 1; day--) {
      const anyDone = habits.some((h) => h.checks[day - 1]);
      if (anyDone) {
        streak++;
      } else if (day !== todayDayNumber) {
        break;
      }
    }
    return Math.max(1, streak);
  }, [habits, todayDayNumber]);

  // Focus Hours Metrics
  const todaySessions = sessions.filter((s) => s.date === todayStr);
  const todayFocusMinutes = todaySessions.reduce((acc, s) => acc + s.minutes, 0);
  const todayFocusHours = Math.round((todayFocusMinutes / 60) * 10) / 10;

  const totalFocusMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0);
  const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;

  // 70/30 Practice-to-Theory Ratio Meter
  const practiceAudit = useMemo(() => {
    const sample = sessions.slice(0, 25);
    if (sample.length === 0) {
      return { practicePct: 75, theoryPct: 25, isHealthy: true, practiceMinutes: 0, totalMinutes: 0 };
    }

    const practiceMinutes = sample
      .filter((s) => s.isPractice || s.category === 'DSA & LeetCode' || s.category === 'Aptitude & Placement')
      .reduce((acc, s) => acc + s.minutes, 0);

    const totalMinutes = sample.reduce((acc, s) => acc + s.minutes, 0);
    const practicePct = totalMinutes > 0 ? Math.round((practiceMinutes / totalMinutes) * 100) : 75;
    const theoryPct = 100 - practicePct;
    const isHealthy = practicePct >= 70;

    return { practicePct, theoryPct, isHealthy, practiceMinutes, totalMinutes };
  }, [sessions]);

  // 31-Day Habit Execution Heatmap
  const heatmapData = useMemo(() => {
    return Array.from({ length: 31 }, (_, idx) => {
      const dayNum = idx + 1;
      const doneCount = habits.filter((h) => h.checks[idx]).length;
      const pct = habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0;
      return {
        day: dayNum,
        doneCount,
        pct,
        isToday: dayNum === todayDayNumber,
        isFuture: dayNum > todayDayNumber,
      };
    });
  }, [habits, todayDayNumber]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto font-mono text-slate-200">
      {/* 1. Student Command Center Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-black text-sm shadow-lg shadow-emerald-950/60 shrink-0">
            MA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                Munshi MD Atif
              </h1>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                B.Tech CSE
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Brainware University • Semester 3 & GATE CSE 2028 Command Center
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditDatesOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[#0c1610] hover:bg-[#122218] border border-emerald-600/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm self-stretch sm:self-auto justify-center"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>✏️ Edit Target Dates</span>
        </button>
      </div>

      {/* 2. Live Countdown Tickers (All Tracked Exams: Sem 3, GATE, RRB, SSC, etc.) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white uppercase tracking-wider">
              Exam Countdown Tickers ({allTargetExams.length})
            </span>
          </div>

          <button
            onClick={() => setIsEditDatesOpen(true)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>+ Add / Manage Exams</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allTargetExams.map((target, idx) => {
            const cd = examTargetService.calculateRemaining(target.date);
            const isFirst = idx === 0;
            const isSecond = idx === 1;

            const theme = isFirst
              ? {
                  card: 'from-[#0a120c] to-[#040806] border-[#1a3322] hover:border-emerald-500/60',
                  badge: 'bg-emerald-950/90 text-emerald-400 border-emerald-800',
                  iconBg: 'bg-emerald-950/80 border-emerald-800 text-emerald-400',
                  num: 'text-emerald-400',
                }
              : isSecond
              ? {
                  card: 'from-[#081216] to-[#04080a] border-[#132832] hover:border-cyan-500/60',
                  badge: 'bg-cyan-950/90 text-cyan-400 border-cyan-800',
                  iconBg: 'bg-cyan-950/80 border-cyan-800 text-cyan-400',
                  num: 'text-cyan-400',
                }
              : {
                  card: 'from-[#120f08] to-[#070503] border-[#292214] hover:border-amber-500/60',
                  badge: 'bg-amber-950/90 text-amber-400 border-amber-800',
                  iconBg: 'bg-amber-950/80 border-amber-800 text-amber-400',
                  num: 'text-amber-400',
                };

            return (
              <div
                key={target.id}
                className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${theme.card} border shadow-xl relative overflow-hidden group transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${theme.badge}`}
                      >
                        {target.badge || 'Target Exam'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {target.date}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-extrabold text-white mt-1.5 truncate">
                      {target.title}
                    </h2>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${theme.iconBg}`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>

                {/* Ticker Numbers */}
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#050b07] border border-[#14261a]">
                    <div className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums">
                      {cd.days}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">DAYS</div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#050b07] border border-[#14261a]">
                    <div
                      className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${theme.num}`}
                    >
                      {cd.hours}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">HOURS</div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#050b07] border border-[#14261a]">
                    <div className="text-xl sm:text-2xl font-black text-slate-300 font-mono tabular-nums">
                      {cd.mins}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">MINS</div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#050b07] border border-[#14261a]">
                    <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tabular-nums">
                      {cd.secs}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">SECS</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Today's Quick Scorecard (3 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Habits Done Today */}
        <div className="p-4 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Habits Done Today
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {habitsDoneToday}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {habits.length}</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              {habitCompletionRateToday}% Completion
            </div>
          </div>
        </div>

        {/* Metric 2: Active Consistency Streak */}
        <div className="p-4 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Active Streak
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
              {activeStreak}{' '}
              <span className="text-xs text-slate-400 font-normal">Days</span>
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Continuous Consistency
            </div>
          </div>
        </div>

        {/* Metric 3: Total Focus Hours */}
        <div className="p-4 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Total Focus Hours
            </div>
            <div className="text-2xl font-black text-cyan-300 font-mono mt-0.5">
              {todayFocusHours}h{' '}
              <span className="text-xs text-slate-500 font-normal">Today</span>
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {totalFocusHours}h All-Time Logged
            </div>
          </div>
        </div>
      </div>

      {/* 4. 70/30 Practice-to-Theory Ratio Meter */}
      <div className="p-5 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                70/30 Practice-to-Theory Ratio Meter
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target: ≥70% active problem solving (LeetCode, DSA, GATE PYQs) vs ≤30% passive theory reading.
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded text-[11px] font-bold self-start sm:self-auto border ${
              practiceAudit.isHealthy
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-amber-950 text-amber-300 border-amber-700'
            }`}
          >
            {practiceAudit.isHealthy ? '✅ COMPLIANT' : '⚠️ NEED MORE PRACTICE'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-3 rounded-full bg-[#020503] border border-[#132418] overflow-hidden flex">
            <div
              className="h-full bg-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              style={{ width: `${practiceAudit.practicePct}%` }}
              title={`Practice: ${practiceAudit.practicePct}%`}
            />
            <div
              className="h-full bg-cyan-400 transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${practiceAudit.theoryPct}%` }}
              title={`Theory: ${practiceAudit.theoryPct}%`}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold pt-1">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Practice: {practiceAudit.practicePct}%
            </span>
            <span className="text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Theory: {practiceAudit.theoryPct}%
            </span>
          </div>
        </div>
      </div>

      {/* 5. 31-Day Habit Execution Heatmap */}
      <div className="p-5 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
              31-Day Habit Execution Heatmap
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Day-by-day habit consistency throughout the active month. Today is Day {todayDayNumber}.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab(2)} // Navigate to Habit Tracker
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Open Habit Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 gap-1.5 pt-2">
          {heatmapData.map((d) => {
            let bgClass = 'bg-[#050b07] border-[#14261a] text-slate-600';
            if (d.doneCount > 0) {
              if (d.pct >= 80) {
                bgClass = 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.3)]';
              } else if (d.pct >= 50) {
                bgClass = 'bg-emerald-700/80 text-white border-emerald-600 font-bold';
              } else {
                bgClass = 'bg-emerald-950 text-emerald-300 border-emerald-800';
              }
            }

            return (
              <div
                key={d.day}
                className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center relative ${bgClass} ${
                  d.isToday ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-black' : ''
                }`}
                title={`Day ${d.day}: ${d.doneCount} habits checked (${d.pct}%)`}
              >
                <span className="text-[10px] font-bold block">{d.day}</span>
                <span className="text-[8px] opacity-80 block">{d.doneCount}✓</span>
                {d.isToday && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-[#132418]">
          <div className="flex items-center gap-2">
            <span>Less</span>
            <span className="w-3 h-3 rounded bg-[#050b07] border border-[#14261a]" />
            <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-800" />
            <span className="w-3 h-3 rounded bg-emerald-700 border border-emerald-600" />
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400" />
            <span>More</span>
          </div>

          <span className="text-cyan-400 font-semibold">Cyan ring = Today (Day {todayDayNumber})</span>
        </div>
      </div>

      {/* 6. Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigateTab(1)} // Pomodoro
          className="p-4 rounded-xl bg-[#060D09] hover:bg-[#0c1811] border border-[#16291C] hover:border-emerald-600 text-left transition-all cursor-pointer group space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400">
              <Clock className="w-4 h-4" />
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-xs font-bold text-white">Start Pomodoro Timer</div>
          <div className="text-[11px] text-slate-400 leading-snug">
            25m / 50m intervals with live doubt journaling to Google Sheets.
          </div>
        </button>

        <button
          onClick={() => onNavigateTab(2)} // Habit Tracker
          className="p-4 rounded-xl bg-[#060D09] hover:bg-[#0c1811] border border-[#16291C] hover:border-emerald-600 text-left transition-all cursor-pointer group space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-xs font-bold text-white">Open Habit Tracker</div>
          <div className="text-[11px] text-slate-400 leading-snug">
            Monthly 31-day matrix and dynamic weekly progress summaries.
          </div>
        </button>

        <button
          onClick={() => onNavigateTab(3)} // Study Tracker
          className="p-4 rounded-xl bg-[#060D09] hover:bg-[#0c1811] border border-[#16291C] hover:border-emerald-600 text-left transition-all cursor-pointer group space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-xs font-bold text-white">Open Study Tracker</div>
          <div className="text-[11px] text-slate-400 leading-snug">
            Semester, Placement, GATE, RRB, and SSC exam syllabus trackers.
          </div>
        </button>
      </div>

      {/* Edit Dates Modal */}
      <EditExamTargetsModal
        isOpen={isEditDatesOpen}
        onClose={() => setIsEditDatesOpen(false)}
      />
    </div>
  );
};
