// Petits sons synthétisés (aucun fichier audio à charger).
let ctx = null;
let enabled = true;

export function setEnabled(v) { enabled = v; }
export function isEnabled() { return enabled; }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur, vol = 0.12, delay = 0) {
  const a = ac();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + delay);
}

const SOUNDS = {
  click: () => tone(660, 0.06, { type: 'triangle', vol: 0.08 }),
  build: () => { noise(0.18, 0.2); tone(180, 0.15, { type: 'square', vol: 0.06, slide: -60 }); tone(520, 0.12, { type: 'triangle', vol: 0.08, delay: 0.1 }); },
  road: () => noise(0.07, 0.08),
  error: () => { tone(200, 0.12, { type: 'square', vol: 0.06 }); tone(150, 0.16, { type: 'square', vol: 0.06, delay: 0.1 }); },
  coin: () => { tone(988, 0.08, { type: 'triangle', vol: 0.1 }); tone(1319, 0.14, { type: 'triangle', vol: 0.1, delay: 0.07 }); },
  demolish: () => { noise(0.35, 0.25); tone(120, 0.3, { type: 'sawtooth', vol: 0.05, slide: -60 }); },
  quest: () => [523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.1, delay: i * 0.09 })),
  good: () => { tone(784, 0.12, { type: 'sine', vol: 0.1 }); tone(1047, 0.18, { type: 'sine', vol: 0.1, delay: 0.1 }); },
  bad: () => { tone(330, 0.2, { type: 'sawtooth', vol: 0.05 }); tone(262, 0.3, { type: 'sawtooth', vol: 0.05, delay: 0.15 }); },
  alarm: () => [0, 0.25, 0.5].forEach((d) => tone(880, 0.15, { type: 'square', vol: 0.05, delay: d, slide: -300 })),
  season: () => tone(440, 0.4, { type: 'sine', vol: 0.06, slide: 220 }),
  era: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.12, delay: i * 0.13 })),
  victory: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.12, delay: i * 0.16 })),
};

export function play(name) {
  if (!enabled || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch { /* audio indisponible */ }
}
