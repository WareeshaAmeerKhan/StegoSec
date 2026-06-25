import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAudit } from '../contexts/AuditContext';
import { getAllFromStore, getFromStore } from '../services/db';
import { deriveMasterKey, deriveSharedSessionKey, decryptAuto, keyToHex } from '../utils/crypto';
import { extractPayload } from '../utils/steganography';
import {
  Cpu, Lock, Shield, Eye, FileText, BarChart2, Hash,
  AlertTriangle, CheckCircle, HelpCircle, Activity, Zap,
  Play, Square, RefreshCw, UploadCloud, Info, Trash2
} from 'lucide-react';

// ── Mini SVG Histogram ──────────────────────────────────────────────────────
function ByteHistogram({ data, color }) {
  if (!data) return null;
  const max = Math.max(...data, 1);
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 4 }}>
      <svg
        width="100%"
        viewBox="0 0 256 80"
        preserveAspectRatio="none"
        style={{ height: 100, display: 'block' }}
      >
        {data.map((v, i) => (
          <rect
            key={i}
            x={i}
            y={80 - (v / max) * 80}
            width={1}
            height={(v / max) * 80}
            fill={color}
            opacity="0.85"
          />
        ))}
      </svg>
      <div className="flex justify-between text-muted mono mt-1" style={{ fontSize: '0.65rem' }}>
        <span>0x00</span>
        <span>0x7F</span>
        <span>0xFF</span>
      </div>
    </div>
  );
}

