import React, { useState } from 'react';
import { X, Plus, Clock, Tag, AlertCircle } from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: {
    title: string;
    tag: string;
    durationMinutes: number;
    priority: 'high' | 'medium' | 'low';
    targetNote?: string;
  }) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('Sub_DSA');
  const [duration, setDuration] = useState<number>(25);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [targetNote, setTargetNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      tag: tag.trim() || 'Study',
      durationMinutes: duration,
      priority,
      targetNote: targetNote.trim(),
    });

    setTitle('');
    setTargetNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div className="w-full max-w-md bg-[#080E0B] border border-[#16291C] rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <h3 className="font-bold text-sm text-white">Add Planner Task</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Task Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement Dijkstra in C++ & verify complexity"
              className="w-full px-3 py-2 rounded-lg bg-[#040806] border border-[#16291C] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Subject Tag & Target Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Subject / Tag
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#040806] border border-[#16291C] text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Sub_DBMS">Sub_DBMS (Database)</option>
                <option value="Sub_OS">Sub_OS (Operating Systems)</option>
                <option value="Sub_COA">Sub_COA (Architecture)</option>
                <option value="Sub_DSA">Sub_DSA (Algorithms)</option>
                <option value="GATE CSE">GATE CSE Prep</option>
                <option value="Sem 3 Core">Sem 3 Finals</option>
                <option value="Placements">Campus Placements</option>
                <option value="General">General Study</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Sprint Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#040806] border border-[#16291C] text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={25}>25 minutes (Standard)</option>
                <option value={45}>45 minutes (In-depth)</option>
                <option value={50}>50 minutes (Deep Sprint)</option>
                <option value={60}>60 minutes (1 Hour)</option>
                <option value={90}>90 minutes (Full Session)</option>
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Priority Urgency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'high', label: 'High Priority', color: 'border-rose-500 bg-rose-950/60 text-rose-300' },
                { key: 'medium', label: 'Medium', color: 'border-amber-500 bg-amber-950/60 text-amber-300' },
                { key: 'low', label: 'Normal', color: 'border-emerald-500 bg-emerald-950/60 text-emerald-300' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => setPriority(p.key as any)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                    priority === p.key
                      ? p.color
                      : 'border-[#16291C] bg-[#040806] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Note / Details */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Target Note (Optional)
            </label>
            <input
              type="text"
              value={targetNote}
              onChange={(e) => setTargetNote(e.target.value)}
              placeholder="e.g. Target: Unit 2 • 12 Questions Recall"
              className="w-full px-3 py-2 rounded-lg bg-[#040806] border border-[#16291C] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#16291C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-[#050907] border border-[#16291C] font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
