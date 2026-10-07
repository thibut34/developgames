// Interface HTML : barre du haut, barre d'outils, panneaux, info-bulles, fenêtres, messages.
import {
  MAP, BUILDINGS, GOODS, GOOD_KEYS, GOLD, BAR_GOODS, TOOLS, CATEGORIES, ERAS, CLASSES, TERRAIN, CLEAR,
  TAXES, QUESTS, SEASONS, FIRE, WORKFORCE, TECHS,
} from './config.js';
import {
  storage, canAfford, amount, eraLocked, def, isWorking, houseNeeds, upgradeStatus, eraStatus,
  questProgress, buyPrice, sellPrice, tradeHasPost, dateText, season, capOf, isHouse, population,
  lockReason, techStatus, renownStatus, WEATHER_NAMES,
} from './game.js';
import { DIFFICULTIES } from './scenarios.js';
import { icon } from './icons.js';
import { thumb } from './thumbs.js';
import { L, EN, locale, lang } from './i18n.js';

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => Math.floor(n).toLocaleString(locale);
const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString(locale);
const signed = (n) => (n >= 0 ? '+' : '−') + fmt1(Math.abs(n));
const pct = (v) => `${Math.round(v * 100)}${EN ? '' : ' '}%`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// L'or et les points de recherche ne sont pas des marchandises mais s'affichent comme elles.
const RESEARCH = { name: L('Recherche', 'Research'), icon: 'flask-conical' };
const resInfo = (k) => (k === 'gold' ? GOLD : k === 'research' ? RESEARCH : GOODS[k]);

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

  // Textes fixes de index.html (écrits en français).
  if (EN) {
    document.documentElement.lang = 'en';
    const TITLES = {
      '#tb-goods': 'Goods', '[data-speed="0"]': 'Pause (space)', '[data-speed="1"]': 'Normal speed',
      '[data-speed="2"]': 'Speed ×2', '[data-speed="4"]': 'Speed ×4', '#quest': 'See the goals',
      '[data-panel="quests"]': 'Goals', '[data-panel="era"]': 'Eras', '[data-panel="research"]': 'Research',
      '[data-panel="population"]': 'Population and taxes', '[data-panel="production"]': 'Goods',
      '[data-panel="finances"]': 'Finances', '[data-panel="trade"]': 'Trade', '[data-panel="log"]': 'Log',
      '#btn-overlay': 'View layers', '[data-panel="options"]': 'Options', '#minimap': 'Minimap: tap to move there',
      '#toolchip button': 'Cancel (Escape or right-click)',
    };
    for (const [sel, t] of Object.entries(TITLES)) $(sel).title = t;
    $('#panel .close').setAttribute('aria-label', 'Close');
    $('#toolchip button').textContent = 'Cancel';
  }

  // ---------- Barre du haut ----------
  $('#tb-goods').innerHTML = BAR_GOODS.map((k) => `
    <div class="tb-item res" id="res-${k}"><span class="ic-wrap">${icon(GOODS[k].icon)}</span><b class="val"></b><span class="cap"></span></div>`).join('');
  $('#tb-pop').innerHTML = CLASSES.map((C, c) => `
    <div class="tb-item cls" id="cls-${c}" style="--cls:${C.color}"><span class="dot"></span><b class="val"></b><span class="lbl">${C.name}</span></div>`).join('');
  $('#tb-gold').innerHTML = `<span class="ic-wrap gold">${icon('coins')}</span><b class="val"></b><span class="delta"></span>`;
  $('#tb-happy').innerHTML = `<span class="ic-wrap"></span><b class="val"></b>`;
  $('#tb-rp').innerHTML = `<span class="ic-wrap rp">${icon('flask-conical')}</span><b class="val"></b>`;
  $('#tb-rp').onclick = () => openPanel('research');
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
      el.title = L(`${GOODS[k].name} : ${fmt1(g.goods[k])} (stockage ${fmt(cap)})`, `${GOODS[k].name}: ${fmt1(g.goods[k])} (storage ${fmt(cap)})`);
    }
    CLASSES.forEach((C, c) => {
      const el = $(`#cls-${c}`);
      el.hidden = c > 0 && g.era < c && g.cls[c] < 1;
      el.querySelector('.val').textContent = fmt(g.cls[c]);
      el.title = L(`${C.name} : ${fmt(g.cls[c])} habitants, ${fmt(Math.floor(g.cls[c] * WORKFORCE))} actifs`, `${C.name}: ${fmt(g.cls[c])} residents, ${fmt(Math.floor(g.cls[c] * WORKFORCE))} workers`);
    });
    const f = g.lastFin || { taxes: 0, upkeep: 0, other: 0 };
    const net = f.taxes + f.other - f.upkeep;
    $('#tb-gold .val').textContent = fmt(g.gold);
    const d = $('#tb-gold .delta');
    d.textContent = `${signed(net)}/${L('j', 'd')}`;
    d.classList.toggle('neg', net < 0);
    $('#tb-gold').title = L(`Or : ${fmt(g.gold)} — impôts ${fmt1(f.taxes)}, entretien −${fmt1(f.upkeep)} par jour`, `Gold: ${fmt(g.gold)} — taxes ${fmt1(f.taxes)}, upkeep −${fmt1(f.upkeep)} per day`);
    const h = g.happiness ?? 60;
    $('#tb-happy .ic-wrap').innerHTML = icon(h >= 70 ? 'smile' : h >= 45 ? 'meh' : 'frown');
    $('#tb-happy .val').textContent = pct(h / 100);
    $('#tb-happy').className = `tb-item ${h >= 70 ? 'good' : h >= 45 ? '' : 'bad'}`;
    $('#tb-happy').title = L('Satisfaction moyenne des habitants', 'Average satisfaction of the residents');
    // Catastrophe annoncée ou en cours
    const wx = g.weather, wb = $('#tb-weather');
    wb.hidden = !wx;
    if (wx) {
      const name = WEATHER_NAMES[wx.type]();
      const left = wx.phase === 'warn' ? wx.at - g.day : wx.type === 'tornado' ? wx.steps : wx.end - g.day;
      wb.className = `tb-item weather ${wx.phase === 'on' ? 'on' : ''}`;
      wb.innerHTML = `${icon({ tornado: 'tornado', storm: 'cloud-lightning', heat: 'thermometer-sun' }[wx.type])}<span>${wx.phase === 'warn'
        ? L(`${name} dans ${left} j`, `${name} in ${left} d`) : L(`${name} · ${left} j`, `${name} · ${left} d`)}</span>`;
      wb.title = wx.phase === 'warn' ? L('Catastrophe annoncée', 'Disaster on its way') : L('Catastrophe en cours', 'Disaster under way');
    }
    $('#tb-date').innerHTML = `${icon(SEASONS[season(g)].icon)}<span class="date-text">${dateText(g)}</span>`;
    $('#tb-date').title = dateText(g);
    $('#era-name').textContent = ERAS[g.era].name;
    $('#tb-rp .val').textContent = fmt(g.rp);
    $('#tb-rp').title = `${L('Points de recherche :', 'Research points:')} ${fmt(g.rp)}`;
    $('[data-panel="research"]').classList.toggle('ready', TECHS.some((t) => techStatus(g, t).ok));
    $('[data-panel="era"]').classList.toggle('ready', !!eraStatus(g)?.ok);
    refreshQuest();
  }

  function refreshQuest() {
    const box = $('#quest');
    const p = questProgress(app.g);
    if (!p) {
      // Objectifs terminés : la renommée prend le relais, sans fin.
      const r = renownStatus(app.g);
      box.innerHTML = `<div class="q-title">${icon('medal')}<span>${r.title ? esc(r.title) : L('Renommée', 'Renown')}</span></div>
        ${bar(r.pop / r.next.pop, 'thin')}
        <div class="q-sub"><span>${L(`Prochain titre à ${fmt(r.next.pop)} habitants`, `Next title at ${fmt(r.next.pop)} residents`)}</span>${costHtml(null, r.next.reward)}</div>`;
      return;
    }
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
      const locked = it.isTool ? (it.era || 0) > g.era : eraLocked(g, it.id);
      const lockLabel = (it.era || 0) > g.era ? ERAS[it.era].name : it.tech && !g.tech.includes(it.tech) ? L('Recherche', 'Research') : it.after ? BUILDINGS[it.after].name : '';
      const visual = it.isTool ? `<span class="item-ic">${icon(it.icon)}</span>` : `<img class="item-thumb" src="${thumb(it.id, 1, g.era)}" alt="">`;
      return `<button class="item ${app.ui.tool === it.id ? 'active' : ''} ${locked ? 'locked' : ''}" data-id="${it.id}">
        ${visual}
        <span class="item-name">${esc(it.name)}</span>
        <span class="item-cost">${locked ? `${icon('lock')}${esc(lockLabel)}` : it.cost ? costHtml(g, it.cost) : ''}</span>
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
        html += `<p class="row">${d.consumes ? Object.entries(d.consumes).map(([k, v]) => goodTag(k, v)).join('') + icon('chevron-right') : ''}${Object.entries(d.produces || {}).map(([k, v]) => goodTag(k, v)).join('')}<span class="muted">/ ${L('jour', 'day')}</span></p>`;
      }
      if (d.upkeep) html += `<p class="row muted">${L(`Entretien ${fmt1(d.upkeep)} or / jour`, `Upkeep ${fmt1(d.upkeep)} gold / day`)}</p>`;
      const lock = lockReason(app.g, id);
      if (lock) html += `<p class="warn">${esc(lock)}</p>`;
    } else if ((d.era || 0) > app.g.era) {
      html += `<p class="warn">${L(`Débloqué à l'ère : ${ERAS[d.era].name}`, `Unlocked in the era: ${ERAS[d.era].name}`)}</p>`;
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
    if (b.fire > 0) line = `<span class="bad">${L('En feu !', 'On fire!')}</span>`;
    else if (b.build) line = L(`Chantier : encore ${b.build} jours`, `Under construction: ${b.build} days left`);
    else if (isHouse(b)) line = `${CLASSES[b.level - 1].name}${L(' :', ':')} ${fmt(b.res)}/${capOf(b)} · satisfaction ${pct(b.sat ?? 0)}`;
    else if (d.workers) line = isWorking(b) ? `${L('Efficacité', 'Efficiency')} ${pct(b.eff || (d.produces ? 0 : 1))}` : `<span class="warn">${L('À l\'arrêt', 'Stopped')}</span>`;
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
        ? L(`Abrite des ${CLASSES[b.level - 1].name.toLowerCase()}. ${b.level < CLASSES.length ? 'Évolue d\'elle-même quand ses habitants sont satisfaits et que l\'ère le permet.' : 'Niveau le plus élevé.'}`,
          `Houses ${CLASSES[b.level - 1].name.toLowerCase()}. ${b.level < CLASSES.length ? 'Upgrades by itself when its residents are satisfied and the era allows it.' : 'Highest level.'}`)
        : d.desc;
      html += `<p class="muted">${esc(desc)}</p>`;

      if (b.fire > 0) {
        html += `<div class="alert danger">${icon('flame')}<div>${L(`<b>En feu depuis ${b.fire - 1} jour(s).</b> Détruit dans ${Math.max(0, FIRE.burnDays - b.fire + 1)} jours.`, `<b>On fire for ${b.fire - 1} day(s).</b> Destroyed in ${Math.max(0, FIRE.burnDays - b.fire + 1)} days.`)}
          ${b.cover.fire ? `<br>${L('Les pompiers arrivent.', 'The firefighters are on their way.')}` : b.cover.well ? '' : `<br>${L('Aucun puits proche : impossible d\'organiser une chaîne de seaux.', 'No well nearby: a bucket brigade is impossible.')}`}</div></div>`;
        if (b.cover.well && !b.cover.fire) html += `<div class="btns"><button class="primary" data-act="bucket">${icon('droplets')}${L(`Chaîne de seaux (${FIRE.bucketCost} or)`, `Bucket brigade (${FIRE.bucketCost} gold)`)}</button></div>`;
      }
      if (b.build) {
        const total = d.buildDays;
        html += `<div class="alert ${b.stalled ? 'warn' : ''}">${icon('construction')}<div><b>${b.stalled ? L('Chantier arrêté', 'Construction halted') : L('Chantier en cours', 'Under construction')}</b> — ${L(`encore ${b.build} jours.`, `${b.build} days left.`)}${d.buildUse ? `<br>${L('Consomme chaque jour :', 'Uses every day:')} ${costHtml(g, d.buildUse)}` : ''}</div></div>${bar(1 - b.build / total)}`;
      }
      if (!b.build && (d.workers || isHouse(b)) && !b.connected) html += `<div class="alert warn">${icon('unlink')}<div>${L('Pas relié à l\'hôtel de ville par une route.', 'Not linked to the town hall by a road.')}</div></div>`;

      if (isHouse(b)) {
        const C = CLASSES[b.level - 1];
        html += `<div class="kv"><span>${L('Habitants', 'Residents')}</span><b>${fmt(b.res)} / ${C.cap}</b></div>${bar((b.res || 0) / C.cap)}`;
        html += `<div class="kv"><span>${L('Satisfaction', 'Satisfaction')}</span><b>${pct(b.sat ?? 0)}</b></div>${bar(b.sat ?? 0)}`;
        html += `<div class="kv"><span>${L('Impôts', 'Taxes')}</span><b>${L(`${fmt1(C.tax)} or / habitant / jour`, `${fmt1(C.tax)} gold / resident / day`)}</b></div>`;
        html += `<h3>${L('Besoins', 'Needs')}</h3><ul class="needs">`;
        for (const n of houseNeeds(g, b)) html += `<li><span>${esc(n.label)}</span>${bar(n.value, 'small')}<b>${pct(n.value)}</b></li>`;
        html += '</ul>';
        const up = upgradeStatus(g, b);
        if (!up.max) {
          const next = CLASSES[b.level];
          html += `<h3>${L(`Évolution en ${next.house.toLowerCase()} (${next.name.toLowerCase()})`, `Upgrade to ${next.house.toLowerCase()} (${next.name.toLowerCase()})`)}</h3>`;
          html += `<div class="kv"><span>${L('Coût', 'Cost')}</span>${costHtml(g, next.upgrade)}</div>`;
          html += up.ok ? `<p class="good">${L('Prête à évoluer.', 'Ready to upgrade.')}</p>` : `<p class="muted">${esc(up.reason)}</p>`;
          html += `<div class="btns">
            <button data-act="upgradeHouse" ${up.ok ? '' : 'disabled'}>${icon('arrow-up')}${L('Faire évoluer', 'Upgrade')}</button>
            <button data-act="toggleLock" class="${b.lock ? 'active' : ''}">${icon(b.lock ? 'lock' : 'lock-open')}${b.lock ? L('Évolution bloquée', 'Upgrade locked') : L('Bloquer l\'évolution', 'Lock upgrade')}</button>
          </div><p class="muted small">${L(`Bloquer l'évolution garde des ${C.name.toLowerCase()} pour travailler dans les bâtiments qui en ont besoin.`, `Locking the upgrade keeps ${C.name.toLowerCase()} available to work in the buildings that need them.`)}</p>`;
        }
      } else {
        if (d.workers) {
          const [c, n] = d.workers;
          html += `<div class="kv"><span>${L('Ouvriers', 'Workers')} (${CLASSES[c].name.toLowerCase()})</span><b>${b.assigned || 0} / ${n}</b></div>${bar((b.assigned || 0) / n)}`;
        }
        if (d.produces) {
          html += `<div class="kv"><span>${L('Efficacité', 'Efficiency')}</span><b>${pct(b.eff || 0)}</b></div>`;
          html += `<h3>${L('Production par jour à plein régime', 'Daily output at full capacity')}</h3><p class="row big">${d.consumes ? Object.entries(d.consumes).map(([k, v]) => goodTag(k, v)).join('') + icon('chevron-right') : ''}${Object.entries(d.produces).map(([k, v]) => goodTag(k, v)).join('')}</p>`;
          if (b.starved) html += `<div class="alert warn">${icon('package-x')}<div>${L('Matières premières insuffisantes.', 'Not enough raw materials.')}</div></div>`;
          if (b.full) html += `<div class="alert">${icon('warehouse')}<div>${L('Stockage plein : la production est arrêtée.', 'Storage full: production has stopped.')}</div></div>`;
          if (d.seasonal) html += `<p class="muted small">${L('Selon la saison :', 'By season:')} ${SEASONS.map((s, i) => `${s.name.toLowerCase()} ×${d.seasonal[i].toLocaleString(locale)}`).join(', ')}.</p>`;
        }
        if (d.service) html += `<div class="kv"><span>${L('Portée', 'Range')}</span><b>${d.service.r} ${L('cases', 'tiles')} ${isWorking(b) ? '' : `<span class="warn">(${L('inactif', 'inactive')})</span>`}</b></div>`;
        if (d.decor) html += `<div class="kv"><span>${L('Beauté', 'Beauty')}</span><b>${L(`+${d.decor.v} sur ${d.decor.r} cases`, `+${d.decor.v} over ${d.decor.r} tiles`)}</b></div>`;
        if (d.storage) html += `<div class="kv"><span>${L('Stockage', 'Storage')}</span><b>${L(`+${d.storage} par marchandise`, `+${d.storage} per good`)}</b></div>`;
        if (b.type === 'townhall') html += `<div class="kv"><span>${L('Ère', 'Era')}</span><b>${ERAS[g.era].name}</b></div><div class="kv"><span>${L('Stockage total', 'Total storage')}</span><b>${fmt(storage(g))} ${L('par marchandise', 'per good')}</b></div>`;
      }
      if (d.upkeep) html += `<div class="kv"><span>${L('Entretien', 'Upkeep')}</span><b>${L(`${fmt1(d.upkeep)} or / jour`, `${fmt1(d.upkeep)} gold / day`)}</b></div>`;
      const fireOk = b.cover.fire ? L('protégé par les pompiers', 'protected by firefighters') : b.cover.well ? L('risque réduit (puits proche)', 'reduced risk (well nearby)') : L('aucune protection', 'no protection');
      if (b.type !== 'townhall' && b.type !== 'ruins' && !(d.fire === 0)) html += `<div class="kv"><span>${L('Incendie', 'Fire')}</span><b class="${b.cover.fire ? 'good' : 'warn'}">${fireOk}</b></div>`;

      const btns = [];
      if (d.workers && !b.build) btns.push(`<button data-act="togglePause">${icon(b.paused ? 'play' : 'pause')}${b.paused ? L('Reprendre', 'Resume') : L('Mettre en pause', 'Pause')}</button>`);
      if (b.type !== 'townhall' && !(b.type === 'wonder' && !b.build)) btns.push(`<button class="danger" data-act="demolishSelected">${icon('trash-2')}${L('Démolir', 'Demolish')}</button>`);
      if (btns.length) html += `<div class="btns">${btns.join('')}</div>`;
      return html;
    },

    quests(g) {
      let html = head(L('Objectifs', 'Goals'), 'target');
      const p = questProgress(g);
      html += '<ul class="quests">';
      QUESTS.forEach((q, i) => {
        if (i < g.quest) html += `<li class="done">${icon('check')}<span>${esc(q.text)}</span></li>`;
        else if (i === g.quest) html += `<li class="current">${icon('target')}<div><b>${esc(q.text)}</b>${bar(p.cur / p.max, 'thin')}<div class="q-sub"><span>${fmt(p.cur)} / ${fmt(p.max)}</span>${costHtml(null, q.reward)}</div></div></li>`;
        else if (i < g.quest + 4) html += `<li class="next"><span class="dot"></span><span>${esc(q.text)}</span></li>`;
      });
      html += '</ul>';
      if (g.quest + 4 < QUESTS.length) html += `<p class="muted small">${L(`Encore ${QUESTS.length - g.quest - 4} objectifs ensuite.`, `${QUESTS.length - g.quest - 4} more goals after that.`)}</p>`;
      // Renommée : paliers de population sans fin
      const r = renownStatus(g);
      html += `<h3>${L('Renommée', 'Renown')}</h3>
        <div class="kv"><span>${L('Titre de la cité', 'City title')}</span><b>${r.title ? esc(r.title) : L('Aucun pour l\'instant', 'None yet')}</b></div>
        <div class="kv"><span>${L(`Prochain : ${esc(r.next.title)}`, `Next: ${esc(r.next.title)}`)}</span><b>${fmt(r.pop)} / ${fmt(r.next.pop)}</b></div>${bar(r.pop / r.next.pop, 'thin')}
        <div class="q-sub"><span class="muted small">${L('Récompense', 'Reward')}</span>${costHtml(null, r.next.reward)}</div>
        <p class="muted small">${L('Les paliers de renommée continuent sans fin : faites grandir votre cité aussi loin que vous le voulez.', 'Renown tiers never end: grow your city as far as you like.')}</p>`;
      return html;
    },

    era(g) {
      let html = head(L('Ères', 'Eras'), 'crown', `${L('Ère actuelle :', 'Current era:')} ${ERAS[g.era].name}`);
      html += `<ol class="eras">${ERAS.map((e, i) => `<li class="${i < g.era ? 'done' : i === g.era ? 'current' : ''}">${e.name}</li>`).join('')}</ol>`;
      const s = eraStatus(g);
      if (!s) return `${html}<p class="good">${L('Dernière ère atteinte : achevez le Palais royal et faites grandir votre capitale.', 'Final era reached: complete the Royal Palace and keep growing your capital.')}</p>`;
      html += `<h3>${L('Prochaine ère :', 'Next era:')} ${s.next.name}</h3><ul class="checks">`;
      for (const r of s.reqs) html += `<li class="${r.ok ? 'ok' : 'no'}">${icon(r.ok ? 'check' : 'x')}<span>${esc(r.text)}${r.max ? ` <span class="muted">(${fmt(r.cur)} / ${fmt(r.max)})</span>` : ''}</span></li>`;
      html += '</ul>';
      const unlocks = Object.entries(BUILDINGS).filter(([, d]) => d.era === g.era + 1);
      if (unlocks.length) html += `<h3>${L('Débloque', 'Unlocks')}</h3><div class="unlocks">${unlocks.map(([id, d]) => `<span><img src="${thumb(id, 1, g.era)}" alt="">${esc(d.name)}</span>`).join('')}</div>`;
      if (CLASSES[g.era + 1]) html += `<p>${L('Les maisons pourront accueillir des', 'Houses will be able to hold')} <b>${CLASSES[g.era + 1].name.toLowerCase()}</b>.</p>`;
      html += `<div class="btns"><button class="primary" data-act="advanceEra" ${s.ok ? '' : 'disabled'}>${icon('crown')}${L('Passer à l\'ère :', 'Advance to:')} ${s.next.name}</button></div>`;
      return html;
    },

    population(g) {
      let html = head('Population', 'users', `${fmt(population(g))} ${L('habitants', 'residents')} · satisfaction ${pct((g.happiness ?? 0) / 100)}`);
      CLASSES.forEach((C, c) => {
        if (c > g.era && g.cls[c] < 1) return;
        const houses = g.buildings.filter((b) => isHouse(b) && b.level === c + 1);
        const sat = houses.length ? houses.reduce((n, b) => n + (b.sat ?? 0), 0) / houses.length : 0;
        const workers = Math.floor(g.cls[c] * WORKFORCE);
        html += `<section class="cls-card" style="--cls:${C.color}">
          <div class="cls-top"><span class="dot"></span><b>${C.name}</b><span class="muted">${houses.length} ${C.house.toLowerCase()}${houses.length > 1 && !C.house.endsWith('s') ? 's' : ''}</span><b class="right">${fmt(g.cls[c])}</b></div>
          <div class="kv"><span>${L('Actifs employés', 'Employed workers')}</span><b>${fmt(workers - g.idle[c])} / ${fmt(workers)}</b></div>
          <div class="kv"><span>${L('Satisfaction moyenne', 'Average satisfaction')}</span><b>${pct(sat)}</b></div>${bar(sat)}
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
      html += `<h3>${L('Impôts', 'Taxes')}</h3><div class="seg">${TAXES.map((t, i) => `<button data-act="setTax:${i}" class="${g.tax === i ? 'active' : ''}">${t.name}</button>`).join('')}</div>
        <p class="muted small">${L('Impôts bas : +10 % de satisfaction, ×0,6 recettes. Élevés : −15 % de satisfaction, ×1,5 recettes.', 'Low taxes: +10% satisfaction, ×0.6 income. High: −15% satisfaction, ×1.5 income.')}</p>`;
      return html;
    },

    production(g) {
      const cap = storage(g);
      let html = head(L('Marchandises', 'Goods'), 'factory', L(`Stockage : ${fmt(cap)} par marchandise`, `Storage: ${fmt(cap)} per good`));
      html += `<table class="goods"><tr><th></th><th>Stock</th><th>${L('Produit', 'Made')}</th><th>${L('Consommé', 'Used')}</th><th>${L('Bilan', 'Net')}</th></tr>`;
      for (const k of GOOD_KEYS) {
        const p = g.flow.prod[k] || 0, u = g.flow.use[k] || 0;
        if (!g.goods[k] && !p && !u && !(g.flow.demand?.[k])) continue;
        const net = p - u;
        html += `<tr><td>${goodTag(k)} ${GOODS[k].name}</td><td>${fmt(g.goods[k])}${g.goods[k] >= cap - 0.5 ? ` <span class="warn small">${L('plein', 'full')}</span>` : ''}</td><td>${fmt1(p)}</td><td>${fmt1(u)}</td><td class="${net < -0.05 ? 'neg' : net > 0.05 ? 'pos' : ''}">${signed(net)}</td></tr>`;
      }
      html += `</table><p class="muted small">${L('Chiffres de la dernière journée. Une marchandise en déficit finira par manquer.', 'Figures for the last day. A good in deficit will eventually run out.')}</p>`;
      return html;
    },

    finances(g) {
      const f = g.lastFin || { taxes: 0, upkeep: 0, other: 0 };
      const net = f.taxes + f.other - f.upkeep;
      let html = head('Finances', 'landmark', L(`Trésor : ${fmt(g.gold)} or`, `Treasury: ${fmt(g.gold)} gold`));
      html += `<ul class="parts">
        <li><span>${L('Impôts', 'Taxes')}</span><b class="pos">+${fmt1(f.taxes)}</b></li>
        ${f.other ? `<li><span>${BUILDINGS.mint.name}</span><b class="pos">+${fmt1(f.other)}</b></li>` : ''}
        <li><span>${L('Entretien des bâtiments', 'Building upkeep')}</span><b class="neg">−${fmt1(f.upkeep)}</b></li>
        <li class="total"><span>${L('Solde par jour', 'Balance per day')}</span><b class="${net < 0 ? 'neg' : 'pos'}">${signed(net)}</b></li></ul>`;
      if (g.broke) html += `<div class="alert danger">${icon('triangle-alert')}<div>${L('Caisses vides : la production tourne à moitié et les habitants sont mécontents.', 'Empty treasury: production runs at half speed and residents are unhappy.')}</div></div>`;
      const byType = {};
      for (const b of g.buildings) if (def(b).upkeep && !b.build) byType[b.type] = (byType[b.type] || 0) + def(b).upkeep;
      const top = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6);
      if (top.length) html += `<h3>${L('Principaux coûts d\'entretien', 'Main upkeep costs')}</h3><ul class="parts">${top.map(([t, v]) => `<li><span>${BUILDINGS[t].name}</span><b>−${fmt1(v)}</b></li>`).join('')}</ul>`;
      html += `<h3>${L('Impôts', 'Taxes')}</h3><div class="seg">${TAXES.map((t, i) => `<button data-act="setTax:${i}" class="${g.tax === i ? 'active' : ''}">${t.name}</button>`).join('')}</div>`;
      html += `<h3>${L('Évolution', 'History')}</h3><canvas id="chart" width="600" height="240"></canvas>`;
      return html;
    },

    trade(g) {
      let html = head(L('Commerce', 'Trade'), 'scale');
      // Contrats maritimes
      const homePort = g.buildings.some((b) => b.type === 'port' && !b.build && g.isl.id[b.y * MAP + b.x] === 0);
      html += `<h3>${L('Contrats maritimes', 'Maritime contracts')}</h3>`;
      if (!homePort) {
        html += `<p class="muted small">${L('Construisez un port sur l\'île principale (technologie Navigation) : des navires marchands viendront proposer des contrats lucratifs.', 'Build a harbour on the main island (Navigation technology): merchant ships will come and offer lucrative contracts.')}</p>`;
      } else {
        const list = g.contracts || [];
        if (!list.length) html += `<p class="muted small">${L('Aucun contrat en cours. Un navire marchand accostera bientôt.', 'No contract under way. A merchant ship will dock soon.')}</p>`;
        for (const c of list) {
          const left = c.until - g.day, ok = g.goods[c.k] >= c.n;
          html += `<div class="contract"><div class="ct-top"><b>${esc(c.origin)}</b><span class="${left < 10 ? 'warn' : 'muted'} small">${L(`${left} j restants`, `${left} d left`)}</span></div>
            <div class="ct-row">${goodTag(c.k)} ${fmt(Math.min(g.goods[c.k], c.n))} / ${fmt(c.n)} ${esc(GOODS[c.k].name.toLowerCase())}${icon('chevron-right')}${costHtml(null, c.reward)}</div>
            ${bar(Math.min(1, g.goods[c.k] / c.n), 'thin')}
            <button class="${ok ? 'primary' : ''}" data-act="deliver:${c.id}" ${ok ? '' : 'disabled'}>${icon('package-check')}${L('Livrer', 'Deliver')}</button></div>`;
        }
        html += `<p class="muted small">${L(`Réputation du port : ${g.shipRep || 0}. Chaque contrat honoré augmente les récompenses ; un contrat expiré la fait baisser.`, `Harbour reputation: ${g.shipRep || 0}. Each contract fulfilled raises the rewards; an expired one lowers it.`)}</p>`;
      }
      html += `<h3>${L('Marché', 'Market')}</h3>`;
      html += `<p class="muted small">${tradeHasPost(g)
        ? L('Votre comptoir achète et vend à bon prix.', 'Your trading post buys and sells at good prices.')
        : L('Sans comptoir (ère du Bourg), l\'hôtel de ville achète cher (+50 %) et revend à moitié prix.', 'Without a trading post (Market town era), the town hall buys at a premium (+50%) and sells at half price.')}</p>`;
      html += '<table class="trade">';
      for (const k of GOOD_KEYS) {
        if (!g.goods[k] && !(g.flow.demand?.[k]) && !(g.flow.prod[k]) && !['wood', 'planks', 'stone', 'fish'].includes(k)) continue;
        html += `<tr><td>${goodTag(k)} ${GOODS[k].name}<br><span class="muted small">stock ${fmt(g.goods[k])}</span></td>
          <td class="tbtns"><button data-act="buy:${k}:10">${L('Acheter 10', 'Buy 10')}<small>−${Math.ceil(buyPrice(g, k) * 10)} ${GOLD.name.toLowerCase()}</small></button>
          <button data-act="sell:${k}:10">${L('Vendre 10', 'Sell 10')}<small>+${Math.floor(sellPrice(g, k) * 10)} ${GOLD.name.toLowerCase()}</small></button></td></tr>`;
      }
      return `${html}</table>`;
    },

    research(g) {
      let html = head(L('Recherche', 'Research'), 'flask-conical', L(`${fmt(g.rp)} points de recherche disponibles`, `${fmt(g.rp)} research points available`));
      const rate = g.buildings.reduce((n, b) => n + (b.output?.research || 0), 0) * g.mods.research;
      html += `<p class="muted small">${L(`Production : ${fmt1(rate)} point(s) par jour. Construisez des bibliothèques, puis des universités.`, `Output: ${fmt1(rate)} point(s) per day. Build libraries, then universities.`)}</p>`;
      ERAS.forEach((e, i) => {
        const list = TECHS.filter((t) => t.era === i);
        if (!list.length) return;
        html += `<h3>${e.name}</h3><div class="techs">`;
        for (const t of list) {
          const s = techStatus(g, t);
          const cls = s.done ? 'done' : s.ok ? 'ready' : t.era > g.era ? 'locked' : '';
          html += `<div class="tech ${cls}"><div class="t-ic">${icon(s.done ? 'check' : t.icon)}</div><div class="t-body"><b>${esc(t.name)}</b><span>${esc(t.desc)}</span>`;
          if (!s.done) html += `<span class="t-foot"><span class="c">${icon('flask-conical')}${t.cost}</span>${s.ok ? `<button class="primary" data-act="research:${t.id}">${L('Rechercher', 'Research')}</button>` : `<em>${esc(s.reason)}</em>`}</span>`;
          html += '</div></div>';
        }
        html += '</div>';
      });
      return html;
    },

    log(g) {
      return `${head(L('Journal', 'Log'), 'scroll-text')}<ul class="log">${g.log.map((l) =>
        `<li class="${l.kind}"><span class="muted">${L('j', 'd')} ${l.day}</span><span>${esc(l.text)}</span></li>`).join('')}</ul>`;
    },

    options(g) {
      const ui = app.ui;
      const opt = (key, label) => `<label class="toggle"><input type="checkbox" data-opt="${key}" ${ui[key] ? 'checked' : ''}><span>${label}</span></label>`;
      return `${head('Options', 'settings')}
        ${opt('sound', L('Sons', 'Sound'))}
        ${opt('icons', L('Alertes au-dessus des bâtiments', 'Alerts above buildings'))}
        ${opt('minimap', L('Mini-carte', 'Minimap'))}
        ${opt('keepTool', L('Garder l\'outil après une construction', 'Keep the tool after building'))}
        <h3>${L('Langue', 'Language')}</h3>
        <div class="seg"><button data-act="setLang:fr" class="${lang === 'fr' ? 'active' : ''}">Français</button><button data-act="setLang:en" class="${lang === 'en' ? 'active' : ''}">English</button></div>
        <h3>${L('Sauvegarder', 'Save')}</h3>
        <div class="seg">${[1, 2, 3].map((i) => `<button data-act="saveSlot:${i}">${icon('save')}${L('Emplacement', 'Slot')} ${i}</button>`).join('')}</div>
        <div class="btns col">
          <button data-act="help">${icon('circle-help')}${L('Comment jouer', 'How to play')}</button>
          <button data-act="toMenu">${icon('menu')}${L('Menu principal', 'Main menu')}</button>
          ${app.platform?.files === false ? '' : `<button data-act="exportSave">${icon('download')}${L('Exporter la sauvegarde', 'Export save')}</button>
          <button data-act="importSave">${icon('upload')}${L('Importer une sauvegarde', 'Import save')}</button>`}
          <button class="danger" data-act="newGame">${icon('rotate-ccw')}${L('Nouvelle partie', 'New game')}</button>
        </div>
        <p class="muted small">${L(`Carte n° ${g.seed} · difficulté ${DIFFICULTIES[g.difficulty ?? 1].name.toLowerCase()}. Sauvegarde automatique.`, `Map #${g.seed} · ${DIFFICULTIES[g.difficulty ?? 1].name.toLowerCase()} difficulty. Saved automatically.`)}</p>`;
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
      ctx.fillText(L('Les courbes apparaissent après quelques jours.', 'The charts appear after a few days.'), 20, 125);
      return;
    }
    const series = [['pop', 'Population', '#6aa7e8'], ['gold', GOLD.name, '#e9c46a']];
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
      ctx.fillText(`${label}${L(' :', ':')} ${fmt(vals[vals.length - 1])}`, 6, y0 - 8);
    });
  }

  // ---------- Calques ----------
  const OVERLAYS = [
    [null, L('Vue normale', 'Normal view'), 'eye'],
    ['sat', L('Satisfaction des maisons', 'House satisfaction'), 'smile'],
    ['well', L('Accès à l\'eau', 'Water access'), 'droplets'],
    ['market', L('Marchés', 'Markets'), 'store'],
    ['chapel', L('Chapelles', 'Chapels'), 'church'],
    ['fire', L('Protection incendie', 'Fire protection'), 'flame'],
    ['decor', L('Beauté', 'Beauty'), 'sparkles'],
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
