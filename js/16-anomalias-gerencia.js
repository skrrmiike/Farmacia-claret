var _anomDias=30;
function _pgPuede(){ try{ return ['admin','gerente'].indexOf(currentRole)>=0; }catch(e){ return false; } }
function _pgBox(){
  if(!_pgPuede()) return '';
  var sug=['¿Cuánto vendimos ayer?','¿Cuántos dólares hicimos este mes?','¿Y el mes pasado?','¿Cuánto entró en efectivo este mes?','¿Quién tuvo descuadres?','¿Hay firmas pendientes?','¿Qué se vence este mes?','¿Cómo va el reto?','¿Quién trabajó hoy?'];
  return '<div style="margin-bottom:20px">'+
    '<div style="background:linear-gradient(160deg,#fff,#FCFCFD);border:1px solid rgba(16,24,40,.07);border-radius:14px;padding:14px 15px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(16,24,40,.10),inset 0 1px 0 #fff">'+
    '<div style="display:flex;align-items:center;gap:10px">'+
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E38A6" stroke-width="1.9" stroke-linecap="round" style="flex:none"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>'+
      '<input id="pg-q" placeholder="Pregúntale a Claret… ej. ¿cuánto vendimos ayer?" onkeydown="if(event.key===\'Enter\')_pgIr()" style="flex:1;border:0;outline:none;background:transparent;font-size:14px;color:var(--text);padding:4px 0"><button onclick="_pgVoz()" title="Preguntar por voz" style="border:0;background:none;font-size:17px;cursor:pointer;padding:0 6px">🎤</button><input type="hidden">'+
      '<button class="btn btn-accent btn-sm" onclick="_pgIr()">Preguntar</button></div></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+sug.map(function(q){ return '<button onclick="_pgIr(\''+q.replace(/'/g,"\\'")+'\')" style="border:1px solid #E7E9ED;background:linear-gradient(180deg,#fff,#FAFBFC);color:#5B616E;border-radius:999px;padding:5px 11px;font-size:11.5px;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.04)">'+q+'</button>'; }).join('')+'</div>'+
    '<div id="pg-out" style="margin-top:11px"></div></div>';
}
function _pgN(v){ v=parseFloat((''+(v==null?'':v)).replace(/[^0-9.\-]/g,'')); return isNaN(v)?0:v; }
function _pgF(n){ return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _pgRango(q){
  var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
  var d=function(n){ var x=new Date(hoy+'T00:00:00'); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
  if(/ayer/.test(q)) return {a:d(-1),b:d(-1),lbl:'ayer'};
  if(/anteayer/.test(q)) return {a:d(-2),b:d(-2),lbl:'anteayer'};
  if(/semana pasada/.test(q)) return {a:d(-14),b:d(-7),lbl:'la semana pasada'};
  if(/semana/.test(q)) return {a:d(-7),b:hoy,lbl:'los últimos 7 días'};
  if(/mes pasado/.test(q)){ var p=hoy.slice(0,7).split('-'); var y=+p[0],m=+p[1]-1; if(m<1){m=12;y--;} var mm=('0'+m).slice(-2); var fin=new Date(y,m,0).getDate(); return {a:y+'-'+mm+'-01',b:y+'-'+mm+'-'+fin,lbl:'el mes pasado'}; }
  if(/mes|mensual/.test(q)) return {a:hoy.slice(0,7)+'-01',b:hoy,lbl:'este mes'};
  if(/a[nñ]o/.test(q)) return {a:hoy.slice(0,4)+'-01-01',b:hoy,lbl:'este año'};
  var m2=q.match(/(\d{1,3})\s*d[ií]as/); if(m2) return {a:d(-parseInt(m2[1])),b:hoy,lbl:'los últimos '+m2[1]+' días'};
  return {a:hoy,b:hoy,lbl:'hoy'};
}
function _pgIr(txt){
  if(!_pgPuede())return;
  var inp=document.getElementById('pg-q');
  var q=(txt!=null?txt:(inp?inp.value:'')||'').toLowerCase().trim();
  if(inp && txt!=null) inp.value=txt;
  var out=document.getElementById('pg-out'); if(!out)return;
  if(!q){ out.innerHTML=''; return; }
  out.innerHTML='<div style="padding:12px;color:var(--muted);font-size:13px">Buscando…</div>';
  var r=_pgRango(q);
  var card=function(tit,val,det,col){ return '<div style="background:linear-gradient(160deg,#fff,#FCFCFD);border:1px solid rgba(16,24,40,.07);border-radius:13px;padding:15px 16px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(16,24,40,.10),inset 0 1px 0 #fff">'+
    '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+tit+'</div>'+
    '<div style="font-size:26px;font-weight:600;letter-spacing:-.6px;font-variant-numeric:tabular-nums;margin-top:4px;color:'+(col||'var(--text)')+'">'+val+'</div>'+
    (det?('<div style="font-size:12px;color:var(--muted);margin-top:5px;line-height:1.6">'+det+'</div>'):'')+'</div>'; };
  // ── cobranzas: ¿a quién cobrar hoy? / envíale el cobro a X
  if(/cobr|deud|moros/.test(q)){
    supabaseClient.from('cxc_drog').select('*').eq('empresa','drogueria').eq('estado','activa').then(function(rr){
      window._cxbRows=(rr&&rr.data)||[]; if(typeof _cxbRows!=='undefined')_cxbRows=window._cxbRows;
      if(!window._cxbRows.length){ out.innerHTML=card('Cobranzas','Sin deudas activas','Importa el reporte de A2 en el módulo Cobranzas (CxC).',''); return; }
      var clis=(typeof _cxbCli==='function')?_cxbCli():[];
      var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
      var due=clis.filter(function(c){ return (c.prox&&c.prox<=hoy)||(!c.prox&&c.peor>0)||(c.promesa&&c.promesa<hoy); });
      // ¿pidió enviar a alguien específico?
      var mEnv=q.match(/env[ií]a?l?e?.*cobro a (.+)|cobrale a (.+)|c[óo]brale a (.+)/);
      var objetivo=(mEnv&&(mEnv[1]||mEnv[2]||mEnv[3])||'').trim();
      if(objetivo){
        var norm=function(t){return (''+t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');};
        var hit=clis.filter(function(c){ return norm(c.nombre).indexOf(norm(objetivo))>=0; })[0];
        if(hit){ out.innerHTML=card('Enviando cobro','📲 '+esc(hit.nombre),'$ '+(hit.usd).toFixed(2)+' · abriendo WhatsApp con el mensaje listo…',''); setTimeout(function(){ _cxbWA(hit.cod); },400); return; }
        out.innerHTML=card('Cobranzas','No encontré a “'+esc(objetivo)+'”','Revisa el nombre en el módulo Cobranzas.',''); return;
      }
      var f2=function(n){return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});};
      var totDue=due.reduce(function(a,c){return a+c.usd;},0);
      var filas=due.slice(0,8).map(function(c){ return '<div style="display:flex;align-items:center;gap:8px;border-top:1px solid rgba(16,24,40,.06);padding:7px 0;font-size:12.5px"><div style="flex:1;min-width:0"><b>'+esc(c.nombre)+'</b><span style="color:var(--muted)"> · '+c.fs.length+' fact · peor '+c.peor+'d'+(c.promesa&&c.promesa<hoy?' · <span style=\'color:var(--red);font-weight:700\'>PROMESA ROTA</span>':'')+'</span></div><b style="white-space:nowrap">$ '+f2(c.usd)+'</b>'+(c.tel?('<button class="btn btn-green btn-sm" style="padding:3px 10px;font-size:11px" onclick="_cxbWA(\''+c.cod+'\')">📲 Enviar cobro</button>'):'<span style="font-size:10px;color:var(--muted)">sin tel</span>')+'</div>'; }).join('');
      out.innerHTML=card('Cobrar hoy · Droguería', due.length+' cliente(s) · $ '+f2(totDue), (filas||'Nadie pendiente hoy 🎉')+'<div style="margin-top:8px;font-size:11px;color:var(--muted)">Tip: dime “envíale el cobro a [cliente]” y te abro el WhatsApp con el mensaje listo. El detalle completo está en el módulo Cobranzas.</div>','#b45309');
    });
    return;
  }
  // ── vencimientos
  if(/vence|vencimiento|caduc/.test(q)){
    supabaseClient.from('lotes_vencimiento').select('descripcion,cantidad,fecha_venc').then(function(rr){
      var lo=(rr&&rr.data)||[]; var mes=r.b.slice(0,7); var u=0,n=0,top=[];
      lo.forEach(function(l){ var fv=(''+(l.fecha_venc||'')).slice(0,7); if(fv&&fv<=mes){ var c=_pgN(l.cantidad); u+=c; n++; top.push({d:l.descripcion,c:c}); } });
      top.sort(function(a,b){return b.c-a.c;});
      out.innerHTML=card('Se vence hasta '+mes, n+' producto(s)', u.toLocaleString('es-VE')+' unidades en riesgo'+(top.length?('<br>Mayores: '+top.slice(0,4).map(function(x){return esc((x.d||'').slice(0,34))+' ('+x.c+')';}).join(' · ')):''), u>0?'#B54708':'#079455');
    }); return;
  }
  // ── reto
  if(/reto|meta|concurso/.test(q)){
    try{ var rt=_reto(); var mes=(typeof _retoMesHoy==='function')?_retoMesHoy():'';
      var mm=(rt.meds||[]).filter(function(m){ return (m.vence||'')===mes && !m.retirado && m.impulsable!==false; });
      var meta=0,sold=0; mm.forEach(function(m){ meta+=Number(m.meta)||0; sold+=(typeof _retoMedSold==='function')?_retoMedSold(rt,m.id):0; });
      var pct=meta>0?Math.round(sold/meta*100):0;
      out.innerHTML=card('Reto de '+((typeof _retoMesLabel==='function')?_retoMesLabel(mes):mes), meta>0?(pct+'%'):'sin datos', meta>0?(sold+' de '+meta+' unidades · '+mm.length+' productos'):'No hay productos en el reto de este mes.', pct>=75?'#079455':'#B54708');
    }catch(e){ out.innerHTML=card('Reto','—','No se pudo leer el reto.',''); } return;
  }
  // ── períodos de varios días: usar el consolidado diario (cada día a su tasa) para sumar dólares reales
  if(r.a!==r.b && !/firma|descuadre|falta|sobra|cuadr|qui[eé]n|cajero|trabaj/.test(q)){
    supabaseClient.from('ventas_diarias').select('*').gte('fecha',r.a).lte('fecha',r.b).eq('empresa','farmacia').order('fecha').then(function(rv){
      var vd=(rv&&rv.data)||[];
      if(!vd.length){ out.innerHTML=card('Sin datos','—','No hay ventas consolidadas para '+r.lbl+'.',''); return; }
      var usd=0,bs=0,ef=0,dg=0,dv=0,mejor=null;
      vd.forEach(function(x){ var u=_pgN(x.total_usd); usd+=u; bs+=_pgN(x.total_bs); ef+=_pgN(x.efectivo_bs); dg+=_pgN(x.digital_bs); dv+=_pgN(x.divisas_usd); if(!mejor||u>_pgN(mejor.total_usd))mejor=x; });
      var prom=usd/vd.length;
      if(/d[oó]lar|divisa|zelle/.test(q)){ out.innerHTML=card('Divisas '+r.lbl,'$ '+_pgF(dv), 'recibidas en efectivo y Zelle · '+vd.length+' día(s)',''); return; }
      if(/efectivo/.test(q)){ out.innerHTML=card('Efectivo '+r.lbl,'Bs '+_pgF(ef), (bs>0?Math.round(ef/bs*100):0)+'% de la venta · '+vd.length+' día(s)',''); return; }
      if(/tarjeta|punto|d[eé]bito|cr[eé]dito|digital|transferencia|pago m[oó]vil/.test(q)){ out.innerHTML=card('Digital '+r.lbl,'Bs '+_pgF(dg), (bs>0?Math.round(dg/bs*100):0)+'% de la venta · '+vd.length+' día(s)',''); return; }
      out.innerHTML=card('Ventas '+r.lbl,'$ '+_pgF(usd),
        'Equivale a Bs '+_pgF(bs)+' (cada día convertido a su tasa)<br>'+
        vd.length+' día(s) con ventas · promedio $'+_pgF(prom)+'/día'+
        (mejor?('<br>Mejor día: '+mejor.fecha+' · $'+_pgF(mejor.total_usd)):'')+
        '<br><span style="color:var(--muted)">Efectivo Bs '+_pgF(ef)+' · Digital Bs '+_pgF(dg)+' · Divisas $'+_pgF(dv)+'</span>','');
    }).catch(function(){ out.innerHTML=card('Error','—','No se pudo consultar el consolidado.',''); });
    return;
  }
  // ── cierres de caja (ventas, efectivo, dólares, descuadres, firmas, quién trabajó)
  supabaseClient.from('cierres_caja').select('*').gte('fecha',r.a).lte('fecha',r.b).eq('empresa','farmacia').then(function(rr){
    var cs=(rr&&rr.data)||[];
    if(!cs.length){ out.innerHTML=card('Sin datos','—','No hay cierres registrados para '+r.lbl+'.',''); return; }
    var ids=cs.map(function(c){return c.id;});
    supabaseClient.from('cierre_firmas').select('cierre_id,linea_id').in('cierre_id',ids).then(function(rf){
      var fm={}; ((rf&&rf.data)||[]).forEach(function(x){ fm[x.cierre_id+'|'+x.linea_id]=1; });
      var tot=0,ef=0,dol=0,zel=0,tr=0,de=0,cr=0,pend=0,desc=[],porCajero={};
      cs.forEach(function(c){
        var d=c.data||{}, tasa=_pgN(d.tasa);
        var e1=(d.efectivobs||[]).reduce(function(a,x){return a+_pgN(x.monto);},0);
        var d1=(d.dolares||[]).reduce(function(a,x){return a+_pgN(x.monto);},0);
        var z1=(d.zelle||[]).reduce(function(a,x){return a+_pgN(x.monto);},0);
        var t1=(d.transfer||[]).reduce(function(a,x){return a+_pgN(x.monto);},0);
        var de1=(d.debito||[]).reduce(function(a,x){return a+_pgN(x.monto);},0);
        var cr1=(d.credito||[]).reduce(function(a,x){return a+_pgN(x.monto);},0);
        var t=e1+d1*tasa+z1*tasa+t1+de1+cr1;
        tot+=t; ef+=e1; dol+=d1; zel+=z1; tr+=t1; de+=de1; cr+=cr1;
        var k=(c.cajero||'—'); porCajero[k]=(porCajero[k]||0)+t;
        ['zelle','transfer','dolares'].forEach(function(kk){ (d[kk]||[]).forEach(function(x){ if(x.solic && !fm[c.id+'|'+x.id]) pend++; }); });
        var cont=0; [5,10,20,50,100,200,500].forEach(function(dn){ cont+=dn*_pgN((d.efectivo||{})[dn]); });
        if(cont>0){ var dif=cont-(_pgN(d.fondo_bs)+e1); if(Math.abs(dif)>=1) desc.push({c:c.caja,q:c.cajero,dif:dif}); }
      });
      if(/firma/.test(q)){ out.innerHTML=card('Firmas pendientes', pend, pend?('en '+r.lbl+' — revisa Cierre de Caja'):'Todo firmado en '+r.lbl+'.', pend?'#B42318':'#079455'); return; }
      if(/descuadre|falta|sobra|cuadr/.test(q)){
        out.innerHTML=card('Descuadres '+r.lbl, desc.length, desc.length?desc.map(function(x){return esc(x.q||'')+' ('+esc(x.c||'')+'): '+(x.dif>0?'+':'')+_pgF(x.dif)+' Bs';}).join('<br>'):'Todas las cajas cuadraron.', desc.length?'#B42318':'#079455'); return;
      }
      if(/qui[eé]n|cajero|trabaj/.test(q)){
        var ks=Object.keys(porCajero).sort(function(a,b){return porCajero[b]-porCajero[a];});
        out.innerHTML=card('Cajeros '+r.lbl, ks.length, ks.map(function(k){return esc(k)+': Bs '+_pgF(porCajero[k]);}).join('<br>'),''); return;
      }
      if(/efectivo/.test(q)){ out.innerHTML=card('Efectivo '+r.lbl,'Bs '+_pgF(ef), (tot>0?Math.round(ef/tot*100):0)+'% del total · '+cs.length+' cierre(s)',''); return; }
      if(/d[oó]lar|divisa|zelle/.test(q)){ out.innerHTML=card('Divisas '+r.lbl,'$ '+_pgF(dol+zel), '$'+_pgF(dol)+' en efectivo · $'+_pgF(zel)+' por Zelle',''); return; }
      if(/tarjeta|punto|d[eé]bito|cr[eé]dito|digital|transferencia|pago m[oó]vil/.test(q)){ out.innerHTML=card('Digital '+r.lbl,'Bs '+_pgF(tr+de+cr), 'Pago móvil Bs '+_pgF(tr)+' · Débito Bs '+_pgF(de)+' · Crédito Bs '+_pgF(cr),''); return; }
      var _ta=0; cs.forEach(function(c){ var t2=_pgN((c.data||{}).tasa); if(t2>_ta)_ta=t2; });
      out.innerHTML=card('Ventas '+r.lbl,(_ta>0?('$ '+_pgF(tot/_ta)):('Bs '+_pgF(tot))), (_ta>0?('Equivale a Bs '+_pgF(tot)+' · tasa '+_pgF(_ta)+'<br>'):'')+'Efectivo Bs '+_pgF(ef)+' · Digital Bs '+_pgF(tr+de+cr)+' · Divisas $'+_pgF(dol+zel)+'<br>'+cs.length+' cierre(s)'+(pend?(' · <b style="color:#B42318">'+pend+' firma(s) pendiente(s)</b>'):'')+(desc.length?(' · <b style="color:#B42318">'+desc.length+' descuadre(s)</b>'):''),'');
    });
  });
}
function _anomBox(){ setTimeout(_anomCargar,120); return '<div id="ger-anom" style="margin-bottom:20px"></div>'; }
function _anomSetDias(d){ _anomDias=d; _anomCargar(); }
function _anomCargar(){
  var el=document.getElementById('ger-anom'); if(!el)return;
  el.innerHTML='<div style="padding:14px;color:var(--muted);font-size:13px">Analizando cierres…</div>';
  var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
  var d0=new Date(hoy+'T00:00:00'); d0.setDate(d0.getDate()-_anomDias);
  var desde=d0.toISOString().slice(0,10);
  supabaseClient.from('cierres_caja').select('*').gte('fecha',desde).lte('fecha',hoy).then(function(r){
    var cs=(r&&r.data)||[];
    supabaseClient.from('cierre_eventos').select('*').gte('fecha',desde).then(function(re){
      _anomPintar(cs, (re&&re.data)||[], desde, hoy);
    }).catch(function(){ _anomPintar(cs, [], desde, hoy); });
  }).catch(function(){ el.innerHTML='<div style="padding:14px;color:var(--red);font-size:13px">No se pudo cargar.</div>'; });
}
function _anomPintar(cs, evs, desde, hoy){
  var el=document.getElementById('ger-anom'); if(!el)return;
  var N=function(v){ v=parseFloat((''+(v==null?'':v)).replace(/[^0-9.\-]/g,'')); return isNaN(v)?0:v; };
  var F=function(n){ return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var P={};
  function per(c){ var k=(c||'—').trim(); if(!P[k])P[k]={n:0,desc:0,faltan:0,sobran:0,sinArqueo:0,dif:0,borr:0,reab:0,cajas:{}}; return P[k]; }
  cs.forEach(function(c){
    var p=per(c.cajero); p.n++; p.cajas[c.caja]=1;
    var d=c.data||{};
    var ef=0; [5,10,20,50,100,200,500].forEach(function(dn){ ef+=dn*N((d.efectivo||{})[dn]); });
    var vent=(d.efectivobs||[]).reduce(function(a,x){return a+N(x.monto);},0);
    if(ef<=0){ p.sinArqueo++; return; }
    var dif=ef-(N(d.fondo_bs)+vent);
    if(Math.abs(dif)>=1){ p.desc++; p.dif+=dif; if(dif<0)p.faltan++; else p.sobran++; }
  });
  evs.forEach(function(e){ var p=per(e.cajero); if(e.tipo==='borrado')p.borr++; if(e.tipo==='reapertura')p.reab++; if(e.tipo==='banco_corregido')p.bcoErr=(p.bcoErr||0)+1; if(e.tipo==='descuadre_diag')p.diag=(p.diag||0)+1; });
  var señales=[];
  Object.keys(P).forEach(function(k){
    var p=P[k]; if(p.n<1)return;
    var pctD=p.n?Math.round(p.desc/p.n*100):0;
    if(p.desc>=3 && pctD>=40) señales.push({sev:2,quien:k,t:'Descuadres recurrentes',d:p.desc+' de '+p.n+' cierres ('+pctD+'%) no cuadraron · neto '+(p.dif>0?'+':'')+F(p.dif)+' Bs'});
    else if(p.desc>=2) señales.push({sev:1,quien:k,t:'Descuadres repetidos',d:p.desc+' de '+p.n+' cierres · neto '+(p.dif>0?'+':'')+F(p.dif)+' Bs'});
    if(p.faltan>=3 && p.sobran===0) señales.push({sev:2,quien:k,t:'Siempre falta, nunca sobra',d:p.faltan+' cierres con faltante y ninguno con sobrante — patrón poco natural'});
    if(p.borr>=3) señales.push({sev:2,quien:k,t:'Borra pagos con frecuencia',d:p.borr+' pagos eliminados antes de ser firmados'});
    else if(p.borr>=1) señales.push({sev:1,quien:k,t:'Borró pagos sin firmar',d:p.borr+' pago(s) eliminado(s) antes de la firma'});
    if(p.sinArqueo>=3) señales.push({sev:1,quien:k,t:'Cierra sin contar efectivo',d:p.sinArqueo+' cierre(s) sin arqueo — no se puede verificar la gaveta'});
    if(p.reab>=2) señales.push({sev:1,quien:k,t:'Cajas reabiertas',d:p.reab+' reaperturas tras el cierre'});
    if((p.bcoErr||0)>=3) señales.push({sev:2,quien:k,t:'Se equivoca de banco seguido',d:(p.bcoErr)+' pagos móviles con banco corregido por el supervisor — reforzar entrenamiento'});
    else if((p.bcoErr||0)>=1) señales.push({sev:1,quien:k,t:'Banco corregido',d:(p.bcoErr)+' pago(s) móvil(es) donde el supervisor corrigió el banco'});
    if((p.diag||0)>=3) señales.push({sev:2,quien:k,t:'Descuadres diagnosticados repetidos',d:(p.diag)+' diagnósticos de descuadre guardados en el período'});
  });
  señales.sort(function(a,b){ return b.sev-a.sev; });
  var alta=señales.filter(function(x){return x.sev===2;}).length;
  var chip=function(dd){ return '<button onclick="_anomSetDias('+dd+')" style="border:1px solid '+(_anomDias===dd?'transparent':'#E7E9ED')+';background:'+(_anomDias===dd?'linear-gradient(180deg,#2B47C4,#1E38A6)':'linear-gradient(180deg,#fff,#FAFBFC)')+';color:'+(_anomDias===dd?'#fff':'#414651')+';border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:500;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.05)">'+dd+' días</button>'; };
  var head='<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:10px"><div style="font-size:15px;font-weight:600;letter-spacing:-.2px;color:var(--text)">Control interno</div>'+
    '<span style="font-size:11.5px;color:var(--muted)">'+cs.length+' cierres · '+Object.keys(P).length+' cajeros</span>'+
    '<span style="margin-left:auto;display:flex;gap:6px">'+chip(7)+chip(30)+chip(90)+'</span></div>';
  if(!señales.length){
    el.innerHTML=head+'<div style="background:linear-gradient(160deg,#fff,#F7FDF9);border:1px solid rgba(7,148,85,.2);border-radius:13px;padding:15px 16px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(16,24,40,.10),inset 0 1px 0 #fff;display:flex;align-items:center;gap:11px">'+
      '<div style="width:30px;height:30px;border-radius:9px;background:linear-gradient(145deg,#0AA55F,#079455);display:grid;place-items:center;flex:none;box-shadow:0 3px 10px rgba(7,148,85,.35)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
      '<div><div style="font-size:13.5px;font-weight:600;color:var(--text)">Sin señales de alerta</div><div style="font-size:11.5px;color:var(--muted);margin-top:1px">Ningún patrón inusual en los últimos '+_anomDias+' días.</div></div></div>';
    return;
  }
  var rows=señales.map(function(x){
    var col=x.sev===2?'#B42318':'#B54708';
    var bg=x.sev===2?'#FFFCFB':'#FFFDF9';
    return '<div style="display:flex;gap:11px;align-items:flex-start;padding:11px 13px;border-top:1px solid rgba(16,24,40,.06);background:'+bg+'">'+
      '<span style="background:linear-gradient(180deg,'+(x.sev===2?'#C9382C,#B42318':'#D97706,#B54708')+');color:#fff;font-size:9.5px;font-weight:600;letter-spacing:.3px;padding:4px 9px;border-radius:999px;white-space:nowrap;flex:none;margin-top:1px;box-shadow:0 2px 7px '+col+'55">'+(x.sev===2?'REVISAR':'ATENCIÓN')+'</span>'+
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text)">'+esc(x.quien)+' · '+x.t+'</div>'+
      '<div style="font-size:11.5px;color:var(--muted);margin-top:1px">'+esc(x.d)+'</div></div></div>';
  }).join('');
  el.innerHTML=head+'<div style="background:linear-gradient(160deg,#fff,#FCFCFD);border:1px solid rgba(180,35,24,.18);border-radius:13px;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 20px -8px rgba(180,35,24,.18),inset 0 1px 0 #fff">'+
    '<div style="padding:12px 13px;font-size:12px;color:var(--muted)"><b style="color:var(--text);font-size:13px">'+señales.length+' señal(es)</b>'+(alta?(' · <b style="color:#B42318">'+alta+' para revisar</b>'):'')+' — patrones detectados en los últimos '+_anomDias+' días. Son indicios, no acusaciones: conviene conversarlos.</div>'+
    rows+'</div>';
}
function _gerHoyBox(){ setTimeout(_gerHoyCargar,60); return '<div id="ger-hoy" style="margin-bottom:20px"><div style="padding:16px;color:var(--muted);font-size:13px">Cargando el pulso del día…</div></div>'; }
function _gerHoyCargar(){
  var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
  var out={cierres:[],firmas:[],lotes:[]};
  supabaseClient.from('cierres_caja').select('*').eq('fecha',hoy).eq('empresa','farmacia').then(function(r){
    out.cierres=(r&&r.data)||[];
    var ids=out.cierres.map(function(c){return c.id;});
    var next=function(){ supabaseClient.from('lotes_vencimiento').select('descripcion,cantidad,fecha_venc').then(function(rl){ out.lotes=(rl&&rl.data)||[]; supabaseClient.from('ventas_diarias').select('fecha,total_usd,total_bs').gte('fecha',hoy.slice(0,7)+'-01').lte('fecha',hoy).eq('empresa','farmacia').then(function(rv){ out.mes=(rv&&rv.data)||[]; _gerHoyPintar(out,hoy); }).catch(function(){ _gerHoyPintar(out,hoy); }); }).catch(function(){ _gerHoyPintar(out,hoy); }); };
    if(ids.length){ supabaseClient.from('cierre_firmas').select('cierre_id,linea_id').in('cierre_id',ids).then(function(rf){ out.firmas=(rf&&rf.data)||[]; next(); }).catch(next); } else next();
  }).catch(function(){ _gerHoyPintar(out,hoy); });
}
function _gerHoyPintar(o,hoy){
  var el=document.getElementById('ger-hoy'); if(!el)return;
  var N=function(v){ v=parseFloat((''+(v==null?'':v)).replace(/[^0-9.\-]/g,'')); return isNaN(v)?0:v; };
  var F=function(n){ return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var firmadas={}; (o.firmas||[]).forEach(function(f){ firmadas[f.cierre_id+'|'+f.linea_id]=1; });
  var totVenta=0, totEf=0, totDig=0, totUsd=0, pend=0, abiertas=0, cerradas=0, porConf=0, descuadres=[];
  (o.cierres||[]).forEach(function(c){
    var d=c.data||{}; var tasa=N(d.tasa);
    var ef=(d.efectivobs||[]).reduce(function(a,x){return a+N(x.monto);},0);
    var dol=(d.dolares||[]).reduce(function(a,x){return a+N(x.monto);},0);
    var zel=(d.zelle||[]).reduce(function(a,x){return a+N(x.monto);},0);
    var tr=(d.transfer||[]).reduce(function(a,x){return a+N(x.monto);},0);
    var de=(d.debito||[]).reduce(function(a,x){return a+N(x.monto);},0);
    var cr=(d.credito||[]).reduce(function(a,x){return a+N(x.monto);},0);
    totVenta+=ef+dol*tasa+zel*tasa+tr+de+cr; totEf+=ef; totDig+=tr+de+cr+zel*tasa; totUsd+=dol+zel;
    ['zelle','transfer','dolares'].forEach(function(k){ (d[k]||[]).forEach(function(x){ if(N(x.monto)>0 && x.solic && !firmadas[c.id+'|'+x.id]) pend++; }); });
    var st=c.estado||'abierto'; if(st==='cerrado')cerradas++; else if(st==='por_confirmar')porConf++; else abiertas++;
    var cont=0,DEN=[5,10,20,50,100,200,500]; DEN.forEach(function(dn){ cont+=dn*N((d.efectivo||{})[dn]); });
    if(cont>0){ var dif=cont-(N(d.fondo_bs)+ef); if(Math.abs(dif)>=0.5) descuadres.push({caja:c.caja,cajero:c.cajero,dif:dif}); }
  });
  var mes=hoy.slice(0,7), riesgo=0, prods=0;
  (o.lotes||[]).forEach(function(l){ var fv=(''+(l.fecha_venc||'')).slice(0,7); if(fv&&fv<=mes){ prods++; riesgo+=N(l.cantidad); } });
  var rt=null; try{ if(typeof _reto==='function'){ var r=_reto(); var mm=(r.meds||[]).filter(function(m){ return (m.vence||'')===mes && !m.retirado && m.impulsable!==false; }); var meta=0,sold=0; mm.forEach(function(m){ meta+=Number(m.meta)||0; sold+=(typeof _retoMedSold==='function')?_retoMedSold(r,m.id):0; }); rt={meta:meta,sold:sold,pct:meta>0?Math.round(sold/meta*100):0,n:mm.length}; } }catch(e){}
  function card(t,v,s,g){ return '<div style="flex:1;min-width:150px;border-radius:16px;padding:14px 16px;color:#fff;background:'+g+'"><div style="font-size:11px;opacity:.9;font-weight:700;letter-spacing:.4px">'+t+'</div><div style="font-size:24px;font-weight:900;line-height:1.15;margin-top:2px">'+v+'</div><div style="font-size:11px;opacity:.9">'+s+'</div></div>'; }
  var alertas='';
  if(pend>0) alertas+='<div style="background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:12px;padding:10px 13px;font-weight:700;font-size:13px;margin-bottom:8px">🔔 '+pend+' pago(s) esperan firma del supervisor</div>';
  if(descuadres.length) alertas+='<div style="background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;border-radius:12px;padding:10px 13px;font-size:13px;margin-bottom:8px"><b>⚠ '+descuadres.length+' caja(s) con descuadre:</b> '+descuadres.map(function(x){return esc(x.caja||'')+' '+(x.dif>0?'+':'')+F(x.dif);}).join(' · ')+'</div>';
  if(porConf>0) alertas+='<div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:12px;padding:10px 13px;font-size:13px;margin-bottom:8px">🔒 '+porConf+' caja(s) esperando tu visto bueno para cerrar</div>';
  if(!alertas) alertas='<div style="background:#f0fdf4;border:1px solid #86efac;color:#166534;border-radius:12px;padding:10px 13px;font-weight:700;font-size:13px;margin-bottom:8px">✓ Todo en orden — sin firmas pendientes ni descuadres</div>';
  el.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="font-weight:800;font-size:16px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M3 3v18h18"/><path d="M7 15l3.5-4 3 3L20 7"/></svg>Pulso de hoy</div><span style="font-size:11px;color:var(--muted)">'+hoy+' · farmacia</span><button class="btn btn-green btn-sm" style="margin-left:auto" onclick="_gerWA()">📲 WhatsApp</button><button class="btn btn-ghost btn-sm" onclick="_gerHoyCargar()">↻</button></div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'+
      card('VENTA DEL DÍA','Bs '+F(totVenta),(o.cierres.length)+' caja(s) · '+abiertas+' abiertas','linear-gradient(135deg,#1E38A6,#2f52d0)')+
      card('EFECTIVO Bs','Bs '+F(totEf),'recibido en caja','linear-gradient(135deg,#16a34a,#84cc16)')+
      card('DIGITAL','Bs '+F(totDig),'tarjetas, pago móvil, Zelle','linear-gradient(135deg,#7c3aed,#a855f7)')+
      card('DÓLARES','$ '+F(totUsd),'efectivo + Zelle','linear-gradient(135deg,#0891b2,#06b6d4)')+(function(){ var vd=o.mes||[]; if(!vd.length)return ''; var u=0; vd.forEach(function(x){ u+=N(x.total_usd); }); return card('MES EN DÓLARES','$ '+F(u), vd.length+' día(s) · $'+F(u/vd.length)+'/día promedio','linear-gradient(135deg,#0F766E,#059669)'); })()+
    '</div>'+alertas+
    '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
      '<div style="flex:1;min-width:220px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:13px"><div style="font-weight:800;font-size:13px;margin-bottom:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z"/></svg>Reto de '+((typeof _retoMesLabel==='function')?_retoMesLabel(mes):mes)+'</div>'+(rt&&rt.meta>0?('<div style="font-size:21px;font-weight:900;color:'+(rt.pct>=75?'var(--green)':'var(--amber,#d97706)')+'">'+rt.pct+'%</div><div style="font-size:12px;color:var(--muted)">'+rt.sold+' de '+rt.meta+' u · '+rt.n+' productos</div><div style="height:7px;background:var(--surface2);border-radius:99px;margin-top:7px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,rt.pct)+'%;background:'+(rt.pct>=75?'#16a34a':'#d97706')+'"></div></div>'):'<div style="font-size:12px;color:var(--muted)">Sin productos en el reto de este mes.</div>')+'</div>'+
      '<div style="flex:1;min-width:220px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:13px"><div style="font-weight:800;font-size:13px;margin-bottom:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Vencimientos</div><div style="font-size:21px;font-weight:900;color:'+(riesgo>0?'var(--red)':'var(--green)')+'">'+F(riesgo).replace(',00','')+' u</div><div style="font-size:12px;color:var(--muted)">en riesgo · '+prods+' producto(s) vencen este mes o antes</div></div>'+
    '</div>';
}
function renderGerencia() {
  const el = document.getElementById('gerencia-content');
  if (!el) return;
  if (typeof currentRole!=='undefined' && currentRole==='gerente'){ el.innerHTML=_gerenteDispHTML(); return; }
  el.innerHTML = `
    <div style="margin-bottom:16px"><div style="font-size:18px;font-weight:600;letter-spacing:-.3px;color:var(--text)">Gerencia</div>
    <div style="font-size:12px;color:var(--muted);margin-top:2px">Pulso del día, control interno y consultas</div></div>
    ${_pgBox()}
        ${_bzBox()}
    ${_gerHoyBox()}
    ${_anomBox()}
  `;
}

// ══════════════════════════════════════════════════════════════
// ADMIN PANEL
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// PERMISOS POR ROL (configurable desde el Panel de Admin)
// ══════════════════════════════════════════════════════════════
// ── Nómina & Costo laboral ───────────────────────────────────────────────
var _nomEmp=[];


// ── COMPRAS INTELIGENTES (ABC-XYZ + min/max + pedido) ──
var _ciProd=[]; var _ciParams={nivel_servicio_z:1.65,cobertura_objetivo_dias:30,meses_historia:11,lead_time_default:4}; var _ciLoaded=false;
var _ciFiltro={accion:'COMPRAR YA',abc:'',xyz:'',q:''}; var _ciVista='falta';
var _ciPedido={}; try{_ciPedido=JSON.parse(localStorage.getItem('fc_pedido_'+((typeof EMPRESA!=='undefined'?EMPRESA:'')||''))||'{}');}catch(e){_ciPedido={};}
function _ciPedSave(){ try{localStorage.setItem('fc_pedido_'+((typeof EMPRESA!=='undefined'?EMPRESA:'')||''),JSON.stringify(_ciPedido));}catch(e){} }

function _gerWA(){
  if(typeof showToast==='function')showToast('Armando resumen…');
  supabaseClient.functions.invoke('resumen-diario',{body:{token:'resumen_9c4e7a1b3d',dry:true}}).then(function(r){
    var d=(r&&r.data)||{};
    if(!d.ok){ showToast&&showToast('No se pudo armar el resumen'); return; }
    var txt='*'+(d.title||'Resumen del día')+'*\n'+(d.body||'')+'\n_Farmacia Claret · '+(d.fecha||'')+'_';
    window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
  }).catch(function(){ showToast&&showToast('Error al armar el resumen'); });
}

function _pgVoz(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ showToast&&showToast('Este navegador no soporta voz (usa Chrome)'); return; }
  var inp=document.getElementById('pg-q'); if(inp){ inp.placeholder='🎤 Te escucho…'; }
  var rec=new SR(); rec.lang='es-VE'; rec.interimResults=true;
  rec.onresult=function(ev){ var t=''; for(var i=0;i<ev.results.length;i++)t+=ev.results[i][0].transcript; if(inp)inp.value=t; if(ev.results[ev.results.length-1].isFinal){ try{rec.stop();}catch(e){} _pgIr(t); if(inp)inp.placeholder='Pregúntale a Claret… ej. ¿cuánto vendimos ayer?'; } };
  rec.onerror=function(){ if(inp)inp.placeholder='Pregúntale a Claret… ej. ¿cuánto vendimos ayer?'; };
  try{ rec.start(); }catch(e){}
}

/* Bandeja del buzón anónimo (gerencia/admin) */
function _bzBox(){ setTimeout(_bzCargar,60); return '<div class="tbox" style="padding:14px;margin-bottom:16px"><div style="font-weight:800;font-size:15px;margin-bottom:6px">📮 Buzón anónimo de mejoras <span id="bz-count" style="font-size:11px;color:var(--muted)"></span></div><div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">Mensajes del QR del mostrador. Nadie sabe quién los escribió — ni nosotros.</div><div id="bz-lista" style="font-size:13px;color:var(--muted)">Cargando…</div></div>'; }
function _bzCargar(){
  supabaseClient.from('buzon_mejoras').select('*').order('id',{ascending:false}).limit(40).then(function(r){
    var el=document.getElementById('bz-lista'); if(!el)return;
    var rows=(r&&r.data)||[]; var nuevos=rows.filter(function(x){return !x.leido;}).length;
    var c=document.getElementById('bz-count'); if(c)c.textContent=rows.length?('· '+rows.length+' mensaje(s), '+nuevos+' nuevo(s)'):'';
    if(!rows.length){ el.innerHTML='Aún no hay mensajes. Imprime el QR y ponlo en el mostrador.'; return; }
    el.innerHTML=rows.map(function(m){ return '<div style="border-top:1px solid var(--border);padding:8px 2px;display:flex;gap:8px;align-items:flex-start'+(m.leido?';opacity:.55':'')+'"><span style="flex:none">'+(m.leido?'✅':'🆕')+'</span><div style="flex:1;color:var(--text)">'+esc(m.mensaje)+'<div style="font-size:10.5px;color:var(--muted);margin-top:2px">'+(''+(m.creado_en||'')).slice(0,16).replace('T',' ')+'</div></div>'+(!m.leido?('<button class="btn btn-ghost btn-sm" style="font-size:10.5px;padding:3px 8px" onclick="_bzLeido('+m.id+')">✓ Leído</button>'):'')+'</div>'; }).join('');
  });
}
function _bzLeido(id){ supabaseClient.from('buzon_mejoras').update({leido:true}).eq('id',id).then(function(){ _bzCargar(); }); }
