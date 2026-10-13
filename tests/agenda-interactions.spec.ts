import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/agenda-ux.html');
});

test('finds and opens a deposit appointment with accent-insensitive search', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Client, téléphone ou prestation')).toBeFocused();
  await dialog.getByLabel('Client, téléphone ou prestation').fill('elodie reparateur');
  await dialog.getByRole('button', { name: 'Acompte payé', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('1 résultat');
  await page.screenshot({ path: testInfo.outputPath('agenda-search.png') });
  await dialog.getByRole('button', { name: /Élodie Noël/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Action sélectionnée')).toHaveText('Élodie Noël');
});

test('phone search, no results, reset and pagination remain usable', async ({ page }) => {
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('status')).toHaveText('35 résultats');
  await dialog.getByRole('button', { name: 'Afficher plus de résultats' }).click();
  await expect(dialog.getByRole('button', { name: 'Afficher plus de résultats' })).toBeHidden();
  await dialog.getByLabel('Client, téléphone ou prestation').fill('471123456');
  await expect(dialog.getByRole('status')).toHaveText('1 résultat');
  await dialog.getByLabel('Client, téléphone ou prestation').fill('introuvable');
  await expect(dialog.getByText('Aucun rendez-vous trouvé')).toBeVisible();
  await dialog.getByRole('button', { name: 'Effacer la recherche' }).click();
  await expect(dialog.getByRole('status')).toHaveText('35 résultats');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  expect(await dialog.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('date picker and waitlist are accessible on desktop and mobile', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: /Choisir une date/ }).filter({ visible: true }).click();
  await expect(page.getByRole('grid')).toBeVisible();
  await page.getByRole('grid').getByRole('gridcell', { name: '15', exact: true }).click();
  await expect(page.getByRole('grid')).toBeHidden();
  await expect(page.getByRole('button', { name: /Choisir une date :.*15 octobre 2026/ }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: /Liste d’attente/ }).click();
  await expect(page.getByLabel('Action sélectionnée')).toHaveText('Liste d’attente ouverte');
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  await expect(page.getByLabel('Action sélectionnée')).toHaveText('Nouveau rendez-vous');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('agenda-toolbar.png') });
});
