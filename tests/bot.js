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
  for (let d = 0; d < days && !bot.g.won; d++) {
    try { bot.day(); } catch (e) { if (errors++ < 3) lines.push(`ERREUR : ${e.stack}`); }
    if (bot.g.day % every === 0) { lines.push(bot.summary()); onProgress(lines); }
    if (d % 25 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  lines.push(`(${Math.round((performance.now() - t0) / 1000)} s de calcul)`);
  lines.push(`FIN : ${bot.summary()} · ${bot.g.won ? 'VICTOIRE' : 'pas de victoire'} · ${errors} erreur(s)`);
  return { lines, won: bot.g.won, day: bot.g.day, errors };
}
