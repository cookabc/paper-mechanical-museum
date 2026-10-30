import {test,expect,type Page} from '@playwright/test';

async function untranslated(page:Page) {
 return page.evaluate(()=>{
  const values:string[]=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
   const parent=node.parentElement;
   if(parent?.closest('script,style,[data-lang-switch]'))continue;
   if(/[\p{Script=Han}]/u.test(node.textContent??''))values.push(node.textContent!.trim());
  }
  for(const element of document.querySelectorAll('[aria-label],[aria-description],[title],[alt]'))
   for(const name of ['aria-label','aria-description','title','alt']){
    const value=element.getAttribute(name);if(value&&/[\p{Script=Han}]/u.test(value))values.push(value);
   }
  return [...new Set(values)];
 });
}

test('home language choice persists and every cached exhibit switches its own controls and lessons',async({page})=>{
 test.setTimeout(90_000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Switch to Chinese',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','zh');
 await expect(page.locator('#museum-title')).toContainText('把日常');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','zh');
 await page.getByRole('button',{name:'切换到英文',exact:true}).click();
 for(const id of ['washer','fan','claw','coffee','musicbox','vending','toaster','turntable','camera','elevator','bicycle','generator']){
  await page.goto('/#/'+id);
  await expect(page.locator('.museum-learning-entry')).toBeVisible();
  await page.locator('.museum-learning-entry').click();
  expect(await untranslated(page),id+' English lesson').toEqual([]);
  await page.getByRole('button',{name:'Switch to Chinese',exact:true}).click();
  await expect(page.locator('.museum-learning-entry')).toContainText('动手学');
  await expect(page.locator('.mechanical-audio')).toContainText('机械音效音量');
  await expect(page.locator('.play-dock')).toContainText(/[\p{Script=Han}]/u);
  await page.getByRole('button',{name:'切换到英文',exact:true}).click();
  await expect(page.locator('.museum-learning-entry')).toContainText('Learn by doing');
  expect(await untranslated(page),id+' cached English mount').toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' viewport').toBe(true);
 }
 expect(errors).toEqual([]);
});
