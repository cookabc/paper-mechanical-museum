'use strict';
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const WIDTH = 600, HEIGHT = 500;
const median = xs => {const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0;};
function difference(a, b) {
  let sum = 0, changed = 0;
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    sum += d; if (d > 36) changed++;
  }
  return {meanAbsoluteRGB: sum / a.length, changedPixelFraction: changed / (a.length / 3)};
}
async function writeSequence(out, name, view, times, snapshots, viewIndex) {
  const dir = path.join(out, name, `${view.yaw}-${view.pitch}`); fs.mkdirSync(dir, {recursive: true});
  let previous; const deltas = [], thumbnails = [];
  for (const [i, t] of times.entries()) {
    const svg = snapshots.get(t).svg[viewIndex], stem = t.toFixed(3);
    fs.writeFileSync(path.join(dir, stem + '.svg'), svg);
    const raster = sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).flatten({background: '#f2efe7'}).removeAlpha();
    const bytes = await raster.clone().raw().toBuffer();
    await raster.clone().png().toFile(path.join(dir, stem + '.png'));
    if (previous) deltas.push({from: times[i - 1], to: t, ...difference(previous, bytes)});
    previous = bytes;
    const label = Buffer.from(`<svg width="300" height="22"><rect width="300" height="22" fill="#f2efe7"/><text x="8" y="16" font-size="12" font-family="sans-serif">${name}: t=${stem}s / ${view.yaw},${view.pitch}</text></svg>`);
    thumbnails.push({input: await raster.clone().resize(300, 250).png().toBuffer(), left: (i % 4) * 300, top: Math.floor(i / 4) * 272 + 22});
    thumbnails.push({input: label, left: (i % 4) * 300, top: Math.floor(i / 4) * 272});
  }
  const scale = median(deltas.map(d => d.meanAbsoluteRGB).filter(d => d > .001));
  for (const d of deltas) {d.relativeToMedian = scale ? d.meanAbsoluteRGB / scale : 0; d.suspect = d.relativeToMedian > 3 && d.changedPixelFraction > .002;}
  await sharp({create: {width: 1200, height: Math.ceil(times.length / 4) * 272, channels: 3, background: '#f2efe7'}}).composite(thumbnails).png().toFile(path.join(dir, 'contact.png'));
  return {view, path: path.relative(out, dir), positiveDeltaMedian: scale, deltas, suspects: deltas.filter(d => d.suspect)};
}
function writeGallery(out, report) {
  const sections = report.scenarios.map(s => `<section><h2>${s.name}</h2>${s.raster.map(r => `<h3>${r.view.yaw}° / ${r.view.pitch}°</h3><p>${r.suspects.length} flagged interval(s), not automatic defects.</p><a href="${r.path}/contact.png"><img src="${r.path}/contact.png" alt="${s.name} sequential frames"></a>`).join('')}</section>`).join('');
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Deterministic motion audit</title><style>body{font:16px system-ui;max-width:1200px;margin:32px auto;background:#f2efe7;color:#23251f}img{width:100%;height:auto}section{margin:40px 0}p{max-width:75ch}</style><h1>Deterministic motion audit</h1><p>Offline production-action replay, 600 Hz clock, 0.1 s samples. Every timestamp is independently recreated in shuffled order. A pixel-change ratio above 3 is only a review flag, not a detected defect. Source, states, contact readings and every interval are in report.json.</p>${sections}</html>`);
}
module.exports = {writeSequence, writeGallery};
