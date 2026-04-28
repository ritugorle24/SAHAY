import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const sosIcon = (urgency, selected) => {
  const c = { Critical: '#dc3545', High: '#d97706', Medium: '#2563eb' }[urgency] || '#2563eb';
  const sz = selected ? 16 : 11;
  const ring = selected ? `box-shadow: 0 0 0 3px ${c}33; ` : '';
  return L.divIcon({
    html: `<div style="background:${c};width:${sz}px;height:${sz}px;border-radius:50%;border:2px solid #fff;${ring}box-shadow:0 1px 3px rgba(0,0,0,0.25);"></div>`,
    className: 'custom-div-icon', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
  });
};

const resIcon = (status) => {
  const c = { Available: '#059669', Busy: '#d97706', Offline: '#9ca3af' }[status] || '#9ca3af';
  return L.divIcon({
    html: `<div style="background:${c};width:8px;height:8px;border-radius:2px;border:1.5px solid #fff;transform:rotate(45deg);box-shadow:0 1px 2px rgba(0,0,0,0.2);"></div>`,
    className: 'custom-div-icon', iconSize: [8, 8], iconAnchor: [4, 4],
  });
};

function FlyTo({ sos }) {
  const map = useMap();
  useEffect(() => { if (sos) map.flyTo([sos.location.lat, sos.location.lng], 15, { duration: 1.2 }); }, [sos, map]);
  return null;
}

export default function MapPanel({ sos, resources, selectedSOS, onSelectSOS, activeScenario }) {
  const active = sos.filter(s => s.status !== 'Resolved');
  const pending = active.filter(s => s.status === 'Pending').length;

  return (
    <div className="card" style={{ flex: 1, minHeight: 300, position: 'relative' }}>
      <MapContainer center={[28.6139, 77.2090]} zoom={13} scrollWheelZoom zoomControl={false}
        style={{ width: '100%', height: '100%', borderRadius: 12 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {active.map(s => (
          <Marker key={s._id} position={[s.location.lat, s.location.lng]}
            icon={sosIcon(s.urgency, selectedSOS?._id === s._id)}
            eventHandlers={{ click: () => onSelectSOS(s) }}>
            <Popup>
              <div style={{ fontFamily: 'Inter', fontSize: 11 }}>
                <b>{s.caseId}</b> — {s.type} · {s.urgency}<br />
                {s.location.address}
                {s.assignedResource && <div style={{ color: '#059669', marginTop: 3 }}>→ {s.assignedResource.name}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        {resources.map(r => (
          <Marker key={r._id} position={[r.location.lat, r.location.lng]} icon={resIcon(r.status)}>
            <Popup><div style={{ fontFamily: 'Inter', fontSize: 11 }}><b>{r.name}</b> · {r.type} · {r.status}</div></Popup>
          </Marker>
        ))}
        {activeScenario && (
          <Circle center={[activeScenario.epicenter.lat, activeScenario.epicenter.lng]}
            radius={activeScenario.radiusKm * 1000}
            pathOptions={{ color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.04, weight: 1, dashArray: '6 4', opacity: 0.4 }} />
        )}
        <FlyTo sos={selectedSOS} />
      </MapContainer>

      {/* Minimal floating status */}
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1000, pointerEvents: 'none' }}>
        <div className="card-glass" style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {active.length} active · {pending} pending
        </div>
      </div>
    </div>
  );
}
