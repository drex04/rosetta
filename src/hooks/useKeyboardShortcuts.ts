import { useEffect } from 'react';

interface Options {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onDelete: () => void;
}

export function useKeyboardShortcuts({ searchInputRef, onDelete }: Options) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete();
      }
    }

    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [searchInputRef, onDelete]);
}
