import React, { useState, useEffect, useRef } from 'react';
import { PomodoroCategory, PomodoroQuality, PomodoroSession } from '../../types';
import { storageService } from '../../services/storage';
import { soundService } from '../../services/audio';
import { triggerConfetti } from '../../services/confetti';
import { PomodoroTrackerView } from './PomodoroTrackerView';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  Cloud,
  Check,
  Layers,
  Edit2,
  Plus,
  Trash2,
  Coffee,
  Flame,
  Award,
} from 'lucide-react';

interface FocusScreenProps {
  sessions: PomodoroSession[];
  onSessionsChange: () => void;
}

const CATEGORIES: PomodoroCategory[] = [
  'Semester 3 Core',
  'DSA & LeetCode',
  'GATE CSE Theory',
  'Systems & Dev',
  'Aptitude & Placement',
  'Revision & Mock',
];

interface SprintObjective {
  id: number;
  text: string;
  done: boolean;
}

export const FocusScreen: React.FC<FocusScreenProps> = ({ sessions, onSessionsChange }) => {
  // Focus Screen View: Live Timer vs Pomodoro Tracker History
  const [focusView, setFocusView] = useState<'timer' | 'tracker'>('timer');

  // Timer State - Default is 25 minutes standard Pomodoro
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [presetMinutes, setPresetMinutes] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [distractions, setDistractions] = useState<number>(0);
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(true);

  // Custom minutes input state
  const [isCustomPresetOpen, setIsCustomPresetOpen] = useState(false);
  const [customInputMins, setCustomInputMins] = useState('30');

  // Objectives checklist (Sprint Scope)
  const [objectives, setObjectives] = useState<SprintObjective[]>([
    { id: 1, text: 'Core concept comprehension & proofs', done: false },
    { id: 2, text: 'Solve 2 practice problems / PYQs', done: false },
    { id: 3, text: 'Log key formula & summary notes', done: false },
  ]);
  const [newObjectiveText, setNewObjectiveText] = useState('');
  const [isAddingObjective, setIsAddingObjective] = useState(false);

  // Active Session Context
  const [category, setCategory] = useState<PomodoroCategory>('Semester 3 Core');
  const [taskGoal, setTaskGoal] = useState<string>('Operating Systems: Process Synchronization & Mutexes');
  const [isEditingTask, setIsEditingTask] = useState(false);

  // Post-session reflection modal
  const [showReflectionModal, setShowReflectionModal] = useState<boolean>(false);
  const [quality, setQuality] = useState<PomodoroQuality>('High Flow');
  const [reflectionNote, setReflectionNote] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['#DeepWork', '#Focused']);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [completedMinutesForLog, setCompletedMinutesForLog] = useState<number>(25);
  const [completedSecondsForLog, setCompletedSecondsForLog] = useState<number>(0);

  // Timestamp-based drift-free timer reference
  const endTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setPreset = (mins: number, isBreak = false) => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setMode(isBreak ? 'break' : 'work');
    setPresetMinutes(mins);
    setTimeLeft(mins * 60);
    setIsCustomPresetOpen(false);
  };

  const handleApplyCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customInputMins, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 180) {
      setPreset(parsed, false);
    }
  };

  // Drift-Free Timer Loop with background tab sync
  useEffect(() => {
    if (isRunning) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
      }

      const updateTimer = () => {
        if (!endTimeRef.current) return;
        const now = Date.now();
        const diffSecs = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        setTimeLeft(diffSecs);

        if (diffSecs <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsRunning(false);
          endTimeRef.current = null;
          handleOpenRetrospective(0);
        }
      };

      timerRef.current = setInterval(updateTimer, 500);

      const handleVisibilityChange = () => {
        if (!document.hidden && isRunning && endTimeRef.current) {
          updateTimer();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      endTimeRef.current = null;
    }
  }, [isRunning]);

  // Tab Title Ticker
  useEffect(() => {
    if (isRunning) {
      const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const secs = String(timeLeft % 60).padStart(2, '0');
      document.title = `(${mins}:${secs}) ${mode === 'break' ? '☕ Break' : '🎯 Focus'} • NextStudy`;
    } else {
      document.title = 'NextStudy OS';
    }
    return () => {
      document.title = 'NextStudy OS';
    };
  }, [isRunning, timeLeft, mode]);

  // Spacebar Desktop Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        handleStartPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, timeLeft, chimeEnabled]);

  const handleStartPause = () => {
    if (!isRunning) {
      if (chimeEnabled) {
        soundService.playStartChime();
      }
      endTimeRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);
    } else {
      endTimeRef.current = null;
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(presetMinutes * 60);
  };

  const handleAddDistraction = () => {
    if (chimeEnabled) soundService.playDistractionSound();
    setDistractions((d) => d + 1);
  };

  const handleOpenRetrospective = (customTimeLeft?: number) => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (chimeEnabled) soundService.playSessionCompleteChime();
    triggerConfetti();

    const curTimeLeft = typeof customTimeLeft === 'number' ? customTimeLeft : timeLeft;
    const totalSecs = presetMinutes * 60;
    const elapsedSecs = Math.max(0, totalSecs - curTimeLeft);
    const actualMins = Math.max(1, Math.round(elapsedSecs / 60));
    const remSecs = elapsedSecs % 60;

    setCompletedMinutesForLog(actualMins);
    setCompletedSecondsForLog(remSecs);

    const autoQuality: PomodoroQuality =
      distractions === 0 ? 'High Flow' : distractions <= 2 ? 'Solid' : 'Distracted';
    setQuality(autoQuality);
    setReflectionNote(`Completed focus block on ${taskGoal.trim()}.`);
    setShowReflectionModal(true);
  };

  const handleCommitSession = () => {
    const today = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentHour = today.getHours();

    let timeOfDay: PomodoroSession['timeOfDay'] = 'Morning 🌅';
    if (currentHour >= 12 && currentHour < 17) timeOfDay = 'Afternoon ☀️';
    else if (currentHour >= 17 && currentHour < 22) timeOfDay = 'Evening 🌆';
    else if (currentHour >= 22 || currentHour < 5) timeOfDay = 'Late Night 🌙';

    const actualMins = completedMinutesForLog;
    const pomodorosCount = Math.max(1, Math.round(actualMins / 25));

    storageService.logPomodoro({
      date: getLocalDateString(),
      dayOfWeek: daysOfWeek[today.getDay()],
      timeOfDay,
      category,
      taskGoal: taskGoal.trim() || `${category} focus block`,
      completedPomodoros: pomodorosCount,
      minutes: actualMins,
      hours: Math.round((actualMins / 60) * 100) / 100,
      interruptions: distractions,
      quality,
      notes: `${reflectionNote.trim()} ${tags.join(' ')}`,
      isPractice: true,
    });

    onSessionsChange();
    setShowReflectionModal(false);
    setDistractions(0);

    // If work session finished, prompt 5m break
    if (mode === 'work') {
      setPreset(5, true);
    } else {
      setPreset(25, false);
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().startsWith('#')
      ? newTagInput.trim()
      : `#${newTagInput.trim()}`;
    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const toggleObjective = (id: number) => {
    soundService.playCheckSound();
    setObjectives((prev) =>
      prev.map((o) => (o.id === id ? { ...o, done: !o.done } : o))
    );
  };

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectiveText.trim()) return;
    const newObj: SprintObjective = {
      id: Date.now(),
      text: newObjectiveText.trim(),
      done: false,
    };
    setObjectives((prev) => [...prev, newObj]);
    setNewObjectiveText('');
    setIsAddingObjective(false);
  };

  const handleDeleteObjective = (id: number) => {
    setObjectives((prev) => prev.filter((o) => o.id !== id));
  };

  // Dial calculations
  const totalSeconds = Math.max(1, presetMinutes * 60);
  const progressRatio = (totalSeconds - timeLeft) / totalSeconds;
  const radius = 105;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const minutesFormatted = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secondsFormatted = String(timeLeft % 60).padStart(2, '0');

  const elapsedSeconds = Math.max(0, totalSeconds - timeLeft);
  const elapsedMinsFormatted = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const elapsedSecsFormatted = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="font-mono text-slate-200 select-none space-y-4 pb-24 md:pb-12 max-w-xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="font-extrabold text-white tracking-wider">
            {mode === 'break' ? '☕ RECOVERY BREAK TIMER' : '🍅 POMODORO FOCUS ENGINE'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setChimeEnabled(!chimeEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border transition-colors ${
              chimeEnabled
                ? 'bg-[#0a120c] border-emerald-700 text-emerald-400'
                : 'bg-[#12080a] border-slate-700 text-slate-500'
            }`}
            title="Toggle timer chimes"
          >
            {chimeEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{chimeEnabled ? 'Chime On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* View Mode Switcher: Live Focus Timer vs Pomodoro Tracker */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#080E0B] border border-[#16291C]">
        <button
          onClick={() => setFocusView('timer')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            focusView === 'timer'
              ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>⏱️ Live Timer</span>
        </button>

        <button
          onClick={() => setFocusView('tracker')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            focusView === 'tracker'
              ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>📋 Session Log ({sessions.length})</span>
        </button>
      </div>

      {focusView === 'tracker' ? (
        <PomodoroTrackerView
          sessions={sessions}
          onSessionsChange={onSessionsChange}
          onGoToTimer={() => setFocusView('timer')}
        />
      ) : (
        <>
          {/* Active Target Task Card (User Editable!) */}
          <div className="p-3.5 rounded-xl bg-[#080E0B] border border-[#16291C] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">
                  {category}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {mode === 'work' ? 'Focused Study Block' : 'Recovery Break'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingTask(!isEditingTask)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>{isEditingTask ? 'Done' : 'Change Task'}</span>
              </button>
            </div>

            {isEditingTask ? (
              <div className="space-y-2 pt-1 border-t border-[#132418]">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Study Category / Domain
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PomodoroCategory)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Sprint Goal / Topic Title
                  </label>
                  <input
                    type="text"
                    value={taskGoal}
                    onChange={(e) => setTaskGoal(e.target.value)}
                    placeholder="e.g. LeetCode Trees & Recursion, DBMS B+ Tree Indexing"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            ) : (
              <h3 className="text-sm font-bold text-white leading-snug">
                {taskGoal || `${category} Focus Session`}
              </h3>
            )}
          </div>

          {/* Preset Interval Bar */}
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-bold text-[11px]">
              <span>INTERVAL PRESETS:</span>
              <button
                type="button"
                onClick={() => setIsCustomPresetOpen(!isCustomPresetOpen)}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                {isCustomPresetOpen ? 'Close Custom' : '+ Custom Mins'}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '25m STD', mins: 25, isBreak: false },
                { label: '50m DEEP', mins: 50, isBreak: false },
                { label: '5m BREAK', mins: 5, isBreak: true },
                { label: '15m LONG', mins: 15, isBreak: true },
              ].map((p) => {
                const isSelected = presetMinutes === p.mins && mode === (p.isBreak ? 'break' : 'work');
                return (
                  <button
                    key={p.label}
                    onClick={() => setPreset(p.mins, p.isBreak)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                      isSelected
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-md font-extrabold'
                        : 'bg-[#050907] border-[#16291C] text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] uppercase truncate block">{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Minutes Input Popdown */}
            {isCustomPresetOpen && (
              <form
                onSubmit={handleApplyCustomPreset}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#09140e] border border-emerald-500/50"
              >
                <span className="text-[10px] text-emerald-400 font-bold uppercase shrink-0">
                  Custom Minutes:
                </span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customInputMins}
                  onChange={(e) => setCustomInputMins(e.target.value)}
                  className="w-16 px-2 py-1 rounded bg-[#040806] border border-[#16291C] text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs cursor-pointer shadow"
                >
                  Set Timer
                </button>
              </form>
            )}
          </div>

          {/* Central Circular Dial */}
          <div className="relative p-6 rounded-2xl bg-[#080E0B] border border-[#16291C] flex flex-col items-center justify-center shadow-2xl">
            {/* Corner HUD Reticles */}
            <span className="absolute top-2 left-2 text-[10px] text-slate-600 font-mono">┏</span>
            <span className="absolute top-2 right-2 text-[10px] text-slate-600 font-mono">┓</span>
            <span className="absolute bottom-2 left-2 text-[10px] text-slate-600 font-mono">┗</span>
            <span className="absolute bottom-2 right-2 text-[10px] text-slate-600 font-mono">┛</span>

            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 250 250">
                <circle cx="125" cy="125" r={radius} stroke="#0f2115" strokeWidth="8" fill="transparent" />
                <circle
                  cx="125"
                  cy="125"
                  r={radius}
                  stroke={mode === 'break' ? '#06b6d4' : '#10B981'}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span>{mode === 'break' ? 'RECOVERY PAUSE' : isRunning ? 'FLOW LOCKED' : 'READY TO SPRINT'}</span>
                </div>

                <div className="text-5xl font-black text-white tracking-tight font-mono tabular-nums my-1 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  {minutesFormatted}:{secondsFormatted}
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  ELAPSED: {elapsedMinsFormatted}:{elapsedSecsFormatted} / {presetMinutes}:00
                </div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase truncate max-w-[200px]">
                  {taskGoal || 'POMODORO BLOCK'}
                </div>
              </div>
            </div>

            {/* Focus status indicator footer */}
            <div className="w-full pt-3 border-t border-[#132418] flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{isRunning ? 'Timer Active' : 'Timer Paused'}</span>
              </div>
              <div className="text-slate-400 font-mono">Interval: {presetMinutes}m</div>
              <div className="text-emerald-400 font-mono">Press Space to Toggle</div>
            </div>
          </div>

          {/* Primary Controls Row */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleStartPause}
                className={`col-span-2 py-3.5 rounded-xl font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                  isRunning
                    ? 'bg-amber-400 hover:bg-amber-300 text-black'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>PAUSE [SPACE]</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>START SPRINT [SPACE]</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="col-span-1 py-3.5 rounded-xl bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="Reset timer to preset minutes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>

              <button
                onClick={() => handleOpenRetrospective()}
                className="col-span-1 py-3.5 rounded-xl bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="Log this session now"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>FINISH</span>
              </button>
            </div>

            <button
              onClick={() => handleOpenRetrospective()}
              className="w-full py-2.5 rounded-xl bg-[#08140c] hover:bg-emerald-950 border border-emerald-600/80 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>LOG SESSION & RECORD TO POMODORO AUDIT</span>
            </button>
          </div>

          {/* Distractions Counter Card */}
          <div className="p-3.5 rounded-xl bg-[#080E0B] border border-[#16291C] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400 uppercase">Distractions & Interruptions</span>
              <span className="text-rose-400 font-bold">{distractions} Recorded</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Every time your mind wanders or you check notifications, tap +1 Distraction to track pure flow quality.
            </p>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleAddDistraction}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900 text-xs font-bold text-rose-300 transition-all cursor-pointer active:scale-95"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>+1 Distraction</span>
              </button>

              <button
                onClick={() => setDistractions(0)}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Reset Distractions
              </button>
            </div>
          </div>

          {/* Sprint Objectives Checklist */}
          <div className="p-3.5 rounded-xl bg-[#080E0B] border border-[#16291C] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SPRINT OBJECTIVES SCOPE</span>
              </div>
              <button
                onClick={() => setIsAddingObjective(!isAddingObjective)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingObjective ? 'Cancel' : '+ Add Goal'}</span>
              </button>
            </div>

            {isAddingObjective && (
              <form onSubmit={handleAddObjective} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Peterson Algorithm proof"
                  value={newObjectiveText}
                  onChange={(e) => setNewObjectiveText(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs cursor-pointer"
                >
                  Add
                </button>
              </form>
            )}

            <div className="space-y-1.5">
              {objectives.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    obj.done
                      ? 'bg-[#050f08] border-emerald-900/60 text-slate-400'
                      : 'bg-[#040806] border-[#132418] text-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleObjective(obj.id)}
                    className="flex items-center gap-2.5 text-xs text-left flex-1 cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        obj.done
                          ? 'bg-emerald-500 border-emerald-400 text-black font-bold'
                          : 'border-slate-600 bg-black'
                      }`}
                    >
                      {obj.done && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={obj.done ? 'line-through text-slate-500' : 'text-slate-200'}>
                      {obj.text}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteObjective(obj.id)}
                    className="text-slate-600 hover:text-rose-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reflection & Commit Modal */}
      {showReflectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono">
          <div className="w-full max-w-lg rounded-2xl bg-[#080E0B] border border-emerald-500/80 p-5 text-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Log Sprint Retrospective & Doubts
                </h3>
              </div>
              <button
                onClick={() => setShowReflectionModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target and Duration Chips */}
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="px-2.5 py-1 rounded bg-[#0c1811] border border-[#1a3322] text-slate-300 truncate">
                Target: {taskGoal}
              </span>
              <span className="px-2.5 py-1 rounded bg-[#0c1811] border border-[#1a3322] text-emerald-400 font-bold shrink-0">
                Duration: {completedMinutesForLog}m {completedSecondsForLog}s
              </span>
            </div>

            {/* Session Quality Rating Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Session Quality Rating</span>
                <span className="text-emerald-400 text-[11px]">
                  Based on {distractions} distraction{distractions !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { q: 'High Flow', dist: '0 Distractions' },
                  { q: 'Solid', dist: '1-2 Distractions' },
                  { q: 'Distracted', dist: '3+ Distractions' },
                ].map((item) => (
                  <button
                    key={item.q}
                    type="button"
                    onClick={() => setQuality(item.q as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      quality === item.q
                        ? 'bg-[#0b1810] border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-[#040806] border-[#132418] text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{item.q}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.dist}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Doubts to Review Later */}
            <div className="p-3 rounded-xl bg-[#040806] border border-[#132418] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Notes, Doubts & Takeaways</span>
                <span className="text-emerald-400 text-[10px]">Google Sheets Col M</span>
              </div>
              <textarea
                rows={3}
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                placeholder="What did you learn? Any doubts or formulas to review later?"
                className="w-full p-2.5 rounded-lg bg-[#020403] border border-[#16291C] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
              />

              {/* Tags Row */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-bold"
                  >
                    {t}
                  </span>
                ))}

                {isAddingTag ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="#Tag"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      className="px-2 py-0.5 rounded bg-black border border-slate-700 text-xs text-white w-20 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleAddTag}
                      className="text-xs text-emerald-400 font-bold px-1 cursor-pointer"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingTag(true)}
                    className="px-2 py-0.5 rounded border border-dashed border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                  >
                    + Add Tag
                  </button>
                )}
              </div>
            </div>

            {/* Commit Button */}
            <button
              onClick={handleCommitSession}
              className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Cloud className="w-4 h-4 fill-current" />
              <span>[ ↵ COMMIT SESSION & LOG TO POMODORO AUDIT ]</span>
            </button>

            {/* Discard link */}
            <div className="text-center pt-1">
              <button
                onClick={() => setShowReflectionModal(false)}
                className="text-slate-500 hover:text-rose-400 text-xs cursor-pointer"
              >
                ✕ Discard Without Logging
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
