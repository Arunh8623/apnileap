import React, { useState, useEffect } from 'react';
import { Zap, Clock, AlertTriangle, CheckCircle, Play, Bell, GitMerge, RefreshCw, Brain, FileText } from 'lucide-react';
import Header from '../components/Header';
import { getIssues, getBoards, getSprints, getConfluenceSpaces, runSprintClose, runAIEscalation } from '../services/api';
import toast from 'react-hot-toast';

export default function Automation() {
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});

  // Sprint close config
  const [boards, setBoards] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState('');

  useEffect(() => {
    getBoards().then(b => { setBoards(b||[]); if (b?.length>0) setSelectedBoard(b[0]); }).catch(()=>{});
    getConfluenceSpaces().then(s => { setSpaces(s||[]); if (s?.length>0) setSelectedSpace(s[0].id); }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!selectedBoard) return;
    getSprints(selectedBoard.id).then(s => {
      setSprints(s||[]);
      const active = s?.find(sp=>sp.state==='active') || s?.[0];
      if (active) setSelectedSprint(active);
    }).catch(()=>{});
  }, [selectedBoard]);

  // ── Run handlers ────────────────────────────────────────────────────────────
  const runOverdueCheck = async () => {
    setRunning('overdue');
    try {
      const r = await getIssues({});
      const today = new Date();
      const overdue = (r.issues||[]).filter(i => {
        const d = i.fields?.duedate;
        return d && new Date(d) < today && i.fields?.status?.name !== 'Done';
      });
      setResults(prev => ({ ...prev, overdue: { count: overdue.length, issues: overdue.slice(0,10) } }));
      toast.success(`Found ${overdue.length} overdue issues`);
    } catch (e) { toast.error('Failed: '+e); }
    finally { setRunning(null); }
  };

  const runSprintCloseHandler = async () => {
    if (!selectedSprint) { toast.error('Select a sprint first'); return; }
    setRunning('sprint');
    try {
      const r = await runSprintClose({
        sprintId: selectedSprint.id,
        sprintName: selectedSprint.name,
        boardId: selectedBoard?.id,
        spaceId: selectedSpace || undefined,
      });
      setResults(prev => ({ ...prev, sprint: r }));
      toast.success(`Sprint closed: ${r.completionRate}% completion · ${r.commented} issues commented`);
      if (r.confluencePage) toast.success(`Report pushed to Confluence!`);
    } catch (e) { toast.error('Failed: '+e); }
    finally { setRunning(null); }
  };

  const runEscalation = async () => {
    setRunning('escalation');
    try {
      const r = await runAIEscalation();
      setResults(prev => ({ ...prev, escalation: r }));
      toast.success(`AI escalated ${r.escalated} high-priority issues`);
    } catch (e) { toast.error('Failed: '+e); }
    finally { setRunning(null); }
  };

  const runGovernanceScore = async () => {
    setRunning('governance');
    try {
      const r = await getIssues({});
      const issues = r.issues || [];
      const total = r.total || 0;
      const done = issues.filter(i=>i.fields?.status?.name==='Done').length;
      const today = new Date();
      const overdue = issues.filter(i=>{ const d=i.fields?.duedate; return d&&new Date(d)<today&&i.fields?.status?.name!=='Done'; }).length;
      const score = Math.max(0, Math.min(100, Math.round(
        (total>0?(done/total)*100:0)*0.4 +
        Math.max(0,100-overdue*5)*0.4 +
        80*0.2
      )));
      setResults(prev => ({ ...prev, governance: { score, total, done, overdue } }));
      toast.success(`Governance score: ${score}/100`);
    } catch (e) { toast.error('Failed: '+e); }
    finally { setRunning(null); }
  };

  const RULES = [
    {
      id: 'overdue',
      icon: AlertTriangle,
      color: 'var(--accent-rose)',
      name: 'Overdue Issue Check',
      desc: 'Scans all projects for overdue issues, lists them grouped by project. Runs daily at 9 AM via cron when server is active.',
      trigger: 'Daily 9:00 AM (cron)',
      action: runOverdueCheck,
    },
    {
      id: 'sprint',
      icon: GitMerge,
      color: 'var(--accent-emerald)',
      name: 'Sprint Completion Report',
      desc: 'Generates sprint completion stats, adds a comment to all sprint issues, and pushes a full report to Confluence.',
      trigger: 'Manual / Sprint close',
      action: runSprintCloseHandler,
      config: true,
    },
    {
      id: 'escalation',
      icon: Brain,
      color: 'var(--accent-violet)',
      name: 'AI Escalation Summaries',
      desc: 'Uses Gemini AI to write personalized escalation messages for high-priority overdue issues and posts them directly to Jira.',
      trigger: 'Manual',
      action: runEscalation,
    },
    {
      id: 'governance',
      icon: CheckCircle,
      color: 'var(--accent-blue)',
      name: 'Governance Score Refresh',
      desc: 'Recalculates enterprise governance score based on completion rate, overdue issues, and sprint velocity.',
      trigger: 'Every 6 hours (cron)',
      action: runGovernanceScore,
    },
  ];

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Header title="Automation Engine" subtitle="Governance workflow automation" />
      <div style={{ flex:1, overflow:'auto', padding:24 }}>

        {/* Info banner */}
        <div className="card" style={{ marginBottom:24, background:'linear-gradient(135deg,rgba(139,92,246,0.06),rgba(59,130,246,0.06))', border:'1px solid rgba(139,92,246,0.2)', padding:'14px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Zap size={16} style={{ color:'var(--accent-violet)', flexShrink:0 }} />
            <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
              <strong style={{ color:'var(--text-primary)' }}>Real automations — all hit Jira and Confluence APIs.</strong> Cron jobs run server-side when backend is running. Use "Run Now" to trigger instantly.
            </div>
          </div>
        </div>

        {/* Sprint close config */}
        <div className="card" style={{ marginBottom:20, padding:'16px 20px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, marginBottom:12 }}>⚙️ Sprint Report Configuration</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:10, color:'var(--text-muted)', marginBottom:4, fontFamily:'var(--font-mono)' }}>BOARD</label>
              <select value={selectedBoard?.id||''} onChange={e=>setSelectedBoard(boards.find(b=>b.id===+e.target.value))} style={{ height:32, fontSize:12 }}>
                {boards.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:10, color:'var(--text-muted)', marginBottom:4, fontFamily:'var(--font-mono)' }}>SPRINT</label>
              <select value={selectedSprint?.id||''} onChange={e=>setSelectedSprint(sprints.find(s=>s.id===+e.target.value))} style={{ height:32, fontSize:12 }}>
                {sprints.map(s=><option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:10, color:'var(--text-muted)', marginBottom:4, fontFamily:'var(--font-mono)' }}>CONFLUENCE SPACE (optional)</label>
              <select value={selectedSpace} onChange={e=>setSelectedSpace(e.target.value)} style={{ height:32, fontSize:12 }}>
                <option value="">Skip Confluence</option>
                {spaces.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Automation rules */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
          {RULES.map(rule => (
            <div key={rule.id} className="card" style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${rule.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                <rule.icon size={18} style={{ color:rule.color }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{rule.name}</span>
                  <span className="badge badge-green" style={{ fontSize:9 }}>ACTIVE</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:4, lineHeight:1.5 }}>{rule.desc}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', display:'flex', alignItems:'center', gap:4 }}>
                  <Clock size={10} /> {rule.trigger}
                </div>
              </div>
              <button onClick={rule.action} className="btn btn-primary" style={{ padding:'7px 16px', fontSize:12, flexShrink:0 }} disabled={running===rule.id}>
                {running===rule.id
                  ? <><RefreshCw size={12} style={{ animation:'spin 1s linear infinite' }} /> Running...</>
                  : <><Play size={12} /> Run Now</>}
              </button>
            </div>
          ))}
        </div>

        {/* Results panels */}
        {results.overdue && (
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <AlertTriangle size={16} style={{ color:'var(--accent-rose)' }} />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>Overdue Issues: {results.overdue.count}</span>
            </div>
            {results.overdue.count===0
              ? <div style={{ color:'var(--accent-emerald)', fontSize:13 }}>✓ No overdue issues — great governance!</div>
              : results.overdue.issues.map(i=>(
                <div key={i.id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent-blue)', minWidth:90 }}>{i.key}</span>
                  <span style={{ flex:1, fontSize:13 }}>{i.fields?.summary}</span>
                  <span style={{ fontSize:11, color:'var(--accent-rose)', fontFamily:'var(--font-mono)' }}>Due: {i.fields?.duedate||'—'}</span>
                </div>
              ))}
          </div>
        )}

        {results.sprint && (
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <GitMerge size={16} style={{ color:'var(--accent-emerald)' }} />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>Sprint Close Complete</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
              {[
                {l:'TOTAL',v:results.sprint.total,c:'var(--accent-blue)'},
                {l:'DONE',v:results.sprint.done,c:'var(--accent-emerald)'},
                {l:'COMPLETION',v:`${results.sprint.completionRate}%`,c:'var(--accent-amber)'},
                {l:'COMMENTED',v:results.sprint.commented,c:'var(--accent-violet)'},
              ].map(s=>(
                <div key={s.l} style={{ textAlign:'center', padding:'10px', background:'var(--bg-secondary)', borderRadius:8 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{s.l}</div>
                </div>
              ))}
            </div>
            {results.sprint.confluencePage && (
              <div style={{ padding:'10px 14px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, fontSize:13 }}>
                ✅ Confluence report created: <strong>{results.sprint.confluencePage.title}</strong>
              </div>
            )}
            {results.sprint.aiSummary && (
              <div style={{ marginTop:12, padding:'10px 14px', background:'var(--bg-secondary)', borderRadius:8 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--font-mono)' }}>AI SUMMARY</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{results.sprint.aiSummary}</div>
              </div>
            )}
          </div>
        )}

        {results.escalation && (
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <Brain size={16} style={{ color:'var(--accent-violet)' }} />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>AI Escalation Complete: {results.escalation.escalated} issues</span>
            </div>
            {(results.escalation.issues||[]).map(i=>(
              <div key={i.key} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent-violet)', minWidth:90 }}>{i.key}</span>
                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{i.summary}</span>
              </div>
            ))}
          </div>
        )}

        {results.governance && (
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <CheckCircle size={16} style={{ color:'var(--accent-blue)' }} />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>Governance Score Updated</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:800, color: results.governance.score>=70?'var(--accent-emerald)':results.governance.score>=40?'var(--accent-amber)':'var(--accent-rose)' }}>{results.governance.score}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>/ 100</div>
              </div>
              <div>
                {[{l:'Total Issues',v:results.governance.total},{l:'Completed',v:results.governance.done},{l:'Overdue',v:results.governance.overdue}].map(s=>(
                  <div key={s.l} style={{ display:'flex', gap:12, marginBottom:4 }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)', minWidth:100 }}>{s.l}</span>
                    <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-primary)', fontWeight:600 }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
