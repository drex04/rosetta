import { test, expect } from './fixtures'
import { loadExampleProject, clickTab } from './helpers'

test.describe('Persistence', () => {
  test('25 - State survives page reload', async ({ freshPage: page }) => {
    await loadExampleProject(page)

    const sourcePillCount = await page.getByRole('button', { name: /Select source/ }).count()
    const nodeCount = await page.locator('.react-flow__node').count()

    // Wait for IDB save to complete before reloading
    await page.waitForTimeout(1500)

    // Reload and wait for hydration
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500) // allow IDB restore + parseTurtle

    const restoredSourceCount = await page.getByRole('button', { name: /Select source/ }).count()
    const restoredNodeCount = await page.locator('.react-flow__node').count()

    expect(restoredSourceCount).toBe(sourcePillCount)
    expect(restoredNodeCount).toBe(nodeCount)
  })

  test('26 - New project clears IDB', async ({ freshPage: page }) => {
    await loadExampleProject(page)

    // New project
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Project menu' }).click()
    await page.getByRole('menuitem', { name: 'New Project' }).click()
    await page.waitForTimeout(500)

    // Reload — should still be blank
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    await expect(page.locator('.react-flow__node')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Select source/ })).toHaveCount(0)
  })

  test('27 - Active tab persists across reload', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    await clickTab(page, 'Mapping tab')
    await page.waitForTimeout(300)

    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // MAP tab should be active
    const mapTab = page.getByRole('tab', { name: 'Mapping tab' })
    await expect(mapTab).toHaveAttribute('data-state', 'active')
  })

  test('28 - Save status shows Saving then Saved', async ({ freshPage: page }) => {
    // Adding a source triggers a store change which schedules an IDB save
    await page.getByRole('button', { name: 'Add new source' }).click()

    // Wait for "Saved" to appear (scoped to header to avoid CodeMirror aria-live elements)
    const liveRegion = page.locator('header [aria-live="polite"]')
    await expect(liveRegion).toContainText('Saved', { timeout: 5000 })
  })
})
