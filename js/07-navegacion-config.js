let activeTab = 'bancos';
let histTab    = 'facturas';
let histFilter = { search: '', empresa: 'all', desde: '', hasta: '' , orden:'reciente'};

var EMPRESA='consolidado'; try{EMPRESA=localStorage.getItem('fc_empresa')||'consolidado';}catch(e){}
var EMP_TABS={'cierre':['farmacia','drogueria','consolidado'],'concil-cajas':['farmacia','drogueria','consolidado'],'mensajes':['drogueria','consolidado'],'vencimientos':['farmacia','drogueria','consolidado'],'compras':['farmacia','drogueria','consolidado'],'panel':['farmacia','drogueria','consolidado'],'bancos':['farmacia','drogueria','consolidado'],'prestamos':['farmacia','drogueria','consolidado'],'facturas':['farmacia','drogueria','consolidado'],'historial':['farmacia','drogueria','consolidado'],'verif-ines':['farmacia','drogueria','consolidado'],'cxc':['drogueria','consolidado'],'gerencia':['consolidado'],'admin-panel':['consolidado']};
var EMP_NAMES={farmacia:['Farmacia Claret','Sistema Central'],drogueria:['Droguería Clínica','Cobranzas y operaciones'],consolidado:['Claret · Consolidado','Vista general']};
var _loginEmpresa='consolidado';
function _setLoginEmp(e){
  _loginEmpresa=e; window._loginEmpresaTouched=true;
  var ov=document.getElementById('ov-login'); if(ov) ov.setAttribute('data-theme',e);
  function _sd(sel,d){var el=document.querySelector('#login-logo '+sel); if(el) el.style.display=d;}
  _sd('.llogo-farm', e==='farmacia'?'block':'none');
  _sd('.llogo-drog', e==='drogueria'?'flex':'none');
  _sd('.llogo-both', e==='consolidado'?'flex':'none');
  var c={farmacia:['Farmacia Claret','Sistema Central'],drogueria:['Droguería Clínica','Cobranzas y operaciones'],consolidado:['Claret · Consolidado','Vista general']}[e]||['',''];
  var lt=document.getElementById('login-title'); if(lt) lt.textContent=c[0];
  var ls=document.getElementById('login-sub'); if(ls) ls.textContent=c[1];
}
function _aplicarEmpresaUI(){
  var n=EMP_NAMES[EMPRESA]||EMP_NAMES.consolidado;
  var st=document.querySelector('.sidebar-title'); if(st) st.textContent=n[0];
  var ss=document.querySelector('.sidebar-sub'); if(ss) ss.textContent=n[1];
  var mt=document.querySelector('.mtb-title'); if(mt) mt.textContent=n[0];
}
function initEmpresa(){
  var e=EMPRESA;
  EMPRESA=e; document.body.dataset.empresa=e; _aplicarEmpresaUI();
}
function setEmpresa(e){
  EMPRESA=e; try{localStorage.setItem('fc_empresa',e);}catch(_e){}
  document.body.dataset.empresa=e; _aplicarEmpresaUI();
  var allowed=EMP_TABS[activeTab]; if(allowed && allowed.indexOf(e)<0 && typeof showTab==='function') showTab('bancos');
  if(window.innerWidth<=768 && typeof closeMobileSidebar==='function') closeMobileSidebar();
}

