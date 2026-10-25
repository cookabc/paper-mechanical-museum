import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {performance as realClock} from 'node:perf_hooks';
import {ResourceScope} from '../src/app/scope';
import {scopedDocument} from '../src/app/scoped-dom';
import {createColorFiguresRuntime} from '../src/engines/colorfigures/runtime.js';
import {createMusicbox} from '../src/exhibits/musicbox/model.js';
import {createTurntable} from '../src/exhibits/turntable/model.js';
import {createElevator} from '../src/exhibits/elevator/model.js';
import {createElevatorOcclusion} from '../src/exhibits/elevator/occlusion.js';
import {mountMusicbox} from '../src/exhibits/musicbox/index.js';
import {mountTurntable} from '../src/exhibits/turntable/index.js';
import {mountElevator} from '../src/exhibits/elevator/index.js';
import {createAudioService} from '../src/shared/audio.js';
import {createObservation} from '../src/shared/observation.js';

type Id='musicbox'|'turntable'|'elevator';
type State=Record<string,unknown>;
type Step=(dt:number)=>boolean;
type UI={animate:(step:Step,options?:object)=>void;invalidate:()=>void;flash:(message:string)=>void;audio:{reset:()=>void}};
type Config={state:State;scene:((state:State,palette:unknown)=>string)&{layers?:Array<{key:string;svg:string}>};buttons:Array<{label:string;onClick:(state:State,ui:UI)=>void}>;acts:Record<string,(state:State,event:{dataset:Record<string,string>}|null,ui:UI)=>void>;setup?:(ui:UI)=>void;lesson:{read:(state:State)=>unknown;onToggle:(state:State,on:boolean,ui:UI)=>void;onAdvance:(state:State,ui:UI)=>void;onChoice:(state:State,id:string,ui:UI)=>void};lifecycle:{pause?:(ui:UI)=>void;resume?:(ui:UI)=>void;reset:(ui:UI)=>void;dispose?:(ui:UI)=>void}};
const factory={musicbox:createMusicbox,turntable:createTurntable,elevator:createElevator};
const mounts={musicbox:mountMusicbox,turntable:mountTurntable,elevator:mountElevator};
const base='tests/fixtures/complete-source/object-collection/dist/';
const cleanups:Array<()=>void>=[];
let frames:Map<number,FrameRequestCallback>,history:FrameRequestCallback[],serial:number;
beforeEach(()=>{
 document.body.replaceChildren();Object.defineProperty(document,'hidden',{configurable:true,value:false});
 frames=new Map();history=[];serial=0;
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{const id=++serial;frames.set(id,fn);history.push(fn);return id;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
});
afterEach(()=>{for(const dispose of cleanups.splice(0).reverse())dispose();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();document.body.replaceChildren();});
function scope(){const value=new ResourceScope();cleanups.push(()=>value.dispose());return value;}
function root(){const value=document.createElement('section');document.body.append(value);return value;}
function clock(ms:number){const end=performance.now()+ms;while(performance.now()<end){vi.advanceTimersByTime(Math.min(20,end-performance.now()));const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(performance.now());}}
function pointer(target:Element,type:string,x=10,y=10,time=10){const event=new Event(type,{bubbles:true,cancelable:true});for(const [key,value]of Object.entries({pointerId:7,isPrimary:true,button:0,clientX:x,clientY:y,timeStamp:time}))Object.defineProperty(event,key,{value});target.dispatchEvent(event);}
function click(host:ParentNode,selector:string){const target=host.querySelector(selector);expect(target,selector).not.toBeNull();target!.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:0}));return target!;}
function normalize(svg:string){return svg.replace(/musicbox-\d+-hinge/g,'musicbox-instance-hinge');}
function parity(id:Id,setup=false){
 const host=root(),owned=scope(),geometry=createColorFiguresRuntime({root:host,scope:owned,audio:null,observation:null});
 const modern=factory[id](geometry,{scope:owned,document:scopedDocument(host,owned),audio:null,observation:null,occlusion:createElevatorOcclusion(geometry)}) as unknown as Config;
 const oldRoot=root(),oldScope=scope(),oldWindow=new EventTarget();
 const old=vm.createContext({window:oldWindow,document:scopedDocument(oldRoot,oldScope),console,addEventListener(){}});
 vm.runInContext(fs.readFileSync(base+'core.js','utf8')+'\n'+(id==='elevator'?fs.readFileSync(base+'elevator-occlusion.js','utf8'):'')+'\n'+fs.readFileSync(base+`scenes/${id}.js`,'utf8')+`\nglobalThis.cfg=window.SCENES.${id}();`,old);
 const original=old.cfg as Config,callbacks=new Set<Step>(),oldCallbacks=new Set<Step>(),messages:string[]=[],oldMessages:string[]=[];
 const ui:UI={animate:fn=>{callbacks.add(fn);},invalidate(){},flash:message=>{messages.push(message);},audio:{reset(){}}};
 const oldUi:UI={...ui,animate:fn=>{oldCallbacks.add(fn);},flash:message=>{oldMessages.push(message);}};
 const equal=()=>{expect(JSON.stringify(modern.state)).toBe(JSON.stringify(original.state));expect(messages).toEqual(oldMessages);expect(JSON.stringify(modern.lesson.read(modern.state))).toBe(JSON.stringify(original.lesson.read(original.state)));};
 const tick=(count:number,dt=1/60)=>{for(let i=0;i<count;i++){for(const fn of [...callbacks])if(fn(dt)===false)callbacks.delete(fn);for(const fn of [...oldCallbacks])if(fn(dt)===false)oldCallbacks.delete(fn);equal();}};
 const button=(label:string)=>{const current=modern.buttons.find(b=>b.label===label),legacy=original.buttons.find(b=>b.label===label);expect(current,label).toBeDefined();expect(legacy,label).toBeDefined();current!.onClick(modern.state,ui);legacy!.onClick(original.state,oldUi);equal();};
 const action=(key:string,dataset:Record<string,string>={})=>{modern.acts[key](modern.state,{dataset},ui);original.acts[key](original.state,{dataset},oldUi);equal();};
 const views=(poses=[[45,35],[90,20],[165,55],[270,35]])=>{for(const [yaw,pitch] of poses){geometry.setCam(yaw,pitch);old.yaw=yaw;old.pitch=pitch;vm.runInContext('setCam(yaw,pitch)',old);const actual=modern.scene(modern.state,geometry.PALS.mint),expected=vm.runInContext('cfg.scene(cfg.state,PALS.mint)',old);expect(normalize(actual)).toBe(normalize(expected));if(id==='elevator'){expect(modern.scene.layers!.map(p=>p.key)).toEqual(Array.from(original.scene.layers!,p=>p.key));expect(normalize(modern.scene.layers!.map(p=>p.svg).join(''))).toBe(normalize(original.scene.layers!.map(p=>p.svg).join('')));}}};
 if(setup){host.innerHTML=oldRoot.innerHTML='<svg id="fig"><g data-act="crank"></g></svg>';modern.setup?.(ui);original.setup?.(oldUi);}
 return {modern,original,ui,oldUi,host,oldRoot,geometry,old,owned,callbacks,oldCallbacks,tick,button,action,equal,views};
}

