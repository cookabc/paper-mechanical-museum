import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {advance,drivetrain,HILL,hillTrialRecord,initialState,type HillTrialRecord} from '../src/exhibits/bicycle/model';
import {mountBicycle} from '../src/exhibits/bicycle';
import {ResourceScope} from '../src/app/scope';
import {createAudioService} from '../src/shared/audio.js';
import {createObservation} from '../src/shared/observation.js';

// Keep the real adapter, model, RAF ownership and DOM controls. Geometry has its
// own exact-SVG baseline suite; this avoids re-parsing it for clock edge cases.
vi.mock('../src/exhibits/bicycle/drawing',()=>({drawing:()=>'<g data-observe-part="chain"></g>'}));

describe('honest simulated hill timing',()=>{
 it.each([0,1])('gear %i stops exactly at 12 m across frame sizes and slow observation',gear=>{
  for(const step of[.05,.016,.004]){
   const state={...initialState(),gear,running:true,challenge:'riding' as const};
   for(let frame=0;frame<2000&&state.running;frame++)advance(state,step);
   expect(state.distance).toBe(HILL.distance);
   expect(state.elapsed).toBeCloseTo(HILL.distance/(drivetrain(gear,60).speedKmh/3.6),10);
   expect(hillTrialRecord(state)).toMatchObject({gear,outcome:'complete',distance:12,elapsed:state.elapsed});
  }
 });
 it('does not turn, travel or invent a duration when the torque threshold rejects a trial',()=>{
  const state={...initialState(),gear:2,running:true,challenge:'riding' as const};advance(state,.05);
  expect(state).toMatchObject({challenge:'stalled',distance:0,elapsed:0,crankTurns:0,wheelTurns:0,running:false});
  expect(hillTrialRecord(state)).toEqual({gear:2,outcome:'stalled',distance:0,elapsed:0});
 });
 it('never records unfinished, cancelled or differently conditioned riding',()=>{
  const state=initialState();expect(hillTrialRecord(state)).toBeNull();
  state.running=true;state.challenge='riding';advance(state,.05);expect(hillTrialRecord(state)).toBeNull();
  state.running=false;state.challenge='idle';expect(hillTrialRecord(state)).toBeNull();
  state.challenge='complete';state.distance=12;state.cadence=80;expect(hillTrialRecord(state)).toBeNull();
 });
});

let frames:Map<number,FrameRequestCallback>,captured:FrameRequestCallback[],serial:number,cleanups:Array<()=>void>;
beforeEach(()=>{
 document.body.replaceChildren();Object.defineProperty(document,'hidden',{value:false,configurable:true});
 frames=new Map();captured=[];serial=0;cleanups=[];
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++serial,fn);captured.push(fn);return serial;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
});
afterEach(()=>{cleanups.reverse().forEach(fn=>fn());vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();document.body.replaceChildren();});
function tick(ms:number){const end=performance.now()+ms;while(performance.now()<end){vi.advanceTimersByTime(Math.min(20,end-performance.now()));const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(performance.now()));}}
function fixture(){
 const root=document.createElement('section');document.body.append(root);
 const scope=new ResourceScope(),audioScope=new ResourceScope(),audio=createAudioService(audioScope);
 const controller=mountBicycle({root,scope,audio,observation:createObservation(root,scope)});
 cleanups.push(()=>{controller.dispose();audioScope.dispose();});
 const q=(selector:string)=>root.querySelector<HTMLButtonElement>(selector)!;
 const click=(selector:string)=>{const button=q(selector);expect(button).not.toBeNull();button.click();};
 const records=()=>controller.snapshot!().trials as Array<HillTrialRecord|null>;
 return {root,scope,controller,q,click,records};
}

