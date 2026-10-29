import {detectLang,translator} from './i18n';
// Dock copy is generated when the dock is built, so resolve it once per build.
const t=translator(detectLang());
import {scopedDocument} from '../app/scoped-dom';
export function arrangePlayDock(context,cfg,ui,items,id){const {root,scope,audio,observation}=context;items=context.catalog||items;const document=scopedDocument(root,scope);const window={MechanicalAudio:audio,MuseumObservation:observation};
 const stage=document.querySelector('.stage'),actions=document.getElementById('btns'),readout=document.getElementById('readout'),settings=document.querySelector('.controls'),stats=document.getElementById('stats');
 const layout=document.createElement('main');layout.className='play-layout';const dock=document.createElement('aside');dock.className='play-dock';dock.setAttribute('aria-label',t('dock.controls'));root.prepend(layout);layout.append(dock,stage);
 const dockTitle=document.createElement('p');dockTitle.className='dock-title';dockTitle.textContent=cfg.hint||t('dock.startHint');dock.append(dockTitle,readout);readout.setAttribute('aria-live','polite');if(stats)dock.append(stats);if(actions){actions.querySelector('.cap')?.remove();dock.append(actions);}
 const extras=document.createElement('section');extras.className='dock-extras';extras.setAttribute('aria-label',t('dock.appearance'));extras.tabIndex=0;dock.append(extras);
 if(cfg.exploration){
  const exp=cfg.exploration,panel=document.createElement('details');panel.className='principle-explorer';
  const summary=document.createElement('summary');summary.textContent=exp.title||t('dock.seeHow');panel.append(summary);
  const intro=document.createElement('p');intro.className='principle-intro';intro.textContent=exp.intro;panel.append(intro);
  const choices=document.createElement('div');choices.className='principle-parts';choices.setAttribute('aria-label',t('dock.pickPart'));panel.append(choices);
  const note=document.createElement('div');note.className='principle-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.setAttribute('aria-atomic','true');
  const title=document.createElement('strong'),copy=document.createElement('p');note.append(title,copy);panel.append(note);
  for(const part of exp.parts){const button=document.createElement('button');button.type='button';button.dataset.part=part.id;button.textContent=part.label;button.setAttribute('aria-pressed','false');scope.bindProperty(button,"onclick",()=>{exp.onSelect?.(ui.st,part.id,ui);ui.render();});choices.append(button);}
  ui.updateExploration=()=>{if(!panel.open)return;const description=exp.describe(ui.st,ui.st.inspectPart)||{};if(title.textContent!==description.title)title.textContent=description.title||'';if(copy.textContent!==description.text)copy.textContent=description.text||'';for(const button of choices.children)button.setAttribute('aria-pressed',String(button.dataset.part===ui.st.inspectPart));};
  scope.listen(panel,'toggle',()=>{exp.onToggle?.(ui.st,panel.open,ui);ui.render();if(panel.open)extras.scrollTop+=panel.getBoundingClientRect().top-extras.getBoundingClientRect().top;});extras.append(panel);
 }
 if(cfg.observation&&window.MuseumObservation){const ob=cfg.observation;ui.observation=window.MuseumObservation.mount({host:extras,panel:cfg.exploration?extras.querySelector('.principle-explorer'):null,title:ob.title,intro:ob.intro,slow:ob.slow,slowNote:ob.slowNote,read:()=>ob.read(ui.st),onRate:rate=>{ui.simulationRate=rate;window.MechanicalAudio?.setRate?.(rate);},onChange:()=>ui.render()});}
 const prefs=document.createElement('details');prefs.innerHTML='<summary>'+t('dock.viewLabel')+'</summary>';prefs.append(settings);extras.append(prefs);
 const help=document.createElement('details');help.innerHTML=`<summary>${t('dock.howToTitle')}</summary><p>${cfg.help||t('dock.howToBody')}</p><p>${t('dock.keyboardBody')}</p><p>${cfg.idea||t('dock.geometryBody')}</p>`;extras.append(help);
 const more=document.createElement('details');more.innerHTML='<summary>'+t('dock.otherWorks')+'</summary><nav class="object-nav">'+items.map(x=>`<a class="${x.id===id?'current':''}" href="${'#/'+x.id}">${x.name}</a>`).join('')+'</nav>';extras.append(more);
 const note=document.createElement('p');note.className='stage-note';note.textContent=t('dock.gestureHint');stage.append(note);document.getElementById('fig').setAttribute('aria-label',cfg.title+', '+t('dock.clickableHint'));
 const hint=document.createElement('p');hint.className='extras-scroll-hint';dock.append(hint);const overflow=()=>hint.textContent=extras.scrollHeight>extras.clientHeight+2?t('dock.scrollHint'):'';for(const d of extras.querySelectorAll('details'))scope.listen(d,'toggle',overflow);scope.listen(globalThis.window,'resize',overflow);scope.timeout(overflow,200);
 document.querySelector('.idea')?.remove();cfg.setup?.(ui);ui.render();
}
