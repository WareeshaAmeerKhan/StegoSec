import React, { useState, useRef, useEffect } from 'react';
import { useAuth }   from '../contexts/AuthContext';
import { useAudit }  from '../contexts/AuditContext';
import NetworkVisualizer from '../components/NetworkVisualizer';
import { injectWatermark } from '../utils/steganography';
import { ShieldAlert, Cpu, Key, Network, Info, Camera, Download, RotateCcw, RefreshCw, Trash2 } from 'lucide-react';

// ── Math display ─────────────────────────────────────────────────────────────
function AESMathPanel() {
  return (
    <div className="surface p-4 rounded mono" style={{ fontSize: '0.8rem', lineHeight: 2.2 }}>
      <div className="text-primary mb-2 uppercase tracking-widest text-xs">AES-256 Brute-Force Mathematics</div>
      <div className="text-muted">Key-space size:          <span className="text-primary">2²⁵⁶ ≈ 1.16 × 10⁷⁷</span></div>
      <div className="text-muted">Fastest supercomputer:   <span style={{ color: '#00ccff' }}>10¹⁵ keys/sec</span></div>
      <div className="text-muted">Time to crack (avg):     <span className="text-accent">≈ 3.3 × 10⁵⁶ years</span></div>
      <div className="text-muted">Age of universe:         <span style={{ color: '#555' }}>1.38 × 10¹⁰ years</span></div>
      <div style={{ marginTop: '0.5rem', color: '#333' }}>──────────────────────────────────────</div>
      <div style={{ color: 'var(--primary)', marginTop: '0.25rem' }}>
        Conclusion: <span className="text-primary">Computationally infeasible. Period.</span>
      </div>
    </div>
  );
}

