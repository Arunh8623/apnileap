import React, { useState } from 'react';
import { Shield, Building2, Mail, Lock, User, Globe, Briefcase, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { companyRegister, companyLogin } from '../services/api';
import toast from 'react-hot-toast';

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Consulting', 'Research', 'Other'];

export default function CompanyAuth({ onSuccess, onBack }) {
  const [mode, setMode] = useState('login'); // login | register
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', name: '', companyName: '',
    industry: 'Technology', website: '', contactPerson: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.email || !form.password) { toast.error('Email and password required'); return; }
    if (mode === 'register' && !form.companyName) { toast.error('Company name required'); return; }
    setLoading(true);
    try {
      const fn = mode === 'login' ? companyLogin : companyRegister;
      const r = await fn(form);
      localStorage.setItem('companyToken', r.token);
      localStorage.setItem('companyData', JSON.stringify(r.company));
      toast.success(mode === 'login' ? `Welcome back, ${r.company.companyName}!` : `${r.company.companyName} registered!`);
      onSuccess(r.company);
    } catch (e) {
      toast.error(typeof e === 'string' ? e : (mode === 'login' ? 'Invalid credentials' : 'Registration failed'));
    } finally { setLoading(false); }
  };

  const L = { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' };
  const F = { marginBottom: 14 };
  const Inp = ({ icon: Icon, ...props }) => (
    <div style={{ position: 'relative' }}>
      {Icon && <Icon size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />}
      <input {...props} style={{ paddingLeft: Icon ? 34 : 12, width: '100%', ...(props.style||{}) }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 0 32px rgba(59,130,246,0.3)' }}>
            <Shield size={24} color="white" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-1px' }}>APNILEAP</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>INDUSTRY PARTNER PORTAL</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--accent-blue)' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, transition: 'var(--transition)',
              }}>{m === 'login' ? 'Sign In' : 'Register Company'}</button>
            ))}
          </div>

          {mode === 'login' ? (
            <>
              <div style={F}><label style={L}>EMAIL</label><Inp icon={Mail} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@company.com" /></div>
              <div style={F}>
                <label style={L}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type={showPwd?'text':'password'} value={form.password} onChange={e=>set('password',e.target.value)} placeholder="••••••••" style={{ paddingLeft: 34, paddingRight: 36, width: '100%' }} onKeyDown={e=>e.key==='Enter'&&submit()} />
                  <button onClick={()=>setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={F}><label style={L}>FULL NAME</label><Inp icon={User} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Your name" /></div>
                <div style={F}><label style={L}>COMPANY NAME *</label><Inp icon={Building2} value={form.companyName} onChange={e=>set('companyName',e.target.value)} placeholder="Infosys Ltd" /></div>
              </div>
              <div style={F}><label style={L}>EMAIL *</label><Inp icon={Mail} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@company.com" /></div>
              <div style={F}>
                <label style={L}>PASSWORD *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type={showPwd?'text':'password'} value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min 8 characters" style={{ paddingLeft: 34, paddingRight: 36, width: '100%' }} />
                  <button onClick={()=>setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={F}><label style={L}>INDUSTRY</label><select value={form.industry} onChange={e=>set('industry',e.target.value)}>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
                <div style={F}><label style={L}>WEBSITE</label><Inp icon={Globe} value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://company.com" /></div>
              </div>
            </>
          )}

          <button onClick={submit} className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, fontWeight: 600, marginTop: 4 }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In to Portal' : 'Create Company Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'New company?' : 'Already registered?'}{' '}
            <button onClick={() => setMode(mode==='login'?'register':'login')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 12 }}>
              {mode === 'login' ? 'Register here' : 'Sign in'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, margin: '0 auto' }}>
            <ArrowLeft size={13} /> Back to APNILEAP Hub
          </button>
        </div>
      </div>
    </div>
  );
}
