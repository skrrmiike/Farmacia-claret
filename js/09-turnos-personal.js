function _turSetVista(v){ if(v==='limpieza')v='turnos'; _turVista=v; _turBrush='7-4'; if(v==='asistencia'&&!_turAsisReady){ _turAsisCargar(); } else { renderTurnos(); } }

function _turUD(f){ var p=String(f).slice(0,10).split('-'); return new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); }
function _turUISO(d){ return d.toISOString().slice(0,10); }
function _turUMas(f,n){ var d=_turUD(f); d.setUTCDate(d.getUTCDate()+n); return _turUISO(d); }
function _turUDow(f){ return _turUD(f).getUTCDay(); } // 0=domingo
function _turMonday(){ var h=HOY(); return _turUMas(h, -((_turUDow(h)+6)%7)); }
function _turSnapLunes(f){ try{ if(!/^\d{4}-\d{2}-\d{2}/.test(String(f))) return _turMonday(); return _turUMas(f, -((_turUDow(f)+6)%7)); }catch(e){ return _turMonday(); } }
function _turSemana(delta){ _turInicio=_turUMas(_turInicio, delta*7); _turCargar(); }
function _turSemanaHoy(){ _turInicio=_turMonday(); _turCargar(); }
var TUR_MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _turSemanaLbl(){
  var a=_turUD(_turInicio), b=_turUD(_turUMas(_turInicio,6));
  var ma=TUR_MESES[a.getUTCMonth()], mb=TUR_MESES[b.getUTCMonth()];
  var txt=(ma===mb)?(a.getUTCDate()+' – '+b.getUTCDate()+' de '+ma):(a.getUTCDate()+' '+ma+' – '+b.getUTCDate()+' '+mb);
  return txt+' '+b.getUTCFullYear()+((_turInicio===_turMonday())?' · esta semana':'');
}
function _turFechas(inicio){ var out=[]; for(var i=0;i<7;i++){ var f=_turUMas(inicio,i), d=_turUD(f); out.push({dia:TURNOS_DIAS[(d.getUTCDay()+6)%7], dm:d.getUTCDate(), iso:f}); } return out; }
function _turShiftHours(code){ for(var i=0;i<TURNOS_CAT.length;i++){ var t=TURNOS_CAT[i]; if(t.c===code && t.i!=null) return [t.i,t.f]; } return null; }
function _turCoverageDay(di){
  var bands=[[7,13],[13,19],[19,31]]; var cnt=[0,0,0]; var tot=0;
  _turEmpleados.forEach(function(e){ if(_turNovTiene(e.id,di,['falta','vacaciones'])) return; var code=(_turData[e.id]||{})[di]; var h=_turShiftHours(code); if(!h) return; tot++; bands.forEach(function(b,bi){ if(h[0]<b[1]&&h[1]>b[0]) cnt[bi]++; }); });
  return {cnt:cnt,tot:tot};
}
async function _turCargar(){
  _turLoading=true; renderTurnos();
  try{
    var er=await supabaseClient.from('empleados').select('id,nombre,cargo,empresa,activo,horario_fijo,horas_extra,rota').eq('empresa',_turEmpresa).order('nombre');
    _turEmpleadosAll=(er.data||[]);
    _turEmpleados=_turEmpleadosAll.filter(function(e){ return e.activo!==false; });
    var tr=await supabaseClient.from('turnos').select('data').eq('empresa',_turEmpresa).eq('quincena_inicio',_turInicio).maybeSingle();
    _turData=(tr.data&&tr.data.data&&tr.data.data.asig)?tr.data.data.asig:{};
    _turLimpData=(tr.data&&tr.data.data&&tr.data.data.limpieza)?tr.data.data.limpieza:{};
    try{ var nr=await supabaseClient.from('empleado_asistencia').select('empleado_id,fecha,tipo,horas').eq('empresa',_turEmpresa).gte('fecha',_turInicio).lte('fecha',_turUMas(_turInicio,6));
      _turNov={}; ((nr&&nr.data)||[]).forEach(function(r){ var k=String(r.empleado_id), di=(_turUDow(r.fecha)+6)%7; _turNov[k]=_turNov[k]||{}; (_turNov[k][di]=_turNov[k][di]||[]).push(r); });
    }catch(_en){ _turNov={}; }
    // Rellenar solo a quienes tienen horario fijo y aún no tienen asignación esta quincena
    _turEmpleados.forEach(function(e){ var k=String(e.id), f=e.horario_fijo;
      if(f && typeof f==='object' && Object.keys(f).length && (!_turData[k] || !Object.keys(_turData[k]).length)){ _turData[k]=JSON.parse(JSON.stringify(f)); } });
  }catch(e){ console.warn('turnos cargar:',e); _turEmpleados=_turEmpleados||[]; }
  _turLoading=false; _turReady=true; renderTurnos();
}
function _turEntrar(){ if(!_turInicio) _turInicio=_turMonday(); else _turInicio=_turSnapLunes(_turInicio); if(!_turReady){ _turCargar(); } else { renderTurnos(); } }
function _turCambiarEmpresa(v){ _turEmpresa=v; _turCargar(); }
function _turCambiarInicio(v){ if(v){ _turInicio=_turSnapLunes(v); _turCargar(); } }
function _turSet(el){ var e=el.getAttribute('data-e'), d=el.getAttribute('data-d'); _turData[e]=_turData[e]||{}; _turData[e][d]=el.value; _turCoverageUpdate(); }
function _turCoverageUpdate(){
  for(var di=0;di<7;di++){ var cell=document.getElementById('turcov-'+di); if(!cell) continue;
    var r=_turCoverageDay(di), c=r.cnt;
    var z=function(n){ return n===0?'<span style="color:var(--red);font-weight:700">0</span>':String(n); };
    cell.innerHTML='M '+z(c[0])+' · T '+z(c[1])+' · N '+z(c[2]);
  }
}
function _turGuardar(){
  if(typeof supabaseClient==='undefined'||!supabaseClient){ showToast('Sin conexión al servidor'); return; }
  var row={ empresa:_turEmpresa, quincena_inicio:_turInicio, data:{asig:_turData, limpieza:_turLimpData}, actualizado_por:(typeof currentUser!=='undefined'?currentUser:null), updated_at:new Date().toISOString() };
  supabaseClient.from('turnos').upsert([row],{onConflict:'empresa,quincena_inicio'}).then(function(res){
    if(res&&res.error){ showToast('No se pudo guardar: '+(res.error.message||'')); }
    else { if(typeof logAudit==='function') logAudit('turnos.guardar', _turEmpresa+' · quincena '+_turInicio); showToast('Horario guardado.'); }
  }).catch(function(){ showToast('No se pudo guardar el horario'); });
}
var _turNov={}; // novedades de asistencia de la semana visible: {empId:{diaIdx:[rows]}}
function _turNovBadge(eid,di){ var l=(_turNov[String(eid)]||{})[di]; if(!l||!l.length) return '';
  var M={falta:'❌',falta_justificada:'📄',vacaciones:'🏖️',extra:'⏱️'};
  return ' <span style="font-size:9px" title="'+l.map(function(r){ return r.tipo.replace('_',' ')+(r.horas?(' '+r.horas+'h'):''); }).join(', ')+'">'+l.map(function(r){ return (M[r.tipo]||''); }).join('')+'</span>'; }
