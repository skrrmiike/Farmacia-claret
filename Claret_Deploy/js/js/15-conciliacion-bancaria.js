function _cbHTML(){
  if(!_cbMes){ var h=new Date(); _cbMes=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); }
  var inp='padding:9px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:13px';
  var chips=Object.keys(_cbBankData).map(function(bid){ return '<span style="display:inline-flex;align-items:center;gap:5px;background:#ecfdf5;color:#166534;font-size:11px;font-weight:700;padding:5px 11px;border-radius:999px;border:1px solid #bbf7d0">✓ '+_cbBankLabel(bid)+' · '+_cbBankData[bid].length+' mov.</span>'; }).join(' ');
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">'+
      '<div style="display:flex;align-items:center;gap:12px;min-width:0">'+
        '<div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#1E38A6,#2f54c7);display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 6px 16px rgba(30,56,166,.28)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg></div>'+
        '<div style="min-width:0"><div style="font-size:18px;font-weight:800;letter-spacing:-.01em">Conciliación de cajas</div><div style="font-size:12px;color:var(--muted)">Cruce de las transferencias de caja contra el banco</div></div>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
        '<input type="month" value="'+_cbMes+'" onchange="_cbSetMes(this.value)" style="'+inp+'">'+
        '<button class="btn btn-ghost btn-sm" style="padding:8px 13px" onclick="_cbTasas()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>Tasas del mes</button>'+
      '</div>'+
    '</div>'+
    '<div class="tbox" style="padding:16px;margin-bottom:14px;border-radius:14px">'+
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">'+
        '<span style="width:24px;height:24px;border-radius:50%;background:#1E38A6;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">1</span>'+
        '<div style="font-weight:700;font-size:14px">Estados de cuenta del mes</div>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--muted);margin:4px 0 12px;line-height:1.5">Sube el estado de cuenta de cada banco (Excel de Mercantil/Banesco, o pega el texto de los demás). Las transferencias de las cajas ya están cargadas automáticamente.</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
        '<select id="cb-banco-sel" style="'+inp+'">'+_CB_BANCOS.map(function(b){return '<option value="'+b[0]+'">'+b[1]+'</option>';}).join('')+'</select>'+
        '<label class="btn btn-ghost btn-sm" style="padding:9px 13px;cursor:pointer;margin:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12"/></svg>Subir archivo<input type="file" id="cb-file" accept=".xlsx,.xls,.txt,.csv" style="display:none" onchange="_cbArchivo(this)"></label>'+
        '<button class="btn btn-ghost btn-sm" style="padding:9px 13px" onclick="_cbPegarTexto()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>Pegar texto</button>'+
      '</div>'+
      '<div id="cb-chips" style="margin-top:'+(chips?'12px':'0')+';display:flex;gap:6px;flex-wrap:wrap">'+chips+'</div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+
      '<button class="btn btn-green" style="padding:11px 20px;font-weight:700;border-radius:11px" onclick="_cbConciliar()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M21 12a9 9 0 1 1-6.2-8.5"/><path d="M22 4 12 14.01l-3-3"/></svg>Conciliar mes</button>'+
      '<button class="btn btn-ghost" style="padding:11px 18px;border-radius:11px" onclick="_cbExport()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Exportar reporte</button>'+
    '</div>'+
    '<div id="cb-results">'+(_cbRows.length?_cbResultadosHTML():
      '<div class="tbox" style="padding:34px 18px;text-align:center;border-radius:14px;border-style:dashed">'+
        '<div style="width:46px;height:46px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;margin:0 auto 12px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg></div>'+
        '<div style="font-size:13.5px;color:var(--text);font-weight:600;margin-bottom:3px">Aún no has conciliado este mes</div>'+
        '<div style="font-size:12px;color:var(--muted);line-height:1.5">Carga al menos un estado de cuenta y presiona <b>Conciliar mes</b>.<br>Si ya conciliaste antes, los resultados se cargan solos.</div>'+
      '</div>')+'</div>';
}
function _cbSetMes(v){ _cbMes=v; _cbRows=[]; _cbBankData={}; _cbCargarGuardado(function(){ _cbRepaint(); }); }
function _cbPegarTexto(){
  var bid=(document.getElementById('cb-banco-sel')||{}).value||'tesoro';
  var txt=prompt('Pega aquí el texto del estado de cuenta de '+_cbBankLabel(bid)+':');
  if(!txt||!txt.trim())return;
  try{
    var parsers={provincial:parseProvincialText,bdv:parseBDVText,bnc:parseBNCText,bancaribe:parseBancaribeText,tesoro:parseTesoroText,bicentenario:parseBicentenarioText};
    var txns=(parsers[bid]||parseTesoroText)(txt.trim());
    if(!txns.length){ showToast&&showToast('No encontré movimientos en ese texto'); return; }
    _cbBankData[bid]=txns; showToast&&showToast('✓ '+_cbBankLabel(bid)+': '+txns.length+' movimientos'); _cbRepaint();
  }catch(e){ showToast&&showToast('Error: '+(e.message||e)); }
}
function _cbArchivo(input){
  var file=input.files&&input.files[0]; if(!file)return;
  var bid=(document.getElementById('cb-banco-sel')||{}).value||'tesoro';
  var esExcel=/\.(xlsx|xls)$/i.test(file.name);
  if(esExcel){
    _cbLoadXLSX(function(ok){
      if(!ok){ showToast&&showToast('No se pudo cargar el lector de Excel'); return; }
      var rd=new FileReader();
      rd.onload=function(ev){
        try{
          var wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});
          var txns=(bid==='mercantil')?parseMercantilExcel(wb):(bid==='banesco')?parseBanescoExcel(wb):null;
          if(txns===null){ showToast&&showToast('Para '+_cbBankLabel(bid)+' usa "Pegar texto"'); return; }
          if(!txns.length){ showToast&&showToast('No encontré movimientos en el archivo'); return; }
          _cbBankData[bid]=txns; showToast&&showToast('✓ '+_cbBankLabel(bid)+': '+txns.length+' movimientos'); _cbRepaint();
        }catch(e){ showToast&&showToast('Error: '+(e.message||e)); }
      };
      rd.readAsArrayBuffer(file);
    });
  } else {
    var rd2=new FileReader();
    rd2.onload=function(ev){
      try{
        var parsers={provincial:parseProvincialText,bdv:parseBDVText,bnc:parseBNCText,bancaribe:parseBancaribeText,tesoro:parseTesoroText,bicentenario:parseBicentenarioText};
        var txns=(parsers[bid]||parseTesoroText)(String(ev.target.result));
        if(!txns.length){ showToast&&showToast('No encontré movimientos'); return; }
        _cbBankData[bid]=txns; showToast&&showToast('✓ '+_cbBankLabel(bid)+': '+txns.length+' movimientos'); _cbRepaint();
      }catch(e){ showToast&&showToast('Error: '+(e.message||e)); }
    };
    rd2.readAsText(file);
  }
  input.value='';
}
function _cbCargarCajas(cb){
  var d0=_cbMes+'-01'; var partes=_cbMes.split('-'); var fin=new Date(parseInt(partes[0]),parseInt(partes[1]),0).getDate();
  var d1=_cbMes+'-'+String(fin).padStart(2,'0');
  supabaseClient.from('cierres_caja').select('id,fecha,caja,cajero,data').gte('fecha',d0).lte('fecha',d1).eq('empresa','farmacia').then(function(r){
    var lista=(r&&r.data)||[]; _cbCajaT=[];
    lista.forEach(function(c){
      (((c.data||{}).transfer)||[]).forEach(function(x){
        var monto=parseFloat((''+(x.monto==null?'':x.monto)).replace(/[^0-9.\-]/g,''))||0;
        if(monto<=0)return;
        _cbCajaT.push({lineaId:x.id,cierreId:c.id,caja:c.caja||'',cajero:c.cajero||'',fecha:c.fecha,dia:parseInt((''+c.fecha).slice(8,10)),banco:x.banco||'',bankId:mapBankName(x.banco||''),ref:normalizeRef(x.ref||''),monto:monto});
      });
    });
    if(cb)cb();
  });
}
function _cbCargarGuardado(cb){
  supabaseClient.from('concil_bancaria').select('*').eq('empresa','farmacia').eq('mes',_cbMes).order('id').then(function(r){
    var rows=(r&&r.data)||[];
    _cbRows=rows.map(function(x){ return {id:x.id,banco:x.banco,fecha:(''+(x.fecha||'')).slice(0,10),ref:x.ref||'',monto:parseFloat(x.monto)||0,lineaId:x.linea_id,cierreId:x.cierre_id,metodo:x.metodo||'',estado:x.estado||'pendiente',nota:x.nota||''}; });
    _cbCargarCajas(function(){
      var matched={}; _cbRows.forEach(function(x){ if(x.lineaId)matched[x.lineaId]=1; });
      window._cbSinBanco=_cbRows.length?_cbCajaT.filter(function(t){ return !matched[t.lineaId]; }):[];
      if(cb)cb();
    });
  });
}
function _cbConciliar(){
  if(!Object.keys(_cbBankData).length && !_cbRows.length){ showToast&&showToast('Carga al menos un estado de cuenta'); return; }
  showToast&&showToast('Conciliando…');
  _cbCargarCajas(function(){
    var last4=function(ref){ return String(ref||'').trim().replace(/^0+/,'').slice(-4).padStart(4,'0'); };
    var montoKey=function(m){ return Math.round(parseFloat(parseFloat(m).toFixed(2))*100); };
    // Créditos del banco: de los archivos recién cargados, o de lo guardado si no hay archivos
    var creditos=[];
    if(Object.keys(_cbBankData).length){
      Object.keys(_cbBankData).forEach(function(bid){
        _cbBankData[bid].forEach(function(t){
          if(t.tipo!=='credito')return;
          if((''+t.fecha).slice(0,7)!==_cbMes)return;
          creditos.push({banco:bid,fecha:t.fecha,dia:t.dia,ref:normalizeRef(t.ref||''),monto:t.monto,lineaId:null,cierreId:null,metodo:'',estado:'pendiente',nota:''});
        });
      });
    } else {
      creditos=_cbRows.map(function(x){ return {banco:x.banco,fecha:x.fecha,dia:parseInt((''+x.fecha).slice(8,10)),ref:x.ref,monto:x.monto,lineaId:null,cierreId:null,metodo:'',estado:'pendiente',nota:x.nota||''}; });
    }
    // Índices por banco
    var byRefMonto={},ptrRefMonto={},byMonto={},ptrMonto={};
    creditos.forEach(function(t,ix){
      var bid=t.banco;
      byRefMonto[bid]=byRefMonto[bid]||{}; ptrRefMonto[bid]=ptrRefMonto[bid]||{};
      byMonto[bid]=byMonto[bid]||{}; ptrMonto[bid]=ptrMonto[bid]||{};
      var rm=last4(t.ref)+'_'+montoKey(t.monto);
      (byRefMonto[bid][rm]=byRefMonto[bid][rm]||[]).push(ix);
      var dia=t.dia||parseInt((''+t.fecha).slice(8,10))||0;
      byMonto[bid][dia]=byMonto[bid][dia]||new Map();
      var mk=montoKey(t.monto);
      if(!byMonto[bid][dia].has(mk))byMonto[bid][dia].set(mk,[]);
      byMonto[bid][dia].get(mk).push(ix);
    });
    var usados=new Set();
    // Matching por transferencia de caja (mismas 4 estrategias de la herramienta de Inés)
    var sinBanco=[];
    _cbCajaT.forEach(function(t){
      var bid=t.bankId;
      var hallado=null, metodo='';
      if(bid!=='unknown'&&byRefMonto[bid]){
        var l4=last4(t.ref), mk=montoKey(t.monto);
        var rm=l4+'_'+mk;
        if(l4!=='0000'&&l4!==''){
          var arr=(byRefMonto[bid][rm]||[]).filter(function(ix){return !usados.has(ix);});
          if(arr.length){ hallado=arr[0]; metodo='ref_last4'; }
        }
        if(hallado===null){
          var cand=diasHabilesHasta(t.fecha,3);
          var dias=[t.dia];
          cand.forEach(function(f){ if(f.slice(0,7)===t.fecha.slice(0,7)){ var dd=parseInt(f.slice(8)); if(dias.indexOf(dd)<0)dias.push(dd); } });
          for(var di=0; di<dias.length && hallado===null; di++){
            var arr2=(((byMonto[bid][dias[di]]||new Map()).get(mk))||[]).filter(function(ix){return !usados.has(ix);});
            if(arr2.length){ hallado=arr2[0]; metodo=(dias[di]===t.dia)?'monto_dia':(esNoHabil(t.fecha)?'feriado_o_finde':'monto_dia'); }
          }
        }
        if(hallado===null){
          for(var delta=-5; delta<=5 && hallado===null; delta++){
            var d=new Date(t.fecha+'T00:00:00'); d.setDate(d.getDate()+delta);
            if(String(d.getMonth()+1).padStart(2,'0')!==_cbMes.slice(5))continue;
            var arr3=(((byMonto[bid][d.getDate()]||new Map()).get(montoKey(t.monto)))||[]).filter(function(ix){return !usados.has(ix);});
            if(arr3.length){ hallado=arr3[0]; metodo='sin_dia'; }
          }
        }
      }
      if(hallado!==null){
        usados.add(hallado);
        creditos[hallado].lineaId=t.lineaId; creditos[hallado].cierreId=t.cierreId;
        creditos[hallado].metodo=metodo; creditos[hallado].estado='conciliado';
        creditos[hallado].nota=t.caja+' · '+t.cajero+' · ref caja '+t.ref;
      } else {
        sinBanco.push(t);
      }
    });
    window._cbSinBanco=sinBanco;
    // Guardar: reemplazo del mes completo
    supabaseClient.from('concil_bancaria').delete().eq('empresa','farmacia').eq('mes',_cbMes).then(function(){
      var filas=creditos.map(function(t){ return {empresa:'farmacia',mes:_cbMes,banco:t.banco,fecha:t.fecha||null,ref:t.ref,monto:t.monto,linea_id:t.lineaId,cierre_id:t.cierreId,metodo:t.metodo,estado:t.estado,nota:t.nota}; });
      var lote=function(i){
        if(i>=filas.length){ _cbCargarGuardado(function(){ _cbRepaint(); var con=creditos.filter(function(x){return x.estado==='conciliado';}).length; showToast&&showToast('✓ Conciliado: '+con+'/'+creditos.length+' créditos · '+sinBanco.length+' transferencias de caja sin abono'); }); return; }
        supabaseClient.from('concil_bancaria').insert(filas.slice(i,i+200)).then(function(){ lote(i+200); });
      };
      if(filas.length)lote(0); else { _cbRepaint(); showToast&&showToast('Sin créditos del mes en los archivos'); }
    });
  });
}
function _cbResultadosHTML(){
  var con=_cbRows.filter(function(x){return x.estado==='conciliado';});
  var pend=_cbRows.filter(function(x){return x.estado==='pendiente';});
  var ign=_cbRows.filter(function(x){return x.estado==='ignorado';});
  var sinB=window._cbSinBanco||[];
  var puede=_ccPuede();
  var totC=_cbRows.length-ign.length; var pct=totC?Math.round(con.length*100/totC):0;
  var pctCol=pct>=90?'#079455':(pct>=60?'#d97706':'#dc2626');
  var resumen='<div class="tbox" style="padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">'+
    '<div style="font-size:22px;font-weight:900;color:'+pctCol+'">'+pct+'%</div>'+
    '<div style="flex:1;min-width:160px"><div style="height:8px;background:var(--surface2);border-radius:99px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+pctCol+';border-radius:99px"></div></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:4px">'+con.length+' de '+totC+' cr\u00e9ditos conciliados \u00b7 '+pend.length+' pendientes \u00b7 '+sinB.length+' de caja sin abono'+(ign.length?(' \u00b7 '+ign.length+' descartados'):'')+'</div></div></div>';
  var tabs=[['pend_banco','\ud83d\udd34 Banco sin caja ('+pend.length+')'],['sin_banco','\ud83d\udfe0 Caja sin banco ('+sinB.length+')'],['ok','\u2705 Conciliadas ('+con.length+')']];
  var tabHtml='<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">'+tabs.map(function(t){ return '<button class="btn btn-sm '+(_cbTab===t[0]?'btn-green':'btn-ghost')+'" onclick="_cbTab=\''+t[0]+'\';_cbRepaint()">'+t[1]+'</button>'; }).join('')+'</div>';
  var ML={ref_last4:'ref \u2713',monto_dia:'monto+d\u00eda',feriado_o_finde:'feriado/finde',sin_dia:'monto (\u00b15d)',manual:'manual'};
  var filas='';
  if(_cbTab==='ok'){
    filas=con.map(function(x){ return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px">'+_cbBankLabel(x.banco)+'</td><td style="padding:5px 8px">'+esc(x.fecha||'')+'</td><td style="padding:5px 8px">'+esc(x.ref||'')+'</td><td style="padding:5px 8px;text-align:right;font-weight:700">Bs '+_ccFmt(x.monto)+'</td><td style="padding:5px 8px;font-size:11px;color:var(--muted)">'+esc(x.nota||'')+' <span style="background:#dcfce7;color:#166534;padding:1px 7px;border-radius:999px;font-weight:700">'+(ML[x.metodo]||x.metodo)+'</span>'+((puede&&x.metodo==='manual')?(' <button onclick="_cbDesvincular('+x.id+')" style="border:0;background:none;color:var(--muted);cursor:pointer;font-size:11px" title="Deshacer v\u00ednculo manual">\u2715</button>'):'')+'</td></tr>'; }).join('');
  } else if(_cbTab==='pend_banco'){
    filas=pend.map(function(x){ return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px">'+_cbBankLabel(x.banco)+'</td><td style="padding:5px 8px">'+esc(x.fecha||'')+'</td><td style="padding:5px 8px">'+esc(x.ref||'')+'</td><td style="padding:5px 8px;text-align:right;font-weight:700">Bs '+_ccFmt(x.monto)+'</td><td style="padding:5px 8px;font-size:11px;white-space:nowrap">'+(puede?('<button class="btn btn-ghost btn-sm" style="padding:3px 9px;font-size:11px" onclick="_cbVincular('+x.id+')">\ud83d\udd17 Vincular</button> <button class="btn btn-ghost btn-sm" style="padding:3px 9px;font-size:11px" onclick="_cbIgnorar('+x.id+')">\u2715 No es de caja</button>'):'<span style="color:var(--muted)">sin registro en caja</span>')+'</td></tr>'; }).join('');
    if(ign.length){
      filas+='<tr><td colspan="5" style="padding:8px;font-size:11px;color:var(--muted);font-weight:700;border-top:2px solid var(--border)">Descartados (no son de caja)</td></tr>'+
      ign.map(function(x){ return '<tr style="border-top:1px solid var(--border);opacity:.55"><td style="padding:5px 8px">'+_cbBankLabel(x.banco)+'</td><td style="padding:5px 8px">'+esc(x.fecha||'')+'</td><td style="padding:5px 8px">'+esc(x.ref||'')+'</td><td style="padding:5px 8px;text-align:right">Bs '+_ccFmt(x.monto)+'</td><td style="padding:5px 8px;font-size:11px;color:var(--muted)">'+esc(x.nota||'')+(puede?(' <button onclick="_cbReactivar('+x.id+')" style="border:0;background:none;color:var(--accent);cursor:pointer;font-size:11px">\u21a9 reactivar</button>'):'')+'</td></tr>'; }).join('');
    }
  } else {
    filas=sinB.map(function(x){ return '<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px">'+esc(x.banco||'\u2014')+'</td><td style="padding:5px 8px">'+esc(x.fecha||'')+'</td><td style="padding:5px 8px">'+esc(x.ref||'')+'</td><td style="padding:5px 8px;text-align:right;font-weight:700">Bs '+_ccFmt(x.monto)+'</td><td style="padding:5px 8px;font-size:11px;color:var(--muted)">'+esc(x.caja+' \u00b7 '+x.cajero)+' \u00b7 registrada en caja, sin abono en banco</td></tr>'; }).join('');
  }
  var tot=_cbRows.reduce(function(a,x){return a+x.monto;},0);
  return resumen+'<div class="tbox" style="padding:12px">'+tabHtml+
    '<table style="width:100%;font-size:12px"><thead><tr><th style="text-align:left;padding:5px 8px">Banco</th><th style="text-align:left;padding:5px 8px">Fecha</th><th style="text-align:left;padding:5px 8px">Referencia</th><th style="text-align:right;padding:5px 8px">Monto</th><th style="text-align:left;padding:5px 8px">Detalle</th></tr></thead><tbody>'+(filas||'<tr><td colspan="4" style="padding:14px;text-align:center;color:var(--muted)">Nada en esta categor\u00eda</td></tr>')+'</tbody></table>'+
    '<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;font-size:12px;color:var(--muted)">Mes '+_cbMes+' \u00b7 '+_cbRows.length+' cr\u00e9ditos bancarios (Bs '+_ccFmt(tot)+') \u00b7 los resultados quedan guardados</div></div>';
}
function _cbUpd(id,campos,cb){ supabaseClient.from('concil_bancaria').update(campos).eq('id',id).then(function(r){ if(r&&r.error){ showToast&&showToast('Error: '+(r.error.message||'')); return; } _cbCargarGuardado(function(){ _cbRepaint(); if(cb)cb(); }); }); }
function _cbIgnorar(id){ if(!_ccPuede())return; var motivo=prompt('\u00bfPor qu\u00e9 no es de caja? (reembolso, cliente directo, otro)'); if(motivo===null)return; _cbUpd(id,{estado:'ignorado',nota:(motivo||'').trim()||'no es de caja'}); }
function _cbReactivar(id){ if(!_ccPuede())return; _cbUpd(id,{estado:'pendiente',nota:''}); }
function _cbDesvincular(id){ if(!_ccPuede())return; if(!confirm('\u00bfDeshacer este v\u00ednculo manual?'))return; _cbUpd(id,{estado:'pendiente',linea_id:null,cierre_id:null,metodo:'',nota:''}); }
function _cbVincular(id){
  if(!_ccPuede())return;
  var row=_cbRows.filter(function(x){return x.id===id;})[0]; if(!row)return;
  var matched={}; _cbRows.forEach(function(x){ if(x.lineaId)matched[x.lineaId]=1; });
  var libres=_cbCajaT.filter(function(t){ return !matched[t.lineaId]; });
  libres.sort(function(a,b){ var pa=(a.bankId===row.banco)?0:1, pb=(b.bankId===row.banco)?0:1; if(pa!==pb)return pa-pb; return Math.abs(a.monto-row.monto)-Math.abs(b.monto-row.monto); });
  var ov=document.createElement('div'); ov.id='cb-vinc-ov'; ov.style.cssText='position:fixed;inset:0;background:rgba(15,20,40,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=function(e){ if(e.target===ov)ov.remove(); };
  var lista=libres.slice(0,40).map(function(t){ return '<div onclick="_cbVincularA('+id+',\''+t.lineaId+'\','+t.cierreId+')" style="display:flex;justify-content:space-between;gap:8px;padding:9px 10px;border-top:1px solid var(--border);cursor:pointer;font-size:12.5px" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'"><span>'+esc(t.fecha)+' \u00b7 '+esc(t.caja)+' \u00b7 '+esc(t.cajero)+' \u00b7 '+esc(t.banco||'\u2014')+' \u00b7 ref '+esc(t.ref||'\u2014')+'</span><b style="white-space:nowrap">Bs '+_ccFmt(t.monto)+'</b></div>'; }).join('');
  ov.innerHTML='<div style="background:var(--surface);border-radius:16px;max-width:560px;width:100%;max-height:80vh;overflow:auto;padding:16px;box-shadow:0 24px 60px rgba(0,0,0,.3)">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>\ud83d\udd17 Vincular cr\u00e9dito de '+_cbBankLabel(row.banco)+' \u00b7 Bs '+_ccFmt(row.monto)+'</b><button onclick="document.getElementById(\'cb-vinc-ov\').remove()" style="border:0;background:var(--surface2);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px">\u00d7</button></div>'+
    '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Elige la transferencia de caja que corresponde (primero las del mismo banco y monto parecido):</div>'+
    (lista||'<div style="padding:14px;text-align:center;color:var(--muted);font-size:12px">No quedan transferencias de caja sin conciliar este mes.</div>')+'</div>';
  document.body.appendChild(ov);
}
function _cbVincularA(id,lineaId,cierreId){
  var t=_cbCajaT.filter(function(x){return x.lineaId===lineaId;})[0];
  var ov=document.getElementById('cb-vinc-ov'); if(ov)ov.remove();
  _cbUpd(id,{estado:'conciliado',linea_id:lineaId,cierre_id:cierreId||null,metodo:'manual',nota:t?(t.caja+' \u00b7 '+t.cajero+' \u00b7 ref caja '+(t.ref||'\u2014')+' \u00b7 vinculado a mano'):'vinculado a mano'},function(){ showToast&&showToast('\u2713 Vinculado'); });
}
function _cbExport(){
  if(!_cbRows.length){ showToast&&showToast('No hay resultados que exportar'); return; }
  _retoLoadExcelJS(function(ok){
    if(!ok||!window.ExcelJS){ showToast&&showToast('No se pudo cargar Excel'); return; }
    var wb=new ExcelJS.Workbook();
    var ML={ref_last4:'Por referencia',monto_dia:'Monto+día',feriado_o_finde:'Feriado/fin de semana',sin_dia:'Monto (±5 días)',manual:'Manual'};
    var mk=function(nombre,rows,esCaja){
      var ws=wb.addWorksheet(nombre,{views:[{state:'frozen',ySplit:1}]});
      ws.columns=esCaja?[{header:'Banco',key:'b',width:14},{header:'Fecha caja',key:'f',width:12},{header:'Ref caja',key:'r',width:14},{header:'Monto Bs',key:'m',width:13},{header:'Caja',key:'c',width:10},{header:'Cajero',key:'j',width:16}]
        :[{header:'Banco',key:'b',width:14},{header:'Fecha banco',key:'f',width:12},{header:'Referencia',key:'r',width:16},{header:'Monto Bs',key:'m',width:13},{header:'Método',key:'me',width:18},{header:'Detalle',key:'d',width:34}];
      var hr=ws.getRow(1); hr.eachCell(function(c){ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1E38A6'}}; });
      rows.forEach(function(x){ ws.addRow(esCaja?{b:x.banco,f:x.fecha,r:x.ref,m:x.monto,c:x.caja,j:x.cajero}:{b:_cbBankLabel(x.banco),f:x.fecha,r:x.ref,m:x.monto,me:(ML[x.metodo]||x.metodo||''),d:x.nota||''}); });
      return ws;
    };
    mk('Conciliadas',_cbRows.filter(function(x){return x.estado==='conciliado';}),false);
    mk('Banco sin caja',_cbRows.filter(function(x){return x.estado==='pendiente';}),false);
    mk('Caja sin banco',window._cbSinBanco||[],true);
    var _ig=_cbRows.filter(function(x){return x.estado==='ignorado';}); if(_ig.length)mk('Descartados',_ig,false);
    wb.xlsx.writeBuffer().then(function(buf){ var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='conciliacion_'+_cbMes+'.xlsx'; a.click(); setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(e){}},3000); showToast&&showToast('✓ Reporte descargado'); });
  });
}

function parseVenNum(s){
  if(s===null||s===undefined||s==='')return 0;
  const str=String(s).replace(/\s/g,'').replace('+','').replace('-','');
  if(str.includes(',')&&str.includes('.')){
    return str.lastIndexOf(',')>str.lastIndexOf('.')?parseFloat(str.replace(/\./g,'').replace(',','.'))||0:parseFloat(str.replace(/,/g,''))||0;
  }
  if(str.includes(',')&&!str.includes('.'))return parseFloat(str.replace(',','.'))||0;
  return parseFloat(str)||0;
}
function normalizeRef(r){return String(r).replace(/^0+/,'').trim();}
function parseFechaDate(v){
  if(!v)return null;
  if(v instanceof Date){const y=v.getFullYear(),m=v.getMonth()+1,d=v.getDate();return`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  if(typeof v==='number'){
    // Excel serial → UTC date, then extract local date components to avoid timezone shift
    const ms=Math.round((v-25569)*86400*1000);
    const d=new Date(ms);
    // Use UTC components to avoid off-by-one in GMT- zones
    const y=d.getUTCFullYear(),mo=d.getUTCMonth()+1,day=d.getUTCDate();
    return`${y}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  const str=String(v);
  if(/^\d{4}-\d{2}-\d{2}/.test(str))return str.slice(0,10);
  return null;
}
function parseFechaSlash(s){const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:null;}
function mapBankName(n){
  const u=n.toUpperCase().replace(/[\s\.]/g,'');
  // Pago Movil shortcuts first (PM prefix)
  if(u==='PMM'||u==='PMMERCANTIL')return'mercantil';
  if(u==='PMBC'||u==='PMBANCARIBE')return'bancaribe';
  if(u==='PMPROV'||u==='PMPROVINCIAL'||u==='PMPROVINCIAL')return'provincial';
  if(u==='PMBDV'||u==='PMVZLA')return'bdv';
  if(u==='PMBNC')return'bnc';
  if(u==='PMBANESCO'||u==='PMB')return'banesco';
  // Mercantil — MERC, MERCANT, MERCANTIL, MCTIL
  if(u.includes('MERCANTIL')||u.includes('MERCANT')||u.includes('MCTIL')||u==='MERC')return'mercantil';
  // Banesco — BANES, BANESC, BANESCO
  if(u.includes('BANESCO')||u.includes('BANES')||u.includes('BANESC'))return'banesco';
  // Provincial — PROV, PROVINC, PROVONCIAL, PPROVINCIAL
  if(u.includes('PROVINC')||u.includes('PROVONC')||u.startsWith('PROV'))return'provincial';
  // BDV — BDV, VENEZU, VENEZOL
  if(u.includes('VENEZU')||u.includes('VENEZOL')||u==='BDV')return'bdv';
  // BNC — BNC, BNACIONAL, NACIONAL DE CREDITO
  if(u==='BNC'||u.includes('BNACIONAL')||u.includes('CREDITO'))return'bnc';
  // Bancaribe — CARIBE, BC (standalone)
  if(u.includes('CARIBE')||u==='BC')return'bancaribe';
  // Tesoro
  if(u.includes('TESORO')||u.includes('BTJR')||u==='0163')return'tesoro';
  // Bicentenario
  if(u.includes('BICENT'))return'bicentenario';
  return'unknown';
}

function parseTesoroText(text){
  const txns=[];
  for(const line of text.split('\n').map(l=>l.trim()).filter(Boolean)){
    const dm=line.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{6,12})\s+/);
    if(!dm)continue;
    const fecha=`${dm[3]}-${dm[2]}-${dm[1]}`;
    const ref=dm[4];
    const am=line.match(/([\d\.]+,\d{2})\s+([\d\.]+,\d{2})\s+[\d\.]+,\d{2}\s*$/);
    if(!am)continue;
    const deb=parseVenNum(am[1]);const cred=parseVenNum(am[2]);
    if(deb===0&&cred===0)continue;
    const isC=cred>0&&deb===0;
    const monto=isC?cred:deb;
    txns.push({ref:normalizeRef(ref),fecha,dia:parseInt(dm[1]),monto,
      tipo:isC?'credito':'debito',descripcion:line.toUpperCase().slice(0,80),banco:'tesoro'});
  }
  return txns;
}

function parseBicentenarioText(text){
  // Banco Bicentenario format — similar to BDV/Provincial
  // Generic parser: looks for date + amounts pattern
  const txns=[];
  for(const line of text.split('\n').map(l=>l.trim()).filter(Boolean)){
    // Try DD/MM/YYYY format
    const dm=line.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{6,15})\s+/);
    if(!dm)continue;
    const fecha=`${dm[3]}-${dm[2]}-${dm[1]}`;
    const ref=dm[4];
    const am=line.match(/([\d\.]+,\d{2})\s+([\d\.]+,\d{2})\s+[\d\.]+,\d{2}\s*$/);
    if(!am)continue;
    const deb=parseVenNum(am[1]);const cred=parseVenNum(am[2]);
    if(deb===0&&cred===0)continue;
    const isC=cred>0&&deb===0;
    txns.push({ref:normalizeRef(ref),fecha,dia:parseInt(dm[1]),monto:isC?cred:deb,
      tipo:isC?'credito':'debito',descripcion:line.toUpperCase().slice(0,80),banco:'bicentenario'});
  }
  return txns;
}

function parseMercantilExcel(wb){
  const ws=wb.Sheets[wb.SheetNames[0]];
  // Use raw sheet_to_json with header:1 and defval empty string
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
  const txns=[];let hr=-1;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    if(r&&String(r[0]).trim()==='Fecha'&&String(r[1]).trim()==='Referencia'){hr=i;break;}
  }
  if(hr<0)return[];
  for(let i=hr+1;i<rows.length;i++){
    const r=rows[i];if(!r)continue;
    const fechaStr=String(r[0]||'').trim();if(!fechaStr)continue;
    // fecha is DD/MM/YYYY string
    const fecha=parseFechaSlash(fechaStr);if(!fecha)continue;
    const ref=String(r[1]||'').trim();
    if(!ref||ref==='000000000000000'||ref.replace(/0/g,'')==='')continue;
    const egresoStr=String(r[3]||'').trim();
    const ingresoStr=String(r[4]||'').trim();
    const egreso=egresoStr?parseVenNum(egresoStr.replace('-','')):0;
    const ingreso=ingresoStr?parseVenNum(ingresoStr):0;
    const monto=ingreso>0?ingreso:egreso;
    if(monto===0)continue;
    const tipo=ingreso>0?'credito':'debito';
    const dia=parseInt(fecha.split('-')[2]);
    txns.push({ref:normalizeRef(ref),fecha,dia,monto,tipo,descripcion:String(r[2]||'').toUpperCase(),banco:'mercantil'});
  }
  return txns;
}
function parseBanescoExcel(wb){
  const ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});
  const txns=[];let hr=-1;
  for(let i=0;i<rows.length;i++){const r=rows[i];if(r&&r[0]==='Fecha'&&r[1]==='Referencia'){hr=i;break;}}
  if(hr<0)return[];
  for(let i=hr+1;i<rows.length;i++){
    const r=rows[i];if(!r||!r[0])continue;
    const ref=String(r[1]||'').trim();if(!ref)continue;
    const fecha=parseFechaDate(r[0]);if(!fecha)continue;
    const ms=String(r[3]||'');const monto=Math.abs(parseVenNum(ms.replace('+','')));
    if(monto===0)continue;
    const tipo=ms.startsWith('-')?'debito':'credito';
    txns.push({ref:normalizeRef(ref),fecha,dia:new Date(fecha+'T00:00:00').getDate(),monto,tipo,descripcion:String(r[2]||'').toUpperCase(),banco:'banesco'});
  }
  return txns;
}
function parseProvincialText(text){
  // Provincial (BBVA) — formato real del estado de cuenta
  // Formato: DD-MM-YYYY REF CONCEPTO DD-MM-YYYY MONTO SALDO
  // Ejemplo: 01-03-2026 55867 DR OB 04127216572. TELESERVICIOS 01-03-2026 1,680.00 425,654.99
  //
  // CRÉDITOS (ingresos): DR OB, TC POS, TD POS,
  //   ABO.DRV, TRAV, TRAJ, CR.I/, DEP.EFECTIVO, ABONO INTERESES, DISPO PRESTAMO
  // DÉBITOS (salidas): COM.PAGO MOVIL, COMIS, TRASP., COBRO, PREST.,
  //   COM MTTO, INT.SOBREGIRO, etc.

  const CREDIT_KW = [
    'DR OB ','TC POS','TD POS','ABO.DRV','TRAV','TRAJ','CR.I/',
    'DEP.EFECTIVO','DROG CLINICA','DISPO PRESTAMO','ABONO INTERESES',
    'TPBW','TR/OB',
  ];
  const DEBIT_KW = [
    'COM.PAGO MOVIL','COM. PAGO MOV','COM TRF','COMIS','TRASP.',
    'COBRO','PREST.','COM MTTO','PNCASH NOMINA','INT.SOBREGIRO',
    'INT.ISLR','COM.MTTO','COM.EM.EDO','PRESTAMOS. CARGOS',
    'PREST. TIMBRE',
  ];

  function parseProvNum(s){return parseFloat(String(s||0).replace(/,/g,''))||0;}

  // Formato con fecha al inicio:
  // DD-MM-YYYY REF CONCEPTO DD-MM-YYYY MONTO SALDO
  const reFull=/^(\d{2}-\d{2}-\d{4})\s+(\d{4,8})\s+(.+?)\s+\d{2}-\d{2}-\d{4}\s+([\d,\.]+)\s+[\d,\.]+\s*$/;
  // Fallback sin saldo final:
  const reShort=/^(\d{2}-\d{2}-\d{4})\s+(\d{4,8})\s+(.+?)\s+\d{2}-\d{2}-\d{4}\s+([\d,\.]+)\s*$/;

  const txns=[];
  for(const rawLine of text.split('\n')){
    const line=rawLine.trim();
    // La línea debe empezar con fecha DD-MM-YYYY seguida de referencia numérica
    if(!line||!line.match(/^\d{2}-\d{2}-\d{4}\s+\d{4,8}\s+/))continue;

    const m=reFull.exec(line)||reShort.exec(line);
    if(!m)continue;

    const fechaRaw=m[1]; // DD-MM-YYYY
    const ref=m[2];
    const desc=m[3].toUpperCase();
    const monto=parseProvNum(m[4]);
    if(monto===0)continue;

    const fp=fechaRaw.split('-');
    const fecha=`${fp[2]}-${fp[1]}-${fp[0]}`; // YYYY-MM-DD
    const dia=parseInt(fp[0]);

    // Clasificar tipo por concepto
    const isCredit=CREDIT_KW.some(k=>desc.includes(k));
    const isDebit =DEBIT_KW.some(k=>desc.includes(k));

    // Si no se reconoce, usar crédito por defecto para no perder datos
    const tipo=(isDebit&&!isCredit)?'debito':'credito';

    txns.push({ref:normalizeRef(ref),fecha,dia,monto,
      tipo,descripcion:desc,banco:'provincial'});
  }
  return txns;
}

