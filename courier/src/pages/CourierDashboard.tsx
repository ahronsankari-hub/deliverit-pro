import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { reqApi, bidApi, courierApi, authApi, uploadApi, reviewApi } from '../services/api';

const TENDER_CFG: Record<string,{label:string;color:string;emoji:string;urgency:string;glow:string}> = {
  flash:    { label:'מכרז מהיר',  color:'#FF6B35', emoji:'⚡', urgency:'3 דקות',   glow:'rgba(255,107,53,0.4)' },
  standard: { label:'מכרז רגיל',  color:'#3B82F6', emoji:'📦', urgency:'30 דקות',  glow:'rgba(59,130,246,0.3)' },
  extended: { label:'מכרז מורחב', color:'#8B5CF6', emoji:'🚐', urgency:'2 שעות',   glow:'rgba(139,92,246,0.3)' },
  large:    { label:'מכרז גדול',  color:'#10B981', emoji:'🏭', urgency:'24 שעות',  glow:'rgba(16,185,129,0.3)' },
};
const VEHICLE_EMOJI: Record<string,string> = { scooter:'🛵', car:'🚗', van:'🚐', truck:'🚛', heavytruck:'🚚' };
const STATUS_NEXT: Record<string,{label:string;next:string;color:string}> = {
  assigned:  { label:'✓ איספתי את הסחורה', next:'picked_up', color:'#3B82F6' },
  picked_up: { label:'🚀 יצאתי לדרך',      next:'in_transit', color:'#8B5CF6' },
  in_transit:{ label:'✓ מסרתי בהצלחה!',    next:'delivered', color:'#10B981' },
};

function Countdown({ endsAt }: { endsAt: string }) {
  const [t, setT] = useState('');
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setT('פג!'); return; }
      const m = Math.floor(diff/60000), s = Math.floor((diff%60000)/1000);
      setT(m > 60 ? `${Math.floor(m/60)}ש' ${m%60}ד'` : `${m}:${String(s).padStart(2,'0')}`);
      setUrgent(diff < 120000);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [endsAt]);
  return <span style={{ fontWeight:900, fontSize:15, color:urgent?'#EF4444':'#10B981', animation:urgent?'countdown 1s infinite':'' }}>{urgent?'🔴 ':''}{t}</span>;
}

