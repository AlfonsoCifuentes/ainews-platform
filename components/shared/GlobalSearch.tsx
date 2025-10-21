'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';

interface SearchResult {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  summary?: string;
  type: string;
  url: string;
}

export function GlobalSearch({ locale }: { locale: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, SearchResult[]>>({});
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults({});
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/search/global?q=${encodeURIComponent(q)}&locale=${locale}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [query, search]);

  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Search articles, courses, entities..."
          className="w-full px-4 py-2 pl-10 pr-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          🔍
        </span>
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          </span>
        )}
      </div>

      {showResults && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-card border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
          {totalResults === 0 && !loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <>
              {results.articles && results.articles.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    Articles
                  </div>
                  {results.articles.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        router.push(result.url);
                        setShowResults(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded transition-colors"
                    >
                      <div className="font-medium text-sm">{result.title}</div>
                      {result.summary && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {result.summary}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {results.courses && results.courses.length > 0 && (
                <div className="p-2 border-t">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    Courses
                  </div>
                  {results.courses.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        router.push(result.url);
                        setShowResults(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded transition-colors"
                    >
                      <div className="font-medium text-sm">{result.title}</div>
                    </button>
                  ))}
                </div>
              )}

              {results.entities && results.entities.length > 0 && (
                <div className="p-2 border-t">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    Knowledge Graph
                  </div>
                  {results.entities.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        router.push(result.url);
                        setShowResults(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{result.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
