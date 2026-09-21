// ══════════════════════════════════════════════════════════════
// 28 · BANCO DE ANOMALÍAS (prefijo _ab)
// Roger y Jaime reportan cualquier anomalía interna; gerencia y
// el admin les hacen trazabilidad (abierta → investigando →
// resuelta). Un agente de IA revisa el banco cada semana y marca
// las recurrencias en recurrencia_nota.
// ══════════════════════════════════════════════════════════════
var _abRows=[], _abReady=false, _abLoading=false, _abBusy=false, _abFiltro='activas';
var AB_AREAS=['Caja','Inventario','Reto','Ya Pagué / Delivery','Turnos','Proveedores','Clientes','Sistema','Otro'];
var AB_SEV={baja:{lbl:'Baja',color:'#0369a1',bg:'#e0f2fe'},media:{lbl:'Media',color:'#b45309',bg:'#fef3c7'},alta:{lbl:'Alta',color:'#dc2626',bg:'#fee2e2'}};
var AB_EST={abierta:{lbl:'Abierta',color:'#dc2626',bg:'#fee2e2'},investigando:{lbl:'Investigando',color:'#b45309',bg:'#fef3c7'},resuelta:{lbl:'Resuelta',color:'#065f46',bg:'#d1fae5'}};
function _abHoy(){ try{ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _abGestiona(){ try{ return currentRole==='gerente'||currentRole==='admin'; }catch(e){ return false; } }
function _abReporta(){ try{ return _abGestiona()||currentRole==='reto'; }catch(e){ return false; } }
function _abFechaLbl(f){ f=String(f||'').slice(0,10); var p=f.split('-'); if(p.length!==3)return f; var M=['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return (+p[2])+' '+(M[+p[1]]||'')+' '+p[0]; }

function renderAnomalias(){ _abEntrar(); }
function _abEntrar(){ if(!_abReady){ _abCargar(); } else { _abRender(); } }
function _abCargar(){
  _abLoading=true; _abRender();
  supabaseClient.from('anomalias').select('*').order('id',{ascending:false}).limit(400).then(function(res){
    _abRows=(res&&res.data)||[]; _abLoading=false; _abReady=true; _abRender();
  }).catch(function(e){ console.warn('anomalias cargar',e); _abLoading=false; _abReady=true; _abRender(); });
}
function _abRefrescar(){ _abReady=false; _abCargar(); }
function _abSetFiltro(f){ _abFiltro=f; _abRender(); }

// Recurrencia local: mismas señales en los últimos 60 días
function _abRecurrencia(a){
  var lim=_abHoy().slice(0,10); var d=new Date(lim+'T12:00:00'); d.setDate(d.getDate()-60); var desde=d.toISOString().slice(0,10);
  var inv=String(a.involucrado||'').trim().toLowerCase();
  var n=0;
  (_abRows||[]).forEach(function(x){
    if(String(x.id)===String(a.id))return;
    if(String(x.fecha).slice(0,10)<desde)return;
    var xi=String(x.involucrado||'').trim().toLowerCase();
    if(inv&&xi&&xi===inv){ n++; return; }
    if(!inv&&x.area===a.area&&a.area)n++;
  });
  return n;
}

function _abReportar(){
  if(!_abReporta()){ showToast&&showToast('No autorizado'); return; }
  if(_abBusy)return;
  var g=function(id){ var el=document.getElementById(id); return (el&&el.value||'').trim(); };
  var titulo=g('ab-titulo'); if(!titulo){ showToast&&showToast('Escribe un título corto de la anomalía'); return; }
  var _supEl=document.getElementById('ab-supinf');
  var row={ fecha:g('ab-fecha')||_abHoy(), area:g('ab-area')||null, titulo:titulo, descripcion:g('ab-desc')||null,
    involucrado:g('ab-inv')||null, severidad:(['baja','media','alta'].indexOf(g('ab-sev'))>=0?g('ab-sev'):'media'),
    factura_ref:g('ab-factura')||null, supervisor_informado:!!(_supEl&&_supEl.checked), supervisor_nota:g('ab-supnota')||null,
    estado:'abierta', reportado_por:(typeof currentUser!=='undefined'?currentUser:null) };
  _abBusy=true;
  supabaseClient.from('anomalias').insert([row]).select('*').then(function(res){
    _abBusy=false;
    if(res&&res.error){ showToast&&showToast('No se pudo guardar: '+(res.error.message||'')); return; }
    if(res&&res.data&&res.data[0])_abRows.unshift(res.data[0]);
    if(typeof logAudit==='function')logAudit('anomalia.reportar',titulo);
    var rec=res&&res.data&&res.data[0]?_abRecurrencia(res.data[0]):0;
    showToast&&showToast(rec>0?('⚠️ Reportada. OJO: ya van '+(rec+1)+' parecidas en 60 días.'):'✓ Anomalía reportada. Gerencia la verá.');
    _abRender();
  }).catch(function(){ _abBusy=false; showToast&&showToast('Error de red'); });
}
function _abSupervisor(id){
  if(!_abGestiona()){ showToast&&showToast('Solo gerencia puede marcar esto'); return; }
  var a=(_abRows||[]).filter(function(x){ return String(x.id)===String(id); })[0]; if(!a)return;
  var nota=prompt('¿Qué se le informó al supervisor? (opcional)', a.supervisor_nota||'');
  if(nota===null)return;
  supabaseClient.from('anomalias').update({supervisor_informado:true,supervisor_nota:(nota||'').trim()||null}).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo guardar'); return; }
    a.supervisor_informado=true; a.supervisor_nota=(nota||'').trim()||null;
    if(typeof logAudit==='function')logAudit('anomalia.supervisor',a.titulo||''); _abRender(); showToast&&showToast('✓ Supervisor al tanto');
  }).catch(function(){ showToast&&showToast('Error de red'); });
}
function _abEstado(id,estado){
  if(!_abGestiona()){ showToast&&showToast('Solo gerencia puede cambiar el estado'); return; }
  var a=(_abRows||[]).filter(function(x){ return String(x.id)===String(id); })[0]; if(!a)return;
  var upd={estado:estado};
  if(estado==='resuelta'){
    var r=prompt('¿Cómo se resolvió esta anomalía?\n\n'+(a.titulo||''), a.resolucion||'');
    if(r===null)return;
    upd.resolucion=String(r).trim()||null; upd.resuelto_por=(typeof currentUser!=='undefined'?currentUser:null); upd.resuelto_en=new Date().toISOString();
  }
  supabaseClient.from('anomalias').update(upd).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    Object.keys(upd).forEach(function(k){ a[k]=upd[k]; });
    if(typeof logAudit==='function')logAudit('anomalia.'+estado,a.titulo||String(id));
    _abRender();
  });
}
function _abDel(id){
  try{ if(currentRole!=='admin'){ showToast&&showToast('Solo el administrador puede borrar'); return; } }catch(e){ return; }
  if(!confirm('¿Borrar esta anomalía del banco? Se pierde su historia.'))return;
  supabaseClient.from('anomalias').delete().eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo borrar'); return; }
    _abRows=_abRows.filter(function(x){ return String(x.id)!==String(id); }); _abRender();
  });
}

