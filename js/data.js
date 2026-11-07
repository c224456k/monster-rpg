'use strict';
// 萌獸大冒險：屬性、招式、萌獸、道具（全部原創）

const NOR = 0, FIR = 1, WAT = 2, GRA = 3, ELE = 4, GRO = 5, FLY = 6, BUG = 7, POI = 8;
const TYPE_NAME = ['一般', '火', '水', '草', '電', '岩地', '飛行', '蟲', '毒'];
const TYPE_COLOR = ['#a8a878', '#f08030', '#6890f0', '#78c850', '#f8d030', '#b8a038', '#a890f0', '#a8b820', '#a040a0'];

// 屬性相剋：[攻擊, 防守, 倍率]
const CHART = {};
[
  [FIR, GRA, 2], [FIR, BUG, 2], [FIR, FIR, .5], [FIR, WAT, .5], [FIR, GRO, .5],
  [WAT, FIR, 2], [WAT, GRO, 2], [WAT, WAT, .5], [WAT, GRA, .5],
  [GRA, WAT, 2], [GRA, GRO, 2], [GRA, FIR, .5], [GRA, GRA, .5], [GRA, FLY, .5], [GRA, BUG, .5], [GRA, POI, .5],
  [ELE, WAT, 2], [ELE, FLY, 2], [ELE, GRO, 0], [ELE, GRA, .5], [ELE, ELE, .5],
  [GRO, FIR, 2], [GRO, ELE, 2], [GRO, POI, 2], [GRO, GRA, .5], [GRO, BUG, .5],
  [FLY, GRA, 2], [FLY, BUG, 2], [FLY, ELE, .5], [FLY, GRO, .5],
  [BUG, GRA, 2], [BUG, POI, 2], [BUG, FIR, .5], [BUG, FLY, .5],
  [POI, GRA, 2], [POI, POI, .5], [POI, GRO, .5],
  [NOR, GRO, .5],
].forEach(([a, d, m]) => { CHART[a * 16 + d] = m; });
function typeEff(atk, types) {
  let m = 1;
  for (const d of types) { const v = CHART[atk * 16 + d]; if (v !== undefined) m *= v; }
  return m;
}

