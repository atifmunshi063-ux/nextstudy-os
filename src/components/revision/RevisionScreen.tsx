import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Play,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface RevisionScreenProps {
  onNavigateTab?: (tab: number) => void;
}

export const RevisionScreen: React.FC<RevisionScreenProps> = ({ onNavigateTab }) => {
  const [showProof, setShowProof] = useState<boolean>(false);
  const [activeStage, setActiveStage] = useState<'7d' | '14d' | '30d'>('7d');
  const [gradedResult, setGradedResult] = useState<string | null>(null);

  const handleGrade = (difficulty: 'hard' | 'med' | 'easy') => {
    setGradedResult(difficulty.toUpperCase());
    setTimeout(() => {
      setGradedResult(null);
    }, 2500);
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12 max-w-4xl mx-auto font-mono text-slate-200">
      {/* 1. Subheader Status Strip */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-[#16291C] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">SHEET:</span>
          <span className="text-emerald-400 font-bold">Revisions_Queue • Spaced Review Schedule</span>
        </div>
        <span className="text-cyan-400 font-bold">v2.4.1</span>
      </div>

      {/* 2. Spaced Review Schedule Card */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
            <span className="text-emerald-400">⌘</span>
            <span>SPACED REPETITION REVIEW SCHEDULE</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
            ACTIVE SPRINT #14
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">GLOBAL RETENTION INDEX</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-extrabold text-white tracking-tight">88.4</span>
              <span className="text-sm font-bold text-emerald-400">%</span>
              <span className="text-xs text-emerald-400 font-bold">↗+2.1%</span>
            </div>
          </div>

          {/* Mini Bar Chart */}
          <div className="flex items-end gap-1.5 h-10 pb-1">
            {[40, 55, 65, 75, 85, 95].map((h, i) => (
              <div
                key={i}
                className="w-2 bg-emerald-500 rounded-xs"
                style={{ height: `${h}%`, opacity: 0.3 + (i * 0.14) }}
              />
            ))}
          </div>
        </div>

        {/* Interval Ladder Rail */}
        <div className="pt-2 border-t border-[#132418] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <span>1D</span>
            <span>3D</span>
            <span className="text-emerald-400">7D [CURRENT]</span>
            <span>14D</span>
            <span>30D</span>
            <span>MST</span>
          </div>

          {/* Connected progress rail */}
          <div className="grid grid-cols-5 gap-1.5">
            <div className="h-1.5 rounded-full bg-emerald-400" />
            <div className="h-1.5 rounded-full bg-emerald-400" />
            <div className="h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
            <div className="h-1.5 rounded-full bg-slate-800" />
            <div className="h-1.5 rounded-full bg-slate-800" />
          </div>
        </div>

        {/* 4 Metric Boxes */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400 font-bold">DUE TODAY</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">03</div>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-rose-400 font-bold">OVERDUE</div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">01</div>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400 font-bold">UPCOMING</div>
            <div className="text-lg font-bold text-white mt-0.5">08</div>
          </div>
          <div className="p-2.5 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-cyan-400 font-bold">MASTERED</div>
            <div className="text-lg font-bold text-cyan-400 mt-0.5">24</div>
          </div>
        </div>
      </div>

      {/* 3. Active Review Focus Card (Sub_OS // Unit 2) */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.1)] space-y-3">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              SUB_OS // UNIT 2
            </span>
            <span className="text-slate-400">STAGE: 7d INTERVAL</span>
          </div>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>IN_REVIEW</span>
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-white">Semaphores & Classical IPC</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Focus: Producer-Consumer Problem & Dining Philosophers Deadlock Prevention
          </p>
        </div>

        {/* Code Test Prompt */}
        <div className="p-3 rounded-lg bg-[#040806] border border-[#132418] space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
            <span>💡</span>
            <span>KEY_TEST_PROMPT [PYQ_GATE_2022]</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-mono">
            &gt;&gt; State Peterson's algorithm mutual exclusion condition and explain why{' '}
            <code className="text-cyan-400 bg-cyan-950/60 px-1 py-0.5 rounded">sem_wait()</code> must
            execute as an atomic CPU instruction.
          </p>
        </div>

        {/* Accordion: Verify Proof & C Implementation */}
        <div>
          <button
            onClick={() => setShowProof(!showProof)}
            className="w-full py-2 px-3 rounded bg-[#040806] border border-[#132418] hover:border-slate-700 flex items-center justify-between text-xs text-emerald-400 font-bold transition-colors cursor-pointer"
          >
            <span>◰ Verify Proof & C Implementation</span>
            {showProof ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showProof && (
            <div className="p-3 mt-1 rounded bg-[#030604] border border-[#16291C] text-[11px] text-slate-300 space-y-2">
              <p className="text-slate-400">
                Peterson's Algorithm uses two shared variables:{' '}
                <span className="text-cyan-400">bool flag[2]</span> and{' '}
                <span className="text-cyan-400">int turn</span>.
              </p>
              <pre className="p-2 rounded bg-black/60 text-emerald-300 overflow-x-auto text-[10px]">
{`flag[i] = true;
turn = j;
while (flag[j] && turn == j);
// critical section
flag[i] = false;`}
              </pre>
            </div>
          )}
        </div>

        {/* Recall Performance Grading Buttons */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>RECALL PERFORMANCE GRADING</span>
            <span className="text-emerald-400">{gradedResult ? `STAMPED: ${gradedResult}` : 'STAMP_RESULT'}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleGrade('hard')}
              className="py-2.5 rounded bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900 text-rose-300 text-xs font-bold text-center cursor-pointer transition-all active:scale-95"
            >
              <div className="font-extrabold">HARD</div>
              <div className="text-[10px] text-rose-400/80">Regress 1d</div>
            </button>

            <button
              onClick={() => handleGrade('med')}
              className="py-2.5 rounded bg-amber-950/30 hover:bg-amber-950/60 border border-amber-900 text-amber-300 text-xs font-bold text-center cursor-pointer transition-all active:scale-95"
            >
              <div className="font-extrabold">MED</div>
              <div className="text-[10px] text-amber-400/80">Keep 7d</div>
            </button>

            <button
              onClick={() => handleGrade('easy')}
              className="py-2.5 rounded bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500 text-emerald-300 text-xs font-bold text-center cursor-pointer transition-all active:scale-95 shadow-md"
            >
              <div className="font-extrabold">EASY</div>
              <div className="text-[10px] text-emerald-400/80">Step 14d</div>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Due Today Queue [Revision Pipeline] */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span>⇄</span>
            <span>DUE TODAY QUEUE [REVISION_PIPELINE]</span>
          </div>
          <span className="text-emerald-400">3 SESSIONS SCHEDULED</span>
        </div>

        <div className="space-y-2">
          {/* Item 1 */}
          <div className="p-3 rounded-lg bg-[#09150E] border-l-4 border-l-emerald-500 border border-[#16291C] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-bold text-emerald-400">Sub_OS</span>
                <span className="text-slate-400">Interval: 7d</span>
              </div>
              <div className="text-xs font-bold text-white mt-0.5">Semaphores & Classical IPC</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">● Reviewing now</div>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
              ACTIVE
            </span>
          </div>

          {/* Item 2 */}
          <div className="p-3 rounded-lg bg-[#060A08] border-l-4 border-l-rose-500 border border-[#16291C] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-bold text-rose-400">Sub_DBMS</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                  OVERDUE 1d
                </span>
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                B+ Tree Indexing & Query Optimization
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Last Recall Score: 78% • 12 Nodes
              </div>
            </div>

            <button
              onClick={() => onNavigateTab && onNavigateTab(2)}
              className="px-3 py-1.5 rounded bg-[#0b140e] hover:bg-emerald-950 border border-[#1a3322] hover:border-emerald-500 text-xs font-bold text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>▷</span>
              <span>Start Recall</span>
            </button>
          </div>

          {/* Item 3 */}
          <div className="p-3 rounded-lg bg-[#060A08] border-l-4 border-l-cyan-500 border border-[#16291C] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-bold text-cyan-400">Sub_DSA</span>
                <span className="text-slate-400">Interval: 3d</span>
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                Graph TopoSort & Kahn's BFS
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                &lt;&gt; LeetCode #207 (Course Schedule)
              </div>
            </div>

            <button
              onClick={() => onNavigateTab && onNavigateTab(2)}
              className="px-3 py-1.5 rounded bg-[#0b140e] hover:bg-cyan-950 border border-[#1a3322] hover:border-cyan-500 text-xs font-bold text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>◰</span>
              <span>Practice PYQ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. 7-Day Retention Load Forecast */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span>📅</span>
            <span>7-DAY RETENTION LOAD FORECAST</span>
          </div>
          <span className="text-slate-400">LOAD: 16 UNITS</span>
        </div>

        {/* 6 Day Boxes */}
        <div className="grid grid-cols-6 gap-2 text-center">
          <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500">
            <div className="text-[10px] text-emerald-400 font-bold">TODAY</div>
            <div className="text-base font-black text-emerald-400 mt-0.5">3</div>
            <div className="text-[9px] text-emerald-400">DUE</div>
          </div>

          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400">WED</div>
            <div className="text-base font-bold text-white mt-0.5">2</div>
            <div className="text-[9px] text-slate-400">DUE</div>
          </div>

          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-amber-400">THU</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">4</div>
            <div className="text-[9px] text-amber-400">PEAK</div>
          </div>

          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-400">FRI</div>
            <div className="text-base font-bold text-white mt-0.5">1</div>
            <div className="text-[9px] text-slate-400">DUE</div>
          </div>

          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-rose-400">SAT</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">5</div>
            <div className="text-[9px] text-rose-400">HEAVY</div>
          </div>

          <div className="p-2 rounded bg-[#040806] border border-[#132418]">
            <div className="text-[10px] text-slate-500">SUN</div>
            <div className="text-base font-bold text-slate-500 mt-0.5">0</div>
            <div className="text-[9px] text-slate-500">REST</div>
          </div>
        </div>

        {/* 70/30 practice vs theory engine */}
        <div className="pt-2 border-t border-[#132418] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">70/30 PRACTICE VS THEORY ENGINE</span>
            <span className="text-cyan-400">73.5% CODE / 26.5% THEORY</span>
          </div>
          <div className="w-full h-2 rounded bg-slate-900 overflow-hidden flex">
            <div className="h-full bg-cyan-400" style={{ width: '73.5%' }} />
            <div className="h-full bg-emerald-400" style={{ width: '26.5%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
