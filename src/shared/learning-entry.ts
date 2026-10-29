import type {ResourceScope} from '../app/scope';
import {detectLang,translator} from './i18n';

/** A common doorway into each exhibit's existing activity, not a new simulator. */
export function mountLearningEntry(root:HTMLElement,scope:ResourceScope,id:string){
 const dock=root.querySelector<HTMLElement>('.play-dock');
 const guide=root.querySelector<HTMLDetailsElement>('.mechanism-lesson');
 const observer=root.querySelector<HTMLDetailsElement>('.mechanism-observer,.principle-explorer');
 const challenge=root.querySelector<HTMLDetailsElement>('.bike-challenge');
 const bicycleLab=root.querySelector<HTMLElement>('.bike-lab');
 const generator=root.querySelector<HTMLElement>('.gen-lesson');
 const target=bicycleLab||generator||guide||challenge||observer;
 if(!dock||!target)return;
 dock.classList.add('has-learning-entry');
 const t=translator(detectLang());
 const entry=document.createElement('button');entry.type='button';entry.className='museum-learning-entry';
 const kind=generator?t('learn.kindGenerator'):bicycleLab||challenge?t('learn.kindBicycle'):id==='fan'?t('learn.kindFan'):t('learn.kindDefault');
 entry.innerHTML='<span>'+t('learn.entry')+' <small>'+t('learn.optional')+'</small></span><span>'+kind+' <svg class="museum-direction-arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 16 16 4M4 4h12v12"/></svg></span>';
 entry.setAttribute('aria-label',t('learn.entry')+': '+kind);
 const before=dock.querySelector('#btns')||dock.querySelector(':scope > .actions')||dock.querySelector('.dock-extras');
 if(before?.parentElement===dock)dock.insertBefore(entry,before);else dock.prepend(entry);
 scope.listen(entry,'click',()=>{
  // Only reveal teaching UI. Never press a machine control or start a challenge.
  if(bicycleLab){
   // Reveal the course beside the model without opening the assumptions
   // disclosure, starting a trial, or changing its conditions.
   if(bicycleLab instanceof HTMLDetailsElement)bicycleLab.open=true;
  }else if(generator)generator.querySelector<HTMLButtonElement>('[data-lesson="start"]')?.click();
  else {
   if(guide&&observer)observer.open=true;
   (target as HTMLDetailsElement).open=true;
  }
  scope.timeout(()=>{
   const focus=target.querySelector<HTMLElement>(bicycleLab?'#bike-lab-title':'h3,summary,button');
   focus?.focus({preventScroll:true});target.scrollIntoView?.({block:'nearest',behavior:'instant'});
  },0);
 });
 scope.onCleanup(()=>entry.remove());
}
