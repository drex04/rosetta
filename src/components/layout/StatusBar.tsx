import { useState, useEffect } from 'react'
import { CircleNotchIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'
import type { SaveStatus } from '@/hooks/useAutoSave'

interface StatusBarProps {
  saveStatus: SaveStatus
}

export function StatusBar({ saveStatus }: StatusBarProps) {
  const [showSaving, setShowSaving] = useState(false)

  useEffect(() => {
    if (saveStatus === 'saving') {
      const timer = setTimeout(() => setShowSaving(true), 400)
      return () => clearTimeout(timer)
    } else {
      setShowSaving(false)
    }
  }, [saveStatus])

  return (
    <footer className="h-6 border-t border-border bg-background flex items-center justify-end px-3 shrink-0">
      <div className="flex items-center">
        {showSaving && (
          <span className="flex items-center gap-1 text-xs text-foreground px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <CircleNotchIcon size={16} className="animate-spin" />
            Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-foreground px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <CheckCircleIcon size={16} className="text-green-500" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-xs text-amber-500 px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <WarningIcon size={16} />
            Save failed
          </span>
        )}
      </div>
    </footer>
  )
}
