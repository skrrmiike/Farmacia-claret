var RETO_EMOJIS=['🦊','🐯','🦁','🐼','🐨','🦄','🐸','🐵','🐧','🐙','🦋','🐝','🐳','🦅','🐲','🦖'];
var RETO_COMPLEJIDAD=[
  {k:'facil',  lbl:'Fácil',   pts:10, color:'#22c55e', emoji:'🟢'},
  {k:'media',  lbl:'Media',   pts:25, color:'#f59e0b', emoji:'🟡'},
  {k:'dificil',lbl:'Difícil', pts:50, color:'#ef4444', emoji:'🔴'}
];
function _retoUID(){ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function _retoDefault(){ return {titulo:'Reto de Ventas', activo:false, premio_colectivo:'Pizzas de almuerzo 🍕', premio_individual:'Por confirmar', fecha_fin:'', vendedores:[], meds:[], ventas:{}, meta_dia:0, nivel_base:500, sorpresa:null, bonus:{}, log_dia:{}, periodo_activo:'', premios_mes:{}, premios_nivel:{}, mermas:[], colectivo_on:true}; }
function _reto(){ if(!db.reto||typeof db.reto!=='object'||Array.isArray(db.reto)) db.reto=_retoDefault(); var r=db.reto; if(!Array.isArray(r.vendedores))r.vendedores=[]; if(!Array.isArray(r.meds))r.meds=[]; if(!r.ventas||typeof r.ventas!=='object')r.ventas={}; if(r.premio_colectivo==null)r.premio_colectivo=(r.premio||'Pizzas de almuerzo 🍕'); if(r.premio_individual==null)r.premio_individual='Por confirmar'; if(r.meta_dia==null)r.meta_dia=0; if(r.nivel_base==null||!(Number(r.nivel_base)>0))r.nivel_base=500; if(!r.log_dia||typeof r.log_dia!=='object')r.log_dia={}; if(!r.bonus||typeof r.bonus!=='object')r.bonus={}; if(!r.premios_mes||typeof r.premios_mes!=='object')r.premios_mes={}; if(!r.premios_nivel||typeof r.premios_nivel!=='object')r.premios_nivel={}; if(!Array.isArray(r.mermas))r.mermas=[]; if(r.periodo_activo==null)r.periodo_activo=''; if(r.colectivo_on==null)r.colectivo_on=true; return r; }
var _retoNetTimer=null;
function _retoFlushSave(){ if(_retoNetTimer){ clearTimeout(_retoNetTimer); _retoNetTimer=null; } saveDB(db); }
function _retoSave(now){ var r=_reto(); r._v=Math.max(Date.now(),(Number(r._v)||0)+1); try{_persistLocal(db);}catch(e){} try{localStorage.setItem('fc_dirty','1');}catch(e){} if(!window._retoFlushHook){ window._retoFlushHook=true; try{ window.addEventListener('beforeunload',function(){ if(_retoNetTimer)_retoFlushSave(); }); window.addEventListener('pagehide',function(){ if(_retoNetTimer)_retoFlushSave(); }); document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'&&_retoNetTimer)_retoFlushSave(); }); }catch(e){} } if(now===true){ _retoFlushSave(); return; } if(_retoNetTimer)clearTimeout(_retoNetTimer); _retoNetTimer=setTimeout(_retoFlushSave,500); }
function _retoSync(cb){ try{ supabaseClient.from('app_sections').select('data').eq('section_name','reto').maybeSingle().then(function(res){ var rr=res&&res.data&&res.data.data; var ch=false; if(rr){ var rv=Number(rr._v)||0, lv=(db.reto&&Number(db.reto._v))||0; if(rv>lv){ db.reto=rr; try{_persistLocal(db);}catch(e){} ch=true; } } if(cb)cb(ch); }).catch(function(){ if(cb)cb(false); }); }catch(e){ if(cb)cb(false); } }
function _retoPuedeEditar(){ return (typeof currentRole!=='undefined' && ['supervisor','reto','mayra','gerente','admin'].indexOf(currentRole)>=0); }
function _retoFinMesDias(){ var ve=new Date(Date.now()-4*3600*1000); var y=ve.getUTCFullYear(), mo=ve.getUTCMonth(); var lastDay=new Date(Date.UTC(y,mo+1,0)).getUTCDate(); var day=ve.getUTCDate(); return {diasRest:Math.max(0,lastDay-day), lastDay:lastDay, day:day, mes:ve.toISOString().slice(0,7)}; }
function _retoCountdown(r){ var dd=_retoFinMesDias().diasRest; var st='font-weight:700;font-size:11px;padding:3px 10px;border-radius:999px'; if(dd>1)return '<span style="background:#fef3c7;color:#92400e;'+st+'">⏳ Cierra el mes en '+dd+' días</span>'; if(dd===1)return '<span style="background:#fee2e2;color:#b91c1c;'+st+'">⏳ ¡Mañana cierra el mes!</span>'; return '<span style="background:#fee2e2;color:#b91c1c;'+st+'">⏳ ¡Último día del mes!</span>'; }
function _retoCompColor(p){ p=Number(p)||0; if(p>=40)return '#ef4444'; if(p>=20)return '#f59e0b'; return '#22c55e'; }
function _retoImpulsable(m){ return !m || m.impulsable!==false; }
function _retoMedSold(reto,medId){ var t=0, v=reto.ventas||{}; (reto.vendedores||[]).forEach(function(vd){ t+=Number((v[vd.id]||{})[medId])||0; }); return t; }
function _retoColectivo(reto){ var modo=(reto&&reto.meta_colectiva_modo)||'auto';
  if(modo==='porcentaje'){ var pct=Number(reto.meta_colectiva)||75; if(pct<=0)pct=75; var _meds=reto.meds||[], _tot=0, _sold=0; _meds.forEach(function(m){ if(!_retoImpulsable(m)) return; var mt=Number(m.meta)||0; if(mt>0){ _tot+=mt; _sold+=Math.min(_retoMedSold(reto,m.id),mt); } }); var _meta=Math.round(_tot*pct/100); return {meta:_meta, vendido:_sold, pct:(_meta>0?Math.round(_sold/_meta*100):0), modo:'porcentaje', pctObjetivo:pct, total:_tot}; }
  if(modo==='unidades'||modo==='puntos'){ var meta=Number(reto.meta_colectiva)||0; var sold=0; if(modo==='unidades'){ (reto.meds||[]).forEach(function(m){ if(!_retoImpulsable(m)) return; sold+=_retoMedSold(reto,m.id); }); } else { var _v=reto.ventas||{}; (reto.meds||[]).forEach(function(m){ if(!_retoImpulsable(m)) return; (reto.vendedores||[]).forEach(function(vd){ sold+=(Number((_v[vd.id]||{})[m.id])||0)*(Number(m.puntos)||0); }); }); } var v=(meta>0?Math.min(sold,meta):sold); return {meta:meta, vendido:v, pct:(meta>0?Math.round(v/meta*100):0), modo:modo}; } var meds=reto.meds||[], totMeta=0, totSold=0; meds.forEach(function(m){ if(!_retoImpulsable(m)) return; var meta=Number(m.meta)||0; if(meta>0){ totMeta+=meta; totSold+=Math.min(_retoMedSold(reto,m.id),meta); } }); return {meta:totMeta, vendido:totSold, pct:(totMeta>0?Math.round(totSold/totMeta*100):0), modo:'auto'}; }
function _retoLeaderboard(reto){
  if(!reto||!Array.isArray(reto.vendedores)) return [];
  var meds=reto.meds||[], ventas=reto.ventas||{};
  return reto.vendedores.map(function(v){
    var vv=ventas[v.id]||{}, pts=0, un=0;
    meds.forEach(function(m){ var u=Number(vv[m.id])||0; un+=u; pts+=u*(Number(m.puntos)||0); });
    pts += Number((reto.bonus||{})[v.id])||0; var eq=Math.max(1,Number(v.equipo)||1); return {id:v.id, nombre:v.nombre, emoji:v.emoji||'🧑', equipo:eq, puntosTotal:pts, puntos:Math.round(pts/eq), unidades:Math.round(un/eq), unidadesTotal:un};
  }).sort(function(a,b){ return (b.puntos-a.puntos)||(b.unidades-a.unidades); });
}
function _retoRacha(reto,vid){ var log=reto.log_dia||{}; var base=new Date(((typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10))+'T00:00:00'); var start=0; var hk=base.toISOString().slice(0,10); if(!((log[hk]&&Number(log[hk][vid]))>0)) start=1; var n=0; for(var k=start;k<120;k++){ var d=new Date(base.getFullYear(),base.getMonth(),base.getDate()-k); var ds=d.toISOString().slice(0,10); var p=(log[ds]&&Number(log[ds][vid]))||0; if(p>0)n++; else break; } return n; }
function _retoPtsHoy(reto){ var hk=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); var o=(reto.log_dia||{})[hk]||{}; var t=0; for(var k in o)t+=Number(o[k])||0; return t; }
function _retoJugadorDia(reto){ var hk=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); var o=(reto.log_dia||{})[hk]||{}; var best=null,bp=0; (reto.vendedores||[]).forEach(function(v){ var p=(Number(o[v.id])||0)/Math.max(1,Number(v.equipo)||1); if(p>bp){bp=p;best=v;} }); return bp>0?{v:best,pts:Math.round(bp)}:null; }
function _retoNivel(pts){ pts=Number(pts)||0; var base=500; try{ var b=Number(_reto().nivel_base); if(b>0)base=b; }catch(e){} var lv=1, acc=0; while(pts >= acc + base*lv && lv<999){ acc+=base*lv; lv++; } var need=base*lv; var enNivel=pts-acc; return {lv:lv, pct:Math.round(enNivel/need*100), falta:Math.round(need-enNivel), need:need}; }
function _retoMedallas(reto,vid,lb){ var b=[]; if(lb[0]&&lb[0].id===vid&&lb[0].puntos>0)b.push('👑'); var meds=reto.meds||[], ventas=reto.ventas||{}, rey=0; meds.forEach(function(m){ var top=null,tu=0; (reto.vendedores||[]).forEach(function(v){ var u=(Number((ventas[v.id]||{})[m.id])||0)/Math.max(1,Number(v.equipo)||1); if(u>tu){tu=u;top=v.id;} }); if(top===vid&&tu>0)rey++; }); if(rey>0)b.push('🎯'+(rey>1?rey:'')); var rc=_retoRacha(reto,vid); if(rc>=2)b.push('🔥'+rc); var jd=_retoJugadorDia(reto); if(jd&&jd.v&&jd.v.id===vid)b.push('⭐'); return b; }
function _retoSorpresaHoy(reto){ var s=reto&&reto.sorpresa; if(!s||!s.medId)return null; var hk=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); if(s.fecha!==hk)return null; var m=((reto.meds)||[]).filter(function(x){return x.id===s.medId;})[0]; if(!m)return null; return {med:m, mult:Number(s.mult)||2}; }
function retoSortearSorpresa(){ if(!_retoPuedeEditar())return; var r=_reto(); var _mh=(typeof _retoMesHoy==='function')?_retoMesHoy():new Date().toISOString().slice(0,7); var meds=(r.meds||[]).filter(function(m){ return !m.retirado && m.impulsable!==false && (!m.vence || m.vence>=_mh) && ((Number(m.meta)||0)-_retoMedSold(r,m.id))>0; }); if(!meds.length){ showToast&&showToast('No hay productos activos para sortear (todos vendidos, retirados o vencidos)'); return; } var m=meds[Math.floor(Math.random()*meds.length)]; var hk=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); r.sorpresa={fecha:hk, medId:m.id, mult:2}; _retoSave(); renderReto(); showToast&&showToast('🎁 Sorpresa de hoy: '+m.nombre+' vale DOBLE'); }
function retoSorpresaMed(medId){ if(!_retoPuedeEditar())return; var r=_reto(); var m=(r.meds||[]).filter(function(x){return x.id===medId;})[0]; if(!m)return; var hk=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); r.sorpresa={fecha:hk, medId:medId, mult:2}; _retoSave(); renderReto(); showToast&&showToast('🎁 Sorpresa de hoy: '+m.nombre+' vale DOBLE'); }
function retoQuitarSorpresa(){ if(!_retoPuedeEditar())return; var r=_reto(); r.sorpresa=null; _retoSave(); renderReto(); }
function _retoURL(){ return location.origin + location.pathname + '#reto'; }

/* ---------- ranking compartido (supervisor + público) ---------- */
function _retoRankingHTML(reto, dark){
  var lb=_retoLeaderboard(reto);
  var txt=dark?'#fff':'var(--text)', mut=dark?'rgba(255,255,255,.6)':'var(--muted)', card=dark?'rgba(255,255,255,.08)':'var(--surface2)', bord=dark?'rgba(255,255,255,.14)':'var(--border)';
  if(!lb.length) return '<div style="text-align:center;color:'+mut+';padding:30px">Aún no hay participantes.</div>';
  var maxP=Math.max(1, lb[0].puntos);
  var top=lb.slice(0,3);
  var podOrder=[]; if(top[1])podOrder.push({p:top[1],r:2,h:74}); if(top[0])podOrder.push({p:top[0],r:1,h:100}); if(top[2])podOrder.push({p:top[2],r:3,h:54});
  var podColors={1:'linear-gradient(180deg,#fde047,#f59e0b)',2:'linear-gradient(180deg,#e5e7eb,#9ca3af)',3:'linear-gradient(180deg,#fdba74,#c2630f)'};
  var podMed={1:'🥇',2:'🥈',3:'🥉'};
  var podio='<div style="display:flex;justify-content:center;align-items:flex-end;gap:10px;margin:6px 0 18px">'+podOrder.map(function(o){
    return '<div style="text-align:center;width:90px"><div style="font-size:30px;line-height:1">'+o.p.emoji+'</div><div style="font-weight:700;font-size:12px;color:'+txt+';margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(o.p.nombre)+'</div><div style="font-size:11px;color:'+mut+'">'+o.p.puntos+' pts</div><div style="height:'+o.h+'px;border-radius:10px 10px 0 0;background:'+podColors[o.r]+';display:flex;align-items:flex-start;justify-content:center;padding-top:6px;font-size:20px;box-shadow:0 6px 14px rgba(0,0,0,.2)">'+podMed[o.r]+'</div></div>';
  }).join('')+'</div>';
  var lista=lb.map(function(p,i){
    var pct=Math.round(p.puntos/maxP*100); var falta=i>0?(lb[i-1].puntos-p.puntos):0; var _med=_retoMedallas(reto,p.id,lb); var _niv=_retoNivel(p.puntos);
    var rankBadge=i<3?podMed[i+1]:('<span style="display:inline-block;width:22px;text-align:center;font-weight:700;color:'+mut+'">'+(i+1)+'</span>');
    return '<div data-vid="'+p.id+'" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:'+card+';border:1px solid '+bord+';margin-bottom:7px;will-change:transform">'+
      '<div style="font-size:16px;width:24px;text-align:center">'+rankBadge+'</div>'+
      '<div style="font-size:22px">'+p.emoji+'</div>'+
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;color:'+txt+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.nombre)+(_med.length?' '+_med.map(function(bb){return '<span style="font-size:13px">'+bb+'</span>';}).join(''):'')+(p.equipo>1?' <span style="font-size:9px;background:rgba(124,58,237,.18);color:'+(dark?'#c4b5fd':'#6d28d9')+';padding:1px 6px;border-radius:999px;font-weight:700">\uD83D\uDC65'+p.equipo+' \u00b7 prom.</span>':'')+'</div>'+
      '<div style="height:7px;border-radius:4px;background:'+(dark?'rgba(255,255,255,.12)':'#e5e7eb')+';margin-top:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;border-radius:4px;background:linear-gradient(90deg,#6366f1,#22d3ee)"></div></div>'+(i>0?(falta>0?'<div style="font-size:9px;color:'+mut+';margin-top:3px">\u2191 a '+falta+' pts del #'+i+'</div>':'<div style="font-size:9px;color:#16a34a;font-weight:700;margin-top:3px">\u00a1empatados!</div>'):'')+'</div>'+
      '<div style="text-align:right"><div style="font-size:8px;font-weight:800;color:'+(dark?'#fbbf24':'#b45309')+'">NIVEL '+_niv.lv+'</div><div style="font-weight:800;font-size:15px;color:'+txt+'">'+p.puntos+'</div><div style="font-size:9px;color:'+mut+'">pts · '+p.unidades+' u</div></div>'+
    '</div>';
  }).join('');
  return podio+lista;
}

