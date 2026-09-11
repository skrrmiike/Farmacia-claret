/* ============================================================
   33-reparto.js — Repartidor de Caja Diario (prefijo _rep)  v3
   MODELO DE MONTOS ANCLADOS (Excel Miguel + Mayra, ago 2026):
   Venta del día → impuestos (%) → partidas ancladas en orden
   (nómina con José/Nani en Bs, bancos $500+$500, fallas, socios,
   alimentación, Néstor, Eduardo, Héctor, deuda vieja) → el EXTRA
   va al destino de la fase de la estrategia (F1: salir de Héctor
   y Eduardo · F2: deuda vieja · F3: mercancía).
   Claret Central. Estado en Supabase (rep_*).
   ============================================================ */

var _repCfg={edilso_pct:65,fondo_pct:35,jefe_fijo_diario:130,nani_fijo_diario:20,prov_pct_sobrante:85,gastos_pct_sobrante:15,seniat_pct:1,promedio_venta_diaria:0};
var _repFondos={}, _repMetas=[], _repDeudas=[], _repMovs=[], _repDias=[], _repImpuestos=[];
var _repReady=false, _repLoading=false;
var _repVista='hoy', _repGestionOpen=false, _repDetOpen=false, _repCochSel=null, _repDeudaBuscar='', _repHistMes='';
var _repTmp=null, _repPreview=null, _repTraerCache=[];
function _repGetTasa(){ var t=_repNum(_repCfg.tasa_dia); if(t>0)return t; try{ if(typeof getTasa==='function'){ var g=Number(getTasa()); if(g>0)return g; } }catch(e){} return 0; }

function _repHoy(){ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }
function _repUser(){ return (typeof currentUser!=='undefined')?currentUser:''; }
function _repEsAdmin(){ try{ return (typeof currentRole!=='undefined')&&currentRole==='admin'; }catch(e){ return false; } }
function _repPuedeVer(){ if(_repEsAdmin())return true; try{ if(typeof _tabAllowed==='function')return _tabAllowed('reparto'); }catch(e){} try{ return ['gerente'].indexOf(currentRole)>=0; }catch(e){} return false; }
function _repPuedeEditar(){ return _repPuedeVer(); }

