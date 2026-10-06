import { DAY_MS, BUILDINGS, TOOLS, ERAS, RES, HOUSE_LEVELS } from './config.js';
import {
  createGame, load, save, clearSave, step, place, placeRoad, clearTile, demolish, buildingAt, tileAt,
  roadAt, inMap, upgrade, togglePause, extinguish, advanceEra, buy, sell, acceptOffer, eraLocked,
  serialize, deserialize, def, costText,
} from './game.js';
import { P } from './iso.js';
import { createRenderer } from './render.js';
import { attachInput, clampCamera, zoomAt } from './input.js';
import { createUI } from './ui.js';
import { createMinimap } from './minimap.js';
import * as fx from './fx.js';
import * as audio from './audio.js';

const AUTOSAVE_EVERY = 10;
const SETTINGS_KEY = 'developgames-settings';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const cam = { x: 0, y: 0, zoom: 1 };

let settings = { sound: true, icons: true, minimap: true, seenHelp: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch { /* défaut */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* rien */ } };
audio.setEnabled(settings.sound);

const ui = {
  tool: 'inspect', hover: null, selected: null, speed: 1, pointerType: 'mouse',
  sound: settings.sound, icons: settings.icons, minimap: settings.minimap, zoomed: true,
};
let g = load();
const firstTime = !g;
if (!g) g = createGame();
let modalPaused = false;

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

// ---------- Actions de jeu ----------
function anchor(b) {
  const s = def(b).size;
  return P(b.x + s / 2, b.y + s / 2);
}

function selectTool(id) {
  if (BUILDINGS[id] && eraLocked(g, id)) {
    view.toast(`🔒 ${BUILDINGS[id].name} : débloqué à l'ère « ${ERAS[BUILDINGS[id].era].name} ».`, 'error');
    sound('error');
    return;
  }
  ui.tool = ui.tool === id && id !== 'inspect' ? 'inspect' : id;
  sound('click');
  const d = BUILDINGS[ui.tool] || TOOLS.find((t) => t.id === ui.tool);
  if (ui.tool !== 'inspect') view.toast(`${d.icon} ${d.name}${d.cost ? ` (${costText(d.cost)})` : ''} — ${d.desc}`);
  view.renderItems();
}

let strokeError = false;
function act(tile, painting) {
  const { x, y } = tile;
  const fail = (r) => {
    if (r.silent || (painting && strokeError)) return;
    strokeError = painting;
    view.toast(r.reason, 'error');
    sound('error');
  };
  const b = buildingAt(g, x, y);
  if (b && b.fire > 0 && !painting) {
    extinguish(g, b);
    fx.sparkle(...anchor(b));
    return;
  }
  const tool = ui.tool;
  if (tool === 'inspect') {
    if (painting) return;
    if (b) { ui.selected = b; view.openPanel('building', b); sound('click'); }
    else if (inMap(x, y)) { ui.selected = null; view.openPanel('tile', { x, y, type: tileAt(g, x, y), road: roadAt(g, x, y) }); }
    else view.closePanel();
  } else if (tool === 'road') {
    const r = placeRoad(g, x, y);
    if (r.ok) sound('road'); else fail(r);
  } else if (tool === 'clear') {
    const r = clearTile(g, x, y);
    if (r.ok) {
      sound('road');
      const [px, py] = P(x + 0.5, y + 0.5);
      fx.dust(px, py);
      fx.floatText(px, py - 10, `+${costText(r.gain)}`, '#fff6c8');
    } else fail(r);
  } else if (tool === 'demolish') {
    const r = demolish(g, x, y);
    if (r.ok) {
      sound(r.road ? 'road' : 'demolish');
      fx.dust(...P(x + 0.5, y + 0.5));
      if (!r.road) view.toast(`🔨 ${r.name} démoli (50 % remboursé).`);
    } else fail(r);
  } else if (BUILDINGS[tool]) {
    if (painting) return;
    const r = place(g, tool, x, y);
    if (r.ok) {
      sound('build');
      const [px, py] = anchor(r.building);
      fx.dust(px, py);
      if (r.warn) view.toast(`🚧 ${r.warn}`, 'warn');
      if (tool === 'wonder') fx.sparkle(px, py - 40);
    } else fail(r);
  }
  afterChange();
}

function afterChange() {
  view.refresh();
  minimap.refresh(g);
}

