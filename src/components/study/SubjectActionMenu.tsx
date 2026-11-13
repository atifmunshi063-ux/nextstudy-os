import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, CheckSquare, Trash2 } from 'lucide-react';

interface SubjectActionMenuProps {
  code: string;
  name: string;
  onSelect: () => void;
  onManage: () => void;
  isBatchMode: boolean;
}

export const SubjectActionMenu: React.FC<SubjectActionMenuProps> = ({
  code,
  name,
  onSelect,
  onManage,
  isBatchMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const clearHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startHold = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    clearHold();
    setIsHolding(true);
    startTimeRef.current = Date.now();
    const duration = 480;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(pct);
    }, 20);

    timerRef.current = setTimeout(() => {
      clearHold();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(45);
        } catch {
          // ignore
        }
      }
      onSelect();
    }, duration);
  };

  const endHold = (e: React.MouseEvent) => {
    e.stopPropagation();
    const elapsed = Date.now() - startTimeRef.current;
    clearHold();
    if (elapsed < 280) {
      setIsOpen((prev) => !prev);
    }
  };

  if (isBatchMode) return null;

  return (
    <div className="relative shrink-0 ml-0.5" ref={menuRef}>
      <button
        type="button"
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={clearHold}
        className={`relative p-1 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
          isHolding
            ? 'bg-amber-950/80 border-amber-500 text-amber-300 scale-105'
            : 'bg-[#040806] border-[#132418] text-slate-500 hover:text-slate-300 hover:border-slate-600'
        }`}
        title="Hold down for a moment to batch select, or click for options"
      >
        {isHolding && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="#F59E0B"
              strokeWidth="2.5"
              fill="transparent"
              strokeDasharray={56}
              strokeDashoffset={56 - (holdProgress / 100) * 56}
            />
          </svg>
        )}
        <MoreVertical className="w-3 h-3" />
      </button>

      {isHolding && (
        <div className="absolute right-0 bottom-full mb-1 z-50 px-2 py-0.5 rounded bg-amber-950 border border-amber-500 text-amber-300 text-[10px] font-bold whitespace-nowrap shadow-lg animate-pulse">
          Hold to select... {holdProgress}%
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-[#080E0B] border border-[#1a3322] shadow-2xl p-1 text-xs font-mono space-y-0.5 backdrop-blur-md">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onSelect();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-amber-950 hover:text-amber-300 flex items-center gap-2 transition-colors cursor-pointer text-xs"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Select Multiple</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onManage();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-400 hover:bg-rose-950/80 hover:text-rose-300 flex items-center gap-2 transition-colors cursor-pointer text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete / Unlink</span>
          </button>
        </div>
      )}
    </div>
  );
};
