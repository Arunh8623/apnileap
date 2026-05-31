import React, { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, CheckCircle, XCircle, AlertTriangle, Send, ArrowRight, Info, Eye } from 'lucide-react';
import Header from '../components/Header';
import IssueDetail from '../components/IssueDetail';
import { getNotifications } from '../services/api';

const TYPE_META = {
  approved:   { icon: CheckCircle, color: 'var(--accent-emerald)', label: 'Approved',   badge: 'green' },
  rejected:   { icon: XCircle,     color: 'var(--accent-rose)',    label: 'Rejected',    badge: 'rose' },
  submitted:  { icon: Send,        color: 'var(--accent-violet)',  label: 'Submitted',   badge: 'violet' },
  escalation: { icon: AlertTriangle,color:'var(--accent-rose)',   label: 'Escalation',  badge: 'rose' },
  alert:      { icon: AlertTriangle,color:'var(--accent-amber)',  label: 'Alert',       badge: 'amber' },
  assigned:   { icon: ArrowRight,  color: 'var(--accent-blue)',   label: 'Assignment',  badge: 'blue' },
  info:       { icon: Info,        color: 'var(--text-muted)',    label: 'Info',        badge: 'gray' },
};

const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewKey, setViewKey] = useState(null);
  const [read, setRead] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotifications(await getNotifications() || []); }
    catch { setNotifications([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = (id) => setRead(prev => new Set([...prev, id]));
  const markAllRead = () => setRead(new Set(notifications.map(n => n.id)));

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const unread = notifications.filter(n => !read.has(n.id)).length;

  const counts = {};
  notifications.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1; });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header
        title={<span>Notifications {unread > 0 && <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--accent-rose)', borderRadius: 10, fontSize: 11, color: 'white' }}>{unread}</span>}</span>}
        subtitle="Governance alerts, approvals, escalations"
        onRefresh={load} loading={loading}
      />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Filter bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          {['all', 'approved', 'rejected', 'submitted', 'escalation', 'alert', 'assigned'].map(t => {
            const meta = TYPE_META[t] || { label: 'All', color: 'var(--text-secondary)' };
            const count = t === 'all' ? notifications.length : (counts[t] || 0);
            return (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === t ? meta.color || 'var(--accent-blue)' : 'var(--border)'}`,
                background: filter === t ? `${meta.color || 'var(--accent-blue)'}18` : 'transparent',
                color: filter === t ? (meta.color || 'var(--accent-blue)') : 'var(--text-secondary)',
                fontSize: 11, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {t === 'all' ? '🔔' : ''} {t.charAt(0).toUpperCase() + t.slice(1)}
                {count > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{count}</span>}
              </button>
            );
          })}
          {unread > 0 && (
            <button onClick={markAllRead} className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: 11, padding: '5px 12px' }}>
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 56, color: 'var(--text-muted)' }}>
              <Bell size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
              <p style={{ fontSize: 15 }}>No notifications yet</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>Governance alerts, approvals, and escalations appear here</p>
            </div>
          ) : filtered.map(notif => {
            const meta = TYPE_META[notif.type] || TYPE_META.info;
            const Icon = meta.icon;
            const isUnread = !read.has(notif.id);
            return (
              <div key={notif.id} onClick={() => markRead(notif.id)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px', marginBottom: 6, borderRadius: 10,
                background: isUnread ? `${meta.color}08` : 'var(--bg-card)',
                border: `1px solid ${isUnread ? meta.color + '25' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'var(--transition)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = isUnread ? `${meta.color}08` : 'var(--bg-card)'}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Icon size={16} style={{ color: meta.color }} />
                  {isUnread && <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: meta.color, border: '2px solid var(--bg-primary)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className={`badge badge-${meta.badge}`} style={{ fontSize: 9 }}>{meta.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>{notif.issueKey}</span>
                    {notif.project && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{notif.project}</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{timeAgo(notif.created)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.issueSummary}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.preview}...</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setViewKey(notif.issueKey); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
                  <Eye size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {viewKey && <IssueDetail issueKey={viewKey} onClose={() => setViewKey(null)} onUpdated={() => {}} />}
    </div>
  );
}
