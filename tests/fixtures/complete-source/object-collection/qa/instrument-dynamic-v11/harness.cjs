'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'../../dist');let checks=0;const ok=(x,m)=>{assert.ok(x,m);checks++};
function factory(baseline=false){
function rig(id){
 const callbacks=new Map(),listeners={},docListeners={},svgListeners={},sounds=[],pulses=[],changes=[],flashes=[];let time=0;
 const output={},ctx={state:'running',currentTime:0,createOscillator(){const o={frequency:{value:0},stopAt:Infinity,ended:false,connect(){},disconnect(){},start(){o.started=ctx.currentTime},stop(t=ctx.currentTime){o.stopAt=t}};sounds.push(o);return o},createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},cancelAndHoldAtTime(){}},connect(){},disconnect(){}}}};
 const svg={captured:new Set(),addEventListener(k,f){(svgListeners[k]??=[]).push(f)},setPointerCapture(i){this.captured.add(i)},releasePointerCapture(i){this.captured.delete(i)},hasPointerCapture(i){return this.captured.has(i)},createSVGPoint(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}},getScreenCTM(){return{inverse(){return{}}}}};
 const c={Math,console,document:{hidden:false,getElementById:()=>svg,addEventListener(k,f){(docListeners[k]??=[]).push(f)}},addEventListener(k,f){(listeners[k]??=[]).push(f)},MechanicalAudio:{enabled:true,getContext:()=>ctx,getOutput:()=>output,pulse:k=>pulses.push(k),onChange:f=>changes.push(f)}};c.window=c;vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'core.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(baseline?path.join(__dirname,'baseline'):path.join(root,'scenes'),id+'.js'),'utf8'),c);const cfg=c.SCENES[id](),s=cfg.state;const ui={animate(f,options={}){callbacks.set(f,options)},invalidate(){},flash(t){flashes.push(t)}};cfg.setup(ui);
 const drain=()=>{for(const o of sounds)if(!o.ended&&o.stopAt<=ctx.currentTime){o.ended=true;o.onended?.()}};
 return {id,c,cfg,s,callbacks,sounds,pulses,flashes,listeners,docListeners,svg,ctx,
  act(key){cfg.acts[key](s,{},ui)},button(label){const b=cfg.buttons.find(x=>x.label===label);ok(b,'button exists '+label);b.onClick(s,ui)},
  tick(seconds,rate=1){for(let t=0;t<seconds-1e-10;t+=.01){const dt=Math.min(.01,seconds-t);time+=dt;ctx.currentTime=time;drain();for(const [fn,options]of [...callbacks])if(fn(options.realtime?dt:dt*rate)===false)callbacks.delete(fn);drain()}},
  event(type,fields={}){const e={button:0,isPrimary:true,pointerId:1,clientX:0,clientY:0,timeStamp:time*1000,target:{closest:q=>q.includes(fields.key||'not-hit')?{}:null},preventDefault(){},stopImmediatePropagation(){},...fields};for(const f of svgListeners[type]||[])f(e)},
  point(angle){c.a=angle;return vm.runInContext('P(72,27+Math.cos(a)*11,25+Math.sin(a)*11)',c)},
  render(yaw=45,pitch=35){c.cfg=cfg;c.yaw=yaw;c.pitch=pitch;return vm.runInContext(`{const [W,D,H]=cfg.size;RC=[W/2,D/2];RCZ=H/2;OX=OY=0;INK_K=.5;setCam(yaw,pitch);setLight(105);const out=cfg.scene(cfg.state,PALS.mint);cfg.scene.layers?cfg.scene.layers.map(p=>p.svg).join(''):out}`,c)}
 };
}

return rig;
}
module.exports={factory};
