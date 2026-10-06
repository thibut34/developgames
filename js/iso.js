// Projection isométrique : cases (i, j) <-> pixels du monde.
import { TW, TH, MAP } from './config.js';

export const OX = (MAP * TW) / 2;     // décalage pour que tout soit en coordonnées positives
export const OY = 90;                 // marge en haut pour les bâtiments hauts
export const WORLD_W = MAP * TW;
export const WORLD_H = MAP * TH + OY + 60;

// Coin du haut de la case (i, j) ; fonctionne aussi avec des fractions.
export const P = (i, j) => [((i - j) * TW) / 2 + OX, ((i + j) * TH) / 2 + OY];

export function worldToTile(wx, wy) {
  const a = (wx - OX) / (TW / 2), b = (wy - OY) / (TH / 2);
  return { x: Math.floor((a + b) / 2), y: Math.floor((b - a) / 2) };
}
