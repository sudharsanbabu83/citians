import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/departments', label: 'Departments' },
  { to: '/students', label: 'Students' },
  { to: '/hods', label: 'HODs' },
  { to: '/competitions-admins', label: 'Competitions Admins' },
  { to: '/events', label: 'Events' },
  { to: '/canvas-moderation', label: 'Canvas Moderation' },
  { to: '/tech-pulse', label: 'Tech Pulse' },
  { to: '/daily-sparks', label: 'Daily Spark' },
  { to: '/opening-spotlight', label: 'Opening Spotlight' },
  { to: '/audit-logs', label: 'Audit Logs' },
  { to: '/verification-logs', label: 'Verification Logs' },
  { to: '/health', label: 'System Health' },
  { to: '/active-users', label: 'Active Users' },
];

export function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="logo">Citians</div>
        <nav className="admin-nav">
          {[...navItems, ...(profile?.role === 'SUPER_ADMIN' ? [{ to: '/super-admin', label: 'Super Admin Control' }] : [])].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span>{profile?.name ?? 'Admin'}</span>
          <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
            Sign out
          </button>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
