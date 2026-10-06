// Réglages et données du jeu.

export const TILE = 48;          // taille d'une case en pixels (monde)
export const MAP_W = 40;
export const MAP_H = 28;

export const T = { GRASS: 0, FOREST: 1, ROCK: 2, WATER: 3 };
export const TERRAIN_NAMES = ['Prairie', 'Forêt', 'Rochers', 'Eau'];

export const BASE_STORAGE = 150;   // stockage max par ressource (hors or)
export const FOOD_PER_PERSON = 0.25; // nourriture mangée par habitant et par jour
export const TAX_PER_PERSON = 0.05;  // or rapporté par habitant et par jour
export const GROWTH_PER_DAY = 0.2;   // habitants gagnés/perdus par jour

export const START = {
  res: { wood: 60, stone: 10, food: 40, gold: 0 },
  pop: 4,
};

export const RES = {
  wood: { name: 'Bois', icon: '🪵' },
  stone: { name: 'Pierre', icon: '🪨' },
  food: { name: 'Nourriture', icon: '🍞' },
  gold: { name: 'Or', icon: '🪙' },
};

// size : côté en cases. workers : ouvriers nécessaires pour produire.
// near : type de terrain qui doit toucher le bâtiment.
export const BUILDINGS = {
  townhall: {
    name: 'Hôtel de ville', icon: '🏛️', size: 2, color: '#b5651d',
    housing: 4, buildable: false,
    desc: 'Le cœur du village. Loge 4 habitants.',
  },
  house: {
    name: 'Maison', icon: '🏠', size: 1, color: '#d08c4f',
    cost: { wood: 15 }, housing: 4,
    desc: 'Loge 4 habitants.',
  },
  farm: {
    name: 'Ferme', icon: '🌾', size: 1, color: '#e2c35b',
    cost: { wood: 20 }, workers: 2, produces: { food: 3 },
    desc: 'Produit 3 nourriture par jour.',
  },
  lumber: {
    name: 'Bûcheron', icon: '🪓', size: 1, color: '#8a6a3f',
    cost: { wood: 15 }, workers: 2, produces: { wood: 2 }, near: T.FOREST,
    desc: 'Produit 2 bois par jour. Doit toucher une forêt.',
  },
  quarry: {
    name: 'Carrière', icon: '⛏️', size: 1, color: '#9b9b9b',
    cost: { wood: 25 }, workers: 3, produces: { stone: 2 }, near: T.ROCK,
    desc: 'Produit 2 pierre par jour. Doit toucher des rochers.',
  },
  warehouse: {
    name: 'Entrepôt', icon: '📦', size: 1, color: '#a0785a',
    cost: { wood: 30, stone: 15, gold: 10 }, storage: 150,
    desc: '+150 de stockage pour chaque ressource.',
  },
  market: {
    name: 'Marché', icon: '🏪', size: 2, color: '#c0504d',
    cost: { wood: 40, stone: 30, gold: 20 }, workers: 2, produces: { gold: 2 },
    desc: 'Produit 2 or par jour.',
  },
};
