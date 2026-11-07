'use strict';
// 萌獸大冒險：遊戲核心（畫面堆疊、對話框、選單、地圖行走、選單畫面、存檔）

const SW = 160, SH = 144;
const FONT = '12px Cubic11, "Noto Sans TC", "Microsoft JhengHei", sans-serif';
const INK = '#202028', PAPER = '#f8f8f0';
const WALKABLE = new Set('.,=*_MgDPQGOok'.split(''));
const DIRS = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // 下 上 左 右
const OPP = [1, 0, 3, 2];

function drawBox(ctx, x, y, w, h) {
  ctx.fillStyle = INK; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAPER; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = INK; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = PAPER; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
}
function drawText(ctx, s, x, y, col) {
  ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = col || INK;
  ctx.fillText(s, x, y);
}
function textW(ctx, s) { ctx.font = FONT; return ctx.measureText(s).width; }
function drawHpBar(ctx, x, y, w, r) {
  ctx.fillStyle = INK; ctx.fillRect(x, y, w + 2, 4);
  ctx.fillStyle = '#e8e8e0'; ctx.fillRect(x + 1, y + 1, w, 2);
  ctx.fillStyle = r > .5 ? '#48c048' : r > .2 ? '#f0c020' : '#e83830';
  ctx.fillRect(x + 1, y + 1, Math.max(r > 0 ? 1 : 0, Math.round(w * r)), 2);
}
// 3x5 小數字（HP 數字用）
const _DIG = { '0': '75557', '1': '26227', '2': '71747', '3': '71717', '4': '55711', '5': '74717', '6': '74757', '7': '71122', '8': '75757', '9': '75717', '/': '11244' };
function drawSmallNum(ctx, s, x, y, col) {
  ctx.fillStyle = col || INK;
  for (const ch of String(s)) {
    const p = _DIG[ch];
    if (p) for (let r = 0; r < 5; r++) { const v = Number(p[r]); for (let c = 0; c < 3; c++) if (v & (4 >> c)) ctx.fillRect(x + c, y + r, 1, 1); }
    x += 4;
  }
}
function drawArrow(ctx, x, y) {
  ctx.fillStyle = INK;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 1, 7 - i * 2);
}
function wrapText(ctx, s, maxW) {
  const out = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const ch of para) {
      if (textW(ctx, line + ch) > maxW) { out.push(line); line = ch; } else line += ch;
    }
    out.push(line);
  }
  return out;
}

// ================= 對話框 =================
class TextScene {
  constructor(g, text, opt = {}) {
    this.lines = wrapText(g.ctx, text, 142);
    this.page = 0; this.chars = 0; this.opt = opt; this.done = false;
  }
  pageLines() { return this.lines.slice(this.page * 2, this.page * 2 + 2); }
  update(g) {
    const total = this.pageLines().join('').length;
    if (this.chars < total) {
      this.chars += g.held.a || g.held.b ? 3 : 1;
      if ((g.btn('a') || g.btn('b')) && this.chars > 2) this.chars = total;
      return;
    }
    const last = (this.page + 1) * 2 >= this.lines.length;
    if (last && this.opt.keep) { if (!this.done) { this.done = true; this._res && this._res(this); } return; }
    if (g.btn('a') || g.btn('b')) {
      g.sfx('blip');
      if (last) g.pop(this);
      else { this.page++; this.chars = 0; }
    }
  }
  draw(ctx, g) {
    drawBox(ctx, 0, 96, SW, 48);
    let left = Math.floor(this.chars);
    this.pageLines().forEach((ln, i) => {
      drawText(ctx, ln.slice(0, Math.max(0, left)), 8, 104 + i * 16);
      left -= ln.length;
    });
    const total = this.pageLines().join('').length;
    if (this.chars >= total && !this.opt.keep && (g.frame >> 4) % 2 === 0) {
      ctx.fillStyle = INK; ctx.fillRect(148, 134, 5, 1); ctx.fillRect(149, 135, 3, 1); ctx.fillRect(150, 136, 1, 1);
    }
  }
}

// ================= 選單 =================
class MenuScene {
  // items: 字串陣列；opt: x,y,w,cols,cancel(按 B 回傳 -1),sel,info(ctx,i),noBox
  constructor(g, items, opt = {}) {
    this.items = items; this.o = opt; this.sel = opt.sel || 0;
    this.cols = opt.cols || 1;
    this.rows = Math.ceil(items.length / this.cols);
    this.w = opt.w || Math.max(...items.map((s) => textW(g.ctx, s))) + 24;
    this.h = this.rows * 16 + 10;
    this.x = opt.x !== undefined ? opt.x : SW - this.w;
    this.y = opt.y !== undefined ? opt.y : 0;
    this.top = 0; this.maxRows = opt.maxRows || 99;
    if (this.rows > this.maxRows) this.h = this.maxRows * 16 + 10;
    if (opt.h) this.h = opt.h;
  }
  update(g) {
    const n = this.items.length, c = this.cols;
    let s = this.sel;
    if (g.rep('up')) s = s - c >= 0 ? s - c : (c === 1 ? n - 1 : s);
    if (g.rep('down')) s = s + c < n ? s + c : (c === 1 ? 0 : s);
    if (c > 1 && g.rep('left') && s % c > 0) s--;
    if (c > 1 && g.rep('right') && s % c < c - 1 && s + 1 < n) s++;
    if (s !== this.sel) { this.sel = s; g.sfx('blip'); if (this.o.onMove) this.o.onMove(s); }
    const r = Math.floor(this.sel / c);
    if (r < this.top) this.top = r;
    if (r >= this.top + this.maxRows) this.top = r - this.maxRows + 1;
    if (g.btn('a')) { g.sfx('blip'); g.pop(this, this.sel); }
    else if (g.btn('b') && this.o.cancel !== false) { g.sfx('blip'); g.pop(this, -1); }
  }
  draw(ctx, g) {
    if (!this.o.noBox) drawBox(ctx, this.x, this.y, this.w, this.h);
    const colW = (this.w - 8) / this.cols;
    for (let i = 0; i < this.items.length; i++) {
      const r = Math.floor(i / this.cols) - this.top;
      if (r < 0 || r >= this.maxRows) continue;
      const cx = this.x + 6 + (i % this.cols) * colW, cy = this.y + 5 + r * 16;
      drawText(ctx, this.items[i], cx + 8, cy + 1);
      if (i === this.sel) drawArrow(ctx, cx, cy + 4);
    }
    if (this.top > 0) { ctx.fillStyle = INK; ctx.fillRect(this.x + this.w - 9, this.y + 4, 3, 2); }
    if (this.top + this.maxRows < this.rows) { ctx.fillStyle = INK; ctx.fillRect(this.x + this.w - 9, this.y + this.h - 6, 3, 2); }
    if (this.o.info) this.o.info(ctx, this.sel);
  }
}

