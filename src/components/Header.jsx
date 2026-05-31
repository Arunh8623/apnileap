import React, { useState } from 'react';
import { Bell, Search, RefreshCw } from 'lucide-react';

export default function Header({ title, subtitle, onRefresh, loading }) {
  const [search, setSearch] = useState('');

  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexShrink: 0,
    }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 320, margin: '0 auto' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search issues, sprints..."
            style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onRefresh && (
          <button onClick={onRefresh} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        )}
        <button className="btn btn-secondary" style={{ padding: '6px 12px', position: 'relative' }}>
          <Bell size={14} />
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent-rose)',
          }} />
        </button>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer',
          flexShrink: 0,
        }}>
          A
        </div>
      </div>
    </header>
  );
}
