import {electrical,type GeneratorState} from './model';
import {createColorFiguresRuntime} from '../../engines/colorfigures/runtime.js';
type Geometry=ReturnType<typeof createColorFiguresRuntime>;
type V=[number,number,number];
/** Built with the museum's shared orthographic solids, light and ink. */
export const generatorBounds={min:[-5,-6,0],max:[113,78,87]} as const;
export function drawing(s:GeneratorState,g:Geometry,palette='mustard'){
 const e=electrical(s),m=g.PALS[palette as keyof typeof g.PALS]||g.PALS.mustard;
 const copper={l:'#df9a63',m:'#b86636',d:'#6c321e'},wood={l:'#bc8254',m:'#925c37',d:'#4f3527'},red=g.PALS.tomato,blue=g.PALS.cobalt;
 const pieces:{at:V;svg:string}[]=[];let foundation='';
 const add=(at:V,svg:string,part?:string)=>pieces.push({at,svg:part?`<g data-observe-part="${part}">${svg}</g>`:svg});
 const action=(name:string,label:string,svg:string)=>g.act(name,svg,`role="button" tabindex="0" aria-label="${label}" class="machine-action"`);
 const screw=(x:number,y:number,z:number)=>g.cyl(x,y,z,z+.55,1.05,g.METAL,g.toneI,.25,12)+g.line([[x-.6,y,z+.6],[x+.6,y,z+.6]],.22);
 const wire=(pts:V[],mat=copper,r=.55)=>pts.slice(1).map((p,i)=>g.rod(pts[i],p,r,mat,g.toneI,.25,r,8)).join('');
 // Feet, rolled-edge enamel base, and bolted inspection panels.
 for(const x of[7,101])for(const y of[7,63])foundation+=g.cyl(x,y,0,3,3,g.DARK,g.toneI,.6);
 foundation+=g.board(0,0,109,70,7,4,m);
 const deck=g.boardTop(0,0,109,70,7,4);
 foundation+=g.castShadow([[13,26,20],[59,26,20],[59,50,56],[13,50,56],[36,38,84],[52,38,84]],7,deck);
 foundation+=g.castShadow([[77,6,10],[99,6,10],[99,28,40],[88,17,52],[77,28,40]],7,deck);
 foundation+=g.box(9,15,7,65,61,12,m,g.tone,.6);
 foundation+=g.shape(g.on(g.PZ(12.1),g.rrUV(12,18,62,58,2)),g.METAL.m,.5);
 for(const x of[14,60])for(const y of[20,56])add([x,y,12.5],screw(x,y,12.4));
 // The rear and front pole assemblies share a magnetic yoke under the rotor.
 foundation+=g.box(13,25,12.5,58,51,19,g.DARK,g.toneI,.7);
 for(const [x0,x1,mat,label] of [[13,23,red,'N'],[49,59,blue,'S']] as const){
  const xc=(x0+x1)/2;
  // Compact cylindrical pole pieces leave both winding ends and the slip rings visible.
  // They are carried by steel pedestals, not a sheet-like wall across the mechanism.
  add([xc,38,25],g.box(x0+1,33,18,x1-1,43,37,g.METAL,g.toneI,.55),'field');
  add([xc,38,44],g.cylX(x0,x1,38,44,11.5,mat,g.tone,.75,32),'field');
  const inward=label==='N'?x1+.12:x0-.12;
  const normal=label==='N'?[1,0,0]:[-1,0,0];
  if(g.vis(normal))add([inward,38,44],g.shape(g.on(g.PX(inward),g.ellUV(38,44,9,9,32)),g.METAL.l,.45),'field');
  if(g.vis([1,0,0]))add([x1+.22,38,44],g.tx(x1+.3,38,42.5,label,5.2,g.INK),'field');
  for(const y of[29,47])add([xc,y,19.5],g.box(x0-1,y-2,18,x1+1,y+2,20,g.METAL,g.toneI,.4)+screw(xc,y,20.1));
 }
 // Bearing pedestal, rotating shaft, two insulated slip rings and carbon brushes.
 add([36,38,15],g.cyl(36,38,12,18,5.5,g.METAL,g.toneI,.6));
 add([36,38,25],g.cyl(36,38,18,72,1.8,g.METAL,g.toneI,.5));
 add([36,38,21],g.cyl(36,38,18,26,3.2,g.DARK,g.toneI,.45));
 for(const z of[20,24]){
  add([36,38,z],g.cyl(36,38,z-1,z+1,4.1,copper,g.toneI,.45,24),'coil');
  add([42,38,z],g.box(39.7,36.5,z-.9,45,39.5,z+.9,g.DARK,g.toneI,.4)+g.box(44.8,35.7,z-1.5,48.8,40.3,z+1.5,g.CERAMIC,g.toneI,.4),'circuit');
 }
 // Rotor former and ten separately drawn enamelled copper turns. Plane normal at phase zero is +x.
 const radial:V=[-Math.sin(s.phase),Math.cos(s.phase),0];
 const rotor=(u:number,z:number,offset=0):V=>[36+radial[0]*u+Math.cos(s.phase)*offset,38+radial[1]*u+Math.sin(s.phase)*offset,z];
 // A thin rectangular winding frame, with the centre left open to make the coil readable.
 for(const u of[-10.5,10.5])add(rotor(u,45),g.rod(rotor(u,29),rotor(u,62),1.1,g.CERAMIC,g.toneI,.35),'coil');
 for(const z of[29,62])add(rotor(0,z),g.rod(rotor(-10.5,z),rotor(10.5,z),1.1,g.CERAMIC,g.toneI,.35),'coil');
 for(let i=0;i<10;i++){
  const d=(i-4.5)*.32,u=11.5,z0=28.4,z1=62.6;
  const a=rotor(-u,z0,d),b=rotor(u,z0,d),c=rotor(u,z1,d),d0=rotor(-u,z1,d);
  for(const [p,q] of [[a,b],[b,c],[c,d0],[d0,a]])add([(p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2],g.rod(p,q,.24,copper,g.toneI,.14,.24,6),'coil');
 }
 add([36,38,27],wire([rotor(-9,28.3),rotor(-2,27),rotor(-2,24)],copper,.3)+wire([rotor(9,28.3),rotor(2,27),rotor(2,20)],copper,.3),'coil');
 // Upper bearing bridge stays open above the rotor instead of a filled housing hiding it.
 for(const y of[18,58])add([36,y,42],g.rod([36,y,12],[36,y,68],1.5,g.METAL,g.toneI,.5));
 add([36,38,68],g.rod([36,18,68],[36,58,68],1.7,g.METAL,g.toneI,.5)+g.cyl(36,38,65,71,4,g.DARK,g.toneI,.5)+g.cyl(36,38,69,71,3,g.METAL,g.toneI,.5));
 // One real crank, keyed to the same phase as the rotor. Wood grip turns about its pin.
 const end:V=[36+17*Math.cos(s.phase),38+17*Math.sin(s.phase),76];
 let crank=g.cyl(36,38,71,75,3.3,g.METAL,g.toneI,.5)+g.rod([36,38,75],end,1.6,g.METAL,g.toneI,.5)+g.cyl(end[0],end[1],75,84,2.1,wood,g.toneI,.5)+g.cyl(end[0],end[1],83.5,84.2,2.3,wood,g.toneI,.35);
 crank+=g.cyl(36,38,74.5,75.4,1.2,g.DARK,g.toneI,.3);
 add([(36+end[0])/2,(38+end[1])/2,77],action('crank','点击手摇柄开始或暂停发电',crank),'handle');
 // Rubber insulated wire follows the base through separate terminal blocks.
 const insRed=g.matOf('#ad4434'),insBlack=g.matOf('#514b45');
 add([68,40,9],wire([[48.8,38,24],[54,38,24],[64,38,9],[72,49,9],[73,53,13]],insRed,.7)+wire([[48.8,38,20],[54,40,20],[63,44,9],[81,30,9],[82,23,15]],insBlack,.7),'circuit');
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
 add([92,35,10],wire([[87,53,13],[97,53,9],[99,26,9],[94,23,15]],insRed,.7),'circuit');
 // Lamp plinth, ceramic socket, screw thread, and faceted translucent glass envelope.
 const lx=88,ly=17;
 let lamp=g.cyl(lx,ly,7,10,11,g.DARK,g.toneI,.7)+g.cyl(lx,ly,10,13,10,g.CERAMIC,g.toneI,.65)+g.cyl(lx,ly,13,19,6.5,g.CERAMIC,g.toneI,.5);
 // Two separate binding posts sit on the socket flange, clear of the central barrel.
 for(const x of[82,94])lamp+=g.cyl(x,23,13,15,1.1,copper,g.toneI,.3,12)+g.cyl(x,23,14.5,15.3,1.6,copper,g.toneI,.3,12)+g.line([[x-.8,23,15.4],[x+.8,23,15.4]],.2);
 for(const z of[18,19.4,20.8,22.2])lamp+=g.cyl(lx,ly,z,z+.8,5.1,g.METAL,g.toneI,.3,24);
 lamp+=g.rod([lx-2,ly,23],[lx-3.4,ly,34],.33,g.METAL,g.toneI,.2)+g.rod([lx+2,ly,23],[lx+3.4,ly,34],.33,g.METAL,g.toneI,.2);
 const filament:V[]=[];for(let i=0;i<17;i++)filament.push([lx-3.4+i*.425,ly+(i%2?.6:-.6),34+(i%2?.55:-.55)]);
 lamp+=wire(filament,e.brightness>.01?g.matOf('#edb644'):g.DARK,.26);
 const profile=[[23,4.5],[26,5],[30,8.5],[35,11.5],[41,12.1],[47,10],[51,5.5],[52,0.6]];
 const glass={l:e.brightness>.01?'#fff0a9':'#eef3ed',m:e.brightness>.01?'#e9cf73':'#c4dbdc',d:'#8aacae'};
 let shell='';
 for(let i=1;i<profile.length;i++){
  const [z0,r0]=profile[i-1],[z1,r1]=profile[i];
  const A=g.on(g.PZ(z0),g.ellUV(lx,ly,r0,r0,32)),B=g.on(g.PZ(z1),g.ellUV(lx,ly,r1,r1,32));
  shell+=g.loft(A,B,(n:number[])=>g.toneI(n,glass));
 }
 // Front contour and paper-coloured reflection distinguish the glass from the filament inside.
 lamp+=`<g opacity="${(.38+.20*e.brightness).toFixed(2)}">${shell}</g>`;
 const contour=profile.flatMap(([z,r])=>g.on(g.PZ(z),g.ellUV(lx,ly,r,r,32)));
 lamp+=g.hullInk(contour,.7)+g.line([[lx-6,ly-4,33],[lx-8,ly-4,39],[lx-6,ly-4,46]],.6);
 add([lx,ly,30],lamp,'lamp');
 // Small finish details keep this a crafted instrument rather than a diagram.
 add([35,69.9,4.5],g.txY(35,70.1,3.3,'手摇交流发电机',3.1,g.INK,700));
 add([79,66,7.3],g.shape(g.on(g.PZ(7.2),g.rrUV(69,62,99,67,1)),g.CERAMIC.l,.35)+g.shape(g.on(g.PZ(7.25),g.rectUV(71,63,72,66)),g.INK,0));
 for(const x of[18,22,26,30,34,38,42,46,50,54])add([x,15.1,10],g.line([[x,15.2,8.6],[x,15.2,11.1]],.35));
 // The blue shadow and all solids use the same projection and light as the earlier ten exhibits.
 const shadow=g.castShadow([[0,0,7],[109,0,7],[109,70,7],[0,70,7],[13,26,56],[59,50,56],[36,38,84],[100,17,52]]);
 // Match the originals’ ink weight after the shared stage normalises world-space strokes.
 return (shadow+foundation+g.byDepth(pieces)).replace(/stroke-width="([\d.]+)"/g,(_,width:string)=>`stroke-width="${Number(width)*1.7}"`);
}
