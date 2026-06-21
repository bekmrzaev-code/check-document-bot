import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Avatar, Icon, NameBlock } from '../lib/ui';
import { Loading } from '../components/Common';
import { EditCompanyModal } from '../components/EditCompanyModal';
import { EditDriverModal } from '../components/EditDriverModal';
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
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [id]);

  const cgroups = useMemo(() => groups.filter((g) => g.company_id === id), [groups, id]);
  const members = useMemo(() => cgroups.reduce((s, g) => s + (g.member_count || 0), 0), [cgroups]);

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

  function driverCard(d: Driver) {
    const imgs = driverImages(d).slice(0, 6);
    return (
      <div className="card" key={d.id}>
        <div className="card-top">
          <Avatar name={driverDisplay(d)} variant="green" />
          <div className="card-info"><NameBlock display={driverDisplay(d)} original={d.name} hint /></div>
          <span className="badge badge-approved">Approved</span>
        </div>
        <div className="card-body">
          <div className="card-meta">
            {d.truck_number && <span className="meta-chip"><Icon name="truck" className="" /> {d.truck_number}</span>}
            <span className="meta-chip"><Icon name="image" className="" /> {d.images?.length || 0}</span>
          </div>
          {imgs.length > 0 && (
            <div className="card-photos">
              {imgs.map((img) => <img key={img.id} src={imageSrc(img)} loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />)}
            </div>
          )}
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => setEditingDriver(d)}><Icon name="edit" /> Edit Driver</button>
          </div>
        </div>
      </div>
    );
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

      {/* ── Groups attached to this company ── */}
      <div className="panel">
        <div className="panel-title"><Icon name="groups" className="" /> Groups <span className="title-count">{cgroups.length}</span></div>
        {cgroups.length === 0 ? (
          <p className="side-hint" style={{ margin: 0 }}>No groups attached yet. Open the <strong>Groups</strong> page → Edit a group → pick <strong>{company.name}</strong>.</p>
        ) : (
          <div className="driver-mini-list">
            {cgroups.map((g) => (
              <div className="driver-mini-row" key={g.group_id} onClick={() => navigate('/groups')} style={{ cursor: 'pointer' }}>
                <Avatar name={groupDisplay(g)} />
                <span className="driver-mini-name"><NameBlock display={groupDisplay(g)} original={g.group_name} /></span>
                <span className="driver-mini-meta">
                  <span className={`dot-status ${g.is_active ? 'on' : 'off'}`} />{g.is_active ? 'Active' : 'Inactive'} · <Icon name="users" className="" /> {g.member_count || 0}
                </span>
                <span className="list-count-badge"><Icon name="hash" className="" /> {g.group_id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Drivers in this company ── */}
      <div className="panel">
        <div className="panel-title"><Icon name="drivers" className="" /> Drivers <span className="title-count">{drivers.length}</span></div>
        {drivers.length === 0 ? (
          <p className="side-hint" style={{ margin: 0 }}>No drivers assigned to this company yet. Assign them on approval or via <strong>Edit Driver</strong>.</p>
        ) : (
          <div className="grid">{drivers.map(driverCard)}</div>
        )}
      </div>

      {editing && <EditCompanyModal company={company} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {editingDriver && <EditDriverModal driver={editingDriver} companies={allCompanies} onClose={() => setEditingDriver(null)} onSaved={() => { setEditingDriver(null); load(); }} />}
    </>
  );
}
