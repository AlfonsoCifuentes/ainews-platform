import { Metadata } from 'next';
import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: '404 - Page Not Found | AINews',
  description: 'The page you are looking for does not exist',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-black">
      {/* Matrix Rain Background Effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(104,58,255,0.15),transparent_70%)]" />
      </div>
      
      {/* Gradient Overlay consistent with main layout */}
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(126,74,255,0.25),transparent_60%),radial-gradient(circle_at_80%_-20%,rgba(14,255,255,0.18),transparent_50%)]" />
      </div>
      
      <div className="relative z-10 text-center max-w-2xl">
        {/* 404 Number with gradient matching design system */}
        <div className="mb-8">
          <h1 className="text-[150px] md:text-[200px] font-bold leading-none bg-gradient-to-br from-primary via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">
            404
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          Page Not Found
        </h2>
        
        <p className="text-lg text-white/70 mb-8 max-w-md mx-auto">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        {/* Action buttons with design system styles */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/en">
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-500 px-8 py-3 text-base font-semibold text-white shadow-[0_18px_45px_-20px_rgba(116,77,255,0.95)] transition-all hover:scale-105 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </Link>
          
          <Link href="/en/news">
            <button className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3 text-base font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" />
              Browse News
            </button>
          </Link>
        </div>

        {/* Search suggestion with glass effect */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Search className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-white">Try searching instead</h3>
          </div>
          <p className="text-sm text-white/60">
            Use the search bar in the navigation to find what you are looking for
          </p>
        </div>

        {/* Popular links */}
        <div className="mt-12">
          <p className="text-sm text-white/60 mb-4">Popular pages:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/en/news">
              <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white">
                News
              </button>
            </Link>
            <Link href="/en/courses">
              <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white">
                Courses
              </button>
            </Link>
            <Link href="/en/trending">
              <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white">
                Trending
              </button>
            </Link>
            <Link href="/en/kg">
              <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white">
                Knowledge Graph
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
