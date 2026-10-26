import {FRONT_TEETH, REAR_TEETH, type BicycleState} from './model';
import {createColorFiguresRuntime} from '../../engines/colorfigures/runtime.js';
type Geometry = ReturnType<typeof createColorFiguresRuntime>;
type Point = [number,number,number];
export const bicycleBounds = {min:[-16,-9,0],max:[20,128,86]};
/** Legacy equivalent-chain helper retained for a model-only closed-path assertion. */
export function chainPath(radius:number){return `M0 ${-radius} L40 -7 A7 7 0 1 1 40 7 L0 ${radius} A${radius} ${radius} 0 0 1 0 ${-radius} Z`;}
/** A fixed-length illustrative chain; the cage rotates to take up the selected cog's slack. */
export function drivetrainChain(gear:number){
 const rear=REAR_TEETH[gear],x=[4.3,5.8,7.3][gear],r=7*rear/32;
 const build=(phi:number)=>{
  const lower:[number,number]=[16+14*Math.cos(phi),18+14*Math.sin(phi)],points:Point[]=[];
  const arc=(x:number,y:number,z:number,r:number,a:number,b:number,n:number)=>{for(let i=0;i<=n;i++){const t=a+(b-a)*i/n;points.push([x,y+r*Math.cos(t),z+r*Math.sin(t)]);}};
  arc(x,20,26,r,Math.PI*.9,Math.PI*.48,10);arc(7.3,55,23,7,Math.PI*.48,-Math.PI*.52,24);
  arc(x,lower[0],lower[1],2.2,-Math.PI*.42,-Math.PI*1.4,10);arc(x,16,18,2.2,-Math.PI*.6,-Math.PI*1.13,7);
  arc(x,20,26,r,-Math.PI*.83,-Math.PI*1.1,8);points.push(points[0]);
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(...points[i].map((v,j)=>v-points[i-1][j])));
  return {points,lengths,length:lengths[lengths.length-1],lower};
 };
 const target=96*(2*Math.PI*7/FRONT_TEETH);let lo=-2.1,hi=-.35;
 for(let i=0;i<42;i++){const mid=(lo+hi)/2;if(build(mid).length>target)lo=mid;else hi=mid;}
 return {...build((lo+hi)/2),links:96};
}
// Geometry depends only on the three cassette positions, never on animation phase.
const chainGeometries=REAR_TEETH.map((_,gear)=>drivetrainChain(gear));
export function drawing(s:BicycleState,g:Geometry,palette='mint'):string {
 const m=g.PALS[palette as keyof typeof g.PALS]||g.PALS.mint,metal=g.METAL,dark=g.DARK;
 const supportMetal={l:'#b8b9ac',m:'#90978b',d:'#616d62'};
 const leather=g.matOf('#a26943'),rubber={l:'#56534b',m:'#3d3b35',d:'#211f1a'},brass=g.matOf('#bb9d51');
 // Line roles are local to this open, fine-structured object. Material-colored
 // facet seams are not ink: inflating them would bury the tiny chain/cassette faces.
 type LineRole='silhouette'|'structure'|'mechanism'|'spoke'|'support';
 const inkWeight:Record<LineRole,number>={silhouette:3.2,structure:3,mechanism:2.1,spoke:2,support:1.8};
 const ink=(svg:string,role:LineRole)=>svg.replace(/<path\b[^>]*>/g,path=>path.replace(/stroke-width="([\d.]+)"/,(_m,w)=>`stroke-width="${(Number(w)*(path.includes(`stroke="${g.INK}"`)?inkWeight[role]:1)).toFixed(3)}"`));
 const parts:Array<{at:Point;svg:string}>=[];
 const add=(at:Point,svg:string,role:LineRole='mechanism')=>parts.push({at,svg:`<g data-line-role="${role}">${ink(svg,role)}</g>`});
 const obs=(id:string,svg:string)=>`<g data-observe-part="${id}">${svg}</g>`;
 const action=(id:string,label:string,svg:string)=>g.act(id,svg,`role="button" tabindex="0" aria-label="${label}"`);
 const ring=(x:number,y:number,z:number,r:number,n=48):Point[]=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [x,y+r*Math.cos(a),z+r*Math.sin(a)];});
 const pipe=(a:Point,b:Point,r:number,mat=m,w=.36,role:LineRole='structure')=>add(g.avg([a,b]) as Point,g.rod(a,b,r,mat,g.tone,w,r,12),role);
 const screw=(x:number,y:number,z:number,r=.65)=>g.cylX(x,x+.35,y,z,r,metal,g.tone,.24,12)+g.line([[x+.38,y-r*.5,z-r*.3],[x+.38,y+r*.5,z+r*.3]],.2);
 // Separate tyre strips, two rim planes and crossed spokes preserve wheel depth when orbited.
 for(const y of [20,102]){
  const z=26,r=24,phase=-s.wheelTurns*Math.PI*2;
  const rear=y===20;
  for(let i=0;i<48;i++){
   const a=i/48*Math.PI*2,b=(i+1)/48*Math.PI*2;
   const pts:Point[]=[[-1.6,y+r*Math.cos(a),z+r*Math.sin(a)],[-1.6,y+r*Math.cos(b),z+r*Math.sin(b)],[1.6,y+r*Math.cos(b),z+r*Math.sin(b)],[1.6,y+r*Math.cos(a),z+r*Math.sin(a)]];
   add(g.avg(pts) as Point,obs('wheel',g.shape(pts,g.tone([0,Math.cos((a+b)/2),Math.sin((a+b)/2)],rubber),.15)),'silhouette');
   if(i%3===0){const t=(a+b)/2;add([0,y+r*Math.cos(t),z+r*Math.sin(t)],g.line([[-1.3,y+(r+.06)*Math.cos(t-.009),z+(r+.06)*Math.sin(t-.009)],[1.3,y+(r+.06)*Math.cos(t+.009),z+(r+.06)*Math.sin(t+.009)]],.22));}
  }
  for(const x of [-1.6,1.6]){
   // Sort rim/sidewall sectors by their own depth: a whole annulus sorted at its hub
   // would incorrectly paint over the lower drive-side chain and derailleur cage.
   for(let j=0;j<48;j++)for(const [ro,ri,mat] of [[24,21.5,rubber],[21.5,20.2,metal]] as const){
    const a=j/48*Math.PI*2,b=(j+1)/48*Math.PI*2;
    const ps:Point[]=[[x,y+ro*Math.cos(a),z+ro*Math.sin(a)],[x,y+ro*Math.cos(b),z+ro*Math.sin(b)],[x,y+ri*Math.cos(b),z+ri*Math.sin(b)],[x,y+ri*Math.cos(a),z+ri*Math.sin(a)]];
    add(g.avg(ps) as Point,obs('wheel',g.shape(ps,g.tone([Math.sign(x),0,0],mat),0)+g.line([ps[0],ps[1]],ro===24?.42:.22)+g.line([ps[2],ps[3]],.2)),'silhouette');
   }
   for(let i=0;i<20;i++){
    const a=i*Math.PI/10+phase,hubA=a+(i%2?.36:-.36),xhub=x>0?2.1:-2.1;
    const a3:Point=[xhub,y+2.4*Math.cos(hubA),z+2.4*Math.sin(hubA)],b3:Point=[x*.9,y+20.6*Math.cos(a),z+20.6*Math.sin(a)];
    add(g.avg([a3,b3]) as Point,obs('wheel',g.line([a3,b3],.17)),'spoke');
   }
  }
  add([0,y,z],obs('wheel',g.cylX(-3,3,y,z,2.7,metal,g.tone,.45,20)));
  for(const x of [-3.1,3.1])add([x,y,z],g.cylX(x-.3,x+.3,y,z,3.5,metal,g.tone,.28,16));
  const va=phase+.6;add([1.9,y+19.7*Math.cos(va),z+19.7*Math.sin(va)],g.rod([1.9,y+19.1*Math.cos(va),z+19.1*Math.sin(va)],[1.9,y+21.2*Math.cos(va),z+21.2*Math.sin(va)],.45,dark,g.tone,.17));
  add([5,y,z],screw(4,y,z,1));
  if(rear)add([-5,18,26],g.rod([-5,20,26],[-5,15,28],.55,metal,g.tone,.25));
 }
 // A triangulated diamond frame. Twin rear stays and fork blades have genuine axle spacing.
 const bb:Point=[0,55,23],seat:Point=[0,48,63],head:Point=[0,88,66];
 pipe(bb,seat,1.65);pipe(seat,head,1.55);pipe(bb,[0,90,56],1.9);
 pipe([0,87.5,68],[0,91,54],2.25);
 for(const x of [-3.6,3.6]){pipe([x,20,26],[x*.2,48,61],.9);pipe([x,20,26],[x*.45,55,23],1);pipe([x,102,26],[x*.4,91,55],1.25);}
 // Joined collars, pressed head bearings, frame weld accents and a bottle cage.
 add([0,55,23],g.cylX(-3.7,3.7,55,23,2.8,m,g.tone,.5));
 for(const z of [55,66.5])add([0,90-(z-55)*.25,z],g.cyl(0,90-(z-55)*.25,z-.65,z+.65,2.6,metal,g.tone,.35));
 for(const z of [49,52])add([0,49.8,z],g.cyl(0,49.8,z-.25,z+.25,1.8,metal,g.tone,.2));
 pipe([1.9,65,39],[3.1,61,47],.35,metal,.15);pipe([3.1,61,47],[3.1,67,50],.35,metal,.15);pipe([3.1,67,50],[1.9,69,44],.35,metal,.15);
 // Saddle: rolled leather skin, narrow nose, stitching and double metal rails.
 pipe([0,48,63],[0,45,73],1.15,metal);
 for(const x of [-1.7,1.7])pipe([x,39,73],[x,49,74],.36,metal,.18);
 const saddleTop:Point[]=[[-4.6,37,76],[4.6,37,76],[5.3,41,76.4],[2,51,75.5],[-2,51,75.5],[-5.3,41,76.4]];
 const saddleBottom=saddleTop.map(p=>[p[0],p[1],p[2]-1.8] as Point);
 add([0,42,75],g.loft(saddleBottom,saddleTop,(n:number[])=>g.tone(n,leather))+g.shape(saddleTop,leather.l,.4),'silhouette');
 for(const x of [-4,4])add([x,40,76.5],g.line([[x,38,76.5],[x,41,76.7],[Math.sign(x)*1.4,49,75.9]],.17));
 // Steering cockpit, rubber grips, independent brake levers and routed cables.
 pipe([0,88,66],[0,85.5,75],1.25,metal);pipe([0,85.5,75],[0,91,77],1.2,metal);
 pipe([-10,91,77],[10,91,77],.95,metal);
 for(const x of [-1,1]){
  pipe([x*10,91,77],[x*13,86,77],1.25,dark);
  for(let j=0;j<5;j++)pipe([x*(10.8+j*.35),89.7-j*.55,77.1],[x*(11.2+j*.35),89.7-j*.55,77.1],1.3,rubber,.12);
  pipe([x*8.7,91,76],[x*9.4,87,74.3],.45,metal,.22);
 }
 for(const y of [20,102]){
  const z=46.1;
  for(const x of [-1,1])pipe([x*2.6,y,z],[x*3.8,y-.8,z-3],.55,metal,.23);
  add([0,y,z],g.cylX(-3.5,3.5,y,z,.7,metal,g.tone,.22,10));
  for(const x of [-1,1])add([x*2.2,y-1,z-3],g.box(x*2.2-.6,y-2,z-4,x*2.2+.6,y,z-2,dark,g.tone,.2));
 }
 add([0,70,63],g.line([[8.6,90,75],[7.3,84,70],[3.3,78,63],[2.3,49,60],[2.6,22,47]],.24));
 add([-1,93,55],g.line([[-8.6,90,75],[-6,95,69],[-3,101,56],[-2.5,102,47]],.24));
 // Cassette with three separate axial planes, pitch-matched teeth and engraved lock ring.
 const gearXs=[4.3,5.8,7.3],chainX=gearXs[s.gear],frontX=7.3,chainGeometry=chainGeometries[s.gear],[lowerY,lowerZ]=chainGeometry.lower;
 const cog=(x:number,y:number,z:number,r:number,teeth:number,phase:number,mat=metal)=>{
  const ps:Point[]=Array.from({length:teeth*4},(_,i)=>{const a=i/(teeth*4)*Math.PI*2+phase,rr=r+(i%4===1||i%4===2?.42:0);return[x,y+Math.cos(a)*rr,z+Math.sin(a)*rr];});
  const back=ps.map(p=>[p[0]-.55,p[1],p[2]] as Point);
  let svg=g.loft(back,ps,(n:number[])=>g.tone(n,mat))+g.shape(ps,g.tone([1,0,0],mat),.23);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5+phase;svg+=g.shape(g.on(g.PX(x+.025),g.ellUV(y+Math.cos(a)*r*.6,z+Math.sin(a)*r*.6,r*.16,r*.16,10)),dark.d,.12);}
  return `<g data-teeth="${teeth}" data-cog-points="${teeth*4}">${svg+g.cylX(x+.03,x+.35,y,z,r*.25,metal,g.tone,.18,14)}</g>`;
 };
 for(let i=0;i<3;i++){const r=7*REAR_TEETH[i]/FRONT_TEETH;add([gearXs[i],20,26],action('gear','切换后飞轮挡位',obs('rear',cog(gearXs[i],20,26,r,REAR_TEETH[i],-s.wheelTurns*Math.PI*2,i===s.gear?brass:metal))));}
 add([frontX,55,23],obs('crank',cog(frontX,55,23,7,32,-s.crankTurns*Math.PI*2,m)));
 // A visible rear derailleur: mounting knuckle, articulated parallelogram, sprung pulley cage.
 add([7.6,18,23.5],g.box(6,16,21,9,20,25,metal,g.tone,.35));
 for(const x of [chainX-.9,chainX+.9]){pipe([x,18,23],[x,16,18],.5,metal,.22);pipe([x,20,23],[x,18,18],.5,metal,.22);pipe([x,16,18],[x,lowerY,lowerZ],.55,dark,.26);}
 add([chainX,16,18],obs('rear',cog(chainX,16,18,2.2,10,-s.chainTravel*.628,dark)));
 add([chainX,lowerY,lowerZ],obs('rear',cog(chainX,lowerY,lowerZ,2.2,10,-s.chainTravel*.628,dark)));
 add([chainX+1.2,16,18],screw(chainX+1.3,16,18,.7));add([chainX+1.2,lowerY,lowerZ],screw(chainX+1.3,lowerY,lowerZ,.7));
 // Chain route follows working sprocket, front wrap and two cage pulleys.
 const chain=chainGeometry.points,lengths=chainGeometry.lengths,total=chainGeometry.length,pitch=total/chainGeometry.links;
 // Exactly 96 links at a fixed pitch: cage position, not link stretching, absorbs gear-size changes.
 for(let i=0;i<chain.length-1;i++)add(g.avg([chain[i],chain[i+1]]) as Point,obs('chain',g.line([chain[i],chain[i+1]],.65)));
 const sample=(t:number):Point=>{t=((t%total)+total)%total;let i=1;while(i<lengths.length-1&&lengths[i]<t)i++;const k=(t-lengths[i-1])/(lengths[i]-lengths[i-1]||1);return chain[i].map((v,j)=>chain[i-1][j]+(v-chain[i-1][j])*k) as Point;};

 for(let t=0;t<total;t+=pitch){const a=sample(t+s.chainTravel*pitch),b=sample(t+.84+s.chainTravel*pitch),aa:Point=[a[0]+.22,a[1],a[2]],bb:Point=[b[0]+.22,b[1],b[2]];add(g.avg([aa,bb]) as Point,obs('chain',g.rod(aa,bb,.27,metal,g.tone,.12,.27,6)));}
 // Opposed crank arms and platform pedals, assembled outside the chain plane.
 for(const side of [-1,1]){
  const a=-s.crankTurns*Math.PI*2+(side===1?0:Math.PI),x=side===1?9:-4,y=55+10*Math.cos(a),z=23+10*Math.sin(a);
  let svg=g.rod([x,55,23],[x,y,z],.9,metal,g.tone,.35)+g.cylX(x-.4,x+.6,55,23,1.6,metal,g.tone,.28);
  const px=x+side*3;
  svg+=g.rod([x,y,z],[px,y,z],.5,metal,g.tone,.2)+g.box(px-1.8,y-3.2,z-.6,px+1.8,y+3.2,z+.6,dark,g.tone,.3);
  for(let j=-2;j<=2;j++)svg+=g.line([[px-1.6,y+j,z+.65],[px+1.6,y+j,z+.65]],.2);
  add([x,y,z],action('pedal','开始或暂停踩踏',obs('crank',svg)));
 }
 // Axle-mounted workshop display stand: both wheels are intentionally lifted for pedalling.
 // Wide tripod feet visibly meet the floor; separate cups capture the stationary rear axle.
 const standRods:Array<[Point,Point,number]>=[];
 for(const side of [-1,1]){
  const top:Point=[side*5,20,26];
  for(const y of (side===1?[38]:[10,30])){
   const foot:Point=[side*11,y,1];standRods.push([foot,top,1.05]);
   pipe(foot,top,1.05,supportMetal,.34,'support');
   add(foot,g.box(side*11-2,y-2,0,side*11+2,y+2,1.4,dark,g.tone,.28),'support');
  }
  pipe([side*5,20,26],[side*3.4,20,26],1.4,dark,.3,'support');
  add([side*6,20,26],g.cylX(side*6-.5,side*6+.5,20,26,1.7,supportMetal,g.tone,.3,14),'support');
 }
 standRods.push([[-11,30,1],[11,38,1],.9]);pipe([-11,30,1],[11,38,1],.9,dark,.3,'support');
 // A small front-wheel roller cradle supports its two-unit clearance above the same floor.
 for(const y of [99,105])add([0,y,1.5],g.cylX(-4,4,y,1.5,1.5,metal,g.tone,.3,16),'support');
 for(const x of [-4.5,4.5])add([x,102,.7],g.box(x-.6,97,0,x+.6,107,1.4,dark,g.tone,.25),'support');
 // A graphic cast silhouette, not a second technical drawing. Preserve the
 // directional light and open wheel/frame shapes, but omit spoke, cable and
 // small-component projections. Contact shadows stay exact at the support feet.
 const [sx,sy]=g.yawTurn(g.SH as [number,number]),factor=g.SHADOW_LEN/g.SHADOW_K;
 const floor=(p:Point):Point=>[p[0]+p[2]*sx*factor,p[1]+p[2]*sy*factor,0];
 let wheelShadow='';
 for(const y of[20,102]){
  const outer=ring(0,y,26,24).map(floor),inner=ring(0,y,26,20.2).map(floor);
  wheelShadow+=`<path data-shadow-part="wheel" d="${g.pd(outer)} ${g.pd(inner)}" fill="${g.SHADOW}" fill-rule="evenodd"/>`;
 }
 // The three main tubes read as one open diamond. Paired stays and all the
 // workshop rods are deliberately represented by their collective footprint.
 const shadowRods:Array<[Point,Point,number]>=[[[0,55,23],[0,48,63],1.8],[[0,48,63],[0,88,66],1.6],[[0,55,23],[0,91,55],1.9],[[0,91,55],[0,102,26],1.5],[[0,20,26],[0,48,63],1],[[0,20,26],[0,55,23],1],[[0,45,75],[0,48,63],1],[[0,87.5,68],[0,91,54],2.25]];
 let frameShadow='';
 for(const[a,b,r]of shadowRods)frameShadow+=g.castShadow([[a[0]-r,a[1],a[2]],[a[0]+r,a[1],a[2]],[b[0]-r,b[1],b[2]],[b[0]+r,b[1],b[2]]]);
 frameShadow+=g.castShadow(saddleTop);
 let contactShadow='';
 for(const[a,b,r]of standRods)contactShadow+=g.castShadow([[a[0]-r,a[1],a[2]],[a[0]+r,a[1],a[2]],[b[0]-r,b[1],b[2]],[b[0]+r,b[1],b[2]]]);
 for(const side of [-1,1])for(const y of(side===1?[38]:[10,30]))contactShadow+=g.castShadow([[side*11-2,y-2,1],[side*11+2,y-2,1],[side*11+2,y+2,1],[side*11-2,y+2,1]]);
 contactShadow+=g.castShadow([[-5,97,1.4],[5,97,1.4],[5,107,1.4],[-5,107,1.4]]);
 const shadow=`<g data-line-role="shadow" aria-hidden="true"><g data-shadow-role="silhouette">${wheelShadow}${frameShadow}</g><g data-shadow-role="contact">${contactShadow}</g></g>`;
 return `<g class="bicycle-solid-scene">${shadow}${g.byDepth(parts)}</g>`;
}
