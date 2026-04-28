import React, { useState } from 'react';
import { MapPin, Plus, X, Send, AlertTriangle } from 'lucide-react';

export default function SOSPanel({ sos, resources, activeTab, setActiveTab, selectedSOS, onSelectSOS, onRelease, onToggleOffline, onAddSOS }) {
  const [showForm, setShowForm] = useState(false);
  const active = sos.filter(s => s.status !== 'Resolved');
  const resolved = sos.filter(s => s.status === 'Resolved');

  return (
    <>
      <div style={{ display: 'flex', gap: 2, background: 'var(--bg-inset)', borderRadius: 8, padding: 2 }}>
        <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')} style={{ flex: 1 }}>
          INCIDENTS ({active.length})
        </button>
        <button className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')} style={{ flex: 1 }}>
          RESOURCES ({resources.length})
        </button>
      </div>

      <div className="card custom-scrollbar" style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {activeTab === 'requests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '0 2px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Emergency Feed</span>
              <button className="btn-ghost" onClick={() => setShowForm(!showForm)} style={{ padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                {showForm ? <X size={10} /> : <Plus size={10} />} {showForm ? 'Cancel' : 'Report'}
              </button>
            </div>
            {showForm && <SOSForm onSubmit={d => { onAddSOS(d); setShowForm(false); }} />}
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {active.slice(0, 30).map(s => (
                <SOSCard key={s._id} sos={s} isSelected={selectedSOS?._id === s._id} onClick={() => onSelectSOS(s)} />
              ))}
              {active.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                  System Clear. No active emergencies.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {resources.map(r => (
              <ResourceRow key={r._id} r={r} onRelease={onRelease} onToggle={onToggleOffline} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SOSCard({ sos, isSelected, onClick }) {
  const isCritical = sos.urgency === 'Critical';
  const badge = {
    Critical: { bg: 'var(--red-bg)', color: 'var(--red-text)', border: '#fca5a5', icon: true },
    High: { bg: 'var(--amber-bg)', color: 'var(--amber-text)', border: '#fcd34d' },
    Medium: { bg: 'var(--blue-bg)', color: 'var(--blue-text)', border: '#93c5fd' },
  }[sos.urgency] || { bg: 'var(--bg-inset)', color: 'var(--text-secondary)', border: 'var(--border-light)' };

  return (
    <div onClick={onClick} className={`anim-slide-in ${isCritical ? 'pulse-critical' : ''}`} style={{
      padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
      background: isSelected ? 'var(--bg-inset)' : 'var(--bg-card)',
      border: isSelected ? '2px solid var(--blue)' : isCritical ? `1px solid ${badge.border}` : '1px solid var(--border-light)',
      position: 'relative',
      boxShadow: isCritical ? '0 2px 8px rgba(239, 68, 68, 0.08)' : 'none'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isCritical && <AlertTriangle size={12} color="var(--red)" />}
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-heading)' }}>{sos.caseId}</span>
        </div>
        <span style={{
          fontSize: 8, fontWeight: 800, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
          background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
        }}>{sos.urgency}</span>
      </div>
      
      <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>{sos.type}</div>
      
      {sos.summary && (
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 4, lineHeight: 1.3 }}>
          "{sos.summary.length > 60 ? sos.summary.substring(0, 60) + '...' : sos.summary}"
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <MapPin size={10} /> {sos.location?.address?.split(',')[0]}
      </div>

      {sos.assignedResource && (
        <div style={{ 
          fontSize: 10, color: 'var(--green-text)', fontWeight: 700, marginTop: 6, 
          display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: 'var(--green-bg)', borderRadius: 4, width: 'fit-content'
        }}>
          Dispatched: {sos.assignedResource.name}
        </div>
      )}
    </div>
  );
}

function ResourceRow({ r, onRelease, onToggle }) {
  const dot = { Available: 'var(--green)', Busy: 'var(--amber)', Offline: 'var(--text-muted)' }[r.status];
  return (
    <div className="anim-slide-in" style={{
      padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      border: '1px solid var(--border-light)',
      background: r.status === 'Offline' ? '#fcfcfc' : 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 0 2px ${dot}22` }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-heading)' }}>{r.name}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.type} • Lvl {r.skillLevel}</div>
        </div>
      </div>
      {r.status === 'Busy' && (
        <button onClick={e => { e.stopPropagation(); onRelease(r._id); }}
          style={{ fontSize: 10, color: 'var(--green)', cursor: 'pointer', background: 'var(--green-bg)', border: 'none', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>Release</button>
      )}
    </div>
  );
}

function SOSForm({ onSubmit }) {
  const types = ['Medical', 'Rescue', 'Food', 'Shelter'];
  const urgencies = ['Critical', 'High', 'Medium'];
  const locations = [
    { lat: 28.6315, lng: 77.2167, address: 'Connaught Place, Delhi' },
    { lat: 28.6129, lng: 77.2295, address: 'India Gate, Delhi' },
    { lat: 28.6506, lng: 77.2300, address: 'Chandni Chowk, Delhi' },
    { lat: 28.5677, lng: 77.2433, address: 'Lajpat Nagar, Delhi' },
  ];
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Medical');
  const [locIdx, setLocIdx] = useState(0);
  
  const sel = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 11, outline: 'none' };

  return (
    <div className="anim-scale-in" style={{ padding: 12, borderRadius: 8, background: 'var(--bg-inset)', marginBottom: 12, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>NEW INCIDENT REPORT</div>
      <textarea 
        placeholder="Describe the emergency (e.g. Building collapse with trapped people)..."
        value={description}
        onChange={e => setDescription(e.target.value)}
        style={{ ...sel, width: '100%', minHeight: 60, marginBottom: 8, resize: 'none' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <select value={type} onChange={e => setType(e.target.value)} style={sel}>{types.map(t => <option key={t}>{t}</option>)}</select>
        <select value={locIdx} onChange={e => setLocIdx(+e.target.value)} style={sel}>{locations.map((l, i) => <option key={i} value={i}>{l.address.split(',')[0]}</option>)}</select>
      </div>
      <button onClick={() => {
        if (!description) return;
        onSubmit({ caseId: `SOS-${Math.floor(1000 + Math.random() * 9000)}`, description, type, location: locations[locIdx] });
        setDescription('');
      }}
        className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Send size={12} /> Submit to AI Dispatch
      </button>
    </div>
  );
}
