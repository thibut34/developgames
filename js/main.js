import { DAY_MS, BUILDINGS, TOOLS, ERAS, GOODS, CLASSES } from './config.js';
import {
  createGame, load, save, clearSave, step, place, placeRoadPath, roadPathCost, applyArea, buildingAt,
  upgradeHouse, togglePause, toggleLock, bucketBrigade, advanceEra, buy, sell, acceptOffer, eraLocked, research, lockReason,
  serialize, deserialize, def, costText, demolishBuilding, rebuild, population, resName,
} from './game.js';
import { P } from './iso.js';
import { createRenderer } from './render.js';
import { attachInput, clampCamera, zoomAt } from './input.js';
import { createUI } from './ui.js';
import { createMinimap } from './minimap.js';
import { icon } from './icons.js';
import * as fx from './fx.js';
import * as audio from './audio.js';
import { computeMods } from './game.js';
import { findScenario, DIFFICULTIES } from './scenarios.js';
import { createTitle, markMission } from './title.js';
import { createBot } from './autobuild.js';
import { ISLAND_KINDS } from './world.js';

const AUTOSAVE_EVERY = 10;
const SETTINGS_KEY = 'developgames-settings-v3';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const cam = { x: 0, y: 0, zoom: 1 };

let settings = { sound: true, icons: true, minimap: true, keepTool: false, seenHelp: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch { /* défaut */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* rien */ } };
audio.setEnabled(settings.sound);

const ui = {
  tool: 'inspect', hover: null, selected: null, speed: 1, pointerType: 'mouse', overlay: null, preview: null,
  sound: settings.sound, icons: settings.icons, minimap: settings.minimap, keepTool: settings.keepTool,
};
let g = load();
let hasAutosave = !!g;
if (!g) g = createGame();
let modalPaused = false;
let shiftDown = false;
const mouse = { x: 0, y: 0, inside: false };

const sound = (name) => audio.play(name);

// ---------- Caméra ----------
function centerOn(i, j, zoom) {
  if (zoom) cam.zoom = zoom;
  const [x, y] = P(i, j);
  cam.x = x - canvas.clientWidth / cam.zoom / 2;
  cam.y = y - canvas.clientHeight / cam.zoom / 2;
  clampCamera(cam, canvas);
}
function centerOnTownhall() {
  const th = g.buildings.find((b) => b.type === 'townhall');
  centerOn(th.x + 1, th.y + 1, Math.min(1.3, Math.max(0.75, canvas.clientWidth / 1000)));
}
const anchor = (b) => { const s = def(b).size; return P(b.x + s / 2, b.y + s / 2); };

// ---------- Outils ----------
function selectTool(id) {
  if (BUILDINGS[id] && eraLocked(g, id)) {
    view.toast(`${BUILDINGS[id].name} : ${lockReason(g, id).toLowerCase()}.`, 'error');
    sound('error');
    return;
  }
  ui.tool = ui.tool === id ? 'inspect' : id;
  ui.preview = null;
  if (ui.tool !== 'inspect') { ui.selected = null; view.closePanel(); }
  sound('click');
  view.renderItems();
  view.refresh();
}

function cancelTool() {
  if (ui.tool === 'inspect' && !ui.selected) return;
  ui.tool = 'inspect';
  ui.preview = null;
  view.closePanel();
  view.renderItems();
  view.refresh();
}

// Chemin en L entre deux cases (d'abord sur l'axe le plus long).
function lPath(a, b) {
  const path = [];
  const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
  const xFirst = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  let x = a.x, y = a.y;
  path.push([x, y]);
  const walk = (axis) => {
    if (axis === 'x') while (x !== b.x) { x += sx; path.push([x, y]); }
    else while (y !== b.y) { y += sy; path.push([x, y]); }
  };
  walk(xFirst ? 'x' : 'y');
  walk(xFirst ? 'y' : 'x');
  return path;
}

function fail(reason) {
  if (!reason) return;
  view.toast(reason, 'error');
  sound('error');
}

