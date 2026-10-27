import type {SceneContext, SceneController, PauseReason} from '../../app/contracts';
import {advance, drivetrain, hillResult, hillTrialRecord, HILL, initialState, REAR_TEETH, type HillTrialRecord} from './model';
import {hillLabMarkup,renderHillLab,trialOutcomeMessage} from './lab';
import {drawing} from './drawing';
import './style.css';
import {createObjectStage} from '../../shared/object-stage';

export function mountBicycle({root,scope,audio,observation,catalog=[]}:SceneContext):SceneController {
 const owned=document.createElement('main');owned.className='play-layout bicycle-exhibit';
 owned.innerHTML=`<aside class="play-dock" aria-label="自行车操作与原理"><p class="dock-title">踩得一样快，为什么车速不同？</p><p id="readout" role="status" aria-live="polite">先踩起来，再换一个挡位看看。</p><div class="bike-stats"><div><span>理论车速</span><strong data-read="speed">10.1<small> km/h</small></strong></div><div><span>后轮转速</span><strong data-read="rpm">80<small> rpm</small></strong></div></div><div class="actions" id="btns"><button type="button" class="act bike-start">开始踩踏</button><button type="button" class="act bike-reset">重新开始</button></div><div class="bike-gear-control"><span class="bike-control-label">后飞轮 · 大齿更省力，小齿更快</span><div class="bike-gears" role="group" aria-label="选择挡位">${REAR_TEETH.map((t,i)=>`<button type="button" data-gear="${i}" aria-pressed="${i===1}"><b>${i+1} 挡</b><span>${t} 齿 · ${['轻松','均衡','高速'][i]}</span></button>`).join('')}</div></div><label class="bike-cadence">目标踏频 <output>60 rpm</output><input type="range" min="30" max="100" step="5" value="60" aria-label="目标踏频，每分钟踩踏圈数"></label><div class="dock-extras"><details class="bike-challenge"><summary>爬坡实验 · 条件与简化</summary><p>每轮从零开始，以 60 rpm 试爬同一段 12 米教学坡道；曲柄扭矩上限 20 N·m，轮端需求 15 N·m。换挡会中断当前试爬，已完成记录保留；“重新开始”清空全部记录。</p><p class="bike-assumption">踏频相同，不代表用力或功率相同。理想匀速条件，不计损耗、惯性或打滑；阈值为教学设定，不代表真实坡度或体能。计时采用模型实际推进的秒数，慢看、暂停与离开页面不会增加成绩用时。</p></details><div class="bike-observation"></div><details><summary>图里省略了什么？</summary><p>这是传动比教学台架，不是真实骑行仿真。速度表示能维持目标踏频时的理论值。轮周长设为 2.10 米。</p><p>飞轮、链条和后拨在三维空间中分层展示。换挡时示意链条选择对应飞轮；不模拟真实换挡瞬态、弹簧力学、打滑与自由轮滑行。轮胎与齿轮尺寸是教学比例，不是制造图纸。</p><p>大飞轮降低同一轮端需求对应的曲柄扭矩，但不会凭空节省爬升的能量。</p></details><details><summary>逛逛其他小机器</summary><nav class="object-nav">${catalog.map(x=>`<a class="${x.id==='bicycle'?'current':''}" href="#/${x.id}">${x.name}</a>`).join('')}</nav></details><div class="bike-audio"></div></div></aside><section class="stage"><div class="bike-stage-heading"><div><span class="bike-label">传动实验 / NO. 11</span><h2>把力气，换成远方。</h2></div><button type="button" class="bike-zoom" aria-pressed="false">传动特写 ↗</button></div><svg id="fig" viewBox="60 35 800 505" role="img" aria-label="立体自行车模型，拖动旋转，点击踏板开始，点击飞轮换挡"></svg><div class="bike-equation"><span>前齿盘 <b>32</b></span><i>÷</i><span>后飞轮 <b data-read="teeth">24</b></span><i>=</i><span>后轮每踩一圈转 <b data-read="ratio">1.33</b> 圈</span></div><p class="stage-note">拖动旋转 · 点踏板踩踏 · 点飞轮换挡 · 双击复位</p>${hillLabMarkup}</section>`;
 root.append(owned);scope.onCleanup(()=>owned.remove());
 const q=<T extends Element=HTMLElement>(selector:string)=>owned.querySelector<T>(selector)!;
 let state=initialState(),disposed=false,frame=0,lastTime:number|null=null,rate=1,epoch=0;
 let records:Array<HillTrialRecord|null>=[null,null,null];
 const initialNotice='点左侧挡位开始；只有到顶或转不动，才留下记录。';
 let trialNotice=initialNotice;
 const reasons=new Set<PauseReason>();
 const start=q<HTMLButtonElement>('.bike-start'),resetButton=q<HTMLButtonElement>('.bike-reset'),cadence=q<HTMLInputElement>('.bike-cadence input'),zoom=q<HTMLButtonElement>('.bike-zoom'),tryButton=q<HTMLButtonElement>('.bike-try'),fig=q<SVGSVGElement>('#fig');
 const appearance=document.createElement('div');appearance.className='object-stage-controls';q('.dock-extras').prepend(appearance);
 const equation=q('.bike-equation');const explanation=document.createElement('details');explanation.innerHTML='<summary>齿数与传动比</summary>';explanation.append(equation);q('.bike-observation').after(explanation);
 const zoomButton=owned.querySelector('.bike-zoom')!;
 const objectStage=createObjectStage({root,scope,audio,observation,catalog},fig,appearance,{bounds:[-14,-3,0,18,127,85],camera:[-25,28],palette:'mint',draw:(g,p)=>drawing(state,g,p),action:a=>{if(a==='pedal')start.click();if(a==='gear'){const next=owned.querySelector<HTMLButtonElement>(`[data-gear="${(state.gear+1)%3}"]`);next?.click();}}});
 appearance.querySelector('.object-view-panel')!.append(zoomButton);
 const detach=audio.attach('bicycle',q('.bike-audio'));scope.onCleanup(detach);
 const observer=observation.mount({host:q('.bike-observation'),title:'看动作懂原理',intro:'前齿盘带动链条，链条带动后飞轮。换挡改变前后齿数比，不会凭空产生能量。',slow:true,scope:fig,onRate:(value:number)=>{rate=value;audio.setRate(value);renderHillLab(q('.bike-lab'),state,records,rate);},read:()=>{
  const d=drivetrain(state.gear,state.cadence);return {stage:state.running?'踏板 → 齿盘 → 链条 → 后轮':'暂停，比较齿数与传动比',text:`前 ${32} 齿 ÷ 后 ${d.rear} 齿 = ${d.ratio.toFixed(2)}。每踩一圈，后轮转 ${d.ratio.toFixed(2)} 圈。同样踏频下，大飞轮速度较低；同样轮端需求下，所需曲柄扭矩较小。`,readouts:[{label:'目标踏频',value:d.cadence+' rpm'},{label:'轮端 / 曲柄扭矩比',value:d.torqueMultiplier.toFixed(2)},{label:'本关轮端可用上限',value:d.availableWheelTorque.toFixed(1)+' N·m'},{label:'本关所需曲柄扭矩',value:d.requiredCrankTorque.toFixed(1)+' N·m'}],active:state.running?['chain','rear','crank']:[]};}});
 function live(){return !disposed&&scope.active;}
 function render(){
  if(!live())return;
  const d=drivetrain(state.gear,state.cadence);objectStage.render(state.zoom?[-2,7,-3,18,70,43]:undefined);fig.classList.toggle('bike-closeup',state.zoom);
  q('[data-read="speed"]').innerHTML=d.speedKmh.toFixed(1)+'<small> km/h</small>';q('[data-read="rpm"]').innerHTML=d.wheelRpm.toFixed(0)+'<small> rpm</small>';
  q('[data-read="teeth"]').textContent=String(d.rear);q('[data-read="ratio"]').textContent=d.ratio.toFixed(2);
  q('.bike-cadence output').textContent=state.cadence+' rpm';cadence.value=String(state.cadence);cadence.disabled=state.challenge==='riding';
  for(const b of owned.querySelectorAll<HTMLButtonElement>('[data-gear]'))b.setAttribute('aria-pressed',String(Number(b.dataset.gear)===state.gear));
  start.textContent=state.running?'暂停踩踏':'开始踩踏';start.setAttribute('aria-pressed',String(state.running));zoom.textContent=state.zoom?'整车视图 ↙':'传动特写 ↗';zoom.setAttribute('aria-pressed',String(state.zoom));
  renderHillLab(q('.bike-lab'),state,records,rate);
  observer?.update();
 }
 function announce(){
  const d=drivetrain(state.gear,state.cadence);
  q('#readout').textContent=state.running?`${state.gear+1} 挡 · 后 ${d.rear} 齿。每踩一圈，后轮转 ${d.ratio.toFixed(2)} 圈。`:'已停稳。换挡、调踏频，或打开原理观察。';
  q('.bike-challenge-result').textContent=trialNotice;
 }
 function stopFrame(){epoch++;if(frame)scope.cancelRaf(frame);frame=0;lastTime=null;}
 function schedule(){
  if(!live()||reasons.size||!state.running||frame)return;
  const stamp=epoch;frame=scope.raf(now=>{if(!live()||stamp!==epoch||reasons.size)return;frame=0;const dt=lastTime===null?0:Math.min((now-lastTime)/1000,.05);lastTime=now;const before=state.challenge;advance(state,dt*rate);render();if(before!==state.challenge){recordTrial();renderHillLab(q('.bike-lab'),state,records,rate);announce();if(state.challenge==='complete')audio.pulse('bell');}schedule();});
 }
 function changed(){render();announce();schedule();}
 function recordTrial(){
  const record=hillTrialRecord(state);if(!record)return;
  records[state.gear]=record;trialNotice=trialOutcomeMessage(state,records);
 }
 function beginTrial(gear=state.gear){
  if(!live())return;
  const interrupted=state.challenge==='riding';
  q<HTMLDetailsElement>('.bike-lab').open=true;
  stopFrame();state.gear=gear;state.cadence=HILL.cadence;state.distance=0;state.elapsed=0;
  state.challenge=hillResult(gear).feasible?'riding':'stalled';state.running=state.challenge==='riding';
  trialNotice=`${interrupted?'上轮未完成，不记成绩。':''}${gear+1} 挡试爬中 · 固定 60 rpm；其他挡位的记录会保留。`;
  recordTrial();
  if(interrupted&&state.challenge==='stalled')trialNotice='上轮未完成，不记成绩。'+trialNotice;
  changed();
 }
 function reset(){if(!live())return;stopFrame();state=initialState();records=[null,null,null];trialNotice=initialNotice;objectStage.resetCamera();observer?.reset();audio.reset();changed();}
 scope.listen(start,'click',()=>{
  if(state.challenge==='riding'&&!q<HTMLDetailsElement>('.bike-lab').open){state.challenge='idle';state.distance=0;state.elapsed=0;trialNotice='已回到自由踩踏；未完成的本轮不记成绩，已有记录保留。';}
  state.running=!state.running;
  if(state.challenge==='complete'||state.challenge==='stalled'){state.challenge='idle';state.distance=0;state.elapsed=0;trialNotice='已回到自由踩踏；试爬记录保留。';}
  else if(state.challenge==='riding')trialNotice=state.running?'继续试爬 · 计时只累计实际推进的模拟时间。':'本轮已暂停，尚未记成绩；继续试爬会从这里接着走。';
  stopFrame();audio.pulse('click');changed();
 });
 scope.listen(resetButton,'click',reset);
 for(const b of owned.querySelectorAll<HTMLButtonElement>('[data-gear]'))scope.listen(b,'click',()=>{
  if(state.gear===Number(b.dataset.gear))return;
  state.gear=Number(b.dataset.gear);
  if(state.challenge!=='idle'){
   trialNotice=state.challenge==='riding'?'换挡已中断本轮，不记成绩；之前的到顶 / 转不动记录仍保留。':'已换挡；之前的试爬记录仍保留。';
   state.challenge='idle';state.distance=0;state.elapsed=0;state.running=false;stopFrame();
  }
  audio.pulse('click');changed();
 });
 for(const b of owned.querySelectorAll<HTMLButtonElement>('[data-trial-gear]'))scope.listen(b,'click',()=>beginTrial(Number(b.dataset.trialGear)));
 scope.listen(cadence,'input',()=>{
  if(state.challenge==='riding'){render();return;}
  state.cadence=Number(cadence.value);
  if(state.challenge!=='idle'){state.challenge='idle';state.distance=0;state.elapsed=0;trialNotice='自由踏频已改变；记录仍来自固定 60 rpm 的试爬。';}
  changed();
 });
 scope.listen(zoom,'click',()=>{state.zoom=!state.zoom;render();});
 scope.listen(tryButton,'click',()=>{
  if(state.challenge!=='riding'){beginTrial();return;}
  state.running=!state.running;stopFrame();
  trialNotice=state.running?'继续试爬 · 计时只累计实际推进的模拟时间。':'本轮已暂停，尚未记成绩；继续试爬会从这里接着走。';changed();
 });
 scope.listen(q('.bike-lab'),'toggle',()=>{
  if(!q<HTMLDetailsElement>('.bike-lab').open&&state.challenge==='riding'&&state.running){state.running=false;stopFrame();trialNotice='试爬已暂停；展开实验后，点“继续试爬”从这里接着走。';changed();}
 });
 scope.listen(window,'blur',()=>{if(!live())return;state.running=false;stopFrame();audio.suspend('blur');if(state.challenge==='riding')trialNotice='已暂停本轮；回到页面后，点“继续试爬”。离开时间不计入成绩。';changed();});
 function cleanup(){if(disposed)return;disposed=true;stopFrame();observer?.dispose();detach();owned.remove();}
 scope.onCleanup(cleanup);
 render();
 return {pause(reason='manual'){if(!live()||reasons.has(reason))return;reasons.add(reason);objectStage.cancel();stopFrame();audio.suspend(reason);scope.pause();},resume(reason='manual'){if(!live()||!reasons.delete(reason)||reasons.size)return;scope.resume();lastTime=null;schedule();},reset,dispose(){if(disposed)return;scope.dispose();},snapshot(){return {...state,trials:records.map(record=>record?{...record}:null),paused:reasons.size>0,disposed:disposed||!scope.active};}};
}
