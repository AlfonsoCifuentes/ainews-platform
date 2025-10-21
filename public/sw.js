// Service Worker for PWA offline capabilities

const CACHE_NAME = 'ainews-v1';
const DYNAMIC_CACHE = 'ainews-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/en',
  '/es',
  '/manifest.webmanifest',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome extensions
  if (request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone response before caching
        const responseClone = response.clone();
        
        // Cache API responses and pages (not images/fonts)
        if (
          request.url.includes('/api/') ||
          request.url.includes('/news') ||
          request.url.includes('/courses') ||
          request.url.includes('/kg')
        ) {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          
          // Return basic response for API requests
          if (request.url.includes('/api/')) {
            return new Response(
              JSON.stringify({ error: 'Offline', cached: true }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
              }
            );
          }
          
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync for queued actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookmarks') {
    event.waitUntil(syncBookmarks());
  }
  if (event.tag === 'sync-reading-history') {
    event.waitUntil(syncReadingHistory());
  }
});

async function syncBookmarks() {
  // Get pending bookmarks from IndexedDB
  const db = await openDB();
  const tx = db.transaction('pending-bookmarks', 'readonly');
  const store = tx.objectStore('pending-bookmarks');
  const bookmarks = await store.getAll();
  
  // Sync each bookmark
  for (const bookmark of bookmarks) {
    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookmark),
      });
      
      // Remove from pending queue
      const deleteTx = db.transaction('pending-bookmarks', 'readwrite');
      await deleteTx.objectStore('pending-bookmarks').delete(bookmark.id);
    } catch (error) {
      console.error('Failed to sync bookmark:', error);
    }
  }
}

async function syncReadingHistory() {
  const db = await openDB();
  const tx = db.transaction('pending-history', 'readonly');
  const store = tx.objectStore('pending-history');
  const history = await store.getAll();
  
  for (const entry of history) {
    try {
      await fetch('/api/reading-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      
      const deleteTx = db.transaction('pending-history', 'readwrite');
      await deleteTx.objectStore('pending-history').delete(entry.id);
    } catch (error) {
      console.error('Failed to sync reading history:', error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ainews-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-bookmarks')) {
        db.createObjectStore('pending-bookmarks', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pending-history')) {
        db.createObjectStore('pending-history', { keyPath: 'id' });
      }
    };
  });
}

export {};
