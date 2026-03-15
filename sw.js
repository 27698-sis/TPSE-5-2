/**
 * TPSE 5° 2° - Service Worker
 * Estrategia: Cache-First + Network Fallback + Background Sync
 * Versión: 2.0.0
 */

const CACHE_NAME = 'tpse-v2';
const STATIC_CACHE = 'tpse-static-v2';
const DYNAMIC_CACHE = 'tpse-dynamic-v2';
const IMAGE_CACHE = 'tpse-images-v2';

// Assets críticos para el "shell" de la app
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/assets/logo-192.png',
    '/assets/logo-512.png',
    '/assets/favicon-32.png'
];

// Assets opcionales (se cachean bajo demanda)
const OPTIONAL_ASSETS = [
    '/assets/avatar-me.png',
    '/assets/avatar1.png',
    '/assets/avatar2.png',
    '/assets/avatar3.png'
];

// ============================================
// INSTALACIÓN - Precacheo estratégico
// ============================================

self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Cacheando assets estáticos...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Assets críticos cacheados');
                // Cachear opcionales en segundo plano sin bloquear
                return caches.open(STATIC_CACHE).then(cache => {
                    return Promise.allSettled(
                        OPTIONAL_ASSETS.map(url => 
                            fetch(url).then(response => {
                                if (response.ok) cache.put(url, response);
                            }).catch(() => console.log(`[SW] Opcional no disponible: ${url}`))
                        )
                    );
                });
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('[SW] Error en instalación:', err))
    );
});

// ============================================
// ACTIVACIÓN - Limpieza de caches viejas
// ============================================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Borrar caches que no sean los actuales
                    if (![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(cacheName)) {
                        console.log('[SW] Eliminando cache viejo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('[SW] Service Worker activado y controlando clientes');
            return self.clients.claim();
        })
    );
});

// ============================================
// FETCH - Estrategias de caché inteligentes
// ============================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar peticiones no GET
    if (request.method !== 'GET') {
        // Pero si es POST/PUT/DELETE, manejar con Background Sync
        if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
            event.respondWith(handleMutableRequest(request));
        }
        return;
    }
    
    // Estrategia según tipo de recurso
    if (isStaticAsset(url)) {
        // Cache-First para assets estáticos
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } 
    else if (isImage(request)) {
        // Stale-While-Revalidate para imágenes
        event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    }
    else if (isAPI(request)) {
        // Network-First para APIs (con fallback a cache)
        event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    }
    else {
        // Network con cache fallback para el resto
        event.respondWith(networkWithCacheFallback(request, DYNAMIC_CACHE));
    }
});

// ============================================
// ESTRATEGIAS DE CACHÉ
// ============================================

// Cache First: Ideal para CSS, JS, HTML estático
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
        console.log('[SW] Sirviendo desde caché:', request.url);
        return cached;
    }
    
    try {
        const networkResponse = await fetch(request);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.error('[SW] Fallo total:', request.url);
        // Fallback a página offline si es HTML
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
        }
        throw error;
    }
}

// Network First: Ideal para APIs y datos dinámicos
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    
    try {
        const networkResponse = await fetch(request);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.log('[SW] Fallback a caché:', request.url);
        const cached = await cache.match(request);
        if (cached) return cached;
        
        // Si no hay cache, devolver respuesta offline genérica
        return new Response(JSON.stringify({
            offline: true,
            message: 'Sin conexión. Los datos se sincronizarán cuando vuelva la red.'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Stale While Revalidate: Ideal para imágenes
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        cache.put(request, networkResponse.clone());
        return networkResponse;
    }).catch(() => cached);
    
    return cached || fetchPromise;
}

// Network con Cache Fallback: Uso general
async function networkWithCacheFallback(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
    }
}