// 招式：n 名稱 t 屬性 c 類別(p 物理 / s 特殊 / x 變化) p 威力 a 命中(0=必中) pp
// st 異常狀態 [狀態, 機率]；stat [能力, 段數, 對象(0對手/1自己), 機率]；heal 回復比例；drain 吸血；recoil 反作用；pri 先制；hc 易擊中要害
const MOVES = {
  tackle: { n: '衝撞', t: NOR, c: 'p', p: 40, a: 100, pp: 35 },
  scratch: { n: '爪擊', t: NOR, c: 'p', p: 40, a: 100, pp: 35 },
  growl: { n: '低吼', t: NOR, c: 'x', a: 100, pp: 40, stat: ['atk', -1, 0, 100] },
  leer: { n: '怒視', t: NOR, c: 'x', a: 100, pp: 30, stat: ['def', -1, 0, 100] },
  quick: { n: '疾衝', t: NOR, c: 'p', p: 40, a: 100, pp: 30, pri: 1 },
  bite: { n: '啃咬', t: NOR, c: 'p', p: 60, a: 100, pp: 25 },
  slash: { n: '撕裂', t: NOR, c: 'p', p: 70, a: 100, pp: 20, hc: 1 },
  slam: { n: '重壓', t: NOR, c: 'p', p: 85, a: 100, pp: 15, st: ['par', 30] },
  dedge: { n: '捨身撞', t: NOR, c: 'p', p: 110, a: 100, pp: 15, recoil: .25 },
  harden: { n: '縮成一團', t: NOR, c: 'x', a: 0, pp: 30, stat: ['def', 1, 1, 100] },
  sharpen: { n: '磨爪', t: NOR, c: 'x', a: 0, pp: 20, stat: ['atk', 2, 1, 100] },
  agility: { n: '迅捷步', t: NOR, c: 'x', a: 0, pp: 20, stat: ['spe', 2, 1, 100] },
  rest: { n: '打盹', t: NOR, c: 'x', a: 0, pp: 10, heal: .5 },
  sing: { n: '催眠歌', t: NOR, c: 'x', a: 60, pp: 15, st: ['slp', 100] },
  ember: { n: '火星', t: FIR, c: 's', p: 40, a: 100, pp: 25, st: ['brn', 10] },
  fwheel: { n: '火輪滾', t: FIR, c: 'p', p: 60, a: 100, pp: 25, st: ['brn', 10] },
  flame: { n: '烈焰吐息', t: FIR, c: 's', p: 90, a: 100, pp: 15, st: ['brn', 10] },
  blast: { n: '爆裂炎', t: FIR, c: 's', p: 110, a: 85, pp: 5, st: ['brn', 30] },
  wisp: { n: '鬼火燈', t: FIR, c: 'x', a: 85, pp: 15, st: ['brn', 100] },
  wgun: { n: '水箭', t: WAT, c: 's', p: 40, a: 100, pp: 25 },
  bubble: { n: '泡泡串', t: WAT, c: 's', p: 65, a: 100, pp: 20, stat: ['spe', -1, 0, 30] },
  wave: { n: '浪濤', t: WAT, c: 's', p: 90, a: 100, pp: 15 },
  hydro: { n: '激流砲', t: WAT, c: 's', p: 110, a: 80, pp: 5 },
  absorb: { n: '吸汁', t: GRA, c: 's', p: 30, a: 100, pp: 25, drain: .5 },
  vine: { n: '藤條抽', t: GRA, c: 'p', p: 45, a: 100, pp: 25 },
  razor: { n: '葉片飛刀', t: GRA, c: 's', p: 55, a: 95, pp: 25, hc: 1 },
  gdrain: { n: '大吸汁', t: GRA, c: 's', p: 75, a: 100, pp: 10, drain: .5 },
  lstorm: { n: '葉片風暴', t: GRA, c: 's', p: 110, a: 90, pp: 5 },
  spore: { n: '瞌睡孢子', t: GRA, c: 'x', a: 75, pp: 15, st: ['slp', 100] },
  stun: { n: '麻麻粉', t: GRA, c: 'x', a: 75, pp: 30, st: ['par', 100] },
  synth: { n: '曬太陽', t: GRA, c: 'x', a: 0, pp: 5, heal: .5 },
  shock: { n: '靜電', t: ELE, c: 's', p: 40, a: 100, pp: 30, st: ['par', 10] },
  spark: { n: '電火花', t: ELE, c: 'p', p: 65, a: 100, pp: 20, st: ['par', 30] },
  tbolt: { n: '雷光束', t: ELE, c: 's', p: 90, a: 100, pp: 15, st: ['par', 10] },
  thunder: { n: '落雷', t: ELE, c: 's', p: 110, a: 70, pp: 10, st: ['par', 30] },
  twave: { n: '麻痺波', t: ELE, c: 'x', a: 90, pp: 20, st: ['par', 100] },
  mud: { n: '泥巴彈', t: GRO, c: 's', p: 55, a: 95, pp: 15, stat: ['spe', -1, 0, 100] },
  rthrow: { n: '丟石頭', t: GRO, c: 'p', p: 50, a: 90, pp: 15 },
  rslide: { n: '岩石雪崩', t: GRO, c: 'p', p: 75, a: 90, pp: 10 },
  quake: { n: '大地震', t: GRO, c: 'p', p: 100, a: 100, pp: 10 },
  sand: { n: '撒沙', t: GRO, c: 'x', a: 100, pp: 15, stat: ['acc', -1, 0, 100] },
  peck: { n: '尖嘴啄', t: FLY, c: 'p', p: 35, a: 100, pp: 35 },
  gust: { n: '旋風', t: FLY, c: 's', p: 40, a: 100, pp: 35 },
  wing: { n: '翅膀拍', t: FLY, c: 'p', p: 60, a: 100, pp: 35 },
  aerial: { n: '必中翼', t: FLY, c: 'p', p: 60, a: 0, pp: 20 },
  bbird: { n: '俯衝撞', t: FLY, c: 'p', p: 120, a: 100, pp: 15, recoil: .33 },
  bbite: { n: '蟲蟲咬', t: BUG, c: 'p', p: 60, a: 100, pp: 20 },
  silk: { n: '噴絲', t: BUG, c: 'x', a: 95, pp: 40, stat: ['spe', -2, 0, 100] },
  xscis: { n: '交叉鉗', t: BUG, c: 'p', p: 80, a: 100, pp: 15 },
  buzz: { n: '嗡嗡波', t: BUG, c: 's', p: 90, a: 100, pp: 10, stat: ['spa', -1, 0, 10] },
  sting: { n: '毒刺', t: POI, c: 'p', p: 15, a: 100, pp: 35, st: ['psn', 30] },
  acid: { n: '酸液', t: POI, c: 's', p: 40, a: 100, pp: 30, stat: ['def', -1, 0, 10] },
  sludge: { n: '毒泥彈', t: POI, c: 's', p: 90, a: 100, pp: 10, st: ['psn', 30] },
  ppowder: { n: '毒霧粉', t: POI, c: 'x', a: 75, pp: 35, st: ['psn', 100] },
  pfang: { n: '毒牙', t: POI, c: 'p', p: 60, a: 100, pp: 15, st: ['psn', 30] },
  struggle: { n: '掙扎', t: NOR, c: 'p', p: 50, a: 0, pp: 1, recoil: .25 },
};

