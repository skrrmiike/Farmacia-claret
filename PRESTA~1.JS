// ── Farmacia Claret · Préstamos ─────────────────────────────────────────────

function renderPrestamos(entidad) {
  const id = entidad.toLowerCase();
  const icon = entidad==='FARMACIA' ? 'F' : 'D';
  const todos = db.prestamos.filter(l => l.entidad===entidad);
  const activos = todos.filter(l => l.activo);
  const tasa = getTasa();

  // Filter
  const search = (document.getElementById('p-'+id+'-search')||{value:''}).value.toLowerCase();
  const filterBanco = (document.getElementById('p-'+id+'-banco')||{value:'all'}).value;
  const filterEstado = (document.getElementById('p-'+id+'-estado')||{value:'all'}).value;
  const ordenP = (document.getElementById('p-'+id+'-orden')||{value:'estado'}).value;

  let lista = activos;
  if (filterBanco !== 'all') lista = lista.filter(l => l.banco===filterBanco);
  if (filterEstado !== 'all') lista = lista.filter(l => estadoPrestamo(l)===filterEstado);
  if (search) lista = lista.filter(l => l.id.toLowerCase().includes(search) || l.banco.toLowerCase().includes(search) || String(l.cuota_usd||'').includes(search) || String(l.saldo_usd||'').includes(search));

  const tCuota = activos.reduce((a,l)=>a+(l.cuota_usd||0),0);
  const tSaldo = activos.reduce((a,l)=>a+(l.saldo_usd||0),0);
  const venc = activos.filter(l=>estadoPrestamo(l)==='VENCIDO');
  const prox = activos.filter(l=>['HOY','PROXIMO'].includes(estadoPrestamo(l)));

  const bancosMap = {};
  lista.forEach(l => {
    if (!bancosMap[l.banco]) bancosMap[l.banco] = [];
    bancosMap[l.banco].push(l);
  });

  const cardsHtml = lista.sort((a,b)=>{
    if (ordenP==='saldo_desc') return (b.saldo_usd||0)-(a.saldo_usd||0);
    if (ordenP==='saldo_asc')  return (a.saldo_usd||0)-(b.saldo_usd||0);
    if (ordenP==='cuota_desc') return (b.cuota_usd||0)-(a.cuota_usd||0);
    if (ordenP==='vence')      return (a.proxima_cuota||'9999').localeCompare(b.proxima_cuota||'9999');
    const order = {'VENCIDO':0,'HOY':1,'PROXIMO':2,'SIN_FECHA':3,'VIGENTE':4,'COMPLETADO':5};
    return (order[estadoPrestamo(a)]||9) - (order[estadoPrestamo(b)]||9);
  }).map(l => {
    const estado = estadoPrestamo(l);
    const pct = l.total_cuotas>0 ? Math.round(l.cuotas_hechas/l.total_cuotas*100) : 0;
    const barColor = pct>=80?'var(--green)':pct>=40?'var(--amber)':'var(--accent)';
    const dias = diasHasta(l.proxima_cuota);
    const cuotaBs = bsLoan(l.cuota_usd);
    const saldoBs = bsLoan(l.saldo_usd);
    return '<div class="loan-card '+loanCardClass(estado)+'">' +
      '<div class="loan-card-hd">' +
        estadoBadge(estado) +
        '<span class="badge '+(l.banco==='PROVINCIAL'?'badge-blue':l.banco==='MERCANTIL'?'badge-green':'badge-purple')+'">'+esc(l.banco)+'</span>' +
        '<span class="loan-card-title" style="cursor:pointer" onclick="verDetalle(\''+l.id.replace(/'/g,"\'")+'\')">'+esc(l.id)+'</span>' +
        '<button class="btn btn-green btn-sm" onclick="abrirPago(\''+l.id.replace(/'/g,"\'")+'\')" style="margin-left:auto"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> Pagar</button>' +
      '</div>' +
      '<div class="loan-card-body">' +
        '<div class="loan-stat"><div class="loan-stat-label">Cuota Mensual</div><div class="loan-stat-val">$'+fmt(l.cuota_usd)+'</div><div class="loan-stat-sub">'+(cuotaBs?fmt(cuotaBs,0)+' Bs':'—')+'</div></div>' +
        '<div class="loan-stat"><div class="loan-stat-label">Saldo Restante</div><div class="loan-stat-val">$'+fmt(l.saldo_usd)+'</div><div class="loan-stat-sub">'+(saldoBs?fmt(saldoBs,0)+' Bs':'—')+'</div></div>' +
        '<div class="loan-stat"><div class="loan-stat-label">Próxima Cuota</div><div class="loan-stat-val" style="font-size:12px">'+fmtDate(l.proxima_cuota)+'</div><div class="loan-stat-sub">'+(dias!==null?(dias<0?'<span style="color:var(--red)">'+Math.abs(dias)+'d atrás</span>':dias+'d'):'—')+'</div></div>' +
        '<div class="loan-stat"><div class="loan-stat-label">Original</div><div class="loan-stat-val" style="font-size:11px">$'+fmt(l.monto_usd_original)+'</div><div class="loan-stat-sub">desde '+fmtDate(l.fecha_inicio)+'</div></div>' +
      '</div>' +
      '<div class="loan-footer">' +
        '<span style="font-size:11px;color:var(--muted)">' + l.cuotas_hechas + '/' + l.total_cuotas + ' cuotas pagadas</span>' +
        '<div class="prog-wrap" style="flex:1;max-width:200px;margin:0 8px"><div class="prog-fill" style="width:'+pct+'%;background:'+barColor+'"></div></div>' +
        '<span style="font-size:11px;font-weight:600;font-family:var(--mono)">' + pct + '%</span>' +
        '<button class="btn btn-ghost btn-sm btn-icon" onclick="verDetalle(\''+l.id.replace(/'/g,"\'")+'\')" title="Ver detalle"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" onclick="eliminarPrestamo(\''+l.id.replace(/'/g,"\'")+'\')" title="Eliminar préstamo" style="color:var(--red)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>' +
      '</div>' +
    '</div>';
  }).join('');

  document.getElementById('prestamos-'+id+'-content').innerHTML =
    '<div class="summary-grid sg-4" style="margin-bottom:16px">' +
    '<div class="scard '+(entidad==='FARMACIA'?'blue':'purple')+'"><div class="scard-label">'+icon+' Total Activos</div><div class="scard-val">'+activos.length+'</div><div class="scard-sub">préstamos</div></div>' +
    '<div class="scard red"><div class="scard-label">⏰ Cuota Mensual</div><div class="scard-val">$'+fmt(tCuota)+'</div><div class="scard-sub">'+(tasa?fmt(bsLoan(tCuota),0)+' Bs':'—')+'</div></div>' +
    '<div class="scard amber"><div class="scard-label"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Vencidas/Próx.</div><div class="scard-val">'+venc.length+'+'+prox.length+'</div><div class="scard-sub">vencidas · próximas</div></div>' +
    '<div class="scard purple"><div class="scard-label">Saldo Total</div><div class="scard-val">$'+fmt(tSaldo)+'</div><div class="scard-sub">'+(tasa?fmt(bsLoan(tSaldo),0)+' Bs':'—')+'</div></div>' +
    '</div>' +
    '<div class="filter-bar filter-bar-v">' +
    '<input type="text" id="p-'+id+'-search" placeholder="Buscar préstamo, banco, monto..." oninput="renderPrestamos(\''+entidad+'\')">' +
    '<input type="hidden" id="p-'+id+'-estado" value="'+filterEstado+'">' +
    '<div class="fchips">' +
    [['all','Todos'],['VENCIDO','Vencidos'],['HOY','Esta semana'],['PROXIMO','Próximos'],['VIGENTE','Vigentes']].map(c=>'<button class="fchip '+(filterEstado===c[0]?'active':'')+'" onclick="document.getElementById(\'p-'+id+'-estado\').value=\''+c[0]+'\';renderPrestamos(\''+entidad+'\')">'+c[1]+'</button>').join('') +
    '</div>' +
    '<div class="filter-row2">' +
    '<select id="p-'+id+'-banco" onchange="renderPrestamos(\''+entidad+'\')">' +
    '<option value="all">Todos los bancos</option><option value="PROVINCIAL">Provincial</option><option value="MERCANTIL">Mercantil</option><option value="CARIBE">Caribe</option>' +
    '</select>' +
    '<select id="p-'+id+'-orden" onchange="renderPrestamos(\''+entidad+'\')">' +
    '<option value="estado">Orden: urgencia</option><option value="vence">Orden: vencimiento</option><option value="saldo_desc">Orden: saldo mayor</option><option value="saldo_asc">Orden: saldo menor</option><option value="cuota_desc">Orden: cuota mayor</option>' +
    '</select>' +
    '</div>' +
    '<div class="filter-actions">' +
    '<span class="filter-count">'+lista.length+' préstamo'+(lista.length!==1?'s':'')+'</span>' +
    ((filterEstado!=='all'||filterBanco!=='all'||search!=='') ? '<button class="btn btn-ghost btn-sm" onclick="limpiarFiltrosPrest(\''+id+'\',\''+entidad+'\')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>Limpiar</button>' : '') +
    '<div class="spacer"></div>' +
    '<button class="btn btn-accent btn-sm" onclick="abrirNuevoPrestamo(\''+entidad+'\')">+ Nuevo</button>' +
    '</div>' +
    (lista.length===0 ? '<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></div><p>No hay préstamos con estos filtros</p></div>' : cardsHtml);
  // Restaurar valores de filtros tras re-render
  const _sf=document.getElementById('p-'+id+'-search'), _sb=document.getElementById('p-'+id+'-banco'), _se=document.getElementById('p-'+id+'-estado');
  if(_sf){_sf.value=search; if(search){_sf.focus(); const l=_sf.value.length; _sf.setSelectionRange(l,l);}}
  if(_sb)_sb.value=filterBanco;
  if(_se)_se.value=filterEstado;
  const _so=document.getElementById('p-'+id+'-orden'); if(_so)_so.value=ordenP;
}

function abrirNuevoPrestamo(entidad) {
  document.getElementById('np-entidad').value = entidad || 'FARMACIA';
  document.getElementById('np-banco').value = '';
  document.getElementById('np-numero').value = '';
  document.getElementById('np-fecha-inicio').value = HOY();
  document.getElementById('np-monto-original').value = '';
  document.getElementById('np-cuota').value = '';
  document.getElementById('np-total-cuotas').value = '';
  document.getElementById('np-cuotas-hechas').value = '0';
  document.getElementById('np-saldo').value = '';
  document.getElementById('np-proxima-cuota').value = '';
  document.getElementById('np-error').textContent = '';
  document.getElementById('ov-prestamo-title').textContent =
    'Nuevo Préstamo — ' + (entidad === 'FARMACIA' ? 'Farmacia' : 'Droguería');
  document.getElementById('ov-prestamo').classList.add('open');
}

function guardarNuevoPrestamo(e) {
  e.preventDefault();
  const err = document.getElementById('np-error');
  const entidad  = document.getElementById('np-entidad').value;
  const banco    = document.getElementById('np-banco').value;
  const numero   = document.getElementById('np-numero').value.trim();
  const fInicio  = document.getElementById('np-fecha-inicio').value;
  const montoOri = parseFloat(document.getElementById('np-monto-original').value);
  const cuota    = parseFloat(document.getElementById('np-cuota').value);
  const totCuotas= parseInt(document.getElementById('np-total-cuotas').value);
  const hechas   = parseInt(document.getElementById('np-cuotas-hechas').value) || 0;
  const saldo    = parseFloat(document.getElementById('np-saldo').value);
  const proxima  = document.getElementById('np-proxima-cuota').value;

  if (!banco) { err.textContent = 'Selecciona un banco'; return; }
  if (isNaN(cuota) || cuota <= 0) { err.textContent = 'Cuota inválida'; return; }
  if (isNaN(saldo) || saldo < 0)  { err.textContent = 'Saldo inválido'; return; }

  // Build ID: ENTIDAD NUMERO BANCO_ABREV (or auto-numbered)
  const bancoCodigo = banco.substring(0,4).toUpperCase();
  const autoNum = numero || String(Date.now()).slice(-7);
  const id = entidad + ' ' + autoNum + ' ' + bancoCodigo;

  // Check no duplicate
  if (db.prestamos.find(l => l.id === id)) {
    err.textContent = 'Ya existe un préstamo con ese número y banco';
    return;
  }

  const nuevo = {
    id, entidad, banco,
    fecha_inicio:       fInicio,
    monto_usd_original: isNaN(montoOri) ? null : montoOri,
    monto_bs_original:  null,
    tasa_inicio:        null,
    cuota_usd:          cuota,
    total_cuotas:       totCuotas,
    cuotas_hechas:      hechas,
    saldo_usd:          saldo,
    proxima_cuota:      proxima,
    ultima_fecha_pago:  null,
    activo:             true,
    pagos:              [],
    amortizacion:       []
  };

  db.prestamos.push(nuevo);
  logAudit('prestamo.crear','ID: '+id+' · $'+fmt(cuota)+' USD · '+banco);
  saveDB(db);
  document.getElementById('form-prestamo').reset();
  closeOverlay('ov-prestamo');
  renderPrestamos(entidad);
  renderBadges();
  renderPanel();  // Update KPIs
  showToast('Préstamo ' + id + ' creado');
}

function renderHistorialPrestamos() {
  const search = (document.getElementById('hist-search')?.value || '').toLowerCase();
  const entFil = document.getElementById('hist-entidad')?.value || 'all';
  const banFil  = document.getElementById('hist-banco')?.value  || 'all';

  // Collect all payments from all loans
  let allPagos = [];
  db.prestamos.forEach(l => {
    if (entFil!=='all' && l.entidad!==entFil) return;
    if (banFil!=='all' && l.banco!==banFil) return;
    (l.pagos||[]).forEach(p => {
      allPagos.push({...p, loan_id: l.id, entidad: l.entidad, banco: l.banco});
    });
  });

  if (search) allPagos = allPagos.filter(p => p.loan_id.toLowerCase().includes(search) || (p.nota||'').toLowerCase().includes(search) || p.banco.toLowerCase().includes(search));

  allPagos.sort((a,b) => b.fecha.localeCompare(a.fecha));

  const totalPagadoUsd = allPagos.reduce((a,p)=>a+(p.monto_usd||0),0);
  const totalPagadoBs  = allPagos.reduce((a,p)=>a+(p.monto_bs||0),0);

  if (allPagos.length===0) {
    document.getElementById('historial-inner').innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div><p>No hay pagos registrados</p></div>';
    return;
  }

  const rows = allPagos.map(p =>
    '<tr>' +
    '<td style="white-space:nowrap">'+fmtDate(p.fecha)+'</td>' +
    '<td><strong style="font-size:11px">'+p.loan_id+'</strong></td>' +
    '<td><span class="badge '+(p.entidad==='FARMACIA'?'badge-blue':'badge-purple')+'">'+p.entidad+'</span></td>' +
    '<td>'+p.banco+'</td>' +
    '<td class="c">'+(p.cuota_num?'<span class="badge badge-gray">C'+p.cuota_num+'</span>':'—')+'</td>' +
    '<td class="mono r"><strong>Bs '+fmt(p.monto_bs,0)+'</strong></td>' +
    '<td class="mono r">'+(p.tasa?p.tasa.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' Bs/$':'—')+'</td>' +
    '<td class="mono r">'+(p.monto_usd?'$'+fmt(p.monto_usd):'—')+'</td>' +
    '<td style="color:var(--muted);font-size:11px">'+(p.nota||'—')+'</td>' +
    '</tr>'
  ).join('');

  document.getElementById('historial-inner').innerHTML =
    '<div class="summary-grid sg-3" style="margin-bottom:14px">' +
    '<div class="scard blue"><div class="scard-label">Total Pagos</div><div class="scard-val">'+allPagos.length+'</div><div class="scard-sub">transacciones</div></div>' +
    '<div class="scard green"><div class="scard-label">Total Pagado USD</div><div class="scard-val">$'+fmt(totalPagadoUsd)+'</div><div class="scard-sub">en todos los préstamos</div></div>' +
    '<div class="scard purple"><div class="scard-label">Total Pagado Bs</div><div class="scard-val">'+fmt(totalPagadoBs,0)+'</div><div class="scard-sub">suma histórica</div></div>' +
    '</div>' +
    '<div class="tbox"><div class="twrap"><table><thead><tr>' +
    '<th>Fecha</th><th>Préstamo</th><th>Entidad</th><th>Banco</th><th class="c">Cuota</th><th class="r">Monto Bs</th><th class="r">Tasa</th><th class="r">Monto $</th><th>Nota</th>' +
    '</tr></thead><tbody>'+rows+'</tbody></table></div>' +
    '<div style="padding:10px 14px;font-size:11px;color:var(--muted);border-top:1px solid var(--border)">' + allPagos.length + ' pagos mostrados</div>' +
    '</div>';
}

function abrirPago(loanId) {
  const l = db.prestamos.find(x => x.id===loanId);
  if (!l) return;
  currentPagoId = loanId;
  const estado = estadoPrestamo(l);
  const tasa = getTasa();
  const cuotaBs = bsLoan(l.cuota_usd);
  const nextCuota = l.cuotas_hechas + 1;

  document.getElementById('pago-info').innerHTML =
    '<strong>' + l.id + '</strong> · ' + l.banco + ' · ' + l.entidad + '<br>' +
    'Cuota mensual: <strong>$'+fmt(l.cuota_usd)+'</strong>' +
    (cuotaBs ? ' = <strong>'+fmt(cuotaBs,0)+' Bs</strong>' : '') +
    ' · Próxima: ' + fmtDate(l.proxima_cuota) +
    '<br>Cuotas pagadas: ' + l.cuotas_hechas + '/' + l.total_cuotas;

  // Try to auto-fill from amortization table for the upcoming cuota
  let autoUsd = l.cuota_usd || 0;
  if (l.amortizacion && l.amortizacion.length > l.cuotas_hechas) {
    const amEntry = l.amortizacion[l.cuotas_hechas];
    if (amEntry && amEntry.cuota) autoUsd = amEntry.cuota;
  }
  const autoBs = tasa ? Math.round(autoUsd * tasa) : (cuotaBs || '');

  document.getElementById('pago-fecha').value = HOY();
  document.getElementById('pago-cuota').value = nextCuota;
  document.getElementById('pago-bs').value = autoBs || (cuotaBs ? Math.round(cuotaBs) : '');
  document.getElementById('pago-tasa').value = tasa || '';
  document.getElementById('pago-nota').value = '';
  onPagoBsInput();
  openOverlay('ov-pago');
}

function onPagoBsInput() {
  const bs = parseFloat(document.getElementById('pago-bs').value);
  const tasa = parseFloat(document.getElementById('pago-tasa').value);
  const hint = document.getElementById('pago-bs-hint');
  if (bs>0 && tasa>0) {
    hint.textContent = '≈ $' + (bs/tasa).toFixed(2) + ' USD a tasa ' + tasa.toFixed(2);
  } else { hint.textContent = ''; }
}

function guardarPago() {
  const l = db.prestamos.find(x => x.id===currentPagoId);
  if (!l) return;
  const fecha = document.getElementById('pago-fecha').value;
  const cuotaNum = parseInt(document.getElementById('pago-cuota').value) || null;
  const bs = parseFloat(document.getElementById('pago-bs').value);
  const tasa = parseFloat(document.getElementById('pago-tasa').value);
  const nota = document.getElementById('pago-nota').value.trim();

  if (!fecha) { showToast('Selecciona la fecha'); return; }
  if (!bs||bs<=0) { showToast('Ingresa el monto en Bs'); return; }
  if (!tasa||tasa<=0) { showToast('Ingresa la tasa BCV'); return; }

  const usd = Math.round(bs/tasa*100)/100;
  const pago = { fecha, monto_bs: Math.round(bs*100)/100, tasa: Math.round(tasa*100)/100, monto_usd: usd, cuota_num: cuotaNum, nota };

  if (!l.pagos) l.pagos = [];
  l.pagos.push(pago);
  l.ultima_fecha_pago = fecha;

  // Advance cuotas_hechas if this is the next cuota
  if (cuotaNum && cuotaNum > l.cuotas_hechas) {
    l.cuotas_hechas = cuotaNum;
    // Update proxima_cuota
    if (l.amortizacion && l.cuotas_hechas < l.amortizacion.length) {
      l.proxima_cuota = l.amortizacion[l.cuotas_hechas].mes;
      l.saldo_usd = l.amortizacion[l.cuotas_hechas].saldo_usd;
    } else if (l.cuotas_hechas >= l.total_cuotas && l.total_cuotas>0) {
      l.activo = false;
      l.saldo_usd = 0;
      l.proxima_cuota = null;
    }
  }

  logAudit('prestamo.pago','ID: '+l.id+' · $'+fmt(usd)+' USD · Bs '+fmt(bs,0));
  saveDB(db);
  closeOverlay('ov-pago');
  renderTab(activeTab);
  showToast('Pago registrado: Bs '+fmt(bs,0)+' / $'+fmt(usd)+' — '+l.id);
}

function verDetalle(loanId) {
  const l = db.prestamos.find(x => x.id===loanId);
  if (!l) return;
  const tasa = getTasa();
  const pagos = (l.pagos||[]).slice().reverse();
  const amort = (l.amortizacion||[]).slice(0,8);
  const pct = l.total_cuotas>0 ? Math.round(l.cuotas_hechas/l.total_cuotas*100) : 0;
  const barColor = pct>=80?'var(--green)':pct>=40?'var(--amber)':'var(--accent)';
  let H = '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px">'
    + '<strong>'+esc(l.id)+'</strong><br><span style="font-size:12px;color:var(--muted)">'+esc(l.banco)+' \u00b7 '+esc(l.entidad)+'</span>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;font-size:12px">'
    + '<div style="color:var(--muted)">Cuota mensual<br><strong style="color:var(--text);font-size:14px">$'+fmt(l.cuota_usd)+'</strong></div>'
    + '<div style="color:var(--muted)">Saldo restante<br><strong style="color:var(--text);font-size:14px">$'+fmt(l.saldo_usd)+'</strong></div>'
    + '</div>'
    + '<div style="margin-top:10px;height:9px;background:#eef2f7;border-radius:99px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:'+barColor+'"></div></div>'
    + '<div style="font-size:11px;color:var(--muted);margin-top:4px">'+l.cuotas_hechas+'/'+l.total_cuotas+' cuotas pagadas \u00b7 '+pct+'%</div>'
    + '</div>';
  H += '<div style="font-weight:600;font-size:12px;color:var(--muted);margin-bottom:6px">Pagos realizados</div>';
  if (!pagos.length) H += '<div style="color:var(--muted);font-size:12px;padding:6px 0">Sin pagos registrados a\u00fan.</div>';
  else {
    H += '<div class="twrap"><table><thead><tr><th style="font-size:11px">Fecha</th><th style="font-size:11px">Monto</th><th style="font-size:11px">Nota</th></tr></thead><tbody>';
    pagos.forEach(pg => { H += '<tr><td style="font-size:11px;white-space:nowrap">'+fmtDate(pg.fecha)+'</td><td style="font-family:var(--mono);font-size:12px">$'+fmt(pg.monto_usd)+'<br><span style="font-weight:400;color:var(--muted);font-size:10px">'+fmt(pg.monto_bs,0)+' Bs</span></td><td style="font-size:11px;color:var(--muted)">'+esc(pg.nota||'')+'</td></tr>'; });
    H += '</tbody></table></div>';
  }
  if (amort.length) {
    H += '<div style="font-weight:600;font-size:12px;color:var(--muted);margin:14px 0 6px">Pr\u00f3ximas cuotas</div><div class="twrap"><table><tbody>';
    amort.forEach(a => { const bs = tasa?Math.round(a.total_usd*tasa):null; H += '<tr><td style="font-size:11px;white-space:nowrap">'+fmtDate(a.mes)+'</td><td style="font-family:var(--mono);font-size:12px">$'+fmt(a.total_usd)+(bs?' \u00b7 '+fmt(bs,0)+' Bs':'')+'</td></tr>'; });
    H += '</tbody></table></div>';
  }
  document.getElementById('detalle-info').innerHTML = H;
  openOverlay('ov-detalle');
}

