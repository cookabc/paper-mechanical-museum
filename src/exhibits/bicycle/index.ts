import type {SceneContext, SceneController, PauseReason} from '../../app/contracts';
import {advance, drivetrain, hillResult, HILL, initialState, REAR_TEETH} from './model';
import {drawing} from './drawing';
import './style.css';

export function mountBicycle({root,scope,audio,observation,catalog=[]}:SceneContext):SceneController {
 const owned=document.createElement('main');owned.className='play-layout bicycle-exhibit';
 owned.innerHTML=`<aside class="play-dock" aria-label="自行车操作与原理"><p class="dock-title">踩得一样快，为什么车速不同？</p><p id="readout" role="status" aria-live="polite">先踩起来，再换一个挡位看看。</p><div class="bike-stats"><div><span>理论车速</span><strong data-read="speed">10.1<small> km/h</small></strong></div><div><span>后轮转速</span><strong data-read="rpm">80<small> rpm</small></strong></div></div><div class="actions" id="btns"><button type="button" class="act bike-start">开始踩踏</button><button type="button" class="act bike-reset">重新开始</button></div><div class="bike-gear-control"><span class="bike-control-label">后飞轮 · 大齿更省力，小齿更快</span><div class="bike-gears" role="group" aria-label="选择挡位">${REAR_TEETH.map((t,i)=>`<button type="button" data-gear="${i}" aria-pressed="${i===1}"><b>${i+1} 挡</b><span>${t} 齿 · ${['轻松','均衡','高速'][i]}</span></button>`).join('')}</div></div><label class="bike-cadence">目标踏频 <output>60 rpm</output><input type="range" min="30" max="100" step="5" value="60" aria-label="目标踏频，每分钟踩踏圈数"></label><div class="dock-extras"><details class="bike-challenge"><summary>小挑战 · 找到爬坡的好挡位</summary><p>同样以 60 rpm 踩踏，哪一挡既能爬完 12 米，又最快？选好挡位，再试爬。</p><div class="bike-hill"><svg viewBox="0 0 240 62" aria-label="爬坡进度"><path d="M10 52L226 12" stroke="#9caa83" stroke-width="3" fill="none"/><path d="M226 12V2l-13 3 13 3" stroke="#9d6c4e" fill="#d6a16f"/><g class="hill-marker" transform="translate(10 46)"><circle r="5" fill="#719b7b" stroke="#3e5141"/></g></svg><progress max="12" value="0" aria-label="爬坡距离"></progress><span data-read="distance">0 / 12 米</span></div><p class="bike-challenge-result" role="status" aria-live="polite">本关：曲柄最多 20 N·m，后轮需要 15 N·m。</p><button type="button" class="bike-try">试爬这一挡</button><p class="bike-assumption">踏频相同，不代表用力或功率相同。理想匀速条件，不计损耗、惯性或打滑；阈值为教学设定，不代表真实坡度或体能。</p></details><div class="bike-observation"></div><details><summary>图里省略了什么？</summary><p>这是传动比教学台架，不是真实骑行仿真。速度表示能维持目标踏频时的理论值。轮周长设为 2.10 米。</p><p>飞轮侧视重叠，图中只展开选中的齿轮。链条用等效闭环展示，不模拟后拨的横向移动、张紧器、变速过渡和离合滑行。换挡瞬间不模拟惯性。</p><p>大飞轮降低同一轮端需求对应的曲柄扭矩，但不会凭空节省爬升的能量。</p></details><details><summary>逛逛其他小机器</summary><nav class="object-nav">${catalog.map(x=>`<a class="${x.id==='bicycle'?'current':''}" href="#/${x.id}">${x.name}</a>`).join('')}</nav></details><div class="bike-audio"></div></div></aside><section class="stage"><div class="bike-stage-heading"><div><span class="bike-label">传动实验 / NO. 11</span><h2>把力气，换成远方。</h2></div><button type="button" class="bike-zoom" aria-pressed="false">传动特写 ↗</button></div><svg id="fig" viewBox="60 35 800 505" role="img" aria-label="自行车侧视传动图，踏板带动前齿盘，链条带动后飞轮与车轮"></svg><div class="bike-equation"><span>前齿盘 <b>32</b></span><i>÷</i><span>后飞轮 <b data-read="teeth">24</b></span><i>=</i><span>后轮每踩一圈转 <b data-read="ratio">1.33</b> 圈</span></div><p class="stage-note">侧视教学图 · 用左侧按钮换挡 · 可暂停看清链条与齿轮</p></section>`;
 root.append(owned);scope.onCleanup(()=>owned.remove());
 const q=<T extends Element=HTMLElement>(selector:string)=>owned.querySelector<T>(selector)!;
 let state=initialState(),disposed=false,frame=0,lastTime:number|null=null,rate=1,epoch=0;
 const reasons=new Set<PauseReason>();
 const start=q<HTMLButtonElement>('.bike-start'),resetButton=q<HTMLButtonElement>('.bike-reset'),cadence=q<HTMLInputElement>('.bike-cadence input'),zoom=q<HTMLButtonElement>('.bike-zoom'),tryButton=q<HTMLButtonElement>('.bike-try'),fig=q<SVGSVGElement>('#fig');
 const detach=audio.attach('bicycle',q('.bike-audio'));scope.onCleanup(detach);
 const observer=observation.mount({host:q('.bike-observation'),title:'看动作懂原理',intro:'前齿盘带动链条，链条带动后飞轮。换挡改变前后齿数比，不会凭空产生能量。',slow:true,scope:fig,onRate:(value:number)=>{rate=value;audio.setRate(value);},read:()=>{
  const d=drivetrain(state.gear,state.cadence);return {stage:state.running?'踏板 → 齿盘 → 链条 → 后轮':'暂停，比较齿数与传动比',text:`前 ${32} 齿 ÷ 后 ${d.rear} 齿 = ${d.ratio.toFixed(2)}。每踩一圈，后轮转 ${d.ratio.toFixed(2)} 圈。同样踏频下，大飞轮速度较低；同样轮端需求下，所需曲柄扭矩较小。`,readouts:[{label:'目标踏频',value:d.cadence+' rpm'},{label:'轮端 / 曲柄扭矩比',value:d.torqueMultiplier.toFixed(2)},{label:'本关轮端可用上限',value:d.availableWheelTorque.toFixed(1)+' N·m'},{label:'本关所需曲柄扭矩',value:d.requiredCrankTorque.toFixed(1)+' N·m'}],active:state.running?['chain','rear','crank']:[]};}});
 function live(){return !disposed&&scope.active;}
 function render(){
  if(!live())return;
  const d=drivetrain(state.gear,state.cadence);fig.innerHTML=drawing(state);fig.setAttribute('viewBox',state.zoom?'170 278 380 230':'60 35 800 505');fig.classList.toggle('bike-closeup',state.zoom);
  q('[data-read="speed"]').innerHTML=d.speedKmh.toFixed(1)+'<small> km/h</small>';q('[data-read="rpm"]').innerHTML=d.wheelRpm.toFixed(0)+'<small> rpm</small>';
  q('[data-read="teeth"]').textContent=String(d.rear);q('[data-read="ratio"]').textContent=d.ratio.toFixed(2);
  q('.bike-cadence output').textContent=state.cadence+' rpm';cadence.value=String(state.cadence);cadence.disabled=state.challenge==='riding';
  for(const b of owned.querySelectorAll<HTMLButtonElement>('[data-gear]'))b.setAttribute('aria-pressed',String(Number(b.dataset.gear)===state.gear));
  start.textContent=state.running?'暂停踩踏':'开始踩踏';start.setAttribute('aria-pressed',String(state.running));zoom.textContent=state.zoom?'整车视图 ↙':'传动特写 ↗';zoom.setAttribute('aria-pressed',String(state.zoom));
  q('[data-read="distance"]').textContent=state.distance.toFixed(1)+' / 12 米';q<HTMLProgressElement>('progress').value=state.distance;
  q('.hill-marker').setAttribute('transform',`translate(${10+216*state.distance/12} ${46-40*state.distance/12})`);
  tryButton.textContent=state.challenge==='riding'?'重新试爬':'试爬这一挡';
  observer?.update();
 }
 function announce(){
  const d=drivetrain(state.gear,state.cadence);
  q('#readout').textContent=state.running?`${state.gear+1} 挡 · 后 ${d.rear} 齿。每踩一圈，后轮转 ${d.ratio.toFixed(2)} 圈。`:'已停稳。换挡、调踏频，或打开原理观察。';
  q('.bike-challenge-result').textContent=state.challenge==='stalled'?'转不动这段坡：轮端最多 10 N·m，低于所需 15 N·m。试试更大的后飞轮。':state.challenge==='complete'?(hillResult(state.gear).best?'找到了！2 挡刚好满足扭矩要求，比 1 挡更快。':'爬上来了！1 挡余量更大。再试 2 挡，能不能更快？'):state.challenge==='riding'?'正在试爬：踏频固定 60 rpm。换挡会重新开始本次试验。':'本关：曲柄最多 20 N·m，后轮需要 15 N·m。';
 }
 function stopFrame(){epoch++;if(frame)scope.cancelRaf(frame);frame=0;lastTime=null;}
 function schedule(){
  if(!live()||reasons.size||!state.running||frame)return;
  const stamp=epoch;frame=scope.raf(now=>{if(!live()||stamp!==epoch||reasons.size)return;frame=0;const dt=lastTime===null?0:Math.min((now-lastTime)/1000,.05);lastTime=now;const before=state.challenge;advance(state,dt*rate);render();if(before!==state.challenge){announce();if(state.challenge==='complete')audio.pulse('bell');}schedule();});
 }
 function changed(){render();announce();schedule();}
 function reset(){if(!live())return;stopFrame();state=initialState();observer?.reset();audio.reset();changed();}
 scope.listen(start,'click',()=>{state.running=!state.running;if(state.challenge==='complete'||state.challenge==='stalled'){state.challenge='idle';state.distance=0;}stopFrame();audio.pulse('click');changed();});
 scope.listen(resetButton,'click',reset);
 for(const b of owned.querySelectorAll<HTMLButtonElement>('[data-gear]'))scope.listen(b,'click',()=>{state.gear=Number(b.dataset.gear);if(state.challenge!=='idle'){state.challenge='idle';state.distance=0;state.running=false;stopFrame();}audio.pulse('click');changed();});
 scope.listen(cadence,'input',()=>{state.cadence=Number(cadence.value);changed();});
 scope.listen(zoom,'click',()=>{state.zoom=!state.zoom;render();});
 scope.listen(tryButton,'click',()=>{stopFrame();state.cadence=HILL.cadence;state.distance=0;state.challenge=hillResult(state.gear).feasible?'riding':'stalled';state.running=state.challenge==='riding';changed();});
 scope.listen(window,'blur',()=>{if(!live())return;state.running=false;stopFrame();audio.suspend('blur');changed();});
 function cleanup(){if(disposed)return;disposed=true;stopFrame();observer?.dispose();detach();owned.remove();}
 scope.onCleanup(cleanup);
 render();
 return {pause(reason='manual'){if(!live()||reasons.has(reason))return;reasons.add(reason);stopFrame();audio.suspend(reason);scope.pause();},resume(reason='manual'){if(!live()||!reasons.delete(reason)||reasons.size)return;scope.resume();lastTime=null;schedule();},reset,dispose(){if(disposed)return;scope.dispose();},snapshot(){return {...state,paused:reasons.size>0,disposed:disposed||!scope.active};}};
}
