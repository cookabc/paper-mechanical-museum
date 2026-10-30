import {afterEach,expect,it,vi} from 'vitest';
import {localizeMarkup,localizeText,registerMessages} from '../src/shared/message-language';
import {setLang} from '../src/shared/i18n';
afterEach(()=>{vi.restoreAllMocks();localStorage.clear();document.documentElement.lang='en';});
it('translates complete dynamic messages, preserves markup IDs and escapes inserted text',()=>{
 registerMessages({'测试读数 {0}，目标 {1}。':'Test reading {0}; target {1}.','测试部件':'Test part'});
 expect(localizeText('测试读数 2.5，目标 4。','en')).toBe('Test reading 2.5; target 4.');
 const markup='<button data-act="测试部件" aria-label="测试部件">测试部件</button>';
 expect(localizeMarkup(markup,'en')).toBe('<button data-act="测试部件" aria-label="Test part">Test part</button>');
 expect(localizeMarkup(markup,'zh')).toBe(markup);
 registerMessages({'特殊文字':'A & B < C $&'});
 expect(localizeMarkup('<p>特殊文字</p>','en')).toBe('<p>A &amp; B &lt; C $&amp;</p>');
});
it('invalidates cached misses when another exhibit catalogue loads',()=>{
 expect(localizeText('测试缓存遗漏','en')).toBe('测试缓存遗漏');
 registerMessages({'测试缓存遗漏':'Newly loaded copy'});
 expect(localizeText('测试缓存遗漏','en')).toBe('Newly loaded copy');
});
it('keeps the language choice during this visit when storage is unavailable',()=>{
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Storage blocked');});
 setLang('zh');expect(document.documentElement.lang).toBe('zh');
 expect(localizeText('重新开始')).toBe('重新开始');
 setLang('en');expect(localizeText('重新开始')).toBe('Start again');
});
