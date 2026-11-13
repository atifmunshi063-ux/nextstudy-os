import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storage';
import { examTierService } from '../../services/examTierService';
import { SyllabusSubject } from '../../types';
import { X, BookOpen, PlusCircle, Link2, CheckCircle2 } from 'lucide-react';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierId: string;
  tierLabel: string;
  onSubjectAdded: (subjectCode: string) => void;
}

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  isOpen,
  onClose,
  tierId,
  tierLabel,
  onSubjectAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'create'>('link');
  
  // Link existing subject state
  const [unlinkedSubjects, setUnlinkedSubjects] = useState<SyllabusSubject[]>([]);
  const [selectedExistingCode, setSelectedExistingCode] = useState<string>('');

  // Create new subject state
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [domain, setDomain] = useState(tierLabel);

  useEffect(() => {
    if (isOpen) {
      const all = storageService.getSubjects();
      const unlinked = examTierService.getUnlinkedSubjectsForTier(tierId, all);
      setUnlinkedSubjects(unlinked);
      if (unlinked.length > 0) {
        setSelectedExistingCode(unlinked[0].code);
        setActiveTab('link');
      } else {
        setSelectedExistingCode('');
        setActiveTab('create');
      }
      setSubjectName('');
      setSubjectCode('');
      setDomain(tierLabel);
    }
  }, [isOpen, tierId, tierLabel]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setSubjectName(val);
    if (!subjectCode || subjectCode.startsWith('Sub_')) {
      const clean = val.replace(/[^a-zA-Z0-9]/g, '');
      if (clean) {
        setSubjectCode(`Sub_${clean.slice(0, 10)}`);
      }
    }
  };

  const handleLinkExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingCode) return;

    examTierService.addSubjectToTier(tierId, selectedExistingCode);
    onSubjectAdded(selectedExistingCode);
    onClose();
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    const finalCode = subjectCode.trim() || `Sub_${subjectName.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;

    const created = storageService.createSubject(
      finalCode,
      subjectName.trim(),
      tierId,
      domain.trim() || tierLabel
    );

    // Link subject to the active exam tier
    examTierService.addSubjectToTier(tierId, created.code);

    onSubjectAdded(created.code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono">
      <div className="w-full max-w-lg rounded-2xl bg-[#080E0B] border border-emerald-500/80 p-5 text-slate-200 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Add Subject to {tierLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switching */}
        <div className="flex rounded-xl bg-[#040806] p-1 border border-[#16291C]">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link Existing Subject</span>
            {unlinkedSubjects.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                activeTab === 'link' ? 'bg-black/20 text-black font-extrabold' : 'bg-slate-800 text-emerald-400'
              }`}>
                {unlinkedSubjects.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Subject</span>
          </button>
        </div>

        {/* Tab 1: Link Existing Subject */}
        {activeTab === 'link' && (
          <form onSubmit={handleLinkExisting} className="space-y-4 text-xs">
            {unlinkedSubjects.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Select Existing Subject to Connect
                  </label>
                  <select
                    value={selectedExistingCode}
                    onChange={(e) => setSelectedExistingCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {unlinkedSubjects.map((sub) => (
                      <option key={sub.code} value={sub.code} className="bg-[#080E0B] text-slate-200">
                        {sub.name} ({sub.code}) • {sub.topics.length} topics
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Subject Preview Card */}
                {(() => {
                  const currentPreview = unlinkedSubjects.find((s) => s.code === selectedExistingCode);
                  if (!currentPreview) return null;
                  return (
                    <div className="p-3 rounded-xl bg-[#040806] border border-emerald-950/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{currentPreview.name}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          {currentPreview.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {currentPreview.semesterOrDomain || 'Core Syllabus'} • {currentPreview.topics.length} topics tracked
                      </p>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Progress will sync seamlessly across all linked exams without duplicating Google Sheet tabs.</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#040806] border border-[#16291C] text-center space-y-2">
                <p className="text-slate-400 text-xs">
                  All available subjects in your curriculum are already connected to this exam tier.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="text-emerald-400 hover:text-emerald-300 text-xs font-bold underline cursor-pointer"
                >
                  Create a new subject instead →
                </button>
              </div>
            )}

            {/* Action buttons */}
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
                disabled={!selectedExistingCode}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Link Subject to Exam</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Create New Subject */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateNew} className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Subject Name *
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Compiler Design, Cloud Architecture, Digital Electronics"
                className="w-full px-3 py-2 rounded-xl bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Subject Code (Sheet Tab ID)
              </label>
              <input
                type="text"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="Sub_Compiler"
                className="w-full px-3 py-2 rounded-xl bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Domain / Syllabus Description
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. GATE CSE & College Core"
                className="w-full px-3 py-2 rounded-xl bg-[#040806] border border-[#16291C] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <p className="text-[10px] text-slate-500">
              ⚡ Creating a new subject queues a <span className="text-emerald-400">createSubjectSheet</span> mutation to automatically generate a dedicated tab on your Google Sheet.
            </p>

            {/* Action buttons */}
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
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create & Link Subject</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
