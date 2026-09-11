// ══════════════════════════════════════════════════════════════
// 27 · YA PAGUÉ (prefijo _yp) — lo maneja María Inés
// PEDIDO ÚNICO: nace en la caja YaPagué (o aquí) como pickup o
// delivery y fluye por estados: por llegar → pendiente → entregado.
// Pickups con código interno de retiro. Deliveries con datos del
// viaje Ridery y control de cuándo Ridery cobra el fondo.
// Créditos de MARA/NIVAR, diario de actividad y fondo Ridery.
// ══════════════════════════════════════════════════════════════
var _ypTab='pedidos', _ypPedidos=[], _ypRecargas=[], _ypCreditos=[], _ypReady=false, _ypLoading=false, _ypBusy=false;
var _ypFiltro='board', _ypEditId=null, _ypDia=null, _ypCredSel='MARA', _ypFormTipo='pickup', _ypQ='', _ypFormOpen=false;
var YP_ALERTA_MIN=20;
var YP_MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _ypN(x){ var n=(typeof numComa==='function')?numComa(x):Number(String(x==null?'':x).replace(',','.')); return isNaN(n)?0:n; }
function _ypMoney(x){ return '$ '+((typeof fmt==='function')?fmt(_ypN(x),2):_ypN(x).toFixed(2)); }
function _ypHoy(){ try{ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _ypPuede(){ try{ return ['yapague','supervisor','angelica','mayra','admin'].indexOf(currentRole)>=0; }catch(e){ return false; } }
function _ypPuedeFondo(){ try{ return ['mayra','admin'].indexOf(currentRole)>=0; }catch(e){ return false; } }
function _ypEsAdmin(){ try{ return currentRole==='admin'; }catch(e){ return false; } }
function _ypFechaLbl(f){ f=String(f||'').slice(0,10); var p=f.split('-'); if(p.length!==3)return f; return (+p[2])+' '+(YP_MESES[(+p[1])-1]||'').slice(0,3)+(String(_ypHoy()).slice(0,4)!==p[0]?(' '+p[0]):''); }
function _ypFechaVE(ts){ try{ var t=Date.parse(ts); if(isNaN(t))return String(ts||'').slice(0,10); return new Date(t-4*3600*1000).toISOString().slice(0,10); }catch(e){ return String(ts||'').slice(0,10); } }
function _ypHora(ts){ try{ return new Date(ts).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
function _ypCodigo(){ var abc='ABCDEFGHJKMNPQRSTUVWXYZ23456789', c='YP-'; for(var i=0;i<4;i++)c+=abc[Math.floor(Math.random()*abc.length)]; return c; }

// Fondo: solo descuenta lo que Ridery YA cobró
function _ypSaldo(){ var r=0,g=0; (_ypRecargas||[]).forEach(function(x){ r+=_ypN(x.monto); }); (_ypPedidos||[]).forEach(function(p){ if(p.tipo==='delivery'&&p.cobrado_ridery) g+=_ypN(p.costo); }); return r-g; }
function _ypSinCobrar(){ var n=0,t=0; (_ypPedidos||[]).forEach(function(p){ if(p.tipo==='delivery'&&!p.cobrado_ridery&&_ypN(p.costo)>0){ n++; t+=_ypN(p.costo); } }); return {n:n,total:t}; }
function _ypCredSaldo(emp){ emp=String(emp).toUpperCase(); var f=0,a=0; (_ypCreditos||[]).forEach(function(c){ if(String(c.empresa_cliente).toUpperCase()!==emp)return; if(c.tipo==='factura'){ if(c.vigente===false)return; f+=_ypN(c.monto); } else a+=_ypN(c.monto); }); return {facturado:f,abonado:a,deben:_ypR2(f-a)}; }
function _ypR2(n){ return Math.round((Number(n)||0)*100)/100; }
function _ypCredAncla(emp){ emp=String(emp||'').toUpperCase(); return emp==='MARA'||emp==='NIVAR'; }
function _ypCred(id){ return (_ypCreditos||[]).filter(function(x){ return String(x.id)===String(id); })[0]; }
// Tasa Bs/$ para una fecha, usando el sistema de tasas del sistema (db.tasas / getTasaForFecha)
function _ypTasaFecha(fecha){ try{ if(fecha&&typeof getTasaForFecha==='function'){ var t=Number(getTasaForFecha(fecha)); if(t>0)return t; } if(typeof getTasa==='function'){ var g=Number(getTasa()); if(g>0)return g; } if(typeof db!=='undefined'&&db&&db.settings&&Number(db.settings.tasa)>0)return Number(db.settings.tasa); }catch(e){} return 0; }
function _ypFmtBs(x){ return ((typeof fmt==='function')?fmt(_ypN(x),2):_ypN(x).toFixed(2))+' Bs'; }
// Lo que falta por pagar de una factura (en $ anclados)
function _ypFactFalta(fId){ var fx=_ypCred(fId); if(!fx)return 0; var pag=0; (_ypCreditos||[]).forEach(function(c){ if(c.tipo==='abono'&&String(c.aplica_a)===String(fId))pag+=_ypN(c.monto); }); return _ypR2(_ypN(fx.monto)-pag); }
function _ypFacturasAbiertas(emp){ emp=String(emp).toUpperCase(); return (_ypCreditos||[]).filter(function(c){ return c.tipo==='factura'&&c.vigente!==false&&String(c.empresa_cliente).toUpperCase()===emp; }); }
function _ypCredEmps(){ var out=['MARA','NIVAR']; (_ypCreditos||[]).forEach(function(c){ var e=String(c.empresa_cliente||'').toUpperCase(); if(e&&out.indexOf(e)<0)out.push(e); }); return out; }

function renderYaPague(){ _ypEntrar(); }
function _ypEntrar(){ if(_ypReady){ _ypRender(); } _ypCargar(); }
function _ypCargar(){
  _ypLoading=true; _ypRender();
  Promise.all([
    supabaseClient.from('yapague_pedidos').select('*').order('id',{ascending:false}).limit(500),
    supabaseClient.from('yapague_recargas').select('*').order('fecha',{ascending:false}).order('id',{ascending:false}).limit(200),
    supabaseClient.from('yapague_creditos').select('*').order('fecha',{ascending:false}).order('id',{ascending:false}).limit(400)
  ]).then(function(res){
    _ypPedidos=(res[0]&&res[0].data)||[];
    _ypRecargas=(res[1]&&res[1].data)||[];
    _ypCreditos=(res[2]&&res[2].data)||[];
    _ypLoading=false; _ypReady=true; _ypRender(); _ypAlertaChk(false);
  }).catch(function(e){ console.warn('yapague cargar',e); _ypLoading=false; _ypReady=true; _ypRender(); });
}
function _ypRefrescar(){ _ypReady=false; _ypCargar(); }
function _ypSetTab(t){ _ypTab=t; _ypEditId=null; _ypRender(); }
function _ypSetFiltro(f){ _ypFiltro=f; _ypRender(); }
function _ypPed(id){ return (_ypPedidos||[]).filter(function(x){ return String(x.id)===String(id); })[0]; }

// ── Registrar / editar pedido desde el módulo ─────────────────
function _ypFormTipoSet(t){ _ypFormTipo=t; _ypRender(); }
function _ypGuardarPedido(){
  if(!_ypPuede()){ showToast&&showToast('No autorizado'); return; }
  if(_ypBusy)return;
  var g=function(id){ var el=document.getElementById(id); return (el&&el.value||'').trim(); };
  var ch=function(id){ var el=document.getElementById(id); return !!(el&&el.checked); };
  var cliente=g('yp-cliente'); if(!cliente){ showToast&&showToast('Escribe el nombre del cliente'); return; }
  var tipo=_ypFormTipo, porLlegar=ch('yp-porllegar');
  if(tipo==='delivery'&&!g('yp-dir')){ showToast&&showToast('Escribe la dirección del delivery'); return; }
  var cred=g('yp-cred'); var monto=_ypN(g('yp-monto'));
  if(cred&&monto<=0&&!_ypEditId){ showToast&&showToast('Si es a crédito, escribe el monto total'); return; }
  var row={ tipo:tipo, empresa:((tipo==='pickup')?'FARMACIA':(g('yp-emp')==='DROGUERIA'?'DROGUERIA':'FARMACIA')),
    cliente:cliente, telefono:g('yp-tel')||null, direccion:g('yp-dir')||null, descripcion:g('yp-desc')||null,
    factura:g('yp-fact')||null, comprobante_pago:g('yp-comp')||null, monto:(monto>0?monto:null),
    credito_empresa:(cred?cred.toUpperCase():null), origen:g('yp-origen')||null,
    llega_estimado:g('yp-llega')||null, fecha:g('yp-fecha')||_ypHoy(),
    num_viaje:g('yp-num')||null, chofer:g('yp-chofer')||null,
    costo:_ypN(g('yp-costo')), envio:(g('yp-envio')==='gratis'?'gratis':'pago') };
  if(!_ypEditId)row.responsable=(typeof currentUser!=='undefined'?currentUser:null); // firma automática por la sesión
  _ypBusy=true;
  if(_ypEditId){
    var prev=_ypPed(_ypEditId);
    supabaseClient.from('yapague_pedidos').update(row).eq('id',_ypEditId).select('*').then(function(res){
      _ypBusy=false;
      if(res&&res.error){ showToast&&showToast('No se pudo guardar: '+(res.error.message||'')); return; }
      if(res&&res.data&&res.data[0]){ var i=_ypPedidos.indexOf(prev); if(i>=0)_ypPedidos[i]=res.data[0]; }
      if(typeof logAudit==='function')logAudit('yapague.editar',cliente+' #'+_ypEditId);
      _ypEditId=null; showToast&&showToast('✓ Pedido actualizado'); _ypRender();
    }).catch(function(){ _ypBusy=false; showToast&&showToast('Error de red'); });
    return;
  }
  _ypBusy=false; showToast&&showToast('Los pedidos nuevos se registran desde la caja YaPagué'); return;
  /* creación desde el módulo deshabilitada a propósito */
  row.por_llegar=porLlegar; row.estado=porLlegar?'por_llegar':'pendiente';
  row.creado_por=(typeof currentUser!=='undefined'?currentUser:null);
  row.facturado_por=row.creado_por; row.caja='Módulo Ya Pagué';
  if(tipo==='pickup')row.codigo=_ypCodigo();
  supabaseClient.from('yapague_pedidos').insert([row]).select('*').then(function(res){
    if(res&&res.error&&String(res.error.message||'').indexOf('codigo')>=0){ row.codigo=_ypCodigo(); return supabaseClient.from('yapague_pedidos').insert([row]).select('*'); }
    return res;
  }).then(function(res){
    _ypBusy=false;
    if(res&&res.error){ showToast&&showToast('No se pudo guardar: '+(res.error.message||'')); return; }
    var d=res&&res.data&&res.data[0]; if(d)_ypPedidos.unshift(d);
    if(d&&d.credito_empresa&&_ypN(d.monto)>0){
      supabaseClient.from('yapague_creditos').insert([{empresa_cliente:d.credito_empresa,tipo:'factura',monto:_ypN(d.monto),factura:d.factura||null,nota:'Pedido Ya Pagué '+(d.codigo||('#'+d.id)),creado_por:row.creado_por}]).select('*').then(function(rc){ if(rc&&rc.data&&rc.data[0])_ypCreditos.unshift(rc.data[0]); _ypRender(); });
    }
    if(typeof logAudit==='function')logAudit('yapague.pedido',cliente+(d&&d.codigo?(' '+d.codigo):''));
    showToast&&showToast(d&&d.codigo?('✓ Registrado · Código de retiro: '+d.codigo):'✓ Pedido registrado');
    _ypRender(); _ypAlertaChk(false);
  }).catch(function(){ _ypBusy=false; showToast&&showToast('Error de red'); });
}
function _ypEditar(id){ var p=_ypPed(id); if(!p)return; _ypCerrarDetalle(); _ypEditId=id; _ypFormTipo=p.tipo; _ypTab='pedidos'; _ypFormOpen=true; _ypQ=''; _ypFiltro='board'; _ypRender();
  try{ var el=document.getElementById('yp-form-card'); if(el)el.scrollIntoView({behavior:'smooth'}); }catch(e){} }
function _ypEditCancel(){ _ypEditId=null; _ypRender(); }

// ── Estados ───────────────────────────────────────────────────
function _ypAvanzar(id){ // 📝 Orden montada → 🛵 en camino / 🏪 por retirar
  if(!_ypPuede())return; var p=_ypPed(id); if(!p||p.estado!=='pendiente')return;
  var upd={estado:'enviado',enviado_en:new Date().toISOString(),enviado_por:(typeof currentUser!=='undefined'?currentUser:null)};
  supabaseClient.from('yapague_pedidos').update(upd).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    Object.keys(upd).forEach(function(k){ p[k]=upd[k]; });
    if(typeof logAudit==='function')logAudit('yapague.enviado',p.cliente||String(id));
    showToast&&showToast(p.tipo==='delivery'?'🛵 Marcado en camino':'🏪 Listo para retiro'); _ypRender();
  });
}
var _ypDetId=null;
function _ypAbrirDetalle(id){
  var p=_ypPed(id); if(!p)return; _ypDetId=id;
  var old=document.getElementById('yp-modal'); if(old)old.remove();
  var d=document.createElement('div'); d.id='yp-modal';
  d.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto';
  d.innerHTML='<div style="background:var(--bg,#f4f5f7);border-radius:16px;max-width:min(680px,95vw);width:100%;box-shadow:0 24px 64px rgba(0,0,0,.32);padding:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:14px">Detalle del pedido</b>'+
    '<button onclick="_ypCerrarDetalle()" style="border:0;background:var(--surface2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;color:var(--muted)">×</button></div>'+
    '<div id="yp-det-body">'+_ypCardHTML(p)+'</div></div>';
  d.addEventListener('click',function(e){ if(e.target===d)_ypCerrarDetalle(); });
  document.body.appendChild(d);
}
function _ypCerrarDetalle(){ _ypDetId=null; var d=document.getElementById('yp-modal'); if(d)d.remove(); }
function _ypRegresar(id){ // ← un paso atrás desde cualquier columna (por si hubo un error)
  if(!_ypPuede())return; var p=_ypPed(id); if(!p)return;
  var upd=null, msg='';
  if(p.estado==='entregado'){ upd={estado:'enviado',entregado_en:null,entregado_por:null}; msg='↩ Devuelto a "en camino / por retirar"'; }
  else if(p.estado==='enviado'){ upd={estado:'pendiente',enviado_en:null,enviado_por:null}; msg='↩ Devuelto a "orden montada"'; }
  else if(p.estado==='pendiente'&&p.por_llegar){ upd={estado:'por_llegar',llego_en:null}; msg='↩ Devuelto a "por llegar"'; }
  if(!upd){ showToast&&showToast('Este pedido no tiene paso anterior'); return; }
  if(!confirm('¿Regresar el pedido de '+(p.cliente||'')+' un paso atrás?'))return;
  supabaseClient.from('yapague_pedidos').update(upd).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo regresar'); return; }
    Object.keys(upd).forEach(function(k){ p[k]=upd[k]; });
    if(typeof logAudit==='function')logAudit('yapague.regresar',(p.cliente||'')+' → '+p.estado);
    showToast&&showToast(msg); _ypRender();
  });
}
function _ypDevolver(id){ // ← un paso atrás (enviado → orden montada)
  if(!_ypPuede())return; var p=_ypPed(id); if(!p||p.estado!=='enviado')return;
  supabaseClient.from('yapague_pedidos').update({estado:'pendiente',enviado_en:null,enviado_por:null}).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    p.estado='pendiente'; p.enviado_en=null; p.enviado_por=null; _ypRender();
  });
}
function _ypEntregar(id){
  if(!_ypPuede())return; var p=_ypPed(id); if(!p)return;
  if(p.estado==='entregado'){ // desmarcar: vuelve a la columna anterior
    if(!confirm('¿Devolver este pedido a "en camino / por retirar"?'))return;
    supabaseClient.from('yapague_pedidos').update({estado:'enviado',entregado_en:null,entregado_por:null}).eq('id',id).then(function(res){
      if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
      p.estado='enviado'; p.entregado_en=null; p.entregado_por=null; _ypRender();
    });
    return;
  }
  var upd={estado:'entregado',entregado_en:new Date().toISOString(),entregado_por:(typeof currentUser!=='undefined'?currentUser:null)};
  supabaseClient.from('yapague_pedidos').update(upd).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    Object.keys(upd).forEach(function(k){ p[k]=upd[k]; });
    if(typeof logAudit==='function')logAudit('yapague.entregado',p.cliente||String(id));
    _ypRender();
  });
}
function _ypLlego(id){
  if(!_ypPuede())return; var p=_ypPed(id); if(!p)return;
  var f=prompt('📥 Llegó el producto de '+(p.cliente||'')+'.\n\n¿Con qué Nº de FACTURA se facturó? (el cliente ya pagó: comprobante '+(p.comprobante_pago||'s/ref')+')', p.factura||'');
  if(f===null)return;
  var upd={estado:'pendiente',llego_en:new Date().toISOString(),factura:(String(f).trim()||p.factura||null)};
  supabaseClient.from('yapague_pedidos').update(upd).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    Object.keys(upd).forEach(function(k){ p[k]=upd[k]; });
    if(typeof logAudit==='function')logAudit('yapague.llego',(p.cliente||'')+' fact '+(upd.factura||'s/n'));
    showToast&&showToast('📥 Llegó y facturado. Avisar a '+(p.cliente||'el cliente')+(p.codigo?(' · código '+p.codigo):'')); _ypRender();
  });
}
function _ypPagadoTgl(id){
  if(!_ypPuede())return; var p=_ypPed(id); if(!p)return;
  var nuevo=!p.pagado;
  supabaseClient.from('yapague_pedidos').update({pagado:nuevo}).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    p.pagado=nuevo; _ypRender();
  });
}
function _ypRideryTgl(id){
  if(!_ypPuede())return; var p=_ypPed(id); if(!p)return;
  var nuevo=!p.cobrado_ridery;
  var upd={cobrado_ridery:nuevo,cobrado_ridery_fecha:(nuevo?_ypHoy():null)};
  supabaseClient.from('yapague_pedidos').update(upd).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    p.cobrado_ridery=nuevo; p.cobrado_ridery_fecha=upd.cobrado_ridery_fecha;
    if(typeof logAudit==='function')logAudit('yapague.ridery',(p.num_viaje||id)+' → '+(nuevo?'cobrado':'sin cobrar'));
    _ypRender(); _ypAlertaChk(false);
  });
}
function _ypDel(id){
  if(!_ypEsAdmin()){ showToast&&showToast('Solo el administrador puede borrar'); return; }
  if(!confirm('¿Borrar este pedido? Se pierde su historia.'))return;
  supabaseClient.from('yapague_pedidos').delete().eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo borrar'); return; }
    _ypPedidos=_ypPedidos.filter(function(x){ return String(x.id)!==String(id); }); _ypRender();
  });
}