// 數量選擇（商店）
class QtyScene {
  constructor(g, price, max) { this.n = 1; this.price = price; this.max = Math.max(1, max); }
  update(g) {
    if (g.rep('up')) this.n = this.n >= this.max ? 1 : this.n + 1;
    if (g.rep('down')) this.n = this.n <= 1 ? this.max : this.n - 1;
    if (g.rep('right')) this.n = Math.min(this.max, this.n + 10);
    if (g.rep('left')) this.n = Math.max(1, this.n - 10);
    if (g.btn('a')) g.pop(this, this.n);
    if (g.btn('b')) g.pop(this, 0);
  }
  draw(ctx) {
    drawBox(ctx, 64, 64, 96, 32);
    drawText(ctx, `x${String(this.n).padStart(2, '0')}`, 72, 74);
    drawText(ctx, `$${this.n * this.price}`, 106, 74);
  }
}

// ================= 遊戲主體 =================
class Game {
  constructor(canvas, env) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.env = env || {};
    this.held = {}; this.pressed = {}; this.repT = {};
    this.frame = 0; this.scenes = []; this.timers = [];
    this.busy = 0; this.flashT = 0; this.fade = 0;
    this.p = null; this.flags = {};
    this.world = new World(this);
  }
  // ---- 按鍵 ----
  keyDown(b) { if (!this.held[b]) { this.pressed[b] = true; this.repT[b] = 0; } this.held[b] = true; }
  keyUp(b) { this.held[b] = false; }
  btn(b) { return !!this.pressed[b]; }
  rep(b) { return !!this.pressed[b] || (this.held[b] && this.repT[b] > 16 && this.repT[b] % 5 === 0); }
  // ---- 畫面堆疊 ----
  push(sc) { return new Promise((res) => { sc._res = res; this.scenes.push(sc); }); }
  pop(sc, v) {
    const i = this.scenes.indexOf(sc);
    if (i >= 0) this.scenes.splice(i, 1);
    if (sc._res) { const r = sc._res; sc._res = null; r(v); }
  }
  wait(n) { return new Promise((res) => this.timers.push({ t: n, res })); }
  tick() {
    for (const b in this.held) if (this.held[b]) this.repT[b]++;
    const ts = this.timers; this.timers = [];
    for (const t of ts) { if (--t.t <= 0) t.res(); else this.timers.push(t); }
    const top = this.scenes[this.scenes.length - 1];
    if (top) top.update(this);
    this.pressed = {};
    this.draw();
    this.frame++;
    if (this.p) this.p.time++;
  }
  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SW, SH);
    let start = 0;
    for (let i = this.scenes.length - 1; i >= 0; i--) if (this.scenes[i].opaque) { start = i; break; }
    for (let i = start; i < this.scenes.length; i++) this.scenes[i].draw(ctx, this);
    if (this.fade > 0) { ctx.fillStyle = `rgba(16,16,24,${Math.min(1, this.fade)})`; ctx.fillRect(0, 0, SW, SH); }
    if (this.flashT > 0) { this.flashT--; if ((this.flashT >> 2) % 2 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, SW, SH); } }
  }
  // ---- 聲音 ----
  sfx(n) { if (this.env.audio) this.env.audio.sfx(n); }
  music(n) { if (this.env.audio) this.env.audio.music(n); }
  flash(n) { this.flashT = n; }
  async fadeOut(n = 10) { for (let i = 1; i <= n; i++) { this.fade = i / n; await this.wait(1); } }
  async fadeIn(n = 10) { for (let i = n - 1; i >= 0; i--) { this.fade = i / n; await this.wait(1); } }
  // ---- 對話與選擇 ----
  say(text) { return this.push(new TextScene(this, text)); }
  async ask(text, yes = '是', no = '否') {
    const t = new TextScene(this, text, { keep: 1 });
    await this.push(t);
    const i = await this.push(new MenuScene(this, [yes, no], { x: 112, y: 54, w: 48 }));
    this.pop(t);
    return i === 0;
  }
  async menu(text, items, opt = {}) {
    let t = null;
    if (text) { t = new TextScene(this, text, { keep: 1 }); await this.push(t); }
    const i = await this.push(new MenuScene(this, items, Object.assign({ y: text ? Math.max(0, 94 - (items.length * 16 + 10)) : 0 }, opt)));
    if (t) this.pop(t);
    return i;
  }
  async runScript(fn) {
    this.busy++;
    try { await fn(); } catch (e) { console.error(e); } finally { this.busy--; }
  }
  // ---- 玩家資料 ----
  newGame(name, rival) {
    this.p = { name, rival, party: [], box: [], bag: {}, money: 3000, badges: [], seen: [], caught: [], time: 0,
      map: 'home', x: 6, y: 2, dir: 0, ret: null, respawn: { map: 'home', x: 4, y: 5, ret: { map: 'town1', x: 4, y: 5 } }, flags: {} };
    this.flags = this.p.flags;
  }
  get ret() { return this.p.ret; }
  addItem(id, n = 1) { this.p.bag[id] = (this.p.bag[id] || 0) + n; }
  useItem(id) { if (--this.p.bag[id] <= 0) delete this.p.bag[id]; }
  dexSee(id) { if (!this.p.seen.includes(id)) this.p.seen.push(id); }
  dexCatch(id) { this.dexSee(id); if (!this.p.caught.includes(id)) this.p.caught.push(id); }
  healParty() { for (const m of this.p.party) healMon(m); }
  setRespawn(map, x, y, rmap, rx, ry) { this.p.respawn = { map, x, y, ret: { map: rmap, x: rx, y: ry } }; }
  save() {
    const w = this.world;
    Object.assign(this.p, { map: w.mapId, x: w.px, y: w.py, dir: w.pdir });
    try { this.env.storage && this.env.storage.setItem('moemon_save', JSON.stringify(this.p)); return true; } catch (e) { return false; }
  }
  loadSave() {
    try {
      const s = this.env.storage && this.env.storage.getItem('moemon_save');
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  // ---- 劇情用 ----
  get map() { return this.world.map; }
  async stepPlayer(n) {
    for (let i = 0; i < n; i++) await this.world.scriptMove(null, 0);
  }
  async rivalWalkIn() {
    const w = this.world;
    const npc = w.addTempNpc('rival', w.px, w.py - 4, 0);
    this.music('rival');
    while (npc.y < w.py - 1) await w.scriptMove(npc, 0);
    w.pdir = 1;
    this._rival = npc;
  }
  async rivalWalkOut() {
    const w = this.world, npc = this._rival;
    if (!npc) return;
    for (let i = 0; i < 5; i++) await w.scriptMove(npc, 1, true);
    w.removeNpc(npc);
    this._rival = null;
    this.music(w.map.music);
  }
  async chooseStarter(ids) { return this.push(new StarterScene(this, ids)); }
  async openShop() {
    const stock = ['ball', 'potion', 'fullheal'];
    const b = this.p.badges.length;
    if (b >= 1) stock.push('gball', 'spotion');
    if (b >= 2) stock.push('revive');
    if (b >= 3) stock.push('uball', 'hpotion');
    stock.sort((a, c) => ITEM_ORDER.indexOf(a) - ITEM_ORDER.indexOf(c));
    let sel = 0;
    for (;;) {
      const items = stock.map((k) => ITEMS[k].n).concat(['離開']);
      const sc = new MenuScene(this, items, { x: 0, y: 0, w: 160, sel, maxRows: 5,
        info: (ctx, i) => {
          drawBox(ctx, 0, 96, 160, 48);
          if (i < stock.length) {
            drawText(ctx, `$${ITEMS[stock[i]].price}`, 112, 6 + (i - sc.top) * 16, INK);
            wrapText(ctx, ITEMS[stock[i]].d, 142).slice(0, 2).forEach((l, k) => drawText(ctx, l, 8, 104 + k * 16));
          } else drawText(ctx, '謝謝光臨！', 8, 104);
          drawBox(ctx, 96, 72, 64, 24); drawText(ctx, `$${this.p.money}`, 102, 78);
        } });
      const i = await this.push(sc);
      if (i < 0 || i >= stock.length) break;
      sel = i;
      const it = ITEMS[stock[i]];
      const max = Math.min(99, Math.floor(this.p.money / it.price));
      if (max <= 0) { await this.say('錢不夠喔！'); continue; }
      const n = await this.push(new QtyScene(this, it.price, max));
      if (!n) continue;
      if (await this.ask(`${it.n} x${n}，\n一共 $${n * it.price}。\n可以嗎？`)) {
        this.p.money -= n * it.price;
        this.addItem(stock[i], n);
        this.sfx('buy');
        await this.say('謝謝惠顧！');
        if (stock[i] === 'ball' && n >= 10) { this.addItem('gball', 1); await this.say('買很多送你一顆\n強力球！'); }
      }
    }
    await this.say('歡迎再來！');
  }
  // ---- 對戰 ----
  async wildBattle(id, lv, opt = {}) {
    const mon = makeMon(id, lv);
    this.dexSee(id);
    const b = new Battle(this, { wild: mon, legend: opt.legend });
    const r = await this.push(b);
    return this.afterBattle(r, opt);
  }
  async trainerBattle(tr, opt = {}) {
    const team = tr.team.map(([id, lv]) => makeMon(id, lv));
    const b = new Battle(this, { trainer: tr, team, champion: opt.champion });
    const r = await this.push(b);
    await this.afterBattle(r, opt);
    return r === 'win';
  }
  async afterBattle(r, opt) {
    this.music(this.map.music);
    // 進化
    for (const m of this.p.party) {
      if (m._evo && m.hp > 0) { delete m._evo; await this.push(new EvoScene(this, m)); }
      delete m._evo;
    }
    if (r === 'lose') {
      if (opt.canLose) { this.healParty(); return r; }
      await this.say(`${this.p.name}沒有可以戰鬥的萌獸了…`);
      const lost = Math.min(this.p.money, 10000); // 全滅最多扣 1 萬
      this.p.money -= lost;
      await this.say(`${this.p.name}慌張地掉了\n$${lost}……\n眼前一片漆黑！`);
      await this.fadeOut(20);
      const rs = this.p.respawn;
      this.p.ret = Object.assign({}, rs.ret);
      this.world.load(rs.map, rs.x, rs.y, 1);
      this.healParty();
      await this.fadeIn(20);
      await this.say('萌獸們都恢復精神了。\n下次要小心喔！');
    }
    return r;
  }
  async ending() {
    await this.push(new EndingScene(this));
    this.save();
    await this.say('（已自動存檔）\n冠軍之路的祭壇…\n好像有什麼動靜？');
  }
  // ---- 開始 ----
  start() {
    this.scenes = [];
    this.push(new TitleScene(this));
  }
  async beginNew() {
    this.music('intro');
    const intro = new IntroScene(this);
    this.push(intro);
    const say = (t) => this.say(t);
    await say('歡迎來到萌獸的世界！');
    await say('我是萌獸研究所的\n山田博士。');
    intro.show = 'chirp1';
    await say('這個世界住著許多\n叫做「萌獸」的生物。');
    await say('人們和萌獸\n一起生活、一起冒險，\n成為最好的夥伴。');
    intro.show = null;
    await say('那麼，請告訴我\n你的名字吧！');
    let name = await this.askName('你的名字是？', '小勇');
    await say(`${name}，對吧！`);
    intro.show = 'rival';
    await say('這是我的孫子。\n從小就跟你較勁呢。\n他叫什麼名字來著？');
    const rival = await this.askName('勁敵的名字是？', '阿傑');
    await say(`對了，他叫${rival}！`);
    intro.show = null;
    await say(`${name}！屬於你的\n萌獸傳說即將展開！\n出發吧！`);
    await this.fadeOut(20);
    this.pop(intro);
    this.newGame(name, rival);
    this.enterWorld();
    await this.fadeIn(20);
  }
  async askName(q, def) {
    let s = def;
    if (this.env.askName) s = await this.env.askName(q, def);
    s = (s || '').trim().slice(0, 6);
    return s || def;
  }
  continueGame(data) {
    this.p = data; this.flags = data.flags;
    this.enterWorld();
  }
  enterWorld() {
    this.scenes = [this.world];
    this.world._res = null;
    this.world.load(this.p.map, this.p.x, this.p.y, this.p.dir);
  }
}

// ================= 地圖 =================
class World {
  constructor(g) { this.g = g; this.opaque = true; this.npcs = []; this.anim = 0; this.bubble = null; this.nameT = 0; }
  load(id, x, y, dir) {
    const g = this.g, m = MAPS[id];
    this.mapId = id; this.map = m;
    this.h = m.rows.length; this.w = m.rows[0].length;
    this.px = x; this.py = y; this.pdir = dir || 0;
    this.pmove = null; this.walkF = 0;
    this.npcs = [];
    (m.npcs || []).forEach((d, i) => {
      if (d.hide && d.hide(g)) return;
      this.npcs.push({ d, id: `${id}:${i}`, x: d.x, y: d.y, hx: d.x, hy: d.y, dir: d.dir || 0, spr: d.spr, mv: null, wt: 60 + Math.floor(Math.random() * 120) });
    });
    if (g.p) { g.p.map = id; g.p.x = x; g.p.y = y; }
    g.music(m.music);
    if (m.outdoor && this.lastName !== m.name) this.nameT = 100;
    this.lastName = m.name;
    this.stepsSinceEnc = 0;
  }
  addTempNpc(spr, x, y, dir) { const n = { d: {}, id: 'tmp', x, y, hx: x, hy: y, dir, spr, mv: null, wt: 1e9, temp: 1 }; this.npcs.push(n); return n; }
  removeNpc(n) { this.npcs = this.npcs.filter((k) => k !== n); }
  tile(x, y) {
    const m = this.map;
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) return m.rows[y][x];
    // 地圖外：如果那邊有接別張地圖就畫那張的格子
    const L = m.links || {};
    if (y < 0 && L.n && x >= 0 && x < this.w) { const o = MAPS[L.n]; const r = o.rows[o.rows.length + y]; if (r) return r[x]; }
    if (y >= this.h && L.s && x >= 0 && x < this.w) { const o = MAPS[L.s]; const r = o.rows[y - this.h]; if (r) return r[x]; }
    return m.border || 'X';
  }
  npcAt(x, y) { return this.npcs.find((n) => n.x === x && n.y === y); }
  passable(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    if (!WALKABLE.has(this.map.rows[y][x])) return false;
    if (this.npcAt(x, y)) return false;
    return true;
  }
  update(g) {
    this.anim++;
    if (this.nameT > 0) this.nameT--;
    // NPC 動畫與閒晃
    for (const n of this.npcs) {
      if (n.mv) {
        n.mv.t++;
        if (n.mv.t >= n.mv.dur) { n.mv = null; }
      } else if (n.d.wander && !g.busy && --n.wt <= 0) {
        n.wt = 90 + Math.floor(Math.random() * 150);
        const dir = Math.floor(Math.random() * 4), [dx, dy] = DIRS[dir];
        const nx = n.x + dx, ny = n.y + dy;
        n.dir = dir;
        if (Math.abs(nx - n.hx) <= 2 && Math.abs(ny - n.hy) <= 2 && this.passable(nx, ny) && !(nx === this.px && ny === this.py) && !this.playerTarget(nx, ny)) {
          n.x = nx; n.y = ny; n.mv = { dx, dy, t: 0, dur: 16 };
        }
      }
    }
    if (this.pmove) {
      const m = this.pmove;
      m.t++;
      if (m.t >= m.dur) {
        this.pmove = null;
        if (m.res) m.res(); else this.arrive();
      }
      return;
    }
    if (g.busy || g.scenes[g.scenes.length - 1] !== this) return;
    if (g.btn('start')) { g.sfx('blip'); g.runScript(() => startMenu(g)); return; }
    if (g.btn('a')) { this.interact(); return; }
    let dir = -1;
    if (g.held.down) dir = 0; else if (g.held.up) dir = 1; else if (g.held.left) dir = 2; else if (g.held.right) dir = 3;
    if (dir < 0) { this.turnT = 0; this.pmoveRecent = false; return; }
    if (dir !== this.pdir && !this.pmoveRecent) { this.pdir = dir; this.turnT = 6; return; }
    if (this.turnT > 0) { this.turnT--; if (this.turnT > 0) return; }
    this.pdir = dir;
    this.tryMove(dir, g.held.b);
  }
  playerTarget(x, y) { return false; }
  tryMove(dir, run) {
    const g = this.g, [dx, dy] = DIRS[dir];
    let nx = this.px + dx, ny = this.py + dy;
    const L = this.map.links || {};
    const out = nx < 0 || ny < 0 || nx >= this.w || ny >= this.h;
    if (out) {
      const k = ny < 0 ? 'n' : ny >= this.h ? 's' : nx < 0 ? 'w' : 'e';
      if (!L[k]) return this.bump();
      const o = MAPS[L[k]], oh = o.rows.length;
      const ty = k === 'n' ? oh - 1 : k === 's' ? 0 : ny;
      if (!WALKABLE.has(o.rows[ty][nx])) return this.bump();
      this.load(L[k], nx, k === 'n' ? oh : -1, dir);
      nx = this.px; ny = ty;
      this.px = nx; this.py = ty;
      this.pmove = { dx, dy, t: 0, dur: run ? 8 : 16 };
      this.walkF++;
      this.pmoveRecent = true;
      return;
    }
    if (!this.passable(nx, ny)) return this.bump();
    this.px = nx; this.py = ny;
    this.pmove = { dx, dy, t: 0, dur: run ? 8 : 16 };
    this.walkF++;
    this.pmoveRecent = true;
  }
  bump() {
    this.pmoveRecent = false;
    if (this.anim - (this.lastBump || -99) > 20) { this.g.sfx('bump'); this.lastBump = this.anim; }
  }
  // 劇情用：移動玩家或 NPC 一格（npc=null 表示玩家）
  scriptMove(npc, dir, ghost) {
    return new Promise((res) => {
      const [dx, dy] = DIRS[dir];
      if (!npc) {
        this.pdir = dir;
        if (!ghost && !this.passable(this.px + dx, this.py + dy)) return res();
        this.px += dx; this.py += dy;
        this.pmove = { dx, dy, t: 0, dur: 16, res }; this.walkF++;
      } else {
        npc.dir = dir; npc.x += dx; npc.y += dy;
        npc.mv = { dx, dy, t: 0, dur: 16 };
        this.g.wait(16).then(res);
      }
    });
  }
  arrive() {
    const g = this.g, ch = this.map.rows[this.py][this.px], key = `${this.px},${this.py}`;
    const warp = (this.map.warps || {})[key];
    if (warp || 'DPQGOoM'.includes(ch)) { g.runScript(() => this.doWarp(warp, ch)); return; }
    const trig = (this.map.triggers || []).find((t) => t.x === this.px && t.y === this.py);
    if (trig && SCRIPTS[trig.run]) { g.runScript(() => SCRIPTS[trig.run](g)); return; }
    if (this.checkSight()) return;
    if (this.map.enc && (ch === ',' || (this.map.encAll && ch === 'k'))) {
      const rate = this.map.encAll ? 14 : 10;
      this.stepsSinceEnc++;
      if (this.stepsSinceEnc > 2 && Math.random() * rate < 1 && g.p.party.some((m) => m.hp > 0)) {
        this.stepsSinceEnc = 0;
        const tbl = ENCOUNTERS[this.map.enc];
        let r = Math.random() * tbl.reduce((s, e) => s + e[3], 0);
        let e = tbl[0];
        for (const t of tbl) { r -= t[3]; if (r < 0) { e = t; break; } }
        const lv = e[1] + Math.floor(Math.random() * (e[2] - e[1] + 1));
        g.runScript(async () => { await battleIntro(g); await g.wildBattle(e[0], lv); });
      }
    }
  }
  async doWarp(warp, ch) {
    const g = this.g;
    let to, x, y, dir = this.pdir;
    if (warp) {
      [to, x, y] = warp;
      if (this.map.outdoor && !MAPS[to].outdoor && to !== 'cave') g.p.ret = { map: this.mapId, x: this.px, y: this.py + 1 };
    } else if (ch === 'M') {
      const r = g.p.ret || { map: 'town1', x: 4, y: 5 };
      [to, x, y] = [r.map, r.x, r.y]; dir = 0;
    } else if (ch === 'P' || ch === 'Q' || ch === 'G') {
      g.p.ret = { map: this.mapId, x: this.px, y: this.py + 1 };
      to = ch === 'P' ? 'center' : ch === 'Q' ? 'shop' : this.map.gym;
      const m = MAPS[to];
      x = 4; y = m.rows.length - 3;
    } else return;
    g.sfx('door');
    await g.fadeOut(8);
    this.load(to, x, y, dir);
    await g.fadeIn(8);
  }
  checkSight() {
    const g = this.g;
    for (const n of this.npcs) {
      const tr = n.d.trainer;
      if (!tr || !n.d.sight || g.flags['tr:' + n.id]) continue;
      const [dx, dy] = DIRS[n.dir];
      for (let k = 1; k <= n.d.sight; k++) {
        const x = n.x + dx * k, y = n.y + dy * k;
        if (x === this.px && y === this.py) {
          g.runScript(() => this.trainerApproach(n, k));
          return true;
        }
        if (!this.passable(x, y)) break;
      }
    }
    return false;
  }
  async trainerApproach(n, dist) {
    const g = this.g;
    g.music('trainer_eye');
    this.bubble = n; g.sfx('alert');
    await g.wait(40);
    this.bubble = null;
    for (let k = 1; k < dist; k++) await this.scriptMove(n, n.dir);
    this.pdir = OPP[n.dir];
    await this.fightTrainer(n);
  }
  async fightTrainer(n) {
    const g = this.g, tr = n.d.trainer;
    if (tr.pre) await g.say(tr.pre);
    const won = await g.trainerBattle(tr);
    if (!won) return;
    g.flags['tr:' + n.id] = 1;
    if (n.d.leader !== undefined) {
      const b = BADGES[n.d.leader];
      if (!g.p.badges.includes(b)) g.p.badges.push(b);
      g.sfx('badge');
      await g.say(`${g.p.name}得到了\n${b}！`);
      const tips = ['有了羽翼徽章，\n交換來的萌獸也會\n乖乖聽話喔。', '浪花徽章能讓\n萌獸更有自信！', '雷光徽章證明你\n是一流的訓練家！', '四個徽章到手了！\n北邊的冠軍之路\n在等著你！'];
      await g.say(`${tr.name}：${tips[n.d.leader]}`);
    }
  }
  interact() {
    const g = this.g, [dx, dy] = DIRS[this.pdir];
    let x = this.px + dx, y = this.py + dy;
    let n = this.npcAt(x, y);
    const ch = this.tile(x, y);
    if (!n && ch === 'C') { n = this.npcAt(x + dx, y + dy); }
    if (n && !n.temp) {
      g.sfx('blip');
      g.runScript(async () => {
        n.dir = OPP[this.pdir];
        const d = n.d;
        if (d.trainer) {
          if (!g.flags['tr:' + n.id]) await this.fightTrainer(n);
          else await g.say(d.trainer.post);
        } else if (d.run) await SCRIPTS[d.run](g, n);
        else if (d.say) await g.say(d.say);
      });
      return;
    }
    const key = `${x},${y}`;
    if (ch === 'S' && this.map.signs && this.map.signs[key]) { g.sfx('blip'); g.runScript(() => g.say(this.map.signs[key])); return; }
    if (this.map.events && this.map.events[key]) { g.runScript(() => SCRIPTS[this.map.events[key]](g)); return; }
    if (ch === 'B' && this.mapId === 'center') { g.sfx('blip'); g.runScript(() => pcMenu(g)); return; }
    if (ch === 'B' || ch === 'L') { g.runScript(() => g.say(ch === 'B' ? '電腦裡存著\n萌獸研究的資料。' : '書架上擺滿了\n萌獸的書。')); return; }
    if (ch === '~') { g.runScript(() => g.say('水面閃閃發亮。')); }
  }
  draw(ctx, g) {
    let ox = 0, oy = 0;
    if (this.pmove) { const m = this.pmove; ox = -m.dx * 16 * (1 - m.t / m.dur); oy = -m.dy * 16 * (1 - m.t / m.dur); }
    const camX = this.px * 16 + ox - 64, camY = this.py * 16 + oy - 64;
    const tx0 = Math.floor(camX / 16), ty0 = Math.floor(camY / 16);
    const wf = (this.anim >> 5) % 2;
    for (let ty = ty0; ty <= ty0 + 9; ty++) for (let tx = tx0; tx <= tx0 + 10; tx++) {
      const ch = this.tile(tx, ty);
      ctx.drawImage(tileImage(ch, ch === '~' ? wf : 0, this.map.tint), Math.round(tx * 16 - camX), Math.round(ty * 16 - camY));
    }
    // 人物（依 y 排序）
    const sprites = this.npcs.map((n) => {
      let nx = n.x * 16, ny = n.y * 16, f = 0;
      if (n.mv) { const k = 1 - n.mv.t / n.mv.dur; nx -= n.mv.dx * 16 * k; ny -= n.mv.dy * 16 * k; f = n.mv.t < n.mv.dur / 2 ? 1 + ((n.x + n.y) % 2) : 0; }
      return { y: ny, img: personFrames(n.spr)[n.dir][f], x: nx, n };
    });
    let pf = 0;
    if (this.pmove) pf = this.pmove.t < this.pmove.dur / 2 ? 1 + (this.walkF % 2) : 0;
    sprites.push({ y: this.py * 16 + oy, x: this.px * 16 + ox, img: personFrames('hero')[this.pdir][pf], me: 1 });
    sprites.sort((a, b) => a.y - b.y);
    for (const s of sprites) {
      const sx = Math.round(s.x - camX), sy = Math.round(s.y - camY) - 4;
      if (sx < -16 || sy < -16 || sx > SW || sy > SH) continue;
      ctx.drawImage(s.img, sx, sy);
      // 站在草叢裡：下半身被草蓋住
      const tch = s.me ? this.tile(this.px, this.py) : this.tile(s.n.x, s.n.y);
      if (tch === ',' && (!s.me || !this.pmove || this.pmove.t > 8)) {
        ctx.drawImage(tileImage(','), 0, 10, 16, 6, sx, sy + 14, 16, 6);
      }
      if (s.n && this.bubble === s.n) {
        drawBox(ctx, sx + 2, sy - 14, 12, 13); ctx.fillStyle = INK; ctx.fillRect(sx + 7, sy - 11, 2, 5); ctx.fillRect(sx + 7, sy - 5, 2, 2);
      }
    }
    if (this.nameT > 0) {
      const y = this.nameT > 90 ? -(this.nameT - 90) * 3 : this.nameT < 10 ? -(10 - this.nameT) * 3 : 0;
      const w = textW(ctx, this.map.name) + 16;
      drawBox(ctx, 4, 4 + y, w, 22); drawText(ctx, this.map.name, 12, 9 + y);
    }
  }
}

