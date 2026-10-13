import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T10:00:00'));
  await page.goto('/tests/fixtures/standalone.html?view=agenda');
  await page.getByRole('button', { name: /Liste d’attente/ }).click();
});

test('adds a request, finds a processing slot and converts it exactly once with persistence', async ({ page }) => {
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Ajouter une demande', exact: true }).click();
  const form = sheet.getByRole('form', { name: 'Ajouter une demande' });
  await form.getByLabel('Nom du client', { exact: true }).fill('Zoé Attente');
  await form.getByLabel('Téléphone', { exact: true }).fill('0000 00 00 42');
  await form.getByLabel('Collaborateur souhaité').selectOption('demo-staff-2');
  await form.getByLabel('À partir du').fill('2026-10-14');
  await form.getByLabel('Jusqu’au', { exact: true }).fill('2026-10-14');
  await form.getByLabel('Disponible dès').fill('09:30');
  await form.getByLabel('Jusqu’à', { exact: true }).fill('10:00');
  await form.getByRole('button', { name: 'Ajouter la demande', exact: true }).click();
  await expect(form).toBeHidden();
  await sheet.getByLabel('Rechercher dans la liste d’attente').fill('zoe');
  const request = sheet.getByRole('article', { name: 'Demande de Zoé Attente' });
  await request.getByRole('button', { name: 'Trouver un créneau' }).click();
  await expect(request.getByRole('radio')).toHaveCount(1);
  await expect(request).toContainText('09:30–10:00');
  await request.getByRole('radio').check();
  await request.getByRole('button', { name: 'Créer le rendez-vous' }).click();
  await expect(sheet).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: /Liste d’attente/ }).click();
  await sheet.getByLabel('Rechercher dans la liste d’attente').fill('zoe');
  await expect(sheet.getByText('Aucune demande ne correspond à la recherche.')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Client, téléphone ou prestation').fill('zoe');
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('1 résultat');
  await expect(page.getByRole('dialog').getByRole('button', { name: /Zoé Attente/ })).toContainText('09:30');
});

test('keeps requests with no available slot and persists explicit removal', async ({ page }) => {
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Ajouter une demande', exact: true }).click();
  const form = sheet.getByRole('form', { name: 'Ajouter une demande' });
  await form.getByLabel('Nom du client', { exact: true }).fill('Aucun Créneau');
  await form.getByLabel('Téléphone', { exact: true }).fill('0000000088');
  await form.getByLabel('Disponible dès').fill('20:00');
  await form.getByLabel('Jusqu’à', { exact: true }).fill('19:00');
  await form.getByRole('button', { name: 'Ajouter la demande', exact: true }).click();
  await expect(form.getByRole('alert')).toHaveText('L’heure de fin doit suivre l’heure de début.');
  await form.getByLabel('Jusqu’à', { exact: true }).fill('21:00');
  await form.getByRole('button', { name: 'Ajouter la demande', exact: true }).click();
  const request = sheet.getByRole('article', { name: 'Demande de Aucun Créneau' });
  await request.getByRole('button', { name: 'Trouver un créneau' }).click();
  await expect(request.getByText(/Aucun créneau adapté/)).toBeVisible();
  await expect(request.getByRole('button', { name: 'Créer le rendez-vous' })).toBeDisabled();
  await request.getByRole('button', { name: 'Retirer la demande de Aucun Créneau' }).click();
  await expect(request).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: /Liste d’attente/ }).click();
  await expect(page.getByRole('article', { name: 'Demande de Aucun Créneau' })).toHaveCount(0);
});
