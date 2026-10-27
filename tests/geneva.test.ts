import {it,expect,vi} from 'vitest';
import {initialState,mechanism,advance,beginLesson,newLesson,observe,TAU,ENGAGE,PIN_RADIUS,CENTERS} from '../src/exhibits/geneva/model';
import {mountGeneva} from '../src/exhibits/geneva';
import {ResourceScope} from '../src/app/scope';
import {createAudioService} from '../src/shared/audio.js';
import {createObservation} from '../src/shared/observation.js';
it('each input revolution advances exactly one station, including negative cycles',()=>{for(let n=-4;n<=4;n++)expect(mechanism(-Math.PI+n*TAU).output).toBeCloseTo(-n*Math.PI/2);});
it('output dwells for 270 input degrees and advances only inside 90 degrees',()=>{expect(mechanism(-2).output).toBeCloseTo(0);expect(mechanism(-1).output).toBeCloseTo(0);expect(mechanism(1).output).toBeCloseTo(-Math.PI/2);expect(mechanism(2).output).toBeCloseTo(-Math.PI/2);expect(mechanism(0).engaged).toBe(true);expect(mechanism(2).engaged).toBe(false);});
it('the engagement boundaries are continuous with zero output speed',()=>{for(const p of [-ENGAGE,ENGAGE,Math.PI,-Math.PI]){expect(Math.abs(mechanism(p+.00001).output-mechanism(p-.00001).output)).toBeLessThan(.00001);}});
it('pin lies along the actual rotating slot throughout engagement',()=>{for(let a=-ENGAGE;a<=ENGAGE;a+=.025){const m=mechanism(a),slot=m.output+5*Math.PI/4;expect((m.pinX-66)*Math.sin(slot)-(m.pinY-42)*Math.cos(slot)).toBeCloseTo(0,9);expect(Math.hypot(m.pinX-66,m.pinY-42)).toBeGreaterThan(CENTERS-PIN_RADIUS-.001);}});
it('reverse retraces the exact pose, stopped model does not move and dt is bounded',()=>{const s=initialState();advance(s,2);expect(s.angle).toBe(-Math.PI);s.running=true;advance(s,1);const p=s.angle;expect(p).toBeCloseTo(-Math.PI+.05*12/60*TAU);s.direction=-1;advance(s,.05);expect(s.angle).toBeCloseTo(-Math.PI);});
it('prediction alone never completes; one observed single-direction revolution does',()=>{const s=initialState(),l=newLesson();beginLesson(l,s,'whole');expect(l.complete).toBe(false);for(let i=0;i<24;i++){const before=s.angle;s.angle+=Math.PI/12;observe(l,before,s);}expect(l).toMatchObject({complete:true,sawMove:true,sawDwell:true,prediction:'whole'});});
it('large angle jumps and reversals cannot manufacture a completed observation',()=>{const s=initialState(),l=newLesson();beginLesson(l,s,'quarter');s.angle+=TAU;observe(l,-Math.PI,s);expect(l.travel).toBe(0);const before=s.angle;s.angle+=.1;observe(l,before,s);s.angle-=.1;observe(l,before+.1,s);expect(l.travel).toBeCloseTo(.1);expect(l.complete).toBe(false);});
it('mount supports real crank controls, lesson independence, pause, reset and cleanup',()=>{vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});const root=document.createElement('section');document.body.append(root);const scope=new ResourceScope(),aScope=new ResourceScope(),audio=createAudioService(aScope);const c=mountGeneva({root,scope,audio,observation:createObservation(root,scope)});try{const snap=()=>c.snapshot!();const click=(s:string)=>root.querySelector<HTMLElement>(s)!.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));expect(snap().running).toBe(false);click('[data-answer=quarter]');expect(snap().running).toBe(false);const before=snap().angle as number;click('[data-act=crank]');expect(snap().angle).toBeCloseTo(before+Math.PI/12);c.pause('manual');click('.gv-step');expect(snap().angle).toBeCloseTo(before+Math.PI/12);c.resume('manual');click('.gv-reverse');click('.gv-step');expect(snap().angle).toBeCloseTo(before);click('.gv-explode');expect(snap().exploded).toBe(true);c.reset();expect(snap()).toMatchObject({angle:-Math.PI,running:false,exploded:false});expect(root.innerHTML).not.toContain('NaN');for(const part of ['wheel','pin','lock','shaft','carousel'])expect(root.querySelector(`[data-observe-part=${part}]`)).not.toBeNull();c.dispose();expect(root.children.length).toBe(0);expect(scope.diagnostics().active).toBe(false);}finally{c.dispose();aScope.dispose();root.remove();vi.unstubAllGlobals();}});

it('keeps the same slider cycle when reversing away from its 360 degree endpoint',()=>{
 const root=document.createElement('section');document.body.append(root);const scope=new ResourceScope(),aScope=new ResourceScope();
 const c=mountGeneva({root,scope,audio:createAudioService(aScope),observation:createObservation(root,scope)});
 try {
  const slider=root.querySelector<HTMLInputElement>('.gv-angle input')!;
  const set=(v:number)=>{slider.value=String(v);slider.dispatchEvent(new Event('input',{bubbles:true}));};
  set(360);expect(c.snapshot!().angle).toBeCloseTo(Math.PI);expect(slider.value).toBe('360');
  set(359);expect(c.snapshot!().angle).toBeCloseTo(Math.PI-TAU/360);
  set(0);expect(c.snapshot!().angle).toBeCloseTo(-Math.PI);
  set(1);expect(c.snapshot!().angle).toBeCloseTo(-Math.PI+TAU/360);
 } finally {c.dispose();aScope.dispose();root.remove();}
});

it('announces continuous phase transitions rather than leaving stale dwell text',()=>{
 let callback:FrameRequestCallback=()=>{};vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{callback=fn;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
 const root=document.createElement('section');document.body.append(root);const scope=new ResourceScope(),aScope=new ResourceScope();
 const c=mountGeneva({root,scope,audio:createAudioService(aScope),observation:createObservation(root,scope)});
 try {
  const slider=root.querySelector<HTMLInputElement>('.gv-angle input')!;const status=root.querySelector('.gv-status')!;
  const run=root.querySelector<HTMLButtonElement>('.gv-run')!;
  slider.value='134';slider.dispatchEvent(new Event('input'));run.click();expect(status.textContent).toContain('停歇');
  callback(0);callback(50);expect(status.textContent).toContain('推动');const text=status.textContent;callback(100);expect(status.textContent).toBe(text);
  slider.value='224';slider.dispatchEvent(new Event('input'));run.click();callback(150);callback(200);expect(status.textContent).toContain('停歇');
 } finally {c.dispose();aScope.dispose();root.remove();vi.unstubAllGlobals();}
});
