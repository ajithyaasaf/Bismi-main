/**
 * Vercel Serverless Entry Point
 * 
 * This file serves as the entry point for all API routes when deployed to Vercel.
 * It wraps the existing Express application for serverless execution.
 * 
 * Key optimizations:
 * - Pre-warms Firebase connection on cold start
 * - Uses singleton storage manager for connection reuse
 * - Optimized CORS for same-origin requests
 */

import express, { type Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import { registerRoutes } from '../server/routes-serverless';

// Create Express app
const app = express();

// ============================================
// CORS Configuration
// ============================================
// Optimized for same-origin (Vercel) + preview deployments
const corsOptions = {
    origin: [
        // Vercel deployments (production + previews)
        /\.vercel\.app$/,
        // Local development
        /localhost/,
        /127\.0\.0\.1/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ============================================
// Cache Control for API Responses
// ============================================
app.use((req: Request, res: Response, next: NextFunction) => {
    // Disable caching for all API endpoints to ensure fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// ============================================
// Request Parsing
// ============================================
app.use(express.json({
    limit: '10mb',
    type: ['application/json', 'text/plain']
}));

app.use(express.urlencoded({
    extended: false,
    limit: '10mb',
    parameterLimit: 1000
}));

// ============================================
// Response Compression
// ============================================
app.use(compression({
    filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 1, // Fast compression for serverless
    threshold: 512,
    memLevel: 8,
}));

// ============================================
// Request Logging (for serverless debugging)
// ============================================
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        // Only log slow requests or errors
        if (duration > 500 || res.statusCode >= 400) {
            console.log(`[API] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        }
    });

    next();
});

// ============================================
// Cold Start Optimization
// ============================================
// Pre-warm Firebase connection on cold start
let isWarmed = false;

async function warmUp(): Promise<void> {
    if (isWarmed) return;

    try {
        // Dynamic import to avoid issues during build
        const { storageManager } = await import('../server/storage-manager');
        await storageManager.initialize();
        isWarmed = true;
        console.log('[Warm-up] Firebase connection ready');
    } catch (error) {
        console.error('[Warm-up] Failed:', error);
        // Don't throw - let requests still attempt to work
    }
}

// Trigger warm-up immediately (runs during cold start)
warmUp();

// ============================================
// Register All API Routes
// ============================================
registerRoutes(app);

// ============================================
// Global Error Handler
// ============================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Error]', err);

    const statusCode = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// 404 Handler
// ============================================
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        timestamp: new Date().toISOString()
    });
});

// Export for Vercel
export default app;
