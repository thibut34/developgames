// Interface HTML : barre du haut, barre d'outils, panneaux, fenêtres, messages.
import {
  BUILDINGS, RES, RES_KEYS, TOOLS, CATEGORIES, ERAS, HOUSE_LEVELS, NEED_NAMES, TERRAIN, CLEAR,
  TAXES, QUESTS, SEASONS, MAX_LEVEL, LEVEL_OUTPUT, UPKEEP,
} from './config.js';
import {
  housing, storage, canAfford, costText, eraLocked, def, workersNeeded, isWorking, houseNeeds,
  canUpgrade, upgradeCost, eraStatus, questProgress, hasMarket, price, sellRatio, dateText,
  dayOfSeason, capOf,
} from './game.js';

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => Math.floor(n).toLocaleString('fr-FR');
const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('fr-FR');
const signed = (n) => (n >= 0 ? '+' : '−') + fmt1(Math.abs(n));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function happyEmoji(h) {
  return h >= 75 ? '😄' : h >= 55 ? '🙂' : h >= 35 ? '😐' : h >= 20 ? '☹️' : '😡';
}

export function createUI(app) {
  // app : { g (getter), ui (état d'interface), act : actions }
  let cat = 'tools';
  let panel = null;      // { kind, data }
  const modalQueue = [];

  // ---------- Barre du haut ----------
  const resBox = $('#resources');
  resBox.innerHTML = RES_KEYS.map((k) => `
    <div class="pill res" id="res-${k}" title="${RES[k].name}">
      <span class="ico">${RES[k].icon}</span><span class="val"></span><span class="cap"></span><span class="delta"></span>
    </div>`).join('');

  function refreshHud() {
    const g = app.g;
    const cap = storage(g);
    for (const k of RES_KEYS) {
      const el = $(`#res-${k}`);
      const locked = (k === 'iron' || k === 'tools') && g.era < 1 && g.res[k] < 1;
      el.hidden = locked;
      el.querySelector('.val').textContent = fmt(g.res[k]);
      el.querySelector('.cap').textContent = k === 'gold' ? '' : `/${fmt(cap)}`;
      const d = g.lastGain[k] || 0;
      const del = el.querySelector('.delta');
      del.textContent = Math.abs(d) >= 0.05 ? signed(d) : '';
      del.classList.toggle('neg', d < 0);
      el.classList.toggle('full', k !== 'gold' && g.res[k] >= cap - 0.5);
      el.classList.toggle('alert', (k === 'food' && g.starving) || (k === 'wood' && g.cold));
      el.title = `${RES[k].name} : ${fmt1(g.res[k])}${k !== 'gold' ? ` (stockage ${fmt(cap)})` : ''} — ${signed(d)} par jour`;
    }
    $('#pop .val').textContent = `${fmt(g.pop)}/${fmt(housing(g))}`;
    $('#pop').title = `Habitants : ${fmt(g.pop)} pour ${fmt(housing(g))} places — ${g.idle} sans emploi`;
    $('#happy .ico').textContent = happyEmoji(g.happiness);
    $('#happy .val').textContent = `${Math.round(g.happiness)}`;
    $('#happy').classList.toggle('alert', g.happiness < 30);
    const [icon, ...rest] = `${dateText(g)} · j${dayOfSeason(g)}`.split(' ');
    $('#date').innerHTML = `<span>${icon}</span> <span class="date-text">${rest.join(' ')}</span>`;
    $('#date').title = dateText(g);
    $('#era-name').textContent = ERAS[g.era].name;
    const es = eraStatus(g);
    $('#btn-era').classList.toggle('ready', !!es?.ok);
    refreshQuest();
  }

  function refreshQuest() {
    const p = questProgress(app.g);
    const box = $('#quest');
    if (!p) { box.innerHTML = '<b>🏆 Tous les objectifs sont remplis !</b>'; return; }
    const pct = Math.round((p.cur / p.max) * 100);
    box.innerHTML = `<div class="q-title">🎯 ${esc(p.q.text)}</div>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <div class="q-sub">${fmt(p.cur)}/${fmt(p.max)} · récompense ${costText(p.q.reward)}</div>`;
  }

  // ---------- Barre d'outils ----------
  function renderCats() {
    $('#cats').innerHTML = CATEGORIES.map((c) =>
      `<button class="cat ${c.id === cat ? 'active' : ''}" data-cat="${c.id}" title="${c.name}">
        <span>${c.icon}</span><span class="cat-name">${c.name}</span></button>`).join('');
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
      const poor = it.cost && !canAfford(g, it.cost);
      return `<button class="item ${app.ui.tool === it.id ? 'active' : ''} ${locked ? 'locked' : ''} ${poor ? 'poor' : ''}"
          data-id="${it.id}" title="${esc(it.desc || it.name)}">
        <span class="item-icon">${locked ? '🔒' : it.icon}</span>
        <span class="item-name">${esc(it.name)}</span>
        <span class="item-cost">${locked ? ERAS[it.era].name : it.cost ? costText(it.cost) : '&nbsp;'}</span>
      </button>`;
    }).join('');
    for (const b of document.querySelectorAll('.item')) {
      b.onclick = () => app.act.selectTool(b.dataset.id);
    }
  }

  function refreshToolbar() {
    const g = app.g;
    for (const b of document.querySelectorAll('.item')) {
      const id = b.dataset.id;
      const d = BUILDINGS[id] || TOOLS.find((t) => t.id === id);
      b.classList.toggle('active', app.ui.tool === id);
      b.classList.toggle('poor', !!(d.cost && !canAfford(g, d.cost)));
      const locked = BUILDINGS[id] && eraLocked(g, id);
      if (locked !== b.classList.contains('locked')) { renderItems(); return; }
    }
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

  for (const b of document.querySelectorAll('#sidebtns button')) {
    b.onclick = () => {
      app.act.sound('click');
      if (panel?.kind === b.dataset.panel) closePanel();
      else { app.ui.selected = null; openPanel(b.dataset.panel); }
    };
  }
  $('#quest').onclick = () => openPanel('quests');

  function renderPanel() {
    if (!panel) return;
    const g = app.g;
    const body = panelEl.querySelector('.content');
    const r = PANELS[panel.kind]?.(g, panel.data);
    if (r == null) { closePanel(); return; }
    body.innerHTML = r;
    bindPanel(body);
    if (panel.kind === 'stats') drawChart();
  }

  function bindPanel(body) {
    for (const el of body.querySelectorAll('[data-act]')) {
      el.onclick = () => {
        const [act, ...args] = el.dataset.act.split(':');
        app.act[act]?.(...args);
        renderPanel();
      };
    }
  }

  const statusLine = (b) => {
    const d = def(b);
    if (b.fire > 0) return `<p class="warn">🔥 En feu ! Encore ${b.fire} jours avant destruction. <button data-act="extinguish">Éteindre</button></p>`;
    if (b.paused) return '<p class="warn">⏸️ En pause</p>';
    if ((d.workers || b.type === 'house') && !b.connected) return '<p class="warn">🚧 Pas relié à l\'hôtel de ville par une route.</p>';
    if (d.workers && !b.assigned) return '<p class="warn">👷 Aucun ouvrier disponible. Il faut plus d\'habitants.</p>';
    if (b.starved) return `<p class="warn">❗ Il manque des matières premières (${costText(d.consumes)}).</p>`;
    return '';
  };

  const PANELS = {
    building(g, b) {
      if (!g.buildings.includes(b)) return null;
      const d = def(b);
      let html = `<h2>${d.icon} ${esc(b.type === 'house' ? HOUSE_LEVELS[b.level].name : d.name)}${d.workers && d.produces ? ` <small>niv. ${b.level}</small>` : ''}</h2>`;
      html += `<p class="muted">${esc(d.desc)}</p>`;
      html += statusLine(b);
      if (b.type === 'house') {
        html += `<p>👥 Capacité : <b>${capOf(b)}</b> habitants · impôt ${HOUSE_LEVELS[b.level].tax.toLocaleString('fr-FR')} 🪙/hab.</p>`;
        html += `<p>🌸 Beauté du quartier : <b>${b.decor || 0}</b></p>`;
        const n = houseNeeds(g, b);
        if (n) {
          html += `<h3>Pour devenir « ${HOUSE_LEVELS[n.level].name} » (${HOUSE_LEVELS[n.level].cap} hab.)</h3><ul class="checks">`;
          if (!n.eraOk) html += `<li class="no">Ère requise : ${ERAS[HOUSE_LEVELS[n.level].era].name}</li>`;
          for (const x of n.list) html += `<li class="${x.ok ? 'ok' : 'no'}">${NEED_NAMES[x.need]}</li>`;
          html += '</ul>';
        } else {
          html += '<p class="good">⭐ Niveau maximum atteint.</p>';
        }
        const cur = houseNeeds(g, b, b.level);
        if (cur && b.level > 1 && !(cur.eraOk && cur.list.every((x) => x.ok))) {
          html += '<p class="warn">⚠️ Cette maison ne remplit plus ses besoins : elle va régresser.</p>';
        }
      }
      if (d.workers) html += `<p>👷 Ouvriers : <b>${b.assigned || 0}/${workersNeeded(b)}</b></p>`;
      if (d.produces) {
        const per = Object.entries(d.produces).map(([k, v]) => `${fmt1(v * LEVEL_OUTPUT[b.level])} ${RES[k].icon}`).join(', ');
        html += `<p>📦 Production max : ${per} /jour</p>`;
        if (b.output) html += `<p>📈 Hier : ${Object.entries(b.output).map(([k, v]) => `${fmt1(v)} ${RES[k].icon}`).join(', ')}</p>`;
      }
      if (d.consumes) html += `<p>🔻 Consomme : ${Object.entries(d.consumes).map(([k, v]) => `${fmt1(v * LEVEL_OUTPUT[b.level])} ${RES[k].icon}`).join(', ')} /jour</p>`;
      if (d.service) html += `<p>📡 Portée : ${d.service.r} cases ${isWorking(b) ? '' : '<span class="warn">(inactif)</span>'}</p>`;
      if (d.decor) html += `<p>🌸 Beauté +${d.decor.v} sur ${d.decor.r} cases</p>`;
      if (UPKEEP[b.type]) html += `<p>💸 Entretien : ${fmt1(UPKEEP[b.type])} 🪙/jour</p>`;
      if (d.seasonal) html += `<p class="muted">Saisons : ${SEASONS.map((s, i) => `${s.icon} ×${d.seasonal[i].toLocaleString('fr-FR')}`).join(' ')}</p>`;
      if (b.type === 'townhall') html += townhallInfo(g);

      const btns = [];
      const up = canUpgrade(g, b);
      if (!up.hidden) {
        btns.push(b.level < MAX_LEVEL
          ? `<button data-act="upgrade" ${up.ok ? '' : 'disabled'} title="${esc(up.reason || '')}">⬆️ Améliorer (${costText(upgradeCost(b))})</button>`
          : '<button disabled>⭐ Niveau max</button>');
      }
      if (d.workers) btns.push(`<button data-act="togglePause">${b.paused ? '▶️ Reprendre' : '⏸️ Pause'}</button>`);
      if (b.type !== 'townhall' && b.type !== 'wonder') btns.push('<button class="danger" data-act="demolishSelected">🔨 Démolir</button>');
      if (btns.length) html += `<div class="btns">${btns.join('')}</div>`;
      if (!up.hidden && !up.ok && up.reason && b.level < MAX_LEVEL) html += `<p class="muted small">${esc(up.reason)}</p>`;
      return html;
    },

    tile(g, t) {
      const ter = TERRAIN[t.type];
      let html = `<h2>${esc(ter.name)}</h2><p class="muted">Case ${t.x}, ${t.y}</p>`;
      if (ter.hint) html += `<p>${esc(ter.hint)}</p>`;
      if (CLEAR[t.type]) html += `<p>Peut être défriché avec l'outil 🪓 (${costText(CLEAR[t.type].cost)} → ${costText(CLEAR[t.type].gain)}).</p>`;
      if (t.road) html += '<p>🛤️ Route</p>';
      return html;
    },

    quests(g) {
      let html = '<h2>🎯 Objectifs</h2>';
      const p = questProgress(g);
      html += '<ul class="quests">';
      QUESTS.forEach((q, i) => {
        if (i < g.quest) html += `<li class="done">✅ ${esc(q.text)}</li>`;
        else if (i === g.quest) html += `<li class="current">▶️ <b>${esc(q.text)}</b> <span class="muted">(${fmt(p.cur)}/${fmt(p.max)})</span><br><small>Récompense : ${costText(q.reward)}</small></li>`;
        else if (i < g.quest + 3) html += `<li class="next">⬜ ${esc(q.text)}</li>`;
      });
      html += '</ul>';
      if (g.quest + 3 < QUESTS.length) html += `<p class="muted small">… et ${QUESTS.length - g.quest - 3} autres objectifs jusqu'à la merveille finale.</p>`;
      return html;
    },

    era(g) {
      let html = `<h2>⬆️ Ères</h2><p>Ère actuelle : <b>${ERAS[g.era].name}</b> (${g.era + 1}/${ERAS.length})</p>`;
      html += `<ol class="eras">${ERAS.map((e, i) => `<li class="${i < g.era ? 'done' : i === g.era ? 'current' : ''}">${e.name}</li>`).join('')}</ol>`;
      const s = eraStatus(g);
      if (!s) return `${html}<p class="good">🏆 Vous avez atteint la dernière ère ! Bâtissez la Grande Cathédrale.</p>`;
      html += `<h3>Prochaine ère : ${s.next.name}</h3><ul class="checks">`;
      for (const r of s.reqs) html += `<li class="${r.ok ? 'ok' : 'no'}">${esc(r.text)}${r.max ? ` <span class="muted">(${fmt(r.cur)}/${fmt(r.max)})</span>` : ''}</li>`;
      html += '</ul>';
      const unlocks = Object.values(BUILDINGS).filter((d) => d.era === g.era + 1);
      if (unlocks.length) html += `<p>Débloque : ${unlocks.map((d) => `${d.icon} ${esc(d.name)}`).join(', ')}</p>`;
      const houseUnlock = HOUSE_LEVELS.find((L) => L && L.era === g.era + 1);
      if (houseUnlock) html += `<p>Les maisons pourront devenir : <b>${houseUnlock.name}</b>.</p>`;
      html += `<div class="btns"><button class="primary" data-act="advanceEra" ${s.ok ? '' : 'disabled'}>Passer à l'ère : ${s.next.name}</button></div>`;
      return html;
    },

    stats(g) {
      let html = '<h2>📊 Statistiques</h2>';
      html += `<div class="statgrid">
        <div><b>${fmt(g.pop)}</b><span>habitants</span></div>
        <div><b>${fmt(housing(g))}</b><span>places</span></div>
        <div><b>${g.workforce}</b><span>actifs</span></div>
        <div><b>${g.idle}</b><span>sans emploi</span></div>
        <div><b>${Math.round(g.happiness)} ${happyEmoji(g.happiness)}</b><span>bonheur</span></div>
        <div><b>${g.buildings.length}</b><span>bâtiments</span></div>
      </div>`;
      html += `<h3>Bonheur visé : ${Math.round(g.happyTarget ?? g.happiness)}</h3><ul class="parts">`;
      for (const p of g.happyParts || []) html += `<li><span>${esc(p.label)}</span><b class="${p.v < 0 ? 'neg' : 'pos'}">${p.v > 0 ? '+' : ''}${p.v}</b></li>`;
      html += '</ul><p class="muted small">Le bonheur fait grandir la population et augmente la production (jusqu\'à +30 %).</p>';
      html += `<h3>Impôts</h3><div class="seg">${TAXES.map((t, i) =>
        `<button data-act="setTax:${i}" class="${g.tax === i ? 'active' : ''}">${t.name}</button>`).join('')}</div>
        <p class="muted small">Bas : +8 bonheur, ×0,6 or. Élevé : −12 bonheur, ×1,5 or.</p>`;
      html += '<h3>Bilan d\'hier</h3><ul class="parts">';
      for (const k of RES_KEYS) {
        const v = g.lastGain[k] || 0;
        html += `<li><span>${RES[k].icon} ${RES[k].name}</span><b class="${v < 0 ? 'neg' : 'pos'}">${signed(v)}</b></li>`;
      }
      html += `</ul><p class="muted small">Dont entretien des bâtiments : −${fmt1(g.upkeep || 0)} 🪙/jour.</p>`;
      html += '<h3>Évolution</h3><canvas id="chart" width="560" height="260"></canvas>';
      html += `<p class="muted small">Population max : ${fmt(g.stats.maxPop)} · Bâtiments construits : ${g.stats.built} · Incendies : ${g.stats.fires}</p>`;
      return html;
    },

    trade(g) {
      let html = '<h2>⚖️ Commerce</h2>';
      html += hasMarket(g)
        ? `<p class="muted small">Votre marché vend au juste prix et rachète à ${Math.round(sellRatio(g) * 100)} %.${sellRatio(g) < 0.85 ? ' Un ⚖️ Comptoir (ère du Bourg) rachète à 85 %.' : ''}</p>`
        : '<p class="muted small">Sans marché, l\'hôtel de ville achète cher (+50 %) et rachète à 50 %. Un 🏪 Marché (ère du Village) donne de bien meilleurs prix.</p>';
      html += '<p class="muted small">Les prix bougent chaque jour et selon vos achats et ventes.</p>';
      html += '<table class="trade"><tr><th></th><th>Stock</th><th></th></tr>';
      for (const k of RES_KEYS) {
        if (k === 'gold' || ((k === 'iron' || k === 'tools') && g.era < 1)) continue;
        const p = price(g, k);
        const sellFor = Math.floor(RES[k].price * g.prices[k] * 10 * sellRatio(g));
        html += `<tr><td>${RES[k].icon} ${RES[k].name}</td><td>${fmt(g.res[k])}</td>
          <td class="tbtns"><button data-act="buy:${k}:10">Acheter 10<br><small>−${Math.ceil(p * 10)} 🪙</small></button>
          <button data-act="sell:${k}:10">Vendre 10<br><small>+${sellFor} 🪙</small></button></td></tr>`;
      }
      return `${html}</table>`;
    },

    log(g) {
      return `<h2>📜 Journal</h2><ul class="log">${g.log.map((l) =>
        `<li class="${l.kind}"><span class="muted">j${l.day}</span> ${esc(l.text)}</li>`).join('')}</ul>`;
    },

    options(g) {
      const ui = app.ui;
      return `<h2>⚙️ Options</h2>
        <label class="toggle"><input type="checkbox" data-opt="sound" ${ui.sound ? 'checked' : ''}> 🔊 Sons</label>
        <label class="toggle"><input type="checkbox" data-opt="icons" ${ui.icons ? 'checked' : ''}> 🏷️ Icônes au-dessus des bâtiments</label>
        <label class="toggle"><input type="checkbox" data-opt="minimap" ${ui.minimap ? 'checked' : ''}> 🗺️ Mini-carte</label>
        <div class="btns col">
          <button data-act="help">❓ Comment jouer</button>
          <button data-act="exportSave">💾 Exporter la sauvegarde</button>
          <button data-act="importSave">📂 Importer une sauvegarde</button>
          <button class="danger" data-act="newGame">↻ Nouvelle partie</button>
        </div>
        <p class="muted small">Carte n° ${g.seed}. Partie sauvegardée automatiquement dans ce navigateur.</p>`;
    },
  };

  function townhallInfo(g) {
    return `<p>🏛️ Ère : <b>${ERAS[g.era].name}</b></p><p>📦 Stockage total : ${fmt(storage(g))} par ressource</p>
      <div class="btns"><button data-act="openEra">⬆️ Voir les ères</button></div>`;
  }

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
      ctx.fillStyle = '#a9b3a5';
      ctx.font = '22px system-ui';
      ctx.fillText('Les courbes apparaissent après quelques jours…', 20, 130);
      return;
    }
    const series = [['pop', 'Population', '#6aa7e8'], ['gold', 'Or', '#ffd257'], ['happy', 'Bonheur', '#7ddc8c']];
    const rowH = c.height / series.length;
    series.forEach(([key, label, color], i) => {
      const vals = h.map((p) => p[key]);
      const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
      const y0 = i * rowH + 8, hh = rowH - 22;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
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
      ctx.font = 'bold 20px system-ui';
      ctx.fillText(`${label} : ${fmt(vals[vals.length - 1])}`, 8, y0 + 18);
    });
  }

  // ---------- Messages ----------
  function toast(text, kind = '', focus = null) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    if (focus) {
      el.classList.add('clickable');
      el.onclick = () => app.act.focus(focus);
    }
    box.prepend(el);
    while (box.children.length > 4) box.lastChild.remove();
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, kind === 'danger' ? 6000 : 3200);
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
        const keep = b.onClick?.();
        if (keep !== true) nextModal();
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
    get modalOpen() { return !modalEl.hidden; },
  };
}
