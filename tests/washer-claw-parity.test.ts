// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {ResourceScope} from '../src/app/scope';
import {scopedDocument} from '../src/app/scoped-dom';
import {createWasherRuntime} from '../src/engines/washer/runtime.js';
import {createWasherModel} from '../src/exhibits/washer/model.js';
import {createClawRuntime} from '../src/engines/claw/runtime.js';
import {createClawModel} from '../src/exhibits/claw/model.js';
import {mountClaw} from '../src/exhibits/claw/index.js';
import {mountWasher} from '../src/exhibits/washer/index.js';
import {createAudioService} from '../src/shared/audio.js';
import {createObservation} from '../src/shared/observation.js';

type State=Record<string,unknown>;
type Step=(dt:number)=>boolean|void;
type NativeUI={st:State;animate:(step:Step)=>void;render:()=>void;invalidate:()=>void;flash:(text:string,ms?:number)=>void};
type Config={state:State;acts:Record<string,(state:State,element:Element|null,ui:NativeUI)=>void>;scene:(state:State,palette:unknown)=>string;buttons:Array<{onClick?:(state:State,ui:NativeUI)=>void;choices?:(state:State)=>Array<{onClick:(state:State,ui:NativeUI)=>void}>}>};
class Clock{
 serial=0;frames=new Map<number,FrameRequestCallback>();history:FrameRequestCallback[]=[];
 install(){vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{const id=++this.serial;this.frames.set(id,fn);this.history.push(fn);return id;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>this.frames.delete(id));}
 advance(ms:number){const end=performance.now()+ms;while(performance.now()<end){vi.advanceTimersByTime(Math.min(20,end-performance.now()));const pending=[...this.frames.values()];this.frames.clear();pending.forEach(fn=>fn(performance.now()));}}
}
let clock:Clock,cleanups:Array<()=>void>;
beforeEach(()=>{document.body.replaceChildren();Object.defineProperty(document,'hidden',{configurable:true,value:false});cleanups=[];Object.defineProperty(SVGSVGElement.prototype,'getScreenCTM',{configurable:true,value:()=>null});clock=new Clock();clock.install();});
afterEach(()=>{for(const fn of cleanups.reverse())fn();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();document.body.replaceChildren();});
function fixture(){const root=document.createElement('section');document.body.append(root);const scope=new ResourceScope();cleanups.push(()=>scope.dispose());return {root,scope};}
function click(root:ParentNode,selector:string){const node=root.querySelector(selector);expect(node,selector).not.toBeNull();node!.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0,cancelable:true}));return node!;}
function originalWasher(id:'washer'|'claw'='washer'){
 const {root,scope}=fixture(),steps=new Set<Step>();
 const source=fs.readFileSync('tests/fixtures/complete-source/'+(id==='washer'?'washer-study':'claw-studio')+'/dist/index.html','utf8');
 const scripts=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
 const context=vm.createContext({document:scopedDocument(root,scope),window:{},console,performance,location:{search:''},URLSearchParams,Image,matchMedia:window.matchMedia,addEventListener:(...args:Parameters<ResourceScope['listen']> extends [EventTarget,...infer Rest]?Rest:never)=>scope.listen(window,...args),requestAnimationFrame:scope.raf,cancelAnimationFrame:scope.cancelRaf,setTimeout:scope.timeout,clearTimeout:scope.clearTimeout,__enqueue:(fn:Step)=>steps.add(fn)});
 vm.runInContext(scripts[0]+`\nconst nativeMount=mountFigure;mountFigure=cfg=>{globalThis.config=cfg;const instance=nativeMount(cfg);instance.animate=__enqueue;instance.invalidate=()=>{};globalThis.instance=instance;return instance;};`,context);
 vm.runInContext(id==='washer'?scripts[1]:fs.readFileSync('tests/fixtures/complete-source/claw-studio/dist/app.js','utf8'),context);
 return {root,scope,steps,context,cfg:context.config as Config,ui:context.instance as NativeUI,setView(yaw:number,pitch:number){vm.runInContext(`setCam(${yaw},${pitch})`,context);}};
}
function modernWasher(){
 const {root,scope}=fixture(),steps=new Set<Step>();
 const geometry=createWasherRuntime({root,scope,audio:null,observation:null});
 let cfg!:Config,ui!:NativeUI;
 const wrapped=new Proxy(geometry,{get(target,key,receiver){if(key==='mountFigure')return (config:Config)=>{cfg=config;ui=target.mountFigure(config) as NativeUI;ui.animate=step=>steps.add(step);ui.invalidate=()=>{};return ui;};return Reflect.get(target,key,receiver);}});
 const model=createWasherModel(wrapped,{scope,document:scopedDocument(root,scope),window:{}});
 return {root,scope,steps,cfg,ui,model,setView:geometry.setCam};
}
function stepAll(steps:Set<Step>,dt:number){for(const step of [...steps])if(step(dt)===false)steps.delete(step);}
function actualWasher(){const {root,scope}=fixture(),audioScope=new ResourceScope(),audio=createAudioService(audioScope),observation=createObservation(root,scope);cleanups.push(()=>audioScope.dispose());const controller=mountWasher({root,scope,audio,observation});cleanups.push(()=>controller.dispose());return {root,scope,audio,controller};}

