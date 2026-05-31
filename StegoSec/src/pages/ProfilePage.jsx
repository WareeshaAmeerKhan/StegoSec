import React, { useState, useEffect } from 'react';
import { useAuth }    from '../contexts/AuthContext';
import { useFriends } from '../contexts/FriendContext';
import { useAudit }   from '../contexts/AuditContext';
import { keyToHex }   from '../utils/crypto';
import { User, Key, Eye, EyeOff, Search, UserPlus, Check, Clock, Shield, BarChart2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, masterKey, masterKeyHex, searchUsers } = useAuth();
  const { friends, sendFriendRequest, acceptFriendRequest } = useFriends();
  const { logEvent }                                   = useAudit();

  const [keyHex,    setKeyHex]    = useState('');
  const [showKey,   setShowKey]   = useState(false);
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [reqError,  setReqError]  = useState('');

  // Use master key hex from context
  useEffect(() => {
    if (showKey && masterKeyHex && !keyHex) {
      setKeyHex(masterKeyHex);
      logEvent('PROFILE', 'Master Key revealed', true, user.id);
    }
  }, [showKey, masterKeyHex, keyHex, logEvent, user.id]);

  // Stats from messages
  const allMsgs     = useFriends().messages;
  const imagesSent  = allMsgs.filter(m => m.senderId === user.id).length;
  const imagesRecvd = allMsgs.filter(m => m.receiverId === user.id).length;

  const pending  = friends.filter(f => f.friendId === user.id && f.status === 'pending');
  const accepted = friends.filter(f => f.status === 'accepted');

  const handleSearch = async e => {
    e.preventDefault();
    if (!query.trim()) return;
    const r = await searchUsers(query.trim());
    setResults(r);
  };

  const handleSendRequest = async (friendId) => {
    setReqError('');
    try {
      await sendFriendRequest(friendId);
      setResults(prev => prev.filter(u => u.id !== friendId));
    } catch (err) { setReqError(err.message); }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={user?.role === 'admin' ? { maxWidth: 600, margin: '0 auto' } : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* ── Identity Card ── */}
        <div className="glass-card">
          <h2 className="flex items-center gap-2 mb-6 text-primary m-0" style={{ fontSize: '1rem', letterSpacing: '0.1em' }}>
            <User size={18} /> AGENT IDENTITY
          </h2>

          <div className="mb-5">
            <label className="input-label">Agent ID</label>
            <div className="mono surface p-3 rounded" style={{ color: '#fff', fontSize: '1rem' }}>{user.id}</div>
          </div>

          <div className="mb-5">
            <label className="input-label flex justify-between">
              Your Security Key
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '0 0.25rem', fontFamily: 'inherit', fontSize: '0.7rem' }}
                onClick={() => setShowKey(s => !s)}
              >
                {showKey ? <><EyeOff size={13} /> HIDE</> : <><Eye size={13} /> SHOW</>}
              </button>
            </label>
            <div
              className="mono surface p-3 rounded"
              style={{
                wordBreak: 'break-all',
                fontSize: '0.75rem',
                letterSpacing: '0.04em',
                color: showKey ? 'var(--primary)' : 'transparent',
                textShadow: showKey ? 'none' : '0 0 8px var(--primary)',
                background: '#020202',
                border: `1px solid ${showKey ? 'rgba(0,255,65,0.3)' : 'var(--border)'}`,
                transition: 'all 0.3s',
                minHeight: '4rem',
                lineHeight: 2,
              }}
            >
              {showKey ? (keyHex || 'Log in with password to view key') : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
            </div>
            {showKey && (
              <p className="text-xs text-accent mt-1 flex items-center gap-1">
                <Shield size={11} /> Keep this private. Never share with anyone.
              </p>
            )}
          </div>

          {/* Stats - User Only */}
          {user?.role !== 'admin' && (
            <div className="border-t pt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Messages Sent',     value: imagesSent },
                { label: 'Messages Received', value: imagesRecvd },
                { label: 'Contacts',         value: accepted.length },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="mono" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{s.value}</div>
                  <div className="text-xs text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Network Panel - User Only ── */}
        {user?.role !== 'admin' && (
          <div className="glass-card flex flex-col gap-4">
            <h2 className="flex items-center gap-2 mb-2 text-primary m-0" style={{ fontSize: '1rem', letterSpacing: '0.1em' }}>
              <Search size={18} /> SECURE NETWORK
            </h2>

            {reqError && <div className="alert alert-error">{reqError}</div>}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                id="profile-search"
                type="text"
                className="input-field flex-1"
                placeholder="Search agents…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ margin: 0 }}
              />
              <button type="submit" className="btn btn-primary btn-icon"><Search size={16} /></button>
            </form>

            {results.length > 0 && (
              <div className="surface rounded p-3">
                <p className="text-xs text-muted mb-2 uppercase tracking-widest">Search Results</p>
                {results.map(r => {
                  const alreadyFriend = friends.some(f => f.otherId === r.id);
                  return (
                    <div key={r.id} className="flex justify-between items-center py-2 border-b">
                      <span className="mono text-sm">{r.id}</span>
                      {alreadyFriend
                        ? <span className="badge badge-muted">Connected</span>
                        : <button className="btn btn-primary btn-sm" onClick={() => handleSendRequest(r.id)}>
                            <UserPlus size={13} /> ADD
                          </button>
                      }
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pending requests */}
            {pending.length > 0 && (
              <div>
                <p className="text-xs text-warning uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Clock size={12} /> Incoming Requests ({pending.length})
                </p>
                {pending.map(r => (
                  <div key={r.id} className="flex justify-between items-center surface rounded p-3 mb-2">
                    <span className="mono text-sm">{r.otherId}</span>
                    <button
                      id={`accept-${r.otherId}`}
                      className="btn btn-primary btn-sm"
                      onClick={() => acceptFriendRequest(r.userId)}
                    >
                      <Check size={13} /> ACCEPT & DERIVE KEY
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Active connections */}
            <div>
              <p className="text-xs text-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                <Shield size={12} /> Active Secure Links ({accepted.length})
              </p>
              {accepted.length === 0
                ? <p className="text-sm text-muted">No secure links yet. Search and add an operative above.</p>
                : accepted.map(f => (
                    <div key={f.id} className="flex justify-between items-center surface rounded p-3 mb-2">
                      <span className="mono text-sm" style={{ color: 'var(--text)' }}>{f.otherId}</span>
                      <span className="badge badge-success flex items-center gap-1">
                        <Key size={10} /> HKDF SESSION KEY
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
