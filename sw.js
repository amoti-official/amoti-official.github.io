/* GOURMET OS — Service Worker（network-first / offline fallback） */
const CACHE = 'gourmet-os-v3-20260921';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;          // 外部フォント等はそのまま
  /* index.html/ルート/ SW自身は必ず最新を取りに行き、キャッシュは非常用のみ */
  const isPrimary = url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/sw.js');
  e.respondWith(
    fetch(e.request, { cache: isPrimary ? 'no-store' : 'default' })
      .then(res => {
        if (!isPrimary) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
