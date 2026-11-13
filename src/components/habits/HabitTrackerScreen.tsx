import React, { useState } from 'react';
import { Habit, HabitCategory } from '../../types';
import { storageService } from '../../services/storage';
import { MonthlyHabitTracker } from '../today/MonthlyHabitTracker';
import { WeeklyHabitTracker } from '../today/WeeklyHabitTracker';
import { AddHabitModal } from '../today/AddHabitModal';
import { Calendar, LayoutGrid, CheckSquare, Plus } from 'lucide-react';

interface HabitTrackerScreenProps {
  habits: Habit[];
  onHabitsChange: () => void;
}

export const HabitTrackerScreen: React.FC<HabitTrackerScreenProps> = ({
  habits,
  onHabitsChange,
}) => {
  const [subView, setSubView] = useState<'monthly' | 'weekly'>('monthly');
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);

  const handleAddHabit = (category: HabitCategory, description: string, targetDays: number) => {
    storageService.addHabit(category, description, targetDays);
    onHabitsChange();
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12 max-w-5xl mx-auto font-mono text-slate-200">
      {/* Sub-Navigation Switcher Bar */}
      <div className="p-1.5 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => setSubView('monthly')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              subView === 'monthly'
                ? 'bg-emerald-500 text-black font-extrabold shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-[#0c1610]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Monthly Tracker (1–31)</span>
          </button>

          <button
            onClick={() => setSubView('weekly')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              subView === 'weekly'
                ? 'bg-emerald-500 text-black font-extrabold shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-[#0c1610]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Tracker Summary</span>
          </button>
        </div>

        <button
          onClick={() => setIsAddHabitOpen(true)}
          className="px-3 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">(+) Add Habit</span>
          <span className="sm:hidden">(+) Habit</span>
        </button>
      </div>

      {/* Active Sub-View */}
      {subView === 'monthly' ? (
        <MonthlyHabitTracker
          habits={habits}
          onHabitsChange={onHabitsChange}
          onOpenAddHabit={() => setIsAddHabitOpen(true)}
        />
      ) : (
        <WeeklyHabitTracker
          habits={habits}
          onHabitsChange={onHabitsChange}
          onOpenAddHabit={() => setIsAddHabitOpen(true)}
        />
      )}

      {/* Add Habit Modal */}
      <AddHabitModal
        isOpen={isAddHabitOpen}
        onClose={() => setIsAddHabitOpen(false)}
        onAdd={handleAddHabit}
      />
    </div>
  );
};
