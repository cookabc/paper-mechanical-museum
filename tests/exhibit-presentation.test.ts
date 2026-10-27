import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {catalog,catalogNumber} from '../src/app/catalog';
import {createExhibitHeader,mountExhibitPresentation} from '../src/app/exhibit-presentation';
import {createApp} from '../src/app/app';
import {ResourceScope} from '../src/app/scope';
import {mountLearningEntry} from '../src/shared/learning-entry';

it('uses one complete numbered catalogue and a wrapping, accessible local gallery journey',()=>{
 expect(catalog).toHaveLength(12);expect(new Set(catalog.map(item=>item.id)).size).toBe(12);
 expect(readFileSync('index.html','utf8')).toContain(`纸上机械馆：${catalog.length} 件可以动手观察的小机器。`);
 for(const [index,item] of catalog.entries()){
  const header=createExhibitHeader(item.id);
  expect(header.querySelector('h1')?.textContent).toBe(item.name);
  expect(header.querySelector('h1')?.getAttribute('tabindex')).toBe('-1');
  expect(header.querySelector('.exhibit-position')?.getAttribute('aria-label')).toBe(`第 ${index+1} 件，共 12 件`);
  const neighbors=[...header.querySelectorAll<HTMLAnchorElement>('.exhibit-neighbor')];
  const previous=catalog[(index+11)%12],next=catalog[(index+1)%12];
  expect(neighbors.map(link=>link.getAttribute('href'))).toEqual(['#/'+previous.id,'#/'+next.id]);
  expect(neighbors.map(link=>link.getAttribute('aria-label'))).toEqual(['上一件：'+previous.name,'下一件：'+next.name]);
  expect(header.querySelector('.exhibit-home')?.getAttribute('href')).toBe('#/');
  expect(catalogNumber(item.id)).toBe(String(index+1).padStart(2,'0'));
 }
 expect(catalogNumber('unknown')).toBe('—');
 expect(createExhibitHeader('<bad-route>').querySelectorAll('.exhibit-neighbor')).toHaveLength(0);
 expect(createExhibitHeader('<bad-route>').querySelector('h1')?.textContent).toBe('馆藏');
});

it('moves the original optional doorway after free-play without changing the model or its listener',()=>{
 const root=document.createElement('div');
 root.innerHTML='<aside class="play-dock"><button class="museum-learning-entry">学一学</button><div class="actions"><button>开始</button></div><div class="dock-extras"></div></aside><section class="stage"><svg id="fig" viewBox="1 2 300 200"><g data-model="untouched"></g></svg><p class="stage-note">拖动</p><section class="bike-lab">Existing stage content</section></section>';
 const doorway=root.querySelector<HTMLButtonElement>('.museum-learning-entry')!,action=root.querySelector('.actions')!,model=root.querySelector('svg')!;
 const onClick=vi.fn();doorway.addEventListener('click',onClick);const original=model.outerHTML;
 mountExhibitPresentation(root,catalog[10]);
 expect(action.nextElementSibling).toBe(doorway);
 expect(doorway.nextElementSibling?.className).toBe('dock-extras');
 doorway.click();expect(onClick).toHaveBeenCalledOnce();
 expect(root.querySelector('svg')).toBe(model);expect(model.outerHTML).toBe(original);
 expect(root.querySelector('.bike-lab')?.textContent).toBe('Existing stage content');
 const caption=root.querySelector('.exhibit-stage-caption')!;
 expect(caption.getAttribute('aria-hidden')).toBe('true');expect(caption.textContent).toContain(catalog[10].mechanism);
});

it('keeps home filters and recommendations aligned with the same catalogue',()=>{
 const root=document.createElement('div');document.body.append(root);const previousHash=location.hash;location.hash='';
 const app=createApp(root);
 try {
  expect(root.querySelectorAll('.museum-card')).toHaveLength(catalog.length);
  for(const category of ['日常','声音','游乐','全部']){
   root.querySelector<HTMLButtonElement>(`[data-filter="${category}"]`)!.click();
   const expected=catalog.filter(item=>category==='全部'||item.category===category).length;
   expect(root.querySelectorAll('.museum-card:not([hidden])')).toHaveLength(expected);
   expect(root.querySelector('.collection-count')?.textContent).toContain(String(expected));
  }
  for(const id of ['coffee','claw','turntable']){
   root.querySelector<HTMLButtonElement>(`[data-feature="${id}"]`)!.click();
   expect(root.querySelector('.exhibit-index')?.textContent).toBe('藏品 / '+catalogNumber(id));
   expect(root.querySelector('.exhibit-object')?.getAttribute('href')).toBe('#/'+id);
  }
  const media=vi.spyOn(window,'matchMedia').mockReturnValue({matches:true} as MediaQueryList);
  const scroll=vi.mocked(window.scrollTo);scroll.mockClear();
  root.querySelector<HTMLAnchorElement>('[data-back-top]')!.click();
  expect(scroll).toHaveBeenCalledExactlyOnceWith({top:0,behavior:'auto'});media.mockRestore();
 } finally {app.dispose();root.remove();location.hash=previousHash;}
});

it('reveals a stage-adjacent bicycle lab without starting a run or opening its assumptions',()=>{
 vi.useFakeTimers();
 const root=document.createElement('div');document.body.append(root);
 root.innerHTML='<aside class="play-dock"><div class="actions" id="btns"><button>踩踏</button></div><div class="dock-extras"><details class="bike-challenge"><summary>实验假设</summary></details></div></aside><section class="stage"><details class="bike-lab"><summary><h2 id="bike-lab-title" tabindex="-1">换挡，谁先到坡顶？</h2></summary><button class="run-trial">试爬</button></details></section>';
 const scope=new ResourceScope(),start=vi.fn(),lab=root.querySelector<HTMLElement>('.bike-lab')!;
 root.querySelector('.run-trial')!.addEventListener('click',start);
 try {
  mountLearningEntry(root,scope,'bicycle');mountExhibitPresentation(root,catalog[10]);
  root.querySelector<HTMLButtonElement>('.museum-learning-entry')!.click();vi.runAllTimers();
  expect((lab as HTMLDetailsElement).open).toBe(true);
  expect(document.activeElement).toBe(root.querySelector('#bike-lab-title'));
  expect(lab.scrollIntoView).toHaveBeenCalledWith({block:'nearest',behavior:'instant'});
  expect(root.querySelector<HTMLDetailsElement>('.bike-challenge')!.open).toBe(false);
  expect(start).not.toHaveBeenCalled();
 } finally {scope.dispose();root.remove();vi.useRealTimers();}
});