describe('source parity for the two instruments and elevator',()=>{
 it('musicbox preserves pin-release counts, lid/hinge geometry, lessons and reset through a complete crank cycle',()=>{
  const p=parity('musicbox');p.views();p.button('摇动手柄');p.tick(12);p.views();p.button('摇动手柄');p.button('开合盒盖');p.tick(18);p.views();p.tick(180);p.views();
  expect(Number(p.modern.state.notes)).toBeGreaterThan(0);expect(p.modern.state.energy).toBe(0);expect(p.modern.state.lid).toBe(0);
  p.modern.lesson.onToggle(p.modern.state,true,p.ui);p.original.lesson.onToggle(p.original.state,true,p.oldUi);
  p.modern.lesson.onChoice(p.modern.state,'open-lid',p.ui);p.original.lesson.onChoice(p.original.state,'open-lid',p.oldUi);p.tick(90);p.views();
  p.button('重新开始');p.tick(3);expect(p.callbacks.size).toBe(0);expect(p.oldCallbacks.size).toBe(0);p.views();
 },30_000);
 it('musicbox keeps real pointer release, reverse travel, cancellation and stale-driver reset identical to old source',()=>{
  const p=parity('musicbox',true),target=p.host.querySelector('[data-act]')!,legacy=p.oldRoot.querySelector('[data-act]')!;
  const both=(type:string,x:number,y:number,time:number)=>{pointer(target,type,x,y,time);pointer(legacy,type,x,y,time);p.equal();};
  both('pointerdown',10,10,0);both('pointermove',80,10,50);both('pointermove',0,10,100);expect(p.modern.state.direction).toBe(-1);both('pointerup',0,10,150);p.tick(30);p.views();
  both('pointerdown',10,10,200);both('pointermove',80,10,250);both('pointercancel',80,10,300);expect(p.modern.state.crankHeld).toBe(false);expect(p.modern.state.energy).toBe(0);
  p.button('摇动手柄');p.tick(1);p.button('重新开始');p.tick(100);expect(p.modern.state.notes).toBe(0);expect(p.callbacks.size).toBe(0);
 },30_000);
 it('turntable preserves lift-before-transfer, rpm changes, coasting, playback end and automatic return',()=>{
  const p=parity('turntable');p.views();p.button('播放 / 暂停');p.tick(25);p.button('移入唱臂 / 抬针 / 落针');p.tick(3);p.views();p.tick(70);expect(p.modern.state.arm).toBe(1);expect(p.modern.state.cue).toBe('hover');p.views();
  p.button('移入唱臂 / 抬针 / 落针');p.tick(45);p.views();expect(Number(p.modern.state.elapsed)).toBeGreaterThan(0);
  p.button('切换 33 / 45 转');p.tick(60);p.views();expect(p.modern.state.rpm).toBe(45);
  p.button('播放 / 暂停');p.tick(55);expect(p.modern.state.platterRpm).toBe(0);p.views();p.button('播放 / 暂停');p.tick(1800);p.views();
  expect(p.modern.state.ended).toBe(true);expect(p.modern.state.cue).toBe('rest');expect(p.modern.state.elapsed).toBe(36);expect(p.callbacks.size).toBe(0);
  p.button('重新开始');p.tick(3);p.views();expect(p.modern.state.elapsed).toBe(0);
 },30_000);
 it('turntable preserves interrupted cue/park transitions and live lesson choices without stale reset work',()=>{
  const p=parity('turntable');p.button('移入唱臂 / 抬针 / 落针');p.tick(1);p.button('唱臂归位');p.tick(100);expect(p.modern.state.arm).toBe(0);expect(p.modern.state.lift).toBe(1);p.views();
  p.modern.lesson.onToggle(p.modern.state,true,p.ui);p.original.lesson.onToggle(p.original.state,true,p.oldUi);
  p.modern.lesson.onChoice(p.modern.state,'rpm-45',p.ui);p.original.lesson.onChoice(p.original.state,'rpm-45',p.oldUi);p.tick(15);p.equal();
  p.button('移入唱臂 / 抬针 / 落针');p.tick(20);p.button('重新开始');p.tick(120);expect(p.callbacks.size).toBe(0);expect(p.modern.state.cue).toBe('rest');p.views();
 },30_000);
 it('elevator preserves full occlusion layers and door interlocks during reversals, queued journeys and reset',()=>{
  const p=parity('elevator');p.views([[45,35],[135,20],[225,50]]);p.action('floor',{floor:'3'});p.tick(15);p.views([[45,35],[135,20]]);p.button('开门');p.tick(35);p.views([[45,35],[225,50]]);p.tick(120);expect(p.modern.state.phase).toBe('moving');
  p.action('floor',{floor:'2'});p.action('floor',{floor:'2'});p.button('开门');p.views([[45,35],[135,20],[225,50]]);p.tick(900);p.views([[45,35],[135,20],[225,50]]);
  expect(p.modern.state.floor).toBe(2);expect(p.modern.state.trips).toBe(2);expect(p.modern.state.door).toBe(1);expect(p.callbacks.size).toBe(0);
  p.button('关门');p.tick(18);p.button('开门');p.tick(100);p.views([[45,35],[225,50]]);p.action('floor',{floor:'1'});p.tick(20);p.button('回到一楼');p.tick(3);expect(p.callbacks.size).toBe(0);p.views([[45,35],[135,20],[225,50]]);
 },60_000);
 it('elevator reprojects independent occlusion caches after camera and light changes',()=>{
  const p=parity('elevator');p.views([[45,35],[90,35],[45,35]]);
  p.geometry.setLight(80);vm.runInContext('setLight(80)',p.old);p.modern.state.az=80;p.original.state.az=80;p.views([[45,35],[180,35]]);
  p.modern.state.exploreOpen=true;p.original.state.exploreOpen=true;
  for(const part of ['drive','counterweight','cabin','locks']){p.action('inspect',{part});p.views([[45,35],[110,25]]);}
  p.modern.lesson.onToggle(p.modern.state,true,p.ui);p.original.lesson.onToggle(p.original.state,true,p.oldUi);
  p.modern.lesson.onChoice(p.modern.state,'floor-3',p.ui);p.original.lesson.onChoice(p.original.state,'floor-3',p.oldUi);p.tick(100);p.views([[45,35],[270,35]]);
 },60_000);
});

