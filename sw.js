/* Pfotenalltag – Service Worker (Netz zuerst, Cache als Rückfallebene)
   Verhalten:
   - Online: Die App wird immer frisch vom Server geladen; der Cache wird dabei
     nebenbei aktualisiert. Eine Cache-Version muss künftig NICHT mehr geändert werden.
   - Offline: Die zuletzt geladene Fassung wird aus dem Cache ausgeliefert.
   - Alte Caches früherer Versionen (pfotenalltag-2.2 usw.) werden beim Aktivieren gelöscht.
*/
const CACHE = 'pfotenalltag-live';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './sw.js'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Jede Datei einzeln laden, damit eine fehlende Datei die Installation nicht verhindert.
    await Promise.all(PRECACHE.map(async url => {
      try { const r = await fetch(url, { cache: 'no-cache' }); if (r.ok) await cache.put(url, r); } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req, { cache: 'no-cache' });
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const index = await cache.match('./index.html') || await cache.match('./');
        if (index) return index;
      }
      return new Response('Offline – diese Datei ist noch nicht gespeichert.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
