import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, FileText, Trash2, ExternalLink,
  RefreshCw, Search, X, Save
} from 'lucide-react';
import Header from '../components/Header';
import {
  getConfluenceSpaces, getSpacePages,
  createConfluencePage, deleteConfluencePage,
  createMeetingNotes, createSprintReport,
  getBoards, getSprints, getSprintIssues
} from '../services/api';
import toast from 'react-hot-toast';

const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
};

// ── Spaces & Pages tab ───────────────────────────────────────────────────────
function SpacesTab({ jiraBase }) {
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPages, setLoadingPages] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newPage, setNewPage] = useState({ title: '', body: '' });
  const [creating, setCreating] = useState(false);

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getConfluenceSpaces();
      setSpaces(s || []);
      if (s?.length > 0) setSelectedSpace(s[0]);
    } catch (e) { toast.error('Confluence spaces error: ' + e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  useEffect(() => {
    if (!selectedSpace) return;
    setLoadingPages(true);
    getSpacePages(selectedSpace.id)
      .then(p => setPages(p || []))
      .catch(() => {})
      .finally(() => setLoadingPages(false));
  }, [selectedSpace]);

  const handleCreate = async () => {
    if (!newPage.title.trim()) { toast.error('Title required'); return; }
    setCreating(true);
    try {
      await createConfluencePage({ spaceId: selectedSpace.id, title: newPage.title, body: `<p>${newPage.body || newPage.title}</p>` });
      toast.success('Page created in Confluence!');
      setShowCreate(false);
      setNewPage({ title: '', body: '' });
      const p = await getSpacePages(selectedSpace.id);
      setPages(p || []);
    } catch (e) { toast.error('Failed: ' + e); }
    finally { setCreating(false); }
  };

  const handleDelete = async (pageId, title) => {
    if (!window.confirm(`Delete "${title}" from Confluence?`)) return;
    try {
      await deleteConfluencePage(pageId);
      toast.success('Page deleted');
      setPages(prev => prev.filter(p => p.id !== pageId));
    } catch (e) { toast.error('Delete failed: ' + e); }
  };

  const filteredPages = pages.filter(p => !search || p.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', flex: 1, overflow: 'hidden' }}>
      {/* Space list */}
      <div style={{ borderRight: '1px solid var(--border)', overflow: 'auto', padding: '12px 0' }}>
        <div style={{ padding: '0 12px 8px', fontSize: 10, letterSpacing: '1px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SPACES</div>
        {loading ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36, margin: '4px 12px' }} />) :
          spaces.length === 0 ? (
            <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
              No Confluence spaces found.<br />Make sure Confluence is enabled on your Atlassian site.
            </div>
          ) : spaces.map(s => (
            <button key={s.id} onClick={() => setSelectedSpace(s)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 14px', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left',
              background: selectedSpace?.id === s.id ? 'rgba(59,130,246,0.1)' : 'transparent',
              borderLeft: selectedSpace?.id === s.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              transition: 'var(--transition)',
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {s.key?.substring(0, 2)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: selectedSpace?.id === s.id ? 'var(--accent-blue)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.key}</div>
              </div>
            </button>
          ))}
      </div>

      {/* Pages */}
      <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedSpace && (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
                <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pages..." style={{ paddingLeft: 28, height: 32, fontSize: 12 }} />
              </div>
              <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
                <Plus size={13} /> New Page
              </button>
              {jiraBase && (
                <a href={`${jiraBase}/wiki/spaces/${selectedSpace.key}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={12} /> Open in Confluence
                </a>
              )}
            </div>

            {showCreate && (
              <div style={{ margin: 16, padding: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>New Page in "{selectedSpace.name}"</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>TITLE *</label>
                  <input value={newPage.title} onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))} placeholder="Page title..." />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>CONTENT</label>
                  <textarea value={newPage.body} onChange={e => setNewPage(p => ({ ...p, body: e.target.value }))} placeholder="Page content..." style={{ minHeight: 80, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCreate(false)} className="btn btn-secondary" style={{ fontSize: 12 }}>Cancel</button>
                  <button onClick={handleCreate} className="btn btn-primary" style={{ fontSize: 12 }} disabled={creating}>
                    <Save size={12} /> {creating ? 'Creating...' : 'Create in Confluence'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {loadingPages ? (
                [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8 }} />)
              ) : filteredPages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
                  <p style={{ fontSize: 13, marginBottom: 8 }}>No pages yet in this space</p>
                  <button onClick={() => setShowCreate(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 13 }}>+ Create first page →</button>
                </div>
              ) : filteredPages.map(page => (
                <div key={page.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, marginBottom: 6, transition: 'var(--transition)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {timeAgo(page.version?.createdAt || page.createdAt)} · version {page.version?.number || 1}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {jiraBase && (
                      <a href={`${jiraBase}/wiki${page._links?.webui || ''}`} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', padding: 5, color: 'var(--accent-blue)', cursor: 'pointer' }}>
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button onClick={() => handleDelete(page.id, page.title)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: 5, opacity: 0.6 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Meeting Notes tab ────────────────────────────────────────────────────────
function MeetingNotesTab() {
  const [spaces, setSpaces] = useState([]);
  const [form, setForm] = useState({ spaceId: '', title: 'Governance Meeting', attendees: '', agenda: '', notes: '', decisions: '', actionItems: [{ action: '', owner: '', dueDate: '' }] });
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getConfluenceSpaces().then(s => { setSpaces(s || []); if (s?.length > 0) setForm(f => ({ ...f, spaceId: s[0].id })); }).catch(() => {});
  }, []);

  const addAction = () => setForm(f => ({ ...f, actionItems: [...f.actionItems, { action: '', owner: '', dueDate: '' }] }));
  const removeAction = (i) => setForm(f => ({ ...f, actionItems: f.actionItems.filter((_, idx) => idx !== i) }));
  const setAction = (i, k, v) => setForm(f => ({ ...f, actionItems: f.actionItems.map((a, idx) => idx === i ? { ...a, [k]: v } : a) }));

  const submit = async () => {
    if (!form.spaceId || !form.title) { toast.error('Space and title required'); return; }
    setCreating(true);
    try {
      const r = await createMeetingNotes({ spaceId: form.spaceId, title: form.title, attendees: form.attendees.split(',').map(a => a.trim()).filter(Boolean), agenda: form.agenda, notes: form.notes, decisions: form.decisions, actionItems: form.actionItems.filter(a => a.action) });
      setResult(r);
      toast.success('Meeting notes saved to Confluence!');
    } catch (e) { toast.error('Failed: ' + e); }
    finally { setCreating(false); }
  };

  const L = { display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' };
  const F = { marginBottom: 14 };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 680 }}>
        {result && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>✅</span>
            <span style={{ fontSize: 13, color: 'var(--accent-emerald)', fontWeight: 600 }}>Created: "{result.title}"</span>
            <button onClick={() => setResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}><X size={14} /></button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={F}><label style={L}>CONFLUENCE SPACE *</label><select value={form.spaceId} onChange={e => setF('spaceId', e.target.value)}>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div style={F}><label style={L}>MEETING TITLE *</label><input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Governance Review Meeting" /></div>
        </div>
        <div style={F}><label style={L}>ATTENDEES (comma separated)</label><input value={form.attendees} onChange={e => setF('attendees', e.target.value)} placeholder="Akash, Dr. Sharma, PMO Lead..." /></div>
        <div style={F}><label style={L}>AGENDA</label><textarea value={form.agenda} onChange={e => setF('agenda', e.target.value)} placeholder="1. Sprint review&#10;2. Risk discussion" style={{ minHeight: 70 }} /></div>
        <div style={F}><label style={L}>MEETING NOTES</label><textarea value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Key discussion points..." style={{ minHeight: 80 }} /></div>
        <div style={F}><label style={L}>DECISIONS MADE</label><textarea value={form.decisions} onChange={e => setF('decisions', e.target.value)} placeholder="Decisions taken..." style={{ minHeight: 60 }} /></div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...L, marginBottom: 0 }}>ACTION ITEMS</label>
            <button onClick={addAction} className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}><Plus size={11} /> Add</button>
          </div>
          {form.actionItems.map((a, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={a.action} onChange={e => setAction(i, 'action', e.target.value)} placeholder="Action item..." style={{ fontSize: 12 }} />
              <input value={a.owner} onChange={e => setAction(i, 'owner', e.target.value)} placeholder="Owner" style={{ fontSize: 12 }} />
              <input type="date" value={a.dueDate} onChange={e => setAction(i, 'dueDate', e.target.value)} style={{ fontSize: 12 }} />
              <button onClick={() => removeAction(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}><X size={14} /></button>
            </div>
          ))}
        </div>
        <button onClick={submit} className="btn btn-primary" disabled={creating} style={{ width: '100%', justifyContent: 'center', padding: 10 }}>
          <Save size={14} /> {creating ? 'Saving to Confluence...' : 'Save Meeting Notes to Confluence'}
        </button>
      </div>
    </div>
  );
}

// ── Sprint Reports tab ───────────────────────────────────────────────────────
function SprintReportsTab() {
  const [spaces, setSpaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    Promise.allSettled([getConfluenceSpaces(), getBoards()]).then(([s, b]) => {
      if (s.status === 'fulfilled') { setSpaces(s.value || []); if (s.value?.length > 0) setSelectedSpace(s.value[0].id); }
      if (b.status === 'fulfilled') { setBoards(b.value || []); if (b.value?.length > 0) setSelectedBoard(b.value[0]); }
    });
  }, []);

  useEffect(() => {
    if (!selectedBoard) return;
    getSprints(selectedBoard.id).then(s => {
      setSprints(s || []);
      const active = s?.find(sp => sp.state === 'active') || s?.[0];
      if (active) setSelectedSprint(active);
    }).catch(() => {});
  }, [selectedBoard]);

  const loadPreview = async () => {
    if (!selectedSprint) return;
    setLoadingPreview(true);
    try {
      const r = await getSprintIssues(selectedSprint.id);
      const issues = r.issues || [];
      const done = issues.filter(i => i.fields?.status?.name === 'Done').length;
      setPreview({ issues, done, total: issues.length, completion: issues.length > 0 ? Math.round((done / issues.length) * 100) : 0 });
    } catch (e) { toast.error('Failed to preview: ' + e); }
    finally { setLoadingPreview(false); }
  };

  const generate = async () => {
    if (!selectedSprint || !selectedSpace) { toast.error('Select sprint and Confluence space'); return; }
    setGenerating(true);
    try {
      const r = await getSprintIssues(selectedSprint.id);
      const issues = (r.issues || []).map(i => ({ key: i.key, summary: i.fields?.summary, status: i.fields?.status?.name, priority: i.fields?.priority?.name, assignee: i.fields?.assignee?.displayName }));
      const done = issues.filter(i => i.status === 'Done').length;
      const res = await createSprintReport({ spaceId: selectedSpace, sprintName: selectedSprint.name, projectKey: selectedBoard?.name || '', issues, completionRate: issues.length > 0 ? Math.round((done / issues.length) * 100) : 0, totalIssues: issues.length, doneIssues: done });
      setResult(res);
      toast.success('Sprint report pushed to Confluence!');
    } catch (e) { toast.error('Failed: ' + e); }
    finally { setGenerating(false); }
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 680 }}>
        {result && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>✅</span>
            <span style={{ fontSize: 13, color: 'var(--accent-emerald)', fontWeight: 600 }}>Report created: "{result.title}"</span>
            <button onClick={() => setResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}><X size={14} /></button>
          </div>
        )}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Generate Sprint Report → Push to Confluence</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>BOARD</label>
              <select value={selectedBoard?.id || ''} onChange={e => setSelectedBoard(boards.find(b => b.id === +e.target.value))}>{boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>SPRINT</label>
              <select value={selectedSprint?.id || ''} onChange={e => setSelectedSprint(sprints.find(s => s.id === +e.target.value))}>{sprints.map(s => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>CONFLUENCE SPACE</label>
              <select value={selectedSpace} onChange={e => setSelectedSpace(e.target.value)}>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={loadPreview} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled={loadingPreview}>
                <RefreshCw size={13} style={{ animation: loadingPreview ? 'spin 1s linear infinite' : 'none' }} />
                {loadingPreview ? 'Loading...' : 'Preview Data'}
              </button>
            </div>
          </div>

          {preview && (
            <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                {[{l:'TOTAL',v:preview.total,c:'var(--accent-blue)'},{l:'DONE',v:preview.done,c:'var(--accent-emerald)'},{l:'COMPLETION',v:`${preview.completion}%`,c:'var(--accent-amber)'}].map(s=>(
                  <div key={s.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {preview.issues.slice(0,5).map(i => (
                <div key={i.id} style={{ display:'flex', gap: 8, padding:'4px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize: 10, color:'var(--accent-blue)', minWidth: 80 }}>{i.key}</span>
                  <span style={{ fontSize: 12, flex:1, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i.fields?.summary}</span>
                  <span className={`badge badge-${i.fields?.status?.name==='Done'?'green':i.fields?.status?.name==='In Progress'?'amber':'gray'}`} style={{ fontSize:9 }}>{i.fields?.status?.name}</span>
                </div>
              ))}
              {preview.issues.length > 5 && <div style={{ fontSize:11, color:'var(--text-muted)', padding:'4px 0' }}>+{preview.issues.length-5} more...</div>}
            </div>
          )}

          <button onClick={generate} className="btn btn-primary" disabled={generating || !selectedSprint} style={{ width:'100%', justifyContent:'center', padding: 10 }}>
            <FileText size={14} /> {generating ? 'Generating...' : 'Generate & Push to Confluence'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function Knowledge() {
  const [tab, setTab] = useState('spaces');
  const jiraBase = localStorage.getItem('jiraUrl') || process.env.REACT_APP_JIRA_BASE_URL || '';

  const TABS = [
    { key: 'spaces', label: '📚 Spaces & Pages' },
    { key: 'meeting', label: '📝 Meeting Notes' },
    { key: 'reports', label: '📊 Sprint Reports' },
    { key: 'roadmap', label: '🗺️ Roadmap' },
  ];

  const phases = [
    {n:1,t:'Atlassian Organization Foundation',items:['Atlassian Org','Jira Software','Confluence','Identity management']},
    {n:2,t:'Hub & Spoke Architecture',items:['APNI-HUB project','Spoke college projects','Multi-tenant structure','Cross-college monitoring']},
    {n:3,t:'Issue Architecture',items:['Epic/Story/Task/Subtask','Risk & Incident types','Milestones','Issue detail view with comments']},
    {n:4,t:'Workflow Architecture',items:['Backlog → Done pipeline','Drag-and-drop Kanban','Status transitions']},
    {n:5,t:'Role & Permission Architecture',items:['Hub Admin, Spoke Admin, PMO','Faculty, Mentor, Executive','Role assignment UI']},
    {n:6,t:'Dashboard Architecture',items:['Hub executive dashboard','Cross-spoke analytics','Risk heatmaps','Sprint analytics']},
    {n:7,t:'Automation Engine',items:['Daily overdue cron','Sprint close detection','AI escalation to Jira','Governance alerts']},
    {n:8,t:'Confluence Knowledge System',items:['Space & page management','Meeting notes creation','Sprint reports pushed to Confluence','Governance documentation']},
    {n:9,t:'AI / Gemini Intelligence Layer',items:['Sprint summaries','Risk detection','Workload analysis','Executive insights','Governance chat']},
    {n:10,t:'KPI Standardization',items:['Governance Score','Sprint Velocity','Completion Rate','Risk Index','Overdue %']},
    {n:11,t:'Comments & Collaboration',items:['Full comments UI','Post to Jira','Audit trail','Activity timeline','Subtask creation']},
    {n:12,t:'Analytics Engine',items:['Governance health radar','Per-project breakdown','Priority & type charts','Project completion rates']},
    {n:13,t:'Frontend Development',items:['Enterprise React dashboard','Dark design system','Drag-and-drop Kanban','AI chat interface']},
  ];

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Header title="Knowledge System" subtitle="Confluence integration & documentation" />
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', padding:'0 24px', background:'var(--bg-secondary)', flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background:'none', border:'none', padding:'13px 16px', fontSize:12,
            cursor:'pointer', fontWeight:500,
            color: tab===t.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: tab===t.key ? '2px solid var(--accent-blue)' : '2px solid transparent',
            marginBottom:-1, transition:'var(--transition)', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {tab === 'spaces'  && <SpacesTab jiraBase={jiraBase} />}
        {tab === 'meeting' && <MeetingNotesTab />}
        {tab === 'reports' && <SprintReportsTab />}
        {tab === 'roadmap' && (
          <div style={{ flex:1, overflow:'auto', padding:24 }}>
            <div style={{ maxWidth:720 }}>
              <div style={{ marginBottom:20, padding:'14px 18px', background:'linear-gradient(135deg,rgba(59,130,246,0.06),rgba(16,185,129,0.06))', border:'1px solid rgba(59,130,246,0.2)', borderRadius:10 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, marginBottom:4 }}>APNILEAP — All 13 Phases Complete ✅</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>Enterprise Governance OS fully operational</div>
              </div>
              {phases.map(p => (
                <div key={p.n} className="card" style={{ marginBottom:8, padding:'14px 18px', borderLeft:'3px solid var(--accent-emerald)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                    <div style={{ width:28, height:28, borderRadius:6, background:'linear-gradient(135deg,var(--accent-blue),var(--accent-emerald))', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>{p.n}</div>
                    <div style={{ flex:1, fontWeight:600, fontSize:13 }}>Phase {p.n} — {p.t}</div>
                    <span className="badge badge-green" style={{ fontSize:9 }}>✓ DONE</span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {p.items.map(item => <span key={item} style={{ fontSize:11, color:'var(--text-secondary)', background:'var(--bg-secondary)', padding:'3px 8px', borderRadius:4 }}>{item}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
