import { test, expect } from '@playwright/test';
test('shows split sales without disguising prepayments or missing allocations', async ({page}) => {
  await page.goto('/tests/fixtures/payment-stats.html');
  const today=page.getByRole('heading',{name:'Aujourd’hui'}).locator('..');
  await expect(today.getByText('3 ventes',{exact:true})).toBeVisible();
  await expect(today.getByText('Acomptes / prépaiements',{exact:true})).toBeVisible();
  await expect(today.getByText('Répartition non renseignée',{exact:true})).toBeVisible();
  await expect(today.getByText(/Certains détails de paiement sont absents/)).toBeVisible();
  await expect(today.getByText(/120,00/)).toBeVisible();
  await expect(today.getByText(/30,00/)).toBeVisible();
  await expect(today.getByText(/50,00/)).toBeVisible();
  await expect(today.getByText(/40,00/)).toBeVisible();
});
test('keeps the payment explanation and totals readable on the viewport', async ({page}) => {
  await page.goto('/tests/fixtures/payment-stats.html');
  await expect(page.getByText(/ils ne constituent pas un nouvel encaissement/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
