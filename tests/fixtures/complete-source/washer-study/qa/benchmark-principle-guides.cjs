/* Local Node/JSDOM bookkeeping only, not browser frame rate or paint performance. */
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks'),make=require('./principle-dom-harness.cjs');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const measure=(fn,count)=>{for(let i=0;i<2;i++)fn();const values=[];for(let i=0;i<count;i++){const t=performance.now();fn();values.push(performance.now()-t)}return{samples:count,medianMs:+median(values).toFixed(3),minMs:+Math.min(...values).toFixed(3),maxMs:+Math.max(...values).toFixed(3)}};
const report={method:'Same Node process and deterministic DOM harness; warmup 2, render 9 samples and observer.update 50 samples, medians. Renderer fixture is identical in each mode. No layout/paint/GPU/audio and no browser FPS claim; small samples are a local cost comparison only.',sites:[]};
for(const [site,baseline]of [['washer-study','addba29'],['fan-study','307604e']]){
 const row={site,baseline,modes:[]};
 for(const mode of ['baseline-closed','candidate-closed','baseline-open','candidate-open']){
  const h=make(site,mode.startsWith('baseline')?baseline:undefined);try{
   const idleFrames=h.frames.size;h.run(site==='washer-study'?'Object.assign(ui.st,{run:true,laundry:"drum",drive:1,tau:8})':'Object.assign(state,{on:true,speed:2,velocity:8,oscillate:true,phase:.6,headYaw:.3})');h.render();if(mode==='candidate-open')h.open();else if(mode==='baseline-open')h.toggle(h.observer().panel,true);
   row.modes.push({mode,initialIdleFrames:idleFrames,nodeCount:h.d.querySelectorAll('*').length,render:measure(()=>h.render(),9),observerUpdate:measure(()=>h.observer().update(),50)});
  }finally{h.close()}
 }
 report.sites.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync(path.join(__dirname,'principle-performance-results.json'),JSON.stringify(report,null,2));
