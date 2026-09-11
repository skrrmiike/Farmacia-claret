/* ============================================================
   30-desempeno.js — Evaluación de Desempeño (prefijo _dp)
   Sistema MIXTO: componente automático (reto/ventas, asistencia,
   descuadres de caja, amonestaciones) + evaluación manual de gerencia.
   ============================================================ */

var _dpMes=null, _dpEmpresa='FARMACIA';
var _dpEmpleados=[], _dpAsis=[], _dpAmon=[], _dpCierres=[], _dpEvals={}, _dpReto=null;
var _dpRetoPts={}, _dpRetoMax=0;
var _dpReady=false, _dpLoading=false;
var _dpEvalTmp=null;

var DP_PESOS = { ventas:25, asistencia:20, caja:15, conducta:15, gerencia:25 };
var DP_DIMS = [
  {k:'atencion',       lbl:'Atención al cliente'},
  {k:'actitud',        lbl:'Actitud / Disposición'},
  {k:'orden',          lbl:'Orden y limpieza'},
  {k:'equipo',         lbl:'Trabajo en equipo'},
  {k:'responsabilidad',lbl:'Responsabilidad'}
];

/* Cada puesto se evalúa con SUS criterios (se guardan en las mismas 5
   columnas de siempre; solo cambia qué significa cada estrella). */
var DP_PERFILES=[
  {test:/caj/i,           nombre:'Cajero',            dims:{atencion:'Atenci\u00f3n al cliente',actitud:'Rapidez y exactitud en caja',orden:'Orden del puesto',equipo:'Trabajo en equipo',responsabilidad:'Responsabilidad y puntualidad'}},
  {test:/deliv|moto|repart/i, nombre:'Delivery',      dims:{atencion:'Trato con el cliente',actitud:'Puntualidad de entregas',orden:'Cuidado de pedidos y moto',equipo:'Comunicaci\u00f3n con la farmacia',responsabilidad:'Responsabilidad'}},
  {test:/almac|deposi/i,  nombre:'Almac\u00e9n',     dims:{atencion:'Exactitud del inventario',actitud:'Rapidez y disposici\u00f3n',orden:'Orden y limpieza',equipo:'Trabajo en equipo',responsabilidad:'Responsabilidad'}},
  {test:/superv|gerent|encarg|admin/i, nombre:'Supervisi\u00f3n', dims:{atencion:'Liderazgo del equipo',actitud:'Resoluci\u00f3n de problemas',orden:'Organizaci\u00f3n',equipo:'Comunicaci\u00f3n',responsabilidad:'Responsabilidad'}},
  {test:/vend|mostr|farmac|auxil/i, nombre:'Ventas / mostrador', dims:{atencion:'Atenci\u00f3n al cliente',actitud:'Conocimiento de productos',orden:'Orden y limpieza',equipo:'Trabajo en equipo',responsabilidad:'Responsabilidad'}}
];
function _dpPerfilDe(cargo){ var c=String(cargo||''); for(var i=0;i<DP_PERFILES.length;i++){ if(DP_PERFILES[i].test.test(c))return DP_PERFILES[i]; } return null; }
function _dpDimsDe(cargo){ var p=_dpPerfilDe(cargo); if(!p)return DP_DIMS; return DP_DIMS.map(function(x){ return {k:x.k,lbl:p.dims[x.k]||x.lbl}; }); }
function _dpAntig(fi){ if(!fi)return null; var a=new Date(String(fi).slice(0,10)+'T12:00'), h=new Date(_dpHoy()+'T12:00'); var m=(h.getFullYear()-a.getFullYear())*12+(h.getMonth()-a.getMonth()); if(h.getDate()<a.getDate())m--; if(m<0)return null; var y=Math.floor(m/12); m=m%12; return (y?(y+' a\u00f1o'+(y>1?'s':'')):'')+((y&&m)?' y ':'')+(m?(m+' mes'+(m>1?'es':'')):(y?'':'reci\u00e9n ingresado')); }

function _dpHoy(){ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }
function _dpMesHoy(){ return _dpHoy().slice(0,7); }
function _dpNum(v){ if(v==null)return 0; var n=parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; }
function _dpNorm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
function _dpUltimoDia(mes){ var y=+mes.slice(0,4), m=+mes.slice(5,7); return new Date(Date.UTC(y,m,0)).getUTCDate(); }
function _dpRangoMes(mes){ return {ini:mes+'-01', fin:mes+'-'+String(_dpUltimoDia(mes)).padStart(2,'0')}; }

