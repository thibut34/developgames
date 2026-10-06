// Portails de jeux. Sur CrazyGames, le SDK sert à sauvegarder (compte du joueur), à signaler
// les phases de jeu et à proposer une publicité facultative contre une récompense. Ailleurs, rien ne change.
// Activation : <html data-platform="crazygames"> (ajouté dans le zip CrazyGames) ou ?platform=crazygames.

const wanted = document.documentElement.dataset.platform
  || new URLSearchParams(location.search).get('platform') || '';

let sdk = null;
let playing = false;
let nextReward = 0;
const REWARD_GAP_MS = 5 * 60 * 1000;   // une récompense au plus toutes les 5 minutes

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export const platform = {
  name: 'web',
  files: true,          // exporter / importer des fichiers de sauvegarde

  async init() {
    if (wanted !== 'crazygames') return;
    try {
      await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js');
      await window.CrazyGames.SDK.init();
      if (window.CrazyGames.SDK.environment === 'disabled') return;
      sdk = window.CrazyGames.SDK;
      platform.name = 'crazygames';
      platform.files = false;
      sdk.game.loadingStart();
    } catch {
      sdk = null;       // SDK injoignable (bloqueur…) : le jeu fonctionne quand même
    }
  },

  loaded() { sdk?.game.loadingStop(); },

  // Le joueur joue (partie affichée) ou fait une pause (menu principal).
  gameplay(on) {
    if (!sdk || on === playing) return;
    playing = on;
    try { if (on) sdk.game.gameplayStart(); else sdk.game.gameplayStop(); } catch { /* rien */ }
  },

  happy() { try { sdk?.game.happytime(); } catch { /* rien */ } },

  // Publicité proposée au joueur (jamais imposée) : il choisit de la regarder contre une récompense.
  get canReward() { return !!sdk && performance.now() >= nextReward; },
  get rewardWait() { return Math.max(0, Math.ceil((nextReward - performance.now()) / 60000)); },
  rewardAd(onStart, done) {
    if (!sdk) { done(false); return; }
    let finished = false;
    const end = (ok) => { if (!finished) { finished = true; if (ok) nextReward = performance.now() + REWARD_GAP_MS; done(ok); } };
    try {
      sdk.ad.requestAd('rewarded', { adStarted: onStart, adFinished: () => end(true), adError: () => end(false) });
    } catch { end(false); }
  },

  // Stockage : compte CrazyGames si disponible, sinon le navigateur.
  store: {
    getItem(k) {
      try { return sdk ? sdk.data.getItem(k) : localStorage.getItem(k); } catch { return null; }
    },
    setItem(k, v) {
      if (sdk) sdk.data.setItem(k, v); else localStorage.setItem(k, v);
    },
    removeItem(k) {
      try { if (sdk) sdk.data.removeItem(k); else localStorage.removeItem(k); } catch { /* rien */ }
    },
  },
};

export const store = platform.store;
