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
  let changed = 0;
  ENTIDADES.forEach(ent => {
    BANCOS_LIST.forEach(b => {
      const el = document.getElementById('banco-'+ent+'-'+b);
      if (!el) return;
      const v = el.value.trim();
      const n = v==='' ? null : parseFloat(v.replace(/[.,]/g, m => m===','?'.':''));
      db.bancos[hoy][ent][b] = isNaN(n) ? null : Math.round(n*100)/100;
      changed++;
    });
  });
  logAudit('bancos.guardar_disponibilidad','Saldos bancarios actualizados');
  saveDB(db);
  renderBancos();
  showToast('Disponibilidad del día guardada');
}

function renderBancosAlerta(tasa, totFcia, totDrog, cuotaBsFcia, cuotaBsDrog) {
  if (currentRole === 'grismar') return '';   // grismar no ve cuotas de préstamos
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
  if (!confirm('¿Limpiar los valores de hoy?')) return;
  const hoy = HOY();
  if (db.bancos && db.bancos[hoy]) delete db.bancos[hoy];
  saveDB(db);
  renderBancos();
}

function calcBancosLive() {
  const tasa = getTasa();
  let totF=0, totD=0;
  BANCOS_LIST.forEach(b => {
    const elF = document.getElementById('banco-FARMACIA-'+b);
    const elD = document.getElementById('banco-DROGUERIA-'+b);
    const vF = elF ? (parseFloat(elF.value)||0) : 0;
    const vD = elD ? (parseFloat(elD.value)||0) : 0;
    const hasVal = elF&&(elF.value!=='')||elD&&(elD.value!=='');
    const rowTot = vF + vD;
    totF += vF; totD += vD;
    const rt = document.getElementById('rowt-'+b);
    if (rt) {
      rt.textContent = hasVal ? fmt(rowTot,0)+' Bs'+(tasa?' · $'+fmt(rowTot/tasa):'') : '—';
    }
  });
  const totG = totF + totD;
  // Update table footer
  const elCF = document.getElementById('coltot-F'); if(elCF) elCF.textContent=fmt(totF,0)+' Bs';
  const elCD = document.getElementById('coltot-D'); if(elCD) elCD.textContent=fmt(totD,0)+' Bs';
  const elCT = document.getElementById('coltot-T'); if(elCT) elCT.textContent=fmt(totG,0)+' Bs';
  const elUSD = document.getElementById('coltot-USD');
  if(elUSD) elUSD.textContent = tasa ? '$'+fmt(totG/tasa) : '— (sin tasa)';
  // Update summary cards
  const sCF = document.getElementById('sum-totF'); if(sCF) sCF.textContent=fmt(totF,0)+' Bs';
  const sCD = document.getElementById('sum-totD'); if(sCD) sCD.textContent=fmt(totD,0)+' Bs';
  const sCT = document.getElementById('sum-totG'); if(sCT) sCT.textContent=fmt(totG,0)+' Bs';
  const sCU = document.getElementById('sum-totUSD'); if(sCU) sCU.textContent=tasa?'$'+fmt(totG/tasa):'—';
}

