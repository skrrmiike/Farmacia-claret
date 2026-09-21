/* ============================================================
   32-almacen.js — Almacén / Depósito (prefijo _alm)
   Control de la trastienda: productos con ubicación (código corto),
   existencia, entradas de mercancía y SALIDAS hacia las cajas/vitrinas.
   La venta de las vitrinas la resta A2; aquí controlamos el depósito
   y cada movimiento queda auditado (quién sacó qué y cuándo).
   Arranca solo para FARMACIA.
   ============================================================ */

var _almEmpresa='FARMACIA';
var _almProductos=[], _almUbic=[], _almMovs=[];
var _almReady=false, _almLoading=false;
var _almVista='productos';           // 'productos' | 'movimientos' | 'ubicaciones'
var _almBuscar='', _almUbicFiltro='TODAS', _almSoloBajo=false;
var _almTmp=null;                    // estado temporal de modales
var _almScanner=null, _almScanCB=null;

function _almHoy(){ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }
function _almUser(){ return (typeof currentUser!=='undefined')?currentUser:''; }
function _almEsAdmin(){ try{ return (typeof currentRole!=='undefined') && currentRole==='admin'; }catch(e){ return false; } }
function _almPuedeVer(){ if(_almEsAdmin())return true; try{ if(typeof _tabAllowed==='function')return _tabAllowed('almacen'); }catch(e){} try{ return ['gerente'].indexOf(currentRole)>=0; }catch(e){} return false; }
function _almPuedeEditar(){ return _almPuedeVer(); }

function _almNum(v){ if(v==null)return 0; var n=parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; }
function _almNorm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
function _almFmtNum(n){ n=_almNum(n); return (Math.round(n*100)/100).toLocaleString('es-VE'); }
function _almFmtFecha(d){ if(!d)return '—'; var s=String(d).slice(0,10); var p=s.split('-'); var hora=String(d).slice(11,16); return (p.length===3)?(p[2]+'/'+p[1]+'/'+p[0]+(hora?(' '+hora):'')):s; }
function _almUbicDe(id){ if(!id)return null; for(var i=0;i<_almUbic.length;i++){ if(String(_almUbic[i].id)===String(id))return _almUbic[i]; } return null; }
function _almUbicCod(id){ var u=_almUbicDe(id); return u?u.codigo:'—'; }
var ALM_COLORS=['#1E38A6','#0891b2','#16a34a','#ca8a04','#ea580c','#dc2626','#db2777','#7c3aed','#0d9488','#475569'];
function _almUbicColor(id){ var u=_almUbicDe(id); return (u&&u.color)?u.color:'#94a3b8'; }
function _almTxtColor(hex){ try{ var h=String(hex||'').replace('#',''); if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16); var lum=(0.299*r+0.587*g+0.114*b); return lum>150?'#111':'#fff'; }catch(e){ return '#fff'; } }
function _almBadgeUbic(id,extra){ var u=_almUbicDe(id); if(!u)return '<span style="font-size:11px;color:#dc2626">sin ubicación</span>'; var c=u.color||'#94a3b8'; return '<span style="display:inline-block;background:'+c+';color:'+_almTxtColor(c)+';font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px;letter-spacing:.3px">'+esc(u.codigo)+'</span>'+(extra&&u.zona?(' <span style="font-size:10.5px;color:var(--muted)">'+esc(u.zona)+'</span>'):''); }
function _almStockBajo(p){ var mn=_almNum(p.min_alerta); return mn>0 && _almNum(p.cantidad)<=mn; }
function _almNuevoSaldo(actual, tipo, cant){ actual=_almNum(actual); cant=_almNum(cant); if(tipo==='entrada')return actual+cant; if(tipo==='salida')return actual-cant; if(tipo==='ajuste')return cant; return actual; }

/* ---------- Carga ---------- */
function _almEntrar(){ if(!_almReady){ _almCargar(); } else { _almRender(); } }
function _almCargar(){
  if(_almLoading)return; _almLoading=true;
  var cont=document.getElementById('almacen-content'); if(cont)cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">Cargando almacén…</div>';
  Promise.all([
    supabaseClient.from('almacen_ubicaciones').select('*').eq('empresa',_almEmpresa).order('codigo',{ascending:true}),
    supabaseClient.from('almacen_productos').select('*').eq('empresa',_almEmpresa).order('nombre',{ascending:true}),
    supabaseClient.from('almacen_movimientos').select('*').eq('empresa',_almEmpresa).order('creado_en',{ascending:false}).limit(150)
  ]).then(function(res){
    _almUbic=(res[0].data||[]); _almProductos=(res[1].data||[]); _almMovs=(res[2].data||[]);
    _almReady=true; _almLoading=false; _almRender();
  }).catch(function(err){
    _almLoading=false;
    var c=document.getElementById('almacen-content'); if(c)c.innerHTML='<div style="padding:30px;text-align:center;color:var(--red)">Error al cargar: '+esc(String(err&&err.message||err))+'</div>';
  });
}
function _almRefrescar(){ _almReady=false; _almCargar(); }
function _almSetVista(v){ _almVista=v; _almRender(); }
function _almSetBuscar(v){ _almBuscar=v||''; _almPintarLista(); }
function _almSetUbicFiltro(v){ _almUbicFiltro=v; _almRender(); }
function _almToggleBajo(){ _almSoloBajo=!_almSoloBajo; _almRender(); }

