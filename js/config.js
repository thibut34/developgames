// Données et réglages du jeu. Tout l'équilibrage se fait ici.

export const TW = 64;            // largeur d'une case isométrique (pixels monde)
export const TH = 32;            // hauteur d'une case isométrique
export const MAP = 56;           // la carte fait MAP × MAP cases

export const DAY_MS = 2000;      // durée d'un jour à vitesse ×1
export const DAYS_PER_SEASON = 15;
export const SEASONS = [
  { name: 'Printemps', icon: '🌱' },
  { name: 'Été', icon: '☀️' },
  { name: 'Automne', icon: '🍂' },
  { name: 'Hiver', icon: '❄️' },
];

export const T = { GRASS: 0, FOREST: 1, ROCK: 2, WATER: 3, MOUNTAIN: 4, FERTILE: 5, SAND: 6 };
export const TERRAIN = [
  { name: 'Prairie', build: true },
  { name: 'Forêt', build: false },
  { name: 'Rochers', build: false },
  { name: 'Eau', build: false },
  { name: 'Montagne', build: false },
  { name: 'Terre fertile', build: true, hint: 'Les fermes y produisent +50 %.' },
  { name: 'Sable', build: true },
];
// Défricher une case : coût et ce qu'on récupère.
export const CLEAR = {
  [T.FOREST]: { cost: { gold: 3 }, gain: { wood: 6 } },
  [T.ROCK]: { cost: { gold: 10 }, gain: { stone: 6 } },
};

export const RES = {
  wood: { name: 'Bois', icon: '🪵', price: 1 },
  stone: { name: 'Pierre', icon: '🪨', price: 1.5 },
  food: { name: 'Nourriture', icon: '🍞', price: 1 },
  iron: { name: 'Fer', icon: '🔩', price: 3 },
  tools: { name: 'Outils', icon: '🛠️', price: 6 },
  gold: { name: 'Or', icon: '🪙' },
};
export const RES_KEYS = Object.keys(RES);

export const START = {
  res: { wood: 80, stone: 20, food: 50, iron: 0, tools: 0, gold: 20 },
  pop: 6,
};

export const BASE_STORAGE = 200;
export const WORKFORCE = 0.8;          // part des habitants qui travaillent
export const FOOD_PER_PERSON = 0.2;    // par jour
export const WINTER_WOOD_PER_PERSON = 0.03;
export const ROAD_COST = { wood: 1 };
export const TAXES = [
  { name: 'Bas', mult: 0.6, happy: 8 },
  { name: 'Normal', mult: 1, happy: 0 },
  { name: 'Élevé', mult: 1.5, happy: -12 },
];
export const LEVEL_OUTPUT = [0, 1, 1.6, 2.2];   // multiplicateur de production par niveau
export const MAX_LEVEL = 3;

export const ERAS = [
  { name: 'Hameau' },
  { name: 'Village', pop: 25, houses: [2, 6], cost: { wood: 150, stone: 80, gold: 60 } },
  { name: 'Bourg', pop: 70, houses: [3, 8], cost: { wood: 300, stone: 250, gold: 400, tools: 30 } },
  { name: 'Ville', pop: 160, houses: [4, 10], cost: { wood: 600, stone: 600, gold: 1500, tools: 100, iron: 80 } },
  { name: 'Cité', pop: 300, houses: [4, 20], cost: { stone: 1000, gold: 4000, tools: 200, iron: 150 } },
];

