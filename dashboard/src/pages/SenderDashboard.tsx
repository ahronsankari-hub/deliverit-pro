import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { reqApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import NewRequestModal from '../components/NewRequestModal';
import RequestCard from '../components/RequestCard';

type Toast = { id: number; msg: string; emoji: string };

function Toaster({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div style={{ position:'fixed', top:80, left:'50%', transform:'translateX(-50%)', zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)} style={{ background:'rgba(20,25,41,0.97)', border:'1px solid rgba(255,107,53,0.4)', borderRadius:14, padding:'12px 20px', color:'white', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:10, boxShadow:'0 8px 30px rgba(0,0,0,0.5)', animation:'fade-up 0.3s ease', pointerEvents:'auto', cursor:'pointer', whiteSpace:'nowrap' }}>
          <span style={{ fontSize:20 }}>{t.emoji}</span> {t.msg}
        </div>
      ))}
    </div>
  );
}

const TENDER_META: Record<string,{label:string;color:string;emoji:string;gradient:string}> = {
  flash:    { label:'מכרז מהיר',  color:'#FF6B35', emoji:'⚡', gradient:'linear-gradient(135deg,#FF6B35,#FF4444)' },
  standard: { label:'מכרז רגיל',  color:'#3B82F6', emoji:'📦', gradient:'linear-gradient(135deg,#3B82F6,#6366F1)' },
  extended: { label:'מכרז מורחב', color:'#8B5CF6', emoji:'🚐', gradient:'linear-gradient(135deg,#8B5CF6,#A78BFA)' },
  large:    { label:'מכרז גדול',  color:'#10B981', emoji:'🏭', gradient:'linear-gradient(135deg,#10B981,#059669)' },
};

function LiveNumber({ value }: { value: number }) {
  return <span style={{ fontSize:36, fontWeight:900, color:'white', fontVariantNumeric:'tabular-nums' }}>{value}</span>;
}

