import {describe,it,expect,afterEach,vi} from 'vitest';
import {initialState,advance,moveTo,newPaper,angle,TRAVEL,RADIUS} from '../src/exhibits/rackpress/model';
import {drawing} from '../src/exhibits/rackpress/drawing';
import {mountRackPress} from '../src/exhibits/rackpress';
import {ResourceScope} from '../src/app/scope';
import {createColorFiguresRuntime} from '../src/engines/colorfigures/runtime.js';
import type {SceneContext} from '../src/app/contracts';
const scopes:ResourceScope[]=[];
afterEach(()=>{scopes.splice(0).forEach(s=>s.dispose());document.body.replaceChildren();vi.restoreAllMocks();});
function context(){const root=document.createElement('main');document.body.append(root);const scope=new ResourceScope();scopes.push(scope);return {root,scope,audio:{pulse:vi.fn()},observation:{}} as unknown as SceneContext;}
describe('rack-and-pinion press',()=>{
 it('rigidly maps wheel angle to rack translation and reverses without resetting',()=>{const s=initialState();s.running=true;advance(s,.1);expect(s.travel).toBeCloseTo(.63);expect(angle(s)*RADIUS).toBeCloseTo(s.travel);s.direction=-1;advance(s,.05);expect(s.travel).toBeCloseTo(.315);expect(s.observedDown&&s.observedUp).toBe(true);});
 it('only imprints at actual contact; keeps print after raising; prevents paper exchange under die',()=>{const s=initialState();moveTo(s,TRAVEL-.01);expect(s.imprint).toBeNull();expect(newPaper(s)).toBe(false);moveTo(s,TRAVEL);expect(s.imprint).toBe('flower');expect(s.contacts).toBe(1);moveTo(s,TRAVEL);expect(s.contacts).toBe(1);moveTo(s,0);expect(s.imprint).toBe('flower');expect(newPaper(s)).toBe(true);expect(s.imprint).toBeNull();});
 it('clamps both end stops and rejects invalid movement/time',()=>{const s=initialState();moveTo(s,Infinity);expect(s.travel).toBe(0);moveTo(s,100);expect(s.travel).toBe(TRAVEL);expect(s.running).toBe(false);moveTo(s,-10);expect(s.travel).toBe(0);s.running=true;advance(s,NaN);advance(s,-1);expect(s.travel).toBe(0);});
 it('freezes paused motion and clears animation resources on disposal',()=>{const c=context(),control=mountRackPress(c);const button=c.root.querySelector<HTMLButtonElement>('.press-step')!;button.click();expect(control.snapshot?.().travel).toBeGreaterThan(0);control.pause('manual');const travel=control.snapshot?.().travel;button.click();expect(control.snapshot?.().travel).toBe(travel);control.resume('manual');button.click();expect(Number(control.snapshot?.().travel)).toBeGreaterThan(Number(travel));control.reset();expect(control.snapshot?.().travel).toBe(0);control.dispose();expect(c.root.children).toHaveLength(0);});
 it('supports direct handwheel keyboard action, lowering and reversing',()=>{const c=context(),control=mountRackPress(c);c.root.querySelector('[data-act=wheel]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(control.snapshot?.().travel).toBeCloseTo(Math.PI/2);c.root.querySelector<HTMLButtonElement>('.press-reverse')!.click();c.root.querySelector<HTMLButtonElement>('.press-step')!.click();expect(control.snapshot?.().travel).toBe(0);});
 it('draws finite dimensional solids at both limits, front, side and back',()=>{const c=context(),g=createColorFiguresRuntime(c);for(const yaw of[0,64,244])for(const travel of[0,14,28]){const s=initialState();moveTo(s,travel);g.setCam(yaw,24);const svg=drawing(s,g);expect(svg).not.toMatch(/NaN|Infinity/);expect(svg).toContain('data-act="wheel"');expect(svg).toContain('role="button"');expect(svg.length).toBeGreaterThan(20000);}});
});

it('range End-equivalent input contacts and stamps immediately without waiting for change, then Home reveals the retained print',()=>{
 const c=context(),control=mountRackPress(c),slider=c.root.querySelector<HTMLInputElement>('.press-position input')!;
 // JSDOM does not implement the native range End/Home default action. Reproduce
 // the browser's value+input sequence on the real range control, not a model call.
 slider.focus();slider.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));
 slider.value='178.253536262923';slider.dispatchEvent(new Event('input',{bubbles:true}));
 expect(control.snapshot?.()).toMatchObject({travel:TRAVEL,contact:true,imprint:'flower',contacts:1,running:false});
 expect(c.root.querySelector('.press-status')!.textContent).toContain('压头接触纸面');
 expect(c.root.querySelector('[data-read=travel]')!.textContent).toContain('28.0');
 slider.dispatchEvent(new Event('input',{bubbles:true}));expect(control.snapshot?.().contacts).toBe(1);
 slider.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));slider.value='0';slider.dispatchEvent(new Event('input',{bubbles:true}));
 expect(control.snapshot?.()).toMatchObject({travel:0,contact:false,imprint:'flower',contacts:1});
 expect(c.root.querySelector('.press-status')!.textContent).toContain('纸上保留了花朵');
 expect(c.root.querySelector('.object-art [fill="#a84e3b"]')).not.toBeNull();
});

it('snaps floating-point endpoint noise but does not stamp before actual contact tolerance',()=>{
 for(const delta of [-1e-12,0,1e-12]){const s=initialState();s.running=true;moveTo(s,TRAVEL+delta);expect(s).toMatchObject({travel:TRAVEL,contact:true,imprint:'flower',contacts:1,running:false});}
 const s=initialState();moveTo(s,TRAVEL-1e-6);expect(s.imprint).toBeNull();
 moveTo(s,1e-12);expect(s.travel).toBe(0);
});
