var ROLE_ORDER = ['admin','gerente','supervisor','reto','ventas','compras','mayra','grismar','ines','angelica','veronica','yapague'];
function _roleOptions(sel){ return ROLE_ORDER.map(function(r){ return '<option value="'+r+'"'+((sel===r)?' selected':'')+'>'+(ROLE_LABELS[r]||r)+'</option>'; }).join(''); }
var ROLE_COLOR = { admin:'#1E38A6', gerente:'#2563eb', supervisor:'#db2777', reto:'#ea580c', ventas:'#e11d48', compras:'#0d9488', mayra:'#7c3aed', grismar:'#0891b2', ines:'#059669', angelica:'#db2777', veronica:'#0f766e', yapague:'#c2410c' };
function _roleColor(r){ return ROLE_COLOR[r]||'#64748b'; }
function _roleLabel(r){ return ROLE_LABELS[r]||r; }
function _auIni(nombre,username){ var s=(nombre||username||'?').trim().split(/\s+/); var a=(s[0]||'?')[0]||'?'; var b=s.length>1?(s[s.length-1][0]||''):''; return (a+b).toUpperCase(); }
var _auQuery='';
function _auFilter(){ var q=(document.getElementById('au-search')||{}).value||''; _auQuery=q.toLowerCase().trim(); var c=document.getElementById('admin-users-list'); if(c)c.innerHTML=_userTableHTML(_adminUsers); }
var PERM_CAT_ORDER=['Operación diaria','Caja y conciliación','Finanzas','Compras','Personal y desempeño','Gerencia y familia'];
var PERM_MODS = [
  {k:'hud',label:'Inicio (Claret OS)',tabs:['tab-inicio'],cat:'Operación diaria'},
  {k:'vencimientos',label:'Plan de Vencimientos',tabs:['tab-vencimientos'],cat:'Operación diaria'},
  {k:'mensajes',label:'Mensajes WhatsApp',tabs:['tab-mensajes'],cat:'Operación diaria'},
  {k:'reto',label:'Reto de Ventas',tabs:['tab-reto'],cat:'Operación diaria'},
  {k:'cierre',label:'Cierre de Caja',tabs:['tab-cierre'],cat:'Caja y conciliación'},
  {k:'concilcajas',label:'Conciliación de Cajas',tabs:['tab-concil-cajas'],cat:'Caja y conciliación'},
  {k:'ines',label:'Ing. Administrativo',tabs:['tab-verif-ines'],cat:'Caja y conciliación'},
  {k:'panel',label:'Panel',tabs:['tab-panel'],cat:'Finanzas'},
  {k:'bancos',label:'Bancos & Pagos',tabs:['tab-bancos','tab-bancos-hist','tab-bancos-concil'],cat:'Finanzas'},
  {k:'prestamos',label:'Préstamos',tabs:['tab-prestamos'],cat:'Finanzas'},
  {k:'prest_resumen',label:'Próximos Pagos (préstamos)',tabs:['tab-prest-resumen'],cat:'Finanzas'},
  {k:'facturas',label:'Facturas',tabs:['tab-facturas'],cat:'Finanzas'},
  {k:'historial',label:'Historial',tabs:['tab-historial'],cat:'Finanzas'},
  {k:'cxc',label:'Cuentas por Cobrar',tabs:['tab-cxc'],cat:'Finanzas'},
  {k:'planpagos',label:'Plan de Pagos (Proveedores + Calendario)',tabs:['tab-cxp-prov','tab-cal-pagos'],cat:'Finanzas'},
  {k:'compras',label:'Compras',tabs:['tab-compras'],cat:'Compras'},
  {k:'almacen',label:'Almacén (depósito)',tabs:['tab-almacen'],cat:'Compras'},
  {k:'reparto',label:'Repartidor de Caja',tabs:['tab-reparto'],cat:'Finanzas'},
  {k:'turnos',label:'Turnos',tabs:['tab-turnos'],cat:'Personal y desempeño'},
  {k:'vales',label:'Vales',tabs:['tab-vales'],cat:'Personal y desempeño'},
  {k:'rrhh',label:'RRHH · Relación (Verónica)',tabs:['tab-rrhh'],cat:'Personal y desempeño'},
  {k:'desempeno',label:'Desempeño de trabajadores',tabs:['tab-desempeno'],cat:'Personal y desempeño'},
  {k:'vacaciones',label:'Vacaciones',tabs:['tab-vacaciones'],cat:'Personal y desempeño'},
  {k:'anomalias',label:'Banco de Anomalías',tabs:['tab-anomalias'],cat:'Personal y desempeño'},
  {k:'gerencia',label:'Gerencia',tabs:['tab-gerencia'],cat:'Gerencia y familia'},
  {k:'yapague',label:'Ya Pagué (pedidos y fondo)',tabs:['tab-yapague'],cat:'Gerencia y familia'},
  {k:'consumo',label:'Consumo Familia',tabs:['tab-consumo'],cat:'Gerencia y familia'}
];
var _permsUser=null;
var PERM_USERS=[
 {u:'gerente',n:'Jose',role:'gerente',c:'#2563eb',sub:'Gerente'},
 {u:'mayra',n:'Mayra',role:'mayra',c:'#7c3aed',sub:'Administración'},
 {u:'grismar',n:'Grismar',role:'grismar',c:'#0891b2',sub:'Caja / facturas'},
 {u:'ines',n:'Inés',role:'ines',c:'#059669',sub:'Ing. administrativo'},
 {u:'angelica',n:'Angélica',role:'supervisor',c:'#db2777',sub:'Supervisor (Cajas)'},
 {u:'paul',n:'Paul',role:'supervisor',c:'#ea580c',sub:'Supervisor (Cajas)'},
 {u:'radamel',n:'Radamel',role:'supervisor',c:'#0d9488',sub:'Supervisor (Cajas)'},
 {u:'yuna',n:'Yuna',role:'supervisor',c:'#7c3aed',sub:'Supervisor (Cajas)'},
 {u:'roger',n:'Roger',role:'reto',c:'#f59e0b',sub:'Supervisor del Reto'},
 {u:'edilso',n:'Edilso',role:'compras',c:'#0d9488',sub:'Compras'},
 {u:'leonard',n:'Leonard',role:'compras',c:'#4f46e5',sub:'Compras'},
 {u:'nilsa',n:'Nilsa',role:'ventas',c:'#e11d48',sub:'Ventas (Droguería)'},
 {u:'veronica',n:'Verónica',role:'veronica',c:'#0f766e',sub:'Nómina / Vales'},
 {u:'mariaines',n:'María Inés',role:'yapague',c:'#c2410c',sub:'Ya Pagué'},
 {u:'jaime',n:'Jaime',role:'reto',c:'#65a30d',sub:'Reporta anomalías'}
];
var PERM_COMP=[{k:'comp_precios',label:'Compras · Precios'},{k:'comp_calc',label:'Compras · Calculadora'}];
function _permUserList(){
  var out=PERM_USERS.slice(); var have={}; out.forEach(function(x){have[(''+x.u).toLowerCase()]=1;});
  var PAL=['#2563eb','#7c3aed','#0891b2','#059669','#db2777','#ea580c','#0d9488','#e11d48','#f59e0b','#4f46e5'];
  (_adminUsers||[]).forEach(function(u,ix){
    var un=(''+(u.username||'')).toLowerCase(); if(!un||have[un]||u.role==='admin')return;
    have[un]=1; out.push({u:un,n:u.nombre||u.username,role:u.role||'',c:PAL[ix%PAL.length],sub:(typeof _roleLabel==='function'?_roleLabel(u.role):u.role)||'—'});
  });
  return out;
}
function _userRoleOf(u){ var L=_permUserList(); for(var i=0;i<L.length;i++)if(L[i].u===u)return L[i].role; return (typeof USERS!=='undefined'&&USERS[u]&&USERS[u].role)||(typeof currentRole!=='undefined'?currentRole:''); }
function _userEff(u){ var role=_userRoleOf(u); var out={}; for(var i=0;i<PERM_MODS.length;i++)out[PERM_MODS[i].k]=0; out.fact=0; out.prest_cuotas=0; out.prest_historial=0; out.ia=0; out.hud=1; out.vencimientos=1; for(var c=0;c<PERM_COMP.length;c++)out[PERM_COMP[c].k]=1; var base=PERM_DEF[role]||{}; for(var k in base)out[k]=base[k]; var ro=(_perms&&_perms[role])||{}; for(var k2 in ro)out[k2]=ro[k2]; var uo=(_permsUser&&_permsUser[u])||{}; for(var k3 in uo)out[k3]=uo[k3]; return out; }
function _permGet(role){
  var base = PERM_DEF[role] || {};
  var ov = (_perms && _perms[role]) || {};
  var out = {}; for (var k in base) out[k] = (ov[k]===undefined ? base[k] : ov[k]);
  return out;
}
function puedePerm(cat,key){
  if (typeof currentRole!=='undefined' && currentRole==='admin') return true;
  var p=_userEff(typeof currentUser!=='undefined'?currentUser:'');
  if (cat==='prest'&&key==='cuotas')    return p.prest_cuotas!==0;
  if (cat==='prest'&&key==='historial') return p.prest_historial!==0;
  if (cat==='fact')                     return p.fact!==0;
  if (cat==='ia')                       return p.ia!==0;
  if (cat==='comp')                     return p['comp_'+key]!==0;
  if (cat==='mod')                      return p[key]!==0;
  return true;
}
// Aditivo: SOLO agrega restricciones (display:none) sobre lo permitido por defecto.
function aplicarPermisos(){
  try{
    var css='';
    if (typeof currentRole!=='undefined' && currentRole && currentRole!=='admin'){
      var p=_userEff(typeof currentUser!=='undefined'?currentUser:'');
      for (var m=0;m<PERM_MODS.length;m++){ var mod=PERM_MODS[m]; if(!p[mod.k]){ for(var t=0;t<mod.tabs.length;t++) css+='#'+mod.tabs[t]+'{display:none!important}'; } }
      if(!p.panel && !p.bancos) css+='#sec-modulos{display:none!important}';
      if(!p.prestamos && !p.prest_resumen) css+='#sec-prestamos{display:none!important}';
      if(!p.facturas)           css+='#sec-facturas{display:none!important}';
      if(!p.historial && !p.ines) css+='#sec-registros{display:none!important}';
      if(!p.gerencia)           css+='#section-gerencia-admin{display:none!important}';
      if(!p.cxc) css+='#sec-cobranzas{display:none!important}';
      if(!p.conta) css+='#sec-conta{display:none!important}';
      if(!p.turnos && !p.vales && !p.rrhh) css+='#sec-personal{display:none!important}';
      if(!p.compras) css+='#sec-compras{display:none!important}';
      if(!p.ia)                 css+='#ia-fab{display:none!important}';
      if(!p.fact)               css+='.fact-write-only{display:none!important}';
      if(!p.prest_historial)    css+='.grismar-hide{display:none!important}';
    }
    var st=document.getElementById('perm-dyn');
    if(!st){ st=document.createElement('style'); st.id='perm-dyn'; (document.head||document.documentElement).appendChild(st); }
    st.textContent=css;
    try{
      if (typeof currentRole!=='undefined' && currentRole && currentRole!=='admin' && typeof activeTab!=='undefined'){
        var pa=_userEff(currentUser), okA=true;
        for (var m2=0;m2<PERM_MODS.length;m2++){ var md=PERM_MODS[m2]; if(md.tabs.indexOf('tab-'+activeTab)>=0 && !pa[md.k]) okA=false; }
        if(!okA){ var first=null; for(var m3=0;m3<PERM_MODS.length;m3++){ if(pa[PERM_MODS[m3].k]){ first=PERM_MODS[m3].tabs[0].replace('tab-',''); break; } } if(first && typeof showTab==='function') showTab(first); }
      }
    }catch(e){}
  }catch(e){}
}
async function savePerms(){
  try{
    const _now=new Date().toISOString();
    const { error } = await supabaseClient.from('app_sections').upsert([{ section_name:'permisos_user', data:(_permsUser||{}), updated_at:_now }], { onConflict:'section_name' });
    if (error) throw error;
    if (typeof logAudit==='function') logAudit('admin.permisos','Permisos por persona actualizados');
    showToast('Permisos guardados y aplicados');
    aplicarPermisos();
  }catch(e){ showToast('Error al guardar permisos: '+(e.message||e)); }
}
function _permSet(role,key,checked){
  if(!_perms) _perms = JSON.parse(JSON.stringify(PERM_DEF));
  if(!_perms[role]) _perms[role] = JSON.parse(JSON.stringify(PERM_DEF[role]||{}));
  _perms[role][key] = checked?1:0;
}
function restablecerPerms(){
  if(!confirm('¿Restablecer TODOS los permisos por persona a los valores por defecto (según su cargo)?')) return;
  _permsUser = {};
  renderPermisos();
  showToast('Restablecido (recuerda Guardar)');
}
function _permRow(role,key,label,val){
  var on = val!==0;
  return '<label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 2px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--border)">'+
    '<span>'+esc(label)+'</span>'+
    '<span class="psw"><input type="checkbox" '+(on?'checked':'')+' onchange="_permSet(\''+role+'\',\''+key+'\',this.checked)"><span class="psl"></span></span>'+
  '</label>';
}
function _permSetUser(u,key,checked){ if(!_permsUser)_permsUser={}; if(!_permsUser[u])_permsUser[u]={}; _permsUser[u][key]=checked?1:0; if(checked && key.indexOf('comp_')===0 && _permsUser[u].compras!==1){ _permsUser[u].compras=1; if(typeof renderPermisos==='function') renderPermisos(); } }
function _permRowU(u,key,label,val){ var on=val!==0; return '<label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 2px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--border)"><span>'+esc(label)+'</span><span class="psw"><input type="checkbox" '+(on?'checked':'')+' onchange="_permSetUser(\''+u+'\',\''+key+'\',this.checked)"><span class="psl"></span></span></label>'; }
function renderPermisos(){
  var el=document.getElementById('admin-inner'); if(!el) return;
  var css='<style>.psw{position:relative;display:inline-block;width:42px;height:24px;flex-shrink:0}.psw input{opacity:0;width:0;height:0;position:absolute;margin:0}.psw .psl{position:absolute;inset:0;background:#cbd5e1;border-radius:999px;transition:.18s;cursor:pointer}.psw .psl:before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.18s;box-shadow:0 1px 2px rgba(0,0,0,.25)}.psw input:checked + .psl{background:var(--green)}.psw input:checked + .psl:before{transform:translateX(18px)}.permcard{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface)}.permcard-hd{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border)}.permcard-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0}.permsec{font-size:10px;font-weight:700;color:var(--muted);margin:13px 0 2px;text-transform:uppercase;letter-spacing:.06em}.pacc{border:1px solid var(--border);border-radius:12px;margin-bottom:8px;background:var(--surface);overflow:hidden}.pacc-hd{display:flex;align-items:center;gap:11px;padding:11px 14px;cursor:pointer;user-select:none}.pacc-hd:hover{background:var(--surface2)}.pacc-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0}.pacc-sum{margin-left:auto;font-size:11px;color:var(--muted);white-space:nowrap;text-align:right}.pacc-chev{transition:.2s;color:var(--muted);flex-shrink:0}.pacc.open .pacc-chev{transform:rotate(180deg)}.pacc-bd{padding:2px 14px 14px;border-top:1px solid var(--border)}.psearch{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:13px;margin:2px 0 12px}</style>';
  var html=css+'<div style="margin-bottom:16px"><span style="font-weight:700;font-size:15px">Permisos por persona</span>'+
    '<p style="color:var(--muted);font-size:12px;margin:4px 0 0;line-height:1.5">El <strong>Admin</strong> siempre tiene acceso total. Activa lo que cada persona puede ver y hacer; se guarda y se aplica al instante en su sesión. Cada persona parte de lo que trae su cargo y aquí lo ajustas individualmente.</p></div>';
  html+='<input class="psearch" placeholder="🔍 Buscar persona…" oninput="_permBuscarUser(this.value)">';
  html+='<div id="perm-acc">';
  if(!(_adminUsers&&_adminUsers.length)){ try{ supabaseClient.functions.invoke('admin-users',{body:{action:'list'}}).then(function(r){ _adminUsers=((r&&r.data&&r.data.users)||[]); if(typeof adminTab!=='undefined'&&adminTab==='perms')renderPermisos(); }); }catch(e){} }
  var _PL=_permUserList();
  for (var i=0;i<_PL.length;i++){
    var U=_PL[i]; var p=_userEff(U.u); var ini=(U.n||U.u).charAt(0).toUpperCase();
    var nAct=0; for(var mm=0;mm<PERM_MODS.length;mm++){ if(p[PERM_MODS[mm].k])nAct++; }
    html+='<div class="pacc" data-u="'+U.u+'" data-n="'+esc(U.n)+'">'+
      '<div class="pacc-hd" onclick="_permToggle(\''+U.u+'\')"><span class="pacc-av" style="background:'+U.c+'">'+ini+'</span>'+
      '<div style="min-width:0"><div style="font-weight:700;font-size:14px">'+esc(U.n)+'</div><div style="font-size:11px;color:var(--muted)">'+esc(U.sub)+'</div></div>'+
      '<span class="pacc-sum">ve '+nAct+' de '+PERM_MODS.length+'<br>módulos</span>'+
      '<svg class="pacc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>'+
      '<div class="pacc-bd" style="display:none">';
    var _cats=(typeof PERM_CAT_ORDER!=='undefined')?PERM_CAT_ORDER.slice():[];
    PERM_MODS.forEach(function(md){ var c=md.cat||'Otros'; if(_cats.indexOf(c)<0)_cats.push(c); });
    for(var ci=0;ci<_cats.length;ci++){ var cat=_cats[ci];
      var mods=PERM_MODS.filter(function(x){ return (x.cat||'Otros')===cat; });
      if(!mods.length)continue;
      html+='<div class="permsec">'+esc(cat)+'</div>';
      for(var mi=0;mi<mods.length;mi++){ html+=_permRowU(U.u,mods[mi].k,mods[mi].label,p[mods[mi].k]); }
    }
    html+='<div class="permsec">Herramientas de Compras</div>';
    html+='<div style="font-size:10px;color:var(--muted);margin:-1px 0 4px;line-height:1.4">Para que las vea, el módulo <b>Compras</b> (arriba) debe estar activado.</div>';
    for (var c=0;c<PERM_COMP.length;c++){ var ck=PERM_COMP[c].k; html+=_permRowU(U.u,ck,PERM_COMP[c].label.replace('Compras · ',''),p[ck]); }
    html+='<div class="permsec">Acciones</div>';
    html+=_permRowU(U.u,'fact','Editar / abonar facturas',p.fact);
    html+=_permRowU(U.u,'prest_cuotas','Ver cuotas y abonar préstamos',p.prest_cuotas);
    html+=_permRowU(U.u,'prest_historial','Ver historial de préstamos',p.prest_historial);
    html+='<div class="permsec">Asistente</div>';
    html+=_permRowU(U.u,'ia','Usar asistente de IA',p.ia);
    html+='</div></div>';
  }
  html+='</div>';
  html+='<div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap;position:sticky;bottom:0;background:var(--bg);padding:12px 0 4px;border-top:1px solid var(--border)">'+
    '<button class="btn btn-green btn-sm" onclick="savePerms()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar permisos</button>'+
    '<button class="btn btn-ghost btn-sm" onclick="restablecerPerms()">Restablecer por defecto</button>'+
  '</div>';
  el.innerHTML=html;
}