/* ---------- Render principal ---------- */
function _almRender(){
  var cont=document.getElementById('almacen-content'); if(!cont)return;
  if(!_almPuedeVer()){ cont.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">No tienes acceso a este módulo.</div>'; return; }

  var totProd=_almProductos.length;
  var totUnid=_almProductos.reduce(function(s,p){ return s+_almNum(p.cantidad); },0);
  var bajos=_almProductos.filter(_almStockBajo).length;

  var head=''+
    '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px">'+
      '<div><div style="font-size:19px;font-weight:800">Almacén · Farmacia</div>'+
      '<div style="font-size:12px;color:var(--muted);margin-top:2px">Depósito (trastienda). Registra entradas y cada salida hacia las cajas/vitrinas. Todo queda auditado.</div></div>'+
      '<button class="fchip" onclick="_almRefrescar()" style="font-size:12px">↻ Actualizar</button>'+
    '</div>';

  var kpis=''+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+
      '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Productos</div><div style="font-size:24px;font-weight:800;margin-top:2px">'+totProd+'</div></div>'+
      '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Unidades en depósito</div><div style="font-size:24px;font-weight:800;margin-top:2px">'+_almFmtNum(totUnid)+'</div></div>'+
      '<div class="tbox'+(bajos?'':'')+'" onclick="_almToggleBajo()" style="cursor:pointer;padding:11px 13px;flex:1;min-width:120px;border-left:3px solid '+(bajos?'#dc2626':'var(--border)')+'"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Bajo mínimo</div><div style="font-size:24px;font-weight:800;margin-top:2px;color:'+(bajos?'#dc2626':'var(--text)')+'">'+bajos+'</div></div>'+
      '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Ubicaciones</div><div style="font-size:24px;font-weight:800;margin-top:2px">'+_almUbic.length+'</div></div>'+
    '</div>';

  var acciones='';
  if(_almPuedeEditar() && _almVista!=='movil'){
    acciones='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+
      '<button onclick="_almAbrirSalida()" style="background:#dc2626;color:#fff;border:none;border-radius:9px;padding:9px 15px;font-size:13px;font-weight:800;cursor:pointer">➖ Sacar a caja</button>'+
      '<button onclick="_almAbrirEntrada()" style="background:#16a34a;color:#fff;border:none;border-radius:9px;padding:9px 15px;font-size:13px;font-weight:800;cursor:pointer">➕ Entrada</button>'+
      '<button onclick="_almEscanear(\'buscar\')" class="fchip" style="font-size:13px;font-weight:700">📷 Escanear</button>'+
      '<button onclick="_almAbrirProducto()" class="fchip" style="font-size:13px">＋ Producto</button>'+
    '</div>';
  }

  var tabs=''+
    '<div style="display:inline-flex;border:1px solid var(--border);border-radius:9px;overflow:hidden;margin-bottom:12px">'+
      ['movil|📱 Rápido','productos|Productos','movimientos|Movimientos','ubicaciones|Ubicaciones'].map(function(x){ var k=x.split('|')[0], l=x.split('|')[1]; var on=(_almVista===k); return '<button onclick="_almSetVista(\''+k+'\')" style="border:none;cursor:pointer;padding:7px 14px;font-size:12.5px;font-weight:700;'+(on?'background:#1E38A6;color:#fff':'background:var(--surface);color:var(--muted)')+'">'+l+'</button>'; }).join('')+
    '</div>';

  var cuerpo='';
  if(_almVista==='movil') cuerpo=_almMovilHTML();
  else if(_almVista==='productos') cuerpo=_almProductosHTML();
  else if(_almVista==='movimientos') cuerpo=_almMovimientosHTML();
  else cuerpo=_almUbicacionesHTML();

  cont.innerHTML=head+kpis+acciones+tabs+cuerpo;
  if(_almVista==='productos')_almPintarLista();
  if(_almVista==='movil')_almMovilPintar();
}

/* ---------- Vista MÓVIL (rápida: ingresar / sacar / buscar ubicación) ---------- */
function _almMovilHTML(){
  var puede=_almPuedeEditar();
  var big=function(color,icon,label,sub,onclick){ return '<button onclick="'+onclick+'" style="display:flex;align-items:center;gap:14px;width:100%;border:none;border-radius:16px;padding:20px 18px;background:'+color+';color:#fff;cursor:pointer;text-align:left;box-shadow:0 6px 18px '+color+'44;margin-bottom:12px"><span style="font-size:34px;line-height:1">'+icon+'</span><span style="min-width:0"><span style="display:block;font-size:19px;font-weight:800">'+label+'</span><span style="display:block;font-size:12px;opacity:.92">'+sub+'</span></span></button>'; };
  var acc=puede?(big('#16a34a','➕','Ingresar producto','Escanea el código y suma al depósito','_almEscanear(\'entrada\')')+big('#dc2626','➖','Sacar producto','Escanea el código y descuenta','_almEscanear(\'salida\')')):'';
  var buscar=big('#1E38A6','📍','Buscar ubicación','Escanea el código de barras','_almEscanear(\'buscar\')');
  var searchBox='<div style="margin-top:4px"><div style="font-size:12.5px;color:var(--muted);margin-bottom:6px;font-weight:700">…o busca por nombre / código:</div>'+
    '<input type="text" id="alm-mov-buscar" value="'+esc(_almBuscar)+'" oninput="_almMovBuscar(this.value)" placeholder="Escribe el nombre…" style="width:100%;box-sizing:border-box;padding:13px 14px;border:2px solid #1E38A6;border-radius:12px;background:var(--surface);color:var(--text);font-size:16px;outline:none">'+
    '<div id="alm-mov-lista" style="margin-top:10px"></div></div>';
  return '<div style="max-width:520px;margin:0 auto">'+acc+buscar+searchBox+'</div>';
}
function _almMovBuscar(v){ _almBuscar=v; _almMovilPintar(); }
function _almMovilPintar(){ var box=document.getElementById('alm-mov-lista'); if(!box)return; var q=_almNorm(_almBuscar); if(!q){ box.innerHTML='<div style="font-size:11.5px;color:var(--muted);text-align:center;padding:8px">Escanea arriba o escribe para buscar dónde está un producto.</div>'; return; }
  var rows=_almListaFiltrada().slice(0,25); var puede=_almPuedeEditar();
  if(!rows.length){ box.innerHTML='<div style="padding:18px;text-align:center;color:var(--muted)">Sin resultados.</div>'; return; }
  box.innerHTML=rows.map(function(p){ return '<div class="tbox" style="padding:12px 13px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px"><div style="min-width:0"><div style="font-size:14px;font-weight:700;line-height:1.2">'+esc(p.nombre)+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:3px">'+_almFmtNum(p.cantidad)+' '+esc(p.unidad||'u')+' en depósito'+(_almStockBajo(p)?' · <span style="color:#dc2626;font-weight:700">bajo mínimo</span>':'')+'</div></div><div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:5px"><div style="font-size:10px;color:var(--muted)">ubicación</div>'+_almBadgeUbic(p.ubicacion_id,true)+(puede?('<div style="display:flex;gap:5px;margin-top:2px"><button onclick="_almAbrirEntrada('+p.id+')" style="border:none;background:#16a34a;color:#fff;border-radius:7px;padding:5px 10px;font-size:12px;font-weight:800;cursor:pointer">➕</button><button onclick="_almAbrirSalida('+p.id+')" style="border:none;background:#dc2626;color:#fff;border-radius:7px;padding:5px 10px;font-size:12px;font-weight:800;cursor:pointer">➖</button></div>'):'')+'</div></div>'; }).join('');
}

/* ---------- Vista productos ---------- */
function _almProductosHTML(){
  var ubicChips='<button class="fchip'+(_almUbicFiltro==='TODAS'?' active':'')+'" onclick="_almSetUbicFiltro(\'TODAS\')" style="font-size:12px">Todas</button>'+
    _almUbic.map(function(u){ var on=(String(_almUbicFiltro)===String(u.id)); var c=u.color||'#94a3b8'; return '<button onclick="_almSetUbicFiltro(\''+u.id+'\')" style="cursor:pointer;font-size:12px;padding:5px 11px;border-radius:999px;border:1.5px solid '+c+';font-weight:700;'+(on?('background:'+c+';color:'+_almTxtColor(c)):('background:transparent;color:'+c))+'">'+esc(u.codigo)+'</button>'; }).join('')+
    '<button class="fchip'+(_almUbicFiltro==='SIN'?' active':'')+'" onclick="_almSetUbicFiltro(\'SIN\')" style="font-size:12px">Sin ubicación</button>';
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'+ubicChips+'</div>'+
    '<input type="text" id="alm-buscar" value="'+esc(_almBuscar)+'" oninput="_almSetBuscar(this.value)" placeholder="Buscar producto o código…" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13.5px;margin-bottom:10px">'+
    '<div id="alm-lista"></div>';
}
function _almListaFiltrada(){
  var q=_almNorm(_almBuscar);
  return _almProductos.filter(function(p){
    if(p.activo===false)return false;
    if(_almSoloBajo && !_almStockBajo(p))return false;
    if(_almUbicFiltro==='SIN'){ if(p.ubicacion_id)return false; }
    else if(_almUbicFiltro!=='TODAS'){ if(String(p.ubicacion_id)!==String(_almUbicFiltro))return false; }
    if(q){ var hay=_almNorm(p.nombre).indexOf(q)>=0 || String(p.codigo_barra||'').indexOf(_almBuscar.trim())>=0; if(!hay)return false; }
    return true;
  });
}
function _almPintarLista(){
  var box=document.getElementById('alm-lista'); if(!box)return;
  var rows=_almListaFiltrada();
  if(!rows.length){ box.innerHTML='<div style="padding:26px;text-align:center;color:var(--muted)">No hay productos para este filtro.</div>'; return; }
  box.innerHTML='<div style="display:flex;flex-direction:column;gap:7px">'+rows.map(_almProdCard).join('')+'</div>';
}
function _almProdCard(p){
  var bajo=_almStockBajo(p);
  var col=bajo?'#dc2626':(_almNum(p.cantidad)<=0?'#94a3b8':'#16a34a');
  var ub=_almBadgeUbic(p.ubicacion_id,true);
  var btns=_almPuedeEditar()?('<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">'+
      '<button onclick="event.stopPropagation();_almAbrirSalida('+p.id+')" class="fchip" style="font-size:11.5px">➖ Sacar</button>'+
      '<button onclick="event.stopPropagation();_almAbrirEntrada('+p.id+')" class="fchip" style="font-size:11.5px">➕ Entrada</button>'+
      '<button onclick="event.stopPropagation();_almAbrirProducto('+p.id+')" class="fchip" style="font-size:11.5px">✎ Editar</button>'+
    '</div>'):'';
  return '<div class="tbox" onclick="_almVerMovs('+p.id+')" style="padding:11px 12px;border-left:4px solid '+col+';cursor:pointer" title="Ver movimientos">'+
    '<div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between">'+
      '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700;line-height:1.25">'+esc(p.nombre)+'</div>'+
      '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+ub+(p.codigo_barra?(' · <span style="font-family:var(--mono,monospace)">'+esc(p.codigo_barra)+'</span>'):'')+'</div></div>'+
      '<div style="text-align:right;white-space:nowrap"><div style="font-size:22px;font-weight:800;color:'+col+';line-height:1">'+_almFmtNum(p.cantidad)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(p.unidad||'unidad')+(bajo?(' · mín '+_almFmtNum(p.min_alerta)):'')+'</div></div>'+
    '</div>'+btns+
  '</div>';
}

/* ---------- Vista movimientos ---------- */
function _almMovimientosHTML(){
  if(!_almMovs.length)return '<div style="padding:26px;text-align:center;color:var(--muted)">Aún no hay movimientos registrados.</div>';
  return '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Últimos '+_almMovs.length+' movimientos</div><div style="display:flex;flex-direction:column;gap:6px">'+_almMovs.map(_almMovRow).join('')+'</div>';
}
function _almMovRow(m){
  var meta={entrada:{ic:'➕',col:'#16a34a',sg:'+'},salida:{ic:'➖',col:'#dc2626',sg:'−'},ajuste:{ic:'✎',col:'#b45309',sg:'='}}[m.tipo]||{ic:'•',col:'#64748b',sg:''};
  var dest=m.destino?(' → '+esc(m.destino)):'';
  return '<div class="tbox" style="padding:9px 11px;display:flex;gap:10px;align-items:center;justify-content:space-between">'+
    '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;line-height:1.2">'+esc(m.producto_nombre||'—')+'</div>'+
    '<div style="font-size:11px;color:var(--muted)">'+_almFmtFecha(m.creado_en)+' · '+esc(m.creado_por||'')+dest+(m.motivo?(' · '+esc(m.motivo)):'')+'</div></div>'+
    '<div style="text-align:right;white-space:nowrap"><div style="font-size:16px;font-weight:800;color:'+meta.col+'">'+meta.ic+' '+meta.sg+_almFmtNum(m.cantidad)+'</div>'+(m.saldo_resultante!=null?('<div style="font-size:10px;color:var(--muted)">queda '+_almFmtNum(m.saldo_resultante)+'</div>'):'')+'</div>'+
  '</div>';
}

/* ---------- Vista ubicaciones ---------- */
function _almUbicacionesHTML(){
  var lst=_almUbic.length?_almUbic.map(function(u){
    var n=_almProductos.filter(function(p){ return String(p.ubicacion_id)===String(u.id) && p.activo!==false; }).length;
    var c=u.color||'#94a3b8';
    return '<div class="tbox" style="padding:10px 12px;display:flex;gap:10px;align-items:center;justify-content:space-between;border-left:5px solid '+c+'">'+
      '<div><span style="display:inline-block;background:'+c+';color:'+_almTxtColor(c)+';font-size:14px;font-weight:800;padding:3px 11px;border-radius:7px;letter-spacing:.5px">'+esc(u.codigo)+'</span>'+(u.zona?(' <span style="font-size:11px;font-weight:700;color:'+c+'">'+esc(u.zona)+'</span>'):'')+(u.descripcion?(' <span style="font-size:12.5px;color:var(--muted)">'+esc(u.descripcion)+'</span>'):'')+'</div>'+
      '<div style="display:flex;gap:6px;align-items:center"><span style="font-size:12px;color:var(--muted)">'+n+' prod.</span>'+(_almPuedeEditar()?('<button onclick="_almAbrirUbic('+u.id+')" class="fchip" style="font-size:11.5px">✎</button>'):'')+'</div>'+
    '</div>';
  }).join(''):'<div style="padding:20px;text-align:center;color:var(--muted)">Aún no hay ubicaciones. Crea la primera (ej. A1).</div>';
  var acc=_almPuedeEditar()?('<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+
    '<button onclick="_almAbrirUbic()" style="background:#1E38A6;color:#fff;border:none;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">＋ Nueva ubicación</button>'+
    (_almUbic.length?'<button onclick="_almImprimirEtiquetas()" class="fchip" style="font-size:13px">🖨 Imprimir etiquetas</button>':'')+
  '</div>'):'';
  return acc+'<div style="display:flex;flex-direction:column;gap:6px">'+lst+'</div>';
}

/* ============================================================
   Modales
   ============================================================ */
function _almHost(){ var h=document.getElementById('alm-modal-host'); if(!h){ h=document.createElement('div'); h.id='alm-modal-host'; document.body.appendChild(h); } return h; }
function _almCerrar(){ _almScanStop(); var h=document.getElementById('alm-modal-host'); if(h)h.innerHTML=''; _almTmp=null; }
function _almTmpSet(k,v){ if(_almTmp)_almTmp[k]=v; }
function _almWrap(inner,maxw){ return '<div onclick="_almCerrar()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto"><div onclick="event.stopPropagation()" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:'+(maxw||440)+'px;width:100%;margin:24px 0;padding:18px">'+inner+'</div></div>'; }
function _almHdr(t){ return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:16px;font-weight:800">'+esc(t)+'</div><button onclick="_almCerrar()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button></div>'; }
function _almProdOptions(sel){ return '<option value="">— Selecciona producto —</option>'+_almProductos.filter(function(p){return p.activo!==false;}).map(function(p){ return '<option value="'+p.id+'"'+(String(sel)===String(p.id)?' selected':'')+'>'+esc(p.nombre)+' ('+_almFmtNum(p.cantidad)+')</option>'; }).join(''); }
function _almUbicOptions(sel){ return '<option value="">— Sin ubicación —</option>'+_almUbic.map(function(u){ return '<option value="'+u.id+'"'+(String(sel)===String(u.id)?' selected':'')+'>'+esc(u.codigo)+(u.descripcion?(' · '+esc(u.descripcion)):'')+'</option>'; }).join(''); }

/* ---------- Salida (sacar a caja) ---------- */
function _almAbrirSalida(prodId){
  if(!_almPuedeEditar())return;
  _almTmp={ modo:'salida', producto_id:prodId?String(prodId):'', cantidad:'', destino:'Caja', motivo:'' };
  _almHost().innerHTML=_almSalidaHTML();
}
function _almSalidaHTML(){
  var t=_almTmp; var p=t.producto_id?_almProductos.filter(function(x){return String(x.id)===String(t.producto_id);})[0]:null;
  var saldo=p?_almNum(p.cantidad):null;
  var nuevo=(p&&t.cantidad!=='')?(saldo-_almNum(t.cantidad)):null;
  var warn=(nuevo!=null&&nuevo<0)?'<div style="font-size:11.5px;color:#dc2626;margin-top:4px">⚠ Vas a dejar el saldo en negativo ('+_almFmtNum(nuevo)+'). Revisa la cantidad.</div>':'';
  var dests=['Caja','Vitrina','Mostrador'];
  return _almWrap(_almHdr('Sacar a caja')+
    '<div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Registra lo que sale del depósito hacia las cajas/vitrinas. Descuenta la existencia y queda en el historial.</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:8px"><button onclick="_almEscanear(\'salida\')" class="fchip" style="font-size:12.5px">📷 Escanear código</button></div>'+
    '<label style="display:block"><span style="font-size:12px;color:var(--muted)">Producto</span><select onchange="_almTmpSet(\'producto_id\',this.value);_almReSal()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px">'+_almProdOptions(t.producto_id)+'</select></label>'+
    (p?('<div style="font-size:12px;color:var(--muted);margin-top:5px">Existencia actual: <b style="color:var(--text)">'+_almFmtNum(saldo)+'</b> '+esc(p.unidad||'unidad')+' · Ubicación '+esc(_almUbicCod(p.ubicacion_id))+'</div>'):'')+
    '<label style="display:block;margin-top:9px"><span style="font-size:12px;color:var(--muted)">Cantidad que sale</span><input type="number" inputmode="decimal" min="0" value="'+esc(String(t.cantidad))+'" oninput="_almTmpSet(\'cantidad\',this.value);_almReSal()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:15px;margin-top:3px"></label>'+warn+
    '<label style="display:block;margin-top:9px"><span style="font-size:12px;color:var(--muted)">¿A dónde va?</span><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">'+dests.map(function(d){ return '<button onclick="_almTmpSet(\'destino\',\''+d+'\');_almReSal()" class="fchip'+(t.destino===d?' active':'')+'" style="font-size:12px">'+d+'</button>'; }).join('')+'</div></label>'+
    '<input type="text" value="'+esc(t.motivo||'')+'" oninput="_almTmpSet(\'motivo\',this.value)" placeholder="Nota (opcional): quién lo pidió, etc." style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:12.5px;margin-top:9px">'+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end"><button onclick="_almCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_almGuardarSalida()" style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Registrar salida</button></div>'
  ,460);
}
function _almReSal(){ var h=document.getElementById('alm-modal-host'); if(h)h.innerHTML=_almSalidaHTML(); }
function _almGuardarSalida(){
  var t=_almTmp; if(!t||!_almPuedeEditar())return;
  if(!t.producto_id){ showToast&&showToast('Selecciona el producto'); return; }
  var cant=_almNum(t.cantidad); if(cant<=0){ showToast&&showToast('Indica la cantidad'); return; }
  _almRegistrarMov('salida', t.producto_id, cant, t.destino, t.motivo);
}

/* ---------- Entrada ---------- */
function _almAbrirEntrada(prodId){
  if(!_almPuedeEditar())return;
  _almTmp={ modo:'entrada', producto_id:prodId?String(prodId):'', cantidad:'', motivo:'' };
  _almHost().innerHTML=_almEntradaHTML();
}
function _almEntradaHTML(){
  var t=_almTmp; var p=t.producto_id?_almProductos.filter(function(x){return String(x.id)===String(t.producto_id);})[0]:null;
  return _almWrap(_almHdr('Entrada de mercancía')+
    '<div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Suma mercancía que llega al depósito. Si el producto no existe, créalo primero con “＋ Producto”.</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:8px"><button onclick="_almEscanear(\'entrada\')" class="fchip" style="font-size:12.5px">📷 Escanear código</button></div>'+
    '<label style="display:block"><span style="font-size:12px;color:var(--muted)">Producto</span><select onchange="_almTmpSet(\'producto_id\',this.value);_almReEnt()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px">'+_almProdOptions(t.producto_id)+'</select></label>'+
    (p?('<div style="font-size:12px;color:var(--muted);margin-top:5px">Existencia actual: <b style="color:var(--text)">'+_almFmtNum(p.cantidad)+'</b> '+esc(p.unidad||'unidad')+'</div>'):'')+
    '<label style="display:block;margin-top:9px"><span style="font-size:12px;color:var(--muted)">Cantidad que entra</span><input type="number" inputmode="decimal" min="0" value="'+esc(String(t.cantidad))+'" oninput="_almTmpSet(\'cantidad\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:15px;margin-top:3px"></label>'+
    '<input type="text" value="'+esc(t.motivo||'')+'" oninput="_almTmpSet(\'motivo\',this.value)" placeholder="Nota (opcional): factura, proveedor…" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:12.5px;margin-top:9px">'+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end"><button onclick="_almCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_almGuardarEntrada()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Registrar entrada</button></div>'
  ,460);
}
function _almReEnt(){ var h=document.getElementById('alm-modal-host'); if(h)h.innerHTML=_almEntradaHTML(); }
function _almGuardarEntrada(){
  var t=_almTmp; if(!t||!_almPuedeEditar())return;
  if(!t.producto_id){ showToast&&showToast('Selecciona el producto'); return; }
  var cant=_almNum(t.cantidad); if(cant<=0){ showToast&&showToast('Indica la cantidad'); return; }
  _almRegistrarMov('entrada', t.producto_id, cant, null, t.motivo);
}

/* ---------- Registrar movimiento (entrada/salida/ajuste) ---------- */
function _almRegistrarMov(tipo, prodId, cant, destino, motivo){
  var p=_almProductos.filter(function(x){return String(x.id)===String(prodId);})[0]; if(!p){ showToast&&showToast('Producto no válido'); return; }
  var nuevo=_almNuevoSaldo(p.cantidad, tipo, cant);
  var mov={ empresa:_almEmpresa, producto_id:p.id, producto_nombre:p.nombre, tipo:tipo, cantidad:cant, saldo_resultante:nuevo,
    ubicacion_id:p.ubicacion_id||null, destino:destino||null, motivo:(motivo||'').trim()||null, creado_por:_almUser() };
  supabaseClient.from('almacen_movimientos').insert(mov).then(function(res){
    if(res.error){ showToast&&showToast('Error: '+res.error.message); return; }
    return supabaseClient.from('almacen_productos').update({ cantidad:nuevo, actualizado_en:new Date().toISOString() }).eq('id',p.id).select('*');
  }).then(function(res){
    if(res&&res.data&&res.data[0]){ for(var i=0;i<_almProductos.length;i++){ if(String(_almProductos[i].id)===String(p.id)){ _almProductos[i]=res.data[0]; break; } } }
    _almMovs.unshift({ tipo:tipo, cantidad:cant, saldo_resultante:nuevo, producto_nombre:p.nombre, destino:destino||null, motivo:(motivo||'').trim()||null, creado_por:_almUser(), creado_en:new Date().toISOString() });
    if(typeof logAudit==='function')logAudit('almacen_'+tipo, tipo+' '+cant+' de '+p.nombre+(destino?(' → '+destino):''));
    _almCerrar(); _almRender();
    showToast&&showToast((tipo==='salida'?'Salida':(tipo==='entrada'?'Entrada':'Ajuste'))+' registrada ✓');
  }).catch(function(err){ showToast&&showToast('Error: '+(err&&err.message||err)); });
}

/* ---------- Producto (crear / editar) ---------- */
function _almAbrirProducto(prodId, prefill){
  if(!_almPuedeEditar())return;
  var p=prodId?_almProductos.filter(function(x){return String(x.id)===String(prodId);})[0]:null;
  _almTmp={ modo:'producto', id:p?p.id:null,
    nombre:p?p.nombre:((prefill&&prefill.nombre)||''),
    codigo_barra:p?(p.codigo_barra||''):((prefill&&prefill.codigo_barra)||''),
    unidad:p?(p.unidad||'unidad'):'unidad',
    ubicacion_id:p?(p.ubicacion_id||''):'',
    cantidad:p?_almNum(p.cantidad):0,
    min_alerta:p?_almNum(p.min_alerta):0,
    esNuevo:!p };
  _almHost().innerHTML=_almProductoHTML();
}
function _almProductoHTML(){
  var t=_almTmp;
  var fld=function(lbl,k,type,ph){ return '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">'+lbl+'</span><input type="'+type+'" value="'+esc(String(t[k]!=null?t[k]:''))+'" oninput="_almTmpSet(\''+k+'\',this.value)" placeholder="'+(ph||'')+'" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'; };
  return _almWrap(_almHdr(t.id?'Editar producto':'Nuevo producto')+
    fld('Nombre','nombre','text','ej. Acetaminofén 500mg x 10')+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Código de barras</span><div style="display:flex;gap:6px;margin-top:3px"><input type="text" value="'+esc(t.codigo_barra||'')+'" oninput="_almTmpSet(\'codigo_barra\',this.value)" placeholder="opcional" style="flex:1;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px"><button onclick="_almEscanear(\'producto\')" class="fchip" style="font-size:12px;white-space:nowrap">📷</button></div></label>'+
    fld('Unidad','unidad','text','unidad, caja, blister…')+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Ubicación</span><select onchange="_almTmpSet(\'ubicacion_id\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px">'+_almUbicOptions(t.ubicacion_id)+'</select></label>'+
    '<div style="display:flex;gap:8px">'+
      '<label style="display:block;margin-top:8px;flex:1"><span style="font-size:12px;color:var(--muted)">'+(t.esNuevo?'Cantidad inicial':'Cantidad (ajuste)')+'</span><input type="number" inputmode="decimal" value="'+esc(String(t.cantidad))+'" oninput="_almTmpSet(\'cantidad\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
      '<label style="display:block;margin-top:8px;flex:1"><span style="font-size:12px;color:var(--muted)">Mínimo (alerta)</span><input type="number" inputmode="decimal" value="'+esc(String(t.min_alerta))+'" oninput="_almTmpSet(\'min_alerta\',this.value)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '</div>'+
    (t.id?'<div style="font-size:11px;color:var(--muted);margin-top:6px">Cambiar la cantidad aquí registra un ajuste de conteo.</div>':'')+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'+(t.id?'<button onclick="_almBorrarProducto('+t.id+')" class="fchip" style="font-size:13px;color:#dc2626">Desactivar</button>':'')+'<button onclick="_almCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_almGuardarProducto()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button></div>'
  ,460);
}
function _almGuardarProducto(){
  var t=_almTmp; if(!t||!_almPuedeEditar())return;
  var nombre=(t.nombre||'').trim(); if(!nombre){ showToast&&showToast('Ponle nombre al producto'); return; }
  var base={ empresa:_almEmpresa, nombre:nombre, codigo_barra:(t.codigo_barra||'').trim()||null, unidad:(t.unidad||'unidad').trim()||'unidad',
    ubicacion_id:t.ubicacion_id||null, min_alerta:_almNum(t.min_alerta), actualizado_en:new Date().toISOString() };
  if(t.id){
    var prev=_almProductos.filter(function(x){return String(x.id)===String(t.id);})[0];
    var nuevaCant=_almNum(t.cantidad);
    base.cantidad=nuevaCant;
    supabaseClient.from('almacen_productos').update(base).eq('id',t.id).select('*').then(function(res){
      if(res.error){ showToast&&showToast('Error: '+res.error.message); return; }
      if(res.data&&res.data[0]){ for(var i=0;i<_almProductos.length;i++){ if(String(_almProductos[i].id)===String(t.id)){ _almProductos[i]=res.data[0]; break; } } }
      // si cambió la cantidad, deja rastro como ajuste
      if(prev && _almNum(prev.cantidad)!==nuevaCant){
        var mv={ empresa:_almEmpresa, producto_id:t.id, producto_nombre:nombre, tipo:'ajuste', cantidad:nuevaCant, saldo_resultante:nuevaCant, ubicacion_id:base.ubicacion_id, motivo:'Ajuste de conteo', creado_por:_almUser() };
        supabaseClient.from('almacen_movimientos').insert(mv).then(function(){ _almMovs.unshift(mv); });
      }
      if(typeof logAudit==='function')logAudit('almacen_prod','Editó producto '+nombre);
      _almCerrar(); _almRender(); showToast&&showToast('Guardado ✓');
    });
  } else {
    base.cantidad=_almNum(t.cantidad); base.creado_por=_almUser();
    supabaseClient.from('almacen_productos').insert(base).select('*').then(function(res){
      if(res.error){ showToast&&showToast('Error: '+res.error.message); return; }
      var np=(res.data&&res.data[0])?res.data[0]:null; if(np)_almProductos.push(np);
      if(np && _almNum(np.cantidad)>0){
        var mv={ empresa:_almEmpresa, producto_id:np.id, producto_nombre:nombre, tipo:'entrada', cantidad:_almNum(np.cantidad), saldo_resultante:_almNum(np.cantidad), ubicacion_id:np.ubicacion_id, motivo:'Alta de producto', creado_por:_almUser() };
        supabaseClient.from('almacen_movimientos').insert(mv).then(function(){ _almMovs.unshift(mv); });
      }
      if(typeof logAudit==='function')logAudit('almacen_prod','Creó producto '+nombre);
      _almCerrar(); _almRender(); showToast&&showToast('Producto creado ✓');
    });
  }
}
function _almBorrarProducto(id){
  if(!_almPuedeEditar())return;
  supabaseClient.from('almacen_productos').update({activo:false,actualizado_en:new Date().toISOString()}).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('Error: '+res.error.message); return; }
    _almProductos=_almProductos.filter(function(p){return String(p.id)!==String(id);});
    _almCerrar(); _almRender(); showToast&&showToast('Producto desactivado');
  });
}

/* ---------- Ubicación (crear / editar) ---------- */
function _almAbrirUbic(id){
  if(!_almPuedeEditar())return;
  var u=id?_almUbic.filter(function(x){return String(x.id)===String(id);})[0]:null;
  _almTmp={ modo:'ubic', id:u?u.id:null, codigo:u?u.codigo:'', descripcion:u?(u.descripcion||''):'', zona:u?(u.zona||''):'', color:u?(u.color||'#1E38A6'):'#1E38A6' };
  _almHost().innerHTML=_almUbicHTML();
}
function _almUbicHTML(){
  var t=_almTmp;
  var sw=ALM_COLORS.map(function(c){ var on=(String(t.color).toLowerCase()===c.toLowerCase()); return '<button onclick="_almTmpSet(\'color\',\''+c+'\');_almReUbic()" style="width:34px;height:34px;border-radius:8px;background:'+c+';cursor:pointer;border:3px solid '+(on?'#111':'transparent')+';box-shadow:0 0 0 1px var(--border)"'+(on?' title="seleccionado"':'')+'></button>'; }).join('');
  var prev='<span style="display:inline-block;background:'+t.color+';color:'+_almTxtColor(t.color)+';font-size:15px;font-weight:800;padding:4px 13px;border-radius:8px;letter-spacing:.5px">'+esc(t.codigo||'A1')+'</span>';
  return _almWrap(_almHdr(t.id?'Editar ubicación':'Nueva ubicación')+
    '<label style="display:block"><span style="font-size:12px;color:var(--muted)">Código corto</span><input type="text" value="'+esc(t.codigo||'')+'" oninput="_almTmpSet(\'codigo\',this.value.toUpperCase())" placeholder="ej. A1, B3, C2" maxlength="12" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:15px;font-weight:700;letter-spacing:.5px;margin-top:3px"></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Zona (opcional)</span><input type="text" value="'+esc(t.zona||'')+'" oninput="_almTmpSet(\'zona\',this.value)" placeholder="ej. Jarabes, Cremas, Nevera…" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Descripción (opcional)</span><input type="text" value="'+esc(t.descripcion||'')+'" oninput="_almTmpSet(\'descripcion\',this.value)" placeholder="ej. Estante 1, nivel 2" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px"></label>'+
    '<div style="margin-top:10px"><div style="font-size:12px;color:var(--muted);margin-bottom:5px">Color '+prev+'</div><div style="display:flex;gap:7px;flex-wrap:wrap">'+sw+'</div></div>'+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'+(t.id?'<button onclick="_almBorrarUbic('+t.id+')" class="fchip" style="font-size:13px;color:#dc2626">Eliminar</button>':'')+'<button onclick="_almCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_almGuardarUbic()" style="background:#1E38A6;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button></div>'
  ,400);
}
function _almReUbic(){ var h=document.getElementById('alm-modal-host'); if(h)h.innerHTML=_almUbicHTML(); }
function _almGuardarUbic(){
  var t=_almTmp; if(!t||!_almPuedeEditar())return;
  var cod=(t.codigo||'').trim().toUpperCase(); if(!cod){ showToast&&showToast('Ponle un código'); return; }
  var row={ empresa:_almEmpresa, codigo:cod, descripcion:(t.descripcion||'').trim()||null, zona:(t.zona||'').trim()||null, color:t.color||'#1E38A6' };
  var q=t.id? supabaseClient.from('almacen_ubicaciones').update(row).eq('id',t.id).select('*')
            : supabaseClient.from('almacen_ubicaciones').insert(Object.assign({creado_por:_almUser()},row)).select('*');
  q.then(function(res){
    if(res.error){ showToast&&showToast(res.error.message.indexOf('duplicate')>=0?'Ese código ya existe':('Error: '+res.error.message)); return; }
    var saved=(res.data&&res.data[0])?res.data[0]:null;
    if(saved){ if(t.id){ for(var i=0;i<_almUbic.length;i++){ if(String(_almUbic[i].id)===String(t.id)){ _almUbic[i]=saved; break; } } } else { _almUbic.push(saved); _almUbic.sort(function(a,b){return String(a.codigo).localeCompare(String(b.codigo));}); } }
    _almCerrar(); _almRender(); showToast&&showToast('Ubicación guardada ✓');
  });
}
function _almBorrarUbic(id){
  if(!_almPuedeEditar())return;
  var n=_almProductos.filter(function(p){return String(p.ubicacion_id)===String(id)&&p.activo!==false;}).length;
  if(n>0){ showToast&&showToast('Esa ubicación tiene '+n+' producto(s). Muévelos primero.'); return; }
  supabaseClient.from('almacen_ubicaciones').delete().eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('Error: '+res.error.message); return; }
    _almUbic=_almUbic.filter(function(u){return String(u.id)!==String(id);});
    _almCerrar(); _almRender(); showToast&&showToast('Ubicación eliminada');
  });
}

