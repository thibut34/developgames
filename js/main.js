import { TILE, BUILDINGS } from './config.js';
import {
  createGame, load, save, clearSave, step, place, demolish, buildingAt, tileAt,
} from './game.js';
import { createRenderer } from './render.js';
import { attachInput, clampCamera } from './input.js';
import { buildToolbar, refreshToolbar, refreshHud, showInfo, hideInfo, toast } from './ui.js';

const DAY_MS = 1000;          // durée d'un jour à vitesse x1
const AUTOSAVE_EVERY = 10;    // jours

const canvas = document.getElementById('game');
const draw = createRenderer(canvas);
const cam = { x: 0, y: 0, zoom: 1 };
const ui = { tool: 'inspect', hover: null, selected: null, speed: 1 };
let g = load() || createGame();

function centerOnTownhall() {
  const th = g.buildings.find((b) => b.type === 'townhall');
  cam.zoom = Math.min(1.2, Math.max(0.6, canvas.clientWidth / 900));
  cam.x = (th.x + 1) * TILE - canvas.clientWidth / cam.zoom / 2;
  cam.y = (th.y + 1) * TILE - canvas.clientHeight / cam.zoom / 2;
  clampCamera(cam, canvas);
}

function refresh() {
  refreshHud(g);
  refreshToolbar(ui, g);
  if (ui.selected) {
    if (g.buildings.includes(ui.selected)) showInfo(g, ui.selected);
    else { ui.selected = null; hideInfo(); }
  }
}

function selectTool(id) {
  ui.tool = ui.tool === id && id !== 'inspect' ? 'inspect' : id;
  if (BUILDINGS[ui.tool]) toast(`${BUILDINGS[ui.tool].name} : ${BUILDINGS[ui.tool].desc}`);
  refreshToolbar(ui, g);
}

attachInput(canvas, cam, {
  onHover: (tile) => { ui.hover = tile; },
  onTap: (tile) => {
    ui.hover = tile;
    if (ui.tool === 'inspect') {
      ui.selected = buildingAt(g, tile.x, tile.y);
      showInfo(g, ui.selected, tile, tileAt(g, tile.x, tile.y));
    } else if (ui.tool === 'demolish') {
      const r = demolish(g, tile.x, tile.y);
      toast(r.ok ? `${r.name} démoli (50 % remboursé)` : r.reason, r.ok ? '' : 'error');
    } else {
      const r = place(g, ui.tool, tile.x, tile.y);
      if (!r.ok) toast(r.reason, 'error');
    }
    refresh();
  },
});

buildToolbar(ui, selectTool);

for (const btn of document.querySelectorAll('[data-speed]')) {
  btn.addEventListener('click', () => {
    ui.speed = Number(btn.dataset.speed);
    document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('active', b === btn));
  });
}

document.getElementById('new-game').addEventListener('click', () => {
  if (!confirm('Commencer une nouvelle partie ? La partie en cours sera perdue.')) return;
  clearSave();
  g = createGame();
  ui.selected = null;
  hideInfo();
  centerOnTownhall();
  refresh();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { ui.tool = 'inspect'; ui.selected = null; hideInfo(); refreshToolbar(ui, g); }
});

window.addEventListener('resize', () => clampCamera(cam, canvas));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(g); });
window.addEventListener('pagehide', () => save(g));

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(now - last, 1000) * ui.speed;
  last = now;
  let ticked = false;
  while (acc >= DAY_MS) {
    acc -= DAY_MS;
    step(g);
    ticked = true;
    if (g.day % AUTOSAVE_EVERY === 0) save(g);
  }
  if (ticked) refresh();
  draw(g, cam, ui);
  requestAnimationFrame(frame);
}

centerOnTownhall();
refresh();
requestAnimationFrame(frame);
