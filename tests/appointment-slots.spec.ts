import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T10:00:00'));
  await page.goto('/tests/fixtures/standalone.html?view=agenda');
});

test('finds a composed booking across the team, preserves the form and shows the saved day and employee', async ({ page }) => {
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom du client fictif').fill('Client créneau équipe');
  await dialog.getByLabel('Téléphone fictif').fill('0000 11 22 33');
  await dialog.getByLabel('Notes internes').fill('Deux prestations à la suite');
  await dialog.getByLabel('Ajouter une prestation', { exact: true }).selectOption('demo-couleur');
  await dialog.getByRole('button', { name: 'Ajouter la prestation', exact: true }).click();
  await dialog.getByRole('button', { name: 'Trouver un créneau' }).click();
  const finder = dialog.getByRole('region', { name: 'Recherche de créneaux' });
  await finder.getByLabel('Rechercher à partir du').fill('2026-10-14');
  await finder.getByLabel('Toute l’équipe').check();
  await finder.getByRole('button', { name: 'Choisir le 14/10/2026 à 09:45 avec Marie, fin 11:45', exact: true }).click();
  await expect(dialog.getByLabel('Date', { exact: true })).toHaveValue('2026-10-14');
  await expect(dialog.getByLabel('Collaborateur', { exact: true })).toHaveValue('demo-staff-1');
  await expect(dialog.getByRole('region', { name: 'Résumé du rendez-vous' })).toContainText('09:45 → 11:45');
  await expect(dialog.getByLabel('Notes internes')).toHaveValue('Deux prestations à la suite');
  await dialog.getByRole('button', { name: 'Créer le rendez-vous' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /Client créneau équipe/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  await dialog.getByLabel('Client, téléphone ou prestation').fill('Client créneau équipe');
  await expect(dialog.getByRole('status')).toHaveText('1 résultat');
  await dialog.getByRole('button', { name: /Client créneau équipe/ }).click();
  await expect(dialog.getByLabel('Heure de fin')).toHaveValue('11:45');
  await expect(dialog.getByLabel('Notes', { exact: true })).toHaveValue('Deux prestations à la suite');
});

test('fills a free processing phase and recalculates when another service changes the duration', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T08:00:00'));
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom du client fictif').fill('Coupe pendant la pose');
  await dialog.getByLabel('Collaborateur', { exact: true }).selectOption('demo-staff-2');
  await dialog.getByRole('button', { name: 'Trouver un créneau' }).click();
  const finder = dialog.getByRole('region', { name: 'Recherche de créneaux' });
  const processing = finder.getByRole('button', { name: 'Choisir le 13/10/2026 à 09:30 avec Thomas, fin 10:00', exact: true });
  await expect(processing).toBeVisible();
  await dialog.getByLabel('Ajouter une prestation', { exact: true }).selectOption('demo-barbe');
  await dialog.getByRole('button', { name: 'Ajouter la prestation', exact: true }).click();
  await expect(processing).toHaveCount(0);
  await expect(finder.getByRole('button', { name: /^Choisir le/ }).first()).toHaveAttribute('aria-label', 'Choisir le 13/10/2026 à 10:30 avec Thomas, fin 11:45');
  await dialog.getByRole('button', { name: 'Retirer Coupe + barbe' }).click();
  await processing.click();
  await dialog.getByRole('button', { name: 'Créer le rendez-vous' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /Coupe pendant la pose/ })).toBeVisible();
});

test('handles a fully unavailable week, advances dates and checks future absences in a series', async ({ page }) => {
  await page.getByRole('button', { name: 'Indisponibilités', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Bloquer un créneau', exact: true }).click();
  const off = dialog.getByRole('form', { name: 'Indisponibilité' });
  await off.getByLabel('Libellé').fill('Congé semaine suivante');
  await off.getByLabel('Du', { exact: true }).fill('2026-10-20');
  await off.getByLabel('Au inclus').fill('2026-10-26');
  await off.getByLabel('Journée entière').check();
  await off.getByRole('button', { name: 'Enregistrer l’indisponibilité' }).click();
  await expect(dialog.getByRole('article', { name: 'Indisponibilité Congé semaine suivante' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  await dialog.getByLabel('Nom du client fictif').fill('Série créneaux libres');
  await dialog.getByLabel('Répéter ce rendez-vous').check();
  await dialog.getByLabel('Nombre de rendez-vous').fill('2');
  await dialog.getByRole('button', { name: 'Trouver un créneau' }).click();
  const finder = dialog.getByRole('region', { name: 'Recherche de créneaux' });
  await expect(finder.getByRole('status')).toContainText('Aucun créneau compatible');
  await expect(finder.getByRole('button', { name: /^Choisir le/ })).toHaveCount(0);
  await finder.getByRole('button', { name: '7 jours suivants' }).click();
  await expect(finder.getByLabel('Rechercher à partir du')).toHaveValue('2026-10-20');
  await expect(finder.getByRole('status')).toContainText('Aucun créneau compatible');
  await finder.getByRole('button', { name: '7 jours suivants' }).click();
  await finder.getByRole('button', { name: /^Choisir le/ }).first().click();
  await dialog.getByRole('button', { name: 'Créer la série' }).click();
  await expect(dialog).toBeHidden();
  const dates = await page.evaluate(() => JSON.parse(localStorage.getItem('appdusalon-agenda-preview-v2-2026-10-13')!).appointments.filter((item: { clientName: string }) => item.clientName === 'Série créneaux libres').map((item: { startTime: string }) => item.startTime.slice(0, 10)).sort());
  expect(dates).toEqual(['2026-10-27', '2026-11-03']);
});
