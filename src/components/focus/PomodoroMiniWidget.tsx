import React from 'react';
import { Play, Pause, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { PomodoroSession } from '../../types';
import { getLocalDateString } from '../../utils/date';

interface PomodoroMiniWidgetProps {
  onGoToFocus: () => void;
  recentSessions: PomodoroSession[];
}

export const PomodoroMiniWidget: React.FC<PomodoroMiniWidgetProps> = ({
  onGoToFocus,
  recentSessions,
}) => {
  const todayStr = getLocalDateString();
  const todaySessions = recentSessions.filter((s) => s.date === todayStr);
  const totalMins = todaySessions.reduce((acc, s) => acc + s.minutes, 0);

  return (
    <div className="space-y-4">
      {/* Quick Launch Card */}
      <div className="p-4 rounded-2xl bg-[#111813] border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white tracking-wide uppercase">
              Pomodoro Focus Timer
            </h4>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-medium">Ready</span>
        </div>

        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Standard 25m Pomodoros or 50m deep work intervals with live distraction logging.
        </p>

        <button
          onClick={onGoToFocus}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-md shadow-emerald-950 transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Open Full Timer</span>
        </button>
      </div>

      {/* Today Scorecard Mini */}
      <div className="p-4 rounded-2xl bg-[#111813] border border-slate-800 shadow-lg space-y-3">
        <h4 className="text-xs font-bold text-white tracking-wide uppercase">
          Today's Focus Log
        </h4>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Total Minutes</span>
          <span className="font-mono font-bold text-emerald-400">{totalMins}m</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Sessions Completed</span>
          <span className="font-mono font-bold text-white">{todaySessions.length}</span>
        </div>

        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <span>Desktop Spacebar:</span>
            <span className="font-mono text-slate-400">Play/Pause</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Cmd+K:</span>
            <span className="font-mono text-slate-400">Subject Search</span>
          </div>
        </div>
      </div>
    </div>
  );
};
