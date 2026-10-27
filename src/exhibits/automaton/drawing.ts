import type {PaperGeometry} from '../../shared/object-stage';
import {mechanism,type CamState} from './model';
type V=[number,number,number];
export function drawing(s:CamState,g:PaperGeometry,palette='tomato'){
 const m=g.PALS[palette as keyof typeof g.PALS],wood=g.matOf('#c59c69'),edge=g.matOf('#896342'),brass=g.matOf('#c7a14e'),k=mechanism(s),pieces:{at:V;svg:string}[]=[];
 const add=(at:V,svg:string,part='frame')=>pieces.push({at,svg:`<g data-observe-part="${part}">${svg}</g>`});
 const solid=(profile:number[][],x0:number,x1:number,mat:typeof wood)=>{const A=g.on(g.PX(x0),profile),B=g.on(g.PX(x1),profile),cap=g.vis([1,0,0])?B:A;return g.extrude(profile,x0,x1,mat,g.toneI)+g.shape(cap,g.toneI(g.vis([1,0,0])?[1,0,0]:[-1,0,0],mat),1.3);};
 const screw=(x:number,y:number,z:number)=>g.cyl(x,y,z,z+.6,1.1,brass,g.toneI,.4,12)+g.line([[x-.7,y,z+.7],[x+.7,y,z+.7]],.35);
 let base='';for(const x of[10,70])for(const y of[9,45])base+=g.cyl(x,y,0,3,3,g.DARK,g.toneI,.6);
 base+=g.board(0,0,80,54,7,3,wood)+g.castShadow([[7,20,65],[73,20,65],[44,15,100],[44,42,100]],7,g.boardTop(0,0,80,54,7,3));
 if(g.vis([0,1,0]))base+=g.txY(40,54.1,3.6,'CAM / 01',3,g.INK,600);
 for(const x of[10,70]){
  add([x,25,10],g.box(x-5,16,7,x+5,34,11,edge,g.toneI,1));
  for(const [z0,z1] of [[11,27],[27,37],[37,62]])add([x,25,(z0+z1)/2],g.box(x-2.5,21,z0,x+2.5,29,z1,wood,g.toneI,.75));
  add([x,25,30],g.cylX(x-3.5,x+3.5,25,30,5,brass,g.toneI,.8)+g.cylX(x-3.7,x+3.7,25,30,2.4,g.DARK,g.toneI,.5),'shaft');
  for(const y of[18,32])add([x,y,11],screw(x,y,11));
 }
 add([40,25,63],g.box(6,19,62,74,31,65,wood,g.toneI,1.1));
 for(const x of[10,70])add([x,25,65],screw(x,25,65));
 // Fine laminated edge lines and bearing fasteners are attached to the timber, not floating callouts.
 for(const x of[10,70]){
  const side=g.vis([1,0,0])?x+2.55:x-2.55;
  add([side,25,47],g.line([[side,23,39],[side,23.4,47],[side,23.1,58]],.28)+g.line([[side,27,40],[side,26.7,51],[side,27.2,59]],.22));
  for(const y of[22,28])add([side,y,30],g.cylX(side-.2,side+.2,y,30, .55,g.DARK,g.toneI,.3,8),'shaft');
 }
 for(const y of[5,49])base+=g.line([[6,y,7.05],[24,y+.3,7.05],[51,y-.2,7.05],[73,y,7.05]],.22);
 // A two-sided brass guide carries the sliding rod; its bore is visible above.
 add([40,25,66],g.cyl(40,25,65,68,4,brass,g.toneI,.8)+g.cyl(40,25,68,68.1,1.8,g.DARK,g.toneI,.4),'follower');
 for(const [a,b] of [[4,12],[12,36],[36,44],[44,68],[68,84]])add([(a+b)/2,25,30],g.cylX(a,b,25,30,1.8,g.METAL,g.toneI,.7),'shaft');
 // The same polygon supplies contact height and visible geometry, not a decorative sine animation.
 const markerY=25+9*Math.sin(s.phase),markerZ=30+9*Math.cos(s.phase);
 const cam=solid(k.profile,37,43,m)+g.cylX(36.7,43.3,25,30,4,brass,g.toneI,.6)+g.cylX(36.8,43.2,markerY,markerZ,.7,brass,g.toneI,.3,10);
 add([40,25,30],g.act('cam',cam,'role="button" tabindex="0" aria-label="更换一瓣或两瓣凸轮" class="machine-action"'),'cam');
 add([40,25,k.top+1],g.box(35,7,k.top,45,43,k.top+2,brass,g.toneI,.8),'follower');
 for(const [z0,z1] of [[k.top+2,62],[62,68],[68,k.birdZ]])if(z1>z0)add([40,25,(z0+z1)/2],g.cyl(40,25,z0,z1,1.45,g.METAL,g.toneI,.65),'follower');
 // Bird is a thick, carved plywood silhouette, with relief wings on BOTH faces.
 const z=k.birdZ,body=[[8,z+4],[14,z+8],[17,z+16],[24,z+19],[29,z+16],[30,z+12],[39,z+9],[43,z+16],[45,z+6],[38,z],[25,z-2],[16,z]];
 add([40,27,z+7],solid(body,35,45,m),'bird');
 for(const side of[-1,1]){const x=side===1?45.2:34.8;if(g.vis([side,0,0])){
  add([x,28,z+5],g.shape(g.on(g.PX(x),[[20,z+7],[29,z+10],[37,z+7],[31,z+1],[24,z+1]]),g.PALS.mustard.l,.8)+g.line([[x,25,z+5],[x,32,z+5]],.35),'bird');
  add([x,22,z+14],g.shape(g.on(g.PX(x),g.ellUV(22,z+14,1.1,1.1,16)),g.INK,.25),'bird');
 }}
 add([40,11,z+11],solid([[17,z+15],[7,z+12],[17,z+10]],36,44,brass),'bird');
 // Physical crank shares the cam shaft angle. Clicking advances one honest 30-degree step.
 const end:V=[85,25+13*Math.sin(s.phase),30+13*Math.cos(s.phase)];
 add([85,(25+end[1])/2,(30+end[2])/2],g.act('crank',g.rod([85,25,30],end,1.7,brass,g.toneI,.8)+g.cylX(84,87,25,30,3,brass,g.toneI,.7)+g.cylX(84,95,end[1],end[2],2.5,edge,g.toneI,.85),'role="button" tabindex="0" aria-label="手摇柄：转动三十度" class="machine-action"'),'crank');
 return base+pieces.sort((a,b)=>g.depthOf(a.at)-g.depthOf(b.at)).map(p=>p.svg).join('');
}
