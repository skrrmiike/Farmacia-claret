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

function saveDB(data) {
  _saving = true;
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  saveSections(data)
    .catch(err => { console.warn('Supabase sync error:', err); })
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
  const ALL_SECTIONS = ['facturas','historial','prestamos','bancos','settings','tasas','users','auditlog'];

  const rows = ALL_SECTIONS
    .map(name => ({
      section_name: name,
      data: (name === 'tasas' || name === 'bancos') ? (data[name] || {}) : (data[name] || []),
      updated_at: now
    }))
    .filter(r => {
      // Nunca sobreescribir secciones críticas con vacíos antes del primer sync
      if (CRITICAL.includes(r.section_name) && Array.isArray(r.data) && r.data.length === 0 && !_supabaseSynced) return false;
      // NUNCA pisar la tasa remota con valores por defecto/vacíos antes del primer sync
      if (!_supabaseSynced && r.section_name === 'settings' && (!r.data || r.data.tasa_fecha == null)) return false;
      if (!_supabaseSynced && r.section_name === 'tasas'    && (!r.data || Object.keys(r.data).length === 0)) return false;
      // Solo guardar si el contenido cambió desde la última vez (ahorra escrituras)
      const serialized = JSON.stringify(r.data);
      if (_savedSnapshot[r.section_name] === serialized) return false;
      _savedSnapshot[r.section_name] = serialized;
      return true;
    });

  if (rows.length === 0) return;
  const { error } = await supabaseClient.from('app_sections').upsert(rows, { onConflict: 'section_name' });
  if (error) throw error;
}

async function syncFromSupabase(silent) {
  try {
    const { data: rows, error } = await supabaseClient.from('app_sections').select('*');
    if (error) throw error;
    const s = {};
    rows.forEach(r => s[r.section_name] = r.data);
    db.facturas  = s.facturas  ?? db.facturas;
    db.historial = s.historial ?? db.historial;
    db.prestamos = (s.prestamos && s.prestamos.length > 0) ? s.prestamos : db.prestamos;
    db.bancos    = s.bancos    ?? db.bancos;
    // --- Tasa: el histórico de tasas es la fuente de verdad ---
    // Unir ambos lados: no se pierde ninguna fecha (lo local gana si hay conflicto)
    db.tasas = Object.assign({}, s.tasas || {}, db.tasas || {});
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
    const _snapshotKeys = ['facturas','historial','prestamos','bancos','settings','tasas','users','auditlog'];
    _snapshotKeys.forEach(k => { _savedSnapshot[k] = JSON.stringify(db[k] || null); });
    console.log('[Farmacia Claret] Sync OK', new Date().toLocaleTimeString('es-VE'));
  } catch(err) {
    console.warn('[Farmacia Claret] Sync error:', err);
    if (!silent) showToast('Sin conexión – datos locales');
  }
}

// ── Supabase Realtime — cambios en tiempo real ────────────────────────────────
function startRealtime() {
  supabaseClient
    .channel('farmacia-sync')
    .on('postgres_changes', {
      event:  'UPDATE',
      schema: 'public',
      table:  'app_sections'
    }, (payload) => {
      const { section_name, data } = payload.new;
      if (section_name && db[section_name] !== undefined) {
        db[section_name] = data;
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        if (!_saving) {
          renderTab(activeTab);
          renderBadges();
          renderTasaHeader();
          // Si actualizaron la tasa, también refrescar el banner de aviso
          if (section_name === 'settings' || section_name === 'tasas') {
            checkTasaBanner();
            // Refrescar los campos de tasa si el formulario está abierto
            if (document.getElementById('ov-factura')?.classList.contains('open')) {
              if (typeof mostrarTasaEnForm === 'function') mostrarTasaEnForm();
            }
          }
        }
      }
    })
    .subscribe();
}


