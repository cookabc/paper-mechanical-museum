const ITEMS=[
{id:'washer',name:'洗衣机',verb:'装入衣物，观察滚筒与泡沫。',url:'../../washer-study/dist/'},
{id:'fan',name:'电风扇',verb:'调节风速，让风吹过纸面。',url:'../../fan-study/dist/'},
{id:'claw',name:'抓娃娃机',verb:'摇杆瞄准，下爪带走快乐。',url:'../../claw-studio/dist/'},
{id:'coffee',name:'咖啡机',verb:'从咖啡豆到一杯温热的拿铁。'},
{id:'musicbox',name:'手摇八音盒',verb:'转动手柄，让小小音符醒来。'},
{id:'vending',name:'自动售货机',verb:'投入代币，挑选一份好心情。'},
{id:'toaster',name:'烤面包机',verb:'压下拉杆，等一声香脆的弹跳。'},
{id:'turntable',name:'唱片机',verb:'放下唱臂，让唱片缓缓转动。'},
{id:'camera',name:'拍立得相机',verb:'按下快门，等一张风景显影。'},
{id:'elevator',name:'电梯',verb:'选择楼层，看轿厢穿梭上下。'}];
const selected=location.hash.slice(1),item=ITEMS.find(x=>x.id===selected);
const href=x=>x.url||'#'+x.id;
function header(title,sub,back){return `<header><div><p class="eyebrow">纸上机械馆 · 十件小玩具</p><h1>${title}</h1></div>${back?'<a class="gallery-link" href="#">全部作品 ↗</a>':`<span>${sub}</span>`}</header>`;}
function renderGallery(){ window.renderMuseumHome(ITEMS); }
if(!item||item.url){renderGallery();}else if(!window.SCENES[item.id]){renderGallery();}else{
 document.body.className='museum-scene';
 const cfg=window.SCENES[item.id]();cfg.credit=false;cfg.buttonsLabel='动手试试';
 const ui=mountFigure(cfg);window.__ui=ui;window.__cfg=cfg;
 const oldHeader=document.querySelector('header');oldHeader.outerHTML=header(cfg.title,cfg.hint,true);
 const stage=document.querySelector('.stage'),actions=document.getElementById('btns'),readout=document.getElementById('readout'),settings=document.querySelector('.controls'),stats=document.getElementById('stats');
 const layout=document.createElement('main');layout.className='play-layout';const dock=document.createElement('aside');dock.className='play-dock';dock.setAttribute('aria-label','操作与设置');document.querySelector('header').after(layout);layout.append(dock,stage);
 const dockTitle=document.createElement('p');dockTitle.className='dock-title';dockTitle.textContent=cfg.hint||'从第一步开始，动手试试。';dock.append(dockTitle,readout);readout.setAttribute('aria-live','polite');if(stats)dock.append(stats);if(actions){actions.querySelector('.cap')?.remove();dock.append(actions);}
 const extras=document.createElement('section');extras.className='dock-extras';extras.setAttribute('aria-label','外观、玩法和更多作品');extras.tabIndex=0;dock.append(extras);
 if(cfg.exploration){
  const exp=cfg.exploration,panel=document.createElement('details');panel.className='principle-explorer';
  const summary=document.createElement('summary');summary.textContent=exp.title||'看懂它怎么动';panel.append(summary);
  const intro=document.createElement('p');intro.className='principle-intro';intro.textContent=exp.intro;panel.append(intro);
  const choices=document.createElement('div');choices.className='principle-parts';choices.setAttribute('aria-label','选择观察部件');panel.append(choices);
  const note=document.createElement('div');note.className='principle-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.setAttribute('aria-atomic','true');
  const title=document.createElement('strong'),copy=document.createElement('p');note.append(title,copy);panel.append(note);
  for(const part of exp.parts){const button=document.createElement('button');button.type='button';button.dataset.part=part.id;button.textContent=part.label;button.setAttribute('aria-pressed','false');button.onclick=()=>{exp.onSelect?.(ui.st,part.id,ui);ui.render();};choices.append(button);}
  ui.updateExploration=()=>{if(!panel.open)return;const description=exp.describe(ui.st,ui.st.inspectPart)||{};if(title.textContent!==description.title)title.textContent=description.title||'';if(copy.textContent!==description.text)copy.textContent=description.text||'';for(const button of choices.children)button.setAttribute('aria-pressed',String(button.dataset.part===ui.st.inspectPart));};
  panel.addEventListener('toggle',()=>{exp.onToggle?.(ui.st,panel.open,ui);ui.render();if(panel.open)extras.scrollTop+=panel.getBoundingClientRect().top-extras.getBoundingClientRect().top;});extras.append(panel);
 }
 if(cfg.observation&&window.MuseumObservation){const ob=cfg.observation;ui.observation=window.MuseumObservation.mount({host:extras,panel:cfg.exploration?extras.querySelector('.principle-explorer'):null,title:ob.title,intro:ob.intro,slow:ob.slow,slowNote:ob.slowNote,read:()=>ob.read(ui.st),onRate:rate=>{ui.simulationRate=rate;window.MechanicalAudio?.setRate?.(rate);},onChange:()=>ui.render()});}
 const prefs=document.createElement('details');prefs.innerHTML='<summary>外观与视角</summary>';prefs.append(settings);extras.append(prefs);
 const help=document.createElement('details');help.innerHTML=`<summary>怎么玩 · 制作原理</summary><p>${cfg.help||'直接点击机器上的按钮和部件，也可使用上方操作。拖动画面空白处旋转视角，双击空白处回到正面。'}</p><p>键盘：Tab 聚焦模型或部件，方向键调整视角；Enter 或空格操作当前部件。</p><p>${cfg.idea||'几何形状经过投影，成为纸上的立体机器。动作由状态驱动，只有需要时才重绘。'}</p>`;extras.append(help);
 const more=document.createElement('details');more.innerHTML='<summary>逛逛其他小机器</summary><nav class="object-nav">'+ITEMS.map(x=>`<a class="${x.id===item.id?'current':''}" href="${href(x)}">${x.name}</a>`).join('')+'</nav>';extras.append(more);
 const note=document.createElement('p');note.className='stage-note';note.textContent='拖动空白旋转观察 · 点击机器部件操作';stage.append(note);document.getElementById('fig').setAttribute('aria-label',cfg.title+'，可点击部件并拖动旋转');
 const hint=document.createElement('p');hint.className='extras-scroll-hint';dock.append(hint);const overflow=()=>hint.textContent=extras.scrollHeight>extras.clientHeight+2?'设置区可上下滚动 ↕':'';for(const d of extras.querySelectorAll('details'))d.addEventListener('toggle',overflow);addEventListener('resize',overflow);setTimeout(overflow,200);
 document.querySelector('.idea')?.remove();cfg.setup?.(ui);ui.render();
}
// Reload only on scene changes: old animation/audio/event listeners are disposed by navigation.
addEventListener('hashchange',()=>{
 const next=location.hash.slice(1);
 if(next===selected)return;
 // Home section anchors are not scene routes; don't reload for an in-page jump.
 if(!item && ['','collection','about'].includes(next))return;
 location.reload();
});
// A scene always opens at its own top, never at a gallery scroll offset.
if(item&&!item.url){
 history.scrollRestoration='manual';
 const startAtTop=()=>requestAnimationFrame(()=>window.scrollTo(0,0));
 window.scrollTo(0,0);
 addEventListener('load',startAtTop,{once:true});
 addEventListener('pageshow',startAtTop);
}
