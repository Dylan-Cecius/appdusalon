import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), { height: innerHeight, offsetTop: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  });
  await page.goto('/?mobile-cart=1&failure=1');
  await page.evaluate(() => {
    const style = document.documentElement.style;
    style.setProperty('--app-safe-top', '24px'); style.setProperty('--app-safe-bottom', '20px');
    style.setProperty('--app-safe-left', '16px'); style.setProperty('--app-safe-right', '16px');
  });
  await page.getByRole('button', { name: 'Ouvrir le panier fictif' }).click();
});

test('long cart has labelled touch targets, reachable payment and preserves items on failure', async ({ page }) => {
  const dialog = page.getByRole('dialog');
  const decrease = dialog.getByRole('button', { name: /^Diminuer la quantité/ }).first();
  await expect(decrease).toBeVisible();
  const box = (await decrease.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
  const payment = dialog.getByRole('button', { name: 'Bancontact', exact: true });
  await payment.scrollIntoViewIfNeeded();
  await expect(payment).toBeInViewport();
  const body = dialog.locator('[data-vaul-no-drag]');
  expect(await body.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await payment.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('Le panier est conservé');
  await expect(dialog.getByRole('alert')).toBeFocused();
  await expect(dialog.getByRole('alert')).toBeInViewport();
  await expect(dialog.getByRole('button', { name: /^Retirer .* du panier$/ })).toHaveCount(12);
});

test('cart stays inside synthetic viewport insets with an explicit close button', async ({ page }) => {
  const dialog = page.getByRole('dialog');
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 280, offsetTop: 30 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => (await dialog.boundingBox())!.height).toBeLessThanOrEqual(225);
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(54);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(291);
  expect(bounds.x).toBeGreaterThanOrEqual(16);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual((await page.evaluate(() => innerWidth)) - 16);
  const close = dialog.getByRole('button', { name: 'Fermer le panier', exact: true });
  await expect(close).toBeInViewport();
  await close.click(); await expect(dialog).toBeHidden();
});

test('staff selection survives closing and reopening the mobile cart', async ({ page }) => {
  const dialog = page.getByRole('dialog');
  const staff = dialog.getByRole('combobox', { name: 'Prestataire (optionnel)' });
  await staff.scrollIntoViewIfNeeded(); await staff.click();
  await page.getByRole('option', { name: 'Équipe fictive — Coiffure' }).click();
  await dialog.getByRole('button', { name: 'Fermer le panier' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Ouvrir le panier fictif' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Prestataire (optionnel)' })).toContainText('Équipe fictive');
});
