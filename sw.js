/* Pfotenalltag – Service Worker (versionsunabhängig)
   Diese Datei muss bei neuen App-Versionen NICHT mehr geändert werden.
   • Seite (index.html): immer zuerst aus dem Netz, am Browser-Zwischenspeicher vorbei
     („no-cache“ = beim Server nachfragen, ob es eine neuere Fassung gibt).
     Ohne Netz: die zuletzt geladene Fassung aus dem Offline-Speicher.
   • Übrige eigene Dateien (Icons, Manifest): sofort aus dem Offline-Speicher,
     im Hintergrund wird die aktuelle Fassung nachgeladen (für den nächsten Start).
   • Beim ersten Start werden nur alte Speicher DIESER App gelöscht (gleiches Präfix).
     Alle RH-Apps auf demselben GitHub-Pages-Konto teilen sich den Cache-Speicher –
     fremde Caches bleiben deshalb unangetastet. */
const CACHE = 'pfotenalltag';
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u =>
    c.add(new Request(u, { cache: 'no-cache' })).catch(() => null)))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function speichern(req, r) {
  if (r && r.ok && r.type === 'basic') { const kopie = r.clone(); caches.open(CACHE).then(c => c.put(req, kopie)); }
  return r;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const istSeite = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (istSeite) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(r => speichern(req, r))
        .catch(() => caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }))
          .then(m => m || caches.open(CACHE).then(c => c.match('./index.html')))
          .then(m => m || caches.open(CACHE).then(c => c.match('./'))))
    );
    return;
  }

  e.respondWith(caches.open(CACHE).then(c => c.match(req)).then(m => {
    const netz = fetch(req, { cache: 'no-cache' }).then(r => speichern(req, r)).catch(() => m);
    if (m) { e.waitUntil(netz); return m; }
    return netz;
  }));
});
