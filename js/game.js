// Moteur du jeu : état, construction, routes, simulation jour par jour, incendies, événements, sauvegarde.
import {
  MAP, T, TERRAIN, CLEAR, GOODS, GOOD_KEYS, START, BASE_STORAGE, STORAGE_PER_ERA, WORKFORCE, ROAD_COST,
  CLASSES, TAXES, ERAS, BUILDINGS, WORK_PRIORITY, QUESTS, DAYS_PER_SEASON, SEASONS, FIRE, TECHS,
} from './config.js';
import { generateMap } from './world.js';

const SAVE_KEY = 'developgames-save-v3';

export const def = (b) => BUILDINGS[b.type];
const idx = (x, y) => y * MAP + x;
export const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP;
export const resName = (k) => (k === 'gold' ? 'or' : GOODS[k].name.toLowerCase());

// ---------- Création ----------

export function createGame(seed = Math.floor(Math.random() * 1e9)) {
  const goods = Object.fromEntries(GOOD_KEYS.map((k) => [k, START.goods[k] || 0]));
  const g = {
    seed,
    tiles: generateMap(seed),
    cleared: [],
    roads: new Uint8Array(MAP * MAP),
    buildings: [],
    goods,
    gold: START.gold,
    day: 0,
    era: 0,
    tax: 1,
    quest: 0,
    log: [],
    history: [],
    prices: Object.fromEntries(GOOD_KEYS.map((k) => [k, 1])),
    nextId: 1,
    won: false,
    stats: { built: 0, fires: 0, maxPop: 0 },
    alerts: {},
    tech: [],
    rp: 0,
  };
  const c = MAP / 2 - 1;
  g.buildings.push({ id: g.nextId++, type: 'townhall', x: c, y: c, level: 1 });
  // Routes de départ en croix autour de l'hôtel de ville.
  for (let i = -5; i <= 6; i++) {
    for (const [x, y] of [[c + i, c + 2], [c - 1, c + i]]) {
      if (inMap(x, y) && TERRAIN[g.tiles[idx(x, y)]].build) g.roads[idx(x, y)] = 1;
    }
  }
  init(g);
  log(g, 'Fondation du hameau.', 'good');
  return g;
}

function init(g) {
  g.notes = [];      // messages à afficher (vidés par l'interface)
  g.pending = [];    // fenêtres à ouvrir (caravane, ère, victoire)
  g.terrainVersion = (g.terrainVersion || 0) + 1;
  g.supply = CLASSES.map(() => ({}));
  g.flow = { prod: {}, use: {} };
  g.fin = { taxes: 0, upkeep: 0, other: 0 };
  computeMods(g);
  rebuild(g);
  for (const b of g.buildings) if (isHouse(b)) b.sat = b.connected ? houseSat(g, b) : 0;
}

// ---------- Outils de calcul ----------

export const season = (g) => Math.floor(g.day / DAYS_PER_SEASON) % 4;
export const year = (g) => Math.floor(g.day / (DAYS_PER_SEASON * 4)) + 1;
export const dayOfSeason = (g) => (g.day % DAYS_PER_SEASON) + 1;
export const dateText = (g) => `${SEASONS[season(g)].name}, jour ${dayOfSeason(g)}, an ${year(g)}`;

export function tileAt(g, x, y) { return inMap(x, y) ? g.tiles[idx(x, y)] : null; }
export function roadAt(g, x, y) { return inMap(x, y) && g.roads[idx(x, y)] === 1; }
export function buildingAt(g, x, y) {
  if (!inMap(x, y)) return null;
  const id = g.occ[idx(x, y)];
  return id ? g.byId.get(id) : null;
}

export const isHouse = (b) => b.type === 'house';
export const capOf = (b) => (isHouse(b) ? CLASSES[b.level - 1].cap : 0);
export const population = (g) => g.cls.reduce((a, b) => a + b, 0);
export const storage = (g) =>
  g.buildings.reduce((n, b) => n + (b.build ? 0 : def(b).storage || 0), BASE_STORAGE + g.era * STORAGE_PER_ERA + g.mods.storage);
export const upkeepOf = (b) => (b.build ? 0 : def(b).upkeep || 0);
export const workersNeeded = (b) => (def(b).workers ? def(b).workers[1] : 0);

export function isWorking(b) {
  const d = def(b);
  if (b.fire > 0 || b.paused || b.build) return false;
  if (d.workers) return b.connected && b.assigned > 0;
  return true;
}

export const amount = (g, k) => (k === 'gold' ? g.gold : g.goods[k]);
export function canAfford(g, cost = {}) {
  return Object.entries(cost).every(([k, v]) => amount(g, k) >= v);
}
function pay(g, cost = {}) {
  for (const [k, v] of Object.entries(cost)) {
    if (k === 'gold') g.gold -= v; else g.goods[k] -= v;
  }
}
export function gain(g, res = {}) {
  const cap = storage(g);
  for (const [k, v] of Object.entries(res)) {
    if (k === 'gold') g.gold += v;
    else g.goods[k] = Math.min(Math.max(cap, g.goods[k]), g.goods[k] + v);
  }
}

