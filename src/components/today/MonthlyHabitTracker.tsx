import React, { useState, useMemo } from 'react';
import { Habit, HabitCategory } from '../../types';
import { storageService } from '../../services/storage';
import { soundService } from '../../services/audio';
import { triggerConfetti } from '../../services/confetti';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { Check, Plus, Search, Calendar, ChevronRight, Trash2 } from 'lucide-react';

interface MonthlyHabitTrackerProps {
  habits: Habit[];
  onHabitsChange: () => void;
  onOpenAddHabit: () => void;
}

export const MonthlyHabitTracker: React.FC<MonthlyHabitTrackerProps> = ({
  habits,
  onHabitsChange,
  onOpenAddHabit,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | HabitCategory>('All');
  const [deletingHabit, setDeletingHabit] = useState<{ id: number; description: string } | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const todayDayNumber = new Date().getDate();

  const handleToggle = (habitId: number, day: number) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const currentVal = habit.checks[day - 1];
    const nextVal = !currentVal;

    if (nextVal) {
      soundService.playCheckSound();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
      if (habit.totalDone + 1 >= habit.targetDays) {
        triggerConfetti();
      }
    }

    storageService.toggleHabit(habitId, day, nextVal);
    onHabitsChange();
  };

  const executeDelete = () => {
    if (!deletingHabit) return;
    storageService.deleteHabit(deletingHabit.id);
    onHabitsChange();
    setDeletingHabit(null);
  };

  const handleDeleteAllConfirm = () => {
    storageService.deleteAllHabits();
    onHabitsChange();
    setIsDeleteAllOpen(false);
  };

  const filtered = useMemo(() => {
    return habits.filter((h) => {
      if (categoryFilter !== 'All' && h.category !== categoryFilter) return false;
      if (search.trim() && !h.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [habits, categoryFilter, search]);

  // Compute daily totals for all 31 days
  const dailyTotals = useMemo(() => {
    const totals = new Array(31).fill(0);
    habits.forEach((h) => {
      h.checks.forEach((c, idx) => {
        if (c) totals[idx]++;
      });
    });
    return totals;
  }, [habits]);

  return (
    <div className="space-y-3 font-mono text-slate-200">
      {/* Header with Search and Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search habits..."
              className="w-full px-3 py-1.5 pl-8 rounded bg-[#040806] border border-[#132418] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2" />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded bg-[#040806] border border-[#132418] text-xs text-slate-300 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Health, Fitness & Sleep">Health & Routine</option>
            <option value="Academics, Semester & Core Engineering">Academics & CSE</option>
            <option value="DSA, LeetCode & Competitive Coding">DSA & LeetCode</option>
            <option value="Systems, Projects & Dev Skills">Systems & Dev</option>
            <option value="GATE CSE & Competitive Exam Practice">GATE CSE</option>
            <option value="Mindset, Discipline, Reading & Routine">Mindset & Reading</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {habits.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDeleteAllOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Delete all habits permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Habits</span>
            </button>
          )}

          <button
            onClick={onOpenAddHabit}
            className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>(+) Add Habit</span>
          </button>
        </div>
      </div>

      {/* When no habits exist */}
      {habits.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#080E0B] border border-[#16291C] text-slate-500 text-xs space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#050907] border border-[#132418] flex items-center justify-center text-slate-600 mx-auto">
            <Calendar className="w-6 h-6 text-slate-600" />
          </div>
          <div className="text-white font-bold text-sm">No Habits Tracked</div>
          <p className="text-slate-400 max-w-md mx-auto text-xs leading-relaxed">
            All habits have been cleared and auto-generation has been permanently disabled. You can create your own custom habits whenever you wish.
          </p>
          <button
            onClick={onOpenAddHabit}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>(+) Add Your First Habit</span>
          </button>
        </div>
      ) : (
        /* 31-Day Matrix Table */
        <div className="rounded-xl border border-[#16291C] bg-[#080E0B] overflow-hidden shadow-xl">
        <div className="overflow-x-auto no-scrollbar max-w-full">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#050907] border-b border-[#132418] text-[10px] text-slate-400 font-bold uppercase">
                <th className="p-2.5 sticky left-0 z-20 bg-[#050907] min-w-[220px]">
                  Habit Description ({filtered.length})
                </th>
                <th className="p-2 text-center min-w-[45px]">Tgt</th>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isToday = day === todayDayNumber;
                  return (
                    <th
                      key={day}
                      className={`p-1 text-center min-w-[28px] ${
                        isToday ? 'bg-emerald-950/80 text-emerald-400 font-extrabold border-x border-emerald-700/60' : ''
                      }`}
                    >
                      {day}
                    </th>
                  );
                })}
                <th className="p-2 text-center min-w-[55px]">Done</th>
                <th className="p-2 text-center min-w-[65px]">%</th>
                <th className="p-2.5 text-center min-w-[130px]">Status</th>
                <th className="p-2 text-center w-10">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101e14]">
              {filtered.map((habit, hIdx) => (
                <tr key={`${habit.id}-${hIdx}`} className="hover:bg-[#0b140e] transition-colors">
                  {/* Habit Name / Sticky Header Column */}
                  <td className="p-2.5 sticky left-0 z-10 bg-[#080E0B] border-r border-[#132418]">
                    <div className="font-semibold text-white truncate max-w-[210px]" title={habit.description}>
                      {habit.description}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {habit.category.split(',')[0]}
                    </div>
                  </td>

                  {/* Target Days */}
                  <td className="p-2 text-center font-bold text-slate-400">
                    {habit.targetDays}d
                  </td>

                  {/* 31 Days Checkboxes */}
                  {habit.checks.map((isChecked, dIdx) => {
                    const dayNum = dIdx + 1;
                    const isToday = dayNum === todayDayNumber;

                    return (
                      <td
                        key={dIdx}
                        onClick={() => handleToggle(habit.id, dayNum)}
                        className={`p-1 text-center cursor-pointer transition-colors ${
                          isToday ? 'bg-emerald-950/40 border-x border-emerald-800/40' : ''
                        }`}
                      >
                        <div
                          className={`w-5 h-5 mx-auto rounded flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-emerald-500 text-black shadow-xs font-bold'
                              : 'bg-[#040806] border border-[#14261a] hover:border-slate-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </td>
                    );
                  })}

                  {/* Total Done */}
                  <td className="p-2 text-center font-bold text-emerald-400">
                    {habit.totalDone}
                  </td>

                  {/* Completion Pct */}
                  <td className="p-2 text-center">
                    <span className="font-bold text-white">{habit.completionPct}%</span>
                  </td>

                  {/* Status Badge */}
                  <td className="p-2.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block whitespace-nowrap ${
                        habit.status.includes('Target')
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                          : habit.status.includes('Streak')
                          ? 'bg-amber-950 text-amber-300 border-amber-600'
                          : habit.status.includes('Active')
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {habit.status}
                    </span>
                  </td>

                  {/* Delete Action */}
                  <td className="p-2 text-center">
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
              ))}

              {/* Total Row */}
              <tr className="bg-[#050907] border-t-2 border-emerald-900/60 font-bold text-[11px]">
                <td className="p-2.5 sticky left-0 z-10 bg-[#050907] border-r border-[#132418] text-emerald-400 uppercase">
                  Daily Done Sum
                </td>
                <td className="p-2 text-center text-slate-500">-</td>
                {dailyTotals.map((tot, idx) => {
                  const dayNum = idx + 1;
                  const isToday = dayNum === todayDayNumber;
                  return (
                    <td
                      key={idx}
                      className={`p-1 text-center font-bold ${
                        isToday ? 'bg-emerald-950/80 text-emerald-300 font-extrabold border-x border-emerald-700/60' : 'text-slate-300'
                      }`}
                    >
                      {tot > 0 ? tot : '·'}
                    </td>
                  );
                })}
                <td className="p-2 text-center text-emerald-400 font-extrabold">
                  {dailyTotals.reduce((a, b) => a + b, 0)}
                </td>
                <td className="p-2 text-center text-slate-500">-</td>
                <td className="p-2.5 text-center text-[10px] text-slate-500">31-DAY MATRIX</td>
                <td className="p-2 text-center text-slate-600">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingHabit}
        title="Delete Habit"
        message="Are you sure you want to remove this habit from your monthly tracking sheet?"
        itemName={deletingHabit?.description}
        confirmText="Yes, Delete Habit"
        onConfirm={executeDelete}
        onClose={() => setDeletingHabit(null)}
      />

      {/* Confirmation Modal for deleting ALL habits */}
      <ConfirmDeleteModal
        isOpen={isDeleteAllOpen}
        title="Delete All Habits"
        message={`Are you sure you want to delete all ${habits.length} habits? Auto-generation is permanently disabled, so habits will not come back unless you add them manually.`}
        itemName={`All ${habits.length} habits`}
        confirmText="Yes, Delete All Habits"
        onConfirm={handleDeleteAllConfirm}
        onClose={() => setIsDeleteAllOpen(false)}
      />
    </div>
  );
};
