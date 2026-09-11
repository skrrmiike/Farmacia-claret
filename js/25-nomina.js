// ══════════════════════════════════════════════════════════════
// 25 · NÓMINA / VALES  (prefijo _vr)  — módulo de Verónica
// Los SUELDOS no viven en la app (quedan en el Excel de Verónica).
// Aquí solo se llevan los MOVIMIENTOS que ajustan el pago quincenal:
//   · Vales / anticipos            (deducción)   — registra Angélica
//   · Medicamentos (tope $50/mes)  (deducción)   — registra Angélica
//   · Horas de noche (>=7pm x $3)  (adición)      — se calcula del horario
// Verónica ve la RELACIÓN por empleado y quincena, y la exporta.
// ══════════════════════════════════════════════════════════════
var _vrTab='registrar', _vrEmpresa='FARMACIA', _vrMes=null, _vrQ='B',
    _vrEmpleados=[], _vrMovs=[], _vrTurnos=[], _vrLoading=false, _vrReady=false, _vrEmpSel='';
var VR_TOPE_MED=50, VR_TARIFA_NOCHE=3, VR_HORA_NOCHE=19; // 7pm

function _vrPuedeRegistrar(){ try{ return currentRole==='admin'||currentRole==='veronica'||currentUser==='angelica'||currentUser==='veronica'; }catch(e){ return false; } }
function _vrPuedeRelacion(){ try{ return currentRole==='admin'||currentRole==='veronica'||currentUser==='veronica'; }catch(e){ return false; } }
function _vrN(x){ var n=Number(x); return isNaN(n)?0:n; }
function _vrMoney(x){ return (typeof fmt==='function')?('$'+fmt(_vrN(x),2)):('$'+_vrN(x).toFixed(2)); }

