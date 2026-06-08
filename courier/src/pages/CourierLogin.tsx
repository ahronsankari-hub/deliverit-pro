import { useState, type FormEvent } from 'react';
import { authApi } from '../services/api';

const VEHICLES = [
  { type:'scooter',    emoji:'🛵', label:'קטנוע',      sub:'עד 5 ק"ג',   color:'#FF6B35' },
  { type:'car',        emoji:'🚗', label:'רכב פרטי',   sub:'עד 50 ק"ג',  color:'#3B82F6' },
  { type:'van',        emoji:'🚐', label:'מסחרי/ואן',  sub:'עד 500 ק"ג', color:'#8B5CF6' },
  { type:'truck',      emoji:'🚛', label:'משאית קלה',  sub:'עד 3.5 טון', color:'#10B981' },
  { type:'heavytruck', emoji:'🚚', label:'משאית כבדה', sub:'3.5+ טון',   color:'#EF4444' },
];
const MAX_WEIGHT: Record<string,number> = { scooter:5, car:50, van:500, truck:3500, heavytruck:20000 };
const CITIES = ['תל אביב','ירושלים','חיפה','באר שבע','ראשון לציון','פתח תקווה','אשדוד','נתניה','רמת גן','הרצליה','אחר'];

const lbl: React.CSSProperties = { display:'block', marginBottom:5, color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.5px' };

export default function CourierLogin() {
  const [tab, setTab]       = useState<'login'|'register'>('login');
  const [step, setStep]     = useState(1); // register: step 1=personal, 2=vehicle, 3=done
  const [form, setForm]     = useState({ name:'', email:'', password:'', phone:'', vehicleType:'car', licensePlate:'', city:'תל אביב', description:'' });
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const sel = VEHICLES.find(v => v.type === form.vehicleType)!;

  const login = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { data } = await authApi.login({ email: form.email, password: form.password });
      if (data.user.role !== 'courier') { setErr('חשבון זה אינו של שליח'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/';
    } catch(e: any) { setErr(e.response?.data?.message || 'אימייל או סיסמה שגויים'); }
    finally { setLoading(false); }
  };

  const register = async () => {
    setErr(''); setLoading(true);
    try {
      const { data } = await authApi.register({
        name: form.name, email: form.email, password: form.password,
        phone: form.phone, role: 'courier',
        vehicle: { vehicleType: form.vehicleType, licensePlate: form.licensePlate, maxWeightKg: MAX_WEIGHT[form.vehicleType], city: form.city, description: form.description },
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      setStep(3);
    } catch(e: any) { setErr(e.response?.data?.message || 'שגיאה בהרשמה'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0A0F1E', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden', direction:'rtl' }}>
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,53,0.12),transparent 70%)', top:-150, left:-100, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%)', bottom:-100, right:-50, pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth: tab === 'register' ? 480 : 420 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:68, height:68, borderRadius:20, background:'linear-gradient(135deg,#FF6B35,#FF4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 12px', boxShadow:'0 12px 40px rgba(255,107,53,0.4)' }}>🚀</div>
          <h1 style={{ fontSize:26, fontWeight:900, color:'white', marginBottom:4 }}>DeliverIt <span style={{ color:'#FF6B35' }}>Courier</span></h1>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13 }}>התחרה. נצח. הרוויח.</p>
        </div>

        {/* Tab switcher */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:14, padding:4, marginBottom:24 }}>
          {(['login','register'] as const).map((t, i) => (
            <button key={t} onClick={() => { setTab(t); setStep(1); setErr(''); }} style={{ flex:1, padding:'11px', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:15, fontFamily:'inherit', transition:'all 0.2s', background:tab===t?'white':'transparent', color:tab===t?'#0A0F1E':'rgba(255,255,255,0.4)' }}>
              {i===0 ? 'התחברות' : 'הרשמה'}
            </button>
          ))}
        </div>

        {/* ── LOGIN ── */}
        {tab === 'login' && (
          <form onSubmit={login} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div><label style={lbl}>אימייל</label><input className="input-field" type="email" value={form.email} onChange={e=>f('email',e.target.value)} placeholder="you@mail.com" required autoFocus /></div>
            <div><label style={lbl}>סיסמה</label><input className="input-field" type="password" value={form.password} onChange={e=>f('password',e.target.value)} placeholder="••••••••" required /></div>
            {err && <ErrBox msg={err} />}
            <button type="submit" className="btn-orange" disabled={loading} style={{ padding:'15px', fontSize:16, marginTop:4 }}>
              {loading ? <Spinner /> : '→ כניסה לפורטל'}
            </button>
            <a href="/forgot-password" style={{ textAlign:'center', color:'rgba(255,255,255,0.35)', fontSize:13, textDecoration:'none', marginTop:4 }}>שכחתי סיסמה</a>
          </form>
        )}

        {/* ── REGISTER STEP 1 — פרטים אישיים ── */}
        {tab === 'register' && step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <StepBar step={1} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label style={lbl}>שם מלא *</label><input className="input-field" value={form.name} onChange={e=>f('name',e.target.value)} placeholder="יוסי כהן" required /></div>
              <div><label style={lbl}>טלפון *</label><input className="input-field" value={form.phone} onChange={e=>f('phone',e.target.value)} placeholder="050-0000000" /></div>
            </div>
            <div><label style={lbl}>אימייל *</label><input className="input-field" type="email" value={form.email} onChange={e=>f('email',e.target.value)} placeholder="you@mail.com" required /></div>
            <div><label style={lbl}>סיסמה *</label><input className="input-field" type="password" value={form.password} onChange={e=>f('password',e.target.value)} placeholder="לפחות 6 תווים" required /></div>
            <div>
              <label style={lbl}>עיר פעילות</label>
              <select className="input-field" value={form.city} onChange={e=>f('city',e.target.value)} style={{ cursor:'pointer' }}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {err && <ErrBox msg={err} />}
            <button onClick={() => { if (!form.name||!form.email||!form.password) { setErr('מלא את כל השדות'); return; } setErr(''); setStep(2); }} className="btn-orange" style={{ padding:'15px', fontSize:16, marginTop:4 }}>
              המשך לפרטי רכב →
            </button>
          </div>
        )}

        {/* ── REGISTER STEP 2 — פרטי רכב ── */}
        {tab === 'register' && step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <StepBar step={2} />
            <div>
              <label style={lbl}>סוג הרכב שלי</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:10 }}>
                {VEHICLES.map(v => (
                  <button key={v.type} type="button" onClick={() => f('vehicleType',v.type)} style={{ padding:'10px 4px', border:`2px solid ${form.vehicleType===v.type?v.color:'rgba(255,255,255,0.08)'}`, borderRadius:12, background:form.vehicleType===v.type?`${v.color}20`:'transparent', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                    <div style={{ fontSize:22 }}>{v.emoji}</div>
                    <div style={{ fontSize:9, fontWeight:700, color:form.vehicleType===v.type?v.color:'rgba(255,255,255,0.4)', marginTop:2 }}>{v.label}</div>
                    <div style={{ fontSize:8, color:'rgba(255,255,255,0.25)' }}>{v.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{ padding:'12px 16px', borderRadius:12, background:`${sel.color}15`, border:`1px solid ${sel.color}30`, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:28 }}>{sel.emoji}</span>
                <div>
                  <div style={{ color:'white', fontWeight:800, fontSize:15 }}>{sel.label}</div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>{sel.sub}</div>
                </div>
                <div style={{ marginRight:'auto', color:`${sel.color}`, fontWeight:700, fontSize:13 }}>✓ נבחר</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label style={lbl}>מספר רישוי</label><input className="input-field" value={form.licensePlate} onChange={e=>f('licensePlate',e.target.value)} placeholder="12-345-67" /></div>
            </div>
            <div><label style={lbl}>תיאור קצר (אופציונלי)</label><input className="input-field" value={form.description} onChange={e=>f('description',e.target.value)} placeholder="מהיר ואמין, פעיל כל השבוע..." /></div>
            {err && <ErrBox msg={err} />}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>← חזור</button>
              <button onClick={register} disabled={loading} className="btn-orange" style={{ flex:2, padding:'13px', fontSize:15 }}>
                {loading ? <Spinner /> : '→ הצטרף כשליח'}
              </button>
            </div>
          </div>
        )}

        {/* ── REGISTER STEP 3 — SUCCESS ── */}
        {tab === 'register' && step === 3 && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
            <h2 style={{ color:'white', fontWeight:900, fontSize:22, marginBottom:8 }}>ברוך הבא לDeliverIt!</h2>
            <p style={{ color:'rgba(255,255,255,0.5)', marginBottom:28, lineHeight:1.6 }}>
              החשבון שלך נוצר בהצלחה.<br/>
              עכשיו תוכל לראות מכרזים ולהגיש הצעות.
            </p>
            <button onClick={() => window.location.href='/'} className="btn-orange" style={{ padding:'16px 40px', fontSize:16 }}>
              🚀 התחל לעבוד
            </button>
          </div>
        )}

        {tab === 'login' && (
          <div style={{ marginTop:20, padding:12, background:'rgba(255,107,53,0.06)', border:'1px solid rgba(255,107,53,0.12)', borderRadius:12, textAlign:'center' }}>
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:3 }}>🔑 Demo</p>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontFamily:'monospace' }}>yosi@courier.com / courier123</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
      {[1,2].map((s, i) => (
        <>
          <div key={s} style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, background:step>=s?'#FF6B35':'rgba(255,255,255,0.08)', color:step>=s?'white':'rgba(255,255,255,0.3)', flexShrink:0 }}>{s}</div>
          {i === 0 && <div style={{ flex:1, height:2, background:step>1?'#FF6B35':'rgba(255,255,255,0.08)', borderRadius:1 }} />}
        </>
      ))}
      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginRight:'auto' }}>
        {step === 1 ? 'פרטים אישיים' : 'פרטי רכב'}
      </span>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', color:'#FCA5A5', fontSize:13 }}>⚠️ {msg}</div>;
}

function Spinner() {
  return <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} /> טוען...</span>;
}
