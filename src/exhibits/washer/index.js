import messages from '../../locales/washer.en.json' with {type:'json'};
import {registerMessages} from '../../shared/message-language.ts';
registerMessages(messages);
import {createWasherRuntime} from '../../engines/washer/runtime.js';
import {createWasherModel} from './model.js';
import {scopedDocument} from '../../app/scoped-dom';
import './style.css';

/** Mount the original washer, with one scene-owned clock and resource scope. */
export function mountWasher(context){
 const {root,scope,audio,observation}=context;
 const geometry=createWasherRuntime(context);
 const previousNoLabels=root.classList.contains('nolabels'),previousAccent=root.style.getPropertyValue('--accent');
 root.classList.add('washer-exhibit');
 let model;
 try{model=createWasherModel(geometry,{scope,document:scopedDocument(root,scope),window:{MechanicalAudio:audio,MuseumObservation:observation}});}
 catch(error){scope.dispose();root.classList.remove('washer-exhibit');root.classList.toggle('nolabels',previousNoLabels);if(previousAccent)root.style.setProperty('--accent',previousAccent);else root.style.removeProperty('--accent');root.replaceChildren();throw error;}
 const {ui}=model,pauseReasons=new Set();let disposed=false;
 function pause(reason='manual'){
  if(disposed||pauseReasons.has(reason))return;pauseReasons.add(reason);
  if(pauseReasons.size===1)ui.pause();
 }
 function resume(reason='manual'){
  if(disposed||!pauseReasons.delete(reason)||pauseReasons.size)return;ui.resume();
 }
 function reset(){
  if(disposed)return;ui.reset();model.resetPresentation();ui.render();
 }
 function dispose(){
  if(disposed)return;disposed=true;ui.dispose();
  const errors=[];
  for(const clean of [()=>ui.observation?.dispose(),()=>model.detachAudio?.(),()=>scope.dispose()])try{clean()}catch(error){errors.push(error)}
  root.classList.remove('washer-exhibit');root.classList.toggle('nolabels',previousNoLabels);if(previousAccent)root.style.setProperty('--accent',previousAccent);else root.style.removeProperty('--accent');root.replaceChildren();
  if(errors.length)throw new AggregateError(errors,'Washer exhibit cleanup failed');
 }
 scope.listen(root.ownerDocument,'visibilitychange',()=>root.ownerDocument.hidden?pause('visibility'):resume('visibility'));
 scope.listen(root.ownerDocument.defaultView,'pagehide',()=>pause('pagehide'));
 scope.listen(root.ownerDocument.defaultView,'pageshow',()=>resume('pagehide'));
 scope.onCleanup(dispose);
 if(root.ownerDocument.hidden)pause('visibility');
 return Object.freeze({pause,resume,reset,dispose,snapshot(){return {...JSON.parse(JSON.stringify(ui.st)),...ui.diagnostics(),paused:!!ui.st.paused,lifecyclePaused:pauseReasons.size>0,pauseReasons:[...pauseReasons],observationRate:model.observationRate,disposed};}});
}
export default mountWasher;