// ================= 各種畫面 =================
async function battleIntro(g) {
  g.music('wild');
  for (let i = 0; i < 3; i++) { g.flash(6); await g.wait(10); }
}

async function startMenu(g) {
  let sel = 0;
  for (;;) {
    const items = ['萌獸圖鑑', '萌獸', '背包', g.p.name, '存檔', '關閉'];
    if (!g.p.party.length) items.splice(0, 2);
    const i = await g.push(new MenuScene(g, items, { sel }));
    if (i < 0) return;
    sel = i;
    const k = items[i];
    if (k === '關閉') return;
    if (k === '萌獸圖鑑') await g.push(new DexScene(g));
    else if (k === '萌獸') await partyMenu(g);
    else if (k === '背包') await bagMenu(g, false);
    else if (k === g.p.name) await g.push(new CardScene(g));
    else if (k === '存檔') {
      if (await g.ask('要把目前的進度\n存起來嗎？')) {
        const ok = g.save();
        g.sfx(ok ? 'save' : 'bump');
        await g.say(ok ? `${g.p.name}把冒險\n記錄下來了！` : '存檔失敗了…\n（瀏覽器不允許存資料）');
      }
    }
  }
}

async function partyMenu(g) {
  let sel = 0;
  for (;;) {
    const i = await g.push(new PartyScene(g, { sel, msg: '要選哪一隻萌獸？' }));
    if (i < 0) return;
    sel = i;
    const c = await g.push(new MenuScene(g, ['能力', '換位置', '取消'], { x: 96, y: 72, w: 64 }));
    if (c === 0) await g.push(new SummaryScene(g, i));
    else if (c === 1 && g.p.party.length > 1) {
      const j = await g.push(new PartyScene(g, { sel: i, msg: '要跟哪一隻交換？', mark: i }));
      if (j >= 0 && j !== i) { const P = g.p.party; [P[i], P[j]] = [P[j], P[i]]; sel = j; }
    }
  }
}

