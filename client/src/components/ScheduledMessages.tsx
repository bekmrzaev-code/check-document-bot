import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';
import { groupDisplay } from '../lib/helpers';
import type { ScheduledMessage, TelegramGroup } from '../types';

export function ScheduledMessages({ groups }: { groups: TelegramGroup[] }) {
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([]);
  const [text, setText] = useState('');
  const [time, setTime] = useState('09:00');
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const active = groups.filter((g) => g.is_active);

  async function load() {
    try { setSchedules(await api.get<ScheduledMessage[]>('/schedules')); } catch { /* ignore */ }
  }
  useEffect(() => { load(); }, []);

  function groupName(id: number) {
    const g = groups.find((x) => Number(x.group_id) === Number(id));
    return g ? groupDisplay(g) : `Group ${id}`;
  }

  function toggleSel(id: number) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function pickCategory(cat: 'all' | 'none' | 'approved' | 'pending' | 'rejected') {
    const n = new Set<number>();
    if (cat !== 'none') {
      active.forEach((g) => {
        const c = g.driver_counts || { approved: 0, pending: 0, rejected: 0, total: 0 };
        if (cat === 'all' || (c as any)[cat] > 0) n.add(g.group_id);
      });
    }
    setSelected(n);
  }

  async function create() {
    if (!text.trim()) { toast('Enter a message'); return; }
    if (!time) { toast('Pick a time'); return; }
    let target: 'all' | number[] = 'all';
    if (mode === 'selected') {
      if (selected.size === 0) { toast('Select at least one group'); return; }
      target = Array.from(selected);
    }
    setSaving(true);
    try {
      await api.post('/schedules', { text: text.trim(), time_of_day: time, target });
      setText(''); setMode('all'); setSelected(new Set());
      toast('✅ Daily message scheduled');
      load();
    } catch (e: any) {
      toast('❌ ' + (e?.message || 'Failed to schedule'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: ScheduledMessage) {
    try { await api.patch(`/schedules/${s.id}`, { is_active: !s.is_active }); toast(s.is_active ? '⏸ Paused' : '▶ Resumed'); load(); }
    catch { toast('❌ Failed'); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this daily message? The bot will stop sending it.')) return;
    try { await api.del(`/schedules/${id}`); toast('✅ Schedule deleted'); load(); }
    catch { toast('❌ Failed'); }
  }

  return (
    <div className="panel">
      <div className="panel-title">⏰ Daily scheduled message</div>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Pick a time and the bot sends this message to the chosen groups <strong>every day</strong> — until you delete it. Time is server local time.
      </p>
      <div className="form-group">
        <label className="form-label">Message (Markdown supported)</label>
        <textarea className="form-input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="*Daily reminder*&#10;&#10;Please submit your documents on time." />
      </div>
      <div className="form-row-2">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Send daily at</label>
          <input type="time" className="form-input" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Send to</label>
          <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value as 'all' | 'selected')}>
            <option value="all">All active groups</option>
            <option value="selected">Choose groups…</option>
          </select>
        </div>
      </div>

      {mode === 'selected' && (
        <div className="schedule-picker" style={{ marginTop: '0.85rem' }}>
          {active.length === 0 ? (
            <div className="picker-empty">No active groups yet. Add the bot to a group, then Sync.</div>
          ) : (
            <>
              <div className="picker-cats">
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-2)', alignSelf: 'center' }}>Quick select:</span>
                <button type="button" className="cat-chip" onClick={() => pickCategory('all')}>All</button>
                <button type="button" className="cat-chip" onClick={() => pickCategory('approved')}>✓ Has approved</button>
                <button type="button" className="cat-chip" onClick={() => pickCategory('pending')}>⏳ Has pending</button>
                <button type="button" className="cat-chip" onClick={() => pickCategory('rejected')}>✕ Has rejected</button>
                <button type="button" className="cat-chip" onClick={() => pickCategory('none')}>Clear</button>
              </div>
              {active.map((g) => {
                const c = g.driver_counts;
                return (
                  <label className="picker-item" key={g.group_id}>
                    <input type="checkbox" checked={selected.has(g.group_id)} onChange={() => toggleSel(g.group_id)} />
                    <span style={{ flex: 1 }}>{groupDisplay(g)} <span style={{ color: 'var(--muted-2)' }}>· {g.member_count || 0} 👤</span></span>
                    {c && (c.approved + c.pending + c.rejected > 0) && (
                      <span className="status-chips">
                        {c.approved > 0 && <span className="scount approved">✓ {c.approved}</span>}
                        {c.pending > 0 && <span className="scount pending">⏳ {c.pending}</span>}
                        {c.rejected > 0 && <span className="scount rejected">✕ {c.rejected}</span>}
                      </span>
                    )}
                  </label>
                );
              })}
            </>
          )}
        </div>
      )}

      <button className="btn btn-primary" style={{ marginTop: '0.85rem' }} onClick={create} disabled={saving}>
        <Icon name="pending" /> {saving ? 'Saving…' : 'Schedule daily message'}
      </button>

      <div style={{ marginTop: '1rem' }}>
        {schedules.length === 0 ? (
          <div className="picker-empty" style={{ textAlign: 'center', padding: '1rem' }}>No daily messages scheduled yet.</div>
        ) : (
          schedules.map((s) => {
            const targetLabel = s.target === 'all' ? 'All active groups'
              : `${s.target.length} group${s.target.length !== 1 ? 's' : ''}: ${s.target.map(groupName).join(', ')}`;
            return (
              <div className={`sched-row ${s.is_active ? '' : 'paused'}`} key={s.id}>
                <div className="sched-time"><b>{s.time_of_day}</b><small>daily</small></div>
                <div className="sched-main">
                  <div className="sched-text">{s.text}</div>
                  <div className="sched-meta">📍 {targetLabel} <span style={{ color: 'var(--muted-2)' }}>· {s.last_run_date ? `Last sent ${s.last_run_date}` : 'Not sent yet'}</span></div>
                </div>
                <div className="sched-actions">
                  <button className="btn btn-secondary btn-icon" title={s.is_active ? 'Pause' : 'Resume'} onClick={() => toggleActive(s)}>{s.is_active ? '⏸' : '▶'}</button>
                  <button className="btn btn-danger btn-icon" title="Delete" onClick={() => remove(s.id)}><Icon name="trash" /></button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
