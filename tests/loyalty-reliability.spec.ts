import { test, expect } from '@playwright/test';
declare global { interface Window { loyaltyFixture: { readCount: () => number; saveCount: () => number; revision: (i: number) => string | null; finishRead: (i: number, value: number) => void; failRead: (i: number) => void; finishSave: (i: number) => void; failSave: (i: number) => void } } }
test('loyalty reads discard old salon and closed-context results', async ({ page }) => {
  await page.goto('/tests/fixtures/loyalty-reliability.html');
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.readCount())).toBe(1);
  await page.getByRole('button', { name: 'Salon B' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.readCount())).toBe(2);
  await page.evaluate(() => { window.loyaltyFixture.finishRead(1, 4); window.loyaltyFixture.finishRead(0, 2); });
  await expect(page.getByLabel('Points par euro lus')).toHaveText('4');
  await page.getByRole('button', { name: 'Actualiser' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.readCount())).toBe(3);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.evaluate(() => window.loyaltyFixture.finishRead(2, 8));
  await expect(page.getByLabel('Points par euro lus')).toHaveText('—');
});
test('loyalty errors stay visible until a successful retry', async ({ page }) => {
  await page.goto('/tests/fixtures/loyalty-reliability.html');
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.readCount())).toBe(1);
  await page.evaluate(() => window.loyaltyFixture.failRead(0));
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Points par euro lus')).toHaveText('—');
  await page.getByRole('button', { name: 'Actualiser' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.readCount())).toBe(2);
  await page.evaluate(() => window.loyaltyFixture.finishRead(1, 0));
  await expect(page.getByLabel('Points par euro lus')).toHaveText('0');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('latest same-context refresh wins even when responses finish out of order', async ({ page }) => {
  await page.goto('/tests/fixtures/loyalty-reliability.html');
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.readCount())).toBe(1);
  await page.getByRole('button', { name: 'Actualiser' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.readCount())).toBe(2);
  await page.evaluate(() => { window.loyaltyFixture.finishRead(1, 5); window.loyaltyFixture.finishRead(0, 1); });
  await expect(page.getByLabel('Points par euro lus')).toHaveText('5');
});
test('settings lock during save and keep the draft after failure', async ({ page }) => {
  await page.goto('/tests/fixtures/loyalty-reliability.html?mode=form');
  await page.getByLabel('Points par euro', { exact: true }).fill('2.125');
  await page.getByRole('button', { name: 'Enregistrer la fidélité' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.saveCount())).toBe(1);
  await expect(page.getByLabel('Points par euro', { exact: true })).toBeDisabled();
  await expect(page.getByRole('switch')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Sauvegarde…' })).toBeDisabled();
  await page.evaluate(() => window.loyaltyFixture.failSave(0));
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Points par euro', { exact: true })).toHaveValue('2.125');
  await page.getByRole('button', { name: 'Enregistrer la fidélité' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.saveCount())).toBe(2);
  await page.evaluate(() => window.loyaltyFixture.finishSave(1));
  await expect(page.getByRole('status')).toHaveText('Programme fidélité enregistré.');
  await page.getByLabel('Points par euro', { exact: true }).fill('3');
  await expect(page.getByRole('status')).toHaveCount(0);
});
test('refresh does not overwrite a draft or its captured revision', async ({ page }) => {
  await page.goto('/tests/fixtures/loyalty-reliability.html?mode=form');
  await page.getByLabel('Points par euro', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Actualiser les réglages' }).click();
  await expect(page.getByLabel('Points par euro', { exact: true })).toHaveValue('3');
  await page.getByRole('button', { name: 'Enregistrer la fidélité' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.saveCount())).toBe(1);
  expect(await page.evaluate(() => window.loyaltyFixture.revision(0))).toBe('2026-10-15T10:00:00.000Z');
  await page.evaluate(() => window.loyaltyFixture.failSave(0));
  await page.getByRole('button', { name: 'Reprendre les réglages chargés' }).click();
  await expect(page.getByLabel('Points par euro', { exact: true })).toHaveValue('4');
  await page.getByRole('button', { name: 'Enregistrer la fidélité' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.saveCount())).toBe(2);
  expect(await page.evaluate(() => window.loyaltyFixture.revision(1))).toBe('2026-10-15T11:00:00.000Z');
});
test('invalid numeric input never reaches persistence and denied access locks controls', async ({ page }) => {
  await page.goto('/tests/fixtures/loyalty-reliability.html?mode=form');
  await page.getByLabel('Seuil récompense').fill('1.5');
  await page.getByRole('button', { name: 'Enregistrer la fidélité' }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  expect(await page.evaluate(() => window.loyaltyFixture.saveCount())).toBe(0);
  await page.getByRole('button', { name: 'Basculer accès' }).click();
  await expect(page.getByRole('button', { name: 'Enregistrer la fidélité' })).toBeDisabled();
  await expect(page.getByRole('switch')).toBeDisabled();
});
test('changing context resets the settings draft and ignores its pending completion', async ({ page }) => {
  await page.goto('/tests/fixtures/loyalty-reliability.html?mode=form');
  await page.getByLabel('Points par euro', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Enregistrer la fidélité' }).click();
  await expect.poll(() => page.evaluate(() => window.loyaltyFixture.saveCount())).toBe(1);
  await page.getByRole('button', { name: 'Salon B' }).click();
  await page.evaluate(() => window.loyaltyFixture.finishSave(0));
  await expect(page.getByLabel('Points par euro', { exact: true })).toHaveValue('1');
  await expect(page.getByText('Programme fidélité enregistré.', { exact: true })).toHaveCount(0);
});
