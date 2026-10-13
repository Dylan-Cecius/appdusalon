import { expect, test, type Page } from '@playwright/test';

async function search(page: Page, query: string) {
  await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Client, téléphone ou prestation').fill(query);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T10:00:00'));
  await page.goto('/tests/fixtures/standalone.html?view=agenda');
});

test('real agenda search opens a record and persists edited client details', async ({ page }) => {
  const backendRequests: string[] = [];
  page.on('request', request => { if (/supabase|stripe|twilio|resend/i.test(request.url())) backendRequests.push(request.url()); });
  await search(page, 'elodie');
  await page.getByRole('dialog').getByRole('button', { name: /Élodie Noël/ }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Nom du client').fill('');
  await editor.getByLabel('Nom du client').pressSequentially('Elodie Preview');
  await expect(editor.getByLabel('Nom du client')).toHaveValue('Elodie Preview');
  await editor.getByRole('button', { name: 'Sauvegarder' }).click();
  await expect(editor).toBeHidden();
  await page.reload();
  await search(page, 'Elodie Preview');
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('1 résultat');
  expect(backendRequests).toEqual([]);
});

test('creates a demo appointment, rejects collisions, and resets the sample data', async ({ page }) => {
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Nom du client fictif').fill('Alex Preview');
  await form.getByLabel('Heure', { exact: true }).fill('09:30');
  await form.getByRole('button', { name: 'Créer le rendez-vous' }).click();
  await expect(form.getByRole('alert')).toHaveText(/déjà un rendez-vous/);
  await form.getByLabel('Heure', { exact: true }).fill('17:00');
  await form.getByRole('button', { name: 'Créer le rendez-vous' }).click();
  await expect(form).toBeHidden();
  await search(page, 'Alex Preview');
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('1 résultat');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Réinitialiser la démo' }).click();
  await search(page, 'Alex Preview');
  await expect(page.getByRole('dialog').getByText('Aucun rendez-vous trouvé')).toBeVisible();
});

test('simulates settlement and opens the real waitlist without external services', async ({ page }, testInfo) => {
  await search(page, 'elodie');
  await page.getByRole('dialog').getByRole('button', { name: /Élodie Noël/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Espèces/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await search(page, 'elodie');
  await expect(page.getByRole('dialog').getByText('Payé', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Liste d’attente/ }).click();
  await expect(page.getByRole('dialog').getByText('Alice Démo')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('interactive-agenda.png'), animations: 'disabled', fullPage: true });
});

test('moves an appointment by dragging it to another time slot', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The mobile agenda uses the editable list view.');
  const card = page.getByRole('button', { name: /Élodie Noël/ });
  const target = page.locator('[data-slot-member="demo-staff-0"][data-slot-hour="11"][data-slot-minute="0"]');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeInViewport();
  await expect(target).toBeInViewport();
  const from = await card.boundingBox(), to = await target.boundingBox();
  expect(from).not.toBeNull(); expect(to).not.toBeNull();
  await page.mouse.move(from!.x + 30, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + 40, from!.y + from!.height / 2, { steps: 3 });
  await page.mouse.move(to!.x + 30, to!.y + to!.height / 2, { steps: 12 });
  await page.mouse.up();
  await search(page, 'elodie');
  await expect(page.getByRole('dialog').getByRole('button', { name: /Élodie Noël/ })).toContainText('11:00');
});
