import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';
import { ViewToggle, Loading, EmptyState, SelectAvatar, SelectAll, SelectionBar } from '../components/Common';
import { Pagination, paginate } from '../components/Pagination';
import { useSelection } from '../lib/useSelection';
import { fmtDate } from '../lib/helpers';
import type { Company, Driver, TelegramGroup, ViewMode } from '../types';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const sel = useSelection<string>();

  async function load() {
    try {
      const [c, drivers, groups] = await Promise.all([
        api.get<Company[]>('/companies'),
        api.get<Driver[]>('/drivers'),
        api.get<TelegramGroup[]>('/groups'),
      ]);
      setCompanies(c);
      const dmap: Record<string, number> = {};
      drivers.forEach((d) => { if (d.company_id) dmap[d.company_id] = (dmap[d.company_id] || 0) + 1; });
      setCounts(dmap);
      const gmap: Record<string, number> = {};
      groups.forEach((g) => { if (g.company_id) gmap[g.company_id] = (gmap[g.company_id] || 0) + 1; });
      setGroupCounts(gmap);
      sel.clear();
    } catch {
      toast('Failed to load companies');
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
  const allSelected = pg.slice.length > 0 && pg.slice.every((c) => sel.isSelected(c.id));

  async function bulkDelete() {
    if (!confirm(`Delete ${sel.size} selected compan${sel.size !== 1 ? 'ies' : 'y'}? Companies that still have drivers can't be deleted.`)) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const id of sel.ids) { try { await api.del(`/companies/${id}`); ok++; } catch { fail++; } }
    setBusy(false);
    toast(`Deleted ${ok}${fail ? `, ${fail} skipped (has drivers)` : ''}`);
    load();
  }

  async function createCompany() {
    if (!newName.trim()) { toast('Enter a company name'); return; }
    try {
      await api.post('/companies', { name: newName.trim() });
      setNewName('');
      toast('Company added');
      load();
    } catch (e: any) {
      toast(e?.message || 'Failed to add');
    }
  }

  function open(c: Company) { navigate(`/companies/${c.id}`); }

  if (loading) return <Loading />;

  return (
    <>
      <div className="section-header"><div><h2>Companies</h2><p>Organize drivers and groups by company</p></div></div>

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
        <span className="search-wrap">
          <Icon name="search" className="search-ico" />
          <input className="list-search has-ico" placeholder="Search companies…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </span>
        {pg.slice.length > 0 && <SelectAll checked={allSelected} onChange={() => sel.toggleAll(pg.slice.map((c) => c.id))} />}
        <ViewToggle view={view} onChange={setView} />
      </div>

      <SelectionBar count={sel.size} onClear={sel.clear}>
        <button className="btn btn-danger" disabled={busy} onClick={bulkDelete}><Icon name="trash" /> Delete</button>
      </SelectionBar>

      {filtered.length === 0 ? (
        <EmptyState icon="building" title={companies.length ? 'No matches' : 'No companies yet'} text={companies.length ? 'Try a different filter' : 'Add your first company above'} />
      ) : view === 'grid' ? (
        <>
          <div className="grid">
            {pg.slice.map((c) => (
              <div className={`card card-clickable ${sel.isSelected(c.id) ? 'selected' : ''}`} key={c.id} onClick={() => open(c)}>
                <div className="card-top">
                  <SelectAvatar name={c.name} selected={sel.isSelected(c.id)} onToggle={() => sel.toggle(c.id)} />
                  <div className="card-info"><div className="entity-name">{c.name}</div><div className="entity-original">Created {fmtDate(c.created_at)}</div></div>
                  <span className="list-chevron"><Icon name="chevron" className="" /></span>
                </div>
                <div className="card-body">
                  <div className="card-meta">
                    <span className="meta-chip"><Icon name="drivers" className="" /> {counts[c.id] || 0} driver{(counts[c.id] || 0) !== 1 ? 's' : ''}</span>
                    <span className="meta-chip"><Icon name="groups" className="" /> {groupCounts[c.id] || 0} group{(groupCounts[c.id] || 0) !== 1 ? 's' : ''}</span>
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
            {pg.slice.map((c, i) => (
              <div className={`list-row ${sel.isSelected(c.id) ? 'selected' : ''}`} key={c.id} onClick={() => open(c)}>
                <SelectAvatar name={c.name} selected={sel.isSelected(c.id)} onToggle={() => sel.toggle(c.id)} />
                <div className="list-main">
                  <div className="entity-name">{c.name}</div>
                  <div className="list-sub">
                    <Icon name="drivers" className="" /> {counts[c.id] || 0} driver{(counts[c.id] || 0) !== 1 ? 's' : ''}
                    {'  ·  '}<Icon name="groups" className="" /> {groupCounts[c.id] || 0} group{(groupCounts[c.id] || 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="list-right">
                  <span className="list-chevron"><Icon name="chevron" className="" /></span>
                </div>
              </div>
            ))}
          </div>
          <Pagination {...pg} onPage={setPage} />
        </>
      )}
    </>
  );
}