/* ---------- vista pública (#reto, sin login) ---------- */
function _retoConfetti(x,y){ try{ var cols=['#fbbf24','#ef4444','#22d3ee','#a78bfa','#34d399','#f472b6']; var host=document.getElementById('reto-pub')||document.body; for(var i=0;i<28;i++){ (function(idx){ var d=document.createElement('div'); var c=cols[idx%cols.length]; var ang=Math.random()*Math.PI*2, dist=40+Math.random()*130; var dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist-50; d.style.cssText='position:fixed;left:'+x+'px;top:'+y+'px;width:9px;height:9px;background:'+c+';border-radius:'+(Math.random()<.5?'50%':'2px')+';pointer-events:none;z-index:100001;transform:translate(0,0) rotate(0deg);transition:transform 1.05s cubic-bezier(.1,.6,.3,1),opacity 1.05s'; host.appendChild(d); requestAnimationFrame(function(){ requestAnimationFrame(function(){ d.style.transform='translate('+dx+'px,'+(dy+190)+'px) rotate('+(Math.random()*620-310)+'deg)'; d.style.opacity='0'; }); }); setTimeout(function(){ try{d.remove();}catch(e){} },1150); })(i); } }catch(e){} }
function _retoBeep(){ try{ var AC=window.AudioContext||window.webkitAudioContext; if(!AC)return; if(!window._retoAC)window._retoAC=new AC(); var ac=window._retoAC; if(ac.state==='suspended')ac.resume(); var o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.connect(g); g.connect(ac.destination); var t=ac.currentTime; o.frequency.setValueAtTime(523,t); o.frequency.exponentialRampToValueAtTime(1047,t+0.18); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.22,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+0.42); o.start(t); o.stop(t+0.44); }catch(e){} }
function _retoFanfare(){ try{ var AC=window.AudioContext||window.webkitAudioContext; if(!AC)return; if(!window._retoAC)window._retoAC=new AC(); var ac=window._retoAC; if(ac.state==='suspended')ac.resume(); var notes=[523,659,784,1047]; notes.forEach(function(f,i){ var o=ac.createOscillator(),g=ac.createGain(); o.type='triangle'; o.connect(g); g.connect(ac.destination); var t=ac.currentTime+i*0.12; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.25,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.3); o.start(t); o.stop(t+0.32); }); }catch(e){} }
function _retoBanner(txt){ try{ var host=document.getElementById('reto-pub')||document.body; var b=document.createElement('div'); b.innerHTML=txt; b.style.cssText='position:fixed;top:14px;left:50%;transform:translateX(-50%) translateY(-24px);background:linear-gradient(90deg,#f59e0b,#ef4444);color:#fff;font-weight:800;font-size:15px;padding:11px 20px;border-radius:999px;z-index:100002;box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;transition:all .4s;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis'; host.appendChild(b); requestAnimationFrame(function(){ requestAnimationFrame(function(){ b.style.opacity='1'; b.style.transform='translateX(-50%) translateY(0)'; }); }); setTimeout(function(){ b.style.opacity='0'; b.style.transform='translateX(-50%) translateY(-24px)'; setTimeout(function(){try{b.remove();}catch(e){}},420); },3400); }catch(e){} }
function _retoCaptureRects(){ var m={}; try{ var els=document.querySelectorAll('#reto-pub [data-vid]'); for(var i=0;i<els.length;i++){ m[els[i].getAttribute('data-vid')]=els[i].getBoundingClientRect().top; } }catch(e){} return m; }
function _retoFlip(before){ try{ var els=document.querySelectorAll('#reto-pub [data-vid]'); for(var i=0;i<els.length;i++){ (function(el){ var vid=el.getAttribute('data-vid'); var ot=before[vid]; if(ot==null)return; var nt=el.getBoundingClientRect().top; var dy=ot-nt; if(Math.abs(dy)>2){ el.style.transition='none'; el.style.transform='translateY('+dy+'px)'; requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.style.transition='transform .75s cubic-bezier(.2,.85,.25,1)'; el.style.transform=''; }); }); } })(els[i]); } }catch(e){} }
function _retoCelebrarCambios(reto){ try{ var lb=_retoLeaderboard(reto); var order=lb.map(function(x){return x.id;}); var prev=window._retoPrevOrder; var beeped=false; if(prev&&prev.length){ lb.forEach(function(p,i){ var pi=prev.indexOf(p.id); if(pi>i && pi>=0 && (p.puntos>0)){ var row=document.querySelector('#reto-pub [data-vid="'+p.id+'"]'); if(row){ var r=row.getBoundingClientRect(); setTimeout(function(){ _retoConfetti(r.left+r.width/2, r.top+r.height/2); }, 760); row.style.boxShadow='0 0 0 2px #fbbf24,0 0 26px rgba(251,191,36,.75)'; setTimeout(function(){try{row.style.boxShadow='';}catch(e){}},2200); } _retoBanner('🔥 ¡'+esc(p.nombre)+' subió al #'+(i+1)+'!'+(i===0?' 👑':'')); if(!beeped){ (i===0?_retoFanfare:_retoBeep)(); beeped=true; } } }); } window._retoPrevOrder=order; }catch(e){} }
function _retoPublico(){
  try{ var ov=document.getElementById('ov-login'); if(ov) ov.style.display='none'; }catch(e){}
  try{ document.body.style.background='#0b1220'; }catch(e){}
  try{ window._retoTVon=(localStorage.getItem('retoTV')==='1'); }catch(e){ window._retoTVon=false; }
  var host=document.getElementById('reto-pub');
  if(!host){ host=document.createElement('div'); host.id='reto-pub'; document.body.appendChild(host); }
  host.style.cssText='position:fixed;inset:0;z-index:99999;overflow:auto;background:linear-gradient(165deg,#0b1220 0%,#15235a 55%,#3b1d6e 100%);color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased';
  host.innerHTML='<div style="text-align:center;padding:60px 20px;opacity:.8">Cargando reto…</div>';
  function pintar(reto){ window._retoLastReto=reto; if(window._retoTVon){ _retoTVcss(); host.style.overflow='hidden'; host.innerHTML=_retoPublicoTV(reto); _retoTVtick(); requestAnimationFrame(_retoFitLB); try{_retoCelebrarCambios(reto);}catch(e){} try{_retoRollTV(reto);}catch(e){} } else { host.style.overflow='auto'; var _before=_retoCaptureRects(); host.innerHTML=_retoPublicoHTML(reto); _retoFlip(_before); _retoCelebrarCambios(reto); } _retoSyncTVbtn(); try{_retoTwParse();}catch(e){} }
  window._retoRepaint=function(){ try{ pintar(window._retoLastReto); }catch(e){} };
  async function cargar(){
    try{
      var res=await supabaseClient.from('app_sections').select('data').eq('section_name','reto').maybeSingle();
      var reto=(res && res.data)? res.data.data : null;
      pintar(reto);
    }catch(e){ host.innerHTML='<div style="text-align:center;padding:60px 20px">No se pudo cargar el reto.<br><button onclick="location.reload()" style="margin-top:14px;padding:8px 16px;border-radius:10px;border:0;background:#6366f1;color:#fff;font-weight:600">Reintentar</button></div>'; }
  }
  try{ if(!document.getElementById('reto-tvbtn')){ var _tvb=document.createElement('button'); _tvb.id='reto-tvbtn'; _tvb.style.cssText='position:fixed;top:12px;right:12px;z-index:100000;padding:9px 15px;border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;font:600 14px system-ui;cursor:pointer;backdrop-filter:blur(6px)'; _tvb.onclick=_retoToggleTV; document.body.appendChild(_tvb); } _retoSyncTVbtn(); }catch(e){}
  try{ if(!window._retoClk) window._retoClk=setInterval(function(){ if(window._retoTVon) _retoTVtick(); }, 1000); }catch(e){}
  try{ if(!window._retoSorpI) window._retoSorpI=setInterval(function(){ if(window._retoTVon){ _retoSorpresaShow(); try{_retoCelebShow();}catch(e){} } }, 600000); }catch(e){}
  try{ if(!window._retoRZ){ window._retoRZ=true; window.addEventListener('resize', function(){ if(window._retoTVon) _retoFitLB(); }); } }catch(e){}
  try{ _retoTwInit(); }catch(e){}
  if(window._retoTVon){ try{ _retoModoTV(); }catch(e){} }
  cargar(); try{ if(window._retoPoll) clearInterval(window._retoPoll); window._retoPoll=setInterval(cargar, 6000); }catch(e){}
}
async function _retoModoTV(){
  try{ var el=document.documentElement; if(el.requestFullscreen){ await el.requestFullscreen(); } else if(el.webkitRequestFullscreen){ el.webkitRequestFullscreen(); } }catch(e){}
  try{ if('wakeLock' in navigator){ window._retoWL=await navigator.wakeLock.request('screen'); if(!window._retoWLbound){ window._retoWLbound=true; document.addEventListener('visibilitychange', async function(){ try{ if(document.visibilityState==='visible' && 'wakeLock' in navigator){ window._retoWL=await navigator.wakeLock.request('screen'); } }catch(e){} }); } } }catch(e){}
}
function _retoToggleTV(){ window._retoTVon=!window._retoTVon; try{ localStorage.setItem('retoTV', window._retoTVon?'1':'0'); }catch(e){} if(window._retoTVon){ try{ _retoModoTV(); }catch(e){} try{ setTimeout(function(){ _retoSorpresaShow(); try{_retoCelebShow();}catch(e){} }, 12000); }catch(e){} } else { try{ if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); }catch(e){} } if(window._retoRepaint) window._retoRepaint(); }
function _retoSyncTVbtn(){ var b=document.getElementById('reto-tvbtn'); if(!b)return; if(window._retoTVon){ b.textContent='↩ Salir de Modo TV'; b.style.opacity='.4'; b.style.top='auto'; b.style.bottom='12px'; } else { b.textContent='📺 Modo TV'; b.style.opacity='1'; b.style.bottom='auto'; b.style.top='12px'; } }
function _retoTVtick(){ try{ var d=new Date(); var c=document.getElementById('rtv-clk'); if(c) c.textContent=d.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}); var t=document.getElementById('rtv-dte'); if(t) t.textContent=d.toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long'}); }catch(e){} }
function _retoFitLB(){ try{ var lb=document.getElementById('rtv-lb'); if(!lb)return; var rows=lb.children.length; if(!rows)return; var avail=lb.clientHeight, gap=8; var per=(avail-(rows-1)*gap)/rows; var rs=Math.max(.5,Math.min(1,per/64)); lb.style.setProperty('--rs', rs.toFixed(3)); }catch(e){} }
function _retoNivelInfo(pts,base){ pts=Number(pts)||0; base=Number(base)||500; var lv=1,acc=0; while(pts>=acc+base*lv&&lv<999){ acc+=base*lv; lv++; } var need=base*lv, into=pts-acc; return {lv:lv,into:into,need:need,falta:Math.max(0,need-into),pct:need>0?Math.round(into/need*100):0}; }
function _retoMedReyes(reto){ var meds=reto.meds||[], ventas=reto.ventas||{}; return meds.map(function(m){ var best=null,bu=0; (reto.vendedores||[]).forEach(function(v){ var u=Number((ventas[v.id]||{})[m.id])||0; if(u>bu){bu=u;best=v;} }); return {med:m,champ:best,u:bu}; }); }
function _retoReyCount(reto){ var map={}; _retoMedReyes(reto).forEach(function(x){ if(x.champ&&x.u>0){ map[x.champ.id]=(map[x.champ.id]||0)+1; } }); return map; }
function _retoMedTop(reto){ var meds=reto.meds||[], best=null,bu=0; meds.forEach(function(m){ var u=_retoMedSold(reto,m.id); if(u>bu){bu=u;best=m;} }); return best?{med:best,u:bu}:null; }
function _retoDiasFin(fin){ if(!fin)return null; try{ var h=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); var a=new Date(h+'T00:00:00'),b=new Date(fin+'T00:00:00'); return Math.max(0,Math.round((b-a)/86400000)); }catch(e){ return null; } }
function _retoFnum(n){ return (Number(n)||0).toLocaleString('es-VE'); }
function _retoCorto(n){ var p=String(n||'').trim().split(/\s+/); return p.length>1?(p[0]+' '+p[1].charAt(0)+'.'):(p[0]||''); }
/* ============ TV · cartelón del producto promocionado x2 (cada 15 min) ============ */
function _retoSorpCss(){ if(document.getElementById('reto-sorp-css'))return; var st=document.createElement('style'); st.id='reto-sorp-css'; st.textContent=
"#reto-sorp-ov{position:fixed;right:18px;bottom:18px;z-index:100050;opacity:1;transition:opacity .6s,transform .6s;animation:rspfade .5s ease}"+
"#reto-sorp-ov img.emoji{height:1em!important;width:1em!important;display:inline-block;vertical-align:-.12em;margin:0 .04em}"+
"#reto-celeb-ov img.emoji{height:1em!important;width:1em!important;display:inline-block;vertical-align:-.12em}"+
"@keyframes rspfade{from{opacity:0}to{opacity:1}}"+
"#reto-sorp-ov .rsp-card{position:relative;overflow:hidden;text-align:center;padding:12px 18px;border-radius:16px;width:min(22vw,290px);max-height:38vh;background:linear-gradient(135deg,#f59e0b,#ef4444);box-shadow:0 18px 50px rgba(0,0,0,.45),0 0 0 3px rgba(255,255,255,.15);animation:rsppop 1s cubic-bezier(.2,1.5,.4,1) both}"+
"@keyframes rsppop{0%{transform:scale(.3) rotate(-12deg);opacity:0}60%{transform:scale(1.08) rotate(3deg)}100%{transform:scale(1) rotate(0);opacity:1}}"+
"#reto-sorp-ov .rsp-emoji{font-size:26px;line-height:1;animation:rspbob 1.4s ease-in-out infinite}"+
"@keyframes rspbob{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-14px) rotate(6deg)}}"+
"#reto-sorp-ov .rsp-h{color:rgba(255,255,255,.95);font-weight:800;font-size:9.5px;letter-spacing:1.5px;margin-top:3px}"+
"#reto-sorp-ov .rsp-name{color:#fff;font-weight:900;font-size:clamp(14px,1.25vw,18px);line-height:1.15;margin:6px 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 3px 14px rgba(0,0,0,.4)}"+
"#reto-sorp-ov .rsp-x2{display:inline-block;background:#fff;color:#ef4444;font-weight:900;font-size:14px;padding:2px 13px;border-radius:999px;box-shadow:0 8px 26px rgba(0,0,0,.35);animation:rsppulse 1s ease-in-out infinite}"+
"@keyframes rsppulse{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}"+
"#reto-sorp-ov .rsp-cta{color:#fff;font-weight:700;font-size:10px;margin-top:5px;opacity:.96}"+
"#reto-sorp-ov .rsp-shine{position:absolute;top:0;left:-60%;width:50%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-18deg);animation:rspshine 2.6s ease-in-out infinite;pointer-events:none}"+
"@keyframes rspshine{0%{left:-60%}55%,100%{left:140%}}";
document.head.appendChild(st); }
function _retoSorpresaTest(){ var reto=(window._retoLastReto)||((typeof _reto==='function')?_reto():null); var s=(reto&&typeof _retoSorpresaHoy==='function')?_retoSorpresaHoy(reto):null; if(!s||!s.med){ if(typeof showToast==='function')showToast('Primero marca el producto x2 de hoy: 🎲 Sortear (o 🎁 en un producto)'); return; } _retoSorpresaShow(true); }
function _retoSorpresaShow(force){
  try{
    if(!force && !window._retoTVon) return;
    if(document.getElementById('reto-sorp-ov')) return;
    var reto=(window._retoLastReto)||_reto(); var s=(typeof _retoSorpresaHoy==='function')?_retoSorpresaHoy(reto):null;
    if(!s||!s.med) return;
    _retoSorpCss();
    var ov=document.createElement('div'); ov.id='reto-sorp-ov';
    ov.innerHTML='<div class="rsp-card"><div class="rsp-shine"></div><div class="rsp-emoji">🎁</div><div class="rsp-h">PRODUCTO PROMOCIONADO DE HOY</div><div class="rsp-name">'+esc(s.med.nombre)+'</div><div class="rsp-x2">x'+(s.mult||2)+' PUNTOS</div><div class="rsp-cta">¡Impúlsalo y suma doble! 🚀</div></div>';
    document.body.appendChild(ov);
    try{ ov.style.cursor='pointer'; ov.addEventListener('click',function(){ try{ov.remove();}catch(e){} }); }catch(e){}
    try{ if(typeof _retoFanfare==='function')_retoFanfare(); }catch(e){}
    try{ setTimeout(function(){ _retoConfetti(window.innerWidth-170, window.innerHeight-140); }, 450); }catch(e){}
    try{ if(window.twemoji) twemoji.parse(ov,{folder:'svg',ext:'.svg',base:'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'}); }catch(e){}
    setTimeout(function(){ if(ov){ ov.style.opacity='0'; ov.style.transform='scale(1.06)'; setTimeout(function(){ try{ov.remove();}catch(e){} }, 650); } }, 12000);
  }catch(e){}
}

