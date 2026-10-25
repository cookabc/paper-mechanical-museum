import {createColorFiguresRuntime} from '../../engines/colorfigures/runtime.js';
import {scopedDocument} from '../../app/scoped-dom';
import {arrangePlayDock} from '../../shared/play-dock.js';
import {createCoffee} from './model.js';
export function mountCoffee(context){
 const {root,scope,audio,observation}=context;
 const geometry=createColorFiguresRuntime(context);
 const cfg=createCoffee(geometry,{scope,document:scopedDocument(root,scope),window:{MuseumObservation:observation}});
 cfg.credit=false;cfg.buttonsLabel='动手试试';
 const ui=geometry.mountFigure(cfg);
 arrangePlayDock(context,cfg,ui,[{id:'coffee',name:'咖啡机'},{id:'fan',name:'电风扇'}],'coffee');
 const reasons=new Set();let disposed=false;
 return {
  pause(reason='manual'){if(disposed||reasons.has(reason))return;reasons.add(reason);ui.pause();},
  resume(reason='manual'){if(disposed||!reasons.delete(reason)||reasons.size)return;ui.resume();},
  reset(){if(disposed)return;ui.clearTransient();cfg.acts.reset(ui.st,null,ui);ui.render();},
  dispose(){if(disposed)return;disposed=true;ui.dispose();},
  snapshot(){return {...ui.st,paused:reasons.size>0,disposed};}
 };
}
export default mountCoffee;