function _turNovTiene(eid,di,tipos){ var l=(_turNov[String(eid)]||{})[di]||[]; for(var i=0;i<l.length;i++) if(tipos.indexOf(l[i].tipo)>=0) return true; return false; }
function _turColor(code){ var m={'7-4':'#dbeafe','8-5':'#dbeafe','9-6':'#bfdbfe','10-7':'#fde68a','2-7':'#fed7aa','1-10':'#fdba74','7-7':'#e9d5ff','N':'#1e3a5f','L':'#e5e7eb','V':'#bbf7d0'}; return m[code]||''; }
function _turTxt(code){ return code==='N'?'#ffffff':'#1e293b'; }
function _turSetBrush(code){ _turBrush=code; renderTurnos(); }
/* ── Fijos vs. rotativos ──
   "Rota" = sale en el horario impreso. Por defecto: quien tiene horario fijo NO rota,
   EXCEPTO los turneros (semana fija con 7-7 o noche N), que sí rotan y se imprimen.
   Se puede forzar con la casilla "Rota" en Empleados (columna empleados.rota). */
function _turPatTurnero(e){ var f=e&&e.horario_fijo; if(!f||typeof f!=='object')return false; var ks=Object.keys(f); for(var i=0;i<ks.length;i++){ var v=String(f[ks[i]]); if(v==='7-7'||v==='N')return true; } return false; }
function _turRota(e){ if(!e)return true; if(e.rota===true)return true; if(e.rota===false)return false;
  var tieneFijo=(e.horario_fijo&&typeof e.horario_fijo==='object'&&Object.keys(e.horario_fijo).length);
  if(!tieneFijo)return true; return _turPatTurnero(e); }
function _turRotan(){ return (_turEmpleados||[]).filter(_turRota); }
function _turFijosNP(){ return (_turEmpleados||[]).filter(function(e){return !_turRota(e);}); }
function _turPaint(empId,di){
  var k=String(empId);
  _turData[k]=_turData[k]||{}; _turData[k][di]=_turBrush;
  var cell=document.getElementById('turc-'+empId+'-'+di);
  if(cell){ cell.style.background=_turColor(_turBrush)||((_turNovTiene(empId,di,['vacaciones'])&&!_turBrush)?'#ede9fe':'var(--surface)'); cell.style.color=_turTxt(_turBrush); cell.innerHTML=_turLblCel(_turBrush)+_turNovBadge(empId,di); }
  _turCoverageUpdate();
}

async function _turCopyAnterior(){
  var pk=_turUMas(_turInicio,-7);
  try{ var tr=await supabaseClient.from('turnos').select('data').eq('empresa',_turEmpresa).eq('quincena_inicio',pk).maybeSingle();
    if(tr.data&&tr.data.data&&tr.data.data.asig){ _turData=JSON.parse(JSON.stringify(tr.data.data.asig)); renderTurnos(); showToast('Copiado el horario de la semana anterior.'); }
    else showToast('No hay horario guardado en la semana anterior.'); }catch(e){ showToast('No se pudo copiar.'); }
}
function _turPalette(){
  var brushes=['7-4','7-5','8-5','9-6','10-7','1-10','7-7','L',''];
  return '<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:0 0 14px">'+
   '<span style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-right:4px">Turno</span>'+
   brushes.map(function(code){ var _t=TURNOS_CAT.filter(function(x){return x.c===code;})[0]; var lbl=(code===''?'Borrar':((_t&&_t.lbl)||code)); var bg=_turColor(code)||'var(--surface2)'; var act=(_turBrush===code);
     return '<button type="button" onclick="_turSetBrush(\''+code+'\')" style="font-size:12px;font-weight:700;padding:6px 13px;border-radius:8px;cursor:pointer;background:'+bg+';color:'+_turTxt(code)+';border:'+(act?'2px solid var(--accent)':'1px solid var(--border)')+';box-shadow:'+(act?'0 2px 8px rgba(37,99,235,.25)':'none')+'">'+lbl+'</button>'; }).join('')+
   '<span style="font-size:11px;color:var(--muted);margin-left:4px">y haz clic en las celdas</span></div>';
}

