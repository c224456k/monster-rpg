'use strict';
// 萌獸大冒險：網頁啟動、鍵盤與觸控按鈕
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

(async function boot() {
  const cv = document.getElementById('screen');
  try { await Promise.race([document.fonts.load('12px Cubic11'), new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* 字型載不到就用系統字 */ }
  const chip = new Chip();
  let store = null;
  try { store = window.localStorage; store.setItem('_t', '1'); store.removeItem('_t'); } catch (e) { store = null; }
  try { if (store && store.getItem('moemon_mute') === '1') chip.setMuted(true); } catch (e) { /* 忽略 */ }
  const g = new Game(cv, {
    storage: store,
    audio: chip,
    askName: (q, def) => new Promise((res) => {
      const box = document.getElementById('namebox'), inp = document.getElementById('nameinput'), ok = document.getElementById('nameok');
      document.getElementById('nameq').textContent = q;
      inp.value = def; box.hidden = false; inp.focus(); inp.select();
      const done = () => { box.hidden = true; ok.onclick = null; inp.onkeydown = null; res(inp.value); };
      ok.onclick = done;
      inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') done(); };
    }),
  });
  window.game = g;
  g.start();

  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
    z: 'a', Z: 'a', ' ': 'a', j: 'a', x: 'b', X: 'b', k: 'b', Backspace: 'b', Escape: 'b', Enter: 'start', Shift: 'b' };
  addEventListener('keydown', (e) => {
    if (!document.getElementById('namebox').hidden) return;
    const b = KEYS[e.key]; if (!b) return;
    e.preventDefault(); chip.unlock(); g.keyDown(b);
  });
  addEventListener('keyup', (e) => { const b = KEYS[e.key]; if (b) g.keyUp(b); });
  // 觸控按鈕
  document.querySelectorAll('[data-b]').forEach((el) => {
    const b = el.dataset.b;
    const down = (e) => { e.preventDefault(); chip.unlock(); g.keyDown(b); el.classList.add('on'); };
    const up = (e) => { e.preventDefault(); g.keyUp(b); el.classList.remove('on'); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
  });
  // 十字鍵：手指滑動也能換方向
  const pad = document.getElementById('dpad');
  let padDir = null;
  const padAt = (e) => {
    const r = pad.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    if (Math.hypot(x, y) < r.width * .12) return null;
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
  };
  const setPad = (d) => { if (padDir === d) return; if (padDir) g.keyUp(padDir); padDir = d; if (d) g.keyDown(d); pad.dataset.dir = d || ''; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); chip.unlock(); pad.setPointerCapture(e.pointerId); setPad(padAt(e)); });
  pad.addEventListener('pointermove', (e) => { if (padDir !== null || e.buttons) setPad(padAt(e)); });
  const padUp = () => setPad(null);
  pad.addEventListener('pointerup', padUp); pad.addEventListener('pointercancel', padUp);
  // 靜音
  const mute = document.getElementById('mute');
  const showMute = () => { mute.textContent = chip.muted ? '🔇' : '🔊'; };
  showMute();
  mute.addEventListener('click', () => { chip.unlock(); chip.setMuted(!chip.muted); try { store && store.setItem('moemon_mute', chip.muted ? '1' : '0'); } catch (e) { /* 忽略 */ } showMute(); });
  // 離開頁面前自動存檔提示：只在遊戲中
  // 固定 60 FPS 推進
  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) { g.tick(); acc -= 1000 / 60; }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // 縮放：整數倍放大
  function fit() {
    const wrap = document.getElementById('screenwrap');
    const maxW = wrap.clientWidth, maxH = wrap.clientHeight;
    let s = Math.floor(Math.min(maxW / 160, maxH / 144) * 4) / 4;
    if (s >= 2) s = Math.floor(Math.min(maxW / 160, maxH / 144));
    s = Math.max(1, s);
    cv.style.width = `${160 * s}px`; cv.style.height = `${144 * s}px`;
  }
  addEventListener('resize', fit); fit(); setTimeout(fit, 300);
})();