function renderBancos() {
  initBancosDB();
  const hoy  = HOY();
  const data = getBancosHoy();
  const tasa = getTasa();

  // Totals (from saved data)
  const totF = BANCOS_LIST.reduce((a,b)=>a+(data.FARMACIA[b]||0),0);
  const totD = BANCOS_LIST.reduce((a,b)=>a+(data.DROGUERIA[b]||0),0);
  const totG = totF + totD;

  // Entry form — with live row totals
  const formRows = BANCOS_LIST.map(b => {
    const vF = data.FARMACIA[b]; const vD = data.DROGUERIA[b];
    const rowTot = (vF||0)+(vD||0);
    const hasVal = (vF!=null||vD!=null);
    return '<tr>'+
      '<td style="font-weight:600;font-size:12px;padding:4px 8px;color:var(--text2)">'+b+'</td>'+
      '<td style="padding:4px 6px"><input type="number" step="0.01" id="banco-FARMACIA-'+b+'" class="form-input" style="font-family:var(--mono);font-size:12px;padding:5px 8px;width:100%" placeholder="0" value="'+(vF!=null?vF:'')+'" oninput="calcBancosLive()"></td>'+
      '<td style="padding:4px 6px"><input type="number" step="0.01" id="banco-DROGUERIA-'+b+'" class="form-input" style="font-family:var(--mono);font-size:12px;padding:5px 8px;width:100%" placeholder="0" value="'+(vD!=null?vD:'')+'" oninput="calcBancosLive()"></td>'+
      '<td class="mono r" style="font-size:11px;color:var(--text2);font-weight:600;padding:4px 8px;white-space:nowrap" id="rowt-'+b+'">'+(hasVal ? fmt(rowTot,0)+' Bs'+(tasa?' · $'+fmt(rowTot/tasa):'') : '—')+'</td>'+
      '</tr>';
  }).join('');

  // Summary totals row
  const summaryRow =
    '<tr style="font-weight:700;border-top:2px solid var(--border);background:var(--surface2)">'+
    '<td style="padding:8px 8px;font-size:12px">TOTAL</td>'+
    '<td class="mono r" style="padding:8px 8px;font-size:12px" id="coltot-F">'+fmt(totF,0)+' Bs</td>'+
    '<td class="mono r" style="padding:8px 8px;font-size:12px" id="coltot-D">'+fmt(totD,0)+' Bs</td>'+
    '<td class="mono r" style="padding:8px 8px;font-size:12px;color:var(--accent)" id="coltot-T">'+fmt(totG,0)+' Bs</td></tr>'+
    '<tr style="border-top:1px solid var(--border3);background:var(--surface3)">'+
    '<td colspan="3" style="padding:6px 8px;font-size:11px;color:var(--muted)">Total en USD (÷ tasa)</td>'+
    '<td class="mono r" style="padding:6px 8px;font-size:13px;font-weight:700;color:var(--green)" id="coltot-USD">'+(tasa?'$'+fmt(totG/tasa):'— (sin tasa)')+'</td></tr>';

  // ── Plan de pagos ──────────────────────────────────
  // History last 7 days
  const fechas = Object.keys(db.bancos).filter(k=>/^\d{4}-/.test(k)).sort().reverse().slice(0,7);
  const histRows = fechas.map(fd => {
    const dd = db.bancos[fd];
    const tF2 = BANCOS_LIST.reduce((a,b)=>a+(dd.FARMACIA&&dd.FARMACIA[b]||0),0);
    const tD2 = BANCOS_LIST.reduce((a,b)=>a+(dd.DROGUERIA&&dd.DROGUERIA[b]||0),0);
    return '<tr>'+
      '<td style="white-space:nowrap">'+fmtDate(fd)+(fd===hoy?'<span class="badge b-green" style="margin-left:6px;font-size:9px">HOY</span>':'')+'</td>'+
      '<td class="mono r">'+fmt(tF2,0)+'</td>'+
      '<td class="mono r">'+fmt(tD2,0)+'</td>'+
      '<td class="mono r" style="font-weight:700">'+fmt(tF2+tD2,0)+'</td>'+
      '</tr>';
  }).join('');

  document.getElementById('bancos-content').innerHTML =
    // ─ Entry ─
    '<div class="tbox"><div class="tbox-hd">'+
    '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg> Disponibilidad de Hoy — '+fmtDate(hoy)+'</span></div>'+
    '<div style="padding:12px 16px">'+
    // Summary cards
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'+
    '<div class="scard blue"><div class="scard-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg></div><div class="scard-label">Farmacia Hoy</div><div class="scard-val" id="sum-totF">'+fmt(totF,0)+' Bs</div></div>'+
    '<div class="scard purple"><div class="scard-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 11v4"/><path d="M14 13h-4"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg></div><div class="scard-label">Droguería Hoy</div><div class="scard-val" id="sum-totD">'+fmt(totD,0)+' Bs</div></div>'+
    '<div class="scard accent"><div class="scard-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></div><div class="scard-label">Total Bs</div><div class="scard-val" id="sum-totG">'+fmt(totG,0)+' Bs</div></div>'+
    '<div class="scard green"><div class="scard-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="scard-label">Total USD</div><div class="scard-val" id="sum-totUSD">'+(tasa?'$'+fmt(totG/tasa):'—')+'</div><div class="scard-sub">'+(tasa?'a Bs '+fmt(tasa)+'/USD':'Configura la tasa')+'</div></div>'+
    '</div>'+
    '<div class="twrap"><table>'+
    '<thead><tr><th>Banco</th><th class="r">Farmacia (Bs)</th><th class="r">Droguería (Bs)</th><th class="r">Total</th></tr></thead>'+
    '<tbody>'+formRows+summaryRow+'</tbody></table></div>'+
    '<div style="padding-top:12px;display:flex;justify-content:flex-end;gap:8px">'+
    '<button class="btn btn-ghost btn-sm" onclick="limpiarBancosHoy()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg> Limpiar</button>'+
    '<button class="btn btn-accent" onclick="guardarBancos()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Guardar Disponibilidad</button>'+
    '</div></div></div>' +
    // History
    '<div class="tbox" style="margin-top:16px"><div class="tbox-hd"><span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> Historial (últimos 7 días)</span></div>'+
    (fechas.length===0
      ? '<div class="empty-state" style="padding:20px"><p>Sin registros</p></div>'
      : '<div class="twrap"><table><thead><tr><th>Fecha</th><th class="r">Farmacia</th><th class="r">Droguería</th><th class="r">Total</th></tr></thead><tbody>'+histRows+'</tbody></table></div>'
    )+'</div>';
  renderVerifBancaria();
}


