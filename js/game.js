// Moteur du jeu : état, construction, routes, simulation jour par jour, événements, sauvegarde.
import {
  MAP, T, TERRAIN, CLEAR, RES, RES_KEYS, START, BASE_STORAGE, WORKFORCE, FOOD_PER_PERSON,
  WINTER_WOOD_PER_PERSON, ROAD_COST, TAXES, LEVEL_OUTPUT, MAX_LEVEL, ERAS, HOUSE_LEVELS,
  DECOR_NEEDED, BUILDINGS, WORK_PRIORITY, QUESTS, DAYS_PER_SEASON, SEASONS, UPKEEP,
} from './config.js';
import { generateMap } from './world.js';

const SAVE_KEY = 'developgames-save-v2';
const SERVICE_TYPES = ['well', 'chapel', 'market', 'tavern', 'school', 'fire', 'guard'];

export const def = (b) => BUILDINGS[b.type];
const idx = (x, y) => y * MAP + x;
export const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP;

// ---------- Création ----------

export function createGame(seed = Math.floor(Math.random() * 1e9)) {
  const g = {
    seed,
    tiles: generateMap(seed),
    cleared: [],
    roads: new Uint8Array(MAP * MAP),
    buildings: [],
    res: { ...START.res },
    pop: START.pop,
    day: 0,
    era: 0,
    tax: 1,
    happiness: 60,
    quest: 0,
    log: [],
    history: [],
    prices: Object.fromEntries(RES_KEYS.filter((k) => k !== 'gold').map((k) => [k, 1])),
    nextId: 1,
    won: false,
    stats: { built: 0, fires: 0, maxPop: START.pop },
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
  log(g, `Fondation du hameau. Bienvenue, bâtisseur !`, 'good');
  return g;
}

function init(g) {
  g.notes = [];      // messages à afficher (vidés par l'interface)
  g.pending = [];    // fenêtres à ouvrir (caravane, victoire…)
  g.terrainVersion = (g.terrainVersion || 0) + 1;
  g.lastGain = Object.fromEntries(RES_KEYS.map((k) => [k, 0]));
  rebuild(g);
}

// ---------- Outils de calcul ----------

export const season = (g) => Math.floor(g.day / DAYS_PER_SEASON) % 4;
export const year = (g) => Math.floor(g.day / (DAYS_PER_SEASON * 4)) + 1;
export const dayOfSeason = (g) => (g.day % DAYS_PER_SEASON) + 1;
export const dateText = (g) => `${SEASONS[season(g)].icon} ${SEASONS[season(g)].name}, an ${year(g)}`;

export function tileAt(g, x, y) { return inMap(x, y) ? g.tiles[idx(x, y)] : null; }
export function roadAt(g, x, y) { return inMap(x, y) && g.roads[idx(x, y)] === 1; }
export function buildingAt(g, x, y) {
  if (!inMap(x, y)) return null;
  const id = g.occ[idx(x, y)];
  return id ? g.byId.get(id) : null;
}

export const housing = (g) => g.buildings.reduce((n, b) => n + capOf(b), 0);
export function capOf(b) {
  if (b.type === 'house') return HOUSE_LEVELS[b.level].cap;
  return def(b).housing || 0;
}
export const storage = (g) =>
  g.buildings.reduce((n, b) => n + (def(b).storage || 0), BASE_STORAGE + g.era * 150);

export const upkeepOf = (g) => g.buildings.reduce((n, b) => n + (UPKEEP[b.type] || 0), 0);

export function workersNeeded(b) {
  const d = def(b);
  return d.workers ? d.workers + (b.level - 1) : 0;
}

export function isWorking(b) {
  const d = def(b);
  if (b.fire > 0 || b.paused) return false;
  if (d.workers) return b.connected && b.assigned > 0;
  return true;
}

export function canAfford(g, cost = {}) {
  return Object.entries(cost).every(([k, v]) => g.res[k] >= v);
}
function pay(g, cost = {}) { for (const [k, v] of Object.entries(cost)) g.res[k] -= v; }
function gain(g, res = {}) {
  const cap = storage(g);
  for (const [k, v] of Object.entries(res)) {
    g.res[k] += v;
    if (k !== 'gold') g.res[k] = Math.min(g.res[k], Math.max(cap, g.res[k] - v));
  }
}
export const costText = (cost = {}) =>
  Object.entries(cost).map(([k, v]) => `${Math.ceil(v)} ${RES[k].icon}`).join('  ');

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
  if (g.log.length > 80) g.log.length = 80;
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
  computeConnectivity(g);
  assignWorkers(g);
  computeCoverage(g);
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

function assignWorkers(g) {
  let avail = Math.floor(g.pop * WORKFORCE);
  g.workforce = avail;
  const list = g.buildings
    .filter((b) => workersNeeded(b) > 0)
    .sort((a, b) => (WORK_PRIORITY[def(a).cat] - WORK_PRIORITY[def(b).cat]) || a.id - b.id);
  for (const b of list) {
    if (b.paused || b.fire > 0 || !b.connected) { b.assigned = 0; continue; }
    b.assigned = Math.min(workersNeeded(b), avail);
    avail -= b.assigned;
  }
  g.idle = avail;
}

function computeCoverage(g) {
  const services = g.buildings.filter((b) => def(b).service && isWorking(b));
  const decors = g.buildings.filter((b) => def(b).decor);
  for (const b of g.buildings) {
    b.cover = {};
    for (const s of services) {
      if (footprintDist(b, s) <= def(s).service.r) b.cover[def(s).service.type] = true;
    }
    if (b.type === 'house') {
      b.decor = decors.reduce((n, d) => n + (footprintDist(b, d) <= def(d).decor.r ? def(d).decor.v : 0), 0);
    }
  }
}

// ---------- Besoins des habitations ----------

function needMet(g, b, need) {
  switch (need) {
    case 'road': return b.connected;
    case 'food': return g.res.food > 0;
    case 'decor': return (b.decor || 0) >= DECOR_NEEDED;
    case 'tools': return g.res.tools > 0;
    default: return !!b.cover[need];
  }
}

export function houseNeeds(g, b, level = b.level + 1) {
  const L = HOUSE_LEVELS[level];
  if (!L) return null;
  return {
    level,
    eraOk: (L.era || 0) <= g.era,
    list: L.needs.map((n) => ({ need: n, ok: needMet(g, b, n) })),
  };
}

function houseTarget(g, b) {
  for (let L = HOUSE_LEVELS.length - 1; L >= 2; L--) {
    const n = houseNeeds(g, b, L);
    if (n.eraOk && n.list.every((x) => x.ok)) return L;
  }
  return 1;
}

// ---------- Construction ----------

export function eraLocked(g, type) {
  return (BUILDINGS[type].era || 0) > g.era;
}

export function canPlace(g, type, x, y) {
  const d = BUILDINGS[type];
  if (eraLocked(g, type)) return { ok: false, reason: `Débloqué à l'ère : ${ERAS[d.era].name}` };
  if (d.unique && g.buildings.some((b) => b.type === type)) return { ok: false, reason: 'Déjà construit' };
  for (let dy = 0; dy < d.size; dy++) {
    for (let dx = 0; dx < d.size; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inMap(tx, ty)) return { ok: false, reason: 'Hors de la carte' };
      const t = g.tiles[idx(tx, ty)];
      if (!TERRAIN[t].build) return { ok: false, reason: `Impossible sur : ${TERRAIN[t].name}` };
      if (g.occ[idx(tx, ty)]) return { ok: false, reason: 'Emplacement occupé' };
      if (g.roads[idx(tx, ty)]) return { ok: false, reason: 'Une route passe ici' };
    }
  }
  if (d.near != null && !touches(g, x, y, d.size, d.near)) {
    return { ok: false, reason: `Doit toucher : ${TERRAIN[d.near].name}` };
  }
  if (!canAfford(g, d.cost)) return { ok: false, reason: 'Ressources insuffisantes' };
  return { ok: true };
}

