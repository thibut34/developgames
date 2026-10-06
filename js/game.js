// Logique du jeu : état, construction, simulation jour par jour, sauvegarde.
import {
  MAP_W, MAP_H, T, BUILDINGS, BASE_STORAGE, FOOD_PER_PERSON, TAX_PER_PERSON,
  GROWTH_PER_DAY, START,
} from './config.js';
import { generateMap } from './world.js';

const SAVE_KEY = 'developgames-save';

export function createGame(seed = Math.floor(Math.random() * 1e9)) {
  const g = {
    seed,
    tiles: generateMap(seed),
    buildings: [],
    res: { ...START.res },
    pop: START.pop,
    day: 0,
    nextId: 1,
  };
  g.buildings.push({ id: g.nextId++, type: 'townhall', x: MAP_W / 2 - 1, y: MAP_H / 2 - 1 });
  rebuild(g);
  return g;
}

function rebuild(g) {
  g.occ = new Int32Array(MAP_W * MAP_H);
  for (const b of g.buildings) {
    const s = BUILDINGS[b.type].size;
    for (let dy = 0; dy < s; dy++) {
      for (let dx = 0; dx < s; dx++) g.occ[(b.y + dy) * MAP_W + b.x + dx] = b.id;
    }
  }
  assignWorkers(g);
}

const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;

export function tileAt(g, x, y) {
  return inMap(x, y) ? g.tiles[y * MAP_W + x] : null;
}

export function buildingAt(g, x, y) {
  if (!inMap(x, y)) return null;
  const id = g.occ[y * MAP_W + x];
  return id ? g.buildings.find((b) => b.id === id) : null;
}

export const housing = (g) => g.buildings.reduce((n, b) => n + (BUILDINGS[b.type].housing || 0), 0);
export const storage = (g) => g.buildings.reduce((n, b) => n + (BUILDINGS[b.type].storage || 0), BASE_STORAGE);

export function canAfford(g, cost = {}) {
  return Object.entries(cost).every(([k, v]) => g.res[k] >= v);
}

function touches(g, x, y, size, terrain) {
  for (let ty = y - 1; ty <= y + size; ty++) {
    for (let tx = x - 1; tx <= x + size; tx++) {
      if (tileAt(g, tx, ty) === terrain) return true;
    }
  }
  return false;
}

export function canPlace(g, type, x, y) {
  const def = BUILDINGS[type];
  for (let dy = 0; dy < def.size; dy++) {
    for (let dx = 0; dx < def.size; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inMap(tx, ty)) return { ok: false, reason: 'Hors de la carte' };
      if (g.tiles[ty * MAP_W + tx] !== T.GRASS) return { ok: false, reason: 'Terrain non constructible' };
      if (g.occ[ty * MAP_W + tx]) return { ok: false, reason: 'Emplacement occupé' };
    }
  }
  if (def.near != null && !touches(g, x, y, def.size, def.near)) {
    return { ok: false, reason: def.near === T.FOREST ? 'Doit toucher une forêt' : 'Doit toucher des rochers' };
  }
  if (!canAfford(g, def.cost)) return { ok: false, reason: 'Ressources insuffisantes' };
  return { ok: true };
}

export function place(g, type, x, y) {
  const check = canPlace(g, type, x, y);
  if (!check.ok) return check;
  for (const [k, v] of Object.entries(BUILDINGS[type].cost || {})) g.res[k] -= v;
  g.buildings.push({ id: g.nextId++, type, x, y });
  rebuild(g);
  return { ok: true };
}

export function demolish(g, x, y) {
  const b = buildingAt(g, x, y);
  if (!b) return { ok: false, reason: 'Rien à démolir ici' };
  if (b.type === 'townhall') return { ok: false, reason: "L'hôtel de ville ne peut pas être démoli" };
  for (const [k, v] of Object.entries(BUILDINGS[b.type].cost || {})) g.res[k] += Math.floor(v / 2);
  g.buildings = g.buildings.filter((o) => o !== b);
  rebuild(g);
  return { ok: true, name: BUILDINGS[b.type].name };
}

// Les habitants vont travailler dans les bâtiments dans l'ordre de construction.
function assignWorkers(g) {
  let available = Math.floor(g.pop);
  for (const b of g.buildings) {
    const w = BUILDINGS[b.type].workers || 0;
    b.active = available >= w;
    if (b.active) available -= w;
  }
  g.idle = available;
}

export function step(g) {
  g.day++;
  assignWorkers(g);

  const gain = { wood: 0, stone: 0, food: 0, gold: 0 };
  for (const b of g.buildings) {
    if (!b.active) continue;
    for (const [k, v] of Object.entries(BUILDINGS[b.type].produces || {})) gain[k] += v;
  }
  gain.gold += g.pop * TAX_PER_PERSON;
  gain.food -= g.pop * FOOD_PER_PERSON;
  g.lastGain = gain;

  const cap = storage(g);
  for (const k of Object.keys(gain)) {
    g.res[k] += gain[k];
    if (k !== 'gold') g.res[k] = Math.min(g.res[k], cap);
  }

  g.starving = g.res.food < 0;
  if (g.starving) g.res.food = 0;

  const h = housing(g);
  if (g.starving) g.pop = Math.max(1, g.pop - GROWTH_PER_DAY);
  else if (g.pop < h && g.res.food >= 5) g.pop = Math.min(h, g.pop + GROWTH_PER_DAY);
  else if (g.pop > h) g.pop = h;
}

export function save(g) {
  const data = {
    v: 1, seed: g.seed, res: g.res, pop: g.pop, day: g.day, nextId: g.nextId,
    buildings: g.buildings.map(({ id, type, x, y }) => ({ id, type, x, y })),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* stockage indisponible */ }
}

export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!data || data.v !== 1) return null;
    const g = { ...data, tiles: generateMap(data.seed) };
    rebuild(g);
    return g;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* rien */ }
}
