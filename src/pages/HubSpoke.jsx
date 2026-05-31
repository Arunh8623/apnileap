import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import Header from '../components/Header';
import { getProjects, createProject, getIssues, getMyself } from '../services/api';
import toast from 'react-hot-toast';

export default function HubSpoke() {
  const [projects, setProjects] = useState([]);
  const [issueStats, setIssueStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [myself, setMyself] = useState(null);
  const [form, setForm] = useState({ name: '', key: '', description: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.allSettled([getProjects(), getMyself()]);
      const projs = p.status === 'fulfilled' ? (p.value || []) : [];
      setProjects(projs);
      if (m.status === 'fulfilled') setMyself(m.value);

      // Load issue stats for each project
      setStatsLoading(true);
      const stats = {};
      await Promise.allSettled(projs.map(async proj => {
        try {
          const r = await getIssues({ projectKey: proj.key, maxResults: 200 });
          const all = r.issues || [];
          const done = all.filter(i => i.fields?.status?.name === 'Done').length;
          const inProgress = all.filter(i => i.fields?.status?.name === 'In Progress').length;
          const overdue = all.filter(i => {
            const d = i.fields?.duedate;
            return d && new Date(d) < new Date() && i.fields?.status?.name !== 'Done';
          }).length;
          stats[proj.key] = { total: r.total || all.length, done, inProgress, overdue, recent: all.slice(0, 4) };
        } catch {
          stats[proj.key] = { total: 0, done: 0, inProgress: 0, overdue: 0, recent: [] };
        }
      }));
      setIssueStats(stats);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name || !form.key) { toast.error('Name and key required'); return; }
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(form.key)) {
      toast.error('Key must be 2-10 uppercase letters/numbers, starting with a letter');
      return;
    }
    setCreating(true);
    try {
      await createProject({ ...form, leadAccountId: myself?.accountId });
      toast.success(`Project ${form.key} created in Jira!`);
      setShowCreate(false);
      setForm({ name: '', key: '', description: '' });
      load();
    } catch (e) { toast.error(typeof e === 'string' ? e : 'Failed to create project'); }
    finally { setCreating(false); }
  };

  // Detect hub project (first one, or one named with HUB/APNI)
  const hub = projects.find(p =>
    p.key?.toUpperCase().includes('HUB') || p.name?.toLowerCase().includes('hub') || p.key === 'APNIHUB'
  ) || projects[0];
  const spokes = projects.filter(p => p.id !== hub?.id);

  const STATUS_BADGE_MAP = {
    'Done': 'green', 'In Progress': 'amber', 'To Do': 'blue', 'Backlog': 'gray'
  };

  const ProjectCard = ({ project, isHub }) => {
    const s = issueStats[project?.key] || {};
    const completion = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;

    return (
      <div className="card" style={{
        border: isHub ? '1px solid rgba(59,130,246,0.35)' : undefined,
        background: isHub ? 'rgba(59,130,246,0.04)' : undefined,
        position: 'relative', overflow: 'hidden',
        transition: 'var(--transition)',
      }}>
        {isHub && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <span className="badge badge-blue">HUB</span>
          </div>
        )}
        {/* Glow */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${isHub ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.08)'} 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10, flexShrink: 0,
            background: isHub
              ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
              : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'white',
            boxShadow: isHub ? '0 0 20px rgba(59,130,246,0.25)' : '0 0 12px rgba(139,92,246,0.2)',
          }}>
            {project?.key?.substring(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{project?.key} · {project?.projectTypeKey}</div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
          {[
            { label: 'TOTAL', value: s.total ?? '—', color: isHub ? 'var(--accent-blue)' : 'var(--accent-violet)' },
            { label: 'DONE', value: s.done ?? '—', color: 'var(--accent-emerald)' },
            { label: 'ACTIVE', value: s.inProgress ?? '—', color: 'var(--accent-amber)' },
            { label: 'OVERDUE', value: s.overdue ?? '—', color: s.overdue > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                {statsLoading ? '·' : stat.value}
              </div>
              <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Completion bar */}
        {!statsLoading && s.total > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>COMPLETION</span>
              <span style={{ fontSize: 10, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{completion}%</span>
            </div>
            <div style={{ height: 5, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${completion}%`, height: '100%', borderRadius: 3,
                background: completion >= 70 ? 'var(--accent-emerald)' : completion >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}

        {/* Recent issues */}
        {!statsLoading && s.recent?.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>RECENT ISSUES</div>
            {s.recent.map(i => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '4px 6px', borderRadius: 4, transition: 'var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isHub ? 'var(--accent-blue)' : 'var(--accent-violet)', minWidth: 72, flexShrink: 0 }}>{i.key}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{i.fields?.summary}</span>
                <span className={`badge badge-${STATUS_BADGE_MAP[i.fields?.status?.name] || 'gray'}`} style={{ fontSize: 9, flexShrink: 0 }}>{i.fields?.status?.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Open in Jira */}
        {process.env.REACT_APP_JIRA_BASE_URL && (
          <a href={`${process.env.REACT_APP_JIRA_BASE_URL}/jira/software/projects/${project?.key}/boards`}
            target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 11, color: 'var(--accent-blue)' }}>
            Open in Jira <ExternalLink size={10} />
          </a>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="Hub & Spoke Architecture" subtitle="Multi-tenant enterprise governance" onRefresh={load} loading={loading || statsLoading} />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Architecture banner */}
        <div className="card" style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(6,182,212,0.04))',
          border: '1px solid rgba(59,130,246,0.2)', padding: '14px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Layers size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Hub-and-Spoke Multi-Tenant Architecture</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {projects.length} projects · {hub?.key || '—'} is your central governance hub · {spokes.length} spoke project{spokes.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              <Plus size={14} /> New Spoke Project
            </button>
          </div>
        </div>

        {/* Hub */}
        {loading ? (
          <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
        ) : hub ? (
          <div style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Central Hub</div>
            <div style={{ maxWidth: 500 }}>
              <ProjectCard project={hub} isHub />
            </div>
          </div>
        ) : null}

        {/* Spokes */}
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>College Spokes ({spokes.length})</div>
          {loading ? (
            <div className="grid-3">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 200 }} />)}</div>
          ) : spokes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏗️</div>
              <p style={{ marginBottom: 8 }}>No spoke projects yet.</p>
              <button onClick={() => setShowCreate(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 13 }}>
                + Create a spoke project →
              </button>
            </div>
          ) : (
            <div className="grid-3">
              {spokes.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Create Spoke Project</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              {[
                { label: 'PROJECT NAME *', key: 'name', placeholder: 'College of Engineering', transform: v => v },
                { label: 'PROJECT KEY * (2-10 uppercase letters)', key: 'key', placeholder: 'COE', transform: v => v.toUpperCase() },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm(fm => ({ ...fm, [f.key]: f.transform(e.target.value) }))} placeholder={f.placeholder} maxLength={f.key === 'key' ? 10 : undefined} />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>DESCRIPTION</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Spoke project for..." style={{ minHeight: 70, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleCreate} className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating in Jira...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
