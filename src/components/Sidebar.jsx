import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, GitBranch, ListTodo, Zap, Brain,
  BarChart3, Users, Settings, ChevronLeft, ChevronRight,
  BookOpen, Shield, Bell, Layers, ClipboardList,
  Flag, AlertTriangle, Store, Building2
} from 'lucide-react';
import { getNotifications } from '../services/api';

const nav = [
  { group: 'OVERVIEW', items: [
    { to: '/',               icon: LayoutDashboard, label: 'Hub Dashboard' },
    { to: '/analytics',      icon: BarChart3,        label: 'Analytics' },
    { to: '/notifications',  icon: Bell,             label: 'Notifications', badge: 'notif' },
  ]},
  { group: 'GOVERNANCE', items: [
    { to: '/hub',         icon: Layers,        label: 'Hub & Spoke' },
    { to: '/workassign',  icon: ClipboardList, label: 'Work Assignment' },
    { to: '/marketplace', icon: Store,         label: 'Marketplace' },
    { to: '/issues',      icon: ListTodo,      label: 'Issues' },
    { to: '/sprints',     icon: GitBranch,     label: 'Sprints' },
    { to: '/milestones',  icon: Flag,          label: 'Milestones' },
    { to: '/risks',       icon: AlertTriangle, label: 'Risk Register' },
  ]},
  { group: 'INTELLIGENCE', items: [
    { to: '/automation', icon: Zap,   label: 'Automation' },
    { to: '/ai',         icon: Brain, label: 'AI Insights' },
  ]},
  { group: 'MANAGEMENT', items: [
    { to: '/users',     icon: Users,    label: 'Users' },
    { to: '/knowledge', icon: BookOpen, label: 'Knowledge' },
    { to: '/settings',  icon: Settings, label: 'Settings' },
  ]},
];

export default function Sidebar({ connectionStatus, onCompanyLogin }) {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getNotifications().then(n => setUnreadCount((n||[]).length)).catch(()=>{});
  }, []);

  return (
    <aside style={{
      width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240,
      background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      position: 'relative', zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed?'20px 0':'20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, justifyContent:collapsed?'center':'flex-start', minHeight:68 }}>
        <div style={{ width:32, height:32, background:'linear-gradient(135deg,var(--accent-blue),var(--accent-cyan))', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 0 20px rgba(59,130,246,0.3)' }}>
          <Shield size={16} color="white" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, letterSpacing:'-0.5px' }}>APNILEAP</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1px', fontFamily:'var(--font-mono)' }}>ENTERPRISE OS</div>
          </div>
        )}
      </div>

      {/* Connection */}
      {!collapsed && (
        <div style={{ padding:'8px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background: connectionStatus==='connected'?'var(--accent-emerald)':connectionStatus==='error'?'var(--accent-rose)':'var(--accent-amber)', boxShadow:connectionStatus==='connected'?'0 0 8px var(--accent-emerald)':'none' }} />
          <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
            {connectionStatus==='connected'?'Jira Connected':connectionStatus==='error'?'Not Connected':'Connecting...'}
          </span>
        </div>
      )}

      {/* Nav links */}
      <nav style={{ flex:1, padding:'12px 0', overflowY:'auto' }}>
        {nav.map(group => (
          <div key={group.group} style={{ marginBottom:4 }}>
            {!collapsed && (
              <div style={{ padding:'8px 20px 4px', fontSize:10, letterSpacing:'1.5px', color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontWeight:500 }}>
                {group.group}
              </div>
            )}
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to==='/'} style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding: collapsed?'10px 0':'9px 20px',
                justifyContent: collapsed?'center':'flex-start',
                color: isActive?'var(--accent-blue)':'var(--text-secondary)',
                background: isActive?'rgba(59,130,246,0.08)':'transparent',
                borderLeft: isActive&&!collapsed?'2px solid var(--accent-blue)':'2px solid transparent',
                transition:'var(--transition)', textDecoration:'none',
                fontSize:13, fontWeight: isActive?500:400, marginBottom:1, position:'relative',
              })}>
                <item.icon size={16} style={{ flexShrink:0 }} />
                {!collapsed && <span style={{ flex:1 }}>{item.label}</span>}
                {item.badge==='notif' && unreadCount>0 && (
                  <span style={{ background:'var(--accent-rose)', color:'white', borderRadius:10, fontSize:9, fontWeight:700, padding:'1px 5px', fontFamily:'var(--font-mono)', position:collapsed?'absolute':'relative', top:collapsed?6:'auto', right:collapsed?6:'auto' }}>
                    {unreadCount>9?'9+':unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Company Portal button */}
      <div style={{ padding:collapsed?'10px 4px':'10px 12px', borderTop:'1px solid var(--border)' }}>
        <button onClick={onCompanyLogin} title="Company Portal" style={{
          display:'flex', alignItems:'center', gap:8, width:'100%',
          padding: collapsed?'8px 0':'8px 10px',
          background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.25)',
          borderRadius:8, cursor:'pointer', transition:'var(--transition)',
          justifyContent:collapsed?'center':'flex-start', color:'var(--accent-violet)',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(139,92,246,0.2)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(139,92,246,0.1)'}>
          <Building2 size={15} style={{ flexShrink:0 }} />
          {!collapsed && <span style={{ fontSize:12, fontWeight:600 }}>Company Portal</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button onClick={()=>setCollapsed(!collapsed)} style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:14, border:'none', borderTop:'1px solid var(--border)',
        background:'transparent', color:'var(--text-muted)', cursor:'pointer',
        transition:'var(--transition)', width:'100%',
      }}>
        {collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}
      </button>
    </aside>
  );
}