function eliminarPrestamo(loanId) {
  if (!confirm('¿Eliminar el préstamo "'+loanId+'"?\nEsta acción es permanente y no se puede deshacer.')) return;
  db.prestamos = db.prestamos.filter(l => l.id !== loanId);
  logAudit('prestamo.eliminar','ID: '+loanId);
  saveDB(db);
  db = loadDB();  // releer localStorage para garantizar consistencia
  // Refrescar todas las vistas que dependen de préstamos
  renderPrestamos('FARMACIA');
  renderPrestamos('DROGUERIA');
  renderPanel();
  renderBadges();
  // Scroll al inicio para que se vean los totales actualizados
  const content = document.querySelector('.app-content');
  if (content) content.scrollTo({top: 0, behavior: 'smooth'});
  showToast('Préstamo eliminado: '+loanId);
}

// ── Verificación Bancaria ─────────────────────────────────────────────────────

function renderVerifBancaria() {
  const hoy   = HOY();
  const saved = (db.bancos._verif && db.bancos._verif[hoy]) || {};
  const hayDatos = Object.keys(saved).length > 0 && VERIF_BANCOS.some(b => (saved[b]?.ingreso||0) > 0);

  function getTots() {
    return VERIF_BANCOS.reduce((acc,b) => {
      const s = saved[b] || {};
      const i = parseFloat(s.ingreso)||0, c = parseFloat(s.comision)||0;
      const a = (s.admin!==null&&s.admin!==undefined) ? parseFloat(s.admin)||0 : null;
      const t = i-c;
      acc.ingreso+=i; acc.comision+=c; acc.total+=t;
      if(a!==null){acc.admin+=a; acc.adminN++;} acc.dif+=(a!==null?t-a:t);
      return acc;
    }, {ingreso:0,comision:0,total:0,admin:0,adminN:0,dif:0});
  }

  const rows = VERIF_BANCOS.map(b => {
    const bk = b.replace(/ /g,'_');
    const s  = saved[b] || {};
    const i  = s.ingreso  ?? '', c = s.comision ?? '', a = s.admin ?? '';
    const tot = (parseFloat(i)||0)-(parseFloat(c)||0);
    const dif = a!=='' ? tot-(parseFloat(a)||0) : tot;
    const difColor = dif<0?'color:var(--red)':dif>0?'color:var(--green)':'';
    return '<tr>'+
      '<td style="font-weight:600;font-size:12px;padding:5px 8px;white-space:nowrap;color:var(--text2)">'+b+'</td>'+
      '<td style="padding:3px 5px"><input type="number" step="0.01" id="vi-'+bk+'" class="form-input" style="font-family:var(--mono);font-size:12px;padding:4px 7px;width:100%" value="'+i+'" oninput="calcVerifLive()" placeholder="0"></td>'+
      '<td style="padding:3px 5px"><input type="number" step="0.01" id="vc-'+bk+'" class="form-input" style="font-family:var(--mono);font-size:12px;padding:4px 7px;width:100%" value="'+c+'" oninput="calcVerifLive()" placeholder="0"></td>'+
      '<td class="mono r" style="font-weight:700;padding:5px 8px;font-size:12px;white-space:nowrap" id="vt-'+bk+'">'+fmt(tot,2)+'</td>'+
      '<td style="padding:5px 8px;text-align:right" id="va-wrap-'+bk+'">'+
        (a!==''&&a!==null&&a!==undefined
          ? '<span class="mono" style="font-size:12px;font-weight:600;color:var(--accent)">'+fmt(parseFloat(a)||0,2)+'</span>'
          : '<span style="font-size:11px;color:var(--faint)">— esperando</span>')+
      '</td>'+
      '<td class="mono r" style="font-weight:700;padding:5px 8px;font-size:12px;white-space:nowrap;'+difColor+'" id="vd-'+bk+'">'+fmt(dif,2)+'</td>'+
    '</tr>';
  }).join('');

  const tots = getTots();
  const tDifColor = tots.dif<0?'color:var(--red)':tots.dif>0?'color:var(--green)':'';
  const el = document.getElementById('bancos-verif-content');
  if (!el) return;
  el.innerHTML =
    '<div class="tbox">'+
    '<div class="tbox-hd">'+
      '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg> Verificación Bancaria</span>'+
      '<span style="font-size:11px;color:var(--muted)">Conciliación vs INES — '+fmtDate(hoy)+'</span>'+
      '<div class="spacer"></div>'+
      '<button class="btn btn-accent btn-sm" onclick="guardarVerif()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Guardar verificación</button>'+
      (hayDatos ? '<button class="btn btn-ghost btn-sm" onclick="exportarVerifExcel()" style="margin-left:4px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg> Exportar Excel</button>' : '')+
      (hayDatos ? '<button class="btn btn-ghost btn-sm" onclick="window.print()" style="margin-left:4px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V2h12v7"/><rect width="12" height="8" x="6" y="14"/></svg> Imprimir</button>' : '')+
      (hayDatos ? '<button class="btn btn-ghost btn-sm" onclick="limpiarVerif()" style="margin-left:4px;color:var(--red)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg> Limpiar</button>' : '')+
    '</div>'+
    '<div class="twrap"><table>'+
    '<thead><tr>'+
      '<th style="min-width:140px">Banco / Terminal</th>'+
      '<th class="r" style="min-width:110px">Ingreso (Bs)</th>'+
      '<th class="r" style="min-width:110px">Comisión (Bs)</th>'+
      '<th class="r" style="min-width:110px">Total Ingreso</th>'+
      '<th class="r" style="min-width:130px">Ing. Administrativo<br><span style="font-weight:400;font-size:10px;opacity:.7">(INES)</span></th>'+
      '<th class="r" style="min-width:110px">Diferencia</th>'+
    '</tr></thead>'+
    '<tbody>'+rows+'</tbody>'+
    '<tfoot><tr style="font-weight:700;background:var(--surface2);border-top:2px solid var(--border)">'+
      '<td style="padding:8px;font-size:12px">TOTAL</td>'+
      '<td class="mono r" id="v-tot-ingreso" style="padding:8px;font-size:12px">'+fmt(tots.ingreso,2)+'</td>'+
      '<td class="mono r" id="v-tot-comision" style="padding:8px;font-size:12px">'+fmt(tots.comision,2)+'</td>'+
      '<td class="mono r" id="v-tot-total" style="padding:8px;font-size:12px">'+fmt(tots.total,2)+'</td>'+
      '<td class="mono r" id="v-tot-admin" style="padding:8px;font-size:12px">'+fmt(tots.admin,2)+'</td>'+
      '<td class="mono r" id="v-tot-dif" style="padding:8px;font-size:12px;'+tDifColor+'">'+fmt(tots.dif,2)+'</td>'+
    '</tr></tfoot>'+
    '</table></div></div>';
}

