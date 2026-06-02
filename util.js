// ── Farmacia Claret · Utils ─────────────────────────────────────────────────

const HOY = () => new Date(Date.now() - 4*60*60*1000).toISOString().slice(0,10); // fecha de Venezuela (UTC-4)

function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function diffDias(dateStr) {
  // positive = in the future, negative = past
  if (!dateStr) return null;
  const hoy = new Date(HOY() + 'T00:00:00');
  const d   = new Date(dateStr + 'T00:00:00');
  return Math.round((d - hoy) / 86400000);
}

function computeEstado(f) {
  const base = (f.estado_base||'').toUpperCase().trim();
  if (base === 'CONSIGNACION' || base === 'CONSIGNACION ') return 'CONSIGNACION';
  if (!f.vence) return 'SIN_VENCE';
  const diff = diffDias(f.vence);
  if (diff < 0)      return 'VENCIDA';
  if (diff <= ALERTA) return 'POR_VENCER';
  return 'VIGENTE';
}

function estadoBadgeFactura(estado) {
  switch(estado) {
    case 'VENCIDA':    return `<span class="badge b-red">VENCIDA</span>`;
    case 'POR_VENCER': return `<span class="badge b-amber">POR VENCER</span>`;
    case 'VIGENTE':    return `<span class="badge b-green">VIGENTE</span>`;
    case 'CONSIGNACION': return `<span class="badge b-purple">CONSIGNACIÓN</span>`;
    default:           return `<span class="badge b-gray">—</span>`;
  }
}

function renderDias(vence) {
  if (!vence) return '<span style="color:var(--faint);font-size:11px">—</span>';
  const diff = diffDias(vence);
  if (diff < 0)       return `<span class="dias-v">+${Math.abs(diff)}d</span>`;
  if (diff <= ALERTA) return `<span class="dias-p">${diff}d</span>`;
  return `<span class="dias-o">${diff}d</span>`;
}

function getProveedores(empresa) {
  const set = new Set((db.facturas||[]).filter(f => f.empresa===empresa).map(f => f.proveedor));
  (db.historial||[]).filter(h => h.empresa===empresa).forEach(h => set.add(h.proveedor));
  return [...set].sort();
}

function totalUsd(lista) {
  return lista.reduce((a,f) => a + (f.monto_usd||0), 0);
}

function r2c(n){ return Math.round((Number(n)||0)*100)/100; }
function abonosList(f){ return Array.isArray(f.abonos) ? f.abonos : []; }
function abonadoUsd(f){
  const a = abonosList(f);
  if (a.length) return a.reduce((s,x)=>s+(Number(x.monto_usd)||0),0);
  return Number(f.abonos_usd)||0;
}
function abonadoBs(f){
  const a = abonosList(f);
  if (a.length) return a.reduce((s,x)=>s+(Number(x.monto_bs)||0),0);
  const t = getTasa();
  return (Number(f.abonos_usd)||0) * (t||0);
}
// Monto a pagar reconciliado: N/C y Retención (en Bs) se descuentan a la tasa ORIGINAL de la factura
function montoPagarUsd(f){
  if (f.monto_usd == null) return null;
  let ncU = 0, retU = 0;
  if (f.monto_bs > 0 && f.monto_usd > 0){
    const tasaOrig = f.monto_bs / f.monto_usd;
    ncU  = (Number(f.nc)||0)  / tasaOrig;
    retU = (Number(f.ret)||0) / tasaOrig;
  }
  return Math.max(0, f.monto_usd - ncU - retU);
}
function montoPagarBsOrig(f){
  if (f.monto_bs_pagar != null) return f.monto_bs_pagar;
  if (f.monto_bs == null) return null;
  return Math.max(0, (Number(f.monto_bs)||0) - (Number(f.nc)||0) - (Number(f.ret)||0));
}
function saldoUsd(f){
  const m = montoPagarUsd(f);
  if (m == null) return null;
  return Math.max(0, m - abonadoUsd(f));
}
function saldoBsHoy(f){
  const s = saldoUsd(f);
  const t = getTasa();
  if (s != null && t) return Math.round(s * t * 100) / 100;
  const mb = montoPagarBsOrig(f);
  if (mb == null) return null;
  return Math.max(0, mb - abonadoBs(f));
}
function estaSaldada(f){
  const s = saldoUsd(f);
  if (s != null) return s <= 0.01;
  const sb = saldoBsHoy(f);
  return sb != null && sb <= 1;
}
// Bs a pagar HOY = monto reconciliado (neto de N/C y retención) a la tasa del día
function bsActual(f) {
  const t = getTasa();
  const m = montoPagarUsd(f);
  if (t && m != null) return Math.round(m * t * 100) / 100;
  return montoPagarBsOrig(f);
}

function sumBsActual(lista) {
  return lista.reduce((a, f) => a + (bsActual(f) || 0), 0);
}

function empPill(emp) {
  return emp==='farmacia'
    ? '<span class="pill-fcia">FCIA</span>'
    : '<span class="pill-drog">DROG</span>';
}

function fmt(n, dec=2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-VE', {minimumFractionDigits:dec, maximumFractionDigits:dec});
}

function fmtDate(s) {
  if (!s) return '—';
  const [y,m,d] = s.split('-');
  return d+'/'+m+'/'+y;
}

function bsLoan(usd) {
  const t = getTasa();
  if (!t || usd == null) return null;
  return Math.round(usd * t * 100) / 100;
}

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f = new Date(fecha + 'T00:00:00');
  return Math.round((f - hoy) / 86400000);
}

function estadoPrestamo(l) {
  const dias = diasHasta(l.proxima_cuota);
  if (!l.activo) return 'COMPLETADO';
  if (l.cuotas_hechas >= l.total_cuotas && l.total_cuotas > 0) return 'COMPLETADO';
  if (dias === null) return 'SIN_FECHA';
  if (dias < 0) return 'VENCIDO';
  if (dias <= 7) return 'HOY';
  if (dias <= 30) return 'PROXIMO';
  return 'VIGENTE';
}

function estadoBadge(e) {
  const map = {
    'VENCIDO':'<span class="badge badge-red"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="7"/></svg> Vencido</span>',
    'HOY':'<span class="badge badge-orange"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> Esta semana</span>',
    'PROXIMO':'<span class="badge badge-amber"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Próximo</span>',
    'VIGENTE':'<span class="badge badge-green"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg> Vigente</span>',
    'COMPLETADO':'<span class="badge badge-gray"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M20 6 9 17l-5-5"/></svg> Completado</span>',
    'SIN_FECHA':'<span class="badge badge-blue"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Sin fecha</span>',
  };
  return map[e] || '';
}

function loanCardClass(estado) {
  if (estado==='VENCIDO') return 'overdue';
  if (estado==='HOY') return 'overdue';
  if (estado==='PROXIMO') return 'due-soon';
  return 'ok';
}

// ── Farmacia Claret · Overlays ──────────────────────────────────────────────

function openOverlay(id)  { document.getElementById(id).classList.add('open'); }

function closeOverlay(id) { document.getElementById(id).classList.remove('open'); }

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);' +
      'background:#111827;color:#fff;padding:10px 20px;border-radius:8px;' +
      'font-size:13px;font-weight:500;z-index:9999;' +
      'box-shadow:0 4px 12px rgba(0,0,0,.3);opacity:0;transition:opacity .3s;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

