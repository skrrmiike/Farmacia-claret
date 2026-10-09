

// ── Farmacia Claret · Config ─────────────────────────────────────────────────
const DB_KEY      = 'farmacia_claret_central_v1';
let _supabaseSynced = false; // Protege Supabase de sobreescrituras antes del primer sync
const ALERTA      = 7;
const BANCOS_LIST = ['BANESCO','BDV','BNC','CARIBE','MERCANTIL','PROVINCIAL','TESORO'];
const ENTIDADES = ['FARMACIA','DROGUERIA'];
// Formato de montos: coma para miles y dos decimales (ej: 477,857.16)
function _numBs(v){ if(v==null) return NaN; var s=String(v).replace(/,/g,'').trim(); if(s==='') return NaN; return parseFloat(s); }
function _fmtBs(n){ if(n==null||isNaN(n)) return ''; return Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _fmtBancoInput(el){ if(!el) return; var n=_numBs(el.value); el.value = isNaN(n)?'':_fmtBs(n); if(typeof calcBancosLive==='function') calcBancosLive(); }
const VERIF_BANCOS = ['MERCANTIL TDC','MERCANTIL TDB','PROVINCIAL TDC','PROVINCIAL TDB','BDV TDC','BDV TDB','CARIBE TDC','TESORO TDC'];

const SUPA_URL = 'https://unuumkcapdtqmbwefbfg.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudXVta2NhcGR0cW1id2VmYmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTgxMDUsImV4cCI6MjA5NTk5NDEwNX0.TMQ_YgWlNXrBboJcg5YfS6359Fhw6zv_N10K5m_xtrE';

const supabaseClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);

// Mapa de nombre/rol para fallback de UI (sin contraseñas)
const USERS = {
  'mayra':   { role: 'mayra',   nombre: 'Mayra' },
  'grismar': { role: 'grismar', nombre: 'Grismar' },
  'ines':    { role: 'ines',    nombre: 'Inés' },
  'angelica':{ role: 'supervisor',nombre: 'Angélica' },
  'paul':    { role: 'supervisor',nombre: 'Paul' },
  'gerente': { role: 'gerente', nombre: 'Jose' },
  'miguel':  { role: 'admin',   nombre: 'Miguel' },
  'veronica':{ role: 'veronica',nombre: 'Verónica' },
};

const TAB_ROLES = {
  'planta':['admin'],
  'ventasvivo':['gerente','admin'],
  'inicio':['gerente','mayra','grismar','ines','angelica','supervisor','reto','compras','admin'],
  'vencimientos':['gerente','mayra','grismar','ines','angelica','supervisor','reto','compras','admin'],
  'mensajes':['ventas','supervisor','gerente','admin'],
  'cierre':['supervisor','angelica','gerente','admin','mayra','grismar','ines'],
  'concil-cajas':['ines','admin'],
  'compras':['compras','admin'],
  'reto':['gerente','mayra','grismar','ines','angelica','supervisor','reto','compras','admin'],
  'cxp-prov':['gerente','mayra','grismar','ines','angelica','supervisor','compras','admin'],
  'cal-pagos':['gerente','mayra','grismar','ines','angelica','supervisor','compras','admin'],
  'panel':          ['mayra','grismar','admin'],
  'bancos':         ['mayra','admin'],
  'bancos-hist':    ['mayra','admin'],
  'bancos-concil':  ['mayra','admin'],
  'prestamos':      ['mayra','admin'],
  'prest-resumen':  ['mayra','gerente','admin'],
  'facturas':       ['mayra','grismar','admin'],
  'historial':      ['mayra','grismar','admin'],
  'verif-ines':     ['ines'],
  'gerencia':       ['gerente','admin'],
  'cxc':            ['mayra','ines','admin'],
  'conta':          ['mayra','gerente','admin'],
  'cxp':            ['mayra','gerente','admin'],
  'turnos':         ['angelica','supervisor','gerente','admin'],
  'vales':          ['veronica','admin'],
  'rrhh':           ['veronica','admin'],
  'yapague':        ['yapague','angelica','supervisor','mayra','admin'],
  'anomalias':      ['reto','gerente','admin'],
  'consumo':        ['admin','gerente','mayra','compras'],
  'desempeno':      ['admin','gerente','veronica'],
  'vacaciones':     ['admin','gerente','veronica'],
  'almacen':        ['admin','gerente'],
  'reparto':        ['admin','gerente'],
  'admin-panel':    ['admin'],
};

let filterState = {
  farmacia:  { estado:'all', proveedor:'all', sortCol:'vence', sortAsc:true, search:'' },
  drogueria: { estado:'all', proveedor:'all', sortCol:'vence', sortAsc:true, search:'' },
};



// ── Farmacia Claret · Utils ─────────────────────────────────────────────────

const HOY = () => new Date(Date.now() - 4*60*60*1000).toISOString().slice(0,10); // fecha de Venezuela (UTC-4)

function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

try{ if(location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){ ['log','info','debug'].forEach(function(m){ try{console[m]=function(){};}catch(e){} }); } }catch(e){}
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


// ── Farmacia Claret · Database & Sync ───────────────────────────────────────

let db;

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (!d.settings)  d.settings  = { tasa: 544.58, tasa_fecha: null };
      if (!d.users)     d.users     = [];
      if (!d.auditlog)  d.auditlog  = [];
      if (!d.tasas)     d.tasas     = {};
      if (!d.bancos)    d.bancos    = {};
      if (!d.prestamos || d.prestamos.length === 0) d.prestamos = [];
      if (!d.facturas)  d.facturas  = [];
      if (!d.historial) d.historial = [];
      if (!d.gastos)    d.gastos    = [];
      if (!d.ventas)    d.ventas    = {};
      if (!d.conta_cfg) d.conta_cfg = {};
      if (!d.reto) d.reto = _retoDefault();
      if (!d.cxp_prov) d.cxp_prov = _cxpDefault();
      return d;
    }
    return initDB();
  } catch(e) { return initDB(); }
}

