import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const onDelete = vi.fn();
  const focus = vi.fn();
  const select = vi.fn();

  const searchInputRef = {
    current: { focus, select } as unknown as HTMLInputElement,
  };

  beforeEach(() => {
    onDelete.mockReset();
    focus.mockReset();
    select.mockReset();
  });

  // ─── Search shortcut ──────────────────────────────────────────────────────────

  it('Ctrl+F focuses and selects the search input', () => {
    renderHook(() => useKeyboardShortcuts({ searchInputRef, onDelete }));
    fireEvent.keyDown(document, { key: 'f', ctrlKey: true });
    expect(focus).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();
  });

  it('Meta+F focuses and selects the search input', () => {
    renderHook(() => useKeyboardShortcuts({ searchInputRef, onDelete }));
    fireEvent.keyDown(document, { key: 'f', metaKey: true });
    expect(focus).toHaveBeenCalled();
    expect(select).toHaveBeenCalled();
  });

  it('Ctrl+F works when searchInputRef.current is null', () => {
    const nullRef = { current: null };
    renderHook(() =>
      useKeyboardShortcuts({ searchInputRef: nullRef, onDelete }),
    );
    // Should not throw even with null ref
    expect(() =>
      fireEvent.keyDown(document, { key: 'f', ctrlKey: true }),
    ).not.toThrow();
  });

  // ─── Delete shortcut ──────────────────────────────────────────────────────────

  it('Delete key calls onDelete', () => {
    renderHook(() => useKeyboardShortcuts({ searchInputRef, onDelete }));
    fireEvent.keyDown(document, { key: 'Delete' });
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('Backspace key calls onDelete', () => {
    renderHook(() => useKeyboardShortcuts({ searchInputRef, onDelete }));
    fireEvent.keyDown(document, { key: 'Backspace' });
    expect(onDelete).toHaveBeenCalledOnce();
  });

  // ─── Ignored targets ──────────────────────────────────────────────────────────

  it('Delete on an INPUT element is ignored', () => {
    renderHook(() => useKeyboardShortcuts({ searchInputRef, onDelete }));
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'Delete' });
    document.body.removeChild(input);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('Delete on a TEXTAREA element is ignored', () => {
    renderHook(() => useKeyboardShortcuts({ searchInputRef, onDelete }));
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: 'Delete' });
    document.body.removeChild(textarea);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('Delete on a contentEditable element is ignored', () => {
    renderHook(() => useKeyboardShortcuts({ searchInputRef, onDelete }));
    const div = document.createElement('div');
    // jsdom doesn't reflect contentEditable → isContentEditable automatically;
    // define the property directly on the instance to match the DOM spec.
    Object.defineProperty(div, 'isContentEditable', { get: () => true });
    document.body.appendChild(div);
    fireEvent.keyDown(div, { key: 'Delete' });
    document.body.removeChild(div);
    expect(onDelete).not.toHaveBeenCalled();
  });

  // ─── Cleanup ──────────────────────────────────────────────────────────────────

  it('removes the keydown listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ searchInputRef, onDelete }),
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('does not call onDelete after unmount', () => {
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ searchInputRef, onDelete }),
    );
    unmount();
    fireEvent.keyDown(document, { key: 'Delete' });
    expect(onDelete).not.toHaveBeenCalled();
  });
});
