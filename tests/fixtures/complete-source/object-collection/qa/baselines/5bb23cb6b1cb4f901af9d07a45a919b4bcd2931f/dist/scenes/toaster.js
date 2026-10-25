(()=>{window.SCENES=window.SCENES||{};window.SCENES.toaster=()=>{
 const init=()=>({phase:'empty',slices:0,level:2,dial:2,dialRun:0,t:0,progress:0,loadT:0,takeT:0,plateToast:0,lever:0,lift:0,popFrom:0,cancelled:false,run:0,made:0,message:'点盘子放入两片吐司，旋转旋钮选择喜欢的焦度。'}),state=init();
 const names=['浅烘','金黄','焦脆'],hit=(n,svg,label)=>act(n,svg,`role="button" tabindex="0" aria-label="${label}"`);
 const observePart=(id,svg)=>`<g data-observe-part="${id}">${svg}</g>`,pct=n=>Math.round(n*100)+'%';
 const busy=s=>['loading','lowering','heating','popping','taking'].includes(s.phase),duration=s=>3+s.level*2;
 const next=s=>({empty:'点盘子放入两片新吐司',loading:'吐司正在放入，马上就好',loaded:'选择焦度后压下侧边手柄',lowering:'正在压下，点击手柄可取消',heating:'烘烤中，可按停止键或抬起手柄取消',popping:'请等吐司弹稳后领取',ready:'点击吐司领取',taking:'吐司正在放回盘子'}[s.phase]);
 const drivers={};function schedule(ui,key,fn){if(drivers[key]){drivers[key].fn=fn;return;}const driver={fn};drivers[key]=driver;ui.animate(dt=>{if(driver.fn(dt)===false){if(drivers[key]===driver)delete drivers[key];return false;}return true;});}
 function load(s,ui){if(s.phase==='ready')return collect(s,ui);if(s.phase!=='empty')return ui.flash(next(s));const token=++s.run;s.slices=2;s.progress=0;s.plateToast=0;s.loadT=0;s.takeT=0;s.phase='loading';s.t=0;s.message='拿起两片吐司，对准双槽轻轻放入。';schedule(ui,'main',dt=>{if(token!==s.run)return false;s.t+=dt;s.loadT=Math.min(1,s.t/1.15);if(s.loadT===1){s.phase='loaded';s.message='吐司已放好。旋转旋钮选焦度，再压下侧边手柄。';return false;}return true;});}
 function level(s,ui,n){if(!['empty','loaded'].includes(s.phase))return ui.flash('当前焦度已锁定。'+next(s));const target=n||s.level%3+1;if(target===s.level)return ui.flash('当前是'+names[s.level-1]);const from=s.dial,token=++s.dialRun;s.level=target;s.message='已选择'+names[s.level-1]+'，烘烤约 '+duration(s)+' 秒。';let t=0;schedule(ui,'dial',dt=>{if(token!==s.dialRun)return false;t+=dt;const k=Math.min(1,t/.32);s.dial=from+(target-from)*ease(k);return k<1;});}
 function start(s,ui){if(['heating','lowering'].includes(s.phase))return stop(s,ui);if(s.phase!=='loaded')return ui.flash(next(s));const token=++s.run;s.phase='lowering';s.cancelled=false;s.t=0;s.message='手柄下压，吐司进入发热槽。';schedule(ui,'main',dt=>{if(token!==s.run)return false;s.t+=dt;
 if(s.phase==='lowering'){s.lever=ease(Math.min(1,s.t/.55));if(s.lever===1){s.phase='heating';s.t=0;s.message='正在烘烤，发热丝亮起，吐司慢慢变色。再次点手柄可提前弹出。';}}
 else if(s.phase==='heating'){s.progress=Math.min(1,s.t/duration(s));if(s.progress===1){s.phase='popping';s.popFrom=s.lever;s.t=0;s.message='叮！托架释放，吐司正在弹起。';}}
 else if(s.phase==='popping'){const k=Math.min(1,s.t/.9);s.lever=s.popFrom*(1-ease(Math.min(1,k/.45)));s.lift=Math.sin(Math.min(1,k/.7)*Math.PI)*9*s.popFrom+(k>.7?Math.sin((k-.7)/.3*Math.PI)*1.3*s.popFrom:0);if(k===1){s.phase='ready';s.lift=0;s.lever=0;s.message=s.cancelled?'已取消，当前焦度已保留。点击吐司领取。':names[s.level-1]+'吐司出炉，点击面包领取。';return false;}}
 return true;});}
 function stop(s,ui){if(!['heating','lowering'].includes(s.phase))return ui.flash(next(s));s.phase='popping';s.cancelled=true;s.popFrom=s.lever;s.t=0;s.message='发热丝已关闭，托架正在把吐司弹回槽口。';}
 function collect(s,ui){if(s.phase!=='ready')return ui.flash(next(s));const token=++s.run;s.phase='taking';s.t=0;s.takeT=0;s.message='把两片吐司从槽口取出，放回盘子。';schedule(ui,'main',dt=>{if(token!==s.run)return false;s.t+=dt;s.takeT=Math.min(1,s.t/1.15);if(s.takeT===1){s.plateToast=s.progress*[.25,.6,1][s.level-1];s.slices=0;s.phase='empty';s.made+=2;s.progress=0;s.message='已领取两片吐司！点盘子换上新面包，再烤一份。';return false;}return true;});}
 function reset(s,ui){const run=s.run+1,dialRun=s.dialRun+1,made=s.made,pal=s.pal,level=s.level;Object.assign(s,init(),{run,dialRun,made,pal,level,dial:level});ui.invalidate();}
 const actions={load,level,start,stop,collect,reset};
 function aboveTop(profile,height){const out=[];for(let i=0;i<profile.length;i++){const a=profile[i],b=profile[(i+1)%profile.length],inside=a[1]>=height,next=b[1]>=height;if(inside)out.push(a);if(inside!==next){const k=(height-a[1])/(b[1]-a[1]);out.push([a[0]+(b[0]-a[0])*k,height]);}}return out;}
 function bread(x,z,p){const crust=matOf(mix('#d99e58','#864322',p)),inside=mix('#ffebbc','#ba712e',p),fullProfile=[[8,z],[8,z+15],[5,z+18],[5,z+23],[8,z+27],[15,z+29],[37,z+29],[44,z+27],[47,z+23],[47,z+18],[44,z+15],[44,z]],profile=aboveTop(fullProfile,46.7);if(profile.length<3)return '';
 let a=extrude(profile,x-2.8,x+2.8,crust,toneI);for(const xx of[x-2.8,x+2.8])if(vis([xx>x?1:-1,0,0])){a+=shape(on(PX(xx),profile),crust.l,.8);const insideProfile=aboveTop(fullProfile.map(([y,zz])=>[26+(y-26)*.88,z+2+(zz-z)*.86]),46.72);if(insideProfile.length>=3)a+=shape(on(PX(xx+(xx>x?.1:-.1)),insideProfile),inside,.35);for(let i=0;i<15;i++){const y=11+(i*11%31),zz=z+5+(i*7%18);if(zz<47.15)continue;a+=shape(on(PX(xx+(xx>x?.2:-.2)),ellUV(y,zz,.35+(i%2)*.3,.4)),mix(inside,'#5a351c',.23),0);}}return a;}
 // A slice is lifted clear of the lid before moving across it. The final descent
 // is clipped at the same physical slot height as a standing slice.
 function breadPose(target,index,k){
 const lift=ease(Math.min(1,k/.25)),travel=ease(Math.max(0,Math.min(1,(k-.25)/.4))),settle=ease(Math.max(0,(k-.65)/.35));
 // Preserve the stack gap until horizontal separation clears the slice thickness.
 const angle=(1-travel)*Math.PI/2,cx=74+(target-74)*travel,cy=24+2*travel,cz=(4.9+index*5.7)+(62+index*5.7*Math.sin(angle)-(4.9+index*5.7))*lift-(62-45.5)*settle;
 return {angle,cx,cy,cz,travel};
 }
 function movingBread(target,index,k,p){
 const {angle,cx,cy,cz,travel}=breadPose(target,index,k);
 const transform=([x,y,z])=>[cx+x*Math.cos(angle)-(z-14.5)*Math.sin(angle),cy+(y-26)*(.8+.2*travel),cz+x*Math.sin(angle)+(z-14.5)*Math.cos(angle)];
 const profile=[[8,0],[8,15],[5,18],[5,23],[8,27],[15,29],[37,29],[44,27],[47,23],[47,18],[44,15],[44,0]],crust=matOf(mix('#d99e58','#864322',p)),inside=mix('#ffebbc','#ba712e',p);
 const cut=points=>{if(k<.65)return points;const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ina=a[2]>=46.7,inb=b[2]>=46.7;if(ina)out.push(a);if(ina!==inb){const t=(46.7-a[2])/(b[2]-a[2]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}return out;};
 const A=profile.map(([y,z])=>transform([-2.8,y,z])),B=profile.map(([y,z])=>transform([2.8,y,z]));let out='';
 for(let i=0;i<A.length;i++){const j=(i+1)%A.length,points=cut([A[i],A[j],B[j],B[i]]);if(points.length<3)continue;let n=norm(cross(sub(A[j],A[i]),sub(B[i],A[i])));if(dot(n,sub(avg(points),[cx,cy,cz]))<0)n=n.map(v=>-v);if(vis(n))out+=shape(points,toneI(n,crust),.55);}
 for(const sign of[-1,1]){const n=[sign*Math.cos(angle),0,sign*Math.sin(angle)];if(!vis(n))continue;const points=cut(sign<0?A:B);if(points.length<3)continue;out+=shape(points,crust.l,.8);const center=cut(profile.map(([y,z])=>transform([sign*2.9,26+(y-26)*.88,2+z*.86])));if(center.length>=3)out+=shape(center,inside,.35);for(let i=0;i<12;i++){const y=11+(i*11%31),z=5+(i*7%18),spot=cut(ellUV(y,z,.4,.5,8).map(([yy,zz])=>transform([sign*3,yy,zz])));if(spot.length>=3)out+=shape(spot,mix(inside,'#5a351c',.23),0);}}
 return out;
 }
 function scene(s,m){const parts=[],add=(at,svg,layer=0)=>parts.push({at,svg,layer}),hot=s.phase==='heating';let out=castShadow([[0,2,4],[54,2,4],[54,57,4],[0,57,4],[0,2,47],[54,57,47]]);
 for(const x of[7,45])for(const y of[9,48])add([x,y,4],cyl(x,y,1,7,2.7,DARK));
 const profile=rrUV(1,7,56,45,7,9);add([26,29,25],extrude(profile,1,51,m,tone)+shape(on(PX(vis([1,0,0])?51:1),profile),tone(vis([1,0,0])?[1,0,0]:[-1,0,0],m),1.1)+hullInk([...on(PX(1),profile),...on(PX(51),profile)],2.1));
 add([26,29,8],box(3,4,6,50,53,9,METAL,tone,.7));
 // Separate raised steel slot collars, dark recesses and warm inner heating wires.
 add([26,28,45.4],box(6,6,44.5,46,51,46,METAL,tone,.7),1);
 for(const x of[15,36]){let slot=shape(on(PZ(46.2),rrUV(x-5,9,x+5,48,3)),DARK.d,.6)+shape(on(PZ(46.3),rrUV(x-3.5,11,x+3.5,46,2)),hot?'#b24c24':DARK.m,.3);
 for(let y=14;y<46;y+=5)slot+=line([[x-4.5,y,46.4],[x-3.6,y+1.7,46.4]],.55);
 if(hot)for(let y=13;y<45;y+=4)slot+=shape(on(PZ(46.5),rectUV(x-4.5,y,x-3.5,y+2)),'#ef9b41',0);
 add([x,28,46.4],hit('load',observePart('toaster-heater',slot),'放入吐司'),2);
 if(s.slices&&!['loading','taking'].includes(s.phase)){const z=31-20*s.lever+s.lift,p=s.progress*[.25,.6,1][s.level-1];let loaf=bread(x,z,p);
 // Every face has already been cut at the actual slot height; a fully submerged slice has no hidden hit target.
 if(loaf)add([x,28,Math.max(46.7,z+14.5)],hit(s.phase==='ready'?'collect':'start',observePart('toaster-bread',loaf),s.phase==='ready'?'领取烤好的吐司':next(s)),3);}
 }
 if(vis([1,0,0])){
 add([51.4,27,37],shape(on(PX(51.2),rrUV(14,32,42,41,2)),CERAMIC.l,.55)+tx(51.4,28,35,'早安吐司',3));
 let knob=cylX(51.1,53.5,28,22,7,METAL)+cylX(53.5,55,28,22,5.8,CERAMIC);const theta=(-140+s.dial*70)*Math.PI/180;knob+=line([[55.2,28,22],[55.2,28+Math.sin(theta)*4,22+Math.cos(theta)*4]],.9);for(let i=1;i<4;i++){const t=(-140+i*70)*Math.PI/180;knob+=tx(51.8,28+Math.sin(t)*10,22+Math.cos(t)*10,String(i),2.3);}add([55,28,22],hit('level',observePart('toaster-dial',knob),'旋转焦度旋钮'));
 const stopPress=s.phase==='popping'?Math.max(0,1-s.t/.23):0;add([52.5,45,20],hit('stop',cylX(51,53-stopPress*1.2,45,20,3,PALS.tomato)+tx(53.2-stopPress*1.2,45,19.2,'停',2),'取消烘烤'));
 add([51.6,10,21],shape(on(PX(51.5),ellUV(10,21,1.6,1.6)),hot?'#e59b42':'#72756a',.4));
 add([51.5,28,11],tx(51.5,28,11,'浅烘 · 金黄 · 焦脆',1.65));
 }
 if(vis([0,1,0])){
 const zz=35-19*s.lever;add([38,56.4,26],shape(on(PY(56.3),rrUV(35,13,39,39,1.8)),DARK.d,.6));add([40,61,zz],hit('start',observePart('toaster-carrier',rod([37,56.4,zz],[37,62,zz],1.4,METAL)+box(30,60,zz-1.8,44,65,zz+1.8,DARK,tone,.7)),['heating','lowering'].includes(s.phase)?'抬起手柄，取消烘烤':'压下烘烤手柄'));
 for(let x=11;x<29;x+=3)add([x,56.3,15],line([[x,56.3,13],[x,56.3,18]],.5));add([17,56.4,30],txY(18,56.4,32,'面包的好时光',2.4)+txY(18,56.4,27,'双槽烤制',2));
 for(const x of[7,47])add([x,56.3,12],shape(on(PY(56.3),ellUV(x,12,.7,.7)),METAL.l,.2));
 }
 // Crumb tray seam and little pull tab.
 add([49,28,6.5],box(49,18,5,54,39,7,METAL,tone,.5));
 // Waiting bread on a small board is part of the object, not a separate control panel.
 let plate=cyl(74,24,0,2,17,CERAMIC,tone,.8);if(!s.slices)for(const [i,x]of[15,36].entries())plate+=observePart('toaster-bread',movingBread(x,i,0,s.plateToast));add([74,24,5],hit('load',plate,s.made?'换上新吐司，再烤一份':'从盘子放入两片吐司'));
 if(['loading','taking'].includes(s.phase))for(const [i,x]of[15,36].entries()){const k=s.phase==='loading'?s.loadT:1-s.takeT,p=s.phase==='taking'?s.progress*[.25,.6,1][s.level-1]:0,pose=breadPose(x,i,k);add([pose.cx,pose.cy,pose.cz],observePart('toaster-bread',movingBread(x,i,k,p)),4);}
 out+=parts.sort((a,b)=>a.layer-b.layer||depthOf(a.at)-depthOf(b.at)).map(p=>p.svg).join('');return out;}
 const observation={title:'看动作懂原理',intro:'这是定时烘烤与弹起机构的简化示意，用时长代替温控过程；没有模拟或测量真实温度。',slow:true,read(s){
 const phase=s.phase,hot=phase==='heating',shownBread=!s.slices||['loading','taking'].includes(phase)||31-20*s.lever+s.lift+29>46.7;
 const stage={empty:'准备面包',loading:'放入双槽',loaded:'设定时长',lowering:'压下托架',heating:'发热丝通电',popping:s.cancelled?'提前释放':'到时释放',ready:'吐司弹稳',taking:'领取吐司'}[phase];
 const text={empty:'面包放入双槽后，压下手柄使托架下降。焦度旋钮在本示意中控制加热时长。',loading:'面包先抬高再移到槽口，最后放入双槽；这时发热丝还未通电。',loaded:'焦度越深，示意加热时长越长。压下手柄后设定锁定，不能中途改变。',lowering:'手柄带动托架下降，面包进入发热槽。压到底才通电；再点手柄可提前释放。',heating:'发热丝通电，电能转为热量。本示意按加热时长逐渐加深面包颜色，不把进度当作温度。',popping:s.cancelled?(s.progress?'提前停止会立即断电，再释放托架；已经产生的焦度保留。':'尚未加热就取消，发热丝不会通电；托架从当前位置回到槽口。'):'设定时长到达，发热丝先断电，再释放托架，让面包弹回槽口。',ready:s.cancelled?'托架已经回稳，发热丝保持断电。提前停止保留的颜色会随面包一起放回盘子。':'吐司已弹稳，发热丝保持断电。点击吐司，将烤好的两片取出。',taking:'吐司抬离槽口后移到盘子；取出动作完成后才计入已领取片数。'}[phase];
 let active=hot?['toaster-heater']:phase==='loaded'?['toaster-dial','toaster-carrier']:['lowering','popping'].includes(phase)?['toaster-carrier','toaster-heater']:[];
 if(shownBread&&phase!=='loaded')active.push('toaster-bread');
 return {stage,text,active,readouts:[{label:'设定时长',value:duration(s)+' 秒（示意）'},{label:'发热丝',value:hot?'通电':'断电'},{label:'烘烤进度',value:pct(s.progress)},{label:'托架压下',value:pct(s.lever)}]};}};
 const text=(s,k)=>({load:s.phase==='loading'?'正在放入吐司':s.phase==='ready'?'领取两片吐司':s.phase==='empty'&&s.made?'放入新吐司':'放入两片吐司',level:'焦度：'+names[s.level-1],start:['lowering','heating'].includes(s.phase)?'抬起手柄 · 提前弹出':s.phase==='popping'?'吐司正在弹起':'压下烘烤手柄',stop:'取消烘烤',collect:s.phase==='taking'?'正在放回盘子':'领取吐司',reset:busy(s)?'停止并重新准备':'重新准备'}[k]);
 return {title:'早安烤面包机',hint:'放入吐司，旋转旋钮，压下手柄等待弹起',size:[94,68,79],state,palette:'mint',scene,observation,credit:false,buttons:[{label:'放入两片吐司',text:s=>text(s,'load'),onClick:load},{label:'选择焦度',text:s=>text(s,'level'),choices:s=>names.map((label,i)=>({label:label+' · '+(5+i*2)+'秒',current:s.level===i+1,disabled:!['empty','loaded'].includes(s.phase),why:'当前焦度已锁定。'+next(s),onClick:(s,ui)=>level(s,ui,i+1)}))},{label:'压下烘烤手柄',text:s=>text(s,'start'),onClick:start},{label:'取消烘烤',onClick:stop},{label:'领取吐司',text:s=>text(s,'collect'),onClick:collect},{label:'重新准备',text:s=>text(s,'reset'),onClick:reset}],acts:Object.fromEntries(Object.entries(actions).map(([k,fn])=>[k,(s,e,ui)=>fn(s,ui)])),actionState:(s,k)=>({label:text(s,k),hint:next(s),active:k===({empty:'load',loaded:'start',heating:'stop',ready:'collect'}[s.phase])||(k==='start'&&['heating','lowering'].includes(s.phase)),busy:busy(s)&&!(['stop','start'].includes(k)&&['heating','lowering'].includes(s.phase))}),progress:s=>busy(s)?{label:{loading:'放入吐司',lowering:'压下托架',heating:names[s.level-1]+'烘烤',popping:s.cancelled?'提前弹出':'吐司弹起',taking:'领取吐司'}[s.phase],value:s.phase==='loading'?s.loadT:s.phase==='lowering'?s.lever:s.phase==='heating'?s.progress:s.phase==='popping'?Math.min(1,s.t/.9):s.takeT}:null,readout:s=>s.message,stats:s=>[{label:'焦度',value:names[s.level-1]},{label:s.phase==='heating'?'倒计时':'已领取',value:s.phase==='heating'?Math.ceil(duration(s)*(1-s.progress))+' 秒':s.made+' 片',small:true}],idea:'发热丝把电能转为热量。烘烤结束，弹簧托架把面包送回槽口。'};
};})();
