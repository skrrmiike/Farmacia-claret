// ══════════════════════════════════════════════════════════════
// 29 · CONSUMO FAMILIA (prefijo _cf)
// La familia (Miguel, Anais, Nani, Jose) anota lo que se lleva.
// Edilso/Leonard lo sacan del inventario y Mayra lo cobra.
// Reemplaza la hojita de papel: nada se queda sin sacar ni sin cobrar.
// ══════════════════════════════════════════════════════════════
var _cfRows=[], _cfReady=false, _cfLoading=false, _cfBusy=false, _cfFiltro='pend';
var CF_FAMILIA={miguel:'Miguel', anais:'Anais', nani:'Nani', gerente:'Jose'};
function _cfHoy(){ try{ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _cfU(){ try{ return (typeof currentUser!=='undefined'?String(currentUser).toLowerCase():''); }catch(e){ return ''; } }
function _cfEsAdmin(){ try{ return currentRole==='admin'; }catch(e){ return false; } }
function _cfFamiliaEs(){ return _cfEsAdmin()||CF_FAMILIA.hasOwnProperty(_cfU()); }
function _cfInventarioEs(){ return _cfEsAdmin()||['edilso','leonard'].indexOf(_cfU())>=0; }
function _cfCobraEs(){ return _cfEsAdmin()||_cfU()==='mayra'; }
function _cfPuedeVer(){ return _cfFamiliaEs()||_cfInventarioEs()||_cfCobraEs(); }
function _cfN(x){ var n=(typeof numComa==='function')?numComa(x):Number(String(x==null?'':x).replace(',','.')); return isNaN(n)?0:n; }
function _cfMoney(x){ return '$ '+((typeof fmt==='function')?fmt(_cfN(x),2):_cfN(x).toFixed(2)); }
var CF_MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _cfFechaLbl(f){ f=String(f||'').slice(0,10); var p=f.split('-'); if(p.length!==3)return f; return (+p[2])+' '+(CF_MESES[(+p[1])-1]||'').slice(0,3)+(String(_cfHoy()).slice(0,4)!==p[0]?(' '+p[0]):''); }
function _cfDias(f){ try{ var a=new Date(String(f).slice(0,10)+'T12:00:00'), b=new Date(_cfHoy()+'T12:00:00'); return Math.max(0,Math.round((b-a)/86400000)); }catch(e){ return 0; } }
function _cfFalta(m){ return { inv:!m.sacado_en, cob:!m.cobrado_en }; }
function _cfPend(m){ var x=_cfFalta(m); return x.inv||x.cob; }

function renderConsumo(){ _cfEntrar(); }
function _cfEntrar(){ if(!_cfPuedeVer()){ var c=document.getElementById('consumo-content'); if(c)c.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted)">Este módulo es de la familia y de quienes sacan/cobran los consumos.</div>'; return; } if(!_cfReady){ _cfCargar(); } else { _cfRender(); } }
function _cfCargar(){
  _cfLoading=true; _cfRender();
  supabaseClient.from('consumo_familia').select('*').order('id',{ascending:false}).limit(500).then(function(res){
    _cfRows=(res&&res.data)||[]; _cfLoading=false; _cfReady=true; _cfRender(); _cfBadge();
  }).catch(function(e){ console.warn('consumo cargar',e); _cfLoading=false; _cfReady=true; _cfRender(); });
}
function _cfRefrescar(){ _cfReady=false; _cfCargar(); }
function _cfSetFiltro(f){ _cfFiltro=f; _cfRender(); }
function _cfRow(id){ return (_cfRows||[]).filter(function(x){ return String(x.id)===String(id); })[0]; }

function _cfBadge(){
  try{
    var el=document.getElementById('cf-badge'); if(!el)return;
    var n=0;
    (_cfRows||[]).forEach(function(m){ var x=_cfFalta(m);
      if(_cfInventarioEs()&&x.inv)n++; else if(_cfCobraEs()&&x.cob)n++; else if(_cfFamiliaEs()&&(x.inv||x.cob))n++; });
    el.textContent=n||''; el.style.display=n?'inline-flex':'none';
  }catch(e){}
}

// ── Registrar (solo la familia) ───────────────────────────────
function _cfRegistrar(){
  if(!_cfFamiliaEs()){ showToast&&showToast('Solo la familia registra consumos'); return; }
  if(_cfBusy)return;
  var g=function(id){ var el=document.getElementById(id); return (el&&el.value||'').trim(); };
  var producto=g('cf-producto'); if(!producto){ showToast&&showToast('Escribe qué te llevaste'); return; }
  var row={ fecha:g('cf-fecha')||_cfHoy(), quien:g('cf-quien')||(CF_FAMILIA[_cfU()]||_cfU()),
    empresa:(g('cf-emp')==='DROGUERIA'?'DROGUERIA':'FARMACIA'), producto:producto,
    cantidad:_cfN(g('cf-cant'))||1, monto:(_cfN(g('cf-monto'))>0?_cfN(g('cf-monto')):null),
    nota:g('cf-nota')||null, estado:'registrado', creado_por:(typeof currentUser!=='undefined'?currentUser:null) };
  _cfBusy=true;
  supabaseClient.from('consumo_familia').insert([row]).select('*').then(function(res){
    _cfBusy=false;
    if(res&&res.error){ showToast&&showToast('No se pudo guardar: '+(res.error.message||'')); return; }
    if(res&&res.data&&res.data[0])_cfRows.unshift(res.data[0]);
    if(typeof logAudit==='function')logAudit('consumo.registrar',row.quien+': '+producto);
    showToast&&showToast('✓ Anotado. Edilso lo saca del inventario y Mayra lo cobra.'); _cfRender(); _cfBadge();
  }).catch(function(){ _cfBusy=false; showToast&&showToast('Error de red'); });
}
function _cfEstadoDe(m){ return (m.sacado_en&&m.cobrado_en)?'cobrado':((m.sacado_en||m.cobrado_en)?'inventario':'registrado'); }
function _cfSacar(id){
  if(!_cfInventarioEs()){ showToast&&showToast('Solo Edilso/Leonard sacan del inventario'); return; }
  var m=_cfRow(id); if(!m)return;
  var quitar=!!m.sacado_en;
  var upd=quitar?{sacado_en:null,sacado_por:null}:{sacado_en:new Date().toISOString(),sacado_por:(typeof currentUser!=='undefined'?currentUser:null)};
  var tmp=Object.assign({},m,upd); upd.estado=_cfEstadoDe(tmp);
  supabaseClient.from('consumo_familia').update(upd).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    Object.keys(upd).forEach(function(k){ m[k]=upd[k]; });
    if(typeof logAudit==='function')logAudit('consumo.inventario',(m.producto||id)+(quitar?' (deshacer)':' sacado'));
    _cfRender(); _cfBadge();
  });
}
function _cfCobrar(id){
  if(!_cfCobraEs()){ showToast&&showToast('Solo Mayra marca cobrado'); return; }
  var m=_cfRow(id); if(!m)return;
  var quitar=!!m.cobrado_en;
  if(!quitar&&!(_cfN(m.monto)>0)){ var v=prompt('¿Cuánto se cobró por «'+(m.producto||'')+'»? ($)', ''); if(v===null)return; var mm=_cfN(v); if(mm<=0){ showToast&&showToast('Escribe el monto cobrado'); return; } var r1=_cfRow(id); if(r1)r1.monto=mm; }
  var upd=quitar?{cobrado_en:null,cobrado_por:null}:{cobrado_en:new Date().toISOString(),cobrado_por:(typeof currentUser!=='undefined'?currentUser:null),monto:_cfN(m.monto)||null};
  var tmp=Object.assign({},m,upd); upd.estado=_cfEstadoDe(tmp);
  supabaseClient.from('consumo_familia').update(upd).eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo actualizar'); return; }
    Object.keys(upd).forEach(function(k){ m[k]=upd[k]; });
    if(typeof logAudit==='function')logAudit('consumo.cobrado',(m.producto||id)+(quitar?' (deshacer)':' cobrado'));
    _cfRender(); _cfBadge();
  });
}
function _cfSetMonto(id,val){
  if(!(_cfCobraEs()||_cfEsAdmin()))return; var m=_cfRow(id); if(!m)return; var v=_cfN(val);
  supabaseClient.from('consumo_familia').update({monto:(v>0?v:null)}).eq('id',id).then(function(res){ if(!(res&&res.error))m.monto=(v>0?v:null); });
}
function _cfDel(id){
  if(!_cfEsAdmin()){ showToast&&showToast('Solo el administrador puede borrar'); return; }
  if(!confirm('¿Borrar este consumo?'))return;
  supabaseClient.from('consumo_familia').delete().eq('id',id).then(function(res){
    if(res&&res.error){ showToast&&showToast('No se pudo borrar'); return; }
    _cfRows=_cfRows.filter(function(x){ return String(x.id)!==String(id); }); _cfRender(); _cfBadge();
  });
}

