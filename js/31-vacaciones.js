/* ============================================================
   31-vacaciones.js — Programa de Vacaciones (prefijo _vac)
   Consolida el calendario de vacaciones de Farmacia y Droguería.
   Ver/gestionar estado y fechas; aplicar por-registro al sistema
   (escribe el rango en empleado_asistencia tipo='vacaciones' para
   que alimente el bloqueo de vales, RRHH y desempeño).
   ============================================================ */

var _vacRows=[], _vacEmpleados=[], _vacSueldos={};
var _vacReady=false, _vacLoading=false;
var _vacEmpresa='TODAS', _vacEstado='TODOS', _vacBuscar='';
var _vacEditTmp=null, _vacAplTmp=null;
var _vacVista='lista';        // 'lista' | 'calendario'
var _vacCalMes=null;          // 'YYYY-MM' para la vista calendario
var _vacDetId=null;           // registro abierto en el modal de detalle
var _vacDetAsis=[];           // rangos aplicados (empleado_asistencia) del detalle
var _vacDetLiqs=[];           // liquidaciones registradas del detalle

var VAC_BONO_BASE=15, VAC_BONO_TOPE=30;   // bono vacacional LOTTT art.192 (15 + 1/año, tope 30)
var VAC_FORMULA_NOTA='Cálculo (LOTTT): sueldo diario = sueldo mensual ÷ 30 · disfrute = sueldo diario × días hábiles (sin fines de semana ni feriados) · bono = sueldo diario × (15 + 1 por año, tope 30).';

var VAC_ESTADOS=[
  {k:'pendiente',    lbl:'Pendiente',      col:'#64748b'},
  {k:'por_coordinar',lbl:'Por coordinar',  col:'#dc2626'},
  {k:'programado',   lbl:'Programado',     col:'#2563eb'},
  {k:'disfrutado',   lbl:'Disfrutado',     col:'#16a34a'}
];

function _vacHoy(){ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }
function _vacEsAdmin(){ try{ return (typeof currentRole!=='undefined') && currentRole==='admin'; }catch(e){ return false; } }
function _vacPuedeVer(){ if(_vacEsAdmin())return true; try{ if(typeof _tabAllowed==='function')return _tabAllowed('vacaciones'); }catch(e){} try{ return ['gerente','veronica'].indexOf(currentRole)>=0; }catch(e){} return false; }
function _vacPuedeEditar(){ if(_vacEsAdmin())return true; try{ return ['gerente','veronica'].indexOf(currentRole)>=0; }catch(e){ return false; } }

function _vacEstMeta(k){ for(var i=0;i<VAC_ESTADOS.length;i++){ if(VAC_ESTADOS[i].k===k)return VAC_ESTADOS[i]; } return {k:k,lbl:(k||'—'),col:'#64748b'}; }
function _vacNorm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function _vacFmt(d){ if(!d)return '—'; var s=String(d).slice(0,10); var p=s.split('-'); return (p.length===3)?(p[2]+'/'+p[1]+'/'+p[0]):s; }
function _vacEnVacHoy(r){ var h=_vacHoy(); return r.fecha_inicio && r.fecha_final && String(r.fecha_inicio).slice(0,10)<=h && h<=String(r.fecha_final).slice(0,10); }
function _vacDiasEntre(a,b){ try{ var d1=new Date(a+'T00:00:00Z'), d2=new Date(b+'T00:00:00Z'); return Math.round((d2-d1)/86400000)+1; }catch(e){ return 0; } }
// Días hábiles: sin sábados, domingos ni feriados de Venezuela (sets globales _CB_FERIADOS_*)
function _vacEsFeriado(f){ try{ if(typeof esFeriado==='function')return esFeriado(f); }catch(e){} return false; }
function _vacNoHabil(f){ try{ if(typeof esNoHabil==='function')return esNoHabil(f); }catch(e){} var d=new Date(f+'T00:00:00'); var w=d.getDay(); return w===0||w===6; }
function _vacDiasHabiles(a,b){ if(!a||!b||b<a)return 0; var n=0,cur=a,g=0; while(cur<=b&&g<1000){ if(!_vacNoHabil(cur))n++; cur=_vacAddDia(cur); g++; } return n; }
function _vacSigHabil(f){ var cur=_vacAddDia(f), g=0; while(_vacNoHabil(cur)&&g<30){ cur=_vacAddDia(cur); g++; } return cur; }
function _vacFeriadoNombre(f){
  var N={'01-01':'Año Nuevo','01-06':'Día de Reyes','04-19':'19 de Abril','05-01':'Día del Trabajador','06-24':'Batalla de Carabobo','07-05':'Día de la Independencia','07-24':'Natalicio de Bolívar','10-12':'Día de la Resistencia Indígena','11-01':'Todos los Santos','12-24':'Nochebuena','12-25':'Navidad','12-31':'Fin de Año'};
  var mmdd=String(f).slice(5);
  if(N[mmdd])return N[mmdd];
  try{ if(typeof _CB_FERIADOS_VAR!=='undefined' && _CB_FERIADOS_VAR.has(f)){ return (+f.slice(5,7)<=3&&+f.slice(5,7)>=2)?'Carnaval':'Semana Santa'; } }catch(e){}
  return 'Feriado';
}

/* ---------- Carga ---------- */
function _vacEntrar(){ if(!_vacReady){ _vacCargar(); } else { _vacRender(); } }
function _vacCargar(){
  if(_vacLoading)return; _vacLoading=true;
  var cont=document.getElementById('vacaciones-content'); if(cont)cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">Cargando vacaciones…</div>';
  Promise.all([
    supabaseClient.from('vacaciones').select('*').order('empresa',{ascending:true}).order('nombre',{ascending:true}),
    supabaseClient.from('empleados').select('id,nombre,empresa,cargo,cedula,fecha_ingreso,activo'),
    supabaseClient.from('empleados_sueldo').select('empleado_id,sueldo_quincena')
  ]).then(function(res){
    _vacRows=(res[0].data||[]);
    _vacEmpleados=(res[1].data||[]);
    _vacSueldos={}; (res[2].data||[]).forEach(function(s){ _vacSueldos[String(s.empleado_id)]=_vacNum(s.sueldo_quincena); });
    _vacReady=true; _vacLoading=false; _vacRender();
  }).catch(function(err){
    _vacLoading=false;
    var c=document.getElementById('vacaciones-content'); if(c)c.innerHTML='<div style="padding:30px;text-align:center;color:var(--red)">Error al cargar: '+esc(String(err&&err.message||err))+'</div>';
  });
}
function _vacRefrescar(){ _vacReady=false; _vacCargar(); }
function _vacSetEmpresa(e){ _vacEmpresa=e; _vacRender(); }
function _vacSetEstado(e){ _vacEstado=e; _vacRender(); }
var _vacBuscarT=null;
// El buscador no puede re-renderizar en cada tecla: el input se reconstruye
// y pierde el foco (por eso solo dejaba escribir una letra). Debounce corto
// y al re-render se devuelve el foco con el cursor al final.
function _vacSetBuscar(v){
  _vacBuscar=v||'';
  clearTimeout(_vacBuscarT);
  _vacBuscarT=setTimeout(function(){
    _vacRender();
    var el=document.getElementById('vac-buscar');
    if(el){ el.focus(); try{ var n=el.value.length; el.setSelectionRange(n,n); }catch(e){} }
  },250);
}

/* ---------- Emparejamiento por nombre con empleados ---------- */
function _vacMatch(r){
  // 1) por cédula (lo más confiable si ya está cargada)
  if(r.ci){ var byCi=_vacEmpleados.filter(function(e){ return e.cedula && String(e.cedula).replace(/\D/g,'')===String(r.ci).replace(/\D/g,''); }); if(byCi.length===1){ var e=byCi[0]; return {id:e.id,nombre:e.nombre,empresa:e.empresa,score:1,hit:99,eff:2,porCedula:true}; } }
  // 2) por nombre (token overlap)
  var vt=_vacNorm(r.nombre).split(' ').filter(function(t){return t.length>=3;});
  if(!vt.length)return null;
  var emp=(r.empresa||'').toUpperCase();
  var best=null;
  _vacEmpleados.forEach(function(e){
    var et=_vacNorm(e.nombre).split(' ').filter(function(t){return t.length>=3;});
    if(!et.length)return;
    var hit=0; et.forEach(function(t){ if(vt.indexOf(t)>=0)hit++; });
    var score=hit/et.length;                 // 1.0 = todos los tokens del empleado están en el nombre oficial
    var mismaEmp=((e.empresa||'').toUpperCase()===emp);
    var eff=score+(mismaEmp?0.001:0);        // desempata a favor de misma empresa
    if(hit>0 && (!best || eff>best.eff)){ best={id:e.id,nombre:e.nombre,empresa:e.empresa,score:score,hit:hit,eff:eff}; }
  });
  return best;
}
function _vacEmpDe(r){ if(r.empleado_id){ var e=_vacEmpleados.filter(function(x){return String(x.id)===String(r.empleado_id);})[0]; if(e)return e; } var m=_vacMatch(r); if(m){ var e2=_vacEmpleados.filter(function(x){return String(x.id)===String(m.id);})[0]; if(e2)return e2; } return null; }

