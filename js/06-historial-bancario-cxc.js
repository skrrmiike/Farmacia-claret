function renderBancosHist(){
  var c=document.getElementById('bancos-hist-content'); if(!c) return;
  var ds=_bancosHistDates();
  var titulo='<p class="section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> Historial Bancario por día</p>';
  if(!ds.length){ c.innerHTML=titulo+'<div class="empty-state" style="padding:22px"><p>Aún no hay días registrados.</p><span>Cuando Mayra guarde la disponibilidad de un día, aparecerá aquí para consultarlo.</span></div>'; return; }
  var opts=ds.map(function(d,i){ return '<option value="'+d+'"'+(i===0?' selected':'')+'>'+fmtDate(d)+'</option>'; }).join('');
  c.innerHTML=titulo+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap"><label style="font-size:12px;color:var(--muted)">Ver el día:</label><select id="bancos-hist-sel" class="form-input" style="width:auto;font-size:13px" onchange="_bancosHistRender(this.value)">'+opts+'</select></div>'+
    '<div id="bancos-hist-cont"></div>';
  _bancosHistRender();
}
function _bancosMovDiaToggle(fecha){
  var d=document.getElementById('movdet-'+fecha), c=document.getElementById('movchev-'+fecha);
  if(!d) return;
  if(d.style.display==='none'){ d.style.display=''; if(c)c.textContent='▾'; } else { d.style.display='none'; if(c)c.textContent='▸'; }
}
function _bancosMovAccordion(){
  var dias=Object.keys(db.bancos||{}).filter(function(k){ return /^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray((db.bancos[k]||{})._mov) && db.bancos[k]._mov.length; }).sort().reverse();
  if(!dias.length) return '<div style="font-size:12px;color:var(--muted);margin:16px 0 4px;font-weight:600">Movimientos por día</div><div class="empty-state" style="padding:12px"><p>Sin movimientos registrados</p></div>';
  var html='<div style="font-size:12px;color:var(--muted);margin:16px 0 6px;font-weight:600">Movimientos por día (toca para desglosar)</div>';
  dias.forEach(function(fecha){
    var movs=db.bancos[fecha]._mov||[]; var tasa=(typeof _bancosHistTasa==='function')?_bancosHistTasa(fecha):getTasa();
    var sal=0,ent=0; movs.forEach(function(m){ var bs=Number(m.monto_bs)||0; if(m.tipo==='salida')sal+=bs; else if(m.tipo==='entrada')ent+=bs; });
    var det=movs.slice().reverse().map(function(m){
      var hora=(m.ts||'').slice(11,16);
      var tipoTxt=m.tipo==='salida'?'<span style="color:var(--red)">Salida</span>':m.tipo==='entrada'?'<span style="color:var(--green)">Entrada</span>':'<span style="color:var(--accent)">Traspaso</span>';
      var bancoTxt=m.tipo==='traspaso'?(m.entidad+' '+m.banco+' → '+m.entidad_dest+' '+m.banco_dest):(m.entidad+' '+m.banco);
      var signo=m.tipo==='entrada'?'+':m.tipo==='salida'?'−':''; var mbs=Number(m.monto_bs)||0;
      return '<tr><td style="font-size:11px;white-space:nowrap">'+hora+'</td><td style="font-size:11px">'+tipoTxt+'</td><td style="font-size:11px">'+esc(bancoTxt)+'</td><td class="mono r" style="font-size:12px;font-weight:600">'+signo+_fmtBs(mbs)+'</td><td class="mono r" style="font-size:11px;color:var(--muted)">'+signo+(tasa?_fmtBs(mbs/tasa):'—')+'</td><td style="font-size:11px;color:var(--muted)">'+esc(m.concepto||'')+(m.ref?' · '+esc(m.ref):'')+'</td></tr>';
    }).join('');
    html+='<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:6px;overflow:hidden">'+
      '<div onclick="_bancosMovDiaToggle(\''+fecha+'\')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;background:var(--surface2)">'+
        '<span id="movchev-'+fecha+'" style="font-size:12px;color:var(--muted);width:10px">▸</span>'+
        '<strong style="font-size:12px">'+esc(fmtDate(fecha))+'</strong>'+
        '<span style="font-size:11px;color:var(--muted)">'+movs.length+' mov.</span>'+
        '<span style="margin-left:auto;font-size:11px"><span style="color:var(--red)">−'+_fmtBs(sal)+'</span> &nbsp;<span style="color:var(--green)">+'+_fmtBs(ent)+'</span></span>'+
      '</div>'+
      '<div id="movdet-'+fecha+'" style="display:none"><div class="twrap"><table><thead><tr><th>Hora</th><th>Tipo</th><th>Banco</th><th class="r">Monto Bs</th><th class="r">Monto $</th><th>Concepto</th></tr></thead><tbody>'+det+'</tbody></table></div></div>'+
    '</div>';
  });
  return html;
}
function _bancosHistRender(fecha){
  var cont=document.getElementById('bancos-hist-cont'); if(!cont) return;
  if(!fecha){ var sel=document.getElementById('bancos-hist-sel'); fecha=sel?sel.value:(_bancosHistDates()[0]); }
  if(!fecha){ cont.innerHTML='<div class="empty-state" style="padding:14px"><p>Sin días registrados</p></div>'; return; }
  var tasa=_bancosHistTasa(fecha); var act=_dispActualBancos(fecha);
  function usd(bs){ return tasa? ('$'+_fmtBs(bs/tasa)) : '—'; }
  var rows=BANCOS_LIST.map(function(b){ var fc=act.FARMACIA[b]||0, dr=act.DROGUERIA[b]||0, t=fc+dr;
    return '<tr><td style="font-weight:600;font-size:12px;padding:4px 8px">'+b+'</td>'
      +'<td class="mono r" style="padding:4px 8px;font-size:12px">'+_fmtBs(fc)+'</td>'
      +'<td class="mono r" style="padding:4px 8px;font-size:12px">'+_fmtBs(dr)+'</td>'
      +'<td class="mono r" style="padding:4px 8px;font-size:12px;font-weight:700">'+_fmtBs(t)+'</td>'
      +'<td class="mono r" style="padding:4px 8px;font-size:12px;color:var(--muted)">'+usd(t)+'</td></tr>'; }).join('');
  var tF=BANCOS_LIST.reduce(function(a,b){return a+(act.FARMACIA[b]||0);},0), tD=BANCOS_LIST.reduce(function(a,b){return a+(act.DROGUERIA[b]||0);},0), tG=tF+tD;
  var head='<div class="tbox" style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;padding:12px 14px;margin-bottom:12px">'+
    '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Disponible al cierre</div><div style="font-size:13px;font-weight:600">'+esc(fmtDate(fecha))+'</div></div>'+
    '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Tasa del día</div><div style="font-size:13px;font-weight:600">'+(tasa?_fmtBs(tasa)+' Bs/$':'sin tasa')+'</div></div>'+
    '<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Total disponible</div><div style="font-size:13px;font-weight:700">'+_fmtBs(tG)+' Bs · '+usd(tG)+'</div></div>'+
    '</div>';
  var tabla='<div class="twrap"><table><thead><tr><th>Banco</th><th class="r">Farmacia Bs</th><th class="r">Droguería Bs</th><th class="r">Total Bs</th><th class="r">Total $</th></tr></thead><tbody>'+rows+'<tr style="font-weight:700;border-top:2px solid var(--border);background:var(--surface2)"><td style="padding:6px 8px">TOTAL</td><td class="mono r" style="padding:6px 8px">'+_fmtBs(tF)+'</td><td class="mono r" style="padding:6px 8px">'+_fmtBs(tD)+'</td><td class="mono r" style="padding:6px 8px;color:var(--accent)">'+_fmtBs(tG)+'</td><td class="mono r" style="padding:6px 8px;color:var(--accent)">'+usd(tG)+'</td></tr></tbody></table></div>';
  var movs=bancosMovs(fecha); var ml;
  if(!movs.length) ml='<div class="empty-state" style="padding:12px;margin-top:8px"><p>Sin movimientos ese día</p></div>';
  else ml='<div style="font-size:12px;color:var(--muted);margin:14px 0 4px;font-weight:600">Movimientos del '+esc(fmtDate(fecha))+' ('+movs.length+')</div><div class="twrap"><table><thead><tr><th>Hora</th><th>Tipo</th><th>Banco</th><th class="r">Monto Bs</th><th class="r">Monto $</th><th>Concepto</th></tr></thead><tbody>'+movs.slice().reverse().map(function(m){
    var hora=(m.ts||'').slice(11,16);
    var tipoTxt=m.tipo==='salida'?'<span style="color:var(--red)">Salida</span>':m.tipo==='entrada'?'<span style="color:var(--green)">Entrada</span>':'<span style="color:var(--accent)">Traspaso</span>';
    var bancoTxt=m.tipo==='traspaso'?(m.entidad+' '+m.banco+' → '+m.entidad_dest+' '+m.banco_dest):(m.entidad+' '+m.banco);
    var signo=m.tipo==='entrada'?'+':m.tipo==='salida'?'−':'';
    var mbs=Number(m.monto_bs)||0;
    return '<tr><td style="font-size:11px;white-space:nowrap">'+hora+'</td><td style="font-size:11px">'+tipoTxt+'</td><td style="font-size:11px">'+esc(bancoTxt)+'</td><td class="mono r" style="font-size:12px;font-weight:600">'+signo+_fmtBs(mbs)+'</td><td class="mono r" style="font-size:11px;color:var(--muted)">'+signo+(tasa?_fmtBs(mbs/tasa):'—')+'</td><td style="font-size:11px;color:var(--muted)">'+esc(m.concepto||'')+(m.ref?' · '+esc(m.ref):'')+'</td></tr>';
  }).join('')+'</tbody></table></div>';
  var _vs = (db.bancos && db.bancos._verif && db.bancos._verif[fecha]) || {};
  var _hasV = VERIF_BANCOS.some(function(b){ var s=_vs[b]||{}; return (parseFloat(s.ingreso)||0)>0 || (s.admin!=null && s.admin!==''); });
  var vh='';
  if(_hasV){
    var _vI=0,_vC=0,_vT=0,_vA=0,_vD=0;
    var vrows=VERIF_BANCOS.map(function(b){ var s=_vs[b]||{}; var i=parseFloat(s.ingreso)||0, co=parseFloat(s.comision)||0; var a=(s.admin!=null&&s.admin!=='')?(parseFloat(s.admin)||0):null; var t=i-co; var dif=a!==null?t-a:null; var dc=dif===null?'':(dif<0?'color:var(--red)':dif>0?'color:var(--green)':''); _vI+=i;_vC+=co;_vT+=t; if(a!==null){_vA+=a;_vD+=t-a;} else _vD+=t;
      return '<tr><td style="font-weight:600;font-size:11px;padding:4px 8px;white-space:nowrap">'+b+'</td><td class="mono r" style="padding:4px 8px;font-size:12px">'+_fmtBs(i)+'</td><td class="mono r" style="padding:4px 8px;font-size:12px">'+_fmtBs(co)+'</td><td class="mono r" style="padding:4px 8px;font-size:12px;font-weight:700">'+_fmtBs(t)+'</td><td class="mono r" style="padding:4px 8px;font-size:12px;color:var(--accent)">'+(a!==null?_fmtBs(a):'—')+'</td><td class="mono r" style="padding:4px 8px;font-size:12px;'+dc+'">'+(dif!==null?_fmtBs(dif):'—')+'</td></tr>';
    }).join('');
    vh='<div style="font-size:12px;color:var(--muted);margin:16px 0 4px;font-weight:600">Verificación por terminal — '+esc(fmtDate(fecha))+'</div><div class="twrap"><table><thead><tr><th>Banco / Terminal</th><th class="r">Ingreso Bs</th><th class="r">Comisión Bs</th><th class="r">Total</th><th class="r">Ing. Adm.</th><th class="r">Diferencia</th></tr></thead><tbody>'+vrows+'<tr style="font-weight:700;border-top:2px solid var(--border);background:var(--surface2)"><td style="padding:6px 8px">TOTAL</td><td class="mono r" style="padding:6px 8px">'+_fmtBs(_vI)+'</td><td class="mono r" style="padding:6px 8px">'+_fmtBs(_vC)+'</td><td class="mono r" style="padding:6px 8px">'+_fmtBs(_vT)+'</td><td class="mono r" style="padding:6px 8px;color:var(--accent)">'+_fmtBs(_vA)+'</td><td class="mono r" style="padding:6px 8px">'+_fmtBs(_vD)+'</td></tr></tbody></table></div>';
  }
  cont.innerHTML=head+tabla+vh+_bancosMovAccordion();
}
function _csvCell(v){ v=(v==null?'':String(v)); if(/[",\n;]/.test(v)) v='"'+v.replace(/"/g,'""')+'"'; return v; }
function descargarCSV(filename, rows){
  try{
    var csv='﻿'+rows.map(function(r){ return r.map(_csvCell).join(','); }).join('\r\n');
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); },1000);
    if(typeof showToast==='function') showToast('Descargado: '+filename);
  }catch(e){ showToast('Error al exportar: '+(e.message||e)); }
}
function exportarMovimientosCSV(){
  var all=[];
  Object.keys(db.bancos||{}).filter(function(k){return /^\d{4}-/.test(k);}).forEach(function(fd){ var mv=db.bancos[fd]._mov; if(Array.isArray(mv)) mv.forEach(function(m){ var c=Object.assign({},m); c._fecha=fd; all.push(c); }); });
  if(typeof _movFTipo!=='undefined') all=all.filter(function(m){ if(_movFTipo!=='all'&&m.tipo!==_movFTipo) return false; if(_movFBanco!=='all'&&m.banco!==_movFBanco&&m.banco_dest!==_movFBanco) return false; return true; });
  all.sort(function(a,b){ var ka=(a._fecha||'')+(a.ts||''),kb=(b._fecha||'')+(b.ts||''); return kb<ka?-1:(kb>ka?1:0); });
  var rows=[['Fecha','Hora','Tipo','Entidad','Banco','Banco destino','Monto Bs','Monto USD','Concepto','Referencia','Origen']];
  all.forEach(function(m){ rows.push([m._fecha,(m.ts||'').slice(11,16),m.tipo||'',m.entidad||'',m.banco||'',(m.tipo==='traspaso'?((m.entidad_dest||'')+' '+(m.banco_dest||'')):''),m.monto_bs||0,m.monto_usd||'',m.concepto||'',m.ref||'',m.origen||'']); });
  descargarCSV('movimientos_bancarios.csv', rows);
}
function exportarTasasCSV(){
  var t=db.tasas||{}, te=db.tasas_eur||{};
  var fechas=Object.keys(t).sort().reverse();
  var rows=[['Fecha','Tasa USD (Bs por $)','Tasa EUR (Bs por euro)']];
  fechas.forEach(function(ff){ rows.push([ff, Number(t[ff])||'', Number(te[ff])||'']); });
  descargarCSV('historial_tasas.csv', rows);
}
function exportarFacturasCSV(){
  var rows=[['Empresa','Proveedor','N° Factura','Fecha','Vencimiento','Monto USD','Abonado USD','Saldo USD','Estado']];
  (db.facturas||[]).forEach(function(f){ var u=Number(f.monto_usd)||0, ab=Number(f.abonos_usd)||0; rows.push([f.empresa||'',f.proveedor||'',(f.numero||f.nro||''),(f.creado_en||f.fecha||''),f.fecha_vencimiento||'',u,ab,Math.max(0,u-ab),(typeof computeEstado==='function'?computeEstado(f):'')]); });
  descargarCSV('facturas.csv', rows);
}
function exportarPrestamosCSV(){
  var rows=[['ID','Banco','Entidad','Original USD','Cuota USD','Saldo USD','Cuotas pagadas','Total cuotas','Próxima cuota']];
  (db.prestamos||[]).forEach(function(l){ rows.push([l.id||'',l.banco||'',l.entidad||'',l.monto_usd_original||'',l.cuota_usd||'',l.saldo_usd||'',l.cuotas_hechas||0,l.total_cuotas||0,l.proxima_cuota||'']); });
  descargarCSV('prestamos.csv', rows);
}
function exportarDisponibilidadCSV(){
  var rows=[['Fecha','Banco','Farmacia Bs','Droguería Bs','Total Bs']];
  Object.keys(db.bancos||{}).filter(function(k){return /^\d{4}-/.test(k);}).sort().reverse().forEach(function(fd){ var dd=db.bancos[fd]||{}; BANCOS_LIST.forEach(function(b){ var fc=(dd.FARMACIA&&dd.FARMACIA[b])||0, dr=(dd.DROGUERIA&&dd.DROGUERIA[b])||0; if(fc||dr) rows.push([fd,b,fc,dr,fc+dr]); }); });
  descargarCSV('disponibilidad_bancos.csv', rows);
}
function exportarHistorialActual(){
  if(histTab==='movimientos') return exportarMovimientosCSV();
  if(histTab==='tasas') return exportarTasasCSV();
  if(histTab==='facturas') return exportarFacturasCSV();
  if(histTab==='prestamos') return exportarPrestamosCSV();
  if(histTab==='bancos') return exportarDisponibilidadCSV();
  showToast('Esta vista no tiene exportación CSV');
}


