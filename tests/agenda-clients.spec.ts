import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T10:00:00'));
  await page.goto('/tests/fixtures/standalone.html?view=agenda');
});

test('selects an existing client and finds the new appointment in their persisted history', async ({ page }) => {
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Retrouver un client').fill('elodie');
  await dialog.getByRole('button', { name: /Choisir Élodie Noël/ }).click();
  await expect(dialog.getByLabel('Nom du client fictif')).toHaveValue('Élodie Noël');
  await expect(dialog.getByLabel('Téléphone fictif')).toHaveValue('0000 00 00 00');
  await dialog.getByRole('button', { name: 'Créer le rendez-vous' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Clients de l’agenda', exact: true }).click();
  await dialog.getByLabel('Nom ou téléphone du client').fill('elodie');
  await expect(dialog.getByRole('status')).toHaveText('1 contact');
  await dialog.getByRole('button', { name: /Historique de Élodie Noël/ }).click();
  await expect(dialog.getByRole('region', { name: 'Historique du client' }).getByRole('article')).toHaveCount(2);
  await expect(dialog.getByText('Prochain rendez-vous : 13/10/2026 · 17:00')).toBeVisible();
});

test('opens client history from an appointment and reuses services without stale notes or time', async ({ page }) => {
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Client, téléphone ou prestation').fill('Emma Dubois');
  await dialog.getByRole('button', { name: /Emma Dubois/ }).click();
  await dialog.getByLabel('Notes', { exact: true }).fill('Modification non enregistrée');
  await expect(dialog.getByRole('button', { name: 'Historique du client', exact: true })).toBeDisabled();
  await dialog.getByLabel('Notes', { exact: true }).fill('Rendez-vous fictif pour tester l’agenda.');
  await dialog.getByRole('button', { name: 'Historique du client', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Emma Dubois', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Reprendre ces prestations', exact: true }).click();
  await expect(dialog.getByLabel('Nom du client fictif')).toHaveValue('Emma Dubois');
  await expect(dialog.getByLabel('Collaborateur', { exact: true })).toHaveValue('demo-staff-2');
  await expect(dialog.getByLabel('Notes internes')).toHaveValue('');
  await expect(dialog.getByLabel('Heure', { exact: true })).toHaveValue('17:00');
  await expect(dialog.getByRole('region', { name: 'Résumé du rendez-vous' })).toContainText('17:00 → 18:30');
  await expect(dialog.getByRole('region', { name: 'Résumé du rendez-vous' })).toContainText('75.00 €');
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  await expect(dialog.getByLabel('Nom du client fictif')).toHaveValue('');
  await expect(dialog.getByRole('region', { name: 'Résumé du rendez-vous' })).toContainText('25.00 €');
});

test('reprices historical services from the current catalogue and identifies removed services', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Clients de l’agenda', exact: true })).toBeVisible();
  await page.evaluate(() => {
    const key = 'appdusalon-agenda-preview-v2-2026-10-13';
    const state = JSON.parse(localStorage.getItem(key)!);
    state.appointments[0].services = [{ id: 'demo-coupe', name: 'Ancienne coupe', price: 999, duration: 300, category: 'coupe' }, { id: 'removed', name: 'Soin retiré', price: 10, duration: 20, category: 'coupe' }];
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Clients de l’agenda', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom ou téléphone du client').fill('elodie');
  await dialog.getByRole('button', { name: /Historique de Élodie Noël/ }).click();
  await dialog.getByRole('button', { name: 'Reprendre ces prestations', exact: true }).click();
  await expect(dialog.getByText('Prestations indisponibles à remplacer : Soin retiré.')).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Résumé du rendez-vous' })).toContainText('25.00 €');
  await expect(dialog.getByRole('region', { name: 'Résumé du rendez-vous' })).toContainText('17:00 → 17:30');
  await expect(dialog.getByRole('region', { name: 'Prestations sélectionnées' })).toContainText('Coupe homme');
  await dialog.getByRole('button', { name: 'Créer le rendez-vous' }).click();
  await expect(dialog).toBeHidden();
});
