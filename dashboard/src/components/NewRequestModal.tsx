import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { reqApi } from '../services/api';

const VEHICLE_SPECS = [
  { type:'scooter',    emoji:'🛵', label:'קטנוע',        maxKg:5,     color:'#FF6B35', desc:'מסמכים, אוכל, מעטפות' },
  { type:'car',        emoji:'🚗', label:'רכב פרטי',     maxKg:50,    color:'#63B3ED', desc:'חבילות, קניות, קרטונים' },
  { type:'van',        emoji:'🚐', label:'רכב מסחרי',    maxKg:500,   color:'#9F7AEA', desc:'ריהוט, משטחים, ארגזים' },
  { type:'truck',      emoji:'🚛', label:'משאית קלה',    maxKg:3500,  color:'#48BB78', desc:'פלטים, מטענים כבדים' },
  { type:'heavytruck', emoji:'🚚', label:'משאית כבדה',   maxKg:99999, color:'#FC8181', desc:'בנייה, תעשייה, מכונות' },
];

const PACKAGE_TYPES = [
  { value:'food',     label:'🍔 אוכל',         icon:'🍔', fields:['bags','keepWarm','refrigerated'] },
  { value:'envelope', label:'✉️ מעטפה/מסמך',   icon:'✉️', fields:['urgent'] },
  { value:'carton',   label:'📦 קרטון',         icon:'📦', fields:['dims','fragile','stack'] },
  { value:'pallet',   label:'🪵 משטח',          icon:'🪵', fields:['dims','palletType'] },
  { value:'sack',     label:'🛍️ שקים / שקיות', icon:'🛍️', fields:['bagCount'] },
  { value:'freight',  label:'🏭 מטען חופשי',    icon:'🏭', fields:['dims','fragile','hazardous'] },
];

const PALLET_SIZES = [
  { label:'ישראלי 100×120', w:100, l:120 },
  { label:'אירופי 80×120',  w:80,  l:120 },
  { label:'אמריקאי 100×100',w:100, l:100 },
];

const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', border:'2px solid #eee', borderRadius:10, fontSize:15, boxSizing:'border-box', outline:'none', background:'white' };
const lbl: React.CSSProperties = { display:'block', marginBottom:5, fontWeight:700, color:'#333', fontSize:13 };
const card = (active:boolean, color='#FF6B35'): React.CSSProperties => ({
  padding:'12px 10px', border:`2px solid ${active ? color:'#eee'}`,
  borderRadius:12, background: active ? `${color}12`:'white',
  cursor:'pointer', transition:'all 0.15s', textAlign:'center' as const,
});

