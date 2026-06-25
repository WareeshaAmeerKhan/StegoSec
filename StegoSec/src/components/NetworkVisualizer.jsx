import React, { useState, useEffect } from 'react';
import { User, FileImage, ShieldAlert } from 'lucide-react';

const STEPS = [
  { label: 'Embedding encrypted payload into carrier image…', nodeHighlight: 0 },
  { label: 'Transmitting packet over network…',               nodeHighlight: 1 },
  { label: 'PACKET INTERCEPTED by adversary node!',           nodeHighlight: 2, warn: true },
  { label: 'Adversary extracting payload…',                   nodeHighlight: 2 },
  { label: 'Result: Normal PNG image. No readable data found.', nodeHighlight: 2 },
  { label: 'Packet delivered to legitimate receiver. ✓',       nodeHighlight: 4 },
];

export default function NetworkVisualizer() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % STEPS.length), 2200);
    return () => clearInterval(t);
  }, []);

  const pct = ['8%', '30%', '50%', '70%', '88%', '8%'][step] || '8%';

  return (
    <div style={{ position: 'relative', height: 180, background: '#030303', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', padding: '0 1.5rem' }}>
      {/* Nodes */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%' }}>
        {/* Sender */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 3 }}>
          <User size={28} color={step <= 1 ? 'var(--primary)' : '#444'} style={{ transition: 'color 0.4s' }} />
          <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>SENDER</span>
        </div>

        {/* Adversary (middle) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 3 }}>
          <ShieldAlert size={28} color={step >= 2 && step <= 4 ? 'var(--accent)' : '#333'} style={{ transition: 'color 0.4s' }} />
          <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>ADVERSARY</span>
        </div>

        {/* Receiver */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 3 }}>
          <User size={28} color={step === 5 ? 'var(--primary)' : '#444'} style={{ transition: 'color 0.4s' }} />
          <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>RECEIVER</span>
        </div>
      </div>

      {/* Wire */}
      <div style={{ position: 'absolute', top: '42%', left: '10%', right: '10%', height: 1, background: '#1a1a1a' }} />

      {/* Packet */}
      <div style={{
        position: 'absolute',
        top: 'calc(42% - 12px)',
        left: pct,
        transition: 'left 1.8s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 4,
        background: '#080808',
        border: `1px solid ${step >= 2 && step <= 4 ? 'var(--accent)' : 'var(--primary)'}`,
        borderRadius: 4,
        padding: '2px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: step >= 2 && step <= 4 ? 'var(--accent)' : 'var(--primary)',
        fontFamily: 'monospace',
        transition: 'left 1.8s cubic-bezier(0.4,0,0.2,1), color 0.3s, border-color 0.3s',
      }}>
        <FileImage size={14} /> PNG
      </div>

      {/* Status label */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        color: STEPS[step]?.warn ? 'var(--accent)' : 'var(--primary)',
        padding: '0 1rem',
        transition: 'color 0.3s',
      }}>
        {STEPS[step]?.label}
      </div>
    </div>
  );
}
