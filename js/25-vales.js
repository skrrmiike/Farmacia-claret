// ══════════════════════════════════════════════════════════════
// 25 · VALES (prefijo _vl) — lo maneja Angélica
// Vales/anticipos con LISTA DE ESPERA (solicitado → entregado) y
// medicamentos (tope $50/mes). La regla "que siempre cobren algo"
// se valida en el SERVIDOR (fn_vale_registrar): el sueldo NUNCA
// llega a este navegador, aquí no se ve ningún salario.
// ══════════════════════════════════════════════════════════════
var _vlTab='vales', _vlMes=null, _vlQ='B', _vlEmpleados=[], _vlMovs=[], _vlVac=[], _vlEmpSel='', _vlLoading=false, _vlReady=false, _vlBusy=false, _vlRetiros=[];
var _vlFechaVale='', _vlFechaMed='', _vlCuotas=1;
function _vlSetCuotas(n){ _vlCuotas=Math.max(1,Math.min(6,Number(n)||1)); _vlRender(); }
var VL_TOPE_MED=50;
function _vlPuede(){ try{ return currentRole==='admin'||currentRole==='veronica'||currentUser==='angelica'||currentUser==='veronica'; }catch(e){ return false; } }
function _vlN(x){ var n=(typeof numComa==='function')?numComa(x):Number(String(x==null?'':x).replace(',','.')); return isNaN(n)?0:n; }
function _vlMoney(x){ return (typeof fmt==='function')?('$'+fmt(_vlN(x),2)):('$'+_vlN(x).toFixed(2)); }
var VL_MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _vlHoy(){ try{ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _vlMesHoy(){ return _vlHoy().slice(0,7); }
function _vlDiaHoy(){ return parseInt(_vlHoy().slice(8,10),10); }
function _vlUltimoDia(mes){ var y=+mes.slice(0,4), m=+mes.slice(5,7); return new Date(y,m,0).getDate(); }
function _vlRango(mes,q){ if(q==='A') return {ini:mes+'-01',fin:mes+'-15'}; var u=_vlUltimoDia(mes); return {ini:mes+'-16',fin:mes+'-'+String(u).padStart(2,'0')}; }
function _vlRangoLbl(mes,q){ var r=_vlRango(mes,q); var mm=VL_MESES[(+mes.slice(5,7))-1]||''; return (+r.ini.slice(8,10))+'–'+(+r.fin.slice(8,10))+' '+mm+' '+mes.slice(0,4); }
function _vlEnRango(fecha,mes,q){ if(!fecha)return false; var r=_vlRango(mes,q); var f=String(fecha).slice(0,10); return f>=r.ini&&f<=r.fin; }

function _vlEntrar(){ if(!_vlMes){ _vlMes=_vlMesHoy(); _vlQ=(_vlDiaHoy()>=16)?'B':'A'; } if(!_vlReady){ _vlCargar(); } else { _vlRender(); } }
function _vlCargar(){
  _vlLoading=true; _vlRender();
  var mesFin=_vlMes+'-'+String(_vlUltimoDia(_vlMes)).padStart(2,'0');
  Promise.all([
    supabaseClient.from('empleados').select('id,nombre,empresa,empresa_nomina,activo').order('empresa').order('nombre'),
    supabaseClient.from('empleado_movimientos').select('*').gte('fecha',_vlMes+'-01').lte('fecha',mesFin).eq('anulado',false).order('created_at',{ascending:false}),
    supabaseClient.from('empleado_asistencia').select('empleado_id,fecha,tipo').eq('tipo','vacaciones').gte('fecha',_vlMes+'-01').lte('fecha',mesFin),
    supabaseClient.from('retiros_jefes_bs').select('*').gte('fecha',_vlMes+'-01').lte('fecha',mesFin).eq('anulado',false).order('fecha',{ascending:false})
  ]).then(function(res){
    _vlEmpleados=((res[0]&&res[0].data)||[]).filter(function(e){ return e.activo!==false; });
    _vlMovs=(res[1]&&res[1].data)||[];
    _vlVac=(res[2]&&res[2].data)||[];
    _vlRetiros=(res[3]&&res[3].data)||[];
    _vlLoading=false; _vlReady=true; _vlRender();
  }).catch(function(e){ console.warn('vales cargar',e); _vlLoading=false; _vlReady=true; _vlRender(); });
}
function _vlRefrescar(){ _vlReady=false; _vlCargar(); }
function _vlSetMes(v){ if(v){ _vlMes=v; _vlRefrescar(); } }
function _vlSetQ(q){ _vlQ=q; _vlRender(); }
function _vlSetTab(t){ _vlTab=t; _vlRender(); }
function _vlSetEmp(v){ _vlEmpSel=v; _vlRender(); }
function _vlEmp(id){ return (_vlEmpleados||[]).filter(function(e){ return String(e.id)===String(id); })[0]; }
function _vlMedMes(empId){ var s=0; (_vlMovs||[]).forEach(function(m){ if(m.tipo==='medicamento'&&String(m.empleado_id)===String(empId)&&String(m.fecha).slice(0,7)===_vlMes&&!m.anulado) s+=_vlN(m.monto); }); return s; }
// ¿El empleado está de vacaciones en esa fecha? (empleado_asistencia tipo=vacaciones)
function _vlEnVac(empId,fecha){ var f=String(fecha||'').slice(0,10); return (_vlVac||[]).some(function(v){ return String(v.empleado_id)===String(empId)&&String(v.fecha).slice(0,10)===f; }); }
// Si está de vacaciones, exige autorización nombrada. Devuelve {ok, det, cancel}.
function _vlAutorizarSiVac(emp,fecha,det){
  if(!emp||!_vlEnVac(emp.id,fecha)) return {ok:true, det:det};
  var quien=(typeof window!=='undefined'&&window.prompt)?window.prompt('⚠️ '+emp.nombre+' está de VACACIONES el '+String(fecha).slice(0,10)+'.\nUn vale/medicamento en vacaciones necesita autorización.\n\n¿Quién lo autoriza? (nombre de quien aprueba)'):'';
  if(quien===null) return {ok:false, cancel:true};
  quien=(''+quien).trim();
  if(!quien){ showToast&&showToast('Debes indicar quién autoriza'); return {ok:false}; }
  return {ok:true, det:(det?det+' · ':'')+'AUTORIZADO por '+quien+' (vacaciones)', autoriza:quien};
}

// ── Solicitar vale (regla en el servidor) ─────────────────────
function _vlSolicitar(){
  if(!_vlPuede()){ showToast&&showToast('No autorizado'); return; }
  if(_vlBusy) return;
  var emp=_vlEmp(_vlEmpSel); if(!emp){ showToast&&showToast('Elige un empleado'); return; }
  var mEl=document.getElementById('vl-monto'), dEl=document.getElementById('vl-det'), fEl=document.getElementById('vl-fecha');
  var monto=_vlN(mEl&&mEl.value); if(monto<=0){ showToast&&showToast('Escribe un monto mayor a 0'); return; }
  var fecha=(fEl&&fEl.value)||_vlHoy(); var det=(dEl&&dEl.value||'').trim();
  var rg=_vlRango(_vlMes,_vlQ);
  if(fecha<rg.ini||fecha>rg.fin){ showToast&&showToast('La fecha debe estar dentro de la quincena '+_vlRangoLbl(_vlMes,_vlQ)); return; }
  var _av=_vlAutorizarSiVac(emp,fecha,det); if(!_av.ok){ if(!_av.cancel)showToast&&showToast('Vale no registrado: falta la autorización'); return; } det=_av.det;
  _vlFechaVale=fecha;
  _vlBusy=true; var b=document.getElementById('vl-btn'); if(b){ b.disabled=true; b.textContent='Guardando…'; }
  try{
  supabaseClient.rpc('fn_vale_registrar',{ p_emp:emp.id, p_monto:monto, p_fecha:fecha, p_detalle:det, p_creado_por:(typeof currentUser!=='undefined'?currentUser:null), p_mes:_vlMes, p_q:_vlQ, p_cuotas:_vlCuotas })
    .then(function(res){
      _vlBusy=false;
      if(res&&res.error){ showToast&&showToast('No se pudo: '+(res.error.message||'')); if(b){b.disabled=false;} _vlRender(); return; }
      var d=res&&res.data; if(d&&typeof d==='string'){ try{ d=JSON.parse(d); }catch(e){} }
      if(!d||!d.ok){
        var msg='No se pudo registrar el vale';
        if(d&&d.reason==='excede') msg='⛔ Ese vale dejaría a '+emp.nombre+' sin cobrar en la quincena'+((d.disponible!=null)?(' (queda '+_vlMoney(d.disponible)+')'):'')+'. Baja el monto o repártelo en más quincenas.';
        else if(d&&d.reason==='sinsueldo') msg='Este empleado no tiene sueldo cargado. Avísale a Verónica (RRHH).';
        else if(d&&d.reason==='fecha_fuera') msg='La fecha no pertenece a la quincena seleccionada.';
        else if(d&&d.reason==='inactivo') msg='Ese empleado ya no está activo.';
        else if(d&&d.reason==='monto') msg='Monto inválido.';
        showToast&&showToast(msg); if(b){b.disabled=false;b.textContent='Solicitar vale';} _vlRender(); return;
      }
      _vlMovs.unshift({ id:d.id, tipo:'vale', empleado_id:d.empleado_id, empleado_nombre:d.empleado_nombre, empresa:d.empresa, monto:_vlN(d.monto), fecha:d.fecha, detalle:d.detalle, estado:d.estado||'espera', anulado:false, cuotas:Number(d.cuotas)||1 });
      if(typeof logAudit==='function') logAudit('vale.solicitar', emp.nombre+' · '+_vlMoney(monto)+(det?(' · '+det):''));
      if(mEl)mEl.value=''; if(dEl)dEl.value='';
      showToast&&showToast('✓ Vale en espera: '+emp.nombre+' '+_vlMoney(monto)+((Number(d.cuotas)||1)>1?(' · '+d.cuotas+' cuotas de '+_vlMoney(d.cuota)):''));
      _vlRender();
    }).catch(function(){ _vlBusy=false; showToast&&showToast('Error de red'); if(b){b.disabled=false;b.textContent='Solicitar vale';} });
  }catch(err){ _vlBusy=false; if(b){b.disabled=false;b.textContent='Solicitar vale';} showToast&&showToast('No se pudo registrar el vale'); }
}
function _vlEntregar(id){
  if(!_vlPuede())return;
  id=String(id);
  supabaseClient.from('empleado_movimientos').update({estado:'entregado'}).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('Error: '+(res.error.message||'')); return; }
    (_vlMovs||[]).forEach(function(m){ if(String(m.id)===id)m.estado='entregado'; });
    if(typeof logAudit==='function') logAudit('vale.entregar',''+id);
    showToast&&showToast('✓ Vale entregado'); _vlRender();
  });
}
function _vlAnular(id){
  if(!_vlPuede())return;
  id=String(id);
  var mv=(_vlMovs||[]).filter(function(m){ return String(m.id)===id; })[0];
  var quien=mv?(mv.empleado_nombre+' · '+_vlMoney(mv.monto)):'este movimiento';
  if(!confirm('¿Anular '+quien+'? No se puede deshacer.')) return;
  supabaseClient.from('empleado_movimientos').update({anulado:true}).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('Error: '+(res.error.message||'')); return; }
    _vlMovs=(_vlMovs||[]).filter(function(m){ return String(m.id)!==id; });
    if(typeof logAudit==='function') logAudit('vale.anular',''+id);
    showToast&&showToast('Anulado'); _vlRender();
  });
}
// ── Medicamentos (tope $50/mes) ───────────────────────────────
function _vlGuardarMed(){
  if(!_vlPuede()){ showToast&&showToast('No autorizado'); return; }
  if(_vlBusy) return;
  var emp=_vlEmp(_vlEmpSel); if(!emp){ showToast&&showToast('Elige un empleado'); return; }
  var mEl=document.getElementById('vl-mmonto'), dEl=document.getElementById('vl-mdet'), fEl=document.getElementById('vl-mfecha');
  var monto=_vlN(mEl&&mEl.value); if(monto<=0){ showToast&&showToast('Escribe un monto mayor a 0'); return; }
  var fecha=(fEl&&fEl.value)||_vlHoy();
  if(String(fecha).slice(0,7)!==_vlMes){ showToast&&showToast('La fecha debe ser del mes que estás viendo ('+_vlMes+')'); return; }
  _vlFechaMed=fecha;
  var det=(dEl&&dEl.value||'').trim();
  var _av=_vlAutorizarSiVac(emp,fecha,det); if(!_av.ok){ if(!_av.cancel)showToast&&showToast('Medicamento no registrado: falta la autorización'); return; } det=_av.det;
  var b=document.getElementById('vl-mbtn'); if(b){b.disabled=true;b.textContent='Guardando…';}
  var restaurar=function(){ if(b){ b.disabled=false; b.textContent='Registrar'; } };
  _vlBusy=true;
  try{
  supabaseClient.rpc('fn_medicamento_registrar',{ p_emp:emp.id, p_monto:monto, p_fecha:fecha, p_detalle:det, p_creado_por:(typeof currentUser!=='undefined'?currentUser:null) })
    .then(function(res){
      _vlBusy=false;
      if(res&&res.error){ showToast&&showToast('No se pudo: '+(res.error.message||'')); restaurar(); return; }
      var d=res&&res.data; if(d&&typeof d==='string'){ try{ d=JSON.parse(d); }catch(e){} }
      if(!d||!d.ok){
        var msg='No se pudo registrar el medicamento';
        if(d&&d.reason==='tope') msg='⛔ '+emp.nombre+' ya alcanzó el tope de $'+VL_TOPE_MED+' este mes';
        else if(d&&d.reason==='excede_tope') msg='⛔ Supera el tope: solo quedan '+_vlMoney(d.resta)+' de los $'+VL_TOPE_MED+' del mes';
        else if(d&&d.reason==='inactivo') msg='Ese empleado ya no está activo.';
        else if(d&&d.reason==='monto') msg='Monto inválido.';
        showToast&&showToast(msg); restaurar(); _vlRender(); return;
      }
      _vlMovs.unshift({ id:d.id, tipo:'medicamento', empleado_id:d.empleado_id, empleado_nombre:d.empleado_nombre, empresa:d.empresa,
                        monto:_vlN(d.monto), fecha:d.fecha, detalle:d.detalle, estado:'entregado', anulado:false });
      if(typeof logAudit==='function') logAudit('vale.medicamento', emp.nombre+' · '+_vlMoney(monto));
      if(mEl)mEl.value=''; if(dEl)dEl.value='';
      showToast&&showToast('✓ Medicamento registrado: '+emp.nombre+' '+_vlMoney(monto)+' · quedan '+_vlMoney(d.resta));
      _vlRender();
    }).catch(function(){ _vlBusy=false; showToast&&showToast('Error de red'); restaurar(); });
  }catch(err){ _vlBusy=false; restaurar(); showToast&&showToast('No se pudo registrar el medicamento'); }
}

