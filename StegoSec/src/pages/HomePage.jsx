import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, MessageSquare, Activity, Zap, EyeOff, Lock, Network, FileText } from 'lucide-react';

const FEATURES = [
  {
    icon: MessageSquare,
    color: '#00ff41',
    title: 'Steganographic Chat',
    desc: 'Messages are hidden inside carrier images using LSB steganography. To an observer, it just looks like photo sharing.',
    concept: 'LSB Steganography',
  },
  {
    icon: Lock,
    color: '#00ccff',
    title: 'Master Key System',
    desc: 'One PBKDF2-derived Master Key spawns all per-friend Session Keys via HKDF. Zero manual key entry per conversation.',
    concept: 'PBKDF2 + HKDF',
  },
  {
    icon: Zap,
    color: '#ff003c',
    title: 'Attack Simulator',
    desc: 'Webcam covert capture with forensic watermarking, plus a live brute-force demo that proves AES-256 is uncrackable.',
    concept: '2²⁵⁶ Keyspace',
  },
  {
    icon: Activity,
    color: '#ffaa00',
    title: 'Steganalysis Panel',
    desc: 'Chi-square statistical testing, LSB bit-plane visualisation, and histogram analysis to detect hidden payloads.',
    concept: 'Chi-Square PoV Test',
  },
  {
    icon: EyeOff,
    color: '#aa00ff',
    title: 'Deniable Encryption',
    desc: 'Embed a decoy message alongside the real one. Wrong key → plausible decoy. Right key → secret payload.',
    concept: 'Plausible Deniability',
  },
  {
    icon: Network,
    color: '#00ff99',
    title: 'Network Intercept Demo',
    desc: 'Animated Wireshark-style visualiser shows how intercepted packets reveal nothing — just a normal PNG image.',
    concept: 'Traffic Analysis Resistance',
  },
];

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── Navbar ────────────────────────────────── */}
      <header className="nav-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Shield size={22} color="var(--primary)" />
          <span className="mono font-bold" style={{ color: 'var(--primary)', letterSpacing: '0.12em', fontSize: '1rem', textShadow: '0 0 8px rgba(0,255,65,0.4)' }}>
            STEGO_SEC
          </span>
        </div>
        <nav className="nav-links">
          <Link to="/auth?mode=login"  className="btn btn-ghost btn-sm">LOGIN</Link>
          <Link to="/auth?mode=signup" className="btn btn-primary btn-sm">GET STARTED</Link>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────── */}
      <section
        className="hero-grid"
        style={{
          minHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '5rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(0,255,65,0.08) 0%, transparent 70%)',
        }} />

        {/* Scan line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '1px',
          background: 'rgba(0,255,65,0.15)',
          animation: 'scanline 6s linear infinite',
        }} />

        <div className="animate-float" style={{ marginBottom: '1.5rem' }}>
          <Shield size={72} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,65,0.5))' }} />
        </div>

        <h1
          className="gradient-text animate-glow mono"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '1rem' }}
        >
          STEGO_SEC
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: 620, marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
          Military-grade steganographic secure messaging.
          <br />
          <span style={{ color: '#555' }}>AES-256-GCM · PBKDF2 · HKDF · LSB Steganography · Deniable Encryption</span>
        </p>

        <p className="mono text-sm" style={{ color: 'var(--primary)', marginBottom: '3rem', opacity: 0.7 }}>
          // Your secrets hide in plain sight
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          <Link to="/auth" className="btn btn-primary btn-lg" id="cta-signup">
            <Shield size={18} /> INITIALIZE AGENT
          </Link>
          <a href="#features" className="btn btn-ghost btn-lg">
            VIEW CAPABILITIES ↓
          </a>
        </div>
      </section>

      {/* ── Features ────────────────────────────────── */}
      <section id="features" style={{ padding: '6rem 2rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="text-center mb-8">
            <p className="mono text-sm text-muted mb-2">// SYSTEM_CAPABILITIES</p>
            <h2 style={{ fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.06em' }}>
              Every Feature, <span className="gradient-text">Security-First</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="glass-panel"
                style={{
                  padding: '1.75rem',
                  transition: 'transform 0.25s, box-shadow 0.25s',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform  = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow  = `0 8px 32px ${f.color}22`;
                  e.currentTarget.style.borderColor = f.color + '55';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform  = '';
                  e.currentTarget.style.boxShadow  = '';
                  e.currentTarget.style.borderColor = '';
                }}
              >
                <f.icon size={36} color={f.color} style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1rem', letterSpacing: '0.06em', marginBottom: '0.5rem', color: '#fff' }}>{f.title}</h3>
                <p className="text-sm text-muted mb-3" style={{ lineHeight: 1.7 }}>{f.desc}</p>
                <span className="badge badge-muted mono">{f.concept}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────── */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', background: 'var(--bg)' }}>
        <h2 style={{ fontSize: '1.75rem', color: 'var(--text)', marginBottom: '1rem' }}>
          Ready to go <span className="gradient-text">dark</span>?
        </h2>
        <p className="text-muted mb-6">Create an agent identity in seconds. No server. No tracking. Everything client-side.</p>
        <Link to="/auth" className="btn btn-primary btn-lg" id="cta-bottom">
          <Shield size={18} /> SIGN UP FREE
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem 2rem', textAlign: 'center' }}>
        <p className="mono text-xs text-dim">
          STEGO_SEC v2.0 · All cryptography runs in your browser via Web Crypto API · No data ever leaves your device
        </p>
      </footer>
    </div>
  );
}
