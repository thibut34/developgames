// Écran titre : continuer, nouvelle partie (difficulté, carte), campagne, chargement, aide.
import { DIFFICULTIES, SCENARIOS } from './scenarios.js';
import { ERAS } from './config.js';
import { icon } from './icons.js';

const CAMPAIGN_KEY = 'developgames-campaign';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function campaignProgress() {
  try { return JSON.parse(localStorage.getItem(CAMPAIGN_KEY)) || {}; } catch { return {}; }
}
export function markMission(id, days) {
  const p = campaignProgress();
  if (!p[id] || days < p[id].days) p[id] = { days };
  try { localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(p)); } catch { /* rien */ }
}

// app : { hasSave(), onContinue(), onNew(difficulté, graine), onScenario(id), slots(), onLoad(clé), onHelp() }
export function createTitle(app) {
  const el = document.getElementById('title');
  let page = 'menu';
  let difficulty = 1;

  function render() {
    const box = el.querySelector('.t-content');
    if (page === 'menu') {
      box.innerHTML = `<div class="t-menu">
        ${app.hasSave() ? `<button class="primary" data-go="continue">${icon('play')}Continuer</button>` : ''}
        <button data-go="new">${icon('map')}Nouvelle partie</button>
        <button data-go="campaign">${icon('flag')}Campagne</button>
        <button data-go="load">${icon('folder-open')}Charger</button>
        <button data-go="help">${icon('circle-help')}Comment jouer</button>
      </div>`;
    } else if (page === 'new') {
      box.innerHTML = `${back()}<h2>Nouvelle partie</h2>
        <div class="t-diffs">${DIFFICULTIES.map((d, i) => `<button class="t-diff ${i === difficulty ? 'active' : ''}" data-diff="${i}"><b>${d.name}</b><span>${d.desc}</span></button>`).join('')}</div>
        <label class="t-seed">Numéro de carte <input id="t-seed" inputmode="numeric" placeholder="au hasard"></label>
        <button class="primary wide" data-go="start">${icon('play')}Fonder la cité</button>`;
    } else if (page === 'campaign') {
      const prog = campaignProgress();
      box.innerHTML = `${back()}<h2>Campagne</h2><p class="muted">Huit missions de difficulté croissante, chacune avec ses objectifs.</p>
        <div class="t-missions">${SCENARIOS.map((s, i) => {
          const done = prog[s.id];
          return `<button class="t-mission ${done ? 'done' : ''}" data-mission="${s.id}">
            <span class="t-num">${done ? icon('check') : i + 1}</span>
            <span class="t-mi">${icon(s.icon)}</span>
            <span class="t-mt"><b>${esc(s.name)}</b><span>${esc(s.intro)}</span>
            <em>${s.days ? `${s.days} jours` : 'Sans limite de temps'} · ${DIFFICULTIES[s.difficulty].name}${done ? ` · réussie en ${done.days} jours` : ''}</em></span>
          </button>`;
        }).join('')}</div>`;
    } else if (page === 'load') {
      const slots = app.slots();
      box.innerHTML = `${back()}<h2>Charger une partie</h2><div class="t-slots">${slots.map((s) => `
        <button class="t-slot" data-slot="${s.key}" ${s.meta ? '' : 'disabled'}>
          <b>${esc(s.label)}</b>
          <span>${s.meta ? `${esc(s.meta.name)} · ${ERAS[s.meta.era].name} · ${s.meta.pop} habitants · jour ${s.meta.day}<br><em>${new Date(s.meta.date).toLocaleString('fr-FR')}</em>` : 'Vide'}</span>
        </button>`).join('')}</div>`;
    }
    for (const b of box.querySelectorAll('[data-go]')) b.onclick = () => go(b.dataset.go);
    for (const b of box.querySelectorAll('[data-diff]')) b.onclick = () => { difficulty = Number(b.dataset.diff); render(); };
    for (const b of box.querySelectorAll('[data-mission]')) b.onclick = () => app.onScenario(b.dataset.mission);
    for (const b of box.querySelectorAll('[data-slot]')) b.onclick = () => app.onLoad(b.dataset.slot);
  }

  const back = () => `<button class="t-back" data-go="menu">${icon('chevron-right')}Retour</button>`;

  function go(where) {
    if (where === 'continue') return app.onContinue();
    if (where === 'help') return app.onHelp();
    if (where === 'start') {
      const v = document.getElementById('t-seed').value.trim();
      const seed = v ? Math.abs(parseInt(v, 10)) || 1 : Math.floor(Math.random() * 1e9);
      return app.onNew(difficulty, seed);
    }
    page = where;
    render();
  }

  return {
    show(p = 'menu') { page = p; el.hidden = false; document.body.classList.add('on-title'); render(); },
    hide() { el.hidden = true; document.body.classList.remove('on-title'); },
    get open() { return !el.hidden; },
    progress(text) {
      el.hidden = false;
      document.body.classList.add('on-title');
      el.querySelector('.t-content').innerHTML = `<div class="t-progress"><p>${esc(text)}</p><div class="meter thin"><div style="width:0%"></div></div></div>`;
    },
    setProgress(v) {
      const bar = el.querySelector('.t-progress .meter div');
      if (bar) bar.style.width = `${Math.round(v * 100)}%`;
    },
  };
}
