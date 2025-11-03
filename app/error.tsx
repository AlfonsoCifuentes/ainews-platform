'use client';

import { useEffect } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-red-950/20 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.1),transparent_50%)]" />
      </div>
      
      <div className="relative z-10 text-center max-w-2xl">
        {/* Error icon with animation */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative bg-red-500/10 p-8 rounded-full border border-red-500/20">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Something Went Wrong
        </h1>
        
        <p className="text-lg text-muted-foreground mb-2">
          We encountered an unexpected error. This has been logged and we will look into it.
        </p>

        {/* Error details (in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="my-6 p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-left">
            <p className="text-sm font-mono text-red-300 break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-400 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button
            onClick={reset}
            size="lg"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>

        {/* Help text */}
        <div className="mt-12 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <h3 className="text-sm font-semibold mb-3">What you can do:</h3>
          <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Refresh the page to try again</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Check your internet connection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Clear your browser cache and cookies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Try again in a few minutes</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
