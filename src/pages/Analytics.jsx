import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, CartesianGrid,
} from 'recharts';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import { getAnalyticsOverview, getAnalyticsProjects } from '../services/api';
import { TrendingUp, Activity, Target, BarChart3, RefreshCw } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16', '#ec4899'];
const P_COLORS = { 'Highest': '#f43f5e', 'High': '#f97316', 'Medium': '#f59e0b', 'Low': '#3b82f6', 'Lowest': '#64748b' };

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px' }}>
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: p.color || p.fill || 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [projStats, setProjStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.allSettled([getAnalyticsOverview(), getAnalyticsProjects()]);
      if (o.status === 'fulfilled') setOverview(o.value);
      else console.error('Overview error:', o.reason);
      if (p.status === 'fulfilled') setProjStats(p.value || []);
      else console.error('Projects error:', p.reason);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusData = overview
    ? Object.entries(overview.byStatus || {}).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))
    : [];
  const typeData = overview
    ? Object.entries(overview.byType || {}).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))
    : [];
  const priorityData = overview
    ? Object.entries(overview.byPriority || {}).map(([name, value]) => ({ name, value, fill: P_COLORS[name] || '#64748b' }))
    : [];

  const kpiData = overview ? [
    { subject: 'Completion', A: overview.completionRate || 0 },
    { subject: 'Governance', A: Math.max(0, 100 - (overview.overdue || 0) * 5) },
    { subject: 'Activity', A: Math.min(100, (overview.total || 0) * 3) },
    { subject: 'Velocity', A: Math.min(100, (overview.byStatus?.['In Progress'] || 0) * 10) },
    { subject: 'Risk', A: Math.max(0, 100 - (overview.byType?.Risk || 0) * 10) },
    { subject: 'Quality', A: Math.max(0, 100 - (overview.byType?.Bug || 0) * 8) },
  ] : [];

  const govScore = overview ? Math.max(0, Math.min(100,
    (overview.completionRate || 0) * 0.4 +
    Math.max(0, 100 - (overview.overdue || 0) * 5) * 0.4 +
    Math.max(0, 100 - (overview.byType?.Bug || 0) * 5) * 0.2
  )).toFixed(0) : '—';

  const Empty = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 24 }}>📊</div>
      <div style={{ fontSize: 12 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="Analytics Engine" subtitle="Enterprise governance intelligence" onRefresh={load} loading={loading} />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* KPI Row */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <StatCard label="Governance Score" value={loading ? '...' : govScore} icon={Target} color="var(--accent-emerald)" sub="/100 points" />
          <StatCard label="Sprint Velocity" value={loading ? '...' : (overview?.byStatus?.['In Progress'] ?? 0)} icon={TrendingUp} color="var(--accent-amber)" sub="active work items" />
          <StatCard label="Risk Index" value={loading ? '...' : (overview?.byType?.Risk ?? 0)} icon={Activity} color="var(--accent-rose)" sub="open risks" />
          <StatCard label="Total Projects" value={loading ? '...' : (overview?.projectCount ?? 0)} icon={BarChart3} color="var(--accent-violet)" sub="across all spokes" />
        </div>

        {/* Project Completion + Governance Radar */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>Project Completion Rates</div>
            {loading ? <div className="skeleton" style={{ height: 200 }} /> :
             projStats.length === 0 ? <Empty label="No project data yet" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projStats} margin={{ bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontFamily: 'DM Mono' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <Tooltip content={<Tip />} />
                  <Bar name="Completion %" dataKey="completion" fill="var(--accent-blue)" radius={[4,4,0,0]} />
                  <Bar name="Overdue" dataKey="overdue" fill="var(--accent-rose)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>Governance Health Radar</div>
            {loading ? <div className="skeleton" style={{ height: 200 }} /> :
             kpiData.length === 0 ? <Empty label="No data yet" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={kpiData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontFamily: 'DM Mono' }} />
                  <Radar name="Score" dataKey="A" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.18} strokeWidth={2} dot={{ fill: 'var(--accent-blue)', r: 3 }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Per-project table */}
        {projStats.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 14 }}>Project Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 120px', gap: 0 }}>
              {['PROJECT', 'TOTAL', 'DONE', 'OVERDUE', 'COMPLETION'].map(h => (
                <div key={h} style={{ padding: '8px 12px', fontSize: 10, letterSpacing: '1px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</div>
              ))}
              {projStats.map(p => [
                <div key={`${p.name}-n`} style={{ padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{p.fullName} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({p.name})</span></div>,
                <div key={`${p.name}-t`} style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--accent-blue)' }}>{p.total}</div>,
                <div key={`${p.name}-d`} style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--accent-emerald)' }}>{p.done}</div>,
                <div key={`${p.name}-o`} style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, borderBottom: '1px solid var(--border)', color: p.overdue > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>{p.overdue}</div>,
                <div key={`${p.name}-c`} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${p.completion}%`, height: '100%', background: p.completion >= 70 ? 'var(--accent-emerald)' : p.completion >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)', borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', minWidth: 32 }}>{p.completion}%</span>
                  </div>
                </div>,
              ])}
            </div>
          </div>
        )}

        {/* Bottom charts */}
        <div className="grid-3">
          <div className="card">
            <div className="section-title" style={{ marginBottom: 12 }}>Issue Status</div>
            {loading ? <div className="skeleton" style={{ height: 180 }} /> :
             statusData.length === 0 ? <Empty label="No issues yet" /> : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                      {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {statusData.map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: s.fill, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.name}</span>
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: 12 }}>Issue Types</div>
            {loading ? <div className="skeleton" style={{ height: 220 }} /> :
             typeData.length === 0 ? <Empty label="No issues yet" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontFamily: 'DM Mono' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: 12 }}>Priority Distribution</div>
            {loading ? <div className="skeleton" style={{ height: 220 }} /> :
             priorityData.length === 0 ? <Empty label="No issues yet" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'DM Mono' }} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="value" radius={[0,4,4,0]}>
                    {priorityData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
