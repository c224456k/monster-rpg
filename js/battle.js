'use strict';
// 萌獸大冒險：回合制對戰

const freshStages = () => ({ atk: 0, def: 0, spa: 0, spe: 0, acc: 0 });
const stageMul = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
const accMul = (s) => (s >= 0 ? (3 + s) / 3 : 3 / (3 - s));

async function learnMove(g, m, mv) {
  if (m.moves.some((x) => x.id === mv)) return;
  const nm = MOVES[mv].n, name = monName(m);
  if (m.moves.length < 4) {
    m.moves.push({ id: mv, pp: MOVES[mv].pp });
    g.sfx('get');
    await g.say(`${name}學會了\n${nm}！`);
    return;
  }
  await g.say(`${name}想要學習\n${nm}。`);
  await g.say(`但是${name}已經\n會四個招式了。`);
  for (;;) {
    if (await g.ask(`要忘記一個招式，\n來學習${nm}嗎？`)) {
      const i = await g.push(new MenuScene(g, m.moves.map((x) => MOVES[x.id].n), { x: 88, y: 0, w: 72 }));
      if (i >= 0) {
        const old = MOVES[m.moves[i].id].n;
        m.moves[i] = { id: mv, pp: MOVES[mv].pp };
        await g.say('1、2、…噗！');
        g.sfx('get');
        await g.say(`${name}忘記了${old}，\n學會了${nm}！`);
        return;
      }
    } else if (await g.ask(`要放棄學習\n${nm}嗎？`)) {
      await g.say(`${name}沒有學習\n${nm}。`);
      return;
    }
  }
}