export default function SenderDashboard() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [search, setSearch]     = useState('');
  const [showNew, setShowNew]   = useState(false);
  const [tab, setTab]           = useState('all');
  const [ticker, setTicker]     = useState(0);
  const [toasts, setToasts]     = useState<Toast[]>([]);
  const toastId    = useRef(0);
  const socketRef  = useRef<Socket | null>(null);
  const searchTimer = useRef<any>(null);
  const LIMIT = 20;

  const addToast = useCallback((msg: string, emoji = '🔔') => {
    const id = ++toastId.current;
    setToasts(p => [...p.slice(-3), { id, msg, emoji }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const load = useCallback((off = 0, q = search) => {
    return reqApi.list({ limit: LIMIT, offset: off, ...(q ? { q } : {}) }).then(r => {
      const d = r.data?.data ?? r.data;
      const t = r.data?.total ?? d.length;
      if (off === 0) setRequests(d);
      else setRequests(p => [...p, ...d]);
      setTotal(t);
      setOffset(off);
    });
  }, [search]);

  const loadMore = () => load(offset + LIMIT);

  const handleSearch = (q: string) => {
    setSearch(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(0, q), 350);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setInterval(() => { setTicker(x => x+1); }, 1000); return () => clearInterval(t); }, []);

  // Socket.io — real-time notifications
  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join', user.id);
    socket.on('bid:new', (data: any) => {
      load();
      addToast(`הצעה חדשה ₪${data.price} על המשלוח שלך`, '💰');
    });
    socket.on('bid:accepted', (data: any) => {
      if (data.auto) { load(); addToast('מכרז נסגר — שליח הוקצה אוטומטית!', '🎉'); }
    });
    socket.on('request:status', (data: any) => {
      load();
      const msgs: Record<string,string> = { picked_up:'השליח אסף את החבילה 📦', in_transit:'החבילה בדרך 🚀', delivered:'המשלוח נמסר בהצלחה! ✅' };
      if (msgs[data.status]) addToast(msgs[data.status], '');
    });
    return () => { socket.disconnect(); };
  }, [user, load, addToast]);

  const filtered = requests.filter(r =>
    tab === 'all' ? true :
    tab === 'live' ? ['open','bidding'].includes(r.status) :
    tab === 'active' ? ['assigned','picked_up','in_transit'].includes(r.status) :
    r.status === 'delivered'
  );

  const stats = {
    live: requests.filter(r => ['open','bidding'].includes(r.status)).length,
    active: requests.filter(r => ['assigned','picked_up','in_transit'].includes(r.status)).length,
    done: requests.filter(r => r.status === 'delivered').length,
    bids: requests.reduce((s,r) => s + (r.bids?.length||0), 0),
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0A0F1E' }}>
      <Toaster toasts={toasts} remove={id => setToasts(p => p.filter(t => t.id !== id))} />
      {/* Top Nav */}
      <nav style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64, position:'sticky', top:0, zIndex:100, backdropFilter:'blur(20px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#FF6B35,#FF4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 4px 15px rgba(255,107,53,0.4)' }}>🚀</div>
          <span style={{ fontSize:18, fontWeight:800, color:'white', letterSpacing:'-0.3px' }}>DeliverIt</span>
          <span style={{ padding:'3px 10px', borderRadius:20, background:'rgba(255,107,53,0.15)', color:'#FF6B35', fontSize:11, fontWeight:700 }}>PRO</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Live badge */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:20, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)' }}>
            <div className="live-dot" />
            <span style={{ color:'#10B981', fontSize:12, fontWeight:700 }}>LIVE</span>
          </div>

          <button onClick={() => setShowNew(true)} className="btn-primary" style={{ padding:'10px 20px', fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18 }}>+</span> משלוח חדש
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 12px', borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }} onClick={logout}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'white' }}>
              {user?.name?.charAt(0)}
            </div>
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:600 }}>{user?.name?.split(' ')[0]}</span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'32px 32px' }}>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20, marginBottom:36 }}>
          {[
            { key:'live',   label:'מכרזים פעילים', value:stats.live,   color:'#FF6B35', icon:'⚡', sub:'מקבל הצעות עכשיו', gradient:'linear-gradient(135deg,rgba(255,107,53,0.15),rgba(255,68,68,0.05))' },
            { key:'active', label:'בדרך',           value:stats.active, color:'#3B82F6', icon:'🚚', sub:'שליחים בשטח', gradient:'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(99,102,241,0.05))' },
            { key:'done',   label:'הושלמו',          value:stats.done,   color:'#10B981', icon:'✓',  sub:'משלוחים מוצלחים', gradient:'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.05))' },
            { key:'bids',   label:'הצעות שהתקבלו',  value:stats.bids,   color:'#8B5CF6', icon:'💰', sub:'מתחרים על המשלוחים שלך', gradient:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(167,139,250,0.05))' },
          ].map(s => (
            <div key={s.key} style={{ background:s.gradient, border:`1px solid rgba(${s.color==='#FF6B35'?'255,107,53':s.color==='#3B82F6'?'59,130,246':s.color==='#10B981'?'16,185,129':'139,92,246'},0.2)`, borderRadius:20, padding:24, cursor:'pointer', transition:'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow=`0 8px 30px rgba(0,0,0,0.3)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow='none'; }}
              onClick={() => setTab(s.key === 'bids' ? 'all' : s.key)}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`rgba(${s.color==='#FF6B35'?'255,107,53':s.color==='#3B82F6'?'59,130,246':s.color==='#10B981'?'16,185,129':'139,92,246'},0.2)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {s.icon}
                </div>
                {s.key === 'live' && stats.live > 0 && <div style={{ width:8, height:8, borderRadius:'50%', background:'#10B981', position:'relative' }}><div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#10B981', animation:'pulse-ring 1.5s ease-out infinite' }} /></div>}
              </div>
              <LiveNumber value={s.value} />
              <div style={{ color:'rgba(255,255,255,0.7)', fontSize:14, fontWeight:600, marginTop:4 }}>{s.label}</div>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:12, marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:20 }}>
          <span style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', fontSize:18, pointerEvents:'none' }}>🔍</span>
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="חפש לפי כתובת, כותרת, קוד מעקב..."
            style={{ width:'100%', padding:'12px 48px 12px 16px', borderRadius:14, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'white', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
          {search && <button onClick={() => handleSearch('')} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:18 }}>×</button>}
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:24, borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:0 }}>
          {[
            ['all','הכל', requests.length],
            ['live','⚡ מכרזים פעילים', stats.live],
            ['active','🚚 בדרך', stats.active],
            ['done','✓ הושלם', stats.done],
          ].map(([k, l, count]) => (
            <button key={k} onClick={() => setTab(k as string)} style={{ padding:'10px 18px', border:'none', borderBottom:`2px solid ${tab===k ? '#FF6B35':'transparent'}`, background:'transparent', color: tab===k ? '#FF6B35':'rgba(255,255,255,0.4)', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'inherit', marginBottom:-1, display:'flex', alignItems:'center', gap:7, transition:'all 0.15s' }}>
              {l}
              {(count as number) > 0 && <span style={{ background: tab===k ? '#FF6B35':'rgba(255,255,255,0.08)', color: tab===k ? 'white':'rgba(255,255,255,0.5)', width:22, height:22, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>{count}</span>}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <button onClick={() => load(0)} style={{ padding:'8px 16px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, background:'transparent', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>
            ↻ רענן
          </button>
        </div>

        {/* Request list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <div style={{ fontSize:64, marginBottom:20, opacity:0.3 }}>📦</div>
            <h3 style={{ color:'rgba(255,255,255,0.5)', fontWeight:700, fontSize:20, marginBottom:12 }}>אין משלוחים כאן</h3>
            <p style={{ color:'rgba(255,255,255,0.25)', marginBottom:28 }}>צור משלוח חדש וקבל הצעות תוך דקות</p>
            <button onClick={() => setShowNew(true)} className="btn-primary" style={{ padding:'14px 28px', fontSize:16 }}>
              🚀 צור משלוח חדש
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {filtered.map((r, i) => (
                <div key={r.id} style={{ animation:`fade-up 0.3s ease ${i * 0.05}s both` }}>
                  <RequestCard request={r} meta={TENDER_META[r.tenderType]} onRefresh={() => load(0)} ticker={ticker} />
                </div>
              ))}
            </div>
            {requests.length < total && (
              <div style={{ textAlign:'center', marginTop:24 }}>
                <button onClick={loadMore} style={{ padding:'12px 32px', borderRadius:14, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.6)', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  טען עוד ({total - requests.length} נוספים)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showNew && <NewRequestModal onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}
