import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Avatar, Icon, NameBlock } from '../lib/ui';
import { ViewToggle, Loading, EmptyState } from '../components/Common';
import type { PendingUpload, Company, Driver, ViewMode } from '../types';

export default function PendingPage() {
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [companiesCount, setCompaniesCount] = useState(0);
  const [driversCount, setDriversCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');

  async function load() {
    try {
      const [pending, companies, drivers] = await Promise.all([
        api.get<PendingUpload[]>('/uploads/pending'),
        api.get<Company[]>('/companies'),
        api.get<Driver[]>('/drivers'),
      ]);
      setUploads(pending);
      setCompaniesCount(companies.length);
      setDriversCount(drivers.length);
    } catch {
      toast('❌ Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return uploads;
    return uploads.filter((u) =>
      (u.driver_name || '').toLowerCase().includes(q) ||
      (u.driver_admin_name || '').toLowerCase().includes(q) ||
      (u.group_name || '').toLowerCase().includes(q)
    );
  }, [uploads, search]);

  function displayName(u: PendingUpload) {
    return u.driver_admin_name?.trim() ? u.driver_admin_name.trim() : u.driver_name;
  }

  async function approveQuick(id: string) {
    try {
      const { upload } = await api.get<{ upload: { file_ids?: string | null } }>(`/uploads/${id}`);
      const fileIds: string[] = upload.file_ids ? JSON.parse(upload.file_ids) : [];
      await api.post(`/uploads/${id}/approve`, {
        selected_indexes: fileIds.map((_, i) => i),
        checklist: { no_manuals: false, no_tablet: false, no_paperlog: false },
      });
      toast('✅ Driver approved');
      load();
    } catch {
      toast('❌ Approval failed');
    }
  }

  async function rejectQuick(id: string) {
    if (!confirm('Reject this application?')) return;
    try {
      await api.post(`/uploads/${id}/reject`);
      toast('Application rejected');
      load();
    } catch {
      toast('❌ Failed');
    }
  }

  if (loading) return <Loading />;

  return (
    <>
      <div className="stats-row">
        <div className="stat-card accent"><div className="stat-label">Pending</div><div className="stat-num">{uploads.length}</div></div>
        <div className="stat-card green"><div className="stat-label">Companies</div><div className="stat-num">{companiesCount}</div></div>
        <div className="stat-card orange"><div className="stat-label">Approved Drivers</div><div className="stat-num">{driversCount}</div></div>
      </div>

      <div className="section-header">
        <div><h2>Review Queue</h2><p>Applications waiting for your decision</p></div>
      </div>

      <div className="list-toolbar">
        <input className="list-search" placeholder="Filter pending…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="toolbar-btn" onClick={() => setSearch('')}>Clear</button>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="✅" title="All caught up!" text="No pending reviews — great work." />
      ) : view === 'grid' ? (
        <div className="grid">
          {filtered.map((u) => (
            <div className="card" key={u.id}>
              <div className="card-top">
                <Avatar name={displayName(u)} />
                <div className="card-info"><NameBlock display={displayName(u)} original={u.driver_name} /></div>
                <span className="badge badge-pending">Pending</span>
              </div>
              <div className="card-body">
                <div className="card-meta">
                  <span className="meta-chip">📍 {u.group_name}</span>
                  <span className="meta-chip">🖼 {u.image_count} photos</span>
                </div>
                <div className="btn-group">
                  <button className="btn btn-success" onClick={() => approveQuick(u.id)}><Icon name="check" /> Approve</button>
                  <button className="btn btn-danger" onClick={() => rejectQuick(u.id)}><Icon name="close" /> Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="list-panel">
          {filtered.map((u, i) => (
            <div className="list-row" key={u.id}>
              <span className="list-num">&lt;{i + 1}&gt;</span>
              <Avatar name={displayName(u)} />
              <div className="list-main">
                <NameBlock display={displayName(u)} original={u.driver_name} />
                <div className="list-sub">📍 {u.group_name} · 🖼 {u.image_count} photos</div>
              </div>
              <div className="list-right">
                <span className="badge badge-pending">Pending</span>
                <button className="btn btn-success btn-icon" onClick={() => approveQuick(u.id)} title="Quick approve"><Icon name="check" /></button>
                <button className="btn btn-danger btn-icon" onClick={() => rejectQuick(u.id)} title="Reject"><Icon name="close" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