// ── Render ────────────────────────────────────────────────────
function _cfInp(){ return 'padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px;box-sizing:border-box;width:100%'; }
function _cfLbl(t,inner){ return '<label style="font-size:10px;color:var(--muted);font-weight:700;display:block">'+t+'<div style="margin-top:3px">'+inner+'</div></label>'; }
var _cfMasOpc=false;
function _cfToggleOpc(){
  _cfMasOpc=!_cfMasOpc;
  var el=document.getElementById('cf-mas'); if(el)el.style.display=_cfMasOpc?'block':'none';
  var t=document.getElementById('cf-mas-t'); if(t)t.textContent=_cfMasOpc?'▾ Menos opciones':'▸ Más opciones (quién, empresa, monto, nota)';
}
function _cfFormHTML(){
  if(!_cfFamiliaEs())return '';
  var yo=_cfU(); var opts=Object.keys(CF_FAMILIA).map(function(k){ return '<option value="'+CF_FAMILIA[k]+'"'+((CF_FAMILIA[k]===CF_FAMILIA[yo])?' selected':'')+'>'+CF_FAMILIA[k]+'</option>'; }).join('');
  var masT=_cfMasOpc?'▾ Menos opciones':'▸ Más opciones (quién, empresa, monto, nota)';
  return '<div class="tbox" style="padding:14px;margin-bottom:14px">'+
    '<div style="font-weight:800;font-size:15px;margin-bottom:10px">🧺 Anotar lo que me llevo</div>'+
    _cfLbl('¿Qué te llevaste?','<input id="cf-producto" placeholder="nombre del producto" autocomplete="off" style="'+_cfInp()+';font-size:15px;padding:12px">')+
    '<div style="display:flex;gap:8px;align-items:flex-end;margin-top:9px">'+
      '<div style="width:92px;flex:none">'+_cfLbl('Cantidad','<input id="cf-cant" type="number" inputmode="numeric" step="1" min="1" value="1" style="'+_cfInp()+';text-align:center;font-size:15px;padding:12px">')+'</div>'+
      '<button class="btn btn-accent" style="flex:1;padding:13px 0;font-size:15px;font-weight:800" onclick="_cfRegistrar()">Anotar</button>'+
    '</div>'+
    '<div style="margin-top:10px"><span id="cf-mas-t" onclick="_cfToggleOpc()" style="font-size:12px;color:var(--accent);font-weight:700;cursor:pointer;user-select:none">'+masT+'</span></div>'+
    '<div id="cf-mas" style="display:'+(_cfMasOpc?'block':'none')+';margin-top:9px;padding-top:10px;border-top:1px dashed var(--border)">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
        _cfLbl('¿Quién?','<select id="cf-quien" style="'+_cfInp()+'">'+opts+'</select>')+
        _cfLbl('Empresa','<select id="cf-emp" style="'+_cfInp()+'"><option value="FARMACIA">Farmacia</option><option value="DROGUERIA">Droguería</option></select>')+
        _cfLbl('Fecha','<input id="cf-fecha" type="date" value="'+_cfHoy()+'" style="'+_cfInp()+'">')+
        _cfLbl('Monto $ (si lo sabes)','<input id="cf-monto" type="number" step="0.01" placeholder="opcional" style="'+_cfInp()+'">')+
      '</div>'+
      '<div style="margin-top:8px">'+_cfLbl('Nota','<input id="cf-nota" placeholder="opcional" style="'+_cfInp()+'">')+'</div>'+
    '</div>'+
  '</div>';
}
function _cfChip(txt,bg,col){ return '<span style="background:'+bg+';color:'+col+';border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:800;white-space:nowrap">'+txt+'</span>'; }
function _cfCardHTML(m){
  var x=_cfFalta(m); var dias=_cfDias(m.fecha); var viejo=(x.inv||x.cob)&&dias>=3;
  var estInv=x.inv?_cfChip('📦 Falta sacar de inventario','#fef3c7','#92400e'):_cfChip('📦 Inventario ✓','#d1fae5','#065f46');
  var estCob=x.cob?_cfChip('💵 Falta cobrar','#fee2e2','#b91c1c'):_cfChip('💵 Cobrado ✓','#d1fae5','#065f46');
  var acc='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">';
  if(_cfInventarioEs())acc+='<button onclick="_cfSacar('+m.id+')" style="border:1.5px solid '+(x.inv?'#f59e0b':'var(--green)')+';background:'+(x.inv?'#fffbeb':'#d1fae5')+';color:'+(x.inv?'#92400e':'#065f46')+';border-radius:999px;padding:5px 12px;font-size:11px;font-weight:800;cursor:pointer">'+(x.inv?'📦 Sacar del inventario':'✓ Sacado del inventario')+'</button>';
  if(_cfCobraEs())acc+='<button onclick="_cfCobrar('+m.id+')" style="border:1.5px solid '+(x.cob?'#dc2626':'var(--green)')+';background:'+(x.cob?'#fff5f5':'#d1fae5')+';color:'+(x.cob?'#b91c1c':'#065f46')+';border-radius:999px;padding:5px 12px;font-size:11px;font-weight:800;cursor:pointer">'+(x.cob?'💵 Marcar cobrado':'✓ Cobrado')+'</button>';
  acc+='<span style="flex:1"></span>'+(_cfEsAdmin()?('<button onclick="_cfDel('+m.id+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:14px">×</button>'):'')+'</div>';
  return '<div class="tbox" style="padding:11px 14px;margin-bottom:9px'+(viejo?';border-left:4px solid #dc2626':(!(x.inv||x.cob)?';opacity:.7':''))+'">'+
    '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">'+
      '<span style="font-size:14px;font-weight:800">'+(m.cantidad&&_cfN(m.cantidad)!==1?(_cfN(m.cantidad)+'× '):'')+esc(m.producto||'—')+'</span>'+
      (_cfN(m.monto)>0?_cfChip(_cfMoney(m.monto),'var(--surface2)','var(--text)'):'')+
      '<span style="flex:1"></span>'+
      (viejo?_cfChip('⏳ '+dias+' días esperando','#fee2e2','#b91c1c'):'')+
    '</div>'+
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">'+estInv+estCob+_cfChip((m.empresa==='DROGUERIA'?'DROG':'FARM'),'var(--surface2)','var(--muted)')+'</div>'+
    '<div style="font-size:10.5px;color:var(--muted);margin-top:5px">'+esc(m.quien||'')+' · '+_cfFechaLbl(m.fecha)+(m.nota?(' · '+esc(m.nota)):'')+
      (m.sacado_en?(' · 📦 '+esc(m.sacado_por||'')):'')+(m.cobrado_en?(' · 💵 '+esc(m.cobrado_por||'')):'')+'</div>'+
    acc+'</div>';
}
function _cfRender(){
  var c=document.getElementById('consumo-content'); if(!c)return;
  if(!_cfPuedeVer()){ c.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted)">Este módulo es de la familia y de quienes sacan/cobran los consumos.</div>'; return; }
  if(_cfLoading&&!_cfReady){ c.innerHTML='<div style="padding:20px;color:var(--muted)">Cargando consumos…</div>'; return; }
  var pend=(_cfRows||[]).filter(_cfPend);
  var faltaInv=pend.filter(function(m){ return _cfFalta(m).inv; }).length;
  var faltaCob=pend.filter(function(m){ return _cfFalta(m).cob; }).length;
  var totalPend=pend.reduce(function(a,m){ return a+(_cfFalta(m).cob?_cfN(m.monto):0); },0);
  var resumen='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+
    '<div style="flex:1;min-width:130px;background:'+(faltaInv?'#fffbeb':'var(--surface2)')+';border-radius:12px;padding:10px 13px"><div style="font-size:9.5px;color:var(--muted);font-weight:800;text-transform:uppercase">📦 Falta sacar de inventario</div><div style="font-size:20px;font-weight:900;color:'+(faltaInv?'#92400e':'var(--text)')+'">'+faltaInv+'</div></div>'+
    '<div style="flex:1;min-width:130px;background:'+(faltaCob?'#fef2f2':'var(--surface2)')+';border-radius:12px;padding:10px 13px"><div style="font-size:9.5px;color:var(--muted);font-weight:800;text-transform:uppercase">💵 Falta cobrar</div><div style="font-size:20px;font-weight:900;color:'+(faltaCob?'#b91c1c':'var(--text)')+'">'+faltaCob+(totalPend>0?(' <span style="font-size:12px">· '+_cfMoney(totalPend)+'</span>'):'')+'</div></div>'+
    '</div>';
  var fchip=function(k,lbl){ var act=(_cfFiltro===k); return '<button onclick="_cfSetFiltro(\''+k+'\')" style="border:1.5px solid '+(act?'var(--accent)':'var(--border)')+';background:'+(act?'var(--accent)':'var(--surface)')+';color:'+(act?'#fff':'var(--muted)')+';border-radius:999px;padding:5px 13px;font-size:12px;font-weight:700;cursor:pointer">'+lbl+'</button>'; };
  var barra='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:11px">'+
    fchip('pend','Pendientes'+(pend.length?(' ('+pend.length+')'):''))+fchip('todos','Todos')+
    '<span style="flex:1"></span><button class="btn btn-ghost btn-sm" onclick="_cfRefrescar()">🔄</button></div>';
  var lista=(_cfFiltro==='pend')?pend:(_cfRows||[]).slice(0,150);
  var body=lista.length?lista.map(_cfCardHTML).join(''):'<div class="tbox" style="padding:18px;text-align:center;color:var(--muted);font-size:12.5px">'+(_cfFiltro==='pend'?'Todo al día: nada pendiente por sacar ni cobrar. 🎉':'Sin consumos registrados.')+'</div>';
  c.innerHTML='<h2 style="margin:2px 0 4px;font-size:19px">🧺 Consumo de la familia</h2>'+
    '<div style="font-size:11.5px;color:var(--muted);margin-bottom:12px">La familia anota lo que se lleva; Edilso lo saca del inventario y Mayra lo cobra. Lo que lleve <b>3 días o más</b> sin resolver se marca en rojo.</div>'+
    resumen+_cfFormHTML()+barra+body;
}

// Aviso al entrar (Edilso/Leonard/Mayra/familia): cargar el conteo para el badge del tab
setTimeout(function(){
  try{
    if(typeof supabaseClient==='undefined'||!supabaseClient)return;
    if(!_cfPuedeVer())return;
    supabaseClient.from('consumo_familia').select('id,estado,sacado_en,cobrado_en,fecha').neq('estado','cobrado').then(function(res){
      _cfRows=(res&&res.data)||[]; _cfBadge();
      var vencidos=(_cfRows||[]).filter(function(m){ return _cfPend(m)&&_cfDias(m.fecha)>=3; }).length;
      if(vencidos>0&&(_cfInventarioEs()||_cfCobraEs()||_cfEsAdmin())) showToast&&showToast('🧺 '+vencidos+' consumo(s) de la familia llevan 3+ días sin sacar/cobrar');
    }).catch(function(){});
  }catch(e){}
},9000);
