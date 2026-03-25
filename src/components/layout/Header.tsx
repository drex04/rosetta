import { Button } from '@/components/ui/button'
import { QuestionIcon, InfoIcon, CircleNotchIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'
import type { SaveStatus } from '@/hooks/useAutoSave'

interface HeaderProps {
  saveStatus: SaveStatus
}

export function Header({ saveStatus }: HeaderProps) {
  return (
    <header
      className="h-12 flex items-center justify-between px-4 border-b border-border bg-background shrink-0"
      role="banner"
    >
      <span className="text-sm font-semibold tracking-tight text-foreground select-none">
        Rosetta
      </span>
      <div className="flex items-center gap-2">
        {/* Save status indicator */}
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
            <CircleNotchIcon size={13} className="animate-spin" />
            Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
            <CheckCircleIcon size={13} className="text-green-500" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-xs text-amber-500" aria-live="polite">
            <WarningIcon size={13} />
            Save failed
          </span>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Start help tour"
          >
            <QuestionIcon size={16} />
            <span className="text-xs">Help Tour</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="About Rosetta"
          >
            <InfoIcon size={16} />
            <span className="text-xs">About</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