function _retoTVcss(){ if(document.getElementById('reto-tv-css'))return; var st=document.createElement('style'); st.id='reto-tv-css'; st.textContent="#reto-pub .rtv-wrap{max-width:1700px;margin:0 auto;padding:.7vh 1.4vw 1vh;display:flex;flex-direction:column;gap:.7vh;height:100vh} #reto-pub .rtv-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex:none} #reto-pub .rtv-brand{display:flex;align-items:center;gap:14px;min-width:0} #reto-pub .rtv-logo{width:46px;height:46px;border-radius:50%;overflow:hidden;flex:none;background:#1E38A6;display:grid;place-items:center} #reto-pub .rtv-logo svg{width:100%;height:100%;display:block} #reto-pub .rtv-brand h1{font-size:clamp(20px,2.4vw,33px);font-weight:800;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #reto-pub .rtv-sub{font-size:clamp(11px,1.1vw,14px);opacity:.7;font-weight:500} #reto-pub .rtv-clock{text-align:right;flex:none} #reto-pub .rtv-clock .h{font-size:clamp(22px,2.5vw,35px);font-weight:800;line-height:1} #reto-pub .rtv-clock .d{font-size:clamp(11px,1.1vw,14px);opacity:.7;text-transform:capitalize} #reto-pub .rtv-chips{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;flex:none} #reto-pub .rtv-chip{padding:5px 15px;border-radius:999px;font-size:clamp(12px,1.3vw,16px);display:flex;align-items:center;gap:7px} #reto-pub .rtv-chip.col{background:rgba(245,158,11,.18);border:1px solid rgba(245,158,11,.55)} #reto-pub .rtv-chip.ind{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28)} #reto-pub .rtv-chip.cd{background:rgba(239,68,68,.16);border:1px solid rgba(248,113,113,.5);font-weight:700} #reto-pub .rtv-pizza{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:7px 16px;flex:none} #reto-pub .rtv-pizza .pr{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px} #reto-pub .rtv-pizza .lbl{font-size:clamp(14px,1.5vw,19px);font-weight:700} #reto-pub .rtv-pizza .num{font-size:clamp(13px,1.4vw,17px);opacity:.85} #reto-pub .rtv-pizza .pct{font-size:clamp(18px,2vw,26px);font-weight:800;color:#fbbf24} #reto-pub .rtv-track{height:12px;border-radius:8px;background:rgba(0,0,0,.28);overflow:hidden} #reto-pub .rtv-fill{height:100%;border-radius:9px;background:linear-gradient(90deg,#f59e0b,#fde047);transition:width .8s} #reto-pub .rtv-main{display:grid;grid-template-columns:37% 1fr;gap:1.3vw;flex:1;min-height:0;align-items:stretch} #reto-pub .rtv-panel{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:12px;min-height:0;display:flex;flex-direction:column;overflow:hidden} #reto-pub .rtv-ptitle{font-size:clamp(13px,1.3vw,16px);font-weight:700;opacity:.8;margin-bottom:6px;flex:none} #reto-pub .rtv-podwrap{flex:none;height:57%;display:flex;justify-content:center;align-items:flex-end;gap:14px;min-height:0;overflow:hidden;padding-top:6px} #reto-pub .rtv-pod{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;width:32%;max-width:210px} #reto-pub .rtv-pod .ava{font-size:clamp(40px,4.4vw,66px);line-height:1} #reto-pub .rtv-pod .nm{font-weight:800;font-size:clamp(13px,1.45vw,18px);margin:4px 0 1px;text-align:center;line-height:1.1} #reto-pub .rtv-pod .pp{font-size:clamp(12px,1.25vw,16px);opacity:.9;margin-bottom:7px;font-weight:700} #reto-pub .rtv-ped{width:100%;border-radius:14px 14px 6px 6px;display:flex;align-items:flex-start;justify-content:center;padding-top:8px;font-size:clamp(22px,2.6vw,38px);font-weight:900;color:rgba(0,0,0,.4)} #reto-pub .rtv-pod.r1 .rtv-ped{height:clamp(94px,13.5vh,152px);background:linear-gradient(180deg,#fde047,#f59e0b)} #reto-pub .rtv-pod.r2 .rtv-ped{height:clamp(66px,9.5vh,108px);background:linear-gradient(180deg,#e5e7eb,#9ca3af)} #reto-pub .rtv-pod.r3 .rtv-ped{height:clamp(46px,6.8vh,78px);background:linear-gradient(180deg,#fdba74,#c2630f)} #reto-pub .rtv-crown{font-size:clamp(28px,3vw,44px);margin-bottom:-4px} #reto-pub .rtv-lstats{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:9px;min-height:0;margin-top:11px;overflow:hidden} #reto-pub .rtv-miniwrap{background:rgba(99,102,241,.16);border:1px solid rgba(129,140,248,.4);border-radius:13px;padding:10px 13px;flex:none} #reto-pub .rtv-miniwrap .mr{display:flex;justify-content:space-between;font-size:clamp(12px,1.2vw,15px);margin-bottom:6px;font-weight:700} #reto-pub .rtv-minitrack{height:11px;border-radius:6px;background:rgba(0,0,0,.28);overflow:hidden} #reto-pub .rtv-minitrack i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#6366f1,#a855f7)} #reto-pub .rtv-statcard{display:flex;align-items:center;gap:12px;border-radius:13px;padding:10px 13px;flex:none} #reto-pub .rtv-statcard.jd2{background:linear-gradient(90deg,rgba(251,191,36,.22),rgba(239,68,68,.13));border:1px solid rgba(251,191,36,.5)} #reto-pub .rtv-statcard.star2{background:linear-gradient(90deg,rgba(34,197,94,.18),rgba(132,204,22,.12));border:1px solid rgba(132,204,22,.45)} #reto-pub .rtv-statcard .ic{font-size:clamp(26px,2.9vw,40px);flex:none} #reto-pub .rtv-statcard .t{font-size:clamp(10px,1vw,12px);opacity:.8;font-weight:800;letter-spacing:.5px} #reto-pub .rtv-statcard .n{font-size:clamp(14px,1.55vw,20px);font-weight:800;line-height:1.15} #reto-pub .rtv-statcard .s{font-size:clamp(11px,1.15vw,14px);opacity:.85} #reto-pub .rtv-lb{flex:1;display:flex;flex-direction:column;gap:8px;min-height:0;--rs:1} #reto-pub .rtv-row{flex:1 1 0;min-height:0;display:flex;align-items:center;gap:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:0 15px;position:relative} #reto-pub .rtv-row.jd{border-color:rgba(251,191,36,.7);background:linear-gradient(90deg,rgba(251,191,36,.16),rgba(255,255,255,.05))} #reto-pub .rtv-rk{width:calc(34px*var(--rs));height:calc(34px*var(--rs));border-radius:10px;display:grid;place-items:center;font-weight:800;font-size:calc(clamp(14px,1.5vw,19px)*var(--rs));background:rgba(255,255,255,.1);flex:none} #reto-pub .rtv-rk.g1{background:linear-gradient(135deg,#fde047,#f59e0b);color:#5b3b00} #reto-pub .rtv-rk.g2{background:linear-gradient(135deg,#e5e7eb,#9ca3af);color:#374151} #reto-pub .rtv-rk.g3{background:linear-gradient(135deg,#fdba74,#c2630f);color:#fff} #reto-pub .rtv-av{font-size:calc(clamp(22px,2.4vw,34px)*var(--rs));flex:none} #reto-pub .rtv-mid{flex:1;min-width:0} #reto-pub .rtv-nameline{display:flex;align-items:center;gap:8px;min-width:0} #reto-pub .rtv-name{font-weight:800;font-size:calc(clamp(14px,1.6vw,21px)*var(--rs));white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #reto-pub .rtv-kb{flex:none;background:linear-gradient(135deg,#fde047,#f59e0b);color:#5b3b00;font-weight:800;border-radius:999px;padding:1px calc(9px*var(--rs));font-size:calc(clamp(10px,1.05vw,13px)*var(--rs))} #reto-pub .rtv-bar{height:calc(8px*var(--rs));border-radius:6px;background:rgba(0,0,0,.25);margin-top:5px;overflow:hidden} #reto-pub .rtv-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#22c55e,#a3e635);transition:width .7s} #reto-pub .rtv-cap{font-size:calc(clamp(11px,1.15vw,15px)*var(--rs));opacity:.72;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #reto-pub .rtv-lb.compact .rtv-cap{display:none} #reto-pub .rtv-right{text-align:right;flex:none;display:flex;align-items:center;gap:calc(10px*var(--rs))} #reto-pub .rtv-lvl{font-size:calc(clamp(13px,1.55vw,21px)*var(--rs));font-weight:800;color:#5b3b00;background:linear-gradient(135deg,#fde047,#f59e0b);border-radius:999px;padding:calc(2px*var(--rs)) calc(11px*var(--rs));line-height:1.25;white-space:nowrap} #reto-pub .rtv-pts{font-size:calc(clamp(17px,2vw,27px)*var(--rs));font-weight:900;line-height:1} #reto-pub .rtv-uni{font-size:calc(clamp(16px,1.8vw,25px)*var(--rs));opacity:1;font-weight:800;color:#a3e635} #reto-pub .rtv-star{position:absolute;top:-8px;right:14px;background:#fbbf24;color:#5b3b00;font-size:calc(11px*var(--rs));font-weight:800;padding:2px 9px;border-radius:999px} #reto-pub .rtv-zero{text-align:center;padding:8px 16px;background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(168,85,247,.14));border:1px dashed rgba(255,255,255,.3);border-radius:12px;flex:none;font-size:clamp(13px,1.4vw,18px)} #reto-pub .rtv-zero b{font-weight:800} #reto-pub .rtv-foot{text-align:center;opacity:.5;font-size:clamp(10px,1vw,13px);flex:none} @media(max-width:900px){ #reto-pub .rtv-main{grid-template-columns:1fr} } #reto-pub .rtv-podwrap{position:relative} #reto-pub .rtv-pod{position:relative;z-index:1} #reto-pub .rtv-spot{position:absolute;left:50%;top:-8%;transform:translateX(-50%);width:46%;height:125%;background:radial-gradient(ellipse at 50% 28%,rgba(253,224,71,.38),rgba(253,224,71,.08) 45%,transparent 70%);pointer-events:none;z-index:0;animation:rtvspot 3.4s ease-in-out infinite} @keyframes rtvspot{0%,100%{opacity:.5}50%{opacity:1}} #reto-pub .rtv-pod.r1 .rtv-ped{position:relative;overflow:hidden} #reto-pub .rtv-pod.r1 .rtv-ped:after{content:'';position:absolute;top:0;left:-60%;width:55%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-18deg);animation:rtvshine 3.2s ease-in-out infinite} @keyframes rtvshine{0%{left:-60%}55%,100%{left:135%}} #reto-pub .rtv-crown{animation:rtvfloat 2.4s ease-in-out infinite} @keyframes rtvfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} #reto-pub .rtv-bar i,#reto-pub .rtv-fill,#reto-pub .rtv-minitrack i{position:relative;overflow:hidden} #reto-pub .rtv-bar i:after,#reto-pub .rtv-fill:after,#reto-pub .rtv-minitrack i:after{content:'';position:absolute;top:0;left:-45%;width:45%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);animation:rtvbar 2.6s linear infinite} @keyframes rtvbar{0%{left:-45%}100%{left:145%}} #reto-pub .rtv-row.lead{animation:rtvpulse 2.2s ease-in-out infinite} @keyframes rtvpulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0)}50%{box-shadow:0 0 20px 2px rgba(251,191,36,.5)}} #reto-pub .rtv-ticker{flex:none;overflow:hidden;white-space:nowrap;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:7px 0;margin-top:4px} #reto-pub .rtv-ticker .tk{display:inline-block;white-space:nowrap;animation:rtvtick 34s linear infinite} #reto-pub .rtv-ticker .tk b{margin:0 24px;font-size:clamp(13px,1.4vw,18px);font-weight:700} @keyframes rtvtick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}"; document.head.appendChild(st); }
function _retoRollTV(reto){ try{ var lb=_retoLeaderboard(reto); var prev=window._retoPrevPts||{}; var nm={}; lb.forEach(function(p){ nm[p.id]=p.puntos; }); window._retoPrevPts=nm; var rows=document.querySelectorAll('#reto-pub .rtv-row'); for(var i=0;i<rows.length;i++){ (function(row){ var vid=row.getAttribute('data-vid'); var el=row.querySelector('.rtv-pts'); if(!el||vid==null)return; var to=nm[vid]||0, from=(prev[vid]!=null?prev[vid]:to); if(from===to)return; var t0=performance.now(); function step(t){ var k=Math.min(1,(t-t0)/900); try{ el.textContent=_retoFnum(Math.round(from+(to-from)*k)); }catch(e){} if(k<1)requestAnimationFrame(step); } requestAnimationFrame(step); })(rows[i]); } }catch(e){} }
function _retoVistaMes(reto, mes){
  if(!reto) return reto;
  mes=mes||_retoMesActivo(reto); var hoy=_retoMesHoy();
  var enMes=function(m){ var mm=(m.vence&&/^\d{4}-\d{2}$/.test(m.vence))?m.vence:''; return mm?(mm===mes):(mes===hoy); };
  var clone={}; for(var k in reto){ clone[k]=reto[k]; }
  clone.meds=(reto.meds||[]).filter(enMes);
  return clone;
}
function _retoPublicoTV(reto){
  if(!reto || reto.activo===false || !(reto.vendedores&&reto.vendedores.length)){ return '<div class="rtv-wrap"><div style="margin:auto;text-align:center"><div style="font-size:54px">🏆</div><div style="font-size:24px;font-weight:800;margin-top:8px">'+esc((reto&&reto.titulo)||'Reto de Ventas')+'</div><div style="opacity:.75;margin-top:6px">El reto aún no está activo.</div></div></div>'; }
  var lb=_retoLeaderboard(reto);
  var allZero=lb.reduce(function(s,x){return s+x.puntos;},0)===0;
  var col=_retoColectivo(_retoVistaMes(reto));
  var dias=_retoFinMesDias().diasRest;
  var jd=_retoJugadorDia(reto);
  var reyCount=_retoReyCount(reto);
  var base=Number(reto.nivel_base)||500;
  var logo=(typeof FARM_LOGO_SVG!=='undefined')?FARM_LOGO_SVG:'🏥';
  var chips='<div class="rtv-chips">'+((_retoColOn(reto)&&reto.premio_colectivo)?'<div class="rtv-chip col">🍕 Todos: <b>'+esc(reto.premio_colectivo)+'</b></div>':'')+(reto.premio_individual?'<div class="rtv-chip ind">🏅 Ganador: <b>'+esc(reto.premio_individual)+'</b></div>':'')+'<div class="rtv-chip cd">⏳ Cierra el mes en <b>'+dias+' día'+(dias===1?'':'s')+'</b></div>'+'</div>';
  var unidadTxt=(reto.meta_colectiva_modo==='puntos'?'puntos':'unidades');
  var pizza=(_retoColOn(reto)&&col.meta>0)?('<div class="rtv-pizza"><div class="pr"><span class="lbl">🎯 Meta colectiva del equipo</span><span class="num">'+_retoFnum(col.vendido)+' / '+_retoFnum(col.meta)+' '+unidadTxt+'</span><span class="pct">'+col.pct+'%</span></div><div class="rtv-track"><div class="rtv-fill" style="width:'+Math.min(100,col.pct)+'%"></div></div></div>'):'';
  var top=lb.slice(0,3); var order=[]; if(top[1])order.push({p:top[1],r:2}); if(top[0])order.push({p:top[0],r:1}); if(top[2])order.push({p:top[2],r:3});
  var medi={1:'🥇',2:'🥈',3:'🥉'}, crn={1:'👑',2:'',3:''};
  var podHtml='<div class="rtv-podwrap"><div class="rtv-spot"></div>'+order.map(function(o){ return '<div class="rtv-pod r'+o.r+'">'+(crn[o.r]?'<div class="rtv-crown">'+crn[o.r]+'</div>':'')+'<div class="ava">'+(o.p.emoji||'🧑')+'</div><div class="nm">'+esc(o.p.nombre)+'</div><div class="pp">'+_retoFnum(o.p.puntos)+' pts</div><div class="rtv-ped">'+medi[o.r]+'</div></div>'; }).join('')+'</div>';
  var compact=lb.length>12;
  var phoy=_retoPtsHoy(reto), metaD=Number(reto.meta_dia)||0;
  var metaHoy=metaD>0?('<div class="rtv-miniwrap"><div class="mr"><span>🎯 Meta de hoy (equipo)</span><span>'+_retoFnum(phoy)+' / '+_retoFnum(metaD)+' pts</span></div><div class="rtv-minitrack"><i style="width:'+Math.min(100,Math.round(phoy/metaD*100))+'%"></i></div></div>'):'';
  var jdCard=jd?('<div class="rtv-statcard jd2"><div class="ic">⭐</div><div style="min-width:0"><div class="t">JUGADOR DEL DÍA</div><div class="n">'+esc(jd.v.emoji+' '+jd.v.nombre)+'</div><div class="s">'+_retoFnum(jd.pts)+' pts hoy</div></div></div>'):('<div class="rtv-statcard jd2"><div class="ic">⭐</div><div><div class="t">JUGADOR DEL DÍA</div><div class="n" style="opacity:.6">Aún nadie ha vendido hoy</div></div></div>');
  var mt=_retoMedTop(reto);
  var medStar=(mt&&mt.u>0)?('<div class="rtv-statcard star2"><div class="ic">🔥</div><div style="min-width:0"><div class="t">MEDICAMENTO ESTRELLA</div><div class="n" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">💊 '+esc(mt.med.nombre)+'</div><div class="s">'+_retoFnum(mt.u)+' unidades vendidas</div></div></div>'):'';
  var statsHtml='<div class="rtv-lstats">'+metaHoy+jdCard+medStar+'</div>';
  var podium='<div class="rtv-panel"><div class="rtv-ptitle">🏆 Podio</div>'+podHtml+statsHtml+'</div>';
  var rows=lb.slice(0,10).map(function(p,i){ var rk=i+1, gcls=rk<=3?(' g'+rk):''; var ni=_retoNivelInfo(p.puntos,base); var w=ni.pct; var isJd=jd&&jd.v.id===p.id; return '<div data-vid="'+p.id+'" class="rtv-row'+(isJd?' jd':'')+(rk===1?' lead':'')+'">'+(isJd?'<div class="rtv-star">⭐ Jugador del día</div>':'')+'<div class="rtv-rk'+gcls+'">'+rk+'</div><div class="rtv-av">'+(p.emoji||'🧑')+'</div><div class="rtv-mid"><div class="rtv-nameline"><span class="rtv-name">'+esc(p.nombre)+'</span></div></div><div class="rtv-right"><div class="rtv-lvl">Nivel '+ni.lv+'</div><div><div class="rtv-pts">'+_retoFnum(p.puntos)+'</div><div class="rtv-uni">'+_retoFnum(p.unidades)+' uds</div></div></div></div>'; }).join('');
  var lbPanel='<div class="rtv-panel"><div class="rtv-ptitle">📊 Top 10 (de '+lb.length+' participantes)</div><div class="rtv-lb'+(compact?' compact':'')+'" id="rtv-lb">'+rows+'</div></div>';
  var zero=allZero?('<div class="rtv-zero">🔥 <b>¡El reto arranca!</b> <span style="opacity:.85">— Sé el primero en marcar una venta y saltar al podio.</span></div>'):'';
  var _tk=[]; if(jd)_tk.push('⭐ Jugador del día: '+esc(jd.v.nombre)+' — '+_retoFnum(jd.pts)+' pts hoy'); if(lb[0]&&lb[0].puntos>0)_tk.push('👑 Líder: '+esc(lb[0].nombre)+' — '+_retoFnum(lb[0].puntos)+' pts'); var _mt=_retoMedTop(reto); if(_mt&&_mt.u>0)_tk.push('🔥 Medicamento estrella: '+esc(_mt.med.nombre)+' ('+_retoFnum(_mt.u)+' u)'); if(!_tk.length)_tk.push('El reto está en marcha — ¡a vender!'); var _tku=_tk.map(function(t){return '<b>'+t+'</b>';}).join(''); var _tkf=''; for(var _r=0;_r<6;_r++)_tkf+=_tku; var tickerHtml='<div class="rtv-ticker"><span class="tk">'+_tkf+'</span></div>'; return '<div class="rtv-wrap"><div class="rtv-top"><div class="rtv-brand"><div class="rtv-logo">'+logo+'</div><div style="min-width:0"><h1>'+esc(reto.titulo||'Reto de Ventas')+'</h1><div class="rtv-sub">Farmacia Claret · Droguería Clínica</div></div></div><div class="rtv-clock"><div class="h" id="rtv-clk">--:--</div><div class="d" id="rtv-dte"></div></div></div>'+chips+pizza+zero+'<div class="rtv-main">'+podium+lbPanel+'</div>'+tickerHtml+'<div class="rtv-foot">Se actualiza solo · '+(reto.meds?reto.meds.length:0)+' medicamentos en juego</div></div>';
}
function _retoTwInit(){
  try{
    if(!document.getElementById('tw-emoji-css')){ var st=document.createElement('style'); st.id='tw-emoji-css'; st.textContent='#reto-pub img.emoji,#reto-sorp-ov img.emoji,#reto-celeb-ov img.emoji{height:1em;width:1em;margin:0 .04em;vertical-align:-.12em;display:inline-block}'; document.head.appendChild(st); }
    if(window.twemoji){ _retoTwParse(); return; }
    if(!document.getElementById('tw-emoji-js')){ var s=document.createElement('script'); s.id='tw-emoji-js'; s.src='https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js'; s.onload=function(){ try{ _retoTwParse(); }catch(e){} }; document.head.appendChild(s); }
  }catch(e){}
}
function _retoTwParse(){ try{ if(!window.twemoji)return; var h=document.getElementById('reto-pub'); if(h) twemoji.parse(h,{folder:'svg',ext:'.svg',base:'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'}); }catch(e){} }
function _retoPublicoHTML(reto){
  var hora=new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'});
  if(!reto || reto.activo===false || !(reto.vendedores&&reto.vendedores.length)){
    return '<div style="max-width:520px;margin:0 auto;padding:50px 22px;text-align:center"><div style="font-size:54px;margin-bottom:10px">🏆</div><div style="font-size:22px;font-weight:800;margin-bottom:8px">'+esc((reto&&reto.titulo)||'Reto de Ventas')+'</div><div style="opacity:.75;font-size:14px">El reto aún no está activo. ¡Vuelve pronto!</div></div>';
  }
  var premios='<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px">';
  if(_retoColOn(reto)&&reto.premio_colectivo) premios+='<div style="background:rgba(245,158,11,.18);border:1px solid rgba(245,158,11,.5);padding:6px 14px;border-radius:999px;font-size:13px">🍕 Todos: <strong>'+esc(reto.premio_colectivo)+'</strong></div>';
  if(reto.premio_individual) premios+='<div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);padding:6px 14px;border-radius:999px;font-size:13px">🏅 Ganador: <strong>'+esc(reto.premio_individual)+'</strong></div>';
  premios+='</div>';
  var col=_retoColectivo(_retoVistaMes(reto));
  var colBar = (_retoColOn(reto)&&col.meta>0) ? ('<div style="margin:16px 0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:13px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px"><span>🎯 Meta colectiva del equipo</span><span style="font-weight:800">'+col.pct+'%</span></div><div style="height:13px;border-radius:7px;background:rgba(255,255,255,.15);overflow:hidden"><div style="height:100%;width:'+Math.min(100,col.pct)+'%;background:linear-gradient(90deg,#fbbf24,#ef4444);border-radius:7px;transition:width .5s"></div></div>'+(col.pct>=100?'<div style="text-align:center;font-size:13px;margin-top:7px;font-weight:700">🎉 ¡Meta colectiva lograda!</div>':'')+'</div>') : '';
  return '<div style="max-width:560px;margin:0 auto;padding:26px 18px 50px">'+
    '<div style="text-align:center;margin-bottom:14px"><div style="font-size:40px;line-height:1">🏆</div><div style="font-size:23px;font-weight:800;margin-top:4px">'+esc(reto.titulo||'Reto de Ventas')+'</div>'+premios+'<div style="opacity:.7;font-size:12px;margin-top:8px">Cierra el mes en '+_retoFinMesDias().diasRest+' días</div>'+'</div>'+
    colBar+
    (function(){ var s=_retoSorpresaHoy(reto); return s?('<div style="margin:14px 0;text-align:center;background:linear-gradient(135deg,rgba(245,158,11,.30),rgba(239,68,68,.22));border:1px solid rgba(251,191,36,.6);border-radius:16px;padding:15px;box-shadow:0 6px 22px rgba(245,158,11,.25)"><div style="font-size:12px;letter-spacing:1px;opacity:.9">\uD83C\uDF81 SORPRESA DE HOY</div><div style="font-size:20px;font-weight:800;margin:3px 0">'+esc(s.med.nombre)+'</div><div style="font-size:14px">\u00a1vale <b>x'+s.mult+'</b> puntos hoy! \uD83D\uDD25</div></div>'):''; })()+
    (function(){ var phoy=_retoPtsHoy(reto); var metaD=Number(reto.meta_dia)||0; return metaD>0?('<div style="margin:14px 0;background:rgba(99,102,241,.16);border:1px solid rgba(129,140,248,.4);border-radius:14px;padding:13px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px"><span>🎯 Meta de hoy (equipo)</span><span style="font-weight:800">'+phoy+' / '+metaD+' pts</span></div><div style="height:11px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden"><div style="height:100%;width:'+Math.min(100,Math.round(phoy/metaD*100))+'%;background:linear-gradient(90deg,#818cf8,#22d3ee);border-radius:6px;transition:width .5s"></div></div>'+(phoy>=metaD?'<div style="text-align:center;font-size:12px;margin-top:6px;font-weight:700">🎉 ¡Meta del día lograda!</div>':'')+'</div>'):''; })()+
    (function(){ var jd=_retoJugadorDia(reto); return jd?('<div style="margin:12px 0;text-align:center;background:linear-gradient(90deg,rgba(251,191,36,.22),rgba(239,68,68,.18));border:1px solid rgba(251,191,36,.5);border-radius:14px;padding:11px"><span style="font-size:13px">⭐ <b>Jugador del día:</b> '+(jd.v.emoji||'🧑')+' '+esc(jd.v.nombre)+' · '+jd.pts+' pts hoy</span></div>'):''; })()+
    _retoRankingHTML(reto, true)+
    '<div style="text-align:center;opacity:.55;font-size:11px;margin-top:18px">Se actualiza solo · '+hora+' · '+(reto.meds?reto.meds.length:0)+' medicamentos en juego</div>'+
  '</div>';
}

