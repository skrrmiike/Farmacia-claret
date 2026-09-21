function bancosDispActual(fecha){
  initBancosDB();
  var base = db.bancos[fecha] || {FARMACIA:{},DROGUERIA:{}};
  var out = {FARMACIA:{}, DROGUERIA:{}};
  ['FARMACIA','DROGUERIA'].forEach(function(ent){ BANCOS_LIST.forEach(function(b){ out[ent][b] = Number((base[ent]||{})[b])||0; }); });
  _movsDesdeBase(fecha).forEach(function(m){
    var bs = Number(m.monto_bs)||0;
    if (m.tipo==='salida'){ if(out[m.entidad]&&out[m.entidad][m.banco]!=null) out[m.entidad][m.banco]-=bs; }
    else if (m.tipo==='entrada'){ if(out[m.entidad]&&out[m.entidad][m.banco]!=null) out[m.entidad][m.banco]+=bs; }
    else if (m.tipo==='traspaso'){ if(out[m.entidad]&&out[m.entidad][m.banco]!=null) out[m.entidad][m.banco]-=bs; if(out[m.entidad_dest]&&out[m.entidad_dest][m.banco_dest]!=null) out[m.entidad_dest][m.banco_dest]+=bs; }
  });
  return out;
}
function registrarMovBanco(mov){
  initBancosDB(); var f=HOY();
  if(!db.bancos[f]) getBancosHoy();
  if(!Array.isArray(db.bancos[f]._mov)) db.bancos[f]._mov=[];
  db.bancos[f]._mov.push(mov);
  if(typeof logAudit==='function') logAudit('banco.mov', (mov.tipo||'')+' · '+(mov.entidad||'')+' '+(mov.banco||'')+' · Bs '+fmt(mov.monto_bs||0,0)+(mov.concepto?' · '+mov.concepto:''));
  saveDB(db);
}
function _bancosActualHTML(fecha){
  var tasa=getTasa();
  var base = db.bancos[fecha] || {FARMACIA:{},DROGUERIA:{}};
  function _ini(ent,b){ var el=document.getElementById('banco-'+ent+'-'+b); if(el) return _numBs(el.value)||0; return Number((base[ent]||{})[b])||0; }
  var act={FARMACIA:{},DROGUERIA:{}};
  ['FARMACIA','DROGUERIA'].forEach(function(ent){ BANCOS_LIST.forEach(function(b){ act[ent][b]=_ini(ent,b); }); });
  (_movsDesdeBase(fecha)||[]).forEach(function(m){ var bs=Number(m.monto_bs)||0;
    if(m.tipo==='salida'){ if(act[m.entidad]&&act[m.entidad][m.banco]!=null) act[m.entidad][m.banco]-=bs; }
    else if(m.tipo==='entrada'){ if(act[m.entidad]&&act[m.entidad][m.banco]!=null) act[m.entidad][m.banco]+=bs; }
    else if(m.tipo==='traspaso'){ if(act[m.entidad]&&act[m.entidad][m.banco]!=null) act[m.entidad][m.banco]-=bs; if(act[m.entidad_dest]&&act[m.entidad_dest][m.banco_dest]!=null) act[m.entidad_dest][m.banco_dest]+=bs; }
  });
  var rows='';
  BANCOS_LIST.forEach(function(b){ var fc=act.FARMACIA[b]||0, dr=act.DROGUERIA[b]||0, t=fc+dr;
    rows+='<tr><td style="font-weight:600;font-size:12px;padding:4px 8px;color:var(--text2)">'+b+'</td>'
      +'<td class="mono r" style="padding:4px 8px;font-size:12px">'+_fmtBs(fc)+'</td>'
      +'<td class="mono r" style="padding:4px 8px;font-size:12px">'+_fmtBs(dr)+'</td>'
      +'<td class="mono r" style="padding:4px 8px;font-size:12px;font-weight:700">'+_fmtBs(t)+'</td></tr>';
  });
  var tF=BANCOS_LIST.reduce(function(a,b){return a+(act.FARMACIA[b]||0);},0), tD=BANCOS_LIST.reduce(function(a,b){return a+(act.DROGUERIA[b]||0);},0), tG=tF+tD;
  return '<div class="tbox" style="margin-top:16px"><div class="tbox-hd"><span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Disponible actual (inicial menos movimientos)</span>'+_bancosStampHTML(fecha)+'</div>'
    +'<div class="twrap"><table><thead><tr><th>Banco</th><th class="r">Farmacia</th><th class="r">Droguería</th><th class="r">Total</th></tr></thead><tbody>'+rows
    +'<tr style="font-weight:700;border-top:2px solid var(--border);background:var(--surface2)"><td style="padding:8px">TOTAL</td><td class="mono r" style="padding:8px">'+_fmtBs(tF)+'</td><td class="mono r" style="padding:8px">'+_fmtBs(tD)+'</td><td class="mono r" style="padding:8px;color:var(--accent)">'+_fmtBs(tG)+' Bs'+(tasa?' · $'+_fmtBs(tG/tasa):'')+'</td></tr>'
    +'</tbody></table></div></div>';
}
function _bancosMovsHTML(fecha){
  var movs=bancosMovs(fecha);
  var list;
  if(!movs.length) list='<div class="empty-state" style="padding:16px"><p>Sin movimientos registrados hoy</p></div>';
  else {
    list='<div class="twrap"><table><thead><tr><th>Hora</th><th>Tipo</th><th>Banco</th><th class="r">Monto</th><th>Concepto</th><th></th></tr></thead><tbody>'
     + movs.slice().reverse().map(function(m){
        var hora=(m.ts||'').slice(11,16);
        var tipoTxt=m.tipo==='salida'?'<span style="color:var(--red)">Salida</span>':m.tipo==='entrada'?'<span style="color:var(--green)">Entrada</span>':'<span style="color:var(--accent)">Traspaso</span>';
        var bancoTxt=m.tipo==='traspaso'?(m.entidad+' '+m.banco+' → '+m.entidad_dest+' '+m.banco_dest):(m.entidad+' '+m.banco);
        var signo=m.tipo==='entrada'?'+':m.tipo==='salida'?'−':'';
        return '<tr><td style="font-size:11px;white-space:nowrap">'+hora+'</td><td style="font-size:11px">'+tipoTxt+'</td><td style="font-size:11px">'+esc(bancoTxt)+'</td>'
          +'<td class="mono r" style="font-size:12px;font-weight:600">'+signo+fmt(m.monto_bs||0,0)+' Bs</td>'
          +'<td style="font-size:11px;color:var(--muted)">'+esc(m.concepto||'')+(m.ref?' · '+esc(m.ref):'')+'</td>'
          +'<td style="text-align:center"><button class="write-only" onclick="eliminarMovBanco(\''+m.id+'\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px" title="Eliminar">×</button></td></tr>';
      }).join('')
     + '</tbody></table></div>';
  }
  return '<div class="tbox" style="margin-top:16px"><div class="tbox-hd"><span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Movimientos de hoy</span><div class="spacer"></div><button class="btn btn-accent btn-sm write-only" onclick="abrirMovBanco()">+ Registrar movimiento</button></div>'+list+'</div>';
}
function _fillBancoSelect(id){ var el=document.getElementById(id); if(!el) return; el.innerHTML=BANCOS_LIST.map(function(b){return '<option value="'+b+'">'+b+'</option>';}).join(''); }
function abrirMovBanco(){
  document.getElementById('mov-tipo').value='salida';
  document.getElementById('mov-entidad').value='FARMACIA';
  document.getElementById('mov-entidad-dest').value='DROGUERIA';
  _fillBancoSelect('mov-banco'); _fillBancoSelect('mov-banco-dest');
  document.getElementById('mov-moneda').value='BS';
  document.getElementById('mov-monto').value='';
  document.getElementById('mov-concepto').value='';
  document.getElementById('mov-ref').value='';
  document.getElementById('mov-conv').textContent='';
  movBancoTipoChange();
  openOverlay('ov-movbanco');
}
function movBancoTipoChange(){
  var t=document.getElementById('mov-tipo').value;
  document.getElementById('mov-dest').style.display = (t==='traspaso')?'block':'none';
  document.getElementById('mov-lbl-origen').textContent = (t==='entrada')?'Banco que recibe':'Banco';
}
function movBancoCalc(){
  var tasa=getTasa(); var mon=document.getElementById('mov-moneda').value; var v=parseFloat(document.getElementById('mov-monto').value)||0;
  var h=document.getElementById('mov-conv');
  if(v>0&&tasa){ h.textContent = (mon==='USD') ? ('≈ '+fmt(v*tasa,0)+' Bs') : ('≈ $'+fmt(v/tasa)); } else h.textContent='';
}
function guardarMovBanco(){
  var tipo=document.getElementById('mov-tipo').value;
  var entidad=document.getElementById('mov-entidad').value;
  var banco=document.getElementById('mov-banco').value;
  var mon=document.getElementById('mov-moneda').value;
  var v=parseFloat(document.getElementById('mov-monto').value);
  var tasa=getTasa();
  var concepto=document.getElementById('mov-concepto').value.trim();
  var ref=document.getElementById('mov-ref').value.trim();
  if(!(v>0)){ showToast('Ingresa un monto válido'); return; }
  if(mon==='USD'&&!tasa){ showToast('Configura la tasa del día para usar USD'); return; }
  var monto_bs = mon==='USD'? Math.round(v*tasa*100)/100 : Math.round(v*100)/100;
  var monto_usd = tasa? Math.round((monto_bs/tasa)*100)/100 : (mon==='USD'?v:null);
  var mov={ id:uid(), ts:new Date().toISOString(), tipo:tipo, entidad:entidad, banco:banco, monto_bs:monto_bs, monto_usd:monto_usd, tasa:tasa||null, concepto:concepto, ref:ref, origen:'manual' };
  if(tipo==='traspaso'){ mov.entidad_dest=document.getElementById('mov-entidad-dest').value; mov.banco_dest=document.getElementById('mov-banco-dest').value; if(mov.entidad_dest===entidad&&mov.banco_dest===banco){ showToast('El banco destino debe ser distinto al origen'); return; } }
  registrarMovBanco(mov);
  closeOverlay('ov-movbanco');
  renderBancos();
  showToast('Movimiento registrado');
}
function eliminarMovBanco(id){
  var f=HOY(); if(!db.bancos[f]||!Array.isArray(db.bancos[f]._mov)) return;
  if(!confirm('¿Eliminar este movimiento? El disponible se recalcula.')) return;
  db.bancos[f]._mov=db.bancos[f]._mov.filter(function(m){return m.id!==id;});
  if(typeof logAudit==='function') logAudit('banco.mov_elim','Movimiento bancario eliminado');
  saveDB(db); renderBancos();
}

