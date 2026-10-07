// Données et réglages du jeu. Tout l'équilibrage se fait ici.
import { EN } from './i18n.js';
import en from './lang-en.js';

export const TW = 64;            // largeur d'une case isométrique (pixels monde)
export const TH = 32;            // hauteur d'une case isométrique
export const MAP = 120;          // la carte fait MAP × MAP cases (archipel)

export const DAY_MS = 5000;      // durée d'un jour à vitesse ×1
export const DAYS_PER_SEASON = 30;
export const SEASONS = [
  { name: 'Printemps', icon: 'flower' },
  { name: 'Été', icon: 'sun' },
  { name: 'Automne', icon: 'leaf' },
  { name: 'Hiver', icon: 'snowflake' },
];

export const T = { GRASS: 0, FOREST: 1, ROCK: 2, WATER: 3, MOUNTAIN: 4, FERTILE: 5, SAND: 6, SPICE: 7, GOLD: 8 };
export const TERRAIN = [
  { name: 'Prairie', build: true },
  { name: 'Forêt', build: false },
  { name: 'Rochers', build: false },
  { name: 'Eau', build: false },
  { name: 'Montagne', build: false },
  { name: 'Terre fertile', build: true, hint: 'Fermes et vignobles y produisent +50 %.' },
  { name: 'Sable', build: true },
  { name: 'Sol tropical', build: true, hint: 'Seul endroit où cultiver des épices.' },
  { name: 'Filon d\'or', build: false, hint: 'Une mine d\'or doit le toucher.' },
];
// Défricher une case : coût et ce qu'on récupère.
export const CLEAR = {
  [T.FOREST]: { cost: { gold: 5 }, gain: { wood: 5 } },
  [T.ROCK]: { cost: { gold: 15 }, gain: { stone: 5 } },
};

// ---------- Marchandises ----------
// price : prix de base au commerce, en or.
export const GOODS = {
  wood: { name: 'Bois', icon: 'tree-pine', price: 1, color: '#a0703f' },
  planks: { name: 'Planches', icon: 'layers', price: 2.5, color: '#d2a265' },
  stone: { name: 'Pierre', icon: 'mountain', price: 1.5, color: '#a8a39a' },
  fish: { name: 'Poisson', icon: 'fish', price: 1.5, color: '#6aa7d8' },
  wheat: { name: 'Blé', icon: 'wheat', price: 1, color: '#e2c35b' },
  flour: { name: 'Farine', icon: 'package', price: 1.5, color: '#efe6d2' },
  bread: { name: 'Pain', icon: 'croissant', price: 3, color: '#d79a4a' },
  wool: { name: 'Laine', icon: 'cloud', price: 1.5, color: '#e9e4da' },
  cloth: { name: 'Tissu', icon: 'shirt', price: 4, color: '#8f6bb5' },
  beer: { name: 'Bière', icon: 'beer', price: 4, color: '#e0a336' },
  ore: { name: 'Minerai', icon: 'pickaxe', price: 2, color: '#8a6f62' },
  coal: { name: 'Charbon', icon: 'flame-kindling', price: 2, color: '#4a4744' },
  iron: { name: 'Fer', icon: 'cuboid', price: 4, color: '#9aa4ad' },
  tools: { name: 'Outils', icon: 'hammer', price: 7, color: '#c7cdd3' },
  grapes: { name: 'Raisin', icon: 'grape', price: 1.5, color: '#8a4fa0' },
  wine: { name: 'Vin', icon: 'wine', price: 6, color: '#a3324a' },
  spices: { name: 'Épices', icon: 'sparkle', price: 8, color: '#d9622b' },
  nugget: { name: 'Pépites d\'or', icon: 'gem', price: 6, color: '#e9c46a' },
  jewels: { name: 'Bijoux', icon: 'medal', price: 16, color: '#7fd1c8' },
};
export const GOOD_KEYS = Object.keys(GOODS);
export const GOLD = { name: 'Or', icon: 'coins', color: '#f2c94c' };
// Matériaux affichés en permanence dans la barre du haut.
export const BAR_GOODS = ['wood', 'planks', 'stone', 'tools'];

export const START = {
  goods: { wood: 100, planks: 20, fish: 40 },
  gold: 500,
};
export const BASE_STORAGE = 100;      // par marchandise
export const STORAGE_PER_ERA = 50;
export const WORKFORCE = 0.5;         // part des habitants qui travaillent
export const ROAD_COST = { wood: 1 };
export const FILL_COST = { stone: 20, gold: 80 };   // remblayer une case d'eau au bord de la côte

