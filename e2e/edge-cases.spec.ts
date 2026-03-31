import { test, expect } from './fixtures'
import { loadExampleProject, clickTab, fillCodeMirror } from './helpers'

test.describe('Edge cases', () => {
  test('38 - Delete source with mappings removes orphan edges', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    const mappingEdgesBefore = await page.locator('.react-flow__edge[data-id^="mapping_"]').count()
    expect(mappingEdgesBefore).toBeGreaterThan(0)

    // Delete the first source (the active one)
    const firstPill = page.getByRole('button', { name: /Select source/ }).first()
    const pillName = await firstPill.getAttribute('aria-label')
    // Extract source name from aria-label "Select source <name>"
    const sourceName = pillName?.replace('Select source ', '') ?? 'Source 1'

    // Click delete — may show confirm dialog because source has data
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: `Delete source ${sourceName}` }).click()

    // If a Radix confirm dialog appears, confirm it
    const dialog = page.getByRole('dialog')
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'Delete' }).click()
    }

    await page.waitForTimeout(500)
    const mappingEdgesAfter = await page.locator('.react-flow__edge[data-id^="mapping_"]').count()
    expect(mappingEdgesAfter).toBeLessThan(mappingEdgesBefore)
  })

  test('39 - Rapid tab switching does not crash', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    const tabs = ['Source tab', 'Ontology tab', 'Mapping tab', 'Output tab']
    for (let i = 0; i < 5; i++) {
      for (const tab of tabs) {
        await page.getByRole('tab', { name: tab }).click()
      }
    }
    // End on SRC tab — panel should still be visible
    await clickTab(page, 'Source tab')
    // The source selector navigation should be visible
    await expect(page.locator('[aria-label="Source selector"]')).toBeVisible()
  })

  test('40 - Clear JSON then re-paste', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: 'Select source Source 1' }).waitFor({ state: 'visible' })

    // Paste valid JSON
    await fillCodeMirror(page, 'JSON source editor', '{"a":1}')
    await page.waitForTimeout(700)
    await expect(page.locator('[aria-label="Generated Turtle preview"]')).toBeVisible()

    // Clear the editor
    await fillCodeMirror(page, 'JSON source editor', '')
    await page.waitForTimeout(700)

    // Paste new JSON
    await fillCodeMirror(page, 'JSON source editor', '{"b":2}')
    await page.waitForTimeout(700)
    await expect(page.locator('[aria-label="Generated Turtle preview"]')).toBeVisible()
  })

  test('41 - Very large JSON does not freeze', async ({ freshPage: page }) => {
    test.setTimeout(90000) // typing 200-key JSON is slow
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: 'Select source Source 1' }).waitFor({ state: 'visible' })

    // Build a 200-key JSON object
    const bigObj: Record<string, number> = {}
    for (let i = 0; i < 200; i++) {
      bigObj[`field${i}`] = i
    }
    await fillCodeMirror(page, 'JSON source editor', JSON.stringify(bigObj))

    // Should remain responsive within 5 seconds
    await page.waitForTimeout(5000)
    await expect(page.getByText('Invalid JSON')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add new source' })).toBeVisible()
  })
})
