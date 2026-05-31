import React from 'react';
import { useAudit } from '../contexts/AuditContext';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AuditLogPage() {
  const { logs } = useAudit();
  
  const fmt = ts => new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-3 m-0" style={{ fontSize: '1.25rem', letterSpacing: '0.08em' }}>
          <Shield size={26} color="var(--primary)" />
          ADMIN AUDIT LOG
        </h1>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="p-4 border-b bg-surface flex justify-between items-center">
           <span className="text-xs uppercase tracking-widest text-primary font-bold">System Event Stream</span>
           <span className="text-xs text-muted mono">{logs.length} Total Events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Agent</th>
                <th>Event</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: '3rem' }}>
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                [...logs].reverse().map((log, i) => (
                  <tr key={log.id ?? i} className={log.success ? '' : 'row-error'}>
                    <td className="mono text-xs text-muted">{fmt(log.timestamp)}</td>
                    <td className="mono text-xs text-primary">{log.userId}</td>
                    <td className="mono text-xs" style={{ color: 'var(--text)' }}>{log.action}</td>
                    <td className="text-xs text-muted" style={{ maxWidth: 300 }}>{log.details}</td>
                    <td>
                      {log.success
                        ? <span className="badge badge-success flex items-center gap-1" style={{ display: 'inline-flex' }}>
                            <CheckCircle size={11} /> OK
                          </span>
                        : <span className="badge badge-error flex items-center gap-1" style={{ display: 'inline-flex' }}>
                            <AlertTriangle size={11} /> FAIL
                          </span>
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