function _permToggle(u){ var c=document.querySelector('.pacc[data-u="'+u+'"]'); if(!c)return; var b=c.querySelector('.pacc-bd'); if(!b)return; var open=b.style.display!=='none'; b.style.display=open?'none':'block'; c.classList.toggle('open',!open); }
function _permBuscarUser(v){ var q=(v||'').toLowerCase().trim(); var arr=document.querySelectorAll('.pacc'); for(var i=0;i<arr.length;i++){ var nm=(arr[i].getAttribute('data-n')||'').toLowerCase(); arr[i].style.display=(!q||nm.indexOf(q)>=0)?'':'none'; } }
let adminTab = 'users';

function renderAdminPanel() {
  const el = document.getElementById('admin-panel-content');
  if (!el) return;
  el.innerHTML = `
    <p class="section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> Panel de Administración</p>
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn ${adminTab==='users'?'btn-accent':'btn-ghost'} btn-sm" onclick="adminTab='users';renderAdminPanel()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Usuarios</button>
      <button class="btn ${adminTab==='audit'?'btn-accent':'btn-ghost'} btn-sm" onclick="adminTab='audit';renderAdminPanel()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Log de Auditoría</button>
      <button class="btn ${adminTab==='db'?'btn-accent':'btn-ghost'} btn-sm" onclick="adminTab='db';renderAdminPanel()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg> Base de Datos</button>
      <button class="btn ${adminTab==='mapa'?'btn-accent':'btn-ghost'} btn-sm" onclick="adminTab='mapa';renderAdminPanel()">🧠 Mapa del sistema</button>
      <button class="btn btn-ghost btn-sm" onclick="adminClaveRRHH()" title="Cambiar la clave con la que Verónica abre los sueldos">🔑 Clave de RRHH</button>
      <button class="btn ${adminTab==='perms'?'btn-accent':'btn-ghost'} btn-sm" onclick="adminTab='perms';renderAdminPanel()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Permisos</button>
    </div>
    <div id="admin-inner"></div>
  `;
  if (adminTab==='users')  renderUserManagement();
  else if (adminTab==='mapa') renderMapaSistema();
  else if (adminTab==='audit') renderAuditLog();
  else if (adminTab==='db')    renderDBAdmin();
  else if (adminTab==='perms') renderPermisos();
}