function mount(id:Id){const host=root(),owned=scope(),audioScope=scope(),audio=createAudioService(audioScope),observation=createObservation(host,owned),controller=mounts[id]({root:host,scope:owned,audio,observation});cleanups.push(()=>controller.dispose());return {host,owned,audio,controller};}
describe('real adapter interruption and resource ownership',()=>{
 for(const id of ['musicbox','turntable','elevator'] as const){
  it(`${id} treats scope-only disposal as terminal for retained controllers`,()=>{
   const {host,owned,audio,controller}=mount(id);
   click(host,id==='musicbox'?'[data-act="crank"]':id==='turntable'?'[data-act="play"]':'[data-act="floor"][data-floor="3"]');clock(40);owned.dispose();
   const terminal=controller.snapshot(),changed=vi.fn(),off=audio.onChange(changed);
   controller.pause('manual');controller.reset();controller.resume('manual');
   expect(controller.snapshot()).toEqual(terminal);expect(terminal.disposed).toBe(true);expect(changed).not.toHaveBeenCalled();off();
  });
  it(`${id} owns its DOM, freezes for overlapping reasons and leaves no callbacks or listeners after disposal`,()=>{
   const outside=root();outside.innerHTML='<button id="fig">outside</button>';const {host,owned,audio,controller}=mount(id);
   expect(outside.textContent).toBe('outside');expect(host.querySelectorAll('svg path').length).toBeGreaterThan(50);expect(host.querySelectorAll('.mechanical-audio')).toHaveLength(1);expect(host.querySelector('iframe')).toBeNull();
   const selector=id==='musicbox'?'[data-act="crank"]':id==='turntable'?'[data-act="play"]':'[data-act="floor"][data-floor="3"]';
   const control=click(host,selector);clock(40);controller.pause('manual');controller.pause('hidden');const paused=controller.snapshot();
   control.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));clock(2000);expect(controller.snapshot()).toEqual(paused);expect(frames.size).toBe(0);
   controller.resume('manual');expect(frames.size).toBe(0);controller.resume('hidden');controller.resume('hidden');clock(20);expect(audio.enabled).toBe(false);expect(owned.diagnostics().frames).toBeLessThanOrEqual(1);
   if(id==='musicbox')expect(controller.snapshot()).toMatchObject({energy:0,crankHeld:false});if(id==='turntable')expect(controller.snapshot()).toMatchObject({playing:false,platterRpm:0});
   controller.reset();clock(30);expect(controller.snapshot()).toMatchObject(id==='musicbox'?{angle:0,notes:0}:id==='turntable'?{cue:'rest',elapsed:0}:{floor:1,pos:0,trips:0});
   const oldFrame=history.at(-1);controller.dispose();const terminal=controller.snapshot();controller.dispose();controller.reset();controller.resume('manual');control.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'));window.dispatchEvent(new Event('blur'));oldFrame?.(performance.now()+500);clock(500);
   expect(controller.snapshot()).toEqual(terminal);expect(owned.diagnostics()).toMatchObject({active:false,frames:0,timers:0,listeners:0});expect(frames.size).toBe(0);expect(outside.textContent).toBe('outside');
  },60_000);
 }
 it('musicbox releases captured crank input on pause and rejects a stale pointerup',()=>{
  const {host,controller}=mount('musicbox'),svg=host.querySelector<SVGSVGElement>('#fig')!,target=host.querySelector('[data-act="crank"]')!;let captured:number|null=null;
  svg.setPointerCapture=id=>{captured=id;};svg.hasPointerCapture=id=>captured===id;svg.releasePointerCapture=()=>{captured=null;};
  pointer(target,'pointerdown');expect(captured).toBe(7);expect(controller.snapshot().crankHeld).toBe(true);controller.pause('manual');expect(captured).toBeNull();controller.resume('manual');pointer(target,'pointerup');expect(controller.snapshot()).toMatchObject({crankHeld:false,energy:0,notes:0});
 });
});

