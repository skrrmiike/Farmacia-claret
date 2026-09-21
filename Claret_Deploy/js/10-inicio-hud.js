function _genConfigModal(){
  var dias=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  var rows=_GEN_SHIFTS.map(function(s){
    var c=_genCfg.cov[s]||{count:0,days:[1,1,1,1,1,1,1]};
    var chks=dias.map(function(dn,di){ return '<label style="font-size:10px;display:inline-flex;flex-direction:column;align-items:center;gap:1px"><span style="color:#64748b">'+dn+'</span><input type="checkbox" class="gc-day" data-s="'+s+'" data-d="'+di+'" '+((c.days&&c.days[di])?'checked':'')+'></label>'; }).join('');
    var _tl=(TURNOS_CAT.filter(function(x){return x.c===s;})[0]||{}).lbl||s;
    return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 6px;font-weight:600;font-size:12px">'+_tl+'</td><td style="padding:5px 6px"><input type="number" min="0" step="1" class="gc-count" data-s="'+s+'" value="'+(c.count||0)+'" style="width:60px;text-align:right;padding:4px 6px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)"></td><td style="padding:5px 6px"><div style="display:flex;gap:9px;flex-wrap:wrap">'+chks+'</div></td></tr>';
  }).join('');
  var inner='<div style="padding:14px 18px;border-bottom:1px solid #eef0f3;font-weight:600;font-size:15px;display:flex;justify-content:space-between;align-items:center;color:#1e293b">Generar horario — Farmacia<button class="btn btn-ghost btn-sm" onclick="_contaCloseModal()">Cerrar</button></div>'+
    '<div style="padding:14px 16px;max-height:74vh;overflow:auto;color:#1e293b">'+
    '<div style="font-size:11px;color:#64748b;margin-bottom:10px">Indica cuántas personas necesitas en cada turno y en qué días. El sistema reparte al personal activo cumpliendo esa cobertura, rota las noches y da los días libres. Queda como borrador para ajustar y guardar.</div>'+
    '<table style="border-collapse:collapse;width:100%"><thead><tr><th style="text-align:left;font-size:11px;padding:4px 6px">Turno</th><th style="text-align:left;font-size:11px;padding:4px 6px">Personas</th><th style="text-align:left;font-size:11px;padding:4px 6px">Días</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap"><label style="font-size:12px">Días libres por persona/semana <input type="number" min="0" max="3" step="1" id="gc-libres" value="'+(_genCfg.libres||1)+'" style="width:54px;text-align:right;padding:4px 6px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)"></label></div>'+
    '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-green btn-sm" onclick="_genGenerar()">Generar borrador</button><button class="btn btn-ghost btn-sm" onclick="_genSoloGuardarCfg()">Solo guardar configuración</button></div>'+
    '</div>';
  _turModalAncho(inner);
}
function _genAbrirConfig(){ _genCargarCfg(function(){ _genConfigModal(); }); }
function _genLeerCfgModal(){
  var cov={};
  var cs=document.querySelectorAll('.gc-count'); for(var i=0;i<cs.length;i++){ var s=cs[i].getAttribute('data-s'); cov[s]={count:(+cs[i].value||0), days:[0,0,0,0,0,0,0]}; }
  var ds=document.querySelectorAll('.gc-day'); for(var j=0;j<ds.length;j++){ var s2=ds[j].getAttribute('data-s'), d=+ds[j].getAttribute('data-d'); if(cov[s2]) cov[s2].days[d]=ds[j].checked?1:0; }
  var le=document.getElementById('gc-libres'); var lib=le?(+le.value||0):1;
  _genCfg={cov:cov, libres:lib};
  return _genCfg;
}
function _genSoloGuardarCfg(){
  _genLeerCfgModal();
  _genGuardarCfg().then(function(res){ if(res&&res.error) showToast('No se pudo guardar config.'); else showToast('Configuración guardada.'); }).catch(function(){ showToast('No se pudo guardar config.'); });
}
function _genGenerar(){
  if(_turEmpresa!=='FARMACIA'){ showToast('El generador es solo para Farmacia.'); return; }
  _genLeerCfgModal();
  var totalNeed=0; Object.keys(_genCfg.cov).forEach(function(s){ if((_genCfg.cov[s].count||0)>0) totalNeed+=_genCfg.cov[s].count; });
  if(totalNeed===0){ showToast('Define al menos un turno con personas.'); return; }
  var all=_turEmpleados.slice();
  var esFijo=function(e){ return e.horario_fijo && typeof e.horario_fijo==='object' && Object.keys(e.horario_fijo).length; };
  var fixed=all.filter(esFijo), pool=all.filter(function(e){ return !esFijo(e); });
  var asg=_genAssign(pool, _genCfg.cov, _genCfg.libres);
  pool.forEach(function(e){ var k=String(e.id); _turData[k]={}; for(var d=0;d<7;d++) _turData[k][d]=(asg[k]&&asg[k][d])||'L'; });
  fixed.forEach(function(e){ var k=String(e.id); _turData[k]={}; for(var d=0;d<7;d++) _turData[k][d]=(e.horario_fijo[d]||e.horario_fijo[String(d)]||'L'); });
  _genGuardarCfg();
  if(typeof _contaCloseModal==='function') _contaCloseModal();
  renderTurnos();
  showToast('Borrador generado. Revisa la cobertura y pulsa Guardar.');
}
function _genAplicarDrogueria(){
  if(_turEmpresa!=='DROGUERIA') return;
  if(!confirm('¿Poner a todo el personal de Droguería en turno 7–5, de lunes a sábado?')) return;
  _turEmpleados.forEach(function(e){ var k=String(e.id); _turData[k]={}; for(var d=0;d<7;d++) _turData[k][d]=(d<=5?'7-5':'L'); });
  renderTurnos();
  showToast('Aplicado 7–5 (Lun–Sáb). Revisa y pulsa Guardar.');
}

