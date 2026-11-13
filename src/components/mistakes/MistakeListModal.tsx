import React, { useState } from 'react';
import { storageService } from '../../services/storage';
import { MistakeEntry } from '../../types';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { X, Search, ShieldAlert, AlertTriangle, Lightbulb, Trash2, CheckSquare, Square } from 'lucide-react';

interface MistakeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogMistake: () => void;
}

export const MistakeListModal: React.FC<MistakeListModalProps> = ({
  isOpen,
  onClose,
  onOpenLogMistake,
}) => {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>(() => storageService.getMistakes());
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [deletingMistake, setDeletingMistake] = useState<{ id: string; label: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  if (!isOpen) return null;

  const refresh = () => setMistakes(storageService.getMistakes());

  const executeDeleteMistake = () => {
    if (!deletingMistake) return;
    storageService.deleteMistake(deletingMistake.id);
    refresh();
    setDeletingMistake(null);
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedIds.size === 0) return;
    storageService.deleteMultipleMistakes(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsBulkDeleting(false);
    refresh();
  };

  const filtered = mistakes.filter((m) => {
    if (filterSubject !== 'All' && m.subject !== filterSubject) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        m.topic.toLowerCase().includes(q) ||
        m.trap.toLowerCase().includes(q) ||
        m.rootCause.toLowerCase().includes(q) ||
        m.goldenRule.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.size >= filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono">
      <div className="w-full max-w-2xl rounded-2xl bg-[#080E0B] border border-rose-500/80 p-5 text-slate-200 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded border border-rose-800 bg-rose-950/60 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Mistake Diary</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
                  {mistakes.length} LOGGED
                </span>
              </h3>
              <div className="text-[10px] text-slate-400">
                Exam mistakes, root causes & permanent takeaways
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenLogMistake();
              }}
              className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-600 text-rose-200 text-xs font-bold cursor-pointer"
            >
              + Log Mistake
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search traps, root causes, rules..."
              className="w-full px-3 py-1.5 pl-8 rounded bg-[#040806] border border-[#132418] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2" />
          </div>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-2.5 py-1.5 rounded bg-[#040806] border border-[#132418] text-xs text-slate-300 focus:outline-none"
          >
            <option value="All">All Subjects</option>
            {Array.from(new Set(mistakes.map((m) => m.subject))).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {filtered.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className={`px-2.5 py-1.5 rounded border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedIds.size > 0 && selectedIds.size === filtered.length
                  ? 'bg-rose-950 text-rose-300 border-rose-600'
                  : 'bg-[#040806] text-slate-400 border-[#132418] hover:text-white'
              }`}
              title="Select all mistakes matching filter"
            >
              {selectedIds.size > 0 && selectedIds.size === filtered.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>
                {selectedIds.size > 0 ? `${selectedIds.size} Selected` : `Select All (${filtered.length})`}
              </span>
            </button>
          )}

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setIsBulkDeleting(true)}
              className="px-2.5 py-1.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-600 text-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </button>
          )}
        </div>

        {/* Mistake Entries List */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#16291C] rounded-xl text-slate-500 text-xs">
              No mistakes logged matching this filter. Press <kbd className="px-1 py-0.5 rounded bg-[#0c1610] text-rose-300 border border-rose-900">Cmd+M</kbd> to record a new trap!
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={`${item.id || 'mistake'}-${idx}`}
                className={`p-3.5 rounded-xl border space-y-2 transition-colors ${
                  selectedIds.has(item.id)
                    ? 'bg-[#0e0405] border-rose-700/80 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                    : 'bg-[#040806] border-[#16291C] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className={`p-1 rounded border transition-colors cursor-pointer ${
                        selectedIds.has(item.id)
                          ? 'bg-rose-500 text-black border-rose-400'
                          : 'bg-[#040806] border-slate-700 text-slate-500 hover:text-white'
                      }`}
                      title="Select mistake"
                    >
                      {selectedIds.has(item.id) ? (
                        <CheckSquare className="w-3 h-3" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                    </button>
                    <span className="font-bold text-rose-400">{item.subject}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 font-semibold">{item.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                        item.severity === 'High'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : item.severity === 'Medium'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-slate-500 text-[10px]">{item.date}</span>
                    <button
                      type="button"
                      onClick={() => setDeletingMistake({ id: item.id, label: item.trap || item.topic })}
                      title="Delete mistake"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded bg-[#0e0506] border border-rose-950/80 text-rose-200">
                    <strong className="text-rose-400 block text-[10px] uppercase font-bold">
                      ❌ The Trap
                    </strong>
                    {item.trap}
                  </div>

                  <div className="p-2 rounded bg-[#0d0903] border border-amber-950/80 text-amber-200">
                    <strong className="text-amber-400 block text-[10px] uppercase font-bold">
                      🔍 Root Cause
                    </strong>
                    {item.rootCause}
                  </div>

                  <div className="p-2 rounded bg-[#040e07] border border-emerald-950/80 text-emerald-200">
                    <strong className="text-emerald-400 block text-[10px] uppercase font-bold">
                      💡 Permanent Corrective Rule
                    </strong>
                    {item.goldenRule}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Mistake Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingMistake}
        title="Delete Mistake Log"
        message="Are you sure you want to remove this mistake log and corrective rule from your diary?"
        itemName={deletingMistake?.label}
        confirmText="Yes, Delete Entry"
        onConfirm={executeDeleteMistake}
        onClose={() => setDeletingMistake(null)}
      />

      {/* Bulk Delete Mistakes Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleting}
        title={`Delete ${selectedIds.size} Mistake Logs`}
        message={`Are you sure you want to delete ${selectedIds.size} selected mistake entries from your diary? This will sync deletions with Google Sheets.`}
        itemName={`${selectedIds.size} mistakes selected`}
        confirmText="Yes, Delete Selected"
        onConfirm={handleBulkDeleteConfirm}
        onClose={() => setIsBulkDeleting(false)}
      />
    </div>
  );
};
