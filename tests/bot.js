// Joueur automatique pour tester l'équilibrage : il construit, commerce et change d'ère tout seul.
// Utilisé par tests/simulation.html (ou depuis la console : (await import('/tests/bot.js')).simulate(42, 3000)).
import * as m from '../js/game.js';
import { MAP, BUILDINGS } from '../js/config.js';

export function createBot(seed) {
  const g = m.createGame(seed);
  const spots = [];
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) spots.push([x, y, Math.hypot(x - MAP / 2, y - MAP / 2)]);
  spots.sort((a, b) => a[2] - b[2]);
  const count = (t) => g.buildings.filter((b) => b.type === t).length;
  const touchesRoad = (x, y, s) => {
    for (let i = 0; i < s; i++) {
      for (const [a, b] of [[x + i, y - 1], [x + i, y + s], [x - 1, y + i], [x + s, y + i]]) {
        if (a >= 0 && b >= 0 && a < MAP && b < MAP && g.roadConn[b * MAP + a]) return true;
      }
    }
    return false;
  };
  // near : bâtiment près duquel construire (pour couvrir une maison précise).
  const tryPlace = (type, near = null) => {
    const d = BUILDINGS[type];
    if (!m.canAfford(g, d.cost) || m.eraLocked(g, type)) return false;
    let list = spots;
    if (near) {
      const r = d.service?.r ?? d.decor?.r ?? 3;
      list = [];
      for (let y = near.y - r - d.size; y <= near.y + r; y++) {
        for (let x = near.x - r - d.size; x <= near.x + r; x++) list.push([x, y, Math.hypot(x - near.x, y - near.y)]);
      }
      list.sort((a, b) => a[2] - b[2]);
    }
    for (const [x, y] of list) {
      // La merveille n'a pas besoin de route pour faire gagner : on la pose où il y a la place.
      if ((type === 'wonder' || touchesRoad(x, y, d.size)) && m.canPlace(g, type, x, y).ok) { m.place(g, type, x, y); return true; }
    }
    return false;
  };
  // Couvre la première maison (du niveau voulu) à qui il manque ce service.
  const cover = (type, need, minLevel) => g.buildings
    .filter((b) => b.type === 'house' && b.level >= minLevel && !b.cover[need])
    .slice(0, 6)
    .some((h) => tryPlace(type, h));
  const decorate = (minLevel) => g.buildings
    .filter((b) => b.type === 'house' && b.level >= minLevel && (b.decor || 0) < 2)
    .slice(0, 6)
    .some((h) => tryPlace('statue', h) || tryPlace('park', h) || tryPlace('fountain', h) || tryPlace('garden', h));
  // Routes en quadrillage tous les 4 cases pour laisser la place aux bâtiments.
  const extendRoads = () => {
    for (const [x, y] of spots) {
      if (!g.roadConn[y * MAP + x]) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (dx && (((ny - (MAP / 2 + 1)) % 4) + 4) % 4 !== 0) continue;
        if (dy && (((nx - (MAP / 2 - 2)) % 4) + 4) % 4 !== 0) continue;
        if (m.placeRoad(g, nx, ny).ok) return true;
      }
    }
    return false;
  };

  function day() {
    const es = m.eraStatus(g);
    const saving = es && es.reqs[0].ok && es.reqs[1].ok && !es.ok;
    if (count('farm') + count('fisher') / 2 + count('hunter') / 3 < g.pop / 16 + 1) tryPlace('farm') || tryPlace('fisher') || tryPlace('hunter');
    if (m.housing(g) - g.pop < 4) tryPlace('house');
    if (count('lumber') < 2 + Math.floor(g.pop / 20)) tryPlace('lumber');
    if (count('quarry') < 1 + g.era * 2 + Math.floor(g.pop / 60)) tryPlace('quarry');
    cover('well', 'well', 1);
    if (count('warehouse') < 1 + g.era * 2 && g.res.wood > 60) tryPlace('warehouse');
    if (!saving) {
      if (g.era >= 1) {
        cover('chapel', 'chapel', 2);
        cover('market', 'market', 2);
        if (count('mine') < g.era + 1) tryPlace('mine');
        if (count('forge') < g.era + 1) tryPlace('forge');
        if (!count('tower')) tryPlace('tower', g.buildings[0]);
        if (count('firehouse') < g.buildings.length / 30) tryPlace('firehouse');
      }
      if (g.era >= 2) {
        cover('tavern', 'tavern', 3);
        cover('school', 'school', 3);
        if (!count('trading')) tryPlace('trading');
        decorate(3);
      }
      if (g.era >= 3 && count('mint') < 2) tryPlace('mint');
      if (g.res.wood > 15) extendRoads();
    }
    if (g.era >= 4) tryPlace('wonder');
    const want = saving ? es.next.cost : g.era >= 4 ? BUILDINGS.wonder.cost : {};
    for (const k of ['wood', 'stone', 'tools', 'iron']) {
      if (k !== 'wood' && k !== 'stone' && g.era < 1) continue;
      if (g.res[k] < Math.max(want[k] || 0, 100) && g.res.gold > 60 + (want.gold || 0)) m.buy(g, k, 10);
      else if (g.res[k] > m.storage(g) * 0.8 && g.res[k] > (want[k] || 0) + 50) m.sell(g, k, 10);
    }
    if (g.res.food > m.storage(g) * 0.8) m.sell(g, 'food', 10);
    m.advanceEra(g);
    for (const b of g.buildings) if (b.fire > 0) m.extinguish(g, b);
    for (const p of g.pending) if (p.type === 'caravan') m.acceptOffer(g, p);
    g.pending.length = 0;
    g.notes.length = 0;
    m.step(g);
  }

  const summary = () => `j${g.day} · ${['Hameau', 'Village', 'Bourg', 'Ville', 'Cité'][g.era]} · ${Math.floor(g.pop)}/${m.housing(g)} hab · bonheur ${Math.round(g.happiness)} · `
    + `🪵${Math.floor(g.res.wood)} 🪨${Math.floor(g.res.stone)} 🍞${Math.floor(g.res.food)} 🔩${Math.floor(g.res.iron)} 🛠️${Math.floor(g.res.tools)} 🪙${Math.floor(g.res.gold)} `
    + `(entretien ${(g.upkeep || 0).toFixed(1)}) · ${g.buildings.length} bât · objectif ${g.quest} · maisons ${[1, 2, 3, 4].map((L) => g.buildings.filter((b) => b.type === 'house' && b.level === L).length).join('/')}`;

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
  lines.push(`FIN : ${bot.summary()} · ${bot.g.won ? '🏆 VICTOIRE' : 'pas de victoire'} · ${errors} erreur(s)`);
  return { lines, won: bot.g.won, day: bot.g.day, errors };
}
