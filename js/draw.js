// Dessin des bâtiments en isométrique (formes simples : blocs, toits, détails).
import { BUILDINGS, HOUSE_LEVELS } from './config.js';
import { P } from './iso.js';
import { tree } from './sprites.js';

const shadeCache = new Map();
export function shade(hex, f) {
  const key = hex + f;
  let c = shadeCache.get(key);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    c = `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
    shadeCache.set(key, c);
  }
  return c;
}

const up = (p, h) => [p[0], p[1] - h];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mid = (a, b) => lerp(a, b, 0.5);
const EDGE = 'rgba(40,25,15,0.35)';

export function poly(ctx, pts, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// Bloc posé sur le rectangle de cases [x0,x1]×[y0,y1], haut de h, avec un toit.
function box(ctx, x0, y0, x1, y1, h, wall, roof, type = 'hip', rh = 8, base = 0) {
  const N = up(P(x0, y0), base), E = up(P(x1, y0), base), S = up(P(x1, y1), base), W = up(P(x0, y1), base);
  const Nu = up(N, h), Eu = up(E, h), Su = up(S, h), Wu = up(W, h);
  poly(ctx, [W, S, Su, Wu], shade(wall, 0.92), EDGE);
  poly(ctx, [S, E, Eu, Su], shade(wall, 0.74), EDGE);
  let top = Math.min(Nu[1], Eu[1], Su[1], Wu[1]);
  if (type === 'flat') {
    poly(ctx, [Nu, Eu, Su, Wu], roof, EDGE);
  } else if (type === 'hip') {
    const apex = up(mid(Nu, Su), rh);
    poly(ctx, [Wu, Nu, apex], shade(roof, 1.08), EDGE);
    poly(ctx, [Nu, Eu, apex], shade(roof, 0.86), EDGE);
    poly(ctx, [Wu, Su, apex], shade(roof, 1), EDGE);
    poly(ctx, [Su, Eu, apex], shade(roof, 0.74), EDGE);
    top = apex[1];
  } else if (type === 'gable') {
    const A = up(mid(Nu, Wu), rh), B = up(mid(Eu, Su), rh);
    poly(ctx, [Nu, Eu, B, A], shade(roof, 0.86), EDGE);
    poly(ctx, [Wu, Nu, A], shade(wall, 0.92), EDGE);
    poly(ctx, [Su, Eu, B], shade(wall, 0.74), EDGE);
    poly(ctx, [Wu, Su, B, A], shade(roof, 1.02), EDGE);
    top = Math.min(A[1], B[1]);
  } else if (type === 'dome') {
    const c = mid(Nu, Su);
    const rx = Math.abs(Eu[0] - Wu[0]) / 2;
    ctx.fillStyle = shade(roof, 0.95);
    ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, rx * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, rh, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(c[0] - rx * 0.3, c[1] - rh * 0.6, rx * 0.25, rh * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    top = c[1] - rh;
  }
  return { N, E, S, W, h, base, top };
}

// Rectangle (fenêtre, porte) sur la face gauche (W→S) ou droite (S→E) d'un bloc.
function onFace(ctx, bx, face, u0, u1, v0, v1, color) {
  const [a, b] = face === 'L' ? [bx.W, bx.S] : [bx.S, bx.E];
  const p = (u, v) => up(lerp(a, b, u), v * bx.h);
  poly(ctx, [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], color);
}

function windows(ctx, bx, rows, cols, color = '#3d4a5c') {
  for (let r = 0; r < rows; r++) {
    const v0 = 0.25 + (r * 0.65) / rows, v1 = v0 + 0.35 / rows;
    for (const face of ['L', 'R']) {
      for (let c = 0; c < cols; c++) {
        const u0 = 0.15 + (c * 0.75) / cols, u1 = u0 + 0.35 / cols;
        onFace(ctx, bx, face, u0, u1, v0, v1, color);
      }
    }
  }
}

function door(ctx, bx, u = 0.42, color = '#5a3b22') {
  onFace(ctx, bx, 'L', u, u + 0.18, 0, 0.55, color);
}

function ground(ctx, x0, y0, x1, y1, color, stroke) {
  poly(ctx, [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], color, stroke);
}

function flag(ctx, p, h, color) {
  const top = up(p, h);
  ctx.strokeStyle = '#3a2f28';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
  const wave = Math.sin(performance.now() / 300) * 2;
  poly(ctx, [top, [top[0] + 12, top[1] + 3 + wave], [top[0], top[1] + 7]], color);
  return top[1];
}

function treeAt(ctx, i, j, variant, season, scale = 1) {
  const img = tree(variant, season);
  const [x, y] = P(i, j);
  ctx.drawImage(img, x - (img.w * scale) / 2, y - img.h * scale + 4, img.w * scale, img.h * scale);
}

function chimney(ctx, x, y, base, color = '#7a6a60') {
  const bx = box(ctx, x, y, x + 0.1, y + 0.1, 12, color, '#4d4540', 'flat', 0, base);
  return up(P(x + 0.05, y + 0.05), base + 12);
}

const FIELD = ['#7da64a', '#cdbb4c', '#dba33c', '#e8ecf1'];
const TOWNHALL = [
  ['#b7895a', '#6e4b2c'], ['#cfc4b0', '#8a3b2b'], ['#e8dcc4', '#3e5f8a'], ['#f2ead8', '#2f5d7a'], ['#f6efe0', '#c9a23a'],
];

// Dessine un bâtiment. Renvoie { top: y du point le plus haut, smoke: point de fumée ou null }.
export function drawBuilding(ctx, b, env) {
  const d = BUILDINGS[b.type];
  const { x, y } = b;
  const s = d.size;
  const season = env.season;
  let smoke = null;
  let top;

  switch (d.look) {
    case 'house': {
      const L = HOUSE_LEVELS[b.level || 1];
      if ((b.level || 1) === 1) {
        const bx = box(ctx, x + 0.22, y + 0.22, x + 0.8, y + 0.8, L.h, L.wall, L.roof, 'hip', 10);
        door(ctx, bx, 0.4);
        top = bx.top;
      } else {
        const inset = b.level === 4 ? 0.08 : b.level === 3 ? 0.12 : 0.16;
        const type = b.level === 4 ? 'hip' : 'gable';
        const bx = box(ctx, x + inset, y + inset, x + 1 - inset, y + 1 - inset, L.h, L.wall, L.roof, type, 10 + b.level);
        windows(ctx, bx, b.level - 1, b.level === 2 ? 1 : 2, env.season === 3 ? '#e8c46a' : '#3d4a5c');
        door(ctx, bx, 0.6);
        if (b.level === 4) onFace(ctx, bx, 'R', 0, 1, 0.48, 0.53, '#c9a23a');
        smoke = chimney(ctx, x + 0.62, y + 0.25, L.h);
        top = bx.top;
      }
      break;
    }
    case 'farm': {
      ground(ctx, x + 0.05, y + 0.05, x + s - 0.05, y + s - 0.05, FIELD[season], 'rgba(60,40,20,0.3)');
      ctx.strokeStyle = 'rgba(70,50,20,0.28)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 8; i++) {
        const t = 0.05 + (i * (s - 0.1)) / 8;
        const a = P(x + t, y + 1), c = P(x + t, y + s - 0.08);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      }
      const bx = box(ctx, x + 0.1, y + 0.1, x + 1.3, y + 0.9, d.h, d.wall, d.roof, 'gable', 11);
      door(ctx, bx, 0.4, '#6a3a22');
      top = bx.top;
      break;
    }
    case 'hut': {
      const bx = box(ctx, x + 0.2, y + 0.2, x + 0.8, y + 0.8, d.h, d.wall, d.roof, 'hip', 10);
      door(ctx, bx, 0.4);
      if (b.type === 'fisher') {
        const p = P(x + 0.95, y + 0.75);
        ctx.fillStyle = '#7a5530';
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 9, 3.5, 0.4, 0, Math.PI); ctx.fill();
      }
      top = bx.top;
      break;
    }
    case 'lumber': {
      const bx = box(ctx, x + 0.12, y + 0.12, x + 0.62, y + 0.7, d.h, d.wall, d.roof, 'hip', 9);
      door(ctx, bx, 0.35);
      const p = P(x + 0.78, y + 0.78);
      for (const [dx, dy] of [[-6, 0], [0, 0], [6, 0], [-3, -5], [3, -5], [0, -10]]) {
        ctx.fillStyle = '#8a5a2e';
        ctx.beginPath(); ctx.arc(p[0] + dx, p[1] + dy - 2, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d7b07a';
        ctx.beginPath(); ctx.arc(p[0] + dx + 0.8, p[1] + dy - 2, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      top = bx.top;
      break;
    }
    case 'quarry': {
      const bx = box(ctx, x + 0.12, y + 0.12, x + 0.6, y + 0.6, d.h, d.wall, d.roof, 'hip', 8);
      box(ctx, x + 0.62, y + 0.55, x + 0.86, y + 0.79, 6, '#b9b4aa', '#d2cec6', 'flat');
      box(ctx, x + 0.45, y + 0.7, x + 0.66, y + 0.9, 5, '#a9a49a', '#c6c1b8', 'flat');
      top = bx.top;
      break;
    }
    case 'mine': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'hip', 8);
      onFace(ctx, bx, 'L', 0.3, 0.7, 0, 0.75, '#1d1a17');
      onFace(ctx, bx, 'L', 0.25, 0.3, 0, 0.8, '#7b5a35');
      onFace(ctx, bx, 'L', 0.7, 0.75, 0, 0.8, '#7b5a35');
      top = bx.top;
      break;
    }
    case 'forge': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'gable', 9);
      onFace(ctx, bx, 'L', 0.35, 0.65, 0, 0.55, b.output ? '#ff9a3c' : '#3a2a20');
      smoke = up(P(x + 0.3, y + 0.25), d.h + 18);
      box(ctx, x + 0.25, y + 0.2, x + 0.38, y + 0.33, 18, '#5e544c', '#2e2925', 'flat', 0, d.h);
      top = Math.min(bx.top, smoke[1]);
      break;
    }
    case 'warehouse': {
      const bx = box(ctx, x + 0.12, y + 0.12, x + s - 0.12, y + s - 0.12, d.h, d.wall, d.roof, 'gable', 14);
      onFace(ctx, bx, 'L', 0.35, 0.65, 0, 0.6, '#5a3b22');
      onFace(ctx, bx, 'R', 0.35, 0.65, 0, 0.6, '#5a3b22');
      top = bx.top;
      break;
    }
    case 'well': {
      const c = P(x + 0.5, y + 0.5);
      ctx.fillStyle = '#8f8a80';
      ctx.beginPath(); ctx.ellipse(c[0], c[1] + 2, 13, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a8a397';
      ctx.fillRect(c[0] - 13, c[1] - 4, 26, 6);
      ctx.beginPath(); ctx.ellipse(c[0], c[1] - 4, 13, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2f5f86';
      ctx.beginPath(); ctx.ellipse(c[0], c[1] - 4, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5b3d1e';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(c[0] - 11, c[1] - 3); ctx.lineTo(c[0] - 11, c[1] - 22); ctx.moveTo(c[0] + 11, c[1] - 3); ctx.lineTo(c[0] + 11, c[1] - 22); ctx.stroke();
      poly(ctx, [[c[0] - 16, c[1] - 20], [c[0], c[1] - 30], [c[0] + 16, c[1] - 20]], '#8a4b2b', EDGE);
      top = c[1] - 30;
      break;
    }
    case 'garden': {
      ground(ctx, x + 0.08, y + 0.08, x + 0.92, y + 0.92, season === 3 ? '#e6ebf0' : '#79b85a', 'rgba(40,80,30,0.4)');
      if (season !== 3) {
        const cols = ['#e2575a', '#f4c542', '#d97ad6', '#ffffff', '#ff8c42'];
        for (let i = 0; i < 9; i++) {
          const p = P(x + 0.2 + (i % 3) * 0.3, y + 0.2 + Math.floor(i / 3) * 0.3);
          ctx.fillStyle = cols[(i + b.x + b.y) % cols.length];
          ctx.beginPath(); ctx.arc(p[0], p[1] + 1, 2.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      treeAt(ctx, x + 0.3, y + 0.3, 1, season, 0.8);
      top = P(x + 0.3, y + 0.3)[1] - 34;
      break;
    }
    case 'park': {
      ground(ctx, x + 0.05, y + 0.05, x + s - 0.05, y + s - 0.05, season === 3 ? '#e6ebf0' : '#6fae52', 'rgba(40,80,30,0.4)');
      ground(ctx, x + 0.9, y + 0.05, x + 1.1, y + s - 0.05, '#d8c79c');
      ground(ctx, x + 0.05, y + 0.9, x + s - 0.05, y + 1.1, '#d8c79c');
      for (const [i, j, v] of [[0.45, 0.45, 0], [1.5, 0.4, 1], [0.4, 1.5, 2], [1.55, 1.55, 0]]) treeAt(ctx, x + i, y + j, v, season);
      top = P(x + 0.45, y + 0.45)[1] - 40;
      break;
    }
    case 'fountain': {
      const c = P(x + 0.5, y + 0.5);
      ctx.fillStyle = '#b7b1a5';
      ctx.beginPath(); ctx.ellipse(c[0], c[1] + 2, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = season === 3 ? '#cfe3f2' : '#4f9bd0';
      ctx.beginPath(); ctx.ellipse(c[0], c[1], 18, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cfc9bd';
      ctx.fillRect(c[0] - 2.5, c[1] - 18, 5, 18);
      ctx.beginPath(); ctx.ellipse(c[0], c[1] - 18, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (season !== 3) {
        const t = performance.now() / 200;
        ctx.fillStyle = 'rgba(200,230,255,0.85)';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t * 0.2;
          ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * 7, c[1] - 14 + Math.sin(a) * 3 + ((t + i) % 3), 1.3, 0, Math.PI * 2); ctx.fill();
        }
      }
      top = c[1] - 26;
      break;
    }
    case 'statue': {
      const bx = box(ctx, x + 0.32, y + 0.32, x + 0.68, y + 0.68, 10, '#c9c2b4', '#ddd6c8', 'flat');
      const c = up(P(x + 0.5, y + 0.5), 10);
      ctx.fillStyle = '#6d7f6a';
      ctx.beginPath(); ctx.ellipse(c[0], c[1] - 10, 4.5, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(c[0], c[1] - 23, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6d7f6a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(c[0] + 3, c[1] - 15); ctx.lineTo(c[0] + 9, c[1] - 27); ctx.stroke();
      top = Math.min(bx.top, c[1] - 30);
      break;
    }
    case 'chapel': {
      const tw = box(ctx, x + 0.1, y + 0.08, x + 0.42, y + 0.4, 34, d.wall, d.roof, 'hip', 16);
      const bx = box(ctx, x + 0.12, y + 0.35, x + 0.9, y + 0.92, d.h, d.wall, d.roof, 'gable', 12);
      onFace(ctx, bx, 'R', 0.35, 0.65, 0.35, 0.85, '#6a8fc0');
      door(ctx, bx, 0.45, '#6a4428');
      const p = [P(x + 0.26, y + 0.24)[0], tw.top];
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - 10); ctx.moveTo(p[0] - 4, p[1] - 6); ctx.lineTo(p[0] + 4, p[1] - 6); ctx.stroke();
      top = p[1] - 10;
      break;
    }
    case 'market': {
      ground(ctx, x + 0.05, y + 0.05, x + s - 0.05, y + s - 0.05, '#cbbd9a', 'rgba(80,60,30,0.3)');
      const cols = ['#c0392b', '#2e86c1', '#e5b021', '#27ae60'];
      let i = 0;
      for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const bx = box(ctx, x + qx + 0.18, y + qy + 0.18, x + qx + 0.82, y + qy + 0.82, 7, '#8a6a45', cols[i++], 'hip', 9);
        top = top === undefined ? bx.top : Math.min(top, bx.top);
      }
      break;
    }
    case 'firehouse': {
      const tw = box(ctx, x + 0.1, y + 0.1, x + 0.38, y + 0.38, 30, d.wall, d.roof, 'hip', 10);
      const bx = box(ctx, x + 0.15, y + 0.3, x + 0.88, y + 0.88, d.h, d.wall, d.roof, 'gable', 9);
      onFace(ctx, bx, 'L', 0.25, 0.75, 0, 0.6, '#f0e6d2');
      top = tw.top;
      break;
    }
    case 'tower': {
      const bx = box(ctx, x + 0.26, y + 0.26, x + 0.74, y + 0.74, d.h, d.wall, d.roof, 'hip', 14);
      windows(ctx, bx, 2, 1, '#2b2a28');
      top = flag(ctx, [P(x + 0.5, y + 0.5)[0], bx.top], 12, '#c0392b');
      break;
    }
    case 'tavern': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'gable', 11);
      windows(ctx, bx, 1, 2, '#f2c46b');
      door(ctx, bx, 0.6);
      const p = P(x + 0.95, y + 0.6);
      ctx.fillStyle = '#7a5530';
      ctx.beginPath(); ctx.ellipse(p[0], p[1] - 4, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
      top = bx.top;
      break;
    }
    case 'school': {
      const bx = box(ctx, x + 0.12, y + 0.15, x + 0.88, y + 0.85, d.h, d.wall, d.roof, 'gable', 10);
      windows(ctx, bx, 1, 2);
      door(ctx, bx, 0.45);
      const bell = box(ctx, x + 0.45, y + 0.45, x + 0.58, y + 0.58, 10, '#e9dcc0', '#3e6a8a', 'hip', 7, d.h + 6);
      top = bell.top;
      break;
    }
    case 'trading': {
      const bx = box(ctx, x + 0.1, y + 0.1, x + s - 0.1, y + 1.15, d.h, d.wall, d.roof, 'gable', 12);
      onFace(ctx, bx, 'L', 0.4, 0.6, 0, 0.6, '#5a3b22');
      for (const [i, j] of [[0.3, 1.45], [0.8, 1.6], [1.4, 1.4], [1.6, 1.7]]) {
        box(ctx, x + i, y + j, x + i + 0.25, y + j + 0.25, 7, '#a7814f', '#c89f68', 'flat');
      }
      top = flag(ctx, [P(x + 1, y + 0.6)[0], bx.top], 14, '#2f5c6b');
      break;
    }
    case 'mint': {
      const bx = box(ctx, x + 0.1, y + 0.1, x + s - 0.1, y + s - 0.1, d.h, d.wall, d.roof, 'hip', 16);
      for (let i = 0; i < 6; i++) onFace(ctx, bx, 'L', 0.08 + i * 0.16, 0.13 + i * 0.16, 0, 0.9, '#fffaf0');
      onFace(ctx, bx, 'R', 0.3, 0.7, 0, 0.55, '#5a4a2a');
      top = bx.top;
      break;
    }
    case 'townhall': {
      const era = env.era;
      const [wall, roof] = TOWNHALL[era];
      const h = 16 + era * 3;
      const bx = box(ctx, x + 0.1, y + 0.1, x + 1.9, y + 1.9, h, wall, roof, 'hip', 10);
      windows(ctx, bx, 1 + Math.min(era, 2), 3, '#3d4a5c');
      onFace(ctx, bx, 'L', 0.42, 0.58, 0, 0.45, '#5a3b22');
      const tw = box(ctx, x + 0.78, y + 0.78, x + 1.22, y + 1.22, 16 + era * 6, wall, roof, era >= 4 ? 'dome' : 'hip', era >= 4 ? 14 : 16, h + 2);
      top = flag(ctx, [P(x + 1, y + 1)[0], tw.top], 14, '#2f6fb5');
      smoke = era === 0 ? up(P(x + 0.4, y + 0.4), h + 10) : null;
      break;
    }
    case 'wonder': {
      ground(ctx, x + 0.05, y + 0.05, x + s - 0.05, y + s - 0.05, '#d8cfbd', 'rgba(80,60,30,0.3)');
      const t1 = box(ctx, x + 0.2, y + 0.15, x + 0.95, y + 0.9, 66, '#ece3cf', '#55657a', 'hip', 30);
      const t2 = box(ctx, x + 2.05, y + 0.15, x + 2.8, y + 0.9, 66, '#ece3cf', '#55657a', 'hip', 30);
      const nave = box(ctx, x + 0.25, y + 0.85, x + 2.75, y + 2.8, 34, '#e7dcc6', '#6c7a8c', 'gable', 22);
      windows(ctx, nave, 2, 4, '#5d7fb0');
      onFace(ctx, nave, 'R', 0.4, 0.6, 0, 0.5, '#5a3b22');
      const dome = box(ctx, x + 1.1, y + 1.4, x + 1.9, y + 2.2, 12, '#ece3cf', '#d4af37', 'dome', 22, 34);
      top = Math.min(t1.top, t2.top, dome.top);
      for (const t of [t1, t2]) {
        const p = [mid(t.W, t.E)[0], t.top];
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - 12); ctx.stroke();
      }
      top -= 12;
      break;
    }
    default: {
      const bx = box(ctx, x + 0.15, y + 0.15, x + s - 0.15, y + s - 0.15, d.h || 14, d.wall || '#bbbbbb', d.roof || '#777777', 'hip', 10);
      top = bx.top;
    }
  }
  return { top, smoke };
}
