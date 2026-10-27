// 详情页 mock 数据（真实字段名来自 game-price-radar 的数据契约，值按截图风格补齐）
export const GAME = {
  id: 2325290,
  nameCn: '影之刃零',
  nameEn: 'Phantom Blade Zero',
  source: 'steam',
  price: 268,
  initial: 268,
  cut: 0,
  lowest: 268,
  isNewLow: false,
  currency: 'CNY',
  followers: 970000,
  positiveRate: 0.97,
  promoEnd: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
  platforms: ['PC', 'PS5', 'Xbox'],
  languages: ['简体中文', '英语', '日语'],
  players: { single: true, multi: false },
  rankBadges: ['最受欢迎榜 No.1', '近期热销'],
  tags: ['动作', '角色扮演', '动作角色扮演', '武侠', '类魂系列'],
  stats: [
    { label: '当前在线', value: '—', hint: '' },
    { label: '史低价格', value: '¥268', hint: '' },
    { label: '15日在线趋势', value: '—', hint: '' },
    { label: '全语言好评率', value: '—', hint: '' },
    { label: '昨日峰值在线', value: '—', hint: '' },
    { label: '全球销量排行', value: '#1', hint: '' },
    { label: '小黑盒玩家数', value: '71万', hint: '#691' },
    { label: '平均游戏时长', value: '45.8h', hint: '#4272' }
  ],
  statsNote: '2026年10月29日解锁玩家统计数据',
  overview: '蒙冤弑主，心脏受创，命余六十六日。形单影只，亡命天涯，江湖穿梭，誓破迷局。雨和血，恩与仇，交织一趟爱恨纵横的寻心之旅。探索光影斑驳、悬疑诡秘的“影境”世界：记忆之花，表里武林，杀气改造，圣母娘娘，虚空梦境……',
  releaseDate: '2026年10月29日',
  developer: 'S-GAME Studio',
  publisher: 'S-GAME Publishing',
  mediaScore: 88,
  mediaCount: 44,
  extra: [
    { icon: '📣', title: '官方动态', value: '《影之刃零》最终预告', expandable: true },
    { icon: '🖥️', title: '硬件配置', value: '我的配置：不合格', tone: 'bad', expandable: true },
    { icon: '🌐', title: '网络延迟预估', value: '中国香港 26ms', tone: 'good', expandable: true }
  ],
  similar: [
    { name: '师父', price: 126, initial: 126, cut: 30, low: false, hue: 8 },
    { name: '生化危机4 重制版', price: 45, initial: 198, cut: 75, low: true, hue: 210 },
    { name: '赛博朋克2077', price: 269, initial: 298, cut: 10, low: false, hue: 48 },
    { name: '只狼：影逝二度', price: 189, initial: 268, cut: 30, low: false, hue: 20 },
    { name: '艾尔登法环', price: 298, initial: 298, cut: 0, low: false, hue: 40 }
  ],
  gallery: Array.from({ length: 13 }, (_, i) => ({ id: i + 1, hue: (i * 37) % 360, label: '截图 ' + (i + 1) })),
  rating: { total: 2672, dist: [ [5, 0], [4, 0], [3, 0], [2, 0], [1, 0] ] }
};

// 价格/在线历史（SteamDB 风格图表用）——mock 30 天
export const SERIES = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86400000);
  const base = 268000 + Math.round(Math.sin(i / 3) * 42000 + (i % 7) * 2600);
  return { date: d.toISOString().slice(5, 10), players: base };
});

const NAMES = ['生化斯坦技术顾问','抖音瞳','老白','阿武','Niko','三日月','夜行者','咸鱼王','Ken','小满','铁皮','黑桐','Archer','七七','阿飞'];
const TEXTS = [
  '能不能像某猴那样预购前给我们上个帧数测试的 Demo 看看优化😭😭',
  '这个价位的国产魂系，光是美术就值回票价了。',
  '玩法像魂，叙事像武侠，这两样凑一起是真的少见。',
  '希望正式版别砍太多，Demo 那段雨夜追人太帅了。',
  '买了。上一部《雨血》的情怀还在。',
  '帧数稳不住的话，剧情再好也难受，先观望。',
  '手柄适配做好点，键鼠玩家也想舒服一点。'
];

export function makeComments(page = 0, size = 6) {
  return Array.from({ length: size }, (_, i) => {
    const n = page * size + i;
    const days = (n * 3) % 40;
    return {
      id: 'c' + n,
      user: NAMES[n % NAMES.length],
      avatarHue: (n * 53) % 360,
      hours: (n * 7) % 300,
      date: '08-' + String(((n * 5) % 28) + 1).padStart(2, '0'),
      text: TEXTS[n % TEXTS.length],
      useful: (n * 137) % 2000,
      useless: (n * 29) % 200,
      funny: (n * 41) % 300,
      replies: (n * 17) % 400,
      rating: n % 5 === 3 ? '不推荐' : null
    };
  });
}

// 搜索目录（真实项目里由 docs/search-index.json 提供；此处 mock 兜底）
export const CATALOG = [
  { s: 'steam', i: '2325290', n: '影之刃零', p: 268, o: 268, c: 0, lo: 268, pl: 0, tg: ['动作','角色扮演'] },
  { s: 'steam', i: '1245620', n: '艾尔登法环', p: 298, o: 298, c: 0, lo: 298, pl: 32863, tg: ['动作','角色扮演'] },
  { s: 'steam-specials', i: '238320', n: 'Outlast', p: 5.8, o: 58, c: 90, lo: 5.8, pl: 412, tg: ['恐怖','独立'] },
  { s: 'epic', i: 'epic-home', n: 'Home - A Unique Horror Adventure', p: 0, o: 15, c: 100, lo: null, pl: null, tg: ['冒险'] },
  { s: 'gog', i: 'gog-black-within', n: 'The Black Within', p: 2, o: 49, c: 96, lo: 2, pl: null, tg: ['Adventure','Horror'] },
  { s: 'appstore', i: '1238778050', n: '纪念碑谷2', p: 24, o: 24, c: 0, lo: 24, pl: null, tg: ['Puzzle'] },
  { s: 'appstore', i: '1157863540', n: '泰拉瑞亚', p: 18, o: 18, c: 0, lo: 18, pl: null, tg: ['Sandbox'] },
  { s: 'steam', i: '413150', n: 'Stardew Valley', p: 48, o: 48, c: 0, lo: 48, pl: 35977, tg: ['模拟','独立'] }
];
