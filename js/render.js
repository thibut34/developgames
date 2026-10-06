// Dessin de la carte et des bâtiments sur le canvas.
import { TILE, MAP_W, MAP_H, T, BUILDINGS } from './config.js';
import { canPlace, buildingAt } from './game.js';

const hash = (x, y) => {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

// Le terrain ne change pas : on le dessine une seule fois dans un canvas hors écran.
function drawTerrain(tiles) {
  const c = document.createElement('canvas');
  c.width = MAP_W * TILE;
  c.height = MAP_H * TILE;
  const ctx = c.getContext('2d');

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = tiles[y * MAP_W + x];
      const px = x * TILE, py = y * TILE, h = hash(x, y);

      ctx.fillStyle = `hsl(${95 + h * 10}, 42%, ${46 + h * 6}%)`;
      ctx.fillRect(px, py, TILE, TILE);

      if (t === T.WATER) {
        ctx.fillStyle = `hsl(205, 55%, ${48 + h * 4}%)`;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + TILE * (0.3 + h * 0.4), py + TILE * 0.55, 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (t === T.ROCK) {
        ctx.fillStyle = `hsl(30, 5%, ${52 + h * 8}%)`;
        ctx.fillRect(px, py, TILE, TILE);
        for (let i = 0; i < 3; i++) {
          const rx = px + TILE * (0.2 + hash(x + i, y) * 0.6);
          const ry = py + TILE * (0.2 + hash(x, y + i) * 0.6);
          ctx.fillStyle = i % 2 ? '#bdbdbd' : '#6f6f6f';
          ctx.beginPath();
          ctx.ellipse(rx, ry, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (t === T.FOREST) {
        for (let i = 0; i < 3; i++) {
          const tx = px + TILE * (0.22 + hash(x + i * 3, y) * 0.56);
          const ty = py + TILE * (0.25 + hash(x, y + i * 7) * 0.5);
          ctx.fillStyle = '#5b3d1e';
          ctx.fillRect(tx - 2, ty + 4, 4, 9);
          ctx.fillStyle = `hsl(${120 + i * 8}, 45%, ${24 + h * 8}%)`;
          ctx.beginPath();
          ctx.arc(tx, ty, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= MAP_W; x++) { ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, c.height); ctx.stroke(); }
  for (let y = 0; y <= MAP_H; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(c.width, y * TILE); ctx.stroke(); }
  return c;
}

function drawBuilding(ctx, type, x, y, alpha = 1) {
  const def = BUILDINGS[type];
  const s = def.size * TILE - 6, px = x * TILE + 3, py = y * TILE + 3;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.roundRect(px + 3, py + 4, s, s, 8); ctx.fill();
  ctx.fillStyle = def.color;
  ctx.beginPath(); ctx.roundRect(px, py, s, s, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `${Math.round(s * 0.55)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, px + s / 2, py + s / 2 + 2);
  ctx.globalAlpha = 1;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let terrain = null, terrainTiles = null;

  return function draw(g, cam, ui) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    if (terrainTiles !== g.tiles) { terrain = drawTerrain(g.tiles); terrainTiles = g.tiles; }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#23402a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const z = cam.zoom * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    ctx.drawImage(terrain, 0, 0);

    for (const b of g.buildings) {
      drawBuilding(ctx, b.type, b.x, b.y);
      if (!b.active) {
        const s = BUILDINGS[b.type].size * TILE;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.roundRect(b.x * TILE + 3, b.y * TILE + 3, s - 6, s - 6, 8); ctx.fill();
        ctx.font = '16px serif';
        ctx.fillText('💤', b.x * TILE + s - 12, b.y * TILE + 14);
      }
    }

    const outline = (x, y, size, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x * TILE + 1, y * TILE + 1, size * TILE - 2, size * TILE - 2, 9); ctx.stroke();
    };

    if (ui.selected && g.buildings.includes(ui.selected)) {
      outline(ui.selected.x, ui.selected.y, BUILDINGS[ui.selected.type].size, '#ffe066');
    }

    if (!ui.hover) return;
    const { x, y } = ui.hover;
    if (BUILDINGS[ui.tool]) {
      const ok = canPlace(g, ui.tool, x, y).ok;
      const s = BUILDINGS[ui.tool].size;
      ctx.fillStyle = ok ? 'rgba(80,220,120,0.35)' : 'rgba(230,60,60,0.35)';
      ctx.fillRect(x * TILE, y * TILE, s * TILE, s * TILE);
      drawBuilding(ctx, ui.tool, x, y, 0.6);
    } else if (ui.tool === 'demolish') {
      const b = buildingAt(g, x, y);
      if (b) outline(b.x, b.y, BUILDINGS[b.type].size, '#ff4d4d');
    } else {
      outline(x, y, 1, 'rgba(255,255,255,0.6)');
    }
  };
}
