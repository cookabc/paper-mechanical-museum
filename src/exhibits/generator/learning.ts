import {electrical,type GeneratorState} from './model';

/** A fixed, evidence-gated activity, not an AI tutor. Never mutates the machine. */
export type LessonStep='idle'|'predict'|'baseline'|'open'|'explain'|'stopPredict'|'stop'|'reversePredict'|'reverseBaseline'|'reverse'|'complete';
export interface Lesson {step:LessonStep;answer:number|null;held:number;stopArmed:boolean;}
export const OBSERVE_SECONDS=1.5;
export const newLesson=():Lesson=>({step:'idle',answer:null,held:0,stopArmed:false});
export const QUESTIONS={
 predict:{title:'灯灭了，电压也消失了吗？',prompt:'线圈继续以 60 rpm 转动。断开开关后，你预测：',choices:['电压仍有，电流与灯功率归零','电压、电流与灯功率都归零','三者都不变'],feedback:['对。接下来亲手断开，看看读数是否支持预测。','先记下这个预测。开关断开与线圈停转是两件事，接下来用读数核对。','先记下这个预测。有电压是否就一定有电流？接下来亲手核对。']},
 explain:{title:'同样灯灭，原因是什么？',prompt:'刚才开路时仍有 4.44 V，却没有电流与灯功率。为什么？',choices:['线圈仍在转动，但电路不闭合','灯泡把电压储存了起来','其实电压已经归零'],feedback:['对。转动产生感应电压；闭合回路才有流过灯泡的电流。','这里没有电池或储能。电压来自持续转动，不是灯泡保存的电。','注意刚才的实测：电压有效值仍为 4.44 V；归零的是开路电流和灯功率。']},
 stopPredict:{title:'如果不是开路，而是停转？',prompt:'保持开路，把仍在转动的线圈停下来。你预测电压有效值：',choices:['降到零','仍为 4.44 V','变成负的 4.44 V'],feedback:['对。接下来停止摇动，核对零读数。','没有继续变化的磁通，就没有这台模型的感应电压。请停转验证。','有效值不会为负；停止后感应电压为零。请用停止操作验证。']},
 reversePredict:{title:'换个方向，灯会更暗吗？',prompt:'闭合电路，以同样的转速大小，从正向 60 改为反向 60 rpm。电压有效值与平均功率会：',choices:['两者不变','两者变为负值','两者都变小'],feedback:['对。反转改变相位推进方向；同样转速大小下，有效值与平均功率不变。','交流瞬时电压、电流有正负；有效值与电阻消耗的平均功率不会因此变负。','转速大小与电阻没变，所以有效值与平均功率不变。请亲手比较。']},
} as const;
export type QuestionStep=keyof typeof QUESTIONS;
export function isQuestion(step:LessonStep):step is QuestionStep{return step in QUESTIONS;}
function move(l:Lesson,step:LessonStep){l.step=step;l.answer=null;l.held=0;l.stopArmed=false;}
export function startLesson(l:Lesson){move(l,'predict');}
export function answerLesson(l:Lesson,answer:number){if(isQuestion(l.step)&&l.answer===null&&Number.isInteger(answer)&&answer>=0&&answer<3)l.answer=answer;}
export function continueLesson(l:Lesson){
 if(!isQuestion(l.step)||l.answer===null)return;
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
