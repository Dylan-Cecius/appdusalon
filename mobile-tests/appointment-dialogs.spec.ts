import { expect, test } from '@playwright/test';

test('failed creation retains the form and focuses the error', async ({ page }) => {
  await page.goto('/?mobile-appointment=1&failure=1');
  await page.getByRole('button', { name: 'Créer un rendez-vous fictif', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom du client fictif', { exact: true }).fill('Saisie synthétique');
  await dialog.getByLabel('Notes internes').fill('Brouillon conservé');
  await dialog.getByRole('button', { name: 'Créer le rendez-vous', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Enregistrement…', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('alert')).toContainText('Échec simulé');
  await expect(dialog.getByRole('alert')).toBeFocused();
  await expect(dialog.getByLabel('Notes internes')).toHaveValue('Brouillon conservé');
  await expect(page.getByTestId('save-attempts')).toHaveText('Tentatives simulées : 1');
});

test('a remote refresh retains the edited contact and original revision', async ({ page }) => {
  await page.goto('/?mobile-appointment=1');
  await page.getByRole('button', { name: 'Ouvrir la fiche fictive' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Notes', { exact: true }).fill('Brouillon synthétique');
  await page.evaluate(() => window.dispatchEvent(new Event('demo:appointment-refresh')));
  await expect(dialog.getByRole('status')).toContainText('a changé pendant votre saisie');
  await expect(dialog.getByLabel('Notes', { exact: true })).toHaveValue('Brouillon synthétique');
  await dialog.getByRole('button', { name: 'Sauvegarder', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Révision modifiée');
  await expect(dialog.getByRole('alert')).toBeFocused();
  await expect(dialog.getByLabel('Notes', { exact: true })).toHaveValue('Brouillon synthétique');
});

test('an untouched contact adopts remote data and can be saved', async ({ page }) => {
  await page.goto('/?mobile-appointment=1');
  await page.getByRole('button', { name: 'Ouvrir la fiche fictive' }).click();
  const dialog = page.getByRole('dialog');
  await page.evaluate(() => window.dispatchEvent(new Event('demo:appointment-refresh')));
  await expect(dialog.getByLabel('Notes', { exact: true })).toHaveValue('Note distante fictive');
  await dialog.getByLabel('Notes', { exact: true }).fill('Nouvelle note fictive');
  await dialog.getByRole('button', { name: 'Sauvegarder', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Enregistrement fictif confirmé.');
});
