/**
 * Vercel Serverless Entry Point
 * 
 * This file serves as the entry point for all API routes when deployed to Vercel.
 * It wraps the existing Express application for serverless execution.
 * 
 * Key features:
 * - Proper Vercel handler export
 * - Pre-warms Firebase connection on cold start
 * - Uses singleton storage manager for connection reuse
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';

// Initialize dotenv for environment variables
import dotenv from 'dotenv';
dotenv.config();

// Create Express app
const app = express();

// ============================================
// CORS Configuration
// ============================================
const corsOptions = {
    origin: true, // Allow all origins for serverless
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
    level: 1,
    threshold: 512,
}));

// ============================================
// Request Logging
// ============================================
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
});

// ============================================
// Initialize Storage and Routes
// ============================================
let isInitialized = false;

async function initializeApp() {
    if (isInitialized) return;

    try {
        console.log('[Init] Starting app initialization...');
        console.log('[Init] Environment check:', {
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
            nodeEnv: process.env.NODE_ENV
        });

        // Import and register routes (ESM requires .js extension)
        const { registerRoutes } = await import('../server/routes-serverless.js');
        registerRoutes(app);

        isInitialized = true;
        console.log('[Init] App initialized successfully');
    } catch (error) {
        console.error('[Init] Failed to initialize:', error);
        throw error;
    }
}

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
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Vercel Handler Export
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Initialize on first request
        await initializeApp();

        // Let Express handle the request
        return new Promise((resolve, reject) => {
            app(req as any, res as any, (err: any) => {
                if (err) {
                    console.error('[Handler] Error:', err);
                    res.status(500).json({
                        success: false,
                        message: 'Internal server error',
                        error: err.message
                    });
                }
                resolve(undefined);
            });
        });
    } catch (error) {
        console.error('[Handler] Initialization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize API',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
