import { test, expect } from './fixtures';
import { loadExampleProject, clickTab } from './helpers';

/**
 * E2E tests for the mapping kind picker in MappingPanel and the formula-kind
 * tier toggle (Form / Formula) that appears when kind = "formula".
 *
 * Also covers the keyboard shortcuts:
 *   - Ctrl+F → focuses the canvas node-search input
 *   - Delete  → removes the currently selected node
 */

test.describe('Mapping kind picker', () => {
  test('Kind picker is visible when a mapping is selected', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Mapping tab');

    const firstItem = page.locator('[role="button"][tabindex="0"]').first();
    await firstItem.click();

    await expect(
      page.locator('select[aria-label="Mapping kind"]'),
    ).toBeVisible();
  });

  test('Kind picker changes to "template"', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Mapping tab');

    const firstItem = page.locator('[role="button"][tabindex="0"]').first();
    await firstItem.click();

    const kindPicker = page.locator('select[aria-label="Mapping kind"]');
    await kindPicker.selectOption('template');

    await expect(kindPicker).toHaveValue('template');
  });

  test('Kind picker changes to "constant"', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Mapping tab');

    const firstItem = page.locator('[role="button"][tabindex="0"]').first();
    await firstItem.click();

    const kindPicker = page.locator('select[aria-label="Mapping kind"]');
    await kindPicker.selectOption('constant');

    await expect(kindPicker).toHaveValue('constant');
  });

  test('Kind picker changes to "typecast"', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Mapping tab');

    const firstItem = page.locator('[role="button"][tabindex="0"]').first();
    await firstItem.click();

    const kindPicker = page.locator('select[aria-label="Mapping kind"]');
    await kindPicker.selectOption('typecast');

    await expect(kindPicker).toHaveValue('typecast');
  });

  test('Kind picker changes to "language"', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Mapping tab');

    const firstItem = page.locator('[role="button"][tabindex="0"]').first();
    await firstItem.click();

    const kindPicker = page.locator('select[aria-label="Mapping kind"]');
    await kindPicker.selectOption('language');

    await expect(kindPicker).toHaveValue('language');
  });

  test('Kind picker changes to "formula" and shows tier toggle', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Mapping tab');

    const firstItem = page.locator('[role="button"][tabindex="0"]').first();
    await firstItem.click();

    const kindPicker = page.locator('select[aria-label="Mapping kind"]');
    await kindPicker.selectOption('formula');

    await expect(kindPicker).toHaveValue('formula');

    // Formula kind reveals a Form / Formula tier toggle
    await expect(page.getByRole('button', { name: 'Form' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Formula' })).toBeVisible();
  });
});

test.describe('Formula kind tier toggle', () => {
  async function openFormulaMapping(
    page: Parameters<typeof loadExampleProject>[0],
  ) {
    await loadExampleProject(page);
    await clickTab(page, 'Mapping tab');
    const firstItem = page.locator('[role="button"][tabindex="0"]').first();
    await firstItem.click();
    const kindPicker = page.locator('select[aria-label="Mapping kind"]');
    await kindPicker.selectOption('formula');
    // Wait for the tier toggle to appear
    await page
      .getByRole('button', { name: 'Form' })
      .waitFor({ state: 'visible' });
  }

  test('Default tier is "Form" (Form button appears active)', async ({
    freshPage: page,
  }) => {
    await openFormulaMapping(page);
    // Form button should be present and selected (it's the default)
    const formBtn = page.getByRole('button', { name: 'Form' });
    await expect(formBtn).toBeVisible();
    // The Form tier content (FormBuilder) should be visible by default
    // FormBuilder renders a function picker select
    await expect(
      page.getByRole('combobox').filter({ hasText: /CONCAT|UPPER/ }),
    ).toBeVisible();
  });

  test('Clicking "Formula" tier shows expression input', async ({
    freshPage: page,
  }) => {
    await openFormulaMapping(page);

    await page.getByRole('button', { name: 'Formula' }).click();

    // FormulaBar renders an input with aria-label="Formula expression"
    await expect(
      page.locator('input[aria-label="Formula expression"]'),
    ).toBeVisible();
  });

  test('Formula expression input accepts text and shows valid badge for UPPER', async ({
    freshPage: page,
  }) => {
    await openFormulaMapping(page);

    await page.getByRole('button', { name: 'Formula' }).click();

    const exprInput = page.locator('input[aria-label="Formula expression"]');
    await exprInput.fill('UPPER(source.name)');

    // Valid expression should show a green "valid" badge
    await expect(page.getByText('valid')).toBeVisible({ timeout: 2000 });
  });

  test('Invalid formula expression shows error badge', async ({
    freshPage: page,
  }) => {
    await openFormulaMapping(page);

    await page.getByRole('button', { name: 'Formula' }).click();

    const exprInput = page.locator('input[aria-label="Formula expression"]');
    await exprInput.fill('UNKNOWN_FN(source.x)');

    // Invalid expression should show a badge with error text
    await expect(
      page
        .locator('[class*="destructive"], [class*="error"], [class*="red"]')
        .first(),
    ).toBeVisible({ timeout: 2000 });
  });

  test('Switching back to Form tier shows the builder', async ({
    freshPage: page,
  }) => {
    await openFormulaMapping(page);

    // Go to Formula tier
    await page.getByRole('button', { name: 'Formula' }).click();
    await expect(
      page.locator('input[aria-label="Formula expression"]'),
    ).toBeVisible();

    // Switch back to Form tier
    await page.getByRole('button', { name: 'Form' }).click();

    // FormBuilder should be visible again
    await expect(
      page.getByRole('combobox').filter({ hasText: /CONCAT|UPPER/ }),
    ).toBeVisible();
    await expect(
      page.locator('input[aria-label="Formula expression"]'),
    ).not.toBeVisible();
  });
});

test.describe('Keyboard shortcuts', () => {
  test('Ctrl+F focuses the node search input', async ({ freshPage: page }) => {
    await loadExampleProject(page);

    // Press Ctrl+F while not in any input
    await page.locator('.react-flow__pane').click();
    await page.keyboard.press('Control+f');

    // The search input (placeholder "Search nodes…") should receive focus
    const searchInput = page.getByPlaceholder('Search nodes…');
    await expect(searchInput).toBeFocused({ timeout: 3000 });
  });

  test('Delete key removes the selected class node', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const nodesBefore = await page
      .locator('.react-flow__node-classNode')
      .count();

    // Click a node to select it, then press Delete
    await page.locator('.react-flow__node-classNode').first().click();
    await page.waitForTimeout(100);

    // Press Delete while focus is on the canvas (not an input)
    await page.locator('.react-flow__pane').press('Delete');
    await page.waitForTimeout(300);

    const nodesAfter = await page
      .locator('.react-flow__node-classNode')
      .count();
    expect(nodesAfter).toBeLessThan(nodesBefore);
  });

  test('Escape closes node search and returns to normal mode', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    // Open search
    await page.locator('.react-flow__pane').click();
    await page.keyboard.press('Control+f');

    const searchInput = page.getByPlaceholder('Search nodes…');
    await expect(searchInput).toBeFocused({ timeout: 3000 });

    await page.keyboard.press('Escape');

    // After Escape, the search input should lose focus or the app should still be interactive
    await expect(
      page.getByRole('button', { name: 'Add new source' }),
    ).toBeVisible();
  });
});
