// Joueur automatique : il construit, gère ses chaînes de production, garde assez d'ouvriers
// de chaque classe, commerce et change d'ère tout seul. Sert à tester l'équilibrage
// (tests/simulation.html) et à préparer les villes de départ des missions de la campagne.
import * as m from './game.js';
import { MAP, BUILDINGS, CLASSES, WORKFORCE, GOOD_KEYS, TECHS } from './config.js';

// opts : { game, noFire (pas de postes d'incendie), noColonies, maxEra }
export function createBot(seed, opts = {}) {
  const g = opts.game || m.createGame(seed);
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

  // Colonie : un port sur l'île du type voulu, puis deux routes vers l'intérieur.
  function foundColony(kind) {
    if (opts.noColonies) return false;
    const id = g.isl.list.findIndex((I) => I.kind === kind);
    if (id <= 0) return false;
    if (g.buildings.some((b) => b.type === 'port' && m.islandOf(g, b) === id)) return true;
    if (!m.canAfford(g, BUILDINGS.port.cost)) return false;
    const I = g.isl.list[id];
    const cands = spots.filter(([x, y]) => g.isl.id[y * MAP + x] === id)
      .sort((a, b) => Math.hypot(a[0] - I.cx, a[1] - I.cy) - Math.hypot(b[0] - I.cx, b[1] - I.cy));
    for (const [x, y] of cands) {
      if (!m.canPlace(g, 'port', x, y).ok) continue;
      m.place(g, 'port', x, y);
      const cx = Math.round(I.cx), cy = Math.round(I.cy);
      for (const [sx, sy] of [[x - 1, y], [x, y - 1], [x + 2, y + 1], [x + 1, y + 2]]) {
        if (!m.canPlace(g, 'house', sx, sy).ok && !g.roads[sy * MAP + sx]) continue;
        const path = [];
        let px = sx, py = sy;
        path.push([px, py]);
        while (px !== cx) { px += Math.sign(cx - px); path.push([px, py]); }
        while (py !== cy) { py += Math.sign(cy - py); path.push([px, py]); }
        m.placeRoadPath(g, path);
      }
      return true;
    }
    return false;
  }

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
    // On économise pour l'ère suivante, ou pour la cathédrale à la dernière ère.
    const saving = (es && es.reqs[0].ok && !es.ok) || (g.era >= 4 && !g.won);
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
    if (g.day > 25 && !opts.noFire) cover('firestation', 'fire', (b) => b.type !== 'townhall' && BUILDINGS[b.type].fire !== 0);
    ensure('warehouse', 1 + g.era * 2);
    if (g.day > 20) ensure('library', 1 + g.era);
    // Recherche : la technologie disponible la moins chère.
    const tech = TECHS.filter((t) => m.techStatus(g, t).ok).sort((a, b) => a.cost - b.cost)[0];
    if (tech) m.research(g, tech.id);

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
        cover('doctor', 'health', (b) => b.type === 'house' && b.level >= 2);
        cover('guardpost', 'police', (b) => b.type === 'house' && b.level >= 2);
      }
      if (g.era >= 2) {
        const beer = bu * 0.04 + n * 0.03 + 0.3;
        const tools = bu * 0.012 + n * 0.02 + 0.4;
        ensure('brewery', Math.ceil(beer / 2.8));
        ensure('forge', Math.ceil(tools / 1.8));
        ensure('smelter', count('forge'));
        if (!ensure('mine', count('smelter')) && count('mine') < count('smelter') && g.tech.includes('navigation') && foundColony('ore')) ensure('mine', count('smelter'));
        ensure('charcoal', count('smelter'));
        cover('tavern', 'tavern', (b) => b.type === 'house' && b.level >= 2);
        cover('school', 'school', (b) => b.type === 'house' && b.level >= 2);
        if (!g.buildings[0].cover.guard) tryPlace('tower', g.buildings[0]);
        ensure('trading', 1);
        ensure('university', g.era - 1);
        decorate(2, 2);
      }
      if (g.era >= 2 && g.tech.includes('navigation') && !g.buildings.some((b) => b.type === 'port' && m.islandOf(g, b) === 0)) tryPlace('port');
      if (g.era >= 3) {
        ensure('winepress', Math.ceil((n * 0.04 + 0.3) / 2.8));
        ensure('vineyard', count('winepress'));
        if (g.tech.includes('colonial') && foundColony('spice') && foundColony('gold')) {
          ensure('spicefarm', Math.ceil((n * 0.03 + 0.3) / 2.8));
          ensure('jeweler', g.tech.includes('goldsmith') ? Math.ceil((n * 0.012 + 0.2) / 1.4) : 0);
          ensure('goldmine', Math.max(1, count('jeweler')));
        }
        decorate(3, 4);
      }
      if (g.goods.wood > 15) extendRoads();
    }
    if (g.era >= 4) tryPlace('wonder');
    manageLocks();

    // Commerce : acheter ce qui manque (coûts de l'ère suivante), vendre les surplus.
    const site = g.buildings.find((b) => b.type === 'wonder' && b.build);
    const want = es && saving ? es.next.cost : g.era >= 4 && !count('wonder') ? BUILDINGS.wonder.cost
      : site ? Object.fromEntries(Object.entries(BUILDINGS.wonder.buildUse).map(([k, v]) => [k, v * 25])) : {};
    for (const k of GOOD_KEYS) {
      const target = Math.max(want[k] || 0, ['wood', 'planks', 'stone'].includes(k) ? 40 : 0);
      if (g.goods[k] < target && g.gold > 300 + (want.gold || 0)) m.buy(g, k, 10);
      else if (g.goods[k] > m.storage(g) * 0.9) m.sell(g, k, 10);
    }
    // Riche : acheter ce qui manque aux habitants.
    if (g.gold > 1500 && !saving) {
      for (const [c, s] of g.supply.entries()) {
        for (const [k, v] of Object.entries(s)) if (k !== 'food' && v < 0.95 && g.cls[c] > 0) m.buy(g, k, 10);
      }
    }
    if (opts.maxEra === undefined || g.era < opts.maxEra) m.advanceEra(g);
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
