import {electrical,type GeneratorState} from './model';

/** A fixed, evidence-gated activity, not an AI tutor. Never mutates the machine. */
export type LessonStep='idle'|'predict'|'baseline'|'open'|'explain'|'stopPredict'|'stop'|'reversePredict'|'reverseBaseline'|'reverse'|'complete';
export type LessonInterruption='pause'|'hidden'|'blur';
export interface Lesson {step:LessonStep;answer:number|null;held:number;stopArmed:boolean;openPrediction:number|null;stopPrediction:number|null;reversePrediction:number|null;resetReason:string|null;resetId:number;interruption:LessonInterruption|null;}
export const OBSERVE_SECONDS=1.5;
export const newLesson=():Lesson=>({step:'idle',answer:null,held:0,stopArmed:false,openPrediction:null,stopPrediction:null,reversePrediction:null,resetReason:null,resetId:0,interruption:null});
export const QUESTIONS={
 predict:{title:'灯灭了，电压也消失了吗？',prompt:'线圈继续以 60 rpm 转动。断开开关后，你预测：',choices:['电压仍有，电流与灯功率归零','电压、电流与灯功率都归零','三者都不变'],correct:0,feedback:['这次观察支持你的预测：开路仍有电压，电流与灯功率归零。','这次观察与你的预测不同：开路后电压仍为 4.44 V，只有电流与灯功率归零。','这次观察与你的预测不同：电压仍在，但电流与灯功率已经归零。']},
 explain:{title:'同样灯灭，原因是什么？',prompt:'刚才开路时仍有 4.44 V，却没有电流与灯功率。为什么？',choices:['灯泡把电压储存了起来','线圈仍在转动，但电路不闭合','其实电压已经归零'],correct:1,feedback:['这里没有电池或储能。请结合仍在转动的线圈与断开的电路，再选择一次。','对。转动产生感应电压；闭合回路才有流过灯泡的电流。','请核对刚才的读数：电压有效值仍为 4.44 V；归零的是开路电流和灯功率。再选择一次。']},
 stopPredict:{title:'如果不是开路，而是停转？',prompt:'保持开路，把仍在转动的线圈停下来。你预测电压有效值：',choices:['仍为 4.44 V','变成负的 4.44 V','降到零'],correct:2,feedback:['这次观察与你的预测不同：停转后电压有效值为 0.00 V，不再是 4.44 V。','这次观察与你的预测不同：停转后电压有效值为 0.00 V；有效值不会为负。','这次观察支持你的预测：停转后电压有效值降到零。']},
 reversePredict:{title:'换个方向，灯会更暗吗？',prompt:'闭合电路，以同样的转速大小，从正向 60 改为反向 60 rpm。电压有效值与平均功率会：',choices:['两者不变','两者变为负值','两者都变小'],correct:0,feedback:['这次观察支持你的预测：同样转速大小下，有效值与平均功率不变。','这次观察与你的预测不同：有效值和电阻平均功率仍为正值；有正负的是交流瞬时电压、电流。','这次观察与你的预测不同：转速大小和电阻不变，有效值与平均功率也不变。']},
} as const;
export type QuestionStep=keyof typeof QUESTIONS;
export function isQuestion(step:LessonStep):step is QuestionStep{return step in QUESTIONS;}
function move(l:Lesson,step:LessonStep){l.step=step;l.answer=null;l.held=0;l.stopArmed=false;l.resetReason=null;l.interruption=null;}
export function startLesson(l:Lesson){Object.assign(l,newLesson());move(l,'predict');}
export function answerLesson(l:Lesson,answer:number){if(isQuestion(l.step)&&l.answer===null&&Number.isInteger(answer)&&answer>=0&&answer<3)l.answer=answer;}
export function continueLesson(l:Lesson){
 if(!isQuestion(l.step)||l.answer===null)return;
 // A wrong explanation may be retried, but never unlocks the next experiment.
 if(l.step==='explain'&&l.answer!==QUESTIONS.explain.correct){l.answer=null;return;}
 if(l.step==='predict')l.openPrediction=l.answer;
 if(l.step==='stopPredict')l.stopPrediction=l.answer;
 if(l.step==='reversePredict')l.reversePrediction=l.answer;
 const next:Record<QuestionStep,LessonStep>={predict:'baseline',explain:'stopPredict',stopPredict:'stop',reversePredict:'reverseBaseline'};
 move(l,next[l.step]);
}
export type OperationStep='baseline'|'open'|'stop'|'reverseBaseline'|'reverse';
export function isOperation(step:LessonStep):step is OperationStep{return ['baseline','open','stop','reverseBaseline','reverse'].includes(step);}
export interface ConditionDifference {kind:'speed'|'direction'|'circuit'|'running'|'readings';reason:string;adjustment:string;}
/** One source of truth for both evidence gates and the learner's diagnostics. */
export function lessonCondition(l:Lesson,s:GeneratorState){
 if(!isOperation(l.step))return null;
 const direction=l.step==='reverse'?-1:1,closed=l.step!=='open'&&l.step!=='stop',e=electrical(s);
 const differences:ConditionDifference[]=[];
 if(s.rpm!==60)differences.push({kind:'speed',reason:'转速不是 60 rpm',adjustment:'将设定转速调到 60 rpm'});
 if(s.direction!==direction)differences.push({kind:'direction',reason:`方向不是${direction===1?'正向':'反向'}`,adjustment:direction===1?'恢复正向':'切换为反向'});
 if(s.closed!==closed)differences.push({kind:'circuit',reason:closed?'电路未接通':'电路未断开',adjustment:closed?'接通电路':'断开电路'});
 const settingsMatch=differences.length===0;
 if(!s.running)differences.push({kind:'running',reason:'机器已停转',adjustment:'开始摇动'});
 // Preserve the physical readout gates, including AC zero crossings being valid.
 const readingsMatch=closed?e.rms>0&&e.averagePower>0:e.rms>0&&e.current===0&&e.averagePower===0;
 if(settingsMatch&&s.running&&!readingsMatch)differences.push({kind:'readings',reason:'读数尚未符合观察条件',adjustment:'等待当前读数稳定'});
 return {direction,closed,e,differences,eligible:differences.length===0,stoppedEvidence:settingsMatch&&!s.running&&e.rms===0};
}
function resetEvidence(l:Lesson,reason:string){
 if(l.held>0){l.resetReason=`上段观察已清零：${reason}。`;l.resetId++;}
 l.held=0;
}
/** Observation freeze is not a machine stop; blur separately stops it in the adapter. */
export function interruptLesson(l:Lesson,reason:LessonInterruption='pause'){
 resetEvidence(l,reason==='hidden'?'页面进入后台，观察冻结':reason==='blur'?'窗口失焦，机器自动停转':'观察暂停');
 l.stopArmed=false;if(isOperation(l.step))l.interruption=reason;
}
export function observeLesson(l:Lesson,s:GeneratorState,dt=0,action:'control'|'stop'|'none'='none'){
 const condition=lessonCondition(l,s);if(!condition)return;
 if(l.step==='stop'){
  // Only a fresh valid running setup followed by the learner's stop event counts.
  const accepted=action==='stop'&&l.stopArmed&&condition.stoppedEvidence;
  l.stopArmed=action!=='stop'&&condition.eligible;
  if(condition.eligible)l.interruption=null;
  if(accepted)move(l,'reversePredict');
  return;
 }
 const next:Partial<Record<LessonStep,LessonStep>>={baseline:'open',open:'explain',reverseBaseline:'reverse',reverse:'complete'};
 if(!condition.eligible){resetEvidence(l,condition.differences.map(d=>d.reason).join('、'));return;}
 l.interruption=null;
 const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
 if(elapsed>0)l.resetReason=null;
 l.held=Math.min(OBSERVE_SECONDS,l.held+elapsed);
 if(l.held>=OBSERVE_SECONDS-1e-8)move(l,next[l.step]!);
}