function initDB() {
  const d = {
    facturas:  [],
    historial: [],
    prestamos: [],
    bancos:    {},
    tasas:     {},
    tasas_eur: {},
    cxc_drog: [],
    cxc_cobradas: [],
    cxc_farm: [],
    cxc_farm_cobradas: [],
    gastos: [],
    ventas: {},
    conta_cfg: {},
    empresa_cfg: {},
    reto: {titulo:'Reto de Ventas',activo:false,premio_colectivo:'Pizzas de almuerzo 🍕',premio_individual:'Por confirmar',fecha_fin:'',vendedores:[],meds:[],ventas:{}},
    cxp_prov: {inicio:'2026-07',dia_pago:5,ingreso_diario:4000,margen_pct:100,prioridades:{},prov_delay:2,plan_meses:{alta:12,media:6,baja:3},fecha_ahorro:null,compras:[],abono_plan:{activo:false,monto:10000,cadaMeses:1,dia:5,prestamos:[]},tasa_binance:0,nomina:{quincena_usd:0,activa:true},gastos_fijos:[],saldo_inicial:0,facturas:[],abonos:[]},
    settings:  { tasa: 544.58, tasa_fecha: null },
    users:     [],
    auditlog:  [],
    version:   1
  };
  localStorage.setItem(DB_KEY, JSON.stringify(d));
  return d;
}

function getTasa() {
  if (db.settings && db.settings.tasa) return db.settings.tasa;
  const t = db.tasas || {};
  const fechas = Object.keys(t).sort();
  return fechas.length ? t[fechas[fechas.length-1]] : null;
}

function limpiarDecimales(lista) {
  const campos = ['monto_bs','monto_usd','abonos_usd','nc','ret','monto_bs_pagar'];
  return lista.map(f => {
    const limpio = { ...f };
    campos.forEach(c => {
      if (limpio[c] !== null && limpio[c] !== undefined && !isNaN(Number(limpio[c])))
        limpio[c] = Math.round(Number(limpio[c]) * 100) / 100;
    });
    return limpio;
  });
}

// ── Persistencia local agrupada (debounce) ──────────────────────────────────
// Serializar toda la base a localStorage es costoso (varios MB). En vez de
// hacerlo en cada guardado/evento, lo agrupamos cada 800ms y lo volcamos
// inmediatamente al cerrar u ocultar la pestaña (para no perder nada).
let _persistTimer = null, _persistData = null;
function _persistLocal(data) {
  _persistData = data || db;
  if (_persistTimer) return;
  _persistTimer = setTimeout(function () {
    _persistTimer = null;
    try { localStorage.setItem(DB_KEY, JSON.stringify(_persistData || db)); } catch (e) {}
    _persistData = null;
  }, 800);
}
function _persistFlush() {
  if (_persistTimer) { clearTimeout(_persistTimer); _persistTimer = null; }
  try { localStorage.setItem(DB_KEY, JSON.stringify(_persistData || db)); } catch (e) {}
  _persistData = null;
}
try {
  window.addEventListener('beforeunload', _persistFlush);
  window.addEventListener('pagehide', _persistFlush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') _persistFlush(); });
} catch (e) {}

// ── Re-render agrupado (debounce) para eventos en vivo ──────────────────────
let _renderSoonTimer = null;
var _renderPending = false, _renderRetry = null;
function _editando(){
  var ae = (typeof document!=='undefined') ? document.activeElement : null;
  return !!(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName||''));
}
function _renderSoon() {
  // No re-dibujar en segundo plano (ahorra CPU/batería en el móvil)
  if (typeof document!=='undefined' && document.hidden) { _renderPending = true; return; }
  // No re-dibujar mientras el usuario escribe en un campo: evita que se reconstruya y trabe el tecleo
  if (_editando()) {
    _renderPending = true;
    if (!_renderRetry) _renderRetry = setTimeout(function(){ _renderRetry=null; if(_renderPending && !_editando()){ _renderPending=false; _renderSoon(); } }, 1500);
    return;
  }
  if (_renderSoonTimer) return;
  _renderSoonTimer = setTimeout(function () {
    _renderSoonTimer = null; _renderPending = false;
    try { renderTab(activeTab); renderBadges(); } catch (e) {}
  }, 400);
}
if (typeof document!=='undefined') {
  document.addEventListener('visibilitychange', function(){ if(!document.hidden && _renderPending){ _renderPending=false; _renderSoon(); } });
  document.addEventListener('focusout', function(){ if(_renderPending) setTimeout(function(){ if(_renderPending && !_editando()){ _renderPending=false; _renderSoon(); } }, 250); });
}

// ── Historial en tabla propia de Postgres (ya no como bloque JSON) ──────────
// Se carga al iniciar y se actualiza fila por fila al archivar/restaurar pagos.
function _hDate(v){ return (v && /^\d{4}-\d{2}-\d{2}/.test(v)) ? String(v).slice(0,10) : null; }
async function cargarHistorial() {
  try {
    const { data, error } = await supabaseClient.from('historial')
      .select('data').order('creado_en', { ascending: false, nullsFirst: false }).limit(5000);
    if (error) throw error;
    if (Array.isArray(data)) db.historial = data.map(r => r.data).filter(Boolean);
  } catch (e) { console.warn('cargarHistorial:', e); }
}
function guardarHistorialRow(item) {
  if (!item || !item.id || typeof supabaseClient === 'undefined') return;
  try {
    const row = {
      id: String(item.id), empresa: item.empresa || null, proveedor: item.proveedor || null,
      factura: item.factura || null, fecha: _hDate(item.fecha), creado_en: _hDate(item.creado_en),
      monto_usd: (item.monto_usd != null && !isNaN(item.monto_usd)) ? Number(item.monto_usd) : null,
      data: item, updated_at: new Date().toISOString()
    };
    supabaseClient.from('historial').upsert([row], { onConflict: 'id' }).then(function () {}).catch(function (e) { console.warn('guardarHistorialRow:', e); });
  } catch (e) { console.warn('guardarHistorialRow:', e); }
}
function borrarHistorialRow(id) {
  if (!id || typeof supabaseClient === 'undefined') return;
  try { supabaseClient.from('historial').delete().eq('id', String(id)).then(function () {}).catch(function () {}); } catch (e) {}
}

