import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{
  await page.goto('/tests/fixtures/payment-reports.html');
  await page.getByLabel('Date de référence').fill('2026-10-15');
});
test('all-method table includes prepayments and unallocated amounts',async({page})=>{
  const total=page.getByRole('row').filter({has:page.getByRole('cell',{name:'TOTAL',exact:true})});
  await expect(total).toContainText('80.00€');
  await expect(total).toContainText('30.00€');
  await expect(total).toContainText('10.00€');
  await expect(total).toContainText('40.00€');
});
test('cash filter includes only the cash part of a mixed sale',async({page})=>{
  await page.getByRole('radio',{name:'Espèces',exact:true}).click();
  const total=page.getByRole('row').filter({has:page.getByRole('cell',{name:'TOTAL',exact:true})});
  await expect(total).toContainText('30.00€');
  await expect(total).not.toContainText('80.00€');
  await expect(page.getByText('Part du paiement sélectionné',{exact:true})).toBeVisible();
});
test('clearing a date keeps the controls available and explains the invalid range',async({page})=>{
  await page.getByLabel('Date de référence').fill('');
  await expect(page.getByRole('alert')).toContainText('Choisissez des dates valides');
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByLabel('Date de référence').fill('2026-10-15');
  await expect(page.getByRole('table')).toBeVisible();
});
