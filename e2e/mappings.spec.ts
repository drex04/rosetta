import { test, expect } from './fixtures'
import { loadExampleProject, clickTab } from './helpers'

test.describe('Mappings (MAP tab)', () => {
  test('17 - MAP tab empty state on fresh app', async ({ freshPage: page }) => {
    // No sources loaded — just open MAP tab via the tab trigger
    await page.getByRole('tab', { name: 'Mapping tab' }).click()
    // With no active source the panel shows "No source selected"
    await expect(page.getByText('No source selected')).toBeVisible()
  })

  test('18 - Delete a mapping', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    await clickTab(page, 'Mapping tab')

    // Count mapping list items
    const mappingItems = page.locator('.react-flow__edge[data-id^="mapping_"]')
    const edgeCountBefore = await mappingItems.count()

    // Count rows in the mapping list (li elements inside MAP panel)
    const listItems = page.locator('[role="button"][tabindex="0"]')
    const listCountBefore = await listItems.count()

    // Click the first delete button (the × inside a mapping row).
    // Use CSS attribute selector to avoid matching the <li role="button"> parent whose
    // accessible name also contains the child button's aria-label text.
    await page.locator('button[aria-label*="Remove mapping"]').first().click()

    // Auto-wait for canvas and list to reflect the deletion
    await expect(page.locator('.react-flow__edge[data-id^="mapping_"]')).toHaveCount(edgeCountBefore - 1)
    await expect(page.locator('[role="button"][tabindex="0"]')).toHaveCount(listCountBefore - 1)
  })

  test('19 - Select mapping shows SPARQL', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    await clickTab(page, 'Mapping tab')

    // Click the first mapping list item
    const firstItem = page.locator('[role="button"][tabindex="0"]').first()
    await firstItem.click()

    // SPARQL editor should appear with CONSTRUCT content
    const sparqlEditor = page.locator('[aria-label="SPARQL CONSTRUCT editor"]')
    await expect(sparqlEditor).toBeVisible()
    const content = await sparqlEditor.locator('.cm-content').textContent()
    expect(content?.toUpperCase()).toContain('CONSTRUCT')
  })

  test('20 - Regenerate SPARQL', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    await clickTab(page, 'Mapping tab')

    const firstItem = page.locator('[role="button"][tabindex="0"]').first()
    await firstItem.click()

    const sparqlEditor = page.locator('[aria-label="SPARQL CONSTRUCT editor"]')
    await expect(sparqlEditor).toBeVisible()

    // Click Regenerate button
    await page.getByRole('button', { name: 'Regenerate' }).click()
    await page.waitForTimeout(300)

    // Content should still be non-empty and contain CONSTRUCT
    const content = await sparqlEditor.locator('.cm-content').textContent()
    expect(content).toBeTruthy()
    expect(content?.toUpperCase()).toContain('CONSTRUCT')
  })
})
