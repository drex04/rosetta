import { useEffect } from 'react';

interface Options {
  onOpenSearch: () => void;
  onDelete: () => void;
}

export function useKeyboardShortcuts({ onOpenSearch, onDelete }: Options) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        onOpenSearch();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete();
      }
    }

    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onOpenSearch, onDelete]);
}
