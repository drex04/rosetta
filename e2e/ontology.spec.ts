import { test, expect } from './fixtures'
import { loadExampleProject, clickTab } from './helpers'

test.describe('Ontology (ONTO tab)', () => {
  test('14 - Valid Turtle edit updates canvas', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    const nodeCountBefore = await page.locator('.react-flow__node').count()

    await clickTab(page, 'Ontology tab')
    // Append a new OWL class to the editor
    const editor = page.locator('[aria-label="Turtle ontology editor"]')
    await editor.click()
    await page.keyboard.press('End')
    // Move to end of document
    await page.keyboard.press('Control+End')
    await page.keyboard.type('\n<http://test.org/NewClass> a owl:Class .')

    // Wait for debounce + canvas update
    await page.waitForTimeout(1000)

    const nodeCountAfter = await page.locator('.react-flow__node').count()
    expect(nodeCountAfter).toBeGreaterThan(nodeCountBefore)
  })

  test('15 - Invalid Turtle shows error banner', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    await clickTab(page, 'Ontology tab')
    const editor = page.locator('[aria-label="Turtle ontology editor"]')
    await editor.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('this is not turtle')
    await page.waitForTimeout(700)
    // A destructive (red) alert should appear
    const alert = page.locator('[role="alert"]').first()
    await expect(alert).toBeVisible()
  })

  test('16 - Fix error clears banner', async ({ freshPage: page }) => {
    await loadExampleProject(page)
    await clickTab(page, 'Ontology tab')
    const editor = page.locator('[aria-label="Turtle ontology editor"]')

    // Introduce error
    await editor.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('this is not turtle')
    await page.waitForTimeout(700)
    await expect(page.locator('[role="alert"]').first()).toBeVisible()

    // Fix by typing valid minimal Turtle
    await editor.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('@prefix owl: <http://www.w3.org/2002/07/owl#> .')
    await page.waitForTimeout(700)
    await expect(page.locator('[role="alert"]')).toHaveCount(0)
  })
})
