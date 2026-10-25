/* Execute the complete production DOM, input handlers and animation scheduler.
 * Only browser time, RAF and layout are controlled. No replacement motion model. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('./portable-baseline.cjs');
const root=path.resolve(__dirname,'..');
let JSDOM;for(const entry of [process.env.JSDOM_PATH,'jsdom'].filter(Boolean)){try{({JSDOM}=require(entry));break}catch{}}
if(!JSDOM)throw Error('Install jsdom or set JSDOM_PATH.');
module.exports=function({revision,audio}={}){
 const read=name=>revision?cp.execFileSync('git',['-C',root,'show',revision+':dist/'+name],{encoding:'utf8'}):fs.readFileSync(path.join(root,'dist',name),'utf8');
 const dom=new JSDOM(read('index.html'),{runScripts:'outside-only',url:'https://fan.test/'}),w=dom.window,d=w.document,ctx=dom.getInternalVMContext();
 let now=0,serial=0;const frames=new Map(),timers=new Map();
 w.matchMedia=()=>({matches:false});w.requestAnimationFrame=f=>{frames.set(++serial,f);return serial};w.cancelAnimationFrame=id=>frames.delete(id);
 w.setTimeout=(f,delay=0)=>{timers.set(++serial,{f,time:now+delay});return serial};w.clearTimeout=id=>timers.delete(id);
 Object.defineProperty(w.performance,'now',{value:()=>now});Object.defineProperty(d,'hidden',{value:false,writable:true});
 w.Element.prototype.getBoundingClientRect=()=>({width:760,height:570,left:0,top:0,right:760,bottom:570});w.Element.prototype.scrollIntoView=function(){};
 w.SVGElement.prototype.setPointerCapture=function(id){this._capture=id};w.SVGElement.prototype.hasPointerCapture=function(id){return this._capture===id};w.SVGElement.prototype.releasePointerCapture=function(){this._capture=null};
 const audioFixture=audio?.(w);
 const run=source=>vm.runInContext(source,ctx);run(read('observation.js'));run(read('mechanical-audio.js'));
 run(read('engine.js'));run(read('fan.js'));run('globalThis.__realRender=render;render=()=>fanObservation?.update()');
 const event=(target,name,extra={})=>{const e=new w.Event(name,{bubbles:true,cancelable:true});for(const [k,v]of Object.entries(extra))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e};
 const toggle=(el,on)=>{el.open=on;event(el,'toggle')};
 const at=time=>{if(time<now-1e-8)throw Error('Clock cannot go backward');if(audioFixture?.contexts.length)audioFixture.contexts.at(-1).tick((time-now)/1000);now=time;};
 const flushTimers=()=>{for(const [id,timer]of [...timers])if(timer.time<=now){timers.delete(id);timer.f()}};
 const tick=time=>{at(time);const batch=[...frames.values()];frames.clear();batch.forEach(f=>f(now));flushTimers()};
 const drive=(end,hz,events=[])=>{
  const pending=events.slice().sort((a,b)=>a[0]-b[0]);let frame=Math.floor((now+1e-7)*hz/1000)+1;
  while(frame*1000/hz<=end+1e-7||pending.length){const t=frame*1000/hz,eventTime=pending[0]?.[0]??Infinity;if(eventTime<t-1e-7){const [time,fn]=pending.shift();at(time);fn();flushTimers()}else{if(t>end+1e-7)break;tick(Math.min(t,end));frame++;while(pending.length&&Math.abs(pending[0][0]-t)<1e-7){pending.shift()[1]();flushTimers()}}}
  if(now<end)at(end);
 };
 const click=selector=>{const node=d.querySelector(selector);if(!node)throw Error('Missing '+selector);node.click();return node};
 const open=()=>{const outer=d.querySelector('.mechanism-observer'),inner=d.querySelector('.mechanism-lesson');toggle(outer,true);toggle(inner,true);return{outer,inner}};
 return{w,d,run,event,toggle,frames,timers,at,tick,drive,click,open,audio:audioFixture,get now(){return now},state:()=>JSON.parse(run('JSON.stringify(state)')),motion:()=>JSON.parse(run('JSON.stringify({velocity:state.velocity,angle:state.angle,phase:state.phase,headYaw:state.headYaw,knob:state.knob})')),hidden:on=>{d.hidden=on;event(d,'visibilitychange')},close:()=>{run('fanObservation?.dispose();window.MechanicalAudio?.dispose()');w.close()}};
};
