import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, Mail, Save, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import { getUsers, getRoles, saveRoles } from '../services/api';
import toast from 'react-hot-toast';

const ROLES = ['Hub Admin', 'Spoke Admin', 'PMO', 'Faculty', 'Mentor', 'Executive'];
const ROLE_COLORS = { 'Hub Admin': 'rose', 'Spoke Admin': 'violet', 'PMO': 'blue', 'Faculty': 'cyan', 'Mentor': 'emerald', 'Executive': 'amber' };
const ROLE_PERMS = {
  'Hub Admin':   ['Full system access', 'Manage all projects', 'Approve work packages', 'User management'],
  'Spoke Admin': ['Manage college project', 'Create/edit issues', 'Submit work packages', 'View analytics'],
  'PMO':         ['Cross-project visibility', 'Sprint management', 'Analytics access', 'Report generation'],
  'Faculty':     ['View assigned issues', 'Update task status', 'Add comments', 'View own dashboards'],
  'Mentor':      ['View project dashboards', 'Add comments', 'View sprint boards', 'Read-only analytics'],
  'Executive':   ['Full analytics access', 'View all dashboards', 'Export reports', 'Read-only governance'],
};

const nameToColor = (name = '') => {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#f43f5e','#06b6d4','#84cc16','#ec4899'];
  let h = 0;
  for (let c of name) h = (h << 5) - h + c.charCodeAt(0);
  return colors[Math.abs(h) % colors.length];
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleMap, setRoleMap] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.allSettled([getUsers(), getRoles()]);
      if (u.status === 'fulfilled') {
        const botKw = ['bot','automation','service','rovo','assistant','helper','checker','crafter','triage','insights','director','translator'];
        setUsers((u.value||[]).filter(user => !botKw.some(kw => (user.displayName||'').toLowerCase().includes(kw))));
      }
      if (r.status === 'fulfilled') setRoleMap(r.value || {});
    } catch (e) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setRole = (accountId, role) => {
    setRoleMap(r => ({ ...r, [accountId]: role }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRoles(roleMap);
      toast.success('Roles saved to server!');
      setDirty(false);
    } catch (e) { toast.error('Save failed: ' + e); }
    finally { setSaving(false); }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.emailAddress?.toLowerCase().includes(search.toLowerCase());
    const matchRole = selectedRole === 'all' || (roleMap[u.accountId] || 'Faculty') === selectedRole;
    return matchSearch && matchRole;
  });

  const roleCounts = {};
  users.forEach(u => { const r = roleMap[u.accountId] || 'Faculty'; roleCounts[r] = (roleCounts[r]||0)+1; });

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Header title="Users & Roles" subtitle={`${users.length} users · Roles persist on server`} onRefresh={load} loading={loading} />
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>

        {/* Role summary bar */}
        <div style={{ padding:'12px 24px', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
          <button onClick={() => setSelectedRole('all')} style={{
            padding:'5px 12px', borderRadius:20, border:`1px solid ${selectedRole==='all'?'var(--accent-blue)':'var(--border)'}`,
            background: selectedRole==='all'?'rgba(59,130,246,0.1)':'transparent',
            color: selectedRole==='all'?'var(--accent-blue)':'var(--text-secondary)',
            fontSize:11, cursor:'pointer', fontWeight:500,
          }}>All ({users.length})</button>
          {ROLES.map(r => (
            <button key={r} onClick={() => setSelectedRole(r===selectedRole?'all':r)} style={{
              padding:'5px 12px', borderRadius:20,
              border:`1px solid ${selectedRole===r?`var(--accent-${ROLE_COLORS[r]||'gray'})`:' var(--border)'}`,
              background: selectedRole===r?`rgba(59,130,246,0.08)`:'transparent',
              color: selectedRole===r?'var(--text-primary)':'var(--text-secondary)',
              fontSize:11, cursor:'pointer', fontWeight:500, display:'flex', alignItems:'center', gap:5,
            }}>
              <span className={`badge badge-${ROLE_COLORS[r]||'gray'}`} style={{ fontSize:9, padding:'1px 5px' }}>{r}</span>
              <span style={{ fontFamily:'var(--font-mono)' }}>{roleCounts[r]||0}</span>
            </button>
          ))}
          {dirty && (
            <button onClick={handleSave} className="btn btn-primary" disabled={saving} style={{ marginLeft:'auto', fontSize:12, padding:'6px 14px' }}>
              <Save size={13} /> {saving?'Saving...':'Save Roles'}
            </button>
          )}
          {!dirty && !loading && (
            <span style={{ marginLeft:'auto', fontSize:11, color:'var(--accent-emerald)', display:'flex', alignItems:'center', gap:4 }}>
              <CheckCircle size={12} /> Roles saved
            </span>
          )}
        </div>

        {/* Search */}
        <div style={{ padding:'12px 24px', flexShrink:0 }}>
          <div style={{ position:'relative', maxWidth:280 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..." style={{ paddingLeft:30, height:34, fontSize:12 }} />
          </div>
        </div>

        <div style={{ flex:1, overflow:'auto', padding:'0 24px 24px', display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignContent:'start' }}>
          {/* User grid */}
          <div>
            {loading ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {[1,2,3,4,5,6].map(i=><div key={i} className="skeleton" style={{ height:160 }} />)}
              </div>
            ) : filtered.length===0 ? (
              <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
                <Users size={40} style={{ marginBottom:12, opacity:0.2 }} />
                <p>No users found</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {filtered.map(u => {
                  const initials = u.displayName?.split(' ').map(n=>n?.[0]).filter(Boolean).join('').substring(0,2).toUpperCase()||'?';
                  const role = roleMap[u.accountId]||'Faculty';
                  const color = nameToColor(u.displayName);
                  const hasAvatar = u.avatarUrls?.['48x48'] && !u.avatarUrls['48x48'].includes('initials');

                  return (
                    <div key={u.accountId} className="card" style={{ textAlign:'center', padding:'18px 14px' }}>
                      <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 10px', background: hasAvatar?'transparent':`linear-gradient(135deg,${color},${color}99)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'white', overflow:'hidden', boxShadow:`0 0 0 2px var(--border), 0 0 12px ${color}30` }}>
                        {hasAvatar ? <img src={u.avatarUrls['48x48']} alt={u.displayName} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : initials}
                      </div>
                      <div style={{ fontWeight:600, fontSize:12, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.displayName}</div>
                      {u.emailAddress && (
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                          <Mail size={9}/> {u.emailAddress}
                        </div>
                      )}
                      <div style={{ marginBottom:8 }}>
                        <span className={`badge badge-${ROLE_COLORS[role]||'gray'}`}><Shield size={9}/> {role}</span>
                      </div>
                      <select value={role} onChange={e=>setRole(u.accountId, e.target.value)} style={{ fontSize:11, height:28, width:'100%', textAlign:'center' }}>
                        {ROLES.map(r=><option key={r}>{r}</option>)}
                      </select>
                      <div style={{ marginTop:8 }}>
                        <span className={`badge ${u.active!==false?'badge-green':'badge-gray'}`} style={{ fontSize:9 }}>
                          {u.active!==false?'● Active':'○ Inactive'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Role permissions reference panel */}
          <div style={{ position:'sticky', top:0 }}>
            <div className="card" style={{ padding:'16px 18px' }}>
              <div className="section-title" style={{ marginBottom:14 }}>Role Permissions</div>
              {ROLES.map(r => (
                <div key={r} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <span className={`badge badge-${ROLE_COLORS[r]||'gray'}`} style={{ fontSize:10 }}>{r}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{roleCounts[r]||0} users</span>
                  </div>
                  {ROLE_PERMS[r].map(p=>(
                    <div key={p} style={{ fontSize:11, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                      <span style={{ color:'var(--accent-emerald)', fontSize:9 }}>✓</span> {p}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
