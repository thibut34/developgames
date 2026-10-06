// Génération de l'archipel à partir d'une graine (même graine = même carte) :
// une grande île au centre et quatre îles à coloniser, chacune avec sa spécialité.
import { MAP, T } from './config.js';
import { EN } from './i18n.js';
import en from './lang-en.js';

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Bruit de valeur lissé, plusieurs octaves.
function makeNoise(r) {
  const N = 64;
  const grid = Array.from({ length: N * N }, r);
  const at = (x, y) => grid[((y % N + N) % N) * N + ((x % N + N) % N)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const value = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y, octaves = 4) => {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += value(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };
}

export const ISLAND_KINDS = {
  home: { name: 'Île principale' },
  spice: { name: 'Île aux épices', desc: 'Sol tropical pour les plantations d\'épices.' },
  gold: { name: 'Île aux filons', desc: 'Filons d\'or pour les mines d\'or.' },
  fertile: { name: 'Île verdoyante', desc: 'Vastes terres fertiles.' },
  ore: { name: 'Île de fer', desc: 'Montagnes riches en minerai de fer.' },
};
if (EN) for (const [k, v] of Object.entries(ISLAND_KINDS)) [v.name, v.desc] = en.islands[k];

// Positions et types des îles d'une carte.
export function islandLayout(seed) {
  const r = rng(seed ^ 0x5eed);
  const c = MAP / 2;
  const kinds = ['spice', 'gold', 'fertile', 'ore'];
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  const list = [{ kind: 'home', cx: c, cy: c, r: 21 }];
  kinds.forEach((kind, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2 + (r() - 0.5) * 0.5;
    const d = 37 + r() * 1.5;
    list.push({ kind, cx: c + Math.cos(a) * d, cy: c + Math.sin(a) * d, r: 7.5 + r() * 1.5 });
  });
  return list;
}

export function generateMap(seed) {
  const r = rng(seed);
  const elev = makeNoise(r), moist = makeNoise(r), shape = makeNoise(r);
  const tiles = new Array(MAP * MAP);
  const islands = islandLayout(seed);
  const c = MAP / 2;

  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      // Île la plus « proche » (relativement à sa taille)
      let best = -1, isl = null;
      for (const I of islands) {
        const s = 1 - Math.hypot(x - I.cx, y - I.cy) / I.r;
        if (s > best) { best = s; isl = I; }
      }
      const land = best + (shape(x / 6, y / 6) - 0.5) * 0.4;
      if (land < 0.04) { tiles[y * MAP + x] = T.WATER; continue; }
      if (land < 0.1) { tiles[y * MAP + x] = T.SAND; continue; }
      const e = elev(x / 9, y / 9);
      const m = moist(x / 7 + 50, y / 7 + 50);
      let t;
      switch (isl.kind) {
        case 'spice':
          t = m > 0.62 ? T.FOREST : e > 0.72 ? T.ROCK : T.SPICE;
          break;
        case 'gold':
          t = e > 0.6 || best > 0.55 ? (e > 0.66 ? T.GOLD : T.MOUNTAIN) : m > 0.6 ? T.FOREST : T.GRASS;
          break;
        case 'fertile':
          t = m > 0.64 ? T.FOREST : T.FERTILE;
          break;
        case 'ore':
          t = e > 0.55 ? T.MOUNTAIN : e > 0.5 ? T.ROCK : m > 0.6 ? T.FOREST : T.GRASS;
          break;
        default:
          if (e > 0.78) t = T.MOUNTAIN;
          else if (e > 0.72) t = T.ROCK;
          else if (m > 0.58) t = T.FOREST;
          else if (m < 0.42 && e < 0.55) t = T.FERTILE;
          else t = T.GRASS;
      }
      tiles[y * MAP + x] = t;
    }
  }

  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < MAP && y < MAP) tiles[y * MAP + x] = t; };
  const blob = (cx, cy, rad, t) => {
    for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) {
      for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) {
        if (Math.hypot(x - cx, y - cy) + (r() - 0.5) * 1.2 < rad && tiles[y * MAP + x] !== T.WATER) set(x, y, t);
      }
    }
  };
  const near = (t, rad) => {
    for (let y = c - rad; y < c + rad; y++) {
      for (let x = c - rad; x < c + rad; x++) if (tiles[y * MAP + x] === t) return true;
    }
    return false;
  };

  // L'île principale doit permettre de démarrer : forêt, rochers, eau, montagne et terre fertile.
  if (!near(T.FOREST, 9)) blob(c - 7, c - 3, 2.6, T.FOREST);
  if (!near(T.ROCK, 10)) blob(c + 7, c + 4, 1.8, T.ROCK);
  if (!near(T.FERTILE, 10)) blob(c + 4, c - 7, 2.4, T.FERTILE);
  if (!near(T.MOUNTAIN, 14)) blob(c + 10, c - 7, 2, T.MOUNTAIN);
  // Un étang près du centre pour les premiers pêcheurs.
  if (!near(T.WATER, 8)) {
    for (let y = c + 5; y < c + 8; y++) for (let x = c - 7; x < c - 3; x++) set(x, y, T.WATER);
  }
  // Chaque île spéciale garde au moins une plage pour accoster et sa ressource.
  for (const I of islands.slice(1)) {
    if (I.kind === 'gold') blob(I.cx, I.cy, 2.2, T.GOLD);
    if (I.kind === 'spice') blob(I.cx, I.cy, 3, T.SPICE);
  }

  // Centre dégagé pour l'hôtel de ville et les premières routes.
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      if (Math.hypot(x + 0.5 - c, y + 0.5 - c) < 4.2) tiles[y * MAP + x] = T.GRASS;
    }
  }
  return tiles;
}

// Numéro d'île de chaque case (0 = île principale, -1 = eau) et liste des îles.
export function computeIslands(tiles, seed) {
  const id = new Int16Array(MAP * MAP).fill(-1);
  const layout = islandLayout(seed);
  const comps = [];
  for (let s = 0; s < MAP * MAP; s++) {
    if (tiles[s] === T.WATER || id[s] !== -1) continue;
    const n = comps.length;
    const stack = [s];
    id[s] = n;
    let count = 0, sx = 0, sy = 0;
    while (stack.length) {
      const i = stack.pop();
      const x = i % MAP, y = Math.floor(i / MAP);
      count++; sx += x; sy += y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MAP || ny >= MAP) continue;
        const j = ny * MAP + nx;
        if (tiles[j] !== T.WATER && id[j] === -1) { id[j] = n; stack.push(j); }
      }
    }
    const cx = sx / count, cy = sy / count;
    let kind = null, best = Infinity;
    for (const L of layout) {
      const d = Math.hypot(cx - L.cx, cy - L.cy);
      if (d < best) { best = d; kind = L.kind; }
    }
    comps.push({ size: count, cx, cy, kind });
  }
  // L'île principale (celle du centre) prend le numéro 0.
  const home = id[(MAP / 2) * MAP + MAP / 2];
  if (home > 0) {
    for (let i = 0; i < id.length; i++) {
      if (id[i] === home) id[i] = 0; else if (id[i] === 0) id[i] = home;
    }
    [comps[0], comps[home]] = [comps[home], comps[0]];
  }
  comps[0].kind = 'home';
  return { id, list: comps };
}