// 背包：在戰鬥中回傳 {id, target}，平常直接使用
async function bagMenu(g, inBattle) {
  let sel = 0;
  for (;;) {
    const ids = ITEM_ORDER.filter((k) => g.p.bag[k] > 0);
    const items = ids.map((k) => `${ITEMS[k].n}`).concat(['關閉']);
    const sc = new MenuScene(g, items, { x: 0, y: 0, w: 160, sel, maxRows: 5,
      info: (ctx, i) => {
        for (let r = 0; r < Math.min(5, items.length - sc.top); r++) {
          const k = ids[r + sc.top];
          if (k) drawText(ctx, `x${g.p.bag[k]}`, 128, 6 + r * 16);
        }
        drawBox(ctx, 0, 96, 160, 48);
        if (ids[i]) wrapText(ctx, ITEMS[ids[i]].d, 142).slice(0, 2).forEach((l, k) => drawText(ctx, l, 8, 104 + k * 16));
      } });
    const i = await g.push(sc);
    if (i < 0 || i >= ids.length) return null;
    sel = i;
    const id = ids[i], it = ITEMS[id];
    if (it.ball) {
      if (inBattle) return { id };
      await g.say('現在不能用這個。'); continue;
    }
    const t = await g.push(new PartyScene(g, { msg: `要對誰使用${it.n}？` }));
    if (t < 0) continue;
    const m = g.p.party[t];
    const ok = await applyItem(g, id, m, inBattle);
    if (ok && inBattle) return { id, target: t };
  }
}