describe('washer full-source parity',()=>{
 it('preserves every physical state transition and layered SVG through loading, wash, pause, unload and several views',()=>{
  const old=originalWasher(),modern=modernWasher();let samples=0;
  const compare=(render=false)=>{expect(JSON.stringify(modern.ui.st)).toBe(JSON.stringify(old.ui.st));if(render){const yaw=[45,135,225,315][samples%4],pitch=[35,18,60][samples%3];modern.setView(yaw,pitch);old.setView(yaw,pitch);modern.ui.render();old.ui.render();expect(modern.root.querySelector('#art')!.innerHTML).toBe(old.root.querySelector('#art')!.innerHTML);expect(modern.root.querySelector('#scene-targets')!.innerHTML).toBe(old.root.querySelector('#scene-targets')!.innerHTML);samples++;}};
  const advance=(frames:number)=>{for(let i=0;i<frames;i++){stepAll(modern.steps,1/60);stepAll(old.steps,1/60);compare(i%90===0);}};
  const act=(name:string)=>{modern.cfg.acts[name](modern.ui.st,null,modern.ui);old.cfg.acts[name](old.ui.st,null,old.ui);compare(true);};
  compare(true);act('laundry');advance(250);expect(modern.ui.st.laundry).toBe('drum');
  act('soap');advance(190);expect(modern.ui.st.soapLvl).toBe(1);
  click(modern.root,'#xrb');click(old.root,'#xrb');advance(50);expect(modern.ui.st.xr).toBe(1);
  act('start');advance(250);act('start');advance(100);expect(modern.ui.st.paused).toBe(true);act('start');advance(2600);
  expect(modern.ui.st.done).toBe(true);expect(modern.ui.st.latch).toBeNull();
  modern.cfg.buttons[4].onClick!(modern.ui.st,modern.ui);old.cfg.buttons[4].onClick!(old.ui.st,old.ui);advance(200);
  expect(modern.ui.st.laundry).toBe('basket');expect(modern.ui.st.unloaded).toBe(true);expect(samples).toBeGreaterThan(35);
 },30000);
});

