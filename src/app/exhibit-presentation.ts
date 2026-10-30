import {catalog, catalogNumber, type CatalogEntry} from './catalog';
import {detectLang,setLang,translator,type Lang} from '../shared/i18n';

const pickName=(entry:Record<string,string|undefined>,lang:Lang):string=>lang==='zh'?entry.name??'':(entry.nameEn??entry.name??'');
const pickCategory=(entry:Record<string,string|undefined>,lang:Lang):string=>lang==='zh'?entry.category??'':(entry.categoryEn??entry.category??'');
const pickField=(entry:Record<string,string|undefined>,lang:Lang,field:'caption'|'mechanism'):string=>
 lang==='zh'?(entry[field]??''):(entry[field==='caption'?'captionEn':'mechanismEn']??entry[field]??'');

/** Gallery chrome is intentionally outside every simulator's event and state ownership. */
export function createExhibitHeader(id:string) {
 const lang=detectLang(),t=translator(lang);
 const index=catalog.findIndex(item=>item.id===id),entry=catalog[index];
 const header=document.createElement('header');header.className='exhibit-header';
 const previous=catalog[(index+catalog.length-1)%catalog.length];
 const next=catalog[(index+1)%catalog.length];
 const neighbourLabel=(n:CatalogEntry,kind:'prev'|'next')=>
  `${t(kind==='prev'?'exhibit.prev':'exhibit.next')}: ${pickName(n,lang)}`;
 header.innerHTML=`<a class="exhibit-home" href="#/" aria-label="${t('brand.home')}"><span aria-hidden="true">${lang==='zh'?'纸':'PM'}</span></a>`
  +`<div class="exhibit-heading"><p class="eyebrow">${t('brand.name')}${entry?' / '+pickCategory(entry,lang):''}</p><h1 tabindex="-1">${entry?pickName(entry,lang):t('exhibit.unknown')}</h1></div>`
  +`<nav class="exhibit-navigation" aria-label="${t('exhibit.navLabel')}">`
  +`<a class="gallery-link" href="#/">${t('nav.collection')} <svg class="museum-direction-arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 16 16 4M4 4h12v12"/></svg></a>`
  +`<button class="exhibit-language" type="button" data-lang-switch aria-label="${t('lang.label')}">${t('lang.switch')}</button>`
  +(entry?`<div class="exhibit-pagination">`
    +`<a class="exhibit-neighbor" href="#/${previous.id}" aria-label="${neighbourLabel(previous,'prev')}" title="${neighbourLabel(previous,'prev')}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m11.5 5-5 5 5 5M6.5 10H16"/></svg></a>`
    +`<span class="exhibit-position" aria-label="${t('exhibit.position',{index:index+1,total:catalog.length})}">${catalogNumber(id)} <i aria-hidden="true">/</i> ${catalog.length}</span>`
    +`<a class="exhibit-neighbor" href="#/${next.id}" aria-label="${neighbourLabel(next,'next')}" title="${neighbourLabel(next,'next')}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8.5 5 5 5-5 5M4 10h9.5"/></svg></a>`
    +`</div>`:'')
  +`</nav>`;
 return header;
}

/** Flip the interface language, then let the caller re-render the current route. */
export function bindLanguageSwitch(scope:{bindProperty:(target:object,key:string,callback:(...args:unknown[])=>unknown)=>void},rerender:()=>void) {
 for(const button of document.querySelectorAll('[data-lang-switch]'))
  scope.bindProperty(button as object,'onclick',()=>{
   setLang(detectLang()==='en'?'zh':'en');
   rerender();
  });
}

export function mountExhibitPresentation(root:HTMLElement,entry:CatalogEntry|undefined) {
 const lang=detectLang();
 const dock=root.querySelector<HTMLElement>('.play-dock');
 const doorway=dock?.querySelector<HTMLButtonElement>('.museum-learning-entry');
 const extras=dock?.querySelector<HTMLElement>(':scope > .dock-extras');
 // Free play is the invitation; the optional lesson follows it. Move the same
 // bound node, never clone it or change the lesson's event/state ownership.
 if(doorway&&extras)dock!.insertBefore(doorway,extras);
 const stage=root.querySelector<HTMLElement>('.stage');
 if(!stage||!entry)return;
 const caption=document.createElement('div');caption.className='exhibit-stage-caption';
 // Repeats catalogue information visually; leave the accessible model label untouched.
 caption.setAttribute('aria-hidden','true');
 const title=document.createElement('span'),mechanism=document.createElement('span');
 title.textContent=pickField(entry,lang,'caption');
 mechanism.textContent=pickField(entry,lang,'mechanism');
 caption.append(title,mechanism);stage.prepend(caption);
}
