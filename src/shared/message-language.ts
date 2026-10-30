import { detectLang, type Lang } from './i18n.ts';
import common from '../locales/common.en.json' with {type:'json'};

/** Compatibility boundary for existing renderers: translate copy, never machine state. */
const messages = new Map<string, string>();
type Pattern = { expression: RegExp; keys: string[]; value: string };
const patterns: Pattern[] = [];
let fragments: RegExp | null = null;
const cache = new Map<string, string>();
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const han = /[\p{Script=Han}]/u;

export function registerMessages(values: Readonly<Record<string, string>>) {
  for (const [key, value] of Object.entries(values)) {
    const normalized = key.trim();
    if (messages.has(normalized)) continue;
    messages.set(normalized, value);
    if (/\{\d+\}/.test(normalized)) {
      const keys: string[] = [];
      let source = '', offset = 0;
      for (const match of normalized.matchAll(/\{\d+\}/g)) {
        source += escapePattern(normalized.slice(offset, match.index)) + '([\\s\\S]*?)';
        keys.push(match[0]);offset = match.index! + match[0].length;
      }
      source += escapePattern(normalized.slice(offset));
      patterns.push({ expression: new RegExp('^' + source + '$'), keys, value });
    }
  }
  // Exact sentences win over short words; fragments handle the legacy concatenated readouts.
  fragments = null;
  cache.clear();
  patterns.sort((a, b) => b.expression.source.length - a.expression.source.length);
}
registerMessages(common);

function translateText(value: unknown, lang: Lang): string {
  const text = String(value ?? '');
  if (lang !== 'en' || !han.test(text)) return text;
  const body = text.trim(), exact = messages.get(body);
  if (exact !== undefined) return text.replace(body, () => exact);
  for (const pattern of patterns) {
    const match = pattern.expression.exec(body);
    if (!match) continue;
    const args = new Map(pattern.keys.map((key, i) => [key, localizeText(match[i + 1], lang)]));
    return text.replace(body, () => pattern.value.replace(/\{\d+\}/g, key => args.get(key) ?? key));
  }
  // Readouts sometimes append a live numeric clause to an existing paragraph.
  // Keep the known paragraph whole before translating the appended clause.
  for (const [key, value] of messages) {
    if (key.includes('。') && body.startsWith(key) && body.length > key.length && !/\{\d+\}/.test(key)) {
      return text.replace(body, () => value + ' ' + localizeText(body.slice(key.length), lang));
    }
  }
  if (!fragments) {
    const keys = [...messages.keys()].filter(key => !/\{\d+\}/.test(key)).sort((a, b) => b.length - a.length);
    fragments = new RegExp(keys.map(escapePattern).join('|'), 'g');
  }
  return text.replace(fragments, key => messages.get(key)!);
}

export function localizeText(value: unknown, lang: Lang = detectLang()): string {
  const text = String(value ?? '');
  if (lang !== 'en' || !han.test(text)) return text;
  const cached = cache.get(text);
  if (cached !== undefined) return cached;
  const result = translateText(text, lang);
  if (cache.size > 4000) cache.clear();
  cache.set(text, result);
  return result;
}

const decode = (value: string) => value.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, name: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" })[name]!);
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Keep markup and action/data attributes intact, including nested SVG and native controls. */
export function localizeMarkup(value: unknown, lang: Lang = detectLang()): string {
  const markup = String(value ?? '');
  if (lang !== 'en' || !han.test(markup)) return markup;
  return markup.replace(/(^|>)([^<>]*)(?=<|$)/g, (whole, prefix: string, text: string) => {
    const translated = localizeText(decode(text), lang);
    return translated === decode(text) ? whole : prefix + escape(translated);
  }).replace(/\b(aria-label|aria-description|title|alt|placeholder)=(['"])(.*?)\2/g, (whole, name: string, quote: string, text: string) => {
    const translated = localizeText(decode(text), lang);
    return translated === decode(text) ? whole : `${name}=${quote}${escape(translated)}${quote}`;
  });
}
