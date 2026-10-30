import {localizeMarkup} from '../../shared/message-language.ts';
/* Same ink wobble, grain and pigment blotch as the collection's washer.
   Turbulence is rasterized once before the filter is attached to animated art. */
let textureSerial=0;

/** Preserve the original once-baked SVG texture, with cancel-safe scene ownership. */
export function installFanTexture({root,scope}) {
 const doc=root.ownerDocument,win=doc.defaultView;
 const filterId=`fan-hand-${++textureSerial}`;
 let disposed=false;
 const pending=new Map();
 const dispose=()=>{
  if(disposed)return;disposed=true;
  for(const [image,cancel] of pending){image.onload=null;image.onerror=null;image.src='';cancel();}
  pending.clear();
 };
 scope.onCleanup(dispose);
 const svg=root.querySelector('#figure'),art=root.querySelector('#art'),defs=root.querySelector('#fan-defs');
 const NS='http://www.w3.org/2000/svg',k=800/585;
 defs.innerHTML=localizeMarkup(`<filter id="${filterId}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="-80" y="-76" width="960" height="912" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${.045/k}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="${2.4*k}" xChannelSelector="R" yChannelSelector="G" result="wob"/>
  <feTurbulence type="fractalNoise" baseFrequency="${.9/k}" numOctaves="3" seed="11" result="n1"/>
  <feColorMatrix in="n1" type="matrix" values=".3 0 0 0 .84 .3 0 0 0 .84 .3 0 0 0 .84 0 0 0 0 1" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${.012/k}" numOctaves="2" seed="7" result="n2"/>
  <feColorMatrix in="n2" type="matrix" values=".3 0 0 0 .85 .3 0 0 0 .85 .3 0 0 0 .85 0 0 0 0 1" result="blot"/>
  <feBlend in="wob" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/><feComposite in="g2" in2="wob" operator="in"/>
 </filter>`);
 const filter=defs.querySelector(`#${filterId}`);
 const bake=async node=>{
  const frequency=+node.getAttribute('baseFrequency'),octaves=+node.getAttribute('numOctaves');
  const fine=frequency*1360>80;
  const x=fine?0:-280,y=fine?0:-266,w=fine?48/frequency:1360,h=fine?48/frequency:1292;
  const pixelsPerUnit=frequency*(fine?7:5)*2**((octaves-1)*.5),width=Math.ceil(w*pixelsPerUnit),height=Math.ceil(h*pixelsPerUnit);
  const noise=node.cloneNode();noise.removeAttribute('result');if(fine)noise.setAttribute('stitchTiles','stitch');
  const source=`<svg xmlns="${NS}" width="${width}" height="${height}" viewBox="${x} ${y} ${w} ${h}"><filter id="n" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}" color-interpolation-filters="sRGB">${noise.outerHTML}</filter><rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#n)"/></svg>`;
  const image=new win.Image();await new Promise((resolve,reject)=>{
   const finish=(callback,value)=>{pending.delete(image);image.onload=null;image.onerror=null;callback(value)};
   pending.set(image,()=>reject(new Error('Fan texture mount disposed')));
   image.onload=()=>finish(resolve);image.onerror=event=>finish(reject,event);
   image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);
  });
  if(disposed)return;
  const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');context.drawImage(image,0,0);const pixels=context.getImageData(0,0,width,height);
  for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=255;context.putImageData(pixels,0,0);
  const cached=doc.createElementNS(NS,'feImage'),result=node.getAttribute('result');
  for(const [key,value] of Object.entries({x,y,width:w,height:h,preserveAspectRatio:'none',href:canvas.toDataURL('image/png'),result:fine?result+'_tile':result}))cached.setAttribute(key,value);
  if(fine){const tile=doc.createElementNS(NS,'feTile');tile.setAttribute('in',result+'_tile');tile.setAttribute('result',result);node.replaceWith(cached,tile)}else node.replaceWith(cached);
 };
 const ready=Promise.all([...filter.querySelectorAll('feTurbulence')].map(bake)).then(()=>{
  if(disposed)return;
  art.setAttribute('filter',`url(#${filterId})`);svg.dataset.texture='ready';
 }).catch(()=>{
  if(disposed)return;
  // Never leave costly live turbulence attached to a continuously animated figure.
  art.removeAttribute('filter');svg.dataset.texture='unavailable';
 });
 return {ready,dispose};
}
