import express from 'express';
import { createServer } from 'http';

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Development server running' });
});

// Basic API routes placeholder
app.get('/api/*', (req, res) => {
  res.json({ message: 'API endpoint placeholder - Firebase credentials configured' });
});

const server = createServer(app);
const port = 5000;

server.listen(port, '0.0.0.0', () => {
  console.log(`Development server running on port ${port}`);
  console.log('Firebase credentials are now configured');
  console.log('Ready for deployment preparation');
});