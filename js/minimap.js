// Mini-carte : vue d'ensemble de l'île, cadre de la caméra, toucher pour s'y rendre.
import { MAP, T } from './config.js';
import { P, WORLD_W, WORLD_H } from './iso.js';
import { def } from './game.js';

const TERRAIN_COLORS = ['#7cb35a', '#3f7a35', '#9a958c', '#3f86c6', '#6d645b', '#8fa046', '#e3d29a', '#b5733e', '#d4b13c'];
const CAT_COLORS = { house: '#e0a96d', raw: '#e8d36a', industry: '#b07a4a', service: '#6aa7e8', deco: '#9be37a' };

export function createMinimap(canvas, cam, mainCanvas, onMove) {
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  const bctx = base.getContext('2d');

  const size = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    return { w, h, dpr, scale: Math.min(w / WORLD_W, h / WORLD_H) };
  };

  function refresh(g) {
    const { w, h, dpr, scale } = size();
    base.width = canvas.width;
    base.height = canvas.height;
    bctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    const diamond = (x, y, color) => {
      const pts = [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
      bctx.beginPath();
      bctx.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) bctx.lineTo(p[0], p[1]);
      bctx.closePath();
      bctx.fillStyle = color;
      bctx.fill();
      bctx.strokeStyle = color;
      bctx.lineWidth = 2;
      bctx.stroke();
    };
    for (let y = 0; y < MAP; y++) {
      for (let x = 0; x < MAP; x++) {
        const i = y * MAP + x;
        diamond(x, y, g.roads[i] ? '#d9c08e' : TERRAIN_COLORS[g.tiles[i]]);
      }
    }
    for (const b of g.buildings) {
      const s = def(b).size;
      const color = b.fire > 0 ? '#ff3b2f' : b.type === 'townhall' ? '#ffffff' : b.type === 'ruins' ? '#3a3633' : CAT_COLORS[def(b).cat] || '#ddd';
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) diamond(b.x + dx, b.y + dy, color);
    }
    void w; void h;
  }

  function draw() {
    const { dpr, scale } = size();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(cam.x, cam.y, mainCanvas.clientWidth / cam.zoom, mainCanvas.clientHeight / cam.zoom);
  }

  const jump = (e) => {
    const r = canvas.getBoundingClientRect();
    const { scale } = size();
    const wx = (e.clientX - r.left) / scale, wy = (e.clientY - r.top) / scale;
    cam.x = wx - mainCanvas.clientWidth / cam.zoom / 2;
    cam.y = wy - mainCanvas.clientHeight / cam.zoom / 2;
    onMove();
  };
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* rien */ }
    jump(e);
  });
  canvas.addEventListener('pointermove', (e) => { if (dragging) jump(e); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  return { refresh, draw };
}
