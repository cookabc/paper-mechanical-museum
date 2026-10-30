import {beforeEach as beforeLanguage} from 'vitest';
beforeLanguage(()=>{localStorage.setItem('museum-lang','zh');document.documentElement.lang='zh';});
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {ResourceScope} from '../src/app/scope';
import {scopedDocument} from '../src/app/scoped-dom';
import {createColorFiguresRuntime} from '../src/engines/colorfigures/runtime.js';
import {createCamera} from '../src/exhibits/camera/model.js';
import {createVending} from '../src/exhibits/vending/model.js';
import {createToaster} from '../src/exhibits/toaster/model.js';
import {mountCamera} from '../src/exhibits/camera/index.js';
import {mountVending} from '../src/exhibits/vending/index.js';
import {mountToaster} from '../src/exhibits/toaster/index.js';
import {createAudioService} from '../src/shared/audio.js';
import {createObservation} from '../src/shared/observation.js';

type Id='camera'|'vending'|'toaster';
type State=Record<string,unknown>;
type Step=(dt:number)=>boolean|void;
type TestUi={animate:(step:Step)=>void;invalidate:()=>void;flash:(message:string)=>void;beforeAction:()=>void};
type Action=(state:State,event:{dataset:Record<string,string>}|null,ui:TestUi)=>void;
type Scene={
 state:State;
 scene:((state:State,material:unknown)=>string)&{layers?:unknown[]};
 acts:Record<string,Action>;
 buttons:Array<{label:string;onClick?:(state:State,ui:TestUi)=>void;choices?:(state:State)=>Array<{onClick:(state:State,ui:TestUi)=>void}>}>;
 observation:{read:(state:State)=>unknown};
 lesson:{read:(state:State)=>unknown};
};
const factories={camera:createCamera,vending:createVending,toaster:createToaster};
const mounts={camera:mountCamera,vending:mountVending,toaster:mountToaster};
let cleanups:Array<()=>void>;
beforeEach(()=>{cleanups=[];document.body.replaceChildren();Object.defineProperty(document,'hidden',{configurable:true,value:false});});
afterEach(()=>{for(const done of cleanups.reverse())done();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();document.body.replaceChildren();});
const json=(value:unknown)=>JSON.stringify(value);

/** The archived source runs only in a test VM, against its original geometry engine. */
function parity(id:Id){
 const root=document.createElement('main');document.body.append(root);const scope=new ResourceScope();cleanups.push(()=>scope.dispose());
 const geometry=createColorFiguresRuntime({root,scope,audio:null,observation:null});
 const modern=factories[id](geometry,{scope,document:scopedDocument(root,scope),window:{}}) as unknown as Scene;
 const base='tests/fixtures/complete-source/object-collection/dist/';
 const old=vm.createContext({window:{},console,addEventListener(){}});
 vm.runInContext(fs.readFileSync(base+'core.js','utf8')+'\n'+fs.readFileSync(base+'scenes/'+id+'.js','utf8')+'\nglobalThis.cfg=window.SCENES.'+id+'();',old);
 const original=old.cfg as Scene;
 const callbacks=new Set<Step>(),oldCallbacks=new Set<Step>(),history:Step[]=[];
 const messages:string[]=[],oldMessages:string[]=[];
 const ui:TestUi={animate(fn){callbacks.add(fn);history.push(fn);},invalidate(){},flash(message){messages.push(message);},beforeAction(){}};
 const oldUi:TestUi={...ui,animate(fn){oldCallbacks.add(fn);},flash(message){oldMessages.push(message);}};
 let samples=0,ticks=0;
 function compare(){expect(json(modern.state)).toBe(json(original.state));expect(messages).toEqual(oldMessages);expect(json(modern.observation.read(modern.state))).toBe(json(original.observation.read(original.state)));expect(json(modern.lesson.read(modern.state))).toBe(json(original.lesson.read(original.state)));}
 function view(yaw:number,pitch=35){geometry.setCam(yaw,pitch);old.yaw=yaw;old.pitch=pitch;vm.runInContext('setCam(yaw,pitch)',old);
  const markup=modern.scene(modern.state,geometry.PALS.mint);const expected=vm.runInContext('cfg.scene(cfg.state,PALS.mint)',old);
  expect(markup).toBe(expected);expect(json(modern.scene.layers)).toBe(json(original.scene.layers));samples++;
 }
 function tick(dt=1/60){for(const fn of [...callbacks])if(fn(dt)===false)callbacks.delete(fn);for(const fn of [...oldCallbacks])if(fn(dt)===false)oldCallbacks.delete(fn);compare();if(ticks++%13===0)view([45,135,225,315][samples%4],samples%3===0?20:35);}
 function drain(){for(let n=0;(callbacks.size||oldCallbacks.size)&&n<1400;n++)tick();expect(callbacks.size).toBe(0);expect(oldCallbacks.size).toBe(0);compare();}
 function action(name:string,dataset:Record<string,string>={}){modern.acts[name](modern.state,{dataset},ui);original.acts[name](original.state,{dataset},oldUi);compare();}
 function button(label:string,choice?:number){const m=modern.buttons.find(b=>b.label===label)!;const o=original.buttons.find(b=>b.label===label)!;expect(m).toBeDefined();if(choice===undefined){m.onClick!(modern.state,ui);o.onClick!(original.state,oldUi);}else{m.choices!(modern.state)[choice].onClick(modern.state,ui);o.choices!(original.state)[choice].onClick(original.state,oldUi);}compare();}
 for(const yaw of [0,45,90,135,180,225,270,315])view(yaw);
 return {modern,original,scope,callbacks,history,ui,tick,drain,action,button,view,compare,get samples(){return samples;}};
}

