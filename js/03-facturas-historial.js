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

// ── Retenciones ISLR y Notas de crédito en el formulario de factura ──
var RET_CONCEPTOS = [
  {k:'honorarios', label:'Honorarios Profesionales', pct:5},
  {k:'contratistas', label:'Pagos a Contratistas y Subcontratistas', pct:2},
  {k:'fletes', label:'Fletes a Empresas Nacionales', pct:3},
  {k:'seguros', label:'Pago a Empresas de Seguros o Agentes', pct:5},
  {k:'publicidad', label:'Publicidad y Propaganda', pct:5},
  {k:'publicidad_radio', label:'Publicidad y Propaganda a Emisoras Radiodifusoras', pct:3},
  {k:'municipal', label:'Retención Impuesto Municipal', pct:1},
  {k:'comisiones', label:'Comisiones Mercantiles', pct:5}
];
function _updTasaIngresoLbl(){
  var v=(document.getElementById('f-tasa_ingreso')||{}).value;
  var l=document.getElementById('f-tasa-ingreso-lbl');
  if(l) l.textContent = (v&&Number(v)>0)? ('Tasa de ingreso: '+Number(v).toFixed(2)+' Bs/$') : '';
}
function _resetFacturaPaneles(){
  ['ret-panel','nc-panel'].forEach(function(idp){ var p=document.getElementById(idp); if(p){ p.style.display='none'; p.dataset.init=''; p.innerHTML=''; } });
}
function toggleRetPanel(){ var p=document.getElementById('ret-panel'); if(!p) return; if(p.style.display==='none'){ if(p.dataset.init!=='1'){ renderRetPanel(null); p.dataset.init='1'; } p.style.display=''; } else { p.style.display='none'; } }
function toggleNcPanel(){ var p=document.getElementById('nc-panel'); if(!p) return; if(p.style.display==='none'){ if(p.dataset.init!=='1'){ renderNcPanel(null); p.dataset.init='1'; } p.style.display=''; } else { p.style.display='none'; } }
function renderRetPanel(sel){
  var base0=parseFloat((document.getElementById('f-monto_bs')||{}).value)||'';
  var byk={}; (sel||[]).forEach(function(r){ byk[r.k]=r; });
  var rows=RET_CONCEPTOS.map(function(c){
    var s=byk[c.k]; var chk=!!s; var pct=s?s.pct:c.pct; var base=(s&&s.base!=null)?s.base:base0;
    return '<tr><td style="text-align:center"><input type="checkbox" data-k="'+c.k+'" '+(chk?'checked':'')+' onchange="recalcRetPanel()"></td>'+
      '<td style="font-size:11px">'+c.label+'</td>'+
      '<td><input type="number" step="0.01" class="ret-pct" data-k="'+c.k+'" value="'+pct+'" style="width:54px;padding:2px 5px" oninput="recalcRetPanel()"></td>'+
      '<td><input type="number" step="0.01" class="ret-base" data-k="'+c.k+'" value="'+(base||'')+'" style="width:96px;padding:2px 5px" oninput="recalcRetPanel()"></td>'+
      '<td class="mono r ret-monto" style="font-size:11px">0,00</td></tr>';
  }).join('');
  document.getElementById('ret-panel').innerHTML=
    '<div class="tbox"><div class="tbox-hd"><span class="tbox-title" style="font-size:12px">Retenciones ISLR</span><span class="tbox-meta">Bs · marca las que apliquen</span></div>'+
    '<div class="twrap"><table><thead><tr><th></th><th>Concepto</th><th>%</th><th>Base</th><th class="r">Monto</th></tr></thead><tbody>'+rows+
    '</tbody><tfoot><tr><td colspan="4" class="r"><strong>Total retención</strong></td><td class="r"><strong id="ret-total">0,00</strong></td></tr></tfoot></table></div></div>';
  recalcRetPanel();
}
function recalcRetPanel(){
  var tot=0;
  document.querySelectorAll('#ret-panel tbody tr').forEach(function(tr){
    var chk=tr.querySelector('input[type=checkbox]'); var pct=parseFloat(tr.querySelector('.ret-pct').value)||0; var base=parseFloat(tr.querySelector('.ret-base').value)||0;
    var monto=Math.round(base*pct/100*100)/100;
    tr.querySelector('.ret-monto').textContent=fmt(monto,2);
    if(chk.checked) tot+=monto;
  });
  var te=document.getElementById('ret-total'); if(te) te.textContent=fmt(tot,2);
  var fr=document.getElementById('f-ret'); if(fr) fr.value=tot? (Math.round(tot*100)/100).toFixed(2):'';
  calcMontoBsPagar();
}
function collectRetenciones(){
  var out=[];
  document.querySelectorAll('#ret-panel tbody tr').forEach(function(tr){
    var chk=tr.querySelector('input[type=checkbox]'); if(!chk||!chk.checked) return;
    var k=chk.dataset.k; var c=RET_CONCEPTOS.find(function(x){return x.k===k;});
    var pct=parseFloat(tr.querySelector('.ret-pct').value)||0; var base=parseFloat(tr.querySelector('.ret-base').value)||0;
    out.push({k:k, tipo:(c?c.label:k), pct:pct, base:Math.round(base*100)/100, monto:Math.round(base*pct/100*100)/100});
  });
  return out;
}
function _ncRowHtml(e){ e=e||{}; return '<tr>'+
  '<td><input class="nc-num" value="'+esc(e.numero||'')+'" style="width:84px;padding:2px 5px"></td>'+
  '<td><input type="date" class="nc-fecha" value="'+(e.fecha||'')+'" style="padding:2px 5px"></td>'+
  '<td><input type="number" step="0.01" class="nc-monto" value="'+(e.monto!=null?e.monto:'')+'" style="width:96px;padding:2px 5px" oninput="recalcNcPanel()"></td>'+
  '<td><button type="button" class="btn btn-ghost btn-sm" onclick="this.closest(\'tr\').remove();recalcNcPanel()">×</button></td></tr>'; }
function renderNcPanel(list){
  var rows=((list&&list.length)?list:[{}]).map(_ncRowHtml).join('');
  document.getElementById('nc-panel').innerHTML=
    '<div class="tbox"><div class="tbox-hd"><span class="tbox-title" style="font-size:12px">Notas de crédito</span><button type="button" class="btn btn-ghost btn-sm" onclick="addNcRow()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M5 12h14"/><path d="M12 5v14"/></svg>Agregar</button></div>'+
    '<div class="twrap"><table><thead><tr><th>N°</th><th>Fecha</th><th class="r">Monto Bs</th><th></th></tr></thead><tbody id="nc-rows">'+rows+
    '</tbody><tfoot><tr><td colspan="2" class="r"><strong>Total N/C</strong></td><td class="r"><strong id="nc-total">0,00</strong></td><td></td></tr></tfoot></table></div></div>';
  recalcNcPanel();
}
function addNcRow(){ var tb=document.getElementById('nc-rows'); if(tb) tb.insertAdjacentHTML('beforeend',_ncRowHtml({})); }
function recalcNcPanel(){
  var tot=0; document.querySelectorAll('#nc-rows tr').forEach(function(tr){ tot+=parseFloat(tr.querySelector('.nc-monto').value)||0; });
  var te=document.getElementById('nc-total'); if(te) te.textContent=fmt(tot,2);
  var fn=document.getElementById('f-nc'); if(fn) fn.value=tot? (Math.round(tot*100)/100).toFixed(2):'';
  calcMontoBsPagar();
}
function collectNotasCredito(){
  var out=[]; document.querySelectorAll('#nc-rows tr').forEach(function(tr){
    var monto=parseFloat(tr.querySelector('.nc-monto').value); if(!(monto>0)) return;
    out.push({numero:(tr.querySelector('.nc-num').value||'').trim(), fecha:tr.querySelector('.nc-fecha').value||null, monto:Math.round(monto*100)/100});
  });
  return out;
}
function _abonarTasa(){
  var f=(db.facturas||[]).find(function(x){return x.id===_abonarFid;})||{};
  var modo=((document.getElementById('abonar-tasa-modo')||{}).value)||'dia';
  if(modo==='ingreso' && Number(f.tasa_ingreso)>0) return Number(f.tasa_ingreso);
  return getTasa();
}

