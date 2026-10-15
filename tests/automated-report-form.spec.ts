import { test, expect } from '@playwright/test';
declare global { interface Window { reportFormFixture: { count:()=>number; revision:(i:number)=>string|undefined; finish:(i:number,id?:string)=>void; fail:(i:number)=>void } } }
test.beforeEach(async({page})=>{await page.goto('/tests/fixtures/automated-report-form.html');await page.getByRole('button',{name:'Modifier le rapport fictif'}).click();});
test('report form stays open and locked until confirmed, preserving input on failure',async({page})=>{
  await page.getByLabel('Nom du rapport').fill('Brouillon conservé');
  await page.getByRole('button',{name:'Mettre à jour'}).click();
  await expect.poll(()=>page.evaluate(()=>window.reportFormFixture.count())).toBe(1);
  await expect(page.getByLabel('Nom du rapport')).toBeDisabled();
  await expect(page.getByRole('combobox',{name:'Fréquence d’envoi'})).toBeDisabled();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(()=>window.reportFormFixture.fail(0));
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Nom du rapport')).toHaveValue('Brouillon conservé');
  await page.getByRole('button',{name:'Mettre à jour'}).click();
  await expect.poll(()=>page.evaluate(()=>window.reportFormFixture.count())).toBe(2);
  await page.evaluate(()=>window.reportFormFixture.finish(1));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Modifier le rapport fictif'})).toBeFocused();
});
test('a mismatched save result cannot close the report form',async({page})=>{
  await page.getByRole('button',{name:'Mettre à jour'}).click();
  await expect.poll(()=>page.evaluate(()=>window.reportFormFixture.count())).toBe(1);
  await page.evaluate(()=>window.reportFormFixture.finish(0,'wrong-id'));
  await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('dialog')).toBeVisible();
});
test('unadded addresses are never silently omitted and invalid addresses are rejected',async({page})=>{
  await page.getByRole('textbox',{name:'Adresse du destinataire'}).fill('bad');
  await page.getByRole('button',{name:'Ajouter le destinataire'}).click();
  await expect(page.getByRole('alert')).toContainText('adresse e-mail valide');
  await page.getByRole('textbox',{name:'Adresse du destinataire'}).fill('second@example.test');
  await page.getByRole('button',{name:'Mettre à jour'}).click();
  await expect(page.getByRole('alert')).toContainText('Ajoutez l’adresse');
  expect(await page.evaluate(()=>window.reportFormFixture.count())).toBe(0);
  await page.getByRole('button',{name:'Ajouter le destinataire'}).click();
  await expect(page.getByRole('button',{name:'Retirer second@example.test'})).toBeVisible();
});
test('captures the editing revision and keeps the long form within the viewport',async({page})=>{
  await page.getByLabel('Nom du rapport').fill('Dernier brouillon');
  await page.getByRole('button',{name:'Mettre à jour'}).click();
  await expect.poll(()=>page.evaluate(()=>window.reportFormFixture.count())).toBe(1);
  expect(await page.evaluate(()=>window.reportFormFixture.revision(0))).toBe('2026-10-15T10:00:00Z');
  await page.evaluate(()=>window.reportFormFixture.fail(0));
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.getByRole('button',{name:'Annuler',exact:true})).toBeEnabled();
});
