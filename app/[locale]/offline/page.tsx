'use client';

import { Link } from '@/i18n';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function OfflinePage() {
  useEffect(() => {
    // Set page title dynamically
    document.title = 'Offline - AINews';
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative bg-primary/10 p-8 rounded-full border border-primary/20">
              <WifiOff className="w-16 h-16 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          You&apos;re Offline
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8">
          It looks like you&apos;ve lost your internet connection. Don&apos;t worry, some content may still be available in your cache.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
            size="lg"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="gap-2 w-full sm:w-auto" size="lg">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
        </div>

        <div className="mt-12 p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur">
          <h2 className="text-sm font-semibold mb-3 text-white">Offline Features</h2>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Previously viewed articles may be available</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Bookmarks are saved locally and will sync when online</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Course progress is cached and will update automatically</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
