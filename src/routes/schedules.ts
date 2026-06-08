import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/admin';
import { scheduledMessageService } from '../services/scheduled-message.service';

const router = Router();

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// List all schedules
router.get('/', adminAuth, async (_req: Request, res: Response) => {
  try {
    res.json(await scheduledMessageService.getAll());
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Create a daily schedule
router.post('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const { text, time_of_day, target } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }
    if (!time_of_day || !TIME_RE.test(time_of_day)) {
      res.status(400).json({ error: 'Time must be in HH:MM (24h) format' });
      return;
    }

    let normalizedTarget: 'all' | number[] = 'all';
    if (target && target !== 'all') {
      if (!Array.isArray(target) || target.length === 0) {
        res.status(400).json({ error: 'Select "all" or at least one group' });
        return;
      }
      const ids = target.map((g: any) => Number(g)).filter((n: number) => !Number.isNaN(n));
      if (ids.length === 0) {
        res.status(400).json({ error: 'No valid group ids provided' });
        return;
      }
      normalizedTarget = ids;
    }

    const schedule = await scheduledMessageService.create({
      text: text.trim(),
      time_of_day,
      target: normalizedTarget,
    });
    res.json(schedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Toggle active / paused
router.patch('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { is_active } = req.body;
    const existing = await scheduledMessageService.getById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    await scheduledMessageService.setActive(req.params.id, Boolean(is_active));
    res.json(await scheduledMessageService.getById(req.params.id));
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete (stop) a schedule
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    await scheduledMessageService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export default router;