function _turModalAncho(inner){
  if(typeof _contaCloseModal==='function') _contaCloseModal();
  var d=document.createElement('div'); d.id='conta-modal';
  d.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
  d.innerHTML='<div style="background:var(--surface,#fff);color:#1e293b;border-radius:16px;max-width:min(900px,95vw);width:100%;box-shadow:0 24px 64px rgba(0,0,0,.32)">'+inner+'</div>';
  d.addEventListener('click',function(e){ if(e.target===d && typeof _contaCloseModal==='function') _contaCloseModal(); });
  document.body.appendChild(d);
}
function _turAbrirEmpleados(){
  var rows=_turEmpleadosAll.map(_turEmpRow).join('');
  var inner='<div style="padding:14px 18px;border-bottom:1px solid #eef0f3;font-weight:600;font-size:15px;display:flex;justify-content:space-between;align-items:center;color:#1e293b">Empleados — '+(_turEmpresa==='FARMACIA'?'Farmacia':'Droguería')+'<button class="btn btn-ghost btn-sm" onclick="_turCerrarEmp()">Cerrar</button></div>'+
   '<div style="padding:12px 16px;max-height:72vh;overflow:auto;color:#1e293b"><div style="font-size:11px;color:#64748b;margin-bottom:8px">Cambia el cargo o la empresa, desmarca "Activo" para quien ya no trabaja, o agrega a alguien nuevo. <b>"Rota"</b> = sale en el horario que se imprime (desmárcalo para el personal fijo; los turneros deben tenerlo marcado). Guarda cada fila.</div>'+
   '<div style="overflow-x:hidden"><table style="width:100%;table-layout:fixed;border-collapse:collapse"><colgroup><col style="width:26%"><col style="width:17%"><col style="width:16%"><col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:20%"></colgroup><thead><tr><th style="text-align:left;font-size:11px;padding:4px 4px">Nombre</th><th style="text-align:left;font-size:11px;padding:4px 4px">Cargo</th><th style="text-align:left;font-size:11px;padding:4px 4px">Empresa</th><th style="text-align:center;font-size:11px;padding:4px 4px" title="Sigue trabajando aquí">Activo</th><th style="text-align:center;font-size:11px;padding:4px 4px" title="Acepta horas extra">Extra</th><th style="text-align:center;font-size:11px;padding:4px 4px" title="Sale en el horario impreso (rotativo). El personal fijo va desmarcado.">Rota</th><th style="text-align:center;font-size:11px;padding:4px 4px">Acciones</th></tr></thead><tbody id="tur-emp-rows">'+rows+'</tbody></table></div>'+
   '<div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap"><button class="btn btn-accent btn-sm" onclick="_turEmpGuardarTodo(this)">Guardar todo</button><button class="btn btn-ghost btn-sm" onclick="_turEmpAgregar()">+ Agregar empleado</button></div></div>';
  _turModalAncho(inner);
}
function _turEmpRow(e){
  var fijo=(e.horario_fijo&&typeof e.horario_fijo==='object'&&Object.keys(e.horario_fijo).length);
  return '<tr data-id="'+e.id+'" style="border-top:1px solid #eef0f3">'+
   '<td style="padding:4px 4px"><input class="te-nom form-input" value="'+esc(e.nombre||'')+'" style="width:100%;box-sizing:border-box;padding:4px 6px;font-size:12px"></td>'+
   '<td style="padding:4px 4px"><select class="te-cargo form-input" style="width:100%;box-sizing:border-box;padding:4px 4px;font-size:12px">'+[''].concat(TUR_CARGOS).map(function(cg){return '<option value="'+cg+'"'+((e.cargo||'')===cg?' selected':'')+'>'+(cg||'—')+'</option>';}).join('')+'</select></td>'+
   '<td style="padding:4px 4px"><select class="te-emp form-input" style="width:100%;box-sizing:border-box;padding:4px 4px;font-size:12px"><option value="FARMACIA"'+(e.empresa==='FARMACIA'?' selected':'')+'>Farmacia</option><option value="DROGUERIA"'+(e.empresa==='DROGUERIA'?' selected':'')+'>Droguería</option></select></td>'+
   '<td style="text-align:center;padding:4px 4px"><input type="checkbox" class="te-act" title="Sigue trabajando aquí" '+(e.activo!==false?'checked':'')+'></td>'+
   '<td style="text-align:center;padding:4px 4px"><input type="checkbox" class="te-extra" title="Acepta horas extra" '+(e.horas_extra?'checked':'')+'></td>'+
   '<td style="text-align:center;padding:4px 4px"><input type="checkbox" class="te-rota" title="Sale en el horario impreso (rotativo)" '+(_turRota(e)?'checked':'')+'></td>'+
   '<td style="padding:4px 4px;text-align:center;white-space:nowrap"><button class="btn btn-ghost btn-sm" style="padding:4px 8px" title="Horario fijo" onclick="_turFijoEditor('+e.id+')">Fijo'+(fijo?' ✓':'')+'</button> <button class="btn btn-ghost btn-sm" style="padding:4px 7px;color:var(--red)" title="Borrar empleado" onclick="_turEmpBorrar('+e.id+',this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button></td></tr>';
}
function _turEmpGuardarTodo(btn){
  var trs=Array.prototype.slice.call(document.querySelectorAll('#tur-emp-rows tr'));
  var arr=[], bad=false;
  trs.forEach(function(tr){
    var id=tr.getAttribute('data-id');
    var nom=(tr.querySelector('.te-nom').value||'').trim();
    if(!nom){ bad=true; return; }
    var ex=tr.querySelector('.te-extra'); var ac=tr.querySelector('.te-act'); var ro=tr.querySelector('.te-rota'); arr.push({ id:(isNaN(+id)?id:+id), nombre:nom, cargo:tr.querySelector('.te-cargo').value||null, empresa:tr.querySelector('.te-emp').value, horas_extra:ex?ex.checked:false, activo:ac?ac.checked:true, rota:ro?ro.checked:true });
  });
  if(bad){ showToast('Hay un nombre vacío. Revísalo antes de guardar.'); return; }
  if(!arr.length){ showToast('No hay empleados que guardar.'); return; }
  if(btn){ btn.disabled=true; btn.textContent='Guardando...'; }
  supabaseClient.from('empleados').upsert(arr).then(function(res){
    if(btn){ btn.disabled=false; btn.textContent='Guardar todo'; }
    if(res&&res.error){ showToast('No se pudo guardar: '+(res.error.message||'')); return; }
    _turEmpleadosAll=_turEmpleadosAll.map(function(e){ var u=arr.find(function(a){return String(a.id)===String(e.id);}); return u?Object.assign({},e,u):e; });
    showToast('Cambios guardados ('+arr.length+').');
  }).catch(function(){ if(btn){ btn.disabled=false; btn.textContent='Guardar todo'; } showToast('No se pudo guardar.'); });
}
function _turEmpBorrar(id,btn){
  var tr=btn.closest('tr'); if(!tr) return;
  var nom=(tr.querySelector('.te-nom')&&tr.querySelector('.te-nom').value)||'este empleado';
  if(!confirm('¿Borrar a '+nom+'? Esta acción no se puede deshacer.')) return;
  if(btn) btn.disabled=true;
  supabaseClient.from('empleados').delete().eq('id',id).then(function(res){
    if(res&&res.error){ if(btn) btn.disabled=false; showToast('No se pudo borrar: '+(res.error.message||'')); return; }
    tr.parentNode.removeChild(tr);
    _turEmpleadosAll=_turEmpleadosAll.filter(function(e){ return String(e.id)!==String(id); });
    showToast('Empleado borrado.');
  }).catch(function(){ if(btn) btn.disabled=false; showToast('No se pudo borrar.'); });
}
function _turEmpAgregar(){
  supabaseClient.from('empleados').insert([{empresa:_turEmpresa,nombre:'NUEVO',cargo:null,activo:true}]).select('id,nombre,cargo,empresa,activo').then(function(res){
    if(res&&res.data&&res.data[0]){ _turEmpleadosAll.push(res.data[0]); var tb=document.getElementById('tur-emp-rows'); if(tb) tb.insertAdjacentHTML('beforeend',_turEmpRow(res.data[0])); }
    else showToast('No se pudo agregar.');
  }).catch(function(){ showToast('No se pudo agregar.'); });
}
function _turCerrarEmp(){ if(typeof _contaCloseModal==='function') _contaCloseModal(); _turReady=false; _turCargar(); }
function _turFijoEditor(empId){
  var e=_turEmpleadosAll.find(function(x){return x.id===empId;}); if(!e) return;
  var fijo=(e.horario_fijo&&typeof e.horario_fijo==='object')?e.horario_fijo:{};
  var opts=function(cur){ return TURNOS_CAT.map(function(t){ var v=t.c, lbl=t.lbl||t.c||'—'; return '<option value="'+v+'"'+((cur||'')===v?' selected':'')+'>'+lbl+'</option>'; }).join(''); };
  var rowsel=TURNOS_DIAS.map(function(d,i){ return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:44px;font-size:12px;font-weight:600">'+d+'</span><select class="tf-d form-input" data-d="'+i+'" style="padding:3px 6px;flex:1">'+opts(fijo[i])+'</select></div>'; }).join('');
  var inner='<div style="padding:14px 18px;border-bottom:1px solid #eef0f3;font-weight:600;font-size:15px;color:#1e293b">Horario fijo — '+esc(e.nombre)+'</div>'+
    '<div style="padding:14px 18px;color:#1e293b"><div style="font-size:11px;color:#64748b;margin-bottom:10px">Define la semana tipo de esta persona. Se rellenará sola en cada quincena nueva. Deja todo en "—" para quitarle el horario fijo.</div>'+
    rowsel+
    '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-accent" style="flex:1" onclick="_turFijoGuardar('+empId+')">Guardar horario fijo</button><button class="btn btn-ghost" onclick="_turAbrirEmpleados()">Cancelar</button></div></div>';
  _turModalAncho(inner);
}
function _turFijoGuardar(empId){
  var sels=document.querySelectorAll('#conta-modal .tf-d'); var fijo={};
  sels.forEach(function(s){ var v=s.value; if(v) fijo[s.getAttribute('data-d')]=v; });
  var payload=Object.keys(fijo).length?fijo:null;
  supabaseClient.from('empleados').update({horario_fijo:payload}).eq('id',empId).then(function(res){
    if(res&&res.error){ showToast('No se pudo guardar el horario fijo.'); return; }
    var e=_turEmpleadosAll.find(function(x){return x.id===empId;}); if(e) e.horario_fijo=payload;
    if(typeof _contaCloseModal==='function') _contaCloseModal();
    showToast('Horario fijo guardado.');
    _turAbrirEmpleados();
  }).catch(function(){ showToast('No se pudo guardar el horario fijo.'); });
}
function _turAplicarFijos(){
  var n=0;
  _turEmpleados.forEach(function(e){ var f=e.horario_fijo; if(f&&typeof f==='object'&&Object.keys(f).length){ _turData[String(e.id)]=JSON.parse(JSON.stringify(f)); n++; } });
  renderTurnos(); showToast(n?('Aplicados '+n+' horario(s) fijo(s).'):'Nadie tiene horario fijo todavía.');
}

function _turEmpresaSel(){
  return '<select class="form-input" style="width:auto;padding:7px 11px;font-weight:600" onchange="_turCambiarEmpresa(this.value)">'+
    ['FARMACIA','DROGUERIA'].map(function(e){ return '<option value="'+e+'"'+(e===_turEmpresa?' selected':'')+'>'+(e==='FARMACIA'?'Farmacia':'Droguería')+'</option>'; }).join('')+'</select>';
}
function _turNavSemana(){
  var nav='<button class="btn btn-ghost btn-sm" title="Semana anterior" onclick="_turSemana(-1)" style="padding:7px 13px;font-weight:800;font-size:15px;line-height:1">‹</button>'+
    '<div style="display:flex;align-items:center;gap:8px;padding:6px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)">'+
      '<span style="font-weight:800;font-size:13px;white-space:nowrap">'+_turSemanaLbl()+'</span>'+
      '<input type="date" value="'+_turInicio+'" onchange="_turCambiarInicio(this.value)" title="Ir a una semana" style="border:0;background:transparent;color:var(--muted);font-size:11px;width:20px;padding:0;cursor:pointer">'+
    '</div>'+
    '<button class="btn btn-ghost btn-sm" title="Semana siguiente" onclick="_turSemana(1)" style="padding:7px 13px;font-weight:800;font-size:15px;line-height:1">›</button>'+
    (_turInicio!==_turMonday()?'<button class="btn btn-ghost btn-sm" onclick="_turSemanaHoy()" style="padding:7px 12px">Hoy</button>':'');
  return '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">'+nav+'</div>';
}
function _turToolbar(){
  var ICO={
    guardar:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>',
    gen:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    emp:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    imp:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'
  };
  var generar=(_turEmpresa==='FARMACIA')
    ? '<button class="btn btn-green btn-sm" style="padding:8px 15px" onclick="_genAbrirConfig()">'+ICO.gen+'Generar</button>'
    : '<button class="btn btn-green btn-sm" style="padding:8px 15px" onclick="_genAplicarDrogueria()">'+ICO.gen+'Aplicar 7–5 a todos</button>';
  return '<div class="tbox" style="padding:13px 15px;margin-bottom:16px">'+
    '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'+
      '<div style="display:inline-flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;flex:none">'+_turVistaBtns()+'</div>'+
      '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.4px">Empresa</span>'+_turEmpresaSel()+'</div>'+
      '<div style="margin-left:auto">'+_turNavSemana()+'</div>'+
    '</div>'+
    '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;border-top:1px solid var(--border);margin-top:13px;padding-top:13px">'+
      '<button class="btn btn-accent btn-sm" style="padding:8px 17px" onclick="_turGuardar()">'+ICO.guardar+'Guardar</button>'+
      generar+
      '<span style="width:1px;height:22px;background:var(--border);margin:0 3px"></span>'+
      '<button class="btn btn-ghost btn-sm" style="padding:8px 14px" onclick="_turCopyAnterior()">Copiar semana anterior</button>'+
      '<button class="btn btn-ghost btn-sm" style="padding:8px 14px" onclick="_turAplicarFijos()">Aplicar fijos</button>'+
      '<span style="flex:1"></span>'+
      '<button class="btn btn-ghost btn-sm" style="padding:8px 14px" onclick="_turAbrirEmpleados()">'+ICO.emp+'Empleados</button>'+
      '<button class="btn btn-ghost btn-sm" style="padding:8px 14px" onclick="_turImprimir()">'+ICO.imp+'Imprimir</button>'+
    '</div></div>';
}
function renderTurnos(){
  var c=document.getElementById('turnos-content'); if(!c) return;
  if(!_turInicio) _turInicio=_turMonday(); else _turInicio=_turSnapLunes(_turInicio);
  var titulo='<p class="section-title" style="margin:0 0 14px">Turnos — Horarios del personal</p>';
  if(_turLoading){ c.innerHTML=titulo+'<div style="padding:28px;color:var(--muted);text-align:center">Cargando…</div>'; return; }
  if(_turVista==='asistencia'){ c.innerHTML=titulo+_turAsisHTML(); return; }
  var F=_turFechas(_turInicio);
  var ayuda='<div style="font-size:11.5px;color:var(--muted);margin:0 0 14px;line-height:1.6">Horario de <strong>esta semana</strong> (lunes a domingo). Usa <strong>‹ ›</strong> para cambiar de semana — cada una se guarda aparte. Cobertura por franja: <strong>M</strong>añana 7–13 · <strong>T</strong>arde 13–19 · <strong>N</strong>oche 19–7 (en rojo si queda en 0).</div>';
  if(!_turEmpleados.length){
    c.innerHTML=titulo+_turToolbar()+'<div class="tbox" style="padding:30px;text-align:center"><div style="font-size:32px">👥</div><div style="font-weight:700;margin-top:6px">No hay empleados activos en '+(_turEmpresa==='FARMACIA'?'Farmacia':'Droguería')+'</div><div style="color:var(--muted);font-size:12.5px;margin-top:4px">Usa el botón <b>Empleados</b> para agregarlos o activarlos.</div></div>';
    return;
  }
  var thEmp='text-align:left;padding:5px 10px;font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;position:sticky;left:0;background:var(--surface2);z-index:2;border-right:2px solid var(--border)';
  var ths='<th style="'+thEmp+'">Trabajador</th>'+F.map(function(d,di){
    var findes=(di>=5);
    return '<th style="text-align:center;padding:4px 3px;min-width:52px;font-size:10.5px;font-weight:800;color:'+(findes?'var(--accent)':'var(--text)')+';text-transform:uppercase;letter-spacing:.3px">'+d.dia+' <span style="font-weight:600;color:var(--muted);font-size:10.5px">'+d.dm+'</span></th>'; }).join('');
  var tdEmp='padding:3px 10px;font-size:12px;font-weight:700;white-space:nowrap;position:sticky;left:0;background:var(--surface);z-index:1;border-right:2px solid var(--border)';
  var mkFila=function(e,ri){
    var tds=F.map(function(d,di){ var cur=(_turData[String(e.id)]||{})[di]||''; var bg=_turColor(cur);
      var enVac=(!cur&&_turNovTiene(e.id,di,['vacaciones'])); if(enVac)bg='#ede9fe';
      var lblC=enVac?'<span style="color:#7c3aed;font-weight:800">VAC</span>':_turLblCel(cur);
      return '<td id="turc-'+e.id+'-'+di+'" onclick="_turPaint('+e.id+','+di+')" title="'+esc(e.nombre)+' · '+d.dia+' '+d.dm+(enVac?' · DE VACACIONES':'')+'" style="cursor:pointer;text-align:center;font-size:10.5px;font-weight:700;padding:4px 2px;min-width:56px;border:1px solid var(--border);background:'+(bg||'var(--surface)')+';color:'+_turTxt(cur)+';transition:background .12s">'+lblC+_turNovBadge(e.id,di)+'</td>'; }).join('');
    return '<tr'+(ri%2?' style="background:var(--surface2)"':'')+'><td style="'+tdEmp+(ri%2?';background:var(--surface2)':'')+'">'+esc(e.nombre)+(e.cargo?(' <span style="font-size:9.5px;color:var(--muted);font-weight:500">· '+esc(e.cargo)+'</span>'):'')+'</td>'+tds+'</tr>';
  };
  var rotan=_turRotan(), fijosNP=_turFijosNP();
  var rows=rotan.map(mkFila).join('');
  if(fijosNP.length){
    rows+='<tr><td colspan="8" style="padding:6px 10px;background:#f1f5f9;color:#475569;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;border-top:2px solid var(--border)">🔒 Personal fijo — no sale en la impresión ('+fijosNP.length+')</td></tr>';
    rows+=fijosNP.map(mkFila).join('');
  }
  var cov='<td style="'+tdEmp+';background:var(--surface2);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted)">Cobertura</td>'+
    F.map(function(d,di){ return '<td id="turcov-'+di+'" style="text-align:center;font-size:10.5px;font-weight:700;padding:3px 3px;border:1px solid var(--border)"></td>'; }).join('');
  c.innerHTML=titulo+_turToolbar()+_turPalette()+ayuda+
    '<div class="tbox" style="padding:0;overflow:auto"><table style="border-collapse:collapse;width:100%"><thead><tr style="background:var(--surface2)">'+ths+'</tr></thead><tbody>'+rows+
    '</tbody><tfoot><tr style="background:var(--surface2)">'+cov+'</tr></tfoot></table></div>';
  _turCoverageUpdate();
}
function _turImprimir(){
  if(_turVista==='asistencia'){ showToast('Cambia a la vista Turnos para imprimir el horario'); return; }
  var _imprimibles=_turRotan(); // solo los que rotan (los fijos no van; los turneros sí)
  if(!_imprimibles.length){ showToast('No hay empleados rotativos que imprimir (los fijos no salen en la impresión)'); return; }
  var F=_turFechas(_turInicio);
  var emp=(_turEmpresa==='FARMACIA')?'Farmacia Claret':'Droguería Clínica';
  var ths='<th class="nm">Trabajador</th>'+F.map(function(d){ return '<th>'+d.dia+'<br><span class="dm">'+d.dm+'</span></th>'; }).join('');
  var rows=_imprimibles.map(function(e){
    var tds=F.map(function(d,di){ var cur=(_turData[String(e.id)]||{})[di]||''; var bg=_turColor(cur);
      var enVac=(!cur&&_turNovTiene(e.id,di,['vacaciones'])); if(enVac)bg='#ede9fe';
      var lblC=enVac?'<span style="color:#7c3aed;font-weight:800">VAC</span>':_turLblCel(cur);
      return '<td'+(bg?(' style="background:'+bg+';color:'+_turTxt(cur)+'"'):'')+'>'+lblC+_turNovBadge(e.id,di)+'</td>'; }).join('');
    return '<tr><td class="nm">'+esc(e.nombre)+(e.cargo?(' <span class="cg">· '+esc(e.cargo)+'</span>'):'')+'</td>'+tds+'</tr>';
  }).join('');
  var covTxt=F.map(function(d,di){ var r=_turCoverageDay(di); return '<td>M '+r.cnt[0]+' · T '+r.cnt[1]+' · N '+r.cnt[2]+'</td>'; }).join('');
  // Escala automática para que TODO el horario quepa en una sola hoja carta horizontal
  var _nEmp=_imprimibles.length;
  var _est=88+36+_nEmp*21+22+34; // título + encabezado + filas + cobertura + firmas (px aprox)
  var _zoom=Math.max(0.5,Math.min(1,690/_est));
  var css='@page{size:letter landscape;margin:7mm} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;zoom:'+_zoom.toFixed(3)+'}'+
    'h1{font-size:15px;margin:0 0 2px}.sub{font-size:11px;color:#444;margin-bottom:7px}'+
    'table{width:100%;border-collapse:collapse;page-break-inside:auto}'+
    'tr{page-break-inside:avoid}'+
    'th,td{border:1px solid #999;text-align:center;font-size:10px;padding:3px 2px}'+
    'th{background:#eee;font-size:9.5px;text-transform:uppercase}'+
    'th.nm,td.nm{text-align:left;width:150px;font-weight:bold;font-size:10.5px;white-space:nowrap}'+
    'td.cg{}.cg{font-weight:normal;font-size:8px;color:#555;display:inline}'+
    '.dm{font-weight:normal;color:#666}'+
    'tfoot td{background:#f3f3f3;font-size:9px}'+
    '.firma{margin-top:10px;font-size:10px}';
  var w=window.open('','_blank');
  if(!w){ showToast('El navegador bloqueó la ventana. Permite pop-ups para imprimir.'); return; }
  w.document.write('<!DOCTYPE html><html><head><title>Horario '+emp+' · '+_turSemanaLbl().replace(' · esta semana','')+'</title><style>'+css+'</style></head><body>'+
    '<h1>'+emp+' — Horario semanal</h1><div class="sub">Semana del '+_turSemanaLbl().replace(' · esta semana','')+'</div>'+
    '<table><thead><tr>'+ths+'</tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td class="nm">Cobertura (equipo completo)</td>'+covTxt+'</tr></tfoot></table>'+
    '<div class="firma">Elaborado por: ____________________ &nbsp;&nbsp; Revisado por: ____________________ &nbsp;&nbsp; Fecha: ____ /____ /______</div>'+
    '</body></html>');
  w.document.close();
  setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} },350);
  if(typeof logAudit==='function') logAudit('turnos.imprimir', _turEmpresa+' semana '+_turInicio);
}

