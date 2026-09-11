function _mesPrev(p){ var a=(p||HOY().substring(0,7)).split('-'); var d=new Date(parseInt(a[0],10), parseInt(a[1],10)-1, 1); d.setMonth(d.getMonth()-1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function _contaEmpresas(){
  if (typeof EMPRESA!=='undefined' && EMPRESA==='farmacia') return ['FARMACIA'];
  if (typeof EMPRESA!=='undefined' && EMPRESA==='drogueria') return ['DROGUERIA'];
  return ['FARMACIA','DROGUERIA'];
}
function puedeEditarConta(){ return (typeof currentRole!=='undefined' && (currentRole==='admin' || currentRole==='mayra')); }


function _contaGastosDe(periodo,emp){ return (db.gastos||[]).filter(function(g){ return g.periodo===periodo && g.empresa===emp; }); }





// Presiembra única con los datos reales de mayo 2026 (Excel de gastos + ventas del plan)
function seedContaIfEmpty(){
  try{
    var c = db.conta_cfg || (db.conta_cfg = {});
    if (c.seeded) return false;
    if (db.gastos && db.gastos.length) { c.seeded=true; return false; }
    var P='2026-05';
    var G={ FARMACIA:{PERSONAL:23778.89, IMPUESTOS:3803.56, BANCOS:7557.21, FUNCIONAMIENTO:1581.50},
            DROGUERIA:{PERSONAL:11648.54, IMPUESTOS:909.81, BANCOS:5636.11, FUNCIONAMIENTO:1204.50} };
    var arr=[];
    ['FARMACIA','DROGUERIA'].forEach(function(emp){
      CONTA_GRUPOS.forEach(function(gr){
        arr.push({ id:_contaUid(), periodo:P, empresa:emp, grupo:gr, concepto:CONTA_GRUPO_LBL[gr]+' (total mayo)', monto:G[emp][gr], obs:'Cargado del Excel de gastos · mayo 2026' });
      });
    });
    db.gastos = arr;
    db.ventas = db.ventas || {};
    db.ventas[P] = { FARMACIA:145000, DROGUERIA:24000 };
    c.margen = c.margen || { FARMACIA:0.30, DROGUERIA:0.30 };
    c.seeded = true;
    saveDB(db);
    return true;
  }catch(e){ return false; }
}

function renderConta(){
  var cont=document.getElementById('conta-content'); if(!cont) return;
  seedContaIfEmpty();
  if(!_contaMes || _contaMesesDisp().indexOf(_contaMes)<0) _contaMes=_contaMesDefault();
  var t='<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">'+
    '<button class="btn btn-sm '+(_contaView==='pyl'?'btn-accent':'btn-ghost')+'" onclick="_contaView=\'pyl\';renderConta()">Estado de Resultados</button>'+
    '<button class="btn btn-sm '+(_contaView==='gastos'?'btn-accent':'btn-ghost')+'" onclick="_contaView=\'gastos\';renderConta()">Gastos / Egresos</button>'+
    '<div style="margin-left:auto;display:flex;align-items:center;gap:6px"><span style="font-size:12px;color:var(--faint)">Mes:</span>'+_contaMesSelect()+'</div>'+
    '</div>';
  cont.innerHTML='<p class="section-title">Contabilidad</p>'+t+(_contaView==='pyl'? _contaPYLHtml() : _contaGastosHtml());
}


// ── Estado de Resultados ───────────────────────────────────────

function guardarVentas(emp,val){ var per=_contaMes; var n=parseFloat(val); db.ventas=db.ventas||{}; db.ventas[per]=db.ventas[per]||{}; db.ventas[per][emp]=isNaN(n)?0:Math.round(n*100)/100; logAudit('conta.ventas','$'+fmt(n||0,0)+' '+emp+' '+per); saveDB(db); renderConta(); }


// ── Gastos / Egresos ───────────────────────────────────────────

function _contaFld(label,inner){ return '<div style="margin-bottom:12px"><label style="display:block;font-size:12px;color:#64748b;margin-bottom:4px">'+label+'</label>'+inner+'</div>'; }
function _contaCloseModal(){ var m=document.getElementById('conta-modal'); if(m) m.remove(); }

function abrirGastoForm(id){
  if(!puedeEditarConta()) return;
  var g = id ? (db.gastos||[]).find(function(x){return x.id===id;}) : null;
  var emps=_contaEmpresas();
  var emp = g? g.empresa : emps[0];
  var per = g? g.periodo : _contaMes;
  var grupo = g? g.grupo : 'FUNCIONAMIENTO';
  var inner='<div style="padding:16px 20px;border-bottom:1px solid #eef0f3;font-weight:600;font-size:15px">'+(g?'Editar gasto':'Registrar gasto')+'</div><div style="padding:18px 20px">'+
    _contaFld('Empresa','<select id="gf-emp" class="form-input">'+['FARMACIA','DROGUERIA'].map(function(e){return '<option value="'+e+'"'+(e===emp?' selected':'')+'>'+_contaEmpLabel(e)+'</option>';}).join('')+'</select>')+
    _contaFld('Mes','<input id="gf-per" type="month" class="form-input" value="'+esc(per)+'">')+
    _contaFld('Grupo','<select id="gf-grupo" class="form-input" onchange="_gfFillConcepto()">'+CONTA_GRUPOS.map(function(gr){return '<option value="'+gr+'"'+(gr===grupo?' selected':'')+'>'+CONTA_GRUPO_LBL[gr]+'</option>';}).join('')+'</select>')+
    _contaFld('Concepto','<input id="gf-concepto" class="form-input" list="gf-conlist" placeholder="Ej: Nómina, Electricidad..." value="'+esc(g?(g.concepto||''):'')+'"><datalist id="gf-conlist"></datalist>')+
    _contaFld('Monto (USD)','<input id="gf-monto" type="number" step="0.01" class="form-input" value="'+(g?(Number(g.monto)||''):'')+'">')+
    _contaFld('Observación (opcional)','<input id="gf-obs" class="form-input" value="'+esc(g?(g.obs||''):'')+'">')+
    '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-accent" style="flex:1" onclick="guardarGasto('+(g?('\''+g.id+'\''):'null')+')">Guardar</button><button class="btn btn-ghost" onclick="_contaCloseModal()">Cancelar</button></div>'+
    '</div>';
  _contaModal(inner); _gfFillConcepto();
}
function _gfFillConcepto(){ var gr=(document.getElementById('gf-grupo')||{}).value; var dl=document.getElementById('gf-conlist'); if(!dl) return; dl.innerHTML=(CONTA_CONCEPTOS[gr]||[]).map(function(c){return '<option value="'+esc(c)+'">';}).join(''); }
function guardarGasto(id){
  if(!puedeEditarConta()) return;
  var emp=(document.getElementById('gf-emp')||{}).value;
  var per=(document.getElementById('gf-per')||{}).value;
  var grupo=(document.getElementById('gf-grupo')||{}).value;
  var concepto=((document.getElementById('gf-concepto')||{}).value||'').trim();
  var monto=parseFloat((document.getElementById('gf-monto')||{}).value);
  var obs=((document.getElementById('gf-obs')||{}).value||'').trim();
  if(!per || isNaN(monto)){ showToast('Indica el mes y un monto válido.'); return; }
  db.gastos=db.gastos||[];
  if(id){ var g=db.gastos.find(function(x){return x.id===id;}); if(g){ g.empresa=emp; g.periodo=per; g.grupo=grupo; g.concepto=concepto; g.monto=Math.round(monto*100)/100; g.obs=obs; } }
  else { db.gastos.push({ id:_contaUid(), periodo:per, empresa:emp, grupo:grupo, concepto:concepto, monto:Math.round(monto*100)/100, obs:obs }); }
  logAudit('conta.gasto_'+(id?'editar':'crear'), (concepto||CONTA_GRUPO_LBL[grupo])+' $'+fmt(monto,0)+' '+emp+' '+per);
  saveDB(db); _contaMes=per; _contaCloseModal(); renderConta(); showToast('Gasto guardado.');
}
function borrarGasto(id){
  if(!puedeEditarConta()) return;
  if(!confirm('¿Eliminar este gasto?')) return;
  db.gastos=(db.gastos||[]).filter(function(x){return x.id!==id;});
  logAudit('conta.gasto_borrar', id);
  saveDB(db); renderConta(); showToast('Gasto eliminado.');
}
function copiarGastosMesAnterior(){
  if(!puedeEditarConta()) return;
  var per=_contaMes, prev=_mesPrev(per), emps=_contaEmpresas();
  var src=(db.gastos||[]).filter(function(g){ return g.periodo===prev && emps.indexOf(g.empresa)>=0; });
  if(!src.length){ showToast('No hay gastos en '+_mesLabel(prev)+' para copiar.'); return; }
  var yaHay=(db.gastos||[]).some(function(g){ return g.periodo===per && emps.indexOf(g.empresa)>=0; });
  if(yaHay && !confirm('Ya hay gastos en '+_mesLabel(per)+'. ¿Agregar igual una copia de '+_mesLabel(prev)+'?')) return;
  src.forEach(function(g){ db.gastos.push({ id:_contaUid(), periodo:per, empresa:g.empresa, grupo:g.grupo, concepto:g.concepto, monto:g.monto, obs:g.obs }); });
  logAudit('conta.copiar_mes', _mesLabel(prev)+' -> '+_mesLabel(per)+' ('+src.length+')');
  saveDB(db); renderConta(); showToast(src.length+' gastos copiados de '+_mesLabel(prev)+'.');
}

// ══════════════════════════════════════════════════════════════
// CUENTAS POR PAGAR + FLUJO DE CAJA
// ══════════════════════════════════════════════════════════════
var _cxpView = 'pagar';  // 'pagar' | 'flujo'
function _cxpScope(){
  if (typeof EMPRESA!=='undefined' && EMPRESA==='farmacia') return ['farmacia'];
  if (typeof EMPRESA!=='undefined' && EMPRESA==='drogueria') return ['drogueria'];
  return ['farmacia','drogueria'];
}
function _empLow(x){ return String(x||'').toLowerCase(); }
function _cxpEmpLabel(e){ return e==='farmacia' ? 'Farmacia' : 'Droguería'; }
function _mesKeyD(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function _addMonthsKey(k,n){ var a=k.split('-'); var d=new Date(parseInt(a[0],10), parseInt(a[1],10)-1+n, 1); return _mesKeyD(d); }
function puedeEditarCxP(){ return (typeof currentRole!=='undefined' && (currentRole==='admin' || currentRole==='mayra')); }

function _cxpPayables(){
  var scope=_cxpScope(); var out=[];
  (db.facturas||[]).forEach(function(f){
    if (f.activa===false) return;
    var emp=_empLow(f.empresa); if (scope.indexOf(emp)<0) return;
    var saldo=Math.max(0,(Number(f.monto_usd)||0)-(Number(f.abonos_usd)||0));
    if (saldo<=0.005) return;
    out.push({ tipo:'Factura', ref:(f.proveedor||'—'), sub:(f.numero||f.nro||''), empresa:emp, vence:f.vence||'', monto:saldo, dias:(f.vence?diffDias(f.vence):null), estado_base:(f.estado_base||'') });
  });
  (db.prestamos||[]).forEach(function(l){
    if (!l.activo) return;
    var emp=_empLow(l.entidad); if (scope.indexOf(emp)<0) return;
    var c=Number(l.cuota_usd)||0; if (c<=0) return;
    out.push({ tipo:'Cuota préstamo', ref:(l.banco||'—'), sub:((l.cuotas_hechas||0)+'/'+(l.total_cuotas||0)), empresa:emp, vence:l.proxima_cuota||'', monto:c, dias:(l.proxima_cuota?diffDias(l.proxima_cuota):null), estado_base:'' });
  });
  return out;
}
function _cxpBucket(dias, estado_base){
  if ((estado_base||'').toUpperCase().indexOf('CONSIGNA')===0) return {k:'consig',l:'Consignación',c:'var(--faint)'};
  if (dias===null) return {k:'sinf',l:'Sin fecha',c:'var(--faint)'};
  if (dias<0)  return {k:'venc',l:'Vencido',c:'var(--red)'};
  if (dias<=7) return {k:'sem',l:'Esta semana',c:'#d97706'};
  if (dias<=30) return {k:'mes',l:'Este mes',c:'#0ea5e9'};
  return {k:'fut',l:'Más adelante',c:'var(--green)'};
}
function _cxpLatestKey(obj){ var ks=Object.keys(obj||{}).sort(); return ks.length?ks[ks.length-1]:null; }
function _cxpVentasMes(){ var scope=_cxpScope(); var per=_cxpLatestKey(db.ventas); if(!per) return 0; var v=db.ventas[per]||{}; var t=0; scope.forEach(function(e){ t+=Number(v[e.toUpperCase()])||0; }); return t; }
function _cxpGastosMes(){
  var pers={}; (db.gastos||[]).forEach(function(g){ if(g.periodo) pers[g.periodo]=1; });
  var ks=Object.keys(pers).sort(); var per=ks.length?ks[ks.length-1]:null; if(!per) return 0;
  var scope=_cxpScope(); var t=0;
  (db.gastos||[]).forEach(function(g){ if(g.periodo===per && scope.indexOf(_empLow(g.empresa))>=0) t+=Number(g.monto)||0; });
  return t;
}
function _cxpFactMes(mesKey){
  var scope=_cxpScope(); var t=0;
  (db.facturas||[]).forEach(function(f){ if(f.activa===false) return; if(scope.indexOf(_empLow(f.empresa))<0) return;
    if(!f.vence || f.vence.substring(0,7)!==mesKey) return;
    t+=Math.max(0,(Number(f.monto_usd)||0)-(Number(f.abonos_usd)||0)); });
  return t;
}
function _cxpCuotasMes(mesKey){
  var scope=_cxpScope(); var t=0;
  (db.prestamos||[]).forEach(function(l){ if(!l.activo) return; if(scope.indexOf(_empLow(l.entidad))<0) return;
    var c=Number(l.cuota_usd)||0; if(c<=0||!l.proxima_cuota) return;
    var r=Math.max(0,(l.total_cuotas||0)-(l.cuotas_hechas||0)); if(r<=0) r=1;
    var base=l.proxima_cuota.substring(0,7);
    for(var k=0;k<r;k++){ if(_addMonthsKey(base,k)===mesKey){ t+=c; break; } } });
  return t;
}
function _cxpCxcMes(mesKey){
  var scope=_cxpScope(); var t=0;
  function book(arr,emp){ if(scope.indexOf(emp)<0) return; (arr||[]).forEach(function(cl){ (cl.facturas||[]).forEach(function(fac){ var v=fac.vence||fac.fecha_vencimiento; if(v && v.substring(0,7)===mesKey) t+=(Number(fac.saldo)||Number(fac.monto)||0); }); }); }
  book(db.cxc_drog,'drogueria'); book(db.cxc_farm,'farmacia');
  return t;
}

function renderCxP(){
  var c=document.getElementById('cxp-content'); if(!c) return;
  var t='<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">'+
    '<button class="btn btn-sm '+(_cxpView==='pagar'?'btn-accent':'btn-ghost')+'" onclick="_cxpView=\'pagar\';renderCxP()">Cuentas por Pagar</button>'+
    '<button class="btn btn-sm '+(_cxpView==='flujo'?'btn-accent':'btn-ghost')+'" onclick="_cxpView=\'flujo\';renderCxP()">Flujo de Caja</button>'+
    '</div>';
  c.innerHTML='<p class="section-title">Pagos &amp; Flujo</p>'+t+(_cxpView==='pagar'?_cxpPagarHtml():_cxpFlujoHtml());
}
function _cxpPagarHtml(){
  var items=_cxpPayables();
  var T={total:0,venc:0,sem:0,mes:0};
  items.forEach(function(it){ T.total+=it.monto; var b=_cxpBucket(it.dias,it.estado_base); if(b.k==='venc') T.venc+=it.monto; else if(b.k==='sem') T.sem+=it.monto; else if(b.k==='mes') T.mes+=it.monto; });
  function card(cls,l,v){ return '<div class="scard '+cls+'"><div class="scard-label">'+l+'</div><div class="scard-val">$'+fmt(v,0)+'</div></div>'; }
  items.sort(function(a,b){ if(!a.vence&&!b.vence) return 0; if(!a.vence) return 1; if(!b.vence) return -1; return a.vence<b.vence?-1:(a.vence>b.vence?1:0); });
  var rows=items.map(function(it){ var b=_cxpBucket(it.dias,it.estado_base);
    var dt = it.dias===null?'':(it.dias<0?(' · hace '+Math.abs(it.dias)+'d'):(' · '+it.dias+'d'));
    return '<tr><td><span class="badge">'+it.tipo+'</span></td>'+
      '<td>'+esc(it.ref)+(it.sub?' <span style="color:var(--faint);font-size:11px">'+esc(it.sub)+'</span>':'')+'</td>'+
      '<td><span class="badge '+(it.empresa==='farmacia'?'badge-blue':'badge-purple')+'">'+_cxpEmpLabel(it.empresa)+'</span></td>'+
      '<td style="white-space:nowrap">'+(it.vence?fmtDate(it.vence):'—')+'</td>'+
      '<td style="white-space:nowrap;color:'+b.c+';font-size:12px">'+b.l+dt+'</td>'+
      '<td class="mono r">$'+fmt(it.monto,0)+'</td></tr>'; }).join('');
  return '<div class="summary-grid sg-4" style="margin-bottom:16px">'+
    card('blue','Total por pagar',T.total)+card('red','Vencido',T.venc)+card('amber','Esta semana',T.sem)+card('','Este mes (≤30d)',T.mes)+'</div>'+
    '<div class="tbox"><div class="tbox-hd"><span class="tbox-title">Cuentas por Pagar</span><span class="tbox-meta">'+items.length+' compromisos · USD</span></div>'+
    '<div class="twrap"><table><thead><tr><th>Tipo</th><th>A quién</th><th>Empresa</th><th>Vence</th><th>Estado</th><th class="r">Monto USD</th></tr></thead><tbody>'+
    (rows||'<tr><td colspan="6" style="padding:18px;color:var(--faint)">Sin cuentas por pagar en este alcance.</td></tr>')+'</tbody></table></div></div>'+
    '<p style="font-size:12px;color:var(--faint);margin-top:10px;line-height:1.55">Reúne las facturas de proveedores con saldo y las cuotas de préstamos activas. El saldo de cada factura es monto menos abonos. Cifras en USD.</p>';
}


// ══════════════════════════════════════════════════════════════
// TURNOS — Generador de horarios (constructor + cobertura)
// ══════════════════════════════════════════════════════════════
var TURNOS_DIAS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
var TURNOS_CAT=[
  {c:'',lbl:'—'},
  {c:'7-4',i:7,f:16,lbl:'7am–4pm'},{c:'7-5',i:7,f:17,lbl:'7am–5pm'},{c:'8-5',i:8,f:17,lbl:'8am–5pm'},{c:'9-6',i:9,f:18,lbl:'9am–6pm'},{c:'10-7',i:10,f:19,lbl:'10am–7pm'},
  {c:'1-10',i:13,f:22,lbl:'1pm–10pm'},{c:'7-7',i:7,f:31,lbl:'7am–7pm · Turnero'},
  {c:'L',lbl:'Libre'}
];
// Etiqueta corta con am/pm para las celdas del horario (los códigos viejos N/V/2-7 se muestran tal cual)
var TURNOS_LBL_CEL={'7-4':'7a-4p','7-5':'7a-5p','8-5':'8a-5p','9-6':'9a-6p','10-7':'10a-7p','1-10':'1p-10p','7-7':'7a-7p','L':'L'};
function _turLblCel(code){ return TURNOS_LBL_CEL[code]||code||''; }
var _turEmpresa='FARMACIA', _turInicio=null, _turData={}, _turLimpData={}, _turEmpleados=[], _turEmpleadosAll=[], _turLoading=false, _turReady=false, _turBrush='7-4';
var TUR_CARGOS=['caja','supervisor','supervisora','administracion','inventario','compras','ventas','doc','transporte','limpieza','otro'];
var _turVista='turnos';
