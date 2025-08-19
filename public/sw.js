// Service Worker for P2P WebRTC Game
const CACHE_NAME = 'p2p-game-v4-' + Date.now(); // Dynamic cache name with timestamp
const urlsToCache = [
  './',
  './index.html',
  './menu.html',
  './connect.html',
  './game.html',
  './game-iso.html',
  './game-wolf.html',
  './game-backup.html',
  './multiplayer.js',
  './isometric-game.js',
  './visual-effects.js',
  './wolf-ai.js',
  './wolf-integration-fix.js',
  './vendor/qrcode.js',
  './vendor/jsqr.js',
  './manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, fallback to cache (for better updates)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For JS and HTML files, always try network first
  const isImportantFile = event.request.url.endsWith('.js') || 
                          event.request.url.endsWith('.html') ||
                          event.request.url.endsWith('/');

  if (isImportantFile) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with new version
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request);
        })
    );
  } else {
    // For other resources, use cache-first
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
        })
        .catch(() => {
          // Offline fallback
          if (event.request.destination === 'document') {
            return caches.match('./menu.html');
          }
        })
    );
  }
});