export function createCoffee(geometry,environment){const {window,document,scope}=environment;

 const initial=()=>({phase:'empty',beans:0,ground:0,filter:false,filterT:0,cup:false,cupT:0,takeT:0,fill:0,milk:0,milkT:0,brewT:0,pressure:0,t:0,targetFill:1,brewTarget:1,brewDuration:5.6,brewPaused:false,guideEnabled:false,guideWetSeen:false,guideHold:false,run:0,made:0,message:'从豆仓开始，为自己做一杯咖啡。'});
 const state=initial(),brown=geometry.matOf('#75462d'),cream=geometry.matOf('#e8c092');
 const hit=(n,svg,label)=>geometry.act(n,svg,`role="button" tabindex="0" aria-label="${label}"`);
 const observePart=(id,svg)=>`<g data-observe-part="${id}">${svg}</g>`,pct=n=>Math.round(n*100)+'%';
 const PREWET=.672,FLOW_SECONDS=4.928;let mainStep=null;
 const drivers={};function schedule(ui,key,fn){if(drivers[key]){drivers[key].fn=fn;return;}const driver={fn};drivers[key]=driver;ui.animate(dt=>{if(driver.fn(dt)===false){if(drivers[key]===driver)delete drivers[key];return false;}return true;});}
 const moving=s=>['adding','grinding','locking','placing','brewing','milk','taking'].includes(s.phase);
 const next=s=>({empty:'点豆仓加入咖啡豆',adding:'豆子正在落入豆仓',beans:'按研磨键',grinding:'等研磨完成后锁入手柄',ground:'点击手柄锁入冲煮头',locking:'手柄正在对准并旋紧',locked:s.cup?'按萃取键':'把杯子放到出液口下',placing:'杯子正在移入出液口',brewing:s.brewPaused?'观察已定格，可继续观察或结束萃取':'等待萃取完成，或再按萃取键停止',ready:s.fill<.02?'杯中还没有咖啡，按萃取键重新开始':s.milk?'点击杯子领取拿铁':'可加奶泡，或点击杯子领取',milk:'奶泡正在注入',taking:'正在端走咖啡',collected:'点击重新准备，再做一杯'}[s.phase]);
 const anim=(s,ui,phase,duration,update,done)=>{
  const run=++s.run;s.phase=phase;s.t=0;s.brewPaused=false;
  mainStep=dt=>{if(s.run!==run||s.brewPaused)return false;const checkpoint=phase==='brewing'&&s.guideEnabled&&!s.guideWetSeen&&s.t<PREWET&&s.t+dt>=PREWET;s.t=checkpoint?PREWET:s.t+dt;const k=Math.min(1,s.t/duration);update(k);if(checkpoint){s.guideWetSeen=true;s.guideHold=true;s.brewPaused=true;return false;}if(k===1){mainStep=null;done();return false;}return true;};
  schedule(ui,'main',mainStep);
 };
 const canSetTarget=s=>s.fill<.02&&!['brewing','milk','taking','collected'].includes(s.phase);
 function setTarget(s,value,ui){if(!canSetTarget(s))return ui.flash('本杯目标已锁定，重新准备后可调整。');if(value!==.5&&value!==1)return;s.targetFill=value;ui.invalidate();}
 function pause(s,ui){if(s.phase!=='brewing'&&!(s.guideEnabled&&moving(s)))return ui.flash('开始萃取后，可以暂停观察水流和液面。');s.brewPaused=!s.brewPaused;if(!s.brewPaused)s.guideHold=false;if(!s.brewPaused&&mainStep)schedule(ui,'main',mainStep);ui.invalidate();}

 function beans(s,ui){if(s.phase!=='empty')return ui.flash(next(s));s.message='咖啡豆落进豆仓，装好一杯的份量。';anim(s,ui,'adding',.7,k=>s.beans=k,()=>{s.phase='beans';s.message='咖啡豆已加入。按下研磨键。';});}
 function grind(s,ui){if(s.phase!=='beans')return ui.flash(next(s));s.message='研磨中，咖啡粉正在落入粉碗……';anim(s,ui,'grinding',2.7,k=>{s.beans=1-k;s.ground=k;},()=>{s.phase='ground';s.message='研磨完成，点击手柄锁入冲煮头。';});}
 function filter(s,ui){if(s.phase!=='ground')return ui.flash(s.filter?'手柄已锁紧。'+next(s):next(s));s.message='抬起粉碗，对准冲煮头，再旋转锁紧。';anim(s,ui,'locking',1,k=>s.filterT=k,()=>{s.filter=true;s.phase='locked';s.message='手柄已锁紧，再把杯子放到出液口下。';});}
 function cup(s,ui){if(s.phase==='ready')return collect(s,ui);if(s.cup||s.phase!=='locked')return ui.flash(next(s));s.cup=true;s.message='端起杯子，放到双出液口正下方。';anim(s,ui,'placing',.85,k=>s.cupT=k,()=>{s.phase='locked';s.message='杯子已就位，按下萃取键。';});}
 function brew(s,ui){
  if(s.phase==='brewing'){s.run++;mainStep=null;s.brewPaused=false;s.guideHold=false;s.pressure=0;s.phase='ready';s.message=s.fill>.02?'已停止萃取，保留杯中的咖啡。可加奶泡或领取。':'已停止萃取，杯中还没有咖啡。按萃取键重新开始。';return;}
  if(!((s.phase==='locked'||(s.phase==='ready'&&s.fill<.02))&&s.cup))return ui.flash(next(s));
  const fillFrom=s.fill,target=s.targetFill,flowDuration=FLOW_SECONDS*(target-fillFrom),duration=PREWET+flowDuration;
  s.brewTarget=target;s.brewDuration=duration;s.guideWetSeen=false;s.guideHold=false;s.brewT=0;s.pressure=0;s.message='水泵启动，先润湿咖啡粉，再缓缓萃取。';
  anim(s,ui,'brewing',duration,k=>{s.brewT=k;s.fill=fillFrom+(target-fillFrom)*Math.max(0,Math.min(1,(s.t-PREWET)/flowDuration));s.pressure=Math.sin(Math.min(1,s.t/PREWET)*Math.PI/2)*Math.min(1,Math.max(0,(duration-s.t)/PREWET));s.message=s.t<PREWET?'预浸润中，压力正在建立……':'正在萃取，咖啡液与油脂慢慢上升。再次按萃取键可停止。';},()=>{s.phase='ready';s.pressure=0;s.message=(target===.5?'半杯':'标准杯')+'咖啡完成。可加入奶泡，或直接领取。';});
 }
 function milk(s,ui){if(s.phase!=='ready'||s.milk||s.fill<.02)return ui.flash(s.milk?'奶泡已经加入，点击杯子领取':s.fill<.02?'先完成咖啡萃取，再加入奶泡':next(s));s.message='奶缸抬起，奶泡缓缓注入。';anim(s,ui,'milk',3,k=>{s.milkT=k;s.milk=Math.max(0,Math.min(1,(k-.25)/.5));s.message=k<.25?'奶缸正在移到杯口……':k>.75?'奶泡已注入，奶缸正在归位。':'奶泡缓缓注入，咖啡正在变得柔和。';},()=>{s.milkT=0;s.phase='ready';s.message='拿铁完成，点击杯子领取。';});}
 function collect(s,ui){if(s.phase!=='ready')return ui.flash(next(s));if(s.fill<.02)return ui.flash('杯中还没有咖啡，按萃取键重新开始');s.message='端起'+(s.milk?'拿铁':'浓缩咖啡')+'，慢慢享用。';anim(s,ui,'taking',.75,k=>s.takeT=k,()=>{s.cup=false;s.phase='collected';s.made++;s.message='已领取'+(s.milk?'拿铁':'浓缩咖啡')+'！点击重新准备，再做一杯。';});}
 function reset(s,ui){const run=s.run+1,made=s.made,pal=s.pal,guideEnabled=s.guideEnabled;mainStep=null;Object.assign(s,initial(),{run,made,pal,guideEnabled});ui.invalidate();}
 function guideMode(s,enabled,ui){if(s.guideEnabled===enabled&&(enabled||!s.brewPaused))return;s.guideEnabled=enabled;if(!enabled&&s.brewPaused){s.brewPaused=false;s.guideHold=false;if(mainStep)schedule(ui,'main',mainStep);}ui.invalidate();}
 function guideRead(s){
  const phase=s.phase,waiting=s.guideHold,flow=phase==='brewing'&&(s.guideWetSeen||s.t>PREWET),filled=s.fill>=.02;
  const index={empty:0,adding:0,beans:1,grinding:1,ground:2,locking:2,locked:s.cup?4:3,placing:3,brewing:waiting?4:flow?5:4,ready:filled?6:4,milk:6,taking:6,collected:7}[phase];
  const titles=['豆子变成原料','研磨增加接触面','锁住粉碗与水路','让杯子接住出液','先看粉层润湿','再看咖啡入杯','端走这一杯'];
  const why=[
   '豆仓是研磨的原料入口。加入的豆量会增加，研磨还没有开始。',
   '磨成细粉后，与水接触的面积增大。看豆仓减少、粉碗增加：它们来自同一份豆子。',
   '粉碗先对准冲煮头，再旋紧。锁住后才形成示意水路；未锁紧时不能萃取。',
   '杯子要先放稳在出液口下。本模型用杯位检查拦住空放萃取，不是所有实机都有此功能。',
   waiting?'粉层示意润湿阶段已结束，压力针已抬起；杯中尚未新增咖啡。这里是观察定格，不是实机停泵。':s.phase==='ready'?'提前结束时杯中仍不足以领取，可以重新开始润湿。已有少量咖啡不会被清空。':'先润湿粉层，再进入出液。分步观察会在润湿完成时定格，让你对照压力针与杯中液面。',
   '水穿过粉层，带出可溶物。按同一示意流速入杯，目标杯量越大，出液越久。',
   s.phase==='taking'?'杯子正在移出出液口。端走动作完成后才计入杯数，不能重复领取。':s.phase==='milk'?'奶泡是可选的独立动作，不再启动萃取。完成后再端杯。':'出液已结束，示意压力归零。端杯完成才计入杯数；也可以先自由加奶泡。'
  ];
  const completed=index===7,paused=s.brewPaused,busy=moving(s)&&!paused;
  const action=completed?'reset':paused?'pause':({empty:'beans',beans:'grind',ground:'filter',locked:s.cup?'brew':'cup',ready:filled?'collect':'brew'}[phase]||null);
  const label=completed?'再观察一杯':waiting?'继续 · 看咖啡入杯':paused?'继续这一步':busy?'动作进行中…':({beans:'做这一步 · 加豆',grind:'下一步 · 研磨',filter:'下一步 · 锁入手柄',cup:'下一步 · 放好杯子',brew:'开始 · 看粉层润湿',collect:'最后一步 · 端走咖啡'}[action]||'等待当前动作完成');
  return {index,completed,action,busy,paused,label,title:completed?'这杯已领取':titles[index],text:completed?'从豆子到咖啡，动作已经完成。退出保留已完成杯数；重新准备才开始新的一杯。':why[index],look:completed?'本杯流程完成':[['豆仓'],['豆仓','出粉口','粉碗'],['手柄','冲煮头'],['杯子','出液口'],['粉碗','压力针','杯中液面'],['双出液口','杯中液面'],['杯子']][index].join(' · ')};
 }
 function guideNext(s,ui){if(!s.guideEnabled)return;const step=guideRead(s);if(step.busy||!step.action)return;actions[step.action](s,ui);ui.invalidate();}
 const actions={beans,grind,filter,cup,brew,milk,collect,reset,pause,guideEnter:(s,ui)=>guideMode(s,true,ui),guideExit:(s,ui)=>guideMode(s,false,ui),guideNext,targetHalf:(s,ui)=>setTarget(s,.5,ui),targetFull:(s,ui)=>setTarget(s,1,ui)};
 function scene(s,m){const parts=[],add=(at,svg,layer=0)=>parts.push({at,svg,layer});
 let out=geometry.castShadow([[4,4,4],[64,4,4],[64,61,4],[4,61,4],[4,4,91],[48,52,91]]);
 for(const x of[9,56])for(const y of[10,52])add([x,y,4],geometry.cyl(x,y,0,7,3,geometry.DARK));
 add([30,30,9],geometry.box(2,2,6,63,61,11,m,geometry.tone,1.1));
 add([15,30,37],geometry.box(3,3,11,31,60,68,m,geometry.tone,1.1));
 add([44,31,61],geometry.box(31,3,51,61,60,69,m,geometry.tone,1.1));
 add([32,31,70],geometry.box(2,2,69,62,61,72,geometry.METAL,geometry.tone,1),1);
 add([49,31,13],geometry.box(33,7,11,63,56,14,geometry.METAL,geometry.tone,1));
 let grid='';for(let y=10;y<55;y+=4)grid+=geometry.line([[35,y,14.3],[60,y,14.3]],.5);add([48,31,14.4],grid);
 if(geometry.vis([1,0,0])){add([31.2,30,35],geometry.shape(geometry.on(geometry.PX(31.2),geometry.rectUV(7,16,56,49)),geometry.DARK.m,.6));
 // Keep face-mounted controls with their own panel: center sorting used to paint the panel over both buttons.
 let panel=geometry.shape(geometry.on(geometry.PX(61.2),geometry.rrUV(6,54,57,67,2)),geometry.CERAMIC.l,.7)+geometry.tx(61.4,31,63.5,'晨间咖啡',3.1);
 const grindPress=s.phase==='grinding'?Math.max(0,1-s.t/.25):0,brewPress=s.phase==='brewing'?Math.max(0,1-s.t/.25):0;
 panel+=hit('grind',geometry.cylX(61.4,64-1.5*grindPress,15,58,3.4,s.phase==='grinding'?geometry.PALS.mustard:geometry.METAL)+geometry.tx(64.2-1.5*grindPress,15,57,'磨',2.7),'研磨咖啡豆');
 panel+=hit('brew',geometry.cylX(61.4,64-1.5*brewPress,29,58,3.4,s.phase==='brewing'?geometry.PALS.tomato:geometry.PALS.mint)+geometry.tx(64.2-1.5*brewPress,29,57,s.phase==='brewing'?'停':'萃',2.7),'开始萃取');
 panel+=observePart('coffee-pressure',geometry.cylX(61.3,62.2,44,59,4.8,geometry.METAL)+geometry.shape(geometry.on(geometry.PX(62.4),geometry.ellUV(44,59,3.9,3.9)),geometry.CERAMIC.l,.3)+geometry.line([[62.5,44,59],[62.5,44+Math.sin(-.7+s.pressure*1.6)*2.8,59+Math.cos(-.7+s.pressure*1.6)*2.8]],.5));add([63,31,61],panel);}

 if(geometry.vis([0,1,0])){add([17,60.2,41],geometry.txY(17,60.3,47,'慢慢来',3.1)+geometry.txY(17,60.3,42,'好事正在发生',1.9));for(let z=20;z<33;z+=2.5)add([17,60.2,z],geometry.line([[9,60.2,z],[25,60.2,z]],.5));for(const x of[7,27])for(const z of[15,63])add([x,60.3,z],geometry.shape(geometry.on(geometry.PY(60.3),geometry.ellUV(x,z,.85,.85)),geometry.METAL.l,.3)+geometry.line([[x-.5,60.4,z],[x+.5,60.4,z]],.2));}
 // Bean hopper is a genuine faceted glass cylinder with a recessed opening and visible beans.
 let hopper=geometry.cyl(18,20,72,77,9,geometry.DARK)+geometry.cyl(18,20,77,89,10,geometry.CLEAR,geometry.tone,.7)+geometry.shape(geometry.on(geometry.PZ(89.2),geometry.ellUV(18,20,8.5,8.5)),geometry.DARK.m,.5);
 for(let i=0;i<Math.ceil(s.beans*16);i++){const a=i*2.4,r=2+(i%3)*2.2,x=18+Math.cos(a)*r,y=20+Math.sin(a)*r;hopper+=geometry.cyl(x,y,89.4,90.3,1.6,brown,geometry.toneI,.35,10)+geometry.line([[x-1,y,90.4],[x+1,y,90.4]],.25);}
 add([18,20,83],hit('beans',observePart('coffee-hopper',hopper),'点击豆仓加入咖啡豆'),2);
 add([17,47,76],geometry.box(7,39,72,27,55,77,geometry.CERAMIC,geometry.tone,.7)+geometry.txY(17,55.2,74,'温杯台',2.1),2);
 // The basket sits under the grinder outlet, then locks directly into the brew head.
 add([48,29,50],observePart('coffee-head',geometry.cyl(48,29,48,52,5.4,geometry.METAL,geometry.tone,.7)));
 const travel=geometry.ease(Math.min(1,s.filterT/.76)),twist=geometry.ease(Math.max(0,(s.filterT-.76)/.24));
 const fx=43+5*travel,fy=16+13*travel,fz=34+14*travel+Math.sin(travel*Math.PI)*5,handleAngle=s.phase==='locking'?.65*(1-twist):s.filter?0:.65;
 // A real outlet extends from the grinder tower to the waiting basket.
 add([36,16,44],observePart('coffee-grinder',geometry.box(30,12.5,41,36,19.5,46,geometry.METAL,geometry.tone,.6)+geometry.rod([35,16,43],[43,16,40],1.5,geometry.METAL,geometry.tone,.55)));
 add([fx,fy,fz],hit('filter',observePart('coffee-filter',geometry.cyl(fx,fy,fz-3,fz,6,geometry.METAL)+geometry.shape(geometry.on(geometry.PZ(fz+.1),geometry.ellUV(fx,fy,4.7,4.7)),geometry.DARK.m,.4)+(s.ground?geometry.shape(geometry.on(geometry.PZ(fz+.12+s.ground*.2),geometry.ellUV(fx,fy,4.6*Math.sqrt(s.ground),4.6*Math.sqrt(s.ground))),brown.d,.2):'')+geometry.rod([fx+3,fy,fz-1],[fx+17*Math.cos(handleAngle),fy+17*Math.sin(handleAngle),fz-1],2.3,geometry.DARK)+geometry.cyl(fx,fy,fz-5,fz-3,2,geometry.METAL)),'锁入咖啡手柄'));
 add([46,48,40],geometry.rod([40,49,51],[44,49,34],1.1,geometry.METAL)+geometry.rod([44,49,34],[49,49,31],1,geometry.METAL));
 if(geometry.vis([1,0,0]))add([63,51,51],hit('milk',geometry.cylX(60,64,51,51,2.4,geometry.DARK),'加入奶泡'));
 // Lift the saucer above the solid base and drip tray before moving inward.
 // The final approach settles onto the same cup position; retrieval stays unchanged.
 const cp=geometry.ease(Math.max(0,Math.min(1,(s.cupT-.3)/.5))),cupLift=geometry.ease(Math.min(1,s.cupT/.3)),cupSettle=geometry.ease(Math.max(0,Math.min(1,(s.cupT-.8)/.2))),ct=geometry.ease(s.takeT);
 const cx=74-25*cp+27*ct,cy=44-15*cp+14*ct,cz=3+15*cupLift-3*cupSettle+8*ct+Math.sin(ct*Math.PI)*8;
 const pour=s.phase==='milk'?(s.milkT<.25?geometry.ease(s.milkT/.25):s.milkT>.75?1-geometry.ease((s.milkT-.75)/.25):1):0;
 // Lift clear of the tray, then keep the tilted jug below the locked handle.
 const jx=70-6*pour,jy=60-31*pour,jz=3+26*pour+9*Math.sin(Math.PI*pour),angle=.72*pour;
 const jp=(x,y,z)=>[jx+x*Math.cos(angle)-z*Math.sin(angle),jy+y,jz+x*Math.sin(angle)+z*Math.cos(angle)];
 const spout=jp(-5.5,0,14);
 if(s.phase!=='collected'){
 let c=geometry.cyl(cx,cy,cz,cz+1.5,9,geometry.CERAMIC);
 const liquidZ=cz+2+s.fill*9+s.milk*1.8;
 if(s.fill)c+=geometry.cyl(cx,cy,cz+1.6,liquidZ,5.8,geometry.matOf(geometry.mix('#75462d','#d4a76e',s.milk)),geometry.toneI,.35)+geometry.shape(geometry.on(geometry.PZ(liquidZ+.1),geometry.ellUV(cx,cy,5.6,5.6)),geometry.mix('#ad7546','#f6e9cb',s.milk),.25);
 if(s.phase==='brewing'&&s.t>PREWET)c+=observePart('coffee-extraction',geometry.rod([48,28,43],[49,28,liquidZ+.2],.5,brown,geometry.toneI,.2)+geometry.rod([48,30,43],[49,30,liquidZ+.2],.5,brown,geometry.toneI,.2));
 if(s.phase==='milk'&&s.milkT>=.25&&s.milkT<=.75)c+=geometry.rod(spout,[cx,cy,liquidZ+.3],.6,geometry.CERAMIC,geometry.toneI,.2);
 const lower=geometry.on(geometry.PZ(cz+1.5),geometry.ellUV(cx,cy,7,7)),upper=geometry.on(geometry.PZ(cz+14),geometry.ellUV(cx,cy,7,7));
 c+=`<g opacity=".25">${geometry.loft(lower,upper,n=>geometry.tone(n,geometry.CLEAR))}</g><g opacity=".75">${geometry.hullInk([...lower,...upper],.9)}</g>`+geometry.line(geometry.on(geometry.PZ(cz+14.2),geometry.ellUV(cx,cy,6.8,6.8)),.65);
 c+=geometry.rod([cx,cy+6,cz+11],[cx,cy+10,cz+11],1.1,geometry.CERAMIC)+geometry.rod([cx,cy+10,cz+11],[cx,cy+10,cz+5],1.1,geometry.CERAMIC)+geometry.rod([cx,cy+10,cz+5],[cx,cy+6,cz+5],1.1,geometry.CERAMIC);
 if(s.milk>.9)c+=geometry.shape(geometry.on(geometry.PZ(liquidZ+.3),[[cx,cy+3],[cx-3,cy],[cx-2,cy-2],[cx,cy-1],[cx+2,cy-2],[cx+3,cy]]),'#fff5df',.15);
 add([cx,cy,cz+8],hit('cup',observePart('coffee-cup',`<g opacity="${1-Math.max(0,(s.takeT-.75)/.25)}">${c}</g>`),s.phase==='ready'?'领取咖啡':s.cup?next(s):'放置咖啡杯'));
 }
 if(s.phase==='grinding'){for(let i=0;i<6;i++){const z=39.3-((s.t*14+i)%4.8);add([43,16,z],geometry.cyl(43+(i%2)*.4,16,z,z+.5,.45,brown,geometry.toneI,.1,6));}}
 const lower=geometry.ellUV(0,0,5.5,5.5).map(([x,y])=>jp(x,y,0)),upper=geometry.ellUV(0,0,5.5,5.5).map(([x,y])=>jp(x,y,14));
 let jug=geometry.loft(lower,upper,n=>geometry.tone(n,geometry.METAL))+geometry.shape(geometry.ellUV(0,0,4.4,4.4).map(([x,y])=>jp(x,y,13.7)),'#fff5df',.35)+geometry.hullInk([...lower,...upper],.7)+geometry.line(upper.concat([upper[0]]),.55)+geometry.rod(jp(0,5,11),jp(0,8,9),.8,geometry.METAL)+geometry.rod(jp(0,8,9),jp(0,5,3),.8,geometry.METAL);
 add(jp(0,0,7),hit('milk',observePart('coffee-milk',jug),'注入奶泡'));
 if(s.phase==='adding')for(let i=0;i<5;i++){const z=94-((s.t*16+i*1.7)%5);add([18,20,z],geometry.cyl(17+(i%3),20+(i%2),z,z+.7,1,brown,geometry.toneI,.2,8),3);}
 out+=parts.sort((a,b)=>a.layer-b.layer||geometry.depthOf(a.at)-geometry.depthOf(b.at)).map(p=>p.svg).join('');return out;}
 const observation={title:'看原理',intro:'这是流程与压力的简化示意，不是实机参数。打开后可沿着豆仓、粉碗与杯子看动作。',slow:true,read(s){
 const phase=s.phase,pre=phase==='brewing'&&s.t<=PREWET;
 const stage={empty:'豆仓待料',adding:'咖啡豆入仓',beans:'等待研磨',grinding:'研磨落粉',ground:'粉碗待锁入',locking:'旋紧手柄',locked:s.cup?'准备萃取':'放好杯子',placing:'杯子就位',brewing:pre?'预浸润':'压力萃取',ready:s.fill<.02?'萃取已停止':s.milk?'奶泡完成':'咖啡已入杯',milk:'注入奶泡',taking:'端起咖啡',collected:'本杯已领取'}[phase];
 const text={empty:'先把豆子装进豆仓。研磨会把豆子变成细粉，再送入下方粉碗。',adding:'豆子落进豆仓，豆量随入仓动作增加；研磨尚未启动。',beans:'豆子已备好。按研磨键后，豆仓里的豆子减少，粉碗里的咖啡粉增加。',grinding:'研磨把豆子变成细粉，咖啡粉沿出粉口落进粉碗；上下两处的量同步变化。',ground:'咖啡粉已落入粉碗。把手柄锁进冲煮头，才能让水穿过粉层。',locking:'粉碗先抬起对准冲煮头，再旋紧手柄；锁紧完成前不能萃取。',locked:s.cup?'粉碗已锁紧、杯子已就位。按萃取键，先润湿粉层，再让咖啡液流入杯中。':'粉碗已锁紧。杯子还未就位，萃取不会启动。',placing:'杯子移到双出液口下方；放稳后才能启动萃取，避免咖啡流到外面。',brewing:pre?'水泵先建立示意压力并润湿粉层，此时杯中液量还不增加。':'水穿过粉层并带出可溶物，咖啡流入杯中。压力在收尾时回落；再按萃取键会立即停流。',ready:s.fill<.02?'水泵已停止，压力归零。杯中还不足以领取，可以重新启动萃取。':s.milk?'水泵已停止，压力归零。奶泡已入杯，点击杯子即可领取。':'水泵已停止，压力归零，杯中咖啡保留。可加奶泡或直接领取。',milk:s.milkT<.25?'奶缸先移动到杯口；抵达后才开始注入奶泡。':s.milkT>.75?'奶泡已经注入，奶缸正回到原位；杯中咖啡不会继续增加。':'奶缸倾斜，奶泡流进杯中；这一步不启动水泵，也不再萃取咖啡。',taking:'杯子从出液口下方移出，端走动作完成后才计入已领取杯数。',collected:'这一杯已领取。重新准备会清空本轮豆粉与液量，保留已完成杯数。'}[phase];
 const active={empty:['coffee-hopper'],adding:['coffee-hopper'],beans:['coffee-hopper','coffee-grinder'],grinding:['coffee-hopper','coffee-grinder','coffee-filter'],ground:['coffee-filter'],locking:['coffee-filter','coffee-head'],locked:s.cup?['coffee-head','coffee-cup']:['coffee-cup'],placing:['coffee-cup'],brewing:pre?['coffee-pressure','coffee-filter','coffee-cup']:['coffee-pressure','coffee-extraction','coffee-cup'],ready:['coffee-cup'],milk:['coffee-milk','coffee-cup'],taking:['coffee-cup'],collected:['coffee-hopper']}[phase];
 return {stage:s.brewPaused?'已暂停 · '+stage:stage,text:s.brewPaused?(s.guideHold?'粉层已润湿，杯中尚未新增咖啡。继续这一步才进入出液；这是观察定格，不是实机停泵。':'画面已定格，零件位置、液量与计时保持不变。继续观察将从此刻接上。'):text,active,readouts:[{label:'豆仓余量',value:pct(s.beans)},{label:'粉碗粉量',value:pct(s.ground)},{label:'示意压力',value:pct(s.pressure)},{label:'咖啡液量',value:pct(s.fill)}]};}};
 function setup(ui){
  const panel=ui.observation?.panel;if(!panel)return;
  const style=document.createElement('style');style.textContent='.coffee-process{border:1px solid var(--rule,#d8d1c3);border-radius:7px;padding:9px;margin:8px 0 11px;font-size:11px}.coffee-process label{display:flex;align-items:center;justify-content:space-between;gap:10px}.coffee-process select,.coffee-process button{font:inherit;color:var(--ink,#231e16);background:var(--paper,#f5f1e8);border:1px solid var(--rule,#d8d1c3);border-radius:5px;min-height:32px;padding:5px 8px}.coffee-process select{min-width:0;max-width:65%}.coffee-process button{margin-top:8px;width:100%}.coffee-process button[aria-pressed=true]{background:var(--accent,#93d3b0)}.coffee-process button:disabled,.coffee-process select:disabled{opacity:.55}.coffee-process output{display:block;line-height:1.7;margin-top:7px;font-variant-numeric:tabular-nums}.coffee-process p{font-size:10px;line-height:1.6;margin:6px 0 0;color:var(--muted,#766d5f)}';document.head.append(style);scope.onCleanup(()=>style.remove());
  const box=document.createElement('section');box.className='coffee-process';box.setAttribute('aria-label','冲煮过程控制');
  box.innerHTML='<label>目标杯量<select aria-label="目标杯量"><option value="0.5">半杯 · 50%</option><option value="1" selected>标准杯 · 100%</option></select></label><output aria-label="本杯示意进度"></output><button type="button" aria-pressed="false">暂停观察</button><p>同一示意流速：杯量越多，出液越久。时间不是实机标定；暂停只定格观察，收起会继续。</p>';
  const select=box.querySelector('select'),output=box.querySelector('output'),button=box.querySelector('button');
  const content=panel.querySelector('.observation-content');content.insertBefore(box,content.querySelector('.observation-live'));
  scope.bindProperty(select,"onchange",()=>{setTarget(state,+select.value,ui);update();});scope.bindProperty(button,"onclick",()=>pause(state,ui));
  function update(){if(!panel.open)return;select.value=String(state.targetFill);select.disabled=!canSetTarget(state);button.disabled=state.phase!=='brewing'&&!(state.guideEnabled&&moving(state));button.textContent=state.brewPaused?'继续观察':'暂停观察';button.setAttribute('aria-pressed',String(state.brewPaused));
   const started=['brewing','ready','milk','taking','collected'].includes(state.phase)&&!canSetTarget(state),target=started?state.brewTarget:state.targetFill,duration=started?state.brewDuration:PREWET+FLOW_SECONDS*(target-state.fill);
   const value=state.phase==='brewing'?`入杯 ${pct(state.fill)} / ${pct(target)} · ${Math.min(state.t,duration).toFixed(1)} / ${duration.toFixed(1)} 示意秒`:`目标 ${pct(target)} · 预计 ${duration.toFixed(1)} 示意秒${state.fill>0?' · 已入杯 '+pct(state.fill):''}`;
   if(output.textContent!==value)output.textContent=value;
  }
  const original=ui.observation.update;ui.observation.update=()=>{original();update();};
  scope.listen(panel,'toggle',()=>update());update();
  window.MuseumObservation?.mountLesson?.({ui,id:'coffee',title:'看懂一步 · 可选分步观察',route:['豆','粉','锁','杯','润','流','取'],exitLabel:'退出分步 · 保留当前杯',note:'水箱、泵和加热器未绘制。高亮只指向现有部件；压力与时间均为简化示意，不是实机测量。',read:()=>guideRead(state),onToggle:on=>guideMode(state,on,ui),onAdvance:()=>guideNext(state,ui),onPause:()=>pause(state,ui)});
 }
 const labels={beans:'加入咖啡豆',grind:'研磨咖啡豆',filter:'锁入手柄',cup:'放置杯子',brew:'开始萃取',milk:'加入奶泡',collect:'领取咖啡',reset:'重新准备'};
 const text=(s,k)=>k==='reset'?(moving(s)?'停止并重新准备':'重新准备'):k==='brew'&&s.phase==='brewing'?'停止萃取':k==='cup'&&s.phase==='ready'&&s.fill>=.02?'领取咖啡':k==='cup'&&s.phase==='taking'?'正在端走咖啡':k==='cup'&&s.cup?'杯子已就位':k==='filter'&&s.filter?'手柄已锁紧':k==='milk'&&s.milk?'奶泡已加入':k==='collect'&&s.phase==='collected'?'已领取 · 再做一杯':labels[k]||({pause:s.brewPaused?'继续观察':'暂停观察',targetHalf:'目标半杯',targetFull:'目标标准杯'}[k]);
 const current=s=>({empty:'beans',adding:'beans',beans:'grind',grinding:'grind',ground:'filter',locking:'filter',locked:s.cup?'brew':'cup',placing:'cup',brewing:'brew',milk:'milk',ready:s.fill<.02?'brew':s.milk?'collect':'milk',taking:'collect',collected:'reset'}[s.phase]);
 return {title:'晨间咖啡机',hint:'点豆仓、手柄与杯子，做一杯自己的咖啡',size:[89,70,96],palette:'mint',state,scene,observation,guide:{read:guideRead},setup,credit:false,buttons:Object.entries(labels).map(([k,label])=>({label,text:s=>text(s,k),onClick:k==='collect'?(s,u)=>s.phase==='collected'?reset(s,u):collect(s,u):actions[k]})),acts:Object.fromEntries(Object.entries(actions).map(([k,fn])=>[k,(s,e,ui)=>fn(s,ui)])),actionState:(s,k)=>({label:text(s,k),hint:next(s),active:k===current(s)||(s.phase==='ready'&&s.fill>=.02&&k==='cup'),busy:moving(s)&&!(k==='brew'&&s.phase==='brewing')}),progress:s=>moving(s)?{label:s.brewPaused?'已暂停观察':{adding:'加入咖啡豆',grinding:'研磨',locking:'锁入手柄',placing:'放好杯子',brewing:s.brewPaused?'已暂停观察':s.t<PREWET?'预浸润':'萃取',milk:'注入奶泡',taking:'领取咖啡'}[s.phase],value:s.phase==='adding'?s.beans:s.phase==='grinding'?s.ground:s.phase==='locking'?s.filterT:s.phase==='placing'?s.cupT:s.phase==='brewing'?s.brewT:s.phase==='milk'?s.milkT:s.takeT}:null,readout:s=>s.brewPaused?(s.guideHold?'润湿完成，观察已定格。点继续这一步，看看咖啡如何进入杯中。':'已暂停观察：动作与计时已定格，可继续观察。'):s.message,stats:s=>[{label:'已完成',value:s.made+' 杯'},{label:s.phase==='grinding'?'研磨':'杯中液量',value:Math.round((s.phase==='grinding'?s.ground:s.fill)*100)+'%',small:true}],idea:'热水穿过压实的咖啡粉，带出香气与油脂。奶泡让咖啡变得柔和。'};

}
