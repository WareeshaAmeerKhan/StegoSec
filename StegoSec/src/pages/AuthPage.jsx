import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { deriveMasterKey, generateSalt, keyToHex } from '../utils/crypto';
import { Shield, Terminal, Copy, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [mode,     setMode]     = useState('login');   // 'login' | 'signup'
  const [userId,   setUserId]   = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // signup success state
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!userId.trim() || !password.trim()) { setError('All fields required.'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        // Must fetch the user's stored salt to re-derive the master key
        const { getFromStore } = await import('../services/db');
        const u = await getFromStore('users', userId.trim());
        if (!u) throw new Error('User not found.');
        const salt = new Uint8Array(u.masterKeySalt);
        const mk   = await deriveMasterKey(password, userId.trim(), salt);
        const loggedInUser = await login(userId.trim(), password, mk);
        if (loggedInUser.role === 'admin') {
          navigate('/audit');
        } else {
          navigate('/chat');
        }
      } else {
        const salt = generateSalt(16);
        const mk   = await deriveMasterKey(password, userId.trim(), salt);
        await signup(userId.trim(), password, mk, salt);
        const hex  = await keyToHex(mk);
        setNewKey(hex);   // show key before navigating
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Master Key reveal screen (after signup) ───────────────────────────────
  if (newKey) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="glass-card animate-fade-in" style={{ maxWidth: 560, width: '90%' }}>
          <div className="flex items-center gap-3 mb-4">
            <Shield size={32} color="var(--primary)" />
            <h2 className="m-0 text-xl" style={{ color: 'var(--primary)' }}>MASTER KEY GENERATED</h2>
          </div>

          <div className="alert alert-warning mb-4">
            <AlertCircle size={18} />
            <span>
              This is your <strong>one-time Master Key</strong>. Save it now — it is <strong>never stored</strong> on disk.
              Losing it means losing access to all past messages.
            </span>
          </div>

          <p className="text-muted text-sm mb-3">
            Derived via <strong className="text-primary">PBKDF2-SHA256</strong> (390,000 iterations) from your
            passphrase + username. All shared session keys are further derived from this root via <strong className="text-primary">HKDF</strong>.
          </p>

          <div
            className="mono p-4 rounded mb-4 select-all"
            style={{
              background: '#040404', border: '1px solid var(--primary)',
              color: 'var(--primary)', fontSize: '0.78rem', wordBreak: 'break-all',
              lineHeight: 1.8,
            }}
          >
            {newKey}
          </div>

          <div className="flex gap-3 mb-6">
            <button className="btn btn-primary flex-1" onClick={copyKey}>
              {copied ? <><CheckCircle size={16} /> COPIED</> : <><Copy size={16} /> COPY KEY</>}
            </button>
            <button className="btn btn-ghost flex-1" onClick={() => navigate('/chat')}>
              PROCEED TO PLATFORM →
            </button>
          </div>

          {/* Key Derivation Diagram */}
          <div className="surface p-4 rounded">
            <h4 className="text-sm text-muted uppercase tracking-widest mb-3">Key Derivation Chain</h4>
            <div className="mono text-sm" style={{ color: '#555', lineHeight: 2.2 }}>
              <div><span className="text-primary">Password + UserID</span></div>
              <div style={{ paddingLeft: '1rem', color: '#333' }}>↓ PBKDF2 · SHA-256 · 390k iterations</div>
              <div><span style={{ color: '#00ccff' }}>Master Key (256-bit)</span></div>
              <div style={{ paddingLeft: '1rem', color: '#333' }}>↓ HKDF · per-friend label</div>
              <div className="flex gap-4 flex-wrap">
                <span style={{ color: '#aaa' }}>Session(Alice)</span>
                <span style={{ color: '#aaa' }}>Session(Bob)</span>
                <span style={{ color: '#aaa' }}>Session(Carol)</span>
                <span style={{ color: '#555' }}>…</span>
              </div>
              <div style={{ paddingLeft: '1rem', color: '#333' }}>↓ AES-256-GCM</div>
              <div style={{ color: '#888' }}>Encrypted Stego Images</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Login / Signup form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center hero-grid" style={{ background: 'var(--bg)' }}>
      <div className="glass-card animate-fade-in" style={{ maxWidth: 420, width: '90%' }}>
        {/* Header */}
        <div className="text-center mb-6">
          <Terminal size={40} color="var(--primary)" className="mb-2" style={{ margin: '0 auto 0.5rem' }} />
          <h1 className="gradient-text m-0" style={{ fontSize: '1.5rem', letterSpacing: '0.1em' }}>STEGO_SEC</h1>
          <p className="text-muted text-sm mt-1">
            {mode === 'login' ? 'Authenticate to access secure comm-link' : 'Register a new agent identity'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Agent ID</label>
            <input
              id="auth-userid"
              type="text"
              className="input-field"
              placeholder="agent_codename"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Passphrase</label>
            <input
              id="auth-password"
              type={showPass ? 'text' : 'password'}
              className="input-field"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              style={{ position: 'absolute', right: '0.75rem', top: '2.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            id="auth-submit"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? 'PROCESSING…' : (mode === 'login' ? 'AUTHENTICATE' : 'CREATE IDENTITY')}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            className="btn btn-ghost text-sm"
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
          >
            {mode === 'login' ? 'Create new agent identity →' : '← Back to login'}
          </button>
        </div>

        {mode === 'signup' && (
          <div className="alert alert-info mt-4" style={{ fontSize: '0.78rem' }}>
            <Shield size={14} />
            <span>
              A unique 256-bit Master Key will be generated via PBKDF2 and shown to you <strong>once</strong>.
              Keep it safe — it unlocks all your encrypted conversations.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
