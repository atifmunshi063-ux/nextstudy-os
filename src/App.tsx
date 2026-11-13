import React, { useState, useEffect, useCallback } from 'react';
import { storageService } from './services/storage';
import { Habit, SyllabusSubject, PomodoroSession, SyncSettings } from './types';
import { Navigation } from './components/Navigation';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { FocusScreen } from './components/focus/FocusScreen';
import { HabitTrackerScreen } from './components/habits/HabitTrackerScreen';
import { StudyTrackerScreen } from './components/study/StudyTrackerScreen';
import { PlannerScreen } from './components/planner/PlannerScreen';
import { RevisionScreen } from './components/revision/RevisionScreen';
import { AnalyticsScreen } from './components/analytics/AnalyticsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { SyncModal } from './components/sync/SyncModal';
import { CommandSearchModal } from './components/search/CommandSearchModal';
import { LogMistakeModal } from './components/mistakes/LogMistakeModal';
import { MistakeListModal } from './components/mistakes/MistakeListModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  BookOpen,
  Calendar,
  RotateCcw,
  BarChart3,
  Settings,
  Search,
  RefreshCw,
  Plus,
} from 'lucide-react';

export default function App() {
  // 0=Dashboard, 1=Pomodoro, 2=Habits, 3=Study, 4=Planner, 5=Revision, 6=Analytics, 7=Settings
  const [activeTab, setActiveTab] = useState<number>(0);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [subjects, setSubjects] = useState<SyllabusSubject[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [settings, setSettings] = useState<SyncSettings>(storageService.getSettings());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isLogMistakeOpen, setIsLogMistakeOpen] = useState<boolean>(false);
  const [isMistakeListOpen, setIsMistakeListOpen] = useState<boolean>(false);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState<boolean>(storageService.isSyncing);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const refreshData = useCallback(() => {
    setHabits(storageService.getHabits());
    setSubjects(storageService.getSubjects());
    setSessions(storageService.getPomodoroSessions());
    setSettings(storageService.getSettings());
    setIsSyncing(storageService.isSyncing);
  }, []);

  const handleHeaderSync = async (e?: React.MouseEvent) => {
    const s = storageService.getSettings();
    if (!s.webAppUrl || (e && (e.shiftKey || e.altKey))) {
      setIsSyncModalOpen(true);
      return;
    }
    setIsOnline(true);
    setIsSyncing(true);
    await storageService.syncPendingMutations();
    const res = await storageService.pullFromGoogleSheets();
    setIsSyncing(false);
    refreshData();
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = storageService.subscribe(() => {
      refreshData();
    });

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      storageService.pullFromGoogleSheets().catch((err) => {
        console.warn('Initial Google Sheets pull note:', err);
      });
    }

    const handleOnline = () => {
      setIsOnline(true);
      storageService.syncPendingMutations();
      storageService.pullFromGoogleSheets();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsLogMistakeOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [refreshData]);

  useKeyboardShortcuts({
    onOpenSearch: () => setIsSearchModalOpen(true),
    onOpenNewHabit: () => setActiveTab(2),
    onNavigateTab: (tabIdx) => {
      if (tabIdx >= 0 && tabIdx <= 7) setActiveTab(tabIdx);
    },
  });

  const mutations = storageService.getMutations();
  const pendingSyncCount = mutations.filter((m) => m.status === 'pending').length;

  const handleSelectSubjectFromSearch = (code: string) => {
    setSelectedSubjectCode(code);
    setActiveTab(3);
  };

  const handleSelectHabitFromSearch = (_habit: Habit) => {
    setActiveTab(2);
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, index: 0, group: 'CORE' },
    { label: 'Pomodoro', icon: Clock, index: 1, group: 'CORE' },
    { label: 'Habit Tracker', icon: CheckSquare, index: 2, group: 'CORE' },
    { label: 'Study Tracker', icon: BookOpen, index: 3, group: 'CORE' },
    { label: 'Smart Planner', icon: Calendar, index: 4, group: 'INTELLIGENCE' },
    { label: 'Spaced Revision', icon: RotateCcw, index: 5, group: 'INTELLIGENCE' },
    { label: 'Analytics & KPIs', icon: BarChart3, index: 6, group: 'INTELLIGENCE' },
    { label: 'Settings & Cloud', icon: Settings, index: 7, group: 'SYSTEM' },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#060A08] text-slate-200 font-mono overflow-hidden">
      {/* Responsive Top Header */}
      <header className="h-14 shrink-0 bg-[#080E0B]/95 backdrop-blur-md border-b border-[#16291C] flex items-center justify-between px-3 sm:px-5 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0 shadow-sm">
            NS
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <h1 className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                NextStudy OS
              </h1>
            </div>
            <div className="text-[10px] text-emerald-400/90 truncate hidden sm:block">
              Munshi MD Atif • B.Tech CSE (Brainware Univ)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#16291C] bg-[#040806] hover:border-emerald-500 text-slate-300 text-xs transition-colors cursor-pointer"
            title="Search (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline text-[11px]">Search</span>
            <kbd className="hidden lg:inline text-[9px] bg-slate-900 px-1 py-0.5 rounded text-slate-400 border border-slate-800">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center rounded-lg border border-[#16291C] bg-[#040806] hover:border-emerald-500 transition-colors overflow-hidden">
            <button
              onClick={handleHeaderSync}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Click to Sync Now (1-click bi-directional sync)"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-emerald-400 ${
                  isSyncing ? 'animate-spin' : ''
                }`}
              />
              <span className="text-[11px] font-bold text-emerald-400 hidden sm:inline">
                {isSyncing ? 'Syncing...' : pendingSyncCount > 0 ? `${pendingSyncCount} Queued` : 'Sync'}
              </span>
            </button>
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-2 py-1.5 border-l border-[#16291C] text-slate-400 hover:text-emerald-400 hover:bg-[#0c1610] text-[11px] transition-colors cursor-pointer"
              title="Google Sheets Sync Settings & Web App URL"
            >
              ⚙
            </button>
          </div>

          <button
            onClick={() => setActiveTab(7)}
            className="p-2 rounded-lg border border-[#16291C] bg-[#040806] hover:bg-[#0c1610] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-[#16291C] bg-[#080E0B] p-2 space-y-4 overflow-y-auto">
          {['CORE', 'INTELLIGENCE', 'SYSTEM'].map((group) => (
            <div key={group} className="space-y-1">
              <div className="px-3 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                {group}
              </div>
              {navItems
                .filter((item) => item.group === group)
                .map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.index;
                  return (
                    <button
                      key={tab.label}
                      onClick={() => setActiveTab(tab.index)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500 text-black shadow-md font-extrabold shadow-emerald-950/40'
                          : 'text-slate-400 hover:text-white hover:bg-[#0c1610]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
            </div>
          ))}

          {/* Quick Mistake Diary Link in Sidebar */}
          <div className="pt-2 border-t border-[#132418]">
            <button
              onClick={() => setIsMistakeListOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 transition-colors cursor-pointer"
            >
              <span>Mistake Diary</span>
              <span className="text-[10px] bg-rose-900/60 px-1.5 py-0.2 rounded text-rose-200">
                View
              </span>
            </button>
          </div>
        </aside>

        {/* Dynamic Screen Content Container */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-24 md:pb-6">
          {activeTab === 0 && (
            <DashboardScreen
              sessions={sessions}
              habits={habits}
              onNavigateTab={setActiveTab}
            />
          )}
          {activeTab === 1 && (
            <FocusScreen sessions={sessions} onSessionsChange={refreshData} />
          )}
          {activeTab === 2 && (
            <HabitTrackerScreen habits={habits} onHabitsChange={refreshData} />
          )}
          {activeTab === 3 && (
            <StudyTrackerScreen
              subjects={subjects}
              onSubjectsChange={refreshData}
              initialSelectedSubjectCode={selectedSubjectCode}
              onNavigateTab={setActiveTab}
            />
          )}
          {activeTab === 4 && <PlannerScreen onNavigateTab={setActiveTab} />}
          {activeTab === 5 && <RevisionScreen onNavigateTab={setActiveTab} />}
          {activeTab === 6 && (
            <AnalyticsScreen
              habits={habits}
              sessions={sessions}
              subjects={subjects}
            />
          )}
          {activeTab === 7 && <SettingsScreen />}
        </main>
      </div>

      {/* Floating Action Button for Mistake Diary */}
      <button
        onClick={() => setIsLogMistakeOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30 px-3.5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black shadow-xl shadow-emerald-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Mistake [⌘M]</span>
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Global Modals */}
      {isSyncModalOpen && (
        <SyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />
      )}
      <CommandSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        habits={habits}
        subjects={subjects}
        onSelectHabit={handleSelectHabitFromSearch}
        onSelectSubject={handleSelectSubjectFromSearch}
      />
      <LogMistakeModal
        isOpen={isLogMistakeOpen}
        onClose={() => setIsLogMistakeOpen(false)}
        onMistakeAdded={() => refreshData()}
      />
      <MistakeListModal
        isOpen={isMistakeListOpen}
        onClose={() => setIsMistakeListOpen(false)}
        onOpenLogMistake={() => setIsLogMistakeOpen(true)}
      />
    </div>
  );
}
