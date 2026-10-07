// Habitants et charrettes qui circulent sur les routes (purement visuel).
import { MAP, T, BUILDINGS } from './config.js';
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

// ---------- Navires entre les ports ----------
const ships = [];
let shipKey = '';

// Chemin sur l'eau (8 directions) entre deux ports, ou null.
function waterPath(g, a, b) {
  const isWater = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP && g.tiles[y * MAP + x] === T.WATER;
  const around = (p) => {
    const s = BUILDINGS[p.type].size, out = [];
    for (let y = p.y - 1; y <= p.y + s; y++) for (let x = p.x - 1; x <= p.x + s; x++) if (isWater(x, y)) out.push(y * MAP + x);
    return out;
  };
  const goal = new Set(around(b));
  const prev = new Int32Array(MAP * MAP).fill(-2);
  const queue = around(a);
  for (const i of queue) prev[i] = -1;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    if (goal.has(i)) {
      const path = [];
      for (let k = i; k !== -1; k = prev[k]) path.push([k % MAP, Math.floor(k / MAP)]);
      return path.reverse();
    }
    const x = i % MAP, y = Math.floor(i / MAP);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!isWater(nx, ny) || prev[ny * MAP + nx] !== -2) continue;
      if (dx && dy && (!isWater(x + dx, y) || !isWater(x, y + dy))) continue;
      prev[ny * MAP + nx] = i;
      queue.push(ny * MAP + nx);
    }
  }
  return null;
}

function updateShips(g, dt, speed) {
  const ports = g.buildings.filter((b) => b.type === 'port' && !b.build);
  const key = `${ports.map((p) => p.id).join(',')}-${g.terrainVersion}-${g.seaLink}`;
  if (key !== shipKey) {
    shipKey = key;
    ships.length = 0;
    const home = ports.find((p) => g.isl.id[p.y * MAP + p.x] === 0);
    if (home && g.seaLink) {
      for (const p of ports) {
        if (p === home) continue;
        const path = waterPath(g, home, p);
        if (path && path.length > 1) ships.push({ path, t: Math.random() * (path.length - 1), dir: 1, wait: 0 });
      }
    }
  }
  if (!speed) return;
  for (const s of ships) {
    if (s.wait > 0) { s.wait -= dt * speed; continue; }
    s.t += s.dir * dt * Math.min(speed, 3) * 1.6;
    const end = s.path.length - 1;
    if (s.t >= end) { s.t = end; s.dir = -1; s.wait = 3; }
    if (s.t <= 0) { s.t = 0; s.dir = 1; s.wait = 3; }
  }
}

// ---------- Navire marchand : arrive du large, reste à quai, repart ----------
let merchant = null;     // { path, t, dir, leaving }

// Chemin du large (bord de la carte) jusqu'au port.
function seaPath(g, port) {
  const isWater = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP && g.tiles[y * MAP + x] === T.WATER;
  const s = BUILDINGS[port.type].size;
  const prev = new Int32Array(MAP * MAP).fill(-2);
  const queue = [];
  for (let y = port.y - 1; y <= port.y + s; y++) for (let x = port.x - 1; x <= port.x + s; x++) if (isWater(x, y)) { prev[y * MAP + x] = -1; queue.push(y * MAP + x); }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const x = i % MAP, y = Math.floor(i / MAP);
    if (x < 2 || y < 2 || x > MAP - 3 || y > MAP - 3) {
      const path = [];
      for (let k = i; k !== -1; k = prev[k]) path.push([k % MAP, Math.floor(k / MAP)]);
      return path;      // du large vers le port
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!isWater(nx, ny) || prev[ny * MAP + nx] !== -2) continue;
      prev[ny * MAP + nx] = i;
      queue.push(ny * MAP + nx);
    }
  }
  return null;
}

function updateMerchant(g, dt, speed) {
  if (g.merchant && !merchant) {
    const port = g.buildings.find((b) => b.type === 'port' && !b.build && g.isl.id[b.y * MAP + b.x] === 0);
    const path = port && seaPath(g, port);
    if (path && path.length > 1) merchant = { path, t: 0, dir: 1, big: true };
  }
  if (!merchant || !speed) return;
  const end = merchant.path.length - 1;
  if (!g.merchant && merchant.dir === 1) merchant.dir = -1;      // le navire repart
  merchant.t += merchant.dir * dt * Math.min(speed, 3) * 2.2;
  if (merchant.t >= end) merchant.t = end;
  if (merchant.t <= 0 && merchant.dir === -1) merchant = null;
}

