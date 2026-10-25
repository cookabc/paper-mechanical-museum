import {createColorFiguresRuntime} from '../../engines/colorfigures/runtime.js';
import {scopedDocument} from '../../app/scoped-dom';
import {arrangePlayDock} from '../../shared/play-dock.js';
import {createElevator} from './model.js';
import {createElevatorOcclusion} from './occlusion.js';

/** Mount one self-contained exhibit into the shared museum shell. */
export function mountElevator(context){
 const {root,scope,audio,observation}=context;
 const geometry=createColorFiguresRuntime(context);
 const cfg=createElevator(geometry,{scope,document:scopedDocument(root,scope),audio,observation,occlusion:createElevatorOcclusion(geometry)});
 cfg.credit=false;cfg.buttonsLabel='动手试试';
 const ui=geometry.mountFigure(cfg);
 arrangePlayDock(context,cfg,ui,[{id:'washer',name:'洗衣机'},{id:'fan',name:'电风扇'},{id:'claw',name:'抓娃娃机'},{id:'coffee',name:'咖啡机'},{id:'musicbox',name:'手摇八音盒'},{id:'vending',name:'自动售货机'},{id:'toaster',name:'烤面包机'},{id:'turntable',name:'唱片机'},{id:'camera',name:'拍立得相机'},{id:'elevator',name:'电梯'}],'elevator');
 const reasons=new Set();let disposed=false;
 return {
  pause(reason='manual'){if(disposed||!scope.active||reasons.has(reason))return;reasons.add(reason);if(reasons.size===1){cfg.lifecycle?.pause?.(ui);ui.pause();}},
  resume(reason='manual'){if(disposed||!scope.active||!reasons.delete(reason)||reasons.size)return;ui.resume();cfg.lifecycle?.resume?.(ui);},
  reset(){if(disposed||!scope.active)return;ui.clearTransient();cfg.lifecycle.reset(ui);ui.render();},
  dispose(){if(disposed)return;disposed=true;cfg.lifecycle?.dispose?.(ui);ui.dispose();},
  snapshot(){return {...structuredClone(ui.st),paused:reasons.size>0,disposed:disposed||!scope.active};}
 };
}
export default mountElevator;