describe('camera source parity: real shutter, paper feed, development and stock',()=>{
 it('matches state and actual layered SVG for all five sheets, every landscape and a reload',()=>{
  const p=parity('camera');
  p.action('collect');p.button('装入相纸');
  for(let sheet=0;sheet<5;sheet++){
   p.button('切换风景');p.action('shutter');expect(p.modern.state.frames).toBe(4-sheet);
   p.action('shutter');p.button('切换风景');p.action('collect');p.drain();
   expect(p.modern.state).toMatchObject({phase:'ready',eject:1,develop:1,collected:sheet});
   p.action('collect');p.action('collect');p.drain();expect(p.modern.state.collected).toBe(sheet+1);
  }
  p.action('shutter');expect(p.modern.state).toMatchObject({phase:'idle',frames:0,collected:5});
  p.button('装入相纸');p.tick(.3);expect(p.modern.state.frames).toBe(0);p.drain();
  expect(p.modern.state).toMatchObject({phase:'idle',frames:5,collected:5});expect(p.samples).toBeGreaterThan(90);
 },30_000);
 it('preserves lesson hold points, resumes existing paper motion, and retires reset callbacks',()=>{
  const p=parity('camera');p.action('lessonEnter');p.action('lessonNext');p.drain();
  expect(p.modern.state).toMatchObject({phase:'ejecting',lessonPaused:true,lessonHold:'feed',eject:0});
  p.action('lessonNext');p.drain();expect(p.modern.state).toMatchObject({phase:'developing',lessonHold:'develop',develop:0,eject:1});
  p.action('lessonNext');p.tick(.4);p.action('lessonPause');p.drain();
  const stopped=json(p.modern.state);p.tick(2);expect(json(p.modern.state)).toBe(stopped);
  p.action('lessonExit');p.drain();p.action('collect');p.drain();
  p.action('shutter');p.tick(.4);p.tick(.2);p.view(225);p.button('重新开始');p.drain();
  expect(p.modern.state).toMatchObject({phase:'idle',frames:5,collected:0,eject:0});
 });
});