// Mostrar/ocultar los campos manuales "Retención (Bs)" y "Nota de Crédito (Bs)".
// Por defecto ocultos (se usan los botones+paneles); con opción de mostrarlos.
function _aplicarFactManual(){
  var hide = !(db.settings && db.settings.fact_ocultar_manual === false); // default: oculto
  var fn=document.getElementById('fg-nc'), fr=document.getElementById('fg-ret');
  if(fn) fn.style.display = hide?'none':'';
  if(fr) fr.style.display = hide?'none':'';
  var b=document.getElementById('btn-fact-manual'); if(b) b.textContent = hide?'Mostrar campos manuales':'Ocultar campos manuales';
}
function toggleFactManual(){
  db.settings = db.settings || {};
  var currentlyHidden = (db.settings.fact_ocultar_manual !== false);
  db.settings.fact_ocultar_manual = currentlyHidden ? false : true;
  saveDB(db);
  _aplicarFactManual();
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
  document.getElementById('f-tasa_ingreso').value = getTasa()||'';
  _resetFacturaPaneles(); _updTasaIngresoLbl(); _aplicarFactManual();
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
  document.getElementById('f-tasa_ingreso').value = (f.tasa_ingreso!=null?f.tasa_ingreso:'');
  _resetFacturaPaneles(); _updTasaIngresoLbl(); _aplicarFactManual();
  if (f.retenciones && f.retenciones.length){ var rp=document.getElementById('ret-panel'); renderRetPanel(f.retenciones); rp.dataset.init='1'; rp.style.display=''; }
  if (f.notas_credito && f.notas_credito.length){ var np=document.getElementById('nc-panel'); renderNcPanel(f.notas_credito); np.dataset.init='1'; np.style.display=''; }
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
    tasa_ingreso:  pN(document.getElementById('f-tasa_ingreso').value),
    retenciones:   collectRetenciones(),
    notas_credito: collectNotasCredito(),
    activa:        true,
    modulo:        MODULO
  };

  if (id) {
    const idx = db.facturas.findIndex(f => f.id===id);
    if (idx>=0) { db.facturas[idx] = { ...db.facturas[idx], ...obj, _v: Date.now() }; logAudit('factura.editar','Proveedor: '+(obj.proveedor||id)); }
  } else {
    obj.id = uid();
    obj.creado_en = HOY();
    obj.abonos = [];
    obj.abonos_usd = 0;
    obj._v = Date.now();
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
  var _ab=document.getElementById('abonar-banco'); if(_ab) _ab.value='';
  var _tm=document.getElementById('abonar-tasa-modo'); if(_tm) _tm.value='dia';
  var _th=document.getElementById('abonar-tasa-hint'); if(_th){ var _ti=f.tasa_ingreso, _td=getTasa(); _th.textContent='Ingreso: '+(Number(_ti)>0?Number(_ti).toFixed(2):'—')+' Bs/$ · Día: '+(_td?Number(_td).toFixed(2):'—')+' Bs/$'; }
  renderAbonarInfo();
  renderAbonarHistorial();
  renderPlanFactura();
  openOverlay('ov-abonar');
  setTimeout(()=>{ const e=document.getElementById('abonar-monto'); if(e) e.focus(); },120);
}
function renderAbonarInfo(){
  const f = db.facturas.find(x=>x.id===_abonarFid); if(!f) return;
  const m=montoPagarUsd(f), paid=abonadoUsd(f), sal=saldoUsd(f), t=_abonarTasa(), salBs=(sal!=null&&t)?Math.round(sal*t*100)/100:saldoBsHoy(f);
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
  const t = _abonarTasa();
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
  const t = _abonarTasa();
  if (!(v>0)) { showToast('Ingresa un monto v\u00e1lido (mayor que 0)'); return; }
  if (moneda==='BS' && !t) { showToast('Configura la tasa para abonar en Bs'); return; }
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
  f._v = Date.now();
  logAudit('factura.abonar','Proveedor: '+(f.proveedor||'')+' \u00b7 '+(moneda==='USD'?'$'+fmt(monto_usd):fmt(monto_bs,0)+' Bs')+' \u00b7 '+fecha);
  saveDB(db);
  try{ var _bk=(document.getElementById('abonar-banco')||{}).value; if(_bk && monto_bs && monto_bs>0){ registrarMovBanco({id:uid(),ts:new Date().toISOString(),tipo:'salida',entidad:(f.empresa==='farmacia'?'FARMACIA':'DROGUERIA'),banco:_bk,monto_bs:r2c(monto_bs),monto_usd:(monto_usd!=null?r2c(monto_usd):null),tasa:t||null,concepto:'Pago factura '+(f.proveedor||''),ref:nota,origen:'factura:'+f.id}); } }catch(e){}
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
          guardarHistorialRow(ff);
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
  f._v = Date.now();
  logAudit('factura.abono_eliminar','Proveedor: '+(f.proveedor||''));
  saveDB(db);
  renderAbonarInfo();
  renderAbonarHistorial();
  renderTab(activeTab);
}
function _addMeses(fechaStr, n){
  if(!fechaStr) return null;
  var p = String(fechaStr).slice(0,10).split('-'); if(p.length<3) return null;
  var y=+p[0], m=+p[1]-1, d=+p[2];
  var dt = new Date(Date.UTC(y, m+n, d));
  if (dt.getUTCDate() !== d) dt = new Date(Date.UTC(y, m+n+1, 0));
  return dt.toISOString().slice(0,10);
}
function _proyectarCuotasPrest(l, max){
  max = max||12; var out=[];
  if (l.amortizacion && l.amortizacion.length > (l.cuotas_hechas||0)){
    for (var i=(l.cuotas_hechas||0); i<l.amortizacion.length && out.length<max; i++){
      var a=l.amortizacion[i]; out.push({fecha:a.mes, monto_usd:(a.total_usd!=null?a.total_usd:(a.cuota!=null?a.cuota:l.cuota_usd))});
    }
    return out;
  }
  var restantes = Math.max(0, (l.total_cuotas||0) - (l.cuotas_hechas||0));
  if (!restantes) return out;
  var saldo = Number(l.saldo_usd)||0, cuota = Number(l.cuota_usd)||0, fecha = l.proxima_cuota;
  var n = Math.min(restantes, max);
  for (var k=0;k<n;k++){
    var monto = cuota; if (saldo>0 && saldo < cuota) monto = saldo;
    out.push({fecha:fecha, monto_usd: Math.round(monto*100)/100});
    saldo = Math.max(0, saldo - cuota); fecha = _addMeses(fecha, 1); if(!fecha) break;
  }
  return out;
}
function renderPlanFactura(){
  var f = db.facturas.find(function(x){return x.id===_abonarFid;}); if(!f) return;
  var el = document.getElementById('abonar-plan'); if(!el) return;
  var plan = (Array.isArray(f.plan)?f.plan:[]).slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');});
  var canW = (typeof puedePerm!=='function') || puedePerm('fact');
  var H = '<div style="font-weight:600;font-size:11px;color:var(--muted);margin:0 0 6px">Plan de pagos futuros</div>';
  if(!plan.length){ H += '<div style="color:var(--muted);font-size:12px;padding:4px 0">Sin pagos planificados.</div>'; }
  else { H += '<div class="twrap"><table><tbody>'; plan.forEach(function(x){ H += '<tr><td style="font-size:11px;white-space:nowrap">'+fmtDate(x.fecha)+'</td><td style="font-family:var(--mono);font-size:12px;font-weight:600">$'+fmt(x.monto_usd||0)+'</td><td style="font-size:11px;color:var(--muted)">'+esc(x.nota||'')+'</td>'+(canW?'<td style="text-align:center"><button onclick="eliminarPlanFactura(\''+x.id+'\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px" title="Eliminar">×</button></td>':'<td></td>')+'</tr>'; }); H += '</tbody></table></div>'; }
  if (canW){ H += '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><input type="date" id="planf-fecha" class="form-input" style="flex:1;min-width:120px"><input type="number" step="0.01" id="planf-monto" class="form-input" placeholder="$ monto" style="flex:1;min-width:90px;font-family:var(--mono)"><input id="planf-nota" class="form-input" placeholder="Nota" style="flex:1.5;min-width:100px"><button class="btn btn-ghost btn-sm" onclick="agregarPlanFactura()">+ Agregar</button></div>'; }
  el.innerHTML = H;
}
function agregarPlanFactura(){
  var f = db.facturas.find(function(x){return x.id===_abonarFid;}); if(!f) return;
  var fecha=(document.getElementById('planf-fecha')||{}).value;
  var monto=parseFloat((document.getElementById('planf-monto')||{}).value);
  var nota=((document.getElementById('planf-nota')||{}).value||'').trim();
  if(!fecha){ showToast('Selecciona la fecha planificada'); return; }
  if(!(monto>0)){ showToast('Ingresa el monto en $'); return; }
  if(!Array.isArray(f.plan)) f.plan=[];
  f.plan.push({id:uid(), fecha:fecha, monto_usd:Math.round(monto*100)/100, nota:nota});
  if(typeof logAudit==='function') logAudit('factura.plan','Proveedor: '+(f.proveedor||'')+' · plan $'+fmt(monto)+' · '+fecha);
  saveDB(db); renderPlanFactura(); showToast('Pago planificado agregado');
}
function eliminarPlanFactura(planId){
  var f = db.facturas.find(function(x){return x.id===_abonarFid;}); if(!f||!Array.isArray(f.plan)) return;
  f.plan = f.plan.filter(function(x){return x.id!==planId;}); saveDB(db); renderPlanFactura();
}
function agregarPlanPrestamo(loanId){
  var l = db.prestamos.find(function(x){return x.id===loanId;}); if(!l) return;
  var fecha=(document.getElementById('planp-fecha')||{}).value;
  var monto=parseFloat((document.getElementById('planp-monto')||{}).value);
  var nota=((document.getElementById('planp-nota')||{}).value||'').trim();
  if(!fecha){ showToast('Selecciona la fecha planificada'); return; }
  if(!(monto>0)){ showToast('Ingresa el monto en $'); return; }
  if(!Array.isArray(l.plan)) l.plan=[];
  l.plan.push({id:uid(), fecha:fecha, monto_usd:Math.round(monto*100)/100, nota:nota}); l._v = Date.now();
  if(typeof logAudit==='function') logAudit('prestamo.plan','ID: '+l.id+' · plan $'+fmt(monto)+' · '+fecha);
  saveDB(db); verDetalle(loanId); showToast('Pago planificado agregado');
}
function eliminarPlanPrestamo(loanId, planId){
  var l = db.prestamos.find(function(x){return x.id===loanId;}); if(!l||!Array.isArray(l.plan)) return;
  l.plan = l.plan.filter(function(x){return x.id!==planId;}); l._v = Date.now(); saveDB(db); verDetalle(loanId);
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
  guardarHistorialRow(f);
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
  borrarHistorialRow(id);
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


// ── Farmacia Claret · Préstamos ─────────────────────────────────────────────

function _loanCard(l){
    if(_esInteres(l)) return _loanCardInteres(l);
    const estado = estadoPrestamo(l);
    const pct = l.total_cuotas>0 ? Math.round(l.cuotas_hechas/l.total_cuotas*100) : 0;
    const barColor = pct>=80?'var(--green)':pct>=40?'var(--amber)':'var(--accent)';
    const dias = diasHasta(l.proxima_cuota);
    const montoPagar = _prestMontoPagar(l);
    const cuotaBs = bsLoan(montoPagar);
    const saldoBs = bsLoan(l.saldo_usd);
    const _abonCuota = Number(l.abonado_cuota_usd)||0;
    const _cuotaTot = montoPagar + _abonCuota;
    const _abonPct = _cuotaTot>0 ? Math.min(100, Math.round(_abonCuota/_cuotaTot*100)) : 0;
    return '<div class="loan-card '+loanCardClass(estado)+'">' +
      '<div class="loan-card-hd">' +
        estadoBadge(estado) +
        '<span class="badge '+(l.banco==='PROVINCIAL'?'badge-blue':l.banco==='MERCANTIL'?'badge-green':'badge-purple')+'">'+esc(l.banco)+'</span>' +
        '<span class="loan-card-title" style="cursor:pointer" onclick="verDetalle(\''+l.id.replace(/'/g,"\'")+'\')">'+esc(l.id)+'</span>' +
        '<button class="btn btn-green btn-sm" onclick="abrirPago(\''+l.id.replace(/'/g,"\'")+'\')" style="margin-left:auto"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> Pagar</button>' +
      '</div>' +
      '<div class="loan-card-body">' +
        '<div class="loan-stat"><div class="loan-stat-label">'+(_abonCuota>0.01?'Falta de la cuota':'Monto a Pagar')+'</div><div class="loan-stat-val">$'+fmt(montoPagar)+'</div><div class="loan-stat-sub">'+(cuotaBs?fmt(cuotaBs,0)+' Bs':'—')+'</div>'+(_abonCuota>0.01?'<div style="margin-top:5px"><div style="font-size:9.5px;color:var(--amber);font-weight:600;line-height:1.2">Abonado $'+fmt(_abonCuota)+' de $'+fmt(_cuotaTot)+'</div><div class="prog-wrap" style="height:5px;margin-top:3px"><div class="prog-fill" style="width:'+_abonPct+'%;background:var(--amber)"></div></div></div>':'')+'</div>' +
        '<div class="loan-stat"><div class="loan-stat-label">Saldo Restante</div><div class="loan-stat-val">$'+fmt(l.saldo_usd)+'</div><div class="loan-stat-sub">'+(saldoBs?fmt(saldoBs,0)+' Bs':'—')+'</div></div>' +
        '<div class="loan-stat"><div class="loan-stat-label">Próxima Cuota</div><div class="loan-stat-val" style="font-size:12px">'+fmtDate(l.proxima_cuota)+'</div><div class="loan-stat-sub">'+(dias!==null?(dias<0?'<span style="color:var(--red)">'+Math.abs(dias)+'d atrás</span>':dias+'d'):'—')+'</div></div>' +
        '<div class="loan-stat"><div class="loan-stat-label">Original</div><div class="loan-stat-val" style="font-size:11px">$'+fmt(l.monto_usd_original)+'</div><div class="loan-stat-sub">desde '+fmtDate(l.fecha_inicio)+'</div></div>' +
      '</div>' +
      '<div class="loan-footer">' +
        '<span style="font-size:11px;color:var(--muted)">' + l.cuotas_hechas + '/' + l.total_cuotas + ' cuotas pagadas</span>' +
        '<div class="prog-wrap" style="flex:1;max-width:200px;margin:0 8px"><div class="prog-fill" style="width:'+pct+'%;background:'+barColor+'"></div></div>' +
        '<span style="font-size:11px;font-weight:600;font-family:var(--mono)">' + pct + '%</span>' +
        '<button class="btn btn-ghost btn-sm btn-icon" onclick="verDetalle(\''+l.id.replace(/'/g,"\'")+'\')" title="Ver detalle"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" onclick="editarPrestamo(\''+l.id.replace(/'/g,"\'")+'\')" title="Editar préstamo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" onclick="eliminarPrestamo(\''+l.id.replace(/'/g,"\'")+'\')" title="Eliminar préstamo" style="color:var(--red)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>' +
      '</div>' +
    '</div>';
}
function renderPrestamos(entidad) {
  if(_prestScope==='todo' && document.getElementById('prestamos-todo-content')){ renderPrestamosCombined(); return; }
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

  let lista = (filterEstado==='LIQUIDADO') ? todos.filter(function(l){return l.liquidado || l.activo===false;}) : activos;
  if (filterBanco !== 'all') lista = lista.filter(l => l.banco===filterBanco);
  if (filterEstado !== 'all' && filterEstado!=='LIQUIDADO') lista = lista.filter(l => estadoPrestamo(l)===filterEstado);
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
  }).map(_loanCard).join('');

  document.getElementById('prestamos-'+id+'-content').innerHTML =
    '<div class="summary-grid sg-4" style="margin-bottom:16px">' +
    '<div class="scard '+(entidad==='FARMACIA'?'blue':'purple')+'"><div class="scard-label">'+icon+' Total Activos</div><div class="scard-val">'+activos.length+'</div><div class="scard-sub">préstamos</div></div>' +
    '<div class="scard red"><div class="scard-label">⏰ Cuota Mensual</div><div class="scard-val">$'+fmt(tCuota)+'</div><div class="scard-sub">'+(tasa?fmt(bsLoan(tCuota),0)+' Bs':'—')+'</div></div>' +
    '<div class="scard amber"><div class="scard-label"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Vencidas/Próx.</div><div class="scard-val">'+venc.length+' / '+prox.length+'</div><div class="scard-sub">vencidas · próximas</div></div>' +
    '<div class="scard purple"><div class="scard-label">Saldo Total</div><div class="scard-val">$'+fmt(tSaldo)+'</div><div class="scard-sub">'+(tasa?fmt(bsLoan(tSaldo),0)+' Bs':'—')+'</div></div>' +
    '</div>' +
    '<div class="filter-bar filter-bar-v">' +
    '<input type="text" id="p-'+id+'-search" placeholder="Buscar préstamo, banco, monto..." oninput="renderPrestamos(\''+entidad+'\')">' +
    '<input type="hidden" id="p-'+id+'-estado" value="'+filterEstado+'">' +
    '<div class="fchips">' +
    [['all','Todos'],['VENCIDO','Vencidos'],['HOY','Esta semana'],['PROXIMO','Próximos'],['VIGENTE','Vigentes'],['LIQUIDADO','Liquidados']].map(c=>'<button class="fchip '+(filterEstado===c[0]?'active':'')+'" onclick="document.getElementById(\'p-'+id+'-estado\').value=\''+c[0]+'\';renderPrestamos(\''+entidad+'\')">'+c[1]+'</button>').join('') +
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
  document.getElementById('np-monto-bs').value = '';
  var _t=document.getElementById('np-tasa-bcv'); if(_t) _t.value = (typeof getTasaForFecha==='function'? (getTasaForFecha(HOY())||'') : (getTasa()||''));
  document.getElementById('np-capital-usd').value = '';
  document.getElementById('np-plazo').value = '12';
  document.getElementById('np-interes').value = '1.33';
  document.getElementById('np-cuotas-hechas').value = '0';
  var _cp=document.getElementById('np-cuota-prev'); if(_cp) _cp.value='';
  document.getElementById('np-error').textContent = '';
  var _ei=document.getElementById('np-edit-id'); if(_ei) _ei.value='';
  var _ac=document.getElementById('np-activo'); if(_ac) _ac.checked=true;
  document.getElementById('ov-prestamo-title').textContent =
    'Nuevo Préstamo — ' + (entidad === 'FARMACIA' ? 'Farmacia' : 'Droguería');
  document.getElementById('ov-prestamo').classList.add('open');
}

function editarPrestamo(id) {
  var l = (db.prestamos||[]).find(function(x){ return x.id===id; });
  if (!l) return;
  document.getElementById('np-entidad').value = l.entidad || 'FARMACIA';
  document.getElementById('np-banco').value = l.banco || '';
  document.getElementById('np-numero').value = (String(l.id).match(/\d{4,}/)||[''])[0];
  document.getElementById('np-fecha-inicio').value = l.fecha_inicio || HOY();
  document.getElementById('np-monto-bs').value = (l.monto_bs_original!=null ? l.monto_bs_original : '');
  document.getElementById('np-tasa-bcv').value = (l.tasa_inicio!=null ? l.tasa_inicio : '');
  document.getElementById('np-plazo').value = (l.total_cuotas!=null ? l.total_cuotas : 12);
  document.getElementById('np-interes').value = (l.tasa_interes_mensual!=null ? (l.tasa_interes_mensual*100) : 1.33);
  document.getElementById('np-cuotas-hechas').value = (l.cuotas_hechas!=null ? l.cuotas_hechas : 0);
  document.getElementById('np-error').textContent = '';
  if(typeof _npCalcCapital==='function') _npCalcCapital();
  try{ var _ci=document.getElementById('np-interes-solo'); if(_ci)_ci.checked=(l.tipo==='interes'); var _di=document.getElementById('np-dia-interes'); if(_di)_di.value=(l.dia_pago||''); _npToggleInteres(); }catch(e){}
  var _ei=document.getElementById('np-edit-id'); if(_ei) _ei.value=id;
  var _ac=document.getElementById('np-activo'); if(_ac) _ac.checked=(l.activo!==false);
  document.getElementById('ov-prestamo-title').textContent = 'Editar Préstamo';
  document.getElementById('ov-prestamo').classList.add('open');
}

// Genera la amortización al estilo de Mayra: Capital/plazo + interés mensual sobre el saldo decreciente
function _prestAmort(capital, plazo, iMensual, fechaInicio){
  var out=[]; plazo=Math.max(1, parseInt(plazo)||12); var cuota=capital/plazo;
  var base = (fechaInicio && /^\d{4}-\d{2}-\d{2}/.test(fechaInicio)) ? new Date(fechaInicio+'T00:00:00') : new Date();
  for(var n=1;n<=plazo;n++){
    var saldoFin = capital - n*cuota; if(saldoFin<0) saldoFin=0;
    var interes = saldoFin * (iMensual||0);
    var d=new Date(base.getTime()); d.setMonth(d.getMonth()+n);
    out.push({ n:n, mes:d.toISOString().slice(0,10), capital_usd:Math.round(capital*100)/100, cuota_usd:Math.round(cuota*100)/100, saldo_usd:Math.round(saldoFin*100)/100, interes_usd:Math.round(interes*100)/100, total_usd:Math.round((cuota+interes)*100)/100 });
  }
  return out;
}
// Monto a pagar del mes en curso = cuota de capital + interés (de la amortización)
function _prestMontoPagar(l){
  if(_esInteres(l)) return _interesMensual(l);
  if(l && Array.isArray(l.amortizacion) && l.amortizacion.length){
    var idx=Math.min(Math.max(0,l.cuotas_hechas||0), l.amortizacion.length-1);
    var a=l.amortizacion[idx];
    if(a && a.total_usd!=null){
      var rem=Math.round((a.total_usd-(Number(l.abonado_cuota_usd)||0))*100)/100;
      return rem>0?rem:a.total_usd;
    }
  }
  return (l&&l.cuota_usd)||0;
}
function _proxPagoDe(l){
  var monto=_prestMontoPagar(l);
  var fecha=l.proxima_cuota||null;
  if(!fecha && Array.isArray(l.amortizacion) && l.amortizacion.length){
    var idx=Math.min(Math.max(0,l.cuotas_hechas||0), l.amortizacion.length-1);
    var a=l.amortizacion[idx]; if(a && a.mes) fecha=a.mes;
  }
  return {fecha:fecha, monto_usd:monto};
}
var VAPID_PUBLIC='BIKIf6W6_xAJxSFAWHIyVz2A4zjhGeJViCZkQiKqbnNigcWLpCXB_imXSCNU3-haWKc8b6DtwXVu8ClFbtEY9OA';
function _urlB64ToUint8(base64){ var pad='='.repeat((4-base64.length%4)%4); var b=(base64+pad).replace(/-/g,'+').replace(/_/g,'/'); var raw=atob(b); var arr=new Uint8Array(raw.length); for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i); return arr; }
async function activarPush(btn){
  try{
    if(!('serviceWorker' in navigator) || !('PushManager' in window)){ showToast('Este navegador no soporta notificaciones push.'); return; }
    if(btn){ btn.disabled=true; btn.textContent='Activando…'; }
    var perm=await Notification.requestPermission();
    if(perm!=='granted'){ showToast('Permiso denegado. Actívalo en los ajustes del navegador para este sitio.'); if(btn){btn.disabled=false;btn.textContent='Avisos';} return; }
    var reg=await navigator.serviceWorker.ready;
    var sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:_urlB64ToUint8(VAPID_PUBLIC) });
    var js=sub.toJSON();
    var res=await supabaseClient.from('push_subscriptions').upsert([{ username:(typeof currentUser!=='undefined'?currentUser:null), endpoint:js.endpoint, subscription:js }], { onConflict:'endpoint' });
    if(res&&res.error){ showToast('No se pudo guardar: '+(res.error.message||'')); if(btn){btn.disabled=false;btn.textContent='Avisos';} return; }
    if(typeof logAudit==='function') logAudit('push.activar','Suscripción guardada');
    showToast('Notificaciones activadas en este teléfono.');
    if(btn){ btn.disabled=false; btn.textContent='✓ Avisos activos'; }
  }catch(e){ showToast('No se pudo activar: '+(e.message||e)); if(btn){btn.disabled=false;btn.textContent='Avisos';} }
}
function _imprimirProxPagos(){
  var tasa=getTasa(); var hoy=HOY();
  var loans=(db.prestamos||[]).filter(function(l){return l.activo!==false;});
  var rows=loans.map(function(l){ var p=_proxPagoDe(l); return {l:l,fecha:p.fecha,monto:p.monto_usd}; });
  rows.sort(function(a,b){ if(!a.fecha)return 1; if(!b.fecha)return -1; return a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:0); });
  var totUsd=rows.reduce(function(s,r){return s+(r.monto||0);},0); var totBs=tasa?Math.round(totUsd*tasa):null;
  var body=rows.map(function(r){ var d=r.fecha?diasHasta(r.fecha):null;
    var et=d==null?'—':(d<0?(Math.abs(d)+' días atrás'):(d===0?'HOY':'en '+d+' días'));
    var col=d==null?'#666':(d<0?'#c0392b':(d<=7?'#b8860b':'#1e7e34'));
    var bs=tasa?Math.round(r.monto*tasa):null;
    return '<tr><td>'+fmtDate(r.fecha)+'</td><td style="color:'+col+';font-weight:600">'+et+'</td><td>'+esc(r.l.banco)+'</td><td>'+esc(r.l.entidad)+'</td><td style="font-size:10px;color:#666">'+esc(r.l.id)+'</td><td class="r">$'+fmt(r.monto)+'</td><td class="r">'+(bs?fmt(bs,0)+' Bs':'—')+'</td></tr>';
  }).join('');
  var logo='<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>';
  var doc='<!doctype html><html><head><meta charset="utf-8"><title>Próximos Pagos de Préstamos</title><style>'+
    'body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:24px}'+
    '.hd{display:flex;align-items:center;gap:12px;border-bottom:3px solid #1e3a5f;padding-bottom:12px}'+
    '.hd h1{font-size:18px;margin:0}.hd .sub{font-size:12px;color:#64748b;margin-top:2px}'+
    '.meta{font-size:12px;color:#475569;margin:12px 0}'+
    'table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}'+
    'th,td{border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left}'+
    'th{background:#1e3a5f;color:#fff;font-size:11px}'+
    'td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}'+
    'tfoot td{font-weight:700;border-top:2px solid #1e3a5f;background:#f1f5f9}'+
    '.foot{margin-top:16px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}'+
    '@media print{body{margin:10mm}}'+
    '</style></head><body>'+
    '<div class="hd">'+logo+'<div><h1>Próximos Pagos de Préstamos</h1><div class="sub">Farmacia Claret · Droguería Clínica</div></div></div>'+
    '<div class="meta"><strong>Generado:</strong> '+fmtDate(hoy)+(tasa?(' &nbsp;·&nbsp; <strong>Tasa:</strong> '+fmt(tasa,2)+' Bs/$'):'')+' &nbsp;·&nbsp; <strong>'+rows.length+'</strong> préstamos activos &nbsp;·&nbsp; <strong>Total a pagar:</strong> $'+fmt(totUsd)+(totBs?(' = '+fmt(totBs,0)+' Bs'):'')+'</div>'+
    '<table><thead><tr><th>Vence</th><th>Estado</th><th>Banco</th><th>Empresa</th><th>Préstamo</th><th class="r">Monto a pagar $</th><th class="r">Bs (hoy)</th></tr></thead><tbody>'+(body||'<tr><td colspan="7" style="text-align:center;color:#666">Sin préstamos activos</td></tr>')+'</tbody>'+
    '<tfoot><tr><td colspan="5">TOTAL</td><td class="r">$'+fmt(totUsd)+'</td><td class="r">'+(totBs?fmt(totBs,0)+' Bs':'—')+'</td></tr></tfoot></table>'+
    '<div class="foot">Montos en bolívares calculados a la tasa del día. Documento generado por el sistema de Farmacia Claret.</div>'+
    '</body></html>';
  var ifr=document.createElement('iframe'); ifr.setAttribute('aria-hidden','true'); ifr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
  document.body.appendChild(ifr);
  var idoc=ifr.contentWindow.document; idoc.open(); idoc.write(doc); idoc.close();
  setTimeout(function(){ try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }catch(e){ try{ window.print(); }catch(_e){} } setTimeout(function(){ try{ document.body.removeChild(ifr); }catch(e){} }, 1500); }, 350);
}