export function place(g, type, x, y) {
  const check = canPlace(g, type, x, y);
  if (!check.ok) return check;
  const d = BUILDINGS[type];
  pay(g, d.cost);
  const b = { id: g.nextId++, type, x, y, level: 1 };
  g.buildings.push(b);
  g.stats.built++;
  rebuild(g);
  if (type === 'wonder') {
    g.won = true;
    g.pending.push({ type: 'victory' });
    log(g, 'La Grande Cathédrale est achevée !', 'good');
  }
  checkQuests(g);
  const warn = !b.connected && d.workers ? 'Pensez à la relier par une route.' : '';
  return { ok: true, building: b, warn };
}

export function placeRoad(g, x, y) {
  if (!inMap(x, y)) return { ok: false, reason: 'Hors de la carte' };
  const i = idx(x, y);
  if (g.roads[i]) return { ok: false, silent: true };
  if (!TERRAIN[g.tiles[i]].build) return { ok: false, reason: `Impossible sur : ${TERRAIN[g.tiles[i]].name}` };
  if (g.occ[i]) return { ok: false, reason: 'Emplacement occupé' };
  if (!canAfford(g, ROAD_COST)) return { ok: false, reason: 'Pas assez de bois' };
  pay(g, ROAD_COST);
  g.roads[i] = 1;
  rebuild(g);
  checkQuests(g);
  return { ok: true };
}

