
// ── Farmacia Claret · Config ─────────────────────────────────────────────────
const DB_KEY      = 'farmacia_claret_central_v1';
let _supabaseSynced = false; // Protege Supabase de sobreescrituras antes del primer sync
const ALERTA      = 7;
const BANCOS_LIST = ['BANESCO','BDV','BNC','CARIBE','MERCANTIL','PROVINCIAL','TESORO'];
const VERIF_BANCOS = ['MERCANTIL TDC','MERCANTIL TDB','PROVINCIAL TDC','PROVINCIAL TDB','BDV TDC','BDV TDB','CARIBE TDC','TESORO TDC'];

const SUPA_URL = 'https://qjrcvkdftnolqimymgms.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcmN2a2RmdG5vbHFpbXltZ21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODk1NjUsImV4cCI6MjA5MDQ2NTU2NX0.Jc2NNkDcVxy_XjO1bS6XcFnyxm_38Aue1k07LzR4NE0';

const supabaseClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);

// Mapa de nombre/rol para fallback de UI (sin contraseñas)
const USERS = {
  'mayra':   { role: 'mayra',   nombre: 'Mayra' },
  'grismar': { role: 'grismar', nombre: 'Grismar' },
  'ines':    { role: 'ines',    nombre: 'Inés' },
  'gerente': { role: 'gerente', nombre: 'Gerente' },
  'miguel':  { role: 'admin',   nombre: 'Miguel' },
};

const TAB_ROLES = {
  'panel':          ['mayra','grismar','admin'],
  'bancos':         ['mayra','admin'],
  'prestamos-fcia': ['mayra','admin'],
  'prestamos-drog': ['mayra','admin'],
  'fact-farmacia':  ['mayra','grismar','admin'],
  'fact-drogueria': ['mayra','grismar','admin'],
  'historial':      ['mayra','grismar','admin'],
  'verif-ines':     ['ines'],
  'gerencia':       ['gerente','admin'],
  'admin-panel':    ['admin'],
};

let filterState = {
  farmacia:  { estado:'all', proveedor:'all', sortCol:'vence', sortAsc:true, search:'' },
  drogueria: { estado:'all', proveedor:'all', sortCol:'vence', sortAsc:true, search:'' },
};