function footprintDist(a, b) {
  const as = def(a).size, bs = def(b).size;
  const dx = Math.max(0, a.x - (b.x + bs - 1), b.x - (a.x + as - 1));
  const dy = Math.max(0, a.y - (b.y + bs - 1), b.y - (a.y + as - 1));
  return Math.max(dx, dy);
}

function borderTiles(x, y, s) {
  const out = [];
  for (let i = 0; i < s; i++) out.push([x + i, y - 1], [x + i, y + s], [x - 1, y + i], [x + s, y + i]);
  return out.filter(([tx, ty]) => inMap(tx, ty));
}

function touches(g, x, y, s, terrain) {
  for (let ty = y - 1; ty <= y + s; ty++) {
    for (let tx = x - 1; tx <= x + s; tx++) if (tileAt(g, tx, ty) === terrain) return true;
  }
  return false;
}

export function log(g, text, kind = '') {
  g.log.unshift({ day: g.day, text, kind });
  if (g.log.length > 100) g.log.length = 100;
}
function notify(g, text, kind = '', sound = '', focus = null) {
  g.notes?.push({ text, kind, sound, focus });
  log(g, text, kind);
}

// ---------- Recalculs (routes, ouvriers, couvertures) ----------

export function rebuild(g) {
  g.occ = new Int32Array(MAP * MAP);
  g.byId = new Map();
  for (const b of g.buildings) {
    g.byId.set(b.id, b);
    const s = def(b).size;
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) g.occ[idx(b.x + dx, b.y + dy)] = b.id;
  }
  countClasses(g);
  computeConnectivity(g);
  assignWorkers(g);
  computeCoverage(g);
}

function countClasses(g) {
  g.cls = CLASSES.map(() => 0);
  for (const b of g.buildings) if (isHouse(b)) g.cls[b.level - 1] += b.res || 0;
}

function computeConnectivity(g) {
  const conn = new Uint8Array(MAP * MAP);
  const th = g.buildings.find((b) => b.type === 'townhall');
  const queue = [];
  for (const [x, y] of borderTiles(th.x, th.y, 2)) {
    if (g.roads[idx(x, y)]) { conn[idx(x, y)] = 1; queue.push([x, y]); }
  }
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (inMap(nx, ny) && g.roads[idx(nx, ny)] && !conn[idx(nx, ny)]) {
        conn[idx(nx, ny)] = 1;
        queue.push([nx, ny]);
      }
    }
  }
  g.roadConn = conn;
  for (const b of g.buildings) {
    b.connected = b.type === 'townhall' ||
      borderTiles(b.x, b.y, def(b).size).some(([x, y]) => conn[idx(x, y)]);
  }
}

function priority(b) {
  const i = WORK_PRIORITY.indexOf(b.type);
  return i < 0 ? WORK_PRIORITY.length : i;
}

function assignWorkers(g) {
  const avail = g.cls.map((n) => Math.floor(n * WORKFORCE));
  g.workforce = [...avail];
  const list = g.buildings
    .filter((b) => def(b).workers)
    .sort((a, b) => priority(a) - priority(b) || a.id - b.id);
  for (const b of list) {
    const [c, n] = def(b).workers;
    if (b.paused || b.fire > 0 || b.build || !b.connected) { b.assigned = 0; continue; }
    b.assigned = Math.min(n, avail[c]);
    avail[c] -= b.assigned;
  }
  g.idle = avail;
}

function computeCoverage(g) {
  const services = g.buildings.filter((b) => def(b).service && isWorking(b) && (b.connected || !def(b).workers));
  const decors = g.buildings.filter((b) => def(b).decor && !b.build);
  for (const b of g.buildings) {
    b.cover = {};
    for (const s of services) {
      if (footprintDist(b, s) <= serviceRange(g, def(s))) b.cover[def(s).service.type] = true;
    }
    if (isHouse(b)) {
      b.decor = decors.reduce((n, d) => n + (footprintDist(b, d) <= def(d).decor.r ? def(d).decor.v : 0), 0);
    }
  }
}

// ---------- Besoins des habitations ----------

// Satisfaction de chaque besoin (0 à 1) pour une maison, au niveau donné.
export function houseNeeds(g, b, level = b.level) {
  const c = level - 1;
  return CLASSES[c].needs.map((n) => {
    let value, label;
    if (n.food) { value = g.supply[c].food ?? (g.goods.fish + g.goods.bread > 0 ? 1 : 0); label = n.label; }
    else if (n.good) { value = g.supply[c][n.good] ?? (g.goods[n.good] > 0 ? 1 : 0); label = GOODS[n.good].name; }
    else if (n.service) { value = b.cover[n.service] ? 1 : 0; label = n.label; }
    else { value = Math.min(1, (b.decor || 0) / n.decor); label = n.label; }
    return { ...n, label, value };
  });
}

