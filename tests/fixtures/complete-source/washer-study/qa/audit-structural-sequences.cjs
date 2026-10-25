/* Offline geometry/state audit. Executes production scene source, not a browser. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {fan,claw,base,source}=require('./observation-harness.cjs');
const root=path.resolve(__dirname,'../..');
function geometry(which,override){
 const h=base(),html=which==='washer-study'&&override?override:source(which+'/dist/index.html'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 h.ctx.document={documentElement:{classList:{contains:()=>true}}};
 h.run(scripts[0].slice(0,scripts[0].indexOf('/* ---------- page shell')));
 if(which==='claw-studio'){const app=override||source(which+'/dist/app.js');h.run(app.slice(0,app.indexOf('function clawBlocked')));}
 else {const s=scripts[1];h.run(s.slice(0,s.indexOf('/* ---------- behaviour')));h.run('const st='+s.match(/state:(\{ prog:0,[\s\S]*?xrT:0 \})/)[1]);}
 h.run('st.pal="mint";st.az=105;setLight(105);');
 const render=(yaw,pitch,state={})=>{h.ctx.patch=state;h.run(`Object.assign(st,patch);setCam(${yaw},${pitch});_clipN=0;scene(st,PALS[st.pal]);`);const layers=h.run('scene.layers');const markup=layers.map(p=>`<g data-layer="${p.key}" opacity="${p.opacity??1}" transform="${p.transform||''}">${p.svg}</g>`).join('');assert(!/NaN|Infinity|undefined/.test(markup));return markup};
 const svg=(yaw,pitch,state)=>{const markup=render(yaw,pitch,state);assert(!/NaN|Infinity|undefined/.test(markup));const points=h.run('[[0,0,0],[110,0,0],[0,80,0],[110,80,0],[0,0,125],[110,0,125],[0,80,125],[110,80,125]].map(p=>P(...p))');let xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs)-12,y=Math.min(...ys)-12,w=Math.max(...xs)-x+12,hh=Math.max(...ys)-y+12;return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="760" viewBox="${x} ${y} ${w} ${hh}"><rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#faf8f2"/>${markup}</svg>`};
 return {...h,render,svg};
}
function save(site,name,svg){fs.writeFileSync(path.join(root,site,'qa','structural-'+name+'.svg'),svg)}
if(require.main===module){
const report={views:[],benchmarks:[]};
for(const site of['washer-study','claw-studio']){
 const h=geometry(site);for(const yaw of[0,45,90,135,180,225,270,315])for(const pitch of[6,23,45,78]){h.render(yaw,pitch);report.views.push({site,yaw,pitch,finite:true})}
 for(const [name,yaw,pitch]of[['front',38,23],['side',90,23],['rear',218,23],['top',38,78],['low',0,6]])save(site,name,h.svg(yaw,pitch));
 if(site==='washer-study'){
  for(const [name,state]of [['door-middle',{door:.5,doorT:1}],['door-open',{door:1,doorT:1}],['cutaway',{xr:1,door:0,doorT:0,laundry:'drum'}],['spin',{xr:1,run:true,prog:2,tau:6,drive:1,startA:0}]])save(site,name,h.svg(218,23,state));
 }else{
  for(const [name,state]of [['closed',{open:0,z:70.3,phase:'close'}],['lift',{open:0,z:79,phase:'up',got:0,x:42,y:57,grabDX:0,grabDY:0}],['release',{open:1,z:87,phase:'release',got:0,x:52,y:37}],['fall',{phase:'fall',fallZ:30,got:0}],['eject',{phase:'eject',outX:70,got:0}],['prize',{phase:'prize',outX:87,got:0}]])save(site,name,h.svg(38,23,state));
 }
 const t=performance.now();for(let i=0;i<30;i++)h.render(38,23);report.benchmarks.push({site,meanNodeMs:(performance.now()-t)/30});
}
const f=fan();
for(const yaw of[0,Math.PI/4,Math.PI/2,3*Math.PI/4,Math.PI,5*Math.PI/4,3*Math.PI/2,7*Math.PI/4])for(const pitch of[-.12,.19,.45,.8])for(const swing of[-.65,0,.65]){f.run(`engine.yaw=${yaw};engine.pitch=${pitch};state.headYaw=${swing};render()`);assert(!/NaN|Infinity|undefined/.test(f.ids.art.innerHTML));report.views.push({site:'fan-study',yaw,pitch,swing,finite:true})}
for(const[name,yaw,pitch,swing]of[['front',-.4,.19,0],['side',Math.PI/2,.19,0],['rear',Math.PI+.4,.19,0],['top',-.4,.8,0],['swing',Math.PI/2,.19,.65]]){f.run(`engine.yaw=${yaw};engine.pitch=${pitch};state.headYaw=${swing};render()`);save('fan-study',name,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 760" width="800" height="760"><rect width="800" height="760" fill="#faf8f2"/>${f.ids.art.innerHTML}</svg>`)}
const t=performance.now();for(let i=0;i<100;i++)f.run('state.angle+=.1;render()');report.benchmarks.push({site:'fan-study',meanNodeMs:(performance.now()-t)/100});
fs.writeFileSync(path.join(__dirname,'structural-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({finiteViews:report.views.length,benchmarks:report.benchmarks},null,2));
}
module.exports={geometry};
