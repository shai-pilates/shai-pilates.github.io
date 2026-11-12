// Network-first: always try the latest version, fall back to the cached copy when offline.
// Content comes from the cloud (Supabase); the app keeps its own copy in localStorage for offline use.
// The Supabase library (jsdelivr, fixed version) is cached too, so the app opens offline.
const CACHE = "shai-studio-v3";
const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", LIB];

self.addEventListener("install", e => {
  // Add one by one, so a missing file does not stop the install.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("shai-studio") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.href === LIB) {   // fixed version never changes: cache first
    e.respondWith(caches.match(LIB).then(r => r || fetch(e.request).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(LIB, copy)); } return res; })));
    return;
  }
  if (url.origin !== location.origin) return;   // the cloud itself is never cached here
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