// Niveaux des habitations. needs : ce qu'il faut pour atteindre ce niveau.
export const HOUSE_LEVELS = [
  null,
  { name: 'Cabane', cap: 4, tax: 0.04, needs: [], wall: '#b48d5c', roof: '#7b5530', h: 12 },
  { name: 'Maison', cap: 8, tax: 0.05, needs: ['road', 'well', 'food'], wall: '#e4cfa6', roof: '#b4472f', h: 17 },
  { name: 'Maison bourgeoise', cap: 14, tax: 0.07, era: 1, needs: ['road', 'well', 'food', 'chapel', 'market'], wall: '#efe4cc', roof: '#3f5f8f', h: 24 },
  { name: 'Villa', cap: 20, tax: 0.1, era: 2, needs: ['road', 'well', 'food', 'chapel', 'market', 'tavern', 'school', 'decor', 'tools'], wall: '#f6f1e6', roof: '#2f6b4f', h: 30 },
];
export const NEED_NAMES = {
  road: 'Relié par une route',
  well: "Accès à l'eau (puits ou fontaine)",
  food: 'Nourriture en stock',
  chapel: 'Proche d\'une chapelle',
  market: 'Proche d\'un marché',
  tavern: 'Proche d\'une taverne',
  school: 'Proche d\'une école',
  decor: 'Beauté du quartier ≥ 2 (jardins, fontaines…)',
  tools: 'Outils en stock',
};
export const DECOR_NEEDED = 2;

export const CATEGORIES = [
  { id: 'tools', name: 'Outils', icon: '🧭' },
  { id: 'house', name: 'Logement', icon: '🏠' },
  { id: 'food', name: 'Nourriture', icon: '🌾' },
  { id: 'industry', name: 'Industrie', icon: '⚒️' },
  { id: 'service', name: 'Services', icon: '⛪' },
  { id: 'deco', name: 'Beauté', icon: '🌳' },
];

// Outils qui ne sont pas des bâtiments.
export const TOOLS = [
  { id: 'inspect', name: 'Inspecter', icon: '👆', desc: 'Touchez un bâtiment pour voir ses détails.' },
  { id: 'road', name: 'Route', icon: '🛤️', desc: 'Glissez pour tracer. Les bâtiments doivent être reliés à l\'hôtel de ville par la route.', cost: ROAD_COST },
  { id: 'clear', name: 'Défricher', icon: '🪓', desc: 'Retire une forêt (3 🪙, +6 🪵) ou des rochers (10 🪙, +6 🪨).' },
  { id: 'demolish', name: 'Démolir', icon: '🔨', desc: 'Détruit un bâtiment (50 % remboursé) ou une route.' },
];

