import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, MessageSquare, Activity, User, LogOut, FileText, Zap, Search, Cpu, Camera } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="nav-container">
        {/* Logo */}
        <Link to={user?.role === 'admin' ? '/audit' : '/chat'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Shield size={22} color="var(--primary)" />
          <span
            className="mono font-bold"
            style={{ color: 'var(--primary)', fontSize: '1rem', letterSpacing: '0.12em', textShadow: '0 0 8px rgba(0,255,65,0.4)' }}
          >
            STEGO_SEC
          </span>
        </Link>

        {/* Nav links */}
        <nav className="nav-links">
          {user?.role === 'admin' ? (
            <>
              <NavLink to="/audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><FileText size={13} />AUDIT</span>
              </NavLink>
              <NavLink to="/forensics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Search size={13} />LEAK DETECTOR</span>
              </NavLink>
              <NavLink to="/cryptanalysis" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Cpu size={13} />CRYPTANALYSIS</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><MessageSquare size={13} />COMM</span>
              </NavLink>
              <NavLink to="/simulator" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Camera size={13} />IMAGING LAB</span>
              </NavLink>
              <NavLink to="/steganalysis" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Activity size={13} />STEGANALYSIS</span>
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><User size={13} />PROFILE</span>
              </NavLink>
            </>
          )}

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border)' }}>
              <span className="mono text-xs text-muted">{user.id}</span>
              <button onClick={handleLogout} className="btn btn-ghost btn-icon" title="Logout">
                <LogOut size={15} />
              </button>
            </div>
          )}
        </nav>
      </header>

      <main style={{ flex: 1 }} className="animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