function saveDB(data) {
  _saving = true;
  try{localStorage.setItem('fc_dirty','1');}catch(e){} try{window._critSaveTs=Date.now();}catch(e){}
  _persistLocal(data);
  try{ _flashGuardado('guardando'); }catch(e){}
  saveSections(data)
    .then(function(){ try{ _flashGuardado('ok'); }catch(e){} })
    .catch(err => { console.warn('Supabase sync error:', err); try{ _flashGuardado('local'); }catch(e){} })
    .finally(() => { setTimeout(() => { _saving = false; }, 1500); });
}

// ── Migración automática desde herramientas anteriores ───────────────────────
async function migrateFromOldApps() {
  const OLD_KEYS = {
    facturas:  'farmacia_claret_facturas_v1',
    prestamos: 'farmacia_claret_prestamos_v1',
  };
  let migrated = false;

  // Migrate facturas + historial
  try {
    const raw = localStorage.getItem(OLD_KEYS.facturas);
    if (raw) {
      const old = JSON.parse(raw);
      if (old.facturas  && old.facturas.length  > 0 && db.facturas.length  === 0) {
        db.facturas  = old.facturas;
        migrated = true;
      }
      if (old.historial && old.historial.length > 0 && db.historial.length === 0) {
        db.historial = old.historial;
        migrated = true;
      }
    }
  } catch(e) { console.warn('Migration facturas error:', e); }

  if (migrated) {
    saveDB(db);
    showToast('Datos migrados correctamente');
    renderTab(activeTab);
    renderBadges();
  }
  return migrated;
}

// Snapshot de la última versión guardada en Supabase — para detectar cambios
let _savedSnapshot = {};

async function saveSections(data) {
  const now = new Date().toISOString();
  const CRITICAL = ['facturas','historial','prestamos'];
  // 'historial' ya NO va aquí: vive en su propia tabla de Postgres (se guarda fila por fila).
  const ALL_SECTIONS = ['facturas','prestamos','bancos','settings','tasas','tasas_eur','cxc_drog','cxc_cobradas','cxc_farm','cxc_farm_cobradas','gastos','ventas','conta_cfg','empresa_cfg','users','reto','cxp_prov'];
  const OBJ_SECTIONS = ['tasas','tasas_eur','bancos','settings','ventas','conta_cfg','empresa_cfg','reto','cxp_prov'];
  // Bancos: leer y mezclar contra el servidor para NO pisar conciliaciones ni dias de otras sesiones.
  if (_supabaseSynced && typeof _bancosMerge==='function') {
    try {
      var _bL = _bancosLimpio(data.bancos);
      if (_savedSnapshot['bancos'] !== JSON.stringify(_bL)) {
        const _bResp = await supabaseClient.from('app_sections').select('data').eq('section_name','bancos').maybeSingle();
        const _bRem = (_bResp && _bResp.data && _bResp.data.data && typeof _bResp.data.data==='object' && !Array.isArray(_bResp.data.data)) ? _bResp.data.data : null;
        if (_bRem) data.bancos = _bancosMerge(_bL, _bRem);
      }
    } catch(e){}
  }

  const rows = ALL_SECTIONS
    .map(name => ({
      section_name: name,
      // Bancos: quitar días-esqueleto (todo en null) para que jamás pisen valores reales en el servidor
      data: name === 'bancos' ? _bancosLimpio(data.bancos) : (OBJ_SECTIONS.includes(name) ? (data[name] || {}) : (data[name] || [])),
      updated_at: now
    }))
    .filter(r => {
      // Nunca sobreescribir secciones críticas con vacíos antes del primer sync
      if (CRITICAL.includes(r.section_name) && Array.isArray(r.data) && r.data.length === 0 && !_supabaseSynced) return false;
      // NUNCA pisar la tasa remota con valores por defecto/vacíos antes del primer sync
      // Hasta que la app sincronice con la nube, NO empujar tasa/settings/tasas_eur/bancos:
      // la copia local puede estar vieja (o ser el esqueleto vacío) y pisaría datos reales del servidor.
      if (!_supabaseSynced && (r.section_name === 'settings' || r.section_name === 'tasas' || r.section_name === 'tasas_eur' || r.section_name === 'bancos')) return false;
      // Solo guardar si el contenido cambió desde la última vez (ahorra escrituras)
      const serialized = JSON.stringify(r.data);
      if (_savedSnapshot[r.section_name] === serialized) return false;
      _savedSnapshot[r.section_name] = serialized;
      return true;
    });

  if (rows.length === 0) { try{localStorage.setItem('fc_dirty','0');}catch(e){} return; }
  const { error } = await supabaseClient.from('app_sections').upsert(rows, { onConflict: 'section_name' });
  if (error) throw error;
  try{localStorage.setItem('fc_dirty','0');}catch(e){}
}

