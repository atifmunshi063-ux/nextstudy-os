import React from 'react';
import { X, AlertTriangle, Link2Off, Trash2, ShieldCheck, CloudOff } from 'lucide-react';

interface SmartSubjectDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectCode: string;
  subjectName: string;
  tierId: string;
  tierLabel: string;
  linkedTiers: { id: string; label: string }[];
  onUnlink: () => void;
  onDeletePermanently: () => void;
}

export const SmartSubjectDeleteModal: React.FC<SmartSubjectDeleteModalProps> = ({
  isOpen,
  onClose,
  subjectCode,
  subjectName,
  tierLabel,
  linkedTiers,
  onUnlink,
  onDeletePermanently,
}) => {
  if (!isOpen) return null;

  const otherTiers = linkedTiers.filter((t) => t.label !== tierLabel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono">
      <div className="w-full max-w-lg rounded-2xl bg-[#080E0B] border border-amber-500/80 p-5 text-slate-200 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Manage Subject Deletion
              </h3>
              <p className="text-[10px] text-slate-400">
                Choose how you want to remove <span className="text-amber-300 font-bold">{subjectName}</span> ({subjectCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shared Exams Badge Info */}
        {otherTiers.length > 0 ? (
          <div className="p-3 rounded-xl bg-[#040806] border border-[#16291C] text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Exam Shared Subject</span>
            </div>
            <p className="text-[11px] text-slate-400">
              This subject is also connected to:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {otherTiers.map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-[10px] font-semibold text-emerald-300"
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#040806] border border-[#16291C] text-xs space-y-1">
            <p className="text-[11px] text-slate-400">
              This subject is currently only connected to <span className="text-white font-bold">{tierLabel}</span>.
            </p>
          </div>
        )}

        {/* Choice 1: Unlink from this Exam only */}
        <div className="p-4 rounded-xl bg-[#040806] border border-[#16291C] hover:border-emerald-500/50 transition-colors space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                <Link2Off className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-white text-xs">
                Option 1: Unlink from {tierLabel} only
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-bold shrink-0">
              SAFE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Removes this subject from the <span className="text-slate-200">{tierLabel}</span> view. Your topics, checkboxes, and notes remain safe in other exams, and your Google Sheet tab remains intact.
          </p>
          <button
            type="button"
            onClick={onUnlink}
            className="w-full py-2 px-3 rounded-xl bg-[#080E0B] hover:bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:text-emerald-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Link2Off className="w-3.5 h-3.5" />
            <span>Unlink from {tierLabel}</span>
          </button>
        </div>

        {/* Choice 2: Delete Permanently Everywhere & Remove Google Sheet Tab */}
        <div className="p-4 rounded-xl bg-[#040806] border border-rose-950/80 hover:border-rose-500/60 transition-colors space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-rose-950 text-rose-400 border border-rose-800">
                <Trash2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-rose-300 text-xs">
                Option 2: Delete Permanently Everywhere & Remove Google Sheet Tab
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[9px] font-bold shrink-0">
              DESTRUCTIVE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Completely deletes this subject, wipes all its topics & checkboxes across <span className="text-rose-400 font-bold">ALL</span> exams, and queues a <span className="text-rose-400">deleteSubjectSheet</span> mutation to delete the <span className="text-white font-bold">{subjectCode}</span> tab from Google Sheets.
          </p>
          <button
            type="button"
            onClick={onDeletePermanently}
            className="w-full py-2 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CloudOff className="w-3.5 h-3.5" />
            <span>Delete Permanently Everywhere & Remove Sheet</span>
          </button>
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
