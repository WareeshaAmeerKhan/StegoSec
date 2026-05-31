import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Lock, Unlock } from 'lucide-react';

/**
 * StealthMode – Plausible Deniability UI
 *
 * When active, the entire app is replaced by a convincing photo gallery.
 * Secret trigger: Triple-click on the "logo" area (top-left of gallery) OR
 * keyboard shortcut Ctrl+Shift+S
 *
 * This demonstrates the "plausible deniability UI" security concept.
 */
export default function StealthMode({ children }) {
  const [stealth, setStealth] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState(null);

  // Keyboard shortcut
  useEffect(() => {
    const handler = e => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setStealth(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Triple-click handler
  const handleLogoClick = () => {
    setClickCount(c => {
      const next = c + 1;
      if (next >= 3) {
        setStealth(s => !s);
        clearTimeout(clickTimer);
        setClickTimer(null);
        return 0;
      }
      // Reset after 800ms
      if (clickTimer) clearTimeout(clickTimer);
      const t = setTimeout(() => setClickCount(0), 800);
      setClickTimer(t);
      return next;
    });
  };

  if (!stealth) return <>{children}</>;

  // ── Stealth: fake photo gallery ──────────────────────────────────────────
  const fakePhotos = [
    { color: '#1a1a2e', label: 'Vacation 2024' },
    { color: '#16213e', label: 'Family BBQ' },
    { color: '#0f3460', label: 'Beach Day' },
    { color: '#533483', label: 'Mountain Hike' },
    { color: '#1b262c', label: 'City Nights' },
    { color: '#2d4059', label: 'Autumn Walk' },
    { color: '#1a3c40', label: 'Lake View' },
    { color: '#3b1f2b', label: 'Sunset Garden' },
    { color: '#2c3e50', label: 'Museum Trip' },
    { color: '#1a1a1a', label: 'Birthday Party' },
    { color: '#2e4057', label: 'Dog Park' },
    { color: '#1d3557', label: 'Coffee Morning' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#222', fontFamily: 'system-ui, sans-serif' }}>
      {/* Fake header */}
      <header style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
        {/* Triple-click here to reveal */}
        <div
          id="stealth-logo"
          onClick={handleLogoClick}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default', userSelect: 'none' }}
        >
          <div style={{ width: 28, height: 28, background: '#4a90d9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 14 }}>📷</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: '1rem', color: '#333' }}>My Photos</span>
        </div>

        <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: '#555' }}>
          <span style={{ cursor: 'pointer', color: '#4a90d9', fontWeight: 500 }}>Library</span>
          <span style={{ cursor: 'pointer' }}>Albums</span>
          <span style={{ cursor: 'pointer' }}>Shared</span>
          <span style={{ cursor: 'pointer' }}>Search</span>
        </nav>
      </header>

      {/* Fake photo grid */}
      <main style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1.1rem', color: '#111' }}>Recent – {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>12 photos</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
          {fakePhotos.map((p, i) => (
            <div
              key={i}
              style={{
                background: p.color,
                aspectRatio: '1',
                borderRadius: 4,
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.querySelector('.overlay').style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.querySelector('.overlay').style.opacity = '0'; }}
            >
              <div className="overlay" style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'flex-end', padding: '0.5rem',
                opacity: 0, transition: 'opacity 0.2s',
              }}>
                <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 500 }}>{p.label}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Subtle hint */}
      <div style={{ position: 'fixed', bottom: 10, right: 12, fontSize: '10px', color: '#ccc', userSelect: 'none' }}>
        Press Ctrl+Shift+S or triple-click logo
      </div>
    </div>
  );
}
