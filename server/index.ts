// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import compression from 'compression';
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

const app = express();

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
      'https://bismi-main-76ww.onrender.com',
      'https://bismi-main.vercel.app',
      /\.onrender\.com$/,
      /\.vercel\.app$/,
      /\.replit\.dev$/,
      // Allow any Vercel preview deployments
      /^https:\/\/.*\.vercel\.app$/
    ]
    : ['http://localhost:5000', 'http://127.0.0.1:5000', /\.replit\.dev$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Add cache control headers for instant updates
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set no-cache headers for API endpoints and HTML files to ensure instant updates
  if (req.url.startsWith('/api/') || req.url.endsWith('.html') || req.url === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Set ETag for proper cache invalidation
  if (req.url.startsWith('/api/')) {
    res.setHeader('ETag', `"${Date.now()}"`);
  }

  next();
});

// Debug CORS issues
app.use((req, res, next) => {
  console.log(`Request from origin: ${req.get('Origin')} to ${req.method} ${req.path}`);
  next();
});
// Optimized JSON parsing with compression
app.use(express.json({
  limit: '10mb', // Reduced limit for better performance 
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({
  extended: false,
  limit: '10mb',
  parameterLimit: 1000 // Prevent DOS attacks
}));

// Enable response compression for better performance
app.use(compression({
  filter: (req: any, res: any) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 1, // Fast compression for speed
  threshold: 512, // Compress smaller responses
  memLevel: 8, // Memory usage optimization
}));

// Development note: Frontend configured to use Render backend directly
if (process.env.NODE_ENV === 'development') {
  log('Frontend configured to connect directly to Render backend: https://bismi-main-76ww.onrender.com');
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Log slow requests only
      if (duration > 1000) {
        log(`SLOW ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      } else if (duration > 500) {
        log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server!);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  if (server) {
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  }
})();