export function houseSat(g, b, level = b.level) {
  const list = houseNeeds(g, b, level);
  const avg = list.reduce((n, x) => n + x.value, 0) / list.length;
  return Math.max(0, Math.min(1, avg + TAXES[g.tax].sat + g.mods.sat - (g.broke ? 0.1 : 0)));
}

// Peut-elle passer au niveau supérieur ? Renvoie la raison sinon.
export function upgradeStatus(g, b) {
  if (b.level >= CLASSES.length) return { ok: false, max: true, reason: 'Niveau maximum' };
  const next = CLASSES[b.level];
  if (g.era < b.level) return { ok: false, reason: `Disponible à l'ère : ${ERAS[b.level].name}` };
  if ((b.sat ?? 0) < 0.8) return { ok: false, reason: 'Habitants pas assez satisfaits (80 % requis)' };
  if ((b.res || 0) < capOf(b) * 0.9) return { ok: false, reason: 'Maison pas encore pleine' };
  // On ne fait évoluer que si la classe suivante trouvera de quoi vivre (sinon elle repartirait).
  const nextNeeds = houseNeeds(g, b, b.level + 1);
  const goodsNeeds = nextNeeds.filter((n) => n.good || n.food);
  const goodsAvg = goodsNeeds.reduce((n, x) => n + x.value, 0) / Math.max(1, goodsNeeds.length);
  if (houseSat(g, b, b.level + 1) < 0.7 || goodsAvg < 0.5) {
    return { ok: false, reason: `Les besoins des ${next.name.toLowerCase()} ne sont pas encore prêts` };
  }
  if (!canAfford(g, next.upgrade)) return { ok: false, reason: `Il faut ${costText(next.upgrade)}` };
  return { ok: true, cost: next.upgrade };
}

export function upgradeHouse(g, b) {
  const s = upgradeStatus(g, b);
  if (!s.ok) return s;
  pay(g, s.cost);
  b.level++;
  b.sat = houseSat(g, b);
  rebuild(g);
  checkQuests(g);
  return { ok: true };
}

export const costText = (cost = {}) =>
  Object.entries(cost).map(([k, v]) => `${Math.ceil(v)} ${resName(k)}`).join(', ');

// ---------- Construction ----------

// Raison pour laquelle un bâtiment n'est pas encore disponible (ère ou technologie), sinon null.
export function lockReason(g, type) {
  const d = BUILDINGS[type];
  if ((d.era || 0) > g.era) return `Débloqué à l'ère : ${ERAS[d.era].name}`;
  if (d.tech && !g.tech.includes(d.tech)) return `Nécessite la technologie : ${TECHS.find((t) => t.id === d.tech).name}`;
  return null;
}
export const eraLocked = (g, type) => !!lockReason(g, type);

export function canPlace(g, type, x, y) {
  const d = BUILDINGS[type];
  const lock = lockReason(g, type);
  if (lock) return { ok: false, reason: lock };
  if (d.unique && g.buildings.some((b) => b.type === type)) return { ok: false, reason: 'Déjà construit' };
  for (let dy = 0; dy < d.size; dy++) {
    for (let dx = 0; dx < d.size; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inMap(tx, ty)) return { ok: false, reason: 'Hors de la carte' };
      const t = g.tiles[idx(tx, ty)];
      if (!TERRAIN[t].build) return { ok: false, reason: `Impossible sur : ${TERRAIN[t].name.toLowerCase()}` };
      if (g.occ[idx(tx, ty)]) return { ok: false, reason: 'Emplacement occupé' };
      if (g.roads[idx(tx, ty)]) return { ok: false, reason: 'Une route passe ici' };
    }
  }
  if (d.near != null && !touches(g, x, y, d.size, d.near)) {
    return { ok: false, reason: `Doit toucher : ${TERRAIN[d.near].name.toLowerCase()}` };
  }
  if (!canAfford(g, d.cost)) return { ok: false, reason: `Il manque des ressources (${costText(d.cost)})` };
  return { ok: true };
}

export function place(g, type, x, y) {
  const check = canPlace(g, type, x, y);
  if (!check.ok) return check;
  const d = BUILDINGS[type];
  pay(g, d.cost);
  const b = { id: g.nextId++, type, x, y, level: 1 };
  if (type === 'house') b.res = 0;
  if (d.buildDays) b.build = Math.round(d.buildDays * g.mods.wonderTime);
  g.buildings.push(b);
  g.stats.built++;
  rebuild(g);
  checkQuests(g);
  const warn = !b.connected && (d.workers || type === 'house') ? 'Pas encore relié à l\'hôtel de ville par une route.' : '';
  return { ok: true, building: b, warn };
}