function _repNum(v){ if(v==null)return 0; var n=parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; }
function _repR2(n){ return Math.round(_repNum(n)*100)/100; }
function _repMoney(n){ return '$'+_repR2(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _repFmtFecha(d){ if(!d)return '—'; var s=String(d).slice(0,10); var p=s.split('-'); return (p.length===3)?(p[2]+'/'+p[1]+'/'+p[0]):s; }
function _repDiasHasta(fecha,hoy){ try{ var a=new Date((hoy||_repHoy())+'T00:00:00Z'), b=new Date(String(fecha).slice(0,10)+'T00:00:00Z'); return Math.round((b-a)/86400000); }catch(e){ return 0; } }
function _repFondoSaldo(clave){ var f=_repFondos[clave]; return f?_repNum(f.saldo_actual):0; }
function _repNominaReunido(){ return _repMetas.filter(function(m){return m.activo!==false && m.tipo==='nomina';}).reduce(function(s,m){return s+_repNum(m.reunido);},0); }
function _repImpReunido(){ return (_repImpuestos||[]).filter(function(t){return t.activo!==false;}).reduce(function(s,t){return s+_repNum(t.reunido);},0); }
/* ============================================================
   PARTIDAS ANCLADAS — la repartición diaria del Excel
   ============================================================ */
function _repPartidasDefault(){ return [
  {clave:'nomina', nombre:'Nómina', emoji:'👥', monto:510, orden:1, meta_busca:'tipo:nomina', desc:'Nómina del personal — se guarda para pagar la quincena.'},
  {clave:'banco_mercantil', nombre:'Banco Mercantil', emoji:'🏦', monto:500, orden:2, directo:true, desc:'Préstamo: $500 diarios entran por los puntos Mercantil y ahí se quedan para la cuota.'},
  {clave:'banco_provincial', nombre:'Banco Provincial', emoji:'🏦', monto:500, orden:3, directo:true, desc:'Préstamo: $500 diarios entran por los puntos Provincial y ahí se quedan para la cuota.'},
  {clave:'fallas', nombre:'Fallas diarias', emoji:'📦', monto:510, orden:4, fondo:'edilso', desc:'Mercancía del día — la compra Edilso.'},
  {clave:'alimentacion', nombre:'Alimentación', emoji:'🍽️', monto:105, orden:5, desc:'Beneficio de alimentación del personal.'},
  {clave:'socios', nombre:'Socios (José + Nani)', emoji:'🤝', monto:150, orden:6, desc:'José y Nani: $150 diarios entre los dos, pagados en Bs antes de comprar dólares (reparto ajustable en Ajustes).'},
  {clave:'nestor', nombre:'Néstor Luzardo (grande)', emoji:'💼', monto:240, orden:7, desc:'Abono diario a la deuda grande de Néstor (se guarda en su fondo).'},
  {clave:'nestor_personal', nombre:'Néstor personal', emoji:'💼', monto:34, orden:8, meta_busca:'néstor personal', desc:'Deuda personal de Néstor: $1.000 mensuales (~$34/día la cubren).'},
  {clave:'eduardo', nombre:'Eduardo Walshe', emoji:'💼', monto:70, orden:9, meta_busca:'eduardo', desc:'Comisión de Eduardo: $2.100 mensuales ($70/día la cubren exacto).'},
  {clave:'hector', nombre:'Héctor De La Hoz', emoji:'💼', monto:120, orden:10, meta_busca:'héctor', sobra_a:'deuda_vieja', desc:'Comisión de Héctor: $3.500 mensuales ($120/día la cubren; el sobrante ~$100/mes va a deuda vieja).'},
  {clave:'deuda_vieja', nombre:'Deuda vieja', emoji:'📜', monto:60, orden:11, fondo:'proveedores', desc:'Proveedores viejos — alimenta el fondo que se reparte con el Plan de Proveedores.'}
]; }
function _repPartidas(){ var p=(_repCfg&&_repCfg.partidas); if(!(p&&p.length))p=_repPartidasDefault(); return p.slice().sort(function(a,b){return _repNum(a.orden)-_repNum(b.orden);}); }
function _repPartidaFondo(p){ return p.fondo||p.clave; }
function _repAncladoTotal(defs){ return _repR2((defs||_repPartidas()).reduce(function(s,p){return s+_repNum(p.monto);},0)); }
function _repFases(){ return [
  {n:1, nombre:'Fase 1 · Extra al banco', destinos:[{clave:'banco_mercantil',pct:50},{clave:'banco_provincial',pct:50}], desc:'Todo el extra limpia el atraso con Mercantil y Provincial, para poder refinanciar y pagar a Héctor y Eduardo de un solo golpe.'},
  {n:2, nombre:'Fase 2 · Refinanciado: mercancía + deuda vieja', destinos:[{clave:'fallas',pct:50},{clave:'deuda_vieja',pct:50}], desc:'Héctor y Eduardo pagados con el crédito: el extra va mitad a surtido, mitad a la deuda vieja de proveedores.'},
  {n:3, nombre:'Plan B · Abonar a Héctor y Eduardo', destinos:[{clave:'hector',pct:50},{clave:'eduardo',pct:50}], desc:'Si el banco no presta: el extra abona directo a capital de los prestamistas para dejar de pagar interés.'}
]; }
function _repEstrategia(){ var e=(_repCfg&&_repCfg.estrategia); if(e&&e.destinos&&e.destinos.length)return e; var f=_repFases()[0]; return {fase:1,destinos:f.destinos}; }
function _repMetaDePartida(p, metas){ if(!p||!p.meta_busca)return null; var act=(metas||_repMetas||[]).filter(function(m){return m.activo!==false;});
  if(p.meta_busca==='tipo:nomina'){ var n=act.filter(function(m){return m.tipo==='nomina';}); return n[0]||null; }
  var q=_repNorm(p.meta_busca); for(var i=0;i<act.length;i++){ if(_repNorm(act[i].nombre).indexOf(q)>=0)return act[i]; } return null; }
/* Cuenta en dólares = todo lo retenido físicamente (NO los bancos, que retienen ellos) */
function _repSaldoDolares(){
  var claves={gastos:1}, tot=0;
  _repPartidas().forEach(function(p){ if(p.directo)return; if(_repMetaDePartida(p,_repMetas))return; claves[_repPartidaFondo(p)]=1; });
  Object.keys(claves).forEach(function(k){ tot+=_repFondoSaldo(k); });
  var metasG=(_repMetas||[]).filter(function(m){return m.activo!==false && m.cobro_directo!==true;}).reduce(function(s,m){return s+_repNum(m.reunido);},0);
  return _repR2(tot+metasG+_repImpReunido());
}

/* ============================================================
   UNIFICACIÓN con Plan de Proveedores (db.cxp_prov) — fuente única
   Las deudas vivas se leen del Plan; aquí solo guardamos el % de
   reparto y las cuotas deseadas por proveedor (en rep_deudas).
   Abonar desde aquí escribe el abono también en el Plan.
   ============================================================ */
function _repCxp(){ try{ if(typeof _cxp==='function')return _cxp(); }catch(e){} try{ return (typeof db!=='undefined'&&db&&db.cxp_prov)?db.cxp_prov:null; }catch(e){ return null; } }
function _repNorm(s){ return String(s==null?'':s).trim().toLowerCase().replace(/\s+/g,' '); }
/* Argumento seguro para onclick="..." (atributo con comillas dobles) → string JS entre comillas simples */
function _repArg(s){ return "'"+String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/</g,'&lt;')+"'"; }
/* Deuda viva por proveedor, Claret-wide (todas las empresas juntas) */
function _repPlanDeudas(){
  var x=_repCxp(); if(!x||!Array.isArray(x.facturas))return [];
  var map={};
  x.facturas.forEach(function(f){ var m=Number(f&&f.monto_usd)||0; if(m<=0)return; var nk=_repNorm(f.proveedor); if(!nk)return;
    if(!map[nk])map[nk]={proveedor:f.proveedor,total:0,pagado:0,emp:{}};
    map[nk].total=_repR2(map[nk].total+m);
    if(f.pagada){ map[nk].pagado=_repR2(map[nk].pagado+m); }
    else { map[nk].emp[f.empresa]=_repR2((map[nk].emp[f.empresa]||0)+m); }
  });
  (x.abonos||[]).forEach(function(a){ var prov=String(a&&a.key||'').split('||')[1]||(a&&a.proveedor)||''; var nk=_repNorm(prov); if(!map[nk])return; var m=Number(a&&a.monto_usd)||0; if(m<=0)return; map[nk].pagado=_repR2(map[nk].pagado+m); var e=String(a&&a.key||'').split('||')[0]||(a&&a.empresa); if(e&&map[nk].emp[e]!=null)map[nk].emp[e]=_repR2(map[nk].emp[e]-m); });
  return Object.keys(map).map(function(nk){ var p=map[nk]; var restante=Math.max(0,_repR2(p.total-p.pagado)); return {norm:nk,proveedor:p.proveedor,total:_repR2(p.total),abonado:_repR2(p.pagado),restante:restante,emp:p.emp}; });
}
function _repPlanTotal(){ return _repR2(_repPlanDeudas().reduce(function(s,p){return s+p.restante;},0)); }
/* Ajustes de reparto guardados (rep_deudas) indexados por nombre normalizado */
function _repProvSettings(){ var m={}; (_repDeudas||[]).forEach(function(d){ if(d.activo===false)return; m[_repNorm(d.proveedor)]=d; }); return m; }
/* Lista fusionada para el motor y las vistas: deuda viva del Plan + % de reparto local */
function _repProvList(){
  var plan=_repPlanDeudas(), settings=_repProvSettings(), usados={}, out=[];
  plan.forEach(function(p){ if(p.restante<=0.5)return; var s=settings[p.norm]; if(s)usados[p.norm]=true;
    out.push({ id:s?s.id:('plan:'+p.norm), _norm:p.norm, _emp:p.emp, fromPlan:true, proveedor:s&&s.proveedor?s.proveedor:p.proveedor,
      total:p.total, abonado:p.abonado, reparto_pct:s?_repNum(s.reparto_pct):0, cuotas_desea:s?_repNum(s.cuotas_desea):0, activo:true }); });
  // deudas manuales que NO están en el Plan (compatibilidad hacia atrás)
  (_repDeudas||[]).forEach(function(d){ if(d.activo===false)return; var nk=_repNorm(d.proveedor); if(usados[nk])return; var falta=_repR2(_repNum(d.total)-_repNum(d.abonado)); if(falta<=0.5&&_repNum(d.reparto_pct)<=0)return;
    out.push({ id:d.id, _norm:nk, _emp:null, fromPlan:false, proveedor:d.proveedor, total:_repNum(d.total), abonado:_repNum(d.abonado), reparto_pct:_repNum(d.reparto_pct), cuotas_desea:_repNum(d.cuotas_desea), activo:true }); });
  return out;
}
function _repProvGet(id){ var s=String(id); var L=_repProvList(); for(var i=0;i<L.length;i++)if(String(L[i].id)===s)return L[i]; return null; }
/* Escribe un abono en el Plan (db.cxp_prov.abonos), repartido entre empresas por deuda */
function _repAbonoAlPlan(item, monto){
  var x=_repCxp(); if(!x)return false; if(!Array.isArray(x.abonos))x.abonos=[];
  var prov=item.proveedor; (x.facturas||[]).some(function(f){ if(_repNorm(f.proveedor)===item._norm){prov=f.proveedor;return true;} return false; });
  var slots=item._emp||{}; var emps=Object.keys(slots).filter(function(e){return slots[e]>0.001;});
  var tot=emps.reduce(function(s,e){return s+slots[e];},0);
  if(!emps.length||tot<=0){ var e0=(item._emp&&Object.keys(item._emp)[0])||'FARMACIA'; emps=[e0]; slots={}; slots[e0]=1; tot=1; }
  var acum=0; emps.forEach(function(e,i){ var m=(i===emps.length-1)?_repR2(monto-acum):_repR2(monto*slots[e]/tot); acum=_repR2(acum+m); if(m<=0)return;
    x.abonos.push({id:(typeof _cxpUID==='function'?_cxpUID():('r'+Date.now().toString(36)+i)),key:e+'||'+prov,empresa:e,fecha:_repHoy(),monto_usd:m,monto_bs:null,tasa:null,nota:'Abono desde Repartidor',origen:'reparto',creado_por:_repUser()}); });
  try{ if(typeof _cxpSave==='function')_cxpSave(); else if(typeof saveDB==='function')saveDB(db); }catch(e){}
  return true;
}
/* Garantiza una fila rep_deudas (solo ajustes) para un proveedor del Plan; devuelve Promise<id> */
function _repEnsureSetting(item){
  if(!item.fromPlan||String(item.id).indexOf('plan:')!==0){ return Promise.resolve(item.id); }
  return supabaseClient.from('rep_deudas').insert({proveedor:item.proveedor,total:0,abonado:0,reparto_pct:_repNum(item.reparto_pct),cuotas_desea:_repNum(item.cuotas_desea),creado_por:_repUser(),actualizado_en:new Date().toISOString()}).select('*').then(function(res){ if(res&&res.data&&res.data[0]){ _repDeudas.push(res.data[0]); return res.data[0].id; } return null; });
}

/* ============================================================
   MOTOR (puro)
   ============================================================ */
function _repDistProv(monto, deudas){
  monto=_repR2(monto);
  var act=(deudas||[]).filter(function(d){ return d.activo!==false && _repNum(d.reparto_pct)>0 && (_repNum(d.total)-_repNum(d.abonado))>0.001; });
  var sumPct=act.reduce(function(s,d){return s+_repNum(d.reparto_pct);},0);
  if(!act.length||sumPct<=0)return [];
  var out=[], acum=0;
  act.forEach(function(d,i){ var m; if(i===act.length-1)m=_repR2(monto-acum); else { m=_repR2(monto*_repNum(d.reparto_pct)/sumPct); acum=_repR2(acum+m); } out.push({id:d.id,proveedor:d.proveedor,pct:_repNum(d.reparto_pct),monto:m}); });
  return out;
}
function _repBaseMonto(baseKey, conIva, sinIva, ventaTotal, ventaUsd){
  if(baseKey==='con_iva')return conIva;
  if(baseKey==='usd')return ventaUsd;
  if(baseKey==='manual')return 0;
  return ventaTotal; // 'total'
}
function _repCalcCore(conIva, sinIva, ventaUsd, cfg, impuestos, metas, deudas, hoy){
  conIva=_repR2(conIva); sinIva=_repR2(sinIva); ventaUsd=_repR2(ventaUsd);
  var ventaTotal=_repR2(conIva+sinIva);
  var impDet=[], impTotal=0;
  (impuestos||[]).filter(function(t){return t.activo!==false && t.diario!==false && _repNum(t.rate)>0;}).forEach(function(t){
    var b=_repBaseMonto(t.base, conIva, sinIva, ventaTotal, ventaUsd);
    var m=_repR2(_repNum(b)*_repNum(t.rate)/100);
    if(m>0){ impDet.push({id:t.id,nombre:t.nombre,rate:_repNum(t.rate),base:t.base,monto:m}); impTotal=_repR2(impTotal+m); }
  });
  // 1) Impuestos fuera → 2) partidas ancladas en orden → 3) EXTRA según estrategia
  // Regla "ni más ni menos": una partida ligada a meta solo recoge hasta completar
  // su monto del mes; lo que sobre de su bolsillo diario cae a FALLAS DIARIAS.
  var disponible=_repR2(ventaTotal-impTotal);
  var defs=(cfg&&cfg.partidas&&cfg.partidas.length)?cfg.partidas.slice().sort(function(a,b){return _repNum(a.orden)-_repNum(b.orden);}):_repPartidasDefault();
  var jefeObjA=_repNum(cfg.jefe_fijo_diario), naniObjA=_repNum(cfg.nani_fijo_diario);
  var partidas=[], redirMap={};
  defs.forEach(function(d){
    var obj=_repNum(d.monto);
    var cap=obj, capped=false;
    if(d.meta_busca){ var mc=_repMetaDePartida(d, metas);
      if(mc){ var fM=Math.max(0,_repR2(_repNum(mc.objetivo)-_repNum(mc.reunido)));
        var floorBs=(d.clave==='socios')?_repR2(jefeObjA+naniObjA):0; // José/Nani se pagan aunque hubiera meta llena
        var c=_repR2(Math.min(obj, fM+floorBs));
        if(c<obj-0.005){ cap=c; capped=true; }
      }
    }
    var wouldAsig=_repR2(Math.min(obj, Math.max(0,disponible)));
    var asig=_repR2(Math.min(cap, wouldAsig));
    var redir=_repR2(wouldAsig-asig);
    disponible=_repR2(disponible-asig-redir);
    if(redir>0){ var destK=d.sobra_a||'fallas'; redirMap[destK]=_repR2((redirMap[destK]||0)+redir); }
    partidas.push({clave:d.clave,nombre:d.nombre,emoji:d.emoji||'💰',objetivo:obj,cap:cap,capped:capped,asignado:asig,redir:0,extra:0,corto:(asig<cap-0.005),directo:d.directo===true,fondo:_repPartidaFondo(d),meta_busca:d.meta_busca||null,sobra_a:d.sobra_a||'fallas',desc:d.desc||''});
  });
  // sobras de metas ya llenas → a su destino (fallas por defecto; Héctor → deuda vieja)
  Object.keys(redirMap).forEach(function(destK){
    var pf=null, jf;
    for(jf=0;jf<partidas.length;jf++)if(partidas[jf].clave===destK){pf=partidas[jf];break;}
    if(!pf)for(jf=0;jf<partidas.length;jf++)if(partidas[jf].clave==='fallas'){pf=partidas[jf];break;}
    if(!pf&&partidas.length)pf=partidas[0];
    if(pf){ pf.asignado=_repR2(pf.asignado+redirMap[destK]); pf.redir=_repR2((pf.redir||0)+redirMap[destK]); }
  });
  var extra=_repR2(Math.max(0,disponible));
  var est=(cfg&&cfg.estrategia&&cfg.estrategia.destinos&&cfg.estrategia.destinos.length)?cfg.estrategia:{fase:1,destinos:[{clave:'banco_mercantil',pct:50},{clave:'banco_provincial',pct:50}]};
  var extraDest=[];
  if(extra>0&&partidas.length){
    var ds=est.destinos.filter(function(x){return _repNum(x.pct)>0;}); if(!ds.length)ds=[{clave:'deuda_vieja',pct:100}];
    var sumD=ds.reduce(function(s,x){return s+_repNum(x.pct);},0)||1, acum=0;
    ds.forEach(function(x,i){ var m=(i===ds.length-1)?_repR2(extra-acum):_repR2(extra*_repNum(x.pct)/sumD); acum=_repR2(acum+m); if(m<=0)return;
      var p=null, j; for(j=0;j<partidas.length;j++)if(partidas[j].clave===x.clave){p=partidas[j];break;}
      if(!p){ for(j=0;j<partidas.length;j++)if(partidas[j].clave==='deuda_vieja'){p=partidas[j];break;} }
      if(!p)p=partidas[partidas.length-1];
      p.extra=_repR2(p.extra+m); extraDest.push({clave:p.clave,nombre:p.emoji+' '+p.nombre,monto:m});
    });
  }
  // José y Nani se pagan en Bs desde el bolsillo de NÓMINA (antes de comprar dólares)
  var jefeObj=_repNum(cfg.jefe_fijo_diario), naniObj=_repNum(cfg.nani_fijo_diario);
  var jefe=0, nani=0;
  var resMetas=[], totalApartado=0, bancoReservado=0, metasAhorro=0, heldParts=0, fallasTot=0, deudaViejaTot=0;
  partidas.forEach(function(p){
    p.total=_repR2(p.asignado+p.extra);
    if(p.clave==='socios'){ jefe=_repR2(Math.min(jefeObj,p.total)); nani=_repR2(Math.min(naniObj,_repR2(p.total-jefe))); p.bs=_repR2(jefe+nani); p.ahorro=_repR2(p.total-p.bs); }
    else { p.bs=0; p.ahorro=p.total; }
    if(p.fondo==='edilso')fallasTot=_repR2(fallasTot+p.total);
    if(p.fondo==='proveedores')deudaViejaTot=_repR2(deudaViejaTot+p.total);
    if(p.directo){ bancoReservado=_repR2(bancoReservado+p.total); } else { heldParts=_repR2(heldParts+p.ahorro); }
    var m=_repMetaDePartida(p, metas);
    if(m&&p.ahorro>0){
      p.metaId=m.id;
      var falta=Math.max(0,_repR2(_repNum(m.objetivo)-_repNum(m.reunido)));
      var dd=_repDiasHasta(m.fecha_limite, hoy); var dias=(dd<=0)?1:dd;
      var necesario=_repR2(falta/dias); if(necesario>falta)necesario=falta;
      var ap=p.ahorro; metasAhorro=_repR2(metasAhorro+ap); totalApartado=_repR2(totalApartado+ap);
      resMetas.push({ id:m.id, nombre:m.nombre, tipo:m.tipo, objetivo:_repNum(m.objetivo), reunido:_repNum(m.reunido),
        falta:falta, dias:dias, diasReales:dd, necesario:necesario, apartado:ap, corto:(ap<necesario-0.005), cobroDirecto:false,
        proyReunido:_repR2(_repNum(m.reunido)+ap) });
    }
  });
  var base=_repR2(ventaTotal-impTotal-jefe-nani);
  var provDist=_repDistProv(deudaViejaTot, deudas);
  var held=_repR2(impTotal+heldParts); // cuenta en dólares — sin José/Nani (Bs) ni bancos (retienen ellos)
  var asigTotal=partidas.reduce(function(s,p){return s+p.total;},0);
  var suma=_repR2(impTotal+asigTotal);
  var cortas=partidas.filter(function(p){return p.corto;});
  var faltoAnclado=_repR2(cortas.reduce(function(s,p){return s+(p.objetivo-p.asignado);},0));
  return { conIva:conIva, sinIva:sinIva, ventaUsd:ventaUsd, venta:ventaTotal, seniat:impTotal, impuestos:impDet, impTotal:impTotal,
    partidas:partidas, extra:extra, extraDest:extraDest, fase:(est.fase||0), estNombre:(est.nombre||''), ancladoTotal:_repAncladoTotal(defs), faltoAnclado:faltoAnclado,
    base:base, edilso:fallasTot, fondo:0, jefe:jefe, jefeObj:jefeObj, jefeCorto:(jefe<jefeObj-0.005), nani:nani, naniObj:naniObj, naniCorto:(nani<naniObj-0.005),
    metas:resMetas, totalApartado:totalApartado, bancoReservado:bancoReservado, metasAhorro:metasAhorro,
    sobrante:extra, proveedores:deudaViejaTot, gastos:0,
    provDist:provDist, held:held, suma:suma, cuadra:(Math.abs(suma-ventaTotal)<0.01) };
}
function _repCalc(conIva,sinIva,ventaUsd){ return _repCalcCore(conIva,sinIva,ventaUsd,_repCfg,_repImpuestos,_repMetas,_repProvList(),_repHoy()); }
function _repProyeccion(m){ var falta=Math.max(0,_repNum(m.objetivo)-_repNum(m.reunido)); var d=_repDiasHasta(m.fecha_limite); return { falta:falta, dias:d, necesarioDia:_repR2(falta/((d<=0)?1:d)), alDia:(falta<=0) }; }

/* ============================================================
   Carga
   ============================================================ */
function _repEntrar(){ if(!_repReady){ _repCargar(); } else { _repRender(); } }
function _repCargar(){
  if(_repLoading)return; _repLoading=true;
  var cont=document.getElementById('reparto-content'); if(cont)cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">Cargando reparto…</div>';
  Promise.all([
    supabaseClient.from('rep_config').select('*').eq('id',1).maybeSingle(),
    supabaseClient.from('rep_fondos').select('*').order('orden',{ascending:true}),
    supabaseClient.from('rep_metas').select('*').order('fecha_limite',{ascending:true}),
    supabaseClient.from('rep_deudas').select('*').order('creado_en',{ascending:true}),
    supabaseClient.from('rep_movimientos').select('*').order('creado_en',{ascending:false}).limit(200),
    supabaseClient.from('rep_dias').select('*').order('fecha',{ascending:false}).limit(120),
    supabaseClient.from('rep_impuestos').select('*').order('orden',{ascending:true})
  ]).then(function(res){
    if(res[0]&&res[0].data)_repCfg=res[0].data;
    _repFondos={}; (res[1].data||[]).forEach(function(f){ _repFondos[f.clave]=f; });
    _repMetas=(res[2].data||[]); _repDeudas=(res[3].data||[]); _repMovs=(res[4].data||[]); _repDias=(res[5].data||[]); _repImpuestos=(res[6].data||[]);
    // Garantiza una fila rep_fondos por cada partida que guarda en fondo propio
    var faltan=[]; var ord=100;
    _repPartidas().forEach(function(p){ var fk=_repPartidaFondo(p); ord++; if(!_repFondos[fk]&&!_repMetaDePartida(p,_repMetas)){ faltan.push({clave:fk,nombre:(p.emoji||'')+' '+p.nombre,saldo_actual:0,orden:ord}); _repFondos[fk]={clave:fk,nombre:(p.emoji||'')+' '+p.nombre,saldo_actual:0,orden:ord}; } });
    if(faltan.length){ supabaseClient.from('rep_fondos').insert(faltan).then(function(){}); }
    _repReady=true; _repLoading=false; _repRender();
  }).catch(function(err){
    _repLoading=false;
    var c=document.getElementById('reparto-content'); if(c)c.innerHTML='<div style="padding:30px;text-align:center;color:var(--red)">Error al cargar: '+esc(String(err&&err.message||err))+'</div>';
  });
}
function _repRefrescar(){ _repReady=false; _repPreview=null; _repCargar(); }
function _repSetVista(v){ _repVista=v; if(v==='hoy'||v==='semana')_repGestionOpen=false; _repRender(); }
function _repToggleGestion(){ _repGestionOpen=!_repGestionOpen; if(_repGestionOpen){ if(['hoy','semana'].indexOf(_repVista)>=0)_repVista='proy'; } else { _repVista='hoy'; } _repRender(); }
function _repToggleDet(){ _repDetOpen=!_repDetOpen; _repRender(); }
function _repDeudaBuscarSet(v){ _repDeudaBuscar=v||''; _repRender(); var i=document.getElementById('rep-deuda-buscar'); if(i){ i.focus(); try{ i.setSelectionRange(i.value.length,i.value.length); }catch(e){} } }
function _repHistMesSet(v){ _repHistMes=v||''; _repRender(); }

/* ============================================================
   Render principal
   ============================================================ */
function _repRender(){
  var cont=document.getElementById('reparto-content'); if(!cont)return;
  if(!_repPuedeVer()){ cont.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">No tienes acceso a este módulo.</div>'; return; }
  var head='<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px">'+
    '<div><div style="font-size:19px;font-weight:800">Repartidor de Caja</div>'+
    '<div style="font-size:12px;color:var(--muted);margin-top:2px">Reparte la venta del día, aparta impuestos y metas, y lleva la cuenta en dólares. Claret Central.</div></div>'+
    '<button class="fchip" onclick="_repRefrescar()" style="font-size:12px">↻ Actualizar</button></div>';
  var banner='<div class="tbox" style="padding:11px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-left:4px solid #16a34a">'+
    '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Cuenta en dólares (lo que tienes)</div><div style="font-size:26px;font-weight:800;color:#16a34a">'+_repMoney(_repSaldoDolares())+'</div></div>'+
    '<div style="text-align:right;font-size:11px;color:var(--muted)">Banco (cobra directo) no se cuenta aquí.<br>Reservado impuestos: '+_repMoney(_repImpReunido())+'</div></div>';
  var gestTabs=[['proy','Proyección'],['metas','Metas'],['deudas','Deudas'],['fondos','Fondos'],['dias','Historial'],['config','Ajustes']];
  var gestActive=gestTabs.some(function(t){return t[0]===_repVista;});
  var abierto=_repGestionOpen||gestActive;
  var mkBtn=function(k,l,on,bg){ return '<button onclick="_repSetVista(\''+k+'\')" style="border:none;cursor:pointer;padding:8px 14px;font-size:12.5px;font-weight:700;'+(on?('background:'+(bg||'#16a34a')+';color:#fff'):'background:var(--surface);color:var(--muted)')+'">'+l+'</button>'; };
  var tabs='<div style="display:inline-flex;border:1px solid var(--border);border-radius:9px;overflow:hidden;flex-wrap:wrap;margin-bottom:'+(abierto?'8px':'14px')+'">'+
    mkBtn('hoy','📥 Hoy',_repVista==='hoy')+mkBtn('semana','🐷 Semana',_repVista==='semana')+
    '<button onclick="_repToggleGestion()" style="border:none;cursor:pointer;padding:8px 14px;font-size:12.5px;font-weight:700;'+(abierto?'background:#334155;color:#fff':'background:var(--surface);color:var(--muted)')+'">⚙️ Gestión '+(abierto?'▴':'▾')+'</button>'+
    '</div>';
  if(abierto){ tabs+='<div style="display:inline-flex;border:1px solid var(--border);border-radius:9px;overflow:hidden;flex-wrap:wrap;margin-bottom:14px">'+gestTabs.map(function(x){ return mkBtn(x[0],x[1],_repVista===x[0],'#334155'); }).join('')+'</div>'; }
  var cuerpo='';
  if(_repVista==='hoy')cuerpo=_repHoyHTML();
  else if(_repVista==='semana')cuerpo=_repSemanaHTML();
  else if(_repVista==='proy')cuerpo=_repProyHTML();
  else if(_repVista==='metas')cuerpo=_repMetasHTML();
  else if(_repVista==='fondos')cuerpo=_repFondosHTML();
  else if(_repVista==='deudas')cuerpo=_repDeudasHTML();
  else if(_repVista==='dias')cuerpo=_repDiasHTML();
  else cuerpo=_repConfigHTML();
  cont.innerHTML=head+banner+tabs+cuerpo;
  if(_repVista==='config'){ try{ _repPartLive(); }catch(e){} }
}

/* ---------- HOY ---------- */
function _repHoyHTML(){
  var alertas=_repAlertasMetas();
  var pv=_repPreview;
  var tasaAct=_repGetTasa();
  var inS='width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:16px;font-weight:700;margin-top:3px';
  var inp='<div class="tbox" style="padding:14px;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:8px">Venta del día (en bolívares)</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
      '<label style="flex:1;min-width:120px"><span style="font-size:11px;color:var(--muted)">Vendido CON IVA (Bs)</span><input type="number" inputmode="decimal" id="rep-coniva" value="'+(pv&&pv.conIvaBs?esc(String(pv.conIvaBs)):'')+'" oninput="_repConvHint()" style="'+inS+'"></label>'+
      '<label style="flex:1;min-width:120px"><span style="font-size:11px;color:var(--muted)">Vendido SIN IVA (Bs)</span><input type="number" inputmode="decimal" id="rep-siniva" value="'+(pv&&pv.sinIvaBs?esc(String(pv.sinIvaBs)):'')+'" oninput="_repConvHint()" style="'+inS+'"></label>'+
      '<label style="flex:1;min-width:120px"><span style="font-size:11px;color:var(--muted)">Tasa del día (Bs/$)</span><input type="number" inputmode="decimal" id="rep-tasa" value="'+(tasaAct||'')+'" oninput="_repConvHint()" style="'+inS+'"></label>'+
      '<label style="flex:1;min-width:120px"><span style="font-size:11px;color:var(--muted)">Cobrado en $ (IGTF)</span><input type="number" inputmode="decimal" id="rep-usd" value="'+(pv?esc(String(pv.ventaUsd)):'')+'" style="'+inS+'"></label>'+
    '</div><div id="rep-conv" style="font-size:12px;color:#16a34a;font-weight:700;margin-top:8px"></div><button onclick="_repCalcularPreview()" style="background:#16a34a;color:#fff;border:none;border-radius:9px;padding:10px 18px;font-size:13.5px;font-weight:800;cursor:pointer;margin-top:8px">Calcular reparto</button></div>';
  var prev='';
  if(pv){
    var p=pv;
    var r=function(a,b,c,d){ return '<tr><td>'+a+'</td><td style="color:var(--muted)">'+b+'</td><td class="r">'+c+'</td><td class="r" style="color:var(--muted)">'+(d||'')+'</td></tr>'; };
    var baseLbl={total:'venta total',con_iva:'con IVA',usd:'ventas $'};
    var rows=(p.ventaBs?r('Venta en Bs',(p.tasa?('tasa '+p.tasa):''),'<b>'+p.ventaBs.toLocaleString('es-VE')+' Bs</b>',''):'')+
      r('Venta total en $','con+sin IVA','<b>'+_repMoney(p.venta)+'</b>','');
    p.impuestos.forEach(function(t){ rows+=r('− '+esc(t.nombre),t.rate+'% '+(baseLbl[t.base]||t.base),'<span style="color:#b45309">'+_repMoney(t.monto)+'</span>',''); });
    var jefeBs=(p.tasa?Math.round(p.jefe*p.tasa):0), naniBs=(p.tasa?Math.round((p.nani||0)*p.tasa):0);
    rows+='<tr style="border-top:2px solid var(--border);background:var(--surface2);font-weight:700"><td>Partidas ancladas</td><td style="color:var(--muted)">'+_repMoney(p.ancladoTotal)+'/día · por orden</td><td class="r"></td><td></td></tr>';
    (p.partidas||[]).forEach(function(x){
      var extraTag=(x.extra>0)?' <span style="font-size:10px;color:#16a34a;font-weight:800">+'+_repMoney(x.extra)+' extra</span>':'';
      if(x.redir>0)extraTag+=' <span style="font-size:10px;color:#0ea5e9;font-weight:800">+'+_repMoney(x.redir)+' de metas llenas</span>';
      var val=(x.corto?'<span style="color:#dc2626">':'')+_repMoney(x.total)+(x.corto?'</span>':'')+extraTag;
      var destP=(p.partidas||[]).filter(function(y){return y.clave===(x.sobra_a||'fallas');})[0];
      var destNom=destP?(destP.emoji+' '+esc(destP.nombre)):'📦 fallas';
      var det=_repMoney(x.objetivo)+'/día'+(x.capped?(' · meta del mes llena, sobra → '+destNom):(x.corto?(' · faltaron '+_repMoney(_repR2((x.cap!=null?x.cap:x.objetivo)-x.asignado))):''));
      var acum='';
      if(x.metaId){ var mm=(p.metas||[]).filter(function(y){return String(y.id)===String(x.metaId);})[0]; if(mm)acum=_repMoney(mm.proyReunido)+' / '+_repMoney(mm.objetivo); }
      else acum=_repMoney(_repFondoSaldo(x.fondo)+x.ahorro);
      rows+=r(x.emoji+' '+esc(x.nombre)+(x.directo?' <span style="font-size:9px;color:#6366f1">banco retiene</span>':''),det,val,acum);
      if(x.clave==='socios'&&x.bs>0)rows+=r('&nbsp;&nbsp;↳ José '+_repMoney(p.jefe)+' + Nani '+_repMoney(p.nani)+' <span style="color:#7c3aed">(en Bs)</span>','sale del bolsillo de socios','<span style="color:#7c3aed">'+_repMoney(x.bs)+'</span>'+((jefeBs+naniBs)?(' <span style="font-size:10px;color:var(--muted)">≈'+(jefeBs+naniBs).toLocaleString('es-VE')+' Bs</span>'):''),'');
    });
    rows+='<tr style="background:#f0fdf4;font-weight:800"><td>💵 EXTRA del día</td><td style="color:var(--muted)">venta − impuestos − anclado</td><td class="r" style="color:#16a34a">'+_repMoney(p.extra)+'</td><td></td></tr>';
    if(p.extraDest&&p.extraDest.length)rows+=r('→ destino del extra','Fase '+p.fase,p.extraDest.map(function(x){return esc(x.nombre)+' '+_repMoney(x.monto);}).join(' · '),'');
    var provdist=p.provDist.length?('<div style="font-size:11px;color:var(--muted);margin-top:8px">La deuda vieja se reparte hoy: '+p.provDist.map(function(x){return esc(x.proveedor)+' '+_repMoney(x.monto);}).join(' · ')+'</div>'):'';
    var avisos='';
    var cortas=(p.partidas||[]).filter(function(x){return x.corto;});
    if(cortas.length)avisos+='<div style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin-top:8px">⚠ Día corto: faltaron <b>'+_repMoney(p.faltoAnclado)+'</b> para cubrir todo lo anclado ('+cortas.map(function(x){return x.emoji+' '+esc(x.nombre);}).join(', ')+'). '+_repSugerencia(p)+'</div>';
    var faseObj=_repFases().filter(function(x){return x.n===_repNum(p.fase);})[0];
    var estNom=p.estNombre||(faseObj?faseObj.nombre:'estrategia');
    if(p.extra>0)avisos+='<div style="font-size:12px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 10px;margin-top:8px">💵 <b>Extra '+_repMoney(p.extra)+'</b> → '+(p.extraDest||[]).map(function(x){return esc(x.nombre)+' <b>'+_repMoney(x.monto)+'</b>';}).join(' · ')+' <span style="color:var(--muted)">('+esc(estNom)+' — cambia en Ajustes)</span></div>';
    var tablaDet='<style>.rep-tbl td{padding:5px 6px;border-bottom:1px solid var(--border)}.rep-tbl td.r{text-align:right;font-variant-numeric:tabular-nums}</style>'+
      '<div style="overflow-x:auto;margin-top:10px"><table class="rep-tbl" style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase"><th style="padding:5px 6px">Destino</th><th style="padding:5px 6px">Anclado</th><th style="padding:5px 6px;text-align:right">Hoy</th><th style="padding:5px 6px;text-align:right">Acumulado</th></tr></thead><tbody>'+rows+'</tbody></table>'+provdist+'</div>';
    var chip=function(lbl,val,col){ return '<div style="background:var(--surface2);border-radius:9px;padding:8px 9px;text-align:center"><div style="font-size:9.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.2px">'+lbl+'</div><div style="font-size:14px;font-weight:800;color:'+(col||'var(--text)')+'">'+_repMoney(val)+'</div></div>'; };
    var gTot=function(claves){ return (p.partidas||[]).filter(function(x){return claves.indexOf(x.clave)>=0;}).reduce(function(s,x){return s+x.total;},0); };
    var nomG=(p.partidas||[]).filter(function(x){return x.clave==='nomina';}).reduce(function(s,x){return s+x.ahorro;},0);
    var chips=chip('José (Bs)',p.jefe,'#7c3aed')+chip('Nani (Bs)',p.nani||0,'#7c3aed')+chip('Impuestos',p.impTotal,'#b45309')+
      chip('Nómina 🐷',nomG,'#14b8a6')+chip('Bancos',p.bancoReservado,'#6366f1')+chip('Fallas',gTot(['fallas']),'#0ea5e9')+
      chip('Deudas',gTot(['nestor','nestor_personal','eduardo','hector','deuda_vieja']),'#f59e0b')+chip('Otros',gTot(['socios','alimentacion']),'#64748b')+
      chip('💵 Extra',p.extra,'#16a34a');
    prev='<div class="tbox" style="padding:14px">'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px"><div style="font-size:14px;font-weight:800">Reparto del día</div><div style="font-size:12px;color:var(--muted)">Venta <b>'+_repMoney(p.venta)+'</b>'+(p.ventaBs?(' · '+p.ventaBs.toLocaleString('es-VE')+' Bs'):'')+'</div></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:7px;margin-top:11px">'+chips+'</div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:13px;padding-top:11px;border-top:1px solid var(--border)">'+
        '<div><div style="font-size:12px;font-weight:700;color:'+(p.cuadra?'#16a34a':'#dc2626')+'">'+(p.cuadra?'✓ Cuadra con la venta':'✗ No cuadra: '+_repMoney(p.suma))+'</div><div style="font-size:11.5px;color:var(--muted)">A tu cuenta en dólares entran <b>'+_repMoney(p.held)+'</b> · José y Nani en Bs · bancos retienen '+_repMoney(p.bancoReservado)+'</div></div>'+
        (_repPuedeEditar()?'<button onclick="_repConfirmarVenta()" style="background:#16a34a;color:#fff;border:none;border-radius:11px;padding:12px 26px;font-size:16px;font-weight:800;cursor:pointer">✓ Registrar</button>':'')+
      '</div>'+avisos+
      '<div style="text-align:center;margin-top:10px"><button onclick="_repToggleDet()" class="fchip" style="font-size:11.5px">'+(_repDetOpen?'Ocultar detalle ▴':'Ver detalle completo ▾')+'</button></div>'+
      (_repDetOpen?tablaDet:'')+
    '</div>';
  }
  return alertas+inp+prev;
}
function _repSugerencia(p){ var r=(p.venta>0)?(p.impTotal/p.venta):0.08; var nec=_repR2(p.ancladoTotal/(1-r)); return 'Para cubrir todo lo anclado necesitas vender ~'+_repMoney(nec)+'/día. Lo que faltó hoy se completa mañana o al cierre de la semana.'; }
function _repConvHint(){ var a=document.getElementById('rep-coniva'), b=document.getElementById('rep-siniva'), t=document.getElementById('rep-tasa'), h=document.getElementById('rep-conv'); if(!h)return; var bs=(a?_repNum(a.value):0)+(b?_repNum(b.value):0), tasa=t?_repNum(t.value):0; h.innerHTML=(bs>0&&tasa>0)?('Venta '+bs.toLocaleString('es-VE')+' Bs → <b>'+_repMoney(bs/tasa)+'</b> a tasa '+tasa):''; }
function _repCalcularPreview(){
  var a=document.getElementById('rep-coniva'), b=document.getElementById('rep-siniva'), c=document.getElementById('rep-usd'), t=document.getElementById('rep-tasa');
  var ciBs=a?_repNum(a.value):0, siBs=b?_repNum(b.value):0, us=c?_repNum(c.value):0, tasa=t?_repNum(t.value):0;
  if(ciBs+siBs<=0){ showToast&&showToast('Indica la venta en Bs'); return; }
  if(tasa<=0){ showToast&&showToast('Indica la tasa del día'); return; }
  var ci=_repR2(ciBs/tasa), si=_repR2(siBs/tasa);
  _repPreview=_repCalc(ci,si,us);
  _repPreview.tasa=tasa; _repPreview.conIvaBs=ciBs; _repPreview.sinIvaBs=siBs; _repPreview.ventaBs=_repR2(ciBs+siBs);
  if(tasa!==_repNum(_repCfg.tasa_dia)){ _repCfg.tasa_dia=tasa; supabaseClient.from('rep_config').update({tasa_dia:tasa,actualizado_en:new Date().toISOString()}).eq('id',1).then(function(){}); }
  _repRender();
}
function _repConfirmarVenta(){
  if(!_repPreview||!_repPuedeEditar())return;
  var p=_repPreview, hoy=_repHoy(), u=_repUser();
  var ups=[], movs=[], detMetas=[], detImp=[], detPart=[];
  (p.partidas||[]).forEach(function(x){
    detPart.push({clave:x.clave,monto:x.total,bs:(x.bs||0),extra:(x.extra||0),fondo:x.fondo,meta_id:(x.metaId||null)});
    if(x.total<=0)return;
    if(x.metaId){
      var m=_repMetas.filter(function(y){return String(y.id)===String(x.metaId);})[0];
      var nv=_repR2((m?_repNum(m.reunido):0)+x.ahorro); if(m)m.reunido=nv;
      ups.push(supabaseClient.from('rep_metas').update({reunido:nv,actualizado_en:new Date().toISOString()}).eq('id',x.metaId));
      detMetas.push({id:x.metaId,apartado:x.ahorro,cobroDirecto:false});
      movs.push({tipo:'entrada',fondo:'meta',meta_id:x.metaId,monto:x.ahorro,concepto:'Aparte '+x.nombre+(x.extra>0?(' (incluye extra '+_repMoney(x.extra)+')'):''),venta_ref:p.venta,creado_por:u,fecha:hoy});
    } else if(x.ahorro>0){
      ups.push(_repFondoAdd(x.fondo,x.ahorro));
      movs.push({tipo:'entrada',fondo:x.fondo,monto:x.ahorro,concepto:x.emoji+' '+x.nombre+(x.extra>0?(' (incluye extra '+_repMoney(x.extra)+')'):''),venta_ref:p.venta,creado_por:u,fecha:hoy});
    }
  });
  p.impuestos.forEach(function(t){ if(t.monto>0){ var imp=_repImpuestos.filter(function(x){return String(x.id)===String(t.id);})[0]; var nv=_repR2((imp?_repNum(imp.reunido):0)+t.monto); if(imp)imp.reunido=nv; ups.push(supabaseClient.from('rep_impuestos').update({reunido:nv,actualizado_en:new Date().toISOString()}).eq('id',t.id)); detImp.push({id:t.id,monto:t.monto}); } });
  if(p.jefe>0)movs.push({tipo:'salida',fondo:'jefe',monto:p.jefe,concepto:'Pago José/jefe (Bs) '+hoy,venta_ref:p.venta,creado_por:u,fecha:hoy});
  if(p.nani>0)movs.push({tipo:'salida',fondo:'nani',monto:p.nani,concepto:'Pago Nani (Bs) '+hoy,venta_ref:p.venta,creado_por:u,fecha:hoy});
  p.impuestos.forEach(function(t){ if(t.monto>0)movs.push({tipo:'entrada',fondo:'impuesto',monto:t.monto,concepto:'Reserva '+t.nombre,venta_ref:p.venta,creado_por:u,fecha:hoy}); });
  ups.push(supabaseClient.from('rep_movimientos').insert(movs));
  ups.push(supabaseClient.from('rep_dias').insert({fecha:hoy,venta_con_iva:p.conIva,venta_sin_iva:p.sinIva,venta_usd:p.ventaUsd,venta_total:p.venta,tasa:(p.tasa||0),venta_bs:(p.ventaBs||0),seniat:p.impTotal,impuestos_total:p.impTotal,impuestos_detalle:{imp:detImp},base:p.base,edilso:p.edilso,jefe:p.jefe,nani:(p.nani||0),banco_reservado:p.bancoReservado,metas_ahorro:p.metasAhorro,proveedores:p.proveedores,gastos:0,detalle:{metas:detMetas,partidas:detPart,extra:p.extra,fase:p.fase},creado_por:u}));
  Promise.all(ups).then(function(){ if(typeof logAudit==='function')logAudit('reparto_venta','Repartió '+_repMoney(p.venta)); _repPreview=null; _repRefrescar(); showToast&&showToast('Reparto registrado ✓'); }).catch(function(err){ showToast&&showToast('Error: '+(err&&err.message||err)); });
}
function _repFondoAdd(clave, monto){ var nuevo=_repR2(_repFondoSaldo(clave)+_repNum(monto)); if(_repFondos[clave])_repFondos[clave].saldo_actual=nuevo; return supabaseClient.from('rep_fondos').update({saldo_actual:nuevo,actualizado_en:new Date().toISOString()}).eq('clave',clave); }

function _repAlertasMetas(){
  var items=[];
  _repMetas.filter(function(m){return m.activo!==false && _repNum(m.reunido)<_repNum(m.objetivo) && m.fecha_limite;}).forEach(function(m){ var pr=_repProyeccion(m); var d=pr.dias;
    if(d<0)items.push({c:'#dc2626',t:'⏰ '+m.nombre+' venció el '+_repFmtFecha(m.fecha_limite)+' y falta '+_repMoney(pr.falta)});
    else if(d<=3&&pr.falta>0)items.push({c:'#b45309',t:'⚠ '+m.nombre+': faltan '+_repMoney(pr.falta)+' y quedan '+d+'d ('+_repMoney(pr.necesarioDia)+'/día)'}); });
  if(!items.length)return '';
  return '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">'+items.map(function(x){return '<div style="font-size:12px;font-weight:600;color:'+x.c+';background:'+x.c+'12;border:1px solid '+x.c+'40;border-radius:8px;padding:7px 10px">'+esc(x.t)+'</div>';}).join('')+'</div>';
}

/* ---------- SEMANA (cochinitos de alcancía) ---------- */
function _repPiggy(id,pct,color){ pct=Math.max(0,Math.min(100,Math.round(pct||0)));
  var top=20,bot=84,ft=(bot-(bot-top)*(pct/100)); var cid='fcpig'+id;
  return '<svg viewBox="0 0 120 104" width="100%" style="max-width:120px;display:block;margin:0 auto">'+
    '<defs><clipPath id="'+cid+'"><ellipse cx="58" cy="52" rx="42" ry="32"/></clipPath></defs>'+
    '<rect x="34" y="80" width="10" height="15" rx="3" fill="#e5e7eb" stroke="#cbd5e1"/><rect x="72" y="80" width="10" height="15" rx="3" fill="#e5e7eb" stroke="#cbd5e1"/>'+
    '<ellipse cx="58" cy="52" rx="42" ry="32" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>'+
    '<rect x="14" y="'+ft.toFixed(1)+'" width="90" height="'+(bot-ft+3).toFixed(1)+'" fill="'+color+'" clip-path="url(#'+cid+')" opacity=".9"/>'+
    '<ellipse cx="58" cy="52" rx="42" ry="32" fill="none" stroke="#94a3b8" stroke-width="1.4" opacity=".45"/>'+
    '<path d="M40 24 L53 21 L47 35 Z" fill="#e2e8f0" stroke="#cbd5e1"/>'+
    '<ellipse cx="98" cy="55" rx="9" ry="12" fill="'+color+'" opacity=".92" stroke="#cbd5e1"/><circle cx="96" cy="51" r="1.7" fill="#475569"/><circle cx="100" cy="59" r="1.7" fill="#475569"/>'+
    '<circle cx="74" cy="42" r="3.2" fill="#334155"/><circle cx="75.1" cy="41" r="1" fill="#fff"/>'+
    '<rect x="50" y="23" width="20" height="4" rx="2" fill="#334155"/>'+
    '<path d="M15 50 q-6 -1 -4 -7 q2 -5 -3 -6" fill="none" stroke="#cbd5e1" stroke-width="2.4"/>'+
    '<text x="58" y="57" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a">'+pct+'%</text>'+
  '</svg>'; }
function _repWeekRange(){ var h=_repHoy(); var d=new Date(h+'T00:00:00Z'); var dow=d.getUTCDay(); var diff=(dow===0?6:dow-1); var mon=new Date(d); mon.setUTCDate(d.getUTCDate()-diff); var sun=new Date(mon); sun.setUTCDate(mon.getUTCDate()+6); return {ini:mon.toISOString().slice(0,10),fin:sun.toISOString().slice(0,10),dia:diff+1}; }
function _repSemAgg(ini,fin){
  var A={per:{},imp:0,jefe:0,nani:0,venta:0,ndias:0,extra:0};
  (_repDias||[]).forEach(function(x){ var f=String(x.fecha).slice(0,10); if(f<ini||f>fin)return; A.ndias++; A.venta+=_repNum(x.venta_total); A.imp+=_repNum(x.impuestos_total||x.seniat); A.jefe+=_repNum(x.jefe); A.nani+=_repNum(x.nani);
    var det=x.detalle&&x.detalle.partidas;
    if(det&&det.length){ det.forEach(function(y){ A.per[y.clave]=_repR2((A.per[y.clave]||0)+_repNum(y.monto)); }); A.extra=_repR2(A.extra+_repNum(x.detalle.extra)); }
    else { A.per.fallas=_repR2((A.per.fallas||0)+_repNum(x.edilso)); A.per.deuda_vieja=_repR2((A.per.deuda_vieja||0)+_repNum(x.proveedores)+_repNum(x.gastos)); A.per.nomina=_repR2((A.per.nomina||0)+_repNum(x.metas_ahorro)+_repNum(x.jefe)+_repNum(x.nani)); }
  });
  return A;
}
function _repSemanaHTML(){
  var wr=_repWeekRange(), ini=wr.ini, fin=wr.fin;
  var A=_repSemAgg(ini,fin);
  // abonos de la semana (por proveedor)
  var abW=0, abBy={}; (_repMovs||[]).forEach(function(m){ var f=String(m.fecha).slice(0,10); if(f<ini||f>fin)return; if(m.tipo==='salida'&&m.fondo==='proveedores'){ abW+=_repNum(m.monto); var nm=(String(m.concepto||'').split(' a ')[1]||'').replace(' (Plan)','').trim(); if(nm)abBy[_repNorm(nm)]=_repR2((abBy[_repNorm(nm)]||0)+_repNum(m.monto)); } });
  var defs=_repPartidas();
  var colores={nomina:'#7c3aed',banco_mercantil:'#6366f1',banco_provincial:'#818cf8',fallas:'#0ea5e9',alimentacion:'#84cc16',socios:'#334155',nestor:'#0891b2',nestor_personal:'#22d3ee',eduardo:'#dc2626',hector:'#ef4444',deuda_vieja:'#f59e0b'};
  var head='<div class="tbox" style="padding:13px 15px;margin-bottom:12px;border-left:4px solid #16a34a"><div style="font-size:15px;font-weight:800">Semana del '+_repFmtFecha(ini)+' al '+_repFmtFecha(fin)+'</div><div style="font-size:12px;color:var(--muted);margin-top:2px">Cada día metes lo que entra en <b>Hoy</b>; aquí ves cómo se llenan los cochinitos hacia su meta semanal (monto anclado × 7). '+A.ndias+' de 7 días cargados.</div></div>';
  var kpis='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+
    '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Venta de la semana</div><div style="font-size:21px;font-weight:800">'+_repMoney(A.venta)+'</div></div>'+
    '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">💵 Extra generado</div><div style="font-size:21px;font-weight:800;color:#16a34a">'+_repMoney(A.extra)+'</div></div>'+
    '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Abonado a proveedores</div><div style="font-size:21px;font-weight:800;color:#f59e0b">'+_repMoney(abW)+'</div></div></div>';
  var items=defs.map(function(d,i){ return {clave:d.clave,nombre:d.emoji+' '+d.nombre,color:colores[d.clave]||'#64748b',actual:_repNum(A.per[d.clave]),meta:_repR2(_repNum(d.monto)*7)}; });
  items.push({clave:'imp',nombre:'🏛️ Impuestos',color:'#b45309',actual:A.imp,meta:0});
  var cochGrid='<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Cochinitos de la semana (meta = anclado × 7)</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px">'+
    items.map(function(d,i){ var pct=(d.meta>0)?(d.actual/d.meta*100):(d.actual>0?100:0);
      var sel=(_repCochSel===d.clave);
      return '<div class="tbox" onclick="_repVerCochino('+_repArg(d.clave)+')" style="padding:11px 8px 10px;text-align:center;cursor:pointer'+(sel?';box-shadow:0 0 0 2px #16a34a':'')+'" title="Toca para ver el desglose">'+_repPiggy(i,pct,d.color)+'<div style="font-size:12px;font-weight:700;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+d.nombre+'</div><div style="font-size:15px;font-weight:800;color:'+d.color+'">'+_repMoney(d.actual)+'</div>'+(d.meta>0?('<div style="font-size:10px;color:var(--muted)">meta '+_repMoney(d.meta)+'</div>'):'')+'<div style="font-size:9px;color:var(--muted);margin-top:2px">'+(sel?'ocultar ▴':'ver desglose ▾')+'</div></div>';
    }).join('')+'</div>'+((_repCochSel&&_repCochSel.indexOf('prov:')!==0)?_repCochPanel(_repCochBody(_repCochSel)):'');
  // Cochinitos por proveedor (progreso de pago según el Plan)
  var provs=_repProvList().filter(function(d){return _repNum(d.reparto_pct)>0;}).sort(function(a,b){return (_repNum(b.total)-_repNum(b.abonado))-(_repNum(a.total)-_repNum(a.abonado));});
  var provGrid=provs.length?('<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Cochinitos por proveedor (progreso de pago)</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px">'+
    provs.slice(0,12).map(function(d,i){ var total=_repNum(d.total),ab=_repNum(d.abonado),falta=Math.max(0,total-ab); var pct=total>0?ab/total*100:0; var estaSem=abBy[d._norm]||0;
      var selp=(_repCochSel==='prov:'+d._norm);
      return '<div class="tbox" onclick="_repVerCochinoProv('+_repArg(d._norm)+')" style="padding:11px 8px 10px;text-align:center;cursor:pointer'+(selp?';box-shadow:0 0 0 2px #16a34a':'')+'" title="Toca para ver el desglose">'+_repPiggy('p'+i,pct,'#16a34a')+'<div style="font-size:12px;font-weight:700;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(d.proveedor)+'</div><div style="font-size:12.5px;color:var(--muted)">falta <b style="color:#b45309">'+_repMoney(falta)+'</b></div>'+(estaSem>0?('<div style="font-size:10px;color:#16a34a;font-weight:700">+'+_repMoney(estaSem)+' esta semana</div>'):'<div style="font-size:10px;color:var(--muted)">sin abono esta semana</div>')+'</div>';
    }).join('')+'</div>'+((_repCochSel&&_repCochSel.indexOf('prov:')===0)?_repCochPanel(_repCochProvBody(_repCochSel.slice(5))):'')):'';
  // Reporte: a dónde fue el dinero + movimientos de la semana
  var movs=(_repMovs||[]).filter(function(m){ var f=String(m.fecha).slice(0,10); return f>=ini&&f<=fin; });
  var movRows=movs.length?movs.slice(0,40).map(function(m){ var col=m.tipo==='salida'?'#dc2626':'#16a34a'; return '<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px"><span>'+_repFmtFecha(m.fecha)+' · '+esc(m.concepto||m.fondo||'')+'</span><span style="font-weight:700;color:'+col+';white-space:nowrap">'+(m.tipo==='salida'?'−':'+')+_repMoney(m.monto)+'</span></div>'; }).join(''):'<div style="padding:14px;text-align:center;color:var(--muted)">Sin movimientos esta semana todavía.</div>';
  var repRows=defs.map(function(d){ return [d.emoji+' '+d.nombre+(d.clave==='nomina'?' (incluye José y Nani en Bs)':''),_repNum(A.per[d.clave])]; });
  repRows.push(['🏛️ Impuestos',A.imp]);
  var totRep=repRows.reduce(function(s,r){return s+_repNum(r[1]);},0);
  var reporte='<div class="tbox" style="padding:13px"><div style="font-size:13px;font-weight:700;margin-bottom:8px">Reporte de la semana · ¿a dónde fue el dinero?</div>'+
    '<div style="display:grid;grid-template-columns:1fr auto;gap:3px 10px;font-size:12.5px;margin-bottom:10px">'+
    repRows.map(function(r){return '<span>'+r[0]+'</span><b style="text-align:right">'+_repMoney(r[1])+'</b>';}).join('')+
    '<span style="border-top:1px solid var(--border);padding-top:3px;font-weight:700">Total repartido</span><b style="text-align:right;border-top:1px solid var(--border);padding-top:3px">'+_repMoney(totRep)+'</b></div>'+
    '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px">Movimientos</div>'+movRows+'</div>';
  if(!A.ndias&&!movs.length)return head+'<div class="tbox" style="padding:22px;text-align:center;color:var(--muted)">Todavía no has cargado ventas esta semana.<br>Ve a <b>Hoy</b>, mete lo que entró y registra — los cochinitos se empiezan a llenar solos. 🐷</div>'+cochGrid+provGrid;
  return head+kpis+cochGrid+provGrid+reporte;
}
/* ---------- Desglose al tocar un cochinito ---------- */
function _repMetaFila(m){ var pr=_repProyeccion(m); return '<div style="padding:7px 0;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><b>'+esc(m.nombre)+'</b><span>'+_repMoney(m.reunido)+' / '+_repMoney(m.objetivo)+'</span></div><div style="font-size:11px;color:var(--muted)">'+(pr.falta<=0?'✓ completa':('falta '+_repMoney(pr.falta)+' · límite '+_repFmtFecha(m.fecha_limite)+(m.recurrente?(' · '+esc(m.recurrente)):'')))+'</div></div>'; }
function _repCochBody(tipo){
  var wr=_repWeekRange(), ini=wr.ini, fin=wr.fin;
  var dias=(_repDias||[]).filter(function(x){ var f=String(x.fecha).slice(0,10); return f>=ini&&f<=fin; }).sort(function(a,b){ return String(a.fecha).localeCompare(String(b.fecha)); });
  var perDiaPart=function(clave){ var r=dias.map(function(d){ var det=(d.detalle&&d.detalle.partidas)||[]; var x=det.filter(function(y){return y.clave===clave;})[0]; var v=x?_repNum(x.monto):(clave==='fallas'?_repNum(d.edilso):(clave==='deuda_vieja'?_repNum(d.proveedores):0)); var ex=x&&_repNum(x.extra)>0?' <span style="font-size:10px;color:#16a34a;font-weight:700">(+'+_repMoney(x.extra)+' extra)</span>':''; return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span>'+_repFmtFecha(d.fecha)+ex+'</span><b>'+_repMoney(v)+'</b></div>'; }).join(''); return r||'<div style="padding:10px;text-align:center;color:var(--muted);font-size:12px">Sin días cargados esta semana.</div>'; };
  if(tipo==='imp'){ var rowsI=(_repImpuestos||[]).filter(function(t){return t.activo!==false;}).map(function(t){ return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span>'+esc(t.nombre)+' <span style="font-size:10px;color:var(--muted)">('+_repNum(t.rate)+'%)</span></span><b>'+_repMoney(t.reunido)+'</b></div>'; }).join('');
    var perDiaImp=dias.map(function(d){ return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span>'+_repFmtFecha(d.fecha)+'</span><b>'+_repMoney(_repNum(d.impuestos_total||d.seniat))+'</b></div>'; }).join('');
    return {t:'🏛️ Impuestos', b:'<div style="font-size:12px;color:var(--muted);margin-bottom:6px">Reserva acumulada por impuesto:</div>'+(rowsI||'—')+'<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin:10px 0 2px">Apartado esta semana, por día</div>'+(perDiaImp||'<div style="padding:10px;text-align:center;color:var(--muted);font-size:12px">Sin días cargados.</div>')};
  }
  var d0=_repPartidas().filter(function(x){return x.clave===tipo;})[0]; if(!d0)return null;
  var body='<div style="font-size:12px;color:var(--muted);margin-bottom:6px">'+esc(d0.desc||'')+' Anclado: <b>'+_repMoney(d0.monto)+'/día</b>'+(d0.directo?' · <span style="color:#6366f1">el banco lo retiene (no está en tu cuenta)</span>':'')+'</div>';
  var m=_repMetaDePartida(d0,_repMetas);
  if(m){ body+='<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px">Meta que alimenta</div>'+_repMetaFila(m);
    var ritmo=_repR2(_repNum(d0.monto)*30), obj=_repNum(m.objetivo);
    if(m.recurrente==='mensual'&&ritmo<obj-0.5)body+='<div style="font-size:11.5px;color:#dc2626;margin-top:6px">⚠ A '+_repMoney(d0.monto)+'/día reúnes ~'+_repMoney(ritmo)+'/mes de los '+_repMoney(obj)+' — el resto debe salir del 💵 extra o hay que renegociar.</div>';
    if(m.recurrente==='quincenal'&&_repR2(_repNum(d0.monto)*15)<obj-0.5)body+='<div style="font-size:11.5px;color:#dc2626;margin-top:6px">⚠ A este ritmo reúnes ~'+_repMoney(_repR2(_repNum(d0.monto)*15))+'/quincena de los '+_repMoney(obj)+'.</div>';
  }
  else if(tipo==='deuda_vieja'){ var pp=_repProvPlan(); var rowsP=_repProvList().filter(function(d){return _repNum(d.reparto_pct)>0;}).map(function(d){ var falta=Math.max(0,_repNum(d.total)-_repNum(d.abonado)); var x=pp.filter(function(y){return String(y.id)===String(d.id);})[0]||{}; return '<div style="padding:7px 0;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><b>'+esc(d.proveedor)+'</b><span style="color:#b45309;font-weight:700">falta '+_repMoney(falta)+'</span></div><div style="font-size:11px;color:var(--muted)">'+_repNum(d.reparto_pct)+'% del fondo'+(x.daily>0?(' · ahorra '+_repMoney(x.daily)+'/día'+(x.fecha?(' · pago ~'+_repFmtFecha(x.fecha)):'')):'')+'</div></div>'; }).join('');
    body+='<div style="font-size:12px;color:var(--muted);margin-bottom:6px">Fondo acumulado: <b>'+_repMoney(_repFondoSaldo('proveedores'))+'</b>. A quién se reparte:</div>'+(rowsP||'<div style="color:var(--muted);font-size:12px">Aún no eliges proveedores (pestaña Deudas).</div>'); }
  else { body+='<div style="font-size:12px;margin-bottom:6px">Acumulado del fondo: <b>'+_repMoney(_repFondoSaldo(_repPartidaFondo(d0)))+'</b></div>'; }
  body+='<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin:10px 0 2px">Esta semana, por día</div>'+perDiaPart(tipo);
  return {t:(d0.emoji||'🐷')+' '+esc(d0.nombre), b:body};
}
function _repCochProvBody(norm){
  var d=_repProvList().filter(function(x){return x._norm===norm;})[0]; if(!d)return null;
  var pp=_repProvPlan().filter(function(x){return String(x.id)===String(d.id);})[0]||{};
  var total=_repNum(d.total), ab=_repNum(d.abonado), falta=Math.max(0,total-ab);
  var wr=_repWeekRange(); var estaSem=0;
  (_repMovs||[]).forEach(function(m){ var f=String(m.fecha).slice(0,10); if(f>=wr.ini&&f<=wr.fin&&m.tipo==='salida'&&m.fondo==='proveedores'){ var nm=(String(m.concepto||'').split(' a ')[1]||'').replace(' (Plan)','').trim(); if(_repNorm(nm)===norm)estaSem+=_repNum(m.monto); } });
  var g=function(l,v,c){ return '<span>'+l+'</span><b style="text-align:right'+(c?(';color:'+c):'')+'">'+v+'</b>'; };
  var body='<div style="display:grid;grid-template-columns:1fr auto;gap:5px 10px;font-size:13px">'+
    g('Deuda',_repMoney(total))+g('Abonado',_repMoney(ab),'#16a34a')+g('Falta',_repMoney(falta),'#b45309')+g('% del fondo',_repNum(d.reparto_pct)+'%')+
    (pp.daily>0?(g('Se ahorra al día',_repMoney(pp.daily))+g('Quedaría pago',(pp.fecha?_repFmtFecha(pp.fecha):'—'))):'')+
    g('Abonado esta semana',_repMoney(estaSem),'#16a34a')+'</div>';
  if(pp.cuotas>0){ body+='<div style="font-size:11.5px;margin-top:8px;color:'+(pp.realista?'#16a34a':'#dc2626')+'">'+(pp.realista?'✓':'✗')+' Quieres '+pp.cuotas+' cuotas de '+_repMoney(pp.cuotaMonto)+(pp.realista?' — alcanzas.':(' — lo realista serían '+pp.cuotasReal+' cuotas.'))+'</div>'; }
  body+='<div style="font-size:11px;color:var(--muted);margin-top:10px">La deuda viene del Plan de Proveedores; se actualiza sola.</div>';
  return {t:'🐷 '+esc(d.proveedor), b:body};
}
/* Toggle inline (se despliega debajo de los cochinitos, no en un modal) */
function _repVerCochino(tipo){ _repCochSel=(_repCochSel===tipo?null:tipo); _repRender(); }
function _repVerCochinoProv(norm){ var k='prov:'+norm; _repCochSel=(_repCochSel===k?null:k); _repRender(); }
function _repCochCerrar(){ _repCochSel=null; _repRender(); }
function _repCochPanel(cb){ if(!cb)return ''; return '<div style="border:1px solid var(--border);border-top:3px solid #16a34a;border-radius:0 0 11px 11px;padding:12px 14px;margin:-6px 0 14px;background:var(--surface2)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:14px;font-weight:800">'+cb.t+'</div><button onclick="_repCochCerrar()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;line-height:1">✕</button></div>'+cb.b+'</div>'; }

/* ---------- PROYECCIÓN ---------- */
function _repProyHTML(){
  var prom=_repNum(_repCfg.promedio_venta_diaria);
  var inp='<div class="tbox" style="padding:13px;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:6px">Promedio de venta diaria</div>'+
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="number" inputmode="decimal" id="rep-prom" value="'+esc(String(prom))+'" placeholder="ej. 1000" style="flex:1;min-width:140px;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:15px;font-weight:700">'+
    '<button onclick="_repGuardarProm()" class="fchip" style="font-size:12.5px">Guardar</button></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:6px">Con este promedio proyecto cuánto entrará y si alcanzan las metas a tiempo.</div></div>';
  if(prom<=0)return inp+'<div style="padding:20px;text-align:center;color:var(--muted)">Pon un promedio para ver la proyección.</div>';
  // proyección diaria del reparto con promedio (asumiendo todo con IVA=0 para no inflar SENIAT: usamos base=promedio)
  var pv=_repCalcCore(0, prom, 0, _repCfg, _repImpuestos, _repMetas, _repProvList(), _repHoy()); // sin IVA/USD para la proyección base
  var pRows='<span>🏛️ Impuestos</span><b style="text-align:right">'+_repMoney(pv.impTotal)+'</b>';
  (pv.partidas||[]).forEach(function(x){ pRows+='<span>'+x.emoji+' '+esc(x.nombre)+(x.corto?' <span style="font-size:10px;color:#dc2626">corto</span>':'')+(x.extra>0?' <span style="font-size:10px;color:#16a34a">+extra</span>':'')+'</span><b style="text-align:right'+(x.corto?';color:#dc2626':'')+'">'+_repMoney(x.total)+'</b>'; });
  pRows+='<span style="border-top:1px solid var(--border);padding-top:3px;font-weight:700;color:#16a34a">💵 Extra por día</span><b style="text-align:right;border-top:1px solid var(--border);padding-top:3px;color:#16a34a">'+_repMoney(pv.extra)+'</b>';
  var extraNota='';
  if(pv.extra>0){ extraNota='<div style="font-size:11.5px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:7px 10px;margin-top:8px">💵 A este ritmo generas <b>'+_repMoney(_repR2(pv.extra*30))+'/mes de extra</b> → '+(pv.extraDest||[]).map(function(x){return esc(x.nombre);}).join(' y ')+' (Fase '+pv.fase+'). Así se sale de las deudas.</div>'; }
  else if(pv.faltoAnclado>0){ extraNota='<div style="font-size:11.5px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:7px 10px;margin-top:8px">⚠ Con este promedio no se cubre todo lo anclado (faltan '+_repMoney(pv.faltoAnclado)+'/día). '+_repSugerencia(pv)+'</div>'; }
  var cards='<div class="tbox" style="padding:12px;margin-bottom:10px"><div style="font-size:12px;font-weight:700;margin-bottom:6px">Con '+_repMoney(prom)+'/día, así queda cada partida (anclado total '+_repMoney(pv.ancladoTotal)+')</div>'+
    '<div style="display:grid;grid-template-columns:1fr auto;gap:3px 10px;font-size:12.5px">'+pRows+'</div>'+extraNota+'</div>';
  var metas=_repMetas.filter(function(m){return m.activo!==false && _repNum(m.reunido)<_repNum(m.objetivo) && m.fecha_limite;});
  var mHTML=metas.length?metas.map(function(m){ var pr=_repProyeccion(m); var necDia=pr.necesarioDia;
    // ¿el ritmo (lo que hoy se aparta con el promedio) alcanza?
    var mm=pv.metas.filter(function(x){return String(x.id)===String(m.id);})[0]; var aportaDia=mm?mm.apartado:0;
    var alcanza=(aportaDia+0.005>=necDia); var col=alcanza?'#16a34a':'#dc2626';
    var diasParaLlegar=aportaDia>0?Math.ceil(pr.falta/aportaDia):Infinity;
    var fechaProy=isFinite(diasParaLlegar)?_repFechaMas(diasParaLlegar):null;
    return '<div class="tbox" style="padding:12px;border-left:4px solid '+col+';margin-bottom:8px"><div style="font-weight:700;font-size:13.5px">'+esc(m.nombre)+' <span style="font-size:10px;color:var(--muted)">('+m.tipo+')</span></div>'+
      '<div style="font-size:12px;color:var(--muted);margin-top:2px">Falta '+_repMoney(pr.falta)+' para el '+_repFmtFecha(m.fecha_limite)+' · necesita '+_repMoney(necDia)+'/día</div>'+
      '<div style="font-size:12.5px;margin-top:5px;color:'+col+';font-weight:700">'+(alcanza?('✓ Con el promedio aparta '+_repMoney(aportaDia)+'/día — llega a tiempo'):('✗ Con el promedio solo aparta '+_repMoney(aportaDia)+'/día'+(fechaProy?(' — llegaría el '+_repFmtFecha(fechaProy)):' — no alcanza')))+'</div></div>';
  }).join(''):'<div style="padding:16px;text-align:center;color:var(--muted)">No hay metas activas.</div>';
  // Proyección de pago a proveedores
  var pp=_repProvPlan().filter(function(x){return !x.pagado;});
  var pHTML=pp.length?pp.sort(function(a,b){return (a.dias||0)-(b.dias||0);}).map(function(x){ var col=x.daily>0?'#1d4ed8':'#b45309';
    return '<div class="tbox" style="padding:11px 12px;border-left:4px solid '+col+';margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><div style="font-weight:700;font-size:13.5px">'+esc(x.proveedor)+'</div><div style="font-size:11.5px;color:var(--muted)">Falta '+_repMoney(x.falta)+' · '+x.pct+'% del fondo</div></div><div style="text-align:right"><div style="font-size:14px;font-weight:800;color:'+col+'">'+(x.fecha?_repFmtFecha(x.fecha):'—')+'</div><div style="font-size:10.5px;color:var(--muted)">'+(x.daily>0?('ahorra '+_repMoney(x.daily)+'/día'):'sin ritmo aún')+'</div></div></div></div>';
  }).join(''):'<div style="padding:14px;text-align:center;color:var(--muted)">No hay deudas por proyectar.</div>';
  // Línea de próximos pagos (metas + proveedores, ordenada por fecha)
  var ev=[];
  _repMetas.filter(function(m){return m.activo!==false && _repNum(m.reunido)<_repNum(m.objetivo) && m.fecha_limite;}).forEach(function(m){ var pr=_repProyeccion(m); ev.push({fecha:String(m.fecha_limite).slice(0,10),label:m.nombre,monto:pr.falta,col:'#7c3aed',ic:'🎯'}); });
  pp.forEach(function(x){ if(x.fecha)ev.push({fecha:String(x.fecha).slice(0,10),label:x.proveedor,monto:x.falta,col:'#1d4ed8',ic:'🧾'}); });
  ev.sort(function(a,b){ return String(a.fecha).localeCompare(String(b.fecha)); });
  var timeline=ev.length?('<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:8px">🗓️ Próximos pagos (en orden)</div>'+ev.slice(0,10).map(function(e){ var dh=_repDiasHasta(e.fecha,_repHoy()); return '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span style="min-width:0">'+e.ic+' '+esc(e.label)+' <span style="font-size:10px;color:var(--muted)">'+_repFmtFecha(e.fecha)+(dh<0?' · vencido':(dh===0?' · hoy':' · en '+dh+'d'))+'</span></span><b style="color:'+e.col+';white-space:nowrap">'+_repMoney(e.monto)+'</b></div>'; }).join('')+'</div>'):'';
  return inp+timeline+cards+'<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin:6px 0">¿Llegan las metas?</div>'+mHTML+
    '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin:14px 0 6px">¿Cuándo pagas a proveedores?</div>'+pHTML;
}
function _repGuardarProm(){ if(!_repPuedeEditar())return; var el=document.getElementById('rep-prom'); var v=el?_repNum(el.value):0; supabaseClient.from('rep_config').update({promedio_venta_diaria:v,actualizado_en:new Date().toISOString()}).eq('id',1).then(function(){ _repCfg.promedio_venta_diaria=v; _repRender(); showToast&&showToast('Promedio guardado ✓'); }); }
function _repFechaMas(n){ var d=new Date(_repHoy()+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }

/* ---------- METAS ---------- */
function _repMetasHTML(){
  var acc=_repPuedeEditar()?'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button onclick="_repAbrirMeta()" style="background:#16a34a;color:#fff;border:none;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">＋ Nueva meta</button><button onclick="_repAbrirTraer()" class="fchip" style="font-size:12.5px">🏦 Traer del Plan (préstamos y nómina)</button></div>':'';
  var act=_repMetas.filter(function(m){return m.activo!==false;});
  act.sort(function(a,b){ var pa=(_repNum(a.reunido)>=_repNum(a.objetivo))?1:0, pb=(_repNum(b.reunido)>=_repNum(b.objetivo))?1:0; if(pa!==pb)return pa-pb; return _repDiasHasta(a.fecha_limite,_repHoy())-_repDiasHasta(b.fecha_limite,_repHoy()); });
  if(!act.length)return acc+'<div style="padding:24px;text-align:center;color:var(--muted)">No hay metas. Crea una cuota del banco o la nómina con su fecha.</div>';
  var cards=act.map(function(m){ var pr=_repProyeccion(m); var alDia=(pr.falta<=0); var col=alDia?'#16a34a':(pr.dias<0?'#dc2626':'#2563eb'); var pct=_repNum(m.objetivo)>0?Math.min(100,Math.round(_repNum(m.reunido)/_repNum(m.objetivo)*100)):0; var cd=(m.cobro_directo===true);
    var tcol=(m.tipo==='banco'?'#1E38A6':(m.tipo==='comision'?'#0891b2':'#7c3aed'));
    return '<div class="tbox" style="padding:13px;border-left:4px solid '+col+';margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><div style="font-size:15px;font-weight:700">'+esc(m.nombre)+' <span style="font-size:10px;color:#fff;background:'+tcol+';padding:1px 7px;border-radius:999px;text-transform:uppercase">'+esc(m.tipo)+'</span>'+(cd?' <span style="font-size:9.5px;color:#dc2626">cobra directo</span>':'')+'</div><div style="font-size:12px;color:var(--muted);margin-top:2px">Límite '+_repFmtFecha(m.fecha_limite)+' · '+(pr.dias<0?('vencida '+Math.abs(pr.dias)+'d'):(pr.dias+' días'))+(_repNum(m.dia_pago)>0?(' · 💳 pagar el '+_repNum(m.dia_pago)):'')+'</div></div><div style="text-align:right"><div style="font-size:18px;font-weight:800">'+_repMoney(m.reunido)+'</div><div style="font-size:11px;color:var(--muted)">de '+_repMoney(m.objetivo)+'</div></div></div>'+
      '<div style="height:7px;background:var(--surface2);border-radius:999px;margin-top:8px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+col+'"></div></div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:7px;gap:6px;flex-wrap:wrap"><div style="font-size:12px;'+(alDia?'color:#16a34a;font-weight:700':'')+'">'+(alDia?'✓ Completa':('Falta '+_repMoney(pr.falta)+' · '+_repMoney(pr.necesarioDia)+'/día'))+'</div>'+(_repPuedeEditar()?('<div style="display:flex;gap:6px"><button onclick="_repVerRegistro('+m.id+')" class="fchip" style="font-size:11.5px">📋 Registro</button><button onclick="_repPagarMeta('+m.id+')" class="fchip" style="font-size:11.5px">Pagar</button><button onclick="_repAbrirMeta('+m.id+')" class="fchip" style="font-size:11.5px">✎</button></div>'):'')+'</div></div>';
  }).join('');
  return acc+cards;
}
function _repAbrirMeta(id){ if(!_repPuedeEditar())return; var m=id?_repMetas.filter(function(x){return String(x.id)===String(id);})[0]:null; _repTmp={modo:'meta',id:m?m.id:null,nombre:m?m.nombre:'',tipo:m?m.tipo:'banco',objetivo:m?_repNum(m.objetivo):'',fecha_limite:m?String(m.fecha_limite||'').slice(0,10):'',reunido:m?_repNum(m.reunido):0,cobro_directo:m?(m.cobro_directo===true):true,recurrente:m?(m.recurrente||''):'',dia_pago:m?(_repNum(m.dia_pago)||''):''}; _repHost().innerHTML=_repMetaHTML(); }
function _repMetaHTML(){ var t=_repTmp;
  return _repWrap(_repHdr(t.id?'Editar meta':'Nueva meta')+
    '<label style="display:block"><span style="font-size:12px;color:var(--muted)">Nombre</span><input type="text" value="'+esc(t.nombre||'')+'" oninput="_repTmpSet(\'nombre\',this.value)" placeholder="ej. Cuota banco marzo / Nómina 1ª quincena" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Tipo</span><div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">'+[['banco','Banco'],['nomina','Nómina'],['comision','Comisión']].map(function(k){return '<button onclick="_repTmpSet(\'tipo\',\''+k[0]+'\');if(\''+k[0]+'\'===\'banco\')_repTmpSet(\'cobro_directo\',true);else _repTmpSet(\'cobro_directo\',false);_repReMeta()" class="fchip'+(t.tipo===k[0]?' active':'')+'" style="font-size:12.5px">'+k[1]+'</button>';}).join('')+'<span style="font-size:11px;color:var(--muted);align-self:center;margin-left:6px">Banco tiene prioridad</span></div></label>'+
    '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer"><input type="checkbox" '+(t.cobro_directo?'checked':'')+' onchange="_repTmpSet(\'cobro_directo\',this.checked)"><span style="font-size:12.5px">El banco cobra directo <span style="color:var(--muted)">(se reserva pero no entra a tus ahorros)</span></span></label>'+
    '<div style="display:flex;gap:8px"><label style="display:block;margin-top:8px;flex:1"><span style="font-size:12px;color:var(--muted)">Objetivo ($)</span><input type="number" inputmode="decimal" value="'+esc(String(t.objetivo))+'" oninput="_repTmpSet(\'objetivo\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '<label style="display:block;margin-top:8px;flex:1"><span style="font-size:12px;color:var(--muted)">Ya reunido ($)</span><input type="number" inputmode="decimal" value="'+esc(String(t.reunido))+'" oninput="_repTmpSet(\'reunido\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label></div>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Fecha límite</span><input type="date" value="'+esc(t.fecha_limite||'')+'" oninput="_repTmpSet(\'fecha_limite\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">¿Se repite? (al pagarla se renueva sola)</span><div style="display:flex;gap:6px;margin-top:4px">'+[['','No'],['quincenal','Quincenal'],['mensual','Mensual']].map(function(k){return '<button onclick="_repTmpSet(\'recurrente\',\''+k[0]+'\');_repReMeta()" class="fchip'+((t.recurrente||'')===k[0]?' active':'')+'" style="font-size:12px">'+k[1]+'</button>';}).join('')+'</div></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Día del mes para pagarla (opcional)</span><input type="number" inputmode="numeric" min="1" max="31" value="'+esc(String(t.dia_pago||''))+'" oninput="_repTmpSet(\'dia_pago\',this.value)" placeholder="ej. 25 — el día donde alcanza a reunirse" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'+(t.id?'<button onclick="_repBorrarMeta('+t.id+')" class="fchip" style="font-size:13px;color:#dc2626">Quitar</button>':'')+'<button onclick="_repCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_repGuardarMeta()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button></div>',420);
}
function _repReMeta(){ var h=document.getElementById('rep-modal-host'); if(h)h.innerHTML=_repMetaHTML(); }
function _repGuardarMeta(){ var t=_repTmp; if(!t||!_repPuedeEditar())return; if(!(t.nombre||'').trim()){showToast&&showToast('Ponle nombre');return;} if(_repNum(t.objetivo)<=0){showToast&&showToast('Indica el objetivo');return;} if(!t.fecha_limite){showToast&&showToast('Indica la fecha');return;}
  var row={nombre:t.nombre.trim(),tipo:t.tipo,objetivo:_repNum(t.objetivo),reunido:_repNum(t.reunido),fecha_limite:t.fecha_limite,cobro_directo:!!t.cobro_directo,recurrente:(t.recurrente||'')||null,dia_pago:Math.round(_repNum(t.dia_pago))||null,actualizado_en:new Date().toISOString()};
  var q=t.id?supabaseClient.from('rep_metas').update(row).eq('id',t.id).select('*'):supabaseClient.from('rep_metas').insert(Object.assign({creado_por:_repUser()},row)).select('*');
  q.then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;} _repCerrar(); _repRefrescar(); showToast&&showToast('Meta guardada ✓'); });
}
function _repBorrarMeta(id){ if(!_repPuedeEditar())return; supabaseClient.from('rep_metas').update({activo:false}).eq('id',id).then(function(){ _repCerrar(); _repRefrescar(); showToast&&showToast('Meta quitada'); }); }
function _repPagarMeta(id){ if(!_repPuedeEditar())return; var m=_repMetas.filter(function(x){return String(x.id)===String(id);})[0]; if(!m)return; var disp=_repNum(m.reunido);
  var s=window.prompt('Pagar '+m.nombre+'.\nReunido: '+_repMoney(disp)+'\n¿Cuánto pagas?',String(_repR2(disp))); if(s===null)return; var monto=_repNum(s); if(monto<=0)return; if(monto>disp+0.001){showToast&&showToast('No más de lo reunido ('+_repMoney(disp)+')');return;}
  var nuevo=_repR2(disp-monto);
  var patch={reunido:nuevo,actualizado_en:new Date().toISOString()}, renov='';
  // si es recurrente y quedó saldada, renueva la fecha al próximo ciclo
  if(m.recurrente && nuevo< _repNum(m.objetivo)*0.05 && m.fecha_limite){ var dias=(m.recurrente==='quincenal')?15:30; var base=String(m.fecha_limite).slice(0,10); if(base<_repHoy())base=_repHoy(); var nd=new Date(base+'T00:00:00Z'); nd.setUTCDate(nd.getUTCDate()+dias); patch.fecha_limite=nd.toISOString().slice(0,10); renov=' · renovada al '+_repFmtFecha(patch.fecha_limite); }
  supabaseClient.from('rep_metas').update(patch).eq('id',id).then(function(){ return supabaseClient.from('rep_movimientos').insert({tipo:'salida',fondo:'meta',meta_id:id,monto:monto,concepto:'Pago '+m.nombre,creado_por:_repUser(),fecha:_repHoy()}); }).then(function(){ if(typeof logAudit==='function')logAudit('reparto_pago_meta','Pagó '+_repMoney(monto)+' de '+m.nombre); _repRefrescar(); showToast&&showToast('Pago registrado ✓'+renov); });
}

/* ---------- Registro de pagos de una meta / comisión ---------- */
function _repVerRegistro(id){ if(!_repPuedeVer())return; var m=_repMetas.filter(function(x){return String(x.id)===String(id);})[0]; if(!m)return;
  _repHost().innerHTML=_repWrap(_repHdr('Registro · '+esc(m.nombre))+'<div id="rep-reg-body" style="max-height:60vh;overflow:auto"><div style="padding:16px;text-align:center;color:var(--muted)">Cargando…</div></div>',480);
  supabaseClient.from('rep_movimientos').select('*').eq('meta_id',id).order('creado_en',{ascending:false}).then(function(res){
    var b=document.getElementById('rep-reg-body'); if(!b)return; var rows=(res&&res.data)||[];
    var pagado=rows.filter(function(x){return x.tipo==='salida';}).reduce(function(s,x){return s+_repNum(x.monto);},0);
    var apart=rows.filter(function(x){return x.tipo==='entrada';}).reduce(function(s,x){return s+_repNum(x.monto);},0);
    var head='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><div class="tbox" style="padding:9px 12px;flex:1;min-width:110px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Objetivo</div><div style="font-size:17px;font-weight:800">'+_repMoney(m.objetivo)+'</div></div><div class="tbox" style="padding:9px 12px;flex:1;min-width:110px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Reunido ahora</div><div style="font-size:17px;font-weight:800;color:#2563eb">'+_repMoney(m.reunido)+'</div></div><div class="tbox" style="padding:9px 12px;flex:1;min-width:110px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Pagado (total)</div><div style="font-size:17px;font-weight:800;color:#16a34a">'+_repMoney(pagado)+'</div></div></div>';
    if(!rows.length){ b.innerHTML=head+'<div style="padding:16px;text-align:center;color:var(--muted)">Todavía no hay movimientos registrados para esta comisión.</div>'; return; }
    var list=rows.map(function(x){ var pago=(x.tipo==='salida'); var col=pago?'#16a34a':'#64748b'; return '<div style="display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12.5px"><div><div style="font-weight:600">'+(pago?'Pago':'Aparte')+' · '+_repFmtFecha(x.fecha||x.creado_en)+'</div><div style="font-size:10.5px;color:var(--muted)">'+esc(x.concepto||'')+(x.creado_por?(' · '+esc(x.creado_por)):'')+'</div></div><div style="font-weight:800;color:'+col+';white-space:nowrap">'+(pago?'−':'+')+_repMoney(x.monto)+'</div></div>'; }).join('');
    b.innerHTML=head+'<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px">Historial (lo apartado y lo pagado)</div>'+list;
  }).catch(function(err){ var b=document.getElementById('rep-reg-body'); if(b)b.innerHTML='<div style="padding:16px;color:var(--red)">Error: '+esc(String(err&&err.message||err))+'</div>'; });
}

/* ---------- FONDOS ---------- */
function _repFondosHTML(){
  var descF={edilso:'📦 Fallas diarias — guardado para que Edilso compre mercancía',proveedores:'📜 Deuda vieja — se reparte a proveedores con el Plan',gastos:'gastos operativos del día a día',socios:'🤝 asignación de socios',alimentacion:'🍽️ beneficio de alimentación',nestor_personal:'💼 parte personal de Néstor',banco_mercantil:'🏦 retenido por Mercantil para la cuota del préstamo',banco_provincial:'🏦 retenido por Provincial para la cuota del préstamo'};
  var orden=['edilso','proveedores']; Object.keys(_repFondos).forEach(function(k){ if(orden.indexOf(k)<0&&['jefe','nani','seniat'].indexOf(k)<0)orden.push(k); });
  var cards=orden.map(function(k){ var f=_repFondos[k]; if(!f)return ''; var saldo=_repFondoSaldo(k); if(!saldo&&['edilso','proveedores','gastos'].indexOf(k)<0&&!descF[k])return ''; var btn=_repPuedeEditar()?('<button onclick="_repSalidaFondo(\''+k+'\')" class="fchip" style="font-size:11.5px">➖ Sacar</button>'):'';
    return '<div class="tbox" style="padding:13px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="min-width:0"><div style="font-size:14px;font-weight:700">'+esc(f.nombre)+'</div><div style="font-size:11px;color:var(--muted)">'+(descF[k]||'saldo acumulado')+'</div></div><div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:5px"><div style="font-size:20px;font-weight:800;color:'+(saldo<0?'#dc2626':'var(--text)')+'">'+_repMoney(saldo)+'</div>'+btn+'</div></div>'; }).join('');
  var imp=_repImpuestos.filter(function(t){return t.activo!==false;}).map(function(t){ var s=_repNum(t.reunido); return '<div class="tbox" style="padding:11px 13px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-left:3px solid #b45309"><div><div style="font-size:13px;font-weight:600">'+esc(t.nombre)+' <span style="font-size:9.5px;color:var(--muted)">('+_repNum(t.rate)+'%'+(t.diario===false?', mensual':'')+')</span></div><div style="font-size:10.5px;color:var(--muted)">reserva acumulada</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><div style="font-size:16px;font-weight:700;color:#b45309">'+_repMoney(s)+'</div>'+(_repPuedeEditar()?('<button onclick="_repPagarImpuesto('+t.id+')" class="fchip" style="font-size:10.5px;padding:2px 8px">Pagar</button>'):'')+'</div></div>'; }).join('');
  var metasSaldo=_repMetas.filter(function(m){return m.activo!==false;}).map(function(m){ var cd=(m.cobro_directo===true); return '<div class="tbox" style="padding:11px 13px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div><div style="font-size:13px;font-weight:600">'+esc(m.nombre)+' <span style="font-size:9.5px;color:var(--muted)">('+esc(m.tipo)+(cd?', directo':'')+')</span></div><div style="font-size:10.5px;color:var(--muted)">'+(cd?'pagado al banco (no en tu cuenta)':'reunido en tu cuenta')+'</div></div><div style="font-size:16px;font-weight:700;color:'+(cd?'var(--muted)':'var(--text)')+'">'+_repMoney(m.reunido)+'</div></div>'; }).join('');
  return '<div class="tbox" style="padding:12px 14px;margin-bottom:10px;border-left:4px solid #16a34a"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Cuenta en dólares</div><div style="font-size:24px;font-weight:800;color:#16a34a">'+_repMoney(_repSaldoDolares())+'</div><div style="font-size:11px;color:var(--muted)">Fondos + metas reunidas + impuestos. José/Nani se pagan en Bs y los bancos retienen lo suyo — no cuentan aquí.</div></div>'+
    '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Fondos</div>'+cards+
    (imp?('<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin:12px 0 6px">Reservas de impuestos</div>'+imp):'')+
    (metasSaldo?('<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin:12px 0 6px">Metas</div>'+metasSaldo):'');
}
function _repPagarImpuesto(id){ if(!_repPuedeEditar())return; var t=_repImpuestos.filter(function(x){return String(x.id)===String(id);})[0]; if(!t)return; var disp=_repNum(t.reunido);
  var s=window.prompt('Pagar '+t.nombre+'.\nReserva: '+_repMoney(disp)+'\n¿Cuánto pagas?',String(_repR2(disp))); if(s===null)return; var monto=_repNum(s); if(monto<=0)return; if(monto>disp+0.001){showToast&&showToast('No más de lo reservado ('+_repMoney(disp)+')');return;}
  var nuevo=_repR2(disp-monto); if(t)t.reunido=nuevo;
  supabaseClient.from('rep_impuestos').update({reunido:nuevo,actualizado_en:new Date().toISOString()}).eq('id',id).then(function(){ return supabaseClient.from('rep_movimientos').insert({tipo:'salida',fondo:'impuesto',monto:monto,concepto:'Pago '+t.nombre,creado_por:_repUser(),fecha:_repHoy()}); }).then(function(){ if(typeof logAudit==='function')logAudit('reparto_pago_imp','Pagó '+_repMoney(monto)+' de '+t.nombre); _repRefrescar(); showToast&&showToast('Pago registrado ✓'); });
}
function _repSalidaFondo(clave){ if(!_repPuedeEditar())return; var f=_repFondos[clave]; var saldo=_repFondoSaldo(clave); var lbl=clave==='jefe'?'Retiro del jefe':(clave==='gastos'?'Salida de gastos':(clave==='seniat'?'Pago a SENIAT':(clave==='edilso'?'Entrega a Edilso':'Salida de '+(f?f.nombre:clave))));
  var s=window.prompt(lbl+'.\nSaldo: '+_repMoney(saldo)+'\n¿Cuánto sale?'); if(s===null)return; var monto=_repNum(s); if(monto<=0)return; if(monto>saldo+0.001){showToast&&showToast('No puedes sacar más del saldo ('+_repMoney(saldo)+')');return;}
  var concepto=(window.prompt('Concepto (opcional):','')||'').trim(); var nuevo=_repR2(saldo-monto);
  supabaseClient.from('rep_fondos').update({saldo_actual:nuevo,actualizado_en:new Date().toISOString()}).eq('clave',clave).then(function(){ if(_repFondos[clave])_repFondos[clave].saldo_actual=nuevo; return supabaseClient.from('rep_movimientos').insert({tipo:'salida',fondo:clave,monto:monto,concepto:concepto||lbl,creado_por:_repUser(),fecha:_repHoy()}); }).then(function(){ if(typeof logAudit==='function')logAudit('reparto_salida',lbl+' '+_repMoney(monto)); _repRefrescar(); showToast&&showToast('Salida registrada ✓'); });
}

/* ---------- DEUDAS estilo tablero: marca al proveedor y el presupuesto se reparte solo ---------- */
function _repDVBudget(){ var p=_repPartidas().filter(function(x){return x.clave==='deuda_vieja';})[0]; return _repR2((p?_repNum(p.monto):0)*30); }
/* Reparte 'budget' entre los seleccionados SIN pasarse de la deuda de cada uno.
   Método BOLA DE NIEVE: paga completo a los más pequeños primero (salir de más cuentas
   cuanto antes), y lo que quede pasa al siguiente. Devuelve {cuotas:{id:monto}, sobrante, orden}. */
function _repDVReparto(sel, budget){
  var cuotas={}; sel.forEach(function(d){ cuotas[String(d.id)]=0; });
  var orden=sel.slice().sort(function(a,b){ return a._falta-b._falta; }); // más chicos primero
  var restante=_repR2(budget);
  for(var i=0;i<orden.length && restante>0.005;i++){
    var d=orden[i]; var asignar=_repR2(Math.min(d._falta, restante));
    cuotas[String(d.id)]=asignar; restante=_repR2(restante-asignar);
  }
  return {cuotas:cuotas, sobrante:Math.max(0,_repR2(restante)), orden:orden.map(function(d){return String(d.id);})};
}
function _repDeudasHTML(){
  var lista=_repProvList().map(function(d){ d._falta=Math.max(0,_repR2(_repNum(d.total)-_repNum(d.abonado))); return d; }).filter(function(d){ return d._falta>0.5; });
  lista.sort(function(a,b){ return b._falta-a._falta; });
  var _q=_repNorm(_repDeudaBuscar); var listaF=_q?lista.filter(function(d){return _repNorm(d.proveedor).indexOf(_q)>=0;}):lista;
  var sel=lista.filter(function(d){return _repNum(d.reparto_pct)>0;});
  var selFalta=sel.reduce(function(s,d){return s+d._falta;},0);
  var planTot=_repPlanTotal();
  var budget=_repDVBudget();
  var provSaldo=_repFondoSaldo('proveedores');
  var rep=_repDVReparto(sel, budget);            // reparto con tope por deuda
  var usado=_repR2(budget-rep.sobrante);          // lo que de verdad se reparte
  var acc=_repPuedeEditar()?'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button onclick="_repAbrirDeuda()" class="fchip" style="font-size:12.5px">＋ Deuda manual</button>'+(provSaldo>0.5&&sel.length?('<button onclick="_repRepartirFondo()" style="background:#16a34a;color:#fff;border:none;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">💸 Repartir el fondo ('+_repMoney(provSaldo)+') ahora</button>'):'')+'</div>':'';
  var head='<div class="tbox" style="padding:11px 13px;margin-bottom:10px;border-left:4px solid #f59e0b;background:var(--surface)"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px"><div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Deuda vieja total (del Plan)</div><div style="font-size:20px;font-weight:800;color:#1d4ed8">'+_repMoney(planTot)+'</div><div style="font-size:10.5px;color:var(--muted)">'+lista.length+' acreedores'+(typeof showTab==='function'?' · <a href="javascript:showTab(\'cxp-prov\')" style="color:#1d4ed8">abrir Plan →</a>':'')+'</div></div>'+
    '<div style="text-align:right"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Presupuesto 📜 deuda vieja</div><div style="font-size:20px;font-weight:800;color:#f59e0b">'+_repMoney(budget)+'/mes</div><div style="font-size:10.5px;color:var(--muted)">partida × 30 · fondo acumulado '+_repMoney(provSaldo)+'</div></div></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:6px">✅ Marca a quién le pagas. Paga <b>completo a los más chicos primero</b> (salir de más cuentas), nunca más de lo que debes; lo que sobre queda libre.</div>'+
    (sel.length&&rep.sobrante>0.5?('<div style="font-size:12px;font-weight:700;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 10px;margin-top:8px">💰 Con lo marcado te <b>sobran '+_repMoney(rep.sobrante)+'/mes</b> del presupuesto — cubres a los '+sel.length+' marcados completos y aún puedes marcar a más.</div>'):'')+
    (sel.length&&rep.sobrante<=0.5?('<div style="font-size:12px;font-weight:700;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin-top:8px">⚡ El presupuesto se reparte completo entre los marcados. Para pagarlos más rápido, sube la partida 📜 en Ajustes o marca menos.</div>'):'')+'</div>';
  var buscador='<input type="text" id="rep-deuda-buscar" value="'+esc(_repDeudaBuscar)+'" oninput="_repDeudaBuscarSet(this.value)" placeholder="🔍 Buscar proveedor…" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px;margin-bottom:10px">';
  var rows=listaF.map(function(d){
    var on=_repNum(d.reparto_pct)>0;
    var cuota=on?_repNum(rep.cuotas[String(d.id)]):0;
    var enCola=(on&&cuota<0.5);                               // marcado pero este mes no le toca (bola de nieve)
    var pctUsado=(on&&usado>0)?cuota/usado*100:0;
    var meses=(on&&cuota>0)?Math.ceil(d._falta/cuota):0;
    var tope=(on&&cuota>0.5&&Math.abs(cuota-d._falta)<0.5);   // le paga justo su deuda → sale este mes
    var idA=_repArg(String(d.id));
    var badge=d.fromPlan?'':' <span style="font-size:9px;color:#7c3aed;background:#ede9fe;padding:1px 6px;border-radius:999px">manual</span>';
    return '<tr style="'+(on?(enCola?'background:#fffbeb':'background:#f0fdf422'):'opacity:.6')+';border-top:1px solid var(--border)">'+
      '<td style="padding:6px 6px;text-align:center">'+(_repPuedeEditar()?('<input type="checkbox" '+(on?'checked':'')+' onchange="_repProvToggleSel('+idA+')" style="width:16px;height:16px;cursor:pointer">'):(on?'✓':''))+'</td>'+
      '<td style="padding:6px 6px;font-size:12.5px;font-weight:700;min-width:0">'+esc(d.proveedor)+badge+(enCola?' <span style="font-size:9px;color:#b45309;background:#fef3c7;padding:1px 6px;border-radius:999px">en cola</span>':'')+'</td>'+
      '<td style="padding:6px 6px;text-align:right;font-size:12.5px;font-weight:700;color:#b45309;white-space:nowrap">'+_repMoney(d._falta)+'</td>'+
      '<td style="padding:6px 6px;text-align:right;font-size:12px;color:var(--muted)">'+(on&&!enCola?pctUsado.toFixed(1)+'%':'—')+'</td>'+
      '<td style="padding:6px 6px;text-align:right;font-size:12.5px;font-weight:800;white-space:nowrap;color:'+(tope?'#16a34a':(enCola?'var(--muted)':'var(--text)'))+'">'+(on?(enCola?'en cola':_repMoney(cuota)):'—')+'</td>'+
      '<td style="padding:6px 6px;text-align:right;font-size:12px;color:var(--muted)">'+(on&&meses?(tope?'✓ este mes':meses+' m'):'—')+'</td>'+
      '<td style="padding:6px 6px;text-align:right;white-space:nowrap">'+(_repPuedeEditar()?('<button onclick="_repAbonar('+idA+')" class="fchip" style="font-size:10.5px;padding:3px 8px">💵</button> <button onclick="_repAbrirDeuda('+idA+')" class="fchip" style="font-size:10.5px;padding:3px 8px">✎</button>'):'')+'</td></tr>';
  }).join('');
  var totMeses=(usado>0&&selFalta>0)?Math.ceil(selFalta/usado):0;
  var totRow='<tr style="background:var(--surface2);font-weight:800"><td></td><td style="padding:7px 6px;font-size:12px">SELECCIONADOS ('+sel.length+')</td><td style="padding:7px 6px;text-align:right;font-size:12.5px">'+_repMoney(selFalta)+'</td><td style="padding:7px 6px;text-align:right;font-size:12px">'+(sel.length?'100%':'—')+'</td><td style="padding:7px 6px;text-align:right;font-size:12.5px">'+_repMoney(usado)+(rep.sobrante>0.5?(' <span style="font-size:9px;color:#16a34a;font-weight:600">+'+_repMoney(rep.sobrante)+' libre</span>'):'')+'</td><td style="padding:7px 6px;text-align:right;font-size:12px">'+(totMeses?totMeses+' m':'—')+'</td><td></td></tr>';
  var tabla='<div class="tbox" style="padding:0;overflow:auto;max-height:60vh"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--surface2);font-size:10px;text-transform:uppercase;color:var(--muted)"><th style="padding:6px 6px;width:34px">Pagar</th><th style="padding:6px 6px;text-align:left">Proveedor</th><th style="padding:6px 6px;text-align:right">Debe</th><th style="padding:6px 6px;text-align:right">%</th><th style="padding:6px 6px;text-align:right">Cuota/mes</th><th style="padding:6px 6px;text-align:right">Sale en</th><th style="padding:6px 6px"></th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" style="padding:16px;text-align:center;color:var(--muted)">Sin resultados.</td></tr>')+totRow+'</tbody></table></div>';
  return acc+head+buscador+tabla;
}
/* Marca/desmarca un proveedor: recalcula TODOS los % proporcional a la deuda de los marcados */
function _repProvToggleSel(id){
  if(!_repPuedeEditar())return;
  var lista=_repProvList().map(function(d){ d._falta=Math.max(0,_repR2(_repNum(d.total)-_repNum(d.abonado))); return d; }).filter(function(d){ return d._falta>0.5; });
  var t=lista.filter(function(d){return String(d.id)===String(id);})[0]; if(!t)return;
  var turnOn=!(_repNum(t.reparto_pct)>0);
  var selNew=lista.filter(function(d){ var on=_repNum(d.reparto_pct)>0; if(String(d.id)===String(id))on=turnOn; return on; });
  var sumF=selNew.reduce(function(s,d){return s+d._falta;},0);
  var cambios=[];
  lista.forEach(function(d){ var enSel=selNew.some(function(x){return String(x.id)===String(d.id);});
    var np=enSel&&sumF>0?_repR2(d._falta/sumF*100):0;
    if(Math.abs(np-_repNum(d.reparto_pct))>0.01||String(d.id)===String(id))cambios.push({item:d,pct:np});
  });
  var chain=Promise.resolve();
  cambios.forEach(function(c){
    chain=chain.then(function(){ return _repEnsureSetting(c.item).then(function(rid){ if(!rid)return null;
      var loc=_repDeudas.filter(function(x){return String(x.id)===String(rid);})[0]; if(loc)loc.reparto_pct=c.pct;
      return supabaseClient.from('rep_deudas').update({reparto_pct:c.pct,actualizado_en:new Date().toISOString()}).eq('id',rid); }); });
  });
  chain.then(function(){ if(typeof logAudit==='function')logAudit('reparto_sel_prov',(turnOn?'Marcó ':'Desmarcó ')+t.proveedor); _repRender(); showToast&&showToast((turnOn?'✓ ':'')+t.proveedor+(turnOn?' entra al reparto':' fuera del reparto')); }).catch(function(err){ showToast&&showToast('Error: '+(err&&err.message||err)); });
}
/* Plan de pago a proveedores según el promedio diario */
function _repProvPlan(){
  var prom=_repNum(_repCfg.promedio_venta_diaria);
  var provDaily=0;
  if(prom>0){ try{ var pv=_repCalcCore(0,prom,0,_repCfg,_repImpuestos,_repMetas,_repProvList(),_repHoy()); provDaily=pv.proveedores; }catch(e){} }
  var act=_repProvList().filter(function(d){return _repNum(d.reparto_pct)>0;});
  var sumPct=act.reduce(function(s,d){return s+_repNum(d.reparto_pct);},0);
  return act.map(function(d){
    var falta=Math.max(0,_repR2(_repNum(d.total)-_repNum(d.abonado)));
    var share=(sumPct>0)?(_repNum(d.reparto_pct)/sumPct):(act.length?1/act.length:0);
    var daily=_repR2(provDaily*share);
    var monthly=_repR2(daily*30);
    var dias=(daily>0&&falta>0)?Math.ceil(falta/daily):(falta<=0?0:0);
    var fecha=(daily>0&&falta>0)?_repFechaMas(dias):null;
    var cuotas=_repNum(d.cuotas_desea);
    var cuotaMonto=(cuotas>0)?_repR2(falta/cuotas):0;
    var cuotasReal=(monthly>0&&falta>0)?Math.max(1,Math.ceil(falta/monthly)):null;
    var realista=(cuotas>0&&monthly>0&&cuotaMonto<=monthly+0.01);
    return {id:d.id,proveedor:d.proveedor,falta:falta,pct:_repNum(d.reparto_pct),share:share,daily:daily,monthly:monthly,dias:dias,fecha:fecha,cuotas:cuotas,cuotaMonto:cuotaMonto,cuotasReal:cuotasReal,realista:realista,pagado:(falta<=0)};
  });
}
/* Picker: elegir proveedor del Plan para asignarle % del fondo */
function _repAbrirAgregarProv(){ if(!_repPuedeEditar())return; _repTmp={modo:'pickprov',q:''}; _repHost().innerHTML=_repPickProvHTML(); }
function _repPickProvHTML(){ var q=_repNorm(_repTmp&&_repTmp.q);
  var yaAsig={}; (_repProvList()||[]).forEach(function(d){ if(_repNum(d.reparto_pct)>0)yaAsig[d._norm]=true; });
  var items=_repPlanDeudas().filter(function(p){ return p.restante>0.5 && !yaAsig[p.norm] && (!q||p.norm.indexOf(q)>=0); }).sort(function(a,b){return b.restante-a.restante;});
  var rows=items.slice(0,80).map(function(p){ return '<button onclick="_repElegirProv('+_repArg(p.norm)+')" style="display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;border:1px solid var(--border);background:var(--surface);border-radius:9px;padding:9px 11px;margin-bottom:6px;cursor:pointer;gap:8px"><span style="font-weight:600;font-size:13px">'+esc(p.proveedor)+'</span><span style="font-weight:800;color:#b45309;font-size:13px;white-space:nowrap">'+_repMoney(p.restante)+'</span></button>'; }).join('')||'<div style="padding:16px;text-align:center;color:var(--muted)">No hay más proveedores con deuda en el Plan.</div>';
  return _repWrap(_repHdr('Agregar proveedor del Plan')+
    '<div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">Elige un proveedor con deuda viva en el Plan. Le pondrás qué % del fondo Proveedores se le reparte.</div>'+
    '<input type="text" placeholder="Buscar proveedor…" value="'+esc((_repTmp&&_repTmp.q)||'')+'" oninput="if(_repTmp)_repTmp.q=this.value;_repRePick()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-bottom:10px">'+
    '<div style="max-height:52vh;overflow:auto">'+rows+'</div>',480);
}
function _repRePick(){ var h=document.getElementById('rep-modal-host'); if(h)h.innerHTML=_repPickProvHTML(); }
function _repElegirProv(norm){ var p=_repPlanDeudas().filter(function(x){return x.norm===norm;})[0]; if(!p)return; var ex=_repProvGet('plan:'+norm)||_repProvSettings()[norm];
  _repTmp={modo:'deuda',id:(ex&&ex.id)||('plan:'+norm),fromPlan:true,_norm:norm,proveedor:p.proveedor,total:p.total,abonado:p.abonado,restante:_repR2(p.restante),reparto_pct:(ex?_repNum(ex.reparto_pct):0)||'',cuotas_desea:(ex?_repNum(ex.cuotas_desea):0)||''}; _repHost().innerHTML=_repDeudaHTML(); }

function _repAbrirDeuda(id){ if(!_repPuedeEditar())return; var d=id?_repProvGet(id):null;
  if(d){ _repTmp={modo:'deuda',id:d.id,fromPlan:!!d.fromPlan,_norm:d._norm,proveedor:d.proveedor,total:_repNum(d.total),abonado:_repNum(d.abonado),restante:_repR2(_repNum(d.total)-_repNum(d.abonado)),reparto_pct:_repNum(d.reparto_pct)||'',cuotas_desea:_repNum(d.cuotas_desea)||''}; }
  else { _repTmp={modo:'deuda',id:null,fromPlan:false,proveedor:'',total:'',abonado:0,restante:0,reparto_pct:'',cuotas_desea:''}; }
  _repHost().innerHTML=_repDeudaHTML();
}
function _repDeudaHTML(){ var t=_repTmp; var inS='width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px';
  var cab;
  if(t.fromPlan){ cab='<div style="font-size:15px;font-weight:800">'+esc(t.proveedor||'')+' <span style="font-size:9px;color:#1d4ed8;background:#dbeafe;padding:1px 7px;border-radius:999px">del Plan</span></div>'+
    '<div class="tbox" style="padding:9px 11px;margin-top:8px;background:#eff6ff;border:0"><div style="font-size:11px;color:var(--muted)">Deuda viva (del Plan, se actualiza sola)</div><div style="font-size:18px;font-weight:800;color:#b45309">'+_repMoney(t.restante)+'</div><div style="font-size:10.5px;color:var(--muted)">deuda '+_repMoney(t.total)+' · abonado '+_repMoney(t.abonado)+'</div></div>'; }
  else { cab='<label style="display:block"><span style="font-size:12px;color:var(--muted)">Proveedor</span><input type="text" value="'+esc(t.proveedor||'')+'" oninput="_repTmpSet(\'proveedor\',this.value)" style="'+inS+'"></label>'+
    '<div style="display:flex;gap:8px"><label style="display:block;margin-top:8px;flex:1"><span style="font-size:12px;color:var(--muted)">Deuda total ($)</span><input type="number" inputmode="decimal" value="'+esc(String(t.total))+'" oninput="_repTmpSet(\'total\',this.value)" style="'+inS+'"></label>'+
    '<label style="display:block;margin-top:8px;flex:1"><span style="font-size:12px;color:var(--muted)">Abonado ($)</span><input type="number" inputmode="decimal" value="'+esc(String(t.abonado))+'" oninput="_repTmpSet(\'abonado\',this.value)" style="'+inS+'"></label></div>'; }
  return _repWrap(_repHdr(t.id?'Editar reparto a proveedor':'Agregar deuda manual')+cab+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">¿En cuántas cuotas quieres pagarla? (opcional)</span><input type="number" inputmode="decimal" value="'+esc(String(t.cuotas_desea))+'" oninput="_repTmpSet(\'cuotas_desea\',this.value)" placeholder="ej. 4" style="'+inS+'"><span style="font-size:10.5px;color:var(--muted)">La app te dice si es realista según lo que ahorras al mes.</span></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">% del fondo Proveedores para este (auto-cuadra a 100)</span><input type="number" inputmode="decimal" value="'+esc(String(t.reparto_pct))+'" oninput="_repTmpSet(\'reparto_pct\',this.value)" style="'+inS+'"></label>'+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'+(t.id?'<button onclick="_repBorrarDeuda('+_repArg(String(t.id))+')" class="fchip" style="font-size:13px;color:#dc2626">Quitar del reparto</button>':'')+'<button onclick="_repCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_repGuardarDeuda()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button></div>',440);
}
function _repGuardarDeuda(){ var t=_repTmp; if(!t||!_repPuedeEditar())return; var nuevoPct=_repNum(t.reparto_pct);
  if(t.fromPlan){
    var item={id:t.id,fromPlan:true,proveedor:t.proveedor,reparto_pct:nuevoPct,cuotas_desea:t.cuotas_desea};
    _repEnsureSetting(item).then(function(rid){ if(!rid){showToast&&showToast('No se pudo guardar');return;}
      var row={reparto_pct:nuevoPct,cuotas_desea:Math.round(_repNum(t.cuotas_desea))||0,actualizado_en:new Date().toISOString()};
      return supabaseClient.from('rep_deudas').update(row).eq('id',rid).then(function(){ var loc=_repDeudas.filter(function(x){return String(x.id)===String(rid);})[0]; if(loc){loc.reparto_pct=nuevoPct;loc.cuotas_desea=row.cuotas_desea;} return _repRebalancePct(rid,nuevoPct); });
    }).then(function(){ _repCerrar(); _repRefrescar(); showToast&&showToast('Guardado ✓'); }).catch(function(err){ showToast&&showToast('Error: '+(err&&err.message||err)); });
    return;
  }
  if(!(t.proveedor||'').trim()){showToast&&showToast('Nombre del proveedor');return;}
  var mrow={proveedor:t.proveedor.trim(),total:_repNum(t.total),abonado:_repNum(t.abonado),reparto_pct:nuevoPct,cuotas_desea:Math.round(_repNum(t.cuotas_desea))||0,actualizado_en:new Date().toISOString()};
  var q=(t.id&&String(t.id).indexOf('plan:')!==0)?supabaseClient.from('rep_deudas').update(mrow).eq('id',t.id).select('*'):supabaseClient.from('rep_deudas').insert(Object.assign({creado_por:_repUser()},mrow)).select('*');
  q.then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;}
    _repRebalancePct(t.id&&String(t.id).indexOf('plan:')!==0?t.id:(res.data&&res.data[0]&&res.data[0].id), nuevoPct).then(function(){ _repCerrar(); _repRefrescar(); showToast&&showToast('Deuda guardada ✓'); });
  });
}
function _repRebalancePct(fijoId, fijoPct){
  var otras=_repDeudas.filter(function(d){return d.activo!==false && String(d.id)!==String(fijoId) && _repNum(d.reparto_pct)>0;});
  if(!otras.length)return Promise.resolve();
  var resto=Math.max(0,100-_repNum(fijoPct));
  var sumOtras=otras.reduce(function(s,d){return s+_repNum(d.reparto_pct);},0);
  var ups=otras.map(function(d,i){ var np; if(sumOtras>0)np=_repR2(resto*_repNum(d.reparto_pct)/sumOtras); else np=_repR2(resto/otras.length); d.reparto_pct=np; return supabaseClient.from('rep_deudas').update({reparto_pct:np,actualizado_en:new Date().toISOString()}).eq('id',d.id); });
  return Promise.all(ups);
}
function _repBorrarDeuda(id){ if(!_repPuedeEditar())return; if(String(id).indexOf('plan:')===0){ _repCerrar(); _repRefrescar(); return; }
  supabaseClient.from('rep_deudas').update({activo:false}).eq('id',id).then(function(){ _repCerrar(); _repRefrescar(); showToast&&showToast('Quitado del reparto'); }); }
function _repAbonar(id){ if(!_repPuedeEditar())return; var d=_repProvGet(id); if(!d)return; var falta=Math.max(0,_repNum(d.total)-_repNum(d.abonado)); var saldo=_repFondoSaldo('proveedores');
  var s=window.prompt('Abonar a '+d.proveedor+'.\nFalta: '+_repMoney(falta)+' · Fondo Proveedores: '+_repMoney(saldo)+'\n¿Cuánto abonas?'); if(s===null)return; var monto=_repNum(s); if(monto<=0)return; if(monto>saldo+0.001){showToast&&showToast('El fondo Proveedores solo tiene '+_repMoney(saldo));return;}
  var nuevoFondo=_repR2(saldo-monto);
  var pAb;
  if(d.fromPlan){ _repAbonoAlPlan(d,monto); pAb=Promise.resolve(); }
  else { var nuevoAb=_repR2(_repNum(d.abonado)+monto); pAb=supabaseClient.from('rep_deudas').update({abonado:nuevoAb,actualizado_en:new Date().toISOString()}).eq('id',d.id); }
  Promise.resolve(pAb).then(function(){ return supabaseClient.from('rep_fondos').update({saldo_actual:nuevoFondo,actualizado_en:new Date().toISOString()}).eq('clave','proveedores'); }).then(function(){ if(_repFondos.proveedores)_repFondos.proveedores.saldo_actual=nuevoFondo; return supabaseClient.from('rep_movimientos').insert({tipo:'salida',fondo:'proveedores',monto:monto,concepto:'Abono a '+d.proveedor+(d.fromPlan?' (Plan)':''),creado_por:_repUser(),fecha:_repHoy()}); }).then(function(){ if(typeof logAudit==='function')logAudit('reparto_abono','Abonó '+_repMoney(monto)+' a '+d.proveedor); _repRefrescar(); showToast&&showToast('Abono registrado ✓'+(d.fromPlan?' · marcado en el Plan':'')); }).catch(function(err){ showToast&&showToast('Error: '+(err&&err.message||err)); });
}
function _repRepartirFondo(){ if(!_repPuedeEditar())return; var saldo=_repFondoSaldo('proveedores'); var act=_repProvList().filter(function(d){return _repNum(d.reparto_pct)>0;}); var plan=_repDistProv(saldo,act); if(!plan.length){showToast&&showToast('Define los % de reparto primero');return;} if(!window.confirm('Repartir '+_repMoney(saldo)+' entre '+plan.length+' proveedores según sus %? Los del Plan quedan abonados en el Plan.'))return;
  var ups=[]; plan.forEach(function(x){ var d=act.filter(function(y){return String(y.id)===String(x.id);})[0]; if(!d||x.monto<=0)return;
    if(d.fromPlan){ _repAbonoAlPlan(d,x.monto); }
    else { var nuevoAb=_repR2(_repNum(d.abonado)+x.monto); ups.push(supabaseClient.from('rep_deudas').update({abonado:nuevoAb,actualizado_en:new Date().toISOString()}).eq('id',d.id)); }
    ups.push(supabaseClient.from('rep_movimientos').insert({tipo:'salida',fondo:'proveedores',monto:x.monto,concepto:'Reparto a '+d.proveedor,creado_por:_repUser(),fecha:_repHoy()}));
  });
  ups.push(supabaseClient.from('rep_fondos').update({saldo_actual:0,actualizado_en:new Date().toISOString()}).eq('clave','proveedores'));
  Promise.all(ups).then(function(){ if(_repFondos.proveedores)_repFondos.proveedores.saldo_actual=0; if(typeof logAudit==='function')logAudit('reparto_repartir_fondo','Repartió fondo proveedores '+_repMoney(saldo)); _repRefrescar(); showToast&&showToast('Fondo repartido ✓'); }).catch(function(err){ showToast&&showToast('Error: '+(err&&err.message||err)); });
}

/* ---------- HISTORIAL (días) editable ---------- */
function _repDiasHTML(){
  var hoy=_repHoy(); var semIni=_repFechaMas(-7), mesIni=hoy.slice(0,8)+'01';
  var vSem=0,vMes=0; _repDias.forEach(function(d){ var f=String(d.fecha).slice(0,10); if(f>=semIni)vSem+=_repNum(d.venta_total); if(f>=mesIni)vMes+=_repNum(d.venta_total); });
  var kpi='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="tbox" style="padding:11px 13px;flex:1;min-width:130px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Venta 7 días</div><div style="font-size:22px;font-weight:800">'+_repMoney(vSem)+'</div></div><div class="tbox" style="padding:11px 13px;flex:1;min-width:130px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Venta del mes</div><div style="font-size:22px;font-weight:800">'+_repMoney(vMes)+'</div></div></div>';
  if(!_repDias.length)return kpi+'<div style="padding:20px;text-align:center;color:var(--muted)">Aún no has registrado días.</div>';
  var meses={}; _repDias.forEach(function(d){ meses[String(d.fecha).slice(0,7)]=1; });
  var mesKeys=Object.keys(meses).sort().reverse();
  var MES3=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var mLbl=function(ym){ return MES3[parseInt(ym.slice(5,7))-1]+" '"+ym.slice(2,4); };
  var filtro=(mesKeys.length>1)?('<div style="margin-bottom:10px"><span style="font-size:11px;color:var(--muted);margin-right:6px">Mes:</span><select onchange="_repHistMesSet(this.value)" style="padding:7px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px"><option value=""'+(_repHistMes===''?' selected':'')+'>Todos</option>'+mesKeys.map(function(ym){ return '<option value="'+ym+'"'+(_repHistMes===ym?' selected':'')+'>'+mLbl(ym)+'</option>'; }).join('')+'</select></div>'):'';
  var diasF=_repHistMes?_repDias.filter(function(d){return String(d.fecha).slice(0,7)===_repHistMes;}):_repDias;
  var rows=diasF.map(function(d){ return '<div class="tbox" style="padding:10px 12px;margin-bottom:6px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><div style="font-size:13px;font-weight:700">'+_repFmtFecha(d.fecha)+' · '+_repMoney(d.venta_total)+'</div><div style="font-size:10.5px;color:var(--muted)">Edilso '+_repMoney(d.edilso)+' · José '+_repMoney(d.jefe)+' · Nani '+_repMoney(d.nani||0)+' · Banco '+_repMoney(d.banco_reservado)+' · Prov '+_repMoney(d.proveedores)+' · Gastos '+_repMoney(d.gastos)+' · Impuestos '+_repMoney(d.impuestos_total||d.seniat)+'</div></div>'+(_repPuedeEditar()?('<button onclick="_repBorrarDia('+d.id+')" class="fchip" style="font-size:11px;color:#dc2626;white-space:nowrap">Deshacer</button>'):'')+'</div></div>'; }).join('')||'<div style="padding:16px;text-align:center;color:var(--muted)">Sin días en ese mes.</div>';
  return kpi+filtro+'<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Días registrados'+(_repHistMes?(' · '+mLbl(_repHistMes)):'')+' (deshacer revierte fondos y metas)</div>'+rows;
}
function _repBorrarDia(id){ if(!_repPuedeEditar())return; var d=_repDias.filter(function(x){return String(x.id)===String(id);})[0]; if(!d)return;
  if(!window.confirm('¿Deshacer el reparto del '+_repFmtFecha(d.fecha)+' ('+_repMoney(d.venta_total)+')? Se revierten los fondos y metas.'))return;
  var ups=[];
  var detP=(d.detalle&&d.detalle.partidas)||null;
  if(detP&&detP.length){ detP.forEach(function(x){ if(x.meta_id)return; var monto=_repR2(_repNum(x.monto)-_repNum(x.bs)); if(monto>0)ups.push(_repFondoAdd(x.fondo||x.clave,-monto)); }); }
  else { ups.push(_repFondoAdd('edilso',-_repNum(d.edilso))); ups.push(_repFondoAdd('proveedores',-_repNum(d.proveedores))); ups.push(_repFondoAdd('gastos',-_repNum(d.gastos))); }
  var det=(d.detalle&&d.detalle.metas)||[];
  det.forEach(function(x){ var m=_repMetas.filter(function(y){return String(y.id)===String(x.id);})[0]; if(m){ var nv=_repR2(_repNum(m.reunido)-_repNum(x.apartado)); m.reunido=nv; ups.push(supabaseClient.from('rep_metas').update({reunido:nv,actualizado_en:new Date().toISOString()}).eq('id',x.id)); } });
  var detI=(d.impuestos_detalle&&d.impuestos_detalle.imp)||[];
  detI.forEach(function(x){ var t=_repImpuestos.filter(function(y){return String(y.id)===String(x.id);})[0]; if(t){ var nv=_repR2(_repNum(t.reunido)-_repNum(x.monto)); t.reunido=nv; ups.push(supabaseClient.from('rep_impuestos').update({reunido:nv,actualizado_en:new Date().toISOString()}).eq('id',x.id)); } });
  ups.push(supabaseClient.from('rep_movimientos').delete().eq('fecha',d.fecha).eq('venta_ref',d.venta_total));
  ups.push(supabaseClient.from('rep_dias').delete().eq('id',id));
  Promise.all(ups).then(function(){ if(typeof logAudit==='function')logAudit('reparto_deshacer','Deshizo día '+d.fecha); _repRefrescar(); showToast&&showToast('Día deshecho ✓'); }).catch(function(err){ showToast&&showToast('Error: '+(err&&err.message||err)); });
}

/* ---------- CONFIG ---------- */
function _repConfigHTML(){
  if(!_repPuedeEditar())return '<div style="padding:20px;text-align:center;color:var(--muted)">Solo lectura.</div>';
  var c=_repCfg, defs=_repPartidas(), est=_repEstrategia();
  var inS='width:86px;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:14px;text-align:right;font-weight:700';
  var inDia='width:72px;box-sizing:border-box;padding:7px 6px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;text-align:right;font-weight:700';
  var inPct='width:52px;box-sizing:border-box;padding:7px 5px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);font-size:12.5px;text-align:right;font-weight:700';
  var venta0=_repNum(c.promedio_venta_diaria)||3000;
  var idT2='width:66px;box-sizing:border-box;padding:6px 5px;border:1px solid var(--border);border-radius:7px;background:var(--bg);color:var(--text);font-size:12.5px;text-align:right;font-weight:700';
  var idP2='width:48px;box-sizing:border-box;padding:6px 4px;border:1px solid var(--border);border-radius:7px;background:var(--surface2);color:var(--text);font-size:12px;text-align:right;font-weight:700';
  var crece={fallas:1,banco_mercantil:1,banco_provincial:1,deuda_vieja:1}; // partidas que SÍ pueden crecer con el sobrante
  // 1 · partidas ancladas — TABLA estilo Excel (día · % · semana · mes)
  var pRows=defs.map(function(p){ var m=_repMetaDePartida(p,_repMetas); var d=_repNum(p.monto); var pc=venta0>0?(d/venta0*100):0;
    var tag=(p.directo?' <span style="font-size:8.5px;color:#fff;background:#6366f1;padding:0 5px;border-radius:999px">banco</span>':'')+(m?' <span style="font-size:8.5px;color:#fff;background:#0891b2;padding:0 5px;border-radius:999px">meta</span>':'')+(crece[p.clave]?' <span style="font-size:8.5px;color:#166534;background:#dcfce7;padding:0 5px;border-radius:999px">crece</span>':'');
    return '<tr style="border-top:1px solid var(--border)">'+
      '<td style="padding:6px 6px"><div style="font-size:12px;font-weight:600">'+p.emoji+' '+esc(p.nombre)+tag+'</div>'+(p.desc?'<div style="font-size:9.5px;color:var(--muted);white-space:normal;line-height:1.3">'+esc(p.desc)+'</div>':'')+'</td>'+
      '<td style="padding:4px 4px;text-align:right;white-space:nowrap"><input type="number" inputmode="decimal" id="reppart-'+p.clave+'" value="'+esc(String(d))+'" oninput="_repPartDia('+_repArg(p.clave)+')" style="'+idT2+'"></td>'+
      '<td style="padding:4px 4px;text-align:right;white-space:nowrap"><input type="number" inputmode="decimal" id="reppct-'+p.clave+'" value="'+pc.toFixed(1)+'" oninput="_repPartPct('+_repArg(p.clave)+')" style="'+idP2+'"></td>'+
      '<td style="padding:6px 6px;text-align:right;font-variant-numeric:tabular-nums;color:var(--muted)" id="repwk-'+p.clave+'">'+_repMoney(d*7)+'</td>'+
      '<td style="padding:6px 6px;text-align:right;font-variant-numeric:tabular-nums;font-weight:700" id="repmo-'+p.clave+'">'+_repMoney(d*30)+'</td>'+
      '<td style="padding:4px 4px;text-align:center"><button onclick="_repPartidaQuitar('+_repArg(p.clave)+')" title="Quitar" style="border:none;background:none;color:var(--muted);font-size:13px;cursor:pointer">✕</button></td></tr>';
  }).join('');
  var anclado0=_repAncladoTotal(defs), imp0=_repR2(venta0*_repImpPctTotal()/100), extra0=_repR2(venta0-imp0-anclado0);
  var totAncl=anclado0;
  // 2 · estrategia del extra
  var fases=_repFases();
  var fBtns=fases.map(function(f){ var on=(_repNum(est.fase)===f.n);
    return '<div onclick="_repSetFase('+f.n+')" style="flex:1;min-width:170px;border:2px solid '+(on?'#16a34a':'var(--border)')+';border-radius:11px;padding:10px 12px;cursor:pointer'+(on?';background:#f0fdf422':'')+'"><div style="font-size:12.5px;font-weight:800;color:'+(on?'#16a34a':'var(--text)')+'">'+(on?'✓ ':'')+esc(f.nombre)+'</div><div style="font-size:10.5px;color:var(--muted);margin-top:2px">'+esc(f.desc)+'</div></div>';
  }).join('');
  var baseLbl={total:'venta total',con_iva:'con IVA',usd:'ventas $',manual:'manual'};
  var impRows=_repImpuestos.filter(function(t){return t.activo!==false;}).map(function(t){ return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)"><div style="flex:1"><div style="font-size:12.5px;font-weight:600">'+esc(t.nombre)+'</div><div style="font-size:10.5px;color:var(--muted)">'+_repNum(t.rate)+'% sobre '+(baseLbl[t.base]||t.base)+(t.diario===false?' · mensual (no diario)':' · diario')+'</div></div><button onclick="_repAbrirImp('+t.id+')" class="fchip" style="font-size:11px">✎</button></div>'; }).join('');
  return '<div style="font-size:11.5px;color:var(--muted);margin-bottom:10px">Modelo de <b>montos anclados</b> (el Excel de Miguel y Mayra): cada día se apartan primero los impuestos, luego cada partida por orden, y <b>todo lo que sobra (el extra) va a matar deuda</b> según la fase.</div>'+
    '<div class="tbox" style="padding:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px"><div style="font-size:13px;font-weight:700">1 · Partidas ancladas del día</div>'+
    '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)">Venta promedio/día <input type="number" inputmode="decimal" id="reppart-venta" value="'+esc(String(venta0))+'" oninput="_repPartLive()" style="'+idT2+';width:88px"></label></div>'+
    '<div style="font-size:10.5px;color:var(--muted);margin-bottom:6px">Edita el <b>$/día</b> o el <b>%</b> — el otro se ajusta solo. Las de etiqueta <span style="font-size:8.5px;color:#166534;background:#dcfce7;padding:0 5px;border-radius:999px">crece</span> pueden recibir el sobrante (abajo).</div>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--surface2);font-size:9.5px;text-transform:uppercase;color:var(--muted)"><th style="padding:6px 6px;text-align:left">Partida</th><th style="padding:6px 4px;text-align:right">$/día</th><th style="padding:6px 4px;text-align:right">%</th><th style="padding:6px 6px;text-align:right">$/semana</th><th style="padding:6px 6px;text-align:right">$/mes</th><th style="width:26px"></th></tr></thead>'+
    '<tbody>'+pRows+'</tbody>'+
    '<tfoot>'+
      '<tr style="background:var(--surface2);border-top:2px solid var(--border);font-weight:800"><td style="padding:8px 6px">🔒 TOTAL ANCLADO</td><td style="padding:8px 4px;text-align:right" id="rept-dia">'+_repMoney(anclado0)+'</td><td></td><td style="padding:8px 6px;text-align:right" id="rept-wk">'+_repMoney(anclado0*7)+'</td><td style="padding:8px 6px;text-align:right" id="rept-mo">'+_repMoney(anclado0*30)+'</td><td></td></tr>'+
      '<tr style="background:#f0fdf4;font-weight:800;color:#166534"><td style="padding:8px 6px">💵 DISPONIBLE p/ repartir</td><td style="padding:8px 4px;text-align:right" id="repd-dia">'+_repMoney(Math.max(0,extra0))+'</td><td></td><td style="padding:8px 6px;text-align:right" id="repd-wk">'+_repMoney(Math.max(0,extra0)*7)+'</td><td style="padding:8px 6px;text-align:right" id="repd-mo">'+_repMoney(Math.max(0,extra0)*30)+'</td><td></td></tr>'+
    '</tfoot></table></div>'+
    '<div id="repd-aviso" style="font-size:11px;color:var(--muted);margin-top:6px">'+(extra0<-0.5?('<span style="color:#dc2626">⚠ Anclas '+_repMoney(-extra0)+'/día más de lo que entra.</span>'):('Disponible = venta − impuestos ('+_repMoney(imp0)+'/día) − anclado. Ese sobrante lo repartes abajo 👇'))+'</div>'+
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px"><button onclick="_repPartidaAdd()" class="fchip" style="font-size:12.5px">＋ Nueva partida</button><button onclick="_repGuardarPartidas()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer">Guardar partidas</button></div></div>'+
    _repExtraSectionHTML()+
    '<div class="tbox" style="padding:14px;margin-top:12px"><div style="font-size:13px;font-weight:700;margin-bottom:2px">3 · Pagos diarios en Bs <span style="font-size:10px;color:var(--muted);font-weight:400">(salen del bolsillo de 🤝 socios, antes de comprar dólares — deben sumar el monto de esa partida)</span></div>'+
    '<label style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)"><span style="font-size:13px">José / jefe ($ al día, en Bs)</span><span style="display:flex;align-items:center;gap:4px"><input type="number" inputmode="decimal" id="repcfg-jefe_fijo_diario" value="'+esc(String(_repNum(c.jefe_fijo_diario)))+'" style="'+inS+'"><span style="font-size:12px;color:var(--muted)">$</span></span></label>'+
    '<label style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)"><span style="font-size:13px">Nani ($ al día, en Bs)</span><span style="display:flex;align-items:center;gap:4px"><input type="number" inputmode="decimal" id="repcfg-nani_fijo_diario" value="'+esc(String(_repNum(c.nani_fijo_diario)))+'" style="'+inS+'"><span style="font-size:12px;color:var(--muted)">$</span></span></label>'+
    '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button onclick="_repGuardarConfig()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button></div></div>'+
    '<div class="tbox" style="padding:14px;margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:13px;font-weight:700">Impuestos (se apartan a diario del tope)</div><button onclick="_repAbrirImp()" class="fchip" style="font-size:11.5px">＋ Impuesto</button></div><div style="font-size:11px;color:var(--muted);margin-bottom:6px">ISLR y municipal 1% del total, IVA 16% de lo gravable, IGTF 3% de ventas en $. Todo editable.</div>'+impRows+'</div>';
}
function _repPartidasDesdeDOM(){
  return _repPartidas().map(function(p){ var el=document.getElementById('reppart-'+p.clave); var np={}; for(var k in p)if(p.hasOwnProperty(k))np[k]=p[k]; if(el)np.monto=_repNum(el.value); return np; });
}
/* ---- Editor de partidas: cálculo en vivo (día/semana/mes + disponible) ---- */
function _repImpPctTotal(){ return (_repImpuestos||[]).filter(function(t){return t.activo!==false&&t.diario!==false;}).reduce(function(s,t){ return s+((t.base==='total'||!t.base)?_repNum(t.rate):0); },0); }
function _repPartCalc(){
  var vEl=document.getElementById('reppart-venta');
  var venta=vEl?_repNum(vEl.value):(_repNum(_repCfg.promedio_venta_diaria)||3000);
  var anclado=0, hayDOM=false;
  _repPartidas().forEach(function(p){ var el=document.getElementById('reppart-'+p.clave); if(el){hayDOM=true; anclado+=_repNum(el.value);} else anclado+=_repNum(p.monto); });
  var imp=_repR2(venta*_repImpPctTotal()/100);
  var extra=_repR2(venta-imp-anclado);
  return {venta:venta, anclado:_repR2(anclado), imp:imp, extra:extra};
}
function _repPartFooter(){
  var c=_repPartCalc();
  var box=function(lbl,dia,col,hi){ return '<div style="flex:1;min-width:150px;background:'+(hi?'#f0fdf4':'var(--surface2)')+';border:1px solid '+(hi?'#bbf7d0':'var(--border)')+';border-radius:10px;padding:9px 11px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">'+lbl+'</div><div style="font-size:18px;font-weight:800;color:'+col+'">'+_repMoney(dia)+'<span style="font-size:10px;color:var(--muted);font-weight:400">/día</span></div><div style="font-size:10.5px;color:var(--muted)">'+_repMoney(dia*7)+'/sem · '+_repMoney(dia*30)+'/mes</div></div>'; };
  var html='<div style="display:flex;gap:8px;flex-wrap:wrap">'+box('🔒 Total anclado',c.anclado,'var(--text)')+box('💵 Disponible p/ repartir',Math.max(0,c.extra),(c.extra<-0.5?'#dc2626':'#16a34a'),true)+'</div>';
  if(c.extra<-0.5)html+='<div style="font-size:11px;color:#dc2626;margin-top:6px">⚠ Estás anclando '+_repMoney(-c.extra)+'/día <b>más de lo que entra</b> (venta '+_repMoney(c.venta)+' − impuestos '+_repMoney(c.imp)+'). Baja alguna partida o sube la venta.</div>';
  else html+='<div style="font-size:11px;color:var(--muted);margin-top:6px">Disponible = venta '+_repMoney(c.venta)+' − impuestos '+_repMoney(c.imp)+' − anclado '+_repMoney(c.anclado)+'. Ese sobrante va a la deuda según la fase (o lo repartes marcando proveedores en <b>Deudas</b>).</div>';
  return html;
}
function _repPartLive(){
  var vEl=document.getElementById('reppart-venta'); var venta=vEl?_repNum(vEl.value):0;
  _repPartidas().forEach(function(p){ var el=document.getElementById('reppart-'+p.clave); if(!el)return; var d=_repNum(el.value);
    var pc=document.getElementById('reppct-'+p.clave); if(pc&&document.activeElement!==pc)pc.value=(venta>0?(d/venta*100):0).toFixed(1);
    var wk=document.getElementById('repwk-'+p.clave); if(wk)wk.innerHTML=_repMoney(d*7);
    var mo=document.getElementById('repmo-'+p.clave); if(mo)mo.innerHTML=_repMoney(d*30);
  });
  var cal=_repPartCalc(); var ex=Math.max(0,cal.extra);
  var S=function(id,v){ var e=document.getElementById(id); if(e)e.innerHTML=v; };
  S('rept-dia',_repMoney(cal.anclado)); S('rept-wk',_repMoney(cal.anclado*7)); S('rept-mo',_repMoney(cal.anclado*30));
  S('repd-dia',_repMoney(ex)); S('repd-wk',_repMoney(ex*7)); S('repd-mo',_repMoney(ex*30));
  var av=document.getElementById('repd-aviso'); if(av)av.innerHTML=(cal.extra<-0.5?('<span style="color:#dc2626">⚠ Anclas '+_repMoney(-cal.extra)+'/día más de lo que entra.</span>'):('Disponible = venta − impuestos ('+_repMoney(cal.imp)+'/día) − anclado. Ese sobrante lo repartes abajo 👇'));
  if(typeof _repExtraLive==='function')_repExtraLive();
}
function _repPartDia(clave){ _repPartLive(); }
function _repPartPct(clave){ var vEl=document.getElementById('reppart-venta'); var venta=vEl?_repNum(vEl.value):0; var pc=document.getElementById('reppct-'+clave); var el=document.getElementById('reppart-'+clave); if(el&&pc)el.value=_repR2(venta*_repNum(pc.value)/100); _repPartLive(); }

/* ============================================================
   REPARTO DEL SOBRANTE (extra) — lógica de crecimiento
   Solo estas partidas crecen con el sobrante: fallas, bancos, deuda vieja
   (+ prestamistas como plan B). Se reparte por % del extra.
   ============================================================ */
function _repExtraDefs(){ return [
  {k:'fallas',           n:'📦 Fallas diarias',   hint:'mercancía → sube las ventas', col:'#0ea5e9'},
  {k:'banco_mercantil',  n:'🏦 Banco Mercantil',  hint:'atraso → refinanciamiento',   col:'#1d4ed8'},
  {k:'banco_provincial', n:'🏦 Banco Provincial', hint:'atraso → refinanciamiento',   col:'#1d4ed8'},
  {k:'deuda_vieja',      n:'📜 Deuda vieja',       hint:'proveedores viejos',          col:'#f59e0b'},
  {k:'hector',           n:'💼 Héctor',            hint:'prestamista (interés)',       col:'#dc2626'},
  {k:'eduardo',          n:'💼 Eduardo',           hint:'prestamista (interés)',       col:'#dc2626'}
]; }
function _repExtraPresets(){ return {
  merc:  {n:'📦 Crecer con mercancía',   d:{fallas:100}},
  banco: {n:'🏦 Alimentar el banco',     d:{banco_mercantil:50,banco_provincial:50}},
  mixto: {n:'⚖️ Mixto (mercancía+banco)', d:{fallas:60,banco_mercantil:20,banco_provincial:20}},
  deuda: {n:'📜 Salir de deuda vieja',   d:{deuda_vieja:100}},
  prest: {n:'💼 Pagar prestamistas',     d:{hector:50,eduardo:50}}
}; }
function _repExtraSectionHTML(){
  var est=_repEstrategia(); var cur={}; (est.destinos||[]).forEach(function(x){ cur[x.clave]=_repNum(x.pct); });
  var idP='width:56px;box-sizing:border-box;padding:6px 5px;border:1px solid var(--border);border-radius:7px;background:var(--surface2);color:var(--text);font-size:13px;text-align:right;font-weight:700';
  var pre=_repExtraPresets();
  var preBtns=Object.keys(pre).map(function(k){ return '<button onclick="_repExtraPreset('+_repArg(k)+')" class="fchip" style="font-size:11.5px">'+esc(pre[k].n)+'</button>'; }).join(' ');
  var rows=_repExtraDefs().map(function(dd){
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)"><div style="min-width:0"><span style="font-size:12.5px;font-weight:600">'+dd.n+'</span> <span style="font-size:10px;color:var(--muted)">· '+dd.hint+'</span></div><span style="display:flex;align-items:center;gap:3px"><input type="number" inputmode="decimal" id="repext-'+dd.k+'" value="'+(cur[dd.k]||0)+'" oninput="_repExtraLive()" style="'+idP+'"><span style="font-size:11px;color:var(--muted)">%</span></span></div>';
  }).join('');
  return '<div class="tbox" style="padding:14px;margin-top:12px">'+
    '<div style="font-size:13px;font-weight:700;margin-bottom:2px">2 · ¿Cómo repartes el 💵 sobrante? <span style="font-size:10px;color:var(--muted);font-weight:400">(tu estrategia de crecimiento)</span></div>'+
    '<div style="font-size:10.5px;color:var(--muted);margin-bottom:8px">Lo de arriba es fijo. El sobrante que queda cada día lo repartes entre las 3 que <b>crecen</b>: mete en <b>📦 fallas</b> y suben las ventas; en <b>🏦 banco</b> y te acercas al refinanciamiento; en <b>📜 deuda vieja</b> y sales de proveedores.</div>'+
    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:11.5px;line-height:1.5"><b>💡 Estrategia recomendada, en 3 tiempos:</b><br>1️⃣ <b>Ahora</b> → casi todo a 📦 <b>fallas</b>: más mercancía = más ventas = más sobrante el mes que viene.<br>2️⃣ <b>Luego</b> → cuando el sobrante esté gordo, pásalo al 🏦 <b>banco</b>: te pones al día, te dan el crédito y pagas a Héctor y Eduardo de un golpe (esos intereses son los que matan).<br>3️⃣ <b>Al final</b> → la 📜 <b>deuda vieja</b> en cuotas: aunque presionen, son los que menos interés cobran.</div>'+
    '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;margin-bottom:5px">Atajos</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+preBtns+'</div>'+
    '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;margin-bottom:2px">Reparto del sobrante (% del extra)</div>'+rows+
    '<div id="repext-sum" style="font-size:11.5px;font-weight:700;margin-top:8px;text-align:right"></div>'+
    '<div id="repext-proj" style="font-size:11.5px;line-height:1.6;margin-top:8px;background:var(--surface2);border-radius:9px;padding:10px 12px"></div>'+
    '<div style="display:flex;justify-content:flex-end;margin-top:10px"><button onclick="_repGuardarExtra()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer">Guardar reparto</button></div></div>';
}
function _repExtraLive(){
  var dests=_repExtraDefs(), sum=0, vals={};
  dests.forEach(function(dd){ var el=document.getElementById('repext-'+dd.k); var v=el?_repNum(el.value):0; vals[dd.k]=v; sum+=v; });
  var s=document.getElementById('repext-sum'); if(s)s.innerHTML=(Math.abs(sum-100)<0.5?'<span style="color:#16a34a">✓ suma 100%</span>':'<span style="color:#b45309">suma '+_repR2(sum)+'% — al guardar se ajusta a 100%</span>');
  var cal=(typeof _repPartCalc==='function')?_repPartCalc():{extra:0}; var exMes=Math.max(0,cal.extra)*30; var den=sum||100; var margen=25;
  var proj='';
  if(vals.fallas>0){ var toF=_repR2(exMes*vals.fallas/den); proj+='<div>📦 <b>'+_repMoney(toF)+'/mes</b> a mercancía → genera ~<b style="color:#16a34a">'+_repMoney(_repR2(toF*margen/100))+'/mes</b> de ganancia (al '+margen+'%), que sube el sobrante del mes siguiente. 🔁</div>'; }
  var toB=_repR2(exMes*((vals.banco_mercantil||0)+(vals.banco_provincial||0))/den); if(toB>0)proj+='<div>🏦 <b>'+_repMoney(toB)+'/mes</b> al atraso bancario → más cerca del refinanciamiento.</div>';
  if(vals.deuda_vieja>0){ var toD=_repR2(exMes*vals.deuda_vieja/den); proj+='<div>📜 <b>'+_repMoney(toD)+'/mes</b> a proveedores viejos (repártelo marcando en <b>Deudas</b>).</div>'; }
  var toP=_repR2(exMes*((vals.hector||0)+(vals.eduardo||0))/den); if(toP>0)proj+='<div>💼 <b>'+_repMoney(toP)+'/mes</b> abonado a capital de Héctor/Eduardo.</div>';
  var pj=document.getElementById('repext-proj'); if(pj)pj.innerHTML=proj||'<div style="color:var(--muted)">Pon porcentajes o toca un atajo para ver el efecto.</div>';
}
function _repExtraPreset(key){ if(!_repPuedeEditar())return; var pr=_repExtraPresets()[key]; if(!pr)return;
  _repExtraDefs().forEach(function(dd){ var el=document.getElementById('repext-'+dd.k); if(el)el.value=(pr.d[dd.k]||0); });
  _repGuardarExtra(pr.n);
}
function _repGuardarExtra(nombre){ if(!_repPuedeEditar())return;
  var destinos=[], sum=0;
  _repExtraDefs().forEach(function(dd){ var el=document.getElementById('repext-'+dd.k); var v=el?_repNum(el.value):0; if(v>0){ destinos.push({clave:dd.k,pct:v}); sum+=v; } });
  if(!destinos.length){ showToast&&showToast('Pon al menos un destino para el sobrante'); return; }
  if(Math.abs(sum-100)>0.5 && sum>0){ destinos=destinos.map(function(x){ return {clave:x.clave,pct:_repR2(x.pct/sum*100)}; }); }
  var est={destinos:destinos, nombre:(nombre||'Reparto personalizado')};
  supabaseClient.from('rep_config').update({estrategia:est,actualizado_en:new Date().toISOString()}).eq('id',1).select('*').then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;} if(res.data&&res.data[0])_repCfg=res.data[0]; else _repCfg.estrategia=est; if(typeof logAudit==='function')logAudit('reparto_config','Reparto del sobrante: '+est.nombre); _repRender(); showToast&&showToast('Reparto del sobrante guardado ✓'); });
}
function _repGuardarPartidasDefs(defs,msg){
  supabaseClient.from('rep_config').update({partidas:defs,actualizado_en:new Date().toISOString()}).eq('id',1).select('*').then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;} if(res.data&&res.data[0])_repCfg=res.data[0]; if(typeof logAudit==='function')logAudit('reparto_config','Actualizó partidas ancladas'); _repRender(); showToast&&showToast(msg||'Partidas guardadas ✓'); });
}
function _repGuardarPartidas(){ if(!_repPuedeEditar())return;
  var vEl=document.getElementById('reppart-venta'); var venta=vEl?_repNum(vEl.value):0; var defs=_repPartidasDesdeDOM();
  var row={partidas:defs,actualizado_en:new Date().toISOString()}; if(venta>0)row.promedio_venta_diaria=venta;
  supabaseClient.from('rep_config').update(row).eq('id',1).select('*').then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;} if(res.data&&res.data[0])_repCfg=res.data[0]; if(typeof logAudit==='function')logAudit('reparto_config','Actualizó partidas ancladas'); _repRender(); showToast&&showToast('Partidas guardadas ✓'); });
}
function _repPartidaAdd(){ if(!_repPuedeEditar())return;
  var nombre=window.prompt('Nombre del nuevo destino (ej. Mantenimiento, Transporte):'); if(nombre===null||!nombre.trim())return;
  var m=_repNum(window.prompt('¿Cuántos $ al día se le anclan?','50')); if(m<0)m=0;
  var defs=_repPartidasDesdeDOM();
  var maxO=defs.reduce(function(s,p){return Math.max(s,_repNum(p.orden));},0);
  defs.push({clave:'p_'+Date.now().toString(36),nombre:nombre.trim(),emoji:'💰',monto:_repR2(m),orden:maxO+1,desc:'Destino personalizado — se guarda en su propio cochinito.'});
  _repGuardarPartidasDefs(defs,'Partida añadida ✓');
}
function _repPartidaQuitar(clave){ if(!_repPuedeEditar())return;
  if(clave==='socios'){ showToast&&showToast('Socios no se puede quitar: de ahí salen José y Nani en Bs'); return; }
  var defs=_repPartidasDesdeDOM();
  var p=defs.filter(function(x){return x.clave===clave;})[0]; if(!p)return;
  if(!window.confirm('¿Quitar "'+p.nombre+'" ('+_repMoney(p.monto)+'/día)? Su dinero quedará libre y subirá el extra del día.'))return;
  _repGuardarPartidasDefs(defs.filter(function(x){return x.clave!==clave;}),'Partida quitada ✓');
}
function _repSetFase(n){ if(!_repPuedeEditar())return; var f=_repFases().filter(function(x){return x.n===n;})[0]; if(!f)return;
  var est={fase:f.n,destinos:f.destinos};
  supabaseClient.from('rep_config').update({estrategia:est,actualizado_en:new Date().toISOString()}).eq('id',1).then(function(res){ if(res&&res.error){showToast&&showToast('Error: '+res.error.message);return;} _repCfg.estrategia=est; if(typeof logAudit==='function')logAudit('reparto_config','Cambió a '+f.nombre); _repRender(); showToast&&showToast(f.nombre+' ✓'); });
}
function _repAbrirImp(id){ if(!_repPuedeEditar())return; var t=id?_repImpuestos.filter(function(x){return String(x.id)===String(id);})[0]:null; _repTmp={modo:'imp',id:t?t.id:null,nombre:t?t.nombre:'',rate:t?_repNum(t.rate):'',base:t?t.base:'total',diario:t?(t.diario!==false):true}; _repHost().innerHTML=_repImpHTML(); }
function _repImpHTML(){ var t=_repTmp; var bases=[['total','Venta total'],['con_iva','Solo con IVA'],['usd','Ventas en $'],['manual','Manual (no calcula)']];
  return _repWrap(_repHdr(t.id?'Editar impuesto':'Nuevo impuesto')+
    '<label style="display:block"><span style="font-size:12px;color:var(--muted)">Nombre</span><input type="text" value="'+esc(t.nombre||'')+'" oninput="_repTmpSet(\'nombre\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Porcentaje (%)</span><input type="number" inputmode="decimal" value="'+esc(String(t.rate))+'" oninput="_repTmpSet(\'rate\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Sobre qué base</span><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">'+bases.map(function(b){return '<button onclick="_repTmpSet(\'base\',\''+b[0]+'\');_repReImp()" class="fchip'+(t.base===b[0]?' active':'')+'" style="font-size:11.5px">'+b[1]+'</button>';}).join('')+'</div></label>'+
    '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer"><input type="checkbox" '+(t.diario?'checked':'')+' onchange="_repTmpSet(\'diario\',this.checked)"><span style="font-size:12.5px">Apartar a diario <span style="color:var(--muted)">(si no, es solo referencia mensual)</span></span></label>'+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'+(t.id?'<button onclick="_repBorrarImp('+t.id+')" class="fchip" style="font-size:13px;color:#dc2626">Quitar</button>':'')+'<button onclick="_repCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_repGuardarImp()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button></div>',420);
}
function _repReImp(){ var h=document.getElementById('rep-modal-host'); if(h)h.innerHTML=_repImpHTML(); }
function _repGuardarImp(){ var t=_repTmp; if(!t||!_repPuedeEditar())return; if(!(t.nombre||'').trim()){showToast&&showToast('Ponle nombre');return;}
  var row={nombre:t.nombre.trim(),rate:_repNum(t.rate),base:t.base||'total',diario:!!t.diario,actualizado_en:new Date().toISOString()};
  var q=t.id?supabaseClient.from('rep_impuestos').update(row).eq('id',t.id).select('*'):supabaseClient.from('rep_impuestos').insert(Object.assign({orden:99},row)).select('*');
  q.then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;} _repCerrar(); _repRefrescar(); showToast&&showToast('Impuesto guardado ✓'); });
}
function _repBorrarImp(id){ if(!_repPuedeEditar())return; supabaseClient.from('rep_impuestos').update({activo:false}).eq('id',id).then(function(){ _repCerrar(); _repRefrescar(); showToast&&showToast('Impuesto quitado'); }); }
function _repGetCfg(k){ var el=document.getElementById('repcfg-'+k); return el?_repNum(el.value):0; }
function _repGuardarConfig(){ if(!_repPuedeEditar())return;
  var row={jefe_fijo_diario:_repGetCfg('jefe_fijo_diario'),nani_fijo_diario:_repGetCfg('nani_fijo_diario'),actualizado_en:new Date().toISOString()};
  supabaseClient.from('rep_config').update(row).eq('id',1).select('*').then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;} if(res.data&&res.data[0])_repCfg=res.data[0]; if(typeof logAudit==='function')logAudit('reparto_config','Actualizó ajustes'); _repRender(); showToast&&showToast('Ajustes guardados ✓'); });
}

