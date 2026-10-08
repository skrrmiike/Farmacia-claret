function _ccEmp(){ return 'farmacia'; }
function _ccDefData(){ return {tasa:0, efectivo:{}, dolares:[], zelle:[], transfer:[], debito:[], credito:[], gastos:[], a2:{}}; }
function _ccNorm(c){ if(typeof c.data==='string'){ try{ c.data=JSON.parse(c.data); }catch(_e){} } if(!c.data||typeof c.data!=='object')c.data=_ccDefData(); var d=c.data; if(!d.efectivo)d.efectivo={}; ['dolares','zelle','transfer','debito','credito','gastos'].forEach(function(k){ if(!Array.isArray(d[k]))d[k]=[]; }); if(!d.a2)d.a2={}; return c; }
function _ccPuede(){ try{ return ['supervisor','angelica','gerente','admin','mayra','grismar','ines'].indexOf(currentRole)>=0; }catch(e){ return true; } }
function _ccBeep(){ try{ var a=new (window.AudioContext||window.webkitAudioContext)(); var o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type='sine'; g.gain.value=.12; o.frequency.setValueAtTime(880,a.currentTime); o.frequency.setValueAtTime(1180,a.currentTime+.13); o.start(); setTimeout(function(){ try{o.stop();a.close();}catch(e){} },280); }catch(e){} }
function _ccBadge(n){ try{ var t=document.getElementById('tab-cierre'); if(!t)return; var b=t.querySelector('.cc-badge'); if(n>0){ if(!b){ b=document.createElement('span'); b.className='cc-badge'; b.style.cssText='background:#ef4444;color:#fff;border-radius:999px;font-size:10px;font-weight:800;padding:1px 6px;margin-left:6px'; t.appendChild(b); } b.textContent=n; } else if(b){ b.remove(); } }catch(e){} }
function _ccFirmada(cid,lid){ return _ccFirmas.some(function(f){return f.cierre_id===cid && f.linea_id===lid;}); }
function _ccFirmaDe(cid,lid){ return _ccFirmas.filter(function(f){return f.cierre_id===cid && f.linea_id===lid;})[0]||null; }
function _ccRTPing(){ if(window._ccRTt)clearTimeout(window._ccRTt); window._ccRTt=setTimeout(function(){ try{ if(typeof activeTab==='undefined'||activeTab!=='cierre')return; if(window._ccVista==='metalica'||window._ccVista==='concil'||window._ccVista==='trazabs')return; _ccCargar(function(){ try{ if(_ccAct){ var fr=_ccList.filter(function(x){return x.id===_ccAct.id;})[0]; if(fr){ _ccNorm(fr); _ccAct=fr; var e4=document.getElementById('cierre-content'); if(e4)e4.innerHTML=_ccFormHTML(_ccAct); } } else { var e2=document.getElementById('cierre-content'); if(e2)e2.innerHTML=_ccListaHTML(); } }catch(e){} }); }catch(e){} }, 400); }
function renderCierre(){
  var el=document.getElementById('cierre-content'); if(!el)return;
  if(!_ccFecha)_ccFecha=_ccHoy();
  if(!window._ccPollHook){ window._ccPollHook=true; setInterval(function(){ if(document.hidden||!_ccPuede())return; if(!_ccFecha)_ccFecha=_ccHoy(); _ccCargar(function(){ var tot=0; try{ _ccList.forEach(function(c){ tot+=_ccPendLines(c).length; }); }catch(e){} try{ _ccBadge(tot); }catch(e){} var wasMore=(window._ccPrevPend!=null && tot>window._ccPrevPend); window._ccPrevPend=tot; try{ if(typeof activeTab!=='undefined'&&activeTab==='cierre'&&window._ccVista!=='metalica'&&window._ccVista!=='concil'&&window._ccVista!=='trazabs'){ if(_ccAct){ var fr=_ccList.filter(function(x){return x.id===_ccAct.id;})[0]; if(fr){ var sig=(fr.ver||0)+':'+_ccFirmas.filter(function(f){return f.cierre_id===fr.id;}).length+':'+fr.estado; var ae=document.activeElement; var typ=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'); if(sig!==window._ccActSig && !typ){ _ccNorm(fr); _ccAct=fr; window._ccActSig=sig; var e4=document.getElementById('cierre-content'); if(e4)e4.innerHTML=_ccFormHTML(_ccAct); } } } else { var e2=document.getElementById('cierre-content'); if(e2)e2.innerHTML=_ccListaHTML(); } } }catch(e){} if(wasMore){ try{ _ccBeep(); }catch(e){} try{ if(typeof showToast==='function')showToast('🔔 Nueva firma pendiente en caja'); }catch(e){} } }); }, 5000); }
  if(!window._ccRTHook){ window._ccRTHook=true; try{ supabaseClient.channel('cc-rt').on('postgres_changes',{event:'*',schema:'public',table:'cierres_caja'},function(){_ccRTPing();}).on('postgres_changes',{event:'*',schema:'public',table:'cierre_firmas'},function(){_ccRTPing();}).subscribe(); }catch(e){} }
  if(!window._ccDescHook){ window._ccDescHook=true; setInterval(function(){ try{ if(typeof activeTab==='undefined'||activeTab!=='cierre')return; (_ccList||[]).forEach(function(c){ if(c.estado!=='descanso'||!c.descanso_inicio)return; var r=_ccDescRestante(c); var els=document.querySelectorAll('[data-dtimer="'+c.id+'"]'); for(var i=0;i<els.length;i++){ els[i].textContent=r.txt; } var key='_ccDescAlert_'+c.id; if(r.over && !window[key]){ window[key]=true; try{_ccBeep();}catch(e){} try{ if(typeof showToast==='function')showToast('⏰ Se acabó el descanso de '+(c.cajero||'')+' · '+(c.caja||'')); }catch(e){} } }); }catch(e){} }, 1000); }
  if(_ccAct){ el.innerHTML=_ccFormHTML(_ccAct); return; }
  if(window._ccVista==='metalica'){ el.innerHTML='<div style="padding:16px;color:var(--muted)">Cargando…</div>'; _cmCargar(function(){ el.innerHTML=_cmHTML(); }); return; }
  if(window._ccVista==='trazabs'){ el.innerHTML='<div style="padding:16px;color:var(--muted)">Cargando trazabilidad Bs→$…</div>'; _ccTrazaCargar(function(){ el.innerHTML=_ccTrazaHTML(); }); return; }
  if(window._ccVista==='concil'){ window._ccVista=null; if(typeof showTab==='function')showTab('concil-cajas'); return; }
  el.innerHTML='<div style="padding:16px;color:var(--muted)">Cargando cierres…</div>';
  _ccCargar(function(){ el.innerHTML=_ccListaHTML(); });
}
function _ccCargar(cb){
  try{ supabaseClient.from('app_sections').select('data').eq('section_name','caja_cfg').maybeSingle().then(function(rc){ window._ccCfg=(rc&&rc.data&&rc.data.data)||{}; }); }catch(_e){}
  try{ if(!window._ccCajeros)_ccCajerosCargar(function(){ if(typeof activeTab!=='undefined'&&activeTab==='cierre'&&!_ccAct&&window._ccVista!=='metalica'&&window._ccVista!=='concil'&&window._ccVista!=='trazabs'){ var _e=document.getElementById('cierre-content'); if(_e)_e.innerHTML=_ccListaHTML(); } }); }catch(_e){}
  supabaseClient.from('cierres_caja').select('*').eq('fecha',_ccFecha).eq('empresa',_ccEmp()).order('id',{ascending:true}).then(function(r){ _ccList=(r&&r.data)||[]; _ccList.forEach(_ccNorm); try{ supabaseClient.from('cierre_eventos').select('*').eq('fecha',_ccFecha).order('ts',{ascending:false}).limit(50).then(function(re){ _ccEventos=(re&&re.data)||[]; }); }catch(_e){} var ids=_ccList.map(function(c){return c.id;}); if(ids.length){ supabaseClient.from('cierre_firmas').select('*').in('cierre_id',ids).then(function(rf){ _ccFirmas=(rf&&rf.data)||[]; if(cb)cb(); }); } else { _ccFirmas=[]; if(cb)cb(); } });
}
function _ccSetFecha(v){ _ccFecha=v||_ccHoy(); _ccAct=null; renderCierre(); }
function _ccPendLines(c){ var out=[]; var d=c.data||{}; var NM={zelle:['Zelle','📧','$'],transfer:['Pago móvil / Transferencia','🏦','Bs'],dolares:['Dólares efectivo','💲','$']}; ['zelle','transfer','dolares'].forEach(function(tk){ var me=NM[tk]; (d[tk]||[]).forEach(function(x){ if(_ccNum(x.monto)>0 && x.solic && !_ccFirmada(c.id,x.id)) out.push({cid:c.id,caja:c.caja,cajero:c.cajero,tipo:tk,ic:me[1],metodo:me[0],moneda:me[2],lid:x.id,monto:x.monto,det:(x.titular||x.banco||'')+(x.ref?(' · '+x.ref):'')}); }); }); return out; }
function _ccInboxHTML(){
  var all=[]; _ccList.forEach(function(c){ all=all.concat(_ccPendLines(c)); });
  if(!all.length) return '<div class="tbox" style="padding:12px;margin-bottom:12px;background:#f0fdf4;border:1px solid #86efac"><div style="font-size:13px;color:#166534;font-weight:700">✓ No hay firmas pendientes</div></div>';
  var rows=all.map(function(p){ return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 4px;border-top:1px solid var(--border)"><div style="min-width:0"><div style="font-weight:800;font-size:15px">'+p.ic+' '+esc(p.metodo)+' — '+p.moneda+' '+_ccFmt(p.monto)+'</div><div style="font-size:11.5px;color:var(--muted)">'+esc(p.caja||'')+' · '+esc(p.cajero||'')+(p.det?(' · '+esc(p.det)):'')+'</div></div><button class="btn btn-green btn-sm" style="flex:none" onclick="_ccFirmar('+p.cid+',\''+p.tipo+'\',\''+p.lid+'\','+_ccNum(p.monto)+')">✍ Firmar</button></div>'; }).join('');
  return '<div class="tbox" style="padding:12px;margin-bottom:12px;background:#fff7ed;border:1px solid #fdba74"><div style="font-weight:800;font-size:14px;color:#9a3412;margin-bottom:2px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>Firmas pendientes ('+all.length+')</div><div style="font-size:11px;color:#9a3412;margin-bottom:4px">Verifica el pago en el banco y firma.</div>'+rows+'</div>';
}
var _CC_BANCOS_PM=['Mercantil','Provincial','Banesco','Banco del Tesoro','Bancaribe','BNC'];
function _ccBancoDlg(cid,lid,monto,modo){
  var c=_ccList.filter(function(x){return x.id===cid;})[0]||_ccAct; if(!c)return;
  var ln=(((c.data||{}).transfer)||[]).filter(function(x){return x.id===lid;})[0]; if(!ln){ showToast&&showToast('No encontré la transferencia'); return; }
  var ov=document.createElement('div'); ov.id='cc-banco-ov'; ov.style.cssText='position:fixed;inset:0;background:rgba(15,20,40,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=function(e){ if(e.target===ov)ov.remove(); };
  var opts=_CC_BANCOS_PM.map(function(b){ return '<option'+(b===(ln.banco||'')?' selected':'')+'>'+b+'</option>'; }).join('');
  ov.innerHTML='<div style="background:var(--surface);border-radius:16px;max-width:400px;width:100%;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()">'+
    '<div style="font-weight:800;font-size:15px;margin-bottom:4px">'+(modo==='firma'?'🏦 Verifica antes de firmar':'✎ Corregir banco')+'</div>'+
    '<div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Pago móvil de <b>Bs '+_ccFmt(ln.monto)+'</b> · ref <b>'+esc(ln.ref||'—')+'</b><br>'+(modo==='firma'?'Revisa en el teléfono/app del banco que el abono <b>sí llegó</b> y a qué banco.':'Cambia el banco si el cajero se equivocó.')+'</div>'+
    '<label style="font-size:11px;font-weight:700;color:var(--muted)">BANCO DONDE LLEGÓ</label>'+
    '<select id="cc-banco-sel2" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:14px;font-weight:700;margin:4px 0 14px">'+opts+'</select>'+
    '<button class="btn btn-green" style="width:100%;padding:11px" onclick="_ccBancoOK('+cid+',\''+lid+'\','+(monto||0)+',\''+modo+'\')">'+(modo==='firma'?'✓ Llegó a este banco — Firmar':'💾 Guardar banco')+'</button>'+
    '<button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="document.getElementById(\'cc-banco-ov\').remove()">Cancelar</button></div>';
  document.body.appendChild(ov);
}
function _ccBancoOK(cid,lid,monto,modo){
  var sel=document.getElementById('cc-banco-sel2'); var nuevo=sel?sel.value:''; var ov=document.getElementById('cc-banco-ov'); if(ov)ov.remove();
  var c=_ccList.filter(function(x){return x.id===cid;})[0]||_ccAct; if(!c)return;
  var ln=(((c.data||{}).transfer)||[]).filter(function(x){return x.id===lid;})[0]; if(!ln)return;
  var viejo=ln.banco||'';
  var fin=function(){ if(modo==='firma'){ _ccFirmar(cid,'transfer',lid,monto,true); } else { renderCierre(); showToast&&showToast('✓ Banco actualizado'); } };
  if(nuevo && nuevo!==viejo){
    ln.banco=nuevo;
    supabaseClient.from('cierres_caja').update({data:c.data,actualizado_en:new Date().toISOString()}).eq('id',c.id).then(function(){
      try{ supabaseClient.from('cierre_eventos').insert([{cierre_id:c.id,fecha:c.fecha,caja:c.caja||'',cajero:c.cajero||'',tipo:'banco_corregido',metodo:'Pago móvil',moneda:'Bs',monto:_ccNum(ln.monto),detalle:'ref '+(ln.ref||'—')+': '+viejo+' → '+nuevo+' · por '+(typeof currentUser!=='undefined'?currentUser:'—')}]); }catch(e){}
      if(typeof logAudit==='function')logAudit('cierre.banco_corregido',viejo+'→'+nuevo);
      fin();
    });
  } else fin();
}
function _ccFirmar(cid,tipo,lid,monto,_ok){ if(!_ccPuede())return;
  if(tipo==='transfer' && !_ok){ _ccBancoDlg(cid,lid,monto,'firma'); return; } var quien=(typeof currentUser!=='undefined'?currentUser:'—'); var _cc=_ccList.filter(function(x){return x.id===cid;})[0]||{}; var _line=(((_cc.data||{})[tipo])||[]).filter(function(y){return y.id===lid;})[0]; var mtReal=_ccNum(_line?_line.monto:monto); supabaseClient.from('cierre_firmas').insert([{cierre_id:cid,linea_id:lid,tipo:tipo,monto:mtReal,firmado_por:quien,firmado_at:new Date().toISOString()}]).then(function(r){ if(r&&r.error){ supabaseClient.from('cierre_firmas').select('firmado_por').eq('cierre_id',cid).eq('linea_id',lid).maybeSingle().then(function(rf){ var q=(rf&&rf.data&&rf.data.firmado_por)||'otro supervisor'; if(typeof showToast==='function')showToast('⚠ Ya la firmó '+q); _ccCargar(function(){ renderCierre(); }); }); return; } if(typeof logAudit==='function')logAudit('cierre.firma',cid+' '+tipo+' '+mtReal+' · '+quien); if(tipo==='dolares'){ supabaseClient.from('caja_metalica').insert([{tipo:'entrada',monto:mtReal,cajero:(_cc.cajero||''),motivo:'Dólares efectivo · '+(_cc.caja||''),empresa:_ccEmp(),origen_cierre:cid,origen_linea:lid,registrado_por:quien}]).then(function(){}); } _ccCargar(function(){ renderCierre(); }); }); }
function _ccQuitarFirma(cid,lid){ if(!_ccPuede())return; if(!confirm('¿Quitar la firma de esta línea?'))return; supabaseClient.from('cierre_firmas').delete().eq('cierre_id',cid).eq('linea_id',lid).then(function(){ supabaseClient.from('caja_metalica').delete().eq('origen_linea',lid).then(function(){ _ccCargar(function(){ renderCierre(); }); }); }); }
function _ccEventosHTML(){ var ev=(_ccEventos||[]).filter(function(e){return e.tipo==='borrado'||e.tipo==='reapertura';}); if(!ev.length)return ''; var rows=ev.slice(0,20).map(function(e){ var hora=''; try{ hora=new Date(e.ts).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}); }catch(_){} if(e.tipo==='reapertura'){ return '<div style="padding:7px 2px;border-top:1px solid #fde68a;font-size:12px;color:#7c2d12">↩ <b>'+esc(e.caja||'')+' · '+esc(e.cajero||'')+'</b> reabierta — '+esc(e.detalle||'')+' <span style="color:#a16207">· '+hora+'</span></div>'; } return '<div style="padding:7px 2px;border-top:1px solid #fde68a;font-size:12px;color:#7c2d12">🗑️ <b>'+esc(e.caja||'')+' · '+esc(e.cajero||'')+'</b> borró '+esc(e.metodo||'')+' de '+esc(e.moneda||'')+' '+_ccFmt(e.monto)+(e.detalle?(' ('+esc(e.detalle)+')'):'')+' <span style="color:#a16207">· '+hora+'</span></div>'; }).join(''); return '<div class="tbox" style="padding:12px;margin-bottom:12px;background:#fffbeb;border:1px solid #fde68a"><div style="font-weight:800;font-size:13px;color:#92400e;margin-bottom:2px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>Movimientos registrados ('+ev.length+')</div><div style="font-size:11px;color:#a16207;margin-bottom:2px">Borrados y reaperturas quedan aquí como rastro permanente.</div>'+rows+'</div>'; }
function _ccCajerosCargar(cb){ try{ supabaseClient.from('empleados').select('nombre,cargo,empresa,activo').eq('empresa','FARMACIA').order('nombre').then(function(r){ var rows=(r&&r.data)||[]; var out=[]; rows.forEach(function(e){ if(e.activo===false)return; if(((e.cargo||'').toLowerCase()).indexOf('caja')<0)return; var nm=(e.nombre||'').trim(); if(!nm||nm.toUpperCase()==='NUEVO')return; if(out.map(function(x){return x.toLowerCase();}).indexOf(nm.toLowerCase())<0)out.push(nm); }); window._ccCajeros=out; if(cb)cb(); }).catch(function(){ if(cb)cb(); }); }catch(_e){ if(cb)cb(); } }
function _ccListaHTML(){
  var inp='padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px';
  var CAJAS=['Caja 1','Caja 2','Caja 3','Caja 4','Caja 5','Caja 6','YaPagué 1','YaPagué 2','YaPagué 3'];
  var byCaja={}; _ccList.forEach(function(c){ (byCaja[c.caja]=byCaja[c.caja]||[]).push(c); });
  Object.keys(byCaja).forEach(function(k){ if(CAJAS.indexOf(k)<0)CAJAS.push(k); });
  function cube(nombre){
    var arr=(byCaja[nombre]||[]).slice().sort(function(a,b){return (a.id||0)-(b.id||0);});
    var active=arr.filter(function(c){return c.estado==='abierto'||c.estado==='por_confirmar'||c.estado==='descanso';}).slice(-1)[0];
    var show=active||arr.slice(-1)[0]||null;
    if(!show){ return '<div class="cc-cube cc-libre"><div class="cc-cube-top"><span class="cc-cube-n" style="color:#B4B8C0">'+esc(nombre)+'</span><span style="width:7px;height:7px;border-radius:50%;background:#D8DBE0;flex:none"></span></div><div class="cc-cube-mid" style="color:#C2C6CD">Sin cajero</div><div class="cc-cube-tot" style="color:#D8DBE0">—</div><div class="cc-cube-bot" style="color:#C2C6CD">Libre</div></div>'; }
    var t=_ccTot(show); var pend=arr.reduce(function(a,c){return a+_ccPendLines(c).length;},0); var est=show.estado||'abierto';
    var prevs=arr.filter(function(c){return c.id!==show.id;});
    var prevHtml=prevs.length?('<div style="border-top:1px dashed var(--border);margin-top:6px;padding-top:5px">'+prevs.map(function(p){ var pt=_ccTot(p); return '<div onclick="event.stopPropagation();_ccOpen('+p.id+')" title="Ver turno de '+esc(p.cajero||'')+'" style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between;gap:6px;padding:2px 0;cursor:pointer"><span>↩ '+esc(p.cajero||'—')+' · '+_ccHora(p.abierto_en)+(p.cerrado_en?('—'+_ccHora(p.cerrado_en)):'')+'</span><span style="font-weight:700;white-space:nowrap">Bs '+_ccFmt(pt.totalBs)+(pt.totalUsd>0?(' · $'+_ccFmt(pt.totalUsd)):'')+'</span></div>'; }).join('')+'</div>'):'';
    if(pend>0){ return '<div class="cc-cube cc-pend" onclick="_ccOpen('+show.id+')"><div class="cc-cube-top"><span class="cc-cube-n" style="color:#fff">'+esc(nombre)+'</span><span class="cc-chip" style="background:#fff;color:#dc2626;font-size:13px">🔔 '+pend+'</span></div><div style="color:#fff;font-weight:800;font-size:15px">'+esc(show.cajero||'—')+'</div><div style="color:#fff;font-size:12.5px;opacity:.97;margin-top:auto">⚠ '+pend+' pago(s) esperan tu firma</div><div style="color:#fff;font-weight:900;font-size:13.5px;letter-spacing:.4px">👉 TOCA PARA FIRMAR</div>'+(prevs.length?('<div style="font-size:10.5px;color:rgba(255,255,255,.85);margin-top:2px">↩ antes: '+prevs.map(function(p){return esc(p.cajero||'—');}).join(', ')+'</div>'):'')+'</div>'; }
    var cls='cc-ok', chipcls='cc-chip-ok', chiptx='● Abierta';
    if(pend>0){ cls='cc-pend'; chipcls='cc-chip-pend'; chiptx='🔔 '+pend+' firma'+(pend>1?'s':''); }
    else if(est==='descanso'){ cls='cc-relevo'; chipcls='cc-chip-relevo'; chiptx='☕ '+_ccDescRestante(show).txt; }
    else if(est==='por_confirmar'){ cls=(show.descanso||show.relevo)?'cc-relevo':'cc-cierre'; chipcls=(show.descanso||show.relevo)?'cc-chip-relevo':'cc-chip-cierre'; chiptx=show.descanso?'☕ Descanso':(show.relevo?'🔄 Relevo':'Pide cierre'); }
    else if(est==='cerrado'){ cls='cc-cerr'; chipcls='cc-chip-cerr'; chiptx='✓ Cerrada'; }
    var DOT={'cc-ok':'#079455','cc-cerr':'#079455','cc-cierre':'#1E38A6','cc-relevo':'#7C3AED'}[cls]||'#98A2B3';
    var horario=_ccHora(show.abierto_en)+(show.cerrado_en?(' — '+_ccHora(show.cerrado_en)):' · en curso');
    return '<div class="cc-cube '+cls+'" onclick="_ccOpen('+show.id+')">'+
      '<div class="cc-cube-top"><span class="cc-cube-n">'+esc(nombre)+'</span><span style="width:7px;height:7px;border-radius:50%;background:'+DOT+';box-shadow:0 0 0 3px '+DOT+'22,0 0 9px '+DOT+'99;flex:none"></span></div>'+
      '<div class="cc-cube-mid">'+esc(show.cajero||'—')+'</div>'+
      '<div class="cc-cube-tot">Bs '+_ccFmt(t.totalBs)+'</div>'+(t.totalUsd>0?('<div style="font-size:14px;font-weight:700;color:#079455;margin-top:-3px">$ '+_ccFmt(t.totalUsd)+'</div>'):'')+
      '<div class="cc-cube-bot">'+chiptx.replace(/^[^ ]* /,'')+' · '+horario+'</div>'+prevHtml+
    '</div>';
  }
  var cubes=CAJAS.map(cube).join('');
  var css='<style>.cc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}.cc-cube{border:2px solid var(--border);border-radius:16px;padding:14px;background:var(--surface);cursor:pointer;transition:transform .12s,box-shadow .12s;min-height:118px;display:flex;flex-direction:column;gap:6px}.cc-cube:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.1)}.cc-cube-top{display:flex;justify-content:space-between;align-items:center;gap:6px}.cc-cube-n{font-weight:800;font-size:16px}.cc-cube-mid{font-size:13px;color:var(--muted);font-weight:600}.cc-cube-tot{font-size:22px;font-weight:900;margin-top:auto}.cc-cube-bot{font-size:10.5px;color:var(--muted)}.cc-chip{font-size:10px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap}.cc-libre{opacity:.6;border-style:dashed;cursor:default}.cc-chip-libre{background:var(--surface2);color:var(--muted)}.cc-ok{border-color:#bbf7d0}.cc-chip-ok{background:#dcfce7;color:#166534}.cc-cerr{border-color:#bbf7d0;background:#f0fdf4}.cc-chip-cerr{background:#16a34a;color:#fff}.cc-cierre{border-color:#bfdbfe;background:#eff6ff}.cc-chip-cierre{background:#2563eb;color:#fff}.cc-relevo{border-color:#ddd6fe;background:#f5f3ff}.cc-chip-relevo{background:#7c3aed;color:#fff}.cc-pend{border-color:#dc2626;background:linear-gradient(135deg,#dc2626,#ef4444);animation:ccpulse 0.9s ease-in-out infinite}.cc-chip-pend{background:#dc2626;color:#fff}@keyframes ccpulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.55)}50%{box-shadow:0 0 0 9px rgba(220,38,38,0)}}</style>';
  var _sv=function(p,z){ return '<svg width="'+(z||15)+'" height="'+(z||15)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px">'+p+'</svg>'; };
  var _act=_ccList.filter(function(c){return c.estado==='abierto'||c.estado==='por_confirmar'||c.estado==='descanso';}).length;
  var _tdia=0,_tdiaU=0; _ccList.forEach(function(c){ var tt=_ccTot(c); _tdia+=tt.totalBs; _tdiaU+=tt.totalUsd; });
  return css+'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:16px">'+
    '<div><div style="font-size:18px;font-weight:600;letter-spacing:-.3px;color:var(--text)">Cierre de caja</div>'+
    '<div style="font-size:12px;color:var(--muted);margin-top:2px">'+_ccFechaLarga(_ccFecha)+' · '+_ccList.length+' turno(s) · '+_act+' activa(s) · <span style="font-variant-numeric:tabular-nums">Bs '+_ccFmt(_tdia)+' · $ '+_ccFmt(_tdiaU)+'</span> <span style="opacity:.6">· actualizado '+new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'})+'</span></div></div>'+
    '<div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><input type="date" value="'+_ccFecha+'" onchange="_ccSetFecha(this.value)" style="'+inp+'"><button class="btn btn-ghost btn-sm" onclick="_ccExportDia()">'+_sv('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>')+'Excel</button><button class="btn btn-ghost btn-sm" onclick="_ccSetVista(\'trazabs\')" title="Trazabilidad: los Bs de cada día valorados en $ a la tasa de ese día">'+_sv('<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>')+'Bs→$</button><button class="btn btn-ghost btn-sm" onclick="_ccSetVista(\'metalica\')">'+_sv('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v-1M12 17v-1"/>')+'Caja metálica</button><button class="btn btn-ghost btn-sm" onclick="activarPush(this)">'+_sv('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>')+'Avisos</button><button class="btn btn-ghost btn-sm" onclick="_ccCargar(function(){renderCierre();})">'+_sv('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>')+'</button></div></div>'+
    
    
    _ccInboxHTML()+_ccEventosHTML()+
    '<div class="cc-grid">'+cubes+'</div>';
}
function _ccOpen(id){ var c=_ccList.filter(function(x){return x.id===id;})[0]; if(!c)return; _ccNorm(c); _ccAct=c; window._ccActSig=(c.ver||0)+':'+_ccFirmas.filter(function(f){return f.cierre_id===c.id;}).length+':'+c.estado; renderCierre(); }
function _ccVolver(){ _ccAct=null; _ccCargar(function(){ renderCierre(); }); }
function _ccTotM(c){ var d=c.data||{}, tasa=_ccNum(d.tasa); var ef=0; _CC_DENOM.forEach(function(dn){ef+=dn*_ccNum((d.efectivo||{})[dn]);}); var dolU=(d.dolares||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); var zelU=(d.zelle||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); var tr=(d.transfer||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); var de=(d.debito||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); var cr=(d.credito||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); var ga=(d.gastos||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); var ventaEf=(d.efectivobs||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); var fondo=_ccNum(d.fondo_bs); var fzVN=_ccNum(d.fiscal_ventas_netas)+_ccNum(d.fiscal_ventas_netas2), fzCR=_ccNum(d.fiscal_creditos), fzREP=_ccNum(d.fiscal_reposicion); var fiscalTotalCaja=ef+de+tr+cr+(dolU*tasa)+(zelU*tasa)+ga; var fiscalCuadre=fzVN-fzCR; var fiscalDif=fiscalTotalCaja-fiscalCuadre-fzREP; return {ef:ef,fondo:fondo,ventaEf:ventaEf,dolU:dolU,zelU:zelU,tr:tr,de:de,cr:cr,ga:ga,total:ventaEf+tr+de+cr,totalUsd:dolU+zelU,fiscalVN:fzVN,fiscalCR:fzCR,fiscalREP:fzREP,fiscalTotalCaja:fiscalTotalCaja,fiscalCuadre:fiscalCuadre,fiscalDif:fiscalDif}; }
/* ===== Trazabilidad Bs→$ : los Bs de cada día quedan valorados en $ con la tasa de ESE día (no se devalúan) ===== */
function _ccTrazaMesGet(){ if(!window._ccTrazaMes)window._ccTrazaMes=(_ccFecha||_ccHoy()).slice(0,7); return window._ccTrazaMes; }
function _ccTrazaSetMes(v){ if(v){ window._ccTrazaMes=v; renderCierre(); } }
function _ccTrazaCargar(cb){ var mes=_ccTrazaMesGet(); try{ supabaseClient.from('ventas_diarias').select('fecha,total_bs,total_usd,tasa').gte('fecha',mes+'-01').lte('fecha',mes+'-31').eq('empresa',_ccEmp()).order('fecha',{ascending:true}).then(function(r){ window._ccTrazaRows=(r&&r.data)||[]; if(cb)cb(); }).catch(function(){ window._ccTrazaRows=[]; if(cb)cb(); }); }catch(e){ window._ccTrazaRows=[]; if(cb)cb(); } }
function _ccTasaHoy(){ try{ if(typeof getTasa==='function'){ var t=Number(getTasa()); if(t>0)return t; } }catch(e){} try{ var rr=(window._ccTrazaRows||[]); for(var i=rr.length-1;i>=0;i--){ var t2=_ccNum(rr[i].tasa); if(t2>0)return t2; } }catch(e){} return 0; }
function _ccTrazaHTML(){
  var rows=(window._ccTrazaRows||[]); var mes=_ccTrazaMesGet(); var tasaHoy=_ccTasaHoy();
  var mesLbl=(function(){ try{ return new Date(mes+'-02').toLocaleDateString('es-VE',{month:'long',year:'numeric'}); }catch(e){ return mes; } })();
  var back='<button class="btn btn-ghost btn-sm" onclick="_ccSetVista(null)">← Volver</button>';
  var head='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px">'+back+'<span style="font-weight:800;font-size:17px">💱 Trazabilidad Bs → $</span></div>'+
    '<div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><input type="month" value="'+mes+'" onchange="_ccTrazaSetMes(this.value)" style="padding:7px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"><button class="btn btn-ghost btn-sm" onclick="_ccTrazaExcel()">📥 Excel</button></div></div>';
  var intro='<div style="font-size:12px;color:var(--muted);background:var(--surface2);border:1px dashed var(--border);border-radius:9px;padding:9px 11px;margin-bottom:12px;line-height:1.5">Cada día, los <b>bolívares que entraron</b> quedan valorados en <b>dólares con la tasa de ESE día</b>. Ese valor en $ ya <b>no se devalúa</b> aunque la tasa suba después. Datos del consolidado diario (<code>ventas_diarias</code>).</div>';
  if(!rows.length) return head+intro+'<div class="tbox" style="padding:18px;text-align:center;color:var(--muted);font-size:13px">Sin consolidado diario en '+esc(mesLbl)+'. Aparece cuando se cierran las cajas del día.</div>';
  var tBs=0,tUsd=0,acum=0;
  var body=rows.map(function(x){ var bs=_ccNum(x.total_bs), usd=_ccNum(x.total_usd), tasa=_ccNum(x.tasa); tBs+=bs; tUsd+=usd; acum+=usd;
    return '<tr style="border-top:1px solid var(--border)">'+
      '<td style="padding:6px 8px;font-size:12px;white-space:nowrap">'+esc(String(x.fecha).slice(0,10))+'</td>'+
      '<td style="padding:6px 8px;text-align:right;font-weight:700">Bs '+_ccFmt(bs)+'</td>'+
      '<td style="padding:6px 8px;text-align:right;color:var(--muted)">'+(tasa>0?_ccFmt(tasa):'—')+'</td>'+
      '<td style="padding:6px 8px;text-align:right;font-weight:800;color:var(--green,#166534)">$ '+_ccFmt(usd)+'</td>'+
      '<td style="padding:6px 8px;text-align:right;font-weight:700;color:var(--muted)">$ '+_ccFmt(acum)+'</td></tr>';
  }).join('');
  var tabla='<div class="tbox" style="padding:0;overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--surface2)"><th style="text-align:left;padding:7px 8px;font-size:10.5px">Fecha</th><th style="text-align:right;padding:7px 8px;font-size:10.5px">Entró (Bs)</th><th style="text-align:right;padding:7px 8px;font-size:10.5px">Tasa del día</th><th style="text-align:right;padding:7px 8px;font-size:10.5px">Valor bloqueado ($)</th><th style="text-align:right;padding:7px 8px;font-size:10.5px">$ acumulado</th></tr></thead><tbody>'+body+
    '<tr style="border-top:2px solid var(--border);background:var(--surface2)"><td style="padding:8px;font-weight:800">TOTAL '+esc(mesLbl)+'</td><td style="padding:8px;text-align:right;font-weight:800">Bs '+_ccFmt(tBs)+'</td><td></td><td style="padding:8px;text-align:right;font-weight:900;color:var(--green,#166534)">$ '+_ccFmt(tUsd)+'</td><td></td></tr>'+
    '</tbody></table></div>';
  var valorHoy=tasaHoy>0?(tBs/tasaHoy):0; var preservado=_ccR2(tUsd-valorHoy);
  var insight=(tasaHoy>0)?('<div class="tbox" style="padding:12px 14px;margin-top:12px;background:'+(preservado>=0?'#f0fdf4;border:1px solid #bbf7d0':'#fff7ed;border:1px solid #fdba74')+'"><div style="font-size:12.5px;line-height:1.55">Esos <b>Bs '+_ccFmt(tBs)+'</b> valorados día a día valen <b>$ '+_ccFmt(tUsd)+'</b>. A la tasa de hoy ('+_ccFmt(tasaHoy)+') esos mismos Bs valdrían <b>$ '+_ccFmt(valorHoy)+'</b>.'+(preservado>0.005?(' Al bloquearlos con la tasa de cada día <b style="color:#166534">conservaste $ '+_ccFmt(preservado)+'</b> que se habrían perdido por devaluación. 🛡️'):(preservado< -0.005?(' (La tasa bajó: hoy valdrían $ '+_ccFmt(-preservado)+' más.)'):' Sin variación relevante.'))+'</div></div>'):'';
  return head+intro+tabla+insight;
}
function _ccR2(n){ return Math.round((Number(n)||0)*100)/100; }
function _ccTrazaExcel(){
  var rows=(window._ccTrazaRows||[]); var mes=_ccTrazaMesGet();
  if(!rows.length){ if(typeof showToast==='function')showToast('No hay datos en '+mes); return; }
  var tasaHoy=_ccTasaHoy();
  var head=['Fecha','Entro (Bs)','Tasa del dia','Valor bloqueado ($)','$ acumulado'];
  var out=[head.join(';')]; var tBs=0,tUsd=0,acum=0;
  rows.forEach(function(x){ var bs=_ccNum(x.total_bs),usd=_ccNum(x.total_usd),tasa=_ccNum(x.tasa); tBs+=bs; tUsd+=usd; acum+=usd; out.push([String(x.fecha).slice(0,10),bs.toFixed(2),(tasa?tasa.toFixed(2):''),usd.toFixed(2),acum.toFixed(2)].join(';')); });
  out.push('');
  out.push(['TOTAL '+mes,tBs.toFixed(2),'',tUsd.toFixed(2),''].join(';'));
  if(tasaHoy>0){ var vHoy=tBs/tasaHoy; out.push(['A la tasa de hoy ('+tasaHoy.toFixed(2)+')','','',vHoy.toFixed(2),''].join(';')); out.push(['Preservado por bloqueo diario','','',(tUsd-vHoy).toFixed(2),''].join(';')); }
  var csv='\uFEFF'+out.join('\r\n');
  try{ var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='trazabilidad_bs_usd_'+mes+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){try{a.remove();}catch(e){}},400); if(typeof logAudit==='function')logAudit('cierre.trazabs',mes); if(typeof showToast==='function')showToast('📥 Descargado trazabilidad_bs_usd_'+mes+'.csv'); }catch(e){ if(typeof showToast==='function')showToast('No se pudo generar el archivo'); }
}
function _ccExportDia(){
  if(!_ccList.length){ if(typeof showToast==='function')showToast('No hay cajas ese día'); return; }
  if(typeof showToast==='function')showToast('Generando Excel…');
  _retoLoadExcelJS(function(ok){
    if(!ok||!window.ExcelJS){ if(typeof showToast==='function')showToast('No se pudo cargar Excel'); return; }
    var wb=new ExcelJS.Workbook();
    var ws=wb.addWorksheet('Resumen',{views:[{state:'frozen',ySplit:1}]});
    ws.columns=[{header:'Caja',key:'caja',width:12},{header:'Cajero',key:'cajero',width:18},{header:'Estado',key:'estado',width:13},{header:'Fondo Bs',key:'fondo',width:11},{header:'Efect. venta Bs',key:'ef',width:15},{header:'Dólares $',key:'dolU',width:11},{header:'Zelle $',key:'zelU',width:11},{header:'Transfer. Bs',key:'tr',width:14},{header:'Débito Bs',key:'de',width:12},{header:'Crédito Bs',key:'cr',width:12},{header:'Gastos Bs',key:'ga',width:12},{header:'TOTAL Bs',key:'total',width:14},{header:'TOTAL $',key:'totusd',width:12},{header:'Ventas Netas',key:'fzvn',width:14},{header:'Créditos',key:'fzcr',width:12},{header:'Total Cuadre Fiscal',key:'fzcuadre',width:16},{header:'Reposición',key:'fzrep',width:12},{header:'Diferencia Fiscal',key:'fzdif',width:14},{header:'Confirmó',key:'conf',width:16}];
    var hr=ws.getRow(1); hr.height=22; hr.eachCell(function(c){ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1E38A6'}}; c.alignment={horizontal:'center',vertical:'middle',wrapText:true}; });
    var T={fondo:0,ef:0,dolU:0,zelU:0,tr:0,de:0,cr:0,ga:0,total:0,totusd:0,fzvn:0,fzcr:0,fzcuadre:0,fzrep:0,fzdif:0};
    _ccList.forEach(function(c){ var m=_ccTotM(c); T.fondo+=m.fondo;T.ef+=m.ventaEf;T.dolU+=m.dolU;T.zelU+=m.zelU;T.tr+=m.tr;T.de+=m.de;T.cr+=m.cr;T.ga+=m.ga;T.total+=m.total;T.totusd+=m.totalUsd;T.fzvn+=m.fiscalVN;T.fzcr+=m.fiscalCR;T.fzcuadre+=m.fiscalCuadre;T.fzrep+=m.fiscalREP;T.fzdif+=m.fiscalDif; ws.addRow({caja:c.caja||'',cajero:c.cajero||'',estado:(c.estado==='cerrado'?'Cerrada':(c.estado==='por_confirmar'?'Pide cierre':'Abierta')),fondo:m.fondo,ef:m.ventaEf,dolU:m.dolU,zelU:m.zelU,tr:m.tr,de:m.de,cr:m.cr,ga:m.ga,total:m.total,totusd:m.totalUsd,fzvn:m.fiscalVN,fzcr:m.fiscalCR,fzcuadre:m.fiscalCuadre,fzrep:m.fiscalREP,fzdif:m.fiscalDif,conf:c.confirmado_por||''}); });
    var trT=ws.addRow({caja:'TOTAL',cajero:'',estado:'',fondo:T.fondo,ef:T.ef,dolU:T.dolU,zelU:T.zelU,tr:T.tr,de:T.de,cr:T.cr,ga:T.ga,total:T.total,totusd:T.totusd,fzvn:T.fzvn,fzcr:T.fzcr,fzcuadre:T.fzcuadre,fzrep:T.fzrep,fzdif:T.fzdif,conf:''}); trT.eachCell(function(c){ c.font={bold:true}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE5E7EB'}}; });
    ws.autoFilter='A1:S1';
    var wd=wb.addWorksheet('Detalle de pagos',{views:[{state:'frozen',ySplit:1}]});
    wd.columns=[{header:'Caja',key:'caja',width:12},{header:'Cajero',key:'cajero',width:16},{header:'Método',key:'m',width:24},{header:'Moneda',key:'mo',width:8},{header:'Monto',key:'monto',width:12},{header:'Referencia / Titular',key:'ref',width:28},{header:'Firmado por',key:'firma',width:16}];
    var hd=wd.getRow(1); hd.height=22; hd.eachCell(function(c){ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1E38A6'}}; c.alignment={horizontal:'center'}; });
    var MN={efectivobs:['Efectivo (Bs)','Bs'],dolares:['Dólares efectivo','$'],zelle:['Zelle','$'],transfer:['Pago móvil / Transferencia','Bs'],debito:['T. Débito','Bs'],credito:['T. Crédito','Bs'],gastos:['Gasto','Bs']};
    _ccList.forEach(function(c){ var d=c.data||{}; ['efectivobs','dolares','zelle','transfer','debito','credito','gastos'].forEach(function(k){ (d[k]||[]).forEach(function(x){ var f=_ccFirmaDe(c.id,x.id); wd.addRow({caja:c.caja||'',cajero:c.cajero||'',m:MN[k][0],mo:MN[k][1],monto:_ccNum(x.monto),ref:(x.titular||x.banco||x.concepto||x.ref||x.fact||''),firma:(f?f.firmado_por:'')}); }); }); });
    wd.autoFilter='A1:G1';
    wb.xlsx.writeBuffer().then(function(buf){ var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cierres_'+_ccFecha+'.xlsx'; a.click(); setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(e){}},3000); if(typeof showToast==='function')showToast('✓ Excel descargado'); if(typeof logAudit==='function')logAudit('cierre.export',_ccFecha); }).catch(function(e){ if(typeof showToast==='function')showToast('Error: '+((e&&e.message)||e)); });
  });
}

function _ccTot(c){ var d=c.data||{}; var tasa=_ccNum(d.tasa);
  var efBs=0; _CC_DENOM.forEach(function(dn){ efBs+=dn*(_ccNum((d.efectivo||{})[dn])); });
  var dolUsd=(d.dolares||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0);
  var zelUsd=(d.zelle||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0);
  var transBs=(d.transfer||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0);
  var debBs=(d.debito||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0);
  var credBs=(d.credito||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0);
  var gastosBs=(d.gastos||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0);
  var ventaEf=(d.efectivobs||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); var fondo=_ccNum(d.fondo_bs); var espEf=ventaEf; var descEf=(efBs>0)?(efBs-espEf):0;
  var dolBs=dolUsd*tasa, zelBs=zelUsd*tasa; var totalBs=ventaEf+transBs+debBs+credBs; var totalUsd=dolUsd+zelUsd; var total=totalBs;
  var fiscalVN=_ccNum(d.fiscal_ventas_netas)+_ccNum(d.fiscal_ventas_netas2), fiscalCR=_ccNum(d.fiscal_creditos), fiscalREP=_ccNum(d.fiscal_reposicion);
  var fiscalTotalCaja=efBs+debBs+transBs+credBs+dolBs+zelBs+gastosBs;
  var fiscalCuadre=fiscalVN-fiscalCR; var fiscalDif=fiscalTotalCaja-fiscalCuadre-fiscalREP;
  return {tasa:tasa,efBs:efBs,fondo:fondo,ventaEf:ventaEf,espEf:espEf,descEf:descEf,dolUsd:dolUsd,dolBs:dolBs,zelUsd:zelUsd,zelBs:zelBs,transBs:transBs,debBs:debBs,credBs:credBs,gastosBs:gastosBs,total:totalBs,totalBs:totalBs,totalUsd:totalUsd,neto:totalBs-gastosBs,fiscalVN:fiscalVN,fiscalCR:fiscalCR,fiscalREP:fiscalREP,fiscalTotalCaja:fiscalTotalCaja,fiscalCuadre:fiscalCuadre,fiscalDif:fiscalDif};
}
function _ccFormHTML(c){
  var d=c.data; var t=_ccTot(c); var cerr=(c.estado==='cerrado');
  var head='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px"><button class="btn btn-ghost btn-sm" onclick="_ccVolver()">← Cajas</button><div style="font-weight:800;font-size:16px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>'+esc(c.caja||'')+' · '+esc(c.cajero||'')+'</div><div style="font-size:12px;color:var(--muted)">'+esc(c.fecha||'')+' · tasa '+_ccFmt(d.tasa)+'</div>'+(cerr?'<span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">✓ Cerrada</span>':(c.estado==='por_confirmar'?(c.relevo?'<span style="background:#ede9fe;color:#5b21b6;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">🔄 Relevo · verifica y autoriza</span>':'<span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">Cajero pidió cierre</span>'):''))+'</div>';
  // efectivo (solo lectura)
  var den=_CC_DENOM.map(function(dn){ var cc=_ccNum((d.efectivo||{})[dn]); return cc>0?('<tr><td style="padding:2px 6px;font-weight:600">Bs '+dn+'</td><td style="padding:2px 6px;text-align:center">'+cc+'</td><td style="padding:2px 6px;text-align:right;font-weight:600">'+_ccFmt(dn*cc)+'</td></tr>'):''; }).join('');
  var sEf='<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="font-weight:700;font-size:13px;margin-bottom:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>Efectivo (Bs)</div>'+(den?('<table style="width:100%;font-size:12px">'+den+'</table>'):'<div style="font-size:12px;color:var(--muted)">Sin efectivo.</div>')+'<div style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px;font-size:12px"><div style="display:flex;justify-content:space-between;font-weight:800;color:var(--green)"><span>Venta efectivo (registrada)</span><span>Bs '+_ccFmt(t.ventaEf)+'</span></div><div style="display:flex;justify-content:space-between"><span class="muted">Fondo inicial</span><span>Bs '+_ccFmt(t.fondo)+'</span></div><div style="display:flex;justify-content:space-between"><span class="muted">Debe haber contado (venta, fondo aparte)</span><span>Bs '+_ccFmt(t.espEf)+'</span></div><div style="display:flex;justify-content:space-between"><span class="muted">Contado (arqueo)</span><span>Bs '+_ccFmt(t.efBs)+'</span></div>'+(t.efBs>0?('<div style="display:flex;justify-content:space-between;font-weight:800;color:'+(Math.abs(t.descEf)<0.5?'var(--green)':'var(--red)')+'"><span>Descuadre</span><span>'+(Math.abs(t.descEf)<0.5?'✓ cuadra':((t.descEf>0?'+':'')+_ccFmt(t.descEf)))+'</span></div>'):'')+'</div></div>';
  function lista(tipo,titulo,firma,ic,cols){
    var arr=d[tipo]||[]; if(!arr.length && !firma) return '';
    var _cur=(tipo==='zelle'||tipo==='dolares')?'$':'Bs';
    var body=arr.map(function(x){
      var cells=cols.map(function(cc){ var _v=(x[cc]==null?'':x[cc]); if(cc==='monto')_v=_cur+' '+_ccFmt(_v); if(cc==='banco'&&tipo==='transfer'&&!cerr&&_ccPuede()){ return '<td style="padding:4px 6px">'+esc(_v)+' <button onclick="_ccBancoDlg('+c.id+',\''+x.id+'\',0,\'edit\')" title="Corregir banco" style="border:0;background:none;color:var(--muted);cursor:pointer;font-size:12px">✎</button></td>'; } return '<td style="padding:4px 6px">'+esc(_v)+'</td>'; }).join('');
      var fc='';
      if(firma){ var fdo=_ccFirmada(c.id,x.id); if(fdo){ var f=_ccFirmaDe(c.id,x.id); fc='<td style="padding:4px 6px;white-space:nowrap"><span style="color:var(--green);font-weight:700;font-size:12px">✓ '+esc(f?f.firmado_por:'')+'</span>'+(cerr?'':' <button onclick="_ccQuitarFirma('+c.id+',\''+x.id+'\')" style="border:0;background:none;color:var(--muted);cursor:pointer;font-size:11px">✗</button>')+'</td>'; } else if(x.solic){ fc='<td style="padding:4px 6px">'+(cerr?'<span style="color:var(--amber);font-size:11px">pedida</span>':'<button class="btn btn-green btn-sm" style="padding:3px 10px;font-size:11px" onclick="_ccFirmar('+c.id+',\''+tipo+'\',\''+x.id+'\','+_ccNum(x.monto)+')">✍ Firmar</button>')+'</td>'; } else { fc='<td style="padding:4px 6px"><span style="font-size:11px;color:var(--muted)">—</span></td>'; } }
      return '<tr style="border-top:1px solid var(--border)">'+cells+fc+'</tr>';
    }).join('');
    return '<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="font-weight:700;font-size:13px;margin-bottom:6px">'+ic+' '+titulo+'</div>'+(arr.length?('<table style="width:100%;font-size:12px"><tbody>'+body+'</tbody></table>'):'<div style="font-size:12px;color:var(--muted)">Sin registros.</div>')+'</div>';
  }
  var sEfBs=lista('efectivobs','Efectivo recibido (Bs)',false,'💵',['monto']);
  var sDol=lista('dolares','Dólares en efectivo',true,'💲',['monto','fact']);
  var sZel=lista('zelle','Zelle',true,'📧',['titular','monto']);
  var sTra=lista('transfer','Transferencias / Pago móvil',true,'🏦',['banco','ref','monto']);
  var sDeb=lista('debito','T. Débito',false,'💳',['ref','monto']);
  var sCre=lista('credito','T. Crédito',false,'💳',['ref','monto']);
  var sGas=lista('gastos','Gastos',false,'🧾',['concepto','monto']);
  var a2=c.a2||{};
  function rrow(lbl,valBs,k,cur){ cur=cur||'Bs'; var av=a2[k]; var has=(av!=null&&av!==''); return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px;font-weight:600">'+lbl+'</td><td style="padding:5px 8px;text-align:right;white-space:nowrap">'+cur+' '+_ccFmt(valBs)+'</td><td style="padding:5px 8px"><input '+(cerr?'disabled':'')+' type="number" step="0.01" value="'+(has?av:'')+'" placeholder="—" onchange="_ccA2(\''+k+'\',this.value)" style="padding:5px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);width:110px;text-align:right"></td><td style="padding:5px 8px;text-align:right;font-weight:700;color:'+(has?(Math.abs(_ccNum(av)-valBs)<0.5?'var(--green)':'var(--red)'):'var(--muted)')+'">'+(has?_ccFmt(_ccNum(av)-valBs):'—')+'</td></tr>'; }
  function zrow(lbl,valBs){ return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px;font-weight:600">'+lbl+'</td><td style="padding:5px 8px;text-align:right;white-space:nowrap">Bs '+_ccFmt(valBs)+'</td><td style="padding:5px 8px;font-size:11px;color:var(--muted)">según Z</td><td style="padding:5px 8px;text-align:right;color:var(--muted)">—</td></tr>'; }
  var _cqB=[['efectivo',t.ventaEf],['transfer',t.transBs]]; var _cqU=[['dolares',t.dolUsd],['zelle',t.zelUsd]]; var _dB=0,_aB=false,_dU=0,_aU=false; _cqB.forEach(function(kk){ var av=a2[kk[0]]; if(av!=null&&av!==''){ _aB=true; _dB+=(_ccNum(av)-kk[1]); } }); _cqU.forEach(function(kk){ var av=a2[kk[0]]; if(av!=null&&av!==''){ _aU=true; _dU+=(_ccNum(av)-kk[1]); } }); var _dRow=function(lbl,d,any,cur){ return '<tr style="border-top:1px dashed var(--border)"><td style="padding:6px 8px;font-weight:800">'+lbl+'</td><td></td><td></td><td style="padding:6px 8px;text-align:right;font-weight:800;white-space:nowrap;color:'+(any?(Math.abs(d)<0.5?'var(--green)':'var(--red)'):'var(--muted)')+'">'+(any?(Math.abs(d)<0.5?'✓ cuadra':(d>0?'+':'')+cur+' '+_ccFmt(d)):'— falta A2')+'</td></tr>'; }; var _descRow=_dRow('DESCUADRE Bs',_dB,_aB,'Bs')+_dRow('DESCUADRE $',_dU,_aU,'$');
  var res='<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">📊 Cuadre</div><table style="width:100%;font-size:12px"><thead><tr><th style="text-align:left">Método</th><th style="text-align:right">Cajero</th><th style="text-align:left">Según A2</th><th style="text-align:right">Dif.</th></tr></thead><tbody>'+rrow('Efectivo (venta)',t.ventaEf,'efectivo')+rrow('Dólares',t.dolUsd,'dolares','$')+rrow('Zelle',t.zelUsd,'zelle','$')+rrow('Transferencias',t.transBs,'transfer')+zrow('T. Débito',t.debBs)+zrow('T. Crédito',t.credBs)+_descRow+'<tr style="border-top:2px solid var(--border)"><td style="padding:6px 8px;font-weight:800">TOTAL CAJA</td><td style="padding:6px 8px;text-align:right;font-weight:800;color:var(--green);white-space:nowrap">Bs '+_ccFmt(t.totalBs)+' · $ '+_ccFmt(t.totalUsd)+'</td><td></td><td></td></tr><tr><td style="padding:4px 8px;color:var(--muted)">(−) Gastos</td><td style="padding:4px 8px;text-align:right;color:var(--red)">Bs '+_ccFmt(t.gastosBs)+'</td><td></td><td></td></tr></tbody></table></div>';
  function fzInput(lbl,k,val){ var has=(val!=null&&val!==''); return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px;font-weight:600">'+lbl+'</td><td style="padding:5px 8px"><input '+(cerr?'disabled':'')+' type="number" step="0.01" value="'+(has?val:'')+'" placeholder="0" onchange="_ccFiscalSet(\''+k+'\',this.value)" style="padding:5px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);width:130px;text-align:right"></td></tr>'; }
  var fzHasVN=(d.fiscal_ventas_netas!=null && d.fiscal_ventas_netas!=='');
  var resFiscal='<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">🧾 Cuadre según reporte fiscal</div><table style="width:100%;font-size:12px"><tbody>'+
    '<tr><td style="padding:5px 8px;font-weight:600">Total Caja (fiscal)</td><td style="padding:5px 8px;text-align:right;font-weight:700">Bs '+_ccFmt(t.fiscalTotalCaja)+'</td></tr>'+
    ((t.dolBs+t.zelBs)>0?'<tr><td style="padding:2px 8px;color:var(--muted);font-size:11px">· incluye divisas ($ '+_ccFmt(t.dolUsd+t.zelUsd)+' × '+_ccFmt(t.tasa)+', como en el Z)</td><td style="padding:2px 8px;text-align:right;color:var(--muted);font-size:11px">Bs '+_ccFmt(t.dolBs+t.zelBs)+'</td></tr>':'')+
    fzInput('Ventas Netas (reporte Z)','fiscal_ventas_netas',d.fiscal_ventas_netas)+
    fzInput('Ventas Netas 2º Z (si hubo)','fiscal_ventas_netas2',d.fiscal_ventas_netas2)+
    fzInput('Créditos (ventas a crédito)','fiscal_creditos',d.fiscal_creditos)+
    '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px;font-weight:700">Total Cuadre (Ventas Netas − Créditos)</td><td style="padding:5px 8px;text-align:right;font-weight:700">Bs '+_ccFmt(t.fiscalCuadre)+'</td></tr>'+
    fzInput('Reposición de diferencia','fiscal_reposicion',d.fiscal_reposicion)+
    '<tr style="border-top:2px solid var(--border)"><td style="padding:6px 8px;font-weight:800">DIFERENCIA (fiscal)</td><td style="padding:6px 8px;text-align:right;font-weight:800;color:'+(fzHasVN?(Math.abs(t.fiscalDif)<0.5?'var(--green)':'var(--red)'):'var(--muted)')+'">'+(fzHasVN?(Math.abs(t.fiscalDif)<0.5?'✓ cuadra':((t.fiscalDif>0?'+':'')+_ccFmt(t.fiscalDif))):'— falta Ventas Netas')+'</td></tr>'+
    '</tbody></table></div>';
  var pend=_ccPendLines(c).length;
  var acc='';
  var _desh='<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" onclick="_ccDeshacer()">↩ Deshacer (fue por error)</button>';
  if(cerr){ acc='<div style="display:flex;gap:8px"><span style="flex:1;text-align:center;color:var(--green);font-weight:700;padding:10px">✓ Cerrada'+(c.confirmado_por?(' por '+esc(c.confirmado_por)):'')+'</span>'+(c.relevo?'<button class="btn btn-ghost" onclick="_ccDeshacer()">↩ Deshacer relevo</button>':'<button class="btn btn-ghost" onclick="_ccReabrir()">↩ Reabrir</button>')+'</div>'; }
  else if(c.estado==='descanso'){ var _rem=_ccDescRestante(c); acc='<div class="tbox" style="padding:12px"><div style="background:#ede9fe;color:#5b21b6;border-radius:10px;padding:10px;font-weight:700;margin-bottom:8px">☕ '+esc(c.cajero||'')+' en descanso'+(c.descanso_reemplazo?(' · cubre <b>'+esc(c.descanso_reemplazo)+'</b>'):' · caja en pausa')+'<div style="font-size:22px;font-weight:900;margin-top:4px;font-variant-numeric:tabular-nums;color:'+(_rem.over?'#dc2626':'#5b21b6')+'">⏱ <span data-dtimer="'+c.id+'">'+_rem.txt+'</span>'+(_rem.over?' · ¡tiempo agotado!':'')+'</div></div><button class="btn btn-green" style="width:100%;padding:12px" onclick="_ccDescansoTerminar()">✓ Terminar descanso ('+esc(c.cajero||'')+' volvió)</button></div>'; }
  else if(c.estado==='por_confirmar'){ acc='<div class="tbox" style="padding:12px">'+(c.relevo?('<div style="background:#ede9fe;color:#5b21b6;border-radius:10px;padding:10px;font-weight:700;margin-bottom:8px">🔄 Relevo: '+esc(c.cajero||'')+' entrega la caja con <b>Bs '+_ccFmt(c.entrega_efectivo)+'</b> en efectivo. Verifica el conteo físico antes de autorizar.</div>'):'')+(pend>0?'<div style="color:var(--amber);font-weight:700;margin-bottom:8px">Faltan '+pend+' firma(s). Fírmalas antes de dar el visto bueno.</div>':'<div style="color:var(--green);font-weight:700;margin-bottom:8px">✓ Todo firmado.</div>')+'<button class="btn btn-green" style="width:100%;padding:12px" '+(pend>0?'disabled':'')+' onclick="_ccAprobar()">✓ '+(c.relevo?'Autorizar relevo…':'Dar visto bueno y cerrar')+'</button>'+_desh+'</div>'; }
  else { var _dsc=c.descanso_solicitado?('<div style="background:#ede9fe;color:#5b21b6;border-radius:10px;padding:10px;font-weight:700">☕ Descanso enviado a '+esc(c.cajero||'')+(c.descanso_reemplazo?(' · reemplazo: <b>'+esc(c.descanso_reemplazo)+'</b>'):' · sin reemplazo (pausa)')+'. Esperando que acepte cuando termine de atender.</div><button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" onclick="_ccDescansoCancelar()">Cancelar envío</button>'):('<button class="btn btn-ghost" style="width:100%" onclick="_ccEnviarDescanso()">☕ Enviar a descanso</button>'); acc='<div class="tbox" style="padding:12px"><div style="text-align:center;color:var(--muted);font-size:13px;margin-bottom:8px">'+(pend>0?('🔔 '+pend+' pago(s) esperan tu firma arriba.'):'Caja abierta y trabajando.')+'</div>'+_dsc+'</div>'; }
  var _dur=''; try{ if(c.abierto_en){ var _fin=c.cerrado_en?new Date(c.cerrado_en):new Date(); var _min=Math.max(0,Math.round((_fin-new Date(c.abierto_en))/60000)); _dur=Math.floor(_min/60)+' h '+(_min%60)+' min'; } }catch(e){}
  var turnoBox='<div style="font-size:12px;color:var(--muted);margin-bottom:6px">⏱ Turno: <b>'+_ccHora(c.abierto_en)+'</b>'+(c.cerrado_en?(' — <b>'+_ccHora(c.cerrado_en)+'</b>'):' — en curso')+(_dur?(' · '+_dur+(c.cerrado_en?'':' hasta ahora')):'')+'</div>';
  var relevoBox='';
  try{
    if(c.recibido_de){ var _src=_ccList.filter(function(x){return x.id===c.recibido_de;})[0]; relevoBox+='<div style="background:#f5f3ff;border:1px solid #ddd6fe;color:#5b21b6;border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:700;margin-bottom:6px;cursor:pointer" onclick="_ccOpen('+c.recibido_de+')">🔄 Recibió la caja de <u>'+esc(_src?_src.cajero:('turno #'+c.recibido_de))+'</u>'+(_src?(' a las '+_ccHora(c.abierto_en)+' con Bs '+_ccFmt(_src.entrega_efectivo)):'')+' · toca para ver ese turno</div>'; }
    var _next=_ccList.filter(function(x){return x.recibido_de===c.id;})[0];
    if(_next){ relevoBox+='<div style="background:#f5f3ff;border:1px solid #ddd6fe;color:#5b21b6;border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:700;margin-bottom:6px;cursor:pointer" onclick="_ccOpen('+_next.id+')">🔄 Entregó la caja a <u>'+esc(_next.cajero||'—')+'</u>'+(c.entrega_efectivo!=null?(' con Bs '+_ccFmt(c.entrega_efectivo)):'')+' · toca para ver ese turno</div>'; }
    else if(c.relevo && c.estado==='cerrado' && !c.entrega_recibida){ relevoBox+='<div style="background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:700;margin-bottom:6px">🔄 Relevo autorizado con Bs '+_ccFmt(c.entrega_efectivo)+' · esperando que el siguiente cajero reciba la caja</div>'; }
  }catch(e){}
  var fondoBox='<div style="font-size:12px;color:var(--muted);margin-bottom:10px">💼 Fondo inicial declarado: <b>Bs '+_ccFmt(_ccNum(d.fondo_bs))+'</b> · <b>$ '+_ccFmt(_ccNum(d.fondo_usd))+'</b> <span>· el efectivo en $ va a la caja roja</span></div>';
  var diagBtn='<button class="btn btn-ghost btn-sm" style="width:100%;margin-bottom:8px" onclick="_ccDiag()">🔍 ¿Por qué no cuadra? (diagnóstico)</button>';
  var cuadreBtn='<button class="btn btn-ghost btn-sm" style="width:100%;margin-bottom:12px" onclick="_ccCuadreXlsx()">📥 Descargar cuadre (formato oficial)</button>';
  var _fstyle='<style>.cc-fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr));gap:12px;align-items:start;margin:0 0 12px}.cc-fgrid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:12px;align-items:start;margin:0 0 12px}.cc-fgrid>.tbox,.cc-fgrid2>.tbox{margin-bottom:0!important}</style>';
  var gridPagos='<div class="cc-fgrid">'+sEfBs+sEf+sDol+sZel+sTra+sDeb+sCre+sGas+'</div>';
  var gridCuadre='<div class="cc-fgrid2">'+res+resFiscal+'</div>';
  return _fstyle+head+turnoBox+relevoBox+fondoBox+gridPagos+gridCuadre+diagBtn+cuadreBtn+acc;
}
function _ccA2(k,v){ if(!_ccAct)return; if(!_ccAct.a2)_ccAct.a2={}; _ccAct.a2[k]=v; if(_ccA2T)clearTimeout(_ccA2T); _ccA2T=setTimeout(function(){ supabaseClient.from('cierres_caja').update({a2:_ccAct.a2}).eq('id',_ccAct.id).then(function(){}); },600); }
function _ccFiscalSet(k,v){ if(!_ccAct)return; if(!_ccAct.data)_ccAct.data={}; _ccAct.data[k]=v; _ccSave(); renderCierre(); }
function _ccSaveNow(){ if(!_ccAct)return; if(_ccSaveT){clearTimeout(_ccSaveT);_ccSaveT=null;} supabaseClient.from('cierres_caja').update({data:_ccAct.data,actualizado_en:new Date().toISOString()}).eq('id',_ccAct.id).then(function(){}); }
function _ccSave(){ if(_ccSaveT)clearTimeout(_ccSaveT); _ccSaveT=setTimeout(_ccSaveNow,600); }
function _ccAprobar(){ if(!_ccAct||!_ccPuede())return; if(_ccPendLines(_ccAct).length>0){ alert('Faltan firmas.'); return; } if(_ccAct.relevo){ _ccRelevoDlg(); return; } if(!confirm('¿Dar visto bueno y cerrar esta caja?'))return; supabaseClient.from('cierres_caja').update({estado:'cerrado',confirmado_por:(typeof currentUser!=='undefined'?currentUser:null),cerrado_en:new Date().toISOString()}).eq('id',_ccAct.id).then(function(r){ if(r&&r.error){ showToast&&showToast('Error: '+(r.error.message||'')); return; } if(typeof logAudit==='function')logAudit('cierre.aprobar',_ccAct.caja); _ccAct.estado='cerrado'; _ccVolver(); }); }
function _ccCuadreXlsx(){
  var c=_ccAct; if(!c)return; var d=c.data||{};
  if(typeof showToast==='function')showToast('Generando cuadre…');
  _retoLoadExcelJS(function(ok){
    if(!ok||!window.ExcelJS){ if(typeof showToast==='function')showToast('No se pudo cargar Excel'); return; }
    fetch('plantilla_cuadre.xlsx').then(function(r){ if(!r.ok)throw new Error('No encontré la plantilla'); return r.arrayBuffer(); }).then(function(buf){
      var wb=new ExcelJS.Workbook();
      return wb.xlsx.load(buf).then(function(){
        var ws=wb.getWorksheet('MODELO')||wb.worksheets[0];
        var DR={20:22,50:23,100:24,200:25,500:26};
        ws.getCell('B9').value=(c.caja||'');
        try{ var p=String(c.fecha||'').split('-'); if(p.length===3)ws.getCell('B11').value=new Date(+p[0],+p[1]-1,+p[2]); }catch(e){}
        var ef=d.efectivo||{}; Object.keys(DR).forEach(function(dn){ var cant=_ccNum(ef[dn]); if(cant>0)ws.getCell('B'+DR[dn]).value=cant; });
        var tasa=_ccNum(d.tasa);
        var r=18; (d.transfer||[]).forEach(function(x){ ws.getCell('H'+r).value=x.banco||''; ws.getCell('I'+r).value=x.ref||''; ws.getCell('J'+r).value=_ccNum(x.monto); r++; });
        var deb=(d.debito||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); if(deb>0)ws.getCell('F18').value=deb;
        var cre=(d.credito||[]).reduce(function(a,x){return a+_ccNum(x.monto);},0); if(cre>0)ws.getCell('L18').value=cre;
        r=18; (d.dolares||[]).forEach(function(x){ ws.getCell('N'+r).value=_ccNum(x.monto); ws.getCell('O'+r).value=tasa; r++; });
        r=18; (d.zelle||[]).forEach(function(x){ ws.getCell('R'+r).value=_ccNum(x.monto); ws.getCell('S'+r).value=tasa; r++; });
        r=18; (d.gastos||[]).forEach(function(x){ ws.getCell('V'+r).value=_ccNum(x.monto); r++; });
        var vn=_ccNum(d.fiscal_ventas_netas)+_ccNum(d.fiscal_ventas_netas2); if(vn)ws.getCell('C51').value=vn;
        if(_ccNum(d.fiscal_creditos))ws.getCell('C53').value=_ccNum(d.fiscal_creditos);
        if(_ccNum(d.fiscal_reposicion))ws.getCell('C57').value=_ccNum(d.fiscal_reposicion);
        try{ wb.calcProperties={fullCalcOnLoad:true}; }catch(e){}
        return wb.xlsx.writeBuffer();
      });
    }).then(function(buf){ var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Cuadre '+(c.caja||'Caja')+' '+(c.fecha||'')+'.xlsx'; document.body.appendChild(a); a.click(); setTimeout(function(){try{a.remove();URL.revokeObjectURL(a.href);}catch(e){}},3000); if(typeof showToast==='function')showToast('✓ Cuadre descargado'); if(typeof logAudit==='function')logAudit('cierre.cuadre_xlsx',(c.caja||'')+' '+(c.fecha||'')); }).catch(function(e){ if(typeof showToast==='function')showToast('Error: '+((e&&e.message)||e)); });
  });
}
function _ccDiag(){ var c=_ccAct; if(!c)return; var t=_ccTot(c); var d=c.data||{}; var a2=c.a2||{}; var L=[];
  var dEf=t.efBs-t.ventaEf;
  if(t.efBs<=0) L.push('• No se contó el efectivo (arqueo en 0): no se puede validar el efectivo de esta caja.');
  else if(Math.abs(dEf)>=1) L.push('• Efectivo: arqueo Bs '+_ccFmt(t.efBs)+' vs venta registrada Bs '+_ccFmt(t.ventaEf)+' → '+(dEf>0?'sobran':'faltan')+' Bs '+_ccFmt(Math.abs(dEf))+'. (¿se contó el fondo? ¿vuelto mal dado?)');
  [['efectivo',t.ventaEf,'Efectivo','Bs'],['transfer',t.transBs,'Transferencias','Bs'],['dolares',t.dolUsd,'Dólares','$'],['zelle',t.zelUsd,'Zelle','$']].forEach(function(m){ var av=a2[m[0]]; if(av!=null&&av!==''){ var df=_ccNum(av)-m[1]; if(Math.abs(df)>=0.5) L.push('• '+m[2]+': cajero '+m[3]+' '+_ccFmt(m[1])+' vs A2 '+m[3]+' '+_ccFmt(_ccNum(av))+' → '+(df>0?'+':'')+m[3]+' '+_ccFmt(df)); } });
  var dif=t.fiscalDif;
  if(t.fiscalVN>0 && Math.abs(dif)>=1){ L.push('• Cuadre fiscal: diferencia '+(dif>0?'+':'')+_ccFmt(dif)+' Bs contra el reporte Z.');
    var cand=[]; (d.transfer||[]).forEach(function(x){ cand.push({n:'pago móvil ref '+(x.ref||'—'),m:_ccNum(x.monto)}); }); (d.dolares||[]).forEach(function(x){ cand.push({n:'dólares $'+_ccFmt(x.monto),m:_ccNum(x.monto)*_ccNum(d.tasa)}); }); (d.zelle||[]).forEach(function(x){ cand.push({n:'zelle $'+_ccFmt(x.monto),m:_ccNum(x.monto)*_ccNum(d.tasa)}); }); (d.gastos||[]).forEach(function(x){ cand.push({n:'gasto '+(x.concepto||''),m:_ccNum(x.monto)}); });
    cand.forEach(function(k){ if(Math.abs(Math.abs(dif)-k.m)<1) L.push('   ↳ coincide con: '+k.n+' (Bs '+_ccFmt(k.m)+') — ¿doble, no entregado, o falta en el Z?'); });
    if(_ccNum(d.fiscal_ventas_netas2)===0) L.push('   ↳ ¿hubo un 2º reporte Z sin sumar? Hay campo para agregarlo.');
  } else if(!(t.fiscalVN>0)){ L.push('• Falta cargar las Ventas Netas del reporte Z para validar el cuadre fiscal.'); }
  var cuerpo=L.length?L.map(function(x){ return '<div style="padding:5px 0;border-top:1px solid var(--border);font-size:12.5px;line-height:1.5">'+esc(x)+'</div>'; }).join(''):'<div style="padding:12px 0;color:var(--green);font-weight:800;text-align:center">✓ Todo cuadra.</div>';
  var ov=document.createElement('div'); ov.id='cc-diag-ov'; ov.style.cssText='position:fixed;inset:0;background:rgba(15,20,40,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto'; ov.onclick=function(e){ if(e.target===ov)ov.remove(); };
  ov.innerHTML='<div style="background:var(--surface);border-radius:16px;max-width:460px;width:100%;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px"><div style="font-weight:800;font-size:15px">🔍 ¿Por qué no cuadra? · '+esc(c.caja||'')+' · '+esc(c.cajero||'')+'</div><button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'cc-diag-ov\').remove()">Cerrar</button></div>'+cuerpo+'</div>';
  document.body.appendChild(ov);
  try{ if(L.length&&typeof logAudit==='function')logAudit('cierre.diag',(c.caja||'')+': '+L.length+' hallazgo(s)'); }catch(e){}
}
function _ccRelevoDlg(){
  var c=_ccAct; if(!c)return;
  var cajeros=(window._ccCajeros||[]).filter(function(n){ return (''+n).toLowerCase().trim()!==(''+(c.cajero||'')).toLowerCase().trim(); });
  var opts='<option value="">— elige al cajero que recibe —</option>'+cajeros.map(function(n){ return '<option value="'+esc(n)+'">'+esc(n)+'</option>'; }).join('')+'<option value="__sin__">Dejar libre (que la reciba quien entre)</option>';
  var ov=document.createElement('div'); ov.id='cc-relevo-ov'; ov.style.cssText='position:fixed;inset:0;background:rgba(15,20,40,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=function(e){ if(e.target===ov)ov.remove(); };
  ov.innerHTML='<div style="background:var(--surface);border-radius:16px;max-width:420px;width:100%;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()">'+
    '<div style="font-weight:800;font-size:15px;margin-bottom:4px">🔄 Autorizar relevo de '+esc(c.caja||'')+'</div>'+
    '<div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">'+esc(c.cajero||'')+' entrega <b>Bs '+_ccFmt(c.entrega_efectivo)+'</b> en efectivo. Verifica el conteo físico. ¿Quién toma la caja ahora?</div>'+
    '<label style="font-size:11px;font-weight:700;color:var(--muted)">CAJERO QUE RECIBE</label>'+
    '<select id="cc-relevo-sel" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:14px;font-weight:700;margin:4px 0 14px">'+opts+'</select>'+
    '<button class="btn btn-green" style="width:100%;padding:11px" onclick="_ccAutorizarRelevo()">✓ Autorizar relevo</button>'+
    '<button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="document.getElementById(\'cc-relevo-ov\').remove()">Cancelar</button></div>';
  document.body.appendChild(ov);
}
function _ccAutorizarRelevo(){
  var c=_ccAct; if(!c||!_ccPuede())return;
  var sel=document.getElementById('cc-relevo-sel'); var elegido=sel?sel.value:'';
  if(!elegido){ alert('Elige quién recibe la caja (o "dejar libre").'); return; }
  var ov=document.getElementById('cc-relevo-ov'); if(ov)ov.remove();
  var quien=(typeof currentUser!=='undefined'?currentUser:null); var now=new Date().toISOString(); var entrega=_ccNum(c.entrega_efectivo);
  var conCajero=(elegido && elegido!=='__sin__');
  supabaseClient.from('cierres_caja').update({estado:'cerrado',confirmado_por:quien,cerrado_en:now,entrega_recibida:conCajero}).eq('id',c.id).then(function(r){
    if(r&&r.error){ if(typeof showToast==='function')showToast('Error: '+r.error.message); return; }
    var fin=function(){ if(typeof logAudit==='function')logAudit('cierre.relevo_autorizado',(c.caja||'')+' → '+(conCajero?elegido:'libre')); _ccAct.estado='cerrado'; _ccVolver(); };
    if(conCajero){
      var ndata={tasa:_ccNum((c.data||{}).tasa)||0,fondo_bs:entrega,fondo_usd:0,efectivo:{},efectivobs:[],dolares:[],zelle:[],transfer:[],debito:[],credito:[],gastos:[]};
      supabaseClient.from('cierres_caja').insert([{fecha:c.fecha,caja:c.caja,cajero:elegido,empresa:_ccEmp(),estado:'abierto',data:ndata,creado_por:quien,ver:1,abierto_en:now,recibido_de:c.id}]).select().then(function(ri){
        if(ri&&ri.error){ if(typeof showToast==='function')showToast('Turno nuevo no se creó: '+ri.error.message); }
        try{ supabaseClient.from('cierre_eventos').insert([{cierre_id:c.id,fecha:c.fecha,caja:c.caja||'',cajero:c.cajero||'',tipo:'relevo',metodo:'',moneda:'Bs',monto:entrega,detalle:(c.cajero||'?')+' entregó '+(c.caja||'')+' a '+elegido+' con Bs '+_ccFmt(entrega)+' · autorizó '+(quien||'—')}]); }catch(e){}
        if(typeof showToast==='function')showToast('✓ Relevo autorizado · '+elegido+' recibe '+(c.caja||''));
        fin();
      });
    } else {
      try{ supabaseClient.from('cierre_eventos').insert([{cierre_id:c.id,fecha:c.fecha,caja:c.caja||'',cajero:c.cajero||'',tipo:'relevo',metodo:'',moneda:'Bs',monto:entrega,detalle:(c.cajero||'?')+' entregó '+(c.caja||'')+' (libre) con Bs '+_ccFmt(entrega)+' · autorizó '+(quien||'—')}]); }catch(e){}
      if(typeof showToast==='function')showToast('✓ Relevo autorizado · la toma quien entre a '+(c.caja||''));
      fin();
    }
  });
}
function _ccDescRestante(c){ var LIM=60; try{ if(!c.descanso_inicio)return {txt:'—',over:false,mins:0}; var el=Math.floor((Date.now()-new Date(c.descanso_inicio).getTime())/1000); var rem=LIM*60-el; var over=rem<0; var a=Math.abs(rem); var mm=Math.floor(a/60), ss=a%60; return {txt:(over?'+':'')+mm+':'+(ss<10?'0':'')+ss, over:over, mins:Math.floor(el/60)}; }catch(e){ return {txt:'—',over:false,mins:0}; } }
function _ccEnviarDescanso(){ var c=_ccAct; if(!c||!_ccPuede())return; var cajeros=(window._ccCajeros||[]).filter(function(n){ return (''+n).toLowerCase().trim()!==(''+(c.cajero||'')).toLowerCase().trim(); }); var opts='<option value="__pausa__">Sin reemplazo (la caja queda en pausa)</option>'+cajeros.map(function(n){ return '<option value="'+esc(n)+'">'+esc(n)+'</option>'; }).join(''); var ov=document.createElement('div'); ov.id='cc-desc-ov'; ov.style.cssText='position:fixed;inset:0;background:rgba(15,20,40,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px'; ov.onclick=function(e){ if(e.target===ov)ov.remove(); }; ov.innerHTML='<div style="background:var(--surface);border-radius:16px;max-width:420px;width:100%;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()"><div style="font-weight:800;font-size:15px;margin-bottom:4px">☕ Enviar a descanso · '+esc(c.caja||'')+'</div><div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">'+esc(c.cajero||'')+' recibe la petición y entra al descanso cuando termine de atender. Cronómetro: 1 hora.</div><label style="font-size:11px;font-weight:700;color:var(--muted)">¿QUIÉN CUBRE?</label><select id="cc-desc-sel" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:14px;font-weight:700;margin:4px 0 14px">'+opts+'</select><button class="btn btn-green" style="width:100%;padding:11px" onclick="_ccDescansoSolicitar()">Enviar petición de descanso</button><button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="document.getElementById(\'cc-desc-ov\').remove()">Cancelar</button></div>'; document.body.appendChild(ov); }
function _ccDescansoSolicitar(){ var c=_ccAct; if(!c||!_ccPuede())return; var sel=document.getElementById('cc-desc-sel'); var v=sel?sel.value:'__pausa__'; var ree=(v==='__pausa__')?null:v; var ov=document.getElementById('cc-desc-ov'); if(ov)ov.remove(); var quien=(typeof currentUser!=='undefined'?currentUser:null); supabaseClient.from('cierres_caja').update({descanso_solicitado:true,descanso_reemplazo:ree,descanso_por:quien}).eq('id',c.id).then(function(r){ if(r&&r.error){ if(typeof showToast==='function')showToast('Error: '+r.error.message); return; } try{ supabaseClient.from('cierre_eventos').insert([{cierre_id:c.id,fecha:c.fecha,caja:c.caja||'',cajero:c.cajero||'',tipo:'descanso_solicitado',metodo:'',moneda:'',monto:null,detalle:'Descanso enviado a '+(c.cajero||'')+(ree?(' · reemplazo '+ree):' · sin reemplazo')+' · por '+(quien||'—')}]); }catch(e){} if(typeof logAudit==='function')logAudit('cierre.descanso_solic',(c.caja||'')+' '+(ree||'pausa')); if(typeof showToast==='function')showToast('☕ Petición enviada a '+(c.cajero||'')); _ccAct.descanso_solicitado=true; _ccAct.descanso_reemplazo=ree; _ccVolver(); }); }
function _ccDescansoCancelar(){ var c=_ccAct; if(!c||!_ccPuede())return; if(!confirm('¿Cancelar el envío a descanso?'))return; supabaseClient.from('cierres_caja').update({descanso_solicitado:false,descanso_reemplazo:null,descanso_por:null}).eq('id',c.id).then(function(r){ if(r&&r.error){ if(typeof showToast==='function')showToast('Error: '+r.error.message); return; } _ccAct.descanso_solicitado=false; _ccAct.descanso_reemplazo=null; _ccVolver(); }); }
function _ccDescansoTerminar(){ var c=_ccAct; if(!c||!_ccPuede())return; if(!confirm('¿Terminar el descanso y reactivar la caja para '+(c.cajero||'')+'?'))return; var quien=(typeof currentUser!=='undefined'?currentUser:null); var mins=0; try{ if(c.descanso_inicio)mins=Math.floor((Date.now()-new Date(c.descanso_inicio).getTime())/60000); }catch(e){} var LIM=60; var ree=c.descanso_reemplazo; supabaseClient.from('cierres_caja').update({estado:'abierto',descanso:false,descanso_solicitado:false,descanso_inicio:null,descanso_reemplazo:null,descanso_por:null}).eq('id',c.id).then(function(r){ if(r&&r.error){ if(typeof showToast==='function')showToast('Error: '+r.error.message); return; } try{ supabaseClient.from('cierre_eventos').insert([{cierre_id:c.id,fecha:c.fecha,caja:c.caja||'',cajero:c.cajero||'',tipo:'descanso_fin',metodo:'',moneda:'min',monto:mins,detalle:'Descanso de '+mins+' min'+(ree?(' · cubrió '+ree):'')+' · terminó '+(quien||'—')}]); }catch(e){} if(mins>LIM){ _ccDescansoRegistrarExceso(c,mins-LIM); } if(typeof logAudit==='function')logAudit('cierre.descanso_fin',(c.caja||'')+' '+mins+'min'); window['_ccDescAlert_'+c.id]=false; if(typeof showToast==='function')showToast('✓ '+(c.cajero||'')+' de vuelta'+(mins>LIM?(' · se pasó '+(mins-LIM)+' min (queda en desempeño)'):'')); _ccAct.estado='abierto'; _ccVolver(); }); }
function _ccDescansoRegistrarExceso(c,extra){ try{ var nn=(''+(c.cajero||'')).trim(); supabaseClient.from('empleados').select('id,nombre,empresa').ilike('nombre',nn).limit(1).then(function(re){ var emp=((re&&re.data)||[])[0]; var nota='Volvió '+extra+' min tarde del descanso en '+(c.caja||'')+' ('+(c.fecha||'')+')'; var fila={empleado_id:(emp?emp.id:null),empleado_nombre:(emp?emp.nombre:nn),empresa:(emp&&emp.empresa?emp.empresa:'FARMACIA'),fecha:(c.fecha||(new Date()).toISOString().slice(0,10)),tipo:'descanso_excedido',horas:Math.round(extra/60*100)/100,nota:nota,creado_por:(typeof currentUser!=='undefined'?currentUser:null)}; supabaseClient.from('empleado_asistencia').insert([fila]).then(function(){}); }).catch(function(){}); }catch(e){} }
function _ccEvDeshacer(c){ try{ supabaseClient.from('cierre_eventos').insert([{cierre_id:c.id,fecha:c.fecha,caja:c.caja||'',cajero:c.cajero||'',tipo:'relevo_deshecho',metodo:'',moneda:'',monto:null,detalle:'Deshecho por '+(typeof currentUser!=='undefined'?currentUser:'—')}]); }catch(e){} if(typeof logAudit==='function')logAudit('cierre.deshacer',c.caja); }
function _ccDeshacer(){ if(!_ccAct||!_ccPuede())return; var c=_ccAct;
  if(c.estado==='por_confirmar'){ if(!confirm('¿Deshacer la solicitud y dejar la caja abierta trabajando?'))return; supabaseClient.from('cierres_caja').update({estado:'abierto',relevo:false,descanso:false,entrega_efectivo:null,cerrado_solic_por:null}).eq('id',c.id).then(function(r){ if(r&&r.error){ if(typeof showToast==='function')showToast('Error: '+r.error.message); return; } _ccEvDeshacer(c); _ccAct.estado='abierto'; _ccVolver(); }); return; }
  if(c.estado==='descanso'){ if(!confirm('¿Terminar el descanso y reabrir la caja?'))return; supabaseClient.from('cierres_caja').update({estado:'abierto',descanso:false}).eq('id',c.id).then(function(r){ if(r&&r.error){ if(typeof showToast==='function')showToast('Error: '+r.error.message); return; } _ccEvDeshacer(c); _ccAct.estado='abierto'; _ccVolver(); }); return; }
  if(c.estado==='cerrado' && c.relevo){
    supabaseClient.from('cierres_caja').select('*').eq('recibido_de',c.id).then(function(rr){ var rec=((rr&&rr.data)||[])[0];
      var reabrir=function(){ supabaseClient.from('cierres_caja').update({estado:'abierto',cerrado_en:null,confirmado_por:null,entrega_recibida:false,relevo:false,entrega_efectivo:null}).eq('id',c.id).then(function(r2){ if(r2&&r2.error){ if(typeof showToast==='function')showToast('Error: '+r2.error.message); return; } _ccEvDeshacer(c); _ccAct.estado='abierto'; _ccVolver(); }); };
      if(rec){
        if(rec.estado!=='abierto'){ alert('El turno que recibió la caja ya avanzó (estado: '+rec.estado+'). No se puede deshacer automáticamente.'); return; }
        var d=rec.data||{}; var hayPagos=['efectivobs','dolares','zelle','transfer','debito','credito','gastos'].some(function(k){return (d[k]||[]).length>0;});
        supabaseClient.from('cierre_firmas').select('id').eq('cierre_id',rec.id).limit(1).then(function(rf){ var hayFirmas=((rf&&rf.data)||[]).length>0;
          if(hayPagos||hayFirmas){ alert('El cajero que recibió la caja ('+(rec.cajero||'')+') ya registró movimientos. No se puede deshacer el relevo; maneja el cierre de forma normal.'); return; }
          if(!confirm('¿Deshacer el relevo? Se elimina el turno vacío de '+(rec.cajero||'')+' y se reabre el turno de '+(c.cajero||'')+'.'))return;
          supabaseClient.from('cierres_caja').delete().eq('id',rec.id).then(function(rd){ if(rd&&rd.error){ if(typeof showToast==='function')showToast('No se pudo borrar el turno nuevo: '+rd.error.message); return; } reabrir(); });
        });
      } else {
        if(!confirm('¿Reabrir el turno de '+(c.cajero||'')+'? (No hay turno receptor creado.)'))return;
        reabrir();
      }
    });
    return;
  }
  alert('No hay nada que deshacer en este estado.');
}
function _ccReabrir(){ if(!_ccAct||!_ccPuede())return; var motivo=prompt('¿Por qué reabres esta caja? Queda registrado.'); if(motivo===null)return; motivo=(''+motivo).trim(); if(!motivo){ alert('Debes escribir un motivo para reabrir.'); return; } var _id=_ccAct.id,_f=_ccAct.fecha,_cj=_ccAct.cajero,_ca=_ccAct.caja; supabaseClient.from('cierres_caja').update({estado:'abierto',cerrado_en:null}).eq('id',_id).then(function(){ _ccAct.estado='abierto'; _ccAct.cerrado_en=null; try{ supabaseClient.from('cierre_eventos').insert([{cierre_id:_id,fecha:_f,caja:_ca,cajero:_cj,tipo:'reapertura',metodo:'',moneda:'',monto:null,detalle:motivo+' · por '+(typeof currentUser!=='undefined'?currentUser:'—')}]); }catch(e){} if(typeof logAudit==='function')logAudit('cierre.reabrir',_ca+' · '+motivo); renderCierre(); }); }

/* ===== Conciliación bancaria de cajas (módulo Inés) ===== */
var _cbBankData={}, _cbMes='', _cbRows=[], _cbTab='pend_banco', _cbCajaT=[];
var _CB_FERIADOS_FIJOS=new Set(['01-01','01-06','04-19','05-01','06-24','07-05','07-24','10-12','11-01','12-24','12-25','12-31']);
var _CB_FERIADOS_VAR=new Set(['2025-03-03','2025-03-04','2025-04-17','2025-04-18','2026-02-16','2026-02-17','2026-04-02','2026-04-03','2027-02-08','2027-02-09','2027-03-25','2027-03-26']);
var _CB_BANCOS=[['tesoro','Tesoro'],['bicentenario','Bicentenario'],['mercantil','Mercantil'],['banesco','Banesco'],['provincial','Provincial'],['bdv','BDV (Venezuela)'],['bnc','BNC'],['bancaribe','Bancaribe']];
function _cbBankLabel(id){ var f=_CB_BANCOS.filter(function(b){return b[0]===id;})[0]; return f?f[1]:id; }
function _cbLoadXLSX(cb){
  if(window.XLSX){ cb(true); return; }
  var sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  sc.onload=function(){ cb(!!window.XLSX); }; sc.onerror=function(){ cb(false); };
  document.head.appendChild(sc);
}
