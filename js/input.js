// Souris, tactile et clavier.
// - glisser : déplace la carte (ou trace des routes / démolit / défriche avec ces outils)
// - molette / pincer à deux doigts : zoom
// - toucher / cliquer : agir sur la case
import { WORLD_W, WORLD_H, worldToTile } from './iso.js';

export const MIN_ZOOM = 0.35, MAX_ZOOM = 2.2;
const DRAG_THRESHOLD = 7;

export function clampCamera(cam, canvas) {
  const vw = canvas.clientWidth / cam.zoom, vh = canvas.clientHeight / cam.zoom;
  cam.x = Math.min(Math.max(cam.x, -vw / 2), WORLD_W - vw / 2);
  cam.y = Math.min(Math.max(cam.y, -vh / 2), WORLD_H - vh / 2);
}

export function zoomAt(cam, canvas, p, factor) {
  const wx = cam.x + p.x / cam.zoom, wy = cam.y + p.y / cam.zoom;
  cam.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor));
  cam.x = wx - p.x / cam.zoom;
  cam.y = wy - p.y / cam.zoom;
  clampCamera(cam, canvas);
}

// paintTool() : true si l'outil courant « peint » en glissant (routes, démolir, défricher).
export function attachInput(canvas, cam, { onTap, onHover, onPaint, paintTool, onPaintEnd }) {
  const pointers = new Map();
  let start = null, mode = null; // mode : null | 'pan' | 'paint' | 'pinch'
  let lastPaint = null;

  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toTile = (p) => worldToTile(cam.x + p.x / cam.zoom, cam.y + p.y / cam.zoom);
  const pinch = () => {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  const paintAt = (p) => {
    const t = toTile(p);
    if (lastPaint && lastPaint.x === t.x && lastPaint.y === t.y) return;
    // Remplit les cases sautées si le doigt va vite.
    if (lastPaint) {
      const steps = Math.max(Math.abs(t.x - lastPaint.x), Math.abs(t.y - lastPaint.y));
      for (let i = 1; i < steps; i++) {
        onPaint({ x: Math.round(lastPaint.x + ((t.x - lastPaint.x) * i) / steps), y: Math.round(lastPaint.y + ((t.y - lastPaint.y) * i) / steps) });
      }
    }
    onPaint(t);
    lastPaint = t;
  };

  canvas.addEventListener('pointerdown', (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      start = p;
      mode = null;
      lastPaint = null;
      onHover(toTile(p), e.pointerType);
      // Clic droit ou molette : toujours déplacer la carte
      if (e.button === 1 || e.button === 2) mode = 'pan';
    } else {
      if (mode === 'paint') onPaintEnd();
      mode = 'pinch';
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    const prev = pointers.get(e.pointerId);
    if (!prev) { onHover(toTile(p), e.pointerType); return; }

    if (pointers.size === 1) {
      if (!mode && Math.hypot(p.x - start.x, p.y - start.y) > DRAG_THRESHOLD) {
        mode = paintTool() ? 'paint' : 'pan';
        if (mode === 'paint') paintAt(start);
      }
      if (mode === 'pan') {
        cam.x -= (p.x - prev.x) / cam.zoom;
        cam.y -= (p.y - prev.y) / cam.zoom;
        clampCamera(cam, canvas);
      } else if (mode === 'paint') {
        paintAt(p);
      }
      onHover(toTile(p), e.pointerType);
      pointers.set(e.pointerId, p);
    } else if (pointers.size === 2) {
      const before = pinch();
      pointers.set(e.pointerId, p);
      const after = pinch();
      if (before.dist > 0) zoomAt(cam, canvas, after.mid, after.dist / before.dist);
      cam.x -= (after.mid.x - before.mid.x) / cam.zoom;
      cam.y -= (after.mid.y - before.mid.y) / cam.zoom;
      clampCamera(cam, canvas);
    }
  });

  const end = (e, tap) => {
    if (!pointers.has(e.pointerId)) return;
    if (tap && pointers.size === 1 && !mode && e.button !== 2) onTap(toTile(local(e)));
    if (pointers.size === 1 && mode === 'paint') onPaintEnd();
    pointers.delete(e.pointerId);
    if (pointers.size === 0) mode = null;
  };
  canvas.addEventListener('pointerup', (e) => end(e, true));
  canvas.addEventListener('pointercancel', (e) => end(e, false));
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pointers.size) onHover(null, 'mouse'); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(cam, canvas, local(e), e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });
}
