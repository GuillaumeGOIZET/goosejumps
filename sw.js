/* =========================================================
   Service worker – stratégie « cache-first »
   Au premier chargement, tous les fichiers de l'app sont mis en cache.
   Ensuite l'app fonctionne entièrement hors-ligne.

   IMPORTANT : à chaque modification d'un fichier de l'app,
   augmenter CACHE_VERSION pour que les téléphones récupèrent la nouvelle version.
   ========================================================= */

const CACHE_VERSION = 'v12';
const CACHE_NAME = 'goose-jumps-' + CACHE_VERSION;

// Tous les fichiers nécessaires pour jouer hors-ligne
const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',

  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'css/screens.css',
  'css/motion.css',

  'js/app.js',
  'js/state.js',
  'js/game.js',
  'js/goose.js',
  'js/ui.js',
  'js/motion.js',
  'js/sound.js',
  'js/install.js',
  'js/screens/home.js',
  'js/screens/rules.js',
  'js/screens/players.js',
  'js/screens/order.js',
  'js/screens/turn.js',
  'js/screens/question.js',
  'js/screens/event.js',
  'js/screens/battle.js',
  'js/screens/ranking.js',
  'js/screens/victory.js',

  'data/questions.json',
  'data/cards.json',
  'data/board.json',

  'assets/fonts/lilita-one-400.woff2',
  'assets/fonts/nunito-600.woff2',
  'assets/fonts/nunito-800.woff2',
  'assets/fonts/nunito-900.woff2',

  // Les 5 oies (en pied + tête)
  'assets/gooses/sir-honk.webp',
  'assets/gooses/sir-honk-head.webp',
  'assets/gooses/zippy.webp',
  'assets/gooses/zippy-head.webp',
  'assets/gooses/daisy.webp',
  'assets/gooses/daisy-head.webp',
  'assets/gooses/bowie.webp',
  'assets/gooses/bowie-head.webp',
  'assets/gooses/queenie.webp',
  'assets/gooses/queenie-head.webp',

  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png'
];

// Installation : on met tout en cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activation : on supprime les anciens caches (anciennes versions)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('goose-jumps-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Requêtes : d'abord le cache, sinon le réseau
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // On garde une copie des nouveaux fichiers pour la prochaine fois
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Hors-ligne et pas en cache : pour une page, on renvoie l'app
          if (request.mode === 'navigate') return caches.match('index.html');
          return Response.error();
        });
    })
  );
});
