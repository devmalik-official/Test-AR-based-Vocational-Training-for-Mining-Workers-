const CACHE_NAME = 'sih-fire-safety-v16';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/localization/translations.js',
  './js/storage/LocalStorageManager.js',
  './js/assessment/AssessmentEngine.js',
  './js/certificate/CertificateGenerator.js',
  './js/ar/ARManager.js',
  './js/ar/SurfaceDetector.js',
  './js/ar/PlacementManager.js',
  './js/scenarios/FireScenario.js',
  './js/objects/Fire.js',
  './js/objects/Extinguisher.js',
  './js/objects/SprayEffect.js',
  './data/scenarios.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
