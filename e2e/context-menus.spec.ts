import { test, expect } from './fixtures';
import { loadExampleProject, clickTab } from './helpers';

/**
 * E2E tests for right-click context menus on the canvas, class nodes, and edges.
 *
 * - CanvasContextMenu: right-click on empty canvas area → Add Class / Add Source Class
 * - NodeContextMenu: right-click on a class node → Add Property / Rename / Delete Node
 * - EdgeContextMenu: right-click on a mapping edge → kind picker / Delete mapping
 */

test.describe('Canvas context menu', () => {
  test('Right-click on canvas shows Add Class option', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    // Right-click on the React Flow pane (background, not a node)
    const pane = page.locator('.react-flow__pane');
    await pane.click({ button: 'right', position: { x: 50, y: 50 } });

    await expect(page.getByText('Add Class')).toBeVisible({ timeout: 3000 });
  });

  test('Add Class via canvas context menu creates a new class node', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const nodesBefore = await page
      .locator('.react-flow__node-classNode')
      .count();

    // Right-click on empty canvas area and add a class
    const pane = page.locator('.react-flow__pane');
    await pane.click({ button: 'right', position: { x: 50, y: 50 } });
    await page.getByText('Add Class').click();

    await page.waitForTimeout(300);

    const nodesAfter = await page
      .locator('.react-flow__node-classNode')
      .count();
    expect(nodesAfter).toBeGreaterThan(nodesBefore);
  });

  test('Canvas context menu closes on Escape', async ({ freshPage: page }) => {
    await loadExampleProject(page);

    const pane = page.locator('.react-flow__pane');
    await pane.click({ button: 'right', position: { x: 50, y: 50 } });
    await expect(page.getByText('Add Class')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(page.getByText('Add Class')).not.toBeVisible({
      timeout: 2000,
    });
  });
});

test.describe('Node context menu', () => {
  test('Right-click on class node shows Add Property and Delete Node', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const classNode = page.locator('.react-flow__node-classNode').first();
    await classNode.click({ button: 'right' });

    await expect(page.getByText('Add Property')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Delete Node')).toBeVisible({ timeout: 3000 });
  });

  test('Delete Node via context menu removes node from canvas', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const nodesBefore = await page
      .locator('.react-flow__node-classNode')
      .count();

    // Right-click first class node and delete it
    const classNode = page.locator('.react-flow__node-classNode').first();
    await classNode.click({ button: 'right' });

    await page.getByText('Delete Node').click();
    await page.waitForTimeout(300);

    const nodesAfter = await page
      .locator('.react-flow__node-classNode')
      .count();
    expect(nodesAfter).toBeLessThan(nodesBefore);
  });

  test('Add Property via context menu opens the add-property dialog', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const classNode = page.locator('.react-flow__node-classNode').first();
    await classNode.click({ button: 'right' });

    await page.getByText('Add Property').click();

    // AddPropertyDialog renders a form with a property name input
    await expect(page.getByPlaceholder('e.g. trackId')).toBeVisible({
      timeout: 3000,
    });
  });

  test('Adding a property via dialog adds it to the node', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const classNode = page.locator('.react-flow__node-classNode').first();
    await classNode.click({ button: 'right' });
    await page.getByText('Add Property').click();

    // Fill in the property name
    await page.getByPlaceholder('e.g. trackId').fill('testProp');

    // Submit the form (the dialog has an "Add Property" button of type submit)
    await page.getByRole('button', { name: 'Add Property' }).click();
    await page.waitForTimeout(300);

    // The node should now render this property handle label
    await expect(page.getByText('testProp')).toBeVisible({ timeout: 3000 });
  });

  test('Node context menu closes on Escape', async ({ freshPage: page }) => {
    await loadExampleProject(page);

    const classNode = page.locator('.react-flow__node-classNode').first();
    await classNode.click({ button: 'right' });
    await expect(page.getByText('Delete Node')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(page.getByText('Delete Node')).not.toBeVisible({
      timeout: 2000,
    });
  });
});

test.describe('Edge context menu — mapping edges', () => {
  test('Right-click on mapping edge shows kind options and Delete mapping', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const mappingEdge = page
      .locator('.react-flow__edge[data-id^="mapping_"]')
      .first();
    await mappingEdge.click({ button: 'right' });

    // EdgeContextMenu renders kind buttons: direct, template, constant, etc.
    await expect(page.getByText('direct')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Delete mapping')).toBeVisible({
      timeout: 3000,
    });
  });

  test('Edge context menu — changing kind updates the mapping', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);
    await clickTab(page, 'Mapping tab');

    // Select the first mapping so we can verify its kind afterward
    const firstMappingItem = page
      .locator('[role="button"][tabindex="0"]')
      .first();
    await firstMappingItem.click();

    // Right-click the first mapping edge on the canvas
    const mappingEdge = page
      .locator('.react-flow__edge[data-id^="mapping_"]')
      .first();
    await mappingEdge.click({ button: 'right' });

    // Click "constant" in the kind picker
    await page.getByText('constant').click();
    await page.waitForTimeout(300);

    // The MAP tab kind picker should now show "constant"
    await expect(page.locator('select[aria-label="Mapping kind"]')).toHaveValue(
      'constant',
    );
  });

  test('Edge context menu — Delete mapping removes the edge', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const edgesBefore = await page
      .locator('.react-flow__edge[data-id^="mapping_"]')
      .count();

    const mappingEdge = page
      .locator('.react-flow__edge[data-id^="mapping_"]')
      .first();
    await mappingEdge.click({ button: 'right' });

    await page.getByText('Delete mapping').click();
    await page.waitForTimeout(300);

    const edgesAfter = await page
      .locator('.react-flow__edge[data-id^="mapping_"]')
      .count();
    expect(edgesAfter).toBeLessThan(edgesBefore);
  });

  test('Edge context menu closes when clicking outside', async ({
    freshPage: page,
  }) => {
    await loadExampleProject(page);

    const mappingEdge = page
      .locator('.react-flow__edge[data-id^="mapping_"]')
      .first();
    await mappingEdge.click({ button: 'right' });
    await expect(page.getByText('Delete mapping')).toBeVisible({
      timeout: 3000,
    });

    // Click somewhere else on the canvas to dismiss
    await page
      .locator('.react-flow__pane')
      .click({ position: { x: 50, y: 50 } });
    await expect(page.getByText('Delete mapping')).not.toBeVisible({
      timeout: 2000,
    });
  });
});
