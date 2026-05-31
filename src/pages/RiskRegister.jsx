import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Plus, Eye, Shield } from 'lucide-react';
import Header from '../components/Header';
import IssueModal from '../components/IssueModal';
import IssueDetail from '../components/IssueDetail';
import { getRisks, getProjects } from '../services/api';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = { Highest: '#f43f5e', High: '#f97316', Medium: '#f59e0b', Low: '#3b82f6', Lowest: '#64748b' };
const IMPACT = { Highest: 'Critical', High: 'High', Medium: 'Medium', Low: 'Low', Lowest: 'Minimal' };
const STATUS_BADGE = { 'To Do': 'blue', 'In Progress': 'amber', 'Done': 'green', 'Review': 'violet', 'Backlog': 'gray' };

export default function RiskRegister() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ priority: '', status: '', project: '' });
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewKey, setViewKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.allSettled([getRisks(), getProjects()]);
      if (r.status === 'fulfilled') setRisks(r.value?.risks || []);
      if (p.status === 'fulfilled') setProjects(p.value || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = risks.filter(r => {
    const f = r.fields;
    if (filter.priority && f?.priority?.name !== filter.priority) return false;
    if (filter.status && f?.status?.name !== filter.status) return false;
    if (filter.project && f?.project?.key !== filter.project) return false;
    return true;
  });

  const byPriority = { Highest: 0, High: 0, Medium: 0, Low: 0, Lowest: 0 };
  risks.forEach(r => { const p = r.fields?.priority?.name; if (p && byPriority[p] !== undefined) byPriority[p]++; });
  const openRisks = risks.filter(r => r.fields?.status?.name !== 'Done').length;
  const criticalRisks = (byPriority.Highest || 0) + (byPriority.High || 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="Risk Register" subtitle="Enterprise risk tracking & mitigation" onRefresh={load} loading={loading} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        {/* Summary cards */}
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {[
            { label: 'TOTAL RISKS', value: risks.length, color: 'var(--accent-blue)' },
            { label: 'OPEN', value: openRisks, color: 'var(--accent-amber)' },
            { label: 'CRITICAL', value: criticalRisks, color: 'var(--accent-rose)' },
            { label: 'MITIGATED', value: risks.length - openRisks, color: 'var(--accent-emerald)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? '...' : s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Risk Heatmap</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {Object.entries(byPriority).map(([p, count]) => (
              <div key={p} style={{
                padding: '14px 10px', borderRadius: 8, textAlign: 'center',
                background: `${PRIORITY_COLORS[p]}18`,
                border: `1px solid ${PRIORITY_COLORS[p]}30`,
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: PRIORITY_COLORS[p] }}>{count}</div>
                <div style={{ fontSize: 11, color: PRIORITY_COLORS[p], fontWeight: 600, marginTop: 2 }}>{p}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{IMPACT[p]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters + table */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Priority', key: 'priority', opts: ['Highest','High','Medium','Low','Lowest'] },
            { label: 'Status', key: 'status', opts: ['To Do','In Progress','Review','Done'] },
          ].map(f => (
            <select key={f.key} value={filter[f.key]} onChange={e => setFilter(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ height: 34, fontSize: 12, width: 'auto' }}>
              <option value="">All {f.label}s</option>
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <select value={filter.project} onChange={e => setFilter(f => ({ ...f, project: e.target.value }))} style={{ height: 34, fontSize: 12, width: 'auto' }}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.key}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            <Plus size={14} /> Log Risk
          </button>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px 90px 120px 80px 80px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            {['KEY','RISK SUMMARY','PRIORITY','IMPACT','PROJECT','STATUS','ACTIONS'].map(h => (
              <span key={h} style={{ fontSize: 10, letterSpacing: '1px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{h}</span>
            ))}
          </div>
          {loading ? (
            <div style={{ padding: 32, display: 'flex', justifyContent: 'center', gap: 6 }}>
              <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <Shield size={36} style={{ marginBottom: 10, opacity: 0.25 }} />
              <p>No risks found. Great governance!</p>
            </div>
          ) : filtered.map(risk => {
            const f = risk.fields;
            const pColor = PRIORITY_COLORS[f?.priority?.name] || 'var(--text-muted)';
            return (
              <div key={risk.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px 90px 120px 80px 80px', padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: 'var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>{risk.key}</span>
                <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{f?.summary}</span>
                <span style={{ fontSize: 11, color: pColor, fontWeight: 600 }}>● {f?.priority?.name}</span>
                <span style={{ fontSize: 11, color: pColor }}>{IMPACT[f?.priority?.name]}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f?.project?.name}</span>
                <span className={`badge badge-${STATUS_BADGE[f?.status?.name] || 'gray'}`} style={{ fontSize: 10 }}>{f?.status?.name}</span>
                <button onClick={() => setViewKey(risk.key)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: 4 }}>
                  <Eye size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {showCreate && <IssueModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {viewKey && <IssueDetail issueKey={viewKey} onClose={() => setViewKey(null)} onUpdated={load} />}
    </div>
  );
}