var _ppVista='lista'; var _ppMes=null;
function renderProxPagos(){
  var el=document.getElementById('prest-resumen-content'); if(!el) return;
  if(!_ppMes){ _ppMes=HOY().slice(0,7); }
  var head='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><p class="section-title" style="margin:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg> Próximos Pagos de Préstamos</p><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-accent btn-sm" onclick="activarPush(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>Avisos</button><button class="btn btn-ghost btn-sm" onclick="_imprimirProxPagos()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V2h12v7"/><rect width="12" height="8" x="6" y="14"/></svg>Imprimir</button></div></div>';
  var toggle='<div class="fchips" style="margin:12px 0"><button class="fchip'+(_ppVista==='lista'?' active':'')+'" onclick="_ppSetVista(\'lista\')">Lista</button><button class="fchip'+(_ppVista==='calendario'?' active':'')+'" onclick="_ppSetVista(\'calendario\')">Calendario</button></div>';
  el.innerHTML=head+toggle+'<div id="pp-body"></div>';
  if(!(db.prestamos && db.prestamos.length)){ var _pb=document.getElementById('pp-body'); if(_pb)_pb.innerHTML='<div class="tbox" style="text-align:center;padding:24px;color:var(--muted)"><div style="font-size:26px;margin-bottom:6px">\uD83D\uDCE1</div><div style="font-size:13.5px;font-weight:700;color:var(--text)">No pude cargar los pr\u00e9stamos</div><div style="font-size:12px;margin-top:5px;line-height:1.5">Esto no significa que no haya pagos. Revisa tu conexi\u00f3n, o cierra sesi\u00f3n y vuelve a entrar para refrescar tus datos.</div><button class="btn btn-accent btn-sm" style="margin-top:12px" onclick="this.textContent=\'Actualizando\u2026\';syncFromSupabase(false).then(function(){renderProxPagos();})">\uD83D\uDD04 Reintentar</button></div>'; return; }
  if(_ppVista==='calendario') _ppRenderCalendario(); else _ppRenderLista();
}
function _ppSetVista(v){ _ppVista=v; renderProxPagos(); }
function _ppNavMes(delta){ var y=parseInt(_ppMes.slice(0,4)), m=parseInt(_ppMes.slice(5,7))-1+delta; var d=new Date(y,m,1); _ppMes=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2); _ppRenderCalendario(); }
var _ppDiaSel=null;
function _ppEventos(){
  var ev=[];
  (db.prestamos||[]).filter(function(l){return l.activo!==false;}).forEach(function(l){
    if(Array.isArray(l.amortizacion)&&l.amortizacion.length){
      var start=Math.max(0,l.cuotas_hechas||0);
      for(var i=start;i<l.amortizacion.length;i++){ var a=l.amortizacion[i]; if(a&&a.mes){
        var full=(a.total_usd!=null?a.total_usd:0);
        var abon=(i===start?(Number(l.abonado_cuota_usd)||0):0);
        var monto=Math.round((full-abon)*100)/100; if(monto<0)monto=0;
        ev.push({fecha:a.mes, monto:monto, full:full, abonado:abon, parcial:(abon>0.01), cuota:i+1, banco:l.banco, entidad:l.entidad, id:l.id});
      }}
    } else if(l.proxima_cuota){ var mp=_prestMontoPagar(l); ev.push({fecha:l.proxima_cuota, monto:mp, full:mp, abonado:0, parcial:false, cuota:(l.cuotas_hechas||0)+1, banco:l.banco, entidad:l.entidad, id:l.id}); }
  });
  return ev;
}
function _ppDia(fecha){ _ppDiaSel=fecha; _ppRenderCalendario(); }
function _ppPanelDia(fecha){
  var tasa=getTasa(); var lst=_ppEventos().filter(function(e){return e.fecha===fecha;});
  if(!lst.length) return '<div style="text-align:center;color:var(--muted);font-size:12px;padding:14px">Sin pagos ese día.</div>';
  var tot=lst.reduce(function(s,x){return s+(x.monto||0);},0); var venc=(fecha<HOY());
  var h='<div class="tbox" style="padding:12px;border:1.5px solid var(--accent);border-radius:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><strong style="font-size:13px">'+fmtDate(fecha)+(venc?' <span style="color:var(--red);font-size:10px">(vencido)</span>':'')+'</strong><span style="font-weight:700;font-size:13px">$'+fmt(tot)+(tasa?' · '+fmt(tot*tasa,0)+' Bs':'')+'</span></div>';
  h+=lst.map(function(x){ var bs=tasa?Math.round(x.monto*tasa):null;
    return '<div style="border-top:1px solid var(--border);padding:7px 0"><div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:600"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.banco)+' · '+esc(x.entidad)+'</span><span style="flex-shrink:0">$'+fmt(x.monto)+'</span></div><div style="font-size:10.5px;color:var(--muted);display:flex;justify-content:space-between;gap:8px"><span>'+esc(x.id)+' · Cuota '+x.cuota+'</span><span>'+(bs?fmt(bs,0)+' Bs':'')+'</span></div>'+(x.parcial?'<div style="font-size:10px;color:var(--amber);margin-top:2px;font-weight:600">Ya abonado $'+fmt(x.abonado)+' de $'+fmt(x.full)+' · falta $'+fmt(x.monto)+'</div>':'')+'</div>';
  }).join('');
  h+='</div>'; return h;
}
function _ppRenderLista(){
  var b=document.getElementById('pp-body'); if(!b) return;
  var tasa=getTasa();
  var loans=(db.prestamos||[]).filter(function(l){return l.activo!==false;});
  var todos=loans.map(function(l){ var p=_proxPagoDe(l); return {l:l,fecha:p.fecha,monto:p.monto_usd}; });
  var hoy=HOY(); var finMes=hoy.slice(0,7)+'-31';
  var rows=todos.filter(function(r){ return r.fecha && r.fecha<=finMes; });
  rows.sort(function(a,b){ if(!a.fecha)return 1; if(!b.fecha)return -1; return a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:0); });
  var masTarde=todos.filter(function(r){ return r.fecha && r.fecha>finMes; }).length;
  var totUsd=rows.reduce(function(s,r){return s+(r.monto||0);},0); var totBs=tasa?Math.round(totUsd*tasa):null;
  var venc=rows.filter(function(r){return r.fecha&&r.fecha<hoy;}).length;
  var prox7=rows.filter(function(r){ var d=r.fecha?diasHasta(r.fecha):null; return d!=null&&d>=0&&d<=7; }).length;
  var kpi=function(lbl,val,sub,col){ return '<div class="tbox" style="padding:12px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+lbl+'</div><div style="font-size:20px;font-weight:700;margin-top:3px;color:'+(col||'var(--text)')+'">'+val+'</div>'+(sub?'<div style="font-size:11px;color:var(--muted)">'+sub+'</div>':'')+'</div>'; };
  var pie=(masTarde>0?('<div style="font-size:11px;color:var(--muted);margin-top:8px">+ '+masTarde+' préstamo'+(masTarde!==1?'s':'')+' con cuota en meses siguientes (míralos en el calendario).</div>'):'');
  if(!rows.length){ b.innerHTML='<div class="tbox" style="text-align:center;padding:26px;color:var(--muted)"><div style="font-size:28px;margin-bottom:4px">✓</div><div style="font-size:13px">No hay cuotas pendientes este mes.</div></div>'+pie; return; }
  var kpis='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:0 0 16px">'+kpi('Por pagar este mes',rows.length,'')+kpi('Total a pagar','$'+fmt(totUsd),totBs?fmt(totBs,0)+' Bs (hoy)':'')+kpi('Vencidos',venc,'sin pagar',venc>0?'var(--red)':'var(--green)')+kpi('Vencen en 7 días',prox7,'')+'</div>';
  var body=rows.map(function(r){ var d=r.fecha?diasHasta(r.fecha):null;
    var col=d==null?'var(--muted)':(d<0?'var(--red)':(d<=7?'var(--amber)':'var(--green)'));
    var et=d==null?'—':(d<0?(Math.abs(d)+'d atrás'):(d===0?'HOY':'en '+d+'d'));
    var bs=tasa?Math.round(r.monto*tasa):null;
    return '<tr style="border-top:1px solid var(--border)"><td style="padding:6px 8px;white-space:nowrap"><strong style="font-size:12px">'+fmtDate(r.fecha)+'</strong><br><span style="font-size:11px;font-weight:600;color:'+col+'">'+et+'</span></td><td style="padding:6px 8px;font-size:12px">'+esc(r.l.banco)+'<br><span style="font-size:10px;color:var(--muted)">'+esc(r.l.entidad)+'</span></td><td style="padding:6px 8px;font-size:11px;color:var(--muted)">'+esc(r.l.id)+'<br>'+((r.l.cuotas_hechas||0)+'/'+(r.l.total_cuotas||0)+' cuotas')+'</td><td class="mono r" style="padding:6px 8px;font-weight:700;font-size:13px">$'+fmt(r.monto)+(bs?'<br><span style="font-weight:400;font-size:11px;color:var(--muted)">'+fmt(bs,0)+' Bs</span>':'')+'</td></tr>';
  }).join('');
  b.innerHTML=kpis+'<div class="twrap"><table style="width:100%"><thead><tr><th style="text-align:left">Vence</th><th style="text-align:left">Banco</th><th style="text-align:left">Préstamo</th><th class="r">Monto a pagar</th></tr></thead><tbody>'+body+'<tr style="font-weight:700;background:var(--surface2);border-top:2px solid var(--border)"><td colspan="3" style="padding:8px">TOTAL ESTE MES</td><td class="mono r" style="padding:8px">$'+fmt(totUsd)+(totBs?' · '+fmt(totBs,0)+' Bs':'')+'</td></tr></tbody></table></div>'+pie+'<div style="font-size:10px;color:var(--muted);margin-top:8px">Solo cuotas de este mes y vencidas. Al pagar una, sale de la lista y reaparece su próximo mes.</div>';
}
function _ppRenderCalendario(){
  var b=document.getElementById('pp-body'); if(!b) return;
  var tasa=getTasa(); var ym=_ppMes;
  var y=parseInt(ym.slice(0,4)), m=parseInt(ym.slice(5,7))-1;
  var todosEv=_ppEventos(); var ev=todosEv.filter(function(e){return e.fecha&&e.fecha.slice(0,7)===ym;});
  var byDay={}; ev.forEach(function(e){ var dd=e.fecha.slice(8,10); (byDay[dd]=byDay[dd]||[]).push(e); });
  var dias=Object.keys(byDay).sort();
  if(!(_ppDiaSel && _ppDiaSel.slice(0,7)===ym && byDay[_ppDiaSel.slice(8,10)])){
    var hoyS=HOY();
    if(hoyS.slice(0,7)===ym && byDay[hoyS.slice(8,10)]) _ppDiaSel=hoyS;
    else _ppDiaSel = dias.length? (ym+'-'+dias[0]) : null;
  }
  var startDow=new Date(y,m,1).getDay(); var ndays=new Date(y,m+1,0).getDate(); var hoy=HOY();
  var totMes=ev.reduce(function(s,x){return s+(x.monto||0);},0);
  var meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var nav='<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:4px 0 6px"><button class="btn btn-ghost btn-sm" onclick="_ppNavMes(-1)" style="font-size:18px;padding:2px 12px">‹</button><div style="font-weight:700;font-size:15px;min-width:150px;text-align:center">'+meses[m]+' '+y+'</div><button class="btn btn-ghost btn-sm" onclick="_ppNavMes(1)" style="font-size:18px;padding:2px 12px">›</button></div>';
  var resumen='<div style="text-align:center;font-size:11px;color:var(--muted);margin-bottom:10px">'+(dias.length?dias.length+' día'+(dias.length!==1?'s':'')+' con pagos · total $'+fmt(totMes)+(tasa?' ('+fmt(totMes*tasa,0)+' Bs)':''):'Sin pagos este mes')+'</div>';
  var dows=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  var grid='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">';
  dows.forEach(function(dn){ grid+='<div style="text-align:center;font-size:10px;color:var(--muted);font-weight:700;padding:2px">'+dn+'</div>'; });
  for(var i=0;i<startDow;i++) grid+='<div></div>';
  for(var d=1;d<=ndays;d++){
    var dd=('0'+d).slice(-2); var fecha=ym+'-'+dd; var es=byDay[dd];
    var esHoy=(fecha===hoy); var venc=(fecha<hoy); var sel=(fecha===_ppDiaSel);
    var bg=es?(venc?'#fee2e2':(esHoy?'#eef2ff':'#ecfdf5')):'transparent';
    var bord=esHoy?'2px solid var(--accent)':'1px solid var(--border)';
    var ring=sel?'box-shadow:0 0 0 2px var(--accent);':'';
    var tot=es?es.reduce(function(s,x){return s+(x.monto||0);},0):0;
    var clk=es?(' onclick="_ppDia(\''+fecha+'\')" style="cursor:pointer;'):' style="';
    grid+='<div'+clk+'min-height:48px;border:'+bord+';border-radius:6px;padding:3px;background:'+bg+';'+ring+'"><div style="text-align:right;font-size:11px;color:'+(esHoy?'var(--accent)':'var(--muted)')+';font-weight:'+(esHoy?'700':'400')+'">'+d+'</div>'+(es?'<div style="font-size:9.5px;font-weight:700;color:'+(venc?'var(--red)':'var(--green)')+';line-height:1.1;margin-top:1px">$'+fmt(tot,0)+'</div><div style="font-size:8px;color:var(--muted)">'+es.length+' pago'+(es.length!==1?'s':'')+'</div>':'')+'</div>';
  }
  grid+='</div>';
  var hint='<div style="font-size:10px;color:var(--muted);text-align:center;margin:8px 0 4px">Toca un día con pagos para ver el detalle.</div>';
  var panel=_ppDiaSel?('<div style="margin-top:6px">'+_ppPanelDia(_ppDiaSel)+'</div>'):'';
  b.innerHTML=nav+resumen+grid+hint+panel;
}
function _npCalcCapital(){
  var bs=parseFloat((document.getElementById('np-monto-bs')||{}).value)||0;
  var tasa=parseFloat((document.getElementById('np-tasa-bcv')||{}).value)||0;
  var plazo=parseInt((document.getElementById('np-plazo')||{}).value)||12;
  var i=(parseFloat((document.getElementById('np-interes')||{}).value)||0)/100;
  var cap= tasa>0 ? bs/tasa : 0;
  var ce=document.getElementById('np-capital-usd'); if(ce) ce.value = cap ? ('$'+fmt(cap,2)) : '';
  var cp=document.getElementById('np-cuota-prev');
  if(cp){ if(cap>0&&plazo>0){ var am=_prestAmort(cap,plazo,i,null); cp.value='$'+fmt(am[0].total_usd,2)+' el 1ᵉʳ mes · capital $'+fmt(cap/plazo,2)+'/mes durante '+plazo+' meses'; } else cp.value=''; }
}
function guardarNuevoPrestamo(e) {
  e.preventDefault();
  const err = document.getElementById('np-error');
  const entidad  = document.getElementById('np-entidad').value;
  const banco    = document.getElementById('np-banco').value;
  const numero   = document.getElementById('np-numero').value.trim();
  const fInicio  = document.getElementById('np-fecha-inicio').value;
  const montoBs  = parseFloat(document.getElementById('np-monto-bs').value);
  const tasaBcv  = parseFloat(document.getElementById('np-tasa-bcv').value);
  const plazo    = parseInt(document.getElementById('np-plazo').value);
  const interesP = parseFloat(document.getElementById('np-interes').value);
  const hechas   = parseInt(document.getElementById('np-cuotas-hechas').value) || 0;

  if (!banco) { err.textContent = 'Selecciona un banco'; return; }
  if (isNaN(montoBs) || montoBs <= 0) { err.textContent = 'Monto del préstamo (Bs) inválido'; return; }
  if (isNaN(tasaBcv) || tasaBcv <= 0) { err.textContent = 'Tasa BCV inválida'; return; }
  if (isNaN(plazo)   || plazo < 1)    { err.textContent = 'Plazo (meses) inválido'; return; }

  const iMensual = (isNaN(interesP) ? 1.33 : interesP) / 100;
  const capital  = montoBs / tasaBcv;
  const amort    = _prestAmort(capital, plazo, iMensual, fInicio);
  const hh       = Math.min(Math.max(0,hechas), plazo);
  const saldo    = hh>0 ? amort[hh-1].saldo_usd : Math.round(capital*100)/100;
  const proxima  = (hh < plazo && amort[hh]) ? amort[hh].mes : (amort[plazo-1] ? amort[plazo-1].mes : null);
  const cuotaRep = (amort[hh] || amort[0]).total_usd;

  const bancoCodigo = banco.substring(0,4).toUpperCase();
  const autoNum = numero || String(Date.now()).slice(-7);
  const id = entidad + ' ' + autoNum + ' ' + bancoCodigo;
  const editId = (document.getElementById('np-edit-id')||{}).value || '';
  const activoChk = !document.getElementById('np-activo') || document.getElementById('np-activo').checked;

  if (db.prestamos.find(l => l.id === id && l.id !== editId)) {
    err.textContent = 'Ya existe un préstamo con ese número y banco';
    return;
  }

  // ── Editar préstamo existente (conserva pagos/historial; recalcula amortización) ──
  if (editId) {
    const l = db.prestamos.find(x => x.id === editId);
    if (!l) { err.textContent = 'No se encontró el préstamo a editar'; return; }
    l.id = id; l.entidad = entidad; l.banco = banco; l.fecha_inicio = fInicio;
    l.monto_bs_original = montoBs; l.tasa_inicio = tasaBcv; l.monto_usd_original = Math.round(capital*100)/100;
    l.total_cuotas = plazo; l.tasa_interes_mensual = iMensual; l.cuotas_hechas = hechas;
    l.amortizacion = amort; l.cuota_usd = Math.round(cuotaRep*100)/100; l._v = Date.now();
    l.saldo_usd = saldo; l.proxima_cuota = proxima || null; l.activo = activoChk;
    _aplicarInteres(l, fInicio); l._v = Date.now();
    logAudit('prestamo.editar','ID: '+id+' · capital $'+fmt(capital)+' · '+hechas+'/'+plazo);
    saveDB(db);
    document.getElementById('form-prestamo').reset();
    document.getElementById('np-edit-id').value = '';
    closeOverlay('ov-prestamo');
    renderPrestamos(entidad); renderBadges(); renderPanel();
    showToast('Préstamo ' + id + ' actualizado');
    return;
  }

  const nuevo = {
    id, entidad, banco,
    fecha_inicio:       fInicio,
    monto_usd_original: Math.round(capital*100)/100,
    monto_bs_original:  montoBs,
    tasa_inicio:        tasaBcv,
    tasa_interes_mensual: iMensual,
    cuota_usd:          Math.round(cuotaRep*100)/100,
    total_cuotas:       plazo,
    cuotas_hechas:      hechas,
    saldo_usd:          saldo,
    proxima_cuota:      proxima || null,
    ultima_fecha_pago:  null,
    activo:             activoChk,
    pagos:              [],
    amortizacion:       amort
  };

  _aplicarInteres(nuevo, fInicio);
  nuevo._v = Date.now();
  db.prestamos.push(nuevo);
  logAudit('prestamo.crear','ID: '+id+' · capital $'+fmt(capital)+' · '+banco);
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

  const _hbanks = Array.from(new Set(db.prestamos.map(function(l){return l.banco;}).filter(Boolean))).sort();
  const _hfilterBar =
    '<div class="filter-bar filter-bar-v" style="margin-bottom:14px">'+
    '<input type="text" id="hist-search" placeholder="Buscar préstamo, banco o nota..." value="'+esc(search)+'" oninput="renderHistorialPrestamos()" style="font-size:13px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">'+
    '<input type="hidden" id="hist-entidad" value="'+entFil+'">'+
    '<div class="fchips">'+[['all','Ambas'],['FARMACIA','Farmacia'],['DROGUERIA','Droguería']].map(function(c){return '<button class="fchip '+(entFil===c[0]?'active':'')+'" onclick="document.getElementById(\'hist-entidad\').value=\''+c[0]+'\';renderHistorialPrestamos()">'+c[1]+'</button>';}).join('')+'</div>'+
    '<div class="filter-actions"><select id="hist-banco" onchange="renderHistorialPrestamos()" style="font-size:13px;padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"><option value="all">Todos los bancos</option>'+_hbanks.map(function(b){return '<option value="'+b+'" '+(banFil===b?'selected':'')+'>'+b+'</option>';}).join('')+'</select>'+
    '<span class="filter-count">'+allPagos.length+' pagos</span>'+
    ((search||entFil!=='all'||banFil!=='all')?'<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'hist-search\').value=\'\';document.getElementById(\'hist-entidad\').value=\'all\';document.getElementById(\'hist-banco\').value=\'all\';renderHistorialPrestamos()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>Limpiar</button>':'')+
    '</div></div>';
  if (allPagos.length===0) {
    document.getElementById('historial-inner').innerHTML = _hfilterBar + '<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div><p>No hay pagos registrados</p></div>'; var _hs0=document.getElementById('hist-search'); if(_hs0&&search){_hs0.focus(); try{var L0=_hs0.value.length;_hs0.setSelectionRange(L0,L0);}catch(e){}}
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

  document.getElementById('historial-inner').innerHTML = _hfilterBar +
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
  var _hs1=document.getElementById('hist-search'); if(_hs1&&search){_hs1.focus(); try{var L1=_hs1.value.length;_hs1.setSelectionRange(L1,L1);}catch(e){}}
}

function abrirPago(loanId) {
  const l = db.prestamos.find(x => x.id===loanId);
  if (!l) return;
  currentPagoId = loanId;
  const estado = estadoPrestamo(l);
  const tasa = getTasa();
  const montoPagar = _prestMontoPagar(l);
  const cuotaBs = bsLoan(montoPagar);
  const nextCuota = l.cuotas_hechas + 1;

  document.getElementById('pago-info').innerHTML =
    '<strong>' + l.id + '</strong> · ' + l.banco + ' · ' + l.entidad + '<br>' +
    'Monto a pagar: <strong>$'+fmt(montoPagar)+'</strong>' +
    (cuotaBs ? ' = <strong>'+fmt(cuotaBs,0)+' Bs</strong>' : '') +
    ' <span style="color:var(--muted);font-size:11px">(cuota + interés)</span>' +
    ' · Próxima: ' + fmtDate(l.proxima_cuota) +
    '<br>Cuotas pagadas: ' + l.cuotas_hechas + '/' + l.total_cuotas + ((Number(l.abonado_cuota_usd)||0)>0.01 ? '<br><span style="color:var(--amber);font-size:11px">Ya abonado a esta cuota: $'+fmt(l.abonado_cuota_usd)+' · falta $'+fmt(montoPagar)+'</span>' : '');

  // Auto-rellenar con el monto a pagar (cuota + interés) de la cuota en curso
  let autoUsd = montoPagar || 0;
  const autoBs = tasa ? Math.round(autoUsd * tasa) : (cuotaBs || '');

  document.getElementById('pago-fecha').value = HOY();
  document.getElementById('pago-cuota').value = nextCuota;
  document.getElementById('pago-bs').value = autoBs || (cuotaBs ? Math.round(cuotaBs) : '');
  document.getElementById('pago-tasa').value = tasa || '';
  document.getElementById('pago-nota').value = '';
  var _pb=document.getElementById('pago-banco'); if(_pb) _pb.value='';
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
  const bs = parseFloat(document.getElementById('pago-bs').value);
  const tasa = parseFloat(document.getElementById('pago-tasa').value);
  const nota = document.getElementById('pago-nota').value.trim();
  if (!fecha) { showToast('Selecciona la fecha'); return; }
  if (!bs||bs<=0) { showToast('Ingresa el monto en Bs'); return; }
  if (!tasa||tasa<=0) { showToast('Ingresa la tasa BCV'); return; }
  const usd = Math.round(bs/tasa*100)/100;
  const pago = { fecha, monto_bs: Math.round(bs*100)/100, tasa: Math.round(tasa*100)/100, monto_usd: usd, cuota_num: (l.cuotas_hechas+1), nota };
  if (!l.pagos) l.pagos = [];
  l.pagos.push(pago);
  l.ultima_fecha_pago = fecha;
  l.abonado_cuota_usd = Math.round(((Number(l.abonado_cuota_usd)||0) + usd)*100)/100;
  if (Array.isArray(l.amortizacion) && l.amortizacion.length) {
    var _g=0;
    while (l.cuotas_hechas < l.amortizacion.length && l.cuotas_hechas < (l.total_cuotas||l.amortizacion.length) && _g<2000) {
      _g++;
      var _ct = (l.amortizacion[l.cuotas_hechas] && l.amortizacion[l.cuotas_hechas].total_usd) || 0;
      if (_ct>0 && (l.abonado_cuota_usd + 0.01) >= _ct) {
        l.abonado_cuota_usd = Math.round((l.abonado_cuota_usd - _ct)*100)/100;
        l.cuotas_hechas += 1;
        if (l.cuotas_hechas < l.amortizacion.length) {
          l.proxima_cuota = l.amortizacion[l.cuotas_hechas].mes;
          l.saldo_usd = l.amortizacion[l.cuotas_hechas].saldo_usd;
        }
      } else break;
    }
  }
  if (l.total_cuotas>0 && l.cuotas_hechas>=l.total_cuotas) {
    l.activo=false; l.liquidado=true; if(!l.fecha_liquidado) l.fecha_liquidado=fecha; l.saldo_usd=0; l.proxima_cuota=null; l.abonado_cuota_usd=0;
  }
  l._v = Date.now();
  logAudit('prestamo.pago','ID: '+l.id+' · $'+fmt(usd)+' USD · Bs '+fmt(bs,0)+((Number(l.abonado_cuota_usd)||0)>0.01?' (abono parcial, falta $'+fmt(_prestMontoPagar(l))+')':''));
  saveDB(db);
  try{ var _pb2=(document.getElementById('pago-banco')||{}).value; if(_pb2 && bs>0){ registrarMovBanco({id:uid(),ts:new Date().toISOString(),tipo:'salida',entidad:l.entidad,banco:_pb2,monto_bs:Math.round(bs*100)/100,monto_usd:usd,tasa:tasa||null,concepto:'Cuota prestamo '+l.id,ref:nota,origen:'prestamo:'+l.id}); } }catch(e){}
  closeOverlay('ov-pago');
  renderTab(activeTab);
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
    + '<div style="color:var(--muted)">'+(((Number(l.abonado_cuota_usd)||0)>0.01)?'Falta de la cuota':'Monto a pagar')+'<br><strong style="color:var(--text);font-size:14px">$'+fmt(_prestMontoPagar(l))+'</strong>'+(((Number(l.abonado_cuota_usd)||0)>0.01)?'<br><span style="font-size:10px;color:var(--amber);font-weight:600">Abonado $'+fmt(l.abonado_cuota_usd)+' de $'+fmt(_prestMontoPagar(l)+(Number(l.abonado_cuota_usd)||0))+'</span>':'<span style="font-size:10px;color:var(--muted)"> (cuota + interés)</span>')+'</div>'
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
    const full=(l.amortizacion||[]);
    const iPct=(l.tasa_interes_mensual!=null?l.tasa_interes_mensual*100:1.33).toFixed(2);
    const totInt=full.reduce(function(a,x){return a+(x.interes_usd||0);},0);
    H += '<div style="font-weight:600;font-size:12px;color:var(--muted);margin:14px 0 6px">Plan de amortizaci\u00f3n \u2014 '+full.length+' meses \u00b7 inter\u00e9s '+iPct+'%/mes \u00b7 capital $'+fmt(l.monto_usd_original||0)+' \u00b7 inter\u00e9s total $'+fmt(totInt)+'</div>';
    H += '<div class="twrap"><table style="width:100%;table-layout:fixed"><colgroup><col style="width:30%"><col style="width:17%"><col style="width:18%"><col style="width:15%"><col style="width:20%"></colgroup><thead><tr><th style="font-size:11px;text-align:left">Mes</th><th class="r" style="font-size:11px">Capital</th><th class="r" style="font-size:11px">Saldo</th><th class="r" style="font-size:11px">Inter\u00e9s</th><th class="r" style="font-size:11px">A pagar</th></tr></thead><tbody>';
    full.forEach(function(a,idx){ var pagada = idx < (l.cuotas_hechas||0); var bs = tasa?Math.round(a.total_usd*tasa):null;
      H += '<tr style="'+(pagada?'opacity:.45':'')+'"><td style="font-size:11px;white-space:nowrap">'+(idx+1)+'. '+fmtDate(a.mes)+(pagada?' \u2713':'')+'</td>'+
        '<td class="mono r" style="font-size:11px">$'+fmt(a.cuota_usd)+'</td>'+
        '<td class="mono r" style="font-size:11px">$'+fmt(a.saldo_usd)+'</td>'+
        '<td class="mono r" style="font-size:11px;color:var(--amber)">$'+fmt(a.interes_usd)+'</td>'+
        '<td class="mono r" style="font-size:12px;font-weight:600">$'+fmt(a.total_usd)+(bs?'<br><span style="font-weight:400;color:var(--muted);font-size:10px">'+fmt(bs,0)+' Bs</span>':'')+'</td></tr>';
    });
    H += '</tbody></table></div>';
  }
  if (!amort.length){
    var _proj = _proyectarCuotasPrest(l, 12);
    if (_proj.length){
      H += '<div style="font-weight:600;font-size:12px;color:var(--muted);margin:14px 0 6px">Próximas cuotas (proyección)</div><div class="twrap"><table><tbody>';
      _proj.forEach(function(a){ var bs = tasa?Math.round(a.monto_usd*tasa):null; H += '<tr><td style="font-size:11px;white-space:nowrap">'+fmtDate(a.fecha)+'</td><td style="font-family:var(--mono);font-size:12px">$'+fmt(a.monto_usd)+(bs?' · '+fmt(bs,0)+' Bs':'')+'</td></tr>'; });
      H += '</tbody></table></div>';
    }
  }
  var _plan = (Array.isArray(l.plan)?l.plan:[]).slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');});
  var _canW = (typeof puedePerm!=='function') || puedePerm('prest','cuotas');
  H += '<div style="font-weight:600;font-size:12px;color:var(--muted);margin:14px 0 6px">Pagos planificados (manual)</div>';
  if(!_plan.length){ H += '<div style="color:var(--muted);font-size:12px;padding:4px 0">Sin pagos planificados.</div>'; }
  else { H += '<div class="twrap"><table><tbody>'; _plan.forEach(function(x){ H += '<tr><td style="font-size:11px;white-space:nowrap">'+fmtDate(x.fecha)+'</td><td style="font-family:var(--mono);font-size:12px">$'+fmt(x.monto_usd||0)+'</td><td style="font-size:11px;color:var(--muted)">'+esc(x.nota||'')+'</td>'+(_canW?'<td style="text-align:center"><button onclick="eliminarPlanPrestamo(\''+l.id+'\',\''+x.id+'\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">×</button></td>':'<td></td>')+'</tr>'; }); H += '</tbody></table></div>'; }
  if (_canW){ H += '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><input type="date" id="planp-fecha" class="form-input" style="flex:1;min-width:120px"><input type="number" step="0.01" id="planp-monto" class="form-input" placeholder="$ monto" style="flex:1;min-width:90px;font-family:var(--mono)"><input id="planp-nota" class="form-input" placeholder="Nota" style="flex:1.5;min-width:100px"><button class="btn btn-ghost btn-sm" onclick="agregarPlanPrestamo(\''+l.id+'\')">+ Agregar</button></div>'; }
  document.getElementById('detalle-info').innerHTML = H;
  openOverlay('ov-detalle');
}


