import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  onToggleTimer?: () => void;
  onOpenSearch?: () => void;
  onOpenNewHabit?: () => void;
  onNavigateTab?: (tabIndex: number) => void;
}

export function useKeyboardShortcuts({
  onToggleTimer,
  onOpenSearch,
  onOpenNewHabit,
  onNavigateTab,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

      // Cmd+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch?.();
        return;
      }

      // Alt+N for new habit
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onOpenNewHabit?.();
        return;
      }

      // Don't trigger single-key shortcuts when typing in inputs
      if (isInput) return;

      // Spacebar toggles timer
      if (e.code === 'Space') {
        e.preventDefault();
        onToggleTimer?.();
        return;
      }

      // 1-4 for quick navigation
      if (['1', '2', '3', '4'].includes(e.key)) {
        onNavigateTab?.(parseInt(e.key, 10) - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleTimer, onOpenSearch, onOpenNewHabit, onNavigateTab]);
}