class Param{value=0;cancelScheduledValues=vi.fn();setValueAtTime=vi.fn();exponentialRampToValueAtTime=vi.fn();}
class VoiceNode{type='';frequency=new Param();gain=new Param();onended:(()=>void)|null=null;connect=vi.fn();disconnect=vi.fn();start=vi.fn();stop=vi.fn();}
function instrumentAudio(){
 const oscillators:VoiceNode[]=[],gains:VoiceNode[]=[],listeners=new Set<(event:{enabled:boolean;reason:string})=>void>();
 const ctx={state:'running',currentTime:0,createOscillator(){const n=new VoiceNode();oscillators.push(n);return n;},createGain(){const n=new VoiceNode();gains.push(n);return n;}};
 const audio={enabled:true,getContext:()=>ctx,getOutput:()=>({}),pulse(){},onChange(fn:(event:{enabled:boolean;reason:string})=>void){listeners.add(fn);return()=>listeners.delete(fn);},suspend(){audio.enabled=false;for(const fn of listeners)fn({enabled:false,reason:'pause'});}};
 return {audio,oscillators,gains,listeners};
}
describe('injected instrument audio lifecycle',()=>{
 for(const id of ['musicbox','turntable'] as const){
  it(`${id} stops scheduled voices and unsubscribes on interruption without reenabling sound`,()=>{
   const host=root(),owned=scope(),bus=instrumentAudio(),geometry=createColorFiguresRuntime({root:host,scope:owned,audio:null,observation:null}),cfg=factory[id](geometry,{scope:owned,document:scopedDocument(host,owned),audio:bus.audio,observation:null}) as unknown as Config;
   host.innerHTML='<svg id="fig"><g data-act="crank"></g></svg>';const callbacks=new Set<Step>(),ui:UI={animate:fn=>{callbacks.add(fn);},invalidate(){},flash(){},audio:{reset(){}}};cfg.setup?.(ui);expect(bus.listeners.size).toBe(1);
   if(id==='musicbox')cfg.acts.crank(cfg.state,null,ui);else {Object.assign(cfg.state,{arm:1,armTarget:1,lift:0,liftTarget:0,cue:'down'});cfg.acts.play(cfg.state,null,ui);}
   for(let i=0;i<30;i++)for(const fn of [...callbacks])if(fn(1/60)===false)callbacks.delete(fn);
   expect(bus.oscillators.length).toBeGreaterThan(0);cfg.lifecycle.pause?.(ui);bus.audio.suspend();owned.pause();const count=bus.oscillators.length;
   for(const o of bus.oscillators){expect(o.onended).toBeNull();expect(o.stop).toHaveBeenCalled();expect(o.disconnect).toHaveBeenCalled();}for(const g of bus.gains)expect(g.disconnect).toHaveBeenCalled();
   owned.resume();cfg.lifecycle.resume?.(ui);for(const fn of [...callbacks])fn(1);expect(bus.oscillators).toHaveLength(count);expect(bus.audio.enabled).toBe(false);
   cfg.lifecycle.reset(ui);cfg.lifecycle.dispose?.(ui);owned.dispose();expect(bus.listeners.size).toBe(0);for(const o of bus.oscillators)expect(o.onended).toBeNull();
  });
 }
});

