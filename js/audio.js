'use strict';
// 萌獸大冒險：8-bit 音樂與音效（Web Audio 即時合成，曲子全部原創）
// 譜：每個記號是一個八分音符；. 休止；- 延長前一個音；| 只是分小節好讀。鼓：k 大鼓 s 小鼓 h 鈸

const TRACKS = {
  town: { bpm: 118, lead: 'E5 - G5 E5 C5 - D5 E5 | F5 - E5 D5 C5 - - . | D5 - F5 D5 B4 - C5 D5 | E5 - D5 C5 G4 - - . | E5 - G5 E5 C6 - B5 A5 | G5 - E5 C5 A4 - - . | F5 E5 D5 C5 B4 C5 D5 - | C5 - - - . . . .',
    bass: 'C3 . G3 . C3 . G3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . E3 . | C3 . G3 . A2 . E3 . | F2 . C3 . F2 . A2 . | G2 . G2 . G2 . B2 . | C3 . G2 . C3 . . .',
    drum: 'k . h . s . h . | k . h . s . h h' },
  route: { bpm: 140, lead: 'D5 - G5 - A5 - B5 A5 | G5 - D5 - B4 - D5 - | E5 - C5 - E5 - G5 F#5 | E5 - D5 - - - . . | D5 - G5 - A5 - B5 C6 | D6 - B5 - G5 - E5 - | F#5 - A5 - G5 - F#5 E5 | D5 - - - . . D5 -',
    bass: 'G2 . D3 . G2 . D3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | C3 . G2 . D3 . A2 . | D3 . D3 . D3 . F#2 .',
    drum: 'k . h . s . h . | k h h . s . h k' },
  cave: { bpm: 92, lead: 'A4 - - C5 B4 - E4 - | A4 - - C5 D5 - - . | E5 - - D5 C5 - B4 - | A4 - - - . . . . | C5 - - E5 D5 - A4 - | B4 - - D5 C5 - - . | E5 - F5 E5 D5 - C5 - | B4 - - - G#4 - - -',
    bass: 'A2 - - - E2 - - - | A2 - - - F2 - - - | C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - C3 - - - | G2 - - - E2 - - - | F2 - - - D2 - - - | E2 - - - E2 - - -',
    drum: 'k . . . h . . . | k . . . h . h .' },
  center: { bpm: 100, lead: 'A5 - G5 F5 C5 - F5 - | G5 - A5 - G5 - - . | A5 - C6 A5 G5 - F5 - | E5 F5 G5 - F5 - - .',
    bass: 'F3 . C3 . F3 . C3 . | C3 . G2 . C3 . E3 . | F3 . C3 . A#2 . D3 . | C3 . C3 . F3 . . .' },
  gym: { bpm: 128, lead: 'D5 - F5 - A5 - G5 F5 | E5 - C5 - D5 - - . | D5 - F5 - A5 - C6 A#5 | A5 - G5 - A5 - - . | F5 - A5 - D6 - C6 A#5 | A5 - G5 - F5 - E5 - | F5 - E5 - D5 - C#5 - | D5 - - - . . . .',
    bass: 'D3 D3 . D3 D3 . D3 . | C3 C3 . C3 C3 . C3 . | A#2 A#2 . A#2 A#2 . A#2 . | A2 A2 . A2 A2 . C#3 . | A#2 A#2 . A#2 A#2 . A#2 . | C3 C3 . C3 C3 . C3 . | A2 A2 . A2 A2 . A2 . | D3 D3 . D3 A2 . D3 .',
    drum: 'k . h k s . h . | k . h k s h s s' },
  wild: { bpm: 168, lead: 'E5 E5 G5 E5 A5 G5 E5 D5 | E5 - B4 - E5 - - . | E5 E5 G5 E5 B5 A5 G5 A5 | F#5 - D5 - F#5 - - . | G5 - E5 - C6 - B5 A5 | G5 - F#5 - E5 - D5 - | E5 F#5 G5 A5 B5 - A5 G5 | F#5 - - - D#5 - - -',
    bass: 'E2 E3 E2 E3 E2 E3 E2 E3 | E2 E3 E2 E3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 A1 A2 A1 A2 | B1 B2 B1 B2 B1 B2 B1 B2 | C2 C3 C2 C3 D2 D3 D2 D3 | B1 B2 B1 B2 B1 B2 B1 B2',
    drum: 'k h s h k k s h' },
  trainer: { bpm: 172, lead: 'A5 - E5 A5 C6 - B5 A5 | G5 - E5 - G5 A5 - . | F5 - C5 F5 A5 - G5 F5 | E5 - - - G#5 - - - | A5 - E5 A5 C6 - D6 C6 | B5 - G5 - B5 C6 - . | D6 - C6 B5 A5 - G5 F5 | E5 - - - E5 - G#5 -',
    bass: 'A2 A3 A2 A3 A2 A3 A2 A3 | G2 G3 G2 G3 G2 G3 G2 G3 | F2 F3 F2 F3 F2 F3 F2 F3 | E2 E3 E2 E3 E2 E3 E2 E3 | A2 A3 A2 A3 A2 A3 A2 A3 | G2 G3 G2 G3 G2 G3 G2 G3 | F2 F3 F2 F3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3',
    drum: 'k h s h k h s s' },
  gymbattle: { ref: 'trainer', bpm: 182, tr: 2 },
  champ: { ref: 'wild', bpm: 184, tr: -3 },
  legend: { ref: 'cave', bpm: 150, tr: 0, drum: 'k h s h k k s h' },
  rival: { bpm: 150, lead: 'G5 - G5 G5 G#5 - G5 F5 | D#5 - F5 - G5 - - . | C6 - A#5 - G#5 - G5 - | F5 - G5 - D5 - - .',
    bass: 'C3 G3 C3 G3 C3 G3 C3 G3 | G#2 D#3 G#2 D#3 G#2 D#3 G#2 D#3 | F2 C3 F2 C3 F2 C3 F2 C3 | G2 D3 G2 D3 G2 D3 G2 D3', drum: 'k . s . k k s .' },
  trainer_eye: { bpm: 150, lead: 'E5 G5 E5 G5 B5 - A5 - | G5 E5 G5 E5 D5 - - .', bass: 'E3 . E3 . E3 . D3 . | C3 . C3 . B2 . . .' },
  victory: { bpm: 130, lead: 'C5 E5 G5 C6 - - G5 - | A5 - F5 - A5 C6 - . | B5 - G5 - D5 - G5 - | C6 - - - . . . .',
    bass: 'C3 . G3 . C3 . E3 . | F3 . C3 . F3 . A3 . | G3 . D3 . G3 . B2 . | C3 . G2 . C3 . . .' },
  evo: { bpm: 126, lead: 'C5 D5 E5 G5 C5 D5 E5 G5 | D5 E5 F#5 A5 D5 E5 F#5 A5', bass: 'C3 - - - C3 - - - | D3 - - - D3 - - -' },
  intro: { ref: 'town', bpm: 100, tr: 0 },
  heal: { bpm: 120, once: 1, lead: 'C5 E5 G5 C6 - - E6 - - - . .', bass: 'C3 - - - G3 - - - C3 - - -' },
  caught: { bpm: 140, once: 1, lead: 'G5 - G5 A5 B5 - G5 - | C6 - - - - - . .', bass: 'G3 - - - G3 - - - | C3 - - - - - . .' },
};

