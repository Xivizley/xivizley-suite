// ============================================================
// XIVIZLEY Suite — Progressive Web App (PWA) Service Worker
// Offline App Shell Caching & Resilient Connectivity
// ============================================================

const CACHE_NAME = "xivizley-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

// 1. Kurulum (Install) — Temel Kabuğu Önbelleğe Al
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[XIVIZLEY PWA] Önbellekleme kurulum uyarısı:", err);
      })
  );
});

// 2. Etkinleştirme (Activate) — Eski Önbellekleri Temizle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. İstek Yönetimi (Fetch)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API rotaları ve WebSocket/SSE akışları her zaman doğrudan ağdan gitmeli
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/ws/") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Sayfa Gezinmeleri (Navigation): Ağ Öncelikli, Ağ Kesilirse Önbellek
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match("/");
        if (cached) return cached;
        return new Response(
          "<!DOCTYPE html><html><head><meta charset='utf-8'><title>XIVIZLEY Çevrimdışı</title><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{background:#181e24;color:#f1f5f9;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:1rem;}h1{color:#0082c9;margin-bottom:0.5rem;}p{color:#94a3b8;font-size:0.9rem;}button{margin-top:1rem;background:#0082c9;color:#fff;border:none;padding:0.6rem 1.2rem;border-radius:0.5rem;font-weight:bold;cursor:pointer;}</style></head><body><h1>XIVIZLEY Cloud</h1><p>Şu anda internet bağlantınız ulaşılamıyor. Lütfen ağınızı kontrol edip tekrar deneyin.</p><button onclick='location.reload()'>Tekrar Dene</button></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })
    );
    return;
  }

  // Statik Varlıklar (İkonlar, CSS, JS): Stale-While-Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