async function applyItem(g, id, m, inBattle) {
  const it = ITEMS[id], mx = maxHp(m), name = monName(m);
  if (it.heal) {
    if (m.hp <= 0 || m.hp >= mx) { await g.say('沒有效果。'); return false; }
    const before = m.hp;
    m.hp = Math.min(mx, m.hp + it.heal);
    g.useItem(id); g.sfx('heal');
    await g.say(`${name}回復了\n${m.hp - before} 點 HP！`);
    return true;
  }
  if (it.cure) {
    if (!m.st || m.hp <= 0) { await g.say('沒有效果。'); return false; }
    m.st = null; m.slp = 0;
    g.useItem(id); g.sfx('heal');
    await g.say(`${name}的狀態\n恢復正常了！`);
    return true;
  }
  if (it.revive) {
    if (m.hp > 0) { await g.say('沒有效果。'); return false; }
    m.hp = Math.floor(mx * it.revive); m.st = null;
    g.useItem(id); g.sfx('heal');
    await g.say(`${name}醒過來了！`);
    return true;
  }
  return false;
}

async function pcMenu(g) {
  await g.say(`${g.p.name}打開了電腦。`);
  for (;;) {
    const i = await g.menu('要做什麼？', ['領出萌獸', '存放萌獸', '關閉'], { x: 88, w: 72 });
    if (i < 0 || i === 2) break;
    if (i === 0) {
      if (!g.p.box.length) { await g.say('箱子裡沒有萌獸。'); continue; }
      if (g.p.party.length >= 6) { await g.say('隊伍已經滿了！'); continue; }
      const items = g.p.box.map((m) => `${monName(m)} Lv${m.lv}`);
      const j = await g.push(new MenuScene(g, items, { x: 0, y: 0, w: 120, maxRows: 5 }));
      if (j < 0) continue;
      const m = g.p.box.splice(j, 1)[0];
      g.p.party.push(m);
      await g.say(`領出了${monName(m)}！`);
    } else {
      if (g.p.party.length <= 1) { await g.say('隊伍裡至少\n要留一隻萌獸！'); continue; }
      const j = await g.push(new PartyScene(g, { msg: '要存放哪一隻？' }));
      if (j < 0) continue;
      const m = g.p.party.splice(j, 1)[0];
      g.p.box.push(m);
      healMon(m);
      await g.say(`把${monName(m)}\n存進箱子了。`);
    }
  }
}

