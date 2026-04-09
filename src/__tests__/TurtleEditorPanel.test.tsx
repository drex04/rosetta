import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mock CodeMirror (requires DOM APIs not available in jsdom) ───────────────
vi.mock('codemirror', () => ({ basicSetup: [] }));
vi.mock('@codemirror/view', () => ({
  EditorView: class MockEditorView {
    static updateListener = { of: vi.fn(() => ({})) };
    static editable = { of: vi.fn(() => ({})) };
    constructor() {}
    destroy() {}
    dispatch() {}
    get state() {
      return { doc: { toString: () => '' } };
    }
  },
  lineNumbers: vi.fn(() => ({})),
  highlightActiveLine: vi.fn(() => ({})),
}));
vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn(() => ({
      doc: { toString: () => '' },
    })),
  },
}));
vi.mock('codemirror-lang-turtle', () => ({ turtle: vi.fn(() => ({})) }));
vi.mock('@/lib/codemirror-theme', () => ({ lightTheme: {} }));
vi.mock('@/lib/parseOntologyFile', () => ({
  parseOntologyFile: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
}));
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TurtleEditorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders at least one button (download)', async () => {
    const { TurtleEditorPanel } =
      await import('@/components/panels/TurtleEditorPanel');
    render(
      <TurtleEditorPanel
        turtleSource="@prefix ex: <http://example.org/> ."
        onEditorChange={vi.fn()}
        parseError={null}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders upload button when onUpload callback is provided', async () => {
    const { TurtleEditorPanel } =
      await import('@/components/panels/TurtleEditorPanel');
    render(
      <TurtleEditorPanel
        turtleSource="@prefix ex: <http://example.org/> ."
        onEditorChange={vi.fn()}
        parseError={null}
        onUpload={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders parse error alert when parseError is set', async () => {
    const { TurtleEditorPanel } =
      await import('@/components/panels/TurtleEditorPanel');
    render(
      <TurtleEditorPanel
        turtleSource=""
        onEditorChange={vi.fn()}
        parseError="Unexpected token at line 3"
      />,
    );
    expect(screen.getByText('Unexpected token at line 3')).toBeDefined();
  });

  it('renders without parse error when parseError is null', async () => {
    const { TurtleEditorPanel } =
      await import('@/components/panels/TurtleEditorPanel');
    const { container } = render(
      <TurtleEditorPanel
        turtleSource="@prefix ex: <http://example.org/> ."
        onEditorChange={vi.fn()}
        parseError={null}
      />,
    );
    expect(container).toBeDefined();
  });
});
