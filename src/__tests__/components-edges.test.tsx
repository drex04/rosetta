import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Position as PositionType } from '@xyflow/react';

vi.mock('@xyflow/react', () => ({
  BaseEdge: ({ path, id }: { path: string; id?: string }) => (
    <path data-testid="base-edge" d={path} id={id} />
  ),
  getBezierPath: vi.fn(() => ['M0,0 C50,0 50,100 100,100', 50, 50]),
  getSmoothStepPath: vi.fn(() => ['M0,0 L100,100', 50, 50]),
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="edge-label-renderer">{children}</div>
  ),
  MarkerType: { ArrowClosed: 'arrowclosed' },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseEdgeProps = {
  id: 'edge-1',
  source: 'node-a',
  target: 'node-b',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: 'right' as PositionType,
  targetPosition: 'left' as PositionType,
  selected: false,
  animated: false,
  markerEnd: 'arrowclosed',
};

// ─── MappingEdge ──────────────────────────────────────────────────────────────

describe('MappingEdge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the base edge path', async () => {
    const { MappingEdge } = await import('../components/edges/MappingEdge');
    render(<MappingEdge {...baseEdgeProps} />);
    expect(screen.getByTestId('base-edge')).toBeInTheDocument();
  });

  it('renders without a group label when groupId is absent', async () => {
    const { MappingEdge } = await import('../components/edges/MappingEdge');
    render(<MappingEdge {...baseEdgeProps} data={{}} />);
    expect(screen.queryByTestId('edge-label-renderer')).not.toBeInTheDocument();
  });

  it('renders group label (⊕) when groupId is present', async () => {
    const { MappingEdge } = await import('../components/edges/MappingEdge');
    render(
      <MappingEdge
        {...baseEdgeProps}
        data={{ groupId: 'g1', groupOrder: 1, kind: 'direct' }}
      />,
    );
    expect(screen.getByTestId('edge-label-renderer')).toBeInTheDocument();
    expect(screen.getByText('⊕')).toBeInTheDocument();
  });

  it('renders kind label when no groupId but kind is set', async () => {
    const { MappingEdge } = await import('../components/edges/MappingEdge');
    render(<MappingEdge {...baseEdgeProps} data={{ kind: 'formula' }} />);
    expect(screen.getByTestId('edge-label-renderer')).toBeInTheDocument();
    expect(screen.getByText('formula')).toBeInTheDocument();
  });

  it('applies selected stroke style', async () => {
    const { MappingEdge } = await import('../components/edges/MappingEdge');
    const { getBezierPath } = await import('@xyflow/react');
    render(<MappingEdge {...baseEdgeProps} selected={true} />);
    expect(getBezierPath).toHaveBeenCalled();
  });

  it('offsets sourceY for grouped edges', async () => {
    const { MappingEdge } = await import('../components/edges/MappingEdge');
    const { getBezierPath } = await import('@xyflow/react');
    const mockGetBezierPath = vi.mocked(getBezierPath);
    mockGetBezierPath.mockClear();
    render(
      <MappingEdge
        {...baseEdgeProps}
        data={{ groupId: 'g1', groupOrder: 2 }}
      />,
    );
    const call = mockGetBezierPath.mock.calls[0]![0];
    expect(call.sourceY).not.toBe(baseEdgeProps.sourceY);
  });
});

// ─── EdgeLabel ────────────────────────────────────────────────────────────────

describe('EdgeLabel', () => {
  it('renders its children inside the label renderer', async () => {
    const { EdgeLabel } = await import('../components/edges/EdgeLabel');
    render(
      <EdgeLabel labelX={50} labelY={50}>
        subClassOf
      </EdgeLabel>,
    );
    expect(screen.getByTestId('edge-label-renderer')).toBeInTheDocument();
    expect(screen.getByText('subClassOf')).toBeInTheDocument();
  });

  it('applies correct transform style', async () => {
    const { EdgeLabel } = await import('../components/edges/EdgeLabel');
    const { container } = render(
      <EdgeLabel labelX={30} labelY={40}>
        label
      </EdgeLabel>,
    );
    // div > div > div: container → EdgeLabelRenderer mock → inner styled div
    const inner = container.querySelector(
      'div > div > div',
    ) as HTMLElement | null;
    expect(inner?.style.transform).toContain('30px');
    expect(inner?.style.transform).toContain('40px');
  });
});

// ─── SubclassEdge ─────────────────────────────────────────────────────────────

describe('SubclassEdge', () => {
  it('renders base edge and subClassOf label', async () => {
    const { SubclassEdge } = await import('../components/edges/SubclassEdge');
    render(<SubclassEdge {...baseEdgeProps} />);
    expect(screen.getByTestId('base-edge')).toBeInTheDocument();
    expect(screen.getByText('subClassOf')).toBeInTheDocument();
  });
});

// ─── ObjectPropertyEdge ───────────────────────────────────────────────────────

describe('ObjectPropertyEdge', () => {
  it('renders base edge with an object property label', async () => {
    const { ObjectPropertyEdge } =
      await import('../components/edges/ObjectPropertyEdge');
    render(
      <ObjectPropertyEdge {...baseEdgeProps} data={{ label: 'ex:knows' }} />,
    );
    expect(screen.getByTestId('base-edge')).toBeInTheDocument();
  });
});