// ── Generador de horarios (Farmacia) ─────────────────────────────────────
var _genCfg={ cov:{}, libres:2 };
var _GEN_SHIFTS=['7-4','7-5','8-5','9-6','10-7','1-10','7-7'];
function _genAssign(emps, cov, libres){
  libres=(libres==null?2:libres); var DIAS=7; var capN=Math.max(1,DIAS-libres);
  var assign={}, nightCount={}, workCount={}, lastShift={}, capK={};
  emps.forEach(function(e){ var k=String(e.id); assign[k]={}; nightCount[k]=0; workCount[k]=0; lastShift[k]=null; capK[k]=(e.extra||e.horas_extra)?Math.min(DIAS,DIAS-Math.max(0,libres-1)):capN; for(var d=0;d<DIAS;d++) assign[k][d]='L'; });
  var shifts=Object.keys(cov).filter(function(s){ return (cov[s].count||0)>0; });
  function startHour(s){ var t=TURNOS_CAT.filter(function(x){return x.c===s;})[0]; return t?t.i:50; }
  shifts.sort(function(a,b){ if(a==='7-7')return -1; if(b==='7-7')return 1; return startHour(a)-startHour(b); });
  for(var d=0; d<DIAS; d++){
    var used={};
    shifts.forEach(function(s){
      if(!cov[s].days[d]) return; var need=cov[s].count||0;
      var cand=emps.filter(function(e){ var k=String(e.id); return !used[k] && workCount[k]<capK[k]; });
      cand.sort(function(a,b){ var ka=String(a.id),kb=String(b.id);
        if(s==='7-7' && nightCount[ka]!==nightCount[kb]) return nightCount[ka]-nightCount[kb];
        if(workCount[ka]!==workCount[kb]) return workCount[ka]-workCount[kb];
        var aS=lastShift[ka]===s?0:1, bS=lastShift[kb]===s?0:1; if(aS!==bS) return aS-bS;
        return ka<kb?-1:1; });
      for(var i=0;i<need && i<cand.length;i++){ var e=cand[i],k=String(e.id); assign[k][d]=s; used[k]=true; workCount[k]++; if(s==='7-7')nightCount[k]++; lastShift[k]=s; }
    });
  }
  return assign;
}
function _genCargarCfg(cb){
  supabaseClient.from('turnos_config').select('cfg').eq('empresa','FARMACIA').maybeSingle().then(function(res){
    if(res&&res.data&&res.data.cfg){ _genCfg=res.data.cfg; }
    if(!_genCfg.cov) _genCfg.cov={};
    if(_genCfg.libres==null) _genCfg.libres=2;
    if(cb) cb();
  }).catch(function(){ if(cb) cb(); });
}
function _genGuardarCfg(){
  return supabaseClient.from('turnos_config').upsert([{ empresa:'FARMACIA', cfg:_genCfg, updated_at:new Date().toISOString() }],{onConflict:'empresa'});
}

