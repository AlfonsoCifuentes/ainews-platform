'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/lib/hooks/useSearch';
import { SearchResults } from '@/components/search/SearchResults';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchProps {
  locale: 'en' | 'es';
}

export function Search({ locale }: SearchProps) {
  const t = useTranslations('search');
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { results, counts, loading, search, clear } = useSearch();
  const debouncedQuery = useDebounce(query, 300);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      search(debouncedQuery, { locale });
    } else {
      clear();
    }
  }, [debouncedQuery, locale, search, clear]);

  const handleClear = useCallback(() => {
    setQuery('');
    clear();
    setIsOpen(false);
  }, [clear]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      setIsOpen(true);
    }
  }, []);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('placeholder')}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="pl-10 pr-10 w-full md:w-[300px] lg:w-[400px]"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {query && !loading && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim() && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Results Panel */}
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[600px] overflow-y-auto">
            <SearchResults
              results={results}
              counts={counts}
              loading={loading}
              query={query}
              locale={locale}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