// cat : catégorie de la barre d'outils. era : ère de déblocage (0 = Hameau).
// workers : ouvriers requis. produces/consumes : par jour à plein régime.
// near : terrain qui doit toucher le bâtiment. service : { type, r } couverture des maisons.
// decor : { v, r } beauté apportée aux maisons proches. look : style de dessin.
export const BUILDINGS = {
  townhall: {
    name: 'Hôtel de ville', icon: '🏛️', size: 2, buildable: false, housing: 6, storage: 100,
    desc: 'Le cœur de la cité. Les routes partent d\'ici. Son stockage grandit à chaque ère.',
    look: 'townhall',
  },
  house: {
    name: 'Habitation', icon: '🏠', cat: 'house', era: 0, size: 1, cost: { wood: 10 },
    desc: 'Commence en cabane et évolue toute seule si ses besoins sont satisfaits.',
    look: 'house',
  },
  farm: {
    name: 'Ferme', icon: '🌾', cat: 'food', era: 0, size: 2, cost: { wood: 25 }, workers: 3,
    produces: { food: 4 }, fertile: 1.5, seasonal: [1, 1.25, 1.5, 0],
    desc: '+4 🍞/jour. +50 % sur terre fertile. Rien en hiver, récolte en automne.',
    look: 'farm', wall: '#c9a46b', roof: '#9c3b2a', h: 14,
  },
  fisher: {
    name: 'Pêcheur', icon: '🎣', cat: 'food', era: 0, size: 1, cost: { wood: 15 }, workers: 2,
    produces: { food: 2.5 }, near: T.WATER, seasonal: [1, 1, 1, 0.6],
    desc: '+2,5 🍞/jour. Doit toucher l\'eau. Pêche réduite en hiver.',
    look: 'hut', wall: '#a7855a', roof: '#4f7aa0', h: 11,
  },
  hunter: {
    name: 'Chasseur', icon: '🏹', cat: 'food', era: 0, size: 1, cost: { wood: 12 }, workers: 2,
    produces: { food: 1.5 }, near: T.FOREST, seasonal: [1, 1, 1, 0.5],
    desc: '+1,5 🍞/jour. Doit toucher une forêt.',
    look: 'hut', wall: '#8f6b44', roof: '#4c6b34', h: 11,
  },
  lumber: {
    name: 'Bûcheron', icon: '🪓', cat: 'industry', era: 0, size: 1, cost: { wood: 10 }, workers: 2,
    produces: { wood: 3 }, near: T.FOREST,
    desc: '+3 🪵/jour. Doit toucher une forêt.',
    look: 'lumber', wall: '#9a7247', roof: '#5c3d22', h: 12,
  },
  quarry: {
    name: 'Carrière', icon: '⛏️', cat: 'industry', era: 0, size: 1, cost: { wood: 20 }, workers: 3,
    produces: { stone: 2 }, near: T.ROCK,
    desc: '+2 🪨/jour. Doit toucher des rochers.',
    look: 'quarry', wall: '#a8a49c', roof: '#6d6a64', h: 11,
  },
  warehouse: {
    name: 'Entrepôt', icon: '📦', cat: 'industry', era: 0, size: 2, cost: { wood: 40, stone: 10 },
    storage: 200,
    desc: '+200 de stockage pour chaque ressource.',
    look: 'warehouse', wall: '#a77b52', roof: '#6a4a2f', h: 18,
  },
  well: {
    name: 'Puits', icon: '🪣', cat: 'service', era: 0, size: 1, cost: { wood: 10, stone: 5 },
    service: { type: 'well', r: 4 },
    desc: 'Donne l\'eau aux maisons à 4 cases ou moins.',
    look: 'well',
  },
  garden: {
    name: 'Jardin', icon: '🌷', cat: 'deco', era: 0, size: 1, cost: { wood: 5, gold: 5 },
    decor: { v: 1, r: 3 },
    desc: 'Beauté +1 pour les maisons à 3 cases ou moins.',
    look: 'garden',
  },
  mine: {
    name: 'Mine de fer', icon: '🔩', cat: 'industry', era: 1, size: 1, cost: { wood: 40, stone: 20 }, workers: 4,
    produces: { iron: 1.5 }, near: T.MOUNTAIN,
    desc: '+1,5 🔩/jour. Doit toucher une montagne.',
    look: 'mine', wall: '#6f6559', roof: '#3d3630', h: 12,
  },
  forge: {
    name: 'Forge', icon: '🛠️', cat: 'industry', era: 1, size: 1, cost: { wood: 30, stone: 40 }, workers: 3,
    consumes: { iron: 1, wood: 1 }, produces: { tools: 1 },
    desc: 'Transforme 1 🔩 + 1 🪵 en 1 🛠️ par jour.',
    look: 'forge', wall: '#7d6f62', roof: '#3c3530', h: 15,
  },
  chapel: {
    name: 'Chapelle', icon: '⛪', cat: 'service', era: 1, size: 1, cost: { wood: 40, stone: 60, gold: 30 }, workers: 1,
    service: { type: 'chapel', r: 6 },
    desc: 'Culte pour les maisons à 6 cases ou moins.',
    look: 'chapel', wall: '#eee6d6', roof: '#5a5f6e', h: 20,
  },
  market: {
    name: 'Marché', icon: '🏪', cat: 'service', era: 1, size: 2, cost: { wood: 60, stone: 40, gold: 40 }, workers: 2,
    service: { type: 'market', r: 6 }, produces: { gold: 1 },
    desc: 'Approvisionne les maisons à 6 cases ou moins, +1 🪙/jour et de bien meilleurs prix au commerce.',
    look: 'market',
  },
  firehouse: {
    name: 'Pompiers', icon: '🚒', cat: 'service', era: 1, size: 1, cost: { wood: 40, stone: 30 }, workers: 2,
    service: { type: 'fire', r: 7 },
    desc: 'Empêche les incendies à 7 cases ou moins.',
    look: 'firehouse', wall: '#c4473a', roof: '#5b2b25', h: 18,
  },
  tower: {
    name: 'Tour de garde', icon: '🗼', cat: 'service', era: 1, size: 1, cost: { wood: 20, stone: 60 }, workers: 2,
    service: { type: 'guard', r: 8 },
    desc: 'Protège des bandits si elle couvre l\'hôtel de ville (8 cases).',
    look: 'tower', wall: '#9d978c', roof: '#59463a', h: 40,
  },
  tavern: {
    name: 'Taverne', icon: '🍺', cat: 'service', era: 2, size: 1, cost: { wood: 60, stone: 50, gold: 60 }, workers: 2,
    service: { type: 'tavern', r: 5 }, consumes: { food: 0.5 }, produces: { gold: 1.5 },
    desc: 'Divertit les maisons à 5 cases ou moins. Mange 0,5 🍞, rapporte 1,5 🪙/jour.',
    look: 'tavern', wall: '#c99a62', roof: '#7a2f2a', h: 20,
  },
  school: {
    name: 'École', icon: '🎓', cat: 'service', era: 2, size: 1, cost: { wood: 60, stone: 80, gold: 80, tools: 10 }, workers: 2,
    service: { type: 'school', r: 6 },
    desc: 'Instruit les maisons à 6 cases ou moins.',
    look: 'school', wall: '#d9c39a', roof: '#3e6a8a', h: 20,
  },
  fountain: {
    name: 'Fontaine', icon: '⛲', cat: 'deco', era: 2, size: 1, cost: { stone: 40, gold: 30 },
    decor: { v: 2, r: 4 }, service: { type: 'well', r: 4 },
    desc: 'Beauté +2 (4 cases) et donne l\'eau comme un puits.',
    look: 'fountain',
  },
  trading: {
    name: 'Comptoir', icon: '⚖️', cat: 'industry', era: 2, size: 2, cost: { wood: 80, stone: 60, gold: 100 }, workers: 3,
    desc: 'Meilleurs prix au commerce (vente à 85 %) et caravanes plus fréquentes.',
    look: 'trading', wall: '#b88a5a', roof: '#2f5c6b', h: 18,
  },
  statue: {
    name: 'Statue', icon: '🗿', cat: 'deco', era: 3, size: 1, cost: { stone: 80, gold: 120 },
    decor: { v: 3, r: 5 },
    desc: 'Beauté +3 pour les maisons à 5 cases ou moins.',
    look: 'statue',
  },
  park: {
    name: 'Parc', icon: '🌳', cat: 'deco', era: 3, size: 2, cost: { wood: 20, gold: 80 },
    decor: { v: 3, r: 5 },
    desc: 'Beauté +3 pour les maisons à 5 cases ou moins.',
    look: 'park',
  },
  mint: {
    name: 'Hôtel des monnaies', icon: '🪙', cat: 'industry', era: 3, size: 2, cost: { stone: 150, gold: 200, tools: 40 }, workers: 4,
    consumes: { iron: 1 }, produces: { gold: 6 },
    desc: 'Frappe 6 🪙 par jour avec 1 🔩.',
    look: 'mint', wall: '#e9dfc4', roof: '#b08a2e', h: 22,
  },
  wonder: {
    name: 'Grande Cathédrale', icon: '🏰', cat: 'service', era: 4, size: 3,
    cost: { wood: 500, stone: 1500, iron: 200, tools: 300, gold: 8000 }, workers: 10,
    service: { type: 'chapel', r: 12 }, decor: { v: 5, r: 6 }, unique: true,
    desc: 'La merveille de votre cité. La bâtir, c\'est gagner la partie !',
    look: 'wonder',
  },
};