function drawMonIcon(ctx, id, x, y, size, frame) {
  const sp = monSprite(id).front;
  ctx.drawImage(sp, x, y + (frame ? 1 : 0), size, size);
}

class PartyScene {
  // opt: sel, msg, battle(不能選倒下的), mark
  constructor(g, opt = {}) { this.o = opt; this.sel = opt.sel || 0; this.opaque = true; }
  update(g) {
    const n = g.p.party.length;
    if (g.rep('up')) { this.sel = (this.sel + n - 1) % n; g.sfx('blip'); }
    if (g.rep('down')) { this.sel = (this.sel + 1) % n; g.sfx('blip'); }
    if (g.btn('a')) { g.sfx('blip'); g.pop(this, this.sel); }
    else if (g.btn('b') && !this.o.noCancel) { g.sfx('blip'); g.pop(this, -1); }
  }
  draw(ctx, g) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SW, SH);
    g.p.party.forEach((m, i) => {
      const y = i * 20 + 2, mx = maxHp(m);
      if (i === this.sel) { ctx.fillStyle = '#e0e8ff'; ctx.fillRect(0, y - 1, SW, 20); drawArrow(ctx, 2, y + 6); }
      if (i === this.o.mark) { ctx.fillStyle = '#ffe0a0'; ctx.fillRect(0, y - 1, 6, 20); }
      drawMonIcon(ctx, m.id, 8, y - 1, 20, i === this.sel && (g.frame >> 3) % 2);
      drawText(ctx, monName(m), 30, y);
      drawText(ctx, `Lv${m.lv}`, 92, y);
      if (m.st) drawText(ctx, STATUS_NAME[m.st], 126, y, '#c03030');
      else if (m.hp <= 0) drawText(ctx, '昏倒', 126, y, '#c03030');
      drawHpBar(ctx, 30, y + 13, 60, m.hp / mx);
      drawSmallNum(ctx, `${m.hp}/${mx}`, 96, y + 11);
    });
    drawBox(ctx, 0, 122, SW, 22);
    drawText(ctx, this.o.msg || '', 8, 127);
  }
}

