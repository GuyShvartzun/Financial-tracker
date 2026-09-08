import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onTogglePrivacyMode,
  onToggleDarkMode,
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePrivacyMode, onToggleDarkMode, onCloseModals]);
}
