import {it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {ResourceScope} from '../src/app/scope';
import {createColorFiguresRuntime} from '../src/engines/colorfigures/runtime.js';
import {createCoffee} from '../src/exhibits/coffee/model.js';
it('keeps coffee state and generated SVG identical through a full cup at several views',()=>{
 const root=document.createElement('section');document.body.append(root);const scope=new ResourceScope();
 const geometry=createColorFiguresRuntime({root,scope,audio:null,observation:null});
 const modern=createCoffee(geometry,{scope,document,window:{}});
 const base='tests/fixtures/complete-source/object-collection/dist/';
 const old=vm.createContext({window:{},console,addEventListener(){}});
 vm.runInContext(fs.readFileSync(base+'core.js','utf8')+'\n'+fs.readFileSync(base+'scenes/coffee.js','utf8')+'\nglobalThis.cfg=window.SCENES.coffee();',old);
 const original=old.cfg;
 const callbacks=new Set<(dt:number)=>boolean>();const oldCallbacks=new Set<(dt:number)=>boolean>();
 const ui={animate(fn:(dt:number)=>boolean){callbacks.add(fn);},invalidate(){},flash(){},audio:{reset(){}}};
 const oldUi={...ui,animate(fn:(dt:number)=>boolean){oldCallbacks.add(fn);}};
 let frames=0;
 for(const action of ['beans','grind','filter','cup','brew','milk','collect']){
  modern.acts[action](modern.state,null,ui);original.acts[action](original.state,null,oldUi);
  for(let frame=0;callbacks.size&&frame<900;frame++){
   for(const fn of [...callbacks])if(fn(1/60)===false)callbacks.delete(fn);
   for(const fn of [...oldCallbacks])if(fn(1/60)===false)oldCallbacks.delete(fn);
   expect(JSON.stringify(modern.state)).toBe(JSON.stringify(original.state));
   if(frame%15===0){const yaw=[45,90,135,180][frames++%4];geometry.setCam(yaw,35);old.yaw=yaw;vm.runInContext('setCam(yaw,35)',old);
    const output=modern.scene(modern.state,geometry.PALS.mint);
    const expected=vm.runInContext('cfg.scene(cfg.state,PALS.mint)',old);
    expect(output).toBe(expected);
   }
  }
  expect(callbacks.size).toBe(0);expect(oldCallbacks.size).toBe(0);
 }
 expect(modern.state.made).toBe(1);expect(frames).toBeGreaterThan(30);scope.dispose();root.remove();
});
