import messages from '../../locales/claw.en.json' with {type:'json'};
import {registerMessages} from '../../shared/message-language.ts';
registerMessages(messages);
import {createClawRuntime} from '../../engines/claw/runtime.js';
import {createClawModel} from './model.js';
import './style.css';

const owners=new WeakMap();
/** A lifecycle owner around the actual historical claw, not a substitute simulator. */
export function mountClaw(context){
 const {root,scope}=context;
 if(!root||!scope)throw new TypeError('mountClaw requires root and scope');
 let disposed=false;const reasons=new Set(),token={};
 const previousAccent=root.style.getPropertyValue('--accent'),previousExhibit=root.dataset.exhibit,previousNoLabels=root.classList.contains('nolabels');
 owners.set(root,token);root.classList.add('claw-exhibit');
 const geometry=createClawRuntime(context);
 let model;
 try{model=createClawModel(geometry,context);}catch(error){scope.dispose();if(owners.get(root)===token){root.replaceChildren();root.classList.remove('claw-exhibit');root.classList.toggle('nolabels',previousNoLabels);if(previousAccent)root.style.setProperty('--accent',previousAccent);else root.style.removeProperty('--accent');if(previousExhibit===undefined)delete root.dataset.exhibit;else root.dataset.exhibit=previousExhibit;owners.delete(root);}throw error;}
 const ownedNodes=[...root.childNodes];
 const controller={
  pause(reason='manual'){if(disposed||reasons.has(reason))return;reasons.add(reason);model.cancelInput();model.ui.pause();},
  resume(reason='manual'){if(disposed||!reasons.delete(reason)||reasons.size)return;model.ui.resume();},
  // Whole-trial reset and home camera; cosmetic preferences are retained.
  // The in-game “重新摆放” control keeps its original idle-only semantics.
  reset(){if(disposed)return;model.reset();},
  dispose(){if(disposed)return;disposed=true;model.dispose();scope.dispose();},
  snapshot(){return {...model.snapshot(),camera:model.ui.cameraSnapshot(),paused:reasons.size>0,disposed};}
 };
 scope.onCleanup(()=>{
  disposed=true;model.dispose();
  if(owners.get(root)!==token)return;
  for(const node of ownedNodes)if(node.parentNode===root)node.remove();
  root.classList.remove('claw-exhibit');root.classList.toggle('nolabels',previousNoLabels);
  if(previousAccent)root.style.setProperty('--accent',previousAccent);else root.style.removeProperty('--accent');
  if(previousExhibit===undefined)delete root.dataset.exhibit;else root.dataset.exhibit=previousExhibit;
  owners.delete(root);
 });
 scope.listen(root.ownerDocument,'visibilitychange',()=>{if(root.ownerDocument.hidden)controller.pause('hidden');else controller.resume('hidden');});
 scope.listen(root.ownerDocument.defaultView,'pagehide',()=>controller.pause('navigation'));
 scope.listen(root.ownerDocument.defaultView,'pageshow',()=>controller.resume('navigation'));
 if(root.ownerDocument.hidden)controller.pause('hidden');
 return controller;
}
export default mountClaw;