const STATUS_NAME = { psn: '中毒', par: '麻痺', slp: '睡著', brn: '灼傷' };
const STAT_NAME = { atk: '攻擊', def: '防禦', spa: '特攻', spe: '速度', acc: '命中率' };

const L_KURI = [[1, 'scratch'], [1, 'growl'], [7, 'ember'], [11, 'quick'], [15, 'fwheel'], [20, 'slash'], [26, 'mud'], [33, 'flame'], [40, 'rslide'], [46, 'blast'], [52, 'quake']];
const L_MOSS = [[1, 'tackle'], [1, 'growl'], [7, 'absorb'], [10, 'vine'], [13, 'spore'], [17, 'razor'], [23, 'stun'], [28, 'gdrain'], [34, 'synth'], [42, 'lstorm']];
const L_FOCA = [[1, 'tackle'], [1, 'leer'], [7, 'wgun'], [11, 'harden'], [15, 'bubble'], [21, 'bite'], [27, 'slam'], [33, 'wave'], [40, 'rest'], [46, 'hydro']];
const L_CHIRP = [[1, 'peck'], [1, 'growl'], [5, 'gust'], [9, 'quick'], [15, 'wing'], [21, 'agility'], [27, 'aerial'], [35, 'bbird']];
const L_MOUSE = [[1, 'tackle'], [1, 'leer'], [4, 'quick'], [9, 'bite'], [15, 'sharpen'], [21, 'slam'], [28, 'slash'], [35, 'dedge']];
const L_BEETLE = [[1, 'tackle'], [1, 'silk'], [6, 'bbite'], [11, 'harden'], [16, 'rthrow'], [23, 'xscis'], [30, 'rslide'], [38, 'quake']];
const L_FLUFF = [[1, 'tackle'], [1, 'growl'], [5, 'shock'], [10, 'twave'], [14, 'quick'], [19, 'spark'], [25, 'agility'], [31, 'tbolt'], [42, 'thunder']];
const L_SHROOM = [[1, 'absorb'], [1, 'ppowder'], [6, 'sting'], [11, 'spore'], [16, 'acid'], [22, 'gdrain'], [29, 'stun'], [35, 'sludge']];
const L_OWL = [[1, 'peck'], [1, 'leer'], [6, 'gust'], [11, 'sing'], [16, 'wing'], [22, 'aerial'], [29, 'rest'], [36, 'bbird']];
const L_MOLE = [[1, 'scratch'], [1, 'sand'], [6, 'mud'], [11, 'rthrow'], [17, 'slash'], [23, 'sharpen'], [29, 'rslide'], [36, 'quake']];
const L_ROCK = [[1, 'tackle'], [1, 'harden'], [6, 'rthrow'], [12, 'mud'], [18, 'slam'], [24, 'rslide'], [32, 'quake'], [40, 'dedge']];
const L_SHRIMP = [[1, 'tackle'], [1, 'harden'], [6, 'wgun'], [11, 'bite'], [16, 'bubble'], [22, 'xscis'], [29, 'slash'], [36, 'hydro']];
const L_FIN = [[1, 'tackle'], [1, 'leer'], [6, 'wgun'], [10, 'bite'], [15, 'agility'], [20, 'bubble'], [27, 'slash'], [34, 'wave'], [42, 'hydro']];
const L_CANDLE = [[1, 'ember'], [1, 'leer'], [8, 'wisp'], [14, 'sting'], [20, 'fwheel'], [26, 'acid'], [32, 'flame'], [40, 'sludge']];
const L_FOX = [[1, 'quick'], [1, 'growl'], [8, 'bite'], [14, 'agility'], [20, 'slash'], [26, 'aerial'], [32, 'slam'], [40, 'dedge']];
const L_LEGEND = [[1, 'shock'], [1, 'gust'], [20, 'spark'], [30, 'aerial'], [40, 'tbolt'], [45, 'agility'], [50, 'thunder'], [55, 'bbird']];

