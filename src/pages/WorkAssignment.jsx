import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, CheckCircle, XCircle, Clock, Send,
  RefreshCw, AlertTriangle, Building2, ArrowRight, Filter, Eye
} from 'lucide-react';
import Header from '../components/Header';
import IssueDetail from '../components/IssueDetail';
import {
  getWorkPackages, createWorkPackage, assignWorkPackage,
  submitWorkPackage, approveWorkPackage, rejectWorkPackage,
  getWorkAssignStats, getProjects, getUsers
} from '../services/api';
import toast from 'react-hot-toast';

const WORK_TYPES = ['Research Project', 'Curriculum Development', 'Infrastructure', 'Event Organization', 'Audit & Compliance', 'Faculty Development', 'Student Initiative', 'General Task'];
const STATUS_COLORS = { 'To Do': 'blue', 'In Progress': 'amber', 'Done': 'green', 'Review': 'violet', 'Backlog': 'gray' };

const WorkStatusBadge = ({ pkg }) => {
  if (pkg.approved) return <span className="badge badge-green">✓ Approved</span>;
  if (pkg.rejected) return <span className="badge badge-rose">✗ Rejected</span>;
  if (pkg.submitted) return <span className="badge badge-violet">⏳ Pending Review</span>;
  if (pkg.assignedTo) return <span className="badge badge-amber">📋 Assigned</span>;
  return <span className="badge badge-gray">Unassigned</span>;
};

