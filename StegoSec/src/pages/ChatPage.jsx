import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth }    from '../contexts/AuthContext';
import { useFriends } from '../contexts/FriendContext';
import { useAudit }   from '../contexts/AuditContext';
import { encryptWithKey, createDeniablePayload, decryptAuto } from '../utils/crypto';
import { embedPayload, extractPayload } from '../utils/steganography';
import {
  Lock, Send, Image as ImageIcon, Shield, Zap,
  AlertTriangle, Info, MessageSquare, Key, Flame, EyeOff,
} from 'lucide-react';

// ── Key Derivation Modal ───────────────────────────────────────────────────
function KeyDiagramModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-primary m-0 flex items-center gap-2"><Key size={20} /> How Your Security Works</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <p className="text-muted text-sm mb-4">
          Your security key unlocks all conversations. Each contact gets a unique channel—no manual key entry needed per message.
        </p>
        <div className="mono surface p-4 rounded" style={{ lineHeight: 2.4, fontSize: '0.82rem' }}>
          <div><span className="text-primary">Your Password + ID</span></div>
          <div style={{ paddingLeft: '1.5rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>↓ Converted to Security Key</div>
          <div><span style={{ color: '#00ccff' }}>Master Key (Your unique identifier)</span></div>
          <div style={{ paddingLeft: '1.5rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>↓ Generates private channel key per contact</div>
          <div className="flex gap-6 flex-wrap">
            {['Alice', 'Bob', 'Carol'].map(n => (
              <span key={n} style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '0.1rem 0.5rem', borderRadius: 3 }}>
                {n}'s channel
              </span>
            ))}
            <span style={{ color: '#333' }}>…</span>
          </div>
          <div style={{ paddingLeft: '1.5rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>↓ Encrypts your messages</div>
          <div style={{ color: '#555' }}>Hidden inside regular image files</div>
        </div>
        <div className="alert alert-info mt-4 text-sm">
          <Info size={15} />
          Each conversation is completely separate and private. Only you and your contact can read messages.
        </div>
      </div>
    </div>
  );
}

// ── Single Message Bubble ──────────────────────────────────────────────────
function MessageBubble({ msg, isMine, sharedKey, onBurn, logEvent, userId, masterKeyHex }) {
  const [decrypted, setDecrypted] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [burned, setBurnAnim] = useState(false);
  const [error, setError] = useState('');

  // 3-minute auto-hide
  useEffect(() => {
    let timer;
    if (decrypted && !decrypted.error) {
      timer = setTimeout(() => {
        setDecrypted(null);
      }, 180000); // 3 minutes
    }
    return () => clearTimeout(timer);
  }, [decrypted]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = msg.imageDataUrl;
    link.download = `stego_msg_${msg.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewMessage = () => {
    setShowKeyModal(true);
    setError('');
  };

  const handleDecrypt = useCallback(async () => {
    if (!keyInput.trim()) {
      setError('Please enter your security key');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const img = new Image();
      img.onload = async () => {
        try {
          const payload = extractPayload(img);
          // If key is wrong, we force decoy decryption if it's a deniable payload
          const isCorrect = keyInput.trim() === masterKeyHex;
          
          try {
            const result = await decryptAuto(payload, sharedKey, !isCorrect);
            setDecrypted(result);
            setShowKeyModal(false);
            setKeyInput('');
            logEvent('DECRYPT', `Message decrypted`, true, userId);

            if (msg.selfDestruct && !isMine && isCorrect) {
              setTimeout(async () => {
                setBurnAnim(true);
                setTimeout(() => onBurn(msg.id), 1500);
              }, 8000);
            }
          } catch (err) {
            setError(isCorrect ? 'Decryption failed. Data might be corrupted.' : 'Incorrect key and no decoy found.');
            logEvent('DECRYPT', `Failed: ${err.message}`, false, userId);
          }
        } catch (err) {
          setError('Unable to decrypt. Check your security key.');
          logEvent('DECRYPT', `Failed: ${err.message}`, false, userId);
        } finally {
          setBusy(false);
        }
      };
      img.onerror = () => {
        setBusy(false);
        setError('Error loading image');
      };
      img.src = msg.imageDataUrl;
    } catch (err) {
      setBusy(false);
      setError('Error: ' + err.message);
    }
  }, [msg, keyInput, sharedKey, isMine, onBurn, logEvent, userId]);

  const side = isMine ? 'sent' : 'received';

  if (msg.burned) {
    return null;
  }

  return (
    <>
      {/* Key Entry Modal */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => !busy && setShowKeyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-primary mb-4">Enter Your Security Key</h3>
            <p className="text-muted text-sm mb-4">This message is encrypted and requires your security key to view.</p>
            <input
              type="password"
              placeholder="Enter your security key..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleDecrypt()}
              className="input-field w-full mb-4"
              disabled={busy}
              autoFocus
            />
            {error && <p className="text-accent text-sm mb-4">⚠ {error}</p>}
            <div className="flex gap-2">
              <button
                className="btn btn-primary flex-1"
                onClick={handleDecrypt}
                disabled={busy || !keyInput.trim()}
              >
                {busy ? 'Decrypting…' : 'View Message'}
              </button>
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setShowKeyModal(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`message-bubble ${side}`} style={{ opacity: burned ? 0 : 1, transition: 'opacity 1.5s' }}>
        {/* Carrier image */}
        <div className={`bubble-image-wrap ${burned ? 'burning' : ''}`}>
          {msg.imageDataUrl
            ? <img src={msg.imageDataUrl} alt="message" style={{ maxWidth: 240 }} />
            : <div style={{ width: 180, height: 100, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={32} color="var(--accent)" />
              </div>
          }
          {!decrypted && (
            <button
              className="click-to-decrypt"
              onClick={handleViewMessage}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Lock size={11} /> VIEW MESSAGE
            </button>
          )}
          {msg.imageDataUrl && (
            <button
              className="download-btn"
              onClick={handleDownload}
              title="Download image for analysis"
              style={{
                position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)',
                border: 'none', borderRadius: '4px', padding: '4px', color: '#fff', cursor: 'pointer'
              }}
            >
              <ImageIcon size={14} />
            </button>
          )}
        </div>

        {/* Decrypted content */}
        {decrypted && (
          decrypted.error
            ? <div className="bubble-text received" style={{ color: 'var(--accent)' }}>⚠ {decrypted.error}</div>
            : <div className={`bubble-text ${side}`}>
                {decrypted.message}
              </div>
        )}

        {/* Meta */}
        <div className="bubble-meta">
          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
          {msg.selfDestruct && !isMine && (
            <span className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Flame size={10} /> Auto-delete
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Chat Page ─────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, masterKeyHex }                            = useAuth();
  const { friends, sharedKeys, messages, sendMessage, burnMessage } = useFriends();
  const { logEvent }                                     = useAudit();

  const [activeId,    setActiveId]    = useState(null);
  const [msgText,     setMsgText]     = useState('');
  const [decoyText,   setDecoyText]   = useState('');
  const [useDecoy,    setUseDecoy]    = useState(false);
  const [selfDestruct,setSelfDestruct]= useState(false);
  const [carrier,     setCarrier]     = useState(null); // { img, src }
  const [busy,        setBusy]        = useState(false);
  const [showKeyDiag, setShowKeyDiag] = useState(false);

  const fileRef = useRef(null);

  const accepted = friends.filter(f => f.status === 'accepted');
  const chatMsgs = activeId
    ? messages.filter(m =>
        (m.senderId === user.id && m.receiverId === activeId) ||
        (m.senderId === activeId && m.receiverId === user.id)
      )
    : [];

  const handleImagePick = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => setCarrier({ img, src: ev.target.result });
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async e => {
    e.preventDefault();
    if (!activeId || !msgText.trim() || !carrier) return;
    const key = sharedKeys[activeId];
    if (!key) { alert('No session key for this contact. Ensure the friend request was accepted by both sides.'); return; }

    setBusy(true);
    try {
      let payload;
      if (useDecoy && decoyText.trim()) {
        payload = await createDeniablePayload(msgText.trim(), decoyText.trim(), key);
        logEvent('CRYPTO', `Deniable encryption applied for ${activeId}`, true, user.id);
      } else {
        payload  = await encryptWithKey(msgText.trim(), key);
        logEvent('CRYPTO', `AES-256-GCM encryption applied for ${activeId}`, true, user.id);
      }
      const dataUrl = embedPayload(carrier.img, payload);
      logEvent('STEGO', `LSB payload embedded in carrier (${carrier.img.width}×${carrier.img.height})`, true, user.id);

      await sendMessage(activeId, dataUrl, selfDestruct);
      setMsgText('');
      setDecoyText('');
      setCarrier(null);
    } catch (err) {
      alert('Send failed: ' + err.message);
      logEvent('ERROR', err.message, false, user.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {showKeyDiag && <KeyDiagramModal onClose={() => setShowKeyDiag(false)} />}

      <div className="chat-layout">
        {/* ── Sidebar ── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div className="flex justify-between items-center">
              <span className="mono text-xs text-primary uppercase tracking-widest flex items-center gap-1">
                <Lock size={12} /> Secure Links
              </span>
              <span className="badge badge-success">{accepted.length}</span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {accepted.length === 0 ? (
              <div className="p-4 text-center text-muted text-xs" style={{ paddingTop: '2rem' }}>
                No contacts yet.<br />Go to <strong>Profile</strong> to add operatives.
              </div>
            ) : (
              accepted.map(f => (
                <div
                  key={f.id}
                  id={`contact-${f.otherId}`}
                  className={`chat-contact ${activeId === f.otherId ? 'active' : ''}`}
                  onClick={() => setActiveId(f.otherId)}
                >
                  <div className="mono text-sm" style={{ color: activeId === f.otherId ? 'var(--primary)' : 'var(--text)' }}>
                    {f.otherId}
                  </div>
                  <div className="text-xs text-muted mt-1 flex items-center gap-1">
                    <Shield size={10} /> E2E encrypted
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main ── */}
        {activeId ? (
          <div className="chat-main">
            {/* Topbar */}
            <div className="chat-topbar flex justify-between items-center">
              <div>
                <div className="mono font-bold" style={{ color: 'var(--primary)' }}>{activeId}</div>
                <div className="text-xs text-muted flex items-center gap-1 mt-1">
                  <Shield size={10} /> Private & Encrypted
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm flex items-center gap-1"
                onClick={() => setShowKeyDiag(true)}
                title="View Security Details"
              >
                <Key size={14} /> SECURITY INFO
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {chatMsgs.length === 0 && (
                <div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted" style={{ minHeight: 200 }}>
                  <Shield size={48} style={{ opacity: 0.1 }} />
                  <span className="text-sm">Send the first encrypted message.</span>
                </div>
              )}
              {chatMsgs.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMine={msg.senderId === user.id}
                  sharedKey={sharedKeys[msg.senderId === user.id ? msg.receiverId : msg.senderId]}
                  onBurn={burnMessage}
                  logEvent={logEvent}
                  userId={user.id}
                  masterKeyHex={masterKeyHex}
                />
              ))}
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <form onSubmit={handleSend}>
                <div className="flex gap-2 mb-2">
                  <input
                    id="chat-message-input"
                    type="text"
                    className="input-field flex-1"
                    placeholder="Secret message…"
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleImagePick} />
                  <button
                    type="button"
                    id="chat-pick-image"
                    className="btn btn-ghost btn-icon"
                    onClick={() => fileRef.current.click()}
                    title="Select carrier image"
                  >
                    <ImageIcon size={18} style={{ color: carrier ? 'var(--primary)' : 'var(--text-muted)' }} />
                  </button>
                  <button
                    type="submit"
                    id="chat-send"
                    className="btn btn-primary btn-icon"
                    disabled={!msgText.trim() || !carrier || busy}
                    title="Encrypt & Send"
                  >
                    {busy ? '…' : <Send size={18} />}
                  </button>
                </div>

                {carrier && (
                  <div className="flex items-center gap-2 mb-2" style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                    <ImageIcon size={12} />
                    <span className="mono">Carrier loaded ({carrier.img.width}×{carrier.img.height})</span>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 0.3rem' }} onClick={() => setCarrier(null)}>✕</button>
                  </div>
                )}

                {/* Options row */}
                <div className="flex gap-4 flex-wrap" style={{ fontSize: '0.78rem' }}>
                  <label className="flex items-center gap-2 cursor-pointer text-muted" title="Embed a fake decoy message for deniable encryption">
                    <input type="checkbox" checked={useDecoy} onChange={e => setUseDecoy(e.target.checked)} />
                    <EyeOff size={13} /> Deniable Encryption
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-muted" title="Image is wiped after the receiver opens it once">
                    <input type="checkbox" checked={selfDestruct} onChange={e => setSelfDestruct(e.target.checked)} />
                    <Flame size={13} style={{ color: selfDestruct ? 'var(--accent)' : 'inherit' }} />
                    <span style={{ color: selfDestruct ? 'var(--accent)' : 'inherit' }}>Self-Destruct</span>
                  </label>
                </div>

                {useDecoy && (
                  <input
                    id="chat-decoy-input"
                    type="text"
                    className="input-field mt-2"
                    placeholder="Decoy message (shown if wrong key is used)…"
                    value={decoyText}
                    onChange={e => setDecoyText(e.target.value)}
                    style={{ borderColor: 'var(--warning)', background: 'rgba(255,170,0,0.04)' }}
                  />
                )}
              </form>
            </div>
          </div>
        ) : (
          <div className="chat-main flex items-center justify-center flex-col gap-4">
            <MessageSquare size={64} style={{ color: 'var(--border)' }} />
            <p className="text-muted text-sm">Select a contact to open a secure comm-link</p>
          </div>
        )}
      </div>
    </>
  );
}