function drawShip(ctx, s) {
  const i = Math.floor(s.t), f = s.t - i;
  const a = s.path[i], b = s.path[Math.min(i + 1, s.path.length - 1)];
  const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
  const [px, py] = P(x + 0.5, y + 0.5);
  const [qx, qy] = P(b[0] + 0.5, b[1] + 0.5);
  const flip = (qx - px) * s.dir < 0 ? -1 : 1;
  const bob = Math.sin(performance.now() / 400 + s.t) * 1;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(px - flip * 10, py + 2, 8, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(px, py + bob);
  ctx.scale(flip * (s.big ? 1.45 : 1), s.big ? 1.45 : 1);
  ctx.fillStyle = '#6b4526';
  ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(14, -6); ctx.lineTo(9, 1); ctx.lineTo(-11, 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(-14, -8, 28, 2);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -30); ctx.stroke();
  ctx.fillStyle = '#f3ede0';
  ctx.beginPath(); ctx.moveTo(1, -29); ctx.quadraticCurveTo(12, -19, 1, -9); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-1, -26); ctx.quadraticCurveTo(-9, -18, -1, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = s.big ? '#2f5d8a' : '#c0392b';
  ctx.fillRect(0, -32, s.big ? 9 : 6, s.big ? 5 : 3);
  ctx.restore();
  void qy;
}

export function update(g, dt, speed) {
  updateShips(g, dt, speed);
  updateMerchant(g, dt, speed);
  const roads = connectedRoads(g);
  const pop = g.cls.reduce((a, b) => a + b, 0);
  const target = roads.length < 2 ? 0 : Math.min(90, Math.floor(pop / 4) + 2, roads.length * 2);
  while (walkers.length > target) walkers.pop();
  while (walkers.length < target) {
    const i = roads[Math.floor(Math.random() * roads.length)];
    const x = i % MAP, y = Math.floor(i / MAP);
    walkers.push({
      x, y, px: x, py: y, tx: x, ty: y,
      cart: Math.random() < 0.16,
      cls: pickClass(g),
      female: Math.random() < 0.45,
      child: Math.random() < 0.12,
      shade: Math.floor(Math.random() * 3),
      load: LOADS[Math.floor(Math.random() * LOADS.length)],
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
  for (const s of merchant ? [...ships, merchant] : ships) {
    const [x, y] = s.path[Math.floor(s.t)];
    if (!inView(x, y)) continue;
    list.push({ depth: x + y + 1.2, draw: (ctx) => drawShip(ctx, s) });
  }
  for (const w of walkers) {
    if (!inView(w.x, w.y)) continue;
    list.push({ depth: w.x + w.y + 1.01, draw: (ctx) => drawWalker(ctx, w) });
  }
}

// Tenues selon la classe : [haut, bas, couvre-chef]
const STYLES = [
  { tops: ['#7a5a35', '#6b7a3a', '#8a6a45'], bottom: '#4a3a28', hat: '#d9b45a' },          // paysans : chapeau de paille
  { tops: ['#a0522d', '#4f6f8a', '#7a4a6a'], bottom: '#3a3a3a', apron: '#e8e0cc' },        // artisans : tablier
  { tops: ['#2f4f6f', '#2f5a45', '#4a3a5a'], bottom: '#2a2a2a', hat: '#1e1e1e' },          // bourgeois : chapeau noir
  { tops: ['#6a2a6a', '#8a1e2e', '#2a3a7a'], bottom: '#3a2a3a', hat: '#2a1a2a', trim: '#d4af37' }, // nobles
];
const LOADS = ['#a0703f', '#d2a265', '#a8a39a', '#e2c35b', '#e9e4da'];

function pickClass(g) {
  const total = g.cls.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let c = 0; c < g.cls.length; c++) { r -= g.cls[c]; if (r <= 0) return c; }
  return 0;
}

function drawWalker(ctx, w) {
  const [px, py] = P(w.x + 0.5 + w.lane, w.y + 0.5 - w.lane);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(px, py, w.cart ? 7 : 3.5, w.cart ? 3.5 : 1.8, 0, 0, Math.PI * 2); ctx.fill();
  if (w.cart) {
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(px - 6, py - 9, 12, 6);
    ctx.fillStyle = w.load;
    ctx.fillRect(px - 5, py - 13, 10, 4);
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.arc(px - 4, py - 2, 2.2, 0, Math.PI * 2); ctx.arc(px + 4, py - 2, 2.2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const S = STYLES[w.cls] || STYLES[0];
  const k = w.child ? 0.7 : 1;
  const top = S.tops[w.shade % S.tops.length];
  const bob = Math.abs(Math.sin(w.phase)) * 1.1 * k;
  const step = Math.sin(w.phase) * 1.4 * k;
  const by = py - bob;
  if (w.female) {
    // robe
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.moveTo(px - 2 * k, by - 9 * k); ctx.lineTo(px + 2 * k, by - 9 * k); ctx.lineTo(px + 3.2 * k, by - 1); ctx.lineTo(px - 3.2 * k, by - 1); ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle = S.bottom;
    ctx.lineWidth = 1.4 * k;
    ctx.beginPath(); ctx.moveTo(px - 1 * k, by - 4 * k); ctx.lineTo(px - 1 * k + step * 0.4, by); ctx.moveTo(px + 1 * k, by - 4 * k); ctx.lineTo(px + 1 * k - step * 0.4, by); ctx.stroke();
    ctx.fillStyle = top;
    ctx.fillRect(px - 2 * k, by - 9.5 * k, 4 * k, 5.5 * k);
  }
  if (S.apron && !w.female) { ctx.fillStyle = S.apron; ctx.fillRect(px - 1.4 * k, by - 7 * k, 2.8 * k, 4 * k); }
  if (S.trim) { ctx.fillStyle = S.trim; ctx.fillRect(px - 2 * k, by - 6.5 * k, 4 * k, 0.8); }
  ctx.fillStyle = '#f1c9a0';
  ctx.beginPath(); ctx.arc(px, by - 11.5 * k, 2.1 * k, 0, Math.PI * 2); ctx.fill();
  if (w.female) {
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath(); ctx.arc(px + 1.2 * k, by - 12.3 * k, 1.3 * k, 0, Math.PI * 2); ctx.fill();
  } else if (S.hat && !w.child) {
    ctx.fillStyle = S.hat;
    if (w.cls === 0) { ctx.beginPath(); ctx.ellipse(px, by - 13, 3.6, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(px - 1.6, by - 15, 3.2, 2); }
    else { ctx.fillRect(px - 2.6, by - 13.6, 5.2, 1); ctx.fillRect(px - 1.7, by - 16.4, 3.4, 3); }
    if (w.cls === 3) { ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.ellipse(px + 2.4, by - 16.5, 1, 2.4, 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
}
