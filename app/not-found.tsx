import { Metadata } from 'next';
import { Link } from '@/i18n';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: '404 - Page Not Found | AINews',
  description: 'The page you are looking for does not exist',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
      </div>
      
      <div className="relative z-10 text-center max-w-2xl">
        {/* 404 Number with gradient */}
        <div className="mb-8">
          <h1 className="text-[150px] md:text-[200px] font-bold leading-none bg-gradient-to-br from-primary via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            404
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          Page Not Found
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/">
            <Button size="lg" className="gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
          
          <Link href="/news">
            <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" />
              Browse News
            </Button>
          </Link>
        </div>

        {/* Search suggestion */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Search className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold">Try searching instead</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Use the search bar above to find what you are looking for
          </p>
        </div>

        {/* Popular links */}
        <div className="mt-12">
          <p className="text-sm text-muted-foreground mb-4">Popular pages:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/news">
              <Button variant="ghost" size="sm">News</Button>
            </Link>
            <Link href="/courses">
              <Button variant="ghost" size="sm">Courses</Button>
            </Link>
            <Link href="/trending">
              <Button variant="ghost" size="sm">Trending</Button>
            </Link>
            <Link href="/kg">
              <Button variant="ghost" size="sm">Knowledge Graph</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
