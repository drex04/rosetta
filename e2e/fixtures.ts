import { test as base, type Page } from '@playwright/test';

/**
 * freshPage fixture — navigates to '/', wipes IndexedDB and localStorage,
 * then reloads so the app starts from a clean slate.
 */
export const test = base.extend<{ freshPage: Page }>({
  freshPage: async ({ page }, use) => {
    await page.goto('/');

    // Clear persisted state
    await page.evaluate(() => {
      // idb-keyval uses the default 'keyval' store in 'keyval-store' database.
      // The key used by the app is 'rosetta-project'.
      const deleteRequest = indexedDB.deleteDatabase('keyval-store');
      deleteRequest.onerror = () => {
        /* ignore */
      };

      // Zustand persist key for uiStore
      localStorage.removeItem('rosetta-ui');

      // Suppress the about/onboarding dialog so it doesn't block test interactions
      localStorage.setItem('rosetta-onboarding-v1', 'seen');
    });

    await page.reload({ waitUntil: 'networkidle' });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';
