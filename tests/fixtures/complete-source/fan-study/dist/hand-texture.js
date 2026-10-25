/* Same ink wobble, grain and pigment blotch as the collection's washer.
   Turbulence is rasterized once before the filter is attached to animated art. */
(() => {
 const svg=document.querySelector('#figure'),art=document.querySelector('#art'),defs=document.querySelector('#fan-defs');
 const NS='http://www.w3.org/2000/svg',k=800/585;
 defs.innerHTML=`<filter id="hand" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="-80" y="-76" width="960" height="912" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${.045/k}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="${2.4*k}" xChannelSelector="R" yChannelSelector="G" result="wob"/>
  <feTurbulence type="fractalNoise" baseFrequency="${.9/k}" numOctaves="3" seed="11" result="n1"/>
  <feColorMatrix in="n1" type="matrix" values=".3 0 0 0 .84 .3 0 0 0 .84 .3 0 0 0 .84 0 0 0 0 1" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${.012/k}" numOctaves="2" seed="7" result="n2"/>
  <feColorMatrix in="n2" type="matrix" values=".3 0 0 0 .85 .3 0 0 0 .85 .3 0 0 0 .85 0 0 0 0 1" result="blot"/>
  <feBlend in="wob" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/><feComposite in="g2" in2="wob" operator="in"/>
 </filter>`;
 const filter=defs.querySelector('#hand');
 const bake=async node=>{
  const frequency=+node.getAttribute('baseFrequency'),octaves=+node.getAttribute('numOctaves');
  const fine=frequency*1360>80;
  const x=fine?0:-280,y=fine?0:-266,w=fine?48/frequency:1360,h=fine?48/frequency:1292;
  const pixelsPerUnit=frequency*(fine?7:5)*2**((octaves-1)*.5),width=Math.ceil(w*pixelsPerUnit),height=Math.ceil(h*pixelsPerUnit);
  const noise=node.cloneNode();noise.removeAttribute('result');if(fine)noise.setAttribute('stitchTiles','stitch');
  const source=`<svg xmlns="${NS}" width="${width}" height="${height}" viewBox="${x} ${y} ${w} ${h}"><filter id="n" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}" color-interpolation-filters="sRGB">${noise.outerHTML}</filter><rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#n)"/></svg>`;
  const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source)});
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');context.drawImage(image,0,0);const pixels=context.getImageData(0,0,width,height);
  for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=255;context.putImageData(pixels,0,0);
  const cached=document.createElementNS(NS,'feImage'),result=node.getAttribute('result');
  for(const [key,value] of Object.entries({x,y,width:w,height:h,preserveAspectRatio:'none',href:canvas.toDataURL('image/png'),result:fine?result+'_tile':result}))cached.setAttribute(key,value);
  if(fine){const tile=document.createElementNS(NS,'feTile');tile.setAttribute('in',result+'_tile');tile.setAttribute('result',result);node.replaceWith(cached,tile)}else node.replaceWith(cached);
 };
 Promise.all([...filter.querySelectorAll('feTurbulence')].map(bake)).then(()=>{
  art.setAttribute('filter','url(#hand)');svg.dataset.texture='ready';
 }).catch(()=>{
  // Never leave costly live turbulence attached to a continuously animated figure.
  art.removeAttribute('filter');svg.dataset.texture='unavailable';
 });
})();