// ---------- Classes d'habitants ----------
// Une maison de niveau N abrite la classe N. needs : ce qu'il faut pour être satisfaits.
// Un besoin est soit une marchandise consommée (rate par habitant et par jour),
// soit un service (bâtiment à proximité), soit la beauté du quartier.
export const CLASSES = [
  {
    id: 'peasant', name: 'Paysans', one: 'paysan', house: 'Chaumière', cap: 6, tax: 0.08, color: '#8fbf5a',
    needs: [
      { food: true, rate: 0.05, label: 'Nourriture (poisson ou pain)' },
      { service: 'well', label: 'Eau (puits)' },
      { service: 'market', label: 'Marché' },
    ],
  },
  {
    id: 'artisan', name: 'Artisans', one: 'artisan', house: 'Maison', cap: 10, tax: 0.15, color: '#e0a14a',
    upgrade: { planks: 3, gold: 25 },
    needs: [
      { good: 'bread', rate: 0.05 },
      { good: 'cloth', rate: 0.03 },
      { service: 'well', label: 'Eau (puits)' },
      { service: 'market', label: 'Marché' },
      { service: 'chapel', label: 'Chapelle' },
    ],
  },
  {
    id: 'burgher', name: 'Bourgeois', one: 'bourgeois', house: 'Maison bourgeoise', cap: 14, tax: 0.26, color: '#6aa7e8',
    upgrade: { planks: 4, stone: 6, gold: 80 },
    needs: [
      { good: 'bread', rate: 0.06 },
      { good: 'cloth', rate: 0.04 },
      { good: 'beer', rate: 0.04 },
      { good: 'tools', rate: 0.006 },
      { service: 'market', label: 'Marché' },
      { service: 'chapel', label: 'Chapelle' },
      { service: 'tavern', label: 'Taverne' },
      { service: 'school', label: 'École' },
      { service: 'health', label: 'Médecin' },
      { service: 'police', label: 'Sécurité (poste de garde)' },
      { decor: 2, label: 'Beauté du quartier ≥ 2' },
    ],
  },
  {
    id: 'noble', name: 'Nobles', one: 'noble', house: 'Hôtel particulier', cap: 18, tax: 0.45, color: '#c58be0',
    upgrade: { stone: 10, tools: 4, gold: 200 },
    needs: [
      { good: 'bread', rate: 0.07 },
      { good: 'cloth', rate: 0.05 },
      { good: 'beer', rate: 0.03 },
      { good: 'wine', rate: 0.04 },
      { good: 'tools', rate: 0.01 },
      { good: 'spices', rate: 0.03 },
      { good: 'jewels', rate: 0.012 },
      { service: 'market', label: 'Marché' },
      { service: 'chapel', label: 'Chapelle' },
      { service: 'tavern', label: 'Taverne' },
      { service: 'school', label: 'École' },
      { service: 'health', label: 'Médecin' },
      { service: 'police', label: 'Sécurité (poste de garde)' },
      { decor: 4, label: 'Beauté du quartier ≥ 4' },
    ],
  },
];

export const TAXES = [
  { name: 'Bas', mult: 0.6, sat: 0.1 },
  { name: 'Normal', mult: 1, sat: 0 },
  { name: 'Élevé', mult: 1.5, sat: -0.15 },
];

// ---------- Ères ----------
// need : [classe, nombre d'habitants de cette classe]
export const ERAS = [
  { name: 'Hameau' },
  { name: 'Village', need: [0, 150], cost: { planks: 80, gold: 800 } },
  { name: 'Bourg', need: [1, 300], cost: { planks: 160, stone: 120, gold: 2500 } },
  { name: 'Ville', need: [2, 350], cost: { stone: 300, tools: 80, gold: 6000 } },
  { name: 'Cité', need: [3, 350], cost: { stone: 500, tools: 160, gold: 12000 } },
  // Après la Grande Cathédrale : une très grande cité, pour qui veut continuer à bâtir.
  { name: 'Capitale', need: [3, 1000], cost: { stone: 800, tools: 150, gold: 30000 }, after: 'wonder' },
];

export const CATEGORIES = [
  { id: 'tools', name: 'Outils', icon: 'route' },
  { id: 'house', name: 'Habitat', icon: 'house' },
  { id: 'raw', name: 'Ressources', icon: 'trees' },
  { id: 'industry', name: 'Ateliers', icon: 'factory' },
  { id: 'service', name: 'Services', icon: 'landmark' },
  { id: 'deco', name: 'Beauté', icon: 'flower-2' },
];

export const TOOLS = [
  { id: 'inspect', name: 'Inspecter', icon: 'mouse-pointer-2', desc: 'Touchez un bâtiment pour voir ses détails.' },
  { id: 'road', name: 'Route', icon: 'route', desc: 'Glissez pour tracer une route. Tout bâtiment doit être relié à l\'hôtel de ville.', cost: ROAD_COST },
  { id: 'clear', name: 'Défricher', icon: 'axe', desc: 'Glissez sur une zone pour retirer forêts (5 or) et rochers (15 or).' },
  { id: 'demolish', name: 'Démolir', icon: 'trash-2', desc: 'Glissez sur une zone pour détruire routes et bâtiments (50 % remboursé).' },
  { id: 'fill', name: 'Remblayer', icon: 'shovel', era: 3, cost: FILL_COST, desc: 'Glissez le long de la côte pour gagner du terrain sur la mer. Impossible de relier deux îles.' },
];

