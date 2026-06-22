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
    const imagesByDriver = await approvedImageService.getByDriverIds(drivers.map((d) => d.id));
    const withImages = drivers.map((d) => ({ ...d, images: imagesByDriver[d.id] || [] }));
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

// Decode base64 data URLs (or raw base64) into Buffers. Accepts the new
// `photos` array and the legacy single `photo` field.
function decodePhotos(body: { photos?: unknown; photo?: unknown }): Buffer[] {
  const list: string[] = Array.isArray(body.photos)
    ? (body.photos as unknown[]).filter((p): p is string => typeof p === 'string')
    : typeof body.photo === 'string' ? [body.photo] : [];
  return list.slice(0, 10).map((p) => {
    const b64 = p.includes(',') ? p.split(',')[1] : p;
    return Buffer.from(b64, 'base64');
  });
}

// Send a message (optionally with photos) to a list of groups. Photos are
// uploaded once to the first group; the resulting file_ids are reused for the
// rest. A single photo is a normal photo; multiple go as an album.
async function sendToGroups(ids: number[], text: string | undefined, photoBuffers: Buffer[]) {
  let sent = 0;
  let failed = 0;
  let fileIds: string[] | undefined;
  const caption = text && text.trim() ? text : undefined;

  for (const id of ids) {
    try {
      if (photoBuffers.length > 0) {
        const sources = fileIds ?? photoBuffers.map((b) => ({ source: b }));
        const res = await telegramBot.sendPhotosWithCaption(id, sources, caption);
        if (!fileIds && res.file_ids.length === photoBuffers.length) fileIds = res.file_ids;
      } else {
        await telegramBot.sendMessage(id, text!, { parse_mode: 'Markdown' });
      }
      await groupService.touch(id);
      sent++;
    } catch (error: any) {
      console.error('Send error:', error?.message);
      failed++;
      if (error?.response?.error_code === 403) {
        await groupService.markInactive(id);
      }
    }
  }
  return { sent, failed };
}

router.post('/:groupId/message', adminAuth, async (req: Request, res: Response) => {
  const { text } = req.body;
  const photos = decodePhotos(req.body);
  if (!text && photos.length === 0) {
    res.status(400).json({ error: 'text or photo is required' });
    return;
  }
  const groupId = Number(req.params.groupId);
  const result = await sendToGroups([groupId], text, photos);
  if (result.sent === 0) {
    res.status(500).json({ error: 'Failed to send message' });
    return;
  }
  res.json({ success: true, ...result });
});

// Send one message (optionally with photos) to several selected groups.
router.post('/bulk-message', adminAuth, async (req: Request, res: Response) => {
  const { group_ids, text } = req.body;
  const photos = decodePhotos(req.body);
  if (!Array.isArray(group_ids) || group_ids.length === 0) {
    res.status(400).json({ error: 'group_ids is required' });
    return;
  }
  if (!text && photos.length === 0) {
    res.status(400).json({ error: 'text or photo is required' });
    return;
  }
  const ids = group_ids.map((g: any) => Number(g)).filter((n: number) => !Number.isNaN(n));
  const result = await sendToGroups(ids, text, photos);
  res.json({ success: true, ...result });
});

router.post('/broadcast', adminAuth, async (req: Request, res: Response) => {
  const { text } = req.body;
  const photos = decodePhotos(req.body);
  if (!text && photos.length === 0) {
    res.status(400).json({ error: 'text or photo is required' });
    return;
  }
  const active = (await groupService.getAll()).filter((g) => g.is_active);
  const result = await sendToGroups(active.map((g) => g.group_id), text, photos);
  res.json({ success: true, ...result });
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
