import {describe,it,expect} from 'vitest';
import {initialState,electrical,type GeneratorState} from '../src/exhibits/generator/model';
import {newLesson,startLesson,answerLesson,continueLesson,observeLesson,interruptLesson,lessonCondition,QUESTIONS,type Lesson,type OperationStep} from '../src/exhibits/generator/learning';
import {lessonHTML,lessonDiagnostic} from '../src/exhibits/generator/learning-view';
function observe(l:Lesson,s:GeneratorState,seconds=1.5){for(let i=0;i<seconds*20;i++)observeLesson(l,s,.05);}
function answer(l:Lesson,choice=l.step==='explain'?QUESTIONS.explain.correct:0){answerLesson(l,choice);continueLesson(l);}
function toOpen(){const l=newLesson(),s=initialState();startLesson(l);answer(l);s.running=true;observe(l,s);return {l,s};}
describe('fixed generator learning path',()=>{
 it('records every prediction neutrally without revealing feedback before evidence',()=>{
  const l=newLesson(),s=initialState();observe(l,s,10);expect(l.step).toBe('idle');expect(lessonHTML(l)).not.toContain('4.44');
  for(const step of ['predict','stopPredict','reversePredict'] as const)for(let i=0;i<3;i++){
   Object.assign(l,newLesson(),{step});const unrevealed=lessonHTML(l);for(const feedback of QUESTIONS[step].feedback)expect(unrevealed).not.toContain(feedback);
   continueLesson(l);expect(l.step).toBe(step);answerLesson(l,-1);expect(l.answer).toBeNull();answerLesson(l,i);
   expect(lessonHTML(l)).toContain('预测已记录');for(const feedback of QUESTIONS[step].feedback)expect(lessonHTML(l)).not.toContain(feedback);
   answerLesson(l,(i+1)%3);expect(l.answer).toBe(i);continueLesson(l);expect(l.step).not.toBe(step);
  }
 });
 it('keeps incorrect explanations on the same question until retrying correctly',()=>{
  for(let i=0;i<3;i++){const l=newLesson();l.step='explain';continueLesson(l);expect(l.step).toBe('explain');answerLesson(l,i);expect(lessonHTML(l)).toContain(QUESTIONS.explain.feedback[i]);
   if(i===QUESTIONS.explain.correct){continueLesson(l);expect(l.step).toBe('stopPredict');}
   else{expect(lessonHTML(l)).toContain('核对后重新选择');expect(lessonHTML(l)).not.toContain('再验证：停转');continueLesson(l);expect(l.step).toBe('explain');expect(l.answer).toBeNull();continueLesson(l);expect(l.step).toBe('explain');answer(l,QUESTIONS.explain.correct);expect(l.step).toBe('stopPredict');}
  }
 });
 it('reveals each prediction feedback only after its physical evidence and clears it on restart',()=>{
  for(let choice=0;choice<3;choice++){
   const l=newLesson(),s=initialState();startLesson(l);answer(l,choice);s.running=true;observe(l,s);s.closed=false;observe(l,s);
   expect(l.step).toBe('explain');expect(l.openPrediction).toBe(choice);expect(lessonHTML(l)).toContain(QUESTIONS.predict.feedback[choice]);answer(l);answer(l,choice);
   expect(l.step).toBe('stop');expect(lessonHTML(l)).not.toContain('归零');expect(lessonHTML(l)).not.toContain(QUESTIONS.stopPredict.feedback[choice]);observeLesson(l,s);s.running=false;observeLesson(l,s,0,'stop');
   expect(l.step).toBe('reversePredict');expect(l.stopPrediction).toBe(choice);expect(lessonHTML(l)).toContain(QUESTIONS.stopPredict.feedback[choice]);answer(l,choice);
   s.closed=true;s.running=true;observe(l,s);expect(lessonHTML(l)).not.toContain(QUESTIONS.reversePredict.feedback[choice]);s.direction=-1;observe(l,s);
   expect(l.step).toBe('complete');expect(l.reversePrediction).toBe(choice);expect(lessonHTML(l)).toContain(QUESTIONS.reversePredict.feedback[choice]);startLesson(l);expect(l).toMatchObject({openPrediction:null,stopPrediction:null,reversePrediction:null});
  }
 });
 it('needs closed forward 60 rpm evidence before open-circuit evidence',()=>{const l=newLesson(),s=initialState();startLesson(l);answer(l,1);s.running=true;s.closed=false;observe(l,s,5);expect(l.step).toBe('baseline');s.closed=true;s.rpm=90;observe(l,s,5);expect(l.held).toBe(0);s.rpm=60;observe(l,s,1);expect(l.held).toBeCloseTo(1);s.direction=-1;observeLesson(l,s);expect(l.held).toBe(0);s.direction=1;observe(l,s);expect(l.step).toBe('open');observe(l,s,3);expect(l.step).toBe('open');s.closed=false;observe(l,s,1);s.running=false;observeLesson(l,s);expect(l.held).toBe(0);s.running=true;observe(l,s);expect(l.step).toBe('explain');expect(electrical(s)).toMatchObject({current:0,averagePower:0});expect(electrical(s).rms).toBeCloseTo(4.44288);});
 it('requires explicit stop, not initial stopped state, blur, or stale evidence',()=>{const {l,s}=toOpen();s.closed=false;observe(l,s);answer(l);answer(l);expect(l.step).toBe('stop');s.running=false;observeLesson(l,s,0,'stop');expect(l.step).toBe('stop');s.running=true;observeLesson(l,s);interruptLesson(l);s.running=false;observeLesson(l,s,0,'stop');expect(l.step).toBe('stop');s.running=true;observeLesson(l,s);s.running=false;observeLesson(l,s,0,'stop');expect(l.step).toBe('reversePredict');expect(electrical(s).rms).toBe(0);});
 it('rejects stopping after changing speed or direction away from the observed setup',()=>{for(const change of ['rpm','direction'] as const){const l=newLesson(),s=initialState();l.step='stop';s.running=true;s.closed=false;observeLesson(l,s);expect(l.stopArmed).toBe(true);if(change==='rpm')s.rpm=90;else s.direction=-1;observeLesson(l,s,0,'control');expect(l.stopArmed).toBe(false);s.running=false;observeLesson(l,s,0,'stop');expect(l.step).toBe('stop');}});
 it('requires reverse answer and fresh same-speed closed baselines, never uses instantaneous sign',()=>{const l=newLesson(),s=initialState();Object.assign(l,{step:'reversePredict'});answer(l,2);s.running=true;s.direction=-1;observe(l,s,3);expect(l.step).toBe('reverseBaseline');s.direction=1;s.phase=0;observe(l,s);expect(l.step).toBe('reverse');const before=electrical(s);s.direction=-1;s.closed=false;observe(l,s,3);expect(l.held).toBe(0);s.closed=true;s.rpm=30;observe(l,s,3);expect(l.held).toBe(0);s.rpm=60;observe(l,s);expect(l.step).toBe('complete');expect(electrical(s).rms).toBe(before.rms);expect(electrical(s).averagePower).toBe(before.averagePower);});
 it('caps timing, resets partial evidence on interruption, and never changes machine state',()=>{const {l,s}=toOpen();s.closed=false;const before={...s};observeLesson(l,s,100);expect(l.held).toBe(.05);observeLesson(l,s,NaN);expect(l.held).toBe(.05);interruptLesson(l);expect(l.held).toBe(0);observe(l,s);expect(s).toEqual(before);startLesson(l);expect(l).toMatchObject({step:'predict',answer:null,held:0,stopArmed:false});Object.assign(l,newLesson());expect(l.step).toBe('idle');expect(s).toEqual(before);});
});

