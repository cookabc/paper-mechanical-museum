// Layout is measured in SVG coordinates, but type and spacing stay legible in
// CSS pixels. The machine's projection and viewBox are never changed here.
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const transformRect=(r,m)=>{
 const points=[[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]].map(([x,y])=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f]);
 return {left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))};
};

export function measureCalloutFrame(svg,obstacles=[]){
 const vb=svg.viewBox.baseVal,rect=svg.getBoundingClientRect(),ctm=svg.getScreenCTM?.();
 const fallback={frame:{left:vb.x,right:vb.x+vb.width,top:vb.y,bottom:vb.y+vb.height},scale:1,obstacles:[]};
 if(!ctm||!rect.width||!rect.height)return fallback;
 const scale=Math.hypot(ctm.a,ctm.b);if(!Number.isFinite(scale)||scale<=0)return fallback;
 const inverse=ctm.inverse();
 // A dock can move arbitrarily far down when a lesson opens. It is not a scene
 // obstacle unless its *visible rectangle* actually intersects this SVG.
 const localObstacles=obstacles.filter(Boolean).map(node=>node.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&intersects(r,rect)).map(r=>transformRect({left:Math.max(rect.left,r.left),right:Math.min(rect.right,r.right),top:Math.max(rect.top,r.top),bottom:Math.min(rect.bottom,r.bottom)},inverse));
 return {frame:transformRect(rect,inverse),scale,obstacles:localObstacles};
}

function packColumn(items,x,width,height,gap,frame,obstacles,padding){
 if(!items.length)return [];
 let ranges=[[frame.top+padding+height/2,frame.bottom-padding-height/2]];
 for(const obstacle of obstacles){
  if(obstacle.right<=x-width/2-padding||obstacle.left>=x+width/2+padding)continue;
  const top=obstacle.top-padding-height/2,bottom=obstacle.bottom+padding+height/2;
  ranges=ranges.flatMap(([a,b])=>bottom<=a||top>=b?[[a,b]]:[[a,Math.min(b,top)],[Math.max(a,bottom),b]].filter(([lo,hi])=>hi>=lo));
 }
 const sorted=[...items].sort((a,b)=>a.Y-b.Y),span=(items.length-1)*gap;
 let best=null,cost=Infinity;
 for(const [top,bottom] of ranges){
  if(bottom-top<span)continue;
  const ys=[];for(const item of sorted)ys.push(Math.max(top,item.Y,ys.length?ys.at(-1)+gap:top));
  ys[ys.length-1]=Math.min(ys.at(-1),bottom);
  for(let i=ys.length-2;i>=0;i--)ys[i]=Math.min(ys[i],ys[i+1]-gap);
  const score=ys.reduce((sum,y,i)=>sum+(y-sorted[i].Y)**2,0);
  if(score<cost){cost=score;best=sorted.map((item,i)=>({...item,px:x,py:ys[i],width,height}));}
 }
 return best;
}

/** @param {{frame:{left:number,right:number,top:number,bottom:number},scale?:number,obstacles?:Array<{left:number,right:number,top:number,bottom:number}>,body:{left:number,right:number}}} options */
export function layoutWasherCallouts(items,options){
 const {frame,scale=1,obstacles=[],body}=options;
 const fontSize=13/scale,height=24/scale,padding=8/scale,gap=29/scale,leaderGap=8/scale;
 const named=items.map((item,i)=>({...item,number:i+1}));
 const widthFor=text=>[...text].reduce((n,c)=>n+(c.charCodeAt(0)>127?1.04:.66),0)*fontSize+20/scale;
 const byX=[...named].sort((a,b)=>a.X-b.X);
 for(const numbered of [false,true]){
  const width=numbered?24/scale:Math.max(0,...named.map(item=>widthFor(item.text)));
  const left=numbered?frame.left+padding+width/2:body.left-leaderGap-width/2;
  const right=numbered?frame.right-padding-width/2:body.right+leaderGap+width/2;
  const epsilon=1e-8; // CTM division can round a mathematically flush edge outward.
  const fitsLeft=left-width/2>=frame.left+padding-epsilon&&left+width/2<=frame.right-padding+epsilon;
  const fitsRight=right-width/2>=frame.left+padding-epsilon&&right+width/2<=frame.right-padding+epsilon;
  if(numbered&&right-left<width+padding)continue;
  let best=null,cost=Infinity;
  for(let split=0;split<=named.length;split++){
   if(split&&!fitsLeft||split<named.length&&!fitsRight)continue;
   const L=packColumn(byX.slice(0,split),left,width,height,gap,frame,obstacles,padding);
   const R=packColumn(byX.slice(split),right,width,height,gap,frame,obstacles,padding);
   if(!L||!R)continue;
   const labels=[...L.map(item=>({...item,side:-1})),...R.map(item=>({...item,side:1}))];
   const score=labels.reduce((sum,item)=>sum+(item.px-item.X)**2+(item.py-item.Y)**2,0);
   if(score<cost){cost=score;best=labels;}
  }
  if(best)return {mode:numbered?'numbered':'names',fontSize,labels:best,items:named};
 }
 // An exceptionally small/obscured scene must not hide or shrink the names.
 // Keep the complete HTML list available instead of drawing clipped markers.
 return {mode:'list',fontSize,labels:[],items:named};
}
