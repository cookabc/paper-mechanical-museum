import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mountGenerator} from '../src/exhibits/generator';
import {electrical,type GeneratorState} from '../src/exhibits/generator/model';
import type {Lesson} from '../src/exhibits/generator/learning';
import {ResourceScope} from '../src/app/scope';
import {createAudioService} from '../src/shared/audio.js';
import {createObservation} from '../src/shared/observation.js';

// This suite isolates lesson DOM behavior. Existing generator tests retain the
// complete solid renderer and physical-object interaction assertions unchanged.
vi.mock('../src/shared/object-stage',()=>({createObjectStage:()=>({render(){},resetCamera(){},cancel(){}})}));
let root:HTMLElement,scope:ResourceScope,audioScope:ResourceScope,controller:ReturnType<typeof mountGenerator>;
let frames:Map<number,FrameRequestCallback>,serial:number,clock:number;
beforeEach(()=>{
 document.body.replaceChildren();Object.defineProperty(document,'hidden',{value:false,configurable:true});
 frames=new Map();serial=0;clock=0;
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++serial,fn);return serial;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 root=document.createElement('section');document.body.append(root);scope=new ResourceScope();audioScope=new ResourceScope();
 controller=mountGenerator({root,scope,audio:createAudioService(audioScope),observation:createObservation(root,scope)});
});
afterEach(()=>{controller.dispose();audioScope.dispose();vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();});
const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
const click=(selector:string)=>q<HTMLButtonElement>(selector).click();
const snapshot=()=>controller.snapshot!() as unknown as GeneratorState&{lesson:Lesson;paused:boolean};
function tick(seconds:number){for(let i=0;i<seconds*20;i++){clock+=50;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(clock));}}
const step=()=>q('.gen-lesson').getAttribute('data-step');
function answer(choice=0){click(`[data-answer="${choice}"]`);click('[data-lesson=continue]');}
function begin(){click('[data-lesson=start]');answer();}
function toStop(){begin();click('.gen-start');tick(1.6);click('.gen-switch');tick(1.6);answer(1);answer();expect(step()).toBe('stop');}

it('starts with an empty learning live region, keeps predictions neutral and announces only an actual exit',()=>{
 expect(q('.gen-lesson-status').textContent).toBe('');click('[data-lesson=start]');
 expect(root.querySelector('[data-lesson-reading]')).toBeNull();click('[data-answer="1"]');
 expect(q('.gen-lesson-status').textContent).toContain('预测已记录');expect(q('.gen-lesson-status').textContent).not.toContain('与你的预测不同');
 expect(root.querySelectorAll('.gen-lesson [role=status]')).toHaveLength(0);
 click('[data-lesson=continue]');expect(root.querySelectorAll('[data-lesson-reading]')).toHaveLength(3);
 click('.gen-reset');expect(q('.gen-lesson-status').textContent).not.toContain('已返回自由探索');
 click('[data-lesson=start]');click('[data-lesson=exit]');expect(q('.gen-lesson-status').textContent).toBe('已返回自由探索');
});

it('lets explicit lesson navigation reveal its new focus, while animation never moves it',()=>{
 const focus=vi.spyOn(HTMLElement.prototype,'focus');click('[data-lesson=start]');expect(document.activeElement).toBe(q('.gen-lesson h3'));
 click('[data-answer="0"]');expect(document.activeElement).toBe(q('[data-lesson=continue]'));
 click('[data-lesson=continue]');expect(document.activeElement).toBe(q('.gen-lesson h3'));
 // The browser may reveal these newly focused, previously below-fold controls.
 expect(focus.mock.calls).toEqual([[],[],[]]);focus.mockClear();click('.gen-start');tick(.4);expect(focus).not.toHaveBeenCalled();
});

