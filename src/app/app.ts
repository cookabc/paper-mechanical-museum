import { ResourceScope } from './scope';
import type { SceneController, SceneContext } from './contracts';
import {createAudioService} from '../shared/audio.js';
import {createObservation} from '../shared/observation.js';
import {mountCoffee} from '../exhibits/coffee/index.js';
import {mountFan} from '../exhibits/fan/index.js';
import {mountCamera} from '../exhibits/camera/index.js';
import {mountVending} from '../exhibits/vending/index.js';
import {mountToaster} from '../exhibits/toaster/index.js';
import {mountMusicbox} from '../exhibits/musicbox/index.js';
import {mountTurntable} from '../exhibits/turntable/index.js';
import {mountElevator} from '../exhibits/elevator/index.js';
import {mountWasher} from '../exhibits/washer/index.js';
import {mountClaw} from '../exhibits/claw/index.js';
import {mountBicycle} from '../exhibits/bicycle';
import {mountGenerator} from '../exhibits/generator';
import {renderHome} from './home.js';
import {detectLang,translator} from '../shared/i18n';
import {mountLearningEntry} from '../shared/learning-entry';
import {catalog as items} from './catalog';
import {bindLanguageSwitch,createExhibitHeader,mountExhibitPresentation} from './exhibit-presentation';
// Titles follow the interface language; the Chinese name is the fallback.
const nameFor=(id:string,lang:'en'|'zh')=>{
 const entry=items.find(item=>item.id===id) as unknown as Record<string,string>|undefined;
 if(!entry)return '';
 return lang==='zh'?(entry.name??''):(entry.nameEn||entry.name||'');
};
const adapters:Record<string,(context:SceneContext)=>SceneController>={coffee:mountCoffee,fan:mountFan,camera:mountCamera,vending:mountVending,toaster:mountToaster,musicbox:mountMusicbox,turntable:mountTurntable,elevator:mountElevator,washer:mountWasher,claw:mountClaw,bicycle:mountBicycle,generator:mountGenerator};
export function createApp(root:HTMLElement){
 const appScope=new ResourceScope();const audio=createAudioService(appScope);
 let lang0=detectLang(),tr=translator(lang0);
 // The switch rebuilds the route, so re-read the language on every navigate.
 const syncLang=()=>{lang0=detectLang();tr=translator(lang0);document.documentElement.lang=lang0;};
 const previousRestoration=history.scrollRestoration;history.scrollRestoration='manual';
 appScope.onCleanup(()=>{history.scrollRestoration=previousRestoration;});
 const startAtTop=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
 let current:SceneController|null=null,sceneScope:ResourceScope|null=null,id='',disposed=false;
 function navigate(next:string){
  syncLang();
  if(disposed)return;next=next.replace(/^#?\/?/,'').split(/[?&]/)[0];
  if(current&&next===id)return;
  current?.dispose();sceneScope?.dispose();current=null;sceneScope=new ResourceScope();id=next;
  root.replaceChildren();root.className='';document.body.className=next?'museum-scene':'museum-home';
  if(!next){renderHome(root,sceneScope,items,Object.keys(adapters));startAtTop();return;}
  document.title=(nameFor(next,lang0)||tr('exhibit.unknown'))+' · '+tr('brand.name');
  const header=createExhibitHeader(next);root.append(header);
  // A language change rebuilds the whole scene, because exhibit chrome is
  // generated as markup rather than patched in place.
  bindLanguageSwitch(sceneScope,()=>{root.replaceChildren();navigate('');if(next)navigate(next);});
  const host=document.createElement('section');host.className='scene-root';host.setAttribute('aria-label',tr('exhibit.sceneLabel'));root.append(host);
  const mount=adapters[next];
  if(!mount){host.innerHTML=`<div class="migration-note"><h2>${tr('exhibit.missingTitle')}</h2><p>${tr('exhibit.missingBody')}</p><a href="#/">${tr('exhibit.missingLink')}</a></div>`;startAtTop();return;}
  try{current=mount({root:host,scope:sceneScope,audio,observation:createObservation(host,sceneScope),catalog:items.filter(item=>adapters[item.id])});}
  catch(error){sceneScope.dispose();host.textContent=tr('exhibit.loadFailed');throw error;}
  mountLearningEntry(host,sceneScope,next);
  mountExhibitPresentation(host,items.find(item=>item.id===next));
  document.title=(nameFor(next,lang0)||tr('exhibit.unknown'))+' · '+tr('brand.name');
  if(document.hidden)current.pause('hidden');
  header.querySelector('h1')?.focus({preventScroll:true});startAtTop();
 }
 // Keep this boundary aligned with responsive-scene.css's stage-first layout.
 const fixedDesktop=()=>window.innerWidth>960&&window.innerHeight>480;
 let wasFixedDesktop=fixedDesktop();
 appScope.listen(window,'resize',()=>{
  const fixed=fixedDesktop();
  // Only a shell transition transfers scrolling between the page and the dock.
  // Keep focus and machine state; ordinary resizes must not move either scroller.
  if(fixed!==wasFixedDesktop&&current){
   if(fixed)startAtTop();
   const focused=document.activeElement;
   const dock=focused instanceof Element?focused.closest<HTMLElement>('.play-dock'):null;
   if(dock&&root.contains(dock)){
    const target=focused!.getBoundingClientRect();
    if(fixed){
     const viewport=dock.getBoundingClientRect(),top=viewport.top+dock.clientTop,bottom=top+dock.clientHeight;
     // Reveal an escaped control in the new dock viewport, including its ring.
     // Already-visible focus keeps the exact dock scroll position.
     if(viewport.height>0&&dock.clientHeight>0&&target.height>0){
      const delta=target.top<top?target.top-top-6:target.bottom>bottom?target.bottom-bottom+6:0;
      if(delta)dock.scrollTop=Math.max(0,dock.scrollTop+delta);
     }
    }else if(target.height>0){
     // The same control can move far down the document when the stage stacks.
     // Move only the page, and only enough to keep that existing focus visible.
     const delta=target.top<0?target.top-6:target.bottom>window.innerHeight?target.bottom-window.innerHeight+6:0;
     if(delta)window.scrollTo({top:Math.max(0,window.scrollY+delta),left:window.scrollX,behavior:'instant'});
    }
   }
  }
  wasFixedDesktop=fixed;
 });
 appScope.listen(window,'hashchange',()=>navigate(location.hash));
 appScope.listen(document,'visibilitychange',()=>{if(document.hidden)current?.pause('hidden');else current?.resume('hidden');});
 appScope.listen(window,'pagehide',()=>current?.pause('navigation'));
 appScope.listen(window,'pageshow',()=>current?.resume('navigation'));
 navigate(location.hash);
 return {navigate,get current(){return current;},diagnostics(){return {id,scope:sceneScope?.diagnostics(),app:appScope.diagnostics()};},dispose(){if(disposed)return;disposed=true;current?.dispose();sceneScope?.dispose();appScope.dispose();root.replaceChildren();current=null;}};
}
