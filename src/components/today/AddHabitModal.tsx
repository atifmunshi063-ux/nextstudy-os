import React, { useState } from 'react';
import { HabitCategory } from '../../types';
import { X, Plus, Target } from 'lucide-react';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (category: HabitCategory, description: string, targetDays: number) => void;
}

const CATEGORIES: HabitCategory[] = [
  'DSA, LeetCode & Competitive Coding',
  'Academics, Semester & Core Engineering',
  'GATE CSE & Competitive Exam Practice',
  'Systems, Projects & Dev Skills',
  'Health, Fitness & Sleep',
  'Mindset, Discipline, Reading & Routine',
];

export const AddHabitModal: React.FC<AddHabitModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [category, setCategory] = useState<HabitCategory>('DSA, LeetCode & Competitive Coding');
  const [description, setDescription] = useState('');
  const [targetDays, setTargetDays] = useState(22);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onAdd(category, description.trim(), targetDays);
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#0e1410] border border-slate-800 shadow-2xl p-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Add New Daily Habit</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Habit Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 text-xs font-medium rounded-xl border text-left transition-colors ${
                    category === cat
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-[#111813] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Habit Description
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Solve 2 LeetCode Mediums on Trees"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141d17] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Monthly Target Days: <span className="font-mono text-emerald-400">{targetDays} days</span>
              </label>
              <span className="text-[11px] text-slate-500">out of 31</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="31"
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[15, 22, 28, 31].map((days) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => setTargetDays(days)}
                  className={`flex-1 py-1 text-[11px] rounded-lg border font-mono transition-colors ${
                    targetDays === days
                      ? 'bg-emerald-900/50 border-emerald-600 text-emerald-300'
                      : 'bg-[#111813] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Add to Tracker</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
