(() => {
 window.SCENES=window.SCENES||{};
 window.SCENES.turntable=()=>{
  const fresh=()=>({angle:0,rpm:33,platterRpm:0,playing:false,arm:0,armTarget:0,lift:1,liftTarget:1,cue:'rest',elapsed:0,ended:false,press:'',pressTime:0,message:'先移入唱臂，再轻轻落针；也可以先启动转盘。'}),state=fresh();
  const TRANSFER_LIFT=1.65;
  let token=0,pressToken=0,running=false,voices=new Set(),lastNote=-1;const wood=matOf('#b88c63');
  const audio=()=>window.MechanicalAudio;
  const observe=(id,svg)=>`<g data-observe-part="${id}">${svg}</g>`;
  const contact=s=>s.cue==='down'&&s.lift<.01&&s.arm>.99;
  function observation(s){let stage,text,active;
   if(s.cue==='returning'||s.cue==='parking'){stage=s.arm<=.001?'落回支架':s.lift<TRANSFER_LIFT-.001?'先抬针':'再归位';text=s.arm<=.001?'唱臂已回到支架上方，再轻轻降回托架，避免横向穿过两侧叉尖。':s.lift<TRANSFER_LIFT-.001?'先把唱针抬离唱纹，再让唱臂向支架移动，避免横扫唱片。':'唱针已经悬空，唱臂正移回支架；电机关闭，转盘逐渐停下。';active=['turntable-arm','turntable-stylus'];}
   else if(moving(s)&&s.cue==='hover'&&(s.lift>1.001||s.liftTarget>1.001)){stage=s.arm<.001?'抬离支架':s.arm<.999?'悬空移入':'停稳唱臂';text=s.arm<.001?'先把唱臂抬过托架两侧叉尖，再横向移向唱片。':s.arm<.999?'唱臂在支架上方留出间隙，悬空移向唱片外缘。':'唱臂已到唱片外缘，轻轻降低到悬针高度；停稳后再点击落针。';active=['turntable-arm','turntable-stylus'];}
   else if(moving(s)){stage=s.arm<.99?'移入唱臂':s.liftTarget<.5?'轻轻落针':'抬离唱纹';text=s.arm<.99?'唱臂悬空移到唱片外圈；此时唱针未接触唱纹，不会触发旋律。':s.liftTarget<.5?'唱臂已到外圈，唱针逐渐下降；接触唱纹且转盘启动后才触发合成旋律。':'唱针逐渐离开唱纹，合成旋律已停止；转盘与播放进度分别保留。';active=['turntable-arm','turntable-stylus'];}
   else if(!s.playing&&s.platterRpm>.01){stage='惯性减速';text='电机已关闭，转盘仍靠惯性滑行；本示意同步停声，播放进度保留。';active=['turntable-power','turntable-platter'];}
   else if(s.playing&&contact(s)){stage='转动并读纹';text='转盘带唱纹经过唱针，唱臂随进度向内移动；这里用合成旋律示意，转速改变节奏与音高。';active=['turntable-platter','turntable-stylus'];}
   else if(s.playing){stage='转盘空转';text='电机正在带动转盘，但唱针没有接触唱纹，所以还没有合成旋律。';active=['turntable-power','turntable-platter','turntable-stylus'];}
   else{stage=contact(s)?'落针待转':s.ended?'播放结束':'等待操作';text=contact(s)?'唱针已接触唱纹，但转盘静止；启动电机，让唱纹经过唱针才会触发合成旋律。':s.ended?'这一面已播完，唱针抬起、唱臂归位，转盘停下；移入唱臂可以从头开始。':'先移入唱臂、再落针；也可先启动转盘。只有转盘启动且唱针接触唱纹，才触发合成旋律。';active=contact(s)?['turntable-stylus','turntable-power']:['turntable-arm','turntable-power'];}
   return {stage,text,active,readouts:[{label:'电机',value:s.playing?'开启':'关闭'},{label:'转盘转速',value:`${s.platterRpm.toFixed(1)} 转/分`},{label:'唱针',value:contact(s)?'接触唱纹':'离开唱纹'},{label:'声音',value:!audio()?.enabled?'声音未开启':s.playing&&contact(s)?'合成旋律':'未触发'}]};
  }
  const moving=s=>Math.abs(s.arm-s.armTarget)>.01||Math.abs(s.lift-s.liftTarget)>.01||s.cue==='parking'||s.cue==='returning';
  const cueLabel=s=>s.cue==='returning'||s.cue==='parking'?'唱臂归位中':moving(s)?(s.liftTarget<.5?'正在轻轻落针':s.liftTarget>1&&s.arm<.001?'正在抬离支架':s.armTarget>s.arm?'正在移入唱臂':s.lift>1?'正在停稳唱臂':'正在抬针'):s.cue==='rest'?'移入唱臂':s.cue==='hover'?'放下唱针':'抬起唱针';
  // Keep short release tails inside the voice budget until onended disconnects them.
  function releaseVoice(v){if(v.releasing)return;v.releasing=true;const t=v.ctx.currentTime,p=v.g.gain,elapsed=Math.max(0,t-v.started),level=elapsed<v.attack?.0001*Math.pow(v.peak/.0001,elapsed/v.attack):v.peak*Math.pow(.0001/v.peak,Math.min(1,(elapsed-v.attack)/(v.decay-v.attack)));try{if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues?.(t);p.setValueAtTime(Math.max(.0001,level),t);}p.exponentialRampToValueAtTime(.0001,t+.01);v.o.stop(t+.012);}catch{try{v.o.stop()}catch{}}}
  function stopAudio(){for(const v of voices)releaseVoice(v);}
  function note(s,n){const bus=audio(),ctx=bus?.getContext?.()||bus?.context,output=bus?.getOutput?.()||bus?.output;if(!bus?.enabled||!ctx||!output||ctx.state!=='running'||document.hidden)return;if(voices.size>6){for(const v of [...voices].slice(0,voices.size-6))releaseVoice(v);return;}const seq=[48,55,60,64,62,55,59,62,53,60,65,69,55,62,67,71],now=ctx.currentTime;for(const [transpose,volume] of[[0,.05],[12,.016]]){const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=440*Math.pow(2,(seq[n%seq.length]+transpose-69)/12)*(Math.max(18,s.platterRpm)/33);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.02);g.gain.exponentialRampToValueAtTime(.0001,now+.45);o.connect(g);g.connect(output);o.start();o.stop(now+.48);const v={o,g,ctx,started:now,peak:volume,attack:.02,decay:.45,releasing:false};voices.add(v);o.onended=()=>{voices.delete(v);try{o.disconnect();g.disconnect()}catch{}};}}
  function start(s,ui){if(running)return;running=true;const id=token;ui.animate(dt=>{if(id!==token)return false;let active=false;const wasMoving=moving(s);
   if(Math.abs(s.lift-s.liftTarget)>.001){s.lift+=Math.sign(s.liftTarget-s.lift)*Math.min(Math.abs(s.liftTarget-s.lift),dt*(((s.lift>=1&&s.liftTarget>1)||s.lift>1)?10:2.1));active=true;}
   // The ordinary raised pose rests inside the U-cradle. Lift above both
   // fork tips before any sideways movement, then settle vertically again.
   const returning=s.cue==='returning'||s.cue==='parking';
   if(returning&&s.lift>=TRANSFER_LIFT-.001)s.armTarget=0;
   if(Math.abs(s.arm-s.armTarget)>.001&&s.lift>=TRANSFER_LIFT-.001){s.arm+=Math.sign(s.armTarget-s.arm)*Math.min(Math.abs(s.armTarget-s.arm),dt*1.8);active=true;}
   if((returning&&s.arm<=.001)||(s.cue==='hover'&&s.arm>=.999&&s.liftTarget>1))s.liftTarget=1;
   if(returning&&s.arm<=.001&&Math.abs(s.lift-1)<.001){const finished=s.cue==='returning';s.arm=0;s.cue='rest';if(!finished){s.elapsed=0;s.ended=false;lastNote=-1;}s.message=finished?'这一面播放完毕，唱臂已归位。移入唱臂可从头再听。':'唱臂已归位，电机已关闭。移入唱臂可从头播放。';audio()?.pulse?.('latch');}
   if(wasMoving&&!moving(s)&&s.cue==='hover')s.message=s.playing?'唱臂已停稳，放下唱针开始聆听。':'唱臂已停稳，下一步轻轻放下唱针。';
   if(wasMoving&&!moving(s)&&s.cue==='down')s.message=s.playing?'唱针已落入唱纹，旋律正在播放。':'唱针已落下，点击启动转盘开始聆听。';
   const target=s.playing?s.rpm:0;if(Math.abs(s.platterRpm-target)>.01){s.platterRpm+=Math.sign(target-s.platterRpm)*Math.min(Math.abs(target-s.platterRpm),dt*(s.playing?42:56));active=true;}else s.platterRpm=target;
   if(s.platterRpm>.01){s.angle=(s.angle+dt*s.platterRpm*Math.PI/30)%(Math.PI*2);active=true;}
   if(s.playing&&contact(s)){s.elapsed=Math.min(36,s.elapsed+dt*s.platterRpm/33);const n=Math.floor(s.elapsed*3);if(n!==lastNote){lastNote=n;note(s,n)}if(s.elapsed>=36){s.playing=false;s.ended=true;s.cue='returning';s.liftTarget=TRANSFER_LIFT;s.armTarget=1;s.message='这一面播放完毕，正在抬针并自动归位。';stopAudio();}}
   if(!active){running=false;return false;}return true;});}
  function press(s,key,ui){const id=++pressToken;s.press=key;s.pressTime=.18;ui.animate(dt=>{if(id!==pressToken)return false;s.pressTime=Math.max(0,s.pressTime-dt);if(!s.pressTime)s.press='';return s.pressTime>0;},{realtime:true});}
  function play(s,ui){if(s.cue==='returning'||s.cue==='parking')return ui.flash('唱臂正在归位，请稍等');if(s.ended){s.elapsed=0;s.ended=false;lastNote=-1;}s.playing=!s.playing;press(s,'play',ui);if(!s.playing){stopAudio();s.message='电机已关闭，转盘缓缓停下；唱针与进度保留。';}else s.message=s.cue==='down'?'电机启动，唱针正沿着唱纹向内移动。':s.cue==='hover'?'转盘已启动，轻轻放下唱针开始聆听。':'转盘已启动，下一步移入唱臂。';start(s,ui);ui.invalidate();}
  function cue(s,ui){if(moving(s))return ui.flash('唱臂正在移动，请等它停稳');if(s.cue==='rest'){if(s.ended){s.elapsed=0;s.ended=false;lastNote=-1;}s.cue='hover';s.armTarget=1;s.liftTarget=TRANSFER_LIFT;s.message='先抬离支架，再移到唱片外缘；停稳后轻轻落针。';}else if(s.cue==='hover'){s.cue='down';s.liftTarget=0;s.message=s.playing?'唱针正在落入唱纹，即将开始播放。':'唱针正在落下，下一步启动转盘。';}else{s.cue='hover';s.liftTarget=1;s.message='唱针已抬起，播放进度保留；可再次落针或归位。';stopAudio();}audio()?.pulse?.('cue');start(s,ui);ui.invalidate();}
  function park(s,ui){if(s.cue==='returning'||s.cue==='parking')return ui.flash('正在抬针归位，不用再按');if(s.cue==='rest'&&!moving(s))return ui.flash('唱臂已经在支架上');s.playing=false;s.cue='parking';s.liftTarget=TRANSFER_LIFT;s.armTarget=s.arm;s.message='先抬起唱针，再自动移回支架。';stopAudio();audio()?.pulse?.('cue');start(s,ui);ui.invalidate();}
  function speed(s,ui){s.rpm=s.rpm===33?45:33;press(s,'speed',ui);s.message=`已切换为每分钟 ${s.rpm} 转${s.playing?'，转速与音高正在变化。':'，启动后生效。'}`;audio()?.pulse?.('tick');start(s,ui);ui.invalidate();}
  function reset(s,ui){token++;pressToken++;running=false;stopAudio();lastNote=-1;Object.assign(s,fresh());ui.invalidate();}
  function scene(s,m){let out=castShadow([[0,0,7],[76,0,7],[76,64,7],[0,64,7],[0,0,36]]);const parts=[],add=(at,svg,key='')=>parts.push({at,svg,key});
   for(const x of[9,67])for(const y of[9,55])out+=cyl(x,y,0,5,4,DARK,toneI,.6)+cyl(x,y,4,7,4.5,METAL,toneI,.5);
   out+=box(0,0,6,76,64,10,wood,tone,1)+box(0,0,10,76,64,17,m,tone,1)+box(2,2,17,74,62,18,METAL,toneI,.5)+box(4,4,18,72,60,19,CERAMIC,toneI,.5);
   // Inset platter, machined rim and grooved black vinyl.
   let disc=cyl(36,36,19,21,24.5,DARK,toneI,.9)+cyl(36,36,21,23,24,METAL,toneI,.7)+cyl(36,36,23,24.2,22.8,DARK,toneI,.7);
   for(let r=10;r<=22;r+=1.2)disc+=line(on(PZ(24.3),ellUV(36,36,r,r,64)).concat([[36+r,36,24.3]]),.17);
   disc+=cyl(36,36,24.25,24.5,7.8,PALS.tomato,toneI,.4)+cyl(36,36,24.5,26,1.15,METAL,toneI,.3);
   const a=s.angle;disc+=line([[36+3*Math.cos(a),36+3*Math.sin(a),24.7],[36+6.3*Math.cos(a),36+6.3*Math.sin(a),24.7]],.65);
   for(const q of[.2,2.7,4.2]){const angle=a+q;disc+=line([[36+11*Math.cos(angle),36+11*Math.sin(angle),24.4],[36+21*Math.cos(angle),36+21*Math.sin(angle),24.4]],.18);}
   for(let i=0;i<48;i++){const angle=i*Math.PI/24;disc+=line([[36+24.1*Math.cos(angle),36+24.1*Math.sin(angle),21.5],[36+24.1*Math.cos(angle),36+24.1*Math.sin(angle),22.2]],.3);}
   add([36,36,23],act('play',observe('turntable-platter',disc),'role="button" tabindex="0" aria-label="播放或暂停唱片"'));
   // Full-depth tonearm pivot, counterweight, curved metal tube and cartridge.
   add([13,11,23],cyl(13,11,19,25,5,DARK,toneI,.6)+cyl(13,11,25,28,3.8,METAL,toneI,.5)+cyl(13,11,28,29,2.3,DARK,toneI,.4));
   const ang=.03+s.arm*(.35+s.elapsed/36*.28),len=39,z=27+s.lift*4,end=[13+len*Math.cos(ang),11+len*Math.sin(ang),z],mid=[13+30*Math.cos(ang-.08),11+30*Math.sin(ang-.08),z+1],back=[13-7*Math.cos(ang),11-7*Math.sin(ang),30];
   let arm=rod(back,[13,11,30],2.6,DARK,toneI,.55)+rod([13,11,30],mid,1.05,METAL,toneI,.45)+rod(mid,end,1.05,METAL,toneI,.45)+rod(end,[end[0]+3*Math.cos(ang),end[1]+3*Math.sin(ang),z],2,DARK,toneI,.5)+observe('turntable-stylus',rod([end[0]+2*Math.cos(ang),end[1]+2*Math.sin(ang),z-1],[end[0]+2*Math.cos(ang),end[1]+2*Math.sin(ang),z-2.7],.35,METAL,toneI,.25))+rod([end[0],end[1],z],[end[0]-1,end[1]-4,z+3],.45,METAL,toneI,.25);
   add([end[0],end[1],35],act('cue',observe('turntable-arm',arm),'role="button" tabindex="0" aria-label="移入唱臂或抬起放下唱针"'),'arm');
   add([40,9.7,26],box(38,7.7,19,42,11.7,23,m,toneI,.4)+rod([40,9.7,23],[40,9.7,30.7],.9,METAL,toneI,.4)+rod([40,8.1,32],[40,8.1,30.7],.45,METAL,toneI,.3)+rod([40,8.1,30.7],[40,11.3,30.7],.45,METAL,toneI,.3)+rod([40,11.3,30.7],[40,11.3,32],.45,METAL,toneI,.3));
   add([66,11,21],act('speed',cyl(66,11,19,21,3.9,DARK)+cyl(66,11,21,s.press==='speed'?21.4:22,3,METAL)+line([[66,11,s.press==='speed'?21.5:22.1],[66+(s.rpm===33?-2:2),11,s.press==='speed'?21.5:22.1]],.6),'role="button" tabindex="0" aria-label="切换三十三或四十五转"'));
   add([66,53,20],act('play',observe('turntable-power',cyl(66,53,19,20.5,4,DARK)+cyl(66,53,20.5,s.press==='play'?20.8:21.8,3.3,s.playing?PALS.tomato:m)),'role="button" tabindex="0" aria-label="启动或暂停电机"'));
   add([66,42,20],cyl(66,42,19,20,1.3,s.playing?PALS.tomato:DARK,toneI,.3));
   if(vis([1,0,0]))add([76.2,32,14],tx(76.3,32,12.1,'慢慢听 · 唱片机',3)+shape(on(PX(76.2),rrUV(5,11.5,15,15.5,.7)),DARK.d,.4)+tx(76.4,10,12.2,String(s.rpm),2.4,CERAMIC.l));
   if(vis([0,1,0]))for(let i=0;i<4;i++)add([20,64.1,10+i],line([[8,64.1,10+i],[30,64.1,10+i]],.22));
   for(const x of[5,71])for(const y of[5,59])add([x,y,19.2],cyl(x,y,19,19.3,.85,METAL,toneI,.2)+line([[x-.5,y,19.4],[x+.5,y,19.4]],.2));
   // Every tonearm segment is above the platter; a distant arm must not vanish under its top.
   return out+byDepth(parts.filter(p=>p.key!=='arm'))+parts.filter(p=>p.key==='arm').map(p=>p.svg).join('');
  }
  return {title:'唱片机',hint:'移入唱臂 · 轻轻落针 · 慢慢听',size:[80,68,40],state,scene,credit:false,observation:{title:'看动作懂原理',intro:'简化示意：电机带动转盘，落针后才触发合成旋律；不是对真实唱片音频的还原。',slow:true,read:observation},help:'点击唱臂移到唱片外缘，停稳后再点击落针。点击唱片或电源按钮启动、暂停；抬针会保留进度，「唱臂归位」会自动先抬针再移回支架。听完这一面也会自动归位。',idea:'转盘启动且唱针接触唱纹，才触发合成旋律；转速会改变节奏与音高，并非真实唱片音频还原。',readout:s=>`${s.message} · ${s.rpm} 转 / 分 · ${Math.floor(s.elapsed)} / 36 秒`,progress:s=>s.elapsed>0?{label:s.ended?'这一面已播放完毕':'唱片播放进度',value:s.elapsed/36}:null,buttons:[{label:'播放 / 暂停',text:s=>s.playing?'暂停转盘':s.elapsed>0&&!s.ended?'继续转盘':'启动转盘',onClick:play},{label:'移入唱臂 / 抬针 / 落针',text:cueLabel,onClick:cue},{label:'唱臂归位',text:s=>s.cue==='returning'||s.cue==='parking'?'唱臂归位中':'唱臂归位',onClick:park},{label:'切换 33 / 45 转',text:s=>`转速 ${s.rpm} → ${s.rpm===33?45:33} 转`,onClick:speed},{label:'重新开始',onClick:reset}],acts:{play:(s,e,ui)=>play(s,ui),cue:(s,e,ui)=>cue(s,ui),speed:(s,e,ui)=>speed(s,ui)},actionState:(s,key)=>key==='cue'?{label:cueLabel(s),hint:s.cue==='rest'?'移到唱片外缘':s.cue==='hover'?'轻轻落针':'抬起唱针，保留进度',busy:moving(s),active:s.cue==='down'}:key==='play'?{label:s.playing?'暂停转盘':'启动转盘',active:s.playing,busy:s.cue==='returning'||s.cue==='parking'}:key==='speed'?{label:`切换到 ${s.rpm===33?45:33} 转`,active:s.rpm===45}:null,setup(ui){
   const halt=()=>{pressToken++;state.playing=false;state.platterRpm=0;state.press='';state.pressTime=0;stopAudio();if(state.elapsed>0&&!state.ended)state.message='离开页面后已暂停，点击继续转盘即可接着听。';};
   document.addEventListener('visibilitychange',()=>{if(document.hidden)halt();else{start(state,ui);ui.invalidate();}});window.addEventListener('pagehide',()=>{halt();token++;running=false;});window.addEventListener('pageshow',()=>{if(moving(state))start(state,ui);ui.invalidate();});audio()?.onChange?.(event=>{if(!event.enabled||event.reason==='reset')stopAudio();});}};
 };
})();
