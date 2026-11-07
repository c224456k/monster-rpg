'use strict';
// 萌獸大冒險：地圖、人物、劇情
// 地圖符號：. 草地  , 草叢(會遇到野生萌獸)  T 樹  ~ 水  = 路  * 花  # 柵欄  S 告示牌  r 大石頭
// 屋頂 Y 一般 R 夥伴中心 U 商店 Z 道館；W 牆 n 窗；門 D 一般 P 夥伴中心 Q 商店 G 道館
// 室內 _ 地板 X 牆 C 櫃台 B 電腦 L 書櫃 t 桌子 b 床 p 盆栽 M 出口地墊；g 道館地板 v 雕像
// 洞窟 K 岩壁 k 地面 O/o 洞口；A 祭壇
// 出入口：走出地圖邊緣接到 links 指定的地圖；D/O/o 依 warps；P Q G 自動通往夥伴中心/商店/本鎮道館；M 回到進來的門口

const BADGES = ['羽翼徽章', '浪花徽章', '雷光徽章', '熔岩徽章'];

// 訓練家：team [[種類, 等級], ...]
const T = (name, cls, spr, team, money, pre, post, extra) => Object.assign({ name, cls, spr, team, money, pre, post }, extra || {});

const MAPS = {
  // ================= 新芽鎮 =================
  town1: {
    name: '新芽鎮', music: 'town', outdoor: true, border: 'T',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'T.......*==*.......T',
      'T.YYYY...==...YYYY.T',
      'T.YYYY...==...YYYY.T',
      'T.WnDW...==...WDnW.T',
      'T...=....==....=...T',
      'T...============...T',
      'T.......*==*.S.....T',
      'T...S....==........T',
      'T*.......==........T',
      'T........==.YYYYYY.T',
      'T.~~~~...==.YYYYYY.T',
      'T.~~~~...==.WnnDnW.T',
      'T.~~~~...======....T',
      'T.......*...*......T',
      'T..*..........*....T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    links: { n: 'route1' },
    warps: { '4,4': ['home', 4, 5], '15,4': ['house', 4, 5], '15,12': ['lab', 5, 8] },
    signs: { '13,7': '新芽鎮\n嫩芽冒出來的小鎮', '4,8': '北邊是 1 號道路。\n草叢裡有野生萌獸，\n沒有萌獸不要進去！' },
    npcs: [
      { x: 6, y: 9, spr: 'girl', dir: 0, wander: 1, say: '萌獸好可愛喔！\n聽說只要有捕獸球，\n就能跟牠們成為夥伴。' },
      { x: 13, y: 14, spr: 'old', dir: 2, say: '年輕人，旅行最重要的\n就是常去夥伴中心\n讓萌獸休息喔。' },
    ],
    triggers: [
      { x: 9, y: 1, run: 'needStarter' }, { x: 10, y: 1, run: 'needStarter' },
    ],
  },
  home: {
    name: '我家', music: 'town', w: 10,
    rows: [
      'XXXXXXXXXX',
      'XLL___b__X',
      'X_____b__X',
      'X__tt____X',
      'X__tt____X',
      'Xp______pX',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [{ x: 5, y: 3, spr: 'mom', dir: 0, run: 'mom' }],
  },
  house: {
    name: '民家', music: 'town',
    rows: [
      'XXXXXXXXXX',
      'XLL____b_X',
      'X______b_X',
      'X__tt____X',
      'X__tt____X',
      'Xp______pX',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [{ x: 2, y: 3, spr: 'man', dir: 3, run: 'houseTalk' }],
  },
  lab: {
    name: '萌獸研究所', music: 'town',
    rows: [
      'XXXXXXXXXXXX',
      'XLLLL__LLLLX',
      'X__________X',
      'X______ttt_X',
      'X__________X',
      'XB________BX',
      'XLL______LLX',
      'X__________X',
      'X__________X',
      'X____MM____X',
      'XXXXXXXXXXXX',
    ],
    npcs: [
      { x: 5, y: 2, spr: 'prof', dir: 0, run: 'prof' },
      { x: 8, y: 4, spr: 'rival', dir: 2, id: 'labRival', hide: (g) => g.flags.rival1 },
      { x: 2, y: 8, spr: 'man', dir: 0, wander: 1, say: '我是博士的助手。\n博士整天都在研究\n萌獸為什麼會進化。' },
    ],
  },

  // ================= 1 號道路 =================
  route1: {
    name: '1 號道路', music: 'route', outdoor: true, enc: 'route1', border: 'T',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'T,,,,....==....,,,,T',
      'T,,,,....==....,,,,T',
      'T,,,,..====....,,,,T',
      'T......==......TT..T',
      'T..TT..==..,,,,....T',
      'T..TT..==..,,,,,...T',
      'T......==..,,,,,...T',
      'T.S....==..........T',
      'T,,,,,,==...TTT....T',
      'T,,,,,,=====.......T',
      'T,,,,,,....==..,,,,T',
      'T..........==..,,,,T',
      'TTTT.......==..,,,,T',
      'T..........==......T',
      'T....,,,,,,==...*..T',
      'T....,,,,,,==......T',
      'T*.........==.....*T',
      'T........===.......T',
      'T........==........T',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    links: { n: 'town2', s: 'town1' },
    signs: { '2,8': '1 號道路\n北：青石鎮\n南：新芽鎮' },
    npcs: [
      { x: 14, y: 14, spr: 'boy', dir: 2, sight: 3, trainer: T('小明', '短褲少年', 'boy', [['mouse1', 4], ['chirp1', 4]], 60, '眼神對上了！\n來對戰吧！', '哇，你好強喔！') },
      { x: 4, y: 4, spr: 'girl', dir: 0, say: '在草叢裡走路的時候，\n野生萌獸會跳出來！\n先打弱牠再丟球喔。' },
    ],
  },

  // ================= 青石鎮 =================
  town2: {
    name: '青石鎮', music: 'town', outdoor: true, border: 'T', gym: 'gym1',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'T........==........T',
      'T.RRRR...==...UUUU.T',
      'T.RRRR...==...UUUU.T',
      'T.WnPW...==...WQnW.T',
      'T...=....==....=...T',
      'T...============...T',
      'T.......S==........T',
      'T.ZZZZZZ.==..YYYY..T',
      'T.ZZZZZZ.==..YYYY..T',
      'T.WWnGWW.==..WnDW..T',
      'T....=...==....=...T',
      'T....============..T',
      'T*.......==.......*T',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    links: { n: 'route2', s: 'route1' },
    warps: { '15,10': ['house', 4, 5] },
    signs: { '8,7': '青石鎮\n道館館主：翔子\n「乘著風的飛行使」' },
    npcs: [
      { x: 12, y: 13, spr: 'old', dir: 1, say: '道館館主翔子\n用的是飛行系萌獸。\n電屬性對付牠們很有效！' },
      { x: 3, y: 12, spr: 'boy', dir: 0, wander: 1, say: '拿到徽章的話，\n就能證明你是\n厲害的訓練家喔！' },
    ],
  },
  gym1: {
    name: '青石鎮道館', music: 'gym', tint: '#cfe6ff', w: 10,
    rows: [
      'XXXXXXXXXX',
      'Xv______vX',
      'X_gggggg_X',
      'X_g_vv_g_X',
      'X_g____g_X',
      'X_gg__gg_X',
      'Xv______vX',
      'X________X',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [
      { x: 2, y: 4, spr: 'bug', dir: 3, sight: 4, trainer: T('阿風', '飛行少年', 'bug', [['chirp1', 8], ['owl1', 9]], 120, '想挑戰翔子姊姊，\n先過我這關！', '可惡…') },
      { x: 4, y: 1, spr: 'leader1', dir: 0, leader: 0, trainer: T('翔子', '道館館主', 'leader1', [['chirp1', 10], ['owl1', 11], ['chirp2', 13]], 1500,
        '我是青石鎮的館主翔子！\n我的萌獸乘著風飛翔，\n你追得上嗎？', '被你追上了…\n這是羽翼徽章，收下吧！') },
    ],
  },

  // ================= 2 號道路（霧之森） =================
  route2: {
    name: '霧之森', music: 'route', outdoor: true, enc: 'route2', border: 'T',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'TTT,,,,..==..,,,,TTT',
      'TT,,,,,..==..,,,,,TT',
      'TT,,TT...==...TT,,TT',
      'T....T...==...T....T',
      'T.,,,,..====..,,,,.T',
      'T.,,,,..=..=..,,,,.T',
      'TTTT....=..=....TTTT',
      'T,,,,,,,=..=,,,,,,,T',
      'T,,TTTT.=..=.TTTT,,T',
      'T,,T....=..=....T,,T',
      'T,,T.====..====.T,,T',
      'T...,=........=,...T',
      'TTT.,=.TTTTTT.=,.TTT',
      'T,,,,=.T~~~~T.=,,,,T',
      'T,,,,=.T~~~~T.=,,,,T',
      'T....=.TTTTTT.=....T',
      'T....====..====....T',
      'TTTT.....==.....TTTT',
      'T,,,,,...==...,,,,,T',
      'T,,,,,...==...,,,,,T',
      'T........==........T',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    links: { n: 'town3', s: 'town2' },
    signs: {},
    npcs: [
      { x: 4, y: 10, spr: 'bug', dir: 3, sight: 4, trainer: T('小虎', '捕蟲少年', 'bug', [['beetle1', 8], ['beetle1', 9]], 80, '我的蟲蟲萌獸\n最可愛了！', '蟲蟲們辛苦了…') },
      { x: 15, y: 16, spr: 'girl', dir: 2, sight: 3, trainer: T('小芳', '迷你裙', 'girl', [['shroom1', 10], ['mouse1', 10]], 100, '森林裡好暗喔～\n陪我對戰一下嘛！', '嗚嗚，輸了…') },
      { x: 3, y: 19, spr: 'boy', dir: 0, sight: 2, trainer: T('阿凱', '露營男孩', 'boy', [['chirp1', 10], ['owl1', 11]], 100, '來場對戰熱熱身吧！', '你的萌獸練得真好！') },
    ],
    triggers: [{ x: 9, y: 2, run: 'rival2' }, { x: 10, y: 2, run: 'rival2' }],
  },

  // ================= 潮汐港 =================
  town3: {
    name: '潮汐港', music: 'town', outdoor: true, border: '~', gym: 'gym2',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'T........==....~~~~~',
      'T.RRRR...==....~~~~~',
      'T.RRRR...==....~~~~~',
      'T.WnPW...==....~~~~~',
      'T...=....==....~~~~~',
      'T...=======....~~~~~',
      'T........==S...~~~~~',
      'T.UUUU...==....~~~~~',
      'T.UUUU...==.ZZZZZZ~~',
      'T.WQnW...==.ZZZZZZ~~',
      'T...=....==.WnGnWW~~',
      'T...=========..=.~~~',
      'T........==......~~~',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    links: { n: 'route3', s: 'route2' },
    signs: { '11,7': '潮汐港\n道館館主：海音\n「浪花般的歌姬」' },
    npcs: [
      { x: 13, y: 5, spr: 'swim', dir: 3, say: '海的另一邊住著\n很多水屬性萌獸。\n總有一天我要游過去！' },
      { x: 6, y: 13, spr: 'lady', dir: 1, say: '海音的水屬性萌獸\n怕電也怕草。\n要準備好再去喔。' },
    ],
  },
  gym2: {
    name: '潮汐港道館', music: 'gym', tint: '#a8dcff', w: 10,
    rows: [
      'XXXXXXXXXX',
      'Xv______vX',
      'X_~~__~~_X',
      'X_~~__~~_X',
      'X________X',
      'X~~____~~X',
      'Xv______vX',
      'X________X',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [
      { x: 7, y: 4, spr: 'swim', dir: 2, sight: 4, trainer: T('小波', '泳者', 'swim', [['shrimp1', 15], ['fin1', 15]], 200, '在水裡我可不會輸！', '咕嚕咕嚕…') },
      { x: 4, y: 1, spr: 'leader2', dir: 0, leader: 1, trainer: T('海音', '道館館主', 'leader2', [['fin1', 16], ['shrimp1', 17], ['fin2', 19]], 2100,
        '我是潮汐港館主海音。\n浪花的力量，\n讓你好好見識！', '真是漂亮的對戰。\n這是浪花徽章！') },
    ],
  },

  // ================= 3 號道路 =================
  route3: {
    name: '3 號道路', music: 'route', outdoor: true, enc: 'route3', border: 'T',
    rows: [
      'TTTTTKKKKOKKKKKTTTTT',
      'TTTTKKKKK=KKKKKKTTTT',
      'TT..,,,..=...,,,..TT',
      'T..,,,,..=..,,,,,..T',
      'T..,,r...=....r,,..T',
      'T........=.........T',
      'TT~~~~...======....T',
      'TT~~~~........=..r.T',
      'T.............=....T',
      'T,,,,,,,......=,,,,T',
      'T,,,,,,,..====,,,,,T',
      'T..rr....==..,,,,,.T',
      'T........==........T',
      'T.,,,,...==...,,,,.T',
      'T.,,,,...==...,,,,.T',
      'T........==........T',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    links: { s: 'town3' },
    warps: { '9,0': ['cave', 10, 16] },
    signs: {},
    npcs: [
      { x: 6, y: 5, spr: 'hiker', dir: 3, sight: 3, trainer: T('大山', '登山客', 'hiker', [['rock1', 15], ['mole1', 16]], 240, '山裡的萌獸\n可是很硬的！', '哈哈！你很有一套！') },
      { x: 16, y: 12, spr: 'girl', dir: 2, sight: 4, trainer: T('小雨', '野餐少女', 'girl', [['fluff1', 16], ['chirp1', 16]], 200, '野餐前先對戰一場！', '便當都要冷掉了啦！') },
      { x: 12, y: 2, spr: 'man', dir: 0, say: '前面是雷鳴洞。\n穿過洞窟就是雷光市。\n洞裡很暗，小心點。' },
    ],
  },
  cave: {
    name: '雷鳴洞', music: 'cave', enc: 'cave', encAll: 1, border: 'K',
    rows: [
      'KKKKKKKKKKoKKKKKKKKK',
      'KKKKKKKKKKkKKKKKKKKK',
      'KKkkkkkkkkkkkkkkkKKK',
      'KKkKKKKKKKKKKKKkkKKK',
      'KKkKkkkkkkkkkKKKkKKK',
      'KKkKkKKKKKKKkkKKkKKK',
      'KKkkkKrrkkkKKkKKkKKK',
      'KKKKKKkkkkkkkkkkkKKK',
      'KKkkkkkkKKKKKKKKKKKK',
      'KKkKKKKkKKkkkkkkkKKK',
      'KKkKkkkkkkkKKKKKkKKK',
      'KKkKkKKKKKKKkkkkkKKK',
      'KKkkkKkkkkkkkKKKKKKK',
      'KKKKKKkKKKKKKKKKKKKK',
      'KKkkkkkkkkkkkkkkKKKK',
      'KKKKKKKKKkkKKKKKKKKK',
      'KKKKKKKKKkkKKKKKKKKK',
      'KKKKKKKKKKoKKKKKKKKK',
    ],
    warps: { '10,17': ['route3', 9, 1], '10,0': ['town4', 9, 12] },
    npcs: [
      { x: 13, y: 14, spr: 'hiker', dir: 2, sight: 4, trainer: T('岩男', '登山客', 'hiker', [['rock1', 18], ['rock1', 18], ['mole1', 19]], 300, '洞窟是我的地盤！', '洞窟還是很大的…') },
      { x: 5, y: 8, spr: 'old', dir: 2, sight: 3, trainer: T('老陳', '探險家', 'old', [['candle', 19], ['beetle1', 19]], 350, '這裡的燭火靈\n會在黑暗中帶路喔。', '老了老了…') },
      { x: 4, y: 2, spr: 'man', dir: 3, say: '洞窟的萌獸\n隨時都會冒出來，\n不只在草叢裡。' },
    ],
  },

  // ================= 雷光市 =================
  town4: {
    name: '雷光市', music: 'town', outdoor: true, border: 'T', gym: 'gym3',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'T........==........T',
      'T.RRRR...==...UUUU.T',
      'T.RRRR...==...UUUU.T',
      'T.WnPW...==...WQnW.T',
      'T...=....==....=...T',
      'T...============...T',
      'T.YYYY...==S.ZZZZZ.T',
      'T.YYYY...==..ZZZZZ.T',
      'T.WDnW...==..WnGnW.T',
      'T...=....==....=...T',
      'T...============...T',
      'T*.......==.......*T',
      'TTTTKKKKKoKKKKKTTTTT',
    ],
    links: { n: 'route4' },
    warps: { '3,9': ['house', 4, 5], '9,13': ['cave', 10, 1] },
    signs: { '11,7': '雷光市\n道館館主：雷雅\n「閃耀的電光女王」' },
    npcs: [
      { x: 6, y: 12, spr: 'boy', dir: 1, say: '雷雅的萌獸速度超快！\n岩地屬性的招式\n電屬性完全擋不住喔。' },
      { x: 13, y: 1, spr: 'lady', dir: 0, wander: 1, say: '這座城市的電\n都是電毛球幫忙發的喔！' },
    ],
  },
  gym3: {
    name: '雷光市道館', music: 'gym', tint: '#fff2a0', w: 10,
    rows: [
      'XXXXXXXXXX',
      'Xv______vX',
      'X_gg__gg_X',
      'X_g_vv_g_X',
      'X_g____g_X',
      'X_gggggg_X',
      'Xv______vX',
      'X________X',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [
      { x: 7, y: 4, spr: 'man', dir: 2, sight: 3, trainer: T('阿電', '電工', 'man', [['fluff1', 21], ['fluff1', 22]], 400, '被電到可別哭喔！', '短路了…') },
      { x: 4, y: 1, spr: 'leader3', dir: 0, leader: 2, trainer: T('雷雅', '道館館主', 'leader3', [['fluff1', 23], ['mouse2', 24], ['fluff2', 26]], 2900,
        '我是雷光市館主雷雅！\n我的電光比誰都快，\n準備好被麻痺吧！', '好、好快…\n這是雷光徽章！') },
    ],
  },

  // ================= 4 號道路 =================
  route4: {
    name: '4 號道路', music: 'route', outdoor: true, enc: 'route4', border: 'T',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'T,,,,,...==...,,,,,T',
      'T,,,,,...==...,,,,,T',
      'T.....=====........T',
      'T..~~~=..........r.T',
      'T..~~~=...,,,,,,...T',
      'T..~~~=...,,,,,,...T',
      'T.....=...,,,,,,...T',
      'TTT...=============T',
      'T,,,,,..........=..T',
      'T,,,,,...TTTT...=..T',
      'T,,,,,...TTTT...=..T',
      'T......=========...T',
      'T......=...,,,,,,..T',
      'T..r...=...,,,,,,..T',
      'T......==..........T',
      'T.......==.........T',
      'T........==........T',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    links: { n: 'town5', s: 'town4' },
    npcs: [
      { x: 13, y: 3, spr: 'bug', dir: 2, sight: 4, trainer: T('小強', '捕蟲少年', 'bug', [['beetle2', 23], ['shroom1', 23]], 300, '我的蟲蟲變強了！', '又輸了啦！') },
      { x: 4, y: 12, spr: 'swim', dir: 3, sight: 3, trainer: T('阿海', '泳者', 'swim', [['shrimp1', 24], ['fin1', 24], ['fin2', 25]], 450, '我剛從湖裡上來！', '我還是回去游泳好了。') },
      { x: 16, y: 15, spr: 'lady', dir: 2, sight: 4, trainer: T('美美', '大小姐', 'lady', [['fox', 26]], 900, '我的星光狐\n可是很稀有的喔～', '哎呀，真是失禮了。') },
    ],
    triggers: [{ x: 9, y: 1, run: 'rival3' }, { x: 10, y: 1, run: 'rival3' }],
  },

  // ================= 熔岩鎮 =================
  town5: {
    name: '熔岩鎮', music: 'town', outdoor: true, border: 'T', gym: 'gym4',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'T..r.....==.....r..T',
      'T.RRRR...==...UUUU.T',
      'T.RRRR...==...UUUU.T',
      'T.WnPW...==...WQnW.T',
      'T...=....==....=...T',
      'T...============...T',
      'T.......S==........T',
      'T.ZZZZZZ.==..YYYY..T',
      'T.ZZZZZZ.==..YYYY..T',
      'T.WWnGWW.==..WnDW..T',
      'T....=...==....=...T',
      'T....============..T',
      'T..r.....==.....r..T',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    links: { n: 'route5', s: 'route4' },
    warps: { '15,10': ['house', 4, 5] },
    signs: { '8,7': '熔岩鎮\n道館館主：炎岳\n「燃燒大地的男人」' },
    npcs: [
      { x: 12, y: 1, spr: 'hiker', dir: 0, say: '炎岳用的是\n火和岩地屬性萌獸。\n水屬性招式最有效！' },
    ],
    triggers: [{ x: 9, y: 1, run: 'badgeGate' }, { x: 10, y: 1, run: 'badgeGate' }],
  },
  gym4: {
    name: '熔岩鎮道館', music: 'gym', tint: '#ffc0a0', w: 10,
    rows: [
      'XXXXXXXXXX',
      'Xv______vX',
      'X_gggggg_X',
      'X_g_vv_g_X',
      'X_g____g_X',
      'X_gg__gg_X',
      'Xv______vX',
      'X________X',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [
      { x: 2, y: 4, spr: 'hiker', dir: 3, sight: 4, trainer: T('火山', '登山客', 'hiker', [['rock1', 28], ['candle', 29]], 600, '感受大地的熱度吧！', '冷卻下來了…') },
      { x: 4, y: 1, spr: 'leader4', dir: 0, leader: 3, trainer: T('炎岳', '道館館主', 'leader4', [['candle', 30], ['mole2', 31], ['rock2', 32], ['kuri2', 33]], 3600,
        '我是熔岩鎮館主炎岳！\n大地之火會把一切燒盡！\n來吧！', '哈哈哈！痛快！\n熔岩徽章是你的了！') },
    ],
  },

  // ================= 冠軍之路 =================
  route5: {
    name: '冠軍之路', music: 'route', outdoor: true, enc: 'route5', border: 'T',
    rows: [
      'TTTTTTTTTTTTTTTTTTTT',
      'TTT.ZZZZZZZZZZZZ.TTT',
      'TTT.ZZZZZZZZZZZZ.TTT',
      'TTT.WWWnnGnnWWWW.TTT',
      'TTT......==......TTT',
      'T,,,,....==....,,,,T',
      'T,,,,....==....,,,,T',
      'T..rr....==....rr..T',
      'T......====........T',
      'T,,,,,,==.....,,,,,T',
      'T,,,,,,==.....,,,,,T',
      'T....,,==..r..,,...T',
      'T......=====.......T',
      'T..A.......==...,,,T',
      'T..........==...,,,T',
      'T,,,,......==......T',
      'T,,,,......==......T',
      'T..........==......T',
      'T.........==.......T',
      'T.........==.......T',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    links: { s: 'town5' },
    warps: { '9,3': ['champ', 4, 8] },
    signs: {},
    npcs: [
      { x: 14, y: 8, spr: 'man', dir: 2, sight: 4, trainer: T('阿哲', '王牌訓練家', 'man', [['chirp2', 33], ['mole2', 33], ['fluff2', 34]], 1100, '能走到這裡的\n都是高手！', '你一定能成為冠軍！') },
      { x: 5, y: 16, spr: 'lady', dir: 3, sight: 4, trainer: T('莉莉', '王牌訓練家', 'lady', [['owl2', 34], ['shroom2', 34], ['shrimp2', 35]], 1100, '冠軍之路的最後考驗！', '真是厲害…') },
      { x: 3, y: 12, spr: 'old', dir: 0, hide: (g) => !g.flags.champion || g.flags.legend, say: '旁邊的祭壇…\n聽說成為冠軍的人\n靠近時會有雷聲響起…' },
    ],
    events: { '3,13': 'legend' },
  },
  champ: {
    name: '冠軍殿堂', music: 'gym', tint: '#e8d8ff', w: 10,
    rows: [
      'XXXXXXXXXX',
      'Xv__gg__vX',
      'X___gg___X',
      'Xv__gg__vX',
      'X___gg___X',
      'Xv__gg__vX',
      'X___gg___X',
      'X___gg___X',
      'X________X',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [{ x: 4, y: 1, spr: 'rival', dir: 0, run: 'champion' }],
  },

  // ================= 共用室內 =================
  center: {
    name: '夥伴中心', music: 'center',
    rows: [
      'XXXXXXXXXX',
      'Xp______BX',
      'X__CCCCC_X',
      'X________X',
      'X________X',
      'Xt______pX',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [{ x: 5, y: 1, spr: 'nurse', dir: 0, run: 'nurse' }],
  },
  shop: {
    name: '萌獸商店', music: 'center',
    rows: [
      'XXXXXXXXXX',
      'X___LLLLLX',
      'XCCC_____X',
      'X________X',
      'X_____tt_X',
      'X________X',
      'X___MM___X',
      'XXXXXXXXXX',
    ],
    npcs: [
      { x: 2, y: 1, spr: 'clerk', dir: 0, run: 'shop' },
      { x: 6, y: 3, spr: 'boy', dir: 2, say: '強力球比一般的球\n更容易抓到萌獸喔！' },
    ],
  },
};

// 對手：選了跟主角相剋的萌獸
function rivalStarter(g) { return { kuri1: 'foca', foca1: 'mossy', mossy1: 'kuri' }[g.flags.starter]; }

const HOUSE_TALK = {
  town1: '我是隔壁的叔叔。\n聽說你要去冒險了？\n記得常回來看媽媽喔！',
  town2: '我家萌獸最愛吃\n青石鎮的青苔餅乾。',
  town4: '雷光市的夜景很漂亮，\n全靠電屬性萌獸呢。',
  town5: '熔岩鎮的溫泉蛋\n是這裡的名產喔！',
};

// ---------------- 劇情腳本 ----------------
const SCRIPTS = {
  async needStarter(g) {
    if (g.flags.starter) return;
    await g.say('「等一下！」');
    await g.say('外面的草叢裡\n有野生萌獸！\n沒有夥伴很危險的！');
    await g.say('先去鎮上的\n萌獸研究所找博士吧！\n（就在右下角的大房子）');
    await g.stepPlayer(2);
  },
  async mom(g) {
    if (!g.flags.starter) {
      await g.say(`媽媽：${g.p.name}，\n博士在研究所找你喔！\n今天是你的旅行日呢。`);
      return;
    }
    await g.say(`媽媽：${g.p.name}，\n累了吧？休息一下。`);
    g.healParty();
    g.sfx('heal');
    await g.wait(40);
    await g.say('萌獸們都恢復精神了！\n路上小心喔！');
    g.setRespawn('home', 4, 5, 'town1', 4, 5);
  },
  async houseTalk(g) {
    await g.say(HOUSE_TALK[g.ret && g.ret.map] || '你好啊，旅行者。');
  },
  async prof(g) {
    if (!g.flags.starter) {
      await g.say(`博士：喔，${g.p.name}，\n你來啦！`);
      await g.say('這個世界住著\n各種神奇的生物——\n我們叫牠們「萌獸」。');
      await g.say('今天就讓你從這三隻\n萌獸裡選一隻，\n當作第一個夥伴吧！');
      const choices = ['kuri1', 'mossy1', 'foca1'];
      for (;;) {
        const i = await g.chooseStarter(choices);
        const id = choices[i];
        const sp = SPECIES[id];
        await g.say(`${TYPE_NAME[sp.t[0]]}屬性的${sp.n}。\n${sp.d}`);
        const ok = await g.ask(`就決定是${sp.n}了嗎？`);
        if (!ok) continue;
        const mon = makeMon(id, 5);
        g.p.party.push(mon);
        g.dexCatch(id);
        g.flags.starter = id;
        g.sfx('get');
        await g.say(`${g.p.name}得到了\n${sp.n}！`);
        break;
      }
      const rs = rivalStarter(g) + '1';
      await g.say(`${g.p.rival}：那我要這隻！\n${SPECIES[rs].n}就是我的了！`);
      await g.say(`${g.p.rival}：嘿嘿，\n剛拿到萌獸就來\n比一場吧！`);
      const won = await g.trainerBattle(T(g.p.rival, '勁敵', 'rival', [[rs, 5]], 100, '', '可惡，竟然輸了！'), { canLose: true });
      g.flags.rival1 = 1;
      await g.say(won ? `${g.p.rival}：哼，下次絕對\n不會輸給你！` : `${g.p.rival}：哈哈，\n我果然比較強！`);
      g.healParty();
      await g.say(`博士：兩個人都很棒！\n${g.p.name}，這些給你。`);
      g.addItem('ball', 5); g.addItem('potion', 3);
      g.sfx('get');
      await g.say('得到了捕獸球 x5\n和回復噴霧 x3！');
      await g.say('把野生萌獸的體力\n打到剩下一點，\n再丟捕獸球就能抓到。');
      await g.say('按 START（Enter）\n可以打開選單，\n記得常常存檔喔！');
      await g.say('去吧！收集萌獸，\n挑戰四座道館，\n成為冠軍吧！');
      return;
    }
    const n = g.p.caught.length;
    await g.say(`博士：你已經抓到了\n${n} 種萌獸！`);
    if (n >= DEX_ORDER.length - 1) await g.say('太了不起了！\n你根本是萌獸博士！');
    else if (n >= 15) await g.say('進步神速！\n繼續加油！');
    else await g.say('世界上還有很多\n萌獸等著你喔！');
  },
  async nurse(g) {
    await g.say('歡迎來到夥伴中心！\n讓你的萌獸休息吧。');
    g.healParty();
    g.sfx('heal');
    g.music('heal');
    await g.wait(90);
    g.music(g.map.music);
    g.setRespawn('center', 5, 4, g.ret.map, g.ret.x, g.ret.y);
    await g.say('萌獸們都恢復健康了！\n歡迎再來喔！');
  },
  async shop(g) {
    await g.say('歡迎光臨！\n需要什麼嗎？');
    await g.openShop();
  },
  async rival2(g) {
    if (g.flags.rival2) return;
    const rs = rivalStarter(g);
    await g.rivalWalkIn();
    await g.say(`${g.p.rival}：喲！\n${g.p.name}！你也拿到\n徽章了嗎？`);
    await g.say(`${g.p.rival}：讓我看看你\n變強了多少吧！`);
    const won = await g.trainerBattle(T(g.p.rival, '勁敵', 'rival', [['chirp1', 11], ['mouse1', 11], [rs + '2', 14]], 400, '', '什麼！又輸了？'));
    if (!won) return;
    g.flags.rival2 = 1;
    await g.say(`${g.p.rival}：哼，算你厲害。\n我先走了，\n下次再分勝負！`);
    await g.rivalWalkOut();
  },
  async rival3(g) {
    if (g.flags.rival3) return;
    const rs = rivalStarter(g);
    await g.rivalWalkIn();
    await g.say(`${g.p.rival}：${g.p.name}！\n我已經有三個徽章了！`);
    const won = await g.trainerBattle(T(g.p.rival, '勁敵', 'rival', [['chirp2', 25], ['mole1', 24], ['fluff2', 25], [rs + '2', 28]], 900, '', '可惡…你到底\n是怎麼練的？'));
    if (!won) return;
    g.flags.rival3 = 1;
    await g.say(`${g.p.rival}：我會在冠軍殿堂\n等你的！`);
    await g.rivalWalkOut();
  },
  async badgeGate(g) {
    if (g.p.badges.length >= 4) return;
    await g.say('守衛：前面是冠軍之路。\n沒有四個徽章的話\n不能通過！');
    await g.say(`你現在有 ${g.p.badges.length} 個徽章。`);
    await g.stepPlayer(2);
  },
  async champion(g) {
    if (g.flags.champion) {
      await g.say(`${g.p.rival}：冠軍大人，\n要再比一場嗎？`);
      if (!(await g.ask('要再對戰一次嗎？'))) return;
    } else {
      await g.say(`${g.p.rival}：你終於來了，\n${g.p.name}。`);
      await g.say(`${g.p.rival}：我打敗了所有人，\n成為了冠軍。\n最後只剩下你！`);
      await g.say(`${g.p.rival}：從拿到第一隻萌獸\n那天開始，我就一直\n等著這一刻！`);
    }
    const rs = rivalStarter(g);
    const won = await g.trainerBattle(T(g.p.rival, '冠軍', 'rival', [['chirp2', 37], ['fluff2', 37], ['mole2', 38], ['owl2', 38], ['shroom2', 39], [rs + '3', 41]], 8000, '', '…我輸了。\n你才是真正的冠軍。'), { champion: 1 });
    if (!won) return;
    if (!g.flags.champion) {
      g.flags.champion = 1;
      await g.say(`${g.p.rival}：恭喜你，\n${g.p.name}。`);
      await g.say(`${g.p.rival}：新的冠軍誕生了！\n你和萌獸們的羈絆，\n真的很強。`);
      await g.ending();
    }
  },
  async legend(g) {
    if (!g.flags.champion || g.flags.legend) return;
    await g.say('轟隆隆——！\n天空突然響起雷聲！');
    g.flash(30);
    await g.wait(30);
    await g.say('一道閃電劈在祭壇上，\n有什麼東西\n從雷光中走了出來…');
    const r = await g.wildBattle('legend', 50, { legend: 1 });
    g.flags.legend = 1;
    if (r !== 'caught') await g.say('雷霆麒麟消失在\n雲層之中了…');
  },
};
