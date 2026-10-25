'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dist = path.resolve(__dirname, '../dist');

function source(file) {
  return fs.readFileSync(path.join(dist, file), 'utf8');
}

// Fail visibly if source structure changes. These helpers extract, but never
// rewrite, production functions; there is no copied controller implementation.
function section(text, start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert(from >= 0 && to > from, `Missing source section: ${start} ... ${end}`);
  return text.slice(from, to);
}

function declaration(text, start) {
  const from = text.indexOf(start);
  assert(from >= 0, `Missing production declaration: ${start}`);
  const to = text.indexOf('\n', from);
  return text.slice(from, to < 0 ? undefined : to);
}

module.exports = { source, section, declaration, dist };