// ── Periodo (quincena) ─────────────────────────────────────────
var VR_MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _vrHoy(){ try{ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _vrMesHoy(){ return _vrHoy().slice(0,7); }
function _vrDiaHoy(){ return parseInt(_vrHoy().slice(8,10),10); }
function _vrUltimoDia(mes){ var y=+mes.slice(0,4), m=+mes.slice(5,7); return new Date(y,m,0).getDate(); }
function _vrRango(mes,q){ var ini,fin; if(q==='A'){ ini=mes+'-01'; fin=mes+'-15'; } else { var u=_vrUltimoDia(mes); ini=mes+'-16'; fin=mes+'-'+String(u).padStart(2,'0'); } return {ini:ini,fin:fin}; }
function _vrRangoLbl(mes,q){ var r=_vrRango(mes,q); var mm=VR_MESES[(+mes.slice(5,7))-1]||''; var dIni=+r.ini.slice(8,10), dFin=+r.fin.slice(8,10); return dIni+'–'+dFin+' '+mm+' '+mes.slice(0,4); }
function _vrEnRango(fecha,mes,q){ if(!fecha) return false; var r=_vrRango(mes,q); var f=String(fecha).slice(0,10); return f>=r.ini && f<=r.fin; }

// ── Horas de noche (a partir de las 7pm) desde el módulo de turnos ──
function _vrNocheDeTurno(code){
  if(!code) return 0;
  try{
    for(var i=0;i<TURNOS_CAT.length;i++){ var t=TURNOS_CAT[i]; if(t.c===code){ if(t.i==null||t.f==null) return 0; var ini=Math.max(t.i,VR_HORA_NOCHE); return Math.max(0, t.f-ini); } }
  }catch(e){}
  return 0;
}
// Suma horas de noche de un empleado dentro del rango [ini,fin], recorriendo las semanas de turnos.
function _vrHorasNoche(empId, mes, q){
  var r=_vrRango(mes,q), total=0; var k=String(empId);
  (_vrTurnos||[]).forEach(function(row){
    var inicio=row.quincena_inicio; if(!inicio) return;
    var asig=(row.data&&row.data.asig)||{}; var dias=asig[k]; if(!dias) return;
    // cada semana arranca en 'inicio' (lunes). día d => fecha inicio + d
    var base=new Date(inicio+'T00:00:00');
    for(var d=0; d<7; d++){
      var dt=new Date(base.getTime()); dt.setDate(dt.getDate()+d);
      var fs=dt.toISOString().slice(0,10);
      if(fs>=r.ini && fs<=r.fin){ total += _vrNocheDeTurno(dias[d]); }
    }
  });
  return total;
}

// ── Carga ──────────────────────────────────────────────────────
function _vrEntrar(){ if(!_vrMes){ _vrMes=_vrMesHoy(); _vrQ=(_vrDiaHoy()>=16)?'B':'A'; } if(!_vrPuedeRelacion() && _vrPuedeRegistrar()) _vrTab='registrar'; if(!_vrReady){ _vrCargar(); } else { _vrRender(); } }
function _vrCargar(){
  _vrLoading=true; _vrRender();
  var r=_vrRango(_vrMes,_vrQ);
  var mesFin=_vrMes+'-'+String(_vrUltimoDia(_vrMes)).padStart(2,'0'); // cargamos TODO el mes (tope $50 es mensual)
  // rango extendido para turnos (una semana puede empezar antes del 1)
  var ext=new Date(_vrMes+'-01T00:00:00'); ext.setDate(ext.getDate()-6); var extIni=ext.toISOString().slice(0,10);
  Promise.all([
    supabaseClient.from('empleados').select('id,nombre,empresa,activo').order('empresa').order('nombre'),
    supabaseClient.from('empleado_movimientos').select('*').gte('fecha', _vrMes+'-01').lte('fecha', mesFin).eq('anulado',false).order('fecha',{ascending:false}),
    supabaseClient.from('turnos').select('quincena_inicio,data,empresa').gte('quincena_inicio', extIni).lte('quincena_inicio', mesFin)
  ]).then(function(res){
    _vrEmpleados=((res[0]&&res[0].data)||[]).filter(function(e){ return e.activo!==false; });
    _vrMovs=(res[1]&&res[1].data)||[];
    _vrTurnos=(res[2]&&res[2].data)||[];
    _vrLoading=false; _vrReady=true; _vrRender();
  }).catch(function(e){ console.warn('nomina cargar',e); _vrLoading=false; _vrReady=true; _vrRender(); });
}
function _vrRefrescar(){ _vrReady=false; _vrCargar(); }
function _vrSetMes(v){ if(v){ _vrMes=v; _vrRefrescar(); } }
function _vrSetQ(q){ _vrQ=q; _vrRefrescar(); }
function _vrSetEmpresa(e){ _vrEmpresa=e; _vrRender(); }
function _vrSetTab(t){ _vrTab=t; _vrRender(); }
function _vrSetEmpSel(v){ _vrEmpSel=v; _vrRender(); }

// medicamentos usados en el mes calendario (ambas quincenas) por empleado
function _vrMedMes(empId){
  var mes=_vrMes; var s=0;
  (_vrMovs||[]).forEach(function(m){ if(m.tipo==='medicamento' && String(m.empleado_id)===String(empId) && String(m.fecha).slice(0,7)===mes && !m.anulado) s+=_vrN(m.monto); });
  return s;
}

// ── Guardar movimiento ─────────────────────────────────────────
function _vrGuardar(tipo){
  if(!_vrPuedeRegistrar()){ showToast&&showToast('No tienes permiso para registrar'); return; }
  var empId=_vrEmpSel;
  var emp=(_vrEmpleados||[]).filter(function(e){ return String(e.id)===String(empId); })[0];
  if(!emp){ showToast&&showToast('Elige un empleado'); return; }
  var montoEl=document.getElementById('vr-monto-'+tipo);
  var detEl=document.getElementById('vr-det-'+tipo);
  var fechaEl=document.getElementById('vr-fecha-'+tipo);
  var monto=_vrN(montoEl&&montoEl.value);
  if(monto<=0){ showToast&&showToast('Escribe un monto mayor a 0'); return; }
  var fecha=(fechaEl&&fechaEl.value)||_vrHoy();
  var detalle=(detEl&&detEl.value||'').trim();
  if(tipo==='medicamento'){
    // tope $50/mes bloqueante
    var mesFecha=String(fecha).slice(0,7);
    var usado=0;
    (_vrMovs||[]).forEach(function(m){ if(m.tipo==='medicamento' && String(m.empleado_id)===String(empId) && String(m.fecha).slice(0,7)===mesFecha && !m.anulado) usado+=_vrN(m.monto); });
    var rest=VR_TOPE_MED-usado;
    if(rest<=0){ showToast&&showToast('⛔ '+emp.nombre+' ya alcanzó el tope de $'+VR_TOPE_MED+' en medicamentos este mes'); return; }
    if(monto>rest+0.001){ showToast&&showToast('⛔ Supera el tope: solo quedan '+_vrMoney(rest)+' de los $'+VR_TOPE_MED+' del mes'); return; }
  }
  var row={ tipo:tipo, empleado_id:emp.id, empleado_nombre:emp.nombre, empresa:emp.empresa, monto:monto, fecha:fecha, detalle:detalle||null, creado_por:(typeof currentUser!=='undefined'?currentUser:null), anulado:false };
  var btnId='vr-btn-'+tipo; var b=document.getElementById(btnId); if(b){ b.disabled=true; b.textContent='Guardando…'; }
  supabaseClient.from('empleado_movimientos').insert([row]).select('*').then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo guardar: '+(res.error.message||'')); if(b){b.disabled=false;} _vrRender(); return; }
    if(res&&res.data&&res.data[0]) _vrMovs.unshift(res.data[0]);
    if(typeof logAudit==='function') logAudit('nomina.'+tipo, emp.nombre+' · '+_vrMoney(monto)+(detalle?(' · '+detalle):''));
    if(montoEl)montoEl.value=''; if(detEl)detEl.value='';
    showToast&&showToast('✓ '+(tipo==='vale'?'Vale':'Medicamento')+' registrado: '+emp.nombre+' '+_vrMoney(monto));
    _vrRender();
  }).catch(function(){ showToast&&showToast('Error de red'); if(b){b.disabled=false;} });
}
function _vrAnular(id){
  if(!_vrPuedeRegistrar()){ showToast&&showToast('No autorizado'); return; }
  supabaseClient.from('empleado_movimientos').update({anulado:true}).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('Error: '+(res.error.message||'')); return; }
    _vrMovs=(_vrMovs||[]).filter(function(m){ return m.id!==id; });
    if(typeof logAudit==='function') logAudit('nomina.anular', ''+id);
    showToast&&showToast('Movimiento anulado'); _vrRender();
  });
}

