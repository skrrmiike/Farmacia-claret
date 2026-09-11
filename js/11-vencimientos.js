function _venKey(x){ return (''+(x||'')).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,''); }
function _venMeses(fv){ try{ if(!fv)return null; var p=(''+fv).slice(0,10).split('-'); var y=parseInt(p[0]),m=parseInt(p[1]),dd=parseInt(p[2]); var d=(dd<=1)?new Date(y,m,0):new Date(y,m-1,dd); var h=new Date(HOY()+'T00:00:00'); return (d-h)/(86400000*30.44); }catch(e){ return null; } }
function _venCalc(l){
  var p=_venProd[(''+(l.codigo||'')).trim()]||_venProdN[_venKey(l.descripcion)]||{}; var pm=Number(p.prom_mensual)||0;
  var cant=Number(l.cantidad)||0; var meses=_venMeses(l.fecha_venc);
  var ventaEsp=(meses!=null&&meses>0)?pm*meses:0; var enRiesgo=Math.max(0,cant-ventaEsp);
  var accion;
  if(meses==null) accion='SIN_FECHA';
  else if(meses<0) accion='VENCIDO';
  else if(enRiesgo<=0.5) accion='OK';
  else if(meses<=1) accion='PROMOCION';
  else if(meses<=3) accion='EMPUJAR';
  else accion='VIGILAR';
  return {pm:pm,cant:cant,meses:meses,ventaEsp:ventaEsp,enRiesgo:Math.round(enRiesgo),accion:accion};
}
var _VENACC={VENCIDO:{t:'Vencido',c:'#6b7280'},PROMOCION:{t:'Promoción/remate',c:'#dc2626'},EMPUJAR:{t:'Empujar en reto',c:'#4F46E5'},VIGILAR:{t:'Vigilar',c:'#d97706'},OK:{t:'Se vende solo',c:'#059669'},SIN_FECHA:{t:'Sin fecha',c:'#9ca3af'}};
function renderVencimientos(){ var el=document.getElementById('vencimientos-content'); if(!el)return; el.innerHTML='<div style="padding:24px;color:var(--muted)">Cargando plan de vencimientos…</div>'; _venCargar(); }
function _venCargar(){
  supabaseClient.from('lotes_vencimiento').select('*').order('fecha_venc').then(function(r){
    if(r&&r.error){ var el=document.getElementById('vencimientos-content'); if(el)el.innerHTML='<span style="color:var(--red)">No se pudo cargar: '+esc(r.error.message||'')+'</span>'; return; }
    _venItems=(r&&r.data)||[];
    _venProd={}; _venProdN={};
    if(!_venItems.length){ _venPintar(); return; }
    var _off=0; (function nx(){
      supabaseClient.from('productos').select('codigo,descripcion,prom_mensual,existencia_actual').range(_off,_off+999).then(function(res){
        var arr=(res&&res.data)||[];
        arr.forEach(function(p){ if(p.codigo)_venProd[(''+p.codigo).trim()]=p; var k=_venKey(p.descripcion); if(k)_venProdN[k]=p; });
        if(arr.length===1000){ _off+=1000; nx(); } else { _venPintar(); }
      }).catch(function(){ _venPintar(); });
    })();
  });
}
function _venSetF(f){ _venFiltro=f; _venPintar(); }
function _venSetTab(t){ if(typeof window!=='undefined')window._venTab=t; _venPintar(); }
function _venSetMes(m){ if(typeof window!=='undefined')window._venMes=m; _venPintar(); }
function _venBuscar(v){ _venQ=(v||'').toLowerCase(); _venPintar(); }
function _venMesNom(fv){ try{ var d=new Date((''+fv).slice(0,10)+'T00:00:00'); return d.toLocaleDateString('es-VE',{month:'long',year:'numeric'}); }catch(e){ return '—'; } }
function _venReco(){
  var out=[];
  (_venItems||[]).forEach(function(l){
    var c=_venCalc(l); if(c.accion==='VENCIDO'||c.accion==='SIN_FECHA') return;
    var nom=(l.descripcion||(_venProd[(''+(l.codigo||'')).trim()]||{}).descripcion||l.codigo||'—');
    var cant=c.cant, pm=c.pm, meses=c.meses, riesgo=c.enRiesgo;
    if(riesgo<=0) return;
    var mesesNec = pm>0 ? (cant/pm) : 999;
    var urg = (meses<=1)?3:((meses<=3)?2:1);
    out.push({nom:nom,cant:cant,pm:pm,meses:meses,riesgo:riesgo,mesesNec:mesesNec,urg:urg,venc:l.fecha_venc,pct:cant>0?Math.round(riesgo/cant*100):0});
  });
  out.sort(function(a,b){ if(b.urg!==a.urg) return b.urg-a.urg; return b.riesgo-a.riesgo; });
  return out;
}
function _venRecoHTML(){
  var r=_venReco(); if(!r.length) return '';
  var totR=r.reduce(function(a,x){return a+x.riesgo;},0);
  var sinMov=r.filter(function(x){return x.pm<=0;}).length;
  function acc(x){
    if(x.urg===3) return {t:'REMATAR YA',c:'#B42318',g:'linear-gradient(180deg,#C9382C,#B42318)'};
    if(x.urg===2) return {t:'AL RETO',c:'#1E38A6',g:'linear-gradient(180deg,#2B47C4,#1E38A6)'};
    return {t:'VIGILAR',c:'#B54708',g:'linear-gradient(180deg,#D97706,#B54708)'};
  }
  var rows=r.slice(0,25).map(function(x,i){
    var a=acc(x);
    var ritmo = x.pm>0 ? ('vende '+_venFmt(x.pm)+'/mes · necesitaría '+(x.mesesNec>99?'+99':_venFmt(x.mesesNec))+' meses') : '⚠ sin ventas registradas';
    return '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 4px;border-top:1px solid var(--border)">'+
      '<span style="background:'+a.g+';color:#fff;font-size:9.5px;font-weight:600;letter-spacing:.3px;padding:4px 9px;border-radius:999px;white-space:nowrap;flex:none;margin-top:2px;box-shadow:0 2px 7px '+a.c+'59,inset 0 1px 0 rgba(255,255,255,.2)">'+a.t+'</span>'+
      '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px;line-height:1.25">'+esc(x.nom)+'</div>'+
      '<div style="font-size:11px;color:var(--muted);margin-top:2px">Tiene <b>'+_venFmt(x.cant)+'</b> u · vence '+_venMesNom(x.venc)+' · '+ritmo+'</div></div>'+
      '<div style="text-align:right;flex:none"><div style="font-size:17px;font-weight:900;color:'+a.c+'">'+_venFmt(x.riesgo)+'</div><div style="font-size:9.5px;color:var(--muted)">u en riesgo ('+x.pct+'%)</div></div>'+
    '</div>';
  }).join('');
  return '<div class="tbox" style="padding:14px 16px;border-radius:14px;margin-bottom:14px;border-left:4px solid #dc2626">'+
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px"><div style="font-weight:800;font-size:15px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>Qué hacer ahora — priorizado</div>'+
    '<span style="font-size:11px;color:var(--muted)">'+r.length+' productos · '+_venFmt(totR)+' u no se venderán solas</span></div>'+
    '<div style="font-size:11.5px;color:var(--muted);margin-bottom:4px">Cruzamos existencia + promedio de venta mensual + fecha de vencimiento. Ordenado por urgencia e impacto.'+(sinMov?(' <b style="color:#dc2626">'+sinMov+' sin ventas registradas.</b>'):'')+'</div>'+
    rows+(r.length>25?('<div style="font-size:11px;color:var(--muted);padding-top:8px">Mostrando los 25 más críticos de '+r.length+'.</div>'):'')+
  '</div>';
}
function _venFmt(n){ n=Number(n)||0; return n>=100?Math.round(n).toLocaleString('es-VE'):(Math.round(n*10)/10).toLocaleString('es-VE'); }
function _venPintar(){
  var el=document.getElementById('vencimientos-content'); if(!el)return;
  var rows=_venItems.map(function(l){ var c=_venCalc(l); var nom=(l.descripcion||(_venProd[(''+(l.codigo||'')).trim()]||{}).descripcion||l.codigo||'—'); return {l:l,c:c,nom:nom}; });
  var totRiesgo=rows.reduce(function(a,x){return a+(x.c.enRiesgo||0);},0);
  var nProm=rows.filter(function(x){return x.c.accion==='PROMOCION';}).length;
  var empujar=rows.filter(function(x){return x.c.accion==='EMPUJAR';});
  var nEmp=empujar.length;
  var drop='<div id="ven-drop" ondragover="event.preventDefault();this.style.borderColor=\'var(--primary)\'" ondragleave="this.style.borderColor=\'#DFE2E7\'" ondrop="_venDrop(event)" onclick="_venBrowse()" style="border:1.5px dashed #DFE2E7;border-radius:13px;padding:15px 16px;text-align:center;cursor:pointer;color:var(--muted);font-size:12.5px;margin-bottom:16px;background:linear-gradient(160deg,#FCFCFD,#F8F9FB);transition:border-color .15s">'+
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;margin-right:7px;opacity:.55"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>'+
    '<b style="color:var(--text2);font-weight:500">Sube la plantilla de vencimientos</b> <span style="opacity:.8">o arrástrala aquí · actualiza el plan y el reto de cada mes</span> <span id="ven-pg" style="color:var(--primary)"></span></div>';
  var _pmOK=rows.filter(function(x){return x.c.pm>0;}).length;
  var head='<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:16px">'+
    '<div><div style="font-size:18px;font-weight:600;letter-spacing:-.3px;color:var(--text)">Plan de vencimientos</div>'+
    '<div style="font-size:12px;color:var(--muted);margin-top:2px">'+_venItems.length+' lote(s) · '+_pmOK+' con historial de venta · cruzado con el promedio mensual</div></div></div>';
  if(!_venItems.length){ el.innerHTML=head+drop+'<div class="tbox" style="padding:26px;text-align:center;color:var(--muted);border-radius:14px">Aún no hay lotes cargados. Sube el Excel de vencimientos para ver el plan.</div>'; return; }
  var _mt=function(lbl,val,sub,col){ return '<div style="flex:1;min-width:150px;background:linear-gradient(160deg,#fff,#FCFCFD);border:1px solid rgba(16,24,40,.07);border-radius:13px;padding:14px 15px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(16,24,40,.10),inset 0 1px 0 #fff">'+
    '<div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+lbl+'</div>'+
    '<div style="font-size:22px;font-weight:600;letter-spacing:-.5px;font-variant-numeric:tabular-nums;margin-top:4px;color:'+(col||'var(--text)')+'">'+val+'</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:1px">'+sub+'</div></div>'; };
  var cards='<div style="display:flex;gap:11px;flex-wrap:wrap;margin-bottom:14px">'+
    _mt('Lotes', _venItems.length, 'cargados en el plan','')+
    _mt('En riesgo', fmt(totRiesgo,0), 'unidades que no se venden solas', totRiesgo>0?'#B42318':'#079455')+
    _mt('Remate', nProm, 'vencen en 1 mes o menos', nProm>0?'#B42318':'var(--text)')+
    _mt('Para el reto', nEmp, 'a empujar este mes', nEmp>0?'#1E38A6':'var(--text)')+
  '</div>';
  var reto='';
  if(nEmp){ var bym={}; empujar.sort(function(a,b){return (a.l.fecha_venc||'').localeCompare(b.l.fecha_venc||'');});
    reto='<div class="tbox" style="padding:14px 16px;border-radius:14px;margin-bottom:14px;border-left:4px solid var(--accent)"><div style="font-weight:800;font-size:14px;margin-bottom:8px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z"/></svg>Reto sugerido — a empujar ahora</div>'+
      '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Estos vencen en 1–3 meses y no se venderán solos. La cantidad es la <b>meta</b> a mover (lo que está en riesgo).</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:7px">'+empujar.map(function(x){ return '<span style="background:var(--surface2);border:1px solid var(--border);border-radius:999px;padding:4px 11px;font-size:12px"><b>'+esc(x.nom)+'</b> · meta '+x.c.enRiesgo+' · vence '+_venMesNom(x.l.fecha_venc)+'</span>'; }).join('')+'</div></div>';
  }
  var q=_venQ, f=_venFiltro; var _vmes=(typeof window!=='undefined'&&window._venMes)||'';
  var _vmO={}; _venItems.forEach(function(l){ var mm=(''+(l.fecha_venc||'')).slice(0,7); if(/^\d{4}-\d{2}$/.test(mm))_vmO[mm]=1; }); var _vmeses=Object.keys(_vmO).sort(); if(_vmes && _vmeses.indexOf(_vmes)<0)_vmes='';
  var vis=rows.filter(function(x){ if(f!=='todos' && x.c.accion!==f) return false; if(_vmes && (''+(x.l.fecha_venc||'')).slice(0,7)!==_vmes) return false; if(q && ((''+x.nom+' '+(x.l.codigo||'')).toLowerCase().indexOf(q)<0)) return false; return true; });
  vis.sort(function(a,b){ return (a.l.fecha_venc||'9999').localeCompare(b.l.fecha_venc||'9999'); });
  function chip(v,t){ return '<button class="fchip'+(f===v?' active':'')+'" onclick="_venSetF(\''+v+'\')">'+t+'</button>'; }
  var _mchip=function(v,t){ return '<button class="fchip'+(_vmes===v?' active':'')+'" onclick="_venSetMes(\''+v+'\')">'+t+'</button>'; };
  var mchips=(_vmeses.length>1)?('<div class="fchips" style="margin-bottom:8px"><span style="font-size:11px;color:var(--muted);font-weight:700;margin-right:2px">Mes:</span>'+_mchip('','Todos')+_vmeses.map(function(m){return _mchip(m,_venMesNom(m+'-01'));}).join('')+'</div>'):'';
  var chips=mchips+'<div class="fchips" style="margin-bottom:10px">'+chip('todos','Todos')+chip('EMPUJAR','Empujar')+chip('PROMOCION','Promoción')+chip('VIGILAR','Vigilar')+chip('OK','Se vende solo')+chip('VENCIDO','Vencidos')+'</div>';
  var rowsHtml=vis.map(function(x){ var a=_VENACC[x.c.accion]||{t:x.c.accion,c:'#6b7280'};
    return '<tr style="border-top:1px solid var(--border)"><td style="padding:7px 12px"><div style="font-weight:600;font-size:12.5px">'+esc(x.nom)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(x.l.codigo||'')+'</div></td>'+
      '<td style="text-align:center;font-size:12px;white-space:nowrap">'+_venMesNom(x.l.fecha_venc)+'</td>'+
      '<td style="text-align:right">'+fmt(x.c.cant,0)+'</td>'+
      '<td style="text-align:right;color:var(--muted)">'+fmt(x.c.pm,0)+'</td>'+
      '<td style="text-align:right;color:var(--muted)">'+fmt(Math.round(x.c.ventaEsp),0)+'</td>'+
      '<td style="text-align:right;font-weight:800;color:'+(x.c.enRiesgo>0?'var(--red)':'var(--green)')+'">'+fmt(x.c.enRiesgo,0)+'</td>'+
      '<td style="text-align:center"><span style="background:'+a.c+';color:#fff;font-size:10px;font-weight:700;padding:2px 9px;border-radius:999px;white-space:nowrap">'+a.t+'</span></td></tr>';
  }).join('');
  var tabla='<input placeholder="🔎 Buscar producto o código…" value="'+esc(q)+'" oninput="_venBuscar(this.value)" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid var(--border);border-radius:11px;background:var(--surface);color:var(--text);margin-bottom:10px">'+chips+
    '<div class="tbox" style="padding:0;border-radius:14px;overflow:hidden"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
    '<tr style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.4px"><th style="text-align:left;padding:8px 12px">Producto</th><th>Vence</th><th style="text-align:right">Cant.</th><th style="text-align:right">Prom/mes</th><th style="text-align:right;padding-right:4px">Se vende solo</th><th style="text-align:right">En riesgo</th><th>Acción</th></tr>'+
    rowsHtml+'</table></div></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:8px">"En riesgo" = existencia − (promedio mensual × meses hasta vencer). Es lo que hay que empujar. Mostrando '+vis.length+' de '+_venItems.length+'.</div>';
  var _vt=(typeof window!=='undefined'&&window._venTab)||'hacer';
  var _tabB=function(k,t){ return '<button class="fchip'+(_vt===k?' active':'')+'" onclick="_venSetTab(\''+k+'\')" style="font-size:12.5px;padding:6px 12px">'+t+'</button>'; };
  var tabsBar='<div class="fchips" style="margin-bottom:14px;gap:7px">'+_tabB('cargar','📥 Cargar')+_tabB('hacer','🎯 Qué hacer')+_tabB('lista','📋 Lista completa')+'</div>';
  var _hacer=_venRecoHTML()+reto; if(!_hacer.replace(/\s/g,''))_hacer='<div class="tbox" style="padding:22px;text-align:center;color:var(--muted);border-radius:14px">✓ Todo bajo control — nada urgente que empujar ahora.</div>';
  var body=(_vt==='cargar')?(drop+cards):((_vt==='lista')?tabla:_hacer);
  el.innerHTML=head+tabsBar+body;
}
function _venBrowse(){ var i=document.createElement('input'); i.type='file'; i.accept='.xlsx,.xls'; i.onchange=function(){ var f=i.files&&i.files[0]; if(f)_venLeer(f); }; i.click(); }
function _venDrop(e){ e.preventDefault(); var dz=document.getElementById('ven-drop'); if(dz)dz.style.borderColor='var(--border)'; var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f)_venLeer(f); }
function _venFecha(v){ if(v==null||v==='')return null; if(v instanceof Date){ return v.toISOString().slice(0,10); } if(typeof v==='number'){ var d=new Date(Math.round((v-25569)*86400000)); return d.toISOString().slice(0,10); } var s=(''+v).trim(); var m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/); if(m){ var yy=m[3].length===2?('20'+m[3]):m[3]; return yy+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2); } var m2=s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/); if(m2){ return m2[1]+'-'+('0'+m2[2]).slice(-2)+'-'+('0'+m2[3]).slice(-2); } return null; }
function _venNum(v){ if(v==null||v==='')return null; if(v instanceof Date)return null; var n=Number((''+v).replace(/[^0-9.\-]/g,'')); return isNaN(n)?null:n; }
function _venCant(v){ if(v==null||v==='')return null; var s=(''+v).trim(); if(s.indexOf('/')>=0)s=s.split('/')[0]; var n=parseInt(s.replace(/[^0-9]/g,''),10); return isNaN(n)?null:n; }
function _venEmp(v){ var s=(''+(v||'')).toLowerCase(); if(s.indexOf('drog')>=0)return 'drogueria'; if(s.indexOf('farm')>=0)return 'farmacia'; return (typeof EMPRESA!=='undefined'?EMPRESA:'consolidado'); }
function _venSyncReto(items){
  try{
    if(typeof _reto!=='function')return;
    var r=_reto(); if(!Array.isArray(r.meds))r.meds=[];
    var hoyMes=(typeof _retoMesHoy==='function')?_retoMesHoy():new Date().toISOString().slice(0,7);
    var add=0, upd=0, omit=0, her=0;
    (items||[]).forEach(function(it){
      var fv=it.fecha_venc; if(!fv)return;
      var mes=(''+fv).slice(0,7); if(!/^\d{4}-\d{2}$/.test(mes))return;
      if(mes<hoyMes)return;
      var restante=Number(it.cantidad)||0; if(restante<=0)return;
      var nom=(it.descripcion||it.codigo||'').trim(); if(!nom)return;
      var key=_venKey(nom);
      var ex=r.meds.filter(function(m){ return (''+(m.vence||'')).slice(0,7)===mes && _venKey(m.nombre)===key; })[0];
      if(it.impulsable===false){ if(ex){ ex.impulsable=false; upd++; } return; }
      if(ex){ if(mes<=hoyMes){ if(it.total!=null)ex.total=it.total; if(it.ultima_venta)ex.ultima_venta=it.ultima_venta; if(it.puntos!=null&&it.puntos>0)ex.puntos=it.puntos; upd++; return; } var soldEx=(typeof _retoMedSold==='function')?_retoMedSold(r,ex.id):0; ex.meta=soldEx+restante; ex.impulsable=true; if(it.puntos!=null&&it.puntos>0)ex.puntos=it.puntos; if(it.total!=null)ex.total=it.total; if(it.ultima_venta)ex.ultima_venta=it.ultima_venta; if(it.presc!=null)ex.presc=it.presc; if(ex.retirado){ex.retirado=false;delete ex.retirado_fecha;} upd++; }
      else {
        // Regla mensual: NO crear productos nuevos para el mes en curso (solo meses futuros).
        // El listado del mes se fija al arranque; lo tardío entra al mes siguiente o a mano.
        if(mes<=hoyMes){ omit++; return; }
        // Herencia: si el mismo producto ya estuvo en un reto anterior, hereda puntaje/impulsable/presc.
        var prev=null; r.meds.forEach(function(m){ var mv=(''+(m.vence||'')).slice(0,7); if(_venKey(m.nombre)===key && mv && mv<mes){ if(!prev||mv>(''+(prev.vence||'')).slice(0,7))prev=m; } });
        var _kl=nom.toLowerCase().trim(); var q=(_kl.indexOf('q-')===0||_kl.indexOf('q ')===0);
        var pts=(it.puntos!=null&&it.puntos>0)?it.puntos:(prev?(Number(prev.puntos)||1):(q?2:1));
        var imp=prev?(prev.impulsable!==false):true;
        var prc=(it.presc!=null)?(it.presc===true):(prev?(prev.presc===true):false);
        r.meds.push({id:_retoUID(),nombre:nom,meta:restante,puntos:pts,impulsable:imp,vence:mes,empresa:it.empresa||'',total:(it.total!=null?it.total:null),ultima_venta:(it.ultima_venta||''),presc:prc,heredado:!!prev}); add++; if(prev)her++;
      }
    });
    if(add||upd){ _retoSave(true); if(typeof showToast==='function')setTimeout(function(){ showToast('🏆 Reto: '+add+' nuevos ('+her+' con puntaje heredado) · '+upd+' al día'+(omit?(' · '+omit+' del mes en curso NO se agregaron'):'')); },1400); if(typeof logAudit==='function')logAudit('reto.autopoblar','+'+add+' / ~'+upd); }
  }catch(e){}
}
function _venLeer(f){
  if(!window.XLSX){ var pg=document.getElementById('ven-pg'); if(pg)pg.textContent=' cargando lector…'; var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=function(){_venLeer(f);}; s.onerror=function(){showToast('No se pudo cargar el lector de Excel');}; document.head.appendChild(s); return; }
  var rd=new FileReader(); rd.onload=function(e){ try{
    var wb=XLSX.read(e.target.result,{type:'array',cellDates:true});
    var out=[];
    wb.SheetNames.forEach(function(sn){ var rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null});
      var _vnorm=function(x){ return (''+(x||'')).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); };
      var hr=-1; for(var i=0;i<rows.length;i++){ var r=rows[i]||[]; var hF=false,hA=false; for(var j=0;j<r.length;j++){ var c=_vnorm(r[j]); if(c.indexOf('VENC')>=0||c.indexOf('CADUC')>=0||c==='FECHA'||c.indexOf('FECHA DE')>=0)hF=true; if(c.indexOf('ARTICUL')>=0||c.indexOf('DESCRIP')>=0||c.indexOf('PRODUCTO')>=0||c.indexOf('NOMBRE')>=0||c.indexOf('CODIG')>=0||c.indexOf('BARRA')>=0)hA=true; } if(hF&&hA){ hr=i; break; } }
      if(hr<0)return; var hdr=rows[hr]||[];
      var idx=function(subs){ for(var j=0;j<hdr.length;j++){ var c=_vnorm(hdr[j]); for(var k=0;k<subs.length;k++)if(c.indexOf(subs[k])>=0)return j; } return -1; };
      var iC=idx(['CODIGO','BARRA']), iD=idx(['ARTICUL','DESCRIP','PRODUCTO','NOMBRE']), iE=idx(['EXISTENC','STOCK','TOTAL']), iR=idx(['META','RESTANTE','QUEDA','CANTDAD','CANTIDAD']), iF=idx(['VENC','CADUC','FECHA']), iEmp=idx(['EMPRESA']), iU=idx(['ULTIMA']), iP=idx(['PRESCRIP','RECIP']), iI=idx(['IMPULS']), iPts=idx(['PUNTOS','PUNTAJE']);
      for(var i2=hr+1;i2<rows.length;i2++){ var r=rows[i2]||[]; var fv=(iF>=0)?_venFecha(r[iF]):null; var cod=(iC>=0&&r[iC]!=null)?(''+r[iC]).trim():null; var des=(iD>=0&&r[iD]!=null)?(''+r[iD]).trim():null;
        if(des && /^(unidades|articulo|artículo)$/i.test(des)) continue;
        if(!fv && !cod && !des)continue; if(!fv)continue;
        var _restante=_venCant((iR>=0)?r[iR]:null), _total=_venNum((iE>=0)?r[iE]:null);
        var _cant=(_restante!=null?_restante:(_total!=null?_total:0));
        var _pts=(iPts>=0)?_venNum(r[iPts]):null;
        var _emp=(iEmp>=0&&r[iEmp]!=null)?_venEmp(r[iEmp]):(typeof EMPRESA!=='undefined'?EMPRESA:'consolidado');
        var _uv=(iU>=0&&r[iU]!=null)?(''+r[iU]).trim():null;
        var _sn=function(v,dv){ var ss=(''+(v==null?'':v)).trim().toLowerCase(); if(!ss)return dv; return !(ss.charAt(0)==='n'); };
        var _presc=(iP>=0)?_sn(r[iP],null):null; var _imp=(_presc===true)?false:((iI>=0)?_sn(r[iI],true):true);
        out.push({codigo:cod,descripcion:des,cantidad:_cant,total:_total,ultima_venta:_uv,fecha_venc:fv,empresa:_emp,presc:_presc,impulsable:_imp,puntos:_pts});
      }
    });
    if(!out.length){ showToast('No encontré lotes con fecha de vencimiento'); return; }
    if(!confirm('Se reemplazará la lista con '+out.length+' lotes. ¿Continuar?')) return;
    _venGuardar(out);
  }catch(err){ showToast('Error leyendo el Excel: '+((err&&err.message)||'')); } };
  rd.readAsArrayBuffer(f);
}
function _venGuardar(items){
  var pg=document.getElementById('ven-pg'); if(pg)pg.textContent=' guardando '+items.length+'…';
  supabaseClient.from('lotes_vencimiento').delete().gte('id',0).then(function(d){
    if(d&&d.error){ showToast('Error al limpiar: '+(d.error.message||'')); return; }
    var _i=0; (function ins(){ var lote=items.slice(_i,_i+500); if(!lote.length){ showToast('✓ '+items.length+' lotes cargados'); if(typeof logAudit==='function')logAudit('vencimientos.import',items.length+' lotes'); try{_venSyncReto(items);}catch(e){} _venCargar(); return; }
      supabaseClient.from('lotes_vencimiento').insert(lote).then(function(r){ if(r&&r.error){ showToast('Error al guardar: '+(r.error.message||'')); return; } _i+=500; ins(); });
    })();
  });
}
/* ================= Mensajes / Campañas WhatsApp (Droguería · Nilsa) ================= */
var _waEmp=[], _waSel={}, _waBus='', _waHist=[];
var _msgCanal='wa', _coSel={}, _coBus='', _coHist=[], _coCfg=null, _coIncluyeMeds=true, _coRemitente='drogueria';