// ── Asistencia y novedades (vacaciones / faltas / horas extra) — vista de Paul ──
var _turAsisMes=null, _turAsisRows=[], _turAsisReady=false, _turAsisLoading=false, _turAsisEmpSel='', _turAsisTipo='falta';
var TUR_ASIS_TIPOS=[
  {k:'falta',lbl:'❌ Falta',color:'#dc2626',bg:'#fee2e2'},
  {k:'falta_justificada',lbl:'📄 Falta justificada',color:'#b45309',bg:'#fef3c7'},
  {k:'vacaciones',lbl:'🏖️ Vacaciones',color:'#7c3aed',bg:'#ede9fe'},
  {k:'extra',lbl:'⏱️ Horas extra',color:'#059669',bg:'#d1fae5'}
];
function _turAsisTipoDef(k){ for(var i=0;i<TUR_ASIS_TIPOS.length;i++)if(TUR_ASIS_TIPOS[i].k===k)return TUR_ASIS_TIPOS[i]; return TUR_ASIS_TIPOS[0]; }
function _turVistaBtns(){
  var b=function(v,lbl){ var act=(_turVista===v);
    return '<button class="btn btn-sm '+(act?'btn-accent':'btn-ghost')+'" style="border-radius:0;border:none;padding:8px 18px;font-weight:700" onclick="_turSetVista(\''+v+'\')">'+lbl+'</button>'; };
  return b('turnos','Turnos')+b('asistencia','Asistencia');
}

