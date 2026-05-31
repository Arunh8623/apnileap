import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { createIssue, updateIssue, getProjects, getUsers } from '../services/api';
import toast from 'react-hot-toast';

const ISSUE_TYPES = ['Epic', 'Story', 'Task', 'Sub-task', 'Bug', 'Risk', 'Incident', 'Milestone'];
const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export default function IssueModal({ issue, onClose, onSaved, defaultProjectKey }) {
  const [form, setForm] = useState({
    projectKey: defaultProjectKey || '',
    summary: '',
    description: '',
    issueType: 'Task',
    priority: 'Medium',
    assignee: '',
    dueDate: '',
    labels: '',
    ...( issue ? {
      summary: issue.fields?.summary || '',
      description: issue.fields?.description?.content?.[0]?.content?.[0]?.text || '',
      priority: issue.fields?.priority?.name || 'Medium',
      dueDate: issue.fields?.duedate || '',
      labels: (issue.fields?.labels || []).join(', '),
      assignee: issue.fields?.assignee?.accountId || '',
    } : {})
  });
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjects().then(p => setProjects(p || [])).catch(() => {});
    getUsers().then(u => setUsers(u || [])).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.summary.trim()) { setError('Summary is required'); return; }
    if (!issue && !form.projectKey) { setError('Select a project'); return; }
    setLoading(true); setError('');
    try {
      if (issue) {
        await updateIssue(issue.key, { summary: form.summary, description: form.description, priority: form.priority, dueDate: form.dueDate, labels: form.labels ? form.labels.split(',').map(l => l.trim()) : [] });
        toast.success(`Issue ${issue.key} updated`);
      } else {
        const res = await createIssue({ ...form, labels: form.labels ? form.labels.split(',').map(l => l.trim()) : [] });
        toast.success(`Created ${res.key}`);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to save issue');
    } finally { setLoading(false); }
  };

  const inputStyle = { marginBottom: 12 };
  const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflow: 'auto',
        animation: 'fadeIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
            {issue ? `Edit ${issue.key}` : 'Create Issue'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-sm)', marginBottom: 16, color: 'var(--accent-rose)', fontSize: 13 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {!issue && (
            <div style={inputStyle}>
              <label style={labelStyle}>PROJECT *</label>
              <select value={form.projectKey} onChange={e => set('projectKey', e.target.value)}>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
              </select>
            </div>
          )}

          <div style={inputStyle}>
            <label style={labelStyle}>SUMMARY *</label>
            <input value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Issue summary..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>ISSUE TYPE</label>
              <select value={form.issueType} onChange={e => set('issueType', e.target.value)} disabled={!!issue}>
                {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>PRIORITY</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>ASSIGNEE</label>
              <select value={form.assignee} onChange={e => set('assignee', e.target.value)}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.accountId} value={u.accountId}>{u.displayName}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>DUE DATE</label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
          </div>

          <div style={inputStyle}>
            <label style={labelStyle}>LABELS (comma separated)</label>
            <input value={form.labels} onChange={e => set('labels', e.target.value)} placeholder="governance, sprint-1, risk..." />
          </div>

          <div style={inputStyle}>
            <label style={labelStyle}>DESCRIPTION</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the issue..." style={{ minHeight: 100, resize: 'vertical' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={submit} className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : issue ? 'Save Changes' : 'Create Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}