describe('vending source parity: conserved inventory, coins and the original can',()=>{
 function stock(p:ReturnType<typeof parity>){return (p.modern.state.stock as number[]).reduce((a,b)=>a+b,0);}
 function buy(p:ReturnType<typeof parity>,flavor:number){p.action('token');p.drain();p.action('choose',{i:String(flavor)});p.drain();p.action('collect');p.drain();}
 it('preserves normal dispensing, sold-out selection, multi-coin refund and restocking',()=>{
  const p=parity('vending');p.action('choose',{i:'0'});expect(p.modern.state.tokens).toBe(0);expect(stock(p)).toBe(9);
  for(let i=0;i<3;i++)buy(p,0);
  p.action('token');p.drain();p.action('choose',{i:'0'});expect(p.modern.state.tokens).toBe(1);expect(stock(p)).toBe(6);
  p.action('choose',{i:'1'});p.drain();p.action('collect');p.drain();buy(p,2);
  p.action('token');p.drain();p.action('token');p.drain();p.action('refund');p.drain();
  expect(p.modern.state).toMatchObject({phase:'idle',tokens:0,collected:5,reservedCoin:0});expect(stock(p)).toBe(4);
  p.action('refill');p.tick(.4);p.view(135);p.drain();expect(stock(p)).toBe(9);expect(p.samples).toBeGreaterThan(90);
 },30_000);
 it('keeps the same reserved can and coin through jam → recovery → continue without double charging',()=>{
  const p=parity('vending');p.action('token');p.drain();p.action('token');p.drain();p.action('faultNext');p.action('choose',{i:'2'});p.drain();
  expect(p.modern.state).toMatchObject({phase:'jammed',drop:.28,tokens:1,reservedCoin:1,delivered:2,jamNext:false});expect(stock(p)).toBe(8);
  p.action('choose',{i:'1'});p.action('collect');p.action('recover');p.tick(.3);p.view(45);p.drain();
  expect(p.modern.state).toMatchObject({phase:'recovered',drop:0,tokens:1,reservedCoin:1,delivered:2});expect(stock(p)).toBe(8);
  p.action('continue');p.action('continue');p.drain();p.action('collect');p.drain();
  expect(p.modern.state).toMatchObject({phase:'idle',tokens:1,collected:1,reservedCoin:0,delivered:null});expect(stock(p)).toBe(8);
 });
 it('preserves the recovery-to-refund callback handoff and jam-safe reset conservation',()=>{
  const p=parity('vending');
  for(const command of ['refund','reset']){
   p.action('token');p.drain();p.action('token');p.drain();p.action('faultNext');p.action('choose',{i:'1'});p.drain();
   p.action(command);expect(p.modern.state.phase).toBe('recovering');p.drain();
   expect(p.modern.state).toMatchObject({phase:'idle',tokens:0,reservedCoin:0,delivered:null,collected:0});expect(stock(p)).toBe(9);
  }
  p.action('token');p.tick(.2);p.action('reset');p.drain();expect(p.modern.state.tokens).toBe(0);
 });
});

describe('toaster source parity: continuous split bread, heat and retained browning',()=>{
 it('matches complete load, dial, heat, pop and collect cycles at all three levels',()=>{
  const p=parity('toaster');
  for(let level=1;level<=3;level++){
   p.button('选择焦度',level-1);p.drain();p.action('load');
   // Dense samples through the physical lid crossing, including the back views.
   for(let i=0;i<24;i++){p.tick(.012);p.view(i%2?225:315);}
   p.drain();p.action('start');p.action('level');p.drain();
   expect(p.modern.state).toMatchObject({phase:'ready',progress:1,lever:0,slices:2});
   p.action('collect');p.drain();expect(p.modern.state).toMatchObject({phase:'empty',slices:0,made:level*2,plateToast:[.25,.6,1][level-1]});
  }
  expect(p.samples).toBeGreaterThan(160);
 },30_000);
 it('preserves early release during lowering and heating, plus interrupted reload/reset',()=>{
  const p=parity('toaster');p.action('load');p.drain();p.action('start');p.tick(.15);p.action('stop');p.drain();
  expect(p.modern.state).toMatchObject({phase:'ready',progress:0,cancelled:true});p.action('collect');p.drain();expect(p.modern.state.plateToast).toBe(0);
  p.action('load');p.drain();p.action('start');for(let i=0;i<100;i++)p.tick();
  const progress=p.modern.state.progress as number;expect(progress).toBeGreaterThan(0);p.action('start');p.drain();p.action('collect');p.drain();expect(p.modern.state.plateToast).toBe(progress*.6);
  p.action('load');p.tick(.24);p.action('reset');p.drain();expect(p.modern.state).toMatchObject({phase:'empty',slices:0,made:4,level:2,plateToast:0});
 });
});