// ---------- Bâtiments ----------
// cat : catégorie de la barre d'outils. era : ère de déblocage.
// workers : [classe, nombre]. produces / consumes : par jour à plein régime.
// near : terrain qui doit toucher le bâtiment. service : { type, r }. decor : { v, r }.
// upkeep : or par jour. fire : risque d'incendie (1 = normal). look : style de dessin.
export const BUILDINGS = {
  townhall: {
    name: 'Hôtel de ville', size: 2, buildable: false, service: { type: 'market', r: 6 }, storage: 0,
    desc: 'Le cœur de la cité : les routes partent d\'ici. Sert aussi de petit marché.',
    look: 'townhall', fire: 0,
  },
  house: {
    name: 'Habitation', cat: 'house', era: 0, size: 1, cost: { wood: 6, gold: 10 }, fire: 1,
    desc: 'Accueille des paysans. Évolue d\'elle-même quand ses habitants sont satisfaits et que l\'ère le permet.',
    look: 'house',
  },
  // --- Ressources ---
  lumber: {
    name: 'Bûcheron', cat: 'raw', era: 0, size: 1, cost: { wood: 8, gold: 20 }, workers: [0, 2],
    produces: { wood: 3 }, near: T.FOREST, upkeep: 0.3,
    desc: 'Doit toucher une forêt.', look: 'lumber', wall: '#9a7247', roof: '#5c3d22', h: 12,
  },
  fisher: {
    name: 'Pêcheur', cat: 'raw', era: 0, size: 1, cost: { wood: 10, gold: 20 }, workers: [0, 2],
    produces: { fish: 2.5 }, near: T.WATER, seasonal: [1, 1, 1, 0.6], upkeep: 0.3,
    desc: 'Doit toucher l\'eau. Pêche réduite en hiver.', look: 'fisher', wall: '#a7855a', roof: '#4f7aa0', h: 11,
  },
  quarry: {
    name: 'Carrière', cat: 'raw', era: 0, size: 1, cost: { wood: 15, gold: 30 }, workers: [0, 3],
    produces: { stone: 2 }, near: T.ROCK, upkeep: 0.4,
    desc: 'Doit toucher des rochers.', look: 'quarry', wall: '#a8a49c', roof: '#6d6a64', h: 11,
  },
  farm: {
    name: 'Ferme céréalière', cat: 'raw', era: 1, size: 2, cost: { wood: 20, planks: 6, gold: 60 }, workers: [0, 3],
    produces: { wheat: 4 }, fertile: 1.5, seasonal: [1, 1.2, 1.5, 0.35], upkeep: 0.5,
    desc: '+50 % sur terre fertile. Presque rien en hiver, grosse récolte en automne.',
    look: 'farm', wall: '#c9a46b', roof: '#9c3b2a', h: 14,
  },
  sheep: {
    name: 'Bergerie', cat: 'raw', era: 1, size: 2, cost: { wood: 15, planks: 6, gold: 50 }, workers: [0, 2],
    produces: { wool: 3 }, upkeep: 0.4, seasonal: [1.2, 1, 1, 0.7],
    desc: 'Élève des moutons pour leur laine.', look: 'sheep', wall: '#b08a5a', roof: '#5f4a32', h: 11,
  },
  charcoal: {
    name: 'Charbonnier', cat: 'raw', era: 1, size: 1, cost: { wood: 15, gold: 40 }, workers: [0, 2],
    consumes: { wood: 2 }, produces: { coal: 2 }, upkeep: 0.4, fire: 3,
    desc: 'Transforme le bois en charbon. Risque d\'incendie élevé.', look: 'charcoal', wall: '#7a6450', roof: '#3d3128', h: 10,
  },
  mine: {
    name: 'Mine de fer', cat: 'raw', era: 2, size: 1, cost: { planks: 15, stone: 10, gold: 120 }, workers: [1, 3],
    produces: { ore: 2 }, near: T.MOUNTAIN, upkeep: 1,
    desc: 'Doit toucher une montagne.', look: 'mine', wall: '#6f6559', roof: '#3d3630', h: 12,
  },
  vineyard: {
    name: 'Vignoble', cat: 'raw', era: 3, size: 2, cost: { wood: 20, planks: 10, gold: 150 }, workers: [0, 3],
    produces: { grapes: 3 }, fertile: 1.5, seasonal: [0.6, 1, 1.9, 0.1], upkeep: 0.8,
    desc: '+50 % sur terre fertile. Vendanges en automne.', look: 'vineyard', wall: '#c9b08a', roof: '#7a3b4a', h: 12,
  },
  spicefarm: {
    name: 'Plantation d\'épices', cat: 'raw', era: 3, tech: 'colonial', size: 2, cost: { wood: 20, planks: 15, gold: 300 }, workers: [0, 3],
    produces: { spices: 3 }, on: T.SPICE, seasonal: [1, 1.1, 1, 0.8], upkeep: 1,
    desc: 'Uniquement sur sol tropical (île aux épices).', look: 'spicefarm', wall: '#d8b98a', roof: '#a2502a', h: 12,
  },
  goldmine: {
    name: 'Mine d\'or', cat: 'raw', era: 3, tech: 'colonial', size: 1, cost: { planks: 20, stone: 20, gold: 400 }, workers: [1, 3],
    produces: { nugget: 1.5 }, near: T.GOLD, upkeep: 1.5,
    desc: 'Doit toucher un filon d\'or (île aux filons).', look: 'mine', wall: '#8a7a55', roof: '#4a3f2a', h: 12,
  },
  // --- Ateliers ---
  sawmill: {
    name: 'Scierie', cat: 'industry', era: 0, size: 1, cost: { wood: 15, gold: 40 }, workers: [0, 2],
    consumes: { wood: 2.5 }, produces: { planks: 2.5 }, upkeep: 0.5,
    desc: 'Débite le bois en planches.', look: 'sawmill', wall: '#b08455', roof: '#6b4a2c', h: 13,
  },
  warehouse: {
    name: 'Entrepôt', cat: 'industry', era: 0, size: 2, cost: { wood: 20, planks: 10, gold: 50 }, storage: 100, upkeep: 0.3,
    desc: '+100 de stockage pour chaque marchandise.', look: 'warehouse', wall: '#a77b52', roof: '#6a4a2f', h: 18,
  },
  mill: {
    name: 'Moulin', cat: 'industry', era: 1, size: 1, cost: { planks: 15, stone: 6, gold: 80 }, workers: [1, 2],
    consumes: { wheat: 4 }, produces: { flour: 4 }, upkeep: 1,
    desc: 'Moud le blé en farine.', look: 'mill', wall: '#e2d6bd', roof: '#7a4a2a', h: 20,
  },
  bakery: {
    name: 'Boulangerie', cat: 'industry', era: 1, size: 1, cost: { planks: 10, stone: 8, gold: 80 }, workers: [1, 2],
    consumes: { flour: 4 }, produces: { bread: 4 }, upkeep: 1, fire: 3,
    desc: 'Cuit la farine en pain. Risque d\'incendie élevé.', look: 'bakery', wall: '#e4cfa6', roof: '#a8432e', h: 15,
  },
  weaver: {
    name: 'Tisserand', cat: 'industry', era: 1, size: 1, cost: { planks: 12, gold: 80 }, workers: [1, 2],
    consumes: { wool: 3 }, produces: { cloth: 3 }, upkeep: 1,
    desc: 'Tisse la laine en tissu.', look: 'weaver', wall: '#d8c7e4', roof: '#5b4a7a', h: 15,
  },
  brewery: {
    name: 'Brasserie', cat: 'industry', era: 2, size: 1, cost: { planks: 15, stone: 15, gold: 120 }, workers: [1, 2],
    consumes: { wheat: 3 }, produces: { beer: 3 }, upkeep: 1.2,
    desc: 'Brasse le blé en bière.', look: 'brewery', wall: '#c99a62', roof: '#6b3a24', h: 16,
  },
  smelter: {
    name: 'Fonderie', cat: 'industry', era: 2, size: 1, cost: { planks: 10, stone: 25, gold: 150 }, workers: [1, 3],
    consumes: { ore: 2, coal: 2 }, produces: { iron: 2 }, upkeep: 1.5, fire: 3,
    desc: 'Fond minerai et charbon en fer. Risque d\'incendie élevé.', look: 'smelter', wall: '#8a7d70', roof: '#3c3530', h: 15,
  },
  forge: {
    name: 'Forge', cat: 'industry', era: 2, size: 1, cost: { planks: 10, stone: 20, gold: 150 }, workers: [1, 2],
    consumes: { iron: 2 }, produces: { tools: 2 }, upkeep: 1.2, fire: 2,
    desc: 'Forge le fer en outils.', look: 'forge', wall: '#7d6f62', roof: '#3c3530', h: 15,
  },
  winepress: {
    name: 'Pressoir', cat: 'industry', era: 3, size: 1, cost: { planks: 20, stone: 20, gold: 250 }, workers: [2, 2],
    consumes: { grapes: 3 }, produces: { wine: 3 }, upkeep: 2,
    desc: 'Presse le raisin en vin.', look: 'winepress', wall: '#e3d3b8', roof: '#7a3b4a', h: 16,
  },
  jeweler: {
    name: 'Orfèvre', cat: 'industry', era: 3, tech: 'goldsmith', size: 1, cost: { stone: 30, tools: 10, gold: 500 }, workers: [2, 2],
    consumes: { nugget: 1.5, tools: 0.3 }, produces: { jewels: 1.5 }, upkeep: 2,
    desc: 'Travaille les pépites d\'or en bijoux.', look: 'jeweler', wall: '#efe6d6', roof: '#2f5c6b', h: 16,
  },
  mint: {
    name: 'Hôtel des monnaies', cat: 'industry', era: 3, size: 2, cost: { stone: 80, tools: 20, gold: 600 }, workers: [2, 4],
    consumes: { iron: 1 }, produces: { gold: 10 },
    desc: 'Frappe 10 or par jour avec 1 fer.', look: 'mint', wall: '#e9dfc4', roof: '#b08a2e', h: 22,
  },
  // --- Services ---
  well: {
    name: 'Puits', cat: 'service', era: 0, size: 1, cost: { wood: 5, gold: 15 }, service: { type: 'well', r: 4 }, fire: 0,
    desc: 'Donne l\'eau aux maisons à 4 cases ou moins et aide à combattre le feu.', look: 'well',
  },
  firestation: {
    name: 'Poste d\'incendie', cat: 'service', era: 0, size: 1, cost: { wood: 10, planks: 4, gold: 40 }, workers: [0, 2],
    service: { type: 'fire', r: 6 }, upkeep: 0.5, fire: 0,
    desc: 'Empêche les départs de feu à 6 cases ou moins et éteint vite les incendies.', look: 'firehouse', wall: '#b9473a', roof: '#5b2b25', h: 16,
  },
  market: {
    name: 'Place du marché', cat: 'service', era: 1, size: 2, cost: { wood: 20, planks: 10, gold: 80 }, workers: [0, 2],
    service: { type: 'market', r: 7 }, upkeep: 0.6,
    desc: 'Approvisionne les maisons à 7 cases ou moins.', look: 'market',
  },
  chapel: {
    name: 'Chapelle', cat: 'service', era: 1, size: 1, cost: { planks: 15, stone: 20, gold: 120 }, workers: [1, 1],
    service: { type: 'chapel', r: 7 }, upkeep: 1,
    desc: 'Culte pour les maisons à 7 cases ou moins.', look: 'chapel', wall: '#eee6d6', roof: '#5a5f6e', h: 20,
  },
  tavern: {
    name: 'Taverne', cat: 'service', era: 2, size: 1, cost: { planks: 15, stone: 15, gold: 150 }, workers: [1, 2],
    service: { type: 'tavern', r: 6 }, upkeep: 1.2, fire: 2,
    desc: 'Divertit les maisons à 6 cases ou moins.', look: 'tavern', wall: '#c99a62', roof: '#7a2f2a', h: 18,
  },
  school: {
    name: 'École', cat: 'service', era: 2, size: 1, cost: { planks: 20, stone: 25, tools: 5, gold: 200 }, workers: [1, 2],
    service: { type: 'school', r: 7 }, upkeep: 1.5,
    desc: 'Instruit les maisons à 7 cases ou moins.', look: 'school', wall: '#d9c39a', roof: '#3e6a8a', h: 18,
  },
  tower: {
    name: 'Tour de guet', cat: 'service', era: 2, size: 1, cost: { planks: 5, stone: 30, gold: 100 }, workers: [1, 2],
    service: { type: 'guard', r: 9 }, upkeep: 1, fire: 0,
    desc: 'Protège des bandits si elle couvre l\'hôtel de ville (9 cases).', look: 'tower', wall: '#9d978c', roof: '#59463a', h: 40,
  },
  port: {
    name: 'Port', cat: 'service', era: 2, tech: 'navigation', size: 2, cost: { planks: 60, stone: 40, tools: 10, gold: 800 }, workers: [1, 3],
    near: T.WATER, upkeep: 2, fire: 0.5, storage: 50,
    desc: 'Relie les îles par bateau. Un port sur l\'île principale et un port sur une autre île forment une colonie : ses routes partent de son port.',
    look: 'port', wall: '#a77b52', roof: '#2f5c6b', h: 14,
  },
  trading: {
    name: 'Comptoir', cat: 'service', era: 2, size: 2, cost: { planks: 30, stone: 20, gold: 300 }, workers: [1, 3],
    upkeep: 2,
    desc: 'Meilleurs prix au commerce et caravanes plus fréquentes.', look: 'trading', wall: '#b88a5a', roof: '#2f5c6b', h: 18,
  },
  wonder: {
    name: 'Grande Cathédrale', cat: 'service', era: 4, size: 3, unique: true, buildDays: 250, fire: 0,
    cost: { planks: 200, stone: 400, tools: 80, gold: 6000 },
    buildUse: { stone: 4, planks: 2, tools: 1 },
    service: { type: 'chapel', r: 14 }, decor: { v: 5, r: 7 },
    desc: 'La merveille de votre cité : 250 jours de chantier qui consomment chaque jour 4 pierre, 2 planches et 1 outil (le chantier s\'arrête s\'ils manquent). L\'achever, c\'est gagner la partie.', look: 'wonder',
  },
  // --- Grands monuments (après la Grande Cathédrale) ---
  // after : bâtiment à achever d'abord. effect : bonus pour toute la cité une fois le chantier fini.
  royalgarden: {
    name: 'Jardins royaux', cat: 'deco', era: 4, after: 'wonder', size: 3, unique: true, monument: true, buildDays: 120, fire: 0,
    cost: { wood: 150, stone: 250, gold: 8000 }, buildUse: { stone: 2, planks: 1 },
    decor: { v: 6, r: 9 }, effect: { sat: 0.03 },
    desc: 'Grand monument : 120 jours de chantier (2 pierre et 1 planche par jour). Beauté +6 sur 9 cases et satisfaction de toute la cité +3 %.', look: 'royalgarden',
  },
  arena: {
    name: 'Arènes', cat: 'service', era: 4, after: 'wonder', size: 3, unique: true, monument: true, buildDays: 180, fire: 0,
    cost: { stone: 450, tools: 60, gold: 12000 }, buildUse: { stone: 4, tools: 1 },
    service: { type: 'tavern', r: 16 }, effect: { sat: 0.05 },
    desc: 'Grand monument : 180 jours de chantier (4 pierre et 1 outil par jour). Divertit les maisons à 16 cases et satisfaction de toute la cité +5 %.', look: 'arena',
  },
  lighthouse: {
    name: 'Grand phare', cat: 'service', era: 4, after: 'wonder', size: 2, unique: true, monument: true, buildDays: 150, fire: 0,
    cost: { stone: 300, tools: 45, gold: 9000 }, buildUse: { stone: 3, planks: 1 }, near: T.WATER,
    effect: { trade: 1.2 },
    desc: 'Grand monument au bord de l\'eau : 150 jours de chantier (3 pierre et 1 planche par jour). Les marchands affluent : achats 20 % moins chers, ventes 20 % plus chères.', look: 'lighthouse',
  },
  palace: {
    name: 'Palais royal', cat: 'service', era: 5, size: 3, unique: true, monument: true, buildDays: 300, fire: 0,
    cost: { stone: 750, tools: 150, gold: 30000 }, buildUse: { stone: 5, tools: 2 },
    decor: { v: 5, r: 8 }, effect: { tax: 1.25 },
    desc: 'Le plus grand des monuments : 300 jours de chantier (5 pierre et 2 outils par jour). Impôts de toute la cité +25 % et beauté +5 sur 8 cases.', look: 'palace',
  },
  library: {
    name: 'Bibliothèque', cat: 'service', era: 0, size: 1, cost: { wood: 20, planks: 10, gold: 80 }, workers: [0, 2],
    produces: { research: 1 }, upkeep: 0.6,
    desc: 'Des lettrés y étudient : +1 point de recherche par jour.', look: 'library', wall: '#d9c7a4', roof: '#4b5f4a', h: 17,
  },
  university: {
    name: 'Université', cat: 'service', era: 2, size: 2, cost: { planks: 40, stone: 60, tools: 10, gold: 600 }, workers: [2, 3],
    produces: { research: 4 }, upkeep: 3,
    desc: '+4 points de recherche par jour.', look: 'university', wall: '#e8dcc4', roof: '#7a2f2a', h: 24,
  },
  doctor: {
    name: 'Médecin', cat: 'service', era: 1, tech: 'medicine', size: 1, cost: { planks: 10, stone: 10, gold: 120 }, workers: [1, 1],
    service: { type: 'health', r: 7 }, upkeep: 1,
    desc: 'Soigne les maisons à 7 cases ou moins et les protège des épidémies.', look: 'doctor', wall: '#eef0ea', roof: '#3f7a6a', h: 16,
  },
  hospital: {
    name: 'Hôpital', cat: 'service', era: 3, tech: 'surgery', size: 2, cost: { stone: 80, tools: 15, gold: 800 }, workers: [2, 3],
    service: { type: 'health', r: 12 }, upkeep: 3,
    desc: 'Soigne les maisons à 12 cases ou moins.', look: 'hospital', wall: '#f1efe8', roof: '#3f6f8a', h: 22,
  },
  guardpost: {
    name: 'Poste de garde', cat: 'service', era: 1, tech: 'militia', size: 1, cost: { planks: 10, stone: 15, gold: 100 }, workers: [1, 2],
    service: { type: 'police', r: 7 }, upkeep: 1, fire: 0,
    desc: 'Assure la sécurité des maisons à 7 cases ou moins et limite les vols.', look: 'guardpost', wall: '#a49a8a', roof: '#3d4a6a', h: 18,
  },
  // --- Beauté ---
  garden: {
    name: 'Jardin', cat: 'deco', era: 0, size: 1, cost: { wood: 4, gold: 15 }, decor: { v: 1, r: 3 }, upkeep: 0.1, fire: 0,
    desc: 'Beauté +1 pour les maisons à 3 cases ou moins.', look: 'garden',
  },
  fountain: {
    name: 'Fontaine', cat: 'deco', era: 2, size: 1, cost: { stone: 20, gold: 80 }, decor: { v: 2, r: 4 },
    service: { type: 'well', r: 4 }, upkeep: 0.3, fire: 0,
    desc: 'Beauté +2 (4 cases) et donne l\'eau comme un puits.', look: 'fountain',
  },
  statue: {
    name: 'Statue', cat: 'deco', era: 3, size: 1, cost: { stone: 40, gold: 300 }, decor: { v: 3, r: 5 }, upkeep: 0.5, fire: 0,
    desc: 'Beauté +3 pour les maisons à 5 cases ou moins.', look: 'statue',
  },
  park: {
    name: 'Parc', cat: 'deco', era: 3, size: 2, cost: { wood: 10, gold: 250 }, decor: { v: 3, r: 5 }, upkeep: 0.5, fire: 0,
    desc: 'Beauté +3 pour les maisons à 5 cases ou moins.', look: 'park',
  },
  ruins: {
    name: 'Ruines', size: 1, buildable: false, fire: 0,
    desc: 'Les restes d\'un bâtiment incendié. Démolissez-les pour libérer la place.', look: 'ruins',
  },
};

