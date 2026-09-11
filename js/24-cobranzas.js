/* ===== Cobranzas Droguería (A2 de Mayra) — prefijo _cxb ===== */
var _cxbRows=[],_cxbMeta={},_cxbVista='hoy';
function _cxbNum(s){ s=(''+(s||'')).trim(); if(!s)return 0; var i=s.lastIndexOf(','); if(i>=0){ s=s.slice(0,i).replace(/[,.]/g,'')+'.'+s.slice(i+1); } else { s=s.replace(/,/g,''); } var v=parseFloat(s); return isNaN(v)?0:v; }
function _cxbFechaRep(txt){ var m=(''+txt).slice(0,2000).match(/(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}/); return m?(m[3]+'-'+m[2]+'-'+m[1]):null; }
function _cxbFecha(s){ var m=(''+s).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?(m[3]+'-'+m[2]+'-'+m[1]):null; }
function _cxbParse(txt){
  var lineas=txt.split(/\r?\n/), cli=null, out=[];
  lineas.forEach(function(L){
    var mc=L.match(/Cliente:\s*(\d+)\s*-\s*(.+?)\s{3,}.*?Tel.f:\s*([\d\- ]*)/) || L.match(/Cliente:\s*(\d+)\s*-\s*(.+?)\s*$/);
    if(mc){ cli={cod:mc[1],nombre:mc[2].trim().replace(/\s{2,}/g,' '),tel:(mc[3]||'').trim()}; return; }
    if(!cli)return;
    var mf=L.match(/^\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if(!mf)return;
    var nums=(mf[6].match(/[\d]{1,3}(?:,[\d]{3})*(?:,\d{2})|[\d]+,\d{2}/g))||[];
    if(nums.length<5)return;
    // nums: tasaOp, montoBs, saldoBs, monto$, saldo$, saldoTasaActual (tomamos por posición desde el final)
    var saldoUsd=_cxbNum(nums[nums.length-2]), saldoBs=_cxbNum(nums[nums.length-4]);
    out.push({cliente_cod:cli.cod,cliente:cli.nombre,tel:cli.tel,factura:mf[4],emision:_cxbFecha(mf[1]),vence:_cxbFecha(mf[2]),saldo_usd:saldoUsd,saldo_bs:saldoBs});
  });
  return out;
}
function _cxbWaNum(t){ var d=(''+(t||'')).replace(/[^0-9]/g,''); if(!d)return ''; if(d.slice(0,2)==='58')return d; if(d.charAt(0)==='0')return '58'+d.slice(1); return '58'+d; }
function _cxbHab(desde,n){ var d=new Date((desde||HOY())+'T00:00:00'); var add=0; while(add<n){ d.setDate(d.getDate()+1); var iso=d.toISOString().slice(0,10); if(typeof esNoHabil==='function'?!esNoHabil(iso):(d.getDay()!==0&&d.getDay()!==6))add++; } return d.toISOString().slice(0,10); }
function _cxbDiasV(v){ if(!v)return 0; return Math.floor((new Date(HOY()+'T00:00:00')-new Date(v+'T00:00:00'))/86400000); }
function _cxbImportar(input){
  var f=input.files&&input.files[0]; if(!f)return; input.value='';
  var rd=new FileReader();
  rd.onload=function(ev){
    var rows=_cxbParse(''+ev.target.result);
    if(!rows.length){ showToast&&showToast('No encontré facturas en el archivo'); return; }
    var fRep=_cxbFechaRep(''+ev.target.result);
    var fPrev=(_cxbMeta&&_cxbMeta.fecha_reporte)||null;
    if(fRep && fPrev && fRep<fPrev){ alert('⛔ Este reporte es del '+fRep+' pero ya se importó uno más nuevo (del '+fPrev+').\nImportarlo marcaría como cobradas deudas que siguen vivas.\nPídele a Mayra el reporte más reciente.'); return; }
    if(fRep && fPrev && fRep===fPrev){ if(!confirm('Este reporte tiene la MISMA fecha del último importado ('+fRep+'). Se actualizarán saldos pero no se marcará nada como cobrado. ¿Continuar?'))return; }
    var mismaFecha=(fRep&&fPrev&&fRep===fPrev);
    supabaseClient.from('cxc_drog').select('id,cliente_cod,factura,estado').eq('empresa','drogueria').then(function(r){
      var prev=(r&&r.data)||[]; var enArchivo={}; rows.forEach(function(x){ enArchivo[x.cliente_cod+'|'+x.factura]=1; });
      var activasPrev=prev.filter(function(p){return p.estado==='activa';});
      var cobradas=mismaFecha?[]:activasPrev.filter(function(p){ return !enArchivo[p.cliente_cod+'|'+p.factura]; });
      var nuevas=rows.filter(function(x){ return !prev.some(function(p){return p.cliente_cod===x.cliente_cod&&p.factura===x.factura;}); });
      if(!confirm('Importar CxC A2:\n· '+rows.length+' facturas en el archivo ('+nuevas.length+' nuevas)\n· '+cobradas.length+' se marcarán COBRADAS (ya no aparecen)\n¿Continuar?'))return;
      var hoy=HOY();
      var ups=rows.map(function(x){ return {empresa:'drogueria',cliente_cod:x.cliente_cod,cliente:x.cliente,tel:x.tel||null,factura:x.factura,emision:x.emision,vence:x.vence,saldo_usd:x.saldo_usd,saldo_bs:x.saldo_bs,estado:'activa',detectada_en:hoy,actualizado_en:new Date().toISOString()}; });
      var lote=function(i){
        if(i>=ups.length){
          var fin=function(){ supabaseClient.from('app_sections').update({data:{ultima_importacion:hoy,fecha_reporte:fRep||fPrev||null}}).eq('section_name','cxc_drog_meta').then(function(){ _cxbCargar(); showToast&&showToast('✓ CxC importado: '+rows.length+' activas · '+cobradas.length+' cobradas'); }); };
          if(cobradas.length){ supabaseClient.from('cxc_drog').update({estado:'cobrada',cobrada_en:hoy}).in('id',cobradas.map(function(c){return c.id;})).then(fin); } else fin();
          return;
        }
        supabaseClient.from('cxc_drog').upsert(ups.slice(i,i+150),{onConflict:'cliente_cod,factura',ignoreDuplicates:false}).then(function(){ lote(i+150); });
      };
      lote(0);
    });
  };
  rd.readAsText(f,'windows-1252');
}
function _cxbCargar(){
  supabaseClient.from('app_sections').select('data').eq('section_name','cxc_drog_meta').maybeSingle().then(function(rm){ _cxbMeta=(rm&&rm.data&&rm.data.data)||{}; });
  supabaseClient.from('cxc_drog').select('*').eq('empresa','drogueria').eq('estado','activa').order('saldo_usd',{ascending:false}).then(function(r){
    _cxbRows=(r&&r.data)||[]; var el=document.getElementById('cxb-box'); if(el)el.innerHTML=_cxbHTML();
  });
}
function _cxbCli(){ var by={}; _cxbRows.forEach(function(x){ (by[x.cliente_cod]=by[x.cliente_cod]||{cod:x.cliente_cod,nombre:x.cliente,tel:x.tel,fs:[],usd:0,peor:0,prox:null,promesa:null}).fs.push(x); }); Object.keys(by).forEach(function(k){ var c=by[k]; c.fs.forEach(function(f){ c.usd+=Number(f.saldo_usd)||0; var dv=_cxbDiasV(f.vence); if(dv>c.peor)c.peor=dv; if(f.tel&&!c.tel)c.tel=f.tel; if(f.prox_contacto&&(!c.prox||f.prox_contacto<c.prox))c.prox=f.prox_contacto; if(f.promesa_fecha)c.promesa=f.promesa_fecha; }); }); return Object.values(by).sort(function(a,b){return b.usd-a.usd;}); }
function _cxbMsg(c){
  var f2=function(n){return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});};
  var dets=c.fs.map(function(f){return 'Fact. '+f.factura+' · $'+f2(f.saldo_usd)+' (venció '+(f.vence||'—')+')';}).join('\n');
  var promRota=c.promesa && c.promesa<HOY();
  var tono=promRota?'Le recordamos que la fecha de pago acordada ya pasó. Agradecemos regularizar su saldo HOY para evitar suspensión de despachos.':(c.peor>60?'Su cuenta presenta facturas con más de 60 días de vencidas. Agradecemos regularizar a la brevedad.':'Le recordamos amablemente su saldo pendiente con nosotros.');
  return '*Droguería Clínica* — Estimado cliente '+c.nombre+',\n'+tono+'\n\n'+dets+'\n*Total: $'+f2(c.usd)+'*\n\nQuedamos atentos. ¡Gracias!';
}
function _cxbWA(cod){ var c=_cxbCli().filter(function(x){return x.cod===cod;})[0]; if(!c)return; var num=_cxbWaNum(c.tel); var url='https://wa.me/'+(num||'')+'?text='+encodeURIComponent(_cxbMsg(c)); window.open(url,'_blank'); }
function _cxbContacto(cod){ var nota=prompt('Nota del contacto (ej: "escribí por WA", "prometió pagar el viernes"):'); if(nota===null)return; var prox=_cxbHab(HOY(),5); var ids=_cxbRows.filter(function(x){return x.cliente_cod===cod;}).map(function(x){return x.id;}); var reg={fecha:HOY(),nota:(nota||'').trim(),por:(typeof currentUser!=='undefined'?currentUser:'')};
  var mProm=(nota||'').match(/(\d{4}-\d{2}-\d{2})/); var upd={prox_contacto:prox,actualizado_en:new Date().toISOString()};
  supabaseClient.from('cxc_drog').select('id,contactos').in('id',ids).then(function(r){ var lote=((r&&r.data)||[]).map(function(x){ var cs=Array.isArray(x.contactos)?x.contactos:[]; cs.push(reg); return supabaseClient.from('cxc_drog').update(Object.assign({contactos:cs},upd)).eq('id',x.id); }); Promise.all(lote).then(function(){ showToast&&showToast('✓ Contacto registrado · próximo: '+prox); _cxbCargar(); }); });
}
function _cxbPromesa(cod){ var f=prompt('Fecha prometida de pago (AAAA-MM-DD):',HOY()); if(!f||!/^\d{4}-\d{2}-\d{2}$/.test(f)){ if(f!==null)showToast&&showToast('Formato: AAAA-MM-DD'); return; } var ids=_cxbRows.filter(function(x){return x.cliente_cod===cod;}).map(function(x){return x.id;}); supabaseClient.from('cxc_drog').update({promesa_fecha:f,prox_contacto:f,actualizado_en:new Date().toISOString()}).in('id',ids).then(function(){ showToast&&showToast('✓ Promesa anotada: '+f); _cxbCargar(); }); }
function _cxbHTML(){
  var f2=function(n){return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});};
  var clis=_cxbCli(); var hoy=HOY();
  var tot=clis.reduce(function(a,c){return a+c.usd;},0);
  var b30=0,b60=0,b90=0; _cxbRows.forEach(function(f){ var d=_cxbDiasV(f.vence),u=Number(f.saldo_usd)||0; if(d<=30)b30+=u; else if(d<=60)b60+=u; else b90+=u; });
  var ult=_cxbMeta.ultima_importacion; var dUlt=ult?Math.floor((new Date(hoy)-new Date(ult))/86400000):null;
  var aviso=(ult==null)?'<span style="color:var(--red);font-weight:700">Sin importaciones aún — sube el reporte de A2</span>':(dUlt>7?('<span style="color:var(--red);font-weight:700">⚠ Última importación hace '+dUlt+' días — pídele el archivo a Mayra</span>'):('Última importación: '+ult+(dUlt>0?(' ('+dUlt+' día(s))'):' (hoy)')));
  var hoyL=clis.filter(function(c){ return (c.prox&&c.prox<=hoy) || (!c.prox&&c.peor>0) || (c.promesa&&c.promesa<hoy); });
  var lista=(_cxbVista==='hoy'?hoyL:clis);
  var filas=lista.map(function(c){
    var promRota=c.promesa&&c.promesa<hoy;
    var chip=promRota?'<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px">PROMESA INCUMPLIDA</span>':(c.peor>60?'<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px">+60 DÍAS</span>':(c.peor>0?'<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px">VENCIDA</span>':'<span style="background:#dcfce7;color:#166534;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px">AL DÍA</span>'));
    return '<div style="border-top:1px solid var(--border);padding:9px 4px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
      '<div style="flex:1;min-width:200px"><div style="font-weight:700;font-size:13px">'+esc(c.nombre)+' '+chip+'</div><div style="font-size:11px;color:var(--muted)">'+c.fs.length+' factura(s) · peor: '+c.peor+' día(s) vencida'+(c.prox?(' · próx. contacto '+c.prox):'')+(c.tel?(' · 📞 '+esc(c.tel)):' · sin teléfono')+'</div></div>'+
      '<div style="font-weight:900;font-size:15px;white-space:nowrap">$ '+f2(c.usd)+'</div>'+
      '<div style="display:flex;gap:5px">'+(c.tel?('<button class="btn btn-green btn-sm" style="padding:4px 10px;font-size:11px" onclick="_cxbWA(\''+c.cod+'\')">📲 WA</button>'):'')+'<button class="btn btn-ghost btn-sm" style="padding:4px 10px;font-size:11px" onclick="_cxbContacto(\''+c.cod+'\')">✓ Contacté</button><button class="btn btn-ghost btn-sm" style="padding:4px 10px;font-size:11px" onclick="_cxbPromesa(\''+c.cod+'\')">🤝 Promesa</button></div></div>';
  }).join('');
  return '<div class="tbox" style="padding:14px;margin-bottom:16px">'+
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px"><div style="font-weight:800;font-size:15px">💰 Cobranzas Droguería (A2)</div><span style="font-size:11px;color:var(--muted)">'+aviso+'</span><label class="btn btn-ghost btn-sm" style="margin-left:auto;cursor:pointer">📂 Importar reporte A2<input type="file" accept=".txt" style="display:none" onchange="_cxbImportar(this)"></label></div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'+
    '<div style="flex:1;min-width:120px;background:var(--surface2);border-radius:10px;padding:8px 12px"><div style="font-size:10px;color:var(--muted);font-weight:700">EN LA CALLE</div><div style="font-weight:900;font-size:18px">$ '+f2(tot)+'</div></div>'+
    '<div style="flex:1;min-width:100px;background:var(--surface2);border-radius:10px;padding:8px 12px"><div style="font-size:10px;color:var(--muted);font-weight:700">0-30 DÍAS</div><div style="font-weight:800;color:#079455">$ '+f2(b30)+'</div></div>'+
    '<div style="flex:1;min-width:100px;background:var(--surface2);border-radius:10px;padding:8px 12px"><div style="font-size:10px;color:var(--muted);font-weight:700">31-60</div><div style="font-weight:800;color:#d97706">$ '+f2(b60)+'</div></div>'+
    '<div style="flex:1;min-width:100px;background:var(--surface2);border-radius:10px;padding:8px 12px"><div style="font-size:10px;color:var(--muted);font-weight:700">+60</div><div style="font-weight:800;color:#dc2626">$ '+f2(b90)+'</div></div></div>'+
    '<div style="display:flex;gap:6px;margin-bottom:4px"><button class="btn btn-sm '+(_cxbVista==='hoy'?'btn-green':'btn-ghost')+'" onclick="_cxbVista=\'hoy\';var e=document.getElementById(\'cxb-box\');if(e)e.innerHTML=_cxbHTML()">🔔 Cobrar hoy ('+hoyL.length+')</button><button class="btn btn-sm '+(_cxbVista==='todos'?'btn-green':'btn-ghost')+'" onclick="_cxbVista=\'todos\';var e=document.getElementById(\'cxb-box\');if(e)e.innerHTML=_cxbHTML()">Todos ('+clis.length+')</button></div>'+
    (filas||'<div style="padding:14px;text-align:center;color:var(--muted);font-size:12px">'+(_cxbVista==='hoy'?'Nadie pendiente por contactar hoy 🎉':'Sin deudas activas — importa el reporte de A2')+'</div>')+'</div>';
}

