import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Edit, ChevronDown, RefreshCw, Eye } from 'lucide-react';
import Header from '../components/Header';
import IssueModal from '../components/IssueModal';
import IssueDetail from '../components/IssueDetail';
import { getIssues, getProjects, deleteIssue, getTransitions, transitionIssue } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  'To Do': 'blue', 'In Progress': 'amber', 'Done': 'green',
  'Review': 'violet', 'In Review': 'violet', 'Testing': 'cyan',
  'Backlog': 'gray', 'Approved': 'green', 'Blocked': 'rose',
};
const TYPE_ICONS = {
  'Epic': '🔮', 'Story': '📖', 'Task': '✅', 'Bug': '🐛',
  'Risk': '⚠️', 'Incident': '🔥', 'Milestone': '🏁', 'Sub-task': '↳', 'Subtask': '↳',
};
const PRIORITY_COLORS = {
  'Highest': '#f43f5e', 'High': '#f97316', 'Medium': '#f59e0b',
  'Low': '#3b82f6', 'Lowest': '#64748b',
};

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ projectKey: '', status: '', type: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editIssue, setEditIssue] = useState(null);
  const [viewIssueKey, setViewIssueKey] = useState(null);
  const [transitionCache, setTransitionCache] = useState({});
  const [openTransition, setOpenTransition] = useState(null);
  const [transitioning, setTransitioning] = useState(null);

  const loadProjects = useCallback(async () => {
    try { setProjects(await getProjects() || []); } catch {}
  }, []);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      // Pass 'all' when no specific project selected — backend handles JQL
      const params = {};
      if (filter.projectKey) params.projectKey = filter.projectKey;
      if (filter.status) params.status = filter.status;
      if (filter.type) params.type = filter.type;
      params.maxResults = 200;

      console.log('Fetching issues with params:', params);
      const r = await getIssues(params);
      console.log('Got issues:', r.total, r.issues?.length);
      setIssues(r.issues || []);
    } catch (e) {
      console.error('Issues error:', e);
      toast.error('Failed to load issues: ' + e);
    } finally { setLoading(false); }
  }, [filter.projectKey, filter.status, filter.type]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadIssues(); }, [loadIssues]);

  const filtered = issues.filter(i => {
    if (!filter.search) return true;
    const q = filter.search.toLowerCase();
    return i.fields?.summary?.toLowerCase().includes(q) || i.key?.toLowerCase().includes(q);
  });

  const handleDelete = async (key) => {
    if (!window.confirm(`Delete ${key}? This cannot be undone.`)) return;
    try {
      await deleteIssue(key);
      toast.success(`${key} deleted from Jira`);
      loadIssues();
    } catch (e) { toast.error('Delete failed: ' + e); }
  };

  const loadTransitions = async (key) => {
    if (openTransition === key) { setOpenTransition(null); return; }
    try {
      if (!transitionCache[key]) {
        const t = await getTransitions(key);
        setTransitionCache(prev => ({ ...prev, [key]: t }));
      }
      setOpenTransition(key);
    } catch { toast.error('Could not load transitions'); }
  };

  const doTransition = async (key, transitionId, name) => {
    setTransitioning(key);
    try {
      await transitionIssue(key, transitionId);
      toast.success(`${key} → "${name}"`);
      setOpenTransition(null);
      // Update local state immediately
      setIssues(prev => prev.map(i => i.key === key
        ? { ...i, fields: { ...i.fields, status: { name } } }
        : i
      ));
      // Then reload fully
      setTimeout(loadIssues, 800);
    } catch (e) { toast.error('Transition failed: ' + e); }
    finally { setTransitioning(null); }
  };

  const sel = { height: 34, fontSize: 12, width: 'auto', minWidth: 130 };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header
        title="Issues"
        subtitle={loading ? 'Loading...' : `${filtered.length} of ${issues.length} issues`}
        onRefresh={loadIssues}
        loading={loading}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 24 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '0 0 220px' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
              placeholder="Search issues..." style={{ paddingLeft: 30, height: 34 }} />
          </div>
          <select style={sel} value={filter.projectKey} onChange={e => setFilter(f => ({ ...f, projectKey: e.target.value }))}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
          </select>
          <select style={sel} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {['Backlog', 'To Do', 'In Progress', 'In Review', 'Review', 'Testing', 'Approved', 'Done'].map(s =>
              <option key={s}>{s}</option>
            )}
          </select>
          <select style={sel} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
            <option value="">All Types</option>
            {['Epic', 'Story', 'Task', 'Bug', 'Risk', 'Incident', 'Milestone'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={loadIssues} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              <Plus size={14} /> Create Issue
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Header Row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '100px 1fr 110px 100px 100px 130px 110px',
            padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
          }}>
            {['KEY', 'SUMMARY', 'STATUS', 'PRIORITY', 'TYPE', 'ASSIGNEE', 'ACTIONS'].map(h => (
              <span key={h} style={{ fontSize: 10, letterSpacing: '1px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{h}</span>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: 8 }}>
                {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 46 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 56, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ marginBottom: 8, fontSize: 15 }}>
                  {issues.length === 0 ? 'No issues found in any project.' : 'No issues match your filters.'}
                </p>
                <p style={{ fontSize: 12, marginBottom: 16, color: 'var(--text-muted)' }}>
                  {issues.length === 0 ? 'Make sure your Jira projects have issues, or check the backend console for JQL errors.' : ''}
                </p>
                <button onClick={() => setShowCreate(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 13 }}>
                  + Create your first issue →
                </button>
              </div>
            ) : filtered.map(issue => {
              const f = issue.fields;
              const statusColor = STATUS_BADGE[f?.status?.name] || 'gray';
              const typeIcon = TYPE_ICONS[f?.issuetype?.name] || '•';
              const isOpenTrans = openTransition === issue.key;
              const isTransitioning = transitioning === issue.key;

              return (
                <div key={issue.id} style={{
                  display: 'grid', gridTemplateColumns: '100px 1fr 110px 100px 100px 130px 110px',
                  padding: '11px 16px', borderBottom: '1px solid var(--border)',
                  alignItems: 'center', transition: 'background 0.15s', position: 'relative',
                  opacity: isTransitioning ? 0.6 : 1,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Key */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>
                    {issue.key}
                  </span>

                  {/* Summary */}
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12, color: 'var(--text-primary)' }}
                    title={f?.summary}>
                    {f?.summary}
                  </span>

                  {/* Status — clickable dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => loadTransitions(issue.key)} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                    }}>
                      <span className={`badge badge-${statusColor}`}>{f?.status?.name}</span>
                      <ChevronDown size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </button>
                    {isOpenTrans && transitionCache[issue.key] && (
                      <div style={{
                        position: 'absolute', top: '110%', left: 0, zIndex: 200,
                        background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
                        borderRadius: 8, minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                      }}>
                        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          MOVE TO
                        </div>
                        {transitionCache[issue.key].map(t => (
                          <button key={t.id} onClick={() => doTransition(issue.key, t.id, t.to?.name || t.name)} style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '9px 14px', background: 'none', border: 'none',
                            color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                          }}
                            onMouseEnter={e => e.target.style.background = 'var(--bg-card-hover)'}
                            onMouseLeave={e => e.target.style.background = 'transparent'}>
                            → {t.to?.name || t.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <span style={{ fontSize: 11, color: PRIORITY_COLORS[f?.priority?.name] || 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 8 }}>●</span> {f?.priority?.name || '—'}
                  </span>

                  {/* Type */}
                  <span style={{ fontSize: 12 }}>
                    {typeIcon} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f?.issuetype?.name}</span>
                  </span>

                  {/* Assignee */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {f?.assignee ? (
                      <>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-blue))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: 'white',
                          overflow: 'hidden',
                        }}>
                          {f.assignee.avatarUrls?.['24x24']
                            ? <img src={f.assignee.avatarUrls['24x24']} style={{ width: '100%' }} alt="" />
                            : f.assignee.displayName?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.assignee.displayName}
                        </span>
                      </>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unassigned</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setViewIssueKey(issue.key)} title="View Detail"
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, opacity: 0.7 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
                      <Eye size={13} />
                    </button>
                    <button onClick={() => setEditIssue(issue)} title="Edit"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, transition: 'var(--transition)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                      <Edit size={13} />
                    </button>
                    <button onClick={() => handleDelete(issue.key)} title="Delete"
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, opacity: 0.6 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {openTransition && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setOpenTransition(null)} />
      )}
      {showCreate && <IssueModal onClose={() => setShowCreate(false)} onSaved={loadIssues} />}
      {editIssue && <IssueModal issue={editIssue} onClose={() => setEditIssue(null)} onSaved={loadIssues} />}
      {viewIssueKey && <IssueDetail issueKey={viewIssueKey} onClose={() => setViewIssueKey(null)} onUpdated={loadIssues} />}
    </div>
  );
}
