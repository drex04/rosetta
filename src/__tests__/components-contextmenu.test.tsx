import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
}));

// Mock Radix dropdown-menu with simple elements so we can click items
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="dropdown" onClick={() => onOpenChange?.(false)}>
      {children}
    </div>
  ),
  DropdownMenuContent: ({
    children,
    onInteractOutside,
    onEscapeKeyDown,
  }: {
    children: React.ReactNode;
    onInteractOutside?: () => void;
    onEscapeKeyDown?: () => void;
  }) => (
    <div
      data-testid="dropdown-content"
      data-interact-outside={String(!!onInteractOutside)}
      data-escape={String(!!onEscapeKeyDown)}
    >
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    className,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    className?: string;
  }) => (
    <button
      data-testid="dropdown-item"
      className={className}
      onClick={onSelect}
    >
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

// ─── NodeContextMenu ──────────────────────────────────────────────────────────

describe('NodeContextMenu', () => {
  const onAddProperty = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn());
  });

  async function renderMenu(hasMappings = false) {
    const { NodeContextMenu } =
      await import('../components/canvas/NodeContextMenu');
    return render(
      <NodeContextMenu
        x={100}
        y={200}
        nodeId="node-1"
        nodeLabel="Track"
        nodeType="classNode"
        hasMappings={hasMappings}
        onAddProperty={onAddProperty}
        onRename={onRename}
        onDelete={onDelete}
        onClose={onClose}
      />,
    );
  }

  it('renders all menu items', async () => {
    await renderMenu();
    expect(screen.getByText('Add Property')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Delete Node')).toBeInTheDocument();
  });

  it('calls onAddProperty and onClose when Add Property is clicked', async () => {
    await renderMenu();
    fireEvent.click(screen.getByText('Add Property'));
    expect(onAddProperty).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onRename and onClose when Rename is clicked', async () => {
    await renderMenu();
    fireEvent.click(screen.getByText('Rename'));
    expect(onRename).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onDelete directly when hasMappings is false', async () => {
    await renderMenu(false);
    fireEvent.click(screen.getByText('Delete Node'));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows confirm dialog when hasMappings is true and user confirms', async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    await renderMenu(true);
    fireEvent.click(screen.getByText('Delete Node'));
    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  it('cancels delete when hasMappings is true and user declines', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    await renderMenu(true);
    fireEvent.click(screen.getByText('Delete Node'));
    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── CanvasContextMenu ────────────────────────────────────────────────────────

describe('CanvasContextMenu', () => {
  const onAddClass = vi.fn();
  const onAddSourceClass = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  async function renderMenu(hasActiveSource: boolean) {
    const { CanvasContextMenu } =
      await import('../components/canvas/CanvasContextMenu');
    return render(
      <CanvasContextMenu
        x={50}
        y={80}
        hasActiveSource={hasActiveSource}
        onAddClass={onAddClass}
        onAddSourceClass={onAddSourceClass}
        onClose={onClose}
      />,
    );
  }

  it('always renders Add Class', async () => {
    await renderMenu(false);
    expect(screen.getByText('Add Class')).toBeInTheDocument();
  });

  it('renders Add Source Class when hasActiveSource is true', async () => {
    await renderMenu(true);
    expect(screen.getByText('Add Source Class')).toBeInTheDocument();
  });

  it('does not render Add Source Class when hasActiveSource is false', async () => {
    await renderMenu(false);
    expect(screen.queryByText('Add Source Class')).not.toBeInTheDocument();
  });

  it('calls onAddClass and onClose when Add Class is clicked', async () => {
    await renderMenu(false);
    fireEvent.click(screen.getByText('Add Class'));
    expect(onAddClass).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onAddSourceClass and onClose when Add Source Class is clicked', async () => {
    await renderMenu(true);
    fireEvent.click(screen.getByText('Add Source Class'));
    expect(onAddSourceClass).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
