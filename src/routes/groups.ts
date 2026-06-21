import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/admin';
import { telegramBot } from '../bot/telegram';
import { groupService } from '../services/group.service';
import { uploadService } from '../services/upload.service';
import { approvedImageService } from '../services/approved-image.service';

const router = Router();

router.post('/sync', adminAuth, async (_req: Request, res: Response) => {
  try {
    const uploadGroups = await uploadService.getDistinctGroups();
    const fromUploads = await groupService.syncFromUploads(uploadGroups);

    let refreshed = 0;
    let failed = 0;
    let deactivated = 0;
    if (telegramBot) {
      const result = await telegramBot.refreshAllGroups();
      refreshed = result.refreshed;
      failed = result.failed;
      deactivated = result.deactivated;
    }

    const groups = await groupService.getAll();
    res.json({
      success: true,
      from_uploads: fromUploads,
      refreshed,
      failed,
      deactivated,
      active: groups.filter((g) => g.is_active).length,
      total: groups.length,
    });
  } catch (error) {
    console.error('Error syncing groups:', error);
    res.status(500).json({ error: 'Failed to sync groups' });
  }
});

router.get('/', adminAuth, async (_req: Request, res: Response) => {
  try {
    const groups = await groupService.getAll();
    const counts = await groupService.getDriverStatusCounts();
    res.json(
      groups.map((g) => ({
        ...g,
        driver_counts: counts[g.group_id] || { approved: 0, pending: 0, rejected: 0, total: 0 },
      }))
    );
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Drivers in a group split by status: { approved, pending, rejected }
router.get('/:groupId/drivers', adminAuth, async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    if (Number.isNaN(groupId)) {
      res.status(400).json({ error: 'Invalid group id' });
      return;
    }
    const drivers = await groupService.getDriversByGroup(groupId);
    const withImages = await Promise.all(
      drivers.map(async (d) => ({
        ...d,
        images: await approvedImageService.getByDriverId(d.id),
      }))
    );
    const out: { approved: any[]; pending: any[]; rejected: any[] } = {
      approved: [],
      pending: [],
      rejected: [],
    };
    for (const d of withImages) {
      if (d.status === 'approved') out.approved.push(d);
      else if (d.status === 'rejected') out.rejected.push(d);
      else out.pending.push(d);
    }
    res.json(out);
  } catch (error) {
    console.error('Error fetching group drivers:', error);
    res.status(500).json({ error: 'Failed to fetch group drivers' });
  }
});

router.get('/stats', adminAuth, async (_req: Request, res: Response) => {
  try {
    res.json(await groupService.getStats());
  } catch (error) {
    console.error('Error fetching group stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.put('/:groupId', adminAuth, async (req: Request, res: Response) => {
  try {
    const { admin_name, company_id } = req.body;
    const groupId = Number(req.params.groupId);
    const group = await groupService.getById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    if (admin_name !== undefined) {
      await groupService.setAdminName(groupId, admin_name ?? null);
    }
    if (company_id !== undefined) {
      await groupService.setCompany(groupId, company_id ?? null);
    }
    res.json(await groupService.getById(groupId));
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

router.post('/:groupId/message', adminAuth, async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const groupId = Number(req.params.groupId);

  try {
    await telegramBot.sendMessage(groupId, text, { parse_mode: 'Markdown' });
    await groupService.touch(groupId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Send message error:', error?.message);
    if (error?.response?.error_code === 403) {
      await groupService.markInactive(groupId);
    }
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/broadcast', adminAuth, async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const active = (await groupService.getAll()).filter((g) => g.is_active);
  let sent = 0;
  let failed = 0;

  for (const g of active) {
    try {
      await telegramBot.sendMessage(g.group_id, text, { parse_mode: 'Markdown' });
      await groupService.touch(g.group_id);
      sent++;
    } catch (error: any) {
      failed++;
      if (error?.response?.error_code === 403) {
        await groupService.markInactive(g.group_id);
      }
    }
  }

  res.json({ success: true, sent, failed });
});

router.delete('/:groupId', adminAuth, async (req: Request, res: Response) => {
  try {
    await groupService.delete(Number(req.params.groupId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

export default router;
