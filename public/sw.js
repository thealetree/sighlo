// Minimal service worker: makes Sighlo installable and usable offline without touching
// the cross-origin news requests (rss2json / allorigins), which always go to the network.
const CACHE = "sighlo-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle same-origin GETs; let the news APIs and everything else hit the network.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // Navigations: try the network first so updates land, fall back to the cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html").then((cached) => cached ?? caches.match("/"))));
    return;
  }

  // Static assets: serve from cache, and refresh the copy in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
