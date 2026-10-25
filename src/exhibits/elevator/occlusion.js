// Orthographic visibility masks retain the original equations and per-model caches.
export function createElevatorOcclusion(geometry){

  'use strict';
  const EPS=1e-7, DEPTH_EPS=1e-5;
  let solids=[], compiled=new WeakMap(), geometryCache=new Map(), rodCache=new Map(), boxCache=new Map(), projectionKey="", faceSerial=0;
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n)};
  const signedArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0]},0)/2;
  const bounds=p=>[Math.min(...p.map(a=>a[0])),Math.min(...p.map(a=>a[1])),Math.max(...p.map(a=>a[0])),Math.max(...p.map(a=>a[1]))];
  const overlaps=(a,b,pad=0)=>a[0]<=b[2]+pad&&a[2]+pad>=b[0]&&a[1]<=b[3]+pad&&a[3]+pad>=b[1];
  function boxFaces(x,y,z,X,Y,Z){
    if(X<=x||Y<=y||Z<=z)return [];
    const cacheKey=[x,y,z,X,Y,Z].join(',');if(boxCache.has(cacheKey))return boxCache.get(cacheKey);
    const faces=[
      [[0,1,0],[[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]]],
      [[1,0,0],[[X,y,z],[X,Y,z],[X,Y,Z],[X,y,Z]]],
      [[0,-1,0],[[x,y,z],[X,y,z],[X,y,Z],[x,y,Z]]],
      [[-1,0,0],[[x,y,z],[x,Y,z],[x,Y,Z],[x,y,Z]]],
      [[0,0,1],[[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]]],
      [[0,0,-1],[[x,y,z],[X,y,z],[X,Y,z],[x,Y,z]]]
    ].filter(([n])=>geometry.vis(n)).map(([,p])=>p);
    boxCache.set(cacheKey,faces);return faces;
  }
  function rodFaces(a,b,r,n=16){
    const cacheKey=a.join(',')+';'+b.join(',')+';'+r+';'+n;
    if(rodCache.has(cacheKey))return rodCache.get(cacheKey);
    if(Math.hypot(...sub(b,a))<EPS||r<=0)return [];
    const d=norm(sub(b,a)),u=norm(cross(d,Math.abs(d[2])<.9?[0,0,1]:[1,0,0])),v=cross(d,u);
    const ring=p=>Array.from({length:n},(_,i)=>{const t=i/n*2*Math.PI;return p.map((x,j)=>x+r*(u[j]*Math.cos(t)+v[j]*Math.sin(t)))});
    const A=ring(a),B=ring(b),faces=[];
    for(let i=0;i<n;i++){
      const j=(i+1)%n,normal=norm(sub(A[i].map((x,k)=>(x+A[j][k])/2),a));
      if(geometry.vis(normal))faces.push([A[i],A[j],B[j],B[i]]);
    }
    faces.push(geometry.vis(d)?B:A);rodCache.set(cacheKey,faces);return faces;
  }
  function projectFace(points){
    const p=points.map(q=>geometry.P(...q)),d=points.map(geometry.depthOf);let plane=null;
    for(let i=1;i<p.length-1&&!plane;i++){
      const a=sub(p[i],p[0]),b=sub(p[i+1],p[0]),det=a[0]*b[1]-a[1]*b[0];
      if(Math.abs(det)<EPS)continue;
      const da=d[i]-d[0],db=d[i+1]-d[0],x=(da*b[1]-db*a[1])/det,y=(a[0]*db-b[0]*da)/det;
      plane=[x,y,d[0]-x*p[0][0]-y*p[0][1]];
    }
    if(!plane||Math.abs(signedArea(p))<EPS)return null;
    if(signedArea(p)<0)p.reverse();
    return {id:++faceSerial,p,plane,bounds:bounds(p),points,minDepth:Math.min(...d),maxDepth:Math.max(...d)};
  }
  const depth=(f,p)=>f.plane[0]*p[0]+f.plane[1]*p[1]+f.plane[2];
  // Clip a convex polygon to an affine half-plane value(point)>=0.
  function halfClip(poly,value){
    if(!poly.length)return [];
    const out=[];let a=poly[poly.length-1],va=value(a);
    for(const b of poly){const vb=value(b),ia=va>=-EPS,ib=vb>=-EPS;
      if(ia!==ib){const t=va/(va-vb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
      if(ib)out.push(b);a=b;va=vb;
    }return out;
  }
  const pointKey=p=>p.map(x=>Math.round(x*1e7)).join(',');
  const edgeKey=(a,b)=>{const x=pointKey(a),y=pointKey(b);return x<y?x+'|'+y:y+'|'+x};
  function edgeCounts(faces){const edges=new Map();for(const f of faces)for(let i=0;i<f.p.length;i++){const k=edgeKey(f.p[i],f.p[(i+1)%f.p.length]);edges.set(k,(edges.get(k)||0)+1)}return edges}
  function prepared(s){
    if(compiled.has(s))return compiled.get(s);
    const isBox=Array.isArray(s)&&s.length===6&&typeof s[0]==='number';
    const cacheKey=isBox?'b:'+s.join(','):null;
    if(cacheKey&&geometryCache.has(cacheKey)){const hit=geometryCache.get(cacheKey);compiled.set(s,hit);return hit;}
    const raw=isBox?boxFaces(...s):s.faces||s;
    if(compiled.has(raw)){const hit=compiled.get(raw);compiled.set(s,hit);return hit;}
    const out=raw.map(projectFace).filter(Boolean);
    const all=out.flatMap(f=>f.p);out.bounds=all.length?bounds(all):[0,0,0,0];
    out.maxDepth=out.length?Math.max(...out.map(f=>f.maxDepth)):-Infinity;
    compiled.set(s,out);compiled.set(raw,out);if(cacheKey)geometryCache.set(cacheKey,out);return out;
  }
  // Allocation-free fast classification: unchanged polygons are returned as-is.
  function affineClip(poly,A,B,C){
    let pos=0,neg=0;
    for(let i=0;i<poly.length;i++){const p=poly[i];if(A*p[0]+B*p[1]+C>=-EPS)pos++;else neg++;}
    if(!neg)return poly;if(!pos)return [];
    const out=[];let a=poly[poly.length-1],va=A*a[0]+B*a[1]+C;
    for(let i=0;i<poly.length;i++){
      const b=poly[i],vb=A*b[0]+B*b[1]+C,ia=va>=-EPS,ib=vb>=-EPS;
      if(ia!==ib){const t=va/(va-vb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
      if(ib)out.push(b);a=b;va=vb;
    }return out;
  }
  function hiddenPolygons(key,targetFaces,list=solids,options={}){
    const target=prepared(targetFaces),edges=target.edgeCounts||(target.edgeCounts=edgeCounts(target)),hidden=[];
    const pad=options.padding??(.065+.5*(typeof geometry.INK_K==='number'?geometry.INK_K:1));
    for(const t of target){
      if(t.clipPadding===pad)continue;
      t.clipPadding=pad;t.pairs=new Map();t.clipEdges=[];
      for(let i=0;i<t.p.length;i++){
        const a=t.p[i],b=t.p[(i+1)%t.p.length],dx=b[0]-a[0],dy=b[1]-a[1];
        const margin=edges.get(edgeKey(a,b))===1?pad*Math.hypot(dx,dy):0;
        t.clipEdges.push([-dy,dx,dy*a[0]-dx*a[1]+margin]);
      }
      const expanded=[];
      for(let i=0;i<t.clipEdges.length;i++){
        const a=t.clipEdges[i],b=t.clipEdges[(i+1)%t.clipEdges.length],det=a[0]*b[1]-a[1]*b[0];
        if(Math.abs(det)>EPS)expanded.push([(a[1]*b[2]-a[2]*b[1])/det,(a[2]*b[0]-a[0]*b[2])/det]);
      }
      t.clipBounds=expanded.length?bounds(expanded):t.bounds;
      const b=t.clipBounds;t.domain=[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]];
      for(const e of t.clipEdges)t.domain=affineClip(t.domain,e[0],e[1],e[2]);
    }
    const candidates=[];
    for(const s of list){if(s.key!=null&&s.key===key)continue;
      const sf=prepared(s);if(overlaps(target.bounds,sf.bounds,pad))candidates.push(...sf);
    }
    let covered=0;
    for(const t of target){let fragments=[];
      for(const occluder of candidates){
        if(!overlaps(t.bounds,occluder.bounds,pad))continue;
        if(t.pairs.has(occluder.id)){
          const hit=t.pairs.get(occluder.id);
          if(hit===true){fragments=[t.domain];covered++;break;}
          if(hit)fragments.push(hit);continue;
        }
        if(t.pairs.size>2048)t.pairs.clear();t.pairs.set(occluder.id,null);
        const A=occluder.plane[0]-t.plane[0],B=occluder.plane[1]-t.plane[1],C=occluder.plane[2]-t.plane[2]-DEPTH_EPS;
        const tb=t.clipBounds,ob=occluder.bounds;
        const x0=Math.max(tb[0],ob[0]),x1=Math.min(tb[2],ob[2]),y0=Math.max(tb[1],ob[1]),y1=Math.min(tb[3],ob[3]);
        if(A*(A>=0?x1:x0)+B*(B>=0?y1:y0)+C < -EPS)continue;
        // A single nearer face can cover a small detail completely. Replace
        // any accumulated overlaps with its exact target domain, not dozens
        // of redundant polygons; this is especially common behind the shaft.
        if(ob[0]<=tb[0]+EPS&&ob[1]<=tb[1]+EPS&&ob[2]>=tb[2]-EPS&&ob[3]>=tb[3]-EPS){
          let full=t.domain.length>2;
          for(const q of t.domain){
            if(A*q[0]+B*q[1]+C < -EPS){full=false;break;}
            for(let i=0;i<occluder.p.length;i++){
              const a=occluder.p[i],b=occluder.p[(i+1)%occluder.p.length];
              if((b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]) < -EPS){full=false;break;}
            }
            if(!full)break;
          }
          if(full){t.pairs.set(occluder.id,true);fragments=[t.domain];covered++;break;}
        }
        let p=occluder.p;
        for(const e of t.clipEdges){p=affineClip(p,e[0],e[1],e[2]);if(p.length<3)break;}
        if(p.length<3)continue;p=affineClip(p,A,B,C);
        if(p.length>=3&&Math.abs(signedArea(p))>EPS){t.pairs.set(occluder.id,p);fragments.push(p);}
      }
      hidden.push(...fragments);
    }
    hidden.fullyHidden=covered===target.length&&target.length>0;return hidden;
  }
  const num=x=>String(Math.round(x*1e4)/1e4);
  const path=p=>p.svgPath||(p.svgPath='M'+p.map(q=>num(q[0])+' '+num(q[1])).join('L')+'Z');
  const maskId=key=>'elevator-visibility-'+Array.from(String(key),c=>c.codePointAt(0).toString(16)).join('-');
  function maskPrism(key,faces,svg,list=solids,options={}){
    const hidden=hiddenPolygons(key,faces,list,options);if(!hidden.length)return svg;
    const b=prepared(faces).bounds,pad=2,id=maskId(key);
    const rect=`x="${num(b[0]-pad)}" y="${num(b[1]-pad)}" width="${num(b[2]-b[0]+pad*2)}" height="${num(b[3]-b[1]+pad*2)}"`;
    return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" ${rect} style="mask-type:luminance"><rect ${rect} fill="white"/>${hidden.fullyHidden?`<rect ${rect} fill="black"/>`:`<path d="${hidden.map(path).join('')}" fill="black" fill-rule="nonzero"/>`}</mask></defs><g mask="url(#${id})">${svg}</g>`;
  }
  function maskRod(key,a,b,r,svg,list=solids,options={}){return maskPrism(key,rodFaces(a,b,r,options.segments||16),svg,list,options)}
  function maskBox(key,b,svg,list=solids,options={}){
    // Bounds-list users need not assign a separate key to their own solid.
    const other=list.filter(s=>{const q=Array.isArray(s)?s:s.bounds;return !(q&&q.length===6&&b.every((v,i)=>v===q[i]))});
    return maskPrism(key,boxFaces(...b),svg,other,options);
  }
  // Painter ordering is based on separating planes, never a moving group's
  // centre. Two disjoint boxes have a consistent order along every shared
  // viewing ray. Only physically intersecting joints need exact local masks.
  let orderPlan=null;
  function orderBoxes(layers,include=()=>true){
    const ordered=layers.map(p=>({...p})),parts=[],slots=[];
    for(let i=0;i<ordered.length;i++){const p=ordered[i];if(!p.depthTested&&p.boxes?.length===1&&include(p)){parts.push(p);slots.push(i);}}
    const planKey=[geometry.YAW,geometry.PITCH,geometry.OX,geometry.OY,geometry.RC[0],geometry.RC[1],geometry.RCZ,geometry.INK_K].join(',')+'|'+parts.map(p=>p.key+':'+p.boxes[0].join(',')).join(';');
    if(orderPlan?.key===planKey){
      for(let i=0;i<parts.length;i++){const saved=orderPlan.render[i],p=parts[i];if(p.svg===saved.source)p.svg=saved.result;else if(orderPlan.joints[i].length){const source=p.svg;p.svg=maskPrism('structure-'+p.key,(typeof p.occlusionFaces==='function'?p.occlusionFaces():p.occlusionFaces)||boxFaces(...p.boxes[0]),source,orderPlan.joints[i]);orderPlan.render[i]={source,result:p.svg};}}
      slots.forEach((slot,i)=>ordered[slot]=parts[orderPlan.order[i]]);return ordered;
    }
    const projection=b=>{const h=[(b[3]-b[0])/2,(b[4]-b[1])/2,(b[5]-b[2])/2],c=geometry.P((b[0]+b[3])/2,(b[1]+b[4])/2,(b[2]+b[5])/2),rx=geometry.K3*(Math.abs(geometry.CR[0])*h[0]+Math.abs(geometry.CR[1])*h[1]+Math.abs(geometry.CR[2])*h[2]),ry=geometry.K3*(Math.abs(geometry.CD[0])*h[0]+Math.abs(geometry.CD[1])*h[1]+Math.abs(geometry.CD[2])*h[2]);return[c[0]-rx,c[1]-ry,c[0]+rx,c[1]+ry]};
    const projected=parts.map(p=>projection(p.boxes[0])),out=parts.map(()=>[]),degree=parts.map(()=>0),joints=parts.map(()=>[]);
    for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
      if(!overlaps(projected[i],projected[j]))continue;
      const a=parts[i].boxes[0],b=parts[j].boxes[0];let relation=0,conflict=false;
      for(let axis=0;axis<3;axis++){
        if(Math.abs(geometry.CV[axis])<EPS)continue;
        let r=0;if(a[axis+3]<=b[axis]+EPS)r=geometry.CV[axis]>0?1:-1;else if(b[axis+3]<=a[axis]+EPS)r=geometry.CV[axis]>0?-1:1;
        if(r){if(relation&&relation!==r)conflict=true;relation=r;}
      }
      // Opposing separation planes mean no viewing ray crosses both boxes.
      if(conflict)continue;
      if(!relation){joints[i].push(parts[j].occlusionFaces?{faces:typeof parts[j].occlusionFaces==='function'?parts[j].occlusionFaces():parts[j].occlusionFaces}:b);joints[j].push(parts[i].occlusionFaces?{faces:typeof parts[i].occlusionFaces==='function'?parts[i].occlusionFaces():parts[i].occlusionFaces}:a);continue;}
      const behind=relation>0?i:j,front=relation>0?j:i;out[behind].push(front);degree[front]++;
    }
    const result=[],used=new Uint8Array(parts.length);
    while(result.length<parts.length){let next=-1;for(let i=0;i<parts.length;i++)if(!used[i]&&!degree[i]){next=i;break;}if(next<0)break;used[next]=1;result.push(next);for(const j of out[next])degree[j]--;}
    // A future geometry change can introduce a genuine painter cycle. Resolve
    // that residual set geometrically rather than silently restoring centres.
    const residual=parts.filter((_,i)=>!used[i]).flatMap(p=>p.boxes);
    for(let i=0;i<parts.length;i++)if(!used[i]){joints[i].push(...residual.filter(b=>b!==parts[i].boxes[0]));result.push(i);}
    const render=parts.map(p=>({source:p.svg,result:p.svg}));
    for(let i=0;i<parts.length;i++)if(joints[i].length){const p=parts[i];p.svg=maskPrism('structure-'+p.key,(typeof p.occlusionFaces==='function'?p.occlusionFaces():p.occlusionFaces)||boxFaces(...p.boxes[0]),p.svg,joints[i]);render[i].result=p.svg;}
    orderPlan={key:planKey,order:result,joints,render};
    slots.forEach((slot,i)=>ordered[slot]=parts[result[i]]);return ordered;
  }
  return {
    begin(){
      solids=[];
      const next=[geometry.YAW,geometry.PITCH,geometry.OX,geometry.OY,geometry.RC[0],geometry.RC[1],geometry.RCZ].join(',');
      if(next!==projectionKey||geometryCache.size>2048||rodCache.size>1024||boxCache.size>2048){geometryCache=new Map();rodCache=new Map();boxCache=new Map();compiled=new WeakMap();projectionKey=next;}
      return this;
    },
    get solids(){return solids},
    boxFaces,rodFaces,maskRod,maskBox,maskPrism,hiddenPolygons,orderBoxes,
    addSolid(key,faces){const s={key,faces};const i=solids.findIndex(p=>p.key===key);if(i<0)solids.push(s);else solids[i]=s;return s}
  };

}
