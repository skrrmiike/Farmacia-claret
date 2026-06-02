// ── PWA ──────────────────────────────────────────────────────────────────────
(function initPWA() {
  // Inject manifest via data URI
  const manifest = {
    name: 'Farmacia Claret — Sistema Central',
    short_name: 'Claret',
    description: 'Sistema de gestión financiera — Farmacia & Droguería Claret',
    start_url: '.',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#1E38A6',
    icons: [
      { src: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1160 1160"><rect width="1160" height="1160" rx="192" fill="#79C820"/><g transform="translate(44.5,1160) scale(0.1,-0.1)" fill="#1E38A6" fill-rule="evenodd" stroke="none"><path d="M0 5800 l0 -5800 5355 0 5355 0 0 5800 0 5800 -5355 0 -5355 0 0 -5800z m6058 2113 c5 -21 28 -104 50 -184 72 -257 119 -495 148 -749 21 -188 15 -621 -11 -780 -64 -399 -243 -772 -459 -959 -105 -91 -215 -75 -285 41 -21 36 -26 55 -26 113 1 87 15 116 104 210 150 159 247 374 297 661 25 140 30 468 10 654 -19 185 -56 400 -69 400 -13 0 -42 -36 -112 -141 -255 -382 -414 -967 -480 -1769 -8 -96 -15 -195 -15 -220 l0 -45 116 -57 c229 -113 524 -307 684 -450 176 -158 375 -375 474 -517 191 -272 341 -577 430 -874 46 -150 51 -183 36 -237 -34 -131 -152 -195 -259 -141 -33 17 -91 86 -91 109 0 16 -79 252 -114 342 -187 471 -542 895 -1001 1191 -391 254 -831 423 -1435 553 -369 79 -857 119 -1425 116 -41 0 -105 52 -132 108 -22 46 -25 62 -21 123 6 76 34 131 90 172 96 72 902 34 1452 -68 260 -48 519 -114 730 -185 49 -16 92 -27 97 -24 5 3 9 29 9 57 0 102 37 441 71 657 116 731 342 1302 648 1635 60 65 175 165 226 195 38 24 219 97 241 99 6 1 16 -16 22 -36z m-3032 -32 c50 -23 83 -64 128 -162 99 -215 170 -517 197 -844 17 -207 7 -764 -16 -827 -18 -50 -73 -114 -112 -129 -58 -22 -140 -3 -182 42 -57 60 -56 51 -56 484 0 360 -2 415 -22 550 -35 239 -77 390 -146 534 -54 110 -60 176 -24 254 47 103 138 141 233 98z m5042 -2796 c82 -35 126 -106 126 -205 0 -109 -36 -159 -179 -244 -64 -38 -178 -116 -250 -173 -13 -10 -170 -150 -200 -178 -93 -86 -201 -233 -271 -365 -28 -54 -47 -77 -79 -95 -111 -66 -235 2 -266 143 -19 90 15 178 137 363 158 237 437 493 760 695 122 77 156 86 222 59z"/></g></svg>'), sizes: '192x192', type: 'image/svg+xml' },
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const link = document.getElementById('pwa-manifest');
  if (link) link.href = url;

  // Register service worker for offline cache
  if ('serviceWorker' in navigator) {
    const swCode = `
const CACHE = 'farmacia-claret-v1';
const OFFLINE_URLS = [self.location.href || '/'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200) {
        const rc = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, rc));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});`;
    const swBlob = new Blob([swCode], {type: 'application/javascript'});
    const swUrl  = URL.createObjectURL(swBlob);
    navigator.serviceWorker.register(swUrl).then(reg => {
      console.info('[PWA] Service Worker registrado:', reg.scope);
    }).catch(e => console.warn('[PWA] SW error:', e));
  }
})();

// ── Init ─────────────────────────────────────────────────────────────────────
(function() {
  // Parámetro de emergencia: ?reset=1 limpia localStorage y recarga sin él
  if (new URLSearchParams(location.search).get('reset') === '1') {
    localStorage.clear(); sessionStorage.clear();
    location.replace(location.pathname); return;
  }
  db = loadDB();
  db.facturas  = limpiarDecimales(db.facturas);
  db.historial = limpiarDecimales(db.historial);
  saveDB(db);
  renderTasaHeader();
  renderPanel();
  renderBadges();

  // Restaurar estado del sidebar
  if (localStorage.getItem('fc_sidebar') === '0') document.body.classList.add('sb-collapsed');
  // Restaurar sesión activa
  const savedUser = sessionStorage.getItem('fc_user');
  const savedRole = sessionStorage.getItem('fc_role');
  const savedDbUser = db.users && db.users.find(u=>u.username===savedUser&&u.activo);
  if (savedUser && (savedDbUser || USERS[savedUser])) {
    currentUser = savedUser;
    currentRole = savedRole || (savedDbUser?.role) || USERS[savedUser]?.role || 'mayra';
    document.getElementById('ov-login').style.display = 'none';
    document.body.dataset.role = currentRole;
    applyRoleUI();
    resetInactivityTimer();
    syncFromSupabase(true).then(() => { migrateFromOldApps(); autoBackupSemanal(); });
    startRealtime();
  }

  const s = db.settings;
  checkTasaBanner();
  if (getTasa() && !(db.tasas && db.tasas[HOY()] != null) && s.tasa_fecha !== HOY()) {
    setTimeout(() => showToast('Tasa no actualizada hoy (última: ' + fmtDate(s.tasa_fecha||'—') + ')'), 1200);
  }
})();

