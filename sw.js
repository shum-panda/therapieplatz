// Offline-Cache: erst Netz, bei fehlender Verbindung aus dem Cache.
// Es werden nur die Dateien der App selbst gecacht. Deine Einträge liegen im localStorage, nicht hier.
const CACHE = "therapieplatz-v1";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
  "./fonts/fonts.css",
  "./fonts/fraunces-500-latin.woff2", "./fonts/fraunces-500-latin-ext.woff2",
  "./fonts/fraunces-600-latin.woff2", "./fonts/fraunces-600-latin-ext.woff2",
  "./fonts/nunito-400-latin.woff2", "./fonts/nunito-400-latin-ext.woff2",
  "./fonts/nunito-600-latin.woff2", "./fonts/nunito-600-latin-ext.woff2",
  "./fonts/nunito-700-latin.woff2", "./fonts/nunito-700-latin-ext.woff2",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const base = new URL("./", self.location).pathname;
  if (e.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(base)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