function parseBDVText(text){
  const txns=[];
  const re=/^(\d{10,15})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(NC|ND-?)\s*([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)$/;
  for(const line of text.split('\n').map(l=>l.trim()).filter(Boolean)){
    const m=line.match(re);if(!m)continue;
    const ref=m[1];const desc=m[2].toUpperCase();
    const fecha=parseFechaSlash(m[3]);if(!fecha)continue;
    const isC=m[4]==='NC';
    const monto=isC?parseVenNum(m[6]):parseVenNum(m[5]);
    if(monto===0)continue;
    txns.push({ref:normalizeRef(ref),fecha,dia:parseInt(fecha.split('-')[2]),monto,
      tipo:isC?'credito':'debito',descripcion:desc,banco:'bdv'});
  }
  return txns;
}

function parseBNCText(text){
  const txns=[];
  const block=text.replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();
  const parts=block.split(/(?=\d{2}\/\d{2}\/\d{4}\s+\d+\s+)/);
  for(const part of parts){
    const p=part.trim();if(!p)continue;
    const dm=p.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+\d+\s+/);
    if(!dm)continue;
    const fecha=`${dm[3]}-${dm[2]}-${dm[1]}`;
    const dia=parseInt(dm[1]);
    const amtM=p.match(/([\d\.]+,\d{2})\s+\+?([\d\.]+,\d{2})\s+([\d\.]+,\d{2})\s*$/);
    let debe=0,haber=0,ref='';
    if(amtM){
      debe=parseVenNum(amtM[1]);haber=parseVenNum(amtM[2]);
      const before=p.slice(0,p.lastIndexOf(amtM[0])).trim();
      const refM=before.match(/(\d{6,12})\s*$/);
      ref=refM?refM[1]:'';
    } else {
      const dM=p.match(/(\d{4,8})-([\d\.]+,\d{2})\s+0,00\s+[\d\.]+,\d{2}\s*$/);
      if(dM){ref=dM[1];debe=parseVenNum(dM[2]);}
      else continue;
    }
    if(debe===0&&haber===0)continue;
    const isCredit=haber>0&&debe===0;
    const monto=isCredit?haber:debe;
    if(monto===0)continue;
    const descClean=p.replace(/^\d{2}\/\d{2}\/\d{4}\s+\d+\s+\S+\s*/,'').replace(/[\d\.]+,\d{2}[\s\d\.,-]*$/,'').trim().slice(0,80).toUpperCase();
    txns.push({ref:normalizeRef(ref)||'bnc_'+Math.round(monto),fecha,dia,monto,
      tipo:isCredit?'credito':'debito',descripcion:descClean||p.slice(0,80).toUpperCase(),banco:'bnc'});
  }
  return txns;
}

