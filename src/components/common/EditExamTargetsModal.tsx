import React, { useState, useEffect } from 'react';
import { examTargetService, ExamTargets, ExamTargetItem } from '../../services/examTargetService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { Calendar, X, Save, Clock, Target, Plus, Trash2, Sparkles } from 'lucide-react';

interface EditExamTargetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditExamTargetsModal: React.FC<EditExamTargetsModalProps> = ({ isOpen, onClose }) => {
  const [sem3Date, setSem3Date] = useState('2026-12-15');
  const [gateDate, setGateDate] = useState('2028-02-05');
  const [sem3Title, setSem3Title] = useState('BWU SEM 3 FINALS');
  const [gateTitle, setGateTitle] = useState('GATE CSE 2028');
  const [customTargets, setCustomTargets] = useState<ExamTargetItem[]>([]);
  const [deletingTarget, setDeletingTarget] = useState<{ id: string; title: string } | null>(null);

  // New exam form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newBadge, setNewBadge] = useState('Govt & Technical');

  useEffect(() => {
    if (isOpen) {
      const targets = examTargetService.getTargets();
      setSem3Date(targets.sem3Date);
      setGateDate(targets.gateDate);
      if (targets.sem3Title) setSem3Title(targets.sem3Title);
      if (targets.gateTitle) setGateTitle(targets.gateTitle);
      setCustomTargets(targets.customTargets || []);
      setIsAddingNew(false);
      setNewTitle('');
      setNewDate('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    examTargetService.saveTargets({
      sem3Date,
      gateDate,
      sem3Title: sem3Title.trim() || 'BWU SEM 3 FINALS',
      gateTitle: gateTitle.trim() || 'GATE CSE 2028',
      customTargets,
    });
    onClose();
  };

  const handleAddNewExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    const added = examTargetService.addCustomTarget({
      title: newTitle,
      date: newDate,
      badge: newBadge,
    });
    setCustomTargets((prev) => [...prev, added]);
    setNewTitle('');
    setNewDate('');
    setIsAddingNew(false);
  };

  const executeDeleteTarget = () => {
    if (!deletingTarget) return;
    examTargetService.deleteCustomTarget(deletingTarget.id);
    setCustomTargets((prev) => prev.filter((t) => t.id !== deletingTarget.id));
    setDeletingTarget(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono">
      <div className="w-full max-w-xl rounded-2xl bg-[#080E0B] border border-emerald-500/80 p-5 text-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Manage Target Exam Dates & Countdowns
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Target 1: Semester Finals */}
          <div className="p-3.5 rounded-xl bg-[#040806] border border-[#132418] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>EXAM 1 (COLLEGE SEMESTER)</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                CORE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  value={sem3Title}
                  onChange={(e) => setSem3Title(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#09120c] border border-[#1a3322] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="BWU SEM 3 FINALS"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={sem3Date}
                  onChange={(e) => setSem3Date(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#09120c] border border-[#1a3322] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Target 2: GATE CSE */}
          <div className="p-3.5 rounded-xl bg-[#040806] border border-[#132418] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>EXAM 2 (GATE CSE HORIZON)</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                CAREER TARGET
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  value={gateTitle}
                  onChange={(e) => setGateTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#09120c] border border-[#1a3322] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="GATE CSE 2028"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={gateDate}
                  onChange={(e) => setGateDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#09120c] border border-[#1a3322] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Custom Targets List (RRB, SSC, ISRO, UPSC, etc.) */}
          {customTargets.map((custom) => (
            <div
              key={custom.id}
              className="p-3.5 rounded-xl bg-[#040806] border border-[#132418] space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{custom.title}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                    {custom.badge || 'CUSTOM EXAM'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeletingTarget({ id: custom.id, title: custom.title })}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete Exam Target"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Display Label
                  </label>
                  <input
                    type="text"
                    value={custom.title}
                    onChange={(e) => {
                      const updated = customTargets.map((ct) =>
                        ct.id === custom.id ? { ...ct, title: e.target.value } : ct
                      );
                      setCustomTargets(updated);
                    }}
                    className="w-full px-2.5 py-1.5 rounded bg-[#09120c] border border-[#1a3322] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    value={custom.date}
                    onChange={(e) => {
                      const updated = customTargets.map((ct) =>
                        ct.id === custom.id ? { ...ct, date: e.target.value } : ct
                      );
                      setCustomTargets(updated);
                    }}
                    className="w-full px-2.5 py-1.5 rounded bg-[#09120c] border border-[#1a3322] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Inline Add New Exam Form */}
          {isAddingNew ? (
            <div className="p-3.5 rounded-xl bg-[#09140e] border border-emerald-500/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Add Other Target Exam</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Exam Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ISRO Scientist, UPSC ESE, WBPSC AE, CAT 2027"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                      Exam Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                      Badge / Category
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Space & Defense, Engineering, Govt"
                      value={newBadge}
                      onChange={(e) => setNewBadge(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewExam}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all cursor-pointer shadow-md"
                >
                  Save & Add to Countdowns
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/50 hover:border-emerald-400 bg-[#07130a] text-emerald-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Other Exam (ISRO, UPSC, SSC, RRB, CAT, etc.)</span>
            </button>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#16291C]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>

        {/* Delete Exam Target Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={!!deletingTarget}
          title="Delete Exam Target"
          message="Are you sure you want to remove this exam target countdown from your dashboard?"
          itemName={deletingTarget?.title}
          confirmText="Yes, Delete Target"
          onConfirm={executeDeleteTarget}
          onClose={() => setDeletingTarget(null)}
        />
      </div>
    </div>
  );
};
