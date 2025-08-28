// service-worker.js

const CACHE_NAME = 'travel-assistant-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.js',
  // 캐시할 다른 에셋(CSS, 이미지 등)을 추가합니다.
  'https://cdn.tailwindcss.com',
  'https://hangeul.pstatic.net/nanumsquare_ac/nanumsquare_ac.css'
];

self.addEventListener('install', event => {
  // 설치 단계를 수행합니다.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('캐시가 열렸습니다.');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시 히트 - 응답을 반환합니다.
        if (response) {
          return response;
        }

        // 중요: 요청을 복제합니다. 요청은 스트림이며 한 번만 소비될 수 있습니다.
        // 캐시와 브라우저 fetch에서 모두 소비해야 하므로, 복제가 필요합니다.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // 유효한 응답을 받았는지 확인합니다.
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 중요: 응답을 복제합니다. 응답은 스트림이며,
            // 브라우저와 캐시가 모두 응답을 소비해야 하므로 두 개의 스트림을 위해 복제합니다.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});