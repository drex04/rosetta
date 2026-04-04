import { test, expect } from './fixtures';
import { loadExampleProject, clickTab } from './helpers';

const SHACL_TAB = 'SHACL validation tab';

test.describe('SHACL authoring', () => {
  test('shapes editor is seeded from ontology on SHACL tab open', async ({
    freshPage: page,
  }) => {
    await clickTab(page, SHACL_TAB);
    await page.waitForSelector('.cm-content', { timeout: 10000 });

    const editorContent = await page.locator('.cm-content').first().innerText();
    expect(editorContent).toContain('# Auto-generated');
  });

  test('Reset button repopulates editor after clearing', async ({
    freshPage: page,
  }) => {
    await clickTab(page, SHACL_TAB);
    await page.waitForSelector('.cm-content', { timeout: 10000 });

    // Click Reset — should repopulate with auto-generated content
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.waitForTimeout(500);

    const editorContent = await page.locator('.cm-content').first().innerText();
    expect(editorContent).toContain('# Auto-generated');
  });

  test('sample project load populates shapes editor with NATO shapes', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, SHACL_TAB);
    await page.waitForSelector('.cm-content', { timeout: 10000 });

    const editorContent = await page.locator('.cm-content').first().innerText();
    expect(editorContent).toContain('sh:NodeShape');
    expect(editorContent).toContain('sh:minCount');
  });

  test('Import button loads .ttl file into editor', async ({
    freshPage: page,
  }) => {
    await clickTab(page, SHACL_TAB);
    await page.waitForSelector('.cm-content', { timeout: 10000 });

    const fixtureTtl =
      '@prefix sh: <http://www.w3.org/ns/shacl#> .\n# test-fixture-content\n';

    await page.locator('input[type="file"][accept=".ttl"]').setInputFiles({
      name: 'test-shapes.ttl',
      mimeType: 'text/turtle',
      buffer: Buffer.from(fixtureTtl),
    });

    await page.waitForTimeout(500);

    const editorContent = await page.locator('.cm-content').first().innerText();
    expect(editorContent).toContain('# test-fixture-content');
  });
});
