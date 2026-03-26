import { test, expect } from './fixtures'
import { fillCodeMirror } from './helpers'

test.describe('Source panel', () => {
  test('11 - Valid JSON populates Turtle preview', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: 'Select source Source 1' }).waitFor({ state: 'visible' })
    await fillCodeMirror(page, 'JSON source editor', '{"id":1}')
    // Wait for debounce + turtle generation
    await page.waitForTimeout(700)
    const preview = page.locator('[aria-label="Generated Turtle preview"]')
    await expect(preview).toBeVisible()
    const previewText = await preview.locator('.cm-content').textContent()
    expect(previewText).toContain('@prefix')
  })

  test('12 - Invalid JSON shows error banner', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: 'Select source Source 1' }).waitFor({ state: 'visible' })
    await fillCodeMirror(page, 'JSON source editor', '{bad json')
    await page.waitForTimeout(700)
    await expect(page.getByText('Invalid JSON')).toBeVisible()
  })

  test('13 - Edit source name in SRC panel updates pill', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: 'Select source Source 1' }).waitFor({ state: 'visible' })
    // The source name input inside the SRC panel
    const nameInput = page.getByRole('textbox', { name: 'Source name' })
    await nameInput.clear()
    await nameInput.fill('Alpha')
    // Blur to commit
    await nameInput.blur()
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: 'Select source Alpha' })).toBeVisible()
  })
})
