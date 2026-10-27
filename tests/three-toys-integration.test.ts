import {expect,it} from 'vitest';
import {existsSync} from 'node:fs';
import {createApp} from '../src/app/app';
import {catalog} from '../src/app/catalog';

it('connects three distinct mechanical toys to the gallery and disposes their optional learning entry',()=>{
 document.body.replaceChildren();location.hash='';
 const root=document.createElement('div');document.body.append(root);
 const app=createApp(root);
 try {
  for(const id of ['automaton','geneva','rackpress']){
   expect(root.querySelector(`.museum-card[href="#/${id}"]`)).not.toBeNull();
   expect(existsSync(`public/previews/${id}.svg`)).toBe(true);
   app.navigate(id);
   expect(root.querySelector('header h1')?.textContent).toBe(catalog.find(x=>x.id===id)?.name);
   expect(root.querySelector('#fig path')).not.toBeNull();
   const controller=app.current!;
   const entry=root.querySelector<HTMLButtonElement>('.museum-learning-entry');
   expect(entry).not.toBeNull();
   const before=controller.snapshot?.();entry!.click();
   expect(controller.snapshot?.()).toEqual(before);
   app.navigate('');
   expect(root.querySelectorAll('.museum-card')).toHaveLength(15);
   entry!.click();expect(root.querySelector('.museum-learning-entry')).toBeNull();
  }
 } finally {app.dispose();root.remove();}
});
