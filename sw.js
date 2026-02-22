/* Prahari Service Worker — cache app shell for offline */
const CACHE = "prahari-v1";
const SHELL = ["/", "/prahari-app.html", "/index.html", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).then(() => self.skipWaiting()))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
  );
});

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    fetch(e.request).then((r) => {
      const clone = r.clone();
      if (r.ok && u.origin === self.location.origin) caches.open(CACHE).then((cache) => cache.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request).then((c) => c || caches.match("/").then((c2) => c2 || new Response("Offline", { status: 503, statusText: "Offline" })))
  );
});
