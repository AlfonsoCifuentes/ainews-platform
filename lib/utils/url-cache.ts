/**
 * URL Cache Utility
 * Prevents duplicate HTTP requests during single execution
 * Phase 5.1: Quick Win 8
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class URLCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number; // Time to live in milliseconds
  
  constructor(ttlMinutes: number = 60) {
    this.ttl = ttlMinutes * 60 * 1000;
  }
  
  /**
   * Get cached value if exists and not expired
   */
  get(url: string): T | null {
    const entry = this.cache.get(url);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(url);
      return null;
    }
    
    return entry.value;
  }
  
  /**
   * Set cache value
   */
  set(url: string, value: T): void {
    this.cache.set(url, {
      value,
      timestamp: Date.now()
    });
  }
  
  /**
   * Check if URL is cached
   */
  has(url: string): boolean {
    return this.get(url) !== null;
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Remove expired entries
   */
  prune(): void {
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(url);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      ttlMinutes: this.ttl / (60 * 1000)
    };
  }
}

/**
 * Domain-level cache for tracking visited domains
 */
export class DomainCache {
  private domains: Set<string> = new Set();
  private domainRequests: Map<string, number> = new Map();
  
  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }
  
  /**
   * Mark domain as visited
   */
  visit(url: string): void {
    const domain = this.extractDomain(url);
    if (!domain) return;
    
    this.domains.add(domain);
    this.domainRequests.set(domain, (this.domainRequests.get(domain) || 0) + 1);
  }
  
  /**
   * Check if domain has been visited
   */
  hasVisited(url: string): boolean {
    const domain = this.extractDomain(url);
    return this.domains.has(domain);
  }
  
  /**
   * Get request count for domain
   */
  getRequestCount(url: string): number {
    const domain = this.extractDomain(url);
    return this.domainRequests.get(domain) || 0;
  }
  
  /**
   * Get all visited domains
   */
  getVisitedDomains(): string[] {
    return Array.from(this.domains);
  }
  
  /**
   * Get domain statistics
   */
  getStats() {
    const stats = Array.from(this.domainRequests.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      totalDomains: this.domains.size,
      totalRequests: Array.from(this.domainRequests.values()).reduce((sum, n) => sum + n, 0),
      byDomain: stats
    };
  }
  
  /**
   * Clear cache
   */
  clear(): void {
    this.domains.clear();
    this.domainRequests.clear();
  }
}

/**
 * Global URL cache instances for reuse
 */
export const imageUrlCache = new URLCache<unknown>(60); // 60 minutes TTL, generic type

export const articleContentCache = new URLCache<string>(30); // 30 minutes TTL

export const domainCache = new DomainCache();