function calcVerifLive() {
  let tI=0,tC=0,tT=0,tA=0,tD=0;
  VERIF_BANCOS.forEach(b => {
    const bk=b.replace(/ /g,'_');
    const eI=document.getElementById('vi-'+bk), eC=document.getElementById('vc-'+bk);
    const eA=document.getElementById('va-'+bk), eTot=document.getElementById('vt-'+bk), eDif=document.getElementById('vd-'+bk);
    if(!eI) return;
    const i=parseFloat(eI.value)||0, c=parseFloat(eC.value)||0;
    const a=eA&&eA.value!==''?(parseFloat(eA.value)||0):null;
    const tot=i-c, dif=a!==null?tot-a:tot;
    if(eTot) eTot.textContent=fmt(tot,2);
    if(eDif){ eDif.textContent=fmt(dif,2); eDif.style.color=dif<0?'var(--red)':dif>0?'var(--green)':''; }
    tI+=i; tC+=c; tT+=tot; if(a!==null)tA+=a; tD+=dif;
  });
  const upd=(id,v,color)=>{ const e=document.getElementById(id); if(e){e.textContent=fmt(v,2);if(color)e.style.color=tD<0?'var(--red)':tD>0?'var(--green)':'';} };
  upd('v-tot-ingreso',tI); upd('v-tot-comision',tC); upd('v-tot-total',tT); upd('v-tot-admin',tA); upd('v-tot-dif',tD,true);
}