// ══════════════════════════════════════════════════════════════
// CUENTAS POR COBRAR (Droguería)
// ══════════════════════════════════════════════════════════════
var CXC_DROG_SEED = [{"id":"cx000307","cod":"000307","nom":"FARMACIA MEDICA DEL SUR, C.A.","tel":"0261-7365292","wa":"582617365292","saldo":2425.38,"vence":"2021-05-28","facturas":[{"n":"00054251","em":"2021-05-21","ve":"2021-05-28","s":500.0},{"n":"00054342","em":"2021-05-24","ve":"2021-05-31","s":1925.38}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000281","cod":"000281","nom":"FARMACIA MILAGRO NORTE, COMPANIA ANONIMA","tel":"","wa":"","saldo":1482.09,"vence":"2021-06-05","facturas":[{"n":"00054580","em":"2021-05-29","ve":"2021-06-05","s":256.08},{"n":"00054596","em":"2021-05-31","ve":"2021-06-07","s":26.01},{"n":"00054649","em":"2021-06-01","ve":"2021-06-08","s":360.0},{"n":"00054659","em":"2021-06-01","ve":"2021-06-08","s":480.0},{"n":"00054738","em":"2021-06-03","ve":"2021-06-10","s":360.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000652","cod":"000652","nom":"DROGUERIA LA GLORIA DE DIOS A Y C C.A.","tel":"0414-6475097","wa":"584146475097","saldo":494.22,"vence":"2021-07-13","facturas":[{"n":"00055321","em":"2021-07-06","ve":"2021-07-13","s":82.43},{"n":"00055378","em":"2021-07-08","ve":"2021-07-15","s":310.18},{"n":"00055403","em":"2021-07-09","ve":"2021-08-08","s":101.61}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000658","cod":"000658","nom":"FARMACIA INKAFARMA, C.A (INKAFARMA, C.A)","tel":"","wa":"","saldo":8000.0,"vence":"2021-07-14","facturas":[{"n":"00055354","em":"2021-07-07","ve":"2021-07-14","s":8000.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000663","cod":"000663","nom":"BIODYNAMICS SERVICES C.A","tel":"","wa":"","saldo":62.78,"vence":"2021-07-21","facturas":[{"n":"00055463","em":"2021-07-14","ve":"2021-07-21","s":62.78}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000280","cod":"000280","nom":"FARMACIA FUERZAS ARMADAS, COMPANIA ANONIMA","tel":"0414-6813324","wa":"584146813324","saldo":250.85,"vence":"2021-10-25","facturas":[{"n":"00057064","em":"2021-10-18","ve":"2021-10-25","s":250.85}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000773","cod":"000773","nom":"FARMACIA NUEVA OJEDA, C.A (F.U.S.A.)","tel":"0424-6158157","wa":"584246158157","saldo":341.25,"vence":"2022-04-15","facturas":[{"n":"00060204","em":"2022-03-31","ve":"2022-04-15","s":77.68},{"n":"00060205","em":"2022-03-31","ve":"2022-04-15","s":124.91},{"n":"00060206","em":"2022-03-31","ve":"2022-04-15","s":75.48},{"n":"00060207","em":"2022-03-31","ve":"2022-04-15","s":63.18}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000770","cod":"000770","nom":"FARMACIA NUEVA SAN FRANCISCO, C.A. (FARMACIA NUEVA SAN FRANCISCO, C.A.)","tel":"0424-6158157","wa":"584246158157","saldo":776.56,"vence":"2022-04-15","facturas":[{"n":"00060196","em":"2022-03-31","ve":"2022-04-15","s":118.65},{"n":"00060198","em":"2022-03-31","ve":"2022-04-15","s":156.96},{"n":"00060199","em":"2022-03-31","ve":"2022-04-15","s":125.46},{"n":"00060200","em":"2022-03-31","ve":"2022-04-15","s":92.39},{"n":"00060201","em":"2022-03-31","ve":"2022-04-15","s":118.05},{"n":"00060202","em":"2022-03-31","ve":"2022-04-15","s":117.09},{"n":"00060203","em":"2022-03-31","ve":"2022-04-15","s":47.96}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000771","cod":"000771","nom":"FARMACIA NUEVA TROPICANA, COMPAÑIA ANONIMA (FARMACIA NUEVA","tel":"0424-6158157","wa":"584246158157","saldo":198.85,"vence":"2022-04-16","facturas":[{"n":"00060236","em":"2022-04-01","ve":"2022-04-16","s":75.89},{"n":"00060237","em":"2022-04-01","ve":"2022-04-16","s":83.9},{"n":"00060239","em":"2022-04-01","ve":"2022-04-16","s":39.06}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000769","cod":"000769","nom":"FARMACIA EMMANUEL SOCIEDAD ANONIMA (FARMACIA ENMANUEL SOCIEDAD","tel":"0424-6158157","wa":"584246158157","saldo":691.88,"vence":"2022-04-21","facturas":[{"n":"00060324","em":"2022-04-06","ve":"2022-04-21","s":220.13},{"n":"00060325","em":"2022-04-06","ve":"2022-04-21","s":147.91},{"n":"00060326","em":"2022-04-06","ve":"2022-04-21","s":192.21},{"n":"00060329","em":"2022-04-06","ve":"2022-04-21","s":131.63}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000724","cod":"000724","nom":"FARMACIA CARIBEÑA C.A (FARMACIA CARIBEÑA C.A)","tel":"0412-6939301","wa":"584126939301","saldo":811.5,"vence":"2022-04-26","facturas":[{"n":"00060434","em":"2022-04-11","ve":"2022-04-26","s":196.51},{"n":"00060435","em":"2022-04-11","ve":"2022-04-26","s":182.71},{"n":"00060436","em":"2022-04-11","ve":"2022-04-26","s":137.66},{"n":"00060437","em":"2022-04-11","ve":"2022-04-26","s":233.82},{"n":"00060438","em":"2022-04-11","ve":"2022-04-26","s":60.8}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000419","cod":"000419","nom":"FARMACIA INVERSIONES 2000, C.A.","tel":"02617233663","wa":"582617233663","saldo":719.99,"vence":"2022-07-07","facturas":[{"n":"00062040","em":"2022-06-22","ve":"2022-07-07","s":263.89},{"n":"00062042","em":"2022-06-22","ve":"2022-07-07","s":318.46},{"n":"00062043","em":"2022-06-22","ve":"2022-07-07","s":137.64}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000791","cod":"000791","nom":"FARMACIA FARMAOFERTAS, C.A (FARMACIA FARMAOFERTAS, C.A)","tel":"0414-0961977","wa":"584140961977","saldo":150.0,"vence":"2022-07-28","facturas":[{"n":"00062471","em":"2022-07-13","ve":"2022-07-28","s":150.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000813","cod":"000813","nom":"FARMACIA LA SALINA DEL SUR, C.A. (FARMACIA LA SALINA DEL SUR, C.A.)","tel":"0414-6578854","wa":"584146578854","saldo":10678.51,"vence":"2022-12-16","facturas":[{"n":"00065269","em":"2022-12-01","ve":"2022-12-16","s":141.03},{"n":"00065270","em":"2022-12-01","ve":"2022-12-16","s":136.82},{"n":"00065271","em":"2022-12-01","ve":"2022-12-16","s":157.18},{"n":"00065272","em":"2022-12-01","ve":"2022-12-16","s":155.51},{"n":"00065285","em":"2022-12-01","ve":"2022-12-16","s":220.78},{"n":"00065286","em":"2022-12-01","ve":"2022-12-16","s":274.09},{"n":"00065287","em":"2022-12-01","ve":"2022-12-16","s":123.6},{"n":"00065289","em":"2022-12-01","ve":"2022-12-16","s":128.19},{"n":"00065291","em":"2022-12-02","ve":"2022-12-17","s":134.26},{"n":"00065292","em":"2022-12-02","ve":"2022-12-17","s":172.98},{"n":"00065293","em":"2022-12-02","ve":"2022-12-17","s":306.62},{"n":"00065294","em":"2022-12-02","ve":"2022-12-17","s":145.39},{"n":"00065295","em":"2022-12-02","ve":"2022-12-17","s":152.84},{"n":"00065298","em":"2022-12-02","ve":"2022-12-17","s":157.45},{"n":"00065299","em":"2022-12-02","ve":"2022-12-17","s":117.08},{"n":"00065300","em":"2022-12-02","ve":"2022-12-17","s":153.34},{"n":"00065301","em":"2022-12-02","ve":"2022-12-17","s":140.81},{"n":"00065302","em":"2022-12-02","ve":"2022-12-17","s":106.69},{"n":"00065303","em":"2022-12-02","ve":"2022-12-17","s":162.43},{"n":"00065304","em":"2022-12-02","ve":"2022-12-17","s":156.78},{"n":"00065306","em":"2022-12-02","ve":"2022-12-17","s":119.05},{"n":"00065382","em":"2022-12-05","ve":"2022-12-20","s":191.28},{"n":"00065384","em":"2022-12-05","ve":"2022-12-20","s":176.05},{"n":"00065385","em":"2022-12-05","ve":"2022-12-20","s":267.23},{"n":"00065386","em":"2022-12-05","ve":"2022-12-20","s":172.33},{"n":"00065387","em":"2022-12-05","ve":"2022-12-20","s":166.15},{"n":"00065388","em":"2022-12-05","ve":"2022-12-20","s":35.87},{"n":"00065392","em":"2022-12-05","ve":"2022-12-20","s":155.08},{"n":"00065393","em":"2022-12-05","ve":"2022-12-20","s":139.35},{"n":"00065394","em":"2022-12-05","ve":"2022-12-20","s":153.44},{"n":"00065396","em":"2022-12-05","ve":"2022-12-20","s":208.56},{"n":"00065397","em":"2022-12-05","ve":"2022-12-20","s":79.54},{"n":"00065504","em":"2022-12-08","ve":"2022-12-23","s":23.66},{"n":"00065507","em":"2022-12-09","ve":"2022-12-24","s":117.89},{"n":"00065516","em":"2022-12-09","ve":"2022-12-24","s":36.4},{"n":"00065544","em":"2022-12-12","ve":"2022-12-27","s":72.1},{"n":"00065553","em":"2022-12-12","ve":"2022-12-27","s":115.74},{"n":"00065556","em":"2022-12-12","ve":"2022-12-27","s":132.14},{"n":"00065567","em":"2022-12-12","ve":"2022-12-27","s":86.96},{"n":"00065574","em":"2022-12-13","ve":"2022-12-28","s":176.8},{"n":"00065582","em":"2022-12-13","ve":"2022-12-28","s":217.83},{"n":"00065586","em":"2022-12-13","ve":"2022-12-28","s":495.04},{"n":"00065605","em":"2022-12-14","ve":"2022-12-29","s":105.74},{"n":"00065614","em":"2022-12-14","ve":"2022-12-29","s":32.99},{"n":"00065630","em":"2022-12-15","ve":"2022-12-30","s":35.99},{"n":"00065635","em":"2022-12-15","ve":"2022-12-30","s":94.03},{"n":"00065654","em":"2022-12-15","ve":"2022-12-30","s":14.61},{"n":"00065712","em":"2022-12-19","ve":"2023-01-03","s":127.07},{"n":"00065718","em":"2022-12-19","ve":"2023-01-03","s":45.26},{"n":"00065739","em":"2022-12-20","ve":"2023-01-04","s":53.16},{"n":"00065779","em":"2022-12-21","ve":"2023-01-05","s":89.11},{"n":"00065781","em":"2022-12-21","ve":"2023-01-05","s":9.56},{"n":"00065783","em":"2022-12-22","ve":"2023-01-06","s":78.0},{"n":"00065803","em":"2022-12-22","ve":"2023-01-06","s":54.0},{"n":"00065805","em":"2022-12-22","ve":"2023-01-06","s":123.06},{"n":"00065810","em":"2022-12-23","ve":"2023-01-07","s":111.72},{"n":"00065820","em":"2022-12-23","ve":"2023-01-07","s":123.28},{"n":"00065829","em":"2022-12-23","ve":"2023-01-07","s":115.32},{"n":"00065830","em":"2022-12-23","ve":"2023-01-07","s":1.96},{"n":"00065834","em":"2022-12-26","ve":"2023-01-10","s":62.64},{"n":"00065835","em":"2022-12-26","ve":"2023-01-10","s":77.65},{"n":"00065854","em":"2022-12-26","ve":"2023-01-10","s":109.26},{"n":"00065855","em":"2022-12-26","ve":"2023-01-10","s":22.58},{"n":"00065858","em":"2022-12-26","ve":"2023-01-10","s":8.46},{"n":"00065892","em":"2022-12-27","ve":"2023-01-11","s":85.76},{"n":"00065929","em":"2022-12-28","ve":"2023-01-12","s":77.58},{"n":"00065936","em":"2022-12-29","ve":"2023-01-13","s":23.39},{"n":"00065964","em":"2022-12-29","ve":"2023-01-13","s":106.3},{"n":"00065983","em":"2023-01-02","ve":"2023-01-17","s":77.01},{"n":"00065991","em":"2023-01-02","ve":"2023-01-17","s":11.06},{"n":"00066007","em":"2023-01-03","ve":"2023-01-18","s":68.32},{"n":"00066071","em":"2023-01-05","ve":"2023-01-20","s":88.8},{"n":"00066097","em":"2023-01-05","ve":"2023-01-20","s":24.65},{"n":"00066120","em":"2023-01-06","ve":"2023-01-21","s":54.3},{"n":"00066128","em":"2023-01-07","ve":"2023-01-22","s":46.6},{"n":"00066130","em":"2023-01-09","ve":"2023-01-24","s":110.19},{"n":"00066146","em":"2023-01-09","ve":"2023-01-24","s":188.78},{"n":"00066149","em":"2023-01-09","ve":"2023-01-24","s":93.9},{"n":"00066177","em":"2023-01-11","ve":"2023-01-26","s":52.82},{"n":"00066190","em":"2023-01-11","ve":"2023-01-26","s":62.65},{"n":"00066219","em":"2023-01-12","ve":"2023-01-27","s":104.81},{"n":"00066222","em":"2023-01-12","ve":"2023-01-27","s":10.14},{"n":"00066242","em":"2023-01-13","ve":"2023-01-28","s":47.17},{"n":"00066246","em":"2023-01-13","ve":"2023-01-28","s":13.0},{"n":"00066259","em":"2023-01-16","ve":"2023-01-31","s":98.91},{"n":"00066275","em":"2023-01-16","ve":"2023-01-31","s":82.44},{"n":"00066322","em":"2023-01-18","ve":"2023-02-02","s":62.19},{"n":"00066347","em":"2023-01-20","ve":"2023-02-04","s":5.2},{"n":"00066372","em":"2023-01-23","ve":"2023-02-07","s":72.8},{"n":"00066388","em":"2023-01-23","ve":"2023-02-07","s":80.89},{"n":"00066409","em":"2023-01-24","ve":"2023-02-08","s":35.2},{"n":"00066494","em":"2023-01-30","ve":"2023-02-14","s":67.19},{"n":"00066500","em":"2023-01-30","ve":"2023-02-14","s":74.88},{"n":"00066566","em":"2023-02-02","ve":"2023-02-17","s":77.75},{"n":"00066638","em":"2023-02-08","ve":"2023-02-23","s":91.04},{"n":"00066655","em":"2023-02-09","ve":"2023-02-24","s":69.89},{"n":"00066665","em":"2023-02-10","ve":"2023-02-25","s":70.97},{"n":"00066674","em":"2023-02-11","ve":"2023-02-26","s":81.16},{"n":"00066691","em":"2023-02-13","ve":"2023-02-28","s":65.46},{"n":"00066702","em":"2023-02-14","ve":"2023-03-01","s":71.27},{"n":"00066703","em":"2023-02-15","ve":"2023-03-02","s":11.66},{"n":"00066716","em":"2023-02-15","ve":"2023-03-02","s":56.63},{"n":"00067907","em":"2023-04-29","ve":"2023-05-14","s":77.93}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000828","cod":"000828","nom":"FARMACIA FARMA MEDICAL PLUS, C.A","tel":"0412-5147538","wa":"584125147538","saldo":164.58,"vence":"2023-03-21","facturas":[{"n":"00066967","em":"2023-03-06","ve":"2023-03-21","s":57.82},{"n":"00067231","em":"2023-03-20","ve":"2023-04-04","s":106.76}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000779","cod":"000779","nom":"FARMACIA COLGUA, C.A (FARMACIA COLGUA, C.A)","tel":"0424-6274626","wa":"584246274626","saldo":28.74,"vence":"2023-04-06","facturas":[{"n":"00066988","em":"2023-03-07","ve":"2023-04-06","s":28.74}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000370","cod":"000370","nom":"FARMACIA LOS GALLEGOS, C.A.","tel":"0414-7608135","wa":"584147608135","saldo":515.29,"vence":"2023-04-16","facturas":[{"n":"00067421","em":"2023-04-01","ve":"2023-04-16","s":71.5},{"n":"00067422","em":"2023-04-01","ve":"2023-04-16","s":103.7},{"n":"00067423","em":"2023-04-01","ve":"2023-04-16","s":107.12},{"n":"00067425","em":"2023-04-01","ve":"2023-04-16","s":85.64},{"n":"00067426","em":"2023-04-01","ve":"2023-04-16","s":65.11},{"n":"00067427","em":"2023-04-01","ve":"2023-04-16","s":82.21}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000826","cod":"000826","nom":"DROGUERIA MEDICAL FINE, C.A.","tel":"","wa":"","saldo":2413.45,"vence":"2023-04-25","facturas":[{"n":"00067557","em":"2023-04-10","ve":"2023-04-25","s":326.42},{"n":"00067562","em":"2023-04-10","ve":"2023-04-25","s":321.13},{"n":"00067651","em":"2023-04-14","ve":"2023-04-29","s":188.39},{"n":"00067965","em":"2023-05-04","ve":"2023-05-19","s":231.9},{"n":"00067966","em":"2023-05-04","ve":"2023-05-19","s":276.06},{"n":"00068021","em":"2023-05-05","ve":"2023-05-20","s":178.8},{"n":"00068089","em":"2023-05-10","ve":"2023-05-25","s":235.58},{"n":"00068267","em":"2023-05-18","ve":"2023-06-02","s":147.0},{"n":"00068301","em":"2023-05-19","ve":"2023-06-03","s":136.3},{"n":"00068474","em":"2023-05-29","ve":"2023-06-13","s":145.44},{"n":"00069173","em":"2023-06-30","ve":"2023-07-15","s":39.49},{"n":"00069259","em":"2023-07-06","ve":"2023-07-21","s":186.94}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000677","cod":"000677","nom":"MULTITIENDA FARMA SERVICIOS LA COROMOTO,C.A","tel":"0414-0632206","wa":"584140632206","saldo":1179.94,"vence":"2023-05-30","facturas":[{"n":"00068183","em":"2023-05-15","ve":"2023-05-30","s":50.32},{"n":"00068231","em":"2023-05-17","ve":"2023-06-01","s":62.85},{"n":"00068403","em":"2023-05-25","ve":"2023-06-09","s":100.02},{"n":"00068463","em":"2023-05-27","ve":"2023-06-11","s":36.3},{"n":"00068526","em":"2023-05-31","ve":"2023-06-15","s":155.1},{"n":"00068771","em":"2023-06-12","ve":"2023-06-27","s":74.68},{"n":"00068794","em":"2023-06-12","ve":"2023-06-27","s":178.02},{"n":"00068994","em":"2023-06-20","ve":"2023-07-05","s":60.84},{"n":"00069035","em":"2023-06-22","ve":"2023-07-07","s":31.01},{"n":"00069095","em":"2023-06-26","ve":"2023-07-11","s":90.72},{"n":"00069512","em":"2023-07-20","ve":"2023-08-04","s":64.08},{"n":"00069686","em":"2023-07-31","ve":"2023-08-15","s":63.6},{"n":"00069826","em":"2023-08-09","ve":"2023-08-24","s":109.8},{"n":"00080685","em":"2026-06-02","ve":"2026-06-17","s":102.6}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000840","cod":"000840","nom":"FARMACIA FRANCISCO DE MIRANDA, C.A.","tel":"0424-2757242","wa":"584242757242","saldo":355.36,"vence":"2023-06-24","facturas":[{"n":"00068417","em":"2023-05-25","ve":"2023-06-24","s":54.17},{"n":"00068418","em":"2023-05-25","ve":"2023-06-24","s":47.62},{"n":"00068425","em":"2023-05-25","ve":"2023-06-24","s":114.13},{"n":"00068426","em":"2023-05-25","ve":"2023-06-24","s":82.05},{"n":"00068427","em":"2023-05-25","ve":"2023-06-24","s":57.39}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000582","cod":"000582","nom":"FARMACIA LAS MERCEDES BV, C.A","tel":"0414-6877036","wa":"584146877036","saldo":567.61,"vence":"2023-07-03","facturas":[{"n":"00068581","em":"2023-06-03","ve":"2023-07-03","s":68.75},{"n":"00068607","em":"2023-06-05","ve":"2023-07-05","s":38.67},{"n":"00068690","em":"2023-06-07","ve":"2023-07-07","s":4.44},{"n":"00068725","em":"2023-06-09","ve":"2023-07-09","s":30.05},{"n":"00072483","em":"2024-01-05","ve":"2024-02-04","s":287.76},{"n":"00075714","em":"2024-09-18","ve":"2024-10-18","s":137.94}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000913","cod":"000913","nom":"DROGUERIA MEDICO AUTANA DIGITAL, C.A.","tel":"","wa":"","saldo":620.0,"vence":"2023-07-10","facturas":[{"n":"00069204","em":"2023-07-03","ve":"2023-07-10","s":620.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000785","cod":"000785","nom":"FARMACIA CANDIA,C.A","tel":"0424-4012373","wa":"584244012373","saldo":35.27,"vence":"2023-07-19","facturas":[{"n":"00069229","em":"2023-07-04","ve":"2023-07-19","s":35.27}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000796","cod":"000796","nom":"FARMACIA NUEVA SAN FERMIN, C.A.","tel":"0414-0247331","wa":"584140247331","saldo":84.04,"vence":"2023-08-16","facturas":[{"n":"00069424","em":"2023-07-17","ve":"2023-08-16","s":30.93},{"n":"00069698","em":"2023-08-01","ve":"2023-08-31","s":53.11}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000687","cod":"000687","nom":"FARMACIA GABRIELA 23,C.A.","tel":"0424-6211985","wa":"584246211985","saldo":652.31,"vence":"2023-09-06","facturas":[{"n":"00070041","em":"2023-08-22","ve":"2023-09-06","s":149.88},{"n":"00070042","em":"2023-08-22","ve":"2023-09-06","s":47.02},{"n":"00070083","em":"2023-08-23","ve":"2023-09-07","s":51.24},{"n":"00070105","em":"2023-08-24","ve":"2023-09-08","s":61.67},{"n":"00070125","em":"2023-08-25","ve":"2023-09-09","s":98.81},{"n":"00070174","em":"2023-08-30","ve":"2023-09-14","s":99.7},{"n":"00070242","em":"2023-09-04","ve":"2023-09-19","s":106.17},{"n":"00070270","em":"2023-09-05","ve":"2023-09-20","s":21.28},{"n":"00070363","em":"2023-09-12","ve":"2023-09-27","s":16.54}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000738","cod":"000738","nom":"PROYECCION MEDICA, C.A","tel":"0424-6314241","wa":"584246314241","saldo":296.12,"vence":"2023-09-26","facturas":[{"n":"00070358","em":"2023-09-11","ve":"2023-09-26","s":296.12}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000356","cod":"000356","nom":"FARMACIA EL BIENESTAR PERIFERICO, C.A.","tel":"0414-9608185","wa":"584149608185","saldo":10.47,"vence":"2023-11-15","facturas":[{"n":"00071286","em":"2023-10-31","ve":"2023-11-15","s":10.47}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000400","cod":"000400","nom":"FARMACIA ORIENTAL, C.A.","tel":"0261-7782386","wa":"582617782386","saldo":797.97,"vence":"2024-04-05","facturas":[{"n":"00073609","em":"2024-03-21","ve":"2024-04-05","s":27.27},{"n":"00073610","em":"2024-03-21","ve":"2024-04-05","s":330.33},{"n":"00073613","em":"2024-03-21","ve":"2024-04-05","s":180.63},{"n":"00073614","em":"2024-03-21","ve":"2024-04-05","s":259.74}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000705","cod":"000705","nom":"MULTITIENDA FARMA SERVICIOS LA LIMPIA, C.A","tel":"0414-6266353","wa":"584146266353","saldo":195.48,"vence":"2024-04-23","facturas":[{"n":"00073820","em":"2024-04-08","ve":"2024-04-23","s":64.55},{"n":"00080609","em":"2026-05-20","ve":"2026-06-04","s":130.93}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000702","cod":"000702","nom":"FARMACIA LA AURORA VEN CA","tel":"0414-6170440","wa":"584146170440","saldo":112.51,"vence":"2024-05-08","facturas":[{"n":"00073969","em":"2024-04-23","ve":"2024-05-08","s":1.16},{"n":"00075884","em":"2024-10-02","ve":"2024-10-17","s":48.32},{"n":"00076123","em":"2024-10-25","ve":"2024-11-09","s":44.83},{"n":"00076124","em":"2024-10-25","ve":"2024-11-09","s":18.2}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000972","cod":"000972","nom":"CENTRO OFTALMOLOGICO OPTICA ZBL CASIGUA COMPAÑIA ANONIMA","tel":"0424-6013475","wa":"584246013475","saldo":122.16,"vence":"2024-05-29","facturas":[{"n":"00074187","em":"2024-05-14","ve":"2024-05-29","s":122.16}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000818","cod":"000818","nom":"GRUPO CONSORCIO J &amp; L, C.A.","tel":"","wa":"","saldo":181.67,"vence":"2024-10-18","facturas":[{"n":"00075891","em":"2024-10-03","ve":"2024-10-18","s":135.43},{"n":"00075892","em":"2024-10-03","ve":"2024-10-18","s":46.24}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000689","cod":"000689","nom":"FARMACIA HERMANOS DÍAZ MARTÍNEZ, C.A","tel":"0414-0280490","wa":"584140280490","saldo":287.09,"vence":"2024-11-01","facturas":[{"n":"00075887","em":"2024-10-02","ve":"2024-11-01","s":96.02},{"n":"00075888","em":"2024-10-02","ve":"2024-11-01","s":40.73},{"n":"00076185","em":"2024-11-01","ve":"2024-12-01","s":144.11},{"n":"00076186","em":"2024-11-01","ve":"2024-12-01","s":6.24}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000757","cod":"000757","nom":"AUTOMERCADO EL BARATILLO, S.A.","tel":"0414-6667984","wa":"584146667984","saldo":125.1,"vence":"2024-11-15","facturas":[{"n":"00076182","em":"2024-10-31","ve":"2024-11-15","s":62.87},{"n":"00076183","em":"2024-10-31","ve":"2024-11-15","s":62.23}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000718","cod":"000718","nom":"FARMACIA EL ROSARIO II, C.A.","tel":"0414-6561444","wa":"584146561444","saldo":150.47,"vence":"2024-12-18","facturas":[{"n":"00076434","em":"2024-12-03","ve":"2024-12-18","s":73.25},{"n":"00076435","em":"2024-12-03","ve":"2024-12-18","s":77.22}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000754","cod":"000754","nom":"LA MILAGROSA INSTITUTO PRESTADOR DE SERVICIOS DE SALUD","tel":"0412-5332368","wa":"584125332368","saldo":906.93,"vence":"2025-03-21","facturas":[{"n":"00077315","em":"2025-03-06","ve":"2025-03-21","s":891.52},{"n":"00078453","em":"2025-08-04","ve":"2025-08-19","s":15.41}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000296","cod":"000296","nom":"FARMACIA CLARET DE INVERSIONES HOSPITALARIAS C.A","tel":"0261-7523812","wa":"582617523812","saldo":10630.0,"vence":"2025-05-01","facturas":[{"n":"00077535","em":"2025-04-01","ve":"2025-05-01","s":810.0},{"n":"00079537","em":"2025-12-15","ve":"2026-01-14","s":3833.54},{"n":"00080310","em":"2026-03-24","ve":"2026-04-23","s":3116.97},{"n":"00080311","em":"2026-03-24","ve":"2026-04-23","s":356.21},{"n":"00080658","em":"2026-05-28","ve":"2026-06-27","s":88.35},{"n":"00080659","em":"2026-05-28","ve":"2026-06-27","s":193.25},{"n":"00080664","em":"2026-05-29","ve":"2026-06-28","s":818.7},{"n":"00080665","em":"2026-05-29","ve":"2026-06-28","s":283.37},{"n":"00080679","em":"2026-06-01","ve":"2026-07-01","s":179.41},{"n":"00080680","em":"2026-06-01","ve":"2026-07-01","s":183.61},{"n":"00080681","em":"2026-06-01","ve":"2026-07-01","s":190.55},{"n":"00080689","em":"2026-06-02","ve":"2026-07-02","s":161.37},{"n":"00080698","em":"2026-06-03","ve":"2026-07-03","s":283.88},{"n":"00080699","em":"2026-06-03","ve":"2026-07-03","s":130.78}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000996","cod":"000996","nom":"DROGUERIA INFINITO, C.A. (DROGUERIA INFINITO, C.A.)","tel":"0424-6058337","wa":"584246058337","saldo":108.15,"vence":"2025-05-24","facturas":[{"n":"00077835","em":"2025-05-09","ve":"2025-05-24","s":33.91},{"n":"00078733","em":"2025-09-12","ve":"2025-09-27","s":74.24}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000207","cod":"000207","nom":"DROGUERIA YAMAR, C.A.","tel":"0261-7389852","wa":"582617389852","saldo":270.0,"vence":"2025-09-13","facturas":[{"n":"00078526","em":"2025-08-14","ve":"2025-09-13","s":270.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx001008","cod":"001008","nom":"BIO DE VENEZUELA, C.A.","tel":"0414-3688923","wa":"584143688923","saldo":802709.34,"vence":"2025-10-01","facturas":[{"n":"00078647","em":"2025-09-01","ve":"2025-10-01","s":454925.09},{"n":"00078649","em":"2025-09-01","ve":"2025-10-01","s":16995.16},{"n":"00078686","em":"2025-09-05","ve":"2025-10-05","s":103249.83},{"n":"00078726","em":"2025-09-11","ve":"2025-10-11","s":19590.26},{"n":"00078727","em":"2025-09-11","ve":"2025-10-11","s":146069.51},{"n":"00078791","em":"2025-09-19","ve":"2025-10-19","s":41905.03},{"n":"00078792","em":"2025-09-19","ve":"2025-10-19","s":6474.82},{"n":"00078793","em":"2025-09-19","ve":"2025-10-19","s":6581.67},{"n":"00078828","em":"2025-09-25","ve":"2025-10-25","s":6917.97}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000827","cod":"000827","nom":"CENTRO MEDICO MACHIQUES C.A.","tel":"0414-6461525","wa":"584146461525","saldo":3460.15,"vence":"2025-10-21","facturas":[{"n":"00078910","em":"2025-10-06","ve":"2025-10-21","s":115.94},{"n":"00078921","em":"2025-10-06","ve":"2025-10-21","s":446.81},{"n":"00079096","em":"2025-10-27","ve":"2025-11-11","s":390.0},{"n":"00079102","em":"2025-10-27","ve":"2025-11-11","s":454.98},{"n":"00079133","em":"2025-10-30","ve":"2025-11-14","s":296.76},{"n":"00079138","em":"2025-10-30","ve":"2025-11-14","s":448.44},{"n":"00079167","em":"2025-11-03","ve":"2025-11-18","s":759.2},{"n":"00079288","em":"2025-11-19","ve":"2025-12-04","s":236.6},{"n":"00079291","em":"2025-11-19","ve":"2025-12-04","s":311.41}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000314","cod":"000314","nom":"FARMACIA LA POPULAR NO2, COMPAÑÍA ANÓNIMA","tel":"0412-4276495","wa":"584124276495","saldo":265.98,"vence":"2025-12-17","facturas":[{"n":"00079412","em":"2025-12-02","ve":"2025-12-17","s":265.98}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000536","cod":"000536","nom":"UNIVERSIDAD DEL ZULIA","tel":"","wa":"","saldo":3367.88,"vence":"2026-01-14","facturas":[{"n":"00079653","em":"2025-12-30","ve":"2026-01-14","s":2594.8},{"n":"00079654","em":"2025-12-30","ve":"2026-01-14","s":773.08}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000954","cod":"000954","nom":"FARMAPLUS MILAGRO NORTE, C.A","tel":"0424-6831109","wa":"584246831109","saldo":451.91,"vence":"2026-02-03","facturas":[{"n":"00079819","em":"2026-01-19","ve":"2026-02-03","s":282.71},{"n":"00079820","em":"2026-01-19","ve":"2026-02-03","s":169.2}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx001005","cod":"001005","nom":"GLOBAL MEDICAL SUPPLY, C.A.","tel":"","wa":"","saldo":20725.67,"vence":"2026-02-26","facturas":[{"n":"00079918","em":"2026-01-27","ve":"2026-02-26","s":2931.8},{"n":"00079919","em":"2026-01-27","ve":"2026-02-26","s":17793.87}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000438","cod":"000438","nom":"HOSPITALIZACION CLINICO, C.A.","tel":"0414-0708595","wa":"584140708595","saldo":764.73,"vence":"2026-03-17","facturas":[{"n":"00080245","em":"2026-03-16","ve":"2026-03-17","s":20.06},{"n":"00080627","em":"2026-05-22","ve":"2026-05-23","s":140.82},{"n":"00080637","em":"2026-05-25","ve":"2026-05-26","s":24.0},{"n":"00080640","em":"2026-05-26","ve":"2026-05-27","s":154.77},{"n":"00080657","em":"2026-05-28","ve":"2026-05-29","s":186.0},{"n":"00080663","em":"2026-05-29","ve":"2026-05-30","s":120.2},{"n":"00080673","em":"2026-06-01","ve":"2026-06-02","s":118.88}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000607","cod":"000607","nom":"SERVICIOS MEDICOS DIAGNOSTICOS, C.A","tel":"0414-6878891","wa":"584146878891","saldo":1015.3,"vence":"2026-04-14","facturas":[{"n":"00080354","em":"2026-03-30","ve":"2026-04-14","s":225.9},{"n":"00080411","em":"2026-04-10","ve":"2026-04-25","s":283.1},{"n":"00080425","em":"2026-04-14","ve":"2026-04-29","s":234.8},{"n":"00080516","em":"2026-04-28","ve":"2026-05-13","s":271.5}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000052","cod":"000052","nom":"HOSPITALIZACION FALCON C.A","tel":"0261-7960184","wa":"582617960184","saldo":111.02,"vence":"2026-04-25","facturas":[{"n":"00080408","em":"2026-04-10","ve":"2026-04-25","s":111.02}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000704","cod":"000704","nom":"COMPLEJO MEDICO SAN LUCAS,C.A.","tel":"0414-6968561","wa":"584146968561","saldo":174.63,"vence":"2026-05-01","facturas":[{"n":"00080498","em":"2026-04-24","ve":"2026-05-01","s":174.63}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000803","cod":"000803","nom":"ESPECIALIDADES MEDICAS SANTA JUANA COMPAÑÍA ANÓNIMA","tel":"0414-3630908","wa":"584143630908","saldo":2010.1,"vence":"2026-05-01","facturas":[{"n":"00080446","em":"2026-04-16","ve":"2026-05-01","s":750.36},{"n":"00080447","em":"2026-04-17","ve":"2026-05-02","s":1118.74},{"n":"00080490","em":"2026-04-23","ve":"2026-05-08","s":141.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000983","cod":"000983","nom":"SERVICIOS MEDICOS VITAMED, C.A","tel":"","wa":"","saldo":768.64,"vence":"2026-05-01","facturas":[{"n":"00080445","em":"2026-04-16","ve":"2026-05-01","s":270.19},{"n":"00080606","em":"2026-05-19","ve":"2026-06-03","s":498.45}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx001004","cod":"001004","nom":"FARMACIA FARMACOS OJEDA, C.A","tel":"0424-6186537","wa":"584246186537","saldo":256.82,"vence":"2026-05-06","facturas":[{"n":"00080472","em":"2026-04-21","ve":"2026-05-06","s":71.8},{"n":"00080477","em":"2026-04-22","ve":"2026-05-07","s":81.0},{"n":"00080497","em":"2026-04-24","ve":"2026-05-09","s":104.02}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000786","cod":"000786","nom":"FARMACIA MI FARMA, C.A","tel":"0424-6222078","wa":"584246222078","saldo":175.75,"vence":"2026-05-06","facturas":[{"n":"00080471","em":"2026-04-21","ve":"2026-05-06","s":175.75}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000984","cod":"000984","nom":"FARMACIA DOCFARMA LA FUSTA, C.A","tel":"0424-6387994","wa":"584246387994","saldo":246.48,"vence":"2026-05-12","facturas":[{"n":"00080510","em":"2026-04-27","ve":"2026-05-12","s":133.56},{"n":"00080580","em":"2026-05-14","ve":"2026-05-29","s":10.32},{"n":"00080619","em":"2026-05-21","ve":"2026-06-05","s":11.76},{"n":"00080678","em":"2026-06-01","ve":"2026-06-16","s":35.04},{"n":"00080690","em":"2026-06-02","ve":"2026-06-17","s":55.8}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000998","cod":"000998","nom":"FARMA SERVICIOS CIUDAD OJEDA INTERCOMUNAL, C.A","tel":"0414-6589733","wa":"584146589733","saldo":110.3,"vence":"2026-05-13","facturas":[{"n":"00080517","em":"2026-04-28","ve":"2026-05-13","s":110.3}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000627","cod":"000627","nom":"FARMACIA VIRGEN DEL VALLE C A","tel":"0414-0621443","wa":"584140621443","saldo":431.28,"vence":"2026-05-13","facturas":[{"n":"00080512","em":"2026-04-28","ve":"2026-05-13","s":23.46},{"n":"00080578","em":"2026-05-14","ve":"2026-05-29","s":16.01},{"n":"00080617","em":"2026-05-21","ve":"2026-06-05","s":60.23},{"n":"00080621","em":"2026-05-21","ve":"2026-06-05","s":195.0},{"n":"00080661","em":"2026-05-29","ve":"2026-06-13","s":55.58},{"n":"00080672","em":"2026-06-01","ve":"2026-06-16","s":81.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000987","cod":"000987","nom":"EUREKA HIPERMERCADO, C.A.","tel":"0412-1241048","wa":"584121241048","saldo":346.44,"vence":"2026-05-14","facturas":[{"n":"00080520","em":"2026-04-29","ve":"2026-05-14","s":346.44}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000375","cod":"000375","nom":"FARMACIA LA PRIMERA, COMPAÑIA ANONIMA","tel":"0414-7608185","wa":"584147608185","saldo":90.49,"vence":"2026-05-19","facturas":[{"n":"00080533","em":"2026-05-04","ve":"2026-05-19","s":25.9},{"n":"00080556","em":"2026-05-07","ve":"2026-05-22","s":7.44},{"n":"00080587","em":"2026-05-15","ve":"2026-05-30","s":4.6},{"n":"00080623","em":"2026-05-21","ve":"2026-06-05","s":13.68},{"n":"00080629","em":"2026-05-25","ve":"2026-06-09","s":29.57},{"n":"00080668","em":"2026-06-01","ve":"2026-06-16","s":9.3}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000069","cod":"000069","nom":"CENTRO MEDICO DR. JOSE MUÑOZ, C. A.","tel":"0261-7563176","wa":"582617563176","saldo":2262.13,"vence":"2026-05-20","facturas":[{"n":"00080540","em":"2026-05-05","ve":"2026-05-20","s":356.5},{"n":"00080548","em":"2026-05-06","ve":"2026-05-21","s":1184.4},{"n":"00080602","em":"2026-05-19","ve":"2026-06-03","s":130.0},{"n":"00080633","em":"2026-05-25","ve":"2026-06-09","s":356.5},{"n":"00080676","em":"2026-06-01","ve":"2026-06-16","s":16.59},{"n":"00080683","em":"2026-06-02","ve":"2026-06-17","s":148.14},{"n":"00080684","em":"2026-06-02","ve":"2026-06-17","s":70.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000981","cod":"000981","nom":"FARMACIA FARMA SERVICIO LA CANDELARIA, C.A","tel":"04126939301","wa":"584126939301","saldo":216.79,"vence":"2026-05-20","facturas":[{"n":"00080535","em":"2026-05-05","ve":"2026-05-20","s":216.79}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000579","cod":"000579","nom":"FARMACIA LA VENEZOLANA SAN FRANCISCO, COMPAÑIA ANONIMA","tel":"0424-6253421","wa":"584246253421","saldo":110.18,"vence":"2026-05-20","facturas":[{"n":"00080542","em":"2026-05-05","ve":"2026-05-20","s":60.14},{"n":"00080586","em":"2026-05-15","ve":"2026-05-30","s":20.4},{"n":"00080691","em":"2026-06-02","ve":"2026-06-17","s":29.64}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx001021","cod":"001021","nom":"MULTITIENDAS FARMAK, C.A","tel":"0422-2901111","wa":"584222901111","saldo":414.72,"vence":"2026-05-20","facturas":[{"n":"00080537","em":"2026-05-05","ve":"2026-05-20","s":180.0},{"n":"00080538","em":"2026-05-05","ve":"2026-05-20","s":45.0},{"n":"00080561","em":"2026-05-08","ve":"2026-05-23","s":189.72}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000678","cod":"000678","nom":"FARMACIA Y MULTITIENDAS LAS RUBIO C.A.","tel":"0414-0632206","wa":"584140632206","saldo":245.04,"vence":"2026-05-22","facturas":[{"n":"00080559","em":"2026-05-07","ve":"2026-05-22","s":114.11},{"n":"00080654","em":"2026-05-28","ve":"2026-06-12","s":130.93}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000042","cod":"000042","nom":"CLINICA SUCRE, C.A.","tel":"7500123-7500463","wa":"587500123750","saldo":332.86,"vence":"2026-05-26","facturas":[{"n":"00080599","em":"2026-05-19","ve":"2026-05-26","s":90.8},{"n":"00080608","em":"2026-05-20","ve":"2026-05-27","s":46.38},{"n":"00080613","em":"2026-05-20","ve":"2026-05-27","s":14.29},{"n":"00080626","em":"2026-05-22","ve":"2026-05-29","s":45.0},{"n":"00080634","em":"2026-05-25","ve":"2026-06-01","s":45.0},{"n":"00080647","em":"2026-05-27","ve":"2026-06-03","s":45.0},{"n":"00080696","em":"2026-06-03","ve":"2026-06-10","s":37.25},{"n":"00080697","em":"2026-06-03","ve":"2026-06-10","s":9.14}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000932","cod":"000932","nom":"FARMACIA EL SAMAN DE PERIJA, C.A.","tel":"0424-6587669","wa":"584246587669","saldo":400.74,"vence":"2026-05-26","facturas":[{"n":"00080565","em":"2026-05-11","ve":"2026-05-26","s":59.61},{"n":"00080575","em":"2026-05-13","ve":"2026-05-28","s":92.34},{"n":"00080651","em":"2026-05-28","ve":"2026-06-12","s":31.35},{"n":"00080655","em":"2026-05-28","ve":"2026-06-12","s":184.34},{"n":"00080674","em":"2026-06-01","ve":"2026-06-16","s":33.1}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx001000","cod":"001000","nom":"CENTRO CLINICO MATERNO PEDIATRICO ZULIA, C.A","tel":"0414-6576058","wa":"584146576058","saldo":225.9,"vence":"2026-05-28","facturas":[{"n":"00080572","em":"2026-05-13","ve":"2026-05-28","s":225.9}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000960","cod":"000960","nom":"FARMAPLUS CECILIO ACOSTA, C.A","tel":"0424-6692517","wa":"584246692517","saldo":466.28,"vence":"2026-05-28","facturas":[{"n":"00080574","em":"2026-05-13","ve":"2026-05-28","s":31.16},{"n":"00080584","em":"2026-05-15","ve":"2026-05-30","s":225.9},{"n":"00080638","em":"2026-05-26","ve":"2026-06-10","s":71.31},{"n":"00080675","em":"2026-06-01","ve":"2026-06-16","s":45.0},{"n":"00080693","em":"2026-06-03","ve":"2026-06-18","s":92.91}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000412","cod":"000412","nom":"FARMACIA GOLDEN LOS PUERTOS, C.A.","tel":"0266-3211126","wa":"582663211126","saldo":450.0,"vence":"2026-05-30","facturas":[{"n":"00080589","em":"2026-05-15","ve":"2026-05-30","s":180.0},{"n":"00080648","em":"2026-05-27","ve":"2026-06-11","s":270.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000304","cod":"000304","nom":"FARMACIA LA MARABINA, C.A.","tel":"0424-6082276","wa":"584246082276","saldo":116.09,"vence":"2026-05-30","facturas":[{"n":"00080585","em":"2026-05-15","ve":"2026-05-30","s":116.09}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000653","cod":"000653","nom":"CENTRO MEDICO JESUS MARIA ROMERO COMPAÑIA ANONIMA","tel":"0412-7802484","wa":"584127802484","saldo":993.58,"vence":"2026-06-02","facturas":[{"n":"00080596","em":"2026-05-18","ve":"2026-06-02","s":364.21},{"n":"00080604","em":"2026-05-19","ve":"2026-06-03","s":275.5},{"n":"00080611","em":"2026-05-20","ve":"2026-06-04","s":59.85},{"n":"00080628","em":"2026-05-25","ve":"2026-06-09","s":294.03}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000608","cod":"000608","nom":"FARMACIA EL GRAN THOMAS, C.A.","tel":"0412-7861390","wa":"584127861390","saldo":189.33,"vence":"2026-06-02","facturas":[{"n":"00080592","em":"2026-05-18","ve":"2026-06-02","s":115.23},{"n":"00080597","em":"2026-05-19","ve":"2026-06-03","s":74.1}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000044","cod":"000044","nom":"CENTRO MEDICO DOCENTE PARAISO C.A.","tel":"0261-7000282","wa":"582617000282","saldo":499.01,"vence":"2026-06-03","facturas":[{"n":"00080642","em":"2026-05-27","ve":"2026-06-03","s":109.0},{"n":"00080643","em":"2026-05-27","ve":"2026-06-03","s":196.51},{"n":"00080644","em":"2026-05-27","ve":"2026-06-03","s":193.5}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000916","cod":"000916","nom":"FARMACIA FARMACHICA CENTRO C.A","tel":"0414-6333874","wa":"584146333874","saldo":20.0,"vence":"2026-06-03","facturas":[{"n":"00080600","em":"2026-05-19","ve":"2026-06-03","s":20.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000237","cod":"000237","nom":"DROGUERIA DIGECA DE OCCIDENTE C.A.","tel":"0414-0608547","wa":"584140608547","saldo":88.52,"vence":"2026-06-04","facturas":[{"n":"00080612","em":"2026-05-20","ve":"2026-06-04","s":41.0},{"n":"00080624","em":"2026-05-22","ve":"2026-06-06","s":33.12},{"n":"00080682","em":"2026-06-02","ve":"2026-06-17","s":14.4}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000611","cod":"000611","nom":"FARMACIA DR. GALUE, COMPANIA ANONIMA","tel":"0424-6955982","wa":"584246955982","saldo":196.78,"vence":"2026-06-04","facturas":[{"n":"00080614","em":"2026-05-20","ve":"2026-06-04","s":58.0},{"n":"00080660","em":"2026-05-28","ve":"2026-06-12","s":38.4},{"n":"00080669","em":"2026-06-01","ve":"2026-06-16","s":100.38}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000373","cod":"000373","nom":"FARMACIA DON DIEGO, C.A.","tel":"0414-9608135","wa":"584149608135","saldo":50.84,"vence":"2026-06-05","facturas":[{"n":"00080620","em":"2026-05-21","ve":"2026-06-05","s":15.08},{"n":"00080677","em":"2026-06-01","ve":"2026-06-16","s":24.0},{"n":"00080687","em":"2026-06-02","ve":"2026-06-17","s":11.76}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000823","cod":"000823","nom":"FARMACIA PILLS, C.A","tel":"0424-6917718","wa":"584246917718","saldo":104.0,"vence":"2026-06-05","facturas":[{"n":"00080622","em":"2026-05-21","ve":"2026-06-05","s":104.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000271","cod":"000271","nom":"FARMACIA DR. GALUE LA FUSTA. COMPAÑIA ANONIMA.","tel":"0414-6448387","wa":"584146448387","saldo":314.34,"vence":"2026-06-06","facturas":[{"n":"00080625","em":"2026-05-22","ve":"2026-06-06","s":28.35},{"n":"00080631","em":"2026-05-25","ve":"2026-06-09","s":54.98},{"n":"00080649","em":"2026-05-27","ve":"2026-06-11","s":161.1},{"n":"00080671","em":"2026-06-01","ve":"2026-06-16","s":69.91}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx001022","cod":"001022","nom":"FARMACIA JOSE GREGORIO HERNANDEZ, C. A.","tel":"0414-7319233","wa":"584147319233","saldo":30.56,"vence":"2026-06-08","facturas":[{"n":"00080667","em":"2026-06-01","ve":"2026-06-08","s":30.56}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000269","cod":"000269","nom":"FARMACIA DON AHORRO,C.A","tel":"0263-4510507","wa":"582634510507","saldo":700.38,"vence":"2026-06-09","facturas":[{"n":"00080636","em":"2026-05-25","ve":"2026-06-09","s":635.34},{"n":"00080650","em":"2026-05-27","ve":"2026-06-11","s":65.04}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000750","cod":"000750","nom":"MULTITIENDA FARMA SERVICIOS LOS COCHES COMPAÑIA ANONIMA","tel":"0412-7984822","wa":"584127984822","saldo":95.19,"vence":"2026-06-09","facturas":[{"n":"00080632","em":"2026-05-25","ve":"2026-06-09","s":46.46},{"n":"00080670","em":"2026-06-01","ve":"2026-06-16","s":48.73}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000634","cod":"000634","nom":"FARMACIA VERITAS EL MOJAN C A","tel":"0414-6290422","wa":"584146290422","saldo":790.29,"vence":"2026-06-10","facturas":[{"n":"00080639","em":"2026-05-26","ve":"2026-06-10","s":65.15},{"n":"00080666","em":"2026-06-01","ve":"2026-06-16","s":725.13}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000928","cod":"000928","nom":"FARMACIA DE TODOS CA","tel":"","wa":"","saldo":118.83,"vence":"2026-06-11","facturas":[{"n":"00080646","em":"2026-05-27","ve":"2026-06-11","s":72.73},{"n":"00080652","em":"2026-05-28","ve":"2026-06-12","s":9.9},{"n":"00080688","em":"2026-06-02","ve":"2026-06-17","s":36.2}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000371","cod":"000371","nom":"FARMACIA CLARIMAR C.A","tel":"0424-6673320","wa":"584246673320","saldo":48.51,"vence":"2026-06-12","facturas":[{"n":"00080656","em":"2026-05-28","ve":"2026-06-12","s":48.51}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000980","cod":"000980","nom":"FARMALIDER 2024, C.A","tel":"0424-6312160","wa":"584246312160","saldo":16.52,"vence":"2026-06-12","facturas":[{"n":"00080653","em":"2026-05-28","ve":"2026-06-12","s":16.52}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000761","cod":"000761","nom":"FARMACIA LA SOCIAL CUATRICENTENARIO, C.A","tel":"0414-6769409","wa":"584146769409","saldo":19.0,"vence":"2026-06-13","facturas":[{"n":"00080662","em":"2026-05-29","ve":"2026-06-13","s":6.0},{"n":"00080694","em":"2026-06-03","ve":"2026-06-18","s":13.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx001012","cod":"001012","nom":"MULTITIENDA FARMA SERVICIOS LAS MERCEDES, C.A","tel":"0412-6600817","wa":"584126600817","saldo":65.46,"vence":"2026-06-17","facturas":[{"n":"00080686","em":"2026-06-02","ve":"2026-06-17","s":65.46}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000572","cod":"000572","nom":"FARMACIA LOS OLIVOS, C.A.","tel":"0424-6386942","wa":"584246386942","saldo":26.0,"vence":"2026-06-18","facturas":[{"n":"00080695","em":"2026-06-03","ve":"2026-06-18","s":26.0}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000747","cod":"000747","nom":"MULTITIENDA FARMA SERVICIOS BELLA VISTA, C.A","tel":"0424-6587669","wa":"584246587669","saldo":87.29,"vence":"2026-06-18","facturas":[{"n":"00080692","em":"2026-06-03","ve":"2026-06-18","s":87.29}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""},{"id":"cx000990","cod":"000990","nom":"FARMACIA FARMA SERVICIOS LA FLORIDA, C.A","tel":"0412-6939301","wa":"584126939301","saldo":46.78,"vence":"2026-06-25","facturas":[{"n":"00080641","em":"2026-05-26","ve":"2026-06-25","s":46.78}],"estado":"pendiente","cobrado_en":null,"recordar":"2026-06-03","notas":""}];
var _cxcFiltro='porcobrar', _cxcSearch='', _cxcDetId=null;
var DROG_LOGO_SVG = '<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="161.000000pt" height="116.000000pt" viewBox="0 0 161.000000 116.000000" preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,116.000000) scale(0.100000,-0.100000)" fill="#5B8FD4" stroke="none"> <path d="M195 1065 c-5 -2 -26 -6 -46 -9 -32 -6 -38 -11 -43 -39 -9 -47 18 -128 54 -162 30 -29 35 -30 125 -30 117 0 123 5 106 79 -14 65 -45 114 -86 137 -30 17 -91 30 -110 24z"/> <path d="M534 998 c-39 -52 -42 -58 -15 -33 39 36 75 84 68 91 -3 3 -26 -23 -53 -58z"/> <path d="M469 913 c-13 -16 -12 -17 4 -4 16 13 21 21 13 21 -2 0 -10 -8 -17 -17z"/> <path d="M610 774 c-66 -7 -185 -25 -202 -30 -47 -14 -65 -232 -28 -339 19 -56 73 -139 96 -149 10 -4 24 62 54 254 30 191 35 210 53 216 10 3 69 6 130 6 94 1 119 -2 157 -20 56 -25 97 -65 116 -111 l14 -34 31 46 c18 28 55 62 89 84 l57 37 -66 19 c-51 14 -111 19 -266 22 -110 2 -216 1 -235 -1z"/> <path d="M1225 621 c-77 -35 -115 -102 -115 -199 0 -45 5 -66 21 -86 41 -52 109 -69 189 -46 41 12 50 3 50 -57 0 -37 -3 -42 -31 -52 -18 -6 -70 -11 -116 -11 -69 0 -92 4 -132 24 -51 27 -94 74 -105 119 l-7 28 -36 -48 c-20 -26 -46 -55 -57 -63 -40 -29 -122 -58 -185 -65 -76 -9 -69 -15 54 -46 80 -20 115 -22 310 -23 163 0 250 5 337 18 136 21 132 17 131 136 -2 143 -45 258 -131 345 -40 41 -48 45 -90 45 -26 0 -65 -9 -87 -19z"/> <path d="M667 549 c-38 -204 -47 -255 -47 -266 0 -21 95 -16 140 7 79 40 127 162 99 249 -18 57 -54 83 -122 89 l-54 4 -16 -83z"/> <path d="M282 505 c-26 -140 -11 -255 49 -364 33 -59 34 -60 52 -42 18 17 18 19 -7 55 -59 87 -92 230 -81 349 3 37 5 67 3 67 -2 0 -9 -29 -16 -65z"/> </g> </svg>';
var _drogLogoImg=null;
try{ _drogLogoImg=new Image(); _drogLogoImg.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(DROG_LOGO_SVG); }catch(e){}
var FARM_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1160 1160"><rect width="1160" height="1160" fill="#79C820"/><g transform="translate(44.5,1160) scale(0.1,-0.1)" fill="#1E38A6" fill-rule="evenodd" stroke="none"><path d="M0 5800 l0 -5800 5355 0 5355 0 0 5800 0 5800 -5355 0 -5355 0 0 -5800z m6058 2113 c5 -21 28 -104 50 -184 72 -257 119 -495 148 -749 21 -188 15 -621 -11 -780 -64 -399 -243 -772 -459 -959 -105 -91 -215 -75 -285 41 -21 36 -26 55 -26 113 1 87 15 116 104 210 150 159 247 374 297 661 25 140 30 468 10 654 -19 185 -56 400 -69 400 -13 0 -42 -36 -112 -141 -255 -382 -414 -967 -480 -1769 -8 -96 -15 -195 -15 -220 l0 -45 116 -57 c229 -113 524 -307 684 -450 176 -158 375 -375 474 -517 191 -272 341 -577 430 -874 46 -150 51 -183 36 -237 -34 -131 -152 -195 -259 -141 -33 17 -91 86 -91 109 0 16 -79 252 -114 342 -187 471 -542 895 -1001 1191 -391 254 -831 423 -1435 553 -369 79 -857 119 -1425 116 -41 0 -105 52 -132 108 -22 46 -25 62 -21 123 6 76 34 131 90 172 96 72 902 34 1452 -68 260 -48 519 -114 730 -185 49 -16 92 -27 97 -24 5 3 9 29 9 57 0 102 37 441 71 657 116 731 342 1302 648 1635 60 65 175 165 226 195 38 24 219 97 241 99 6 1 16 -16 22 -36z m-3032 -32 c50 -23 83 -64 128 -162 99 -215 170 -517 197 -844 17 -207 7 -764 -16 -827 -18 -50 -73 -114 -112 -129 -58 -22 -140 -3 -182 42 -57 60 -56 51 -56 484 0 360 -2 415 -22 550 -35 239 -77 390 -146 534 -54 110 -60 176 -24 254 47 103 138 141 233 98z m5042 -2796 c82 -35 126 -106 126 -205 0 -109 -36 -159 -179 -244 -64 -38 -178 -116 -250 -173 -13 -10 -170 -150 -200 -178 -93 -86 -201 -233 -271 -365 -28 -54 -47 -77 -79 -95 -111 -66 -235 2 -266 143 -19 90 15 178 137 363 158 237 437 493 760 695 122 77 156 86 222 59z"/></g></svg>';
var _farmLogoImg=null;
try{ _farmLogoImg=new Image(); _farmLogoImg.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(FARM_LOGO_SVG); }catch(e){}
var CXC_NEG={ drog:{nom:'Droguería',tit:'Cuentas por Cobrar — Droguería',emp:'DROGUERÍA CLÍNICA, C.A.',dir:'Av 18 y 19 con calle 65, Edif. Droguería Clínica · Tel: 0261-7523816',color:'#5B8FD4',mono:'DC'}, farm:{nom:'Farmacia',tit:'Cuentas por Cobrar — Farmacia',emp:'FARMACIA CLARET, C.A.',dir:'Farmacia Claret · Tel: 0261-7523812',color:'#1E38A6',mono:'FC'} };
var _cxcNegSel='drog';
function _cxcNeg(){ var e=(typeof EMPRESA!=='undefined')?EMPRESA:''; if(e==='farmacia')return 'farm'; if(e==='drogueria')return 'drog'; return _cxcNegSel; }
function _cxcKey(){ return 'cxc_'+_cxcNeg(); }
function _cxcKeyCob(){ return _cxcNeg()==='drog' ? 'cxc_cobradas' : 'cxc_farm_cobradas'; }
function _cxcLogoImg(){ return _cxcNeg()==='farm' ? _farmLogoImg : _drogLogoImg; }
function cxcList(){ var k=_cxcKey(); return Array.isArray(db[k])?db[k]:[]; }
function _cxcDias(ve){ if(!ve) return null; return Math.floor((new Date(HOY())-new Date(ve))/86400000); }
function _cxcAddDias(sfecha,n){ var d=new Date(sfecha); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function _cxcBadge(c){
  if(c.estado==='cobrado') return '<span style="background:#dcfce7;color:#166534;border-radius:20px;padding:2px 9px;font-size:10px;font-weight:700">Cobrado</span>';
  var d=_cxcDias(c.vence);
  if(d==null) return '<span style="background:var(--surface2);color:var(--muted);border-radius:20px;padding:2px 9px;font-size:10px;font-weight:700">Sin fecha</span>';
  if(d>0) return '<span style="background:#fee2e2;color:#b91c1c;border-radius:20px;padding:2px 9px;font-size:10px;font-weight:700">Vencida '+d+'d</span>';
  return '<span style="background:#fef3c7;color:#92400e;border-radius:20px;padding:2px 9px;font-size:10px;font-weight:700">Vence en '+Math.abs(d)+'d</span>';
}
function _cxcMsg(c){
  var fa=(c.facturas||[]);
  var L=[];
  var _NM=CXC_NEG[_cxcNeg()];
  L.push('*'+_NM.emp+'*');
  L.push('Estado de cuenta');
  L.push('');
  L.push('Estimados, ' + (c.nom||'') + ':');
  L.push('Le recordamos amablemente su saldo pendiente con nosotros.');
  L.push('');
  L.push('*Total adeudado: $' + fmt(c.saldo||0) + '*');
  if (fa.length){
    L.push('');
    L.push('*Detalle:*');
    fa.slice(0,15).forEach(function(ff){
      L.push('• Factura N° ' + ff.n + ' — $' + fmt(ff.s||0) + (ff.ve ? ('  (vence ' + fmtDate(ff.ve) + ')') : ''));
    });
    if (fa.length>15) L.push('• ... y ' + (fa.length-15) + ' factura(s) más');
  }
  L.push('');
  L.push('Agradecemos su pronto pago. Quedamos atentos a cualquier consulta.');
  L.push('¡Muchas gracias!');
  return L.join('\n');
}
function waCxC(id){
  var c=cxcList().find(function(x){return x.id===id;}); if(!c) return;
  if(!c.wa){ showToast('Este cliente no tiene teléfono registrado'); return; }
  window.open('https://wa.me/'+c.wa+'?text='+encodeURIComponent(_cxcMsg(c)),'_blank');
}
function compartirFacturaCxC(id){
  var c=cxcList().find(function(x){return x.id===id;}); if(!c) return;
  var fa=c.facturas||[]; var W=720, H=Math.max(440,300+fa.length*28+130);
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H; var x=cv.getContext('2d');
  x.fillStyle='#ffffff'; x.fillRect(0,0,W,H);
  var _NM=CXC_NEG[_cxcNeg()]; var DBLUE=_NM.color; var _LG=_cxcLogoImg();
  x.fillStyle=DBLUE; x.fillRect(0,0,W,96);
  x.fillStyle='#ffffff'; try{ if(x.roundRect){x.beginPath();x.roundRect(26,20,58,58,12);x.fill();}else{x.fillRect(26,20,58,58);} }catch(e){ x.fillRect(26,20,58,58); }
  if(_LG && _LG.complete && _LG.naturalWidth){ try{ x.drawImage(_LG,30,30,52,40); }catch(e){ x.fillStyle=DBLUE; x.font='bold 26px Arial'; x.textAlign='center'; x.fillText(_NM.mono,55,63); x.textAlign='left'; } }
  else { x.fillStyle=DBLUE; x.font='bold 26px Arial'; x.textAlign='center'; x.fillText(_NM.mono,55,63); x.textAlign='left'; }
  x.fillStyle='#fff'; x.font='bold 24px Arial'; x.fillText(_NM.emp,100,48);
  x.font='13px Arial'; x.fillText(_NM.dir,100,73);
  x.fillStyle='#0f172a'; x.font='bold 20px Arial'; x.fillText('ESTADO DE CUENTA',30,132);
  x.font='13px Arial'; x.fillStyle='#475569'; x.textAlign='right'; x.fillText('Fecha: '+fmtDate(HOY()),W-30,132); x.textAlign='left';
  x.fillStyle='#0f172a'; x.font='bold 16px Arial'; x.fillText((c.nom||''),30,168);
  x.font='13px Arial'; x.fillStyle='#475569'; x.fillText('Código: '+(c.cod||'')+(c.tel?('     Tel: '+c.tel):''),30,189);
  var ty=226; x.fillStyle='#f1f5f9'; x.fillRect(30,ty-18,W-60,26);
  x.fillStyle='#334155'; x.font='bold 12px Arial';
  x.fillText('N° Factura',40,ty); x.fillText('Emisión',205,ty); x.fillText('Vencimiento',310,ty);
  x.textAlign='right'; x.fillText('Montos',545,ty); x.fillText('Saldo',W-45,ty); x.textAlign='left';
  var yy=ty+27; var _acum=0;
  fa.forEach(function(ff){
    x.font='13px Arial'; x.fillStyle='#0f172a'; x.fillText(ff.n||'',40,yy);
    x.font='12px Arial'; x.fillStyle='#475569'; x.fillText(ff.em?fmtDate(ff.em):'-',205,yy); x.fillText(ff.ve?fmtDate(ff.ve):'-',310,yy);
    _acum+=(Number(ff.s)||0); x.font='13px Arial'; x.textAlign='right'; x.fillStyle='#0f172a'; x.fillText('$'+fmt(ff.s||0),545,yy); x.fillStyle=DBLUE; x.fillText('$'+fmt(_acum),W-45,yy); x.fillStyle='#0f172a'; x.textAlign='left';
    yy+=27;
  });
  x.strokeStyle='#cbd5e1'; x.beginPath(); x.moveTo(30,yy-4); x.lineTo(W-30,yy-4); x.stroke();
  x.font='bold 17px Arial'; x.fillStyle=DBLUE; x.textAlign='right'; x.fillText('TOTAL ADEUDADO:  $'+fmt(c.saldo||0),W-45,yy+24); x.textAlign='left';
  x.font='11px Arial'; x.fillStyle='#94a3b8'; x.fillText('Documento generado por el sistema de Cuentas por Cobrar.',30,H-18);
  cv.toBlob(function(blob){
    if(!blob){ showToast('No se pudo generar la imagen'); return; }
    var file=new File([blob],'estado_cuenta_'+(c.cod||'cliente')+'.png',{type:'image/png'});
    try{
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:'Estado de cuenta',text:_cxcMsg(c)}).catch(function(){});
        return;
      }
    }catch(e){}
    var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=file.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){URL.revokeObjectURL(url);},1500);
    showToast('Factura descargada — adjúntala en WhatsApp');
  });
}
function cobrarCxC(id){
  var c=cxcList().find(function(x){return x.id===id;}); if(!c) return;
  if(!confirm('¿Marcar como COBRADO a '+(c.nom||'')+'? Saldrá de la lista de pendientes.')) return;
  c.estado='cobrado'; c.cobrado_en=HOY();
  if(typeof logAudit==='function') logAudit('cxc.cobrado',(c.nom||'')+' · $'+fmt(c.saldo||0));
  saveDB(db); try{closeOverlay('ov-cxc-det');}catch(e){} renderCxC(); showToast('Marcado como cobrado');
}
function recordarCxC(id){
  var c=cxcList().find(function(x){return x.id===id;}); if(!c) return;
  c.recordar=_cxcAddDias(HOY(),3);
  if(typeof logAudit==='function') logAudit('cxc.recordar',(c.nom||'')+' · '+c.recordar);
  saveDB(db); try{closeOverlay('ov-cxc-det');}catch(e){} renderCxC(); showToast('Te lo recuerdo el '+fmtDate(c.recordar));
}
function revertirCxC(id){
  var c=cxcList().find(function(x){return x.id===id;}); if(!c) return;
  c.estado='pendiente'; c.cobrado_en=null; c.recordar=HOY();
  saveDB(db); renderCxC(); showToast('Devuelto a pendientes');
}
function importarCxCDrog(){
  if(cxcList().length && !confirm('Ya hay datos. ¿Reemplazar con el reporte completo (90 clientes)?')) return;
  db.cxc_drog = JSON.parse(JSON.stringify(CXC_DROG_SEED));
  if(typeof logAudit==='function') logAudit('cxc.importar','Importados '+db.cxc_drog.length+' clientes');
  saveDB(db); renderCxC(); showToast('Importados '+db.cxc_drog.length+' clientes');
}
function _cxcCard(c){
  var rec=(c.recordar && c.recordar>HOY())?'<span style="font-size:11px;color:var(--muted);margin-left:6px">· recordar '+fmtDate(c.recordar)+'</span>':'';
  var waBtn = c.wa ? '<button class="btn btn-green btn-sm" onclick="waCxC(\''+c.id+'\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:3px"><path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.2L2 22l4.9-1.6A9.9 9.9 0 1 0 12.04 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.18-2.9.95.95-2.84-.2-.3A8 8 0 1 1 12.04 20Zm4.4-5.6c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24 0-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/></svg> WhatsApp</button>' : '<span style="font-size:11px;color:var(--muted)">sin teléfono</span>';
  var acciones=waBtn+
    '<button class="btn btn-ghost btn-sm" onclick="compartirFacturaCxC(\''+c.id+'\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> Factura</button>'+
    '<button class="btn btn-ghost btn-sm write-only" onclick="recordarCxC(\''+c.id+'\')" title="Recordar en 3 días"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> +3 días</button>';
  return '<div class="tbox" style="margin-bottom:10px;padding:12px 14px">'+
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
      '<span style="font-weight:700;font-size:14px;cursor:pointer" onclick="abrirCxCDetalle(\''+c.id+'\')">'+esc(c.nom||'')+'</span>'+
      _cxcBadge(c)+rec+
      '<div class="spacer" style="flex:1"></div>'+
      '<span style="font-family:var(--mono);font-weight:700;font-size:16px">$'+fmt(c.saldo||0)+'</span>'+
    '</div>'+
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px">'+
      '<span style="font-size:11px;color:var(--muted)">'+(c.facturas?c.facturas.length:0)+' factura(s)'+(c.vence?' · vence '+fmtDate(c.vence):'')+(c.tel?' · '+esc(c.tel):'')+'</span>'+
      '<div class="spacer" style="flex:1"></div>'+acciones+
      '<button class="btn btn-ghost btn-sm btn-icon" onclick="abrirCxCDetalle(\''+c.id+'\')" title="Detalle"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>'+
    '</div>'+
  '</div>';
}
function _cxcNum(x){ x=String(x).trim(); var neg=x.charAt(0)==='-'; if(neg)x=x.slice(1); var p=x.split(','); if(p.length===1){ var v=parseFloat(p[0]); return isNaN(v)?null:(neg?-v:v); } var dec=p[p.length-1], ent=p.slice(0,-1).join(''); var v=parseFloat(ent||'0')+parseFloat(dec)/Math.pow(10,dec.length); return isNaN(v)?null:(neg?-v:v); }
function _cxcIso(d){ var m=String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?(m[3]+'-'+m[2]+'-'+m[1]):null; }
function parseCxCTexto(text){
  var lines=String(text).split(/\r?\n/), clientes=[], cur=null;
  var reCli=/Cliente:\s*(\d+)\s*-\s*(.+?)\s{2,}.*?Tel[^:]*:\s*([\d\-\s]*)/;
  var reInv=/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+-?[\d,]+\s+(\d{8})\s+(Bol|D[oó]l)/i;
  for(var i=0;i<lines.length;i++){
    var ln=lines[i], mc=ln.match(reCli);
    if(mc){ if(cur)clientes.push(cur); cur={cod:mc[1],nom:mc[2].trim(),tel:(mc[3]||'').replace(/\s/g,''),facturas:[]}; continue; }
    if(!cur) continue;
    var mi=ln.match(reInv);
    if(mi){ var nums=(ln.match(/-?\d[\d,]*,\d{2}/g)||[]).map(_cxcNum); var saldo=nums.length>=5?nums[4]:(nums.length>=4?nums[3]:0);
      cur.facturas.push({n:mi[3], em:_cxcIso(mi[1]), ve:_cxcIso(mi[2]), s:Math.round((saldo||0)*100)/100}); }
  }
  if(cur)clientes.push(cur);
  clientes.forEach(function(c){ c.saldo=Math.round(c.facturas.reduce(function(a,ff){return a+(ff.s||0);},0)*100)/100; var vm=null; c.facturas.forEach(function(ff){ if(ff.ve&&(vm===null||ff.ve<vm))vm=ff.ve; }); c.vence=vm; });
  return clientes;
}
function importarCxCTexto(text){
  var nuevos; try{ nuevos=parseCxCTexto(text); }catch(e){ showToast('No pude leer el archivo'); return; }
  if(!nuevos.length){ showToast('El archivo no tiene clientes con el formato esperado'); return; }
  var hoy=HOY(), KK=_cxcKey(), KC=_cxcKeyCob(), viejos=cxcList(), oldByNum={}, oldByCod={};
  viejos.forEach(function(c){ oldByCod[c.cod]=c; (c.facturas||[]).forEach(function(ff){ oldByNum[ff.n]={c:c,f:ff}; }); });
  var newNums={}; nuevos.forEach(function(c){ (c.facturas||[]).forEach(function(ff){ newNums[ff.n]=1; }); });
  if(!Array.isArray(db[KC])) db[KC]=[];
  var pagadas=0;
  Object.keys(oldByNum).forEach(function(n){ if(!newNums[n]){ var o=oldByNum[n]; db[KC].push({n:n,cod:o.c.cod,nom:o.c.nom,em:o.f.em,ve:o.f.ve,s:o.f.s,fecha_cobro:hoy}); pagadas++; } });
  db[KK] = nuevos.map(function(c){ var prev=oldByCod[c.cod]||{}; var tel=(prev.tel!=null&&prev.tel!=='')?prev.tel:(c.tel||'');
    return {id:'cx'+c.cod,cod:c.cod,nom:c.nom,tel:tel,wa:_waNorm(tel),saldo:c.saldo,vence:c.vence,facturas:c.facturas,estado:'pendiente',recordar:prev.recordar||hoy,notas:prev.notas||''}; });
  if(typeof logAudit==='function') logAudit('cxc.importar_texto', nuevos.length+' clientes · '+pagadas+' pagadas');
  saveDB(db); renderCxC();
  showToast('Actualizado: '+nuevos.length+' clientes · '+pagadas+' factura(s) cobrada(s)');
}
function _cxcLeerArchivo(file){ if(!file){ showToast('No se recibió archivo'); return; } var r=new FileReader(); r.onload=function(){ importarCxCTexto(String(r.result||'')); }; r.onerror=function(){ showToast('Error al leer el archivo'); }; r.readAsText(file,'ISO-8859-1'); }
function _cxcDrop(e){ e.preventDefault(); var dz=document.getElementById('cxc-drop'); if(dz){dz.style.borderColor='var(--border)';dz.style.background='var(--surface2)';} var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; _cxcLeerArchivo(f); }
function _cxcFile(inp){ _cxcLeerArchivo(inp.files&&inp.files[0]); inp.value=''; }
// Trae el último envío de A2 (que su "puente" dejó en la bandeja del servidor) y
// corre la MISMA reconciliación que el arrastrar archivo, para el negocio actual.
function traerDeA2(){
  var neg=_cxcNeg();
  var dataset='cxc_'+(neg==='farm'?'farm':'drog');
  var st=document.getElementById('cxc-a2-status'); if(st) st.textContent='Consultando A2…';
  if(typeof supabaseClient==='undefined'||!supabaseClient){ showToast('Sin conexión al servidor'); return; }
  supabaseClient.from('app_sections').select('data,updated_at').eq('section_name','a2_inbox_'+dataset).maybeSingle()
    .then(function(res){
      if(res.error){ showToast('No pude consultar A2'); if(st) st.textContent=''; return; }
      var row=res.data&&res.data.data;
      if(!row){ showToast('A2 todavía no ha enviado datos de '+(neg==='farm'?'Farmacia':'Droguería')); if(st) st.textContent='Sin datos de A2 aún.'; return; }
      var payload=row.payload;
      var text=(typeof payload==='string')?payload:((payload&&typeof payload.texto==='string')?payload.texto:'');
      if(!text){ showToast('El envío de A2 no trae el texto en el formato esperado'); if(st) st.textContent='Formato inesperado.'; return; }
      importarCxCTexto(text);
      if(st) st.textContent='Aplicado de A2 · recibido '+String(row.recibido_en||res.data.updated_at||'').slice(0,16).replace('T',' ');
    }).catch(function(){ showToast('No pude consultar A2'); if(st) st.textContent=''; });
}
function _cxcCobradasHTML(){
  var cob=(db[_cxcKeyCob()]||[]).slice();
  if(_cxcSearch){ var q=_cxcSearch.toLowerCase(); cob=cob.filter(function(x){return (x.nom||'').toLowerCase().indexOf(q)>=0||(x.n||'').indexOf(_cxcSearch)>=0;}); }
  cob.sort(function(a,b){ return (b.fecha_cobro||'').localeCompare(a.fecha_cobro||''); });
  if(!cob.length) return '<div class="empty-state" style="padding:24px"><p>Aún no hay facturas cobradas.</p><span>Se registran solas cuando una factura deja de aparecer en el archivo.</span></div>';
  var tot=cob.reduce(function(a,x){return a+(x.s||0);},0);
  var rows=cob.map(function(x){ return '<tr><td data-label="Cobrada" style="white-space:nowrap;font-size:12px">'+(x.fecha_cobro?fmtDate(x.fecha_cobro):'-')+'</td><td data-label="Cliente" style="font-size:12px">'+esc(x.nom||'')+'</td><td data-label="N°" class="mono" style="font-size:11px">'+esc(x.n||'')+'</td><td data-label="Vencía" style="font-size:11px;color:var(--muted)">'+(x.ve?fmtDate(x.ve):'-')+'</td><td data-label="Monto" class="mono r" style="font-size:12px;font-weight:600">$'+fmt(x.s||0)+'</td></tr>'; }).join('');
  return '<div class="tbox"><div class="tbox-hd"><span class="tbox-title">Facturas cobradas</span><span class="tbox-meta">'+cob.length+' · $'+fmt(tot)+'</span></div><div class="twrap"><table class="tbl-cards"><thead><tr><th>Cobrada</th><th>Cliente</th><th>N° Factura</th><th>Vencía</th><th class="r">Monto $</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

function renderCxC(){
  var el=document.getElementById('cxc-content'); if(!el) return;
  if(typeof _cxbCargar==='function'){ setTimeout(_cxbCargar,30); }
  var lista=cxcList(), hoy=HOY();
  var totalPend=lista.reduce(function(a,c){return a+(Number(c.saldo)||0);},0);
  var vencidas=lista.filter(function(c){var d=_cxcDias(c.vence);return d!=null&&d>0;});
  var agenda=lista.filter(function(c){return !c.recordar||c.recordar<=hoy;});
  var _NM=CXC_NEG[_cxcNeg()]; var cobradas=Array.isArray(db[_cxcKeyCob()])?db[_cxcKeyCob()]:[];
  var negTog=(typeof EMPRESA!=='undefined'&&EMPRESA==='consolidado')?('<div class="fchips" style="margin-bottom:12px">'+[['drog','Droguería'],['farm','Farmacia']].map(function(t){return '<button class="fchip '+(_cxcNegSel===t[0]?'active':'')+'" onclick="_cxcNegSel=\''+t[0]+'\';renderCxC()">'+t[1]+'</button>';}).join('')+'</div>'):'';
  var drop='<div class="write-only" id="cxc-drop" ondragover="event.preventDefault();this.style.borderColor=\'var(--primary)\'" ondragleave="this.style.borderColor=\'var(--border)\'" ondrop="_cxcDrop(event)" onclick="document.getElementById(\'cxc-file\').click()" style="border:2px dashed var(--border);border-radius:12px;padding:16px;text-align:center;margin-bottom:16px;cursor:pointer;background:var(--surface2);transition:border-color .2s"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg><div style="font-weight:600;font-size:13px;margin-top:4px">Arrastra aquí el archivo de Cuentas por Cobrar (.txt)</div><div style="font-size:11.5px;color:var(--muted);margin-top:3px">o haz clic para seleccionarlo · las facturas que ya no aparezcan se marcan como cobradas</div><input type="file" id="cxc-file" accept=".txt,text/plain" style="display:none" onchange="_cxcFile(this)"></div>';
  var a2row='<div class="write-only" style="margin:-8px 0 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" onclick="traerDeA2()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.6L21 8"/><path d="M21 3v5h-5"/></svg>Traer de A2</button><span id="cxc-a2-status" style="font-size:11px;color:var(--muted)"></span></div>';
  var html='<p class="section-title">'+_NM.tit+'</p>'+negTog+drop+a2row;
  html+='<div class="summary-grid sg-4" style="margin-bottom:16px">'+
    '<div class="scard blue"><div class="scard-label">Total por cobrar</div><div class="scard-val">$'+fmt(totalPend)+'</div><div class="scard-sub">'+lista.length+' clientes</div></div>'+
    '<div class="scard red"><div class="scard-label">Vencidas</div><div class="scard-val">'+vencidas.length+'</div><div class="scard-sub">con saldo vencido</div></div>'+
    '<div class="scard amber"><div class="scard-label">En agenda hoy</div><div class="scard-val">'+agenda.length+'</div><div class="scard-sub">por cobrar hoy</div></div>'+
    '<div class="scard green"><div class="scard-label">Cobradas</div><div class="scard-val">'+cobradas.length+'</div><div class="scard-sub">facturas pagadas</div></div>'+
  '</div>';
  html+='<div class="filter-bar filter-bar-v"><input type="text" id="cxc-search" placeholder="Buscar cliente, teléfono o N° factura..." value="'+esc(_cxcSearch)+'" oninput="_cxcSearch=this.value;renderCxC()" style="font-size:13px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">'+
    '<div class="fchips">'+[['porcobrar','Por cobrar hoy'],['pendientes','Todos los pendientes'],['cobradas','Cobradas']].map(function(c){return '<button class="fchip '+(_cxcFiltro===c[0]?'active':'')+'" onclick="_cxcFiltro=\''+c[0]+'\';renderCxC()">'+c[1]+'</button>';}).join('')+'</div></div>';
  if(_cxcFiltro==='cobradas'){ html+=_cxcCobradasHTML(); el.innerHTML='<div id="cxb-box"></div>'+html; var _s0=document.getElementById('cxc-search'); if(_s0&&_cxcSearch){_s0.focus();try{var L0=_s0.value.length;_s0.setSelectionRange(L0,L0);}catch(e){}} return; }
  var arr=(_cxcFiltro==='pendientes')?lista.slice():agenda.slice();
  if(_cxcSearch){ var q=_cxcSearch.toLowerCase(); arr=arr.filter(function(c){return (c.nom||'').toLowerCase().indexOf(q)>=0||(c.tel||'').indexOf(_cxcSearch)>=0;}); }
  arr.sort(function(a,b){ return (a.vence||'9999').localeCompare(b.vence||'9999'); });
  if(!lista.length) html+='<div class="empty-state" style="padding:24px"><p>Aún no hay deudores cargados.</p><span>Arrastra el archivo de Cuentas por Cobrar arriba para cargar la lista.</span></div>';
  else if(!arr.length) html+='<div class="empty-state" style="padding:24px"><p>Nada en esta vista.</p></div>';
  else html+=arr.map(_cxcCard).join('');
  el.innerHTML=html;
  var _s=document.getElementById('cxc-search'); if(_s&&_cxcSearch){_s.focus();try{var L=_s.value.length;_s.setSelectionRange(L,L);}catch(e){}}
}
function guardarTelCxC(id){
  var c=cxcList().find(function(x){return x.id===id;}); if(!c) return;
  var el=document.getElementById('cxc-tel-edit'); if(!el) return;
  var tel=(el.value||'').trim();
  c.tel=tel;
  var num=tel.replace(/[^0-9]/g,'');
  if(num){ if(num.length===11 && num.charAt(0)==='0') num='58'+num.slice(1); else if(num.length===10) num='58'+num; c.wa=num; } else { c.wa=''; }
  if(typeof logAudit==='function') logAudit('cxc.telefono',(c.nom||'')+' · '+tel);
  saveDB(db);
  if(typeof showToast==='function') showToast(tel?('Teléfono guardado: '+tel):'Teléfono borrado');
  try{ abrirCxCDetalle(id); }catch(e){}
  try{ renderCxC(); }catch(e){}
}
function abrirCxCDetalle(id){
  var c=cxcList().find(function(x){return x.id===id;}); if(!c) return; _cxcDetId=id;
  var fa=c.facturas||[];
  var rows=fa.map(function(ff){return '<tr><td style="font-size:12px">'+esc(ff.n||'')+'</td><td style="font-size:11px;color:var(--muted)">'+(ff.em?fmtDate(ff.em):'-')+'</td><td style="font-size:11px;color:var(--muted)">'+(ff.ve?fmtDate(ff.ve):'-')+'</td><td class="mono r" style="font-size:12px;font-weight:600">$'+fmt(ff.s||0)+'</td></tr>';}).join('');
  var H='<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px">'+
    '<strong style="font-size:15px">'+esc(c.nom||'')+'</strong> '+_cxcBadge(c)+'<br>'+
    '<span style="font-size:12px;color:var(--muted)">Código '+esc(c.cod||'')+(c.tel?(' · '+esc(c.tel)):'')+'</span>'+
    '<div style="margin-top:8px;font-size:13px">Saldo total: <strong style="font-family:var(--mono);font-size:16px">$'+fmt(c.saldo||0)+'</strong></div></div>';
  H+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'+
    (c.wa?'<button class="btn btn-green btn-sm" onclick="waCxC(\''+c.id+'\')">WhatsApp</button>':'')+
    '<button class="btn btn-ghost btn-sm" onclick="compartirFacturaCxC(\''+c.id+'\')">Compartir factura</button>'+
    '<button class="btn btn-ghost btn-sm write-only" onclick="recordarCxC(\''+c.id+'\')">Recordar +3 días</button>'+
  '</div>';
  H+='<div class="write-only" style="display:flex;gap:8px;align-items:flex-end;margin-bottom:14px;flex-wrap:wrap"><div style="flex:1;min-width:150px"><label class="form-label">Teléfono / WhatsApp</label><input class="form-input" id="cxc-tel-edit" value="'+esc(c.tel||'')+'" placeholder="0414-1234567"></div><button class="btn btn-accent btn-sm" onclick="guardarTelCxC(\''+c.id+'\')">Guardar teléfono</button></div>';
  H+='<div style="font-weight:600;font-size:12px;color:var(--muted);margin-bottom:6px">Facturas</div><div class="twrap"><table><thead><tr><th>N°</th><th>Emisión</th><th>Vence</th><th class="r">Saldo $</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  document.getElementById('cxc-det-body').innerHTML=H;
  openOverlay('ov-cxc-det');
}
function abrirNuevaCxC(){
  document.getElementById('ncx-nombre').value=''; document.getElementById('ncx-tel').value='';
  document.getElementById('ncx-num').value=''; document.getElementById('ncx-monto').value='';
  document.getElementById('ncx-emision').value=HOY(); document.getElementById('ncx-vence').value=_cxcAddDias(HOY(),15);
  openOverlay('ov-cxc-nueva');
}
function _waNorm(tel){ var d=(tel||'').replace(/\D/g,''); if(!d) return ''; if(d.indexOf('58')===0&&d.length>=12) return d.slice(0,12); if(d.charAt(0)==='0'&&d.length>=11) return '58'+d.slice(1,11); if(d.length>=10) return '58'+d.slice(0,10); return ''; }
function guardarNuevaCxC(){
  var nom=document.getElementById('ncx-nombre').value.trim();
  var tel=document.getElementById('ncx-tel').value.trim();
  var num=document.getElementById('ncx-num').value.trim();
  var monto=parseFloat(document.getElementById('ncx-monto').value);
  var em=document.getElementById('ncx-emision').value; var ve=document.getElementById('ncx-vence').value;
  if(!nom){ showToast('Escribe el nombre del cliente'); return; }
  if(!(monto>0)){ showToast('Escribe el monto adeudado en $'); return; }
  if(!Array.isArray(db.cxc_drog)) db.cxc_drog=[];
  db.cxc_drog.push({id:'cx'+uid(),cod:'',nom:nom,tel:tel,wa:_waNorm(tel),saldo:Math.round(monto*100)/100,vence:ve||null,
    facturas:[{n:num||'(s/n)',em:em||null,ve:ve||null,s:Math.round(monto*100)/100}],estado:'pendiente',cobrado_en:null,recordar:HOY(),notas:''});
  if(typeof logAudit==='function') logAudit('cxc.nueva',nom+' · $'+fmt(monto));
  saveDB(db); closeOverlay('ov-cxc-nueva'); renderCxC(); showToast('Deuda agregada');
}

function renderHistorial() {
  if (!puedePerm('prest','historial') && histTab === 'prestamos') histTab = 'facturas';
  const container = document.getElementById('historial-content');
  const tabHtml =
    '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">'+
    '<button class="btn '+(histTab==='prestamos'?'btn-accent':'btn-ghost')+' btn-sm grismar-hide" data-ht="prestamos" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg> Préstamos</button>'+
    '<button class="btn '+(histTab==='facturas'?'btn-accent':'btn-ghost')+' btn-sm" data-ht="facturas" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Facturas</button>'+
    '<button class="btn '+(histTab==='bancos'?'btn-accent':'btn-ghost')+' btn-sm" data-ht="bancos" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg> Disponibilidad</button>'+
    '<button class="btn '+(histTab==='movimientos'?'btn-accent':'btn-ghost')+' btn-sm" data-ht="movimientos" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Movimientos</button>'+
    '<button class="btn '+(histTab==='tasas'?'btn-accent':'btn-ghost')+' btn-sm" data-ht="tasas" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg> Tasas</button>'+
    '<button class="btn '+(histTab==='verif'?'btn-accent':'btn-ghost')+' btn-sm mayra-only" data-ht="verif" onclick="histTab=this.dataset.ht;renderHistorial()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg> Verificación</button>'+
    '<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="exportarHistorialActual()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Exportar CSV</button>'+
    '</div>';
  container.innerHTML = tabHtml + '<div id="historial-inner"></div>';
  if (histTab==='tasas') return renderHistorialTasasTab();
  if (histTab==='prestamos') renderHistorialPrestamos();
  else if (histTab==='bancos') renderHistorialBancos();
  else if (histTab==='movimientos') renderHistorialMovimientos();
  else if (histTab==='verif') renderHistorialVerif();
  else renderHistorialFacturas();
}

function renderHistorialTasasTab() {
  const inner = document.getElementById('historial-inner');
  if (!inner) return;
  const t = db.tasas || {};
  const te = db.tasas_eur || {};
  const fechas = Object.keys(t).sort().reverse();
  if (!fechas.length) {
    inner.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg></div><p>Aún no hay tasas registradas.</p><span>Carga la tasa del día y se irá guardando aquí.</span></div>';
    return;
  }
  const valores = fechas.map(f=>Number(t[f])||0);
  const maxV = Math.max(...valores), minV = Math.min(...valores), ultima = valores[0];
  const rows = fechas.map((f,i) => {
    const val = Number(t[f])||0;
    const prev = (i+1 < fechas.length) ? (Number(t[fechas[i+1]])||0) : null;
    let chg = '<span style="color:var(--muted);font-size:11px">—</span>';
    if (prev != null && prev > 0) {
      const d = val - prev, pct = d/prev*100;
      const col = d>0 ? 'var(--red)' : d<0 ? 'var(--green)' : 'var(--muted)';
      const ar  = d>0 ? '▲' : d<0 ? '▼' : '•';
      chg = '<span style="color:'+col+';font-size:11px;font-family:var(--mono)">'+ar+' '+fmt(Math.abs(d),2)+' ('+(d>0?'+':'')+pct.toFixed(1)+'%)</span>';
    }
    return '<tr>'
      + '<td data-label="Fecha" style="white-space:nowrap">'+fmtDate(f)+(f===HOY()?' <span class="badge b-green" style="font-size:9px">HOY</span>':'')+'</td>'
      + '<td data-label="Tasa" class="mono" style="font-weight:600">'+val.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' Bs/$</td>'
      + '<td data-label="Tasa €" class="mono" style="font-weight:600">'+(Number(te[f])?(Number(te[f]).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' Bs/€'):'<span style="color:var(--muted)">—</span>')+'</td>'
      + '<td data-label="Variación">'+chg+'</td>'
      + '</tr>';
  }).join('');
  inner.innerHTML =
    '<div class="summary-grid sg-4" style="margin-bottom:16px">'
    + '<div class="scard blue"><div class="scard-label">Tasa $ actual</div><div class="scard-val">'+ultima.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})+'</div><div class="scard-sub">Bs por $</div></div>'
    + '<div class="scard purple"><div class="scard-label">Tasa € actual</div><div class="scard-val">'+((Number(te[fechas[0]])||0).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2}))+'</div><div class="scard-sub">Bs por €</div></div>'
    + '<div class="scard red"><div class="scard-label">Más alta</div><div class="scard-val">'+maxV.toLocaleString("es-VE",{maximumFractionDigits:2})+'</div><div class="scard-sub">Bs por $</div></div>'
    + '<div class="scard green"><div class="scard-label">Más baja</div><div class="scard-val">'+minV.toLocaleString("es-VE",{maximumFractionDigits:2})+'</div><div class="scard-sub">Bs por $</div></div>'
    + '</div>'
    + '<div class="tbox"><div class="tbox-hd"><span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg> Historial de Tasas BCV ($ y €)</span><span class="tbox-meta">'+fechas.length+' registros</span></div>'
    + '<div class="twrap"><table class="tbl-cards"><thead><tr><th>Fecha</th><th>Tasa $</th><th>Tasa €</th><th>Variación $</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

function toggleVerifDetail(el) {
  const d = el.nextElementSibling;
  if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

function renderHistorialVerif() {
  const hist = (db.bancos._verif_hist || []).slice().sort((a,b)=>b.fecha>a.fecha?1:-1);
  const inner = document.getElementById('historial-inner');
  if (!hist.length) {
    inner.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg></div><p>No hay verificaciones confirmadas</p><span>Usa el botón <strong><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg> Confirmar</strong> en la tabla de Verificación Bancaria</span></div>';
    return;
  }
  const rows = hist.map((h,i) => {
    const ts = h.confirmada_en ? new Date(h.confirmada_en).toLocaleString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
    const t = h.totales || {};
    const difColor = (t.dif||0)<0?'color:var(--red)':(t.dif||0)>0?'color:var(--green)':'';
    // Detalle por terminal
    const detRows = VERIF_BANCOS.map(b => {
      const s = (h.data && h.data[b]) || {};
      const ing=parseFloat(s.ingreso)||0, com=parseFloat(s.comision)||0;
      const tot=ing-com;
      const adm=(s.admin!==null&&s.admin!==undefined)?parseFloat(s.admin):null;
      const dif=adm!==null?tot-adm:null;
      const dc=dif!==null?(dif<0?'color:var(--red)':dif>0?'color:var(--green)':''):'';
      return '<tr style="border-bottom:1px solid var(--border)">'+
        '<td style="padding:5px 10px;font-size:12px;font-weight:600;white-space:nowrap">'+b+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px">'+fmt(ing,2)+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px">'+fmt(com,2)+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px;font-weight:700">'+fmt(tot,2)+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px;color:var(--accent)">'+( adm!==null?fmt(adm,2):'—')+'</td>'+
        '<td class="mono r" style="padding:5px 8px;font-size:12px;font-weight:700;'+dc+'">'+( dif!==null?fmt(dif,2):'—')+'</td>'+
      '</tr>';
    }).join('');
    return '<div class="tbox" style="margin-bottom:14px">'+
      '<div class="tbox-hd" style="cursor:pointer" onclick="toggleVerifDetail(this)">'+ 
        '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> '+fmtDate(h.fecha)+'</span>'+
        '<span style="font-size:11px;color:var(--muted);margin-left:8px">'+ts+' · '+esc(h.confirmada_por||'')+'</span>'+
        '<div class="spacer"></div>'+
        '<span class="mono" style="font-size:12px;font-weight:700">Total: '+fmt(t.total||0,2)+' Bs</span>'+
        '<span class="mono" style="font-size:12px;margin-left:12px;'+difColor+'">Dif: '+fmt(t.dif||0,2)+'</span>'+
        '<span style="font-size:11px;color:var(--muted);margin-left:8px">▼ ver detalle</span>'+
      '</div>'+
      '<div style="display:none">'+
        '<div class="twrap"><table>'+
          '<thead><tr style="font-size:11px;color:var(--muted)">'+
            '<th style="padding:5px 10px">Terminal</th>'+
            '<th class="r" style="padding:5px 8px">Ingreso</th>'+
            '<th class="r" style="padding:5px 8px">Comisión</th>'+
            '<th class="r" style="padding:5px 8px">Total</th>'+
            '<th class="r" style="padding:5px 8px">Adm. INES</th>'+
            '<th class="r" style="padding:5px 8px">Diferencia</th>'+
          '</tr></thead>'+
          '<tbody>'+detRows+'</tbody>'+
          '<tfoot><tr style="font-weight:700;background:var(--surface2);font-size:12px">'+
            '<td style="padding:6px 10px">TOTAL</td>'+
            '<td class="mono r" style="padding:6px 8px">'+fmt(t.ingreso||0,2)+'</td>'+
            '<td class="mono r" style="padding:6px 8px">'+fmt(t.comision||0,2)+'</td>'+
            '<td class="mono r" style="padding:6px 8px">'+fmt(t.total||0,2)+'</td>'+
            '<td class="mono r" style="padding:6px 8px;color:var(--accent)">'+fmt(t.admin||0,2)+'</td>'+
            '<td class="mono r" style="padding:6px 8px;'+difColor+'">'+fmt(t.dif||0,2)+'</td>'+
          '</tr></tfoot>'+
        '</table></div>'+
      '</div>'+
    '</div>';
  }).join('');
  inner.innerHTML =
    '<p class="section-title" style="margin-bottom:16px">Historial de Verificaciones Confirmadas</p>'+
    rows;
}

var _movFTipo='all', _movFBanco='all';
function renderHistorialMovimientos(){
  var inner=document.getElementById('historial-inner'); if(!inner) return;
  var dias=Object.keys(db.bancos||{}).filter(function(k){ return /^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray((db.bancos[k]||{})._mov) && db.bancos[k]._mov.length; }).sort().reverse();
  if(!dias.length){ inner.innerHTML='<div class="empty-state"><div class="empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></div><p>Aún no hay movimientos registrados.</p><span>Regístralos en Bancos &amp; Pagos o al pagar facturas/cuotas.</span></div>'; return; }
  var rows=dias.map(function(fd){
    var movs=db.bancos[fd]._mov||[]; var tasa=getTasa();
    var sal=0,ent=0; movs.forEach(function(m){ var bs=Number(m.monto_bs)||0; if(m.tipo==='salida')sal+=bs; else if(m.tipo==='entrada')ent+=bs; });
    var detRows=movs.slice().reverse().map(function(m){
      var tipoTxt=m.tipo==='salida'?'<span style="color:var(--red);font-weight:600">Salida</span>':m.tipo==='entrada'?'<span style="color:var(--green);font-weight:600">Entrada</span>':'<span style="color:var(--accent);font-weight:600">Traspaso</span>';
      var bancoTxt=m.tipo==='traspaso'?(m.entidad+' '+m.banco+' → '+m.entidad_dest+' '+m.banco_dest):(m.entidad+' '+m.banco);
      var signo=m.tipo==='entrada'?'+':m.tipo==='salida'?'−':'';
      var orig=(m.origen||'manual'); var origTxt=orig==='manual'?'Manual':(orig.indexOf('factura')===0?'Factura':(orig.indexOf('prestamo')===0?'Cuota préstamo':orig));
      return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 10px;font-size:11px;white-space:nowrap">'+((m.ts||'').slice(11,16)||'—')+'</td><td style="padding:5px 8px;font-size:12px">'+tipoTxt+'</td><td style="padding:5px 8px;font-size:12px">'+esc(bancoTxt)+'</td><td class="mono r" style="padding:5px 8px;font-size:12px;font-weight:600">'+signo+_fmtBs(m.monto_bs||0)+(m.monto_usd?'<br><span style="font-weight:400;color:var(--muted);font-size:10px">$'+fmt(m.monto_usd)+'</span>':'')+'</td><td style="padding:5px 8px;font-size:11px;color:var(--muted)">'+esc(m.concepto||'')+(m.ref?' · '+esc(m.ref):'')+'</td><td style="padding:5px 8px;font-size:10px"><span style="background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:1px 8px">'+origTxt+'</span></td></tr>';
    }).join('');
    return '<div class="tbox" style="margin-bottom:14px">'+
      '<div class="tbox-hd" style="cursor:pointer" onclick="toggleVerifDetail(this)">'+
        '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> '+fmtDate(fd)+'</span>'+
        '<span style="font-size:11px;color:var(--muted);margin-left:8px">'+movs.length+' movimiento(s)</span>'+
        '<div class="spacer"></div>'+
        '<span class="mono" style="font-size:12px;color:var(--red)">−'+_fmtBs(sal)+'</span>'+
        '<span class="mono" style="font-size:12px;margin-left:10px;color:var(--green)">+'+_fmtBs(ent)+'</span>'+
        '<span style="font-size:11px;color:var(--muted);margin-left:8px">▼ ver detalle</span>'+
      '</div>'+
      '<div style="display:none"><div class="twrap"><table><thead><tr style="font-size:11px;color:var(--muted)"><th style="padding:5px 10px">Hora</th><th style="padding:5px 8px">Tipo</th><th style="padding:5px 8px">Banco</th><th class="r" style="padding:5px 8px">Monto</th><th style="padding:5px 8px">Concepto</th><th style="padding:5px 8px">Origen</th></tr></thead><tbody>'+detRows+'</tbody></table></div></div>'+
    '</div>';
  }).join('');
  inner.innerHTML='<p class="section-title" style="margin-bottom:16px">Historial de Movimientos por Día</p>'+rows;
}

function renderHistorialBancos() {
  const inner = document.getElementById('historial-inner'); if(!inner) return;
  const fechas = Object.keys(db.bancos||{}).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort().reverse();
  const tasa = getTasa();
  if (!fechas.length) { inner.innerHTML='<div class="empty-state"><p>Sin registros de disponibilidad aún.<br>Guarda la disponibilidad del día en Bancos &amp; Pagos.</p></div>'; return; }
  const rows = fechas.map(fd => {
    const dd=db.bancos[fd]||{}, fci=dd.FARMACIA||{}, dro=dd.DROGUERIA||{};
    const totF=BANCOS_LIST.reduce((a,b)=>a+(fci[b]||0),0), totD=BANCOS_LIST.reduce((a,b)=>a+(dro[b]||0),0), totG=totF+totD;
    const isHoy=fd===HOY();
    const bts=dd._baseTs?new Date(dd._baseTs).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}):'';
    const detRows=BANCOS_LIST.map(b=>{ const fc=fci[b]||0, dr=dro[b]||0, t=fc+dr;
      return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 10px;font-size:12px;font-weight:600">'+b+'</td><td class="mono r" style="padding:5px 8px;font-size:12px">'+_fmtBs(fc)+'</td><td class="mono r" style="padding:5px 8px;font-size:12px">'+_fmtBs(dr)+'</td><td class="mono r" style="padding:5px 8px;font-size:12px;font-weight:700">'+_fmtBs(t)+'</td><td class="mono r" style="padding:5px 8px;font-size:12px;color:var(--muted)">'+(tasa?'$'+_fmtBs(t/tasa):'—')+'</td></tr>';
    }).join('');
    return '<div class="tbox" style="margin-bottom:14px">'+
      '<div class="tbox-hd" style="cursor:pointer" onclick="toggleVerifDetail(this)">'+
        '<span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> '+fmtDate(fd)+(isHoy?' <span class="badge b-green" style="font-size:9px">HOY</span>':'')+'</span>'+
        (bts?'<span style="font-size:11px;color:var(--muted);margin-left:8px">act. '+bts+'</span>':'')+
        '<div class="spacer"></div>'+
        '<span class="mono" style="font-size:12px;font-weight:700">Total: '+_fmtBs(totG)+' Bs</span>'+
        (tasa?'<span class="mono" style="font-size:12px;margin-left:12px;color:var(--green)">$'+_fmtBs(totG/tasa)+'</span>':'')+
        '<span style="font-size:11px;color:var(--muted);margin-left:8px">▼ ver detalle</span>'+
      '</div>'+
      '<div style="display:none"><div class="twrap"><table>'+
        '<thead><tr style="font-size:11px;color:var(--muted)"><th style="padding:5px 10px">Banco</th><th class="r" style="padding:5px 8px">Farmacia</th><th class="r" style="padding:5px 8px">Droguería</th><th class="r" style="padding:5px 8px">Total</th><th class="r" style="padding:5px 8px">USD</th></tr></thead>'+
        '<tbody>'+detRows+'</tbody>'+
        '<tfoot><tr style="font-weight:700;background:var(--surface2);font-size:12px"><td style="padding:6px 10px">TOTAL</td><td class="mono r" style="padding:6px 8px">'+_fmtBs(totF)+'</td><td class="mono r" style="padding:6px 8px">'+_fmtBs(totD)+'</td><td class="mono r" style="padding:6px 8px;color:var(--accent)">'+_fmtBs(totG)+'</td><td class="mono r" style="padding:6px 8px;color:var(--green)">'+(tasa?'$'+_fmtBs(totG/tasa):'—')+'</td></tr></tfoot>'+
      '</table></div></div>'+
    '</div>';
  }).join('');
  inner.innerHTML = '<p class="section-title" style="margin-bottom:16px">Historial de Disponibilidad Bancaria</p>'+rows;
}


// ── Farmacia Claret · App · Router & Init ────────────────────────────────────