function _dpEsAdmin(){ try{ return (typeof currentRole!=='undefined') && currentRole==='admin'; }catch(e){ return false; } }
function _dpPuedeEval(){ if(_dpEsAdmin())return true; try{ return ['gerente','veronica'].indexOf(currentRole)>=0; }catch(e){ return false; } }
function _dpPuedeVer(){ if(_dpEsAdmin())return true; try{ if(typeof _tabAllowed==='function')return _tabAllowed('desempeno'); }catch(e){} return true; }

/* ---------- Carga ---------- */
function _dpEntrar(){ if(!_dpMes)_dpMes=_dpMesHoy(); if(!_dpReady){ _dpCargar(); } else { _dpRender(); } }

function _dpCargar(){
  if(_dpLoading)return; _dpLoading=true;
  var cont=document.getElementById('desempeno-content'); if(cont)cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">Cargando desempeño…</div>';
  var r=_dpRangoMes(_dpMes);
  Promise.all([
    supabaseClient.from('empleados').select('id,nombre,cargo,empresa,empresa_nomina,activo,cedula,fecha_ingreso,telefono,foto_url'),
    supabaseClient.from('empleado_asistencia').select('empleado_id,tipo,fecha').gte('fecha',r.ini).lte('fecha',r.fin),
    supabaseClient.from('nomina_amonestaciones').select('empleado_id,monto,mes,motivo').eq('mes',_dpMes),
    supabaseClient.from('cierres_caja').select('cajero,data,fecha,estado').gte('fecha',r.ini).lte('fecha',r.fin).eq('empresa','farmacia'),
    supabaseClient.from('desempeno_evaluaciones').select('*').eq('mes',_dpMes),
    supabaseClient.from('app_sections').select('data').eq('section_name','reto').maybeSingle()
  ]).then(function(res){
    _dpEmpleados=(res[0].data||[]);
    _dpAsis=(res[1].data||[]);
    _dpAmon=(res[2].data||[]);
    _dpCierres=(res[3].data||[]);
    _dpEvals={}; (res[4].data||[]).forEach(function(e){ _dpEvals[String(e.empleado_id)]=e; });
    _dpReto=(res[5]&&res[5].data&&res[5].data.data)?res[5].data.data:(((typeof db!=='undefined')&&db&&db.reto)?db.reto:null);
    _dpCalcReto();
    _dpReady=true; _dpLoading=false; _dpRender();
  }).catch(function(err){
    _dpLoading=false;
    var c=document.getElementById('desempeno-content'); if(c)c.innerHTML='<div style="padding:30px;text-align:center;color:var(--red)">Error al cargar: '+esc(String(err&&err.message||err))+'</div>';
  });
}
function _dpRefrescar(){ _dpReady=false; _dpCargar(); }
function _dpSetMes(v){ if(v){ _dpMes=v; _dpRefrescar(); } }
function _dpSetEmpresa(e){ _dpEmpresa=e; _dpRender(); }

/* ---------- Reto mensual por nombre ---------- */
function _dpCalcReto(){
  _dpRetoPts={}; _dpRetoMax=0;
  var r=_dpReto; if(!r||!Array.isArray(r.vendedores))return;
  var ld=r.log_dia||{};
  r.vendedores.forEach(function(v){
    var pts=0;
    Object.keys(ld).forEach(function(f){ if((f||'').slice(0,7)===_dpMes){ pts+=_dpNum((ld[f]||{})[v.id]); } });
    var nn=_dpNorm(v.nombre); if(!nn)return;
    _dpRetoPts[nn]=(_dpRetoPts[nn]||0)+pts;
    if(_dpRetoPts[nn]>_dpRetoMax)_dpRetoMax=_dpRetoPts[nn];
  });
}

