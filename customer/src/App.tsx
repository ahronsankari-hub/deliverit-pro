import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const STATUS_STEPS = [
  { key: 'open',       label: 'ממתין לשליח',     icon: '📋', done: false },
  { key: 'bidding',    label: 'שליחים מתמודדים', icon: '⚡', done: false },
  { key: 'assigned',   label: 'שליח הוקצה',       icon: '✅', done: false },
  { key: 'picked_up',  label: 'החבילה נאספה',     icon: '📦', done: false },
  { key: 'in_transit', label: 'בדרך אליך',        icon: '🚀', done: false },
  { key: 'delivered',  label: 'נמסר!',            icon: '🎉', done: false },
];

const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

function ProgressBar({ status }: { status: string }) {
  const current = STATUS_ORDER.indexOf(status);
  if (current === -1) return null;
  return (
    <div style={{ margin: '32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STATUS_STEPS.map((step, i) => {
          const done    = i < current;
          const active  = i === current;
          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* Connector line */}
              {i > 0 && (
                <div style={{ position: 'absolute', top: 20, right: '50%', width: '100%', height: 3, background: done || active ? 'linear-gradient(90deg,#FF6B35,#FF4444)' : 'rgba(255,255,255,0.1)', zIndex: 0 }} />
              )}
              {/* Circle */}
              <div style={{ width: 40, height: 40, borderRadius: '50%', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: done ? 'linear-gradient(135deg,#10B981,#059669)' : active ? 'linear-gradient(135deg,#FF6B35,#FF4444)' : 'rgba(255,255,255,0.08)', border: `2px solid ${done ? '#10B981' : active ? '#FF6B35' : 'rgba(255,255,255,0.15)'}`, boxShadow: active ? '0 0 20px rgba(255,107,53,0.5)' : 'none', transition: 'all 0.4s' }}>
                {done ? '✓' : step.icon}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: active ? 800 : 500, color: done ? '#10B981' : active ? '#FF6B35' : 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.3 }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [code, setCode]     = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [live, setLive]     = useState(false);
  const socketRef = useRef<any>(null);

  // Check URL for code param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('code');
    if (c) { setCode(c); track(c); }
  }, []);

  // Socket.io live updates
  useEffect(() => {
    if (!result) return;
    const socket = io('http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join', result.id);
    socket.on('request:status', (data: any) => {
      if (data.id === result.id) {
        setResult((prev: any) => ({ ...prev, status: data.status }));
        setLive(true);
        setTimeout(() => setLive(false), 3000);
      }
    });
    return () => { socket.disconnect(); };
  }, [result?.id]);

  const track = async (trackCode?: string) => {
    const c = (trackCode || code).trim().toUpperCase();
    if (!c) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await axios.get(`${API}/requests/track/${c}`);
      setResult(data);
      window.history.replaceState({}, '', `?code=${c}`);
    } catch {
      setError('קוד מעקב לא נמצא — בדוק את הקוד ונסה שוב');
    } finally { setLoading(false); }
  };

  const isCancelled = result?.status === 'cancelled';
  const isDelivered = result?.status === 'delivered';

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', fontFamily: "'Segoe UI', sans-serif", direction: 'rtl', color: 'white' }}>
      {/* Header */}
      <header style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#FF6B35,#FF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚀</div>
          <span style={{ fontSize: 18, fontWeight: 800 }}>DeliverIt</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginRight: 4 }}>מעקב משלוחים</span>
        </div>
        {live && (
          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 14px', borderRadius: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            <span style={{ color: '#10B981', fontWeight: 700, fontSize: 13 }}>עדכון חי!</span>
          </div>
        )}
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>

        {/* Search box */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>🔍 מעקב אחר המשלוח שלך</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 28 }}>הזן את קוד המעקב שקיבלת מהשולח</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && track()}
              placeholder="DL-XXXXXX"
              style={{ flex: 1, padding: '14px 18px', borderRadius: 14, border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 18, fontWeight: 700, outline: 'none', letterSpacing: 2, textAlign: 'center', fontFamily: 'monospace' }}
            />
            <button
              onClick={() => track()}
              disabled={loading || !code.trim()}
              style={{ padding: '14px 28px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#FF6B35,#FF4444)', color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer', opacity: loading || !code.trim() ? 0.6 : 1 }}
            >
              {loading ? '...' : 'עקוב'}
            </button>
          </div>
          {error && <p style={{ color: '#EF4444', marginTop: 12, fontWeight: 600 }}>{error}</p>}
        </div>

        {/* Result */}
        {result && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isDelivered ? 'rgba(16,185,129,0.3)' : isCancelled ? 'rgba(239,68,68,0.3)' : 'rgba(255,107,53,0.3)'}`, borderRadius: 24, padding: 28 }}>

            {/* Title + status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{result.title}</div>
                <div style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{result.trackingCode}</div>
              </div>
              <div style={{ background: isCancelled ? 'rgba(239,68,68,0.15)' : isDelivered ? 'rgba(16,185,129,0.15)' : 'rgba(255,107,53,0.15)', border: `1px solid ${isCancelled ? 'rgba(239,68,68,0.4)' : isDelivered ? 'rgba(16,185,129,0.4)' : 'rgba(255,107,53,0.4)'}`, color: isCancelled ? '#EF4444' : isDelivered ? '#10B981' : '#FF6B35', padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                {isCancelled ? '❌ בוטל' : isDelivered ? '✅ נמסר' : '🟠 בתהליך'}
              </div>
            </div>

            {/* Progress */}
            {!isCancelled && <ProgressBar status={result.status} />}

            {/* Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              {[
                { icon: '🟢', label: 'איסוף', val: result.pickupAddress },
                { icon: '🔴', label: 'מסירה', val: result.dropoffAddress },
              ].map(x => (
                <div key={x.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16 }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>{x.icon} {x.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{x.val}</div>
                </div>
              ))}
            </div>

            {/* Sender */}
            {result.sender && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🏢</span>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>שולח</div>
                  <div style={{ fontWeight: 700 }}>{result.sender.companyName || result.sender.name}</div>
                </div>
                {result.weightKg && (
                  <div style={{ marginRight: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                    ⚖️ {result.weightKg} ק"ג
                  </div>
                )}
              </div>
            )}

            {/* Delivered proof */}
            {isDelivered && result.proofPhotoUrl && (
              <div style={{ marginTop: 20 }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📸 הוכחת מסירה</div>
                <img src={`http://localhost:5000${result.proofPhotoUrl}`} alt="proof" style={{ width: '100%', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            )}

            {/* Delivered congrats */}
            {isDelivered && (
              <div style={{ marginTop: 20, textAlign: 'center', padding: '20px', background: 'rgba(16,185,129,0.08)', borderRadius: 16, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div style={{ color: '#10B981', fontWeight: 800, fontSize: 18 }}>המשלוח הגיע!</div>
                {result.actualDeliveryAt && (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
                    {new Date(result.actualDeliveryAt).toLocaleString('he-IL')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        {!result && !loading && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 20, fontSize: 14 }}>איך זה עובד?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[['📦','שולח יוצר משלוח','המשלוח עולה למכרז'],['⚡','שליחים מתמודדים','מציעים מחיר תחרותי'],['🎉','אתה מקבל','בזמן ובמחיר טוב']].map(([icon,title,sub]) => (
                <div key={title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '20px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
