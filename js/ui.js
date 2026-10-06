// Interface HTML : barre du haut, barre d'outils, panneaux, info-bulles, fenêtres, messages.
import {
  BUILDINGS, GOODS, GOOD_KEYS, GOLD, BAR_GOODS, TOOLS, CATEGORIES, ERAS, CLASSES, TERRAIN, CLEAR,
  TAXES, QUESTS, SEASONS, FIRE, WORKFORCE,
} from './config.js';
import {
  storage, canAfford, amount, eraLocked, def, isWorking, houseNeeds, upgradeStatus, eraStatus,
  questProgress, buyPrice, sellPrice, tradeHasPost, dateText, season, capOf, isHouse, population,
} from './game.js';
import { icon } from './icons.js';
import { thumb } from './thumbs.js';

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => Math.floor(n).toLocaleString('fr-FR');
const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('fr-FR');
const signed = (n) => (n >= 0 ? '+' : '−') + fmt1(Math.abs(n));
const pct = (v) => `${Math.round(v * 100)} %`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const resInfo = (k) => (k === 'gold' ? GOLD : GOODS[k]);

// Coût avec icônes ; les montants manquants sont en rouge.
export function costHtml(g, cost = {}, mult = 1) {
  return `<span class="cost">${Object.entries(cost).map(([k, v]) => {
    const n = Math.ceil(v * mult);
    const miss = g && amount(g, k) < n;
    return `<span class="c ${miss ? 'miss' : ''}" title="${resInfo(k).name}">${icon(resInfo(k).icon)}${fmt(n)}</span>`;
  }).join('')}</span>`;
}
const goodTag = (k, n) => `<span class="c" title="${resInfo(k).name}">${icon(resInfo(k).icon)}${n != null ? fmt1(n) : ''}</span>`;

function bar(v, cls = '') {
  const c = v >= 0.8 ? 'ok' : v >= 0.5 ? 'mid' : 'low';
  return `<div class="meter ${cls} ${c}"><div style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></div></div>`;
}

