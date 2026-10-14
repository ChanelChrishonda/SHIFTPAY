// Offline support for ShiftWorkPay.
// Bump VERSION every time you upload changes (or phones keep the old copy).
const VERSION = "shiftworkpay-2026-v8";
const FILES = [
  "./", "index.html", "styles.css",
  "taxes.js", "state.js", "storage.js", "views.js", "app.js",
  "tax-2026.json",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});

// network first so updates show up right away, saved copy when there's no signal
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) {
      const copy = r.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
    }
    return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match("index.html"))));
});
