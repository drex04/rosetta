import { test, expect } from './fixtures'
import { fillCodeMirror } from './helpers'

test.describe('Schema generation', () => {
  test('35 - Nested JSON generates multiple class nodes', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: 'Select source Source 1' }).waitFor({ state: 'visible' })
    await fillCodeMirror(page, 'JSON source editor', '{"vehicle":{"position":{"lat":1,"lon":2}}}')
    await page.waitForTimeout(700)
    const sourceNodes = page.locator('.react-flow__node-sourceNode')
    expect(await sourceNodes.count()).toBeGreaterThan(1)
  })

  test('36 - Array fields do not crash', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: 'Select source Source 1' }).waitFor({ state: 'visible' })
    await fillCodeMirror(page, 'JSON source editor', '{"items":[{"id":1},{"id":2}]}')
    await page.waitForTimeout(700)
    // No error banner, page still responsive
    await expect(page.getByText('Invalid JSON')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add new source' })).toBeVisible()
  })

  test('37 - Empty JSON object produces no source nodes', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: 'Select source Source 1' }).waitFor({ state: 'visible' })
    await fillCodeMirror(page, 'JSON source editor', '{}')
    await page.waitForTimeout(700)
    // No Invalid JSON banner
    await expect(page.getByText('Invalid JSON')).toHaveCount(0)
    // No source nodes on canvas
    await expect(page.locator('.react-flow__node-sourceNode')).toHaveCount(0)
  })
})
