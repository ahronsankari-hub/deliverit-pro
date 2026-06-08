import { useState } from 'react';
import { reqApi, paymentApi } from '../services/api';
import ReviewModal from './ReviewModal';
import CourierProfileModal from './CourierProfileModal';

const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  open:      { label:'פתוח',    color:'#F59E0B', bg:'rgba(245,158,11,0.15)' },
  bidding:   { label:'מתמודדים', color:'#3B82F6', bg:'rgba(59,130,246,0.15)' },
  assigned:  { label:'הוקצה',   color:'#8B5CF6', bg:'rgba(139,92,246,0.15)' },
  picked_up: { label:'נאסף',    color:'#06B6D4', bg:'rgba(6,182,212,0.15)' },
  in_transit:{ label:'בדרך 🔥', color:'#10B981', bg:'rgba(16,185,129,0.15)' },
  delivered: { label:'נמסר ✓',  color:'#10B981', bg:'rgba(16,185,129,0.1)' },
  cancelled: { label:'בוטל',    color:'#6B7280', bg:'rgba(107,114,128,0.1)' },
};

const VEHICLE_EMOJI: Record<string,string> = { scooter:'🛵', car:'🚗', van:'🚐', truck:'🚛', heavytruck:'🚚' };

function Countdown({ endsAt, ticker }: { endsAt: string; ticker: number }) {
  void ticker;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return <span style={{ color:'#EF4444', fontWeight:800, fontSize:13 }}>פג!</span>;
  const m = Math.floor(diff/60000), s = Math.floor((diff%60000)/1000);
  const urgent = diff < 120000;
  const text = m > 60 ? `${Math.floor(m/60)}ש' ${m%60}ד'` : `${m}:${String(s).padStart(2,'0')}`;
  return (
    <span style={{ color: urgent ? '#EF4444':'#10B981', fontWeight:800, fontSize:13, animation: urgent ? 'countdown-pulse 1s infinite':'' }}>
      {urgent ? '🔴 ' : '⏱ '}{text}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color:'#F59E0B', fontSize:12 }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5-Math.round(rating))} {rating.toFixed(1)}
    </span>
  );
}