function limpiarVerif() {
  const hoy = HOY();
  if (!confirm('¿Limpiar toda la verificación bancaria de hoy ('+fmtDate(hoy)+')? Los datos se perderán.')) return;
  if (db.bancos._verif) delete db.bancos._verif[hoy];
  saveDB(db);
  renderBancos();
  showToast('Verificación bancaria limpiada');
}

function guardarVerif() {
  const hoy=HOY();
  if(!db.bancos._verif) db.bancos._verif={};
  if(!db.bancos._verif[hoy]) db.bancos._verif[hoy]={};
  VERIF_BANCOS.forEach(b => {
    const bk=b.replace(/ /g,'_');
    const eI=document.getElementById('vi-'+bk), eC=document.getElementById('vc-'+bk);
    if(!eI) return;
    const prev = db.bancos._verif[hoy][b] || {};
    db.bancos._verif[hoy][b]={
      ingreso: parseFloat(eI.value)||0,
      comision: parseFloat(eC.value)||0,
      admin: prev.admin !== undefined ? prev.admin : null  // admin solo lo edita Ines
    };
  });
  // Archivar snapshot en historial
  const snap = db.bancos._verif[hoy];
  let tI=0,tC=0,tT=0,tA=0,tD=0;
  VERIF_BANCOS.forEach(b => {
    const s=snap[b]||{};
    const i=parseFloat(s.ingreso)||0, co=parseFloat(s.comision)||0;
    const a=(s.admin!==null&&s.admin!==undefined)?parseFloat(s.admin)||0:null;
    const t=i-co; tI+=i; tC+=co; tT+=t;
    if(a!==null){tA+=a; tD+=t-a;} else tD+=t;
  });
  if(!db.bancos._verif_hist) db.bancos._verif_hist=[];
  const entrada={fecha:hoy, confirmada_en:new Date().toISOString(), confirmada_por:getUserNombre(currentUser), data:JSON.parse(JSON.stringify(snap)), totales:{ingreso:tI,comision:tC,total:tT,admin:tA,dif:tD}};
  const idx=db.bancos._verif_hist.findIndex(h=>h.fecha===hoy);
  if(idx>=0) db.bancos._verif_hist[idx]=entrada; else db.bancos._verif_hist.push(entrada);
  logAudit('verif.guardar','Fecha: '+hoy);
  saveDB(db);
  showToast('Verificación guardada y archivada');
}