/* ---------- módulo supervisor ---------- */
var _retoSecOpen=null;
function _retoLoadSec(){ if(_retoSecOpen)return _retoSecOpen; _retoSecOpen={cfg:false,vend:false,med:false,prog:false}; try{var s=localStorage.getItem('retoSecOpen'); if(s)_retoSecOpen=Object.assign(_retoSecOpen,JSON.parse(s));}catch(e){} return _retoSecOpen; }
function _retoToggleSec(k){ var o=_retoLoadSec(); o[k]=!o[k]; try{localStorage.setItem('retoSecOpen',JSON.stringify(o));}catch(e){} renderReto(); }
function _retoSec(k,titulo,extra,contenido){ var o=_retoLoadSec(); var ab=!!o[k]; return '<div class="tbox" style="padding:0;margin-bottom:12px;overflow:hidden"><div onclick="_retoToggleSec(\''+k+'\')" style="cursor:pointer;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;user-select:none"><span style="font-weight:700;font-size:13px">'+titulo+(extra?' <span style="color:var(--muted);font-weight:400;font-size:11px">'+extra+'</span>':'')+'</span><span style="color:var(--muted);font-size:14px">'+(ab?'▾':'▸')+'</span></div>'+(ab?('<div style="padding:0 14px 14px">'+contenido+'</div>'):'')+'</div>'; }
function _retoPop(mId,txt){ try{ if(!document.getElementById('reto-pop-css')){ var st=document.createElement('style'); st.id='reto-pop-css'; st.textContent='@keyframes retoPop{0%{opacity:0;transform:translateY(4px) scale(.8)}20%{opacity:1;transform:translateY(0) scale(1.15)}100%{opacity:0;transform:translateY(-32px) scale(1)}}@keyframes retoFlash{0%{background:rgba(34,197,94,.18)}100%{background:transparent}}'; document.head.appendChild(st);} var row=document.getElementById('medrow-'+mId); if(!row)return; row.style.position='relative'; row.style.animation='retoFlash .6s ease-out'; setTimeout(function(){try{row.style.animation='';}catch(e){}},650); var p=document.createElement('div'); p.textContent=txt; p.style.cssText='position:absolute;right:54px;top:5px;color:#16a34a;font-weight:800;font-size:18px;pointer-events:none;z-index:6;animation:retoPop .9s ease-out forwards;text-shadow:0 1px 2px rgba(0,0,0,.15)'; row.appendChild(p); setTimeout(function(){try{p.remove();}catch(e){}},950); }catch(e){} }
function _retoLoadExcelJS(cb){ if(window.ExcelJS) return cb(true); var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'; s.onload=function(){ cb(!!window.ExcelJS); }; s.onerror=function(){ cb(false); }; document.head.appendChild(s); }
function _retoExportPlantilla(){
  var r=_reto(); var meds=(r.meds||[]).filter(function(m){ return !m.retirado; });
  if(!meds.length){ if(typeof showToast==='function')showToast('No hay productos en el reto todavía'); return; }
  if(typeof showToast==='function')showToast('Generando Excel…');
  _retoLoadExcelJS(function(ok){
    if(!ok||!window.ExcelJS){ if(typeof showToast==='function')showToast('No se pudo cargar Excel'); return; }
    var wb=new ExcelJS.Workbook();
    var HOYs=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
    var MAB={'01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic'};
    var MF={'01':'ENERO','02':'FEBRERO','03':'MARZO','04':'ABRIL','05':'MAYO','06':'JUNIO','07':'JULIO','08':'AGOSTO','09':'SEPTIEMBRE','10':'OCTUBRE','11':'NOVIEMBRE','12':'DICIEMBRE'};
    var EMPL={drogueria:'Droguería',farmacia:'Farmacia'};
    var heads=['Artículo','Empresa','Impulsable','Puntos','Fecha de vencimiento','Meta (unidades a mover)','Vendidas (no tocar)','Restante (no tocar)'];
    var widths=[46,13,12,10,20,22,17,18];
    var thin={style:'thin',color:{argb:'FFD9DEE8'}}; var bd={top:thin,left:thin,right:thin,bottom:thin};
    function sheetFor(nombre,titulo){
      var ws=wb.addWorksheet(nombre,{views:[{state:'frozen',ySplit:2}]});
      ws.mergeCells('A1:H1'); var t=ws.getCell('A1'); t.value=titulo; t.font={name:'Arial',bold:true,size:13,color:{argb:'FFFFFFFF'}}; t.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1E38A6'}}; t.alignment={vertical:'middle',indent:1}; ws.getRow(1).height=26;
      var hr=ws.getRow(2); heads.forEach(function(h,i){ var c=hr.getCell(i+1); c.value=h; c.font={name:'Arial',bold:true,size:10.5,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2f52d0'}}; c.alignment={horizontal:'center',vertical:'middle',wrapText:true}; c.border=bd; ws.getColumn(i+1).width=widths[i]; }); hr.height=28;
      return ws;
    }
    function addMed(ws,m){
      var sold=(typeof _retoMedSold==='function')?_retoMedSold(r,m.id):0;
      var meta=Number(m.meta)||0; var queda=Math.max(0,meta-sold);
      var fecha=(m.vence&&/^\d{4}-\d{2}$/.test(m.vence))?new Date(m.vence+'-01T00:00:00'):null;
      var imp=(m.impulsable===false)?'No':'Sí';
      var row=ws.addRow([m.nombre||'', EMPL[m.empresa]||'', imp, (Number(m.puntos)||''), fecha, meta, sold, queda]);
      row.eachCell(function(c){ c.font=c.font||{name:'Arial',size:10}; c.border=bd; });
      row.getCell(1).alignment={indent:1};
      row.getCell(5).numFmt='DD/MM/YYYY';
      row.getCell(7).font={name:'Arial',size:10,color:{argb:'FF9CA3AF'}}; row.getCell(7).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F4F6'}};
      row.getCell(8).font={name:'Arial',size:10,color:{argb:'FF9CA3AF'}}; row.getCell(8).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F4F6'}};
    }
    function addValid(ws){
      var n=ws.rowCount; for(var rr=3; rr<=n+25; rr++){
        ws.getCell('B'+rr).dataValidation={type:'list',allowBlank:true,formulae:['"Farmacia,Droguería"']};
        ws.getCell('C'+rr).dataValidation={type:'list',allowBlank:true,formulae:['"Sí,No"']};
      }
      try{ ws.autoFilter='A2:H2'; }catch(e){}
    }
    var hoyMes=(typeof _retoMesHoy==='function')?_retoMesHoy():new Date().toISOString().slice(0,7); var groups={}; meds.forEach(function(m){ var mm=(m.vence&&/^\d{4}-\d{2}$/.test(m.vence))?m.vence:'zzz'; if(mm!=='zzz' && mm<hoyMes) return; (groups[mm]=groups[mm]||[]).push(m); });
    var keys=Object.keys(groups).sort();
    keys.forEach(function(mm){
      var lbl, tit;
      if(mm==='zzz'){ lbl='Sin fecha'; tit='SIN FECHA · ponles la fecha de vencimiento'; }
      else { var y=mm.slice(0,4), mo=mm.slice(5,7); lbl=(MAB[mo]||mo)+' '+y; tit='VENCIMIENTOS · '+(MF[mo]||mo)+' '+y+'  (actualizado '+HOYs+')'; }
      var ws=sheetFor(lbl, tit);
      groups[mm].sort(function(a,b){return (''+(a.nombre||'')).localeCompare(''+(b.nombre||''));}).forEach(function(m){ addMed(ws,m); });
      addValid(ws);
    });
    var wn=sheetFor('Nuevos','AGREGA AQUÍ los productos nuevos o de meses sin pestaña — la app los ubica por la FECHA que escribas');
    for(var e=0;e<40;e++){ var rw=wn.addRow(['','','','',null,'','','']); rw.eachCell(function(c){ c.border=bd; c.font={name:'Arial',size:10}; }); rw.getCell(5).numFmt='DD/MM/YYYY'; }
    addValid(wn);
    wb.xlsx.writeBuffer().then(function(buf){ var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Reto_Vencimientos_actualizado_'+HOYs+'.xlsx'; a.click(); setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(e){}},3000); if(typeof showToast==='function')showToast('✓ Excel descargado'); if(typeof logAudit==='function')logAudit('reto.export_plantilla',meds.length+' productos'); }).catch(function(e){ if(typeof showToast==='function')showToast('Error: '+((e&&e.message)||e)); });
  });
}
function retoExportExcel(){
  var r=_reto(); var meds=r.meds||[]; var vend=r.vendedores||[];
  if(!vend.length||!meds.length){ showToast&&showToast('Agrega vendedores y medicamentos primero'); return; }
  showToast&&showToast('Generando Excel…');
  _retoLoadExcelJS(function(ok){
    if(!ok||!window.ExcelJS){ showToast&&showToast('No se pudo cargar el generador de Excel'); return; }
    _retoBuildExcel(r,meds,vend).catch(function(e){ showToast&&showToast('Error al generar: '+((e&&e.message)||e)); });
  });
}
async function _retoBuildExcel(r,meds,vend){
  var BLUE='FF1E38A6', LIME='FF79C820', GREY='FFF3F4F6', WHITE='FFFFFFFF';
  var thin={style:'thin',color:{argb:'FFCBD5E1'}};
  var borderAll=function(c){ c.border={top:thin,left:thin,bottom:thin,right:thin}; };
  var lb=_retoLeaderboard(r);
  var col=_retoColectivo(r);
  var reyes=(typeof _retoMedReyes==='function')?_retoMedReyes(r):[];
  var champOf=function(mid){ var c=''; reyes.forEach(function(x){ if(x.med&&x.med.id===mid&&x.champ) c=x.champ.nombre+' ('+x.u+')'; }); return c; };
  var styleHeader=function(ws,row){ row.eachCell(function(c){ c.font={bold:true,color:{argb:WHITE},size:11,name:'Arial'}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:BLUE}}; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; borderAll(c); }); row.height=26; };
  var wb=new ExcelJS.Workbook(); wb.creator='Claret OS'; wb.created=new Date();

  /* ---------- Resumen ---------- */
  var ws=wb.addWorksheet('Resumen',{views:[{showGridLines:false}]});
  ws.columns=[{width:36},{width:34}];
  ws.mergeCells('A1:B1');
  var t=ws.getCell('A1'); t.value=(r.titulo||'Reto de Ventas'); t.font={bold:true,size:16,color:{argb:WHITE},name:'Arial'}; t.fill={type:'pattern',pattern:'solid',fgColor:{argb:BLUE}}; t.alignment={horizontal:'center',vertical:'middle'}; ws.getRow(1).height=32;
  var kv=function(k,v,big,color){ var row=ws.addRow([k,v]); row.getCell(1).font={bold:true,size:10,color:{argb:'FF6B7280'},name:'Arial'}; row.getCell(2).font={bold:!!big,size:big?14:11,name:'Arial',color:{argb:color||'FF111827'}}; row.getCell(1).border={bottom:thin}; row.getCell(2).border={bottom:thin}; row.height=18; return row; };
  var sec=function(txt,fill,fg){ var row=ws.addRow([txt,'']); ws.mergeCells('A'+row.number+':B'+row.number); row.getCell(1).font={bold:true,size:12,color:{argb:fg},name:'Arial'}; row.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}}; row.getCell(1).alignment={vertical:'middle'}; row.height=22; };
  ws.addRow([]);
  kv('Exportado', new Date().toLocaleString('es-VE'));
  kv('Estado', r.activo?'Activo':'Inactivo');
  if(r.fecha_fin) kv('Termina el', r.fecha_fin);
  kv('Participantes', vend.length);
  var nImp=meds.filter(_retoImpulsable).length;
  kv('Medicamentos', meds.length+'  ('+nImp+' impulsables · '+(meds.length-nImp)+' de prescripción)');
  ws.addRow([]);
  sec('PREMIO COLECTIVO', LIME, 'FF173404');
  kv('Premio', r.premio_colectivo||'—');
  kv('Meta (solo impulsables)', (col.meta||0)+' unidades'+(col.pctObjetivo?('  ·  '+col.pctObjetivo+'% del total'):''));
  if(col.total) kv('Total del lote impulsable', col.total+' unidades');
  kv('Vendido', (col.vendido||0)+' unidades', true);
  kv('Avance', (col.pct||0)+'%', true, (col.pct>=100?'FF059669':(col.pct>=50?'FFD97706':'FFDC2626')));
  ws.addRow([]);
  sec('INDIVIDUAL', 'FFEEF2FF', 'FF1E38A6');
  kv('Premio individual', r.premio_individual||'—');
  if(lb[0]) kv('Líder', lb[0].nombre+'  ·  '+lb[0].puntos+' pts', true);
  ws.addRow([]);
  var nota=ws.addRow(['Nota','Los de prescripción SÍ suman puntos al vendedor, pero NO cuentan para la meta del premio colectivo.']);
  nota.getCell(1).font={bold:true,size:9,color:{argb:'FF6B7280'}}; nota.getCell(2).font={size:9,italic:true,color:{argb:'FF6B7280'}}; nota.getCell(2).alignment={wrapText:true}; nota.height=28;

  /* ---------- Ranking ---------- */
  var ws2=wb.addWorksheet('Ranking');
  ws2.columns=[{header:'#',width:6},{header:'Vendedor',width:26},{header:'Equipo',width:9},{header:'Unidades',width:12},{header:'Puntos',width:12},{header:'Nivel',width:8}];
  styleHeader(ws2,ws2.getRow(1));
  lb.forEach(function(p,i){
    var niv=''; try{ niv=(typeof _retoNivel==='function')?_retoNivel(p.puntos).lv:''; }catch(e){}
    var row=ws2.addRow([i+1,p.nombre,p.equipo,p.unidadesTotal,Math.round(p.puntosTotal),niv]);
    row.eachCell(borderAll);
    if(i<3){ var medal=['FFFDE047','FFE5E7EB','FFFDBA74'][i]; row.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:medal}}; row.getCell(1).font={bold:true}; row.getCell(2).font={bold:true}; }
    else if(i%2===1){ row.eachCell(function(c){ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:GREY}}; }); }
    row.getCell(1).alignment={horizontal:'center'};
  });
  var tr=ws2.addRow(['','TOTAL','', lb.reduce(function(a,x){return a+(x.unidadesTotal||0);},0), lb.reduce(function(a,x){return a+Math.round(x.puntosTotal||0);},0), '']);
  tr.eachCell(function(c){ c.font={bold:true}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE5E7EB'}}; borderAll(c); });
  ws2.views=[{state:'frozen',ySplit:1}]; ws2.autoFilter='A1:F1';

  /* ---------- Medicamentos ---------- */
  var ws3=wb.addWorksheet('Medicamentos');
  ws3.columns=[{header:'Medicamento',width:40},{header:'Vence',width:14},{header:'Estado',width:12},{header:'Tipo',width:15},{header:'Meta',width:9},{header:'Vendido',width:10},{header:'% Avance',width:12},{header:'Restante',width:10},{header:'Puntos/u',width:10},{header:'Puntos generados',width:17},{header:'Quién vendió más',width:26}];
  styleHeader(ws3,ws3.getRow(1));
  meds.forEach(function(m,i){
    var sold=_retoMedSold(r,m.id); var meta=Number(m.meta)||0; var imp=_retoImpulsable(m);
    var pct=meta>0?(sold/meta):0; var rest=Math.max(0,meta-sold);
    var _est=m.no_participa?'No participa':(m.retirado?'Botado':'Activo');
    var row=ws3.addRow([m.nombre, (typeof _retoMesLabel==='function'?_retoMesLabel(m.vence):(m.vence||'')), _est, imp?'Impulsable':'Prescripción', meta, sold, pct, rest, Number(m.puntos)||0, sold*(Number(m.puntos)||0), champOf(m.id)]);
    row.eachCell(borderAll);
    row.getCell(7).numFmt='0%';
    if(!imp){ row.eachCell(function(c){ c.font={color:{argb:'FF9CA3AF'},italic:true}; }); }
    else if(i%2===1){ row.eachCell(function(c){ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:GREY}}; }); }
  });
  var tm=ws3.addRow(['TOTAL','', meds.reduce(function(a,m){return a+(Number(m.meta)||0);},0), meds.reduce(function(a,m){return a+_retoMedSold(r,m.id);},0), '', '', '', meds.reduce(function(a,m){return a+_retoMedSold(r,m.id)*(Number(m.puntos)||0);},0), '']);
  tm.eachCell(function(c){ c.font={bold:true}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE5E7EB'}}; borderAll(c); });
  ws3.views=[{state:'frozen',ySplit:1}]; ws3.autoFilter='A1:I1';
  try{ if(meds.length){ ws3.addConditionalFormatting({ ref:'E2:E'+(meds.length+1), rules:[{ type:'dataBar', cfvo:[{type:'num',value:0},{type:'num',value:1}], color:{argb:'FF4F46E5'} }] }); } }catch(e){}

  /* ---------- Detalle (formato largo, para filtrar/pivotar) ---------- */
  var ws4=wb.addWorksheet('Detalle');
  ws4.columns=[{header:'Vendedor',width:26},{header:'Medicamento',width:40},{header:'Tipo',width:15},{header:'Unidades',width:11},{header:'Puntos/u',width:10},{header:'Puntos',width:11},{header:'Cuenta al premio',width:17}];
  styleHeader(ws4,ws4.getRow(1));
  var nD=0;
  lb.forEach(function(p){ var vs=(r.ventas||{})[p.id]||{};
    meds.forEach(function(m){ var u=Number(vs[m.id])||0; if(u<=0) return; var imp=_retoImpulsable(m);
      var row=ws4.addRow([p.nombre, m.nombre, imp?'Impulsable':'Prescripción', u, Number(m.puntos)||0, u*(Number(m.puntos)||0), imp?'Sí':'No']);
      row.eachCell(borderAll); if(!imp) row.getCell(3).font={color:{argb:'FF9CA3AF'},italic:true};
      nD++;
    });
  });
  if(!nD){ ws4.addRow(['(sin ventas registradas)']); }
  ws4.views=[{state:'frozen',ySplit:1}]; ws4.autoFilter='A1:G1';

  /* ---------- Rescate mensual ---------- */
  var _mesesSet={}; meds.forEach(function(m){ if(m.vence)_mesesSet[m.vence]=1; }); (r.mermas||[]).forEach(function(x){ if(x.periodo)_mesesSet[x.periodo]=1; }); var _meses=Object.keys(_mesesSet).sort();
  var wsR=wb.addWorksheet('Rescate mensual');
  wsR.columns=[{header:'Mes',width:18},{header:'Productos',width:11},{header:'Total a vencer (u)',width:17},{header:'Salvadas / vendidas (u)',width:20},{header:'Botadas (u)',width:12},{header:'En riesgo (u)',width:13},{header:'% Salvado',width:11}];
  styleHeader(wsR,wsR.getRow(1));
  var _tT=0,_tS=0,_tB=0,_tR=0;
  _meses.forEach(function(mes){
    var mm=meds.filter(function(m){return (m.vence||'')===mes;});
    var totMeta=mm.reduce(function(a,m){return a+(Number(m.meta)||0);},0);
    var salv=mm.reduce(function(a,m){var so=_retoMedSold(r,m.id);var me=Number(m.meta)||0;return a+(me>0?Math.min(so,me):so);},0);
    var bot=(r.mermas||[]).filter(function(x){return x.periodo===mes;}).reduce(function(a,x){return a+(Number(x.cantidad)||0);},0);
    var riesgo=mm.filter(function(m){return !m.retirado;}).reduce(function(a,m){return a+Math.max(0,(Number(m.meta)||0)-_retoMedSold(r,m.id));},0);
    var pct=totMeta>0?(salv/totMeta):0;
    var row=wsR.addRow([_retoMesLabel(mes), mm.length, totMeta, salv, bot, riesgo, pct]);
    row.eachCell(borderAll); row.getCell(7).numFmt='0%';
    row.getCell(4).font={color:{argb:'FF059669'},bold:true}; row.getCell(5).font={color:{argb:'FFDC2626'},bold:true};
    _tT+=totMeta;_tS+=salv;_tB+=bot;_tR+=riesgo;
  });
  var rowRT=wsR.addRow(['TOTAL','',_tT,_tS,_tB,_tR,_tT>0?(_tS/_tT):0]);
  rowRT.eachCell(function(c){c.font={bold:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE5E7EB'}};borderAll(c);}); rowRT.getCell(7).numFmt='0%';
  wsR.views=[{state:'frozen',ySplit:1}];
  var notaR=wsR.addRow(['','Salvadas = unidades por vencer que se vendieron a tiempo. En riesgo = aún sin vender de meses abiertos.']);
  notaR.getCell(2).font={size:9,italic:true,color:{argb:'FF6B7280'}};

  /* ---------- Vencidos / botados ---------- */
  var wsM=wb.addWorksheet('Vencidos-botados');
  wsM.columns=[{header:'Producto',width:40},{header:'Botadas (u)',width:12},{header:'Vendidas (u)',width:13},{header:'Mes',width:16},{header:'Fecha',width:13},{header:'Registro',width:16}];
  styleHeader(wsM,wsM.getRow(1));
  var _mm=(r.mermas||[]).slice().sort(function(a,b){return (''+(b.fecha||'')).localeCompare(''+(a.fecha||''));});
  if(_mm.length){ _mm.forEach(function(x){ var row=wsM.addRow([x.nombre, Number(x.cantidad)||0, Number(x.vendidas)||0, _retoMesLabel(x.periodo)||x.periodo||'', x.fecha||'', x.autor||'']); row.eachCell(borderAll); row.getCell(2).font={color:{argb:'FFDC2626'},bold:true}; row.getCell(3).font={color:{argb:'FF059669'}}; }); }
  else { wsM.addRow(['(sin registros de vencidos/botados)']); }
  wsM.views=[{state:'frozen',ySplit:1}]; wsM.autoFilter='A1:F1';

  var buf=await wb.xlsx.writeBuffer();
  var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='reto_ventas_'+((typeof HOY==='function')?HOY():'')+'.xlsx'; a.click();
  setTimeout(function(){ try{URL.revokeObjectURL(a.href);}catch(e){} },3000);
  if(typeof logAudit==='function') logAudit('reto.export','Excel: '+vend.length+' vendedores, '+meds.length+' meds');
  showToast&&showToast('✓ Excel generado');
}

/* ============ RETO · ciclo mensual, mermas, premios por nivel ============ */
function _retoMesHoy(){ var d=new Date(Date.now()-4*3600*1000); return d.toISOString().slice(0,7); }
function _retoMesActivo(r){ return (typeof window!=='undefined'&&window._retoMesVer)?window._retoMesVer:_retoMesHoy(); }
function _retoMesLabel(mes){ if(!mes||!/^\d{4}-\d{2}$/.test(mes))return mes||''; var mm=['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']; var p=mes.split('-'); return (mm[parseInt(p[1])]||p[1])+' '+p[0]; }
function _retoMesesDisponibles(r){ r=r||_reto(); var set={}; var ok=function(x){ return x&&/^\d{4}-\d{2}$/.test(x); }; (r.meds||[]).forEach(function(m){ if(ok(m.vence))set[m.vence]=1; }); set[_retoMesHoy()]=1; if(ok(r.periodo_activo))set[r.periodo_activo]=1; (r.meses_extra||[]).forEach(function(x){ if(ok(x))set[x]=1; }); return Object.keys(set).sort(); }
function _retoMedsDelMes(r,mes){ return (r.meds||[]).filter(function(m){ return m.permanente || (m.vence||'')===mes; }); }
// Diclofenac (y futuros) permanentes: aparecen TODOS los meses. Se re-asegura al entrar por si un import los borró.
function _retoEnsurePerma(r){ r=r||_reto(); if(!Array.isArray(r.meds))r.meds=[]; var has=false; for(var i=0;i<r.meds.length;i++){ if(r.meds[i]&&r.meds[i].id==='perm_diclo'){ has=true; break; } } if(!has){ r.meds.push({id:'perm_diclo', nombre:'DICLOFENAC', meta:0, puntos:10, impulsable:true, permanente:true}); try{_retoSave();}catch(e){} return true; } return false; }
function retoSetMetaPerma(id){ if(!_retoPuedeEditar())return; var r=_reto(); var m=(r.meds||[]).filter(function(x){return x.id===id;})[0]; if(!m)return; var n=prompt('Meta de unidades para '+m.nombre+' este mes (la que pongan los muchachos):', String(Number(m.meta)||0)); if(n===null)return; var v=parseInt(n); if(isNaN(v)||v<0)v=0; m.meta=v; _retoSave(); renderReto(); if(typeof showToast==='function')showToast('✓ Meta de '+m.nombre+': '+v+' u'); }
function _retoUnidadesMes(r,mes){
  var t=0, hay=false, ud=r.u_dia||{};
  Object.keys(ud).forEach(function(f){ if((f||'').slice(0,7)===mes){ hay=true; Object.keys(ud[f]||{}).forEach(function(v){ t+=Number(ud[f][v])||0; }); } });
  if(!hay && mes==='2026-07'){
    var mesHoy=(typeof _retoMesHoy==='function')?_retoMesHoy():'';
    if(mesHoy==='2026-07'){ var v=r.ventas||{}; t=0; Object.keys(v).forEach(function(vid){ Object.keys(v[vid]||{}).forEach(function(mid){ t+=Number(v[vid][mid])||0; }); }); r.u_hist_jul=t; }
    else { t=Number(r.u_hist_jul)||0; }
  }
  return t;
}
function _retoColectivoMes(r,mes){
  var modo=(r&&r.meta_colectiva_modo)||'auto';
  var meds=_retoMedsDelMes(r,mes).filter(function(m){ return _retoImpulsable(m) && !m.no_participa; });
  // Foto al arrancar el mes: la meta se calcula sobre lo PENDIENTE al inicio (no sobre lo ya vendido antes)
  var mesHoy=(typeof _retoMesHoy==='function')?_retoMesHoy():'';
  if(mes>'2026-07' && mes===mesHoy){ if(!r.meta_snap)r.meta_snap={}; if(!r.meta_snap[mes]){ var sn={}; meds.forEach(function(m){ sn[m.id]=_retoMedSold(r,m.id); }); r.meta_snap[mes]=sn; try{_retoSave(true);}catch(e){} } }
  var snap=(r.meta_snap||{})[mes]||null;
  var totUnid=0, sold=0;
  meds.forEach(function(m){
    var mt=Number(m.meta)||0; var sTot=_retoMedSold(r,m.id); var sn=snap?(Number(snap[m.id])||0):0;
    if(snap){ mt=Math.max(0, mt-sn); }
    var sMes=Math.max(0, sTot-sn);
    totUnid+=mt; sold+=(mt>0?Math.min(sMes,mt):sMes);
  });
  var goal;
  if(modo==='porcentaje'){ var pct=Number(r.meta_colectiva)||75; goal=Math.ceil(totUnid*pct/100); }
  else { goal=totUnid; }
  var pctv=goal>0?Math.round(Math.min(sold,goal)/goal*100):0;
  return {mes:mes, meds:meds.length, totUnid:totUnid, sold:sold, goal:goal, pct:pctv, reached:(goal>0&&sold>=goal)};
}
function _retoPuntosMes(r,mes,vid){ var t=0; var ld=r.log_dia||{}; Object.keys(ld).forEach(function(f){ if((f||'').slice(0,7)===mes){ t+=Number((ld[f]||{})[vid])||0; } }); return t; }
function retoToggleRetirados(){ if(typeof window!=='undefined')window._retoShowRet=!window._retoShowRet; renderReto(); }
function retoSetMesActivo(mes){ if(mes==='__add'){ retoAgregarMes(); return; } window._retoMesVer=mes; renderReto(); }
function retoAgregarMes(){ if(!_retoPuedeEditar())return; var f=prompt('¿Qué mes quieres preparar? (AAAA-MM, ej. 2026-09)'); if(!f)return; f=f.trim(); if(!/^\d{4}-\d{2}$/.test(f)){ showToast&&showToast('Formato: AAAA-MM'); return; } var r=_reto(); if(!Array.isArray(r.meses_extra))r.meses_extra=[]; if(r.meses_extra.indexOf(f)<0)r.meses_extra.push(f); _retoSave(); window._retoMesVer=f; renderReto(); showToast&&showToast('✓ '+_retoMesLabel(f)+' listo para ponerle premio'); }
function retoCerrarMes(mes){ if(!_retoPuedeEditar())return; var r=_reto(); var pend=(r.meds||[]).filter(function(m){ return (m.vence||'')===mes && !m.retirado; }); if(!pend.length){ if(typeof showToast==='function')showToast('No hay productos pendientes en '+_retoMesLabel(mes)); return; } var totBot=0; pend.forEach(function(m){ totBot+=Math.max(0,(Number(m.meta)||0)-_retoMedSold(r,m.id)); }); if(!confirm('Cerrar '+_retoMesLabel(mes)+':\n\nSe retiran '+pend.length+' producto(s) de la lista y se registra como botado lo que no se vendió (aprox. '+totBot+' u).\n\nLos puntos ya ganados NO se tocan. ¿Continuar?')) return; if(!Array.isArray(r.mermas))r.mermas=[]; var fecha=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); pend.forEach(function(m){ var vend=_retoMedSold(r,m.id); var bot=Math.max(0,(Number(m.meta)||0)-vend); m.retirado=true; m.retirado_fecha=fecha; r.mermas.push({id:_retoUID(),med_id:m.id,nombre:m.nombre,cantidad:bot,vendidas:vend,fecha:fecha,periodo:mes,autor:(typeof currentUser!=='undefined'?currentUser:null)}); }); _retoSave(true); renderReto(); if(typeof showToast==='function')showToast('✓ '+_retoMesLabel(mes)+' cerrado · '+pend.length+' productos retirados'); }
function retoCerrarVencidos(){ if(!_retoPuedeEditar())return; var r=_reto(); var mesHoy=_retoMesHoy(); var pend=(r.meds||[]).filter(function(m){ return m.vence && m.vence<mesHoy && !m.retirado; }); if(!pend.length){ if(typeof showToast==='function')showToast('No hay meses vencidos pendientes'); return; } var totBot=0; pend.forEach(function(m){ totBot+=Math.max(0,(Number(m.meta)||0)-_retoMedSold(r,m.id)); }); if(!confirm('Cerrar '+pend.length+' producto(s) de meses ya vencidos.\n\nSe registra como botado lo no vendido (aprox. '+totBot+' u) y salen de la lista. Los puntos ya ganados NO se tocan.\n\n¿Continuar?')) return; if(!Array.isArray(r.mermas))r.mermas=[]; var fecha=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); pend.forEach(function(m){ var vend=_retoMedSold(r,m.id); var bot=Math.max(0,(Number(m.meta)||0)-vend); m.retirado=true; m.retirado_fecha=fecha; r.mermas.push({id:_retoUID(),med_id:m.id,nombre:m.nombre,cantidad:bot,vendidas:vend,fecha:fecha,periodo:(m.vence||mesHoy),autor:(typeof currentUser!=='undefined'?currentUser:null)}); }); _retoSave(true); renderReto(); if(typeof showToast==='function')showToast('✓ Cerrados '+pend.length+' productos vencidos'); }
function retoSetPremioMes(mes,val){ if(!_retoPuedeEditar())return; var r=_reto(); if(!r.premios_mes)r.premios_mes={}; r.premios_mes[mes]=val; _retoSave(); }
function retoSetMedVence(id,val){ if(!_retoPuedeEditar())return; var r=_reto(); var m=(r.meds||[]).filter(function(x){return x.id===id;})[0]; if(!m)return; m.vence=val||''; _retoSave(); renderReto(); }
function retoRetirarMed(id){ if(!_retoPuedeEditar())return; var r=_reto(); var m=(r.meds||[]).filter(function(x){return x.id===id;})[0]; if(!m)return; var vendidas=_retoMedSold(r,m.id); var meta=Number(m.meta)||0; var sug=Math.max(0,meta-vendidas); var resp=prompt('Retirar "'+m.nombre+'" (vencido).\n\nSe quita de la lista de registro, pero los puntos ya ganados NO se tocan (ni individual ni colectivo).\n\n¿Cuántas unidades se botaron (vencidas sin vender)?', String(sug)); if(resp===null)return; var cant=parseInt(resp); if(isNaN(cant)||cant<0)cant=0; m.retirado=true; m.retirado_fecha=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); if(!Array.isArray(r.mermas))r.mermas=[]; r.mermas.push({id:_retoUID(),med_id:m.id,nombre:m.nombre,cantidad:cant,vendidas:vendidas,fecha:m.retirado_fecha,periodo:(m.vence||_retoMesActivo(r)),autor:(typeof currentUser!=='undefined'?currentUser:null)}); _retoSave(true); renderReto(); if(typeof showToast==='function')showToast('🗑️ '+m.nombre+' retirado · '+cant+' botadas'); }
function retoReactivarMed(id){ if(!_retoPuedeEditar())return; var r=_reto(); var m=(r.meds||[]).filter(function(x){return x.id===id;})[0]; if(!m)return; m.retirado=false; _retoSave(); renderReto(); }
function retoDelMerma(mid){ if(!_retoPuedeEditar())return; if(!confirm('¿Borrar este registro de merma?'))return; var r=_reto(); r.mermas=(r.mermas||[]).filter(function(x){return x.id!==mid;}); _retoSave(); renderReto(); }
function retoSetPremioNivel(lv,val){ if(!_retoPuedeEditar())return; var r=_reto(); if(!r.premios_nivel)r.premios_nivel={}; r.premios_nivel[lv]=val; _retoSave(); }
function _retoColOn(r){ r=r||_reto(); return r.colectivo_on!==false; }
function retoToggleColectivo(){ if(!_retoPuedeEditar())return; var r=_reto(); r.colectivo_on=(r.colectivo_on===false); _retoSave(true); renderReto(); }
function _retoMesCardHTML(r){
  var puede=_retoPuedeEditar();
  var mes=_retoMesActivo(r);
  var meses=_retoMesesDisponibles(r);
  var opts=meses.map(function(x){ return '<option value="'+x+'"'+(x===mes?' selected':'')+'>'+esc(_retoMesLabel(x))+'</option>'; }).join('')+(puede?'<option value="__add">➕ Otro mes…</option>':'');
  var on=_retoColOn(r);
  var c=_retoColectivoMes(r,mes);
  var premio=((r.premios_mes||{})[mes])||'';
  var top=null,tp=0; (r.vendedores||[]).forEach(function(v){ var p=_retoPuntosMes(r,mes,v.id); if(p>tp){tp=p;top=v;} });
  var bar=c.reached?'#16a34a':'#f59e0b';
  var celebBtn=puede?('<div style="margin-top:8px;text-align:right"><button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px" onclick="retoCelebProgramar()">🎉 '+((r.celebracion&&r.celebracion.activa)?('Celebración: '+esc(r.celebracion.fecha)+' ✓'):'Programar celebración')+'</button>'+((r.celebracion&&r.celebracion.activa)?'<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px" onclick="_retoCelebShow(true)">👁 Ver</button><button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px;color:var(--red)" onclick="retoCelebQuitar()">✕</button>':'')+'</div>'):'';
  return '<div class="tbox" style="padding:14px;margin-bottom:14px;background:linear-gradient(135deg,#eef2ff,#faf5ff);border:1px solid #c7d2fe">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
      '<div style="font-weight:800;font-size:15px;color:#3730a3"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'+(on?'Premio del mes':'Reto del mes')+'</div>'+
      (puede?('<select onchange="retoSetMesActivo(this.value)" style="padding:6px 10px;border:1px solid #c7d2fe;border-radius:8px;background:#fff;color:#3730a3;font-weight:700;font-size:12px">'+opts+'</select>'):('<span style="font-weight:700;color:#3730a3">'+esc(_retoMesLabel(mes))+'</span>'))+
    '</div>'+
    (on?((puede?('<input value="'+esc(premio)+'" placeholder="🎁 Premio colectivo de '+esc(_retoMesLabel(mes))+' (ej. bono, almuerzo…)" onchange="retoSetPremioMes(\''+mes+'\',this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #c7d2fe;border-radius:8px;margin-bottom:10px;font-size:13px">'):(premio?('<div style="font-size:13px;color:#3730a3;margin-bottom:10px">🎁 <b>'+esc(premio)+'</b></div>'):''))+
    '<div style="display:flex;justify-content:space-between;font-size:12px;color:#4338ca;margin-bottom:4px"><span>Vendido: <b>'+_retoFnum(c.sold)+'</b> u'+(c.reached?'':' · faltan <b>'+_retoFnum(Math.max(0,c.goal-c.sold))+'</b>')+'</span><span><b>'+c.pct+'%</b> de la meta</span></div>'+
    '<div style="height:14px;border-radius:8px;background:rgba(99,102,241,.15);overflow:hidden"><div style="height:100%;width:'+Math.min(100,c.pct)+'%;background:'+bar+';border-radius:8px;transition:width .5s"></div></div>'+'<div style="font-size:10.5px;color:#6d28d9;margin-top:5px">Meta del premio: <b>'+_retoFnum(c.goal)+' u</b>'+((r.meta_colectiva_modo==='porcentaje')?(' = '+(Number(r.meta_colectiva)||75)+'% del total ('+_retoFnum(c.totUnid)+' u)'):(' · total '+_retoFnum(c.totUnid)+' u'))+' · '+c.meds+' productos</div>'+
    (c.reached?'<div style="text-align:center;color:#16a34a;font-weight:800;font-size:13px;margin-top:6px">🎉 ¡Meta alcanzada! Todos ganan'+(premio?': '+esc(premio):' el premio del mes')+'</div>':'')):'<div style="font-size:12px;color:#6d28d9;margin-bottom:4px">Premio colectivo apagado \u00b7 solo compite el individual (jugador del mes).</div>')+
    (top&&tp>0?('<div style="font-size:12px;color:#6d28d9;margin-top:8px">⭐ Jugador del mes: <b>'+esc(top.nombre)+'</b> ('+_retoFnum(tp)+' pts)'+((r.premio_individual&&r.premio_individual!=='Por confirmar')?' → gana <b>'+esc(r.premio_individual)+'</b>':'')+'</div>'):'')+
    '<div style="font-size:10px;color:var(--muted);margin-top:6px">Meta: vender el 75% de lo que vence el mes. Solo suman unidades de los productos de ESTE mes; vender productos de meses futuros da puntos ahora y adelanta la meta de ese mes. Cerrar el mes no borra el avance (los botados conservan lo vendido).</div>'+
    (puede?(function(){ var pend=(r.meds||[]).filter(function(m){return (m.vence||'')===mes && !m.retirado;}); return pend.length?('<div style="margin-top:10px;text-align:right"><button class="btn btn-ghost btn-sm" onclick="retoCerrarMes(\''+mes+'\')" style="font-size:11px">🔒 Cerrar '+esc(_retoMesLabel(mes))+' · botar lo no vendido</button></div>'):''; })():'')+
  celebBtn+'</div>';
}
function _retoMermasHTML(r){
  var arr=(r.mermas||[]).slice().sort(function(a,b){ return (''+(b.fecha||'')).localeCompare(''+(a.fecha||'')); });
  var puede=_retoPuedeEditar();
  if(!arr.length) return '<div style="color:var(--muted);font-size:12px;padding:4px 0">Aún no hay registros de vencidos/botados. Cuando retires un producto vencido (🗑️ en la tabla de medicamentos) se anota aquí.</div>';
  var totBot=arr.reduce(function(a,x){return a+(Number(x.cantidad)||0);},0);
  var totVen=arr.reduce(function(a,x){return a+(Number(x.vendidas)||0);},0);
  var rows=arr.map(function(x){ return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 7px;font-size:12px">'+esc(x.nombre||'')+'</td><td style="padding:5px 7px;text-align:center;font-size:12px;color:var(--red);font-weight:700">'+(Number(x.cantidad)||0)+'</td><td style="padding:5px 7px;text-align:center;font-size:12px;color:var(--green)">'+(Number(x.vendidas)||0)+'</td><td style="padding:5px 7px;text-align:center;font-size:11px;color:var(--muted)">'+esc(_retoMesLabel(x.periodo)||x.periodo||'')+'</td><td style="padding:5px 7px;text-align:center;font-size:11px;color:var(--muted)">'+esc(x.fecha||'')+'</td>'+(puede?'<td style="padding:5px 7px;text-align:right"><button onclick="retoDelMerma(\''+x.id+'\')" style="border:0;background:none;cursor:pointer;color:var(--red);font-size:14px">×</button></td>':'<td></td>')+'</tr>'; }).join('');
  return '<div style="display:flex;gap:14px;margin-bottom:10px;flex-wrap:wrap"><div style="background:#fee2e2;color:#b91c1c;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700">🗑️ Botadas: '+_retoFnum(totBot)+' u</div><div style="background:#dcfce7;color:#166534;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700">✅ Vendidas (retiradas): '+_retoFnum(totVen)+' u</div></div>'+
    '<div class="twrap"><table style="width:100%"><thead><tr><th style="text-align:left">Producto</th><th style="text-align:center">Botadas</th><th style="text-align:center">Vendidas</th><th style="text-align:center">Vence</th><th style="text-align:center">Retirado</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function _retoPremiosNivelHTML(r){
  var puede=_retoPuedeEditar();
  var pn=r.premios_nivel||{};
  var maxLv=6; try{ (r.vendedores||[]).forEach(function(v){ var lb=_retoLeaderboard(r); }); }catch(e){}
  var out='<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Define qué gana cada quien al llegar a cada nivel. Se muestra a cada vendedor su premio actual y el siguiente para mantenerlos motivados.</div>';
  for(var lv=1;lv<=8;lv++){ out+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="min-width:66px;font-weight:700;font-size:12px;color:var(--accent)">Nivel '+lv+'</span>'+(puede?('<input value="'+esc(pn[lv]||'')+'" placeholder="premio al llegar al nivel '+lv+'…" onchange="retoSetPremioNivel(\''+lv+'\',this.value)" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:12px">'):('<span style="font-size:12px;color:var(--muted)">'+esc(pn[lv]||'—')+'</span>'))+'</div>'; }
  return out;
}

function _retoScrollParent(node){ for(var p=node&&node.parentElement;p;p=p.parentElement){ try{ var s=getComputedStyle(p); if(/(auto|scroll)/.test(s.overflowY) && p.scrollHeight>p.clientHeight+2) return p; }catch(e){} } return (document.scrollingElement||document.documentElement); }
function renderReto(){ try{_retoFixJul26();}catch(e){}
  var el=document.getElementById('reto-content'); if(!el) return;
  if(!window._retoVisHook){ window._retoVisHook=true; var _rh=function(){ if(typeof activeTab!=='undefined'&&activeTab==='reto'&&!document.hidden){ _retoSync(function(ch){ if(ch&&activeTab==='reto') renderTab('reto'); }); } }; try{ document.addEventListener('visibilitychange',_rh); window.addEventListener('focus',_rh); }catch(e){} }
  _retoSync(function(ch){ if(ch&&typeof activeTab!=='undefined'&&activeTab==='reto') renderTab('reto'); });
  var r=_reto(); try{_retoEnsurePerma(r);}catch(e){} var puede=_retoPuedeEditar(); var dis=puede?'':'disabled';
  var inp='width:100%;margin-top:3px;padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)';
  var head='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px"><p class="section-title" style="margin:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z"/></svg>Reto de Ventas <span style="font-size:11px;font-weight:500;color:var(--muted)">· medicamentos por vencer</span></p><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'+_retoCountdown(r)+'<button class="btn btn-accent btn-sm" onclick="retoMostrarQR()">📲 QR público</button><button class="btn btn-ghost btn-sm" onclick="retoMostrarQRSup()">👤 QR supervisor</button><button class="btn btn-ghost btn-sm" onclick="retoExportExcel()">📊 Exportar Excel</button><button class="btn btn-ghost btn-sm" onclick="_retoExportPlantilla()">📥 Descargar para actualizar</button><button class="btn btn-ghost btn-sm" onclick="_retoSorpresaTest()">🎁 Probar cartel</button></div></div>';
  var cfg='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
    '<label style="font-size:11px;color:var(--muted)">Título del reto<input type="text" value="'+esc(r.titulo||'')+'" '+dis+' onchange="retoSetCampo(\'titulo\',this.value)" style="'+inp+'"></label>'+
    '<label style="font-size:11px;color:var(--muted)">Termina el<input type="date" value="'+esc(r.fecha_fin||'')+'" '+dis+' onchange="retoSetCampo(\'fecha_fin\',this.value)" style="'+inp+'"></label>'+
    '<label style="font-size:11px;color:var(--muted)">Premio colectivo<div style="margin-top:5px"><button class="btn btn-sm '+(_retoColOn(r)?'btn-green':'btn-ghost')+'" '+dis+' onclick="retoToggleColectivo()">'+(_retoColOn(r)?'🟢 Encendido':'⚪ Apagado')+'</button></div></label>'+'<label style="font-size:11px;color:var(--muted)">🍕 Premio colectivo (todos)<input type="text" value="'+esc(r.premio_colectivo||'')+'" '+dis+' placeholder="Pizzas de almuerzo" onchange="retoSetCampo(\'premio_colectivo\',this.value)" style="'+inp+'"></label>'+'<label style="font-size:11px;color:var(--muted)">🎯 Cómo se mide la meta colectiva<select '+dis+' onchange="retoSetCampo(\'meta_colectiva_modo\',this.value)" style="'+inp+'"><option value="auto"'+(((r.meta_colectiva_modo||'auto')==='auto')?' selected':'')+'>Suma de metas de medicamentos</option><option value="porcentaje"'+((r.meta_colectiva_modo==='porcentaje')?' selected':'')+'>Porcentaje del total (% de la mercancía)</option><option value="unidades"'+((r.meta_colectiva_modo==='unidades')?' selected':'')+'>Unidades totales (yo defino)</option><option value="puntos"'+((r.meta_colectiva_modo==='puntos')?' selected':'')+'>Puntos totales (yo defino)</option></select></label>'+'<label style="font-size:11px;color:var(--muted)">🎯 Valor de la meta colectiva<input type="number" min="0" value="'+(Number(r.meta_colectiva)||0)+'" '+dis+' onchange="retoSetCampo(\'meta_colectiva\',this.value)" style="'+inp+'"><span style="font-size:9px;color:var(--muted)">Si el modo es \'Porcentaje\', aquí va el % (ej. 75). Si es \'yo defino\', va el número.</span></label>'+
    '<label style="font-size:11px;color:var(--muted)">🏅 Premio del jugador del mes<input type="text" value="'+esc(r.premio_individual||'')+'" '+dis+' placeholder="Por confirmar" onchange="retoSetCampo(\'premio_individual\',this.value)" style="'+inp+'"></label>'+
    '<label style="font-size:11px;color:var(--muted)">🎯 Meta de puntos del día (equipo)<input type="number" min="0" value="'+(Number(r.meta_dia)||0)+'" '+dis+' onchange="retoSetCampo(\'meta_dia\',this.value)" style="'+inp+'"></label>'+
    '<label style="font-size:11px;color:var(--muted)">🎮 Puntos del primer nivel<input type="number" min="100" step="50" value="'+(Number(r.nivel_base)||500)+'" '+dis+' onchange="retoSetCampo(\'nivel_base\',this.value)" style="'+inp+'"><span style="font-size:9px;color:var(--muted)">cada nivel cuesta más que el anterior</span></label>'+
    '<label style="font-size:11px;color:var(--muted)">Estado<div style="margin-top:5px"><button class="btn btn-sm '+(r.activo?'btn-green':'btn-ghost')+'" '+dis+' onclick="retoToggleActivo()">'+(r.activo?'🟢 Activo':'⚪ Inactivo')+'</button></div></label>'+
    '</div>';
  var vchips=r.vendedores.length? r.vendedores.map(function(v){ return '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:999px;padding:4px 8px 4px 10px;margin:0 6px 6px 0"><span style="font-size:18px">'+(v.emoji||'🧑')+'</span><span style="font-size:13px;font-weight:600">'+esc(v.nombre)+'</span>'+(puede?'<button onclick="retoSetEquipo(\''+v.id+'\')" title="personas en el equipo" style="border:1px solid var(--border);background:var(--surface);border-radius:999px;font-size:10px;padding:1px 6px;cursor:pointer;color:var(--muted)">\uD83D\uDC65'+(Number(v.equipo)||1)+'</button>':((Number(v.equipo)||1)>1?'<span style="font-size:10px;color:var(--muted)">\uD83D\uDC65'+v.equipo+'</span>':''))+(puede?'<button onclick="retoDelVendedor(\''+v.id+'\')" style="border:0;background:none;cursor:pointer;color:var(--red);font-size:15px;line-height:1;padding:0 2px">×</button>':'')+'</div>'; }).join('') : '<span style="font-size:12px;color:var(--muted)">Aún no hay vendedores.</span>';
  var vadd=puede?('<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><input type="text" id="reto-vname" placeholder="Nombre del vendedor" onkeydown="if(event.key===\'Enter\')retoAddVendedor()" style="flex:1;min-width:150px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"><input type="number" id="reto-veq" min="1" value="1" title="personas (1=individual, YaPague=3)" style="width:62px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"><button class="btn btn-accent btn-sm" onclick="retoAddVendedor()">+ Agregar</button><button class="btn btn-ghost btn-sm" onclick="retoImportTurnos()" title="Trae los cajeros activos de Farmacia desde Turnos">⬇️ Importar cajeros</button></div>'):'';
  var cVend=vchips+vadd;
  var _mesSel=_retoMesActivo(r); var _showRet=!!(typeof window!=='undefined'&&window._retoShowRet);
  var _enMes=function(m){ var mm=(m.vence&&/^\d{4}-\d{2}$/.test(m.vence))?m.vence:''; return mm?(mm===_mesSel):(_mesSel===_retoMesHoy()); };
  var _medsAdmin=(r.meds||[]).filter(function(m){ return _enMes(m) && (_showRet || !m.retirado); });
  var _nRetMes=(r.meds||[]).filter(function(m){ return _enMes(m) && m.retirado; }).length;
  var puedeMed=false; /* lockdown: medicamentos/metas/puntos solo por Excel */
  var mrows=_medsAdmin.length? _medsAdmin.map(function(m){ var col=_retoCompColor(m.puntos); var ret=!!m.retirado; var venceCell=puedeMed?('<input type="month" value="'+esc(m.vence||'')+'" onchange="retoSetMedVence(\''+m.id+'\',this.value)" style="padding:5px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:11px">'):('<span style="font-size:11px;color:var(--muted)">'+(esc(_retoMesLabel(m.vence||''))||'—')+'</span>');
    var metaCell=puedeMed?('<input type="number" min="0" value="'+(Number(m.meta)||0)+'" onchange="retoSetMedCampo(\''+m.id+'\',\'meta\',this.value)" style="width:62px;padding:5px;text-align:center;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text)">'):(((Number(m.meta)||0)>0?(Number(m.meta)+' u'):'—'));
    var presets=[10,25,50].map(function(p){ return '<button onclick="retoSetMedCampo(\''+m.id+'\',\'puntos\','+p+')" style="border:1px solid var(--border);background:'+((Number(m.puntos)||0)===p?col:'var(--surface2)')+';color:'+((Number(m.puntos)||0)===p?'#fff':'var(--muted)')+';border-radius:5px;padding:2px 6px;font-size:10px;font-weight:700;cursor:pointer">'+p+'</button>'; }).join('');
    var impCell=puedeMed?('<select onchange="retoSetImpulsable(\''+m.id+'\',this.value)" style="padding:4px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:11px"><option value="1"'+(_retoImpulsable(m)?' selected':'')+'>✅ Impulsar</option><option value="0"'+(!_retoImpulsable(m)?' selected':'')+'>🔒 Prescripción</option></select>'):('<span style="font-size:11px;color:'+(_retoImpulsable(m)?'var(--green)':'var(--muted)')+'">'+(_retoImpulsable(m)?'✅ Impulsar':'🔒 Prescripción')+'</span>');
    var ptsCell=puedeMed?('<div style="display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap"><input type="number" min="0" value="'+(Number(m.puntos)||0)+'" onchange="retoSetMedCampo(\''+m.id+'\',\'puntos\',this.value)" style="width:50px;padding:5px;text-align:center;border:1px solid '+col+';border-radius:7px;background:var(--surface);color:'+col+';font-weight:700">'+presets+'</div>'):('<span style="background:'+col+';color:#fff;font-weight:700;font-size:12px;padding:2px 9px;border-radius:999px">'+(Number(m.puntos)||0)+'</span>');
    return '<tr style="border-top:1px solid var(--border);'+(ret?'opacity:.5':'')+'"><td style="padding:6px 8px;font-size:12px;font-weight:600">'+esc(m.nombre)+(ret?' <span style="font-size:9px;background:#fee2e2;color:#b91c1c;padding:1px 6px;border-radius:999px;font-weight:700">retirado</span>':'')+'</td><td style="padding:6px 8px;text-align:center">'+metaCell+'</td><td style="padding:6px 8px;text-align:center">'+venceCell+'</td><td style="padding:6px 8px;text-align:center">'+ptsCell+'</td><td style="padding:6px 8px;text-align:center">'+impCell+'</td>'+(puede?('<td style="padding:6px 8px;text-align:right;white-space:nowrap">'+(ret?'':('<button onclick="retoSorpresaMed(\''+m.id+'\')" title="Marcar como sorpresa de hoy (x2)" style="border:0;background:none;cursor:pointer;font-size:15px;margin-right:2px">🎁</button>'))+'</td>'):'<td></td>')+'</tr>'; }).join('') : '<tr><td colspan="6" style="padding:12px;text-align:center;color:var(--muted);font-size:12px">No hay medicamentos en '+esc(_retoMesLabel(_mesSel))+'.</td></tr>';
  var madd=(false)?('<div style="margin-top:12px;border-top:1px dashed var(--border);padding-top:12px"><div style="font-size:11px;color:var(--muted);margin-bottom:8px">Agregar medicamento:</div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end"><label style="font-size:10px;color:var(--muted);flex:2;min-width:160px">Nombre del medicamento<input type="text" id="reto-mname" style="width:100%;margin-top:3px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label><label style="font-size:10px;color:var(--muted)">Meta (unidades)<input type="number" id="reto-mmeta" min="1" placeholder="0" style="width:100px;margin-top:3px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label><label style="font-size:10px;color:var(--muted)">Vence (mes)<input type="month" id="reto-mvence" value="'+_retoMesActivo(r)+'" style="margin-top:3px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label><label style="font-size:10px;color:var(--muted)">Puntos por unidad<input type="number" id="reto-mpts" min="1" value="10" style="width:110px;margin-top:3px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"></label><label style="font-size:10px;color:var(--muted)">¿Se puede impulsar?<select id="reto-mimp" style="margin-top:3px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)"><option value="1">✅ Sí, se ofrece</option><option value="0">🔒 Solo prescripción</option></select></label><button class="btn btn-accent btn-sm" onclick="retoAddMed()">+ Agregar</button></div></div>'):'';
  var _mesChips=_retoMesesDisponibles(r).map(function(mes){ return '<button class="fchip'+(mes===_mesSel?' active':'')+'" onclick="retoSetMesActivo(\''+mes+'\')" style="font-size:11px">'+esc(_retoMesLabel(mes))+'</button>'; }).join('');
  var _retToggle=_nRetMes?('<button class="fchip'+(_showRet?' active':'')+'" onclick="retoToggleRetirados()" style="font-size:11px" title="Mostrar u ocultar los retirados">🗑️ Retirados ('+_nRetMes+')</button>'):'';
  var _medHeader='<div class="fchips" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><span style="font-size:11px;color:var(--muted);font-weight:700;margin-right:2px">Mes:</span>'+_mesChips+'<span style="flex:1"></span>'+_retToggle+'</div>';
  var cMed=_medHeader+'<div style="font-size:11.5px;color:var(--muted);background:var(--surface2);border:1px dashed var(--border);border-radius:9px;padding:9px 11px;margin-bottom:10px;line-height:1.45">🔒 Los medicamentos, sus <b>metas</b> y <b>puntos</b> se cargan solo por el Excel (botón <b>“Descargar para actualizar”</b> → editas → <b>“Cargar Excel”</b>). Aquí la lista es de <b>solo lectura</b>.</div><div class="twrap"><table style="width:100%"><thead><tr><th style="text-align:left">Medicamento</th><th style="text-align:center">Meta</th><th style="text-align:center">Vence</th><th style="text-align:center">Puntos/unidad</th><th style="text-align:center">¿Impulsar?</th><th></th></tr></thead><tbody>'+mrows+'</tbody></table></div>'+madd;
  var cMat;
  if(!r.vendedores.length || !r.meds.length){
    cMat='<div class="tbox" style="padding:14px;margin-bottom:14px"><div style="font-weight:700;font-size:13px;margin-bottom:10px">📝 Registrar ventas</div><div style="font-size:12px;color:var(--muted);text-align:center;padding:14px">Agrega vendedores (Importar cajeros) y deja al menos un medicamento para registrar ventas.</div></div>';
  } else {
    if(typeof window!=='undefined' && !r.vendedores.some(function(v){return v.id===window._retoVendActivo;})) window._retoVendActivo=r.vendedores[0].id;
    var vAct=(typeof window!=='undefined'&&window._retoVendActivo)?window._retoVendActivo:r.vendedores[0].id;
    var vendSel=r.vendedores.map(function(v){ var act=(v.id===vAct); return '<button onclick="retoSelVend(\''+v.id+'\')" style="display:inline-flex;align-items:center;gap:5px;border:2px solid '+(act?'var(--accent)':'var(--border)')+';background:'+(act?'var(--accent)':'var(--surface)')+';color:'+(act?'#fff':'var(--text)')+';border-radius:999px;padding:5px 12px 5px 9px;margin:0 6px 7px 0;cursor:pointer;font-size:13px;font-weight:600"><span style="font-size:16px">'+(v.emoji||'🧑')+'</span>'+esc(v.nombre)+'</button>'; }).join('');
    var btnSt='width:34px;height:34px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:18px;font-weight:700;cursor:pointer;flex-shrink:0';
    var _im='sumar'; try{ _im=(window._retoInputMode||localStorage.getItem('retoInputMode')||'sumar'); }catch(e){ _im=(window._retoInputMode||'sumar'); } _im=(_im==='total')?'total':'sumar'; if(typeof window!=='undefined')window._retoInputMode=_im;
    var _medMv=function(_m){ return (_m.vence&&/^\d{4}-\d{2}$/.test(_m.vence))?_m.vence:_retoMesHoy(); };
    var medList=r.meds.filter(function(_mm){return !_mm.retirado;}).slice().sort(function(_a,_b){ var _av=_medMv(_a),_bv=_medMv(_b); return _av<_bv?-1:(_av>_bv?1:(String(_a.nombre||'').toLowerCase()<String(_b.nombre||'').toLowerCase()?-1:1)); }).map(function(m){ var cur=Number((r.ventas[vAct]||{})[m.id])||0; var col=_retoCompColor(m.puntos);
      return '<div id="medrow-'+m.id+'" style="display:flex;align-items:center;gap:6px;padding:7px 8px;border-bottom:1px solid var(--border)">'+
        '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.nombre)+(m.permanente?' <span style="font-size:9px;color:#7c3aed;font-weight:700;background:rgba(124,58,237,.12);padding:1px 6px;border-radius:999px">♾️ cada mes</span>':(m.vence?' <span style="font-size:9px;color:var(--accent);font-weight:700;background:rgba(37,99,235,.12);padding:1px 6px;border-radius:999px">'+esc(_retoMesLabel(m.vence))+'</span>':''))+'</div><div style="font-size:10px;color:'+col+';font-weight:700">'+((Number(m.puntos)||0)+' pts/u'+(_retoImpulsable(m)?'':' · 🔒 no cuenta al premio'))+' <span style="color:var(--muted);font-weight:400">· meta '+(Number(m.meta)||0)+(m.permanente&&puede?' <span onclick="retoSetMetaPerma(\''+m.id+'\')" style="cursor:pointer;color:var(--accent);font-weight:700" title="Editar meta">✏️</span>':'')+'</span></div></div>'+
        '<button '+(puede?'':'disabled ')+'onclick="retoStep(\''+vAct+'\',\''+m.id+'\',-1)" style="'+btnSt+'">−</button>'+
        '<span id="cnt-'+vAct+'-'+m.id+'" style="min-width:34px;text-align:center;font-weight:800;font-size:17px;color:'+(cur>0?'var(--green)':'var(--muted)')+';flex-shrink:0">'+cur+'</span>'+
        '<button '+(puede?'':'disabled ')+'onclick="retoStep(\''+vAct+'\',\''+m.id+'\',1)" style="'+btnSt+'">+</button>'+
        '<button '+(puede?'':'disabled ')+'onclick="retoStep(\''+vAct+'\',\''+m.id+'\',5)" style="border:1px solid var(--accent);background:var(--surface);color:var(--accent);border-radius:9px;padding:0 9px;height:34px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">+5</button>'+
        (_im==='total' ? '<input '+(puede?'':'disabled ')+'type="number" min="0" inputmode="numeric" id="inp-'+vAct+'-'+m.id+'" value="'+cur+'" placeholder="total" title="Escribe el TOTAL acumulado" onchange="retoSetCant(\''+vAct+'\',\''+m.id+'\',this.value)" style="width:60px;height:34px;text-align:center;font-weight:700;font-size:14px;border:1.5px solid var(--accent);border-radius:9px;background:var(--surface);color:var(--text);flex-shrink:0">' : '<input '+(puede?'':'disabled ')+'type="number" min="0" inputmode="numeric" id="inp-'+vAct+'-'+m.id+'" value="" placeholder="+ cant" title="Escribe cuantas vendio ahora (se suman)" onchange="retoAddCant(\''+vAct+'\',\''+m.id+'\',this.value)" style="width:60px;height:34px;text-align:center;font-weight:700;font-size:14px;border:1.5px dashed var(--green);border-radius:9px;background:var(--surface);color:var(--text);flex-shrink:0">')+
      '</div>';
    }).join('');
    var actNombre=(r.vendedores.filter(function(v){return v.id===vAct;})[0]||{}).nombre||'';
    cMat='<div class="tbox" style="padding:14px;margin-bottom:14px"><div style="font-weight:700;font-size:13px;margin-bottom:10px">📝 Registrar ventas</div>'+
      '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">1) Elige el cajero:</div><div style="margin-bottom:12px">'+vendSel+'</div>'+
      '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">2) Toca <strong>+</strong> por cada unidad que vendió <strong>'+esc(actNombre)+'</strong>:</div>'+
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:0 0 10px">'+
        '<span style="color:var(--muted);font-size:11px">Casilla derecha:</span>'+
        '<button onclick="_retoSetInputMode(\'sumar\')" style="border:1px solid '+(_im==='sumar'?'var(--green)':'var(--border)')+';background:'+(_im==='sumar'?'var(--green)':'transparent')+';color:'+(_im==='sumar'?'#fff':'var(--muted)')+';border-radius:999px;padding:3px 12px;font-size:11px;font-weight:700;cursor:pointer">➕ Sumar</button>'+
        '<button onclick="_retoSetInputMode(\'total\')" style="border:1px solid '+(_im==='total'?'var(--accent)':'var(--border)')+';background:'+(_im==='total'?'var(--accent)':'transparent')+';color:'+(_im==='total'?'#fff':'var(--muted)')+';border-radius:999px;padding:3px 12px;font-size:11px;font-weight:700;cursor:pointer">✏️ Fijar total</button>'+
        '<span style="color:var(--muted);font-size:10px;width:100%;margin-top:1px">'+(_im==='sumar'?'Escribe cuántas vendió ahora → se suman al total.':'Escribe el total acumulado → reemplaza el número.')+'</span>'+
      '</div>'+
      '<input type="text" id="reto-busca-med" placeholder="🔎 Buscar medicamento…" oninput="retoFiltraMed()" style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">'+
      '<div id="reto-medlist-scroll" style="max-height:430px;overflow-y:auto;border:1px solid var(--border);border-radius:10px">'+medList+'</div>'+
      '<button class="btn btn-green" style="width:100%;margin-top:10px;padding:11px" onclick="_retoConfirmar()">✓ Confirmar y guardar puntos de '+esc(actNombre)+'</button>'+'<div id="reto-guardado" style="text-align:center;font-size:11px;color:var(--green);font-weight:600;margin-top:5px;min-height:14px"></div>'+'<div style="font-size:10px;color:var(--muted);margin-top:4px">Puedes escribir la cantidad directo, o usar −/+/+5. Todo se guarda al instante; al terminar, toca <b>Confirmar</b> para asegurarte.</div></div>';
  }

  var cProg='<div id="reto-prog">'+_retoMedProgressHTML(r)+'</div>';
  var _rankMin=false; try{_rankMin=localStorage.getItem('retoRankMin')==='1';}catch(e){}
  var cRank='<div class="tbox" style="padding:16px"><div id="reto-rank-hd" onclick="_retoToggleRank()" style="display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:14px;cursor:pointer;user-select:none;margin-bottom:'+(_rankMin?'0':'12px')+'"><span>🏅 Tabla de posiciones</span><span id="reto-rank-chev" style="font-size:11px;color:var(--muted);transition:transform .2s;transform:rotate('+(_rankMin?'-90deg':'0deg')+')">▼</span></div><div id="reto-rank" style="'+(_rankMin?'display:none':'')+'">'+_retoRankingHTML(r,false)+'</div></div>';
  var _sorAct=_retoSorpresaHoy(r);
  var cSorpresa = puede ? ('<div class="tbox" style="padding:13px;margin-bottom:14px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b">'+(_sorAct?('<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-size:13px;color:#92400e"><b>🎁 Sorpresa de hoy:</b> '+esc(_sorAct.med.nombre)+' vale <b>x'+_sorAct.mult+'</b></div><div style="display:flex;gap:6px"><button class="btn btn-ghost btn-sm" onclick="retoSortearSorpresa()">🎲 Otro</button><button class="btn btn-ghost btn-sm" onclick="retoQuitarSorpresa()">Quitar</button></div></div>'):('<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-size:13px;color:#92400e">🎁 <b>Cofre sorpresa</b> · sortea un medicamento que hoy valga doble puntos</div><button class="btn btn-sm" style="background:#f59e0b;color:#fff;border:0" onclick="retoSortearSorpresa()">🎲 Sortear</button></div>'))+'</div>') : (_sorAct?('<div class="tbox" style="padding:12px;margin-bottom:14px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;text-align:center;color:#92400e;font-size:13px">🎁 <b>Sorpresa de hoy:</b> '+esc(_sorAct.med.nombre)+' vale <b>x'+_sorAct.mult+'</b></div>'):'');
  var _mesHoy=_retoMesHoy(); var _pendV=r.meds.filter(function(m){ return m.vence && m.vence<_mesHoy && !m.retirado; }); var _bannerVenc=(puede&&_pendV.length)?('<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:12px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div style="font-size:12.5px;color:#9a3412">⚠️ Hay <b>'+_pendV.length+'</b> producto(s) de meses ya vencidos sin cerrar. Al cerrar se registra lo botado y salen de la lista.</div><button class="btn btn-sm" style="background:#ea580c;color:#fff;border:0" onclick="retoCerrarVencidos()">🔒 Cerrar meses vencidos</button></div>'):'';
  var _rsp=_retoScrollParent(el),_rspY=_rsp?_rsp.scrollTop:0,_rmlA=document.getElementById('reto-medlist-scroll'),_rmlY=_rmlA?_rmlA.scrollTop:0;
  el.innerHTML=head+_bannerVenc+_retoMesCardHTML(r)+cSorpresa+cMat+cRank+_retoSec('vend','👥 Vendedores','('+r.vendedores.length+')',cVend)+_retoSec('med','💊 Medicamentos','('+_medsAdmin.length+' · '+_retoMesLabel(_mesSel)+')',cMed)+_retoSec('prog','📊 Avance por medicamento (interno)','',cProg)+_retoSec('nivel','🎁 Premios por nivel','',_retoPremiosNivelHTML(r))+_retoSec('mermas','🗑️ Vencidos / botados','('+(r.mermas||[]).length+')',_retoMermasHTML(r))+_retoSec('cfg','⚙️ Configuración del reto','',cfg);
  var _rr=function(){ try{ if(_rsp)_rsp.scrollTop=_rspY; var _rc=document.getElementById('reto-medlist-scroll'); if(_rc)_rc.scrollTop=_rmlY; }catch(e){} };
  try{ _rr(); requestAnimationFrame(function(){ _rr(); requestAnimationFrame(_rr); }); setTimeout(_rr,0); setTimeout(_rr,60); setTimeout(_rr,160); }catch(e){}
}
function _retoMedProgressHTML(reto){
  var meds=reto.meds||[];
  if(!meds.length) return '<div style="font-size:12px;color:var(--muted);text-align:center;padding:10px">Agrega medicamentos con su meta de unidades.</div>';
  var col=_retoColectivo(reto);
  var barColec=(col.meta>0)?('<div style="margin-bottom:16px;padding:12px;border-radius:12px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-weight:700;font-size:13px;color:#92400e">🎯 Meta colectiva (premio para todos)</span><span style="font-weight:800;font-size:14px;color:#92400e">'+col.pct+'%</span></div><div style="height:12px;border-radius:6px;background:rgba(255,255,255,.6);overflow:hidden"><div style="height:100%;width:'+Math.min(100,col.pct)+'%;background:linear-gradient(90deg,#f59e0b,#ef4444);border-radius:6px"></div></div><div style="font-size:10px;color:#92400e;margin-top:4px">'+col.vendido+' de '+col.meta+' unidades'+(col.pct>=100?' · ¡Meta lograda! 🎉':'')+'</div></div>'):'';
  var mesHoy=(typeof _retoMesHoy==='function')?_retoMesHoy():''; var snap=(reto.meta_snap||{})[mesHoy]||null;
  var nDone=0;
  var rows=meds.map(function(m){ var meta=Number(m.meta)||0; var soldTot=_retoMedSold(reto,m.id); var perma=!!m.permanente;
    var sold=perma?Math.max(0, soldTot-(snap?(Number(snap[m.id])||0):0)):soldTot;
    var pct=meta>0?Math.round(sold/meta*100):0; var done=meta>0&&sold>=meta;
    if(done && !perma){ nDone++; return ''; }
    return '<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:600">'+esc(m.nombre)+(perma?' <span style="font-size:9px;color:#7c3aed;font-weight:700;background:rgba(124,58,237,.12);padding:1px 6px;border-radius:999px">♾️ cada mes</span>':(done?' ✅':''))+'</span><span style="color:var(--muted)">'+sold+(meta>0?(' / '+meta):'')+' u'+(meta>0?(' · '+pct+'%'):' · sin meta')+'</span></div><div style="height:9px;border-radius:5px;background:#e5e7eb;overflow:hidden"><div style="height:100%;width:'+Math.min(100,pct)+'%;background:'+(done?'#22c55e':'linear-gradient(90deg,#6366f1,#22d3ee)')+';border-radius:5px;transition:width .4s"></div></div></div>';
  }).join('');
  var doneNote=nDone?('<div style="font-size:11px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;padding:8px 11px;margin-bottom:12px">✅ <b>'+nDone+'</b> producto(s) ya completado(s) — salieron de esta vista para no saturarla. Siguen en el 📊 <b>Excel de reporte</b> (botón “Exportar Excel” arriba).</div>'):'';
  return barColec+doneNote+(rows||'<div style="font-size:12px;color:var(--muted);text-align:center;padding:10px">🎉 ¡Todo lo de esta lista está completo! El detalle queda en el Excel de reporte.</div>');
}
function _retoRefreshRank(){ var r=_reto(); var rk=document.getElementById('reto-rank'); if(rk) rk.innerHTML=_retoRankingHTML(r,false); }
function _retoToggleRank(){ var el=document.getElementById('reto-rank'); if(!el)return; var min=(el.style.display!=='none'); el.style.display=min?'none':''; var ch=document.getElementById('reto-rank-chev'); if(ch)ch.style.transform=min?'rotate(-90deg)':'rotate(0deg)'; var hd=document.getElementById('reto-rank-hd'); if(hd)hd.style.marginBottom=min?'0':'12px'; try{localStorage.setItem('retoRankMin',min?'1':'0');}catch(e){} }
function retoSetCampo(campo,val){ if(!_retoPuedeEditar())return; var r=_reto(); r[campo]=val; _retoSave(); }
function retoToggleActivo(){ if(!_retoPuedeEditar())return; var r=_reto(); r.activo=!r.activo; _retoSave(); renderReto(); }
function retoReiniciarMed(medId){ if(!_retoPuedeEditar())return; var r=_reto(); var m=(r.meds||[]).filter(function(x){return x.id===medId;})[0]; if(!m)return; if(!confirm('¿Poner en cero las ventas de "'+m.nombre+'"?\n\nSolo se reinicia este medicamento (su meta arranca de nuevo). Las demás ventas y puntos no se tocan.')) return; Object.keys(r.ventas||{}).forEach(function(vid){ if(r.ventas[vid]) delete r.ventas[vid][medId]; }); _retoSave(); renderReto(); showToast&&showToast(m.nombre+' reiniciado a 0'); }
function retoAddVendedor(){ if(!_retoPuedeEditar())return; var i=document.getElementById('reto-vname'); var n=(i&&i.value||'').trim(); if(!n){showToast&&showToast('Escribe un nombre');return;} var r=_reto(); var emoji=RETO_EMOJIS[r.vendedores.length % RETO_EMOJIS.length]; var eq=Math.max(1,parseInt((document.getElementById('reto-veq')||{}).value)||1); r.vendedores.push({id:_retoUID(),nombre:n,emoji:emoji,equipo:eq}); _retoSave(); renderReto(); }
function retoSetEquipo(id){ if(!_retoPuedeEditar())return; var r=_reto(); var v=r.vendedores.filter(function(x){return x.id===id;})[0]; if(!v)return; var n=prompt('\u00bfCu\u00e1ntas personas trabajan aqu\u00ed? (YaPague=3, una caja=1)', String(Number(v.equipo)||1)); if(n===null)return; v.equipo=Math.max(1,parseInt(n)||1); _retoSave(); renderReto(); }
function retoImportTurnos(){ if(!_retoPuedeEditar())return; showToast&&showToast('Cargando cajeros de Farmacia…'); supabaseClient.from('empleados').select('nombre,cargo,empresa,activo').eq('empresa','FARMACIA').order('nombre').then(function(res){ var rows=(res&&res.data)||[]; var r=_reto(); var ex={}; r.vendedores.forEach(function(v){ ex[(v.nombre||'').toLowerCase().trim()]=1; }); var add=0; rows.forEach(function(e){ if(e.activo===false)return; if((e.cargo||'').toLowerCase().indexOf('caja')<0)return; var nm=(e.nombre||'').trim(); if(!nm||nm.toUpperCase()==='NUEVO')return; if(ex[nm.toLowerCase()])return; var emoji=RETO_EMOJIS[r.vendedores.length % RETO_EMOJIS.length]; r.vendedores.push({id:_retoUID(),nombre:nm,emoji:emoji}); ex[nm.toLowerCase()]=1; add++; }); _retoSave(); renderReto(); showToast&&showToast(add>0?('Agregados '+add+' cajeros'):'No hay participantes nuevos por importar'); }).catch(function(){ showToast&&showToast('No se pudo cargar de Turnos'); }); }
function retoDelVendedor(id){ if(!_retoPuedeEditar())return; var r=_reto(); r.vendedores=r.vendedores.filter(function(v){return v.id!==id;}); delete r.ventas[id]; _retoSave(); renderReto(); }
function retoAddMed(){ if(!_retoPuedeEditar())return; var n=(document.getElementById('reto-mname').value||'').trim(); if(!n){showToast&&showToast('Escribe el medicamento');return;} var meta=parseInt(document.getElementById('reto-mmeta').value)||0; var pts=parseInt(document.getElementById('reto-mpts').value)||0; if(meta<=0){showToast&&showToast('Pon la meta de unidades');return;} if(pts<=0){showToast&&showToast('Pon los puntos por unidad');return;} var _im=document.getElementById('reto-mimp'); var imp=!(_im&&_im.value==='0'); var _vv=(document.getElementById('reto-mvence')||{}).value||''; var r=_reto(); r.meds.push({id:_retoUID(),nombre:n,meta:meta,puntos:pts,impulsable:imp,vence:_vv}); _retoSave(); renderReto(); }
function retoSetImpulsable(id,val){ if(!_retoPuedeEditar())return; var r=_reto(); var m=r.meds.filter(function(x){return x.id===id;})[0]; if(!m)return; m.impulsable=(val==='1'||val===1||val===true); _retoSave(); renderReto(); }
function retoSetMedCampo(id,campo,val){ if(!_retoPuedeEditar())return; var r=_reto(); var m=r.meds.filter(function(x){return x.id===id;})[0]; if(!m)return; var n=parseInt(val); if(isNaN(n)||n<0)n=0; m[campo]=n; _retoSave(); renderReto(); }
function retoDelMed(id){ if(!_retoPuedeEditar())return; var r=_reto(); var _m=(r.meds||[]).filter(function(x){return x.id===id;})[0]; if(_m&&_m.permanente){ if(typeof showToast==='function')showToast('Este producto es permanente (aparece todos los meses). No se borra.'); return; } r.meds=r.meds.filter(function(m){return m.id!==id;}); Object.keys(r.ventas).forEach(function(vid){ if(r.ventas[vid]) delete r.ventas[vid][id]; }); _retoSave(); renderReto(); }
function retoSumarVenta(){ if(!_retoPuedeEditar())return; var ve=document.getElementById('reto-sv-vend'), me=document.getElementById('reto-sv-med'), ce=document.getElementById('reto-sv-cant'); var vId=ve&&ve.value, mId=me&&me.value, n=parseInt(ce&&ce.value); if(!vId||!mId){showToast&&showToast('Elige vendedor y medicamento');return;} if(isNaN(n)||n<=0){showToast&&showToast('Pon las unidades vendidas');return;} var r=_reto(); if(!r.ventas[vId])r.ventas[vId]={}; r.ventas[vId][mId]=(Number(r.ventas[vId][mId])||0)+n; try{window._retoLastVend=vId;}catch(e){} _retoSave(); renderReto(); showToast&&showToast('+'+n+' agregado'); }
function retoSelVend(id){ try{window._retoVendActivo=id;}catch(e){} renderReto(); }
function retoStep(vId,mId,delta){ if(!_retoPuedeEditar())return; var r=_reto(); if(!r.ventas[vId])r.ventas[vId]={}; var prev=Number(r.ventas[vId][mId])||0; var cur=prev+delta; if(cur<0)cur=0; if(cur===0)delete r.ventas[vId][mId]; else r.ventas[vId][mId]=cur; var _md=(r.meds||[]).filter(function(x){return x.id===mId;})[0]; var _dp=(Number(_md&&_md.puntos)||0)*(cur-prev); { var _hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); if(_dp!==0){ if(!r.log_dia)r.log_dia={}; if(!r.log_dia[_hoy])r.log_dia[_hoy]={}; r.log_dia[_hoy][vId]=Math.max(0,(Number(r.log_dia[_hoy][vId])||0)+_dp); } if((cur-prev)!==0){ if(!r.u_dia)r.u_dia={}; if(!r.u_dia[_hoy])r.u_dia[_hoy]={}; r.u_dia[_hoy][vId]=Math.max(0,(Number(r.u_dia[_hoy][vId])||0)+(cur-prev)); } } var _sor=_retoSorpresaHoy(r); var _esSor=(_sor && _sor.med.id===mId); if(_esSor && (cur-prev)>0){ var _bn=(Number(_md&&_md.puntos)||0)*(cur-prev)*(_sor.mult-1); if(_bn>0){ if(!r.bonus)r.bonus={}; r.bonus[vId]=(Number(r.bonus[vId])||0)+_bn; } } _retoSave(); if(delta>0){ var _p=(Number(_md&&_md.puntos)||0)*delta; if(_esSor){ _retoPop(mId, '🎁 +'+(_p*_sor.mult)+' pts'); } else { _retoPop(mId, _p>0?('+'+_p+' pts'):'+'+delta); } } var el=document.getElementById('cnt-'+vId+'-'+mId); if(el){ if(el.tagName==='INPUT') el.value=cur; else el.textContent=cur; try{el.style.color=(cur>0?'var(--green)':'var(--muted)');}catch(e){} } var _ie=document.getElementById('inp-'+vId+'-'+mId); if(_ie && window._retoInputMode==='total') _ie.value=cur; _retoRefreshRank(); var pr=document.getElementById('reto-prog'); if(pr)pr.innerHTML=_retoMedProgressHTML(r); }
function retoSetCant(vId,mId,val){ if(!_retoPuedeEditar())return; var n=parseInt(val); if(isNaN(n)||n<0)n=0; var r=_reto(); if(!r.ventas[vId])r.ventas[vId]={}; var prev=Number(r.ventas[vId][mId])||0; if(n===prev)return; if(n===0)delete r.ventas[vId][mId]; else r.ventas[vId][mId]=n; var _md=(r.meds||[]).filter(function(x){return x.id===mId;})[0]; var _dp=(Number(_md&&_md.puntos)||0)*(n-prev); { var _hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); if(_dp!==0){ if(!r.log_dia)r.log_dia={}; if(!r.log_dia[_hoy])r.log_dia[_hoy]={}; r.log_dia[_hoy][vId]=Math.max(0,(Number(r.log_dia[_hoy][vId])||0)+_dp); } if((n-prev)!==0){ if(!r.u_dia)r.u_dia={}; if(!r.u_dia[_hoy])r.u_dia[_hoy]={}; r.u_dia[_hoy][vId]=Math.max(0,(Number(r.u_dia[_hoy][vId])||0)+(n-prev)); } } _retoSave(); var el=document.getElementById('cnt-'+vId+'-'+mId); if(el){ if(el.tagName==='INPUT')el.value=n; else el.textContent=n; try{el.style.color=(n>0?'var(--green)':'var(--muted)');}catch(e){} } var _ie=document.getElementById('inp-'+vId+'-'+mId); if(_ie && window._retoInputMode==='total') _ie.value=n; _retoRefreshRank(); var pr=document.getElementById('reto-prog'); if(pr)pr.innerHTML=_retoMedProgressHTML(r); }
function retoAddCant(vId,mId,val){ if(!_retoPuedeEditar())return; var n=parseInt(val); var e=document.getElementById('inp-'+vId+'-'+mId); if(isNaN(n)||n<=0){ if(e)e.value=''; return; } retoStep(vId,mId,n); if(e)e.value=''; }
function _retoSetInputMode(m){ window._retoInputMode=(m==='total')?'total':'sumar'; try{localStorage.setItem('retoInputMode',window._retoInputMode);}catch(e){} renderReto(); }
function _retoConfirmar(){ if(!_retoPuedeEditar())return; _retoSave(true); var el=document.getElementById('reto-guardado'); var h=new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}); if(el)el.textContent='✓ Guardado a las '+h; if(typeof showToast==='function')showToast('✓ Puntos guardados'); }
function retoFiltraMed(){ var q=((document.getElementById('reto-busca-med')||{}).value||'').toLowerCase().trim(); var r=_reto(); r.meds.forEach(function(m){ var row=document.getElementById('medrow-'+m.id); if(!row)return; row.style.display=(!q||(m.nombre||'').toLowerCase().indexOf(q)>=0)?'':'none'; }); }
function retoSetVenta(vId,mId,val){ if(!_retoPuedeEditar())return; var r=_reto(); if(!r.ventas[vId])r.ventas[vId]={}; var n=parseInt(val); if(isNaN(n)||n<0)n=0; if(n===0)delete r.ventas[vId][mId]; else r.ventas[vId][mId]=n; _retoSave(); _retoRefreshRank(); var pc=document.getElementById('reto-prog'); }
function _retoLoadQR(cb){ if(window.QRCode)return cb(true); var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; s.onload=function(){cb(true);}; s.onerror=function(){cb(false);}; document.head.appendChild(s); }
function _retoQRModal(url, titulo, sub){
  var old=document.getElementById('reto-qr-modal'); if(old)old.remove();
  var m=document.createElement('div'); m.id='reto-qr-modal'; m.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML='<div style="background:var(--surface);border-radius:18px;padding:24px;max-width:340px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.4)"><div style="font-weight:800;font-size:17px">'+titulo+'</div><div style="font-size:12px;color:var(--muted);margin:4px 0 16px">'+sub+'</div><div id="reto-qr-box" style="display:flex;justify-content:center;align-items:center;min-height:200px;background:#fff;border-radius:12px;padding:10px"><span style="color:#888;font-size:12px">Generando QR…</span></div><div style="font-size:11px;color:var(--muted);margin:14px 0;word-break:break-all">'+esc(url)+'</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" onclick="(navigator.clipboard&&navigator.clipboard.writeText(\''+url+'\'));showToast&&showToast(\'Link copiado\')">Copiar link</button><button class="btn btn-accent btn-sm" onclick="document.getElementById(\'reto-qr-modal\').remove()">Cerrar</button></div></div>';
  document.body.appendChild(m);
  _retoLoadQR(function(ok){ var box=document.getElementById('reto-qr-box'); if(!box)return; if(ok&&window.QRCode){ box.innerHTML=''; try{ new QRCode(box,{text:url,width:200,height:200,correctLevel:QRCode.CorrectLevel.M}); }catch(e){ box.innerHTML='<span style="color:#888;font-size:12px">Usa el link de abajo</span>'; } } else { box.innerHTML='<span style="color:#888;font-size:12px">Sin internet para el QR. Comparte el link de abajo.</span>'; } });
}
function retoMostrarQR(){ _retoQRModal(_retoURL(), '🏆 Reto de Ventas', 'Los vendedores escanean para ver la tabla de posiciones (sin login)'); }
function retoMostrarQRSup(){ _retoQRModal(location.origin+location.pathname, '👤 Ingreso supervisor', 'Escanea para abrir la app e iniciar sesión (Paul o Angélica)'); }


