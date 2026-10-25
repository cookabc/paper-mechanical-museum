import {scopedDocument} from '../app/scoped-dom';
export function arrangePlayDock(context,cfg,ui,items,id){const {root,scope,audio,observation}=context;const document=scopedDocument(root,scope);const window={MechanicalAudio:audio,MuseumObservation:observation};
 const stage=document.querySelector('.stage'),actions=document.getElementById('btns'),readout=document.getElementById('readout'),settings=document.querySelector('.controls'),stats=document.getElementById('stats');
 const layout=document.createElement('main');layout.className='play-layout';const dock=document.createElement('aside');dock.className='play-dock';dock.setAttribute('aria-label','操作与设置');root.prepend(layout);layout.append(dock,stage);
 const dockTitle=document.createElement('p');dockTitle.className='dock-title';dockTitle.textContent=cfg.hint||'从第一步开始，动手试试。';dock.append(dockTitle,readout);readout.setAttribute('aria-live','polite');if(stats)dock.append(stats);if(actions){actions.querySelector('.cap')?.remove();dock.append(actions);}
 const extras=document.createElement('section');extras.className='dock-extras';extras.setAttribute('aria-label','外观、玩法和更多作品');extras.tabIndex=0;dock.append(extras);
 if(cfg.exploration){
  const exp=cfg.exploration,panel=document.createElement('details');panel.className='principle-explorer';
  const summary=document.createElement('summary');summary.textContent=exp.title||'看懂它怎么动';panel.append(summary);
  const intro=document.createElement('p');intro.className='principle-intro';intro.textContent=exp.intro;panel.append(intro);
  const choices=document.createElement('div');choices.className='principle-parts';choices.setAttribute('aria-label','选择观察部件');panel.append(choices);
  const note=document.createElement('div');note.className='principle-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.setAttribute('aria-atomic','true');
  const title=document.createElement('strong'),copy=document.createElement('p');note.append(title,copy);panel.append(note);
  for(const part of exp.parts){const button=document.createElement('button');button.type='button';button.dataset.part=part.id;button.textContent=part.label;button.setAttribute('aria-pressed','false');scope.bindProperty(button,"onclick",()=>{exp.onSelect?.(ui.st,part.id,ui);ui.render();});choices.append(button);}
  ui.updateExploration=()=>{if(!panel.open)return;const description=exp.describe(ui.st,ui.st.inspectPart)||{};if(title.textContent!==description.title)title.textContent=description.title||'';if(copy.textContent!==description.text)copy.textContent=description.text||'';for(const button of choices.children)button.setAttribute('aria-pressed',String(button.dataset.part===ui.st.inspectPart));};
  scope.listen(panel,'toggle',()=>{exp.onToggle?.(ui.st,panel.open,ui);ui.render();if(panel.open)extras.scrollTop+=panel.getBoundingClientRect().top-extras.getBoundingClientRect().top;});extras.append(panel);
 }
 if(cfg.observation&&window.MuseumObservation){const ob=cfg.observation;ui.observation=window.MuseumObservation.mount({host:extras,panel:cfg.exploration?extras.querySelector('.principle-explorer'):null,title:ob.title,intro:ob.intro,slow:ob.slow,slowNote:ob.slowNote,read:()=>ob.read(ui.st),onRate:rate=>{ui.simulationRate=rate;window.MechanicalAudio?.setRate?.(rate);},onChange:()=>ui.render()});}
 const prefs=document.createElement('details');prefs.innerHTML='<summary>外观与视角</summary>';prefs.append(settings);extras.append(prefs);
 const help=document.createElement('details');help.innerHTML=`<summary>怎么玩 · 制作原理</summary><p>${cfg.help||'直接点击机器上的按钮和部件，也可使用上方操作。拖动画面空白处旋转视角，双击空白处回到正面。'}</p><p>键盘：Tab 聚焦模型或部件，方向键调整视角；Enter 或空格操作当前部件。</p><p>${cfg.idea||'几何形状经过投影，成为纸上的立体机器。动作由状态驱动，只有需要时才重绘。'}</p>`;extras.append(help);
 const more=document.createElement('details');more.innerHTML='<summary>逛逛其他小机器</summary><nav class="object-nav">'+items.map(x=>`<a class="${x.id===id?'current':''}" href="${'#/'+x.id}">${x.name}</a>`).join('')+'</nav>';extras.append(more);
 const note=document.createElement('p');note.className='stage-note';note.textContent='拖动空白旋转观察 · 点击机器部件操作';stage.append(note);document.getElementById('fig').setAttribute('aria-label',cfg.title+'，可点击部件并拖动旋转');
 const hint=document.createElement('p');hint.className='extras-scroll-hint';dock.append(hint);const overflow=()=>hint.textContent=extras.scrollHeight>extras.clientHeight+2?'设置区可上下滚动 ↕':'';for(const d of extras.querySelectorAll('details'))scope.listen(d,'toggle',overflow);scope.listen(globalThis.window,'resize',overflow);scope.timeout(overflow,200);
 document.querySelector('.idea')?.remove();cfg.setup?.(ui);ui.render();
}
