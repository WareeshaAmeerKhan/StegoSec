import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAudit } from '../contexts/AuditContext';
import { extractWatermark } from '../utils/steganography';
import {
  ShieldAlert, Search, UploadCloud, UserX,
  FileSearch, CheckCircle, Trash2, RefreshCw
} from 'lucide-react';

export default function ForensicLeakDetectorPage() {
  const { user } = useAuth();
  const { logEvent } = useAudit();

  // ── Analyzer Section State ──
  const fileAnalyzeRef = useRef(null);
  const [evidenceImg, setEvidenceImg] = useState(null);
  const [leakResult, setLeakResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // ── Analyzer Evidence Upload Handler ──
  const handleEvidenceUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAnalyzing(true);
    setLeakResult(null);
    logEvent('FORENSICS', `Leak detection scanning initiated on file: ${file.name}`, true, user.id);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setEvidenceImg(ev.target.result);
      const img = new Image();
      img.onload = () => {
        try {
          const result = extractWatermark(img);
          setTimeout(() => {
            setLeakResult(result);
            setAnalyzing(false);
            if (result) {
              logEvent('FORENSICS', `Watermark successfully extracted: ${result}`, true, user.id);
            } else {
              logEvent('FORENSICS', `No forensic watermark found in image`, true, user.id);
            }
          }, 800); // Simulate forensic scanning animation
        } catch (err) {
          setLeakResult('');
          setAnalyzing(false);
          logEvent('FORENSICS', `Evidence scan failed: ${err.message}`, false, user.id);
        }
      };
      img.onerror = () => {
        setAnalyzing(false);
        alert('Failed to load evidence image file.');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-3 m-0" style={{ fontSize: '1.25rem', letterSpacing: '0.08em' }}>
          <ShieldAlert size={26} color="var(--primary)" />
          <span>FORENSIC LEAK DETECTOR</span>
        </h1>
      </div>

      <div className="glass-card flex flex-col gap-4">
        <h3 className="text-primary text-sm uppercase tracking-widest mb-2 flex items-center gap-2 m-0">
          <FileSearch size={18} /> Forensic Evidence Analyzer
        </h3>
        <p className="text-muted text-xs mb-4" style={{ lineHeight: 1.6 }}>
          Upload an intercepted image file suspected of leakage. The engine will scan the lower-order bit-planes 
          to extract any hidden tracer payloads.
        </p>

        <input
          type="file"
          ref={fileAnalyzeRef}
          onChange={handleEvidenceUpload}
          accept="image/png"
          style={{ display: 'none' }}
        />

        {evidenceImg ? (
          <div className="flex flex-col items-center gap-3 p-4 border rounded" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <img src={evidenceImg} alt="Evidence preview" className="image-preview" style={{ maxHeight: '220px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 4 }} />
            <div className="flex gap-2 justify-center w-full">
              <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => fileAnalyzeRef.current.click()}>
                <RefreshCw size={12} /> CHANGE IMAGE
              </button>
              <button className="btn btn-accent btn-sm flex items-center gap-1" onClick={() => {
                setEvidenceImg(null);
                setLeakResult(null);
                if (fileAnalyzeRef.current) fileAnalyzeRef.current.value = '';
              }}>
                <Trash2 size={12} /> REMOVE IMAGE
              </button>
            </div>
          </div>
        ) : (
          <div
            className="file-upload-area flex flex-col items-center justify-center"
            onClick={() => fileAnalyzeRef.current.click()}
            style={{ borderStyle: 'dashed', minHeight: 200, cursor: 'pointer', padding: '2.5rem' }}
          >
            <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <p className="text-primary font-bold text-sm">CLICK TO ANALYZE EVIDENCE</p>
            <p className="text-muted text-xs mt-2">PNG Images only · Invisible watermark check</p>
          </div>
        )}

        <div className="surface p-4 rounded mt-2" style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {analyzing && (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="spinner mb-3"></div>
              <p className="text-muted text-xs mono">Extracting and parsing pixel data...</p>
            </div>
          )}

          {!analyzing && leakResult && (
            <div className="flex flex-col gap-3 animate-fade-in text-xs">
              <div className="alert alert-error flex items-start gap-3" style={{ margin: 0 }}>
                <UserX size={20} />
                <div>
                  <div className="font-bold uppercase tracking-widest text-xs">Leaker Identified</div>
                  <div className="text-xs mt-1">Forensic tracer payload successfully extracted from pixel LSB.</div>
                </div>
              </div>

              <div className="mono text-xs p-3 rounded bg-black" style={{ border: '1px solid var(--border)' }}>
                <div className="text-muted mb-1">// Watermark Contents</div>
                <div className="text-primary break-all font-bold">{leakResult}</div>
              </div>
            </div>
          )}

          {!analyzing && leakResult === "" && (
            <div className="alert alert-success flex items-start gap-3 text-xs" style={{ margin: 0 }}>
              <CheckCircle size={20} />
              <div>
                <div className="font-bold uppercase tracking-widest text-xs">No Tracer Found</div>
                <div className="text-xs mt-1">This image does not contain any valid StegoSec forensic watermarks.</div>
              </div>
            </div>
          )}

          {!analyzing && leakResult === null && (
              <div className="flex items-center justify-center text-muted opacity-40 text-xs py-8 gap-2">
                <Search size={24} />
                <span>No evidence analyzed. Upload a file above.</span>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