export function placeRoad(g, x, y) {
  if (!inMap(x, y)) return { ok: false, reason: 'Hors de la carte' };
  const i = idx(x, y);
  if (g.roads[i]) return { ok: false, silent: true };
  if (!TERRAIN[g.tiles[i]].build) return { ok: false, reason: `Impossible sur : ${TERRAIN[g.tiles[i]].name.toLowerCase()}` };
  if (g.occ[i]) return { ok: false, reason: 'Emplacement occupé' };
  if (!canAfford(g, ROAD_COST)) return { ok: false, reason: 'Pas assez de bois' };
  pay(g, ROAD_COST);
  g.roads[i] = 1;
  return { ok: true };
}

// Trace une route le long d'un chemin (liste de cases) puis recalcule une seule fois.
export function placeRoadPath(g, path) {
  let built = 0, firstError = null;
  for (const [x, y] of path) {
    const r = placeRoad(g, x, y);
    if (r.ok) built++;
    else if (!r.silent && !firstError) firstError = r.reason;
  }
  if (built) {
    rebuild(g);
    checkQuests(g);
  }
  return { built, error: built ? null : firstError };
}

export function roadPathCost(g, path) {
  return path.filter(([x, y]) => inMap(x, y) && !g.roads[idx(x, y)]).length * ROAD_COST.wood;
}

export function clearTile(g, x, y) {
  const t = tileAt(g, x, y);
  const c = CLEAR[t];
  if (!c) return { ok: false, silent: true };
  if (!canAfford(g, c.cost)) return { ok: false, reason: `Il faut ${costText(c.cost)}` };
  pay(g, c.cost);
  gain(g, c.gain);
  g.tiles[idx(x, y)] = T.GRASS;
  g.cleared.push(idx(x, y));
  g.terrainVersion++;
  return { ok: true, gain: c.gain };
}

export function demolishBuilding(g, b) {
  if (b.type === 'townhall') return { ok: false, reason: 'L\'hôtel de ville ne peut pas être démoli' };
  if (b.type === 'wonder' && !b.build) return { ok: false, reason: 'On ne démolit pas une merveille !' };
  const refund = {};
  for (const [k, v] of Object.entries(def(b).cost || {})) refund[k] = Math.floor(v / 2);
  gain(g, refund);
  g.buildings = g.buildings.filter((o) => o !== b);
  return { ok: true, name: def(b).name };
}

// Démolit / défriche tout ce qui se trouve dans un rectangle de cases.
export function applyArea(g, tool, x0, y0, x1, y1) {
  const done = new Set();
  let count = 0, error = null;
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (!inMap(x, y)) continue;
      if (tool === 'clear') {
        const r = clearTile(g, x, y);
        if (r.ok) count++; else if (!r.silent && !error) error = r.reason;
        continue;
      }
      const b = buildingAt(g, x, y);
      if (b && !done.has(b)) {
        done.add(b);
        const r = demolishBuilding(g, b);
        if (r.ok) count++; else if (!error) error = r.reason;
        rebuild(g);
      } else if (!b && g.roads[idx(x, y)]) {
        g.roads[idx(x, y)] = 0;
        count++;
      }
    }
  }
  rebuild(g);
  return { count, error };
}

export function togglePause(g, b) { b.paused = !b.paused; rebuild(g); }
export function toggleLock(g, b) { b.lock = !b.lock; }

export function bucketBrigade(g, b) {
  if (!(b.fire > 0)) return { ok: false, reason: 'Ce bâtiment ne brûle pas' };
  if (!b.cover.well) return { ok: false, reason: 'Aucun puits à proximité pour former une chaîne de seaux' };
  if (g.gold < FIRE.bucketCost) return { ok: false, reason: 'Pas assez d\'or' };
  g.gold -= FIRE.bucketCost;
  b.fire = 0;
  rebuild(g);
  notify(g, `Incendie maîtrisé : ${def(b).name}.`, 'good', 'good');
  return { ok: true };
}

// ---------- Recherche ----------

// Additionne les effets de toutes les technologies découvertes.
export function computeMods(g) {
  const m = { prod: {}, range: {}, fireHouse: 1, storage: 0, upkeep: 1, tax: 1, sat: 0, research: 1, wonderTime: 1 };
  for (const id of g.tech) {
    const e = TECHS.find((t) => t.id === id)?.effect || {};
    for (const [k, v] of Object.entries(e.prod || {})) m.prod[k] = (m.prod[k] || 1) * v;
    for (const [k, v] of Object.entries(e.range || {})) m.range[k] = (m.range[k] || 0) + v;
    for (const k of ['fireHouse', 'upkeep', 'tax', 'research', 'wonderTime']) if (e[k]) m[k] *= e[k];
    if (e.storage) m.storage += e.storage;
    if (e.sat) m.sat += e.sat;
  }
  g.mods = m;
}

export const serviceRange = (g, d) => d.service.r + (g.mods.range[d.service.type] || 0);

