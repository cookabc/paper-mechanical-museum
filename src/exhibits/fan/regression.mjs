/** Deterministic source differential and mount lifecycle checks. No browser/eval in production. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { mountFan } from './index.js';

const reference = new URL('../../../tests/fixtures/complete-source/fan-study/dist/', import.meta.url);
const read = name => fs.readFileSync(new URL(name, reference), 'utf8');
const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const stateKeys = ['on','speed','oscillate','color','angle','velocity','phase','headYaw','knob','pressed','pressLeft'];
const plain = value => JSON.parse(JSON.stringify(value));

function createHarness(legacy = false, parseArt = false) {
 const dom = new JSDOM(legacy ? read('index.html') : '<div id="host"></div><button id="outside">Outside</button>', {runScripts:'outside-only',url:'https://museum.test/'});
 const win=dom.window,doc=win.document,root=legacy?doc.body:doc.querySelector('#host');
 let now=0,serial=0,active=true,paused=false,events=0,markup='';
 const frames=new Map(),timers=new Map(),cleanups=[],audioEvents=[],textureImages=[];
 Object.defineProperty(doc,'hidden',{value:false,writable:true});
 Object.defineProperty(win.performance,'now',{value:()=>now});
 // Texture encoding is browser work. Hold images pending to test cancellation ownership.
 win.Image=class {constructor(){textureImages.push(this)}set src(value){this.source=value}get src(){return this.source}};
 function ownArt(node){
  if(parseArt)return;
  Object.defineProperty(node,'innerHTML',{get:()=>markup,set:value=>{markup=value},configurable:true});
 }
 if(legacy)ownArt(doc.querySelector('#art'));
 else {const query=root.querySelector.bind(root);root.querySelector=selector=>{const node=query(selector);if(selector==='#art')ownArt(node);return node};}
 const scope={
  get active(){return active},get paused(){return paused},now:()=>now,
  listen(target,type,handler,options){target.addEventListener(type,handler,options);events++;let live=true;const off=()=>{if(!live)return;live=false;target.removeEventListener(type,handler,options);events--};cleanups.push(off);return off},
  raf(fn){if(!active)return 0;frames.set(++serial,fn);return serial},cancelRaf:id=>frames.delete(id),
  timeout(fn,delay=0){if(!active)return 0;timers.set(++serial,{fn,due:now+delay});return serial},clearTimeout:id=>timers.delete(id),
  onCleanup:fn=>cleanups.push(fn),pause(){paused=true},resume(){paused=false},
  dispose(){if(!active)return;active=false;frames.clear();timers.clear();for(const cleanup of cleanups.splice(0).reverse())cleanup()},
  diagnostics:()=>({active,paused,frames:frames.size,timers:timers.size,listeners:events}),
 };
 win.requestAnimationFrame=scope.raf;win.cancelAnimationFrame=scope.cancelRaf;win.setTimeout=scope.timeout;win.clearTimeout=scope.clearTimeout;
 const audio={attach:()=>()=>audioEvents.push('detach'),update:()=>{},pulse:kind=>audioEvents.push(kind),reset:()=>audioEvents.push('reset'),suspend:reason=>audioEvents.push('suspend:'+reason),setRate:()=>{}};
 let observationOptions;
 const observation={mount(options){observationOptions=options;const panel=doc.createElement('details');options.host.prepend(panel);return{panel,update(){},reset(){options.onRate(1)},dispose(){panel.remove()}}},mountLesson(){return null}};
 let controller;
 if(legacy){vm.runInContext(read('engine.js'),dom.getInternalVMContext());vm.runInContext(read('fan.js'),dom.getInternalVMContext());}
 else controller=mountFan({root,scope,audio,observation});
 const svg=root.querySelector('#figure');let capture=null;
 svg.setPointerCapture=id=>{capture=id};svg.hasPointerCapture=id=>capture===id;svg.releasePointerCapture=()=>{capture=null};
 const event=(target,type,properties={})=>{const e=new win.Event(type,{bubbles:true,cancelable:true});for(const [key,value] of Object.entries(properties))Object.defineProperty(e,key,{value});target.dispatchEvent(e);return e};
 const tick=time=>{assert.ok(time>=now);now=time;if(paused)return;const batch=[...frames.values()];frames.clear();for(const callback of batch)callback(now);for(const [id,timer] of [...timers])if(timer.due<=now){timers.delete(id);timer.fn()}};
 const advance=(end,hz=60)=>{while(now+1000/hz<end-1e-8)tick(now+1000/hz);if(now<end)tick(end)};
 return {win,doc,root,scope,controller,frames,timers,audioEvents,textureImages,event,tick,advance,
  get now(){return now},get markup(){return parseArt?root.querySelector('#art').innerHTML:markup},
  at(time){assert.ok(time>=now);now=time},
  state(){return legacy?JSON.parse(vm.runInContext('JSON.stringify(state)',dom.getInternalVMContext())):Object.fromEntries(stateKeys.map(key=>[key,controller.snapshot()[key]]))},
  click(selector){const node=root.querySelector(selector);assert.ok(node,selector);node.click()},
  rate(value){if(legacy)vm.runInContext(`settleFanClock();observationRate=${value}`,dom.getInternalVMContext());else observationOptions.onRate(value)},
  close(){controller?.dispose();frames.clear();timers.clear();win.close()},
 };
}

export async function runFanRegression(){
 const results=[];
 const check=async(name,fn)=>{await fn();results.push(name)};
 await check('Original mechanics, geometry, painter order and engine formulas are unchanged',()=>{
  const block=text=>text.slice(text.indexOf('function advanceFan(now){'),text.indexOf('\nfunction frame(now){'));
  assert.equal(block(source),block(read('fan.js')));
  const geometry=text=>text.slice(text.indexOf('function ellipse('),text.indexOf('\nfunction sync(){')).replace('if(disposed)return;','').replace('doc.activeElement','document.activeElement');
  assert.equal(geometry(source),geometry(read('fan.js')));
  const engine=fs.readFileSync(new URL('./paper3d.js',import.meta.url),'utf8').replace('export class Paper3D {','window.Paper3D=class {').replace('\n}\n','\n};\n');
  assert.equal(engine,read('engine.js'));
 });
 await check('State and raw painter output match the original at 30/60/120 Hz',()=>{
  for(const hz of [30,60,120]){
   const old=createHarness(true),next=createHarness();
   try{
    const same=()=>{assert.deepEqual(next.state(),old.state(),`${hz} Hz state at ${next.now}`);assert.equal(next.markup,old.markup,`${hz} Hz paths at ${next.now}`)};
    const action=selector=>{old.click(selector);next.click(selector);same()};
    same();action('[data-speed="3"]');action('#oscillate');action('#power');
    for(const end of [250,500]){old.advance(end,hz);next.advance(end,hz);same()}
    old.at(507);next.at(507);action('[data-speed="1"]');old.advance(750,hz);next.advance(750,hz);same();
    old.rate(.25);next.rate(.25);old.advance(1000,hz);next.advance(1000,hz);same();
    action('#power');old.rate(1);next.rate(1);old.advance(5000,hz);next.advance(5000,hz);same();
    assert.equal(next.frames.size,0,'stopped fan sleeps');
   }finally{old.close();next.close()}
  }
 });
 await check('Native SVG paths and projection hit areas render into the actual DOM',()=>{
  const h=createHarness(false,true);
  try{assert.ok(h.root.querySelectorAll('#art path').length>800);assert.equal(h.root.querySelectorAll('[data-fan-action]').length,5);for(const node of h.root.querySelectorAll('.hit-area'))assert.ok(node.getAttribute('d').startsWith('M'));assert.equal(h.frames.size,0)}finally{h.close()}
 });
 await check('Keyboard and pointer compatibility clicks each activate only once',()=>{
  const h=createHarness();
  try{
   const target=h.root.querySelector('#scene-power');
   for(const key of ['Enter',' ']){const before=h.state().on;h.event(target,'keydown',{key});h.event(target,'click',{detail:0});h.event(target,'keydown',{key,repeat:true});h.event(target,'keyup',{key});h.event(target,'click',{detail:0});assert.equal(h.state().on,!before);h.tick(h.now+20)}
   for(const pointerType of ['mouse','touch','pen'])for(const finish of ['tap','drag','cancel']){
    const before=h.state().on,p={pointerId:17,pointerType,isPrimary:true,button:0,clientX:100,clientY:100};
    h.event(target,'pointerdown',p);if(finish==='drag')h.event(target,'pointermove',{...p,clientX:160});h.event(target,finish==='cancel'?'pointercancel':'pointerup',p);h.event(target,'click',{...p,detail:0});assert.equal(h.state().on,finish==='tap'?!before:before,pointerType+'/'+finish);h.tick(h.now+20);
   }
  }finally{h.close()}
 });
 await check('Pause freezes motion, clears input and resumes without elapsed-time catchup',()=>{
  const h=createHarness();
  try{
   h.click('#power');h.advance(200);h.controller.pause('manual');const before=h.state();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.ok(h.audioEvents.includes('suspend:manual'));
   h.controller.pause('hidden');h.advance(10000);h.controller.resume('manual');assert.equal(h.frames.size,0);assert.deepEqual(h.state(),before);
   h.controller.resume('hidden');assert.equal(h.frames.size,1);assert.deepEqual(h.state(),before);h.controller.resume('hidden');assert.equal(h.frames.size,1);h.tick(10010);assert.ok(h.state().angle-before.angle<.05);
   const target=h.root.querySelector('#scene-power');h.event(target,'pointerdown',{pointerId:42,pointerType:'touch',isPrimary:true,button:0,clientX:1,clientY:1});h.controller.pause('manual');h.controller.resume('manual');const on=h.state().on;h.event(target,'pointerup',{pointerId:42});assert.equal(h.state().on,on);
  }finally{h.close()}
 });
 await check('Controller reset clears machine state; the button still only resets the view',()=>{
  const h=createHarness();
  try{h.click('[data-speed="3"]');h.click('#power');h.advance(100);h.click('#reset');assert.equal(h.state().on,true);assert.equal(h.state().speed,3);h.controller.reset();assert.equal(h.state().on,false);assert.equal(h.state().speed,1);assert.equal(h.state().velocity,0);assert.equal(h.frames.size,0);assert.equal(h.timers.size,0)}finally{h.close()}
 });
 await check('Disposal removes owned hooks, cancels async texture and makes stale input inert',async()=>{
  const h=createHarness();
  const old=h.root.querySelector('#power'),svg=h.root.querySelector('#figure');h.click('#power');h.controller.dispose();const snapshot=plain(h.controller.snapshot());
  old.click();h.event(svg,'keydown',{key:' '});h.event(h.win,'pageshow');h.controller.resume('manual');h.controller.reset();h.controller.dispose();assert.deepEqual(plain(h.controller.snapshot()),snapshot);assert.deepEqual(h.scope.diagnostics(),{active:false,paused:false,frames:0,timers:0,listeners:0});assert.equal(h.root.childElementCount,0);assert.equal(h.audioEvents.filter(x=>x==='detach').length,1);for(const image of h.textureImages){assert.equal(image.onload,null);assert.equal(image.onerror,null);assert.equal(image.src,'')}
  await Promise.resolve();h.close();
 });
 return results;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const results=await runFanRegression();for(const result of results)console.log('PASS',result);console.log(`Fan module: ${results.length}/${results.length} checks passed.`);
}