// Priorité des ouvriers : d'abord la nourriture et l'eau, puis le reste.
export const WORK_PRIORITY = ['fisher', 'farm', 'mill', 'bakery', 'firestation', 'market', 'lumber', 'sawmill'];

// ---------- Incendies ----------
export const FIRE = {
  startDay: 40,          // pas d'incendie avant ce jour
  baseRisk: 0.0012,      // probabilité par jour pour un bâtiment de risque 1
  wellFactor: 0.5,       // risque réduit près d'un puits
  spreadChance: 0.22,    // chance par jour de se propager à chaque voisin
  burnDays: 10,          // jours avant destruction
  stationDays: 2,        // jours pour que les pompiers éteignent
  bucketCost: 15,        // chaîne de seaux (près d'un puits)
};

// ---------- Catastrophes naturelles ----------
// chance : probabilité par jour (saisons et ère permises), multipliée par la difficulté.
// warn : jours d'alerte avant l'arrivée. days : durée [min, max].
export const WEATHER = {
  calmDays: 150,          // aucune catastrophe pendant les premiers jours de la partie
  tornado: { minEra: 1, seasons: [0, 1], chance: 0.006, warn: 3, speed: 12, radius: 1.6, destroy: 0.55 },
  storm: { minEra: 1, seasons: [2, 3], chance: 0.008, warn: 2, days: [6, 10] },
  heat: { minEra: 1, seasons: [1], chance: 0.01, warn: 1, days: [12, 18], fire: 3, crops: 0.7 },
};

