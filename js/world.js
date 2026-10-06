// Génération de l'île à partir d'une graine (même graine = même carte).
import { MAP, T } from './config.js';

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

export function generateMap(seed) {
  const r = rng(seed);
  const elev = makeNoise(r), moist = makeNoise(r);
  const tiles = new Array(MAP * MAP);
  const c = MAP / 2;

  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      const d = Math.hypot(x - c, y - c) / c;            // 0 au centre, 1 au bord
      const e = elev(x / 9, y / 9) + 0.15 - Math.max(0, d - 0.74) * 2.6; // île
      const m = moist(x / 7 + 50, y / 7 + 50);
      let t;
      if (e < 0.3) t = T.WATER;
      else if (e < 0.335) t = T.SAND;
      else if (e > 0.8) t = T.MOUNTAIN;
      else if (e > 0.75) t = T.ROCK;
      else if (m > 0.58) t = T.FOREST;
      else if (m < 0.42 && e < 0.55) t = T.FERTILE;
      else t = T.GRASS;
      tiles[y * MAP + x] = t;
    }
  }

  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < MAP && y < MAP) tiles[y * MAP + x] = t; };
  const blob = (cx, cy, rad, t) => {
    for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) {
      for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) {
        if (Math.hypot(x - cx, y - cy) + (r() - 0.5) * 1.2 < rad) set(x, y, t);
      }
    }
  };
  const near = (t, rad) => {
    for (let y = c - rad; y < c + rad; y++) {
      for (let x = c - rad; x < c + rad; x++) if (tiles[y * MAP + x] === t) return true;
    }
    return false;
  };

  // Chaque partie doit pouvoir démarrer : forêt, rochers, eau, montagne et terre fertile pas trop loin.
  if (!near(T.FOREST, 9)) blob(c - 7, c - 3, 2.6, T.FOREST);
  if (!near(T.ROCK, 10)) blob(c + 7, c + 4, 1.8, T.ROCK);
  if (!near(T.FERTILE, 10)) blob(c + 4, c - 7, 2.4, T.FERTILE);
  if (!near(T.WATER, 13)) blob(c - 5, c + 9, 2.6, T.WATER);
  if (!near(T.MOUNTAIN, 15)) blob(c + 11, c - 8, 2, T.MOUNTAIN);

  // Centre dégagé pour l'hôtel de ville et les premières routes.
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      if (Math.hypot(x + 0.5 - c, y + 0.5 - c) < 4.2) tiles[y * MAP + x] = T.GRASS;
    }
  }
  return tiles;
}
