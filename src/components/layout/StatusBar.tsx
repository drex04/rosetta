import { Button } from '@/components/ui/button'
import { GithubLogoIcon, CircleNotchIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'
import type { SaveStatus } from '@/hooks/useAutoSave'

interface StatusBarProps {
  saveStatus: SaveStatus
}

export function StatusBar({ saveStatus }: StatusBarProps) {
  return (
    <footer className="h-6 border-t border-border bg-background flex items-center justify-between px-3 shrink-0">
      {/* Left: save status */}
      <div className="flex items-center">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1 text-[11px] text-foreground px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <CircleNotchIcon size={14} className="animate-spin" />
            Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-[11px] text-foreground px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <CheckCircleIcon size={14} className="text-green-500" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-[11px] text-amber-500 px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <WarningIcon size={14} />
            Save failed
          </span>
        )}
      </div>

      {/* Right: GitHub icon */}
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0"
        aria-label="View source on GitHub"
        onClick={() => window.open('https://github.com/drex04/rosetta', '_blank', 'noopener,noreferrer')}
      >
        <GithubLogoIcon size={13} />
      </Button>
    </footer>
  )
}
