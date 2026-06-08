import { useEffect, useState } from 'react';
import { courierApi } from '../services/api';

const VEHICLE_LABEL: Record<string,string> = { scooter:'🛵 קטנוע', car:'🚗 רכב פרטי', van:'🚐 ואן', truck:'🚛 משאית קלה', heavytruck:'🚚 משאית כבדה' };

export default function CourierProfileModal({ courierId, onClose }: { courierId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courierApi.profile(courierId)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [courierId]);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#141929', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, padding:32, maxWidth:440, width:'90%', maxHeight:'85vh', overflowY:'auto' }}>
        {loading && <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,0.4)' }}>טוען...</div>}

        {!loading && !data && <div style={{ textAlign:'center', padding:40, color:'#EF4444' }}>שגיאה בטעינת פרופיל</div>}

        {data && (
          <>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
              <div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:900, color:'white', flexShrink:0 }}>
                {data.avatarUrl ? <img src={data.avatarUrl} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} /> : data.name?.charAt(0)}
              </div>
              <div>
                <div style={{ color:'white', fontWeight:900, fontSize:20 }}>{data.name}</div>
                {data.companyName && <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13 }}>{data.companyName}</div>}
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginTop:2 }}>
                  חבר מאז {new Date(data.createdAt).toLocaleDateString('he-IL', { month:'long', year:'numeric' })}
                </div>
              </div>
              <button onClick={onClose} style={{ marginRight:'auto', background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {[
                { label:'דירוג', value:`${data.avgRating?.toFixed(1)} ⭐`, color:'#F59E0B' },
                { label:'משלוחים', value:data.totalJobs, color:'#10B981' },
                { label:'ביקורות', value:data.reviews?.length || 0, color:'#8B5CF6' },
              ].map(s => (
                <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'14px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.value}</div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Vehicle */}
            {data.vehicle && (
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:14, padding:16, marginBottom:20 }}>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, marginBottom:8 }}>רכב</div>
                <div style={{ color:'white', fontWeight:700, fontSize:16 }}>{VEHICLE_LABEL[data.vehicle.vehicleType]}</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginTop:4 }}>עד {data.vehicle.maxWeightKg?.toLocaleString()} ק"ג</div>
                {data.vehicle.city && <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>📍 {data.vehicle.city}</div>}
              </div>
            )}

            {/* Reviews */}
            {data.reviews?.length > 0 && (
              <div>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:700, marginBottom:12, textTransform:'uppercase', letterSpacing:'0.5px' }}>ביקורות אחרונות</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {data.reviews.map((rev: any) => (
                    <div key={rev.id} style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ color:'white', fontWeight:600, fontSize:14 }}>{rev.reviewer?.name}</span>
                        <span style={{ color:'#F59E0B' }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5-rev.rating)}</span>
                      </div>
                      {rev.text && <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13, fontStyle:'italic' }}>"{rev.text}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.reviews?.length === 0 && (
              <div style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:'20px 0', fontSize:14 }}>עדיין אין ביקורות</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
