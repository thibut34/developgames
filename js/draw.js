// Dessin des bâtiments en isométrique (formes simples : blocs, toits, détails).
import { BUILDINGS } from './config.js';

// Aspect des habitations selon leur niveau (classe d'habitants).
const HOUSE_LOOKS = [
  null,
  { wall: '#cdb08a', roof: '#c4a24c', h: 11, type: 'hip', rh: 11, inset: 0.2 },      // chaumière (toit de chaume)
  { wall: '#e4cfa6', roof: '#b4472f', h: 16, type: 'gable', rh: 11, inset: 0.16 },   // maison
  { wall: '#eee3cb', roof: '#4a5f7f', h: 24, type: 'gable', rh: 12, inset: 0.12 },   // maison bourgeoise
  { wall: '#f4efe4', roof: '#3d4552', h: 28, type: 'hip', rh: 13, inset: 0.08 },     // hôtel particulier
];
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
    roofLines(ctx, Wu, Su, apex, apex);
    roofLines(ctx, Su, Eu, apex, apex);
    top = apex[1];
  } else if (type === 'gable') {
    const A = up(mid(Nu, Wu), rh), B = up(mid(Eu, Su), rh);
    poly(ctx, [Nu, Eu, B, A], shade(roof, 0.86), EDGE);
    poly(ctx, [Wu, Nu, A], shade(wall, 0.92), EDGE);
    poly(ctx, [Su, Eu, B], shade(wall, 0.74), EDGE);
    poly(ctx, [Wu, Su, B, A], shade(roof, 1.02), EDGE);
    roofLines(ctx, Wu, Su, B, A);
    ctx.strokeStyle = shade(roof, 1.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
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

// Rangées de tuiles : lignes parallèles au bas du pan de toit (a→b), jusqu'au faîte (d→c).
function roofLines(ctx, a, b, c, d) {
  const n = Math.max(3, Math.round(Math.hypot(d[0] - a[0], d[1] - a[1]) / 4));
  ctx.strokeStyle = 'rgba(0,0,0,0.13)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = lerp(a, d, t), q = lerp(b, c, t);
    ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
  }
  ctx.stroke();
}

// Trait sur une face (colombages, bandeaux…), coordonnées relatives (u le long, v en hauteur).
function faceLine(ctx, bx, face, u0, v0, u1, v1, color, width = 1.4) {
  const [a, b] = face === 'L' ? [bx.W, bx.S] : [bx.S, bx.E];
  const p = (u, v) => up(lerp(a, b, u), v * bx.h);
  const s = p(u0, v0), e = p(u1, v1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
}

function timber(ctx, bx, color = '#5a3b22') {
  for (const f of ['L', 'R']) {
    for (const u of [0.03, 0.5, 0.97]) faceLine(ctx, bx, f, u, 0, u, 1, color);
    faceLine(ctx, bx, f, 0, 0.55, 1, 0.55, color);
    faceLine(ctx, bx, f, 0.03, 0.55, 0.5, 1, color, 1);
    faceLine(ctx, bx, f, 0.97, 0.55, 0.5, 1, color, 1);
  }
}

// Rectangle (fenêtre, porte) sur la face gauche (W→S) ou droite (S→E) d'un bloc.
function onFace(ctx, bx, face, u0, u1, v0, v1, color) {
  const [a, b] = face === 'L' ? [bx.W, bx.S] : [bx.S, bx.E];
  const p = (u, v) => up(lerp(a, b, u), v * bx.h);
  poly(ctx, [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], color);
}

function windows(ctx, bx, rows, cols, color = '#3d4a5c', shutters = null) {
  for (let r = 0; r < rows; r++) {
    const v0 = 0.25 + (r * 0.65) / rows, v1 = v0 + 0.35 / rows;
    for (const face of ['L', 'R']) {
      for (let c = 0; c < cols; c++) {
        const u0 = 0.15 + (c * 0.75) / cols, u1 = u0 + 0.35 / cols;
        const du = (u1 - u0) * 0.14, dv = (v1 - v0) * 0.14;
        onFace(ctx, bx, face, u0 - du, u1 + du, v0 - dv, v1 + dv, 'rgba(255,250,235,0.75)');
        onFace(ctx, bx, face, u0, u1, v0, v1, color);
        onFace(ctx, bx, face, (u0 + u1) / 2 - du * 0.3, (u0 + u1) / 2 + du * 0.3, v0, v1, 'rgba(255,250,235,0.55)');
        if (shutters) {
          onFace(ctx, bx, face, u0 - du * 4, u0 - du, v0, v1, shutters);
          onFace(ctx, bx, face, u1 + du, u1 + du * 4, v0, v1, shutters);
        }
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
  ['#fbf6ea', '#2c3e66'],
];

// Échafaudages d'un chantier en cours (progress de 0 à 1).
export function drawScaffold(ctx, b, top, progress) {
  const s = BUILDINGS[b.type].size;
  const corners = [P(b.x + 0.05, b.y + s - 0.05), P(b.x + s - 0.05, b.y + s - 0.05), P(b.x + s - 0.05, b.y + 0.05)];
  const h = Math.max(20, corners[1][1] - top);
  ctx.strokeStyle = '#8a6a45';
  ctx.lineWidth = 1.5;
  for (const p of corners) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - h); ctx.stroke(); }
  for (let k = 1; k <= 4; k++) {
    const dy = (h * k) / 4;
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1] - dy);
    ctx.lineTo(corners[1][0], corners[1][1] - dy);
    ctx.lineTo(corners[2][0], corners[2][1] - dy);
    ctx.stroke();
  }
  // Barre de progression
  const c = P(b.x + s / 2, b.y + s / 2);
  const w = 24 * s;
  ctx.fillStyle = 'rgba(20,28,22,0.85)';
  ctx.fillRect(c[0] - w / 2, top - 14, w, 6);
  ctx.fillStyle = '#e9c46a';
  ctx.fillRect(c[0] - w / 2 + 1, top - 13, (w - 2) * progress, 4);
}

// ---------- Cache d'images des bâtiments ----------
// Redessiner chaque bâtiment trait par trait à chaque image coûte trop cher dans une grande cité :
// chaque aspect (type, niveau, saison…) est dessiné une fois dans une petite image, puis recopié.
// Les bâtiments animés (eau, lumière) restent dessinés à chaque image.
const ANIMATED = new Set(['fountain', 'royalgarden', 'lighthouse']);
const sprites = new Map();
// Place réservée au-dessus de l'emprise selon la taille (les bâtiments de 3 cases sont les plus hauts).
const MARGIN_X = 34, ROOM_UP = [0, 100, 130, 175], ROOM_DOWN = 10;
// Mémoire : on ne garde que les images du zoom et de la saison en cours, et on en crée au plus
// quelques-unes par image affichée (les autres bâtiments sont dessinés directement en attendant).
let spriteScale = 0, spriteSeason = -1, createdThisFrame = 0, frameMark = 0;
const MAX_NEW_PER_FRAME = 24;

const variantOf = (b, d) => (d.look === 'house' ? (b.x + b.y) % 3 : d.look === 'garden' ? (b.x + b.y) % 5 : 0);

function spriteKey(b, env, d, scale) {
  const variant = variantOf(b, d);
  const empty = d.look === 'house' && (b.res ?? 1) < 0.5 ? 1 : 0;
  const era = d.look === 'townhall' ? env.era : 0;
  return `${b.type}|${b.level || 1}|${env.season}|${era}|${empty}|${b.output ? 1 : 0}|${variant}|${scale}`;
}

export function drawBuildingCached(ctx, b, env, zoom) {
  const d = BUILDINGS[b.type];
  if (ANIMATED.has(d.look)) return drawBuilding(ctx, b, env);
  const scale = Math.max(0.25, Math.min(3, Math.round(zoom * 4) / 4));
  if (scale !== spriteScale || env.season !== spriteSeason) { sprites.clear(); spriteScale = scale; spriteSeason = env.season; }
  if (env.time !== frameMark) { frameMark = env.time; createdThisFrame = 0; }
  const key = spriteKey(b, env, d, scale);
  let sp = sprites.get(key);
  if (!sp) {
    if (createdThisFrame >= MAX_NEW_PER_FRAME) return drawBuilding(ctx, b, env);
    createdThisFrame++;
    if (sprites.size > 400) sprites.clear();
    const s = d.size;
    const v = variantOf(b, d);
    const [x0] = P(v, s), [x1] = P(v + s, 0), [, y0] = P(v, 0), [, y1] = P(v + s, s);
    const left = x0 - MARGIN_X, top = y0 - ROOM_UP[s];
    const w = x1 + MARGIN_X - left, h = y1 + ROOM_DOWN - top;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * scale);
    c.height = Math.ceil(h * scale);
    const cx = c.getContext('2d');
    cx.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
    // Même dessin, posé en (v, 0) : v reproduit la variante (couleurs des fleurs…) liée à la position.
    const r = drawBuilding(cx, { ...b, x: v, y: 0 }, env);
    sp = { c, left, top, w, h, top0: r.top, smoke: r.smoke };
    sprites.set(key, sp);
  }
  const [ox, oy] = P(b.x, b.y);
  const [bx, by] = P(variantOf(b, d), 0);
  const dx = ox - bx, dy = oy - by;
  ctx.drawImage(sp.c, sp.left + dx, sp.top + dy, sp.w, sp.h);
  return { top: sp.top0 + dy, smoke: sp.smoke ? [sp.smoke[0] + dx, sp.smoke[1] + dy] : null };
}