function _turAsisHoy(){ try{ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _turAsisUltimo(mes){ var y=+mes.slice(0,4), m=+mes.slice(5,7); return new Date(y,m,0).getDate(); }
function _turAsisCargar(){
  if(!_turAsisMes) _turAsisMes=_turAsisHoy().slice(0,7);
  _turAsisLoading=true; renderTurnos();
  var fin=_turAsisMes+'-'+String(_turAsisUltimo(_turAsisMes)).padStart(2,'0');
  supabaseClient.from('empleado_asistencia').select('*').gte('fecha',_turAsisMes+'-01').lte('fecha',fin).order('fecha',{ascending:false}).then(function(res){
    _turAsisRows=(res&&res.data)||[]; _turAsisLoading=false; _turAsisReady=true; renderTurnos();
  }).catch(function(){ _turAsisLoading=false; _turAsisReady=true; renderTurnos(); });
}
function _turAsisSetMes(v){ if(v){ _turAsisMes=v; _turAsisReady=false; _turAsisCargar(); } }
function _turAsisSetTipo(t){ _turAsisTipo=t; renderTurnos(); }
function _turAsisGuardar(){
  var sel=document.getElementById('tas-emp'); var empId=sel&&sel.value;
  var emp=_turEmpleadosAll.filter(function(e){ return String(e.id)===String(empId); })[0];
  if(!emp){ showToast('Elige un empleado'); return; }
  var fEl=document.getElementById('tas-fecha'); var fecha=(fEl&&fEl.value)||_turAsisHoy();
  var hEl=document.getElementById('tas-horas'); var horas=(_turAsisTipo==='extra')?(Number(hEl&&hEl.value)||0):0;
  if(_turAsisTipo==='extra'&&horas<=0){ showToast('Escribe cuántas horas extra hizo'); return; }
  var nEl=document.getElementById('tas-nota'); var nota=(nEl&&nEl.value||'').trim();
  var fechas=[fecha];
  if(_turAsisTipo==='vacaciones'){
    var haEl=document.getElementById('tas-hasta'); var hasta=(haEl&&haEl.value)||fecha;
    if(hasta<fecha){ showToast('La fecha "hasta" no puede ser antes que "desde"'); return; }
    fechas=[]; var ff=fecha, guard=0;
    while(ff<=hasta&&guard<61){ fechas.push(ff); ff=_turUMas(ff,1); guard++; }
    if(ff<=hasta){ showToast('Máximo 60 días de vacaciones de una vez'); return; }
    if(fechas.length>1&&!confirm('Registrar VACACIONES de '+emp.nombre+' del '+fecha+' al '+hasta+' ('+fechas.length+' días)?')) return;
  }
  var rowsIns=fechas.map(function(f){ return { empleado_id:emp.id, empleado_nombre:emp.nombre, empresa:emp.empresa, fecha:f, tipo:_turAsisTipo, horas:horas, nota:nota||null, creado_por:(typeof currentUser!=='undefined'?currentUser:null) }; });
  supabaseClient.from('empleado_asistencia').insert(rowsIns).select('*').then(function(res){
    if(res&&res.error){ showToast('No se pudo guardar: '+(res.error.message||'')); return; }
    ((res&&res.data)||[]).slice().reverse().forEach(function(r){ _turAsisRows.unshift(r); });
    if(typeof logAudit==='function') logAudit('asistencia.'+_turAsisTipo, emp.nombre+' '+fechas[0]+(fechas.length>1?(' → '+fechas[fechas.length-1]):'')+(horas?(' '+horas+'h'):''));
    if(nEl)nEl.value=''; if(hEl)hEl.value='';
    _turReady=false; // que el calendario del horario se recargue con la novedad
    showToast('✓ Registrado: '+emp.nombre+(fechas.length>1?(' · '+fechas.length+' días'):'')); renderTurnos();
  }).catch(function(){ showToast('Error de red'); });
}
function _turAsisDel(id){
  var r=(_turAsisRows||[]).filter(function(x){ return String(x.id)===String(id); })[0];
  if(!confirm('¿Borrar esta novedad'+(r?(' de '+r.empleado_nombre):'')+'?')) return;
  supabaseClient.from('empleado_asistencia').delete().eq('id',id).then(function(res){
    if(res&&res.error){ showToast('Error: '+(res.error.message||'')); return; }
    _turAsisRows=_turAsisRows.filter(function(x){ return String(x.id)!==String(id); });
    _turReady=false; // que el calendario del horario se recargue sin la novedad
    if(typeof logAudit==='function') logAudit('asistencia.borrar',''+id);
    renderTurnos();
  });
}
function _turAsisHTML(){
  var head='<div class="tbox" style="padding:13px 15px;margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">'+
    '<div style="display:inline-flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;flex:none">'+_turVistaBtns()+'</div>'+
    '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.4px">Empresa</span>'+_turEmpresaSel()+'</div>'+
    '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.4px">Mes</span><input type="month" class="form-input" style="width:auto;padding:7px 11px" value="'+(_turAsisMes||'')+'" onchange="_turAsisSetMes(this.value)"></div>'+
    '<button class="btn btn-ghost btn-sm" style="padding:8px 14px;margin-left:auto" onclick="_turAsisReady=false;_turAsisCargar()">🔄 Actualizar</button></div>';
  if(_turAsisLoading&&!_turAsisReady) return head+'<div style="padding:24px;color:var(--muted)">Cargando…</div>';
  var emps=_turEmpleados.filter(function(e){ return e.empresa===_turEmpresa; });
  var opts='<option value="">— Elige —</option>'+emps.map(function(e){ return '<option value="'+e.id+'"'+(String(_turAsisEmpSel)===String(e.id)?' selected':'')+'>'+esc(e.nombre)+'</option>'; }).join('');
  var tipoBtns=TUR_ASIS_TIPOS.map(function(t){ var act=(_turAsisTipo===t.k); return '<button onclick="_turAsisSetTipo(\''+t.k+'\')" style="border:2px solid '+(act?t.color:'var(--border)')+';background:'+(act?t.bg:'var(--surface)')+';color:'+(act?t.color:'var(--muted)')+';border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:700;cursor:pointer">'+t.lbl+'</button>'; }).join(' ');
  var hastaFld=(_turAsisTipo==='vacaciones')?('<label style="font-size:10px;color:var(--muted)">Hasta (incluido)<input id="tas-hasta" type="date" value="'+_turAsisHoy()+'" style="display:block;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'):'';
  var horasFld=(_turAsisTipo==='extra')?('<label style="font-size:10px;color:var(--muted)">Horas<input id="tas-horas" type="number" min="0.5" step="0.5" placeholder="2" style="display:block;width:80px;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:15px;font-weight:700"></label>'):'';
  var form='<div class="tbox" style="padding:14px;margin-bottom:14px"><div style="font-weight:700;font-size:14px;margin-bottom:10px">➕ Registrar novedad</div>'+
    '<div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap">'+tipoBtns+'</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'+
    '<label style="font-size:10px;color:var(--muted);flex:1;min-width:170px">Empleado<select id="tas-emp" onchange="_turAsisEmpSel=this.value" style="display:block;width:100%;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">'+opts+'</select></label>'+
    '<label style="font-size:10px;color:var(--muted)">'+(_turAsisTipo==='vacaciones'?'Desde':'Fecha')+'<input id="tas-fecha" type="date" value="'+_turAsisHoy()+'" style="display:block;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+hastaFld+
    horasFld+
    '<label style="font-size:10px;color:var(--muted);flex:1;min-width:140px">Nota (opcional)<input id="tas-nota" type="text" placeholder="motivo / justificativo" style="display:block;width:100%;box-sizing:border-box;margin-top:3px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label>'+
    '<button class="btn btn-accent btn-sm" style="padding:10px 18px" onclick="_turAsisGuardar()">Guardar</button></div>'+
    '<div style="font-size:10px;color:var(--muted);margin-top:7px">Las <b>horas extra</b> y lo demás pasan solos a la relación de RRHH de la quincena.</div></div>';
  var rows=_turAsisRows.filter(function(r){ return r.empresa===_turEmpresa; });
  // resumen por empleado
  var sum={};
  rows.forEach(function(r){ var k=String(r.empleado_id); sum[k]=sum[k]||{nombre:r.empleado_nombre,f:0,fj:0,v:0,h:0}; if(r.tipo==='falta')sum[k].f++; else if(r.tipo==='falta_justificada')sum[k].fj++; else if(r.tipo==='vacaciones')sum[k].v++; else if(r.tipo==='extra')sum[k].h+=Number(r.horas)||0; });
  var sumKeys=Object.keys(sum);
  var resumen=sumKeys.length?('<div class="tbox" style="padding:12px;margin-bottom:14px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Resumen del mes</div>'+sumKeys.map(function(k){ var o=sum[k]; var chips='';
    if(o.f)chips+='<span style="background:#fee2e2;color:#dc2626;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:700;margin-right:5px">❌ '+o.f+'</span>';
    if(o.fj)chips+='<span style="background:#fef3c7;color:#b45309;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:700;margin-right:5px">📄 '+o.fj+'</span>';
    if(o.v)chips+='<span style="background:#ede9fe;color:#7c3aed;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:700;margin-right:5px">🏖️ '+o.v+'d</span>';
    if(o.h)chips+='<span style="background:#d1fae5;color:#059669;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:700;margin-right:5px">⏱️ '+o.h+'h</span>';
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 2px;border-bottom:1px solid var(--border)"><div style="flex:1;font-size:12.5px;font-weight:600">'+esc(o.nombre)+'</div><div>'+chips+'</div></div>'; }).join('')+'</div>'):'';
  var lista=rows.length?rows.map(function(r){ var t=_turAsisTipoDef(r.tipo);
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border)">'+
      '<span style="background:'+t.bg+';color:'+t.color+';border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap">'+t.lbl+(r.tipo==='extra'?(' '+(Number(r.horas)||0)+'h'):'')+'</span>'+
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(r.empleado_nombre)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(String(r.fecha).slice(0,10))+(r.nota?(' · '+esc(r.nota)):'')+'</div></div>'+
      '<button onclick="_turAsisDel(\''+r.id+'\')" title="Borrar" style="border:0;background:none;cursor:pointer;color:var(--red);font-size:16px">×</button></div>';
  }).join(''):'<div style="text-align:center;color:var(--muted);font-size:12px;padding:14px">Sin novedades este mes en '+esc(_turEmpresa)+'.</div>';
  return head+form+resumen+'<div class="tbox" style="padding:12px"><div style="font-weight:700;font-size:13px;margin-bottom:6px">Novedades del mes</div>'+lista+'</div>';
}
