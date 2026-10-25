const fs=require('fs'),cp=require('../portable-baseline.cjs'),path=require('path'),{fan,source}=require('../../../washer-study/qa/observation-harness.cjs');
const outputDir=process.env.OUTPUT_DIR||path.join(__dirname,'guard-regression');fs.mkdirSync(outputDir,{recursive:true});
let s=(process.env.FAN_REV?cp.execFileSync('git',['-C',path.resolve(__dirname,'../..'),'show',process.env.FAN_REV+':dist/fan.js'],{encoding:'utf8'}):process.env.FAN_SOURCE?fs.readFileSync(process.env.FAN_SOURCE,'utf8'):source('fan-study/dist/fan.js')).replace('// Back grille:','const rearAuditStart=e.parts.length;\n // Back grille:').replace('// Broad, curved blades.',"observeFrom(rearAuditStart,'fan-rear-guard');\n // Broad, curved blades.").replace('// Double rolled rim;', 'const frontAuditStart=e.parts.length;\n // Double rolled rim;').replace('// Cage clamps.',"observeFrom(frontAuditStart,'fan-front-guard');\n // Cage clamps.");
const h=fan(s);h.run('const originalAdd=engine.add;engine.add=function(pts,...args){originalAdd.call(this,pts,...args);Object.assign(this.parts[this.parts.length-1],{points:pts,fill:args[0]??"none",stroke:args[1]??"#231e16",width:args[2]??1.6,closed:args[3]??true});}');
for(const [name,yaw,pitch,angle,headYaw]of[['default',-.4,.19,2*Math.PI/9,0],['front45',.7854,.19,2*Math.PI/9,0],['front45-high',.7854,.8,2*Math.PI/9,0],['rear135',2.3562,.19,2*Math.PI/9,0],['rear180',Math.PI,.19,2*Math.PI/9,0],['side75',1.309,.19,2*Math.PI/9,0],['swing',-.4,.19,2*Math.PI/9,.65]]){
 h.run(`engine.yaw=${yaw};engine.pitch=${pitch};state.angle=${angle};state.headYaw=${headYaw};render()`);
 const p=`${outputDir}/guards-${name}`;
 fs.writeFileSync(p+'.json',JSON.stringify(h.run('engine.parts.map(p=>({...p,screen:p.points?.map(q=>[...engine.project(q),engine.depth(q)])}))')));
 fs.writeFileSync(p+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 760" width="800" height="760"><rect width="800" height="760" fill="#faf8f2"/>${h.ids.art.innerHTML}</svg>`);
}
