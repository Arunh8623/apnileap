import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, Plus, Building2, ArrowRight, CheckCircle,
  Clock, RefreshCw, Eye, Trash2, DollarSign,
  Search, X, ExternalLink, Layers
} from 'lucide-react';
import Header from '../components/Header';
import IssueDetail from '../components/IssueDetail';
import {
  getMarketplaceProjects, postMarketplaceProject,
  assignMarketplaceProject, updateProjectStatus,
  deleteMarketplaceProject, getProjects, getCompanies,
  getPayments, createPaymentOrder, verifyPayment
} from '../services/api';
import toast from 'react-hot-toast';

const STATUS_META = {
  open:        { color: 'var(--accent-blue)',    badge: 'blue',    label: 'Open' },
  assigned:    { color: 'var(--accent-amber)',   badge: 'amber',   label: 'Assigned' },
  in_progress: { color: 'var(--accent-violet)',  badge: 'violet',  label: 'In Progress' },
  submitted:   { color: 'var(--accent-cyan)',    badge: 'cyan',    label: 'Submitted' },
  approved:    { color: 'var(--accent-emerald)', badge: 'green',   label: 'Approved' },
  completed:   { color: 'var(--accent-emerald)', badge: 'green',   label: 'Completed ✓' },
};

const CATEGORIES = ['Software Development', 'Research', 'Data Science', 'UI/UX Design', 'Infrastructure', 'Consulting', 'Audit & Compliance', 'Other'];

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ project, milestone, onClose, onPaid }) {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);

  const initPayment = async () => {
    setLoading(true);
    try {
      const o = await createPaymentOrder({
        projectId: project.id,
        milestoneId: milestone?.id || 'full',
        milestoneName: milestone?.name || `Full payment for ${project.title}`,
        amount: milestone?.amount || project.budget,
        currency: project.currency || 'INR',
      });
      setOrder(o);

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => openRazorpay(o);
      document.body.appendChild(script);
    } catch (e) {
      toast.error('Payment init failed: ' + e);
      setLoading(false);
    }
  };

  const openRazorpay = (o) => {
    const options = {
      key: o.keyId,
      amount: o.amount,
      currency: o.currency,
      name: 'APNILEAP Governance OS',
      description: `Milestone: ${milestone?.name || project.title}`,
      order_id: o.orderId,
      theme: { color: '#3b82f6' },
      handler: async (response) => {
        try {
          await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            projectId: project.id,
            milestoneId: milestone?.id || 'full',
          });
          toast.success(`Payment of ₹${milestone?.amount || project.budget} released!`);
          onPaid?.();
          onClose();
        } catch (e) { toast.error('Payment verification failed: ' + e); }
      },
      modal: { ondismiss: () => { setLoading(false); onClose(); } },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440, padding: 32, animation: 'fadeIn 0.2s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <DollarSign size={24} color="white" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Release Milestone Payment</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{project.title}</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Milestone</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{milestone?.name || 'Full Project Payment'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Amount</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--accent-emerald)' }}>
              ₹{(milestone?.amount || project.budget || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Recipient</span>
            <span style={{ fontSize: 13, color: 'var(--accent-violet)', fontWeight: 500 }}>{project.assignedSpokeName || project.assignedSpoke || '—'}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
          💡 Using Razorpay <strong>test mode</strong>. Use card <strong>4111 1111 1111 1111</strong>, any future date, any CVV.
        </div>

        <button onClick={initPayment} className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14, fontWeight: 600 }}>
          {loading ? 'Opening Payment...' : `Pay ₹${(milestone?.amount || project.budget || 0).toLocaleString('en-IN')}`}
        </button>
        <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main Marketplace Page ─────────────────────────────────────────────────────
