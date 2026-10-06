// Joueur automatique pour tester l'équilibrage : il construit, gère ses chaînes de production,
// garde assez d'ouvriers de chaque classe, commerce et change d'ère tout seul.
// Utilisé par tests/simulation.html (ou depuis la console : (await import('/tests/bot.js')).simulate(42, 3000)).
import * as m from '../js/game.js';
import { MAP, BUILDINGS, CLASSES, WORKFORCE, GOOD_KEYS } from '../js/config.js';

export function createBot(seed) {
  const g = m.createGame(seed);
  const spots = [];
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) spots.push([x, y, Math.hypot(x - MAP / 2, y - MAP / 2)]);
  spots.sort((a, b) => a[2] - b[2]);
  const count = (t) => g.buildings.filter((b) => b.type === t).length;
  const houses = () => g.buildings.filter((b) => b.type === 'house');
  const touchesRoad = (x, y, s) => {
    for (let i = 0; i < s; i++) {
      for (const [a, b] of [[x + i, y - 1], [x + i, y + s], [x - 1, y + i], [x + s, y + i]]) {
        if (a >= 0 && b >= 0 && a < MAP && b < MAP && g.roadConn[b * MAP + a]) return true;
      }
    }
    return false;
  };
  // Cases libres proches d'une route (recalculées chaque jour) et échecs du jour, pour aller vite.
  let frontier = spots;
  let failed = new Set();
  const refreshFrontier = () => {
    failed = new Set();
    const near = new Uint8Array(MAP * MAP);
    for (let i = 0; i < MAP * MAP; i++) {
      if (!g.roadConn[i]) continue;
      const x = i % MAP, y = Math.floor(i / MAP);
      for (let dy = -3; dy <= 1; dy++) for (let dx = -3; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < MAP && ny < MAP) near[ny * MAP + nx] = 1;
      }
    }
    frontier = spots.filter(([x, y]) => near[y * MAP + x] && !g.occ[y * MAP + x] && !g.roads[y * MAP + x]);
  };
  // near : bâtiment près duquel construire (pour couvrir une maison précise).
  const tryPlace = (type, near = null) => {
    const d = BUILDINGS[type];
    if (!m.canAfford(g, d.cost) || m.eraLocked(g, type)) return false;
    if (!near && failed.has(type)) return false;
    let list = type === 'wonder' ? spots : frontier;
    if (near) {
      const r = d.service?.r ?? d.decor?.r ?? 3;
      list = [];
      for (let y = near.y - r - d.size; y <= near.y + r; y++) {
        for (let x = near.x - r - d.size; x <= near.x + r; x++) list.push([x, y, Math.hypot(x - near.x, y - near.y)]);
      }
      list.sort((a, b) => a[2] - b[2]);
    }
    for (const [x, y] of list) {
      if ((type === 'wonder' || touchesRoad(x, y, d.size)) && m.canPlace(g, type, x, y).ok) {
        m.place(g, type, x, y);
        frontier = frontier.filter(([fx, fy]) => !g.occ[fy * MAP + fx]);
        return true;
      }
    }
    if (!near) failed.add(type);
    return false;
  };
  const ensure = (type, n) => { if (count(type) < n) return tryPlace(type); return false; };
  const cover = (type, need, filter) => g.buildings
    .filter((b) => filter(b) && !b.cover[need])
    .slice(0, 5)
    .some((h) => tryPlace(type, h));
  const decorate = (lvl, min) => houses()
    .filter((b) => b.level >= lvl && (b.decor || 0) < min)
    .slice(0, 5)
    .some((h) => tryPlace('statue', h) || tryPlace('park', h) || tryPlace('fountain', h) || tryPlace('garden', h));
  // Routes en quadrillage tous les 4 cases pour laisser la place aux bâtiments.
  const extendRoads = () => {
    for (const [x, y] of spots) {
      if (!g.roadConn[y * MAP + x]) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (dx && (((ny - (MAP / 2 + 1)) % 4) + 4) % 4 !== 0) continue;
        if (dy && (((nx - (MAP / 2 - 2)) % 4) + 4) % 4 !== 0) continue;
        if (m.placeRoadPath(g, [[nx, ny]]).built) return true;
      }
    }
    return false;
  };

  // Garde assez d'habitants de chaque classe pour les emplois de cette classe.
  function manageLocks() {
    for (let c = 0; c < CLASSES.length - 1; c++) {
      const jobs = g.buildings.reduce((n, b) => n + (BUILDINGS[b.type].workers?.[0] === c ? BUILDINGS[b.type].workers[1] : 0), 0);
      const need = (jobs / WORKFORCE) * 1.2 + (c === 0 ? 12 : 0);
      let kept = 0;
      for (const b of houses().filter((h) => h.level === c + 1).sort((a, b) => a.id - b.id)) {
        b.lock = kept < need;
        kept += CLASSES[c].cap;
      }
    }
  }

  function day() {
    refreshFrontier();
    const es = m.eraStatus(g);
    const saving = es && es.reqs[0].ok && !es.ok;
    const [p, a, bu, n] = g.cls;
    const pop = p + a + bu + n;
    const hs = houses();
    const free = hs.reduce((s, b) => s + (m.capOf(b) - (b.res || 0)), 0);

    // Nourriture et logement
    ensure('fisher', Math.ceil((p * 0.05) / 2) + 1);
    if (free < 8 && g.goods.fish + g.goods.bread > 10) tryPlace('house');
    ensure('lumber', 2 + Math.floor(pop / 60) + count('charcoal'));
    ensure('sawmill', 1 + Math.floor(pop / 120));
    ensure('quarry', 1 + g.era);
    cover('well', 'well', (b) => b.type === 'house');
    if (g.day > 25) cover('firestation', 'fire', (b) => b.type !== 'townhall' && BUILDINGS[b.type].fire !== 0);
    ensure('warehouse', 1 + g.era * 2);

    if (!saving) {
      if (g.era >= 1) {
        const bread = a * 0.05 + bu * 0.06 + n * 0.07 + 0.5;
        const cloth = a * 0.03 + bu * 0.04 + n * 0.05 + 0.3;
        ensure('bakery', Math.ceil(bread / 3.6));
        ensure('mill', count('bakery'));
        // Des fermes en plus pour faire des réserves avant l'hiver.
        ensure('farm', Math.ceil(((count('mill') * 4 + count('brewery') * 3) / 3.6) * 1.4));
        ensure('weaver', Math.ceil(cloth / 2.8));
        ensure('sheep', count('weaver'));
        cover('market', 'market', (b) => b.type === 'house');
        cover('chapel', 'chapel', (b) => b.type === 'house' && b.level >= 1 && g.era >= 1);
      }
      if (g.era >= 2) {
        const beer = bu * 0.04 + n * 0.03 + 0.3;
        const tools = bu * 0.012 + n * 0.02 + 0.4;
        ensure('brewery', Math.ceil(beer / 2.8));
        ensure('forge', Math.ceil(tools / 1.8));
        ensure('smelter', count('forge'));
        ensure('mine', count('smelter'));
        ensure('charcoal', count('smelter'));
        cover('tavern', 'tavern', (b) => b.type === 'house' && b.level >= 2);
        cover('school', 'school', (b) => b.type === 'house' && b.level >= 2);
        if (!g.buildings[0].cover.guard) tryPlace('tower', g.buildings[0]);
        ensure('trading', 1);
        decorate(2, 2);
      }
      if (g.era >= 3) {
        ensure('winepress', Math.ceil((n * 0.04 + 0.3) / 2.8));
        ensure('vineyard', count('winepress'));
        decorate(3, 4);
      }
      if (g.goods.wood > 15) extendRoads();
    }
    if (g.era >= 4) tryPlace('wonder');
    manageLocks();

    // Commerce : acheter ce qui manque (coûts de l'ère suivante), vendre les surplus.
    const want = saving ? es.next.cost : g.era >= 4 && !count('wonder') ? BUILDINGS.wonder.cost : {};
    for (const k of GOOD_KEYS) {
      const target = Math.max(want[k] || 0, ['wood', 'planks', 'stone'].includes(k) ? 40 : 0);
      if (g.goods[k] < target && g.gold > 300 + (want.gold || 0)) m.buy(g, k, 10);
      else if (g.goods[k] > m.storage(g) * 0.9) m.sell(g, k, 10);
    }
    m.advanceEra(g);
    for (const b of g.buildings) if (b.fire > 0 && !b.cover.fire) m.bucketBrigade(g, b);
    for (const o of g.pending) if (o.type === 'caravan') m.acceptOffer(g, o);
    g.pending.length = 0;
    g.notes.length = 0;
    m.step(g);
  }

  const summary = () => `j${g.day} · ${['Hameau', 'Village', 'Bourg', 'Ville', 'Cité'][g.era]} · `
    + `classes ${g.cls.map(Math.floor).join('/')} · satisf. ${Math.round(g.happiness ?? 0)} % · or ${Math.floor(g.gold)} (${g.lastFin ? (g.lastFin.taxes - g.lastFin.upkeep).toFixed(1) : 0}/j) · `
    + `bois ${Math.floor(g.goods.wood)} planches ${Math.floor(g.goods.planks)} pierre ${Math.floor(g.goods.stone)} outils ${Math.floor(g.goods.tools)} · `
    + `pain ${Math.floor(g.goods.bread)} tissu ${Math.floor(g.goods.cloth)} · ${g.buildings.length} bât · obj ${g.quest} · feux ${g.stats.fires}`;

  return { g, day, summary };
}

// onProgress(lignes) est appelé régulièrement ; la page reste réactive pendant le calcul.
export async function simulate(seed, days, every = 100, onProgress = () => {}) {
  const bot = createBot(seed);
  const lines = [];
  let errors = 0;
  const t0 = performance.now();
  for (let d = 0; d < days && !bot.g.won; d++) {
    try { bot.day(); } catch (e) { if (errors++ < 3) lines.push(`ERREUR : ${e.stack}`); }
    if (bot.g.day % every === 0) { lines.push(bot.summary()); onProgress(lines); }
    if (d % 25 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  lines.push(`(${Math.round((performance.now() - t0) / 1000)} s de calcul)`);
  lines.push(`FIN : ${bot.summary()} · ${bot.g.won ? 'VICTOIRE' : 'pas de victoire'} · ${errors} erreur(s)`);
  return { lines, won: bot.g.won, day: bot.g.day, errors };
}
