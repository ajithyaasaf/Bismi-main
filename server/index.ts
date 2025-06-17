import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://bismi-main.onrender.com', 
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

// Debug CORS issues
app.use((req, res, next) => {
  console.log(`Request from origin: ${req.get('Origin')} to ${req.method} ${req.path}`);
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Development note: Frontend configured to use Render backend directly
if (process.env.NODE_ENV === 'development') {
  log('Frontend configured to connect directly to Render backend: https://bismi-main.onrender.com');
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
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
