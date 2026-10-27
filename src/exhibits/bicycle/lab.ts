import {drivetrain,HILL,REAR_TEETH,type BicycleState,type HillTrialRecord} from './model';

export const hillLabMarkup=`<details class="bike-lab" aria-labelledby="bike-lab-title">
 <summary class="bike-lab-heading"><h2 id="bike-lab-title" tabindex="-1">换挡，谁先到坡顶？</h2><span>12 米 · 对照实验</span></summary><div class="bike-lab-body">
 <p class="bike-lab-conditions">同为 <b>60 rpm</b> · 曲柄上限 <b>20 N·m</b> · 后轮需 <b>15 N·m</b></p>
 <div class="bike-lanes" aria-label="三个挡位的试爬记录">
 ${REAR_TEETH.map((teeth,gear)=>`<div class="bike-lane" data-lane="${gear}" data-outcome="untried">
  <button type="button" class="bike-lane-choice" data-trial-gear="${gear}" aria-label="试爬 ${gear+1} 挡，后飞轮 ${teeth} 齿"><b>${gear+1} 挡</b><span>${teeth} 齿 ↗</span></button>
  <svg class="bike-course" viewBox="0 0 300 38" aria-hidden="true"><path class="bike-course-track" d="M12 29L284 9"/><path class="bike-course-travel" d="M12 29L12 29"/><path class="bike-course-flag" d="M284 9V1l9 2-9 2"/><g class="bike-course-marker" transform="translate(12 29)"><circle r="4"/><path d="M-2-2l4 4m0-4-4 4"/></g></svg>
  <div class="bike-lane-result"><strong>—</strong><span>尚未试爬</span></div>
 </div>`).join('')}
 </div>
 <div class="bike-lab-footer"><div class="bike-trial-now" aria-live="off"><b data-read="trial">选一挡，试爬看看。</b><span data-read="clock">计时为模拟秒，不是现实用时。</span></div><button type="button" class="bike-try">试爬 2 挡</button></div>
 <p class="bike-challenge-result" role="status" aria-live="polite" aria-atomic="true">点左侧挡位开始；只有到顶或转不动，才留下记录。</p>
</div></details>`;

const put=(element:Element|null,value:string)=>{if(element&&element.textContent!==value)element.textContent=value;};

/** Rendering has no clock of its own and never creates a trial result. */
export function renderHillLab(root:HTMLElement,state:BicycleState,records:ReadonlyArray<HillTrialRecord|null>,rate:number){
 const finished=records.filter((record):record is HillTrialRecord=>record?.outcome==='complete');
 const fastest=finished.length>1?Math.min(...finished.map(record=>record.elapsed)):null;
 for(const lane of root.querySelectorAll<HTMLElement>('[data-lane]')){
  const gear=Number(lane.dataset.lane),record=records[gear],current=state.challenge!=='idle'&&state.gear===gear;
  const riding=current&&state.challenge==='riding',distance=current?state.distance:record?.distance||0;
  const outcome=riding?'riding':record?.outcome||'untried';
  const best=!riding&&!!record&&record.outcome==='complete'&&record.elapsed===fastest;
  lane.dataset.outcome=outcome;lane.dataset.current=String(current);lane.dataset.best=String(best);
  const x=12+272*distance/HILL.distance,y=29-20*distance/HILL.distance;
  lane.querySelector('.bike-course-travel')!.setAttribute('d',`M12 29L${x} ${y}`);
  lane.querySelector('.bike-course-marker')!.setAttribute('transform',`translate(${x} ${y})`);
  put(lane.querySelector('.bike-lane-result strong'),riding?`${state.elapsed.toFixed(2)} s`:record?.outcome==='complete'?`${record.elapsed.toFixed(2)} s`:record?'转不动':'—');
  put(lane.querySelector('.bike-lane-result span'),riding?(state.running?'试爬中':'已暂停')+(record?.outcome==='complete'?` · 上次 ${record.elapsed.toFixed(2)} s`:''):record?.outcome==='complete'?(best?'到顶 · 当前最快':'已到顶'):record?'10 < 15 N·m':'尚未试爬');
  lane.querySelector('button')!.setAttribute('aria-label',`试爬 ${gear+1} 挡，后飞轮 ${REAR_TEETH[gear]} 齿${record?.outcome==='complete'?`，上次 ${record.elapsed.toFixed(2)} 模拟秒到顶`:record?'，上次转不动':''}`);
 }
 const riding=state.challenge==='riding';
 put(root.querySelector('[data-read="trial"]'),state.challenge==='idle'?'选一挡，试爬看看。':`${state.gear+1} 挡 · ${state.distance.toFixed(1)} / ${HILL.distance} 米${riding?(state.running?'':' · 已暂停'):state.challenge==='complete'?' · 到顶':' · 未能起步'}`);
 put(root.querySelector('[data-read="clock"]'),`${riding?`${state.elapsed.toFixed(2)} 模拟秒 · `:''}${rate===.25?'¼ 速观察 · ':''}模拟计时，不含暂停；不是现实用时。`);
 const button=root.querySelector<HTMLButtonElement>('.bike-try')!;
 put(button,riding?(state.running?'暂停试爬':'继续试爬'):`${state.challenge==='idle'?'试爬':'再试'} ${state.gear+1} 挡`);
 button.setAttribute('aria-pressed',String(riding&&state.running));
}

export function trialOutcomeMessage(state:BicycleState,records:ReadonlyArray<HillTrialRecord|null>){
 if(state.challenge==='stalled')return `${state.gear+1} 挡转不动：轮端最多 ${drivetrain(state.gear,HILL.cadence).availableWheelTorque.toFixed(0)} N·m，低于所需 15 N·m。换一挡试试。`;
 const finished=records.filter((record):record is HillTrialRecord=>record?.outcome==='complete').sort((a,b)=>a.elapsed-b.elapsed);
 if(finished.length>1)return `${finished[0].gear+1} 挡比 ${finished[1].gear+1} 挡少用约 ${(finished[1].elapsed-finished[0].elapsed).toFixed(2)} 模拟秒。${records.some(record=>!record)?'还有一挡，等你试爬。':'三挡记录已齐：更快的传动比，不一定爬得上。'}`;
 return `${state.gear+1} 挡到顶 · ${state.elapsed.toFixed(2)} 模拟秒。换一挡，再留下一个对照。`;
}
