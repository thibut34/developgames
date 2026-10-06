// Souris + tactile : glisser pour déplacer, molette/pincer pour zoomer, toucher pour agir.
import { TILE, MAP_W, MAP_H } from './config.js';

const MIN_ZOOM = 0.4, MAX_ZOOM = 2.5, DRAG_THRESHOLD = 6;

export function clampCamera(cam, canvas) {
  const vw = canvas.clientWidth / cam.zoom, vh = canvas.clientHeight / cam.zoom;
  cam.x = Math.min(Math.max(cam.x, -vw / 2), MAP_W * TILE - vw / 2);
  cam.y = Math.min(Math.max(cam.y, -vh / 2), MAP_H * TILE - vh / 2);
}

export function attachInput(canvas, cam, { onTap, onHover }) {
  const pointers = new Map();
  let start = null, dragging = false;

  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toTile = (p) => ({
    x: Math.floor((cam.x + p.x / cam.zoom) / TILE),
    y: Math.floor((cam.y + p.y / cam.zoom) / TILE),
  });
  const zoomAt = (p, factor) => {
    const wx = cam.x + p.x / cam.zoom, wy = cam.y + p.y / cam.zoom;
    cam.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor));
    cam.x = wx - p.x / cam.zoom;
    cam.y = wy - p.y / cam.zoom;
    clampCamera(cam, canvas);
  };
  const pinch = () => {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) { start = p; dragging = false; }
    else dragging = true; // deux doigts : jamais un « toucher »
    if (e.pointerType !== 'mouse') onHover(toTile(p));
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    const prev = pointers.get(e.pointerId);
    if (!prev) { onHover(toTile(p)); return; }

    if (pointers.size === 1) {
      if (!dragging && Math.hypot(p.x - start.x, p.y - start.y) > DRAG_THRESHOLD) dragging = true;
      if (dragging) {
        cam.x -= (p.x - prev.x) / cam.zoom;
        cam.y -= (p.y - prev.y) / cam.zoom;
        clampCamera(cam, canvas);
      } else {
        onHover(toTile(p));
      }
      pointers.set(e.pointerId, p);
    } else if (pointers.size === 2) {
      const before = pinch().dist;
      pointers.set(e.pointerId, p);
      const after = pinch();
      if (before > 0) zoomAt(after.mid, after.dist / before);
    }
  });

  const end = (e, tap) => {
    if (!pointers.has(e.pointerId)) return;
    if (tap && pointers.size === 1 && !dragging) onTap(toTile(local(e)));
    pointers.delete(e.pointerId);
    if (pointers.size === 0) dragging = false;
  };
  canvas.addEventListener('pointerup', (e) => end(e, true));
  canvas.addEventListener('pointercancel', (e) => end(e, false));
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') onHover(null); });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(local(e), e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });
}
