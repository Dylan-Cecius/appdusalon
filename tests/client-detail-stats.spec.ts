import { test, expect } from '@playwright/test';
declare global { interface Window { clientStatsFixture: { count: () => number; finish: (index: number, visits: number) => void; fail: (index: number) => void } } }
test.beforeEach(async ({ page }) => { await page.goto('/tests/fixtures/client-detail-stats.html'); await expect.poll(() => page.evaluate(() => window.clientStatsFixture.count())).toBe(1); });
test('does not read again after a result or an unrelated edit', async ({ page }) => {
  await page.getByLabel('Saisie indépendante').fill('Saisie conservée');
  await page.evaluate(() => window.clientStatsFixture.finish(0, 3));
  await expect(page.getByLabel('Visites')).toHaveText('3');
  await expect(page.getByLabel('Saisie indépendante')).toHaveValue('Saisie conservée');
  await page.getByLabel('Saisie indépendante').fill('Encore une saisie');
  expect(await page.evaluate(() => window.clientStatsFixture.count())).toBe(1);
});
test('ignores an old client response and a response after closure', async ({ page }) => {
  await page.getByRole('button', { name: 'Client B' }).click();
  await expect.poll(() => page.evaluate(() => window.clientStatsFixture.count())).toBe(2);
  await page.evaluate(() => { window.clientStatsFixture.finish(1, 8); window.clientStatsFixture.finish(0, 2); });
  await expect(page.getByLabel('Visites')).toHaveText('8');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect.poll(() => page.evaluate(() => window.clientStatsFixture.count())).toBe(3);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.evaluate(() => window.clientStatsFixture.finish(2, 9));
  await expect(page.getByLabel('Visites')).toHaveText('—');
  await expect(page.getByRole('status')).toHaveCount(0);
});
test('shows an error and retries explicitly without inventing zero visits', async ({ page }) => {
  await page.evaluate(() => window.clientStatsFixture.fail(0));
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Visites')).toHaveText('—');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect.poll(() => page.evaluate(() => window.clientStatsFixture.count())).toBe(2);
  await page.evaluate(() => window.clientStatsFixture.finish(1, 0));
  await expect(page.getByLabel('Visites')).toHaveText('0');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