describe('washer actual lifecycle with shared services',()=>{
 it('mounts the real scene without replacing the shell or exposing document globals',()=>{const sentinel=document.createElement('button');sentinel.textContent='Museum navigation';document.body.append(sentinel);const {root,controller}=actualWasher();expect(sentinel.isConnected).toBe(true);expect(root.querySelectorAll('#art path').length).toBeGreaterThan(100);expect(root.querySelectorAll('.actions>.stepwrap').length).toBe(6);expect(root.querySelector('.mechanism-observer')).not.toBeNull();expect(root.querySelector('.washer-guide')).not.toBeNull();expect(root.querySelectorAll('.mechanical-audio').length).toBe(1);expect(controller.snapshot().laundry).toBe('basket');expect(Reflect.get(window,'__st')).toBeUndefined();expect(root.querySelector('header')).toBeNull();});
 it('freezes loading, releases held input, and resumes without hidden time or duplicate drivers',()=>{const {root,scope,controller}=actualWasher();click(root,'#scene-targets [data-act="laundry"]');clock.advance(240);const svg=root.querySelector('#fig')!;svg.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));controller.pause('manual');controller.pause('navigation');const paused=controller.snapshot();clock.advance(20000);expect(controller.snapshot()).toEqual(paused);expect(scope.diagnostics().frames).toBe(0);controller.resume('manual');expect(controller.snapshot().lifecyclePaused).toBe(true);controller.resume('navigation');controller.resume('navigation');expect(scope.diagnostics().frames).toBeLessThanOrEqual(1);clock.advance(40);expect(Number(controller.snapshot().door)-Number(paused.door)).toBeLessThan(.1);expect(root.querySelector('.is-pressed')).toBeNull();});
 it('reset invalidates transfer, flash and retained RAF work, and snapshots cannot mutate the model',()=>{const {root,scope,controller}=actualWasher();click(root,'#scene-targets [data-act="laundry"]');clock.advance(1200);expect(controller.snapshot().xfer).not.toBeNull();const snapshot=controller.snapshot();(snapshot.xfer as {T:number}).T=999;expect((controller.snapshot().xfer as {T:number}).T).not.toBe(999);const oldFrames=[...clock.history];controller.reset();expect(controller.snapshot()).toMatchObject({laundry:'basket',door:0,xfer:null});oldFrames.forEach(fn=>fn(performance.now()+10000));clock.advance(10000);expect(controller.snapshot()).toMatchObject({laundry:'basket',door:0,xfer:null,run:false});expect(scope.diagnostics()).toMatchObject({frames:0,timers:0});});
 it('disposes terminally and retained nodes cannot affect the replacement or steal its focus',()=>{const first=actualWasher();const oldButton=first.root.querySelector('.actions .act') as HTMLButtonElement;const oldHandler=oldButton.onclick;click(first.root,'#scene-targets [data-act="laundry"]');clock.advance(100);first.controller.dispose();const second=actualWasher();const focus=second.root.querySelector('.actions .act') as HTMLButtonElement;focus.focus();const fresh=second.controller.snapshot();first.controller.dispose();first.controller.resume('manual');first.controller.reset();oldButton.click();oldHandler?.call(oldButton,new MouseEvent('click') as PointerEvent);window.dispatchEvent(new Event('pageshow'));window.dispatchEvent(new Event('blur'));clock.advance(3000);expect(second.controller.snapshot()).toMatchObject({laundry:fresh.laundry,door:0,xfer:null});expect(document.activeElement).toBe(focus);expect(first.scope.diagnostics()).toMatchObject({active:false,frames:0,timers:0,listeners:0});});
});

function modernClaw(){
 const {root,scope}=fixture(),steps=new Set<Step>();
 const geometry=createClawRuntime({root,scope,audio:null,observation:null});
 let cfg!:Config,ui!:NativeUI;
 const wrapped=new Proxy(geometry,{get(target,key,receiver){if(key==='mountFigure')return (config:Config)=>{cfg=config;ui=target.mountFigure(config) as NativeUI;ui.animate=step=>steps.add(step);ui.invalidate=()=>{};return ui;};return Reflect.get(target,key,receiver);}});
 const model=createClawModel(wrapped,{root,scope,audio:null,observation:null});
 return {root,scope,steps,cfg,ui,model,setView:geometry.setCam};
}
function actualClaw(){const {root,scope}=fixture(),audioScope=new ResourceScope(),audio=createAudioService(audioScope),observation=createObservation(root,scope);cleanups.push(()=>audioScope.dispose());const controller=mountClaw({root,scope,audio,observation});cleanups.push(()=>controller.dispose());return {root,scope,audio,controller};}

