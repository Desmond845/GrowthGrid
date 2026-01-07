// ===========================================
// GrowthGrid SERVICE WORKER
// ===========================================

// CHANGE THIS NUMBER EVERY TIME I UPDATE THE APP
const APP_VERSION = "1.2";
const CACHE_NAME = `growthgrid-${APP_VERSION}`;

// ========== FILES TO CACHE ==========
// Only cache what you need - no images
const CORE_FILES = [
  "GrowthGrid",
  "/GrowthGrid/index.html",
  "/GrowthGrid/style.css",
  "/GrowthGrid/script.js",
  "/GrowthGrid/img.png", 
  "/GrowthGrid/manifest.json", // PWA manifest
  "/GrowthGrid/sw.js", // This service worker
];

// Optional libraries (won't break if missing)
const OPTIONAL_LIBS = [];

// ========== INSTALL ==========
self.addEventListener("install", (event) => {
  console.log(`[GrowthGrid SW] Installing version ${APP_VERSION}`);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // 1. Cache CORE files (must succeed)
        return cache.addAll(CORE_FILES).then(() => {
          console.log("[GrowthGrid SW] Core files cached ✅");
          /*
            // 2. Try optional libs (won't break if fail)
            const optionalPromises = OPTIONAL_LIBS.map(lib => 
              cache.add(lib).catch(err => {
                console.log(`[GrowthGrid SW] Optional ${lib} not cached:`, err.message);
                return null; // Don't fail installation
              })
            );
            
            return Promise.all(optionalPromises);
            */
        });
      })
      .then(() => {
        console.log("[GrowthGrid SW] Installation complete 🎉");
        self.skipWaiting(); // Activate immediately
      })
      .catch((err) => {
        console.error("[GrowthGrid SW] Installation failed:", err);
        self.skipWaiting(); // Still activate
      })
  );
});

// ========== ACTIVATE ==========
self.addEventListener("activate", (event) => {
  console.log(`[GrowthGrid SW] Activating version ${APP_VERSION}`);

  event.waitUntil(
    // DELETE ALL OLD CACHES
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(`[GrowthGrid SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[GrowthGrid SW] Activation complete ✅");
        return self.clients.claim(); // Take control immediately
      })
  );
});

// ========== FETCH ==========
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and chrome extensions
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("chrome-extension://")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return from cache if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Don't cache non-successful responses
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Clone to cache
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // Network failed - you could show offline page here
          console.log("[GrowthGrid SW] Network failed for:", event.request.url);
          return new Response("You are offline", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/plain" }),
          });
        });
    })
  );
});
// ========== MESSAGES ==========
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }

  if (event.data === "clearCache") {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        console.log("Deleting cache:", key);
        caches.delete(key);
      });
    });
  }
});