it('updates stable diagnostic/readout nodes without focus, scroll or per-frame live announcements',async()=>{
 begin();click('.gen-start');const slider=q<HTMLInputElement>('.gen-speed input');slider.focus();
 const diagnostic=q('.gen-lesson-diagnostic'),readings=q('.gen-lesson-readings'),heading=q('.gen-lesson h3'),status=q('.gen-lesson-status');
 q('.dock-extras').scrollTop=143;const mutations:MutationRecord[]=[];const observer=new MutationObserver(records=>mutations.push(...records));observer.observe(status,{subtree:true,childList:true,characterData:true});
 const before=status.textContent;tick(.8);await Promise.resolve();
 expect(q('.gen-lesson-diagnostic')).toBe(diagnostic);expect(q('.gen-lesson-readings')).toBe(readings);expect(q('.gen-lesson h3')).toBe(heading);expect(document.activeElement).toBe(slider);expect(q('.dock-extras').scrollTop).toBe(143);
 expect(status.textContent).toBe(before);expect([...mutations,...observer.takeRecords()]).toHaveLength(0);expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();observer.disconnect();
 const e=electrical(snapshot());expect(q('[data-lesson-reading=rms]').textContent).toBe(e.rms.toFixed(2));expect(q('[data-lesson-reading=current]').textContent).toBe(e.current.toFixed(2));expect(q('[data-lesson-reading=power]').textContent).toBe(e.averagePower.toFixed(2));
});

it('shows all adjustments, separates set speed from stopped speed, and never invents a reset',()=>{
 begin();click('[data-rpm="90"]');click('.gen-reverse');click('.gen-switch');
 const adjust=q('[data-lesson-adjustment]').textContent!;for(const text of ['60 rpm','恢复正向','接通电路','开始摇动'])expect(adjust).toContain(text);
 expect(q('[data-lesson-current]').textContent).toContain('设定 90 rpm');expect(q('[data-lesson-current]').textContent).toContain('实际已停转（0 rpm');
 expect(q('[data-lesson-reset]').hasAttribute('hidden')).toBe(true);expect(q('.gen-lesson-status').textContent).not.toContain('清零');
 click('[data-rpm="60"]');click('.gen-reverse');click('.gen-switch');click('.gen-start');tick(.3);expect(snapshot().lesson.held).toBeGreaterThan(0);
 click('.gen-switch');expect(q('[data-lesson-reset]').textContent).toContain('电路未接通');expect(q('.gen-lesson-status').textContent).toContain('上段观察已清零');
 click('.gen-switch');tick(.1);expect(snapshot().lesson.held).toBeGreaterThan(0);expect(q('[data-lesson-reset]').hasAttribute('hidden')).toBe(true);
});

it('renders slider input immediately but waits for settled change to announce condition and reset',()=>{
 begin();click('.gen-start');tick(.4);const slider=q<HTMLInputElement>('.gen-speed input'),status=q('.gen-lesson-status'),machineStatus=q('#readout');
 const before=status.textContent,machineBefore=machineStatus.textContent;
 for(const rpm of [65,70,75,90]){slider.value=String(rpm);slider.dispatchEvent(new Event('input',{bubbles:true}));expect(q('[data-lesson-current]').textContent).toContain(`设定 ${rpm} rpm`);tick(.1);expect(status.textContent).toBe(before);expect(machineStatus.textContent).toBe(machineBefore);}
 expect(snapshot().lesson.held).toBe(0);slider.dispatchEvent(new Event('change',{bubbles:true}));expect(status.textContent).toContain('设定 90 rpm');expect(status.textContent).toContain('上段观察已清零：转速不是 60 rpm');
 const settled=status.textContent;tick(.3);expect(status.textContent).toBe(settled);
});

it('retains a genuine reset announcement when a drag returns to the target before settling',()=>{
 begin();click('.gen-start');tick(.4);const slider=q<HTMLInputElement>('.gen-speed input');
 slider.value='90';slider.dispatchEvent(new Event('input'));slider.value='60';slider.dispatchEvent(new Event('input'));tick(.1);slider.dispatchEvent(new Event('change'));
 expect(q('.gen-lesson-status').textContent).toContain('条件已符合');expect(q('.gen-lesson-status').textContent).toContain('上段观察已清零：转速不是 60 rpm');
 expect(q('[data-lesson-reset]').hasAttribute('hidden')).toBe(true);
});

