// Effets visuels : fumée, feu, textes flottants, nuages et météo.
import { WORLD_W, WORLD_H } from './iso.js';

const parts = [];      // particules dans le monde
const weather = [];    // particules à l'écran (neige, feuilles, pluie)
const clouds = Array.from({ length: 7 }, () => ({
  x: Math.random() * WORLD_W, y: Math.random() * WORLD_H, r: 120 + Math.random() * 160, v: 6 + Math.random() * 8,
}));

export function smoke(x, y) {
  parts.push({ k: 'smoke', x: x + (Math.random() - 0.5) * 2, y, vx: 4 + Math.random() * 4, vy: -10 - Math.random() * 6, life: 0, max: 2.6, r: 2.5 });
}
export function fire(x, y, w) {
  parts.push({ k: 'fire', x: x + (Math.random() - 0.5) * w, y, vx: (Math.random() - 0.5) * 6, vy: -22 - Math.random() * 18, life: 0, max: 0.9, r: 3 + Math.random() * 3 });
  if (Math.random() < 0.3) parts.push({ k: 'smoke', x: x + (Math.random() - 0.5) * w, y: y - 15, vx: 6, vy: -18, life: 0, max: 2.5, r: 4, dark: true });
}
export function floatText(x, y, text, color = '#fff') {
  parts.push({ k: 'text', x, y, vx: 0, vy: -16, life: 0, max: 1.6, text, color });
}
export function dust(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    parts.push({ k: 'dust', x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 15 - 8, life: 0, max: 0.7, r: 3 + Math.random() * 3 });
  }
}
export function sparkle(x, y) {
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 50;
    parts.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0, max: 1.2, r: 2, color: ['#ffd257', '#ffffff', '#7ddc8c'][i % 3] });
  }
}

export function update(dt, seasonIdx, w, h) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.k === 'smoke') p.r += dt * 4;
    if (p.k === 'spark') p.vy += 60 * dt;
  }
  if (parts.length > 600) parts.splice(0, parts.length - 600);

  for (const c of clouds) {
    c.x += c.v * dt;
    if (c.x - c.r > WORLD_W) { c.x = -c.r; c.y = Math.random() * WORLD_H; }
  }

  // Météo selon la saison : neige l'hiver, feuilles à l'automne, petite pluie au printemps.
  const kind = ['rain', null, 'leaf', 'snow'][seasonIdx];
  const target = kind === 'snow' ? 90 : kind === 'leaf' ? 25 : kind === 'rain' ? 40 : 0;
  while (weather.length < target) weather.push(newFlake(kind, w, h, true));
  for (let i = weather.length - 1; i >= 0; i--) {
    const f = weather[i];
    if (f.kind !== kind || weather.length > target) { weather.splice(i, 1); continue; }
    f.t += dt;
    f.x += (f.vx + Math.sin(f.t * f.wob) * f.sway) * dt;
    f.y += f.vy * dt;
    if (f.y > h + 10 || f.x > w + 20 || f.x < -20) weather[i] = newFlake(kind, w, h, false);
  }
}

function newFlake(kind, w, h, anywhere) {
  const f = { kind, x: Math.random() * w, y: anywhere ? Math.random() * h : -10, t: Math.random() * 10 };
  if (kind === 'snow') Object.assign(f, { vx: 8, vy: 25 + Math.random() * 25, wob: 1 + Math.random() * 2, sway: 12, r: 1 + Math.random() * 2 });
  else if (kind === 'leaf') Object.assign(f, { vx: 30, vy: 30 + Math.random() * 20, wob: 2 + Math.random() * 2, sway: 30, r: 3, color: ['#d9822b', '#c0502a', '#e5b23a'][Math.floor(Math.random() * 3)] });
  else Object.assign(f, { vx: -30, vy: 380 + Math.random() * 120, wob: 0, sway: 0, r: 1 });
  return f;
}

export function drawWorld(ctx, zoom = 1) {
  for (const p of parts) {
    const t = p.life / p.max;
    if (p.k === 'smoke') {
      ctx.fillStyle = p.dark ? `rgba(60,55,50,${0.45 * (1 - t)})` : `rgba(230,230,230,${0.5 * (1 - t)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    } else if (p.k === 'fire') {
      ctx.fillStyle = `rgba(255,${Math.round(200 - t * 150)},40,${1 - t})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill();
    } else if (p.k === 'dust') {
      ctx.fillStyle = `rgba(190,170,130,${0.6 * (1 - t)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    } else if (p.k === 'spark') {
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      ctx.globalAlpha = 1;
    } else if (p.k === 'text') {
      ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
      // Taille constante à l'écran, quel que soit le zoom.
      ctx.font = `bold ${(12 / zoom).toFixed(1)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3 / zoom;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
  }
}

export function drawClouds(ctx) {
  for (const c of clouds) {
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    grad.addColorStop(0, 'rgba(20,30,40,0.10)');
    grad.addColorStop(1, 'rgba(20,30,40,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawWeather(ctx) {
  for (const f of weather) {
    if (f.kind === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'leaf') {
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.5, f.t * 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(180,200,230,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - 3, f.y + 10); ctx.stroke();
    }
  }
}
