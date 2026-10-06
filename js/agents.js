// Habitants et charrettes qui circulent sur les routes (purement visuel).
import { MAP } from './config.js';
import { P } from './iso.js';

const walkers = [];
const CLOTHES = ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#d35400', '#7f8c8d', '#f1c40f', '#16a085'];

function connectedRoads(g) {
  const out = [];
  for (let i = 0; i < g.roadConn.length; i++) if (g.roadConn[i]) out.push(i);
  return out;
}

const isRoad = (g, x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP && g.roadConn[y * MAP + x] === 1;

function pickNext(g, w) {
  const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => [w.tx + dx, w.ty + dy])
    .filter(([x, y]) => isRoad(g, x, y));
  if (!opts.length) return false;
  const forward = opts.filter(([x, y]) => x !== w.px || y !== w.py);
  const [nx, ny] = (forward.length ? forward : opts)[Math.floor(Math.random() * (forward.length || opts.length))];
  w.px = w.tx; w.py = w.ty;
  w.tx = nx; w.ty = ny;
  return true;
}

export function update(g, dt, speed) {
  const roads = connectedRoads(g);
  const target = roads.length < 2 ? 0 : Math.min(90, Math.floor(g.pop / 4) + 2, roads.length * 2);
  while (walkers.length > target) walkers.pop();
  while (walkers.length < target) {
    const i = roads[Math.floor(Math.random() * roads.length)];
    const x = i % MAP, y = Math.floor(i / MAP);
    walkers.push({
      x, y, px: x, py: y, tx: x, ty: y,
      cart: Math.random() < 0.18,
      color: CLOTHES[Math.floor(Math.random() * CLOTHES.length)],
      lane: (Math.random() - 0.5) * 0.3,
      v: 0.7 + Math.random() * 0.5,
      phase: Math.random() * 10,
    });
  }
  if (!speed) return;
  for (const w of walkers) {
    if (!isRoad(g, w.tx, w.ty)) {
      const i = roads[Math.floor(Math.random() * roads.length)];
      Object.assign(w, { x: i % MAP, y: Math.floor(i / MAP) });
      w.tx = w.px = Math.round(w.x); w.ty = w.py = Math.round(w.y);
    }
    const dx = w.tx - w.x, dy = w.ty - w.y;
    const dist = Math.hypot(dx, dy);
    const stepLen = w.v * dt * Math.min(speed, 3) * (w.cart ? 0.8 : 1);
    if (dist <= stepLen) {
      w.x = w.tx; w.y = w.ty;
      pickNext(g, w);
    } else {
      w.x += (dx / dist) * stepLen;
      w.y += (dy / dist) * stepLen;
    }
    w.phase += dt * 8 * Math.min(speed, 3);
  }
}

// Ajoute les habitants visibles à la liste d'objets à trier par profondeur.
export function collect(list, inView) {
  for (const w of walkers) {
    if (!inView(w.x, w.y)) continue;
    list.push({ depth: w.x + w.y + 1.01, draw: (ctx) => drawWalker(ctx, w) });
  }
}

function drawWalker(ctx, w) {
  const [px, py] = P(w.x + 0.5 + w.lane, w.y + 0.5 - w.lane);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(px, py, w.cart ? 7 : 3.5, w.cart ? 3.5 : 1.8, 0, 0, Math.PI * 2); ctx.fill();
  if (w.cart) {
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(px - 6, py - 9, 12, 6);
    ctx.fillStyle = '#c9a46b';
    ctx.fillRect(px - 5, py - 12, 10, 3);
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.arc(px - 4, py - 2, 2.2, 0, Math.PI * 2); ctx.arc(px + 4, py - 2, 2.2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const bob = Math.abs(Math.sin(w.phase)) * 1.2;
  ctx.fillStyle = w.color;
  ctx.fillRect(px - 2, py - 9 - bob, 4, 7);
  ctx.fillStyle = '#f1c9a0';
  ctx.beginPath(); ctx.arc(px, py - 11.5 - bob, 2.2, 0, Math.PI * 2); ctx.fill();
}
