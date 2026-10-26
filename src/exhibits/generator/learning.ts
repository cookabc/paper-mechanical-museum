import {electrical,type GeneratorState} from './model';

/** A fixed, evidence-gated activity, not an AI tutor. Never mutates the machine. */
export type LessonStep='idle'|'predict'|'baseline'|'open'|'explain'|'stopPredict'|'stop'|'reversePredict'|'reverseBaseline'|'reverse'|'complete';
export interface Lesson {step:LessonStep;answer:number|null;held:number;stopArmed:boolean;openPrediction:number|null;stopPrediction:number|null;reversePrediction:number|null;}
export const OBSERVE_SECONDS=1.5;
export const newLesson=():Lesson=>({step:'idle',answer:null,held:0,stopArmed:false,openPrediction:null,stopPrediction:null,reversePrediction:null});
export const QUESTIONS={
 predict:{title:'灯灭了，电压也消失了吗？',prompt:'线圈继续以 60 rpm 转动。断开开关后，你预测：',choices:['电压仍有，电流与灯功率归零','电压、电流与灯功率都归零','三者都不变'],correct:0,feedback:['这次观察支持你的预测：开路仍有电压，电流与灯功率归零。','这次观察与你的预测不同：开路后电压仍为 4.44 V，只有电流与灯功率归零。','这次观察与你的预测不同：电压仍在，但电流与灯功率已经归零。']},
 explain:{title:'同样灯灭，原因是什么？',prompt:'刚才开路时仍有 4.44 V，却没有电流与灯功率。为什么？',choices:['灯泡把电压储存了起来','线圈仍在转动，但电路不闭合','其实电压已经归零'],correct:1,feedback:['这里没有电池或储能。请结合仍在转动的线圈与断开的电路，再选择一次。','对。转动产生感应电压；闭合回路才有流过灯泡的电流。','请核对刚才的读数：电压有效值仍为 4.44 V；归零的是开路电流和灯功率。再选择一次。']},
 stopPredict:{title:'如果不是开路，而是停转？',prompt:'保持开路，把仍在转动的线圈停下来。你预测电压有效值：',choices:['仍为 4.44 V','变成负的 4.44 V','降到零'],correct:2,feedback:['这次观察与你的预测不同：停转后电压有效值为 0.00 V，不再是 4.44 V。','这次观察与你的预测不同：停转后电压有效值为 0.00 V；有效值不会为负。','这次观察支持你的预测：停转后电压有效值降到零。']},
 reversePredict:{title:'换个方向，灯会更暗吗？',prompt:'闭合电路，以同样的转速大小，从正向 60 改为反向 60 rpm。电压有效值与平均功率会：',choices:['两者不变','两者变为负值','两者都变小'],correct:0,feedback:['这次观察支持你的预测：同样转速大小下，有效值与平均功率不变。','这次观察与你的预测不同：有效值和电阻平均功率仍为正值；有正负的是交流瞬时电压、电流。','这次观察与你的预测不同：转速大小和电阻不变，有效值与平均功率也不变。']},
} as const;
export type QuestionStep=keyof typeof QUESTIONS;
export function isQuestion(step:LessonStep):step is QuestionStep{return step in QUESTIONS;}
function move(l:Lesson,step:LessonStep){l.step=step;l.answer=null;l.held=0;l.stopArmed=false;}
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
/** Pause/blur invalidates partial evidence, including a pending physical stop. */
export function interruptLesson(l:Lesson){l.held=0;l.stopArmed=false;}
export function observeLesson(l:Lesson,s:GeneratorState,dt=0,action:'control'|'stop'|'none'='none'){
 const e=electrical(s),forward=s.running&&s.rpm===60&&s.direction===1;
 if(l.step==='stop'){
  if(action!=='stop')l.stopArmed=s.running&&s.rpm===60&&s.direction===1&&!s.closed;
  // A blur, reset or old stopped snapshot cannot stand in for a learner stopping.
  if(action==='stop'&&l.stopArmed&&!s.running&&s.rpm===60&&s.direction===1&&!s.closed&&e.rms===0)move(l,'reversePredict');
  return;
 }
 let eligible=false,next:LessonStep|null=null;
 if(l.step==='baseline'||l.step==='reverseBaseline'){eligible=forward&&s.closed&&e.averagePower>0;next=l.step==='baseline'?'open':'reverse';}
 if(l.step==='open'){eligible=forward&&!s.closed&&e.rms>0&&e.current===0&&e.averagePower===0;next='explain';}
 if(l.step==='reverse'){eligible=s.running&&s.rpm===60&&s.direction===-1&&s.closed&&e.rms>0&&e.averagePower>0;next='complete';}
 if(!next)return;
 l.held=eligible?Math.min(OBSERVE_SECONDS,l.held+(Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0)):0;
 if(l.held>=OBSERVE_SECONDS-1e-8)move(l,next);
}