// ---------- Recherche ----------
// Les technologies s'achètent avec des points de recherche (bibliothèques, universités).
// effect : prod (multiplicateur par bâtiment), range (+cases de portée par service), fireHouse, storage,
// upkeep, tax, sat, research, wonderTime. Les bâtiments avec « tech » sont débloqués par la technologie.
export const TECHS = [
  { id: 'axes', name: 'Haches affûtées', era: 0, cost: 40, icon: 'axe', desc: 'Bûcherons +25 %.', effect: { prod: { lumber: 1.25 } } },
  { id: 'nets', name: 'Grands filets', era: 0, cost: 50, icon: 'fish', desc: 'Pêcheurs +25 %.', effect: { prod: { fisher: 1.25 } } },
  { id: 'masonry', name: 'Maçonnerie', era: 0, cost: 75, icon: 'brick-wall', desc: 'Risque d\'incendie des maisons −40 %.', effect: { fireHouse: 0.6 } },
  { id: 'accounting', name: 'Comptabilité', era: 0, cost: 90, icon: 'receipt', desc: 'Stockage +50 par marchandise.', effect: { storage: 50 } },
  { id: 'plough', name: 'Charrue lourde', era: 1, cost: 180, icon: 'wheat', req: ['axes'], desc: 'Fermes céréalières +25 %.', effect: { prod: { farm: 1.25 } } },
  { id: 'watermill', name: 'Meunerie', era: 1, cost: 225, icon: 'cog', req: ['plough'], desc: 'Moulins et boulangeries +20 %.', effect: { prod: { mill: 1.2, bakery: 1.2 } } },
  { id: 'loom', name: 'Métier à tisser', era: 1, cost: 240, icon: 'shirt', desc: 'Bergeries et tisserands +25 %.', effect: { prod: { sheep: 1.25, weaver: 1.25 } } },
  { id: 'medicine', name: 'Médecine', era: 1, cost: 210, icon: 'stethoscope', desc: 'Débloque le médecin.', effect: {} },
  { id: 'militia', name: 'Milice', era: 1, cost: 195, icon: 'shield-check', desc: 'Débloque le poste de garde.', effect: {} },
  { id: 'firepump', name: 'Pompe à incendie', era: 1, cost: 270, icon: 'droplets', req: ['masonry'], desc: 'Portée des postes d\'incendie +2.', effect: { range: { fire: 2 } } },
  { id: 'administration', name: 'Administration', era: 2, cost: 450, icon: 'landmark', req: ['accounting'], desc: 'Entretien des bâtiments −15 %.', effect: { upkeep: 0.85 } },
  { id: 'hops', name: 'Houblon', era: 2, cost: 420, icon: 'beer', desc: 'Brasseries +30 %.', effect: { prod: { brewery: 1.3 } } },
  { id: 'blast', name: 'Haut fourneau', era: 2, cost: 570, icon: 'flame-kindling', desc: 'Charbonniers, fonderies et forges +25 %.', effect: { prod: { charcoal: 1.25, smelter: 1.25, forge: 1.25 } } },
  { id: 'cadastre', name: 'Cadastre', era: 2, cost: 600, icon: 'map', req: ['administration'], desc: 'Impôts +10 %.', effect: { tax: 1.1 } },
  { id: 'hygiene', name: 'Hygiène', era: 2, cost: 630, icon: 'droplets', req: ['medicine'], desc: 'Satisfaction de tous les habitants +5 %.', effect: { sat: 0.05 } },
  { id: 'weather', name: 'Météorologie', era: 2, cost: 450, icon: 'cloud-lightning', desc: 'Alertes deux jours plus tôt, dégâts des tornades −50 % et tempêtes plus courtes.', effect: { weather: 0.5 } },
  { id: 'navigation', name: 'Navigation', era: 2, cost: 750, icon: 'compass', desc: 'Débloque le port et la colonisation des îles voisines.', effect: {} },
  { id: 'printing', name: 'Imprimerie', era: 3, cost: 1050, icon: 'book-open', req: ['hygiene'], desc: 'Recherche +30 % et portée des écoles +2.', effect: { research: 1.3, range: { school: 2 } } },
  { id: 'surgery', name: 'Chirurgie', era: 3, cost: 1125, icon: 'heart-pulse', req: ['medicine'], desc: 'Débloque l\'hôpital.', effect: {} },
  { id: 'vines', name: 'Taille de la vigne', era: 3, cost: 975, icon: 'grape', desc: 'Vignobles et pressoirs +25 %.', effect: { prod: { vineyard: 1.25, winepress: 1.25 } } },
  { id: 'colonial', name: 'Commerce colonial', era: 3, cost: 1350, icon: 'ship', req: ['navigation'], desc: 'Débloque plantations d\'épices et mines d\'or sur les îles.', effect: {} },
  { id: 'goldsmith', name: 'Orfèvrerie', era: 3, cost: 1500, icon: 'gem', req: ['colonial'], desc: 'Débloque l\'orfèvre (bijoux).', effect: {} },
  { id: 'banking', name: 'Banque', era: 4, cost: 2250, icon: 'coins', req: ['cadastre'], desc: 'Impôts +15 %.', effect: { tax: 1.15 } },
  { id: 'architecture', name: 'Architecture', era: 4, cost: 2700, icon: 'castle', desc: 'Chantier de la Grande Cathédrale −35 %.', effect: { wonderTime: 0.65 } },
  { id: 'astronomy', name: 'Astronomie', era: 4, cost: 3600, icon: 'star', req: ['printing'], desc: 'Satisfaction +5 % et recherche +30 %.', effect: { sat: 0.05, research: 1.3 } },
];

