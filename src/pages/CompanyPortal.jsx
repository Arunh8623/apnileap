import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, LogOut, RefreshCw, DollarSign,
  CheckCircle, Clock, FileText, Eye, Send, X, Save
} from 'lucide-react';
import Header from '../components/Header';
import {
  getMarketplaceProjects, postMarketplaceProject,
  getPayments, getPaymentStats
} from '../services/api';
import toast from 'react-hot-toast';

const STATUS_META = {
  open:        { badge: 'blue',   label: 'Open' },
  assigned:    { badge: 'amber',  label: 'Assigned' },
  in_progress: { badge: 'violet', label: 'In Progress' },
  submitted:   { badge: 'cyan',   label: 'Submitted' },
  approved:    { badge: 'green',  label: 'Approved' },
  completed:   { badge: 'green',  label: 'Completed ✓' },
};

const CATEGORIES = ['Software Development','Research','Data Science','UI/UX Design','Infrastructure','Consulting','Audit & Compliance','Other'];

export default function CompanyPortal({ company, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payStats, setPayStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState('projects'); // projects | payments | post

  const [form, setForm] = useState({
    title: '', description: '', requirements: '',
    budget: '', currency: 'INR', deadline: '',
    category: 'Software Development', skills: '',
    milestones: [
      { id: '1', name: 'M1 - Kickoff & Planning',    percent: 15, amount: 0 },
      { id: '2', name: 'M2 - Development Phase 1',   percent: 25, amount: 0 },
      { id: '3', name: 'M3 - Development Phase 2',   percent: 35, amount: 0 },
      { id: '4', name: 'M4 - Testing & Delivery',    percent: 25, amount: 0 },
    ],
  });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pay, ps] = await Promise.allSettled([
        getMarketplaceProjects({ companyId: company.id }),
        getPayments(),
        getPaymentStats(),
      ]);
      if (p.status === 'fulfilled')   setProjects(p.value || []);
      if (pay.status === 'fulfilled') setPayments(pay.value || []);
      if (ps.status === 'fulfilled')  setPayStats(ps.value);
    } finally { setLoading(false); }
  }, [company.id]);

  useEffect(() => { load(); }, [load]);

  // Update milestone amounts when budget changes
  useEffect(() => {
    const budget = Number(form.budget) || 0;
    setForm(f => ({
      ...f,
      milestones: f.milestones.map(m => ({ ...m, amount: Math.round(budget * m.percent / 100) })),
    }));
  }, [form.budget]);

  const handlePost = async () => {
    if (!form.title || !form.budget) { toast.error('Title and budget required'); return; }
    setCreating(true);
    try {
      await postMarketplaceProject({
        ...form,
        budget: Number(form.budget),
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        companyId: company.id,
        companyName: company.companyName,
        postedBy: 'company',
      });
      toast.success('Project posted! APNILEAP will assign it to a college.');
      setShowCreate(false);
      setTab('projects');
      load();
    } catch (e) { toast.error('Failed: ' + e); }
    finally { setCreating(false); }
  };

  const L = { display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' };
  const F = { marginBottom: 12 };

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const myPayments  = payments.filter(p => projects.some(pr => pr.id === p.projectId));
  const totalPaid   = myPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Company Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Building2 size={18} color="white" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{company.companyName}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{company.industry} · {company.email}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ fontSize: 12 }}>
            <Plus size={13} /> Post New Project
          </button>
          <button onClick={onLogout} className="btn btn-secondary" style={{ fontSize: 12 }}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px 24px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flexShrink: 0 }}>
        {[
          { l: 'MY PROJECTS', v: projects.length, c: 'var(--accent-blue)' },
          { l: 'IN PROGRESS', v: projects.filter(p => ['assigned','in_progress'].includes(p.status)).length, c: 'var(--accent-amber)' },
          { l: 'COMPLETED', v: projects.filter(p => p.status === 'completed').length, c: 'var(--accent-emerald)' },
          { l: 'TOTAL PAID', v: `₹${(totalPaid / 1000).toFixed(0)}K`, c: 'var(--accent-violet)' },
        ].map(s => (
          <div key={s.l} className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: s.c, lineHeight: 1 }}>{loading ? '...' : s.v}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding: '12px 24px 0', display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', flexShrink: 0, marginTop: 12 }}>
        {[
          { k: 'projects', l: `📋 My Projects (${projects.length})` },
          { k: 'payments', l: `💳 Payments (${myPayments.length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: '10px 18px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            color: tab === t.k ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: tab === t.k ? '2px solid var(--accent-blue)' : '2px solid transparent',
            marginBottom: -1, transition: 'var(--transition)',
          }}>{t.l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        {/* Projects Tab */}
        {tab === 'projects' && (
          loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 10 }} />)
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <FileText size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
              <p style={{ fontSize: 15, marginBottom: 8 }}>No projects posted yet</p>
              <button onClick={() => setShowCreate(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 13 }}>
                + Post your first project →
              </button>
            </div>
          ) : projects.map(project => {
            const meta = STATUS_META[project.status] || STATUS_META.open;
            const projPayments = myPayments.filter(p => p.projectId === project.id && p.status === 'paid');
            const paidAmt = projPayments.reduce((s, p) => s + (p.amount || 0), 0);
            const payPct  = project.budget > 0 ? Math.round((paidAmt / project.budget) * 100) : 0;

            return (
              <div key={project.id} className="card" style={{ marginBottom: 10, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span className={`badge badge-${meta.badge}`}>{meta.label}</span>
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>{project.category}</span>
                      {project.deadline && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>📅 {new Date(project.deadline).toLocaleDateString()}</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{project.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.description}</div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent-emerald)' }}>₹{(project.budget || 0).toLocaleString('en-IN')}</span>
                      {project.assignedSpoke && <span style={{ fontSize: 12, color: 'var(--accent-violet)' }}>🏛 {project.assignedSpokeName || project.assignedSpoke}</span>}
                      {project.jiraEpicKey && <span style={{ fontSize: 11, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{project.jiraEpicKey}</span>}
                    </div>
                    {/* Payment progress */}
                    {paidAmt > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 5, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden', maxWidth: 200 }}>
                          <div style={{ width: `${payPct}%`, height: '100%', background: 'var(--accent-emerald)', borderRadius: 3, transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>₹{paidAmt.toLocaleString()} paid ({payPct}%)</span>
                      </div>
                    )}
                  </div>

                  {/* Status timeline */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {['open','assigned','in_progress','submitted','approved','completed'].map((s, i) => {
                      const steps = ['open','assigned','in_progress','submitted','approved','completed'];
                      const current = steps.indexOf(project.status);
                      const done = i <= current;
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: done ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                            {STATUS_META[s]?.label || s}
                          </span>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: done ? 'var(--accent-emerald)' : 'var(--border)', flexShrink: 0 }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Payments Tab */}
        {tab === 'payments' && (
          <div>
            <div className="grid-3" style={{ marginBottom: 20 }}>
              {[
                { l: 'TOTAL BUDGET', v: `₹${totalBudget.toLocaleString('en-IN')}`, c: 'var(--accent-blue)' },
                { l: 'PAID', v: `₹${totalPaid.toLocaleString('en-IN')}`, c: 'var(--accent-emerald)' },
                { l: 'PENDING', v: `₹${(totalBudget - totalPaid).toLocaleString('en-IN')}`, c: 'var(--accent-amber)' },
              ].map(s => (
                <div key={s.l} className="card" style={{ textAlign: 'center', padding: '16px 20px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {myPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <DollarSign size={36} style={{ marginBottom: 10, opacity: 0.2 }} />
                <p>No payments yet</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 100px 90px', padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  {['MILESTONE','AMOUNT','PROJECT','STATUS','DATE'].map(h => (
                    <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '1px' }}>{h}</span>
                  ))}
                </div>
                {myPayments.map(pay => {
                  const proj = projects.find(p => p.id === pay.projectId);
                  return (
                    <div key={pay.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 100px 90px', padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pay.milestoneName || '—'}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--accent-emerald)' }}>₹{(pay.amount || 0).toLocaleString('en-IN')}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj?.title || '—'}</span>
                      <span className={`badge badge-${pay.status === 'paid' ? 'green' : 'amber'}`} style={{ fontSize: 10 }}>
                        {pay.status === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {pay.paidAt ? new Date(pay.paidAt).toLocaleDateString() : new Date(pay.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Project Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, animation: 'fadeIn 0.2s ease', margin: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Post New Project</h2>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>From {company.companyName} → APNILEAP will assign to a college</div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 24, maxHeight: '65vh', overflow: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ ...F, gridColumn: 'span 2' }}><label style={L}>PROJECT TITLE *</label><input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. ApniCart E-Commerce Platform" /></div>
                <div style={F}><label style={L}>CATEGORY</label><select value={form.category} onChange={e => setF('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div style={F}><label style={L}>DEADLINE</label><input type="date" value={form.deadline} onChange={e => setF('deadline', e.target.value)} /></div>
                <div style={{ ...F, gridColumn: 'span 2' }}><label style={L}>DESCRIPTION</label><textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="What needs to be built..." style={{ minHeight: 70 }} /></div>
                <div style={{ ...F, gridColumn: 'span 2' }}><label style={L}>REQUIREMENTS & DELIVERABLES</label><textarea value={form.requirements} onChange={e => setF('requirements', e.target.value)} placeholder="Tech stack, deliverables, acceptance criteria..." style={{ minHeight: 60 }} /></div>
                <div style={F}><label style={L}>TOTAL BUDGET (₹) *</label><input type="number" value={form.budget} onChange={e => setF('budget', e.target.value)} placeholder="100000" /></div>
                <div style={F}><label style={L}>SKILLS REQUIRED</label><input value={form.skills} onChange={e => setF('skills', e.target.value)} placeholder="React, Node.js, PostgreSQL..." /></div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="section-title" style={{ marginBottom: 10 }}>PAYMENT MILESTONES</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Payments are released by APNILEAP when each milestone is approved</div>
                {form.milestones.map((m, i) => (
                  <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input value={m.name} onChange={e => setForm(f => ({ ...f, milestones: f.milestones.map((ms, idx) => idx === i ? { ...ms, name: e.target.value } : ms) }))} style={{ fontSize: 12 }} />
                    <div style={{ position: 'relative' }}>
                      <input type="number" value={m.percent} min="0" max="100"
                        onChange={e => setForm(f => ({ ...f, milestones: f.milestones.map((ms, idx) => idx === i ? { ...ms, percent: Number(e.target.value), amount: Math.round((Number(form.budget) || 0) * Number(e.target.value) / 100) } : ms) }))}
                        style={{ paddingRight: 20, fontSize: 12 }} />
                      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>%</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-emerald)', textAlign: 'right', fontWeight: 700 }}>
                      ₹{(m.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: form.milestones.reduce((s,m)=>s+m.percent,0)===100?'var(--accent-emerald)':'var(--accent-rose)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  Total: {form.milestones.reduce((s, m) => s + m.percent, 0)}% {form.milestones.reduce((s,m)=>s+m.percent,0)===100?'✓':'(should be 100%)'}
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handlePost} className="btn btn-primary" disabled={creating}>
                <Send size={13} /> {creating ? 'Posting...' : 'Post Project to APNILEAP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
