// Niveaux de difficulté de la partie.
import { EN } from './i18n.js';
import en from './lang-en.js';

export const DIFFICULTIES = [
  { name: 'Facile', desc: 'Plus de ressources au départ, impôts généreux, peu d\'incendies.', start: 1.5, tax: 1.2, upkeep: 0.85, fire: 0.5, events: 0.7 },
  { name: 'Normal', desc: 'L\'expérience prévue.', start: 1, tax: 1, upkeep: 1, fire: 1, events: 1 },
  { name: 'Difficile', desc: 'Départ serré, entretien coûteux, incendies et coups du sort fréquents.', start: 0.7, tax: 0.85, upkeep: 1.15, fire: 1.6, events: 1.3 },
];

// Version anglaise des difficultés.
if (EN) DIFFICULTIES.forEach((d, i) => { [d.name, d.desc] = en.difficulties[i]; });
