import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, AlertTriangle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import Header from '../components/Header';
import { healthCheck } from '../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState({
    jiraUrl: localStorage.getItem('jiraUrl') || '',
    email: localStorage.getItem('jiraEmail') || '',
    token: localStorage.getItem('jiraToken') || '',
    hubKey: localStorage.getItem('hubKey') || 'APNIHUB',
    spokeKeys: localStorage.getItem('spokeKeys') || '',
  });

  const testConnection = async () => {
    setLoading(true);
    try {
      const r = await healthCheck();
      setStatus({ ok: true, user: r.user, email: r.email });
      toast.success(`Connected as ${r.user}`);
    } catch (e) {
      setStatus({ ok: false, error: typeof e === 'string' ? e : 'Connection failed' });
      toast.error('Connection failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { testConnection(); }, []);

  const save = () => {
    localStorage.setItem('jiraUrl', config.jiraUrl);
    localStorage.setItem('jiraEmail', config.email);
    localStorage.setItem('jiraToken', config.token);
    localStorage.setItem('hubKey', config.hubKey);
    localStorage.setItem('spokeKeys', config.spokeKeys);
    toast.success('Settings saved — restart backend to apply');
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  const steps = [
    { num: 1, title: 'Create Atlassian Account', desc: 'Go to atlassian.com and sign up for a free account', link: 'https://www.atlassian.com/software/jira/free' },
    { num: 2, title: 'Create a Jira Site', desc: 'After signup, create a new Jira Software project site (e.g., yourcompany.atlassian.net)', link: null },
    { num: 3, title: 'Generate API Token', desc: 'Go to id.atlassian.com → Security → Create API Token. Copy it immediately.', link: 'https://id.atlassian.com/manage-profile/security/api-tokens' },
    { num: 4, title: 'Create Hub Project', desc: 'In Jira, create a Scrum project with key APNIHUB — this is your central governance hub', link: null },
    { num: 5, title: 'Configure .env File', desc: 'Fill in server/.env with your domain, email, and API token', link: null },
    { num: 6, title: 'Start Backend Server', desc: 'Run: cd server && npm install && node server.js', link: null },
  ];

  const envContent = `JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token_here
JIRA_HUB_PROJECT_KEY=APNIHUB
JIRA_SPOKE_KEYS=COA,COE,COM
# FREE Gemini AI — get key at aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_key_here
PORT=3001`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="Settings & Setup" subtitle="Jira connection & configuration" onRefresh={testConnection} loading={loading} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        {/* Connection Status */}
        <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          background: status?.ok ? 'rgba(16,185,129,0.05)' : status?.ok === false ? 'rgba(244,63,94,0.05)' : 'var(--bg-card)',
          border: status?.ok ? '1px solid rgba(16,185,129,0.3)' : status?.ok === false ? '1px solid rgba(244,63,94,0.3)' : '1px solid var(--border)',
        }}>
          {status?.ok ? <CheckCircle size={20} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} /> :
           status?.ok === false ? <XCircle size={20} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} /> :
           <AlertTriangle size={20} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {status?.ok ? `Connected to Jira — ${status.user}` : status?.ok === false ? 'Not Connected' : 'Checking connection...'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {status?.ok ? status.email : status?.error || 'Configure your .env file and start the backend server'}
            </div>
          </div>
          <button onClick={testConnection} className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: 12 }} disabled={loading}>
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Setup Steps */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>🚀 Jira Setup Guide (Step by Step)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {steps.map(step => (
                <div key={step.num} style={{ display: 'flex', gap: 12 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'white', fontFamily: 'var(--font-mono)',
                  }}>{step.num}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.desc}</div>
                    {step.link && (
                      <a href={step.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        Open Link <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Env config */}
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="section-title">server/.env Template</div>
                <button onClick={() => copy(envContent)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>
                  <Copy size={11} /> Copy
                </button>
              </div>
              <pre style={{
                background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8,
                padding: 12, fontSize: 11, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)',
                overflowX: 'auto', lineHeight: 1.7, whiteSpace: 'pre-wrap',
              }}>{envContent}</pre>
            </div>

            <div className="card">
              <div className="section-title" style={{ marginBottom: 14 }}>Quick Start Commands</div>
              {[
                { label: 'Install backend deps', cmd: 'cd server && npm install' },
                { label: 'Start backend', cmd: 'cd server && node server.js' },
                { label: 'Install frontend deps', cmd: 'npm install' },
                { label: 'Start frontend', cmd: 'npm start' },
              ].map(c => (
                <div key={c.cmd} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{c.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>{c.cmd}</code>
                    <button onClick={() => copy(c.cmd)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
