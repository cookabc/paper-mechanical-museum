(()=>{window.SCENES=window.SCENES||{};window.SCENES.coffee=()=>{
 const initial=()=>({phase:'empty',beans:0,ground:0,filter:false,filterT:0,cup:false,cupT:0,takeT:0,fill:0,milk:0,milkT:0,brewT:0,pressure:0,t:0,run:0,made:0,message:'从豆仓开始，为自己做一杯咖啡。'});
 const state=initial(),brown=matOf('#75462d'),cream=matOf('#e8c092');
 const hit=(n,svg,label)=>act(n,svg,`role="button" tabindex="0" aria-label="${label}"`);
 const observePart=(id,svg)=>`<g data-observe-part="${id}">${svg}</g>`,pct=n=>Math.round(n*100)+'%';
 const drivers={};function schedule(ui,key,fn){if(drivers[key]){drivers[key].fn=fn;return;}const driver={fn};drivers[key]=driver;ui.animate(dt=>{if(driver.fn(dt)===false){if(drivers[key]===driver)delete drivers[key];return false;}return true;});}
 const moving=s=>['adding','grinding','locking','placing','brewing','milk','taking'].includes(s.phase);
 const next=s=>({empty:'点豆仓加入咖啡豆',adding:'豆子正在落入豆仓',beans:'按研磨键',grinding:'等研磨完成后锁入手柄',ground:'点击手柄锁入冲煮头',locking:'手柄正在对准并旋紧',locked:s.cup?'按萃取键':'把杯子放到出液口下',placing:'杯子正在移入出液口',brewing:'等待萃取完成，或再按萃取键停止',ready:s.fill<.02?'杯中还没有咖啡，按萃取键重新开始':s.milk?'点击杯子领取拿铁':'可加奶泡，或点击杯子领取',milk:'奶泡正在注入',taking:'正在端走咖啡',collected:'点击重新准备，再做一杯'}[s.phase]);
 const anim=(s,ui,phase,duration,update,done)=>{const run=++s.run;s.phase=phase;s.t=0;schedule(ui,'main',dt=>{if(s.run!==run)return false;s.t+=dt;const k=Math.min(1,s.t/duration);update(k);if(k===1){done();return false;}return true;});};
 function beans(s,ui){if(s.phase!=='empty')return ui.flash(next(s));s.message='咖啡豆落进豆仓，装好一杯的份量。';anim(s,ui,'adding',.7,k=>s.beans=k,()=>{s.phase='beans';s.message='咖啡豆已加入。按下研磨键。';});}
 function grind(s,ui){if(s.phase!=='beans')return ui.flash(next(s));s.message='研磨中，咖啡粉正在落入粉碗……';anim(s,ui,'grinding',2.7,k=>{s.beans=1-k;s.ground=k;},()=>{s.phase='ground';s.message='研磨完成，点击手柄锁入冲煮头。';});}
 function filter(s,ui){if(s.phase!=='ground')return ui.flash(s.filter?'手柄已锁紧。'+next(s):next(s));s.message='抬起粉碗，对准冲煮头，再旋转锁紧。';anim(s,ui,'locking',1,k=>s.filterT=k,()=>{s.filter=true;s.phase='locked';s.message='手柄已锁紧，再把杯子放到出液口下。';});}
 function cup(s,ui){if(s.phase==='ready')return collect(s,ui);if(s.cup||s.phase!=='locked')return ui.flash(next(s));s.cup=true;s.message='端起杯子，放到双出液口正下方。';anim(s,ui,'placing',.85,k=>s.cupT=k,()=>{s.phase='locked';s.message='杯子已就位，按下萃取键。';});}
 function brew(s,ui){if(s.phase==='brewing'){s.run++;s.pressure=0;s.phase='ready';s.message=s.fill>.02?'已停止萃取，保留杯中的咖啡。可加奶泡或领取。':'已停止萃取，杯中还没有咖啡。按萃取键重新开始。';return;}if(!((s.phase==='locked'||(s.phase==='ready'&&s.fill<.02))&&s.cup))return ui.flash(next(s));const fillFrom=s.fill;s.brewT=0;s.pressure=0;s.message='水泵启动，先润湿咖啡粉，再缓缓萃取。';anim(s,ui,'brewing',5.6,k=>{s.brewT=k;s.fill=fillFrom+(1-fillFrom)*Math.max(0,(k-.12)/.88);s.pressure=Math.sin(Math.min(1,k/.12)*Math.PI/2)*Math.min(1,(1-k)/.12);s.message=k<.12?'预浸润中，压力正在建立……':'正在萃取，咖啡液与油脂慢慢上升。再次按萃取键可停止。';},()=>{s.phase='ready';s.pressure=0;s.message='浓缩咖啡完成。可加入奶泡，或直接领取。';});}
 function milk(s,ui){if(s.phase!=='ready'||s.milk||s.fill<.02)return ui.flash(s.milk?'奶泡已经加入，点击杯子领取':s.fill<.02?'先完成咖啡萃取，再加入奶泡':next(s));s.message='奶缸抬起，奶泡缓缓注入。';anim(s,ui,'milk',3,k=>{s.milkT=k;s.milk=Math.max(0,Math.min(1,(k-.25)/.5));s.message=k<.25?'奶缸正在移到杯口……':k>.75?'奶泡已注入，奶缸正在归位。':'奶泡缓缓注入，咖啡正在变得柔和。';},()=>{s.milkT=0;s.phase='ready';s.message='拿铁完成，点击杯子领取。';});}
 function collect(s,ui){if(s.phase!=='ready')return ui.flash(next(s));if(s.fill<.02)return ui.flash('杯中还没有咖啡，按萃取键重新开始');s.message='端起'+(s.milk?'拿铁':'浓缩咖啡')+'，慢慢享用。';anim(s,ui,'taking',.75,k=>s.takeT=k,()=>{s.cup=false;s.phase='collected';s.made++;s.message='已领取'+(s.milk?'拿铁':'浓缩咖啡')+'！点击重新准备，再做一杯。';});}
 function reset(s,ui){const run=s.run+1,made=s.made,pal=s.pal;Object.assign(s,initial(),{run,made,pal});ui.invalidate();}
 const actions={beans,grind,filter,cup,brew,milk,collect,reset};
 function scene(s,m){const parts=[],add=(at,svg,layer=0)=>parts.push({at,svg,layer});
 let out=castShadow([[4,4,4],[64,4,4],[64,61,4],[4,61,4],[4,4,91],[48,52,91]]);
 for(const x of[9,56])for(const y of[10,52])add([x,y,4],cyl(x,y,0,7,3,DARK));
 add([30,30,9],box(2,2,6,63,61,11,m,tone,1.1));
 add([15,30,37],box(3,3,11,31,60,68,m,tone,1.1));
 add([44,31,61],box(31,3,51,61,60,69,m,tone,1.1));
 add([32,31,70],box(2,2,69,62,61,72,METAL,tone,1),1);
 add([49,31,13],box(33,7,11,63,56,14,METAL,tone,1));
 let grid='';for(let y=10;y<55;y+=4)grid+=line([[35,y,14.3],[60,y,14.3]],.5);add([48,31,14.4],grid);
 if(vis([1,0,0])){add([31.2,30,35],shape(on(PX(31.2),rectUV(7,16,56,49)),DARK.m,.6));
 // Keep face-mounted controls with their own panel: center sorting used to paint the panel over both buttons.
 let panel=shape(on(PX(61.2),rrUV(6,54,57,67,2)),CERAMIC.l,.7)+tx(61.4,31,63.5,'晨间咖啡',3.1);
 const grindPress=s.phase==='grinding'?Math.max(0,1-s.t/.25):0,brewPress=s.phase==='brewing'?Math.max(0,1-s.t/.25):0;
 panel+=hit('grind',cylX(61.4,64-1.5*grindPress,15,58,3.4,s.phase==='grinding'?PALS.mustard:METAL)+tx(64.2-1.5*grindPress,15,57,'磨',2.7),'研磨咖啡豆');
 panel+=hit('brew',cylX(61.4,64-1.5*brewPress,29,58,3.4,s.phase==='brewing'?PALS.tomato:PALS.mint)+tx(64.2-1.5*brewPress,29,57,s.phase==='brewing'?'停':'萃',2.7),'开始萃取');
 panel+=observePart('coffee-pressure',cylX(61.3,62.2,44,59,4.8,METAL)+shape(on(PX(62.4),ellUV(44,59,3.9,3.9)),CERAMIC.l,.3)+line([[62.5,44,59],[62.5,44+Math.sin(-.7+s.pressure*1.6)*2.8,59+Math.cos(-.7+s.pressure*1.6)*2.8]],.5));add([63,31,61],panel);}

 if(vis([0,1,0])){add([17,60.2,41],txY(17,60.3,47,'慢慢来',3.1)+txY(17,60.3,42,'好事正在发生',1.9));for(let z=20;z<33;z+=2.5)add([17,60.2,z],line([[9,60.2,z],[25,60.2,z]],.5));for(const x of[7,27])for(const z of[15,63])add([x,60.3,z],shape(on(PY(60.3),ellUV(x,z,.85,.85)),METAL.l,.3)+line([[x-.5,60.4,z],[x+.5,60.4,z]],.2));}
 // Bean hopper is a genuine faceted glass cylinder with a recessed opening and visible beans.
 let hopper=cyl(18,20,72,77,9,DARK)+cyl(18,20,77,89,10,CLEAR,tone,.7)+shape(on(PZ(89.2),ellUV(18,20,8.5,8.5)),DARK.m,.5);
 for(let i=0;i<Math.ceil(s.beans*16);i++){const a=i*2.4,r=2+(i%3)*2.2,x=18+Math.cos(a)*r,y=20+Math.sin(a)*r;hopper+=cyl(x,y,89.4,90.3,1.6,brown,toneI,.35,10)+line([[x-1,y,90.4],[x+1,y,90.4]],.25);}
 add([18,20,83],hit('beans',observePart('coffee-hopper',hopper),'点击豆仓加入咖啡豆'),2);
 add([17,47,76],box(7,39,72,27,55,77,CERAMIC,tone,.7)+txY(17,55.2,74,'温杯台',2.1),2);
 // The basket sits under the grinder outlet, then locks directly into the brew head.
 add([48,29,50],observePart('coffee-head',cyl(48,29,48,52,5.4,METAL,tone,.7)));
 const travel=ease(Math.min(1,s.filterT/.76)),twist=ease(Math.max(0,(s.filterT-.76)/.24));
 const fx=43+5*travel,fy=16+13*travel,fz=34+14*travel+Math.sin(travel*Math.PI)*5,handleAngle=s.phase==='locking'?.65*(1-twist):s.filter?0:.65;
 // A real outlet extends from the grinder tower to the waiting basket.
 add([36,16,44],observePart('coffee-grinder',box(30,12.5,41,36,19.5,46,METAL,tone,.6)+rod([35,16,43],[43,16,40],1.5,METAL,tone,.55)));
 add([fx,fy,fz],hit('filter',observePart('coffee-filter',cyl(fx,fy,fz-3,fz,6,METAL)+shape(on(PZ(fz+.1),ellUV(fx,fy,4.7,4.7)),DARK.m,.4)+(s.ground?shape(on(PZ(fz+.12+s.ground*.2),ellUV(fx,fy,4.6*Math.sqrt(s.ground),4.6*Math.sqrt(s.ground))),brown.d,.2):'')+rod([fx+3,fy,fz-1],[fx+17*Math.cos(handleAngle),fy+17*Math.sin(handleAngle),fz-1],2.3,DARK)+cyl(fx,fy,fz-5,fz-3,2,METAL)),'锁入咖啡手柄'));
 add([46,48,40],rod([40,49,51],[44,49,34],1.1,METAL)+rod([44,49,34],[49,49,31],1,METAL));
 if(vis([1,0,0]))add([63,51,51],hit('milk',cylX(60,64,51,51,2.4,DARK),'加入奶泡'));
 const cp=ease(s.cupT),ct=ease(s.takeT),cx=74-25*cp+27*ct,cy=44-15*cp+14*ct,cz=3+12*cp+Math.sin(cp*Math.PI)*7+8*ct+Math.sin(ct*Math.PI)*8;
 const pour=s.phase==='milk'?(s.milkT<.25?ease(s.milkT/.25):s.milkT>.75?1-ease((s.milkT-.75)/.25):1):0;
 // Lift clear of the tray, then keep the tilted jug below the locked handle.
 const jx=70-6*pour,jy=60-31*pour,jz=3+26*pour+9*Math.sin(Math.PI*pour),angle=.72*pour;
 const jp=(x,y,z)=>[jx+x*Math.cos(angle)-z*Math.sin(angle),jy+y,jz+x*Math.sin(angle)+z*Math.cos(angle)];
 const spout=jp(-5.5,0,14);
 if(s.phase!=='collected'){
 let c=cyl(cx,cy,cz,cz+1.5,9,CERAMIC);
 const liquidZ=cz+2+s.fill*9+s.milk*1.8;
 if(s.fill)c+=cyl(cx,cy,cz+1.6,liquidZ,5.8,matOf(mix('#75462d','#d4a76e',s.milk)),toneI,.35)+shape(on(PZ(liquidZ+.1),ellUV(cx,cy,5.6,5.6)),mix('#ad7546','#f6e9cb',s.milk),.25);
 if(s.phase==='brewing'&&s.brewT>.12)c+=observePart('coffee-extraction',rod([48,28,43],[49,28,liquidZ+.2],.5,brown,toneI,.2)+rod([48,30,43],[49,30,liquidZ+.2],.5,brown,toneI,.2));
 if(s.phase==='milk'&&s.milkT>=.25&&s.milkT<=.75)c+=rod(spout,[cx,cy,liquidZ+.3],.6,CERAMIC,toneI,.2);
 const lower=on(PZ(cz+1.5),ellUV(cx,cy,7,7)),upper=on(PZ(cz+14),ellUV(cx,cy,7,7));
 c+=`<g opacity=".25">${loft(lower,upper,n=>tone(n,CLEAR))}</g><g opacity=".75">${hullInk([...lower,...upper],.9)}</g>`+line(on(PZ(cz+14.2),ellUV(cx,cy,6.8,6.8)),.65);
 c+=rod([cx,cy+6,cz+11],[cx,cy+10,cz+11],1.1,CERAMIC)+rod([cx,cy+10,cz+11],[cx,cy+10,cz+5],1.1,CERAMIC)+rod([cx,cy+10,cz+5],[cx,cy+6,cz+5],1.1,CERAMIC);
 if(s.milk>.9)c+=shape(on(PZ(liquidZ+.3),[[cx,cy+3],[cx-3,cy],[cx-2,cy-2],[cx,cy-1],[cx+2,cy-2],[cx+3,cy]]),'#fff5df',.15);
 add([cx,cy,cz+8],hit('cup',observePart('coffee-cup',`<g opacity="${1-Math.max(0,(s.takeT-.75)/.25)}">${c}</g>`),s.phase==='ready'?'领取咖啡':s.cup?next(s):'放置咖啡杯'));
 }
 if(s.phase==='grinding'){for(let i=0;i<6;i++){const z=39.3-((s.t*14+i)%4.8);add([43,16,z],cyl(43+(i%2)*.4,16,z,z+.5,.45,brown,toneI,.1,6));}}
 const lower=ellUV(0,0,5.5,5.5).map(([x,y])=>jp(x,y,0)),upper=ellUV(0,0,5.5,5.5).map(([x,y])=>jp(x,y,14));
 let jug=loft(lower,upper,n=>tone(n,METAL))+shape(ellUV(0,0,4.4,4.4).map(([x,y])=>jp(x,y,13.7)),'#fff5df',.35)+hullInk([...lower,...upper],.7)+line(upper.concat([upper[0]]),.55)+rod(jp(0,5,11),jp(0,8,9),.8,METAL)+rod(jp(0,8,9),jp(0,5,3),.8,METAL);
 add(jp(0,0,7),hit('milk',observePart('coffee-milk',jug),'注入奶泡'));
 if(s.phase==='adding')for(let i=0;i<5;i++){const z=94-((s.t*16+i*1.7)%5);add([18,20,z],cyl(17+(i%3),20+(i%2),z,z+.7,1,brown,toneI,.2,8),3);}
 out+=parts.sort((a,b)=>a.layer-b.layer||depthOf(a.at)-depthOf(b.at)).map(p=>p.svg).join('');return out;}
 const observation={title:'看动作懂原理',intro:'这是流程与压力的简化示意，不是实机参数。打开后可沿着豆仓、粉碗与杯子看动作。',slow:true,read(s){
 const phase=s.phase,pre=phase==='brewing'&&s.brewT<=.12;
 const stage={empty:'豆仓待料',adding:'咖啡豆入仓',beans:'等待研磨',grinding:'研磨落粉',ground:'粉碗待锁入',locking:'旋紧手柄',locked:s.cup?'准备萃取':'放好杯子',placing:'杯子就位',brewing:pre?'预浸润':'压力萃取',ready:s.fill<.02?'萃取已停止':s.milk?'奶泡完成':'咖啡已入杯',milk:'注入奶泡',taking:'端起咖啡',collected:'本杯已领取'}[phase];
 const text={empty:'先把豆子装进豆仓。研磨会把豆子变成细粉，再送入下方粉碗。',adding:'豆子落进豆仓，豆量随入仓动作增加；研磨尚未启动。',beans:'豆子已备好。按研磨键后，豆仓里的豆子减少，粉碗里的咖啡粉增加。',grinding:'研磨把豆子变成细粉，咖啡粉沿出粉口落进粉碗；上下两处的量同步变化。',ground:'咖啡粉已落入粉碗。把手柄锁进冲煮头，才能让水穿过粉层。',locking:'粉碗先抬起对准冲煮头，再旋紧手柄；锁紧完成前不能萃取。',locked:s.cup?'粉碗已锁紧、杯子已就位。按萃取键，先润湿粉层，再让咖啡液流入杯中。':'粉碗已锁紧。杯子还未就位，萃取不会启动。',placing:'杯子移到双出液口下方；放稳后才能启动萃取，避免咖啡流到外面。',brewing:pre?'水泵先建立示意压力并润湿粉层，此时杯中液量还不增加。':'水穿过粉层并带出可溶物，咖啡流入杯中。压力在收尾时回落；再按萃取键会立即停流。',ready:s.fill<.02?'水泵已停止，压力归零。杯中还不足以领取，可以重新启动萃取。':s.milk?'水泵已停止，压力归零。奶泡已入杯，点击杯子即可领取。':'水泵已停止，压力归零，杯中咖啡保留。可加奶泡或直接领取。',milk:s.milkT<.25?'奶缸先移动到杯口；抵达后才开始注入奶泡。':s.milkT>.75?'奶泡已经注入，奶缸正回到原位；杯中咖啡不会继续增加。':'奶缸倾斜，奶泡流进杯中；这一步不启动水泵，也不再萃取咖啡。',taking:'杯子从出液口下方移出，端走动作完成后才计入已领取杯数。',collected:'这一杯已领取。重新准备会清空本轮豆粉与液量，保留已完成杯数。'}[phase];
 const active={empty:['coffee-hopper'],adding:['coffee-hopper'],beans:['coffee-hopper','coffee-grinder'],grinding:['coffee-hopper','coffee-grinder','coffee-filter'],ground:['coffee-filter'],locking:['coffee-filter','coffee-head'],locked:s.cup?['coffee-head','coffee-cup']:['coffee-cup'],placing:['coffee-cup'],brewing:pre?['coffee-pressure','coffee-filter']:['coffee-pressure','coffee-extraction','coffee-cup'],ready:['coffee-cup'],milk:['coffee-milk','coffee-cup'],taking:['coffee-cup'],collected:['coffee-hopper']}[phase];
 return {stage,text,active,readouts:[{label:'豆仓余量',value:pct(s.beans)},{label:'粉碗粉量',value:pct(s.ground)},{label:'示意压力',value:pct(s.pressure)},{label:'咖啡液量',value:pct(s.fill)}]};}};
 const labels={beans:'加入咖啡豆',grind:'研磨咖啡豆',filter:'锁入手柄',cup:'放置杯子',brew:'开始萃取',milk:'加入奶泡',collect:'领取咖啡',reset:'重新准备'};
 const text=(s,k)=>k==='reset'?(moving(s)?'停止并重新准备':'重新准备'):k==='brew'&&s.phase==='brewing'?'停止萃取':k==='cup'&&s.phase==='ready'&&s.fill>=.02?'领取咖啡':k==='cup'&&s.phase==='taking'?'正在端走咖啡':k==='cup'&&s.cup?'杯子已就位':k==='filter'&&s.filter?'手柄已锁紧':k==='milk'&&s.milk?'奶泡已加入':k==='collect'&&s.phase==='collected'?'已领取 · 再做一杯':labels[k];
 const current=s=>({empty:'beans',adding:'beans',beans:'grind',grinding:'grind',ground:'filter',locking:'filter',locked:s.cup?'brew':'cup',placing:'cup',brewing:'brew',milk:'milk',ready:s.fill<.02?'brew':s.milk?'collect':'milk',taking:'collect',collected:'reset'}[s.phase]);
 return {title:'晨间咖啡机',hint:'点豆仓、手柄与杯子，做一杯自己的咖啡',size:[89,70,96],palette:'mint',state,scene,observation,credit:false,buttons:Object.entries(labels).map(([k,label])=>({label,text:s=>text(s,k),onClick:k==='collect'?(s,u)=>s.phase==='collected'?reset(s,u):collect(s,u):actions[k]})),acts:Object.fromEntries(Object.entries(actions).map(([k,fn])=>[k,(s,e,ui)=>fn(s,ui)])),actionState:(s,k)=>({label:text(s,k),hint:next(s),active:k===current(s)||(s.phase==='ready'&&s.fill>=.02&&k==='cup'),busy:moving(s)&&!(k==='brew'&&s.phase==='brewing')}),progress:s=>moving(s)?{label:{adding:'加入咖啡豆',grinding:'研磨',locking:'锁入手柄',placing:'放好杯子',brewing:s.brewT<.12?'预浸润':'萃取',milk:'注入奶泡',taking:'领取咖啡'}[s.phase],value:s.phase==='adding'?s.beans:s.phase==='grinding'?s.ground:s.phase==='locking'?s.filterT:s.phase==='placing'?s.cupT:s.phase==='brewing'?s.brewT:s.phase==='milk'?s.milkT:s.takeT}:null,readout:s=>s.message,stats:s=>[{label:'已完成',value:s.made+' 杯'},{label:s.phase==='grinding'?'研磨':'萃取',value:Math.round((s.phase==='grinding'?s.ground:s.fill)*100)+'%',small:true}],idea:'热水穿过压实的咖啡粉，带出香气与油脂。奶泡让咖啡变得柔和。'};
};})();