let _adminUsers = [];

function renderUserManagement() {
  const el = document.getElementById('admin-inner');
  if (!el) return;
  el.innerHTML = `
    <style>
      .au-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
      .au-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:11px;transition:box-shadow .15s,border-color .15s}
      .au-card:hover{box-shadow:0 6px 20px rgba(15,23,42,.08);border-color:var(--primary-light)}
      .au-card.off{opacity:.62}
      .au-top{display:flex;align-items:center;gap:11px}
      .au-av{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:15px;flex-shrink:0}
      .au-nm{font-weight:700;font-size:15px;line-height:1.15}
      .au-un{font-size:12px;color:var(--muted);font-family:ui-monospace,monospace}
      .au-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#fff}
      .au-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between}
      .au-st{font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px}
      .au-actions{display:flex;gap:6px}
      .au-ib{border:1px solid var(--border);background:var(--surface2);border-radius:9px;width:34px;height:34px;display:grid;place-items:center;cursor:pointer;color:var(--text)}
      .au-ib:hover{background:var(--surface3)}
      .au-empsel{font-size:11px;padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)}
      .au-search{font-size:13px;padding:8px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);min-width:170px}
      .au-stat{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:9px 15px;text-align:center;min-width:78px}
      .au-stat b{display:block;font-size:20px;font-weight:800;color:var(--primary);line-height:1}
      .au-stat span{font-size:11px;color:var(--muted)}
    </style>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="display:flex;gap:10px" id="au-stats"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="au-search" class="au-search" placeholder="🔍 Buscar usuario o rol…" oninput="_auFilter()">
        <button class="btn btn-green btn-sm" onclick="abrirNuevoUsuario()">+ Nuevo usuario</button>
      </div>
    </div>
    <div id="admin-users-list" class="au-grid"><div style="color:var(--muted);font-size:13px;padding:20px">Cargando usuarios…</div></div>
    ${_userModalsHTML()}
  `;
  cargarUsuariosAdmin();
}

async function cargarUsuariosAdmin() {
  const cont = document.getElementById('admin-users-list');
  if (!cont) return;
  try {
    const { data, error } = await supabaseClient.functions.invoke('admin-users', { body: { action: 'list' } });
    if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Error');
    _adminUsers = (data && data.users) || [];
    cont.innerHTML = _userTableHTML(_adminUsers);
  } catch (e) {
    cont.innerHTML = '<div style="color:var(--red);font-size:13px">No se pudieron cargar los usuarios: ' + esc(String(e.message||e)) + '</div>';
  }
}

