// Server-side caching middleware for improved performance
import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class ServerCache {
  private cache = new Map<string, CacheEntry>();
  
  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const serverCache = new ServerCache();

// Cache middleware for GET requests
export function cacheMiddleware(ttlMs: number = 5 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `${req.method}:${req.originalUrl}`;
    const cached = serverCache.get(cacheKey);
    
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to cache response
    res.json = function(data: any) {
      serverCache.set(cacheKey, data, ttlMs);
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };
    
    next();
  };
}

// Cache invalidation for write operations
export function invalidateCache(patterns: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    
    let statusCode = 200;
    
    // Track status
    res.status = function(code: number) {
      statusCode = code;
      return originalStatus(code);
    };
    
    // Override json to invalidate cache on successful writes
    res.json = function(data: any) {
      if (statusCode >= 200 && statusCode < 300) {
        patterns.forEach(pattern => serverCache.invalidate(pattern));
      }
      return originalJson(data);
    };
    
    next();
  };
}