/* ---------- Imprimir etiquetas de estantes ---------- */
function _almImprimirEtiquetas(){
  var cels=_almUbic.map(function(u){
    var c=u.color||'#1E38A6'; var tx=_almTxtColor(c);
    return '<div class="lbl" style="border-color:'+c+'"><div class="hdr" style="background:'+c+';color:'+tx+'">'+(u.zona?esc(u.zona):'ALMACÉN')+'</div><div class="cod" style="color:'+c+'">'+esc(u.codigo)+'</div>'+(u.descripcion?('<div class="dsc">'+esc(u.descripcion)+'</div>'):'')+'<div class="pie">Farmacia Claret</div></div>';
  }).join('');
  var doc='<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas de estantes</title><style>'+
    'body{font-family:Arial,Helvetica,sans-serif;margin:10mm}'+
    '.grid{display:flex;flex-wrap:wrap;gap:8mm}'+
    '.lbl{width:82mm;height:52mm;border:4mm solid #1E38A6;border-radius:6mm;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:3mm;position:relative;overflow:hidden}'+
    '.hdr{position:absolute;top:0;left:0;right:0;font-size:4.5mm;font-weight:800;letter-spacing:.5mm;text-align:center;padding:1.5mm 0;text-transform:uppercase}'+
    '.cod{font-size:30mm;font-weight:800;line-height:1;margin-top:6mm}'+
    '.dsc{font-size:4.5mm;color:#334155;margin-top:2mm;text-align:center}'+
    '.pie{font-size:3mm;color:#94a3b8;margin-top:1.5mm}'+
    '@media print{.lbl{page-break-inside:avoid}}'+
    '</style></head><body><div class="grid">'+cels+'</div></body></html>';
  var ifr=document.createElement('iframe'); ifr.setAttribute('aria-hidden','true'); ifr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
  document.body.appendChild(ifr);
  var idoc=ifr.contentWindow.document; idoc.open(); idoc.write(doc); idoc.close();
  setTimeout(function(){ try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }catch(e){ try{ window.print(); }catch(_e){} } setTimeout(function(){ try{ document.body.removeChild(ifr); }catch(e){} }, 1800); }, 400);
}