// Fusiona la disponibilidad bancaria por fecha (igual que hacemos con la tasa).
// Regla: para cada día, lo LOCAL gana solo si tiene algún valor real (no-nulo),
// o si el servidor no tiene ese día (así no se pierde un guardado que no llegó a subir).
// Si el día local está vacío (esqueleto auto-creado), gana lo del servidor.
// Devuelve una copia de bancos SIN los días-esqueleto (todos los bancos en null).
// Conserva las claves especiales (p.ej. _verif) y cualquier día con al menos un valor real.
function _bancosLimpio(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return {};
  var out = {};
  Object.keys(b).forEach(function (fd) {
    if (fd.charAt(0) === '_') { out[fd] = b[fd]; return; }   // p.ej. _verif
    var day = b[fd]; if (!day || typeof day !== 'object') return;
    var hasData = false;
    ['FARMACIA', 'DROGUERIA'].forEach(function (ent) {
      var o = day[ent] || {};
      Object.keys(o).forEach(function (k) { var n = o[k]; if (n != null && !isNaN(n)) hasData = true; });
    });
    if (hasData) out[fd] = day;
  });
  return out;
}

function _mergeBancos(remote, local) {
  remote = (remote && typeof remote === 'object' && !Array.isArray(remote)) ? remote : {};
  local  = (local  && typeof local  === 'object' && !Array.isArray(local )) ? local  : {};
  var out = {};
  Object.keys(remote).forEach(function(fd){ out[fd] = remote[fd]; });
  Object.keys(local).forEach(function(fd){
    var lv = local[fd]; var hasData = false;
    if (lv) ['FARMACIA','DROGUERIA'].forEach(function(ent){
      var o = lv[ent] || {};
      Object.keys(o).forEach(function(b){ var n = o[b]; if (n != null && !isNaN(n)) hasData = true; });
    });
    if (lv && Array.isArray(lv._mov) && lv._mov.length) hasData = true;
    if (hasData || !(fd in out)) out[fd] = lv;
  });
  return out;
}

