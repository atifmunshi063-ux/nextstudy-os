import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Habit, HabitCategory } from '../../types';
import { storageService } from '../../services/storage';
import { triggerConfetti } from '../../services/confetti';
import { soundService } from '../../services/audio';
import { examTargetService, ExamTargets } from '../../services/examTargetService';
import { EditExamTargetsModal } from '../common/EditExamTargetsModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { AddHabitModal } from './AddHabitModal';
import { MonthlyHabitTracker } from './MonthlyHabitTracker';
import { WeeklyHabitTracker } from './WeeklyHabitTracker';
import { getDB } from '../../db/indexedDb';
import { getLocalDateString } from '../../utils/date';
import {
  Check,
  Flame,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Clock,
  Send,
  Zap,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react';

interface TodayScreenProps {
  habits: Habit[];
  onHabitsChange: () => void;
  onNavigateTab?: (tab: number) => void;
}

const CATEGORIES: ('All' | HabitCategory)[] = [
  'All',
  'Health, Fitness & Sleep',
  'Academics, Semester & Core Engineering',
  'DSA, LeetCode & Competitive Coding',
  'Systems, Projects & Dev Skills',
  'GATE CSE & Competitive Exam Practice',
  'Mindset, Discipline, Reading & Routine',
];

export const TodayScreen: React.FC<TodayScreenProps> = ({ habits, onHabitsChange, onNavigateTab }) => {
  const today = useMemo(() => new Date(), []);
  const todayDayNumber = today.getDate(); // 1 to 31
  const [selectedDay, setSelectedDay] = useState<number>(todayDayNumber);
  const [selectedCategory, setSelectedCategory] = useState<'All' | HabitCategory>('All');
  const [quickDistractions, setQuickDistractions] = useState<number>(0);

  // Modals state
  const [isEditDatesOpen, setIsEditDatesOpen] = useState<boolean>(false);
  const [isAddHabitOpen, setIsAddHabitOpen] = useState<boolean>(false);
  const [deletingHabit, setDeletingHabit] = useState<{ id: number; description: string } | null>(null);
  const [habitViewMode, setHabitViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Live Embedded Sprint Timer (25m standard Pomodoro default)
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const sprintEndTimeRef = useRef<number | null>(null);

  // Ebbinghaus Due Item State
  const [ebbinghausDone, setEbbinghausDone] = useState<boolean>(false);

  // Exam Targets State (Dynamic from localStorage 'nextstudy_exam_targets_v1')
  const [examTargets, setExamTargets] = useState<ExamTargets>(() => examTargetService.getTargets());
  const [sem3Countdown, setSem3Countdown] = useState(() => examTargetService.calculateRemaining(examTargets.sem3Date));
  const [gateCountdown, setGateCountdown] = useState(() => examTargetService.calculateRemaining(examTargets.gateDate));

  // Telemetry counts
  const [dbStats, setDbStats] = useState({ habits: 1, logs: 0, topics: 48, queue: 0 });

  // Subscribe to exam target updates
  useEffect(() => {
    const updateCountdowns = (targets: ExamTargets) => {
      setExamTargets(targets);
      setSem3Countdown(examTargetService.calculateRemaining(targets.sem3Date));
      setGateCountdown(examTargetService.calculateRemaining(targets.gateDate));
    };

    const unsubscribe = examTargetService.subscribe(updateCountdowns);
    const interval = setInterval(() => {
      const current = examTargetService.getTargets();
      setSem3Countdown(examTargetService.calculateRemaining(current.sem3Date));
      setGateCountdown(examTargetService.calculateRemaining(current.gateDate));
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Drift-Free Sprint Timer Tick
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (isTimerRunning) {
      if (!sprintEndTimeRef.current) {
        sprintEndTimeRef.current = Date.now() + timerSeconds * 1000;
      }

      t = setInterval(() => {
        if (!sprintEndTimeRef.current) return;
        const remaining = Math.max(0, Math.ceil((sprintEndTimeRef.current - Date.now()) / 1000));
        setTimerSeconds(remaining);

        if (remaining <= 0) {
          setIsTimerRunning(false);
          sprintEndTimeRef.current = null;
          clearInterval(t);
          soundService.playSessionCompleteChime();
          triggerConfetti();

          // Log completed Pomodoro session
          storageService.logPomodoro({
            date: getLocalDateString(),
            dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            timeOfDay: 'Morning 🌅',
            category: 'Semester 3 Core',
            taskGoal: 'Operating Systems: Process Synchronization & Mutexes',
            completedPomodoros: 1,
            minutes: 25,
            hours: 0.42,
            interruptions: quickDistractions,
            quality: quickDistractions === 0 ? 'High Flow' : 'Solid',
            notes: 'Completed from Dashboard 25m sprint block',
            isPractice: true,
          });
        }
      }, 500);
    } else {
      sprintEndTimeRef.current = null;
    }
    return () => clearInterval(t);
  }, [isTimerRunning, timerSeconds, quickDistractions]);

  // Load telemetry stats
  useEffect(() => {
    getDB().then(async (db) => {
      try {
        const h = await db.count('habits');
        const l = await db.count('habitLogs');
        const tp = await db.count('topics');
        const q = await db.count('syncQueue');
        setDbStats({
          habits: Math.max(habits.length, h),
          logs: Math.max(l, habits.reduce((acc, cur) => acc + cur.totalDone, 0)),
          topics: Math.max(48, tp),
          queue: q,
        });
      } catch (e) {
        // fallback
      }
    });
  }, [habits]);

  // 7-Day Rolling Horizon centered on active days
  const weekDays = useMemo(() => {
    const list = [];
    const baseDate = new Date(today);
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + offset);
      const dayNum = d.getDate();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      list.push({
        dayNumber: dayNum,
        dayName,
        isToday: dayNum === todayDayNumber,
      });
    }
    return list;
  }, [today, todayDayNumber]);

  const handleToggleHabit = (habitId: number) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const currentVal = habit.checks[selectedDay - 1];
    const nextVal = !currentVal;

    if (nextVal) {
      soundService.playCheckSound();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
      if (habit.totalDone + 1 >= habit.targetDays) {
        triggerConfetti();
      }
    }

    storageService.toggleHabit(habitId, selectedDay, nextVal);
    onHabitsChange();
  };

  const handleAddHabit = (category: HabitCategory, description: string, targetDays: number) => {
    storageService.addHabit(category, description, targetDays);
    onHabitsChange();
    triggerConfetti();
  };

  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      if (selectedCategory === 'All') return true;
      return h.category === selectedCategory;
    });
  }, [habits, selectedCategory]);

  const dayChecksCount = habits.filter((h) => h.checks[selectedDay - 1]).length;
  const dayCompletionPct = Math.round((dayChecksCount / Math.max(1, habits.length)) * 100);

  const timerMins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const timerSecs = String(timerSeconds % 60).padStart(2, '0');

  return (
    <div className="space-y-4 pb-24 md:pb-12 max-w-4xl mx-auto font-mono text-slate-200">
      {/* 1. Exam Target Dual Countdown Row with Edit Button */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            Target Exam Dates
          </span>
          <button
            onClick={() => setIsEditDatesOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b140e] hover:bg-emerald-950 border border-[#1a3322] hover:border-emerald-500 text-[11px] font-bold text-emerald-400 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>✏️ Edit Target Dates</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Target 1 (Semester Finals) */}
          <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold tracking-wider truncate mr-2">
                {examTargets.sem3Title || 'BWU SEM 3 FINALS'}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase tracking-wider shrink-0">
                URGENT
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                {sem3Countdown.days}
              </span>
              <span className="text-xs font-bold text-slate-400">DAYS</span>
              <span className="text-base font-bold text-slate-300 ml-auto">
                {String(sem3Countdown.hours).padStart(2, '0')}h:{String(sem3Countdown.mins).padStart(2, '0')}m
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-[#16291C] flex items-center justify-between text-[11px] text-slate-400">
              <span>Target: {examTargetService.formatDisplayDate(examTargets.sem3Date)}</span>
              <span className="text-emerald-400 font-semibold">Live Target</span>
            </div>
          </div>

          {/* Target 2 (GATE CSE / Competitive) */}
          <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold tracking-wider truncate mr-2">
                {examTargets.gateTitle || 'GATE CSE 2028'}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800 text-[10px] font-bold uppercase tracking-wider shrink-0">
                CYCLE 01
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
                {gateCountdown.days}
              </span>
              <span className="text-xs font-bold text-slate-400">DAYS</span>
              <span className="text-base font-bold text-slate-300 ml-auto">
                {String(gateCountdown.hours).padStart(2, '0')}h:{String(gateCountdown.mins).padStart(2, '0')}m
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-[#16291C] flex items-center justify-between text-[11px] text-slate-400">
              <span>Target: {examTargetService.formatDisplayDate(examTargets.gateDate)}</span>
              <span className="text-amber-400 font-semibold">Active Prep</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Focus Sprint Widget */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-sm">⏱</span>
            <span className="text-xs font-bold text-white tracking-wide uppercase">
              Quick Focus Sprint
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#0e1d13] text-cyan-400 border border-cyan-800/80 text-[10px] font-bold">
            50 Min Block
          </span>
        </div>

        <div className="text-xs text-slate-400">Target: GATE CSE & Semester 3 Core</div>

        {/* Embedded Clock Display Box */}
        <div className="p-4 rounded-xl bg-[#040806] border border-[#132418] text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">Active Timer</span>
          </div>

          <div className="text-5xl sm:text-6xl font-black text-emerald-400 tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {timerMins}:{timerSecs}
          </div>

          <div className="text-xs text-slate-300 font-semibold truncate max-w-sm mx-auto">
            OS: Process Sync, Mutexes & Semaphores
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="px-5 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5"
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>START</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsTimerRunning(false);
                sprintEndTimeRef.current = null;
                setTimerSeconds(25 * 60);
              }}
              className="px-4 py-2 rounded bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] text-xs font-semibold text-slate-300 transition-all cursor-pointer"
            >
              RESET
            </button>

            <button
              onClick={() => {
                soundService.playDistractionSound();
                setQuickDistractions((d) => d + 1);
              }}
              className="px-4 py-2 rounded bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/60 text-xs font-semibold text-rose-300 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>+1 Distract ({quickDistractions})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span className="truncate">Ready for a full session with doubt journaling?</span>
          <button
            onClick={() => onNavigateTab && onNavigateTab(1)}
            className="text-emerald-400 hover:text-emerald-300 font-bold shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>Focus Timer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Habit Tracker Section */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-400 tracking-wider">
              Habit Tracker ({habits.length})
            </span>
            <button
              onClick={() => setIsAddHabitOpen(true)}
              className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>(+) Add Habit</span>
            </button>
          </div>

          <div className="text-right">
            <span className="text-lg font-bold text-emerald-400">{dayCompletionPct}%</span>
            <span className="text-[10px] text-slate-400 block -mt-1">TODAY COMPLETE</span>
          </div>
        </div>

        {/* View Mode Switcher: Daily, Weekly Tracker, Monthly Tracker */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#040806] border border-[#132418]">
          {[
            { key: 'daily', label: '📅 Daily View' },
            { key: 'weekly', label: '🗓️ Weekly Tracker' },
            { key: 'monthly', label: '📊 Monthly Tracker (1–31)' },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setHabitViewMode(mode.key as any)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                habitViewMode === mode.key
                  ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Conditional View Rendering */}
        {habitViewMode === 'monthly' ? (
          <MonthlyHabitTracker
            habits={habits}
            onHabitsChange={onHabitsChange}
            onOpenAddHabit={() => setIsAddHabitOpen(true)}
          />
        ) : habitViewMode === 'weekly' ? (
          <WeeklyHabitTracker
            habits={habits}
            onHabitsChange={onHabitsChange}
            onOpenAddHabit={() => setIsAddHabitOpen(true)}
          />
        ) : habits.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#040806] border border-[#132418] text-slate-500 text-xs space-y-3">
            <div className="text-white font-bold text-sm">No Habits Tracked</div>
            <p className="text-slate-400 max-w-sm mx-auto text-xs">
              All habits were deleted and auto-generation has been permanently disabled. Tap (+) Add Habit to create your own habit.
            </p>
            <button
              onClick={() => setIsAddHabitOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>(+) Add Your First Habit</span>
            </button>
          </div>
        ) : (
          <>
            <div className="text-xs font-bold text-white">Daily View: 7-Day Sprint</div>

            {/* 7-Day Sprint Selector */}
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((d) => {
                const isSelected = selectedDay === d.dayNumber;
                return (
                  <button
                    key={d.dayNumber}
                    onClick={() => setSelectedDay(d.dayNumber)}
                    className={`py-2 px-1 rounded flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        : 'bg-[#050907] border-[#16291C] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] uppercase">{d.dayName}</span>
                    <span className="text-xs font-bold mt-0.5">{d.dayNumber}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isSelected ? 'bg-black' : d.isToday ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Category Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
              {CATEGORIES.map((cat) => {
                const isSel = selectedCategory === cat;
                const count =
                  cat === 'All' ? habits.length : habits.filter((h) => h.category === cat).length;
                const label =
                  cat === 'All'
                    ? `ALL (${count})`
                    : cat.includes('Health')
                    ? `Health/Routine (${count})`
                    : cat.includes('Academics')
                    ? `Academics/CSE (${count})`
                    : cat.includes('DSA')
                    ? `DSA/LeetCode (${count})`
                    : cat.includes('GATE')
                    ? `GATE Prep (${count})`
                    : `${cat.split(' ')[0]} (${count})`;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded whitespace-nowrap border transition-all cursor-pointer text-[11px] ${
                      isSel
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500 font-bold'
                        : 'bg-[#050907] text-slate-400 border-[#16291C] hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Habit Items */}
            <div className="space-y-2 pt-1">
              {filteredHabits.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-[#040806] border border-[#132418] text-slate-500 text-xs space-y-2">
                  <div>No habits found in this category.</div>
                  <button
                    onClick={() => setIsAddHabitOpen(true)}
                    className="px-3 py-1.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    (+) Add First Habit
                  </button>
                </div>
              ) : (
                filteredHabits.map((habit, hIdx) => {
                  const isChecked = habit.checks[selectedDay - 1];
                  const slotHour = 6 + (habit.id % 14);
                  const slotTime = `${String(slotHour).padStart(2, '0')}:00 - ${String(slotHour + 1).padStart(2, '0')}:30 IST`;
                  const streakCount = Math.max(1, habit.totalDone);

                  return (
                    <div
                      key={`${habit.id}-${hIdx}`}
                      onClick={() => handleToggleHabit(habit.id)}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#09140D] border-emerald-900/80 shadow-[0_0_8px_rgba(16,185,129,0.06)]'
                          : 'bg-[#040806] border-[#132418] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-400 text-black font-bold'
                              : 'border-[#1b3423] bg-[#08120b]'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-semibold truncate ${
                              isChecked ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {habit.description}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                            <span className="text-emerald-400">
                              {habit.category.split(',')[0]}
                            </span>
                            <span>•</span>
                            <span>Slot: {slotTime}</span>
                            <span>•</span>
                            <span>Target: {habit.targetDays}d</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="px-2 py-1 rounded bg-[#0b160e] border border-amber-900/60 text-amber-400 text-[11px] font-bold flex items-center gap-1">
                          <span>🔥</span>
                          <span>{streakCount}d</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingHabit({ id: habit.id, description: habit.description });
                          }}
                          title="Delete habit"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* 4. Top Priority Task */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>TOP PRIORITY STUDY TASK</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold">
            HIGH IMPACT
          </span>
        </div>

        <h3 className="text-sm font-bold text-white">
          LeetCode 207: Course Schedule (Graph TopoSort BFS/Kahn)
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Directly linked to GATE Data Structures & Algorithms and Semester 3 practical viva prep.
        </p>

        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-slate-400">Est: 45 min • Target: O(V+E)</span>
          <button
            onClick={() => onNavigateTab && onNavigateTab(4)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
          >
            <span>View in Planner</span>
          </button>
        </div>
      </div>

      {/* 5. Due for Revision Today */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
            <span>🔄</span>
            <span>DUE FOR REVISION TODAY</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">
            Interval: 7d → 14d
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">
              DBMS: B+ Tree Indexing & Query Optimization
            </h4>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
              GATE + SEM
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Last reviewed: 7 days ago • Recall Accuracy: 78%
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => setEbbinghausDone(true)}
            className="py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-bold text-center cursor-pointer transition-colors"
          >
            Hard (1d)
          </button>
          <button
            onClick={() => setEbbinghausDone(true)}
            className="py-1.5 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800 text-amber-300 text-xs font-bold text-center cursor-pointer transition-colors"
          >
            Medium (7d)
          </button>
          <button
            onClick={() => setEbbinghausDone(true)}
            className="py-1.5 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300 text-xs font-bold text-center cursor-pointer transition-colors"
          >
            Easy (14d)
          </button>
        </div>
      </div>

      {/* 6. Practice vs Theory Ratio */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-emerald-400 tracking-wider">
            STUDY RATIO (PRACTICE VS THEORY)
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
            TARGET MET
          </span>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex">
          <div className="h-full bg-emerald-400" style={{ width: '74%' }} />
          <div className="h-full bg-cyan-400" style={{ width: '26%' }} />
        </div>

        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Practice: 74% (4.2 hrs)</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Theory: 26% (1.5 hrs)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400">CURRENT STREAK</div>
            <div className="text-base font-bold text-white mt-0.5">28 DAYS</div>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400">SYNC STATUS</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">Connected</div>
          </div>
        </div>
      </div>

      {/* 7. Google Sheets Sync Status */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <span>☁</span>
            <span>GOOGLE SHEETS SYNC STATUS</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
            CONNECTED
          </span>
        </div>

        <div className="p-2.5 rounded bg-[#040806] border border-[#132418] text-xs flex items-center justify-between">
          <span className="text-slate-400">TARGET SPREADSHEET</span>
          <span className="text-slate-500 font-mono text-[11px]">1i9yRvY...3yU</span>
        </div>
        <div className="text-xs font-bold text-white -mt-1 pl-1">
          Master_100_Habit_Tracker
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400">HABITS</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{dbStats.habits}</div>
          </div>
          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400">LOGS</div>
            <div className="text-sm font-bold text-cyan-400 mt-0.5">{dbStats.logs}</div>
          </div>
          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400">TOPICS</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">{dbStats.topics}</div>
          </div>
          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400">QUEUE</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{dbStats.queue} PEND</div>
          </div>
        </div>
      </div>

      {/* Edit Target Dates Modal */}
      <EditExamTargetsModal
        isOpen={isEditDatesOpen}
        onClose={() => setIsEditDatesOpen(false)}
      />

      {/* Add Habit Modal */}
      <AddHabitModal
        isOpen={isAddHabitOpen}
        onClose={() => setIsAddHabitOpen(false)}
        onAdd={handleAddHabit}
      />

      {/* Delete Habit Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingHabit}
        title="Delete Habit"
        message="Are you sure you want to remove this habit from today's checklist?"
        itemName={deletingHabit?.description}
        confirmText="Yes, Delete Habit"
        onConfirm={() => {
          if (deletingHabit) {
            storageService.deleteHabit(deletingHabit.id);
            onHabitsChange();
            setDeletingHabit(null);
          }
        }}
        onClose={() => setDeletingHabit(null)}
      />
    </div>
  );
};
