import {electrical,type GeneratorState} from './model';
import {createColorFiguresRuntime} from '../../engines/colorfigures/runtime.js';
type Geometry=ReturnType<typeof createColorFiguresRuntime>;
type V=[number,number,number];
/** Built with the museum's shared orthographic solids, light and ink. */
export const generatorBounds={min:[-5,-6,0],max:[113,78,87]} as const;
export const generatorCamera=[68,28] as const;
// Ink describes the role of an edge, not a blanket multiplier over every material seam.
const ink={silhouette:1.65,part:1.15,slender:.85,detail:.45,winding:.28,glass:1.25};
export function drawing(s:GeneratorState,g:Geometry,palette='mustard'){
 const e=electrical(s),m=g.PALS[palette as keyof typeof g.PALS]||g.PALS.mustard;
 const copper={l:'#df9a63',m:'#b86636',d:'#6c321e'},wood={l:'#bc8254',m:'#925c37',d:'#4f3527'},red=g.PALS.tomato,blue=g.PALS.cobalt;
 const pieces:{at:V;svg:string}[]=[];let foundation='';
 const add=(at:V,svg:string,part?:string)=>pieces.push({at,svg:part?`<g data-observe-part="${part}">${svg}</g>`:svg});
 const action=(name:string,label:string,svg:string)=>g.act(name,svg,`role="button" tabindex="0" aria-label="${label}" class="machine-action"`);
 const screw=(x:number,y:number,z:number)=>g.cyl(x,y,z,z+.55,1.05,g.METAL,g.toneI,.25,12)+g.line([[x-.6,y,z+.6],[x+.6,y,z+.6]],.22);
 const wire=(pts:V[],mat=copper,r=.55)=>pts.slice(1).map((p,i)=>g.rod(pts[i],p,r,mat,g.toneI,ink.detail,r,8)).join('');
 const addWire=(pts:V[],mat=copper,r=.55,part='circuit')=>pts.slice(1).forEach((p,i)=>{const a=pts[i];add([(a[0]+p[0])/2,(a[1]+p[1])/2,(a[2]+p[2])/2],wire([a,p],mat,r),part);});
 // Depth-sort long uprights in sections without inventing joints at each section boundary.
 const vertical=(x:number,y:number,z0:number,z1:number,r:number)=>{
  const A=g.on(g.PZ(z0),g.ellUV(x,y,r,r,16)),B=g.on(g.PZ(z1),g.ellUV(x,y,r,r,16));
  const sides=[-1,1].map(sign=>g.line([[x+sign*g.CR[0]*r,y+sign*g.CR[1]*r,z0],[x+sign*g.CR[0]*r,y+sign*g.CR[1]*r,z1]],ink.slender)).join('');
  return g.loft(A,B,(n:number[])=>g.toneI(n,g.METAL))+sides;
 };
 // The enamel edge frames a quiet warm-grey instrument deck; colour belongs to the mechanism.
 for(const x of[7,101])for(const y of[7,63])foundation+=g.cyl(x,y,0,3,3,g.DARK,g.toneI,.6);
 foundation+=g.board(0,0,109,70,7,4,m);
 foundation+=g.shape(g.on(g.PZ(7.04),g.rrUV(2,2,107,68,3)),g.BOARD.l,ink.detail);
 const deck=g.boardTop(0,0,109,70,7,4);
 foundation+=g.castShadow([[13,26,20],[59,26,20],[59,50,56],[13,50,56],[36,38,84],[52,38,84]],7,deck);
 foundation+=g.castShadow([[77,6,10],[99,6,10],[99,28,40],[88,17,52],[77,28,40]],7,deck);
 foundation+=g.box(8,10,7,65,66,12,g.BOARD,g.toneI,ink.part);
 foundation+=g.shape(g.on(g.PZ(12.1),g.rrUV(10,12,63,64,2)),g.METAL.m,ink.detail);
 for(const x of[13,60])for(const y of[15,61])add([x,y,12.5],screw(x,y,12.4));
 // The rear and front pole assemblies share a magnetic yoke under the rotor.
 foundation+=g.box(10,25,12.5,62,51,19,g.DARK,g.toneI,ink.part);
 for(const [x0,x1,mat,label] of [[10,20,red,'N'],[52,62,blue,'S']] as const){
  const xc=(x0+x1)/2;
  // Compact cylindrical pole pieces leave both winding ends and the slip rings visible.
  // They are carried by steel pedestals, not a sheet-like wall across the mechanism.
  add([xc,38,25],g.box(x0+1,33,18,x1-1,43,37,g.METAL,g.toneI,ink.slender),'field');
  add([xc,38,44],g.cylX(x0,x1,38,44,10.5,mat,g.tone,ink.silhouette,32),'field');
  const inward=label==='N'?x1+.12:x0-.12;
  const normal=label==='N'?[1,0,0]:[-1,0,0];
  if(g.vis(normal))add([inward,38,44],g.shape(g.on(g.PX(inward),g.ellUV(38,44,8.4,8.4,32)),g.METAL.l,ink.detail),'field');
  // The pole designation is painted on the barrel as well as the end cap, so
  // an oblique museum view does not reduce N/S to an unreadable sliver.
  if(g.vis([1,0,0]))add([x1+.22,38,44],g.tx(x1+.3,38,42.5,label,5.2,g.INK),'field');
  for(const side of[-1,1])if(g.vis([0,side,0])){
   const p=g.P(xc,38+side*10.55,42.5),u=g.Dv(side,0,0),v=g.Dv(0,0,-1);
   add([xc,38+side*10.55,44],`<text transform="${g.txM(p,u,v)}" font-size="4.8" fill="${g.INK}" text-anchor="middle" font-family="sans-serif" font-weight="700">${label}</text>`,'field');
  }
  for(const y of[29,47])add([xc,y,19.5],g.box(x0-1,y-2,18,x1+1,y+2,20,g.METAL,g.toneI,.4)+screw(xc,y,20.1));
 }
 // Bearing pedestal, rotating shaft, two insulated slip rings and carbon brushes.
 add([36,38,15],g.cyl(36,38,12,18,5.5,g.METAL,g.toneI,ink.part));
 // Split the long shaft where it crosses the winding: orbit depth is local, not one centre key.
 for(const [z0,z1] of [[18,26],[26,29],[29,44],[44,62],[62,68],[68,72]])add([36,38,(z0+z1)/2],vertical(36,38,z0,z1,1.8));
 add([36,38,21],g.cyl(36,38,18,26,3.2,g.DARK,g.toneI,ink.slender));
 for(const z of[20,24]){
  add([36,38,z],g.cyl(36,38,z-1,z+1,4.1,copper,g.toneI,ink.slender,24),'coil');
  add([42,38,z],g.box(39.7,36.5,z-.9,45,39.5,z+.9,g.DARK,g.toneI,.4)+g.box(44.8,35.7,z-1.5,48.8,40.3,z+1.5,g.CERAMIC,g.toneI,.4),'circuit');
 }
 // Rotor former and ten separately drawn enamelled copper turns. Plane normal at phase zero is +x.
 const radial:V=[-Math.sin(s.phase),Math.cos(s.phase),0];
 const rotor=(u:number,z:number,offset=0):V=>[36+radial[0]*u+Math.cos(s.phase)*offset,38+radial[1]*u+Math.sin(s.phase)*offset,z];
 // A thin rectangular winding frame, with the centre left open to make the coil readable.
 for(const u of[-10.5,10.5])add(rotor(u,45),g.rod(rotor(u,29),rotor(u,62),1.1,g.CERAMIC,g.toneI,ink.detail),'coil');
 for(const z of[29,62])add(rotor(0,z),g.rod(rotor(-10.5,z),rotor(10.5,z),1.1,g.CERAMIC,g.toneI,ink.detail),'coil');
 for(let i=0;i<10;i++){
  const d=(i-4.5)*.32,u=11.5,z0=28.4,z1=62.6;
  const a=rotor(-u,z0,d),b=rotor(u,z0,d),c=rotor(u,z1,d),d0=rotor(-u,z1,d);
  for(const [p,q] of [[a,b],[b,c],[c,d0],[d0,a]])add([(p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2],g.rod(p,q,.24,copper,g.toneI,ink.winding,.24,6),'coil');
 }
 addWire([rotor(-9,28.3),rotor(-2,27),rotor(-2,24)],copper,.3,'coil');
 addWire([rotor(9,28.3),rotor(2,27),rotor(2,20)],copper,.3,'coil');
 // A real, slightly diagonal bearing bridge stands outside the swept coil volume.
 // Its feet are on the plate, leaving daylight between uprights, winding and both poles.
 const bearingFeet:V[]=[[41,13,12],[31,63,12]];
 for(const [x,y] of bearingFeet){
  add([x,y,13],g.box(x-3,y-2.5,12,x+3,y+2.5,14,g.METAL,g.toneI,ink.detail));
  for(const [z0,z1] of [[14,29],[29,44],[44,62],[62,68]])add([x,y,(z0+z1)/2],vertical(x,y,z0,z1,1.3));
 }
 for(const [x,y] of bearingFeet)add([(x+36)/2,(y+38)/2,68],g.rod([x,y,68],[36,38,68],1.5,g.METAL,g.toneI,ink.slender));
 add([36,38,68],g.cyl(36,38,65,71,4,g.DARK,g.toneI,ink.part)+g.cyl(36,38,69,71,3,g.METAL,g.toneI,ink.slender));
 // One real crank, keyed to the same phase as the rotor. Wood grip turns about its pin.
 const end:V=[36+17*Math.cos(s.phase),38+17*Math.sin(s.phase),76];
 let crank=g.cyl(36,38,71,75,3.3,g.METAL,g.toneI,.5)+g.rod([36,38,75],end,1.6,g.METAL,g.toneI,.5)+g.cyl(end[0],end[1],75,84,2.1,wood,g.toneI,.5)+g.cyl(end[0],end[1],83.5,84.2,2.3,wood,g.toneI,.35);
 crank+=g.cyl(36,38,74.5,75.4,1.2,g.DARK,g.toneI,.3);
 add([(36+end[0])/2,(38+end[1])/2,77],action('crank','点击手摇柄开始或暂停发电',crank),'handle');
 // Rubber insulated wire follows the base through separate terminal blocks.
 const insRed=g.matOf('#ad4434'),insBlack=g.matOf('#514b45');
 addWire([[48.8,38,24],[54,38,24],[64,38,9],[72,49,9],[73,53,13]],insRed,.7);
 addWire([[48.8,38,20],[54,40,20],[63,44,9],[81,30,9],[82,23,15]],insBlack,.7);
 // Knife switch with porcelain foot, separate binding posts and a real opening contact.
 let sw=g.box(68,45,8,92,62,11,g.CERAMIC,g.toneI,.6);
 for(const x of[73,87]){
  sw+=g.cyl(x,53,11,13,2.5,g.METAL,g.toneI,.45)+g.cyl(x,53,13,16,1.2,copper,g.toneI,.3)+g.cyl(x,53,15,16,2,copper,g.toneI,.35);
 }
 const switchEnd:V=s.closed?[87,53,16]:[81,53,25];
 sw+=g.rod([73,53,16],switchEnd,.8,copper,g.toneI,.35)+g.rod(switchEnd,[switchEnd[0]+3,53,switchEnd[2]+1],1.6,g.DARK,g.toneI,.45);
 for(const x of[70,90])sw+=screw(x,59,11.1);
 sw+=g.txY(80,62.1,9,'接通 / 断开',2.2,g.INK,500);
 add([80,53,15],action('switch','点击刀闸接通或断开电路',sw),'circuit');
 addWire([[87,53,13],[97,53,9],[99,26,9],[94,23,15]],insRed,.7);
 // Lamp plinth, ceramic socket, screw thread, and smoothly revolved glass envelope.
 const lx=88,ly=17;
 let lamp=g.cyl(lx,ly,7,10,11,g.DARK,g.toneI,ink.part)+g.cyl(lx,ly,10,13,10,g.CERAMIC,g.toneI,ink.part)+g.cyl(lx,ly,13,19,6.5,g.CERAMIC,g.toneI,ink.slender);
 // Two separate binding posts sit on the socket flange, clear of the central barrel.
 for(const x of[82,94])lamp+=g.cyl(x,23,13,15,1.1,copper,g.toneI,.3,12)+g.cyl(x,23,14.5,15.3,1.6,copper,g.toneI,.3,12)+g.line([[x-.8,23,15.4],[x+.8,23,15.4]],.2);
 for(const z of[18,19.4,20.8,22.2])lamp+=g.cyl(lx,ly,z,z+.8,5.1,g.METAL,g.toneI,.3,24);
 lamp+=g.rod([lx-2,ly,23],[lx-3.4,ly,34],.33,g.METAL,g.toneI,.2)+g.rod([lx+2,ly,23],[lx+3.4,ly,34],.33,g.METAL,g.toneI,.2);
 const filament:V[]=[];for(let i=0;i<17;i++)filament.push([lx-3.4+i*.425,ly+(i%2?.6:-.6),34+(i%2?.55:-.55)]);
 lamp+=wire(filament,e.brightness>.01?g.matOf('#edb644'):g.DARK,.26);
 // Two tangent-continuous Bezier sections describe the bulb, not an eight-sided balloon.
 const profile:number[][]=[];
 const section=(a:number[],b:number[],c:number[],d:number[],steps:number)=>{for(let i=profile.length?1:0;i<=steps;i++){const t=i/steps,u=1-t;profile.push([0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]));}};
 section([23,4.5],[29,4.5],[31,12.1],[40,12.1],10);
 section([40,12.1],[47,12.1],[52,6.2],[52,0],12);
 const glass={l:e.brightness>.01?'#fff1b8':'#f2f6f0',m:e.brightness>.01?'#e8d484':'#c3d9d8',d:'#89abae'};
 let shell='';
 for(let i=1;i<profile.length;i++){
  const [z0,r0]=profile[i-1],[z1,r1]=profile[i];
  const A=g.on(g.PZ(z0),g.ellUV(lx,ly,r0,r0,24)),B=g.on(g.PZ(z1),g.ellUV(lx,ly,r1,r1,24));
  shell+=g.loft(A,B,(n:number[])=>g.toneI(n,glass));
 }
 // A restrained translucent skin preserves the filament. The reflection follows the
 // near glass surface as the camera orbits, like the museum's camera-relative light.
 lamp+=`<g data-glass="shell" opacity="${(.25+.12*e.brightness).toFixed(2)}">${shell}</g>`;
 const contour=profile.flatMap(([z,r])=>g.on(g.PZ(z),g.ellUV(lx,ly,r,r,32)));
 const yaw=g.YAW*Math.PI/180,rx=.8*Math.cos(yaw)-.6*Math.sin(yaw),ry=.8*Math.sin(yaw)+.6*Math.cos(yaw);
 const reflection=profile.slice(5,17).map(([z,r]):V=>[lx+rx*r,ly+ry*r,z]);
 lamp+=g.line(reflection,1.8).replace(`stroke="${g.INK}"`,'stroke="#fffdf4"');
 lamp+=`<g data-glass="contour">${g.hullInk(contour,ink.glass)}</g>`;
 lamp+=g.line(g.on(g.PZ(23),g.ellUV(lx,ly,4.5,4.5,24)),ink.detail);
 add([lx,ly,30],lamp,'lamp');
 // One functional identity mark; no decorative hatching competing with the copper winding.
 add([35,69.9,4.5],g.txY(35,70.1,3.3,'手摇交流发电机',3.1,g.INK,700));
 // The blue shadow and all solids use the same projection and light as the earlier ten exhibits.
 const shadow=g.castShadow([[0,0,7],[109,0,7],[109,70,7],[0,70,7],[13,26,56],[59,50,56],[36,38,84],[100,17,52]]);
 return shadow+foundation+g.byDepth(pieces);
}
