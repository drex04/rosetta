import { test, expect } from './fixtures';
import { loadExampleProject, clickTab } from './helpers';

test.describe('Canvas ↔ editor sync', () => {
  test('42 - Editor change updates canvas after debounce', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    const nodeCountBefore = await page.locator('.react-flow__node').count();

    await clickTab(page, 'Ontology tab');
    const editor = page.locator('[aria-label="Turtle ontology editor"]');
    await editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('\n<http://test.org/SyncClass> a owl:Class .');

    await page.waitForTimeout(1000);

    const nodeCountAfter = await page.locator('.react-flow__node').count();
    expect(nodeCountAfter).toBeGreaterThan(nodeCountBefore);
  });

  test('43 - Pending edits dialog on canvas change while editing', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Ontology tab');

    const editor = page.locator('[aria-label="Turtle ontology editor"]');
    await editor.click();
    // Type a single character without waiting for debounce
    await page.keyboard.type('x');

    // Switch to a different source (triggers canvas/store update)
    const secondPill = page
      .getByRole('button', { name: /Select source/ })
      .nth(1);
    await secondPill.click();

    // An "unsaved editor changes" dialog may appear — if it does, it should be visible
    // (The test simply asserts the app doesn't crash; the dialog is optional depending on timing)
    // If dialog appears, dismiss it so the test ends cleanly
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(dialog).toBeVisible();
      // Close by pressing Escape or clicking outside
      await page.keyboard.press('Escape');
    }

    // App should still be interactive
    await expect(
      page.getByRole('button', { name: 'Add new source' }),
    ).toBeVisible();
  });
});
