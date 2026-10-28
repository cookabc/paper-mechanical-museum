import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalog } from '../src/app/catalog';

const root = resolve(process.cwd());
const currentDocs = ['README.md', 'CONTRIBUTING.md', 'docs/README.md', 'docs/DEVELOPMENT.md', 'THIRD_PARTY_NOTICES.md'];
const productionOrigin = 'https://paper-mechanical-museum.vercel.app';

// Deliberately check current maintenance pages, not historical records or network availability.
// These pages use inline Markdown links; ignore fenced examples, preserve code-formatted labels.
function links(markdown: string) {
 const prose = markdown.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
 return [...prose.matchAll(/!?\[([^\]\n]*)\]\(([^\s)]+)(?:\s+"[^"\n]*")?\)/g)]
  .map(([, label, href]) => ({ label: label.replace(/`/g, ''), href }));
}

describe('current repository documentation', () => {
 for (const path of currentDocs) {
  it(`${path} has existing relative link targets`, () => {
   const markdown = readFileSync(resolve(root, path), 'utf8');
   for (const { href } of links(markdown)) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) continue;
    const target = resolve(root, dirname(path), decodeURIComponent(href.split(/[?#]/)[0]));
    expect(relative(root, target).startsWith('..'), `${path}: outside repository: ${href}`).toBe(false);
    expect(existsSync(target), `${path}: missing target: ${href}`).toBe(true);
   }
  });
 }

 it('README exhibit links match catalog names, routes and order exactly', () => {
  const markdown = readFileSync(resolve(root, 'README.md'), 'utf8');
  const section = markdown.split(/^## 馆藏[ \t]*$/m)[1]?.split(/^## /m)[0];
  expect(section, 'README must have a 馆藏 section').toBeDefined();
  const entries = links((section ?? '').split('\n').filter(line => /^\|\s*\[/.test(line)).join('\n'))
   .map(({ label, href }) => ({ name: label, href }));
  expect(entries).toEqual(catalog.map(({ id, name }) => ({ name, href: `${productionOrigin}/#/${id}` })));
 });
});
