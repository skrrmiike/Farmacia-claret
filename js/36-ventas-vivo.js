/* ══════════════════════════════════════════════════════════════
   36 · VENTAS EN VIVO — tablero del gerente (José)
   Ventas diarias, top productos y categorías de la farmacia, en UNIDADES (datos de A2).
   Fuente: RPC gerente_ventas_farmacia() (SECURITY DEFINER) sobre inv_movimientos.
   Prefijo de funciones: _vv
   ══════════════════════════════════════════════════════════════ */
(function(){
  var _vvData = null, _vvMetric = 'uds';

  function _vvNum(n){ return (Number(n)||0).toLocaleString('es-VE'); }
  function _vvEsc(s){ return String(s==null?'':s).replace(/[<>&"']/g,function(c){return({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c];}); }
  function _vvDia(iso){ var s=String(iso||'').slice(0,10); return s.slice(8,10)+'/'+s.slice(5,7); }

  function _vvShell(msg){
    return '<div class="vv-wrap"><style>'+_vvCSS()+'</style>'+
      '<div class="vv-note" style="margin:20px 0">'+_vvEsc(msg)+'</div></div>';
  }
  function _vvCSS(){ return [
    '#ventasvivo-content .vv-wrap{max-width:760px;margin:0 auto;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
    '#ventasvivo-content .vv-h{font-size:18px;font-weight:800;letter-spacing:-.3px;margin:2px 0 2px}',
    '#ventasvivo-content .vv-sub{font-size:12px;color:#64748b;margin-bottom:12px}',
    '#ventasvivo-content .vv-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}',
    '#ventasvivo-content .vv-kpi{background:#f1f5f9;border-radius:12px;padding:10px 12px}',
    '#ventasvivo-content .vv-kpi .l{font-size:11px;color:#64748b}',
    '#ventasvivo-content .vv-kpi .v{font-size:20px;font-weight:800;letter-spacing:-.4px;margin-top:1px;color:#0f172a}',
    '#ventasvivo-content .vv-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:13px;margin:0 0 12px;box-shadow:0 1px 2px rgba(0,0,0,.04)}',
    '#ventasvivo-content .vv-card h3{font-size:12px;margin:0 0 8px;color:#475569;text-transform:uppercase;letter-spacing:.4px;font-weight:700}',
    '#ventasvivo-content .vv-svg svg{display:block;width:100%;height:auto;overflow:visible}',
    '#ventasvivo-content .vv-bar:hover{opacity:.78}',
    '#ventasvivo-content .vv-ax{stroke:#e5e7eb}',
    '#ventasvivo-content .vv-tx{fill:#94a3b8;font-size:8px}',
    '#ventasvivo-content .vv-vl{fill:#0f172a;font-size:8px;font-weight:700}',
    '#ventasvivo-content .vv-note{font-size:11.5px;color:#64748b;line-height:1.5}',
    '#ventasvivo-content .vv-tbl{width:100%;border-collapse:collapse;font-size:12.5px}',
    '#ventasvivo-content .vv-tbl th{text-align:right;color:#64748b;font-weight:600;font-size:11px;padding:4px 6px;border-bottom:1px solid #e5e7eb}',
    '#ventasvivo-content .vv-tbl th:first-child{text-align:left}',
    '#ventasvivo-content .vv-tbl td{text-align:right;padding:5px 6px;border-bottom:1px solid #f1f5f9}',
    '#ventasvivo-content .vv-tbl td:first-child{text-align:left}',
    '#ventasvivo-content .vv-seg{display:inline-flex;background:#f1f5f9;border-radius:9px;padding:2px}',
    '#ventasvivo-content .vv-seg button{border:none;background:none;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;color:#64748b;cursor:pointer;font-family:inherit}',
    '#ventasvivo-content .vv-seg button.on{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,.1)}'
  ].join(''); }

  /* barras verticales (por día) */
  function _vvBars(dias, key, color){
    dias = dias||[];
    if(!dias.length) return '<div class="vv-note">Sin datos.</div>';
    var W=340,H=140,padL=6,padR=6,padT=16,padB=16;
    var n=dias.length, iw=W-padL-padR, ih=H-padT-padB;
    var mx=1; dias.forEach(function(x){ mx=Math.max(mx,Number(x[key])||0); });
    var gap=iw/n, bw=Math.min(24, gap*0.72), last=n-1, step=Math.ceil(n/8);
    var bars='',labs='';
    dias.forEach(function(x,i){
      var v=Number(x[key])||0, bh=Math.max(v>0?2:0, ih*v/mx);
      var cx=padL+gap*i+gap/2, bx=cx-bw/2, by=padT+ih-bh;
      bars+='<rect class="vv-bar" x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="3" fill="'+color+'"><title>'+_vvDia(x.dia)+': '+_vvNum(v)+'</title></rect>';
      if(i%step===0 || i===last) labs+='<text class="vv-tx" x="'+cx.toFixed(1)+'" y="'+(H-4)+'" text-anchor="middle">'+_vvDia(x.dia)+'</text>';
      if((v===mx || i===last) && v>0) labs+='<text class="vv-vl" x="'+cx.toFixed(1)+'" y="'+(by-3).toFixed(1)+'" text-anchor="middle">'+_vvNum(v)+'</text>';
    });
    return '<div class="vv-svg"><svg viewBox="0 0 '+W+' '+H+'" role="img"><line class="vv-ax" x1="'+padL+'" y1="'+(padT+ih)+'" x2="'+(W-padR)+'" y2="'+(padT+ih)+'"/>'+bars+labs+'</svg></div>';
  }
  /* barras horizontales (top / categorías) */
  function _vvHBars(rows, color){
    rows=(rows||[]).filter(function(r){return (Number(r.val)||0)>0;});
    if(!rows.length) return '<div class="vv-note">Sin datos.</div>';
    var mx=1; rows.forEach(function(r){ mx=Math.max(mx,Number(r.val)||0); });
    var rowH=22, W=340, labW=150, barMax=W-labW-46, H=rows.length*rowH+4, out='';
    rows.forEach(function(r,i){
      var y=i*rowH+2, bw=Math.max(2, barMax*(Number(r.val)||0)/mx);
      var nm=(r.lbl||''); if(nm.length>26) nm=nm.slice(0,25)+'…';
      out+='<text class="vv-tx" x="0" y="'+(y+rowH/2+3)+'">'+_vvEsc(nm)+'</text>';
      out+='<rect class="vv-bar" x="'+labW+'" y="'+(y+3)+'" width="'+bw.toFixed(1)+'" height="'+(rowH-8)+'" rx="3" fill="'+color+'"><title>'+_vvEsc(r.lbl)+': '+_vvNum(r.val)+'</title></rect>';
      out+='<text class="vv-vl" x="'+(labW+bw+5).toFixed(1)+'" y="'+(y+rowH/2+3)+'">'+_vvNum(r.val)+'</text>';
    });
    return '<div class="vv-svg"><svg viewBox="0 0 '+W+' '+H+'" role="img">'+out+'</svg></div>';
  }
  function _vvKpi(l,v){ return '<div class="vv-kpi"><div class="l">'+l+'</div><div class="v">'+v+'</div></div>'; }

  function _vvRender(box, d){
    var dias=d.por_dia||[];
    var mejor={uds:0,dia:''}; dias.forEach(function(x){ if((Number(x.uds)||0)>mejor.uds) mejor={uds:Number(x.uds)||0,dia:x.dia}; });
    var nd=d.n_dias||dias.length||1, prom=Math.round((Number(d.tot_uds)||0)/nd);
    var html='<div class="vv-wrap"><style>'+_vvCSS()+'</style>';
    html+='<div class="vv-h">Ventas en Vivo · Farmacia</div>';
    html+='<div class="vv-sub">Unidades vendidas (datos de A2) · del '+_vvDia(d.desde)+' al '+_vvDia(d.hasta)+'</div>';
    html+='<div class="vv-kpis">'+
      _vvKpi('Unidades vendidas', _vvNum(d.tot_uds))+
      _vvKpi('Promedio por día', _vvNum(prom))+
      _vvKpi('Mejor día', mejor.dia?(_vvNum(mejor.uds)+' · '+_vvDia(mejor.dia)):'—')+
      _vvKpi('Días con datos', _vvNum(nd))+
    '</div>';
    // Ventas por día
    html+='<div class="vv-card"><h3>Ventas por día (unidades)</h3>'+_vvBars(dias.slice(-30),'uds','#2563eb')+'</div>';
    // Top productos
    html+='<div class="vv-card"><h3>Top productos</h3>'+
      _vvHBars((d.top||[]).slice(0,12).map(function(t){return {lbl:t.descr,val:Number(t.uds)||0};}),'#0ea5e9')+'</div>';
    // Por categoría
    html+='<div class="vv-card"><h3>Por categoría</h3>'+
      _vvHBars((d.por_cat||[]).map(function(c){return {lbl:c.cat,val:Number(c.uds)||0};}),'#16a34a')+'</div>';
    // General de los días (tabla)
    var filas=dias.slice().reverse().map(function(x){
      return '<tr><td>'+_vvDia(x.dia)+'</td><td>'+_vvNum(x.uds)+'</td><td>'+_vvNum(x.skus)+'</td></tr>';
    }).join('');
    html+='<div class="vv-card"><h3>General de los días</h3>'+
      '<table class="vv-tbl"><thead><tr><th>Día</th><th>Unidades</th><th>Productos</th></tr></thead><tbody>'+filas+'</tbody></table></div>';
    html+='<div class="vv-note">Muestra el movimiento de inventario de A2 en unidades. Los primeros días pueden incluir la carga inicial del inventario. El dinero por producto se podrá agregar cuando esté listo el puente de A2 con precios.</div>';
    html+='</div>';
    box.innerHTML=html;
  }

  window.renderVentasVivo = async function(){
    var box=document.getElementById('ventasvivo-content'); if(!box) return;
    box.innerHTML=_vvShell('Cargando ventas…');
    try{
      var res=await supabaseClient.rpc('gerente_ventas_farmacia');
      if(res.error) throw res.error;
      _vvData=res.data||{};
      _vvRender(box, _vvData);
    }catch(e){
      box.innerHTML=_vvShell('No se pudieron cargar las ventas ahora. Revisa la conexión y reintenta.');
    }
  };
})();
