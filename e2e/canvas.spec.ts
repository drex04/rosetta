import { test, expect } from './fixtures';
import { loadExampleProject } from './helpers';

test.describe('Canvas', () => {
  test('29 - Class nodes appear after example project', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    const classNodes = page.locator('.react-flow__node-classNode');
    expect(await classNodes.count()).toBeGreaterThan(1);
  });

  test('30 - Source nodes appear when source selected', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    const sourceNodes = page.locator('.react-flow__node-sourceNode');
    expect(await sourceNodes.count()).toBeGreaterThan(0);
  });

  test('31 - Mapping edges appear', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    const mappingEdges = page.locator('.react-flow__edge[data-id^="mapping_"]');
    expect(await mappingEdges.count()).toBeGreaterThan(0);
  });

  test('32 - Subclass edges render', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    // Subclass edges have type="subclassEdge" set on the SVG group
    const subclassEdges = page.locator('.react-flow__edge-subclassEdge');
    expect(await subclassEdges.count()).toBeGreaterThan(0);
  });

  test('33 - MiniMap is present', async ({ freshPage: page }) => {
    await loadExampleProject(page);
    await expect(page.locator('.react-flow__minimap')).toBeVisible();
  });

  test('34 - Source nodes switch with active source', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    // Record current source node IDs for source A (the first active source)
    const getNodeIds = async () => {
      const nodes = page.locator('.react-flow__node-sourceNode');
      const count = await nodes.count();
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const id = await nodes.nth(i).getAttribute('data-id');
        if (id) ids.push(id);
      }
      return ids;
    };

    const idsA = await getNodeIds();

    // Switch to the second source
    const pills = page.getByRole('button', { name: /Select source/ });
    await pills.nth(1).click();
    await page.waitForTimeout(300);

    const idsB = await getNodeIds();

    // The source node sets should differ (different schema)
    const differentNodes =
      idsA.some((id) => !idsB.includes(id)) ||
      idsB.some((id) => !idsA.includes(id));
    expect(differentNodes).toBe(true);
  });
});