for(const id of ['camera','vending','toaster'] as const){
 it(`${id}: retained model actions and animation callbacks are inert after scope disposal`,()=>{
  const p=parity(id);p.action(id==='camera'?'shutter':id==='vending'?'token':'load');p.tick(.1);p.scope.dispose();const before=json(p.modern.state);
  for(const fn of p.history)expect(fn(5)).toBe(false);
  p.modern.acts[id==='camera'?'shutter':id==='vending'?'token':'load'](p.modern.state,null,p.ui);
  p.modern.buttons.at(-1)!.onClick!(p.modern.state,p.ui);
  expect(json(p.modern.state)).toBe(before);
 });
}

/** Only browser time is controlled; all mount code, SVG, input and services are real. */
class Clock{
 serial=0;frames=new Map<number,FrameRequestCallback>();history:FrameRequestCallback[]=[];
 install(){vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{const id=++this.serial;this.frames.set(id,callback);this.history.push(callback);return id;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>this.frames.delete(id));}
 advance(ms:number){const end=performance.now()+ms;while(performance.now()<end){vi.advanceTimersByTime(Math.min(20,end-performance.now()));const pending=[...this.frames.values()];this.frames.clear();for(const callback of pending)callback(performance.now());}}
}
function actual(id:Id){const clock=new Clock();clock.install();const root=document.createElement('main');document.body.append(root);const scope=new ResourceScope(),audioScope=new ResourceScope();const audio=createAudioService(audioScope),observation=createObservation(root,scope);const controller=mounts[id]({root,scope,audio,observation});cleanups.push(()=>{controller.dispose();audio.dispose();audioScope.dispose();});return {clock,root,scope,controller};}
function click(root:ParentNode,selector:string){const element=root.querySelector(selector)!;expect(element,selector).not.toBeNull();element.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:0}));return element;}
function pointer(target:Element,type:string,props:Record<string,unknown>={}){const event=new Event(type,{bubbles:true,cancelable:true});for(const [key,value] of Object.entries({pointerId:7,pointerType:'touch',isPrimary:true,button:0,clientX:10,clientY:10,...props}))Object.defineProperty(event,key,{value});target.dispatchEvent(event);}
function open(root:ParentNode,selector:string){const panel=root.querySelector<HTMLDetailsElement>(selector)!;expect(panel).not.toBeNull();panel.open=true;panel.dispatchEvent(new Event('toggle'));return panel;}

