// Mini-carte : vue d'ensemble de l'île, cadre de la caméra, toucher pour s'y rendre.
import { MAP, TW, TH } from './config.js';
import { WORLD_W, WORLD_H, OX, OY } from './iso.js';
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

  // Une case = un pixel d'une petite image, projetée ensuite en losange (isométrique) sur la mini-carte.
  // Bien plus rapide que de dessiner chaque case une par une (la carte en compte plus de 14 000).
  const tilesCanvas = document.createElement('canvas');
  tilesCanvas.width = MAP;
  tilesCanvas.height = MAP;
  const tctx = tilesCanvas.getContext('2d');
  const img = tctx.createImageData(MAP, MAP);
  const px = new Uint32Array(img.data.buffer);
  const rgba = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255);   // ordre mémoire RGBA
  };
  const TERRAIN_PX = TERRAIN_COLORS.map(rgba);
  const ROAD_PX = rgba('#d9c08e');
  const pxCache = new Map();
  const colorPx = (hex) => { let v = pxCache.get(hex); if (v === undefined) { v = rgba(hex); pxCache.set(hex, v); } return v; };

  function refresh(g) {
    const { dpr, scale } = size();
    for (let i = 0; i < MAP * MAP; i++) px[i] = g.roads[i] ? ROAD_PX : TERRAIN_PX[g.tiles[i]];
    for (const b of g.buildings) {
      const s = def(b).size;
      const color = colorPx(b.fire > 0 ? '#ff3b2f' : b.type === 'townhall' ? '#ffffff' : b.type === 'ruins' ? '#3a3633' : CAT_COLORS[def(b).cat] || '#dddddd');
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) px[(b.y + dy) * MAP + b.x + dx] = color;
    }
    tctx.putImageData(img, 0, 0);
    if (base.width !== canvas.width || base.height !== canvas.height) { base.width = canvas.width; base.height = canvas.height; }
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, base.width, base.height);
    // Case (i, j) -> monde : x = (i - j)·TW/2 + OX, y = (i + j)·TH/2 + OY (voir iso.js).
    const k = dpr * scale;
    bctx.setTransform((TW / 2) * k, (TH / 2) * k, (-TW / 2) * k, (TH / 2) * k, OX * k, OY * k);
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(tilesCanvas, 0, 0);
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
