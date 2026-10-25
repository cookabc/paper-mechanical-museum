const fs=require('fs'),assert=require('assert/strict'),{fan}=require('../../../washer-study/qa/observation-harness.cjs'),dir=__dirname;
const h=fan();
h.run('const originalAdd=engine.add;engine.add=function(pts,...args){originalAdd.call(this,pts,...args);Object.assign(this.parts[this.parts.length-1],{points:pts,fill:args[0]??"none"});}');
const inside=(p,x,y)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit};
const edgeDist=(p,x,y)=>{let min=1e9;for(let i=0;i<p.length;i++){let a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));min=Math.min(min,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy))}return min};
function plane(p){let a=p[0];for(let i=1;i<p.length-1;i++){let b=p[i],c=p[i+1],det=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(det)<.001)continue;let x=((b[2]-a[2])*(c[1]-a[1])-(c[2]-a[2])*(b[1]-a[1]))/det,y=((c[2]-a[2])*(b[0]-a[0])-(b[2]-a[2])*(c[0]-a[0]))/det;return[x,y,a[2]-a[0]*x-a[1]*y]}}
let frames=0,samples=0,defects=[];
for(let yi=0;yi<24;yi++)for(const pitch of [-.12,.19,.8])for(const headYaw of [-.65,0,.65])for(const angle of [0,.35,.7,1.05]){
 const yaw=yi*Math.PI/12;h.run(`engine.yaw=${yaw};engine.pitch=${pitch};state.headYaw=${headYaw};state.angle=${angle};render()`);frames++;assert(!/NaN|Infinity|undefined/.test(h.ids.art.innerHTML));assert.equal(h.run('engine.parts[0].depth'),-1e6);
 const parts=h.run('engine.parts.filter(p=>p.points&&p.fill!=="none").map(p=>({screen:p.points.map(q=>[...engine.project(q),engine.depth(q)]),blade:p.headSide===0,tag:p.svg.includes("fan-motor")?"motor":p.svg.includes("fan-blades")?"bladeHub":"body"}))').map((p,i)=>({...p,i,plane:plane(p.screen),bbox:[Math.min(...p.screen.map(q=>q[0])),Math.min(...p.screen.map(q=>q[1])),Math.max(...p.screen.map(q=>q[0])),Math.max(...p.screen.map(q=>q[1]))]})).filter(p=>p.plane);
 for(const blade of parts.filter(p=>p.blade)){
  const [x0,y0,x1,y1]=blade.bbox;
  for(let x=Math.ceil(x0/8)*8;x<x1;x+=8)for(let y=Math.ceil(y0/8)*8;y<y1;y+=8){
   if(!inside(blade.screen,x,y)||edgeDist(blade.screen,x,y)<3)continue;samples++;
   let nearest=null,painted=null,d=-1e20;
   for(const p of parts){const b=p.bbox;if(x<b[0]||x>b[2]||y<b[1]||y>b[3]||!inside(p.screen,x,y))continue;const z=p.plane[0]*x+p.plane[1]*y+p.plane[2];if(z>d){d=z;nearest=p}painted=p;}
   if(nearest!==painted&&(nearest?.blade||painted?.blade)){
    const pz=painted.plane[0]*x+painted.plane[1]*y+painted.plane[2];if(d-pz>1&&edgeDist(nearest.screen,x,y)>2&&edgeDist(painted.screen,x,y)>2)defects.push({yaw,pitch,headYaw,angle,x,y,nearest:nearest.blade?'blade':nearest.tag,painted:painted.blade?'blade':painted.tag,depthDelta:d-pz});
   }
  }
 }
}
const result={frames,samples,defects: defects.slice(0,100),defectCount:defects.length};fs.writeFileSync(dir+'/dense-regression-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
