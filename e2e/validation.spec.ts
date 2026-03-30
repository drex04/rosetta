import { test, expect } from './fixtures'
import { loadExampleProject, clickTab } from './helpers'

test.describe('Validation panel', () => {
  test('VAL-1 - VAL tab is present in right panel', async ({ freshPage: page }) => {
    const valTab = page.getByRole('tab', { name: 'Validation tab' })
    await expect(valTab).toBeVisible()
    await valTab.click()
    // Panel should now be visible (aside is always rendered)
    await expect(page.getByRole('complementary', { name: 'Right panel' })).toBeVisible()
  })

  test('VAL-2 - VAL tab shows "Click Validate to run" before first run', async ({ freshPage: page }) => {
    // Add a source so the panel doesn't show "Select a source to validate."
    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: /Select source/ }).first().waitFor({ state: 'visible' })
    // Switch to VAL tab
    await clickTab(page, 'Validation tab')
    await expect(page.getByText('Click Validate to run.')).toBeVisible()
  })

  test('VAL-3 - Validate button exists in header', async ({ freshPage: page }) => {
    // NOTE: A dedicated "Validate" button (aria-label="Validate") in the header has not been
    // implemented yet — validation is triggered from a future UI element.
    // This test will be enabled once that button is added to the Header component.
    test.skip(true, 'Validate button not yet implemented in header (aria-label="Validate" missing)')
    await expect(page.getByRole('button', { name: 'Validate' })).toBeVisible()
  })

  test('VAL-4 - After validate with no mappings, VAL tab shows "All valid"', async ({ freshPage: page }) => {
    // NOTE: runValidation() in the store stub does not yet write results, so we cannot
    // trigger a real validation pass from the UI without the Validate button and full
    // store implementation. Skip until both are in place.
    test.skip(true, 'Requires Validate button in header + full runValidation implementation')

    await page.getByRole('button', { name: 'Add new source' }).click()
    await page.getByRole('button', { name: /Select source/ }).first().waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Validate' }).click()
    await clickTab(page, 'Validation tab')
    await expect(page.getByText(/All valid/)).toBeVisible()
  })

  test('VAL-5 - Stale banner appears after mapping change', async ({ freshPage: page }) => {
    // NOTE: Requires Validate button + full store implementation + mapping setup.
    test.skip(true, 'Requires Validate button in header + full runValidation implementation')

    await loadExampleProject(page)
    await page.getByRole('button', { name: 'Validate' }).click()
    // Add a source to trigger stale state via setStale
    await page.getByRole('button', { name: 'Add new source' }).click()
    await clickTab(page, 'Validation tab')
    await expect(page.getByText(/re-validate/)).toBeVisible()
  })

  test('VAL-6 - Source pills show ○ before validation, ✓ after valid run', async ({ freshPage: page }) => {
    // The ○ badge is always present before validation (aria-hidden, checked via text content)
    await page.getByRole('button', { name: 'Add new source' }).click()
    const pill = page.getByRole('button', { name: 'Select source Source 1' })
    await expect(pill).toBeVisible()
    // The ○ badge is a sibling span — check parent container text contains ○
    const pillContainer = page.locator('[aria-label="Source selector"] > div').first()
    const badgeSpan = pillContainer.locator('span[aria-hidden="true"]').first()
    await expect(badgeSpan).toHaveText('○')

    // ✓ badge assertion requires full runValidation — skip that part
    test.skip(true, 'The ✓ assertion requires Validate button + full runValidation implementation')
  })

  test('VAL-7 - Clicking a violation with canvasNodeId applies ring to SourceNode', async ({ freshPage: page }) => {
    // NOTE: Requires a known violation to be produced by runValidation with a canvasNodeId.
    // The current runValidation stub does not produce violations. Skip until the full
    // SHACL validation pipeline is wired up and a fixture with a known violation exists.
    test.skip(
      true,
      'Requires full runValidation implementation that produces ViolationRecord with canvasNodeId. ' +
      'When implemented: load example project, click Validate, click violation in VAL tab, ' +
      'assert page.locator(\'[data-id="{nodeId}"] > div\').first() has class ring-destructive.',
    )

    await loadExampleProject(page)
    await page.getByRole('button', { name: 'Validate' }).click()
    await clickTab(page, 'Validation tab')

    // Click the first violation that has a canvasNodeId link
    const violation = page.locator('[data-testid="violation-item"]').first()
    const canvasNodeId = await violation.getAttribute('data-canvas-node-id')
    await violation.click()

    if (canvasNodeId) {
      const nodeWrapper = page.locator(`[data-id="${canvasNodeId}"] > div`).first()
      await expect(nodeWrapper).toHaveClass(/ring-destructive/)
    }
  })
})