// 萌獸：b = [HP, 攻擊, 防禦, 特攻, 速度]；r 捕獲率；x 經驗基礎值；evo [等級, 進化後]
const SPECIES = {
  kuri1: { n: '小火栗', t: [FIR], b: [45, 55, 42, 55, 62], r: 45, x: 62, L: L_KURI, evo: [16, 'kuri2'], d: '頭上的刺殼一緊張就會冒出小火苗，烤栗子的香味是牠的招牌。' },
  kuri2: { n: '爆栗獸', t: [FIR], b: [60, 72, 56, 70, 78], r: 45, x: 142, L: L_KURI, evo: [34, 'kuri3'], d: '刺殼燒得通紅，生氣時會把火栗彈得到處都是。' },
  kuri3: { n: '炎栗王', t: [FIR, GRO], b: [80, 98, 78, 92, 88], r: 45, x: 236, L: L_KURI, d: '背著岩石般的殼，腳步一踩就會讓地面冒出熱氣。' },
  mossy1: { n: '苔苔羊', t: [GRA], b: [50, 49, 52, 55, 45], r: 45, x: 64, L: L_MOSS, evo: [16, 'mossy2'], d: '毛是柔軟的青苔，下過雨後會長得特別蓬鬆。' },
  mossy2: { n: '蕨角羊', t: [GRA], b: [65, 64, 68, 72, 60], r: 45, x: 142, L: L_MOSS, evo: [32, 'mossy3'], d: '捲起來的蕨葉角能吸收陽光，曬越久越有精神。' },
  mossy3: { n: '森冠羊', t: [GRA], b: [88, 84, 90, 100, 80], r: 45, x: 236, L: L_MOSS, d: '背上長著一座小森林，常有小鳥在上面築巢。' },
  foca1: { n: '噗噗豹', t: [WAT], b: [50, 48, 55, 52, 45], r: 45, x: 63, L: L_FOCA, evo: [16, 'foca2'], d: '喜歡用鼻子吹泡泡，吹出的泡泡能浮在空中好一陣子。' },
  foca2: { n: '浪花豹', t: [WAT], b: [68, 62, 70, 70, 60], r: 45, x: 142, L: L_FOCA, evo: [34, 'foca3'], d: '頭上的浪花冠會隨心情起伏，游泳快得像箭。' },
  foca3: { n: '潮鳴海豹', t: [WAT], b: [95, 80, 92, 98, 72], r: 45, x: 236, L: L_FOCA, d: '吹響海螺角時，遠方的海浪都會跟著回應。' },
  chirp1: { n: '啾啾雀', t: [NOR, FLY], b: [40, 45, 40, 35, 56], r: 255, x: 50, L: L_CHIRP, evo: [18, 'chirp2'], d: '一大早就在樹梢上啾啾叫，是最常見的小鳥萌獸。' },
  chirp2: { n: '疾風雀', t: [NOR, FLY], b: [68, 80, 65, 58, 96], r: 120, x: 150, L: L_CHIRP, d: '長長的尾羽像兩把剪刀，俯衝時快得看不清。' },
  mouse1: { n: '圓尾鼠', t: [NOR], b: [32, 52, 36, 26, 72], r: 255, x: 51, L: L_MOUSE, evo: [20, 'mouse2'], d: '圓滾滾的尾巴是牠的驕傲，會用尾巴當枕頭睡覺。' },
  mouse2: { n: '胖尾鼠', t: [NOR], b: [62, 82, 62, 50, 98], r: 127, x: 140, L: L_MOUSE, d: '尾巴比身體還大，被抱住的話會軟到不想放開。' },
  beetle1: { n: '小甲丸', t: [BUG], b: [42, 48, 60, 25, 32], r: 190, x: 55, L: L_BEETLE, evo: [22, 'beetle2'], d: '一受到驚嚇就縮成一顆球，滾到草叢裡躲起來。' },
  beetle2: { n: '鋼殼丸', t: [BUG, GRO], b: [66, 88, 105, 45, 50], r: 75, x: 152, L: L_BEETLE, d: '殼硬得像岩石，滾動起來可以撞倒大樹。' },
  fluff1: { n: '電毛球', t: [ELE], b: [36, 40, 36, 58, 72], r: 190, x: 58, L: L_FLUFF, evo: [26, 'fluff2'], d: '全身的毛蓬鬆帶電，摸一下頭髮會整個豎起來。' },
  fluff2: { n: '雷暴球', t: [ELE], b: [66, 62, 62, 98, 112], r: 75, x: 158, L: L_FLUFF, d: '身上總帶著一團小雷雲，心情不好時會下起小雷雨。' },
  shroom1: { n: '紫霧菇', t: [GRA, POI], b: [46, 46, 52, 62, 30], r: 190, x: 60, L: L_SHROOM, evo: [24, 'shroom2'], d: '傘上的斑點會飄出紫色孢子，聞了會想睡覺。' },
  shroom2: { n: '毒傘菇', t: [GRA, POI], b: [72, 66, 78, 98, 45], r: 75, x: 156, L: L_SHROOM, d: '張開大傘時四周會瀰漫紫霧，森林裡的萌獸都會繞道。' },
  owl1: { n: '夜梟咕', t: [NOR, FLY], b: [52, 40, 42, 56, 50], r: 190, x: 58, L: L_OWL, evo: [22, 'owl2'], d: '會用一隻腳站著打瞌睡，聽到聲音頭能轉一大圈。' },
  owl2: { n: '月影梟', t: [NOR, FLY], b: [82, 56, 62, 88, 78], r: 90, x: 155, L: L_OWL, d: '額頭的月牙會在夜裡發光，唱的歌能讓人安眠。' },
  mole1: { n: '砂土鼴', t: [GRO], b: [42, 58, 50, 30, 42], r: 190, x: 56, L: L_MOLE, evo: [24, 'mole2'], d: '一天能挖出一條小隧道，鼻子能聞到地底的寶石。' },
  mole2: { n: '岩爪鼴', t: [GRO], b: [72, 98, 86, 45, 70], r: 90, x: 154, L: L_MOLE, d: '爪子硬得能挖穿岩壁，礦工們都很尊敬牠。' },
  rock1: { n: '石頭怪', t: [GRO], b: [40, 80, 100, 30, 20], r: 190, x: 60, L: L_ROCK, evo: [25, 'rock2'], d: '平常一動也不動，常被登山客當成路邊的石頭坐下休息。' },
  rock2: { n: '巨岩像', t: [GRO], b: [80, 110, 130, 55, 45], r: 60, x: 170, L: L_ROCK, d: '傳說是守護山路的石像，身上長著幾百年的青苔。' },
  shrimp1: { n: '河蝦兵', t: [WAT], b: [42, 62, 58, 32, 46], r: 190, x: 58, L: L_SHRIMP, evo: [25, 'shrimp2'], d: '戴著貝殼頭盔，揮著大鉗子在河邊巡邏。' },
  shrimp2: { n: '巨鉗蝦', t: [WAT], b: [72, 108, 92, 52, 62], r: 75, x: 160, L: L_SHRIMP, d: '一夾就能把石頭夾碎，是河邊的老大。' },
  fin1: { n: '圓鰭魚', t: [WAT], b: [40, 52, 40, 45, 70], r: 190, x: 55, L: L_FIN, evo: [26, 'fin2'], d: '鰭圓圓的，游起來一扭一扭，常被誤認成玩具。' },
  fin2: { n: '劍鰭魚', t: [WAT], b: [70, 96, 64, 72, 102], r: 75, x: 158, L: L_FIN, d: '頭上長出像劍一樣的長吻，衝刺時能劃開海浪。' },
  candle: { n: '燭火靈', t: [FIR, POI], b: [50, 34, 50, 88, 60], r: 90, x: 120, L: L_CANDLE, d: '在洞窟深處飄來飄去的燭火，紫色火焰聞起來有點刺鼻。' },
  fox: { n: '星光狐', t: [NOR], b: [72, 78, 70, 82, 98], r: 30, x: 172, L: L_FOX, d: '尾巴尖端有一顆小星星，傳說看到牠的人會有好運。' },
  legend: { n: '雷霆麒麟', t: [ELE, FLY], b: [95, 92, 88, 128, 108], r: 3, x: 260, L: L_LEGEND, d: '只在雷雨夜出現的神獸，鬃毛是一道道閃電。' },
};
const DEX_ORDER = ['kuri1', 'kuri2', 'kuri3', 'mossy1', 'mossy2', 'mossy3', 'foca1', 'foca2', 'foca3', 'chirp1', 'chirp2', 'mouse1', 'mouse2',
  'beetle1', 'beetle2', 'fluff1', 'fluff2', 'shroom1', 'shroom2', 'owl1', 'owl2', 'mole1', 'mole2', 'rock1', 'rock2',
  'shrimp1', 'shrimp2', 'fin1', 'fin2', 'candle', 'fox', 'legend'];

