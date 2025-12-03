/**
 * Storage Management UI Component
 * Phase 5.1 - Category J: PWA & Offline
 * 
 * Shows cache usage, allows clearing cache, manage offline content
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/Badge';
import { Trash2, Download, HardDrive, Wifi, WifiOff } from 'lucide-react';

interface StorageEstimate {
  usage: number;
  quota: number;
  usagePercent: number;
}

interface CachedContent {
  id: string;
  title: string;
  type: 'article' | 'course';
  size: number;
  cachedAt: string;
}

export function StorageManager() {
  const [storage, setStorage] = useState<StorageEstimate | null>(null);
  const [cachedContent, setCachedContent] = useState<CachedContent[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Get storage estimate
  useEffect(() => {
    updateStorageEstimate();
    loadCachedContent();
  }, []);

  async function updateStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      setStorage({
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usagePercent: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
      });
    }
  }

  async function loadCachedContent() {
    try {
      const db = await openDB();
      const items = await getAll(db, 'cached-articles');
      setCachedContent(items as CachedContent[]);
    } catch (error) {
      console.error('Failed to load cached content:', error);
    }
  }

  async function clearAllCache() {
    if (!confirm('Clear all cached content? You will need to download it again for offline access.')) {
      return;
    }

    setIsClearing(true);

    try {
      // Send message to service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Clear IndexedDB
      const db = await openDB();
      await clearStore(db, 'cached-articles');

      // Update UI
      await updateStorageEstimate();
      await loadCachedContent();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  }

  async function removeContent(id: string) {
    try {
      const db = await openDB();
      await deleteItem(db, 'cached-articles', id);
      
      await updateStorageEstimate();
      await loadCachedContent();
    } catch (error) {
      console.error('Failed to remove content:', error);
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Online Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-orange-500" />
            )}
            <CardTitle>
              {isOnline ? 'Online' : 'Offline'}
            </CardTitle>
          </div>
          <CardDescription>
            {isOnline 
              ? 'Connected to the internet. Content will sync automatically.' 
              : 'Working offline. Changes will sync when you reconnect.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <CardTitle>Storage Usage</CardTitle>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllCache}
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
          <CardDescription>
            Manage cached content for offline access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {storage && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
                  </span>
                </div>
                <Progress value={storage.usagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {storage.usagePercent.toFixed(1)}% of available storage used
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cached Content */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Content</CardTitle>
          <CardDescription>
            {cachedContent.length} items available offline
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cachedContent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No offline content yet</p>
              <p className="text-sm mt-2">
                Download articles or courses to read them offline
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cachedContent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={item.type === 'article' ? 'default' : 'secondary'}>
                        {item.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.cachedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size || 0)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeContent(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-sm">Offline Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Download content while online to read it offline</li>
            <li>Bookmarks and progress sync automatically when you reconnect</li>
            <li>Clear cache regularly to free up storage space</li>
            <li>Audio (TTS) is cached for offline playback</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// IndexedDB helpers (duplicated from SW for client-side access)

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('thotnet-offline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      
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

function getAll(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteItem(db: IDBDatabase, storeName: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearStore(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
