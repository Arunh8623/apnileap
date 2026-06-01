import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Issues from './pages/Issues';
import HubSpoke from './pages/HubSpoke';
import Sprints from './pages/Sprints';
import Analytics from './pages/Analytics';
import Automation from './pages/Automation';
import AIInsights from './pages/AIInsights';
import Users from './pages/Users';
import Knowledge from './pages/Knowledge';
import Settings from './pages/Settings';
import WorkAssignment from './pages/WorkAssignment';
import RiskRegister from './pages/RiskRegister';
import Notifications from './pages/Notifications';
import Milestones from './pages/Milestones';
import Marketplace from './pages/Marketplace';
import CompanyAuth from './pages/CompanyAuth';
import CompanyDashboard from './pages/CompanyDashboard';
import { healthCheck } from './services/api';
import './styles/global.css';

// ── Company Portal wrapper ────────────────────────────────────────────────────
function CompanyPortal() {
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem('companyData')); } catch { return null; }
  });

  const handleSuccess = (c) => setCompany(c);
  const handleLogout = () => {
    localStorage.removeItem('companyToken');
    localStorage.removeItem('companyData');
    setCompany(null);
  };

  if (!company) return <CompanyAuth onSuccess={handleSuccess} onBack={() => window.location.href = '/'} />;
  return <CompanyDashboard company={company} onLogout={handleLogout} />;
}

// ── Hub App (main APNILEAP dashboard) ────────────────────────────────────────
function HubApp() {
  const [connectionStatus, setConnectionStatus] = useState('checking');

  useEffect(() => {
    healthCheck()
      .then(() => setConnectionStatus('connected'))
      .catch(() => setConnectionStatus('error'));
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar connectionStatus={connectionStatus} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/hub" element={<HubSpoke />} />
          <Route path="/workassign" element={<WorkAssignment />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/sprints" element={<Sprints />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/risks" element={<RiskRegister />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/ai" element={<AIInsights />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/users" element={<Users />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

// ── Root: route /company to company portal, everything else to hub ────────────
export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
          },
          success: { iconTheme: { primary: 'var(--accent-emerald)', secondary: 'white' } },
          error:   { iconTheme: { primary: 'var(--accent-rose)',    secondary: 'white' } },
        }}
      />
      <Routes>
        <Route path="/company/*" element={<CompanyPortal />} />
        <Route path="/*"         element={<HubApp />} />
      </Routes>
    </BrowserRouter>
  );
}
