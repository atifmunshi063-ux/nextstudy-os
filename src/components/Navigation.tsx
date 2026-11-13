import React from 'react';
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  BookOpen,
} from 'lucide-react';

interface NavigationProps {
  activeTab: number;
  onTabChange: (index: number) => void;
  isRunningPomodoro?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  isRunningPomodoro,
}) => {
  const tabs = [
    { label: 'Dashboard', icon: LayoutDashboard, index: 0 },
    { label: 'Pomodoro', icon: Clock, index: 1, badge: isRunningPomodoro },
    { label: 'Habits', icon: CheckSquare, index: 2 },
    { label: 'Study', icon: BookOpen, index: 3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#060A08]/95 backdrop-blur-md border-t border-[#16291C] pb-safe font-mono">
      <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.index;
          return (
            <button
              key={tab.label}
              onClick={() => {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(15);
                }
                onTabChange(tab.index);
              }}
              className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 transition-all cursor-pointer ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
