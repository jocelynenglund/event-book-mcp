// EventPad service worker: lets the app install, and open offline.
// Network first, so a deploy is picked up straight away; the cache is only the fallback when there's
// no connection. Models live in IndexedDB anyway.
//
// In the deployed build (scripts/build.mjs) BUILD names this build and PRECACHE lists its files (the page and
// its hashed scripts and styles): they are kept at install, served from the cache (their names change with
// their content), and the caches of earlier builds are deleted when this one takes over. A new build installs
// all of its files before it takes over, so a page never runs a mix of old and new files. Unbundled (the repo
// root, local dev) the two stay as they are: nothing is precached.

const BUILD = '__BUILD__';
const PRECACHE = [/*__PRECACHE__*/];
const CACHE = 'eventpad-' + BUILD;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    if (PRECACHE.length) {
      const cache = await caches.open(CACHE);
      // cache: 'reload' so a half-fresh HTTP cache can't hand this build an older file
      await Promise.all(PRECACHE.map(async f => {
        const res = await fetch(new Request(f, { cache: 'reload' }));
        if (!res.ok) throw new Error('precache ' + f + ' ' + res.status);
        await cache.put(new URL(f, self.location).href, res);
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('eventpad-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  // Only our own files; the share API and fonts go straight to the network
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  const hashed = PRECACHE.length && /\/assets\/[^/]+\.[A-Z0-9]{8}\.(js|css)$/.test(url.pathname);
  e.respondWith((async () => {
    // A hashed file never changes: the cache first
    if (hashed) {
      const hit = await caches.match(req, { cacheName: CACHE });
      if (hit) return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    } catch (err) {
      const cached = await caches.match(req) || await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') return (await caches.match('./')) || (await caches.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
