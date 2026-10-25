import json,os,numpy as np
from pathlib import Path
from PIL import Image,ImageDraw
D=Path(os.environ.get('OUTPUT_DIR',Path(__file__).parent/'guard-regression'));allresults=[]
for f in D.glob('guards-*.json'):
 parts=json.loads(f.read_text());h,w=760,800
 nearest=np.full((h,w),-1e20);nearid=np.full((h,w),-1);paintid=np.full((h,w),-1);coeffs={}
 for i,p in enumerate(parts):
  if not p.get('screen') or p['fill']=='none':continue
  a=np.array(p['screen']);x0=max(0,int(np.floor(a[:,0].min())));x1=min(w,int(np.ceil(a[:,0].max()))+1);y0=max(0,int(np.floor(a[:,1].min())));y1=min(h,int(np.ceil(a[:,1].max()))+1)
  if x1<=x0 or y1<=y0:continue
  co,res,rank,s=np.linalg.lstsq(np.column_stack((a[:,:2],np.ones(len(a)))),a[:,2],rcond=None)
  if rank<3:continue
  coeffs[i]=co;m=Image.new('1',(x1-x0,y1-y0));ImageDraw.Draw(m).polygon([(x-x0,y-y0) for x,y,z in a],fill=1);mask=np.array(m)
  yy,xx=np.mgrid[y0:y1,x0:x1];depth=co[0]*xx+co[1]*yy+co[2]
  if p['depth']==-1e6:depth.fill(-1e6)
  winner=mask&(depth>nearest[y0:y1,x0:x1]);nearest[y0:y1,x0:x1][winner]=depth[winner];nearid[y0:y1,x0:x1][winner]=i;paintid[y0:y1,x0:x1][mask]=i
 issues=[]
 for i,p in enumerate(parts):
  if not any(n in p['svg'] for n in ['fan-rear-guard','fan-front-guard']):continue
  points=np.array(p['screen'])
  for a,b in zip(points[:-1],points[1:]):
   length=np.linalg.norm(b[:2]-a[:2]);samples=[]
   for t in np.linspace(.05,.95,max(2,int(length*2))):
    x,y,z=a+(b-a)*t;ix,iy=round(x),round(y)
    if not 3<=ix<w-3 or not 3<=iy<h-3:continue
    ni=nearid[iy,ix]
    if ni<0 or 'fan-blades' not in parts[ni]['svg'] or parts[ni].get('fill')=='none':continue
    if np.any(nearid[iy-2:iy+3,ix-2:ix+3]!=ni):continue
    co=coeffs[ni];trueDepth=co[0]*x+co[1]*y+co[2];delta=z-trueDepth
    error='shows-through-blade' if delta < -1 and i>ni else 'hidden-by-blade' if delta>1 and i<ni else None
    if error:samples.append({'xy':[float(x),float(y)],'depthDelta':float(delta),'error':error,'stroke':i,'blade':int(ni)})
   if samples:issues.append({'guard':'rear' if 'fan-rear-guard' in p['svg'] else 'front','lengthPixelsApprox':len(samples)/2,'samples':samples})
 out={'file':f.name,'segments':issues,'lengthPixelsApprox':sum(a['lengthPixelsApprox'] for a in issues)};allresults.append(out)
 print(f.name,round(out['lengthPixelsApprox'],1),[(a['guard'],round(a['lengthPixelsApprox'],1),a['samples'][0]['error']) for a in issues])
(D/'guard-mismatch-results.json').write_text(json.dumps(allresults,indent=2))

assert len(allresults)==7, "Run capture-guards.cjs first; expected seven generated cases."
if not os.environ.get("ALLOW_ERRORS"):
 assert not any(x["lengthPixelsApprox"] for x in allresults), "A front/back guard span crosses the blade in the wrong paint order."
