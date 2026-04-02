import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: 'classNode' | 'sourceNode';
  hasMappings: boolean;
  onAddProperty: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodeContextMenu({
  x,
  y,
  hasMappings,
  onAddProperty,
  onRename,
  onDelete,
  onClose,
}: NodeContextMenuProps) {
  function handleDelete() {
    if (hasMappings) {
      const confirmed = window.confirm(
        'This node has active mappings. Deleting it will remove those mappings. Continue?',
      );
      if (!confirmed) {
        onClose();
        return;
      }
    }
    onDelete();
    onClose();
  }

  return (
    <DropdownMenu
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DropdownMenuContent
        style={{ position: 'fixed', left: x, top: y }}
        onInteractOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DropdownMenuItem
          onSelect={() => {
            onAddProperty();
            onClose();
          }}
        >
          Add Property
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            onRename();
            onClose();
          }}
        >
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          Delete Node
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