// Manejar requests mutables (POST/PUT/DELETE) offline
async function handleMutableRequest(request) {
    // Si estamos online, procesar normal
    if (self.navigator.onLine) {
        return fetch(request);
    }
    
    // Si offline, guardar en cola para sync posterior
    const queue = await getSyncQueue();
    queue.push({
        url: request.url,
        method: request.method,
        headers: Array.from(request.headers),
        body: await request.text(),
        timestamp: Date.now(),
        id: generateId()
    });
    await saveSyncQueue(queue);
    
    // Registrar para Background Sync
    if ('sync' in self.registration) {
        await self.registration.sync.register('sync-projects');
    }
    
    // Responder con "aceptado para procesar"
    return new Response(JSON.stringify({
        queued: true,
        message: 'Cambio guardado. Se sincronizará cuando haya conexión.'
    }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
    });
}

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-projects') {
        console.log('[SW] Ejecutando Background Sync...');
        event.waitUntil(processSyncQueue());
    }
});

async function processSyncQueue() {
    const queue = await getSyncQueue();
    if (queue.length === 0) return;
    
    console.log(`[SW] Procesando ${queue.length} items pendientes...`);
    
    const failed = [];
    
    for (const item of queue) {
        try {
            const response = await fetch(item.url, {
                method: item.method,
                headers: new Headers(item.headers),
                body: item.body
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            console.log('[SW] Sincronizado:', item.id);
            
        } catch (error) {
            console.error('[SW] Falló sync:', item.id, error);
            failed.push(item);
        }
    }
    
    // Guardar los que fallaron para reintentar
    await saveSyncQueue(failed);
    
    // Notificar a la app
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'SYNC_COMPLETE',
            processed: queue.length - failed.length,
            failed: failed.length
        });
    });
}

// ============================================
// PUSH NOTIFICATIONS (Opcional)
// ============================================

self.addEventListener('push', (event) => {
    console.log('[SW] Push recibido:', event);
    
    const data = event.data?.json() || {
        title: 'TPSE 5° 2°',
        body: 'Nueva actualización disponible',
        icon: '/assets/logo-192.png',
        badge: '/assets/badge-72.png',
        tag: 'general',
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            requireInteraction: data.requireInteraction,
            data: data.data || {},
            actions: data.actions || [
                { action: 'open', title: 'Abrir app' },
                { action: 'dismiss', title: 'Cerrar' }
            ]
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            self.clients.openWindow('/')
        );
    }
});

// ============================================
// MENSAJES CON LA APP (App ↔ SW)
// ============================================

self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: CACHE_NAME,
                staticAssets: STATIC_ASSETS.length
            });
            break;
            
        case 'CLEAR_CACHES':
            event.waitUntil(
                caches.keys().then(names => 
                    Promise.all(names.map(name => caches.delete(name)))
                ).then(() => {
                    event.ports[0].postMessage({ cleared: true });
                })
            );
            break;
            
        case 'FORCE_SYNC':
            event.waitUntil(processSyncQueue());
            break;
    }
});

// ============================================
// HELPERS
// ============================================

function isStaticAsset(url) {
    const staticExts = ['.css', '.js', '.html', '.json', '.woff', '.woff2'];
    return staticExts.some(ext => url.pathname.endsWith(ext)) ||
           STATIC_ASSETS.includes(url.pathname);
}

function isImage(request) {
    return request.destination === 'image' || 
           /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(request.url);
}

function isAPI(request) {
    return request.url.includes('/api/') || 
           request.headers.get('accept')?.includes('application/json');
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// IndexedDB para la cola de sincronización
const DB_NAME = 'tpse-sync';
const STORE_NAME = 'queue';

async function getSyncQueue() {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onerror = () => resolve([]);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const getAll = store.getAll();
            
            getAll.onsuccess = () => resolve(getAll.result || []);
            getAll.onerror = () => resolve([]);
        };
    });
}

async function saveSyncQueue(queue) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Limpiar y guardar nuevo
            store.clear().onsuccess = () => {
                queue.forEach(item => store.put(item));
                resolve();
            };
        };
        
        request.onerror = () => reject();
    });
}

// ============================================
// PERIODIC BACKGROUND SYNC (Si está disponible)
// ============================================

if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'update-content') {
            console.log('[SW] Sincronización periódica...');
            event.waitUntil(updateContent());
        }
    });
}

async function updateContent() {
    // Actualizar materiales nuevos automáticamente
    const cache = await caches.open(DYNAMIC_CACHE);
    // Aquí iría la lógica para fetchear nuevos materiales
    console.log('[SW] Contenido actualizado en segundo plano');
}

console.log('[SW] Service Worker TPSE cargado');
