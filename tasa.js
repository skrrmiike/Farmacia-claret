// ── Farmacia Claret · Tasa ──────────────────────────────────────────────────

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

