// sw.js – Service Worker
const CACHE_NAME = "tasker-pwa-v4";
const PRECACHE = ["/index.html", "/styles.css", "/manifest.json"];

self.addEventListener("install", (e) => {
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()) // Take over all pages immediately
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-HTTP, extensions, Google APIs
  if (!url.protocol.startsWith("http")) return;
  if (url.hostname !== location.hostname) return; // Let API calls go through normally

  // JS and CSS → Network first (so code updates are picked up immediately)
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request)) // Fallback to cache if offline
    );
    return;
  }

  // HTML → Network first (always get fresh page)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Everything else → Cache first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
