// Génération de la carte à partir d'une graine (même graine = même carte).
import { MAP_W, MAP_H, T } from './config.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateMap(seed) {
  const r = rng(seed);
  const tiles = new Array(MAP_W * MAP_H).fill(T.GRASS);

  const blob = (type, cx, cy, rad) => {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const d = Math.hypot(x - cx, y - cy) + (r() - 0.5) * 1.6;
        if (d < rad) tiles[y * MAP_W + x] = type;
      }
    }
  };
  const blobs = (type, count, minR, maxR) => {
    for (let i = 0; i < count; i++) {
      blob(type, r() * MAP_W, r() * MAP_H, minR + r() * (maxR - minR));
    }
  };

  blobs(T.WATER, 2, 2, 4);
  blobs(T.FOREST, 9, 2, 4.5);
  blobs(T.ROCK, 5, 1.2, 2.5);

  // Le centre reste dégagé pour l'hôtel de ville...
  const cx = MAP_W / 2, cy = MAP_H / 2;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 4.5) tiles[y * MAP_W + x] = T.GRASS;
    }
  }
  // ...avec toujours une forêt et des rochers à proximité.
  blob(T.FOREST, cx - 8, cy - 2, 2.8);
  blob(T.ROCK, cx + 8, cy + 3, 2);

  return tiles;
}