// ---------- Objectifs guidés ----------
// check(g, h) renvoie [actuel, objectif].
export const QUESTS = [
  { text: 'Construire 4 habitations le long des routes', check: (g, h) => [h.count('house'), 4], reward: { wood: 20, gold: 50 } },
  { text: 'Construire un pêcheur au bord de l\'eau', check: (g, h) => [h.count('fisher'), 1], reward: { fish: 20 } },
  { text: 'Construire un bûcheron au bord d\'une forêt', check: (g, h) => [h.count('lumber'), 1], reward: { wood: 20 } },
  { text: 'Construire un puits près des maisons', check: (g, h) => [h.count('well'), 1], reward: { gold: 50 } },
  { text: 'Construire une scierie', check: (g, h) => [h.count('sawmill'), 1], reward: { planks: 10 } },
  { text: 'Atteindre 50 paysans', check: (g, h) => [h.cls(0), 50], reward: { gold: 150 } },
  { text: 'Construire un poste d\'incendie', check: (g, h) => [h.count('firestation'), 1], reward: { planks: 10 } },
  { text: 'Atteindre 150 paysans', check: (g, h) => [h.cls(0), 150], reward: { gold: 300 } },
  { text: 'Passer à l\'ère du Village', check: (g) => [g.era, 1], reward: { planks: 20 } },
  { text: 'Produire du pain : ferme, moulin et boulangerie', check: (g, h) => [Math.min(1, h.count('farm')) + Math.min(1, h.count('mill')) + Math.min(1, h.count('bakery')), 3], reward: { bread: 20 } },
  { text: 'Produire du tissu : bergerie et tisserand', check: (g, h) => [Math.min(1, h.count('sheep')) + Math.min(1, h.count('weaver')), 2], reward: { cloth: 15 } },
  { text: 'Construire une chapelle et un marché', check: (g, h) => [Math.min(1, h.count('chapel')) + Math.min(1, h.count('market')), 2], reward: { gold: 200 } },
  { text: 'Atteindre 200 artisans', check: (g, h) => [h.cls(1), 200], reward: { gold: 500 } },
  { text: 'Passer à l\'ère du Bourg', check: (g) => [g.era, 2], reward: { gold: 300 } },
  { text: 'Produire des outils : mine, charbonnier, fonderie, forge', check: (g, h) => [['mine', 'charcoal', 'smelter', 'forge'].reduce((n, t) => n + Math.min(1, h.count(t)), 0), 4], reward: { tools: 15 } },
  { text: 'Construire une brasserie, une taverne et une école', check: (g, h) => [Math.min(1, h.count('brewery')) + Math.min(1, h.count('tavern')) + Math.min(1, h.count('school')), 3], reward: { gold: 400 } },
  { text: 'Atteindre 250 bourgeois', check: (g, h) => [h.cls(2), 250], reward: { tools: 40 } },
  { text: 'Passer à l\'ère de la Ville', check: (g) => [g.era, 3], reward: { gold: 800 } },
  { text: 'Produire du vin : vignoble et pressoir', check: (g, h) => [Math.min(1, h.count('vineyard')) + Math.min(1, h.count('winepress')), 2], reward: { wine: 20 } },
  { text: 'Construire un port sur l\'île principale', check: (g, h) => [h.homePorts(), 1], reward: { planks: 40 } },
  { text: 'Fonder une colonie : un port sur une autre île', check: (g, h) => [h.colonies(), 1], reward: { gold: 500 } },
  { text: 'Récolter des épices et des pépites d\'or', check: (g, h) => [Math.min(1, h.count('spicefarm')) + Math.min(1, h.count('goldmine')), 2], reward: { spices: 20 } },
  { text: 'Fabriquer des bijoux chez un orfèvre', check: (g, h) => [h.count('jeweler'), 1], reward: { jewels: 10 } },
  { text: 'Atteindre 250 nobles', check: (g, h) => [h.cls(3), 250], reward: { gold: 3000 } },
  { text: 'Passer à l\'ère de la Cité', check: (g) => [g.era, 4], reward: { gold: 2000 } },
  { text: 'Achever la Grande Cathédrale', check: (g, h) => [h.done('wonder'), 1], reward: { gold: 5000 } },
  { text: 'Achever les Jardins royaux', check: (g, h) => [h.done('royalgarden'), 1], reward: { gold: 3000 } },
  { text: 'Atteindre 5 000 habitants', check: (g, h) => [h.pop(), 5000], reward: { gold: 8000 } },
  { text: 'Achever le Grand phare', check: (g, h) => [h.done('lighthouse'), 1], reward: { gold: 4000 } },
  { text: 'Achever les Arènes', check: (g, h) => [h.done('arena'), 1], reward: { gold: 5000 } },
  { text: 'Atteindre 1 000 nobles', check: (g, h) => [h.cls(3), 1000], reward: { jewels: 60 } },
  { text: 'Passer à l\'ère de la Capitale', check: (g) => [g.era, 5], reward: { gold: 10000 } },
  { text: 'Achever le Palais royal', check: (g, h) => [h.done('palace'), 1], reward: { gold: 15000 } },
];

