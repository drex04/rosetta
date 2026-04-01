import { test, expect } from './fixtures'
import { loadExampleProject } from './helpers'

test.describe('Inline edit', () => {
  test('E2E-IE-01 - Double-click node header → edit → commit', async ({ freshPage: page }) => {
    await loadExampleProject(page)

    const firstNode = page.locator('.react-flow__node').first()
    const header = firstNode.locator('.bg-master').first()

    // Capture the original label text before editing
    const originalLabel = await header.textContent()

    // Enter edit mode
    await header.dblclick()

    // An input should appear inside the node
    const labelInput = firstNode.locator('input').first()
    await expect(labelInput).toBeVisible()

    // Type a new label
    await labelInput.fill('RenamedClass')
    await page.keyboard.press('Enter')

    // Inputs should be gone
    await expect(firstNode.locator('input').first()).not.toBeVisible()

    // New label should appear somewhere in the node header
    await expect(header).toContainText('RenamedClass')

    // Suppress unused variable warning — originalLabel captured for debugging
    void originalLabel
  })

  test('E2E-IE-02 - ESC cancels edit and restores original label', async ({ freshPage: page }) => {
    await loadExampleProject(page)

    const firstNode = page.locator('.react-flow__node').first()
    const header = firstNode.locator('.bg-master').first()

    // Capture original label
    const originalText = (await header.textContent()) ?? ''

    await header.dblclick()

    const labelInput = firstNode.locator('input').first()
    await expect(labelInput).toBeVisible()

    // Change value then escape
    await labelInput.fill('TemporaryLabel')
    await page.keyboard.press('Escape')

    // Input should be gone
    await expect(labelInput).not.toBeVisible()

    // Original text should still be present (trim icon text)
    const trimmed = originalText.trim()
    if (trimmed) {
      await expect(header).toContainText(trimmed.slice(0, 10))
    }
  })

  test('E2E-IE-03 - Empty label blocks commit (edit mode persists)', async ({ freshPage: page }) => {
    await loadExampleProject(page)

    const firstNode = page.locator('.react-flow__node').first()
    const header = firstNode.locator('.bg-master').first()

    await header.dblclick()

    const labelInput = firstNode.locator('input').first()
    await expect(labelInput).toBeVisible()

    // Clear and press Enter
    await labelInput.fill('')
    await page.keyboard.press('Enter')

    // Input should still be visible — validation blocked the commit
    await expect(labelInput).toBeVisible()
  })

  test('E2E-IE-04 - Panel button creates a new node', async ({ freshPage: page }) => {
    await loadExampleProject(page)

    const nodeBefore = await page.locator('.react-flow__node').count()

    await page.getByRole('button', { name: /\+ Ontology Class/i }).click()

    // Wait a tick for the node to render
    await page.waitForTimeout(300)

    const nodeAfter = await page.locator('.react-flow__node').count()
    expect(nodeAfter).toBeGreaterThan(nodeBefore)
  })

  test('E2E-IE-05 - Rename via context menu opens inline edit (no browser prompt)', async ({ freshPage: page }) => {
    await loadExampleProject(page)

    const firstNode = page.locator('.react-flow__node').first()

    // Right-click to open context menu
    await firstNode.click({ button: 'right' })

    // Click "Rename" in the context menu
    const renameItem = page.getByRole('menuitem', { name: /rename/i })
    await expect(renameItem).toBeVisible()
    await renameItem.click()

    // Inline inputs should appear — no native browser dialog
    const labelInput = firstNode.locator('input').first()
    await expect(labelInput).toBeVisible()
  })
})
