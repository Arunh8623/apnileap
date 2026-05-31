import React, { useState, useEffect, useCallback } from 'react';
import { Flag, Calendar, AlertTriangle, CheckCircle, Clock, Eye, Plus } from 'lucide-react';
import Header from '../components/Header';
import IssueModal from '../components/IssueModal';
import IssueDetail from '../components/IssueDetail';
import { getMilestones } from '../services/api';

const PRIORITY_COLORS = { Highest: '#f43f5e', High: '#f97316', Medium: '#f59e0b', Low: '#3b82f6', Lowest: '#64748b' };

export default function Milestones() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | overdue | urgent | upcoming | done
  const [showCreate, setShowCreate] = useState(false);
  const [viewKey, setViewKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setMilestones(await getMilestones() || []); }
    catch { setMilestones([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const overdue = milestones.filter(m => m.overdue);
  const urgent = milestones.filter(m => m.urgent && !m.overdue);
  const done = milestones.filter(m => m.fields?.status?.name === 'Done');
  const upcoming = milestones.filter(m => !m.overdue && !m.urgent && m.fields?.status?.name !== 'Done');

  const filtered = filter === 'overdue' ? overdue
    : filter === 'urgent' ? urgent
    : filter === 'done' ? done
    : filter === 'upcoming' ? upcoming
    : milestones;

  const TABS = [
    { key: 'all', label: 'All', count: milestones.length, color: 'var(--accent-blue)' },
    { key: 'overdue', label: '🔴 Overdue', count: overdue.length, color: 'var(--accent-rose)' },
    { key: 'urgent', label: '🟡 Due Soon', count: urgent.length, color: 'var(--accent-amber)' },
    { key: 'upcoming', label: '📅 Upcoming', count: upcoming.length, color: 'var(--accent-blue)' },
    { key: 'done', label: '✅ Done', count: done.length, color: 'var(--accent-emerald)' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="Milestones & Deadlines" subtitle="Cross-project timeline tracking" onRefresh={load} loading={loading} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Summary */}
        <div style={{ padding: '16px 24px 0', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, flexShrink: 0 }}>
          {[
            { label: 'OVERDUE', value: overdue.length, icon: AlertTriangle, color: 'var(--accent-rose)' },
            { label: 'DUE THIS WEEK', value: urgent.length, icon: Clock, color: 'var(--accent-amber)' },
            { label: 'UPCOMING', value: upcoming.length, icon: Calendar, color: 'var(--accent-blue)' },
            { label: 'COMPLETED', value: done.length, icon: CheckCircle, color: 'var(--accent-emerald)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? '...' : s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ padding: '12px 24px 0', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${filter === t.key ? t.color : 'var(--border)'}`,
              background: filter === t.key ? `${t.color}18` : 'transparent',
              color: filter === t.key ? t.color : 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {t.label} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{t.count}</span>
            </button>
          ))}
          <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: 12 }}>
            <Plus size={13} /> Add Milestone
          </button>
        </div>

        {/* Timeline list */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8 }} />)
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <Flag size={36} style={{ marginBottom: 10, opacity: 0.2 }} />
              <p>No milestones in this category</p>
            </div>
          ) : filtered.map(m => {
            const f = m.fields;
            const isDone = f?.status?.name === 'Done';
            const borderColor = m.overdue ? 'var(--accent-rose)' : m.urgent ? 'var(--accent-amber)' : isDone ? 'var(--accent-emerald)' : 'var(--border)';
            const daysText = isDone ? '✓ Done' : m.daysLeft < 0 ? `${Math.abs(m.daysLeft)}d overdue` : m.daysLeft === 0 ? 'Due today!' : `${m.daysLeft}d left`;
            const daysColor = m.overdue ? 'var(--accent-rose)' : m.urgent ? 'var(--accent-amber)' : isDone ? 'var(--accent-emerald)' : 'var(--text-muted)';

            return (
              <div key={m.id} className="card" style={{ marginBottom: 8, padding: '14px 18px', borderLeft: `4px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 42, height: 42, borderRadius: 8, background: `${borderColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isDone ? <CheckCircle size={20} style={{ color: 'var(--accent-emerald)' }} /> :
                   m.overdue ? <AlertTriangle size={20} style={{ color: 'var(--accent-rose)' }} /> :
                   <Flag size={20} style={{ color: m.urgent ? 'var(--accent-amber)' : 'var(--accent-blue)' }} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>{m.key}</span>
                    <span style={{ fontSize: 11, color: PRIORITY_COLORS[f?.priority?.name] || 'var(--text-muted)' }}>● {f?.priority?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{f?.project?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f?.issuetype?.name}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f?.summary}</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      📅 {f?.duedate ? new Date(f.duedate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                    {f?.assignee && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>👤 {f.assignee.displayName}</span>}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: daysColor }}>{daysText}</div>
                  {/* Progress bar for non-done */}
                  {!isDone && m.daysLeft >= 0 && (
                    <div style={{ width: 80, height: 4, background: 'var(--bg-secondary)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (7 - m.daysLeft) / 7 * 100)}%`, height: '100%', background: m.urgent ? 'var(--accent-amber)' : 'var(--accent-blue)', borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                  )}
                </div>

                <button onClick={() => setViewKey(m.key)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
                  <Eye size={14} />
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
