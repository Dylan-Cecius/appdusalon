import { expect, test } from '@playwright/test';

declare global {
  interface Window { appointmentActionsFixture: { calls: number; resolve: () => void; reject: () => void }; }
}

test.beforeEach(async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/tests/fixtures/appointment-actions.html');
});

for (const action of ['Sauvegarder', 'Annuler le RDV', 'No-show', 'Espèces · 30.00 €', 'Carte · 30.00 €']) {
  test(`${action}: wait, retain on rejection, then retry`, async ({ page }) => {
    const dialog = page.getByRole('dialog');
    if (action === 'Sauvegarder') await dialog.getByLabel('Notes').fill('Brouillon conservé');
    await dialog.getByRole('button', { name: action, exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText('Traitement en cours…');
    await expect(dialog.getByRole('button', { name: 'Fermer', exact: true })).toBeDisabled();
    await expect(dialog.getByLabel('Nom du client')).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => window.appointmentActionsFixture.calls)).toBe(1);
    await page.evaluate(() => window.appointmentActionsFixture.reject());
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel('Notes')).toHaveValue(action === 'Sauvegarder' ? 'Brouillon conservé' : 'Note initiale');
    await dialog.getByRole('button', { name: action, exact: true }).click();
    await page.evaluate(() => window.appointmentActionsFixture.resolve());
    await expect(dialog).not.toBeVisible();
    await expect(page.getByLabel('État de la fiche')).toHaveText('Fermée');
    expect(await page.evaluate(() => window.appointmentActionsFixture.calls)).toBe(2);
  });
}

test('unsaved notes cannot be lost through cancellation or settlement', async ({ page }) => {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Notes').fill('Nouvelles notes');
  for (const name of ['Annuler le RDV', 'No-show', 'Espèces · 30.00 €', 'Carte · 30.00 €']) {
    await expect(dialog.getByRole('button', { name, exact: true })).toBeDisabled();
  }
  await expect(dialog.getByRole('button', { name: 'Sauvegarder', exact: true })).toBeEnabled();
});

for (const status of ['cancelled', 'no_show', 'completed']) {
  test(`${status}: prepaid history stays read-only without payment actions`, async ({ page }) => {
    await page.goto(`/tests/fixtures/appointment-actions.html?status=${status}&payment=paid&settled=true`);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Nom du client')).toHaveAttribute('readonly', '');
    await expect(dialog.getByRole('button', { name: /Clôturer|Espèces|Carte|Sauvegarder|Annuler le RDV|No-show/ })).toHaveCount(0);
    await expect(dialog.getByText('Montant déjà réglé')).toBeVisible();
    if (status !== 'completed') await expect(dialog.getByText('Reste à payer')).toHaveCount(0);
  });
}

test('a scheduled prepaid appointment offers completion, not a second collection', async ({ page }) => {
  await page.goto('/tests/fixtures/appointment-actions.html?payment=paid');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Clôturer la prestation' })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: /Espèces|Carte/ })).toHaveCount(0);
});