/* ---------- Descuadre de una caja (reutiliza _ccTot si existe) ---------- */
function _dpFiscalDif(c){
  if(typeof _ccTot==='function'){ try{ return _ccTot(c).fiscalDif; }catch(e){} }
  var d=c.data||{}, tasa=_dpNum(d.tasa);
  var ef=0; try{ if(typeof _CC_DENOM!=='undefined'){ _CC_DENOM.forEach(function(dn){ ef+=dn*_dpNum((d.efectivo||{})[dn]); }); } }catch(e){}
  var sum=function(a){ return (a||[]).reduce(function(x,y){ return x+_dpNum(y.monto); },0); };
  var dolU=sum(d.dolares), zelU=sum(d.zelle), tr=sum(d.transfer), de=sum(d.debito), cr=sum(d.credito), ga=sum(d.gastos);
  var fzVN=_dpNum(d.fiscal_ventas_netas)+_dpNum(d.fiscal_ventas_netas2), fzCR=_dpNum(d.fiscal_creditos), fzREP=_dpNum(d.fiscal_reposicion);
  var totCaja=ef+de+tr+cr+(dolU*tasa)+(zelU*tasa)+ga;
  return totCaja-(fzVN-fzCR)-fzREP;
}

/* ---------- Métricas por empleado ---------- */
function _dpMetrics(e){
  var id=String(e.id), nn=_dpNorm(e.nombre), cargo=(e.cargo||'').toLowerCase();
  // Asistencia
  var f=0,fj=0, vistos={};
  _dpAsis.forEach(function(a){ if(String(a.empleado_id)===id){ var k=a.tipo+'|'+a.fecha; if(vistos[k])return; vistos[k]=1; if(a.tipo==='falta')f++; else if(a.tipo==='falta_justificada')fj++; } });
  var sAsis=Math.max(0,Math.min(100,100-12*f-4*fj));
  // Conducta / amonestaciones
  var nAm=0, montoAm=0;
  _dpAmon.forEach(function(a){ if(String(a.empleado_id)===id){ nAm++; montoAm+=_dpNum(a.monto); } });
  var sCond=Math.max(0,Math.min(100,100-25*nAm));
  // Caja / descuadres
  var esCaja=cargo.indexOf('caja')>=0;
  var desc=0, cerrTot=0;
  if(esCaja){ _dpCierres.forEach(function(c){ if(_dpNorm(c.cajero)===nn){ var dd=c.data||{}; if(dd.fiscal_ventas_netas!=null && dd.fiscal_ventas_netas!==''){ cerrTot++; if(Math.abs(_dpFiscalDif(c))>=0.5)desc++; } } }); }
  var sCaja= esCaja ? Math.max(0,Math.min(100,100-20*desc)) : null;
  // Ventas / reto
  var vpts=_dpRetoPts.hasOwnProperty(nn)?_dpRetoPts[nn]:null;
  var sVent=(vpts!=null && _dpRetoMax>0)?Math.round(100*vpts/_dpRetoMax):null;
  // Gerencia (manual)
  var ev=_dpEvals[id], sGer=null, evObj=null;
  if(ev){ var ds=DP_DIMS.map(function(d){return _dpNum(ev[d.k]);}).filter(function(x){return x>0;}); if(ds.length){ sGer=Math.round(ds.reduce(function(a,b){return a+b;},0)/ds.length*20); evObj=ev; } }
  // Nota final ponderada (renormaliza sobre lo disponible)
  var parts=[{s:sVent,w:DP_PESOS.ventas},{s:sAsis,w:DP_PESOS.asistencia},{s:sCaja,w:DP_PESOS.caja},{s:sCond,w:DP_PESOS.conducta},{s:sGer,w:DP_PESOS.gerencia}];
  var tw=0,ts=0; parts.forEach(function(p){ if(p.s!=null){ tw+=p.w; ts+=p.w*p.s; } });
  var fin=tw>0?Math.round(ts/tw):null;
  return {id:id,nombre:e.nombre,cargo:e.cargo||'',empresa:(e.empresa||''),ced:(e.cedula||''),tel:(e.telefono||''),ingreso:(e.fecha_ingreso||''),foto:(e.foto_url||''),faltas:f,faltasJ:fj,nAm:nAm,montoAm:montoAm,esCaja:esCaja,desc:desc,cerrTot:cerrTot,vpts:(vpts||0),tieneReto:(vpts!=null),sVent:sVent,sAsis:sAsis,sCaja:sCaja,sCond:sCond,sGer:sGer,ev:evObj,fin:fin};
}

/* ---------- Colores / etiquetas ---------- */
function _dpCol(s){ if(s==null)return 'var(--muted)'; if(s>=85)return 'var(--green)'; if(s>=70)return '#2563eb'; if(s>=50)return 'var(--amber)'; return 'var(--red)'; }
function _dpLbl(s){ if(s==null)return 'Sin datos'; if(s>=85)return 'Excelente'; if(s>=70)return 'Bueno'; if(s>=50)return 'Regular'; return 'Bajo'; }

