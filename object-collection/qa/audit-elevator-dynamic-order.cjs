/* Independent ray/slab check of the SVG paint order and emitted local masks.
 * Samples complete upward/downward travel, not merely landing endpoints. */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const ctx={window:{},console,addEventListener(){},URLSearchParams,performance:{now:()=>0}};vm.createContext(ctx);
for(const f of['core.js','elevator-occlusion.js','scenes/elevator.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',f),'utf8'),ctx);
vm.runInContext(`globalThis.cfg=window.SCENES.elevator();cfg.state.pal='mint';
 globalThis.render=(pos,yaw,pitch,door=0)=>{setCam(yaw,pitch);setLight(105);Object.assign(cfg.state,{pos,door,phase:door?'opening':'moving',floor:Math.round(pos/33)+1,target:3});cfg.scene(cfg.state,PALS.mint);return cfg.scene.layers};
 globalThis.check=()=>{
 const parts=cfg.scene.layers.filter(p=>!p.depthTested&&p.boxes?.length===1&&!p.occlusionFaces&&!['motor','motorFoot'].includes(p.key));
 const masks=parts.map(p=>{const m=p.svg.match(/<mask[^>]*>([\\s\\S]*?)<\\/mask>/);if(!m)return[];const d=m[1].match(/<path d="([^"]+)" fill="black"/);if(!d)return[];return d[1].split('Z').filter(Boolean).map(s=>s.slice(1).split('L').map(q=>q.split(' ').map(Number)));});
 const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
 let failures=[];
 for(const part of parts)for(const face of window.ElevatorOcclusion.boxFaces(...part.boxes[0]))for(const [u,v]of[[.27,.38],[.69,.72]]){
 const q=face[0].map((a,k)=>a+(face[1][k]-a)*u+(face[3][k]-a)*v),screen=P(...q);let near=-Infinity,nearKey='',painted=-Infinity,paintedKey='';
 for(let j=0;j<parts.length;j++){const b=parts[j].boxes[0];let lo=-Infinity,hi=Infinity,hit=true;
 for(let k=0;k<3;k++){if(Math.abs(CV[k])<1e-8){if(q[k]<b[k]-1e-6||q[k]>b[k+3]+1e-6){hit=false;break;}}else{const a=(b[k]-q[k])/CV[k],c=(b[k+3]-q[k])/CV[k];lo=Math.max(lo,Math.min(a,c));hi=Math.min(hi,Math.max(a,c));if(lo>hi+1e-6){hit=false;break;}}}
 if(hit){if(hi>near){near=hi;nearKey=parts[j].key;}if(!masks[j].some(poly=>inside(screen,poly))){painted=hi;paintedKey=parts[j].key;}}}
 if(painted<near-1e-4)failures.push({sample:part.key,near:nearKey,painted:paintedKey,delta:near-painted});
 }return failures;};`,ctx);
let frames=0,errors=[];
for(const yaw of[0,15,45,75,90,105,135,180,225,270,315])for(const pitch of[6,35,70])for(const pos of[0,3.02,3.04,16.5,30,33,36.02,36.04,39,49.5,66]){ctx.render(pos,yaw,pitch);const failures=ctx.check();frames++;if(failures.length)errors.push({yaw,pitch,pos,failures:failures.slice(0,3)});}
console.log(JSON.stringify({frames,failedFrames:errors.length,examples:errors.slice(0,12)},null,2));assert.equal(errors.length,0,'A farther structural surface paints over a nearer one');
