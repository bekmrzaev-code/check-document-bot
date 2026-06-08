import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Avatar, Icon, NameBlock } from '../lib/ui';
import { ViewToggle, Loading, EmptyState } from '../components/Common';
import { Pagination, paginate } from '../components/Pagination';
import { EditCompanyModal } from '../components/EditCompanyModal';
import { EditDriverModal } from '../components/EditDriverModal';
import { driverDisplay, driverImages, imageSrc } from '../lib/helpers';
import type { Company, Driver, ViewMode } from '../types';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [driversCache, setDriversCache] = useState<Record<string, Driver[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Company | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  async function load() {
    try {
      const [c, drivers] = await Promise.all([
        api.get<Company[]>('/companies'),
        api.get<Driver[]>('/drivers'),
      ]);
      setCompanies(c);
      const map: Record<string, number> = {};
      drivers.forEach((d) => { if (d.company_id) map[d.company_id] = (map[d.company_id] || 0) + 1; });
      setCounts(map);
    } catch {
      toast('❌ Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies;
  }, [companies, search]);

  const pg = paginate(filtered, page);

  async function toggle(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!driversCache[id]) {
      try {
        const data = await api.get<{ drivers: Driver[] }>(`/companies/${id}/drivers`);
        setDriversCache((m) => ({ ...m, [id]: data.drivers || [] }));
      } catch {
        setDriversCache((m) => ({ ...m, [id]: [] }));
      }
    }
  }

  async function createCompany() {
    if (!newName.trim()) { toast('Enter a company name'); return; }
    try {
      await api.post('/companies', { name: newName.trim() });
      setNewName('');
      toast('✅ Company added');
      load();
    } catch (e: any) {
      toast('❌ ' + (e?.message || 'Failed to add'));
    }
  }

  function reloadAll() {
    setDriversCache({});
    setEditing(null);
    setEditingDriver(null);
    load();
  }

  function driverMini(d: Driver) {
    const imgs = driverImages(d).slice(0, 4);
    return (
      <div className="driver-mini-row" key={d.id} style={{ flexWrap: 'wrap' }}>
        <Avatar name={driverDisplay(d)} variant="green" />
        <span className="driver-mini-name">
          <NameBlock display={driverDisplay(d)} original={d.name} />
        </span>
        <span className="driver-mini-meta">{d.truck_number ? `🚛 ${d.truck_number}` : ''}{d.images?.length ? ` 📷 ${d.images.length}` : ''}</span>
        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }} onClick={() => setEditingDriver(d)}>
          <Icon name="edit" /> Edit
        </button>
        {imgs.length > 0 && (
          <div className="photo-strip">
            {imgs.map((img) => <img key={img.id} src={imageSrc(img)} loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />)}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <Loading />;

  return (
    <>
      <div className="section-header"><div><h2>Companies</h2><p>Organize drivers by company</p></div></div>

      <div className="panel">
        <div className="form-row">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Company name</label>
            <input className="form-input" placeholder="e.g. Acme Logistics" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createCompany(); }} />
          </div>
          <button className="btn btn-primary" onClick={createCompany}><Icon name="plus" /> Add Company</button>
        </div>
      </div>

      <div className="list-toolbar">
        <input className="list-search" placeholder="Filter companies…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="toolbar-btn" onClick={() => setExpandedId(null)}>Collapse all</button>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🏢" title={companies.length ? 'No matches' : 'No companies yet'} text={companies.length ? 'Try a different filter' : 'Add your first company above'} />
      ) : view === 'grid' ? (
        <>
          <div className="grid">
            {pg.slice.map((c) => (
              <div className="card" key={c.id}>
                <div className="card-top">
                  <Avatar name={c.name} />
                  <div className="card-info"><div className="entity-name">{c.name}</div><div className="entity-original">{counts[c.id] || 0} driver{(counts[c.id] || 0) !== 1 ? 's' : ''}</div></div>
                </div>
                <div className="card-body">
                  <div className="card-meta">
                    <span className="meta-chip">👤 {counts[c.id] || 0}</span>
                    <span className="meta-chip">Created {new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="btn-group"><button className="btn btn-secondary" onClick={() => setEditing(c)}><Icon name="edit" /> Edit</button></div>
                </div>
              </div>
            ))}
          </div>
          <Pagination {...pg} onPage={setPage} />
        </>
      ) : (
        <>
          <div className="list-panel">
            {pg.slice.map((c, i) => {
              const open = expandedId === c.id;
              const drivers = driversCache[c.id];
              return (
                <div key={c.id}>
                  <div className={`list-row ${open ? 'expanded' : ''}`} onClick={() => toggle(c.id)}>
                    <span className="list-num">&lt;{pg.start + i + 1}&gt;</span>
                    <Avatar name={c.name} />
                    <div className="list-main">
                      <div className="entity-name">🏢 {c.name}</div>
                      <div className="list-sub">{counts[c.id] || 0} driver{(counts[c.id] || 0) !== 1 ? 's' : ''} · Created {new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="list-right">
                      <span className="list-count-badge">{counts[c.id] || 0} 👤</span>
                      <span className="list-chevron">›</span>
                    </div>
                  </div>
                  {open && (
                    <div className="list-detail">
                      {!drivers ? <div className="list-sub" style={{ marginTop: '0.5rem' }}>Loading drivers…</div>
                        : drivers.length === 0 ? <div className="list-sub" style={{ marginTop: '0.5rem' }}>No drivers assigned to this company yet.</div>
                          : <div className="driver-mini-list">{drivers.slice(0, 30).map(driverMini)}</div>}
                      <div className="detail-actions">
                        <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setEditing(c); }}><Icon name="edit" /> Edit Company</button>
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

      {editing && <EditCompanyModal company={editing} onClose={() => setEditing(null)} onSaved={reloadAll} />}
      {editingDriver && <EditDriverModal driver={editingDriver} companies={companies} onClose={() => setEditingDriver(null)} onSaved={reloadAll} />}
    </>
  );
}
