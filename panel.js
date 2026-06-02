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
  if(!_iaSaludo){ iaAgregar('bot','Hola. Soy tu asistente. Pregúntame por voz o texto, por ejemplo: "¿qué pago esta semana?", "¿cuánto debo?", "¿cuál es la tasa?", "facturas vencidas" o "¿cuánto hay disponible?".'); _iaSaludo=true; }
  setTimeout(function(){ var e=document.getElementById('ia-input'); if(e) e.focus(); },150);
}
function cerrarAsistente(){ try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(e){} closeOverlay('ov-asistente'); }
function iaAgregar(tipo, texto){
  var cont=document.getElementById('ia-mensajes'); if(!cont) return;
  var d=document.createElement('div'); d.className='ia-msg '+tipo; d.textContent=texto;
  cont.appendChild(d); cont.scrollTop=cont.scrollHeight;
}
function iaEnviar(){
  var inp=document.getElementById('ia-input'); if(!inp) return;
  var q=(inp.value||'').trim(); if(!q) return;
  iaAgregar('user',q); inp.value='';
  var r=responderAsistente(q);
  iaAgregar('bot',r); iaHablar(r);
}
var _iaVoices=[];
function _iaLoadVoices(){ try{ _iaVoices=window.speechSynthesis.getVoices()||[]; }catch(e){} }
try{ if(window.speechSynthesis){ _iaLoadVoices(); window.speechSynthesis.onvoiceschanged=_iaLoadVoices; } }catch(e){}
var _iaUnlocked=false;
function iaUnlockVoz(){
  try{
    if(_iaUnlocked||!window.speechSynthesis) return;
    var u=new SpeechSynthesisUtterance(' '); u.volume=0; window.speechSynthesis.speak(u);
    _iaUnlocked=true;
  }catch(e){}
}
function iaHablar(t){
  try{
    if(!window.speechSynthesis) return;
    if(!_iaVoices.length) _iaLoadVoices();
    window.speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(t);
    u.lang='es-ES'; u.rate=1; u.pitch=1; u.volume=1;
    for(var i=0;i<_iaVoices.length;i++){ if(/es/i.test(_iaVoices[i].lang)){ u.voice=_iaVoices[i]; break; } }
    setTimeout(function(){ try{ window.speechSynthesis.speak(u); }catch(e){} }, 80);
  }catch(e){}
}
var _iaRec=null;
function iaVoz(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ iaAgregar('bot','Tu navegador no permite dictado por voz aquí. Puedes escribir la pregunta.'); return; }
  try{
    _iaRec=new SR(); _iaRec.lang='es-ES'; _iaRec.interimResults=false; _iaRec.maxAlternatives=1;
    var mic=document.getElementById('ia-mic'); if(mic) mic.style.color='var(--red)';
    _iaRec.onresult=function(e){ var t=e.results[0][0].transcript; var inp=document.getElementById('ia-input'); if(inp){ inp.value=t; iaEnviar(); } };
    _iaRec.onend=function(){ var m=document.getElementById('ia-mic'); if(m) m.style.color=''; };
    _iaRec.onerror=function(){ var m=document.getElementById('ia-mic'); if(m) m.style.color=''; iaAgregar('bot','No pude escuchar bien. Intenta de nuevo o escribe tu pregunta.'); };
    _iaRec.start();
  }catch(err){ iaAgregar('bot','No se pudo iniciar el micrófono en este dispositivo.'); }
}
function responderAsistente(q){
  try{
    var s=(q||'').toLowerCase();
    var has=function(){ for(var i=0;i<arguments.length;i++){ if(s.indexOf(arguments[i])>=0) return true; } return false; };
    var tasa=getTasa();
    var facturas=db.facturas||[];
    var factVenc=facturas.filter(function(f){return computeEstado(f)==='VENCIDA';});
    var factProx=facturas.filter(function(f){return computeEstado(f)==='POR_VENCER';});
    var prest=(db.prestamos||[]).filter(function(p){return p.activo;});
    var cuotaMes=prest.reduce(function(a,p){return a+(p.cuota_usd||0);},0);
    var deuda=prest.reduce(function(a,p){return a+(p.saldo_usd||0);},0);
    var BANCOS=['BANESCO','BDV','BNC','CARIBE','MERCANTIL','PROVINCIAL','TESORO'];
    var bh=(db.bancos&&db.bancos[HOY()])||{};
    var dispBs=BANCOS.reduce(function(a,b){return a+(((bh.FARMACIA&&bh.FARMACIA[b])||0)+((bh.DROGUERIA&&bh.DROGUERIA[b])||0));},0);
    var usd=function(v){ return tasa? (' (~$'+fmt(v/tasa)+')') : ''; };

    if(has('hola','buenas','hey','saludos')) return 'Hola. Pregúntame por la tasa, qué pagar esta semana, las facturas vencidas, la deuda o lo disponible en bancos.';
    if(has('ayuda','que puedes','qué puedes','puedes hacer','para que sirves','para qué sirves')) return 'Puedo decirte: la tasa del día, qué se debe pagar esta semana, las facturas vencidas, el total de deuda y la cuota mensual, y cuánto hay disponible en bancos. Pregúntame con tus palabras.';
    if(has('tasa','cambio','dólar','dolar','bcv')) return tasa? ('La tasa de hoy es '+fmt(tasa,2)+' bolívares por dólar.') : 'Todavía no se ha cargado la tasa de hoy.';
    if(has('vencida','vencidas','atrasad','atraso')){
      if(!factVenc.length) return 'No hay facturas vencidas. Bien.';
      var vBs=factVenc.reduce(function(a,f){return a+(bsActual(f)||0);},0);
      return 'Hay '+factVenc.length+' facturas vencidas, por unos '+fmt(vBs,0)+' Bs'+usd(vBs)+'.';
    }
    if(has('esta semana','pagar','urgente','vence','por pagar','toca pagar')){
      var saleF=factProx.reduce(function(a,f){return a+(bsActual(f)||0);},0);
      var loanSem=prest.filter(function(p){return ['HOY','PROXIMO'].indexOf(estadoPrestamo(p))>=0;});
      var saleL=loanSem.reduce(function(a,p){return a+(tasa?(p.cuota_usd||0)*tasa:0);},0);
      var tot=saleF+saleL;
      var msg='Esta semana hay '+factProx.length+' facturas por vencer y '+loanSem.length+' cuotas de préstamo, por unos '+fmt(tot,0)+' Bs'+usd(tot)+'.';
      if(dispBs>0){ msg+=' Disponible en bancos hoy: '+fmt(dispBs,0)+' Bs.'; msg+= dispBs>=tot? ' Alcanza para cubrirlo.' : (' Faltarían '+fmt(tot-dispBs,0)+' Bs.'); }
      return msg;
    }
    if(has('deuda','debo','préstamo','prestamo','cuánto debo','cuota')){
      return 'La deuda total de préstamos es $'+fmt(deuda)+', con una cuota mensual de $'+fmt(cuotaMes)+(tasa?(' (unos '+fmt(cuotaMes*tasa,0)+' Bs al mes)'):'')+'.';
    }
    if(has('disponible','banco','caja','tengo','efectivo','cuánto hay','cuanto hay')){
      return dispBs>0? ('Hoy hay '+fmt(dispBs,0)+' Bs disponibles en bancos'+usd(dispBs)+'.') : 'No se ha registrado la disponibilidad de hoy todavía.';
    }
    if(has('resumen','cómo voy','como voy','situación','situacion','estado general')){
      return 'Resumen de hoy: '+factVenc.length+' facturas vencidas, '+factProx.length+' por vencer. Deuda de préstamos $'+fmt(deuda)+' (cuota $'+fmt(cuotaMes)+'/mes). Disponible en bancos: '+(dispBs>0?fmt(dispBs,0)+' Bs':'sin registro')+'. Tasa: '+(tasa?fmt(tasa,2)+' Bs/$':'sin cargar')+'.';
    }
    return 'Por ahora puedo responder sobre: la tasa, qué pagar esta semana, facturas vencidas, la deuda y lo disponible en bancos. Pronto entenderé preguntas más libres. ¿Quieres probar alguna de esas?';
  }catch(e){ return 'Tuve un problema leyendo los datos. Intenta de nuevo.'; }
}
function panelPagar(el){
  const t = el.dataset.tipo, id = el.dataset.id;
  if (t==='prestamo') { if (typeof abrirPago==='function') abrirPago(id); }
  else { if (typeof abrirAbono==='function') abrirAbono(id); }
}
function renderPanel() {
  const tasa = getTasa();
  const hoy  = HOY();

  // ── Loans ──
  const activos    = (db.prestamos||[]).filter(l=>l.activo);
  const tCuota     = activos.reduce((a,l)=>a+(l.cuota_usd||0),0);
  const tSaldo     = activos.reduce((a,l)=>a+(l.saldo_usd||0),0);
  const loansVenc  = activos.filter(l=>estadoPrestamo(l)==='VENCIDO');
  const loansProx  = activos.filter(l=>['HOY','PROXIMO'].includes(estadoPrestamo(l)));
  const ocultarCuotas = (currentRole === 'grismar');  // grismar no ve cuotas de préstamos

  // ── Invoices ──
  const factActivas  = db.facturas.filter(f=>computeEstado(f)!=='PAGADA');
  const factVenc     = factActivas.filter(f=>computeEstado(f)==='VENCIDA');
  const factProx     = factActivas.filter(f=>computeEstado(f)==='POR_VENCER');
  const factPendUsd  = factActivas.reduce((a,f)=>{
    const u = f.monto_usd != null ? f.monto_usd : 0;
    const ab= f.abonos_usd || 0;
    return a + Math.max(0, u - ab);
  }, 0);

  // ── Banks today ──
  const bancosHoy  = db.bancos[hoy] || {};
  const totF  = BANCOS_LIST.reduce((a,b)=>a+(bancosHoy['FARMACIA']&&bancosHoy['FARMACIA'][b]||0),0);
  const totD  = BANCOS_LIST.reduce((a,b)=>a+(bancosHoy['DROGUERIA']&&bancosHoy['DROGUERIA'][b]||0),0);
  const totBs = totF + totD;

  // ── KPI cards ──
  document.getElementById('panel-cards').innerHTML =
    '<div class="summary-grid '+(ocultarCuotas?'sg-3':'sg-4')+'">' +
    '<div class="scard blue"><div class="scard-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg></div><div class="scard-label">Disponible Hoy</div>' +
    '<div class="scard-val">'+(totBs>0?fmt(totBs,0)+' Bs':'—')+'</div>' +
    '<div class="scard-sub">'+(totBs>0?'Fcia '+fmt(totF,0)+' · Drog '+fmt(totD,0)+(tasa?' · $'+fmt(Math.round(totBs/tasa)):''):'Sin registro de hoy')+'</div></div>' +

    (ocultarCuotas ? '' :
    '<div class="scard red"><div class="scard-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></div><div class="scard-label">Cuota Mensual Préstamos</div>' +
    '<div class="scard-val">$'+fmt(tCuota)+'</div>' +
    '<div class="scard-sub">'+(tasa?fmt(Math.round(tCuota*tasa),0)+' Bs · ':'')+activos.length+' activos</div></div>'
    ) +

    '<div class="scard purple"><div class="scard-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div><div class="scard-label">Facturas Pendientes</div>' +
    '<div class="scard-val">$'+fmt(factPendUsd)+'</div>' +
    '<div class="scard-sub">'+factActivas.length+' facturas · '+factVenc.length+' vencidas</div></div>' +

    '<div class="scard amber"><div class="scard-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div><div class="scard-label">Alertas Urgentes</div>' +
    '<div class="scard-val">'+(ocultarCuotas?factVenc.length:(loansVenc.length+factVenc.length))+'</div>' +
    '<div class="scard-sub">'+(ocultarCuotas?(factVenc.length+' facturas vencidas'):(loansVenc.length+' préstamos · '+factVenc.length+' facturas vencidas'))+'</div></div>' +
    '</div>';

  // ── Urgent payments combined ──
  let urgentRows = '';
  const urgentes = [
    ...(ocultarCuotas ? [] : loansVenc.map(l=>({tipo:'prestamo',estado:'VENCIDO',label:l.id,sub:l.banco+' · '+l.entidad,bsMonto:tasa?Math.round(l.cuota_usd*tasa):null,usd:l.cuota_usd,lid:l.id}))),
    ...(ocultarCuotas ? [] : loansProx.filter(l=>estadoPrestamo(l)==='HOY').map(l=>({tipo:'prestamo',estado:'HOY',label:l.id,sub:l.banco+' · '+l.entidad+' · '+fmtDate(l.proxima_cuota),bsMonto:tasa?Math.round(l.cuota_usd*tasa):null,usd:l.cuota_usd,lid:l.id}))),
    ...factVenc.map(f=>({tipo:'factura',estado:'VENCIDA',label:f.proveedor,sub:f.empresa+' · '+fmtDate(f.fecha_vencimiento),bsMonto:bsActual(f),usd:f.monto_usd,fid:f.id})),
    ...factProx.map(f=>({tipo:'factura',estado:'POR_VENCER',label:f.proveedor,sub:f.empresa+' · '+fmtDate(f.fecha_vencimiento),bsMonto:bsActual(f),usd:f.monto_usd,fid:f.id})),
  ];

  if (urgentes.length>0) {
    urgentRows = urgentes.map((u,i) => {
      const badge = u.tipo==='prestamo' ? estadoBadge(u.estado) : estadoBadgeFactura(u.estado);
      const cls = (u.estado==='VENCIDO'||u.estado==='VENCIDA') ? 'pay-venc' : 'pay-pronto';
      const id = u.tipo==='prestamo' ? u.lid : u.fid;
      return '<div class="pay-item '+cls+'" data-tipo="'+u.tipo+'" data-id="'+esc(id)+'" onclick="panelPagar(this)">'
        + '<div class="pay-num">'+(i+1)+'</div>'
        + '<div class="pay-main"><div class="pay-name">'+esc(u.label)+'</div><div class="pay-sub">'+esc(u.sub)+'</div>'+badge+'</div>'
        + '<div class="pay-amt"><div class="pay-bs">'+(u.bsMonto?fmt(u.bsMonto,0)+' Bs':'\u2014')+'</div><div class="pay-usd">'+(u.usd?'$'+fmt(u.usd):'')+'</div></div>'
        + '<svg class="pay-go" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
        + '</div>';
    }).join('');

    document.getElementById('panel-alerts').innerHTML =
      '<div class="tbox"><div class="tbox-hd"><span class="tbox-title">Por pagar \u2014 orden de urgencia</span>' +
      '<span class="badge b-red">'+urgentes.length+'</span></div>' +
      '<div class="pay-list">'+urgentRows+'</div></div>';
  } else {
    document.getElementById('panel-alerts').innerHTML =
      '<div class="tbox"><div class="tbox-hd"><span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg> Sin pagos urgentes</span></div>' +
      '<p style="padding:16px;color:var(--muted);font-size:13px">Todo al día. Sin vencimientos inmediatos.</p></div>';
  }

  // ── Bank + loan summary ──
  const fciaCuota = activos.filter(l=>l.entidad==='FARMACIA').reduce((a,l)=>a+(l.cuota_usd||0),0);
  const drogCuota = activos.filter(l=>l.entidad==='DROGUERIA').reduce((a,l)=>a+(l.cuota_usd||0),0);
  const fciaBs = tasa?Math.round(fciaCuota*tasa):null;
  const drogBs = tasa?Math.round(drogCuota*tasa):null;

  document.getElementById('panel-resumen').innerHTML =
    '<div class="panel-2col">' +
    '<div class="tbox"><div class="tbox-hd"><span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>Farmacia</span></div>' +
    '<div style="padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    mkStat('Disponible Hoy',totF>0?fmt(totF,0)+' Bs':'Sin registro','blue') +
    (ocultarCuotas ? mkStat('Facturas Pendientes', db.facturas.filter(f=>f.empresa==='farmacia').length+' fact.','purple') : mkStat('Cuota Préstamos','$'+fmt(fciaCuota)+(fciaBs?' · '+fmt(fciaBs,0)+' Bs':''),'red')) +
    mkStat('Facturas Vencidas',db.facturas.filter(f=>f.empresa==='farmacia'&&computeEstado(f)==='VENCIDA').length+' fact.','amber') +
    mkStat('Préstamos Activos',activos.filter(l=>l.entidad==='FARMACIA').length,'accent') +
    '</div></div>' +
    '<div class="tbox"><div class="tbox-hd"><span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><path d="M12 11v4"/><path d="M14 13h-4"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>Droguería</span></div>' +
    '<div style="padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    mkStat('Disponible Hoy',totD>0?fmt(totD,0)+' Bs':'Sin registro','blue') +
    (ocultarCuotas ? mkStat('Facturas Pendientes', db.facturas.filter(f=>f.empresa==='drogueria').length+' fact.','purple') : mkStat('Cuota Préstamos','$'+fmt(drogCuota)+(drogBs?' · '+fmt(drogBs,0)+' Bs':''),'red')) +
    mkStat('Facturas Vencidas',db.facturas.filter(f=>f.empresa==='drogueria'&&computeEstado(f)==='VENCIDA').length+' fact.','amber') +
    mkStat('Préstamos Activos',activos.filter(l=>l.entidad==='DROGUERIA').length,'accent') +
    '</div></div>' +
    '</div>';
}