describe('operation diagnostics share the evidence conditions',()=>{
 const steps:OperationStep[]=['baseline','open','stop','reverseBaseline','reverse'];
 const setup=(step:OperationStep)=>({l:{...newLesson(),step},s:{...initialState(),running:true,closed:step!=='open'&&step!=='stop',direction:step==='reverse'?-1 as const:1 as const}});
 it('reports every wrong setting and multiple simultaneous differences for every operation',()=>{
  for(const step of steps){
   const {l,s}=setup(step);expect(lessonCondition(l,s)?.eligible).toBe(true);
   for(const kind of ['speed','direction','circuit','running'] as const){
    const wrong={...s};if(kind==='speed')wrong.rpm=90;if(kind==='direction')wrong.direction=s.direction===1?-1:1;if(kind==='circuit')wrong.closed=!s.closed;if(kind==='running')wrong.running=false;
    expect(lessonCondition(l,wrong)?.differences.map(d=>d.kind),step).toEqual([kind]);expect(lessonCondition(l,wrong)?.eligible).toBe(false);
    observeLesson(l,wrong,.05);expect(l.held).toBe(0);expect(l.stopArmed).toBe(false);expect(l.resetReason).toBeNull();
   }
   const wrong={...s,rpm:30,direction:s.direction===1?-1 as const:1 as const,closed:!s.closed,running:false};
   expect(lessonCondition(l,wrong)?.differences.map(d=>d.kind)).toEqual(['speed','direction','circuit','running']);
   const d=lessonDiagnostic(l,wrong)!;expect(d.adjustment).toContain('60 rpm');expect(d.adjustment).toContain(step==='reverse'?'切换为反向':'恢复正向');expect(d.adjustment).toContain(s.closed?'接通电路':'断开电路');expect(d.adjustment).toContain('开始摇动');
   if(step!=='stop'){observeLesson(l,s,.05);observeLesson(l,wrong);for(const difference of lessonCondition(l,wrong)!.differences)expect(l.resetReason).toContain(difference.reason);expect(l.resetId).toBe(1);}
  }
 });
 it('explains genuine partial resets only, then recovers from zero without a stale warning',()=>{
  for(const kind of ['speed','direction','circuit','running'] as const){
   const {l,s}=setup('baseline');observeLesson(l,s,.05);const wrong={...s};if(kind==='speed')wrong.rpm=90;if(kind==='direction')wrong.direction=-1;if(kind==='circuit')wrong.closed=false;if(kind==='running')wrong.running=false;
   const cause=lessonCondition(l,wrong)!.differences[0].reason;observeLesson(l,wrong);expect(l.resetReason).toContain(cause);expect(l.resetId).toBe(1);expect(l.held).toBe(0);
   observeLesson(l,wrong,.05);expect(l.resetId).toBe(1);observeLesson(l,s,.05);expect(l.held).toBe(.05);expect(l.resetReason).toBeNull();
  }
  const {l,s}=setup('open');interruptLesson(l,'hidden');expect(l.resetReason).toBeNull();observeLesson(l,s,.05);interruptLesson(l,'hidden');expect(l.resetReason).toContain('页面进入后台，观察冻结');expect(l.resetId).toBe(1);
 });
 it('does not confuse paused observation, automatic blur stop and an explicit fresh stop',()=>{
  for(const reason of ['pause','hidden','blur'] as const){
   const {l,s}=setup('stop');observeLesson(l,s);expect(l.stopArmed).toBe(true);interruptLesson(l,reason);
   if(reason!=='blur'){const d=lessonDiagnostic(l,s,reason)!;expect(d.current).toContain('保留运行状态');expect(d.current).not.toContain('实际已停转');expect(d.current).toContain('不等于亲手停转');}
   s.running=false;observeLesson(l,s,0,'stop');expect(l.step).toBe('stop');expect(l.stopArmed).toBe(false);expect(lessonDiagnostic(l,s)!.adjustment).toContain('重新观察转动');
   s.running=true;observeLesson(l,s);s.running=false;observeLesson(l,s,0,'stop');expect(l.step).toBe('reversePredict');
  }
  const {l,s}=setup('stop');observeLesson(l,s);s.closed=true;observeLesson(l,s,0,'control');s.running=false;observeLesson(l,s,0,'stop');expect(l.step).toBe('stop');
 });
 it('keeps predictions free of new evidence, diagnostics pure and readings exactly model-backed',()=>{
  for(const step of ['idle','predict','explain','stopPredict','reversePredict','complete'] as const){const l={...newLesson(),step};expect(lessonDiagnostic(l,initialState())).toBeNull();expect(lessonHTML(l)).not.toContain('data-lesson-reading');}
  for(const step of steps){const {l,s}=setup(step);s.phase=.73;const before=JSON.stringify({l,s}),d=lessonDiagnostic(l,s)!;expect(d.readings).toEqual(electrical(s));expect(JSON.stringify({l,s})).toBe(before);s.running=false;const stopped=lessonDiagnostic(l,s)!;expect(stopped.current).toContain('设定 60 rpm');expect(stopped.current).toContain('实际已停转（0 rpm');expect(stopped.readings.rms).toBe(0);}
 });
});
