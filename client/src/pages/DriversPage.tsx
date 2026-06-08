import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Avatar, Icon, NameBlock } from '../lib/ui';
import { ViewToggle, Loading, EmptyState } from '../components/Common';
import { Pagination, paginate, PAGE_SIZE } from '../components/Pagination';
import { Lightbox } from '../components/Lightbox';
import { EditDriverModal } from '../components/EditDriverModal';
import { driverDisplay, driverImages, imageSrc, fmtDate } from '../lib/helpers';
import type { Driver, Company, ViewMode } from '../types';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  async function load() {
    try {
      const [d, c] = await Promise.all([
        api.get<Driver[]>('/drivers'),
        api.get<Company[]>('/companies'),
      ]);
      setDrivers(d);
      setCompanies(c);
    } catch {
      toast('❌ Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.admin_name || '').toLowerCase().includes(q) ||
      (companyName(d.company_id) || '').toLowerCase().includes(q) ||
      (d.truck_number || '').toLowerCase().includes(q)
    );
  }, [drivers, companies, search]);

  const pg = paginate(filtered, page);

  function openLightbox(d: Driver, index: number) {
    setLightbox({ images: driverImages(d).map(imageSrc), index });
  }

  if (loading) return <Loading />;

  return (
    <>
      <div className="section-header">
        <div><h2>Approved Drivers</h2><p>Manage profiles and assignments</p></div>
      </div>

      <div className="list-toolbar">
        <input className="list-search" placeholder="Filter drivers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="toolbar-btn" onClick={() => setExpandedId(null)}>Collapse all</button>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="👥" title="No approved drivers" text="Drivers appear here after approval." />
      ) : view === 'grid' ? (
        <>
          <div className="grid">
            {pg.slice.map((d) => {
              const imgs = driverImages(d);
              return (
                <div className="card" key={d.id}>
                  <div className="card-top">
                    <Avatar name={driverDisplay(d)} variant="green" />
                    <div className="card-info"><NameBlock display={driverDisplay(d)} original={d.name} hint /></div>
                    <span className="badge badge-approved">Approved</span>
                  </div>
                  <div className="card-body">
                    <div className="card-meta">
                      <span className="meta-chip">🏢 {companyName(d.company_id) || 'Unassigned'}</span>
                      {d.truck_number && <span className="meta-chip">🚛 {d.truck_number}</span>}
                      <span className="meta-chip">📷 {imgs.length}</span>
                    </div>
                    {imgs.length > 0 && (
                      <div className="card-photos">
                        {imgs.slice(0, 4).map((img, i) => (
                          <img key={img.id} src={imageSrc(img)} loading="lazy" onClick={() => openLightbox(d, i)} onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ))}
                      </div>
                    )}
                    <div className="btn-group">
                      <button className="btn btn-secondary" onClick={() => setEditing(d)}><Icon name="edit" /> Edit Driver</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination {...pg} onPage={setPage} />
        </>
      ) : (
        <>
          <div className="list-panel">
            {pg.slice.map((d, i) => {
              const open = expandedId === d.id;
              const imgs = driverImages(d);
              return (
                <div key={d.id}>
                  <div className={`list-row ${open ? 'expanded' : ''}`} onClick={() => setExpandedId(open ? null : d.id)}>
                    <span className="list-num">&lt;{pg.start + i + 1}&gt;</span>
                    <Avatar name={driverDisplay(d)} variant="green" />
                    <div className="list-main">
                      <NameBlock display={driverDisplay(d)} original={d.name} hint />
                      <div className="list-sub">{companyName(d.company_id) || 'Unassigned'}{d.truck_number ? ` · 🚛 ${d.truck_number}` : ''}</div>
                    </div>
                    <div className="list-right">
                      <span className="badge badge-approved">Approved</span>
                      <span className="list-chevron">›</span>
                    </div>
                  </div>
                  {open && (
                    <div className="list-detail">
                      <div className="detail-grid-inline">
                        <div className="detail-kv"><label>Telegram name</label><span>{d.name || '—'}</span></div>
                        <div className="detail-kv"><label>Company</label><span>{companyName(d.company_id) || '—'}</span></div>
                        <div className="detail-kv"><label>Truck</label><span>{d.truck_number || '—'}</span></div>
                        <div className="detail-kv"><label>Photos</label><span>{imgs.length}</span></div>
                        <div className="detail-kv"><label>Telegram ID</label><span>{d.telegram_user_id || '—'}</span></div>
                        <div className="detail-kv"><label>Joined</label><span>{fmtDate(d.created_at)}</span></div>
                      </div>
                      {imgs.length > 0 && (
                        <div className="photo-strip">
                          {imgs.slice(0, 8).map((img, idx) => (
                            <img key={img.id} src={imageSrc(img)} loading="lazy" onClick={(e) => { e.stopPropagation(); openLightbox(d, idx); }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                          ))}
                        </div>
                      )}
                      <div className="detail-actions">
                        <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setEditing(d); }}><Icon name="edit" /> Edit Driver</button>
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

      {editing && (
        <EditDriverModal
          driver={editing}
          companies={companies}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox({ ...lightbox, index: i })}
        />
      )}
    </>
  );
}
