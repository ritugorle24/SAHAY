import React from 'react';

export default function ToastContainer({ toasts }) {
  const p = {
    critical: { bg: 'var(--red-bg)', border: '1px solid #fecaca', color: 'var(--red-text)' },
    warning: { bg: 'var(--amber-bg)', border: '1px solid #fde68a', color: 'var(--amber-text)' },
    success: { bg: 'var(--green-bg)', border: '1px solid #a7f3d0', color: 'var(--green-text)' },
    info: { bg: 'var(--blue-bg)', border: '1px solid #bfdbfe', color: 'var(--blue-text)' },
  };
  return (
    <div className="toast-container">
      {toasts.map(t => {
        const s = p[t.type] || p.info;
        return (
          <div key={t.id} className="toast" style={{ background: s.bg, border: s.border, color: s.color }}>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
