'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { source, dist } = require('./source.cjs');

// Frozen SHA-256 values for the five distribution product files. Deliberately no
// Git access or historical geometry fixture: this verifies exact bytes only.
const approved = {
  'app.js': '580fcd57654a8a22b10824653aa56f62528b7961e7f28584154cd5119f8ce7ba',
  'index.html': 'f99b0b3c298db287ff7ad8036c6aac00df610bde7f97e4ff7f239158ccd8fb2c',
  'mechanical-audio.js': '7a51add0b8a4c787c605afef4b9c4ed04ba913b64cb64439924850cd23d42aa3',
  'observation.js': '9761c10cea96cc8a0f6e4b293943a62b3f179c574377ef9d49c9f3c7192d8733',
  'shared-shell.css': 'a73eac159b4fba27ae7deb02a126b95d9a0b3e17c531b96df08781f47d3db771'
};
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.deepEqual(fs.readdirSync(dist).sort(), Object.keys(approved).sort(), 'Five complete production files');
const license = path.resolve(dist, '../../licenses/Colorfigures-LICENSE.txt');
assert.equal(sha256(fs.readFileSync(license)), 'bc54cadb579906c051d7aad84f41f88c0df6c50089e052134226fe0b76fd5280', 'Preserved root upstream MIT license');
for (const [file, hash] of Object.entries(approved)) {
  assert.equal(sha256(fs.readFileSync(path.join(dist, file))), hash, file + ' approved bytes');
}
console.log('PASS five product files match the fixed approved SHA-256 values');

const html = source('index.html');
const resources = [...html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]+)"/g)];
assert.equal(resources.length, 4, 'Four local versioned production resources');
for (const [, file, hash] of resources) {
  assert(Object.hasOwn(approved, file), 'Known local resource: ' + file);
  assert.equal(sha256(fs.readFileSync(path.join(dist, file))).slice(0, 12), hash, file + ' cache token');
}
console.log('PASS all four local resource cache tokens match their contents');

for (const file of Object.keys(approved).filter(file => file.endsWith('.js'))) {
  new vm.Script(source(file), { filename: file });
}
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert(inline.length > 0, 'Shared production core is present');
inline.forEach((match, i) => new vm.Script(match[1], { filename: `index-inline-${i}.js` }));
console.log('PASS all production JavaScript and inline core scripts parse');
console.log('INTEGRITY: 3 passed, 0 failed');
