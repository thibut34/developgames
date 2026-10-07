// Service worker : le jeu reste jouable hors connexion une fois chargé.
// Réseau d'abord (pour toujours avoir la dernière version), cache en secours.
const CACHE = 'developgames-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // « no-cache » : on demande toujours au serveur si le fichier a changé, pour ne jamais mélanger
  // des fichiers d'une ancienne version avec ceux de la nouvelle juste après une mise à jour.
  const fresh = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache' }) : fetch(req, { cache: 'no-cache' });
  e.respondWith(
    fresh
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
