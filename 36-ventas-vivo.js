/* ══════════════════════════════════════════════════════════════
   36 · VENTAS EN VIVO  (tablero de la farmacia en tiempo real)
   Top de productos y ventas del día (12 a 12) y de la semana (lun-dom).
   Datos: op-api / op_farmacia_top (inventario A2). Solo lectura.
   Módulo autónomo: no modifica los demás; envuelve renderTab.
   ══════════════════════════════════════════════════════════════ */
(function(){
  var SUPA_FN='https://unuumkcapdtqmbwefbfg.supabase.co/functions/v1';
  var ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudXVta2NhcGR0cW1id2VmYmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTgxMDUsImV4cCI6MjA5NTk5NDEwNX0.TMQ_YgWlNXrBboJcg5YfS6359Fhw6zv_N10K5m_xtrE';
  var TK='op_stk_5r8w2q7t';
  var VVPIN='4590';            // PIN de solo-lectura del tablero
  var vvData=null, vvPer='dia', vvTimer=null, vvCargando=false;

  var fmt=function(n){return (Number(n)||0).toLocaleString('es-VE');};
  var bs=function(n){return 'Bs '+Math.round(Number(n)||0).toLocaleString('es-VE');};
  var esc=function(s){return String(s==null?'':s).replace(/</g,'&lt;').replace(/>/g,'&gt;');};

  // Registrar el permiso de rol (gerente y admin) sin tocar el core
  try{ if(typeof TAB_ROLES!=='undefined' && !TAB_ROLES['ventasvivo']) TAB_ROLES['ventasvivo']=['gerente','admin','supervisor']; }catch(e){}

  // Envolver renderTab de forma aditiva
  if(typeof window.renderTab==='function' && !window._vvWrapped){
    var _origRenderTab=window.renderTab;
    window.renderTab=function(tab){
      if(tab==='ventasvivo'){ vvStart(); renderVentasVivo(); if(typeof renderBadges==='function'){try{renderBadges();}catch(e){}} return; }
      vvStop();
      return _origRenderTab.apply(this, arguments);
    };
    window._vvWrapped=true;
  }

  function vvStart(){ vvStop(); vvTimer=setInterval(function(){ try{ if(typeof activeTab!=='undefined' && activeTab==='ventasvivo') vvCargar(); }catch(e){} }, 60000); }
  function vvStop(){ if(vvTimer){ clearInterval(vvTimer); vvTimer=null; } }

  window.vvSetPer=function(p){ vvPer=(p==='sem')?'sem':'dia'; vvRender(); };
  window.renderVentasVivo=function(){ vvRender(); vvCargar(); };

  function vvCargar(){
    if(vvCargando) return; vvCargando=true;
    fetch(SUPA_FN+'/op-api',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+ANON},
      body:JSON.stringify({token:TK, pin:VVPIN, action:'farmacia_top', limit:15})})
    .then(function(r){return r.json();})
    .then(function(d){ vvCargando=false; if(d && d.ok){ vvData=d; vvRender(); } })
    .catch(function(){ vvCargando=false; });
  }

  function vvLista(arr, conMonto){
    if(!arr || !arr.length) return '<div style="color:var(--muted);padding:8px 0">Sin ventas en esta ventana.</div>';
    return arr.map(function(r,i){
      var val = conMonto ? bs(r.monto||0) : (fmt(r.uds||0)+' uds');
      var sub = conMonto ? (fmt(r.uds||0)+' uds') : (r.monto!=null?bs(r.monto):'');
      return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">'
        + '<div style="width:22px;text-align:center;font-weight:800;color:var(--muted)">'+(i+1)+'</div>'
        + '<div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--text)">'+esc(r.descripcion||r.codigo)+'</div>'
        + '<div style="font-size:12px;color:var(--muted)">'+sub+'</div></div>'
        + '<div style="font-weight:800;white-space:nowrap;color:var(--text)">'+val+'</div></div>';
    }).join('');
  }

  function kpi(label, val){
    return '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px">'
      + '<div style="font-size:12px;color:var(--muted)">'+label+'</div>'
      + '<div style="font-size:22px;font-weight:800;color:var(--text);margin-top:2px">'+val+'</div></div>';
  }

  function vvRender(){
    var box=document.getElementById('ventasvivo-content'); if(!box) return;
    var d=vvData;
    var diaU = d? fmt(d.dia_uds)+' uds' : '—';
    var semU = d? fmt(d.sem_uds)+' uds' : '—';
    var diaB = d? (d.con_precio? bs(d.dia_monto):'Bs —') : '—';
    var semB = d? (d.con_precio? bs(d.sem_monto):'Bs —') : '—';
    var upd = d? ('Actualizado a las '+new Date(d.ahora||Date.now()).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'})+' · se refresca solo cada minuto') : 'Cargando…';
    var tu = d? (vvPer==='sem'? d.top_sem_uds : d.top_dia_uds) : [];
    var tm = d? (vvPer==='sem'? d.top_sem_monto : d.top_dia_monto) : [];
    var onDia = vvPer==='dia', onSem = vvPer==='sem';
    var segBtn=function(on,txt,per){ return '<button onclick="vvSetPer(\''+per+'\')" style="background:'+(on?'var(--primary)':'transparent')+';color:'+(on?'#fff':'var(--muted)')+';border:0;padding:8px 20px;font:inherit;font-weight:700;cursor:pointer">'+txt+'</button>'; };
    var notaMonto = (d && d.con_precio) ? vvLista(tm,true) : '<div style="color:var(--muted);padding:8px 0">Faltan precios para el top por monto.</div>';

    box.innerHTML =
      '<p class="section-title">Ventas en Vivo · Farmacia</p>'
      + '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--sh-1);padding:16px;margin-bottom:14px">'
        + '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Día: de medianoche a medianoche · Semana: de lunes a domingo</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">'
          + kpi('Hoy · unidades', diaU) + kpi('Hoy · ventas (Bs)', diaB)
          + kpi('Semana · unidades', semU) + kpi('Semana · ventas (Bs)', semB)
        + '</div>'
        + '<div style="font-size:12px;color:var(--muted);margin-top:10px">'+upd+'</div>'
        + '<div style="margin-top:10px"><button onclick="renderVentasVivo()" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 14px;font:inherit;font-weight:700;cursor:pointer;color:var(--text)">↻ Actualizar</button></div>'
      + '</div>'
      + '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--sh-1);padding:16px">'
        + '<div style="display:inline-flex;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:14px">'
          + segBtn(onDia,'Hoy','dia') + segBtn(onSem,'Semana','sem')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px" class="vv-cols">'
          + '<div><div style="font-weight:700;margin-bottom:4px;color:var(--text)">🏆 Top por unidades</div>'+vvLista(tu,false)+'</div>'
          + '<div><div style="font-weight:700;margin-bottom:4px;color:var(--text)">💵 Top por monto (Bs)</div>'+notaMonto+'</div>'
        + '</div>'
        + '<div style="font-size:12px;color:var(--muted);margin-top:10px">'+(vvPer==='sem'?'Semana en curso (lunes a domingo).':'Día de hoy (medianoche a medianoche).')+' Los datos vienen de A2 según sincroniza el sistema (cada ~15 min).</div>'
      + '</div>'
      + '<style>@media(max-width:760px){#ventasvivo-content .vv-cols{grid-template-columns:1fr!important} #ventasvivo-content div[style*="grid-template-columns:1fr 1fr 1fr 1fr"]{grid-template-columns:1fr 1fr!important}}</style>';
  }
})();
