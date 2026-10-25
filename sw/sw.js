// Uyir service worker: keeps the app working offline, because a bite can happen anywhere.
// Built by vite.config.ts, which fills in VERSION (a hash of the built file names) and PRECACHE
// (every built script and stylesheet, including screens that load on demand), so the whole app
// is cached on the first visit, even if the phone loses signal right after.
//
// Each build's files live in their own cache and are never refreshed piecemeal, so a page never
// mixes files from two builds. A new build installs in the background and takes over the next
// time the app is opened (no skipWaiting): a page that is already open keeps every file it may
// still ask for, including screens it has not opened yet.
const VERSION = '__VERSION__';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png'];
const PRECACHE = __PRECACHE__;
const FONTS = 'uyir-fonts';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll([...SHELL, ...PRECACHE]);
      const html = await (await cache.match('./index.html')).text();
      const fontCss = html.match(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/);
      if (fontCss) await (await caches.open(FONTS)).add(fontCss[1].replace(/&amp;/g, '&')).catch(() => undefined);
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const old = (await caches.keys()).filter((k) => k !== VERSION && k !== FONTS);
      await Promise.all(old.map((k) => caches.delete(k)));
      // On the very first install there is no older build in use, so take control at once: the
      // page the person is on can then load any screen offline.
      if (old.length === 0) await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }
  if (url.origin !== self.location.origin) return; // Maps, OpenStreetMap, calendars: untouched.

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const navigate = req.mode === 'navigate';
      const hit = (await cache.match(req, { ignoreSearch: navigate })) ?? (navigate ? await cache.match('./index.html') : undefined);
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch {
        return Response.error();
      }
    })(),
  );
});
