import type {PaperGeometry,Palette} from '../../shared/object-stage';
import {angle,type PressState} from './model';
type V=[number,number,number];
export const pressBounds=[5,4,0,92,82,120] as const;
export function drawing(s:PressState,g:PaperGeometry,palette:Palette='mint'){
 const m=g.PALS[palette],brass=g.matOf('#cca564'),wood=g.matOf('#a56743');
 const parts:{at:V;svg:string}[]=[];const add=(at:V,svg:string)=>parts.push({at,svg});
 const bolt=(x:number,y:number,z:number)=>g.cyl(x,y,z,z+.8,1.1,g.METAL,g.toneI,.35,12)+g.line([[x-.6,y,z+.85],[x+.6,y,z+.85]],.3);
 let base=g.castShadow([[8,8,6],[89,8,6],[89,73,6],[8,73,6],[20,30,85],[80,30,85],[58,44,118-s.travel]]);
 for(const x of[16,80])for(const y of[17,65])base+=g.cyl(x,y,0,3,3.6,g.DARK,g.toneI,.7);
 base+=g.board(8,8,89,73,8,5,m)+g.box(25,20,8,78,64,11,g.METAL,g.toneI,.8);
 // Paper is a physical sheet on the platen; its print exists only after die contact.
 base+=g.box(36,37,11,75,62,11.4,g.CERAMIC,g.toneI,.45);
 if(s.imprint){
  const pts:V[]=Array.from({length:s.imprint==='star'?10:48},(_,i)=>{const a=i/(s.imprint==='star'?10:48)*Math.PI*2;const r=s.imprint==='star'?(i%2?3:6):4.3+1.7*Math.cos(6*a);return[55+r*Math.cos(a),49+r*Math.sin(a),11.45];});
  base+=g.shape(pts,'#a84e3b',0);
  if(s.imprint==='flower')base+=g.shape(g.on(g.PZ(11.5),g.ellUV(55,49,1.2,1.2,16)),g.CERAMIC.l,0);
 }
 // Two cast columns and a crossbeam carry the pinion bearings and the sliding guides.
 for(const x of[23,78]){
  add([x,29,12],g.box(x-7,22,11,x+7,36,15,m,g.tone,.8)+bolt(x-4,33,15)+bolt(x+4,33,15));
  add([x,28,50],g.box(x-4,24,15,x+4,32,85,m,g.tone,.7));
 }
 add([50,28,85],g.box(19,23,82,82,34,89,m,g.tone,1));
 // Rigid yoke projects from the frame; two separated guide blocks constrain the rack.
 for(const z of[53,84]){
  add([61,36,z],g.box(58,28,z-3,65,48,z+3,m,g.tone,.7));
  add([55,45,z],g.box(51,44.5,z-3,60,48,z+3,g.METAL,g.toneI,.6));
 }
 const dz=s.travel;
 for(let z=46;z<118;z+=5)add([55,41,z+2.5-dz],g.box(52.5,38,z-dz,58,44.5,Math.min(z+5,118)-dz,g.METAL,g.toneI,0)+g.line([[58,44.5,z-dz],[58,44.5,Math.min(z+5,118)-dz]],.4)+g.line([[52.5,44.5,z-dz],[52.5,44.5,Math.min(z+5,118)-dz]],.4));
 // Tooth pitch matches the 12-tooth pinion's pitch circumference (2πr / 12).
 const pitch=2*Math.PI*9/12;
 for(let i=0;i<15;i++){
  const z=74-5.5*pitch+i*pitch-dz;const a:V[]=[[52.5,38,z-1.65],[49.5,38,z-.8],[49.5,38,z+.8],[52.5,38,z+1.65]];
  const b=a.map(([x,,h]):V=>[x,44.5,h]);add([51,41,z],g.loft(a,b,(n:number[])=>g.toneI(n,brass))+g.shape(g.vis([0,1,0])?b:a,brass.l,.45));
 }
 // Die, keyed directly to the rack, never advances independently of handwheel angle.
 add([55,47,46-dz],g.box(40,36,44-dz,70,59,49-dz,m,g.tone,.8)+g.cyl(55,49,41-dz,44-dz,8,g.DARK,g.toneI,.6)+g.cyl(55,49,39.4-dz,41-dz,7,brass,g.toneI,.4));
 // Rear bearing and through shaft; shaft axis is y, perpendicular to the rack travel plane.
 add([42,29,74],g.box(35,24,67,49,35,81,m,g.tone,.8));
 for(const [a,b] of[[25,37],[37,47],[47,66]])add([42,(a+b)/2,74],g.rod([42,a,74],[42,b,74],2,g.METAL,g.toneI,.5));
 const theta=-angle(s),gear:V[]=[];
 for(let i=0;i<12;i++)for(const [offset,r] of [[-.5,7.6],[-.28,10.3],[.28,10.3],[.5,7.6]]){const a=(i+offset)*Math.PI/6+theta;gear.push([42+r*Math.cos(a),38,74+r*Math.sin(a)]);}
 const front=gear.map(([x,,z]):V=>[x,45,z]);
 add([42,41.5,74],g.loft(gear,front,(n:number[])=>g.toneI(n,brass))+g.shape(g.vis([0,1,0])?front:gear,brass.l,.75));
 add([42,46,74],g.rod([42,44.5,74],[42,48,74],3.2,g.METAL,g.toneI,.5));
 // A spoked handwheel, with separate wooden grip, shares the exact pinion angle.
 let wheel='';const circle=(r:number,y:number)=>Array.from({length:49},(_,i):V=>[42+r*Math.cos(i/48*Math.PI*2),y,74+r*Math.sin(i/48*Math.PI*2)]);
 const outerA=circle(18.4,63.6).slice(0,-1),outerB=circle(18.4,66.4).slice(0,-1),innerA=circle(15.6,63.6).slice(0,-1),innerB=circle(15.6,66.4).slice(0,-1);
 wheel+=g.loft(outerA,outerB,(n:number[])=>g.tone(n,m))+g.loft(innerA,innerB,(n:number[])=>g.tone(n,m),true);const frontWheel=g.vis([0,1,0]);const outer=frontWheel?outerB:outerA,inner=frontWheel?innerB:innerA;wheel+=`<path d="${g.pd(outer)} ${g.pd(inner)}" fill="${m.l}" fill-rule="evenodd" stroke="${g.INK}" stroke-width=".6"/>`;
 for(let i=0;i<3;i++){const a=theta+i*Math.PI*2/3;wheel+=g.rod([42,65,74],[42+16*Math.cos(a),65,74+16*Math.sin(a)],1.1,g.METAL,g.toneI,.4);}
 const hx=42+17*Math.cos(theta),hz=74+17*Math.sin(theta);
 wheel+=g.rod([42,63,74],[42,67,74],3.5,m,g.tone,.6)+g.rod([hx,65,hz],[hx,75,hz],2,wood,g.toneI,.6);
 add([42,66,74],g.act('wheel',wheel,'role="button" tabindex="0" aria-label="转动手轮一小格，按当前方向移动压头" class="machine-action"'));
 add([50,73,5],g.txY(50,73.1,4,'PAPER PRESS · 09',2.3,g.INK,600));
 return base+g.byDepth(parts);
}
