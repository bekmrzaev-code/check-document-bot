import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Icon } from '../lib/ui';
import type { PendingUpload } from '../types';

const NAV = [
  { to: '/', label: 'Pending Reviews', icon: 'pending', section: 'Main', end: true },
  { to: '/drivers', label: 'Drivers', icon: 'drivers', section: 'Main' },
  { to: '/companies', label: 'Companies', icon: 'companies', section: 'Main' },
  { to: '/groups', label: 'Groups', icon: 'groups', section: 'Telegram' },
  { to: '/settings', label: 'Settings', icon: 'settings', section: 'Telegram' },
];

const META: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Pending Reviews', sub: 'Review and approve driver applications' },
  '/drivers': { title: 'Approved Drivers', sub: 'Manage profiles and assignments' },
  '/companies': { title: 'Companies', sub: 'Organize drivers by company' },
  '/groups': { title: 'Telegram Groups', sub: 'Manage bot-connected groups' },
  '/settings': { title: 'Settings & Guide', sub: 'Configuration and how to use the dashboard' },
};

export default function Layout() {
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'no'>('loading');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/me')
      .then(() => setAuthState('ok'))
      .catch((e) => setAuthState(e instanceof ApiError && e.status === 401 ? 'no' : 'no'));
  }, []);

  useEffect(() => {
    if (authState !== 'ok') return;
    api.get<PendingUpload[]>('/uploads/pending')
      .then((d) => setPendingCount(d.length))
      .catch(() => {});
  }, [authState, location.pathname]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (authState === 'loading') {
    return <div className="center-screen"><div className="spinner" /></div>;
  }
  if (authState === 'no') {
    return <Navigate to="/login" replace />;
  }

  const meta = META[location.pathname] || { title: 'DriverFlow', sub: '' };

  async function logout() {
    if (!confirm('Sign out?')) return;
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    navigate('/login');
  }

  const sections = ['Main', 'Telegram'];

  return (
    <div className="app">
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon"><Icon name="truck" className="" /></div>
          <div>
            <div className="brand-text">DriverFlow</div>
            <div className="brand-sub">Admin Console</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map((sec) => (
            <div key={sec}>
              <div className="nav-section-label">{sec}</div>
              {NAV.filter((n) => n.section === sec).map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon"><Icon name={n.icon} className="" /></span>
                  {n.label}
                  {n.to === '/' && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={logout}>
            <span className="nav-icon"><Icon name="logout" className="" /></span> Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
          <div>
            <div className="page-title">{meta.title}</div>
            <div className="page-sub">{meta.sub}</div>
          </div>
          <div className="topbar-right">
            <div className="status-pill"><span className="status-dot" /> Bot Online</div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
