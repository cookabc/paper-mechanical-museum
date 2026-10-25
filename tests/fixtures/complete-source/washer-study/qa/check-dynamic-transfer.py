from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
import json,subprocess
root=Path(__file__).resolve().parent
# The generated raster evidence is not a test input that must be checked in.
# Rebuild it from the paired SVG fixtures emitted by audit-dynamic-transfer.cjs.
svg_files=list(root.glob('dynamic-transfer-before/*.svg'))+list(root.glob('dynamic-transfer-after/*.svg'))
assert svg_files, 'Run node washer-study/qa/audit-dynamic-transfer.cjs first.'
stale=[p for p in svg_files if not p.with_suffix('.png').exists() or p.stat().st_mtime>p.with_suffix('.png').stat().st_mtime]
if stale:
 actions=';'.join(f'file-open:{p};export-type:png;export-width:500;export-filename:{p.with_suffix(".png")};export-do;file-close' for p in stale)
 subprocess.run(['inkscape','--batch-process',f'--actions={actions}'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
results=[]
for version in ['before','after']:
 for yaw in [38,90,218,322]:
  for direction in ['out','in']:
   for a,b,endpoint in [('0','0.001','start'),('0.4499999','0.45','first-end'),('1.9499999','1.95','last-end')]:
    x=Image.open(root/f'dynamic-transfer-{version}/{direction}-{yaw}-{a}.png').convert('RGB');y=Image.open(root/f'dynamic-transfer-{version}/{direction}-{yaw}-{b}.png').convert('RGB')
    n=sum(1 for p in ImageChops.difference(x,y).getdata() if max(p)>25)
    results.append(dict(version=version,yaw=yaw,direction=direction,endpoint=endpoint,significantChangedPixels=n))
# Endpoint continuity allowance includes antialiasing/rounding at nearly-identical positions.
assert max(x['significantChangedPixels'] for x in results if x['version']=='after')<=30, results
for yaw in [38,322]:
 for endpoint,a,b in [('drum','0','0.001'),('basket','0.4499999','0.45')]:
  # A compact, uncropped model matrix with readable evidence labels.
  im=Image.new('RGB',(1000,1020),'#faf8f2');d=ImageDraw.Draw(im)
  for r,version in enumerate(['before','after']):
   for c,t in enumerate([a,b]):
    im.paste(Image.open(root/f'dynamic-transfer-{version}/out-{yaw}-{t}.png').convert('RGB'),(c*500,r*510+25));d.text((c*500+10,r*510+8),f'{version}: {endpoint}, yaw {yaw}, T={t}',fill='black')
  im.save(root/f'dynamic-transfer-{endpoint}-{yaw}-comparison.png')
(root/'dynamic-transfer-pixel-results.json').write_text(json.dumps({'threshold':25,'maximumCandidateChangedPixels':max(x['significantChangedPixels'] for x in results if x['version']=='after'),'results':results},indent=2))
print(json.dumps(results,indent=2))
