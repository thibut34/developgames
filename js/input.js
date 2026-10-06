// Souris, tactile et clavier.
// - glisser : déplace la carte, ou trace un geste (route, zone) avec ces outils
// - clic droit : annule l'outil (glisser avec le clic droit déplace la carte)
// - molette / pincer à deux doigts : zoom
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

// handlers :
//   onTap(case), onHover(case, typeDePointeur), onCancel()
//   gesture() : 'road' | 'area' | null selon l'outil courant
//   onGesture(début, fin, terminé) : appelé pendant et à la fin d'un geste
export function attachInput(canvas, cam, h) {
  const pointers = new Map();
  let start = null, mode = null, button = 0; // mode : null | 'pan' | 'gesture' | 'pinch'
  let gStart = null;

  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toTile = (p) => worldToTile(cam.x + p.x / cam.zoom, cam.y + p.y / cam.zoom);
  const pinch = () => {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  const cancelGesture = () => {
    if (mode === 'gesture') h.onGesture(gStart, gStart, false, true);
    gStart = null;
  };

  canvas.addEventListener('pointerdown', (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      start = p;
      button = e.button;
      mode = e.button === 1 || e.button === 2 ? 'pan' : null;
      h.onHover(toTile(p), e.pointerType);
    } else {
      cancelGesture();
      mode = 'pinch';
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    const prev = pointers.get(e.pointerId);
    if (!prev) { h.onHover(toTile(p), e.pointerType); return; }

    if (pointers.size === 1) {
      const moved = Math.hypot(p.x - start.x, p.y - start.y) > DRAG_THRESHOLD;
      if (!mode && moved) {
        mode = h.gesture() ? 'gesture' : 'pan';
        if (mode === 'gesture') gStart = toTile(start);
      }
      if (mode === 'pan' && (button !== 2 || moved)) {
        cam.x -= (p.x - prev.x) / cam.zoom;
        cam.y -= (p.y - prev.y) / cam.zoom;
        clampCamera(cam, canvas);
      } else if (mode === 'gesture') {
        h.onGesture(gStart, toTile(p), false);
      }
      h.onHover(toTile(p), e.pointerType);
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

  const end = (e, ok) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    if (pointers.size === 1) {
      const moved = Math.hypot(p.x - start.x, p.y - start.y) > DRAG_THRESHOLD;
      if (ok && button === 2 && !moved) h.onCancel();
      else if (ok && !mode) h.onTap(toTile(p));
      else if (mode === 'gesture') {
        if (ok) h.onGesture(gStart, toTile(p), true);
        else cancelGesture();
        gStart = null;
      }
    }
    pointers.delete(e.pointerId);
    if (pointers.size === 0) mode = null;
  };
  canvas.addEventListener('pointerup', (e) => end(e, true));
  canvas.addEventListener('pointercancel', (e) => end(e, false));
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pointers.size) h.onHover(null, 'mouse'); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(cam, canvas, local(e), e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });
}
