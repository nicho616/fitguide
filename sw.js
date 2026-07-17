// FitGuide PWA Service Worker
const CACHE_NAME = 'fitguide-cache-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './exercises.json',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// 安装阶段：预缓存所有核心静态资源与数据
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell and exercise database...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// 激活阶段：清理过期的缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 拦截请求并从缓存中读取 (支持离线模式)
self.addEventListener('fetch', event => {
    // 过滤非 GET 请求或外部接口
    if (event.request.method !== 'GET') return;
    
    // 如果是动作演示动图 (托管在 CDN)
    if (event.request.url.includes('jsd.onmicrosoft.cn')) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    
                    return fetch(event.request)
                        .then(networkResponse => {
                            // 动态缓存图片演示
                            if (networkResponse && networkResponse.status === 200) {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            // 离线且无缓存时静默失败或使用占位
                            return caches.match('./icons/icon-192.png'); 
                        });
                })
        );
        return;
    }

    // 默认的 App Shell 缓存策略
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).catch(() => {
                    // 当离线且完全读不到时，返回主页面
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
