const CACHE_NAME = 'attendance-app-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

/* INSTALL */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ACTIVATE AND REMOVE OLD CACHE */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name =>
              name.startsWith('attendance-app-') &&
              name !== CACHE_NAME
            )
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* CACHE AND NETWORK */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Firebase requests should always use the network.
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebaseio.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const networkRequest = fetch(event.request)
          .then(response => {
            if (response && response.ok) {
              const copy = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, copy))
                .catch(error => console.error(
                  'Cache update failed:', error
                ));
            }

            return response;
          });

        return networkRequest
          .then(response => response)
          .catch(() => {
            if (cachedResponse) {
              return cachedResponse;
            }

            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }

            return Response.error();
          });
      })
  );
});