export default function WorkAssignment() {
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | pending | approved | rejected
  const [showCreate, setShowCreate] = useState(false);
  const [viewKey, setViewKey] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type, pkg }
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Create form state
  const [form, setForm] = useState({
    projectKey: '', title: '', description: '',
    assignToSpoke: '', workType: 'General Task',
    dueDate: '', priority: 'Medium',
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgs, st, projs, usrs] = await Promise.allSettled([
        getWorkPackages(), getWorkAssignStats(), getProjects(), getUsers()
      ]);
      if (pkgs.status === 'fulfilled') setPackages(pkgs.value || []);
      if (st.status === 'fulfilled') setStats(st.value);
      if (projs.status === 'fulfilled') setProjects(projs.value || []);
      if (usrs.status === 'fulfilled') setUsers(usrs.value || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = packages.filter(p => {
    if (tab === 'pending') return p.submitted && !p.approved && !p.rejected;
    if (tab === 'approved') return p.approved;
    if (tab === 'rejected') return p.rejected;
    if (tab === 'unassigned') return !p.assignedTo;
    if (searchText) return p.fields?.summary?.toLowerCase().includes(searchText.toLowerCase()) || p.key?.toLowerCase().includes(searchText.toLowerCase());
    return true;
  }).filter(p => !searchText || p.fields?.summary?.toLowerCase().includes(searchText.toLowerCase()) || p.key?.toLowerCase().includes(searchText.toLowerCase()));

  const handleCreate = async () => {
    if (!form.projectKey || !form.title) { toast.error('Project and title required'); return; }
    setCreating(true);
    try {
      await createWorkPackage(form);
      toast.success('Work package created and assigned in Jira!');
      setShowCreate(false);
      setForm({ projectKey: '', title: '', description: '', assignToSpoke: '', workType: 'General Task', dueDate: '', priority: 'Medium' });
      load();
    } catch (e) { toast.error('Failed: ' + e); }
    finally { setCreating(false); }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      const { type, pkg } = actionModal;
      if (type === 'approve') { await approveWorkPackage(pkg.key, { feedback: actionNote }); toast.success(`${pkg.key} approved!`); }
      if (type === 'reject') { await rejectWorkPackage(pkg.key, { reason: actionNote }); toast.success(`${pkg.key} rejected`); }
      if (type === 'submit') { await submitWorkPackage(pkg.key, { notes: actionNote }); toast.success(`${pkg.key} submitted for review`); }
      if (type === 'reassign') {
        await assignWorkPackage(pkg.key, { spokeKey: actionNote });
        toast.success(`Reassigned to ${actionNote}`);
      }
      setActionModal(null);
      setActionNote('');
      load();
    } catch (e) { toast.error('Action failed: ' + e); }
    finally { setSubmitting(false); }
  };

  const TABS = [
    { key: 'all', label: 'All Packages', count: packages.length },
    { key: 'unassigned', label: 'Unassigned', count: packages.filter(p => !p.assignedTo).length },
    { key: 'pending', label: 'Pending Review', count: packages.filter(p => p.submitted && !p.approved && !p.rejected).length },
    { key: 'approved', label: 'Approved', count: packages.filter(p => p.approved).length },
    { key: 'rejected', label: 'Rejected', count: packages.filter(p => p.rejected).length },
  ];

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="Work Assignment" subtitle="Institution → College governance" onRefresh={load} loading={loading} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Stats row */}
        <div style={{ padding: '16px 24px 0', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, flexShrink: 0 }}>
          {[
            { label: 'TOTAL', value: stats?.total ?? '—', color: 'var(--accent-blue)' },
            { label: 'ASSIGNED', value: stats?.assigned ?? '—', color: 'var(--accent-violet)' },
            { label: 'PENDING', value: stats?.submitted ?? '—', color: 'var(--accent-amber)' },
            { label: 'APPROVED', value: stats?.approved ?? '—', color: 'var(--accent-emerald)' },
            { label: 'REJECTED', value: stats?.rejected ?? '—', color: 'var(--accent-rose)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Spoke breakdown */}
        {stats?.bySpoke && Object.keys(stats.bySpoke).length > 0 && (
          <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(stats.bySpoke).map(([spoke, count]) => (
                <div key={spoke} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20 }}>
                  <Building2 size={11} style={{ color: 'var(--accent-violet)' }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-violet)', fontWeight: 600 }}>{spoke}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{count} packages</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs + search + create */}
        <div style={{ padding: '12px 24px 0', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '7px 14px', background: tab === t.key ? 'var(--accent-blue)' : 'transparent',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                color: tab === t.key ? 'white' : 'var(--text-secondary)',
                transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {t.label}
                {t.count > 0 && <span style={{ background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--border)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{t.count}</span>}
              </button>
            ))}
          </div>
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search packages..." style={{ height: 34, fontSize: 12, width: 200 }} />
          <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            <Plus size={14} /> New Work Package
          </button>
        </div>

        {/* Package list */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 56, color: 'var(--text-muted)' }}>
              <ClipboardList size={40} style={{ marginBottom: 12, opacity: 0.25 }} />
              <p style={{ fontSize: 15, marginBottom: 8 }}>No work packages found</p>
              <button onClick={() => setShowCreate(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 13 }}>
                + Create first work package →
              </button>
            </div>
          ) : filtered.map(pkg => {
            const f = pkg.fields;
            const priorityColor = { Highest: '#f43f5e', High: '#f97316', Medium: '#f59e0b', Low: '#3b82f6', Lowest: '#64748b' }[f?.priority?.name] || 'var(--text-muted)';
            const isOverdue = f?.duedate && new Date(f.duedate) < new Date() && f?.status?.name !== 'Done';

            return (
              <div key={pkg.id} className="card" style={{
                marginBottom: 10, padding: '16px 20px',
                borderLeft: pkg.approved ? '3px solid var(--accent-emerald)' : pkg.rejected ? '3px solid var(--accent-rose)' : pkg.submitted ? '3px solid var(--accent-violet)' : pkg.assignedTo ? '3px solid var(--accent-amber)' : '3px solid var(--border)',
                transition: 'var(--transition)',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.borderColor = pkg.approved ? 'var(--accent-emerald)' : pkg.rejected ? 'var(--accent-rose)' : 'var(--border-bright)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>{pkg.key}</span>
                      <WorkStatusBadge pkg={pkg} />
                      <span className={`badge badge-${STATUS_COLORS[f?.status?.name] || 'gray'}`} style={{ fontSize: 10 }}>{f?.status?.name}</span>
                      {pkg.workType && <span className="badge badge-cyan" style={{ fontSize: 10 }}>{pkg.workType}</span>}
                      <span style={{ fontSize: 11, color: priorityColor }}>● {f?.priority?.name}</span>
                      {isOverdue && <span className="badge badge-rose" style={{ fontSize: 10 }}>⚠ OVERDUE</span>}
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{f?.summary}</div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {pkg.assignedTo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <Building2 size={11} style={{ color: 'var(--accent-violet)' }} />
                          Assigned to: <strong style={{ color: 'var(--accent-violet)' }}>{pkg.assignedTo}</strong>
                        </div>
                      )}
                      {f?.assignee && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          👤 {f.assignee.displayName}
                        </div>
                      )}
                      {f?.duedate && (
                        <div style={{ fontSize: 12, color: isOverdue ? 'var(--accent-rose)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          📅 {new Date(f.duedate).toLocaleDateString()}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {f?.project?.name}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button onClick={() => setViewKey(pkg.key)} className="btn btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}>
                      <Eye size={12} /> View
                    </button>

                    {/* Moderator: reassign */}
                    <button onClick={() => { setActionModal({ type: 'reassign', pkg }); setActionNote(pkg.assignedTo || ''); }}
                      className="btn btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}>
                      <ArrowRight size={12} /> Assign
                    </button>

                    {/* Moderator: approve if submitted */}
                    {pkg.submitted && !pkg.approved && !pkg.rejected && (
                      <>
                        <button onClick={() => { setActionModal({ type: 'approve', pkg }); setActionNote(''); }}
                          className="btn btn-secondary" style={{ fontSize: 11, padding: '5px 10px', color: 'var(--accent-emerald)', borderColor: 'rgba(16,185,129,0.3)' }}>
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button onClick={() => { setActionModal({ type: 'reject', pkg }); setActionNote(''); }}
                          className="btn btn-secondary" style={{ fontSize: 11, padding: '5px 10px', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.3)' }}>
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}

                    {/* College: submit if assigned but not submitted */}
                    {pkg.assignedTo && !pkg.submitted && !pkg.approved && (
                      <button onClick={() => { setActionModal({ type: 'submit', pkg }); setActionNote(''); }}
                        className="btn btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}>
                        <Send size={12} /> Submit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Work Package Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>🏛️ Create & Assign Work Package</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>HUB PROJECT *</label>
                  <select value={form.projectKey} onChange={e => setF('projectKey', e.target.value)}>
                    <option value="">Select project...</option>
                    {projects.map(p => <option key={p.id} value={p.key}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>ASSIGN TO SPOKE (College)</label>
                  <select value={form.assignToSpoke} onChange={e => setF('assignToSpoke', e.target.value)}>
                    <option value="">Unassigned</option>
                    {projects.map(p => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>WORK PACKAGE TITLE *</label>
                <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Curriculum Review Q3 2026" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>DESCRIPTION</label>
                <textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Scope, objectives, deliverables..." style={{ minHeight: 80 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>WORK TYPE</label>
                  <select value={form.workType} onChange={e => setF('workType', e.target.value)}>
                    {WORK_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>PRIORITY</label>
                  <select value={form.priority} onChange={e => setF('priority', e.target.value)}>
                    {['Highest','High','Medium','Low','Lowest'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>DUE DATE</label>
                  <input type="date" value={form.dueDate} onChange={e => setF('dueDate', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleCreate} className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating in Jira...' : '🏛️ Create & Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (approve/reject/submit/reassign) */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setActionModal(null)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                {actionModal.type === 'approve' && '✅ Approve Work Package'}
                {actionModal.type === 'reject' && '❌ Reject Work Package'}
                {actionModal.type === 'submit' && '📤 Submit for Review'}
                {actionModal.type === 'reassign' && '🔄 Assign to Spoke'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{actionModal.pkg.key} — {actionModal.pkg.fields?.summary}</div>
            </div>
            <div style={{ padding: 22 }}>
              {actionModal.type === 'reassign' ? (
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>SELECT SPOKE (College Project Key)</label>
                  <select value={actionNote} onChange={e => setActionNote(e.target.value)} style={{ marginBottom: 16 }}>
                    <option value="">Unassigned</option>
                    {projects.map(p => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
                    {actionModal.type === 'approve' ? 'FEEDBACK (optional)' : actionModal.type === 'reject' ? 'REJECTION REASON *' : 'SUBMISSION NOTES'}
                  </label>
                  <textarea value={actionNote} onChange={e => setActionNote(e.target.value)}
                    placeholder={actionModal.type === 'approve' ? 'Great work! All deliverables met...' : actionModal.type === 'reject' ? 'Please revise section 2...' : 'All deliverables completed...'}
                    style={{ minHeight: 90, marginBottom: 16 }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setActionModal(null)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleAction} disabled={submitting}
                  className={`btn ${actionModal.type === 'approve' ? 'btn-primary' : actionModal.type === 'reject' ? 'btn-danger' : 'btn-primary'}`}>
                  {submitting ? 'Processing...' : actionModal.type === 'approve' ? '✅ Approve' : actionModal.type === 'reject' ? '❌ Reject' : actionModal.type === 'submit' ? '📤 Submit' : '🔄 Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewKey && <IssueDetail issueKey={viewKey} onClose={() => setViewKey(null)} onUpdated={load} />}
    </div>
  );
}
