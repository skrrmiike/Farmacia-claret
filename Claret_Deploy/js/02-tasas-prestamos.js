function getTasaForFecha(fecha) {
  if (!fecha) return getTasa();
  const t = db.tasas || {};
  if (t[fecha]) return t[fecha];
  // Buscar la fecha anterior más cercana
  const fechas = Object.keys(t).sort();
  let mejor = null;
  for (const f of fechas) { if (f <= fecha) mejor = f; else break; }
  return mejor ? t[mejor] : getTasa();
}

function abrirTasa() {
  const t = getTasa();
  const info = document.getElementById('tasa-info-actual');
  if (t) {
    info.innerHTML = `Tasa actual: <strong style="font-family:var(--mono);font-size:16px">${Number(t).toFixed(2)} Bs/$</strong>
      <span style="color:var(--muted);font-size:11px;margin-left:6px">actualizada el ${fmtDate(db.settings.tasa_fecha||HOY())}</span>`;
  } else {
    info.innerHTML = `<span style="color:var(--amber)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> No hay tasa registrada aún. Ingresa la tasa del día.</span>`;
  }
  document.getElementById('tasa-nueva').value = t || '';
  openOverlay('ov-tasa');
  renderHistorialTasas();
  setTimeout(() => document.getElementById('tasa-nueva').focus(), 100);
  // Pre-fill hist-fecha with today
  const hf = document.getElementById('hist-fecha');
  if (hf && !hf.value) hf.value = HOY();
}

function recalcularMontosBs(tasa) {
  // Recalcula monto_bs y monto_bs_pagar de todas las facturas activas que tienen monto_usd
  let count = 0;
  db.facturas.forEach(f => {
    if (f.monto_usd !== null && f.monto_usd !== undefined) {
      f.monto_bs       = Math.round(f.monto_usd * tasa * 100) / 100;
      f.monto_bs_pagar = Math.round((f.monto_bs - (f.nc||0) - (f.ret||0)) * 100) / 100;
      count++;
    }
  });
  return count;
}

function guardarTasa() {
  const val = parseFloat(document.getElementById('tasa-nueva').value);
  if (!val || val <= 0) { showToast('Ingresa una tasa válida (mayor que 0)'); return; }
  db.settings.tasa       = val;
  db.settings.tasa_fecha = HOY();
  if (!db.tasas) db.tasas = {};
  db.tasas[HOY()] = val;
  const actualizadas = recalcularMontosBs(val);
  logAudit('tasa.actualizar','Tasa BCV: '+val+' Bs/USD');
  saveDB(db);
  checkTasaBanner();
  closeOverlay('ov-tasa');
  renderTasaHeader();
  renderTab(activeTab);
  // Refresh hints si el formulario está abierto
  if (document.getElementById('ov-factura').classList.contains('open')) {
    mostrarTasaEnForm();
    onMontoBsInput();
    onMontoUsdInput();
  }
  showToast('Tasa ' + val.toFixed(2) + ' Bs/$ guardada · ' + actualizadas + ' facturas recalculadas');
}

function guardarTasaFecha() {
  const fecha = document.getElementById('hist-fecha').value;
  const tasa  = parseFloat(document.getElementById('hist-tasa').value);
  if (!fecha) { showToast('Selecciona una fecha'); return; }
  if (!tasa || tasa <= 0) { showToast('Ingresa una tasa válida'); return; }
  if (!db.tasas) db.tasas = {};
  db.tasas[fecha] = tasa;
  saveDB(db);
  document.getElementById('hist-fecha').value = '';
  document.getElementById('hist-tasa').value  = '';
  renderHistorialTasas();
  showToast('Tasa del ' + fmtDate(fecha) + ': ' + tasa.toFixed(2) + ' Bs/$ guardada');
}

function eliminarTasaFecha(fecha) {
  if (!confirm('¿Eliminar la tasa del ' + fmtDate(fecha) + '?')) return;
  delete db.tasas[fecha];
  saveDB(db);
  renderHistorialTasas();
}

