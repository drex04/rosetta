import { test, expect } from './fixtures'

test.describe('Layout', () => {
  test('status bar is visible at the bottom', async ({ freshPage: page }) => {
    const footer = page.getByRole('contentinfo')
    await expect(footer).toBeVisible()
    const githubBtn = footer.getByRole('button', { name: /GitHub/ })
    await expect(githubBtn).toBeVisible()
  })

  test('header does not contain save status or GitHub button', async ({ freshPage: page }) => {
    const header = page.getByRole('banner')
    await expect(header).not.toContainText('Saved')
    await expect(header.getByRole('button', { name: /GitHub/i })).toHaveCount(0)
  })

  test('right panel collapses and expands on desktop', async ({ freshPage: page }) => {
    const aside = page.locator('aside[aria-label="Right panel"]')

    // Collapse
    await page.getByRole('button', { name: 'Collapse panel' }).click()
    await page.waitForTimeout(100)

    const collapsedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width)
    expect(collapsedWidth).toBeLessThanOrEqual(48)

    // Expand
    await page.getByRole('button', { name: 'Expand panel' }).click()
    await page.waitForTimeout(100)

    const expandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width)
    expect(expandedWidth).toBeGreaterThan(200)
  })

  test('right panel can be drag-resized on desktop', async ({ freshPage: page }) => {
    const aside = page.locator('aside[aria-label="Right panel"]')
    const handle = page.locator('aside[aria-label="Right panel"] > div[aria-hidden="true"]').first()

    const initialWidth = await aside.evaluate((el) => el.getBoundingClientRect().width)

    const handleBox = await handle.boundingBox()
    if (!handleBox) throw new Error('Could not get handle bounding box')

    const x = handleBox.x + handleBox.width / 2
    const y = handleBox.y + handleBox.height / 2

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 80, y)
    await page.mouse.up()
    await page.waitForTimeout(100)

    const newWidth = await aside.evaluate((el) => el.getBoundingClientRect().width)
    expect(newWidth).toBeGreaterThan(initialWidth + 60)
  })

  test('right panel expands to full width on mobile', async ({ freshPage: page }) => {
    // Clear persisted state before loading at mobile viewport
    await page.evaluate(() => {
      const deleteRequest = indexedDB.deleteDatabase('keyval-store')
      deleteRequest.onerror = () => { /* ignore */ }
      localStorage.removeItem('rosetta-ui')
    })

    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const aside = page.locator('aside[aria-label="Right panel"]')

    // Panel should initially be visible (not collapsed) — tabs should be visible
    const tabs = aside.getByRole('tab').first()
    await expect(tabs).toBeVisible()

    // Collapse
    await page.getByRole('button', { name: 'Collapse panel' }).click()
    await page.waitForTimeout(100)

    const collapsedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width)
    expect(collapsedWidth).toBeLessThanOrEqual(48)

    // Expand — on mobile the panel should be full width
    await page.getByRole('button', { name: 'Expand panel' }).click()
    await page.waitForTimeout(100)

    const expandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width)
    expect(expandedWidth).toBeGreaterThan(370) // 375 ± 5px
  })
})