function setEmpresaCfg(username, emp, lock){
  if(!db.empresa_cfg) db.empresa_cfg={};
  if(!emp){ delete db.empresa_cfg[username]; } else { db.empresa_cfg[username]={emp:emp, lock:!!lock}; }
  if(typeof logAudit==='function') logAudit('admin.empresa_usuario', username+' -> '+(emp||'libre')+(lock?' (bloqueado)':''));
  saveDB(db); if(typeof showToast==='function') showToast('Acceso de '+username+' actualizado');
}
function _empCfgChange(username){
  var sel=document.getElementById('empcfg-'+username), lk=document.getElementById('emplock-'+username);
  setEmpresaCfg(username, sel?sel.value:'', lk?lk.checked:false);
}
function aplicarEmpresaUsuario(initial){
  try{
    if(typeof currentUser==='undefined'||!currentUser) return;
    var cfg=(db.empresa_cfg||{})[currentUser]||{};
    if(cfg.lock && cfg.emp){
      document.body.setAttribute('data-emplock','1');
      if(EMPRESA!==cfg.emp){ EMPRESA=cfg.emp; try{localStorage.setItem('fc_empresa',EMPRESA);}catch(e){} document.body.dataset.empresa=EMPRESA; _aplicarEmpresaUI(); var al=EMP_TABS[activeTab]; if(al&&al.indexOf(EMPRESA)<0&&typeof showTab==='function') showTab('bancos'); }
      return;
    }
    document.body.removeAttribute('data-emplock');
    if(initial && cfg.emp && !window._loginEmpresaTouched){
      EMPRESA=cfg.emp; try{localStorage.setItem('fc_empresa',EMPRESA);}catch(e){} document.body.dataset.empresa=EMPRESA; _aplicarEmpresaUI();
      var al2=EMP_TABS[activeTab]; if(al2&&al2.indexOf(EMPRESA)<0&&typeof showTab==='function') showTab('bancos');
    }
  }catch(e){}
}

function showTab(tab) {
  if (window.innerWidth <= 768) closeMobileSidebar();
  // Sync bottom nav active state
  const bnTabMap = {
    'panel':'bn-panel','facturas':'bn-facturas',
    'prestamos':'bn-prestamos',
    'historial':'bn-historial','verif-ines':'bn-verif','gerencia':'bn-gerencia'
  };
  if (bnTabMap[tab]) setActiveBnTab(bnTabMap[tab]);
  // Verificar permiso de rol
  if (currentRole && currentRole!=='admin' && typeof _tabAllowed==='function' && TAB_ROLES[tab] && !_tabAllowed(tab)) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById('page-'+tab);
  const tabEl = document.getElementById('tab-'+tab);
  if (page)  page.classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  activeTab = tab;
  try{localStorage.setItem('fc_active_tab', tab);}catch(e){}
  renderTab(tab);
}

// ══════════════════════════════════════════════════════════════
// CONTABILIDAD — Gastos/Egresos + Estado de Resultados (P&L)
// ══════════════════════════════════════════════════════════════
var CONTA_GRUPOS = ['PERSONAL','IMPUESTOS','BANCOS','FUNCIONAMIENTO'];
var CONTA_GRUPO_LBL = {PERSONAL:'Personal',IMPUESTOS:'Impuestos',BANCOS:'Bancos',FUNCIONAMIENTO:'Funcionamiento'};
var CONTA_CONCEPTOS = {
  PERSONAL:['Bono mensual','Nómina','Sorteo mensual','Beneficio alimentación','Complemento alimentación','Obligaciones laborales','Póliza de seguro'],
  IMPUESTOS:['SEDEMAT 1% actividad económica','SEDEMAT servicios municipales','SENIAT LPP','SENIAT 1% ant. ISLR'],
  BANCOS:['Comisiones bancarias','Intereses préstamos bancarios','Intereses préstamos personales'],
  FUNCIONAMIENTO:['Agua potable','Bolsas para despacho','Comisiones vendedores','Envíos y encomiendas','Gasolina','Electricidad','Honorarios profesionales','Internet','Página web','Papelería y suministros','Publicidad','Varios ocasional','Vigilancia']
};
var _contaView = 'pyl';   // 'pyl' | 'gastos'
var _contaMes  = null;    // 'YYYY-MM'

function _contaUid(){ return 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function _contaEmpLabel(emp){ return emp==='FARMACIA' ? 'Farmacia' : 'Droguería'; }
function _mesLabel(p){ var m=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']; var a=(p||'').split('-'); return (m[parseInt(a[1],10)]||'')+' '+(a[0]||''); }