/* ---------- Render ---------- */
function _dpRender(){
  var cont=document.getElementById('desempeno-content'); if(!cont)return;
  if(!_dpPuedeVer()){ cont.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">No tienes acceso a este módulo.</div>'; return; }
  var emps=_dpEmpleados.filter(function(e){ if(e.activo===false)return false; if(_dpEmpresa==='TODAS')return true; return (e.empresa||'').toUpperCase()===_dpEmpresa; });
  var rows=emps.map(_dpMetrics);
  rows.sort(function(a,b){ var fa=(a.fin==null?-1:a.fin), fb=(b.fin==null?-1:b.fin); return fb-fa; });
  var conNota=rows.filter(function(r){return r.fin!=null;});
  var prom=conNota.length?Math.round(conNota.reduce(function(a,r){return a+r.fin;},0)/conNota.length):null;
  var evaluados=rows.filter(function(r){return r.sGer!=null;}).length;

  var empChips=['FARMACIA','DROGUERIA','TODAS'].map(function(x){ return '<button class="fchip'+(_dpEmpresa===x?' active':'')+'" onclick="_dpSetEmpresa(\''+x+'\')" style="font-size:12px">'+(x==='TODAS'?'Todas':(x.charAt(0)+x.slice(1).toLowerCase()))+'</button>'; }).join('');

  var head=''+
    '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px">'+
      '<div><div style="font-size:19px;font-weight:800">Desempeño de trabajadores</div>'+
      '<div style="font-size:12px;color:var(--muted);margin-top:2px">Nota mixta: automática (reto, asistencia, caja, amonestaciones) + evaluación de gerencia.</div></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
        '<input type="month" value="'+esc(_dpMes)+'" onchange="_dpSetMes(this.value)" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px">'+
        '<button class="fchip" onclick="_dpRefrescar()" style="font-size:12px">↻ Actualizar</button>'+
      '</div>'+
    '</div>'+
    '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">'+empChips+'</div>';

  var resumen=''+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">'+
      '<div class="tbox" style="padding:12px 14px;flex:1;min-width:150px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Promedio del equipo</div><div style="font-size:24px;font-weight:800;color:'+_dpCol(prom)+';margin-top:2px">'+(prom==null?'—':prom)+(prom==null?'':'<span style="font-size:12px;color:var(--muted);font-weight:500"> /100</span>')+'</div></div>'+
      '<div class="tbox" style="padding:12px 14px;flex:1;min-width:150px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Trabajadores</div><div style="font-size:24px;font-weight:800;margin-top:2px">'+rows.length+'</div></div>'+
      '<div class="tbox" style="padding:12px 14px;flex:1;min-width:150px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Evaluados por gerencia</div><div style="font-size:24px;font-weight:800;margin-top:2px">'+evaluados+'<span style="font-size:12px;color:var(--muted);font-weight:500"> /'+rows.length+'</span></div></div>'+
    '</div>';

  var cards=rows.length?rows.map(_dpCard).join(''):'<div style="padding:30px;text-align:center;color:var(--muted)">No hay trabajadores activos para esta empresa.</div>';

  cont.innerHTML=head+resumen+'<style>.dpx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}.dpx-card{background:linear-gradient(160deg,#141939 0%,#0d1029 55%,#181f4b 100%);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:16px;color:#eef1ff;box-shadow:0 14px 34px -14px rgba(8,10,40,.55)}.dpx-top{display:flex;gap:11px;align-items:center}.dpx-ava{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#3b6ff0,#7aa8ff);display:grid;place-items:center;font-weight:800;font-size:16px;color:#fff;flex:none;letter-spacing:.5px}.dpx-idn{flex:1;min-width:0}.dpx-idn b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dpx-idn span{font-size:11px;color:#9aa3c7}.dpx-eval{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#dfe5ff;border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}.dpx-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.dpx-pill{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:999px;padding:4px 9px}.dpx-pill-lbl{font-size:9.5px;color:#9aa3c7;text-transform:uppercase;letter-spacing:.4px}.dpx-pill-bar{width:44px;height:6px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden}.dpx-pill-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#4f7cf7,#8fb2ff)}.dpx-pill-val{font-size:10.5px;font-weight:800;color:#dfe5ff}.dpx-mid{display:flex;gap:14px;align-items:center;margin-top:13px}.dpx-ring{position:relative;flex:none}.dpx-ring-c{position:absolute;inset:0;display:grid;place-items:center;text-align:center}.dpx-ring-c b{font-size:25px;display:block;line-height:1}.dpx-ring-c small{font-size:8.5px;color:#9aa3c7;text-transform:uppercase;letter-spacing:.5px;display:block;margin-top:2px}.dpx-facts{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px}.dpx-fact{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px 10px}.dpx-fact b{font-size:17px;display:block}.dpx-fact span{font-size:9.5px;color:#9aa3c7;text-transform:uppercase;letter-spacing:.4px}.dpx-com{font-size:11.5px;color:#aeb6da;margin-top:11px;padding-top:9px;border-top:1px dashed rgba(255,255,255,.14)}.dpx-info{font-size:10.5px;color:#9aa3c7;margin-top:9px;line-height:1.5}</style><div class="dpx-grid">'+cards+'</div>';
}

/* Color brillante para fondo oscuro */
function _dpColD(sv){ if(sv==null)return '#8d96bb'; if(sv>=85)return '#4ade80'; if(sv>=70)return '#60a5fa'; if(sv>=50)return '#fbbf24'; return '#f87171'; }
function _dpIni(nombre){ var p=String(nombre||'').trim().split(/\s+/); return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase(); }
function _dpPill(lbl,sv){
  var v=(sv==null)?null:Math.max(0,Math.min(100,sv));
  return '<div class="dpx-pill"><span class="dpx-pill-lbl">'+lbl+'</span>'+
    '<span class="dpx-pill-bar">'+(v==null?'':'<i style="width:'+v+'%"></i>')+'</span>'+
    '<span class="dpx-pill-val">'+(v==null?'N/A':v+'%')+'</span></div>';
}
function _dpAnillo(fin){
  var c=276.5, off=(fin==null)?c:(c*(1-fin/100)), col=_dpColD(fin);
  return '<div class="dpx-ring"><svg viewBox="0 0 100 100" width="106" height="106">'+
    '<circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="8"/>'+
    '<circle cx="50" cy="50" r="44" fill="none" stroke="'+col+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 50 50)"/>'+
    '</svg><div class="dpx-ring-c"><b style="color:'+col+'">'+(fin==null?'\u2014':fin)+'</b><small>'+_dpLbl(fin)+'</small></div></div>';
}
function _dpCard(m){
  var detCaja=m.esCaja?(m.cerrTot?(m.desc+'/'+m.cerrTot):'0/0'):'\u2014';
  var btn=_dpPuedeEval()?('<button onclick="_dpAbrirEval('+m.id+')" class="dpx-eval">'+(m.sGer!=null?'\u270e Reevaluar':'\u2605 Evaluar')+'</button>'):'';
  var coment=(m.ev&&m.ev.comentario)?('<div class="dpx-com">\u201c'+esc(m.ev.comentario)+'\u201d</div>'):'';
  var fact=function(v,lbl){ return '<div class="dpx-fact"><b>'+v+'</b><span>'+lbl+'</span></div>'; };
  var admin=_dpEsAdmin();
  var avaAttr=admin?(' onclick="_dpFoto('+m.id+')" title="Cambiar foto (solo admin)" style="cursor:pointer"'):'';
  var ava=m.foto
    ?('<div class="dpx-ava"'+(admin?' onclick="_dpFoto('+m.id+')" title="Cambiar foto (solo admin)"':'')+' style="background-image:url(\''+esc(m.foto)+'\');background-size:cover;background-position:center;'+(admin?'cursor:pointer':'')+'"></div>')
    :('<div class="dpx-ava"'+avaAttr+'>'+esc(_dpIni(m.nombre))+'</div>');
  var ficha=[];
  if(m.ced)ficha.push('C.I. '+esc(m.ced));
  var ant=_dpAntig(m.ingreso); if(ant)ficha.push(ant+' en la empresa');
  if(m.tel)ficha.push(esc(m.tel));
  var perfil=_dpPerfilDe(m.cargo);
  if(perfil)ficha.push('Se eval\u00faa como: '+perfil.nombre);
  var fichaHTML=ficha.length?('<div class="dpx-info">'+ficha.join(' \u00b7 ')+'</div>'):'';
  return '<div class="dpx-card">'+
    '<div class="dpx-top">'+
      ava+
      '<div class="dpx-idn"><b>'+esc(m.nombre)+'</b><span>'+esc(m.cargo||'\u2014')+(m.empresa?(' \u00b7 '+esc(m.empresa.charAt(0)+m.empresa.slice(1).toLowerCase())):'')+'</span></div>'+
      btn+
    '</div>'+fichaHTML+
    '<div class="dpx-pills">'+
      _dpPill('Ventas',m.sVent)+_dpPill('Asistencia',m.sAsis)+_dpPill('Caja',m.sCaja)+_dpPill('Conducta',m.sCond)+_dpPill('Gerencia',m.sGer)+
    '</div>'+
    '<div class="dpx-mid">'+
      _dpAnillo(m.fin)+
      '<div class="dpx-facts">'+
        fact(m.faltas+(m.faltasJ?('<small style="font-size:10px;color:#9aa3c7"> +'+m.faltasJ+' just.</small>'):''),'Faltas')+
        fact(m.nAm,'Amonestaciones')+
        fact(detCaja,'Descuadres')+
        fact(m.tieneReto?_dpNum(m.vpts).toFixed(0):'\u2014','Pts del reto')+
      '</div>'+
    '</div>'+coment+
  '</div>';
}