describe('stage-adjacent earned comparison',()=>{
 it('earns 3 → 1 → 2 results and only then identifies the faster successful trial',()=>{
  const {root,controller,q,click,records}=fixture();
  expect(records()).toEqual([null,null,null]);expect(root.querySelectorAll('[data-outcome="untried"]')).toHaveLength(3);
  expect(root.querySelector('[data-best="true"]')).toBeNull();
  expect(q('[data-read="clock"]').textContent).toContain('模拟计时');
  q('[data-trial-gear="2"]').focus();click('[data-trial-gear="2"]');
  expect(document.activeElement).toBe(q('[data-trial-gear="2"]'));
  expect(records()).toEqual([null,null,{gear:2,outcome:'stalled',distance:0,elapsed:0}]);
  expect(q('[data-lane="2"] .bike-lane-result').textContent).toContain('10 < 15 N·m');
  click('[data-trial-gear="0"]');tick(6000);
  expect(records()[0]?.elapsed).toBeCloseTo(40/7,10);
  expect(q('.bike-challenge-result').textContent).toContain('5.71 模拟秒');
  expect(q('.bike-challenge-result').textContent).not.toMatch(/2 挡|最快/);
  expect(root.querySelector('[data-best="true"]')).toBeNull();
  q('[data-trial-gear="1"]').focus();click('[data-trial-gear="1"]');tick(5000);
  expect(document.activeElement).toBe(q('[data-trial-gear="1"]'));
  expect(controller.snapshot!()).toMatchObject({challenge:'complete',distance:12});expect(controller.snapshot!().elapsed).toBeCloseTo(30/7,10);
  expect(records().map(record=>record?.outcome)).toEqual(['complete','complete','stalled']);
  expect(q('[data-lane="1"]').dataset.best).toBe('true');
  expect(q('.bike-challenge-result').textContent).toContain('2 挡比 1 挡少用约 1.43 模拟秒');
  expect(q('.bike-challenge-result').textContent).toContain('三挡记录已齐');
  click('[data-trial-gear="2"]');expect(q('[data-read="clock"]').textContent).toContain('模拟计时');
  expect(records().map(record=>record?.outcome)).toEqual(['complete','complete','stalled']);
 });
 it('keeps a previous result when a new attempt is interrupted, and rejects stale frames',()=>{
  const {q,click,records,controller}=fixture();click('[data-trial-gear="0"]');tick(6000);
  const earned=records()[0];click('[data-trial-gear="0"]');tick(400);
  expect(q('[data-lane="0"] .bike-lane-result').textContent).toContain('上次 5.71 s');
  const old=captured.slice();click('[data-gear="1"]');old.forEach(fn=>fn(999999));
  expect(controller.snapshot!()).toMatchObject({challenge:'idle',distance:0,elapsed:0,running:false});
  expect(records()).toEqual([earned,null,null]);
  expect(q('.bike-challenge-result').textContent).toContain('中断本轮，不记成绩');
  expect(q('[data-lane="0"] .bike-lane-result').textContent).toContain('已到顶');
 });
 it('trial-lane changes start a fresh fair test rather than combining distances',()=>{
  const {click,q,records,controller}=fixture();click('[data-trial-gear="0"]');tick(500);
  click('[data-trial-gear="1"]');
  expect(controller.snapshot!()).toMatchObject({gear:1,cadence:60,distance:0,elapsed:0,challenge:'riding'});
  expect(records()).toEqual([null,null,null]);expect(q('.bike-challenge-result').textContent).toContain('上轮未完成，不记成绩');
  tick(5000);expect(records()[0]).toBeNull();expect(records()[1]?.elapsed).toBeCloseTo(30/7,10);
  click('[data-trial-gear="0"]');tick(300);click('[data-trial-gear="2"]');
  expect(records()[0]).toBeNull();expect(records()[2]?.outcome).toBe('stalled');
  expect(q('.bike-challenge-result').textContent).toContain('上轮未完成，不记成绩');
  expect(q('.bike-challenge-result').textContent).toContain('3 挡转不动');
 });
 it('local pause keeps progress and focus, with no idle RAF or wall-clock evidence',()=>{
  const {scope,click,q,records,controller}=fixture();click('[data-trial-gear="1"]');tick(500);
  q('.bike-try').focus();click('.bike-try');const frozen=controller.snapshot!();const old=captured.slice();
  tick(60000);old.forEach(fn=>fn(999999));expect(controller.snapshot!()).toEqual(frozen);
  expect(scope.diagnostics().frames).toBe(0);expect(records()).toEqual([null,null,null]);
  expect(document.activeElement).toBe(q('.bike-try'));expect(q('.bike-try').textContent).toBe('继续试爬');
  click('.bike-try');tick(5000);expect(records()[1]?.elapsed).toBeCloseTo(30/7,10);
  expect(document.activeElement).toBe(q('.bike-try'));
 });
 it('¼ speed changes observation duration, never the measured simulated hill time',()=>{
  const {click,q,controller,records}=fixture();const panel=q('.mechanism-observer') as unknown as HTMLDetailsElement;
  panel.open=true;panel.dispatchEvent(new Event('toggle'));click('[data-rate="0.25"]');
  click('[data-trial-gear="1"]');tick(4020);
  expect(controller.snapshot!().elapsed).toBeCloseTo(1,10);expect(records()[1]).toBeNull();
  expect(q('[data-read="clock"]').textContent).toContain('¼ 速观察');
  tick(14000);expect(records()[1]?.elapsed).toBeCloseTo(30/7,10);
 });
 it('background and overlapping pause reasons never catch up or produce a result',()=>{
  const {click,controller,scope,records}=fixture();click('[data-trial-gear="1"]');tick(500);
  controller.pause('hidden');controller.pause('navigation');const frozen=controller.snapshot!();
  tick(90000);expect(controller.snapshot!()).toEqual(frozen);expect(records()[1]).toBeNull();
  controller.resume('hidden');expect(scope.diagnostics().frames).toBe(0);
  controller.resume('navigation');tick(20);expect(controller.snapshot!().elapsed).toBe(frozen.elapsed);
  tick(5000);expect(records()[1]?.elapsed).toBeCloseTo(30/7,10);
 });
 it('blur requires explicit continuation and never consumes absent time',()=>{
  const {click,q,controller,records}=fixture();click('[data-trial-gear="1"]');tick(500);
  window.dispatchEvent(new Event('blur'));const frozen=controller.snapshot!();tick(60000);
  expect(controller.snapshot!()).toEqual(frozen);expect(q('.bike-try').textContent).toBe('继续试爬');
  click('.bike-try');tick(5000);expect(records()[1]?.elapsed).toBeCloseTo(30/7,10);
 });
 it('folding the lab pauses without losing evidence; reopening does not auto-run',()=>{
  const {click,q,controller,records}=fixture();const lab=q('.bike-lab') as unknown as HTMLDetailsElement;
  expect(lab.open).toBe(false);click('[data-trial-gear="2"]');expect(lab.open).toBe(true);
  click('[data-trial-gear="1"]');tick(500);lab.open=false;lab.dispatchEvent(new Event('toggle'));
  const frozen=controller.snapshot!();tick(60000);expect(controller.snapshot!()).toEqual(frozen);
  expect(records()[1]).toBeNull();expect(records()[2]?.outcome).toBe('stalled');
  lab.open=true;lab.dispatchEvent(new Event('toggle'));tick(1000);expect(controller.snapshot!()).toEqual(frozen);
  click('.bike-try');tick(5000);expect(records()[1]?.elapsed).toBeCloseTo(30/7,10);
 });
 it('free pedalling after folding abandons the unfinished trial, not its old records',()=>{
  const {click,q,controller,records}=fixture();click('[data-trial-gear="2"]');click('[data-trial-gear="1"]');tick(500);
  const lab=q('.bike-lab') as unknown as HTMLDetailsElement;lab.open=false;lab.dispatchEvent(new Event('toggle'));
  click('.bike-start');tick(6000);expect(controller.snapshot!()).toMatchObject({running:true,challenge:'idle',distance:0,elapsed:0});
  expect(records()[1]).toBeNull();expect(records()[2]?.outcome).toBe('stalled');
 });
 it('locks cadence during a trial but leaves free exploration and earned evidence intact',()=>{
  const {click,q,controller,records}=fixture();const slider=q('.bike-cadence input') as unknown as HTMLInputElement;
  slider.value='90';slider.dispatchEvent(new Event('input'));expect(controller.snapshot!().cadence).toBe(90);
  click('[data-trial-gear="1"]');expect(slider.disabled).toBe(true);
  slider.value='100';slider.dispatchEvent(new Event('input'));expect(controller.snapshot!().cadence).toBe(60);
  tick(5000);const earned=records()[1];slider.value='80';slider.dispatchEvent(new Event('input'));
  expect(slider.disabled).toBe(false);expect(controller.snapshot!()).toMatchObject({cadence:80,challenge:'idle'});
  click('.bike-start');tick(100);expect(controller.snapshot!().running).toBe(true);expect(records()[1]).toEqual(earned);
 });
 it('reset clears all records, clone edits cannot mutate them, and disposal invalidates trial controls',()=>{
  const {click,q,controller,records,scope}=fixture();click('[data-trial-gear="2"]');
  records()[2]!.outcome='complete';expect(records()[2]?.outcome).toBe('stalled');
  click('[data-trial-gear="1"]');tick(300);const old=captured.slice();click('.bike-reset');
  old.forEach(fn=>fn(999999));expect(records()).toEqual([null,null,null]);
  expect(controller.snapshot!()).toMatchObject(initialState());
  const button=q('[data-trial-gear="2"]');scope.dispose();const frozen=controller.snapshot!();
  button.click();old.forEach(fn=>fn(999999));expect(controller.snapshot!()).toEqual(frozen);
  expect(scope.diagnostics()).toMatchObject({frames:0,listeners:0,timers:0});
 });
});
