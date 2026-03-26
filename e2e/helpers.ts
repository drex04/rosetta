import type { Page } from '@playwright/test'

/**
 * Load the built-in example project.
 * Opens the Project menu, clicks "Example Project", confirms the browser dialog,
 * and waits for at least one canvas node to appear.
 */
export async function loadExampleProject(page: Page): Promise<void> {
  // The app uses window.confirm — handle it before clicking
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Project menu' }).click()
  await page.getByRole('menuitem', { name: 'Example Project' }).click()
  // Wait for canvas to populate and sources to be set
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 10000 })
  await page.getByRole('button', { name: /Select source/ }).first().waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Fill a CodeMirror 6 editor identified by its aria-label.
 * Standard fill() does not work with CM6; instead we click the container,
 * select-all, then type the replacement text.
 */
export async function fillCodeMirror(
  page: Page,
  ariaLabel: string,
  content: string,
): Promise<void> {
  const container = page.locator(`[aria-label="${ariaLabel}"]`)
  await container.click()
  // Select all existing text
  await page.keyboard.press('Control+a')
  // Type replacement — Playwright types into the focused CM6 contenteditable
  await page.keyboard.type(content)
}

/**
 * Click the "Add new source" button.
 */
export async function addSource(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add new source' }).click()
  // Wait for the pill to appear
  await page.getByRole('button', { name: /Select source/ }).first().waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * Click a right-panel tab by its aria-label.
 * e.g. 'Source tab', 'Ontology tab', 'Mapping tab', 'Output tab'
 */
export async function clickTab(page: Page, tab: string): Promise<void> {
  await page.getByRole('tab', { name: tab }).click()
}