// ── Relación por empleado ──────────────────────────────────────
function _vrResumen(){
  var mp={};
  (_vrEmpleados||[]).forEach(function(e){ if(e.empresa!==_vrEmpresa) return; mp[String(e.id)]={id:e.id,nombre:e.nombre,vales:0,med:0,horas:0}; });
  (_vrMovs||[]).forEach(function(m){ if(m.empresa!==_vrEmpresa) return; if(!_vrEnRango(m.fecha,_vrMes,_vrQ)) return; var k=String(m.empleado_id); if(!mp[k]) mp[k]={id:m.empleado_id,nombre:m.empleado_nombre,vales:0,med:0,horas:0}; if(m.tipo==='vale')mp[k].vales+=_vrN(m.monto); else if(m.tipo==='medicamento')mp[k].med+=_vrN(m.monto); });
  var arr=Object.keys(mp).map(function(k){ var o=mp[k]; o.horas=_vrHorasNoche(o.id,_vrMes,_vrQ); o.pagoNoche=o.horas*VR_TARIFA_NOCHE; o.deducciones=o.vales+o.med; o.neto=o.pagoNoche-o.deducciones; return o; });
  arr.sort(function(a,b){ var am=(a.vales+a.med+a.pagoNoche)>0?0:1, bm=(b.vales+b.med+b.pagoNoche)>0?0:1; if(am!==bm)return am-bm; return a.nombre<b.nombre?-1:1; });
  return arr;
}
function _vrExport(){
  var arr=_vrResumen();
  var head=['Empleado','Vales $','Medicamentos $','Total deducciones $','Horas noche','Pago noche $','Ajuste neto (noche - deducc) $'];
  var lines=[head.join(';')];
  arr.forEach(function(o){ lines.push([o.nombre, o.vales.toFixed(2), o.med.toFixed(2), o.deducciones.toFixed(2), o.horas, o.pagoNoche.toFixed(2), o.neto.toFixed(2)].join(';')); });
  var tv=arr.reduce(function(a,o){return a+o.vales;},0), tm=arr.reduce(function(a,o){return a+o.med;},0), th=arr.reduce(function(a,o){return a+o.horas;},0), tp=arr.reduce(function(a,o){return a+o.pagoNoche;},0);
  lines.push(['TOTALES', tv.toFixed(2), tm.toFixed(2), (tv+tm).toFixed(2), th, tp.toFixed(2), (tp-tv-tm).toFixed(2)].join(';'));
  var csv='﻿'+lines.join('\r\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='relacion_'+_vrEmpresa+'_'+_vrMes+'_Q'+_vrQ+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },300);
  if(typeof logAudit==='function') logAudit('nomina.export', _vrEmpresa+' '+_vrMes+' Q'+_vrQ);
}

// ── Render ─────────────────────────────────────────────────────
function renderNomina(){ _vrEntrar(); }
function _vrRender(){
  var c=document.getElementById('nomina-content'); if(!c) return;
  if(!_vrPuedeRegistrar() && !_vrPuedeRelacion()){ c.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted)">No tienes acceso a este módulo.</div>'; return; }
  var mesInput='<input type="month" value="'+esc(_vrMes||'')+'" onchange="_vrSetMes(this.value)" style="padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px">';
  var qBtns='<div style="display:inline-flex;gap:4px">'+
    '<button class="fchip'+(_vrQ==='A'?' active':'')+'" onclick="_vrSetQ(\'A\')" style="font-size:12px">1ª quincena (1–15)</button>'+
    '<button class="fchip'+(_vrQ==='B'?' active':'')+'" onclick="_vrSetQ(\'B\')" style="font-size:12px">2ª quincena (16–fin)</button></div>';
  var header='<div style="max-width:1000px;margin:0 auto 6px"><div style="font-weight:800;font-size:19px;display:flex;align-items:center;gap:8px">💵 Nómina / Vales</div>'+
    '<div style="font-size:12px;color:var(--muted);margin-top:2px">Vales, medicamentos y horas de noche que ajustan el pago quincenal. <b>Los sueldos no se guardan aquí</b> — quedan en tu Excel.</div></div>';
  // tabs
  var canReg=_vrPuedeRegistrar(), canRel=_vrPuedeRelacion();
  if(_vrTab==='relacion'&&!canRel)_vrTab='registrar'; if(_vrTab==='registrar'&&!canReg)_vrTab='relacion';
  var tabs='<div style="max-width:1000px;margin:0 auto 12px;display:flex;gap:6px;flex-wrap:wrap">'+
    (canReg?'<button class="btn '+(_vrTab==='registrar'?'btn-accent':'btn-ghost')+' btn-sm" onclick="_vrSetTab(\'registrar\')">➕ Registrar</button>':'')+
    (canRel?'<button class="btn '+(_vrTab==='relacion'?'btn-accent':'btn-ghost')+' btn-sm" onclick="_vrSetTab(\'relacion\')">📋 Relación (Verónica)</button>':'')+
    '<span style="flex:1"></span><button class="btn btn-ghost btn-sm" onclick="_vrRefrescar()">🔄 Actualizar</button></div>';
  var periodo='<div style="max-width:1000px;margin:0 auto 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-size:12px;color:var(--muted);font-weight:700">Periodo:</span>'+mesInput+qBtns+'<span style="font-size:12px;color:var(--accent);font-weight:700">'+esc(_vrRangoLbl(_vrMes,_vrQ))+'</span></div>';
  var body;
  if(_vrLoading && !_vrReady){ body='<div style="padding:30px;text-align:center;color:var(--muted)">Cargando…</div>'; }
  else if(_vrTab==='registrar'){ body=_vrRegistrarHTML(); }
  else { body=_vrRelacionHTML(); }
  c.innerHTML=header+tabs+periodo+'<div style="max-width:1000px;margin:0 auto">'+body+'</div>';
}

function _vrEmpOptions(){
  var byEmp={FARMACIA:[],DROGUERIA:[]};
  (_vrEmpleados||[]).forEach(function(e){ (byEmp[e.empresa]||(byEmp[e.empresa]=[])).push(e); });
  var out='<option value="">— Elige empleado —</option>';
  ['FARMACIA','DROGUERIA'].forEach(function(emp){ var list=byEmp[emp]||[]; if(!list.length)return; out+='<optgroup label="'+emp+'">'; list.forEach(function(e){ out+='<option value="'+e.id+'"'+(String(_vrEmpSel)===String(e.id)?' selected':'')+'>'+esc(e.nombre)+'</option>'; }); out+='</optgroup>'; });
  return out;
}
function _vrRegistrarHTML(){
  var emp=(_vrEmpleados||[]).filter(function(e){ return String(e.id)===String(_vrEmpSel); })[0];
  var usado=emp?_vrMedMes(emp.id):0, rest=VR_TOPE_MED-usado;
  var medInfo=emp?('<div style="font-size:11px;margin-top:4px;color:'+(rest<=0?'var(--red)':(rest<15?'var(--amber)':'var(--muted)'))+'">'+esc(emp.nombre)+': usó '+_vrMoney(usado)+' de $'+VR_TOPE_MED+' este mes · quedan <b>'+_vrMoney(Math.max(0,rest))+'</b></div>'):'';
  var pick='<div class="tbox" style="padding:14px;margin-bottom:12px"><label style="font-size:11px;color:var(--muted);font-weight:700">Empleado</label><select onchange="_vrSetEmpSel(this.value)" style="width:100%;margin-top:5px;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:14px">'+_vrEmpOptions()+'</select></div>';
  var hoy=_vrHoy();
  var cardVale='<div class="tbox" style="padding:14px;margin-bottom:12px"><div style="font-weight:700;font-size:14px;margin-bottom:10px">🧾 Vale / anticipo <span style="font-size:11px;color:var(--muted);font-weight:500">(se descuenta del sueldo)</span></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'+
    '<label style="font-size:10px;color:var(--muted)">Monto ($)<input id="vr-monto-vale" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" style="display:block;width:110px;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:15px;font-weight:700"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Fecha<input id="vr-fecha-vale" type="date" value="'+hoy+'" style="display:block;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<label style="font-size:10px;color:var(--muted);flex:1;min-width:150px">Concepto (opcional)<input id="vr-det-vale" type="text" placeholder="motivo" style="display:block;width:100%;box-sizing:border-box;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<button id="vr-btn-vale" class="btn btn-green btn-sm" style="padding:9px 16px" onclick="_vrGuardar(\'vale\')">Registrar vale</button></div></div>';
  var cardMed='<div class="tbox" style="padding:14px;margin-bottom:12px"><div style="font-weight:700;font-size:14px;margin-bottom:4px">💊 Medicamentos <span style="font-size:11px;color:var(--muted);font-weight:500">(tope $'+VR_TOPE_MED+'/mes · se descuenta del sueldo)</span></div>'+medInfo+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:8px">'+
    '<label style="font-size:10px;color:var(--muted)">Monto ($)<input id="vr-monto-medicamento" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" style="display:block;width:110px;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:15px;font-weight:700"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Fecha<input id="vr-fecha-medicamento" type="date" value="'+hoy+'" style="display:block;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<label style="font-size:10px;color:var(--muted);flex:1;min-width:150px">Producto (opcional)<input id="vr-det-medicamento" type="text" placeholder="qué se llevó" style="display:block;width:100%;box-sizing:border-box;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<button id="vr-btn-medicamento" class="btn btn-green btn-sm" style="padding:9px 16px" onclick="_vrGuardar(\'medicamento\')">Registrar medicamento</button></div></div>';
  var forms=emp?(cardVale+cardMed):'<div class="tbox" style="padding:16px;text-align:center;color:var(--muted);font-size:13px">Elige un empleado para registrar un vale o un medicamento.</div>';
  return pick+forms+_vrRecientesHTML();
}
function _vrRecientesHTML(){
  var r=_vrRango(_vrMes,_vrQ);
  var list=(_vrMovs||[]).filter(function(m){ return _vrEnRango(m.fecha,_vrMes,_vrQ); });
  if(_vrEmpSel) list=list.filter(function(m){ return String(m.empleado_id)===String(_vrEmpSel); });
  if(!list.length) return '<div class="tbox" style="padding:14px;text-align:center;color:var(--muted);font-size:12px">Sin movimientos en '+esc(_vrRangoLbl(_vrMes,_vrQ))+(_vrEmpSel?' para este empleado':'')+'.</div>';
  var rows=list.slice(0,60).map(function(m){ var col=m.tipo==='vale'?'var(--accent)':'#0891b2'; var ic=m.tipo==='vale'?'🧾':'💊';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border)">'+
      '<span style="font-size:16px">'+ic+'</span>'+
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.empleado_nombre)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(String(m.fecha).slice(0,10))+(m.detalle?(' · '+esc(m.detalle)):'')+' · '+esc(m.empresa||'')+'</div></div>'+
      '<div style="font-weight:700;font-size:14px;color:'+col+'">'+_vrMoney(m.monto)+'</div>'+
      (_vrPuedeRegistrar()?('<button onclick="_vrAnular(\''+m.id+'\')" title="Anular" style="border:0;background:none;cursor:pointer;color:var(--red);font-size:16px">×</button>'):'')+
    '</div>'; }).join('');
  return '<div class="tbox" style="padding:12px"><div style="font-weight:700;font-size:13px;margin-bottom:6px">Movimientos de la quincena</div>'+rows+'</div>';
}