// ── Hex Viewer Component ───────────────────────────────────────────────────
function HexViewer({ bytes, tamperedIndex, onHexClick }) {
  if (!bytes || bytes.length === 0) return null;

  // Split bytes into Header (4), IV (12), Ciphertext (length - 16 - 4), Tag (16)
  const len = bytes.length;
  const headerLen = 4;
  const ivLen = 12;
  const tagLen = Math.min(16, Math.max(0, len - headerLen - ivLen));
  const cipherLen = Math.max(0, len - headerLen - ivLen - tagLen);

  const getByteType = (idx) => {
    if (idx < headerLen) return 'header';
    if (idx < headerLen + ivLen) return 'iv';
    if (idx < headerLen + ivLen + cipherLen) return 'ciphertext';
    return 'tag';
  };

  const getByteColor = (type, isTampered) => {
    if (isTampered) return 'var(--accent)';
    if (type === 'header') return 'var(--primary)';
    if (type === 'iv') return '#00ccff';
    if (type === 'ciphertext') return '#e0e0e0';
    return '#ff5500'; // tag
  };

  // Build rows of 16 bytes
  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(bytes.slice(i, i + 16));
  }

  return (
    <div className="mono surface p-3 rounded" style={{ fontSize: '0.75rem', overflowX: 'auto', maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((row, rIdx) => {
            const offset = (rIdx * 16).toString(16).padStart(4, '0');
            return (
              <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td className="text-muted" style={{ paddingRight: '1rem', userSelect: 'none' }}>{offset}:</td>
                <td className="flex gap-1" style={{ paddingRight: '1.5rem' }}>
                  {Array.from(row).map((b, bIdx) => {
                    const globalIdx = rIdx * 16 + bIdx;
                    const type = getByteType(globalIdx);
                    const isTampered = globalIdx === tamperedIndex;
                    const color = getByteColor(type, isTampered);
                    return (
                      <span
                        key={bIdx}
                        onClick={() => onHexClick && onHexClick(globalIdx)}
                        style={{
                          color,
                          cursor: onHexClick ? 'pointer' : 'default',
                          fontWeight: isTampered || type === 'header' ? 'bold' : 'normal',
                          background: isTampered ? 'rgba(255,60,60,0.15)' : 'none',
                          padding: '0 1px',
                          borderRadius: 2
                        }}
                        title={`Byte ${globalIdx}: ${type.toUpperCase()}`}
                      >
                        {b.toString(16).padStart(2, '0')}
                      </span>
                    );
                  })}
                </td>
                <td className="text-muted" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
                  {Array.from(row).map((b, bIdx) => {
                    const chr = (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
                    const globalIdx = rIdx * 16 + bIdx;
                    const type = getByteType(globalIdx);
                    return (
                      <span key={bIdx} style={{ color: getByteColor(type, globalIdx === tamperedIndex) }}>
                        {chr}
                      </span>
                    );
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CryptanalysisPage() {
  const { user } = useAuth();
  const { logEvent } = useAudit();

  const [activeTab, setActiveTab] = useState('dict');

  // Common Target States
  const [imageSrc, setImageSrc] = useState(null);
  const [imageEl, setImageEl] = useState(null);
  const [imageHash, setImageHash] = useState('');
  const [extractedPayload, setExtractedPayload] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Process/Progress States
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [verdict, setVerdict] = useState(''); // 'CRACKED' | 'FAILED' | 'INCONCLUSIVE' | ''
  const [currentCheck, setCurrentCheck] = useState('');
  const abortRef = useRef(false);

  // Technique 1 — Dictionary Attack States
  const [suspectedAgent, setSuspectedAgent] = useState('admin');
  const [wordlistText, setWordlistText] = useState("admin_123\npassword\n123456\nagent007\ncybersecurity\nstegosec");
  const [crackResult, setCrackResult] = useState(null);

  // Technique 2 — Known Plaintext States
  const [plaintextFragment, setPlaintextFragment] = useState('Meeting');
  const [kpResult, setKpResult] = useState(null);

  // Technique 3 — Frequency Analysis States
  const [frequencyData, setFrequencyData] = useState(null);
  const [skewnessVerdict, setSkewnessVerdict] = useState('');
  const [asciiDump, setAsciiDump] = useState('');

  // Technique 4 — IV / Structure States
  const [tamperedIndex, setTamperedIndex] = useState(-1);
  const [tamperedBytes, setTamperedBytes] = useState(null);
  const [tamperError, setTamperError] = useState('');
  const [tamperDecrypted, setTamperDecrypted] = useState(null);

  // Technique 5 — Capacity Estimator States
  const [capacityReport, setCapacityReport] = useState(null);

  // ── Helper: Compute SHA-256 Hash of Image Data URL ──
  const computeHash = async (dataUrl) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(dataUrl);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMsg('');
    setVerdict('');
    setExtractedPayload(null);
    setCrackResult(null);
    setKpResult(null);
    setFrequencyData(null);
    setTamperedBytes(null);
    setTamperedIndex(-1);
    setTamperError('');
    setTamperDecrypted(null);
    setCapacityReport(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      setImageSrc(ev.target.result);
      const hash = await computeHash(ev.target.result);
      setImageHash(hash);

      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        try {
          const payload = extractPayload(img);
          setExtractedPayload(payload);
          setTamperedBytes(new Uint8Array(payload));
        } catch (err) {
          setErrorMsg(err.message || 'No valid LSB payload detected in this image.');
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const logAttempt = (technique, resultText, isSuccess) => {
    logEvent(
      'CRYPTANALYSIS',
      `Technique: ${technique} | Image Hash: ${imageHash || 'none'} | Verdict: ${resultText}`,
      isSuccess,
      user.id
    );
  };

  // ── Reset workspace when switching tabs ──
  useEffect(() => {
    abortRef.current = true;
    setRunning(false);
    setProgress(0);
    setAttempts(0);
    setVerdict('');
    setCurrentCheck('');
  }, [activeTab]);

  // ── TECHNIQUE 1: DICTIONARY ATTACK ──
  const runDictionaryAttack = async () => {
    if (!extractedPayload) return;
    setRunning(true);
    abortRef.current = false;
    setVerdict('');
    setCrackResult(null);
    setAttempts(0);
    setProgress(0);

    const words = wordlistText.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    if (words.length === 0) {
      alert('Wordlist is empty.');
      setRunning(false);
      return;
    }

    // Get Salt from suspected agent codename
    const targetUser = await getFromStore('users', suspectedAgent.trim());
    const salt = targetUser ? new Uint8Array(targetUser.masterKeySalt) : new Uint8Array(16);

    let cracked = false;
    let index = 0;

    const processWord = async () => {
      if (index >= words.length || cracked || abortRef.current) {
        setRunning(false);
        if (!cracked) {
          setVerdict('FAILED');
          logAttempt('Dictionary Attack', 'FAILED', false);
        }
        return;
      }

      const pw = words[index];
      setCurrentCheck(pw);
      setAttempts(index + 1);
      setProgress(Math.round(((index + 1) / words.length) * 100));

      try {
        const derivedKey = await deriveMasterKey(pw, suspectedAgent.trim(), salt);
        const dec = await decryptAuto(extractedPayload, derivedKey);
        
        // Decryption succeeded!
        cracked = true;
        setCrackResult({
          password: pw,
          keyHex: await keyToHex(derivedKey),
          message: dec.message,
          isDecoy: dec.isDecoy,
          isDeniable: dec.isDeniable
        });
        setVerdict('CRACKED');
        logAttempt('Dictionary Attack', `CRACKED (password: ${pw})`, true);
        setRunning(false);
        return;
      } catch (err) {
        // Continue
      }

      index++;
      setTimeout(processWord, 20); // Yield to keep UI smooth
    };

    processWord();
  };

  // ── TECHNIQUE 2: KNOWN PLAINTEXT ATTACK ──
  const runKnownPlaintextAttack = async () => {
    if (!extractedPayload) return;
    setRunning(true);
    abortRef.current = false;
    setVerdict('');
    setKpResult(null);
    setAttempts(0);
    setProgress(0);

    // Compile candidate keys
    const candidates = [];

    // 1. Get database session keys
    try {
      const friendships = await getAllFromStore('friends');
      for (const f of friendships) {
        if (f.status === 'accepted' && f.sharedSecret) {
          const label = [f.userId, f.friendId].sort().join(':');
          const key = await deriveSharedSessionKey(new Uint8Array(f.sharedSecret), label);
          const hex = await keyToHex(key);
          candidates.push({ key, hex, name: `Session Key (${f.userId} ↔ ${f.friendId})` });
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Add keys derived from common passwords
    const commonPasswords = ['admin_123', 'password', '123456', 'agent007', 'stegosec', 'cybersecurity'];
    const targetUser = await getFromStore('users', suspectedAgent.trim());
    const salt = targetUser ? new Uint8Array(targetUser.masterKeySalt) : new Uint8Array(16);

    for (const pw of commonPasswords) {
      try {
        const key = await deriveMasterKey(pw, suspectedAgent.trim(), salt);
        const hex = await keyToHex(key);
        candidates.push({ key, hex, name: `Master Key (pw: ${pw}, id: ${suspectedAgent})` });
      } catch {}
    }

    // 3. Generate dummy keys
    for (let i = 0; i < 30; i++) {
      const dummyRaw = window.crypto.getRandomValues(new Uint8Array(32));
      const key = await crypto.subtle.importKey(
        'raw', dummyRaw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']
      );
      const hex = Array.from(dummyRaw).map(b => b.toString(16).padStart(2, '0')).join('');
      candidates.push({ key, hex, name: `Random Candidate Key #${i+1}` });
    }

    let found = false;
    let index = 0;

    const processCandidate = async () => {
      if (index >= candidates.length || found || abortRef.current) {
        setRunning(false);
        if (!found) {
          setVerdict('FAILED');
          logAttempt('Known Plaintext Attack', 'FAILED', false);
        }
        return;
      }

      const cand = candidates[index];
      setCurrentCheck(cand.hex.slice(0, 16) + '...');
      setAttempts(index + 1);
      setProgress(Math.round(((index + 1) / candidates.length) * 100));

      try {
        const dec = await decryptAuto(extractedPayload, cand.key);
        const matched = dec.message.toLowerCase().includes(plaintextFragment.toLowerCase());

        if (matched) {
          found = true;
          setKpResult({
            keyHex: cand.hex,
            keyName: cand.name,
            message: dec.message,
            isDecoy: dec.isDecoy
          });
          setVerdict('CRACKED');
          logAttempt('Known Plaintext Attack', `CRACKED (key: ${cand.hex.slice(0, 8)})`, true);
          setRunning(false);
          return;
        }
      } catch (err) {
        // Continue
      }

      index++;
      setTimeout(processCandidate, 25);
    };

    processCandidate();
  };

  // ── TECHNIQUE 3: FREQUENCY ANALYSIS ──
  const runFrequencyAnalysis = () => {
    if (!extractedPayload) return;
    setRunning(true);
    setVerdict('');

    setTimeout(() => {
      const freqs = new Array(256).fill(0);
      for (let i = 0; i < extractedPayload.length; i++) {
        freqs[extractedPayload[i]]++;
      }
      setFrequencyData(freqs);

      // Verify Skewness: plain English uses limited characters (ASCII 32-126 + newlines)
      let zeroBuckets = 0;
      let printableBytes = 0;
      let nonPrintableCount = 0;
      let hasExtendedASCII = false;

      for (let i = 0; i < 256; i++) {
        if (freqs[i] === 0) zeroBuckets++;
        if (freqs[i] > 0) {
          if (i > 127) hasExtendedASCII = true;
          if (i >= 32 && i <= 126) printableBytes += freqs[i];
          else if (i !== 10 && i !== 13 && i !== 9) nonPrintableCount += freqs[i];
        }
      }

      const totalBytes = extractedPayload.length;
      const nonPrintableRatio = nonPrintableCount / totalBytes;
      const isSkewedText = !hasExtendedASCII && nonPrintableRatio < 0.05 && zeroBuckets > 150;

      // Hex & ASCII Dump formatting
      let dump = '';
      const limit = Math.min(extractedPayload.length, 300);
      for (let i = 0; i < limit; i++) {
        const b = extractedPayload[i];
        dump += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
      }
      if (extractedPayload.length > limit) dump += '...';
      setAsciiDump(dump);

      if (isSkewedText) {
        setSkewnessVerdict('POSSIBLY UNENCRYPTED (skewed histogram)');
        setVerdict('CRACKED');
        logAttempt('Frequency Analysis', 'UNENCRYPTED FOUND', true);
      } else {
        setSkewnessVerdict('ENCRYPTED PAYLOAD (flat histogram)');
        setVerdict('FAILED');
        logAttempt('Frequency Analysis', 'ENCRYPTED DETECTED', false);
      }
      setRunning(false);
    }, 400);
  };

  // ── TECHNIQUE 4: IV / STRUCTURE ANALYSIS ──
  const runStructureAnalysis = () => {
    if (!extractedPayload) return;
    setVerdict('INCONCLUSIVE');
    logAttempt('Structure Analysis', 'ANALYZED', true);
  };

  const handleHexClick = (index) => {
    setTamperedIndex(index);
  };

  const applyTampering = async () => {
    if (!extractedPayload || tamperedIndex === -1) return;
    setTamperError('');
    setTamperDecrypted(null);

    const newBytes = new Uint8Array(extractedPayload);
    // Flip 1 bit of the selected byte
    newBytes[tamperedIndex] ^= 0x01;
    setTamperedBytes(newBytes);

    // Try to decrypt the tampered bytes with the current session keys or admin key
    try {
      let activeKey = null;
      // Get Admin Master Key from session storage if possible
      const adminMkHex = sessionStorage.getItem('stegosec_mk');
      if (adminMkHex) {
        const adminRaw = Uint8Array.from(
          adminMkHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        activeKey = await crypto.subtle.importKey(
          'raw', adminRaw, { name: 'AES-GCM' }, false, ['decrypt']
        );
      }

      if (!activeKey) {
        // Fallback: search friends for session key
        const friendships = await getAllFromStore('friends');
        const f = friendships.find(fr => fr.status === 'accepted' && fr.sharedSecret);
        if (f) {
          const label = [f.userId, f.friendId].sort().join(':');
          activeKey = await deriveSharedSessionKey(new Uint8Array(f.sharedSecret), label);
        }
      }

      if (!activeKey) {
        throw new Error("No active key available to verify decryption. Make sure an operative channel exists.");
      }

      const dec = await decryptAuto(newBytes, activeKey);
      setTamperDecrypted(dec.message);
    } catch (err) {
      setTamperError(`INTEGRITY FAILURE: ${err.message || 'Decryption failed. AEAD tag verification mismatch.'}`);
    }
  };

  const restoreBytes = () => {
    setTamperedBytes(new Uint8Array(extractedPayload));
    setTamperedIndex(-1);
    setTamperError('');
    setTamperDecrypted(null);
  };

  // ── TECHNIQUE 5: CAPACITY ESTIMATOR ──
  const runCapacityEstimator = () => {
    if (!imageEl) return;
    setVerdict('INCONCLUSIVE');

    const width = imageEl.width;
    const height = imageEl.height;
    const capacityBytes = Math.floor((width * height * 3) / 8);

    let detectedPayloadLen = 0;
    let occupancy = 0;
    let format = 'UNKNOWN';
    let subDetails = '';

    if (extractedPayload) {
      detectedPayloadLen = extractedPayload.length;
      occupancy = ((detectedPayloadLen / capacityBytes) * 100).toFixed(3);

      // Check if it matches deniable format
      try {
        const dv = new DataView(
          extractedPayload.buffer,
          extractedPayload.byteOffset,
          extractedPayload.byteLength
        );
        const decoyLen = dv.getUint32(0, false);
        const realLen = dv.getUint32(4 + decoyLen, false);

        if (decoyLen > 0 && decoyLen + 8 < extractedPayload.length && realLen > 0 && 4 + decoyLen + 4 + realLen === extractedPayload.length) {
          format = 'DENIABLE (DUAL PAYLOAD)';
          subDetails = `Decoy Message: ${decoyLen} bytes | Real Message: ${realLen} bytes`;
        } else {
          format = 'SINGLE PAYLOAD (AES-256-GCM)';
          subDetails = `Ciphertext length: ${detectedPayloadLen} bytes (including header, IV & tag)`;
        }
      } catch {
        format = 'SINGLE PAYLOAD (AES-256-GCM)';
        subDetails = `Ciphertext length: ${detectedPayloadLen} bytes`;
      }
    }

    setCapacityReport({
      dimensions: `${width} × ${height} px`,
      capacity: capacityBytes.toLocaleString() + ' bytes',
      detected: detectedPayloadLen ? detectedPayloadLen.toLocaleString() + ' bytes' : '0 bytes',
      occupancy: occupancy + '%',
      format,
      subDetails
    });

    logAttempt('Capacity Estimator', 'REPORT GENERATED', true);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-3 m-0" style={{ fontSize: '1.25rem', letterSpacing: '0.08em' }}>
          <Cpu size={26} color="var(--primary)" />
          <span>CRYPTANALYSIS DECRYPTION ENGINE</span>
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* ── Left Sidebar Navigation ── */}
        <div className="flex flex-col gap-2">
          {[
            { id: 'dict', label: '1. Dictionary Attack', icon: Lock, desc: 'Brute-force AES key derived from wordlist' },
            { id: 'known', label: '2. Known Plaintext', icon: Shield, desc: 'Matches fragment against candidate keys' },
            { id: 'freq', label: '3. Frequency Analysis', icon: BarChart2, desc: 'Tests entropy to detect plain text vs cipher' },
            { id: 'struct', label: '4. IV/Cipher Structure', icon: Hash, desc: 'Interactive AEAD parsing and tamper demo' },
            { id: 'capacity', label: '5. Payload Estimator', icon: Activity, desc: 'LSB occupancy density & structure report' },
          ].map(t => (
            <button
              key={t.id}
              className={`text-left p-3 rounded glass-card flex flex-col gap-1 cursor-pointer transition-all ${
                activeTab === t.id ? 'border-primary' : 'border-transparent'
              }`}
              style={{
                background: activeTab === t.id ? 'rgba(0,255,65,0.06)' : 'var(--bg-elevated)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: activeTab === t.id ? 'var(--primary)' : 'var(--border)'
              }}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="flex items-center gap-2 font-bold text-sm" style={{ color: activeTab === t.id ? 'var(--primary)' : 'var(--text)' }}>
                <t.icon size={15} />
                {t.label}
              </span>
              <span className="text-muted text-xs" style={{ fontSize: '0.7rem', lineHeight: 1.3 }}>{t.desc}</span>
            </button>
          ))}

          {/* Stego Uploader in Sidebar */}
          <div className="glass-card mt-4 p-3 flex flex-col gap-3">
            <span className="text-primary font-bold text-xs uppercase tracking-widest">Target Image</span>
            {imageSrc ? (
              <div className="text-center flex flex-col items-center gap-2">
                <img
                  src={imageSrc}
                  alt="target preview"
                  style={{ width: '100%', borderRadius: 4, maxHeight: 100, objectFit: 'contain', border: '1px solid var(--border)' }}
                />
                <div className="flex gap-2 justify-center w-full">
                  <label className="btn btn-ghost btn-xs flex items-center gap-1 cursor-pointer" style={{ margin: 0 }}>
                    <RefreshCw size={10} /> CHANGE
                    <input type="file" onChange={handleImageUpload} accept="image/png" style={{ display: 'none' }} />
                  </label>
                  <button className="btn btn-accent btn-xs flex items-center gap-1" onClick={() => {
                    setImageSrc(null);
                    setImageHash('');
                    setImageEl(null);
                    setErrorMsg('');
                    setVerdict('');
                    setExtractedPayload(null);
                    setCrackResult(null);
                    setKpResult(null);
                    setFrequencyData(null);
                    setTamperedBytes(null);
                    setTamperedIndex(-1);
                    setTamperError('');
                    setTamperDecrypted(null);
                    setCapacityReport(null);
                  }}>
                    <Trash2 size={10} /> REMOVE
                  </button>
                </div>
              </div>
            ) : (
              <label className="file-upload-area" style={{ display: 'block', cursor: 'pointer', padding: '1.5rem 1rem' }}>
                <input type="file" onChange={handleImageUpload} accept="image/png" style={{ display: 'none' }} />
                <UploadCloud size={32} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
                <span className="text-xs text-primary font-bold">LOAD STEGO TARGET</span>
              </label>
            )}

            {imageHash && (
              <div className="mono text-muted text-xs border-t pt-2 mt-1">
                Hash: <span className="text-primary">{imageHash}</span>
              </div>
            )}

            {errorMsg && <div className="text-accent text-xs mt-1 mono">{errorMsg}</div>}
          </div>
        </div>

        {/* ── Right Workspace area ── */}
        <div className="flex flex-col gap-4">
          
          {/* Active Tab Explanation Header */}
          <div className="glass-card">
            {activeTab === 'dict' && (
              <>
                <h3 className="m-0 text-primary text-sm uppercase tracking-widest flex items-center gap-2">
                  <Lock size={16} /> Dictionary Attack
                </h3>
                <p className="text-muted text-xs mt-2" style={{ lineHeight: 1.6 }}>
                  Most real-world AES breaks occur because of weak passwords rather than algorithm vulnerabilities. 
                  This tool extracts the stego payload and derives AES keys iteratively using <strong>PBKDF2-SHA256 (390,000 iterations)</strong> 
                  from a dictionary of passwords. It then checks if any key successfully decrypts the payload by matching 
                  the header prefix (`STEG` or `DECY`).
                </p>
              </>
            )}
            {activeTab === 'known' && (
              <>
                <h3 className="m-0 text-primary text-sm uppercase tracking-widest flex items-center gap-2">
                  <Shield size={16} /> Known Plaintext Attack (Simulation)
                </h3>
                <p className="text-muted text-xs mt-2" style={{ lineHeight: 1.6 }}>
                  A cryptographic attack where the cryptanalyst has access to both the ciphertext and a suspected fragment of the plaintext. 
                  In this demo, the engine tests a list of candidate keys—compiled from common passwords, active session keys 
                  retrieved from database operative channels, and dummy keys—and searches the resulting decryptions for the plaintext fragment.
                </p>
              </>
            )}
            {activeTab === 'freq' && (
              <>
                <h3 className="m-0 text-primary text-sm uppercase tracking-widest flex items-center gap-2">
                  <BarChart2 size={16} /> Frequency Analysis on LSB
                </h3>
                <p className="text-muted text-xs mt-2" style={{ lineHeight: 1.6 }}>
                  Examines the raw LSB bitstream without decrypting it. Ciphertext (AES-256 output) exhibits high entropy, 
                  meaning byte frequencies (0-255) are completely flat and uniform. If the LSB watermark was embedded 
                  unencrypted, the byte histogram will be highly skewed, matching English letter frequencies.
                </p>
              </>
            )}
            {activeTab === 'struct' && (
              <>
                <h3 className="m-0 text-primary text-sm uppercase tracking-widest flex items-center gap-2">
                  <Hash size={16} /> IV / Ciphertext Structure Analysis
                </h3>
                <p className="text-muted text-xs mt-2" style={{ lineHeight: 1.6 }}>
                  AES-256-GCM produces structured payloads: <strong>[Magic Header (4 bytes)] [IV (12 bytes)] [Ciphertext] [Auth Tag (16 bytes)]</strong>. 
                  This viewer color-codes these segments in the raw binary. Select any byte, modify its value (simulate noise/tampering), 
                  and verify how the AES-GCM Integrity Check detects the modification and throws an authentication tag error.
                </p>
              </>
            )}
            {activeTab === 'capacity' && (
              <>
                <h3 className="m-0 text-primary text-sm uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} /> Steganographic Capacity & Payload Estimator
                </h3>
                <p className="text-muted text-xs mt-2" style={{ lineHeight: 1.6 }}>
                  Analyzes steganographic carrier dimensions and counts LSB pixels to calculate storage boundaries. 
                  It parses the embedded header structures directly to evaluate payload type (single payload vs dual deniable decoy payload) 
                  and reports exact occupancy percentages without needing password keys.
                </p>
              </>
            )}
          </div>

          {/* Interactive controls and outputs */}
          <div className="glass-card flex-1 flex flex-col gap-4">
            
            {/* Target warning */}
            {!imageEl && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted">
                <AlertTriangle size={32} className="mb-2" />
                <span className="text-sm font-bold">Awaiting Target Stego Image</span>
                <p className="text-xs max-w-sm mt-1">Load an intercepted PNG file using the left sidebar to activate the cryptanalysis panel.</p>
              </div>
            )}

            {imageEl && (
              <>
                {/* ── Active Tab Controls ── */}
                <div className="surface p-4 rounded flex flex-col gap-3">
                  <span className="text-xs uppercase tracking-widest text-primary font-bold">Analysis Configuration</span>
                  
                  {activeTab === 'dict' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="input-label">Suspected Agent ID</label>
                        <input
                          type="text"
                          className="input-field w-full"
                          value={suspectedAgent}
                          onChange={e => setSuspectedAgent(e.target.value)}
                          disabled={running}
                        />
                        <p className="text-muted text-xs mt-1">Required to lookup salt and append username to PBKDF2 iterations.</p>
                      </div>
                      <div>
                        <label className="input-label">Wordlist Passwords</label>
                        <textarea
                          className="input-field w-full mono"
                          rows={4}
                          value={wordlistText}
                          onChange={e => setWordlistText(e.target.value)}
                          disabled={running}
                          style={{ resize: 'none', height: '80px', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'known' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="input-label">Suspected Agent ID (for PBKDF2 check)</label>
                        <input
                          type="text"
                          className="input-field w-full"
                          value={suspectedAgent}
                          onChange={e => setSuspectedAgent(e.target.value)}
                          disabled={running}
                        />
                      </div>
                      <div>
                        <label className="input-label">Known Plaintext Fragment</label>
                        <input
                          type="text"
                          className="input-field w-full"
                          value={plaintextFragment}
                          onChange={e => setPlaintextFragment(e.target.value)}
                          placeholder="e.g. Meeting"
                          disabled={running}
                        />
                        <p className="text-muted text-xs mt-1">If candidate decryption contains this phrase, crack succeeds.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'freq' && (
                    <p className="text-xs text-muted m-0">No configuration required. Frequency Analysis executes raw LSB scanning of pixel arrays.</p>
                  )}

                  {activeTab === 'struct' && (
                    <p className="text-xs text-muted m-0">
                      Hover over any byte below to inspect, click to select, and use the Tamper tool to modify payload integrity.
                    </p>
                  )}

                  {activeTab === 'capacity' && (
                    <p className="text-xs text-muted m-0">Computes mathematical LSB properties based on image pixel dimensions and density.</p>
                  )}

                  {/* Run / Stop Actions */}
                  <div className="flex gap-2 mt-2">
                    {activeTab === 'dict' && (
                      <button className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={runDictionaryAttack} disabled={running || !extractedPayload}>
                        {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                        {running ? 'CRACKING...' : 'START DICTIONARY ATTACK'}
                      </button>
                    )}
                    {activeTab === 'known' && (
                      <button className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={runKnownPlaintextAttack} disabled={running || !extractedPayload}>
                        {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                        {running ? 'CRACKING...' : 'START PLAINTEXT SEARCH'}
                      </button>
                    )}
                    {activeTab === 'freq' && (
                      <button className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={runFrequencyAnalysis} disabled={running || !extractedPayload}>
                        <Activity size={14} /> ANALYZE BYTE FREQUENCIES
                      </button>
                    )}
                    {activeTab === 'struct' && (
                      <button className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={runStructureAnalysis} disabled={!extractedPayload}>
                        <Hash size={14} /> IDENTIFY STRUCTURE SEGMENTS
                      </button>
                    )}
                    {activeTab === 'capacity' && (
                      <button className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={runCapacityEstimator}>
                        <Cpu size={14} /> GENERATE ESTIMATION REPORT
                      </button>
                    )}
                    {running && (
                      <button className="btn btn-accent flex-1 flex items-center justify-center gap-2" onClick={() => { abortRef.current = true; }}>
                        <Square size={14} /> ABORT ATTACK
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Indicators */}
                {running && (
                  <div className="surface p-4 rounded mono text-xs flex flex-col gap-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-primary">&gt;_ Attacking key space...</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ height: 6, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', transition: 'width 0.1s' }}></div>
                    </div>
                    <div className="flex justify-between text-muted" style={{ fontSize: '0.7rem' }}>
                      <span>Attempts: {attempts}</span>
                      <span>Testing Key Material: <span className="text-primary">{currentCheck}</span></span>
                    </div>
                  </div>
                )}

                {/* Results Outputs */}
                {verdict && (
                  <div className="border-t pt-4 flex flex-col gap-4">
                    <span className="text-xs uppercase tracking-widest text-primary font-bold">Investigation Output</span>
                    
                    {/* Verdict Card */}
                    <div className="flex items-center justify-between surface p-3 rounded border" style={{ borderColor: verdict === 'CRACKED' ? 'rgba(0,255,65,0.3)' : 'rgba(255,60,60,0.3)' }}>
                      <div className="flex items-center gap-3">
                        {verdict === 'CRACKED' ? (
                          <CheckCircle size={32} color="var(--primary)" />
                        ) : verdict === 'FAILED' ? (
                          <AlertTriangle size={32} color="var(--accent)" />
                        ) : (
                          <Info size={32} color="#00ccff" />
                        )}
                        <div>
                          <div className="font-bold text-xs uppercase tracking-widest text-muted">Analysis Verdict</div>
                          <div className="font-bold text-sm" style={{ color: verdict === 'CRACKED' ? 'var(--primary)' : verdict === 'FAILED' ? 'var(--accent)' : '#00ccff' }}>
                            {verdict === 'CRACKED' ? 'ATTACK SUCCESSFUL - DECRYPTED' : verdict === 'FAILED' ? 'ATTACK FAILED - CRYPTO HELD' : 'ANALYSIS COMPLETE'}
                          </div>
                        </div>
                      </div>
                      <div className="mono text-xs text-muted">Technique Verdict: {verdict}</div>
                    </div>

                    {/* Technique 1 Results */}
                    {activeTab === 'dict' && crackResult && (
                      <div className="surface p-4 rounded mono text-xs flex flex-col gap-2">
                        <div><span className="text-primary">Cracked Password: </span> <span className="text-white font-bold">{crackResult.password}</span></div>
                        <div className="break-all"><span className="text-primary">Master Key (Hex):  </span> <span style={{ color: '#00ccff' }}>{crackResult.keyHex}</span></div>
                        <div><span className="text-primary">Payload Format:   </span> <span className="text-muted">{crackResult.isDeniable ? 'Deniable Dual Payload' : 'Single Encrypted'}</span></div>
                        <div className="border-t pt-3 mt-2">
                          <span className="text-primary">// Extracted Comms Plaintext:</span>
                          <div className="p-3 rounded mt-2 text-sm text-white" style={{ background: '#050505', border: '1px solid var(--border)', fontFamily: 'sans-serif' }}>
                            {crackResult.message}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Technique 2 Results */}
                    {activeTab === 'known' && kpResult && (
                      <div className="surface p-4 rounded mono text-xs flex flex-col gap-2">
                        <div className="break-all"><span className="text-primary">Cracked Key (Hex): </span> <span style={{ color: '#00ccff' }}>{kpResult.keyHex}</span></div>
                        <div><span className="text-primary">Key Match Origin:   </span> <span className="text-white font-bold">{kpResult.keyName}</span></div>
                        <div className="border-t pt-3 mt-2">
                          <span className="text-primary">// Plaintext Comms containing "{plaintextFragment}":</span>
                          <div className="p-3 rounded mt-2 text-sm text-white" style={{ background: '#050505', border: '1px solid var(--border)', fontFamily: 'sans-serif' }}>
                            {kpResult.message}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Technique 3 Results */}
                    {activeTab === 'freq' && frequencyData && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                          <span className="text-muted text-xs mono">Byte Frequency Distribution:</span>
                          <div className="mt-2">
                            <ByteHistogram data={frequencyData} color={verdict === 'CRACKED' ? 'var(--primary)' : '#00ccff'} />
                          </div>
                        </div>
                        <div className="mono text-xs flex flex-col gap-2">
                          <div><span className="text-primary">Entropy Check: </span> <span className="text-white">{skewnessVerdict}</span></div>
                          <div className="border-t pt-2 mt-2">
                            <span className="text-primary">// ASCII/Hex stream dump:</span>
                            <div className="p-2 rounded bg-black mt-1 break-all" style={{ height: '80px', overflowY: 'auto', border: '1px solid var(--border)', fontSize: '0.7rem' }}>
                              {asciiDump}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Technique 4 Results */}
                    {activeTab === 'struct' && extractedPayload && (
                      <div className="flex flex-col gap-3">
                        {/* Segment legends */}
                        <div className="flex gap-4 text-xs font-bold flex-wrap mono">
                          <span style={{ color: 'var(--primary)' }}>■ Header (4 bytes)</span>
                          <span style={{ color: '#00ccff' }}>■ IV (12 bytes)</span>
                          <span style={{ color: '#e0e0e0' }}>■ Ciphertext Body</span>
                          <span style={{ color: '#ff5500' }}>■ Auth Tag (16 bytes)</span>
                        </div>

                        {/* Hex Display */}
                        <HexViewer
                          bytes={tamperedBytes || extractedPayload}
                          tamperedIndex={tamperedIndex}
                          onHexClick={handleHexClick}
                        />

                        {/* Interactive Tamper Box */}
                        <div className="surface p-4 rounded text-xs flex flex-col gap-3">
                          <span className="font-bold text-primary">// AEAD Integrity Test Panel</span>
                          <p className="text-muted m-0">
                            {tamperedIndex === -1 ? (
                              <span>Click any byte in the hex viewer above to select it, then run the Tampering simulator.</span>
                            ) : (
                              <span>Selected byte index <strong className="text-primary">{tamperedIndex}</strong> (value: 0x{(tamperedBytes || extractedPayload)[tamperedIndex].toString(16).padStart(2, '0')}). Click "Tamper Byte" to flip 1 bit in transit.</span>
                            )}
                          </p>

                          <div className="flex gap-2">
                            <button className="btn btn-accent btn-sm flex-1" onClick={applyTampering} disabled={tamperedIndex === -1}>
                              TAMPER 1 BYTE & DECRYPT
                            </button>
                            <button className="btn btn-ghost btn-sm flex-1" onClick={restoreBytes} disabled={tamperedIndex === -1}>
                              RESTORE ORIGINAL
                            </button>
                          </div>

                          {tamperError && (
                            <div className="alert alert-error font-bold mono text-xs mt-1" style={{ margin: 0 }}>
                              {tamperError}
                            </div>
                          )}

                          {tamperDecrypted !== null && (
                            <div className="alert alert-success text-xs font-bold mono mt-1" style={{ margin: 0 }}>
                              Decryption Succeeded! Plaintext: "{tamperDecrypted}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technique 5 Results */}
                    {activeTab === 'capacity' && capacityReport && (
                      <div className="surface p-4 rounded mono text-xs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <div className="flex justify-between py-1 border-b"><span className="text-muted">Image Size:</span> <span className="text-white font-bold">{capacityReport.dimensions}</span></div>
                          <div className="flex justify-between py-1 border-b"><span className="text-muted">LSB Capacity:</span> <span className="text-white font-bold">{capacityReport.capacity}</span></div>
                          <div className="flex justify-between py-1 border-b"><span className="text-muted">Payload Size:</span> <span className="text-primary font-bold">{capacityReport.detected}</span></div>
                        </div>
                        <div>
                          <div className="flex justify-between py-1 border-b"><span className="text-muted">LSB Density:</span> <span className="text-primary font-bold">{capacityReport.occupancy}</span></div>
                          <div className="flex justify-between py-1 border-b"><span className="text-muted">Detected Format:</span> <span style={{ color: '#00ccff' }} className="font-bold">{capacityReport.format}</span></div>
                          <div className="flex justify-between py-1 border-b"><span className="text-muted">Analysis:</span> <span className="text-white font-bold" style={{ fontSize: '0.7rem' }}>{capacityReport.subDetails}</span></div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
