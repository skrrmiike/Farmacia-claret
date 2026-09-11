// ══════════════════════════════════════════════════════════════
// 26 · RRHH / RELACIÓN (prefijo _rh) — módulo de Verónica
// Relación quincenal parecida a su Excel. Los SUELDOS se muestran
// solo tras la clave, que se verifica en el servidor (la cambia
// el administrador desde el Panel de Admin). Se alimenta de vales,
// medicamentos y horas de noche; calcula el total a pagar.
// ══════════════════════════════════════════════════════════════
var _rhEmpresa='FARMACIA', _rhMes=null, _rhQ='B', _rhEmpleados=[], _rhMovs=[], _rhTurnos=[], _rhAsis=[], _rhAjustes={}, _rhAmonest={}, _rhLoading=false, _rhReady=false, _rhUnlocked=false, _rhMasked=false;
var RH_TARIFA_NOCHE=3, RH_HORA_NOCHE=19;
var _rhSueldos={}, _rhClave='';   // la clave NO está en el código: la valida el servidor
function _rhPuede(){ try{ return currentRole==='admin'||currentRole==='veronica'||currentUser==='veronica'; }catch(e){ return false; } }
function _rhN(x){ var n=Number(x); return isNaN(n)?0:n; }
function _rhMoney(x){ return (typeof fmt==='function')?('$'+fmt(_rhN(x),2)):('$'+_rhN(x).toFixed(2)); }
var RH_MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _rhHoy(){ try{ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _rhMesHoy(){ return _rhHoy().slice(0,7); }
function _rhDiaHoy(){ return parseInt(_rhHoy().slice(8,10),10); }
function _rhUltimoDia(mes){ var y=+mes.slice(0,4), m=+mes.slice(5,7); return new Date(Date.UTC(y,m,0)).getUTCDate(); }
function _rhUD(f){ var p=String(f).slice(0,10).split('-'); return new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); }
function _rhUISO(d){ return d.toISOString().slice(0,10); }
function _rhUMas(f,n){ var d=_rhUD(f); d.setUTCDate(d.getUTCDate()+n); return _rhUISO(d); }
function _rhRango(mes,q){ if(q==='A') return {ini:mes+'-01',fin:mes+'-15'}; var u=_rhUltimoDia(mes); return {ini:mes+'-16',fin:mes+'-'+String(u).padStart(2,'0')}; }
function _rhRangoLbl(mes,q){ var r=_rhRango(mes,q); var mm=RH_MESES[(+mes.slice(5,7))-1]||''; return (+r.ini.slice(8,10))+'–'+(+r.fin.slice(8,10))+' '+mm+' '+mes.slice(0,4); }
function _rhDiasQ(){ return (_rhQ==='A')?15:(_rhUltimoDia(_rhMes)-15); } // 2ª quincena: 13, 14, 15 o 16 días según el mes
function _rhEnRango(fecha,mes,q){ if(!fecha)return false; var r=_rhRango(mes,q); var f=String(fecha).slice(0,10); return f>=r.ini&&f<=r.fin; }

// ── Horas de noche (>=7pm x $3) desde turnos ──────────────────
function _rhNocheDeTurno(code){ if(!code)return 0; try{ for(var i=0;i<TURNOS_CAT.length;i++){ var t=TURNOS_CAT[i]; if(t.c===code){ if(t.i==null||t.f==null)return 0; return Math.max(0,t.f-Math.max(t.i,RH_HORA_NOCHE)); } } }catch(e){} return 0; }
function _rhHorasNoche(empId,mes,q){ var r=_rhRango(mes,q), total=0, k=String(empId);
  (_rhTurnos||[]).forEach(function(row){ var inicio=String(row.quincena_inicio||'').slice(0,10); if(!inicio)return; var asig=(row.data&&row.data.asig)||{}; var dias=asig[k]; if(!dias)return;
    for(var d=0;d<7;d++){ var fs=_rhUMas(inicio,d); if(fs>=r.ini&&fs<=r.fin) total+=_rhNocheDeTurno(dias[d]); } });
  return total;
}

function _rhEntrar(){ if(!_rhMes){ _rhMes=_rhMesHoy(); _rhQ=(_rhDiaHoy()>=16)?'B':'A'; } if(!_rhReady){ _rhCargar(); } else { _rhRender(); } }
function _rhCargar(){
  _rhLoading=true; _rhRender();
  var mesFin=_rhMes+'-'+String(_rhUltimoDia(_rhMes)).padStart(2,'0');
  var extIni=_rhUMas(_rhMes+'-01',-6);
  Promise.all([
    supabaseClient.from('empleados').select('id,nombre,empresa,empresa_nomina,activo').order('empresa').order('nombre'),
    supabaseClient.from('empleado_movimientos').select('*').gte('fecha',_rhMes+'-01').lte('fecha',mesFin).eq('anulado',false),
    supabaseClient.from('turnos').select('quincena_inicio,data,empresa').gte('quincena_inicio',extIni).lte('quincena_inicio',mesFin),
    supabaseClient.from('nomina_ajustes').select('*').eq('mes',_rhMes).eq('quincena',_rhQ),
    supabaseClient.from('empleado_asistencia').select('*').gte('fecha',_rhMes+'-01').lte('fecha',mesFin),
    supabaseClient.from('nomina_amonestaciones').select('*').eq('mes',_rhMes).eq('quincena',_rhQ)
  ]).then(function(res){
    _rhEmpleados=((res[0]&&res[0].data)||[]).filter(function(e){ return e.activo!==false; });
    _rhMovs=(res[1]&&res[1].data)||[];
    _rhTurnos=(res[2]&&res[2].data)||[];
    _rhAjustes={}; ((res[3]&&res[3].data)||[]).forEach(function(a){ _rhAjustes[String(a.empleado_id)]=a; });
    _rhAsis=(res[4]&&res[4].data)||[];
    _rhAmonest={}; ((res[5]&&res[5].data)||[]).forEach(function(a){ var k=String(a.empleado_id); _rhAmonest[k]=(_rhAmonest[k]||0)+_rhN(a.monto); });
    _rhLoading=false; _rhReady=true; _rhRender();
  }).catch(function(e){ console.warn('rrhh cargar',e); _rhLoading=false; _rhReady=true; _rhRender(); });
}
function _rhRefrescar(){ _rhReady=false; _rhCargar(); }
function _rhSetMes(v){ if(v){ _rhMes=v; _rhRefrescar(); } }
function _rhSetQ(q){ _rhQ=q; _rhRefrescar(); }
function _rhSetEmpresa(e){ _rhEmpresa=e; _rhRender(); }
function _rhUnlock(){
  var el=document.getElementById('rh-pin'); var v=(el&&el.value)||'';
  var er=document.getElementById('rh-pin-err'); if(er)er.textContent='Verificando…';
  supabaseClient.rpc('fn_rrhh_sueldos',{p_clave:v}).then(function(res){
    var d=res&&res.data; if(d&&typeof d==='string'){ try{ d=JSON.parse(d); }catch(e){} }
    if(res&&res.error){ if(er)er.textContent='No se pudo verificar. Revisa tu conexión.'; return; }
    if(!d||!d.ok){
      if(er)er.textContent=(d&&d.reason==='rol')?'Tu usuario no tiene permiso de RRHH.':'Clave incorrecta';
      return;
    }
    _rhSueldos=d.sueldos||{}; _rhClave=v; _rhUnlocked=true;
    if(typeof logAudit==='function')logAudit('rrhh.abrir','Relación abierta');
    _rhRender();
  }).catch(function(){ if(er)er.textContent='No se pudo verificar. Revisa tu conexión.'; });
}

function _rhLock(){ _rhUnlocked=false; _rhMasked=false; _rhSueldos={}; _rhClave=''; _rhRender(); }
function _rhMask(){ _rhMasked=!_rhMasked; _rhRender(); }
function _rhOculto(){ return '<span style="letter-spacing:2px;color:var(--muted)">••••</span>'; }

function _rhQIdx(f){ var p=String(f).slice(0,10).split('-'); return (+p[0])*24 + ((+p[1])-1)*2 + ((+p[2])>=16?1:0); }
function _rhQIdxActual(){ return _rhQIdx(_rhRango(_rhMes,_rhQ).ini); }
function _rhMov(empId,tipo){ var s=0, qi=_rhQIdxActual();
  (_rhMovs||[]).forEach(function(m){
    if(m.tipo!==tipo) return;
    if(String(m.empleado_id)!==String(empId)) return;
    if(m.anulado) return;
    if(tipo==='vale' && m.estado && m.estado!=='entregado') return; // un vale en espera aún no se pagó: no se descuenta
    var n=Math.max(1, Number(m.cuotas)||1);
    var qm=_rhQIdx(m.fecha);
    if(qi<qm || qi>=qm+n) return;            // esta quincena no le toca cuota
    s+=_rhN(m.monto)/n;                       // se descuenta solo la cuota correspondiente
  }); return s; }
function _rhValesEspera(empId){ var s=0; (_rhMovs||[]).forEach(function(m){ if(m.tipo==='vale'&&String(m.empleado_id)===String(empId)&&!m.anulado&&m.estado==='espera'&&_rhEnRango(m.fecha,_rhMes,_rhQ)) s+=_rhN(m.monto); }); return s; }
function _rhCuotasPend(empId){ var t=0, qi=_rhQIdxActual();
  (_rhMovs||[]).forEach(function(m){ if(m.tipo!=='vale'||String(m.empleado_id)!==String(empId)||m.anulado)return;
    var n=Math.max(1,Number(m.cuotas)||1); if(n<2)return; var qm=_rhQIdx(m.fecha);
    if(qi>=qm && qi<qm+n-1) t+=_rhN(m.monto)/n; });   // lo que aún quedará para quincenas siguientes
  return t; }
function _rhAj(empId,campo){ var a=_rhAjustes[String(empId)]; return a?_rhN(a[campo]):0; }
function _rhFila(e){
  var noche=_rhHorasNoche(e.id,_rhMes,_rhQ); var pagoNoche=noche*RH_TARIFA_NOCHE;
  var vales=_rhMov(e.id,'vale'); var med=_rhMov(e.id,'medicamento');
  var extraH=0,vac=0, fSet={}, fjSet={};
  (_rhAsis||[]).forEach(function(a){ if(String(a.empleado_id)!==String(e.id))return; if(!_rhEnRango(a.fecha,_rhMes,_rhQ))return;
    var dia=String(a.fecha).slice(0,10);
    if(a.tipo==='extra')extraH+=_rhN(a.horas);
    else if(a.tipo==='falta')fSet[dia]=1;                 // un mismo día no descuenta dos veces
    else if(a.tipo==='falta_justificada')fjSet[dia]=1;
    else if(a.tipo==='vacaciones')vac++; });
  var faltas=Object.keys(fSet).length, faltasJ=Object.keys(fjSet).length;
  var r2=function(x){ return Math.round((Number(x)||0)*100)/100; };
  var pagoExtra=r2(extraH*RH_TARIFA_NOCHE);
  var prest=r2(_rhAj(e.id,'prestamos'));
  var amonest=r2(_rhAmonest[String(e.id)]||0);
  var sueldo=_rhN(_rhSueldos[String(e.id)]);
  var diasQ=_rhDiasQ()||15;
  var aus=Math.round((sueldo/diasQ)*faltas*100)/100; // automática: sueldo quincenal ÷ días reales de la quincena × faltas (de Asistencia)
  sueldo=r2(sueldo); med=r2(med); vales=r2(vales); pagoNoche=r2(pagoNoche);
  var total=r2(sueldo+pagoNoche+pagoExtra-med-vales-prest-aus-amonest);
  return {sueldo:sueldo,noche:noche,pagoNoche:pagoNoche,extraH:extraH,pagoExtra:pagoExtra,faltas:faltas,faltasJ:faltasJ,vac:vac,med:med,vales:vales,prest:prest,amonest:amonest,aus:aus,total:total,espera:_rhValesEspera(e.id),pend:r2(_rhCuotasPend(e.id))};
}

// ── Guardar ediciones ─────────────────────────────────────────
function _rhRepintarSuave(){ // no repinta si hay una casilla con el foco (se perdería lo tecleado)
  try{ var a=document.activeElement; var t=document.getElementById('rh-tabla');
    if(a&&t&&t.contains(a)&&(a.tagName==='INPUT')) return; }catch(e){}
  _rhRenderTabla();
}
function _rhSaveSueldo(empId,val){ var v=_rhN(val); var prev=_rhSueldos[String(empId)];
  _rhSueldos[String(empId)]=v;
  supabaseClient.rpc('fn_rrhh_set_sueldo',{p_emp:Number(empId), p_monto:v, p_clave:_rhClave}).then(function(res){
    var d=res&&res.data; if(d&&typeof d==='string'){ try{ d=JSON.parse(d); }catch(e){} }
    if((res&&res.error)||!d||!d.ok){
      _rhSueldos[String(empId)]=prev;
      showToast&&showToast('No se guardó el sueldo'+((d&&d.reason==='clave')?': vuelve a entrar con la clave':''));
      _rhRenderTabla(); return;
    }
    if(typeof logAudit==='function')logAudit('rrhh.sueldo','sueldo actualizado (empleado '+empId+')'); _rhRepintarSuave(); });
}
function _rhSaveAjuste(empId,campo,val){ var v=_rhN(val); var a=_rhAjustes[String(empId)]||{empleado_id:empId,mes:_rhMes,quincena:_rhQ,empresa:_rhEmpresa,otros:0,seguro:0,prestamos:0,ausencias:0}; a[campo]=v; a.empresa=_rhEmpresa; _rhAjustes[String(empId)]=a;
  supabaseClient.from('nomina_ajustes').upsert([{empleado_id:empId,mes:_rhMes,quincena:_rhQ,empresa:_rhEmpresa,otros:_rhN(a.otros),seguro:_rhN(a.seguro),prestamos:_rhN(a.prestamos),ausencias:_rhN(a.ausencias),updated_at:new Date().toISOString()}],{onConflict:'empleado_id,mes,quincena'}).then(function(r){ if(r&&r.error){ showToast&&showToast('No se guardó: '+(r.error.message||'')); _rhRefrescar(); return; } _rhRepintarSuave(); });
}
function _rhExport(){
  if(_rhMasked){ showToast&&showToast('Quita el modo oculto (👁 Mostrar sueldos) para exportar'); return; }
  var arr=(_rhEmpleados||[]).filter(function(e){ return (e.empresa_nomina||e.empresa)===_rhEmpresa; });
  var head=['Empleado','Sueldo quincenal','Nocturno ($)','Otros ($)','Medicamentos (-)','Anticipos/Vales (-)','Prestamos (-)','Amonestaciones (-)','Ausencias (-)','Total a pagar'];
  var q=function(x){ return '"'+String(x==null?'':x).replace(/"/g,'""')+'"'; };
  var lines=[head.map(q).join(';')];
  arr.forEach(function(e){ var f=_rhFila(e); lines.push([q(e.nombre),f.sueldo.toFixed(2),f.pagoNoche.toFixed(2),f.pagoExtra.toFixed(2),f.med.toFixed(2),f.vales.toFixed(2),f.prest.toFixed(2),f.amonest.toFixed(2),f.aus.toFixed(2),f.total.toFixed(2)].join(';')); });
  var csv='﻿'+lines.join('\r\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='relacion_'+_rhEmpresa+'_'+_rhMes+'_Q'+_rhQ+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },300);
  if(typeof logAudit==='function')logAudit('rrhh.export',_rhEmpresa+' '+_rhMes+' Q'+_rhQ);
}

// ── Render ─────────────────────────────────────────────────────
function renderRRHH(){ _rhEntrar(); }
function _rhRender(){
  var c=document.getElementById('rrhh-content'); if(!c) return;
  if(!_rhPuede()){ c.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted)">Este módulo es solo para Recursos Humanos.</div>'; return; }
  if(!_rhUnlocked){ c.innerHTML=_rhLockHTML(); var pin=document.getElementById('rh-pin'); if(pin){ pin.onkeydown=function(ev){ if(ev.key==='Enter')_rhUnlock(); }; } return; }
  var header='<div style="max-width:1100px;margin:0 auto 8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><div style="font-weight:800;font-size:19px">💼 Relación de nómina · RRHH</div><div style="font-size:12px;color:var(--muted)">Verónica · sueldos, deducciones y total a pagar por quincena</div></div><button class="btn btn-ghost btn-sm" onclick="_rhMask()">'+(_rhMasked?'👁 Mostrar sueldos':'🙈 Ocultar sueldos')+'</button><button class="btn btn-ghost btn-sm" style="margin-left:6px" onclick="_rhLock()" title="Pedir la clave de nuevo">🔒 Bloquear</button></div>';
  var mesInput='<input type="month" value="'+esc(_rhMes||'')+'" onchange="_rhSetMes(this.value)" style="padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px">';
  var qBtns='<button class="fchip'+(_rhQ==='A'?' active':'')+'" onclick="_rhSetQ(\'A\')" style="font-size:12px">1ª (1–15)</button><button class="fchip'+(_rhQ==='B'?' active':'')+'" onclick="_rhSetQ(\'B\')" style="font-size:12px">2ª (16–fin)</button>';
  var empBtns='<button class="fchip'+(_rhEmpresa==='FARMACIA'?' active':'')+'" onclick="_rhSetEmpresa(\'FARMACIA\')" style="font-size:12px">Farmacia Claret</button><button class="fchip'+(_rhEmpresa==='DROGUERIA'?' active':'')+'" onclick="_rhSetEmpresa(\'DROGUERIA\')" style="font-size:12px">Droguería</button>';
  var ctrl='<div style="max-width:1100px;margin:0 auto 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+mesInput+qBtns+'<span style="width:8px"></span>'+empBtns+'<span style="font-size:12px;color:var(--accent);font-weight:700">'+esc(_rhRangoLbl(_rhMes,_rhQ))+'</span><span style="flex:1"></span><button class="btn btn-ghost btn-sm" onclick="_rhRefrescar()">🔄</button><button class="btn btn-accent btn-sm" onclick="_rhExport()">⬇️ Exportar</button><button class="btn btn-green btn-sm" onclick="_rhImprimir()">🖨️ Recibos de pago</button></div>';
  var body=(_rhLoading&&!_rhReady)?'<div style="padding:30px;text-align:center;color:var(--muted)">Cargando…</div>':('<div id="rh-tabla">'+_rhTablaHTML()+'</div>');
  c.innerHTML=header+ctrl+'<div style="max-width:1100px;margin:0 auto">'+body+'</div>';
}
function _rhRenderTabla(){ var t=document.getElementById('rh-tabla'); if(t)t.innerHTML=_rhTablaHTML(); }
function _rhLockHTML(){
  return '<div style="max-width:420px;margin:40px auto 0;text-align:center"><div class="tbox" style="padding:28px 22px"><div style="font-size:44px">🔒</div><div style="font-weight:800;font-size:18px;margin-top:8px">Relación de nómina</div><div style="font-size:12px;color:var(--muted);margin:6px 0 16px">Esta sección muestra sueldos. Escribe tu clave para entrar.<br><span style="font-size:11px">La clave se verifica en el servidor y los sueldos solo se descargan si es correcta.</span></div>'+
    '<input id="rh-pin" type="password" placeholder="Clave" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:16px;text-align:center;letter-spacing:2px">'+
    '<div id="rh-pin-err" style="color:var(--red);font-size:12px;min-height:16px;margin-top:6px"></div>'+
    '<button class="btn btn-accent" style="width:100%;padding:11px" onclick="_rhUnlock()">Entrar</button></div></div>';
}
function _rhInp(id,val,onch,color){ return '<input type="number" step="0.01" inputmode="decimal" value="'+(val?_rhN(val):'')+'" onchange="'+onch+'" style="width:74px;padding:5px;text-align:right;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:'+(color||'var(--text)')+';font-size:12px">'; }
function _rhTablaHTML(){
  var arr=(_rhEmpleados||[]).filter(function(e){ return (e.empresa_nomina||e.empresa)===_rhEmpresa; });
  if(!arr.length) return '<div style="text-align:center;color:var(--muted);padding:20px">Sin empleados en '+esc(_rhEmpresa)+'.</div>';
  var T={sueldo:0,pagoNoche:0,pagoExtra:0,med:0,vales:0,prest:0,amonest:0,aus:0,total:0};
  var rows=arr.map(function(e){ var f=_rhFila(e); for(var k in T)T[k]+=f[k];
    return '<tr style="border-top:1px solid var(--border)">'+
      '<td style="padding:5px 8px;font-size:12px;font-weight:600;white-space:nowrap;position:sticky;left:0;background:var(--surface)">'+esc(e.nombre)+'</td>'+
      '<td style="padding:5px 6px;text-align:right">'+(_rhMasked?_rhOculto():_rhInp('s'+e.id,f.sueldo,'_rhSaveSueldo('+e.id+',this.value)','var(--text)'))+'</td>'+
      '<td style="padding:5px 6px;text-align:right;font-size:12px;color:'+(f.pagoNoche>0?'var(--green)':'var(--muted)')+'" title="'+f.noche+' h de noche">'+(f.pagoNoche>0?('+'+_rhMoney(f.pagoNoche)):'—')+'</td>'+
      '<td style="padding:5px 6px;text-align:right;font-size:12px;color:'+(f.pagoExtra>0?'var(--green)':'var(--muted)')+'" title="'+f.extraH+' h extra registradas en Asistencia">'+(f.pagoExtra>0?('+'+_rhMoney(f.pagoExtra)):'—')+'</td>'+
      '<td style="padding:5px 6px;text-align:right;font-size:12px;color:'+(f.med>0?'var(--red)':'var(--muted)')+'">'+(f.med>0?('−'+_rhMoney(f.med)):'—')+'</td>'+
      '<td style="padding:5px 6px;text-align:right;font-size:12px;color:'+(f.vales>0?'var(--red)':'var(--muted)')+'" title="'+(f.espera>0?('Además tiene '+_rhMoney(f.espera)+' en vales SIN entregar, que aún no se descuentan'):'Solo se descuentan los vales ya entregados')+'">'+(f.vales>0?('−'+_rhMoney(f.vales)):'—')+(f.espera>0?('<div style="font-size:9px;color:var(--amber);font-weight:700">⏳ '+_rhMoney(f.espera)+' en espera</div>'):'')+(f.pend>0?('<div style="font-size:9px;color:var(--muted)">↪ '+_rhMoney(f.pend)+' en próximas quincenas</div>'):'')+'</td>'+
      '<td style="padding:5px 6px;text-align:right">'+_rhInp('p'+e.id,f.prest,'_rhSaveAjuste('+e.id+",'prestamos',this.value)",'var(--red)')+'</td>'+
      '<td style="padding:5px 6px;text-align:right;font-size:12px;color:'+(f.amonest>0?'var(--red)':'var(--muted)')+'" title="Amonestaciones que vienen del Banco de Anomalías (errores)">'+(f.amonest>0?('−'+_rhMoney(f.amonest)):'—')+'</td>'+
      '<td style="padding:5px 6px;text-align:right;font-size:12px;color:'+(f.aus>0?'var(--red)':'var(--muted)')+'" title="Automática: sueldo ÷ '+_rhDiasQ()+' (días de esta quincena) × '+f.faltas+' día(s) de ausencia'+(f.faltasJ?(' · '+f.faltasJ+' justificada(s) no descuentan'):'')+(f.vac?(' · '+f.vac+' día(s) vacaciones'):'')+'">'+((f.faltas||f.faltasJ||f.vac)?('<div style="font-size:9px;color:var(--muted);margin-bottom:2px">'+(f.faltas?('❌'+f.faltas+' '):'')+(f.faltasJ?('📄'+f.faltasJ+' '):'')+(f.vac?('🏖️'+f.vac):'')+'</div>'):'')+(f.aus>0?(_rhMasked?_rhOculto():('−'+_rhMoney(f.aus))):'—')+'</td>'+
      '<td style="padding:5px 8px;text-align:right;font-size:13px;font-weight:800;color:'+(f.total<=0?'var(--red)':'var(--text)')+';white-space:nowrap">'+(_rhMasked?_rhOculto():_rhMoney(f.total))+'</td>'+
    '</tr>'; }).join('');
  var totRow='<tr style="border-top:2px solid var(--border);background:var(--surface2);font-weight:800">'+
    '<td style="padding:7px 8px;font-size:12px;position:sticky;left:0;background:var(--surface2)">TOTALES</td>'+
    '<td style="padding:7px 6px;text-align:right;font-size:12px">'+(_rhMasked?_rhOculto():_rhMoney(T.sueldo))+'</td>'+
    '<td style="padding:7px 6px;text-align:right;font-size:12px;color:var(--green)">+'+_rhMoney(T.pagoNoche)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;font-size:12px;color:var(--green)">+'+_rhMoney(T.pagoExtra)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;font-size:12px;color:var(--red)">−'+_rhMoney(T.med)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;font-size:12px;color:var(--red)">−'+_rhMoney(T.vales)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;font-size:12px;color:var(--red)">−'+_rhMoney(T.prest)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;font-size:12px;color:var(--red)">−'+_rhMoney(T.amonest)+'</td>'+
    '<td style="padding:7px 6px;text-align:right;font-size:12px;color:var(--red)">'+(_rhMasked?_rhOculto():('−'+_rhMoney(T.aus)))+'</td>'+
    '<td style="padding:7px 8px;text-align:right;font-size:13px">'+(_rhMasked?_rhOculto():_rhMoney(T.total))+'</td>'+
  '</tr>';
  return '<div class="tbox" style="padding:10px"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:900px"><thead><tr style="font-size:9.5px;color:var(--muted);text-transform:uppercase">'+
    '<th style="text-align:left;padding:4px 8px;position:sticky;left:0;background:var(--surface)">Empleado</th><th style="text-align:right;padding:4px 6px">Sueldo quinc.</th><th style="text-align:right;padding:4px 6px">+ Nocturno</th><th style="text-align:right;padding:4px 6px">+ Otros</th><th style="text-align:right;padding:4px 6px">− Mdtos</th><th style="text-align:right;padding:4px 6px">− Vales</th><th style="text-align:right;padding:4px 6px">− Préstamos</th><th style="text-align:right;padding:4px 6px">− Amonest.</th><th style="text-align:right;padding:4px 6px">− Ausencias</th><th style="text-align:right;padding:4px 8px">= Total a pagar</th></tr></thead><tbody>'+rows+totRow+'</tbody></table></div>'+
    '<div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.5">Sueldo y Préstamos son editables (se guardan al salir de la casilla). Nocturno, Otros (horas extra a $'+RH_TARIFA_NOCHE+'/h), Medicamentos, Vales y Ausencias se llenan solos desde los otros módulos. <b>Ausencias = sueldo ÷ '+_rhDiasQ()+' (días de esta quincena) × días de falta</b> que registre Paul en Asistencia (las justificadas no descuentan). Las <b>Amonestaciones</b> vienen del Banco de Anomalías (gerencia las carga cuando hay un error, ej. vender una cosa por otra). <b>Total = Sueldo + Nocturno + Otros − Mdtos − Vales − Préstamos − Amonestaciones − Ausencias.</b></div></div>';
}

// ── Recibos de pago imprimibles (payslip, formato del Excel de Verónica) ──
function _rhEmpresaHdr(){ return _rhEmpresa==='DROGUERIA' ? {n:'DROGUERIA CLINICA, C.A.', rif:'RIF: J-31270788-7'} : {n:'FARMACIA CLARET DE INVERSIONES HOSPITALARIAS, C.A.', rif:'RIF: J-30883236-7'}; }
function _rhPeriodoLbl(){ var r=_rhRango(_rhMes,_rhQ); var mm=_rhMes.slice(5,7), yy=_rhMes.slice(0,4); return 'DEL '+r.ini.slice(8,10)+' AL '+r.fin.slice(8,10)+'/'+mm+'/'+yy; }
function _rhImprimir(){
  if(_rhMasked){ showToast&&showToast('Quita el modo oculto (👁 Mostrar sueldos) para imprimir recibos'); return; }
  var hdr=_rhEmpresaHdr();
  var arr=(_rhEmpleados||[]).filter(function(e){ return (e.empresa_nomina||e.empresa)===_rhEmpresa; });
  if(!arr.length){ showToast&&showToast('No hay empleados en '+_rhEmpresa); return; }
  var fm=function(x){ return (typeof fmt==='function')?fmt(_rhN(x),2):(_rhN(x)).toFixed(2); };
  var recibos=arr.map(function(e){ var f=_rhFila(e);
    var fila=function(lbl,val,neg){ return '<tr><td class="c1">'+lbl+'</td><td class="c2">'+(neg?'-':'')+fm(val)+'</td></tr>'; };
    return '<div class="recibo">'+
      '<div class="emp">'+hdr.n+'</div><div class="rif">'+hdr.rif+'</div>'+
      '<div class="tit">RECIBO DE PAGO</div><div class="per">'+_rhPeriodoLbl()+'</div>'+
      '<div class="nom">EMPLEADO: <b>'+esc(e.nombre)+'</b></div>'+
      '<table>'+
      '<tr class="sec"><td colspan="2">ASIGNACIONES</td></tr>'+
      fila('Compl. Alimentación (quincena)',f.sueldo)+
      fila('Nocturno'+(f.noche>0?(' ('+f.noche+'h × $'+RH_TARIFA_NOCHE+')'):''),f.pagoNoche)+
      fila('Otros'+(f.extraH>0?(' ('+f.extraH+'h extra × $'+RH_TARIFA_NOCHE+')'):''),f.pagoExtra)+
      '<tr class="tot"><td class="c1">Total Asignaciones</td><td class="c2">'+fm(f.sueldo+f.pagoNoche+f.pagoExtra)+'</td></tr>'+
      '<tr class="sec"><td colspan="2">DEDUCCIONES</td></tr>'+
      fila('Medicamentos',f.med,f.med>0)+
      fila('Anticipos / Vales',f.vales,f.vales>0)+
      fila('Préstamos Personales',f.prest,f.prest>0)+
      (f.amonest>0?fila('Amonestaciones',f.amonest,true):'')+
      fila('Ausencias'+((f.faltas||f.faltasJ)?(' ('+f.faltas+' día'+(f.faltas===1?'':'s')+(f.faltasJ?(', '+f.faltasJ+' justif. sin descuento'):'')+')'):''),f.aus,f.aus>0)+
      '<tr class="tot"><td class="c1">Total Deducciones</td><td class="c2">-'+fm(f.med+f.vales+f.prest+f.amonest+f.aus)+'</td></tr>'+
      '<tr class="pagar"><td class="c1">TOTAL A PAGAR</td><td class="c2">$'+fm(f.total)+'</td></tr>'+
      '</table>'+
      '<div class="firma">Recibido por: ______________________________ &nbsp;&nbsp; C.I.: ______________ &nbsp;&nbsp; Fecha: ____ /____ /______</div>'+
    '</div>';
  }).join('');
  var css='@page{size:letter;margin:12mm} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0}'+
    '.recibo{border:1.5px solid #333;border-radius:6px;padding:12px 16px;margin:0 0 14px;page-break-inside:avoid}'+
    '.emp{font-weight:bold;font-size:12.5px;text-align:center}.rif{font-size:10.5px;text-align:center;margin-bottom:6px}'+
    '.tit{font-weight:bold;font-size:13px;text-align:center;letter-spacing:1px}.per{font-size:11px;text-align:center;margin-bottom:8px}'+
    '.nom{font-size:12px;margin-bottom:6px}'+
    'table{width:100%;border-collapse:collapse;font-size:11.5px}'+
    'td{padding:2.5px 4px}.c1{text-align:left}.c2{text-align:right;width:110px;font-variant-numeric:tabular-nums}'+
    '.sec td{font-weight:bold;background:#eee;border-top:1px solid #999;font-size:10.5px;letter-spacing:.5px}'+
    '.tot td{font-weight:bold;border-top:1px solid #999}'+
    '.pagar td{font-weight:bold;font-size:13px;border-top:2px solid #333;padding-top:5px}'+
    '.firma{margin-top:16px;font-size:11px}';
  var w=window.open('','_blank');
  if(!w){ showToast&&showToast('El navegador bloqueó la ventana. Permite pop-ups para imprimir.'); return; }
  w.document.write('<!DOCTYPE html><html><head><title>Recibos de pago · '+esc(_rhEmpresa)+' · '+esc(_rhRangoLbl(_rhMes,_rhQ))+'</title><style>'+css+'</style></head><body>'+recibos+'</body></html>');
  w.document.close();
  setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} },400);
  if(typeof logAudit==='function') logAudit('rrhh.recibos',_rhEmpresa+' '+_rhMes+' Q'+_rhQ+' ('+arr.length+' recibos)');
}
