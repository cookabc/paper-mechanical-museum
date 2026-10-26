import {QUESTIONS,isQuestion,lessonCondition,OBSERVE_SECONDS,type Lesson} from './learning';
import type {GeneratorState} from './model';
const neutralPrediction='预测已记录。先用机器观察，再回来核对；现在不判对错。';
const button=(action:string,label:string)=>`<button type="button" data-lesson="${action}">${label}</button>`;
export type ObservationPause='hidden'|'pause'|null;
/** Presentation only: never changes the machine or awards observation evidence. */
export function lessonDiagnostic(l:Lesson,s:GeneratorState,paused:ObservationPause=null){
 const c=lessonCondition(l,s);if(!c)return null;
 const setup=`${c.direction===1?'正向':'反向'} 60 rpm · ${c.closed?'闭路':'开路'}`;
 const requirement=l.step==='stop'?`${setup}：先转动，再亲手停止`:`${setup} · 转动中`;
 const machine=!s.running?`实际已停转（0 rpm${l.interruption==='blur'?'，失焦自动停止':''}）`:paused?`机器保留运行状态（${s.rpm} rpm）`:s.rpm===0?'实际 0 rpm（已开启摇动）':`实际转动中（${s.rpm} rpm）`;
 const frozen=paused==='hidden'?'页面在后台，观察冻结':paused?'观察已暂停':'';
 const current=`设定 ${s.rpm} rpm · ${s.direction===1?'正向':'反向'} · ${s.closed?'闭路':'开路'}；${machine}${frozen?`；${frozen}，不等于亲手停转`:''}`;
 let adjustment:string;
 if(paused)adjustment='恢复观察后重新建立本步条件；冻结期间不计时，也不作为停转证据。';
 else if(c.differences.length)adjustment=c.differences.map(d=>d.adjustment).join('；')+(l.step==='stop'?'，重新观察转动后再亲手停止。':'。');
 else if(l.step==='stop')adjustment=l.stopArmed?'条件已就绪，请亲手点「停止摇动」或模型摇柄。':'先重新观察当前转动，再亲手停止；已停转的旧读数不能代替操作。';
 else adjustment='条件已符合，保持观察 1.5 秒模拟时间。';
 return {requirement,current,adjustment,resetReason:l.resetReason??'',readings:c.e,
  // Intentionally exclude current, progress and other per-frame electrical values.
  key:[l.step,s.rpm,s.direction,s.closed,s.running,paused,!s.running&&l.interruption,l.step==='stop'&&l.stopArmed,c.differences.map(d=>d.kind).join(',')].join(':')};
}
const diagnosticsHTML='<dl class="gen-lesson-diagnostic"><div><dt>本步要求</dt><dd data-lesson-requirement></dd></div><div><dt>当前状态</dt><dd data-lesson-current></dd></div><div><dt>还需调整</dt><dd data-lesson-adjustment></dd></div></dl><dl class="gen-lesson-readings" aria-label="本步实时电学读数"><div><dt>电压有效值</dt><dd><span data-lesson-reading="rms"></span><small> V</small></dd></div><div><dt>瞬时电流</dt><dd><span data-lesson-reading="current"></span><small> A</small></dd></div><div><dt>平均功率</dt><dd><span data-lesson-reading="power"></span><small> W</small></dd></div></dl><p class="gen-lesson-reset" data-lesson-reset hidden></p>';
export function lessonHTML(l:Lesson):string{
 if(l.step==='idle')return `<div class="gen-lesson-intro"><span>动手学 · 开路与停转</span>${button('start','先预测，再验证 ↗')}</div>`;
 const groups={predict:1,baseline:1,open:1,explain:2,stopPredict:3,stop:3,reversePredict:4,reverseBaseline:4,reverse:4,complete:4};
 let body:string;
 if(isQuestion(l.step)){
  const q=QUESTIONS[l.step];
  const result=l.step==='explain'&&l.openPrediction!==null?QUESTIONS.predict.feedback[l.openPrediction]:l.step==='reversePredict'&&l.stopPrediction!==null?QUESTIONS.stopPredict.feedback[l.stopPrediction]:'';
  body=`${result?`<p class="gen-lesson-feedback">${result}</p>`:''}<h3 tabindex="-1">${q.title}</h3><p>${q.prompt}</p><div class="gen-lesson-choices">${q.choices.map((text,i)=>`<button type="button" data-answer="${i}" ${l.answer!==null?'disabled':''} ${l.answer===i?'aria-pressed="true"':''}>${text}</button>`).join('')}</div>`;
  if(l.answer!==null){const explanation=l.step==='explain',correct=l.answer===q.correct;body+=`<p class="gen-lesson-feedback">${explanation?q.feedback[l.answer]:neutralPrediction}</p>${button('continue',explanation?(correct?'再验证：停转':'核对后重新选择'):'用机器验证')}`;}
 }else if(l.step==='complete')body=(l.reversePrediction!==null?`<p class="gen-lesson-feedback">${QUESTIONS.reversePredict.feedback[l.reversePrediction]}</p>`:'')+'<h3 tabindex="-1">同样灯灭，两种原因。</h3><p>你已亲手核对：开路仍转 → 有电压、无电流；停止转动 → 感应电压为零。</p><p>同为 60 rpm，正反转都是 4.44 V、1.97 W。改变的是相位推进方向；交流本来就周期换向，并非反转后电流永远朝一个方向。</p><p class="gen-lesson-feedback">实验完成。你已核对三次预测，并完成开路解释；可以继续自由探索，也可以从头再试。</p>';
 else {
  const copy={baseline:['先建立对照','请用原有控件：接通电路、恢复正向、选 60 rpm 并开始摇动。观察 1.5 秒模拟时间。'],open:['现在，亲手断开开关','保持正向 60 rpm 转动，点模型上的刀闸或「电路已接通」。观察电压有效值和平均功率。'],stop:['现在，亲手停止摇动','保持开路、60 rpm。若已停转，先开始摇动，再点摇柄或「停止摇动」，观察电压有效值怎样变化。'],reverseBaseline:['先恢复正向对照','接通电路，正向 60 rpm 开始摇动，观察 1.5 秒：4.44 V、1.97 W。'],reverse:['保持转速，只换方向','保持闭路与 60 rpm，点击「反向摇动」，再观察 1.5 秒。对比电压有效值和平均功率。']} as const;
  const [title,instruction]=copy[l.step];body=`<h3 tabindex="-1">${title}</h3><p>${instruction}</p>${diagnosticsHTML}`;
  if(l.step!=='stop')body+=`<progress class="gen-lesson-progress" max="${OBSERVE_SECONDS}" value="${l.held}" aria-label="当前条件下连续观察时间"></progress><p class="gen-lesson-hint">条件不符或暂停会重新计时；¼ 速下观察更久。</p>`;
 }
 return `<div class="gen-lesson-top"><span>预测 · 操作 · 解释 · 再验证</span><span>${groups[l.step]} / 4</span></div><div class="gen-lesson-body">${body}</div><div class="gen-lesson-footer">${button('restart','从头再试')}${button('exit','退出学习')}</div><p class="gen-lesson-hint">所有机器控件仍可使用；学习不会替你操作机器。</p>`;
}
