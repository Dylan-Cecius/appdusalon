import { expect, test } from '@playwright/test';

test('demo-only preview blocks public booking routes', async ({ page }) => {
  await page.goto('/booking/salon-test');

  await page.waitForURL(/\/auth$/);
  await expect(page.getByRole('button', { name: /essayer la démo gratuite/i })).toBeVisible();
});

test('demo-only preview refuses credential sign-in before any network auth', async ({ page }) => {
  await page.goto('/auth');

  await page.getByLabel(/email/i).fill('client@example.com');
  await page.getByLabel(/mot de passe/i).fill('not-a-real-password');
  await page.getByRole('button', { name: /^se connecter$/i }).click();

  await expect(page.getByText(/preview sécurisée/i)).toBeVisible();
  await expect(page.getByText(/utilisez le bouton de démonstration/i)).toBeVisible();
});

test('demo-only preview keeps the demo entry point visible without horizontal overflow', async ({ page }) => {
  await page.goto('/auth');

  await expect(page.getByRole('button', { name: /essayer la démo gratuite/i })).toBeVisible();

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );

  expect(overflow).toBe(false);
});