function _userTableHTML(users) {
  const EMPOPTS={'':'Libre','farmacia':'Farmacia','drogueria':'Droguería','consolidado':'Consolidado'};
  var q=_auQuery||'';
  var list=(users||[]).filter(function(u){ if(!q)return true; var hay=(u.username+' '+u.nombre+' '+u.role+' '+_roleLabel(u.role)).toLowerCase(); return hay.indexOf(q)>=0; });
  // stats bar
  var act=(users||[]).filter(function(u){return u.activo;}).length;
  var stEl=document.getElementById('au-stats');
  if(stEl) stEl.innerHTML='<div class="au-stat"><b>'+(users||[]).length+'</b><span>Usuarios</span></div><div class="au-stat"><b>'+act+'</b><span>Activos</span></div>';
  if(!list.length) return '<div style="color:var(--muted);font-size:13px;padding:24px;text-align:center;grid-column:1/-1">'+(q?'Sin resultados para “'+esc(q)+'”':'Sin usuarios')+'</div>';
  return list.map(function(u){
    const _ec=(db.empresa_cfg&&db.empresa_cfg[u.username])||{};
    var col=_roleColor(u.role);
    return '<div class="au-card'+(u.activo?'':' off')+'">'+
      '<div class="au-top">'+
        '<div class="au-av" style="background:'+col+'">'+esc(_auIni(u.nombre,u.username))+'</div>'+
        '<div style="flex:1;min-width:0"><div class="au-nm">'+esc(u.nombre||u.username)+'</div><div class="au-un">@'+esc(u.username)+'</div></div>'+
        ((typeof currentRole!=='undefined'&&currentRole==='admin')?('<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 9px" title="Ver la app como este usuario" onclick="adminImpersonar(\''+esc(u.username)+'\',\''+esc(u.role||'')+'\')">👁 Entrar como</button>'):'')+
        '<span class="au-badge" style="background:'+col+'">'+esc(_roleLabel(u.role))+'</span>'+
      '</div>'+
      '<div class="au-row">'+
        '<span class="au-st" style="color:'+(u.activo?'var(--green)':'var(--red)')+'">'+(u.activo?'● Activo':'● Inactivo')+'</span>'+
        '<div style="display:flex;align-items:center;gap:6px">'+
          '<select id="empcfg-'+esc(u.username)+'" class="au-empsel" title="Empresa / acceso" onchange="_empCfgChange(\''+esc(u.username)+'\')">'+Object.keys(EMPOPTS).map(function(k){return '<option value="'+k+'" '+((_ec.emp||'')===k?'selected':'')+'>'+EMPOPTS[k]+'</option>';}).join('')+'</select>'+
          '<label style="font-size:10px;color:var(--muted);cursor:pointer" title="Bloquear a esta empresa"><input type="checkbox" id="emplock-'+esc(u.username)+'" onchange="_empCfgChange(\''+esc(u.username)+'\')" '+(_ec.lock?'checked':'')+' style="vertical-align:-1px;accent-color:var(--primary)"> 🔒</label>'+
        '</div>'+
      '</div>'+
      '<div class="au-row" style="border-top:1px solid var(--border);padding-top:10px">'+
        '<span style="font-size:11px;color:var(--muted)">Rol técnico: <b>'+esc(u.role)+'</b></span>'+
        '<div class="au-actions">'+
          '<button class="au-ib" onclick="abrirEditarUsuario(\''+u.id+'\')" title="Editar / contraseña"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>'+
          '<button class="au-ib" style="color:'+(u.activo?'var(--red)':'var(--green)')+'" onclick="toggleUsuarioActivo(\''+u.id+'\','+u.activo+')" title="'+(u.activo?'Desactivar':'Activar')+'">'+(u.activo?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>')+'</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function _userModalsHTML() {
  return `
    <div id="edit-user-modal" style="position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.55);padding:16px">
      <div class="tbox" style="max-width:480px;width:100%;max-height:90vh;overflow:auto;margin:0"><span class="tbox-title" id="edit-user-title">Editar Usuario</span>
        <input type="hidden" id="eu-id">
        <div class="form-grid" style="margin-top:12px">
          <div class="form-group"><label class="form-label">Usuario</label><input class="form-input" id="eu-username" readonly style="background:var(--surface2)"></div>
          <div class="form-group"><label class="form-label">Nombre</label><input class="form-input" id="eu-nombre"></div>
          <div class="form-group"><label class="form-label">Rol</label><select class="form-input" id="eu-role">${_roleOptions()}</select></div>
          <div class="form-group"><label class="form-label">Nueva contraseña <span style="color:var(--muted)">(vacío = no cambiar)</span></label><input class="form-input" id="eu-pass" type="password" autocomplete="new-password" placeholder="Nueva contraseña..."></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-accent btn-sm" onclick="guardarUsuario()">Guardar</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('edit-user-modal').style.display='none'">Cancelar</button>
        </div>
      </div>
    </div>
    <div id="new-user-modal" style="position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.55);padding:16px">
      <div class="tbox" style="max-width:480px;width:100%;max-height:90vh;overflow:auto;margin:0"><span class="tbox-title">Nuevo Usuario</span>
        <div class="form-grid" style="margin-top:12px">
          <div class="form-group"><label class="form-label">Usuario *</label><input class="form-input" id="nu-username" placeholder="usuario (minúsculas)"></div>
          <div class="form-group"><label class="form-label">Nombre *</label><input class="form-input" id="nu-nombre" placeholder="Nombre completo"></div>
          <div class="form-group"><label class="form-label">Rol *</label><select class="form-input" id="nu-role" onchange="_nuRoleHint()">${_roleOptions('supervisor')}</select><div id="nu-role-hint" style="font-size:11px;color:var(--muted);margin-top:5px"></div></div>
          <div class="form-group"><label class="form-label">Contraseña *</label><input class="form-input" id="nu-pass" type="password" autocomplete="new-password"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-green btn-sm" onclick="crearUsuario()">Crear</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('new-user-modal').style.display='none'">Cancelar</button>
        </div>
      </div>
    </div>`;
}

function abrirEditarUsuario(id) {
  const u = _adminUsers.find(x=>x.id===id); if(!u) return;
  document.getElementById('edit-user-modal').style.display='flex';
  document.getElementById('new-user-modal').style.display='none';
  document.getElementById('eu-id').value=u.id;
  document.getElementById('eu-username').value=u.username;
  document.getElementById('eu-nombre').value=u.nombre;
  document.getElementById('eu-role').value=u.role;
  document.getElementById('eu-pass').value='';
  document.getElementById('edit-user-title').textContent='Editar: '+u.nombre;
}

var ROLE_HELP = { admin:'Acceso total a todo el sistema.', gerente:'Ve todos los módulos y reportes de gerencia.', supervisor:'Verifica y da visto bueno a los cierres de caja. También ve el Reto.', reto:'Solo el Reto de Ventas: registra ventas y lleva el reto. No entra a cierres de caja.', ventas:'Módulo de Seguimiento (CRM) para vender a farmacias.', compras:'Módulo de Compras: qué pedir, pedidos y precios.', mayra:'Administración y contabilidad.', grismar:'Facturación y caja.', ines:'Verificación de cobros.', angelica:'Supervisora de turnos y cierres.' };
function _nuRoleHint(){ var s=document.getElementById('nu-role'); var h=document.getElementById('nu-role-hint'); if(s&&h)h.textContent=ROLE_HELP[s.value]||''; }
function abrirNuevoUsuario() {
  document.getElementById('new-user-modal').style.display='flex';
  document.getElementById('edit-user-modal').style.display='none';
  document.getElementById('nu-username').value='';
  document.getElementById('nu-nombre').value='';
  document.getElementById('nu-pass').value='';
  _nuRoleHint();
}

async function guardarUsuario() {
  const id = document.getElementById('eu-id').value;
  const nombre = document.getElementById('eu-nombre').value.trim();
  const role = document.getElementById('eu-role').value;
  const pass = document.getElementById('eu-pass').value;
  if (!id) return;
  const payload = { action:'update', id, nombre, role };
  if (pass) payload.password = pass;
  try {
    const { data, error } = await supabaseClient.functions.invoke('admin-users', { body: payload });
    if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Error');
    document.getElementById('edit-user-modal').style.display='none';
    showToast('Usuario actualizado');
    cargarUsuariosAdmin();
  } catch(e){ showToast('Error: '+(e.message||e)); }
}

async function crearUsuario() {
  const username=(document.getElementById('nu-username').value||'').trim().toLowerCase();
  const nombre=document.getElementById('nu-nombre').value.trim();
  const role=document.getElementById('nu-role').value;
  const pass=document.getElementById('nu-pass').value;
  if(!username||!nombre||!pass){ showToast('Completa todos los campos'); return; }
  try {
    const { data, error } = await supabaseClient.functions.invoke('admin-users', { body:{ action:'create', username, nombre, role, password:pass } });
    if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Error');
    document.getElementById('new-user-modal').style.display='none';
    showToast('Usuario creado: '+username);
    cargarUsuariosAdmin();
  } catch(e){ showToast('Error: '+(e.message||e)); }
}

async function toggleUsuarioActivo(id, activoActual) {
  const u = _adminUsers.find(x=>x.id===id);
  if (u && u.username===currentUser && activoActual) { showToast('No puedes desactivar tu propio usuario'); return; }
  if (!confirm(activoActual ? '¿Desactivar el acceso de este usuario?' : '¿Activar este usuario?')) return;
  try {
    const { data, error } = await supabaseClient.functions.invoke('admin-users', { body:{ action:'set_active', id, activo: !activoActual } });
    if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Error');
    showToast(activoActual ? 'Usuario desactivado' : 'Usuario activado');
    cargarUsuariosAdmin();
  } catch(e){ showToast('Error: '+(e.message||e)); }
}

function renderAuditLog() {
  const el = document.getElementById('admin-inner');
  if (!el) return;
  el.innerHTML = '<div style="padding:20px;color:var(--muted);font-size:13px">Cargando auditoría…</div>';
  supabaseClient.from('auditlog').select('ts,app_user,nombre,action,detail').order('ts',{ascending:false}).limit(300).then(function(res){
    var logs = (res && !res.error && Array.isArray(res.data)) ? res.data : (db.auditlog||[]);
    _renderAuditTable(el, logs);
  }).catch(function(){ _renderAuditTable(el, db.auditlog||[]); });
}
function _renderAuditTable(el, logs){
  el.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <span style="font-weight:600;font-size:14px">Registro de Auditoría</span>
      <span style="color:var(--muted);font-size:12px">${logs.length} entradas</span>
      <span style="color:var(--green);font-size:11px;margin-left:auto">Registro permanente</span>
    </div>
    <div style="overflow-x:auto">
    <table class="tbl" style="font-size:12px">
      <thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
      <tbody>
        ${logs.length ? logs.slice(0,300).map(l=>`
          <tr>
            <td class="mono" style="white-space:nowrap;font-size:11px">${(l.ts||'').replace('T',' ').substring(0,19)}</td>
            <td><strong>${esc(l.nombre||l.app_user||l.user||'?')}</strong></td>
            <td><span style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:10px;font-family:monospace">${esc(l.action||'')}</span></td>
            <td style="color:var(--muted)">${esc(l.detail||'')}</td>
          </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin registros de auditoría</td></tr>'}
      </tbody>
    </table>
    </div>
  `;
}

function limpiarAuditOld() {
  showToast('La auditoría ahora es permanente y no se puede borrar, por integridad del registro.');
}

var _lmpSel={};
function _lmpPuede(){ try{ return currentRole==='admin'; }catch(e){ return false; } }
var _LMP_GRUPOS=[
 {k:'cierres',n:'Cierres de caja',d:'Cierres, firmas y movimientos registrados',tablas:['cierre_firmas','cierre_eventos','cierres_caja'],fecha:'fecha'},
 {k:'consolidado',n:'Consolidado diario',d:'Totales por día en Bs y $',tablas:['ventas_diarias'],fecha:'fecha'},
 {k:'metalica',n:'Caja metálica',d:'Movimientos de la cajita roja',tablas:['caja_metalica'],fecha:'fecha'},
 {k:'vencimientos',n:'Lotes de vencimiento',d:'Lo cargado desde la plantilla',tablas:['lotes_vencimiento'],fecha:null},
 {k:'retoventas',n:'Puntos del reto',d:'Solo las ventas/puntos; conserva productos y participantes',tablas:[],fecha:null}
];
function _lmpAbrir(){
  if(!_lmpPuede()){ if(typeof showToast==='function')showToast('Solo el administrador'); return; }
  var old=document.getElementById('lmp-ov'); if(old)old.remove();
  var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
  var ov=document.createElement('div'); ov.id='lmp-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(11,18,32,.6);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto';
  ov.onclick=function(e){ if(e.target===ov)ov.remove(); };
  var grupos=_LMP_GRUPOS.map(function(g){
    return '<label style="display:flex;gap:10px;align-items:flex-start;padding:10px 11px;border:1px solid var(--border);border-radius:10px;margin-bottom:7px;cursor:pointer;background:var(--surface)">'+
      '<input type="checkbox" id="lmp-'+g.k+'" style="margin-top:2px;width:16px;height:16px;accent-color:#B42318;flex:none">'+
      '<div><div style="font-size:13px;font-weight:600;color:var(--text)">'+g.n+'</div>'+
      '<div style="font-size:11.5px;color:var(--muted);margin-top:1px">'+g.d+'</div></div></label>';
  }).join('');
  ov.innerHTML='<div style="background:var(--bg);max-width:520px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 32px 80px -16px rgba(11,18,32,.55)">'+
    '<div style="background:linear-gradient(140deg,#8A1B12,#B42318);padding:16px 18px;color:#fff">'+
      '<div style="display:flex;align-items:center;gap:10px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>'+
      '<div><div style="font-size:16px;font-weight:600">Borrar datos de prueba</div><div style="font-size:11.5px;opacity:.9">Esta acción no se puede deshacer</div></div></div></div>'+
    '<div style="padding:16px 18px">'+
      '<div style="background:#FFF6F5;border:1px solid rgba(180,35,24,.2);border-radius:10px;padding:10px 12px;font-size:12px;color:#8A1B12;margin-bottom:13px;line-height:1.5">Descarga un respaldo antes de continuar. Lo borrado no se recupera.</div>'+
      '<div style="font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-bottom:7px">Qué borrar</div>'+
      grupos+
      '<div style="display:flex;gap:9px;margin:13px 0 3px"><div style="flex:1"><label style="font-size:11px;color:var(--muted);font-weight:600">DESDE</label><input type="date" id="lmp-desde" value="2026-01-01" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:13px"></div>'+
      '<div style="flex:1"><label style="font-size:11px;color:var(--muted);font-weight:600">HASTA</label><input type="date" id="lmp-hasta" value="'+hoy+'" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:13px"></div></div>'+
      '<div style="font-size:11px;color:var(--muted);margin-bottom:13px">El rango aplica a cierres, consolidado y caja metálica.</div>'+
      '<label style="font-size:11px;color:var(--muted);font-weight:600">CLAVE DE BORRADO</label>'+
      '<input type="password" id="lmp-pass" placeholder="Clave" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:14px;margin-bottom:10px">'+
      '<label style="font-size:11px;color:var(--muted);font-weight:600">ESCRIBE <b style="color:#B42318">BORRAR</b> PARA CONFIRMAR</label>'+
      '<input id="lmp-conf" placeholder="BORRAR" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:14px;letter-spacing:1px">'+
      '<div id="lmp-msg" style="font-size:12px;min-height:16px;margin-top:9px;text-align:center"></div>'+
      '<div style="display:flex;gap:8px;margin-top:6px">'+
        '<button class="btn btn-ghost" style="flex:1" onclick="document.getElementById(\'lmp-ov\').remove()">Cancelar</button>'+
        '<button class="btn btn-ghost" style="flex:1" onclick="_bkDescargar(this)">Respaldar antes</button>'+
        '<button class="btn" style="flex:1;background:linear-gradient(180deg,#C9382C,#B42318);color:#fff;box-shadow:0 3px 10px rgba(180,35,24,.35)" onclick="_lmpEjecutar(this)">Borrar</button>'+
      '</div></div></div>';
  document.body.appendChild(ov);
}
function _lmpEjecutar(btn){
  var msg=document.getElementById('lmp-msg');
  var say=function(t,c){ if(msg){ msg.textContent=t; msg.style.color=c||'var(--muted)'; } };
  if(!_lmpPuede()){ say('Solo el administrador.','#B42318'); return; }
  var conf=(document.getElementById('lmp-conf')||{}).value||'';
  if(conf.trim().toUpperCase()!=='BORRAR'){ say('Escribe BORRAR para confirmar.','#B42318'); return; }
  var sel=_LMP_GRUPOS.filter(function(g){ var e=document.getElementById('lmp-'+g.k); return e&&e.checked; });
  if(!sel.length){ say('Elige al menos una cosa para borrar.','#B42318'); return; }
  var pass=(document.getElementById('lmp-pass')||{}).value||'';
  if(!pass){ say('Escribe la clave de borrado.','#B42318'); return; }
  say('Verificando clave…');
  _sha256(pass).then(function(hash){
    supabaseClient.from('app_sections').select('data').eq('section_name','limpieza_cfg').maybeSingle().then(function(r){
      var esperado=(r&&r.data&&r.data.data&&r.data.data.pass_sha)||'';
      if(!esperado || hash!==esperado){ say('Clave incorrecta.','#B42318'); return; }
      _lmpBorrar(sel, btn, say);
    });
  }).catch(function(){ say('No se pudo verificar la clave.','#B42318'); });
}
function _lmpBorrar(sel, btn, say){
  var desde=(document.getElementById('lmp-desde')||{}).value||'2000-01-01';
  var hasta=(document.getElementById('lmp-hasta')||{}).value||'2999-12-31';
  if(btn){ btn.disabled=true; btn.textContent='Borrando…'; }
  var tareas=[], resumen=[];
  sel.forEach(function(g){
    if(g.k==='retoventas'){ tareas.push({tipo:'reto',n:g.n}); return; }
    g.tablas.forEach(function(t){ tareas.push({tipo:'tabla',tabla:t,fecha:g.fecha,n:g.n}); });
  });
  var i=0;
  (function next(){
    if(i>=tareas.length){
      if(typeof logAudit==='function') logAudit('datos.borrado', resumen.join(' · ')+' ('+desde+' a '+hasta+')');
      say('✓ Listo. '+resumen.join(' · '),'#079455');
      if(typeof showToast==='function') showToast('✓ Datos de prueba borrados');
      setTimeout(function(){ var o=document.getElementById('lmp-ov'); if(o)o.remove(); try{ renderTab(activeTab); }catch(e){} },1600);
      return;
    }
    var t=tareas[i]; say('Borrando '+(t.tabla||t.n)+'… ('+(i+1)+'/'+tareas.length+')');
    if(t.tipo==='reto'){
      try{ var r=_reto(); r.ventas={}; r.bonus={}; r.log_dia={}; _retoSave(true); resumen.push('puntos del reto'); }catch(e){}
      i++; next(); return;
    }
    var qy=supabaseClient.from(t.tabla).delete();
    if(t.fecha) qy=qy.gte(t.fecha,desde).lte(t.fecha,hasta);
    else qy=qy.gte('id',0);
    qy.then(function(res){
      if(res&&res.error){ resumen.push(t.tabla+': error'); } else { resumen.push(t.tabla); }
      i++; next();
    }).catch(function(){ resumen.push(t.tabla+': error'); i++; next(); });
  })();
}
function _lmpBotonHTML(){
  if(!_lmpPuede()) return '';
  return '<div style="background:linear-gradient(160deg,#fff,#FFFCFB);border:1px solid rgba(180,35,24,.18);border-radius:13px;padding:14px 15px;margin-top:14px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(180,35,24,.14),inset 0 1px 0 #fff">'+
    '<div style="display:flex;align-items:center;gap:11px;flex-wrap:wrap">'+
    '<div style="width:30px;height:30px;border-radius:9px;background:linear-gradient(145deg,#DC5A50,#B42318);display:grid;place-items:center;flex:none;box-shadow:0 3px 10px rgba(180,35,24,.32)">'+
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></div>'+
    '<div style="flex:1;min-width:170px"><div style="font-size:13.5px;font-weight:600;color:var(--text)">Zona de peligro</div>'+
    '<div style="font-size:11.5px;color:var(--muted);margin-top:1px">Borrar datos de prueba · requiere clave · solo administrador</div></div>'+
    '<button class="btn btn-ghost btn-sm" style="color:#B42318;border-color:rgba(180,35,24,.3)" onclick="_lmpAbrir()">Abrir</button></div></div>';
}
function _bkTablas(){ return ['cierres_caja','cierre_firmas','cierre_eventos','caja_metalica','lotes_vencimiento','wa_empresas','productos','lista_precios','empleados','push_subscriptions']; }
function _bkDescargar(btn){
  if(btn){ btn.disabled=true; btn.textContent='Preparando respaldo…'; }
  var out={ generado:new Date().toISOString(), version:'v255', app:{}, tablas:{} };
  try{ out.app=JSON.parse(JSON.stringify(db)); }catch(e){ out.app={error:'no se pudo leer db'}; }
  var tablas=_bkTablas(); var i=0;
  (function next(){
    if(i>=tablas.length){ _bkGuardarArchivo(out, btn); return; }
    var t=tablas[i];
    if(btn) btn.textContent='Respaldando '+t+'… ('+(i+1)+'/'+tablas.length+')';
    var filas=[]; var desde=0;
    (function pagina(){
      supabaseClient.from(t).select('*').range(desde,desde+999).then(function(r){
        var arr=(r&&r.data)||[];
        filas=filas.concat(arr);
        if(arr.length===1000 && filas.length<20000){ desde+=1000; pagina(); }
        else { out.tablas[t]=filas; i++; next(); }
      }).catch(function(){ out.tablas[t]={error:'no accesible'}; i++; next(); });
    })();
  })();
}
function _bkGuardarArchivo(out, btn){
  try{
    var txt=JSON.stringify(out);
    var blob=new Blob([txt],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='Respaldo_Claret_'+((typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10))+'.json';
    a.click();
    setTimeout(function(){ try{URL.revokeObjectURL(a.href);}catch(e){} },3000);
    var mb=(txt.length/1048576).toFixed(1);
    var n=0; for(var k in out.tablas){ if(Array.isArray(out.tablas[k])) n+=out.tablas[k].length; }
    if(typeof showToast==='function') showToast('✓ Respaldo descargado · '+n.toLocaleString('es-VE')+' registros · '+mb+' MB');
    if(typeof logAudit==='function') logAudit('respaldo.descarga', n+' registros · '+mb+' MB');
    try{ localStorage.setItem('bk_ultimo', new Date().toISOString()); }catch(e){}
  }catch(e){ if(typeof showToast==='function')showToast('Error: '+(e.message||e)); }
  if(btn){ btn.disabled=false; btn.innerHTML='Descargar respaldo completo'; }
}
function _bkUltimoTxt(){
  try{ var u=localStorage.getItem('bk_ultimo'); if(!u) return 'Nunca se ha descargado un respaldo.';
    var d=new Date(u); var dias=Math.floor((Date.now()-d.getTime())/86400000);
    return 'Último respaldo: '+d.toLocaleDateString('es-VE',{day:'numeric',month:'long'})+(dias>0?(' · hace '+dias+' día'+(dias>1?'s':'')):' · hoy');
  }catch(e){ return ''; }
}
function _bkAvisoHTML(){
  var u=null; try{ u=localStorage.getItem('bk_ultimo'); }catch(e){}
  var dias=u?Math.floor((Date.now()-new Date(u).getTime())/86400000):999;
  var urge=(dias>=7);
  return '<div style="background:linear-gradient(160deg,#fff,'+(urge?'#FFFCFB':'#FCFCFD')+');border:1px solid '+(urge?'rgba(180,35,24,.2)':'rgba(16,24,40,.07)')+';border-radius:13px;padding:15px 16px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(16,24,40,.10),inset 0 1px 0 #fff">'+
    '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
    '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,'+(urge?'#DC5A50,#B42318':'#3B57D4,#1E38A6')+');display:grid;place-items:center;flex:none;box-shadow:0 3px 10px '+(urge?'rgba(180,35,24,.35)':'rgba(30,56,166,.35)')+',inset 0 1px 0 rgba(255,255,255,.22)">'+
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg></div>'+
    '<div style="flex:1;min-width:180px"><div style="font-size:13.5px;font-weight:600;color:var(--text)">Respaldo de seguridad</div>'+
    '<div style="font-size:11.5px;color:'+(urge?'#B42318':'var(--muted)')+';margin-top:1px">'+_bkUltimoTxt()+(urge?' — te recomiendo descargar uno':'')+'</div></div>'+
    '<button class="btn btn-accent btn-sm" onclick="_bkDescargar(this)">Descargar respaldo completo</button></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:9px;line-height:1.5">Incluye cierres de caja, firmas, vencimientos, farmacias, productos, reto y toda la información de la app. Guárdalo en tu computadora.</div></div>';
}
function renderDBAdmin() {
  const el = document.getElementById('admin-inner');
  if (!el) return;
  const keys = ['facturas','historial','prestamos','bancos','tasas','tasas_eur','cxc_drog','cxc_cobradas','cxc_farm','cxc_farm_cobradas','empresa_cfg','users','auditlog','reto','cxp_prov'];
  const info = keys.map(k=>{
    const d = db[k];
    const n = Array.isArray(d) ? d.length : (d ? Object.keys(d).length : 0);
    const sz = JSON.stringify(d||{}).length;
    return {key:k, count:n, size:sz};
  });
  const lsSz = JSON.stringify(db).length;
  const _meta={facturas:{l:'Facturas',c:'#3b82f6'},historial:{l:'Historial de pagos',c:'#8b5cf6'},prestamos:{l:'Préstamos',c:'#f59e0b'},bancos:{l:'Bancos y movimientos',c:'#06b6d4'},tasas:{l:'Historial tasa $',c:'#22c55e'},tasas_eur:{l:'Historial tasa €',c:'#84cc16'},cxc_drog:{l:'Cuentas por cobrar',c:'#ec4899'},users:{l:'Usuarios',c:'#10b981'},auditlog:{l:'Auditoría',c:'#64748b'}};
  el.innerHTML = _bkAvisoHTML() + _lmpBotonHTML() + `
    <div class="tbox">
      <span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg> Estado de la Base de Datos</span>
      <div style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.55;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 13px"><strong style="color:var(--text)">¿Dónde se guarda?</strong> Todo vive en dos lugares: una copia <strong>local</strong> en este equipo (para que la app sea rápida y funcione sin internet) y la copia maestra en la <strong>nube — Supabase</strong>, que sincroniza todas las sesiones al instante. Abajo ves el tamaño de la copia local; en la nube se guarda lo mismo, más los respaldos. <span style="color:#16a34a;font-weight:600">● Sincronizado con la nube</span></div>
      <div style="margin-top:10px;border:1px solid var(--border);border-radius:10px;overflow:hidden">
        ${info.map((r,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;${i>0?'border-top:1px solid var(--border);':''}">
          <div style="display:flex;align-items:center;gap:10px;min-width:0"><span style="width:9px;height:9px;border-radius:50%;background:${(_meta[r.key]||{}).c||'#94a3b8'};flex-shrink:0"></span><span style="font-weight:600;font-size:13px">${(_meta[r.key]||{}).l||r.key}</span></div>
          <div style="display:flex;align-items:center;gap:18px"><span style="font-family:var(--mono);font-weight:700;font-size:14px">${r.count.toLocaleString('es-VE')}</span><span style="font-size:11px;color:var(--muted);min-width:64px;text-align:right">${(r.size/1024).toFixed(1)} KB</span></div>
        </div>`).join('')}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-top:2px solid var(--border);background:var(--surface2)"><span style="font-weight:700;font-size:13px">Total local (este equipo)</span><span style="font-family:var(--mono);font-weight:700;font-size:13px">${(lsSz/1024).toFixed(1)} KB</span></div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--muted)">
        Último backup: <strong>${db.settings.last_backup_fecha ? fmtDate(db.settings.last_backup_fecha) : 'Nunca'}</strong>
        · Backup automático cada 7 días
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="exportarDBJSON()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg> Exportar JSON</button>
        <button class="btn btn-ghost btn-sm" onclick="forzarSync()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg> Forzar Sync Supabase</button>
        <button id="btn-backup-manual" class="btn btn-accent btn-sm" onclick="ejecutarBackupManual()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> Backup Manual Ahora</button>
      </div>
    </div>
    <div class="tbox" style="margin-top:16px" id="backup-hist-box">
      <span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> Historial de Backups (Supabase)</span>
      <p style="color:var(--muted);font-size:12px;margin-top:8px" id="backup-hist-loading">Cargando…</p>
    </div>
  `;
  // Load backup history async
  listarBackups().then(bks => {
    const el = document.getElementById('backup-hist-loading');
    if (!el) return;
    if (!bks.length) { el.textContent = 'Sin backups en Supabase'; return; }
    el.outerHTML = '<div class="twrap"><table class="tbl" style="margin-top:8px"><thead><tr><th>Fecha</th><th>Guardado</th></tr></thead><tbody>' +
      bks.map(b=>'<tr><td>'+fmtDate(b.fecha)+'</td><td style="font-size:11px;color:var(--muted)">'+b.ts.replace('T',' ').substring(0,19)+'</td></tr>').join('') +
      '</tbody></table></div>';
  });
}

function exportarDBJSON() {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'farmacia_backup_'+HOY()+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  logAudit('admin.exportar_db','Backup JSON descargado');
  showToast('Backup descargado');
}

function forzarSync() {
  syncFromSupabase(true).then(()=>{
    showToast('Sync completado');
    renderAdminPanel();
  }).catch(()=>showToast('Error de sync'));
}




// ══════════════════════════════════════════════════════════════
// AUTO-LOGOUT POR INACTIVIDAD
// ══════════════════════════════════════════════════════════════
const INACTIVITY_MS = 45 * 60 * 1000; // 45 minutos
let _inactivityTimer = null;
let _warnTimer = null;

function resetInactivityTimer() {
  clearTimeout(_inactivityTimer);
  clearTimeout(_warnTimer);
  const banner = document.getElementById('inactivity-banner');
  if (banner) banner.style.display = 'none';
  if (!currentUser) return;
  // Warn 2 min before logout
  _warnTimer = setTimeout(() => {
    const b = document.getElementById('inactivity-banner');
    if (b) b.style.display = 'flex';
  }, INACTIVITY_MS - 2 * 60 * 1000);
  _inactivityTimer = setTimeout(() => {
    if (currentUser) {
      logAudit('auth.auto_logout','Sesión cerrada por inactividad (45 min)');
      saveDB(db);
      doLogout();
      showToast('⏱ Sesión cerrada por inactividad');
    }
  }, INACTIVITY_MS);
}

function extendSession() {
  const b = document.getElementById('inactivity-banner');
  if (b) b.style.display = 'none';
  resetInactivityTimer();
}

// Bind activity events (con throttle: como máximo 1 reinicio cada 5s, para no
// recalcular temporizadores en cada mousemove/scroll y no recargar la máquina)
var _lastActivityReset = 0;
function _onUserActivity(){
  if (!currentUser) return;
  var now = Date.now();
  if (now - _lastActivityReset < 5000) return;
  _lastActivityReset = now;
  resetInactivityTimer();
}
['click','keydown','mousemove','touchstart','scroll'].forEach(ev =>
  document.addEventListener(ev, _onUserActivity, { passive: true })
);


function exportarHistorialExcel() {
  if (typeof XLSX === 'undefined') { showToast('SheetJS no disponible'); return; }
  let lista = [...db.historial];
  if (histFilter.empresa!=='all') lista = lista.filter(h=>h.empresa===histFilter.empresa);
  if (histFilter.search) {
    const q = histFilter.search.toLowerCase();
    lista = lista.filter(h=>(h.proveedor||'').toLowerCase().includes(q)||(h.factura||'').toLowerCase().includes(q));
  }
  if (histFilter.desde) lista = lista.filter(h=>(h.pagada_en||'')>=histFilter.desde);
  if (histFilter.hasta) lista = lista.filter(h=>(h.pagada_en||'')<=histFilter.hasta);
  lista.sort((a,b)=>((b.pagada_en||'')>(a.pagada_en||'')?1:-1));

  const rows = [
    ['Historial de Facturas Pagadas — Farmacia Claret'],
    ['Exportado:', new Date().toLocaleString('es-VE'), '', 'Total registros:', lista.length],
    [],
    ['Empresa','Proveedor','Factura','Fecha Fact.','Venció','Monto USD','Monto Bs','Pagada el','Nota Pago']
  ];
  lista.forEach(h => {
    rows.push([
      h.empresa==='farmacia'?'Farmacia':'Droguería',
      h.proveedor||'', h.factura||'',
      h.fecha||'', h.vence||'',
      h.monto_usd||0, h.monto_bs_pagar||0,
      h.pagada_en||'', h.nota_pago||''
    ]);
  });
  // Totals row
  rows.push([]);
  rows.push(['','','','','TOTAL',
    lista.reduce((a,h)=>a+(h.monto_usd||0),0),
    lista.reduce((a,h)=>a+(h.monto_bs_pagar||0),0),'','']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:12},{wch:22},{wch:16},{wch:12},{wch:12},{wch:12},{wch:14},{wch:12},{wch:24}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial');
  const hoy = HOY();
  XLSX.writeFile(wb, 'historial_facturas_'+hoy+'.xlsx');
  logAudit('historial.exportar_excel','Registros: '+lista.length);
  showToast('Excel exportado: historial_facturas_'+hoy+'.xlsx');
}

// ══════════════════════════════════════════════════════════════
// EXPORTAR VERIFICACIÓN BANCARIA A EXCEL
// ══════════════════════════════════════════════════════════════
function exportarVerifExcel(fechaParam) {
  if (typeof XLSX === 'undefined') { showToast('SheetJS no disponible'); return; }
  const hoy = fechaParam || HOY();
  const snap = db.bancos._verif?.[hoy];
  if (!snap) { showToast('Sin datos de verificación para exportar'); return; }

  const VERIF_BANCOS_LIST = VERIF_BANCOS; // use global constant

  // Build rows
  const rows = [
    ['Verificación Bancaria — Farmacia Claret', '', '', '', '', ''],
    ['Fecha:', fmtDate(hoy), '', 'Exportado:', new Date().toLocaleString('es-VE'), ''],
    [''],
    ['Banco', 'Ingreso Bs', 'Comisión Bs', 'Total (I-C)', 'Ing. Adm.', 'Diferencia'],
  ];

  let tI=0,tC=0,tT=0,tA=0,tD=0;
  VERIF_BANCOS_LIST.forEach(b => {
    const s = snap[b] || {};
    const i  = parseFloat(s.ingreso)||0;
    const c  = parseFloat(s.comision)||0;
    const t  = i - c;
    const a  = (s.admin!==null && s.admin!==undefined) ? parseFloat(s.admin)||0 : null;
    const d  = a !== null ? t - a : null;
    tI+=i; tC+=c; tT+=t;
    if(a!==null){tA+=a; tD+=(d||0);}
    rows.push([b, i||'', c||'', t||'', a!==null?a:'', d!==null?d:'']);
  });

  rows.push(['']);
  rows.push(['TOTALES', tI, tC, tT, tA||'', tD||'']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [{wch:22},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14}];

  // Style header rows (bold via comment — SheetJS free doesn't support cell styles, but structure is correct)
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Verificación '+hoy);

  // Also add historial sheet if exists
  if (db.bancos._verif_hist && db.bancos._verif_hist.length) {
    const histRows = [['Fecha','Confirmado por','Confirmado el','Ingreso','Comisión','Total','Adm.','Diferencia']];
    db.bancos._verif_hist.slice(0,50).forEach(h => {
      const t = h.totales||{};
      histRows.push([
        fmtDate(h.fecha), h.confirmada_por||'—',
        (h.confirmada_en||'').substring(0,19).replace('T',' '),
        t.ingreso||0, t.comision||0, t.total||0, t.admin||0, t.dif||0
      ]);
    });
    const wsH = XLSX.utils.aoa_to_sheet(histRows);
    wsH['!cols'] = [{wch:12},{wch:14},{wch:18},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12}];
    XLSX.utils.book_append_sheet(wb, wsH, 'Historial');
  }

  XLSX.writeFile(wb, 'verificacion_bancaria_'+hoy+'.xlsx');
  logAudit('verif.exportar_excel','Fecha: '+hoy);
  showToast('Excel exportado: verificacion_'+hoy+'.xlsx');
}

// ══════════════════════════════════════════════════════════════
// AUTO BACKUP SEMANAL
// ══════════════════════════════════════════════════════════════
async function autoBackupSemanal() {
  try {
    const lastBackup = db.settings.last_backup_fecha;
    const hoy = HOY();
    if (lastBackup) {
      const dias = Math.floor((new Date(hoy) - new Date(lastBackup)) / 86400000);
      if (dias < 7) return; // No es hora aún
    }
    // Crear snapshot
    const snapshot = {
      fecha: hoy,
      ts: new Date().toISOString(),
      facturas_count:  (db.facturas||[]).length,
      historial_count: (db.historial||[]).length,
      prestamos_count: (db.prestamos||[]).length,
      data: JSON.parse(JSON.stringify({ facturas: db.facturas, historial: db.historial, prestamos: db.prestamos, bancos: db.bancos, settings: db.settings }))
    };
    // Save backup row with date as section_name
    const { error } = await supabaseClient.from('app_sections').upsert(
      [{ section_name: 'backup_' + hoy, data: snapshot, updated_at: new Date().toISOString() }],
      { onConflict: 'section_name' }
    );
    if (!error) {
      db.settings.last_backup_fecha = hoy;
      // Save settings quietly (no full sync)
      await supabaseClient.from('app_sections').upsert(
        [{ section_name: 'settings', data: db.settings, updated_at: new Date().toISOString() }],
        { onConflict: 'section_name' }
      );
      localStorage.setItem('fc_last_backup', hoy);
      logAudit('sistema.backup','Backup automático semanal guardado: '+hoy);
      console.info('[Backup] Backup semanal guardado:', hoy);
    }
  } catch(e) {
    console.warn('[Backup] Error en backup semanal:', e);
  }
}

async function ejecutarBackupManual() {
  const btn = document.getElementById('btn-backup-manual');
  if (btn) { btn.disabled=true; btn.textContent='Guardando…'; }
  db.settings.last_backup_fecha = null; // Force
  await autoBackupSemanal();
  if (btn) { btn.disabled=false; btn.textContent='Backup Manual'; }
  showToast('Backup guardado en Supabase');
}

async function listarBackups() {
  try {
    const { data, error } = await supabaseClient
      .from('app_sections')
      .select('section_name,updated_at')
      .like('section_name', 'backup_%')
      .order('section_name', { ascending: false })
      .limit(10);
    if (error || !data) return [];
    return data.map(r => ({ fecha: r.section_name.replace('backup_',''), ts: r.updated_at }));
  } catch(e) { return []; }
}


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
const CACHE = 'farmacia-claret-v3';
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
  try { if (new URL(e.request.url).origin !== self.location.origin) return; } catch(_e) { return; }
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
    // Preferir sw.js (archivo real en el sitio) → habilita notificaciones push.
    // Si no existe (no se subió), caer al SW por blob (solo caché, sin push).
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.info('[PWA] Service Worker sw.js registrado:', reg.scope);
      try{ reg.update(); }catch(e){}
    }).catch(() => {
      try {
        const swBlob = new Blob([swCode], {type: 'application/javascript'});
        const swUrl  = URL.createObjectURL(swBlob);
        navigator.serviceWorker.register(swUrl).then(reg => {
          console.info('[PWA] SW (blob) registrado:', reg.scope);
        }).catch(e => console.warn('[PWA] SW error:', e));
      } catch(e) { console.warn('[PWA] SW error:', e); }
    });
    try{ navigator.serviceWorker.addEventListener('controllerchange', function(){ if(window._swReloaded)return; window._swReloaded=true; location.reload(); }); }catch(e){}
  }
})();

// ── Init ─────────────────────────────────────────────────────────────────────
/* ====================== RETO DE VENTAS ====================== */

/* Admin entra como otro usuario para chequeos (queda auditado; volver = recargar la página) */
function adminImpersonar(username, role){
  if(typeof currentRole==='undefined'||currentRole!=='admin')return;
  if(!confirm('Vas a ver la app como @'+username+' ('+(role||'sin rol')+').\nQueda registrado en auditoría.\nPara volver a ser tú: recarga la página.\n\n¿Continuar?'))return;
  try{ if(typeof logAudit==='function')logAudit('admin.impersonar','@'+username+' ('+(role||'')+')'); }catch(e){}
  try{ window._adminReal=currentUser; }catch(e){}
  currentUser=username; currentRole=role||'supervisor';
  try{ document.body.dataset.role=currentRole; }catch(e){}
  try{ if(typeof aplicarPermisos==='function')aplicarPermisos(); }catch(e){}
  try{ if(typeof _aplicarEmpresaUI==='function')_aplicarEmpresaUI(); }catch(e){}
  try{ if(typeof applyRoleUI==='function')applyRoleUI(); }catch(e){}
  showToast&&showToast('👁 Ahora ves la app como @'+username+' · recarga para volver a ser admin');
}


// ── Clave de RRHH (sueldos) — solo el administrador puede cambiarla ──
function adminClaveRRHH(){
  try{ if(currentRole!=='admin'){ showToast('Solo el administrador puede cambiar esta clave'); return; } }catch(e){ return; }
  var n=prompt('Nueva clave para abrir los sueldos (mínimo 6 caracteres).\n\nEsta es la clave que usa Verónica en el módulo RRHH:');
  if(n===null) return;
  n=String(n).trim();
  if(n.length<6){ showToast('La clave debe tener al menos 6 caracteres'); return; }
  if(!confirm('¿Cambiar la clave de RRHH a "'+n+'"?\n\nVerónica tendrá que usar esta clave la próxima vez que abra la relación.')) return;
  supabaseClient.rpc('fn_rrhh_clave_reset',{p_nueva:n}).then(function(res){
    var d=res&&res.data; if(d&&typeof d==='string'){ try{ d=JSON.parse(d); }catch(e){} }
    if((res&&res.error)||!d||!d.ok){
      showToast((d&&d.reason==='rol')?'Tu usuario no es administrador':((d&&d.reason==='corta')?'La clave es muy corta':'No se pudo cambiar la clave'));
      return;
    }
    if(typeof logAudit==='function') logAudit('admin.clave_rrhh','Clave de RRHH actualizada');
    showToast('✓ Clave de RRHH actualizada. Avísale a Verónica.');
  }).catch(function(){ showToast('No se pudo cambiar la clave'); });
}