/* ====== Aviso global de autoguardado ====== */
function _flashGuardado(state){
  if(typeof document==='undefined'||!document.body)return;
  var b=document.getElementById('save-badge');
  if(!b){ b=document.createElement('div'); b.id='save-badge'; b.style.cssText='position:fixed;bottom:70px;right:14px;z-index:99998;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.18);transition:opacity .3s ease;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;opacity:0'; document.body.appendChild(b); }
  if(state==='guardando'){ b.textContent='Guardando…'; b.style.background='#475569'; b.style.color='#fff'; }
  else if(state==='local'){ b.textContent='Guardado en el equipo'; b.style.background='#f59e0b'; b.style.color='#fff'; }
  else { b.textContent='Guardado ✓'; b.style.background='#22c55e'; b.style.color='#fff'; }
  b.style.opacity='1';
  try{ clearTimeout(window._saveBadgeT); }catch(e){}
  try{ window._saveBadgeT=setTimeout(function(){ b.style.opacity='0'; }, state==='guardando'?2600:1500); }catch(e){}
}

/* ================= PLAN DE PAGO A PROVEEDORES (12 meses) ================= */
var _cxpVista='lista'; var _cxpMes=null; var _cxpEmp='all';
var _MES3CXP=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

/* ===== Celebración de cierre del reto (TV) ===== */