/* Foto del trabajador: el admin toca el avatar, elige la imagen y listo */
function _dpFoto(id){
  if(!_dpEsAdmin()){ if(typeof showToast==='function')showToast('Solo el administrador cambia las fotos'); return; }
  var inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange=function(){
    var f=inp.files&&inp.files[0]; if(!f)return;
    if(f.size>4*1024*1024){ if(typeof showToast==='function')showToast('La foto pesa mucho (m\u00e1x 4 MB)'); return; }
    var ext=((f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,''))||'jpg';
    var path='fotos/emp-'+id+'-'+Date.now()+'.'+ext;
    if(typeof showToast==='function')showToast('Subiendo foto\u2026');
    supabaseClient.storage.from('empleados').upload(path,f,{upsert:true}).then(function(r){
      if(r.error){ if(typeof showToast==='function')showToast('No se pudo subir: '+(r.error.message||'')); return; }
      var pub=supabaseClient.storage.from('empleados').getPublicUrl(path);
      var url=pub&&pub.data&&pub.data.publicUrl;
      if(!url){ if(typeof showToast==='function')showToast('No se pudo obtener la URL'); return; }
      supabaseClient.from('empleados').update({foto_url:url}).eq('id',id).then(function(r2){
        if(r2.error){ if(typeof showToast==='function')showToast('No se pudo guardar'); return; }
        _dpEmpleados.forEach(function(e){ if(String(e.id)===String(id))e.foto_url=url; });
        if(typeof logAudit==='function')logAudit('desempeno.foto','Foto del empleado '+id);
        if(typeof showToast==='function')showToast('\u2713 Foto actualizada');
        _dpRender();
      });
    });
  };
  inp.click();
}

