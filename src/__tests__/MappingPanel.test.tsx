import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MappingPanel } from '../components/panels/MappingPanel';
import { useMappingStore } from '../store/mappingStore';
import { useSourcesStore } from '../store/sourcesStore';
import type { Mapping } from '../types/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMapping(
  overrides: Partial<Omit<Mapping, 'id'>> = {},
): Omit<Mapping, 'id'> {
  return {
    sourceId: 'src-1',
    sourceClassUri: 'http://example.org/Person',
    sourcePropUri: 'http://example.org/firstName',
    targetClassUri: 'http://nato.int/onto#Person',
    targetPropUri: 'http://nato.int/onto#givenName',
    sourceHandle: 'prop_firstName',
    targetHandle: 'target_prop_givenName',
    kind: 'direct',
    ...overrides,
  };
}

function setupStore(mappingOverrides: Partial<Omit<Mapping, 'id'>> = {}) {
  // Reset stores
  useMappingStore.setState({
    mappings: {},
    selectedMappingId: null,
    groups: {},
    _undoStack: [],
  });

  useSourcesStore.setState({
    sources: [
      {
        id: 'src-1',
        name: 'TestSource',
        dataFormat: 'json',
        rawData: '{}',
        schemaNodes: [],
        uriPrefix: 'http://example.org/',
      },
    ],
    activeSourceId: 'src-1',
  });

  const mappingId = useMappingStore
    .getState()
    .addMapping(makeMapping(mappingOverrides));
  useMappingStore.getState().setSelectedMappingId(mappingId);
  return mappingId;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useMappingStore.setState({
    mappings: {},
    selectedMappingId: null,
    groups: {},
    _undoStack: [],
  });
  useSourcesStore.setState({
    sources: [],
    activeSourceId: null,
  });
});

describe('MappingPanel — formula kind', () => {
  it('1. tier toggle visible for formula kind; NOT for direct kind', () => {
    // Formula kind — should show tier toggle
    setupStore({ kind: 'formula' });
    const { unmount } = render(<MappingPanel />);

    expect(screen.getByRole('button', { name: /^Form$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Formula$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^RML$/i })).toBeInTheDocument();
    unmount();

    // Direct kind — tier toggle NOT present
    setupStore({ kind: 'direct' });
    render(<MappingPanel />);
    expect(
      screen.queryByRole('button', { name: /^Form$/i }),
    ).not.toBeInTheDocument();
  });

  it('2. FormBuilder updates store with CONCAT expression', async () => {
    const id = setupStore({ kind: 'formula' });
    render(<MappingPanel />);

    // Default tier is 'form' — FormBuilder should be visible
    // The kind picker and function picker are both comboboxes; get all of them
    const allSelects = screen.getAllByRole('combobox');
    // Kind picker has options: direct/template/constant/typecast/language/formula
    // Function picker has options: CONCAT/UPPER/LOWER/TRIM/REPLACE
    const fnPicker = allSelects.find(
      (s) =>
        (s as HTMLSelectElement).value === 'CONCAT' ||
        Array.from((s as HTMLSelectElement).options).some(
          (o) => o.value === 'CONCAT',
        ),
    ) as HTMLSelectElement | undefined;
    expect(fnPicker).toBeDefined();

    // Set function to CONCAT
    await act(async () => {
      fireEvent.change(fnPicker!, { target: { value: 'CONCAT' } });
    });

    // Fill Arg 1
    const argInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    // FormulaBar not shown in Form tier, so all textbox inputs are arg inputs
    await act(async () => {
      fireEvent.change(argInputs[0]!, { target: { value: 'source.a' } });
    });
    await act(async () => {
      fireEvent.change(argInputs[1]!, { target: { value: 'source.b' } });
    });

    const storedExpr = useMappingStore
      .getState()
      .mappings['src-1']?.find((m) => m.id === id)?.formulaExpression;

    expect(storedExpr).toBe('CONCAT(source.a, source.b)');
  });

  it('3. FormulaBar shows valid badge for valid expression', async () => {
    setupStore({ kind: 'formula', formulaExpression: '' });
    render(<MappingPanel />);

    // Switch to Formula tier
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Formula$/i }));
    });

    const input = screen.getByRole('textbox', {
      name: /formula expression/i,
    }) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'UPPER(source.name)' } });
    });

    expect(screen.getByText('valid')).toBeInTheDocument();
  });

  it('4. FormulaBar shows error badge for unknown function', async () => {
    setupStore({ kind: 'formula', formulaExpression: '' });
    render(<MappingPanel />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Formula$/i }));
    });

    const input = screen.getByRole('textbox', {
      name: /formula expression/i,
    }) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'FOO(source.x)' } });
    });

    // Should show error badge containing "unknown function" (case-insensitive)
    const badge = screen.getByText(/unknown function/i);
    expect(badge).toBeInTheDocument();
  });

  it('5. Formula→Form round-trip: parseable expression populates form fields', async () => {
    setupStore({ kind: 'formula', formulaExpression: 'UPPER(source.name)' });
    render(<MappingPanel />);

    // Default tier is 'form' — FormBuilder should show UPPER + source.name
    const allSelects = screen.getAllByRole('combobox');
    const fnPicker = allSelects.find((s) =>
      Array.from((s as HTMLSelectElement).options).some(
        (o) => o.value === 'UPPER',
      ),
    ) as HTMLSelectElement | undefined;
    expect(fnPicker).toBeDefined();
    expect(fnPicker!.value).toBe('UPPER');

    const argInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(argInputs[0]!.value).toBe('source.name');
  });

  it('6. Formula→Form round-trip: complex nested expression shows "too complex" note', async () => {
    setupStore({
      kind: 'formula',
      formulaExpression: 'CONCAT(UPPER(source.a), source.b)',
    });
    render(<MappingPanel />);

    // Default tier is form — should show complex note
    expect(
      screen.getByText(/expression too complex for form view/i),
    ).toBeInTheDocument();
  });

  it('7. RML tier shows font-mono Turtle pane', async () => {
    setupStore({ kind: 'formula' });
    render(<MappingPanel />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^RML$/i }));
    });

    // The RML pane is a div with font-mono class
    const rmlDivs = document.querySelectorAll('.font-mono');
    expect(rmlDivs.length).toBeGreaterThan(0);
  });

  it('8. Tier resets to Form when a different mapping is selected', async () => {
    // Set up two mappings
    const id1 = setupStore({ kind: 'formula' });
    const id2 = useMappingStore.getState().addMapping(
      makeMapping({
        kind: 'formula',
        sourcePropUri: 'http://example.org/lastName',
        sourceHandle: 'prop_lastName',
        targetHandle: 'target_prop_familyName',
        targetPropUri: 'http://nato.int/onto#familyName',
      }),
    );

    render(<MappingPanel />);

    // Switch to Formula tier on mapping 1
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Formula$/i }));
    });
    // Formula tier should be active (input visible)
    expect(
      screen.getByRole('textbox', { name: /formula expression/i }),
    ).toBeInTheDocument();

    // Select mapping 2 (click its row in the list)
    await act(async () => {
      useMappingStore.getState().setSelectedMappingId(id2);
    });

    // Re-render reflects new selection; tier should have reset to 'form'
    // The formula expression textbox should NOT be visible (we're on Form tier)
    expect(
      screen.queryByRole('textbox', { name: /formula expression/i }),
    ).not.toBeInTheDocument();
  });
});
