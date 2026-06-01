import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, ClipboardList, DollarSign, Clock, CheckCircle,
  Plus, LogOut, RefreshCw, Eye, TrendingUp, FileText
} from 'lucide-react';
import {
  getMarketplaceProjects, postMarketplaceProject,
  getPayments, getPaymentStats
} from '../services/api';
import toast from 'react-hot-toast';

const STATUS_META = {
  open:         { color: 'var(--accent-blue)',    badge: 'blue',   label: 'Open' },
  assigned:     { color: 'var(--accent-amber)',   badge: 'amber',  label: 'Assigned' },
  in_progress:  { color: 'var(--accent-violet)',  badge: 'violet', label: 'In Progress' },
  submitted:    { color: 'var(--accent-cyan)',    badge: 'cyan',   label: 'Submitted' },
  approved:     { color: 'var(--accent-emerald)', badge: 'green',  label: 'Approved' },
  completed:    { color: 'var(--accent-emerald)', badge: 'green',  label: 'Completed ✓' },
};

const CATEGORIES = ['Software Development','Research','Data Science','UI/UX Design','Infrastructure','Consulting','Audit & Compliance','Other'];

export default function CompanyDashboard({ company, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payStats, setPayStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('projects'); // projects | payments | post
  const [form, setForm] = useState({
    title:'', description:'', requirements:'',
    budget:'', currency:'INR', deadline:'',
    category:'Software Development', skills:'',
    milestones:[
      {id:'1',name:'M1 - Foundation',percent:20,amount:0},
      {id:'2',name:'M2 - Core Features',percent:30,amount:0},
      {id:'3',name:'M3 - Testing & QA',percent:30,amount:0},
      {id:'4',name:'M4 - Final Delivery',percent:20,amount:0},
    ],
  });
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  // Update milestone amounts when budget changes
  useEffect(() => {
    const budget = Number(form.budget)||0;
    setForm(f=>({...f, milestones: f.milestones.map(m=>({...m, amount:Math.round(budget*m.percent/100)}))}));
  }, [form.budget]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pay, ps] = await Promise.allSettled([
        getMarketplaceProjects({ companyId: company.id }),
        getPayments(),
        getPaymentStats(),
      ]);
      if (p.status==='fulfilled') setProjects(p.value||[]);
      if (pay.status==='fulfilled') setPayments(pay.value||[]);
      if (ps.status==='fulfilled') setPayStats(ps.value);
    } finally { setLoading(false); }
  }, [company.id]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async () => {
    if (!form.title || !form.budget) { toast.error('Title and budget required'); return; }
    setCreating(true);
    try {
      await postMarketplaceProject({
        ...form,
        budget: Number(form.budget),
        skills: form.skills.split(',').map(s=>s.trim()).filter(Boolean),
        companyId: company.id,
        companyName: company.companyName,
        postedBy: 'company',
      });
      toast.success('Project posted! APNILEAP will assign it to a college.');
      setActiveTab('projects');
      setForm({ title:'',description:'',requirements:'',budget:'',currency:'INR',deadline:'',category:'Software Development',skills:'',
        milestones:[{id:'1',name:'M1 - Foundation',percent:20,amount:0},{id:'2',name:'M2 - Core Features',percent:30,amount:0},{id:'3',name:'M3 - Testing & QA',percent:30,amount:0},{id:'4',name:'M4 - Final Delivery',percent:20,amount:0}] });
      load();
    } catch(e) { toast.error('Failed: '+e); }
    finally { setCreating(false); }
  };

  const myPayments = payments.filter(p => projects.some(pr => pr.id===p.projectId));
  const totalPaid = myPayments.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount||0),0);

  const L = { display:'block', fontSize:10, color:'var(--text-muted)', marginBottom:4, fontFamily:'var(--font-mono)' };
  const F = { marginBottom:12 };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', flexDirection:'column' }}>
      {/* Top nav */}
      <header style={{ background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', padding:'0 28px', height:60, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg, var(--accent-violet), var(--accent-blue))', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Building2 size={16} color="white" />
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15 }}>{company.companyName}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>APNILEAP Industry Partner</div>
          </div>
        </div>

        <div style={{ display:'flex', gap:4, marginLeft:32, background:'var(--bg-card)', borderRadius:8, padding:4, border:'1px solid var(--border)' }}>
          {[
            {k:'projects', l:'My Projects', icon:ClipboardList},
            {k:'payments', l:'Payments',    icon:DollarSign},
            {k:'post',     l:'Post Project',icon:Plus},
          ].map(t=>(
            <button key={t.k} onClick={()=>setActiveTab(t.k)} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
              background: activeTab===t.k ? 'var(--accent-blue)' : 'transparent',
              color: activeTab===t.k ? 'white' : 'var(--text-secondary)',
              fontSize:12, fontWeight:500, transition:'var(--transition)',
            }}>
              <t.icon size={13}/> {t.l}
            </button>
          ))}
        </div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12, fontWeight:500 }}>{company.contactPerson || company.name}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>{company.email}</div>
          </div>
          <button onClick={onLogout} className="btn btn-secondary" style={{ fontSize:12, padding:'5px 12px' }}>
            <LogOut size={13}/> Sign Out
          </button>
        </div>
      </header>

      <div style={{ flex:1, overflow:'auto', padding:28 }}>
        {/* Stats row */}
        <div className="grid-4" style={{ marginBottom:24 }}>
          {[
            {l:'Projects Posted', v:projects.length,                                                        c:'var(--accent-blue)',    icon:ClipboardList},
            {l:'In Progress',     v:projects.filter(p=>['assigned','in_progress'].includes(p.status)).length, c:'var(--accent-amber)',   icon:Clock},
            {l:'Completed',       v:projects.filter(p=>p.status==='completed').length,                      c:'var(--accent-emerald)', icon:CheckCircle},
            {l:'Total Paid',      v:`₹${(totalPaid/1000).toFixed(0)}K`,                                     c:'var(--accent-violet)',  icon:DollarSign},
          ].map(s=>(
            <div key={s.l} className="card" style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${s.c}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <s.icon size={18} style={{ color:s.c }}/>
              </div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, color:s.c, lineHeight:1 }}>{loading?'...':s.v}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.5px', marginTop:2 }}>{s.l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Projects tab */}
        {activeTab==='projects' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18 }}>My Projects</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={load} className="btn btn-secondary" style={{ fontSize:12 }}><RefreshCw size={13}/></button>
                <button onClick={()=>setActiveTab('post')} className="btn btn-primary" style={{ fontSize:12 }}><Plus size={13}/> Post New</button>
              </div>
            </div>
            {loading ? (
              [1,2,3].map(i=><div key={i} className="skeleton" style={{ height:110, marginBottom:10 }}/>)
            ) : projects.length===0 ? (
              <div style={{ textAlign:'center', padding:56, color:'var(--text-muted)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
                <FileText size={40} style={{ marginBottom:12, opacity:0.2 }}/>
                <p style={{ fontSize:15, marginBottom:8 }}>No projects posted yet</p>
                <button onClick={()=>setActiveTab('post')} style={{ background:'none', border:'none', color:'var(--accent-blue)', cursor:'pointer', fontSize:13 }}>Post your first project →</button>
              </div>
            ) : projects.map(project => {
              const meta = STATUS_META[project.status]||STATUS_META.open;
              const projPayments = myPayments.filter(p=>p.projectId===project.id&&p.status==='paid');
              const paid = projPayments.reduce((s,p)=>s+(p.amount||0),0);
              const payPct = project.budget>0 ? Math.round((paid/project.budget)*100) : 0;

              return (
                <div key={project.id} className="card" style={{ marginBottom:10, padding:'18px 22px', borderLeft:`4px solid ${meta.color}` }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                        <span className={`badge badge-${meta.badge}`}>{meta.label}</span>
                        <span className="badge badge-gray" style={{ fontSize:10 }}>{project.category}</span>
                        {project.assignedSpokeName && <span style={{ fontSize:11, color:'var(--accent-violet)' }}>🏫 {project.assignedSpokeName}</span>}
                        {project.deadline && <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>📅 {new Date(project.deadline).toLocaleDateString()}</span>}
                      </div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, marginBottom:4 }}>{project.title}</div>
                      <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.description}</div>

                      <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--accent-emerald)' }}>₹{(project.budget||0).toLocaleString('en-IN')}</span>
                        {paid>0 && (
                          <>
                            <div style={{ width:100, height:5, background:'var(--bg-secondary)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ width:`${payPct}%`, height:'100%', background:'var(--accent-emerald)', borderRadius:3 }}/>
                            </div>
                            <span style={{ fontSize:11, color:'var(--accent-emerald)', fontFamily:'var(--font-mono)' }}>₹{paid.toLocaleString()} paid ({payPct}%)</span>
                          </>
                        )}
                        {project.jiraEpicKey && (
                          <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', background:'var(--bg-secondary)', padding:'2px 8px', borderRadius:4 }}>
                            Jira: {project.jiraEpicKey}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Milestone progress */}
                    {project.milestones?.length>0 && (
                      <div style={{ minWidth:160, flexShrink:0 }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:6 }}>MILESTONES</div>
                        {project.milestones.map(m=>{
                          const isPaid = myPayments.some(p=>p.projectId===project.id&&p.milestoneId===m.id&&p.status==='paid');
                          return (
                            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                              <div style={{ width:14, height:14, borderRadius:'50%', background:isPaid?'var(--accent-emerald)':'var(--bg-secondary)', border:`2px solid ${isPaid?'var(--accent-emerald)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                {isPaid && <span style={{ fontSize:8, color:'white' }}>✓</span>}
                              </div>
                              <span style={{ fontSize:10, color:isPaid?'var(--accent-emerald)':'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{m.name}</span>
                              <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:isPaid?'var(--accent-emerald)':'var(--text-muted)' }}>₹{(m.amount||0).toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Payments tab */}
        {activeTab==='payments' && (
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, marginBottom:16 }}>Payment History</div>
            {myPayments.length===0 ? (
              <div style={{ textAlign:'center', padding:56, color:'var(--text-muted)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
                <DollarSign size={40} style={{ marginBottom:12, opacity:0.2 }}/>
                <p>No payments yet</p>
              </div>
            ) : (
              <div className="card" style={{ padding:0 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 130px 100px', padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-secondary)' }}>
                  {['MILESTONE','AMOUNT','STATUS','DATE','PAYMENT ID'].map(h=>(
                    <span key={h} style={{ fontSize:10, letterSpacing:'1px', color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontWeight:600 }}>{h}</span>
                  ))}
                </div>
                {myPayments.map(p=>(
                  <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 130px 100px', padding:'12px 16px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                    <span style={{ fontSize:13 }}>{p.milestoneName||'Payment'}</span>
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--accent-emerald)' }}>₹{(p.amount||0).toLocaleString()}</span>
                    <span className={`badge badge-${p.status==='paid'?'green':'amber'}`} style={{ fontSize:10 }}>{p.status==='paid'?'✓ Paid':'Pending'}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{p.paidAt?new Date(p.paidAt).toLocaleDateString():'—'}</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.razorpayPaymentId?.substring(0,12)||'—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post Project tab */}
        {activeTab==='post' && (
          <div style={{ maxWidth:640 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, marginBottom:20 }}>Post New Project</div>
            <div className="card" style={{ padding:28 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ ...F, gridColumn:'span 2' }}><label style={L}>PROJECT TITLE *</label><input value={form.title} onChange={e=>setF('title',e.target.value)} placeholder="e.g. ApniCart E-Commerce Platform"/></div>
                <div style={F}><label style={L}>CATEGORY</label><select value={form.category} onChange={e=>setF('category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div style={F}><label style={L}>TOTAL BUDGET (₹) *</label><input type="number" value={form.budget} onChange={e=>setF('budget',e.target.value)} placeholder="100000"/></div>
                <div style={{ ...F, gridColumn:'span 2' }}><label style={L}>DESCRIPTION</label><textarea value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="What you want built..." style={{ minHeight:80 }}/></div>
                <div style={{ ...F, gridColumn:'span 2' }}><label style={L}>REQUIREMENTS & DELIVERABLES</label><textarea value={form.requirements} onChange={e=>setF('requirements',e.target.value)} placeholder="Tech stack, deliverables, acceptance criteria..." style={{ minHeight:70 }}/></div>
                <div style={F}><label style={L}>DEADLINE</label><input type="date" value={form.deadline} onChange={e=>setF('deadline',e.target.value)}/></div>
                <div style={F}><label style={L}>SKILLS NEEDED</label><input value={form.skills} onChange={e=>setF('skills',e.target.value)} placeholder="React, Node.js, AWS..."/></div>
              </div>

              <div style={{ marginTop:8, marginBottom:20 }}>
                <div className="section-title" style={{ marginBottom:10 }}>PAYMENT MILESTONES</div>
                <div style={{ padding:'12px 14px', background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, fontSize:12, color:'var(--text-secondary)', marginBottom:10 }}>
                  Payments are released by APNILEAP when each milestone is approved. Set the percentage split below.
                </div>
                {form.milestones.map((m,i)=>(
                  <div key={m.id} style={{ display:'grid', gridTemplateColumns:'1fr 70px 90px', gap:8, marginBottom:8, alignItems:'center' }}>
                    <input value={m.name} onChange={e=>setForm(f=>({...f,milestones:f.milestones.map((ms,idx)=>idx===i?{...ms,name:e.target.value}:ms)}))} style={{ fontSize:12 }}/>
                    <div style={{ position:'relative' }}>
                      <input type="number" min="0" max="100" value={m.percent} onChange={e=>setForm(f=>({...f,milestones:f.milestones.map((ms,idx)=>idx===i?{...ms,percent:Number(e.target.value),amount:Math.round((Number(form.budget)||0)*Number(e.target.value)/100)}:ms)}))} style={{ paddingRight:22, fontSize:12 }}/>
                      <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'var(--text-muted)' }}>%</span>
                    </div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'var(--accent-emerald)', textAlign:'right' }}>₹{(m.amount||0).toLocaleString()}</div>
                  </div>
                ))}
                <div style={{ fontSize:11, color: form.milestones.reduce((s,m)=>s+m.percent,0)===100?'var(--accent-emerald)':'var(--accent-rose)', fontFamily:'var(--font-mono)', marginTop:6 }}>
                  Total: {form.milestones.reduce((s,m)=>s+m.percent,0)}% {form.milestones.reduce((s,m)=>s+m.percent,0)===100?'✓':'(must equal 100%)'}
                </div>
              </div>

              <button onClick={handlePost} className="btn btn-primary" disabled={creating} style={{ width:'100%', justifyContent:'center', padding:12, fontSize:14, fontWeight:600 }}>
                {creating?'Posting...':'📋 Post Project to APNILEAP'}
              </button>
              <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', marginTop:10 }}>
                APNILEAP will review and assign this project to the most suitable college spoke.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
