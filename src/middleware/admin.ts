import { Request, Response, NextFunction } from 'express';

const adminSessions: Map<string, number> = new Map();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.admin_session;

  if (sessionId && adminSessions.has(sessionId)) {
    const sessionTime = adminSessions.get(sessionId)!;
    if (Date.now() - sessionTime < SESSION_DURATION) {
      next();
      return;
    }
    adminSessions.delete(sessionId);
  }

  res.status(401).json({ error: 'Unauthorized' });
}

export function adminLogin(req: Request, res: Response): void {
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

  const sessionId = Math.random().toString(36).substring(7);
  adminSessions.set(sessionId, Date.now());

  res.cookie('admin_session', sessionId, {
    httpOnly: true,
    maxAge: SESSION_DURATION,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({ success: true });
}

export function adminLogout(req: Request, res: Response): void {
  const sessionId = req.cookies?.admin_session;
  if (sessionId) {
    adminSessions.delete(sessionId);
  }
  res.clearCookie('admin_session');
  res.json({ success: true });
}