// ── Farmacia Claret · Bancos & Pagos ────────────────────────────────────────

function initBancosDB() {
  if (!db.bancos) db.bancos = {};  // { 'YYYY-MM-DD': { FARMACIA: {BANESCO:0,...}, DROGUERIA: {...} } }
}

function getBancosHoy() {
  initBancosDB();
  const hoy = HOY();
  if (!db.bancos[hoy]) {
    db.bancos[hoy] = {
      FARMACIA:  Object.fromEntries(BANCOS_LIST.map(b=>[b,null])),
      DROGUERIA: Object.fromEntries(BANCOS_LIST.map(b=>[b,null]))
    };
  }
  return db.bancos[hoy];
}

function guardarBancos() {
  const hoy = HOY();
  initBancosDB();
  if (!db.bancos[hoy]) db.bancos[hoy] = { FARMACIA:{}, DROGUERIA:{} };
  var _prevBase = JSON.stringify([db.bancos[hoy].FARMACIA||{}, db.bancos[hoy].DROGUERIA||{}]);
  let changed = 0;
  ENTIDADES.forEach(ent => {
    BANCOS_LIST.forEach(b => {
      const el = document.getElementById('banco-'+ent+'-'+b);
      if (!el) return;
      const v = el.value.trim();
      // El input es texto con formato (coma de miles, punto decimal): _numBs quita las comas.
      const n = v==='' ? null : _numBs(v);
      db.bancos[hoy][ent][b] = isNaN(n) ? null : Math.round(n*100)/100;
      changed++;
    });
  });
  var _newBase = JSON.stringify([db.bancos[hoy].FARMACIA||{}, db.bancos[hoy].DROGUERIA||{}]);
  if (_newBase !== _prevBase || !db.bancos[hoy]._baseTs) { db.bancos[hoy]._baseTs = new Date().toISOString(); }
  logAudit('bancos.guardar_disponibilidad','Saldos bancarios actualizados');
  saveDB(db);
  _bancosColapsado = true;
  renderBancos();
  // Guardado directo y verificado en el servidor (además del saveDB normal),
  // para avisar si por alguna razón no llegó a subir.
  _persistirBancos();
}

