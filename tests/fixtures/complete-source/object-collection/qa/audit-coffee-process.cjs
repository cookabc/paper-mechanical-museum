'use strict';
// Deterministic production callbacks + the actual core RAF driver, with mocked
// DOM/clock and Web Audio only. This is not browser or audible-quality QA.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const coreSource=fs.readFileSync(path.join(root,'dist/core.js'),'utf8');
const sceneSource=fs.readFileSync(path.join(root,'dist/scenes/coffee.js'),'utf8');
const observerSource=fs.readFileSync(path.join(root,'dist/observation.js'),'utf8');
const driverStart=coreSource.indexOf('  const steps=new Set(),realTimeSteps=new WeakSet();');
const driverEnd=coreSource.indexOf('\n  // orbit:',driverStart);
assert(driverStart>=0&&driverEnd>driverStart,'locate the real production frame driver');
const driverSource=coreSource.slice(driverStart,driverEnd);
const audioHarness=fs.readFileSync(path.join(__dirname,'audit-mechanical-audio.cjs'),'utf8').split('const results=[];')[0];
const audioBox={require,console,__dirname};vm.createContext(audioBox);vm.runInContext(audioHarness+'\nglobalThis.fixture=make;',audioBox);
const near=(a,b,tolerance=1e-9,label='')=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} != ${b}, tolerance ${tolerance}`);
const copy=x=>JSON.parse(JSON.stringify(x));
const activeNodes=a=>a.nodes.filter(n=>n.started&&!n.ended);
const results=[],measurements=[];
function observationDOM(){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.events={};this.textContent='';this.open=false;this.scrollHeight=0;this.clientHeight=100;this.scrollTop=0;this.value='';this.disabled=false;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  removeAttribute(k){delete this.attrs[k];}
  append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
  prepend(...nodes){for(const n of [...nodes].reverse()){n.parentElement=this;this.children.unshift(n);}}
  insertBefore(node,before){node.parentElement=this;const index=this.children.indexOf(before);if(index<0)this.children.push(node);else this.children.splice(index,0,node);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
  addEventListener(type,fn){(this.events[type]||=[]).push(fn);}
  removeEventListener(type,fn){this.events[type]=(this.events[type]||[]).filter(n=>n!==fn);}
  emit(type){for(const fn of this.events[type]||[])fn({type,target:this});}
  getBoundingClientRect(){return {top:0};}
  matches(selector){if(selector[0]==='.')return (this.className||'').split(' ').includes(selector.slice(1));if(selector[0]==='#')return this.id===selector.slice(1);if(selector==='[data-observe-part]')return !!this.dataset.observePart;return this.tagName===selector;}
  querySelectorAll(selector){const found=[];for(const child of this.children){if(child.matches(selector))found.push(child);found.push(...child.querySelectorAll(selector));}return found;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  set innerHTML(value){this.html=value;this.children=[];if(value.includes('<select')){for(const tag of ['select','output','button','p']){const child=new Element(tag),match=value.match(new RegExp('<'+tag+'([^>]*)>([\\s\\S]*?)<\\/'+tag+'>'));if(match){for(const a of match[1].matchAll(/([\w-]+)="([^"]*)"/g))child.setAttribute(a[1],a[2]);child.textContent=match[2].replace(/<[^>]*>/g,'');}if(tag==='select')child.value='1';this.append(child);}}}
 }
 const head=new Element('head'),body=new Element('body'),events={};
 return {head,body,hidden:false,createElement:tag=>new Element(tag),getElementById:id=>head.querySelector('#'+id)||body.querySelector('#'+id),addEventListener(type,fn){(events[type]||=[]).push(fn);},removeEventListener(type,fn){events[type]=(events[type]||[]).filter(x=>x!==fn);}};
}
async function test(name,fn){try{await fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.stack});}}
function fixture(){
 const context=vm.createContext({window:{},console,addEventListener(){},Number,Math});
 vm.runInContext(coreSource,context);
 const liquidLine='const liquidZ=cz+2+s.fill*9+s.milk*1.8;';assert(sceneSource.includes(liquidLine),'locate production liquid transform');
 vm.runInContext(sceneSource.replace(liquidLine,liquidLine+'globalThis.__liquidPose={cx,cy,cz,liquidZ};'),context);
 const cfg=context.window.SCENES.coffee(),s=cfg.state,raf=new Map(),listeners=new Map(),flashes=[];
 s.pal='mint';s.az=105;
 let now=0,serial=0,frames=0,audio=null;
 const ui={st:s,simulationRate:1,metrics:{averageMs:1},render(){frames++;ui.observation?.update();audio?.api.update('coffee',s);},flash(value){flashes.push(value)}};
 const document={hidden:false,addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list);}};
 const driverContext={ui,document,art:{setAttribute(){}},smoothMotion:true,performance:{now:()=>now},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>{const id=++serial;raf.set(id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id)};
 vm.runInNewContext(driverSource,driverContext);
 const f={cfg,s,ui,context,flashes,get frames(){return frames},get pending(){return raf.size},get wall(){return now/1000},
  setAudio(value){audio=value;},
  mountObservation(){
   const doc=observationDOM(),events={};context.document=doc;context.window.addEventListener=(type,fn)=>(events[type]||=[]).push(fn);context.window.removeEventListener=(type,fn)=>events[type]=(events[type]||[]).filter(x=>x!==fn);
   vm.runInContext(observerSource,context);const host=doc.createElement('section');doc.body.append(host);
   const ob=cfg.observation;ui.observation=context.window.MuseumObservation.mount({host,title:ob.title,intro:ob.intro,slow:ob.slow,read:()=>ob.read(s),onRate:rate=>{ui.simulationRate=rate;audio?.api.setRate(rate);},onChange:()=>ui.render()});cfg.setup(ui);
   const panel=ui.observation.panel,box=panel.querySelector('.coffee-process');assert(box,'process controls are inside optional observation panel');
   return {panel,box,select:box.querySelector('select'),output:box.querySelector('output'),button:box.querySelector('button'),toggle(open){panel.open=open;panel.emit('toggle');},rate(value){const button=panel.querySelectorAll('button').find(n=>+n.dataset.rate===value);assert(button);button.onclick();}};
  },
  action(name){assert.equal(typeof cfg.acts[name],'function',name+' action');cfg.acts[name](s,{dataset:{}},ui);ui.invalidate();},
  frame(seconds=.04){now+=seconds*1000;audio?.contexts.at(-1)?.tick(seconds);const queued=[...raf.values()];raf.clear();for(const fn of queued)fn(now);},
  elapse(seconds){now+=seconds*1000;audio?.contexts.at(-1)?.tick(seconds);},
  tick(seconds){for(let t=0;t<seconds-1e-10;t+=.04)this.frame(Math.min(.04,seconds-t));},
  finish(){let n=0;while(raf.size&&n++<2500)this.frame();assert.equal(raf.size,0,'frame driver reaches rest');},
  render(){vm.runInContext('setCam(45,35.264);setLight(105);',context);return cfg.scene(s,vm.runInContext('PALS.mint',context));},
  observation(){const before=JSON.stringify(s),out=cfg.observation.read(s);assert.equal(JSON.stringify(s),before,'observation is read-only');return copy(out);},
  snapshot(){return JSON.stringify(s);}
 };
 return f;
}
function prepare(f){for(const action of ['beans','grind','filter','cup']){f.action(action);f.finish();}assert.equal(f.s.phase,'locked');assert.equal(f.s.cup,true);}
function start(f,target=1){prepare(f);f.action(target===.5?'targetHalf':'targetFull');f.finish();f.action('brew');assert.equal(f.s.phase,'brewing');}
function readings(f){return Object.fromEntries(f.observation().readouts.map(x=>[x.label,x.value]));}
function assertStable(f,seconds=30){const before=f.snapshot(),markup=f.render(),observation=f.observation(),frames=f.frames;f.tick(seconds);assert.equal(f.snapshot(),before,'paused state stays exact');assert.equal(f.render(),markup,'paused geometry stays exact');assert.deepEqual(f.observation(),observation,'paused observation stays exact');assert.equal(f.frames,frames,'paused wait cannot redraw');assert.equal(f.pending,0,'paused wait cannot keep RAF alive');}
(async()=>{
 await test('controls are coffee-only observation options, not extra primary steps',()=>{
  const f=fixture();for(const name of ['pause','targetHalf','targetFull'])assert.equal(typeof f.cfg.acts[name],'function');
  assert.equal(f.cfg.buttons.length,8,'preserve the existing eight primary coffee actions');
  near(f.s.targetFill,1,0,'default full target');assert.equal(f.s.brewPaused,false);
  assert.match(f.cfg.observation.intro,/简化示意/);
 });
 await test('default and half targets change real extraction duration and final geometry, with one fixed preinfusion',()=>{
  const terminal=[];
  for(const target of [.5,1]){
   const f=fixture();start(f,target);const wall=f.wall;
   near(f.s.brewTarget,target,0,'snapshotted target');near(f.s.brewDuration,.672+4.928*target,1e-12,'planned extraction seconds');
   f.tick(.64);assert.equal(f.s.fill,0,'no coffee before the fixed .672s wetting');assert.ok(f.s.pressure>0);assert.match(f.observation().stage,/预浸润/);assert(!f.render().includes('data-observe-part="coffee-extraction"'),'no stream during wetting');
   f.tick(.08);assert.ok(f.s.fill>0,'coffee starts after wetting');assert(f.render().includes('data-observe-part="coffee-extraction"'),'stream follows the same fixed wetting boundary');
   const expected=(f.s.t-.672)/4.928;near(f.s.fill,expected,1e-10,'same illustrative physical flow');
   assert.equal(readings(f)['咖啡液量'],Math.round(f.s.fill*100)+'%','readout uses actual amount, not normalized target progress');
   f.finish();assert.equal(f.s.phase,'ready');near(f.s.fill,target,1e-12,'final amount');assert.equal(f.s.pressure,0);assert.equal(f.s.brewPaused,false);
   const duration=f.wall-wall;assert(duration>=f.s.brewDuration-1e-9);assert(duration<=f.s.brewDuration+.04+1e-9);
   const markup=f.render(),pose=copy(f.context.__liquidPose);near(pose.cx,49);near(pose.cy,29);near(pose.cz,15);near(pose.liquidZ,17+9*target,1e-12,'actual rendered liquid height');assert(pose.liquidZ<pose.cz+14,'liquid remains below cup rim');terminal.push({fill:f.s.fill,markup,liquidZ:pose.liquidZ});measurements.push({target,duration,planned:f.s.brewDuration,liquidZ:pose.liquidZ});
  }
  assert.notEqual(terminal[0].markup,terminal[1].markup,'target must change visible cup, not labels alone');near(terminal[1].liquidZ-terminal[0].liquidZ,4.5,1e-12,'half target lowers actual liquid plane by 4.5 model units');
 });
 await test('both targets follow the same flow for matched elapsed time and quarter speed changes only wall time',()=>{
  const half=fixture(),full=fixture();start(half,.5);start(full,1);
  for(let i=0;i<55;i++){half.frame();full.frame();near(half.s.t,full.s.t);near(half.s.fill,full.s.fill,1e-10,'same extraction flow');}
  for(const target of [.5,1]){const fast=fixture(),slow=fixture();start(fast,target);start(slow,target);slow.ui.simulationRate=.25;
   for(let i=0;i<40;i++){fast.frame(.04);slow.frame(.04);slow.frame(.04);slow.frame(.04);slow.frame(.04);near(fast.s.t,slow.s.t);near(fast.s.fill,slow.s.fill);near(fast.s.pressure,slow.s.pressure);}
  }
 });
 await test('pause parks the actual RAF driver and freezes preinfusion, middle, and pressure-release states',()=>{
  for(const target of [.5,1])for(const at of [.24,1.6,(.672+4.928*target)-.16]){
   const f=fixture();start(f,target);f.tick(at);assert.equal(f.s.phase,'brewing');
   const t=f.s.t,fill=f.s.fill,pressure=f.s.pressure,brewT=f.s.brewT,run=f.s.run;
   f.action('pause');assert.equal(f.s.brewPaused,true);f.finish();
   near(f.s.t,t,0);near(f.s.fill,fill,0);near(f.s.pressure,pressure,0);near(f.s.brewT,brewT,0);assert.equal(f.s.run,run,'pause does not cancel the operation');
   assertStable(f);f.action('pause');assert.equal(f.s.brewPaused,false);f.frame();
   near(f.s.t,t+.04,1e-10,'resume delivers only its new frame, not paused wall time');assert.equal(f.s.run,run);
   f.finish();assert.equal(f.s.phase,'ready');near(f.s.fill,target);assert.equal(f.pending,0);
  }
 });
 await test('repeated pause and immediate resume never duplicates the driver or loses its closure',()=>{
  const f=fixture();start(f);f.tick(1);let previous=f.s.t;
  for(let i=0;i<30;i++){
   f.action('pause');assert.equal(f.s.brewPaused,true);
   if(i%2){f.finish();f.elapse(20);}
   f.action('pause');assert.equal(f.s.brewPaused,false);f.frame();
   near(f.s.t,previous+.04,1e-9,'one physical step after one frame');previous=f.s.t;
   assert(f.pending<=1,'one frame request, not parallel drivers');
  }
  f.finish();near(f.s.fill,1);assert.equal(f.s.phase,'ready');
 });
 await test('target is locked after extraction starts and unlocked only by preparation or a genuinely empty early stop',()=>{
  const f=fixture();start(f,.5);f.tick(1.2);const locked=copy({targetFill:f.s.targetFill,brewTarget:f.s.brewTarget,brewDuration:f.s.brewDuration,fill:f.s.fill,t:f.s.t});
  f.action('targetFull');for(const [key,value]of Object.entries(locked))near(f.s[key],value,0,key+' active target cannot change');
  f.action('pause');f.finish();f.action('targetFull');assert.equal(f.s.targetFill,.5);assert.equal(f.s.brewPaused,true);f.finish();
  f.action('brew');assert.equal(f.s.phase,'ready');assert.equal(f.s.brewPaused,false);const stopped=f.s.fill;f.finish();
  f.action('targetFull');assert.equal(f.s.targetFill,.5,'partial cup cannot be relabeled');near(f.s.fill,stopped,0);f.finish();
  f.action('reset');f.finish();f.action('targetFull');assert.equal(f.s.targetFill,1,'reset unlocks selection');f.finish();
  const empty=fixture();start(empty);empty.tick(.2);empty.action('brew');empty.finish();assert.equal(empty.s.fill,0);empty.action('targetHalf');assert.equal(empty.s.targetFill,.5,'no extraction yet permits reselecting');empty.finish();empty.action('brew');near(empty.s.brewDuration,3.136);empty.finish();near(empty.s.fill,.5);
 });
 await test('tiny stopped extraction keeps existing drops and budgets only remaining amount on restart',()=>{
  for(const target of [.5,1]){const f=fixture();start(f,target);f.tick(.72);f.action('brew');f.finish();const amount=f.s.fill;assert(amount>0&&amount<.02);
   f.action('brew');const duration=.672+4.928*(target-amount);near(f.s.brewDuration,duration,1e-10);near(f.s.fill,amount,0);
   f.tick(.64);near(f.s.fill,amount,0,'restart preinfusion does not erase or add drops');f.finish();near(f.s.fill,target);}
 });
 await test('stop and reset while paused retire the retained callback and cannot revive stale work',()=>{
  for(const end of ['brew','reset'])for(let i=0;i<12;i++){
   const f=fixture();start(f,.5);f.tick(.8+i*.08);f.action('pause');if(i%2)f.finish();
   f.action(end);assert.equal(f.s.brewPaused,false);f.finish();const before=f.snapshot();f.tick(10);assert.equal(f.snapshot(),before);assert.equal(f.pending,0);
   if(end==='reset'){assert.equal(f.s.phase,'empty');start(f,1);f.finish();near(f.s.fill,1);assert.equal(f.s.phase,'ready');}
   else{assert.equal(f.s.phase,'ready');assert.equal(f.s.pressure,0);f.action('pause');f.finish();assert.equal(f.s.phase,'ready');assert.equal(f.s.brewPaused,false);}
  }
 });
 await test('pause has no effect on idle or preparation phases and never becomes an unrelated process control',()=>{
  const f=fixture();for(const action of [null,'beans','grind','filter','cup']){
   if(action)f.action(action);const phase=f.s.phase,run=f.s.run,t=f.s.t;f.action('pause');assert.equal(f.s.phase,phase);assert.equal(f.s.run,run);near(f.s.t,t,0);assert.equal(f.s.brewPaused,false);f.finish();
  }
 });
 await test('real observation setup stays optional, locks controls, and shows same-state amount/time',()=>{
  const f=fixture(),o=f.mountObservation();assert.equal(o.panel.open,false,'panel does not auto-open');
  o.toggle(true);assert.equal(o.select.getAttribute('aria-label'),'目标杯量');assert.equal(o.output.getAttribute('aria-label'),'本杯示意进度');assert.equal(o.button.disabled,true);assert.equal(o.select.disabled,false);assert.match(o.output.textContent,/100%.*5\.6/);
  o.select.value='.5';o.select.onchange();f.finish();assert.equal(f.s.targetFill,.5);assert.match(o.output.textContent,/50%.*3\.1/);
  prepare(f);f.action('brew');f.tick(1.2);assert.equal(o.select.disabled,true);assert.equal(o.button.disabled,false);
  assert.match(o.output.textContent,new RegExp('入杯 '+Math.round(f.s.fill*100)+'% / 50%'));assert.match(o.output.textContent,new RegExp(f.s.t.toFixed(1)+' / 3\\.1'));
  o.button.onclick();f.finish();assert.equal(f.s.brewPaused,true);assert.equal(o.button.textContent,'继续观察');assert.equal(o.button.getAttribute('aria-pressed'),'true');const out=o.output.textContent;assertStable(f);assert.equal(o.output.textContent,out);
  o.button.onclick();f.frame();assert.equal(o.button.textContent,'暂停观察');assert.equal(o.button.getAttribute('aria-pressed'),'false');f.finish();assert.equal(o.button.disabled,true);assert.equal(o.select.disabled,true);assert.match(o.output.textContent,/已入杯 50%/);
  f.action('reset');f.finish();assert.equal(o.select.disabled,false);assert.equal(o.button.disabled,true);assert.equal(o.select.value,'1');
 });
 await test('closing the actual observer resumes exactly once and restores normal speed; reopening does not replay',()=>{
  const f=fixture(),o=f.mountObservation();o.toggle(true);start(f,.5);o.rate(.25);f.tick(1.6);assert.equal(f.ui.simulationRate,.25);
  o.button.onclick();f.finish();assert.equal(f.s.brewPaused,true);const time=f.s.t;f.elapse(60);o.toggle(false);
  assert.equal(f.s.brewPaused,false);assert.equal(f.ui.simulationRate,1);f.frame();near(f.s.t,time+.04,1e-10,'close resumes from held mechanism time');
  o.toggle(true);assert.equal(f.s.brewPaused,false);assert.equal(o.button.textContent,'暂停观察');assert.equal(f.ui.simulationRate,1);f.finish();near(f.s.fill,.5);assert.equal(f.s.phase,'ready');
  for(let i=0;i<20;i++){o.toggle(false);o.toggle(true);}assert.equal(f.s.phase,'ready');assert.equal(f.pending,0,'completed cup not replayed by toggles');
 });
 await test('paused extraction is silent before audio opt-in and resume cannot manufacture consent',async()=>{
  const a=audioBox.fixture(),f=fixture();a.api.attach('coffee');f.setAudio(a);start(f);f.tick(1);f.action('pause');f.finish();
  for(let i=0;i<20;i++)a.api.update('coffee',f.s);assert.equal(a.contexts.length,0);assert.equal(a.panel().dataset.audioVoices,'0');
  f.action('pause');f.frame();assert.equal(a.contexts.length,0);assert.equal(a.panel().dataset.audioVoices,'0');f.finish();
 });
 await test('consented pump silences on pause, resumes only same state, and reset/leave never revive it',async()=>{
  for(const end of ['stop','reset','pagehide','hashchange']){
   const a=audioBox.fixture(),f=fixture();a.api.attach('coffee');f.setAudio(a);start(f);f.tick(1);await a.enable();const ctx=a.contexts[0];assert.equal(a.panel().dataset.audioLoop,'pump');
   f.action('pause');f.finish();assert.equal(a.panel().dataset.audioLoop,'none');ctx.tick(.3);assert.equal(activeNodes(ctx).length,0);const count=ctx.nodes.length;
   for(let i=0;i<20;i++){a.api.setRate(i%2?.25:1);a.api.update('coffee',f.s);}assert.equal(ctx.nodes.length,count,'paused snapshots do not recover a loop');
   if(end==='stop'){f.action('brew');f.finish();assert.equal(a.panel().dataset.audioLoop,'none');}
   else if(end==='reset'){f.action('reset');f.finish();assert.equal(a.panel().dataset.audioLoop,'none');}
   else{a.event(end);assert.equal(ctx.state,'closed');}
   ctx.tick(1);assert.equal(activeNodes(ctx).length,0);
   if(end==='pagehide'||end==='hashchange'){f.action('pause');f.frame();assert.equal(a.api.enabled,false);assert.equal(activeNodes(ctx).length,0);}
  }
  const a=audioBox.fixture(),f=fixture();a.api.attach('coffee');f.setAudio(a);start(f);f.tick(1);await a.enable();const ctx=a.contexts[0];
  f.action('pause');f.finish();ctx.tick(.3);f.action('pause');f.frame();assert.equal(a.panel().dataset.audioLoop,'pump');assert.equal(activeNodes(ctx).length,2,'one resumed pump pair');
  f.finish();ctx.tick(.3);assert.equal(a.panel().dataset.audioLoop,'none');assert.equal(activeNodes(ctx).length,0);
 });
 const report={passed:results.filter(r=>r.ok).length,total:results.length,measurements,limits:'Actual coffee state callbacks and actual core RAF code, mocked DOM and Web Audio. No browser, production deployment, acoustic listening, or perceptual quality claim.',results};
 console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
})();
