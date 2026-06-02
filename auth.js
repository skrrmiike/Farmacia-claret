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

async function doLogin() {
  const u     = (document.getElementById('login-user').value||'').trim().toLowerCase();
  const p     = document.getElementById('login-pass').value||'';
  const errEl = document.getElementById('login-error');
  const btn   = document.querySelector('#ov-login button[onclick]');
  if (!u || !p) { errEl.textContent = 'Ingresa usuario y contraseña'; return; }
  errEl.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
  const resetBtn = () => { if (btn) { btn.disabled = false; btn.textContent = 'Ingresar →'; } };
  try {
    // 1. Sincronizar usuarios desde Supabase PRIMERO
    // 1. Validar PRIMERO con datos locales (sin red, no se puede colgar)
    await seedUsersIfEmpty();
    const hash    = await hashPassword(p);
    let userObj   = (db.users||[]).find(x => x.username===u && x.activo && x.passwordHash===hash) || null;
    // 2. Solo si no coincide localmente, refrescar usuarios desde Supabase (límite 4s) y reintentar
    if (!userObj) {
      try {
        const _fetchUsers = supabaseClient
          .from('app_sections').select('data').eq('section_name','users').single();
        const _timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000));
        const { data: row } = await Promise.race([_fetchUsers, _timeout]);
        if (row?.data && Array.isArray(row.data) && row.data.some(x => x.passwordHash)) {
          db.users = row.data;
          try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) {}
          userObj = (db.users||[]).find(x => x.username===u && x.activo && x.passwordHash===hash) || null;
        }
      } catch(e) { console.warn('[Login] refresh usuarios:', e.message||e); }
    }
    if (!userObj) {
      const legacy = (db.users||[]).find(x => x.username===u && x.activo && !x.passwordHash);
      resetBtn();
      document.getElementById('login-pass').value = '';
      errEl.textContent = legacy
        ? 'Cuenta requiere actualización. Contacta a miguel.'
        : 'Usuario o contraseña incorrectos';
      return;
    }
    // 4. Login OK
    currentUser = u; currentRole = userObj.role;
    sessionStorage.setItem('fc_user', u);
    sessionStorage.setItem('fc_role', userObj.role);
    document.getElementById('login-pass').value = '';
    document.getElementById('ov-login').style.display = 'none';
    document.body.dataset.role = currentRole;
    logAudit('auth.login','Sesión iniciada');
    checkTasaBanner(); resetInactivityTimer();
    applyRoleUI(); renderTab(activeTab); renderBadges(); renderTasaHeader();
    syncFromSupabase(true).then(() => migrateFromOldApps());
  } catch(e) {
    console.error('[Login] Error inesperado:', e);
    resetBtn();
    document.getElementById('login-pass').value = '';
    errEl.textContent = 'Error al iniciar sesión. Intenta de nuevo.';
  }
}

function doLogout() {
  logAudit('auth.logout','Sesión cerrada');
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
  db.auditlog.unshift({
    ts:      new Date().toISOString(),
    user:    currentUser || 'sistema',
    nombre:  getUserNombre(currentUser),
    action,
    detail:  detail || ''
  });
  // Cap at 500 entries to prevent localStorage bloat
  if (db.auditlog.length > 500) db.auditlog = db.auditlog.slice(0, 500);
  if (db.auditlog.length > 500) db.auditlog = db.auditlog.slice(0, 500);
}

function checkTasaBanner() {
  const b = document.getElementById('tasa-banner');
  if (!b) return;
  const hoy = HOY();
  const tieneHoy = (db.tasas && db.tasas[hoy] != null) || (db.settings && db.settings.tasa_fecha === hoy);
  const show = !tieneHoy;
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

function applyRoleUI() {
  // 1. Mostrar/ocultar pestañas según TAB_ROLES
  Object.entries(TAB_ROLES).forEach(([tab, roles]) => {
    const el = document.getElementById('tab-' + tab);
    if (el) el.style.display = roles.includes(currentRole) ? '' : 'none';
  });

  // 2. Ocultar secciones del sidebar que no tienen ninguna pestaña visible
  document.querySelectorAll('.sidebar-section').forEach(sec => {
    let next = sec.nextElementSibling;
    let anyVisible = false;
    while (next && !next.classList.contains('sidebar-section')) {
      if (next.classList.contains('nav-tab') && next.style.display !== 'none') {
        anyVisible = true; break;
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
  const allowed = Object.entries(TAB_ROLES)
    .filter(([,roles]) => roles.includes(currentRole))
    .map(([tab]) => tab);
  if (!allowed.includes(activeTab)) showTab(allowed[0] || 'gerencia');
}

