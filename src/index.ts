import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { db } from './storage/database';
import { initTelegramBot } from './bot/telegram';
import { startScheduler } from './scheduler';
import { startKeepAlive } from './keepAlive';

// Routes
import uploadsRouter from './routes/uploads';
import companiesRouter from './routes/companies';
import driversRouter from './routes/drivers';
import authRouter from './routes/auth';
import imagesRouter from './routes/images';
import settingsRouter from './routes/settings';
import groupsRouter from './routes/groups';
import schedulesRouter from './routes/schedules';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(cookieParser());

// Serve the public landing site
app.use(express.static(path.join(__dirname, '../public')));

// Admin UI: serve the built React app at /admin; fall back to the legacy HTML
// admin when the client hasn't been built (e.g. local dev via Vite on :5173).
const clientDist = path.join(__dirname, '../client/dist');
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));
const adminRoot = hasClientBuild ? clientDist : path.join(__dirname, '../src/admin');
app.use('/admin', express.static(adminRoot));

// API Routes
app.use('/api/uploads', uploadsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/auth', authRouter);
app.use('/api/images', imagesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/schedules', schedulesRouter);

// Public routes
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/admin', (req: Request, res: Response) => {
  res.sendFile(path.join(adminRoot, 'index.html'));
});

if (hasClientBuild) {
  // React Router client-side routes (e.g. /admin/drivers, /admin/login)
  app.get('/admin/*', (req: Request, res: Response) => {
    res.sendFile(path.join(adminRoot, 'index.html'));
  });
} else {
  app.get('/admin/dashboard.html', (req: Request, res: Response) => {
    res.sendFile(path.join(adminRoot, 'dashboard.html'));
  });
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Initialize database
    console.log('📦 Initializing database...');
    await db.init();
    console.log('✅ Database initialized');

    // Initialize Telegram bot
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.warn('⚠️  BOT_TOKEN not set. Bot will not start!');
    } else {
      console.log('🤖 Starting Telegram bot...');
      await initTelegramBot(botToken);
      // Daily recurring group messages (needs the bot to deliver)
      startScheduler();
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║     Driver Approval MVP Started        ║
╠════════════════════════════════════════╣
║ 🌐 Web:   http://localhost:${PORT}          ║
║ 🔐 Admin: http://localhost:${PORT}/admin     ║
║ 📊 API:   http://localhost:${PORT}/api       ║
╚════════════════════════════════════════╝
      `);
      console.log('Press Ctrl+C to stop');
      // Keep the service awake on free hosting (Render, etc.)
      startKeepAlive();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
