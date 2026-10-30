import { ResourceScope } from './scope';
import type { SceneController } from './contracts';
import {createAudioService} from '../shared/audio.js';
import {createObservation} from '../shared/observation.js';
import {exhibitLoaders, type ExhibitLoader} from './exhibit-loaders';
import {renderHome} from './home.js';
import {detectLang,translator} from '../shared/i18n';
import {mountLearningEntry} from '../shared/learning-entry';
import {catalog as items} from './catalog';
import {bindLanguageSwitch,createExhibitHeader,mountExhibitPresentation} from './exhibit-presentation';
// Titles follow the interface language; the Chinese name is the fallback.
const nameFor=(id:string,lang:'en'|'zh')=>{
 const entry=items.find(item=>item.id===id);
 return entry?(lang==='zh'?entry.name:entry.nameEn):'';
};
export function createApp(root:HTMLElement, loaders:Readonly<Record<string, ExhibitLoader>> = exhibitLoaders){
 const appScope=new ResourceScope();const audio=createAudioService(appScope);
 let lang0=detectLang(),tr=translator(lang0);
 // The switch rebuilds the route, so re-read the language on every navigate.
 const syncLang=()=>{lang0=detectLang();tr=translator(lang0);document.documentElement.lang=lang0;};
 const previousRestoration=history.scrollRestoration;history.scrollRestoration='manual';
 appScope.onCleanup(()=>{history.scrollRestoration=previousRestoration;});
 const startAtTop=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
 let current:SceneController|null=null,sceneScope:ResourceScope|null=null,id='',disposed=false;
 let revision=0;
 let pending:Promise<void>|null=null;
 function navigate(next:string):Promise<void>{
  if(disposed)return Promise.resolve();
  next=next.replace(/^#?\/?/,'').split(/[?&]/)[0];
  if(next===id&&(current||pending))return pending??Promise.resolve();
  const task=showRoute(next);
  pending=task;
  void task.finally(()=>{if(pending===task)pending=null;});
  return task;
 }
 async function showRoute(next:string){
  syncLang();
  const visit=++revision;
  current?.dispose();sceneScope?.dispose();current=null;sceneScope=new ResourceScope();id=next;
  const scope=sceneScope;
  root.replaceChildren();root.className='';document.body.className=next?'museum-scene':'museum-home';
  if(!next){renderHome(root,sceneScope,items,Object.keys(loaders));startAtTop();return;}
  document.title=(nameFor(next,lang0)||tr('exhibit.unknown'))+' · '+tr('brand.name');
  const header=createExhibitHeader(next);root.append(header);
  // A language change rebuilds the whole scene, because exhibit chrome is
  // generated as markup rather than patched in place.
  bindLanguageSwitch(scope,()=>{void navigate('');if(next)void navigate(next);});
  const host=document.createElement('section');host.className='scene-root';host.setAttribute('aria-label',tr('exhibit.sceneLabel'));root.append(host);
  const load=Object.hasOwn(loaders,next)?loaders[next]:undefined;
  if(!load){host.innerHTML=`<div class="migration-note"><h2>${tr('exhibit.missingTitle')}</h2><p>${tr('exhibit.missingBody')}</p><a href="#/">${tr('exhibit.missingLink')}</a></div>`;startAtTop();return;}
  host.setAttribute('aria-busy','true');
  const status=document.createElement('p');
  status.className='scene-status';status.setAttribute('role','status');status.textContent=tr('exhibit.loading');host.append(status);
  startAtTop();
  try{
   const mount=await load();
   // A slow import cannot revive a route that was left or an app that was closed.
   if(disposed||visit!==revision)return;
   host.replaceChildren();
   current=mount({root:host,scope,audio,observation:createObservation(host,scope),catalog:items.filter(item=>Object.hasOwn(loaders,item.id))});
   mountLearningEntry(host,scope,next);
   mountExhibitPresentation(host,items.find(item=>item.id===next));
   document.title=(nameFor(next,lang0)||tr('exhibit.unknown'))+' · '+tr('brand.name');
   if(document.hidden)current.pause('hidden');
  }catch(error){
   if(disposed||visit!==revision)return;
   current?.dispose();current=null;scope.dispose();
   const message=document.createElement('p');message.textContent=tr('exhibit.loadFailed');
   const retry=document.createElement('button');retry.type='button';retry.textContent=tr('exhibit.retry');
   // Own recovery controls separately from the failed exhibit's disposed resources.
   sceneScope=new ResourceScope();sceneScope.listen(retry,'click',()=>{void navigate(next);});
   const home=document.createElement('a');home.href='#/';home.textContent=tr('exhibit.missingLink');
   const notice=document.createElement('div');notice.className='scene-status';notice.setAttribute('role','alert');notice.append(message,retry,home);host.replaceChildren(notice);
   console.error('Exhibit load failed:',next,error);
  }finally{
   if(!disposed&&visit===revision)host.removeAttribute('aria-busy');
  }
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
 appScope.listen(window,'hashchange',()=>{void navigate(location.hash);});
 appScope.listen(document,'visibilitychange',()=>{if(document.hidden)current?.pause('hidden');else current?.resume('hidden');});
 appScope.listen(window,'pagehide',()=>current?.pause('navigation'));
 appScope.listen(window,'pageshow',()=>current?.resume('navigation'));
 void navigate(location.hash);
 return {navigate,get current(){return current;},diagnostics(){return {id,scope:sceneScope?.diagnostics(),app:appScope.diagnostics()};},dispose(){if(disposed)return;disposed=true;++revision;current?.dispose();sceneScope?.dispose();appScope.dispose();root.replaceChildren();current=null;}};
}
