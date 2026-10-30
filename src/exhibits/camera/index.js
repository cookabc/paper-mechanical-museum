import messages from '../../locales/camera.en.json' with {type:'json'};
import {registerMessages} from '../../shared/message-language.ts';
registerMessages(messages);
import {createColorFiguresRuntime} from '../../engines/colorfigures/runtime.js';
import {scopedDocument} from '../../app/scoped-dom';
import {arrangePlayDock} from '../../shared/play-dock.js';
import {createCamera} from './model.js';

/** A mounted machine shares the museum engine, never a private document or clock. */
export function mountCamera(context){
 const {root,scope,audio,observation}=context;
 const geometry=createColorFiguresRuntime(context);
 const cfg=createCamera(geometry,{scope,document:scopedDocument(root,scope),window:{MechanicalAudio:audio,MuseumObservation:observation,addEventListener:(...args)=>scope.listen(globalThis.window,...args)}});
 cfg.credit=false;cfg.buttonsLabel='动手试试';
 const ui=geometry.mountFigure(cfg);
 arrangePlayDock(context,cfg,ui,[{id:'coffee',name:'咖啡机'},{id:'fan',name:'电风扇'},{id:'camera',name:'拍立得相机'},{id:'vending',name:'售货机'},{id:'toaster',name:'烤面包机'}],'camera');
 const reasons=new Set();let disposed=false;
 return {
  pause(reason='manual'){if(disposed||!scope.active||reasons.has(reason))return;reasons.add(reason);cfg.cancelInput(ui);ui.pause();},
  resume(reason='manual'){if(disposed||!scope.active||!reasons.delete(reason)||reasons.size)return;ui.resume();},
  reset(){if(disposed||!scope.active)return;ui.clearTransient();cfg.acts.reset(ui.st,null,ui);ui.render();},
  dispose(){if(disposed)return;disposed=true;cfg.cancelInput(ui);ui.dispose();},
  snapshot(){return {...structuredClone(ui.st),paused:reasons.size>0,disposed:disposed||!scope.active};}
 };
}
export default mountCamera;
