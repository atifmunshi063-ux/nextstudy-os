import React, { useState } from 'react';
import { X, Plus, BookOpen, Layers } from 'lucide-react';

interface AddSubtopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectCode: string;
  onAddSubtopic: (unit: string, topic: string, subtopic: string, priority: 'High' | 'Medium' | 'Low') => void;
}

export const AddSubtopicModal: React.FC<AddSubtopicModalProps> = ({
  isOpen,
  onClose,
  subjectCode,
  onAddSubtopic,
}) => {
  const [unit, setUnit] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtopic.trim()) return;

    onAddSubtopic(
      unit.trim() || 'Unit 1: Core Fundamentals',
      topic.trim() || 'Key Concepts',
      subtopic.trim(),
      priority
    );

    setUnit('');
    setTopic('');
    setSubtopic('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono">
      <div className="w-full max-w-md rounded-2xl bg-[#080E0B] border border-emerald-500/80 p-5 text-slate-200 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded border border-emerald-800 bg-emerald-950/60 flex items-center justify-center text-emerald-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Add Subtopic to {subjectCode}
              </h3>
              <div className="text-[10px] text-slate-400">
                Creates a new row in Google Sheets with 3 interactive checkboxes
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
              Unit Name
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. Unit 2: Synchronization & Concurrency"
              className="w-full px-3 py-2 rounded bg-[#040806] border border-[#132418] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
              Topic Group
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Classical Synchronization & Peterson"
              className="w-full px-3 py-2 rounded bg-[#040806] border border-[#132418] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
              Subtopic Title *
            </label>
            <input
              type="text"
              required
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              placeholder="e.g. Peterson Solution proof & atomic test_and_set"
              className="w-full px-3 py-2 rounded bg-[#040806] border border-[#132418] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['High', 'Medium', 'Low'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 text-xs font-bold rounded border transition-colors cursor-pointer ${
                    priority === p
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500 font-extrabold shadow-sm'
                      : 'bg-[#040806] border-[#132418] text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 pt-1">
            * POSTs <code className="text-emerald-400">&#123; action: 'addSubtopic', subject: '{subjectCode}', ... &#125;</code> to live Apps Script endpoint.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#132418]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Subtopic</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
