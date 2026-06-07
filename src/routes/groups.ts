import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/admin';
import { telegramBot } from '../bot/telegram';

const router = Router();

// ── In-memory group store (persists while server is running) ──────────────────
export interface TelegramGroup {
  group_id:     number;
  group_name:   string;
  group_type:   'group' | 'supergroup' | 'channel';
  member_count: number;
  is_active:    boolean;
  added_at:     string;
  last_seen:    string;
}

const groupCache = new Map<number, TelegramGroup>();

// ── Exported helpers (call these from your bot handlers) ──────────────────────

export function registerGroup(data: {
  group_id:      number;
  group_name:    string;
  group_type?:   'group' | 'supergroup' | 'channel';
  member_count?: number;
}) {
  const existing = groupCache.get(data.group_id);
  groupCache.set(data.group_id, {
    group_id:     data.group_id,
    group_name:   data.group_name,
    group_type:   data.group_type ?? 'group',
    member_count: data.member_count ?? existing?.member_count ?? 0,
    is_active:    true,
    added_at:     existing?.added_at ?? new Date().toISOString(),
    last_seen:    new Date().toISOString(),
  });
}

export function markGroupInactive(group_id: number) {
  const g = groupCache.get(group_id);
  if (g) groupCache.set(group_id, { ...g, is_active: false });
}

export function getAllCachedGroups(): TelegramGroup[] {
  return Array.from(groupCache.values()).sort(
    (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/groups
router.get('/', adminAuth, (_req: Request, res: Response) => {
  res.json(getAllCachedGroups());
});

// GET /api/groups/stats
router.get('/stats', adminAuth, (_req: Request, res: Response) => {
  const all     = getAllCachedGroups();
  const active  = all.filter(g => g.is_active);
  const members = active.reduce((sum, g) => sum + (g.member_count || 0), 0);
  res.json({
    total:         all.length,
    active:        active.length,
    inactive:      all.length - active.length,
    total_members: members,
  });
});

// POST /api/groups/:groupId/message
router.post('/:groupId/message', adminAuth, async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: 'text is required' }); return; }

  const groupId = Number(req.params.groupId);
  const group   = groupCache.get(groupId);

  try {
    await telegramBot.sendMessage(groupId, text, { parse_mode: 'Markdown' });
    if (group) groupCache.set(groupId, { ...group, last_seen: new Date().toISOString() });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Send message error:', error?.message);
    if (error?.response?.error_code === 403 && group) markGroupInactive(groupId);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/groups/broadcast
router.post('/broadcast', adminAuth, async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: 'text is required' }); return; }

  const active = getAllCachedGroups().filter(g => g.is_active);
  let sent = 0, failed = 0;

  for (const g of active) {
    try {
      await telegramBot.sendMessage(g.group_id, text, { parse_mode: 'Markdown' });
      groupCache.set(g.group_id, { ...g, last_seen: new Date().toISOString() });
      sent++;
    } catch (error: any) {
      failed++;
      if (error?.response?.error_code === 403) markGroupInactive(g.group_id);
    }
  }

  res.json({ success: true, sent, failed });
});

// DELETE /api/groups/:groupId
router.delete('/:groupId', adminAuth, (req: Request, res: Response) => {
  groupCache.delete(Number(req.params.groupId));
  res.json({ success: true });
});

export default router;