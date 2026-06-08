import { useState } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });

export default function ReviewModal({ request, onClose, onDone }: { request: any; onClose: () => void; onDone: () => void }) {
  const [rating, setRating]   = useState(0);
  const [hover,  setHover]    = useState(0);
  const [text,   setText]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      await api.post('/reviews', { requestId: request.id, rating, text });
      onDone();
    } catch (e: any) {
      alert(e.response?.data?.message || 'שגיאה');
    } finally { setLoading(false); }
  };

  const courier = request.bids?.find((b: any) => b.status === 'accepted')?.courier;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 36, maxWidth: 420, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
        <h2 style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 8 }}>דרג את השליח</h2>
        {courier && <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>איך היה {courier.name}?</p>}

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          {[1,2,3,4,5].map(s => (
            <span key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
              style={{ fontSize: 40, cursor: 'pointer', color: s <= (hover || rating) ? '#F59E0B' : 'rgba(255,255,255,0.15)', transition: 'all 0.1s', transform: s <= (hover || rating) ? 'scale(1.2)' : 'scale(1)' }}>★</span>
          ))}
        </div>

        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="הוסף הערה (אופציונלי)..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 80 }} />

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            אחר כך
          </button>
          <button onClick={submit} disabled={!rating || loading} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: rating ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'rgba(255,255,255,0.08)', color: rating ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 800, cursor: rating ? 'pointer' : 'default', fontSize: 15, fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {loading ? '...' : rating ? `שלח ${['','⭐','⭐⭐','⭐⭐⭐','⭐⭐⭐⭐','⭐⭐⭐⭐⭐'][rating]}` : 'בחר דירוג'}
          </button>
        </div>
      </div>
    </div>
  );
}