it('describes pause/background as frozen observation, discards credit and preserves machine state',()=>{
 begin();click('.gen-start');tick(.5);controller.pause('hidden');const paused=snapshot();
 expect(paused.running).toBe(true);expect(paused.lesson.held).toBe(0);expect(q('[data-lesson-current]').textContent).toContain('机器保留运行状态');expect(q('[data-lesson-current]').textContent).toContain('页面在后台，观察冻结');expect(q('[data-lesson-current]').textContent).not.toContain('实际已停转');
 expect(q('[data-lesson-reset]').textContent).toContain('页面进入后台，观察冻结');tick(5);expect(snapshot()).toEqual(paused);
 controller.pause('manual');controller.resume('hidden');expect(q('[data-lesson-current]').textContent).toContain('观察已暂停');expect(snapshot().paused).toBe(true);
 controller.resume('manual');expect(q('[data-lesson-current]').textContent).not.toContain('观察已暂停');tick(.3);expect(snapshot().lesson.held).toBeLessThan(.5);
});

it('rejects frozen or changed stop evidence, while a fresh running baseline and active stop succeeds',()=>{
 toStop();expect(snapshot().lesson.stopArmed).toBe(true);controller.pause('hidden');click('.gen-start');expect(snapshot().running).toBe(true);expect(step()).toBe('stop');
 controller.resume('hidden');expect(q('[data-lesson-adjustment]').textContent).toContain('先重新观察');
 // No intervening running observation: the pending stop evidence was invalidated.
 click('.gen-start');expect(step()).toBe('stop');expect(q('[data-lesson-adjustment]').textContent).toContain('重新观察转动');
 click('.gen-start');click('[data-rpm="90"]');click('.gen-start');expect(step()).toBe('stop');
 click('[data-rpm="60"]');click('.gen-start');click('.gen-switch');click('.gen-start');expect(step()).toBe('stop');
 click('.gen-switch');click('.gen-start');click('.gen-start');expect(step()).toBe('reversePredict');
});

it('describes blur as an automatic machine stop and requires a new active stop',()=>{
 toStop();window.dispatchEvent(new Event('blur'));expect(snapshot().running).toBe(false);expect(step()).toBe('stop');
 expect(q('[data-lesson-current]').textContent).toContain('实际已停转（0 rpm，失焦自动停止）');expect(q('[data-lesson-adjustment]').textContent).toContain('重新观察转动');expect(q('.gen-lesson-status').textContent).not.toContain('清零');
 expect(q('[data-lesson-reading=rms]').textContent).toBe('0.00');click('.gen-start');click('.gen-start');expect(step()).toBe('reversePredict');
});

it('keeps the full evidence path and answer retries while matching all three physical readouts',()=>{
 begin();click('.gen-start');tick(1.6);expect(step()).toBe('open');click('.gen-switch');tick(.5);
 expect(q('[data-lesson-reading=rms]').textContent).toBe('4.44');expect(q('[data-lesson-reading=current]').textContent).toBe('0.00');expect(q('[data-lesson-reading=power]').textContent).toBe('0.00');tick(1.1);expect(step()).toBe('explain');
 answer(2);expect(step()).toBe('explain');answer(1);answer();click('.gen-start');expect(step()).toBe('reversePredict');answer();
 click('.gen-switch');click('.gen-start');tick(1.6);expect(step()).toBe('reverse');expect(q('[data-lesson-requirement]').textContent).toContain('反向 60 rpm');click('.gen-reverse');
 expect(q('[data-lesson-reading=rms]').textContent).toBe('4.44');expect(q('[data-lesson-reading=power]').textContent).toBe('1.97');tick(1.6);expect(step()).toBe('complete');
 expect(root.querySelector('[data-lesson-reading]')).toBeNull();expect(root.querySelectorAll('.gen-start')).toHaveLength(1);expect(root.querySelectorAll('.gen-switch')).toHaveLength(1);
});
