import { expect, test } from '@playwright/test';
import type { ClientCreateInput } from '../src/lib/clientCreateDraft';

declare global {
  interface Window { newClientFixture: { calls: number; input: ClientCreateInput | null; succeed: () => void; empty: () => void; fail: () => void }; }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/new-client.html');
  await page.getByLabel('Nom complet *', { exact: true }).fill('  Client test  ');
  await page.getByLabel('Téléphone *', { exact: true }).fill('0400 00 00 00');
  await page.getByLabel('Notes', { exact: true }).fill('Notes à conserver');
});

for (const outcome of ['empty', 'fail'] as const) {
  test(`${outcome}: failed creation retains the draft and permits a confirmed retry`, async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Annuler', exact: true })).toBeDisabled();
    await expect(dialog.getByLabel('Nom complet *', { exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => window.newClientFixture.calls)).toBe(1);
    await page.evaluate(outcome => window.newClientFixture[outcome](), outcome);
    await expect(dialog.getByRole('alert')).toBeFocused();
    await expect(dialog.getByLabel('Nom complet *', { exact: true })).toHaveValue('  Client test  ');
    await expect(dialog.getByLabel('Notes', { exact: true })).toHaveValue('Notes à conserver');
    await dialog.getByLabel('Téléphone *', { exact: true }).press('Enter');
    await expect(dialog.getByRole('status')).toHaveText('Création en cours…');
    await page.evaluate(() => window.newClientFixture.succeed());
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => window.newClientFixture.calls)).toBe(2);
    await page.getByRole('button', { name: 'Ouvrir la fiche' }).click();
    await expect(dialog.getByLabel('Nom complet *', { exact: true })).toHaveValue('');
  });
}

test('an optional empty birth date is omitted from the creation request', async ({ page }) => {
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const input = await page.evaluate(() => window.newClientFixture.input);
  expect(input?.name).toBe('Client test');
  expect(input?.birth_date).toBeUndefined();
  expect(input?.email).toBeUndefined();
  await page.evaluate(() => window.newClientFixture.succeed());
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