function mkStat(label, val, color, icon) {
  return '<div class="scard '+color+'">'+
    (icon?'<div class="scard-icon">'+icon+'</div>':'')+
    '<div class="scard-label">'+label+'</div>'+
    '<div class="scard-val">'+val+'</div></div>';
}

function renderHistorial() {
  if (currentRole === 'grismar' && histTab === 'prestamos') histTab = 'facturas';
  const container = document.getElementById('historial-content');
  const tabHtml =
    '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">'+
    '<button class="btn '+(histTab==='prestamos'?'btn-accent':'btn-ghost')+' btn-sm grismar-hide" data-ht="prestamos" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg> Préstamos</button>'+
    '<button class="btn '+(histTab==='facturas'?'btn-accent':'btn-ghost')+' btn-sm" data-ht="facturas" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Facturas</button>'+
    '<button class="btn '+(histTab==='bancos'?'btn-accent':'btn-ghost')+' btn-sm" data-ht="bancos" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg> Disponibilidad</button>'+
    '<button class="btn '+(histTab==='verif'?'btn-accent':'btn-ghost')+' btn-sm mayra-only" data-ht="verif" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg> Verificación</button>'+
    '</div>';
  container.innerHTML = tabHtml + '<div id="historial-inner"></div>';
  if (histTab==='prestamos') renderHistorialPrestamos();
  else if (histTab==='bancos') renderHistorialBancos();
  else if (histTab==='verif') renderHistorialVerif();
  else renderHistorialFacturas();
}

