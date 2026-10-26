import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {ResourceScope} from '../src/app/scope';
import {createColorFiguresRuntime} from '../src/engines/colorfigures/runtime.js';
import {drawing} from '../src/exhibits/bicycle/drawing';
import {initialState,REAR_TEETH} from '../src/exhibits/bicycle/model';

function render(gear=1,yaw=-25,pitch=28,turns=0){
 const root=document.createElement('section'),scope=new ResourceScope();
 const g=createColorFiguresRuntime({root,scope,audio:{},observation:{}});g.setLight(105);g.setCam(yaw,pitch);
 const state={...initialState(),gear,running:turns!==0,crankTurns:turns,wheelTurns:turns*32/REAR_TEETH[gear],chainTravel:turns*32};
 const svg=drawing(state,g);scope.dispose();return svg;
}
// Deliberately exclude only the newly abstracted floor shadow. Ordered path data
// protects all actual wheel/frame/drivetrain/support geometry and painter order;
// ink weights, material colors and the removed floating decorative text are not geometry.
const physicalGeometry=(svg:string)=>svg.replace(/<g data-line-role="shadow"[\s\S]*?<\/g><\/g>/,'');
const geometryHash=(svg:string)=>createHash('sha256').update([...physicalGeometry(svg).matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m=>m[1]).join('\n')).digest('hex');

// Recorded from unchanged production main 29c11dbee2d2689b53474e67247022413df592ae,
// before this presentation edit. The final column protects accepted PR #12 art:
// exact full SVG markup from head 1cb995, removing ONLY its inert per-part role
// wrapper tags. All paints, paths, ordering, controls and observation groups stay.
// No visual thresholds or physical baselines are relaxed by the DOM optimization.
const geometryBaselines=[
 ['default',0,-25,28,0,'283fb889fe2954823735b96b58a35c2569a9ab5cdf4211be96f49413008129db','1fae2b195ded4bd325b0edeeeee4dca3c23956535fa3524b107c0b9d7c30967e'],
 ['default',1,-25,28,0,'335edc7a315032b858f2dd8b2cb3966a3f1efabbd0262bc88dbbbfbab5d98cc7','33ff000e0be5c139e7edf77aaaba7a3af38d7395a3da6087fdf2dbaae9dbd480'],
 ['default',2,-25,28,0,'c899f1b3c86d2fb8cdb18bcac1562057b302c0a96e0962850c6ed897f2e06ad8','5d05a0120aef29ff414c4107931ca96bc074230779758dcb14328c8951484b5d'],
 ['side',0,0,18,0,'5ea12d247b50bc15fab33ba6a9911b2ea55efde224b1822b7bcc3a329e6a35a3','91b49ee5c10f0923af284355862cb8ec12c0676d1975174ca39f0997f650a898'],
 ['side',1,0,18,0,'2f4b44baa2463dbe9ac84d114de3ac1cea9e77aa39d0bae91473aae5a76693ef','eb16d132a234d5ec18ae1127e9eb9fadcf8dfad1f226fbd9f990ff93746d05f2'],
 ['side',2,0,18,0,'32dc8987d9a6271fe1bd9e01d06ed50ce0069ed9390774390278b3285a1c0378','93099f09a0aa8b406ba091454ba447b4ff2d1a2d50ec6f3f8f78f7d34448e759'],
 ['rear',0,155,28,0,'cbc1537bad60dc3e039cb6e2036af5fce73c1bfbedea412fd60a0d67939e7f69','7a3f21dbc54021492530374ea8b7efb1095b68588641d086419187c73a9ab81a'],
 ['rear',1,155,28,0,'666c1ba857dbef7398ced2b28848605c6a698ded9078b2d94f212ce6a10c7266','90fc2454f29595a53ce5153a3cf77d658c80a64c224b2820133610c5274e0b09'],
 ['rear',2,155,28,0,'fc58ecbdd24844659d79e6341ee5a4601a266c0c708c7b6f262f7f1242ac2773','c16fd8be61873142e97f7aadc07e4819093995f43b36ac2b3dc47b7b8a6789b1'],
 ['running',0,-25,28,0.29,'50fd56e7d8dd4b01db4a4831093b7ade92e62c51f86b5af84c0dca846a3af016','48cbef835b976c49de6dda3fb190458fea6d48b369fbf3668b42f17e745ab081'],
 ['running',1,-25,28,0.29,'6fadbe8a06a1bcba7921b00636dc1582cfb07c0c0c83af751fed7a6bc8a32f28','ed9e4ac75483da2f9f787005d35b4ae0cb3947486a20ec522bb3645149460ebb'],
 ['running',2,-25,28,0.29,'db500f26dd84a68c4dc69a107f5d5898113d614d63cb303949cce55a300830e7','9f2109d34849daae0499244e7434e58c03a74e708a45527f763347e92e99480b'],
] as const;

