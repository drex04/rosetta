import { test, expect } from './fixtures';
import { loadExampleProject, clickTab } from './helpers';

test.describe('Output panel — Fused & Export sections', () => {
  test('Transform & Fuse button is present in Output tab', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    await expect(
      page.getByRole('button', { name: 'Transform & Fuse' }),
    ).toBeVisible();
  });

  test('Transform & Fuse runs Comunica and renders JSON output', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    await page.getByRole('button', { name: 'Transform & Fuse' }).click();

    // Comunica is lazy-loaded and may take a few seconds — allow 30s
    await expect(
      page.locator('[aria-label="Fused JSON-LD output"]'),
    ).toBeVisible({
      timeout: 30000,
    });

    const content = await page
      .locator('[aria-label="Fused JSON-LD output"]')
      .locator('.cm-content')
      .textContent({ timeout: 30000 });
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(2); // not just "{}"
  });

  test('Download JSON-LD (fused) button triggers download after fusion', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    await page.getByRole('button', { name: 'Transform & Fuse' }).click();
    await page.locator('[aria-label="Fused JSON-LD output"]').waitFor({
      state: 'visible',
      timeout: 30000,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('[title="Download JSON-LD"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.jsonld$/);
  });

  test('RML accordion section is present in Output tab', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    // The RML accordion trigger should be visible
    await expect(page.getByText('RML').first()).toBeVisible();
  });

  test('RML accordion can be expanded and shows Download button', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    const downloadRml = page.locator('[title="Download RML"]');

    // Expand accordion if collapsed
    if (!(await downloadRml.isVisible())) {
      // Click the RML accordion trigger button
      await page.getByRole('button').filter({ hasText: /^RML/ }).click();
      await downloadRml.waitFor({ state: 'visible', timeout: 3000 });
    }

    await expect(downloadRml).toBeVisible();
  });

  test('Download RML triggers .rml.ttl file download', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    const downloadRml = page.locator('[title="Download RML"]');

    // Expand accordion if collapsed
    if (!(await downloadRml.isVisible())) {
      await page.getByRole('button').filter({ hasText: /^RML/ }).click();
      await downloadRml.waitFor({ state: 'visible', timeout: 3000 });
    }

    const downloadPromise = page.waitForEvent('download');
    await downloadRml.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(rml\.ttl|ttl)$/);
  });

  test('YARRRML accordion can be expanded and shows Download button', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    const downloadYarrrml = page.locator('[title="Download YARRRML"]');

    // Expand accordion if collapsed
    if (!(await downloadYarrrml.isVisible())) {
      await page
        .getByRole('button')
        .filter({ hasText: /^YARRRML/ })
        .click();
      await downloadYarrrml.waitFor({ state: 'visible', timeout: 3000 });
    }

    await expect(downloadYarrrml).toBeVisible();
  });

  test('Download YARRRML triggers .yarrrml.yml file download', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Output tab');

    const downloadYarrrml = page.locator('[title="Download YARRRML"]');

    if (!(await downloadYarrrml.isVisible())) {
      await page
        .getByRole('button')
        .filter({ hasText: /^YARRRML/ })
        .click();
      await downloadYarrrml.waitFor({ state: 'visible', timeout: 3000 });
    }

    const downloadPromise = page.waitForEvent('download');
    await downloadYarrrml.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(yarrrml\.yml|yml|yaml)$/);
  });
});
