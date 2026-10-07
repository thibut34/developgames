// Niveaux de difficulté et missions de la campagne.
import { EN } from './i18n.js';
import en from './lang-en.js';

export const DIFFICULTIES = [
  { name: 'Facile', desc: 'Plus de ressources au départ, impôts généreux, peu d\'incendies.', start: 1.5, tax: 1.2, upkeep: 0.85, fire: 0.5, events: 0.7 },
  { name: 'Normal', desc: 'L\'expérience prévue.', start: 1, tax: 1, upkeep: 1, fire: 1, events: 1 },
  { name: 'Difficile', desc: 'Départ serré, entretien coûteux, incendies et coups du sort fréquents.', start: 0.7, tax: 0.85, upkeep: 1.15, fire: 1.6, events: 1.3 },
];

// Chaque mission : graine de carte, difficulté, ville de départ éventuellement préparée par le
// joueur automatique (prebuild), réglages (mods), objectifs et limite de temps (jours).
// check(g, h) renvoie [actuel, objectif] ; h offre count, done, cls, pop, colonies, techs…
export const SCENARIOS = [
  {
    id: 'colons', name: 'Les premiers colons', icon: 'house', seed: 1101, difficulty: 1, days: 400,
    intro: 'Une poignée de colons débarque sur une île sauvage. Faites-en un village digne de ce nom avant la fin de la troisième année.',
    goals: [
      { text: 'Atteindre 150 paysans', check: (g, h) => [h.cls(0), 150] },
      { text: 'Construire une scierie', check: (g, h) => [h.done('sawmill'), 1] },
      { text: 'Passer à l\'ère du Village', check: (g) => [g.era, 1] },
    ],
  },
  {
    id: 'hiver', name: 'Le long hiver', icon: 'snowflake', seed: 2202, difficulty: 1,
    prebuild: { days: 70, maxEra: 0 },
    after(g) { g.goods.fish = 5; g.goods.bread = 0; g.gold = Math.min(g.gold, 150); },
    intro: 'L\'automne touche à sa fin et les réserves sont presque vides. Tenez jusqu\'au printemps sans laisser votre hameau dépérir.',
    goals: [
      { text: 'Tenir jusqu\'au printemps (jour 121)', check: (g) => [Math.min(g.day, 121), 121] },
      { text: 'Avoir au moins 50 habitants au printemps', check: (g, h) => [g.day >= 121 ? Math.min(h.pop(), 50) : Math.min(h.pop(), 49), 50] },
    ],
    lose: (g, h) => (h.pop() < 10 && g.day > 75 ? 'Le hameau a été abandonné.' : null),
  },
  {
    id: 'incendie', name: 'Le grand incendie', icon: 'flame', seed: 3303, difficulty: 1, days: 400,
    prebuild: { days: 300, maxEra: 1, noFire: true },
    mods: { fire: 4 },
    after(g, api) { api.igniteHouses(3); },
    intro: 'Votre ville a poussé trop vite, sans aucun pompier. Le feu vient de prendre dans plusieurs maisons : sauvez ce qui peut l\'être, puis reconstruisez.',
    goals: [
      { text: 'Construire 4 postes d\'incendie', check: (g, h) => [h.done('firestation'), 4] },
      { text: 'Atteindre 400 habitants', check: (g, h) => [h.pop(), 400] },
    ],
  },
  {
    id: 'pain', name: 'Pain et tissu', icon: 'croissant', seed: 4404, difficulty: 1, days: 600,
    prebuild: { days: 200, maxEra: 1 },
    intro: 'Les artisans réclament du pain frais et des vêtements. Montez les chaînes du blé et de la laine et gardez-les satisfaits.',
    goals: [
      { text: 'Atteindre 150 artisans', check: (g, h) => [h.cls(1), 150] },
      { text: 'Satisfaction moyenne d\'au moins 85 %', check: (g) => [Math.min(85, Math.round(g.happiness ?? 0)), 85] },
    ],
  },
  {
    id: 'savoir', name: 'La cité du savoir', icon: 'flask-conical', seed: 5505, difficulty: 1, days: 700,
    prebuild: { days: 650, maxEra: 2 },
    after(g, api) { g.tech = []; g.rp = 0; api.refresh(); },
    intro: 'Le roi veut faire de votre bourg un phare du savoir. Bâtissez bibliothèques et université, et faites progresser les sciences.',
    goals: [
      { text: 'Découvrir 12 technologies', check: (g, h) => [h.techs(), 12] },
      { text: 'Construire une université', check: (g, h) => [h.done('university'), 1] },
    ],
  },
  {
    id: 'horizons', name: 'Nouveaux horizons', icon: 'ship', seed: 6606, difficulty: 1, days: 500,
    prebuild: { days: 780, maxEra: 3, noColonies: true },
    after(g, api) {
      g.era = Math.max(g.era, 3);
      for (const t of ['navigation', 'colonial']) if (!g.tech.includes(t)) g.tech.push(t);
      api.refresh();
    },
    intro: 'Vos navigateurs ont repéré des îles lointaines riches en épices et en or. Fondez des colonies et ramenez leurs trésors.',
    goals: [
      { text: 'Fonder 2 colonies', check: (g, h) => [h.colonies(), 2] },
      { text: 'Avoir 80 épices en stock', check: (g) => [Math.floor(g.goods.spices), 80] },
      { text: 'Avoir 30 pépites d\'or en stock', check: (g) => [Math.floor(g.goods.nugget), 30] },
    ],
  },
  {
    id: 'joyau', name: 'Le joyau du royaume', icon: 'gem', seed: 7707, difficulty: 1, days: 800,
    prebuild: { days: 850, maxEra: 3 },
    after(g, api) {
      g.era = Math.max(g.era, 3);
      for (const t of ['navigation', 'colonial', 'goldsmith']) if (!g.tech.includes(t)) g.tech.push(t);
      api.refresh();
    },
    intro: 'La noblesse du royaume cherche une ville digne de son rang. Offrez-lui épices, vin et bijoux.',
    goals: [
      { text: 'Atteindre 100 nobles', check: (g, h) => [h.cls(3), 100] },
      { text: 'Avoir 40 bijoux en stock', check: (g) => [Math.floor(g.goods.jewels), 40] },
    ],
  },
  {
    id: 'cathedrale', name: 'La Grande Cathédrale', icon: 'castle', seed: 8808, difficulty: 2,
    intro: 'L\'épreuve ultime, en difficulté élevée : partez de rien et achevez la Grande Cathédrale.',
    goals: [
      { text: 'Achever la Grande Cathédrale', check: (g, h) => [h.done('wonder'), 1] },
    ],
  },
];

// Version anglaise des difficultés et des missions.
if (EN) {
  DIFFICULTIES.forEach((d, i) => { [d.name, d.desc] = en.difficulties[i]; });
  for (const sc of SCENARIOS) {
    const t = en.scenarios[sc.id];
    sc.name = t.name; sc.intro = t.intro;
    sc.goals.forEach((goal, i) => { goal.text = t.goals[i]; });
    if (sc.lose && t.lose) { const lose = sc.lose; sc.lose = (g, h) => (lose(g, h) ? t.lose : null); }
  }
}

export const findScenario = (id) => SCENARIOS.find((s) => s.id === id);