it.each(geometryBaselines)('preserves all physical paths in %s / gear %i',(_view,gear,yaw,pitch,turns,hash,acceptedPaintHash)=>{
 const svg=render(gear,yaw,pitch,turns);expect(geometryHash(svg)).toBe(hash);
 expect(createHash('sha256').update(svg).digest('hex')).toBe(acceptedPaintHash);
 expect(svg).not.toMatch(/NaN|Infinity/);
 expect(svg.match(/data-act="gear"/g)).toHaveLength(3);
 expect(svg.match(/data-act="pedal"/g)).toHaveLength(2);
 for(const teeth of [32,24,16])expect(svg).toContain(`data-teeth="${teeth}" data-cog-points="${teeth*4}"`);
 expect(svg.match(/data-teeth="10"/g)).toHaveLength(2);
});

describe('bicycle-specific ink and shadow hierarchy',()=>{
 it('keeps every actual spoke lighter than structural outlines without inflating material seams',()=>{
  const svg=render();
  const spokes=[...svg.matchAll(/<g data-observe-part="wheel">(<path [^>]*stroke-width="0\.340"[^>]*\/>)<\/g>/g)];
  expect(spokes).toHaveLength(80);
  for(const [,spoke] of spokes)expect(spoke).toContain('stroke-width="0.340"');
  expect(svg).toContain('stroke-width="1.344"');
  expect(svg).toContain('stroke-width="1.080"');
  expect(svg).not.toMatch(/data-line-role="(?:silhouette|structure|mechanism|spoke|support)"/);
  const materialSeams=[...svg.matchAll(/<path\b[^>]*fill="(#[a-f0-9]{6})" stroke="\1" stroke-width="([\d.]+)"/g)];
  expect(materialSeams.length).toBeGreaterThan(0);
  expect(new Set(materialSeams.map(m=>m[2]))).toEqual(new Set(['0.700']));
 });
 it('keeps two open directional wheel casts and exact support contacts, never a second spoke diagram',()=>{
  const svg=render(),shadow=svg.match(/<g data-line-role="shadow"[\s\S]*?<\/g><\/g>/)![0];
  // Two wheel annuli + eight major frame casts + saddle + eight support/contact casts.
  expect(shadow.match(/<path /g)).toHaveLength(19);
  const wheelCasts=[...shadow.matchAll(/<path data-shadow-part="wheel" d="([^"]+)"[^>]*>/g)];
  expect(wheelCasts).toHaveLength(2);
  for(const [path,d] of wheelCasts){expect(path).toContain('fill-rule="evenodd"');expect(d.match(/M/g)).toHaveLength(2);expect(d.match(/Z/g)).toHaveLength(2);}
  expect(shadow).toContain('data-shadow-role="contact"');
  expect(shadow).not.toMatch(/stroke=|stroke-width=|data-act=|<filter|<image/);
  expect(svg).not.toContain('>PAPER<');
 });
});
