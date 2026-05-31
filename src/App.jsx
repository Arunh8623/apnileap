import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { healthCheck } from './services/api';
import './styles/global.css';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('checking');

  useEffect(() => {
    healthCheck()
      .then(() => setConnectionStatus('connected'))
      .catch(() => setConnectionStatus('error'));
  }, []);

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar connectionStatus={connectionStatus} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hub" element={<HubSpoke />} />
            <Route path="/workassign" element={<WorkAssignment />} />
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
          error: { iconTheme: { primary: 'var(--accent-rose)', secondary: 'white' } },
        }}
      />
    </BrowserRouter>
  );
}