// ---------- Renommée ----------
// Paliers de population sans fin : chacun donne un titre à la cité et une récompense.
// Au-delà de la liste, un nouveau palier tous les RENOWN_STEP habitants.
export const RENOWN = [
  { pop: 3000, title: 'Cité prospère', reward: { gold: 5000 } },
  { pop: 5000, title: 'Grande cité', reward: { gold: 8000 } },
  { pop: 7500, title: 'Cité royale', reward: { gold: 12000 } },
  { pop: 10000, title: 'Joyau du royaume', reward: { gold: 16000 } },
  { pop: 13000, title: 'Capitale du royaume', reward: { gold: 20000 } },
  { pop: 17000, title: 'Métropole légendaire', reward: { gold: 25000 } },
];
export const RENOWN_STEP = 5000;

// ---------- Version anglaise : les textes de lang-en.js remplacent les textes français ----------
if (EN) {
  SEASONS.forEach((s, i) => { s.name = en.seasons[i]; });
  TERRAIN.forEach((t, i) => Object.assign(t, en.terrain[i]));
  for (const k of GOOD_KEYS) GOODS[k].name = en.goods[k];
  GOLD.name = en.gold;
  CLASSES.forEach((c, i) => {
    Object.assign(c, en.classes[i]);
    for (const n of c.needs) if (n.label) n.label = en.needs[n.label] ?? n.label;
  });
  TAXES.forEach((t, i) => { t.name = en.taxes[i]; });
  ERAS.forEach((e, i) => { e.name = en.eras[i]; });
  for (const c of CATEGORIES) c.name = en.categories[c.id];
  for (const t of TOOLS) Object.assign(t, en.tools[t.id]);
  for (const [id, b] of Object.entries(BUILDINGS)) Object.assign(b, en.buildings[id]);
  for (const t of TECHS) [t.name, t.desc] = en.techs[t.id];
  QUESTS.forEach((q, i) => { q.text = en.quests[i]; });
  RENOWN.forEach((r, i) => { r.title = en.renown[i]; });
}
