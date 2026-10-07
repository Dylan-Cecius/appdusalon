import { expect, test } from '@playwright/test';

test('login screen renders', async ({ page }) => {
  await page.goto('/auth');

  await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
});

test('protected dashboard redirects anonymous users to auth', async ({ page }) => {
  await page.goto('/dashboard');

  await page.waitForURL(/\/auth$/);
  await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
});

test('unknown route renders the V2 not-found screen', async ({ page }) => {
  await page.goto('/route-qui-nexiste-pas');

  await expect(page.getByText(/page introuvable/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /retour au tableau de bord/i })).toBeVisible();
});