export default function CourierDashboard() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [tab, setTab] = useState<'market'|'active'|'bids'>('market');
  const [expanded, setExpanded] = useState<string|null>(null);
  const [bidForm, setBidForm] = useState<Record<string,{price:string;eta:string;msg:string}>>({});
  const [submitting, setSubmitting] = useState('');
  const [online, setOnline]         = useState(false);
  const [filter, setFilter]         = useState('all');
  const [uploading, setUploading]   = useState('');
  const [reviewTarget, setReviewTarget] = useState<{requestId:string;senderId:string}|null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText]     = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTenderAlert, setNewTenderAlert] = useState<any>(null);
  const [lowerPrices, setLowerPrices] = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    const [me, reqs, bids, st] = await Promise.all([authApi.me(), reqApi.list(), bidApi.myBids(), courierApi.stats()]);
    setUser(me.data); setRequests(reqs.data?.data ?? reqs.data); setMyBids(bids.data); setStats(st.data);
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => { const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  // Socket.io — מכרזים חדשים + הורדת מחירים בזמן אמת
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';
    const socket = io(API_URL, { transports: ['websocket','polling'] });
    socket.on('tender:new', (data: any) => {
      setNewTenderAlert(data);
      load(); // רענן רשימה
      setTimeout(() => setNewTenderAlert(null), 8000);
    });
    socket.on('bid:lowered', () => load());
    socket.on('request:new',  () => load());
    return () => { socket.disconnect(); };
  }, [load]);

  useEffect(() => {
    if (!online || !navigator.geolocation) return;
    const wid = navigator.geolocation.watchPosition(p => courierApi.location(p.coords.latitude, p.coords.longitude), ()=>{}, { enableHighAccuracy:true, maximumAge:30000 });
    return () => navigator.geolocation.clearWatch(wid);
  }, [online]);

  const withdrawBid = async (requestId: string) => {
    if (!confirm('למשוך את ההצעה?')) return;
    try { await bidApi.withdraw(requestId); await load(); }
    catch(e:any) { alert(e.response?.data?.message||'שגיאה'); }
  };

  const submitBid = async (requestId: string) => {
    const bf = bidForm[requestId];
    if (!bf?.price) return;
    setSubmitting(requestId);
    try {
      await bidApi.submit(requestId, { price:parseFloat(bf.price), estimatedMinutes:parseInt(bf.eta)||undefined, message:bf.msg });
      setBidForm(p => { const n={...p}; delete n[requestId]; return n; });
      await load();
    } catch(e:any) { alert(e.response?.data?.message||'שגיאה'); }
    finally { setSubmitting(''); }
  };

  const updateStatus = async (id:string, status:string) => {
    await reqApi.updateStatus(id, status);
    await load();
  };

  const uploadProof = async (requestId: string, file: File) => {
    setUploading(requestId);
    try {
      await uploadApi.proof(requestId, file);
      await load();
    } catch(e:any) { alert(e.response?.data?.message || 'שגיאה בהעלאה'); }
    finally { setUploading(''); }
  };

  const submitSenderReview = async () => {
    if (!reviewTarget || !reviewRating) return;
    try {
      await reviewApi.submit({ requestId: reviewTarget.requestId, rating: reviewRating, text: reviewText });
      setReviewTarget(null); setReviewRating(0); setReviewText('');
    } catch(e:any) { alert(e.response?.data?.message || 'שגיאה'); }
  };

  const logout = () => { localStorage.removeItem('token'); window.location.href='/login'; };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.tenderType === filter);
  const activeBids = myBids.filter(b => b.status==='accepted' && ['assigned','picked_up','in_transit'].includes(b.request?.status));

  const handleLowerBid = async (requestId: string) => {
    const newPrice = parseFloat(lowerPrices[requestId]||'0');
    if (!newPrice) return alert('הזן מחיר');
    try {
      await bidApi.lowerBid(requestId, newPrice);
      setLowerPrices(p => ({...p, [requestId]: ''}));
      await load();
    } catch(e:any) { alert(e.response?.data?.message||'שגיאה'); }
  };

  return (
    <>
    {/* 🚨 New Tender Alert Banner */}
    {newTenderAlert && (
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:9999, background:'linear-gradient(135deg,#FF6B35,#FF4444)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 20px rgba(255,107,53,0.5)', animation:'slideDown 0.3s ease' }}>
        <div>
          <div style={{ color:'white', fontWeight:900, fontSize:16 }}>🚨 מכרז חדש!</div>
          <div style={{ color:'rgba(255,255,255,0.85)', fontSize:13 }}>{newTenderAlert.title} • {newTenderAlert.pickupAddress} → {newTenderAlert.dropoffAddress}</div>
          {newTenderAlert.maxBudget && <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12 }}>תקציב: עד ₪{newTenderAlert.maxBudget}</div>}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { setTab('market'); setNewTenderAlert(null); }}
            style={{ padding:'8px 16px', borderRadius:12, border:'2px solid white', background:'white', color:'#FF4444', fontWeight:900, fontSize:13, cursor:'pointer' }}>הצע עכשיו!</button>
          <button onClick={() => setNewTenderAlert(null)} style={{ background:'transparent', border:'none', color:'white', fontSize:20, cursor:'pointer', padding:'4px 8px' }}>✕</button>
        </div>
      </div>
    )}
    <div style={{ minHeight:'100vh', background:'#0A0F1E', paddingBottom:100, paddingTop: newTenderAlert ? 80 : 0 }}>
      {/* Header */}
      <header style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#FF6B35,#FF4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🚀</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'white', lineHeight:1 }}>DeliverIt</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Courier Portal</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Online toggle */}
            <button onClick={() => setOnline(!online)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:20, border:`1px solid ${online ? '#10B981':'rgba(255,255,255,0.1)'}`, background:online ? 'rgba(16,185,129,0.1)':'transparent', cursor:'pointer', transition:'all 0.2s' }}>
              {online ? <><span className="live-dot" /><span style={{ color:'#10B981', fontWeight:700, fontSize:13 }}>פעיל</span></> : <><span style={{ width:8, height:8, borderRadius:'50%', background:'#6B7280', display:'inline-block' }} /><span style={{ color:'#6B7280', fontWeight:700, fontSize:13 }}>לא מחובר</span></>}
            </button>

            {user && (
              <div onClick={logout} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:12, background:'rgba(255,255,255,0.05)', cursor:'pointer' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'white' }}>{user.name?.charAt(0)}</div>
                <span style={{ color:'rgba(255,255,255,0.6)', fontSize:13 }}>{user.name?.split(' ')[0]}</span>
                <span style={{ fontSize:18 }}>{VEHICLE_EMOJI[user.vehicle?.vehicleType] || '🚗'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display:'flex', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
          {[
            { label:'מכרזים זמינים', val:requests.length, color:'#FF6B35' },
            { label:'פעיל',          val:activeBids.length, color:'#3B82F6' },
            { label:'הושלמו',        val:stats.delivered||0, color:'#10B981' },
            { label:'דירוג',         val:`${(stats.rating||5).toFixed(1)}⭐`, color:'#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ flex:1, padding:'10px 8px', textAlign:'center', borderLeft:'1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontWeight:900, fontSize:18, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Tab bar */}
      <div style={{ display:'flex', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.05)', position:'sticky', top:118, zIndex:90 }}>
        {([
          ['market',  '🏪 שוק מכרזים', requests.length],
          ['active',  '🚚 הפעיל שלי',  activeBids.length],
          ['bids',    '💰 ההצעות שלי', myBids.length],
        ] as const).map(([k,l,n]) => (
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:'14px 8px', border:'none', borderBottom:`3px solid ${tab===k?'#FF6B35':'transparent'}`, background:'transparent', color:tab===k?'#FF6B35':'rgba(255,255,255,0.35)', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all 0.15s' }}>
            {l}
            {n > 0 && <span style={{ background:tab===k?'#FF6B35':'rgba(255,255,255,0.1)', color:tab===k?'white':'rgba(255,255,255,0.5)', minWidth:22, height:22, borderRadius:11, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, padding:'0 6px' }}>{n}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px 16px', maxWidth:800, margin:'0 auto' }}>

        {/* ── MARKET ── */}
        {tab === 'market' && (
          <>
            {/* Filter chips */}
            <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
              {[['all','הכל 🌍'],...Object.entries(TENDER_CFG).map(([k,v])=>[k,`${v.emoji} ${v.label}`])].map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)} style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${filter===k?TENDER_CFG[k]?.color||'#FF6B35':'rgba(255,255,255,0.08)'}`, background:filter===k?`${TENDER_CFG[k]?.color||'#FF6B35'}20`:'transparent', color:filter===k?TENDER_CFG[k]?.color||'#FF6B35':'rgba(255,255,255,0.4)', fontWeight:700, cursor:'pointer', fontSize:13, whiteSpace:'nowrap', fontFamily:'inherit', transition:'all 0.15s' }}>
                  {l}
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>🏪</div>
                <p style={{ fontSize:16 }}>אין מכרזים פתוחים כרגע</p>
                <p style={{ fontSize:13, marginTop:8 }}>מרענן אוטומטית כל 15 שניות</p>
              </div>
            )}

            {filtered.map((r, i) => {
              const cfg = TENDER_CFG[r.tenderType];
              const isExp = expanded === r.id;
              const bf = bidForm[r.id] || { price:'', eta:'', msg:'' };
              const myBid = myBids.find(b => b.requestId===r.id);
              const topBid = [...(r.bids||[])].sort((a:any,b:any)=>a.price-b.price)[0];
              const isFlash = r.tenderType === 'flash';

              return (
                <div key={r.id} className="card" style={{ marginBottom:12, overflow:'hidden', border:`1px solid ${isFlash && ['open','bidding'].includes(r.status) ? 'rgba(255,107,53,0.3)':'rgba(255,255,255,0.07)'}`, animation:`fade-up 0.3s ease ${i*0.04}s both`, boxShadow: isFlash && ['open','bidding'].includes(r.status) ? `0 0 20px rgba(255,107,53,0.1)`:'' }}>
                  {/* Flash banner */}
                  {isFlash && ['open','bidding'].includes(r.status) && (
                    <div style={{ background:'linear-gradient(90deg,#FF6B35 0%,#FF4444 50%,#FF6B35 100%)', backgroundSize:'200% auto', animation:'shimmer 2s linear infinite', padding:'5px 16px', fontSize:12, fontWeight:800, color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span>⚡ מכרז מהיר — {r.bids?.length||0} שליחים מתמודדים!</span>
                      {r.biddingEndsAt && <Countdown endsAt={r.biddingEndsAt} />}
                    </div>
                  )}

                  <div onClick={() => setExpanded(isExp ? null : r.id)} style={{ padding:'16px', cursor:'pointer' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                          <span style={{ background:`${cfg.color}20`, color:cfg.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:800 }}>{cfg.emoji} {cfg.label}</span>
                          <span style={{ fontSize:18 }}>{VEHICLE_EMOJI[r.requiredVehicle]}</span>
                          {myBid && <span style={{ background:'rgba(16,185,129,0.15)', color:'#10B981', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:800 }}>✓ הגשתי ₪{myBid.price}</span>}
                        </div>
                        <h3 style={{ color:'white', fontWeight:800, fontSize:16, marginBottom:6 }}>{r.title}</h3>
                        {r.description && <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:8, fontStyle:'italic' }}>{r.description}</p>}
                        <div style={{ display:'flex', gap:12, fontSize:12, color:'rgba(255,255,255,0.35)', flexWrap:'wrap' }}>
                          <span>📍 {r.pickupAddress?.split(',')[0]}</span>
                          <span>→</span>
                          <span>{r.dropoffAddress?.split(',')[0]}</span>
                          <span>⚖️ {r.weightKg}ק"ג</span>
                          {r.sender && <span>🏢 {r.sender.companyName||r.sender.name}</span>}
                        </div>
                      </div>

                      <div style={{ textAlign:'left', flexShrink:0 }}>
                        {!isFlash && r.biddingEndsAt && <Countdown endsAt={r.biddingEndsAt} />}
                        {r.maxBudget && <div style={{ color:'#10B981', fontWeight:800, fontSize:15, marginTop:4 }}>עד ₪{r.maxBudget}</div>}
                        {topBid && <div style={{ color:'#F59E0B', fontSize:12, marginTop:4 }}>מוביל: ₪{topBid.price}</div>}
                        {r.bids?.length > 0 && <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginTop:2 }}>{r.bids.length} הצעות</div>}
                      </div>
                    </div>
                  </div>

                  {isExp && (
                    <div style={{ padding:'0 16px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', animation:'fade-up 0.2s ease' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, margin:'12px 0' }}>
                        {[{icon:'🟢',t:'איסוף',v:r.pickupAddress},{icon:'🔴',t:'מסירה',v:r.dropoffAddress}].map(x=>(
                          <div key={x.t} style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:12 }}>
                            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:4 }}>{x.icon} {x.t}</div>
                            <div style={{ color:'rgba(255,255,255,0.85)', fontSize:13 }}>{x.v}</div>
                          </div>
                        ))}
                      </div>

                      {/* BID FORM */}
                      {!myBid ? (
                        <div style={{ background:'rgba(255,107,53,0.05)', border:'1px solid rgba(255,107,53,0.2)', borderRadius:16, padding:16 }}>
                          <div style={{ color:'#FF6B35', fontWeight:800, fontSize:15, marginBottom:12 }}>💰 הגש הצעה</div>

                          {/* Quick prices */}
                          {r.maxBudget && (
                            <div style={{ marginBottom:12 }}>
                              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:8 }}>הצעה מהירה:</div>
                              <div style={{ display:'flex', gap:8 }}>
                                {[0.6,0.75,0.85,1.0].map(p => {
                                  const price = Math.round(r.maxBudget * p);
                                  const active = bf.price === String(price);
                                  return (
                                    <button key={p} type="button" onClick={() => setBidForm(prev => ({...prev,[r.id]:{...bf,price:String(price)}}))} style={{ flex:1, padding:'10px 4px', border:`2px solid ${active ? '#FF6B35':'rgba(255,255,255,0.08)'}`, borderRadius:12, background:active ? '#FF6B35':'transparent', cursor:'pointer', transition:'all 0.15s', textAlign:'center' }}>
                                      <div style={{ color:'white', fontWeight:900, fontSize:16 }}>₪{price}</div>
                                      <div style={{ color: active ? 'rgba(255,255,255,0.8)':'rgba(255,255,255,0.3)', fontSize:10 }}>{Math.round(p*100)}%</div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
                            <div>
                              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:5 }}>מחיר (₪)</div>
                              <input type="number" className="input-field" value={bf.price} onChange={e=>setBidForm(p=>({...p,[r.id]:{...bf,price:e.target.value}}))} placeholder="הכנס מחיר" style={{ fontSize:22, fontWeight:900, textAlign:'center' }} />
                            </div>
                            <div>
                              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:5 }}>דקות</div>
                              <input type="number" className="input-field" value={bf.eta} onChange={e=>setBidForm(p=>({...p,[r.id]:{...bf,eta:e.target.value}}))} placeholder="20" style={{ textAlign:'center', fontSize:18 }} />
                            </div>
                          </div>
                          <input className="input-field" value={bf.msg} onChange={e=>setBidForm(p=>({...p,[r.id]:{...bf,msg:e.target.value}}))} placeholder="💬 הודעה קצרה לשולח (אופציונלי)" style={{ marginTop:10, fontSize:13 }} />
                          <button onClick={() => submitBid(r.id)} className="btn-orange" disabled={!bf.price || submitting===r.id} style={{ width:'100%', padding:'14px', fontSize:16, marginTop:12 }}>
                            {submitting===r.id ? '⏳ שולח...' : bf.price ? `🚀 הגש ₪${bf.price}` : 'הגש הצעה'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:14, padding:16, textAlign:'center' }}>
                          <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
                          <div style={{ color:'#10B981', fontWeight:800, fontSize:16 }}>הגשת הצעה: ₪{myBid.price}</div>
                          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginTop:4, marginBottom:12 }}>ממתין לאישור...</div>
                          <button onClick={() => withdrawBid(r.id)} style={{ padding:'8px 20px', borderRadius:10, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.05)', color:'#EF4444', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            משוך הצעה
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── ACTIVE ── */}
        {tab === 'active' && (
          activeBids.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>🚚</div>
              <p style={{ fontSize:16 }}>אין משלוחים פעילים</p>
              <p style={{ fontSize:13, marginTop:8 }}>עבור לשוק המכרזים והגש הצעה</p>
            </div>
          ) : activeBids.map(bid => {
            const r = bid.request;
            const nextCfg = STATUS_NEXT[r.status];
            return (
              <div key={bid.id} className="card" style={{ marginBottom:14, padding:20, border:'1px solid rgba(255,107,53,0.2)', boxShadow:'0 0 30px rgba(255,107,53,0.08)', animation:'fade-up 0.3s ease' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <h3 style={{ color:'white', fontWeight:800, fontSize:18 }}>{r.title}</h3>
                  <div style={{ color:'#10B981', fontWeight:900, fontSize:22 }}>₪{bid.price}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {[{icon:'🟢',t:'איסוף',v:r.pickupAddress},{icon:'🔴',t:'מסירה',v:r.dropoffAddress}].map(x=>(
                    <div key={x.t} style={{ display:'flex', gap:10, color:'rgba(255,255,255,0.6)', fontSize:14 }}>
                      <span>{x.icon}</span><span style={{ color:'rgba(255,255,255,0.35)' }}>{x.t}:</span><span>{x.v}</span>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                <div style={{ display:'flex', gap:6, marginBottom:16 }}>
                  {['assigned','picked_up','in_transit','delivered'].map((s,i) => {
                    const steps = ['assigned','picked_up','in_transit','delivered'];
                    const curr = steps.indexOf(r.status);
                    const done = i <= curr;
                    return <div key={s} style={{ flex:1, height:4, borderRadius:2, background:done?'#FF6B35':'rgba(255,255,255,0.1)', transition:'background 0.3s' }} />;
                  })}
                </div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginBottom:12, textAlign:'center' }}>
                  {['הוקצה לך ✓','נאסף ✓','בדרך 🚀','נמסר 🎉'][['assigned','picked_up','in_transit','delivered'].indexOf(r.status)] || r.status}
                </div>
                {/* Navigation buttons */}
                {r.status !== 'delivered' && (
                  <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                    {(() => {
                      const dest = ['assigned','picked_up'].includes(r.status) ? r.pickupAddress : r.dropoffAddress;
                      const encoded = encodeURIComponent(dest || '');
                      return (
                        <>
                          <a href={`https://waze.com/ul?q=${encoded}&navigate=yes`} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:'10px', borderRadius:12, border:'1px solid rgba(0,214,255,0.2)', background:'rgba(0,214,255,0.05)', color:'#00D6FF', fontWeight:700, fontSize:13, textAlign:'center', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            🗺 Waze
                          </a>
                          <a href={`https://maps.google.com/?q=${encoded}`} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:'10px', borderRadius:12, border:'1px solid rgba(52,168,83,0.2)', background:'rgba(52,168,83,0.05)', color:'#34A853', fontWeight:700, fontSize:13, textAlign:'center', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            📍 Maps
                          </a>
                        </>
                      );
                    })()}
                  </div>
                )}
                {nextCfg && (
                  <button onClick={() => updateStatus(r.id, nextCfg.next)} className="btn-orange" style={{ width:'100%', padding:'14px', fontSize:16 }}>
                    {nextCfg.label}
                  </button>
                )}
                {/* Proof of delivery photo */}
                {r.status === 'in_transit' && (
                  <div style={{ marginTop:8 }}>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(r.id, f); e.target.value=''; }} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={!!uploading} className="btn-orange" style={{ width:'100%', padding:'14px', fontSize:16, background:'linear-gradient(135deg,#10B981,#059669)' }}>
                      {uploading === r.id ? '⏳ מעלה...' : '📸 צלם ואשר מסירה'}
                    </button>
                  </div>
                )}

                {r.status === 'delivered' && (
                  <div style={{ textAlign:'center', padding:'14px 0', color:'#10B981', fontWeight:800, fontSize:18 }}>🎉 נמסר בהצלחה! ₪{bid.price}</div>
                )}

                {r.status === 'delivered' && (
                  <button onClick={() => setReviewTarget({ requestId: r.id, senderId: r.senderId })} style={{ width:'100%', padding:'10px', borderRadius:12, border:'1px solid rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.05)', color:'#F59E0B', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>
                    ⭐ דרג את השולח
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* ── MY BIDS ── */}
        {tab === 'bids' && (
          myBids.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>💰</div>
              <p>עדיין לא הגשת הצעות</p>
            </div>
          ) : myBids.map(bid => {
            const status_cfg = { pending:{c:'#F59E0B',l:'⏳ ממתין'}, accepted:{c:'#10B981',l:'✓ התקבל'}, rejected:{c:'#EF4444',l:'✗ נדחה'} }[bid.status as 'pending'|'accepted'|'rejected'] || {c:'#6B7280',l:bid.status};
            return (
              <div key={bid.id} className="card" style={{ marginBottom:10, padding:16, border:`1px solid ${bid.status==='accepted'?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.06)'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ background:`${status_cfg.c}20`, color:status_cfg.c, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:800 }}>{status_cfg.l}</span>
                  <span style={{ color:'#FF6B35', fontWeight:900, fontSize:20 }}>₪{bid.price}</span>
                </div>
                <div style={{ color:'white', fontWeight:700, fontSize:15, marginBottom:4 }}>{bid.request?.title}</div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginBottom:10 }}>{bid.request?.dropoffAddress}</div>

                {/* הורד מחיר — רק אם הצעה עדיין ממתינה */}
                {bid.status === 'pending' && bid.request?.status !== 'assigned' && (
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8, padding:'10px 12px', background:'rgba(245,158,11,0.05)', borderRadius:12, border:'1px solid rgba(245,158,11,0.15)' }}>
                    <span style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>💸 הורד ל:</span>
                    <input
                      type="number" min="1" placeholder={`מתחת ל-₪${bid.price}`}
                      value={lowerPrices[bid.request?.id||'']||''}
                      onChange={e => setLowerPrices(p=>({...p,[bid.request?.id||'']:e.target.value}))}
                      style={{ flex:1, padding:'8px 12px', borderRadius:10, border:'1px solid rgba(245,158,11,0.3)', background:'rgba(255,255,255,0.05)', color:'white', fontSize:14, outline:'none', fontFamily:'inherit' }}
                    />
                    <button onClick={() => handleLowerBid(bid.request?.id||'')}
                      style={{ padding:'8px 14px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#F59E0B,#EF4444)', color:'white', fontWeight:800, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>
                      הורד 🔥
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>

    {/* Review sender modal */}
    {reviewTarget && (
      <div onClick={() => setReviewTarget(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background:'#141929', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, padding:32, maxWidth:380, width:'90%', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⭐</div>
          <h3 style={{ color:'white', fontWeight:900, fontSize:20, marginBottom:20 }}>דרג את השולח</h3>
          <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:20 }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} onClick={() => setReviewRating(s)} style={{ fontSize:38, cursor:'pointer', color: s <= reviewRating ? '#F59E0B':'rgba(255,255,255,0.15)', transition:'all 0.1s' }}>★</span>
            ))}
          </div>
          <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="הוסף הערה (אופציונלי)..."
            style={{ width:'100%', padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'white', fontSize:14, resize:'none', outline:'none', fontFamily:'inherit', boxSizing:'border-box', minHeight:70 }} />
          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <button onClick={() => setReviewTarget(null)} style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>ביטול</button>
            <button onClick={submitSenderReview} disabled={!reviewRating} style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:reviewRating ? 'linear-gradient(135deg,#F59E0B,#EF4444)':'rgba(255,255,255,0.08)', color:'white', fontWeight:800, cursor:reviewRating?'pointer':'default', fontFamily:'inherit' }}>
              שלח דירוג
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

