import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });

type Tab = 'stats' | 'users' | 'requests';

function StatCard({ icon, label, value, color }: any) {
  return (
    <div style={{ background: `rgba(${color},0.1)`, border: `1px solid rgba(${color},0.25)`, borderRadius: 18, padding: 22 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: `rgb(${color})` }}>{typeof value === 'number' && value > 999 ? `${(value/1000).toFixed(1)}k` : value}</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

const STATUS_COLOR: Record<string,string> = {
  open:'#F59E0B', bidding:'#3B82F6', assigned:'#8B5CF6',
  picked_up:'#06B6D4', in_transit:'#10B981', delivered:'#10B981', cancelled:'#6B7280',
};

export default function AdminDashboard() {
  const [tab, setTab]           = useState<Tab>('stats');
  const [stats, setStats]       = useState<any>({});
  const [users, setUsers]       = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [reqFilter, setReqFilter]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, r] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?limit=100'),
        api.get('/admin/requests?limit=100'),
      ]);
      setStats(s.data);
      setUsers(u.data.data);
      setRequests(r.data.data);
    } catch (e: any) {
      if (e.response?.status === 403) alert('אין לך הרשאת אדמין');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleUser = async (id: string, name: string) => {
    if (!confirm(`לשנות סטטוס של ${name}?`)) return;
    await api.patch(`/admin/users/${id}/toggle`);
    load();
  };

  const forceCancel = async (id: string, title: string) => {
    if (!confirm(`לבטל את "${title}"?`)) return;
    await api.post(`/admin/requests/${id}/cancel`);
    load();
  };

  const filteredUsers    = users.filter(u => !userFilter || u.name.includes(userFilter) || u.email.includes(userFilter) || u.role === userFilter);
  const filteredRequests = requests.filter(r => !reqFilter || r.status === reqFilter || r.title?.includes(reqFilter));

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: 'white', fontFamily: 'inherit', direction: 'rtl' }}>
      {/* Header */}
      <header style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px', display: 'flex', alignItems: 'center', height: 60, gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#EF4444,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚙️</div>
        <span style={{ fontWeight: 900, fontSize: 18 }}>DeliverIt Admin</span>
        {loading && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>טוען...</span>}
        <button onClick={load} style={{ marginRight: 'auto', padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>↻ רענן</button>
        <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }} style={{ padding: '8px 16px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, background: 'rgba(239,68,68,0.05)', color: '#EF4444', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>יציאה</button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {([['stats','📊 סטטיסטיקות'],['users','👥 משתמשים'],['requests','📦 משלוחים']] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '14px 24px', border: 'none', borderBottom: `3px solid ${tab===k?'#EF4444':'transparent'}`, background: 'transparent', color: tab===k?'#EF4444':'rgba(255,255,255,0.4)', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── STATS ── */}
        {tab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            <StatCard icon="👥" label="סה״כ משתמשים"  value={stats.users}     color="139,92,246" />
            <StatCard icon="🚚" label="שליחים"         value={stats.couriers}  color="59,130,246" />
            <StatCard icon="🏢" label="שולחים"         value={stats.senders}   color="255,107,53" />
            <StatCard icon="📦" label="סה״כ משלוחים"  value={stats.requests}  color="16,185,129" />
            <StatCard icon="⚡" label="פעילים עכשיו"   value={stats.active}    color="245,158,11" />
            <StatCard icon="✅" label="הושלמו"          value={stats.delivered} color="16,185,129" />
            <StatCard icon="💰" label="הצעות שהוגשו"   value={stats.bids}      color="139,92,246" />
            <StatCard icon="💵" label="הכנסות (₪)"     value={stats.revenue ? Math.round(stats.revenue).toLocaleString('he-IL') : 0} color="245,158,11" />
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input value={userFilter} onChange={e => setUserFilter(e.target.value)} placeholder="🔍 חפש שם / אימייל / תפקיד..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              {['','sender','courier'].map(r => (
                <button key={r} onClick={() => setUserFilter(r)} style={{ padding: '10px 16px', borderRadius: 12, border: `1px solid ${userFilter===r?'#EF4444':'rgba(255,255,255,0.1)'}`, background: userFilter===r?'rgba(239,68,68,0.1)':'transparent', color: userFilter===r?'#EF4444':'rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                  {r===''?'הכל':r==='sender'?'שולחים':'שליחים'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredUsers.map(u => (
                <div key={u.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${u.isActive?'rgba(255,255,255,0.07)':'rgba(239,68,68,0.2)'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: u.role==='courier'?'linear-gradient(135deg,#3B82F6,#6366F1)':'linear-gradient(135deg,#FF6B35,#FF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: 16, flexShrink: 0 }}>
                    {u.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, color: u.isActive?'white':'rgba(255,255,255,0.4)' }}>{u.name}</span>
                      <span style={{ background: u.role==='courier'?'rgba(59,130,246,0.15)':'rgba(255,107,53,0.15)', color: u.role==='courier'?'#3B82F6':'#FF6B35', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        {u.role==='courier'?'🚚 שליח':'🏢 שולח'}
                      </span>
                      {!u.isActive && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>חסום</span>}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{u.email} · {u.totalJobs} משלוחים · ⭐{u.avgRating?.toFixed(1)}</div>
                  </div>
                  <button onClick={() => toggleUser(u.id, u.name)} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${u.isActive?'rgba(239,68,68,0.3)':'rgba(16,185,129,0.3)'}`, background: u.isActive?'rgba(239,68,68,0.05)':'rgba(16,185,129,0.05)', color: u.isActive?'#EF4444':'#10B981', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                    {u.isActive ? '🚫 חסום' : '✓ שחרר'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── REQUESTS ── */}
        {tab === 'requests' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['','open','bidding','assigned','in_transit','delivered','cancelled'].map(s => (
                <button key={s} onClick={() => setReqFilter(s)} style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${reqFilter===s?'#EF4444':'rgba(255,255,255,0.08)'}`, background: reqFilter===s?'rgba(239,68,68,0.1)':'transparent', color: reqFilter===s?'#EF4444':'rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
                  {s===''?'הכל':s}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredRequests.map(r => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{r.title}</span>
                      <span style={{ background: `${STATUS_COLOR[r.status]}20`, color: STATUS_COLOR[r.status], padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{r.status}</span>
                      {r.bids?.length > 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{r.bids.length} הצעות</span>}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                      {r.sender?.name} · {r.pickupAddress?.split(',')[0]} → {r.dropoffAddress?.split(',')[0]} · {r.weightKg}ק"ג
                    </div>
                  </div>
                  {r.acceptedPrice && <span style={{ color: '#10B981', fontWeight: 900, fontSize: 16 }}>₪{r.acceptedPrice}</span>}
                  {['open','bidding','assigned','picked_up','in_transit'].includes(r.status) && (
                    <button onClick={() => forceCancel(r.id, r.title)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
                      בטל
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
