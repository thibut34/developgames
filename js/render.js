// Rendu de la carte isométrique : terrain, routes, calques, objets triés par profondeur, effets.
import { MAP, T, BUILDINGS, GOODS, CLEAR } from './config.js';
import { P, WORLD_W, WORLD_H, worldToTile } from './iso.js';
import { drawBuilding, drawScaffold, poly } from './draw.js';
import { tree, mountain } from './sprites.js';
import { iconImage } from './icons.js';
import * as fx from './fx.js';
import * as agents from './agents.js';
import { canPlace, buildingAt, season, def, tileAt, roadAt, isHouse } from './game.js';

const hash = (x, y, k = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
const SEA = '#2f6f9f';

function landColor(t, h, s) {
  const v = (h - 0.5) * 5;
  switch (t) {
    case T.GRASS: return [`hsl(100,40%,${47 + v}%)`, `hsl(88,42%,${46 + v}%)`, `hsl(58,40%,${45 + v}%)`, `hsl(205,22%,${90 + v / 2}%)`][s];
    case T.FERTILE: return [`hsl(75,38%,${38 + v}%)`, `hsl(70,40%,${40 + v}%)`, `hsl(40,36%,${38 + v}%)`, `hsl(30,12%,${82 + v / 2}%)`][s];
    case T.FOREST: return [`hsl(105,34%,${33 + v}%)`, `hsl(100,34%,${32 + v}%)`, `hsl(40,34%,${33 + v}%)`, `hsl(200,14%,${84 + v / 2}%)`][s];
    case T.SAND: return `hsl(45,52%,${s === 3 ? 82 : 74 + v}%)`;
    case T.ROCK: return s === 3 ? `hsl(210,8%,${80 + v / 2}%)` : `hsl(35,8%,${55 + v}%)`;
    case T.MOUNTAIN: return s === 3 ? `hsl(210,8%,${78 + v / 2}%)` : `hsl(30,9%,${44 + v}%)`;
    default: return '#888';
  }
}

function buildTerrain(g, s) {
  const c = document.createElement('canvas');
  c.width = WORLD_W;
  c.height = WORLD_H;
  const ctx = c.getContext('2d');
  const tileAtOr = (x, y) => (x < 0 || y < 0 || x >= MAP || y >= MAP ? T.WATER : g.tiles[y * MAP + x]);
  const diamond = (x, y) => [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
  const fillTile = (x, y, color) => {
    poly(ctx, diamond(x, y), color);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      if (g.tiles[y * MAP + x] !== T.WATER) continue;
      let shore = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tileAtOr(x + dx, y + dy) !== T.WATER) shore = true;
      const h = hash(x, y);
      fillTile(x, y, shore ? `hsl(195,52%,${s === 3 ? 66 : 55 + h * 3}%)` : `hsl(205,55%,${s === 3 ? 58 : 42 + h * 3}%)`);
    }
  }

  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      const t = g.tiles[y * MAP + x];
      if (t === T.WATER) continue;
      const h = hash(x, y);
      fillTile(x, y, landColor(t, h, s));
      const down = (p, d) => [p[0], p[1] + d];
      if (tileAtOr(x + 1, y) === T.WATER) {
        poly(ctx, [P(x + 1, y), P(x + 1, y + 1), down(P(x + 1, y + 1), 7), down(P(x + 1, y), 7)], s === 3 ? '#a9a39a' : '#7a5c3c');
      }
      if (tileAtOr(x, y + 1) === T.WATER) {
        poly(ctx, [P(x, y + 1), P(x + 1, y + 1), down(P(x + 1, y + 1), 7), down(P(x, y + 1), 7)], s === 3 ? '#bdb7ae' : '#8f6d48');
      }
      if (t === T.FERTILE && s !== 3) {
        ctx.strokeStyle = 'rgba(60,40,20,0.2)';
        ctx.lineWidth = 1.5;
        for (let i = 1; i < 4; i++) {
          const a = P(x + i / 4, y + 0.15), b = P(x + i / 4, y + 0.85);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      } else if (t === T.ROCK) {
        for (let i = 0; i < 4; i++) {
          const p = P(x + 0.2 + hash(x, y, i) * 0.6, y + 0.2 + hash(y, x, i) * 0.6);
          const r = 3 + hash(x, y, i + 9) * 5;
          ctx.fillStyle = s === 3 ? '#c9ccd2' : '#8b867e';
          ctx.beginPath(); ctx.ellipse(p[0], p[1], r * 1.3, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = s === 3 ? '#f2f5fa' : '#b3aea4';
          ctx.beginPath(); ctx.ellipse(p[0] - 1, p[1] - 2, r * 0.9, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        }
      } else if (t === T.GRASS && h > 0.72 && s !== 3) {
        const p = P(x + 0.3 + h * 0.4, y + 0.6 - h * 0.3);
        ctx.fillStyle = s === 0 ? ['#f4e04d', '#ffffff', '#e57373'][Math.floor(h * 30) % 3] : 'rgba(40,80,20,0.3)';
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  return c;
}

function drawRoad(ctx, g, x, y, paved, connected) {
  const q = (u0, v0, u1, v1) => [P(x + u0, y + v0), P(x + u1, y + v0), P(x + u1, y + v1), P(x + u0, y + v1)];
  const color = paved ? '#aaa59c' : '#b99a66';
  const edge = paved ? '#8c877e' : '#9a7c4f';
  const parts = [q(0.22, 0.22, 0.78, 0.78)];
  if (roadAt(g, x + 1, y)) parts.push(q(0.78, 0.22, 1, 0.78));
  if (roadAt(g, x - 1, y)) parts.push(q(0, 0.22, 0.22, 0.78));
  if (roadAt(g, x, y + 1)) parts.push(q(0.22, 0.78, 0.78, 1));
  if (roadAt(g, x, y - 1)) parts.push(q(0.22, 0, 0.78, 0.22));
  for (const p of parts) poly(ctx, p, edge);
  ctx.save();
  ctx.translate(0, -1);
  for (const p of parts) poly(ctx, p, connected ? color : '#a0907a');
  ctx.restore();
  if (paved) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 3; i++) {
      const p = P(x + 0.3 + hash(x, y, i) * 0.4, y + 0.3 + hash(y, x, i) * 0.4);
      ctx.fillRect(p[0] - 2, p[1] - 2, 4, 2);
    }
  }
}

// Alerte à afficher au-dessus d'un bâtiment : [icône, couleur de fond] ou null.
function statusOf(b) {
  const d = def(b);
  if (b.fire > 0) return ['flame', '#d9452b'];
  if (b.build) return null;
  if (b.paused) return ['pause', '#5d6b78'];
  if ((d.workers || isHouse(b)) && !b.connected) return ['unlink', '#c0762b'];
  if (d.workers && !b.assigned) return ['user-x', '#c0762b'];
  if (b.starved) return ['package-x', '#c0762b'];
  if (isHouse(b) && (b.sat ?? 1) < 0.4 && (b.res ?? 0) > 0) return ['frown', '#b8443a'];
  return null;
}

function badge(ctx, x, y, iconName, bg, zoom) {
  const r = 9 / Math.max(0.6, Math.min(zoom, 1.6)) * 1.1;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const img = iconImage(iconName, '#ffffff', 2.4);
  if (img.complete) ctx.drawImage(img, x - r * 0.62, y - r * 0.62, r * 1.24, r * 1.24);
}

const footprint = (x, y, s) => [P(x, y), P(x + s, y), P(x + s, y + s), P(x, y + s)];
const satColor = (v, a = 1) => `hsla(${Math.round(v * 120)}, 65%, 48%, ${a})`;

function rangeArea(ctx, x, y, s, r, color) {
  poly(ctx, footprint(x - r, y - r, s + 2 * r), color, 'rgba(255,255,255,0.45)');
}

// Calques : quelles cases sont couvertes par un type de service.
const OVERLAY_SERVICE = { well: 'well', fire: 'fire', market: 'market', chapel: 'chapel' };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let terrain = null, terrainKey = '';
  let view = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const smokeAcc = new Map();

  function inView(i, j) {
    const [px, py] = P(i + 0.5, j + 0.5);
    return px > view.x0 - 90 && px < view.x1 + 90 && py > view.y0 - 50 && py < view.y1 + 160;
  }

  function drawOverlay(g, ui, tx0, tx1, ty0, ty1) {
    const o = ui.overlay;
    if (!o || o === 'sat') return;
    if (o === 'decor') {
      const decors = g.buildings.filter((b) => def(b).decor && !b.build);
      for (let j = ty0; j <= ty1; j++) {
        for (let i = tx0; i <= tx1; i++) {
          let v = 0;
          for (const d of decors) {
            const s = def(d).size, r = def(d).decor.r;
            if (i >= d.x - r && i < d.x + s + r && j >= d.y - r && j < d.y + s + r) v += def(d).decor.v;
          }
          if (v) poly(ctx, footprint(i, j, 1), `rgba(120,230,120,${Math.min(0.55, 0.1 + v * 0.08)})`);
        }
      }
      return;
    }
    const type = OVERLAY_SERVICE[o];
    const cover = new Uint8Array(MAP * MAP);
    for (const b of g.buildings) {
      const d = def(b);
      if (!d.service || d.service.type !== type) continue;
      const s = d.size, r = d.service.r;
      for (let y = b.y - r; y < b.y + s + r; y++) for (let x = b.x - r; x < b.x + s + r; x++) if (x >= 0 && y >= 0 && x < MAP && y < MAP) cover[y * MAP + x] = 1;
    }
    const col = { well: '90,170,255', fire: '255,120,80', market: '240,200,90', chapel: '200,160,255' }[type];
    for (let j = ty0; j <= ty1; j++) {
      for (let i = tx0; i <= tx1; i++) if (cover[j * MAP + i]) poly(ctx, footprint(i, j, 1), `rgba(${col},0.22)`);
    }
  }

  function draw(g, cam, ui, dt) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const s = season(g);
    const key = `${g.seed}-${g.terrainVersion}-${s}`;
    if (key !== terrainKey) { terrain = buildTerrain(g, s); terrainKey = key; }

    fx.update(dt, s, w, h);
    agents.update(g, dt, ui.speed);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = s === 3 ? '#5f86a6' : SEA;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const z = cam.zoom * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    view = { x0: cam.x, y0: cam.y, x1: cam.x + w / cam.zoom, y1: cam.y + h / cam.zoom };
    const time = performance.now();

    // Vagues au large
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const wx = ((hash(i, 1) * WORLD_W * 1.6 + (time / 1000) * 8) % (WORLD_W * 1.6)) - WORLD_W * 0.3;
      const wy = hash(i, 2) * WORLD_H * 1.4 - WORLD_H * 0.2;
      if (wx < view.x0 - 40 || wx > view.x1 + 40 || wy < view.y0 - 20 || wy > view.y1 + 20) continue;
      ctx.beginPath(); ctx.arc(wx, wy, 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }

    ctx.drawImage(terrain, 0, 0);

    const corners = [[view.x0, view.y0 - 40], [view.x1, view.y0 - 40], [view.x0, view.y1 + 180], [view.x1, view.y1 + 180]].map(([a, b]) => worldToTile(a, b));
    const tx0 = Math.max(0, Math.min(...corners.map((c) => c.x)) - 1), tx1 = Math.min(MAP - 1, Math.max(...corners.map((c) => c.x)) + 1);
    const ty0 = Math.max(0, Math.min(...corners.map((c) => c.y)) - 1), ty1 = Math.min(MAP - 1, Math.max(...corners.map((c) => c.y)) + 1);

    // Reflets sur l'eau
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 1.5;
    for (let j = ty0; j <= ty1; j++) {
      for (let i = tx0; i <= tx1; i++) {
        if (g.tiles[j * MAP + i] !== T.WATER || hash(i, j, 3) > 0.35 || !inView(i, j)) continue;
        const [px, py] = P(i + 0.5, j + 0.5);
        const off = Math.sin(time / 666 + i * 1.7 + j) * 4;
        ctx.beginPath(); ctx.moveTo(px - 6 + off, py); ctx.lineTo(px + 4 + off, py); ctx.stroke();
      }
    }

    const paved = g.era >= 2;
    for (let j = ty0; j <= ty1; j++) {
      for (let i = tx0; i <= tx1; i++) {
        if (g.roads[j * MAP + i] && inView(i, j)) drawRoad(ctx, g, i, j, paved, g.roadConn[j * MAP + i] === 1);
      }
    }

    drawOverlay(g, ui, tx0, tx1, ty0, ty1);

    const tool = ui.tool;
    const placing = BUILDINGS[tool];
    if (placing || tool === 'road') {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let j = ty0; j <= ty1 + 1; j++) { const a = P(tx0, j), b = P(tx1 + 1, j); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      for (let i = tx0; i <= tx1 + 1; i++) { const a = P(i, ty0), b = P(i, ty1 + 1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
    }

    // Zones d'effet
    const sel = ui.selected && g.buildings.includes(ui.selected) ? ui.selected : null;
    const showRange = (type, x, y) => {
      const d = BUILDINGS[type];
      if (d.service) rangeArea(ctx, x, y, d.size, d.service.r, 'rgba(90,170,255,0.14)');
      if (d.decor) rangeArea(ctx, x, y, d.size, d.decor.r, 'rgba(120,230,120,0.16)');
    };
    if (sel) showRange(sel.type, sel.x, sel.y);
    if (placing && ui.hover) showRange(tool, ui.hover.x, ui.hover.y);
    if (sel) poly(ctx, footprint(sel.x, sel.y, def(sel).size), 'rgba(255,224,102,0.22)', '#ffe066');

    // Aperçu des gestes (route, zone)
    const pv = ui.preview;
    if (pv?.kind === 'road') {
      for (const [x, y] of pv.path) {
        const ok = x >= 0 && y >= 0 && x < MAP && y < MAP && !buildingAt(g, x, y) && (roadAt(g, x, y) || [T.GRASS, T.FERTILE, T.SAND].includes(tileAt(g, x, y)));
        poly(ctx, footprint(x, y, 1), ok ? 'rgba(255,220,120,0.45)' : 'rgba(230,60,60,0.45)', ok ? '#ffd257' : '#ff6b6b');
      }
    } else if (pv?.kind === 'area') {
      const x0 = Math.min(pv.x0, pv.x1), x1 = Math.max(pv.x0, pv.x1), y0 = Math.min(pv.y0, pv.y1), y1 = Math.max(pv.y0, pv.y1);
      const color = pv.tool === 'clear' ? 'rgba(255,170,60,' : 'rgba(230,60,60,';
      poly(ctx, [P(x0, y0), P(x1 + 1, y0), P(x1 + 1, y1 + 1), P(x0, y1 + 1)], `${color}0.18)`, `${color}0.9)`);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const hit = pv.tool === 'clear' ? CLEAR[tileAt(g, x, y)] : buildingAt(g, x, y) || roadAt(g, x, y);
          if (hit) poly(ctx, footprint(x, y, 1), `${color}0.35)`);
        }
      }
    }

    // Objets triés par profondeur
    const list = [];
    for (let j = ty0; j <= ty1; j++) {
      for (let i = tx0; i <= tx1; i++) {
        const tt = g.tiles[j * MAP + i];
        if ((tt !== T.FOREST && tt !== T.MOUNTAIN) || !inView(i, j)) continue;
        if (tt === T.FOREST) {
          list.push({
            depth: i + j + 0.5,
            draw: () => {
              const n = 2 + Math.floor(hash(i, j, 5) * 2);
              for (let k = 0; k < n; k++) {
                const img = tree(hash(i, j, k + 11) < 0.45 ? 2 : Math.floor(hash(i, j, k + 20) * 2), s);
                const [px, py] = P(i + 0.25 + hash(i, j, k) * 0.5, j + 0.25 + hash(j, i, k) * 0.5);
                ctx.drawImage(img, px - img.w / 2, py - img.h + 4, img.w, img.h);
              }
            },
          });
        } else {
          list.push({
            depth: i + j + 0.5,
            draw: () => {
              const img = mountain(hash(i, j, 7) < 0.5 ? 0 : 1, s);
              const [px, py] = P(i + 0.5, j + 0.5);
              ctx.drawImage(img, px - img.w / 2, py - img.h + 18, img.w, img.h);
            },
          });
        }
      }
    }
    const env = { season: s, era: g.era, time };
    const badges = [];
    for (const b of g.buildings) {
      const sz = def(b).size;
      if (!inView(b.x + (sz - 1) / 2, b.y + (sz - 1) / 2)) continue;
      list.push({
        depth: b.x + b.y + 2 * (sz - 1) + 0.4,
        draw: () => {
          if (b.build) ctx.globalAlpha = 0.45;
          const r = drawBuilding(ctx, b, env);
          ctx.globalAlpha = 1;
          if (b.build) drawScaffold(ctx, b, r.top, 1 - b.build / def(b).buildDays);
          b.screenTop = r.top;
          const [cx, cy] = P(b.x + sz / 2, b.y + sz / 2);
          if (ui.speed > 0) {
            if (r.smoke) {
              const acc = (smokeAcc.get(b.id) || 0) + dt * (s === 3 ? 2.2 : 1.1);
              if (acc >= 1) { fx.smoke(r.smoke[0], r.smoke[1]); smokeAcc.set(b.id, acc - 1); } else smokeAcc.set(b.id, acc);
            }
            if (b.fire > 0) for (let k = 0; k < 3; k++) fx.fire(cx, cy - 8, 20 * sz);
          }
          if (ui.overlay === 'sat' && isHouse(b)) badges.push(['sat', cx, r.top - 10, b.sat ?? 0]);
          else if (ui.icons) {
            const st = statusOf(b);
            if (st) badges.push(['icon', cx, r.top - 12, st]);
          }
        },
      });
    }
    agents.collect(list, inView);

    // Fantôme du bâtiment à placer
    if (placing && ui.hover) {
      const { x, y } = ui.hover;
      const ok = canPlace(g, tool, x, y).ok;
      const sz = placing.size;
      poly(ctx, footprint(x, y, sz), ok ? 'rgba(80,220,120,0.32)' : 'rgba(230,60,60,0.38)', ok ? '#7ddc8c' : '#ff6b6b');
      list.push({
        depth: x + y + 2 * (sz - 1) + 0.45,
        draw: () => {
          ctx.globalAlpha = 0.72;
          drawBuilding(ctx, { type: tool, x, y, level: 1, res: 1 }, env);
          ctx.globalAlpha = 1;
        },
      });
    } else if (ui.hover && !pv) {
      const { x, y } = ui.hover;
      if (tool === 'road') {
        poly(ctx, footprint(x, y, 1), 'rgba(255,220,120,0.3)', '#ffd257');
      } else if (tool === 'clear') {
        const ok = CLEAR[tileAt(g, x, y)];
        poly(ctx, footprint(x, y, 1), ok ? 'rgba(255,170,60,0.35)' : 'rgba(255,255,255,0.1)', ok ? '#ffaa3c' : 'rgba(255,255,255,0.35)');
      } else if (tool === 'demolish') {
        const b = buildingAt(g, x, y);
        if (b) poly(ctx, footprint(b.x, b.y, def(b).size), 'rgba(230,60,60,0.32)', '#ff4d4d');
        else if (roadAt(g, x, y)) poly(ctx, footprint(x, y, 1), 'rgba(230,60,60,0.32)', '#ff4d4d');
      } else if (tool === 'inspect' && ui.pointerType === 'mouse') {
        const b = buildingAt(g, x, y);
        if (b) poly(ctx, footprint(b.x, b.y, def(b).size), null, 'rgba(255,255,255,0.75)');
      }
    }

    list.sort((a, b) => a.depth - b.depth);
    for (const o of list) o.draw(ctx);

    for (const [kind, x, y, v] of badges) {
      if (kind === 'icon') badge(ctx, x, y, v[0], v[1], cam.zoom);
      else {
        ctx.fillStyle = satColor(v, 0.95);
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    fx.drawWorld(ctx, cam.zoom);
    fx.drawClouds(ctx);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tint = ['rgba(255,250,230,0.03)', 'rgba(255,230,150,0.05)', 'rgba(255,150,60,0.06)', 'rgba(190,215,255,0.09)'][s];
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
    fx.drawWeather(ctx);
  }

  // Chaque jour : petits chiffres au-dessus des bâtiments qui produisent (un jour sur trois chacun).
  function announce(g) {
    for (const b of g.buildings) {
      if (!b.output || (g.day + b.id) % 3) continue;
      const sz = def(b).size;
      if (!inView(b.x + sz / 2, b.y + sz / 2)) continue;
      const entries = Object.entries(b.output).filter(([, v]) => v >= 0.05);
      if (!entries.length) continue;
      const [k, v] = entries[0];
      const [px] = P(b.x + sz / 2, b.y + sz / 2);
      const name = k === 'gold' ? 'or' : GOODS[k].name.toLowerCase();
      fx.floatText(px, (b.screenTop ?? P(b.x, b.y)[1]) - 4, `+${v.toFixed(1).replace('.', ',')} ${name}`, '#fff3c4');
    }
  }

  return { draw, announce, inView };
}