export default function NewRequestModal({ onClose, onCreated }: { onClose:()=>void; onCreated:()=>void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title:'', description:'', packageType:'food',
    weightKg:'', lengthCm:'', widthCm:'', heightCm:'',
    isFragile:false, requiresRefrig:false, isUrgent:false,
    // Food
    bagCount:'1', keepWarm:false,
    // Carton / Pallet
    palletType:'', stackable:false, hazardous:false,
    // Addresses
    pickupAddress:'', pickupContact:'', pickupPhone:'',
    dropoffAddress:'', dropoffContact:'', dropoffPhone:'',
    minBudget:'', maxBudget:'', notes:'',
    requiredVehicle:'', tenderType:'',
    quantity:'1',
  });
  const f = (k:string, v:any) => setForm(p => ({...p,[k]:v}));

  const selectedType = PACKAGE_TYPES.find(p => p.value === form.packageType)!;
  const autoVehicle = () => {
    const kg = parseFloat(form.weightKg)||0;
    if (kg <= 5) return 'scooter'; if (kg <= 50) return 'car';
    if (kg <= 500) return 'van'; if (kg <= 3500) return 'truck';
    return 'heavytruck';
  };
  const effectiveVehicle = form.requiredVehicle || autoVehicle();
  const tenderMap: Record<string,string> = { scooter:'flash', car:'standard', van:'extended', truck:'large', heavytruck:'large' };
  const tenderLabels: Record<string,{label:string;time:string;color:string}> = {
    flash:    { label:'⚡ מכרז מהיר',   time:'3 דקות',    color:'#FF6B35' },
    standard: { label:'📦 מכרז רגיל',   time:'30 דקות',   color:'#63B3ED' },
    extended: { label:'🚐 מכרז מורחב',  time:'2 שעות',    color:'#9F7AEA' },
    large:    { label:'🏭 מכרז גדול',   time:'24 שעות',   color:'#48BB78' },
  };
  const tender = tenderLabels[tenderMap[effectiveVehicle]];

  // Auto title
  const autoTitle = () => {
    if (form.packageType === 'food') return `${form.bagCount} שקיות אוכל`;
    if (form.packageType === 'envelope') return 'מסמכים' + (form.isUrgent ? ' דחופים' : '');
    if (form.packageType === 'carton') return `קרטון ${form.weightKg ? form.weightKg+'ק"ג':''}`.trim();
    if (form.packageType === 'pallet') return `משטח ${form.palletType || ''}`.trim();
    if (form.packageType === 'sack') return `${form.bagCount} שקים`;
    return form.title;
  };

  const handleSubmit = async (e:FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const title = form.title || autoTitle();
      let desc = form.description;
      if (form.packageType === 'food') desc = `${form.bagCount} שקיות אוכל${form.keepWarm ? ' • שמור חם' : ''}${form.requiresRefrig ? ' • קירור' : ''}`;
      if (form.packageType === 'sack') desc = `${form.bagCount} שקים / שקיות`;
      if (form.packageType === 'pallet' && form.palletType) desc = `משטח ${form.palletType}${form.stackable ? ' • ניתן לערום' : ''}`;
      if (form.packageType === 'carton' && form.lengthCm) {
        const vol = Math.round(parseFloat(form.lengthCm) * parseFloat(form.widthCm||'0') * parseFloat(form.heightCm||'0') / 1000);
        desc = `${form.lengthCm}×${form.widthCm}×${form.heightCm} ס"מ${vol > 0 ? ` (${vol} ליטר)` : ''}${form.isFragile ? ' • שביר' : ''}`;
      }
      await reqApi.create({
        ...form, title, description: desc,
        weightKg: parseFloat(form.weightKg)||0.5,
        lengthCm: parseFloat(form.lengthCm)||undefined,
        widthCm:  parseFloat(form.widthCm)||undefined,
        heightCm: parseFloat(form.heightCm)||undefined,
        minBudget:parseFloat(form.minBudget)||undefined,
        maxBudget:parseFloat(form.maxBudget)||undefined,
        requiredVehicle: effectiveVehicle,
        tenderType: tenderMap[effectiveVehicle],
        notes: form.notes || (form.bagCount > '1' ? `כמות: ${form.bagCount}` : ''),
      });
      onCreated(); onClose();
    } catch(e:any) { alert(e.response?.data?.message||'שגיאה'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:12 }}>
      <div style={{ background:'white', borderRadius:24, width:'100%', maxWidth:620, maxHeight:'94vh', overflowY:'auto', boxShadow:'0 30px 80px rgba(0,0,0,0.3)' }}>
        {/* Colorful header */}
        <div style={{ background:'linear-gradient(135deg,#FF6B35 0%,#FF4444 50%,#9F7AEA 100%)', padding:'24px 28px', borderRadius:'24px 24px 0 0', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ margin:0, fontWeight:900, fontSize:24 }}>🚀 משלוח חדש</h2>
            <p style={{ margin:'4px 0 0', opacity:0.85, fontSize:13 }}>שלב {step} מ-3 • {['פרטי המשלוח','כתובות','תקציב'][step-1]}</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', width:36, height:36, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={18} color="white"/></button>
        </div>

        {/* Step dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:10, padding:'16px 0 8px', background:'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
          {[1,2,3].map(i => (
            <div key={i} onClick={() => i < step && setStep(i)} style={{ width: i===step ? 32:10, height:10, borderRadius:20, background: i===step ? '#FF6B35': i<step ? '#48BB78':'#ddd', transition:'all 0.3s', cursor: i < step ? 'pointer':'default' }} />
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ padding:'20px 28px 28px', direction:'rtl' }}>

          {/* ═══ STEP 1 ═══ */}
          {step === 1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

              {/* Package type selector */}
              <div>
                <label style={{ ...lbl, fontSize:15, color:'#111' }}>סוג המשלוח</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {PACKAGE_TYPES.map(pt => (
                    <button key={pt.value} type="button" onClick={() => f('packageType',pt.value)} style={card(form.packageType===pt.value)}>
                      <div style={{ fontSize:28, marginBottom:4 }}>{pt.icon}</div>
                      <div style={{ fontSize:12, fontWeight:700, color: form.packageType===pt.value ? '#FF6B35':'#444' }}>{pt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* FOOD specific */}
              {form.packageType === 'food' && (
                <div style={{ background:'linear-gradient(135deg,#FF6B3510,#FF444410)', border:'2px solid #FF6B3530', borderRadius:16, padding:18 }}>
                  <p style={{ margin:'0 0 14px', fontWeight:800, fontSize:15, color:'#FF6B35' }}>🍔 פרטי הזמנת אוכל</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={lbl}>מספר שקיות / פריטים</label>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <button type="button" onClick={() => f('bagCount', String(Math.max(1,parseInt(form.bagCount||'1')-1)))} style={{ width:36, height:36, borderRadius:10, border:'2px solid #eee', background:'white', cursor:'pointer', fontSize:18, fontWeight:700 }}>-</button>
                        <input type="number" min="1" value={form.bagCount} onChange={e=>f('bagCount',e.target.value)} style={{ ...inp, textAlign:'center', fontWeight:900, fontSize:20, width:60 }} />
                        <button type="button" onClick={() => f('bagCount', String(parseInt(form.bagCount||'1')+1))} style={{ width:36, height:36, borderRadius:10, border:'2px solid #FF6B35', background:'#FF6B35', cursor:'pointer', fontSize:18, fontWeight:700, color:'white' }}>+</button>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>משקל משוערך (ק"ג)</label>
                      <input type="number" step="0.1" value={form.weightKg} onChange={e=>f('weightKg',e.target.value)} placeholder="2.5" style={inp} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:12 }}>
                    {[['keepWarm','🔥 שמור חם'],['requiresRefrig','❄️ קירור'],['isUrgent','⚡ דחוף']].map(([k,l]) => (
                      <label key={k} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', padding:'8px 14px', borderRadius:20, border:`2px solid ${(form as any)[k] ? '#FF6B35':'#eee'}`, background:(form as any)[k] ? '#FF6B3510':'white', fontWeight:700, fontSize:13, color:(form as any)[k] ? '#FF6B35':'#666' }}>
                        <input type="checkbox" checked={(form as any)[k]} onChange={e=>f(k,e.target.checked)} style={{ display:'none' }} />
                        {l}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop:12 }}>
                    <label style={lbl}>תיאור (אופציונלי)</label>
                    <input value={form.description} onChange={e=>f('description',e.target.value)} placeholder="לדוגמה: 3 פיצות + משקאות" style={inp} />
                  </div>
                </div>
              )}

              {/* CARTON specific */}
              {form.packageType === 'carton' && (
                <div style={{ background:'linear-gradient(135deg,#63B3ED10,#3182CE10)', border:'2px solid #63B3ED40', borderRadius:16, padding:18 }}>
                  <p style={{ margin:'0 0 14px', fontWeight:800, fontSize:15, color:'#3182CE' }}>📦 מידות קרטון</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={lbl}>משקל (ק"ג) *</label>
                      <input type="number" step="0.1" value={form.weightKg} onChange={e=>f('weightKg',e.target.value)} required placeholder="5" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>כמות קרטונים</label>
                      <input type="number" min="1" value={form.quantity} onChange={e=>f('quantity',e.target.value)} placeholder="1" style={inp} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                    {[['lengthCm','אורך','ס"מ'],['widthCm','רוחב','ס"מ'],['heightCm','גובה','ס"מ']].map(([k,label,unit]) => (
                      <div key={k}>
                        <label style={lbl}>{label} ({unit})</label>
                        <input type="number" value={(form as any)[k]} onChange={e=>f(k,e.target.value)} placeholder="40" style={inp} />
                      </div>
                    ))}
                  </div>
                  {/* Volume calculator */}
                  {form.lengthCm && form.widthCm && form.heightCm && (
                    <div style={{ background:'white', borderRadius:10, padding:12, textAlign:'center', border:'2px solid #63B3ED' }}>
                      <span style={{ color:'#3182CE', fontWeight:800, fontSize:16 }}>
                        📐 נפח: {Math.round(parseFloat(form.lengthCm)*parseFloat(form.widthCm)*parseFloat(form.heightCm)/1000)} ליטר
                        {' '}({form.lengthCm}×{form.widthCm}×{form.heightCm} ס"מ)
                      </span>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:10, marginTop:12 }}>
                    {[['isFragile','🔴 שביר'],['stackable','📚 ניתן לערום'],['isUrgent','⚡ דחוף']].map(([k,l]) => (
                      <label key={k} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', padding:'8px 12px', borderRadius:20, border:`2px solid ${(form as any)[k] ? '#3182CE':'#eee'}`, background:(form as any)[k] ? '#63B3ED20':'white', fontWeight:700, fontSize:13, color:(form as any)[k] ? '#3182CE':'#666' }}>
                        <input type="checkbox" checked={(form as any)[k]} onChange={e=>f(k,e.target.checked)} style={{ display:'none' }} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* PALLET specific */}
              {form.packageType === 'pallet' && (
                <div style={{ background:'linear-gradient(135deg,#48BB7810,#38A16910)', border:'2px solid #48BB7840', borderRadius:16, padding:18 }}>
                  <p style={{ margin:'0 0 14px', fontWeight:800, fontSize:15, color:'#2F855A' }}>🪵 פרטי משטח</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={lbl}>משקל כולל (ק"ג) *</label>
                      <input type="number" value={form.weightKg} onChange={e=>f('weightKg',e.target.value)} required placeholder="200" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>מספר משטחים</label>
                      <input type="number" min="1" value={form.quantity} onChange={e=>f('quantity',e.target.value)} placeholder="1" style={inp} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>סוג משטח (מידה)</label>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {PALLET_SIZES.map(ps => (
                        <button key={ps.label} type="button" onClick={() => { f('palletType',ps.label); f('lengthCm',String(ps.l)); f('widthCm',String(ps.w)); }} style={{ padding:'10px 14px', borderRadius:10, border:`2px solid ${form.palletType===ps.label ? '#48BB78':'#eee'}`, background: form.palletType===ps.label ? '#48BB7820':'white', cursor:'pointer', fontWeight:700, fontSize:13, color: form.palletType===ps.label ? '#2F855A':'#555' }}>
                          {ps.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop:12 }}>
                    <label style={lbl}>גובה מטען (ס"מ)</label>
                    <input type="number" value={form.heightCm} onChange={e=>f('heightCm',e.target.value)} placeholder="120" style={inp} />
                  </div>
                  {form.lengthCm && form.widthCm && form.heightCm && (
                    <div style={{ background:'white', borderRadius:10, padding:12, textAlign:'center', border:'2px solid #48BB78', marginTop:12 }}>
                      <span style={{ color:'#2F855A', fontWeight:800 }}>
                        📐 נפח: {Math.round(parseFloat(form.lengthCm)*parseFloat(form.widthCm)*parseFloat(form.heightCm)/1000000)} מ"ק
                        {' '}({form.palletType || `${form.lengthCm}×${form.widthCm}`}×{form.heightCm} ס"מ)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* SACK specific */}
              {form.packageType === 'sack' && (
                <div style={{ background:'linear-gradient(135deg,#9F7AEA10,#6B46C110)', border:'2px solid #9F7AEA40', borderRadius:16, padding:18 }}>
                  <p style={{ margin:'0 0 14px', fontWeight:800, fontSize:15, color:'#553C9A' }}>🛍️ שקים / שקיות</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={lbl}>מספר שקים/שקיות *</label>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <button type="button" onClick={() => f('bagCount', String(Math.max(1,parseInt(form.bagCount||'1')-1)))} style={{ width:36,height:36,borderRadius:10,border:'2px solid #eee',background:'white',cursor:'pointer',fontSize:18,fontWeight:700 }}>-</button>
                        <input type="number" min="1" value={form.bagCount} onChange={e=>f('bagCount',e.target.value)} style={{ ...inp,textAlign:'center',fontWeight:900,fontSize:20,width:70 }} />
                        <button type="button" onClick={() => f('bagCount', String(parseInt(form.bagCount||'1')+1))} style={{ width:36,height:36,borderRadius:10,border:'2px solid #9F7AEA',background:'#9F7AEA',cursor:'pointer',fontSize:18,fontWeight:700,color:'white' }}>+</button>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>משקל כולל (ק"ג) *</label>
                      <input type="number" step="0.5" value={form.weightKg} onChange={e=>f('weightKg',e.target.value)} required placeholder="10" style={inp} />
                    </div>
                  </div>
                </div>
              )}

              {/* ENVELOPE specific */}
              {form.packageType === 'envelope' && (
                <div style={{ background:'linear-gradient(135deg,#F6AD5510,#DD6B2010)', border:'2px solid #F6AD5540', borderRadius:16, padding:18 }}>
                  <p style={{ margin:'0 0 14px', fontWeight:800, fontSize:15, color:'#C05621' }}>✉️ מעטפה / מסמכים</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={lbl}>משקל (גרם)</label>
                      <input type="number" value={form.weightKg} onChange={e=>f('weightKg',e.target.value)} placeholder="0.2" step="0.05" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>כמות מעטפות</label>
                      <input type="number" min="1" value={form.quantity} onChange={e=>f('quantity',e.target.value)} placeholder="1" style={inp} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:12 }}>
                    {[['isUrgent','⚡ דחוף!'],['isFragile','📄 רגיש']].map(([k,l]) => (
                      <label key={k} style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'10px 18px',borderRadius:20,border:`2px solid ${(form as any)[k] ? '#C05621':'#eee'}`,background:(form as any)[k] ? '#F6AD5520':'white',fontWeight:700,fontSize:14,color:(form as any)[k] ? '#C05621':'#666' }}>
                        <input type="checkbox" checked={(form as any)[k]} onChange={e=>f(k,e.target.checked)} style={{ display:'none' }}/>
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* FREIGHT specific */}
              {form.packageType === 'freight' && (
                <div style={{ background:'linear-gradient(135deg,#FC818110,#E53E3E10)', border:'2px solid #FC818140', borderRadius:16, padding:18 }}>
                  <p style={{ margin:'0 0 14px', fontWeight:800, fontSize:15, color:'#C53030' }}>🏭 מטען חופשי</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <label style={lbl}>משקל (ק"ג) *</label>
                      <input type="number" value={form.weightKg} onChange={e=>f('weightKg',e.target.value)} required placeholder="500" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>כמות יחידות</label>
                      <input type="number" value={form.quantity} onChange={e=>f('quantity',e.target.value)} placeholder="1" style={inp} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    {[['lengthCm','אורך'],['widthCm','רוחב'],['heightCm','גובה']].map(([k,label]) => (
                      <div key={k}>
                        <label style={lbl}>{label} (ס"מ)</label>
                        <input type="number" value={(form as any)[k]} onChange={e=>f(k,e.target.value)} style={inp} />
                      </div>
                    ))}
                  </div>
                  {form.lengthCm && form.widthCm && form.heightCm && (
                    <div style={{ background:'white',borderRadius:10,padding:12,textAlign:'center',border:'2px solid #FC8181',marginTop:10 }}>
                      <span style={{ color:'#C53030',fontWeight:800 }}>
                        📐 {Math.round(parseFloat(form.lengthCm)*parseFloat(form.widthCm)*parseFloat(form.heightCm)/1000000*10)/10} מ"ק
                      </span>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:10, marginTop:12 }}>
                    {[['isFragile','⚠️ שביר'],['hazardous','☢️ חומ"ס']].map(([k,l]) => (
                      <label key={k} style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'8px 14px',borderRadius:20,border:`2px solid ${(form as any)[k]?'#C53030':'#eee'}`,background:(form as any)[k]?'#FC818120':'white',fontWeight:700,fontSize:13,color:(form as any)[k]?'#C53030':'#666' }}>
                        <input type="checkbox" checked={(form as any)[k]} onChange={e=>f(k,e.target.checked)} style={{ display:'none' }}/>
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle selector */}
              <div>
                <label style={{ ...lbl, fontSize:14 }}>רכב נדרש {!form.weightKg ? '(ייקבע אוטומטית לפי משקל)' : ''}</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                  {VEHICLE_SPECS.map(v => (
                    <button key={v.type} type="button" onClick={() => f('requiredVehicle', form.requiredVehicle===v.type ? '':v.type)} style={{ ...card(effectiveVehicle===v.type, v.color), padding:'10px 6px' }}>
                      <div style={{ fontSize:22 }}>{v.emoji}</div>
                      <div style={{ fontSize:11, fontWeight:700, color: effectiveVehicle===v.type ? v.color:'#555', marginTop:2 }}>{v.label}</div>
                      <div style={{ fontSize:10, color:'#999' }}>≤{v.maxKg > 9999 ? '∞' : v.maxKg+'ק"ג'}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tender preview */}
              {(form.weightKg || form.packageType==='envelope' || form.packageType==='food') && (
                <div style={{ background:`linear-gradient(135deg,${tender.color}20,${tender.color}05)`, border:`2px solid ${tender.color}50`, borderRadius:14, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ color:tender.color, fontWeight:800, fontSize:16 }}>{tender.label}</div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'#333' }}>זמן מכרז: {tender.time}</div>
                    <div style={{ fontSize:12, color:'#888' }}>אחרי הזמן — ההצעה הטובה ביותר מנצחת אוטומטית</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Addresses ═══ */}
          {step === 2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[
                { key:'pickup', icon:'🟢', label:'כתובת איסוף', color:'#48BB78' },
                { key:'dropoff', icon:'🔴', label:'כתובת מסירה', color:'#FC8181' },
              ].map(({ key, icon, label, color }) => (
                <div key={key} style={{ background:'#fafafa', borderRadius:14, padding:18, border:`2px solid ${color}30` }}>
                  <p style={{ margin:'0 0 14px', fontWeight:800, fontSize:15, color }}>{icon} {label}</p>
                  <input value={(form as any)[`${key}Address`]} onChange={e=>f(`${key}Address`,e.target.value)} required placeholder="עיר, רחוב ומספר בית" style={{ ...inp, marginBottom:10 }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <input value={(form as any)[`${key}Contact`]} onChange={e=>f(`${key}Contact`,e.target.value)} placeholder="שם איש קשר" style={inp} />
                    <input value={(form as any)[`${key}Phone`]} onChange={e=>f(`${key}Phone`,e.target.value)} placeholder="טלפון" type="tel" style={inp} />
                  </div>
                </div>
              ))}
              <div>
                <label style={lbl}>הערות לשליח</label>
                <textarea value={form.notes} onChange={e=>f('notes',e.target.value)} rows={2} placeholder="לדוגמה: קומה 3, ליד הכניסה הימנית" style={{ ...inp, resize:'none' }} />
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Budget ═══ */}
          {step === 3 && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:'linear-gradient(135deg,#1a1a2e,#0f3460)', borderRadius:18, padding:22, color:'white' }}>
                <p style={{ margin:'0 0 16px', fontWeight:900, fontSize:17 }}>📋 סיכום המשלוח</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:14 }}>
                  {[
                    ['📦 סוג', selectedType?.label],
                    ['⚖️ משקל', `${form.weightKg||'?'} ק"ג`],
                    form.packageType==='food' ? ['🛍️ שקיות', form.bagCount] : null,
                    form.packageType==='sack' ? ['🛍️ שקים', form.bagCount] : null,
                    form.packageType==='carton' && form.lengthCm ? ['📐 נפח', `${Math.round(parseFloat(form.lengthCm||'0')*parseFloat(form.widthCm||'0')*parseFloat(form.heightCm||'0')/1000)} ליטר`] : null,
                    form.packageType==='pallet' && form.palletType ? ['🪵 סוג משטח', form.palletType] : null,
                    ['🚗 רכב', `${VEHICLE_SPECS.find(v=>v.type===effectiveVehicle)?.emoji} ${VEHICLE_SPECS.find(v=>v.type===effectiveVehicle)?.label}`],
                    ['📍 מאיפה', form.pickupAddress.split(',')[0]||'—'],
                    ['📍 לאן', form.dropoffAddress.split(',')[0]||'—'],
                  ].filter(Boolean).map((row, i) => row && (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', paddingBottom:8, borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ color:'rgba(255,255,255,0.6)' }}>{row[0]}</span>
                      <span style={{ fontWeight:700 }}>{row[1]}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', paddingTop:4 }}>
                    <span style={{ color:'rgba(255,255,255,0.6)' }}>⏱️ מכרז</span>
                    <span style={{ color:tender.color, fontWeight:800, fontSize:15 }}>{tender.label} ({tender.time})</span>
                  </div>
                </div>
              </div>

              <div style={{ background:'#fafafa', borderRadius:14, padding:18 }}>
                <p style={{ margin:'0 0 14px', fontWeight:800, fontSize:15, color:'#333' }}>💰 תקציב מצופה (אופציונלי)</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div><label style={lbl}>מינימום (₪)</label><input type="number" value={form.minBudget} onChange={e=>f('minBudget',e.target.value)} placeholder="20" style={inp} /></div>
                  <div><label style={lbl}>מקסימום (₪)</label><input type="number" value={form.maxBudget} onChange={e=>f('maxBudget',e.target.value)} placeholder="80" style={inp} /></div>
                </div>
                {/* Quick budget presets */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {[['20–40','20','40'],['40–80','40','80'],['80–150','80','150'],['150–300','150','300'],['300–600','300','600']].map(([l,mn,mx]) => (
                    <button key={l} type="button" onClick={() => { f('minBudget',mn); f('maxBudget',mx); }} style={{ padding:'7px 14px', borderRadius:20, border:`2px solid ${form.minBudget===mn ? '#FF6B35':'#eee'}`, background: form.minBudget===mn ? '#FF6B3510':'white', fontWeight:700, cursor:'pointer', fontSize:13, color: form.minBudget===mn ? '#FF6B35':'#555' }}>
                      ₪{l}
                    </button>
                  ))}
                </div>
                <p style={{ margin:'10px 0 0', color:'#aaa', fontSize:12 }}>💡 ללא תקציב — שליחים יציעו מחיר חופשי</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display:'flex', gap:10, marginTop:22 }}>
            {step < 3
              ? <button type="button" onClick={() => setStep(s=>s+1)} style={{ flex:1, padding:'15px', background:'linear-gradient(135deg,#FF6B35,#FF4444)', color:'white', border:'none', borderRadius:14, fontSize:16, fontWeight:900, cursor:'pointer', boxShadow:'0 4px 20px rgba(255,107,53,0.4)' }}>המשך ←</button>
              : <button type="submit" disabled={loading} style={{ flex:1, padding:'15px', background:'linear-gradient(135deg,#FF6B35,#FF4444)', color:'white', border:'none', borderRadius:14, fontSize:16, fontWeight:900, cursor:'pointer', opacity:loading?0.7:1, boxShadow:'0 4px 20px rgba(255,107,53,0.4)' }}>
                  {loading ? '⏳ שולח...' : '🚀 פרסם מכרז עכשיו!'}
                </button>
            }
            {step > 1 && <button type="button" onClick={() => setStep(s=>s-1)} style={{ flex:0.35, padding:'15px', background:'#f0f0f0', border:'none', borderRadius:14, fontSize:15, cursor:'pointer', fontWeight:700, color:'#555' }}>← חזור</button>}
            {step === 1 && <button type="button" onClick={onClose} style={{ flex:0.35, padding:'15px', background:'#f0f0f0', border:'none', borderRadius:14, fontSize:15, cursor:'pointer', fontWeight:700, color:'#555' }}>ביטול</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
