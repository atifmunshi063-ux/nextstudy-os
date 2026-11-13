import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storage';
import { MistakeEntry } from '../../types';
import { X, AlertTriangle, Lightbulb, Search, BookOpen, Save, ShieldAlert } from 'lucide-react';

interface LogMistakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMistakeAdded?: (mistake: MistakeEntry) => void;
  defaultSubject?: string;
  defaultTopic?: string;
}

const SUBJECT_OPTIONS = [
  'Sub_DBMS',
  'Sub_DSA',
  'Sub_OS',
  'Sub_COA',
  'Sub_Python',
  'Sub_ProbStats',
  'Sub_CN',
  'Sub_Algorithms',
  'Sub_TOC',
  'Sub_DiscreteMath',
  'Sub_Cpp',
  'Sub_Java',
  'Sub_WebDev',
  'Sub_SystemDesign',
  'Sub_InterviewPrep',
  'Sub_Aptitude',
  'General / Mock Test',
];

const SOURCE_OPTIONS = [
  'GATE PYQ Practice',
  'LeetCode / Contest',
  'Semester 3 Viva / Internal',
  'College Lab Practical',
  'Mock Test Full Length',
  'Codeforces / Platform',
];

export const LogMistakeModal: React.FC<LogMistakeModalProps> = ({
  isOpen,
  onClose,
  onMistakeAdded,
  defaultSubject,
  defaultTopic,
}) => {
  const [subject, setSubject] = useState(defaultSubject || 'Sub_OS');
  const [topic, setTopic] = useState(defaultTopic || '');
  const [source, setSource] = useState('GATE PYQ Practice');
  const [severity, setSeverity] = useState<'High' | 'Medium' | 'Low'>('High');
  const [trap, setTrap] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [goldenRule, setGoldenRule] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (defaultSubject) setSubject(defaultSubject);
      if (defaultTopic) setTopic(defaultTopic);
    }
  }, [isOpen, defaultSubject, defaultTopic]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trap.trim() || !rootCause.trim() || !goldenRule.trim()) return;

    const newEntry = storageService.logMistake({
      subject,
      topic: topic.trim() || 'General Concept',
      source,
      severity,
      trap: trap.trim(),
      rootCause: rootCause.trim(),
      goldenRule: goldenRule.trim(),
    });

    if (onMistakeAdded) {
      onMistakeAdded(newEntry);
    }

    setTrap('');
    setRootCause('');
    setGoldenRule('');
    setTopic('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono">
      <div className="w-full max-w-xl rounded-2xl bg-[#080E0B] border border-rose-500/80 p-5 text-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded border border-rose-800 bg-rose-950/60 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Mistake Diary</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
                  Google Sheets Sync
                </span>
              </h3>
              <div className="text-[10px] text-slate-400">
                Record exam questions and mistakes to review before test day (Cmd+M)
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#040806] border border-[#132418] text-xs text-white focus:outline-none focus:border-rose-500"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                Source Context
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#040806] border border-[#132418] text-xs text-white focus:outline-none focus:border-rose-500"
              >
                {SOURCE_OPTIONS.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                Severity
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['High', 'Medium', 'Low'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`py-1.5 text-[11px] font-bold rounded border transition-colors cursor-pointer ${
                      severity === s
                        ? s === 'High'
                          ? 'bg-rose-950 text-rose-300 border-rose-500 font-extrabold'
                          : s === 'Medium'
                          ? 'bg-amber-950 text-amber-300 border-amber-500 font-extrabold'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-500 font-extrabold'
                        : 'bg-[#040806] border-[#132418] text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-1">
              Topic / Question Identifier
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Peterson Algorithm Turn Variable, B+ Tree Order, LeetCode 207 cycle test"
              className="w-full px-3 py-1.5 rounded bg-[#040806] border border-[#132418] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* 3-Field Trap Diary Modal */}
          <div className="space-y-3">
            {/* Field 1: The Trap */}
            <div className="p-3 rounded-xl bg-[#0e0708] border border-rose-900/60 space-y-1">
              <label className="block text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <span>❌ 1. What I Did Wrong (The Trap)</span>
              </label>
              <textarea
                required
                rows={2}
                value={trap}
                onChange={(e) => setTrap(e.target.value)}
                placeholder="What false assumption did I make? Where did my hand or intuition slip?"
                className="w-full p-2 rounded-lg bg-[#050203] border border-rose-950 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 leading-relaxed font-mono"
              />
            </div>

            {/* Field 2: Root Cause Analysis */}
            <div className="p-3 rounded-xl bg-[#0f0c05] border border-amber-900/60 space-y-1">
              <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>🔍 2. Root Cause Analysis (Why the logic failed)</span>
              </label>
              <textarea
                required
                rows={2}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Deep conceptual gap, off-by-one index, concurrency race condition, or memory model misunderstanding?"
                className="w-full p-2 rounded-lg bg-[#050401] border border-amber-950 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed font-mono"
              />
            </div>

            {/* Field 3: Permanent Corrective Rule */}
            <div className="p-3 rounded-xl bg-[#06110a] border border-emerald-900/60 space-y-1">
              <label className="block text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span>💡 3. Permanent Corrective Rule (The unbreakable takeaway)</span>
              </label>
              <textarea
                required
                rows={2}
                value={goldenRule}
                onChange={(e) => setGoldenRule(e.target.value)}
                placeholder="The immutable invariant I must verify before writing a single line of code next time."
                className="w-full p-2 rounded-lg bg-[#020603] border border-emerald-950 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#132418]">
            <span className="text-[10px] text-slate-500">
              * Appends immediately to Google Sheets with bidirectional sync.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg bg-[#0b140e] hover:bg-[#122218] border border-[#1a3322] text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 fill-current" />
                <span>Save to Mistake Diary</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