function onTap(tile) {
  const { x, y } = tile;
  const tool = ui.tool;
  if (tool === 'inspect') {
    const b = buildingAt(g, x, y);
    if (b) { ui.selected = b; view.openPanel('building', b); sound('click'); }
    else view.closePanel();
  } else if (tool === 'road') {
    const r = placeRoadPath(g, [[x, y]]);
    if (r.built) sound('road'); else fail(r.error);
  } else if (tool === 'clear' || tool === 'demolish') {
    const r = applyArea(g, tool, x, y, x, y);
    if (r.count) { sound(tool === 'demolish' ? 'demolish' : 'road'); fx.dust(...P(x + 0.5, y + 0.5)); } else fail(r.error);
  } else if (BUILDINGS[tool]) {
    const r = place(g, tool, x, y);
    if (r.ok) {
      sound('build');
      fx.dust(...anchor(r.building));
      if (r.warn) view.toast(r.warn, 'warn');
      if (!ui.keepTool && !shiftDown) cancelTool();
    } else fail(r.reason);
  }
  afterChange();
}

function onGesture(a, b, done, cancelled) {
  if (cancelled) { ui.preview = null; return; }
  const tool = ui.tool;
  if (tool === 'road') {
    const path = lPath(a, b);
    ui.preview = { kind: 'road', path };
    if (!done) {
      view.showTip(`<b>Route</b><p>${path.length} cases · ${roadPathCost(g, path)} bois</p>`, mouse.x, mouse.y);
      return;
    }
    const r = placeRoadPath(g, path);
    if (r.built) sound('road'); else fail(r.error);
  } else {
    ui.preview = { kind: 'area', tool, x0: a.x, y0: a.y, x1: b.x, y1: b.y };
    if (!done) return;
    const r = applyArea(g, tool, a.x, a.y, b.x, b.y);
    if (r.count) {
      sound(tool === 'demolish' ? 'demolish' : 'road');
      fx.dust(...P((a.x + b.x) / 2 + 0.5, (a.y + b.y) / 2 + 0.5));
    } else fail(r.error);
  }
  ui.preview = null;
  view.hideTip();
  afterChange();
}

function afterChange() {
  view.refresh();
  minimap.refresh(g);
}