export function techStatus(g, t) {
  if (g.tech.includes(t.id)) return { done: true };
  if (t.era > g.era) return { ok: false, reason: `Ère requise : ${ERAS[t.era].name}` };
  const missing = (t.req || []).filter((r) => !g.tech.includes(r));
  if (missing.length) return { ok: false, reason: `Nécessite : ${missing.map((r) => TECHS.find((x) => x.id === r).name).join(', ')}` };
  if (g.rp < t.cost) return { ok: false, reason: `Il faut ${t.cost} points de recherche`, affordable: false };
  return { ok: true };
}

export function research(g, id) {
  const t = TECHS.find((x) => x.id === id);
  const s = techStatus(g, t);
  if (!s.ok) return s;
  g.rp -= t.cost;
  g.tech.push(id);
  computeMods(g);
  rebuild(g);
  notify(g, `Découverte : ${t.name}. ${t.desc}`, 'good', 'quest');
  checkQuests(g);
  return { ok: true };
}

// ---------- Ères ----------

export function eraStatus(g) {
  const next = ERAS[g.era + 1];
  if (!next) return null;
  const [c, n] = next.need;
  const reqs = [
    { text: `${n} ${CLASSES[c].name.toLowerCase()}`, ok: g.cls[c] >= n, cur: Math.floor(g.cls[c]), max: n },
    { text: `Payer ${costText(next.cost)}`, ok: canAfford(g, next.cost) },
  ];
  return { next, reqs, ok: reqs.every((r) => r.ok) };
}

export function advanceEra(g) {
  const s = eraStatus(g);
  if (!s || !s.ok) return false;
  pay(g, s.next.cost);
  g.era++;
  rebuild(g);
  g.pending.push({ type: 'era', era: g.era });
  log(g, `Nouvelle ère : ${ERAS[g.era].name}.`, 'good');
  checkQuests(g);
  return true;
}

// ---------- Commerce ----------

const hasTrading = (g) => g.buildings.some((b) => b.type === 'trading' && isWorking(b));
export const buyPrice = (g, k) => GOODS[k].price * g.prices[k] * (hasTrading(g) ? 1 : 1.5);
export const sellPrice = (g, k) => GOODS[k].price * g.prices[k] * (hasTrading(g) ? 0.8 : 0.5);
export const tradeHasPost = hasTrading;

export function buy(g, k, n) {
  const cost = Math.ceil(buyPrice(g, k) * n);
  if (g.gold < cost) return { ok: false, reason: 'Pas assez d\'or' };
  if (g.goods[k] + n > storage(g)) return { ok: false, reason: 'Stockage plein' };
  g.gold -= cost;
  g.goods[k] += n;
  g.prices[k] = Math.min(1.8, g.prices[k] * 1.03);
  return { ok: true };
}

export function sell(g, k, n) {
  if (g.goods[k] < n) return { ok: false, reason: 'Pas assez à vendre' };
  g.goods[k] -= n;
  g.gold += Math.floor(sellPrice(g, k) * n);
  g.prices[k] = Math.max(0.5, g.prices[k] * 0.97);
  return { ok: true };
}

// ---------- Objectifs ----------

function questHelpers(g) {
  return {
    count: (type) => g.buildings.filter((b) => b.type === type).length,
    done: (type) => g.buildings.filter((b) => b.type === type && !b.build).length,
    cls: (c) => Math.floor(g.cls[c]),
  };
}

export function questProgress(g) {
  const q = QUESTS[g.quest];
  if (!q) return null;
  const [cur, max] = q.check(g, questHelpers(g));
  return { q, cur: Math.min(cur, max), max };
}

export function checkQuests(g) {
  for (;;) {
    const p = questProgress(g);
    if (!p || p.cur < p.max) return;
    gain(g, p.q.reward);
    g.quest++;
    notify(g, `Objectif atteint : ${p.q.text}. Récompense : ${costText(p.q.reward)}.`, 'good', 'quest');
  }
}

// ---------- Incendies ----------

function fireRisk(g, b) {
  const d = def(b);
  if (isHouse(b)) return [1, 0.8, 0.6, 0.5][b.level - 1] * g.mods.fireHouse;
  return d.fire ?? 1;
}

function ignite(g, b, spread) {
  b.fire = 1;
  g.stats.fires++;
  notify(g, spread ? `Le feu se propage : ${def(b).name}.` : `Incendie : ${def(b).name} !`, 'danger', 'alarm', b);
}

