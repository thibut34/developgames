// Petits dessins réutilisés (arbres, montagnes) pré-rendus dans des canvas.
import { TW } from './config.js';

const SCALE = 2; // rendu en haute définition pour rester net au zoom
const cache = new Map();

function make(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w * SCALE;
  c.height = h * SCALE;
  const ctx = c.getContext('2d');
  ctx.scale(SCALE, SCALE);
  draw(ctx);
  c.w = w;
  c.h = h;
  return c;
}

// Arbre : variant 0-1 feuillu, 2 sapin. season 0-3.
export function tree(variant, season) {
  const key = `t${variant}-${season}`;
  if (cache.has(key)) return cache.get(key);
  const c = make(28, 44, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(14, 40, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5b3d1e';
    ctx.fillRect(12.5, 26, 3, 14);
    if (variant === 2) {
      const green = season === 3 ? '#2f5a3e' : '#2e6b3a';
      for (let i = 0; i < 3; i++) {
        const y = 6 + i * 8, w = 7 + i * 3;
        ctx.fillStyle = green;
        ctx.beginPath(); ctx.moveTo(14, y - 4); ctx.lineTo(14 + w, y + 10); ctx.lineTo(14 - w, y + 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.moveTo(14, y - 4); ctx.lineTo(14 + w, y + 10); ctx.lineTo(14, y + 10); ctx.closePath(); ctx.fill();
        if (season === 3) {
          ctx.fillStyle = '#f4f8ff';
          ctx.beginPath(); ctx.moveTo(14, y - 4); ctx.lineTo(14 + w * 0.5, y + 3); ctx.lineTo(14 - w * 0.5, y + 3); ctx.closePath(); ctx.fill();
        }
      }
      return;
    }
    if (season === 3) {
      ctx.strokeStyle = '#5b3d1e';
      ctx.lineWidth = 1.5;
      for (const [dx, dy] of [[-7, -10], [6, -12], [0, -16], [-4, -6], [5, -5]]) {
        ctx.beginPath(); ctx.moveTo(14, 28); ctx.lineTo(14 + dx, 26 + dy); ctx.stroke();
      }
      ctx.fillStyle = '#eef3fb';
      ctx.beginPath(); ctx.ellipse(14, 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const palettes = [
      ['#4f8f3a', '#5fa646', '#3d7a2e'],
      ['#5d9a3c', '#74b04c', '#467f2f'],
      ['#4f8f3a', '#5fa646', '#3d7a2e'],
      null,
    ];
    const autumn = variant === 0 ? ['#c8682a', '#e0913a', '#a44d22'] : ['#d8a535', '#e9c04c', '#b07f22'];
    const [mid, light, dark] = season === 2 ? autumn : palettes[variant];
    const blobs = [[14, 18, 11, dark], [9, 15, 7, mid], [18, 13, 8, mid], [13, 9, 7, light]];
    for (const [x, y, r, col] of blobs) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });
  cache.set(key, c);
  return c;
}

export function mountain(variant, season, gold = false) {
  const key = `m${variant}-${season}-${gold}`;
  if (cache.has(key)) return cache.get(key);
  const w = TW, h = 74;
  const c = make(w, h, (ctx) => {
    const peak = variant ? [w * 0.42, 8] : [w * 0.55, 4];
    const base = h - 16;
    ctx.fillStyle = '#7d7368';
    ctx.beginPath(); ctx.moveTo(2, base); ctx.lineTo(peak[0], peak[1]); ctx.lineTo(w - 2, base); ctx.lineTo(w / 2, h - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5e564e';
    ctx.beginPath(); ctx.moveTo(peak[0], peak[1]); ctx.lineTo(w - 2, base); ctx.lineTo(w / 2, h - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = season === 3 ? '#f2f6fc' : '#e9edf2';
    const cap = season === 3 ? 0.55 : 0.3;
    ctx.beginPath();
    ctx.moveTo(peak[0], peak[1]);
    ctx.lineTo(peak[0] + (w - 2 - peak[0]) * cap, peak[1] + (base - peak[1]) * cap);
    ctx.lineTo(peak[0] + (w / 2 - peak[0]) * cap * 0.6, peak[1] + (base - peak[1]) * cap * 0.8);
    ctx.lineTo(peak[0] + (2 - peak[0]) * cap, peak[1] + (base - peak[1]) * cap);
    ctx.closePath();
    ctx.fill();
    if (gold) {
      // Filons d'or : veines dorées sur le flanc
      ctx.strokeStyle = '#f0c64a';
      ctx.lineWidth = 2;
      for (const [x0, y0, x1, y1] of [[w * 0.3, base - 14, w * 0.45, base - 26], [w * 0.55, base - 10, w * 0.62, base - 24], [w * 0.4, base - 6, w * 0.5, base - 12]]) {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.fillStyle = '#ffe58a';
      for (const [x, y] of [[w * 0.45, base - 26], [w * 0.62, base - 24]]) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill(); }
    }
  });
  cache.set(key, c);
  return c;
}
