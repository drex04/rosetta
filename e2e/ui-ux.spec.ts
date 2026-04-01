import { test, expect } from './fixtures'

test('SOURCE tab is visible and selected by default', async ({ freshPage: page }) => {
  await expect(page.getByRole('tab', { name: 'SOURCE' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'SOURCE' })).toHaveAttribute('data-state', 'active')
})

test('Validate button appears in SHACL tab, not toolbar', async ({ freshPage: page }) => {
  await expect(page.locator('header').getByRole('button', { name: 'Validate' })).not.toBeVisible()
  await page.getByRole('tab', { name: 'SHACL' }).click()
  await expect(page.getByRole('button', { name: 'Validate' })).toBeVisible()
})

test('Add Source button is labeled in source bar', async ({ freshPage: page }) => {
  await expect(page.getByRole('button', { name: 'Add source' })).toBeVisible()
})
