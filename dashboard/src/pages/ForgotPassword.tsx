import { useState } from 'react';
import { authApi } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); setSent(true); }
    catch {}
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0A0F1E', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:380, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, padding:36, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔑</div>
        <h1 style={{ color:'white', fontWeight:900, fontSize:22, marginBottom:8 }}>שכחתי סיסמה</h1>

        {sent ? (
          <>
            <div style={{ fontSize:40, margin:'16px 0' }}>📧</div>
            <p style={{ color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>שלחנו לינק לאיפוס לכתובת <strong style={{ color:'white' }}>{email}</strong></p>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13, marginTop:8 }}>בדוק גם את תיקיית הספאם</p>
            <a href="/login" style={{ display:'block', marginTop:24, color:'#FF6B35', fontWeight:700, textDecoration:'none' }}>חזרה להתחברות →</a>
          </>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color:'rgba(255,255,255,0.5)', marginBottom:24, fontSize:14 }}>נשלח לך לינק לאיפוס סיסמה</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="כתובת אימייל" autoFocus
              style={{ width:'100%', padding:'13px 16px', borderRadius:12, border:'2px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'white', fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginBottom:14 }} />
            <button type="submit" disabled={loading || !email} style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#FF6B35,#FF4444)', color:'white', fontWeight:800, fontSize:15, cursor:'pointer', opacity:loading||!email?0.7:1, fontFamily:'inherit' }}>
              {loading ? 'שולח...' : 'שלח לינק לאיפוס'}
            </button>
            <a href="/login" style={{ display:'block', marginTop:16, color:'rgba(255,255,255,0.4)', fontSize:13, textDecoration:'none' }}>חזרה להתחברות</a>
          </form>
        )}
      </div>
    </div>
  );
}
