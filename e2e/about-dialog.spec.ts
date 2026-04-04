import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function clearOnboardingFlag(page: Page) {
  await page.evaluate(() => localStorage.removeItem('rosetta-onboarding-v1'));
  await page.reload({ waitUntil: 'networkidle' });
}

test.describe('About dialog', () => {
  test('auto-opens on first visit', async ({ freshPage: page }) => {
    await clearOnboardingFlag(page);
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole('heading', {
        name: "Your Data Doesn't Speak the Same Language",
      }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('does not auto-open on second visit', async ({ freshPage: page }) => {
    await clearOnboardingFlag(page);
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('slide navigation: Next advances slides', async ({
    freshPage: page,
  }) => {
    await clearOnboardingFlag(page);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'A Shared Ontology Changes Everything',
      }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('slide navigation: Back returns to previous slide', async ({
    freshPage: page,
  }) => {
    await clearOnboardingFlag(page);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(
      page.getByRole('heading', {
        name: "Your Data Doesn't Speak the Same Language",
      }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('progress dots jump to slide', async ({ freshPage: page }) => {
    await clearOnboardingFlag(page);
    await page.getByRole('button', { name: 'Go to slide 3' }).click();
    await expect(
      page.getByRole('heading', { name: 'Built on Proven, Open Standards' }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Skip closes dialog', async ({ freshPage: page }) => {
    await clearOnboardingFlag(page);
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('Get Started closes dialog and sets localStorage', async ({
    freshPage: page,
  }) => {
    await clearOnboardingFlag(page);
    const headings = [
      'A Shared Ontology Changes Everything',
      'Built on Proven, Open Standards',
      'New Sources Online in Days, Not Months',
      'See Semantic Fusion in Action',
    ];
    for (const heading of headings) {
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible({
        timeout: 5000,
      });
    }
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    const flag = await page.evaluate(() =>
      localStorage.getItem('rosetta-onboarding-v1'),
    );
    expect(flag).toBe('seen');
  });

  test('About button re-opens dialog', async ({ freshPage: page }) => {
    await clearOnboardingFlag(page);
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'About Rosetta' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });
});
