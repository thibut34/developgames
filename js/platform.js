// Portails de jeux. Sur CrazyGames, le SDK sert à sauvegarder (compte du joueur), à signaler
// les phases de jeu et à afficher des publicités aux pauses naturelles. Ailleurs, rien ne change.
// Activation : <html data-platform="crazygames"> (ajouté dans le zip CrazyGames) ou ?platform=crazygames.

const wanted = document.documentElement.dataset.platform
  || new URLSearchParams(location.search).get('platform') || '';

let sdk = null;
let playing = false;
let lastAd = performance.now();
const AD_GAP_MS = 4 * 60 * 1000;   // au plus une publicité toutes les 4 minutes

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

  // Publicité entre deux parties. done() est toujours appelé, publicité ou pas.
  breakAd(onStart, done) {
    if (!sdk || performance.now() - lastAd < AD_GAP_MS) { done(); return; }
    lastAd = performance.now();
    let finished = false;
    const end = () => { if (!finished) { finished = true; done(); } };
    try {
      sdk.ad.requestAd('midgame', { adStarted: onStart, adFinished: end, adError: end });
    } catch { end(); }
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
