import { test, expect, type Page } from '@playwright/test';

async function openMove(page: Page, name: string) {
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Client, téléphone ou prestation').fill(name);
  await dialog.getByRole('button', { name: new RegExp(name) }).first().click();
  await dialog.getByRole('button', { name: 'Déplacer le rendez-vous', exact: true }).click();
  return dialog;
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T10:00:00'));
  await page.goto('/tests/fixtures/standalone.html?view=agenda');
});

test('moves a saved multi-step booking across days and staff without creating a second record', async ({ page }) => {
  const dialog = await openMove(page, 'Emma Dubois');
  await expect(dialog.getByRole('button', { name: 'Confirmer le déplacement' })).toBeDisabled();
  await dialog.getByLabel('Nouvelle date').fill('2026-10-14');
  await dialog.getByLabel('Nouvelle heure').fill('17:00');
  await dialog.getByLabel('Nouveau collaborateur').selectOption('demo-staff-0');
  await expect(dialog.getByRole('region', { name: 'Nouveau créneau' })).toContainText('14/10/2026 · 17:00 → 18:30');
  await expect(dialog.getByRole('region', { name: 'Déroulé du rendez-vous' })).toContainText('17:30–18:00');
  await dialog.getByRole('button', { name: 'Confirmer le déplacement' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /Emma Dubois/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  await dialog.getByLabel('Client, téléphone ou prestation').fill('Emma Dubois');
  await expect(dialog.getByRole('status')).toHaveText('1 résultat');
  await expect(dialog.getByRole('button', { name: /Emma Dubois/ })).toContainText('17:00');
  await dialog.getByRole('button', { name: /Emma Dubois/ }).click();
  await expect(dialog.getByLabel('Notes', { exact: true })).toHaveValue('Rendez-vous fictif pour tester l’agenda.');
  await expect(dialog.getByRole('region', { name: 'Déroulé du rendez-vous' })).toContainText('17:30–18:00');
});

test('rejects absence, collision and closing overrun, then offers a valid alternative', async ({ page }) => {
  await page.getByRole('button', { name: 'Indisponibilités', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Bloquer un créneau', exact: true }).click();
  const form = dialog.getByRole('form', { name: 'Indisponibilité' });
  await form.getByLabel('Libellé').fill('Formation déplacement');
  await form.getByLabel('Collaborateur', { exact: true }).selectOption('demo-staff-1');
  await form.getByLabel('Du', { exact: true }).fill('2026-10-14');
  await form.getByLabel('Au inclus').fill('2026-10-14');
  await form.getByLabel('Début', { exact: true }).fill('16:00');
  await form.getByLabel('Fin', { exact: true }).fill('19:00');
  await form.getByRole('button', { name: 'Enregistrer l’indisponibilité' }).click();
  await expect(dialog.getByRole('article', { name: 'Indisponibilité Formation déplacement' })).toBeVisible();
  await page.keyboard.press('Escape');
  await openMove(page, 'Emma Dubois');
  await dialog.getByLabel('Nouvelle date').fill('2026-10-14');
  await dialog.getByLabel('Nouveau collaborateur').selectOption('demo-staff-1');
  await dialog.getByLabel('Nouvelle heure').fill('17:00');
  await expect(dialog.getByRole('alert')).toContainText('indisponible');
  await expect(dialog.getByRole('button', { name: 'Confirmer le déplacement' })).toBeDisabled();
  await dialog.getByLabel('Nouvelle date').fill('2026-10-13');
  await dialog.getByLabel('Nouvelle heure').fill('12:00');
  await expect(dialog.getByRole('alert')).toContainText('déjà un rendez-vous');
  await dialog.getByLabel('Nouvelle heure').fill('18:00');
  await expect(dialog.getByRole('alert')).toContainText('horaires d’ouverture');
  await dialog.getByRole('button', { name: 'Voir les créneaux libres' }).click();
  const slots = dialog.getByRole('region', { name: 'Créneaux de déplacement' });
  await slots.getByRole('button').first().click();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Confirmer le déplacement' }).click();
  await expect(dialog).toBeHidden();
});

test('keeps the existing deposit and reserved price after moving', async ({ page }) => {
  const dialog = await openMove(page, 'Élodie Noël');
  await dialog.getByLabel('Nouvelle date').fill('2026-10-14');
  await dialog.getByLabel('Nouvelle heure').fill('17:00');
  await dialog.getByLabel('Nouveau collaborateur').selectOption('demo-staff-1');
  await dialog.getByRole('button', { name: 'Confirmer le déplacement' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  await dialog.getByLabel('Client, téléphone ou prestation').fill('elodie');
  await expect(dialog.getByRole('button', { name: /Élodie Noël/ }).getByText('Acompte payé', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: /Élodie Noël/ }).click();
  await expect(dialog.getByText('25.00 €', { exact: true })).toBeVisible();
  await expect(dialog.getByText('− 10.00 €', { exact: true })).toBeVisible();
  await expect(dialog.getByText('15.00 €', { exact: true })).toBeVisible();
});

test('moves only one occurrence of a recurring series', async ({ page }) => {
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom du client fictif').fill('Série déplacement');
  await dialog.getByLabel('Répéter ce rendez-vous').check();
  await dialog.getByLabel('Nombre de rendez-vous').fill('3');
  await dialog.getByRole('button', { name: 'Créer la série' }).click();
  await expect(dialog).toBeHidden();
  await openMove(page, 'Série déplacement');
  await expect(dialog.getByText(/Seul ce rendez-vous sera déplacé/)).toBeVisible();
  await dialog.getByLabel('Nouvelle date').fill('2026-10-14');
  await dialog.getByRole('button', { name: 'Confirmer le déplacement' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  const dates = await page.evaluate(() => JSON.parse(localStorage.getItem('appdusalon-agenda-preview-v2-2026-10-13')!).appointments.filter((item: { clientName: string }) => item.clientName === 'Série déplacement').map((item: { startTime: string }) => item.startTime.slice(0, 10)).sort());
  expect(dates).toEqual(['2026-10-14', '2026-10-20', '2026-10-27']);
});