export default function AttackSimulatorPage() {
  const { user }     = useAuth();
  const { logEvent } = useAudit();

  const [tab, setTab] = useState('capture'); // 'capture' | 'breaker' | 'network'

  // ── Camera / Photo Capture (Innocent UI, covertly watermarks) ──────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [photoSrc, setPhotoSrc] = useState(null); // dataURL
  const [photoEl, setPhotoEl] = useState(null); // Image element
  const [watermarkedSrc, setWatermarkedSrc] = useState(null); // watermarked dataURL

  // ── Key Breaker ───────────────────────────────────────────────────────────
  const [target,    setTarget]    = useState(null);
  const [cracking,  setCracking]  = useState(false);
  const [attempts,  setAttempts]  = useState(0);
  const [status,    setStatus]    = useState('IDLE');
  const intervalRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraOn(true);
      setPhotoSrc(null);
      setPhotoEl(null);
      setWatermarkedSrc(null);
      logEvent('CAMERA', 'Imaging lab video feed initialized', true, user.id);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 80);
    } catch (e) {
      alert('Camera access denied: ' + e.message);
    }
  };

  const stopCamera = () => {
    const s = videoRef.current?.srcObject;
    if (s) s.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  };

  const capturePhoto = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v) return;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext('2d').drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/png');
    setPhotoSrc(dataUrl);

    const img = new Image();
    img.onload = () => {
      setPhotoEl(img);
      // Silently and covertly embed the forensic watermark containing the user ID & timestamp
      try {
        const watermarkedUrl = injectWatermark(img, user.id);
        setWatermarkedSrc(watermarkedUrl);
      } catch (err) {
        console.error('Steganographic preparation failed:', err);
      }
    };
    img.src = dataUrl;

    stopCamera();
    logEvent('CAMERA', 'High fidelity snapshot captured', true, user.id);
  };

  const downloadPhoto = () => {
    const finalSrc = watermarkedSrc || photoSrc;
    if (!finalSrc) return;
    const a = document.createElement('a');
    a.href = finalSrc;
    a.download = `imaging_asset_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    logEvent('CAMERA', 'Imaging asset downloaded to local drive', true, user.id);
  };

  const resetCameraView = () => {
    stopCamera();
    setPhotoSrc(null);
    setPhotoEl(null);
    setWatermarkedSrc(null);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      clearInterval(intervalRef.current);
    };
  }, []);

  // ── Key Breaker ───────────────────────────────────────────────────────────
  const handleTargetUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setTarget(ev.target.result);
    reader.readAsDataURL(file);
    setAttempts(0);
    setStatus('TARGET LOADED');
  };

  const startBruteForce = () => {
    setCracking(true);
    setAttempts(0);
    setStatus('CRACKING…');
    logEvent('ATTACK-SIM', 'Simulated brute-force attack initiated', false, 'ATTACKER');
    let total = 0;
    intervalRef.current = setInterval(() => {
      total += Math.floor(Math.random() * 2_800_000 + 1_200_000);
      setAttempts(total);
      if (total >= 60_000_000) {
        clearInterval(intervalRef.current);
        setCracking(false);
        setStatus('FAILED – KEY NOT FOUND');
        logEvent('ATTACK-SIM', 'Brute-force failed – AES-256 held', true, 'SYSTEM');
      }
    }, 60);
  };

  const apsDisplay = cracking
    ? `~${(Math.round(attempts / 1e6 / 3) || 1)}M keys/sec`
    : '—';

  const tabs = [
    { id: 'capture', label: 'CAMERA FEED' },
    { id: 'breaker', label: 'KEY BREAKER' },
    { id: 'network', label: 'NET INTERCEPT' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-3 m-0" style={{ fontSize: '1.25rem', letterSpacing: '0.08em' }}>
          <Camera size={26} color="var(--primary)" />
          <span style={{ color: 'var(--text)' }}>IMAGING LAB</span>
        </h1>
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Camera Feed Tab (Innocent Capture / Covert Watermark) ── */}
      {tab === 'capture' && (
        <div className="glass-card">
          <div className="flex items-start gap-2 mb-1">
            <Camera size={20} color="var(--primary)" />
            <h2 className="m-0 text-lg" style={{ color: 'var(--text)' }}>Secure Camera & Viewfinder System</h2>
          </div>
          <p className="text-muted text-sm mb-6">
            Capture raw high-resolution lossless images directly using your device's connected camera modules.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
            <div className="flex flex-col gap-4">
              <div style={{
                background: '#0a0a0a',
                border: '1px solid var(--border)',
                borderRadius: 12,
                aspectRatio: '4/3',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.95)'
              }}>
                {/* Viewfinder Focus Brackets */}
                <div style={{ position: 'absolute', top: 20, left: 20, width: 24, height: 24, borderTop: '2px solid var(--primary)', borderLeft: '2px solid var(--primary)', opacity: 0.8 }} />
                <div style={{ position: 'absolute', top: 20, right: 20, width: 24, height: 24, borderTop: '2px solid var(--primary)', borderRight: '2px solid var(--primary)', opacity: 0.8 }} />
                <div style={{ position: 'absolute', bottom: 20, left: 20, width: 24, height: 24, borderBottom: '2px solid var(--primary)', borderLeft: '2px solid var(--primary)', opacity: 0.8 }} />
                <div style={{ position: 'absolute', bottom: 20, right: 20, width: 24, height: 24, borderBottom: '2px solid var(--primary)', borderRight: '2px solid var(--primary)', opacity: 0.8 }} />

                {/* Subtle Viewfinder Grid */}
                <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />

                {/* Live Feed Active Badge */}
                {cameraOn && (
                  <div style={{
                    position: 'absolute', top: 20, right: 20,
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(0,0,0,0.8)', padding: '6px 12px',
                    borderRadius: 4, border: '1px solid rgba(0,255,65,0.3)',
                    zIndex: 10
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#ff3b30',
                      display: 'inline-block', boxShadow: '0 0 8px #ff3b30',
                      animation: 'pulse 1.5s infinite'
                    }} />
                    <span className="mono" style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 'bold', letterSpacing: '0.1em' }}>LIVE FEED</span>
                  </div>
                )}

                {/* Photo Captured Secure Badge */}
                {photoSrc && !cameraOn && (
                  <div style={{
                    position: 'absolute', top: 20, right: 20,
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(0,255,65,0.15)', padding: '6px 12px',
                    borderRadius: 4, border: '1px solid var(--primary)',
                    zIndex: 10
                  }}>
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 'bold', letterSpacing: '0.1em' }}>ASSET SECURED</span>
                  </div>
                )}

                {/* State: Camera Off, No Photo */}
                {!cameraOn && !photoSrc && (
                  <div className="text-center flex flex-col items-center gap-4 p-6 z-10 animate-fade-in">
                    <div style={{
                      width: 90, height: 90, borderRadius: '50%',
                      background: 'rgba(0,255,65,0.02)', border: '1px solid rgba(0,255,65,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 20px rgba(0,255,65,0.04)', marginBottom: '0.5rem'
                    }}>
                      <Camera size={40} color="var(--primary)" style={{ opacity: 0.7 }} />
                    </div>
                    <button className="btn btn-primary btn-md font-bold px-6" onClick={startCamera}>
                      ACTIVATE CAMERA
                    </button>
                  </div>
                )}

                {/* State: Live video streaming */}
                {cameraOn && (
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}

                {/* State: Captured Photo preview */}
                {photoSrc && !cameraOn && (
                  <img src={photoSrc} alt="captured result" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Control Buttons Container */}
              {(cameraOn || photoSrc) && (
                <div className="flex gap-3 justify-center animate-fade-in">
                  {cameraOn && (
                    <>
                      <button className="btn btn-accent px-6 py-2 flex items-center gap-2 font-bold" onClick={capturePhoto}>
                        <Camera size={16} /> CAPTURE SNAPSHOT
                      </button>
                      <button className="btn btn-ghost px-6 py-2" onClick={stopCamera}>
                        CANCEL
                      </button>
                    </>
                  )}
                  {photoSrc && !cameraOn && (
                    <>
                      <button className="btn btn-primary px-6 py-2 flex items-center gap-2 font-bold" onClick={downloadPhoto}>
                        <Download size={16} /> DOWNLOAD SNAPSHOT
                      </button>
                      <button className="btn btn-ghost px-6 py-2 flex items-center gap-2" onClick={startCamera}>
                        <RotateCcw size={16} /> NEW SNAPSHOT
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Config & Information Sidebar */}
            <div className="flex flex-col justify-between w-full" style={{ gap: '1.5rem' }}>
              <div className="surface p-6 rounded-lg flex flex-col gap-4 w-full" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                <span className="text-primary font-bold uppercase tracking-wider text-xs" style={{ letterSpacing: '0.12em' }}>// Secure Sensor Feed</span>
                <p className="text-muted text-xs m-0" style={{ lineHeight: 1.8 }}>
                  This workbench handles local camera frame captures. It guarantees pixel-perfect preservation of target files without quality loss.
                </p>
                <div style={{ borderBottom: '1px solid var(--border)', margin: '0.75rem 0' }} />
                <div className="mono text-xs flex flex-col w-full" style={{ gap: '0.85rem' }}>
                  <div className="flex justify-between w-full" style={{ paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-muted">Target Format:</span>
                    <span style={{ color: 'var(--text)' }}>PNG Lossless</span>
                  </div>
                  <div className="flex justify-between w-full" style={{ paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-muted">Bitrate:</span>
                    <span style={{ color: 'var(--text)' }}>24-bit TrueColor</span>
                  </div>
                  <div className="flex justify-between w-full" style={{ paddingTop: '0.25rem' }}>
                    <span className="text-muted">Status:</span>
                    <span style={{ color: cameraOn ? 'var(--warning)' : photoSrc ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                      {cameraOn ? 'ACTIVE FEED' : photoSrc ? 'ACQUIRED' : 'STANDBY'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="surface p-5 rounded text-xs text-muted" style={{ border: '1px solid rgba(0,255,65,0.05)', background: 'rgba(0,255,65,0.01)', lineHeight: 1.6 }}>
                🛡️ <strong>Secure Capture System:</strong> Ensure camera lenses are clear and optimal lighting is provided for maximum image density.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Key Breaker Tab ── */}
      {tab === 'breaker' && (
        <div className="glass-card">
          <div className="flex items-start gap-2 mb-1">
            <Key size={20} color="var(--accent)" />
            <h2 className="m-0 text-lg" style={{ color: 'var(--text)' }}>AES-256 Key Breaker Simulation</h2>
          </div>
          <p className="text-muted text-sm mb-6">
            Upload any stego-image and simulate a brute-force attack. This simulation is designed to <strong>fail</strong> — demonstrating that AES-256 encryption is mathematically impossible to crack in any reasonable timeframe.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Target upload */}
            <div>
              {!target ? (
                <label id="target-upload-label" className="file-upload-area" style={{ display: 'block', cursor: 'pointer' }}>
                  <input type="file" accept="image/png" style={{ display: 'none' }} onChange={handleTargetUpload} />
                  <Key size={48} color="var(--accent)" style={{ margin: '0 auto 1rem' }} />
                  <h4 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>Upload Intercepted Target</h4>
                  <p className="text-muted text-sm">PNG stego-image</p>
                </label>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <img src={target} alt="target" className="image-preview" style={{ borderColor: 'var(--accent)', maxHeight: 220, width: '100%', objectFit: 'contain' }} />
                  <div className="flex gap-2 w-full">
                    <label className="btn btn-ghost btn-sm flex items-center gap-1 cursor-pointer" style={{ flex: 1, margin: 0, justifyContent: 'center' }}>
                      <RefreshCw size={12} /> CHANGE IMAGE
                      <input type="file" accept="image/png" style={{ display: 'none' }} onChange={handleTargetUpload} />
                    </label>
                    <button
                      className="btn btn-accent btn-sm flex items-center gap-1"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => { setTarget(null); setAttempts(0); setStatus('IDLE'); }}
                    >
                      <Trash2 size={12} /> REMOVE IMAGE
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Attack cluster */}
            <div className="flex flex-col gap-4">
              <div className="surface p-4 rounded mono" style={{ flex: 1 }}>
                <h4 className="text-accent text-sm mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Cpu size={14} /> Attack Cluster
                </h4>
                {[
                  { label: 'Status',    value: status,                color: status === 'FAILED – KEY NOT FOUND' ? 'var(--accent)' : cracking ? 'var(--warning)' : 'var(--text-muted)' },
                  { label: 'Attempts',  value: attempts.toLocaleString(), color: 'var(--primary)' },
                  { label: 'Speed',     value: apsDisplay,            color: '#00ccff' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between border-b py-2" style={{ fontSize: '0.82rem' }}>
                    <span className="text-muted">{row.label}</span>
                    <span style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
                <button
                  id="btn-bruteforce"
                  className="btn btn-accent w-full mt-4"
                  onClick={startBruteForce}
                  disabled={!target || cracking}
                >
                  {cracking ? 'CRACKING…' : 'LAUNCH BRUTE-FORCE'}
                </button>
              </div>

              {status === 'FAILED – KEY NOT FOUND' && (
                <div className="alert alert-error text-sm">
                  <ShieldAlert size={15} /> Attack failed. AES-256 withstands even 10¹⁵ guesses/sec.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <AESMathPanel />
          </div>

          <div className="glass-card mt-6" style={{ background: 'rgba(0,255,65,0.02)' }}>
            <h3 className="text-primary text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
              <Info size={16} /> How the Attack Simulator Works
            </h3>
            <div className="text-muted text-sm" style={{ lineHeight: 1.8 }}>
              <p className="mb-3">
                This simulator demonstrates the two primary vectors of attack against steganography: 
                <strong> Cryptographic Attacks</strong> and <strong>Forensic Tracking</strong>.
              </p>
              <ul className="flex flex-col gap-2">
                <li>
                  <strong className="text-primary">Camera Capture:</strong> Demonstrates a standard photo capture and download utility.
                </li>
                <li>
                  <strong className="text-accent">Key Breaker:</strong> Demonstrates a <em>Brute-Force Attack</em>. It attempts to decrypt the hidden payload 
                  by guessing billions of keys. Because StegoSec uses <strong>AES-256-GCM</strong>, the number of possible keys (1.16 × 10⁷⁷) 
                  is so vast that even all the computers on Earth working together for billions of years couldn't guess the right one.
                </li>
                <li>
                  <strong className="text-primary">Net Intercept:</strong> Visualizes a <em>Man-in-the-Middle (MITM)</em> attack. An adversary sniffing 
                  network traffic can see that an image is being sent, but because the payload is encrypted and hidden in the LSB, 
                  it looks like perfectly normal image noise. This provides <strong>Covert Communication</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Network Intercept Tab ── */}
      {tab === 'network' && (
        <div className="glass-card">
          <div className="flex items-start gap-2 mb-1">
            <Network size={20} color="var(--primary)" />
            <h2 className="m-0 text-lg" style={{ color: 'var(--text)' }}>Network Packet Interception</h2>
          </div>
          <p className="text-muted text-sm mb-6">
            Animated Wireshark-style demo showing what a network adversary sees when they intercept a stego-image in transit.
            Without the key, the ciphertext is statistically indistinguishable from image data.
          </p>

          <NetworkVisualizer />

          <div className="surface p-4 rounded mt-6 mono text-xs" style={{ color: '#555', lineHeight: 2.2 }}>
            <div className="text-primary mb-1">&gt; SIMULATED WIRESHARK CAPTURE — eth0 — port 443</div>
            <div><span style={{ color: '#333' }}>[HH:MM:SS.001]</span> TCP SYN → server:443</div>
            <div><span style={{ color: '#333' }}>[HH:MM:SS.050]</span> TLSv1.3 Handshake</div>
            <div><span style={{ color: '#333' }}>[HH:MM:SS.120]</span> HTTP/2 POST /api/send  (image/png · 83 KB)</div>
            <div><span style={{ color: 'var(--accent)' }}>[HH:MM:SS.200]</span> !! PACKET CAPTURED BY ADVERSARY</div>
            <div><span style={{ color: '#333' }}>[HH:MM:SS.250]</span> File-magic: PNG ✓  —  Appearance: normal photograph</div>
            <div><span style={{ color: '#333' }}>[HH:MM:SS.300]</span> LSB extract → HIGH ENTROPY (encrypted payload)</div>
            <div><span style={{ color: '#333' }}>[HH:MM:SS.400]</span> AES-256-GCM decrypt without key → AUTHENTICATION FAILED</div>
            <div><span style={{ color: 'var(--primary)' }}>[HH:MM:SS.401]</span> Adversary conclusion: standard PNG image. No actionable data found.</div>
          </div>
        </div>
      )}
    </div>
  );
}