function calcVerifInesLive() {
  let tI=0,tC=0,tT=0,tA=0,tD=0;
  VERIF_BANCOS.forEach(b => {
    const bk=b.replace(/ /g,'_');
    const eA=document.getElementById('ia-'+bk);
    const eTot=document.getElementById('it-'+bk), eDif=document.getElementById('id-'+bk);
    const saved=(db.bancos._verif&&db.bancos._verif[document.getElementById('ines-fecha')?.value||HOY()])||{};
    const s=saved[b]||{};
    const i=parseFloat(s.ingreso)||0, co=parseFloat(s.comision)||0;
    const a=eA&&eA.value!==''?(parseFloat(eA.value)||0):null;
    const tot=i-co, dif=a!==null?tot-a:null;
    if(eTot) eTot.textContent=fmt(tot,2);
    if(eDif){ eDif.textContent=dif!==null?fmt(dif,2):'—'; eDif.style.color=dif===null?'':(dif<0?'var(--red)':dif>0?'var(--green)':''); }
    tI+=i; tC+=co; tT+=tot; if(a!==null)tA+=a;
    tD+=dif!==null?dif:tot;
  });
  const upd=(id,v,clr)=>{const e=document.getElementById(id);if(e){e.textContent=fmt(v,2);if(clr)e.style.color=tD<0?'var(--red)':tD>0?'var(--green)':'';} };
  upd('i-tot-ing',tI); upd('i-tot-com',tC); upd('i-tot-tot',tT); upd('i-tot-adm',tA); upd('i-tot-dif',tD,true);
}