export default function RequestCard({ request: r, meta, onRefresh, ticker }: any) {
  const [open, setOpen] = useState(false);
  const [accepting, setAccepting] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [viewCourierId, setViewCourierId] = useState<string|null>(null);
  const [paying, setPaying] = useState(false);

  const downloadInvoice = () => {
    const token = localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/requests/${r.id}/invoice`;
    // Open in new tab with auth header via fetch→blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `invoice_${r.trackingCode || r.id}.pdf`;
        a.click();
      });
  };

  const startPayment = async () => {
    setPaying(true);
    try {
      const { data } = await paymentApi.checkout(r.id);
      window.location.href = data.url;
    } catch (e: any) { alert(e.response?.data?.message || 'שגיאה בתשלום'); }
    finally { setPaying(false); }
  };

  const shareTracking = () => {
    const url = `${window.location.origin.replace('3004','3003')}?code=${r.trackingCode}`;
    navigator.clipboard.writeText(url).then(() => alert(`לינק מעקב הועתק!\n${url}`));
  };
  const cfg = STATUS_CFG[r.status] || STATUS_CFG.open;

  const handleAccept = async (bidId: string) => {
    setAccepting(bidId);
    try { await reqApi.acceptBid(bidId); onRefresh(); }
    catch (e: any) { alert(e.response?.data?.message || 'שגיאה'); }
    finally { setAccepting(''); }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try { await reqApi.cancel(r.id); onRefresh(); }
    catch (e: any) { alert(e.response?.data?.message || 'שגיאה'); }
    finally { setCancelling(false); setShowCancelConfirm(false); }
  };

  const isBidding = ['open','bidding'].includes(r.status);
  const sortedBids = [...(r.bids||[])].sort((a:any,b:any) => a.price - b.price);

  return (
    <>
    <div style={{ background: open ? 'rgba(255,255,255,0.06)':'rgba(255,255,255,0.03)', border:`1px solid ${open ? 'rgba(255,107,53,0.3)':'rgba(255,255,255,0.07)'}`, borderRadius:20, overflow:'hidden', transition:'all 0.2s', cursor:'pointer' }}
      onMouseEnter={e => !open && ((e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.05)')}
      onMouseLeave={e => !open && ((e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)')}
    >
      {/* Flash banner */}
      {r.tenderType === 'flash' && isBidding && (
        <div style={{ background:'linear-gradient(90deg,#FF6B35,#FF4444,#FF6B35)', backgroundSize:'200% auto', animation:'shimmer 2s linear infinite', padding:'6px 20px', fontSize:12, fontWeight:700, color:'white', display:'flex', alignItems:'center', gap:8 }}>
          <span>⚡</span> מכרז מהיר — שליחים מתחרים עכשיו!
          {r.biddingEndsAt && <span style={{ marginRight:'auto', background:'rgba(0,0,0,0.2)', padding:'2px 10px', borderRadius:20 }}>נסגר בעוד <Countdown endsAt={r.biddingEndsAt} ticker={ticker} /></span>}
        </div>
      )}

      {/* Main row */}
      <div onClick={() => setOpen(!open)} style={{ padding:'18px 22px', display:'flex', alignItems:'center', gap:16 }}>
        {/* Left: type icon */}
        <div style={{ width:48, height:48, borderRadius:14, background:`${meta?.color}20`, border:`1px solid ${meta?.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
          {r.tenderType==='flash'?'⚡':r.tenderType==='standard'?'📦':r.tenderType==='extended'?'🚐':'🏭'}
        </div>

        {/* Center: info */}
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <span style={{ color:'white', fontWeight:700, fontSize:16 }}>{r.title}</span>
            <span style={{ background:cfg.bg, color:cfg.color, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{cfg.label}</span>
            <span style={{ background:`${meta?.color}15`, color:meta?.color, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{meta?.emoji} {meta?.label}</span>
            <span style={{ fontSize:16 }}>{VEHICLE_EMOJI[r.requiredVehicle]}</span>
          </div>
          <div style={{ display:'flex', gap:16, fontSize:12, color:'rgba(255,255,255,0.4)', alignItems:'center' }}>
            <span>📍 {r.pickupAddress?.split(',')[0]} → {r.dropoffAddress?.split(',')[0]}</span>
            <span>⚖️ {r.weightKg} ק"ג</span>
            {r.description && <span style={{ color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>{r.description}</span>}
          </div>
        </div>

        {/* Right: countdown + bids */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
          {isBidding && r.biddingEndsAt && r.tenderType !== 'flash' && (
            <Countdown endsAt={r.biddingEndsAt} ticker={ticker} />
          )}
          {sortedBids.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ color:'#F59E0B', fontWeight:800, fontSize:16 }}>₪{sortedBids[0]?.price}</span>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>הצעה הכי טובה</span>
              <span style={{ background:'rgba(139,92,246,0.2)', color:'#A78BFA', padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>{sortedBids.length} הצעות</span>
            </div>
          )}
          {r.maxBudget && sortedBids.length === 0 && <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>עד ₪{r.maxBudget}</span>}
          <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11, fontFamily:'monospace' }}>{r.trackingCode}</span>
          <button onClick={e => { e.stopPropagation(); shareTracking(); }} title="שתף לינק מעקב לנמען" style={{ padding:'4px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            🔗 שתף מעקב
          </button>
          {['open','bidding'].includes(r.status) && (
            <button onClick={e => { e.stopPropagation(); setShowCancelConfirm(true); }} style={{ padding:'4px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.05)', color:'#EF4444', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              ✕ בטל
            </button>
          )}
        </div>

        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:20, marginRight:4, transition:'transform 0.2s', transform: open ? 'rotate(180deg)':'' }}>‹</div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding:'0 22px 22px', borderTop:'1px solid rgba(255,255,255,0.06)', animation:'fade-up 0.2s ease' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, margin:'16px 0' }}>
            {[{icon:'🟢',label:'איסוף',val:r.pickupAddress},{icon:'🔴',label:'מסירה',val:r.dropoffAddress}].map(x => (
              <div key={x.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:14 }}>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:4, fontWeight:600 }}>{x.icon} {x.label}</div>
                <div style={{ color:'rgba(255,255,255,0.9)', fontSize:14 }}>{x.val}</div>
              </div>
            ))}
          </div>

          {/* Bids list */}
          {sortedBids.length > 0 && (
            <div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:700, marginBottom:12, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                💰 {sortedBids.length} הצעות — מסודרות לפי מחיר
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {sortedBids.map((bid: any, i: number) => (
                  <div key={bid.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:14, background: bid.status==='accepted' ? 'rgba(16,185,129,0.1)' : i===0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${bid.status==='accepted' ? 'rgba(16,185,129,0.3)' : i===0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`, transition:'all 0.2s' }}>
                    {/* Rank */}
                    <div style={{ width:28, height:28, borderRadius:'50%', background: i===0 ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color: i===0 ? 'white':'rgba(255,255,255,0.3)', flexShrink:0 }}>
                      {i===0 ? '🏆' : i+1}
                    </div>

                    {/* Price — big */}
                    <div style={{ minWidth:70 }}>
                      <div style={{ fontSize:22, fontWeight:900, color: bid.status==='accepted' ? '#10B981' : i===0 ? '#F59E0B' : 'white' }}>₪{bid.price}</div>
                      {bid.estimatedMinutes && <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>~{bid.estimatedMinutes} דק'</div>}
                    </div>

                    {/* Courier info */}
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${['#FF6B35','#3B82F6','#8B5CF6','#10B981','#F59E0B'][i%5]},${['#FF4444','#6366F1','#A78BFA','#059669','#EF4444'][i%5]})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'white' }}>
                          {bid.courier?.name?.charAt(0)}
                        </div>
                        <div>
                          <div onClick={() => bid.courier?.id && setViewCourierId(bid.courier.id)} style={{ color:'white', fontWeight:600, fontSize:14, cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>{bid.courier?.name}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <StarRating rating={bid.courier?.avgRating||5} />
                            <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>{bid.courier?.totalJobs} משלוחים</span>
                            <span style={{ fontSize:14 }}>{bid.vehicleType==='scooter'?'🛵':bid.vehicleType==='car'?'🚗':bid.vehicleType==='van'?'🚐':'🚛'}</span>
                          </div>
                        </div>
                      </div>
                      {bid.message && <div style={{ marginTop:6, color:'rgba(255,255,255,0.4)', fontSize:12, fontStyle:'italic' }}>"{bid.message}"</div>}
                    </div>

                    {/* Action */}
                    {bid.status === 'accepted' ? (
                      <div style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#10B981', padding:'8px 18px', borderRadius:10, fontWeight:700, fontSize:14 }}>✓ התקבל</div>
                    ) : r.status === 'bidding' ? (
                      <button onClick={() => handleAccept(bid.id)} disabled={!!accepting} className="btn-primary" style={{ padding:'10px 20px', fontSize:14, opacity:accepting ? 0.7:1 }}>
                        {accepting === bid.id ? '...' : '✓ קבל הצעה'}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment + Invoice actions */}
          {['assigned','in_progress'].includes(r.status) && r.acceptedPrice && r.paymentStatus !== 'paid' && (
            <div style={{ marginTop:16, padding:'16px', borderRadius:14, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', gap:16 }}>
              <div>
                <div style={{ color:'white', fontWeight:700, fontSize:15 }}>מחיר מאושר: <span style={{ color:'#F59E0B' }}>₪{r.acceptedPrice}</span></div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>ניתן לשלם עכשיו בצורה מאובטחת</div>
              </div>
              <button onClick={startPayment} disabled={paying} style={{ marginRight:'auto', padding:'10px 22px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#10B981,#059669)', color:'white', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit', opacity:paying?0.7:1 }}>
                {paying ? '...' : '💳 שלם עכשיו'}
              </button>
            </div>
          )}
          {r.paymentStatus === 'paid' && (
            <div style={{ marginTop:16, padding:'10px 16px', borderRadius:12, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ color:'#10B981', fontWeight:700 }}>✓ שולם</span>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>₪{r.acceptedPrice}</span>
              <button onClick={downloadInvoice} style={{ marginRight:'auto', padding:'7px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                📄 הורד חשבונית
              </button>
            </div>
          )}
          {r.status === 'delivered' && (
            <div style={{ marginTop:8, display:'flex', justifyContent:'flex-end' }}>
              <button onClick={downloadInvoice} style={{ padding:'8px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                📄 הורד חשבונית PDF
              </button>
            </div>
          )}

          {/* Review button after delivery */}
          {r.status === 'delivered' && !reviewed && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button onClick={() => setShowReview(true)} style={{ padding: '12px 28px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#F59E0B,#EF4444)', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                ⭐ דרג את השליח
              </button>
            </div>
          )}
          {r.status === 'delivered' && reviewed && (
            <div style={{ marginTop: 16, textAlign: 'center', color: '#10B981', fontWeight: 700 }}>✓ תודה על הדירוג!</div>
          )}

          {sortedBids.length === 0 && isBidding && (
            <div style={{ textAlign:'center', padding:'24px 0', color:'rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
              <p style={{ fontSize:14 }}>ממתין להצעות שליחים...</p>
            </div>
          )}
        </div>
      )}
    </div>

    {viewCourierId && <CourierProfileModal courierId={viewCourierId} onClose={() => setViewCourierId(null)} />}
    {showReview && <ReviewModal request={r} onClose={() => setShowReview(false)} onDone={() => { setShowReview(false); setReviewed(true); }} />}

    {/* Cancel confirm modal */}
    {showCancelConfirm && (
      <div onClick={() => setShowCancelConfirm(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background:'#141929', border:'1px solid rgba(239,68,68,0.3)', borderRadius:20, padding:32, maxWidth:360, width:'90%', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
          <h3 style={{ color:'white', fontWeight:800, fontSize:18, marginBottom:8 }}>לבטל את המכרז?</h3>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:24 }}>כל ההצעות שהתקבלו יידחו ולא ניתן לבטל פעולה זו</p>
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={() => setShowCancelConfirm(false)} style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.6)', fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'inherit' }}>
              חזור
            </button>
            <button onClick={handleCancel} disabled={cancelling} style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#EF4444,#DC2626)', color:'white', fontWeight:800, cursor:'pointer', fontSize:14, fontFamily:'inherit', opacity:cancelling?0.7:1 }}>
              {cancelling ? 'מבטל...' : 'כן, בטל מכרז'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