export function clearTile(g, x, y) {
  const t = tileAt(g, x, y);
  const c = CLEAR[t];
  if (!c) return { ok: false, reason: 'Rien à défricher ici' };
  if (!canAfford(g, c.cost)) return { ok: false, reason: `Il faut ${costText(c.cost)}` };
  pay(g, c.cost);
  gain(g, c.gain);
  g.tiles[idx(x, y)] = T.GRASS;
  g.cleared.push(idx(x, y));
  g.terrainVersion++;
  rebuild(g);
  return { ok: true, gain: c.gain };
}

export function demolish(g, x, y) {
  const b = buildingAt(g, x, y);
  if (!b) {
    if (roadAt(g, x, y)) {
      g.roads[idx(x, y)] = 0;
      rebuild(g);
      return { ok: true, road: true };
    }
    return { ok: false, reason: 'Rien à démolir ici', silent: true };
  }
  if (b.type === 'townhall') return { ok: false, reason: 'L\'hôtel de ville ne peut pas être démoli' };
  if (b.type === 'wonder') return { ok: false, reason: 'On ne démolit pas une merveille !' };
  const refund = {};
  for (const [k, v] of Object.entries(def(b).cost || {})) refund[k] = Math.floor((v * b.level) / 2);
  gain(g, refund);
  g.buildings = g.buildings.filter((o) => o !== b);
  rebuild(g);
  return { ok: true, name: def(b).name };
}

export function upgradeCost(b) {
  const cost = {};
  for (const [k, v] of Object.entries(def(b).cost || {})) cost[k] = v * b.level;
  cost.tools = 5 * b.level;
  return cost;
}
export function canUpgrade(g, b) {
  const d = def(b);
  if (!d.produces || !d.workers || b.type === 'townhall') return { ok: false, hidden: true };
  if (b.level >= MAX_LEVEL) return { ok: false, reason: 'Niveau maximum' };
  if (g.era < 1) return { ok: false, reason: 'Améliorations à partir de l\'ère du Village' };
  if (!canAfford(g, upgradeCost(b))) return { ok: false, reason: 'Ressources insuffisantes' };
  return { ok: true };
}
export function upgrade(g, b) {
  const c = canUpgrade(g, b);
  if (!c.ok) return c;
  pay(g, upgradeCost(b));
  b.level++;
  rebuild(g);
  return { ok: true };
}

export function togglePause(g, b) {
  b.paused = !b.paused;
  rebuild(g);
}

export function extinguish(g, b) {
  if (!(b.fire > 0)) return false;
  b.fire = 0;
  rebuild(g);
  notify(g, `Feu éteint : ${def(b).name}. Bravo !`, 'good', 'good');
  return true;
}

