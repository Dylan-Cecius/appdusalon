import { expect, test, type Page } from '@playwright/test';

declare global { interface Window { restorePreviewStorage?: () => void } }
const url = '/tests/fixtures/standalone.html';
const key = 'appdusalon-agenda-preview-v2-2026-10-15';
async function navigate(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}
async function readState(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key);
}
async function addCut(page: Page) {
  await navigate(page, 'Caisse');
  await page.getByRole('button', { name: /Coupe homme/ }).click();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00Z'));
});

test('preserves cart and fictitious identity across navigation and reload', async ({ page }) => {
  await page.goto(url); await addCut(page);
  await page.getByLabel('Client fictif (facultatif)').fill('Client Parcours');
  await page.getByLabel('Téléphone fictif (facultatif)').fill('0000 12 34 56');
  await navigate(page, 'Agenda'); await navigate(page, 'Caisse');
  await expect(page.getByLabel('Client fictif (facultatif)')).toHaveValue('Client Parcours');
  await expect(page.getByRole('button', { name: 'Retirer Coupe homme, ligne 1' })).toBeVisible();
  await page.reload(); await navigate(page, 'Caisse');
  await expect(page.getByLabel('Téléphone fictif (facultatif)')).toHaveValue('0000 12 34 56');
  expect((await readState(page)).cart.lines).toHaveLength(1);
  await page.getByRole('button', { name: 'Retirer Coupe homme, ligne 1' }).click();
  await expect(page.getByRole('button', { name: 'Simuler carte' })).toBeDisabled();
});

test('one simulated receipt updates contacts and metrics without provider calls', async ({ page }) => {
  const forbidden: string[] = [];
  await page.route(/supabase|stripe|resend|twilio/i, route => { forbidden.push(route.request().url()); return route.abort(); });
  await page.goto(url); await addCut(page);
  await page.getByRole('button', { name: /Coupe \+ barbe/ }).click();
  await page.getByLabel('Client fictif (facultatif)').fill('Élodie Parcours');
  await page.getByLabel('Téléphone fictif (facultatif)').fill('0000 12 34 56');
  // Two confirmations in the same turn exercise the synchronous guard/idempotency.
  await page.getByRole('button', { name: 'Simuler carte' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole('status')).toContainText(/Ticket simulé enregistré/);
  expect((await readState(page)).tickets).toHaveLength(1);
  await navigate(page, 'Clients'); await page.getByLabel('Rechercher un client').fill('elodie parcours');
  const row = page.getByRole('row', { name: /Élodie Parcours/ });
  await expect(row).toContainText(/60,00/); await expect(row.getByRole('cell').nth(1)).toHaveText('1');
  await navigate(page, 'Tableau de bord');
  await expect(page.getByText('CA simulé aujourd’hui').locator('..')).toContainText(/60,00/);
  await navigate(page, 'Statistiques');
  await expect(page.getByText('CA simulé', { exact: true }).locator('..')).toContainText(/195,00/);
  await page.reload();
  expect((await readState(page)).tickets).toHaveLength(1); expect(forbidden).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('quota failure retains the draft and a retry confirms only one ticket', async ({ page }) => {
  await page.goto(url); await addCut(page);
  await page.getByLabel('Client fictif (facultatif)').fill('Saisie conservée');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restorePreviewStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); };
  });
  await page.getByRole('button', { name: 'Simuler espèces' }).click();
  await expect(page.getByRole('alert').first()).toContainText(/Enregistrement local impossible/);
  await expect(page.getByLabel('Client fictif (facultatif)')).toHaveValue('Saisie conservée');
  expect((await readState(page)).tickets).toHaveLength(0);
  await page.evaluate(() => window.restorePreviewStorage?.());
  await page.getByRole('button', { name: 'Simuler espèces' }).click();
  expect((await readState(page)).tickets).toHaveLength(1);
  await expect(page.getByLabel('Client fictif (facultatif)')).toHaveValue('');
});

