import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import { getBoards, getSprints, getSprintIssues, getTransitions, transitionIssue } from '../services/api';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'todo',     label: 'TO DO',       color: '#3b82f6', statuses: ['To Do', 'Backlog', 'Open'] },
  { key: 'inprog',   label: 'IN PROGRESS', color: '#f59e0b', statuses: ['In Progress'] },
  { key: 'review',   label: 'IN REVIEW',   color: '#8b5cf6', statuses: ['Review', 'In Review', 'Testing'] },
  { key: 'done',     label: 'DONE',        color: '#10b981', statuses: ['Done', 'Approved', 'Closed'] },
];

const STATE_COLOR = { active: 'green', future: 'blue', closed: 'gray' };

export default function Sprints() {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [dragging, setDragging] = useState(null); // { issueKey, fromCol }
  const [dragOver, setDragOver] = useState(null);
  const [transitionMap, setTransitionMap] = useState({}); // issueKey -> transitions[]

  useEffect(() => {
    getBoards()
      .then(b => {
        setBoards(b || []);
        if (b?.length > 0) setSelectedBoard(b[0]);
      })
      .catch(() => toast.error('Could not load boards'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBoard) return;
    getSprints(selectedBoard.id)
      .then(s => {
        setSprints(s || []);
        const active = s?.find(sp => sp.state === 'active') || s?.[0];
        if (active) setSelectedSprint(active);
      })
      .catch(() => {});
  }, [selectedBoard]);

  useEffect(() => {
    if (!selectedSprint) return;
    setLoadingIssues(true);
    setIssues([]);
    getSprintIssues(selectedSprint.id)
      .then(r => setIssues(r.issues || []))
      .catch(e => toast.error('Could not load sprint issues'))
      .finally(() => setLoadingIssues(false));
  }, [selectedSprint]);

  // Pre-load transitions for all issues so drag works instantly
  useEffect(() => {
    if (issues.length === 0) return;
    issues.forEach(async issue => {
      if (transitionMap[issue.key]) return;
      try {
        const t = await getTransitions(issue.key);
        setTransitionMap(prev => ({ ...prev, [issue.key]: t }));
      } catch {}
    });
  }, [issues]);

  const getColumn = (issue) => {
    const status = issue.fields?.status?.name || '';
    return COLUMNS.find(c => c.statuses.some(s => s.toLowerCase() === status.toLowerCase())) || COLUMNS[0];
  };

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const handleDragStart = (e, issue) => {
    setDragging({ issueKey: issue.key, fromCol: getColumn(issue).key });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', issue.key);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colKey);
  };

  const handleDrop = async (e, targetCol) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging.fromCol === targetCol.key) { setDragging(null); return; }

    const issueKey = dragging.issueKey;
    setDragging(null);

    const transitions = transitionMap[issueKey];
    if (!transitions || transitions.length === 0) {
      toast.error('No transitions available for this issue');
      return;
    }

    // Find transition matching target column statuses
    const match = transitions.find(t =>
      targetCol.statuses.some(s => s.toLowerCase() === (t.to?.name || t.name)?.toLowerCase())
    );

    if (!match) {
      // Show available transitions
      const available = transitions.map(t => t.to?.name || t.name).join(', ');
      toast.error(`No direct transition to "${targetCol.label}". Available: ${available}`);
      return;
    }

    // Optimistic update
    setIssues(prev => prev.map(i =>
      i.key === issueKey
        ? { ...i, fields: { ...i.fields, status: { name: match.to?.name || match.name } } }
        : i
    ));

    try {
      await transitionIssue(issueKey, match.id);
      toast.success(`${issueKey} → ${match.to?.name || match.name}`);
      // Refresh transitions cache for this issue
      const fresh = await getTransitions(issueKey);
      setTransitionMap(prev => ({ ...prev, [issueKey]: fresh }));
    } catch (err) {
      toast.error(`Transition failed: ${err}`);
      // Revert on failure
      getSprintIssues(selectedSprint.id).then(r => setIssues(r.issues || []));
    }
  };

  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const done = issues.filter(i => getColumn(i).key === 'done').length;
  const velocity = issues.length > 0 ? Math.round((done / issues.length) * 100) : 0;

  const reloadIssues = () => {
    if (!selectedSprint) return;
    setLoadingIssues(true);
    getSprintIssues(selectedSprint.id)
      .then(r => setIssues(r.issues || []))
      .finally(() => setLoadingIssues(false));
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="Sprint Board" subtitle={selectedSprint?.name || 'Select a sprint'} loading={loadingIssues} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 24, paddingBottom: 0 }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedBoard?.id || ''} onChange={e => setSelectedBoard(boards.find(b => b.id === +e.target.value))}
            style={{ height: 34, fontSize: 12, width: 'auto', minWidth: 160 }}>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={selectedSprint?.id || ''} onChange={e => setSelectedSprint(sprints.find(s => s.id === +e.target.value))}
            style={{ height: 34, fontSize: 12, width: 'auto', minWidth: 200 }}>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
          </select>
          <button onClick={reloadIssues} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
            <RefreshCw size={13} style={{ animation: loadingIssues ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {selectedSprint && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'center' }}>
              {[
                { label: 'VELOCITY', value: `${velocity}%`, color: 'var(--accent-emerald)' },
                { label: 'TOTAL', value: issues.length, color: 'var(--accent-blue)' },
                { label: 'DONE', value: done, color: 'var(--accent-emerald)' },
                { label: 'IN PROG', value: issues.filter(i => getColumn(i).key === 'inprog').length, color: 'var(--accent-amber)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '1px', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sprint state + dates */}
        {selectedSprint && (
          <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge badge-${STATE_COLOR[selectedSprint.state] || 'gray'}`}>
              {selectedSprint.state?.toUpperCase()}
            </span>
            {selectedSprint.startDate && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {new Date(selectedSprint.startDate).toLocaleDateString()} → {selectedSprint.endDate ? new Date(selectedSprint.endDate).toLocaleDateString() : '∞'}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
              💡 Drag cards between columns to update status in Jira
            </span>
          </div>
        )}

        {/* Kanban Board */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48, gap: 8 }}>
            <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
          </div>
        ) : boards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <GitBranch size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No boards found. Create a Scrum board in Jira first.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flex: 1, overflow: 'hidden', paddingBottom: 24 }}>
            {COLUMNS.map(col => {
              const colIssues = issues.filter(i => getColumn(i).key === col.key);
              const isOver = dragOver === col.key;

              return (
                <div key={col.key}
                  style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  onDragOver={e => handleDragOver(e, col.key)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => handleDrop(e, col)}>

                  {/* Column Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 4px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: col.color, boxShadow: `0 0 8px ${col.color}60` }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {col.label}
                    </span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: col.color, fontWeight: 700 }}>
                      {colIssues.length}
                    </span>
                  </div>

                  {/* Column Body */}
                  <div style={{
                    flex: 1, overflow: 'auto',
                    background: isOver ? `${col.color}08` : 'rgba(13,20,32,0.5)',
                    border: isOver ? `2px dashed ${col.color}60` : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 8,
                    minHeight: 100,
                    transition: 'all 0.15s',
                  }}>
                    {loadingIssues ? (
                      [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 8 }} />)
                    ) : colIssues.length === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '32px 8px',
                        color: isOver ? col.color : 'var(--text-muted)',
                        fontSize: 12, transition: 'color 0.15s',
                        border: isOver ? `1px dashed ${col.color}40` : '1px dashed transparent',
                        borderRadius: 8,
                      }}>
                        {isOver ? '⬇ Drop here' : 'Empty'}
                      </div>
                    ) : colIssues.map(issue => {
                      const isDraggingThis = dragging?.issueKey === issue.key;
                      return (
                        <div key={issue.id}
                          draggable
                          onDragStart={e => handleDragStart(e, issue)}
                          onDragEnd={handleDragEnd}
                          style={{
                            background: isDraggingThis ? 'transparent' : 'var(--bg-card)',
                            border: isDraggingThis ? `1px dashed ${col.color}` : '1px solid var(--border)',
                            borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                            cursor: 'grab',
                            transition: 'all 0.15s',
                            opacity: isDraggingThis ? 0.4 : 1,
                            borderLeft: `3px solid ${col.color}`,
                            userSelect: 'none',
                          }}
                          onMouseEnter={e => { if (!isDraggingThis) { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.3)`; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>

                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: col.color, marginBottom: 5, fontWeight: 600 }}>
                            {issue.key}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8, wordBreak: 'break-word' }}>
                            {issue.fields?.summary}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                              {issue.fields?.issuetype?.name || 'Task'}
                            </span>
                            {issue.fields?.priority?.name && (
                              <span style={{ fontSize: 10, color: ({ Highest: '#f43f5e', High: '#f97316', Medium: '#f59e0b', Low: '#3b82f6', Lowest: '#64748b' })[issue.fields.priority.name] || 'var(--text-muted)' }}>
                                ● {issue.fields.priority.name}
                              </span>
                            )}
                            {issue.fields?.assignee ? (
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%', overflow: 'hidden',
                                background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-blue))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0,
                              }} title={issue.fields.assignee.displayName}>
                                {issue.fields.assignee.avatarUrls?.['24x24']
                                  ? <img src={issue.fields.assignee.avatarUrls['24x24']} style={{ width: '100%' }} alt="" />
                                  : issue.fields.assignee.displayName?.[0]?.toUpperCase()}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    {/* Drop zone indicator */}
                    {isOver && colIssues.length > 0 && (
                      <div style={{
                        height: 40, borderRadius: 8, border: `2px dashed ${col.color}60`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: col.color, marginTop: 4,
                      }}>
                        ⬇ Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