const ITEMS = {
  ball: { n: '捕獸球', price: 200, ball: 1, d: '丟向野生萌獸來捕捉牠。' },
  gball: { n: '強力球', price: 600, ball: 1.5, d: '比捕獸球更容易捕捉。' },
  uball: { n: '頂級球', price: 1200, ball: 2, d: '捕捉能力非常強的球。' },
  potion: { n: '回復噴霧', price: 300, heal: 20, d: '回復 20 點 HP。' },
  spotion: { n: '好傷噴霧', price: 700, heal: 60, d: '回復 60 點 HP。' },
  hpotion: { n: '超回復噴霧', price: 1200, heal: 150, d: '回復 150 點 HP。' },
  fullheal: { n: '萬靈丹', price: 500, cure: 1, d: '治好所有異常狀態。' },
  revive: { n: '甦醒草', price: 1500, revive: .5, d: '讓昏倒的萌獸恢復一半 HP。' },
};
const ITEM_ORDER = ['ball', 'gball', 'uball', 'potion', 'spotion', 'hpotion', 'fullheal', 'revive'];

// ---- 萌獸個體 ----
function xpForLevel(lv) { return lv <= 1 ? 0 : lv * lv * lv; }

function calcStats(m) {
  const s = SPECIES[m.id], iv = m.iv, L = m.lv;
  const st = (i) => Math.floor((s.b[i] * 2 + iv[i]) * L / 100) + 5;
  return { hp: Math.floor((s.b[0] * 2 + iv[0]) * L / 100) + L + 10, atk: st(1), def: st(2), spa: st(3), spe: st(4) };
}

