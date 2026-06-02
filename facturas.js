// ── Farmacia Claret · Facturas ──────────────────────────────────────────────

function renderFacturas(empresa) {
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

function renderHistorialFacturas(resetPage) {
  if (resetPage !== false) histPage = 1;  // Reset on new filter
  let lista = [...db.historial];
  if (histFilter.empresa!=='all') lista = lista.filter(h => h.empresa===histFilter.empresa);
  if (histFilter.search) {
    const q = histFilter.search.toLowerCase();
    lista = lista.filter(h =>
      (h.proveedor||'').toLowerCase().includes(q) ||
      (h.factura||'').toLowerCase().includes(q) ||
      (h.nota_pago||'').toLowerCase().includes(q) ||
      String(h.monto_usd||'').includes(q)
    );
  }
  if (histFilter.desde) lista = lista.filter(h => (h.pagada_en||'') >= histFilter.desde);
  if (histFilter.hasta) lista = lista.filter(h => (h.pagada_en||'') <= histFilter.hasta);
  lista.sort((a,b) => {
    const o = histFilter.orden||'reciente';
    if (o==='antiguo')    return (a.pagada_en||'').localeCompare(b.pagada_en||'');
    if (o==='monto_desc') return (b.monto_usd||0)-(a.monto_usd||0);
    if (o==='monto_asc')  return (a.monto_usd||0)-(b.monto_usd||0);
    if (o==='prov')       return (a.proveedor||'').localeCompare(b.proveedor||'');
    return (b.pagada_en||'').localeCompare(a.pagada_en||'');
  });
  const totalFiltered = lista.length;
  const PAGE_SIZE = 50;
  lista = lista.slice(0, histPage * PAGE_SIZE);

  const sumUsd = lista.reduce((a,h)=>a+(h.monto_usd||0),0);

  document.getElementById('historial-inner').innerHTML = `
    <div class="filter-bar filter-bar-v">
      <input type="text" placeholder="Buscar proveedor, factura, monto, nota..." value="${esc(histFilter.search)}" oninput="histFilter.search=this.value;renderHistorialFacturas()">
      <div class="fchips">${[['all','Todas'],['farmacia','Farmacia'],['drogueria','Droguería']].map(c=>`<button class="fchip ${histFilter.empresa===c[0]?'active':''}" onclick="histFilter.empresa='${c[0]}';renderHistorialFacturas()">${c[1]}</button>`).join('')}</div>
      <div class="filter-row2">
        <input type="date" title="Pagada desde" value="${histFilter.desde}" onchange="histFilter.desde=this.value;renderHistorialFacturas()" style="flex:1;min-width:0;font-size:13px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">
        <input type="date" title="Pagada hasta" value="${histFilter.hasta}" onchange="histFilter.hasta=this.value;renderHistorialFacturas()" style="flex:1;min-width:0;font-size:13px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">
      </div>
      <div class="filter-row2">
        <select onchange="histFilter.orden=this.value;renderHistorialFacturas()">
          <option value="reciente" ${(!histFilter.orden||histFilter.orden==='reciente')?'selected':''}>Orden: más reciente</option>
          <option value="antiguo" ${histFilter.orden==='antiguo'?'selected':''}>Orden: más antiguo</option>
          <option value="monto_desc" ${histFilter.orden==='monto_desc'?'selected':''}>Orden: monto mayor</option>
          <option value="monto_asc" ${histFilter.orden==='monto_asc'?'selected':''}>Orden: monto menor</option>
          <option value="prov" ${histFilter.orden==='prov'?'selected':''}>Orden: proveedor A-Z</option>
        </select>
      </div>
      <div class="filter-actions">
        <span class="filter-count">${lista.length} de ${db.historial.length}</span>
        ${(histFilter.search||histFilter.desde||histFilter.hasta||histFilter.empresa!=='all'||(histFilter.orden&&histFilter.orden!=='reciente')) ? `<button class="btn btn-ghost btn-sm" onclick="histFilter={search:'',empresa:'all',desde:'',hasta:'',orden:'reciente'};renderHistorialFacturas()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>Limpiar</button>` : ''}
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" onclick="exportarHistorialExcel()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>Excel</button>
      </div>
    </div>
    <div class="tbox">
      <div class="tbox-hd">
        <span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg> Historial de Facturas Pagadas</span>
        <span class="tbox-meta">${lista.length} resultados · $${fmt(sumUsd)} USD</span>
      </div>
      ${lista.length===0 ? `<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg></div><p>Sin facturas pagadas aún</p></div>` : `
      <div class="twrap">
        <table class="tbl-cards">
          <thead><tr>
            <th>Empresa</th><th>Proveedor</th><th>Factura</th>
            <th>Fecha</th><th>Venció</th>
            <th class="r">Monto $</th><th class="r">Monto Bs</th>
            <th>Pagada el</th><th>Nota pago</th>
            <th class="c"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></th>
          </tr></thead>
          <tbody>
            ${lista.map(h=>`<tr>
              <td data-label="Empresa">${empPill(h.empresa)}</td>
              <td data-label="Proveedor"><strong>${esc(h.proveedor)}</strong></td>
              <td data-label="Factura" style="font-family:var(--mono);font-size:11px">${esc(h.factura)||'—'}</td>
              <td data-label="Fecha">${fmtDate(h.fecha)}</td>
              <td data-label="Venció">${fmtDate(h.vence)}</td>
              <td class="mono" data-label="Monto $">${h.monto_usd!==null?'$'+fmt(h.monto_usd):'—'}</td>
              <td class="mono" data-label="Bs" style="font-size:11px">${h.monto_bs_pagar!==null?fmt(h.monto_bs_pagar,0)+' Bs':'—'}</td>
              <td data-label="Pagada"><span class="badge b-green">${fmtDate(h.pagada_en)}</span></td>
              <td data-label="Nota" style="font-size:11px;color:var(--muted)">${esc(h.nota_pago)||'—'}</td>
              <td class="c acciones-cell">
                <button class="btn btn-ghost btn-icon btn-sm" onclick="restaurarFactura('${h.id}')" title="Restaurar a activas" style="font-size:11px">↩</button>
              </td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr>
            <td colspan="5" style="font-size:11px;color:var(--muted)">Total</td>
            <td class="mono">$${fmt(sumUsd)}</td>
            <td colspan="4"></td>
          </tr></tfoot>
        </table>
      </div>`}
    </div>
    ${totalFiltered > histPage * 50
      ? '<div style="text-align:center;padding:14px 0"><button class="btn btn-ghost btn-sm" onclick="histPage++;renderHistorialFacturas(false)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg> Cargar 50 más · quedan ' + (totalFiltered - histPage * 50) + '</button></div>'
      : totalFiltered > 50
        ? '<p style="text-align:center;font-size:11px;color:var(--muted);padding:10px 0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg> ' + totalFiltered + ' registros mostrados</p>'
        : ''}
  `;
}

function nuevaFactura(empresa) {
  document.getElementById('ov-factura-title').textContent = 'Nueva Factura';
  document.getElementById('f-id').value = '';
  document.getElementById('f-empresa').value = empresa;
  document.getElementById('f-empresa').disabled = false;
  document.getElementById('f-proveedor').value = '';
  document.getElementById('f-factura').value = '';
  document.getElementById('f-fecha').value = HOY();
  document.getElementById('f-vence').value = '';
  document.getElementById('f-monto_bs').value = '';
  document.getElementById('f-monto_usd').value = '';
  document.getElementById('f-abonos_usd').value = '';
  document.getElementById('f-nc').value = '';
  document.getElementById('f-ret').value = '';
  document.getElementById('f-monto_bs_pagar').value = '';
  document.getElementById('f-estado_base').value = 'VIGENTE';
  document.getElementById('f-detalle').value = '';
  actualizarDatalist();
  mostrarTasaEnForm();
  document.getElementById('hint-bs-to-usd').textContent = '';
  document.getElementById('hint-usd-to-bs').textContent = '';
  openOverlay('ov-factura');
}

function editarFactura(id) {
  const f = db.facturas.find(x => x.id===id);
  if (!f) return;
  document.getElementById('ov-factura-title').textContent = 'Editar Factura';
  document.getElementById('f-id').value = f.id;
  document.getElementById('f-empresa').value = f.empresa;
  document.getElementById('f-empresa').disabled = true;
  document.getElementById('f-proveedor').value = f.proveedor||'';
  document.getElementById('f-factura').value = f.factura||'';
  document.getElementById('f-fecha').value = f.fecha||'';
  document.getElementById('f-vence').value = f.vence||'';
  const r2 = v => (v !== null && v !== undefined && !isNaN(Number(v))) ? parseFloat(Number(v).toFixed(2)) : '';
  document.getElementById('f-monto_bs').value = r2(f.monto_bs);
  document.getElementById('f-monto_usd').value = r2(f.monto_usd);
  document.getElementById('f-abonos_usd').value = r2(abonadoUsd(f));
  document.getElementById('f-nc').value = r2(f.nc);
  document.getElementById('f-ret').value = r2(f.ret);
  document.getElementById('f-monto_bs_pagar').value = r2(f.monto_bs_pagar);
  document.getElementById('f-estado_base').value = f.estado_base||'VIGENTE';
  document.getElementById('f-detalle').value = f.detalle||'';
  actualizarDatalist();
  mostrarTasaEnForm();
  document.getElementById('hint-bs-to-usd').textContent = '';
  document.getElementById('hint-usd-to-bs').textContent = '';
  openOverlay('ov-factura');
}

function actualizarDatalist() {
  const todas = [...new Set(db.facturas.map(f=>f.proveedor).concat(db.historial.map(h=>h.proveedor)))].sort();
  document.getElementById('list-proveedores').innerHTML = todas.map(p=>`<option value="${esc(p)}">`).join('');
}

function onMontoBsInput() {
  calcMontoBsPagar();
  const bs  = parseFloat(document.getElementById('f-monto_bs').value);
  const t   = getTasa();
  const hint = document.getElementById('hint-bs-to-usd');
  if (bs > 0 && t) {
    const usd = bs / t;
    hint.textContent = `≈ $${usd.toFixed(2)} USD a tasa ${Number(t).toFixed(2)}`;
    hint.style.color = 'var(--blue)';
    // Auto-fill USD if empty
    const usdField = document.getElementById('f-monto_usd');
    if (!usdField.value) usdField.value = usd.toFixed(2);
  } else {
    hint.textContent = '';
  }
}

function onMontoUsdInput() {
  const usd  = parseFloat(document.getElementById('f-monto_usd').value);
  const t    = getTasa();
  const hint = document.getElementById('hint-usd-to-bs');
  if (usd > 0 && t) {
    const bs = usd * t;
    hint.textContent = `≈ ${bs.toLocaleString('es-VE',{maximumFractionDigits:2})} Bs a tasa ${Number(t).toFixed(2)}`;
    hint.style.color = 'var(--blue)';
    // Auto-fill Bs if empty
    const bsField = document.getElementById('f-monto_bs');
    if (!bsField.value) {
      bsField.value = bs.toFixed(2);
      calcMontoBsPagar();
    }
  } else {
    hint.textContent = '';
  }
}

function calcMontoBsPagar() {
  const bs  = parseFloat(document.getElementById('f-monto_bs').value)||0;
  const nc  = parseFloat(document.getElementById('f-nc').value)||0;
  const ret = parseFloat(document.getElementById('f-ret').value)||0;
  if (bs>0) document.getElementById('f-monto_bs_pagar').value = (bs - nc - ret).toFixed(2);
}

function guardarFactura(e) {
  e.preventDefault();
  const id  = document.getElementById('f-id').value;
  const pN  = v => { const n=parseFloat(v); return isNaN(n)?null:Math.round(n*100)/100; };
  // Validaciones de seguridad
  const _mbs = pN(document.getElementById('f-monto_bs').value);
  const _mus = pN(document.getElementById('f-monto_usd').value);
  if ((_mbs!=null && _mbs<0) || (_mus!=null && _mus<0)) { showToast('Los montos no pueden ser negativos'); return; }
  const _fnum = document.getElementById('f-factura').value.trim();
  const _emp  = document.getElementById('f-empresa').value;
  if (_fnum) {
    const _dup = db.facturas.find(x => x.id!==id && x.empresa===_emp && (x.factura||'').trim().toLowerCase()===_fnum.toLowerCase());
    if (_dup && !confirm('Ya existe una factura "'+_fnum+'" en '+_emp+' (proveedor: '+(_dup.proveedor||'\u2014')+'). \u00bfGuardar de todas formas?')) return;
  }

  const obj = {
    empresa:       document.getElementById('f-empresa').value,
    proveedor:     document.getElementById('f-proveedor').value.trim(),
    factura:       document.getElementById('f-factura').value.trim(),
    fecha:         document.getElementById('f-fecha').value || null,
    vence:         document.getElementById('f-vence').value || null,
    monto_bs:      pN(document.getElementById('f-monto_bs').value),
    monto_usd:     pN(document.getElementById('f-monto_usd').value),
    nc:            pN(document.getElementById('f-nc').value),
    ret:           pN(document.getElementById('f-ret').value),
    monto_bs_pagar:pN(document.getElementById('f-monto_bs_pagar').value),
    estado_base:   document.getElementById('f-estado_base').value,
    detalle:       document.getElementById('f-detalle').value.trim(),
    activa:        true,
    modulo:        MODULO
  };

  if (id) {
    const idx = db.facturas.findIndex(f => f.id===id);
    if (idx>=0) { db.facturas[idx] = { ...db.facturas[idx], ...obj }; logAudit('factura.editar','Proveedor: '+(obj.proveedor||id)); }
  } else {
    obj.id = uid();
    obj.creado_en = HOY();
    obj.abonos = [];
    obj.abonos_usd = 0;
    db.facturas.push(obj);
    logAudit('factura.crear','Proveedor: '+(obj.proveedor||obj.factura||''));
  }

  saveDB(db);
  closeOverlay('ov-factura');
  renderTab(activeTab);
}

let _abonarFid = null;
function abrirAbono(id){
  const f = db.facturas.find(x=>x.id===id);
  if (!f) return;
  _abonarFid = id;
  document.getElementById('abonar-id').value = id;
  document.getElementById('abonar-fecha').value = HOY();
  document.getElementById('abonar-nota').value = '';
  document.getElementById('abonar-monto').value = '';
  document.getElementById('abonar-moneda').value = 'USD';
  document.getElementById('abonar-conv').textContent = '';
  renderAbonarInfo();
  renderAbonarHistorial();
  openOverlay('ov-abonar');
  setTimeout(()=>{ const e=document.getElementById('abonar-monto'); if(e) e.focus(); },120);
}
function renderAbonarInfo(){
  const f = db.facturas.find(x=>x.id===_abonarFid); if(!f) return;
  const m=montoPagarUsd(f), paid=abonadoUsd(f), sal=saldoUsd(f), salBs=saldoBsHoy(f), t=getTasa();
  const el = document.getElementById('abonar-info'); if(!el) return;
  el.innerHTML = '<strong>'+esc(f.proveedor||'')+'</strong> \u00b7 '+empPill(f.empresa)
    + '<br>Factura <span style="font-family:var(--mono)">'+esc(f.factura||'\u2014')+'</span>'
    + '<div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">'
    + '<div style="color:var(--muted)">Monto a pagar<br><strong style="color:var(--text);font-size:14px">'+(m!=null?'$'+fmt(m):'\u2014')+'</strong></div>'
    + '<div style="color:var(--muted)">Abonado<br><strong style="color:var(--text);font-size:14px">$'+fmt(paid)+'</strong></div>'
    + '<div style="grid-column:1/3;border-top:1px solid var(--border);padding-top:6px;margin-top:2px;color:var(--muted)">Saldo restante: '
    + '<strong style="font-size:16px;color:'+(sal!=null&&sal<=0.01?'var(--green)':'var(--accent)')+'">'
    + (sal!=null?'$'+fmt(sal):'\u2014')+(salBs!=null?' \u00b7 '+fmt(salBs,0)+' Bs':'')+'</strong>'
    + (t?' <span style="font-size:11px">(tasa '+Number(t).toFixed(2)+')</span>':' <span style="color:var(--amber);font-size:11px">(sin tasa del d\u00eda)</span>')+'</div>'
    + '</div>';
}
function onAbonarInput(){
  const moneda = document.getElementById('abonar-moneda').value;
  const v = parseFloat(document.getElementById('abonar-monto').value);
  const t = getTasa();
  const conv = document.getElementById('abonar-conv'); if(!conv) return;
  if (!(v>0)) { conv.textContent=''; return; }
  if (!t) { conv.textContent='Configura la tasa del d\u00eda para convertir.'; conv.style.color='var(--amber)'; return; }
  conv.style.color='var(--blue)';
  if (moneda==='USD') conv.textContent = '\u2248 '+fmt(v*t,0)+' Bs a tasa '+Number(t).toFixed(2);
  else conv.textContent = '\u2248 $'+fmt(v/t)+' a tasa '+Number(t).toFixed(2);
}
function registrarAbono(){
  const f = db.facturas.find(x=>x.id===_abonarFid); if(!f) return;
  const moneda = document.getElementById('abonar-moneda').value;
  const v = parseFloat(document.getElementById('abonar-monto').value);
  const fecha = document.getElementById('abonar-fecha').value || HOY();
  const nota = document.getElementById('abonar-nota').value.trim();
  const t = getTasa();
  if (!(v>0)) { showToast('Ingresa un monto v\u00e1lido (mayor que 0)'); return; }
  if (moneda==='BS' && !t) { showToast('Configura la tasa del d\u00eda para abonar en Bs'); return; }
  let monto_usd, monto_bs;
  if (moneda==='USD'){ monto_usd=r2c(v); monto_bs = t? r2c(v*t): null; }
  else { monto_bs=r2c(v); monto_usd = t? r2c(v/t): null; }
  const sal = saldoUsd(f);
  if (monto_usd!=null && sal!=null && monto_usd > sal + 0.01){
    if (!confirm('Este abono ($'+fmt(monto_usd)+') es mayor que el saldo restante ($'+fmt(sal)+'). \u00bfRegistrarlo de todas formas?')) return;
  }
  if (!Array.isArray(f.abonos)){
    f.abonos = [];
    if (Number(f.abonos_usd)>0){
      f.abonos.push({ id:uid(), fecha:(f.creado_en||fecha), monto_usd:r2c(f.abonos_usd), monto_bs:(t?r2c(f.abonos_usd*t):null), tasa:t||null, nota:'Abono inicial (registro anterior)' });
    }
  }
  f.abonos.push({ id:uid(), fecha, monto_usd, monto_bs, tasa:t||null, nota });
  f.abonos_usd = r2c(abonadoUsd(f));
  logAudit('factura.abonar','Proveedor: '+(f.proveedor||'')+' \u00b7 '+(moneda==='USD'?'$'+fmt(monto_usd):fmt(monto_bs,0)+' Bs')+' \u00b7 '+fecha);
  saveDB(db);
  document.getElementById('abonar-monto').value='';
  document.getElementById('abonar-nota').value='';
  document.getElementById('abonar-conv').textContent='';
  renderAbonarInfo();
  renderAbonarHistorial();
  renderTab(activeTab);
  showToast('Abono registrado');
  if (estaSaldada(f)){
    setTimeout(()=>{
      if (confirm('La factura qued\u00f3 saldada (saldo $0). \u00bfMarcarla como PAGADA y archivarla?')){
        const idx = db.facturas.findIndex(x=>x.id===f.id);
        if (idx>=0){
          const fecha2 = HOY();
          const ff = { ...db.facturas[idx], pagada_en:fecha2, nota_pago:'Saldada con abonos' };
          db.historial.unshift(ff);
          db.facturas.splice(idx,1);
          logAudit('factura.pagar','Proveedor: '+(ff.proveedor||'')+' \u00b7 saldada con abonos ('+fecha2+')');
          saveDB(db);
          closeOverlay('ov-abonar');
          renderTab(activeTab);
          showToast('Factura saldada y archivada');
        }
      }
    }, 250);
  }
}
function eliminarAbono(abonoId){
  const f = db.facturas.find(x=>x.id===_abonarFid); if(!f||!Array.isArray(f.abonos)) return;
  if (!confirm('\u00bfEliminar este abono?')) return;
  f.abonos = f.abonos.filter(a=>a.id!==abonoId);
  f.abonos_usd = r2c(abonadoUsd(f));
  logAudit('factura.abono_eliminar','Proveedor: '+(f.proveedor||''));
  saveDB(db);
  renderAbonarInfo();
  renderAbonarHistorial();
  renderTab(activeTab);
}
function renderAbonarHistorial(){
  const f = db.facturas.find(x=>x.id===_abonarFid); if(!f) return;
  const el = document.getElementById('abonar-historial'); if(!el) return;
  const a = abonosList(f);
  if (!a.length && !(Number(f.abonos_usd)>0)){
    el.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:12px;padding:10px">A\u00fan no hay abonos registrados.</div>';
    return;
  }
  let rows;
  if (a.length){
    rows = a.slice().reverse().map(x=>
      '<tr><td style="font-size:11px;white-space:nowrap">'+fmtDate(x.fecha)+'</td>'
      +'<td style="font-family:var(--mono);font-size:12px;font-weight:600">$'+fmt(x.monto_usd||0)+(x.monto_bs?'<br><span style="font-weight:400;color:var(--muted);font-size:10px">'+fmt(x.monto_bs,0)+' Bs</span>':'')+'</td>'
      +'<td style="font-size:11px;color:var(--muted)">'+esc(x.nota||'')+'</td>'
      +'<td style="text-align:center"><button onclick="eliminarAbono(\''+x.id+'\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px" title="Eliminar">\u00d7</button></td></tr>'
    ).join('');
  } else {
    rows = '<tr><td colspan="4" style="font-size:11px;color:var(--muted)">$'+fmt(f.abonos_usd)+' abonado (registro anterior, sin detalle)</td></tr>';
  }
  el.innerHTML = '<div style="font-weight:600;font-size:11px;color:var(--muted);margin-bottom:6px">Historial de abonos</div>'
    + '<div class="twrap"><table><thead><tr><th style="font-size:11px">Fecha</th><th style="font-size:11px">Monto</th><th style="font-size:11px">Nota</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function iniciarPago(id) {
  const f = db.facturas.find(x => x.id===id);
  if (!f) return;
  document.getElementById('pagar-id').value = id;
  document.getElementById('pagar-fecha').value = HOY();
  document.getElementById('pagar-nota').value = '';
  document.getElementById('ov-pagar-info').innerHTML = `
    <strong>${esc(f.proveedor)}</strong> · ${empPill(f.empresa)}<br>
    Factura <span style="font-family:var(--mono)">${esc(f.factura)}</span><br>
    <span style="font-size:12px;color:var(--muted)">Monto: ${f.monto_usd!==null?'<strong>$'+fmt(f.monto_usd)+'</strong>':''} ${(()=>{const b=bsActual(f);return b!==null?'/ '+fmt(b,0)+' Bs':''})()}</span>`;
  openOverlay('ov-pagar');
}

function confirmarPago() {
  const id    = document.getElementById('pagar-id').value;
  const fecha = document.getElementById('pagar-fecha').value;
  const nota  = document.getElementById('pagar-nota').value.trim();
  const idx   = db.facturas.findIndex(f => f.id===id);
  if (idx<0) return;
  // Guard against double-click
  const btnConf = document.querySelector('#ov-pagar .btn-green');
  if (btnConf && btnConf.disabled) return;
  if (btnConf) { btnConf.disabled = true; btnConf.textContent = 'Guardando...'; }
  const f = { ...db.facturas[idx], pagada_en:fecha, nota_pago:nota };
  db.historial.unshift(f);
  db.facturas.splice(idx,1);
  logAudit('factura.pagar','Proveedor: '+(f?.proveedor||id)+' · '+(f?.empresa||'')+' · Bs '+(f?.monto_bs_pagar||'')+' ('+(fecha||'')+')');
  saveDB(db);
  closeOverlay('ov-pagar');
  // Reset button state
  const btnConfR = document.querySelector('#ov-pagar .btn-green');
  if (btnConfR) { btnConfR.disabled = false; btnConfR.textContent = 'Confirmar Pago'; }
  renderTab(activeTab);
}

function confirmarEliminar(id) {
  const f = db.facturas.find(x => x.id===id);
  if (!f) return;
  document.getElementById('delete-id').value = id;
  document.getElementById('delete-info').innerHTML =
    `<strong>${esc(f.proveedor)}</strong> — Factura ${esc(f.factura)}<br>
     <span style="font-size:12px">${f.monto_usd!==null?'$'+fmt(f.monto_usd)+' USD':''} · ${fmtDate(f.vence)}</span>`;
  openOverlay('ov-delete');
}

function ejecutarEliminar() {
  const id  = document.getElementById('delete-id').value;
  const f   = db.facturas.find(x=>x.id===id);
  logAudit('factura.eliminar','Proveedor: '+(f?.proveedor||id));
  db.facturas = db.facturas.filter(f => f.id!==id);
  saveDB(db);
  closeOverlay('ov-delete');
  renderTab(activeTab);
}

function restaurarFactura(id) {
  const idx = db.historial.findIndex(h => h.id===id);
  if (idx<0) return;
  const h = { ...db.historial[idx] };
  delete h.pagada_en;
  delete h.nota_pago;
  h.activa = true;
  db.facturas.push(h);
  db.historial.splice(idx,1);
  saveDB(db);
  renderHistorialFacturas();
  renderBadges();
}


// ── Farmacia Claret · Exportación Excel Profesional ──────────────────────────

function exportarFacturasExcel(empresa) {
  const tasa   = getTasa();
  const nombre = empresa === 'farmacia' ? 'Farmacia Claret' : 'Droguería Claret';
  const hoy    = HOY();

  // Data sets
  const activas   = db.facturas.filter(f => f.empresa === empresa);
  const historial = db.historial.filter(h => h.empresa === empresa);
  const todas     = [...activas, ...historial.map(h => ({...h, _pagada: true}))];
  todas.sort((a,b) => {
    const ord = {'VENCIDA':0,'POR_VENCER':1,'PENDIENTE':2,'PAGADA':3};
    const ea = a._pagada ? 'PAGADA' : computeEstado(a);
    const eb = b._pagada ? 'PAGADA' : computeEstado(b);
    return (ord[ea]||9)-(ord[eb]||9);
  });

  // Totals
  const totalUSD  = activas.reduce((a,f)=>a+(f.monto_usd||0),0);
  const vencidas  = activas.filter(f=>computeEstado(f)==='VENCIDA').length;
  const porVencer = activas.filter(f=>computeEstado(f)==='POR_VENCER').length;
  const pendientes= activas.filter(f=>computeEstado(f)==='PENDIENTE').length;

  // ── Style helpers ────────────────────────────────────────────────
  const S = (bg, fc, bold, sz, hz, wrap) => ({
    fill: { fgColor: { rgb: bg||'FFFFFF' } },
    font: { color: { rgb: fc||'000000' }, bold: !!bold, sz: sz||10, name:'Calibri' },
    alignment: { horizontal: hz||'left', vertical:'center', wrapText:!!wrap },
    border: {
      top:    { style:'thin', color:{rgb:'D0D4DB'} },
      bottom: { style:'thin', color:{rgb:'D0D4DB'} },
      left:   { style:'thin', color:{rgb:'D0D4DB'} },
      right:  { style:'thin', color:{rgb:'D0D4DB'} },
    }
  });
  const BLUE    = '1A3BAE';
  const DBLUE   = '0C1A3A';
  const GREEN   = '3DB54A';
  const RED_BG  = 'FEE2E2';
  const AMB_BG  = 'FEF3C7';
  const GRN_BG  = 'DCFCE7';
  const HDR_BG  = 'EEF2FF';
  const ALT_BG  = 'F8FAFF';

  const ws = {};
  const range = { s:{r:0,c:0}, e:{r:0,c:8} };

  let R = 0; // current row index

  // Helper: set cell
  function cell(r, col, v, s, numFmt) {
    const addr = XLSX.utils.encode_cell({r, c: col});
    ws[addr] = { v, t: typeof v==='number' ? 'n' : 's', s };
    if (numFmt) ws[addr].z = numFmt;
    if (r > range.e.r) range.e.r = r;
    if (col > range.e.c) range.e.c = col;
  }

  // Merge helper
  const merges = [];
  function merge(r, c1, c2) { merges.push({s:{r,c:c1},e:{r,c:c2}}); }

  // ── Title ────────────────────────────────────────────────────────
  cell(R, 0, 'FARMACIA CLARET — REPORTE DE FACTURAS', S(DBLUE,'FFFFFF',true,18,'left'), null);
  merge(R, 0, 8); R++;

  cell(R, 0, nombre + ' · Generado el ' + fmtDate(hoy) + ' · Usuario: ' + getUserNombre(currentUser), S(BLUE,'FFFFFF',true,11,'left'), null);
  merge(R, 0, 8); R++;
  R++; // spacer

  // ── Summary ──────────────────────────────────────────────────────
  cell(R, 0, 'RESUMEN', S(HDR_BG, BLUE, true, 11), null);
  cell(R, 2, 'Facturas activas', S(HDR_BG,'374151',false,10), null);
  cell(R, 3, activas.length, S(HDR_BG,BLUE,true,12,'center'), null);
  cell(R, 4, 'Total USD pendiente', S(HDR_BG,'374151',false,10), null);
  cell(R, 5, totalUSD, S(HDR_BG,BLUE,true,12,'right'), '"$"#,##0.00');
  merge(R, 0, 1); R++;

  cell(R, 0, '', S(HDR_BG), null);
  cell(R, 2, 'Vencidas', S(HDR_BG,'B91C1C',false,10), null);
  cell(R, 3, vencidas, S('FEE2E2','B91C1C',true,12,'center'), null);
  cell(R, 4, 'Por vencer (7 días)', S(HDR_BG,'92400E',false,10), null);
  cell(R, 5, porVencer, S('FEF3C7','92400E',true,12,'right'), null);
  merge(R, 0, 1); R++;

  cell(R, 0, '', S(HDR_BG), null);
  cell(R, 2, 'Pendientes', S(HDR_BG,'374151',false,10), null);
  cell(R, 3, pendientes, S(HDR_BG,'374151',true,12,'center'), null);
  cell(R, 4, 'Tasa del día', S(HDR_BG,'374151',false,10), null);
  cell(R, 5, tasa||'No configurada', S(HDR_BG,'374151',true,12,'right'), tasa?'#,##0.00':null);
  merge(R, 0, 1); R++;
  R++; // spacer

  // ── Column Headers ───────────────────────────────────────────────
  const COLS = ['Empresa','Proveedor','# Factura','Fecha','Vencimiento','Estado','Monto ($)','Monto (Bs)','Nota'];
  COLS.forEach((h,i) => cell(R, i, h, S(BLUE,'FFFFFF',true,10,i>=6?'right':'left')));
  R++;

  // ── Data rows ────────────────────────────────────────────────────
  if (todas.length === 0) {
    cell(R, 0, 'Sin facturas registradas', S('F3F4F6','6B7280',false,10), null);
    merge(R, 0, 8); R++;
  }

  const ESTADO_LBL = {VENCIDA:'VENCIDA',POR_VENCER:'POR VENCER',PENDIENTE:'PENDIENTE',PAGADA:'PAGADA'};
  let usdTotal = 0, bsTotal = 0;

  todas.forEach((f, idx) => {
    const estado  = f._pagada ? 'PAGADA' : computeEstado(f);
    const rowBg   = estado==='VENCIDA'  ? RED_BG :
                    estado==='POR_VENCER'? AMB_BG :
                    estado==='PAGADA'   ? GRN_BG :
                    idx%2===0           ? 'FFFFFF' : ALT_BG;
    const rowFc   = estado==='VENCIDA' ? 'B91C1C' : estado==='PAGADA' ? '166534' : '111827';

    const mUsd   = f.monto_usd   || 0;
    const mBs    = f.monto_bs_pagar || (tasa && mUsd ? Math.round(mUsd*tasa) : null);
    usdTotal += mUsd;
    if (mBs) bsTotal += mBs;

    const sCel = (hz) => S(rowBg, rowFc, false, 10, hz||'left');
    cell(R, 0, f.empresa==='farmacia'?'Farmacia':'Droguería',        sCel());
    cell(R, 1, f.proveedor||'',                                       sCel());
    cell(R, 2, f.factura||'—',                                        sCel());
    cell(R, 3, f.fecha||'',                                           sCel('center'));
    cell(R, 4, f.vence||f.fecha_vencimiento||'',                      sCel('center'));
    cell(R, 5, ESTADO_LBL[estado]||estado,                            S(rowBg, estado==='VENCIDA'?'B91C1C':estado==='PAGADA'?'166534':estado==='POR_VENCER'?'92400E':'374151', true, 10));
    cell(R, 6, mUsd,      sCel('right'), '"$"#,##0.00');
    cell(R, 7, mBs||'',  sCel('right'), '#,##0" Bs"');
    cell(R, 8, f.nota_pago||f.nota||'', sCel());
    R++;
  });

  // ── Totals row ───────────────────────────────────────────────────
  const sT = (hz) => S(DBLUE,'FFFFFF',true,10,hz||'left');
  cell(R, 0, 'TOTAL',    sT()); merge(R, 0, 5);
  cell(R, 6, usdTotal,   sT('right'), '"$"#,##0.00');
  cell(R, 7, bsTotal||'',sT('right'), '#,##0" Bs"');
  cell(R, 8, '',         sT());
  R++;

  // ── Sheet config ─────────────────────────────────────────────────
  ws['!ref'] = XLSX.utils.encode_range(range);
  ws['!merges'] = merges;
  ws['!cols'] = [
    {wch:12},{wch:28},{wch:16},{wch:12},{wch:12},{wch:12},{wch:13},{wch:14},{wch:28}
  ];
  ws['!rows'] = [{hpt:28},{hpt:18},{hpt:8},{hpt:18},{hpt:18},{hpt:18},{hpt:8},{hpt:22}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');

  const fname = 'Facturas_'+nombre.replace(/ /g,'_')+'_'+hoy+'.xlsx';
  XLSX.writeFile(wb, fname);
  showToast('Excel exportado: '+fname);
}