export function createUI(app) {
  let cat = 'tools';
  let panel = null;
  const modalQueue = [];

  // ---------- Barre du haut ----------
  $('#tb-goods').innerHTML = BAR_GOODS.map((k) => `
    <div class="tb-item res" id="res-${k}"><span class="ic-wrap">${icon(GOODS[k].icon)}</span><b class="val"></b><span class="cap"></span></div>`).join('');
  $('#tb-pop').innerHTML = CLASSES.map((C, c) => `
    <div class="tb-item cls" id="cls-${c}" style="--cls:${C.color}"><span class="dot"></span><b class="val"></b><span class="lbl">${C.name}</span></div>`).join('');
  $('#tb-gold').innerHTML = `<span class="ic-wrap gold">${icon('coins')}</span><b class="val"></b><span class="delta"></span>`;
  $('#tb-happy').innerHTML = `<span class="ic-wrap"></span><b class="val"></b>`;
  for (const id of ['tb-goods', 'tb-pop']) $(`#${id}`).onclick = () => openPanel(id === 'tb-goods' ? 'production' : 'population');
  $('#tb-gold').onclick = () => openPanel('finances');
  $('#tb-happy').onclick = () => openPanel('population');

  function refreshHud() {
    const g = app.g;
    const cap = storage(g);
    for (const k of BAR_GOODS) {
      const el = $(`#res-${k}`);
      el.querySelector('.val').textContent = fmt(g.goods[k]);
      el.querySelector('.cap').textContent = `/${fmt(cap)}`;
      el.classList.toggle('full', g.goods[k] >= cap - 0.5);
      el.title = `${GOODS[k].name} : ${fmt1(g.goods[k])} (stockage ${fmt(cap)})`;
    }
    CLASSES.forEach((C, c) => {
      const el = $(`#cls-${c}`);
      el.hidden = c > 0 && g.era < c && g.cls[c] < 1;
      el.querySelector('.val').textContent = fmt(g.cls[c]);
      el.title = `${C.name} : ${fmt(g.cls[c])} habitants, ${fmt(Math.floor(g.cls[c] * WORKFORCE))} actifs`;
    });
    const f = g.lastFin || { taxes: 0, upkeep: 0, other: 0 };
    const net = f.taxes + f.other - f.upkeep;
    $('#tb-gold .val').textContent = fmt(g.gold);
    const d = $('#tb-gold .delta');
    d.textContent = `${signed(net)}/j`;
    d.classList.toggle('neg', net < 0);
    $('#tb-gold').title = `Or : ${fmt(g.gold)} — impôts ${fmt1(f.taxes)}, entretien −${fmt1(f.upkeep)} par jour`;
    const h = g.happiness ?? 60;
    $('#tb-happy .ic-wrap').innerHTML = icon(h >= 70 ? 'smile' : h >= 45 ? 'meh' : 'frown');
    $('#tb-happy .val').textContent = `${Math.round(h)} %`;
    $('#tb-happy').className = `tb-item ${h >= 70 ? 'good' : h >= 45 ? '' : 'bad'}`;
    $('#tb-happy').title = 'Satisfaction moyenne des habitants';
    $('#tb-date').innerHTML = `${icon(SEASONS[season(g)].icon)}<span class="date-text">${dateText(g)}</span>`;
    $('#tb-date').title = dateText(g);
    $('#era-name').textContent = ERAS[g.era].name;
    $('[data-panel="era"]').classList.toggle('ready', !!eraStatus(g)?.ok);
    refreshQuest();
  }

  function refreshQuest() {
    const p = questProgress(app.g);
    const box = $('#quest');
    if (!p) { box.innerHTML = `<div class="q-title">${icon('crown')}Tous les objectifs sont remplis</div>`; return; }
    box.innerHTML = `<div class="q-title">${icon('target')}<span>${esc(p.q.text)}</span></div>
      ${bar(p.cur / p.max, 'thin')}
      <div class="q-sub"><span>${fmt(p.cur)} / ${fmt(p.max)}</span>${costHtml(null, p.q.reward)}</div>`;
  }
  $('#quest').onclick = () => openPanel('quests');

  // ---------- Barre d'outils ----------
  function renderCats() {
    $('#cats').innerHTML = CATEGORIES.map((c) =>
      `<button class="cat ${c.id === cat ? 'active' : ''}" data-cat="${c.id}" title="${c.name}">${icon(c.icon)}<span class="cat-name">${c.name}</span></button>`).join('');
    for (const b of document.querySelectorAll('.cat')) {
      b.onclick = () => { cat = b.dataset.cat; app.act.sound('click'); renderCats(); renderItems(); };
    }
  }

  function items() {
    if (cat === 'tools') return TOOLS.map((t) => ({ ...t, isTool: true }));
    return Object.entries(BUILDINGS)
      .filter(([, d]) => d.cat === cat && d.buildable !== false)
      .map(([id, d]) => ({ id, ...d }));
  }

  function renderItems() {
    const g = app.g;
    $('#items').innerHTML = items().map((it) => {
      const locked = !it.isTool && eraLocked(g, it.id);
      const visual = it.isTool ? `<span class="item-ic">${icon(it.icon)}</span>` : `<img class="item-thumb" src="${thumb(it.id, 1, g.era)}" alt="">`;
      return `<button class="item ${app.ui.tool === it.id ? 'active' : ''} ${locked ? 'locked' : ''}" data-id="${it.id}">
        ${visual}
        <span class="item-name">${esc(it.name)}</span>
        <span class="item-cost">${locked ? `${icon('lock')}${ERAS[it.era].name}` : it.cost ? costHtml(g, it.cost) : ''}</span>
      </button>`;
    }).join('');
    for (const b of document.querySelectorAll('.item')) {
      b.onclick = () => app.act.selectTool(b.dataset.id);
      b.onmouseenter = () => showItemTip(b);
      b.onmouseleave = () => hideTip();
    }
  }

  function showItemTip(el) {
    const id = el.dataset.id;
    const d = BUILDINGS[id] || TOOLS.find((t) => t.id === id);
    let html = `<b>${esc(d.name)}</b><p>${esc(d.desc)}</p>`;
    if (BUILDINGS[id]) {
      if (d.workers) html += `<p class="row">${icon('users')} ${d.workers[1]} ${CLASSES[d.workers[0]].name.toLowerCase()}</p>`;
      if (d.consumes || d.produces) {
        html += `<p class="row">${d.consumes ? Object.entries(d.consumes).map(([k, v]) => goodTag(k, v)).join('') + icon('chevron-right') : ''}${Object.entries(d.produces || {}).map(([k, v]) => goodTag(k, v)).join('')}<span class="muted">/ jour</span></p>`;
      }
      if (d.upkeep) html += `<p class="row muted">Entretien ${fmt1(d.upkeep)} or / jour</p>`;
      if (eraLocked(app.g, id)) html += `<p class="warn">Débloqué à l'ère : ${ERAS[d.era].name}</p>`;
    }
    const r = el.getBoundingClientRect();
    showTip(html, r.left + r.width / 2, r.top - 8, 'above');
  }

  function refreshToolbar() {
    const g = app.g;
    for (const b of document.querySelectorAll('.item')) {
      b.classList.toggle('active', app.ui.tool === b.dataset.id);
      const d = BUILDINGS[b.dataset.id];
      if (d && eraLocked(g, b.dataset.id) !== b.classList.contains('locked')) { renderItems(); return; }
      const costEl = b.querySelector('.cost');
      const cost = (d || TOOLS.find((t) => t.id === b.dataset.id)).cost;
      if (costEl && cost) costEl.outerHTML = costHtml(g, cost);
    }
    const chip = $('#toolchip');
    const t = app.ui.tool;
    chip.hidden = t === 'inspect';
    if (t !== 'inspect') {
      const d = BUILDINGS[t] || TOOLS.find((x) => x.id === t);
      chip.querySelector('.label').textContent = d.name;
    }
  }
  $('#toolchip button').onclick = () => app.act.cancelTool();

  // ---------- Info-bulle ----------
  const tip = $('#tooltip');
  function showTip(html, x, y, where = 'cursor') {
    tip.innerHTML = html;
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = where === 'above' ? x - w / 2 : x + 16;
    let top = where === 'above' ? y - h : y + 16;
    left = Math.max(8, Math.min(innerWidth - w - 8, left));
    top = Math.max(8, Math.min(innerHeight - h - 8, top));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  function hideTip() { tip.hidden = true; }

  function buildingTip(b, x, y) {
    const g = app.g;
    const d = def(b);
    let line = '';
    if (b.fire > 0) line = '<span class="bad">En feu !</span>';
    else if (b.build) line = `Chantier : encore ${b.build} jours`;
    else if (isHouse(b)) line = `${CLASSES[b.level - 1].name} : ${fmt(b.res)}/${capOf(b)} · satisfaction ${pct(b.sat ?? 0)}`;
    else if (d.workers) line = isWorking(b) ? `Efficacité ${pct(b.eff || (d.produces ? 0 : 1))}` : '<span class="warn">À l\'arrêt</span>';
    showTip(`<b>${esc(isHouse(b) ? CLASSES[b.level - 1].house : d.name)}</b>${line ? `<p>${line}</p>` : ''}`, x, y);
    void g;
  }

  // ---------- Panneau latéral ----------
  const panelEl = $('#panel');
  panelEl.querySelector('.close').onclick = () => closePanel();

  function openPanel(kind, data) {
    panel = { kind, data };
    panelEl.hidden = false;
    renderPanel();
    for (const b of document.querySelectorAll('#sidebtns button')) b.classList.toggle('active', b.dataset.panel === kind);
  }
  function closePanel() {
    panel = null;
    panelEl.hidden = true;
    app.ui.selected = null;
    for (const b of document.querySelectorAll('#sidebtns button')) b.classList.remove('active');
  }

  for (const b of document.querySelectorAll('#sidebtns button[data-panel]')) {
    b.innerHTML = icon(b.dataset.icon);
    b.onclick = () => {
      app.act.sound('click');
      if (panel?.kind === b.dataset.panel) closePanel();
      else { app.ui.selected = null; openPanel(b.dataset.panel); }
    };
  }

  function renderPanel() {
    if (!panel) return;
    const g = app.g;
    const body = panelEl.querySelector('.content');
    const r = PANELS[panel.kind]?.(g, panel.data);
    if (r == null) { closePanel(); return; }
    const scroll = body.scrollTop;
    body.innerHTML = r;
    body.scrollTop = scroll;
    for (const el of body.querySelectorAll('[data-act]')) {
      el.onclick = () => {
        const [act, ...args] = el.dataset.act.split(':');
        app.act[act]?.(...args);
        renderPanel();
      };
    }
    if (panel.kind === 'finances') drawChart();
  }

  const head = (title, ic, sub = '') => `<header class="p-head">${ic ? `<span class="p-ic">${icon(ic)}</span>` : ''}<div><h2>${title}</h2>${sub ? `<div class="p-sub">${sub}</div>` : ''}</div></header>`;

  const PANELS = {
    building(g, b) {
      if (!g.buildings.includes(b)) return null;
      const d = def(b);
      const name = isHouse(b) ? CLASSES[b.level - 1].house : d.name;
      let html = `<header class="p-head"><img class="p-thumb" src="${thumb(b.type, b.level, g.era)}" alt=""><div><h2>${esc(name)}</h2><div class="p-sub">${esc(isHouse(b) ? CLASSES[b.level - 1].name : CATEGORIES.find((c) => c.id === d.cat)?.name || '')}</div></div></header>`;
      const desc = isHouse(b)
        ? `Abrite des ${CLASSES[b.level - 1].name.toLowerCase()}. ${b.level < CLASSES.length ? 'Évolue d\'elle-même quand ses habitants sont satisfaits et que l\'ère le permet.' : 'Niveau le plus élevé.'}`
        : d.desc;
      html += `<p class="muted">${esc(desc)}</p>`;

      if (b.fire > 0) {
        html += `<div class="alert danger">${icon('flame')}<div><b>En feu depuis ${b.fire - 1} jour(s).</b> Détruit dans ${Math.max(0, FIRE.burnDays - b.fire + 1)} jours.
          ${b.cover.fire ? '<br>Les pompiers arrivent.' : b.cover.well ? '' : '<br>Aucun puits proche : impossible d\'organiser une chaîne de seaux.'}</div></div>`;
        if (b.cover.well && !b.cover.fire) html += `<div class="btns"><button class="primary" data-act="bucket">${icon('droplets')}Chaîne de seaux (${FIRE.bucketCost} or)</button></div>`;
      }
      if (b.build) {
        const total = d.buildDays;
        html += `<div class="alert">${icon('construction')}<div><b>Chantier en cours</b> — encore ${b.build} jours.</div></div>${bar(1 - b.build / total)}`;
      }
      if (!b.build && (d.workers || isHouse(b)) && !b.connected) html += `<div class="alert warn">${icon('unlink')}<div>Pas relié à l'hôtel de ville par une route.</div></div>`;

      if (isHouse(b)) {
        const C = CLASSES[b.level - 1];
        html += `<div class="kv"><span>Habitants</span><b>${fmt(b.res)} / ${C.cap}</b></div>${bar((b.res || 0) / C.cap)}`;
        html += `<div class="kv"><span>Satisfaction</span><b>${pct(b.sat ?? 0)}</b></div>${bar(b.sat ?? 0)}`;
        html += `<div class="kv"><span>Impôts</span><b>${fmt1(C.tax)} or / habitant / jour</b></div>`;
        html += '<h3>Besoins</h3><ul class="needs">';
        for (const n of houseNeeds(g, b)) html += `<li><span>${esc(n.label)}</span>${bar(n.value, 'small')}<b>${pct(n.value)}</b></li>`;
        html += '</ul>';
        const up = upgradeStatus(g, b);
        if (!up.max) {
          const next = CLASSES[b.level];
          html += `<h3>Évolution en ${next.house.toLowerCase()} (${next.name.toLowerCase()})</h3>`;
          html += `<div class="kv"><span>Coût</span>${costHtml(g, next.upgrade)}</div>`;
          html += up.ok ? '<p class="good">Prête à évoluer.</p>' : `<p class="muted">${esc(up.reason)}</p>`;
          html += `<div class="btns">
            <button data-act="upgradeHouse" ${up.ok ? '' : 'disabled'}>${icon('arrow-up')}Faire évoluer</button>
            <button data-act="toggleLock" class="${b.lock ? 'active' : ''}">${icon(b.lock ? 'lock' : 'lock-open')}${b.lock ? 'Évolution bloquée' : 'Bloquer l\'évolution'}</button>
          </div><p class="muted small">Bloquer l'évolution garde des ${C.name.toLowerCase()} pour travailler dans les bâtiments qui en ont besoin.</p>`;
        }
      } else {
        if (d.workers) {
          const [c, n] = d.workers;
          html += `<div class="kv"><span>Ouvriers (${CLASSES[c].name.toLowerCase()})</span><b>${b.assigned || 0} / ${n}</b></div>${bar((b.assigned || 0) / n)}`;
        }
        if (d.produces) {
          html += `<div class="kv"><span>Efficacité</span><b>${pct(b.eff || 0)}</b></div>`;
          html += `<h3>Production par jour à plein régime</h3><p class="row big">${d.consumes ? Object.entries(d.consumes).map(([k, v]) => goodTag(k, v)).join('') + icon('chevron-right') : ''}${Object.entries(d.produces).map(([k, v]) => goodTag(k, v)).join('')}</p>`;
          if (b.starved) html += `<div class="alert warn">${icon('package-x')}<div>Matières premières insuffisantes.</div></div>`;
          if (b.full) html += `<div class="alert">${icon('warehouse')}<div>Stockage plein : la production est arrêtée.</div></div>`;
          if (d.seasonal) html += `<p class="muted small">Selon la saison : ${SEASONS.map((s, i) => `${s.name.toLowerCase()} ×${d.seasonal[i].toLocaleString('fr-FR')}`).join(', ')}.</p>`;
        }
        if (d.service) html += `<div class="kv"><span>Portée</span><b>${d.service.r} cases ${isWorking(b) ? '' : '<span class="warn">(inactif)</span>'}</b></div>`;
        if (d.decor) html += `<div class="kv"><span>Beauté</span><b>+${d.decor.v} sur ${d.decor.r} cases</b></div>`;
        if (d.storage) html += `<div class="kv"><span>Stockage</span><b>+${d.storage} par marchandise</b></div>`;
        if (b.type === 'townhall') html += `<div class="kv"><span>Ère</span><b>${ERAS[g.era].name}</b></div><div class="kv"><span>Stockage total</span><b>${fmt(storage(g))} par marchandise</b></div>`;
      }
      if (d.upkeep) html += `<div class="kv"><span>Entretien</span><b>${fmt1(d.upkeep)} or / jour</b></div>`;
      const fireOk = b.cover.fire ? 'protégé par les pompiers' : b.cover.well ? 'risque réduit (puits proche)' : 'aucune protection';
      if (b.type !== 'townhall' && b.type !== 'ruins' && !(d.fire === 0)) html += `<div class="kv"><span>Incendie</span><b class="${b.cover.fire ? 'good' : 'warn'}">${fireOk}</b></div>`;

      const btns = [];
      if (d.workers && !b.build) btns.push(`<button data-act="togglePause">${icon(b.paused ? 'play' : 'pause')}${b.paused ? 'Reprendre' : 'Mettre en pause'}</button>`);
      if (b.type !== 'townhall' && !(b.type === 'wonder' && !b.build)) btns.push(`<button class="danger" data-act="demolishSelected">${icon('trash-2')}Démolir</button>`);
      if (btns.length) html += `<div class="btns">${btns.join('')}</div>`;
      return html;
    },

    quests(g) {
      let html = head('Objectifs', 'target');
      const p = questProgress(g);
      html += '<ul class="quests">';
      QUESTS.forEach((q, i) => {
        if (i < g.quest) html += `<li class="done">${icon('check')}<span>${esc(q.text)}</span></li>`;
        else if (i === g.quest) html += `<li class="current">${icon('target')}<div><b>${esc(q.text)}</b>${bar(p.cur / p.max, 'thin')}<div class="q-sub"><span>${fmt(p.cur)} / ${fmt(p.max)}</span>${costHtml(null, q.reward)}</div></div></li>`;
        else if (i < g.quest + 4) html += `<li class="next"><span class="dot"></span><span>${esc(q.text)}</span></li>`;
      });
      html += '</ul>';
      if (g.quest + 4 < QUESTS.length) html += `<p class="muted small">Encore ${QUESTS.length - g.quest - 4} objectifs jusqu'à la Grande Cathédrale.</p>`;
      return html;
    },

    era(g) {
      let html = head('Ères', 'crown', `Ère actuelle : ${ERAS[g.era].name}`);
      html += `<ol class="eras">${ERAS.map((e, i) => `<li class="${i < g.era ? 'done' : i === g.era ? 'current' : ''}">${e.name}</li>`).join('')}</ol>`;
      const s = eraStatus(g);
      if (!s) return `${html}<p class="good">Dernière ère atteinte : bâtissez la Grande Cathédrale.</p>`;
      html += `<h3>Prochaine ère : ${s.next.name}</h3><ul class="checks">`;
      for (const r of s.reqs) html += `<li class="${r.ok ? 'ok' : 'no'}">${icon(r.ok ? 'check' : 'x')}<span>${esc(r.text)}${r.max ? ` <span class="muted">(${fmt(r.cur)} / ${fmt(r.max)})</span>` : ''}</span></li>`;
      html += '</ul>';
      const unlocks = Object.entries(BUILDINGS).filter(([, d]) => d.era === g.era + 1);
      if (unlocks.length) html += `<h3>Débloque</h3><div class="unlocks">${unlocks.map(([id, d]) => `<span><img src="${thumb(id, 1, g.era)}" alt="">${esc(d.name)}</span>`).join('')}</div>`;
      if (CLASSES[g.era + 1]) html += `<p>Les maisons pourront accueillir des <b>${CLASSES[g.era + 1].name.toLowerCase()}</b>.</p>`;
      html += `<div class="btns"><button class="primary" data-act="advanceEra" ${s.ok ? '' : 'disabled'}>${icon('crown')}Passer à l'ère : ${s.next.name}</button></div>`;
      return html;
    },

    population(g) {
      let html = head('Population', 'users', `${fmt(population(g))} habitants · satisfaction ${Math.round(g.happiness ?? 0)} %`);
      CLASSES.forEach((C, c) => {
        if (c > g.era && g.cls[c] < 1) return;
        const houses = g.buildings.filter((b) => isHouse(b) && b.level === c + 1);
        const sat = houses.length ? houses.reduce((n, b) => n + (b.sat ?? 0), 0) / houses.length : 0;
        const workers = Math.floor(g.cls[c] * WORKFORCE);
        html += `<section class="cls-card" style="--cls:${C.color}">
          <div class="cls-top"><span class="dot"></span><b>${C.name}</b><span class="muted">${houses.length} ${C.house.toLowerCase()}${houses.length > 1 ? 's' : ''}</span><b class="right">${fmt(g.cls[c])}</b></div>
          <div class="kv"><span>Actifs employés</span><b>${fmt(workers - g.idle[c])} / ${fmt(workers)}</b></div>
          <div class="kv"><span>Satisfaction moyenne</span><b>${pct(sat)}</b></div>${bar(sat)}
          <ul class="needs">`;
        for (const n of C.needs) {
          let v;
          if (n.food) v = g.supply[c].food ?? 1;
          else if (n.good) v = g.supply[c][n.good] ?? 1;
          else if (n.service) v = houses.length ? houses.filter((b) => b.cover[n.service]).length / houses.length : 0;
          else v = houses.length ? houses.reduce((s, b) => s + Math.min(1, (b.decor || 0) / n.decor), 0) / houses.length : 0;
          const label = n.good ? GOODS[n.good].name : n.label;
          html += `<li><span>${n.good ? icon(GOODS[n.good].icon) : ''}${esc(label)}</span>${bar(v, 'small')}<b>${pct(v)}</b></li>`;
        }
        html += '</ul></section>';
      });
      html += `<h3>Impôts</h3><div class="seg">${TAXES.map((t, i) => `<button data-act="setTax:${i}" class="${g.tax === i ? 'active' : ''}">${t.name}</button>`).join('')}</div>
        <p class="muted small">Impôts bas : +10 % de satisfaction, ×0,6 recettes. Élevés : −15 % de satisfaction, ×1,5 recettes.</p>`;
      return html;
    },

    production(g) {
      const cap = storage(g);
      let html = head('Marchandises', 'factory', `Stockage : ${fmt(cap)} par marchandise`);
      html += '<table class="goods"><tr><th></th><th>Stock</th><th>Produit</th><th>Consommé</th><th>Bilan</th></tr>';
      for (const k of GOOD_KEYS) {
        const p = g.flow.prod[k] || 0, u = g.flow.use[k] || 0;
        if (!g.goods[k] && !p && !u && !(g.flow.demand?.[k])) continue;
        const net = p - u;
        html += `<tr><td>${goodTag(k)} ${GOODS[k].name}</td><td>${fmt(g.goods[k])}${g.goods[k] >= cap - 0.5 ? ' <span class="warn small">plein</span>' : ''}</td><td>${fmt1(p)}</td><td>${fmt1(u)}</td><td class="${net < -0.05 ? 'neg' : net > 0.05 ? 'pos' : ''}">${signed(net)}</td></tr>`;
      }
      html += '</table><p class="muted small">Chiffres de la dernière journée. Une marchandise en déficit finira par manquer.</p>';
      return html;
    },

    finances(g) {
      const f = g.lastFin || { taxes: 0, upkeep: 0, other: 0 };
      const net = f.taxes + f.other - f.upkeep;
      let html = head('Finances', 'landmark', `Trésor : ${fmt(g.gold)} or`);
      html += `<ul class="parts">
        <li><span>Impôts</span><b class="pos">+${fmt1(f.taxes)}</b></li>
        ${f.other ? `<li><span>Hôtel des monnaies</span><b class="pos">+${fmt1(f.other)}</b></li>` : ''}
        <li><span>Entretien des bâtiments</span><b class="neg">−${fmt1(f.upkeep)}</b></li>
        <li class="total"><span>Solde par jour</span><b class="${net < 0 ? 'neg' : 'pos'}">${signed(net)}</b></li></ul>`;
      if (g.broke) html += `<div class="alert danger">${icon('triangle-alert')}<div>Caisses vides : la production tourne à moitié et les habitants sont mécontents.</div></div>`;
      const byType = {};
      for (const b of g.buildings) if (def(b).upkeep && !b.build) byType[b.type] = (byType[b.type] || 0) + def(b).upkeep;
      const top = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6);
      if (top.length) html += `<h3>Principaux coûts d'entretien</h3><ul class="parts">${top.map(([t, v]) => `<li><span>${BUILDINGS[t].name}</span><b>−${fmt1(v)}</b></li>`).join('')}</ul>`;
      html += `<h3>Impôts</h3><div class="seg">${TAXES.map((t, i) => `<button data-act="setTax:${i}" class="${g.tax === i ? 'active' : ''}">${t.name}</button>`).join('')}</div>`;
      html += '<h3>Évolution</h3><canvas id="chart" width="600" height="240"></canvas>';
      return html;
    },

    trade(g) {
      let html = head('Commerce', 'scale');
      html += tradeHasPost(g)
        ? '<p class="muted small">Votre comptoir achète et vend à bon prix.</p>'
        : '<p class="muted small">Sans comptoir (ère du Bourg), l\'hôtel de ville achète cher (+50 %) et revend à moitié prix.</p>';
      html += '<table class="trade">';
      for (const k of GOOD_KEYS) {
        if (!g.goods[k] && !(g.flow.demand?.[k]) && !(g.flow.prod[k]) && !['wood', 'planks', 'stone', 'fish'].includes(k)) continue;
        html += `<tr><td>${goodTag(k)} ${GOODS[k].name}<br><span class="muted small">stock ${fmt(g.goods[k])}</span></td>
          <td class="tbtns"><button data-act="buy:${k}:10">Acheter 10<small>−${Math.ceil(buyPrice(g, k) * 10)} or</small></button>
          <button data-act="sell:${k}:10">Vendre 10<small>+${Math.floor(sellPrice(g, k) * 10)} or</small></button></td></tr>`;
      }
      return `${html}</table>`;
    },

    log(g) {
      return `${head('Journal', 'scroll-text')}<ul class="log">${g.log.map((l) =>
        `<li class="${l.kind}"><span class="muted">j ${l.day}</span><span>${esc(l.text)}</span></li>`).join('')}</ul>`;
    },

    options(g) {
      const ui = app.ui;
      const opt = (key, label) => `<label class="toggle"><input type="checkbox" data-opt="${key}" ${ui[key] ? 'checked' : ''}><span>${label}</span></label>`;
      return `${head('Options', 'settings')}
        ${opt('sound', 'Sons')}
        ${opt('icons', 'Alertes au-dessus des bâtiments')}
        ${opt('minimap', 'Mini-carte')}
        ${opt('keepTool', 'Garder l\'outil après une construction')}
        <div class="btns col">
          <button data-act="help">${icon('circle-help')}Comment jouer</button>
          <button data-act="exportSave">${icon('download')}Exporter la sauvegarde</button>
          <button data-act="importSave">${icon('upload')}Importer une sauvegarde</button>
          <button class="danger" data-act="newGame">${icon('rotate-ccw')}Nouvelle partie</button>
        </div>
        <p class="muted small">Carte n° ${g.seed}. Sauvegarde automatique dans ce navigateur.</p>`;
    },
  };

  panelEl.addEventListener('change', (e) => {
    const opt = e.target.dataset?.opt;
    if (opt) app.act.setOption(opt, e.target.checked);
  });

  function drawChart() {
    const c = document.getElementById('chart');
    if (!c) return;
    const h = app.g.history;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (h.length < 2) {
      ctx.fillStyle = '#93a196';
      ctx.font = '22px Inter, system-ui';
      ctx.fillText('Les courbes apparaissent après quelques jours.', 20, 125);
      return;
    }
    const series = [['pop', 'Population', '#6aa7e8'], ['gold', 'Or', '#e9c46a']];
    const rowH = c.height / series.length;
    series.forEach(([key, label, color], i) => {
      const vals = h.map((p) => p[key]);
      const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
      const y0 = i * rowH + 30, hh = rowH - 42;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(0, y0 + hh); ctx.lineTo(c.width, y0 + hh); ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      vals.forEach((v, j) => {
        const x = (j / (vals.length - 1)) * (c.width - 10) + 5;
        const y = y0 + hh - ((v - min) / (max - min || 1)) * hh;
        if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '600 20px Inter, system-ui';
      ctx.fillText(`${label} : ${fmt(vals[vals.length - 1])}`, 6, y0 - 8);
    });
  }

  // ---------- Calques ----------
  const OVERLAYS = [
    [null, 'Vue normale', 'eye'],
    ['sat', 'Satisfaction des maisons', 'smile'],
    ['well', 'Accès à l\'eau', 'droplets'],
    ['market', 'Marchés', 'store'],
    ['chapel', 'Chapelles', 'church'],
    ['fire', 'Protection incendie', 'flame'],
    ['decor', 'Beauté', 'sparkles'],
  ];
  const ovMenu = $('#overlay-menu');
  function renderOverlayMenu() {
    ovMenu.innerHTML = OVERLAYS.map(([id, label, ic]) =>
      `<button data-ov="${id ?? ''}" class="${(app.ui.overlay ?? null) === id ? 'active' : ''}">${icon(ic)}${label}</button>`).join('');
    for (const b of ovMenu.querySelectorAll('button')) {
      b.onclick = () => { app.ui.overlay = b.dataset.ov || null; renderOverlayMenu(); ovMenu.hidden = true; $('#btn-overlay').classList.toggle('active', !!app.ui.overlay); };
    }
  }
  $('#btn-overlay').innerHTML = icon('layers');
  $('#btn-overlay').onclick = () => { renderOverlayMenu(); ovMenu.hidden = !ovMenu.hidden; };

  // ---------- Messages ----------
  const KIND_ICON = { good: 'check', danger: 'flame', warn: 'triangle-alert', error: 'x', '': 'info' };
  function toast(text, kind = '', focus = null) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `${icon(KIND_ICON[kind] || 'info')}<span>${esc(text)}</span>`;
    if (focus) {
      el.classList.add('clickable');
      el.onclick = () => app.act.focus(focus);
    }
    box.prepend(el);
    while (box.children.length > 4) box.lastChild.remove();
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, kind === 'danger' ? 7000 : 3500);
  }

  // ---------- Fenêtres ----------
  const modalEl = $('#modal');
  function showModal(html, buttons) {
    modalQueue.push({ html, buttons });
    if (modalEl.hidden) nextModal();
  }
  function nextModal() {
    const m = modalQueue.shift();
    if (!m) { modalEl.hidden = true; app.act.modalClosed(); return; }
    modalEl.hidden = false;
    app.act.modalOpened();
    const box = modalEl.querySelector('.box');
    box.innerHTML = `${m.html}<div class="btns">${m.buttons.map((b, i) =>
      `<button class="${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>`;
    for (const el of box.querySelectorAll('[data-i]')) {
      el.onclick = () => {
        const b = m.buttons[Number(el.dataset.i)];
        b.onClick?.();
        nextModal();
      };
    }
  }

  return {
    refresh() {
      refreshHud();
      refreshToolbar();
      // Pas de rafraîchissement sous le pointeur : un bouton remplacé en plein clic serait perdu.
      if (panel && !panelEl.matches(':hover')) renderPanel();
    },
    renderItems,
    renderCats,
    setCat(c) { cat = c; renderCats(); renderItems(); },
    openPanel,
    renderPanel,
    closePanel,
    get panelKind() { return panel?.kind; },
    toast,
    showModal,
    showTip,
    hideTip,
    buildingTip,
    get modalOpen() { return !modalEl.hidden; },
  };
}
