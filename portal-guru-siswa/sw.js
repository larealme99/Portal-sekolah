// Service Worker untuk Portal Guru & Siswa Simpul Smandum
const CACHE_NAME = 'portal-guru-cache-v3';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './simpul_smandum_banner.jpg',
  './logo-sman12-munabarat.png',
  './simpul_logo_clean.png',
  './simpul_symbol_clean.png',
  './supabase-config.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Strategi Offline Cache Fetching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Biarkan Supabase REST/GraphQL query ditangani lewat network dengan fallback di JS localStorage
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update jika online
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Jika offline dan membuka navigasi halaman, kembalikan cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Listener notifikasi pengingat mengajar
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_CLASS_REMINDER') {
    const { title, body, icon } = event.data;
    self.registration.showNotification(title, {
      body: body,
      icon: icon || './simpul_logo_clean.png',
      badge: './simpul_symbol_clean.png',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      tag: 'jadwal-mengajar-reminder',
      renotify: true
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
