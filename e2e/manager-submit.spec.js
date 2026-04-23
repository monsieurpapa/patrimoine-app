import { test, expect } from '@playwright/test';

// E2E: Manager 3-tap submit flow
// Requires: a seeded manager account in Firebase (email/password)
// Set env vars: TEST_MANAGER_EMAIL, TEST_MANAGER_PASSWORD, TEST_ASSET_ID

test.describe('Manager submit flow', () => {
  test.skip(!process.env.TEST_MANAGER_EMAIL, 'Requires TEST_MANAGER_EMAIL env var');

  test('manager logs in and submits transaction in 3 taps', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.fill('[placeholder*="email"], [type="email"]', process.env.TEST_MANAGER_EMAIL);
    await page.fill('[placeholder*="mot de passe"], [type="password"]', process.env.TEST_MANAGER_PASSWORD);
    await page.click('button[type="submit"], button:has-text("Connexion")');

    // Should see ManagerApp, not full dashboard
    await expect(page.locator('[data-testid="manager-app"], .manager-entry')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav, .sidebar')).not.toBeVisible();

    // Fill revenue
    await page.fill('[data-testid="revenue-input"], [name="revenue"]', '5000');

    // Fill expenses
    await page.fill('[data-testid="expenses-input"], [name="expenses"]', '1200');

    // Submit
    await page.click('[data-testid="submit-btn"], button:has-text("Envoyer"), button:has-text("Soumettre")');

    // Success feedback
    await expect(page.locator('text=Envoyé, text=Succès, text=Transaction enregistrée').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Manager submit — offline queue', () => {
  test.skip(!process.env.TEST_MANAGER_EMAIL, 'Requires TEST_MANAGER_EMAIL env var');

  test('submit while offline queues and replays on reconnect', async ({ page, context }) => {
    await page.goto('/');

    // Login first (online)
    await page.fill('[type="email"]', process.env.TEST_MANAGER_EMAIL);
    await page.fill('[type="password"]', process.env.TEST_MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="manager-app"]')).toBeVisible({ timeout: 10000 });

    // Go offline
    await context.setOffline(true);

    await page.fill('[data-testid="revenue-input"]', '3000');
    await page.fill('[data-testid="expenses-input"]', '800');
    await page.click('[data-testid="submit-btn"]');

    // Should see queued indicator, not error
    await expect(page.locator('text=En attente, text=Hors ligne, text=Mise en file')).toBeVisible({ timeout: 3000 });

    // Go back online
    await context.setOffline(false);

    // Queue should replay
    await expect(page.locator('text=Envoyé, text=Synchronisé').first()).toBeVisible({ timeout: 10000 });
  });
});
