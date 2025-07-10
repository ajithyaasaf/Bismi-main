// Enterprise-grade cache versioning with build-time deployment detection
const BUILD_TIME = '{{BUILD_TIME}}'; // Will be replaced during build
const DEPLOYMENT_HASH = '{{DEPLOYMENT_HASH}}'; // Will be replaced during build  
const CACHE_VERSION = `bismi-app-${BUILD_TIME || Date.now()}-${DEPLOYMENT_HASH || 'dev'}`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

console.log('🚀 Service Worker loaded with deployment version:', CACHE_VERSION);

// Critical resources that should use network-first strategy
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/api/',
];

// Static resources that can be cached longer
const STATIC_RESOURCES = [
  '/favicon.svg',
  '/manifest.json',
  '/icons/',
];

// Install event - immediately claim clients to force update
self.addEventListener('install', event => {
  console.log('Service Worker installing with version:', CACHE_VERSION);
  self.skipWaiting(); // Force activation of new service worker
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('Opened static cache:', STATIC_CACHE);
      // Pre-cache only essential static resources
      return cache.addAll(['/favicon.svg', '/manifest.json']);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating with version:', CACHE_VERSION);
  self.clients.claim(); // Take control of all clients immediately
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete all caches that don't match current version
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network-first strategy for critical resources
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Network-first strategy for critical resources (API calls, HTML)
  if (isCriticalResource(event.request.url)) {
    event.respondWith(networkFirstStrategy(event.request));
  } 
  // Cache-first strategy for static assets
  else if (isStaticResource(event.request.url)) {
    event.respondWith(cacheFirstStrategy(event.request));
  }
  // Default to network for everything else
  else {
    event.respondWith(fetch(event.request));
  }
});

// Network-first strategy - always try network first, fallback to cache
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return new Response('App offline. Please check your connection.', {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response && response.status === 200) {
        caches.open(STATIC_CACHE).then(cache => {
          cache.put(request, response);
        });
      }
    });
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Helper functions
function isCriticalResource(url) {
  return CRITICAL_RESOURCES.some(resource => url.includes(resource)) ||
         url.includes('/api/') ||
         url.endsWith('.html') ||
         url.endsWith('/');
}

function isStaticResource(url) {
  return STATIC_RESOURCES.some(resource => url.includes(resource)) ||
         url.includes('/icons/') ||
         url.endsWith('.css') ||
         url.endsWith('.js') ||
         url.endsWith('.svg') ||
         url.endsWith('.png') ||
         url.endsWith('.jpg') ||
         url.endsWith('.jpeg');
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