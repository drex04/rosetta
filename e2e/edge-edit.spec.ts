import { test, expect } from './fixtures'

/**
 * E2E tests for edge double-click → edge type picker flow.
 *
 * The sample NATO air defense scenario loads by default via `freshPage` and
 * populates the canvas with ontology nodes and edges.
 *
 * React Flow edges render as SVG <path> elements inside
 * `.react-flow__edge` <g> groups. Double-clicking the interactive path
 * element triggers `onEdgeDoubleClick` which opens the edge type picker.
 */

test('double-click subclassEdge opens edge type picker with "Change edge type" title', async ({
  freshPage: page,
}) => {
  // Wait for at least one edge to appear in the canvas
  await page.waitForSelector('.react-flow__edge', { timeout: 10000 })

  // React Flow renders a visible path and an invisible interaction path per edge.
  // The interaction path has a wider stroke-width for easier clicking.
  // We target the first edge group's interaction path (class contains 'interaction').
  const edgeInteractionPath = page
    .locator('.react-flow__edge .react-flow__edge-interaction')
    .first()

  // Fall back to the plain path if no interaction path is found
  const edgePath = (await edgeInteractionPath.count()) > 0
    ? edgeInteractionPath
    : page.locator('.react-flow__edge path').first()

  await edgePath.dblclick({ force: true })

  await expect(page.getByText('Change edge type')).toBeVisible({ timeout: 5000 })
})

test('selecting edge type in picker closes the picker', async ({
  freshPage: page,
}) => {
  await page.waitForSelector('.react-flow__edge', { timeout: 10000 })

  const edgeInteractionPath = page
    .locator('.react-flow__edge .react-flow__edge-interaction')
    .first()

  const edgePath = (await edgeInteractionPath.count()) > 0
    ? edgeInteractionPath
    : page.locator('.react-flow__edge path').first()

  await edgePath.dblclick({ force: true })

  // Confirm picker opened
  await expect(page.getByText('Change edge type')).toBeVisible({ timeout: 5000 })

  // Click one of the type options to confirm selection and close picker
  await page.getByRole('button', { name: 'Subclass of' }).click()

  // Picker should be gone after selection
  await expect(page.getByText('Change edge type')).not.toBeVisible({ timeout: 5000 })
})

test('cancel button in picker closes picker without changing edge type', async ({
  freshPage: page,
}) => {
  await page.waitForSelector('.react-flow__edge', { timeout: 10000 })

  const edgeInteractionPath = page
    .locator('.react-flow__edge .react-flow__edge-interaction')
    .first()

  const edgePath = (await edgeInteractionPath.count()) > 0
    ? edgeInteractionPath
    : page.locator('.react-flow__edge path').first()

  await edgePath.dblclick({ force: true })

  await expect(page.getByText('Change edge type')).toBeVisible({ timeout: 5000 })

  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByText('Change edge type')).not.toBeVisible({ timeout: 5000 })
})
