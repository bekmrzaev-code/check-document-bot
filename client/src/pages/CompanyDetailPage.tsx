import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Avatar, Icon, NameBlock } from '../lib/ui';
import { Loading, SelectAvatar, SelectAll } from '../components/Common';
import { EditCompanyModal } from '../components/EditCompanyModal';
import { EditDriverModal } from '../components/EditDriverModal';
import { BulkGroupMessageModal } from '../components/BulkGroupMessageModal';
import { useSelection } from '../lib/useSelection';
import { driverDisplay, driverImages, groupDisplay, imageSrc, fmtDate } from '../lib/helpers';
import type { Company, Driver, TelegramGroup } from '../types';

export default function CompanyDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [busy, setBusy] = useState(false);
  const gsel = useSelection<number>();

  async function load() {
    try {
      const [detail, g, companies] = await Promise.all([
        api.get<{ company: Company; drivers: Driver[] }>(`/companies/${id}/drivers`),
        api.get<TelegramGroup[]>('/groups'),
        api.get<Company[]>('/companies'),
      ]);
      setCompany(detail.company);
      setDrivers(detail.drivers || []);
      setGroups(g);
      setAllCompanies(companies);
      setNotFound(false);
      gsel.clear();
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [id]);

  const cgroups = useMemo(() => groups.filter((g) => g.company_id === id), [groups, id]);
  const members = useMemo(() => cgroups.reduce((s, g) => s + (g.member_count || 0), 0), [cgroups]);
  const allGroupsSelected = cgroups.length > 0 && cgroups.every((g) => gsel.isSelected(g.group_id));

  if (loading) return <Loading />;

  if (notFound || !company) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Icon name="building" className="" /></div>
        <div className="empty-title">Company not found</div>
        <div className="empty-text">It may have been deleted.</div>
        <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('/companies')}>
          <Icon name="back" /> Back to Companies
        </button>
      </div>
    );
  }

  async function detachSelected() {
    if (!confirm(`Remove ${gsel.size} group(s) from ${company!.name}?`)) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const gid of gsel.ids) { try { await api.put(`/groups/${gid}`, { company_id: null }); ok++; } catch { fail++; } }
    setBusy(false);
    toast(`Removed ${ok}${fail ? `, ${fail} failed` : ''}`);
    load();
  }

  return (
    <>
      <button className="back-link" onClick={() => navigate('/companies')}>
        <Icon name="back" className="" /> Companies
      </button>

      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div className="detail-avatar"><Avatar name={company.name} /></div>
          <div>
            <h2>{company.name}</h2>
            <p>Created {fmtDate(company.created_at)}</p>
          </div>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => setEditing(true)}><Icon name="edit" /> Edit Company</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card accent"><div className="stat-label">Drivers</div><div className="stat-num">{drivers.length}</div></div>
        <div className="stat-card green"><div className="stat-label">Groups</div><div className="stat-num">{cgroups.length}</div></div>
        <div className="stat-card orange"><div className="stat-label">Members</div><div className="stat-num">{members}</div></div>
      </div>

      {/* ── 50 / 50: Groups (selectable + message) | Drivers ── */}
      <div className="split-2">
        {/* Groups */}
        <div className="panel split-panel">
          <div className="panel-title">
            <Icon name="groups" className="" /> Groups <span className="title-count">{cgroups.length}</span>
            {cgroups.length > 0 && <SelectAll checked={allGroupsSelected} onChange={() => gsel.toggleAll(cgroups.map((g) => g.group_id))} />}
          </div>

          {gsel.size > 0 && (
            <div className="selection-bar inline">
              <span className="sel-count"><Icon name="check" className="" /> {gsel.size} selected</span>
              <div className="sel-actions">
                <button className="btn btn-primary" disabled={busy} onClick={() => setMessaging(true)}><Icon name="send" /> Message</button>
                <button className="btn btn-danger" disabled={busy} onClick={detachSelected}><Icon name="link" /> Detach</button>
              </div>
              <button className="toolbar-btn sel-clear" onClick={gsel.clear}><Icon name="x" className="" /> Clear</button>
            </div>
          )}

          {cgroups.length === 0 ? (
            <p className="side-hint" style={{ margin: 0 }}>No groups attached yet. Open the <strong>Groups</strong> page → Edit a group → pick <strong>{company.name}</strong>.</p>
          ) : (
            <div className="mini-list">
              {cgroups.map((g) => (
                <div className={`mini-row clickable ${gsel.isSelected(g.group_id) ? 'selected' : ''}`} key={g.group_id} onClick={() => gsel.toggle(g.group_id)}>
                  <SelectAvatar name={groupDisplay(g)} selected={gsel.isSelected(g.group_id)} onToggle={() => gsel.toggle(g.group_id)} />
                  <div className="mini-main">
                    <NameBlock display={groupDisplay(g)} original={g.group_name} />
                    <div className="list-sub"><span className={`dot-status ${g.is_active ? 'on' : 'off'}`} />{g.is_active ? 'Active' : 'Inactive'} · <Icon name="users" className="" /> {g.member_count || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drivers */}
        <div className="panel split-panel">
          <div className="panel-title"><Icon name="drivers" className="" /> Drivers <span className="title-count">{drivers.length}</span></div>
          {drivers.length === 0 ? (
            <p className="side-hint" style={{ margin: 0 }}>No drivers assigned to this company yet. Assign them on approval or via <strong>Edit Driver</strong>.</p>
          ) : (
            <div className="mini-list">
              {drivers.map((d) => {
                const imgs = driverImages(d).slice(0, 3);
                return (
                  <div className="mini-row" key={d.id}>
                    <Avatar name={driverDisplay(d)} variant="green" />
                    <div className="mini-main">
                      <NameBlock display={driverDisplay(d)} original={d.name} />
                      <div className="list-sub">
                        {d.truck_number ? <><Icon name="truck" className="" /> {d.truck_number} · </> : null}
                        <Icon name="image" className="" /> {d.images?.length || 0}
                      </div>
                    </div>
                    {imgs.length > 0 && (
                      <div className="photo-strip mini-strip">
                        {imgs.map((img) => <img key={img.id} src={imageSrc(img)} loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />)}
                      </div>
                    )}
                    <button className="btn btn-secondary btn-icon" title="Edit driver" onClick={() => setEditingDriver(d)}><Icon name="edit" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editing && <EditCompanyModal company={company} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {editingDriver && <EditDriverModal driver={editingDriver} companies={allCompanies} onClose={() => setEditingDriver(null)} onSaved={() => { setEditingDriver(null); load(); }} />}
      {messaging && <BulkGroupMessageModal groupIds={gsel.ids} onClose={() => setMessaging(false)} onSent={() => { setMessaging(false); gsel.clear(); }} />}
    </>
  );
}
