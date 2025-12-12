import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();
const PORT = parseInt(process.env.PORT || '10000', 10);

// Production middleware
app.use(cors({
  origin: [
    /\.onrender\.com$/,
    'http://localhost:5173',
    'http://localhost:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request logging for production
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

(async () => {
  try {
    console.log('[Production] Starting Bismi Backend Server...');
    
    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[Production Error]:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      res.status(status).json({ 
        error: message,
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });

    if (server) {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`[Production] Bismi Backend Server running on port ${PORT}`);
        console.log(`[Production] Health check: http://localhost:${PORT}/api/health`);
      });
    } else {
      console.error('[Production] Server creation failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('[Production] Failed to start server:', error);
    process.exit(1);
  }
})();