function updateFires(g) {
  if (g.day < FIRE.startDay) return;
  const burning = g.buildings.filter((b) => b.fire > 0);
  // Propagation et extinction
  for (const b of burning) {
    b.fire++;
    if (b.cover?.fire && b.fire > FIRE.stationDays) {
      b.fire = 0;
      notify(g, `Les pompiers ont éteint l'incendie : ${def(b).name}.`, 'good', 'good');
      continue;
    }
    for (const o of g.buildings) {
      if (o.fire > 0 || o === b || fireRisk(g, o) <= 0 || o.cover?.fire || o.build) continue;
      if (footprintDist(o, b) <= 1 && Math.random() < FIRE.spreadChance) ignite(g, o, true);
    }
    if (b.fire > FIRE.burnDays) {
      g.buildings = g.buildings.filter((o) => o !== b);
      const s = def(b).size;
      for (let dy = 0; dy < s; dy++) {
        for (let dx = 0; dx < s; dx++) g.buildings.push({ id: g.nextId++, type: 'ruins', x: b.x + dx, y: b.y + dy, level: 1 });
      }
      notify(g, `Détruit par le feu : ${def(b).name}.`, 'danger', 'bad');
    }
  }
  // Nouveaux départs de feu
  for (const b of g.buildings) {
    if (b.fire > 0 || b.build || !b.cover || b.cover.fire) continue;
    const risk = fireRisk(g, b);
    if (risk <= 0) continue;
    if (Math.random() < FIRE.baseRisk * risk * (b.cover.well ? FIRE.wellFactor : 1)) ignite(g, b, false);
  }
}

// ---------- Événements ----------

const EVENTS = [
  {
    w: 2,
    can: (g) => g.era >= 1 && g.gold >= 100,
    run(g) {
      const th = g.buildings.find((b) => b.type === 'townhall');
      if (th.cover.guard) {
        g.gold += 30;
        notify(g, 'Des bandits ont été repoussés par la garde (+30 or).', 'good', 'good');
      } else {
        const lost = Math.floor(g.gold * 0.2);
        g.gold -= lost;
        notify(g, `Des bandits ont pillé le trésor : −${lost} or. Une tour de guet près de l'hôtel de ville les arrêterait.`, 'danger', 'bad');
      }
    },
  },
  {
    w: 2,
    can: (g) => [1, 2].includes(season(g)) && g.buildings.some((b) => b.type === 'farm'),
    run(g) { gain(g, { wheat: 30 }); notify(g, 'Récolte exceptionnelle : +30 blé.', 'good', 'good'); },
  },
  {
    w: 2,
    can: (g) => g.buildings.some((b) => isHouse(b) && b.level === 1 && b.res < capOf(b) - 1 && b.connected),
    run(g) {
      let n = 0;
      for (const b of g.buildings) {
        if (n >= 8 || !isHouse(b) || b.level !== 1 || !b.connected) continue;
        const add = Math.min(2, capOf(b) - b.res);
        b.res += add;
        n += add;
      }
      notify(g, `${Math.round(n)} migrants s'installent dans le hameau.`, 'good', 'good');
    },
  },
  {
    w: 3,
    can: (g) => GOOD_KEYS.some((k) => g.goods[k] >= 40),
    run(g) {
      const giveable = GOOD_KEYS.filter((k) => g.goods[k] >= 40);
      const give = giveable[Math.floor(Math.random() * giveable.length)];
      const known = GOOD_KEYS.filter((k) => k !== give && (g.goods[k] > 0 || ['wood', 'planks', 'stone', 'fish'].includes(k)));
      const get = known[Math.floor(Math.random() * known.length)];
      const n = 20 + Math.floor(Math.random() * 3) * 10;
      const m = Math.max(1, Math.round((n * GOODS[give].price * 1.4) / GOODS[get].price));
      g.pending.push({ type: 'caravan', give: { k: give, n }, get: { k: get, n: m } });
      log(g, 'Une caravane marchande propose un échange.');
      g.notes.push({ text: 'Une caravane marchande est arrivée.', kind: '', sound: 'quest' });
    },
  },
  {
    // Épidémie : le médecin protège, le puits limite les dégâts.
    w: 1.5,
    can: (g) => g.era >= 1 && population(g) >= 100,
    run(g) {
      let lost = 0;
      for (const b of g.buildings) {
        if (!isHouse(b) || b.cover.health) continue;
        const l = Math.floor(b.res * (b.cover.well ? 0.2 : 0.45));
        b.res -= l;
        lost += l;
      }
      notify(g, lost ? `Épidémie : ${lost} habitants sont morts ou ont fui. Un médecin protégerait les quartiers.` : 'Une épidémie a été enrayée par les médecins.', lost ? 'danger' : 'good', lost ? 'bad' : 'good');
    },
  },
  {
    // Vols : les maisons aisées sans poste de garde sont la cible des voleurs.
    w: 2,
    can: (g) => g.buildings.filter((b) => isHouse(b) && b.level >= 2 && !b.cover.police).length >= 6,
    run(g) {
      const n = g.buildings.filter((b) => isHouse(b) && b.level >= 2 && !b.cover.police).length;
      const lost = Math.min(Math.floor(g.gold * 0.3), n * 12);
      g.gold -= lost;
      notify(g, `Vague de cambriolages dans ${n} maisons sans poste de garde : −${lost} or.`, 'danger', 'bad');
    },
  },
  {
    w: 1,
    can: (g) => g.buildings.some((b) => b.type === 'fisher'),
    run(g) { gain(g, { fish: 25 }); notify(g, 'Banc de poissons exceptionnel : +25 poisson.', 'good', 'good'); },
  },
];

