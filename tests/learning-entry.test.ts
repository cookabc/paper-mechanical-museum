import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createApp} from '../src/app/app';
import {createVending} from '../src/exhibits/vending/model.js';

let root:HTMLElement,app:ReturnType<typeof createApp>;
beforeEach(()=>{
 document.body.replaceChildren();location.hash='';
 Object.defineProperty(document,'hidden',{configurable:true,value:false});
 root=document.createElement('div');document.body.append(root);app=createApp(root);
});
afterEach(()=>{app.dispose();root.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
const click=(selector:string)=>{const button=root.querySelector<HTMLButtonElement>(selector);expect(button,selector).not.toBeNull();button!.click();};

it('gives all twelve exhibits one optional, honestly named doorway and canonical title',()=>{
 for(const id of ['washer','fan','claw','coffee','musicbox','vending','toaster','turntable','camera','elevator','bicycle','generator']){
  app.navigate(id);const entry=root.querySelector<HTMLButtonElement>('.museum-learning-entry');
  expect(root.querySelectorAll('.museum-learning-entry'),id).toHaveLength(1);
  expect(entry!.textContent).toContain('动手学');expect(entry!.textContent).toContain('可选');
  expect(document.title.endsWith(' · 纸上机械馆')).toBe(true);
  click('.museum-learning-entry');
  if(id==='generator')expect(root.querySelector('[data-answer]')).not.toBeNull();
  else if(id==='bicycle')expect(root.querySelector<HTMLDetailsElement>('.bike-challenge')!.open).toBe(true);
  else expect(root.querySelector<HTMLDetailsElement>('.mechanism-lesson')!.open,id).toBe(true);
  const state=app.current!.snapshot!() as Record<string,unknown>;
  if(id==='bicycle'||id==='generator')expect(state.running).toBe(false);
  if(id==='vending')expect(state.tokens).toBe(0);
  app.navigate('');entry!.click();expect(root.querySelector('.museum-learning-entry')).toBeNull();
 }
});

it('opens the existing coffee lesson without filling beans, then restores free actions on exit',()=>{
 app.navigate('coffee');const entry=root.querySelector<HTMLButtonElement>('.museum-learning-entry')!;
 entry.click();const guide=root.querySelector<HTMLDetailsElement>('.coffee-guide')!;
 // Native details dispatches toggle asynchronously; exercise the real registered handlers.
 root.querySelector('.mechanism-observer')!.dispatchEvent(new Event('toggle'));guide.dispatchEvent(new Event('toggle'));
 expect(root.querySelector('.play-dock')!.classList.contains('lesson-guiding')).toBe(true);
 expect((app.current!.snapshot!() as Record<string,unknown>).beans).toBe(0);
 click('.mechanism-lesson-exit');expect(guide.open).toBe(false);
 expect(root.querySelector('.play-dock > #btns')).not.toBeNull();
 expect(root.querySelector('.museum-learning-entry')).toBe(entry);
 entry.click();guide.dispatchEvent(new Event('toggle'));expect(guide.open).toBe(true);
});

it('recommends a state-backed starting action but retains every free-play button',()=>{
 for(const [id,label,count] of [['coffee','加入咖啡豆',8],['vending','投入体验币',6],['toaster','放入两片吐司',6]] as const){
  app.navigate(id);const recommended=root.querySelectorAll<HTMLButtonElement>('.act[data-recommended=true]');
  expect(recommended,id).toHaveLength(1);expect(recommended[0].dataset.actionLabel).toBe(label);
  expect(recommended[0].getAttribute('aria-description')).toContain('建议下一步');
  expect(root.querySelectorAll('#btns .act')).toHaveLength(count);
  recommended[0].click();expect(root.querySelectorAll('.act[data-recommended=true]')).toHaveLength(0);
 }
});

it('does not confuse an available cancel action with the recommended next action',()=>{
 let clock=0,sequence=0;const frames=new Map<number,FrameRequestCallback>();
 // RAF timestamps and the runtime share one virtual clock: real SVG render time
 // must not shift animation starts or trigger wall-time-dependent frame skipping.
 vi.spyOn(performance,'now').mockImplementation(()=>clock);
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++sequence,callback);return sequence;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 const tick=(seconds:number)=>{for(let t=0;t<seconds*20;t++){clock+=50;const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(clock);}};
 const action=(label:string)=>click('[data-action-label="'+label+'"]');
 app.navigate('toaster');action('放入两片吐司');tick(1.4);
 expect(root.querySelector<HTMLButtonElement>('.act[data-recommended=true]')!.dataset.actionLabel).toBe('压下烘烤手柄');
 action('压下烘烤手柄');tick(.9);
 expect((app.current!.snapshot!() as Record<string,unknown>).phase).toBe('heating');
 expect(root.querySelectorAll('.act[data-recommended=true]')).toHaveLength(0);
 expect(root.querySelector('[data-action-label="取消烘烤"]')).not.toBeNull();
 tick(8);expect(root.querySelector<HTMLButtonElement>('.act[data-recommended=true]')!.dataset.actionLabel).toBe('领取吐司');
 app.navigate('coffee');action('加入咖啡豆');tick(.9);action('研磨咖啡豆');tick(3);action('锁入手柄');tick(1.2);action('放置杯子');tick(1.1);action('开始萃取');tick(1);
 expect((app.current!.snapshot!() as Record<string,unknown>).phase).toBe('brewing');
 expect(root.querySelectorAll('.act[data-recommended=true]')).toHaveLength(0);
 expect(root.querySelector('[data-action-label="开始萃取"]')!.textContent).toContain('停止');
// Both real SVG adapters render every RAF through complete cooking/preparation
// transitions. Match the bounded 20s budget of the heavy parity tests on CI.
},20000);

it('recommends refill rather than buying when every vending shelf is empty',()=>{
 const cfg=createVending({}, {window:{},document,scope:{active:true}});
 const state=cfg.state;state.stock=[0,0,0];
 expect(cfg.recommendedAction(state)).toBe('refill');
 state.tokens=1;expect(cfg.recommendedAction(state)).toBe('refill');
 state.stock=[0,1,0];expect(cfg.recommendedAction(state)).toBe('choose');
 state.phase='restocking';expect(cfg.recommendedAction(state)).toBeNull();
});