/* ---------- Evaluación manual (modal) ---------- */
function _dpAbrirEval(id){
  if(!_dpPuedeEval())return;
  var e=_dpEmpleados.filter(function(x){return String(x.id)===String(id);})[0]; if(!e)return;
  var ex=_dpEvals[String(id)]||{};
  _dpEvalTmp={id:String(id), nombre:e.nombre, cargo:(e.cargo||''), empresa:(e.empresa_nomina||e.empresa||''), atencion:_dpNum(ex.atencion),actitud:_dpNum(ex.actitud),orden:_dpNum(ex.orden),equipo:_dpNum(ex.equipo),responsabilidad:_dpNum(ex.responsabilidad), comentario:(ex.comentario||'')};
  var host=document.getElementById('dp-modal-host'); if(!host){ host=document.createElement('div'); host.id='dp-modal-host'; document.body.appendChild(host); }
  host.innerHTML=_dpModalHTML();
}
function _dpCerrarModal(){ var h=document.getElementById('dp-modal-host'); if(h)h.innerHTML=''; _dpEvalTmp=null; }
function _dpSetDim(k,val){ if(!_dpEvalTmp)return; _dpEvalTmp[k]=val; var h=document.getElementById('dp-modal-host'); if(h)h.innerHTML=_dpModalHTML(); }
function _dpSetComent(v){ if(_dpEvalTmp)_dpEvalTmp.comentario=v; }