/* Corrección única jul-2026: restaura metas pre-import y excluye lo que entró el 30/07 */
function _retoFixJul26(){
  try{
    var r=_reto(); if(r.fix_jul2026||window._fixJulT)return; window._fixJulT=true;
    supabaseClient.from('app_sections').select('data').eq('section_name','backup_auto_20260730').maybeSingle().then(function(res){
      var secs=(res&&res.data&&res.data.data&&res.data.data.app_sections)||[]; var reto0=null;
      secs.forEach(function(x){ if(x&&x.section_name==='reto')reto0=x.data; });
      if(!reto0){ window._fixJulT=false; return; }
      var bk={}; (reto0.meds||[]).forEach(function(m){ if((m.vence||'')==='2026-07')bk[m.id]={meta:Number(m.meta)||0}; });
      var r2=_reto(); var rest=0, exc=0;
      (r2.meds||[]).forEach(function(m){
        if((m.vence||'')!=='2026-07')return;
        if(bk[m.id]){ if(Number(m.meta)!==bk[m.id].meta){ m.meta=bk[m.id].meta; rest++; } if(m.no_participa){ delete m.no_participa; m.impulsable=true; } }
        else if(!m.no_participa){ m.no_participa=true; m.impulsable=false; exc++; }
      });
      r2.fix_jul2026=true; _retoSave(true);
      if(typeof logAudit==='function')logAudit('reto.fix_jul2026',rest+' metas restauradas · '+exc+' excluidos');
      if(typeof showToast==='function')showToast('🧹 Julio depurado: '+rest+' metas originales restauradas · '+exc+' productos de hoy excluidos');
      try{ if(typeof activeTab!=='undefined'&&activeTab==='reto')renderReto(); }catch(e){}
    });
  }catch(e){}
}