// ── Fondo y créditos ──────────────────────────────────────────
function _ypRecargaAdd(){
  if(!_ypPuedeFondo()){ showToast&&showToast('Las recargas las registra Mayra o el administrador'); return; }
  if(_ypBusy)return;
  var g=function(id){ var el=document.getElementById(id); return (el&&el.value||'').trim(); };
  var monto=_ypN(g('yp-rc-monto')); if(monto<=0){ showToast&&showToast('Escribe el monto de la recarga'); return; }
  var row={ monto:monto, fecha:g('yp-rc-fecha')||_ypHoy(), nota:g('yp-rc-nota')||null, creado_por:(typeof currentUser!=='undefined'?currentUser:null) };
  _ypBusy=true;
  supabaseClient.from('yapague_recargas').insert([row]).select('*').then(function(res){
    _ypBusy=false;
    if(res&&res.error){ showToast&&showToast('No se pudo guardar'); return; }
    if(res&&res.data&&res.data[0])_ypRecargas.unshift(res.data[0]);
    if(typeof logAudit==='function')logAudit('yapague.recarga',_ypMoney(monto));
    showToast&&showToast('✓ Recarga registrada. Saldo: '+_ypMoney(_ypSaldo())); _ypRender();
  }).catch(function(){ _ypBusy=false; showToast&&showToast('Error de red'); });
}
function _ypRecargaDel(id){
  if(!_ypEsAdmin())return;
  if(!confirm('¿Borrar esta recarga?'))return;
  supabaseClient.from('yapague_recargas').delete().eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo borrar'); return; }
    _ypRecargas=_ypRecargas.filter(function(x){ return String(x.id)!==String(id); }); _ypRender();
  });
}
function _ypCredAdd(tipo){
  if(!_ypPuede()){ showToast&&showToast('No autorizado'); return; }
  if(_ypBusy)return;
  var g=function(id){ var el=document.getElementById(id); return (el&&el.value||'').trim(); };
  var monto=_ypN(g('yp-cr-monto')); if(monto<=0){ showToast&&showToast('Escribe el monto'); return; }
  var row={ empresa_cliente:_ypCredSel, tipo:tipo, monto:monto, factura:g('yp-cr-fact')||null, nota:g('yp-cr-nota')||null,
    fecha:g('yp-cr-fecha')||_ypHoy(), creado_por:(typeof currentUser!=='undefined'?currentUser:null) };
  _ypBusy=true;
  supabaseClient.from('yapague_creditos').insert([row]).select('*').then(function(res){
    _ypBusy=false;
    if(res&&res.error){ showToast&&showToast('No se pudo guardar'); return; }
    if(res&&res.data&&res.data[0])_ypCreditos.unshift(res.data[0]);
    if(typeof logAudit==='function')logAudit('yapague.credito_'+tipo,_ypCredSel+' '+_ypMoney(monto));
    showToast&&showToast(tipo==='abono'?('✓ Abono registrado. '+_ypCredSel+' debe '+_ypMoney(_ypCredSaldo(_ypCredSel).deben)):'✓ Factura a crédito registrada');
    _ypRender();
  }).catch(function(){ _ypBusy=false; showToast&&showToast('Error de red'); });
}
function _ypCredDel(id){
  if(!_ypEsAdmin())return;
  if(!confirm('¿Borrar este movimiento de crédito?'))return;
  supabaseClient.from('yapague_creditos').delete().eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo borrar'); return; }
    _ypCreditos=_ypCreditos.filter(function(x){ return String(x.id)!==String(id); }); _ypRender();
  });
}
function _ypCredSelSet(e){ _ypCredSel=e; _ypRender(); }
function _ypDiaSet(v){ if(v)_ypDia=v; _ypRender(); }

// Aviso a Mayra/admin cuando el fondo baja de $20
function _ypAlertaChk(fuerte){
  try{
    var s=_ypSaldo();
    if(s<YP_ALERTA_MIN&&(_ypPuedeFondo()||fuerte)){
      if(!window._ypAlertado||fuerte){ window._ypAlertado=true; showToast&&showToast('⚠️ Fondo Ridery en '+_ypMoney(s)+' — hay que recargar (avisar a Mayra)'); }
    }
  }catch(e){}
}
setTimeout(function(){
  try{
    if(typeof currentRole==='undefined'||['mayra','admin'].indexOf(currentRole)<0)return;
    if(typeof supabaseClient==='undefined'||!supabaseClient)return;
    Promise.all([
      supabaseClient.from('yapague_recargas').select('monto'),
      supabaseClient.from('yapague_pedidos').select('costo,tipo,cobrado_ridery')
    ]).then(function(res){
      var r=0,g=0; ((res[0]&&res[0].data)||[]).forEach(function(x){ r+=_ypN(x.monto); });
      ((res[1]&&res[1].data)||[]).forEach(function(x){ if(x.tipo==='delivery'&&x.cobrado_ridery)g+=_ypN(x.costo); });
      var s=r-g;
      if(s<YP_ALERTA_MIN&&(r>0||g>0)){ window._ypAlertado=true; showToast&&showToast('⚠️ Fondo Ridery en '+_ypMoney(s)+' — recargar en la página de Ridery y registrarlo en Ya Pagué'); }
    }).catch(function(){});
  }catch(e){}
},8000);