// ---------- Ères ----------

export function eraStatus(g) {
  const next = ERAS[g.era + 1];
  if (!next) return null;
  const [lvl, n] = next.houses;
  const houses = g.buildings.filter((b) => b.type === 'house' && b.level >= lvl).length;
  const reqs = [
    { text: `${next.pop} habitants`, ok: g.pop >= next.pop, cur: Math.floor(g.pop), max: next.pop },
    { text: `${n} habitations de niveau ${lvl} (${HOUSE_LEVELS[lvl].name})`, ok: houses >= n, cur: houses, max: n },
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
  log(g, `Nouvelle ère : ${ERAS[g.era].name} !`, 'good');
  checkQuests(g);
  return true;
}

// ---------- Commerce ----------

// Sans marché, l'hôtel de ville fait un peu de commerce, mais à de mauvais prix.
export const hasMarket = (g) => g.buildings.some((b) => b.type === 'market' && isWorking(b));
const hasTrading = (g) => g.buildings.some((b) => b.type === 'trading' && isWorking(b));
export const buyPrice = (g, k) => RES[k].price * g.prices[k] * (hasMarket(g) ? 1 : 1.5);
export const price = buyPrice;
export const sellRatio = (g) => (hasTrading(g) ? 0.85 : hasMarket(g) ? 0.7 : 0.5);
export const tradeOpen = () => true;

export function buy(g, k, n) {
  const cost = Math.ceil(buyPrice(g, k) * n);
  if (g.res.gold < cost) return { ok: false, reason: 'Pas assez d\'or' };
  if (g.res[k] + n > storage(g)) return { ok: false, reason: 'Stockage plein' };
  g.res.gold -= cost;
  g.res[k] += n;
  g.prices[k] = Math.min(1.6, g.prices[k] * 1.02);
  return { ok: true };
}

export function sell(g, k, n) {
  if (g.res[k] < n) return { ok: false, reason: 'Pas assez à vendre' };
  g.res[k] -= n;
  g.res.gold += Math.floor(RES[k].price * g.prices[k] * n * sellRatio(g));
  g.prices[k] = Math.max(0.5, g.prices[k] * 0.98);
  return { ok: true };
}

// ---------- Objectifs ----------

function questHelpers(g) {
  return {
    count: (type) => g.buildings.filter((b) => b.type === type).length,
    connectedCount: () => g.buildings.filter((b) => b.type !== 'townhall' && b.connected).length,
    housesAtLeast: (L) => g.buildings.filter((b) => b.type === 'house' && b.level >= L).length,
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
    notify(g, `🎯 Objectif réussi : ${p.q.text} (+${costText(p.q.reward)})`, 'good', 'quest');
  }
}

// ---------- Événements ----------

const FIREPROOF = ['garden', 'park', 'statue', 'fountain', 'well', 'townhall', 'wonder'];

const EVENTS = [
  {
    w: 3,
    can: (g) => g.buildings.some((b) => !FIREPROOF.includes(b.type) && !b.cover.fire && !(b.fire > 0)),
    run(g) {
      const list = g.buildings.filter((b) => !FIREPROOF.includes(b.type) && !b.cover.fire && !(b.fire > 0));
      const b = list[Math.floor(Math.random() * list.length)];
      b.fire = 8;
      g.stats.fires++;
      notify(g, `🔥 Incendie : ${def(b).name} ! Touchez-le vite pour l'éteindre.`, 'danger', 'alarm', b);
    },
  },
  {
    w: 2,
    can: (g) => g.res.gold >= 30,
    run(g) {
      const th = g.buildings.find((b) => b.type === 'townhall');
      if (th.cover.guard) {
        g.res.gold += 15;
        notify(g, '🗡️ Des bandits ont été repoussés par la garde (+15 🪙).', 'good', 'good');
      } else {
        const lost = Math.floor(g.res.gold * 0.25);
        g.res.gold -= lost;
        notify(g, `🗡️ Des bandits ont pillé le trésor : −${lost} 🪙. Une tour de garde près de l'hôtel de ville les arrêterait.`, 'danger', 'bad');
      }
    },
  },
  {
    w: 2,
    can: (g) => [1, 2].includes(season(g)) && g.buildings.some((b) => b.type === 'farm'),
    run(g) { gain(g, { food: 40 }); notify(g, '🌾 Récolte exceptionnelle : +40 🍞 !', 'good', 'good'); },
  },
  {
    w: 2,
    can: (g) => housing(g) - g.pop >= 3,
    run(g) {
      const n = Math.min(5, Math.floor(housing(g) - g.pop));
      g.pop += n;
      notify(g, `🧳 ${n} migrants s'installent dans votre cité !`, 'good', 'good');
    },
  },
  {
    w: 3,
    can: (g) => RES_KEYS.some((k) => k !== 'gold' && g.res[k] >= 40),
    run(g) {
      const giveable = RES_KEYS.filter((k) => k !== 'gold' && g.res[k] >= 40);
      const give = giveable[Math.floor(Math.random() * giveable.length)];
      const others = RES_KEYS.filter((k) => k !== give && (k !== 'tools' || g.era >= 1) && (k !== 'iron' || g.era >= 1));
      const get = others[Math.floor(Math.random() * others.length)];
      const n = 20 + Math.floor(Math.random() * 3) * 10;
      const value = n * RES[give].price * 1.4;
      const m = Math.max(1, Math.round(value / (RES[get]?.price || 1)));
      g.pending.push({ type: 'caravan', give: { k: give, n }, get: { k: get, n: m } });
      log(g, '🐪 Une caravane marchande propose un échange.', '');
      g.notes.push({ text: '🐪 Une caravane marchande est arrivée !', kind: '', sound: 'quest' });
    },
  },
  {
    w: 1,
    can: (g) => g.buildings.some((b) => b.type === 'mine'),
    run(g) { gain(g, { iron: 40 }); notify(g, '💎 Un filon a été découvert : +40 🔩 !', 'good', 'good'); },
  },
  {
    w: 1,
    can: (g) => g.era >= 1 && g.pop >= 30,
    run(g) {
      const houses = g.buildings.filter((b) => b.type === 'house');
      const covered = houses.filter((b) => b.cover.well).length / Math.max(1, houses.length);
      if (covered >= 0.8) {
        notify(g, '🦠 Une épidémie a été évitée grâce à l\'eau potable.', 'good', 'good');
      } else {
        const lost = Math.floor(g.pop * 0.15);
        g.pop -= lost;
        notify(g, `🦠 Épidémie : ${lost} habitants sont partis. Plus de puits limiterait les dégâts.`, 'danger', 'bad');
      }
    },
  },
  {
    w: 1,
    can: () => true,
    run(g) { g.happiness = Math.min(100, g.happiness + 10); notify(g, '🎉 Fête au village : le bonheur grimpe !', 'good', 'good'); },
  },
  {
    w: 1,
    can: (g) => season(g) === 3 && !g.harshWinter,
    run(g) { g.harshWinter = true; notify(g, '🥶 Hiver rigoureux : le chauffage consomme deux fois plus de bois.', 'danger', 'bad'); },
  },
];

function rollEvent(g) {
  if (g.day < 25) return;
  const trading = g.buildings.some((b) => b.type === 'trading' && isWorking(b));
  if (Math.random() > (trading ? 0.07 : 0.05)) return;
  const list = EVENTS.filter((e) => e.can(g));
  let r = Math.random() * list.reduce((n, e) => n + e.w, 0);
  for (const e of list) {
    r -= e.w;
    if (r <= 0) { e.run(g); return; }
  }
}

export function acceptOffer(g, offer) {
  if (g.res[offer.give.k] < offer.give.n) return { ok: false, reason: 'Vous n\'avez plus assez de ressources' };
  g.res[offer.give.k] -= offer.give.n;
  if (offer.get.k === 'gold') g.res.gold += offer.get.n;
  else gain(g, { [offer.get.k]: offer.get.n });
  log(g, `🐪 Échange conclu : ${offer.give.n} ${RES[offer.give.k].icon} contre ${offer.get.n} ${RES[offer.get.k].icon}.`, 'good');
  return { ok: true };
}

// ---------- Simulation d'une journée ----------

export function step(g) {
  const prevSeason = season(g);
  g.day++;
  const s = season(g);
  if (s !== prevSeason && s === 0) g.harshWinter = false;
  if (s !== prevSeason) notify(g, `${SEASONS[s].icon} C'est ${s === 0 ? 'le ' : 'l\''}${SEASONS[s].name.toLowerCase()}.`, '', 'season');

  assignWorkers(g);
  computeCoverage(g);

  const before = { ...g.res };
  const happyF = 0.6 + (g.happiness / 100) * 0.7;

  // Production
  for (const b of g.buildings) {
    const d = def(b);
    b.output = null;
    b.starved = false;
    if (!d.produces || !isWorking(b)) continue;
    let eff = (b.assigned / workersNeeded(b)) * happyF * LEVEL_OUTPUT[b.level];
    if (d.seasonal) eff *= d.seasonal[s];
    if (d.fertile) {
      let n = 0;
      for (let dy = 0; dy < d.size; dy++) for (let dx = 0; dx < d.size; dx++) if (g.tiles[idx(b.x + dx, b.y + dy)] === T.FERTILE) n++;
      eff *= 1 + (d.fertile - 1) * (n / (d.size * d.size));
    }
    if (eff <= 0) continue;
    if (d.consumes) {
      let ratio = 1;
      for (const [k, v] of Object.entries(d.consumes)) ratio = Math.min(ratio, g.res[k] / (v * eff));
      ratio = Math.max(0, Math.min(1, ratio));
      for (const [k, v] of Object.entries(d.consumes)) g.res[k] -= v * eff * ratio;
      b.starved = ratio < 1;
      eff *= ratio;
    }
    if (eff <= 0) continue;
    b.output = {};
    for (const [k, v] of Object.entries(d.produces)) {
      g.res[k] += v * eff;
      b.output[k] = v * eff;
    }
  }

  // Habitants : nourriture, chauffage, outils, impôts
  const cap = housing(g);
  const foodNeed = g.pop * FOOD_PER_PERSON;
  g.starving = g.res.food < foodNeed;
  g.res.food = Math.max(0, g.res.food - foodNeed);

  g.cold = false;
  if (s === 3) {
    const woodNeed = g.pop * WINTER_WOOD_PER_PERSON * (g.harshWinter ? 2 : 1);
    g.cold = g.res.wood < woodNeed;
    g.res.wood = Math.max(0, g.res.wood - woodNeed);
  }

  const occupancy = cap > 0 ? Math.min(1, g.pop / cap) : 0;
  let taxBase = 0, villaPop = 0;
  for (const b of g.buildings) {
    const c = capOf(b) * occupancy;
    if (!c) continue;
    taxBase += c * (b.type === 'house' ? HOUSE_LEVELS[b.level].tax : 0.04);
    if (b.type === 'house' && b.level === 4) villaPop += c;
  }
  g.res.gold += taxBase * TAXES[g.tax].mult;
  g.res.tools = Math.max(0, g.res.tools - villaPop * 0.02);
  g.upkeep = upkeepOf(g);
  g.res.gold -= g.upkeep;
  g.broke = g.res.gold < 0;
  if (g.broke) g.res.gold = 0;

  // Stockage limité
  const store = storage(g);
  for (const k of RES_KEYS) if (k !== 'gold') g.res[k] = Math.min(g.res[k], store);
  g.lastGain = Object.fromEntries(RES_KEYS.map((k) => [k, g.res[k] - before[k]]));

  // Bonheur
  const houses = g.buildings.filter((b) => b.type === 'house');
  const parts = [];
  let target = 50;
  const add = (label, v) => { if (v) { parts.push({ label, v: Math.round(v) }); target += v; } };
  add(g.starving ? 'Famine' : 'Nourriture suffisante', g.starving ? -30 : 10);
  if (houses.length) {
    const services = ['well', 'chapel', 'market', 'tavern', 'school'];
    const avg = houses.reduce((n, b) => n + services.filter((t) => b.cover[t]).length / services.length, 0) / houses.length;
    add('Services', avg * 20);
    const decor = houses.reduce((n, b) => n + Math.min(b.decor || 0, 4) / 4, 0) / houses.length;
    add('Beauté', decor * 10);
  }
  add(`Impôts ${TAXES[g.tax].name.toLowerCase()}s`, TAXES[g.tax].happy);
  if (g.workforce > 5 && g.idle > g.workforce * 0.3) add('Chômage', -8);
  if (g.cold) add('Froid (manque de bois)', -15);
  if (g.broke) add('Caisses vides (entretien impayé)', -10);
  const burning = g.buildings.filter((b) => b.fire > 0).length;
  if (burning) add('Incendies', -5 * burning);
  target = Math.max(0, Math.min(100, target));
  g.happyTarget = target;
  g.happyParts = parts;
  g.happiness += Math.max(-3, Math.min(3, target - g.happiness));

  // Population
  const free = cap - g.pop;
  if (g.starving) g.pop -= 0.3;
  else if (g.happiness < 25) g.pop -= 0.15;
  else if (free > 0 && g.res.food >= 5) g.pop += Math.min(free, (0.15 + free * 0.03) * (g.happiness / 70));
  g.pop = Math.max(2, Math.min(g.pop, Math.max(cap, 2)));
  g.stats.maxPop = Math.max(g.stats.maxPop, g.pop);

  // Évolution des habitations (une fois tous les 3 jours par maison)
  for (const b of houses) {
    if ((g.day + b.id) % 3) continue;
    const t = houseTarget(g, b);
    if (t > b.level) b.level++;
    else if (t < b.level) b.level--;
  }

  // Incendies
  for (const b of [...g.buildings]) {
    if (!(b.fire > 0)) continue;
    b.fire--;
    if (b.fire === 0) {
      g.buildings = g.buildings.filter((o) => o !== b);
      notify(g, `🔥 ${def(b).name} a brûlé entièrement.`, 'danger', 'bad');
    }
  }

  // Prix du marché qui bougent un peu
  for (const k of Object.keys(g.prices)) {
    g.prices[k] = Math.max(0.5, Math.min(1.6, g.prices[k] * (1 + (Math.random() - 0.5) * 0.04)));
    g.prices[k] += (1 - g.prices[k]) * 0.02;
  }

  rollEvent(g);
  rebuild(g);
  checkQuests(g);

  if (g.day % 5 === 0) {
    g.history.push({ d: g.day, pop: Math.floor(g.pop), gold: Math.floor(g.res.gold), food: Math.floor(g.res.food), happy: Math.round(g.happiness) });
    if (g.history.length > 240) g.history.shift();
  }
}

// ---------- Sauvegarde ----------

export function serialize(g) {
  return JSON.stringify({
    v: 2, seed: g.seed, cleared: g.cleared, roads: [...g.roads.keys()].filter((i) => g.roads[i]),
    buildings: g.buildings.map(({ id, type, x, y, level, paused, fire }) => ({ id, type, x, y, level, paused, fire })),
    res: g.res, pop: g.pop, day: g.day, era: g.era, tax: g.tax, happiness: g.happiness, quest: g.quest,
    log: g.log.slice(0, 40), history: g.history, prices: g.prices, nextId: g.nextId, won: g.won, stats: g.stats,
    harshWinter: g.harshWinter,
  });
}

export function deserialize(text) {
  const d = JSON.parse(text);
  if (!d || d.v !== 2) return null;
  const g = { ...d, tiles: generateMap(d.seed), roads: new Uint8Array(MAP * MAP) };
  for (const i of d.cleared) g.tiles[i] = T.GRASS;
  for (const i of d.roads) g.roads[i] = 1;
  for (const k of RES_KEYS) g.res[k] ??= 0;
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
