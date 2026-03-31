import { test, expect } from './fixtures'
import { loadExampleProject } from './helpers'

test.describe('Project management', () => {
  test('1 - Load example project', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    const nodes = page.locator('.react-flow__node')
    expect(await nodes.count()).toBeGreaterThan(1)
    // At least one source pill should appear
    await expect(page.getByRole('button', { name: /Select source/ }).first()).toBeVisible()
  })

  test('2 - New project clears everything', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    // Now create a new project
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Project menu' }).click()
    await page.getByRole('menuitem', { name: 'New Project' }).click()
    // Wait for canvas to clear
    await page.waitForTimeout(500)
    await expect(page.locator('.react-flow__node')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Select source/ })).toHaveCount(0)
  })

  test('3 - Export and re-import project', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    const nodeCount = await page.locator('.react-flow__node').count()
    const sourcePillCount = await page.getByRole('button', { name: /Select source/ }).count()

    // Export project — intercept the download
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Project menu' }).click()
    await page.getByRole('menuitem', { name: 'Export Project' }).click()
    const download = await downloadPromise

    // Save file to temp path
    const exportPath = await download.path()
    if (!exportPath) throw new Error('Download path unavailable')

    // New project
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Project menu' }).click()
    await page.getByRole('menuitem', { name: 'New Project' }).click()
    await page.waitForTimeout(500)

    // Import the previously exported file
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Project menu' }).click()
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('menuitem', { name: 'Import Project' }).click(),
    ])
    await fileChooser.setFiles(exportPath)
    // Wait for nodes to restore
    await page.waitForTimeout(2000)

    const restoredNodeCount = await page.locator('.react-flow__node').count()
    const restoredSourceCount = await page.getByRole('button', { name: /Select source/ }).count()
    expect(restoredNodeCount).toBe(nodeCount)
    expect(restoredSourceCount).toBe(sourcePillCount)
  })
})