describe('real food/camera adapter lifecycle and retained DOM controls',()=>{
 for(const id of ['camera','vending','toaster'] as const){
  it(`${id}: mounts substantial geometry, freezes overlapping pauses and never resurrects disposed controls`,()=>{
   const shell=document.createElement('nav');shell.textContent='Museum shell';document.body.append(shell);
   const {clock,root,scope,controller}=actual(id);expect(shell.isConnected).toBe(true);expect(root.querySelectorAll('svg path').length).toBeGreaterThan(50);expect(root.querySelector('iframe')).toBeNull();expect(root.querySelectorAll('.mechanical-audio')).toHaveLength(1);
   const key=id==='camera'?'shutter':id==='vending'?'token':'load';const oldControl=click(root,`[data-act="${key}"]`);clock.advance(100);
   controller.pause('manual');controller.pause('hidden');const before=controller.snapshot();clock.advance(5000);click(root,`.act[data-action-label="${id==='toaster'?'重新准备':'重新开始'}"]`);expect(controller.snapshot()).toEqual(before);expect(clock.frames.size).toBe(0);
   controller.resume('manual');expect(clock.frames.size).toBe(0);controller.resume('hidden');controller.resume('hidden');expect(clock.frames.size).toBeLessThanOrEqual(1);clock.advance(40);
   const progressKey=id==='camera'?'phaseTime':id==='vending'?'coinT':'loadT';expect(Number(controller.snapshot()[progressKey])).toBeGreaterThan(Number(before[progressKey]));
   const resetState=id==='camera'?{phase:'idle',frames:5,collected:0}:id==='vending'?{phase:'idle',tokens:0,collected:0}:{phase:'empty',slices:0,made:0};
   controller.reset();clock.advance(200);expect(controller.snapshot()).toMatchObject(resetState);
   const oldPanel=open(root,'.mechanism-observer');const oldRate=root.querySelector('[data-rate="0.25"]')!;
   const callbacks=[...clock.history];controller.dispose();const after=controller.snapshot(),markup=root.innerHTML;
   oldControl.dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));oldControl.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));oldRate.dispatchEvent(new MouseEvent('click',{bubbles:true}));oldPanel.dispatchEvent(new Event('toggle'));
   window.dispatchEvent(new Event('pageshow'));window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('visibilitychange'));
   for(const callback of callbacks)callback(performance.now()+10_000);controller.reset();controller.resume('manual');controller.dispose();clock.advance(1000);
   expect(controller.snapshot()).toEqual(after);expect(root.innerHTML).toBe(markup);expect(scope.diagnostics()).toMatchObject({active:false,frames:0,timers:0,listeners:0});expect(clock.frames.size).toBe(0);expect(shell.isConnected).toBe(true);
  },20_000);
 }
 it('camera press/release consumes exactly one sheet, while pause, reset, drag-out and Escape cancel a held shutter',()=>{
  const {clock,root,controller}=actual('camera');const svg=root.querySelector<SVGSVGElement>('#fig')!;let capture:number|null=null;
  svg.setPointerCapture=id=>{capture=id;};svg.hasPointerCapture=id=>capture===id;svg.releasePointerCapture=()=>{capture=null;};
  const shutter=()=>root.querySelector('[data-act="shutter"]')!;
  for(const cancel of ['pause','reset','drag','escape']){
   pointer(shutter(),'pointerdown');expect(controller.snapshot()).toMatchObject({frames:5,phase:'idle',shutterPress:1});expect(capture).toBe(7);
   if(cancel==='pause'){controller.pause('manual');expect(capture).toBeNull();controller.resume('manual');}
   if(cancel==='reset')controller.reset();
   if(cancel==='drag')pointer(svg,'pointermove',{clientX:40});
   if(cancel==='escape')window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
   pointer(svg,'pointerup');expect(controller.snapshot()).toMatchObject({frames:5,phase:'idle',shutterPress:0});
  }
  pointer(shutter(),'pointerdown');pointer(svg,'pointerup');expect(controller.snapshot()).toMatchObject({frames:4,phase:'flash'});clock.advance(80);expect(controller.snapshot().shutterPress).toBeLessThan(1);
  const observer=open(root,'.mechanism-observer');const cutaway=open(root,'.camera-paper-path');clock.advance(500);
  const diagram=root.querySelector('.camera-paper-path svg')!;expect(Number(diagram.getAttribute('data-feed'))).toBeGreaterThan(0);expect(diagram.getAttribute('data-phase')).toBe('ejecting');
  const detachedSelect=root.querySelector('.camera-path-rollers')!;controller.reset();clock.advance(100);expect(Number(diagram.getAttribute('data-feed'))).toBe(0);
  controller.dispose();expect(document.getElementById('camera-paper-path-style')).toBeNull();const snapshot=controller.snapshot(),before=cutaway.outerHTML;
  detachedSelect.dispatchEvent(new MouseEvent('click',{bubbles:true}));observer.dispatchEvent(new Event('toggle'));cutaway.dispatchEvent(new Event('toggle'));expect(controller.snapshot()).toEqual(snapshot);expect(cutaway.outerHTML).toBe(before);
 },20_000);
 it('vending scope owns the live fault controls and ignores unrelated navigation events',()=>{
  const {root,controller,scope,clock}=actual('vending');open(root,'.mechanism-observer');const fault=root.querySelector<HTMLInputElement>('.vending-fault input')!;
  fault.dispatchEvent(new Event('change',{bubbles:true}));expect(controller.snapshot().jamNext).toBe(true);
  window.dispatchEvent(new HashChangeEvent('hashchange'));expect(scope.active).toBe(true);
  click(root,'[data-act="token"]');clock.advance(800);click(root,'[data-act="choose"][data-i="0"]');clock.advance(700);
  expect(controller.snapshot()).toMatchObject({phase:'jammed',reservedCoin:1,tokens:0});
  const recover=[...root.querySelectorAll<HTMLButtonElement>('.vending-fault button')].find(x=>x.textContent==='检修复位')!;recover.click();clock.advance(900);expect(controller.snapshot().phase).toBe('recovered');
  const cancel=[...root.querySelectorAll<HTMLButtonElement>('.vending-fault button')].find(x=>x.textContent==='取消并退币')!;cancel.click();clock.advance(900);expect(controller.snapshot()).toMatchObject({phase:'idle',tokens:0,reservedCoin:0,stock:[3,3,3]});
  const oldOnChange=fault.onchange;controller.dispose();const after=controller.snapshot();fault.dispatchEvent(new Event('change'));oldOnChange?.call(fault,new Event('change'));recover.click();cancel.click();expect(controller.snapshot()).toEqual(after);expect(scope.diagnostics().listeners).toBe(0);
 },20_000);
});

