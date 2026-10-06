// Interface HTML : barre de ressources, barre d'outils, panneau d'info, messages.
import { BUILDINGS, RES, TERRAIN_NAMES } from './config.js';
import { housing, storage, canAfford } from './game.js';

const $ = (id) => document.getElementById(id);

const fmt = (n) => Math.floor(n).toLocaleString('fr-FR');
const fmtGain = (n) => (n >= 0 ? '+' : '') + n.toFixed(1).replace('.', ',');
const costText = (cost = {}) =>
  Object.entries(cost).map(([k, v]) => `${RES[k].icon}${v}`).join(' ');

export function buildToolbar(ui, onSelect) {
  const bar = $('toolbar');
  const tools = [
    { id: 'inspect', icon: '👆', name: 'Inspecter' },
    ...Object.entries(BUILDINGS)
      .filter(([, d]) => d.buildable !== false)
      .map(([id, d]) => ({ id, icon: d.icon, name: d.name, cost: d.cost })),
    { id: 'demolish', icon: '🔨', name: 'Démolir' },
  ];
  bar.innerHTML = '';
  for (const t of tools) {
    const btn = document.createElement('button');
    btn.className = 'tool';
    btn.dataset.tool = t.id;
    btn.title = BUILDINGS[t.id]?.desc || t.name;
    btn.innerHTML = `<span class="tool-icon">${t.icon}</span>
      <span class="tool-name">${t.name}</span>
      ${t.cost ? `<span class="tool-cost">${costText(t.cost)}</span>` : ''}`;
    btn.addEventListener('click', () => onSelect(t.id));
    bar.appendChild(btn);
  }
  refreshToolbar(ui);
}

export function refreshToolbar(ui, g) {
  for (const btn of document.querySelectorAll('.tool')) {
    btn.classList.toggle('active', btn.dataset.tool === ui.tool);
    const def = BUILDINGS[btn.dataset.tool];
    btn.classList.toggle('unaffordable', !!(g && def && !canAfford(g, def.cost)));
  }
}

export function refreshHud(g) {
  const cap = storage(g);
  const gain = g.lastGain || {};
  for (const k of Object.keys(RES)) {
    const el = $(`res-${k}`);
    el.querySelector('.val').textContent = k === 'gold' ? fmt(g.res[k]) : `${fmt(g.res[k])}/${cap}`;
    const d = el.querySelector('.delta');
    d.textContent = gain[k] != null ? fmtGain(gain[k]) : '';
    d.classList.toggle('neg', (gain[k] || 0) < 0);
  }
  $('res-pop').querySelector('.val').textContent = `${Math.floor(g.pop)}/${housing(g)}`;
  $('res-pop').querySelector('.delta').textContent = `${g.idle ?? 0} libres`;
  $('day').textContent = `Jour ${g.day}`;
  $('res-food').classList.toggle('alert', !!g.starving);
}

export function showInfo(g, b, tile, terrain) {
  const box = $('info');
  if (!b) {
    if (terrain == null) { box.hidden = true; return; }
    box.innerHTML = `<button class="close" aria-label="Fermer">✕</button>
      <h3>${TERRAIN_NAMES[terrain]}</h3><p class="muted">Case ${tile.x}, ${tile.y}</p>`;
  } else {
    const def = BUILDINGS[b.type];
    const status = def.workers
      ? (b.active ? `✅ Actif (${def.workers} ouvriers)` : `💤 Manque d'ouvriers (${def.workers} requis)`)
      : '';
    const prod = def.produces
      ? `<p>Production : ${Object.entries(def.produces).map(([k, v]) => `${RES[k].icon} +${v}/jour`).join(', ')}</p>` : '';
    box.innerHTML = `<button class="close" aria-label="Fermer">✕</button>
      <h3>${def.icon} ${def.name}</h3><p>${def.desc}</p>${prod}
      ${status ? `<p>${status}</p>` : ''}`;
  }
  box.hidden = false;
  box.querySelector('.close').onclick = () => { box.hidden = true; };
}

export function hideInfo() { $('info').hidden = true; }

let toastTimer = 0;
export function toast(msg, kind = '') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2200);
}
