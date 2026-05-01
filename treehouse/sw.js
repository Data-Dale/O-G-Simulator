const CACHE = 'treehouse-v1';
const ASSETS = [
  '/treehouse/',
  '/treehouse/index.html',
  '/treehouse/manifest.json',
  '/treehouse/css/app.css',
  '/treehouse/js/app.js',
  '/treehouse/js/db.js',
  '/treehouse/js/seed.js',
  '/treehouse/js/utils.js',
  '/treehouse/js/home.js',
  '/treehouse/js/calendar.js',
  '/treehouse/js/tasks.js',
  '/treehouse/js/meals.js',
  '/treehouse/js/lists.js',
  '/treehouse/js/screensaver.js',
  '/treehouse/js/admin.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