function movesAtLevel(id, lv) {
  const out = [];
  for (const [l, mv] of SPECIES[id].L) {
    if (l <= lv && !out.includes(mv)) out.push(mv);
  }
  return out.slice(-4);
}

function makeMon(id, lv, rnd = Math.random) {
  const iv = [0, 1, 2, 3, 4].map(() => Math.floor(rnd() * 16));
  const m = { id, lv, xp: xpForLevel(lv), iv, st: null, slp: 0, moves: movesAtLevel(id, lv).map((k) => ({ id: k, pp: MOVES[k].pp })) };
  m.hp = calcStats(m).hp;
  return m;
}
function monName(m) { return m.nick || SPECIES[m.id].n; }
function maxHp(m) { return calcStats(m).hp; }
function healMon(m) { m.hp = maxHp(m); m.st = null; m.slp = 0; for (const mv of m.moves) mv.pp = MOVES[mv.id].pp; }

// 野生萌獸出現表：[種類, 最低等, 最高等, 權重]
const ENCOUNTERS = {
  route1: [['mouse1', 2, 4, 35], ['chirp1', 2, 4, 35], ['beetle1', 3, 5, 15], ['fluff1', 3, 5, 12], ['fox', 5, 5, 1]],
  route2: [['beetle1', 6, 9, 22], ['shroom1', 6, 9, 22], ['chirp1', 7, 9, 15], ['owl1', 7, 10, 16], ['mouse1', 7, 9, 15], ['fluff1', 8, 9, 8], ['fox', 9, 9, 1]],
  route3: [['mole1', 13, 16, 25], ['rock1', 13, 16, 22], ['fluff1', 14, 16, 15], ['shroom1', 14, 17, 13], ['fin1', 14, 16, 12], ['owl1', 15, 17, 12], ['fox', 16, 16, 1]],
  cave: [['rock1', 16, 19, 35], ['mole1', 16, 19, 30], ['candle', 17, 20, 13], ['beetle1', 16, 18, 22]],
  route4: [['shrimp1', 24, 27, 18], ['fin1', 24, 27, 14], ['owl1', 24, 27, 16], ['mouse2', 25, 27, 14], ['fluff1', 24, 26, 14], ['candle', 25, 27, 9], ['chirp2', 26, 28, 13], ['fox', 26, 26, 2]],
  route5: [['mole2', 30, 33, 18], ['rock2', 31, 33, 14], ['owl2', 31, 33, 14], ['shroom2', 31, 33, 14], ['chirp2', 31, 34, 14], ['beetle2', 31, 33, 12], ['shrimp2', 31, 33, 11], ['fox', 32, 32, 3]],
};
