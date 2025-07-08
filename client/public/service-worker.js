// Enterprise-grade PWA service worker with full offline capabilities
const BUILD_TIME = '{{BUILD_TIME}}'; // Will be replaced during build
const DEPLOYMENT_HASH = '{{DEPLOYMENT_HASH}}'; // Will be replaced during build  
const CACHE_VERSION = `bismi-app-${BUILD_TIME || Date.now()}-${DEPLOYMENT_HASH || 'dev'}`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_CACHE = `${CACHE_VERSION}-offline`;

console.log('🚀 PWA Service Worker loaded with deployment version:', CACHE_VERSION);

// App shell resources for instant startup
const APP_SHELL = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/favicon.svg',
  '/manifest.json',
];

// Static assets that can be cached long-term
const STATIC_RESOURCES = [
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/icons/chicken-icon.svg',
  '/assets/',
];

// API endpoints to cache for offline access
const CACHEABLE_API_ROUTES = [
  '/api/suppliers',
  '/api/inventory', 
  '/api/customers',
  '/api/orders',
  '/api/transactions',
  '/api/health',
];

// Offline fallback pages
const OFFLINE_FALLBACK_PAGE = '/offline.html';
const OFFLINE_FALLBACK_API = { error: 'Offline', message: 'No internet connection' };

// Install event - pre-cache app shell for instant startup
self.addEventListener('install', event => {
  console.log('PWA Service Worker installing with version:', CACHE_VERSION);
  self.skipWaiting(); // Force activation of new service worker
  
  event.waitUntil(
    Promise.all([
      // Cache app shell for instant startup
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Pre-caching app shell:', STATIC_CACHE);
        return cache.addAll(APP_SHELL);
      }),
      // Cache offline fallback
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('Caching offline fallbacks:', OFFLINE_CACHE);
        return cache.add('/offline.html').catch(() => {
          // Create offline fallback if it doesn't exist
          return cache.put('/offline.html', new Response(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline - Bismi Shop</title>
              <style>
                body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
                .offline-icon { font-size: 64px; margin-bottom: 20px; }
                h1 { color: #E53935; margin-bottom: 10px; }
                p { color: #666; margin-bottom: 20px; }
                .retry-btn { background: #E53935; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="offline-icon">📱</div>
              <h1>You're Offline</h1>
              <p>Check your internet connection and try again.</p>
              <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
            </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } }));
        });
      })
    ])
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  console.log('PWA Service Worker activating with version:', CACHE_VERSION);
  self.clients.claim(); // Take control of all clients immediately
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Preload critical API data for offline access
      preloadCriticalData()
    ])
  );
});

// Preload critical business data for offline access
async function preloadCriticalData() {
  try {
    const apiCache = await caches.open(API_CACHE);
    const criticalEndpoints = ['/api/health'];
    
    await Promise.all(
      criticalEndpoints.map(async endpoint => {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            await apiCache.put(endpoint, response.clone());
            console.log('Preloaded critical data:', endpoint);
          }
        } catch (error) {
          console.log('Failed to preload:', endpoint, error);
        }
      })
    );
  } catch (error) {
    console.log('Critical data preload failed:', error);
  }
}

// Advanced fetch strategy with full offline support
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Route requests to appropriate caching strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(apiCacheStrategy(event.request));
  } else if (isAppShellResource(url.pathname)) {
    event.respondWith(appShellStrategy(event.request));
  } else if (isStaticResource(url.pathname)) {
    event.respondWith(cacheFirstStrategy(event.request));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(event.request));
  }
});

// App shell strategy - cache first with network fallback
async function appShellStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const offlineCache = await caches.open(OFFLINE_CACHE);
      return offlineCache.match('/offline.html');
    }
    throw error;
  }
}

// API caching strategy with offline support
async function apiCacheStrategy(request) {
  const cache = await caches.open(API_CACHE);
  const url = new URL(request.url);
  
  // For cacheable API routes, use network-first with cache fallback
  if (CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        // Cache successful API responses
        await cache.put(request, networkResponse.clone());
        
        // Add offline indicator to response
        const responseData = await networkResponse.clone().json();
        const enhancedResponse = new Response(
          JSON.stringify({ ...responseData, _cached: false, _timestamp: Date.now() }),
          {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers: { ...networkResponse.headers, 'Content-Type': 'application/json' }
          }
        );
        return enhancedResponse;
      }
      return networkResponse;
    } catch (error) {
      // Return cached data with offline indicator
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        const cachedData = await cachedResponse.json();
        return new Response(
          JSON.stringify({ ...cachedData, _cached: true, _offline: true }),
          {
            status: 200,
            statusText: 'OK (Cached)',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Return offline fallback for API
      return new Response(
        JSON.stringify(OFFLINE_FALLBACK_API),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  // For non-cacheable API routes, try network only
  return fetch(request);
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Start network request regardless of cache status
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  return networkPromise || cachedResponse;
}

// Cache-first strategy for static resources
async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Helper functions for resource identification
function isAppShellResource(pathname) {
  return pathname === '/' || 
         pathname === '/index.html' ||
         pathname.startsWith('/src/');
}

function isStaticResource(pathname) {
  return pathname.startsWith('/icons/') ||
         pathname.startsWith('/assets/') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.svg') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.jpeg') ||
         pathname.includes('/manifest.json') ||
         pathname.includes('/favicon.svg');
}

// Message handler for manual cache refresh and skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});