function _dpEstrellas(k){
  var cur=_dpNum(_dpEvalTmp[k]);
  var b=''; for(var i=1;i<=5;i++){ var on=(i<=cur); b+='<button onclick="_dpSetDim(\''+k+'\','+i+')" style="background:none;border:none;cursor:pointer;font-size:22px;line-height:1;padding:0 2px;color:'+(on?'#f59e0b':'var(--border)')+'">★</button>'; }
  b+='<span style="font-size:12px;color:var(--muted);margin-left:6px">'+(cur?(cur+'/5'):'—')+'</span>';
  return b;
}
function _dpModalHTML(){
  if(!_dpEvalTmp)return '';
  var perfil=_dpPerfilDe(_dpEvalTmp.cargo);
  var dims=_dpDimsDe(_dpEvalTmp.cargo).map(function(d){ return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-size:13px">'+d.lbl+'</span><span style="white-space:nowrap">'+_dpEstrellas(d.k)+'</span></div>'; }).join('');
  var prom=(function(){ var ds=DP_DIMS.map(function(d){return _dpNum(_dpEvalTmp[d.k]);}).filter(function(x){return x>0;}); if(!ds.length)return null; return Math.round(ds.reduce(function(a,b){return a+b;},0)/ds.length*20); })();
  return '<div onclick="_dpCerrarModal()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">'+
    '<div onclick="event.stopPropagation()" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:18px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:16px;font-weight:800">Evaluar a '+esc(_dpEvalTmp.nombre)+'</div><button onclick="_dpCerrarModal()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button></div>'+
      '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Criterios de <b>'+esc(perfil?perfil.nombre:'puesto general')+'</b>'+(_dpEvalTmp.cargo?(' ('+esc(_dpEvalTmp.cargo)+')'):'')+'. Califica de 1 a 5 estrellas \u2014 se guarda para '+esc(_dpMes)+'.</div>'+
      dims+
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;font-weight:700"><span style="font-size:13px">Nota gerencia</span><span style="font-size:18px;color:'+_dpCol(prom)+'">'+(prom==null?'—':prom+'/100')+'</span></div>'+
      '<textarea id="dp-coment" oninput="_dpSetComent(this.value)" placeholder="Comentario (opcional)…" style="width:100%;box-sizing:border-box;min-height:64px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:6px">'+esc(_dpEvalTmp.comentario||'')+'</textarea>'+
      '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">'+
        '<button onclick="_dpCerrarModal()" class="fchip" style="font-size:13px">Cancelar</button>'+
        '<button onclick="_dpGuardarEval()" style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function _dpGuardarEval(){
  if(!_dpEvalTmp||!_dpPuedeEval())return;
  var t=_dpEvalTmp;
  var any=DP_DIMS.some(function(d){ return _dpNum(t[d.k])>0; });
  if(!any){ if(typeof showToast==='function')showToast('Califica al menos un aspecto'); return; }
  var row={ empleado_id:parseInt(t.id,10), empleado_nombre:t.nombre, empresa:t.empresa, mes:_dpMes,
    atencion:_dpNum(t.atencion)||null, actitud:_dpNum(t.actitud)||null, orden:_dpNum(t.orden)||null, equipo:_dpNum(t.equipo)||null, responsabilidad:_dpNum(t.responsabilidad)||null,
    comentario:(t.comentario||'').trim()||null, creado_por:((typeof currentUser!=='undefined')?currentUser:''), actualizado_en:new Date().toISOString() };
  supabaseClient.from('desempeno_evaluaciones').upsert(row,{onConflict:'empleado_id,mes'}).select('*').then(function(res){
    if(res.error){ if(typeof showToast==='function')showToast('Error al guardar: '+res.error.message); return; }
    var saved=(res.data&&res.data[0])?res.data[0]:row; _dpEvals[String(t.empleado_id||parseInt(t.id,10))]=saved;
    if(typeof logAudit==='function')logAudit('desempeno_eval','Evaluó a '+t.nombre+' ('+_dpMes+')');
    _dpCerrarModal(); _dpRender();
    if(typeof showToast==='function')showToast('Evaluación guardada ✓');
  });
}

/* ---------- Entry point ---------- */
function renderDesempeno(){ _dpEntrar(); }
