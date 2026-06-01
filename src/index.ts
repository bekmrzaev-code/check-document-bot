import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { db } from './storage/database';
import { initTelegramBot } from './bot/telegram';

// Routes
import uploadsRouter from './routes/uploads';
import companiesRouter from './routes/companies';
import driversRouter from './routes/drivers';
import authRouter from './routes/auth';
import imagesRouter from './routes/images';
import settingsRouter from './routes/settings';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../src/admin')));

// API Routes
app.use('/api/uploads', uploadsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/auth', authRouter);
app.use('/api/images', imagesRouter);
app.use('/api/settings', settingsRouter);

// Public routes
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/admin', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../src/admin/index.html'));
});

app.get('/admin/dashboard.html', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../src/admin/dashboard.html'));
});

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
      console.warn('⚠️  BOT_TOKEN not set. Bot will not start.');
    } else {
      console.log('🤖 Starting Telegram bot...');
      initTelegramBot(botToken);
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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
