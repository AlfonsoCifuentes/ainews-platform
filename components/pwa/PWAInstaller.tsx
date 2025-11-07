'use client';

import { useEffect } from 'react';

export function PWAInstaller() {
  useEffect(() => {
    // PWA Service Worker disabled temporarily (sw.js not available)
    // Will be enabled when PWA features are ready
    console.log('[PWA] Service Worker registration disabled');
    
    // Keep online/offline detection active
    if (typeof window !== 'undefined') {
      const handleOnline = () => console.log('[PWA] Back online');
      const handleOffline = () => console.log('[PWA] You are offline');
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    
    return undefined;
  }, []);

  return null;
}