const NOTE_IDX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function noteFreq(tok, tr) {
  const m = /^([A-G]#?)(\d)$/.exec(tok);
  if (!m) return 0;
  const midi = (Number(m[2]) + 1) * 12 + NOTE_IDX[m[1]] + (tr || 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parseLine(s) { return s ? s.split(/\s+/).filter((t) => t && t !== '|') : null; }

class Chip {
  constructor() { this.ac = null; this.cur = null; this.name = null; this.muted = false; }
  unlock() {
    if (!this.ac) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return;
      this.ac = new AC();
      this.out = this.ac.createGain(); this.out.gain.value = this.muted ? 0 : .5; this.out.connect(this.ac.destination);
      const real = new Float32Array(32), imag = new Float32Array(32);
      for (let n = 1; n < 32; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * .25);
      this.pulse = this.ac.createPeriodicWave(real, imag);
      const len = this.ac.sampleRate;
      this.noise = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      setInterval(() => this.sched(), 25);
      const want = this.name; this.name = null;
      if (want) this.music(want);
    }
    if (this.ac.state === 'suspended') this.ac.resume();
  }
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : .5; }
  music(name) {
    if (name === this.name) return;
    this.name = name;
    if (!this.ac) return;
    let t = TRACKS[name];
    if (!t) { this.cur = null; return; }
    const base = t.ref ? TRACKS[t.ref] : t;
    this.cur = { bpm: t.bpm || base.bpm, tr: t.tr || 0, once: t.once, lead: parseLine(base.lead), bass: parseLine(base.bass), drum: parseLine(t.drum || base.drum), step: 0, next: this.ac.currentTime + .06 };
  }
  sched() {
    const c = this.cur;
    if (!c || !this.ac) return;
    const dur = 60 / c.bpm / 2;
    while (c.next < this.ac.currentTime + .15) {
      const len = c.lead.length;
      if (c.once && c.step >= len) { this.cur = null; return; }
      for (const [ch, line] of [['lead', c.lead], ['bass', c.bass], ['drum', c.drum]]) {
        if (!line) continue;
        const i = c.step % line.length, tok = line[i];
        if (ch === 'drum') { if (tok !== '.' && tok !== '-') this.drum(tok, c.next); continue; }
        if (tok === '.' || tok === '-') continue;
        let n = 1;
        while (line[(i + n) % line.length] === '-' && n < line.length) n++;
        this.tone(ch === 'lead' ? 'pulse' : 'triangle', noteFreq(tok, c.tr), c.next, dur * n * .92, ch === 'lead' ? .1 : .2);
      }
      c.step++; c.next += dur;
    }
  }
  tone(type, f, t, d, vol, f2) {
    if (!f) return;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    if (type === 'pulse') o.setPeriodicWave(this.pulse); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .005);
    g.gain.setValueAtTime(vol * .75, t + Math.min(d, .06));
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + d + .02);
  }
  hiss(t, d, vol, hp) {
    const s = this.ac.createBufferSource(), g = this.ac.createGain(), f = this.ac.createBiquadFilter();
    s.buffer = this.noise; f.type = 'highpass'; f.frequency.value = hp || 1000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(f); f.connect(g); g.connect(this.out);
    s.start(t, Math.random() * .5); s.stop(t + d + .02);
  }
  drum(k, t) {
    if (k === 'k') this.tone('triangle', 150, t, .12, .35, 40);
    else if (k === 's') this.hiss(t, .12, .12, 1500);
    else if (k === 'h') this.hiss(t, .04, .05, 6000);
  }
  sfx(n) {
    if (!this.ac) return;
    const t = this.ac.currentTime + .01;
    const seq = (notes, step, type = 'pulse', vol = .14) => notes.forEach((f, i) => this.tone(type, f, t + i * step, step * .95, vol));
    switch (n) {
      case 'blip': this.tone('pulse', 1046, t, .035, .08); break;
      case 'bump': this.tone('square', 110, t, .07, .1); break;
      case 'door': this.hiss(t, .15, .1, 400); this.tone('triangle', 220, t, .1, .2, 110); break;
      case 'hit': this.hiss(t, .15, .3, 300); this.tone('square', 180, t, .08, .1, 60); break;
      case 'hit2': this.hiss(t, .28, .38, 200); this.tone('square', 220, t, .15, .14, 50); break;
      case 'hit0': this.hiss(t, .08, .18, 800); break;
      case 'faint': this.tone('pulse', 700, t, .45, .14, 90); break;
      case 'pop': this.tone('pulse', 300, t, .09, .12, 900); break;
      case 'cry': this.tone('sawtooth', 380 + Math.random() * 200, t, .1, .08, 760); this.tone('sawtooth', 700, t + .1, .2, .08, 260); break;
      case 'throw': this.tone('triangle', 600, t, .18, .2, 1400); break;
      case 'shake': this.tone('square', 260, t, .04, .1); this.tone('square', 200, t + .06, .04, .1); break;
      case 'levelup': seq([523, 659, 784, 1046], .07); break;
      case 'get': seq([784, 988, 1175, 1568], .08); break;
      case 'buy': seq([1318, 1760], .07); break;
      case 'save': seq([659, 784, 1046], .1); break;
      case 'badge': seq([523, 659, 784, 1046, 784, 1046, 1318], .09); break;
      case 'heal': seq([1046, 1318, 1568], .06, 'triangle', .2); break;
      case 'status': for (let i = 0; i < 4; i++) this.tone('pulse', i % 2 ? 330 : 440, t + i * .05, .045, .1); break;
      case 'statup': this.tone('pulse', 300, t, .3, .1, 1200); break;
      case 'statdown': this.tone('pulse', 1200, t, .3, .1, 300); break;
      case 'miss': this.hiss(t, .2, .08, 3000); break;
      case 'alert': this.tone('pulse', 1568, t, .06, .12); this.tone('pulse', 2093, t + .08, .1, .12); break;
      case 'run': this.tone('pulse', 900, t, .2, .1, 200); break;
    }
  }
}
