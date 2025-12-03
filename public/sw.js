/**
 * Service Worker for PWA Offline Support
 * Phase 5.1 - Category J: Enhanced PWA capabilities
 * 
 * Features:
 * - Cache articles/courses/TTS audio for offline reading
 * - Background sync for progress and bookmarks
 * - Storage quota management
 * - Push notifications (VAPID)
 * 
 * Updated: Nov 4, 2025 - Forced dark theme, responsive header
 */

const CACHE_VERSION = 'v4'; // Bumped from v3 - Navigation now network-first to avoid stale HTML
const STATIC_CACHE = `thotnet-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `thotnet-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `thotnet-images-${CACHE_VERSION}`;
const AUDIO_CACHE = `thotnet-audio-${CACHE_VERSION}`;

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/en',
  '/es',
  '/manifest.webmanifest',
  '/offline', // Offline fallback page
];

// Max cache sizes (storage quota management)
const MAX_CACHE_SIZE = {
  images: 50 * 1024 * 1024, // 50 MB
  audio: 100 * 1024 * 1024,  // 100 MB
  dynamic: 20 * 1024 * 1024, // 20 MB
};

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v3...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v3...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== IMAGE_CACHE &&
            cacheName !== AUDIO_CACHE
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - apply cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Always try the network first for navigation requests to avoid serving stale HTML
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Skip chrome extensions and external origins
  if (request.url.startsWith('chrome-extension://')) return;
  if (url.origin !== self.location.origin && !request.destination.startsWith('image')) return;

  // Apply cache strategy based on request type
  if (request.destination === 'image') {
    // Images: Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
  } else if (request.destination === 'audio') {
    // Audio (TTS): Cache first for offline playback
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
  } else if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/')
  ) {
    // API calls: Network first with cache fallback
    event.respondWith(networkFirst(request));
  } else {
    // Static assets: Cache first
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

// CACHE STRATEGIES

/**
 * Network first, fallback to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Return offline fallback page for navigation
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    
    // Return error JSON for API calls
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ error: 'Offline', cached: false }),
        { headers: { 'Content-Type': 'application/json' }, status: 503 }
      );
    }
    
    throw error;
  }
}

/**
 * Cache first, fallback to network
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Stale-while-revalidate (for images)
 */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(cacheName).then((cache) => {
        cache.put(request, response.clone());
      });
    }
    return response;
  }).catch(() => cached); // Fallback to cached on error
  
  return cached || fetchPromise;
}

// BACKGROUND SYNC

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncUserProgress());
  }
  if (event.tag === 'sync-bookmarks') {
    event.waitUntil(syncBookmarks());
  }
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

async function syncUserProgress() {
  console.log('[SW] Syncing user progress...');
  
  const db = await openDB();
  const pending = await getAll(db, 'pending-progress');
  
  for (const item of pending) {
    try {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      
      await deleteItem(db, 'pending-progress', item.id);
    } catch (error) {
      console.error('[SW] Failed to sync progress:', error);
    }
  }
}

async function syncBookmarks() {
  console.log('[SW] Syncing bookmarks...');
  
  const db = await openDB();
  const pending = await getAll(db, 'pending-bookmarks');
  
  for (const item of pending) {
    try {
      await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      
      await deleteItem(db, 'pending-bookmarks', item.id);
    } catch (error) {
      console.error('[SW] Failed to sync bookmark:', error);
    }
  }
}

async function syncNotes() {
  console.log('[SW] Syncing notes...');
  
  const db = await openDB();
  const pending = await getAll(db, 'pending-notes');
  
  for (const item of pending) {
    try {
      await fetch('/api/user/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      
      await deleteItem(db, 'pending-notes', item.id);
    } catch (error) {
      console.error('[SW] Failed to sync note:', error);
    }
  }
}

// MESSAGE HANDLER - Cache specific content

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_ARTICLE') {
    const { articleId, data } = event.data;
    event.waitUntil(cacheArticle(articleId, data));
  }
  
  if (event.data?.type === 'CACHE_COURSE') {
    const { courseId, data } = event.data;
    event.waitUntil(cacheCourse(courseId, data));
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
  
  if (event.data?.type === 'GET_CACHE_SIZE') {
    event.waitUntil(getCacheSize().then((size) => {
      event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
    }));
  }
});

async function cacheArticle(articleId, data) {
  console.log('[SW] Caching article:', articleId);
  
  const db = await openDB();
  await putItem(db, 'cached-articles', { id: articleId, ...data, type: 'article' });
  
  // Cache article images
  if (data.images?.length > 0) {
    const cache = await caches.open(IMAGE_CACHE);
    await Promise.all(
      data.images.map((img) => 
        fetch(img.url).then((res) => cache.put(img.url, res)).catch(() => {})
      )
    );
  }
}

async function cacheCourse(courseId, data) {
  console.log('[SW] Caching course:', courseId);
  
  const db = await openDB();
  await putItem(db, 'cached-articles', { id: courseId, ...data, type: 'course' });
}

async function clearAllCaches() {
  console.log('[SW] Clearing all caches...');
  
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  
  const db = await openDB();
  const stores = ['pending-progress', 'pending-bookmarks', 'pending-notes', 'cached-articles'];
  for (const store of stores) {
    await clearStore(db, store);
  }
}

async function getCacheSize() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2),
    };
  }
  return { usage: 0, quota: 0, usagePercent: 0 };
}

// PUSH NOTIFICATIONS

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'New content available',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data,
    tag: data.tag || 'default',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'ThotNet Core', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// INDEXEDDB HELPERS

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('thotnet-offline', 2); // Bumped version
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      const stores = [
        'pending-progress',
        'pending-bookmarks',
        'pending-notes',
        'cached-articles',
      ];
      
      for (const storeName of stores) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      }
    };
  });
}

function getAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putItem(db, storeName, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteItem(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function clearStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