// Sube la disponibilidad directo a Supabase y CONFIRMA que llegó.
// Si falla, avisa claramente en vez de fingir que se guardó.
function _persistirBancos() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    showToast('Disponibilidad guardada localmente.');
    return;
  }
  supabaseClient.from('app_sections').select('data').eq('section_name','bancos').maybeSingle().then(function(r){
    var remote = (r && r.data && r.data.data && typeof r.data.data==='object' && !Array.isArray(r.data.data)) ? r.data.data : {};
    var merged = (typeof _bancosMerge==='function') ? _bancosMerge(_bancosLimpio(db.bancos), remote) : _bancosLimpio(db.bancos);
    supabaseClient.from('app_sections').upsert(
      [{ section_name:'bancos', data: merged, updated_at: new Date().toISOString() }],
      { onConflict:'section_name' }
    ).then(function(res){
      if (res && res.error) {
        showToast('Atención: se guardó en este equipo, pero NO se pudo subir al servidor. Revisa tu conexión y vuelve a dar Guardar.');
      } else {
        db.bancos = merged;
        try { _savedSnapshot['bancos'] = JSON.stringify(merged); } catch(e){}
        try { if(typeof _persistLocal==='function') _persistLocal(db); } catch(e){}
        showToast('Disponibilidad guardada y respaldada. El ingreso se ocultó; usa "Mostrar ingreso" para editar.');
      }
    }).catch(function(){
      showToast('Atención: se guardó en este equipo, pero NO se pudo subir al servidor. Revisa tu conexión y vuelve a dar Guardar.');
    });
  }).catch(function(){
    var _l=_bancosLimpio(db.bancos);
    supabaseClient.from('app_sections').upsert([{ section_name:'bancos', data:_l, updated_at:new Date().toISOString() }],{ onConflict:'section_name' }).then(function(){}).catch(function(){});
    showToast('Disponibilidad guardada en este equipo; revisa la conexión.');
  });
}