var _bancosColapsado=false;
function toggleBancosEntry(){
  _bancosColapsado=!_bancosColapsado;
  var form=document.getElementById('bancos-entry-form');
  var btn=document.getElementById('bancos-entry-toggle');
  if(form) form.style.display=_bancosColapsado?'none':'';
  if(btn) btn.textContent=_bancosColapsado?'Mostrar ingreso':'Ocultar ingreso';
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
  const _act = bancosDispActual(hoy);
  const totFA = BANCOS_LIST.reduce((a,b)=>a+(_act.FARMACIA[b]||0),0);
  const totDA = BANCOS_LIST.reduce((a,b)=>a+(_act.DROGUERIA[b]||0),0);
  const totGA = totFA + totDA;

  // Entry form — with live row totals
  const formRows = BANCOS_LIST.map(b => {
    const vF = data.FARMACIA[b]; const vD = data.DROGUERIA[b];
    const rowTot = (vF||0)+(vD||0);
    const hasVal = (vF!=null||vD!=null);
    return '<tr>'+
      '<td style="font-weight:600;font-size:12px;padding:4px 8px;color:var(--text2)">'+b+'</td>'+
      '<td style="padding:4px 6px"><input type="text" inputmode="decimal" id="banco-FARMACIA-'+b+'" class="form-input" style="font-family:var(--mono);font-size:12px;padding:5px 8px;width:100%" placeholder="0.00" value="'+(vF!=null?_fmtBs(vF):'')+'" oninput="calcBancosLive()" onblur="_fmtBancoInput(this)"></td>'+
      '<td style="padding:4px 6px"><input type="text" inputmode="decimal" id="banco-DROGUERIA-'+b+'" class="form-input" style="font-family:var(--mono);font-size:12px;padding:5px 8px;width:100%" placeholder="0.00" value="'+(vD!=null?_fmtBs(vD):'')+'" oninput="calcBancosLive()" onblur="_fmtBancoInput(this)"></td>'+
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
    '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg> Disponibilidad de Hoy — '+fmtDate(hoy)+'</span><div class="spacer"></div><button id="bancos-entry-toggle" class="btn btn-ghost btn-sm write-only" onclick="toggleBancosEntry()">'+(_bancosColapsado?'Mostrar ingreso':'Ocultar ingreso')+'</button></div>'+
    '<div style="padding:12px 16px">'+
    // Summary cards
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'+
    '<div class="scard blue"><div class="scard-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg></div><div class="scard-label">Farmacia disponible</div><div class="scard-val" id="sum-totF">'+fmt(totFA,0)+' Bs</div></div>'+
    '<div class="scard purple"><div class="scard-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 11v4"/><path d="M14 13h-4"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg></div><div class="scard-label">Droguería disponible</div><div class="scard-val" id="sum-totD">'+fmt(totDA,0)+' Bs</div></div>'+
    '<div class="scard accent"><div class="scard-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></div><div class="scard-label">Total disponible</div><div class="scard-val" id="sum-totG">'+fmt(totGA,0)+' Bs</div></div>'+
    '<div class="scard green"><div class="scard-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="scard-label">Total USD</div><div class="scard-val" id="sum-totUSD">'+(tasa?'$'+fmt(totGA/tasa):'—')+'</div><div class="scard-sub">'+(tasa?'a Bs '+fmt(tasa)+'/USD':'Configura la tasa')+'</div></div>'+
    '</div>'+
    '<div id="bancos-entry-form"'+(_bancosColapsado?' style="display:none"':'')+'>'+
    '<div class="twrap"><table>'+
    '<thead><tr><th>Banco</th><th class="r">Farmacia (Bs)</th><th class="r">Droguería (Bs)</th><th class="r">Total</th></tr></thead>'+
    '<tbody>'+formRows+summaryRow+'</tbody></table></div>'+
    '<div style="padding-top:12px;display:flex;justify-content:flex-end;gap:8px">'+
    '<button class="btn btn-ghost btn-sm write-only" onclick="arrastrarCierre()" title="Trae lo que quedó disponible al cierre del último día como apertura de hoy"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Arrastrar saldo de cierre</button>'+
    '<button class="btn btn-ghost btn-sm" onclick="limpiarBancosHoy()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg> Limpiar celdas</button>'+
    '<button class="btn btn-accent" onclick="guardarBancos()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Guardar Disponibilidad</button>'+
    '</div></div></div></div>' + '<div id="bancos-actual-box">' + _bancosActualHTML(hoy) + '</div>' + _bancosMovsHTML(hoy);
}
function renderBancosConcil(){ if(typeof renderVerifBancaria==='function') renderVerifBancaria(); }


function eliminarPrestamo(loanId) {
  if (!confirm('¿Eliminar el préstamo "'+loanId+'"?\nEsta acción es permanente y no se puede deshacer.')) return;
  var _del=db.prestamos.find(function(l){return l.id===loanId;}); if(_del){ _del.activo=false; _del.eliminado=true; _del._v=Date.now(); }
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

// ── Sumar fin de semana (Vie+Sáb+Dom) hacia el Ingreso del lunes ─────────────
var _fdsOpen = false;
function _fdsV(id){ var e=document.getElementById(id); return e?e.value:''; }
function _fdsToggle(){ _fdsOpen=!_fdsOpen; renderVerifBancaria(); }
function _fdsRowLive(bk){
  var t=(parseFloat(_fdsV('fds-vie-'+bk))||0)+(parseFloat(_fdsV('fds-sab-'+bk))||0)+(parseFloat(_fdsV('fds-dom-'+bk))||0);
  var e=document.getElementById('fds-tot-'+bk); if(e) e.textContent=fmt(t,2);
  var g=document.getElementById('fds-grand'); if(g){ var tot=0; VERIF_BANCOS.forEach(function(b){ var k=b.replace(/ /g,'_'); tot+=(parseFloat(_fdsV('fds-vie-'+k))||0)+(parseFloat(_fdsV('fds-sab-'+k))||0)+(parseFloat(_fdsV('fds-dom-'+k))||0); }); g.textContent=fmt(tot,2); }
}
function _fdsPanelHTML(){
  var hoy=HOY();
  var saved=(db.bancos._verif&&db.bancos._verif[hoy])||{};
  var head='<div class="tbox" style="margin-bottom:14px"><div class="tbox-hd" style="cursor:pointer" onclick="_fdsToggle()">'+
    '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg> Sumar fin de semana (Vie + Sáb + Dom)</span>'+
    '<div class="spacer"></div><span style="font-size:11px;color:var(--muted);margin-right:8px">Para el lunes: junta los 3 días</span><span style="font-size:18px;font-weight:700;color:var(--accent)">'+(_fdsOpen?'−':'+')+'</span></div>';
  if(!_fdsOpen) return head+'</div>';
  var grand=0;
  var rows=VERIF_BANCOS.map(function(b){ var bk=b.replace(/ /g,'_'); var f=(saved[b]&&saved[b]._fds)||{};
    var inp=function(d,v){ return '<input type="number" step="0.01" id="fds-'+d+'-'+bk+'" class="form-input" style="font-family:var(--mono);font-size:12px;padding:4px 6px;width:100%;text-align:right" value="'+(v!=null&&v!==''?v:'')+'" placeholder="0" oninput="_fdsRowLive(\''+bk+'\')">'; };
    var tot=(parseFloat(f.vie)||0)+(parseFloat(f.sab)||0)+(parseFloat(f.dom)||0); grand+=tot;
    return '<tr><td style="font-weight:600;font-size:12px;padding:4px 8px;white-space:nowrap;color:var(--text2)">'+b+'</td>'+
      '<td style="padding:3px 5px">'+inp('vie',f.vie)+'</td>'+
      '<td style="padding:3px 5px">'+inp('sab',f.sab)+'</td>'+
      '<td style="padding:3px 5px">'+inp('dom',f.dom)+'</td>'+
      '<td class="mono r" id="fds-tot-'+bk+'" style="font-weight:700;font-size:12px;padding:4px 8px;white-space:nowrap">'+fmt(tot,2)+'</td></tr>';
  }).join('');
  return head+
    '<div style="font-size:11px;color:var(--muted);padding:8px 12px 4px">Ingresa el ingreso de cada terminal por día. Al cargar, se suma Vie+Sáb+Dom y se coloca como el <strong>Ingreso del '+fmtDate(hoy)+'</strong> en la conciliación de abajo. Las comisiones se ponen aparte.</div>'+
    '<div class="twrap"><table><thead><tr><th style="min-width:130px">Banco / Terminal</th><th class="r">Viernes</th><th class="r">Sábado</th><th class="r">Domingo</th><th class="r">Total</th></tr></thead>'+
    '<tbody>'+rows+'</tbody>'+
    '<tfoot><tr style="font-weight:700;background:var(--surface2);border-top:2px solid var(--border)"><td style="padding:7px 8px;font-size:12px">TOTAL FIN DE SEMANA</td><td colspan="3"></td><td class="mono r" id="fds-grand" style="padding:7px 8px;font-size:12px">'+fmt(grand,2)+'</td></tr></tfoot>'+
    '</table></div>'+
    '<div style="padding:10px 12px;display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-accent btn-sm" onclick="_fdsCargar()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>Sumar y cargar al Ingreso</button></div>'+
    '</div>';
}
function _fdsCargar(){
  var hoy=HOY();
  if(!db.bancos._verif) db.bancos._verif={};
  if(!db.bancos._verif[hoy]) db.bancos._verif[hoy]={};
  var n=0;
  VERIF_BANCOS.forEach(function(b){ var bk=b.replace(/ /g,'_');
    var vie=parseFloat(_fdsV('fds-vie-'+bk))||0, sab=parseFloat(_fdsV('fds-sab-'+bk))||0, dom=parseFloat(_fdsV('fds-dom-'+bk))||0;
    var tot=vie+sab+dom;
    var ing=document.getElementById('vi-'+bk); if(ing){ ing.value = tot? tot : ''; if(tot) n++; }
    if(!db.bancos._verif[hoy][b]) db.bancos._verif[hoy][b]={ingreso:0,comision:0,admin:null};
    if(vie||sab||dom) db.bancos._verif[hoy][b]._fds={vie:vie,sab:sab,dom:dom};
  });
  if(typeof calcVerifLive==='function') calcVerifLive();
  showToast('Sumado el fin de semana en '+n+' terminales. Revisa y dale "Guardar verificación".');
}
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
    _fdsPanelHTML()+
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

// Guardado que mezcla contra el servidor: Mayra escribe ingreso/comisión, Inés escribe admin,
// y ninguna pisa el campo de la otra aunque guarden con copias desfasadas.
async function _verifPersist(fecha, owner){
  try{
    const { data } = await supabaseClient.from('app_sections').select('data').eq('section_name','bancos').maybeSingle();
    let remote = (data && data.data && typeof data.data==='object' && !Array.isArray(data.data)) ? data.data : {};
    const remoteV = (remote._verif && remote._verif[fecha]) || {};
    const localV  = (db.bancos._verif && db.bancos._verif[fecha]) || {};
    const merged = {};
    VERIF_BANCOS.forEach(b => {
      const l = localV[b] || {}, r = remoteV[b] || {};
      const ing = owner==='mayra' ? (l.ingreso!=null?l.ingreso:(r.ingreso||0)) : (r.ingreso!=null?r.ingreso:(l.ingreso||0));
      const com = owner==='mayra' ? (l.comision!=null?l.comision:(r.comision||0)) : (r.comision!=null?r.comision:(l.comision||0));
      const adm = owner==='ines'  ? (l.admin!==undefined?l.admin:(r.admin!==undefined?r.admin:null)) : (r.admin!==undefined?r.admin:(l.admin!==undefined?l.admin:null));
      const fds = owner==='mayra' ? (l._fds||r._fds) : (r._fds||l._fds);
      merged[b] = { ingreso: ing, comision: com, admin: adm };
      if(fds) merged[b]._fds = fds;
    });
    if(!remote._verif) remote._verif={};
    remote._verif[fecha] = merged;
    // Archivar snapshot del día (preservando el historial del servidor)
    let hist = Array.isArray(remote._verif_hist) ? remote._verif_hist.slice()
             : (Array.isArray(db.bancos._verif_hist) ? db.bancos._verif_hist.slice() : []);
    let tI=0,tC=0,tT=0,tA=0,tD=0;
    VERIF_BANCOS.forEach(b => { const s=merged[b]||{}; const i=parseFloat(s.ingreso)||0, co=parseFloat(s.comision)||0; const a=(s.admin!=null)?parseFloat(s.admin)||0:null; const t=i-co; tI+=i;tC+=co;tT+=t; if(a!=null){tA+=a;tD+=t-a;} else tD+=t; });
    const entrada={fecha:fecha, confirmada_en:new Date().toISOString(), confirmada_por:(typeof getUserNombre==='function'?getUserNombre(currentUser):currentUser), data:JSON.parse(JSON.stringify(merged)), totales:{ingreso:tI,comision:tC,total:tT,admin:tA,dif:tD}};
    const hi=hist.findIndex(h=>h.fecha===fecha); if(hi>=0) hist[hi]=entrada; else hist.push(entrada);
    remote._verif_hist = hist;
    // Conservar saldos de días locales + verif mezclado
    let newB = JSON.parse(JSON.stringify(remote));
    Object.keys(db.bancos||{}).forEach(function(fd){ if(/^\d{4}-\d{2}-\d{2}$/.test(fd) && !(fd in newB)){ newB[fd]=db.bancos[fd]; } });
    newB._verif = remote._verif; newB._verif_hist = remote._verif_hist;
    db.bancos = newB;
    await supabaseClient.from('app_sections').upsert([{ section_name:'bancos', data: db.bancos, updated_at:new Date().toISOString() }], { onConflict:'section_name' });
    if(typeof _persistLocal==='function') _persistLocal(db);
    try{ if(activeTab==='bancos-concil' && typeof renderVerifBancaria==='function') renderVerifBancaria(); if(activeTab==='verif-ines' && typeof renderVerifInes==='function') renderVerifInes(); }catch(e){}
    return true;
  }catch(e){ try{ saveDB(db); }catch(_e){} return false; }
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
      admin: prev.admin !== undefined ? prev.admin : null,  // admin solo lo edita Ines
      _fds: prev._fds  // desglose fin de semana (si lo hubo)
    };
  });
  logAudit('verif.guardar','Fecha: '+hoy);
  _verifPersist(hoy,'mayra').then(function(ok){ showToast(ok?'Verificación guardada y archivada':'Guardado local — revisa la conexión'); });
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
  _verifPersist(fecha,'ines').then(function(ok){
    showToast(ok ? ('Totales guardados — '+fmtDate(fecha)) : 'Guardado local — revisa la conexión');
    const note = document.getElementById('ines-saved-note');
    if (note) { note.textContent='Guardado'; setTimeout(()=>{ if(note) note.textContent=''; },3000); }
  });
}