// Entretien payé en or chaque jour par bâtiment. Caisses vides = habitants mécontents.
export const UPKEEP = {
  warehouse: 0.2, chapel: 0.5, firehouse: 0.5, tower: 0.5, tavern: 0.3, school: 1, trading: 1,
  fountain: 0.3, statue: 0.5, park: 0.5, mint: 1, wonder: 3,
};

// Ordre de priorité pour les ouvriers : la nourriture d'abord.
export const WORK_PRIORITY = { food: 0, service: 1, industry: 2, deco: 3, house: 4 };

// Objectifs guidés, dans l'ordre. check(g, h) renvoie [actuel, objectif].
export const QUESTS = [
  { text: 'Construire un bûcheron au bord d\'une forêt', check: (g, h) => [h.count('lumber'), 1], reward: { wood: 20 } },
  { text: 'Construire une ferme (idéalement sur terre fertile)', check: (g, h) => [h.count('farm'), 1], reward: { food: 30 } },
  { text: 'Construire 3 habitations', check: (g, h) => [h.count('house'), 3], reward: { wood: 30 } },
  { text: 'Relier 3 bâtiments à l\'hôtel de ville par la route', check: (g, h) => [h.connectedCount(), 3], reward: { wood: 20, gold: 10 } },
  { text: 'Construire une carrière près des rochers', check: (g, h) => [h.count('quarry'), 1], reward: { wood: 25 } },
  { text: 'Construire un puits près des maisons', check: (g, h) => [h.count('well'), 1], reward: { stone: 15 } },
  { text: 'Atteindre 15 habitants', check: (g) => [Math.floor(g.pop), 15], reward: { gold: 25 } },
  { text: 'Avoir 3 maisons de niveau 2', check: (g, h) => [h.housesAtLeast(2), 3], reward: { gold: 30 } },
  { text: 'Construire un entrepôt', check: (g, h) => [h.count('warehouse'), 1], reward: { stone: 30 } },
  { text: 'Passer à l\'ère du Village', check: (g) => [g.era, 1], reward: { gold: 50 } },
  { text: 'Construire une mine de fer et une forge', check: (g, h) => [Math.min(h.count('mine'), 1) + Math.min(h.count('forge'), 1), 2], reward: { tools: 10 } },
  { text: 'Construire une chapelle et un marché', check: (g, h) => [Math.min(h.count('chapel'), 1) + Math.min(h.count('market'), 1), 2], reward: { gold: 60 } },
  { text: 'Avoir 5 maisons bourgeoises', check: (g, h) => [h.housesAtLeast(3), 5], reward: { tools: 20 } },
  { text: 'Atteindre 70 habitants', check: (g) => [Math.floor(g.pop), 70], reward: { gold: 100 } },
  { text: 'Passer à l\'ère du Bourg', check: (g) => [g.era, 2], reward: { gold: 150 } },
  { text: 'Construire une taverne et une école', check: (g, h) => [Math.min(h.count('tavern'), 1) + Math.min(h.count('school'), 1), 2], reward: { gold: 120 } },
  { text: 'Avoir 5 villas', check: (g, h) => [h.housesAtLeast(4), 5], reward: { tools: 40 } },
  { text: 'Passer à l\'ère de la Ville', check: (g) => [g.era, 3], reward: { gold: 300 } },
  { text: 'Construire un hôtel des monnaies', check: (g, h) => [h.count('mint'), 1], reward: { iron: 50 } },
  { text: 'Atteindre 300 habitants', check: (g) => [Math.floor(g.pop), 300], reward: { gold: 600 } },
  { text: 'Avoir 20 villas', check: (g, h) => [h.housesAtLeast(4), 20], reward: { tools: 100 } },
  { text: 'Passer à l\'ère de la Cité', check: (g) => [g.era, 4], reward: { gold: 500 } },
  { text: 'Bâtir la Grande Cathédrale', check: (g, h) => [h.count('wonder'), 1], reward: { gold: 1000 } },
];