const actions = {
  sound,
  selectTool,
  upgrade() { if (ui.selected) { const r = upgrade(g, ui.selected); if (r.ok) { sound('build'); fx.sparkle(...anchor(ui.selected)); } else { view.toast(r.reason, 'error'); sound('error'); } afterChange(); } },
  togglePause() { if (ui.selected) { togglePause(g, ui.selected); sound('click'); afterChange(); } },
  extinguish() { if (ui.selected) { extinguish(g, ui.selected); afterChange(); } },
  demolishSelected() {
    const b = ui.selected;
    if (!b) return;
    const r = demolish(g, b.x, b.y);
    if (r.ok) { sound('demolish'); fx.dust(...anchor(b)); view.closePanel(); }
    afterChange();
  },
  advanceEra() { if (advanceEra(g)) afterChange(); },
  setTax(i) { g.tax = Number(i); sound('click'); afterChange(); },
  buy(k, n) { const r = buy(g, k, Number(n)); if (r.ok) sound('coin'); else { view.toast(r.reason, 'error'); sound('error'); } afterChange(); },
  sell(k, n) { const r = sell(g, k, Number(n)); if (r.ok) sound('coin'); else { view.toast(r.reason, 'error'); sound('error'); } afterChange(); },
  openEra() { view.openPanel('era'); },
  help() { showHelp(); },
  exportSave() {
    const blob = new Blob([serialize(g)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `developgames-an${Math.floor(g.day / 60) + 1}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  importSave() { document.getElementById('import-file').click(); },
  newGame() {
    view.showModal('<h2>↻ Nouvelle partie ?</h2><p>La partie en cours sera perdue (pensez à l\'exporter si vous voulez la garder).</p>', [
      { label: 'Annuler' },
      { label: 'Nouvelle île', cls: 'danger', onClick: () => { clearSave(); startGame(createGame()); } },
    ]);
  },
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
    ui.selected = b;
    view.openPanel('building', b);
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
    view.toast('📂 Sauvegarde importée !', 'good');
  } catch {
    view.toast('Ce fichier n\'est pas une sauvegarde valide.', 'error');
  }
});

// ---------- Saisie ----------
attachInput(canvas, cam, {
  onHover: (tile, type) => { ui.hover = tile; if (type) ui.pointerType = type; },
  onTap: (tile) => act(tile, false),
  paintTool: () => ['road', 'demolish', 'clear'].includes(ui.tool),
  onPaint: (tile) => act(tile, true),
  onPaintEnd: () => { strokeError = false; },
});

const minimap = createMinimap(document.getElementById('minimap'), cam, canvas, () => clampCamera(cam, canvas));
document.getElementById('minimap').hidden = !ui.minimap;

const SPEEDS = [1, 2, 4, 0];
for (const btn of document.querySelectorAll('[data-speed]')) {
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
  if (e.target.matches('input, textarea')) return;
  const pan = 60 / cam.zoom;
  switch (e.key) {
    case 'Escape': ui.tool = 'inspect'; view.closePanel(); view.renderItems(); break;
    case ' ': e.preventDefault(); setSpeed(ui.speed ? 0 : 1); break;
    case 'r': case 'R': selectTool('road'); break;
    case 'x': case 'X': selectTool('demolish'); break;
    case 'ArrowLeft': case 'a': case 'q': cam.x -= pan; break;
    case 'ArrowRight': case 'd': cam.x += pan; break;
    case 'ArrowUp': case 'w': case 'z': cam.y -= pan; break;
    case 'ArrowDown': case 's': cam.y += pan; break;
    case '+': case '=': zoomAt(cam, canvas, { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }, 1.15); break;
    case '-': zoomAt(cam, canvas, { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }, 1 / 1.15); break;
    default: return;
  }
  clampCamera(cam, canvas);
});

window.addEventListener('resize', () => clampCamera(cam, canvas));
// La barre du haut peut passer sur deux lignes : on recale ce qui est placé dessous.
new ResizeObserver(([e]) => {
  document.documentElement.style.setProperty('--top-real', `${Math.round(e.target.getBoundingClientRect().height)}px`);
}).observe(document.getElementById('topbar'));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(g); });
window.addEventListener('pagehide', () => save(g));

// ---------- Messages et fenêtres venant du jeu ----------
function drainEvents() {
  while (g.notes.length) {
    const n = g.notes.shift();
    view.toast(n.text, n.kind, n.focus);
    if (n.sound) sound(n.sound);
  }
  while (g.pending.length) {
    const p = g.pending.shift();
    if (p.type === 'caravan') {
      const give = `${p.give.n} ${RES[p.give.k].icon} ${RES[p.give.k].name}`;
      const get = `${p.get.n} ${RES[p.get.k].icon} ${RES[p.get.k].name}`;
      view.showModal(`<h2>🐪 Caravane marchande</h2><p>Des marchands proposent un échange :</p>
        <p class="offer">Vous donnez <b>${give}</b><br>et recevez <b>${get}</b></p>`, [
        { label: 'Refuser' },
        { label: 'Accepter', cls: 'primary', onClick: () => { const r = acceptOffer(g, p); view.toast(r.ok ? '🐪 Échange conclu !' : r.reason, r.ok ? 'good' : 'error'); sound(r.ok ? 'coin' : 'error'); afterChange(); } },
      ]);
    } else if (p.type === 'era') {
      sound('era');
      const unlocks = Object.values(BUILDINGS).filter((d) => d.era === p.era);
      const house = HOUSE_LEVELS.find((L) => L && L.era === p.era);
      const th = g.buildings.find((b) => b.type === 'townhall');
      fx.sparkle(...P(th.x + 1, th.y + 1));
      view.showModal(`<div class="big">🎉</div><h2>Nouvelle ère : ${ERAS[p.era].name} !</h2>
        <p>Votre cité grandit. Stockage +150, l'hôtel de ville s'agrandit${p.era >= 2 ? ' et les routes sont pavées' : ''}.</p>
        ${unlocks.length ? `<p>Nouveaux bâtiments :</p><p class="unlocks">${unlocks.map((d) => `<span>${d.icon} ${d.name}</span>`).join('')}</p>` : ''}
        ${house ? `<p>Les maisons peuvent devenir <b>${house.name}</b>.</p>` : ''}`, [{ label: 'En avant !', cls: 'primary' }]);
      view.renderItems();
    } else if (p.type === 'victory') {
      sound('victory');
      view.showModal(`<div class="big">🏰</div><h2>Victoire !</h2>
        <p>La Grande Cathédrale domine votre cité. Votre nom restera dans l'histoire !</p>
        <ul class="parts"><li><span>Habitants</span><b>${Math.floor(g.pop)}</b></li>
        <li><span>Jours écoulés</span><b>${g.day}</b></li>
        <li><span>Bâtiments construits</span><b>${g.stats.built}</b></li></ul>`, [
        { label: 'Continuer à jouer', cls: 'primary' },
      ]);
    }
  }
}

// ---------- Aide ----------
const HELP = [
  `<div class="big">🏘️</div><h2>Bienvenue dans DevelopGames !</h2>
   <p>Fondez un hameau sur votre île et faites-en une grande cité, jusqu'à bâtir la <b>Grande Cathédrale</b>.</p>
   <p>Glissez pour vous déplacer, molette ou pincer pour zoomer. Suivez l'<b>objectif</b> en haut à gauche : il vous guide pas à pas.</p>`,
  `<div class="big">🛤️</div><h2>Routes et ouvriers</h2>
   <p>Les bâtiments ne fonctionnent que s'ils sont <b>reliés à l'hôtel de ville par une route</b> (🚧 sinon). Choisissez 🛤️ et glissez pour tracer.</p>
   <p>Les habitants travaillent dans les bâtiments. Sans assez d'ouvriers, un bâtiment s'arrête (👷). La nourriture passe en priorité.</p>`,
  `<div class="big">🏠</div><h2>Des maisons qui évoluent</h2>
   <p>Une habitation commence en <b>cabane</b> et monte toute seule de niveau si ses besoins sont couverts : route, eau (puits), nourriture, puis chapelle, marché, taverne, école, beauté…</p>
   <p>Touchez une maison avec 👆 pour voir ce qui lui manque. Plus de niveau = plus d'habitants et plus d'impôts.</p>`,
  `<div class="big">❄️</div><h2>Saisons, bonheur et dangers</h2>
   <p>Les fermes ne produisent rien en hiver, et il faut du bois pour se chauffer : faites des réserves !</p>
   <p>Le <b>bonheur</b> 🙂 fait grandir la population et augmente la production. Attention aux incendies 🔥 (touchez le bâtiment pour l'éteindre), aux bandits et aux épidémies.</p>
   <p>Quand les conditions sont réunies, passez à l'<b>ère suivante</b> avec le bouton ⬆️. Bonne construction !</p>`,
];
function showHelp(i = 0) {
  view.showModal(`${HELP[i]}<p class="muted small">${i + 1}/${HELP.length}</p>`, i < HELP.length - 1
    ? [{ label: 'Passer' }, { label: 'Suivant', cls: 'primary', onClick: () => showHelp(i + 1) }]
    : [{ label: 'C\'est parti !', cls: 'primary', onClick: () => { settings.seenHelp = true; saveSettings(); } }]);
}

// ---------- Boucle ----------
function startGame(ng) {
  g = ng;
  ui.selected = null;
  ui.tool = 'inspect';
  view.closePanel();
  view.setCat('tools');
  centerOnTownhall();
  afterChange();
}

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(now - last, 100) / 1000;
  last = now;
  const speed = modalPaused ? 0 : ui.speed;
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
  ui.zoomed = cam.zoom >= 1.5;
  renderer.draw(g, cam, { ...ui, speed }, dt);
  if (ui.minimap) minimap.draw();
  requestAnimationFrame(frame);
}

// Outils de test dans la console : DG.give('gold', 500), DG.days(30)
window.DG = {
  get g() { return g; },
  cam,
  ui,
  // Position à l'écran (pixels CSS) du centre d'une case.
  toScreen(i, j) { const [x, y] = P(i + 0.5, j + 0.5); return { x: (x - cam.x) * cam.zoom, y: (y - cam.y) * cam.zoom }; },
  give(k, n) { g.res[k] += n; afterChange(); },
  days(n) { for (let i = 0; i < n; i++) step(g); afterChange(); },
  load(text) { startGame(deserialize(text)); },
};

view.renderCats();
view.renderItems();
centerOnTownhall();
afterChange();
if (firstTime || !settings.seenHelp) showHelp();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