// ── Farmacia Claret · Panel & Historial ─────────────────────────────────────

function renderBadges() {
  // Invoice vencidas badges
  ['farmacia','drogueria'].forEach(emp => {
    const n = (db.facturas||[]).filter(f=>f.empresa===emp && computeEstado(f)==='VENCIDA').length;
    const emp2 = emp==='farmacia'?'fact-farmacia':'fact-drogueria';
    const el = document.getElementById('badge-'+emp2);
    if (el){ el.textContent=n; el.classList.toggle('show',n>0); }
  });
  // Loan urgent badges
  ['FARMACIA','DROGUERIA'].forEach(ent => {
    const tab = ent==='FARMACIA'?'prestamos-fcia':'prestamos-drog';
    const n = (db.prestamos||[]).filter(l=>l.activo && l.entidad===ent && ['VENCIDO','HOY'].includes(estadoPrestamo(l))).length;
    const el = document.getElementById('badge-'+tab);
    if (el){ el.textContent=n; el.classList.toggle('show',n>0); }
  });
  var _nfF=(db.facturas||[]).filter(function(f){return computeEstado(f)==='VENCIDA';}).length; var _eF=document.getElementById('badge-facturas'); if(_eF){_eF.textContent=_nfF;_eF.classList.toggle('show',_nfF>0);}
  var _nfP=(db.prestamos||[]).filter(function(l){return l.activo && ['VENCIDO','HOY'].indexOf(estadoPrestamo(l))>=0;}).length; var _eP=document.getElementById('badge-prestamos'); if(_eP){_eP.textContent=_nfP;_eP.classList.toggle('show',_nfP>0);}
  updateBnBadges();
}

