/** Renders cargo-specific detail chips based on cargoType + cargoDetails */

const CHIP_STYLE = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
  background: `${color}20`, color, border: `1px solid ${color}30`,
  whiteSpace: 'nowrap' as const,
});

export function CargoChips({ request }: { request: any }) {
  const d = request.cargoDetails || {};
  const chips: { label: string; color: string }[] = [];

  // ── Food ──────────────────────────────────────────────────────────
  if (request.cargoType === 'food') {
    chips.push({ label: `🛍️ ${d.bagCount || 1} שקיות`, color: '#FF6B35' });
    if (d.keepWarm || request.keepWarm)   chips.push({ label: '🔥 שמור חם', color: '#EF4444' });
    if (request.requiresRefrig)           chips.push({ label: '❄️ קירור', color: '#06B6D4' });
    if (d.restaurantName)                 chips.push({ label: `🏪 ${d.restaurantName}`, color: '#F59E0B' });
  }

  // ── Envelope / Doc ────────────────────────────────────────────────
  if (request.cargoType === 'envelope') {
    if (d.quantity > 1)  chips.push({ label: `✉️ ${d.quantity} מעטפות`, color: '#F59E0B' });
    if (d.type)          chips.push({ label: `📄 ${d.type}`, color: '#8B5CF6' });
    if (request.isUrgent) chips.push({ label: '⚡ דחוף', color: '#EF4444' });
  }

  // ── Carton ────────────────────────────────────────────────────────
  if (request.cargoType === 'carton') {
    if (d.quantity > 1)     chips.push({ label: `📦 ${d.quantity} קרטונים`, color: '#3B82F6' });
    if (d.dimensions)       chips.push({ label: `📐 ${d.dimensions}`, color: '#6366F1' });
    if (d.volumeLiters)     chips.push({ label: `🧊 ${d.volumeLiters} ליטר`, color: '#06B6D4' });
    if (request.isFragile)  chips.push({ label: '⚠️ שביר', color: '#EF4444' });
    if (d.stackable)        chips.push({ label: '📚 ניתן לערום', color: '#10B981' });
    if (d.material)         chips.push({ label: d.material, color: '#9CA3AF' });
  }

  // ── Pallet ────────────────────────────────────────────────────────
  if (request.cargoType === 'pallet') {
    if (d.palletCount > 1)  chips.push({ label: `🪵 ${d.palletCount} משטחים`, color: '#10B981' });
    if (d.palletType)       chips.push({ label: d.palletType, color: '#059669' });
    if (d.palletDims)       chips.push({ label: `📐 ${d.palletDims}`, color: '#6366F1' });
    if (d.volumeCbm)        chips.push({ label: `📦 ${d.volumeCbm} מ"ק`, color: '#06B6D4' });
    if (d.material)         chips.push({ label: d.material, color: '#9CA3AF' });
    if (d.stackable === false) chips.push({ label: '🚫 לא לערום', color: '#EF4444' });
    if (d.unloadingEquipment) chips.push({ label: `⚙️ ${d.unloadingEquipment}`, color: '#F59E0B' });
  }

  // ── Steel / Metal ─────────────────────────────────────────────────
  if (request.cargoType === 'steel') {
    if (d.steelType)        chips.push({ label: `🔩 ${d.steelType}`, color: '#6B7280' });
    if (d.quantity)         chips.push({ label: `× ${d.quantity} יחידות`, color: '#9CA3AF' });
    if (d.dims)             chips.push({ label: `📏 ${d.dims}`, color: '#6366F1' });
    if (request.requiresLashing || d.requiresStraps) chips.push({ label: '🔗 ציוד קשירה', color: '#F59E0B' });
    if (d.unloadingEquipment) chips.push({ label: `⚙️ ${d.unloadingEquipment}`, color: '#EF4444' });
    if (d.deliveryCondition) chips.push({ label: d.deliveryCondition, color: '#9CA3AF' });
  }

  // ── Furniture ────────────────────────────────────────────────────
  if (request.cargoType === 'furniture') {
    if (d.items?.length > 0) chips.push({ label: d.items.join(' + '), color: '#8B5CF6' });
    if (d.floors > 1)         chips.push({ label: `קומה ${d.floors}`, color: '#F59E0B' });
    if (d.elevator)           chips.push({ label: '🛗 יש מעלית', color: '#10B981' });
    if (!d.elevator && d.floors > 1) chips.push({ label: '🚶 ללא מעלית', color: '#EF4444' });
    if (d.assembly)           chips.push({ label: '🔧 הרכבה נדרשת', color: '#3B82F6' });
    if (request.isFragile)    chips.push({ label: '⚠️ שביר', color: '#EF4444' });
  }

  // ── Machinery ────────────────────────────────────────────────────
  if (request.cargoType === 'machinery') {
    if (d.machineType)        chips.push({ label: d.machineType, color: '#6B7280' });
    if (d.manufacturer)       chips.push({ label: d.manufacturer, color: '#9CA3AF' });
    if (request.requiresCrane || d.requiresCrane) chips.push({ label: `🏗️ עגורן ${d.craneCapacityTon || ''}טון`, color: '#EF4444' });
    if (d.specialPermit)      chips.push({ label: `⚠️ ${d.specialPermit}`, color: '#F59E0B' });
    if (d.requiresDisassembly) chips.push({ label: '🔧 פירוק נדרש', color: '#3B82F6' });
  }

  // ── Sack ─────────────────────────────────────────────────────────
  if (request.cargoType === 'sack') {
    if (d.bagCount > 1)   chips.push({ label: `🛍️ ${d.bagCount} שקים`, color: '#8B5CF6' });
    if (d.material)       chips.push({ label: d.material, color: '#9CA3AF' });
    if (d.weightPerBag)   chips.push({ label: `${d.weightPerBag} ק"ג לשק`, color: '#6366F1' });
  }

  // ── Chemical ─────────────────────────────────────────────────────
  if (request.cargoType === 'chemical') {
    chips.push({ label: '☢️ חומ"ס', color: '#EF4444' });
    if (d.hazClass)   chips.push({ label: `Class ${d.hazClass}`, color: '#EF4444' });
    if (request.requiresADR || d.adr) chips.push({ label: 'ADR נדרש', color: '#F59E0B' });
  }

  // Universal
  if (request.cargoType !== 'food' && request.keepWarm) chips.push({ label: '🔥 שמור חם', color: '#EF4444' });
  if (request.requiresRefrig && request.cargoType !== 'food') chips.push({ label: '❄️ קירור', color: '#06B6D4' });

  if (chips.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {chips.map((c, i) => (
        <span key={i} style={CHIP_STYLE(c.color)}>{c.label}</span>
      ))}
    </div>
  );
}

export function CargoIcon({ type }: { type: string }) {
  const icons: Record<string,string> = {
    food:'🍔', envelope:'✉️', carton:'📦', pallet:'🪵', sack:'🛍️',
    steel:'🔩', furniture:'🛋️', vehicle:'🚗', chemical:'⚗️', livestock:'🐄', machinery:'⚙️', other:'📋',
  };
  return <span style={{ fontSize: 22 }}>{icons[type] || '📋'}</span>;
}