function parseBancaribeText(text){
  // Formato Adobe: cada transacción ocupa múltiples líneas.
  // La referencia a veces se parte en 2 líneas antes de los montos.
  // Estrategia: agrupar todo en bloques que empiezan con DD-MES-YYYY,
  // luego extraer los últimos 3 números del bloque como cargo/abono/saldo.
  const txns=[];
  const monthsES={ENE:'01',FEB:'02',MAR:'03',ABR:'04',MAY:'05',JUN:'06',JUL:'07',AGO:'08',SEP:'09',OCT:'10',NOV:'11',DIC:'12',JAN:'01',APR:'04',AUG:'08',DEC:'12'};
  const reDate=/^(\d{2})-(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|JAN|APR|AUG|DEC)-(\d{4})\b/i;
  const numRe=/\b(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\b/g;
  const lines=text.split('\n').map(l=>l.trim());
  const blocks=[];let cur=null;
  for(const line of lines){
    if(!line)continue;
    const dm=line.match(reDate);
    if(dm){if(cur)blocks.push(cur);cur={dd:dm[1],mon:dm[2].toUpperCase(),yyyy:dm[3],lines:[line]};}
    else if(cur){cur.lines.push(line);}
  }
  if(cur)blocks.push(cur);
  for(const b of blocks){
    const full=b.lines.join(' ');
    if(/SALDO FIN DIA/i.test(full))continue;
    const mm=monthsES[b.mon]||'00';if(mm==='00')continue;
    const fecha=`${b.yyyy}-${mm}-${b.dd}`;
    const dia=parseInt(b.dd);
    const nums=[...full.matchAll(numRe)].map(m=>parseVenNum(m[1]));
    if(nums.length<2)continue;
    const cargo=nums.length>=3?nums[nums.length-3]:0;
    const abono=nums.length>=2?nums[nums.length-2]:0;
    const isC=abono>0&&cargo===0;
    const monto=isC?abono:cargo;
    if(monto===0)continue;
    const refM=full.match(/\b(\d{9,15})\b/);
    const ref=refM?refM[1]:'';
    const descM=full.match(/\b(NC|ND)\s+([A-Z][\w\s\.]+?)(?:\s+\d|$)/);
    const desc=descM?(descM[1]+' '+descM[2]).trim().toUpperCase():full.slice(0,80).toUpperCase();
    txns.push({ref:normalizeRef(ref),fecha,dia,monto,
      tipo:isC?'credito':'debito',descripcion:desc,banco:'bancaribe'});
  }
  return txns;
}


function esFeriado(fecha) {
  // fecha: string 'YYYY-MM-DD'
  if(!fecha) return false;
  const mmdd = fecha.slice(5); // 'MM-DD'
  if(_CB_FERIADOS_FIJOS.has(mmdd)) return true;
  if(_CB_FERIADOS_VAR.has(fecha)) return true;
  return false;
}

function esNoHabil(fecha) {
  // fecha: string 'YYYY-MM-DD'
  // Retorna true si es sábado, domingo o feriado
  const d = new Date(fecha + 'T00:00:00');
  const dow = d.getDay(); // 0=Dom, 6=Sab
  if(dow === 0 || dow === 6) return true;
  if(esFeriado(fecha)) return true;
  return false;
}

function siguienteDiaHabil(fecha) {
  // Dado 'YYYY-MM-DD', devuelve el siguiente día hábil
  // Si ya es hábil, lo retorna igual
  let d = new Date(fecha + 'T00:00:00');
  let safetyCounter = 0;
  while(esNoHabil(isoFecha(d)) && safetyCounter < 10) {
    d.setDate(d.getDate() + 1);
    safetyCounter++;
  }
  return isoFecha(d);
}

function diasHabilesHasta(fechaOrigen, diasMax) {
  // Genera lista de fechas ISO (YYYY-MM-DD) del día de la caja hasta
  // el siguiente día hábil efectivo (en caso de feriado/fin de semana)
  // más un margen de ±1 día hábil alrededor
  const origen = new Date(fechaOrigen + 'T00:00:00');
  const candidatos = new Set();

  // Siempre incluir el día original y el siguiente día hábil
  candidatos.add(fechaOrigen);
  candidatos.add(siguienteDiaHabil(fechaOrigen));

  // También buscar ±1 día calendario por si el banco procesó un día antes
  for(let delta = -1; delta <= diasMax; delta++) {
    const d = new Date(origen);
    d.setDate(d.getDate() + delta);
    const iso = isoFecha(d);
    candidatos.add(iso);
    // Si ese día es no hábil, añadir también su siguiente día hábil
    if(esNoHabil(iso)) candidatos.add(siguienteDiaHabil(iso));
  }
  return candidatos;
}

function isoFecha(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function labelDesfase(fechaCaja, fechaBanco) {
  // Genera el texto descriptivo del desfase para la observación
  const noCaja = esNoHabil(fechaCaja);
  const esFer  = esFeriado(fechaCaja);
  const dow    = new Date(fechaCaja + 'T00:00:00').getDay();
  const diaCaja  = parseInt(fechaCaja.slice(8));
  const diaBanco = parseInt(fechaBanco.slice(8));
  const diff = diaBanco - diaCaja;
  if(diff === 0) return '';
  if(esFer)  return `Día caja: ${diaCaja} (feriado) | Día banco: ${diaBanco} — procesado siguiente día hábil`;
  if(dow === 6) return `Día caja: ${diaCaja} (sábado) | Día banco: ${diaBanco} — procesado el lunes`;
  if(dow === 0) return `Día caja: ${diaCaja} (domingo) | Día banco: ${diaBanco} — procesado el lunes`;
  if(Math.abs(diff) === 1) return `Día caja: ${diaCaja} | Día banco: ${diaBanco} — desfase 1 día`;
  return `Día caja: ${diaCaja} | Día banco: ${diaBanco} — desfase ${Math.abs(diff)} días, investigar`;
}

// ══════════════════════════════════════════════════════════
//  IMPORTAR EXCEL PREVIO DE CONCILIACIÓN
// ══════════════════════════════════════════════════════════


var _cmList=[];
function _ccSetVista(v){ window._ccVista=v; _ccAct=null; renderCierre(); }
function _ccBancoPrior(v){ if(!_ccPuede())return; var cfg=window._ccCfg||{}; cfg.banco_prior=v||''; cfg.actualizado_por=(typeof currentUser!=='undefined'?currentUser:''); cfg.actualizado_en=new Date().toISOString(); window._ccCfg=cfg; supabaseClient.from('app_sections').update({data:cfg}).eq('section_name','caja_cfg').then(function(r){ if(r&&r.error){ showToast&&showToast('Error: '+(r.error.message||'')); return; } showToast&&showToast(v?('🏦 Banco prioritario: '+v+' · las cajas lo verán en segundos'):'Banco prioritario quitado'); if(typeof logAudit==='function')logAudit('caja.banco_prior',v||'(ninguno)'); }); }
function _cmCargar(cb){ supabaseClient.from('caja_metalica').select('*').eq('empresa',_ccEmp()).order('id',{ascending:false}).limit(300).then(function(r){ _cmList=(r&&r.data)||[]; if(cb)cb(); }); }
function _cmSaldo(){ return _cmList.reduce(function(a,m){ return a+(m.tipo==='entrada'?_ccNum(m.monto):-_ccNum(m.monto)); },0); }
var _cmSem=null; // lunes de la semana visible
var _CM_DIAS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
var _CM_MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _cmUD(f){ var pp=String(f).slice(0,10).split('-'); return new Date(Date.UTC(+pp[0],+pp[1]-1,+pp[2])); }
function _cmUMas(f,n){ var d=_cmUD(f); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function _cmLunes(f){ var d=_cmUD(f); var dw=(d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-dw); return d.toISOString().slice(0,10); }
function _cmHoyF(){ try{ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _cmSemLbl(){ var a=_cmUD(_cmSem), b=_cmUD(_cmUMas(_cmSem,6));
  var ma=_CM_MES[a.getUTCMonth()], mb=_CM_MES[b.getUTCMonth()];
  var t=(ma===mb)?(a.getUTCDate()+' – '+b.getUTCDate()+' de '+ma):(a.getUTCDate()+' '+ma+' – '+b.getUTCDate()+' '+mb);
  return t+' '+b.getUTCFullYear()+((_cmSem===_cmLunes(_cmHoyF()))?' · esta semana':'');
}
function _cmSemMov(delta){ _cmSem=_cmUMas(_cmSem,delta*7); renderCierre(); }
function _cmSemHoy(){ _cmSem=_cmLunes(_cmHoyF()); renderCierre(); }
function _cmFechaDe(m){ if(m.fecha) return String(m.fecha).slice(0,10);
  var t=Date.parse(m.creado_en||''); if(isNaN(t)) return '';
  return new Date(t-4*3600*1000).toISOString().slice(0,10); // hora de Venezuela
}

function _cmEsSuper(){ try{ return ['supervisor','angelica','admin'].indexOf(currentRole)>=0; }catch(e){ return false; } }
function _cmEsGerente(){ try{ return currentRole==='gerente'||currentRole==='admin'||currentUser==='gerente'; }catch(e){ return false; } }
function _cmReqSup(m){ return m.es_gerente?1:2; }
function _cmPend(m){ if(m.tipo!=='salida')return false; if(m.estado==null)return false; return !_cmAutorizado(m); }
function _cmAutorizado(m){ if(m.tipo!=='salida')return true; if(m.estado==null)return true; var nf=((m.firmas||[]).length); var okSup=nf>=_cmReqSup(m); var okGer=m.es_gerente?(m.firmado_gerente===true):true; return okSup&&okGer; }
function _cmEstadoHTML(m){
  if(m.tipo!=='salida'||m.estado==null) return '';
  var firmas=(m.firmas||[]); var reqS=_cmReqSup(m);
  var quienes=firmas.map(function(f){return esc(f.por||'?');}).join(', ');
  if(_cmAutorizado(m)) return '<div style="font-size:10.5px;color:var(--green);font-weight:700;margin-top:2px">✓ Autorizado'+(quienes?(' · firmas: '+quienes):'')+(m.es_gerente?' · JP firmó en Inicio':'')+'</div>';
  var faltaS=Math.max(0,reqS-firmas.length);
  var partes=[]; if(faltaS>0)partes.push('faltan '+faltaS+' firma(s) de supervisor'); if(m.es_gerente&&m.firmado_gerente!==true)partes.push('falta que JP firme en Inicio');
  var yo=(typeof currentUser!=='undefined'?currentUser:'')||'';
  var yaFirme=firmas.some(function(f){return (f.por||'').toLowerCase()===yo.toLowerCase();});
  var btn=''; if(_cmEsSuper()&&faltaS>0&&!yaFirme) btn='<button class="btn btn-green btn-sm" style="padding:3px 9px;font-size:11px;margin-left:6px" onclick="_cmFirmar('+m.id+')">✍ Firmar</button>';
  if(_cmEsGerente()&&m.es_gerente&&m.firmado_gerente!==true) btn+='<button class="btn btn-sm" style="padding:3px 9px;font-size:11px;margin-left:6px;background:#2563eb;color:#fff" onclick="_cmFirmarGerente('+m.id+')">✍ Firmar como JP</button>';
  return '<div style="font-size:10.5px;color:#b45309;font-weight:700;margin-top:2px">⏳ Pendiente · '+partes.join(' · ')+(quienes?(' · firmó: '+quienes):'')+btn+'</div>';
}
function _cmRowHTML(m,puede){ var ent=(m.tipo==='entrada'); return '<tr style="border-top:1px solid var(--border)"><td style="padding:6px 8px">'+(ent?'<span style="color:var(--green);font-weight:700">↑ Entrada</span>':'<span style="color:var(--red);font-weight:700">↓ Salida</span>')+'</td><td style="padding:6px 8px;font-size:12px">'+esc(ent?(m.cajero||''):(m.quien||''))+(m.proveedor?(' → <b>'+esc(m.proveedor)+'</b>'):'')+(m.motivo?(' · '+esc(m.motivo)):'')+(m.es_gerente?' <span style="background:#dbeafe;color:#1e40af;border-radius:6px;padding:0 5px;font-size:10px;font-weight:700">JP</span>':'')+_cmEstadoHTML(m)+'</td><td style="padding:6px 8px;text-align:right;font-weight:700;color:'+(ent?'var(--green)':'var(--red)')+'">'+(ent?'+':'−')+'$ '+_ccFmt(m.monto)+'</td>'+(puede?'<td style="padding:6px 8px;text-align:center"><button onclick="_cmDel('+m.id+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:15px">×</button></td>':'<td></td>')+'</tr>'; }
function _cmHTML(){
  var puede=_ccPuede(); var saldo=_cmSaldo();
  var nPend=_cmList.filter(_cmPend).length;
  var inp='padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px';
  if(!_cmSem)_cmSem=_cmLunes(_cmHoyF());
  var _semDias=[]; for(var _d=0;_d<7;_d++)_semDias.push(_cmUMas(_cmSem,_d));
  var _semFin=_semDias[6];
  var _enSem=_cmList.filter(function(m){ var f=_cmFechaDe(m); return f>=_cmSem&&f<=_semFin; });
  var _wEnt=0,_wSal=0; _enSem.forEach(function(m){ if(m.tipo==='entrada')_wEnt+=_ccNum(m.monto); else _wSal+=_ccNum(m.monto); });
  var _hoyF=_cmHoyF();
  var rows=_semDias.map(function(fd,di){
    var del=_enSem.filter(function(m){ return _cmFechaDe(m)===fd; });
    var lbl=_CM_DIAS[di]+' '+_cmUD(fd).getUTCDate();
    var esHoy=(fd===_hoyF);
    var head='<tr><td colspan="4" style="padding:8px 8px 4px;background:var(--surface2);font-size:10.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:'+(esHoy?'var(--accent)':'var(--muted)')+'">'+lbl+(esHoy?' · HOY':'')+(del.length?'':' <span style="font-weight:500;text-transform:none;letter-spacing:0">— sin movimientos</span>')+'</td></tr>';
    return head+del.map(function(m){ return _cmRowHTML(m,puede); }).join('');
  }).join('');
  var nav='<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px">'+
    '<button class="btn btn-ghost btn-sm" style="padding:6px 12px;font-weight:800;font-size:15px;line-height:1" onclick="_cmSemMov(-1)">‹</button>'+
    '<div style="padding:6px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);font-weight:800;font-size:13px;white-space:nowrap">'+_cmSemLbl()+'</div>'+
    '<button class="btn btn-ghost btn-sm" style="padding:6px 12px;font-weight:800;font-size:15px;line-height:1" onclick="_cmSemMov(1)">›</button>'+
    (_cmSem!==_cmLunes(_hoyF)?'<button class="btn btn-ghost btn-sm" style="padding:6px 12px" onclick="_cmSemHoy()">Hoy</button>':'')+
    '<span style="flex:1"></span>'+
    '<span style="font-size:12px"><b style="color:var(--green)">+$ '+_ccFmt(_wEnt)+'</b> · <b style="color:var(--red)">−$ '+_ccFmt(_wSal)+'</b> · neto <b style="color:'+((_wEnt-_wSal)>=0?'var(--green)':'var(--red)')+'">'+((_wEnt-_wSal)>=0?'+':'−')+'$ '+_ccFmt(Math.abs(_wEnt-_wSal))+'</b></span>'+
  '</div>';
  var jpDef=_cmEsGerente()?' checked':'';
  return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px"><p class="section-title" style="margin:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v-1M12 17v-1"/></svg>Caja metálica (dólares)</p><button class="btn btn-ghost btn-sm" onclick="_ccSetVista(\'cierres\')">← Cierres</button></div>'+
    '<div class="tbox" style="padding:16px;margin-bottom:12px;text-align:center;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fca5a5"><div style="font-size:12px;color:#991b1b;font-weight:700;letter-spacing:.5px">SALDO EN CAJA ROJA</div><div style="font-size:32px;font-weight:900;color:#b91c1c">$ '+_ccFmt(saldo)+'</div>'+(nPend>0?('<div style="font-size:11.5px;color:#b45309;font-weight:700;margin-top:4px">⏳ '+nPend+' retiro(s) pendiente(s) de firma</div>'):'')+'</div>'+
    (puede?('<div class="tbox" style="padding:12px;margin-bottom:12px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Registrar movimiento</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed var(--border)"><label style="font-size:11px;color:var(--muted)">↑ Entrada — de cajero<input id="cm-e-cajero" placeholder="Cajero" style="'+inp+';display:block;margin-top:3px;width:150px"></label><label style="font-size:11px;color:var(--muted)">Monto $<input id="cm-e-monto" type="number" step="0.01" style="'+inp+';display:block;margin-top:3px;width:110px"></label><button class="btn btn-green btn-sm" onclick="_cmAdd(\'entrada\')">+ Entrada</button></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end"><label style="font-size:11px;color:var(--muted)">↓ Salida — quién saca<input id="cm-s-quien" placeholder="Ej. Sr. José" style="'+inp+';display:block;margin-top:3px;width:150px"></label><label style="font-size:11px;color:var(--muted)">Monto $<input id="cm-s-monto" type="number" step="0.01" style="'+inp+';display:block;margin-top:3px;width:110px"></label><label style="font-size:11px;color:var(--muted)">Proveedor<input id="cm-s-prov" list="cm-prov-list" placeholder="\u00bfA qu\u00e9 proveedor?" style="'+inp+';display:block;margin-top:3px;width:180px"><datalist id="cm-prov-list">'+_cmProvOpts()+'</datalist></label><label style="font-size:11px;color:var(--muted)">Nota (factura)<input id="cm-s-motivo" placeholder="Ej. abono fact. 123" style="'+inp+';display:block;margin-top:3px;width:150px"></label><label style="font-size:11.5px;color:#1e40af;font-weight:700;display:flex;align-items:center;gap:5px;white-space:nowrap"><input type="checkbox" id="cm-s-jp"'+jpDef+' style="width:15px;height:15px"> Lo saca el gerente JP (Jose)</label><button class="btn btn-sm" style="background:var(--red);color:#fff" onclick="_cmAdd(\'salida\')">− Registrar salida</button></div>'+
      '<div style="font-size:10.5px;color:var(--muted);margin-top:8px">Toda salida de dólares queda <b>pendiente</b> hasta que firmen <b>2 supervisores</b>. Si la saca el gerente JP, se le avisa en Inicio para que firme el monto y basta <b>1 supervisor</b>.</div>'+
    '</div>'):'')+
    nav+'<div class="twrap"><table style="width:100%"><thead><tr><th style="text-align:left">Tipo</th><th style="text-align:left">Detalle</th><th style="text-align:right">Monto</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="4" style="padding:14px;text-align:center;color:var(--muted)">Sin movimientos.</td></tr>')+'</tbody></table></div>';
}
function _cmAdd(tipo){
  if(!_ccPuede())return; var monto,rec;
  if(tipo==='entrada'){ var cajero=(document.getElementById('cm-e-cajero').value||'').trim(); monto=_ccNum(document.getElementById('cm-e-monto').value); if(monto<=0){alert('Escribe el monto');return;} rec={tipo:'entrada',monto:monto,cajero:cajero}; }
  else { var jp=!!(document.getElementById('cm-s-jp')&&document.getElementById('cm-s-jp').checked); var quien=(document.getElementById('cm-s-quien').value||'').trim(); if(jp&&!quien)quien='Jose (JP)'; var motivo=(document.getElementById('cm-s-motivo').value||'').trim(); var prov=((document.getElementById('cm-s-prov')||{}).value||'').trim(); monto=_ccNum(document.getElementById('cm-s-monto').value); if(monto<=0){alert('Escribe el monto');return;} if(!prov){alert('Indica a qué proveedor va el abono');return;} rec={tipo:'salida',monto:monto,quien:quien,motivo:motivo,proveedor:prov,estado:'pendiente',firmas:[],es_gerente:jp,firmado_gerente:false,cxp_visto:false}; }
  rec.empresa=_ccEmp(); rec.registrado_por=(typeof currentUser!=='undefined'?currentUser:null); rec.fecha=_ccHoy();
  supabaseClient.from('caja_metalica').insert([rec]).then(function(r){ if(r&&r.error){ showToast&&showToast('Error: '+(r.error.message||'')); return; } if(typeof logAudit==='function')logAudit('metalica.'+tipo,'$'+monto+(rec.es_gerente?' (JP)':'')); if(tipo==='salida'){ showToast&&showToast('↓ Salida a '+(rec.proveedor||'proveedor')+' registrada · avisada a Grismar (CxP)'+(rec.es_gerente?' · firma de JP + 1 supervisor':' · pendiente de 2 firmas')); } _cmCargar(function(){ renderCierre(); }); });
}
function _cmFirmar(id){
  if(!_cmEsSuper()){ showToast&&showToast('Solo un supervisor puede firmar'); return; }
  var m=_cmList.filter(function(x){return x.id===id;})[0]; if(!m)return;
  var yo=(typeof currentUser!=='undefined'?currentUser:'')||''; var fs=(m.firmas||[]).slice();
  if(fs.some(function(f){return (f.por||'').toLowerCase()===yo.toLowerCase();})){ showToast&&showToast('Ya firmaste este retiro'); return; }
  fs.push({por:yo,at:new Date().toISOString()}); var upd={firmas:fs}; var tmp=Object.assign({},m,{firmas:fs}); if(_cmAutorizado(tmp))upd.estado='autorizado';
  supabaseClient.from('caja_metalica').update(upd).eq('id',id).then(function(r){ if(r&&r.error){ showToast&&showToast('Error: '+(r.error.message||'')); return; } if(typeof logAudit==='function')logAudit('metalica.firma_salida',id+' · '+yo); showToast&&showToast(upd.estado==='autorizado'?'✓ Retiro autorizado':'✓ Firma registrada'); _cmCargar(function(){ renderCierre(); }); });
}
function _cmFirmarGerente(id){
  if(!_cmEsGerente()){ showToast&&showToast('Solo el gerente (JP) firma aquí'); return; }
  supabaseClient.from('caja_metalica').select('*').eq('id',id).maybeSingle().then(function(r){
    var m=r&&r.data; if(!m){ showToast&&showToast('No se encontró el retiro'); return; }
    var upd={firmado_gerente:true}; var tmp=Object.assign({},m,{firmado_gerente:true}); if(_cmAutorizado(tmp))upd.estado='autorizado';
    supabaseClient.from('caja_metalica').update(upd).eq('id',id).then(function(r2){ if(r2&&r2.error){ showToast&&showToast('Error: '+(r2.error.message||'')); return; } if(typeof logAudit==='function')logAudit('metalica.firma_gerente',''+id); showToast&&showToast('✓ Firmaste tu retiro de la caja metálica'); try{ if(typeof renderInicio==='function'&&typeof activeTab!=='undefined'&&activeTab==='inicio')renderInicio(); }catch(e){} try{ if(window._ccVista==='metalica')_cmCargar(function(){renderCierre();}); }catch(e){} });
  });
}
function _cmProvOpts(){ try{ var out=[]; ['farmacia','FARMACIA','Farmacia'].forEach(function(em){ (typeof getProveedores==='function'?getProveedores(em):[]).forEach(function(n){ if(n&&out.indexOf(n)<0)out.push(n); }); }); return out.sort().map(function(n){ return '<option value="'+esc(n)+'">'; }).join(''); }catch(e){ return ''; } }
function _cmMarcarCxp(id){ var ok=false; try{ ok=(currentRole==='grismar'||currentRole==='admin'||currentRole==='mayra'); }catch(e){} if(!ok){ showToast&&showToast('Solo CxP (Grismar) marca esto'); return; } supabaseClient.from('caja_metalica').update({cxp_visto:true}).eq('id',id).then(function(r){ if(r&&r.error){ showToast&&showToast('Error: '+(r.error.message||'')); return; } if(typeof logAudit==='function')logAudit('metalica.cxp_visto',''+id); showToast&&showToast('✓ Marcado como registrado en CxP'); try{ if(typeof renderInicio==='function'&&typeof activeTab!=='undefined'&&activeTab==='inicio')renderInicio(); }catch(e){} try{ if(window._ccVista==='metalica')_cmCargar(function(){renderCierre();}); }catch(e){} }); }
function _cmDel(id){ if(!_ccPuede())return; if(!confirm('¿Borrar este movimiento?'))return; supabaseClient.from('caja_metalica').delete().eq('id',id).then(function(){ _cmCargar(function(){ renderCierre(); }); }); }

function _cbRepaint(){ var el=document.getElementById('concil-cajas-content'); if(el && typeof activeTab!=='undefined' && activeTab==='concil-cajas'){ el.innerHTML=_cbHTML(); } else if(typeof renderCierre==='function' && typeof activeTab!=='undefined' && activeTab==='cierre'){ renderCierre(); } }
function renderConcilCajas(){ var el=document.getElementById('concil-cajas-content'); if(!el)return; el.innerHTML='<div style="padding:16px;color:var(--muted)">Cargando…</div>'; if(!_cbMes){ var h=new Date(); _cbMes=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'); } _cbCargarGuardado(function(){ var e2=document.getElementById('concil-cajas-content'); if(e2)e2.innerHTML=_cbHTML(); }); }
function renderTab(tab) {
  if (tab==='inicio') renderInicio();
  else if (tab==='ventasvivo') renderVentasVivo();
  else if (tab==='panel')      renderPanel();
  else if (tab==='bancos')     renderBancos();
  else if (tab==='bancos-hist') renderBancosHist();
  else if (tab==='bancos-concil') renderBancosConcil();
  else if (tab==='prest-resumen') renderProxPagos();
  else if (tab==='prestamos') renderPrestamosU();
  else if (tab==='facturas')  renderFacturasU();
  else if (tab==='historial')  renderHistorial();
  else if (tab==='verif-ines')  renderVerifInes();
  else if (tab==='gerencia')    renderGerencia();
  else if (tab==='cxc') renderCxC();
  else if (tab==='reto') renderReto();
  else if (tab==='vencimientos') renderVencimientos();
  else if (tab==='mensajes') renderMensajes();
  else if (tab==='cierre') renderCierre();
  else if (tab==='concil-cajas') renderConcilCajas();
  else if (tab==='cxp-prov') renderCxpProv();
  else if (tab==='cal-pagos') renderCalPagos();
  else if (tab==='conta') renderConta();
  else if (tab==='cxp') renderCxP();
  else if (tab==='turnos') _turEntrar();
  else if (tab==='vales') renderVales();
  else if (tab==='rrhh') renderRRHH();
  else if (tab==='yapague') renderYaPague();
  else if (tab==='anomalias') renderAnomalias();
  else if (tab==='consumo') renderConsumo();
  else if (tab==='desempeno') renderDesempeno();
  else if (tab==='vacaciones') renderVacaciones();
  else if (tab==='compras') renderCompras();
  else if (tab==='almacen') renderAlmacen();
  else if (tab==='reparto') renderReparto();
  else if (tab==='admin-panel') renderAdminPanel();
  renderBadges();
}


// ══════════════════════════════════════════════════════════════
// GERENCIA DASHBOARD
// ══════════════════════════════════════════════════════════════
let _chartFact = null, _chartPrest = null, _chartVerif = null;

// ─── Gerencia helpers ──────────────────────────────────────────








function _dispUltimaFecha(){
  var b=db.bancos||{}; if(b[HOY()]) return HOY();
  var ks=Object.keys(b).filter(function(k){return /^\d{4}-\d{2}-\d{2}$/.test(k);}).sort();
  return ks.length?ks[ks.length-1]:HOY();
}
function _dispActual(fecha){
  fecha=fecha||_dispUltimaFecha();
  var base=(db.bancos&&db.bancos[fecha])||{FARMACIA:{},DROGUERIA:{}};
  var act={FARMACIA:{},DROGUERIA:{}};
  ['FARMACIA','DROGUERIA'].forEach(function(ent){ BANCOS_LIST.forEach(function(b){ act[ent][b]=Number((base[ent]||{})[b])||0; }); });
  (typeof _movsDesdeBase==='function'?(_movsDesdeBase(fecha)||[]):[]).forEach(function(m){ var bs=Number(m.monto_bs)||0;
    if(m.tipo==='salida'){ if(act[m.entidad]) act[m.entidad][m.banco]=(act[m.entidad][m.banco]||0)-bs; }
    else if(m.tipo==='entrada'){ if(act[m.entidad]) act[m.entidad][m.banco]=(act[m.entidad][m.banco]||0)+bs; }
    else if(m.tipo==='traspaso'){ if(act[m.entidad]) act[m.entidad][m.banco]=(act[m.entidad][m.banco]||0)-bs; if(act[m.entidad_dest]) act[m.entidad_dest][m.banco_dest]=(act[m.entidad_dest][m.banco_dest]||0)+bs; }
  });
  var far=BANCOS_LIST.reduce(function(a,b){return a+(act.FARMACIA[b]||0);},0);
  var dro=BANCOS_LIST.reduce(function(a,b){return a+(act.DROGUERIA[b]||0);},0);
  return {fecha:fecha, far:far, dro:dro, total:far+dro};
}
function _gerenteRefrescar(btn){
  if(btn){ btn.disabled=true; btn.innerHTML='Actualizando…'; }
  try{
    var p = (typeof syncFromSupabase==='function') ? syncFromSupabase(true) : null;
    Promise.resolve(p).then(function(){ if(typeof renderGerencia==='function') renderGerencia(); if(typeof showToast==='function') showToast('Pantalla actualizada'); }).catch(function(){ if(typeof renderGerencia==='function') renderGerencia(); });
  }catch(e){ if(typeof renderGerencia==='function') renderGerencia(); }
}
function _gerenteDispHTML(){
  var d=_dispActual(); var tasa=getTasa();
  function usd(bs){ return tasa? ('$'+fmt(bs/tasa,2)) : 'sin tasa'; }
  var tieneDatos=(db.bancos && db.bancos[d.fecha]);
  var fechaLbl=(d.fecha&&typeof fmtDate==='function')?fmtDate(d.fecha):d.fecha;
  var movs=(typeof bancosMovs==='function'?(bancosMovs(d.fecha)||[]):[]);
  var movsHtml;
  if(!movs.length){ movsHtml='<div style="color:var(--muted);font-size:13px;padding:16px 4px;text-align:center">No hay movimientos registrados hoy.</div>'; }
  else {
    movsHtml=movs.map(function(m){
      var bs=Number(m.monto_bs)||0; var u=(m.monto_usd!=null&&m.monto_usd!=='')?Number(m.monto_usd):(tasa?bs/tasa:null);
      var sal=m.tipo==='salida', ent=m.tipo==='entrada', tra=m.tipo==='traspaso';
      var col=sal?'var(--red)':(ent?'var(--green)':'var(--accent)');
      var sign=sal?'−':(ent?'+':''); var icon=sal?'−':(ent?'+':'↔');
      var bg=sal?'#fee2e2':(ent?'#ecfdf5':'#eef2ff');
      var lugar=esc((m.entidad||'')+(m.banco?(' · '+m.banco):''))+(tra&&m.banco_dest?(' → '+esc((m.entidad_dest||'')+' · '+m.banco_dest)):'');
      var titulo=esc(m.concepto||(sal?'Salida':(ent?'Entrada':'Traspaso')));
      return '<div style="display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid var(--border)">'+
        '<span style="width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:'+col+';background:'+bg+'">'+icon+'</span>'+
        '<div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+titulo+'</div><div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+lugar+'</div></div>'+
        '<div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:700;color:'+col+'">'+sign+_fmtBs(bs)+' Bs</div>'+(u!=null?('<div style="font-size:11px;color:var(--muted)">'+sign+'$'+fmt(u,2)+'</div>'):'')+'</div>'+
      '</div>';
    }).join('');
  }
  return _pgBox()+_gerHoyBox()+_anomBox()+'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><p class="section-title" style="margin:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> Disponibilidad del día</p><button class="btn btn-ghost btn-sm" onclick="_gerenteRefrescar(this)" style="flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>Actualizar</button></div>'+
    '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">'+(tieneDatos?('Al '+esc(fechaLbl)):'Aún no se ha registrado la disponibilidad bancaria.')+(tasa?(' · tasa '+fmt(tasa,2)+' Bs/$'):' · sin tasa cargada')+'.</div>'+
    '<div class="tbox" style="margin-bottom:16px;text-align:center;padding:22px"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Saldo disponible</div><div style="font-size:30px;font-weight:800;margin-top:6px">'+_fmtBs(d.total)+' Bs</div><div style="font-size:18px;color:var(--green);font-weight:700;margin-top:2px">'+usd(d.total)+'</div>'+
    '<div style="display:flex;justify-content:center;gap:20px;margin-top:12px;font-size:12px;color:var(--muted)"><span>Farmacia <strong style="color:var(--text)">'+_fmtBs(d.far)+' Bs</strong></span><span>Droguería <strong style="color:var(--text)">'+_fmtBs(d.dro)+' Bs</strong></span></div></div>'+
    '<div style="font-weight:700;font-size:14px;margin:0 0 6px">Movimientos del día'+(movs.length?(' ('+movs.length+')'):'')+'</div>'+
    '<div class="tbox" style="padding:4px 14px">'+movsHtml+'</div>';
}

function _cbTasas(){
  // Fuente principal: HISTORIAL de tasas (db.tasas, el que se mantiene en el modulo de Tasas).
  // Respaldo: la tasa guardada con el consolidado diario (ventas_diarias) para los dias que falten.
  var hist=(typeof db!=='undefined' && db && db.tasas) ? db.tasas : {};
  var mapa={};
  Object.keys(hist).forEach(function(f){ if(String(f).slice(0,7)===_cbMes){ var v=Number(hist[f])||0; if(v>0) mapa[String(f).slice(0,10)]={tasa:v,fuente:'Historial'}; } });
  supabaseClient.from('ventas_diarias').select('fecha,tasa').gte('fecha',_cbMes+'-01').lte('fecha',_cbMes+'-31').order('fecha').then(function(r){
    ((r&&r.data)||[]).forEach(function(x){ var f=String(x.fecha).slice(0,10); var v=Number(x.tasa)||0; if(v>0 && !mapa[f]) mapa[f]={tasa:v,fuente:'Cierre'}; });
    _cbTasasModal(mapa);
  }).catch(function(){ _cbTasasModal(mapa); });
}
function _cbTasasModal(mapa){
  var dias=Object.keys(mapa).sort();
  var mesLbl=_cbMes;
  try{ var p=_cbMes.split('-'); mesLbl=new Date(p[0],p[1]-1,1).toLocaleDateString('es-VE',{month:'long',year:'numeric'}); }catch(e){}
  var filas=dias.length? dias.map(function(f){
    var r=mapa[f]; var dd=f.slice(8,10); var esHist=(r.fuente==='Historial');
    return '<tr style="border-top:1px solid #eef0f3"><td style="padding:7px 10px;font-weight:700;font-variant-numeric:tabular-nums">'+dd+'</td>'+
      '<td style="padding:7px 10px;text-align:right;font-variant-numeric:tabular-nums;font-weight:700">'+(Number(r.tasa)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td>'+
      '<td style="padding:7px 10px;text-align:right"><span style="font-size:10.5px;font-weight:700;color:'+(esHist?'#1E38A6':'#64748b')+';background:'+(esHist?'#e8edfb':'#f1f5f9')+';padding:2px 8px;border-radius:999px">'+r.fuente+'</span></td></tr>';
  }).join('') : '<tr><td colspan="3" style="padding:18px;text-align:center;color:#64748b;font-size:13px">Sin tasas para este mes. Agregalas en el modulo de Tasas (historial).</td></tr>';
  var inner='<div style="padding:15px 18px;border-bottom:1px solid #eef0f3;display:flex;justify-content:space-between;align-items:center;gap:10px">'+
      '<div style="font-weight:700;font-size:15px;color:#1e293b">📈 Tasas del mes — '+esc(mesLbl)+'</div>'+
      '<button class="btn btn-ghost btn-sm" onclick="_contaCloseModal()">Cerrar</button></div>'+
    '<div style="padding:4px 18px 16px;color:#1e293b">'+
      '<div style="font-size:11.5px;color:#64748b;margin:8px 0 10px">Se toman del <b>historial de tasas</b> que mantienes; los dias que falten se completan con la tasa guardada en el cierre de ese dia.</div>'+
      '<div style="max-height:60vh;overflow:auto;border:1px solid #eef0f3;border-radius:10px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:#f8fafc"><th style="text-align:left;padding:7px 10px;font-size:11px;color:#64748b">Dia</th><th style="text-align:right;padding:7px 10px;font-size:11px;color:#64748b">Tasa (Bs/$)</th><th style="text-align:right;padding:7px 10px;font-size:11px;color:#64748b">Fuente</th></tr></thead><tbody>'+filas+'</tbody></table></div>'+
      '<div style="font-size:11px;color:#94a3b8;margin-top:8px">'+dias.length+' dia(s) con tasa.</div></div>';
  if(typeof _contaCloseModal==='function') _contaCloseModal();
  var d=document.createElement('div'); d.id='conta-modal';
  d.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
  d.innerHTML='<div style="background:#fff;color:#1e293b;border-radius:16px;max-width:min(460px,95vw);width:100%;box-shadow:0 24px 64px rgba(0,0,0,.32)">'+inner+'</div>';
  d.addEventListener('click',function(e){ if(e.target===d && typeof _contaCloseModal==='function') _contaCloseModal(); });
  document.body.appendChild(d);
}