function renderHistorialTasas() {
  const el = document.getElementById('historial-tasas-lista');
  if (!el) return;
  const t = db.tasas || {};
  const te = db.tasas_eur || {};
  const fechas = Object.keys(t).sort().reverse();
  if (fechas.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:12px;padding:16px">No hay tasas históricas registradas.<br>Agrega la tasa de hoy y actualiza diariamente.</div>';
    return;
  }
  const hoy = HOY();
  const rows = fechas.slice(0, 60).map(f => {
    const esHoy = f === hoy;
    return '<tr>'
      + '<td style="font-size:12px;white-space:nowrap">' + fmtDate(f) + (esHoy ? ' <span style="background:var(--green);color:#fff;border-radius:3px;padding:1px 5px;font-size:9px">HOY</span>' : '') + '</td>'
      + '<td style="font-family:var(--mono);font-size:12px;font-weight:600">' + t[f].toLocaleString('es-VE', {minimumFractionDigits:2,maximumFractionDigits:2}) + ' Bs/$</td>'
      + '<td style="text-align:center"><button data-f="' + f + '" onclick="eliminarTasaFecha(this.dataset.f)" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:13px;padding:2px 6px" title="Eliminar">×</button></td>'
      + '</tr>';
  }).join('');
  el.innerHTML = '<div style="font-weight:600;font-size:11px;color:var(--muted);margin-bottom:6px">' + fechas.length + ' tasas registradas</div>'
    + '<div class="twrap"><table><thead><tr>'
    + '<th style="font-size:11px">Fecha</th><th style="font-size:11px">Tasa BCV</th><th></th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function mostrarTasaEnForm() {
  const t = getTasa();
  const aviso = document.getElementById('f-tasa-aviso');
  const texto = document.getElementById('f-tasa-texto');
  if (t) {
    aviso.style.display = 'block';
    texto.textContent = `Tasa del día: ${Number(t).toFixed(2)} Bs/$ (${fmtDate(db.settings.tasa_fecha||HOY())})`;
  } else {
    aviso.style.display = 'block';
    texto.textContent = 'Sin tasa registrada — la conversión no estará disponible';
  }
}


// ── Farmacia Claret · Facturas ──────────────────────────────────────────────

