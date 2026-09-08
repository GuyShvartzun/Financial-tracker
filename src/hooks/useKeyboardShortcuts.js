import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onTogglePrivacyMode,
  onToggleDarkMode,
  onToggleQuickLog,
  onCloseModals
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

      if (e.key === 'Escape') {
        if (onCloseModals) onCloseModals();
        return;
      }

      if (isInput) return;

      if (e.key === 'p' || e.key === 'P' || e.key === 'פ') {
        e.preventDefault();
        if (onTogglePrivacyMode) onTogglePrivacyMode();
      }

      if (e.key === 'd' || e.key === 'D' || e.key === 'ג') {
        e.preventDefault();
        if (onToggleDarkMode) onToggleDarkMode();
      }

      if (e.key === 'q' || e.key === 'Q' || e.key === '/' || e.key === 'ק') {
        e.preventDefault();
        if (onToggleQuickLog) onToggleQuickLog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePrivacyMode, onToggleDarkMode, onToggleQuickLog, onCloseModals]);
}