/* ---------- Movimientos de un producto ---------- */
function _almVerMovs(prodId){
  var p=_almProductos.filter(function(x){return String(x.id)===String(prodId);})[0]; if(!p)return;
  _almHost().innerHTML='<div onclick="_almCerrar()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px"><div onclick="event.stopPropagation()" style="background:var(--surface);border-radius:14px;padding:22px;color:var(--muted)">Cargando…</div></div>';
  supabaseClient.from('almacen_movimientos').select('*').eq('producto_id',prodId).order('creado_en',{ascending:false}).limit(60).then(function(res){
    var ms=(res&&res.data)||[];
    var lst=ms.length?ms.map(_almMovRow).join(''):'<div style="padding:16px;text-align:center;color:var(--muted)">Sin movimientos.</div>';
    var h=document.getElementById('alm-modal-host'); if(h)h.innerHTML=_almWrap(_almHdr(p.nombre)+
      '<div style="font-size:13px;margin-bottom:8px">Existencia actual: <b>'+_almFmtNum(p.cantidad)+'</b> '+esc(p.unidad||'unidad')+' · Ubicación '+esc(_almUbicCod(p.ubicacion_id))+'</div>'+
      '<div style="display:flex;flex-direction:column;gap:6px">'+lst+'</div>', 480);
  });
}

