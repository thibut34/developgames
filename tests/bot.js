// Simulation d'équilibrage : fait jouer le joueur automatique (js/autobuild.js) et résume la partie.
// Utilisé par tests/simulation.html (ou depuis la console : (await import('/tests/bot.js')).simulate(42, 3000)).
import { createBot } from '../js/autobuild.js';

export { createBot };

// onProgress(lignes) est appelé régulièrement ; la page reste réactive pendant le calcul.
export async function simulate(seed, days, every = 100, onProgress = () => {}) {
  const bot = createBot(seed);
  const lines = [];
  let errors = 0;
  const t0 = performance.now();
  // La partie va jusqu'au Palais royal ; on note aussi le jour de la Grande Cathédrale.
  const done = (t) => bot.g.buildings.some((b) => b.type === t && !b.build);
  let wonderDay = null;
  for (let d = 0; d < days && !done('palace'); d++) {
    try { bot.day(); } catch (e) { if (errors++ < 3) lines.push(`ERREUR : ${e.stack}`); }
    if (wonderDay === null && bot.g.won) { wonderDay = bot.g.day; lines.push(`>> Grande Cathédrale achevée au jour ${wonderDay}`); }
    if (bot.g.day % every === 0) { lines.push(bot.summary()); onProgress(lines); }
    if (d % 25 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  lines.push(`(${Math.round((performance.now() - t0) / 1000)} s de calcul)`);
  const palace = done('palace');
  lines.push(`FIN : ${bot.summary()} · cathédrale ${wonderDay ? `jour ${wonderDay}` : 'non'} · palais ${palace ? `jour ${bot.g.day}` : 'non'} · ${errors} erreur(s)`);
  return { lines, won: bot.g.won, day: bot.g.day, wonderDay, palace, errors };
}
