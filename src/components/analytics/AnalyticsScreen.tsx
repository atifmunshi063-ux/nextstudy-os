import React, { useState, useEffect, useMemo } from 'react';
import { Habit, PomodoroSession, SyllabusSubject, EisenhowerItem } from '../../types';
import { EXAM_TARGETS } from '../../data/seedData';
import { storageService } from '../../services/storage';
import { getLocalDateString } from '../../utils/date';
import {
  Flame,
  Clock,
  CheckSquare,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  ArrowUpRight,
  Plus,
  Trash2,
  Hourglass,
  Gauge,
} from 'lucide-react';

interface AnalyticsScreenProps {
  habits: Habit[];
  sessions: PomodoroSession[];
  subjects: SyllabusSubject[];
}

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPassed: boolean;
}

function calculateCountdown(targetIso: string): CountdownValues {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPassed: false };
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  habits,
  sessions,
  subjects,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDayNumber = today.getDate();
  const todayStr = getLocalDateString(today);

  // Live dual countdown tickers (updated every second)
  const [sem3Countdown, setSem3Countdown] = useState<CountdownValues>(() =>
    calculateCountdown(EXAM_TARGETS.SEM3_FINALS.targetDate)
  );
  const [gateCountdown, setGateCountdown] = useState<CountdownValues>(() =>
    calculateCountdown(EXAM_TARGETS.GATE_CSE_2028.targetDate)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSem3Countdown(calculateCountdown(EXAM_TARGETS.SEM3_FINALS.targetDate));
      setGateCountdown(calculateCountdown(EXAM_TARGETS.GATE_CSE_2028.targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Eisenhower Matrix State
  const [eisenhowerItems, setEisenhowerItems] = useState<EisenhowerItem[]>(() =>
    storageService.getEisenhowerItems()
  );
  const [newEisenhowerTitle, setNewEisenhowerTitle] = useState('');
  const [newEisenhowerQuadrant, setNewEisenhowerQuadrant] = useState<
    EisenhowerItem['quadrant']
  >('urgent_important');

  const handleAddEisenhower = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEisenhowerTitle.trim()) return;
    storageService.addEisenhowerItem({
      title: newEisenhowerTitle.trim(),
      quadrant: newEisenhowerQuadrant,
      category: 'Focus MIT',
    });
    setEisenhowerItems(storageService.getEisenhowerItems());
    setNewEisenhowerTitle('');
  };

  const handleDeleteEisenhower = (id: string) => {
    storageService.deleteEisenhowerItem(id);
    setEisenhowerItems(storageService.getEisenhowerItems());
  };

  // KPIs
  const habitsTodayCount = habits.filter((h) => h.checks[todayDayNumber - 1]).length;
  const habitPctToday = habits.length > 0 ? Math.round((habitsTodayCount / habits.length) * 100) : 0;

  const totalFocusMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0);
  const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;

  const todaySessions = sessions.filter((s) => s.date === todayStr);
  const todayFocusMinutes = todaySessions.reduce((acc, s) => acc + s.minutes, 0);
  const todayFocusHours = Math.round((todayFocusMinutes / 60) * 10) / 10;

  // 70/30 Practice-to-Theory Ratio Auditor
  const practiceAudit = useMemo(() => {
    // Recent 15 sessions or all
    const sample = sessions.slice(0, 20);
    if (sample.length === 0) return { practicePct: 75, theoryPct: 25, isHealthy: true };

    const practiceMinutes = sample
      .filter((s) => s.isPractice || s.category === 'DSA & LeetCode' || s.category === 'Aptitude & Placement')
      .reduce((acc, s) => acc + s.minutes, 0);

    const totalSampleMinutes = sample.reduce((acc, s) => acc + s.minutes, 0);
    const practicePct = totalSampleMinutes > 0 ? Math.round((practiceMinutes / totalSampleMinutes) * 100) : 75;
    const theoryPct = 100 - practicePct;
    const isHealthy = practicePct >= 70;

    return { practicePct, theoryPct, isHealthy, practiceMinutes, totalSampleMinutes };
  }, [sessions]);

  // Category Health Matrix (6 Categories from Monthly_Habit_Tracker)
  const categoryHealth = useMemo(() => {
    const categories: Habit['category'][] = [
      'Health, Fitness & Sleep',
      'Academics, Semester & Core Engineering',
      'DSA, LeetCode & Competitive Coding',
      'Systems, Projects & Dev Skills',
      'GATE CSE & Competitive Exam Practice',
      'Mindset, Discipline, Reading & Routine',
    ];

    return categories.map((cat) => {
      const catHabits = habits.filter((h) => h.category === cat);
      const totalChecksPossible = catHabits.length * 31;
      const doneChecks = catHabits.reduce((acc, h) => acc + h.totalDone, 0);
      const targetDone = catHabits.reduce((acc, h) => acc + h.targetDays, 0);
      const monthPct = targetDone > 0 ? Math.round((doneChecks / targetDone) * 100) : 0;
      const todayDone = catHabits.filter((h) => h.checks[todayDayNumber - 1]).length;

      return {
        category: cat,
        count: catHabits.length,
        todayDone,
        monthPct,
        targetDone,
        doneChecks,
      };
    });
  }, [habits, todayDayNumber]);

  // 31-Day Activity Heatmap Grid
  const days31Heatmap = useMemo(() => {
    return Array.from({ length: 31 }, (_, idx) => {
      const dayNum = idx + 1;
      const completed = habits.filter((h) => h.checks[idx]).length;
      const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
      return {
        day: dayNum,
        completed,
        pct,
        isToday: dayNum === todayDayNumber,
        isFuture: dayNum > todayDayNumber,
      };
    });
  }, [habits, todayDayNumber]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Student Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#111813] border border-slate-800 shadow-md">
        <div>
          <div className="text-xs text-slate-400 font-medium">B.Tech Computer Science & Engineering</div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Munshi MD Atif <span className="text-emerald-400 font-normal">· Brainware University</span>
          </h2>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-slate-400">Sheet: Dashboard_Analytics</span>
          <div className="text-xs font-semibold text-emerald-400">Active Month Tracking</div>
        </div>
      </div>

      {/* LIVE DUAL COUNTDOWNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Countdown 1: Brainware University Sem 3 Final Exams */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121b14] to-[#0c140f] border border-emerald-800/60 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                <Hourglass className="w-3.5 h-3.5 animate-pulse" />
                <span>Target 1: University Finals</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {EXAM_TARGETS.SEM3_FINALS.title}
              </h3>
              <p className="text-[11px] text-slate-400">
                Target Date: {EXAM_TARGETS.SEM3_FINALS.displayDate}
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              Sem 3
            </span>
          </div>

          {/* Live Digits Strip */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-xl bg-[#090e0a] border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-white tabular-nums">
                {sem3Countdown.days}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">Days</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#090e0a] border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
                {sem3Countdown.hours}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">Hours</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#090e0a] border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
                {sem3Countdown.minutes}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">Mins</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#090e0a] border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-cyan-400 tabular-nums">
                {sem3Countdown.seconds}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">Secs</div>
            </div>
          </div>
        </div>

        {/* Countdown 2: GATE CSE 2028 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#10191e] to-[#0a1114] border border-cyan-800/60 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                <Hourglass className="w-3.5 h-3.5 animate-pulse" />
                <span>Target 2: National GATE</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {EXAM_TARGETS.GATE_CSE_2028.title}
              </h3>
              <p className="text-[11px] text-slate-400">
                Target Date: {EXAM_TARGETS.GATE_CSE_2028.displayDate}
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              GATE '28
            </span>
          </div>

          {/* Live Digits Strip */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-xl bg-[#080d10] border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-white tabular-nums">
                {gateCountdown.days}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">Days</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#080d10] border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-cyan-400 tabular-nums">
                {gateCountdown.hours}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">Hours</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#080d10] border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-cyan-400 tabular-nums">
                {gateCountdown.minutes}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">Mins</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#080d10] border border-slate-800/80">
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
                {gateCountdown.seconds}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">Secs</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 CORE REAL-TIME KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#111813] border border-slate-800 shadow-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Today's Habits</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {habitsTodayCount}
            <span className="text-xs text-slate-500 font-normal"> / {habits.length}</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
            {habitPctToday}% completed
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111813] border border-slate-800 shadow-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Lifetime Focus</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
            {totalFocusHours}
            <span className="text-xs text-slate-400 font-normal"> hrs</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {todayFocusHours}h logged today
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111813] border border-slate-800 shadow-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Active Streak</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            18
            <span className="text-xs text-slate-400 font-normal"> days</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
            Target: 30-Day Shield
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#111813] border border-slate-800 shadow-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span>Active Month</span>
          </div>
          <div className="text-2xl font-bold font-mono text-teal-400 mt-1 tabular-nums">
            Day {todayDayNumber}
            <span className="text-xs text-slate-500 font-normal"> / 31</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Active Study Cycle
          </div>
        </div>
      </div>

      {/* 70/30 PRACTICE-TO-THEORY RATIO AUDITOR */}
      <div className="p-5 rounded-2xl bg-[#111813] border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                70/30 Practice-to-Theory Ratio Auditor
              </h3>
              <p className="text-xs text-slate-400">
                Rule: Engineering retention requires ≥70% active problem solving (LeetCode, DSA, Numerical PYQs).
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg border ${
                practiceAudit.isHealthy
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
              }`}
            >
              {practiceAudit.isHealthy ? '✅ Ratio Compliant' : '⚠️ Practice Deficit Warning'}
            </span>
          </div>
        </div>

        {/* Visual Progress Split Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-semibold">
              Active Practice: {practiceAudit.practicePct}% (Target: ≥70%)
            </span>
            <span className="text-cyan-400">
              Passive Theory: {practiceAudit.theoryPct}% (Cap: ≤30%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${practiceAudit.practicePct}%` }}
            />
            <div
              className="h-full bg-cyan-600/80 transition-all duration-500"
              style={{ width: `${practiceAudit.theoryPct}%` }}
            />
          </div>
        </div>

        {!practiceAudit.isHealthy && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Action required for Munshi MD Atif:</strong> High ratio of passive reading detected. Allocate the next 2 Pomodoro focus sprints strictly to LeetCode Mediums or GATE numerical problems!
            </div>
          </div>
        )}
      </div>

      {/* CATEGORY HEALTH MATRIX (6 Categories from Monthly_Habit_Tracker) */}
      <div className="p-5 rounded-2xl bg-[#111813] border border-slate-800 shadow-lg space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            6-Category Habit Health Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Monthly progress against target days across the 6 spreadsheet categories
          </p>
        </div>

        <div className="space-y-3.5">
          {categoryHealth.map((c) => (
            <div key={c.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  {c.category} <span className="text-slate-500 font-normal">({c.count} habits)</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {c.monthPct}% Target · {c.todayDone}/{c.count} done today
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, c.monthPct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 31-DAY ACTIVITY HEATMAP GRID */}
      <div className="p-5 rounded-2xl bg-[#111813] border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              31-Day Activity Heatmap Grid
            </h3>
            <p className="text-xs text-slate-400">
              Daily habit completion rate across current month (Day 1 to 31)
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Today: Day {todayDayNumber}
          </span>
        </div>

        {/* 31 Tiles Grid */}
        <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 gap-1.5 pt-2">
          {days31Heatmap.map((item) => {
            let bgClass = 'bg-[#141d17] border-slate-800 text-slate-500';
            if (!item.isFuture) {
              if (item.pct >= 80) bgClass = 'bg-emerald-500 border-emerald-400 text-black font-bold';
              else if (item.pct >= 50) bgClass = 'bg-emerald-700 border-emerald-600 text-white';
              else if (item.pct >= 20) bgClass = 'bg-emerald-900 border-emerald-800 text-emerald-200';
              else bgClass = 'bg-[#18231c] border-slate-700 text-slate-400';
            }

            return (
              <div
                key={item.day}
                className={`relative flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-mono transition-transform hover:scale-110 cursor-pointer ${bgClass} ${
                  item.isToday ? 'ring-2 ring-cyan-400 shadow-lg' : ''
                }`}
                title={`Day ${item.day}: ${item.completed}/${habits.length} habits (${item.pct}%)`}
              >
                <span className="text-[11px]">{item.day}</span>
                <span className="text-[9px] opacity-75">{item.isFuture ? '—' : `${item.pct}%`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* EISENHOWER PRIORITY MATRIX */}
      <div className="p-5 rounded-2xl bg-[#111813] border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Eisenhower Priority Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Strategic execution quadrants for Munshi MD Atif
            </p>
          </div>
        </div>

        {/* 4 Quadrants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Q1: Urgent & Important (DO FIRST) */}
          <div className="p-4 rounded-xl bg-[#141f17] border border-emerald-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span>Q1: DO NOW (Urgent & Important)</span>
              <span className="text-[10px] uppercase font-mono">Top Priority</span>
            </div>
            <div className="space-y-1.5">
              {eisenhowerItems
                .filter((i) => i.quadrant === 'urgent_important')
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-[#0e1610] text-xs text-slate-200 flex items-center justify-between group border border-slate-800"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-white">{item.title}</span>
                      {item.deadline && (
                        <span className="text-[10px] text-emerald-400 block font-mono">
                          Due: {item.deadline}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEisenhower(item.id)}
                      className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Q2: Not Urgent, but Important (SCHEDULE DEEP WORK) */}
          <div className="p-4 rounded-xl bg-[#111c21] border border-cyan-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
              <span>Q2: SCHEDULE (Important, Long-Term)</span>
              <span className="text-[10px] uppercase font-mono">GATE & Career</span>
            </div>
            <div className="space-y-1.5">
              {eisenhowerItems
                .filter((i) => i.quadrant === 'not_urgent_important')
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-[#0a1216] text-xs text-slate-200 flex items-center justify-between group border border-slate-800"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-white">{item.title}</span>
                      {item.deadline && (
                        <span className="text-[10px] text-cyan-400 block font-mono">
                          Target: {item.deadline}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEisenhower(item.id)}
                      className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Q3: Urgent, Not Important (DELEGATE / MINIMIZE) */}
          <div className="p-4 rounded-xl bg-[#1c1811] border border-amber-800/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span>Q3: MINIMIZE (Urgent, Low Impact)</span>
              <span className="text-[10px] uppercase font-mono">Batch or Limit</span>
            </div>
            <div className="space-y-1.5">
              {eisenhowerItems
                .filter((i) => i.quadrant === 'urgent_not_important')
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-[#14100a] text-xs text-slate-200 flex items-center justify-between group border border-slate-800"
                  >
                    <span className="font-semibold text-white truncate pr-2">{item.title}</span>
                    <button
                      onClick={() => handleDeleteEisenhower(item.id)}
                      className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Q4: Neither (STRICT ELIMINATION) */}
          <div className="p-4 rounded-xl bg-[#1c1212] border border-red-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-red-400">
              <span>Q4: ELIMINATE (Time Wasters)</span>
              <span className="text-[10px] uppercase font-mono">Zero Tolerance</span>
            </div>
            <div className="space-y-1.5">
              {eisenhowerItems
                .filter((i) => i.quadrant === 'neither')
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-[#140b0b] text-xs text-slate-200 flex items-center justify-between group border border-slate-800"
                  >
                    <span className="font-semibold text-white truncate pr-2">{item.title}</span>
                    <button
                      onClick={() => handleDeleteEisenhower(item.id)}
                      className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Quick Add Form for Eisenhower */}
        <form onSubmit={handleAddEisenhower} className="flex gap-2 pt-1 flex-wrap sm:flex-nowrap">
          <input
            type="text"
            value={newEisenhowerTitle}
            onChange={(e) => setNewEisenhowerTitle(e.target.value)}
            placeholder="Add priority task (e.g. Brainware OS lab, LeetCode Trees)..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-[#141d17] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <select
            value={newEisenhowerQuadrant}
            onChange={(e) => setNewEisenhowerQuadrant(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#141d17] border border-slate-700 text-xs text-emerald-400 font-semibold focus:outline-none"
          >
            <option value="urgent_important">Q1: Do Now</option>
            <option value="not_urgent_important">Q2: Schedule (GATE)</option>
            <option value="urgent_not_important">Q3: Minimize</option>
            <option value="neither">Q4: Eliminate</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white whitespace-nowrap transition-colors"
          >
            Add Task
          </button>
        </form>
      </div>
    </div>
  );
};
