function _cxpMesLbl(ym){ if(!ym)return''; return _MES3CXP[parseInt(ym.slice(5,7))-1]+" '"+ym.slice(2,4); }
function _cxpBaseDelay(){ var b=(typeof _cxp==='function')?_cxp().prov_delay:null; return (b==null||isNaN(b))?2:Number(b); }
function _cxpOffset(prio){ try{ var po=(typeof _cxp==='function')?_cxp().prov_offset:null; if(po&&po[prio]!=null) return Number(po[prio])||0; }catch(e){} return _cxpBaseDelay() + (prio==='alta'?0:(prio==='baja'?6:3)); }
function _cxpPlanMeses(){ var x=(typeof _cxp==='function')?_cxp():{}; var pm=x.plan_meses; if(!pm||typeof pm!=='object')pm={}; return {alta:Number(pm.alta)>0?Number(pm.alta):12, media:Number(pm.media)>0?Number(pm.media):6, baja:Number(pm.baja)>0?Number(pm.baja):3}; }
function _cxpMeses(prio){ var pm=_cxpPlanMeses(); return pm[prio]||pm.media||6; }
function _cxpAddMes(ym,n){ var y=parseInt(ym.slice(0,4)),m=parseInt(ym.slice(5,7))-1+n; var dt=new Date(y,m,1); return dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2); }
function _cxpDefault(){ return {inicio:(typeof HOY==='function'?HOY().slice(0,7):'2026-06'), dia_pago:5, ingreso_diario:4000, nomina:{quincena_usd:0,activa:true}, gastos_fijos:[], saldo_inicial:0, margen_pct:100, prioridades:{}, compras:[], abono_plan:{activo:false,monto:10000,cadaMeses:1,dia:5,prestamos:[]}, facturas:[], abonos:[]}; }
function _cxp(){ if(!db.cxp_prov||typeof db.cxp_prov!=='object'||Array.isArray(db.cxp_prov)) db.cxp_prov=_cxpDefault(); var x=db.cxp_prov; if(!Array.isArray(x.facturas))x.facturas=[]; if(!Array.isArray(x.abonos))x.abonos=[]; if(!x.prioridades||typeof x.prioridades!=='object')x.prioridades={}; if(!Array.isArray(x.compras))x.compras=[]; if(!x.abono_plan||typeof x.abono_plan!=='object')x.abono_plan={activo:false,monto:10000,cadaMeses:1,dia:5,prestamos:[]}; if(!Array.isArray(x.abono_plan.prestamos))x.abono_plan.prestamos=[]; if(!x.inicio)x.inicio=HOY().slice(0,7); if(!x.dia_pago)x.dia_pago=5; if(x.ingreso_diario==null)x.ingreso_diario=4000; if(!x.nomina||typeof x.nomina!=='object')x.nomina={quincena_usd:0,activa:true}; if(!Array.isArray(x.gastos_fijos))x.gastos_fijos=[]; if(x.saldo_inicial==null)x.saldo_inicial=0; if(x.margen_pct==null)x.margen_pct=30; return x; }
function _cxpSave(){ var x=_cxp(); x._v=Date.now(); saveDB(db); }
function _cxpPuede(){ return (typeof currentRole!=='undefined' && ['mayra','gerente','admin'].indexOf(currentRole)>=0); }
function _cxpUID(){ return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function _cxpKey(f){ return f.empresa+'||'+f.proveedor; }
function _cxpEmpActual(){ if(typeof EMPRESA!=='undefined'&&EMPRESA==='farmacia')return 'FARMACIA'; if(typeof EMPRESA!=='undefined'&&EMPRESA==='drogueria')return 'DROGUERIA'; return _cxpEmp; }
function _cxpProveedores(){
  var x=_cxp(); var emp=_cxpEmpActual(); var map={};
  x.facturas.forEach(function(f){
    if(emp&&emp!=='all'&&f.empresa!==emp) return;
    var k=_cxpKey(f);
    if(!map[k]) map[k]={key:k,empresa:f.empresa,proveedor:f.proveedor,nfact:0,npend:0,npag:0,deuda:0,usd_only:0};
    map[k].nfact++;
    if(f.pagada){ map[k].npag++; }
    else { map[k].npend++; map[k].deuda+=(Number(f.monto_usd)||0); if(f.moneda==='usd')map[k].usd_only+=(Number(f.monto_usd)||0); }
  });
  var ab={}; x.abonos.forEach(function(a){ if(emp&&emp!=='all'&&a.empresa!==emp)return; ab[a.key]=(ab[a.key]||0)+(Number(a.monto_usd)||0); });
  var prio=x.prioridades||{};
  var _ini=x.inicio||(typeof HOY==='function'?HOY().slice(0,7):'2026-07');
  var arr=Object.keys(map).map(function(k){ var p=map[k]; p.deuda=Math.round(p.deuda*100)/100; p.abonado=Math.round((ab[k]||0)*100)/100; p.restante=Math.round((p.deuda-p.abonado)*100)/100; if(p.restante<0)p.restante=0; p.pct=p.deuda>0?Math.min(100,Math.round(p.abonado/p.deuda*100)):100; p.prioridad=(prio[k]||'media'); var _cu=Number(_cxp().chico_umbral)||0; if(_cu>0 && p.deuda<=_cu){ p.offset=(_cxp().chico_offset!=null?Number(_cxp().chico_offset):4); p.meses=1; } else { p.offset=_cxpOffset(p.prioridad); p.meses=_cxpMeses(p.prioridad); } p.cuota=Math.round(p.deuda/p.meses*100)/100; p.inicioMes=_cxpAddMes(_ini,p.offset); p.finMes=_cxpAddMes(p.inicioMes,p.meses-1); return p; });
  var _ord={alta:0,media:1,baja:2};
  arr.sort(function(a,b){ var d=(_ord[a.prioridad]||1)-(_ord[b.prioridad]||1); return d!==0?d:(b.restante-a.restante); });
  return arr;
}
var CXP_DIAS_SEMANA=[3,8,18,22];
function _cxpSemanas(){
  var provs=_cxpProveedores().filter(function(p){return p.restante>0.5;});
  provs.sort(function(a,b){return b.cuota-a.cuota;});
  var tot=[0,0,0,0]; var map={};
  provs.forEach(function(p){ var wi=0; for(var i=1;i<4;i++){ if(tot[i]<tot[wi])wi=i; } tot[wi]+=p.cuota; map[p.key]={semana:wi,dia:CXP_DIAS_SEMANA[wi]}; });
  return map;
}
function _cxpSetPrioridad(key,val){ if(!_cxpPuede())return; var x=_cxp(); if(!x.prioridades)x.prioridades={}; x.prioridades[key]=val; _cxpSave(); renderCxpProv(); }
function _cxpSetInicio(val){ if(!val)return; var x=_cxp(); x.inicio=val; _cxpSave(); renderCxpProv(); }
function renderCxpProv(){
  var el=document.getElementById('cxpprov-content'); if(!el) return;
  if(!_cxpMes) _cxpMes=_cxp().inicio||HOY().slice(0,7);
  var head='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><p class="section-title" style="margin:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>Plan de Pago a Proveedores <span style="font-size:11px;font-weight:500;color:var(--muted)">· cuotas según prioridad</span></p><button class="btn btn-ghost btn-sm" onclick="_cxpImprimirTarjetas()">🖨️ Tarjetas para pizarra</button></div>';
  var toggle='<div class="fchips" style="margin:12px 0"><button class="fchip'+(_cxpVista==='lista'?' active':'')+'" onclick="_cxpSetVista(\'lista\')">Proveedores</button><button class="fchip'+(_cxpVista==='calendario'?' active':'')+'" onclick="_cxpSetVista(\'calendario\')">Calendario</button></div>';
  el.innerHTML=head+toggle+'<div id="cxpprov-body"></div>';
  if(_cxpVista==='calendario') _cxpRenderCalendario(); else _cxpRenderLista();
}
function _cxpSetVista(v){ _cxpVista=v; renderCxpProv(); }
function _cxpRenderLista(){
  var b=document.getElementById('cxpprov-body'); if(!b)return;
  var tasa=getTasa(); var provs=_cxpProveedores(); var ini=_cxp().inicio||HOY().slice(0,7);
  var act=provs.filter(function(p){return p.restante>0.5;});
  var altas=act.filter(function(p){return p.prioridad==='alta';});
  var norms=act.filter(function(p){return (p.prioridad||'media')==='media';});
  var esps =act.filter(function(p){return p.prioridad==='baja';});
  var cuotaA=altas.reduce(function(s,p){return s+p.cuota;},0);
  var cuotaN=norms.reduce(function(s,p){return s+p.cuota;},0);
  var cuotaE=esps.reduce(function(s,p){return s+p.cuota;},0);
  var totDeuda=act.reduce(function(s,p){return s+p.deuda;},0);
  var _bd=_cxpBaseDelay(); var mA=_cxpMesLbl(_cxpAddMes(ini,_cxpOffset('alta'))), mN=_cxpMesLbl(_cxpAddMes(ini,_cxpOffset('media'))), mE=_cxpMesLbl(_cxpAddMes(ini,_cxpOffset('baja')));
  var kpi=function(l,v,sb,c){ return '<div class="tbox" style="padding:12px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+l+'</div><div style="font-size:18px;font-weight:700;margin-top:3px;color:'+(c||'var(--text)')+'">'+v+'</div>'+(sb?'<div style="font-size:11px;color:var(--muted)">'+sb+'</div>':'')+'</div>'; };
  var kpis='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:6px">'+
    kpi('Deuda total del plan','$'+fmt(totDeuda),act.length+' proveedores')+
    kpi('\U0001F534 Alta · entra '+mA,'$'+fmt(cuotaA)+'/mes',altas.length+' prov','#ef4444')+
    kpi('\U0001F7E0 Normal · entra '+mN,'$'+fmt(cuotaN)+'/mes',norms.length+' prov','#f59e0b')+
    kpi('⚪ Puede esperar · entra '+mE,'$'+fmt(cuotaE)+'/mes',esps.length+' prov','#9ca3af')+'</div>';
  var ramp='<div class="tbox" style="padding:10px 12px;margin-bottom:8px;font-size:11px;color:var(--muted)">Tu cuota arranca en <b style="color:var(--text)">$'+fmt(cuotaA)+'/mes</b> ('+mA+', solo Alta), sube a <b style="color:var(--text)">$'+fmt(cuotaA+cuotaN)+'/mes</b> en '+mN+' (entra Normal) y a <b style="color:var(--text)">$'+fmt(cuotaA+cuotaN+cuotaE)+'/mes</b> en '+mE+' (entra todo). Así no te golpea toda la deuda desde el primer mes.</div>';
  var iniCtl=_cxpPuede()?('<div style="font-size:11px;color:var(--muted);margin:4px 0 12px">El plan empieza: <input type="month" value="'+(ini||'')+'" onchange="_cxpSetInicio(this.value)" style="padding:4px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)"> · escalonado para no chocar con el banco: Alta entra '+mA+', Normal '+mN+', Puede esperar '+mE+'.</div>'):'';
  var cardOf=function(p){
    var pri=p.prioridad||'media';
    var lcol= pri==='alta'?'#ef4444':(pri==='media'?'#f59e0b':'#9ca3af');
    var dim=(pri==='baja');
    var bar=p.deuda>0?p.pct:100; var col=p.restante<=0.5?'var(--green)':(bar>=50?'var(--amber)':'var(--accent)');
    var badge=p.usd_only>0?'<span style="font-size:9px;background:#1e3a8a;color:#fff;padding:1px 6px;border-radius:999px;margin-left:6px">incluye $ solo dólares</span>':'';
    var chips=_cxpPuede()?('<div style="display:flex;gap:4px;margin-top:9px;flex-wrap:wrap;align-items:center"><span style="font-size:10px;color:var(--muted)">Prioridad:</span>'+[['alta','Alta','#ef4444'],['media','Normal','#f59e0b'],['baja','Puede esperar','#9ca3af']].map(function(o){ var ac=pri===o[0]; return '<button onclick="_cxpSetPrioridad(\''+p.key+'\',\''+o[0]+'\')" style="border:1px solid '+o[2]+';background:'+(ac?o[2]:'transparent')+';color:'+(ac?'#fff':o[2])+';border-radius:999px;padding:2px 9px;font-size:10px;font-weight:700;cursor:pointer">'+o[1]+'</button>'; }).join('')+'</div>'):'';
    return '<div class="tbox" style="padding:13px;margin-bottom:10px;border-left:4px solid '+lcol+';'+(dim?'opacity:.72;':'')+'">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap"><div style="min-width:0"><div style="font-weight:700;font-size:13px">'+esc(p.proveedor)+' <span class="badge '+(p.empresa==='FARMACIA'?'badge-blue':'badge-purple')+'" style="font-size:9px">'+(p.empresa==='FARMACIA'?'FCIA':'DROG')+'</span>'+badge+'</div><div style="font-size:11px;color:var(--muted)">'+p.npend+' fact. pendientes'+(p.npag?(' · '+p.npag+' pagadas'):'')+'</div></div>'+
      '<div style="text-align:right"><div style="font-size:10px;color:var(--muted)">Cuota/mes</div><div style="font-weight:800;font-size:15px">'+(p.restante<=0.5?'<span style="font-size:12px;color:var(--green)">Al día</span>':'$'+fmt(p.cuota))+'</div><div style="font-size:9px;font-weight:700;color:'+lcol+'">entra '+_cxpMesLbl(p.inicioMes)+' · '+p.meses+' cuotas</div></div></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:11px;margin:8px 0 3px"><span style="color:var(--muted)">Deuda $'+fmt(p.deuda)+'</span><span style="color:var(--green)">Abonado $'+fmt(p.abonado)+'</span><span style="color:var(--amber)">Falta $'+fmt(p.restante)+'</span></div>'+
      '<div style="height:9px;border-radius:5px;background:#e5e7eb;overflow:hidden"><div style="height:100%;width:'+bar+'%;background:'+col+';border-radius:5px"></div></div>'+
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">'+(_cxpPuede()?'<button class="btn btn-green btn-sm" onclick="cxpAbonar(\''+p.key+'\')">➕ Abonar</button>':'')+'<button class="btn btn-ghost btn-sm" onclick="cxpVerFacturas(\''+p.key+'\')">\U0001F4C4 Ver facturas ('+p.nfact+')</button>'+_cxpBtnPrint(p.key)+'</div>'+chips+
    '</div>';
  };
  var cards=provs.length? provs.map(cardOf).join('') : '<div class="tbox" style="text-align:center;padding:26px;color:var(--muted)">No hay facturas cargadas todavía.</div>';
  b.innerHTML=kpis+ramp+iniCtl+cards+'<div style="font-size:10px;color:var(--muted);margin-top:8px">Alta: '+_cxpMeses('alta')+' cuotas (desde '+mA+'), Normal: '+_cxpMeses('media')+' (desde '+mN+'), Puede esperar: '+_cxpMeses('baja')+' (desde '+mE+'). Los proveedores pequeños se cancelan completos primero. Lo amarillo de tu Excel entró como pagado.</div>';
}

function _cxpBtnPrint(key){ return '<button class="btn btn-ghost btn-sm" onclick="_cxpImprimirPlan(\''+key+'\')">🖨️ Plan</button>'; }
function _cxpImprimirPlan(key){
  try{
    var p=_cxpProveedores().filter(function(x){return x.key===key;})[0]; if(!p){ if(typeof showToast==='function')showToast('Proveedor no encontrado'); return; }
    var meses=p.meses||6, base=(p.restante>0.5?p.restante:p.deuda), cuota=Math.round(base/meses*100)/100;
    var rowsH='', acum=0;
    for(var i=0;i<meses;i++){
      var pago=(i===meses-1)?Math.round((base-acum)*100)/100:cuota; acum+=pago;
      var rest=Math.max(0,Math.round((base-acum)*100)/100);
      rowsH+='<tr><td>'+(i+1)+'</td><td>'+_cxpMesLbl(_cxpAddMes(p.inicioMes,i))+'</td><td class="r">$'+fmt(pago)+'</td><td class="r">$'+fmt(rest)+'</td></tr>';
    }
    var emp=(p.empresa==='FARMACIA')?'Farmacia Claret':'Droguería Clínica';
    var logo=(typeof FARM_LOGO_SVG!=='undefined')?FARM_LOGO_SVG:'';
    var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
    var prio=(p.prioridad==='alta'?'Alta':(p.prioridad==='baja'?'Puede esperar':'Normal'));
    var css='*{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}body{margin:32px;color:#1a1a1a}.hd{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1E38A6;padding-bottom:12px}.lg{width:54px;height:54px;border-radius:50%;overflow:hidden;background:#1E38A6;flex:none}.lg svg{width:100%;height:100%}.h1{font-size:22px;font-weight:800;color:#1E38A6}.sub{color:#666;font-size:12px}.box{display:flex;gap:18px;margin:18px 0;flex-wrap:wrap}.kpi{border:1px solid #ddd;border-radius:10px;padding:10px 14px;min-width:120px}.kpi .l{font-size:10px;color:#888;text-transform:uppercase}.kpi .v{font-size:18px;font-weight:800}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}th,td{border:1px solid #ddd;padding:7px 10px;text-align:left}th{background:#1E38A6;color:#fff;font-size:12px}td.r,th.r{text-align:right}.sig{display:flex;gap:40px;margin-top:46px}.sig div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;color:#444}.note{font-size:11px;color:#777;margin-top:14px}@media print{body{margin:14mm}}';
    var html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Plan de Pago - '+esc(p.proveedor)+'</title><style>'+css+'</style></head><body>'+
      '<div class="hd"><div class="lg">'+logo+'</div><div><div class="h1">Plan de Pago a Proveedor</div><div class="sub">'+emp+' · emitido '+hoy+'</div></div></div>'+
      '<h2 style="margin:16px 0 2px;font-size:18px">'+esc(p.proveedor)+'</h2><div class="sub">Prioridad: '+prio+' · '+p.npend+' facturas pendientes</div>'+
      '<div class="box"><div class="kpi"><div class="l">Saldo a pagar</div><div class="v">$'+fmt(base)+'</div></div><div class="kpi"><div class="l">Cuota mensual</div><div class="v">$'+fmt(cuota)+'</div></div><div class="kpi"><div class="l">N&ordm; de cuotas</div><div class="v">'+meses+'</div></div><div class="kpi"><div class="l">Per&iacute;odo</div><div class="v" style="font-size:14px">'+_cxpMesLbl(p.inicioMes)+' &mdash; '+_cxpMesLbl(p.finMes)+'</div></div></div>'+
      '<table><thead><tr><th>#</th><th>Mes</th><th class="r">Abono (USD)</th><th class="r">Saldo restante</th></tr></thead><tbody>'+rowsH+'</tbody></table>'+
      '<div class="note">Los montos est&aacute;n en d&oacute;lares (USD). Los pagos en bol&iacute;vares se calculan a la tasa del d&iacute;a de cada abono. Este plan puede ajustarse de com&uacute;n acuerdo.</div>'+
      '<div class="sig"><div>Por '+emp+'</div><div>Por '+esc(p.proveedor)+'</div></div>'+
      '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},250);}<\/scr'+'ipt></body></html>';
    var w=window.open('','_blank'); if(!w){ if(typeof showToast==='function')showToast('Permite ventanas emergentes para imprimir'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }catch(e){ if(typeof showToast==='function')showToast('No se pudo generar el plan'); }
}
/* ===== Tarjetas imprimibles para la pizarra (una por proveedor) ===== */
function _cxpImprimirTarjetas(){
  try{
    var x=_cxp();
    var map={};
    (x.facturas||[]).forEach(function(f){ if(f.pagada)return; var m=Number(f.monto_usd)||0; var k=f.empresa+'||'+f.proveedor; if(!map[k])map[k]={empresa:f.empresa,proveedor:f.proveedor,key:k,facturas:[],total:0}; map[k].facturas.push(f); map[k].total+=m; });
    var ab={}; (x.abonos||[]).forEach(function(a){ ab[a.key]=(ab[a.key]||0)+(Number(a.monto_usd)||0); });
    var prio=x.prioridades||{};
    var arr=Object.keys(map).map(function(k){ var p=map[k]; p.abonado=Math.round((ab[k]||0)*100)/100; p.restante=Math.max(0,Math.round((p.total-p.abonado)*100)/100); p.prioridad=prio[k]||'media'; return p; }).filter(function(p){return p.restante>0.5;});
    arr.sort(function(a,b){ return b.restante-a.restante; });
    if(!arr.length){ if(typeof showToast==='function')showToast('No hay proveedores con deuda para imprimir'); return; }
    var totGen=arr.reduce(function(s,p){return s+p.restante;},0);
    var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
    var logo=(typeof FARM_LOGO_SVG!=='undefined')?FARM_LOGO_SVG:'';
    var pcol={alta:'#ef4444',media:'#f59e0b',baja:'#9ca3af'};
    var plbl={alta:'ALTA',media:'NORMAL',baja:'PUEDE ESPERAR'};
    var cards=arr.map(function(p){
      var col=pcol[p.prioridad]||'#f59e0b';
      var facs=p.facturas.slice().sort(function(a,b){ return String(a.vence||a.fecha||'').localeCompare(String(b.vence||b.fecha||'')); });
      var rows=facs.map(function(f){ var mBs=f.monto_bs?(fmt(f.monto_bs,0)+' Bs'):''; var mUsd='$'+fmt(f.monto_usd); var m=(f.moneda==='usd')?(mUsd+' <span class="on">(solo $)</span>'):(mUsd+(mBs?(' <span class="bs">'+mBs+'</span>'):'')); return '<tr><td>'+esc(String(f.factura||'—'))+'</td><td class="c">'+esc(String(f.vence||f.fecha||'—'))+'</td><td class="r">'+m+'</td></tr>'; }).join('');
      var emp=(p.empresa==='FARMACIA')?'Farmacia':'Droguería';
      return '<div class="card">'+
        '<div class="strip" style="background:'+col+'"></div>'+
        '<div class="chd"><div class="cnm">'+esc(p.proveedor)+'</div><div class="cemp">'+emp+'</div></div>'+
        '<div class="prio" style="color:'+col+';border-color:'+col+'">'+plbl[p.prioridad]+'</div>'+
        '<div class="tot"><span class="tl">Falta por pagar</span><span class="tv">$'+fmt(p.restante)+'</span></div>'+
        '<div class="mini">Deuda $'+fmt(p.total)+' · Abonado $'+fmt(p.abonado)+' · '+p.facturas.length+' factura(s)</div>'+
        '<table><thead><tr><th>Factura</th><th class="c">Vence</th><th class="r">Monto</th></tr></thead><tbody>'+rows+'</tbody></table>'+
        '<div class="cfoot"><span>Pagado &#9744;</span><span>Abono: __________</span><span>Fecha: ______</span></div>'+
      '</div>';
    }).join('');
    var css='*{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}body{margin:12mm;color:#1a1a1a}'+
      '.top{display:flex;align-items:center;gap:12px;border-bottom:3px solid #1E38A6;padding-bottom:10px;margin-bottom:14px}'+
      '.lg{width:46px;height:46px;border-radius:50%;overflow:hidden;background:#1E38A6;flex:none}.lg svg{width:100%;height:100%}'+
      '.h1{font-size:19px;font-weight:800;color:#1E38A6}.sub{color:#666;font-size:11px}'+
      '.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}'+
      '.card{border:1.5px dashed #9aa3af;border-radius:10px;padding:10px 12px 8px;position:relative;overflow:hidden;page-break-inside:avoid;break-inside:avoid}'+
      '.strip{position:absolute;top:0;left:0;right:0;height:6px}'+
      '.chd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:6px}'+
      '.cnm{font-size:15px;font-weight:800;line-height:1.1}.cemp{font-size:10px;color:#666;white-space:nowrap}'+
      '.prio{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.5px;border:1.5px solid;border-radius:999px;padding:1px 8px;margin:5px 0 6px}'+
      '.tot{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:5px 0;margin-bottom:4px}'+
      '.tl{font-size:10px;color:#888;text-transform:uppercase}.tv{font-size:20px;font-weight:800;color:#b45309}'+
      '.mini{font-size:10px;color:#666;margin-bottom:5px}'+
      'table{width:100%;border-collapse:collapse;font-size:10.5px}th{background:#f1f5f9;color:#555;font-size:9px;text-transform:uppercase;padding:3px 5px;text-align:left;border-bottom:1px solid #e5e7eb}'+
      'td{padding:3px 5px;border-bottom:1px solid #f0f0f0}td.r,th.r{text-align:right}td.c,th.c{text-align:center}.bs{color:#888;font-size:9px}.on{color:#1e3a8a;font-size:9px}'+
      '.cfoot{display:flex;justify-content:space-between;gap:6px;font-size:9.5px;color:#444;margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:5px}'+
      '@media print{body{margin:8mm}.grid{gap:8px}}';
    var html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tarjetas de proveedores - Claret</title><style>'+css+'</style></head><body>'+
      '<div class="top"><div class="lg">'+logo+'</div><div><div class="h1">Tarjetas de Proveedores · Pizarra</div><div class="sub">Emitido '+hoy+' · '+arr.length+' proveedores con deuda · Total a pagar $'+fmt(totGen)+'</div></div></div>'+
      '<div class="grid">'+cards+'</div>'+
      '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},300);}<\/scr'+'ipt></body></html>';
    var w=window.open('','_blank'); if(!w){ if(typeof showToast==='function')showToast('Permite ventanas emergentes para imprimir'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }catch(e){ if(typeof showToast==='function')showToast('No se pudo generar las tarjetas'); }
}
function _cxpRenderCalendario(){
  var b=document.getElementById('cxpprov-body'); if(!b)return;
  var tasa=getTasa(); var sem=_cxpSemanas();
  var ym=_cxpMes; var y=parseInt(ym.slice(0,4)),m=parseInt(ym.slice(5,7))-1;
  var provs=_cxpProveedores().filter(function(p){return p.restante>0.5 && ym>=p.inicioMes && ym<=p.finMes;});
  var meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var nav='<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:4px 0 10px"><button class="btn btn-ghost btn-sm" onclick="_cxpNavMes(-1)" style="font-size:18px;padding:2px 12px">‹</button><div style="font-weight:700;font-size:15px;min-width:150px;text-align:center">'+meses[m]+' '+y+'</div><button class="btn btn-ghost btn-sm" onclick="_cxpNavMes(1)" style="font-size:18px;padding:2px 12px">›</button></div>';
  var ini=_cxp().inicio||HOY().slice(0,7); if(ym<ini){ b.innerHTML=nav+'<div class="tbox" style="text-align:center;padding:24px;color:var(--muted)">El plan de proveedores empieza en '+meses[parseInt(ini.slice(5,7))-1]+' '+ini.slice(0,4)+'. Usa › para avanzar.</div>'; return; }
  if(!provs.length){ b.innerHTML=nav+'<div class="tbox" style="text-align:center;padding:24px;color:var(--muted)">Ningún proveedor entra este mes.<br>Alta entra en '+_cxpMesLbl(_cxpAddMes(ini,_cxpBaseDelay()))+', Normal en '+_cxpMesLbl(_cxpAddMes(ini,_cxpBaseDelay()+3))+', Puede esperar en '+_cxpMesLbl(_cxpAddMes(ini,_cxpBaseDelay()+6))+'.</div>'; return; }
  var cuotaTot=provs.reduce(function(s,p){return s+p.cuota;},0);
  var resumen='<div class="tbox" style="padding:14px;margin-bottom:12px;text-align:center"><div style="font-size:11px;color:var(--muted)">Cuota total de este mes (repartida en 4 semanas)</div><div style="font-size:24px;font-weight:800;color:var(--accent)">$'+fmt(cuotaTot)+'</div>'+(tasa?'<div style="font-size:12px;color:var(--muted)">'+fmt(cuotaTot*tasa,0)+' Bs a la tasa de hoy</div>':'')+'</div>';
  var grupos=[[],[],[],[]];
  provs.forEach(function(p){ var wi=(sem[p.key]?sem[p.key].semana:0); grupos[wi].push(p); });
  var weeks=grupos.map(function(g,wi){ var dia=CXP_DIAS_SEMANA[wi]; var totw=g.reduce(function(s,p){return s+p.cuota;},0);
    var rows=g.length? g.map(function(p){ var bs=tasa?(' · '+fmt(p.cuota*tasa,0)+' Bs'):''; var tag=p.prioridad==='alta'?'#ef4444':(p.prioridad==='baja'?'#9ca3af':'#f59e0b'); return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-top:1px solid var(--border)"><div style="min-width:0"><div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+tag+';margin-right:5px"></span>'+esc(p.proveedor)+'</div><div style="font-size:10px;color:var(--muted)">Falta $'+fmt(p.restante)+' · '+(p.empresa==='FARMACIA'?'Farmacia':'Drogueria')+'</div></div><div style="text-align:right;flex-shrink:0"><div style="font-weight:700;font-size:13px">$'+fmt(p.cuota)+'</div><div style="font-size:9px;color:var(--muted)">'+bs+'</div></div></div>'; }).join('') : '<div style="padding:8px;text-align:center;color:var(--muted);font-size:11px">Sin pagos</div>';
    return '<div class="tbox" style="padding:0;margin-bottom:10px;overflow:hidden"><div style="background:var(--surface2);padding:8px 12px;display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;font-size:12px">Semana '+(wi+1)+' · día '+dia+'</span><span style="font-weight:800;font-size:13px;color:var(--accent)">$'+fmt(totw)+'</span></div>'+rows+'</div>';
  }).join('');
  b.innerHTML=nav+resumen+weeks+'<div style="font-size:10px;color:var(--muted);margin-top:8px">Cada mes muestra solo los proveedores que ya entraron (Alta desde el inicio, Normal a los 3 meses, Puede esperar a los 6). La cuota se reparte en 4 semanas.</div>';
}

function _cxpNavMes(d){ var y=parseInt(_cxpMes.slice(0,4)),m=parseInt(_cxpMes.slice(5,7))-1+d; var dt=new Date(y,m,1); _cxpMes=dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2); _cxpRenderCalendario(); }
function cxpAbonar(key){
  if(!_cxpPuede())return;
  var p=_cxpProveedores().filter(function(x){return x.key===key;})[0]; if(!p)return;
  var tasa=getTasa()||0; var old=document.getElementById('cxp-abono-modal'); if(old)old.remove();
  var m=document.createElement('div'); m.id='cxp-abono-modal'; m.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px';
  var inp='width:100%;box-sizing:border-box;margin-top:3px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)';
  m.innerHTML='<div style="background:var(--surface);border-radius:16px;padding:22px;max-width:360px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.4)"><div style="font-weight:800;font-size:16px">Abonar a '+esc(p.proveedor)+'</div><div style="font-size:12px;color:var(--muted);margin:3px 0 14px">Falta $'+fmt(p.restante)+' · cuota mensual $'+fmt(p.cuota)+'</div>'+
    '<label style="font-size:11px;color:var(--muted)">Moneda<select id="cxp-ab-mon" style="'+inp+'" onchange="_cxpAbonoHint()"><option value="usd">Dólares ($)</option><option value="bs">Bolívares (Bs)</option></select></label>'+
    '<label style="font-size:11px;color:var(--muted);display:block;margin-top:8px">Monto<input type="number" id="cxp-ab-monto" min="0" step="0.01" style="'+inp+'" oninput="_cxpAbonoHint()" placeholder="0.00"></label>'+
    '<div id="cxp-ab-hint" style="font-size:11px;color:var(--muted);margin-top:4px"></div>'+
    '<label style="font-size:11px;color:var(--muted);display:block;margin-top:8px">Fecha<input type="date" id="cxp-ab-fecha" value="'+HOY()+'" style="'+inp+'"></label>'+
    '<label style="font-size:11px;color:var(--muted);display:block;margin-top:8px">Nota (opcional)<input type="text" id="cxp-ab-nota" style="'+inp+'" placeholder="Ej: transferencia, factura 123…"></label>'+
    '<input type="hidden" id="cxp-ab-key" value="'+key+'"><input type="hidden" id="cxp-ab-tasa" value="'+tasa+'">'+
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'cxp-abono-modal\').remove()">Cancelar</button><button class="btn btn-green btn-sm" onclick="guardarCxpAbono()">Guardar abono</button></div></div>';
  document.body.appendChild(m); _cxpAbonoHint();
}
function _cxpAbonoHint(){ var mon=(document.getElementById('cxp-ab-mon')||{}).value; var v=parseFloat((document.getElementById('cxp-ab-monto')||{}).value); var tasa=parseFloat((document.getElementById('cxp-ab-tasa')||{}).value); var h=document.getElementById('cxp-ab-hint'); if(!h)return; if(!v||v<=0){h.textContent='';return;} if(mon==='bs'&&tasa>0){ h.textContent='≈ $'+(v/tasa).toFixed(2)+' USD'; } else if(mon==='usd'&&tasa>0){ h.textContent='≈ '+Math.round(v*tasa).toLocaleString('es-VE')+' Bs'; } else h.textContent=''; }
function guardarCxpAbono(){
  if(!_cxpPuede())return;
  var key=document.getElementById('cxp-ab-key').value; var mon=document.getElementById('cxp-ab-mon').value;
  var v=parseFloat(document.getElementById('cxp-ab-monto').value); var tasa=parseFloat(document.getElementById('cxp-ab-tasa').value)||0;
  var fecha=document.getElementById('cxp-ab-fecha').value; var nota=(document.getElementById('cxp-ab-nota').value||'').trim();
  if(!v||v<=0){ showToast&&showToast('Ingresa el monto'); return; }
  var usd, bs;
  if(mon==='bs'){ if(!tasa){showToast&&showToast('No hay tasa para convertir');return;} bs=Math.round(v*100)/100; usd=Math.round(v/tasa*100)/100; }
  else { usd=Math.round(v*100)/100; bs=tasa?Math.round(v*tasa*100)/100:null; }
  var emp=key.split('||')[0]; var x=_cxp();
  x.abonos.push({id:_cxpUID(),key:key,empresa:emp,fecha:fecha,monto_usd:usd,monto_bs:bs,tasa:tasa||null,nota:nota});
  _cxpSave();
  try{ logAudit&&logAudit('cxp.abono',key+' · $'+fmt(usd)); }catch(e){}
  var md=document.getElementById('cxp-abono-modal'); if(md)md.remove();
  showToast&&showToast('Abono guardado: $'+fmt(usd));
  renderCxpProv();
}
function cxpVerFacturas(key){
  var x=_cxp(); var fs=x.facturas.filter(function(f){return _cxpKey(f)===key;});
  var prov=key.split('||')[1]; var old=document.getElementById('cxp-fact-modal'); if(old)old.remove();
  var tasa=getTasa();
  var rows=fs.map(function(f){ var idx=x.facturas.indexOf(f); var mon=f.moneda==='usd'?('$'+fmt(f.monto_usd)+' (solo $)'):((f.monto_bs?fmt(f.monto_bs,0)+' Bs':'—')+' · $'+fmt(f.monto_usd));
    return '<tr style="border-top:1px solid var(--border);'+(f.pagada?'opacity:.55':'')+'"><td style="padding:5px 6px;font-size:11px">'+esc(String(f.factura||'—'))+'<br><span style="font-size:9px;color:var(--muted)">'+(f.vence||f.fecha||'')+'</span></td><td style="padding:5px 6px;font-size:11px;text-align:right">'+mon+'</td><td style="padding:5px 6px;text-align:center">'+(_cxpPuede()?'<button class="btn btn-ghost btn-sm" style="font-size:10px;padding:3px 7px" onclick="cxpTogglePagada('+idx+')">'+(f.pagada?'✓ Pagada':'Marcar pagada')+'</button>':(f.pagada?'✓':'—'))+'</td></tr>'; }).join('');
  var m=document.createElement('div'); m.id='cxp-fact-modal'; m.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML='<div style="background:var(--surface);border-radius:16px;padding:18px;max-width:460px;width:100%;max-height:80vh;overflow:auto;box-shadow:0 24px 60px rgba(0,0,0,.4)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-weight:800;font-size:15px">'+esc(prov)+'</div><button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'cxp-fact-modal\').remove()">Cerrar</button></div><table style="width:100%"><thead><tr><th style="text-align:left;font-size:10px">Factura</th><th style="text-align:right;font-size:10px">Monto</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan=3 style="padding:10px;text-align:center;color:var(--muted)">Sin facturas</td></tr>')+'</tbody></table></div>';
  document.body.appendChild(m);
}
function cxpTogglePagada(idx){ if(!_cxpPuede())return; var x=_cxp(); var f=x.facturas[idx]; if(!f)return; f.pagada=!f.pagada; _cxpSave(); var key=_cxpKey(f); cxpVerFacturas(key); renderCxpProv(); }

/* ============== PRÉSTAMOS PERSONALES "SOLO INTERÉS" ============== */
function _esInteres(l){ return !!(l && l.tipo==='interes'); }
function _interesMensual(l){ return Math.round((Number(l && l.saldo_capital)||0)*(Number(l && l.tasa_interes_mensual)||0)*100)/100; }
function _interesProxFecha(fInicio, dia){ var base=new Date((fInicio||HOY())+'T00:00:00'); var d=Math.min(Math.max(1,dia||base.getUTCDate()||1),28); var c=new Date(base.getFullYear(),base.getMonth(),d); if(c<=base) c=new Date(base.getFullYear(),base.getMonth()+1,d); return c.toISOString().slice(0,10); }
function _interesAvanzaMes(fecha, dia){ var base=fecha?new Date(fecha+'T00:00:00'):new Date(); var d=Math.min(Math.max(1,dia||base.getUTCDate()||1),28); var nx=new Date(base.getFullYear(),base.getMonth()+1,d); return nx.toISOString().slice(0,10); }
function _npToggleInteres(){ var c=(document.getElementById('np-interes-solo')||{}).checked; var e=document.getElementById('np-interes-extra'); if(e)e.style.display=c?'':'none'; if(c){ var ti=document.getElementById('np-interes'); if(ti && (!ti.value || ti.value=='1.33')) ti.value='3.5'; } }
function _aplicarInteres(obj, fInicio){
  var solo=(document.getElementById('np-interes-solo')||{}).checked;
  if(solo){
    obj.tipo='interes';
    obj.saldo_capital=Math.round((Number(obj.monto_usd_original)||0)*100)/100;
    obj.saldo_usd=obj.saldo_capital;
    var dia=parseInt((document.getElementById('np-dia-interes')||{}).value)||0;
    obj.dia_pago=Math.min(28,Math.max(1, dia || (function(){ try{return new Date((fInicio||HOY())+'T00:00:00').getUTCDate();}catch(e){return 1;} })()));
    if(!obj.proxima_cuota || !_esInteres(obj)) obj.proxima_cuota=_interesProxFecha(fInicio, obj.dia_pago);
    if(!Array.isArray(obj.pagos_interes)) obj.pagos_interes=[];
    if(!Array.isArray(obj.abonos_capital)) obj.abonos_capital=[];
    obj.amortizacion=[];
    obj.proxima_cuota=obj.proxima_cuota||_interesProxFecha(fInicio, obj.dia_pago);
  } else { if(obj.tipo==='interes') delete obj.tipo; }
  return obj;
}
function _loanCardInteres(l){
  var tasa=getTasa(); var interes=_interesMensual(l); var iBs=tasa?Math.round(interes*tasa):null; var capBs=tasa?Math.round((Number(l.saldo_capital)||0)*tasa):null;
  var dias=l.proxima_cuota?diasHasta(l.proxima_cuota):null; var estado=estadoPrestamo(l); var e=l.id.replace(/'/g,"\\'");
  return '<div class="loan-card '+loanCardClass(estado)+'">'+
   '<div class="loan-card-hd">'+estadoBadge(estado)+'<span class="badge" style="background:#7c3aed;color:#fff;font-size:9px">PERSONAL · comisión '+((Number(l.tasa_interes_mensual)||0)*100).toFixed(2)+'%/mes</span>'+
     '<span class="loan-card-title" style="cursor:pointer" onclick="verDetalle(\''+e+'\')">'+esc(l.id)+'</span>'+
     '<button class="btn btn-green btn-sm" onclick="abrirPagoInteres(\''+e+'\')" style="margin-left:auto">Pagar comisión</button></div>'+
   '<div class="loan-card-body">'+
     '<div class="loan-stat"><div class="loan-stat-label">Comisión mensual</div><div class="loan-stat-val">$'+fmt(interes)+'</div><div class="loan-stat-sub">'+(iBs?fmt(iBs,0)+' Bs':'—')+'</div></div>'+
     '<div class="loan-stat"><div class="loan-stat-label">Capital (saldo)</div><div class="loan-stat-val">$'+fmt(l.saldo_capital)+'</div><div class="loan-stat-sub">'+(capBs?fmt(capBs,0)+' Bs':'—')+'</div></div>'+
     '<div class="loan-stat"><div class="loan-stat-label">Próximo interés</div><div class="loan-stat-val" style="font-size:12px">'+fmtDate(l.proxima_cuota)+'</div><div class="loan-stat-sub">'+(dias!==null?(dias<0?'<span style="color:var(--red)">'+Math.abs(dias)+'d atrás</span>':dias+'d'):'—')+'</div></div>'+
     '<div class="loan-stat"><div class="loan-stat-label">Tasa</div><div class="loan-stat-val" style="font-size:13px">'+((Number(l.tasa_interes_mensual)||0)*100).toFixed(2)+'%</div><div class="loan-stat-sub">mensual · día '+(l.dia_pago||'—')+'</div></div>'+
   '</div>'+
   '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px 0;border-top:1px solid var(--border);font-size:11px;color:var(--muted)"><span>📅 Empieza a pagar:</span><input type="month" value="'+((l.proxima_cuota||'').slice(0,7))+'" onchange="_interesSetInicio(\''+e+'\',this.value)" style="padding:3px 6px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)"><span style="font-size:10px">(día '+(l.dia_pago||25)+' de cada mes)</span></div>'+
   '<div class="loan-footer">'+
     '<span style="font-size:11px;color:var(--muted)">Capital inicial $'+fmt(l.monto_usd_original)+(Array.isArray(l.abonos_capital)&&l.abonos_capital.length?(' · '+l.abonos_capital.length+' abonos a capital'):'')+'</span>'+
     '<button class="btn btn-accent btn-sm" onclick="abrirAbonoCapital(\''+e+'\')" style="margin-left:auto">Abonar a capital</button>'+
     '<button class="btn btn-ghost btn-sm btn-icon" onclick="verDetalle(\''+e+'\')" title="Detalle">🔍</button>'+
     '<button class="btn btn-ghost btn-sm btn-icon" onclick="editarPrestamo(\''+e+'\')" title="Editar">✏️</button>'+
     '<button class="btn btn-ghost btn-sm btn-icon" onclick="eliminarPrestamo(\''+e+'\')" title="Eliminar" style="color:var(--red)">🗑</button>'+
   '</div></div>';
}
function abrirPagoInteres(id){ var l=db.prestamos.find(function(x){return x.id===id;}); if(!l)return; var tasa=getTasa()||0; var interes=_interesMensual(l); _interesModal('pago',l,tasa,interes,(tasa?Math.round(interes*tasa):'')); }
function abrirAbonoCapital(id){ var l=db.prestamos.find(function(x){return x.id===id;}); if(!l)return; _interesModal('capital',l,getTasa()||0,0,''); }
function _interesModal(modo,l,tasa,interes,bsAuto){
  var old=document.getElementById('int-modal'); if(old)old.remove();
  var inp='width:100%;box-sizing:border-box;margin-top:3px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)';
  var titulo=modo==='pago'?'Pagar comisión del mes':'Abonar a capital';
  var sub=modo==='pago'?('Comisión del mes (3.5%): $'+fmt(interes)+' · capital $'+fmt(l.saldo_capital)):('Capital actual: $'+fmt(l.saldo_capital)+' · al abonar baja el interés mensual');
  var m=document.createElement('div'); m.id='int-modal'; m.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML='<div style="background:var(--surface);border-radius:16px;padding:22px;max-width:360px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.4)"><div style="font-weight:800;font-size:16px">'+titulo+' · '+esc(l.banco)+'</div><div style="font-size:12px;color:var(--muted);margin:3px 0 14px">'+sub+'</div>'+
    '<label style="font-size:11px;color:var(--muted)">Moneda<select id="int-mon" style="'+inp+'" onchange="_intHint()"><option value="bs">Bolívares (Bs)</option><option value="usd">Dólares ($)</option></select></label>'+
    '<label style="font-size:11px;color:var(--muted);display:block;margin-top:8px">Monto<input type="number" id="int-monto" min="0" step="0.01" value="'+(modo==='pago'?bsAuto:'')+'" style="'+inp+'" oninput="_intHint()"></label>'+
    '<div id="int-hint" style="font-size:11px;color:var(--muted);margin-top:4px"></div>'+
    '<label style="font-size:11px;color:var(--muted);display:block;margin-top:8px">Fecha<input type="date" id="int-fecha" value="'+HOY()+'" style="'+inp+'"></label>'+
    (modo==='pago'?'<label style="font-size:11px;color:var(--muted);display:block;margin-top:8px">Banco (opcional, registra salida)<input type="text" id="int-banco" style="'+inp+'" placeholder="de dónde salió"></label>':'')+
    '<label style="font-size:11px;color:var(--muted);display:block;margin-top:8px">Nota<input type="text" id="int-nota" style="'+inp+'"></label>'+
    '<input type="hidden" id="int-id" value="'+l.id.replace(/'/g,"\\'")+'"><input type="hidden" id="int-modo" value="'+modo+'"><input type="hidden" id="int-tasa" value="'+tasa+'">'+
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'int-modal\').remove()">Cancelar</button><button class="btn btn-green btn-sm" onclick="guardarInteres()">'+(modo==='pago'?'Registrar pago':'Abonar')+'</button></div></div>';
  document.body.appendChild(m); _intHint();
}
function _intHint(){ var mon=(document.getElementById('int-mon')||{}).value; var v=parseFloat((document.getElementById('int-monto')||{}).value); var tasa=parseFloat((document.getElementById('int-tasa')||{}).value); var h=document.getElementById('int-hint'); if(!h)return; if(!v||v<=0){h.textContent='';return;} if(mon==='bs'&&tasa>0)h.textContent='≈ $'+(v/tasa).toFixed(2)+' USD'; else if(mon==='usd'&&tasa>0)h.textContent='≈ '+Math.round(v*tasa).toLocaleString('es-VE')+' Bs'; else h.textContent=''; }
function guardarInteres(){
  var id=document.getElementById('int-id').value; var modo=document.getElementById('int-modo').value;
  var l=db.prestamos.find(function(x){return x.id===id;}); if(!l)return;
  var mon=document.getElementById('int-mon').value; var v=parseFloat(document.getElementById('int-monto').value);
  var tasa=parseFloat(document.getElementById('int-tasa').value)||0; var fecha=document.getElementById('int-fecha').value; var nota=(document.getElementById('int-nota').value||'').trim();
  if(!v||v<=0){ showToast&&showToast('Ingresa el monto'); return; }
  var usd,bs;
  if(mon==='bs'){ if(!tasa){showToast&&showToast('No hay tasa para convertir');return;} bs=Math.round(v*100)/100; usd=Math.round(v/tasa*100)/100; }
  else { usd=Math.round(v*100)/100; bs=tasa?Math.round(v*tasa*100)/100:null; }
  if(modo==='pago'){
    if(!Array.isArray(l.pagos_interes))l.pagos_interes=[];
    l.pagos_interes.push({fecha:fecha,monto_usd:usd,monto_bs:bs,tasa:tasa||null,nota:nota});
    l.ultima_fecha_pago=fecha; l.proxima_cuota=_interesAvanzaMes(l.proxima_cuota,l.dia_pago);
    var bk=(document.getElementById('int-banco')||{}).value;
    try{ if(bk&&bs){ registrarMovBanco({id:uid(),ts:new Date().toISOString(),tipo:'salida',entidad:l.entidad,banco:bk,monto_bs:bs,monto_usd:usd,tasa:tasa||null,concepto:'Interés préstamo '+l.id,ref:nota,origen:'prestamo:'+l.id}); } }catch(e){}
    try{ logAudit&&logAudit('prestamo.interes','ID: '+l.id+' · $'+fmt(usd)); }catch(e){}
  } else {
    if(!Array.isArray(l.abonos_capital))l.abonos_capital=[];
    l.abonos_capital.push({fecha:fecha,monto_usd:usd,monto_bs:bs,tasa:tasa||null,nota:nota});
    l.saldo_capital=Math.round(((Number(l.saldo_capital)||0)-usd)*100)/100; if(l.saldo_capital<0)l.saldo_capital=0;
    l.saldo_usd=l.saldo_capital;
    if(l.saldo_capital<=0.01){ l.activo=false; l.liquidado=true; if(!l.fecha_liquidado)l.fecha_liquidado=fecha; }
    try{ logAudit&&logAudit('prestamo.abonocapital','ID: '+l.id+' · $'+fmt(usd)+' · capital $'+fmt(l.saldo_capital)); }catch(e){}
  }
  l._v=Date.now(); saveDB(db);
  var md=document.getElementById('int-modal'); if(md)md.remove();
  showToast&&showToast(modo==='pago'?'Comisión registrada ✓':('Abono a capital ✓ · comisión ahora $'+fmt(_interesMensual(l))));
  try{ renderPrestamos(l.entidad); renderBadges(); }catch(e){ try{renderTab(activeTab);}catch(e2){} }
}

function _interesSetInicio(id,val){ if(!val)return; var l=db.prestamos.find(function(x){return x.id===id;}); if(!l)return; var d=Math.min(28,Math.max(1,Number(l.dia_pago)||25)); l.dia_pago=d; l.proxima_cuota=val+'-'+('0'+d).slice(-2); l._v=Date.now(); saveDB(db); try{ showToast&&showToast('Pagos de '+esc(l.banco)+' empiezan '+l.proxima_cuota); }catch(e){} try{ logAudit&&logAudit('prestamo.inicio',l.id+' -> '+l.proxima_cuota); }catch(e){} try{ renderPrestamos(l.entidad); renderBadges&&renderBadges(); }catch(e){ try{renderTab(activeTab);}catch(e2){} } }

/* ================= CALENDARIO DE PAGOS (unificado) ================= */
var _calMes=null, _calDiaSel=null, _calVista='cal';
function _calTasaBinance(){ var x=_cxp(); var b=Number(x.tasa_binance)||0; return b>0?b:0; }
function _calFactorDolar(){ var bcv=Number(getTasa())||0; var bin=_calTasaBinance(); if(bcv>0&&bin>0){ var f=bin/bcv; return f>1?f:1; } return 1; }
function _evCost(e){ var F=_calFactorDolar(); return (Number(e.monto)||0)*(Number(e.f)||1)/(F>0?F:1); }
function _calMonBadge(mon){ if(mon==='usd')return '<span style="font-size:8px;font-weight:700;background:#dcfce7;color:#15803d;padding:1px 5px;border-radius:999px;white-space:nowrap">💵 $</span>'; if(mon==='mixto')return '<span style="font-size:8px;font-weight:700;background:#e0e7ff;color:#4338ca;padding:1px 5px;border-radius:999px;white-space:nowrap">$/Bs</span>'; return '<span style="font-size:8px;font-weight:700;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:999px;white-space:nowrap">Bs</span>'; }