// Dessine un bâtiment. Renvoie { top: y du point le plus haut, smoke: point de fumée ou null }.
const FLAT = ['farm', 'sheep', 'vineyard', 'spicefarm', 'garden', 'park', 'market', 'ruins', 'well', 'fountain', 'statue', 'port', 'wonder', 'royalgarden', 'arena', 'palace'];

// Ellipse au sol (cercle en isométrique) centrée sur la case (i, j), de rayon r cases, surélevée de h.
function isoEllipse(ctx, i, j, r, h = 0) {
  const c = P(i, j);
  ctx.beginPath();
  ctx.ellipse(c[0], c[1] - h, r * 45.25, r * 22.63, 0, 0, Math.PI * 2);
}

export function drawBuilding(ctx, b, env) {
  const d = BUILDINGS[b.type];
  const { x, y } = b;
  const s = d.size;
  const season = env.season;
  let smoke = null;
  let top;
  if (!FLAT.includes(d.look)) {
    // Ombre douce au sol, portée vers la droite
    poly(ctx, [P(x + 0.2, y + 0.15), P(x + s + 0.25, y + 0.15), P(x + s + 0.25, y + s - 0.05), P(x + 0.2, y + s - 0.05)], 'rgba(20,30,15,0.16)');
  }

  switch (d.look) {
    case 'house': {
      const lv = b.level || 1;
      const L = HOUSE_LOOKS[lv];
      const empty = (b.res ?? 1) < 0.5;
      const bx = box(ctx, x + L.inset, y + L.inset, x + 1 - L.inset, y + 1 - L.inset, L.h, L.wall, L.roof, L.type, L.rh);
      const lit = env.season === 3 && !empty ? '#e8c46a' : '#3d4a5c';
      if (lv <= 2) timber(ctx, bx, lv === 1 ? '#6b4a2c' : '#5a3b22');
      if (lv === 1) {
        onFace(ctx, bx, 'R', 0.3, 0.55, 0.32, 0.5, lit);
      } else {
        windows(ctx, bx, lv === 2 ? 1 : 2, lv === 2 ? 1 : 2, lit, lv === 2 ? '#3f6f4a' : lv === 3 ? '#3f5f8f' : null);
      }
      if (lv >= 3 && env.season !== 3) {
        // Jardinières fleuries sous les fenêtres du bas
        const fl = ['#e2575a', '#f4c542', '#d97ad6'][(b.x + b.y) % 3];
        onFace(ctx, bx, 'R', 0.12, 0.88, 0.2, 0.25, '#6b4a2c');
        for (let i = 0; i < 6; i++) onFace(ctx, bx, 'R', 0.14 + i * 0.13, 0.2 + i * 0.13, 0.25, 0.29, i % 2 ? fl : '#4f8a34');
      }
      door(ctx, bx, lv === 1 ? 0.4 : 0.6);
      if (lv === 4) onFace(ctx, bx, 'R', 0, 1, 0.48, 0.53, '#c9a23a');
      if (lv >= 2 && !empty) smoke = chimney(ctx, x + 0.62, y + 0.25, L.h);
      top = bx.top;
      break;
    }
    case 'fisher': {
      const bx = box(ctx, x + 0.2, y + 0.2, x + 0.75, y + 0.75, d.h, d.wall, d.roof, 'gable', 9);
      door(ctx, bx, 0.4);
      const p = P(x + 0.95, y + 0.75);
      ctx.fillStyle = '#7a5530';
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 10, 3.5, 0.4, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,40,0.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const a = P(x + 0.1, y + 0.85 + i * 0.04), c = P(x + 0.5, y + 0.85 + i * 0.04); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
      top = bx.top;
      break;
    }
    case 'sheep': {
      ground(ctx, x + 0.05, y + 0.05, x + s - 0.05, y + s - 0.05, season === 3 ? '#e2e7ee' : '#8cc063', 'rgba(60,40,20,0.25)');
      // clôture
      ctx.strokeStyle = '#7a5a35';
      ctx.lineWidth = 1.5;
      const f = [P(x + 0.08, y + 0.08), P(x + s - 0.08, y + 0.08), P(x + s - 0.08, y + s - 0.08), P(x + 0.08, y + s - 0.08)];
      ctx.beginPath(); ctx.moveTo(f[0][0], f[0][1] - 3);
      for (const p of [...f.slice(1), f[0]]) ctx.lineTo(p[0], p[1] - 3);
      ctx.stroke();
      const bx = box(ctx, x + 0.12, y + 0.12, x + 0.95, y + 0.85, d.h, d.wall, d.roof, 'gable', 9);
      const t = env.time / 1000;
      for (let i = 0; i < 5; i++) {
        const p = P(x + 0.9 + ((i * 0.37 + Math.sin(t * 0.3 + i) * 0.05) % 0.9), y + 1 + ((i * 0.53) % 0.8));
        ctx.fillStyle = '#f4f1ea';
        ctx.beginPath(); ctx.ellipse(p[0], p[1] - 3, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a332c';
        ctx.beginPath(); ctx.arc(p[0] + 4, p[1] - 4, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      top = bx.top;
      break;
    }
    case 'charcoal': {
      const bx = box(ctx, x + 0.12, y + 0.12, x + 0.55, y + 0.55, d.h, d.wall, d.roof, 'hip', 8);
      const p = P(x + 0.72, y + 0.72);
      ctx.fillStyle = '#3b3632';
      ctx.beginPath(); ctx.ellipse(p[0], p[1] - 2, 13, 9, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p[0], p[1] - 2, 13, 5, 0, 0, Math.PI); ctx.fill();
      if (b.output) smoke = [p[0], p[1] - 10];
      top = bx.top;
      break;
    }
    case 'vineyard': {
      ground(ctx, x + 0.05, y + 0.05, x + s - 0.05, y + s - 0.05, season === 3 ? '#e6e9ee' : '#9c7a52', 'rgba(60,40,20,0.3)');
      const vine = season === 3 ? '#7a6a5a' : season === 2 ? '#b0682e' : '#4f8a34';
      for (let i = 0; i < 6; i++) {
        const t = 0.15 + i * 0.3;
        for (let j = 0; j < 7; j++) {
          const p = P(x + t, y + 0.9 + j * 0.15);
          ctx.fillStyle = vine;
          ctx.beginPath(); ctx.arc(p[0], p[1] - 3, 2.6, 0, Math.PI * 2); ctx.fill();
          if (season === 2 && (i + j) % 2 === 0) { ctx.fillStyle = '#5a2a6a'; ctx.beginPath(); ctx.arc(p[0] + 1, p[1] - 1, 1.3, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      const bx = box(ctx, x + 0.1, y + 0.1, x + 1.1, y + 0.75, d.h, d.wall, d.roof, 'gable', 10);
      top = bx.top;
      break;
    }
    case 'sawmill': {
      const bx = box(ctx, x + 0.12, y + 0.12, x + 0.88, y + 0.62, d.h, d.wall, d.roof, 'gable', 9);
      onFace(ctx, bx, 'L', 0.2, 0.8, 0, 0.6, '#5a3b22');
      for (const [i, j] of [[0.25, 0.8], [0.5, 0.82], [0.75, 0.8]]) {
        box(ctx, x + i - 0.12, y + j - 0.06, x + i + 0.12, y + j + 0.06, 3, '#d2a265', '#e2b77a', 'flat');
      }
      top = bx.top;
      break;
    }
    case 'mill': {
      const bx = box(ctx, x + 0.25, y + 0.25, x + 0.75, y + 0.75, d.h, d.wall, d.roof, 'hip', 12);
      door(ctx, bx, 0.4);
      const hub = up(P(x + 0.55, y + 0.62), d.h - 2);
      const a0 = b.eff > 0 ? env.time / 900 : 0.4;
      ctx.strokeStyle = '#5b4632';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = a0 + (i * Math.PI) / 2;
        const ex = hub[0] + Math.cos(a) * 20, ey = hub[1] + Math.sin(a) * 20;
        ctx.beginPath(); ctx.moveTo(hub[0], hub[1]); ctx.lineTo(ex, ey); ctx.stroke();
        const px = -Math.sin(a) * 4, py = Math.cos(a) * 4;
        poly(ctx, [[hub[0] + Math.cos(a) * 7, hub[1] + Math.sin(a) * 7], [ex, ey], [ex + px, ey + py], [hub[0] + Math.cos(a) * 7 + px, hub[1] + Math.sin(a) * 7 + py]], 'rgba(240,232,214,0.95)', 'rgba(90,70,50,0.6)');
      }
      ctx.fillStyle = '#3a2f28';
      ctx.beginPath(); ctx.arc(hub[0], hub[1], 2.2, 0, Math.PI * 2); ctx.fill();
      top = Math.min(bx.top, hub[1] - 20);
      break;
    }
    case 'bakery': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'gable', 10);
      windows(ctx, bx, 1, 1, '#f2c46b');
      door(ctx, bx, 0.6);
      if (b.output) smoke = up(P(x + 0.3, y + 0.28), d.h + 14);
      box(ctx, x + 0.24, y + 0.22, x + 0.36, y + 0.34, 14, '#9a8a7a', '#6a5a4a', 'flat', 0, d.h - 2);
      top = bx.top - 6;
      break;
    }
    case 'weaver': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'gable', 10);
      windows(ctx, bx, 1, 2);
      door(ctx, bx, 0.45);
      const p = P(x + 0.95, y + 0.55);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ['#8f6bb5', '#c0504d', '#3e7cb1'][i];
        ctx.fillRect(p[0] - 2 + i * 4, p[1] - 14, 3, 11);
      }
      top = bx.top;
      break;
    }
    case 'brewery': {
      const bx = box(ctx, x + 0.12, y + 0.15, x + 0.85, y + 0.75, d.h, d.wall, d.roof, 'gable', 11);
      door(ctx, bx, 0.6);
      for (const [i, j] of [[0.3, 0.9], [0.55, 0.92]]) {
        const p = P(x + i, y + j);
        ctx.fillStyle = '#7a5530';
        ctx.beginPath(); ctx.ellipse(p[0], p[1] - 5, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p[0] - 5, p[1] - 5); ctx.lineTo(p[0] + 5, p[1] - 5); ctx.stroke();
      }
      top = bx.top;
      break;
    }
    case 'smelter': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'gable', 9);
      onFace(ctx, bx, 'L', 0.3, 0.7, 0, 0.5, b.output ? '#ff8a2a' : '#2a201a');
      box(ctx, x + 0.62, y + 0.2, x + 0.8, y + 0.38, 30, '#6d6156', '#2e2925', 'flat', 0, 0);
      smoke = b.output ? up(P(x + 0.71, y + 0.29), 30) : null;
      top = bx.top - 10;
      break;
    }
    case 'winepress': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'hip', 11);
      onFace(ctx, bx, 'L', 0.35, 0.65, 0, 0.6, '#5a2a30');
      windows(ctx, bx, 1, 1);
      top = bx.top;
      break;
    }
    case 'port': {
      // Ponton en bois, entrepôt, grue et caisses
      ground(ctx, x + 0.02, y + 0.02, x + s - 0.02, y + s - 0.02, '#9a7650', 'rgba(60,40,20,0.45)');
      ctx.strokeStyle = 'rgba(60,40,20,0.35)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const a = P(x + 0.02, y + (i * s) / 8), c = P(x + s - 0.02, y + (i * s) / 8);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      }
      const bx = box(ctx, x + 0.12, y + 0.12, x + 1.1, y + 1.0, d.h, d.wall, d.roof, 'gable', 10);
      onFace(ctx, bx, 'R', 0.3, 0.7, 0, 0.6, '#4a3020');
      for (const [i, j] of [[1.3, 1.25], [1.55, 1.5], [1.25, 1.6]]) box(ctx, x + i, y + j, x + i + 0.22, y + j + 0.22, 6, '#b08455', '#c99a62', 'flat');
      const base = P(x + 1.55, y + 0.4);
      ctx.strokeStyle = '#4a3020';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(base[0], base[1] - 34); ctx.lineTo(base[0] + 18, base[1] - 30); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(base[0] + 16, base[1] - 30); ctx.lineTo(base[0] + 16, base[1] - 14); ctx.stroke();
      top = Math.min(bx.top, base[1] - 34);
      break;
    }
    case 'spicefarm': {
      ground(ctx, x + 0.05, y + 0.05, x + s - 0.05, y + s - 0.05, season === 3 ? '#b49a80' : '#8a5a34', 'rgba(60,40,20,0.3)');
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if (i < 3 && j < 3) continue;
          const p = P(x + 0.18 + i * 0.3, y + 0.18 + j * 0.3);
          ctx.fillStyle = '#3f7a2e';
          ctx.beginPath(); ctx.arc(p[0], p[1] - 4, 3.4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = (i + j) % 2 ? '#d9622b' : '#e9a23a';
          ctx.beginPath(); ctx.arc(p[0] + 1.5, p[1] - 5, 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      const bx = box(ctx, x + 0.1, y + 0.1, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'hip', 11);
      door(ctx, bx, 0.4);
      top = bx.top;
      break;
    }
    case 'jeweler': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'hip', 10);
      windows(ctx, bx, 1, 2, '#f2d27a');
      door(ctx, bx, 0.6, '#2f5c6b');
      onFace(ctx, bx, 'L', 0.15, 0.85, 0.86, 0.95, '#c9a23a');
      top = bx.top;
      break;
    }
    case 'library': {
      const bx = box(ctx, x + 0.12, y + 0.15, x + 0.88, y + 0.85, d.h, d.wall, d.roof, 'hip', 10);
      for (let i = 0; i < 4; i++) onFace(ctx, bx, 'L', 0.12 + i * 0.22, 0.17 + i * 0.22, 0, 0.85, '#f4ecd8');
      onFace(ctx, bx, 'R', 0.2, 0.8, 0.35, 0.7, '#3d4a5c');
      top = bx.top;
      break;
    }
    case 'university': {
      const bx = box(ctx, x + 0.1, y + 0.1, x + s - 0.1, y + s - 0.1, d.h, d.wall, d.roof, 'hip', 14);
      windows(ctx, bx, 2, 4, '#3d4a5c');
      for (let i = 0; i < 6; i++) onFace(ctx, bx, 'L', 0.08 + i * 0.16, 0.12 + i * 0.16, 0, 0.9, '#fbf6ea');
      const tw = box(ctx, x + 0.8, y + 0.8, x + 1.2, y + 1.2, 14, d.wall, '#c9a23a', 'dome', 12, d.h + 2);
      top = tw.top;
      break;
    }
    case 'doctor': {
      const bx = box(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, d.h, d.wall, d.roof, 'gable', 10);
      windows(ctx, bx, 1, 1);
      door(ctx, bx, 0.6);
      onFace(ctx, bx, 'L', 0.18, 0.42, 0.62, 0.72, '#2f8a5a');
      onFace(ctx, bx, 'L', 0.26, 0.34, 0.5, 0.84, '#2f8a5a');
      top = bx.top;
      break;
    }
    case 'hospital': {
      const bx = box(ctx, x + 0.1, y + 0.15, x + s - 0.1, y + s - 0.2, d.h, d.wall, d.roof, 'gable', 14);
      windows(ctx, bx, 2, 4, '#4a6a8a');
      onFace(ctx, bx, 'L', 0.44, 0.56, 0.58, 0.68, '#c0392b');
      onFace(ctx, bx, 'L', 0.48, 0.52, 0.5, 0.76, '#c0392b');
      top = flag(ctx, [P(x + 1, y + 1)[0], bx.top], 12, '#ffffff');
      break;
    }
    case 'guardpost': {
      const bx = box(ctx, x + 0.2, y + 0.2, x + 0.8, y + 0.8, d.h, d.wall, '#8a8070', 'flat');
      for (const [i, j] of [[0.2, 0.2], [0.68, 0.2], [0.2, 0.68], [0.68, 0.68]]) box(ctx, x + i, y + j, x + i + 0.12, y + j + 0.12, 4, d.wall, '#8a8070', 'flat', 0, d.h);
      door(ctx, bx, 0.4, '#3a2a1a');
      top = flag(ctx, [P(x + 0.5, y + 0.5)[0], bx.top - 4], 12, '#3d4a6a');
      break;
    }
    case 'ruins': {
      const p = P(x + 0.5, y + 0.5);
      ground(ctx, x + 0.1, y + 0.1, x + 0.9, y + 0.9, '#5a524a', 'rgba(0,0,0,0.3)');
      box(ctx, x + 0.2, y + 0.2, x + 0.45, y + 0.3, 9, '#4a4440', '#2a2522', 'flat');
      box(ctx, x + 0.55, y + 0.5, x + 0.8, y + 0.62, 5, '#4a4440', '#2a2522', 'flat');
      ctx.fillStyle = '#2a2522';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(p[0] - 10 + i * 4, p[1] + (i % 2) * 3, 2, 0, Math.PI * 2); ctx.fill(); }
      top = p[1] - 14;
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
    case 'royalgarden': {
      // Parterres à la française : allées de gravier, haies taillées, bassin central et arbres aux coins
      const winter = season === 3;
      ground(ctx, x + 0.04, y + 0.04, x + s - 0.04, y + s - 0.04, winter ? '#e6ebf0' : '#6fae52', 'rgba(40,80,30,0.45)');
      ground(ctx, x + 1.3, y + 0.04, x + 1.7, y + s - 0.04, '#e3d6b4');
      ground(ctx, x + 0.04, y + 1.3, x + s - 0.04, y + 1.7, '#e3d6b4');
      const beds = [[0.25, 0.25], [1.85, 0.25], [0.25, 1.85], [1.85, 1.85]];
      const flowers = ['#e2575a', '#f4c542', '#d97ad6', '#ffffff'];
      for (const [k, [i, j]] of beds.entries()) {
        box(ctx, x + i, y + j, x + i + 0.9, y + j + 0.9, 4, '#3f7a2e', winter ? '#dfe7df' : '#4f8f38', 'flat');
        if (!winter) ground(ctx, x + i + 0.2, y + j + 0.2, x + i + 0.7, y + j + 0.7, flowers[(k + b.x) % flowers.length]);
      }
      const c = P(x + 1.5, y + 1.5);
      ctx.fillStyle = '#cfc9bd';
      isoEllipse(ctx, x + 1.5, y + 1.5, 0.42); ctx.fill();
      ctx.fillStyle = winter ? '#cfe3f2' : '#4f9bd0';
      isoEllipse(ctx, x + 1.5, y + 1.5, 0.33); ctx.fill();
      ctx.fillStyle = '#e9e2d2';
      ctx.fillRect(c[0] - 2.5, c[1] - 20, 5, 20);
      ctx.beginPath(); ctx.ellipse(c[0], c[1] - 20, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      if (!winter) {
        ctx.fillStyle = 'rgba(200,230,255,0.85)';
        const t = performance.now() / 220;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t * 0.2;
          ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * 6, c[1] - 16 + Math.sin(a) * 3, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (const [i, j, v] of [[0.15, 0.15, 2], [2.85, 0.15, 2], [0.15, 2.85, 2], [2.85, 2.85, 2], [1.5, 0.15, 0], [0.15, 1.5, 0]]) treeAt(ctx, x + i, y + j, v, season, 0.85);
      top = P(x + 0.15, y + 0.15)[1] - 40;
      break;
    }
    case 'arena': {
      // Amphithéâtre de pierre : mur extérieur à arcades, gradins et piste de sable
      const cx = x + 1.5, cy = y + 1.5, R = 1.42, H = 30;
      const c = P(cx, cy);
      const rx = R * 45.25, ry = R * 22.63;
      ground(ctx, x + 0.02, y + 0.02, x + s - 0.02, y + s - 0.02, '#cbbd9a', 'rgba(80,60,30,0.3)');
      ctx.fillStyle = 'rgba(20,30,15,0.18)';
      isoEllipse(ctx, cx + 0.15, cy + 0.05, R); ctx.fill();
      // Mur extérieur (moitié avant visible)
      ctx.fillStyle = '#c9b48f';
      ctx.beginPath();
      ctx.ellipse(c[0], c[1], rx, ry, 0, 0, Math.PI);
      ctx.ellipse(c[0], c[1] - H, rx, ry, 0, Math.PI, 0, true);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.stroke();
      // Arcades sur deux rangs
      for (const [hv, n] of [[0.18, 14], [0.6, 14]]) {
        for (let k = 1; k < n; k++) {
          const a = (k / n) * Math.PI;
          const px = c[0] + Math.cos(a) * rx, py = c[1] + Math.sin(a) * ry - H * hv;
          const w = 3.2 * Math.max(0.35, Math.sin(a));
          ctx.fillStyle = '#5b4a36';
          ctx.fillRect(px - w, py - 8, w * 2, 8);
          ctx.beginPath(); ctx.ellipse(px, py - 8, w, 2.2, 0, Math.PI, 0); ctx.fill();
        }
      }
      // Dessus : gradins puis piste
      ctx.fillStyle = '#ddcca6';
      isoEllipse(ctx, cx, cy, R, H); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,70,40,0.35)';
      for (let k = 1; k <= 4; k++) { isoEllipse(ctx, cx, cy, R - k * 0.14, H - k * 3); ctx.stroke(); }
      ctx.fillStyle = season === 3 ? '#eef2f5' : '#e6c98f';
      isoEllipse(ctx, cx, cy, R * 0.52, H - 16); ctx.fill();
      ctx.strokeStyle = 'rgba(90,70,40,0.4)'; ctx.stroke();
      // Oriflammes
      for (const a of [Math.PI * 1.15, Math.PI * 1.5, Math.PI * 1.85]) {
        const p = [c[0] + Math.cos(a) * rx * 0.98, c[1] + Math.sin(a) * ry * 0.98 - H];
        flag(ctx, p, 16, '#b8443a');
      }
      top = c[1] - ry - H - 18;
      break;
    }
    case 'lighthouse': {
      // Socle de pierre, tour rayée et lanterne qui éclaire la nuit (hiver)
      ground(ctx, x + 0.04, y + 0.04, x + s - 0.04, y + s - 0.04, '#a8a397', 'rgba(60,50,40,0.4)');
      const base = box(ctx, x + 0.35, y + 0.35, x + 1.65, y + 1.65, 10, '#9d978c', '#b9b3a6', 'flat');
      let h = base.h, last = base;
      const segs = 6;
      for (let k = 0; k < segs; k++) {
        const ins = 0.6 + k * 0.035;
        last = box(ctx, x + ins, y + ins, x + 2 - ins, y + 2 - ins, 13, k % 2 ? '#b8443a' : '#f2efe8', '#d8d2c6', 'flat', 0, h);
        h += 13;
      }
      const lamp = box(ctx, x + 0.78, y + 0.78, x + 1.22, y + 1.22, 10, '#ffe8a3', '#2e3a4a', 'dome', 9, h);
      onFace(ctx, last, 'L', 0.35, 0.65, 0.1, 0.6, '#4a3020');
      const c = up(P(x + 1, y + 1), h + 5);
      const glow = ctx.createRadialGradient(c[0], c[1], 1, c[0], c[1], 26);
      glow.addColorStop(0, 'rgba(255,230,150,0.75)');
      glow.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(c[0], c[1], 26, 0, Math.PI * 2); ctx.fill();
      const t = performance.now() / 1400;
      ctx.fillStyle = 'rgba(255,236,170,0.16)';
      ctx.beginPath(); ctx.moveTo(c[0], c[1]);
      ctx.arc(c[0], c[1], 90, t, t + 0.35); ctx.closePath(); ctx.fill();
      top = lamp.top;
      break;
    }
    case 'palace': {
      // Corps central à dôme doré, deux ailes, colonnade et cour d'honneur
      ground(ctx, x + 0.04, y + 0.04, x + s - 0.04, y + s - 0.04, '#d8cfbd', 'rgba(80,60,30,0.3)');
      ground(ctx, x + 2.2, y + 0.9, x + 2.96, y + 2.1, season === 3 ? '#e6ebf0' : '#79b85a');
      const wl = box(ctx, x + 0.15, y + 0.15, x + 1.0, y + 2.85, 30, '#f4ecdc', '#2c3e66', 'hip', 14);
      const wr = box(ctx, x + 1.0, y + 0.15, x + 2.85, y + 0.95, 30, '#f4ecdc', '#2c3e66', 'hip', 14);
      const main = box(ctx, x + 0.95, y + 0.9, x + 2.15, y + 2.1, 40, '#fbf6ea', '#2c3e66', 'hip', 18);
      for (const bx of [wl, wr]) windows(ctx, bx, 2, 4, '#4a5f7f');
      windows(ctx, main, 2, 2, '#4a5f7f');
      for (let i = 0; i < 6; i++) onFace(ctx, main, 'L', 0.1 + i * 0.16, 0.14 + i * 0.16, 0, 0.62, '#ffffff');
      onFace(ctx, main, 'L', 0, 1, 0.62, 0.68, '#c9a23a');
      onFace(ctx, main, 'L', 0.42, 0.58, 0, 0.4, '#5a3b22');
      const dome = box(ctx, x + 1.25, y + 1.2, x + 1.85, y + 1.8, 10, '#fbf6ea', '#d4af37', 'dome', 18, 40);
      const p = [P(x + 1.55, y + 1.5)[0], dome.top];
      top = flag(ctx, p, 16, '#2f6fb5');
      for (const bx of [wl, wr]) flag(ctx, [mid(bx.W, bx.E)[0], bx.top], 10, '#c9a23a');
      break;
    }
    default: {
      const bx = box(ctx, x + 0.15, y + 0.15, x + s - 0.15, y + s - 0.15, d.h || 14, d.wall || '#bbbbbb', d.roof || '#777777', 'hip', 10);
      top = bx.top;
    }
  }
  return { top, smoke };
}