describe('additional scope ownership boundaries',()=>{
 it('camera scope-only disposal releases capture and makes previously retained observer writes inert',()=>{
  const clock=new Clock();clock.install();const root=document.createElement('main');document.body.append(root);
  const scope=new ResourceScope(),audioScope=new ResourceScope(),audio=createAudioService(audioScope);
  const originalService=createObservation(root,scope);let observer:ReturnType<typeof originalService.mount>;
  const service={...originalService,mount(options:Parameters<typeof originalService.mount>[0]){observer=originalService.mount(options);return observer;}};
  const controller=mountCamera({root,scope,audio,observation:service});cleanups.push(()=>{controller.dispose();audio.dispose();audioScope.dispose();});
  open(root,'.mechanism-observer');const fold=open(root,'.camera-paper-path');const svg=root.querySelector<SVGSVGElement>('#fig')!;let captured=false;
  svg.setPointerCapture=()=>{captured=true;};svg.hasPointerCapture=()=>captured;svg.releasePointerCapture=()=>{captured=false;};
  const retainedUpdate=observer!.update;pointer(root.querySelector('[data-act="shutter"]')!,'pointerdown');expect(captured).toBe(true);scope.dispose();expect(captured).toBe(false);
  const after=controller.snapshot(),markup=fold.outerHTML;retainedUpdate?.();controller.reset();controller.resume();pointer(svg,'pointerup');clock.advance(1000);
  expect(controller.snapshot()).toEqual(after);expect(controller.snapshot()).toMatchObject({frames:5,shutterPress:0,disposed:true});expect(fold.outerHTML).toBe(markup);expect(scope.diagnostics()).toMatchObject({active:false,listeners:0,frames:0,timers:0});
 });
 it('toaster level changes and reset invalidate the old dial driver without discontinuous bread state',()=>{
  const p=parity('toaster');p.action('level');p.tick(.1);p.action('level');p.tick(.05);p.action('reset');p.drain();expect(p.modern.state.dial).toBe(p.modern.state.level);
  p.action('load');p.tick(.5);p.view(225,20);p.action('reset');p.drain();expect(p.modern.state).toMatchObject({phase:'empty',slices:0,loadT:0,takeT:0});
 });
});