/* ================= Claret OS · HUD premium (KPIs + Alertas + Memoria) ================= */
function _hudData(){
  var tasa=(typeof getTasa==='function'&&getTasa())||0;
  var facturas=(db&&db.facturas)||[];
  var ce=function(f){ return (typeof computeEstado==='function')?computeEstado(f):''; };
  var fv=facturas.filter(function(f){return ce(f)==='VENCIDA';});
  var fp=facturas.filter(function(f){return ce(f)==='POR_VENCER';});
  var prest=((db&&db.prestamos)||[]).filter(function(p){return p.activo;});
  var cuotaMes=prest.reduce(function(a,p){return a+(Number(p.cuota_usd)||0);},0);
  var deuda=prest.reduce(function(a,p){return a+(Number(p.saldo_usd)||0);},0);
  var BANCOS=['BANESCO','BDV','BNC','CARIBE','MERCANTIL','PROVINCIAL','TESORO'];
  var bh=(db&&db.bancos&&db.bancos[HOY()])||{};
  var dispBs=BANCOS.reduce(function(a,b){return a+(((bh.FARMACIA&&bh.FARMACIA[b])||0)+((bh.DROGUERIA&&bh.DROGUERIA[b])||0));},0);
  var sBs=function(f){ var v=(typeof saldoBsHoy==='function')?saldoBsHoy(f):null; if(v==null&&typeof bsActual==='function') v=bsActual(f); return Number(v)||0; };
  var sUsd=function(f){ var v=(typeof saldoUsd==='function')?saldoUsd(f):null; return Number(v)||0; };
  var fvUsd=fv.reduce(function(a,f){return a+sUsd(f);},0), fvBs=fv.reduce(function(a,f){return a+sBs(f);},0);
  var fpUsd=fp.reduce(function(a,f){return a+sUsd(f);},0), fpBs=fp.reduce(function(a,f){return a+sBs(f);},0);
  var ventasMes=(typeof _cxpVentasMes==='function')?(_cxpVentasMes()||0):0;
  var cuotasDue=prest.filter(function(p){ var e=(typeof estadoPrestamo==='function')?estadoPrestamo(p):''; return ['VENCIDO','HOY','PROXIMO'].indexOf(e)>=0; });
  return {tasa:tasa,dispBs:dispBs,fv:fv,fp:fp,fvUsd:fvUsd,fvBs:fvBs,fpUsd:fpUsd,fpBs:fpBs,deuda:deuda,cuotaMes:cuotaMes,ventasMes:ventasMes,cuotasDue:cuotasDue};
}
function _hudUSD(bs,tasa){ return tasa? ('≈ $'+fmt(bs/tasa)) : ''; }
function _osCss(){ return '<style>'+
'#inicio-content .os-hero{position:relative;overflow:hidden;border-radius:22px;padding:22px 24px;margin-bottom:18px;background:linear-gradient(135deg,#16267a,#3730a3 52%,#6366f1);color:#fff;box-shadow:0 16px 40px rgba(30,56,166,.38)}'+
'#inicio-content .os-hero:before{content:"";position:absolute;inset:0;background:radial-gradient(900px 260px at 12% -50%,rgba(255,255,255,.28),transparent 60%);pointer-events:none}'+
'#inicio-content .os-aurora{position:absolute;right:-50px;top:-70px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(163,230,53,.40),transparent 62%);filter:blur(22px);animation:osFloat 9s ease-in-out infinite;pointer-events:none}'+
'@keyframes osFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(20px) scale(1.1)}}'+
'#inicio-content .os-hero h1{font-size:25px;font-weight:800;margin:0;letter-spacing:-.4px;line-height:1}'+
'#inicio-content .os-hero .sub{font-size:12.5px;opacity:.9;margin-top:4px}'+
'#inicio-content .os-clock{position:absolute;top:20px;right:24px;text-align:right;z-index:2}'+
'#inicio-content .os-clock .h{font-size:25px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}'+
'#inicio-content .os-clock .d{font-size:11px;opacity:.85;text-transform:capitalize;margin-top:2px}'+
'#inicio-content .os-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;position:relative;z-index:2}'+
'#inicio-content .os-chip{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:5px 13px;font-size:12px;font-weight:600}'+
'#inicio-content .os-chip b{font-weight:800}'+
'#inicio-content .os-sec{display:flex;align-items:center;gap:9px;margin:22px 2px 11px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}'+
'#inicio-content .os-sec:before{content:"";width:4px;height:15px;border-radius:3px;background:linear-gradient(#6366f1,#1E38A6)}'+
'#inicio-content .os-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}'+
'#inicio-content .os-kpi{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:15px 16px 15px 18px;transition:transform .18s ease,box-shadow .18s ease,border-color .18s;animation:osUp .5s cubic-bezier(.2,.7,.3,1) both}'+
'#inicio-content .os-kpi:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.16);border-color:var(--c)}'+
'#inicio-content .os-kpi:after{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--c)}'+
'#inicio-content .os-kpi .ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:17px;margin-bottom:10px;background:color-mix(in srgb,var(--c) 18%,transparent)}'+
'#inicio-content .os-kpi .lab{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:800}'+
'#inicio-content .os-kpi .val{font-size:24px;font-weight:800;line-height:1.05;margin-top:3px;color:var(--c)}'+
'#inicio-content .os-kpi .sub{font-size:11.5px;color:var(--muted);margin-top:3px}'+
'#inicio-content .os-alert{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--c);border-radius:13px;padding:11px 14px;transition:transform .15s ease,box-shadow .15s;cursor:pointer;animation:osUp .5s cubic-bezier(.2,.7,.3,1) both}'+
'#inicio-content .os-alert:hover{transform:translateX(3px);box-shadow:0 8px 20px rgba(0,0,0,.12)}'+
'#inicio-content .os-alert .ab{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;font-size:15px;flex:none;background:color-mix(in srgb,var(--c) 20%,transparent)}'+
'#inicio-content .os-alert.crit{animation:osUp .5s cubic-bezier(.2,.7,.3,1) both,osPulse 2.6s ease-in-out infinite}'+
'@keyframes osPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}50%{box-shadow:0 0 18px 1px rgba(239,68,68,.4)}}'+
'@keyframes osUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}'+
'#inicio-content .os-tl{position:relative;padding-left:24px}'+
'#inicio-content .os-tl:before{content:"";position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:var(--border)}'+
'#inicio-content .os-mem{position:relative;margin-bottom:10px;animation:osUp .45s ease both}'+
'#inicio-content .os-mem:before{content:"";position:absolute;left:-21px;top:15px;width:11px;height:11px;border-radius:50%;background:var(--c);box-shadow:0 0 0 3px var(--bg),0 0 10px var(--c)}'+
'#inicio-content .os-badge{font-size:11px;font-weight:800;padding:2px 9px;border-radius:999px;color:#fff;background:var(--c)}'+
'#inicio-content .os-in{padding:9px 12px;border:1.5px solid var(--border);border-radius:11px;background:var(--surface);color:var(--text);font-size:14px;box-sizing:border-box;transition:border-color .15s}'+
'#inicio-content .os-in:focus{outline:none;border-color:var(--accent)}'+
'</style>'; }
function _osTick(){ try{ var d=new Date(); var c=document.getElementById('os-clk'); if(c)c.textContent=d.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}); var t=document.getElementById('os-dte'); if(t)t.textContent=d.toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'short'}); }catch(e){} }
function _kpi(icon,label,main,sub,color,tab,idx){
  return '<div class="os-kpi" style="--c:'+color+';animation-delay:'+(idx*55)+'ms"'+(tab?(' onclick="showTab(\''+tab+'\')" role="button"'):'')+'>'+
    '<div class="ic">'+icon+'</div><div class="lab">'+label+'</div><div class="val">'+main+'</div>'+(sub?('<div class="sub">'+sub+'</div>'):'')+'</div>';
}
function _osAlert(sev,icon,t,s,tab,idx){
  var col=sev==='red'?'var(--red)':(sev==='amber'?'var(--amber)':'var(--accent)');
  return '<div class="os-alert'+(sev==='red'?' crit':'')+'" style="--c:'+col+';animation-delay:'+(idx*60)+'ms"'+(tab?(' onclick="showTab(\''+tab+'\')"'):'')+'>'+
    '<div class="ab">'+icon+'</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px">'+esc(t)+'</div>'+(s?('<div style="font-size:11.5px;color:var(--muted)">'+esc(s)+'</div>'):'')+'</div>'+(tab?'<span style="color:var(--muted);font-size:18px">›</span>':'')+'</div>';
}
function _hudAlertas(d){
  var a=[],i=0;
  if(d.fv.length) a.push(_osAlert('red','⏰',d.fv.length+' factura(s) vencida(s)','$'+fmt(d.fvUsd)+(d.tasa?(' · '+fmt(d.fvBs,0)+' Bs'):''),'cxp',i++));
  if(d.cuotasDue.length) a.push(_osAlert('red','🏦',d.cuotasDue.length+' cuota(s) de préstamo por pagar','$'+fmt(d.cuotaMes)+' al mes','prest-resumen',i++));
  if(d.fp.length) a.push(_osAlert('amber','📅',d.fp.length+' factura(s) por vencer','$'+fmt(d.fpUsd),'cxp',i++));
  a.push('<div id="hud-inv-alert"></div>');
  window._osAlertN=i;
  return a;
}
function _iniBancoPriorCard(){
  try{
    if(['admin','mayra','gerente'].indexOf(typeof currentRole!=='undefined'?currentRole:'')<0) return '';
    if(!window._ccCfg){ try{ supabaseClient.from('app_sections').select('data').eq('section_name','caja_cfg').maybeSingle().then(function(rc){ window._ccCfg=(rc&&rc.data&&rc.data.data)||{}; var e=document.getElementById('ini-bp'); if(e&&typeof renderInicio==='function')renderInicio(); }); }catch(e){} }
    var sel=['Mercantil','Provincial','Banesco','Banco del Tesoro','Bancaribe','BNC'].map(function(b){ return '<option'+(((window._ccCfg||{}).banco_prior)===b?' selected':'')+'>'+b+'</option>'; }).join('');
    return '<div id="ini-bp" class="tbox" style="padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="font-weight:700;font-size:13px">🏦 Banco prioritario para las cajas:</span><select onchange="_ccBancoPrior(this.value)" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px"><option value="">— ninguno —</option>'+sel+'</select><span style="font-size:11px;color:var(--muted)">Las cajas lo ven al instante · solo visible para administración</span></div>';
  }catch(e){ return ''; }
}
function _iniFirmasJP(){
  var box=document.getElementById('ini-jp-firmas'); if(!box)return;
  var esGer=false; try{ esGer=(currentRole==='gerente'||currentRole==='admin'||currentUser==='gerente'); }catch(e){}
  if(!esGer){ box.innerHTML=''; return; }
  try{ supabaseClient.from('caja_metalica').select('*').eq('tipo','salida').eq('es_gerente',true).eq('firmado_gerente',false).order('id',{ascending:false}).then(function(r){
    var rows=(r&&r.data)||[]; if(!rows.length){ box.innerHTML=''; return; }
    var f=function(n){ return (typeof _ccFmt==='function')?_ccFmt(n):n; };
    var items=rows.map(function(m){ return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(180,83,9,.18)"><div style="min-width:0"><div style="font-weight:800;font-size:14px;color:#7c2d12">$ '+f(m.monto)+(m.motivo?(' \u00b7 '+esc(m.motivo)):'')+'</div><div style="font-size:11px;color:#9a3412">Retiro de la caja met\u00e1lica del '+esc((''+(m.creado_en||m.fecha||'')).slice(0,10))+(m.proveedor?(' \u00b7 para '+esc(m.proveedor)):'')+' \u00b7 confirma que lo sacaste</div></div><button class="btn btn-sm" style="background:#b45309;color:#fff;flex:none" onclick="_cmFirmarGerente('+m.id+')">\u270D Firmar</button></div>'; }).join('');
    box.innerHTML='<div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fcd34d;border-radius:16px;padding:14px 16px;margin-bottom:18px"><div style="font-weight:800;font-size:14px;color:#92400e;margin-bottom:2px">\u270D Firmas pendientes \u00b7 Caja met\u00e1lica</div><div style="font-size:11.5px;color:#9a3412;margin-bottom:2px">Sacaste d\u00f3lares de la caja roja. Firma el monto para dejarlo registrado.</div>'+items+'</div>';
  }).catch(function(){}); }catch(e){}
}
function _iniCxpGrismar(){
  var box=document.getElementById('ini-cxp-roja'); if(!box)return;
  var ok=false; try{ ok=(currentRole==='grismar'||currentRole==='admin'||currentRole==='mayra'); }catch(e){}
  if(!ok){ box.innerHTML=''; return; }
  try{ supabaseClient.from('caja_metalica').select('*').eq('tipo','salida').eq('cxp_visto',false).not('proveedor','is',null).order('id',{ascending:false}).then(function(r){
    var rows=(r&&r.data)||[]; if(!rows.length){ box.innerHTML=''; return; }
    var f=function(n){ return (typeof _ccFmt==='function')?_ccFmt(n):n; };
    var items=rows.map(function(m){ return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(30,64,175,.15)"><div style="min-width:0"><div style="font-weight:800;font-size:14px;color:#1e3a8a">$ '+f(m.monto)+' \u2192 '+esc(m.proveedor||'')+'</div><div style="font-size:11px;color:#3730a3">Salida de caja roja del '+esc((''+(m.creado_en||m.fecha||'')).slice(0,10))+(m.motivo?(' \u00b7 '+esc(m.motivo)):'')+' \u00b7 reg\u00edstralo en Cuentas por Pagar</div></div><button class="btn btn-sm" style="background:#1e40af;color:#fff;flex:none" onclick="_cmMarcarCxp('+m.id+')">\u2713 Registrado</button></div>'; }).join('');
    box.innerHTML='<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:16px;padding:14px 16px;margin-bottom:18px"><div style="font-weight:800;font-size:14px;color:#1e3a8a;margin-bottom:2px">\uD83E\uDDFE Abonos a proveedores \u00b7 Caja roja</div><div style="font-size:11.5px;color:#3730a3;margin-bottom:2px">JP sac\u00f3 d\u00f3lares para estos proveedores. Reg\u00edstralos en CxP y marca \u2713.</div>'+items+'</div>';
  }).catch(function(){}); }catch(e){}
}
function renderInicio(){
  var el=document.getElementById('inicio-content'); if(!el) return;
  var nom=(typeof getUserNombre==='function')?getUserNombre(currentUser):(currentUser||'');
  var h=new Date().getHours(); var salu=(h<12?'Buenos días':(h<19?'Buenas tardes':'Buenas noches'));
  var f=new Date().toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long'});
  f=f.charAt(0).toUpperCase()+f.slice(1);
  var puede=function(t){ try{ return (typeof _tabAllowed==='function')?_tabAllowed(t):true; }catch(e){ return true; } };
  var SV=function(p,z,c){ return '<svg width="'+(z||18)+'" height="'+(z||18)+'" viewBox="0 0 24 24" fill="none" stroke="'+(c||'currentColor')+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; };
  var P={caja:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',trofeo:'<path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z"/>',cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',box:'<path d="M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'};
  el.innerHTML=_iniBancoPriorCard()+'<div id="ini-jp-firmas"></div>'+'<div id="ini-cxp-roja"></div>'+
    '<div style="background:linear-gradient(135deg,#131C33,#1E2E52 55%,#25397A);border-radius:18px;padding:22px 24px;margin-bottom:18px;color:#fff;box-shadow:0 2px 4px rgba(11,18,32,.18),0 18px 40px -14px rgba(11,18,32,.5),inset 0 1px 0 rgba(255,255,255,.08);position:relative;overflow:hidden">'+
      '<div style="position:absolute;right:-60px;top:-80px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(59,87,212,.4),transparent 65%);filter:blur(18px)"></div>'+
      '<div style="position:relative"><div style="font-size:22px;font-weight:600;letter-spacing:-.4px">'+salu+', '+esc(nom)+'</div>'+
      '<div style="font-size:12.5px;color:#93A0B8;margin-top:3px">'+f+'</div></div></div>'+
    '<div id="ini-kpis" style="display:flex;gap:11px;flex-wrap:wrap;margin-bottom:16px"></div>'+
    '<div style="font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin:0 0 9px 2px">Accesos rápidos</div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
      [['cierre','Cierre de caja',P.caja],['reto','Reto de ventas',P.trofeo],['vencimientos','Vencimientos',P.cal],['mensajes','Seguimiento',P.target],['compras','Compras',P.box],['turnos','Turnos',P.users]]
      .filter(function(a){ return puede(a[0]); })
      .map(function(a){ return '<div onclick="showTab(\''+a[0]+'\')" style="flex:1;min-width:145px;background:linear-gradient(160deg,#fff,#FCFCFD);border:1px solid rgba(16,24,40,.07);border-radius:13px;padding:14px;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(16,24,40,.10),inset 0 1px 0 #fff;transition:transform .14s,box-shadow .18s" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">'+
        '<div style="color:#1E38A6;margin-bottom:8px">'+SV(a[2],20)+'</div>'+
        '<div style="font-size:13px;font-weight:500;color:var(--text)">'+a[1]+'</div></div>'; }).join('')+
    '</div>';
  _iniKPIs();
  try{ _iniFirmasJP(); }catch(e){}
  try{ _iniCxpGrismar(); }catch(e){}
}
function _iniKPIs(){
  var box=document.getElementById('ini-kpis'); if(!box)return;
  var puede=function(t){ try{ return (typeof _tabAllowed==='function')?_tabAllowed(t):true; }catch(e){ return true; } };
  var out=[];
  var card=function(lbl,val,sub,col,tab){ return '<div '+(tab?('onclick="showTab(\''+tab+'\')" style="cursor:pointer;'):'style="')+'flex:1;min-width:158px;background:linear-gradient(160deg,#fff,#FCFCFD);border:1px solid rgba(16,24,40,.07);border-radius:13px;padding:14px 15px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(16,24,40,.10),inset 0 1px 0 #fff">'+
    '<div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+lbl+'</div>'+
    '<div style="font-size:23px;font-weight:600;letter-spacing:-.5px;font-variant-numeric:tabular-nums;margin-top:4px;color:'+(col||'var(--text)')+'">'+val+'</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:1px">'+sub+'</div></div>'; };
  var pintar=function(){ box.innerHTML=out.join('')||''; };
  // Reto del mes
  if(puede('reto')){
    try{ var r=_reto(); var mes=(typeof _retoMesHoy==='function')?_retoMesHoy():'';
      var mm=(r.meds||[]).filter(function(m){ return (m.vence||'')===mes && !m.retirado && m.impulsable!==false; });
      var meta=0,sold=0; mm.forEach(function(m){ meta+=Number(m.meta)||0; sold+=(typeof _retoMedSold==='function')?_retoMedSold(r,m.id):0; });
      var pct=meta>0?Math.round(sold/meta*100):0;
      out.push(card('Reto del mes', meta>0?(pct+'%'):'—', meta>0?(sold+' de '+meta+' unidades'):'sin productos', pct>=75?'#079455':(meta>0?'#B54708':'var(--text)'), 'reto'));
    }catch(e){}
  }
  pintar();
  // Cajas de hoy (solo quien supervisa)
  if(puede('cierre')){
    try{
      var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
      supabaseClient.from('cierres_caja').select('id,estado,data').eq('fecha',hoy).eq('empresa','farmacia').then(function(r){
        var cs=(r&&r.data)||[]; var ab=cs.filter(function(c){return c.estado==='abierto';}).length;
        var ids=cs.map(function(c){return c.id;});
        var fin=function(pend){
          out.unshift(card('Cajas de hoy', cs.length, ab+' abierta(s) · '+(cs.length-ab)+' cerrada(s)','var(--text)','cierre'));
          if(pend>0) out.unshift(card('Firmas pendientes', pend, 'esperan tu verificación','#B42318','cierre'));
          pintar();
        };
        if(!ids.length){ fin(0); return; }
        supabaseClient.from('cierre_firmas').select('cierre_id,linea_id').in('cierre_id',ids).then(function(rf){
          var fm={}; ((rf&&rf.data)||[]).forEach(function(x){ fm[x.cierre_id+'|'+x.linea_id]=1; });
          var pend=0; cs.forEach(function(c){ var d=c.data||{}; ['zelle','transfer','dolares'].forEach(function(k){ (d[k]||[]).forEach(function(x){ if(x.solic && !fm[c.id+'|'+x.id]) pend++; }); }); });
          fin(pend);
        }).catch(function(){ fin(0); });
      }).catch(function(){});
    }catch(e){}
  }
  // Vencimientos en riesgo
  if(puede('vencimientos')){
    try{
      supabaseClient.from('lotes_vencimiento').select('cantidad,fecha_venc').then(function(r){
        var lo=(r&&r.data)||[]; if(!lo.length)return;
        var mes=(new Date()).toISOString().slice(0,7); var u=0,n=0;
        lo.forEach(function(l){ var fv=(''+(l.fecha_venc||'')).slice(0,7); if(fv&&fv<=mes){ u+=Number(l.cantidad)||0; n++; } });
        if(n>0){ out.push(card('Vencen este mes', n, u.toLocaleString('es-VE')+' unidades en riesgo','#B54708','vencimientos')); pintar(); }
      }).catch(function(){});
    }catch(e){}
  }
  // Seguimientos de hoy (ventas)
  if(puede('mensajes')){
    try{ if(typeof _crmSegHoy==='function' && _waEmp && _waEmp.length){ var sg=_crmSegHoy().length; if(sg>0){ out.push(card('Seguimientos hoy', sg, 'farmacias por contactar','#1E38A6','mensajes')); pintar(); } } }catch(e){}
  }
  // De vacaciones hoy
  if(puede('vacaciones')){
    try{
      var hoyV=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
      supabaseClient.from('vacaciones').select('nombre,empresa,fecha_inicio,fecha_final').lte('fecha_inicio',hoyV).gte('fecha_final',hoyV).then(function(r){
        var vs=(r&&r.data)||[]; if(!vs.length)return;
        var nombres=vs.map(function(v){ var t=String(v.nombre||'').trim().split(/\s+/); return t.length>=3?t[2]:(t[0]||''); }).filter(Boolean).slice(0,3).join(', ');
        out.push(card('De vacaciones hoy', vs.length, nombres||'personas fuera','#7c3aed','vacaciones')); pintar();
      }).catch(function(){});
    }catch(e){}
  }
}
function _memTipos(){ return {decision:'📌 Decisión',reunion:'🤝 Reunión',analisis:'📈 Análisis',nota:'📝 Nota',riesgo:'⚠️ Riesgo',acuerdo:'✅ Acuerdo'}; }
function _memColor(tp){ return {decision:'#6366f1',reunion:'#0891b2',analisis:'#16a34a',nota:'#64748b',riesgo:'#f59e0b',acuerdo:'#22c55e'}[tp]||'#64748b'; }
function _memBloqueHTML(){
  var tp=_memTipos(); var opts=''; for(var k in tp) opts+='<option value="'+k+'">'+tp[k]+'</option>';
  return '<div class="tbox" style="padding:15px;border-radius:16px;margin-bottom:14px">'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px"><select id="mem-tipo" class="os-in" style="flex:none;font-weight:600">'+opts+'</select>'+
      '<input id="mem-tit" class="os-in" placeholder="Título (ej. Acuerdo de pago con Distribuidora X)" style="flex:1;min-width:180px"></div>'+
      '<textarea id="mem-cont" rows="2" class="os-in" placeholder="Detalle (opcional): qué se decidió, con quién, montos, próximos pasos…" style="width:100%;resize:vertical;margin-bottom:9px"></textarea>'+
      '<button class="btn btn-accent btn-sm" onclick="_memGuardar()">＋ Registrar en la memoria</button>'+
    '</div>'+
    '<input id="mem-buscar" class="os-in" placeholder="🔎 Buscar en la memoria…" oninput="_memBuscar(this.value)" style="width:100%;margin-bottom:12px">'+
    '<div id="hud-mem-list"></div>';
}
function _memCargar(){
  supabaseClient.from('memoria').select('*').eq('estado','activa').order('fecha',{ascending:false}).order('id',{ascending:false}).limit(60).then(function(r){
    if(r&&r.error){ var el=document.getElementById('hud-mem-list'); if(el)el.innerHTML='<div style="color:var(--red);font-size:12px">No se pudo cargar la memoria.</div>'; return; }
    _memItems=(r&&r.data)||[]; _memPintar();
  });
}
function _memBuscar(v){ _memQ=(v||'').toLowerCase(); _memPintar(); }
function _memPintar(){
  var el=document.getElementById('hud-mem-list'); if(!el)return; var tp=_memTipos();
  var arr=_memItems.filter(function(m){ if(!_memQ)return true; return ((m.titulo||'')+' '+(m.contenido||'')+' '+(m.tipo||'')+' '+(m.autor||'')).toLowerCase().indexOf(_memQ)>=0; });
  if(!_memItems.length){ el.innerHTML='<div class="tbox" style="padding:20px;text-align:center;color:var(--muted);border-radius:14px;font-size:13px">Aún no hay notas. Registra la primera decisión o acuerdo arriba. 🧠</div>'; return; }
  if(!arr.length){ el.innerHTML='<div style="padding:14px;color:var(--muted);font-size:13px">Sin resultados para "'+esc(_memQ)+'".</div>'; return; }
  var nom=function(u){ return (typeof getUserNombre==='function')?getUserNombre(u):(u||''); };
  var h='<div class="os-tl">'+arr.slice(0,40).map(function(m,i){
    var badge=tp[m.tipo]||('📝 '+(m.tipo||'nota')); var col=_memColor(m.tipo);
    var fecha=''; try{ fecha=fmtDate((''+(m.fecha||m.creado_en||'')).slice(0,10)); }catch(e){}
    return '<div class="os-mem" style="--c:'+col+';animation-delay:'+(i*35)+'ms"><div class="tbox" style="padding:11px 13px;border-radius:12px">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><span class="os-badge" style="--c:'+col+'">'+badge+'</span>'+
      '<span style="font-weight:700;font-size:13px;flex:1;min-width:0">'+esc(m.titulo||'')+'</span>'+
      '<button onclick="_memDel('+m.id+')" title="Archivar" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:13px">🗑</button></div>'+
      (m.contenido?('<div style="font-size:12px;color:var(--text);line-height:1.55;margin:3px 0 4px;white-space:pre-wrap">'+esc(m.contenido)+'</div>'):'')+
      '<div style="font-size:10px;color:var(--muted)">'+esc(nom(m.autor))+(fecha?(' · '+fecha):'')+(m.empresa&&m.empresa!=='consolidado'?(' · '+esc(m.empresa)):'')+'</div>'+
    '</div></div>';
  }).join('')+'</div>';
  el.innerHTML=h+(arr.length>40?'<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:4px">Mostrando 40 de '+arr.length+'</div>':'');
}
function _memGuardar(){
  var tp=document.getElementById('mem-tipo'), ti=document.getElementById('mem-tit'), co=document.getElementById('mem-cont');
  var titulo=(ti&&ti.value.trim())||''; if(!titulo){ showToast('Ponle un título a la nota'); return; }
  var emp=(typeof EMPRESA!=='undefined'&&EMPRESA)?EMPRESA:'consolidado';
  var row={ tipo:(tp&&tp.value)||'nota', titulo:titulo, contenido:(co&&co.value.trim())||null, empresa:emp, autor:(typeof currentUser!=='undefined'?currentUser:null), importancia:3, estado:'activa', fecha:HOY() };
  supabaseClient.from('memoria').insert([row]).then(function(r){
    if(r&&r.error){ showToast('Error al guardar: '+(r.error.message||'')); return; }
    if(ti)ti.value=''; if(co)co.value=''; showToast('✓ Nota guardada en la memoria');
    if(typeof logAudit==='function') logAudit('memoria.add', row.tipo+': '+titulo);
    _memCargar();
  });
}
function _memDel(id){ if(!confirm('¿Archivar esta nota? Dejará de aparecer, pero no se borra.')) return; supabaseClient.from('memoria').update({estado:'archivada',actualizado_en:new Date().toISOString()}).eq('id',id).then(function(r){ if(r&&r.error){ showToast('Error: '+(r.error.message||'')); return; } _memCargar(); }); }

/* ================= Plan de Vencimientos (riesgo por lote + reto sugerido) ================= */
var _venItems=[], _venProd={}, _venProdN={}, _venQ='', _venFiltro='todos';