/* ---------- Económico / liquidación ---------- */
function _vacNum(v){ if(v==null)return 0; var n=parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; }
function _vacMoney(n){ n=_vacNum(n); return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _vacAnios(desde,hasta){ if(!desde)return 0; try{ var a=new Date(String(desde).slice(0,10)+'T00:00:00Z'), b=new Date((hasta?String(hasta).slice(0,10):_vacHoy())+'T00:00:00Z'); var y=b.getUTCFullYear()-a.getUTCFullYear(); var m=b.getUTCMonth()-a.getUTCMonth(); if(m<0||(m===0&&b.getUTCDate()<a.getUTCDate()))y--; return Math.max(0,y); }catch(e){ return 0; } }
function _vacPrimerNombre(r){ var e=_vacEmpDe(r); if(e&&e.nombre){ return String(e.nombre).trim().split(/\s+/)[0]; } var t=String(r.nombre||'').trim().split(/\s+/); return t.length>=3?t[2]:(t[t.length-1]||r.nombre||''); }
// Días de disfrute por defecto: los SELECCIONADOS (rango fecha_inicio→fecha_final) si existen; si no, los días de ley del período.
function _vacDiasSel(r){ if(r&&r.fecha_inicio&&r.fecha_final){ var d=_vacDiasHabiles(String(r.fecha_inicio).slice(0,10),String(r.fecha_final).slice(0,10)); if(d>0)return d; } return _vacNum(r&&r.dias)||0; }
// ov (opcional): { mensual, dias } para override manual (lo carga Verónica, todo en Bs)
function _vacLiq(r, ov){
  var e=_vacEmpDe(r);
  var empId=e?e.id:(r.empleado_id||null);
  var quincenaBase=(empId?_vacNum(_vacSueldos[String(empId)]):0);
  var mensual=(ov&&ov.mensual!=null&&ov.mensual!=='')?_vacNum(ov.mensual):(quincenaBase*2);
  var quincena=mensual/2;
  var diario=mensual/30;
  var anios=_vacAnios(r.fecha_ingreso, r.fecha_inicio||_vacHoy());
  var diasDisfrute=(ov&&ov.dias!=null&&ov.dias!=='')?_vacNum(ov.dias):_vacDiasSel(r);
  var diasBono=Math.min(VAC_BONO_TOPE, VAC_BONO_BASE+anios);
  var montoDisfrute=diario*diasDisfrute;
  var montoBono=diario*diasBono;
  var total=montoDisfrute+montoBono;
  return { empId:empId, empNombre:(e?e.nombre:null), cargo:(e?e.cargo:null), mensual:mensual, quincena:quincena, diario:diario, anios:anios,
    diasDisfrute:diasDisfrute, diasBono:diasBono, montoDisfrute:montoDisfrute, montoBono:montoBono, total:total,
    tieneSueldo:(mensual>0) };
}

/* ---------- Impresión (iframe oculto) ---------- */
function _vacImprimirDoc(titulo, html){
  var doc='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(titulo)+'</title><style>'+
    'body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:24px;font-size:13px}'+
    'h1{font-size:19px;margin:0}h2{font-size:14px;margin:18px 0 6px}'+
    '.hd{display:flex;align-items:center;gap:12px;border-bottom:3px solid #16a34a;padding-bottom:12px}'+
    '.sub{font-size:12px;color:#64748b;margin-top:2px}'+
    '.meta{font-size:12px;color:#475569;margin:12px 0}'+
    'table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12.5px}'+
    'th,td{border-bottom:1px solid #e2e8f0;padding:7px 9px;text-align:left}'+
    'th{background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:.3px}'+
    'td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}'+
    'tfoot td{font-weight:700;border-top:2px solid #16a34a;background:#f0fdf4}'+
    '.box{border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-top:10px}'+
    '.firma{margin-top:44px;display:flex;gap:40px}'+
    '.firma div{flex:1;border-top:1px solid #334155;padding-top:6px;font-size:11px;color:#475569;text-align:center}'+
    '.foot{margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}'+
    '.nota{font-size:10.5px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:7px 9px;margin-top:10px}'+
    '@media print{body{margin:12mm}}'+
    '</style></head><body>'+html+'</body></html>';
  var ifr=document.createElement('iframe'); ifr.setAttribute('aria-hidden','true'); ifr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
  document.body.appendChild(ifr);
  var idoc=ifr.contentWindow.document; idoc.open(); idoc.write(doc); idoc.close();
  setTimeout(function(){ try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }catch(e){ try{ window.print(); }catch(_e){} } setTimeout(function(){ try{ document.body.removeChild(ifr); }catch(e){} }, 1800); }, 400);
}
function _vacLogoHd(sub){ var logo='<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>'; return '<div class="hd">'+logo+'<div><h1>'+esc(sub.t)+'</h1><div class="sub">'+esc(sub.s||'Farmacia Claret · Droguería Clínica')+'</div></div></div>'; }

/* ---------- Toggles de vista ---------- */
function _vacSetVista(v){ _vacVista=v; if(v==='calendario'&&!_vacCalMes){ var h=_vacHoy(); _vacCalMes=h.slice(0,7); } _vacRender(); }
function _vacCalNav(delta){ if(!_vacCalMes)_vacCalMes=_vacHoy().slice(0,7); var y=+_vacCalMes.slice(0,4), m=+_vacCalMes.slice(5,7)-1+delta; var d=new Date(Date.UTC(y,m,1)); _vacCalMes=d.toISOString().slice(0,7); _vacRender(); }

/* ¿De qué años vienen los días pendientes? Se estima con la antigüedad:
   cada aniversario vencido otorga min(15 + (años-1), 30) días (LOTTT art.190)
   y el backlog se reparte desde el período vencido MÁS RECIENTE hacia atrás. */
function _vacBacklogAnios(r){
  var bk=_vacNum(r.dias_pendientes)||0; if(bk<=0)return [];
  var fi=r.fecha_ingreso?String(r.fecha_ingreso).slice(0,10):''; if(!fi||fi.length<10)return [];
  var hoy=_vacHoy();
  var y0=+fi.slice(0,4); var mmdd=fi.slice(5);
  var yv=+hoy.slice(0,4); if(hoy.slice(5)<mmdd)yv--;   // último aniversario cumplido (período vigente)
  var out=[];
  for(var y=yv-1; y>=y0+1 && bk>0; y--){
    var n=y-y0;                          // años de servicio cumplidos en ese aniversario
    var d=Math.min(15+(n-1),30);         // días que otorgó ese período
    var toma=Math.min(bk,d);
    out.push({anio:y,dias:toma});
    bk-=toma;
  }
  if(bk>0)out.push({anio:null,dias:bk}); // resto aún más viejo
  return out;
}

/* ---------- Pasivo laboral (días acumulados no disfrutados) ---------- */
function _vacPasivoDe(r){
  var backlog=_vacNum(r.dias_pendientes)||0;                       // períodos viejos sin disfrutar
  var actual=(r.estado==='disfrutado')?0:(_vacNum(r.dias)||0);      // período vigente si aún no lo tomó
  var dias=backlog+actual;
  var liq=_vacLiq(r);
  var valor=liq.tieneSueldo? (liq.diario*dias) : null;
  return { backlog:backlog, actual:actual, dias:dias, valor:valor, tieneSueldo:liq.tieneSueldo };
}
function _vacPasivoTotal(rows){
  var dias=0, valor=0, sinSueldo=0, personas=0;
  rows.forEach(function(r){ var p=_vacPasivoDe(r); if(p.dias>0)personas++; dias+=p.dias; if(p.valor==null){ if(p.dias>0)sinSueldo++; } else valor+=p.valor; });
  return { dias:dias, valor:valor, sinSueldo:sinSueldo, personas:personas };
}

/* ---------- Choques de cobertura (solapamientos por empresa) ---------- */
function _vacSolape(a,b){
  if(!a.fecha_inicio||!a.fecha_final||!b.fecha_inicio||!b.fecha_final)return false;
  var ai=String(a.fecha_inicio).slice(0,10), af=String(a.fecha_final).slice(0,10);
  var bi=String(b.fecha_inicio).slice(0,10), bf=String(b.fecha_final).slice(0,10);
  return ai<=bf && bi<=af;
}
function _vacSolapes(){
  var conFechas=_vacRows.filter(function(r){ return r.fecha_inicio&&r.fecha_final&&r.estado!=='disfrutado'; });
  var pares=[];
  for(var i=0;i<conFechas.length;i++){ for(var j=i+1;j<conFechas.length;j++){
    var a=conFechas[i], b=conFechas[j];
    if((a.empresa||'').toUpperCase()!==(b.empresa||'').toUpperCase())continue;
    if(_vacEmpresa!=='TODAS' && (a.empresa||'').toUpperCase()!==_vacEmpresa)continue;
    if(_vacSolape(a,b)){ var ini=(String(a.fecha_inicio)>String(b.fecha_inicio)?a.fecha_inicio:b.fecha_inicio); var fin=(String(a.fecha_final)<String(b.fecha_final)?a.fecha_final:b.fecha_final); pares.push({a:a,b:b,ini:ini,fin:fin}); }
  }}
  return pares;
}
function _vacDiasHasta(f){ if(!f)return null; return _vacDiasEntre(_vacHoy(), String(f).slice(0,10))-1; }

/* ---------- Alertas ---------- */
function _vacAlertas(){
  var h=_vacHoy();
  var enEmpresa=function(r){ return _vacEmpresa==='TODAS' || (r.empresa||'').toUpperCase()===_vacEmpresa; };
  var porVencer=_vacRows.filter(function(r){ if(!enEmpresa(r))return false; if(r.estado==='disfrutado')return false; if(!r.vencimiento)return false; var d=_vacDiasHasta(r.vencimiento); return d!=null && d<=60; })
    .sort(function(a,b){ return String(a.vencimiento).localeCompare(String(b.vencimiento)); });
  var salePronto=_vacRows.filter(function(r){ if(!enEmpresa(r))return false; if(!r.fecha_inicio)return false; var fi=String(r.fecha_inicio).slice(0,10); return fi>=h && _vacDiasEntre(h,fi)<=15; })
    .sort(function(a,b){ return String(a.fecha_inicio).localeCompare(String(b.fecha_inicio)); });
  var solapes=_vacSolapes();
  return { porVencer:porVencer, salePronto:salePronto, solapes:solapes };
}

