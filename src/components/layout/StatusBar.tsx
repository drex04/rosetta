import { useState, useEffect } from 'react';
import {
  CircleNotchIcon,
  CheckCircleIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { SaveStatus } from '@/hooks/useAutoSave';

interface StatusBarProps {
  saveStatus: SaveStatus;
}

export function StatusBar({ saveStatus }: StatusBarProps) {
  const [savingVisible, setSavingVisible] = useState(false);

  useEffect(() => {
    if (saveStatus === 'saving') {
      const timer = setTimeout(() => setSavingVisible(true), 400);
      return () => {
        clearTimeout(timer);
        setSavingVisible(false);
      };
    }
  }, [saveStatus]);

  const showSaving = saveStatus === 'saving' && savingVisible;

  let barClass =
    'h-6 flex items-center justify-center gap-1.5 px-3 shrink-0 text-sm font-medium transition-colors border-t';

  if (showSaving) {
    barClass +=
      ' bg-amber-400/20 border-amber-400/30 text-amber-700 dark:text-amber-400';
  } else if (saveStatus === 'saved') {
    barClass +=
      ' bg-green-500/15 border-green-500/25 text-green-700 dark:text-green-400';
  } else if (saveStatus === 'error') {
    barClass += ' bg-destructive/15 border-destructive/25 text-destructive';
  } else {
    barClass += ' bg-background border-border text-transparent';
  }

  return (
    <div className={barClass} aria-live="polite">
      {showSaving && (
        <>
          <CircleNotchIcon size={12} className="animate-spin" />
          Saving…
        </>
      )}
      {saveStatus === 'saved' && !showSaving && (
        <>
          <CheckCircleIcon size={12} />
          Saved
        </>
      )}
      {saveStatus === 'error' && (
        <>
          <WarningIcon size={12} />
          Save failed
        </>
      )}
    </div>
  );
}
