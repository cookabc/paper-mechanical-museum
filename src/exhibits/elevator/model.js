export function createElevator(geometry,environment){
 const {document,scope}=environment;
 const window=environment.window||document.defaultView;

 const fresh=()=>({floor:1,pos:0,target:1,queue:[],door:1,phase:'idle',timer:0,run:0,trips:0,presses:[0,0,0],exploreOpen:false,inspectPart:null});const state=fresh();let running=null,feedbackRun=null;
 function press(s,n,ui){s.presses[n-1]=1;const run=s.run;if(feedbackRun===run)return;feedbackRun=run;ui.animate(dt=>{if(run!==s.run)return false;if(!Number.isFinite(dt)||dt<=0)return true;s.presses=s.presses.map(v=>Math.max(0,v-dt/.22));if(s.presses.every(v=>v===0)){feedbackRun=null;return false;}return true;},{realtime:true});}
 // Consume only the time required by each phase. Zero-time queue dispatch
 // and phase transitions cannot discard the rest of a visible simulation tick.
 // The shared driver still owns the .06 s cap, slow observation and hidden pause.
 function start(s,ui){if(running===s.run)return;const run=s.run;let active=true;running=run;const stop=()=>{active=false;running=null;return false;};ui.animate(dt=>{
  if(!active||run!==s.run)return false;
  if(!Number.isFinite(dt)||dt<=0)return true;
  let remaining=dt;
  const consume=duration=>{const take=Math.min(remaining,Math.max(0,duration));remaining=Math.max(0,remaining-take);s.timer+=take;return take;};
  for(;;){
   if(s.phase==='idle'){
    if(!s.queue.length)return stop();
    s.target=s.queue.shift();s.phase=s.target===s.floor?'opening':'closing';s.timer=0;
   }else if(s.phase==='closing'||s.phase==='manualClose'){
    const needed=s.door*.85,take=consume(needed);
    s.door=Math.max(0,s.door-take/.85);
    if(needed-take>1e-12)return true;
    s.door=0;s.timer=0;
    if(s.phase==='manualClose')s.phase='idle';
    else{s.phase='moving';s.from=s.pos;}
   }else if(s.phase==='moving'){
    const dest=(s.target-1)*33,duration=Math.abs(dest-s.from)/15+.5;
    const needed=Math.max(0,duration-s.timer),take=consume(needed);
    s.pos=s.from+(dest-s.from)*geometry.ease(Math.min(1,s.timer/duration));
    if(needed-take>1e-12)return true;
    s.pos=dest;s.floor=s.target;s.trips++;s.phase='opening';s.timer=0;
   }else if(s.phase==='opening'){
    const needed=(1-s.door)*.85,take=consume(needed);
    s.door=Math.min(1,s.door+take/.85);
    if(needed-take>1e-12)return true;
    s.door=1;s.phase='waiting';s.timer=0;
   }else if(s.phase==='waiting'){
    const needed=Math.max(0,1.4-s.timer),take=consume(needed);
    if(needed-take>1e-12)return true;
    s.phase='idle';s.timer=0;
   }else{return stop();}
  }
 });}
 function go(s,n,ui){if(!Number.isInteger(n)||n<1||n>3)return ui.flash('请选择一楼、二楼或三楼');press(s,n,ui);if(n===s.floor&&(s.phase==='closing'||s.phase==='manualClose'))return door(s,ui);if(s.queue.includes(n)||(['closing','moving','opening','waiting'].includes(s.phase)&&s.target===n))return ui.flash(n+'楼的呼叫已登记，不会重复排队');if(s.phase==='idle'&&s.floor===n&&s.door===1)return ui.flash('已经在'+n+'楼，两道门都已打开');s.queue.push(n);start(s,ui);}
 function door(s,ui){if(s.phase==='moving')return ui.flash('运行中不能开门，停稳平层后会自动打开');if(s.phase==='closing'&&s.target!==s.floor&&!s.queue.includes(s.target))s.queue.unshift(s.target);if(s.phase==='waiting'||(s.phase==='idle'&&s.door===1)){s.phase='waiting';s.timer=0;start(s,ui);return ui.flash('门保持打开，已延长停留时间');}if(s.phase==='opening')return ui.flash('两道门正在同步打开');s.target=s.floor;s.phase='opening';s.timer=0;start(s,ui);}
 function close(s,ui){if(s.phase==='moving')return ui.flash('门已锁闭，轿厢正在运行');if(s.phase==='closing'||s.phase==='manualClose')return ui.flash('两道门正在同步关闭，可点开门重新打开');if(s.door===0)return ui.flash('门已关闭，选择楼层即可出发');s.phase='manualClose';s.timer=0;start(s,ui);}
 function reset(s,ui){const run=s.run+1,exploreOpen=s.exploreOpen,inspectPart=s.inspectPart;Object.assign(s,fresh(),{run,exploreOpen,inspectPart});running=null;feedbackRun=null;ui.flash('电梯回到一楼，行程已清空');}
 // A deliberately simplified 1:1 traction arrangement, not a winding drum.
 // One drawn rope represents the parallel suspension ropes of a real lift.
 const DRIVE={x:30,y:41.5,z:123,r:8.5,carY:33,weightY:50};
 const PARTS=[{id:'drive',label:'曳引轮与钢索'},{id:'counterweight',label:'对重'},{id:'cabin',label:'轿厢与导轨'},{id:'locks',label:'门锁联动'}];
 const alignedFloor=s=>s.phase!=='moving'&&Math.abs(s.pos-Math.round(s.pos/33)*33)<1e-6?Math.round(s.pos/33):-1;
 const landingOpen=(s,i)=>alignedFloor(s)===i?s.door:0;
 const landingLocked=(s,i)=>alignedFloor(s)!==i||s.door===0&&s.phase!=='opening';
 function describe(s,id){
  const moving=s.phase==='moving',up=s.target*33-33>s.pos,closing=['closing','manualClose'].includes(s.phase),opening=s.phase==='opening';
  if(id==='drive')return{title:'曳引轮与钢索',text:moving?'曳引轮转动，钢索一侧收短、另一侧放长，带着轿厢'+(up?'上升':'下降')+'。靠轮槽与钢索间的摩擦传力，不把钢索卷存起来。':closing?'门还在关闭，曳引轮保持不动；门锁确认闭合后才开始牵引。':'选择另一楼层，再看轮缘的辐条转动：同一组钢索越过曳引轮，连接轿厢和对重。'};
  if(id==='counterweight')return{title:'对重 · 等距反向',text:moving?'轿厢'+(up?'上升，对重就下降':'下降，对重就上升')+'相同的距离；两段竖直钢索一短一长，总长保持不变。对重平衡部分重量，让驱动更省力。':'这块配重与轿厢挂在钢索两端，沿自己的导轨移动。换一层试试，它们会等距、反向运动。'};
  if(id==='cabin')return{title:'轿厢与导轨',text:moving?'钢索负责牵引，背后的导靴沿固定导轨滑动，让轿厢保持竖直。到达'+s.target+'楼并停稳后，才会打开这一层的门。':closing?'两道门正在关闭，轿厢仍保持平层；此时按“开门”会重新打开，不会边关门边起步。':opening||s.door>0?'轿厢已经平层，地板与这一层的门槛齐平；轿门和本层厅门才一起打开。其他楼层的厅门仍锁着。':'轿厢已经停稳，导靴仍贴着固定导轨；关着门也不会自行移动，要收到楼层呼叫才出发。'};
  if(id==='locks')return{title:'门锁联动',text:moving?'运行时轿门和所有厅门保持锁闭，点“开门”也不会解锁。只有轿厢停稳平层，才允许这一层厅门随轿门打开。':closing?'两道门正在关闭，锁舌尚未到位，轿厢先保持不动。完全关好并确认锁闭后，才允许牵引轮转动。':opening||s.door>0?'轿厢停在'+s.floor+'楼，只释放这一层的门锁，两道门同步打开。其余厅门仍锁闭，避免人走入空井道。':'门已关好，锁舌到位；收到楼层呼叫后才能运行。门锁既限制厅门打开，也约束轿厢启动。'};
  return{title:'顺着动作看原理',text:'先选一个部件，再呼叫另一楼层。观察曳引轮、对重与门锁怎样接力，让轿厢到达下一层。'};
 }
 function selectPart(s,id,ui){if(!PARTS.some(p=>p.id===id))return;const changed=s.inspectPart!==id;s.exploreOpen=true;s.inspectPart=id;if(changed&&ui?.camTo){const views={drive:[45,27],counterweight:[72,25],cabin:[38,26],locks:[18,22]};ui.camTo(...views[id],560);}ui?.invalidate?.();}
 const exploration={title:'看原理',intro:'简化的 1∶1 曳引原理示意。选一个部件，再呼叫楼层，观察动作关系。',parts:PARTS,describe,onToggle:(s,open,ui)=>{s.exploreOpen=!!open;if(!open)s.inspectPart=null;ui?.invalidate?.();},onSelect:selectPart};
 // This optional lesson observes the existing controller. It owns no motion,
 // timer or artificial leveling stop, and its route is not a completion log.
 let lessonEnabled=false;
 function interlock(s){const at=alignedFloor(s),locks=[0,1,2].map(i=>landingLocked(s,i));return{alignedFloor:at<0?null:at+1,landingLocks:locks,landingDoors:[0,1,2].map(i=>landingOpen(s,i)),allLocked:locks.every(Boolean)};}
 function explainInterlock(s){
  const live=interlock(s),queued=s.queue.length?' 待响应：'+s.queue.map(n=>n+'楼').join(' → ')+'。':'',moving=s.phase==='moving';
  let index,title,text,look,label;
  if(moving){index=1;title='行 · 门已锁闭，轿厢才运行';text='轿门和三层厅门都已关闭锁住，轿厢正前往'+s.target+'楼。点“开门”不会解锁；必须等轿厢停止并与门槛平齐，才允许本层开门。';look='看轿厢与对重反向移动，所有厅门仍留在各自楼层。';label='正在前往'+s.target+'楼';}
  else if(['closing','manualClose'].includes(s.phase)&&s.door===0){index=0;title='关 · 门已锁闭，等待控制器出发';text='轿厢仍停在'+s.floor+'楼，两道门已经关闭、三层厅门锁住。已登记的呼叫会按原顺序继续，不会为了讲解额外停顿。';look='看门缝已合拢；下一次控制更新才开始牵引。';label='门已锁闭 · 准备出发';}
  else if(['closing','manualClose'].includes(s.phase)){index=0;title='关 · 先关两道门，轿厢不动';text='轿厢停在'+s.floor+'楼，轿门与本层厅门正在同步关闭。门还没合拢时不启动；完全关闭后才允许运行。现在点“重新开门”，会从当前开度反向打开。';look='看门缝缩小；轿厢地板仍与这一层门槛对齐。';label='正在关门 · 可重新打开';}
  else if(s.phase==='opening'&&s.door===0){index=2;title='平 · 已停稳平层，才释放本层门锁';text='轿厢已停在'+live.alignedFloor+'楼，地板与门槛齐平。本层门锁刚释放，两道门即将同步打开；其余两层仍锁闭。这里不另加停顿，开门会自动继续。';look='看轿厢停止、门槛对齐，然后门缝开始变宽。';label='已平层 · 即将开门';}
  else if(s.phase==='opening'){index=3;title='开 · 只打开已平层的这一层';text='轿厢停在'+live.alignedFloor+'楼，轿门和本层厅门同步打开，其他楼层仍关闭锁住。现在点“关门”，可从当前开度反向关闭。';look='对照三层厅门：只有轿厢所在这一层随轿门打开。';label='正在开门 · 可反向关闭';}
  else if(s.door>0){index=3;title='开 · 本层门已打开，轿厢保持平层';text='轿厢停在'+live.alignedFloor+'楼，本层厅门随轿门打开，其他楼层仍锁闭。呼叫另一楼层后，必须重新关好门才会出发；点“延长开门”只延长这次停留。';look='看本层门槛与轿厢地板齐平，另外两层厅门没有打开。';label=s.phase==='waiting'?'到站停留 · 可继续选楼层':'呼叫'+(s.floor%3+1)+'楼 · 看联锁';}
  else{index=2;title='平 · 已停稳，关门不等于出发';text='轿厢已停稳平层，两道门关闭、三层厅门锁住。关好门只是运行条件；还要有楼层呼叫才会出发，也可以在本层重新开门。';look='看门虽已关闭，轿厢仍不动；试着选择下一楼层。';label='呼叫'+(s.floor%3+1)+'楼 · 看联锁';}
  return{...live,index,title,text:text+queued,look,label};
 }
 function readLesson(s){
  const live=explainInterlock(s),busy=s.phase!=='idle'||s.queue.length>0;
  const choices=[1,2,3].map(n=>{const reopening=n===s.floor&&['closing','manualClose'].includes(s.phase),registered=!reopening&&(s.queue.includes(n)||(['closing','moving','opening','waiting'].includes(s.phase)&&s.target===n)),here=n===s.floor&&s.phase==='idle'&&s.door===1;return{id:'floor-'+n,label:reopening?n+'楼 · 重新开门':registered?n+'楼 · 已登记':here?n+'楼 · 当前层':'呼叫'+n+'楼',disabled:registered||here,hint:reopening?'直接呼叫当前层会重新开门，原目的层保留排队。':registered?'呼叫已登记，不重复排队。':'使用原有楼层呼叫，运行中可登记其他楼层。'};});
  choices.push({id:'open',label:s.phase==='moving'?'试开门 · 运行中锁闭':['closing','manualClose'].includes(s.phase)?'重新开门':s.door===1?'延长开门':'开门',disabled:s.phase==='opening',hint:s.phase==='moving'?'演示原控制器拒绝运行中开门；不会绕过门锁，也不会暂停轿厢。':'使用原有开门请求；关门途中可反向，开门停留时可延长。'},{id:'close',label:s.phase==='moving'?'已锁闭运行':['closing','manualClose'].includes(s.phase)?'正在关门':'关门',disabled:s.phase==='moving'||['closing','manualClose'].includes(s.phase)||s.door===0,hint:'使用原有关门请求；开门途中可从当前开度反向关闭。'});
  return{...live,enabled:lessonEnabled,phase:s.phase,position:s.pos,door:s.door,queue:[...s.queue],completed:false,busy,paused:false,choices};
 }
 function toggleLesson(s,on,ui){lessonEnabled=!!on;ui?.invalidate?.();}
 function chooseLesson(s,id,ui){if(!lessonEnabled)return;if(/^floor-[123]$/.test(id))go(s,+id.slice(-1),ui);else if(id==='open')door(s,ui);else if(id==='close')close(s,ui);else return;ui?.invalidate?.();}
 function advanceLesson(s,ui){if(!lessonEnabled||readLesson(s).busy)return;go(s,s.floor%3+1,ui);ui?.invalidate?.();}
 const lesson={title:'看懂一步 · 门与楼层联锁',linear:false,route:['关','行','平','开'],note:'跟随当前动作，不设暂停关卡；这些是模型中的门锁约束，不是传感器或安全认证模拟。',read:readLesson,onToggle:toggleLesson,onAdvance:advanceLesson,onChoice:chooseLesson};
 function setup(ui){environment.observation?.mountLesson?.({ui,id:'elevator',title:lesson.title,route:lesson.route,linear:lesson.linear,exitLabel:'退出讲解 · 继续自由操作',note:lesson.note,read:()=>readLesson(state),onToggle:on=>toggleLesson(state,on,ui),onAdvance:()=>advanceLesson(state,ui),onChoice:id=>chooseLesson(state,id,ui)});}
 const access=t=>`role="button" tabindex="0" aria-label="${t}"`;let cache='',fixed=[],fixedSolids=[],fixedDetails=[],upperMaskKey='',upperMaskSvg='',axleMaskKey='',axleMaskSvg='';
 function scene(s,m){
 const E=environment.occlusion;E.begin();let solids=[],details=[],pendingBoxes=[];
 const solidBox=(...args)=>{const bounds=args.slice(0,6);solids.push(bounds);pendingBoxes.push(bounds);return geometry.box(...args)};
 const detailBox=(key,bounds,mat,shade=geometry.toneI,w=.5,group=key)=>{solids.push(bounds);details.push({key,bounds,svg:geometry.box(...bounds,mat,shade,w),group});return '';};
 const detailRod=(key,A,B,r,mat,shade=geometry.toneI,w=.3,group=key,n=16)=>{details.push({key,A,B,r,n,svg:geometry.rod(A,B,r,mat,shade,w,r,n),group});return '';};
 const key=[geometry.YAW,geometry.PITCH,s.pal,s.az].join();if(cache!==key){cache=key;fixed=[];const a=(key,at,svg)=>fixed.push({key,at,svg,boxes:pendingBoxes.splice(0)}),b=(key,x,y,z,X,Y,Z,mat=m)=>a(key,[(x+X)/2,(y+Y)/2,(z+Z)/2],key.startsWith('post')?detailBox(key,[x,y,z,X,Y,Z],mat,geometry.tone,.65):solidBox(x,y,z,X,Y,Z,mat,geometry.tone,.65));
 a('shadow',[0,0,-10],geometry.castShadow([[0,0,0],[49,0,0],[49,55,0],[0,55,0],[0,0,132],[49,55,132]]));b('plinth',0,0,0,52,57,5,geometry.CERAMIC);b('rear',0,0,5,3,54,113,geometry.CERAMIC);b('side',0,0,5,44,3,113,geometry.CERAMIC);
 for(const x of[6,39])for(const y of[6,47])b('post'+x+y,x,y,5,x+1.7,y+1.7,110,geometry.METAL);for(const y of[11,43])a('rail'+y,[6,y,57],detailRod('rail'+y,[6,y,6],[6,y,109],.7,geometry.DARK,geometry.toneI,.3));
 for(let i=0;i<3;i++){const z=6+i*33;b('landing'+i,40,4,z,51,51,z+2,geometry.CERAMIC);b('lintel'+i,40,3,z+29,45,52,z+33,m);b('jamb'+i,41,46,z+2,46,52,z+29,m);if(geometry.vis([1,0,0]))a('floorlabel'+i,[46.1,49,z+23],geometry.tx(46.2,49,z+23,String(i+1),3,m.d));}
 // Two genuine apertures: each straight rope leg clears the roof slab.
 const roofTop=geometry.on(geometry.PZ(114),geometry.rectUV(0,0,48,54)),holes=[33,50].map(y=>({x0:29.1,x1:30.9,y0:y-.9,y1:y+.9}));
 const roofFaces=[[[1,0,0],[[48,0,109],[48,54,109],[48,54,114],[48,0,114]]],[[-1,0,0],[[0,0,109],[0,54,109],[0,54,114],[0,0,114]]],[[0,1,0],[[0,54,109],[48,54,109],[48,54,114],[0,54,114]]],[[0,-1,0],[[0,0,109],[48,0,109],[48,0,114],[0,0,114]]]];
 const holeFaces=holes.flatMap(({x0,x1,y0,y1})=>[[[1,0,0],[[x0,y0,109],[x0,y1,109],[x0,y1,114],[x0,y0,114]]],[[-1,0,0],[[x1,y0,109],[x1,y1,109],[x1,y1,114],[x1,y0,114]]],[[0,1,0],[[x0,y0,109],[x1,y0,109],[x1,y0,114],[x0,y0,114]]],[[0,-1,0],[[x0,y1,109],[x1,y1,109],[x1,y1,114],[x0,y1,114]]]]);
 const mouths=holes.map(({x0,x1,y0,y1})=>geometry.on(geometry.PZ(114),geometry.rectUV(x0,y0,x1,y1)));
 a('roof',[24,27,111.5],holeFaces.filter(([n])=>geometry.vis(n)).map(([n,q])=>geometry.shape(q,geometry.tone(n,m),0)).join('')+roofFaces.filter(([n])=>geometry.vis(n)).map(([n,q])=>geometry.shape(q,geometry.tone(n,m),.65)).join('')+geometry.fill(geometry.pd(roofTop)+mouths.map(q=>geometry.pd(q)).join(''),geometry.tone([0,0,1],m),'fill-rule="evenodd"')+geometry.ink(geometry.pd(roofTop),.65)+mouths.map(q=>geometry.ink(geometry.pd(q),.3)).join(''));
 // Opaque roof material only; leave both actual rope tunnels empty.
 for(const bounds of [[0,0,109,29.1,54,114],[30.9,0,109,48,54,114],[29.1,0,109,30.9,32.1,114],[29.1,33.9,109,30.9,49.1,114],[29.1,50.9,109,30.9,54,114]])solids.push(bounds);
 b('motor',10,36,115,27,47,128,geometry.DARK);b('motorFoot',10,36,114,27,47,115,geometry.METAL);a('driveAxle',[27.7,41.5,123],geometry.rod([26.5,41.5,123],[32,41.5,123],1.25,geometry.METAL,geometry.toneI,.35));
 // The counterweight has its own narrow guide lane outside the car envelope.
 for(const x of[20,36])a('weightRail'+x,[x,50,57],detailRod('weightRail'+x,[x,50,6],[x,50,108],.55,geometry.DARK,geometry.toneI,.3));
 if(geometry.vis([0,1,0]))a('badge',[23,54.2,111],geometry.txY(23,54.3,110.8,'小小升降所',2.6,m.d));
 solids.push({key:'tractionWheelBody',faces:E.rodFaces([28.6,DRIVE.y,DRIVE.z],[31.4,DRIVE.y,DRIVE.z],8.2,20)});
 fixedSolids=solids.slice();fixedDetails=details.slice();
 }
 solids=fixedSolids.slice();details=fixedDetails.slice();
 const parts=fixed.slice(),a=(key,at,svg,geometry)=>parts.push({key,at,svg,boxes:pendingBoxes.splice(0),...geometry}),z=6.5+s.pos,weightZ=73-s.pos;
 const selected=id=>s.exploreOpen&&s.inspectPart===id;
 const accent=mat=>({l:geometry.mix(mat.l,m.l,.32),m:geometry.mix(mat.m,m.m,.26),d:mat.d});
 const inspect=(id,svg)=>`<g data-observe-part="${id}">`+(s.exploreOpen?geometry.act('inspect',svg,`data-part="${id}" ${access('观察'+PARTS.find(p=>p.id===id).label)} aria-pressed="${s.inspectPart===id}"`):svg)+'</g>';
 const ropeMat=geometry.DARK,ropeWidth=selected('drive')?.5:.35;
 // The two hanging lengths sum to a constant; neither winds onto the sheave.
 a('cable',[30,33,(z+29.4+114)/2],detailRod('cable',[30,33,z+29.4],[30,33,114],ropeWidth,ropeMat,geometry.toneI,.25));
 a('weightCable',[30,50,(weightZ+25.2+114)/2],detailRod('weightCable',[30,50,weightZ+25.2],[30,50,114],ropeWidth,ropeMat,geometry.toneI,.25));
 const arc=Array.from({length:33},(_,i)=>{const t=Math.PI*(1-i/32);return[30,DRIVE.y+DRIVE.r*Math.cos(t),DRIVE.z+DRIVE.r*Math.sin(t)];});
 // In the y-z wheel plane, negative rotation raises the car-side (y=33) tangent.
 const wheelMat=selected('drive')?accent(geometry.METAL):geometry.METAL,faceX=geometry.vis([1,0,0])?31.45:28.55,angle=-s.pos/DRIVE.r;
 let wheel=geometry.cylX(28.6,31.4,DRIVE.y,DRIVE.z,8.2,wheelMat,geometry.toneI,.5)+geometry.ink(geometry.pd(geometry.on(geometry.PX(faceX),geometry.ellUV(DRIVE.y,DRIVE.z,6.8,6.8))),.3);
 for(let i=0;i<6;i++){const t=angle+i*Math.PI/3;wheel+=geometry.line([[faceX,DRIVE.y+1.7*Math.cos(t),DRIVE.z+1.7*Math.sin(t)],[faceX,DRIVE.y+6.6*Math.cos(t),DRIVE.z+6.6*Math.sin(t)]],selected('drive')?.65:.4);}
 wheel+=geometry.cylX(28.5,31.5,DRIVE.y,DRIVE.z,1.7,geometry.DARK,geometry.toneI,.3);
 a('tractionSheave',[30,DRIVE.y,DRIVE.z],inspect('drive',wheel));
 a('upperRope',[30,41.5,125],geometry.rod([30,33,114],[30,33,123],ropeWidth,ropeMat,geometry.toneI,.25)+geometry.line(arc,selected('drive')?1:.75)+geometry.rod([30,50,114],[30,50,123],ropeWidth,ropeMat,geometry.toneI,.25));
 const wm=selected('counterweight')?accent(geometry.METAL):geometry.METAL;
 let weight='';
 const weightBox=(key,bounds,mat=wm,w=.5)=>detailBox('weight-'+key,bounds,mat,geometry.toneI,w,'counterweight');
 weight+=weightBox('bottom',[21,48.6,weightZ,35,52,weightZ+1.5]);
 weight+=weightBox('top',[21,48.6,weightZ+23,35,52,weightZ+24.5]);
 for(const x of[21,33.8])weight+=weightBox('frame'+x,[x,48.6,weightZ+1.5,x+1.2,52,weightZ+23],geometry.DARK,.35);
 for(let i=0;i<6;i++)weight+=weightBox('block'+i,[22.3,49,weightZ+2+i*3.4,33.7,51.8,weightZ+5+i*3.4],wm,.3);
 weight+=detailRod('weightHitch',[30,50,weightZ+24.5],[30,50,weightZ+25.2],.85,geometry.METAL,geometry.toneI,.3,'counterweight',24);
 for(const x of[20,36])for(const dz of[2,22])weight+=weightBox('shoe'+x+'-'+dz,[x===20?19.2:33.8,49.2,weightZ+dz-.7,x===20?22.2:36.8,50.8,weightZ+dz+.7],wm,.3);
 a('counterweight',[28,50.3,weightZ+12.25],weight);
 a('carHitch',[27,33,z+28.7],solidBox(20,31.5,z+28,34,34.5,z+28.8,geometry.METAL,geometry.toneI,.4));
 a('carHitchTip',[30,33,z+29.1],geometry.cyl(30,33,z+28.8,z+29.4,.85,geometry.METAL,geometry.toneI,.3),{boxes:[[29.15,32.15,z+28.8,30.85,33.85,z+29.4]],occlusionFaces:()=>E.rodFaces([30,33,z+28.8],[30,33,z+29.4],.85,24)});
 // The open side reveals the cabin, guide shoes and separate counterweight.
 a('cabinback',[9,27,z+13],solidBox(8,9,z,10,45,z+27,m,geometry.tone,.7));a('cabinside',[25,10,z+13],solidBox(10,9,z,37.2,11,z+27,m,geometry.tone,.5));a('cabinfloor',[25,27,z],solidBox(9,10,z,40,45,z+1.5,selected('cabin')?accent(geometry.METAL):geometry.METAL,geometry.tone,selected('cabin')?.85:.5));a('cabintop',[25,27,z+27],inspect('cabin',solidBox(9,10,z+26,40,45,z+28,m,geometry.tone,selected('cabin')?.9:.5)));a('handrail',[12,27,z+12],geometry.rod([10,15,z+12],[12,15,z+12],.4,geometry.METAL,geometry.toneI,.3)+geometry.rod([10,40,z+12],[12,40,z+12],.4,geometry.METAL,geometry.toneI,.3)+geometry.rod([12,13,z+12],[12,42,z+12],.5,geometry.METAL,geometry.toneI,.3),{boxes:[[10,12.5,z+11.5,12.5,42.5,z+12.5]],occlusionFaces:()=>[...E.rodFaces([10,15,z+12],[12,15,z+12],.4),...E.rodFaces([10,40,z+12],[12,40,z+12],.4),...E.rodFaces([12,13,z+12],[12,42,z+12],.5)]});
 // Each landing has its own interlocked doors; they do not travel with the car.
 // Fixed-width leaves retract into front-and-back enclosed side pockets.
 function doors(prefix,x,base,open){
  const panels=[['leftOuter',x,15-6*open,21-6*open],['leftInner',x-.7,21-12*open,27-12*open],['rightInner',x-.7,27+12*open,33+12*open],['rightOuter',x,33+6*open,39+6*open]];
  for(const [key,X,y,Y]of panels){
   // Keep the whole rigid leaf, including its side edge inside the pocket.
   // The physical pocket plates occlude it; a flat opening clip erases
   // visible side faces when the viewer turns alongside the doorway.
   a(prefix+'door'+key,[X+.25,(y+Y)/2,base+13],solidBox(X,y,base+1.5,X+.5,Y,base+26,geometry.METAL,geometry.tone,.4));
  }
  for(const [key,y,Y]of[['left',9,15],['right',39,45]]){
   a(prefix+'pocketFront'+key,[x+1,(y+Y)/2,base+13],solidBox(x+.7,y,base+1.5,x+1.3,Y,base+26,m,geometry.tone,.5));
   a(prefix+'pocketBack'+key,[x-1.1,(y+Y)/2,base+13],solidBox(x-1.3,y,base+1.5,x-.9,Y,base+26,m,geometry.tone,.5));
  }
  const track=prefix+'doortrack',A=[x+1.35,15,base+1.7],B=[x+1.35,39,base+1.7];
  a(track,[x+1.35,27,base+1.7],geometry.line([A,B],.35),{boxes:[[x+1.34,15,base+1.53,x+1.36,39,base+1.87]],occlusionFaces:()=>E.rodFaces(A,B,.14,8)});
 }
 doors('',38.5,z,s.door);
 for(let i=0;i<3;i++){
  const base=6.5+i*33;
  doors('landing'+i,41.5,base,landingOpen(s,i));
  const locked=landingLocked(s,i),lockMat=selected('locks')?accent(geometry.METAL):geometry.METAL;
  const lockGroup='landingLock'+i;
  const lock=detailBox(lockGroup+'body',[42.8,24.5,base+26.5,43.4,27.2,base+28.3],lockMat,geometry.toneI,.35,lockGroup)+detailBox(lockGroup+'receiver',[42.9,30,base+26.5,43.4,31.2,base+28.3],geometry.DARK,geometry.toneI,.3,lockGroup)+detailRod(lockGroup+'bolt',[43.45,locked?26.5:24.5,base+27.4],[43.45,locked?30.6:28.6,base+27.4],.35,lockMat,geometry.toneI,.3,lockGroup);
  a(lockGroup,[43.2,27,base+27.4],lock);
  const header=solidBox(40.2,9,base+26,42.8,45,base+29,m,geometry.tone,.5);
  a('landingHeader'+i,[41.5,27,base+27.5],i===s.floor-1?inspect('locks',header):header);
 }
 // Guide shoes bridge the rail-to-car gap; the rails remain behind the car.
 for(const y of[11,43])for(const dz of[3,23])a('shoe'+y+dz,[7.3,y,z+dz],solidBox(5.2,y-1,z+dz-1,8.2,y+1,z+dz+1,geometry.METAL,geometry.tone,.35));
 for(let i=1;i<=3;i++){const zz=8+(i-1)*33,pressed=(s.presses?.[i-1]||0)*.65;if(geometry.vis([1,0,0]))a('button'+i,[47,49,zz+13],geometry.act('floor',geometry.cylX(46,47.4-pressed,49,zz+13,2,s.queue.includes(i)||(s.target===i&&s.phase!=='idle')?geometry.PALS.mustard:geometry.METAL,geometry.toneI,.35)+geometry.tx(47.6-pressed,49,zz+12.2,'↑',1.9),`data-floor="${i}" ${access('呼叫'+i+'楼')}`));}
 if(geometry.vis([1,0,0]))a('display',[48,27,111],geometry.shape(geometry.on(geometry.PX(48.2),geometry.rectUV(18,109.5,36,113)),geometry.DARK.d,.4)+geometry.tx(48.4,27,110.2,(s.phase==='moving'?(s.target>s.floor?'↑ ':'↓ '):'')+s.floor+'楼',2.3,'#c0e1b2'));
 // Exact surface visibility for slender/deep details. Their original ink and
 // shading stay intact; masks remove only pixels behind nearer physical faces.
 for(const d of details)if(d.A)solids.push({key:d.key,faces:E.rodFaces(d.A,d.B,d.r,d.n)});
 const upperPart=parts.find(p=>p.key==='upperRope'),upperKey=key+'|'+selected('drive');
 if(upperMaskKey!==upperKey){upperMaskKey=upperKey;const upperRopeFaces=[...E.rodFaces([30,33,114],[30,33,123],ropeWidth),...E.rodFaces([30,50,114],[30,50,123],ropeWidth),...arc.slice(1).flatMap((q,i)=>E.rodFaces(arc[i],q,.28,8))];const upperSolids=solids.filter(q=>Array.isArray(q)?q[5]>=109:q.key==='tractionWheelBody');upperMaskSvg=E.maskPrism('upperRope',upperRopeFaces,upperPart.svg,upperSolids);}
 upperPart.svg=upperMaskSvg;upperPart.depthTested=true;
 const axlePart=parts.find(p=>p.key==='driveAxle');
 if(axleMaskKey!==key){axleMaskKey=key;const axleSolids=fixedSolids.filter(q=>Array.isArray(q)?q[2]>=114:q.key==='tractionWheelBody');axleSolids.push({key:'wheelHub',faces:E.rodFaces([28.5,DRIVE.y,DRIVE.z],[31.5,DRIVE.y,DRIVE.z],1.7,24)});axleMaskSvg=E.maskRod('driveAxle',[26.5,41.5,123],[32,41.5,123],1.25,axlePart.svg,axleSolids);}
 axlePart.svg=axleMaskSvg;axlePart.depthTested=true;
 const detailGroups=new Map();
 for(const d of details){const svg=d.bounds?E.maskBox(d.key,d.bounds,d.svg,solids):E.maskRod(d.key,d.A,d.B,d.r,d.svg,solids,{segments:d.n});detailGroups.set(d.group,(detailGroups.get(d.group)||'')+svg);}
 for(const [key,svg]of detailGroups){const part=parts.find(p=>p.key===key);if(part){part.svg=key==='counterweight'?inspect('counterweight',svg):svg;part.depthTested=true;}}
 // A tall enclosing wall cannot be sorted by its centre: its near face
 // must occlude the entire shaft, while its far face stays behind the cabin.
 const rank=p=>{const k=p.key,d=geometry.depthOf(p.at);if(p.depthTested)return 1200;if(k==='shadow')return -10000;if(k==='rear')return geometry.vis([-1,0,0])?900:-900;if(k==='side')return geometry.vis([0,-1,0])?901:-901;if(k.startsWith('rail'))return -800;if(k.startsWith('roof'))return 950;if(['motor','motorFoot','driveAxle','tractionSheave','upperRope'].includes(k))return 960+d*.01;if(k==='display'||k==='badge'||k.startsWith('floorlabel')||k.startsWith('button'))return 1000+d*.01;return d;};scene.layers=E.orderBoxes(parts.sort((a,b)=>rank(a)-rank(b)),p=>rank(p)<950).map(p=>({...p,opacity:1}));return '';}
 const observation={title:'看懂这部电梯',intro:'简化的门锁约束示意，不模拟传感器或安全认证；仍可直接呼叫楼层。',slow:true,read:s=>{const live=explainInterlock(s),moving=s.phase==='moving',doors=['closing','manualClose','opening'].includes(s.phase);return{stage:live.title,text:live.text,active:moving?['drive','counterweight','cabin']:doors?['locks']:[],readouts:[{label:'轿厢位置',value:(1+s.pos/33).toFixed(2)+' 层'},{label:'轿门开度',value:Math.round(s.door*100)+'%'},{label:'厅门锁',value:live.allLocked?'全部锁闭':live.alignedFloor+'楼释放 · 其余锁闭'},{label:'待响应楼层',value:s.queue.length?s.queue.map(n=>n+'楼').join(' → '):'无'}]}}};
 return{lifecycle:{reset:ui=>reset(state,ui)},title:'迷你电梯',hint:'从剖面观察轿厢、钢索与安全门。',size:[53,57,133],palette:'mint',state,scene,exploration,observation,lesson,setup,credit:false,buttons:[...['一','二','三'].map((n,i)=>({label:'前往'+n+'楼',text:s=>s.queue.includes(i+1)?n+'楼 · 已排队':s.target===i+1&&s.phase==='moving'?'正在前往'+n+'楼':s.floor===i+1&&s.phase!=='moving'?n+'楼 · 当前层':'呼叫'+n+'楼',onClick:(s,u)=>go(s,i+1,u)})),{label:'开门',text:s=>['closing','manualClose'].includes(s.phase)?'重新开门':s.door===1?'延长开门':'开门',onClick:door},{label:'关门',text:s=>s.phase==='moving'?'已锁闭运行':s.door===0?'门已关闭':'关门',onClick:close},{label:'回到一楼',onClick:reset}],acts:{lessonToggle:(s,e,u)=>toggleLesson(s,e.dataset.enabled==='true',u),lessonAdvance:(s,e,u)=>advanceLesson(s,u),lessonChoice:(s,e,u)=>chooseLesson(s,e.dataset.choice,u),floor:(s,e,u)=>go(s,+e.dataset.floor,u),inspect:(s,e,u)=>{if(s.exploreOpen)selectPart(s,e.dataset.part,u);}},actionState:(s,key)=>key==='inspect'?{hint:'观察这个部件；再呼叫另一楼层，看看动作怎样传递',busy:false}:key==='floor'?{hint:s.phase==='moving'?'点击其他楼层可排队，亮起表示已登记':'点击楼层呼叫；关门时可重新开门',busy:false}:null,progress:s=>s.phase==='moving'?{label:'前往'+s.target+'楼 · 两道门已锁闭',value:Math.abs(s.pos-s.from)/Math.max(1,Math.abs((s.target-1)*33-s.from))}:['opening','closing','manualClose'].includes(s.phase)?{label:s.phase==='opening'?'轿门与厅门同步打开':'轿门与厅门同步关闭',value:s.phase==='opening'?s.door:1-s.door}:null,stats:s=>[{label:'当前楼层',value:s.floor+'楼'},{label:'完成行程',value:s.trips}],readout:s=>({idle:s.door?'已到站，门已打开。':'门已关闭，选择楼层即可出发。',closing:'两道门正在关闭；此时可点开门重新打开。',moving:'轿厢正在前往'+s.target+'楼。',opening:'已平层，两道门正在同步打开。',waiting:'到站停留，等待下一位乘客。',manualClose:'两道门正在关闭；点开门可重新打开。'}[s.phase])+' 排队：'+(s.queue.length?s.queue.map(n=>n+'楼').join(' → '):'无'),idea:'这是一种简化的 1∶1 曳引示意：钢索越过曳引轮，连接等距反向移动的轿厢与对重。门锁确认闭合后才允许运行，停稳平层后才开门。'};

}
export {createElevator as createModel};
