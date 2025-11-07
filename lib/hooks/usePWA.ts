'use client';

import { useEffect, useState } from 'react';

export function usePWA() {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [registration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Service Worker registration disabled temporarily (sw.js not available)
    // Uncomment when PWA is ready
    /*
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered:', reg);
          setRegistration(reg);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
    */

    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = async () => {
    if (registration && 'sync' in registration) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const syncManager = (registration as any).sync;
        await syncManager.register('sync-bookmarks');
        await syncManager.register('sync-reading-history');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }
  };

  return {
    isOnline,
    isInstalled,
    registration,
    syncNow,
  };
}