function rollEvent(g) {
  if (g.day < 40) return;
  if (Math.random() > (hasTrading(g) ? 0.035 : 0.025)) return;
  const list = EVENTS.filter((e) => e.can(g));
  let r = Math.random() * list.reduce((n, e) => n + e.w, 0);
  for (const e of list) {
    r -= e.w;
    if (r <= 0) { e.run(g); return; }
  }
}

export function acceptOffer(g, offer) {
  if (g.goods[offer.give.k] < offer.give.n) return { ok: false, reason: 'Vous n\'avez plus assez de marchandises' };
  g.goods[offer.give.k] -= offer.give.n;
  gain(g, { [offer.get.k]: offer.get.n });
  log(g, `Échange conclu : ${offer.give.n} ${resName(offer.give.k)} contre ${offer.get.n} ${resName(offer.get.k)}.`, 'good');
  return { ok: true };
}

// ---------- Simulation d'une journée ----------

export function step(g) {
  const prevSeason = season(g);
  g.day++;
  const s = season(g);
  if (s !== prevSeason) notify(g, `Début de ${s === 0 ? 'printemps' : s === 1 ? 'l\'été' : s === 2 ? 'l\'automne' : 'l\'hiver'}.`, '', 'season');

  countClasses(g);
  assignWorkers(g);
  computeCoverage(g);

  const prod = {}, use = {};
  const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
  const cap = storage(g);

  // Production
  for (const b of g.buildings) {
    const d = def(b);
    b.output = null;
    b.starved = false;
    b.eff = 0;
    if (!d.produces || !isWorking(b)) continue;
    let eff = b.assigned / d.workers[1];
    if (d.seasonal) eff *= d.seasonal[s];
    if (d.fertile) {
      let n = 0;
      for (let dy = 0; dy < d.size; dy++) for (let dx = 0; dx < d.size; dx++) if (g.tiles[idx(b.x + dx, b.y + dy)] === T.FERTILE) n++;
      eff *= 1 + (d.fertile - 1) * (n / (d.size * d.size));
    }
    if (g.broke) eff *= 0.5;
    eff *= g.mods.prod[b.type] || 1;
    // Pas la peine de produire si l'entrepôt est plein
    const outs = Object.keys(d.produces);
    b.full = outs.every((k) => g.goods[k] !== undefined && g.goods[k] >= cap - 0.01);
    if (b.full || eff <= 0) continue;
    if (d.consumes) {
      let ratio = 1;
      for (const [k, v] of Object.entries(d.consumes)) ratio = Math.min(ratio, g.goods[k] / (v * eff));
      ratio = Math.max(0, Math.min(1, ratio));
      for (const [k, v] of Object.entries(d.consumes)) { g.goods[k] -= v * eff * ratio; add(use, k, v * eff * ratio); }
      b.starved = ratio < 0.99;
      eff *= ratio;
    }
    b.eff = eff;
    if (eff <= 0) continue;
    b.output = {};
    for (const [k, v] of Object.entries(d.produces)) {
      if (k === 'gold') { g.gold += v * eff; g.fin.other = (g.fin.other || 0) + v * eff; }
      else if (k === 'research') g.rp += v * eff * g.mods.research;
      else g.goods[k] = Math.min(cap, g.goods[k] + v * eff);
      add(prod, k, v * eff);
      b.output[k] = v * eff;
    }
  }

  // Consommation des habitants : on calcule la demande totale par marchandise,
  // puis chaque classe reçoit la même part de ce qui est disponible.
  const demand = {};
  CLASSES.forEach((C, c) => {
    for (const n of C.needs) if (n.good) add(demand, n.good, g.cls[c] * n.rate);
  });
  const ratio = {};
  for (const [k, v] of Object.entries(demand)) {
    ratio[k] = v > 0 ? Math.min(1, g.goods[k] / v) : 1;
    g.goods[k] -= v * ratio[k];
    add(use, k, v * ratio[k]);
  }
  g.supply = CLASSES.map((C) => {
    const o = {};
    for (const n of C.needs) if (n.good) o[n.good] = ratio[n.good] ?? 1;
    return o;
  });
  // Les paysans mangent du poisson, ou du pain s'il en reste.
  const F = g.cls[0] * CLASSES[0].needs[0].rate;
  if (F > 0) {
    const fish = Math.min(g.goods.fish, F);
    const bread = Math.min(g.goods.bread, F - fish);
    g.goods.fish -= fish;
    g.goods.bread -= bread;
    add(use, 'fish', fish);
    add(use, 'bread', bread);
    g.supply[0].food = (fish + bread) / F;
    add(demand, 'fish', F);
  } else {
    g.supply[0].food = g.goods.fish + g.goods.bread > 0 ? 1 : 0;
  }
  g.flow = { prod, use, demand };

  // Pénuries
  for (const [k, v] of Object.entries(demand)) {
    const r = k === 'fish' ? g.supply[0].food : ratio[k];
    if (v > 0.2 && r < 0.6 && g.day - (g.alerts[k] ?? -999) > 25) {
      g.alerts[k] = g.day;
      notify(g, k === 'fish' ? 'Pénurie de nourriture : les paysans manquent de poisson.' : `Pénurie de ${GOODS[k].name.toLowerCase()} : vos habitants en manquent.`, 'warn', 'bad');
    }
  }

  // Habitations : satisfaction, croissance, impôts, évolution
  let taxes = 0, satSum = 0, resSum = 0;
  for (const b of g.buildings) {
    if (!isHouse(b)) continue;
    const C = CLASSES[b.level - 1];
    const sat = b.connected ? houseSat(g, b) : 0;
    b.sat = sat;
    const capH = C.cap;
    if (!b.connected) b.res = Math.max(0, (b.res || 0) - 0.2);
    else if (sat >= 0.5) b.res = Math.min(capH, (b.res || 0) + 0.12 + 0.18 * sat);
    else if (sat < 0.35) b.res = Math.max(0, b.res - 0.15);
    taxes += b.res * C.tax * TAXES[g.tax].mult * g.mods.tax * (0.5 + 0.5 * sat);
    satSum += sat * b.res;
    resSum += b.res;
    if (!b.lock && (g.day + b.id) % 5 === 0 && upgradeStatus(g, b).ok) upgradeHouse(g, b);
  }
  g.happiness = resSum ? (satSum / resSum) * 100 : 60;

  // Finances
  const upkeep = g.buildings.reduce((n, b) => n + upkeepOf(b), 0) * g.mods.upkeep;
  g.gold += taxes - upkeep;
  g.fin = { taxes, upkeep, other: g.fin.other || 0 };
  g.lastFin = { ...g.fin };
  g.fin.other = 0;
  g.broke = g.gold < 0;
  if (g.broke) g.gold = 0;

  // Chantiers
  for (const b of g.buildings) {
    if (!b.build) continue;
    b.build--;
    if (b.build === 0) {
      notify(g, `Chantier terminé : ${def(b).name}.`, 'good', 'quest', b);
      if (b.type === 'wonder') {
        g.won = true;
        g.pending.push({ type: 'victory' });
      }
    }
  }

  updateFires(g);

  // Prix du marché qui bougent un peu
  for (const k of GOOD_KEYS) {
    g.prices[k] = Math.max(0.5, Math.min(1.8, g.prices[k] * (1 + (Math.random() - 0.5) * 0.03)));
    g.prices[k] += (1 - g.prices[k]) * 0.02;
  }

  rollEvent(g);
  rebuild(g);
  checkQuests(g);

  const pop = population(g);
  g.stats.maxPop = Math.max(g.stats.maxPop, pop);
  if (g.day % 5 === 0) {
    g.history.push({ d: g.day, pop: Math.floor(pop), gold: Math.floor(g.gold), happy: Math.round(g.happiness), cls: g.cls.map(Math.floor) });
    if (g.history.length > 300) g.history.shift();
  }
}