export default function Marketplace() {
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [spokes, setSpokes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | open | assigned | approved | completed
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewJiraKey, setViewJiraKey] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null); // { project, milestone }
  const [assignModal, setAssignModal] = useState(null);
  const [assignSpoke, setAssignSpoke] = useState('');

  // Create form
  const [form, setForm] = useState({
    title: '', description: '', requirements: '',
    budget: '', currency: 'INR', deadline: '',
    category: 'Software Development', skills: '',
    companyName: '', milestones: [
      { id: '1', name: 'M1 - Foundation', percent: 20, amount: 0 },
      { id: '2', name: 'M2 - Core Features', percent: 30, amount: 0 },
      { id: '3', name: 'M3 - Testing & Delivery', percent: 50, amount: 0 },
    ],
  });
  const [creating, setCreating] = useState(false);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, sp, pay] = await Promise.allSettled([
        getMarketplaceProjects(), getCompanies(), getProjects(), getPayments(),
      ]);
      if (p.status === 'fulfilled') setProjects(p.value || []);
      if (c.status === 'fulfilled') setCompanies(c.value || []);
      if (sp.status === 'fulfilled') setSpokes(sp.value || []);
      if (pay.status === 'fulfilled') setPayments(pay.value || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Update milestone amounts when budget changes
  useEffect(() => {
    const budget = Number(form.budget) || 0;
    setForm(f => ({
      ...f,
      milestones: f.milestones.map(m => ({ ...m, amount: Math.round(budget * m.percent / 100) })),
    }));
  }, [form.budget]);

  const handleCreate = async () => {
    if (!form.title || !form.budget) { toast.error('Title and budget required'); return; }
    setCreating(true);
    try {
      await postMarketplaceProject({
        ...form,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        budget: Number(form.budget),
        companyName: form.companyName || 'APNILEAP Hub',
        postedBy: 'hub',
      });
      toast.success('Project posted to marketplace!');
      setShowCreate(false);
      setForm({ title: '', description: '', requirements: '', budget: '', currency: 'INR', deadline: '', category: 'Software Development', skills: '', companyName: '', milestones: [{ id:'1',name:'M1 - Foundation',percent:20,amount:0},{id:'2',name:'M2 - Core Features',percent:30,amount:0},{id:'3',name:'M3 - Testing & Delivery',percent:50,amount:0}] });
      load();
    } catch (e) { toast.error('Failed: ' + e); }
    finally { setCreating(false); }
  };

  const handleAssign = async () => {
    if (!assignSpoke) { toast.error('Select a spoke'); return; }
    const spoke = spokes.find(s => s.key === assignSpoke);
    try {
      await assignMarketplaceProject(assignModal.id, { spokeKey: assignSpoke, spokeName: spoke?.name || assignSpoke });
      toast.success(`Assigned to ${spoke?.name || assignSpoke}`);
      setAssignModal(null);
      setAssignSpoke('');
      load();
    } catch (e) { toast.error('Failed: ' + e); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try { await deleteMarketplaceProject(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error('Failed: ' + e); }
  };

  const filtered = projects.filter(p => {
    const matchTab = tab === 'all' || p.status === tab;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.companyName||'').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalBudget = projects.reduce((s,p) => s + (p.budget||0), 0);
  const totalPaid   = payments.filter(p=>p.status==='paid').reduce((s,p)=>s+(p.amount||0),0);

  const TABS = [
    { k:'all',        l:'All',          count: projects.length },
    { k:'open',       l:'Open',         count: projects.filter(p=>p.status==='open').length },
    { k:'assigned',   l:'Assigned',     count: projects.filter(p=>p.status==='assigned').length },
    { k:'in_progress',l:'In Progress',  count: projects.filter(p=>p.status==='in_progress').length },
    { k:'submitted',  l:'Submitted',    count: projects.filter(p=>p.status==='submitted').length },
    { k:'approved',   l:'Approved',     count: projects.filter(p=>p.status==='approved').length },
    { k:'completed',  l:'Completed',    count: projects.filter(p=>p.status==='completed').length },
  ];

  const L = { display:'block', fontSize:10, color:'var(--text-muted)', marginBottom:4, fontFamily:'var(--font-mono)' };
  const F = { marginBottom:12 };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Header title="Project Marketplace" subtitle="Industry projects assigned to academic spokes" onRefresh={load} loading={loading} />

      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {/* Stats */}
        <div style={{ padding:'16px 24px 0', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, flexShrink:0 }}>
          {[
            { l:'TOTAL PROJECTS', v:projects.length,   c:'var(--accent-blue)' },
            { l:'OPEN',           v:projects.filter(p=>p.status==='open').length, c:'var(--accent-cyan)' },
            { l:'IN PROGRESS',   v:projects.filter(p=>['assigned','in_progress'].includes(p.status)).length, c:'var(--accent-amber)' },
            { l:'TOTAL BUDGET',  v:`₹${(totalBudget/1000).toFixed(0)}K`, c:'var(--accent-violet)' },
            { l:'PAID OUT',      v:`₹${(totalPaid/1000).toFixed(0)}K`, c:'var(--accent-emerald)' },
          ].map(s=>(
            <div key={s.l} className="card" style={{ padding:'12px 16px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, color:s.c, lineHeight:1 }}>{loading?'...':s.v}</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'1px', marginTop:4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs + controls */}
        <div style={{ padding:'12px 24px 0', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
          <div style={{ display:'flex', background:'var(--bg-secondary)', borderRadius:8, border:'1px solid var(--border)', overflow:'hidden' }}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)} style={{
                padding:'6px 12px', background:tab===t.k?'var(--accent-blue)':'transparent',
                border:'none', cursor:'pointer', fontSize:11, fontWeight:500,
                color:tab===t.k?'white':'var(--text-secondary)', transition:'var(--transition)',
                display:'flex', alignItems:'center', gap:4,
              }}>
                {t.l} {t.count>0&&<span style={{ background:tab===t.k?'rgba(255,255,255,0.25)':'var(--border)', borderRadius:10, padding:'0px 5px', fontSize:10 }}>{t.count}</span>}
              </button>
            ))}
          </div>
          <div style={{ position:'relative' }}>
            <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects..." style={{ paddingLeft:28, height:33, fontSize:12, width:200 }} />
          </div>
          <button onClick={()=>setShowCreate(true)} className="btn btn-primary" style={{ marginLeft:'auto' }}>
            <Plus size={14}/> Post Project
          </button>
        </div>

        {/* Projects list */}
        <div style={{ flex:1, overflow:'auto', padding:24 }}>
          {loading ? (
            [1,2,3].map(i=><div key={i} className="skeleton" style={{ height:130, marginBottom:10 }}/>)
          ) : filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:56, color:'var(--text-muted)' }}>
              <Store size={40} style={{ marginBottom:12, opacity:0.2 }}/>
              <p style={{ fontSize:15 }}>No projects found</p>
              <button onClick={()=>setShowCreate(true)} style={{ background:'none', border:'none', color:'var(--accent-blue)', cursor:'pointer', marginTop:8 }}>+ Post first project →</button>
            </div>
          ) : filtered.map(project => {
            const meta = STATUS_META[project.status] || STATUS_META.open;
            const projectPayments = payments.filter(p=>p.projectId===project.id && p.status==='paid');
            const paidAmount = projectPayments.reduce((s,p)=>s+(p.amount||0),0);
            const payPercent = project.budget>0 ? Math.round((paidAmount/project.budget)*100) : 0;

            return (
              <div key={project.id} className="card" style={{ marginBottom:10, padding:'18px 22px', borderLeft:`4px solid ${meta.color}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                      <span className={`badge badge-${meta.badge}`}>{meta.label}</span>
                      <span className="badge badge-gray" style={{ fontSize:10 }}>{project.category}</span>
                      {project.postedBy==='company'
                        ? <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--accent-violet)' }}><Building2 size={11}/> {project.companyName}</span>
                        : <span style={{ fontSize:11, color:'var(--text-muted)' }}>Posted by Hub</span>}
                      {project.deadline && <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>📅 {new Date(project.deadline).toLocaleDateString()}</span>}
                    </div>

                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.title}</div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.description}</div>

                    <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--accent-emerald)' }}>
                        ₹{(project.budget||0).toLocaleString('en-IN')}
                      </div>
                      {project.assignedSpoke && (
                        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--accent-violet)' }}>
                          <Layers size={11}/> {project.assignedSpokeName || project.assignedSpoke}
                        </div>
                      )}
                      {project.jiraEpicKey && (
                        <button onClick={()=>setViewJiraKey(project.jiraEpicKey)} style={{ background:'none', border:'none', color:'var(--accent-blue)', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                          <ExternalLink size={11}/> {project.jiraEpicKey}
                        </button>
                      )}
                      {/* Payment progress */}
                      {paidAmount > 0 && (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:80, height:4, background:'var(--bg-secondary)', borderRadius:2, overflow:'hidden' }}>
                            <div style={{ width:`${payPercent}%`, height:'100%', background:'var(--accent-emerald)', borderRadius:2 }}/>
                          </div>
                          <span style={{ fontSize:10, color:'var(--accent-emerald)', fontFamily:'var(--font-mono)' }}>{payPercent}% paid</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0, minWidth:120 }}>
                    {/* Assign to spoke */}
                    {['open','assigned'].includes(project.status) && (
                      <button onClick={()=>{ setAssignModal(project); setAssignSpoke(project.assignedSpoke||''); }} className="btn btn-secondary" style={{ fontSize:11, padding:'5px 12px', justifyContent:'center' }}>
                        <ArrowRight size:12/> {project.assignedSpoke ? 'Reassign' : 'Assign Spoke'}
                      </button>
                    )}
                    {/* Milestone payments */}
                    {['assigned','in_progress','submitted','approved'].includes(project.status) && project.milestones?.length>0 && (
                      <div>
                        {project.milestones.map(m => {
                          const mPaid = projectPayments.some(p => p.milestoneId===m.id);
                          return (
                            <button key={m.id} onClick={()=>!mPaid&&setPaymentModal({project,milestone:m})}
                              className={`btn ${mPaid?'btn-secondary':'btn-primary'}`}
                              style={{ fontSize:10, padding:'4px 10px', width:'100%', justifyContent:'center', marginBottom:3, opacity:mPaid?0.6:1 }}
                              disabled={mPaid}>
                              <DollarSign size={10}/> {mPaid?'✓ Paid':'Pay'} {m.name.split(' - ')[0]} ₹{(m.amount||0).toLocaleString()}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Status update */}
                    {project.status==='assigned' && (
                      <button onClick={()=>{updateProjectStatus(project.id,'in_progress').then(()=>{toast.success('Marked In Progress');load()}).catch(e=>toast.error(e))}} className="btn btn-secondary" style={{ fontSize:10, padding:'4px 10px', justifyContent:'center' }}>
                        Mark In Progress
                      </button>
                    )}
                    {project.status==='in_progress' && (
                      <button onClick={()=>{updateProjectStatus(project.id,'submitted').then(()=>{toast.success('Submitted for review');load()}).catch(e=>toast.error(e))}} className="btn btn-primary" style={{ fontSize:10, padding:'4px 10px', justifyContent:'center' }}>
                        Submit for Review
                      </button>
                    )}
                    {project.status==='submitted' && (
                      <button onClick={()=>{updateProjectStatus(project.id,'approved').then(()=>{toast.success('Project approved!');load()}).catch(e=>toast.error(e))}} className="btn btn-secondary" style={{ fontSize:10, padding:'4px 10px', color:'var(--accent-emerald)', borderColor:'rgba(16,185,129,0.3)', justifyContent:'center' }}>
                        <CheckCircle size={11}/> Approve
                      </button>
                    )}
                    {project.status==='approved' && (
                      <button onClick={()=>{updateProjectStatus(project.id,'completed').then(()=>{toast.success('Project completed!');load()}).catch(e=>toast.error(e))}} className="btn btn-secondary" style={{ fontSize:10, padding:'4px 10px', justifyContent:'center' }}>
                        Mark Complete
                      </button>
                    )}
                    <button onClick={()=>handleDelete(project.id, project.title)} style={{ background:'transparent', border:'none', color:'var(--accent-rose)', cursor:'pointer', padding:'4px', textAlign:'center', fontSize:11, opacity:0.6 }}
                      onMouseEnter={e=>e.target.style.opacity='1'} onMouseLeave={e=>e.target.style.opacity='0.6'}>
                      <Trash2 size:12/> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}
          onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:600, animation:'fadeIn 0.2s ease', margin:'auto' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16 }}>📋 Post Project to Marketplace</h2>
              <button onClick={()=>setShowCreate(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:22 }}>×</button>
            </div>
            <div style={{ padding:24, maxHeight:'70vh', overflow:'auto' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ ...F, gridColumn:'span 2' }}><label style={L}>PROJECT TITLE *</label><input value={form.title} onChange={e=>setF('title',e.target.value)} placeholder="e.g. ApniCart E-Commerce Platform" /></div>
                <div style={F}><label style={L}>COMPANY / POSTED BY</label><input value={form.companyName} onChange={e=>setF('companyName',e.target.value)} placeholder="Infosys / Hub" /></div>
                <div style={F}><label style={L}>CATEGORY</label><select value={form.category} onChange={e=>setF('category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div style={{ ...F, gridColumn:'span 2' }}><label style={L}>DESCRIPTION</label><textarea value={form.description} onChange={e=>setF('description',e.target.value)} placeholder="Project overview..." style={{ minHeight:70 }}/></div>
                <div style={{ ...F, gridColumn:'span 2' }}><label style={L}>REQUIREMENTS</label><textarea value={form.requirements} onChange={e=>setF('requirements',e.target.value)} placeholder="Tech stack, deliverables..." style={{ minHeight:60 }}/></div>
                <div style={F}><label style={L}>TOTAL BUDGET (₹) *</label><input type="number" value={form.budget} onChange={e=>setF('budget',e.target.value)} placeholder="100000" /></div>
                <div style={F}><label style={L}>DEADLINE</label><input type="date" value={form.deadline} onChange={e=>setF('deadline',e.target.value)} /></div>
                <div style={{ ...F, gridColumn:'span 2' }}><label style={L}>SKILLS (comma separated)</label><input value={form.skills} onChange={e=>setF('skills',e.target.value)} placeholder="React, Node.js, PostgreSQL..." /></div>
              </div>

              {/* Milestones */}
              <div style={{ marginTop:4 }}>
                <div className="section-title" style={{ marginBottom:10 }}>PAYMENT MILESTONES</div>
                {form.milestones.map((m,i)=>(
                  <div key={m.id} style={{ display:'grid', gridTemplateColumns:'1fr 60px 80px', gap:8, marginBottom:8, alignItems:'center' }}>
                    <input value={m.name} onChange={e=>setForm(f=>({...f,milestones:f.milestones.map((ms,idx)=>idx===i?{...ms,name:e.target.value}:ms)}))} style={{ fontSize:12 }}/>
                    <div style={{ position:'relative' }}>
                      <input type="number" value={m.percent} onChange={e=>setForm(f=>({...f,milestones:f.milestones.map((ms,idx)=>idx===i?{...ms,percent:Number(e.target.value),amount:Math.round((Number(form.budget)||0)*Number(e.target.value)/100)}:ms)}))} style={{ paddingRight:20, fontSize:12 }}/>
                      <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'var(--text-muted)' }}>%</span>
                    </div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--accent-emerald)', textAlign:'right' }}>₹{(m.amount||0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowCreate(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn btn-primary" disabled={creating}>
                {creating?'Posting...':'Post to Marketplace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e=>e.target===e.currentTarget&&setAssignModal(null)}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:400, padding:28, animation:'fadeIn 0.2s ease' }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, marginBottom:6 }}>Assign to College Spoke</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>{assignModal.title}</div>
            <label style={L}>SELECT COLLEGE (SPOKE)</label>
            <select value={assignSpoke} onChange={e=>setAssignSpoke(e.target.value)} style={{ marginBottom:20 }}>
              <option value="">Select spoke...</option>
              {spokes.map(s=><option key={s.id} value={s.key}>{s.name} ({s.key})</option>)}
            </select>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setAssignModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAssign} className="btn btn-primary" disabled={!assignSpoke}>
                <ArrowRight size={13}/> Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModal && <PaymentModal project={paymentModal.project} milestone={paymentModal.milestone} onClose={()=>setPaymentModal(null)} onPaid={load} />}
      {viewJiraKey && <IssueDetail issueKey={viewJiraKey} onClose={()=>setViewJiraKey(null)} onUpdated={load} />}
    </div>
  );
}
