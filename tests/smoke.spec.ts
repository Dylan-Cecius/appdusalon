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


test('signup asks for the salon name', async ({ page }) => {
  await page.goto('/auth');

  await page.getByRole('button', { name: /créez-en un/i }).click();

  await expect(page.getByLabel(/nom du salon/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /créer.*compte|s'inscrire|inscription/i })).toBeVisible();
});


const protectedRoutes = [
  '/dashboard',
  '/pos',
  '/clients',
  '/equipe',
  '/sms',
  '/stocks',
  '/services',
  '/produits',
  '/agenda',
  '/todo',
  '/ca-total',
  '/abonnements',
  '/stats',
  '/rapports',
  '/parametres',
  '/historique',
];

for (const route of protectedRoutes) {
  test(`protected route ${route} redirects anonymous users`, async ({ page }) => {
    await page.goto(route);
    await page.waitForURL(/\/auth$/);
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });
}

test('auth screen has no horizontal overflow', async ({ page }) => {
  await page.goto('/auth');

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );

  expect(overflow).toBe(false);
});

test('auth screen has no uncaught browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  expect(errors).toEqual([]);
});


test('invite link shows password setup form', async ({ page }) => {
  await page.goto('/auth?type=invite');
  await expect(page.getByText(/définissez votre nouveau mot de passe/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /enregistrer le mot de passe/i })).toBeVisible();
});

test('recovery link shows password setup form', async ({ page }) => {
  await page.goto('/auth?type=recovery');
  await expect(page.getByText(/définissez votre nouveau mot de passe/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /enregistrer le mot de passe/i })).toBeVisible();
});
