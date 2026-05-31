import React from 'react';

export default function StatCard({ label, value, sub, color = 'var(--accent-blue)', icon: Icon, trend }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
        {Icon && (
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} style={{ color }} />
          </div>
        )}
      </div>
      <div className="stat-number" style={{ color, marginBottom: 4 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ marginTop: 8, fontSize: 11, color: trend >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}