function renderTasaHeader() {
  const t = getTasa();
  const val = t ? Number(t).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  const el = document.getElementById('tasa-valor');
  if (el) el.textContent = val;
  const elm = document.getElementById('tasa-valor-mobile');
  if (elm) elm.textContent = t ? val+' Bs/$' : '—';
  // Also update the tasa display label if present
  const texto = document.getElementById('tasa-display-text');
  if (texto && t) {
    texto.textContent = `Tasa: ${Number(t).toFixed(2)} Bs/$ (${fmtDate(db.settings.tasa_fecha||HOY())})`;
  }
}

let _iaSaludo=false;
function abrirAsistente(){
  openOverlay('ov-asistente'); iaUnlockVoz();
  if(!_iaSaludo){ iaAgregar('bot', iaSaludoProactivo()); _iaSaludo=true; }
  setTimeout(function(){ var e=document.getElementById('ia-input'); if(e) e.focus(); },150);
}
function cerrarAsistente(){ try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(e){} closeOverlay('ov-asistente'); }
function iaAgregar(tipo, texto){
  var cont=document.getElementById('ia-mensajes'); if(!cont) return;
  var d=document.createElement('div'); d.className='ia-msg '+tipo;
  if (tipo==='bot'){
    var span=document.createElement('span'); span.textContent=texto; d.appendChild(span);
    var b=document.createElement('button');
    b.title='Escuchar'; b.setAttribute('aria-label','Escuchar');
    b.style.cssText='background:none;border:none;cursor:pointer;color:var(--accent);margin-left:8px;vertical-align:middle;padding:2px';
    b.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>';
    b.onclick=function(){ iaHablar(texto); };
    d.appendChild(b);
  } else { d.textContent=texto; }
  cont.appendChild(d); cont.scrollTop=cont.scrollHeight;
}
var _iaManosLibres=false;
