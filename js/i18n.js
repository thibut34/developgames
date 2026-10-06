// Langue du jeu (français ou anglais). Par défaut : la langue du navigateur.
const KEY = 'developgames-lang';

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* stockage indisponible */ }
  return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const lang = detect();
export const EN = lang === 'en';

// Texte dans la langue du joueur : L('Bonjour', 'Hello').
export const L = (fr, en) => (EN ? en : fr);

export const locale = EN ? 'en-US' : 'fr-FR';

// Changer de langue recharge le jeu (la partie est sauvegardée avant).
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* rien */ }
  location.reload();
}
