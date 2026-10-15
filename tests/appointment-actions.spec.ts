import { expect, test } from '@playwright/test';

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
    expect(await page.evaluate(() => (window as any).appointmentActionsFixture.calls)).toBe(1);
    await page.evaluate(() => (window as any).appointmentActionsFixture.reject());
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel('Notes')).toHaveValue(action === 'Sauvegarder' ? 'Brouillon conservé' : 'Note initiale');
    await dialog.getByRole('button', { name: action, exact: true }).click();
    await page.evaluate(() => (window as any).appointmentActionsFixture.resolve());
    await expect(dialog).not.toBeVisible();
    await expect(page.getByLabel('État de la fiche')).toHaveText('Fermée');
    expect(await page.evaluate(() => (window as any).appointmentActionsFixture.calls)).toBe(2);
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
