export function SourceSelector() {
  return (
    <div
      className="h-9 flex items-center px-4 gap-2 border-b border-border bg-muted/40 shrink-0"
      role="navigation"
      aria-label="Source selector"
    >
      <span className="text-xs text-muted-foreground select-none">
        No sources yet
      </span>
    </div>
  )
}