class SummaryScene {
  constructor(g, i) { this.i = i; this.page = 0; this.opaque = true; }
  update(g) {
    const n = g.p.party.length;
    if (g.rep('up')) this.i = (this.i + n - 1) % n;
    if (g.rep('down')) this.i = (this.i + 1) % n;
    if (g.rep('left') || g.rep('right')) this.page ^= 1;
    if (g.btn('a')) this.page ^= 1;
    if (g.btn('b')) g.pop(this);
  }
  draw(ctx, g) {
    const m = g.p.party[this.i], s = SPECIES[m.id], st = calcStats(m);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SW, SH);
    ctx.drawImage(monSprite(m.id).front, 4, 4);
    drawText(ctx, `No.${String(DEX_ORDER.indexOf(m.id) + 1).padStart(3, '0')}`, 50, 4);
    drawText(ctx, monName(m), 50, 20);
    drawText(ctx, `Lv${m.lv}`, 120, 20);
    s.t.forEach((t, k) => { ctx.fillStyle = TYPE_COLOR[t]; ctx.fillRect(50 + k * 40, 37, 36, 13); drawText(ctx, TYPE_NAME[t], 52 + k * 40, 38, '#fff'); });
    ctx.fillStyle = INK; ctx.fillRect(0, 54, SW, 1);
    if (this.page === 0) {
      drawText(ctx, 'HP', 8, 60); drawHpBar(ctx, 30, 64, 60, m.hp / st.hp); drawText(ctx, `${m.hp}/${st.hp}`, 98, 60);
      const rows = [['攻擊', st.atk], ['防禦', st.def], ['特攻', st.spa], ['速度', st.spe]];
      rows.forEach(([k, v], i) => { drawText(ctx, k, 8 + (i % 2) * 76, 78 + Math.floor(i / 2) * 16); drawText(ctx, String(v), 48 + (i % 2) * 76, 78 + Math.floor(i / 2) * 16); });
      const need = m.lv >= 100 ? 0 : xpForLevel(m.lv + 1) - m.xp;
      drawText(ctx, `升級還差 ${need} 經驗`, 8, 112);
      drawText(ctx, `狀態：${m.hp <= 0 ? '昏倒' : m.st ? STATUS_NAME[m.st] : '正常'}`, 8, 128);
    } else {
      m.moves.forEach((mv, i) => {
        const M = MOVES[mv.id];
        ctx.fillStyle = TYPE_COLOR[M.t]; ctx.fillRect(4, 60 + i * 20, 4, 16);
        drawText(ctx, M.n, 12, 60 + i * 20);
        drawText(ctx, `${mv.pp}/${M.pp}`, 116, 60 + i * 20);
        drawText(ctx, M.c === 'x' ? '變化' : `威力${M.p}`, 76, 60 + i * 20, '#606070');
      });
    }
    drawText(ctx, this.page ? '◀ 招式 ▶' : '◀ 能力 ▶', 106, 4, '#808090');
  }
}

class DexScene {
  constructor(g) { this.sel = 0; this.top = 0; this.detail = false; this.opaque = true; }
  update(g) {
    const p = g.p;
    if (this.detail) { if (g.btn('a') || g.btn('b')) this.detail = false; return; }
    const n = DEX_ORDER.length;
    if (g.rep('up')) this.sel = (this.sel + n - 1) % n;
    if (g.rep('down')) this.sel = (this.sel + 1) % n;
    if (g.rep('left')) this.sel = Math.max(0, this.sel - 7);
    if (g.rep('right')) this.sel = Math.min(n - 1, this.sel + 7);
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel >= this.top + 7) this.top = this.sel - 6;
    if (g.btn('a') && p.seen.includes(DEX_ORDER[this.sel])) { this.detail = true; g.sfx('blip'); }
    if (g.btn('b')) g.pop(this);
  }
  draw(ctx, g) {
    const p = g.p;
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SW, SH);
    const id = DEX_ORDER[this.sel];
    if (this.detail) {
      const s = SPECIES[id], caught = p.caught.includes(id);
      ctx.drawImage(monSprite(id).front, 4, 4);
      drawText(ctx, `No.${String(this.sel + 1).padStart(3, '0')}`, 52, 6);
      drawText(ctx, s.n, 52, 22);
      s.t.forEach((t, k) => { ctx.fillStyle = TYPE_COLOR[t]; ctx.fillRect(52 + k * 40, 39, 36, 13); drawText(ctx, TYPE_NAME[t], 54 + k * 40, 40, '#fff'); });
      drawBox(ctx, 0, 60, SW, 84);
      const lines = caught ? wrapText(ctx, s.d, 142) : ['還沒有抓到，', '不清楚牠的詳細資料。'];
      lines.slice(0, 4).forEach((l, k) => drawText(ctx, l, 8, 68 + k * 16));
      return;
    }
    drawText(ctx, '萌獸圖鑑', 8, 4);
    drawText(ctx, `看過 ${p.seen.length}  抓到 ${p.caught.length}`, 64, 4, '#606070');
    for (let r = 0; r < 7; r++) {
      const i = this.top + r; if (i >= DEX_ORDER.length) break;
      const k = DEX_ORDER[i], y = 22 + r * 17;
      if (i === this.sel) { ctx.fillStyle = '#e0e8ff'; ctx.fillRect(0, y - 2, 96, 17); drawArrow(ctx, 2, y + 3); }
      drawText(ctx, String(i + 1).padStart(3, '0'), 10, y);
      if (p.caught.includes(k)) { ctx.fillStyle = '#e04848'; ctx.fillRect(34, y + 4, 4, 4); }
      drawText(ctx, p.seen.includes(k) ? SPECIES[k].n : '－－－', 42, y);
    }
    if (p.seen.includes(id)) ctx.drawImage(monSprite(id).front, 108, 40);
    else { ctx.globalAlpha = .15; ctx.drawImage(monSprite(id).front, 108, 40); ctx.globalAlpha = 1; }
  }
}

class CardScene {
  constructor() { this.opaque = true; }
  update(g) { if (g.btn('a') || g.btn('b')) g.pop(this); }
  draw(ctx, g) {
    const p = g.p;
    ctx.fillStyle = '#f0e0b0'; ctx.fillRect(0, 0, SW, SH);
    drawBox(ctx, 4, 4, 152, 136);
    drawText(ctx, '訓練家卡', 12, 10);
    ctx.drawImage(personFrames('hero')[0][0], 120, 14, 32, 32);
    drawText(ctx, `名字  ${p.name}`, 12, 30);
    drawText(ctx, `金錢  $${p.money}`, 12, 46);
    drawText(ctx, `圖鑑  ${p.caught.length} 種`, 12, 62);
    const t = Math.floor(p.time / 60);
    drawText(ctx, `時間  ${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}`, 12, 78);
    drawText(ctx, '徽章', 12, 98);
    BADGES.forEach((b, i) => {
      const x = 48 + i * 26, y = 98, has = p.badges.includes(b);
      ctx.fillStyle = has ? ['#7ac8ff', '#3a8ae0', '#ffd820', '#f06020'][i] : '#d0d0c8';
      ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 16, y + 8); ctx.lineTo(x + 8, y + 16); ctx.lineTo(x, y + 8); ctx.fill();
      if (has) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 5, 2, 2); }
    });
    if (g.flags.champion) drawText(ctx, '★ 冠軍', 100, 120, '#c08000');
  }
}

