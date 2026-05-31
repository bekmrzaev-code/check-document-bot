import { Router, Request, Response } from 'express';
import { adminLogin, adminLogout } from '../middleware/admin';

const router = Router();

router.post('/login', adminLogin);
router.post('/logout', adminLogout);

export default router;