function toggleVerifDetail(el) {
  const d = el.nextElementSibling;
  if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

function renderHistorialVerif() {
  const hist = (db.bancos._verif_hist || []).slice().sort((a,b)=>b.fecha>a.fecha?1:-1);
  const inner = document.getElementById('historial-inner');
  if (!hist.length) {
    inner.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg></div><p>No hay verificaciones confirmadas</p><span>Usa el botón <strong><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg> Confirmar</strong> en la tabla de Verificación Bancaria</span></div>';
    return;
  }
  const rows = hist.map((h,i) => {
    const ts = h.confirmada_en ? new Date(h.confirmada_en).toLocaleString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
    const t = h.totales || {};
    const difColor = (t.dif||0)<0?'color:var(--red)':(t.dif||0)>0?'color:var(--green)':'';
    // Detalle por terminal
    const detRows = VERIF_BANCOS.map(b => {
      const s = (h.data && h.data[b]) || {};
      const ing=parseFloat(s.ingreso)||0, com=parseFloat(s.comision)||0;
      const tot=ing-com;
      const adm=(s.admin!==null&&s.admin!==undefined)?parseFloat(s.admin):null;
      const dif=adm!==null?tot-adm:null;
      const dc=dif!==null?(dif<0?'color:var(--red)':dif>0?'color:var(--green)':''):'';
      return '<tr style="border-bottom:1px solid var(--border)">'+
        '<td style="padding:5px 10px;font-size:12px;font-weight:600;white-space:nowrap">'+b+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px">'+fmt(ing,2)+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px">'+fmt(com,2)+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px;font-weight:700">'+fmt(tot,2)+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px;color:var(--accent)">'+( adm!==null?fmt(adm,2):'—')+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px;font-weight:700;'+dc+'">'+( dif!==null?fmt(dif,2):'—')+'</td>'+
      '</tr>';
    }).join('');
    return '<div class="tbox" style="margin-bottom:14px">'+
      '<div class="tbox-hd" style="cursor:pointer" onclick="toggleVerifDetail(this)">'+ 
        '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> '+fmtDate(h.fecha)+'</span>'+
        '<span style="font-size:11px;color:var(--muted);margin-left:8px">'+ts+' · '+esc(h.confirmada_por||'')+'</span>'+
        '<div class="spacer"></div>'+
        '<span class="mono" style="font-size:12px;font-weight:700">Total: '+fmt(t.total||0,2)+' Bs</span>'+
        '<span class="mono" style="font-size:12px;margin-left:12px;'+difColor+'">Dif: '+fmt(t.dif||0,2)+'</span>'+
        '<span style="font-size:11px;color:var(--muted);margin-left:8px">▼ ver detalle</span>'+
      '</div>'+
      '<div style="display:none">'+
        '<div class="twrap"><table>'+
          '<thead><tr style="font-size:11px;color:var(--muted)">'+
            '<th style="padding:5px 10px">Terminal</th>'+
            '<th class="r" style="padding:5px 8px">Ingreso</th>'+
            '<th class="r" style="padding:5px 8px">Comisión</th>'+
            '<th class="r" style="padding:5px 8px">Total</th>'+
            '<th class="r" style="padding:5px 8px">Adm. INES</th>'+
            '<th class="r" style="padding:5px 8px">Diferencia</th>'+
          '</tr></thead>'+
          '<tbody>'+detRows+'</tbody>'+
          '<tfoot><tr style="font-weight:700;background:var(--surface2);font-size:12px">'+
            '<td style="padding:6px 10px">TOTAL</td>'+
            '<td class="mono r" style="padding:6px 8px">'+fmt(t.ingreso||0,2)+'</td>'+
            '<td class="mono r" style="padding:6px 8px">'+fmt(t.comision||0,2)+'</td>'+
            '<td class="mono r" style="padding:6px 8px">'+fmt(t.total||0,2)+'</td>'+
            '<td class="mono r" style="padding:6px 8px;color:var(--accent)">'+fmt(t.admin||0,2)+'</td>'+
            '<td class="mono r" style="padding:6px 8px;'+difColor+'">'+fmt(t.dif||0,2)+'</td>'+
          '</tr></tfoot>'+
        '</table></div>'+
      '</div>'+
    '</div>';
  }).join('');
  inner.innerHTML =
    '<p class="section-title" style="margin-bottom:16px">Historial de Verificaciones Confirmadas</p>'+
    rows;
}

function renderHistorialBancos() {
  const fechas = Object.keys(db.bancos||{}).sort().reverse();
  const tasa   = getTasa();

  if (fechas.length === 0) {
    document.getElementById('historial-inner').innerHTML =
      '<div class="empty-state">'+
      '<p>Sin registros de disponibilidad aún.<br>Guarda la disponibilidad del día en la sección Bancos & Pagos.</p></div>';
    return;
  }

  const rows = fechas.map(fd => {
    const dd  = db.bancos[fd] || {};
    const fci = dd.FARMACIA  || {};
    const dro = dd.DROGUERIA || {};
    const totF = BANCOS_LIST.reduce((a,b) => a + (fci[b]||0), 0);
    const totD = BANCOS_LIST.reduce((a,b) => a + (dro[b]||0), 0);
    const totG = totF + totD;
    const isHoy = fd === HOY();

    // Per-bank sub-rows collapsed into a tooltip-style title
    const detalle = BANCOS_LIST
      .filter(b => (fci[b]||0) > 0 || (dro[b]||0) > 0)
      .map(b => b+': F '+fmt(fci[b]||0,0)+' / D '+fmt(dro[b]||0,0))
      .join(' · ');

    return '<tr>'+
      '<td style="white-space:nowrap;font-weight:'+(isHoy?'700':'400')+'">'+
        fmtDate(fd)+(isHoy?' <span class="badge b-green" style="font-size:9px">HOY</span>':'')+
      '</td>'+
      '<td class="mono r">'+fmt(totF,0)+' Bs</td>'+
      '<td class="mono r">'+fmt(totD,0)+' Bs</td>'+
      '<td class="mono r" style="font-weight:700;color:var(--accent)">'+fmt(totG,0)+' Bs</td>'+
      '<td class="mono r" style="color:var(--green)">'+( tasa ? '$'+fmt(totG/tasa) : '—')+'</td>'+
      '<td style="font-size:10px;color:var(--faint);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+detalle+'">'+
        (detalle||'—')+
      '</td>'+
      '</tr>';
  }).join('');

  // Totals summary across all dates
  const totalRegistros = fechas.length;

  document.getElementById('historial-inner').innerHTML =
    '<div class="tbox">'+
    '<div class="tbox-hd">'+
      '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> Historial de Disponibilidad Bancaria</span>'+
      '<span class="tbox-meta">'+totalRegistros+' días registrados</span>'+
    '</div>'+
    '<div class="twrap"><table>'+
    '<thead><tr>'+
      '<th>Fecha</th>'+
      '<th class="r">Farmacia</th>'+
      '<th class="r">Droguería</th>'+
      '<th class="r">Total Bs</th>'+
      '<th class="r">Total USD</th>'+
      '<th>Detalle bancos</th>'+
    '</tr></thead>'+
    '<tbody>'+rows+'</tbody>'+
    '</table></div></div>';
}