// Diagnostic only: renderer generation cost is not a browser FPS promise.
describe('same-source renderer cost diagnostic',()=>{
 for(const id of ['musicbox','turntable','elevator'] as const)it(`${id} samples original and adapted SVG generation under the same poses`,()=>{
  const p=parity(id),oldPalette=vm.runInContext('PALS.mint',p.old),oldCam=vm.runInContext('(y,p)=>setCam(y,p)',p.old);
  const times={original:[] as number[],adapted:[] as number[]};
  for(let pass=0;pass<4;pass++)for(const kind of pass%2?['adapted','original']:['original','adapted']){
   const start=realClock.now();for(let i=0;i<24;i++){const yaw=45+i*.4,pitch=35;if(kind==='adapted'){p.geometry.setCam(yaw,pitch);p.modern.scene(p.modern.state,p.geometry.PALS.mint);}else{oldCam(yaw,pitch);p.original.scene(p.original.state,oldPalette);}}
   if(pass)times[kind as keyof typeof times].push((realClock.now()-start)/24);
  }
  const median=(x:number[])=>x.sort((a,b)=>a-b)[Math.floor(x.length/2)];console.info('RENDER_COST',id,JSON.stringify({originalMs:median(times.original),adaptedMs:median(times.adapted),scope:'Node SVG generation, 24 rotating poses, warmup excluded'}));
  p.views();
 },30_000);
});
