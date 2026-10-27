import type {PaperGeometry} from '../../shared/object-stage';
import {mechanism,type GenevaState,CENTERS,PIN_RADIUS} from './model';
type V=[number,number,number];
export function drawing(s:GenevaState,g:PaperGeometry,palette='mint'){
 const m=mechanism(s.angle),body=g.PALS[palette as keyof typeof g.PALS]||g.PALS.mint,brass=g.matOf('#c5964c'),parts:{at:V;svg:string}[]=[];
 const add=(at:V,svg:string,part='')=>parts.push({at,svg:part?`<g data-observe-part="${part}">${svg}</g>`:svg});
 const slab=(pts:V[],thick:number,mat:typeof body)=>{const top=pts.map(p=>[p[0],p[1],p[2]+thick]);return g.loft(pts,top,(n:number[])=>g.toneI(n,mat))+g.shape(top,mat.l,.85);};
 const screw=(x:number,y:number,z:number)=>g.cyl(x,y,z,z+.7,1.1,g.METAL,g.toneI,.35,12)+g.line([[x-.7,y,z+.75],[x+.7,y,z+.75]],.3);
 let base=g.castShadow([[4,5,7],[101,5,7],[101,79,7],[4,79,7],[66,42,61]])+g.board(4,5,101,79,7,5,body);
 for(const x of[10,95])for(const y of[11,73])base+=screw(x,y,7.1);
 base+=g.txY(52,79.1,3,'间歇旋转 · 四站小剧场',3,g.INK,700);
 for(const x of[32,66]){add([x,42,11],g.cyl(x,42,7,12,6.2,g.DARK,g.toneI,.8)+g.cyl(x,42,12,15,4,g.METAL,g.toneI,.5));}
 // The thin carrier sweeps underneath the driven wheel; only its brass pin enters a slot.
 add([32,42,14],g.cyl(32,42,13,15,PIN_RADIUS+2,body,g.toneI,1,64),'driver');
 // A relieved locking disk: its absent sector follows the pin, clearing the star during indexing.
 const lock:V[]=[[32,42,16]];for(let i=0;i<=72;i++){const a=s.angle+Math.PI/3+i/72*(4*Math.PI/3);lock.push([32+18*Math.cos(a),42+18*Math.sin(a),16]);}
 add([32,42,18],slab(lock,3,g.METAL),'lock');
 const wheelZ=s.exploded?28:16,star:V[]=[];
 // Four accurately placed radial slots, separated by circular locking recesses.
 const put=(a:number,r:number,tangent=0)=>star.push([66+r*Math.cos(a+m.output)-tangent*Math.sin(a+m.output),42+r*Math.sin(a+m.output)+tangent*Math.cos(a+m.output),wheelZ]);
 for(let j=0;j<4;j++){
  const slot=5*Math.PI/4+j*Math.PI/2,margin=Math.asin(1.5/28);
  put(slot,8.6,1.5);put(slot,Math.sqrt(28*28-1.5*1.5),1.5);
  for(let i=1;i<60;i++){const a=slot+margin+i/60*(Math.PI/2-2*margin),d=a-(slot+Math.PI/4);let r=28;if(Math.abs(d)<Math.asin(18/CENTERS))r=Math.min(r,CENTERS*Math.cos(d)-Math.sqrt(18*18-CENTERS*CENTERS*Math.sin(d)**2));put(a,r);}
  const next=slot+Math.PI/2;put(next,Math.sqrt(28*28-1.5*1.5),-1.5);put(next,8.6,-1.5);
 }

 add([66,42,wheelZ+1.5],slab(star,3,brass),'wheel');
 add([m.pinX,m.pinY,18],g.cyl(m.pinX,m.pinY,15,21,1.1,g.METAL,g.toneI,.65,16)+g.cyl(m.pinX,m.pinY,20.5,21.3,1.35,g.PALS.tomato,g.toneI,.4,16),'pin');
 add([32,42,21],g.cyl(32,42,19,25,3,g.METAL,g.toneI,.55));
 const hx=32+14*Math.cos(s.angle+Math.PI),hy=42+14*Math.sin(s.angle+Math.PI);
 add([(32+hx)/2,(42+hy)/2,27],g.act('crank',g.rod([32,42,25],[hx,hy,25],1.7,g.DARK,g.toneI,.7)+g.cyl(hx,hy,25,34,2.7,g.WOOD,g.toneI,.7)+screw(32,42,25),'role="button" tabindex="0" aria-label="手摇柄：向当前方向摇动十五度" class="machine-action"'),'crank');
 const lift=s.exploded?13:0;
 add([66,42,27+lift/2],g.cyl(66,42,19,36+lift,2.4,g.METAL,g.toneI,.6)+g.cyl(66,42,20+lift,23+lift,4,g.DARK,g.toneI,.5),'shaft');
 // An open four-spoke platform keeps the indexing wheel visible under the miniature scenery.
 for(let j=0;j<4;j++){
 const a=m.output+j*Math.PI/2,x=66+23*Math.cos(a),y=42+23*Math.sin(a),z=36+lift,c=[g.PALS.tomato,g.PALS.mustard,g.PALS.cobalt,g.PALS.mint][j];
 add([(66+x)/2,(42+y)/2,z],g.rod([66,42,z],[x,y,z],1.5,g.METAL,g.toneI,.6),'platform');
 const local=(u:number,v:number,h:number):V=>[x+u*Math.cos(m.output)-v*Math.sin(m.output),y+u*Math.sin(m.output)+v*Math.cos(m.output),z+h];
 let scene=g.cyl(x,y,z-1,z+1,7.3,g.CERAMIC,g.toneI,.65,32)+slab([local(-4,-4,1),local(4,-4,1),local(4,4,1),local(-4,4,1)],9,c);
 const roof:V[]=[local(-5,-5,10),local(5,-5,10),local(5,5,10),local(-5,5,10)];const apex:V=[x,y,z+16];
 for(let k=0;k<4;k++)scene+=g.shape([roof[k],roof[(k+1)%4],apex],k%2?c.m:c.l,.65);
 for(const [u,v] of [[-4,-4],[4,-4],[4,4],[-4,4]])scene+=g.line([local(u,v,1),local(u,v,10)],.6);
 for(const side of [-1,1]){
 if(g.vis([-side*Math.sin(m.output),side*Math.cos(m.output),0]))scene+=g.shape([local(-1.5,side*4.05,3),local(1.5,side*4.05,3),local(1.5,side*4.05,7),local(-1.5,side*4.05,7)],g.DARK.l,.4);
 if(g.vis([side*Math.cos(m.output),side*Math.sin(m.output),0]))scene+=g.shape([local(side*4.05,-1.5,4),local(side*4.05,1.5,4),local(side*4.05,1.5,7),local(side*4.05,-1.5,7)],g.CERAMIC.l,.4);
 }
 scene+=g.tx(x,y,z+18,String(j+1),3.8,g.INK,700);
 add([x,y,z+7],scene,'carousel');
 }
 add([66,42,37+lift],g.cyl(66,42,35+lift,39+lift,5,body,g.toneI,.65)+screw(66,42,39+lift));
 // Fixed station marker is mounted to the base, not rotating with the output.
 add([94,42,14],g.cyl(94,42,7,23,1,g.METAL,g.toneI,.4)+slab([[91,39,23],[98,42,23],[91,45,23]],1,g.PALS.tomato));
 base+=g.tx(17,16,7.2,'输入',2.6,g.INK)+g.tx(80,67,7.2,'输出',2.6,g.INK);
 return base+g.byDepth(parts);
}
