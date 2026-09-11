async function iaEnviar(){
  var inp=document.getElementById('ia-input'); if(!inp) return;
  var q=(inp.value||'').trim(); if(!q) return;
  iaAgregar('user',q); inp.value='';
  var qn=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/cobr|deud|moros/.test(qn) && typeof _asisCobros==='function'){
    iaPensando(true);
    _asisCobros(qn, function(t){ iaPensando(false); iaAgregar('bot',t); iaHablar(t, function(){ if(typeof _iaManosLibres!=='undefined'&&_iaManosLibres) setTimeout(iaVoz,300); }); });
    return;
  }
  iaPensando(true);
  var r;
  try { r = await asistenteResponder(q); } catch(e){ r = responderAsistente(q); }
  iaPensando(false);
  iaAgregar('bot', r);
  iaHablar(r, function(){ if(_iaManosLibres) setTimeout(iaVoz, 300); });
}
async function asistenteResponder(q){
  try {
    var resp = await supabaseClient.functions.invoke('asistente', { body: { pregunta: q, contexto: buildContextoIA() } });
    var data = resp && resp.data;
    if (data && data.answer) return data.answer;
  } catch(e){}
  return responderAsistente(q);
}
function iaPensando(on){
  var cont=document.getElementById('ia-mensajes'); if(!cont) return;
  var ex=document.getElementById('ia-typing'); if(ex) ex.remove();
  if(on){ var d=document.createElement('div'); d.id='ia-typing'; d.className='ia-msg bot'; d.textContent='Pensando…'; cont.appendChild(d); cont.scrollTop=cont.scrollHeight; }
}
function toggleManosLibres(){
  _iaManosLibres=!_iaManosLibres;
  var b=document.getElementById('ia-hands'); if(b) b.style.color=_iaManosLibres?'var(--green)':'';
  iaAgregar('bot', _iaManosLibres? 'Modo manos libres activado: te escucho después de cada respuesta. Toca el auricular para apagarlo.' : 'Modo manos libres desactivado.');
  if(_iaManosLibres) setTimeout(iaVoz, 400);
}
function iaSaludoProactivo(){
  try{
    var tasa=getTasa();
    var facturas=db.facturas||[];
    var venc=facturas.filter(function(f){return computeEstado(f)==='VENCIDA';}).length;
    var prox=facturas.filter(function(f){return computeEstado(f)==='POR_VENCER';}).length;
    var partes=['Hola.'];
    partes.push(tasa? ('Tasa de hoy: '+fmt(tasa,2)+' Bs/$.') : 'Aviso: aún no se ha cargado la tasa de hoy.');
    if(venc||prox) partes.push('Tienes '+venc+' factura(s) vencida(s) y '+prox+' por vencer.');
    partes.push('Pregúntame, por ejemplo: "¿a quién le debo pagar hoy?" o "¿cuánto le debo a [proveedor]?".');
    return partes.join(' ');
  }catch(e){ return 'Hola. ¿En qué te ayudo?'; }
}
function buildContextoIA(){
  try{
    var tasa=getTasa();
    var facturas=db.facturas||[];
    var prest=(db.prestamos||[]).filter(function(p){return p.activo;});
    var sU=function(f){ return (typeof saldoUsd==='function'?saldoUsd(f):0)||0; };
    var porProv={};
    facturas.forEach(function(f){ var n=(f.proveedor||'?').trim(); var s=sU(f); if(s>0) porProv[n]=Math.round((porProv[n]||0)+s); });
    var BANCOS=['BANESCO','BDV','BNC','CARIBE','MERCANTIL','PROVINCIAL','TESORO'];
    var bh=(db.bancos&&db.bancos[HOY()])||{};
    var dispBs=BANCOS.reduce(function(a,b){return a+(((bh.FARMACIA&&bh.FARMACIA[b])||0)+((bh.DROGUERIA&&bh.DROGUERIA[b])||0));},0);
    var pend=facturas.filter(function(f){return ['VENCIDA','POR_VENCER'].indexOf(computeEstado(f))>=0;});
    return {
      fecha: HOY(),
      tasa_bcv_bs_por_usd: tasa,
      disponible_bancos_bs: Math.round(dispBs),
      facturas_activas: facturas.length,
      facturas_vencidas: facturas.filter(function(f){return computeEstado(f)==='VENCIDA';}).length,
      facturas_por_vencer: facturas.filter(function(f){return computeEstado(f)==='POR_VENCER';}).length,
      deuda_prestamos_total_usd: Math.round(prest.reduce(function(a,p){return a+(p.saldo_usd||0);},0)),
      cuota_mensual_prestamos_usd: Math.round(prest.reduce(function(a,p){return a+(p.cuota_usd||0);},0)),
      deuda_pendiente_por_proveedor_usd: porProv,
      prestamos_activos: prest.map(function(p){return {id:p.id, banco:p.banco, entidad:p.entidad, cuota_usd:p.cuota_usd, saldo_usd:p.saldo_usd, proxima_cuota:p.proxima_cuota, cuotas_pagadas:p.cuotas_hechas, total_cuotas:p.total_cuotas};}),
      facturas_pendientes: pend.slice(0,50).map(function(f){return {proveedor:f.proveedor, empresa:f.empresa, vence:f.vence, estado:computeEstado(f), saldo_usd:Math.round(sU(f)*100)/100};})
    };
  }catch(e){ return {}; }
}
var _iaVoices=[];
function _iaLoadVoices(){ try{ _iaVoices=window.speechSynthesis.getVoices()||[]; }catch(e){} }
function _iaPickVoice(){
  var vs=_iaVoices||[]; if(!vs.length) return null;
  var es=vs.filter(function(v){ return /^es/i.test(v.lang||''); });
  if(!es.length) return null;
  var pref=['google','natural','neural','enhanced','premium','online','mónica','monica','paulina','lucía','lucia','helena','sabina','jorge','juan','diego'];
  for(var k=0;k<pref.length;k++){ for(var i=0;i<es.length;i++){ if((es[i].name||'').toLowerCase().indexOf(pref[k])>=0) return es[i]; } }
  for(var i=0;i<es.length;i++){ if(/es[-_](us|mx|419)/i.test(es[i].lang||'')) return es[i]; }
  return es[0];
}
try{ if(window.speechSynthesis){ _iaLoadVoices(); window.speechSynthesis.onvoiceschanged=_iaLoadVoices; } }catch(e){}
var _iaUnlocked=false;
function iaUnlockVoz(){
  try{
    if(_iaUnlocked||!window.speechSynthesis) return;
    var u=new SpeechSynthesisUtterance(' '); u.volume=0; window.speechSynthesis.speak(u);
    _iaUnlocked=true;
  }catch(e){}
}
function iaHablar(t, onDone){
  try{
    if(!window.speechSynthesis){ if(onDone) onDone(); return; }
    if(!_iaVoices.length) _iaLoadVoices();
    window.speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(t);
    var _v=_iaPickVoice();
    u.voice=_v||null; u.lang=(_v&&_v.lang)||'es-ES'; u.rate=0.96; u.pitch=1.05; u.volume=1;
    if(onDone) u.onend=onDone;
    window.speechSynthesis.speak(u);
  }catch(e){ if(onDone) onDone(); }
}
var _iaRec=null;
function iaVoz(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ iaAgregar('bot','Tu navegador no permite dictado por voz aquí. Puedes escribir la pregunta.'); return; }
  try{
    iaUnlockVoz();
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
    var usd=function(v){ return tasa? (' (aprox. $'+fmt(v/tasa)+')') : ''; };
    var sBs=function(f){ var v=(typeof saldoBsHoy==='function')?saldoBsHoy(f):null; if(v==null) v=bsActual(f); return v||0; };
    var sUsd=function(f){ var v=(typeof saldoUsd==='function')?saldoUsd(f):null; return v||0; };

    if(has('hola','buenas','hey','saludos','buenos dias','buenos días')) return 'Hola. Preg\u00fantame, por ejemplo: "\u00bfa qui\u00e9n le debo pagar hoy?", "\u00bfcu\u00e1nto le debo a [proveedor]?", "\u00bfcu\u00e1l es la tasa?" o "\u00bfcu\u00e1nto hay disponible?".';
    if(has('ayuda','que puedes','qu\u00e9 puedes','puedes hacer','para que sirves','para qu\u00e9 sirves')) return 'Puedo decirte: a qui\u00e9n pagar y cu\u00e1nto, cu\u00e1nto le debes a un proveedor, las facturas vencidas, la tasa del d\u00eda, la deuda de pr\u00e9stamos y lo disponible en bancos.';

    // ¿Cuánto le debo a un proveedor?
    var provs=[]; var seen={};
    facturas.forEach(function(f){ var n=(f.proveedor||'').trim(); if(n && !seen[n.toLowerCase()]){ seen[n.toLowerCase()]=1; provs.push(n);} });
    var provMatch=null;
    provs.forEach(function(n){ if(s.indexOf(n.toLowerCase())>=0){ if(!provMatch||n.length>provMatch.length) provMatch=n; } });
    var preguntaProv = has('proveedor','le debe','le debo','le debemos','cuanto le','cu\u00e1nto le','debe a','debo a','debemos a');
    if(provMatch || (preguntaProv && s.indexOf(' a ')>=0)){
      if(!provMatch) return 'Dime el nombre del proveedor tal como est\u00e1 registrado. Por ejemplo: "\u00bfcu\u00e1nto le debo a '+(provs[0]||'Distribuidora X')+'?".';
      var fs=facturas.filter(function(f){ return (f.proveedor||'').trim().toLowerCase()===provMatch.toLowerCase(); });
      var ub=fs.reduce(function(a,f){return a+sUsd(f);},0);
      var bb=fs.reduce(function(a,f){return a+sBs(f);},0);
      var nVenc=fs.filter(function(f){return computeEstado(f)==='VENCIDA';}).length;
      if(ub<=0 && bb<=0) return 'A '+provMatch+' no le debes nada pendiente ahora mismo.';
      return 'A '+provMatch+' le debes '+(ub>0?('$'+fmt(ub)):'')+(bb>0?((ub>0?' (aprox. ':'')+fmt(bb,0)+' Bs'+(ub>0?')':'')):'')+', en '+fs.length+' factura(s)'+(nVenc?' ('+nVenc+' vencida(s))':'')+'.';
    }

    // ¿A quién pagar hoy / esta semana y cuánto?
    if(has('a quien','a qui\u00e9n','quien le','qui\u00e9n le','quien debo','qui\u00e9n debo','pagar hoy','pagar esta semana','quien pagar','qu\u00e9 pago','que pago','debo pagar','pagar primero','toca pagar','por pagar','urgente')){
      var items=[];
      factVenc.forEach(function(f){ items.push({n:(f.proveedor||'?'),bs:sBs(f)}); });
      factProx.forEach(function(f){ items.push({n:(f.proveedor||'?'),bs:sBs(f)}); });
      prest.filter(function(p){return ['VENCIDO','HOY','PROXIMO'].indexOf(estadoPrestamo(p))>=0;}).forEach(function(p){ items.push({n:'Cuota '+p.banco+' ('+p.entidad+')',bs:(tasa?(p.cuota_usd||0)*tasa:0)}); });
      if(!items.length) return 'No tienes pagos urgentes ahora mismo. Vas al d\u00eda.';
      items.sort(function(a,b){return b.bs-a.bs;});
      var tot=items.reduce(function(a,x){return a+x.bs;},0);
      var top=items.slice(0,4).map(function(x){ return x.n+' ('+fmt(x.bs,0)+' Bs)'; }).join('; ');
      var msg='Tienes '+items.length+' pago(s) pendiente(s) por unos '+fmt(tot,0)+' Bs'+usd(tot)+'. Los m\u00e1s grandes: '+top+'.';
      if(dispBs>0){ msg+=' Disponible en bancos: '+fmt(dispBs,0)+' Bs'+(dispBs>=tot?' \u2014 alcanza.':' \u2014 faltar\u00edan '+fmt(tot-dispBs,0)+' Bs.'); }
      return msg;
    }

    if(has('tasa','cambio','d\u00f3lar','dolar','bcv')) return tasa? ('La tasa de hoy es '+fmt(tasa,2)+' bol\u00edvares por d\u00f3lar.') : 'Todav\u00eda no se ha cargado la tasa de hoy.';
    if(has('vencida','vencidas','atrasad','atraso')){
      if(!factVenc.length) return 'No hay facturas vencidas. Bien.';
      var vBs=factVenc.reduce(function(a,f){return a+sBs(f);},0);
      return 'Hay '+factVenc.length+' facturas vencidas, por unos '+fmt(vBs,0)+' Bs'+usd(vBs)+'.';
    }
    if(has('deuda','pr\u00e9stamo','prestamo','cuota mensual','cuotas')){
      return 'La deuda total de pr\u00e9stamos es $'+fmt(deuda)+', con una cuota mensual de $'+fmt(cuotaMes)+(tasa?(' (unos '+fmt(cuotaMes*tasa,0)+' Bs al mes)'):'')+'.';
    }
    if(has('disponible','banco','caja','tengo','efectivo','cu\u00e1nto hay','cuanto hay')){
      return dispBs>0? ('Hoy hay '+fmt(dispBs,0)+' Bs disponibles en bancos'+usd(dispBs)+'.') : 'No se ha registrado la disponibilidad de hoy todav\u00eda.';
    }
    if(has('resumen','c\u00f3mo voy','como voy','situaci\u00f3n','situacion','estado general')){
      return 'Resumen: '+factVenc.length+' facturas vencidas, '+factProx.length+' por vencer. Deuda de pr\u00e9stamos $'+fmt(deuda)+' (cuota $'+fmt(cuotaMes)+'/mes). Disponible: '+(dispBs>0?fmt(dispBs,0)+' Bs':'sin registro')+'. Tasa: '+(tasa?fmt(tasa,2)+' Bs/$':'sin cargar')+'.';
    }
    return 'Puedo responder sobre: a qui\u00e9n pagar hoy y cu\u00e1nto, cu\u00e1nto le debes a un proveedor, facturas vencidas, la tasa, la deuda y lo disponible. \u00bfCu\u00e1l quieres?';
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
  const ocultarCuotas = !puedePerm('prest','cuotas');  // cuotas según permisos

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

function copiarSaldosAyer(){
  var hoy=HOY();
  var fechas=Object.keys(db.bancos||{}).filter(function(k){return /^\d{4}-/.test(k) && k<hoy;}).sort();
  if(!fechas.length){ showToast('No hay un día anterior registrado para copiar'); return; }
  var prevF=fechas[fechas.length-1]; var prev=db.bancos[prevF]||{}; var n=0;
  ENTIDADES.forEach(function(ent){ BANCOS_LIST.forEach(function(b){ var el=document.getElementById('banco-'+ent+'-'+b); if(el){ var v=(prev[ent]&&prev[ent][b]); el.value=(v!=null?_fmtBs(v):''); if(v!=null)n++; } }); });
  if(typeof calcBancosLive==='function') calcBancosLive();
  showToast('Copiados '+n+' saldos del '+fmtDate(prevF)+'. Revisa y dale Guardar.');
}
// Disponible de cierre (apertura ± movimientos) por banco y entidad de una fecha
function _dispActualBancos(fecha){
  var base=(db.bancos&&db.bancos[fecha])||{FARMACIA:{},DROGUERIA:{}};
  var act={FARMACIA:{},DROGUERIA:{}};
  ['FARMACIA','DROGUERIA'].forEach(function(ent){ BANCOS_LIST.forEach(function(b){ act[ent][b]=Number((base[ent]||{})[b])||0; }); });
  (typeof _movsDesdeBase==='function'?(_movsDesdeBase(fecha)||[]):[]).forEach(function(m){ var bs=Number(m.monto_bs)||0;
    if(m.tipo==='salida'){ if(act[m.entidad]) act[m.entidad][m.banco]=(act[m.entidad][m.banco]||0)-bs; }
    else if(m.tipo==='entrada'){ if(act[m.entidad]) act[m.entidad][m.banco]=(act[m.entidad][m.banco]||0)+bs; }
    else if(m.tipo==='traspaso'){ if(act[m.entidad]) act[m.entidad][m.banco]=(act[m.entidad][m.banco]||0)-bs; if(act[m.entidad_dest]) act[m.entidad_dest][m.banco_dest]=(act[m.entidad_dest][m.banco_dest]||0)+bs; }
  });
  return act;
}
// Arrastra el saldo DE CIERRE (lo no gastado) del último día como apertura de hoy
function arrastrarCierre(){
  var hoy=HOY();
  var fechas=Object.keys(db.bancos||{}).filter(function(k){return /^\d{4}-\d{2}-\d{2}$/.test(k) && k<hoy;}).sort();
  if(!fechas.length){ showToast('No hay un día anterior registrado para arrastrar.'); return; }
  var prevF=fechas[fechas.length-1];
  if(!confirm('Traer el saldo disponible al cierre del '+fmtDate(prevF)+' como apertura de hoy ('+fmtDate(hoy)+')?\n\nEl '+fmtDate(prevF)+' queda guardado en el historial; aquí solo se carga lo que quedó disponible para que metas los montos nuevos encima.')) return;
  var cierre=_dispActualBancos(prevF); var n=0;
  ENTIDADES.forEach(function(ent){ BANCOS_LIST.forEach(function(b){ var el=document.getElementById('banco-'+ent+'-'+b); if(el){ var v=cierre[ent][b]; el.value=(v!=null?_fmtBs(v):''); if(v!=null&&v!==0)n++; } }); });
  if(typeof calcBancosLive==='function') calcBancosLive();
  showToast('Cargado el saldo de cierre del '+fmtDate(prevF)+' como apertura de hoy. Mete los montos del fin de semana y dale Guardar.');
}
function _bancosHistDates(){
  return Object.keys(db.bancos||{}).filter(function(k){return /^\d{4}-\d{2}-\d{2}$/.test(k);}).sort().reverse();
}
function _bancosHistTasa(fecha){ return (typeof getTasaForFecha==='function')?getTasaForFecha(fecha):(typeof getTasa==='function'?getTasa():null); }