function retoCelebProgramar(){
  if(!_retoPuedeEditar())return;
  var r=_reto();
  var f=prompt('¿Qué día se muestra la celebración en la TV? (AAAA-MM-DD)', (r.celebracion&&r.celebracion.fecha)||'2026-07-31');
  if(!f||!/^\d{4}-\d{2}-\d{2}$/.test(f)){ if(f!==null)showToast&&showToast('Formato: AAAA-MM-DD'); return; }
  var mDef=(r.celebracion&&(r.celebracion.meses||[]).join(','))||'2026-07';
  var ms=prompt('¿Qué meses del reto se combinan para las cifras? (separados por coma)', mDef);
  if(ms===null)return;
  var meses=ms.split(',').map(function(x){return x.trim();}).filter(function(x){return /^\d{4}-\d{2}$/.test(x);});
  if(!meses.length){ showToast&&showToast('Meses en formato AAAA-MM'); return; }
  var pDef=(r.premios_mes||{})[meses[0]]||'';
  var pr=prompt('¿Cuál fue el premio de ese reto? (ej: Pizzas 🍕)', pDef);
  if(pr===null)return;
  pr=String(pr).trim();
  r.premios_mes=r.premios_mes||{};
  if(pr) meses.forEach(function(m){ r.premios_mes[m]=pr; });
  var tDef=(r.celebracion&&r.celebracion.top&&r.celebracion.top.length)?r.celebracion.top.map(function(t){return t.nombre+':'+t.pts;}).join(', '):'';
  var tv=prompt('Ganadores manuales (opcional). Formato: NOMBRE:puntos, NOMBRE:puntos\nDéjalo VACÍO para calcularlos automático del registro diario.', tDef);
  if(tv===null)return;
  var topM=String(tv).split(',').map(function(x){ var pp=x.split(':'); var n=(pp[0]||'').trim(); if(!n)return null; return {nombre:n, pts:Number(String(pp[1]||'').replace(/[^\d]/g,''))||0}; }).filter(Boolean).slice(0,3);
  var eDef=(r.celebracion&&r.celebracion.estrella&&r.celebracion.estrella.nombre)?(r.celebracion.estrella.nombre+(r.celebracion.estrella.unidades?(':'+r.celebracion.estrella.unidades):'')):'';
  if(!eDef){ try{ var _stSug=_retoCelebStats(r,meses); if(_stSug.topMed)eDef=_stSug.topMed.nombre+':'+_stSug.topMedU; }catch(_ee){} }
  var ev=prompt('Producto estrella del reto (opcional). Formato: NOMBRE o NOMBRE:unidades\nDéjalo VACÍO para no mostrarlo. Sugerido según los medicamentos de ese mes:', eDef);
  if(ev===null)return;
  var estrella=null; ev=String(ev).trim();
  if(ev){ var ep=ev.split(':'); estrella={nombre:(ep[0]||'').trim(), unidades:Number(String(ep[1]||'').replace(/[^\d]/g,''))||0}; }
  r.celebracion={activa:true,fecha:f,meses:meses,top:(topM.length?topM:null),estrella:estrella};
  _retoSave(); showToast&&showToast('🎉 Celebración programada para '+f+' ('+meses.join(' + ')+')'+(pr?(' · premio: '+pr):''));
  if(window._retoRepaint)window._retoRepaint();
}
function retoCelebQuitar(){ if(!_retoPuedeEditar())return; var r=_reto(); r.celebracion=null; _retoSave(); showToast&&showToast('Celebración desactivada'); if(window._retoRepaint)window._retoRepaint(); }
function _retoCelebStats(r,meses){
  var sold=0,goal=0;
  meses.forEach(function(m){ var c=_retoColectivoMes(r,m); sold+=c.sold; goal+=c.goal; });
  var pts={}; (r.vendedores||[]).forEach(function(v){ var t=0; meses.forEach(function(m){ t+=_retoPuntosMes(r,m,v.id); }); pts[v.id]=Math.round(t/Math.max(1,Number(v.equipo)||1)); });
  var top=(r.vendedores||[]).map(function(v){ return {nombre:v.nombre,pts:pts[v.id]||0}; }).sort(function(a,b){return b.pts-a.pts;}).slice(0,3).filter(function(x){return x.pts>0;});
  var meds=[]; meses.forEach(function(m){ meds=meds.concat(_retoMedsDelMes(r,m)); });
  var topMed=null,tu=0; meds.forEach(function(m){ var u=_retoMedSold(r,m.id); if(u>tu){tu=u;topMed=m;} });
  var pct=goal>0?Math.round(Math.min(sold,goal)/goal*100):0;
  return {sold:sold,goal:goal,pct:pct,reached:(goal>0&&sold>=goal),top:top,topMed:topMed,topMedU:tu};
}
function _retoCelebShow(force){
  try{
    var r=(window._retoLastReto)||_reto(); var c=r.celebracion;
    if(!force){ if(!c||!c.activa)return; if(!window._retoTVon)return; if(HOY()!==c.fecha)return; }
    if(!c){ showToast&&showToast('Primero programa la celebración (🎉)'); return; }
    if(document.getElementById('reto-celeb-ov'))return;
    var st=_retoCelebStats(r,c.meses||[]);
    if(c.top&&c.top.length)st.top=c.top.slice(0,3);
    if(c.estrella&&c.estrella.nombre){ st.topMed={nombre:c.estrella.nombre}; st.topMedU=Number(c.estrella.unidades)||0; }
    var _MN=['','ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    var mesesTit=(c.meses||[]).map(function(m){ return _MN[parseInt(String(m).slice(5,7))]||''; }).filter(Boolean).join(' + ');
    var mesesLbl=(c.meses||[]).map(function(m){ return (typeof _retoMesLabel==='function')?_retoMesLabel(m):m; }).join(' + ');
    var premios=(c.meses||[]).map(function(m){ return (r.premios_mes||{})[m]; }).filter(Boolean);
    if(!premios.length && r.premio_colectivo)premios=[r.premio_colectivo];
    var MED=['🥇','🥈','🥉'];
    var topHtml=st.top.map(function(v,i){ return '<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:14px;padding:10px 18px;font-size:clamp(16px,2.2vw,26px)"><span style="font-size:clamp(22px,3vw,36px)">'+MED[i]+'</span><b>'+esc(v.nombre)+'</b><span style="margin-left:auto;font-weight:900">'+_retoFnum(v.pts)+' pts</span></div>'; }).join('');
    var ov=document.createElement('div'); ov.id='reto-celeb-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:100060;display:flex;align-items:center;justify-content:center;padding:3vw;background:radial-gradient(ellipse at center,rgba(30,20,70,.94),rgba(0,0,0,.97));cursor:pointer;animation:rspfade .6s ease';
    ov.innerHTML='<div style="text-align:center;max-width:900px;width:100%">'+
      '<div style="font-size:clamp(50px,9vh,110px);line-height:1">🏆</div>'+
      '<div style="font-size:clamp(30px,6vw,72px);font-weight:900;color:#fff;letter-spacing:1px;text-shadow:0 4px 24px rgba(245,158,11,.55);margin-top:6px">'+(mesesTit?('¡RETO DE '+mesesTit+' CONSEGUIDO!'):'¡RETO CONSEGUIDO!')+'</div>'+
      '<div style="font-size:clamp(16px,2.4vw,28px);color:#fbbf24;font-weight:800;margin-top:6px">FELICITACIONES A TODO EL EQUIPO 👏</div>'+
      (premios.length?('<div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-weight:900;font-size:clamp(15px,2.2vw,26px);padding:8px 26px;border-radius:999px;margin-top:14px;box-shadow:0 10px 34px rgba(245,158,11,.45)">🎁 '+esc(premios.join(' · '))+'</div>'):'')+
      (topHtml?('<div style="color:rgba(255,255,255,.85);font-weight:800;font-size:clamp(13px,1.8vw,20px);margin:18px 0 8px;letter-spacing:1.5px">⭐ MEJORES VENDEDORES</div><div style="display:flex;flex-direction:column;gap:8px;color:#fff;max-width:560px;margin:0 auto">'+topHtml+'</div>'):'')+
      (st.topMed?('<div style="color:rgba(255,255,255,.8);font-size:clamp(13px,1.8vw,20px);margin-top:16px">💊 Producto estrella: <b style="color:#fff">'+esc(st.topMed.nombre)+'</b>'+(st.topMedU?(' · '+_retoFnum(st.topMedU)+' unidades'):'')+'</div>'):'')+
      '<div style="color:rgba(255,255,255,.45);font-size:12px;margin-top:18px">toca para cerrar</div></div>';
    ov.addEventListener('click',function(){ try{ov.remove();}catch(e){} });
    document.body.appendChild(ov);
    try{ if(typeof _retoFanfare==='function')_retoFanfare(); }catch(e){}
    try{ var W=window.innerWidth,H=window.innerHeight; [[.5,.3,300],[.25,.45,900],[.75,.45,900],[.5,.55,1600],[.35,.3,2300],[.65,.3,2300]].forEach(function(p){ setTimeout(function(){ try{_retoConfetti(W*p[0],H*p[1]);}catch(e){} },p[2]); }); }catch(e){}
    try{ if(window.twemoji) twemoji.parse(ov,{folder:'svg',ext:'.svg',base:'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'}); }catch(e){}
  }catch(e){}
}