/* Respuesta de cobranzas para el asistente flotante (texto + voz) */
function _asisCobros(q, cb){
  supabaseClient.from('cxc_drog').select('*').eq('empresa','drogueria').eq('estado','activa').then(function(rr){
    window._cxbRows=(rr&&rr.data)||[]; _cxbRows=window._cxbRows;
    var f2=function(n){return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});};
    if(!_cxbRows.length){ cb('No hay deudas activas registradas todavía. Pídele a Mayra que importe el reporte de A2 en el módulo Cobranzas.'); return; }
    var clis=_cxbCli(); var hoy=HOY();
    var norm=function(t){return (''+t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');};
    var m=q.match(/(?:envia|enviale|mandale|cobrale)(?:.*?(?:cobro|cobranza))?\s+a\s+(.+)/);
    if(m){
      var obj=norm(m[1].replace(/[?.!]/g,'').trim());
      var hit=clis.filter(function(c){ return norm(c.nombre).indexOf(obj)>=0; })[0];
      if(hit){ cb('Abriendo WhatsApp con el cobro para '+hit.nombre+', '+f2(hit.usd)+' dólares. Revisa el mensaje y pulsa enviar.'); setTimeout(function(){ _cxbWA(hit.cod); },600); return; }
      cb('No encontré a '+m[1].trim()+' entre los deudores activos. Revisa el nombre en el módulo Cobranzas.'); return;
    }
    var due=clis.filter(function(c){ return (c.prox&&c.prox<=hoy)||(!c.prox&&c.peor>0)||(c.promesa&&c.promesa<hoy); });
    if(!due.length){ cb('Nadie pendiente por cobrar hoy. ¡Buen trabajo!'); return; }
    var tot=due.reduce(function(a,c){return a+c.usd;},0);
    var top=due.slice(0,5).map(function(c){ return c.nombre+' ('+f2(c.usd)+' dólares'+((c.promesa&&c.promesa<hoy)?', promesa incumplida':(', '+c.peor+' días vencida'))+')'; }).join('; ');
    cb('Hoy toca cobrar a '+due.length+' cliente'+(due.length>1?'s':'')+' por un total de '+f2(tot)+' dólares. Principales: '+top+'. Dime «envíale el cobro a» y el nombre, y te abro el WhatsApp con el mensaje listo.');
  });
}
