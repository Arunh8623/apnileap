import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Layers, AlertTriangle, CheckCircle, Clock, Plus, ExternalLink, ClipboardList, Flag, Bell } from 'lucide-react';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import IssueModal from '../components/IssueModal';
import { getAnalyticsOverview, getIssues, getProjects, getWorkAssignStats, getMilestones, getNotifications } from '../services/api';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  'To Do': '#3b82f6', 'In Progress': '#f59e0b', 'Done': '#10b981',
  'Review': '#8b5cf6', 'Testing': '#06b6d4', 'Backlog': '#64748b',
  'Approved': '#10b981', 'Blocked': '#f43f5e',
};
const PRIORITY_COLORS = { 'Highest': '#f43f5e', 'High': '#f97316', 'Medium': '#f59e0b', 'Low': '#3b82f6', 'Lowest': '#64748b' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ fontSize: 13, color: p.color, fontFamily: 'var(--font-mono)' }}>{p.value}</p>)}
    </div>
  );
};

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentIssues, setRecentIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workStats, setWorkStats] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, i, p, w, m, n] = await Promise.allSettled([
        getAnalyticsOverview(),
        getIssues({ maxResults: 8 }),
        getProjects(),
        getWorkAssignStats(),
        getMilestones(),
        getNotifications(),
      ]);
      if (a.status === 'fulfilled') setAnalytics(a.value);
      if (i.status === 'fulfilled') setRecentIssues(i.value.issues || []);
      if (p.status === 'fulfilled') setProjects(p.value || []);
      if (w.status === 'fulfilled') setWorkStats(w.value);
      if (m.status === 'fulfilled') setMilestones((m.value || []).slice(0, 4));
      if (n.status === 'fulfilled') setNotifCount((n.value || []).length);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusData = analytics ? Object.entries(analytics.byStatus || {}).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || '#3b82f6' })) : [];
  const priorityData = analytics ? Object.entries(analytics.byPriority || {}).map(([name, value]) => ({ name, value })) : [];
  const typeData = analytics ? Object.entries(analytics.byType || {}).map(([name, value]) => ({ name, value })) : [];

  const getPriorityBadge = (p) => {
    const map = { Highest: 'rose', High: 'amber', Medium: 'amber', Low: 'blue', Lowest: 'gray' };
    return `badge badge-${map[p] || 'gray'}`;
  };
  const getStatusBadge = (s) => {
    const map = { 'Done': 'green', 'In Progress': 'amber', 'To Do': 'blue', 'Review': 'violet', 'Testing': 'cyan', 'Backlog': 'gray' };
    return `badge badge-${map[s] || 'gray'}`;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="Hub Dashboard" subtitle="APNILEAP Enterprise Governance OS" onRefresh={load} loading={loading} />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Stats Row */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <StatCard label="Total Issues" value={analytics?.total ?? (loading ? '...' : '0')} icon={Layers} color="var(--accent-blue)" sub={`${analytics?.projectCount || 0} projects`} />
          <StatCard label="Completion Rate" value={analytics ? `${analytics.completionRate}%` : '...'} icon={CheckCircle} color="var(--accent-emerald)" sub={`${analytics?.byStatus?.Done || 0} done`} />
          <StatCard label="Overdue" value={analytics?.overdue ?? '...'} icon={AlertTriangle} color="var(--accent-rose)" sub="needs attention" />
          <StatCard label="In Progress" value={analytics?.byStatus?.['In Progress'] ?? '...'} icon={Clock} color="var(--accent-amber)" sub="active work" />
        </div>

        {/* Charts Row */}
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {/* Status Distribution */}
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Status Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {statusData.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.fill }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{s.name} <strong style={{ color: 'var(--text-primary)' }}>{s.value}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Priority Breakdown</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'DM Mono' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityData.map((e, i) => <Cell key={i} fill={PRIORITY_COLORS[e.name] || '#3b82f6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Issue Types */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Issue Types</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontFamily: 'DM Mono' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid-2">
          {/* Recent Issues */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="section-title">Recent Issues</div>
              <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}>
                <Plus size={13} /> New Issue
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {loading ? (
                [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 4 }} />)
              ) : recentIssues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                  No issues yet. <button onClick={() => setShowCreate(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}>Create one →</button>
                </div>
              ) : recentIssues.map(issue => (
                <div key={issue.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--bg-secondary)', marginBottom: 2,
                  transition: 'var(--transition)',
                  cursor: 'pointer',
                }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-blue)', minWidth: 80 }}>{issue.key}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.fields?.summary}</span>
                  <span className={getStatusBadge(issue.fields?.status?.name)}>{issue.fields?.status?.name}</span>
                  <span className={getPriorityBadge(issue.fields?.priority?.name)} style={{ fontSize: 10 }}>{issue.fields?.priority?.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Active Projects</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)
              ) : projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                  No projects found. Check your Jira connection in Settings.
                </div>
              ) : projects.slice(0, 6).map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'var(--bg-secondary)', borderRadius: 8,
                  border: '1px solid var(--border)', transition: 'var(--transition)',
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)',
                  }}>
                    {p.key?.substring(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.key} · {p.projectTypeKey}</div>
                  </div>
                  <ExternalLink size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Work Assignment + Milestones row */}
        <div className="grid-2" style={{ marginTop: 20 }}>
          {/* Work Assignment Summary */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="section-title">Work Assignment</div>
              <button onClick={() => navigate('/workassign')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 12 }}>View All →</button>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 80 }} />
            ) : !workStats ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>No work packages yet</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { l: 'Total', v: workStats.total, c: 'var(--accent-blue)' },
                    { l: 'Pending', v: workStats.submitted, c: 'var(--accent-amber)' },
                    { l: 'Approved', v: workStats.approved, c: 'var(--accent-emerald)' },
                    { l: 'Rejected', v: workStats.rejected, c: 'var(--accent-rose)' },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {Object.keys(workStats.bySpoke || {}).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(workStats.bySpoke).map(([spoke, count]) => (
                      <span key={spoke} className="badge badge-violet" style={{ fontSize: 10 }}>{spoke}: {count}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Upcoming Milestones */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="section-title">Upcoming Milestones</div>
              <button onClick={() => navigate('/milestones')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 12 }}>View All →</button>
            </div>
            {loading ? (
              [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36, marginBottom: 6 }} />)
            ) : milestones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>No milestones with due dates</div>
            ) : milestones.map(m => {
              const isOverdue = m.overdue;
              const isUrgent = m.urgent;
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                  background: 'var(--bg-secondary)',
                  borderLeft: `3px solid ${isOverdue ? 'var(--accent-rose)' : isUrgent ? 'var(--accent-amber)' : 'var(--border)'}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fields?.summary}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.key}</div>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isOverdue ? 'var(--accent-rose)' : isUrgent ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                    {isOverdue ? `${Math.abs(m.daysLeft)}d overdue` : m.daysLeft === 0 ? 'Today!' : `${m.daysLeft}d`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showCreate && <IssueModal onClose={() => setShowCreate(false)} onSaved={load} />}
    </div>
  );
}
