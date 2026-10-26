import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {mountBicycle} from '../src/exhibits/bicycle';
import {mountGenerator} from '../src/exhibits/generator';
import {ResourceScope} from '../src/app/scope';
import {createAudioService} from '../src/shared/audio.js';
import {createObservation} from '../src/shared/observation.js';

let cleanups:Array<()=>void>;
beforeEach(()=>{document.body.replaceChildren();cleanups=[];vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());});
afterEach(()=>{cleanups.reverse().forEach(fn=>fn());vi.unstubAllGlobals();document.body.replaceChildren();});
function pointer(target:Element,type:string,x=10,y=10,id=1){const event=new MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:id});target.dispatchEvent(event);}
// Original geometry allocates fresh clipping IDs on every draw; compare geometry, not counters.
const geometry=(element:Element)=>element.innerHTML.replace(/\bk\d+\b/g,'clip');
function key(target:Element,value:string){target.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));}
for(const [name,mount,action,secondary] of [
 ['bicycle',mountBicycle,'pedal','gear'],['generator',mountGenerator,'crank','switch'],
] as const){
 function fixture(){const root=document.createElement('section');document.body.append(root);const scope=new ResourceScope(),audioScope=new ResourceScope(),audio=createAudioService(audioScope);const controller=mount({root,scope,audio,observation:createObservation(root,scope)});cleanups.push(()=>{controller.dispose();audioScope.dispose();});return {root,scope,controller,svg:root.querySelector<SVGSVGElement>('#fig')!};}
 describe(`${name} solid-object interaction`,()=>{
  it('exposes direct object actions to keyboard and synthetic accessible clicks',()=>{const {root,controller}=fixture();key(root.querySelector(`[data-act="${action}"]`)!,'Enter');expect(controller.snapshot?.().running).toBe(true);key(root.querySelector(`[data-act="${action}"]`)!,' ');expect(controller.snapshot?.().running).toBe(false);const before=controller.snapshot?.();root.querySelector(`[data-act="${secondary}"]`)!.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));expect(controller.snapshot?.()).not.toEqual(before);});
  it('orbits actual projection, resets view and changes only material with palette',()=>{const {root,svg,controller}=fixture(),before=controller.snapshot?.(),art=svg.querySelector('.object-art')!;const front=geometry(art);key(svg,'ArrowRight');expect(geometry(art)).not.toBe(front);key(svg,'Home');expect(geometry(art)).toBe(front);root.querySelector<HTMLButtonElement>('[data-view="back"]')!.click();expect(geometry(art)).not.toBe(front);root.querySelector<HTMLButtonElement>('[data-view="front"]')!.click();expect(geometry(art)).toBe(front);root.querySelector<HTMLButtonElement>('[data-palette="tomato"]')!.click();expect(geometry(art)).not.toBe(front);expect(root.querySelector('[data-palette="tomato"]')?.getAttribute('aria-pressed')).toBe('true');expect(root.querySelectorAll('[data-palette][aria-pressed="true"]')).toHaveLength(1);expect(controller.snapshot?.()).toEqual(before);});
  it('does not trigger object action after orbit drag, cancellation, wrong pointer or pause',()=>{const {root,svg,controller}=fixture();pointer(root.querySelector(`[data-act="${action}"]`)!,'pointerdown');pointer(svg,'pointermove',80,35);expect(svg.classList.contains('is-orbiting')).toBe(true);pointer(svg,'pointerup',80,35);expect(controller.snapshot?.().running).toBe(false);expect(svg.classList.contains('is-orbiting')).toBe(false);pointer(root.querySelector(`[data-act="${action}"]`)!,'pointerdown');pointer(svg,'pointercancel');pointer(svg,'pointerup');expect(controller.snapshot?.().running).toBe(false);pointer(root.querySelector(`[data-act="${action}"]`)!,'pointerdown');pointer(svg,'pointerup',10,10,2);expect(controller.snapshot?.().running).toBe(false);controller.pause('hidden');controller.resume('hidden');pointer(svg,'pointerup');expect(controller.snapshot?.().running).toBe(false);pointer(root.querySelector(`[data-act="${action}"]`)!,'pointerdown');pointer(svg,'pointerup');expect(controller.snapshot?.().running).toBe(true);});
  it('scope disposal removes orbit listeners and disables retained direct-control nodes',()=>{const {root,svg,scope,controller}=fixture();const button=root.querySelector(`[data-act="${action}"]`)!;pointer(button,'pointerdown');scope.dispose();const before=controller.snapshot?.(),view=svg.getAttribute('viewBox');pointer(svg,'pointermove',90,60);pointer(svg,'pointerup',90,60);key(button,'Enter');key(svg,'ArrowRight');expect(controller.snapshot?.()).toEqual(before);expect(svg.getAttribute('viewBox')).toBe(view);expect(scope.diagnostics()).toMatchObject({active:false,listeners:0,frames:0,timers:0});expect(root.childElementCount).toBe(0);});
 });
}