// ── Render ─────────────────────────────────────────────────────
/* ── Submódulo: efectivo en Bs que sacan los jefes ── */
function _vlBs(x){ return (typeof fmt==='function'?fmt(_vlN(x),2):_vlN(x).toFixed(2))+' Bs'; }
function _vlBolivaresHTML(){
  var rg=_vlRango(_vlMes,_vlQ);
  var list=(_vlRetiros||[]).filter(function(r){ return _vlEnRango(r.fecha,_vlMes,_vlQ); });
  var totBs=list.reduce(function(s,r){return s+_vlN(r.monto_bs);},0);
  var totUsd=list.reduce(function(s,r){return s+_vlN(r.monto_usd);},0);
  var hoy=(_vlHoy()>=rg.ini&&_vlHoy()<=rg.fin)?_vlHoy():rg.fin;
  var tasa=0; try{ tasa=(typeof getTasa==='function'?Number(getTasa()):0)||0; }catch(e){}
  var inp='padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:14px;box-sizing:border-box';
  var kpi='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="tbox" style="padding:11px 13px;flex:1;min-width:150px;border-left:4px solid #7c3aed"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Efectivo Bs de jefes · esta quincena</div><div style="font-size:22px;font-weight:800;color:#7c3aed">'+_vlBs(totBs)+'</div>'+(totUsd>0?('<div style="font-size:11px;color:var(--muted)">≈ '+_vlMoney(totUsd)+'</div>'):'')+'</div></div>';
  var form=_vlPuede()?('<div class="tbox" style="padding:14px;margin-bottom:12px"><div style="font-weight:700;font-size:14px;margin-bottom:10px">➕ Registrar retiro de efectivo (Bs)</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'+
    '<label style="font-size:10px;color:var(--muted)">Jefe<input id="vl-ret-jefe" list="vl-ret-jefes" placeholder="ej. José" style="display:block;width:150px;margin-top:3px;'+inp+'"><datalist id="vl-ret-jefes"><option value="José"><option value="Nani"><option value="Miguel"></datalist></label>'+
    '<label style="font-size:10px;color:var(--muted)">Monto (Bs)<input id="vl-ret-bs" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0" style="display:block;width:130px;margin-top:3px;'+inp+';font-weight:700"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Tasa (opcional)<input id="vl-ret-tasa" type="number" min="0" step="0.01" value="'+(tasa||'')+'" style="display:block;width:100px;margin-top:3px;'+inp+'"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Fecha<input id="vl-ret-fecha" type="date" value="'+esc(hoy)+'"'+' style="display:block;margin-top:3px;'+inp+'"></label>'+
    '<label style="font-size:10px;color:var(--muted);flex:1;min-width:150px">Motivo (opcional)<input id="vl-ret-motivo" placeholder="para qué" style="display:block;width:100%;margin-top:3px;'+inp+'"></label>'+
    '<button class="btn btn-accent btn-sm" style="padding:10px 18px" onclick="_vlRegistrarRetiro()">Registrar</button>'+
    '</div><div style="font-size:10.5px;color:var(--muted);margin-top:7px">Es el efectivo en bolívares que sacan los jefes de la caja. Se lleva aparte para tenerlo controlado.</div></div>'):'';
  var rows=list.length?list.map(function(r){ return '<div class="tbox" style="padding:11px 13px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center;gap:10px"><div style="min-width:0"><div style="font-size:14px;font-weight:700">'+esc(r.jefe||'—')+' · '+_vlBs(r.monto_bs)+(_vlN(r.monto_usd)>0?(' <span style="font-size:11px;color:var(--muted)">≈ '+_vlMoney(r.monto_usd)+'</span>'):'')+'</div><div style="font-size:11px;color:var(--muted);margin-top:2px">'+String(r.fecha||'').slice(0,10)+(r.motivo?(' · '+esc(r.motivo)):'')+(r.creado_por?(' · '+esc(r.creado_por)):'')+'</div></div>'+(_vlPuede()?('<button onclick="_vlAnularRetiro('+r.id+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:16px">×</button>'):'')+'</div>'; }).join(''):'<div class="tbox" style="padding:22px;text-align:center;color:var(--muted)">Sin retiros de efectivo en esta quincena.</div>';
  return kpi+form+rows;
}
function _vlRegistrarRetiro(){ if(!_vlPuede())return; if(_vlBusy)return;
  var g=function(id){ var e=document.getElementById(id); return e?(e.value||'').trim():''; };
  var jefe=g('vl-ret-jefe'), bs=_vlN(g('vl-ret-bs')), tasa=_vlN(g('vl-ret-tasa')), fecha=g('vl-ret-fecha')||_vlHoy(), motivo=g('vl-ret-motivo');
  if(!jefe){ showToast&&showToast('¿Quién retiró? (jefe)'); return; }
  if(bs<=0){ showToast&&showToast('Indica el monto en Bs'); return; }
  var usd=(tasa>0)?Math.round(bs/tasa*100)/100:null;
  _vlBusy=true;
  supabaseClient.from('retiros_jefes_bs').insert([{jefe:jefe,monto_bs:bs,tasa:tasa||null,monto_usd:usd,fecha:fecha,motivo:motivo||null,creado_por:(typeof currentUser!=='undefined'?currentUser:null)}]).select('*').then(function(res){
    _vlBusy=false;
    if(res&&res.error){ showToast&&showToast('No se pudo guardar: '+(res.error.message||'')); return; }
    if(res&&res.data&&res.data[0])_vlRetiros.unshift(res.data[0]);
    if(typeof logAudit==='function')logAudit('vales.retiro_bs',jefe+' '+_vlBs(bs));
    _vlRender(); showToast&&showToast('✓ Retiro registrado');
  }).catch(function(){ _vlBusy=false; showToast&&showToast('Error de red'); });
}
function _vlAnularRetiro(id){ if(!_vlPuede())return; if(typeof confirm==='function'&&!confirm('¿Anular este retiro?'))return;
  supabaseClient.from('retiros_jefes_bs').update({anulado:true}).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo anular'); return; }
    _vlRetiros=(_vlRetiros||[]).filter(function(r){ return String(r.id)!==String(id); });
    if(typeof logAudit==='function')logAudit('vales.retiro_bs_anular',String(id)); _vlRender(); showToast&&showToast('Retiro anulado');
  });
}
function renderVales(){ _vlEntrar(); }
function _vlRender(){
  var c=document.getElementById('vales-content'); if(!c) return;
  if(!_vlPuede()){ c.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted)">No tienes acceso a este módulo.</div>'; return; }
  var header='<div style="max-width:960px;margin:0 auto 8px"><div style="font-weight:800;font-size:19px;display:flex;align-items:center;gap:8px">🧾 Vales y medicamentos</div>'+
    '<div style="font-size:12px;color:var(--muted);margin-top:2px">Anticipos con lista de espera y medicamentos (tope $50/mes). Aquí no se ven sueldos.</div></div>';
  var mesInput='<input type="month" value="'+esc(_vlMes||'')+'" onchange="_vlSetMes(this.value)" style="padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px">';
  var qBtns='<button class="fchip'+(_vlQ==='A'?' active':'')+'" onclick="_vlSetQ(\'A\')" style="font-size:12px">1ª (1–15)</button><button class="fchip'+(_vlQ==='B'?' active':'')+'" onclick="_vlSetQ(\'B\')" style="font-size:12px">2ª (16–fin)</button>';
  var periodo='<div style="max-width:960px;margin:0 auto 10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="font-size:12px;color:var(--muted);font-weight:700">Quincena:</span>'+mesInput+qBtns+'<span style="font-size:12px;color:var(--accent);font-weight:700">'+esc(_vlRangoLbl(_vlMes,_vlQ))+'</span><span style="flex:1"></span><button class="btn btn-ghost btn-sm" onclick="_vlRefrescar()">🔄</button></div>';
  var enEspera=(_vlMovs||[]).filter(function(m){ return m.tipo==='vale'&&m.estado==='espera'&&_vlEnRango(m.fecha,_vlMes,_vlQ); });
  var tabs='<div style="max-width:960px;margin:0 auto 12px;display:flex;gap:6px">'+
    '<button class="btn '+(_vlTab==='vales'?'btn-accent':'btn-ghost')+' btn-sm" onclick="_vlSetTab(\'vales\')">🧾 Vales'+(enEspera.length?(' <span style="background:#f59e0b;color:#fff;border-radius:999px;padding:0 7px;font-size:11px;margin-left:3px">'+enEspera.length+'</span>'):'')+'</button>'+
    '<button class="btn '+(_vlTab==='medicamentos'?'btn-accent':'btn-ghost')+' btn-sm" onclick="_vlSetTab(\'medicamentos\')">💊 Medicamentos</button>'+
    '<button class="btn '+(_vlTab==='bolivares'?'btn-accent':'btn-ghost')+' btn-sm" onclick="_vlSetTab(\'bolivares\')">💵 Efectivo jefes (Bs)</button></div>';
  var body;
  if(_vlLoading&&!_vlReady) body='<div style="padding:30px;text-align:center;color:var(--muted)">Cargando…</div>';
  else if(_vlTab==='vales') body=_vlValesHTML(enEspera);
  else if(_vlTab==='bolivares') body=_vlBolivaresHTML();
  else body=_vlMedHTML();
  c.innerHTML=header+periodo+tabs+'<div style="max-width:960px;margin:0 auto">'+body+'</div>';
}
function _vlEmpOptions(){
  var byEmp={}; (_vlEmpleados||[]).forEach(function(e){ var k=(e.empresa_nomina||e.empresa)||'OTROS'; (byEmp[k]||(byEmp[k]=[])).push(e); });
  var out='<option value="">— Elige empleado —</option>';
  var grupos=['FARMACIA','DROGUERIA'].concat(Object.keys(byEmp).filter(function(k){ return k!=='FARMACIA'&&k!=='DROGUERIA'; }));
  grupos.forEach(function(emp){ var list=byEmp[emp]||[]; if(!list.length)return; out+='<optgroup label="'+esc(emp||'Sin empresa')+'">'; list.forEach(function(e){ out+='<option value="'+e.id+'"'+(String(_vlEmpSel)===String(e.id)?' selected':'')+'>'+esc(e.nombre)+'</option>'; }); out+='</optgroup>'; });
  return out;
}
function _vlVacBanner(fecha){
  if(!_vlEmpSel)return '';
  var emp=_vlEmp(_vlEmpSel); if(!emp||!_vlEnVac(emp.id,fecha))return '';
  return '<div style="display:flex;gap:8px;align-items:center;background:#fffbeb;border:1px solid #fcd34d;border-radius:9px;padding:8px 11px;margin-bottom:8px;font-size:12px;color:#92400e"><span style="font-size:16px">🌴</span><span><b>'+esc(emp.nombre)+'</b> está de vacaciones en esa fecha. Al guardar te pedirá <b>quién lo autoriza</b>.</span></div>';
}
function _vlValesHTML(enEspera){
  var rg=_vlRango(_vlMes,_vlQ);
  var hoy=(_vlFechaVale>=rg.ini&&_vlFechaVale<=rg.fin)?_vlFechaVale:((_vlHoy()>=rg.ini&&_vlHoy()<=rg.fin)?_vlHoy():rg.fin);
  var lim=' min="'+rg.ini+'" max="'+rg.fin+'"';
  var pick='<div class="tbox" style="padding:14px;margin-bottom:12px"><div style="font-weight:700;font-size:14px;margin-bottom:10px">➕ Nuevo vale</div>'+
    '<select onchange="_vlSetEmp(this.value)" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:14px;margin-bottom:8px">'+_vlEmpOptions()+'</select>'+
    _vlVacBanner(hoy)+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'+
    '<label style="font-size:10px;color:var(--muted)">Monto ($)<input id="vl-monto" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" style="display:block;width:120px;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:16px;font-weight:700"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Fecha<input id="vl-fecha" type="date"'+lim+' value="'+hoy+'" style="display:block;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Descontar en<select onchange="_vlSetCuotas(this.value)" style="display:block;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">'+[1,2,3].map(function(n){ return '<option value="'+n+'"'+(_vlCuotas===n?' selected':'')+'>'+(n===1?'1 quincena':(n+' quincenas'))+'</option>'; }).join('')+'</select></label>'+'<label style="font-size:10px;color:var(--muted);flex:1;min-width:150px">Concepto (opcional)<input id="vl-det" type="text" placeholder="motivo" style="display:block;width:100%;box-sizing:border-box;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<button id="vl-btn" class="btn btn-accent btn-sm" style="padding:10px 18px" onclick="_vlSolicitar()">Solicitar vale</button></div>'+
    '<div style="font-size:10px;color:var(--muted);margin-top:7px">🔒 El sistema no deja dar un vale que deje a la persona sin cobrar en la quincena.</div></div>';
  // lista de espera (visual)
  var espHtml;
  if(!enEspera.length) espHtml='<div style="text-align:center;color:var(--muted);font-size:12px;padding:16px">No hay vales en espera. 🎉</div>';
  else espHtml=enEspera.map(function(m){ return '<div style="display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid #fcd34d;background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:12px;margin-bottom:8px">'+
      '<div style="width:38px;height:38px;border-radius:50%;background:#f59e0b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">🧾</div>'+
      '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.empleado_nombre)+' <span style="color:#b45309">· '+_vlMoney(m.monto)+'</span></div><div style="font-size:11px;color:#92400e">'+esc(String(m.fecha).slice(0,10))+(m.detalle?(' · '+esc(m.detalle)):'')+' · '+esc(m.empresa||'')+((Number(m.cuotas)||1)>1?(' · <b>'+m.cuotas+' cuotas de '+_vlMoney(_vlN(m.monto)/m.cuotas)+'</b>'):'')+'</div></div>'+
      '<button class="btn btn-green btn-sm" onclick="_vlEntregar(\''+m.id+'\')">✓ Entregar</button>'+
      '<button onclick="_vlAnular(\''+m.id+'\')" title="Anular" style="border:0;background:none;cursor:pointer;color:var(--red);font-size:20px">×</button>'+
    '</div>'; }).join('');
  var totEsp=enEspera.reduce(function(a,m){return a+_vlN(m.monto);},0);
  var esp='<div class="tbox" style="padding:14px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-weight:700;font-size:14px">⏳ Lista de espera</div><div style="font-size:12px;color:var(--muted)">'+enEspera.length+' vale'+(enEspera.length===1?'':'s')+' · '+_vlMoney(totEsp)+'</div></div>'+espHtml+'</div>';
  // entregados
  var entregados=(_vlMovs||[]).filter(function(m){ return m.tipo==='vale'&&m.estado==='entregado'&&_vlEnRango(m.fecha,_vlMes,_vlQ); });
  var entMas=(entregados.length>50)?('<div style="text-align:center;color:var(--muted);font-size:11px;padding:6px">Mostrando 50 de '+entregados.length+' · el total incluye todos</div>'):'';
  var entHtml=entregados.length? entregados.slice(0,50).map(function(m){ return '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border)"><span style="font-size:15px">✅</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.empleado_nombre)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(String(m.fecha).slice(0,10))+(m.detalle?(' · '+esc(m.detalle)):'')+'</div></div><div style="font-weight:700;font-size:13px;color:var(--green)">'+_vlMoney(m.monto)+'</div><button onclick="_vlAnular(\''+m.id+'\')" title="Anular" style="border:0;background:none;cursor:pointer;color:var(--red);font-size:15px">×</button></div>'; }).join('') : '<div style="text-align:center;color:var(--muted);font-size:12px;padding:10px">Aún no hay vales entregados esta quincena.</div>';
  var totEnt=entregados.reduce(function(a,m){return a+_vlN(m.monto);},0);
  var ent='<div class="tbox" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-weight:700;font-size:13px">Entregados</div><div style="font-size:12px;color:var(--muted)">'+_vlMoney(totEnt)+'</div></div>'+entMas+entHtml+'</div>';
  return pick+esp+ent;
}
function _vlMedHTML(){
  var emp=_vlEmp(_vlEmpSel);
  var mIni=_vlMes+'-01', mFin=_vlMes+'-'+String(_vlUltimoDia(_vlMes)).padStart(2,'0');
  var hoy=(_vlFechaMed>=mIni&&_vlFechaMed<=mFin)?_vlFechaMed:((_vlHoy()>=mIni&&_vlHoy()<=mFin)?_vlHoy():mFin);
  var lim=' min="'+mIni+'" max="'+mFin+'"';
  var usado=emp?_vlMedMes(emp.id):0, rest=VL_TOPE_MED-usado;
  var info=emp?('<div style="font-size:12px;margin-top:4px;color:'+(rest<=0?'var(--red)':(rest<15?'var(--amber)':'var(--muted)'))+'">'+esc(emp.nombre)+': usó '+_vlMoney(usado)+' de $'+VL_TOPE_MED+' este mes · quedan <b>'+_vlMoney(Math.max(0,rest))+'</b></div>'):'';
  var pick='<div class="tbox" style="padding:14px;margin-bottom:12px"><div style="font-weight:700;font-size:14px;margin-bottom:4px">💊 Registrar medicamento <span style="font-size:11px;color:var(--muted);font-weight:500">(tope $'+VL_TOPE_MED+'/mes)</span></div>'+info+
    '<select onchange="_vlSetEmp(this.value)" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:14px;margin:8px 0">'+_vlEmpOptions()+'</select>'+
    _vlVacBanner(hoy)+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'+
    '<label style="font-size:10px;color:var(--muted)">Monto ($)<input id="vl-mmonto" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" style="display:block;width:120px;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:16px;font-weight:700"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Fecha<input id="vl-mfecha" type="date"'+lim+' value="'+hoy+'" style="display:block;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<label style="font-size:10px;color:var(--muted);flex:1;min-width:150px">Producto (opcional)<input id="vl-mdet" type="text" placeholder="qué se llevó" style="display:block;width:100%;box-sizing:border-box;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<button id="vl-mbtn" class="btn btn-green btn-sm" style="padding:10px 18px" onclick="_vlGuardarMed()">Registrar</button></div></div>';
  var meds=(_vlMovs||[]).filter(function(m){ return m.tipo==='medicamento'&&_vlEnRango(m.fecha,_vlMes,_vlQ); });
  var medMas=(meds.length>60)?('<div style="text-align:center;color:var(--muted);font-size:11px;padding:6px">Mostrando 60 de '+meds.length+' · el total incluye todos</div>'):'';
  var list=meds.length? meds.slice(0,60).map(function(m){ return '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border)"><span style="font-size:15px">💊</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.empleado_nombre)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(String(m.fecha).slice(0,10))+(m.detalle?(' · '+esc(m.detalle)):'')+' · '+esc(m.empresa||'')+'</div></div><div style="font-weight:700;font-size:13px;color:#0891b2">'+_vlMoney(m.monto)+'</div><button onclick="_vlAnular(\''+m.id+'\')" title="Anular" style="border:0;background:none;cursor:pointer;color:var(--red);font-size:15px">×</button></div>'; }).join('') : '<div style="text-align:center;color:var(--muted);font-size:12px;padding:12px">Sin medicamentos esta quincena.</div>';
  var tot=meds.reduce(function(a,m){return a+_vlN(m.monto);},0);
  return pick+'<div class="tbox" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-weight:700;font-size:13px">Medicamentos de la quincena</div><div style="font-size:12px;color:var(--muted)">'+_vlMoney(tot)+'</div></div>'+medMas+list+'</div>';
}
