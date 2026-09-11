/* ===== Mapa del sistema (vista Jarvis en Admin Panel) — prefijo _map ===== */
var _mapDatos={cierres:'…',firmas:'…',ventaBs:'…',ventaUsd:'…',banco:'…',tasa:'…'};
function _mapCargar(cb){
  var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
  var done=0, fin=function(){ done++; if(done>=3&&cb)cb(); };
  supabaseClient.from('cierres_caja').select('id,estado').eq('fecha',hoy).eq('empresa','farmacia').then(function(r){
    var l=(r&&r.data)||[]; _mapDatos.cierres=l.length;
    var ids=l.map(function(c){return c.id;});
    if(ids.length){ supabaseClient.from('cierre_firmas').select('id').in('cierre_id',ids).then(function(){ fin(); }); } else fin();
  });
  supabaseClient.from('ventas_diarias').select('total_bs,total_usd,tasa').eq('fecha',hoy).then(function(r){
    var v=((r&&r.data)||[])[0]; if(v){ _mapDatos.ventaBs=Math.round(v.total_bs||0).toLocaleString('es-VE'); _mapDatos.ventaUsd=Math.round(v.total_usd||0).toLocaleString('es-VE'); _mapDatos.tasa=v.tasa||'—'; } else { _mapDatos.ventaBs='0'; _mapDatos.ventaUsd='0'; } fin();
  });
  supabaseClient.from('app_sections').select('data').eq('section_name','caja_cfg').maybeSingle().then(function(r){
    _mapDatos.banco=(r&&r.data&&r.data.data&&r.data.data.banco_prior)||'—'; fin();
  });
}
function _mapCol(icono,titulo,color,items){
  var filas=items.map(function(it){ return '<div style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:6px 9px;font-size:11px;color:#cdd3e1"><span style="width:6px;height:6px;border-radius:50%;background:'+(it[1]||'#22c55e')+';box-shadow:0 0 6px '+(it[1]||'#22c55e')+';flex:none"></span>'+it[0]+'</div>'; }).join('');
  return '<div style="background:rgba(255,255,255,.03);border:1px solid '+color+'55;border-radius:14px;padding:10px;min-width:150px;flex:1">'+
    '<div style="font-size:11px;font-weight:800;color:'+color+';letter-spacing:.6px;margin-bottom:8px;text-transform:uppercase">'+icono+' '+titulo+'</div>'+
    '<div style="display:flex;flex-direction:column;gap:5px">'+filas+'</div></div>';
}
function _mapHTML(){
  var d=_mapDatos;
  var ver=(document.getElementById('ver-badge')||{}).textContent||'';
  var estado='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">'+
    '<div><div style="font-size:19px;font-weight:900;color:#e8ecf5">CLARET CORE</div><div style="font-size:11px;color:#7b8496;letter-spacing:1.5px">SISTEMA CENTRAL · '+ver+' · 22 MÓDULOS</div></div>'+
    '<div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.35);border-radius:12px;padding:8px 14px;font-size:11.5px;color:#4ade80;font-weight:700">● ESTADO: OPERATIVO &nbsp;·&nbsp; Cierres hoy: '+d.cierres+' &nbsp;·&nbsp; Bs '+d.ventaBs+' · $ '+d.ventaUsd+' &nbsp;·&nbsp; Tasa: '+d.tasa+' &nbsp;·&nbsp; Banco prioritario: '+d.banco+'</div></div>';
  var G='#22c55e', A='#f59e0b';
  var cols1=
    _mapCol('🏪','Cajas','#60a5fa',[['Cierre 6 cajas + YaPagué'],['Firmas supervisor'],['Relevos con trazabilidad'],['Dictado por voz'],['Cuadre fiscal (Z)'],['Caja metálica $']])+
    _mapCol('🏦','Conciliación','#a78bfa',[['Transferencias del mes'],['Parsers 8 bancos'],['Matching ref+día hábil'],['Vínculo manual'],['Export reporte']])+
    _mapCol('🏆','Ventas','#f472b6',[['Reto de ventas + TV'],['Consolidado diario $'],['Lista de precios'],['Calculadora']])+
    _mapCol('📦','Inventario','#fbbf24',[['Vencimientos'],['REMATAR / AL RETO / VIGILAR'],['Compras · precios'],['Puente A2',A]]);
  var cols2=
    _mapCol('🤝','Clientes','#34d399',[['CRM seguimiento (Nilsa)'],['Oportunidades venc.'],['Cuentas por cobrar']])+
    _mapCol('📊','Gerencia','#38bdf8',[['Pulso de hoy'],['Control interno (anomalías)'],['Asistente de consultas'],['Mes en dólares']])+
    _mapCol('💳','Pagos','#fb923c',[['Facturas y abonos'],['Préstamos'],['Calendario de pagos'],['Bancos y verificación']])+
    _mapCol('🛡️','Infraestructura','#94a3b8',[['Supabase + Realtime'],['Push notificaciones'],['Backup JSON',A],['Zona de peligro'],['Verificador + Graphify']]);
  var nucleo='<div style="text-align:center;margin:16px 0"><div style="display:inline-block;background:linear-gradient(140deg,#1E2E52,#1E38A6 55%,#2B47C4);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:10px 26px;color:#fff;font-weight:900;letter-spacing:1px;box-shadow:0 0 30px rgba(43,71,196,.45)">⚛ ORQUESTADOR CENTRAL<div style="font-size:10px;font-weight:600;opacity:.75;letter-spacing:.5px">navegación · permisos · roles · tasa BCV</div></div></div>';
  return '<div style="background:linear-gradient(160deg,#0b0f1c,#101729 60%,#0b0f1c);border-radius:18px;padding:18px;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:34px 34px">'+
    estado+nucleo+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'+cols1+'</div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap">'+cols2+'</div>'+
    '<div style="text-align:center;font-size:10.5px;color:#5b6475;margin-top:12px">🟢 operativo · 🟠 pendiente/manual · Datos en vivo del día · El grafo completo del código está en graph.html (Graphify)</div></div>';
}
function renderMapaSistema(){
  var el=document.getElementById('admin-inner'); if(!el)return;
  el.innerHTML='<div style="padding:20px;color:var(--muted)">Cargando mapa…</div>';
  _mapCargar(function(){ var e2=document.getElementById('admin-inner'); if(e2 && adminTab==='mapa') e2.innerHTML=_mapHTML(); });
}
