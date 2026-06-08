import { Router, Request, Response } from 'express';
import { adminLogin, adminLogout, adminAuth } from '../middleware/admin';

const router = Router();

router.post('/login', adminLogin);
router.post('/logout', adminLogout);

// Session check for the SPA — 200 if logged in, 401 otherwise
router.get('/me', adminAuth, (_req: Request, res: Response) => {
  res.json({ authenticated: true });
});

export default router;
