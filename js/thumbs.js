// Miniatures des bâtiments (dessinées avec le même code que la carte) pour la barre d'outils.
import { BUILDINGS, TH } from './config.js';
import { OX, OY } from './iso.js';
import { drawBuilding } from './draw.js';

const cache = new Map();
const SIZE = 100;     // pixels du canvas (affiché en plus petit)
const SCALE = [0, 1.45, 0.92, 0.62];

export function thumb(type, level = 1, era = 0) {
  const key = `${type}-${level}-${era}`;
  if (cache.has(key)) return cache.get(key);
  const d = BUILDINGS[type];
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d');
  const k = SCALE[d.size] || 0.45;
  ctx.setTransform(k, 0, 0, k, SIZE / 2 - k * OX, SIZE - 4 - k * (OY + d.size * TH));
  drawBuilding(ctx, { type, x: 0, y: 0, level, res: 1, eff: 0 }, { season: 1, era, time: 0 });
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
