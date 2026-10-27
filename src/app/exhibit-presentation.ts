import {catalog, catalogNumber, type CatalogEntry} from './catalog';

/** Gallery chrome is intentionally outside every simulator's event and state ownership. */
export function createExhibitHeader(id:string) {
 const index=catalog.findIndex(item=>item.id===id),entry=catalog[index];
 const header=document.createElement('header');header.className='exhibit-header';
 const previous=catalog[(index+catalog.length-1)%catalog.length];
 const next=catalog[(index+1)%catalog.length];
 header.innerHTML=`<a class="exhibit-home" href="#/" aria-label="纸上机械馆 · 返回馆藏"><span aria-hidden="true">纸</span></a><div class="exhibit-heading"><p class="eyebrow">纸上机械馆${entry?' / '+entry.category+'馆藏':''}</p><h1 tabindex="-1">${entry?.name||'馆藏'}</h1></div><nav class="exhibit-navigation" aria-label="馆藏导览"><a class="gallery-link" href="#/">馆藏目录 <svg class="museum-direction-arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 16 16 4M4 4h12v12"/></svg></a>${entry?`<div class="exhibit-pagination"><a class="exhibit-neighbor" href="#/${previous.id}" aria-label="上一件：${previous.name}" title="上一件：${previous.name}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m11.5 5-5 5 5 5M6.5 10H16"/></svg></a><span class="exhibit-position" aria-label="第 ${index+1} 件，共 ${catalog.length} 件">${catalogNumber(id)} <i aria-hidden="true">/</i> ${catalog.length}</span><a class="exhibit-neighbor" href="#/${next.id}" aria-label="下一件：${next.name}" title="下一件：${next.name}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8.5 5 5 5-5 5M4 10h9.5"/></svg></a></div>`:''}</nav>`;
 return header;
}

export function mountExhibitPresentation(root:HTMLElement,entry:CatalogEntry|undefined) {
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
 title.textContent=entry.caption;mechanism.textContent=entry.mechanism;
 caption.append(title,mechanism);stage.prepend(caption);
}