/* ---------- Integración Préstamos + Nómina (traer del Plan) ---------- */
function _repLoans(){ try{ return (typeof db!=='undefined'&&Array.isArray(db.prestamos))?db.prestamos.filter(function(l){return l&&l.activo!==false;}):[]; }catch(e){ return []; } }
function _repLoanMonto(l){ try{ if(typeof _prestMontoPagar==='function')return _repR2(_prestMontoPagar(l)); }catch(e){} try{ if(l&&l.tipo==='interes'&&typeof _interesMensual==='function')return _repR2(_interesMensual(l)); }catch(e){} return _repR2(Number(l&&l.cuota_usd)||0); }
function _repLoanFecha(l){ if(l&&l.proxima_cuota)return String(l.proxima_cuota).slice(0,10); if(l&&Array.isArray(l.amortizacion)&&l.amortizacion.length){ var i=Math.min(Math.max(0,l.cuotas_hechas||0),l.amortizacion.length-1); var a=l.amortizacion[i]; if(a&&a.mes)return String(a.mes).slice(0,10); } return _repFechaMas(7); }
function _repNominaQuincena(){ var x=_repCxp(); return (x&&x.nomina)?_repNum(x.nomina.quincena_usd):0; }
function _repAbrirTraer(){ if(!_repPuedeEditar())return; _repTmp={modo:'traer'}; _repHost().innerHTML=_repTraerHTML(); }
function _repTraerHTML(){
  _repTraerCache=[];
  var loans=_repLoans().filter(function(l){return _repLoanMonto(l)>0;});
  var lrows=loans.length?loans.map(function(l){ var monto=_repLoanMonto(l), fecha=_repLoanFecha(l), nom='Cuota '+(l.banco||l.entidad||'préstamo'); var idx=_repTraerCache.length; _repTraerCache.push({n:nom,o:monto,f:fecha,t:'banco'}); var ent=(l.entidad==='FARMACIA'?'Farmacia':(l.entidad==='DROGUERIA'?'Droguería':(l.entidad||'')));
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--border);border-radius:9px;padding:9px 11px;margin-bottom:6px"><div style="min-width:0"><div style="font-size:13px;font-weight:600">'+esc(nom)+(ent?(' <span style="font-size:9px;color:var(--muted)">'+esc(ent)+'</span>'):'')+'</div><div style="font-size:11px;color:var(--muted)">'+_repMoney(monto)+' · vence '+_repFmtFecha(fecha)+'</div></div><button onclick="_repMetaDesdeIdx('+idx+')" class="fchip" style="font-size:11.5px;white-space:nowrap">Crear meta</button></div>';
  }).join(''):'<div style="padding:12px;text-align:center;color:var(--muted)">No hay préstamos activos en el módulo de Préstamos.</div>';
  var nq=_repNominaQuincena();
  var nidx=-1; if(nq>0){ nidx=_repTraerCache.length; _repTraerCache.push({n:'Nómina quincena',o:nq,f:_repFechaMas(15),t:'nomina'}); }
  var nrow=nq>0?('<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--border);border-radius:9px;padding:9px 11px;margin-bottom:6px"><div><div style="font-size:13px;font-weight:600">Nómina quincenal</div><div style="font-size:11px;color:var(--muted)">'+_repMoney(nq)+' · del Plan</div></div><button onclick="_repMetaDesdeIdx('+nidx+')" class="fchip" style="font-size:11.5px;white-space:nowrap">Crear meta</button></div>'):'<div style="font-size:11.5px;color:var(--muted);padding:6px 2px">La nómina quincenal no está puesta en el Plan (Plan Proveedores → nómina).</div>';
  return _repWrap(_repHdr('Traer del Plan')+'<div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">Convierte las cuotas reales de Préstamos y la nómina en metas del repartidor. Puedes editarlas antes de guardar.</div>'+
    '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Préstamos (bancos)</div>'+lrows+
    '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin:12px 0 6px">Nómina</div>'+nrow+
    '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button onclick="_repCerrar()" class="fchip" style="font-size:13px">Cerrar</button></div>',480);
}
function _repMetaDesdeIdx(i){ var o=_repTraerCache[i]; if(!o)return; _repTmp={modo:'meta',id:null,nombre:o.n||'',tipo:o.t||'banco',objetivo:_repNum(o.o),fecha_limite:String(o.f||'').slice(0,10),reunido:0,cobro_directo:(o.t!=='nomina'),recurrente:(o.t==='nomina'?'quincenal':'mensual')}; _repHost().innerHTML=_repMetaHTML(); }

/* ---------- Modal helpers ---------- */
function _repHost(){ var h=document.getElementById('rep-modal-host'); if(!h){ h=document.createElement('div'); h.id='rep-modal-host'; document.body.appendChild(h); } return h; }
function _repCerrar(){ var h=document.getElementById('rep-modal-host'); if(h)h.innerHTML=''; _repTmp=null; }
function _repTmpSet(k,v){ if(_repTmp)_repTmp[k]=v; }
function _repWrap(inner,w){ return '<div onclick="_repCerrar()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto"><div onclick="event.stopPropagation()" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:'+(w||430)+'px;width:100%;margin:24px 0;padding:18px">'+inner+'</div></div>'; }
function _repHdr(t){ return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:16px;font-weight:800">'+esc(t)+'</div><button onclick="_repCerrar()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button></div>'; }

/* ---------- Entry ---------- */
function renderReparto(){ _repEntrar(); }
