self.addEventListener('install', (e) => {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', (e) => {
  // Aquí es donde sucede la magia del caché, por ahora lo dejamos simple
  e.respondWith(fetch(e.request));
});