class StarterScene {
  constructor(g, ids) { this.ids = ids; this.sel = 0; this.opaque = true; }
  update(g) {
    if (g.rep('left')) { this.sel = (this.sel + 2) % 3; g.sfx('blip'); }
    if (g.rep('right')) { this.sel = (this.sel + 1) % 3; g.sfx('blip'); }
    if (g.btn('a')) { g.sfx('blip'); g.pop(this, this.sel); }
  }
  draw(ctx, g) {
    ctx.fillStyle = '#e8f0ff'; ctx.fillRect(0, 0, SW, SH);
    drawText(ctx, '選一隻當夥伴吧！', 32, 6);
    this.ids.forEach((id, i) => {
      const x = 8 + i * 50, y = 28 + (i === this.sel ? -3 + ((g.frame >> 4) % 2) * 2 : 0);
      if (i === this.sel) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, 22, 52, 60); ctx.strokeStyle = INK; ctx.strokeRect(x - 3.5, 22.5, 51, 59); }
      ctx.drawImage(monSprite(id).front, x + 2, y);
      const s = SPECIES[id];
      ctx.fillStyle = TYPE_COLOR[s.t[0]]; ctx.fillRect(x + 6, 70, 32, 10);
      drawText(ctx, TYPE_NAME[s.t[0]], x + 10 + (s.t[0] === FIR ? 4 : 4), 69, '#fff');
    });
    const s = SPECIES[this.ids[this.sel]];
    drawText(ctx, s.n, (SW - textW(ctx, s.n)) / 2, 83);
    drawBox(ctx, 0, 96, SW, 48);
    wrapText(ctx, s.d, 142).slice(0, 2).forEach((l, k) => drawText(ctx, l, 8, 104 + k * 16));
  }
}

class IntroScene {
  constructor() { this.opaque = true; this.show = null; }
  update() {}
  draw(ctx, g) {
    ctx.fillStyle = '#f8f8f0'; ctx.fillRect(0, 0, SW, SH);
    if (this.show === 'rival') { ctx.drawImage(personFrames('rival')[0][0], 56, 24, 48, 48); }
    else if (this.show) { ctx.drawImage(monSprite(this.show).front, 60, 30); }
    else { ctx.drawImage(personFrames('prof')[0][0], 56, 24, 48, 48); }
  }
}

class TitleScene {
  constructor(g) { this.opaque = true; this.t = 0; this.state = 'press'; this.mons = ['kuri1', 'mossy1', 'foca1', 'fluff1', 'chirp1', 'fox', 'legend', 'owl2']; }
  update(g) {
    this.t++;
    if (this.state === 'press' && (g.btn('a') || g.btn('start'))) {
      g.sfx('blip');
      this.state = 'menu';
      g.runScript(async () => {
        const data = g.loadSave();
        const items = data ? ['繼續冒險', '新的冒險'] : ['新的冒險'];
        const i = await g.push(new MenuScene(g, items, { x: 40, y: 96, w: 80, cancel: false }));
        if (items[i] === '繼續冒險') {
          await g.fadeOut(12);
          g.continueGame(data);
          await g.fadeIn(12);
        } else {
          if (data && !(await g.ask('會覆蓋掉之前的存檔，\n確定要重新開始嗎？'))) { this.state = 'press'; return; }
          await g.fadeOut(12);
          g.pop(this);
          g.fadeIn(1);
          await g.beginNew();
        }
      });
    }
  }
  draw(ctx, g) {
    const grd = ['#78c8f0', '#a0d8f8', '#c8e8ff'];
    grd.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * 30, SW, 30); });
    ctx.fillStyle = '#98d878'; ctx.fillRect(0, 90, SW, 54);
    ctx.fillStyle = '#7cc25e'; for (let x = 0; x < SW; x += 8) ctx.fillRect(x + ((x / 8) % 2) * 3, 92, 2, 3);
    // 標題字
    ctx.font = '24px Cubic11, sans-serif'; ctx.textBaseline = 'top';
    const title = '萌獸大冒險', w = ctx.measureText(title).width, tx = (SW - w) / 2;
    ctx.fillStyle = INK; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]]) ctx.fillText(title, tx + dx, 12 + dy);
    ctx.fillStyle = '#ffd43b'; ctx.fillText(title, tx, 12);
    drawText(ctx, 'MONSTER QUEST', 40, 40, '#ffffff');
    const id = this.mons[Math.floor(this.t / 150) % this.mons.length];
    const k = this.t % 150, slide = k < 12 ? (12 - k) * 12 : k > 138 ? -(k - 138) * 12 : 0;
    ctx.drawImage(monSprite(id).front, 60 + slide, 52);
    if (this.state === 'press' && (this.t >> 5) % 2 === 0) drawText(ctx, '按 A 開始', 52, 118);
    drawText(ctx, '原創萌獸 RPG', 46, 132, '#3a6a3a');
  }
}

class EvoScene {
  constructor(g, m) { this.m = m; this.opaque = true; this.to = SPECIES[m.id].evo[1]; this.show = m.id; this.white = false; }
  draw(ctx) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SW, SH);
    const sp = monSprite(this.show);
    ctx.drawImage(this.white ? sp.white : sp.front, 60, 30);
  }
}
// 進化流程
EvoScene.prototype.update = function (g) {
  if (this.started) return;
  this.started = true;
  g.runScript(async () => {
    const m = this.m, from = SPECIES[m.id], to = SPECIES[this.to];
    g.music('evo');
    const t = new TextScene(g, `咦？\n${monName(m)}的樣子…`);
    await g.push(t);
    let cancel = false;
    for (let k = 0; k < 20 && !cancel; k++) {
      const speed = Math.max(3, 16 - k);
      this.show = this.to; this.white = true;
      for (let i = 0; i < speed; i++) { await g.wait(1); if (g.held.b) cancel = true; }
      this.show = m.id;
      for (let i = 0; i < speed; i++) { await g.wait(1); if (g.held.b) cancel = true; }
    }
    this.white = false;
    if (cancel) {
      this.show = m.id;
      await g.say(`咦？${monName(m)}\n停止進化了。`);
      g.pop(this);
      return;
    }
    g.flash(16);
    this.show = this.to;
    const oldMax = maxHp(m), wasNick = m.nick;
    m.id = this.to;
    m.hp += maxHp(m) - oldMax;
    g.dexCatch(m.id);
    g.sfx('levelup');
    await g.say(`恭喜！${wasNick || from.n}\n進化成了${to.n}！`);
    for (const [l, mv] of to.L) if (l === m.lv) await learnMove(g, m, mv);
    g.pop(this);
  });
};

class EndingScene {
  constructor(g) { this.opaque = true; this.t = 0; }
  update(g) {
    this.t++;
    if (this.t > 360 && g.btn('a')) g.pop(this);
  }
  draw(ctx, g) {
    ctx.fillStyle = '#202040'; ctx.fillRect(0, 0, SW, SH);
    for (let i = 0; i < 30; i++) { const x = (i * 53 + this.t) % SW, y = (i * 37) % 90; ctx.fillStyle = i % 3 ? '#ffffff' : '#ffd43b'; ctx.fillRect(x, y, 1, 1); }
    ctx.font = '24px Cubic11, sans-serif'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffd43b'; const s = '恭喜成為冠軍！'; ctx.fillText(s, (SW - ctx.measureText(s).width) / 2, 10);
    drawText(ctx, `${g.p.name}和夥伴們`, 44, 40, '#ffffff');
    g.p.party.forEach((m, i) => {
      const x = 4 + (i % 3) * 52, y = 56 + Math.floor(i / 3) * 42;
      if (this.t > 40 + i * 30) ctx.drawImage(monSprite(m.id).front, x + 4, y);
    });
    if (this.t > 360 && (this.t >> 5) % 2) drawText(ctx, '按 A 繼續', 54, 132, '#ffffff');
  }
}