// ---------- Sauvegarde ----------

export function serialize(g) {
  return JSON.stringify({
    v: 3, seed: g.seed, cleared: g.cleared, roads: [...g.roads.keys()].filter((i) => g.roads[i]),
    buildings: g.buildings.map(({ id, type, x, y, level, res, lock, paused, fire, build }) => ({ id, type, x, y, level, res, lock, paused, fire, build })),
    goods: g.goods, gold: g.gold, day: g.day, era: g.era, tax: g.tax, quest: g.quest,
    log: g.log.slice(0, 50), history: g.history, prices: g.prices, nextId: g.nextId, won: g.won, stats: g.stats, alerts: g.alerts,
    tech: g.tech, rp: g.rp,
  });
}

export function deserialize(text) {
  const d = JSON.parse(text);
  if (!d || d.v !== 3) return null;
  const g = { ...d, tiles: generateMap(d.seed), roads: new Uint8Array(MAP * MAP) };
  for (const i of d.cleared) g.tiles[i] = T.GRASS;
  for (const i of d.roads) g.roads[i] = 1;
  for (const k of GOOD_KEYS) g.goods[k] ??= 0;
  g.alerts ??= {};
  g.tech ??= [];
  g.rp ??= 0;
  init(g);
  return g;
}

export function save(g) {
  try { localStorage.setItem(SAVE_KEY, serialize(g)); } catch { /* stockage indisponible */ }
}

export function load() {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return text ? deserialize(text) : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* rien */ }
}
