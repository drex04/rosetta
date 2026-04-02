import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  hasActiveSource: boolean;
  onAddClass: () => void;
  onAddSourceClass: () => void;
  onClose: () => void;
}

export function CanvasContextMenu({
  x,
  y,
  hasActiveSource,
  onAddClass,
  onAddSourceClass,
  onClose,
}: CanvasContextMenuProps) {
  return (
    <DropdownMenu
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Invisible anchor positioned at click coords */}
      <div
        style={{
          position: 'fixed',
          left: x,
          top: y,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
        aria-hidden
      />
      <DropdownMenuContent
        style={{ position: 'fixed', left: x, top: y }}
        onInteractOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DropdownMenuItem
          onSelect={() => {
            onAddClass();
            onClose();
          }}
        >
          Add Class
        </DropdownMenuItem>
        {hasActiveSource && (
          <DropdownMenuItem
            onSelect={() => {
              onAddSourceClass();
              onClose();
            }}
          >
            Add Source Class
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
