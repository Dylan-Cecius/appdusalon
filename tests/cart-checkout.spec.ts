import { test, expect } from '@playwright/test';
import type { NewTransaction } from '../src/lib/transactions';
declare global { interface Window { cartFixture:{calls:number;input:NewTransaction|null;finish:()=>void;fail:()=>void} } }
test.beforeEach(async({page})=>{await page.goto('/tests/fixtures/cart-checkout.html');});
test('retains staff and locks the basket while confirmation is pending',async({page})=>{
  await page.getByRole('combobox',{name:'Prestataire (optionnel)'}).click();
  await page.getByRole('option',{name:'Alex — Coiffeur'}).click();
  await page.getByRole('button',{name:'Bancontact',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Enregistrement en cours…');
  await expect(page.getByRole('button',{name:'Cash',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Retirer Coupe du panier'})).toBeDisabled();
  await expect(page.getByRole('combobox')).toBeDisabled();
  expect(await page.evaluate(()=>window.cartFixture.input?.staffId)).toBe('staff-2');
  expect(await page.evaluate(()=>window.cartFixture.calls)).toBe(1);
  await page.evaluate(()=>window.cartFixture.finish());
  await expect(page.getByText('Panier vide',{exact:true})).toBeVisible();
});
test('keeps basket and staff on failure, then permits a deliberate retry',async({page})=>{
  await page.getByRole('combobox',{name:'Prestataire (optionnel)'}).click();
  await page.getByRole('option',{name:'Alex — Coiffeur'}).click();
  await page.getByRole('button',{name:'Cash',exact:true}).click();
  await page.evaluate(()=>window.cartFixture.fail());
  await expect(page.getByRole('alert')).toContainText('Panier conservé');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByText('Coupe',{exact:true})).toBeVisible();
  await expect(page.getByRole('combobox')).toContainText('Alex');
  await page.getByRole('button',{name:'Cash',exact:true}).click();
  expect(await page.evaluate(()=>window.cartFixture.calls)).toBe(2);
  expect(await page.evaluate(()=>window.cartFixture.input?.staffId)).toBe('staff-2');
  await page.evaluate(()=>window.cartFixture.finish());
  await expect(page.getByText('Panier vide',{exact:true})).toBeVisible();
});
test('blocks synchronous duplicate activation before a render',async({page})=>{
  await page.getByRole('button',{name:'Cash',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
  expect(await page.evaluate(()=>window.cartFixture.calls)).toBe(1);
  await page.evaluate(()=>window.cartFixture.finish());
});