function _vrRelacionHTML(){
  var empBtns='<div style="display:inline-flex;gap:4px;margin-bottom:10px">'+
    '<button class="fchip'+(_vrEmpresa==='FARMACIA'?' active':'')+'" onclick="_vrSetEmpresa(\'FARMACIA\')" style="font-size:12px">Farmacia Claret</button>'+
    '<button class="fchip'+(_vrEmpresa==='DROGUERIA'?' active':'')+'" onclick="_vrSetEmpresa(\'DROGUERIA\')" style="font-size:12px">Droguería</button></div>';
  var arr=_vrResumen();
  var tv=0,tm=0,th=0,tp=0;
  var rows=arr.map(function(o){ tv+=o.vales; tm+=o.med; th+=o.horas; tp+=o.pagoNoche;
    var netoCol=o.neto>0?'var(--green)':(o.neto<0?'var(--red)':'var(--muted)');
    var sinNada=(o.vales+o.med+o.pagoNoche)===0;
    return '<tr style="border-top:1px solid var(--border);'+(sinNada?'opacity:.45':'')+'">'+
      '<td style="padding:7px 8px;font-size:12px;font-weight:600">'+esc(o.nombre)+'</td>'+
      '<td style="padding:7px 8px;text-align:right;font-size:12px;color:'+(o.vales>0?'var(--accent)':'var(--muted)')+'">'+(o.vales>0?_vrMoney(o.vales):'—')+'</td>'+
      '<td style="padding:7px 8px;text-align:right;font-size:12px;color:'+(o.med>0?'#0891b2':'var(--muted)')+'">'+(o.med>0?_vrMoney(o.med):'—')+'</td>'+
      '<td style="padding:7px 8px;text-align:right;font-size:12px;font-weight:700;color:'+(o.deducciones>0?'var(--red)':'var(--muted)')+'">'+(o.deducciones>0?('−'+_vrMoney(o.deducciones)):'—')+'</td>'+
      '<td style="padding:7px 8px;text-align:center;font-size:12px;color:var(--muted)">'+(o.horas>0?(o.horas+'h'):'—')+'</td>'+
      '<td style="padding:7px 8px;text-align:right;font-size:12px;color:'+(o.pagoNoche>0?'var(--green)':'var(--muted)')+'">'+(o.pagoNoche>0?('+'+_vrMoney(o.pagoNoche)):'—')+'</td>'+
      '<td style="padding:7px 8px;text-align:right;font-size:13px;font-weight:800;color:'+netoCol+'">'+(o.neto>0?'+':'')+_vrMoney(o.neto)+'</td>'+
    '</tr>'; }).join('');
  var totalRow='<tr style="border-top:2px solid var(--border);background:var(--surface2)">'+
    '<td style="padding:8px;font-size:12px;font-weight:800">TOTALES</td>'+
    '<td style="padding:8px;text-align:right;font-size:12px;font-weight:700">'+_vrMoney(tv)+'</td>'+
    '<td style="padding:8px;text-align:right;font-size:12px;font-weight:700">'+_vrMoney(tm)+'</td>'+
    '<td style="padding:8px;text-align:right;font-size:12px;font-weight:800;color:var(--red)">−'+_vrMoney(tv+tm)+'</td>'+
    '<td style="padding:8px;text-align:center;font-size:12px;font-weight:700">'+th+'h</td>'+
    '<td style="padding:8px;text-align:right;font-size:12px;font-weight:800;color:var(--green)">+'+_vrMoney(tp)+'</td>'+
    '<td style="padding:8px;text-align:right;font-size:13px;font-weight:800">'+((tp-tv-tm)>=0?'+':'')+_vrMoney(tp-tv-tm)+'</td>'+
  '</tr>';
  var tabla='<div class="tbox" style="padding:12px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px"><div style="font-weight:700;font-size:13px">Relación · '+esc(_vrRangoLbl(_vrMes,_vrQ))+'</div><button class="btn btn-accent btn-sm" onclick="_vrExport()">⬇️ Exportar (Excel/CSV)</button></div>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:640px"><thead><tr style="font-size:10px;color:var(--muted);text-transform:uppercase">'+
    '<th style="text-align:left;padding:4px 8px">Empleado</th><th style="text-align:right;padding:4px 8px">Vales</th><th style="text-align:right;padding:4px 8px">Mdtos</th><th style="text-align:right;padding:4px 8px">Deducc.</th><th style="text-align:center;padding:4px 8px">Noche</th><th style="text-align:right;padding:4px 8px">Pago noche</th><th style="text-align:right;padding:4px 8px">Ajuste neto</th></tr></thead><tbody>'+rows+totalRow+'</tbody></table></div>'+
    '<div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.5">💡 <b>Ajuste neto</b> = pago de noche (horas ≥7pm × $'+VR_TARIFA_NOCHE+') − deducciones (vales + medicamentos). Es lo que sumas o restas al sueldo quincenal en tu Excel. Las horas de noche salen del módulo de Turnos.</div></div>';
  return empBtns+tabla;
}
