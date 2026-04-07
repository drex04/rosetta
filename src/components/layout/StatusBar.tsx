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
  let barClass =
    'h-6 flex items-center justify-center gap-1.5 px-3 shrink-0 text-sm font-medium transition-colors border-t';

  if (saveStatus === 'saving') {
    barClass +=
      ' bg-amber-400/20 border-amber-400/30 text-amber-700 dark:text-amber-400';
  } else if (saveStatus === 'saved' || saveStatus === 'idle') {
    barClass +=
      ' bg-green-500/10 border-green-500/20 text-green-700/70 dark:text-green-400/70';
  } else if (saveStatus === 'error') {
    barClass += ' bg-destructive/15 border-destructive/25 text-destructive';
  } else {
    barClass += ' bg-muted/30 border-border text-muted-foreground';
  }

  return (
    <div className={barClass} aria-live="polite">
      {saveStatus === 'saving' && (
        <>
          <CircleNotchIcon size={12} className="animate-spin" />
          Saving…
        </>
      )}
      {(saveStatus === 'saved' || saveStatus === 'idle') && (
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