var _factScope=null, _prestScope=null, _factC={search:'',estado:'all',sort:'vence',asc:true}, _prestC={search:'',estado:'all'};
function _scopeChips(fn,sel){ return '<div class="fchips" style="margin-bottom:12px">'+[['todo','Farmacia + Droguería'],['farmacia','Solo Farmacia'],['drogueria','Solo Droguería']].map(function(t){ return '<button class="fchip'+(sel===t[0]?' active':'')+'" onclick="'+fn+'(\''+t[0]+'\')">'+t[1]+'</button>'; }).join('')+'</div>'; }
function _factSetScope(x){ _factScope=x; renderFacturasU(); }
function renderFacturasU(){
  if(_factScope===null) _factScope='todo';
  var c=document.getElementById('fact-scope-chips'); if(c) c.innerHTML=_scopeChips('_factSetScope',_factScope);
  var fc=document.getElementById('farmacia-content'), dc=document.getElementById('drogueria-content'), tc=document.getElementById('facturas-todo-content');
  var sT=_factScope==='todo', sF=_factScope==='farmacia', sD=_factScope==='drogueria';
  if(tc) tc.style.display=sT?'':'none'; if(fc) fc.style.display=sF?'':'none'; if(dc) dc.style.display=sD?'':'none';
  if(sT) renderFacturasCombined(); else if(tc) tc.innerHTML='';
  if(sF) renderFacturas('farmacia'); else if(fc) fc.innerHTML='';
  if(sD) renderFacturas('drogueria'); else if(dc) dc.innerHTML='';
}
function _prestSetScope(x){ _prestScope=x; renderPrestamosU(); }
function renderPrestamosU(){
  if(_prestScope===null) _prestScope='todo';
  var c=document.getElementById('prest-scope-chips'); if(c) c.innerHTML=_scopeChips('_prestSetScope',_prestScope);
  var fc=document.getElementById('prestamos-farmacia-content'), dc=document.getElementById('prestamos-drogueria-content'), tc=document.getElementById('prestamos-todo-content');
  var sT=_prestScope==='todo', sF=_prestScope==='farmacia', sD=_prestScope==='drogueria';
  if(tc) tc.style.display=sT?'':'none'; if(fc) fc.style.display=sF?'':'none'; if(dc) dc.style.display=sD?'':'none';
  if(sT) renderPrestamosCombined(); else if(tc) tc.innerHTML='';
  if(sF) renderPrestamos('FARMACIA'); else if(fc) fc.innerHTML='';
  if(sD) renderPrestamos('DROGUERIA'); else if(dc) dc.innerHTML='';
}
function _factCSet(k,v){ _factC[k]=v; renderFacturasCombined(); if(k==='search'){ var e=document.getElementById('factc-search'); if(e){ e.focus(); var n=e.value.length; try{e.setSelectionRange(n,n);}catch(_e){} } } }
function renderFacturasCombined(){
  var el=document.getElementById('facturas-todo-content'); if(!el)return;
  var fs=_factC; var all=(db.facturas||[]);
  var lista=all.slice();
  if(fs.estado!=='all') lista=lista.filter(function(f){return computeEstado(f)===fs.estado;});
  if(fs.search){ var q=fs.search.toLowerCase(); lista=lista.filter(function(f){ return (((f.proveedor||'')+' '+(f.factura||'')+' '+(f.detalle||'')).toLowerCase().indexOf(q)>=0)||(String(f.monto_usd||'').indexOf(q)>=0); }); }
  lista.sort(function(a,b){ var va,vb; if(fs.sort==='monto'){va=a.monto_usd||0;vb=b.monto_usd||0;} else if(fs.sort==='prov'){va=(a.proveedor||'');vb=(b.proveedor||'');} else {va=a.vence||'9999';vb=b.vence||'9999';} var r=va>vb?1:va<vb?-1:0; return fs.asc?r:-r; });
  var vVenc=all.filter(function(f){return computeEstado(f)==='VENCIDA';}), vPrx=all.filter(function(f){return computeEstado(f)==='POR_VENCER';});
  var sumUsd=totalUsd(all), sumBs=sumBsActual(all);
  var eb=function(e){ return e==='farmacia'?'<span class="badge badge-blue" style="font-size:9px">Farmacia</span>':'<span class="badge badge-purple" style="font-size:9px">Droguería</span>'; };
  var rows=lista.map(function(f){ var estado=computeEstado(f); var rc=estado==='VENCIDA'?'row-vencida':estado==='POR_VENCER'?'row-pronto':'';
    var paid=abonadoUsd(f), sal=saldoUsd(f);
    return '<tr class="'+rc+'">'+
      '<td data-label="Empresa">'+eb(f.empresa)+'</td>'+
      '<td data-label="Estado">'+estadoBadgeFactura(estado)+'</td>'+
      '<td data-label="Proveedor" onclick="abrirAbono(\''+f.id+'\')" style="cursor:pointer"><strong>'+esc(f.proveedor)+'</strong></td>'+
      '<td data-label="Factura" style="font-family:var(--mono);font-size:11px;white-space:nowrap">'+(esc(f.factura)||'—')+'</td>'+
      '<td data-label="Vence" style="white-space:nowrap">'+fmtDate(f.vence)+'</td>'+
      '<td data-label="Días">'+renderDias(f.vence)+'</td>'+
      '<td class="mono r" data-label="Monto $" style="min-width:90px"><strong>'+(f.monto_usd==null?'<span style="color:var(--faint)">S/INF</span>':('$'+fmt(f.monto_usd)))+'</strong>'+(paid>0?('<div style="font-size:10px;font-weight:700;color:'+(sal<=0.01?'var(--green)':'var(--accent)')+'">'+(sal<=0.01?'SALDADA':'Saldo $'+fmt(sal))+'</div>'):'')+'</td>'+
      '<td class="mono r" data-label="Bs" style="font-size:11px">'+(function(){var b=bsActual(f);return b!==null?fmt(b,0)+' Bs':'—';})()+'</td>'+
      '<td class="c acciones-cell"><div style="display:flex;gap:3px;justify-content:center">'+
        '<button class="btn btn-ghost btn-icon fact-write-only" onclick="abrirAbono(\''+f.id+'\')" title="Abonar" style="color:var(--accent);font-weight:700">$</button>'+
        '<button class="btn btn-ghost btn-icon fact-write-only" onclick="editarFactura(\''+f.id+'\')" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>'+
        '<button class="btn btn-green btn-icon fact-write-only" onclick="iniciarPago(\''+f.id+'\')" title="Pagada"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="m9 11 3 3L22 4"/><path d="M21.801 10A10 10 0 1 1 17 3.335"/></svg></button>'+
        '<button class="btn btn-ghost btn-icon fact-write-only" onclick="confirmarEliminar(\''+f.id+'\')" title="Eliminar" style="color:var(--red);font-weight:700">×</button>'+
      '</div></td></tr>';
  }).join('');
  var chips=[['all','Todas'],['VENCIDA','Vencidas'],['POR_VENCER','Por vencer'],['VIGENTE','Vigentes']].map(function(c){return '<button class="fchip '+(fs.estado===c[0]?'active':'')+'" onclick="_factCSet(\'estado\',\''+c[0]+'\')">'+c[1]+'</button>';}).join('');
  el.innerHTML=
    '<div class="summary-grid sg-4" style="margin-bottom:16px">'+
      '<div class="scard blue"><div class="scard-label">Total Facturas</div><div class="scard-val">'+all.length+'</div><div class="scard-sub">ambas empresas</div></div>'+
      '<div class="scard red"><div class="scard-label">Vencidas</div><div class="scard-val">'+vVenc.length+'</div><div class="scard-sub">$'+fmt(totalUsd(vVenc))+'</div></div>'+
      '<div class="scard amber"><div class="scard-label">Por vencer</div><div class="scard-val">'+vPrx.length+'</div><div class="scard-sub">$'+fmt(totalUsd(vPrx))+'</div></div>'+
      '<div class="scard green"><div class="scard-label">Total USD</div><div class="scard-val">$'+fmt(sumUsd)+'</div><div class="scard-sub">'+fmt(sumBs,0)+' Bs</div></div>'+
    '</div>'+
    '<div class="filter-bar filter-bar-v">'+
      '<input type="text" id="factc-search" placeholder="Buscar proveedor, factura, monto…" value="'+esc(fs.search)+'" oninput="_factCSet(\'search\',this.value)">'+
      '<div class="fchips">'+chips+'</div>'+
      '<div class="filter-actions"><span class="filter-count">'+lista.length+' resultado'+(lista.length!==1?'s':'')+'</span><div class="spacer"></div>'+
        '<button class="btn btn-accent btn-sm fact-write-only" onclick="nuevaFactura(\'farmacia\')">+ Farmacia</button>'+
        '<button class="btn btn-accent btn-sm fact-write-only" onclick="nuevaFactura(\'drogueria\')">+ Droguería</button>'+
      '</div>'+
    '</div>'+
    '<div class="tbox"><div class="tbox-hd"><span class="tbox-title">Facturas — Farmacia + Droguería</span><span class="tbox-meta">'+lista.length+' resultado'+(lista.length!==1?'s':'')+'</span></div>'+
    (lista.length===0?'<div class="empty-state"><p>No hay facturas con estos filtros</p></div>':
      '<div class="twrap"><table class="tbl-cards"><thead><tr><th>Empresa</th><th class="c">Estado</th><th>Proveedor</th><th>Factura</th><th>Vence</th><th>Días</th><th class="r">Monto $</th><th class="r">Bs</th><th class="c"></th></tr></thead><tbody>'+rows+'</tbody></table></div>')+
    '</div>';
}
function _prestCSet(k,v){ _prestC[k]=v; renderPrestamosCombined(); if(k==='search'){ var e=document.getElementById('prestc-search'); if(e){ e.focus(); var n=e.value.length; try{e.setSelectionRange(n,n);}catch(_e){} } } }
function renderPrestamosCombined(){
  var el=document.getElementById('prestamos-todo-content'); if(!el)return;
  var tasa=getTasa();
  var activos=(db.prestamos||[]).filter(function(l){return l.activo;});
  var tCuota=activos.reduce(function(a,l){return a+(l.cuota_usd||0);},0), tSaldo=activos.reduce(function(a,l){return a+(l.saldo_usd||0);},0);
  var venc=activos.filter(function(l){return estadoPrestamo(l)==='VENCIDO';}), prox=activos.filter(function(l){return ['HOY','PROXIMO'].indexOf(estadoPrestamo(l))>=0;});
  var lista;
  if(_prestC.estado==='LIQUIDADO'){ lista=(db.prestamos||[]).filter(function(l){return l.liquidado||l.activo===false;}); }
  else { lista=activos.slice(); if(_prestC.estado!=='all') lista=lista.filter(function(l){return estadoPrestamo(l)===_prestC.estado;}); }
  if(_prestC.search){ var q=_prestC.search.toLowerCase(); lista=lista.filter(function(l){return ((l.id||'')+' '+(l.banco||'')+' '+(l.entidad||'')).toLowerCase().indexOf(q)>=0;}); }
  var order={'VENCIDO':0,'HOY':1,'PROXIMO':2,'SIN_FECHA':3,'VIGENTE':4,'COMPLETADO':5};
  lista.sort(function(a,b){ return (order[estadoPrestamo(a)]||9)-(order[estadoPrestamo(b)]||9); });
  var cards=lista.map(function(l){ var tag='<span class="badge '+(l.entidad==='FARMACIA'?'badge-blue':'badge-purple')+'" style="font-size:9px;margin-right:5px">'+(l.entidad==='FARMACIA'?'Farmacia':'Droguería')+'</span>'; return _loanCard(l).replace('<div class="loan-card-hd">','<div class="loan-card-hd">'+tag); }).join('');
  var chips=[['all','Todos'],['VENCIDO','Vencidos'],['HOY','Esta semana'],['PROXIMO','Próximos'],['VIGENTE','Vigentes'],['LIQUIDADO','Liquidados']].map(function(c){return '<button class="fchip '+(_prestC.estado===c[0]?'active':'')+'" onclick="_prestCSet(\'estado\',\''+c[0]+'\')">'+c[1]+'</button>';}).join('');
  el.innerHTML=
    '<div class="summary-grid sg-4" style="margin-bottom:16px">'+
      '<div class="scard blue"><div class="scard-label">Total Activos</div><div class="scard-val">'+activos.length+'</div><div class="scard-sub">ambas empresas</div></div>'+
      '<div class="scard red"><div class="scard-label">Cuota Mensual</div><div class="scard-val">$'+fmt(tCuota)+'</div><div class="scard-sub">'+(tasa?fmt(bsLoan(tCuota),0)+' Bs':'—')+'</div></div>'+
      '<div class="scard amber"><div class="scard-label">Vencidas/Próx.</div><div class="scard-val">'+venc.length+' / '+prox.length+'</div><div class="scard-sub">vencidas · próximas</div></div>'+
      '<div class="scard purple"><div class="scard-label">Saldo Total</div><div class="scard-val">$'+fmt(tSaldo)+'</div><div class="scard-sub">'+(tasa?fmt(bsLoan(tSaldo),0)+' Bs':'—')+'</div></div>'+
    '</div>'+
    '<div class="filter-bar filter-bar-v">'+
      '<input type="text" id="prestc-search" placeholder="Buscar préstamo, banco, empresa…" value="'+esc(_prestC.search)+'" oninput="_prestCSet(\'search\',this.value)">'+
      '<div class="fchips">'+chips+'</div>'+
      '<div class="filter-actions"><span class="filter-count">'+lista.length+' préstamo'+(lista.length!==1?'s':'')+'</span><div class="spacer"></div>'+
        '<button class="btn btn-accent btn-sm" onclick="abrirNuevoPrestamo(\'FARMACIA\')">+ Farmacia</button>'+
        '<button class="btn btn-accent btn-sm" onclick="abrirNuevoPrestamo(\'DROGUERIA\')">+ Droguería</button>'+
      '</div>'+
    '</div>'+
    (lista.length===0?'<div class="empty-state"><p>No hay préstamos con estos filtros</p></div>':cards);
}
function renderFacturas(empresa) {
  if(_factScope==='todo' && document.getElementById('facturas-todo-content')){ renderFacturasCombined(); return; }
  const fs      = filterState[empresa];
  const nombre  = empresa==='farmacia' ? 'Farmacia' : 'Droguería';
  const prov    = getProveedores(empresa);

  // Apply filters
  let lista = db.facturas.filter(f => f.empresa===empresa);
  if (fs.estado !== 'all') lista = lista.filter(f => computeEstado(f)===fs.estado);
  if (fs.proveedor !== 'all') lista = lista.filter(f => f.proveedor===fs.proveedor);
  if (fs.search) {
    const q = fs.search.toLowerCase();
    lista = lista.filter(f =>
      (f.proveedor||'').toLowerCase().includes(q) ||
      (f.factura||'').toLowerCase().includes(q) ||
      (f.detalle||'').toLowerCase().includes(q) ||
      String(f.monto_usd||'').includes(q) ||
      String(f.monto_bs||'').includes(q)
    );
  }

  // Sort
  lista.sort((a,b) => {
    let va, vb;
    if (fs.sortCol==='vence')    { va=a.vence||'9999'; vb=b.vence||'9999'; }
    else if (fs.sortCol==='fecha') { va=a.fecha||''; vb=b.fecha||''; }
    else if (fs.sortCol==='monto') { va=a.monto_usd||0; vb=b.monto_usd||0; }
    else if (fs.sortCol==='prov')  { va=a.proveedor||''; vb=b.proveedor||''; }
    else { va=a.vence||'9999'; vb=b.vence||'9999'; }
    let r = va>vb?1:va<vb?-1:0;
    return fs.sortAsc ? r : -r;
  });

  // Stats
  const all     = db.facturas.filter(f => f.empresa===empresa);
  const vVenc   = all.filter(f => computeEstado(f)==='VENCIDA');
  const vPrx    = all.filter(f => computeEstado(f)==='POR_VENCER');
  const sumUsd  = totalUsd(all);
  const sumBs   = sumBsActual(all);

  function sortHdr(col, label) {
    const active = fs.sortCol===col;
    const arrow  = active ? (fs.sortAsc?'▲':'▼') : '';
    return `<th class="${active?'sorted':''}" onclick="setSort('${empresa}','${col}')" style="cursor:pointer">${label} ${arrow}</th>`;
  }
  function sortHdrR(col, label) {
    const active = fs.sortCol===col;
    const arrow  = active ? (fs.sortAsc?'▲':'▼') : '';
    return `<th class="r ${active?'sorted':''}" onclick="setSort('${empresa}','${col}')" style="cursor:pointer">${label} ${arrow}</th>`;
  }

  const provOpts = prov.map(p=>`<option value="${esc(p)}" ${fs.proveedor===p?'selected':''}>${esc(p)}</option>`).join('');

  const rows = lista.map(f => {
    const estado = computeEstado(f);
    const rowCls = estado==='VENCIDA'?'row-vencida':estado==='POR_VENCER'?'row-pronto':'';
    return `<tr class="${rowCls}">
      <td data-label="Estado">${estadoBadgeFactura(estado)}</td>
      <td data-label="Proveedor" onclick="abrirAbono('${f.id}')" style="cursor:pointer"><strong>${esc(f.proveedor)}</strong></td>
      <td data-label="Factura" style="font-family:var(--mono);font-size:11px;white-space:nowrap">${esc(f.factura)||'—'}</td>
      <td data-label="Fecha" style="white-space:nowrap">${fmtDate(f.fecha)}</td>
      <td data-label="Vence" style="white-space:nowrap">${fmtDate(f.vence)}</td>
      <td data-label="Días">${renderDias(f.vence)}</td>
      <td class="mono" data-label="Monto / Saldo" style="min-width:120px">${(()=>{
        if (f.monto_usd==null) return '<span style="color:var(--faint)">S/INF</span>';
        const m=montoPagarUsd(f), paid=abonadoUsd(f), sal=saldoUsd(f), salBs=saldoBsHoy(f);
        const pct = m>0 ? Math.min(100, Math.round(paid/m*100)) : (paid>0?100:0);
        const barColor = pct>=100?'var(--green)':pct>=50?'var(--amber)':'var(--accent)';
        const barHtml = m>0
          ? '<div style="margin-top:3px;height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden">'
            + '<div style="width:'+pct+'%;height:100%;background:'+barColor+'"></div></div>'
            + (paid>0
                ? '<div style="font-size:9px;color:#9ca3af;margin-top:1px">$'+fmt(paid)+' abonado · '+pct+'%</div>'
                  + '<div style="font-size:10px;font-weight:700;margin-top:1px;color:'+(sal<=0.01?'var(--green)':'var(--accent)')+'">'
                  + (sal<=0.01 ? 'SALDADA' : 'Saldo $'+fmt(sal)+(salBs!=null?' · '+fmt(salBs,0)+' Bs':''))
                  + '</div>'
                : '<div style="font-size:9px;color:#9ca3af;margin-top:1px">sin abonos</div>')
          : '';
        return '<strong>$'+fmt(f.monto_usd)+'</strong>'+barHtml;
      })()}</td>
      <td class="mono" data-label="Bs" style="font-size:11px">${(()=>{const b=bsActual(f);return b!==null?fmt(b,0)+' Bs':'—'})()}</td>
      <td data-label="Detalle" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px" title="${esc(f.detalle)}">${esc(f.detalle)||'—'}</td>
      <td class="c acciones-cell" data-label="">
        <div style="display:flex;gap:3px;justify-content:center">
          <button class="btn btn-ghost btn-icon fact-write-only" onclick="abrirAbono('${f.id}')" title="Abonar" style="color:var(--accent)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg></button>
          <button class="btn btn-ghost btn-icon fact-write-only" onclick="editarFactura('${f.id}')" title="Editar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="btn btn-green btn-icon fact-write-only" onclick="iniciarPago('${f.id}')" title="Marcar Pagada"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg></button>
          <button class="btn btn-ghost btn-icon fact-write-only" onclick="confirmarEliminar('${f.id}')" title="Eliminar" style="color:var(--red);font-size:16px;font-weight:700">×</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const sumUsdList = lista.reduce((a,f)=>a+(f.monto_usd||0),0);
  const sumBsList  = sumBsActual(lista);

  document.getElementById(empresa+'-content').innerHTML = `
    <div class="summary-grid sg-4" style="margin-bottom:16px">
      <div class="scard ${empresa==='farmacia'?'accent':'blue'}">
        <div class="scard-label">Total Facturas</div>
        <div class="scard-val">${all.length}</div>
        <div class="scard-sub">activas</div>
      </div>
      <div class="scard red">
        <div class="scard-label">Vencidas</div>
        <div class="scard-val">${vVenc.length}</div>
        <div class="scard-sub">$${fmt(totalUsd(vVenc))} USD</div>
      </div>
      <div class="scard amber">
        <div class="scard-label"> Por Vencer (${ALERTA}d)</div>
        <div class="scard-val">${vPrx.length}</div>
        <div class="scard-sub">$${fmt(totalUsd(vPrx))} USD</div>
      </div>
      <div class="scard green">
        <div class="scard-label">Total USD</div>
        <div class="scard-val">$${fmt(sumUsd)}</div>
        <div class="scard-sub">${fmt(sumBs,0)} Bs${getTasa()?' · @'+getTasa().toLocaleString('es-VE')+' Bs/$':''}</div>
      </div>
    </div>

    <div class="filter-bar filter-bar-v">
      <input type="text" id="${empresa}-search" placeholder="Buscar proveedor, factura, monto, nota..." value="${esc(fs.search)}"
        oninput="setFilter('${empresa}','search',this.value)">
      <div class="fchips">${[['all','Todas'],['VENCIDA','Vencidas'],['POR_VENCER','Por vencer'],['VIGENTE','Vigentes'],['CONSIGNACION','Consig.'],['SIN_VENCE','Sin fecha']].map(c=>`<button class="fchip ${fs.estado===c[0]?'active':''}" onclick="setFilter('${empresa}','estado','${c[0]}')">${c[1]}</button>`).join('')}</div>
      <div class="filter-row2">
        <select onchange="setFilter('${empresa}','proveedor',this.value)">
          <option value="all" ${fs.proveedor==='all'?'selected':''}>Todos los proveedores</option>
          ${provOpts}
        </select>
        <select onchange="setOrden('${empresa}',this.value)">
          <option value="vence" ${(!fs.orden||fs.orden==='vence')?'selected':''}>Orden: vencimiento</option>
          <option value="monto_desc" ${fs.orden==='monto_desc'?'selected':''}>Orden: monto mayor</option>
          <option value="monto_asc" ${fs.orden==='monto_asc'?'selected':''}>Orden: monto menor</option>
          <option value="prov" ${fs.orden==='prov'?'selected':''}>Orden: proveedor A-Z</option>
          <option value="reciente" ${fs.orden==='reciente'?'selected':''}>Orden: más reciente</option>
        </select>
      </div>
      <div class="filter-actions">
        <span class="filter-count">${lista.length} resultado${lista.length!==1?'s':''}</span>
        ${(fs.estado!=='all'||fs.proveedor!=='all'||(fs.search||'')!==''||(fs.orden&&fs.orden!=='vence')) ? `<button class="btn btn-ghost btn-sm" onclick="limpiarFiltros('${empresa}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>Limpiar</button>` : ''}
        <div class="spacer"></div>
        <button class="btn btn-accent btn-sm fact-write-only" onclick="nuevaFactura('${empresa}')">+ Nueva</button>
        <button class="btn btn-ghost btn-sm" onclick="exportarFacturasExcel('${empresa}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>Excel</button>
      </div>
    </div>

    <div class="tbox">
      <div class="tbox-hd">
        <span class="tbox-title">${nombre} — Facturas Activas</span>
        <span class="tbox-meta">${lista.length} resultado${lista.length!==1?'s':''}</span>
      </div>
      ${lista.length===0 ? `<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div><p>No hay facturas con los filtros seleccionados</p></div>` : `
      <div class="twrap">
        <table class="tbl-cards">
          <thead><tr>
            <th class="c">Estado</th>
            ${sortHdr('prov','Proveedor')}
            <th>Factura</th>
            ${sortHdr('fecha','Fecha')}
            ${sortHdr('vence','Vence')}
            <th>Días</th>
            ${sortHdrR('monto','Monto $')}
            <th class="r">Monto Bs</th>
            <th>Detalle</th>
            <th class="c"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="6" style="font-size:11px;color:var(--muted)">Total de ${lista.length} facturas mostradas</td>
            <td class="mono">$${fmt(sumUsdList)}</td>
            <td class="mono" style="font-size:11px">${fmt(sumBsList,0)} Bs</td>
            <td colspan="2"></td>
          </tr></tfoot>
        </table>
      </div>`}
    </div>`;
}

function setFilter(empresa, key, val) {
  filterState[empresa][key] = val;
  const prevFocus = key === 'search' ? document.getElementById(empresa+'-search') : null;
  const prevCursor = prevFocus ? prevFocus.selectionStart : null;
  renderFacturas(empresa);
  if (key === 'search') {
    const el = document.getElementById(empresa+'-search');
    if (el) { el.focus(); if (prevCursor !== null) el.setSelectionRange(prevCursor, prevCursor); }
  }
}

function setSort(empresa, col) {
  const fs = filterState[empresa];
  if (fs.sortCol===col) fs.sortAsc = !fs.sortAsc;
  else { fs.sortCol=col; fs.sortAsc=true; }
  renderFacturas(empresa);
}

function setOrden(empresa, val) {
  const fs = filterState[empresa];
  if (val==='monto_desc')      { fs.sortCol='monto'; fs.sortAsc=false; }
  else if (val==='monto_asc')  { fs.sortCol='monto'; fs.sortAsc=true; }
  else if (val==='prov')       { fs.sortCol='prov';  fs.sortAsc=true; }
  else if (val==='reciente')   { fs.sortCol='fecha'; fs.sortAsc=false; }
  else                         { fs.sortCol='vence'; fs.sortAsc=true; }
  fs.orden = val;
  renderFacturas(empresa);
}

function limpiarFiltros(empresa) {
  const fs = filterState[empresa];
  fs.estado='all'; fs.proveedor='all'; fs.search=''; fs.sortCol='vence'; fs.sortAsc=true; fs.orden='vence';
  renderFacturas(empresa);
}

function limpiarFiltrosPrest(id, entidad) {
  const s=document.getElementById('p-'+id+'-search'); if(s)s.value='';
  const bk=document.getElementById('p-'+id+'-banco'); if(bk)bk.value='all';
  const e=document.getElementById('p-'+id+'-estado'); if(e)e.value='all';
  const o=document.getElementById('p-'+id+'-orden'); if(o)o.value='estado';
  renderPrestamos(entidad);
}