describe('claw full-source parity',()=>{
 it('preserves miss, all four pickups, counts and painter order at every phase and several views',()=>{
  const old=originalWasher('claw'),modern=modernClaw();let samples=0;const phases=new Set<string>();
  const compare=(render=false)=>{expect(JSON.stringify(modern.ui.st)).toBe(JSON.stringify(old.ui.st));if(render){const yaw=[38,128,218,308][samples%4],pitch=[23,45,65][samples%3];modern.setView(yaw,pitch);old.setView(yaw,pitch);modern.ui.render();old.ui.render();expect(modern.root.querySelector('#art')!.innerHTML).toBe(old.root.querySelector('#art')!.innerHTML);samples++;}};
  const advance=(frames:number)=>{for(let i=0;i<frames;i++){const previous=String(modern.ui.st.phase);stepAll(modern.steps,1/60);stepAll(old.steps,1/60);const phase=String(modern.ui.st.phase);phases.add(phase);compare(phase!==previous||i%120===0);}};
  const act=(name:string,index?:number)=>{const target=document.createElement('button');if(index!==undefined)target.dataset.i=String(index);modern.cfg.acts[name](modern.ui.st,target,modern.ui);old.cfg.acts[name](old.ui.st,target,old.ui);compare(true);};
  compare(true);for(let n=0;n<2;n++){click(modern.root,'.pad [data-dir="right"]');click(old.root,'.pad [data-dir="right"]');}advance(30);act('drop');advance(240);expect(modern.ui.st.result).toBe('miss');
  for(let index=0;index<4;index++){act('aim',index);advance(45);act('drop');advance(450);expect(modern.ui.st.phase).toBe('prize');act('collect');advance(70);expect(modern.ui.st.phase).toBe('idle');expect((modern.ui.st.won as string[]).length).toBe(index+1);}
  expect(modern.ui.st.stock).toEqual([]);expect(modern.ui.st.tries).toBe(5);expect([...phases]).toEqual(expect.arrayContaining(['down','close','up','reopen','travel','release','fall','eject','prize','collect','return','idle']));
  act('drop');expect(modern.ui.st.stock).toEqual([0,1,2,3]);expect(modern.ui.st.tries).toBe(0);expect(samples).toBeGreaterThan(50);
 },30000);
});

describe('claw actual lifecycle with shared services',()=>{
 it('mounts actual geometry, controls and optional lesson inside its own root',()=>{const sentinel=document.createElement('button');document.body.append(sentinel);const {root,controller}=actualClaw();expect(sentinel.isConnected).toBe(true);expect(root.querySelectorAll('#art path').length).toBeGreaterThan(1000);expect(root.querySelectorAll('.pad [data-dir]').length).toBe(4);expect(root.querySelector('.claw-guide')).not.toBeNull();expect(root.querySelectorAll('.mechanical-audio').length).toBe(1);expect(controller.snapshot()).toMatchObject({stock:[0,1,2,3],tries:0,won:[]});expect(Reflect.get(window,'__st')).toBeUndefined();});
 it('freezes an actual grab across overlapping pauses without catch-up and cancels stale work on reset',()=>{const {root,scope,controller}=actualClaw();click(root,'.actions .act');clock.advance(240);controller.pause('manual');controller.pause('navigation');const paused=controller.snapshot();clock.advance(15000);expect(controller.snapshot()).toEqual(paused);expect(scope.diagnostics().frames).toBe(0);controller.resume('manual');expect(controller.snapshot().paused).toBe(true);controller.resume('navigation');controller.resume('navigation');expect(scope.diagnostics().frames).toBeLessThanOrEqual(1);clock.advance(40);expect(Number(controller.snapshot().timer)-Number(paused.timer)).toBeLessThan(.07);const stale=[...clock.history];controller.reset();stale.forEach(fn=>fn(performance.now()+30000));clock.advance(2000);expect(controller.snapshot()).toMatchObject({phase:'idle',stock:[0,1,2,3],tries:0,won:[],timer:0});expect(scope.diagnostics()).toMatchObject({frames:0,timers:0});});
 it('releases held arrows and preserves the claw-specific Shift+arrow orbit policy',()=>{const {root,controller}=actualClaw();const svg=root.querySelector('#fig') as SVGSVGElement;svg.focus();const initial=controller.snapshot();svg.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));clock.advance(120);expect(controller.snapshot().x).not.toBe(initial.x);expect(controller.snapshot().camera).toEqual(initial.camera);controller.pause('manual');const stopped=controller.snapshot();controller.resume('manual');clock.advance(160);expect(controller.snapshot()).toMatchObject({x:stopped.x,y:stopped.y,jx:0,jy:0,moving:false});svg.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true,cancelable:true}));clock.advance(300);expect(controller.snapshot().camera).not.toEqual(initial.camera);expect(controller.snapshot()).toMatchObject({x:stopped.x,y:stopped.y});});
 it('keeps old controls inert after replacement and returns listener ownership to zero',()=>{const first=actualClaw();const old=first.root.querySelector('.pad [data-dir="left"]') as HTMLButtonElement;const retained=old.onclick;click(first.root,'.actions .act');first.controller.dispose();const next=actualClaw();const current=next.controller.snapshot();old.click();retained?.call(old,new MouseEvent('click') as PointerEvent);first.controller.reset();first.controller.resume('manual');first.controller.dispose();clock.advance(3000);expect(next.controller.snapshot()).toMatchObject({x:current.x,y:current.y,phase:'idle',tries:0});expect(first.scope.diagnostics()).toMatchObject({active:false,listeners:0,frames:0,timers:0});const snapshot=next.controller.snapshot();snapshot.stock.pop();expect(next.controller.snapshot().stock).toEqual([0,1,2,3]);});
});

