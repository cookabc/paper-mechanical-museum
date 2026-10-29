/**
 * Interface copy for the museum shell.
 *
 * English is the default language; Chinese is one switch away. This module only
 * carries shared chrome — the entrance page, navigation, the play dock, the
 * observation panel and the exit notices. Each exhibit's own model keeps its
 * own labels, because those strings sit next to the physics they describe.
 */
export type Lang = 'en' | 'zh';
export type Key = keyof typeof copy.en;
export const LANG_KEY = 'museum-lang';

export const copy = {
  en: {
    'doc.title': 'Paper Mechanical Museum · Small machines, close at hand',
    'brand.home': 'Paper Mechanical Museum home',
    'brand.name': 'Paper Mechanical Museum',
    'brand.tagline': 'A small museum you can touch',
    'nav.label': 'Home navigation',
    'nav.collection': 'Collection',
    'nav.items': 'items',
    'nav.visit': 'Before you visit',
    'hero.kicker': 'Open today · curiosity unlimited',
    'hero.title1': 'Everyday things,',
    'hero.title2': 'a little',
    'hero.titleEmphasis': 'different',
    'hero.intro':
      'Familiar little machines, opened up a different way.<br>Press one, turn one.<br>The wonder hidden in ordinary things starts to move.',
    'hero.start': 'Start looking',
    'hero.random': 'Pick one for me',
    'hero.fact1': 'items on display',
    'hero.fact2': 'No glass · please touch',
    'hero.today': "Today's pick",
    'hero.index': 'Object',
    'hero.play': 'Try it',
    'hero.switch': 'Switch the featured object',
    'hero.note1': 'A little mechanism,',
    'hero.note2': 'a lot of curiosity.',
    'hero.note3': 'Every part',
    'hero.note4': 'deserves a second look.',
    'collection.kicker': 'Collection',
    'collection.ofKinds': 'small fascinations',
    'collection.title': 'One of them will make you want to reach out.',
    'collection.subtitle': 'No theory required.<br>Curiosity is the best manual.',
    'collection.filterLabel': 'Filter the collection by kind',
    'filter.all': 'Everything',
    'filter.allName': 'The whole collection',
    'filter.daily': 'Everyday',
    'filter.dailyName': 'Everyday things',
    'filter.sound': 'Sound',
    'filter.soundName': 'Times with sound',
    'filter.play': 'Play',
    'filter.playName': 'Childlike play',
    'collection.countAll': 'All {n} items',
    'collection.countPartial': 'Unified build {shown} / {total}',
    'collection.empty': 'Nothing in this kind yet.',
    'card.object': 'Object',
    'card.play': 'Try it',
    'card.previewAlt': '{name} — hand-drawn dimensional model',
    'about.label': 'Before you visit',
    'about.seal': 'Please<br>touch',
    'about.kicker': 'There is no “do not touch” here',
    'about.title': 'Leave a little time<br>for useless joy.',
    'about.step1': 'Pick a small machine you like and walk up to it.',
    'about.step2': 'Click a part, or follow the controls and operate it.',
    'about.step3': 'Open the principle, or change the view, and find another side.',
    'about.note': 'All of it is an interactive demonstration; no real payment, camera or personal data is involved.',
    'footer.name': 'Paper Mechanical Museum',
    'footer.line': 'Everyday is large; small things are interesting too.',
    'footer.top': 'Back to top',
    'dock.free': 'Free play',
    'dock.lesson': 'Learn by doing',
    'dock.principle': 'Principle',
    'dock.exitLesson': 'Leave the lesson',
    'dock.more': 'More actions',
    'dock.audioOn': 'Sound on',
    'dock.audioOff': 'Sound off',
    'dock.reset': 'Reset',
    'dock.pause': 'Pause',
    'dock.resume': 'Resume',
    'lang.switch': '中文',
    'lang.label': 'Switch to Chinese',
    'exhibit.navLabel': 'Collection navigation',
    'exhibit.prev': 'Previous',
    'exhibit.next': 'Next',
    'exhibit.position': 'Item {index} of {total}',
    'learn.entry': 'Learn by doing',
    'learn.optional': 'optional',
    'learn.kindGenerator': 'Predict and verify',
    'learn.kindBicycle': 'Compare gears and climbing',
    'learn.kindFan': 'Compare speed and inertia',
    'learn.kindDefault': 'Follow the motion and see the principle',
    'exhibit.unknown': 'Exhibit',
    'exhibit.sceneLabel': 'Interactive exhibit',
    'exhibit.missingTitle': 'This exhibit was not found',
    'exhibit.missingBody': 'Go back to the collection and choose a machine to try.',
    'exhibit.missingLink': 'Back to the collection',
    'exhibit.loadFailed': 'The exhibit could not load. Return to the collection and try again.',
    'exit.leaving': 'Leaving this exhibit…',
  },
  zh: {
    'doc.title': '纸上机械馆 · 把日常，玩出一点不同',
    'brand.home': '纸上机械馆首页',
    'brand.name': '纸上机械馆',
    'brand.tagline': '一座可以动手的小小博物馆',
    'nav.label': '首页导航',
    'nav.collection': '馆藏目录',
    'nav.items': '件',
    'nav.visit': '参观须知',
    'hero.kicker': '今日开馆 · 好奇心不限量',
    'hero.title1': '把日常，',
    'hero.title2': '玩出一点',
    'hero.titleEmphasis': '不同',
    'hero.intro':
      '熟悉的小机器，不太一样的打开方式。<br>按一按，转一转。<br>那些藏在日常里的奇妙，就会动起来。',
    'hero.start': '开始逛逛',
    'hero.random': '随手挑一件',
    'hero.fact1': '件馆藏',
    'hero.fact2': '不隔玻璃 · 欢迎上手',
    'hero.today': '本日推荐',
    'hero.index': '藏品',
    'hero.play': '动手试试',
    'hero.switch': '切换推荐藏品',
    'hero.note1': '一点机械，',
    'hero.note2': '很多好奇。',
    'hero.note3': '每一个零件',
    'hero.note4': '都值得多看一眼',
    'collection.kicker': '馆藏目录',
    'collection.ofKinds': '种小小的着迷',
    'collection.title': '总有一件，让你想动手。',
    'collection.subtitle': '不用懂原理。<br>好奇，就是最好的说明书。',
    'collection.filterLabel': '按类别筛选馆藏',
    'filter.all': '全部',
    'filter.allName': '全部馆藏',
    'filter.daily': '日常',
    'filter.dailyName': '日常小事',
    'filter.sound': '声音',
    'filter.soundName': '有声时光',
    'filter.play': '游乐',
    'filter.playName': '童心游乐',
    'collection.countAll': '共 {n} 件馆藏',
    'collection.countPartial': '统一适配 {shown} / {total} 件',
    'collection.empty': '暂时没有这一类藏品。',
    'card.object': '藏品',
    'card.play': '动手玩',
    'card.previewAlt': '{name}的手绘立体模型',
    'about.label': '参观须知',
    'about.seal': '请<br>动手',
    'about.kicker': '这里没有「请勿触摸」',
    'about.title': '把一点时间，<br>留给没什么用的快乐。',
    'about.step1': '选一件喜欢的小机器，走近看看。',
    'about.step2': '点击零件，或跟着操作按钮动手。',
    'about.step3': '展开原理，或换个视角，发现另一面。',
    'about.note': '全部为互动演示，无需真实付款、摄像头或个人信息。',
    'footer.name': '纸上机械馆',
    'footer.line': '日常很大，小事也很有趣。',
    'footer.top': '回到顶部',
    'dock.free': '自由操作',
    'dock.lesson': '动手学',
    'dock.principle': '原理',
    'dock.exitLesson': '退出讲解',
    'dock.more': '更多操作',
    'dock.audioOn': '开启声音',
    'dock.audioOff': '关闭声音',
    'dock.reset': '重置',
    'dock.pause': '暂停',
    'dock.resume': '继续',
    'lang.switch': 'EN',
    'lang.label': '切换到英文',
    'exhibit.navLabel': '馆藏导览',
    'exhibit.prev': '上一件',
    'exhibit.next': '下一件',
    'exhibit.position': '第 {index} 件，共 {total} 件',
    'learn.entry': '动手学',
    'learn.optional': '可选',
    'learn.kindGenerator': '预测与验证',
    'learn.kindBicycle': '比较挡位与爬坡',
    'learn.kindFan': '对照转速与惯性',
    'learn.kindDefault': '跟着动作看原理',
    'exhibit.unknown': '馆藏',
    'exhibit.sceneLabel': '互动展品',
    'exhibit.missingTitle': '没有找到这件藏品',
    'exhibit.missingBody': '请回到馆藏目录，选择想体验的小机器。',
    'exhibit.missingLink': '回到馆藏',
    'exhibit.loadFailed': '展品未能加载，请返回馆藏重试。',
    'exit.leaving': '正在离开这件展品…',
  },
};

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    /* storage blocked: fall through to the document language */
  }
  const doc = (document.documentElement.lang || '').toLowerCase();
  return doc.startsWith('zh') ? 'zh' : 'en';
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* the choice lasts for this visit only */
  }
}

/** Returns a lookup function; `{name}` placeholders are filled from `vars`. */
export function translator(lang: Lang) {
  const table = copy[lang] ?? copy.en;
  return (key: Key, vars?: Record<string, string | number>) => {
    let text = table[key] ?? copy.en[key] ?? key;
    if (vars)
      for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  };
}
