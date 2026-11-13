import React, { useState, useMemo } from 'react';
import { Habit } from '../../types';
import { storageService } from '../../services/storage';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { Plus, Calendar, TrendingUp, Award, CheckCircle, Trash2 } from 'lucide-react';

interface WeeklyHabitTrackerProps {
  habits: Habit[];
  onHabitsChange?: () => void;
  onOpenAddHabit: () => void;
}

export const WeeklyHabitTracker: React.FC<WeeklyHabitTrackerProps> = ({
  habits,
  onHabitsChange,
  onOpenAddHabit,
}) => {
  const [deletingHabit, setDeletingHabit] = useState<{ id: number; description: string } | null>(null);
  const today = useMemo(() => new Date(), []);
  const todayDayNumber = today.getDate(); // 1 to 31

  const executeDelete = () => {
    if (!deletingHabit) return;
    storageService.deleteHabit(deletingHabit.id);
    if (onHabitsChange) onHabitsChange();
    setDeletingHabit(null);
  };

  // Define the 5 Month Intervals
  const weeks = useMemo(
    () => [
      { name: 'Week 1', range: 'Days 1–7', start: 1, end: 7, totalDays: 7 },
      { name: 'Week 2', range: 'Days 8–14', start: 8, end: 14, totalDays: 7 },
      { name: 'Week 3', range: 'Days 15–21', start: 15, end: 21, totalDays: 7 },
      { name: 'Week 4', range: 'Days 22–28', start: 22, end: 28, totalDays: 7 },
      { name: 'Final Days', range: 'Days 29–31', start: 29, end: 31, totalDays: 3 },
    ],
    []
  );

  // Compute stats per week across all habits
  const weekAggregateStats = useMemo(() => {
    return weeks.map((w) => {
      let doneCount = 0;
      const possibleChecks = habits.length * w.totalDays;

      habits.forEach((h) => {
        for (let d = w.start; d <= w.end; d++) {
          if (h.checks[d - 1]) doneCount++;
        }
      });

      const pct = possibleChecks > 0 ? Math.round((doneCount / possibleChecks) * 100) : 0;
      const isCurrent = todayDayNumber >= w.start && todayDayNumber <= w.end;

      return {
        ...w,
        doneCount,
        possibleChecks,
        pct,
        isCurrent,
      };
    });
  }, [habits, weeks, todayDayNumber]);

  return (
    <div className="space-y-4 font-mono text-slate-200">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-bold uppercase">WEEKLY PROGRESS SUMMARY</span>
            <span className="text-emerald-400 font-bold">• 4 Weeks + Final Days</span>
          </div>
          <div className="text-base sm:text-lg font-black text-white mt-1">
            Calculated Habit Performance
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Dynamically calculated from your live 31-day Monthly Tracker checkmarks.
          </div>
        </div>

        <button
          onClick={onOpenAddHabit}
          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>(+) Add Habit</span>
        </button>
      </div>

      {/* 5 Period Milestone Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {weekAggregateStats.map((w) => (
          <div
            key={w.name}
            className={`p-3 rounded-xl border transition-all ${
              w.isCurrent
                ? 'bg-[#0a180f] border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-[#080E0B] border-[#16291C]'
            }`}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-white">{w.name}</span>
              {w.isCurrent && (
                <span className="px-1 py-0.2 rounded bg-emerald-400 text-black text-[9px] font-extrabold">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{w.range}</div>
            <div className="text-xl font-black text-emerald-400 mt-2 font-mono tabular-nums">
              {w.pct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {w.doneCount}/{w.possibleChecks} checks
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${w.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Calculated Breakdown Table Per Habit */}
      <div className="rounded-xl border border-[#16291C] bg-[#080E0B] overflow-hidden shadow-xl">
        <div className="p-3 border-b border-[#132418] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Habit-by-Habit Weekly Breakdown
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {habits.length} Habit{habits.length !== 1 ? 's' : ''} Tracked
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#050907] border-b border-[#132418] text-[10px] text-slate-400 font-bold uppercase">
                <th className="p-3">Habit Description</th>
                <th className="p-3 text-center min-w-[90px]">Week 1 (1–7)</th>
                <th className="p-3 text-center min-w-[90px]">Week 2 (8–14)</th>
                <th className="p-3 text-center min-w-[90px]">Week 3 (15–21)</th>
                <th className="p-3 text-center min-w-[90px]">Week 4 (22–28)</th>
                <th className="p-3 text-center min-w-[90px]">Final (29–31)</th>
                <th className="p-3 text-center min-w-[90px]">Total Progress</th>
                <th className="p-3 text-center w-10">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101e14]">
              {habits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                    No habits tracked. Auto-generation has been permanently disabled. Tap (+) Add Habit to create your own.
                  </td>
                </tr>
              ) : (
                habits.map((habit, hIdx) => {
                  const w1Done = habit.checks.slice(0, 7).filter(Boolean).length;
                  const w2Done = habit.checks.slice(7, 14).filter(Boolean).length;
                  const w3Done = habit.checks.slice(14, 21).filter(Boolean).length;
                  const w4Done = habit.checks.slice(21, 28).filter(Boolean).length;
                  const finalDone = habit.checks.slice(28, 31).filter(Boolean).length;

                  return (
                    <tr key={`${habit.id}-${hIdx}`} className="hover:bg-[#0b140e] transition-colors">
                      <td className="p-3 border-r border-[#132418]">
                        <div className="font-semibold text-white truncate max-w-[240px]">
                          {habit.description}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {habit.category} • Target: {habit.targetDays}d
                        </div>
                      </td>

                      {/* Week 1 */}
                      <td className="p-2.5 text-center border-r border-[#132418]">
                        <span className="font-bold text-white tabular-nums">{w1Done}</span>
                        <span className="text-slate-500">/7</span>
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                          {Math.round((w1Done / 7) * 100)}%
                        </div>
                      </td>

                      {/* Week 2 */}
                      <td className="p-2.5 text-center border-r border-[#132418]">
                        <span className="font-bold text-white tabular-nums">{w2Done}</span>
                        <span className="text-slate-500">/7</span>
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                          {Math.round((w2Done / 7) * 100)}%
                        </div>
                      </td>

                      {/* Week 3 */}
                      <td className="p-2.5 text-center border-r border-[#132418]">
                        <span className="font-bold text-white tabular-nums">{w3Done}</span>
                        <span className="text-slate-500">/7</span>
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                          {Math.round((w3Done / 7) * 100)}%
                        </div>
                      </td>

                      {/* Week 4 */}
                      <td className="p-2.5 text-center border-r border-[#132418]">
                        <span className="font-bold text-white tabular-nums">{w4Done}</span>
                        <span className="text-slate-500">/7</span>
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                          {Math.round((w4Done / 7) * 100)}%
                        </div>
                      </td>

                      {/* Final Days */}
                      <td className="p-2.5 text-center border-r border-[#132418]">
                        <span className="font-bold text-white tabular-nums">{finalDone}</span>
                        <span className="text-slate-500">/3</span>
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                          {Math.round((finalDone / 3) * 100)}%
                        </div>
                      </td>

                      {/* Total Progress */}
                      <td className="p-2.5 text-center">
                        <div className="font-black text-emerald-400 font-mono">
                          {habit.totalDone}/{habit.targetDays}
                        </div>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-1 ${
                            habit.totalDone >= habit.targetDays
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : habit.totalDone > 0
                              ? 'bg-[#09160e] text-slate-300 border border-[#14291c]'
                              : 'bg-slate-900 text-slate-500'
                          }`}
                        >
                          {habit.completionPct}%
                        </span>
                      </td>

                      {/* Delete Action */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setDeletingHabit({ id: habit.id, description: habit.description })}
                          title="Delete habit"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingHabit}
        title="Delete Habit"
        message="Are you sure you want to remove this habit from your weekly tracking breakdown?"
        itemName={deletingHabit?.description}
        confirmText="Yes, Delete Habit"
        onConfirm={executeDelete}
        onClose={() => setDeletingHabit(null)}
      />
    </div>
  );
};