function _bancosMerge(local, remote){
  local = (local && typeof local==='object' && !Array.isArray(local)) ? local : {};
  remote = (remote && typeof remote==='object' && !Array.isArray(remote)) ? remote : {};
  var out = JSON.parse(JSON.stringify(local));
  out._verif = Object.assign({}, out._verif||{}, remote._verif||{});
  if (Array.isArray(remote._verif_hist)) out._verif_hist = remote._verif_hist;
  else if (Array.isArray(local._verif_hist)) out._verif_hist = local._verif_hist;
  Object.keys(remote).forEach(function(fd){ if(/^\d{4}-\d{2}-\d{2}$/.test(fd) && !(fd in out)){ out[fd]=remote[fd]; } });
  return out;
}
async function syncFromSupabase(silent) {
  try {
    var _wasDirty=false; try{_wasDirty=localStorage.getItem('fc_dirty')==='1';}catch(e){}
    var _ds=_wasDirty?{facturas:db.facturas,prestamos:db.prestamos,cxc_drog:db.cxc_drog,cxc_cobradas:db.cxc_cobradas,cxc_farm:db.cxc_farm,cxc_farm_cobradas:db.cxc_farm_cobradas,gastos:db.gastos,ventas:db.ventas}:null;
    const { data: rows, error } = await supabaseClient.from('app_sections').select('*').not('section_name','like','backup_%');
    if (error) throw error;
    const s = {};
    rows.forEach(r => s[r.section_name] = r.data);
    try { if (s.permisos) { _perms = s.permisos; } if (s.permisos_user) { _permsUser = s.permisos_user; } if (typeof aplicarPermisos==='function') aplicarPermisos(); if (typeof applyRoleUI==='function' && typeof currentRole!=='undefined' && currentRole) applyRoleUI(); } catch(e){}
    const _remoteVacio = (!s.facturas||!s.facturas.length) && (!s.prestamos||!s.prestamos.length) && (!s.historial||!s.historial.length);
    db.facturas  = s.facturas  ?? db.facturas;
    await cargarHistorial();   // historial desde su tabla propia (no del bloque)
    db.prestamos = (s.prestamos && s.prestamos.length > 0) ? s.prestamos : db.prestamos;
    db.bancos    = _mergeBancos(s.bancos, db.bancos);
    // Si la fusión conservó días locales que el servidor no tenía (p.ej. un guardado
    // que no llegó a subir por un corte de red), súbelos para dejarlos respaldados.
    try {
      if (JSON.stringify(db.bancos) !== JSON.stringify(s.bancos || {})) {
        supabaseClient.from('app_sections').upsert(
          [{ section_name:'bancos', data: db.bancos, updated_at: new Date().toISOString() }],
          { onConflict:'section_name' }
        ).then(function(){}).catch(function(){});
      }
    } catch(e){}
    // --- Tasa: el histórico de tasas es la fuente de verdad ---
    // Unir ambos lados: no se pierde ninguna fecha (lo local gana si hay conflicto)
    db.tasas = Object.assign({}, s.tasas || {}, db.tasas || {});
    db.tasas_eur = Object.assign({}, s.tasas_eur || {}, db.tasas_eur || {});
    db.cxc_drog = s.cxc_drog ?? db.cxc_drog;
    db.cxc_cobradas = s.cxc_cobradas ?? db.cxc_cobradas;
    db.cxc_farm = s.cxc_farm ?? db.cxc_farm;
    db.cxc_farm_cobradas = s.cxc_farm_cobradas ?? db.cxc_farm_cobradas;
    db.gastos = s.gastos ?? db.gastos;
    db.ventas = s.ventas ?? db.ventas;
    db.conta_cfg = s.conta_cfg ?? db.conta_cfg;
    db.empresa_cfg = s.empresa_cfg ?? db.empresa_cfg;
    db.reto = (function(){ var rr=s.reto, lr=db.reto; if(!rr) return lr; if(!lr) return rr; return ((Number(rr._v)||0) >= (Number(lr._v)||0)) ? rr : lr; })();
    db.cxp_prov = s.cxp_prov ?? db.cxp_prov;
    try{ if(typeof aplicarEmpresaUsuario==='function'){ aplicarEmpresaUsuario(!window._empresaInitDone); window._empresaInitDone=true; } }catch(e){}
    if (!db.settings) db.settings = {};
    const _hoy = HOY();
    if (db.tasas[_hoy] != null) {
      // Cualquier equipo que cargó la tasa de hoy la propaga a todos
      db.settings.tasa = db.tasas[_hoy];
      db.settings.tasa_fecha = _hoy;
    } else if (s.settings && (s.settings.tasa_fecha || '') >= (db.settings.tasa_fecha || '')) {
      db.settings = s.settings;
    }
    // Si la tasa de hoy está local pero no en Supabase, subirla para los demás
    if (db.tasas[_hoy] != null && (!s.tasas || s.tasas[_hoy] == null)) {
      try {
        supabaseClient.from('app_sections').upsert(
          [{ section_name:'tasas',    data: db.tasas,    updated_at: new Date().toISOString() },
           { section_name:'settings', data: db.settings, updated_at: new Date().toISOString() }],
          { onConflict:'section_name' }
        ).then(()=>{}).catch(()=>{});
      } catch(e) { console.warn('re-push tasa:', e); }
    }
    // Users: only accept from Supabase if they have passwordHash (new format)
    // If Supabase has legacy users (no hash), keep local seeded users and re-push
    if (s.users && s.users.length > 0) {
      const hasHashes = s.users.some(u => u.passwordHash);
      if (hasHashes) {
        db.users = s.users;
      } else {
        // Legacy users in Supabase — re-seed locally and push hashed version back
        console.info('[Auth] Migrando usuarios legacy a SHA-256...');
        await seedUsersIfEmpty();
        // Force re-push of hashed users to Supabase
        await supabaseClient.from('app_sections').upsert(
          [{ section_name: 'users', data: db.users, updated_at: new Date().toISOString() }],
          { onConflict: 'section_name' }
        );
        console.info('[Auth] Usuarios migrados a Supabase con hash.');
      }
    }
    db.auditlog  = (s.auditlog && s.auditlog.length>0) ? s.auditlog : db.auditlog;
    if (_ds) {
      Object.keys(_ds).forEach(function(k){ if(_ds[k]!=null) db[k]=_ds[k]; });
      try {
        var _rr=Object.keys(_ds).map(function(k){ return {section_name:k, data:(db[k]!=null?db[k]:(k==='ventas'?{}:[])), updated_at:new Date().toISOString()}; });
        supabaseClient.from('app_sections').upsert(_rr,{onConflict:'section_name'}).then(function(){ try{localStorage.setItem('fc_dirty','0');}catch(e){} }).catch(function(){});
      } catch(e){}
    }
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    // Cleanup decimal precision after sync
    db.facturas  = limpiarDecimales(db.facturas);
    db.historial = limpiarDecimales(db.historial);
    renderTab(activeTab);
    renderBadges();
    renderTasaHeader();
    checkTasaBanner();
    if (!silent) showToast('Datos sincronizados');
    _supabaseSynced = true;
    // Seed snapshot so first saveDB after sync only writes changed sections
    const _snapshotKeys = ['facturas','prestamos','bancos','settings','tasas','tasas_eur','cxc_drog','cxc_cobradas','cxc_farm','cxc_farm_cobradas','gastos','ventas','conta_cfg','empresa_cfg','users','auditlog','reto','cxp_prov'];
    _snapshotKeys.forEach(k => { _savedSnapshot[k] = JSON.stringify(db[k] || null); });
    // Migración: si la base nueva está vacía y este equipo tiene datos, subirlos
    if (_remoteVacio && ((db.facturas&&db.facturas.length) || (db.prestamos&&db.prestamos.length) || (db.historial&&db.historial.length))) {
      try {
        const _now = new Date().toISOString();
        const _objs = ['tasas','tasas_eur','bancos','settings','ventas','conta_cfg','empresa_cfg'];
        const _secs = ['facturas','prestamos','bancos','settings','tasas','tasas_eur','cxc_drog','cxc_cobradas','cxc_farm','cxc_farm_cobradas','gastos','ventas','conta_cfg','empresa_cfg','auditlog'];
        const _rows = _secs.map(n => ({ section_name:n, data: _objs.includes(n) ? (db[n]||{}) : (db[n]||[]), updated_at:_now }));
        await supabaseClient.from('app_sections').upsert(_rows, { onConflict:'section_name' });
        _secs.forEach(k => { _savedSnapshot[k] = JSON.stringify(db[k] || null); });
        console.info('[Migración] Datos locales subidos al proyecto nuevo.');
        if (!silent) showToast('Datos migrados al servidor nuevo');
      } catch(e) { console.warn('[Migración] error subiendo datos:', e); }
    }
    console.log('[Farmacia Claret] Sync OK', new Date().toLocaleTimeString('es-VE'));
  } catch(err) {
    console.warn('[Farmacia Claret] Sync error:', err);
    if (!silent) showToast('Sin conexión – datos locales');
  }
}

