/* Small, independent orthographic illustration engine. Scene code supplies geometry and state. */
window.Paper3D=class {
 constructor(){this.yaw=-.40;this.pitch=.19;this.scale=2.2;this.origin=[400,660];this.parts=[]}
 project(p){let c=Math.cos(this.yaw),s=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);return [this.origin[0]+this.scale*(p[0]*c+p[1]*s),this.origin[1]+this.scale*(p[0]*s*sp-p[1]*c*sp-p[2]*cp)]}
 depth(p){return p[0]*Math.sin(this.yaw)*Math.cos(this.pitch)-p[1]*Math.cos(this.yaw)*Math.cos(this.pitch)+p[2]*Math.sin(this.pitch)}
 path(pts,closed=true){return pts.map((p,i)=>{let q=this.project(p);return(i?'L':'M')+q.map(v=>v.toFixed(2)).join(',')}).join('')+(closed?'Z':'')}
 add(pts,fill='none',stroke='#231e16',width=1.6,closed=true,opacity=1){this.parts.push({depth:pts.reduce((s,p)=>s+this.depth(p),0)/pts.length,svg:`<path d="${this.path(pts,closed)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" opacity="${opacity}"/>`})}
 line(p,color='#231e16',w=1.4,opacity=1){this.add(p,'none',color,w,false,opacity)}
 ring(center,r,plane='xz',n=64){return Array.from({length:n+1},(_,i)=>{let a=i/n*Math.PI*2;return plane==='xz'?[center[0]+r*Math.cos(a),center[1],center[2]+r*Math.sin(a)]:[center[0]+r*Math.cos(a),center[1]+r*Math.sin(a),center[2]]})}
 mesh(a,b,colors,caps=true){for(let i=0;i<a.length;i++){let j=(i+1)%a.length;this.add([a[i],a[j],b[j],b[i]],colors[Math.min(colors.length-1,Math.floor(i/a.length*colors.length))],colors[Math.min(colors.length-1,Math.floor(i/a.length*colors.length))],.5)}if(caps){this.add(a,colors[0]);this.add(b,colors[1]||colors[0])}}
 output(){return this.parts.sort((a,b)=>a.depth-b.depth).map(p=>p.svg).join('')}
};