/* ---------- Render ---------- */
function _vacRender(){
  var cont=document.getElementById('vacaciones-content'); if(!cont)return;
  if(!_vacPuedeVer()){ cont.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">No tienes acceso a este módulo.</div>'; return; }

  var q=_vacNorm(_vacBuscar);
  var rows=_vacRows.filter(function(r){
    if(_vacEmpresa!=='TODAS' && (r.empresa||'').toUpperCase()!==_vacEmpresa)return false;
    if(_vacEstado!=='TODOS' && r.estado!==_vacEstado)return false;
    if(q && _vacNorm(r.nombre).indexOf(q)<0 && String(r.ci||'').indexOf(q)<0)return false;
    return true;
  });

  // Resumen sobre el universo (filtrado solo por empresa, no por estado/búsqueda)
  var universo=_vacRows.filter(function(r){ return _vacEmpresa==='TODAS' || (r.empresa||'').toUpperCase()===_vacEmpresa; });
  var porEstado={}; VAC_ESTADOS.forEach(function(s){porEstado[s.k]=0;});
  universo.forEach(function(r){ if(porEstado.hasOwnProperty(r.estado))porEstado[r.estado]++; else porEstado[r.estado]=(porEstado[r.estado]||0)+1; });
  var hoyN=universo.filter(_vacEnVacHoy).length;
  var h=_vacHoy();
  var proxN=universo.filter(function(r){ if(!r.fecha_inicio)return false; var fi=String(r.fecha_inicio).slice(0,10); return fi>h && _vacDiasEntre(h,fi)<=60; }).length;

  var empChips=['TODAS','FARMACIA','DROGUERIA'].map(function(x){ return '<button class="fchip'+(_vacEmpresa===x?' active':'')+'" onclick="_vacSetEmpresa(\''+x+'\')" style="font-size:12px">'+(x==='TODAS'?'Todas':(x.charAt(0)+x.slice(1).toLowerCase()))+'</button>'; }).join('');
  var estChips=[{k:'TODOS',lbl:'Todos'}].concat(VAC_ESTADOS).map(function(x){ var act=(_vacEstado===x.k); return '<button class="fchip'+(act?' active':'')+'" onclick="_vacSetEstado(\''+x.k+'\')" style="font-size:12px">'+esc(x.lbl)+'</button>'; }).join('');

  var head=''+
    '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px">'+
      '<div><div style="font-size:19px;font-weight:800">Programa de Vacaciones</div>'+
      '<div style="font-size:12px;color:var(--muted);margin-top:2px">Calendario consolidado de Farmacia y Droguería. Al programar un disfrute puedes aplicarlo al sistema para que bloquee vales y cuente en RRHH.</div></div>'+
      '<button class="fchip" onclick="_vacRefrescar()" style="font-size:12px">↻ Actualizar</button>'+
    '</div>';

  var pas=_vacPasivoTotal(universo);
  var resumen=''+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+
      '<div class="tbox" style="padding:11px 13px;flex:1;min-width:110px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">De vacaciones hoy</div><div style="font-size:24px;font-weight:800;margin-top:2px;color:'+(hoyN?'#16a34a':'var(--text)')+'">'+hoyN+'</div></div>'+
      '<div class="tbox" style="padding:11px 13px;flex:1;min-width:110px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Próximos 60 días</div><div style="font-size:24px;font-weight:800;margin-top:2px;color:'+(proxN?'#2563eb':'var(--text)')+'">'+proxN+'</div></div>'+
      '<div class="tbox" style="padding:11px 13px;flex:1;min-width:110px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Por coordinar</div><div style="font-size:24px;font-weight:800;margin-top:2px;color:'+(porEstado.por_coordinar?'#dc2626':'var(--text)')+'">'+(porEstado.por_coordinar||0)+'</div></div>'+
      '<div class="tbox" title="Días de vacaciones acumulados no disfrutados (backlog + período vigente). Estimado, editable." style="padding:11px 13px;flex:1;min-width:130px;border-left:3px solid #d97706"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Pasivo (días · Bs)</div><div style="font-size:22px;font-weight:800;margin-top:2px;color:#b45309">'+pas.dias+'<span style="font-size:12px;font-weight:600;color:var(--muted)"> días</span></div><div style="font-size:12px;font-weight:700;color:#b45309">'+(pas.valor!=null?('Bs '+_vacMoney(pas.valor)):'—')+(pas.sinSueldo?(' <span style="color:var(--muted);font-weight:500">(+'+pas.sinSueldo+' s/sueldo)</span>'):'')+'</div></div>'+
    '</div>';

  var alertasHTML=_vacAlertasHTML();

  var vistaTog=''+
    '<div style="display:inline-flex;border:1px solid var(--border);border-radius:9px;overflow:hidden;margin-bottom:12px">'+
      '<button onclick="_vacSetVista(\'lista\')" style="border:none;cursor:pointer;padding:7px 14px;font-size:12.5px;font-weight:700;'+(_vacVista==='lista'?'background:#16a34a;color:#fff':'background:var(--surface);color:var(--muted)')+'">☰ Lista</button>'+
      '<button onclick="_vacSetVista(\'calendario\')" style="border:none;cursor:pointer;padding:7px 14px;font-size:12.5px;font-weight:700;'+(_vacVista==='calendario'?'background:#16a34a;color:#fff':'background:var(--surface);color:var(--muted)')+'">🗓 Calendario</button>'+
    '</div>';

  if(_vacVista==='calendario'){
    cont.innerHTML=head+resumen+alertasHTML+vistaTog+'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+empChips+'</div>'+_vacCalendarioHTML();
    return;
  }

  var filtros=''+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'+empChips+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'+estChips+'</div>'+
    '<input id="vac-buscar" type="text" value="'+esc(_vacBuscar)+'" oninput="_vacSetBuscar(this.value)" placeholder="Buscar por nombre o cédula…" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px;margin-bottom:12px">';

  // Orden: de vacaciones hoy primero, luego por_coordinar, luego por fecha_inicio próxima
  rows.sort(function(a,b){
    var ah=_vacEnVacHoy(a)?0:1, bh=_vacEnVacHoy(b)?0:1; if(ah!==bh)return ah-bh;
    var ap=(a.estado==='por_coordinar')?0:1, bp=(b.estado==='por_coordinar')?0:1; if(ap!==bp)return ap-bp;
    var ai=a.fecha_inicio?String(a.fecha_inicio):'9999', bi=b.fecha_inicio?String(b.fecha_inicio):'9999';
    if(ai!==bi)return ai<bi?-1:1;
    return String(a.nombre||'').localeCompare(String(b.nombre||''));
  });

  var cards=rows.length?rows.map(_vacCard).join(''):'<div style="padding:30px;text-align:center;color:var(--muted)">No hay registros para este filtro.</div>';
  cont.innerHTML=head+resumen+alertasHTML+vistaTog+filtros+'<div style="display:flex;flex-direction:column;gap:9px">'+cards+'</div>';
}

function _vacAlertasHTML(){
  var A=_vacAlertas();
  var items=[];
  if(A.solapes.length){
    var det=A.solapes.slice(0,6).map(function(p){ return '<div style="font-size:11.5px;margin-top:3px">⚠ <b>'+esc(_vacPrimerNombre(p.a))+'</b> y <b>'+esc(_vacPrimerNombre(p.b))+'</b> ('+esc((p.a.empresa||'').charAt(0)+(p.a.empresa||'').slice(1).toLowerCase())+') coinciden '+_vacFmt(p.ini)+'→'+_vacFmt(p.fin)+'</div>'; }).join('');
    items.push({col:'#dc2626',bg:'#fef2f2',ic:'🚨',t:'Choques de cobertura ('+A.solapes.length+')',d:det+(A.solapes.length>6?('<div style="font-size:11px;color:var(--muted)">y '+(A.solapes.length-6)+' más…</div>'):'')});
  }
  if(A.salePronto.length){
    var d2=A.salePronto.slice(0,8).map(function(r){ var dd=_vacDiasEntre(_vacHoy(),String(r.fecha_inicio).slice(0,10))-1; return '<div style="font-size:11.5px;margin-top:3px">🌴 <b>'+esc(_vacPrimerNombre(r))+'</b> sale el '+_vacFmt(r.fecha_inicio)+(dd<=0?' (hoy/ya)':(' (en '+dd+' días)'))+'</div>'; }).join('');
    items.push({col:'#2563eb',bg:'#eff6ff',ic:'📅',t:'Salen en 15 días ('+A.salePronto.length+')',d:d2});
  }
  if(A.porVencer.length){
    var d3=A.porVencer.slice(0,8).map(function(r){ var dd=_vacDiasHasta(r.vencimiento); return '<div style="font-size:11.5px;margin-top:3px">⏳ <b>'+esc(_vacPrimerNombre(r))+'</b> vence su derecho el '+_vacFmt(r.vencimiento)+(dd!=null?(dd<0?' (vencido)':(' (en '+dd+' días)')):'')+'</div>'; }).join('');
    items.push({col:'#b45309',bg:'#fffbeb',ic:'⏳',t:'Derecho por vencer ('+A.porVencer.length+')',d:d3});
  }
  if(!items.length)return '';
  var open=!!window._vacAlertasOpen;
  var chips=items.map(function(x){ return '<span style="font-size:11.5px;font-weight:700;color:'+x.col+';white-space:nowrap">'+x.ic+' '+esc(x.t)+'</span>'; }).join('<span style="color:var(--border);margin:0 3px">·</span>');
  var det=open?('<div style="display:flex;flex-direction:column;gap:8px;margin-top:9px">'+items.map(function(x){ return '<div style="border:1px solid '+x.col+'33;background:'+x.bg+';border-radius:10px;padding:9px 12px"><div style="font-size:12.5px;font-weight:800;color:'+x.col+'">'+x.ic+' '+esc(x.t)+'</div>'+x.d+'</div>'; }).join('')+'</div>'):'';
  return '<div class="tbox" style="padding:8px 12px;margin-bottom:12px;background:var(--surface2)"><div onclick="_vacToggleAlertas()" style="display:flex;align-items:center;gap:9px;cursor:pointer;user-select:none"><span style="font-size:10.5px;font-weight:800;color:var(--muted);letter-spacing:.4px;flex:none">AVISOS</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+chips+'</span><span style="font-size:11px;color:var(--muted);flex:none">'+(open?'ocultar ▲':'ver ▼')+'</span></div>'+det+'</div>';
}
function _vacToggleAlertas(){ window._vacAlertasOpen=!window._vacAlertasOpen; _vacRender(); }

function _vacCard(r){
  var m=_vacEstMeta(r.estado);
  var enHoy=_vacEnVacHoy(r);
  var badge='<span style="display:inline-block;background:'+m.col+';color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.3px">'+esc(m.lbl)+'</span>';
  var hoyBadge=enHoy?'<span style="display:inline-block;background:#16a34a;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;margin-left:6px">● DE VACACIONES HOY</span>':'';
  var aplBadge=r.aplicado?'<span title="Aplicado al sistema" style="display:inline-block;color:#16a34a;font-size:11px;font-weight:700;margin-left:6px">✓ en sistema</span>':'';

  var fechas='';
  if(r.fecha_inicio||r.fecha_final){
    var dd=(r.fecha_inicio&&r.fecha_final)?(' · '+_vacDiasHabiles(String(r.fecha_inicio).slice(0,10),String(r.fecha_final).slice(0,10))+' días hábiles'):'';
    var rein=r.reintegro?String(r.reintegro).slice(0,10):(r.fecha_final?_vacSigHabil(String(r.fecha_final).slice(0,10)):null);
    fechas='<div style="font-size:12px;margin-top:4px"><b>Disfrute:</b> '+_vacFmt(r.fecha_inicio)+' → '+_vacFmt(r.fecha_final)+dd+(rein?(' · Reintegro '+_vacFmt(rein)+(r.reintegro?'':' <span style="color:var(--muted)">(sugerido)</span>')):'')+'</div>';
  }
  var venc='<div style="font-size:11px;color:var(--muted);margin-top:3px">Ingreso '+_vacFmt(r.fecha_ingreso)+' · Vence derecho '+_vacFmt(r.vencimiento)+' · '+(r.dias||0)+' días de ley</div>';
  // Vacaciones pendientes de años anteriores, siempre visibles en la tarjeta
  var bk=_vacNum(r.dias_pendientes)||0, pend='';
  if(bk>0){
    var liqC=_vacLiq(r);
    var detA=_vacBacklogAnios(r);
    var detTx=detA.length?('<div style="font-size:11px;margin-top:3px;color:#a16207">De: '+detA.map(function(d){ return '<b>'+(d.anio||'antes')+'</b>: '+d.dias+' d'; }).join(' · ')+' <span style="opacity:.7">(estimado por antigüedad)</span></div>'):'<div style="font-size:11px;margin-top:3px;color:#a16207">Sin fecha de ingreso no se puede detallar de qué años vienen.</div>';
    pend='<div style="font-size:12px;margin-top:6px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:5px 9px;color:#92400e"><b>🟠 '+bk+' día'+(bk===1?'':'s')+' pendiente'+(bk===1?'':'s')+' de años anteriores</b>'+(liqC.tieneSueldo?(' · ≈ Bs '+_vacMoney(liqC.diario*bk)):'')+detTx+'</div>';
  }
  var obs=r.obs?('<div style="font-size:12px;color:var(--muted);margin-top:6px;padding-top:6px;border-top:1px dashed var(--border)">📌 '+esc(r.obs)+'</div>'):'';

  var btns='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+
    '<button onclick="event.stopPropagation();_vacDetalle('+r.id+')" class="fchip" style="font-size:12px">🔍 Ver detalle</button>';
  if(_vacPuedeEditar()){
    btns+='<button onclick="event.stopPropagation();_vacAbrirEdit('+r.id+')" class="fchip" style="font-size:12px">✎ Editar</button>';
    if(r.fecha_inicio&&r.fecha_final){
      btns+='<button onclick="event.stopPropagation();_vacAbrirAplicar('+r.id+')" class="fchip" style="font-size:12px">'+(r.aplicado?'↻ Reaplicar al sistema':'➜ Aplicar al sistema')+'</button>';
    }
  }
  btns+='</div>';

  return '<div class="tbox" onclick="_vacDetalle('+r.id+')" style="padding:13px;border-left:4px solid '+m.col+';cursor:pointer" title="Ver detalle y liquidación">'+
    '<div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap">'+
      '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:700">'+esc(r.nombre)+'</div>'+
      '<div style="font-size:11px;color:var(--muted)">'+esc((r.empresa||'').charAt(0)+(r.empresa||'').slice(1).toLowerCase())+(r.ci?(' · C.I. '+esc(r.ci)):'')+'</div></div>'+
      '<div style="text-align:right">'+badge+hoyBadge+aplBadge+'</div>'+
    '</div>'+
    fechas+venc+pend+obs+btns+
  '</div>';
}

/* ---------- Editar (modal) ---------- */
function _vacAbrirEdit(id){
  if(!_vacPuedeEditar())return;
  var r=_vacRows.filter(function(x){return String(x.id)===String(id);})[0]; if(!r)return;
  _vacEditTmp={ id:r.id, nombre:r.nombre, empresa:r.empresa,
    estado:r.estado||'pendiente',
    fecha_inicio:r.fecha_inicio?String(r.fecha_inicio).slice(0,10):'',
    fecha_final:r.fecha_final?String(r.fecha_final).slice(0,10):'',
    reintegro:r.reintegro?String(r.reintegro).slice(0,10):'',
    dias_pendientes:(_vacNum(r.dias_pendientes)||0),
    obs:r.obs||'' };
  var host=document.getElementById('vac-modal-host'); if(!host){ host=document.createElement('div'); host.id='vac-modal-host'; document.body.appendChild(host); }
  host.innerHTML=_vacEditHTML();
}
function _vacCerrarModal(){ var h=document.getElementById('vac-modal-host'); if(h)h.innerHTML=''; _vacEditTmp=null; _vacAplTmp=null; }
function _vacEditSet(k,v){ if(_vacEditTmp)_vacEditTmp[k]=v; }
// Al cambiar las fechas: recalcula los días hábiles y propone el reintegro (siguiente día hábil tras el último día)
function _vacEditFechas(k,v){
  if(!_vacEditTmp)return; _vacEditTmp[k]=v;
  var t=_vacEditTmp;
  var h=document.getElementById('vac-ed-habiles');
  if(h)h.textContent=(t.fecha_inicio&&t.fecha_final&&t.fecha_final>=t.fecha_inicio)?('☑ '+_vacDiasHabiles(t.fecha_inicio,t.fecha_final)+' días hábiles (sin fines de semana ni feriados)'):'';
  if(k==='fecha_final'&&v){
    var sig=_vacSigHabil(v); t.reintegro=sig;
    var el=document.getElementById('vac-ed-rein'); if(el)el.value=sig;
  }
}

function _vacEditHTML(){
  var t=_vacEditTmp; if(!t)return '';
  var estOpts=VAC_ESTADOS.map(function(s){ return '<option value="'+s.k+'"'+(t.estado===s.k?' selected':'')+'>'+esc(s.lbl)+'</option>'; }).join('');
  var fld=function(lbl,k,type){ return '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">'+lbl+'</span><input type="'+type+'" value="'+esc(t[k]||'')+'" oninput="_vacEditSet(\''+k+'\',this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'; };
  return '<div onclick="_vacCerrarModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">'+
    '<div onclick="event.stopPropagation()" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:440px;width:100%;max-height:90vh;overflow:auto;padding:18px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:16px;font-weight:800">Editar vacaciones</div><button onclick="_vacCerrarModal()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button></div>'+
      '<div style="font-size:13px;font-weight:700;margin-bottom:2px">'+esc(t.nombre)+'</div>'+
      '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Estado</span><select onchange="_vacEditSet(\'estado\',this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px">'+estOpts+'</select></label>'+
      '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Inicio del disfrute</span><input type="date" value="'+esc(t.fecha_inicio||'')+'" oninput="_vacEditFechas(\'fecha_inicio\',this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
      '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Último día</span><input type="date" value="'+esc(t.fecha_final||'')+'" oninput="_vacEditFechas(\'fecha_final\',this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
      '<div id="vac-ed-habiles" style="font-size:11px;color:#0f766e;margin-top:4px">'+((t.fecha_inicio&&t.fecha_final)?('☑ '+_vacDiasHabiles(t.fecha_inicio,t.fecha_final)+' días hábiles (sin fines de semana ni feriados)'):'')+'</div>'+
      '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Reintegro (se calcula solo: siguiente día hábil)</span><input id="vac-ed-rein" type="date" value="'+esc(t.reintegro||'')+'" oninput="_vacEditSet(\'reintegro\',this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
      '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Días pendientes de años anteriores (pasivo)</span><input type="number" min="0" value="'+esc(String(t.dias_pendientes||0))+'" oninput="_vacEditSet(\'dias_pendientes\',this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
      '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Observación</span><textarea oninput="_vacEditSet(\'obs\',this.value)" style="width:100%;box-sizing:border-box;min-height:56px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px">'+esc(t.obs||'')+'</textarea></label>'+
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'+
        '<button onclick="_vacCerrarModal()" class="fchip" style="font-size:13px">Cancelar</button>'+
        '<button onclick="_vacGuardarEdit()" style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function _vacGuardarEdit(){
  if(!_vacEditTmp||!_vacPuedeEditar())return;
  var t=_vacEditTmp;
  if(t.fecha_inicio && t.fecha_final && t.fecha_final<t.fecha_inicio){ if(typeof showToast==='function')showToast('El último día no puede ser antes del inicio'); return; }
  var patch={ estado:t.estado,
    fecha_inicio:t.fecha_inicio||null, fecha_final:t.fecha_final||null, reintegro:t.reintegro||null,
    dias_pendientes:(_vacNum(t.dias_pendientes)||0),
    obs:(t.obs||'').trim()||null, actualizado_en:new Date().toISOString() };
  supabaseClient.from('vacaciones').update(patch).eq('id',t.id).select('*').then(function(res){
    if(res.error){ if(typeof showToast==='function')showToast('Error al guardar: '+res.error.message); return; }
    var saved=(res.data&&res.data[0])?res.data[0]:null;
    if(saved){ for(var i=0;i<_vacRows.length;i++){ if(String(_vacRows[i].id)===String(t.id)){ _vacRows[i]=saved; break; } } }
    if(typeof logAudit==='function')logAudit('vacaciones_edit','Editó vacaciones de '+t.nombre);
    _vacCerrarModal(); _vacRender();
    if(typeof showToast==='function')showToast('Guardado ✓');
  });
}

/* ---------- Aplicar al sistema (modal) ---------- */
function _vacAbrirAplicar(id){
  if(!_vacPuedeEditar())return;
  var r=_vacRows.filter(function(x){return String(x.id)===String(id);})[0]; if(!r)return;
  if(!r.fecha_inicio||!r.fecha_final){ if(typeof showToast==='function')showToast('Primero define las fechas de disfrute'); return; }
  var guess=_vacMatch(r);
  _vacAplTmp={ id:r.id, nombre:r.nombre, empresa:r.empresa,
    fi:String(r.fecha_inicio).slice(0,10), ff:String(r.fecha_final).slice(0,10),
    empId:guess?String(guess.id):'', guess:guess };
  var host=document.getElementById('vac-modal-host'); if(!host){ host=document.createElement('div'); host.id='vac-modal-host'; document.body.appendChild(host); }
  host.innerHTML=_vacAplHTML();
}
function _vacAplSet(v){ if(_vacAplTmp)_vacAplTmp.empId=v; }

function _vacAplHTML(){
  var t=_vacAplTmp; if(!t)return '';
  var dias=_vacDiasHabiles(t.fi,t.ff);
  // empleados de misma empresa primero
  var emp=(t.empresa||'').toUpperCase();
  var lst=_vacEmpleados.slice().sort(function(a,b){
    var ae=((a.empresa||'').toUpperCase()===emp)?0:1, be=((b.empresa||'').toUpperCase()===emp)?0:1;
    if(ae!==be)return ae-be; return String(a.nombre||'').localeCompare(String(b.nombre||''));
  });
  var opts='<option value="">— Selecciona el empleado —</option>'+lst.map(function(e){
    return '<option value="'+e.id+'"'+(String(t.empId)===String(e.id)?' selected':'')+'>'+esc(e.nombre)+' ('+esc((e.empresa||'').charAt(0)+(e.empresa||'').slice(1).toLowerCase())+')'+(e.activo===false?' · inactivo':'')+'</option>';
  }).join('');
  var conf=t.guess?('<div style="font-size:12px;color:'+(t.guess.score>=1?'#16a34a':'#d97706')+';margin-top:6px">'+(t.guess.score>=1?'Coincidencia sugerida: ':'Coincidencia parcial (verifica): ')+esc(t.guess.nombre)+'</div>'):'<div style="font-size:12px;color:#dc2626;margin-top:6px">No se encontró coincidencia automática. Selecciona manualmente.</div>';
  return '<div onclick="_vacCerrarModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">'+
    '<div onclick="event.stopPropagation()" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:18px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:16px;font-weight:800">Aprobar y aplicar</div><button onclick="_vacCerrarModal()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button></div>'+
      '<div style="font-size:13px;color:var(--muted);margin-bottom:8px">Se aprueban y marcan <b>'+dias+' día'+(dias===1?'':'s')+' hábil'+(dias===1?'':'es')+'</b> ('+_vacFmt(t.fi)+' → '+_vacFmt(t.ff)+', sin fines de semana ni feriados) como <b>vacaciones</b> en el sistema. Quedará aprobado a tu nombre, bloqueará vales y se reflejará en turnos, RRHH y desempeño.</div>'+
      '<div style="font-size:13px;font-weight:700">'+esc(t.nombre)+'</div>'+
      '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">¿A qué empleado corresponde?</span><select onchange="_vacAplSet(this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px">'+opts+'</select></label>'+
      conf+
      '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'+
        '<button onclick="_vacCerrarModal()" class="fchip" style="font-size:13px">Cancelar</button>'+
        '<button onclick="_vacConfirmarAplicar()" style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer">✓ Aprobar y aplicar</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function _vacConfirmarAplicar(){
  if(!_vacAplTmp||!_vacPuedeEditar())return;
  var t=_vacAplTmp;
  if(!t.empId){ if(typeof showToast==='function')showToast('Selecciona el empleado'); return; }
  var e=_vacEmpleados.filter(function(x){return String(x.id)===String(t.empId);})[0]; if(!e){ if(typeof showToast==='function')showToast('Empleado no válido'); return; }
  // construir un registro por día del rango
  var filas=[]; var cur=t.fi; var guard=0;
  while(cur<=t.ff && guard<400){
    if(!_vacNoHabil(cur)){ // los fines de semana y feriados no cuentan como días de vacaciones
      filas.push({ empleado_id:parseInt(t.empId,10), empleado_nombre:e.nombre, empresa:(e.empresa||t.empresa||''), fecha:cur, tipo:'vacaciones', horas:0, nota:'Vacaciones programadas', creado_por:((typeof currentUser!=='undefined')?currentUser:'') });
    }
    cur=_vacAddDia(cur); guard++;
  }
  if(!filas.length){ if(typeof showToast==='function')showToast('Rango de fechas inválido'); return; }
  // limpiar días previos tipo=vacaciones de ese empleado dentro del rango, luego insertar
  supabaseClient.from('empleado_asistencia').delete().eq('empleado_id',parseInt(t.empId,10)).eq('tipo','vacaciones').gte('fecha',t.fi).lte('fecha',t.ff).then(function(){
    return supabaseClient.from('empleado_asistencia').insert(filas);
  }).then(function(res){
    if(res&&res.error){ if(typeof showToast==='function')showToast('Error al aplicar: '+res.error.message); return; }
    var quien=((typeof currentUser!=='undefined')?currentUser:'');
    return supabaseClient.from('vacaciones').update({ empleado_id:parseInt(t.empId,10), aplicado:true, aprobado_por:quien, aprobado_en:new Date().toISOString(), estado:'programado', actualizado_en:new Date().toISOString() }).eq('id',t.id).select('*');
  }).then(function(res){
    if(res&&res.data&&res.data[0]){ for(var i=0;i<_vacRows.length;i++){ if(String(_vacRows[i].id)===String(t.id)){ _vacRows[i]=res.data[0]; break; } } }
    if(typeof logAudit==='function')logAudit('vacaciones_aplicar','Aplicó vacaciones de '+t.nombre+' → '+e.nombre+' ('+t.fi+' a '+t.ff+')');
    _vacCerrarModal(); _vacRender();
    if(typeof showToast==='function')showToast('Aplicado al sistema ✓');
  }).catch(function(err){ if(typeof showToast==='function')showToast('Error: '+(err&&err.message||err)); });
}
function _vacAddDia(d){ var dt=new Date(d+'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate()+1); return dt.toISOString().slice(0,10); }

/* ============================================================
   DETALLE (tarjeta ampliada) — historial, antigüedad, liquidación
   ============================================================ */
function _vacDetalle(id){
  var r=_vacRows.filter(function(x){return String(x.id)===String(id);})[0]; if(!r)return;
  _vacDetId=r.id; _vacDetAsis=[]; _vacDetLiqs=[];
  var host=document.getElementById('vac-modal-host'); if(!host){ host=document.createElement('div'); host.id='vac-modal-host'; document.body.appendChild(host); }
  host.innerHTML='<div onclick="_vacCerrarModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px"><div onclick="event.stopPropagation()" style="background:var(--surface);border-radius:14px;padding:24px;color:var(--muted)">Cargando detalle…</div></div>';
  var e=_vacEmpDe(r);
  var q1= e ? supabaseClient.from('empleado_asistencia').select('fecha,tipo,nota').eq('empleado_id',e.id).eq('tipo','vacaciones').order('fecha',{ascending:true}) : Promise.resolve({data:[]});
  var q2= supabaseClient.from('vacaciones_liquidaciones').select('*').eq('vacacion_id',r.id).order('creado_en',{ascending:false});
  Promise.all([q1,q2]).then(function(res){
    _vacDetAsis=(res[0]&&res[0].data)||[];
    _vacDetLiqs=(res[1]&&res[1].data)||[];
    var h=document.getElementById('vac-modal-host'); if(h)h.innerHTML=_vacDetHTML(r);
  }).catch(function(){ var h=document.getElementById('vac-modal-host'); if(h)h.innerHTML=_vacDetHTML(r); });
}

function _vacRangos(asis){
  // agrupa fechas consecutivas en rangos {ini,fin,dias}
  var fs=(asis||[]).map(function(a){return String(a.fecha).slice(0,10);}).filter(Boolean).sort();
  var out=[], ini=null, prev=null;
  fs.forEach(function(f){
    if(ini===null){ ini=f; prev=f; return; }
    if(_vacAddDia(prev)===f||_vacSigHabil(prev)===f){ prev=f; return; }
    out.push({ini:ini,fin:prev,dias:_vacDiasHabiles(ini,prev)}); ini=f; prev=f;
  });
  if(ini!==null)out.push({ini:ini,fin:prev,dias:_vacDiasHabiles(ini,prev)});
  return out;
}

function _vacDetHTML(r){
  var m=_vacEstMeta(r.estado);
  var e=_vacEmpDe(r);
  var liq=_vacLiq(r);
  var anios=_vacAnios(r.fecha_ingreso, r.fecha_inicio||_vacHoy());
  var badge='<span style="display:inline-block;background:'+m.col+';color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.3px">'+esc(m.lbl)+'</span>';

  var info=''+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:12.5px;margin-top:10px">'+
      _vacKV('Empresa',(r.empresa||'').charAt(0)+(r.empresa||'').slice(1).toLowerCase())+
      _vacKV('C.I.',r.ci||'—')+
      _vacKV('Cargo',(e&&e.cargo)?e.cargo:'—')+
      _vacKV('Vinculado a',(e?e.nombre:'⚠ sin empleado en sistema'))+
      _vacKV('Fecha de ingreso',_vacFmt(r.fecha_ingreso))+
      _vacKV('Antigüedad',anios+' año'+(anios===1?'':'s'))+
      _vacKV('Vence derecho',_vacFmt(r.vencimiento))+
      _vacKV('Días de ley',(r.dias||0)+' días')+
    '</div>';

  var disfrute='';
  if(r.fecha_inicio||r.fecha_final){
    var dd=(r.fecha_inicio&&r.fecha_final)?_vacDiasHabiles(String(r.fecha_inicio).slice(0,10),String(r.fecha_final).slice(0,10)):null;
    var reinD=r.reintegro?String(r.reintegro).slice(0,10):(r.fecha_final?_vacSigHabil(String(r.fecha_final).slice(0,10)):null);
    disfrute='<div class="tbox" style="padding:11px 13px;margin-top:12px"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px">Disfrute programado</div>'+
      '<div style="font-size:13.5px;font-weight:700">'+_vacFmt(r.fecha_inicio)+' → '+_vacFmt(r.fecha_final)+(dd?(' · '+dd+' días hábiles'):'')+'</div>'+
      (reinD?('<div style="font-size:12px;color:var(--muted);margin-top:2px">Se reintegra el '+_vacFmt(reinD)+(r.reintegro?'':' (siguiente día hábil, sugerido)')+'</div>'):'')+'</div>';
  }

  // Historial de días efectivamente tomados (empleado_asistencia)
  var rangos=_vacRangos(_vacDetAsis);
  var histHTML='';
  if(rangos.length){
    histHTML='<h4 style="font-size:12px;text-transform:uppercase;letter-spacing:.3px;color:var(--muted);margin:16px 0 4px">Historial en el sistema</h4>'+
      rangos.map(function(g){ return '<div style="font-size:12.5px;padding:5px 0;border-bottom:1px dashed var(--border)">🌴 '+_vacFmt(g.ini)+' → '+_vacFmt(g.fin)+' <span style="color:var(--muted)">· '+g.dias+' día'+(g.dias===1?'':'s')+'</span></div>'; }).join('');
  }

  // Liquidación económica (editable, en Bs — Verónica carga el sueldo MENSUAL; el disfrute usa días hábiles)
  window._vacLiqCur={id:r.id, mensual:liq.mensual, dias:liq.diasDisfrute, liq:liq};
  var _inpSt='text-align:right;font-weight:700;width:130px;padding:5px 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text)';
  var liqHTML=''+
    '<h4 style="font-size:12px;text-transform:uppercase;letter-spacing:.3px;color:var(--muted);margin:16px 0 4px">Liquidación de vacaciones <span style="text-transform:none;font-weight:500">· en bolívares</span></h4>'+
    '<div class="tbox" style="padding:12px 13px">'+
      '<div style="display:grid;grid-template-columns:1fr auto;gap:8px 10px;font-size:12.5px;align-items:center">'+
        '<span>Sueldo mensual (Bs) <span style="color:var(--muted)">· lo pone Verónica</span></span><input id="vac-liq-men" type="number" step="0.01" inputmode="decimal" value="'+(liq.mensual>0?liq.mensual:'')+'" placeholder="0,00" oninput="_vacLiqLive('+r.id+')" style="'+_inpSt+'">'+
        '<span>Sueldo diario (mensual ÷ 30)</span><span id="vac-liq-diario" style="text-align:right;font-weight:600;color:var(--muted)">Bs '+_vacMoney(liq.diario)+'</span>'+
        '<span>Días a liquidar (hábiles) <span style="color:var(--muted)">· sin findes ni feriados</span></span><input id="vac-liq-dias" type="number" step="1" inputmode="numeric" value="'+(liq.diasDisfrute||'')+'" placeholder="0" oninput="_vacLiqLive('+r.id+')" style="'+_inpSt+'">'+
        '<span>Disfrute</span><span id="vac-liq-disf" style="text-align:right;font-weight:700">Bs '+_vacMoney(liq.montoDisfrute)+'</span>'+
        '<span>Bono vacacional · <span id="vac-liq-bonod">'+liq.diasBono+'</span> días</span><span id="vac-liq-bono" style="text-align:right;font-weight:700">Bs '+_vacMoney(liq.montoBono)+'</span>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:2px solid var(--border)"><span style="font-weight:800">Total a pagar</span><span id="vac-liq-total" style="font-size:19px;font-weight:800;color:#16a34a">Bs '+_vacMoney(liq.total)+'</span></div>'+
    '</div>'+
    '<div style="font-size:10.5px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:7px 9px;margin-top:8px">⚠ Sueldo diario = mensual ÷ 30. El disfrute cuenta solo <b>días hábiles</b> (sin fines de semana ni feriados); el bono es por antigüedad (15 + 1/año, tope 30).</div>';

  // Pasivo (días acumulados no disfrutados)
  var pd=_vacPasivoDe(r);
  var pasHTML='';
  if(pd.dias>0){
    pasHTML='<div class="tbox" style="padding:11px 13px;margin-top:12px;border-left:3px solid #d97706"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px">Pasivo · días acumulados</div>'+
      '<div style="font-size:13.5px"><b style="color:#b45309">'+pd.dias+' días</b>'+(pd.valor!=null?(' ≈ <b style="color:#b45309">Bs '+_vacMoney(pd.valor)+'</b>'):'')+'</div>'+
      '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+(pd.backlog?(pd.backlog+' de años anteriores'):'')+(pd.backlog&&pd.actual?' + ':'')+(pd.actual?(pd.actual+' del período vigente'):'')+'</div></div>';
  }

  // Aprobación
  var aprHTML=r.aprobado_por?('<div style="font-size:11.5px;color:#16a34a;margin-top:10px">✓ Aprobado por '+esc(r.aprobado_por)+(r.aprobado_en?(' · '+_vacFmt(r.aprobado_en)):'')+'</div>'):'';

  // Liquidaciones registradas
  var regHTML='';
  if(_vacDetLiqs.length){
    regHTML='<h4 style="font-size:12px;text-transform:uppercase;letter-spacing:.3px;color:var(--muted);margin:16px 0 4px">Liquidaciones registradas</h4>'+
      _vacDetLiqs.map(function(l){ var pag=l.pagada?('<span style="color:#16a34a;font-weight:700;font-size:11px">✓ Pagada'+(l.fecha_pago?(' '+_vacFmt(l.fecha_pago)):'')+'</span>'):(_vacPuedeEditar()?('<button onclick="_vacMarcarPagada('+l.id+','+r.id+')" class="fchip" style="font-size:10.5px;padding:2px 7px">Marcar pagada</button>'):''); return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;padding:5px 0;border-bottom:1px dashed var(--border)"><span>'+_vacFmt(l.creado_en)+' · '+esc(l.creado_por||'')+'</span><span style="display:flex;gap:8px;align-items:center">'+pag+'<b>Bs '+_vacMoney(l.total)+'</b></span></div>'; }).join('');
  }

  var acciones='';
  if(_vacPuedeEditar()){
    acciones='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">'+
      '<button onclick="_vacImprimirSolicitud('+r.id+')" class="fchip" style="font-size:12.5px">🖨 Solicitud</button>'+
      '<button onclick="_vacImprimirLiq('+r.id+')" class="fchip" style="font-size:12.5px">🖨 Liquidación</button>'+
      '<button onclick="_vacRegistrarLiq('+r.id+')" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:700;cursor:pointer">💾 Registrar liquidación</button>'+
    '</div>';
  }

  return '<div onclick="_vacCerrarModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto">'+
    '<div onclick="event.stopPropagation()" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:520px;width:100%;margin:20px 0;padding:20px">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><div style="font-size:17px;font-weight:800;line-height:1.2">'+esc(r.nombre)+'</div><div style="margin-top:4px">'+badge+'</div></div><button onclick="_vacCerrarModal()" style="background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1">✕</button></div>'+
      info+disfrute+pasHTML+aprHTML+histHTML+liqHTML+regHTML+acciones+
    '</div>'+
  '</div>';
}
function _vacKV(k,v){ return '<div><div style="color:var(--muted);font-size:10.5px;text-transform:uppercase;letter-spacing:.3px">'+esc(k)+'</div><div style="font-weight:600">'+esc(v)+'</div></div>'; }
// Recalcula la liquidación en vivo con lo que escribe Verónica (sueldo mensual Bs + días hábiles)
function _vacLiqLive(id){
  var r=_vacRows.filter(function(x){return String(x.id)===String(id);})[0]; if(!r)return;
  var men=(document.getElementById('vac-liq-men')||{}).value;
  var dias=(document.getElementById('vac-liq-dias')||{}).value;
  var liq=_vacLiq(r,{mensual:men,dias:dias});
  window._vacLiqCur={id:id, mensual:_vacNum(men), dias:_vacNum(dias), liq:liq};
  var set=function(i,v){ var el=document.getElementById(i); if(el)el.textContent=v; };
  set('vac-liq-diario','Bs '+_vacMoney(liq.diario));
  set('vac-liq-disf','Bs '+_vacMoney(liq.montoDisfrute));
  set('vac-liq-bonod',liq.diasBono);
  set('vac-liq-bono','Bs '+_vacMoney(liq.montoBono));
  set('vac-liq-total','Bs '+_vacMoney(liq.total));
}

/* ---------- Registrar liquidación ---------- */
function _vacRegistrarLiq(id){
  if(!_vacPuedeEditar())return;
  var r=_vacRows.filter(function(x){return String(x.id)===String(id);})[0]; if(!r)return;
  // Usa lo que escribió Verónica en el panel (sueldo mensual Bs + días hábiles)
  var _ov=(window._vacLiqCur&&String(window._vacLiqCur.id)===String(id))?{mensual:window._vacLiqCur.mensual,dias:window._vacLiqCur.dias}:null;
  var liq=_vacLiq(r,_ov); if(!(liq.mensual>0)){ if(typeof showToast==='function')showToast('Escribe el sueldo mensual en Bs'); return; }
  var row={ vacacion_id:r.id, empleado_id:liq.empId||null, empleado_nombre:r.nombre, empresa:r.empresa, ci:r.ci||null,
    cargo:liq.cargo||null, fecha_ingreso:r.fecha_ingreso||null, fecha_inicio:r.fecha_inicio||null, fecha_final:r.fecha_final||null, reintegro:r.reintegro||null,
    dias_disfrute:liq.diasDisfrute, dias_bono:liq.diasBono, sueldo_quincena:liq.quincena, sueldo_diario:Math.round(liq.diario*100)/100,
    monto_disfrute:Math.round(liq.montoDisfrute*100)/100, monto_bono:Math.round(liq.montoBono*100)/100, total:Math.round(liq.total*100)/100,
    moneda:'VES', formula_nota:VAC_FORMULA_NOTA, creado_por:((typeof currentUser!=='undefined')?currentUser:'') };
  supabaseClient.from('vacaciones_liquidaciones').insert(row).select('*').then(function(res){
    if(res.error){ if(typeof showToast==='function')showToast('Error al registrar: '+res.error.message); return; }
    if(res.data&&res.data[0])_vacDetLiqs.unshift(res.data[0]);
    if(typeof logAudit==='function')logAudit('vacaciones_liq','Registró liquidación de '+r.nombre+' (Bs '+_vacMoney(liq.total)+')');
    var h=document.getElementById('vac-modal-host'); if(h)h.innerHTML=_vacDetHTML(r);
    if(typeof showToast==='function')showToast('Liquidación registrada ✓');
  });
}
function _vacMarcarPagada(liqId, vacId){
  if(!_vacPuedeEditar())return;
  supabaseClient.from('vacaciones_liquidaciones').update({ pagada:true, fecha_pago:_vacHoy() }).eq('id',liqId).select('*').then(function(res){
    if(res.error){ if(typeof showToast==='function')showToast('Error: '+res.error.message); return; }
    for(var i=0;i<_vacDetLiqs.length;i++){ if(String(_vacDetLiqs[i].id)===String(liqId)){ _vacDetLiqs[i]=(res.data&&res.data[0])?res.data[0]:_vacDetLiqs[i]; break; } }
    if(typeof logAudit==='function')logAudit('vacaciones_liq_pago','Marcó liquidación pagada');
    var r=_vacRows.filter(function(x){return String(x.id)===String(vacId);})[0];
    var h=document.getElementById('vac-modal-host'); if(h&&r)h.innerHTML=_vacDetHTML(r);
    if(typeof showToast==='function')showToast('Liquidación marcada como pagada ✓');
  });
}

/* ---------- Imprimir liquidación ---------- */
function _vacImprimirLiq(id){
  var r=_vacRows.filter(function(x){return String(x.id)===String(id);})[0]; if(!r)return;
  var _ov=(window._vacLiqCur&&String(window._vacLiqCur.id)===String(id))?{mensual:window._vacLiqCur.mensual,dias:window._vacLiqCur.dias}:null;
  var liq=_vacLiq(r,_ov); if(!(liq.mensual>0)){ if(typeof showToast==='function')showToast('Escribe el sueldo mensual en Bs'); return; }
  var e=_vacEmpDe(r);
  var body=_vacLogoHd({t:'Liquidación de Vacaciones'})+
    '<div class="meta"><strong>Empleado:</strong> '+esc(r.nombre)+' &nbsp;·&nbsp; <strong>C.I.:</strong> '+esc(r.ci||'—')+' &nbsp;·&nbsp; <strong>Empresa:</strong> '+esc((r.empresa||'').charAt(0)+(r.empresa||'').slice(1).toLowerCase())+'<br><strong>Cargo:</strong> '+esc((e&&e.cargo)||'—')+' &nbsp;·&nbsp; <strong>Ingreso:</strong> '+_vacFmt(r.fecha_ingreso)+' &nbsp;·&nbsp; <strong>Antigüedad:</strong> '+liq.anios+' años</div>'+
    '<div class="box"><strong>Período de disfrute:</strong> '+_vacFmt(r.fecha_inicio)+' → '+_vacFmt(r.fecha_final)+(r.reintegro?(' &nbsp;·&nbsp; <strong>Reintegro:</strong> '+_vacFmt(r.reintegro)):'')+'</div>'+
    '<h2>Detalle del cálculo (en bolívares)</h2>'+
    '<table><tbody>'+
      '<tr><td>Sueldo mensual</td><td class="r">Bs '+_vacMoney(liq.mensual)+'</td></tr>'+
      '<tr><td>Sueldo diario (mensual ÷ 30)</td><td class="r">Bs '+_vacMoney(liq.diario)+'</td></tr>'+
      '<tr><td>Días de disfrute (hábiles, sin findes ni feriados)</td><td class="r">'+liq.diasDisfrute+' días → Bs '+_vacMoney(liq.montoDisfrute)+'</td></tr>'+
      '<tr><td>Bono vacacional (15 + 1/año, tope 30)</td><td class="r">'+liq.diasBono+' días → Bs '+_vacMoney(liq.montoBono)+'</td></tr>'+
    '</tbody><tfoot><tr><td>TOTAL A PAGAR</td><td class="r">Bs '+_vacMoney(liq.total)+'</td></tr></tfoot></table>'+
    '<div class="nota">⚠ Cálculo preliminar según criterio LOTTT. La fórmula definitiva se ajustará con el modelo de cálculo interno.</div>'+
    '<div class="firma"><div>Recibí conforme<br>'+esc(r.nombre)+'</div><div>Autorizado por<br>&nbsp;</div></div>'+
    '<div class="foot">Generado el '+_vacFmt(_vacHoy())+' por el sistema de Farmacia Claret.</div>';
  _vacImprimirDoc('Liquidación · '+r.nombre, body);
}

/* ---------- Imprimir solicitud de vacaciones ---------- */
function _vacImprimirSolicitud(id){
  var r=_vacRows.filter(function(x){return String(x.id)===String(id);})[0]; if(!r)return;
  var e=_vacEmpDe(r);
  var dd=(r.fecha_inicio&&r.fecha_final)?_vacDiasHabiles(String(r.fecha_inicio).slice(0,10),String(r.fecha_final).slice(0,10)):(r.dias||'');
  var lin=function(lbl,val){ return '<tr><td style="width:38%;color:#475569">'+lbl+'</td><td style="border-bottom:1px solid #94a3b8">'+(val?esc(val):'&nbsp;')+'</td></tr>'; };
  var body=_vacLogoHd({t:'Solicitud de Vacaciones'})+
    '<p style="font-size:12px;color:#475569;margin:14px 0 4px">Por medio de la presente solicito autorización para el disfrute de mi período de vacaciones, según los datos siguientes:</p>'+
    '<table style="margin-top:8px">'+
      lin('Nombre y apellido', r.nombre)+
      lin('Cédula de identidad', r.ci)+
      lin('Empresa', (r.empresa||'').charAt(0)+(r.empresa||'').slice(1).toLowerCase())+
      lin('Cargo', (e&&e.cargo)||'')+
      lin('Fecha de ingreso', r.fecha_ingreso?_vacFmt(r.fecha_ingreso):'')+
      lin('Período que solicita', (r.fecha_inicio?_vacFmt(r.fecha_inicio):'____________')+'  al  '+(r.fecha_final?_vacFmt(r.fecha_final):'____________'))+
      lin('Días solicitados', dd?(dd+' días hábiles'):'')+
      lin('Fecha de reintegro', r.reintegro?_vacFmt(r.reintegro):'')+
    '</table>'+
    '<div class="firma" style="margin-top:60px"><div>Firma del trabajador</div><div>Fecha de solicitud</div></div>'+
    '<div class="firma" style="margin-top:50px"><div>Aprobado por (Gerencia / RRHH)</div><div>Fecha de aprobación</div></div>'+
    '<div class="foot">Formato generado por el sistema de Farmacia Claret · '+_vacFmt(_vacHoy())+'</div>';
  _vacImprimirDoc('Solicitud · '+r.nombre, body);
}

/* ============================================================
   CALENDARIO decorado (flores + gato) — vacaciones y reintegros
   ============================================================ */
var VAC_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function _vacCalEventos(mes){
  // eventos {dia, tipo:'ini'|'rein', nombre} para el mes 'YYYY-MM'
  var ev={};
  _vacRows.forEach(function(r){
    if(_vacEmpresa!=='TODAS' && (r.empresa||'').toUpperCase()!==_vacEmpresa)return;
    var nom=_vacPrimerNombre(r);
    var fi=r.fecha_inicio?String(r.fecha_inicio).slice(0,10):null;
    var re=r.reintegro?String(r.reintegro).slice(0,10):(r.fecha_final?_vacSigHabil(String(r.fecha_final).slice(0,10)):null);
    if(fi && fi.slice(0,7)===mes){ var d=+fi.slice(8,10); (ev[d]=ev[d]||[]).push({tipo:'ini',nombre:nom,full:r.nombre}); }
    if(re && re.slice(0,7)===mes){ var d2=+re.slice(8,10); (ev[d2]=ev[d2]||[]).push({tipo:'rein',nombre:nom,full:r.nombre}); }
  });
  return ev;
}
function _vacCalTema(mo){
  // Decoración según la época del año (esquinas y acento)
  if(mo===12||mo<=1) return {tl:'❄️',tr:'🎄',bl:'⛄',fondo:'linear-gradient(135deg,#fdf2f8 0%,#eff6ff 100%)'};
  if(mo===2)         return {tl:'💘',tr:'🌹',bl:'💝',fondo:'linear-gradient(135deg,#fdf2f8 0%,#fff1f2 100%)'};
  if(mo<=5)          return {tl:'🌷',tr:'🌸',bl:'🌼',fondo:'linear-gradient(135deg,#fdf2f8 0%,#f0fdf4 100%)'};
  if(mo<=8)          return {tl:'🌻',tr:'🌴',bl:'🍉',fondo:'linear-gradient(135deg,#fefce8 0%,#fdf2f8 100%)'};
  return {tl:'🍂',tr:'🌺',bl:'🍁',fondo:'linear-gradient(135deg,#fff7ed 0%,#fdf2f8 100%)'};
}
function _vacCalGatos(){
  // Dos gatitos kawaii (SVG) en las esquinas de abajo, como el diseño aprobado
  var naranja='<svg width="74" height="64" viewBox="0 0 74 64" style="position:absolute;left:10px;bottom:2px;z-index:0"><g><path d="M14 30 L10 12 L24 24 Q32 20 40 24 L54 12 L50 30 Z" fill="#fcd9a8" stroke="#e8b06e" stroke-width="2" stroke-linejoin="round"/><ellipse cx="32" cy="42" rx="22" ry="19" fill="#fde8c8" stroke="#e8b06e" stroke-width="2"/><path d="M24 14 L28 22 M46 14 L42 22" stroke="#f3a95f" stroke-width="3" stroke-linecap="round"/><path d="M25 38 q2 3 4 0 M45 38 q-2 3 -4 0" stroke="#7c4a1e" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="26" cy="46" r="3" fill="#fbb6ce" opacity=".7"/><circle cx="42" cy="46" r="3" fill="#fbb6ce" opacity=".7"/><path d="M34 44 q0 3 -3 3 M34 44 q0 3 3 3" stroke="#7c4a1e" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M32 34 v6" stroke="#e8b06e" stroke-width="0" /></g></svg>';
  var gris='<svg width="80" height="70" viewBox="0 0 80 70" style="position:absolute;right:10px;bottom:2px;z-index:0"><g><path d="M22 30 L18 10 L32 22 Q40 18 48 22 L62 10 L58 30 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2" stroke-linejoin="round"/><ellipse cx="40" cy="44" rx="24" ry="21" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><path d="M28 40 a3.4 3.4 0 1 0 .1 0 M50 40 a3.4 3.4 0 1 0 .1 0" fill="#1f2937"/><circle cx="29.3" cy="41.5" r="1.1" fill="#fff"/><circle cx="51.3" cy="41.5" r="1.1" fill="#fff"/><circle cx="30" cy="50" r="3.4" fill="#f9a8d4" opacity=".8"/><circle cx="50" cy="50" r="3.4" fill="#f9a8d4" opacity=".8"/><path d="M40 49 q0 3.4 -3.4 3.4 M40 49 q0 3.4 3.4 3.4" stroke="#1f2937" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M62 46 q9 4 6 14" stroke="#94a3b8" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M14 58 q6 -8 12 -2" stroke="#94a3b8" stroke-width="3" fill="none" stroke-linecap="round"/></g></svg>';
  return naranja+gris;
}
function _vacCalendarioHTML(){
  if(!_vacCalMes)_vacCalMes=_vacHoy().slice(0,7);
  var y=+_vacCalMes.slice(0,4), mo=+_vacCalMes.slice(5,7);
  var ev=_vacCalEventos(_vacCalMes);
  var primerDow=(new Date(Date.UTC(y,mo-1,1)).getUTCDay()+6)%7; // 0=Lunes
  var ultimo=new Date(Date.UTC(y,mo,0)).getUTCDate();
  var hoy=_vacHoy();
  var tema=_vacCalTema(mo);

  // Pastillas de días de la semana, cada una con su color (diseño aprobado)
  var DOW=[
    {t:'LU',bg:'#fbcfe8',tx:'#be185d'},{t:'MA',bg:'#fed7aa',tx:'#c2410c'},{t:'MI',bg:'#fde68a',tx:'#a16207'},
    {t:'JU',bg:'#bbf7d0',tx:'#15803d'},{t:'VI',bg:'#99f6e4',tx:'#0f766e'},{t:'SA',bg:'#ddd6fe',tx:'#6d28d9'},{t:'DO',bg:'#fecdd3',tx:'#be123c'}
  ];
  var headRow=DOW.map(function(d){ return '<div style="text-align:center;padding:2px 0"><span style="display:inline-block;min-width:64px;background:'+d.bg+';color:'+d.tx+';font-size:12px;font-weight:800;letter-spacing:.5px;padding:5px 0;border-radius:10px;box-shadow:0 1px 2px rgba(0,0,0,.06)">'+d.t+'</span></div>'; }).join('');

  var celdas='';
  for(var i=0;i<primerDow;i++){ celdas+='<div style="min-height:76px;border:1px solid #f6dde9;border-radius:12px;background:rgba(255,255,255,.45)"></div>'; }
  for(var day=1;day<=ultimo;day++){
    var fecha=_vacCalMes+'-'+String(day).padStart(2,'0');
    var esHoy=(fecha===hoy);
    var esFer=_vacEsFeriado(fecha);
    var evs=ev[day]||[];
    var chips=evs.map(function(x){
      if(x.tipo==='ini') return '<div title="Inicia vacaciones: '+esc(x.full)+'" style="font-size:10px;font-weight:800;background:#dcfce7;color:#166534;border-radius:7px;padding:2px 6px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-transform:uppercase">🌴 '+esc(x.nombre)+'</div>';
      return '<div title="Reintegro: '+esc(x.full)+'" style="font-size:10px;font-weight:800;background:#dbeafe;color:#1e40af;border-radius:7px;padding:2px 6px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-transform:uppercase">↩ '+esc(x.nombre)+'</div>';
    }).join('');
    var ferChip=esFer?('<div title="'+esc(_vacFeriadoNombre(fecha))+'" style="font-size:9.5px;font-weight:700;color:#be123c;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🎉 '+esc(_vacFeriadoNombre(fecha))+'</div>'):'';
    var bg=esHoy?'#fff7ed':(esFer?'#fff1f2':'#ffffff');
    var borde=esHoy?'2px dashed #fb923c':(esFer?'1px solid #fecdd3':'1px solid #f6dde9');
    celdas+='<div style="min-height:76px;border:'+borde+';border-radius:12px;padding:5px 7px;background:'+bg+';box-shadow:0 1px 2px rgba(190,24,93,.04)">'+
      '<div style="font-size:12px;font-weight:700;color:'+(esHoy?'#c2410c':(esFer?'#be123c':'#8a6a58'))+'">'+day+'</div>'+ferChip+chips+'</div>';
  }
  var resto=(primerDow+ultimo)%7; if(resto>0){ for(var k=resto;k<7;k++){ celdas+='<div style="min-height:76px;border:1px solid #f6dde9;border-radius:12px;background:rgba(255,255,255,.45)"></div>'; } }

  var empresaNota=(_vacEmpresa!=='TODAS')?(' · '+(_vacEmpresa.charAt(0)+_vacEmpresa.slice(1).toLowerCase())):'';
  var flores='<div style="position:absolute;left:12px;top:8px;font-size:24px;opacity:.9">'+tema.tl+'</div><div style="position:absolute;right:14px;top:8px;font-size:24px;opacity:.9">'+tema.tr+'</div><div style="position:absolute;left:96px;bottom:10px;font-size:18px;opacity:.85">'+tema.bl+'</div>';

  var navBtn='background:#fff;border:1px solid #f5d0e5;border-radius:12px;width:38px;height:38px;cursor:pointer;font-size:17px;color:#be185d;box-shadow:0 1px 3px rgba(190,24,93,.12)';
  return '<div style="position:relative;background:'+tema.fondo+';border:1px solid #f5d0e5;border-radius:22px;padding:16px 14px 58px;overflow:hidden">'+
    flores+_vacCalGatos()+
    '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:8px;position:relative;z-index:1">'+
      '<button onclick="_vacCalNav(-1)" style="'+navBtn+'">‹</button>'+
      '<div style="position:relative;text-align:center;border:1.5px dashed #f3c6dd;border-radius:14px;padding:8px 26px;background:rgba(255,255,255,.6)"><div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);font-size:13px">💗</div>'+
        '<div style="font-family:Georgia,serif;font-size:21px;font-weight:700;color:#a16207;letter-spacing:.5px">'+VAC_MESES[mo-1]+' '+y+'</div>'+
        '<div style="font-size:10.5px;color:#9d6b53">Vacaciones y reintegros'+empresaNota+'</div></div>'+
      '<button onclick="_vacCalNav(1)" style="'+navBtn+'">›</button>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;position:relative;z-index:1">'+headRow+celdas+'</div>'+
    '<div style="position:relative;z-index:1;display:flex;gap:16px;justify-content:center;margin-top:14px;font-size:11.5px;color:#7c5a4a;background:rgba(255,255,255,.65);border-radius:10px;padding:6px 10px;width:fit-content;margin-left:auto;margin-right:auto"><span>🌴 Inicia vacaciones</span><span style="color:#e5b3cb">|</span><span>↩ Reintegro</span><span style="color:#e5b3cb">|</span><span>🎉 Feriado</span></div>'+
  '</div>';
}

/* ---------- Entry point ---------- */
function renderVacaciones(){ _vacEntrar(); }