function renderVerifInes() {
  const el = document.getElementById('verif-ines-content');
  if (!el) return;
  const hoy = HOY();
  const fEl = document.getElementById('ines-fecha');
  const fecha = (fEl && fEl.value) || hoy;
  const saved = (db.bancos._verif && db.bancos._verif[fecha]) || {};

  let tI=0,tC=0,tT=0,tA=0,tD=0;
  const rows = VERIF_BANCOS.map(b => {
    const bk = b.replace(/ /g,'_');
    const s  = saved[b] || {};
    const i  = parseFloat(s.ingreso)||0, co = parseFloat(s.comision)||0;
    const a  = (s.admin!==undefined&&s.admin!==null) ? s.admin : '';
    const tot= i-co;
    const dif= a!==''?tot-(parseFloat(a)||0):null;
    const difColor= dif===null?'':(dif<0?'color:var(--red)':dif>0?'color:var(--green)':'');
    tI+=i; tC+=co; tT+=tot;
    if(a!==''){tA+=parseFloat(a)||0; tD+=dif!==null?dif:tot;} else tD+=tot;
    // Ingreso y Comisión: solo lectura (datos de Mayra)
    const ingHtml = i>0
      ? '<span class="mono" style="font-size:12px;font-weight:600">'+fmt(i,2)+'</span>'
      : '<span style="font-size:11px;color:var(--faint)">— pendiente</span>';
    const comHtml = co>0
      ? '<span class="mono" style="font-size:12px">'+fmt(co,2)+'</span>'
      : '<span style="font-size:11px;color:var(--faint)">0,00</span>';
    return '<tr style="border-bottom:1px solid var(--border)">'+
      '<td style="font-weight:600;font-size:12px;padding:6px 10px;white-space:nowrap;color:var(--text2)">'+b+'</td>'+
      '<td class="r" style="padding:6px 8px">'+ingHtml+'</td>'+
      '<td class="r" style="padding:6px 8px">'+comHtml+'</td>'+
      '<td class="mono r" style="font-weight:700;padding:6px 8px;font-size:12px" id="it-'+bk+'">'+fmt(tot,2)+'</td>'+
      '<td style="padding:4px 6px">'+
        '<input type="number" step="0.01" id="ia-'+bk+'" class="form-input" '+
          'style="font-family:var(--mono);font-size:12px;padding:4px 8px;width:130px;text-align:right" '+
          'value="'+a+'" placeholder="0.00" oninput="calcVerifInesLive()">'+
      '</td>'+
      '<td class="mono r" style="font-weight:700;padding:6px 8px;font-size:12px;'+difColor+'" id="id-'+bk+'">'+
        (dif!==null?fmt(dif,2):'—')+
      '</td>'+
    '</tr>';
  }).join('');

  const tDifColor = tD<0?'color:var(--red)':tD>0?'color:var(--green)':'';
  el.innerHTML =
    '<p class="section-title">Verificación Bancaria — Inés</p>'+
    '<div class="tbox">'+
      '<div class="tbox-hd">'+
        '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg> Conciliación vs Sistema</span>'+
        '<span style="font-size:11px;color:var(--muted)">'+fmtDate(fecha)+'</span>'+
        '<div class="spacer"></div>'+
        '<div style="display:flex;align-items:center;gap:10px">'+
          '<label style="font-size:12px;font-weight:600;color:var(--text)">Fecha:</label>'+
          '<input type="date" id="ines-fecha" class="form-input" style="width:150px" value="'+fecha+'" onchange="renderVerifInes()">'+
          '<span style="font-size:11px;color:var(--green)" id="ines-saved-note"></span>'+
        '</div>'+
        '<button class="btn btn-accent btn-sm" onclick="guardarVerifInes()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Guardar</button>'+
      '</div>'+
      '<div class="twrap"><table>'+
        '<thead><tr>'+
          '<th style="min-width:130px">Banco / Terminal</th>'+
          '<th class="r" style="min-width:100px">Ingreso (Bs)'+
            '<br><span style="font-weight:400;font-size:10px;opacity:.6">Sistema</span></th>'+
          '<th class="r" style="min-width:90px">Comisión (Bs)</th>'+
          '<th class="r" style="min-width:100px">Total Ingreso</th>'+
          '<th class="r" style="min-width:130px">Ing. Adm.<br><span style="font-weight:400;font-size:10px;opacity:.6">(tu valor)</span></th>'+
          '<th class="r" style="min-width:100px">Diferencia</th>'+
        '</tr></thead>'+
        '<tbody>'+rows+'</tbody>'+
        '<tfoot><tr style="font-weight:700;background:var(--surface2);border-top:2px solid var(--border)">'+
          '<td style="padding:8px 10px;font-size:12px">TOTAL</td>'+
          '<td class="mono r" id="i-tot-ing" style="padding:8px;font-size:12px">'+fmt(tI,2)+'</td>'+
          '<td class="mono r" id="i-tot-com" style="padding:8px;font-size:12px">'+fmt(tC,2)+'</td>'+
          '<td class="mono r" id="i-tot-tot" style="padding:8px;font-size:12px">'+fmt(tT,2)+'</td>'+
          '<td class="mono r" id="i-tot-adm" style="padding:8px;font-size:12px;color:var(--accent)">'+fmt(tA,2)+'</td>'+
          '<td class="mono r" id="i-tot-dif" style="padding:8px;font-size:12px;'+tDifColor+'">'+fmt(tD,2)+'</td>'+
        '</tr></tfoot>'+
      '</table></div>'+
    '</div>';
}

function guardarVerifInes() {
  const fEl  = document.getElementById('ines-fecha');
  const fecha = (fEl && fEl.value) || HOY();
  if (!db.bancos._verif)        db.bancos._verif = {};
  if (!db.bancos._verif[fecha]) db.bancos._verif[fecha] = {};
  VERIF_BANCOS.forEach(b => {
    const bk = b.replace(/ /g,'_');
    const eA = document.getElementById('ia-'+bk);
    if (!eA) return;
    if (!db.bancos._verif[fecha][b]) db.bancos._verif[fecha][b] = {ingreso:0, comision:0, admin:null};
    db.bancos._verif[fecha][b].admin = eA.value !== '' ? (parseFloat(eA.value)||0) : null;
  });
  logAudit('verif.guardar_admin','Ines guardó ingresos admin: '+fmtDate(fecha));
  saveDB(db);
  showToast('Totales guardados — '+fmtDate(fecha));
  const note = document.getElementById('ines-saved-note');
  if (note) { note.textContent='Guardado'; setTimeout(()=>{ if(note) note.textContent=''; },3000); }
}

