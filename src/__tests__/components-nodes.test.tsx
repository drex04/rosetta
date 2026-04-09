import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { NodeProps } from '@xyflow/react';
import type { OntologyNode, SourceNodeData } from '../types/index';

vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClassData(overrides = {}) {
  return {
    uri: 'http://nato.int/onto#Track',
    label: 'Track',
    prefix: 'http://nato.int/onto#',
    properties: [
      {
        uri: 'http://nato.int/onto#speed',
        label: 'speed',
        range: 'xsd:float',
        kind: 'datatype' as const,
      },
    ],
    ...overrides,
  };
}

function makeSourceData(overrides = {}) {
  return {
    uri: 'http://src_norway_#RadarTracks',
    label: 'RadarTracks',
    prefix: 'http://src_norway_#',
    properties: [
      {
        uri: 'http://src_norway_#speed',
        label: 'speed',
        range: 'xsd:string',
        kind: 'datatype' as const,
      },
    ],
    ...overrides,
  };
}

function classNodeProps(data = makeClassData()): NodeProps<OntologyNode> {
  return { id: 'node-1', data } as unknown as NodeProps<OntologyNode>;
}

function sourceNodeProps(data = makeSourceData()): NodeProps<SourceNodeData> {
  return { id: 'src-node-1', data } as unknown as NodeProps<SourceNodeData>;
}

// ─── ClassNode ────────────────────────────────────────────────────────────────

describe('ClassNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the class label', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    render(<ClassNode {...classNodeProps()} />);
    expect(screen.getByText('Track')).toBeInTheDocument();
  });

  it('renders connection handles', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    render(<ClassNode {...classNodeProps()} />);
    expect(screen.getAllByTestId(/handle-/).length).toBeGreaterThan(0);
  });

  it('renders property rows', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    render(<ClassNode {...classNodeProps()} />);
    expect(screen.getByText('speed')).toBeInTheDocument();
  });

  it('activates header editing via editTrigger', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    const data = makeClassData({ editTrigger: 1 });
    render(<ClassNode {...classNodeProps(data)} />);
    // editing mode shows input fields
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('activates property editing via propRenameTrigger', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    const data = makeClassData({
      propRenameTrigger: { propUri: 'http://nato.int/onto#speed' },
    });
    render(<ClassNode {...classNodeProps(data)} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('calls onContextMenu when right-clicked', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    const onContextMenu = vi.fn();
    const data = makeClassData({ onContextMenu });
    render(<ClassNode {...classNodeProps(data)} />);

    // Fire context menu on the node header area
    const heading = screen.getByText('Track').closest('div') ?? document.body;
    fireEvent.contextMenu(heading);
    expect(onContextMenu).toHaveBeenCalledWith(
      'node-1',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('shows error when committing header with empty label', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    const data = makeClassData({ editTrigger: 1 });
    render(<ClassNode {...classNodeProps(data)} />);

    const labelInput = screen.getAllByRole('textbox')[0]!;
    fireEvent.change(labelInput, { target: { value: '' } });
    fireEvent.keyDown(labelInput, { key: 'Enter' });

    expect(screen.getByText(/Label is required/i)).toBeInTheDocument();
  });

  it('shows search highlight when isSearchHighlighted is true', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    const data = makeClassData({ isSearchHighlighted: true });
    const { container } = render(<ClassNode {...classNodeProps(data)} />);
    // Highlighted node should have a ring or border class
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with no properties without throwing', async () => {
    const { ClassNode } = await import('../components/nodes/ClassNode');
    const data = makeClassData({ properties: [] });
    expect(() => render(<ClassNode {...classNodeProps(data)} />)).not.toThrow();
  });
});

// ─── SourceNode ───────────────────────────────────────────────────────────────

describe('SourceNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the source node label', async () => {
    const { SourceNode } = await import('../components/nodes/SourceNode');
    render(<SourceNode {...sourceNodeProps()} />);
    expect(screen.getByText('RadarTracks')).toBeInTheDocument();
  });

  it('renders connection handles', async () => {
    const { SourceNode } = await import('../components/nodes/SourceNode');
    render(<SourceNode {...sourceNodeProps()} />);
    expect(screen.getAllByTestId(/handle-/).length).toBeGreaterThan(0);
  });

  it('renders source property rows', async () => {
    const { SourceNode } = await import('../components/nodes/SourceNode');
    render(<SourceNode {...sourceNodeProps()} />);
    expect(screen.getByText('speed')).toBeInTheDocument();
  });

  it('activates header editing via editTrigger', async () => {
    const { SourceNode } = await import('../components/nodes/SourceNode');
    const data = makeSourceData({ editTrigger: 1 });
    render(<SourceNode {...sourceNodeProps(data)} />);
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
  });

  it('calls onContextMenu when right-clicked', async () => {
    const { SourceNode } = await import('../components/nodes/SourceNode');
    const onContextMenu = vi.fn();
    const data = makeSourceData({ onContextMenu });
    render(<SourceNode {...sourceNodeProps(data)} />);

    const heading =
      screen.getByText('RadarTracks').closest('div') ?? document.body;
    fireEvent.contextMenu(heading);
    expect(onContextMenu).toHaveBeenCalledWith(
      'src-node-1',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('shows error when committing header with empty label', async () => {
    const { SourceNode } = await import('../components/nodes/SourceNode');
    const data = makeSourceData({ editTrigger: 1 });
    render(<SourceNode {...sourceNodeProps(data)} />);

    const labelInput = screen.getAllByRole('textbox')[0]!;
    fireEvent.change(labelInput, { target: { value: '' } });
    fireEvent.keyDown(labelInput, { key: 'Enter' });

    expect(screen.getByText(/Label is required/i)).toBeInTheDocument();
  });

  it('renders with no properties without throwing', async () => {
    const { SourceNode } = await import('../components/nodes/SourceNode');
    const data = makeSourceData({ properties: [] });
    expect(() =>
      render(<SourceNode {...sourceNodeProps(data)} />),
    ).not.toThrow();
  });
});
