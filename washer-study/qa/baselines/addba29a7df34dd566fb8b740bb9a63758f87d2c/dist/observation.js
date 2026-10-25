/* Optional, state-backed mechanism observation. No timer, animation loop or
 * independent progress: each owner calls update after advancing its own state. */
(()=>{
 'use strict';
 if(window.MuseumObservation)return;
 const styles=`.mechanism-observer .observation-intro{font-size:11px;line-height:1.65;margin:0 0 9px}.observation-content{padding-bottom:12px}.observation-rate{display:flex;gap:6px;margin:0 0 10px}.observation-rate button{font:inherit;font-size:11px;padding:6px 8px;border:1px solid var(--rule,#d8d1c3);border-radius:6px;background:transparent;color:var(--ink,#231e16);min-height:32px}.observation-rate button[aria-pressed=true]{background:var(--accent,#93d3b0)}.observation-rate button:active{transform:translateY(1px)}.observation-live{border-left:2px solid var(--accent,#93d3b0);padding-left:9px;margin:8px 0}.observation-live strong{font-size:12px}.observation-live p{font-size:11px;line-height:1.7;margin:4px 0 0}.observation-readouts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0 0}.observation-readouts div{border-top:1px solid var(--rule,#d8d1c3);padding-top:5px;min-width:0}.observation-readouts dt{font-size:10px;color:var(--muted,#766d5f)}.observation-readouts dd{font-size:11px;margin:2px 0 0;overflow-wrap:anywhere}.observation-speed-note{font-size:10px!important;line-height:1.6!important;margin:7px 0 0!important}.principle-explorer>.observation-content{border-top:1px dashed var(--rule,#d8d1c3);padding-top:10px}[data-observe-active=true] path[fill="none"]{stroke:#a25f35!important}.mechanism-observer summary{font-size:12px}`;
 const put=(el,text)=>{const next=String(text??'');if(el.textContent!==next)el.textContent=next;};
 function mount(options){
  if(!options.host&&!options.panel)return null;
  let style=document.getElementById('mechanism-observation-style');if(!style){style=document.createElement('style');style.id='mechanism-observation-style';style.textContent=styles;document.head.append(style);}
  const panel=options.panel||document.createElement('details');let owns=!options.panel;
  if(owns){panel.className='mechanism-observer';const summary=document.createElement('summary');summary.textContent=options.title||'看动作懂原理';panel.append(summary);options.host.prepend(panel);}
  const content=document.createElement('div');content.className='observation-content';panel.append(content);
  if(options.intro){const intro=document.createElement('p');intro.className='observation-intro';intro.textContent=options.intro;content.append(intro);}
  const controls=document.createElement('div');controls.className='observation-rate';controls.setAttribute('aria-label','观察速度');
  let rate=1,disposed=false,marked=[],rows=[],lastReadouts='';const rateButtons=[];
  const note=document.createElement('p');note.className='observation-speed-note';
  function clearMarks(){for(const el of marked)el.removeAttribute('data-observe-active');marked=[];}
  function setRate(next,announce=true){const value=options.slow&&panel.open&&next===.25?.25:1;if(rate===value){syncRate();return;}rate=value;options.onRate?.(rate);syncRate();if(announce)options.onChange?.();}
  function syncRate(){for(const button of rateButtons)button.setAttribute('aria-pressed',String(+button.dataset.rate===rate));put(note,rate===.25?(options.slowNote||'动作按 ¼ 速观察；镜头与操作仍即时响应。'):'直接操作机器，说明与部件提示会跟随当前动作。');}
  if(options.slow){for(const [value,label]of[[1,'正常速度'],[.25,'¼ 速慢看']]){const button=document.createElement('button');button.type='button';button.dataset.rate=value;button.textContent=label;button.onclick=()=>setRate(value);controls.append(button);rateButtons.push(button);}content.append(controls);}
  const live=document.createElement('div');live.className='observation-live';const stage=document.createElement('strong'),copy=document.createElement('p');stage.setAttribute('aria-live','polite');stage.setAttribute('aria-atomic','true');live.append(stage,copy);content.append(live);
  const readings=document.createElement('dl');readings.className='observation-readouts';content.append(readings,note);syncRate();
  function update(){if(disposed)return;if(!panel.open){if(marked.length)clearMarks();return;}const snapshot=options.read?.()||{};put(stage,snapshot.stage||'等待下一次操作');put(copy,snapshot.text||'');const values=(snapshot.readouts||[]).slice(0,4),key=JSON.stringify(values);if(key!==lastReadouts){lastReadouts=key;while(rows.length>values.length)rows.pop().box.remove();values.forEach((v,i)=>{if(!rows[i]){const box=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');box.append(label,value);readings.append(box);rows.push({box,label,value});}put(rows[i].label,v.label);put(rows[i].value,v.value);});}
   const active=new Set(snapshot.active||[]),scope=options.scope||document.getElementById('fig');const nodes=scope?.querySelectorAll('[data-observe-part]')||[];marked=[];for(const el of nodes){const on=el.dataset.observePart.split(/\s+/).some(id=>active.has(id));if(on){if(el.dataset.observeActive!=='true')el.dataset.observeActive='true';marked.push(el);}else el.removeAttribute('data-observe-active');}
  }
  const toggle=()=>{if(!panel.open){setRate(1,false);clearMarks();}update();options.onChange?.();if(panel.open){const host=options.host||panel.parentElement;if(host&&host.scrollHeight>host.clientHeight)host.scrollTop+=panel.getBoundingClientRect().top-host.getBoundingClientRect().top;}};
  panel.addEventListener('toggle',toggle);
  const hidden=()=>{if(document.hidden)setRate(1,false);};document.addEventListener('visibilitychange',hidden);
  const leave=()=>{setRate(1,false);clearMarks();};window.addEventListener('pagehide',leave);
  const api={get rate(){return rate},get open(){return panel.open},panel,update,reset(){setRate(1,false);update();},dispose(){if(disposed)return;leave();disposed=true;panel.removeEventListener('toggle',toggle);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',leave);owns?panel.remove():content.remove();}};return api;
 }
 window.MuseumObservation=Object.freeze({mount});
})();
