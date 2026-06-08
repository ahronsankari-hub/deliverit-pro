import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<'login'|'register'>('login');
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', companyName:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const f = (k: string, v: string) => setForm(p => ({...p, [k]: v}));

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await login(form.email, form.password); nav('/'); }
    catch { setErr('אימייל או סיסמה שגויים'); } finally { setLoading(false); }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { data } = await authApi.register({ ...form, role: 'sender' });
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    } catch (e: any) { setErr(e.response?.data?.message || 'שגיאה'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0A0F1E', display:'flex', overflow:'hidden', position:'relative' }}>
      {/* Animated background orbs */}
      <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)', top:-100, right:-100, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', bottom:-50, left:-50, pointerEvents:'none' }} />

      {/* Left panel — branding */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 80px', position:'relative' }}>
        <div style={{ animation:'fade-up 0.6s ease forwards' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#FF6B35,#FF4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, boxShadow:'0 8px 25px rgba(255,107,53,0.4)' }}>🚀</div>
            <div>
              <div style={{ fontSize:26, fontWeight:900, color:'white', letterSpacing:'-0.5px' }}>DeliverIt</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>Pro Logistics Platform</div>
            </div>
          </div>

          <h1 style={{ fontSize:52, fontWeight:900, lineHeight:1.1, marginBottom:20, letterSpacing:'-1px' }}>
            <span style={{ color:'white' }}>מערכת הלוגיסטיקה</span><br/>
            <span style={{ background:'linear-gradient(135deg,#FF6B35,#FF4444)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>החכמה בישראל</span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:18, lineHeight:1.6, marginBottom:48 }}>
            ממעטפה ועד משאית — הכל במכרז אחד.<br/>שליחים מתחרים, אתה מרוויח.
          </p>

          {/* Stats */}
          <div style={{ display:'flex', gap:32 }}>
            {[['2,847','שליחים פעילים'],['98%','שביעות רצון'],['4.2 דק\'','זמן קבלת הצעה']].map(([n,l]) => (
              <div key={l}>
                <div style={{ fontSize:28, fontWeight:900, color:'#FF6B35' }}>{n}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ width:480, background:'rgba(255,255,255,0.03)', borderLeft:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
        <div style={{ width:'100%', animation:'slide-in 0.4s ease forwards' }}>
          {/* Tab switcher */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:14, padding:4, marginBottom:32 }}>
            {([['login','התחברות'],['register','הרשמה']] as const).map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'11px', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:15, fontFamily:'inherit', transition:'all 0.2s', background: tab===t ? 'white':'transparent', color: tab===t ? '#0A0F1E':'rgba(255,255,255,0.4)', boxShadow: tab===t ? '0 2px 10px rgba(0,0,0,0.2)':'' }}>
                {l}
              </button>
            ))}
          </div>

          <form onSubmit={tab==='login' ? handleLogin : handleRegister} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {tab === 'register' && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={lbl}>שם מלא</label>
                    <input className="input-dark" value={form.name} onChange={e=>f('name',e.target.value)} placeholder="ישראל ישראלי" required />
                  </div>
                  <div>
                    <label style={lbl}>טלפון</label>
                    <input className="input-dark" value={form.phone} onChange={e=>f('phone',e.target.value)} placeholder="050-0000000" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>שם חברה (אופציונלי)</label>
                  <input className="input-dark" value={form.companyName} onChange={e=>f('companyName',e.target.value)} placeholder="ABC בע״מ" />
                </div>
              </>
            )}
            <div>
              <label style={lbl}>אימייל</label>
              <input className="input-dark" type="email" value={form.email} onChange={e=>f('email',e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label style={lbl}>סיסמה</label>
              <input className="input-dark" type="password" value={form.password} onChange={e=>f('password',e.target.value)} placeholder="••••••••" required />
            </div>

            {err && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', color:'#FCA5A5', fontSize:14 }}>
                ⚠️ {err}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ padding:'15px', fontSize:16, marginTop:4, opacity:loading?.7:1 }}>
              {loading ? <><span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', marginLeft:8, verticalAlign:'middle' }}/> טוען...</> : tab==='login' ? '→ כניסה' : '→ יצירת חשבון'}
            </button>
          </form>

          <div style={{ marginTop:28, padding:16, background:'rgba(255,107,53,0.06)', border:'1px solid rgba(255,107,53,0.15)', borderRadius:12 }}>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginBottom:8, fontWeight:600 }}>🔑 חשבון דמו</p>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:13, fontFamily:'monospace' }}>demo@deliverit.com / demo1234</p>
          </div>

          <p style={{ textAlign:'center', marginTop:24, color:'rgba(255,255,255,0.3)', fontSize:13 }}>
            שליח? <a href="http://localhost:3004" style={{ color:'#FF6B35', fontWeight:700, textDecoration:'none' }}>כנס לפורטל שליחים ←</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display:'block', marginBottom:6, color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' };