// ── Supabase Realtime — cambios en tiempo real ────────────────────────────────
var _realtimeStarted = false;
var _tasaPollTimer = null;
function startRealtime() {
  if (!_realtimeStarted) {
    supabaseClient
      .channel('farmacia-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_sections' }, (payload) => {
        const row = payload.new || payload.old; if (!row) return;
        const section_name = row.section_name, data = row.data;
        if (section_name === 'permisos') { _perms = data || null; try{ aplicarPermisos(); }catch(e){} try{ if(typeof applyRoleUI==='function') applyRoleUI(); }catch(e){} return; }
        if (section_name === 'permisos_user') { _permsUser = data || null; try{ aplicarPermisos(); }catch(e){} try{ if(typeof applyRoleUI==='function') applyRoleUI(); }catch(e){} return; }
        if (section_name === 'reto') { try { var _rrv=(data&&Number(data._v))||0, _rlv=(db.reto&&Number(db.reto._v))||0; if(_rrv<=_rlv) return; db.reto=data; _persistLocal(db); if(!_saving){ try{ if(typeof window._retoRepaint==='function'){ window._retoLastReto=data; window._retoRepaint(); } }catch(e){} if(typeof activeTab!=='undefined' && activeTab==='reto') _renderSoon(); } } catch(e){} return; }
        if (!section_name || db[section_name] === undefined || data === undefined) return;
        var _CRIT={prestamos:1,facturas:1,bancos:1,cxc_drog:1,cxc_cobradas:1,cxc_farm:1,cxc_farm_cobradas:1,gastos:1};
        if (_CRIT[section_name] && (Date.now()-(window._critSaveTs||0))<6000) return;
        db[section_name] = data;
        _persistLocal(db);
        if (_saving) return;
        if (section_name === 'settings' || section_name === 'tasas') {
          const hoy = HOY();
          if (db.tasas && db.tasas[hoy] != null) { db.settings = db.settings || {}; db.settings.tasa = db.tasas[hoy]; db.settings.tasa_fecha = hoy; }
          if (getTasa() && typeof recalcularMontosBs === 'function') recalcularMontosBs(getTasa());
          renderTasaHeader(); checkTasaBanner();
          const ovf = document.getElementById('ov-factura');
          if (ovf && ovf.classList.contains('open') && typeof mostrarTasaEnForm === 'function') mostrarTasaEnForm();
        }
        _renderSoon();
      })
      .subscribe();
    _realtimeStarted = true;
  }
  // Respaldo estricto: revisar la tasa cada 45s por si se perdió un evento en vivo
  if (_tasaPollTimer) clearInterval(_tasaPollTimer);
  _tasaPollTimer = setInterval(async () => {
    if (!currentUser || _saving) return;
    try {
      const { data: rows } = await supabaseClient.from('app_sections').select('section_name,data').in('section_name', ['tasas','settings']);
      if (!rows) return;
      const remoteTasas = (rows.find(r => r.section_name === 'tasas') || {}).data || {};
      const hoy = HOY();
      let changed = false;
      const merged = Object.assign({}, db.tasas || {}, remoteTasas);
      if (JSON.stringify(merged) !== JSON.stringify(db.tasas || {})) { db.tasas = merged; changed = true; }
      if (remoteTasas[hoy] != null && (!db.settings || db.settings.tasa !== remoteTasas[hoy])) {
        db.tasas[hoy] = remoteTasas[hoy];
        db.settings = db.settings || {}; db.settings.tasa = remoteTasas[hoy]; db.settings.tasa_fecha = hoy;
        changed = true;
      }
      if (changed) {
        _persistLocal(db);
        if (getTasa() && typeof recalcularMontosBs === 'function') recalcularMontosBs(getTasa());
        renderTasaHeader(); checkTasaBanner(); _renderSoon();
      }
    } catch(e) {}
  }, 45000);
}



// ── Seguridad y usuarios ────────────────────────────────────────────────────

async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function getUserNombre(username) {
  if (!username) return 'Sistema';
  const u = db.users?.find(x => x.username===username);
  return u?.nombre || USERS[username]?.nombre || username;
}

async function seedUsersIfEmpty() {
  // Run if empty OR if existing users lack passwordHash (migration case)
  const needsMigration = db.users && db.users.length > 0 && !db.users.some(u => u.passwordHash);
  if (db.users && db.users.length > 0 && !needsMigration) return;
  if (needsMigration) console.info('[Auth] seedUsersIfEmpty: re-hasheando usuarios legacy');
  const defaults = [
    {username:'mayra',   nombre:'Mayra',   role:'mayra',   password:'Mayra2024'},
    {username:'grismar', nombre:'Grismar', role:'grismar', password:'Grismar2024'},
    {username:'ines',    nombre:'Inés',    role:'ines',    password:'Ines2024'},
    {username:'gerente', nombre:'Gerente', role:'gerente', password:'Gerente2024'},
    {username:'miguel',  nombre:'Miguel',  role:'admin',   password:'Admin2024'},
  ];
  db.users = await Promise.all(defaults.map(async u => ({
    username: u.username,
    nombre:   u.nombre,
    role:     u.role,
    activo:   true,
    passwordHash: await hashPassword(u.password),
    creado_en: new Date().toISOString()
  })));
  saveDB(db);
}

// ── Farmacia Claret · Auth ──────────────────────────────────────────────────

let currentUser = null;
let currentRole = null;
let currentPagoId  = null;
let _saving = false;  // bloquea Realtime mientras guardamos