function renderBancosAlerta(tasa, totFcia, totDrog, cuotaBsFcia, cuotaBsDrog) {
  if (!puedePerm('prest','cuotas')) return '';   // cuotas de préstamos según permisos
  if (!tasa) return '';
  const lines = [];
  const activos = db.prestamos.filter(l=>l.activo);
  const vencidos = activos.filter(l=>estadoPrestamo(l)==='VENCIDO');
  const proximos = activos.filter(l=>estadoPrestamo(l)==='HOY');

  if (vencidos.length+proximos.length === 0) return '';

  const rows = [...vencidos,...proximos].sort((a,b)=>(a.proxima_cuota||'').localeCompare(b.proxima_cuota||'')).map(l => {
    const bs = bsLoan(l.cuota_usd);
    return '<tr>' +
      '<td style="font-size:11px">'+estadoBadge(estadoPrestamo(l))+'</td>' +
      '<td style="font-size:11px"><strong>'+esc(l.id)+'</strong></td>' +
      '<td><span class="badge '+(l.entidad==='FARMACIA'?'badge-blue':'badge-purple')+'">'+l.entidad+'</span></td>' +
      '<td style="font-size:11px">'+fmtDate(l.proxima_cuota)+'</td>' +
      '<td class="mono r" style="font-size:11px">'+(bs?'<strong>'+fmt(bs,0)+' Bs</strong>':'—')+'</td>' +
      '<td class="c"><button class="btn btn-green btn-icon btn-sm" data-lid="'+l.id+'" onclick="abrirPago(this.dataset.lid)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg></button></td>' +
      '</tr>';
  }).join('');

  return '<div class="tbox">' +
    '<div class="tbox-hd"><span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Pagos Urgentes</span><span class="badge badge-red">'+(vencidos.length+proximos.length)+'</span></div>' +
    '<div class="twrap"><table><thead><tr><th>Estado</th><th>Préstamo</th><th>Entidad</th><th>Fecha</th><th class="r">Monto Bs</th><th class="c"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> Pagar</th></tr></thead><tbody>'+rows+'</tbody></table></div>' +
    '</div>';
}