describe('washer and claw shared museum ownership',()=>{
 it('switches actual mechanisms repeatedly with one shared audio service and no stale input or resources',()=>{
  const audioScope=new ResourceScope(),audio=createAudioService(audioScope);cleanups.push(()=>audioScope.dispose());
  const root=document.createElement('section');document.body.append(root);
  const run=(mount:typeof mountWasher|typeof mountClaw)=>{const scope=new ResourceScope();const controller=mount({root,scope,audio,observation:createObservation(root,scope)});cleanups.push(()=>controller.dispose());return {scope,controller};};
  const baselines=new Map<string,number>();
  for(let round=0;round<3;round++)for(const [name,mount]of [['washer',mountWasher],['claw',mountClaw]] as const){
   const {scope,controller}=run(mount),count=scope.diagnostics().listeners;
   if(baselines.has(name))expect(count).toBe(baselines.get(name));else baselines.set(name,count);
   expect(root.querySelectorAll('.mechanical-audio').length).toBe(1);
   const button=root.querySelector('.actions .act') as HTMLButtonElement,retained=button.onclick;
   button.click();clock.advance(40);controller.dispose();button.click();retained?.call(button,new MouseEvent('click') as PointerEvent);
   expect(scope.diagnostics()).toMatchObject({active:false,listeners:0,frames:0,timers:0});expect(root.querySelector('.mechanical-audio')).toBeNull();
  }
  expect(clock.frames.size).toBe(0);
 });
 it('preserves focus by toy identity when the real claw redraw replaces SVG controls',()=>{
  const {root,controller}=actualClaw();
  const toy=root.querySelector('#art [data-act="aim"][data-i="2"]') as SVGElement;expect(toy).not.toBeNull();toy.focus();
  toy.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));clock.advance(80);
  expect(controller.snapshot().target).toBe(2);expect(document.activeElement?.getAttribute('data-act')).toBe('aim');expect(document.activeElement?.getAttribute('data-i')).toBe('2');
  controller.pause('manual');expect(root.querySelector('.is-pressed')).toBeNull();
 });
});

describe('failed mount cleanup',()=>{
 it.each([['washer',mountWasher],['claw',mountClaw]] as const)('releases %s resources and its audio attachment when observation setup fails',(_name,mount)=>{
  const {root,scope}=fixture(),audioScope=new ResourceScope(),audio=createAudioService(audioScope);cleanups.push(()=>audioScope.dispose());
  const observer=createObservation(root,scope),observation={...observer,mount(){throw new Error('fixture observation failure');}};
  expect(()=>mount({root,scope,audio,observation})).toThrow('fixture observation failure');
  expect(scope.diagnostics()).toMatchObject({active:false,frames:0,timers:0,listeners:0});
  expect(root.querySelector('.mechanical-audio')).toBeNull();
 });
});
