import { test, expect } from './fixtures';
import { fillCodeMirror } from './helpers';

test.describe('Source management', () => {
  test('4 - Add a source', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click();
    // The new pill should appear and be active
    const pill = page.getByRole('button', { name: 'Select source Source 1' });
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute('aria-current', 'true');
  });

  test('5 - Rename source via Enter', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click();
    // Double-click the pill to start inline editing
    await page
      .getByRole('button', { name: 'Select source Source 1' })
      .dblclick();
    // The rename input should have focus
    const renameInput = page.getByRole('textbox', { name: /Rename source/ });
    await renameInput.fill('MySource');
    await page.keyboard.press('Enter');
    // Pill should now show the new name
    await expect(
      page.getByRole('button', { name: 'Select source MySource' }),
    ).toBeVisible();
  });

  test('6 - Rename cancel via Escape', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click();
    await page
      .getByRole('button', { name: 'Select source Source 1' })
      .dblclick();
    const renameInput = page.getByRole('textbox', { name: /Rename source/ });
    await renameInput.fill('Xyz');
    await page.keyboard.press('Escape');
    // Pill should still show original name
    await expect(
      page.getByRole('button', { name: 'Select source Source 1' }),
    ).toBeVisible();
  });

  test('7 - Delete source with no data', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click();
    await page
      .getByRole('button', { name: 'Select source Source 1' })
      .waitFor({ state: 'visible' });
    // Click delete — no confirm dialog expected for empty source
    await page.getByRole('button', { name: 'Delete source Source 1' }).click();
    await expect(
      page.getByRole('button', { name: 'Select source Source 1' }),
    ).toHaveCount(0);
  });

  test('8 - Delete source with data — confirm', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click();
    await page
      .getByRole('button', { name: 'Select source Source 1' })
      .waitFor({ state: 'visible' });
    // Add some JSON data
    await fillCodeMirror(page, 'JSON source editor', '{"id":1}');
    await page.waitForTimeout(700); // let debounce settle
    // Delete should trigger confirm dialog
    await page.getByRole('button', { name: 'Delete source Source 1' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Confirm deletion
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(
      page.getByRole('button', { name: 'Select source Source 1' }),
    ).toHaveCount(0);
  });

  test('9 - Delete source with data — cancel', async ({ freshPage: page }) => {
    await page.getByRole('button', { name: 'Add new source' }).click();
    await page
      .getByRole('button', { name: 'Select source Source 1' })
      .waitFor({ state: 'visible' });
    await fillCodeMirror(page, 'JSON source editor', '{"id":1}');
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Delete source Source 1' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    // Pill should still exist
    await expect(
      page.getByRole('button', { name: 'Select source Source 1' }),
    ).toBeVisible();
  });

  test('10 - Switch between sources changes SRC content', async ({
    freshPage: page,
  }) => {
    // Add first source with JSON
    await page.getByRole('button', { name: 'Add new source' }).click();
    await page
      .getByRole('button', { name: 'Select source Source 1' })
      .waitFor({ state: 'visible' });
    await fillCodeMirror(page, 'JSON source editor', '{"alpha":1}');
    await page.waitForTimeout(700);

    // Add second source with different JSON
    await page.getByRole('button', { name: 'Add new source' }).click();
    await page
      .getByRole('button', { name: 'Select source Source 2' })
      .waitFor({ state: 'visible' });
    await fillCodeMirror(page, 'JSON source editor', '{"beta":2}');
    await page.waitForTimeout(700);

    // Switch to Source 1 and check content
    await page.getByRole('button', { name: 'Select source Source 1' }).click();
    await page.waitForTimeout(300);
    const editorContent1 = await page
      .locator('[aria-label="JSON source editor"] .cm-content')
      .textContent();
    expect(editorContent1).toContain('alpha');

    // Switch to Source 2 and check content
    await page.getByRole('button', { name: 'Select source Source 2' }).click();
    await page.waitForTimeout(300);
    const editorContent2 = await page
      .locator('[aria-label="JSON source editor"] .cm-content')
      .textContent();
    expect(editorContent2).toContain('beta');
  });
});
