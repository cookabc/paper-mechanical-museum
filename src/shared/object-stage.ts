import {localizeMarkup,localizeText} from './message-language.ts';
import {detectLang,translator} from './i18n';
import type {SceneContext} from '../app/contracts';
import {createColorFiguresRuntime} from '../engines/colorfigures/runtime.js';
import './object-stage.css';
export type PaperGeometry=ReturnType<typeof createColorFiguresRuntime>;
export type Bounds=readonly [number,number,number,number,number,number];
export type Palette='mint'|'mustard'|'tomato'|'cobalt'|'blush';
/** The original museum's solid geometry, light, material grain and orbit contract. */
export function createObjectStage(context:SceneContext,svg:SVGSVGElement,controls:HTMLElement,options:{bounds:Bounds;camera?:readonly [number,number];palette:Palette;draw:(g:PaperGeometry,palette:Palette)=>string;action:(action:string)=>void}){
 const t=translator(detectLang());
 const {scope}=context,g=createColorFiguresRuntime(context);g.setLight(105);
 const home=options.camera||[45,35.264];
 let yaw=home[0],pitch=home[1],palette=options.palette,dead=false,drag:null|{id:number;x:number;y:number;yaw:number;pitch:number;moved:boolean;action:string|null}=null;
 const palettes:Palette[]=['mustard','tomato','mint','cobalt','blush'];
 controls.innerHTML=localizeMarkup(`<details class="object-view-panel"><summary>${t('stage.viewLabel')}</summary><div class="object-appearance"><span>${t('stage.bodyColor')}</span><div class="object-swatches">${palettes.map(p=>`<button type="button" class="sw" data-palette="${p}" style="background:${g.PALS[p].l}" aria-label="${t(('stage.'+p) as never)}" aria-pressed="${p===palette}"></button>`).join('')}</div></div><div class="object-views"><span>${t('stage.angle')}</span><button type="button" data-view="front">${t('stage.front')}</button><button type="button" data-view="side">${t('stage.side')}</button><button type="button" data-view="back">${t('stage.back')}</button></div></details>`);
 svg.setAttribute('role','group');svg.setAttribute('tabindex','0');svg.setAttribute('aria-label',localizeText(t('stage.modelLabel')));svg.setAttribute('aria-description',localizeText(t('stage.modelHint')));
 svg.innerHTML=localizeMarkup('<defs class="object-defs"></defs><g class="object-art" filter="url(#hand)"></g>');
 const art=svg.querySelector<SVGGElement>('.object-art')!,defs=svg.querySelector('.object-defs')!;
 let lastFilter=0,currentBounds=options.bounds;
 function frame(bounds:Bounds){const [x0,y0,z0,x1,y1,z1]=bounds;const pts=[];for(const x of[x0,x1])for(const y of[y0,y1])for(const z of[z0,z1])pts.push(g.P(x,y,z));const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys);const vw=Math.max(width/.83,height/.83/0.78),vh=vw*.78;const x=(Math.min(...xs)+Math.max(...xs))/2-vw/2,y=(Math.min(...ys)+Math.max(...ys))/2-vh/2+vh*.015;return [x,y,vw,vh];}
 function render(bounds?:Bounds){currentBounds=bounds||options.bounds;paint();}
 function paint(){const bounds=currentBounds;if(dead||!scope.active)return;g.setCam(yaw,pitch);const vb=frame(bounds);svg.setAttribute('viewBox',vb.map(n=>n.toFixed(2)).join(' '));const k=vb[2]/585;if(Math.abs(lastFilter-k)>.02){defs.innerHTML=localizeMarkup(g.filterFor(k));lastFilter=k;}
 const focused=svg.contains(document.activeElement)?(document.activeElement as Element).closest('[data-act]')?.getAttribute('data-act'):null;
 // Reuse the original gallery's reference-weight outlines at the current object scale.
 art.innerHTML=localizeMarkup(options.draw(g,palette).replace(/stroke-width="([\d.]+)"/g,(_m,w)=>`stroke-width="${(Number(w)*k).toFixed(3)}"`));
 if(focused){art.querySelector<SVGElement>(`[data-act="${focused}"]`)?.focus({preventScroll:true});}
 }
 const actionOf=(target:EventTarget|null)=>target instanceof Element?target.closest('[data-act]')?.getAttribute('data-act')||null:null;
 function cancel(){if(drag){try{if(svg.hasPointerCapture?.(drag.id))svg.releasePointerCapture(drag.id);}catch{/* capture already released */}drag=null;}svg.classList.remove('is-orbiting');}
 scope.listen(svg,'pointerdown',(event:Event)=>{const e=event as PointerEvent;if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,moved:false,action:actionOf(e.target)};svg.setPointerCapture?.(e.pointerId);});
 scope.listen(svg,'pointermove',(event:Event)=>{const e=event as PointerEvent;if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){yaw=drag.yaw+dx*.35;pitch=Math.max(10,Math.min(70,drag.pitch+dy*.25));svg.classList.add('is-orbiting');paint();}});
 scope.listen(svg,'pointerup',(event:Event)=>{const e=event as PointerEvent;if(!drag||e.pointerId!==drag.id)return;const act=!drag.moved?drag.action:null;cancel();if(act)options.action(act);});scope.listen(svg,'pointercancel',cancel);scope.listen(svg,'lostpointercapture',cancel);
 // Keyboard generated click is handled separately; pointer click has already been consumed above.
 scope.listen(svg,'click',(event:Event)=>{const e=event as MouseEvent;if(e.detail===0){const act=actionOf(e.target);if(act)options.action(act);}});
 scope.listen(svg,'keydown',(event:Event)=>{const e=event as KeyboardEvent;const act=actionOf(e.target);if(act&&(e.key==='Enter'||e.key===' ')){e.preventDefault();options.action(act);return;}if(e.target!==svg)return;const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='Home'){yaw=home[0];pitch=home[1];}else if(e.key==='ArrowLeft')yaw-=12;else if(e.key==='ArrowRight')yaw+=12;else pitch=Math.max(10,Math.min(70,pitch+(e.key==='ArrowUp'?6:-6)));paint();});
 scope.listen(svg,'dblclick',()=>{yaw=home[0];pitch=home[1];paint();});
 scope.listen(controls,'click',(event:Event)=>{const b=(event.target as Element).closest<HTMLButtonElement>('button');if(!b)return;const p=b.dataset.palette as Palette;if(p&&palettes.includes(p)){palette=p;for(const button of controls.querySelectorAll('[data-palette]'))button.setAttribute('aria-pressed',String(button===b));}if(b.dataset.view){yaw=b.dataset.view==='side'?0:b.dataset.view==='back'?home[0]+180:home[0];pitch=b.dataset.view==='side'?18:home[1];}paint();});
 scope.onCleanup(()=>{cancel();dead=true;});
 return {render,cancel,resetCamera(){cancel();yaw=home[0];pitch=home[1];paint();},get geometry(){return g;}};
}
