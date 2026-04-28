import React from 'react';
import { MapPin, Brain, Shield, Info, Activity, Clock, CheckCircle, Target } from 'lucide-react';

export default function CommandPanel({ metrics, scenarios, simulationRunning, onRunScenario, selectedSOS, resources, pending, assigned, resolved }) {
  const ai = selectedSOS?.aiIntelligence;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* 1. SCENARIO CONTROL */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={12} /> Mission Deployment
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {scenarios.map(s => (
            <button key={s.key} className="btn-scenario" onClick={() => onRunScenario(s.key)} disabled={simulationRunning} style={{ 
              padding: '8px 10px', fontSize: 11, background: 'var(--bg-inset)', border: '1px solid var(--border-light)', borderRadius: 6, cursor: 'pointer', textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. REAL-TIME IMPACT METRICS */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={12} /> Impact Analytics
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <MetricBox label="Active" value={pending + assigned} icon={<Clock size={12} />} color="var(--amber)" />
          <MetricBox label="Resolved" value={resolved} icon={<CheckCircle size={12} />} color="var(--green)" />
          <MetricBox label="Efficiency" value={`${metrics.efficiencyScore || 0}%`} icon={<Target size={12} />} color="var(--blue)" />
          <MetricBox label="Avg ETA" value={`${metrics.avgResponseTime || 0}m`} icon={<Clock size={12} />} color="var(--text-secondary)" />
        </div>

        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>Resource Utilization</span>
            <span>{Math.round(((resources.filter(r => r.status === 'Busy').length) / (resources.length || 1)) * 100)}%</span>
          </div>
          <ResourceBar resources={resources} />
        </div>
      </div>

      {/* 3. INCIDENT INTELLIGENCE (Dynamic Panel) */}
      <div className="card custom-scrollbar" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        {!selectedSOS ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Info size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 12, fontWeight: 600 }}>No Incident Selected</div>
            <div style={{ fontSize: 10 }}>Select an SOS from the live feed to view AI intelligence and dispatch reasoning.</div>
          </div>
        ) : (
          <div className="anim-slide-in" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Brain size={16} color="var(--blue)" />
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Incident Intelligence</div>
            </div>

            {/* AI Summary Section */}
            <div style={{ background: 'var(--blue-bg)', padding: '10px 12px', borderRadius: 8, border: '1px solid #bfdbfe', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue-text)', marginBottom: 4, textTransform: 'uppercase' }}>AI Analysis</div>
              <div style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 600, lineHeight: 1.4 }}>{selectedSOS.summary || "Processing incident description..."}</div>
              {ai?.reasoning && (
                <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 6, fontStyle: 'italic' }}>
                  <b>Reasoning:</b> {ai.reasoning}
                </div>
              )}
            </div>

            {/* AI Action Plan */}
            {ai?.action_plan && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Recommended Action Plan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ai.action_plan.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--text-primary)' }}>
                      <span style={{ color: 'var(--blue)', fontWeight: 800 }}>•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explainable Decision Layer */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Dispatch Explanation</div>
              {selectedSOS.assignedResource ? (
                <div style={{ padding: '8px 10px', background: 'var(--bg-inset)', borderRadius: 6, fontSize: 10.5, color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--green-text)', marginBottom: 4 }}>✓ Decision Finalized</div>
                  {selectedSOS.assignedResource.reason || "Assigned based on optimal distance and skill compatibility scoring."}
                </div>
              ) : (
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Awaiting resource availability for optimal dispatch...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, icon, color }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--bg-inset)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function ResourceBar({ resources }) {
  const a = resources.filter(r => r.status === 'Available').length;
  const b = resources.filter(r => r.status === 'Busy').length;
  const o = resources.filter(r => r.status === 'Offline').length;
  const t = resources.length || 1;
  return (
    <div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-inset)' }}>
        <div style={{ width: `${(a / t) * 100}%`, background: 'var(--green)', transition: 'width 0.4s' }} />
        <div style={{ width: `${(b / t) * 100}%`, background: 'var(--amber)', transition: 'width 0.4s' }} />
        <div style={{ width: `${(o / t) * 100}%`, background: '#cbd5e1', transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--green-text)' }}>{a} Available</span>
        <span style={{ color: 'var(--amber-text)' }}>{b} Deployed</span>
        <span>{o} Offline</span>
      </div>
    </div>
  );
}
