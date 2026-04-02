import { test, expect } from './fixtures';
import { loadExampleProject, clickTab } from './helpers';

test.describe('Output (OUT tab)', () => {
  test('21 - Turtle output is non-empty after example project', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    const turtleOutput = page.locator('[aria-label="Turtle output"]');
    await expect(turtleOutput).toBeVisible();
    const content = await turtleOutput.locator('.cm-content').textContent();
    expect(content).toContain('@prefix');
  });

  test('22 - JSON-LD output is non-empty after example project', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    // Click the JSON-LD toggle button
    await page.getByRole('button', { name: 'JSON-LD' }).click();
    // Wait for async conversion
    await page
      .locator('[aria-label="JSON-LD output"]')
      .waitFor({ state: 'visible', timeout: 15000 });

    const content = await page
      .locator('[aria-label="JSON-LD output"]')
      .locator('.cm-content')
      .textContent();
    expect(content).toContain('@type');
  });

  test('23 - Export .ttl triggers download', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export .ttl' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.ttl$/);
  });

  test('24 - Export .jsonld triggers download', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    // Switch to JSON-LD view first
    await page.getByRole('button', { name: 'JSON-LD' }).click();
    await page
      .locator('[aria-label="JSON-LD output"]')
      .waitFor({ state: 'visible', timeout: 15000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export .jsonld' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.jsonld$/);
  });
});
