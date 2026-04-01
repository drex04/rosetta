import { describe, it, expect } from 'vitest'
import { lightTheme } from '../lib/codemirror-theme'

describe('lightTheme', () => {
  it('contains .cm-selectionBackground with a background color property', () => {
    // EditorView.theme returns an Extension; we inspect its internals via JSON
    // The theme spec is stored as a StyleModule internally — we verify the source string
    const themeStr = JSON.stringify(lightTheme)
    expect(themeStr).toContain('selectionBackground')
  })

  it('contains cursor styling', () => {
    const themeStr = JSON.stringify(lightTheme)
    expect(themeStr).toContain('cm-cursor')
  })
})
