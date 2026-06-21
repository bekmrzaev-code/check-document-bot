import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Avatar, Icon, NameBlock } from '../lib/ui';
import { ViewToggle, Loading, EmptyState, SelectAvatar, SelectAll, SelectionBar } from '../components/Common';
import { Pagination, paginate } from '../components/Pagination';
import { EditGroupModal } from '../components/EditGroupModal';
import { SendMessageModal } from '../components/SendMessageModal';
import { ScheduledMessages } from '../components/ScheduledMessages';
import { useSelection } from '../lib/useSelection';
import { groupDisplay, driverDisplay, driverImages, imageSrc } from '../lib/helpers';
import type { TelegramGroup, Driver, Company, ViewMode } from '../types';

interface Stats { total: number; active: number; inactive: number; total_members: number; }
interface GroupDrivers { approved: Driver[]; pending: Driver[]; rejected: Driver[]; }

function StatusChips({ c }: { c?: TelegramGroup['driver_counts'] }) {
  if (!c || c.approved + c.pending + c.rejected === 0) return null;
  return (
    <span className="status-chips">
      {c.approved > 0 && <span className="scount approved"><Icon name="check" className="" /> {c.approved}</span>}
      {c.pending > 0 && <span className="scount pending"><Icon name="clock" className="" /> {c.pending}</span>}
      {c.rejected > 0 && <span className="scount rejected"><Icon name="x" className="" /> {c.rejected}</span>}
    </span>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, total_members: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [driversCache, setDriversCache] = useState<Record<number, GroupDrivers>>({});
  const [editing, setEditing] = useState<TelegramGroup | null>(null);
  const [messaging, setMessaging] = useState<TelegramGroup | null>(null);
  const [syncStatus, setSyncStatus] = useState('');
  const [broadcast, setBroadcast] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bulkCompany, setBulkCompany] = useState('');
  const sel = useSelection<number>();

  const companyName = useMemo(() => {
    const m: Record<string, string> = {};
    companies.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [companies]);

  async function load() {
    try {
      const [s, g, c] = await Promise.all([
        api.get<Stats>('/groups/stats'),
        api.get<TelegramGroup[]>('/groups'),
        api.get<Company[]>('/companies'),
      ]);
      setStats(s);
      setGroups(g);
      setCompanies(c);
      setDriversCache({});
      setExpandedId(null);
      sel.clear();
    } catch {
      toast('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      (g.group_name || '').toLowerCase().includes(q) ||
      (g.admin_name || '').toLowerCase().includes(q) ||
      (g.company_id ? (companyName[g.company_id] || '').toLowerCase().includes(q) : false) ||
      String(g.group_id).includes(q)
    );
  }, [groups, search, companyName]);

  const pg = paginate(filtered, page);
  const allSelected = pg.slice.length > 0 && pg.slice.every((g) => sel.isSelected(g.group_id));

  async function runBulk(label: string, fn: (id: number) => Promise<unknown>) {
    if (sel.ids.length === 0) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const id of sel.ids) { try { await fn(id); ok++; } catch { fail++; } }
    setBusy(false);
    toast(`${label}: ${ok} done${fail ? `, ${fail} failed` : ''}`);
    load();
  }

  function bulkAttach() {
    runBulk(bulkCompany ? 'Attached' : 'Detached', (id) => api.put(`/groups/${id}`, { company_id: bulkCompany || null }));
  }
  function bulkRemove() {
    if (!confirm(`Remove ${sel.size} selected group(s) from the list?`)) return;
    runBulk('Removed', (id) => api.del(`/groups/${id}`));
  }

  async function toggle(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!driversCache[id]) {
      try {
        const data = await api.get<GroupDrivers>(`/groups/${id}/drivers`);
        setDriversCache((m) => ({ ...m, [id]: data }));
      } catch {
        setDriversCache((m) => ({ ...m, [id]: { approved: [], pending: [], rejected: [] } }));
      }
    }
  }

  async function sync() {
    setSyncStatus('Syncing from Telegram…');
    try {
      const d = await api.post<any>('/groups/sync');
      setSyncStatus(`${d.active ?? d.total} active · ${d.total} total · ${d.refreshed} refreshed${d.deactivated ? ` · ${d.deactivated} removed` : ''}`);
      toast(`Synced — ${d.active ?? d.total} active group(s)`);
      load();
    } catch {
      setSyncStatus('Sync failed');
      toast('Sync failed');
    }
    setTimeout(() => setSyncStatus(''), 6000);
  }

  async function sendBroadcast() {
    if (!broadcast.trim()) { toast('Enter a message'); return; }
    setBroadcasting(true);
    try {
      const d = await api.post<{ sent: number; failed: number }>('/groups/broadcast', { text: broadcast });
      toast(`Sent to ${d.sent} group(s) (${d.failed} failed)`);
      setBroadcast('');
    } catch {
      toast('Broadcast failed');
    } finally {
      setBroadcasting(false);
    }
  }

  async function removeGroup(id: number) {
    if (!confirm('Remove this group from the list?')) return;
    try { await api.del(`/groups/${id}`); toast('Group removed'); load(); }
    catch { toast('Failed'); }
  }

  function CompanyChip({ g }: { g: TelegramGroup }) {
    if (!g.company_id || !companyName[g.company_id]) return null;
    return <span className="company-chip"><Icon name="building" className="" /> {companyName[g.company_id]}</span>;
  }

  function driverMini(d: Driver) {
    const imgs = driverImages(d).slice(0, 4);
    return (
      <div className="driver-mini-row" key={d.id} style={{ flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
        <Avatar name={driverDisplay(d)} variant={d.status === 'approved' ? 'green' : ''} />
        <span className="driver-mini-name"><NameBlock display={driverDisplay(d)} original={d.name} /></span>
        <span className="driver-mini-meta">
          {d.truck_number ? <><Icon name="truck" className="" /> {d.truck_number}</> : null}
          {d.images?.length ? <>{d.truck_number ? '  ' : ''}<Icon name="image" className="" /> {d.images.length}</> : null}
        </span>
        {imgs.length > 0 && <div className="photo-strip">{imgs.map((img) => <img key={img.id} src={imageSrc(img)} loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />)}</div>}
      </div>
    );
  }

  function statusSections(id: number) {
    const data = driversCache[id];
    if (!data) return <div className="list-sub" style={{ marginTop: '0.6rem' }}>Loading drivers…</div>;
    const total = data.approved.length + data.pending.length + data.rejected.length;
    if (!total) return <div className="list-sub" style={{ marginTop: '0.6rem' }}>No drivers have uploaded in this group yet.</div>;
    const sec = (key: 'approved' | 'pending' | 'rejected', label: string, arr: Driver[]) =>
      arr.length === 0 ? null : (
        <div className="gstatus" key={key}>
          <div className="gstatus-head"><span className={`gstatus-dot ${key}`} />{label}<span className="gstatus-count">{arr.length}</span></div>
          <div className="driver-mini-list">{arr.slice(0, 30).map(driverMini)}</div>
        </div>
      );
    return <>{sec('approved', 'Approved', data.approved)}{sec('pending', 'Not approved', data.pending)}{sec('rejected', 'Rejected', data.rejected)}</>;
  }

  if (loading) return <Loading />;

  return (
    <>
      <div className="stats-row">
        <div className="stat-card accent"><div className="stat-label">Total Groups</div><div className="stat-num">{stats.total}</div></div>
        <div className="stat-card green"><div className="stat-label">Active</div><div className="stat-num">{stats.active}</div></div>
        <div className="stat-card red"><div className="stat-label">Inactive</div><div className="stat-num">{stats.inactive}</div></div>
        <div className="stat-card orange"><div className="stat-label">Members</div><div className="stat-num">{stats.total_members}</div></div>
      </div>

      <div className="groups-layout">
        {/* ── Left: search + groups ── */}
        <div className="groups-main">
          <div className="list-toolbar">
            <span className="search-wrap">
              <Icon name="search" className="search-ico" />
              <input className="list-search has-ico" placeholder="Search by name, company or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </span>
            {pg.slice.length > 0 && <SelectAll checked={allSelected} onChange={() => sel.toggleAll(pg.slice.map((g) => g.group_id))} />}
            <button className="toolbar-btn" onClick={() => setExpandedId(null)}><Icon name="collapse" className="" /> Collapse</button>
            <ViewToggle view={view} onChange={setView} />
          </div>

          <SelectionBar count={sel.size} onClear={sel.clear}>
            <select className="form-select" value={bulkCompany} onChange={(e) => setBulkCompany(e.target.value)}>
              <option value="">— No company —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn btn-primary" disabled={busy} onClick={bulkAttach}><Icon name="building" /> Apply company</button>
            <button className="btn btn-danger" disabled={busy} onClick={bulkRemove}><Icon name="trash" /> Remove</button>
          </SelectionBar>

          {filtered.length === 0 ? (
            <EmptyState icon="groups" title={groups.length ? 'No matches' : 'No groups yet'} text={groups.length ? 'Try a different search' : 'Add the bot to a Telegram group, then press Sync.'} />
          ) : view === 'grid' ? (
            <>
              <div className="grid">
                {pg.slice.map((g) => (
                  <div className={`card ${sel.isSelected(g.group_id) ? 'selected' : ''}`} key={g.group_id}>
                    <div className="card-top">
                      <SelectAvatar name={groupDisplay(g)} selected={sel.isSelected(g.group_id)} onToggle={() => sel.toggle(g.group_id)} />
                      <div className="card-info"><NameBlock display={groupDisplay(g)} original={g.group_name} hint /></div>
                      <span className={`badge ${g.is_active ? 'badge-active' : 'badge-inactive'}`}>{g.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="card-body">
                      <div className="card-meta">
                        <span className="meta-chip"><Icon name="users" className="" /> {g.member_count || 0}</span>
                        <span className="meta-chip"><Icon name="hash" className="" /> {g.group_id}</span>
                        <CompanyChip g={g} />
                      </div>
                      <div style={{ marginBottom: '0.85rem' }}><StatusChips c={g.driver_counts} /></div>
                      <div className="btn-group">
                        <button className="btn btn-secondary" onClick={() => setEditing(g)}><Icon name="edit" /> Edit</button>
                        {g.is_active && <button className="btn btn-primary" onClick={() => setMessaging(g)}><Icon name="send" /> Message</button>}
                        <button className="btn btn-danger btn-icon" onClick={() => removeGroup(g.group_id)} title="Remove"><Icon name="trash" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination {...pg} onPage={setPage} />
            </>
          ) : (
            <>
              <div className="list-panel">
                {pg.slice.map((g, i) => {
                  const open = expandedId === g.group_id;
                  return (
                    <div key={g.group_id}>
                      <div className={`list-row ${open ? 'expanded' : ''} ${sel.isSelected(g.group_id) ? 'selected' : ''}`} onClick={() => toggle(g.group_id)}>
                        <SelectAvatar name={groupDisplay(g)} selected={sel.isSelected(g.group_id)} onToggle={() => sel.toggle(g.group_id)} />
                        <div className="list-main">
                          <NameBlock display={groupDisplay(g)} original={g.group_name} hint />
                          <div className="list-sub">
                            <span className={`dot-status ${g.is_active ? 'on' : 'off'}`} />{g.is_active ? 'Active' : 'Inactive'} · {g.member_count || 0} members
                            <CompanyChip g={g} />
                            <StatusChips c={g.driver_counts} />
                          </div>
                        </div>
                        <div className="list-right">
                          <span className="list-chevron"><Icon name="chevron" className="" /></span>
                        </div>
                      </div>
                      {open && (
                        <div className="list-detail">
                          <div className="detail-grid-inline">
                            <div className="detail-kv"><label>Telegram name</label><span>{g.group_name}</span></div>
                            <div className="detail-kv"><label>Company</label><span>{g.company_id ? (companyName[g.company_id] || '—') : '—'}</span></div>
                            <div className="detail-kv"><label>Status</label><span>{g.is_active ? 'Active' : 'Inactive'}</span></div>
                            <div className="detail-kv"><label>Members</label><span>{g.member_count || '—'}</span></div>
                            <div className="detail-kv"><label>Type</label><span>{g.group_type || 'group'}</span></div>
                            <div className="detail-kv"><label>Group ID</label><span style={{ fontSize: '0.72rem' }}>{g.group_id}</span></div>
                          </div>
                          {statusSections(g.group_id)}
                          <div className="detail-actions">
                            <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setEditing(g); }}><Icon name="edit" /> Edit / Attach company</button>
                            {g.is_active && <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); setMessaging(g); }}><Icon name="send" /> Send Message</button>}
                            <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); removeGroup(g.group_id); }}><Icon name="trash" /> Remove</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Pagination {...pg} onPage={setPage} />
            </>
          )}
        </div>

        {/* ── Right: functions ── */}
        <aside className="groups-aside">
          <div className="panel side-panel">
            <div className="panel-title"><Icon name="refresh" className="" /> Sync groups</div>
            <p className="side-hint">Discover from upload history &amp; refresh details from Telegram.</p>
            <button className="btn btn-primary btn-block" onClick={sync}><Icon name="refresh" /> Sync now</button>
            {syncStatus && <div className="side-status">{syncStatus}</div>}
          </div>

          <div className="panel side-panel">
            <div className="panel-title"><Icon name="megaphone" className="" /> Broadcast</div>
            <p className="side-hint">Send a message to every active group.</p>
            <textarea className="form-input" rows={4} value={broadcast} onChange={(e) => setBroadcast(e.target.value)} placeholder="*Important announcement*&#10;&#10;Your message here…" />
            <button className="btn btn-warning btn-block" style={{ marginTop: '0.65rem' }} onClick={sendBroadcast} disabled={broadcasting}>
              <Icon name="send" /> {broadcasting ? 'Sending…' : 'Send broadcast'}
            </button>
          </div>

          <ScheduledMessages groups={groups} />
        </aside>
      </div>

      {editing && <EditGroupModal group={editing} companies={companies} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {messaging && <SendMessageModal group={messaging} onClose={() => setMessaging(null)} />}
    </>
  );
}
