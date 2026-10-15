import { expect, test } from '@playwright/test';

// Synthetic geometry exercises layout; it does NOT reproduce an iOS keyboard.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), { height: innerHeight, offsetTop: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  });
  await page.goto('/?view=agenda');
  await page.evaluate(() => {
    const style = document.documentElement.style;
    style.setProperty('--app-safe-top', '24px');
    style.setProperty('--app-safe-bottom', '20px');
    style.setProperty('--app-safe-left', '16px');
    style.setProperty('--app-safe-right', '16px');
  });
});

test('navigation fits the available screen and mobile tabs have accessible touch targets', async ({ page }) => {
  expect(await page.locator('html').getAttribute('lang')).toBe('fr');
  const shell = page.locator('.app-safe-shell');
  await expect(shell).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const header = page.locator('header');
  expect((await header.boundingBox())!.y).toBeGreaterThanOrEqual(24);
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  if (await nav.isVisible()) {
    for (const button of await nav.getByRole('button').all()) {
      const bounds = (await button.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
    }
    await expect(nav.getByRole('button', { name: 'Agenda', exact: true })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('button', { name: 'Clients', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  }
});

test('appointment form stays scrollable in a reduced viewport and can be closed', async ({ page }) => {
  await page.getByRole('button', { name: 'Nouveau rendez-vous', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const client = dialog.getByLabel('Nom du client fictif');
  await client.fill('Client mobile synthétique');
  expect(await client.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 280, offsetTop: 30 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => (await dialog.boundingBox())!.height).toBeLessThanOrEqual(212 + 1);
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(54);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(290);
  expect(bounds.x).toBeGreaterThanOrEqual(16);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual((await page.evaluate(() => innerWidth)) - 16);
  await dialog.getByRole('button', { name: 'Créer le rendez-vous' }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('button', { name: 'Créer le rendez-vous' })).toBeInViewport();
  const close = dialog.getByRole('button', { name: 'Fermer', exact: true });
  await close.scrollIntoViewIfNeeded();
  const closeBounds = (await close.boundingBox())!;
  expect(closeBounds.height).toBeGreaterThanOrEqual(44);
  expect(closeBounds.width).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(dialog).toBeHidden();
});