function limpiarBancosHoy() {
  ENTIDADES.forEach(function(ent){ BANCOS_LIST.forEach(function(b){ var el=document.getElementById('banco-'+ent+'-'+b); if(el) el.value=''; }); });
  if (typeof calcBancosLive==='function') calcBancosLive();
  if (typeof showToast==='function') showToast('Celdas limpiadas. Escribe los montos nuevos y dale Guardar — los movimientos se conservan.');
}

function _movNetoHoy(){
  var f=HOY(); var movs=_movsDesdeBase(f); var net={FARMACIA:0,DROGUERIA:0};
  movs.forEach(function(m){ var bs=Number(m.monto_bs)||0;
    if(m.tipo==='salida'){ if(net[m.entidad]!=null) net[m.entidad]-=bs; }
    else if(m.tipo==='entrada'){ if(net[m.entidad]!=null) net[m.entidad]+=bs; }
    else if(m.tipo==='traspaso'){ if(net[m.entidad]!=null) net[m.entidad]-=bs; if(net[m.entidad_dest]!=null) net[m.entidad_dest]+=bs; }
  });
  return net;
}
function calcBancosLive() {
  const tasa = getTasa();
  let totF=0, totD=0;
  BANCOS_LIST.forEach(b => {
    const elF = document.getElementById('banco-FARMACIA-'+b);
    const elD = document.getElementById('banco-DROGUERIA-'+b);
    const vF = elF ? (_numBs(elF.value)||0) : 0;
    const vD = elD ? (_numBs(elD.value)||0) : 0;
    const hasVal = elF&&(elF.value!=='')||elD&&(elD.value!=='');
    const rowTot = vF + vD;
    totF += vF; totD += vD;
    const rt = document.getElementById('rowt-'+b);
    if (rt) {
      rt.textContent = hasVal ? _fmtBs(rowTot)+' Bs'+(tasa?' · $'+_fmtBs(rowTot/tasa):'') : '—';
    }
  });
  const totG = totF + totD;
  // Update table footer
  const elCF = document.getElementById('coltot-F'); if(elCF) elCF.textContent=_fmtBs(totF)+' Bs';
  const elCD = document.getElementById('coltot-D'); if(elCD) elCD.textContent=_fmtBs(totD)+' Bs';
  const elCT = document.getElementById('coltot-T'); if(elCT) elCT.textContent=_fmtBs(totG)+' Bs';
  const elUSD = document.getElementById('coltot-USD');
  if(elUSD) elUSD.textContent = tasa ? '$'+_fmtBs(totG/tasa) : '— (sin tasa)';
  // Tarjetas = disponible actual = (saldo inicial escrito) ± movimientos de hoy
  const _net = _movNetoHoy();
  const _tFA = totF + _net.FARMACIA, _tDA = totD + _net.DROGUERIA, _tGA = _tFA + _tDA;
  const sCF = document.getElementById('sum-totF'); if(sCF) sCF.textContent=_fmtBs(_tFA)+' Bs';
  const sCD = document.getElementById('sum-totD'); if(sCD) sCD.textContent=_fmtBs(_tDA)+' Bs';
  const sCT = document.getElementById('sum-totG'); if(sCT) sCT.textContent=_fmtBs(_tGA)+' Bs';
  const sCU = document.getElementById('sum-totUSD'); if(sCU) sCU.textContent=tasa?'$'+_fmtBs(_tGA/tasa):'—';
  var _bx=document.getElementById('bancos-actual-box'); if(_bx && typeof _bancosActualHTML==='function') _bx.innerHTML=_bancosActualHTML(HOY());
}

// ── Movimientos bancarios (salidas/entradas/traspasos) ───────────────────────
function bancosMovs(fecha){ var d = db.bancos && db.bancos[fecha]; return (d && Array.isArray(d._mov)) ? d._mov : []; }
function _movsDesdeBase(fecha){
  var arr = bancosMovs(fecha) || [];
  var d = db.bancos && db.bancos[fecha];
  var bts = d && d._baseTs;
  if(!bts) return arr;
  return arr.filter(function(m){ return !m.ts || m.ts >= bts; });
}
function _bancosStampHTML(fecha){
  var d=db.bancos&&db.bancos[fecha]; var bts=d&&d._baseTs;
  if(!bts) return '<span style="font-size:11px;color:var(--muted);margin-left:8px">aún sin guardar hoy</span>';
  var t=new Date(bts); var hh=t.getHours(), mm=('0'+t.getMinutes()).slice(-2); var ap=hh<12?'a.m.':'p.m.'; var h12=((hh%12)||12);
  return '<span style="font-size:11px;color:var(--green);font-weight:600;margin-left:8px">✓ Guardado hoy '+h12+':'+mm+' '+ap+'</span>';
}
