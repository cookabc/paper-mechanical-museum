import {detectLang,translator} from './i18n';
const t=translator(detectLang());
/* Optional, state-backed mechanism observation. No timer, animation loop or
 * independent progress: each owner calls update after advancing its own state. */
import {scopedDocument} from '../app/scoped-dom';
export function createObservation(root,resourceScope){
 const document=scopedDocument(root,resourceScope);const window=globalThis.window;
 'use strict';
 const styles=`.mechanism-observer .observation-intro{font-size:11px;line-height:1.65;margin:0 0 9px}.observation-content{padding-bottom:12px}.observation-rate{display:flex;gap:6px;margin:0 0 10px}.observation-rate button{font:inherit;font-size:11px;padding:6px 8px;border:1px solid var(--rule,#d8d1c3);border-radius:6px;background:transparent;color:var(--ink,#231e16);min-height:32px}.observation-rate button[aria-pressed=true]{background:var(--accent,#93d3b0)}.observation-rate button:active{transform:translateY(1px)}.observation-live{border-left:2px solid var(--accent,#93d3b0);padding-left:9px;margin:8px 0}.observation-live strong{font-size:12px}.observation-live p{font-size:11px;line-height:1.7;margin:4px 0 0}.observation-readouts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0 0}.observation-readouts div{border-top:1px solid var(--rule,#d8d1c3);padding-top:5px;min-width:0}.observation-readouts dt{font-size:10px;color:var(--muted,#766d5f)}.observation-readouts dd{font-size:11px;margin:2px 0 0;overflow-wrap:anywhere}.observation-speed-note{font-size:10px!important;line-height:1.6!important;margin:7px 0 0!important}.principle-explorer>.observation-content{border-top:1px dashed var(--rule,#d8d1c3);padding-top:10px}[data-observe-active=true] path[fill="none"]{stroke:#a25f35!important}.mechanism-observer summary{font-size:12px}`;
 const put=(el,text)=>{const next=String(text??'');if(el.textContent!==next)el.textContent=next;};
 function mount(options){
  if(!options.host&&!options.panel)return null;
  let style=document.getElementById('mechanism-observation-style');if(!style){style=document.createElement('style');style.id='mechanism-observation-style';style.textContent=styles;document.head.append(style);}
  const panel=options.panel||document.createElement('details');let owns=!options.panel;
  if(owns){panel.className='mechanism-observer';const summary=document.createElement('summary');summary.textContent=options.title||t('obs.title');panel.append(summary);options.host.prepend(panel);}
  const content=document.createElement('div');content.className='observation-content';panel.append(content);
  if(options.intro){const intro=document.createElement('p');intro.className='observation-intro';intro.textContent=options.intro;content.append(intro);}
  const controls=document.createElement('div');controls.className='observation-rate';controls.setAttribute('aria-label',t('obs.speed'));
  let rate=1,disposed=false,marked=[],rows=[],lastReadouts='';const rateButtons=[];
  const note=document.createElement('p');note.className='observation-speed-note';
  function clearMarks(){for(const el of marked)el.removeAttribute('data-observe-active');marked=[];}
  function setRate(next,announce=true){const value=options.slow&&panel.open&&next===.25?.25:1;if(rate===value){syncRate();return;}rate=value;options.onRate?.(rate);syncRate();if(announce)options.onChange?.();}
  function syncRate(){for(const button of rateButtons)button.setAttribute('aria-pressed',String(+button.dataset.rate===rate));put(note,rate===.25?(options.slowNote||t('obs.speedNote')):t('obs.liveNote'));}
  if(options.slow){for(const [value,label]of[[1,t('obs.normal')],[.25,t('obs.slow')]]){const button=document.createElement('button');button.type='button';button.dataset.rate=value;button.textContent=label;resourceScope.bindProperty(button,"onclick",()=>setRate(value));controls.append(button);rateButtons.push(button);}content.append(controls);}
  const live=document.createElement('div');live.className='observation-live';const stage=document.createElement('strong'),copy=document.createElement('p');stage.setAttribute('aria-live','polite');stage.setAttribute('aria-atomic','true');live.append(stage,copy);content.append(live);
  const readings=document.createElement('dl');readings.className='observation-readouts';content.append(readings,note);syncRate();
  function update(){if(disposed)return;if(!panel.open){if(marked.length)clearMarks();return;}const snapshot=options.read?.()||{};put(stage,snapshot.stage||t('obs.waiting'));put(copy,snapshot.text||'');const values=(snapshot.readouts||[]).slice(0,4),key=JSON.stringify(values);if(key!==lastReadouts){lastReadouts=key;while(rows.length>values.length)rows.pop().box.remove();values.forEach((v,i)=>{if(!rows[i]){const box=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');box.append(label,value);readings.append(box);rows.push({box,label,value});}put(rows[i].label,v.label);put(rows[i].value,v.value);});}
   const active=new Set(snapshot.active||[]),scope=options.scope||document.getElementById('fig');const nodes=scope?.querySelectorAll('[data-observe-part]')||[];marked=[];for(const el of nodes){const on=el.dataset.observePart.split(/\s+/).some(id=>active.has(id));if(on){if(el.dataset.observeActive!=='true')el.dataset.observeActive='true';marked.push(el);}else el.removeAttribute('data-observe-active');}
  }
  const toggle=()=>{if(!panel.open){setRate(1,false);clearMarks();}update();options.onChange?.();if(panel.open){const host=options.host||panel.parentElement;if(host&&host.scrollHeight>host.clientHeight)host.scrollTop+=panel.getBoundingClientRect().top-host.getBoundingClientRect().top;}};
  resourceScope.listen(panel,'toggle',toggle);
  const hidden=()=>{if(document.hidden)setRate(1,false);};document.addEventListener('visibilitychange',hidden);
  const leave=()=>{setRate(1,false);clearMarks();};resourceScope.listen(window,'pagehide',leave);
  const api={get rate(){return rate},get open(){return panel.open},panel,update,reset(){setRate(1,false);update();},dispose(){if(disposed)return;leave();disposed=true;panel.removeEventListener('toggle',toggle);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',leave);owns?panel.remove():content.remove();}};resourceScope.onCleanup(()=>api.dispose());return api;
 }

 // Optional phase card: owns only presentation, never a mechanism timer.
 // Existing scene actions and the scene-owned read() remain the source of truth.
 function mountLesson(options){
  const {ui,id}=options,observer=ui.observation,panel=observer?.panel;
  const content=panel?.querySelector('.observation-content');if(!content)return null;
  if(!document.getElementById('mechanism-lesson-style')){const style=document.createElement('style');style.id='mechanism-lesson-style';style.textContent=".mechanism-lesson{margin:8px 0 10px;border:1px dashed var(--rule,#d8d1c3);border-radius:7px;padding:8px}.mechanism-lesson>summary{font-size:11px!important;font-weight:600;padding:4px 0}.mechanism-lesson-body{padding-top:8px}.mechanism-lesson-route{display:flex;gap:4px;margin-bottom:5px}.mechanism-lesson-route span{flex:1;text-align:center;font-size:10px;padding:3px 0;border:1px solid var(--rule,#d8d1c3);border-radius:4px;color:var(--muted,#766d5f)}.mechanism-lesson-route [data-done=true]{background:#e7e4d8}.mechanism-lesson-route [aria-current=step]{background:var(--accent,#93d3b0);color:var(--ink,#231e16);border-color:currentColor}.mechanism-lesson-title{font-size:12px}.mechanism-lesson p{font-size:11px;line-height:1.65;margin:5px 0}.mechanism-lesson .mechanism-lesson-look{color:#8a5638;font-size:10px}.mechanism-lesson button{font:inherit;font-size:11px;min-height:32px;border:1px solid var(--rule,#d8d1c3);border-radius:5px;padding:5px 8px;color:var(--ink,#231e16);background:var(--paper,#f5f1e8);width:100%;margin-top:5px}.mechanism-lesson button:active{transform:translateY(1px)}.mechanism-lesson .mechanism-lesson-go{background:var(--accent,#93d3b0)}.mechanism-lesson button:disabled,.mechanism-lesson button[aria-disabled=true]{opacity:.55}.mechanism-lesson .mechanism-lesson-exit{border:0;text-decoration:underline;background:transparent;font-size:10px}.mechanism-lesson .mechanism-lesson-note{color:var(--muted,#766d5f);font-size:10px}.mechanism-lesson[open]~.observation-live{display:none}.play-dock.lesson-guiding{overflow:auto;scrollbar-width:thin;padding-right:5px!important}.lesson-guiding>.mechanism-lesson{flex:0 0 auto;margin:0 0 8px}.lesson-guiding>.mechanism-lesson .mechanism-lesson-body{padding-top:3px}.lesson-guiding>.mechanism-lesson .mechanism-lesson-note{margin-bottom:0}.lesson-guiding>.lesson-free-controls{flex:0 0 auto}.lesson-guiding>.dock-extras{overflow:visible;flex:0 0 auto;min-height:0}.lesson-free-controls>summary{padding:9px 0}.lesson-free-controls[open]>.actions{margin-top:6px!important}@media(max-width:760px){.play-dock.lesson-guiding{overflow:visible;max-height:none;height:auto;padding-right:0!important}}.mechanism-lesson-choices{display:grid;grid-template-columns:1fr 1fr;gap:4px}.mechanism-lesson-choices:empty{display:none}";document.head.append(style);}
  const guide=document.createElement('details');guide.className=`mechanism-lesson ${id}-guide`;
  const summary=document.createElement('summary');summary.textContent=options.title||t('obs.stepTitle');guide.append(summary);
  const body=document.createElement('div');body.className=`mechanism-lesson-body ${id}-guide-body`;guide.append(body);
  function el(tag,name){const n=document.createElement(tag);n.className=`mechanism-lesson-${name} ${id}-guide-${name}`;body.append(n);return n;}
  const route=el('div','route');route.setAttribute('aria-label',t('obs.stage'));
  const dots=(options.route||[]).map(label=>{const n=document.createElement('span');n.textContent=label;route.append(n);return n;});
  const title=el('strong','title');title.setAttribute('aria-live','polite');
  const reason=el('p','reason'),go=el('button','go'),choices=el('div','choices'),hold=el('button','hold'),look=el('p','look'),exit=el('button','exit'),note=el('p','note');
  go.type=hold.type=exit.type='button';hold.textContent=t('obs.pauseStep');exit.textContent=options.exitLabel||t('obs.exitStep');note.textContent=options.note||'';note.hidden=!options.note;
  content.insertBefore(guide,content.firstChild);
  const primary=document.getElementById('btns'),dock=primary?.parentElement;
  const free=document.createElement('details');free.className=`lesson-free-controls ${id}-free-controls`;const freeTitle=document.createElement('summary');freeTitle.textContent=t('obs.freePlay');free.append(freeTitle);
  let disposed=false,choiceRows=[],lastChoices='';
  function place(on){if(dock&&primary){if(on&&guide.parentElement!==dock){guide.remove();dock.insertBefore(guide,primary);dock.insertBefore(free,primary);primary.remove();free.append(primary);dock.classList.add('lesson-guiding',`${id}-guiding`);summary.focus?.({preventScroll:true});dock.scrollTop=0;}else if(!on&&guide.parentElement===dock){const restoreFocus=guide.contains?.(document.activeElement);primary.remove();dock.insertBefore(primary,free);free.remove();free.open=false;guide.remove();content.insertBefore(guide,content.firstChild);dock.classList.remove('lesson-guiding',`${id}-guiding`);if(restoreFocus&&!disposed){const target=panel.open?summary:panel.querySelector('summary');target?.focus?.({preventScroll:true});target?.scrollIntoView?.({block:'nearest'});}}}for(const selector of ['.observation-live','.observation-intro']){const node=content.querySelector(selector);if(node)node.hidden=on;}}
  function update(){if(disposed||!panel.open||!guide.open||document.hidden)return;const focused=document.activeElement,ownedFocus=focused===go||focused===hold||choiceRows.includes(focused);const step=options.read()||{};put(title,(options.linear===false?t('obs.current'):step.completed?t('obs.done'):String(step.index+1)+' / '+dots.length)+' · '+step.title);put(reason,step.text);put(look,step.look?t('obs.lookHere')+' '+step.look:'');look.hidden=!step.look;put(go,step.label);go.hidden=!step.label;go.setAttribute('aria-disabled',String(!!step.busy));
   hold.hidden=!(options.onPause&&(step.pauseVisible??step.busy));
   dots.forEach((dot,i)=>{dot.dataset.done=String(options.linear!==false&&(!!step.completed||i<step.index));if(i===step.index)dot.setAttribute('aria-current','step');else dot.removeAttribute('aria-current');});
   const values=step.choices||[],key=JSON.stringify(values);if(key!==lastChoices){lastChoices=key;while(choiceRows.length>values.length)choiceRows.pop().remove();values.forEach((value,i)=>{let button=choiceRows[i];if(!button){button=document.createElement('button');button.type='button';choices.append(button);choiceRows.push(button);resourceScope.bindProperty(button,"onclick",()=>{const current=(options.read()?.choices||[]).find(x=>String(x.id)===button.dataset.choice);if(!current||current.disabled||!guide.open||disposed)return;options.onChoice?.(current.id);update();});}button.dataset.choice=String(value.id);put(button,value.label);button.disabled=!!value.disabled;button.title=value.hint||'';});}choices.hidden=!values.length;
   if(ownedFocus&&(focused.hidden||focused.disabled||(focused!==go&&focused!==hold&&!choiceRows.includes(focused)))){const target=choiceRows.find(b=>!b.disabled)||(!go.hidden?go:summary);target.focus?.({preventScroll:true});}
  }
  resourceScope.bindProperty(go,"onclick",()=>{if(disposed||!guide.open)return;const step=options.read();if(!step||step.busy||!step.label)return;options.onAdvance?.();update();});
  resourceScope.bindProperty(hold,"onclick",()=>{if(disposed||!guide.open||hold.hidden)return;options.onPause?.();update();(go.hidden?summary:go).focus?.({preventScroll:true});});
  const toggle=()=>{const on=guide.open&&panel.open;options.onToggle?.(on);place(on);update();};
  const close=()=>{guide.open=false;options.onToggle?.(false);place(false);const target=panel.open?summary:panel.querySelector('summary');target?.focus?.({preventScroll:true});target?.scrollIntoView?.({block:'nearest'});};resourceScope.bindProperty(exit,"onclick",close);
  resourceScope.listen(guide,'toggle',toggle);
  const parentToggle=()=>{if(!panel.open){guide.open=false;options.onToggle?.(false);place(false);}update();};resourceScope.listen(panel,'toggle',parentToggle);
  const previous=observer.update;const wrapped=()=>{previous();update();};observer.update=wrapped;
  const previousDispose=observer.dispose;observer.dispose=()=>{if(disposed)return;disposed=true;guide.removeEventListener('toggle',toggle);panel.removeEventListener('toggle',parentToggle);place(false);guide.remove();if(observer.update===wrapped)observer.update=previous;previousDispose?.();};
  return {panel:guide,update,close};
 }

 return Object.freeze({mount,mountLesson});
}
