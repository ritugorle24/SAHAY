import React from 'react';
import { Terminal, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';

export default function ActivityLog({ logs }) {
  return (
    <div className="card" style={{ height: 180, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border-light)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <Terminal size={12} /> Live Decision Audit
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--bg-inset)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-secondary)' }}>
          {logs.length} LOGS
        </span>
      </div>
      <div className="custom-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '6px 8px' }}>
        {logs.slice(0, 50).map(log => (
          <div key={log.id} className={`log-entry log-${log.type}`} style={{ 
            marginBottom: 4, 
            padding: '4px 6px', 
            borderRadius: 4, 
            background: log.type === 'reallocation' ? 'var(--red-bg)' : log.type === 'auto_assigned' ? 'var(--green-bg)' : 'transparent',
            borderLeft: log.type === 'reallocation' ? '2px solid var(--red)' : log.type === 'auto_assigned' ? '2px solid var(--green)' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>
                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {log.type === 'reallocation' && <Zap size={10} color="var(--red)" />}
                {log.type === 'auto_assigned' && <CheckCircle2 size={10} color="var(--green)" />}
              </div>
            </div>
            <div style={{ 
              fontSize: 10.5, 
              lineHeight: 1.4,
              fontWeight: log.type === 'reallocation' || log.type === 'sos_received' ? 600 : 400,
              color: log.type === 'reallocation' ? 'var(--red-text)' : log.type === 'auto_assigned' ? 'var(--green-text)' : 'var(--text-secondary)'
            }}>
              {log.message}
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 11 }}>
            Awaiting field data...
          </div>
        )}
      </div>
    </div>
  );
}
