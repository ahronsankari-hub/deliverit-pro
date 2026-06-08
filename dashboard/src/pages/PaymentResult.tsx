import { useSearchParams } from 'react-router-dom';

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <div style={{ minHeight:'100vh', background:'#0A0F1E', display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl' }}>
      <div style={{ textAlign:'center', maxWidth:420, padding:40, background:'rgba(255,255,255,0.04)', borderRadius:24, border:'1px solid rgba(16,185,129,0.25)' }}>
        <div style={{ fontSize:72, marginBottom:20 }}>✅</div>
        <h1 style={{ color:'#10B981', fontWeight:900, fontSize:28, marginBottom:12 }}>התשלום הצליח!</h1>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15, lineHeight:1.6, marginBottom:28 }}>
          התשלום עבר בהצלחה.<br/>
          חשבונית PDF תישלח לאימייל שלך.
        </p>
        {sessionId && (
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'8px 14px', marginBottom:24, color:'rgba(255,255,255,0.3)', fontSize:11, fontFamily:'monospace', wordBreak:'break-all' }}>
            {sessionId}
          </div>
        )}
        <button onClick={() => window.location.href='/'} style={{ padding:'14px 32px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#10B981,#059669)', color:'white', fontWeight:800, fontSize:16, cursor:'pointer', fontFamily:'inherit' }}>
          → חזור לדשבורד
        </button>
      </div>
    </div>
  );
}

export function PaymentCancel() {
  return (
    <div style={{ minHeight:'100vh', background:'#0A0F1E', display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl' }}>
      <div style={{ textAlign:'center', maxWidth:380, padding:40, background:'rgba(255,255,255,0.04)', borderRadius:24, border:'1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>↩️</div>
        <h1 style={{ color:'#F59E0B', fontWeight:900, fontSize:24, marginBottom:12 }}>התשלום בוטל</h1>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14, lineHeight:1.6, marginBottom:24 }}>
          חזרת מדף התשלום.<br/>
          ניתן לשלם בכל עת מהדשבורד.
        </p>
        <button onClick={() => window.location.href='/'} style={{ padding:'13px 28px', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
          ← חזור
        </button>
      </div>
    </div>
  );
}
