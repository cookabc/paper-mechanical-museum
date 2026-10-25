'use strict';
const fs=require('fs'),path=require('path'),{performance}=require('perf_hooks'),{factory}=require('./harness.cjs');
const scenarios=[['musicbox','crank-open'],['musicbox','lid-moving'],['musicbox','orbit'],['turntable','arm-motion'],['camera','ejecting'],['camera','idle']];
const out={method:'Matched, interleaved baseline/candidate SVG generation in Node VM. 40 warmup frames per version; seven 40-frame rounds in alternating order. No browser DOM, paint or native audio timing.',scenarios:{}};
for(const[id,name]of scenarios){const hs=[factory(true)(id),factory()(id)],frames=40,times=[[],[]];
 const render=(h,i)=>{if(id==='musicbox'){h.s.angle=i*.1;h.s.lid=name==='lid-moving'?(i%frames)/(frames-1):1;}if(id==='turntable'){h.s.arm=(i%frames)/(frames-1);h.s.lift=1.65;}if(id==='camera'){h.s.phase=name==='ejecting'?'ejecting':'idle';h.s.eject=name==='ejecting'?(i%frames)/(frames-1):0;}return h.render(name==='orbit'?i*9:45,35)};
 for(const h of hs)for(let i=0;i<frames;i++)render(h,i);for(let r=0;r<7;r++)for(const which of(r%2?[1,0]:[0,1])){const t=performance.now();for(let i=0;i<frames;i++)render(hs[which],i);times[which].push((performance.now()-t)/frames)}
 const stats=times.map(a=>{const s=a.slice().sort((a,b)=>a-b);return{medianMs:s[3],minMs:s[0],maxMs:s[6],roundsMs:a}});out.scenarios[id+'/'+name]={before:stats[0],after:stats[1],ratio:stats[1].medianMs/stats[0].medianMs};}
fs.writeFileSync(path.join(__dirname,'benchmark.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