// ── Amonestación → nómina de Verónica ─────────────────────────
var _abEmpleados=null;
function _abMesHoy(){ return _abHoy().slice(0,7); }
function _abQuincenaHoy(){ return (parseInt(_abHoy().slice(8,10),10)>=16)?'B':'A'; }
function _abAmonestar(id){
  if(!_abGestiona()){ showToast&&showToast('Solo gerencia amonesta'); return; }
  var a=(_abRows||[]).filter(function(x){ return String(x.id)===String(id); })[0]; if(!a)return;
  var abrir=function(){
    var emps=(_abEmpleados||[]).filter(function(e){ return e.activo!==false; });
    var inv=String(a.involucrado||'').trim().toLowerCase();
    var opts='<option value="">— Elige al empleado —</option>'+emps.map(function(e){ var sel=(inv&&String(e.nombre||'').toLowerCase().indexOf(inv)>=0)?' selected':''; return '<option value="'+e.id+'"'+sel+'>'+esc(e.nombre)+'</option>'; }).join('');
    var inp='width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:14px;margin-top:3px';
    var d=document.createElement('div'); d.id='ab-modal';
    d.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto';
    d.innerHTML='<div style="background:var(--surface);border-radius:16px;max-width:min(480px,95vw);width:100%;box-shadow:0 24px 64px rgba(0,0,0,.32);padding:16px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:15px">💸 Amonestar</b><button onclick="_abCerrarModal()" style="border:0;background:var(--surface2);width:30px;height:30px;border-radius:50%;font-size:17px;cursor:pointer;color:var(--muted)">×</button></div>'+
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:10px">Se descuenta en la nómina de Verónica en la quincena que elijas. Anomalía: <b>'+esc(a.titulo||'')+'</b></div>'+
      '<label style="font-size:10px;color:var(--muted);font-weight:700;display:block">Empleado<select id="ab-am-emp" style="'+inp+'">'+opts+'</select></label>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:9px">'+
      '<label style="font-size:10px;color:var(--muted);font-weight:700;display:block">Monto $<input id="ab-am-monto" type="number" step="0.01" placeholder="0.00" style="'+inp+'"></label>'+
      '<label style="font-size:10px;color:var(--muted);font-weight:700;display:block">Mes<input id="ab-am-mes" type="month" value="'+_abMesHoy()+'" style="'+inp+'"></label>'+
      '<label style="font-size:10px;color:var(--muted);font-weight:700;display:block">Quincena<select id="ab-am-q" style="'+inp+'"><option value="A"'+(_abQuincenaHoy()==='A'?' selected':'')+'>1ª (1–15)</option><option value="B"'+(_abQuincenaHoy()==='B'?' selected':'')+'>2ª (16–fin)</option></select></label>'+
      '</div>'+
      '<label style="font-size:10px;color:var(--muted);font-weight:700;display:block;margin-top:9px">Motivo<input id="ab-am-motivo" value="'+esc(a.titulo||'')+'" style="'+inp+'"></label>'+
      '<button class="btn btn-accent" style="width:100%;padding:11px;margin-top:12px" onclick="_abGuardarAmonest('+a.id+')">Aplicar amonestación</button></div>';
    d.addEventListener('click',function(e){ if(e.target===d)_abCerrarModal(); });
    document.body.appendChild(d);
  };
  if(_abEmpleados){ abrir(); return; }
  supabaseClient.from('empleados').select('id,nombre,empresa,empresa_nomina,activo').order('nombre').then(function(r){ _abEmpleados=(r&&r.data)||[]; abrir(); }).catch(function(){ _abEmpleados=[]; abrir(); });
}
function _abCerrarModal(){ var d=document.getElementById('ab-modal'); if(d)d.remove(); }
function _abGuardarAmonest(id){
  var a=(_abRows||[]).filter(function(x){ return String(x.id)===String(id); })[0]; if(!a)return;
  var g=function(x){ var el=document.getElementById(x); return el?el.value:''; };
  var empId=g('ab-am-emp'); if(!empId){ showToast&&showToast('Elige al empleado'); return; }
  var monto=Number(String(g('ab-am-monto')).replace(',','.'))||0; if(monto<=0){ showToast&&showToast('Escribe el monto a descontar'); return; }
  var emp=(_abEmpleados||[]).filter(function(e){ return String(e.id)===String(empId); })[0]||{};
  var row={ empleado_id:Number(empId), empleado_nombre:emp.nombre||null, empresa:(emp.empresa_nomina||emp.empresa||null),
    mes:g('ab-am-mes')||_abMesHoy(), quincena:(g('ab-am-q')==='A'?'A':'B'), monto:monto, motivo:g('ab-am-motivo')||a.titulo||null,
    anomalia_id:a.id, creado_por:(typeof currentUser!=='undefined'?currentUser:null) };
  supabaseClient.from('nomina_amonestaciones').insert([row]).select('*').then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo aplicar: '+(res.error.message||'')); return; }
    var am=res&&res.data&&res.data[0];
    supabaseClient.from('anomalias').update({amonestacion_id:(am?am.id:null),empleado_id:Number(empId)}).eq('id',a.id).then(function(){
      a.amonestacion_id=(am?am.id:null); a.empleado_id=Number(empId); a._amonest=row;
      if(typeof logAudit==='function')logAudit('anomalia.amonestar',(emp.nombre||'')+' $'+monto+' '+row.mes+' Q'+row.quincena);
      _abCerrarModal(); showToast&&showToast('💸 Amonestación aplicada. Verónica la verá en la nómina.'); _abRender();
    });
  }).catch(function(){ showToast&&showToast('Error de red'); });
}
function _abQuitarAmonest(id){
  if(!_abGestiona())return;
  var a=(_abRows||[]).filter(function(x){ return String(x.id)===String(id); })[0]; if(!a||!a.amonestacion_id)return;
  if(!confirm('¿Quitar la amonestación? Deja de descontarse en nómina.'))return;
  supabaseClient.from('nomina_amonestaciones').delete().eq('id',a.amonestacion_id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo quitar'); return; }
    supabaseClient.from('anomalias').update({amonestacion_id:null}).eq('id',a.id).then(function(){
      a.amonestacion_id=null; a._amonest=null;
      if(typeof logAudit==='function')logAudit('anomalia.amonestar_quitar',String(id));
      showToast&&showToast('Amonestación retirada'); _abRender();
    });
  });
}
function _abInp(){ return 'padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px;box-sizing:border-box;width:100%'; }
function _abLbl(t,inner){ return '<label style="font-size:10px;color:var(--muted);font-weight:700;display:block">'+t+'<div style="margin-top:3px">'+inner+'</div></label>'; }
function _abFormHTML(){
  if(!_abReporta())return '';
  return '<div class="tbox" style="padding:13px;margin-bottom:14px"><div style="font-weight:800;font-size:13px;margin-bottom:4px">🚨 Reportar anomalía</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-bottom:9px">Cualquier cosa que no cuadre o salga mal en la operación: repórtala aquí para que quede el rastro y gerencia le haga seguimiento.</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">'+
    _abLbl('Fecha','<input id="ab-fecha" type="date" value="'+_abHoy()+'" style="'+_abInp()+'">')+
    _abLbl('Área','<select id="ab-area" style="'+_abInp()+'">'+AB_AREAS.map(function(a){ return '<option>'+a+'</option>'; }).join('')+'</select>')+
    _abLbl('Gravedad','<select id="ab-sev" style="'+_abInp()+'"><option value="baja">Baja</option><option value="media" selected>Media</option><option value="alta">Alta</option></select>')+
    _abLbl('Involucrado (opcional)','<input id="ab-inv" placeholder="persona / proveedor / caja" style="'+_abInp()+'">')+
    _abLbl('Factura (si aplica)','<input id="ab-factura" placeholder="N° de factura" style="'+_abInp()+'">')+
    '</div><div style="margin-top:8px">'+
    _abLbl('Título corto','<input id="ab-titulo" placeholder="ej: Faltó mercancía del pedido de Cofasa" style="'+_abInp()+'">')+
    '</div><div style="margin-top:8px">'+
    _abLbl('¿Qué pasó?','<textarea id="ab-desc" rows="3" placeholder="cuenta lo que pasó con detalle" style="'+_abInp()+';resize:vertical"></textarea>')+
    '</div><div style="margin-top:9px;background:var(--surface2);border-radius:8px;padding:9px 11px">'+
    '<label style="font-size:12.5px;display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700"><input type="checkbox" id="ab-supinf" style="width:16px;height:16px"> 👤 Poner al supervisor al tanto</label>'+
    '<input id="ab-supnota" placeholder="¿qué se le dijo al supervisor? (opcional)" style="'+_abInp()+';margin-top:7px">'+
    '</div><div style="text-align:right;margin-top:9px"><button class="btn btn-accent btn-sm" style="padding:9px 18px" onclick="_abReportar()">Reportar</button></div></div>';
}
function _abCardHTML(a){
  var sev=AB_SEV[a.severidad]||AB_SEV.media, est=AB_EST[a.estado]||AB_EST.abierta;
  var rec=_abRecurrencia(a);
  var gestiona=_abGestiona();
  var chips='<span style="background:'+sev.bg+';color:'+sev.color+';border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:800">'+sev.lbl+'</span> '+
    '<span style="background:'+est.bg+';color:'+est.color+';border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:800">'+est.lbl+'</span>'+
    (a.area?(' <span style="background:var(--surface2);border:1px solid var(--border);border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:700">'+esc(a.area)+'</span>'):'')+
    (rec>0?(' <span style="background:#fdf2f8;color:#be185d;border:1px solid #fbcfe8;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:800" title="Casos parecidos en los últimos 60 días">🔁 recurrente ×'+(rec+1)+'</span>'):'');
  var botones='';
  if(gestiona){
    botones='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+
      (a.estado==='abierta'?'<button class="btn btn-sm" style="background:#f59e0b;color:#fff;border:0;padding:5px 12px" onclick="_abEstado('+a.id+',\'investigando\')">🔍 Investigando</button>':'')+
      (a.estado!=='resuelta'?'<button class="btn btn-sm" style="background:var(--green);color:#fff;border:0;padding:5px 12px" onclick="_abEstado('+a.id+',\'resuelta\')">✓ Resolver</button>':'')+
      (!a.supervisor_informado?'<button class="btn btn-sm" style="background:#1d4ed8;color:#fff;border:0;padding:5px 12px" onclick="_abSupervisor('+a.id+')">👤 Avisar supervisor</button>':'')+
      (!a.amonestacion_id?'<button class="btn btn-sm" style="background:#7c2d12;color:#fff;border:0;padding:5px 12px" onclick="_abAmonestar('+a.id+')">💸 Amonestar</button>':'<button class="btn btn-ghost btn-sm" style="padding:5px 12px;color:var(--red)" onclick="_abQuitarAmonest('+a.id+')">Quitar amonestación</button>')+
      '</div>';
  }
  return '<div class="tbox" style="padding:12px 14px;margin-bottom:10px'+(a.severidad==='alta'&&a.estado!=='resuelta'?';border-left:4px solid #dc2626':'')+'">'+
    '<div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1;min-width:0">'+
    '<div style="font-size:13.5px;font-weight:800">'+esc(a.titulo||'')+'</div>'+
    '<div style="margin:5px 0 3px">'+chips+'</div>'+
    (a.descripcion?('<div style="font-size:12px;color:var(--text);margin-top:4px">'+esc(a.descripcion)+'</div>'):'')+
    (a.involucrado?('<div style="font-size:11.5px;color:var(--muted);margin-top:3px">Involucrado: <b>'+esc(a.involucrado)+'</b></div>'):'')+
    (a.factura_ref?('<div style="font-size:11.5px;color:var(--muted);margin-top:3px">🧾 Factura: <b>'+esc(a.factura_ref)+'</b></div>'):'')+
    (a.recurrencia_nota?('<div style="font-size:11.5px;background:#fdf2f8;color:#9d174d;border-radius:8px;padding:6px 9px;margin-top:6px">🤖 '+esc(a.recurrencia_nota)+'</div>'):'')+
    _abExpedienteHTML(a)+
    botones+'</div>'+
    ((typeof currentRole!=='undefined'&&currentRole==='admin')?('<button onclick="_abDel('+a.id+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:15px">×</button>'):'')+
    '</div></div>';
}
/* Expediente: el proceso completo de una anomalía, paso a paso y en orden.
   Responde "¿dónde queda registrado todo?": aquí, con quién y cuándo. */
function _abExpedienteHTML(a){
  var p=[];
  p.push({ok:true,tx:'Reportada el '+_abFechaLbl(a.fecha)+' por '+esc(a.reportado_por||'?')});
  p.push({ok:!!a.supervisor_informado,tx:a.supervisor_informado?('Supervisor al tanto'+(a.supervisor_nota?(': '+esc(a.supervisor_nota)):'')):'Supervisor a\u00fan sin avisar'});
  var inv=(a.estado==='investigando'||a.estado==='resuelta');
  p.push({ok:inv,tx:inv?'En investigaci\u00f3n por gerencia':'Sin investigar todav\u00eda'});
  var res=(a.estado==='resuelta');
  p.push({ok:res,tx:res?('Resuelta'+(a.resuelto_en?(' el '+_abFechaLbl(String(a.resuelto_en).slice(0,10))):'')+(a.resuelto_por?(' por '+esc(a.resuelto_por)):'')+(a.resolucion?(' \u2014 \u201c'+esc(a.resolucion)+'\u201d'):'')):'Pendiente de resoluci\u00f3n'});
  if(a.amonestacion_id)p.push({ok:true,tx:'Amonestaci\u00f3n aplicada \u2014 se descuenta en la n\u00f3mina de Ver\u00f3nica'});
  return '<div style="margin-top:7px;background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:8px 11px">'+
    '<div style="font-size:9.5px;color:var(--muted);font-weight:800;letter-spacing:.4px;margin-bottom:4px">EXPEDIENTE \u00b7 todo queda registrado aqu\u00ed</div>'+
    p.map(function(x,i){ return '<div style="font-size:11.5px;line-height:1.6;color:'+(x.ok?'var(--text)':'var(--muted)')+'">'+(x.ok?'\u2713':'\u25CB')+' '+(i+1)+'. '+x.tx+'</div>'; }).join('')+
    '</div>';
}

function _abRender(){
  var c=document.getElementById('anomalias-content'); if(!c)return;
  if(_abLoading&&!_abReady){ c.innerHTML='<div style="padding:20px;color:var(--muted)">Cargando banco de anomalías…</div>'; return; }
  var gestiona=_abGestiona();
  var rows=(_abRows||[]).slice();
  if(!gestiona){ // Roger y Jaime solo ven lo que ellos reportaron
    var yo=(typeof currentUser!=='undefined'?String(currentUser).toLowerCase():'');
    rows=rows.filter(function(a){ return String(a.reportado_por||'').toLowerCase()===yo; });
  }
  var abiertas=rows.filter(function(a){ return a.estado!=='resuelta'; }).length;
  var nAb=rows.filter(function(a){ return a.estado==='abierta'; }).length;
  var nInv=rows.filter(function(a){ return a.estado==='investigando'; }).length;
  var nRes=rows.filter(function(a){ return a.estado==='resuelta'; }).length;
  var lista=rows;
  if(gestiona){
    if(_abFiltro==='activas')lista=rows.filter(function(a){ return a.estado!=='resuelta'; });
    else if(_abFiltro==='investigando')lista=rows.filter(function(a){ return a.estado==='investigando'; });
    else if(_abFiltro==='resueltas')lista=rows.filter(function(a){ return a.estado==='resuelta'; });
  }
  var fchip=function(k,lbl){ var act=(_abFiltro===k); return '<button onclick="_abSetFiltro(\''+k+'\')" style="border:1.5px solid '+(act?'var(--accent)':'var(--border)')+';background:'+(act?'var(--accent)':'var(--surface)')+';color:'+(act?'#fff':'var(--muted)')+';border-radius:999px;padding:5px 13px;font-size:12px;font-weight:700;cursor:pointer">'+lbl+'</button>'; };
  var barra=gestiona?('<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:11px">'+
    fchip('activas','Activas'+(abiertas?(' ('+abiertas+')'):''))+fchip('investigando','Investigando'+(nInv?(' ('+nInv+')'):''))+fchip('resueltas','Resueltas'+(nRes?(' ('+nRes+')'):''))+fchip('todas','Todas')+
    '<span style="flex:1"></span><button class="btn btn-ghost btn-sm" onclick="_abRefrescar()">🔄</button></div>'):'';
  var vacio='<div class="tbox" style="padding:18px;text-align:center;color:var(--muted);font-size:12.5px">'+(gestiona?'Sin anomalías'+(_abFiltro==='activas'?' activas':'')+'. 🎉':'Todavía no has reportado ninguna anomalía.')+'</div>';
  var cajaP=function(lbl,n,col,bg){ return '<div class="tbox" style="padding:10px 12px;text-align:center;border-radius:11px"><div style="font-size:10px;font-weight:800;color:'+col+';background:'+bg+';border-radius:999px;padding:2px 8px;display:inline-block">'+lbl+'</div><div style="font-size:22px;font-weight:800;margin-top:3px">'+n+'</div></div>'; };
  var pipe=gestiona?('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">'+cajaP('① ABIERTAS',nAb,'#dc2626','#fee2e2')+cajaP('② INVESTIGANDO',nInv,'#b45309','#fef3c7')+cajaP('③ RESUELTAS',nRes,'#065f46','#d1fae5')+'</div>'):'';
  c.innerHTML='<h2 style="margin:2px 0 4px;font-size:19px">🚨 Banco de anomalías</h2>'+
    '<div style="font-size:11.5px;color:var(--muted);margin-bottom:12px">'+(gestiona?'El proceso siempre es el mismo: <b>① se reporta → ② gerencia investiga → ③ se resuelve</b> (y se amonesta si toca). Cada anomalía guarda su expediente completo — quién reportó, cuándo, el aviso al supervisor, cómo se resolvió y la amonestación — y nada se borra al resolver: el histórico vive en “Resueltas” y “Todas”. El agente de IA revisa el banco cada lunes y marca lo que se repite.':'Reporta cualquier anomalía interna. Gerencia le hará seguimiento y aquí ves en qué va lo tuyo.')+'</div>'+
    pipe+_abFormHTML()+barra+(lista.length?lista.map(_abCardHTML).join(''):vacio);
}