test('detects changed storage instead of overwriting another tab', async ({ page }) => {
  await page.goto(url); await addCut(page);
  await page.evaluate(key => localStorage.setItem(key, localStorage.getItem(key)! + ' '), key);
  await page.getByRole('button', { name: 'Simuler carte' }).click();
  await expect(page.getByRole('alert').first()).toContainText(/autre onglet/);
  expect((await readState(page)).tickets).toHaveLength(0);
  await page.reload(); await navigate(page, 'Caisse');
  await page.getByRole('button', { name: 'Simuler carte' }).click();
  expect((await readState(page)).tickets).toHaveLength(1);
});

for (const shape of ['array', 'envelope'] as const) {
  test(`migrates legacy ${shape} without losing reserved steps, prices or absences`, async ({ page }) => {
    await page.addInitScript(({ key, shape }) => {
      if (localStorage.getItem(key) !== null) return;
      const startTime = '2026-10-15T14:00:00Z', endTime = '2026-10-15T15:30:00Z';
      const appointments = [{ id: 'legacy', clientName: 'Ancienne Coloration', clientPhone: '0000',
        startTime, endTime, status: 'scheduled', isPaid: false, paymentStatus: 'deposit_paid', amountPaid: 10, depositRequired: 10,
        totalPrice: 61, staffId: 'demo-staff-0', recurrenceGroupId: 'saved-series', recurrenceIndex: 2,
        services: [{ id: 'demo-couleur', name: 'Ancien tarif couleur', price: 61, duration: 90, category: 'coupe' }],
        segments: [{ id: 'phase-1', label: 'Application réservée', type: 'work', startTime, endTime: '2026-10-15T14:30:00Z', occupiesStaff: true },
          { id: 'phase-2', label: 'Pose libre réservée', type: 'pause', startTime: '2026-10-15T14:30:00Z', endTime, occupiesStaff: false }],
      }];
      localStorage.setItem(key, JSON.stringify(shape === 'array' ? appointments : { appointments, waitlist: [],
        timeOff: [{ id: 'saved-off', title: 'Congé réservé', staffId: 'demo-staff-1', reason: 'leave', startTime: '2026-10-20T08:00:00Z', endTime: '2026-10-21T08:00:00Z' }],
      }));
    }, { key, shape });
    await page.goto(url + '?view=agenda');
    await page.getByRole('button', { name: 'Rechercher un rendez-vous', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Client, téléphone ou prestation').fill('Ancienne Coloration');
    await page.getByRole('dialog').getByRole('button', { name: /Ancienne Coloration/ }).click();
    await expect(page.getByRole('region', { name: 'Déroulé du rendez-vous' })).toContainText('Pose libre réservée');
    await page.keyboard.press('Escape');
    await addCut(page); // First write performs the compatible migration.
    const saved = await readState(page);
    expect(saved.version).toBe(1); expect(saved.appointments[0].totalPrice).toBe(61);
    expect(saved.appointments[0].segments).toHaveLength(2); expect(saved.appointments[0].recurrenceGroupId).toBe('saved-series');
    if (shape === 'envelope') { expect(saved.waitlist).toHaveLength(0); expect(saved.timeOff[0].id).toBe('saved-off'); }
    await page.reload(); expect((await readState(page)).appointments[0].amountPaid).toBe(10);
  });
}

test('invalid storage is preserved and memory-only use is clearly announced', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{invalid'), key);
  await page.goto(url); await expect(page.getByRole('status')).toContainText(/restent dans cet onglet/);
  await addCut(page); await page.getByRole('button', { name: 'Simuler carte' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('{invalid');
  await navigate(page, 'Tableau de bord');
  await expect(page.getByText('CA simulé aujourd’hui').locator('..')).toContainText(/25,00/);
});

test('reset restores the complete shared demo and keeps every main view within mobile width', async ({ page }) => {
  await page.goto(url); await addCut(page);
  await page.getByRole('button', { name: 'Simuler espèces' }).click();
  await addCut(page);
  await navigate(page, 'Agenda'); await page.getByRole('button', { name: 'Réinitialiser la démo' }).click();
  const state = await readState(page);
  expect(state.tickets).toHaveLength(0); expect(state.cart.lines).toHaveLength(0);
  expect(state.waitlist).toHaveLength(2); expect(state.appointments).toHaveLength(15);
  for (const view of ['Caisse', 'Clients', 'Statistiques', 'Tableau de bord']) {
    await navigate(page, view);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  }
});
