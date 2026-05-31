import React, { useState, useEffect, useCallback } from 'react';
import {
  X, MessageSquare, GitBranch, ChevronDown, Plus, Send,
  Clock, User, Tag, AlertTriangle, Edit, Trash2, ExternalLink, RefreshCw
} from 'lucide-react';
import {
  getIssueDetail, getTransitions, transitionIssue,
  getComments, addComment, createSubtask, deleteIssue, getUsers
} from '../services/api';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = { Highest: '#f43f5e', High: '#f97316', Medium: '#f59e0b', Low: '#3b82f6', Lowest: '#64748b' };
const STATUS_BADGE = { 'Done': 'green', 'In Progress': 'amber', 'To Do': 'blue', 'Review': 'violet', 'In Review': 'violet', 'Testing': 'cyan', 'Backlog': 'gray' };
const TYPE_ICONS = { Epic: '🔮', Story: '📖', Task: '✅', Bug: '🐛', Risk: '⚠️', Incident: '🔥', Milestone: '🏁', Subtask: '↳', 'Sub-task': '↳' };

// Extract plain text from Atlassian Document Format
const adfToText = (adf) => {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  const walk = (node) => {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (node.content) return node.content.map(walk).join(node.type === 'paragraph' ? '\n' : '');
    return '';
  };
  return walk(adf).trim();
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export default function IssueDetail({ issueKey, onClose, onUpdated }) {
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | comments | subtasks | activity
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [showTransitions, setShowTransitions] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({ summary: '', priority: 'Medium', assignee: '' });
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, trans, comms, userList] = await Promise.allSettled([
        getIssueDetail(issueKey),
        getTransitions(issueKey),
        getComments(issueKey),
        getUsers(),
      ]);
      if (detail.status === 'fulfilled') setIssue(detail.value);
      if (trans.status === 'fulfilled') setTransitions(trans.value || []);
      if (comms.status === 'fulfilled') setComments(comms.value || []);
      if (userList.status === 'fulfilled') setUsers(userList.value || []);
    } catch (e) { toast.error('Failed to load issue'); }
    finally { setLoading(false); }
  }, [issueKey]);

  useEffect(() => { load(); }, [load]);

  const doTransition = async (t) => {
    setTransitioning(true);
    setShowTransitions(false);
    try {
      await transitionIssue(issueKey, t.id);
      toast.success(`Moved to "${t.to?.name || t.name}"`);
      load();
      onUpdated?.();
    } catch (e) { toast.error('Transition failed: ' + e); }
    finally { setTransitioning(false); }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      await addComment(issueKey, newComment);
      setNewComment('');
      toast.success('Comment added to Jira');
      const fresh = await getComments(issueKey);
      setComments(fresh || []);
    } catch (e) { toast.error('Failed to add comment: ' + e); }
    finally { setPostingComment(false); }
  };

  const createSub = async () => {
    if (!subtaskForm.summary.trim()) { toast.error('Summary required'); return; }
    setCreatingSubtask(true);
    try {
      const r = await createSubtask(issueKey, subtaskForm);
      toast.success(`Subtask ${r.key} created in Jira`);
      setShowSubtaskForm(false);
      setSubtaskForm({ summary: '', priority: 'Medium', assignee: '' });
      load();
      onUpdated?.();
    } catch (e) { toast.error('Failed to create subtask: ' + e); }
    finally { setCreatingSubtask(false); }
  };

  const f = issue?.fields;
  const statusColor = STATUS_BADGE[f?.status?.name] || 'gray';

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'comments', label: `Comments (${comments.length})` },
    { key: 'subtasks', label: `Subtasks (${f?.subtasks?.length || 0})` },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 820,
        animation: 'fadeIn 0.2s ease', position: 'relative',
      }}>
        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center', gap: 6 }}>
            <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
          </div>
        ) : !issue ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Failed to load issue</div>
        ) : (
          <>
            {/* ── Header ── */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>{issueKey}</span>
                    <span style={{ fontSize: 14 }}>{TYPE_ICONS[f?.issuetype?.name] || '•'}</span>
                    <span className={`badge badge-${statusColor}`}>{f?.status?.name}</span>
                    <span style={{ fontSize: 11, color: PRIORITY_COLORS[f?.priority?.name] || 'var(--text-muted)' }}>● {f?.priority?.name}</span>
                    {f?.labels?.map(l => <span key={l} className="badge badge-gray" style={{ fontSize: 10 }}>{l}</span>)}
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, lineHeight: 1.3, color: 'var(--text-primary)' }}>
                    {f?.summary}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={load} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}>
                    <RefreshCw size={14} />
                  </button>
                  <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status transition button */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button onClick={() => setShowTransitions(!showTransitions)}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '5px 12px' }}
                  disabled={transitioning}>
                  {transitioning ? 'Moving...' : `Move Status`} <ChevronDown size={12} />
                </button>
                {showTransitions && (
                  <div style={{
                    position: 'absolute', top: '110%', left: 0, zIndex: 50,
                    background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
                    borderRadius: 8, minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)' }}>TRANSITION TO</div>
                    {transitions.map(t => (
                      <button key={t.id} onClick={() => doTransition(t)} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '9px 14px', background: 'none', border: 'none',
                        color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
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
            </div>

            {/* ── Main Layout ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px' }}>
              {/* Left: tabs */}
              <div style={{ borderRight: '1px solid var(--border)', minHeight: 400 }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                      background: 'none', border: 'none', padding: '12px 14px',
                      fontSize: 12, cursor: 'pointer', fontWeight: 500,
                      color: tab === t.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      borderBottom: tab === t.key ? '2px solid var(--accent-blue)' : '2px solid transparent',
                      marginBottom: -1, transition: 'var(--transition)',
                    }}>{t.label}</button>
                  ))}
                </div>

                <div style={{ padding: 24 }}>
                  {/* Overview tab */}
                  {tab === 'overview' && (
                    <div>
                      <div className="section-title" style={{ marginBottom: 10 }}>Description</div>
                      <div style={{
                        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
                        whiteSpace: 'pre-wrap', marginBottom: 20,
                        background: 'var(--bg-secondary)', borderRadius: 8, padding: 14,
                        minHeight: 60,
                      }}>
                        {adfToText(f?.description) || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description provided</span>}
                      </div>

                      {f?.parent && (
                        <div style={{ marginBottom: 16 }}>
                          <div className="section-title" style={{ marginBottom: 6 }}>Parent Issue</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-violet)' }}>{f.parent.key}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.parent.fields?.summary}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comments tab */}
                  {tab === 'comments' && (
                    <div>
                      {/* New comment */}
                      <div style={{ marginBottom: 20 }}>
                        <textarea
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          placeholder="Add a comment… (will appear in Jira)"
                          style={{ width: '100%', minHeight: 90, resize: 'vertical', marginBottom: 8 }}
                          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && postComment()}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ctrl+Enter to send</span>
                          <button onClick={postComment} className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} disabled={postingComment || !newComment.trim()}>
                            <Send size={12} /> {postingComment ? 'Posting...' : 'Post to Jira'}
                          </button>
                        </div>
                      </div>

                      {/* Comment list */}
                      {comments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                          <MessageSquare size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                          <p>No comments yet</p>
                        </div>
                      ) : [...comments].reverse().map(c => (
                        <div key={c.id} style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: '3px solid var(--border-bright)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, color: 'white', overflow: 'hidden',
                            }}>
                              {c.author?.avatarUrls?.['24x24']
                                ? <img src={c.author.avatarUrls['24x24']} style={{ width: '100%' }} alt="" />
                                : c.author?.displayName?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.author?.displayName || 'Unknown'}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{timeAgo(c.created)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {adfToText(c.body)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Subtasks tab */}
                  {tab === 'subtasks' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div className="section-title">Subtasks</div>
                        <button onClick={() => setShowSubtaskForm(!showSubtaskForm)} className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}>
                          <Plus size={12} /> Add Subtask
                        </button>
                      </div>

                      {/* Subtask creation form */}
                      {showSubtaskForm && (
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>SUMMARY *</label>
                            <input value={subtaskForm.summary} onChange={e => setSubtaskForm(f => ({ ...f, summary: e.target.value }))} placeholder="Subtask summary..." />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>PRIORITY</label>
                              <select value={subtaskForm.priority} onChange={e => setSubtaskForm(f => ({ ...f, priority: e.target.value }))}>
                                {['Highest', 'High', 'Medium', 'Low', 'Lowest'].map(p => <option key={p}>{p}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>ASSIGNEE</label>
                              <select value={subtaskForm.assignee} onChange={e => setSubtaskForm(f => ({ ...f, assignee: e.target.value }))}>
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.accountId} value={u.accountId}>{u.displayName}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowSubtaskForm(false)} className="btn btn-secondary" style={{ fontSize: 11 }}>Cancel</button>
                            <button onClick={createSub} className="btn btn-primary" style={{ fontSize: 11 }} disabled={creatingSubtask}>
                              {creatingSubtask ? 'Creating...' : 'Create in Jira'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Subtask list */}
                      {(!f?.subtasks || f.subtasks.length === 0) && !showSubtaskForm ? (
                        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                          <GitBranch size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                          <p>No subtasks yet</p>
                        </div>
                      ) : (f?.subtasks || []).map(sub => (
                        <div key={sub.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', background: 'var(--bg-secondary)',
                          borderRadius: 8, marginBottom: 6,
                          borderLeft: '3px solid var(--accent-violet)',
                        }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-violet)', minWidth: 80 }}>{sub.key}</span>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{sub.fields?.summary}</span>
                          <span className={`badge badge-${STATUS_BADGE[sub.fields?.status?.name] || 'gray'}`} style={{ fontSize: 10 }}>
                            {sub.fields?.status?.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Activity tab */}
                  {tab === 'activity' && (
                    <div>
                      <div className="section-title" style={{ marginBottom: 12 }}>Issue Timeline</div>
                      {[
                        { label: 'Created', date: f?.created, icon: '🆕', color: 'var(--accent-emerald)' },
                        { label: 'Last Updated', date: f?.updated, icon: '✏️', color: 'var(--accent-blue)' },
                        { label: 'Due Date', date: f?.duedate, icon: '📅', color: f?.duedate && new Date(f.duedate) < new Date() ? 'var(--accent-rose)' : 'var(--accent-amber)' },
                      ].filter(e => e.date).map(event => (
                        <div key={event.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                          <span style={{ fontSize: 18 }}>{event.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: event.color }}>{event.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {new Date(event.date).toLocaleString()} ({timeAgo(event.date)})
                            </div>
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop: 16 }}>
                        <div className="section-title" style={{ marginBottom: 12 }}>Comment Activity ({comments.length})</div>
                        {comments.length === 0
                          ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No comments yet</p>
                          : comments.map(c => (
                            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 70 }}>{timeAgo(c.created)}</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{c.author?.displayName}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>commented</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: meta sidebar */}
              <div style={{ padding: 20 }}>
                {[
                  { label: 'ASSIGNEE', value: f?.assignee?.displayName || 'Unassigned', icon: User },
                  { label: 'REPORTER', value: f?.reporter?.displayName || '—', icon: User },
                  { label: 'ISSUE TYPE', value: `${TYPE_ICONS[f?.issuetype?.name] || ''} ${f?.issuetype?.name}`, icon: null },
                  { label: 'PRIORITY', value: f?.priority?.name, icon: AlertTriangle, color: PRIORITY_COLORS[f?.priority?.name] },
                  { label: 'PROJECT', value: f?.project?.name, icon: Tag },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: item.color || 'var(--text-secondary)', fontWeight: 500 }}>{item.value || '—'}</div>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>DATES</div>
                  {[
                    { label: 'Created', val: f?.created },
                    { label: 'Updated', val: f?.updated },
                    { label: 'Due', val: f?.duedate },
                  ].map(d => (
                    <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.label}</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: d.label === 'Due' && d.val && new Date(d.val) < new Date() ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                        {d.val ? timeAgo(d.val) : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {f?.labels?.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>LABELS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {f.labels.map(l => <span key={l} className="badge badge-gray" style={{ fontSize: 10 }}>{l}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Click outside transitions */}
      {showTransitions && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowTransitions(false)} />}
    </div>
  );
}