// ---------- Actions des panneaux ----------
const actions = {
  sound,
  selectTool,
  cancelTool,
  upgradeHouse() { const b = ui.selected; if (b) { const r = upgradeHouse(g, b); if (r.ok) { sound('build'); fx.sparkle(...anchor(b)); } else fail(r.reason); afterChange(); } },
  toggleLock() { if (ui.selected) { toggleLock(g, ui.selected); sound('click'); afterChange(); } },
  togglePause() { if (ui.selected) { togglePause(g, ui.selected); sound('click'); afterChange(); } },
  bucket() { const b = ui.selected; if (b) { const r = bucketBrigade(g, b); if (r.ok) fx.sparkle(...anchor(b)); else fail(r.reason); afterChange(); } },
  demolishSelected() {
    const b = ui.selected;
    if (!b) return;
    const r = demolishBuilding(g, b);
    if (r.ok) { rebuild(g); sound('demolish'); fx.dust(...anchor(b)); view.closePanel(); } else fail(r.reason);
    afterChange();
  },
  advanceEra() { if (advanceEra(g)) afterChange(); },
  research(id) { const r = research(g, id); if (r.ok) { view.renderItems(); fx.sparkle(...P(g.buildings[0].x + 1, g.buildings[0].y + 1)); } else fail(r.reason); afterChange(); },
  setTax(i) { g.tax = Number(i); sound('click'); afterChange(); },
  buy(k, n) { const r = buy(g, k, Number(n)); if (r.ok) sound('coin'); else fail(r.reason); afterChange(); },
  sell(k, n) { const r = sell(g, k, Number(n)); if (r.ok) sound('coin'); else fail(r.reason); afterChange(); },
  help() { showHelp(); },
  saveSlot(i) { saveToSlot(Number(i)); },
  toMenu() { save(g); hasAutosave = true; view.closePanel(); title.show(); },
  exportSave() {
    const blob = new Blob([serialize(g)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `developgames-jour${g.day}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  importSave() { document.getElementById('import-file').click(); },
  newGame() { save(g); hasAutosave = true; view.closePanel(); title.show('new'); },
  setOption(opt, value) {
    settings[opt] = value;
    ui[opt] = value;
    if (opt === 'sound') audio.setEnabled(value);
    if (opt === 'minimap') document.getElementById('minimap').hidden = !value;
    saveSettings();
  },
  focus(b) {
    if (!g.buildings.includes(b)) return;
    const s = def(b).size;
    centerOn(b.x + s / 2, b.y + s / 2, Math.max(cam.zoom, 1));
    ui.tool = 'inspect';
    ui.selected = b;
    view.openPanel('building', b);
    view.renderItems();
  },
  modalOpened() { modalPaused = true; },
  modalClosed() { modalPaused = false; },
};

const view = createUI({ get g() { return g; }, ui, act: actions });

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const ng = deserialize(await file.text());
    if (!ng) throw new Error('format');
    startGame(ng);
    view.toast('Sauvegarde importée.', 'good');
  } catch {
    view.toast('Ce fichier n\'est pas une sauvegarde valide.', 'error');
  }
});

// ---------- Saisie ----------
attachInput(canvas, cam, {
  onHover: (tile, type) => { ui.hover = tile; if (type) ui.pointerType = type; },
  onTap,
  onCancel: cancelTool,
  gesture: () => (ui.tool === 'road' ? 'road' : ui.tool === 'demolish' || ui.tool === 'clear' ? 'area' : null),
  onGesture,
});
canvas.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true; });
canvas.addEventListener('pointerleave', () => { mouse.inside = false; view.hideTip(); });

const minimap = createMinimap(document.getElementById('minimap'), cam, canvas, () => clampCamera(cam, canvas));
document.getElementById('minimap').hidden = !ui.minimap;

const SPEEDS = [1, 2, 4, 0];
const SPEED_ICONS = { 0: icon('pause'), 1: icon('play'), 2: `${icon('fast-forward')}<small>2</small>`, 4: `${icon('fast-forward')}<small>4</small>` };
for (const btn of document.querySelectorAll('[data-speed]')) {
  btn.innerHTML = SPEED_ICONS[btn.dataset.speed];
  btn.addEventListener('click', () => {
    const s = Number(btn.dataset.speed);
    // Sur téléphone, seul le bouton actif est visible : le toucher passe à la vitesse suivante.
    if (s === ui.speed && matchMedia('(max-width: 760px)').matches) setSpeed(SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]);
    else setSpeed(s);
  });
}
function setSpeed(s) {
  ui.speed = s;
  sound('click');
  document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === s));
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') shiftDown = true;
  if (e.target.matches?.('input, textarea')) return;
  const pan = 60 / cam.zoom;
  switch (e.key) {
    case 'Escape': cancelTool(); view.closePanel(); document.getElementById('overlay-menu').hidden = true; break;
    case ' ': e.preventDefault(); setSpeed(ui.speed ? 0 : 1); break;
    case 'r': case 'R': selectTool('road'); break;
    case 'x': case 'X': selectTool('demolish'); break;
    case 'ArrowLeft': case 'q': cam.x -= pan; break;
    case 'ArrowRight': case 'd': cam.x += pan; break;
    case 'ArrowUp': case 'z': cam.y -= pan; break;
    case 'ArrowDown': case 's': cam.y += pan; break;
    case '+': case '=': zoomAt(cam, canvas, { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }, 1.15); break;
    case '-': zoomAt(cam, canvas, { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }, 1 / 1.15); break;
    default: return;
  }
  clampCamera(cam, canvas);
});
document.addEventListener('keyup', (e) => { if (e.key === 'Shift') shiftDown = false; });

window.addEventListener('resize', () => clampCamera(cam, canvas));
new ResizeObserver(([e]) => {
  document.documentElement.style.setProperty('--top-real', `${Math.round(e.target.getBoundingClientRect().height)}px`);
}).observe(document.getElementById('topbar'));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(g); });
window.addEventListener('pagehide', () => save(g));

// ---------- Messages et fenêtres venant du jeu ----------
const resLine = (k, n) => `<span class="c">${icon(k === 'gold' ? 'coins' : GOODS[k].icon)}${n} ${resName(k)}</span>`;

function drainEvents() {
  while (g.notes.length) {
    const n = g.notes.shift();
    view.toast(n.text, n.kind, n.focus);
    if (n.sound) sound(n.sound);
  }
  while (g.pending.length) {
    const p = g.pending.shift();
    if (p.type === 'caravan') {
      view.showModal(`<div class="m-ic">${icon('scale')}</div><h2>Caravane marchande</h2>
        <p class="center">Des marchands de passage proposent un échange.</p>
        <div class="offer">${resLine(p.give.k, p.give.n)}${icon('chevron-right')}${resLine(p.get.k, p.get.n)}</div>`, [
        { label: 'Refuser' },
        { label: 'Accepter', cls: 'primary', onClick: () => { const r = acceptOffer(g, p); if (r.ok) { view.toast('Échange conclu.', 'good'); sound('coin'); } else fail(r.reason); afterChange(); } },
      ]);
    } else if (p.type === 'era') {
      sound('era');
      const unlocks = Object.entries(BUILDINGS).filter(([, d]) => d.era === p.era);
      const th = g.buildings.find((b) => b.type === 'townhall');
      fx.sparkle(...P(th.x + 1, th.y + 1));
      view.showModal(`<div class="m-ic">${icon('crown')}</div><h2>Nouvelle ère : ${ERAS[p.era].name}</h2>
        <p class="center">Le stockage augmente${p.era >= 2 ? ' et les routes sont désormais pavées' : ''}.
        ${CLASSES[p.era] ? `Les maisons peuvent maintenant accueillir des <b>${CLASSES[p.era].name.toLowerCase()}</b>.` : ''}</p>
        ${unlocks.length ? `<p class="center muted">Nouveaux bâtiments</p><div class="unlocks">${unlocks.map(([, d]) => `<span>${d.name}</span>`).join('')}</div>` : ''}`,
      [{ label: 'Continuer', cls: 'primary' }]);
      view.renderItems();
    } else if (p.type === 'scenarioWin') {
      sound('victory');
      markMission(p.id, p.days);
      const sc = findScenario(p.id);
      const next = SCENARIO_ORDER[SCENARIO_ORDER.indexOf(p.id) + 1];
      view.showModal(`<div class="m-ic">${icon('trophy')}</div><h2>Mission accomplie</h2>
        <p class="center">« ${sc.name} » réussie en ${p.days} jours.</p>`, [
        { label: 'Continuer à jouer' },
        { label: 'Menu', onClick: () => actions.toMenu() },
        ...(next ? [{ label: 'Mission suivante', cls: 'primary', onClick: () => startScenario(next) }] : []),
      ]);
    } else if (p.type === 'scenarioLose') {
      sound('bad');
      view.showModal(`<div class="m-ic">${icon('hourglass')}</div><h2>Mission échouée</h2><p class="center">${p.reason}</p>`, [
        { label: 'Menu', onClick: () => actions.toMenu() },
        { label: 'Réessayer', cls: 'primary', onClick: () => startScenario(p.id) },
      ]);
    } else if (p.type === 'victory') {
      sound('victory');
      view.showModal(`<div class="m-ic">${icon('castle')}</div><h2>Victoire</h2>
        <p class="center">La Grande Cathédrale domine votre cité. Votre nom restera dans l'histoire.</p>
        <ul class="parts"><li><span>Habitants</span><b>${Math.floor(population(g))}</b></li>
        <li><span>Jours écoulés</span><b>${g.day}</b></li>
        <li><span>Bâtiments construits</span><b>${g.stats.built}</b></li>
        <li><span>Incendies</span><b>${g.stats.fires}</b></li></ul>`, [
        { label: 'Continuer à jouer', cls: 'primary' },
      ]);
    }
  }
}

// ---------- Aide ----------
const step_ = (ic, html) => `<div class="help-step">${icon(ic)}<div>${html}</div></div>`;
const HELP = [
  ['house', 'Bienvenue', `<p class="center">Fondez un hameau sur votre île et faites-en une grande cité, jusqu'à la <b>Grande Cathédrale</b>.</p>
    ${step_('mouse-pointer-2', 'Glissez pour vous déplacer, molette ou pincer pour zoomer. Clic droit ou Échap pour annuler un outil.')}
    ${step_('target', 'L\'<b>objectif</b> en haut à gauche vous guide pas à pas.')}`],
  ['route', 'Routes et ouvriers', `${step_('route', 'Chaque bâtiment doit être <b>relié à l\'hôtel de ville par une route</b>. Glissez pour en tracer une : un aperçu montre le tracé et son coût.')}
    ${step_('users', 'Les bâtiments ont besoin d\'<b>ouvriers d\'une classe précise</b> : les paysans pour les ressources, les artisans pour les ateliers, etc. La moitié des habitants travaille.')}`],
  ['users', 'Quatre classes d\'habitants', `${step_('house', 'Une habitation accueille d\'abord des <b>paysans</b>. Quand ils sont satisfaits et que l\'ère le permet, elle évolue en maison d\'<b>artisans</b>, puis de <b>bourgeois</b> et de <b>nobles</b>, qui paient bien plus d\'impôts.')}
    ${step_('croissant', 'Chaque classe a ses besoins : poisson, pain, tissu, bière, outils, vin, et des services à proximité (puits, marché, chapelle, taverne, école).')}
    ${step_('lock', 'Bloquez l\'évolution d\'une maison pour garder des paysans au travail.')}`],
  ['factory', 'Chaînes de production', `${step_('wheat', 'Blé → moulin → farine → boulangerie → pain. Laine → tisserand → tissu. Minerai + charbon → fonderie → fer → forge → outils.')}
    ${step_('factory', 'Le panneau <b>Marchandises</b> montre ce qui est produit et consommé chaque jour : surveillez les déficits.')}
    ${step_('landmark', 'Chaque bâtiment coûte un entretien en or. Les impôts doivent couvrir les dépenses.')}`],
  ['flask-conical', 'Recherche et colonies', `${step_('flask-conical', 'Les <b>bibliothèques</b> puis les <b>universités</b> produisent des points de recherche. Dépensez-les dans le panneau Recherche : meilleurs rendements, médecin, poste de garde, navigation…')}
    ${step_('ship', 'Avec la Navigation, construisez un <b>port</b> sur l\'île principale, puis un port sur une île voisine pour y fonder une <b>colonie</b>. Les routes de la colonie partent de son port.')}
    ${step_('gem', 'Les nobles exigent des épices et des bijoux : on ne les trouve que sur l\'île aux épices et l\'île aux filons.')}`],
  ['flame', 'Saisons et incendies', `${step_('snowflake', 'Presque rien ne pousse en hiver : faites des réserves de nourriture à l\'automne.')}
    ${step_('flame', 'Le feu peut prendre et se propager aux voisins. Un <b>poste d\'incendie</b> empêche les départs de feu dans sa zone et éteint vite les incendies ; un puits permet une chaîne de seaux.')}
    ${step_('layers', 'Les <b>calques</b> (bouton à droite) montrent l\'eau, les marchés, la protection incendie, la beauté et la satisfaction.')}`],
];
function showHelp(i = 0) {
  const [ic, title, body] = HELP[i];
  view.showModal(`<div class="m-ic">${icon(ic)}</div><h2>${title}</h2>${body}<p class="center muted small">${i + 1} / ${HELP.length}</p>`, i < HELP.length - 1
    ? [{ label: 'Passer', onClick: () => { settings.seenHelp = true; saveSettings(); } }, { label: 'Suivant', cls: 'primary', onClick: () => showHelp(i + 1) }]
    : [{ label: 'C\'est parti', cls: 'primary', onClick: () => { settings.seenHelp = true; saveSettings(); } }]);
}

// ---------- Écran titre, sauvegardes et missions ----------
const SLOT_KEY = (i) => `developgames-slot-${i}`;
const SCENARIO_ORDER = ['colons', 'hiver', 'incendie', 'pain', 'savoir', 'horizons', 'joyau', 'cathedrale'];

function gameName(game) {
  return game.scenario ? `Mission : ${findScenario(game.scenario).name}` : `Partie libre (${DIFFICULTIES[game.difficulty ?? 1].name.toLowerCase()})`;
}

function saveToSlot(i) {
  const meta = { date: Date.now(), day: g.day, era: g.era, pop: Math.floor(population(g)), name: gameName(g) };
  try {
    localStorage.setItem(SLOT_KEY(i), JSON.stringify({ meta, data: serialize(g) }));
    view.toast(`Partie sauvegardée dans l'emplacement ${i}.`, 'good');
    sound('coin');
  } catch {
    view.toast('Impossible de sauvegarder (stockage du navigateur plein ?).', 'error');
  }
}

function slotList() {
  const list = [];
  try {
    const auto = load();
    list.push({ key: 'auto', label: 'Sauvegarde automatique', meta: auto ? { date: Date.now(), day: auto.day, era: auto.era, pop: Math.floor(population(auto)), name: gameName(auto) } : null });
  } catch { list.push({ key: 'auto', label: 'Sauvegarde automatique', meta: null }); }
  for (const i of [1, 2, 3]) {
    let meta = null;
    try { meta = JSON.parse(localStorage.getItem(SLOT_KEY(i)))?.meta || null; } catch { /* vide */ }
    list.push({ key: String(i), label: `Emplacement ${i}`, meta });
  }
  return list;
}

function loadFrom(key) {
  let ng = null;
  try {
    ng = key === 'auto' ? load() : deserialize(JSON.parse(localStorage.getItem(SLOT_KEY(key))).data);
  } catch { ng = null; }
  if (!ng) { view.toast('Cette sauvegarde est illisible.', 'error'); return; }
  startGame(ng);
}

// Prépare une mission : carte, ville de départ construite par le joueur automatique, réglages.
async function startScenario(id) {
  const sc = findScenario(id);
  let ng = createGame(sc.seed, { difficulty: sc.difficulty });
  if (sc.prebuild) {
    title.progress(`Préparation de la mission « ${sc.name} »…`);
    const bot = createBot(sc.seed, { game: ng, ...sc.prebuild });
    for (let d = 0; d < sc.prebuild.days; d++) {
      bot.day();
      if (d % 15 === 0) { title.setProgress(d / sc.prebuild.days); await new Promise((r) => setTimeout(r, 0)); }
    }
    ng.notes.length = 0;
    ng.pending.length = 0;
  }
  ng.scenario = id;
  ng.scenarioStart = ng.day;
  ng.scenarioEnded = null;
  ng.log = [];
  ng.stats = { built: 0, fires: 0, maxPop: 0 };
  const api = {
    refresh() { computeMods(ng); rebuild(ng); },
    igniteHouses(n) {
      const houses = ng.buildings.filter((b) => b.type === 'house').sort(() => Math.random() - 0.5).slice(0, n);
      for (const b of houses) b.fire = 1;
    },
  };
  computeMods(ng);
  sc.after?.(ng, api);
  rebuild(ng);
  startGame(ng);
  view.showModal(`<div class="m-ic">${icon(sc.icon)}</div><h2>${sc.name}</h2><p class="center">${sc.intro}</p>
    <ul class="parts">${sc.goals.map((q) => `<li><span>${q.text}</span></li>`).join('')}</ul>
    <p class="center muted small">${sc.days ? `Temps imparti : ${sc.days} jours.` : 'Pas de limite de temps.'} Difficulté : ${DIFFICULTIES[sc.difficulty].name.toLowerCase()}.</p>`,
  [{ label: 'Commencer', cls: 'primary' }]);
}

const title = createTitle({
  hasSave: () => hasAutosave,
  onContinue: () => { const ng = load(); if (ng) startGame(ng); else title.show('new'); },
  onNew: (difficulty, seed) => startGame(createGame(seed, { difficulty })),
  onScenario: (id) => startScenario(id),
  slots: slotList,
  onLoad: loadFrom,
  onHelp: () => showHelp(),
});
void ISLAND_KINDS; void clearSave;

// ---------- Boucle ----------
function startGame(ng) {
  title.hide();
  hasAutosave = true;
  g = ng;
  ui.selected = null;
  ui.tool = 'inspect';
  view.closePanel();
  view.setCat('tools');
  centerOnTownhall();
  afterChange();
}

function updateTooltip() {
  if (ui.preview || !mouse.inside || ui.pointerType !== 'mouse' || !ui.hover) { if (!ui.preview) view.hideTip(); return; }
  const b = buildingAt(g, ui.hover.x, ui.hover.y);
  if (b && ui.tool === 'inspect') view.buildingTip(b, mouse.x, mouse.y);
  else view.hideTip();
}

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(now - last, 100) / 1000;
  last = now;
  const speed = modalPaused || title.open ? 0 : ui.speed;
  if (title.open) { cam.x += dt * 12; if (cam.x > 4000) cam.x = 300; }
  acc += dt * 1000 * speed;
  let ticked = false;
  while (acc >= DAY_MS) {
    acc -= DAY_MS;
    step(g);
    ticked = true;
    if (speed <= 2 || g.day % 2 === 0) renderer.announce(g);
    if (g.day % AUTOSAVE_EVERY === 0) save(g);
  }
  if (ticked) afterChange();
  drainEvents();
  renderer.draw(g, cam, { ...ui, speed }, dt);
  if (ui.minimap) minimap.draw();
  updateTooltip();
  requestAnimationFrame(frame);
}

// Outils de test dans la console : DG.give('gold', 500), DG.days(30)
window.DG = {
  get g() { return g; },
  cam,
  ui,
  toScreen(i, j) { const [x, y] = P(i + 0.5, j + 0.5); return { x: (x - cam.x) * cam.zoom, y: (y - cam.y) * cam.zoom }; },
  give(k, n) { if (k === 'gold') g.gold += n; else g.goods[k] += n; afterChange(); },
  days(n) { for (let i = 0; i < n; i++) step(g); afterChange(); },
  load(text) { startGame(deserialize(text)); },
};
void costText; void TOOLS;

view.renderCats();
view.renderItems();
centerOnTownhall();
afterChange();
title.show();
requestAnimationFrame(frame);

// Mode hors ligne uniquement sur notre propre site (pas dans le cadre d'itch.io ou d'un autre portail).
if ('serviceWorker' in navigator && location.hostname.endsWith('github.io')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
