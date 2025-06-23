import { Request, Response, NextFunction } from 'express';
import { createValidationError } from '../../shared/validation';

/**
 * Basic authentication middleware for API protection
 * In production, this should be replaced with proper JWT or OAuth
 */

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Simple API key authentication for demo purposes
const API_KEYS = new Set([
  'bismi_admin_key_2025',
  'bismi_manager_key_2025'
]);

export function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Skip authentication in development mode for easier testing
  if (process.env.NODE_ENV === 'development') {
    req.user = { id: 'dev_user', role: 'admin' };
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required',
      timestamp: new Date().toISOString()
    });
  }

  if (!API_KEYS.has(apiKey as string)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
      timestamp: new Date().toISOString()
    });
  }

  // Set user context
  req.user = {
    id: apiKey === 'bismi_admin_key_2025' ? 'admin' : 'manager',
    role: apiKey === 'bismi_admin_key_2025' ? 'admin' : 'manager'
  };

  next();
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * Rate limiting middleware
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        timestamp: new Date().toISOString()
      });
    }
    
    clientData.count++;
    next();
  };
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, url, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    console.log(`${method} ${url} ${statusCode} ${duration}ms - ${ip}`);
    
    // Log slow requests
    if (duration > 5000) {
      console.warn(`SLOW REQUEST: ${method} ${url} took ${duration}ms`);
    }
  });
  
  next();
}