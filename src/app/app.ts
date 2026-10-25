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
import {renderHome} from './home.js';
const names={washer:'洗衣机',fan:'电风扇',claw:'抓娃娃机',coffee:'咖啡机',musicbox:'手摇八音盒',vending:'自动售货机',toaster:'烤面包机',turntable:'唱片机',camera:'拍立得相机',elevator:'电梯'};
const items=Object.entries(names).map(([id,name])=>({id,name}));
const adapters:Record<string,(context:SceneContext)=>SceneController>={coffee:mountCoffee,fan:mountFan,camera:mountCamera,vending:mountVending,toaster:mountToaster,musicbox:mountMusicbox,turntable:mountTurntable,elevator:mountElevator};
export function createApp(root:HTMLElement){
 const appScope=new ResourceScope();const audio=createAudioService(appScope);
 const previousRestoration=history.scrollRestoration;history.scrollRestoration='manual';
 appScope.onCleanup(()=>{history.scrollRestoration=previousRestoration;});
 const startAtTop=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
 let current:SceneController|null=null,sceneScope:ResourceScope|null=null,id='',disposed=false;
 function navigate(next:string){
  if(disposed)return;next=next.replace(/^#?\/?/,'').split(/[?&]/)[0];
  if(current&&next===id)return;
  current?.dispose();sceneScope?.dispose();current=null;sceneScope=new ResourceScope();id=next;
  root.replaceChildren();root.className='';document.body.className=next?'museum-scene':'museum-home';
  if(!next){renderHome(root,sceneScope,items,Object.keys(adapters));startAtTop();return;}
  document.title=(names[next as keyof typeof names]||'馆藏')+' · 纸上机械馆';
  const header=document.createElement('header');header.innerHTML=`<div><p class="eyebrow">纸上机械馆 · 十件小玩具</p><h1 tabindex="-1">${names[next as keyof typeof names]||'馆藏'}</h1></div><a class="gallery-link" href="#/">全部作品 ↗</a>`;root.append(header);
  const host=document.createElement('section');host.className='scene-root';host.setAttribute('aria-label','互动展品');root.append(host);
  const mount=adapters[next];
  if(!mount){host.innerHTML='<div class="migration-note"><h2>这件藏品正在接入统一项目</h2><p>原机械模型已保留在回归基线中。当前工程切片已接入八件，洗衣机与抓娃娃机正在接入，不会跳往另一座网站。</p><a href="#/coffee">体验咖啡机</a> · <a href="#/fan">体验电风扇</a></div>';return;}
  try{current=mount({root:host,scope:sceneScope,audio,observation:createObservation(host,sceneScope),catalog:items.filter(item=>adapters[item.id])});}
  catch(error){sceneScope.dispose();host.textContent='展品未能加载，请返回馆藏重试。';throw error;}
  if(document.hidden)current.pause('hidden');
  header.querySelector('h1')?.focus({preventScroll:true});startAtTop();
 }
 appScope.listen(window,'hashchange',()=>navigate(location.hash));
 appScope.listen(document,'visibilitychange',()=>{if(document.hidden)current?.pause('hidden');else current?.resume('hidden');});
 appScope.listen(window,'pagehide',()=>current?.pause('navigation'));
 appScope.listen(window,'pageshow',()=>current?.resume('navigation'));
 navigate(location.hash);
 return {navigate,get current(){return current;},diagnostics(){return {id,scope:sceneScope?.diagnostics(),app:appScope.diagnostics()};},dispose(){if(disposed)return;disposed=true;current?.dispose();sceneScope?.dispose();appScope.dispose();root.replaceChildren();current=null;}};
}
