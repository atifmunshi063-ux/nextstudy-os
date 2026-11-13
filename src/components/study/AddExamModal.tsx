import React, { useState } from 'react';
import { examTierService } from '../../services/examTierService';
import { examTargetService } from '../../services/examTargetService';
import { storageService } from '../../services/storage';
import { X, Sparkles, BookOpen, Calendar, Target } from 'lucide-react';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamAdded: (tierId: string, initialSubjectCode: string) => void;
}

const EMOJI_OPTIONS = ['🎯', '🚀', '🛰️', '🔬', '🏛️', '💼', '🎓', '⚡', '🛡️', '🏆', '📖', '⚙️', '🌟'];

export const AddExamModal: React.FC<AddExamModalProps> = ({ isOpen, onClose, onExamAdded }) => {
  const [examName, setExamName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [description, setDescription] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [targetDate, setTargetDate] = useState('');

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setExamName(val);
    if (!subjectCode || subjectCode.startsWith('Sub_')) {
      const clean = val.replace(/[^a-zA-Z0-9]/g, '');
      if (clean) {
        setSubjectCode(`Sub_${clean.slice(0, 10)}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim()) return;

    const finalSubName = subjectName.trim() || `${examName.trim()} Core Syllabus`;
    const finalSubCode = subjectCode.trim() || `Sub_${examName.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;

    // 1. Register new exam tier
    const newTier = examTierService.addExamTier(
      examName.trim(),
      icon,
      description.trim() || `${examName.trim()} Target Syllabus & PYQs`,
      finalSubCode
    );

    // 2. Create initial subject in storage with the actual newTier.id
    const createdSubject = storageService.createSubject(
      finalSubCode,
      finalSubName,
      newTier.id,
      description.trim() || `${examName.trim()} Preparation Syllabus`
    );

    // 3. Create dynamic exam on Google Sheets as well
    storageService.createExam(examName.trim(), icon, description.trim(), targetDate);

    // 3. Optional: Add countdown target to Dashboard if date provided
    if (targetDate) {
      examTargetService.addCustomTarget({
        title: examName.trim(),
        date: targetDate,
        badge: `${icon} Competitive Target`,
      });
    }

    onExamAdded(newTier.id, createdSubject.code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono">
      <div className="w-full max-w-md rounded-2xl bg-[#080E0B] border border-emerald-500/80 p-5 text-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Add New Exam / Target
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Icon Selector */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
              Exam Icon Badge
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition-all cursor-pointer ${
                    icon === emoji
                      ? 'bg-emerald-500/30 border-emerald-400 scale-110 shadow-sm'
                      : 'bg-[#040806] border-[#14261a] hover:border-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Exam Name */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
              Exam Name / Target Title *
            </label>
            <input
              type="text"
              required
              value={examName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. ISRO Scientist, UPSC ESE, BARC, CAT, Sem 4"
              className="w-full px-3 py-2 rounded-xl bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
              Description / Target Subtitle
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Technical Engineering & General Science Syllabus"
              className="w-full px-3 py-2 rounded-xl bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Initial Subject */}
          <div className="p-3 rounded-xl bg-[#040806] border border-[#132418] space-y-2">
            <div className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Initial Subject To Track</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] text-slate-400 uppercase mb-0.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Radar & Microwave Systems"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#09120c] border border-[#1a3322] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 uppercase mb-0.5">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="Sub_Radar"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#09120c] border border-[#1a3322] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Target Countdown Date (Optional) */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center justify-between">
              <span>Exam Date Countdown (Optional)</span>
              <span className="text-emerald-400 text-[9px]">Shows on Dashboard</span>
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#16291C]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold transition-all shadow-md cursor-pointer"
            >
              Create Exam Tracker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