class Battle {
  constructor(g, o) {
    this.g = g; this.opaque = true;
    this.tr = o.trainer || null; this.legend = o.legend; this.champion = o.champion;
    this.team = o.team || [o.wild];
    this.ei = 0;
    this.pi = Math.max(0, g.p.party.findIndex((m) => m.hp > 0));
    this.ps = freshStages(); this.es = freshStages();
    this.disp = { p: 0, e: 0 };
    this.slide = 1; this.showTrainer = !!this.tr; this.showHero = true;
    this.eVis = !this.tr; this.pVis = false; this.eHud = false; this.pHud = false;
    this.eScale = 1; this.pScale = 1; this.dx = { p: 0, e: 0 }; this.hide = { p: false, e: false };
    this.ball = null; this.proj = null; this.shake = 0;
    this.parts = new Set(); this.runTries = 0; this.lastAct = 0;
  }
  get pm() { return this.g.p.party[this.pi]; }
  get em() { return this.team[this.ei]; }
  ename(m) { return (this.tr ? '對手的' : '野生的') + monName(m || this.em); }
  update(g) {
    if (this.started) return;
    this.started = true;
    g.runScript(async () => { const r = await this.main(); g.pop(this, r); });
  }
  say(t) { return this.g.say(t); }
  async main() {
    const g = this.g;
    if (this.tr) g.music(this.champion ? 'champ' : this.tr.cls === '道館館主' ? 'gymbattle' : 'trainer');
    else g.music(this.legend ? 'legend' : 'wild');
    this.disp.e = this.em.hp;
    for (let i = 0; i <= 36; i++) { this.slide = 1 - i / 36; await g.wait(1); }
    if (!this.tr) {
      this.eHud = true;
      g.dexSee(this.em.id);
      await this.say(this.legend ? `${monName(this.em)}\n出現了！` : `野生的${monName(this.em)}\n跳出來了！`);
    } else {
      await this.say(`${this.tr.cls}${this.tr.name}\n想要對戰！`);
      await this.sendEnemy();
    }
    await this.sendPlayer(true);
    for (;;) {
      const act = await this.chooseAction();
      if (act.type === 'run') {
        if (this.tr) { await this.say('不能從訓練家的\n對戰中逃跑！'); continue; }
        if (this.legend) { await this.say('逃不掉！'); }
        else if (this.tryRun()) { g.sfx('run'); await this.say('順利逃走了！'); return 'run'; }
        else await this.say('逃不掉！');
      }
      if (act.type === 'ball') {
        if (this.tr) { await this.say('不能搶別人的萌獸！'); continue; }
        if (await this.throwBall(act.id)) return 'caught';
      }
      if (act.type === 'switch') await this.doSwitch(act.j);
      const eMove = this.aiMove();
      if (act.type === 'move') {
        const pPri = act.i >= 0 ? (MOVES[this.pm.moves[act.i].id].pri || 0) : 0;
        const ePri = eMove >= 0 ? (MOVES[this.em.moves[eMove].id].pri || 0) : 0;
        const pSp = this.speed('p'), eSp = this.speed('e');
        const pFirst = pPri !== ePri ? pPri > ePri : pSp !== eSp ? pSp > eSp : Math.random() < .5;
        const order = pFirst ? [['p', act.i], ['e', eMove]] : [['e', eMove], ['p', act.i]];
        let ended = null;
        for (const [side, mi] of order) {
          const me = side === 'p' ? this.pm : this.em;
          if (me.hp <= 0) continue;
          if ((side === 'p' ? this.em : this.pm).hp <= 0) continue;
          await this.useMove(side, mi);
          ended = await this.handleFaints();
          if (ended) return this.finish(ended);
          if (this.justSwitched) { this.justSwitched = false; break; }
        }
      } else if (this.em.hp > 0) {
        await this.useMove('e', eMove);
        const ended = await this.handleFaints();
        if (ended) return this.finish(ended);
        this.justSwitched = false;
      }
      // 回合結束：中毒、灼傷
      for (const side of ['p', 'e']) {
        const m = side === 'p' ? this.pm : this.em;
        if (m.hp <= 0 || (m.st !== 'psn' && m.st !== 'brn')) continue;
        const d = Math.max(1, Math.floor(maxHp(m) / (m.st === 'psn' ? 8 : 16)));
        await this.say(`${side === 'p' ? monName(m) : this.ename(m)}\n受到${m.st === 'psn' ? '毒' : '灼傷'}的傷害！`);
        await this.blink(side);
        await this.setHp(side, m.hp - d);
        const ended = await this.handleFaints();
        if (ended) return this.finish(ended);
        this.justSwitched = false;
      }
    }
  }
  speed(side) {
    const m = side === 'p' ? this.pm : this.em, s = side === 'p' ? this.ps : this.es;
    return calcStats(m).spe * stageMul(s.spe) * (m.st === 'par' ? .5 : 1);
  }
  tryRun() {
    this.runTries++;
    const a = calcStats(this.pm).spe, b = calcStats(this.em).spe;
    if (a >= b) return true;
    const odds = (a * 32 / Math.max(1, Math.floor(b / 4) % 256) + 30 * this.runTries) / 256;
    return Math.random() < odds;
  }
  async chooseAction() {
    const g = this.g;
    for (;;) {
      const t = new TextScene(g, `${monName(this.pm)}\n要做什麼？`, { keep: 1 });
      await g.push(t);
      const i = await g.push(new MenuScene(g, ['戰鬥', '背包', '萌獸', '逃跑'], { x: 72, y: 96, w: 88, h: 48, cols: 2, cancel: false, sel: this.lastAct }));
      g.pop(t);
      this.lastAct = i;
      if (i === 0) {
        const m = this.pm;
        if (m.moves.every((x) => x.pp <= 0)) { await this.say(`${monName(m)}沒有\n可以用的招式了！`); return { type: 'move', i: -1 }; }
        const sc = new MenuScene(g, m.moves.map((x) => MOVES[x.id].n), { x: 0, y: 96, w: 160, h: 48, cols: 2, sel: this.lastMove || 0,
          info: (ctx, k) => {
            const mv = m.moves[k], M = MOVES[mv.id];
            drawBox(ctx, 0, 70, 106, 27);
            ctx.fillStyle = TYPE_COLOR[M.t]; ctx.fillRect(5, 76, 34, 14);
            drawText(ctx, TYPE_NAME[M.t], 7, 77, '#ffffff');
            drawText(ctx, `PP ${mv.pp}/${M.pp}`, 44, 77);
          } });
        const k = await g.push(sc);
        if (k < 0) continue;
        if (m.moves[k].pp <= 0) { await this.say('這個招式\n沒有 PP 了！'); continue; }
        this.lastMove = k;
        return { type: 'move', i: k };
      }
      if (i === 1) {
        const r = await bagMenu(g, true);
        if (!r) continue;
        if (r.id && ITEMS[r.id].ball) return { type: 'ball', id: r.id };
        if (r.target === this.pi) this.disp.p = this.pm.hp;
        return { type: 'item' };
      }
      if (i === 2) {
        const j = await g.push(new PartyScene(g, { msg: '要換哪一隻？', sel: this.pi }));
        if (j < 0) continue;
        if (j === this.pi) { await this.say(`${monName(this.pm)}\n已經在場上了！`); continue; }
        if (g.p.party[j].hp <= 0) { await this.say('牠已經沒有力氣\n戰鬥了！'); continue; }
        return { type: 'switch', j };
      }
      return { type: 'run' };
    }
  }
  aiMove() {
    const m = this.em, opts = m.moves.map((x, i) => i).filter((i) => m.moves[i].pp > 0);
    if (!opts.length) return -1;
    if (!this.tr) return opts[Math.floor(Math.random() * opts.length)];
    const target = this.pm, tt = SPECIES[target.id].t;
    let best = opts[0], bs = -1;
    for (const i of opts) {
      const M = MOVES[m.moves[i].id];
      let s;
      if (M.c !== 'x') s = M.p * typeEff(M.t, tt) * (SPECIES[m.id].t.includes(M.t) ? 1.5 : 1) * (M.a ? M.a / 100 : 1);
      else if (M.st) s = target.st || this.immune(target, M.st[0]) || typeEff(M.t, tt) === 0 ? 0 : 55;
      else if (M.heal) s = m.hp / maxHp(m) < .4 ? 90 : 0;
      else s = (M.stat[2] ? this.es : this.ps)[M.stat[0]] * (M.stat[2] ? 1 : -1) >= 2 ? 0 : 30;
      s *= .75 + Math.random() * .5;
      if (s > bs) { bs = s; best = i; }
    }
    return best;
  }
  immune(m, st) {
    const t = SPECIES[m.id].t;
    return (st === 'brn' && t.includes(FIR)) || (st === 'psn' && t.includes(POI)) || (st === 'par' && t.includes(ELE));
  }
  async useMove(side, mi) {
    const g = this.g;
    const att = side === 'p' ? this.pm : this.em, def = side === 'p' ? this.em : this.pm;
    const aS = side === 'p' ? this.ps : this.es, dS = side === 'p' ? this.es : this.ps;
    const os = side === 'p' ? 'e' : 'p';
    const aN = side === 'p' ? monName(att) : this.ename(att);
    const dN = side === 'p' ? this.ename(def) : monName(def);
    if (att.st === 'slp') {
      if (--att.slp > 0) { await this.say(`${aN}\n正在呼呼大睡。`); return; }
      att.st = null;
      await this.say(`${aN}\n醒過來了！`);
    }
    if (att.st === 'par' && Math.random() < .25) { await this.say(`${aN}身體麻痺，\n動彈不得！`); return; }
    let mk = 'struggle';
    if (mi >= 0) { const mv = att.moves[mi]; mk = mv.id; mv.pp = Math.max(0, mv.pp - 1); }
    const M = MOVES[mk];
    await this.say(`${aN}\n使出了${M.n}！`);
    const selfTarget = M.c === 'x' && (M.heal || (M.stat && M.stat[2]));
    if (M.a > 0 && !selfTarget) {
      const acc = M.a * accMul(aS.acc);
      if (Math.random() * 100 >= acc) { g.sfx('miss'); await this.say('但是沒有打中！'); return; }
    }
    if (M.c === 'x') {
      await this.lunge(side, true);
      if (M.heal) {
        const mx = maxHp(att);
        if (att.hp >= mx) { await this.say('但是 HP 已經滿了！'); return; }
        g.sfx('heal');
        await this.setHp(side, att.hp + Math.floor(mx * M.heal));
        await this.say(`${aN}\n回復了體力！`);
        return;
      }
      if (M.st) {
        if (typeEff(M.t, SPECIES[def.id].t) === 0) { await this.say(`對${dN}\n好像沒有效果…`); return; }
        if (def.st || this.immune(def, M.st[0])) { await this.say('但是失敗了！'); return; }
        await this.inflict(os, def, M.st[0], dN);
        return;
      }
      if (M.stat) {
        const [k, n, self] = M.stat;
        await this.changeStat(self ? side : os, k, n, self ? aN : dN);
      }
      return;
    }
    const eff = typeEff(M.t, SPECIES[def.id].t);
    if (eff === 0) { await this.say(`對${dN}\n好像沒有效果…`); return; }
    const as = calcStats(att), ds = calcStats(def);
    let A, D;
    if (M.c === 'p') { A = as.atk * stageMul(aS.atk) * (att.st === 'brn' ? .5 : 1); D = ds.def * stageMul(dS.def); }
    else { A = as.spa * stageMul(aS.spa); D = ds.spa * stageMul(dS.spa); }
    const crit = Math.random() < (M.hc ? 1 / 4 : 1 / 16);
    const base = Math.floor(Math.floor((2 * att.lv / 5 + 2) * M.p * A / D) / 50) + 2;
    const stab = SPECIES[att.id].t.includes(M.t) ? 1.5 : 1;
    const dmg = Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * (217 + Math.random() * 39) / 255));
    await this.lunge(side, false, M);
    g.sfx(eff > 1 ? 'hit2' : eff < 1 ? 'hit0' : 'hit');
    if (eff > 1) this.shake = 10;
    await this.blink(os);
    const dealt = Math.min(def.hp, dmg);
    await this.setHp(os, def.hp - dmg);
    if (crit) await this.say('擊中要害了！');
    if (eff > 1) await this.say('效果絕佳！');
    else if (eff < 1) await this.say('效果不太好…');
    if (M.drain && att.hp > 0) {
      const h = Math.max(1, Math.floor(dealt * M.drain));
      if (att.hp < maxHp(att)) { await this.setHp(side, att.hp + h); await this.say(`${dN}的體力\n被吸走了！`); }
    }
    if (M.recoil && att.hp > 0) {
      await this.setHp(side, att.hp - Math.max(1, Math.floor(dealt * M.recoil)));
      await this.say(`${aN}受到了\n反作用力的傷害！`);
    }
    if (def.hp > 0 && M.st && !def.st && !this.immune(def, M.st[0]) && Math.random() * 100 < M.st[1]) await this.inflict(os, def, M.st[0], dN);
    if (def.hp > 0 && M.stat && Math.random() * 100 < M.stat[3]) {
      const [k, n, self] = M.stat;
      await this.changeStat(self ? side : os, k, n, self ? aN : dN);
    }
  }
  async inflict(side, m, st, name) {
    m.st = st;
    if (st === 'slp') m.slp = 2 + Math.floor(Math.random() * 3);
    this.g.sfx('status');
    await this.blink(side);
    const msg = { psn: '中毒了！', par: '麻痺了！\n可能會動不了！', slp: '睡著了！', brn: '灼傷了！' };
    await this.say(`${name}${msg[st]}`);
  }
  async changeStat(side, k, n, name) {
    const S = side === 'p' ? this.ps : this.es;
    const before = S[k];
    S[k] = Math.max(-6, Math.min(6, S[k] + n));
    if (S[k] === before) { await this.say(`${name}的${STAT_NAME[k]}\n已經不會再${n > 0 ? '提高' : '降低'}了！`); return; }
    this.g.sfx(n > 0 ? 'statup' : 'statdown');
    await this.say(`${name}的${STAT_NAME[k]}\n${Math.abs(n) > 1 ? '大幅' : ''}${n > 0 ? '提高' : '降低'}了！`);
  }
  async handleFaints() {
    const g = this.g;
    if (this.em.hp <= 0 && !this.eDown) {
      this.eDown = true;
      g.sfx('faint');
      for (let i = 0; i <= 10; i++) { this.eScale = 1 - i / 10; this.eDrop = i * 4; await g.wait(1); }
      this.eVis = false; this.eDrop = 0; this.eScale = 1;
      await this.say(`${this.ename()}\n倒下了！`);
      await this.giveXp();
      const next = this.team.findIndex((m) => m.hp > 0);
      if (next < 0) return 'win';
      this.ei = next; this.es = freshStages(); this.eDown = false;
      this.parts = new Set(this.pm.hp > 0 ? [this.pi] : []);
      await this.sendEnemy();
    }
    if (this.pm.hp <= 0) {
      g.sfx('faint');
      for (let i = 0; i <= 10; i++) { this.pScale = 1 - i / 10; await g.wait(1); }
      this.pVis = false; this.pHud = false; this.pScale = 1;
      await this.say(`${monName(this.pm)}\n倒下了！`);
      if (!g.p.party.some((m) => m.hp > 0)) return 'lose';
      let j;
      for (;;) {
        j = await g.push(new PartyScene(g, { msg: '要派出哪一隻？', noCancel: true, sel: Math.max(0, g.p.party.findIndex((m) => m.hp > 0)) }));
        if (g.p.party[j].hp > 0) break;
        await this.say('牠已經沒有力氣\n戰鬥了！');
      }
      this.pi = j; this.ps = freshStages();
      await this.sendPlayer(false);
      this.justSwitched = true;
    }
    return null;
  }
  async giveXp() {
    const g = this.g, e = this.em;
    // 經驗值×1.5，而且隊伍裡每一隻還站得住的萌獸都拿到全額（不用平分、不用上場）
    const gain = Math.max(1, Math.floor(SPECIES[e.id].x * e.lv / 7 * (this.tr ? 1.5 : 1) * 1.5));
    const parts = g.p.party.map((m, i) => i).filter((i) => g.p.party[i].hp > 0 && g.p.party[i].lv < 100);
    if (parts.length) await this.say(parts.length > 1 ? `全隊萌獸各得到了\n${gain} 點經驗值！` : `${monName(g.p.party[parts[0]])}得到了\n${gain} 點經驗值！`);
    for (const i of parts) {
      const m = g.p.party[i];
      m.xp += gain;
      while (m.lv < 100 && m.xp >= xpForLevel(m.lv + 1)) {
        const old = maxHp(m);
        m.lv++;
        m.hp += maxHp(m) - old;
        if (i === this.pi) this.disp.p = m.hp;
        g.sfx('levelup');
        await this.say(`${monName(m)}升到了\nLv${m.lv}！`);
        for (const [l, mv] of SPECIES[m.id].L) if (l === m.lv) await learnMove(g, m, mv);
        const ev = SPECIES[m.id].evo;
        if (ev && m.lv >= ev[0]) m._evo = true;
      }
    }
  }
  async finish(r) {
    const g = this.g;
    if (r === 'win') {
      g.music('victory');
      if (this.tr) {
        this.showTrainer = true; this.eVis = false; this.eHud = false;
        for (let i = 0; i <= 16; i++) { this.trIn = 1 - i / 16; await g.wait(1); }
        await this.say(`打敗了\n${this.tr.cls}${this.tr.name}！`);
        if (this.tr.post) await this.say(this.tr.post);
        if (!Feixu.linked) { // 有連費許時不發獎金（只花不賺，避免改前端刷錢）
          const money = this.tr.money;
          g.p.money += money;
          await this.say(`${g.p.name}得到了\n$${money}！`);
        }
      }
    }
    for (const m of g.p.party) { if (m.st === 'slp' && m.slp <= 0) m.st = null; }
    return r;
  }
  async sendEnemy() {
    const g = this.g, m = this.em;
    if (this.tr) await this.say(`${this.tr.cls}${this.tr.name}\n派出了${monName(m)}！`);
    this.showTrainer = false;
    g.dexSee(m.id);
    this.disp.e = m.hp; this.eVis = true; this.eHud = true;
    g.sfx('pop');
    for (let i = 0; i <= 8; i++) { this.eScale = i / 8; await g.wait(1); }
    g.sfx('cry');
  }
  async sendPlayer(first) {
    const g = this.g, m = this.pm;
    if (first) { for (let i = 0; i <= 12; i++) { this.heroOut = i / 12; await g.wait(1); } this.showHero = false; }
    this.parts.add(this.pi);
    this.disp.p = m.hp;
    await this.say(`去吧！\n${monName(m)}！`);
    this.pVis = true; this.pHud = true;
    g.sfx('pop');
    for (let i = 0; i <= 8; i++) { this.pScale = i / 8; await g.wait(1); }
  }
  async doSwitch(j) {
    const g = this.g;
    await this.say(`${monName(this.pm)}，\n回來吧！`);
    for (let i = 0; i <= 8; i++) { this.pScale = 1 - i / 8; await g.wait(1); }
    this.pVis = false; this.pHud = false; this.pScale = 1;
    this.pi = j; this.ps = freshStages();
    await this.sendPlayer(false);
  }
  async throwBall(id) {
    const g = this.g, e = this.em, it = ITEMS[id];
    g.useItem(id);
    await this.say(`${g.p.name}丟出了\n${it.n}！`);
    g.sfx('throw');
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      this.ball = { x: 30 + 90 * k, y: 80 - 70 * k + 120 * k * k * .5 - 40 * k, open: false };
      await g.wait(1);
    }
    this.ball = { x: 120, y: 28, open: true };
    g.sfx('pop');
    for (let i = 0; i <= 10; i++) { this.eScale = 1 - i / 10; this.eWhite = true; await g.wait(1); }
    this.eVis = false; this.eWhite = false;
    for (let i = 0; i <= 8; i++) { this.ball = { x: 120, y: 28 + i * 1.5, open: false }; await g.wait(1); }
    const mx = maxHp(e);
    const stb = e.st === 'slp' ? 2 : e.st ? 1.5 : 1;
    const a = (3 * mx - 2 * e.hp) * SPECIES[e.id].r * it.ball * stb / (3 * mx);
    const p = Math.min(1, a / 255), s = Math.pow(p, .25);
    let shakes = 0;
    while (shakes < 4 && Math.random() < s) shakes++;
    for (let k = 0; k < Math.min(3, shakes); k++) {
      await g.wait(20);
      g.sfx('shake');
      for (let i = 0; i < 12; i++) { this.ball.rot = Math.sin(i / 12 * Math.PI * 2) * .5; await g.wait(1); }
      this.ball.rot = 0;
    }
    await g.wait(20);
    if (shakes >= 4) {
      g.music('caught');
      this.ball.done = true;
      const newDex = !g.p.caught.includes(e.id);
      await this.say(`太好了！\n抓到了${monName(e)}！`);
      g.dexCatch(e.id);
      if (newDex) await this.say(`${monName(e)}的資料\n登錄到圖鑑了！`);
      e.st = e.st === 'slp' ? null : e.st;
      if (g.p.party.length < 6) g.p.party.push(e);
      else { g.p.box.push(e); await this.say(`隊伍滿了，\n${monName(e)}被送到\n電腦的箱子裡。`); }
      return true;
    }
    this.ball = null;
    this.eVis = true;
    g.sfx('pop');
    for (let i = 0; i <= 6; i++) { this.eScale = i / 6; await g.wait(1); }
    await this.say(['哎呀！\n萌獸跑出來了！', '可惜！\n差一點點！', '啊！\n就快抓到了！', '可惡！\n只差一點點了！'][shakes]);
    return false;
  }
  // ---- 動畫 ----
  async lunge(side, self, M) {
    const g = this.g, dir = side === 'p' ? 1 : -1;
    if (self) { for (const k of [0, -2, -3, -2, 0]) { this.dx[side] = 0; this.dy = { side, v: k }; await g.wait(2); } this.dy = null; return; }
    if (M && M.c === 's') {
      const from = side === 'p' ? [40, 70] : [120, 24], to = side === 'p' ? [120, 24] : [40, 70];
      for (let i = 0; i <= 12; i++) { const k = i / 12; this.proj = { x: from[0] + (to[0] - from[0]) * k, y: from[1] + (to[1] - from[1]) * k, c: TYPE_COLOR[M.t], r: 2 + k * 3 }; await g.wait(1); }
      this.proj = null;
      return;
    }
    for (const k of [3, 6, 8, 6, 3, 0]) { this.dx[side] = k * dir; await g.wait(1); }
  }
  async blink(side) {
    for (let k = 0; k < 6; k++) { this.hide[side] = k % 2 === 0; await this.g.wait(4); }
    this.hide[side] = false;
  }
  async setHp(side, v) {
    const m = side === 'p' ? this.pm : this.em, mx = maxHp(m);
    v = Math.max(0, Math.min(mx, Math.round(v)));
    m.hp = v;
    const step = Math.max(1, Math.round(mx / 48));
    while (this.disp[side] !== v) {
      const d = v - this.disp[side];
      this.disp[side] += Math.sign(d) * Math.min(Math.abs(d), step);
      await this.g.wait(1);
    }
  }
  // ---- 畫面 ----
  draw(ctx, g) {
    let sx = 0;
    if (this.shake > 0) { this.shake--; sx = (this.shake % 2 ? 2 : -2); }
    ctx.fillStyle = '#f8f8f0'; ctx.fillRect(0, 0, SW, SH);
    ctx.save(); ctx.translate(sx, 0);
    const plat = (cx, cy, rx, ry) => {
      ctx.fillStyle = '#c8dcb0'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0ecd0'; ctx.beginPath(); ctx.ellipse(cx, cy - 1, rx - 4, ry - 2, 0, 0, Math.PI * 2); ctx.fill();
    };
    const ex = 100 - this.slide * 140 + this.dx.e, px = 12 + this.slide * 140 + this.dx.p;
    plat(ex + 20, 42, 32, 7); plat(px + 22, 92, 36, 6);
    // 對手
    if (this.showTrainer && this.tr) {
      const tx = ex + 4 + (this.trIn !== undefined ? this.trIn * 60 : 0);
      ctx.drawImage(personFrames(this.tr.spr)[0][0], tx, -4, 48, 48);
    } else if (this.eVis && !this.hide.e) {
      const s = this.eScale, sp = monSprite(this.em.id);
      const dy = this.dy && this.dy.side === 'e' ? this.dy.v : 0;
      ctx.drawImage(this.eWhite ? sp.white : sp.front, ex + 20 - 20 * s, 4 + 40 - 40 * s + (this.eDrop || 0) + dy, 40 * s, 40 * s);
    }
    // 自己
    if (this.showHero) {
      const hx = px + 2 - (this.heroOut || 0) * 70;
      ctx.drawImage(personFrames('hero')[1][0], hx, 46, 48, 48);
    } else if (this.pVis && !this.hide.p) {
      const s = this.pScale, sp = monSprite(this.pm.id);
      const dy = this.dy && this.dy.side === 'p' ? this.dy.v : 0;
      ctx.drawImage(sp.back, px + 22 - 22 * s, 52 + 44 - 44 * s + dy, 44 * s, 44 * s);
    }
    if (this.ball) {
      const b = this.ball;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot || 0);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e04848'; ctx.beginPath(); ctx.arc(0, 0, 4, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(-4, -0.5, 8, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
      if (b.done) { ctx.fillStyle = '#ffd43b'; for (const [a, c] of [[-10, -8], [10, -8], [0, -12]]) ctx.fillRect(b.x + a, b.y + c, 2, 2); }
    }
    if (this.proj) { ctx.fillStyle = this.proj.c; ctx.beginPath(); ctx.arc(this.proj.x, this.proj.y, this.proj.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke(); }
    ctx.restore();
    // 對手資訊
    if (this.eHud && this.eVis !== false) {
      const m = this.em;
      drawText(ctx, monName(m), 6, 2);
      drawText(ctx, `Lv${m.lv}`, 62, 2);
      if (m.st) { ctx.fillStyle = '#c03030'; ctx.fillRect(6, 16, 22, 11); drawText(ctx, STATUS_NAME[m.st].slice(0, 2), 6, 15, '#ffffff'); }
      if (!this.tr && g.p.caught.includes(m.id)) { ctx.fillStyle = '#e04848'; ctx.beginPath(); ctx.arc(88, 8, 3, 0, Math.PI * 2); ctx.fill(); }
      drawText(ctx, 'HP', 30, 15, '#c08000');
      drawHpBar(ctx, 44, 19, 48, this.disp.e / maxHp(m));
      ctx.fillStyle = INK; ctx.fillRect(4, 27, 92, 1); ctx.fillRect(95, 18, 1, 10);
    }
    if (this.tr && this.eHud) {
      for (let i = 0; i < this.team.length; i++) { ctx.fillStyle = this.team[i].hp > 0 ? '#e04848' : '#a0a0a0'; ctx.fillRect(6 + i * 6, 30, 4, 4); }
    }
    if (this.pHud) {
      const m = this.pm, mx = maxHp(m);
      drawText(ctx, monName(m), 82, 52);
      drawText(ctx, `Lv${m.lv}`, 130, 52);
      drawText(ctx, 'HP', 82, 65, '#c08000');
      drawHpBar(ctx, 96, 69, 56, this.disp.p / mx);
      drawText(ctx, `${this.disp.p}/${mx}`, 108, 76);
      if (m.st) { ctx.fillStyle = '#c03030'; ctx.fillRect(82, 77, 22, 11); drawText(ctx, STATUS_NAME[m.st].slice(0, 2), 82, 76, '#ffffff'); }
      const lo = xpForLevel(m.lv), hi = xpForLevel(m.lv + 1);
      ctx.fillStyle = '#d0d0c8'; ctx.fillRect(96, 90, 58, 2);
      ctx.fillStyle = '#4890f0'; ctx.fillRect(96, 90, Math.round(58 * Math.min(1, (m.xp - lo) / Math.max(1, hi - lo))), 2);
      ctx.fillStyle = INK; ctx.fillRect(156, 64, 1, 30); ctx.fillRect(80, 93, 77, 1);
    }
    drawBox(ctx, 0, 96, SW, 48);
  }
}
