const CACHE_NAME = 'undangan-elegan-v2';

// Daftar aset krusial yang akan di-cache agar undangan dapat dibuka tanpa koneksi internet (Offline)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    'https://unpkg.com/lucide@latest',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Sacramento&display=swap'
];

// Event Install: Caching asset penting
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching files...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Event Activate: Membersihkan cache lama yang tidak terpakai
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Menghapus cache usang:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Event Fetch: Menggunakan strategi Cache-First dengan Fallback ke Network
self.addEventListener('fetch', (event) => {
    // Abaikan permintaan POST (seperti pengiriman form RSVP Google Sheets)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Kembalikan versi cache jika ada
                return cachedResponse;
            }

            // Jika tidak ada di cache, lakukan fetch ke server internet
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Masukkan hasil fetch baru ke dalam cache untuk penggunaan selanjutnya
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // Jika jaringan mati dan cache tidak ada, berikan respons halaman offline dasar
                console.log('[Service Worker] Permintaan gagal dan jaringan offline.');
            });
        })
    );
});
