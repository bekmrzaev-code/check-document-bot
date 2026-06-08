import { Request, Response, NextFunction } from 'express';
import { db } from '../storage/database';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function cleanExpiredSessions(): Promise<void> {
  const now = new Date().toISOString();
  await db.run('DELETE FROM admin_sessions WHERE expires_at < ?', [now]);
}

export async function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.admin_session;

  if (!sessionId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await cleanExpiredSessions();
    const session = await db.get<{ session_id: string; expires_at: string }>(
      'SELECT session_id, expires_at FROM admin_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      if (session) {
        await db.run('DELETE FROM admin_sessions WHERE session_id = ?', [sessionId]);
      }
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (password !== correctPassword) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION).toISOString();

  await db.run(
    'INSERT INTO admin_sessions (session_id, created_at, expires_at) VALUES (?, ?, ?)',
    [sessionId, now.toISOString(), expiresAt]
  );

  res.cookie('admin_session', sessionId, {
    httpOnly: true,
    maxAge: SESSION_DURATION,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  res.json({ success: true });
}

export async function adminLogout(req: Request, res: Response): Promise<void> {
  const sessionId = req.cookies?.admin_session;
  if (sessionId) {
    await db.run('DELETE FROM admin_sessions WHERE session_id = ?', [sessionId]);
  }
  res.clearCookie('admin_session');
  res.json({ success: true });
}