function _toggleLoginPass() {
  var inp = document.getElementById('login-pass');
  var svg = document.getElementById('login-pass-eye-svg');
  if (!inp) return;
  var show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (svg) svg.innerHTML = show
    ? '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>'
    : '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
  try { inp.focus(); } catch(e){}
}
async function doLogin() {
  const u     = (document.getElementById('login-user').value||'').trim().toLowerCase();
  const p     = document.getElementById('login-pass').value||'';
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');
  if (!u || !p) { errEl.textContent = 'Ingresa usuario y contraseña'; return; }
  errEl.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
  const resetBtn = () => { if (btn) { btn.disabled = false; btn.textContent = 'Ingresar →'; } };
  try {
    const email = u + '@claret.internal';
    const { data: ad, error: ae } = await supabaseClient.auth.signInWithPassword({ email, password: p });
    if (ae || !ad || !ad.user) {
      resetBtn();
      document.getElementById('login-pass').value = '';
      errEl.textContent = 'Usuario o contraseña incorrectos';
      return;
    }
    const meta = ad.user.user_metadata || {};
    const role = meta.role || (USERS[u] && USERS[u].role) || 'mayra';
    currentUser = u; currentRole = role;
    sessionStorage.setItem('fc_user', u);
    sessionStorage.setItem('fc_role', role); try{ EMPRESA=(typeof _loginEmpresa!=='undefined'?_loginEmpresa:EMPRESA); localStorage.setItem('fc_empresa',EMPRESA); }catch(e){}
    document.getElementById('login-pass').value = '';
    document.getElementById('ov-login').style.display = 'none';
    document.body.dataset.role = currentRole; try{aplicarPermisos();}catch(e){} try{initEmpresa();}catch(e){}
    logAudit('auth.login','Sesión iniciada');
    checkTasaBanner(); resetInactivityTimer();
    applyRoleUI(); renderTab(activeTab); renderBadges(); renderTasaHeader();
    syncFromSupabase(true).then(() => migrateFromOldApps());
    startRealtime();
  } catch(e) {
    console.error('[Login] Error:', e);
    resetBtn();
    document.getElementById('login-pass').value = '';
    errEl.textContent = 'Error al iniciar sesión. Revisa tu conexión.';
  }
}
function doLogout() {
  logAudit('auth.logout','Sesión cerrada');
  try { supabaseClient.auth.signOut(); } catch(e){}
  clearTimeout(_inactivityTimer);
  clearTimeout(_warnTimer);
  const _ib = document.getElementById('inactivity-banner');
  if (_ib) _ib.style.display = 'none';
  saveDB(db);
  sessionStorage.removeItem('fc_user');
  sessionStorage.removeItem('fc_role');
  currentUser   = null;
  currentRole   = null;
  _supabaseSynced = false;  // Reset para que el próximo login no sobreescriba datos
  document.body.removeAttribute('data-role');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').textContent = '';
  document.getElementById('user-indicator').textContent = '';
  document.getElementById('ov-login').style.display = 'flex';
}

// ── Log de Auditoría ────────────────────────────────────────────────────────

function logAudit(action, detail) {
  if (!db.auditlog) db.auditlog = [];
  var _e = { ts: new Date().toISOString(), user: currentUser || 'sistema', nombre: getUserNombre(currentUser), action: action, detail: detail || '' };
  db.auditlog.unshift(_e);
  if (db.auditlog.length > 500) db.auditlog = db.auditlog.slice(0, 500);
  try { supabaseClient.from('auditlog').insert([{ ts:_e.ts, app_user:_e.user, nombre:_e.nombre, action:_e.action, detail:_e.detail }]).then(function(){}).catch(function(){}); } catch(e){}
}

// Fecha "esperada" de la tasa BCV. Sábado y domingo el BCV NO publica: la tasa
// vigente esos días es la del viernes, así que no debe avisar que está desactualizada.
function _tasaFechaEsperada() {
  const hoy = HOY();
  const d = new Date(hoy + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0=domingo, 6=sábado
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1);       // sábado → viernes
  else if (dow === 0) d.setUTCDate(d.getUTCDate() - 2);  // domingo → viernes
  return d.toISOString().slice(0, 10);
}
function _tasaVencida() {
  const fechas = Object.keys(db.tasas||{}).sort();
  const ult = fechas.length ? fechas[fechas.length-1] : null;
  if (!ult) return true;
  const esp = _tasaFechaEsperada();
  const dias = (new Date(esp + 'T00:00:00Z') - new Date(ult + 'T00:00:00Z')) / 86400000;
  return dias > 1; // 1 día de gracia en días hábiles; fin de semana usa la del viernes
}
function checkTasaBanner() {
  const b = document.getElementById('tasa-banner');
  if (!b) return;
  const show = _tasaVencida();
  b.style.display = show ? 'flex' : 'none';
  const app = document.querySelector('.app-content');
  if (app) app.style.paddingTop = show ? '36px' : '';
}

