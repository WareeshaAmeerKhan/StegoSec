import React, { useState, useRef } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { chiSquareTest, generateBitPlane, computeHistogram } from '../utils/steganography';
import { Activity, BarChart2, Hash, UploadCloud, Info, CheckCircle, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

// ── Mini SVG histogram renderer ────────────────────────────────────────────
function Histogram({ data, color, label }) {
  if (!data) return null;
  const max = Math.max(...data, 1);
  return (
    <div>
      {label && <p className="text-xs text-muted mb-1">{label}</p>}
      <svg
        width="100%"
        viewBox="0 0 256 64"
        preserveAspectRatio="none"
        style={{ height: 64, display: 'block', borderBottom: '1px solid var(--border)' }}
      >
        {data.map((v, i) => (
          <rect key={i} x={i} y={64 - (v / max) * 64} width={1} height={(v / max) * 64} fill={color} opacity="0.85" />
        ))}
      </svg>
    </div>
  );
}

// ── Tooltip component ──────────────────────────────────────────────────────
function Tip({ text, children }) {
  return (
    <span className="tooltip-wrap" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      {children}
      <span style={{ cursor: 'help', color: 'var(--text-muted)' }}><Info size={13} /></span>
      <span className="tooltip-box">{text}</span>
    </span>
  );
}

export default function SteganalysisPage() {
  const { logEvent } = useAudit();

  const [imageEl,    setImageEl]    = useState(null);
  const [imageSrc,   setImageSrc]   = useState(null);
  const [chiResult,  setChiResult]  = useState(null);
  const [bitPlane,   setBitPlane]   = useState(null);
  const [histogram,  setHistogram]  = useState(null);
  const [busy,       setBusy]       = useState(false);

  const fileRef = useRef(null);

  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        setImageSrc(ev.target.result);
        setChiResult(null);
        setBitPlane(null);
        setHistogram(null);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = () => {
    if (!imageEl) return;
    setBusy(true);
    setTimeout(() => {
      try {
        const chi  = chiSquareTest(imageEl);
        const bp   = generateBitPlane(imageEl);
        const hist = computeHistogram(imageEl);
        setChiResult(chi);
        setBitPlane(bp);
        setHistogram(hist);
        logEvent('STEGANALYSIS', `Analysis complete: ${chi.verdict} (${chi.probability.toFixed(1)}%)`, true, 'analyst');
      } catch (err) {
        alert('Analysis error: ' + err.message);
      } finally {
        setBusy(false);
      }
    }, 80);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-3 m-0" style={{ fontSize: '1.25rem', letterSpacing: '0.08em' }}>
          <Activity size={26} color="var(--primary)" />
          <span>FORENSIC STEGANALYSIS</span>
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>

        {/* ── Left: Upload + Controls ── */}
        <div className="flex flex-col gap-4">
          <input type="file" ref={fileRef} onChange={handleUpload} accept="image/*" style={{ display: 'none' }} />

          {imageSrc ? (
            <div className="flex flex-col gap-2">
              <div
                id="stego-upload-area"
                className="file-upload-area"
                style={{ cursor: 'default', padding: '0.75rem' }}
              >
                <img src={imageSrc} alt="target" style={{ width: '100%', borderRadius: 4, border: '1px solid var(--border)', display: 'block' }} />
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm flex items-center gap-1"
                  style={{ flex: 1 }}
                  onClick={() => fileRef.current.click()}
                >
                  <RefreshCw size={12} /> CHANGE IMAGE
                </button>
                <button
                  className="btn btn-accent btn-sm flex items-center gap-1"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setImageSrc(null);
                    setImageEl(null);
                    setChiResult(null);
                    setBitPlane(null);
                    setHistogram(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  <Trash2 size={12} /> REMOVE IMAGE
                </button>
              </div>
            </div>
          ) : (
            <div
              id="stego-upload-area"
              className="file-upload-area"
              onClick={() => fileRef.current.click()}
            >
              <UploadCloud size={44} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
              <h4 style={{ color: 'var(--text)' }}>Load Evidence</h4>
              <p className="text-muted text-xs mt-1">PNG REQUIRED (JPEGs will fail)</p>
            </div>
          )}

          <button
            id="btn-run-analysis"
            className="btn btn-primary w-full"
            onClick={runAnalysis}
            disabled={!imageEl || busy}
          >
            {busy ? 'ANALYSING…' : 'RUN FULL ANALYSIS SUITE'}
          </button>

          <div className="glass-card" style={{ padding: '1rem' }}>
            <p className="text-xs text-primary uppercase tracking-widest mb-3">How Steganalysis Works</p>
            <div className="text-muted text-xs" style={{ lineHeight: 1.8 }}>
              <p className="mb-3">
                Steganalysis is the art of detecting hidden data. <strong className="text-primary">Note:</strong> 
                StegoSec uses AES-256-GCM encryption, which makes the payload look like random noise. 
                If the hidden message is small, it will correctly appear as <strong className="text-primary">CLEAN</strong> 
                because it is statistically indistinguishable from the image's natural grain.
              </p>
              <ul className="flex flex-col gap-2 p-0" style={{ listStyle: 'none' }}>
                <li>
                  <strong className="text-primary">1. Chi-Square Analysis:</strong> 
                  Natural images have a specific distribution of "Pairs of Values" (adjacent pixel intensities). 
                  LSB embedding equalizes these pairs. The test measures the statistical probability that the image has been tampered with.
                </li>
                <li>
                  <strong className="text-primary">2. Bit-Plane Slicing:</strong> 
                  By isolating only the Least Significant Bit (LSB) of every pixel, we can see "noise". 
                  In natural images, this noise has some structure. Encrypted data looks like pure, uniform random noise.
                </li>
                <li>
                  <strong className="text-primary">3. Histogram Analysis:</strong> 
                  Hidden data creates "spikes" or "flatness" in the intensity histogram that wouldn't occur naturally, 
                  especially in the LSB-heavy regions of the color spectrum.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="flex flex-col gap-4">

          {/* Chi-Square */}
          <div className="glass-card">
            <h3 className="flex items-center gap-2 mb-4 text-primary m-0 text-sm uppercase tracking-widest">
              <Hash size={16} />
              <Tip text="The Chi-Square Pairs of Values test checks if adjacent pixel value pairs are artificially equalised — a hallmark of LSB steganography.">
                Chi-Square PoV Test
              </Tip>
            </h3>

            {chiResult ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="mono text-sm flex flex-col gap-2">
                  {[
                    { l: 'χ² Statistic',    v: chiResult.chiSquare.toFixed(2),              c: 'var(--text)' },
                    { l: 'Degrees of Freedom', v: chiResult.degreesOfFreedom,               c: 'var(--text)' },
                    { l: 'Stego Probability', v: chiResult.probability.toFixed(2) + '%',    c: chiResult.probability > 70 ? 'var(--accent)' : 'var(--primary)' },
                    { l: 'Verdict',           v: chiResult.verdict,                          c: chiResult.probability > 70 ? 'var(--accent)' : 'var(--primary)' },
                  ].map(row => (
                    <div key={row.l} className="flex justify-between border-b py-1" style={{ fontSize: '0.8rem' }}>
                      <span className="text-muted">{row.l}</span>
                      <span style={{ color: row.c, fontWeight: 700 }}>{row.v}</span>
                    </div>
                  ))}
                </div>

                <div className="surface p-4 rounded flex items-center justify-center text-center">
                  {chiResult.probability > 70 ? (
                    <div>
                      <AlertTriangle size={32} color="var(--accent)" style={{ margin: '0 auto 0.5rem' }} />
                      <div className="text-accent font-bold">ANOMALY DETECTED</div>
                      <div className="text-xs text-muted mt-1">LSB distribution artificially equalised</div>
                    </div>
                  ) : (
                    <div>
                      <CheckCircle size={32} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
                      <div className="text-primary font-bold">CLEAN</div>
                      <div className="text-xs text-muted mt-1">Natural pixel distribution detected</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-4">Run analysis to generate statistics.</p>
            )}
          </div>

          {/* Histogram + Bit Plane */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

            <div className="glass-card">
              <h3 className="flex items-center gap-2 mb-4 text-primary m-0 text-sm uppercase tracking-widest">
                <BarChart2 size={16} />
                <Tip text="Per-channel pixel intensity histogram. Uniform distribution across the entire range can indicate encrypted data injection.">
                  Colour Histogram
                </Tip>
              </h3>
              {histogram ? (
                <div className="flex flex-col gap-2">
                  <Histogram data={histogram.r} color="rgba(255,60,60,0.9)"  label="Red channel" />
                  <Histogram data={histogram.g} color="rgba(0,255,65,0.9)"   label="Green channel" />
                  <Histogram data={histogram.b} color="rgba(60,120,255,0.9)" label="Blue channel" />
                </div>
              ) : (
                <div className="text-muted text-sm text-center py-8">Awaiting analysis…</div>
              )}
            </div>

            <div className="glass-card">
              <h3 className="flex items-center gap-2 mb-4 text-primary m-0 text-sm uppercase tracking-widest">
                <Activity size={16} />
                <Tip text="The LSB bit-plane renders each pixel as white (LSB=1) or black (LSB=0). Random noise = encrypted data. Structured patterns = unencrypted or watermarked data.">
                  LSB Bit-Plane
                </Tip>
              </h3>
              {bitPlane ? (
                <>
                  <img src={bitPlane} alt="bit plane" style={{ width: '100%', borderRadius: 4, background: '#fff', border: '1px solid var(--border)' }} />
                  <p className="text-xs text-muted mt-2 text-center">White = LSB 1 &nbsp;|&nbsp; Black = LSB 0</p>
                </>
              ) : (
                <div className="text-muted text-sm text-center py-8">Awaiting analysis…</div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