/* ============================================================
   Escaneo de código de barras (cámara del teléfono)
   Usa html5-qrcode (carga diferida desde CDN). Con respaldo manual.
   ============================================================ */
function _almLoadScanLib(cb){
  if(window.Html5Qrcode){ cb(true); return; }
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
  s.onload=function(){ cb(!!window.Html5Qrcode); };
  s.onerror=function(){ cb(false); };
  document.head.appendChild(s);
}
function _almEscanear(modo){
  if(!_almPuedeEditar())return;
  _almScanCB=modo;
  _almHost().insertAdjacentHTML('beforeend','<div id="alm-scan-layer" style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10001;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px">'+
    '<div style="color:#fff;font-size:14px;font-weight:700;margin-bottom:10px">Apunta al código de barras</div>'+
    '<div id="alm-scan-reader" style="width:min(92vw,420px);background:#000;border-radius:12px;overflow:hidden"></div>'+
    '<div id="alm-scan-msg" style="color:#cbd5e1;font-size:12px;margin-top:10px;text-align:center;max-width:420px"></div>'+
    '<div style="display:flex;gap:8px;margin-top:14px"><button onclick="_almScanManual()" style="background:#334155;color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer">Escribir código</button><button onclick="_almScanStop()" style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer">Cerrar</button></div>'+
  '</div>');
  var msg=document.getElementById('alm-scan-msg'); if(msg)msg.textContent='Cargando cámara…';
  _almLoadScanLib(function(ok){
    if(!ok){ if(msg)msg.textContent='No se pudo cargar el lector. Usa “Escribir código”.'; return; }
    try{
      _almScanner=new Html5Qrcode('alm-scan-reader');
      _almScanner.start({facingMode:'environment'}, {fps:10, qrbox:{width:250,height:150}},
        function(txt){ _almScanDetectado(txt); },
        function(){});
      if(msg)msg.textContent='Buscando código…';
    }catch(e){ if(msg)msg.textContent='La cámara no está disponible. Usa “Escribir código”.'; }
  });
}
function _almScanStop(){
  var lay=document.getElementById('alm-scan-layer');
  var done=function(){ if(lay&&lay.parentNode)lay.parentNode.removeChild(lay); };
  if(_almScanner){ try{ _almScanner.stop().then(function(){ try{_almScanner.clear();}catch(e){} _almScanner=null; done(); }).catch(function(){ _almScanner=null; done(); }); }catch(e){ _almScanner=null; done(); } }
  else done();
}
function _almScanManual(){
  var code=window.prompt('Escribe el código de barras:'); if(code===null)return; code=(''+code).trim(); if(!code)return;
  _almScanDetectado(code);
}
function _almScanDetectado(code){
  code=(''+code).trim(); if(!code)return;
  _almScanStop();
  var p=_almProductos.filter(function(x){ return String(x.codigo_barra||'').replace(/\s/g,'')===code.replace(/\s/g,''); })[0];
  var modo=_almScanCB;
  if(modo==='producto'){ if(_almTmp){ _almTmp.codigo_barra=code; var h=document.getElementById('alm-modal-host'); if(h){ if(_almTmp.modo==='producto')h.innerHTML=_almProductoHTML(); } } showToast&&showToast('Código: '+code); return; }
  if(p){
    showToast&&showToast('Encontrado: '+p.nombre);
    if(modo==='salida')_almAbrirSalida(p.id);
    else if(modo==='entrada')_almAbrirEntrada(p.id);
    else _almVerMovs(p.id);
  } else {
    if(window.confirm('Ese código no está registrado. ¿Crear un producto nuevo con el código '+code+'?')) _almAbrirProducto(null,{codigo_barra:code});
    else showToast&&showToast('Código no registrado: '+code);
  }
}

/* ---------- Entry point ---------- */
function renderAlmacen(){ _almEntrar(); }