function toggleSidebar() {
  if (window.innerWidth <= 768) {
    toggleMobileSidebar();
    return;
  }
  const collapsed = document.body.classList.toggle('sb-collapsed');
  localStorage.setItem('fc_sidebar', collapsed ? '0' : '1');
}
function toggleMobileSidebar() {
  document.body.classList.toggle('sb-mobile-open');
}
function closeMobileSidebar() {
  document.body.classList.remove('sb-mobile-open');
}
function setActiveBnTab(id) {
  document.querySelectorAll('.bn-tab').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function updateBnBadges() {
  const fF = (db.facturas||[]).filter(f=>f.empresa==='farmacia').length;
  const fD = (db.facturas||[]).filter(f=>f.empresa==='drogueria').length;
  const fTot = fF + fD;
  const pF = (db.prestamos||[]).filter(p=>p.activo&&p.entidad==='FARMACIA').length;
  const pD = (db.prestamos||[]).filter(p=>p.activo&&p.entidad==='DROGUERIA').length;
  const pTot = pF + pD;
  const bF = document.getElementById('bn-badge-facturas');
  const bP = document.getElementById('bn-badge-prestamos');
  if (bF) { bF.textContent = fTot || ''; bF.style.display = fTot ? 'block' : 'none'; }
  if (bP) { bP.textContent = pTot || ''; bP.style.display = pTot ? 'block' : 'none'; }
}

function _modOfTab(tab){ try{ for(var i=0;i<PERM_MODS.length;i++){ if(PERM_MODS[i].tabs.indexOf('tab-'+tab)>=0) return PERM_MODS[i].k; } }catch(e){} return null; }
function _tabAllowed(tab){
  try{
    if(typeof currentRole!=='undefined' && currentRole==='admin') return true;
    var roles=(typeof TAB_ROLES!=='undefined'&&TAB_ROLES[tab])||[];
    var mk=_modOfTab(tab);
    var eff=(typeof _userEff==='function')?_userEff(typeof currentUser!=='undefined'?currentUser:''):null;
    if(roles.indexOf(currentRole)>=0){ if(mk&&eff&&eff[mk]===0) return false; return true; }
    if(mk&&eff&&eff[mk]===1) return true;
    return false;
  }catch(e){ return ((TAB_ROLES[tab]||[]).indexOf(currentRole)>=0); }
}
function applyRoleUI() {
  // 1. Mostrar/ocultar pestañas según TAB_ROLES
  Object.entries(TAB_ROLES).forEach(([tab, roles]) => {
    const el = document.getElementById('tab-' + tab);
    if (el) el.style.display = _tabAllowed(tab) ? '' : 'none';
  });

  // 2. Ocultar secciones del sidebar que no tienen ninguna pestaña visible
  document.querySelectorAll('.sidebar-section').forEach(sec => {
    let next = sec.nextElementSibling;
    let anyVisible = false;
    while (next && !next.classList.contains('sidebar-section')) {
      if (next.classList.contains('nav-tab')) {
        var _vis; try{ _vis=(next.style.display!=='none')&&(getComputedStyle(next).display!=='none'); }catch(e){ _vis=(next.style.display!=='none'); }
        if(_vis){ anyVisible = true; break; }
      }
      next = next.nextElementSibling;
    }
    sec.style.display = anyVisible ? '' : 'none';
  });

  // 3. Bottom nav — mostrar solo lo que el rol puede ver
  const bnMap = {
    'bn-panel':    ['mayra','grismar','admin'],
    'bn-facturas': ['mayra','grismar','admin'],
    'bn-prestamos':['mayra','admin'],
    'bn-historial':['mayra','grismar','admin'],
    'bn-verif':    ['ines'],
    'bn-gerencia': ['gerente','admin'],
  };
  Object.entries(bnMap).forEach(([id, roles]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = roles.includes(currentRole) ? '' : 'none';
  });

  // 4. Nombre de usuario en header
  const ui = document.getElementById('user-indicator');
  if (ui) ui.textContent = getUserNombre(currentUser);

  // 5. Si la pestaña activa no está permitida, ir a la primera permitida
  const allowed = Object.keys(TAB_ROLES).filter(t => _tabAllowed(t));
  let _savedTab=null; try{_savedTab=localStorage.getItem('fc_active_tab');}catch(e){}
  if (_savedTab && allowed.includes(_savedTab)) showTab(_savedTab);
  else if (!allowed.includes(activeTab)) showTab(allowed[0] || 'gerencia');
}


// ── Farmacia Claret · Tasa ──────────────────────────────────────────────────


// ══════════════════════════════════════════════════════════════
// Vigilante de errores — captura fallos reales de la app y los
// guarda en Supabase (tabla error_log) para que el agente diario
// los revise. Silencioso: nunca molesta al usuario.
// ══════════════════════════════════════════════════════════════
var _errVistos={}, _errEnviados=0, _ERR_MAX=15;
function _errVersion(){ try{ var m=(document.getElementById('ver-badge')||{}).textContent||''; return m.trim(); }catch(e){ return ''; } }
function _errReportar(mensaje, stack, modulo){
  try{
    if(!mensaje) return;
    mensaje=String(mensaje).slice(0,400);
    // ignorar ruido que no es culpa de la app
    if(/ResizeObserver|Script error|Load failed|NetworkError when attempting|Failed to fetch/i.test(mensaje)) return;
    var clave=mensaje.slice(0,120);
    if(_errVistos[clave]) return;              // el mismo error no se manda dos veces por sesión
    if(_errEnviados>=_ERR_MAX) return;         // tope por sesión
    _errVistos[clave]=1; _errEnviados++;
    if(typeof supabaseClient==='undefined'||!supabaseClient) return;
    supabaseClient.from('error_log').insert([{
      usuario:(typeof currentUser!=='undefined'?currentUser:null),
      rol:(typeof currentRole!=='undefined'?currentRole:null),
      modulo:modulo||((typeof activeTab!=='undefined')?activeTab:null),
      mensaje:mensaje,
      stack:(stack?String(stack).slice(0,2000):null),
      url:(location?location.href.slice(0,300):null),
      agente:(navigator&&navigator.userAgent?navigator.userAgent.slice(0,250):null),
      version:_errVersion()
    }]).then(function(){}).catch(function(){});
  }catch(e){}
}
try{
  window.addEventListener('error', function(ev){
    try{ _errReportar((ev&&ev.message)||'error', (ev&&ev.error&&ev.error.stack)||((ev&&ev.filename)?(ev.filename+':'+ev.lineno):'')); }catch(e){}
  });
  window.addEventListener('unhandledrejection', function(ev){
    try{ var r=ev&&ev.reason; _errReportar('Promesa sin manejar: '+((r&&r.message)||r||'?'), r&&r.stack); }catch(e){}
  });
}catch(e){}

// ── Coma decimal (Venezuela): teclear ',' en un campo numérico escribe el punto decimal ──
document.addEventListener('keydown', function(ev){
  try{
    var t=ev.target;
    if(!t||t.tagName!=='INPUT'||t.type!=='number'||ev.key!==',') return;
    ev.preventDefault();
    var v=String(t.value||'');
    if(v.indexOf('.')>=0) return; // ya tiene decimal
    t.type='text'; t.inputMode='decimal'; // para poder insertar donde está el cursor
    var pos=(t.selectionStart!=null)?t.selectionStart:v.length;
    t.value=v.slice(0,pos)+'.'+v.slice(pos);
    try{ t.setSelectionRange(pos+1,pos+1); }catch(_e){}
    t.dispatchEvent(new Event('input',{bubbles:true}));
  }catch(_e){}
}, true);
function numComa(v){
  v=(''+(v==null?'':v)).trim();
  if(v.indexOf(',')>=0){ v=(v.indexOf('.')>=0)?v.replace(/\./g,'').replace(',','.'):v.replace(',','.'); }
  v=parseFloat(v.replace(/[^0-9.\-]/g,'')); return isNaN(v)?0:v;
}
