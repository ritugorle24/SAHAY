import React from 'react';
import { RotateCcw, Radio, Shield } from 'lucide-react';

export default function Header({ metrics, pending, assigned, resolved, simulationRunning, activeScenario, onReset }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '12px 20px',
      background: 'var(--bg-sidebar)',
      color: '#fff',
      borderRadius: '8px',
      marginBottom: '12px',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={20} color="#60a5fa" />
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>
            SAHAY
          </h1>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
            Emergency Command Center
          </span>
        </div>
        {simulationRunning && (
          <span className="anim-pulse-dot" style={{
            fontSize: 10, fontWeight: 700, color: '#f87171',
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(220, 38, 38, 0.2)', padding: '2px 8px', borderRadius: 4,
            border: '1px solid rgba(220, 38, 38, 0.3)'
          }}>
            <Radio size={10} /> SIMULATION ACTIVE
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Stat label="Pending" value={pending} color="#f87171" />
          <Stat label="Assigned" value={assigned} color="#fbbf24" />
          <Stat label="Resolved" value={resolved} color="#34d399" />
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <Stat label="Efficiency" value={`${metrics.efficiencyScore || 0}%`} color="#60a5fa" />
        </div>
        
        <button onClick={onReset} style={{
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: 11,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer'
        }}>
          <RotateCcw size={12} /> System Reset
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