// ── Render ────────────────────────────────────────────────────
function _ypInp(){ return 'padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px;box-sizing:border-box;width:100%'; }
function _ypLbl(t,inner){ return '<label style="font-size:10px;color:var(--muted);font-weight:700;display:block">'+t+'<div style="margin-top:3px">'+inner+'</div></label>'; }
function _ypChip(txt,bg,col,extra){ return '<span style="background:'+bg+';color:'+col+';border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:800;'+(extra||'')+'">'+txt+'</span>'; }
function _ypSaldoCard(){
  var s=_ypSaldo(); var bajo=s<YP_ALERTA_MIN; var sc=_ypSinCobrar();
  var col=bajo?'#dc2626':(s<40?'#d97706':'var(--green)');
  return '<div class="tbox" style="padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap'+(bajo?';background:#fef2f2;border:1px solid #fecaca':'')+'">'+
    '<div><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.5px">💰 Fondo Ridery</div>'+
    '<div style="font-size:24px;font-weight:900;color:'+col+'">'+_ypMoney(s)+'</div></div>'+
    (sc.n?('<div style="font-size:11.5px;color:#b45309;background:#fef3c7;border-radius:10px;padding:6px 11px"><b>'+sc.n+'</b> viaje(s) que Ridery aún no cobra · '+_ypMoney(sc.total)+'</div>'):'')+
    (bajo?'<div style="flex:1;min-width:180px;font-size:12px;color:#b91c1c;font-weight:700">⚠️ Por debajo de $'+YP_ALERTA_MIN+': recargar en Ridery y registrarlo aquí (Mayra).</div>':'<span style="flex:1"></span>')+
    '<button class="btn btn-ghost btn-sm" onclick="_ypRefrescar()">🔄</button></div>';
}
function _ypFormHTML(){
  if(!_ypPuede())return '';
  var e=_ypEditId?_ypPed(_ypEditId):null;
  if(!e)return '';
  var v=function(k){ return e?(e[k]==null?'':String(e[k])):''; };
  var tipo=_ypFormTipo;
  var tb=function(k,lbl){ var act=(tipo===k); return '<button onclick="_ypFormTipoSet(\''+k+'\')" style="flex:1;border:1.5px solid '+(act?'var(--accent)':'var(--border)')+';background:'+(act?'var(--accent)':'var(--surface)')+';color:'+(act?'#fff':'var(--muted)')+';border-radius:9px;padding:8px;font-size:13px;font-weight:800;cursor:pointer">'+lbl+'</button>'; };
  return '<div class="tbox" id="yp-form-card" style="padding:13px;margin-bottom:12px'+(e?';border:2px solid var(--accent)':'')+'">'+
    '<div style="font-weight:800;font-size:13px;margin-bottom:8px">✏️ Editando pedido de '+esc(e.cliente||'')+(e.codigo?(' · '+e.codigo):'')+'</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:9px;max-width:340px">'+tb('pickup','🏪 Pickup')+tb('delivery','🛵 Delivery')+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">'+
    _ypLbl('Cliente','<input id="yp-cliente" value="'+esc(v('cliente'))+'" placeholder="nombre" style="'+_ypInp()+'">')+
    _ypLbl('Teléfono','<input id="yp-tel" value="'+esc(v('telefono'))+'" placeholder="0414…" style="'+_ypInp()+'">')+
    _ypLbl('Factura / presupuesto','<input id="yp-fact" value="'+esc(v('factura'))+'" placeholder="nº de la orden" style="'+_ypInp()+'">')+
    _ypLbl('Monto total $','<input id="yp-monto" type="number" step="0.01" value="'+esc(v('monto'))+'" style="'+_ypInp()+'">')+
    _ypLbl('¿Cómo paga?','<select id="yp-cred" style="'+_ypInp()+'"><option value="">Contado (ya pagó)</option><option value="MARA"'+(v('credito_empresa')==='MARA'?' selected':'')+'>Crédito · MARA</option><option value="NIVAR"'+(v('credito_empresa')==='NIVAR'?' selected':'')+'>Crédito · NIVAR</option></select>')+
    _ypLbl('Empresa','<select id="yp-emp" style="'+_ypInp()+'"><option value="FARMACIA"'+(v('empresa')!=='DROGUERIA'?' selected':'')+'>Farmacia</option><option value="DROGUERIA"'+(v('empresa')==='DROGUERIA'?' selected':'')+'>Droguería</option></select>')+
    _ypLbl('Fecha','<input id="yp-fecha" type="date" value="'+(v('fecha')?String(v('fecha')).slice(0,10):_ypHoy())+'" style="'+_ypInp()+'">')+
    _ypLbl('Descripción','<input id="yp-desc" value="'+esc(v('descripcion'))+'" placeholder="opcional" style="'+_ypInp()+'">')+
    '</div>'+
    '<div style="font-size:10px;color:var(--muted);margin-top:5px">✍️ El responsable queda firmado automático con tu sesión ('+esc(typeof currentUser!=='undefined'?currentUser:'')+').</div>'+
    (tipo==='delivery'?('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:8px;background:var(--surface2);border-radius:10px;padding:9px">'+
      _ypLbl('Dirección','<input id="yp-dir" value="'+esc(v('direccion'))+'" placeholder="sector / calle" style="'+_ypInp()+'">')+
      _ypLbl('Envío','<select id="yp-envio" style="'+_ypInp()+'"><option value="pago"'+(v('envio')!=='gratis'?' selected':'')+'>Pago</option><option value="gratis"'+(v('envio')==='gratis'?' selected':'')+'>Gratis</option></select>')+
      _ypLbl('Nº viaje Ridery','<input id="yp-num" value="'+esc(v('num_viaje'))+'" placeholder="al pedir el viaje" style="'+_ypInp()+'">')+
      _ypLbl('Chofer','<input id="yp-chofer" value="'+esc(v('chofer'))+'" style="'+_ypInp()+'">')+
      _ypLbl('Costo del viaje $ (lo que cobra Ridery)','<input id="yp-costo" type="number" step="0.01" value="'+esc(v('costo')||'')+'" style="'+_ypInp()+'">')+
    '</div>'):'<input type="hidden" id="yp-dir"><input type="hidden" id="yp-envio"><input type="hidden" id="yp-num"><input type="hidden" id="yp-chofer"><input type="hidden" id="yp-costo">')+
    (e?'':('<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;margin-top:9px"><input type="checkbox" id="yp-porllegar" onchange="var d=document.getElementById(\'yp-pl-box\'); if(d)d.style.display=this.checked?\'grid\':\'none\'"> 🚚 El producto está POR LLEGAR (se factura cuando llegue)</label>'))+
    '<div id="yp-pl-box" style="display:'+((e&&e.por_llegar)?'grid':'none')+';grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px">'+
      _ypLbl('Comprobante del pago','<input id="yp-comp" value="'+esc(v('comprobante_pago'))+'" placeholder="ref. del pago del cliente" style="'+_ypInp()+'">')+
      _ypLbl('De dónde viene','<input id="yp-origen" value="'+esc(v('origen'))+'" placeholder="proveedor" style="'+_ypInp()+'">')+
      _ypLbl('Llega aprox.','<input id="yp-llega" type="date" value="'+(v('llega_estimado')?String(v('llega_estimado')).slice(0,10):'')+'" style="'+_ypInp()+'">')+
    '</div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">'+
    (e?'<button class="btn btn-ghost btn-sm" style="padding:9px 16px" onclick="_ypEditCancel()">Cancelar</button>':'')+
    '<button class="btn btn-accent btn-sm" style="padding:9px 18px" onclick="_ypGuardarPedido()">'+(e?'Guardar cambios':'Registrar pedido')+'</button></div></div>';
}
function _ypNorm(t){ return String(t==null?'':t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function _ypMatch(p,q){ if(!q)return true; q=_ypNorm(q);
  return _ypNorm(p.codigo).indexOf(q)>=0||_ypNorm(p.cliente).indexOf(q)>=0||_ypNorm(p.telefono).indexOf(q)>=0||
    _ypNorm(p.factura).indexOf(q)>=0||_ypNorm(p.direccion).indexOf(q)>=0||_ypNorm(p.comprobante_pago).indexOf(q)>=0; }
function _ypBuscar(v){ _ypQ=String(v||''); var l=document.getElementById('yp-buscar-res'); if(l){ l.innerHTML=_ypListaFiltrada(); } else { _ypRender(); } }
function _ypRuta(p){
  var paso=function(done,act,txt){ return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:'+(act?'800':'600')+';color:'+(done?'var(--green)':(act?'#b45309':'var(--muted)'))+'">'+(done?'✓':(act?'●':'○'))+' '+txt+'</span>'; };
  var sep='<span style="color:var(--border);font-size:10px">──</span>';
  var out=[paso(true,false,'Registrado '+_ypFechaLbl(p.fecha)+' '+_ypHora(p.creado_en)+(p.caja?(' · '+esc(p.caja)):'')+(p.facturado_por?(' · '+esc(p.facturado_por)):''))];
  if(p.por_llegar){
    if(p.llego_en)out.push(paso(true,false,'Llegó y facturado '+_ypFechaLbl(_ypFechaVE(p.llego_en))+' '+_ypHora(p.llego_en)));
    else out.push(paso(false,true,'Esperando que llegue'+(p.llega_estimado?(' (~'+_ypFechaLbl(p.llega_estimado)+')'):'')+(p.origen?(' de '+esc(p.origen)):'')));
  }
  if(p.enviado_en&&(p.estado==='enviado'||p.estado==='entregado'))out.push(paso(p.estado==='entregado',p.estado==='enviado',(p.tipo==='delivery'?'En camino':'Listo para retiro')+' '+_ypFechaLbl(_ypFechaVE(p.enviado_en))+' '+_ypHora(p.enviado_en)+(p.enviado_por?(' · '+esc(p.enviado_por)):'')));
  if(p.estado==='entregado')out.push(paso(true,false,'Entregado '+(p.entregado_en?(_ypFechaLbl(_ypFechaVE(p.entregado_en))+' '+_ypHora(p.entregado_en)):'')+(p.entregado_por?(' · '+esc(p.entregado_por)):'')));
  else if(p.estado==='pendiente')out.push(paso(false,true,'Orden montada — '+(p.tipo==='delivery'?'falta enviarla':'falta avisar/retirar')));
  else if(p.estado==='enviado'&&!p.enviado_en)out.push(paso(false,true,p.tipo==='delivery'?'En camino':'Listo para retiro'));
  else if(p.estado==='por_llegar')out.push(paso(false,false,p.tipo==='delivery'?'Luego: envío y entrega':'Luego: retiro con el código'));
  return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px;background:var(--surface2);border-radius:9px;padding:6px 9px">'+out.join(sep)+'</div>';
}
function _ypDato(ic,l,v){ if(!v)return ''; return '<span style="display:inline-flex;align-items:center;gap:5px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:3px 9px;font-size:11px"><span style="color:var(--muted)">'+ic+' '+l+'</span> <b>'+v+'</b></span>'; }
function _ypCardHTML(p){
  var esDel=(p.tipo==='delivery');
  var chips=_ypChip(esDel?'🛵 Delivery':'🏪 Pickup','var(--surface2)','var(--text)','border:1px solid var(--border)')+' '+
    _ypChip(p.empresa==='DROGUERIA'?'DROGUERÍA':'FARMACIA',(p.empresa==='DROGUERIA'?'#ecfeff':'#f0fdf4'),(p.empresa==='DROGUERIA'?'#155e75':'#166534'))+' '+
    (p.credito_empresa?_ypChip('💳 CRÉDITO '+esc(p.credito_empresa),'#fdf4ff','#86198f')+' ':'')+
    (p.estado==='por_llegar'?_ypChip('🚚 POR LLEGAR','#fef3c7','#92400e')+' ':'')+
    ((esDel&&p.envio==='gratis')?_ypChip('ENVÍO GRATIS','#e0f2fe','#075985'):'');
  var datos='';
  if(p.estado==='por_llegar'){
    datos=_ypDato('💵','Pagó',(_ypN(p.monto)>0?_ypMoney(p.monto):''))+
      _ypDato('🧾','Ref. pago',esc(p.comprobante_pago||''))+
      _ypDato('🏭','Viene de',esc(p.origen||''))+
      _ypDato('📅','Llega',p.llega_estimado?_ypFechaLbl(p.llega_estimado):'')+
      _ypDato('📞','',esc(p.telefono||''));
  } else {
    datos=_ypDato('🧾','Factura',esc(p.factura||''))+
      _ypDato('💵','Monto',(_ypN(p.monto)>0?_ypMoney(p.monto):''))+
      _ypDato('📞','',esc(p.telefono||''))+
      (esDel?_ypDato('📍','',esc(p.direccion||'')):'')+
      (esDel?_ypDato('🚗','Viaje',esc(p.num_viaje||'')+(p.chofer?(' · '+esc(p.chofer)):'')):'')+
      (esDel&&_ypN(p.costo)>0?_ypDato('⛽','Costo','−'+_ypMoney(p.costo)):'');
  }
  if(p.descripcion)datos+=_ypDato('📝','',esc(p.descripcion));
  var acc='<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:8px">';
  if(p.estado==='por_llegar'){
    acc+='<button class="btn btn-sm" style="background:#1d4ed8;color:#fff;border:0;padding:6px 14px" onclick="_ypLlego('+p.id+')">📥 Llegó · facturar</button>';
  } else {
    if(p.estado==='pendiente')acc+='<button class="btn btn-sm" style="background:#1d4ed8;color:#fff;border:0;padding:6px 14px" onclick="_ypAvanzar('+p.id+')">'+(p.tipo==='delivery'?'🛵 Enviar':'🏪 Listo para retiro')+'</button>';
    else if(p.estado==='enviado')acc+='<button class="btn btn-sm" style="background:var(--green);color:#fff;border:0;padding:6px 14px" onclick="_ypEntregar('+p.id+')">✅ Entregado</button><button class="btn btn-ghost btn-sm" style="padding:5px 10px;font-size:11px" onclick="_ypDevolver('+p.id+')">↩</button>';
    else if(p.estado==='entregado')acc+='<button onclick="_ypEntregar('+p.id+')" style="border:1.5px solid var(--green);background:#d1fae5;color:#065f46;border-radius:999px;padding:5px 13px;font-size:11px;font-weight:800;cursor:pointer">✅ Entregado</button><button class="btn btn-ghost btn-sm" style="padding:5px 10px;font-size:11px" title="Regresar un paso" onclick="_ypRegresar('+p.id+')">↩</button>';
    if(esDel&&_ypN(p.costo)>0)acc+='<button onclick="_ypRideryTgl('+p.id+')" title="¿Ridery ya descontó este viaje del fondo?" style="border:1.5px solid '+(p.cobrado_ridery?'var(--green)':'#f59e0b')+';background:'+(p.cobrado_ridery?'#d1fae5':'#fef3c7')+';color:'+(p.cobrado_ridery?'#065f46':'#92400e')+';border-radius:999px;padding:5px 13px;font-size:11px;font-weight:800;cursor:pointer">'+(p.cobrado_ridery?('✓ Ridery cobró'+(p.cobrado_ridery_fecha?(' '+_ypFechaLbl(p.cobrado_ridery_fecha)):'')):'🟠 Ridery no ha cobrado')+'</button>';
  }
  acc+='<span style="flex:1"></span><button class="btn btn-ghost btn-sm" style="padding:5px 11px;font-size:11px" onclick="_ypEditar('+p.id+')">✏️ Editar</button>'+
    (_ypEsAdmin()?('<button onclick="_ypDel('+p.id+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:14px">×</button>'):'')+'</div>';
  return '<div class="tbox" style="padding:12px 14px;margin-bottom:9px'+(p.estado==='entregado'?';opacity:.72':'')+'">'+
    '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">'+
      '<span style="font-size:14px;font-weight:800">'+esc(p.cliente||'—')+'</span>'+
      (p.codigo?('<span style="background:#eef2ff;color:#1E38A6;border:1px solid #c7d2fe;border-radius:8px;padding:2px 10px;font-size:12px;font-weight:900;letter-spacing:1px">'+esc(p.codigo)+'</span>'):'')+
      '<span style="flex:1"></span>'+chips+'</div>'+
    (datos?('<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">'+datos+'</div>'):'')+
    _ypRuta(p)+
    acc+'</div>';
}
function _ypMiniCard(p){
  var next='';
  var atras='<button class="btn btn-ghost btn-sm" style="padding:5px 8px;font-size:11px" title="Regresar un paso (si hubo error)" onclick="event.stopPropagation();_ypRegresar('+p.id+')">↩</button>';
  if(p.estado==='por_llegar')next='<button class="btn btn-sm" style="background:#1d4ed8;color:#fff;border:0;padding:5px 10px;font-size:11px;width:100%" onclick="event.stopPropagation();_ypLlego('+p.id+')">📥 Llegó · facturar</button>';
  else if(p.estado==='pendiente')next='<div style="display:flex;gap:4px"><button class="btn btn-sm" style="background:#1d4ed8;color:#fff;border:0;padding:5px 10px;font-size:11px;flex:1" onclick="event.stopPropagation();_ypAvanzar('+p.id+')">'+(p.tipo==='delivery'?'🛵 Enviar →':'🏪 Listo para retiro →')+'</button>'+(p.por_llegar?atras:'')+'</div>';
  else if(p.estado==='enviado')next='<div style="display:flex;gap:4px"><button class="btn btn-sm" style="background:var(--green);color:#fff;border:0;padding:5px 10px;font-size:11px;flex:1" onclick="event.stopPropagation();_ypEntregar('+p.id+')">✅ Entregado →</button>'+atras+'</div>';
  else if(p.estado==='entregado')next='<div style="display:flex;gap:4px;justify-content:flex-end">'+atras+'</div>';
  var hora=_ypHora(p.estado==='entregado'?(p.entregado_en||p.creado_en):(p.estado==='enviado'?(p.enviado_en||p.creado_en):p.creado_en));
  return '<div onclick="_ypAbrirDetalle('+p.id+')" title="Toca para ver todo el detalle" style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:9px 10px;margin-bottom:7px;box-shadow:0 1px 2px rgba(16,24,40,.05);cursor:pointer">'+
    '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:13px">'+(p.tipo==='delivery'?'🛵':'🏪')+'</span>'+
    '<b style="font-size:12.5px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.cliente||'—')+'</b>'+
    '<button onclick="event.stopPropagation();_ypEditar('+p.id+')" style="border:0;background:none;cursor:pointer;font-size:12px;color:var(--muted)" title="Editar">✏️</button></div>'+
    '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:4px 0 6px;font-size:10.5px;color:var(--muted)">'+
    (p.codigo?('<span style="background:#eef2ff;color:#1E38A6;border-radius:6px;padding:0 6px;font-weight:900;letter-spacing:.5px">'+esc(p.codigo)+'</span>'):'')+
    (p.factura?('<span>🧾 '+esc(p.factura)+'</span>'):'')+
    (_ypN(p.monto)>0?('<b style="color:var(--text)">'+_ypMoney(p.monto)+'</b>'):'')+
    (p.credito_empresa?('<span style="background:#fdf4ff;color:#86198f;border-radius:6px;padding:0 5px;font-weight:800">💳 '+esc(p.credito_empresa)+'</span>'):'')+
    '<span>'+(p.empresa==='DROGUERIA'?'DROG':'FARM')+' · '+_ypFechaLbl(p.fecha)+' '+hora+'</span>'+
    (p.estado==='por_llegar'&&p.origen?('<span>🏭 '+esc(p.origen)+'</span>'):'')+
    (p.tipo==='delivery'&&p.direccion&&p.estado!=='entregado'?('<span>📍 '+esc(p.direccion)+'</span>'):'')+
    '</div>'+next+'</div>';
}
function _ypBoardHTML(){
  var L=(_ypPedidos||[]); var hoy=_ypHoy();
  var porLlegar=L.filter(function(p){ return p.estado==='por_llegar'; });
  var montada=L.filter(function(p){ return p.estado==='pendiente'; });
  var enviado=L.filter(function(p){ return p.estado==='enviado'; });
  var entHoy=L.filter(function(p){ return p.estado==='entregado'&&(p.entregado_en?_ypFechaVE(p.entregado_en):String(p.fecha).slice(0,10))===hoy; });
  var entViejos=L.filter(function(p){ return p.estado==='entregado'; }).length-entHoy.length;
  var col=function(t,color,bg,lst,extra){
    return '<div style="flex:1;min-width:240px;max-width:330px;background:'+bg+';border:1.5px solid '+color+'33;border-top:4px solid '+color+';border-radius:14px;padding:0 0 4px;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(16,24,40,.06)">'+
      '<div style="display:flex;align-items:center;gap:7px;padding:10px 12px;border-bottom:1.5px solid '+color+'22"><span style="font-size:12.5px;font-weight:900;color:'+color+'">'+t+'</span>'+
      '<span style="margin-left:auto;background:'+color+';color:#fff;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:800">'+lst.length+'</span></div>'+
      '<div style="max-height:430px;overflow-y:auto;padding:8px 8px 2px">'+
      (lst.length?lst.map(_ypMiniCard).join(''):'<div style="text-align:center;color:var(--muted);font-size:11px;padding:16px 4px">— vacío —</div>')+
      (extra||'')+'</div></div>';
  };
  return '<div style="display:flex;gap:14px;overflow-x:auto;align-items:flex-start;padding-bottom:6px">'+
    col('🚚 POR LLEGAR','#b45309','#fffbf5',porLlegar)+
    col('📝 ORDEN MONTADA','#1d4ed8','#f6f8ff',montada)+
    col('🛵 EN CAMINO · 🏪 POR RETIRAR','#7c3aed','#faf7ff',enviado)+
    col('✅ ENTREGADOS HOY','#059669','#f4fdf8',entHoy,(entViejos>0?('<div style="text-align:center;color:var(--muted);font-size:10.5px;padding:6px 4px;border-top:1px dashed var(--border);margin-top:4px">'+entViejos+' entregado(s) de días anteriores → guardados en el 📔 Diario (día por día) o con el buscador 🔎</div>'):''))+
    '</div>';
}
function _ypListaFiltrada(){
  var q=String(_ypQ||'').trim();
  var out='', fAnt=null, lista;
  if(q){
    lista=(_ypPedidos||[]).filter(function(p){ return _ypMatch(p,q); });
    if(!lista.length)return '<div class="tbox" style="padding:18px;text-align:center;color:var(--muted);font-size:12.5px">Nada coincide con «'+esc(q)+'». Busca por código, cliente, teléfono, factura o dirección.</div>';
    return '<div style="font-size:11px;color:var(--muted);margin:4px 2px 8px">'+lista.length+' resultado(s) — buscando en TODOS los pedidos (incluye entregados y por llegar)</div>'+lista.slice(0,60).map(_ypCardHTML).join('');
  }
  if(_ypFiltro!=='sin_ridery')return _ypBoardHTML();
  lista=(_ypPedidos||[]).filter(function(p){ return p.tipo==='delivery'&&!p.cobrado_ridery&&_ypN(p.costo)>0; });
  lista.slice(0,120).forEach(function(p){
    var f=String(p.fecha).slice(0,10);
    if(f!==fAnt){ fAnt=f; out+='<div style="font-size:10.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:'+(f===_ypHoy()?'var(--accent)':'var(--muted)')+';margin:10px 2px 6px">'+_ypFechaLbl(f)+(f===_ypHoy()?' · HOY':'')+'</div>'; }
    out+=_ypCardHTML(p);
  });
  return out||'<div class="tbox" style="padding:18px;text-align:center;color:var(--muted);font-size:12.5px">Ningún viaje pendiente de que Ridery lo cobre. 🎉</div>';
}
function _ypPedidosHTML(){
  var sc=_ypSinCobrar();
  var fchip=function(k,lbl){ var act=(_ypFiltro===k); return '<button onclick="_ypSetFiltro(\''+k+'\')" style="border:1.5px solid '+(act?'var(--accent)':'var(--border)')+';background:'+(act?'var(--accent)':'var(--surface)')+';color:'+(act?'#fff':'var(--muted)')+';border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:700;cursor:pointer">'+lbl+'</button>'; };
  var buscador='<div class="tbox" style="padding:9px 12px;margin-bottom:10px;display:flex;align-items:center;gap:9px">'+
    '<span style="font-size:16px">🔎</span>'+
    '<input id="yp-buscar" value="'+esc(_ypQ)+'" placeholder="¿Qué pasó con un pedido? Busca por código, cliente, teléfono, factura o dirección…" oninput="_ypBuscar(this.value)" style="flex:1;border:0;background:transparent;color:var(--text);font-size:13.5px;outline:none">'+
    (_ypQ?'<button onclick="_ypQ=\'\';_ypRender()" style="border:0;background:var(--surface2);border-radius:999px;width:24px;height:24px;cursor:pointer;color:var(--muted)">×</button>':'')+'</div>';
  var barra=_ypQ?'':('<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center">'+
    fchip('board','📋 Tablero')+
    fchip('sin_ridery','🟠 Ridery sin cobrar'+(sc.n?(' ('+sc.n+')'):''))+
    '<span style="flex:1"></span>'+
    '<span style="font-size:10.5px;color:var(--muted)">Los pedidos se registran desde la caja YaPagué</span></div>');
  return buscador+barra+(_ypEditId?_ypFormHTML():'')+'<div id="yp-buscar-res">'+_ypListaFiltrada()+'</div>';
}
function _ypPorLlegarHTML(){
  var rows=(_ypPedidos||[]).filter(function(p){ return p.estado==='por_llegar'; });
  var nota='<div class="tbox" style="padding:11px 14px;margin-bottom:12px;font-size:11.5px;color:var(--muted)">El cliente <b>ya pagó</b> (queda su comprobante) pero el producto viene en camino: la orden existe desde la caja y <b>se factura cuando llega</b> con el botón 📥. Al llegar pasa a Pendientes para avisarle al cliente.</div>';
  return nota+(rows.length?rows.map(_ypCardHTML).join(''):'<div class="tbox" style="padding:18px;text-align:center;color:var(--muted);font-size:12.5px">No hay productos en camino.</div>');
}
function _ypCreditosHTML(){
  var emps=_ypCredEmps();
  var tabs=emps.map(function(e){ var act=(_ypCredSel===e); var s=_ypCredSaldo(e);
    return '<button onclick="_ypCredSelSet(\''+e+'\')" style="border:1.5px solid '+(act?'var(--accent)':'var(--border)')+';background:'+(act?'var(--accent)':'var(--surface)')+';color:'+(act?'#fff':'var(--text)')+';border-radius:10px;padding:7px 14px;font-size:12.5px;font-weight:800;cursor:pointer">'+esc(e)+(s.deben>0.004?(' <span style="opacity:.85">· debe '+_ypMoney(s.deben)+'</span>'):'')+(_ypCredAncla(e)?' <span style="opacity:.55;font-size:10px">$↔Bs</span>':'')+'</button>'; }).join(' ');
  if(_ypCredAncla(_ypCredSel)) return '<div style="display:flex;gap:7px;flex-wrap:wrap">'+tabs+'</div>'+_ypCredAnclaHTML();
  var s=_ypCredSaldo(_ypCredSel);
  var resumen='<div class="tbox" style="padding:13px 16px;margin:10px 0 12px;display:flex;gap:22px;flex-wrap:wrap">'+
    '<div><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase">Facturado</div><div style="font-size:18px;font-weight:900">'+_ypMoney(s.facturado)+'</div></div>'+
    '<div><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase">Nos han pagado</div><div style="font-size:18px;font-weight:900;color:var(--green)">'+_ypMoney(s.abonado)+'</div></div>'+
    '<div><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase">Nos deben</div><div style="font-size:18px;font-weight:900;color:'+(s.deben>0.004?'var(--red)':'var(--green)')+'">'+_ypMoney(s.deben)+'</div></div></div>';
  var form=_ypPuede()?('<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">'+
    _ypLbl('Monto $','<input id="yp-cr-monto" type="number" step="0.01" style="'+_ypInp()+'">')+
    _ypLbl('Fecha','<input id="yp-cr-fecha" type="date" value="'+_ypHoy()+'" style="'+_ypInp()+'">')+
    _ypLbl('Nº factura','<input id="yp-cr-fact" placeholder="si aplica" style="'+_ypInp()+'">')+
    _ypLbl('Nota','<input id="yp-cr-nota" placeholder="opcional" style="'+_ypInp()+'">')+
    '</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:9px">'+
    '<button class="btn btn-ghost btn-sm" style="padding:8px 15px;border:1.5px solid var(--border)" onclick="_ypCredAdd(\'factura\')">🧾 Factura a crédito</button>'+
    '<button class="btn btn-sm" style="background:var(--green);color:#fff;border:0;padding:8px 15px" onclick="_ypCredAdd(\'abono\')">💵 Registrar abono</button></div></div>'):'';
  var movs=(_ypCreditos||[]).filter(function(c){ return String(c.empresa_cliente).toUpperCase()===_ypCredSel; });
  var rows=movs.slice(0,80).map(function(c){
    return '<tr style="border-top:1px solid var(--border)"><td style="padding:6px 8px;font-size:11px;color:var(--muted);white-space:nowrap">'+_ypFechaLbl(c.fecha)+'</td>'+
      '<td style="padding:6px 8px;font-size:12px">'+(c.tipo==='factura'?'🧾 Factura':'<b style="color:var(--green)">💵 Abono</b>')+(c.factura?(' '+esc(c.factura)):'')+(c.nota?(' · '+esc(c.nota)):'')+(c.creado_por?(' <span style="font-size:10px;color:var(--muted)">· '+esc(c.creado_por)+'</span>'):'')+'</td>'+
      '<td style="padding:6px 8px;text-align:right;font-weight:800;color:'+(c.tipo==='factura'?'var(--red)':'var(--green)')+'">'+(c.tipo==='factura'?'+':'−')+_ypMoney(c.monto)+'</td>'+
      '<td style="padding:6px 4px;text-align:center">'+(_ypEsAdmin()?('<button onclick="_ypCredDel('+c.id+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:14px">×</button>'):'')+'</td></tr>';
  }).join('');
  return '<div style="display:flex;gap:7px;flex-wrap:wrap">'+tabs+'</div>'+resumen+form+
    '<div class="tbox" style="padding:0;overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--surface2)"><th style="text-align:left;padding:7px 8px;font-size:10.5px">Fecha</th><th style="text-align:left;padding:7px 8px;font-size:10.5px">Movimiento</th><th style="text-align:right;padding:7px 8px;font-size:10.5px">Monto</th><th></th></tr></thead><tbody>'+
    (rows||'<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--muted);font-size:12px">Sin movimientos con '+esc(_ypCredSel)+'. Las facturas a crédito registradas desde la caja caen aquí solas.</td></tr>')+'</tbody></table></div>';
}
// ── Créditos ANCLADOS en $ (MARA / NIVAR): cotización en Bs hoy, pagan en Bs otro día con la tasa de ese día ──
function _ypCredAnclaHTML(){
  var emp=_ypCredSel; var s=_ypCredSaldo(emp); var tasaHoy=_ypTasaFecha(_ypHoy());
  var debenBs=tasaHoy>0?_ypR2(s.deben*tasaHoy):0;
  var head='<div class="tbox" style="padding:13px 16px;margin:10px 0 12px">'+
    '<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end">'+
    '<div><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase">Facturado</div><div style="font-size:18px;font-weight:900">'+_ypMoney(s.facturado)+'</div></div>'+
    '<div><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase">Nos han pagado</div><div style="font-size:18px;font-weight:900;color:var(--green)">'+_ypMoney(s.abonado)+'</div></div>'+
    '<div><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase">Nos deben ($)</div><div style="font-size:18px;font-weight:900;color:'+(s.deben>0.004?'var(--red)':'var(--green)')+'">'+_ypMoney(s.deben)+'</div></div>'+
    '<div><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase">Deben HOY (Bs)</div><div style="font-size:18px;font-weight:900;color:#7c3aed">'+(tasaHoy>0?_ypFmtBs(debenBs):'—')+'</div></div>'+
    '<div style="margin-left:auto;text-align:right"><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase">Tasa hoy</div><div style="font-size:14px;font-weight:800">'+(tasaHoy>0?(fmt(tasaHoy,2)+' Bs/$'):'—')+'</div></div>'+
    '</div>'+
    (tasaHoy<=0?'<div style="margin-top:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:8px 11px;font-size:11.5px;color:#92400e">⚠️ No hay tasa del día registrada. Regístrala (Central → Tasa) para calcular los Bs.</div>':'')+
    '<div style="font-size:11px;color:var(--muted);margin-top:7px">💡 La deuda se <b>ancla en dólares</b>. Los <b>bolívares se recalculan con la tasa del día que paguen</b>. Cada factura se salda por separado.</div></div>';
  // facturas abiertas
  var abiertas=_ypFacturasAbiertas(emp).slice().sort(function(a,b){ return String(a.fecha).localeCompare(String(b.fecha)); });
  var factCards=abiertas.map(function(f){ var falta=_ypFactFalta(f.id); var pagado=_ypR2(_ypN(f.monto)-falta); var saldado=falta<=0.004; var aFavor=falta< -0.004; var faltaBs=(tasaHoy>0&&falta>0)?_ypR2(falta*tasaHoy):0;
    return '<div style="border:1px solid var(--border);border-radius:11px;padding:10px 12px;margin-bottom:8px;background:'+(saldado?'#f0fdf4':'var(--surface)')+'">'+
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
        '<b style="font-size:12.5px">'+(f.cotizacion?('Cotiz. '+esc(f.cotizacion)):(f.factura?('Fact. '+esc(f.factura)):('#'+f.id)))+'</b>'+
        (f.factura&&f.cotizacion?('<span style="font-size:10.5px;color:var(--muted)">🧾 '+esc(f.factura)+'</span>'):'')+
        '<span style="font-size:10.5px;color:var(--muted)">'+_ypFechaLbl(f.fecha)+'</span>'+
        '<span style="flex:1"></span>'+
        (saldado?_ypChip(aFavor?('saldo a favor '+_ypMoney(-falta)):'✓ SALDADA','#dcfce7','#166534'):_ypChip('debe '+_ypMoney(falta),'#fef2f2','#b91c1c'))+
      '</div>'+
      '<div style="font-size:11px;color:var(--muted);margin-top:4px">Anclado '+_ypMoney(f.monto)+(f.monto_bs?(' · cotizado '+_ypFmtBs(f.monto_bs)+' @ '+fmt(f.tasa||0,2)):'')+' · pagado '+_ypMoney(pagado)+(!saldado&&tasaHoy>0?(' · <b style="color:#7c3aed">falta hoy ≈ '+_ypFmtBs(faltaBs)+'</b>'):'')+'</div>'+
      (_ypPuede()&&!saldado?('<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">'+
        '<button class="btn btn-sm" style="background:var(--green);color:#fff;border:0;padding:5px 12px;font-size:11px" onclick="_ypAbonoPrep('+f.id+')">💵 Abonar / pagar</button>'+
        '<button class="btn btn-ghost btn-sm" style="padding:5px 10px;font-size:11px;border:1px solid var(--border)" onclick="_ypReemplazarCotiz('+f.id+')">🔁 Reemplazar cotización</button>'+
      '</div>'):'')+
    '</div>';
  }).join('');
  var factWrap='<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="font-weight:800;font-size:13px;margin-bottom:9px">📄 Facturas / cotizaciones abiertas'+(abiertas.length?(' ('+abiertas.length+')'):'')+'</div>'+
    (factCards||'<div style="font-size:12px;color:var(--muted);padding:6px 2px">No hay facturas abiertas. Registra una cotización abajo. 👇</div>')+'</div>';
  // form nueva factura/cotización
  var formFact=_ypPuede()?('<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="font-weight:800;font-size:13px;margin-bottom:9px">🧾 Nueva cotización / factura a crédito ('+esc(emp)+')</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">'+
    _ypLbl('Nº cotización','<input id="yp-fa-cotiz" placeholder="que le pasamos" style="'+_ypInp()+'">')+
    _ypLbl('Nº factura','<input id="yp-fa-fact" placeholder="si ya se facturó" style="'+_ypInp()+'">')+
    _ypLbl('Monto cotizado (Bs)','<input id="yp-fa-bs" type="number" step="0.01" oninput="_ypAnclaLive()" style="'+_ypInp()+'">')+
    _ypLbl('Fecha','<input id="yp-fa-fecha" type="date" value="'+_ypHoy()+'" onchange="_ypAnclaLive()" style="'+_ypInp()+'">')+
    '</div>'+
    '<div style="margin-top:8px;font-size:12px;color:var(--muted)">Se ancla en dólares → <b id="yp-fa-usd" style="color:var(--text)">$ 0.00</b></div>'+
    '<div style="text-align:right;margin-top:8px"><button class="btn btn-accent btn-sm" style="padding:9px 18px" onclick="_ypCredAddAncla()">Registrar cotización</button></div></div>'):'';
  // form abono
  var abForm='';
  if(_ypPuede()){
    var opts=abiertas.map(function(f){ var falta=_ypFactFalta(f.id); var sel=(String(window._ypAbFact||'')===String(f.id)); return '<option value="'+f.id+'"'+(sel?' selected':'')+'>'+esc(f.cotizacion||f.factura||('#'+f.id))+' · falta '+_ypMoney(falta)+'</option>'; }).join('');
    abForm='<div class="tbox" style="padding:12px;margin-bottom:12px'+(window._ypAbFact?';border:2px solid var(--green)':'')+'"><div style="font-weight:800;font-size:13px;margin-bottom:9px">💵 Registrar pago / abono (en Bs)</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">'+
      _ypLbl('¿Qué factura salda?','<select id="yp-ab-fact" style="'+_ypInp()+'">'+(opts||'<option value="">— (sin factura abierta) —</option>')+'</select>')+
      _ypLbl('Pagó (Bs)','<input id="yp-ab-bs" type="number" step="0.01" oninput="_ypAbonoLive()" style="'+_ypInp()+'">')+
      _ypLbl('Fecha del pago','<input id="yp-ab-fecha" type="date" value="'+_ypHoy()+'" onchange="_ypAbonoLive()" style="'+_ypInp()+'">')+
      '</div>'+
      '<div style="margin-top:8px;font-size:12px;color:var(--muted)">Con la tasa de ese día equivale a → <b id="yp-ab-usd" style="color:var(--green)">$ 0.00</b> que se restan a la factura</div>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'+(window._ypAbFact?'<button class="btn btn-ghost btn-sm" style="padding:8px 14px" onclick="window._ypAbFact=null;_ypRender()">Cancelar</button>':'')+'<button class="btn btn-sm" style="background:var(--green);color:#fff;border:0;padding:9px 18px" onclick="_ypAbonoAdd()">Registrar pago</button></div></div>';
  }
  // historial
  var movs=(_ypCreditos||[]).filter(function(c){ return String(c.empresa_cliente).toUpperCase()===emp; });
  var rows=movs.slice(0,120).map(function(c){
    var esFact=(c.tipo==='factura'); var ref=(c.cotizacion?('Cotiz. '+esc(c.cotizacion)):'')+(c.factura?((c.cotizacion?' · ':'')+'🧾 '+esc(c.factura)):'');
    var refAb=''; if(!esFact&&c.aplica_a){ var fa=_ypCred(c.aplica_a); refAb=fa?(' → '+esc(fa.cotizacion||fa.factura||('#'+fa.id))):''; }
    var superseded=(esFact&&c.vigente===false);
    return '<tr style="border-top:1px solid var(--border);'+(superseded?'opacity:.5':'')+'"><td style="padding:6px 8px;font-size:11px;color:var(--muted);white-space:nowrap">'+_ypFechaLbl(c.fecha)+'</td>'+
      '<td style="padding:6px 8px;font-size:12px">'+(esFact?('🧾 '+(ref||'Factura')+(superseded?' <span style="font-size:9px;background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:999px;font-weight:700">reemplazada</span>':'')):('<b style="color:var(--green)">💵 Abono</b>'+refAb))+(c.nota?(' · '+esc(c.nota)):'')+'</td>'+
      '<td style="padding:6px 8px;text-align:right;white-space:nowrap"><div style="font-weight:800;color:'+(esFact?'var(--red)':'var(--green)')+'">'+(esFact?'+':'−')+_ypMoney(c.monto)+'</div>'+(c.monto_bs?('<div style="font-size:9.5px;color:var(--muted)">'+_ypFmtBs(c.monto_bs)+' @ '+fmt(c.tasa||0,2)+'</div>'):'')+'</td>'+
      '<td style="padding:6px 4px;text-align:center">'+(_ypEsAdmin()&&!superseded?('<button onclick="_ypCredDel('+c.id+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:14px">×</button>'):'')+'</td></tr>';
  }).join('');
  var hist='<div class="tbox" style="padding:0;overflow:auto"><div style="padding:10px 12px 4px;font-weight:800;font-size:13px">Historial de '+esc(emp)+'</div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--surface2)"><th style="text-align:left;padding:7px 8px;font-size:10.5px">Fecha</th><th style="text-align:left;padding:7px 8px;font-size:10.5px">Movimiento</th><th style="text-align:right;padding:7px 8px;font-size:10.5px">Monto</th><th></th></tr></thead><tbody>'+
    (rows||'<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--muted);font-size:12px">Sin movimientos con '+esc(emp)+'.</td></tr>')+'</tbody></table></div>';
  return head+factWrap+formFact+abForm+hist;
}
function _ypAnclaLive(){ var bs=_ypN((document.getElementById('yp-fa-bs')||{}).value); var f=((document.getElementById('yp-fa-fecha')||{}).value)||_ypHoy(); var t=_ypTasaFecha(f); var usd=(t>0?bs/t:0); window._ypFaUsd=usd; var el=document.getElementById('yp-fa-usd'); if(el)el.innerHTML=(t>0?('$ '+fmt(usd,2)+' <span style="color:var(--muted);font-weight:400">(tasa '+fmt(t,2)+')</span>'):'<span style="color:#b45309">sin tasa del día</span>'); }
function _ypAbonoLive(){ var bs=_ypN((document.getElementById('yp-ab-bs')||{}).value); var f=((document.getElementById('yp-ab-fecha')||{}).value)||_ypHoy(); var t=_ypTasaFecha(f); var usd=(t>0?bs/t:0); window._ypAbUsd=usd; var el=document.getElementById('yp-ab-usd'); if(el)el.innerHTML=(t>0?('$ '+fmt(usd,2)+' <span style="color:var(--muted);font-weight:400">(tasa '+fmt(t,2)+')</span>'):'<span style="color:#b45309">sin tasa del día</span>'); }
function _ypAbonoPrep(fId){ window._ypAbFact=fId; _ypRender(); try{ var e=document.getElementById('yp-ab-bs'); if(e){ e.focus(); e.scrollIntoView({behavior:'smooth',block:'center'}); } }catch(e){} }
function _ypCredAddAncla(){
  if(!_ypPuede()){ showToast&&showToast('No autorizado'); return; } if(_ypBusy)return;
  var g=function(id){ var el=document.getElementById(id); return (el&&el.value||'').trim(); };
  var bs=_ypN(g('yp-fa-bs')); var fecha=g('yp-fa-fecha')||_ypHoy(); var tasa=_ypTasaFecha(fecha);
  if(tasa<=0){ showToast&&showToast('Primero registra la tasa del día'); return; }
  var usd=_ypR2((window._ypFaUsd!=null&&window._ypFaUsd>0)?window._ypFaUsd:(bs/tasa));
  if(usd<=0){ showToast&&showToast('Escribe el monto cotizado en Bs'); return; }
  var cotiz=g('yp-fa-cotiz'), fact=g('yp-fa-fact');
  if(!cotiz&&!fact){ showToast&&showToast('Escribe el nº de cotización o de factura'); return; }
  var row={ empresa_cliente:_ypCredSel, tipo:'factura', monto:usd, monto_bs:bs, tasa:tasa, moneda:'USD', cotizacion:cotiz||null, factura:fact||null, vigente:true, fecha:fecha, creado_por:(typeof currentUser!=='undefined'?currentUser:null) };
  _ypBusy=true;
  supabaseClient.from('yapague_creditos').insert([row]).select('*').then(function(res){ _ypBusy=false; if(res&&res.error){ showToast&&showToast('No se pudo guardar: '+(res.error.message||'')); return; } if(res&&res.data&&res.data[0])_ypCreditos.unshift(res.data[0]); window._ypFaUsd=0; if(typeof logAudit==='function')logAudit('yapague.credito_factura',_ypCredSel+' $'+fmt(usd,2)+' cotiz '+(cotiz||fact||'')); showToast&&showToast('✓ Cotización registrada · $'+fmt(usd,2)+' anclado'); _ypRender(); }).catch(function(){ _ypBusy=false; showToast&&showToast('Error de red'); });
}
function _ypAbonoAdd(){
  if(!_ypPuede()){ showToast&&showToast('No autorizado'); return; } if(_ypBusy)return;
  var g=function(id){ var el=document.getElementById(id); return (el&&el.value||'').trim(); };
  var fId=g('yp-ab-fact'); var bs=_ypN(g('yp-ab-bs')); var fecha=g('yp-ab-fecha')||_ypHoy(); var tasa=_ypTasaFecha(fecha);
  if(tasa<=0){ showToast&&showToast('Primero registra la tasa del día'); return; }
  if(bs<=0){ showToast&&showToast('Escribe cuántos Bs pagó'); return; }
  var usd=_ypR2(bs/tasa);
  if(fId){ var falta=_ypFactFalta(fId); if(usd>falta+0.01){ if(!confirm('El pago ($'+fmt(usd,2)+') es MAYOR que lo que falta de esa factura ($'+fmt(falta,2)+').\n\nEl excedente quedará como saldo a favor en esa factura. ¿Registrar así?'))return; } }
  var row={ empresa_cliente:_ypCredSel, tipo:'abono', monto:usd, monto_bs:bs, tasa:tasa, moneda:'USD', aplica_a:(fId?Number(fId):null), fecha:fecha, creado_por:(typeof currentUser!=='undefined'?currentUser:null) };
  _ypBusy=true;
  supabaseClient.from('yapague_creditos').insert([row]).select('*').then(function(res){ _ypBusy=false; if(res&&res.error){ showToast&&showToast('No se pudo guardar: '+(res.error.message||'')); return; } if(res&&res.data&&res.data[0])_ypCreditos.unshift(res.data[0]); window._ypAbFact=null; window._ypAbUsd=0; if(typeof logAudit==='function')logAudit('yapague.abono',_ypCredSel+' '+_ypFmtBs(bs)+' = $'+fmt(usd,2)); showToast&&showToast('✓ Pago registrado · '+_ypFmtBs(bs)+' = $'+fmt(usd,2)); _ypRender(); }).catch(function(){ _ypBusy=false; showToast&&showToast('Error de red'); });
}
function _ypReemplazarCotiz(fId){
  if(!_ypPuede()){ showToast&&showToast('No autorizado'); return; }
  var f=_ypCred(fId); if(!f)return;
  var nc=prompt('Reemplazar la cotización '+(f.cotizacion||f.factura||('#'+fId))+' de '+_ypCredSel+'.\n\nLa vieja NO se borra: queda de referencia.\n\nNuevo Nº de cotización:', f.cotizacion||'');
  if(nc===null)return;
  var fecha=_ypHoy(); var tasa=_ypTasaFecha(fecha);
  if(tasa<=0){ showToast&&showToast('Primero registra la tasa del día'); return; }
  var bsStr=prompt('Nuevo monto cotizado en Bs (tasa hoy '+fmt(tasa,2)+' Bs/$):', f.monto_bs?String(f.monto_bs):'');
  if(bsStr===null)return; var bs=_ypN(bsStr); if(bs<=0){ showToast&&showToast('Monto inválido'); return; }
  var usd=_ypR2(bs/tasa);
  var nf=prompt('Nº de factura (opcional, deja vacío si aún no se factura):', f.factura||'');
  if(nf===null)nf='';
  var row={ empresa_cliente:_ypCredSel, tipo:'factura', monto:usd, monto_bs:bs, tasa:tasa, moneda:'USD', cotizacion:(String(nc).trim()||null), factura:(String(nf).trim()||null), supersedes:Number(fId), vigente:true, fecha:fecha, creado_por:(typeof currentUser!=='undefined'?currentUser:null) };
  _ypBusy=true;
  supabaseClient.from('yapague_creditos').insert([row]).select('*').then(function(res){
    if(res&&res.error){ _ypBusy=false; showToast&&showToast('No se pudo: '+(res.error.message||'')); return null; }
    var nuevo=res&&res.data&&res.data[0]; if(nuevo)_ypCreditos.unshift(nuevo);
    return supabaseClient.from('yapague_creditos').update({vigente:false}).eq('id',fId).then(function(){
      f.vigente=false;
      var abs=(_ypCreditos||[]).filter(function(c){ return c.tipo==='abono'&&String(c.aplica_a)===String(fId); });
      if(abs.length&&nuevo){ return supabaseClient.from('yapague_creditos').update({aplica_a:nuevo.id}).eq('tipo','abono').eq('aplica_a',fId).then(function(){ abs.forEach(function(c){ c.aplica_a=nuevo.id; }); }); }
    });
  }).then(function(){ _ypBusy=false; if(typeof logAudit==='function')logAudit('yapague.cotiz_reemplazo',_ypCredSel+' #'+fId+' → nueva'); showToast&&showToast('✓ Cotización reemplazada (la vieja queda de referencia)'); _ypRender(); }).catch(function(){ _ypBusy=false; showToast&&showToast('Error de red'); });
}
function _ypDiaNav(d){ if(!_ypDia)_ypDia=_ypHoy(); var x=new Date(_ypDia+'T12:00:00'); x.setDate(x.getDate()+d); var f=x.toISOString().slice(0,10); if(f>_ypHoy())f=_ypHoy(); _ypDia=f; _ypRender(); }
function _ypDiaPedidos(){ return (_ypPedidos||[]).filter(function(p){ return String(p.fecha).slice(0,10)===_ypDia; }); }
function _ypEstadoLbl(p){ return p.estado==='entregado'?'Entregado':(p.estado==='por_llegar'?'Por llegar':(p.estado==='enviado'?(p.tipo==='delivery'?'En camino':'Por retirar'):'Orden montada')); }
function _ypCsvCell(v){ v=(v==null?'':String(v)); if(/[";\n]/.test(v))v='"'+v.replace(/"/g,'""')+'"'; return v; }
function _ypExcel(){
  var L=_ypDiaPedidos();
  if(!L.length){ showToast&&showToast('No hay pedidos el '+_ypFechaLbl(_ypDia)); return; }
  var head=['Fecha','Hora','Tipo','Código','Cliente','Teléfono','Empresa','Factura','Monto $','Pago','Estado','Caja','Facturó','Dirección','Costo viaje $','Envío','Descripción'];
  var rows=[head.join(';')];
  var tMonto=0,tCosto=0,nPk=0,nDv=0;
  L.slice().reverse().forEach(function(p){
    var m=_ypN(p.monto), c=_ypN(p.costo); tMonto+=m; if(p.tipo==='delivery'){ nDv++; tCosto+=c; } else nPk++;
    rows.push([String(p.fecha).slice(0,10),_ypHora(p.creado_en),(p.tipo==='delivery'?'Delivery':'Pickup'),p.codigo||'',p.cliente||'',p.telefono||'',p.empresa||'',p.factura||'',(m?m.toFixed(2):''),(p.credito_empresa?('Crédito '+p.credito_empresa):'Contado'),_ypEstadoLbl(p),p.caja||'',p.facturado_por||'',p.direccion||'',(p.tipo==='delivery'&&c?c.toFixed(2):''),(p.tipo==='delivery'?(p.envio==='gratis'?'Gratis':'Incluido'):''),p.descripcion||''].map(_ypCsvCell).join(';'));
  });
  rows.push('');
  rows.push(['TOTALES','',nPk+' pickup(s) · '+nDv+' delivery(s)','','','','','',tMonto.toFixed(2),'','','','','',tCosto.toFixed(2),'',''].map(_ypCsvCell).join(';'));
  var csv='\uFEFF'+rows.join('\r\n');
  try{
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='yapague_'+_ypDia+'.csv';
    document.body.appendChild(a); a.click(); setTimeout(function(){ try{ a.remove(); }catch(e){} },400);
    if(typeof logAudit==='function')logAudit('yapague.excel',_ypDia);
    showToast&&showToast('📥 Descargado yapague_'+_ypDia+'.csv (ábrelo con Excel)');
  }catch(e){ showToast&&showToast('No se pudo generar el archivo'); }
}
// Exporta a Excel los deliveries del mes para contaduría: quién paga el envío (Cliente / Nosotros) + totales
function _ypExcelDeliveryMes(){
  var mes=String(_ypDia||_ypHoy()).slice(0,7);
  var L=(_ypPedidos||[]).filter(function(p){ return p.tipo==='delivery'&&String(p.fecha).slice(0,7)===mes; });
  if(!L.length){ showToast&&showToast('No hay deliveries en '+mes); return; }
  var head=['Fecha','Cliente','Factura','Empresa','Direccion','Nº viaje','Chofer','Costo $','Paga el envio','Estado'];
  var rows=[head.join(';')]; var tCliente=0,tNosotros=0,nC=0,nN=0;
  L.slice().sort(function(a,b){ return String(a.fecha).localeCompare(String(b.fecha)); }).forEach(function(p){
    var c=_ypN(p.costo); var paga=(p.envio==='gratis')?'Nosotros':'Cliente';
    if(p.envio==='gratis'){ tNosotros+=c; nN++; } else { tCliente+=c; nC++; }
    rows.push([String(p.fecha).slice(0,10),p.cliente||'',p.factura||'',p.empresa||'',p.direccion||'',p.num_viaje||'',p.chofer||'',(c?c.toFixed(2):'0.00'),paga,_ypEstadoLbl(p)].map(_ypCsvCell).join(';'));
  });
  rows.push('');
  rows.push(['CLIENTE PAGO',nC+' viaje(s)','','','','','',tCliente.toFixed(2),'Cliente',''].map(_ypCsvCell).join(';'));
  rows.push(['NOSOTROS PAGAMOS','','','','','','',tNosotros.toFixed(2),'Nosotros (envio gratis al cliente)',''].map(_ypCsvCell).join(';'));
  rows.push(['TOTAL COSTO DELIVERY',(nC+nN)+' viaje(s)','','','','','',(tCliente+tNosotros).toFixed(2),'',''].map(_ypCsvCell).join(';'));
  var csv='\uFEFF'+rows.join('\r\n');
  try{
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='delivery_contaduria_'+mes+'.csv';
    document.body.appendChild(a); a.click(); setTimeout(function(){ try{ a.remove(); }catch(e){} },400);
    if(typeof logAudit==='function')logAudit('yapague.excel_delivery',mes);
    showToast&&showToast('📥 Descargado delivery_contaduria_'+mes+'.csv · Cliente $'+fmt(tCliente,2)+' · Nosotros $'+fmt(tNosotros,2));
  }catch(e){ showToast&&showToast('No se pudo generar el archivo'); }
}
function _ypDiarioHTML(){
  if(!_ypDia)_ypDia=_ypHoy();
  var esHoy=(_ypDia===_ypHoy());
  var L=_ypDiaPedidos();
  var nPk=0,nDv=0,tMonto=0,tCosto=0,nCred=0,dCliente=0,dNos=0;
  L.forEach(function(p){ if(p.tipo==='delivery'){ nDv++; var _c=_ypN(p.costo); tCosto+=_c; if(p.envio==='gratis')dNos+=_c; else dCliente+=_c; } else nPk++; tMonto+=_ypN(p.monto); if(p.credito_empresa)nCred++; });
  var barra='<div class="tbox" style="padding:11px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
    '<span style="font-weight:800;font-size:13px">📔 Diario</span>'+
    '<button class="btn btn-ghost btn-sm" style="padding:6px 12px;font-weight:800" onclick="_ypDiaNav(-1)">‹</button>'+
    '<input type="date" value="'+_ypDia+'" max="'+_ypHoy()+'" onchange="_ypDiaSet(this.value)" style="'+_ypInp()+';width:auto">'+
    '<button class="btn btn-ghost btn-sm" style="padding:6px 12px;font-weight:800" '+(esHoy?'disabled':'')+' onclick="_ypDiaNav(1)">›</button>'+
    (esHoy?'<span style="font-size:11px;font-weight:800;color:var(--accent)">HOY</span>':'<button class="btn btn-ghost btn-sm" style="padding:6px 12px" onclick="_ypDiaSet(_ypHoy())">Hoy</button>')+
    '<span style="flex:1"></span>'+
    '<button class="btn btn-sm" style="background:#166534;color:#fff;border:0;padding:7px 15px" onclick="_ypExcel()">📥 Exportar día</button>'+
    '<button class="btn btn-sm" style="background:#7c3aed;color:#fff;border:0;padding:7px 15px" onclick="_ypExcelDeliveryMes()">🛵 Delivery contaduría (mes)</button></div>';
  var kpi=function(lbl,val,col){ return '<div style="flex:1;min-width:110px;background:var(--surface2);border-radius:12px;padding:9px 12px"><div style="font-size:9.5px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.4px">'+lbl+'</div><div style="font-size:17px;font-weight:900;'+(col?('color:'+col):'')+'">'+val+'</div></div>'; };
  var resumen='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+
    kpi('🏪 Pickups',nPk,'')+kpi('🛵 Deliveries',nDv,'')+
    kpi('Vendido',_ypMoney(tMonto),'var(--green)')+
    kpi('Viajes Ridery','−'+_ypMoney(tCosto),'var(--red)')+
    (nDv?('<div style="flex:1;min-width:150px;background:var(--surface2);border-radius:12px;padding:9px 12px"><div style="font-size:9.5px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.4px">🛵 Envío · quién paga</div><div style="font-size:12.5px;font-weight:800;margin-top:2px">Cliente <span style="color:var(--green)">'+_ypMoney(dCliente)+'</span> · Nosotros <span style="color:var(--red)">'+_ypMoney(dNos)+'</span></div></div>'):'')+
    (nCred?kpi('💳 A crédito',nCred,'#86198f'):'')+'</div>';
  var filas=L.map(function(p){
    var est=(p.estado==='entregado')?'<span style="color:var(--green);font-weight:800;font-size:11px">✅ Entregado</span>':(p.estado==='por_llegar'?_ypChip('🚚 POR LLEGAR','#fef3c7','#92400e'):_ypChip('⏳ Pendiente','#fffbeb','#b45309'));
    return '<tr style="border-top:1px solid var(--border)">'+
      '<td style="padding:6px 8px;font-size:11px;color:var(--muted);white-space:nowrap">'+_ypHora(p.creado_en)+'</td>'+
      '<td style="padding:6px 6px;font-size:14px">'+(p.tipo==='delivery'?'🛵':'🏪')+'</td>'+
      '<td style="padding:6px 8px;font-size:12.5px;min-width:130px"><b>'+esc(p.cliente||'—')+'</b>'+(p.codigo?(' <span style="background:#eef2ff;color:#1E38A6;border-radius:6px;padding:0 6px;font-size:10.5px;font-weight:800">'+esc(p.codigo)+'</span>'):'')+
      '<div style="font-size:10.5px;color:var(--muted)">'+(p.factura?('🧾 '+esc(p.factura)+' · '):'')+esc(p.caja||'')+(p.facturado_por?(' · '+esc(p.facturado_por)):'')+(p.tipo==='delivery'&&p.direccion?(' · '+esc(p.direccion)):'')+'</div></td>'+
      '<td style="padding:6px 8px;text-align:right;font-weight:800;white-space:nowrap">'+(_ypN(p.monto)>0?_ypMoney(p.monto):'—')+(p.credito_empresa?('<div style="font-size:9.5px;color:#86198f;font-weight:800">💳 '+esc(p.credito_empresa)+'</div>'):'')+'</td>'+
      '<td style="padding:6px 8px;text-align:center;white-space:nowrap">'+est+'</td></tr>';
  }).join('');
  var tabla='<div class="tbox" style="padding:0;overflow:auto;margin-bottom:12px"><div style="padding:10px 12px 4px;font-weight:800;font-size:13px">Pedidos del '+_ypFechaLbl(_ypDia)+' ('+L.length+')</div>'+
    '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--surface2)"><th style="text-align:left;padding:6px 8px;font-size:10px">Hora</th><th></th><th style="text-align:left;padding:6px 8px;font-size:10px">Cliente / orden</th><th style="text-align:right;padding:6px 8px;font-size:10px">Monto</th><th style="padding:6px 8px;font-size:10px">Estado</th></tr></thead><tbody>'+
    (filas||'<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--muted);font-size:12px">Sin pedidos ese día.</td></tr>')+'</tbody></table></div>';
  var evs=[];
  (_ypPedidos||[]).forEach(function(p){
    if(p.llego_en&&_ypFechaVE(p.llego_en)===_ypDia)
      evs.push({ts:p.llego_en,txt:'📥 Llegó el producto de <b>'+esc(p.cliente||'—')+'</b>'+(p.factura?(' · facturado '+esc(p.factura)):'')});
    if(p.enviado_en&&_ypFechaVE(p.enviado_en)===_ypDia)
      evs.push({ts:p.enviado_en,txt:(p.tipo==='delivery'?'🛵 <b>':'🏪 <b>')+esc(p.enviado_por||'?')+'</b> marcó '+(p.tipo==='delivery'?'en camino':'listo para retiro')+' el pedido de <b>'+esc(p.cliente||'—')+'</b>'});
    if(p.entregado_en&&_ypFechaVE(p.entregado_en)===_ypDia)
      evs.push({ts:p.entregado_en,txt:'✅ <b>'+esc(p.entregado_por||'?')+'</b> entregó el pedido de <b>'+esc(p.cliente||'—')+'</b>'+(p.codigo?(' · '+esc(p.codigo)):'')});
    if(p.cobrado_ridery_fecha&&String(p.cobrado_ridery_fecha).slice(0,10)===_ypDia&&p.tipo==='delivery')
      evs.push({ts:p.creado_en,txt:'🛵 Ridery cobró el viaje '+(p.num_viaje?('<b>'+esc(p.num_viaje)+'</b> '):'')+'de '+esc(p.cliente||'—')+' · −'+_ypMoney(p.costo)});
  });
  (_ypRecargas||[]).forEach(function(r){ if(String(r.fecha).slice(0,10)===_ypDia)evs.push({ts:r.creado_en,txt:'💰 <b>'+esc(r.creado_por||'?')+'</b> registró recarga del fondo · +'+_ypMoney(r.monto)}); });
  (_ypCreditos||[]).forEach(function(c){ if(String(c.fecha).slice(0,10)===_ypDia)evs.push({ts:c.creado_en,txt:(c.tipo==='abono'?'💵 Abono de <b>':'🧾 Factura a crédito de <b>')+esc(c.empresa_cliente)+'</b> · '+_ypMoney(c.monto)}); });
  evs.sort(function(a,b){ return String(b.ts||'').localeCompare(String(a.ts||'')); });
  var act=evs.length?('<div class="tbox" style="padding:12px"><div style="font-weight:800;font-size:13px;margin-bottom:4px">Movimientos del día</div>'+
    evs.map(function(e){ return '<div style="display:flex;gap:10px;padding:7px 4px;border-bottom:1px solid var(--border);font-size:12.5px"><span style="color:var(--muted);font-size:11px;white-space:nowrap;min-width:44px">'+_ypHora(e.ts)+'</span><div>'+e.txt+'</div></div>'; }).join('')+'</div>'):'';
  return barra+resumen+tabla+act;
}
function _ypFondoHTML(){
  var puedeF=_ypPuedeFondo(); var sc=_ypSinCobrar();
  var form=puedeF?('<div class="tbox" style="padding:13px;margin-bottom:12px"><div style="font-weight:800;font-size:13px;margin-bottom:9px">➕ Registrar recarga (Mayra)</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">'+
    _ypLbl('Monto $','<input id="yp-rc-monto" type="number" step="0.01" placeholder="100" style="'+_ypInp()+'">')+
    _ypLbl('Fecha','<input id="yp-rc-fecha" type="date" value="'+_ypHoy()+'" style="'+_ypInp()+'">')+
    _ypLbl('Nota','<input id="yp-rc-nota" placeholder="ref. de la recarga en Ridery" style="'+_ypInp()+'">')+
    '</div><div style="font-size:10.5px;color:var(--muted);margin-top:6px">Primero recarga en la página de Ridery y luego regístrala aquí para que el saldo cuadre.</div>'+
    '<div style="text-align:right;margin-top:8px"><button class="btn btn-accent btn-sm" style="padding:9px 18px" onclick="_ypRecargaAdd()">Registrar recarga</button></div></div>'):
    '<div class="tbox" style="padding:11px;margin-bottom:12px;font-size:12px;color:var(--muted)">Las recargas del fondo las registra <b>Mayra</b> (o el administrador).</div>';
  var pendCard=sc.n?('<div class="tbox" style="padding:12px 14px;margin-bottom:12px;background:#fffbeb;border:1px solid #fde68a;font-size:12px;color:#92400e">🟠 <b>'+sc.n+' viaje(s)</b> montados que Ridery <b>aún no cobra</b> del fondo ('+_ypMoney(sc.total)+'). Cuando Ridery los descuente, márcalos con el botón "Ridery no ha cobrado" en cada pedido — así el saldo siempre cuadra con la página de Ridery.</div>'):'';
  var mov=[];
  (_ypRecargas||[]).forEach(function(r){ mov.push({f:String(r.fecha).slice(0,10), t:'recarga', m:_ypN(r.monto), d:r.nota||'', por:r.creado_por||'', id:r.id}); });
  (_ypPedidos||[]).forEach(function(p){ if(p.tipo==='delivery'&&p.cobrado_ridery&&_ypN(p.costo)>0)mov.push({f:String(p.cobrado_ridery_fecha||p.fecha).slice(0,10), t:'viaje', m:-_ypN(p.costo), d:(p.num_viaje?('Viaje '+p.num_viaje+' · '):'')+(p.cliente||p.direccion||''), por:p.chofer||'', id:null}); });
  // relación: saldo corrido (lo que Mayra ingresó menos lo que Ridery va restando)
  mov.sort(function(a,b){ if(a.f!==b.f)return a.f<b.f?-1:1; if(a.t!==b.t)return a.t==='recarga'?-1:1; return 0; });
  var acum=0; mov.forEach(function(m){ acum+=m.m; m.saldo=acum; });
  mov.reverse();
  var rows=mov.slice(0,120).map(function(m){
    return '<tr style="border-top:1px solid var(--border)"><td style="padding:6px 8px;font-size:11px;white-space:nowrap;color:var(--muted)">'+_ypFechaLbl(m.f)+'</td>'+
    '<td style="padding:6px 8px;font-size:12px">'+(m.t==='recarga'?'<b style="color:var(--green)">↑ Recarga</b>':'🛵')+' '+esc(m.d)+(m.por?(' <span style="font-size:10px;color:var(--muted)">· '+esc(m.por)+'</span>'):'')+'</td>'+
    '<td style="padding:6px 8px;text-align:right;font-weight:800;color:'+(m.m>=0?'var(--green)':'var(--red)')+';white-space:nowrap">'+(m.m>=0?'+':'−')+_ypMoney(Math.abs(m.m))+'</td>'+
    '<td style="padding:6px 8px;text-align:right;font-weight:800;white-space:nowrap;color:'+(m.saldo<YP_ALERTA_MIN?'var(--red)':'var(--text)')+';background:var(--surface2)">'+_ypMoney(m.saldo)+'</td>'+
    '<td style="padding:6px 4px;text-align:center">'+((m.t==='recarga'&&_ypEsAdmin())?('<button onclick="_ypRecargaDel('+m.id+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:14px">×</button>'):'')+'</td></tr>';
  }).join('');
  return form+pendCard+'<div class="tbox" style="padding:0;overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--surface2)"><th style="text-align:left;padding:7px 8px;font-size:10.5px">Fecha</th><th style="text-align:left;padding:7px 8px;font-size:10.5px">Movimiento</th><th style="text-align:right;padding:7px 8px;font-size:10.5px">Monto</th><th style="text-align:right;padding:7px 8px;font-size:10.5px" title="Recargas de Mayra menos viajes cobrados">Relación</th><th></th></tr></thead><tbody>'+
    (rows||'<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--muted);font-size:12px">Sin movimientos. Mayra registra la primera recarga con el saldo actual de Ridery.</td></tr>')+'</tbody></table></div>';
}
function _ypRender(){
  var c=document.getElementById('yapague-content'); if(!c)return;
  if(_ypLoading&&!_ypReady){ c.innerHTML='<div style="padding:20px;color:var(--muted)">Cargando Ya Pagué…</div>'; return; }
  var pend=(_ypPedidos||[]).filter(function(p){ return p.estado==='pendiente'||p.estado==='enviado'||p.estado==='por_llegar'; }).length;
  var deben=0; _ypCredEmps().forEach(function(e){ var s=_ypCredSaldo(e); if(s.deben>0)deben+=s.deben; });
  var tb=function(k,lbl){ var act=(_ypTab===k); return '<button class="btn btn-sm '+(act?'btn-accent':'btn-ghost')+'" style="border-radius:0;border:none;padding:8px 13px;font-weight:700" onclick="_ypSetTab(\''+k+'\')">'+lbl+'</button>'; };
  var tabs='<div style="display:inline-flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;flex-wrap:wrap">'+
    tb('pedidos','📋 Pedidos'+(pend?(' <span style="background:#fee2e2;color:#dc2626;border-radius:999px;padding:0 7px;font-size:10px">'+pend+'</span>'):''))+
    tb('creditos','💳 Créditos'+(deben>0.004?(' <span style="background:#fdf4ff;color:#86198f;border-radius:999px;padding:0 7px;font-size:10px">'+_ypMoney(deben)+'</span>'):''))+
    tb('diario','📔 Diario')+
    tb('fondo','💰 Fondo')+'</div>';
  if(_ypTab==='porllegar')_ypTab='pedidos';
  var body;
  if(_ypTab==='creditos')body=_ypCreditosHTML();
  else if(_ypTab==='diario')body=_ypDiarioHTML();
  else if(_ypTab==='fondo')body=_ypFondoHTML();
  else body=_ypPedidosHTML();
  c.innerHTML='<h2 style="margin:2px 0 10px;font-size:19px">🛵 Ya Pagué · Pedidos, deliveries y pickups</h2>'+_ypSaldoCard()+tabs+body;
  try{ if(_ypDetId){ var det=document.getElementById('yp-det-body'); var pd=_ypPed(_ypDetId); if(det&&pd)det.innerHTML=_ypCardHTML(pd); } }catch(e){}
}
