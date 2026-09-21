function _lpDetalle(id){
  var it=null; for(var i=0;i<_lpItems.length;i++){ if((''+_lpItems[i].id)===(''+id)){ it=_lpItems[i]; break; } } if(!it)return;
  var precio=_lpPrecio(it.precio_usd); var nd=/no dispon/i.test(it.comentario||'')||!(Number(it.precio_usd)>0);
  var m=document.getElementById('lp-modal'); if(!m){ m=document.createElement('div'); m.id='lp-modal'; m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:14px'; m.onclick=function(e){ if(e.target===m)_lpCerrar(); }; document.body.appendChild(m); }
  var row=function(k,v){ return v?('<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted);font-size:12px">'+k+'</span><span style="font-weight:600;font-size:13px;text-align:right">'+esc(v)+'</span></div>'):''; };
  m.innerHTML='<div style="background:var(--surface);width:100%;max-width:440px;border-radius:18px;padding:18px;max-height:85vh;overflow:auto" onclick="event.stopPropagation()">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px"><div style="font-weight:800;font-size:16px;line-height:1.25">'+esc(it.producto||'')+(nd?' <span style="font-size:10px;color:var(--red)">NO DISPONIBLE</span>':'')+'</div><button onclick="_lpCerrar()" style="border:none;background:var(--surface2);border-radius:50%;width:30px;height:30px;font-size:15px;cursor:pointer;flex:none">✕</button></div>'+
    (Number(it.precio_usd)>0?('<div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;background:var(--green);color:#fff;border-radius:12px;padding:12px 14px;text-align:center"><div style="font-size:11px;opacity:.9">Precio de venta</div><div style="font-size:24px;font-weight:800">'+fmt(Math.round(precio))+' Bs</div></div><div style="flex:1;background:#0891b2;color:#fff;border-radius:12px;padding:12px 14px;text-align:center"><div style="font-size:11px;opacity:.9">En dólares</div><div style="font-size:24px;font-weight:800">$ '+_lpF2(_lpPrecioUsd(it.precio_usd))+'</div></div></div>'):('<div style="background:#fee2e2;color:#b91c1c;border-radius:12px;padding:14px;text-align:center;font-weight:800;margin-bottom:12px">No disponible — sin precio en la lista</div>'))+
    (Number(it.precio_usd)>0?('<button onclick="_lpCopiarMsg('+(it.id||0)+')" style="width:100%;margin:0 0 12px;padding:8px;border:1px dashed var(--border);border-radius:10px;background:none;color:var(--muted);font-size:12px;cursor:pointer">Enviar precio por WhatsApp</button>'):'')+
    row('Costo','$'+fmt(it.precio_usd||0))+row('Marca',it.marca)+row('Presentación',it.presentacion)+row('Tipo',it.tipo)+row('Código',it.codigo)+row('Fuente',it.fuente)+
    '</div>';
  m.style.display='flex';
}
/* Mensaje para el cliente desde la lista de precios (igual al de la calculadora) */
function _lpCopiarMsg(id){
  var it=null; for(var i=0;i<_lpItems.length;i++){ if((''+_lpItems[i].id)===(''+id)){ it=_lpItems[i]; break; } }
  if(!it||!(Number(it.precio_usd)>0)){ showToast&&showToast('Este producto no tiene precio'); return; }
  var prod=(it.producto||'').trim()+(it.presentacion?(' '+String(it.presentacion).trim()):'');
  var msg=prod+': Bs '+fmt(Math.round(_lpPrecio(it.precio_usd)))+' y si pagan en d\u00f3lares $ '+_lpF2(_lpPrecioUsd(it.precio_usd))+'.';
  window.open('https://wa.me/584126906199?text='+encodeURIComponent(msg),'_blank');
}
function _lpCerrar(){ var m=document.getElementById('lp-modal'); if(m)m.style.display='none'; }

function _lpBrowse(){ var inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls'; inp.onchange=function(){ var f=inp.files&&inp.files[0]; if(f)_lpLeerExcel(f); }; inp.click(); }
function _lpDrop(e){ e.preventDefault(); var dz=document.getElementById('lp-drop'); if(dz){dz.style.borderColor='var(--border)';dz.style.background='transparent';} var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f)_lpLeerExcel(f); }
/* --- parser flexible --- */
function _lpNorm(v){ return (''+(v==null?'':v)).toUpperCase().trim().replace(/\s+/g,' '); }
function _lpIsNum(v){ if(v==null||v==='')return false; return !isNaN(parseFloat((''+v).replace(',','.'))); }
function _lpNu(v){ if(v==null||v==='')return null; var x=parseFloat((''+v).replace(',','.')); return isNaN(x)?null:x; }
function _lpFindCol(hdr,list){ for(var p=0;p<list.length;p++)for(var j=0;j<hdr.length;j++)if(_lpNorm(hdr[j])===list[p])return j; return -1; }
function _lpFindColC(hdr,subs,avoid){ for(var j=0;j<hdr.length;j++){var c=_lpNorm(hdr[j]);if(avoid&&avoid.test(c))continue;for(var s=0;s<subs.length;s++)if(c.indexOf(subs[s])>=0)return j;} return -1; }
function _lpIsHeader(row){ var hc=false,hp=false; for(var j=0;j<row.length;j++){var c=_lpNorm(row[j]); if(c.indexOf('CODIGO')>=0||c.indexOf('CÓDIGO')>=0||c.indexOf('BARRA')>=0)hc=true; if(c.indexOf('PRECIO')>=0&&c.indexOf('PEDIDO')<0)hp=true;} return hc&&hp; }
function _lpColmap(hdr){ var m={};
  m.cod=_lpFindCol(hdr,['CÓDIGO','CODIGO','CÓDIGO DE BARRA','CODIGO DE BARRA','CÓDIGO BARRA','CODIGO BARRA']); if(m.cod<0)m.cod=_lpFindColC(hdr,['CODIGO','CÓDIGO','BARRA']);
  m.prod=_lpFindCol(hdr,['PRODUCTO','DESCRIPCIÓN','DESCRIPCION']); if(m.prod<0)m.prod=_lpFindColC(hdr,['DESCRIPCI','PRODUCTO']);
  m.marca=_lpFindCol(hdr,['MARCA']);
  m.pres=_lpFindCol(hdr,['PRESENTACIÓN','PRESENTACION','UNIDAD DE MANEJO','UNIDAD MANEJO']); if(m.pres<0)m.pres=_lpFindColC(hdr,['PRESENTAC','UNIDAD DE MANEJO','UNIDAD MANEJO']);
  m.tipo=_lpFindCol(hdr,['TIPO']); m.canal=_lpFindCol(hdr,['CANAL']); m.com=_lpFindCol(hdr,['COMENTARIO']);
  m.precio=_lpFindCol(hdr,['PRECIO UNIDAD DE MANEJO $','PRECIO UNIDAD DE MANEJO','PRECIO UNIDAD MANEJO $','PRECIO UNIDAD MANEJO','PRECIO USD','PRECIO $','PRECIO DISTRIBUIDOR','PRECIO']); if(m.precio<0)m.precio=_lpFindColC(hdr,['PRECIO'],/PEDIDO/);
  return m; }
function _lpParseSheet(rows){ var out=[],m=null,tipo=null;
  for(var i=0;i<rows.length;i++){ var r=rows[i]||[]; var ne=r.map(_lpNorm).filter(function(x){return x!=='';});
    if(_lpIsHeader(r)){ m=_lpColmap(r); continue; }
    if(ne.length<=1){ if(ne.length===1&&!_lpIsNum(ne[0])) tipo=ne[0]; continue; }
    if(!m) continue;
    var prod=m.prod>=0?r[m.prod]:null; var precio=m.precio>=0?_lpNu(r[m.precio]):null;
    if(prod==null||(''+prod).trim()==='')continue; if(precio==null)continue;
    out.push({codigo:(m.cod>=0&&r[m.cod]!=null)?(''+r[m.cod]).trim():null,tipo:(m.tipo>=0&&r[m.tipo]!=null)?(''+r[m.tipo]).trim():tipo,producto:(''+prod).trim(),marca:(m.marca>=0&&r[m.marca]!=null)?(''+r[m.marca]).trim():null,presentacion:(m.pres>=0&&r[m.pres]!=null)?(''+r[m.pres]).trim():null,canal:(m.canal>=0&&r[m.canal]!=null)?(''+r[m.canal]).trim():null,precio_usd:precio,comentario:(m.com>=0&&r[m.com]!=null)?(''+r[m.com]).trim():null});
  } return out; }
function _lpSource(sn,items){ var s=(sn||'').trim();
  if(!s || /^(hoja|sheet)\s*\d*$/i.test(s)){ var cc={},best='',bn=0; items.forEach(function(it){if(it.canal){cc[it.canal]=(cc[it.canal]||0)+1;}}); for(var k in cc){if(cc[k]>bn){bn=cc[k];best=k;}} s=best||s||'PROVEEDOR'; }
  var _su=s.toUpperCase();
  if(/DROGUER|GLOBAL\s*CARE|GLOBALCARE/.test(_su)) return 'GLOBALCARE (BS)'; // la antigua "lista droguerías" ahora es GlobalCare
  return _su; }
function _lpLeerExcel(f){
  if(!window.XLSX){ var pg=document.getElementById('lp-imp-pg'); if(pg)pg.textContent=' cargando lector…'; var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=function(){ _lpLeerExcel(f); }; s.onerror=function(){ showToast('No se pudo cargar el lector de Excel'); }; document.head.appendChild(s); return; }
  var rd=new FileReader();
  rd.onload=function(e){ try{
    var wb=XLSX.read(e.target.result,{type:'array'});
    var all=[], srcs={};
    wb.SheetNames.forEach(function(sn){ var rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null}); var items=_lpParseSheet(rows); if(!items.length)return; var src=_lpSource(sn,items); items.forEach(function(it){ it.fuente=src; }); srcs[src]=(srcs[src]||0)+items.length; all=all.concat(items); });
    if(!all.length){ showToast('No encontré productos en el Excel (revisa encabezados CÓDIGO / PRECIO)'); return; }
    var sk=Object.keys(srcs); var resumen=sk.map(function(s){return s+': '+srcs[s];}).join('  ·  ');
    if(!confirm('Se actualizarán '+all.length+' productos.\n\n'+resumen+'\n\nSe reemplazan SOLO esas fuentes (las demás listas se conservan). ¿Continuar?')) return;
    _lpGuardar(all, sk);
  }catch(err){ showToast('Error leyendo el Excel: '+((err&&err.message)||'')); } };
  rd.readAsArrayBuffer(f);
}
function _lpGuardar(items, sources){
  var pg=document.getElementById('lp-imp-pg'); if(pg)pg.textContent=' guardando '+items.length+'…';
  supabaseClient.from('lista_precios').delete().in('fuente',sources).then(function(d){
    if(d&&d.error){ showToast('Error al limpiar: '+(d.error.message||'')); return; }
    var clean=items.map(function(it){ return {fuente:it.fuente,codigo:it.codigo,tipo:it.tipo,producto:it.producto,marca:it.marca,presentacion:it.presentacion,canal:it.canal,precio_usd:it.precio_usd,comentario:it.comentario}; });
    var _i=0; (function ins(){ var lote=clean.slice(_i,_i+500); if(!lote.length){ showToast('✓ Lista actualizada: '+items.length+' productos'); if(typeof logAudit==='function')logAudit('precios.importar', sources.join(',')+': '+items.length); _lpFuenteSel=''; _lpCargar(); return; }
      supabaseClient.from('lista_precios').insert(lote).then(function(r){ if(r&&r.error){ showToast('Error al guardar: '+(r.error.message||'')); return; } _i+=500; ins(); });
    })();
  });
}

/* ================= Calculadora de precios (costo$ + ganancia, tasa entrada/salida, descuento efectivo) ================= */
var _ccItems=[];
function _ccInp(id){ var e=document.getElementById(id); if(!e)return NaN; return parseFloat(String(e.value).replace(',','.')); }
function _ccUSD(v){ return '$'+(Number(v)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _ccBs(v){ return (Number(v)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' Bs'; }
function _ccPct(v){ return (Number(v)*100).toLocaleString('es-VE',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'; }
function _ccCalc(){ var costo=_ccInp('cc-costo'),gan=_ccInp('cc-gan'),tEnt=_ccInp('cc-tent'),tSal=_ccInp('cc-tsal'); if([costo,gan,tEnt,tSal].some(isNaN)||tEnt===0||tSal===0)return null; var margen=(1+gan/100)/(tEnt/tSal)-1; var usd=costo*(1+margen); var bs=usd*tEnt; var direct=costo*(1+gan/100); var disc=usd!==0?1-(direct/usd):0; return {margen:margen,usd:usd,bs:bs,direct:direct,disc:disc,costo:costo,gan:gan}; }
var _ccMsgTxt='';
function _ccActualizar(){ var r=_ccCalc(); var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  var msgEl=document.getElementById('cc-msg');
  if(!r){ ['cc-rmar','cc-rusd','cc-rbs','cc-rdir','cc-rdis'].forEach(function(i){set(i,'\u2014');}); _ccMsgTxt=''; if(msgEl)msgEl.textContent='Completa costo, ganancia y las dos tasas y aqu\u00ed aparece el mensaje listo para enviar.'; return; }
  set('cc-rmar',_ccPct(r.margen));set('cc-rusd',_ccUSD(r.usd));set('cc-rbs',_ccBs(r.bs));set('cc-rdir',_ccUSD(r.direct));set('cc-rdis',_ccPct(r.disc));
  var nomEl=document.getElementById('cc-nom'); var nom=(nomEl&&nomEl.value.trim())||'';
  var f2=function(v){ return (Number(v)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  _ccMsgTxt=(nom?(nom+': '):'')+'Bs '+f2(r.bs)+' y si pagan en d\u00f3lares $ '+f2(r.direct)+'.';
  if(msgEl)msgEl.textContent=_ccMsgTxt;
}
function _ccCopiarMsg(){
  if(!_ccMsgTxt){ showToast&&showToast('Primero completa el c\u00e1lculo'); return; }
  var done=function(){ showToast&&showToast('\u2713 Mensaje copiado \u2014 p\u00e9galo en WhatsApp'); };
  try{ navigator.clipboard.writeText(_ccMsgTxt).then(done).catch(function(){ _ccCopiarFb(done); }); }
  catch(e){ _ccCopiarFb(done); }
}
function _ccCopiarFb(done){ try{ var t=document.createElement('textarea'); t.value=_ccMsgTxt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); done(); }catch(e){ showToast&&showToast('No se pudo copiar'); } }
function _ccSetSalida(v){ var n=parseFloat(String(v).replace(',','.')); if(isNaN(n)||n<0)n=0; try{ var x=_cxp(); x.tasa_binance=n; if(typeof _cxpSave==='function')_cxpSave(); }catch(e){} _ccActualizar(); }
function _ccAgregar(){ var r=_ccCalc(); var n=document.getElementById('cc-nom'); var nombre=(n&&n.value.trim())||'(sin nombre)'; if(!r){ showToast&&showToast('Completa costo, ganancia y las dos tasas'); return; } var it={nombre:nombre}; for(var k in r)it[k]=r[k]; _ccItems.push(it); if(n)n.value=''; _ccRenderTabla(); }
function _ccEliminar(i){ _ccItems.splice(i,1); _ccRenderTabla(); }
function _ccVaciar(){ if(_ccItems.length&&confirm('¿Vaciar toda la lista?')){ _ccItems=[]; _ccRenderTabla(); } }
function _ccExport(){ if(!_ccItems.length){ showToast&&showToast('No hay productos para exportar'); return; } var head=['Producto','Costo USD','Ganancia %','Margen %','Precio sugerido USD','Precio sugerido Bs','Precio directo USD (efectivo)','Descuento %']; var rows=_ccItems.map(function(it){ return [it.nombre,it.costo,it.gan,(it.margen*100).toFixed(2),it.usd.toFixed(2),it.bs.toFixed(2),it.direct.toFixed(2),(it.disc*100).toFixed(2)]; }); var csv=[head].concat(rows).map(function(r){ return r.map(function(c){ var s=String(c); return /[",;\n]/.test(s)?('"'+s.replace(/"/g,'""')+'"'):s; }).join(','); }).join('\n'); var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='precios_claret_'+((typeof HOY==='function')?HOY():'')+'.csv'; a.click(); if(typeof logAudit==='function')logAudit('compras.calc','Export CSV: '+_ccItems.length); }
function _ccRender(){
  var b=document.getElementById('ci-body'); if(!b)return;
  var t=0; try{ t=getTasa()||0; }catch(e){}
  var tb=0; try{ tb=(typeof _calTasaBinance==='function'?_calTasaBinance():0)||0; }catch(e){}
  var lab='display:block;font-size:11px;color:var(--muted);margin-bottom:4px;font-weight:600';
  var inp='width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:15px;outline:none';
  var res=function(k,id,cls){ return '<div class="tbox" style="padding:11px 13px;border-radius:11px"><div style="font-size:10.5px;color:var(--muted);margin-bottom:3px">'+k+'</div><div id="'+id+'" style="font-size:19px;font-weight:800;'+(cls||'')+'">—</div></div>'; };
  b.innerHTML='<style>@media(max-width:480px){#ci-body .cc-g2{grid-template-columns:1fr!important}}</style><div style="max-width:920px">'+
    '<div style="display:flex;align-items:center;gap:13px;margin-bottom:14px">'+
      '<div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#3ba7ff,#6366f1);display:grid;place-items:center;font-size:23px;flex:none;box-shadow:0 5px 16px rgba(59,167,255,.35)">🧮</div>'+
      '<div><div style="font-weight:800;font-size:17px;line-height:1.15">Calculadora de precios</div><div style="font-size:12px;color:var(--muted)">Precio en Bs, precio en $ y descuento por pago en efectivo (dólares).</div></div>'+
    '</div>'+
    '<div class="tbox" style="padding:16px;border-radius:14px;margin-bottom:14px">'+
      '<div style="margin-bottom:12px"><label style="'+lab+'">Producto</label><input id="cc-nom" type="text" placeholder="Ej. Atamel" oninput="_ccActualizar()" style="'+inp+'"></div>'+
      '<div class="cc-g2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'+
        '<div><label style="'+lab+'">Costo (USD)</label><input id="cc-costo" type="number" inputmode="decimal" placeholder="200" oninput="_ccActualizar()" style="'+inp+'"></div>'+
        '<div><label style="'+lab+'">Ganancia deseada (%)</label><input id="cc-gan" type="number" inputmode="decimal" placeholder="30" value="30" oninput="_ccActualizar()" style="'+inp+'"></div>'+
      '</div>'+
      '<div class="cc-g2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'+
        '<div><label style="'+lab+'">Tasa entrada (BCV)</label><input id="cc-tent" type="number" inputmode="decimal" placeholder="670"'+(t>0?(' value="'+t+'"'):'')+' oninput="_ccActualizar()" style="'+inp+'"></div>'+
        '<div><label style="'+lab+'">Tasa salida (Binance)</label><input id="cc-tsal" type="number" inputmode="decimal" placeholder="Ponla 1 vez"'+(tb>0?(' value="'+tb+'"'):'')+' oninput="_ccActualizar()" onchange="_ccSetSalida(this.value)" style="'+inp+'"><div style="font-size:9px;color:var(--muted);margin-top:2px">Binance · se guarda; actual\u00edzala 1 vez al d\u00eda</div></div>'+
      '</div>'+
      '<div class="cc-g2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
        res('Margen necesario','cc-rmar')+res('Precio sugerido (USD)','cc-rusd','color:#3ba7ff')+
        '<div style="grid-column:1/-1">'+res('Precio sugerido en Bs','cc-rbs','color:var(--amber)')+'</div>'+
        res('Precio directo en $ (efectivo)','cc-rdir','color:var(--green)')+res('Descuento por pago en $','cc-rdis','color:var(--red)')+
      '</div>'+
      '<div class="tbox" style="margin-top:12px;padding:13px;border-radius:12px;background:var(--surface2)">'+
        '<div style="font-size:10.5px;color:var(--muted);font-weight:700;margin-bottom:5px">MENSAJE PARA EL CLIENTE \u00b7 se llena solo con cada c\u00e1lculo</div>'+
        '<div id="cc-msg" style="font-size:13.5px;line-height:1.55;white-space:pre-wrap;font-weight:600">Completa costo, ganancia y las dos tasas y aqu\u00ed aparece el mensaje listo para enviar.</div>'+
        '<button class="btn btn-accent" style="width:100%;margin-top:10px" onclick="_ccCopiarMsg()">Copiar mensaje</button>'+
      '</div>'+
      '<div style="font-size:11px;color:var(--muted);margin-top:9px;line-height:1.5">La <b>tasa entrada</b> es a la que valoras/compras el inventario; la <b>tasa salida</b> es a la que vendes en Bs. El precio en $ efectivo usa solo tu ganancia deseada (sin ajuste cambiario), por eso es más barato — ese ahorro es el descuento.</div>'+
    '</div>'+
    '</div>';
  _ccActualizar();
}
function _ccRenderTabla(){
  var el=document.getElementById('cc-tabla'); if(!el)return;
  if(!_ccItems.length){ el.innerHTML='<div class="tbox" style="padding:22px;text-align:center;color:var(--muted);border-radius:12px;font-size:13px">Aún no has agregado productos.</div>'; return; }
  var h='<div class="tbox" style="padding:0;border-radius:14px;overflow:hidden"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px;white-space:nowrap">'+
    '<tr style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.4px"><th style="text-align:left;padding:8px 12px">Producto</th><th style="text-align:right;padding:8px">Costo $</th><th style="text-align:right;padding:8px">Gan.</th><th style="text-align:right;padding:8px">Precio $</th><th style="text-align:right;padding:8px">Precio Bs</th><th style="text-align:right;padding:8px">$ efectivo</th><th style="text-align:right;padding:8px">Desc.</th><th style="padding:8px"></th></tr>';
  _ccItems.forEach(function(it,i){
    h+='<tr style="border-top:1px solid var(--border)"><td style="padding:8px 12px;font-weight:600;white-space:normal">'+esc(it.nombre)+'</td>'+
      '<td style="text-align:right;color:var(--muted)">'+_ccUSD(it.costo)+'</td><td style="text-align:right;color:var(--muted)">'+it.gan+'%</td>'+
      '<td style="text-align:right;color:#3ba7ff;font-weight:700">'+_ccUSD(it.usd)+'</td>'+
      '<td style="text-align:right;color:var(--amber);font-weight:700">'+_ccBs(it.bs)+'</td>'+
      '<td style="text-align:right;color:var(--green)">'+_ccUSD(it.direct)+'</td>'+
      '<td style="text-align:right;color:var(--red)">'+_ccPct(it.disc)+'</td>'+
      '<td style="text-align:center"><button onclick="_ccEliminar('+i+')" style="border:none;background:none;color:var(--red);cursor:pointer;font-size:15px">✕</button></td></tr>';
  });
  h+='</table></div></div>';
  el.innerHTML=h;
}
function renderCompras(){
  var el=document.getElementById('compras-content'); if(!el) return;
  var _cp=function(k){ return (typeof puedePerm!=='function')||puedePerm('comp',k); };
  var _vis={falta:false,pedido:false,armar:false,inv:true,precios:_cp('precios'),calc:_cp('calc'),esencial:true};
  var _ord=['inv','precios','calc','esencial'];
  if(!_vis[_ciVista]){ _ciVista=_ord.filter(function(v){return _vis[v];})[0]||'falta'; }
  var _ch='';
  if(_vis.falta) _ch+='<button class="fchip'+(_ciVista==='falta'?' active':'')+'" onclick="_ciSetVista(\'falta\')">Qué pedir</button>';
  if(_vis.pedido) _ch+='<button class="fchip'+(_ciVista==='pedido'?' active':'')+'" onclick="_ciSetVista(\'pedido\')">Pedido'+(_ciPedN()?(' ('+_ciPedN()+')'):'')+'</button>';
  if(_vis.armar) _ch+='<button class="fchip'+(_ciVista==='armar'?' active':'')+'" onclick="_ciSetVista(\'armar\')">🧾 Armar pedido</button>';
  if(_vis.inv) _ch+='<button class="fchip'+(_ciVista==='inv'?' active':'')+'" onclick="_ciSetVista(\'inv\')">📦 Inventario</button>';
  if(_vis.precios) _ch+='<button class="fchip'+(_ciVista==='precios'?' active':'')+'" onclick="_ciSetVista(\'precios\')">💲 Precios</button>';
  if(_vis.calc) _ch+='<button class="fchip'+(_ciVista==='calc'?' active':'')+'" onclick="_ciSetVista(\'calc\')">🧮 Calculadora</button>';
  _ch+='<button class="fchip'+(_ciVista==='esencial'?' active':'')+'" onclick="_ciSetVista(\'esencial\')">🤝 Pronto Pago</button>';
  el.innerHTML='<p class="section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg> Compras</p>'+
    '<div class="fchips" style="margin-bottom:14px">'+_ch+'</div>'+
    '<div id="ci-body"></div>';
  if(_ciVista==='armar'){ _apRender(); return; } if(_ciVista==='inv'){ _ivRender(); return; } if(_ciVista==='precios'){ _lpCargar(); return; } if(_ciVista==='calc'){ _ccRender(); return; } if(_ciVista==='esencial'){ _ceCargar(); return; }
  _ciCargar();
}
function _ciSetVista(v){ _ciVista=v; renderCompras(); }
function _ciCargar(force){
  if(!force && _ciLoaded && _ciProd.length){ if(_ciVista==='pedido') _ciVistaPedido(); else _ciVistaFalta(); return; }
  var b=document.getElementById('ci-body'); if(b) b.innerHTML='<div style="padding:28px;text-align:center;color:var(--muted);font-size:13px">Cargando productos…</div>';
  var cols='codigo,descripcion,clase,abc,xyz,prom_mensual,desv_mensual,existencia_actual,empaque,costo';
  var reqs=[supabaseClient.from('compras_parametros').select('*').eq('id',1).maybeSingle()];
  for(var i=0;i<8;i++){ reqs.push(supabaseClient.from('productos').select(cols).order('codigo').range(i*1000,i*1000+999)); }
  Promise.all(reqs).then(function(all){
    if(all[0]&&all[0].data) _ciParams=all[0].data;
    var acc=[], err=null;
    for(var k=1;k<all.length;k++){ var res=all[k]; if(res&&res.error){ err=res.error; continue; } acc=acc.concat(res.data||[]); }
    if(err && !acc.length){ if(b) b.innerHTML='<span style="color:var(--red)">No se pudo cargar: '+esc(err.message||'')+'</span>'; return; }
    _ciProd=acc; _ciLoaded=true;
    if(_ciVista==='pedido') _ciVistaPedido(); else _ciVistaFalta();
  }).catch(function(){ if(b) b.innerHTML='<span style="color:var(--red)">No se pudo cargar.</span>'; });
}
function _ciScard(lbl,val,col,bord){ return '<div class="scard" style="border-left:4px solid '+bord+';padding:13px 15px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600">'+lbl+'</div><div style="font-size:23px;font-weight:800;color:'+col+';margin-top:2px">'+val+'</div></div>'; }
function _ciVistaFalta(){
  var b=document.getElementById('ci-body'); if(!b) return;
  if(!_ciProd.length){ b.innerHTML='<div class="tbox" style="text-align:center;padding:30px 16px;color:var(--muted);font-size:13px">Aún no hay productos cargados.<br>Usa <strong>Actualizar catálogo</strong> abajo.</div>'+_ciImpBtn(); return; }
  var comprar=_ciProd.map(_ciCalc).filter(function(c){return c.accion==='COMPRAR YA';}).length;
  var enped=Object.keys(_ciPedido).filter(function(k){return (_ciPedido[k].cantidad||0)>0;}).length;
  var f=_ciFiltro;
  function chip(v,lbl,act){ return '<button class="fchip'+(act?' active':'')+'" onclick="_ciSetF(\'accion\',\''+v+'\')">'+lbl+'</button>'; }
  b.innerHTML=_ciXlsCss()+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">'+
      '<div style="font-size:13px;color:var(--muted)">🔴 <b style="color:var(--red)">'+comprar+'</b> por comprar · '+_ciProd.length+' en total</div>'+
      '<button class="btn btn-accent btn-sm" onclick="_ciSetVista(\'pedido\')">🧾 Ver pedido (<span id="ci-pedcount">'+enped+'</span>)</button>'+
    '</div>'+
    '<div style="position:relative;margin-bottom:10px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:11px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'+
      '<input type="text" id="ci-q" placeholder="Buscar medicamento o código…" value="'+esc(f.q)+'" oninput="_ciFiltro.q=this.value;_ciRenderList()" style="width:100%;box-sizing:border-box;padding:10px 12px 10px 36px;font-size:14px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text)"></div>'+
    '<div class="fchips" style="margin-bottom:10px">'+chip('COMPRAR YA','Solo lo que falta',f.accion==='COMPRAR YA')+chip('','Todos',f.accion==='')+'</div>'+
    '<div id="ci-list"></div>'+_ciImpBtn();
  _ciRenderList();
}
function _ciImpBtn(){ return '<div style="margin-top:16px;text-align:center"><button class="btn btn-ghost btn-sm" onclick="_ciImportar()" style="font-size:11px;color:var(--muted)">↻ Actualizar catálogo (importar Excel ABC-XYZ)</button> <span id="ci-impmsg" style="font-size:11px;color:var(--muted)"></span></div>'; }
function _ciSetF(t,v){ if(t==='accion'){_ciFiltro.accion=v;} else if(t==='abc'){_ciFiltro.abc=(_ciFiltro.abc===v?'':v);} else if(t==='xyz'){_ciFiltro.xyz=(_ciFiltro.xyz===v?'':v);} _ciVistaFalta(); }
function _ciXlsCss(){ return '<style>.ci-xls{width:100%;border-collapse:collapse;font-size:12.5px}.ci-xls th{background:var(--surface2);color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.4px;font-weight:700;padding:7px 8px;border:1px solid var(--border);text-align:left}.ci-xls td{border:1px solid var(--border);padding:6px 8px;vertical-align:middle}.ci-xls tbody tr:nth-child(even) td{background:rgba(127,127,127,.045)}.ci-xls .num{text-align:right;font-variant-numeric:tabular-nums}.ci-xls .sug{text-align:right;color:var(--accent);font-weight:700;cursor:pointer}.ci-xls input.ped{width:64px;text-align:right;padding:5px 6px;border:1.5px solid var(--accent);border-radius:6px;background:var(--surface);color:var(--text);font-size:13px;font-weight:700}.ci-xls tr.urge td:first-child{border-left:3px solid var(--red)}</style>'; }
function _ciRenderList(){
  var l=document.getElementById('ci-list'); if(!l) return;
  var q=(_ciFiltro.q||'').toLowerCase(); var buscando=q.length>0;
  var arr=_ciProd.map(function(p){ return {p:p,c:_ciCalc(p)}; }).filter(function(x){
    if(buscando){ var s=((x.p.descripcion||'')+' '+(x.p.codigo||'')).toLowerCase(); return s.indexOf(q)>=0; }
    if(_ciFiltro.accion==='COMPRAR YA' && x.c.accion!=='COMPRAR YA') return false;
    return true;
  });
  var orden={A:0,B:1,C:2};
  arr.sort(function(a,b){ var ap=a.c.accion==='COMPRAR YA'?0:1,bp=b.c.accion==='COMPRAR YA'?0:1; if(ap!==bp)return ap-bp;
    var ac=orden[(a.p.clase||'')[0]]!=null?orden[(a.p.clase||'')[0]]:9,bc=orden[(b.p.clase||'')[0]]!=null?orden[(b.p.clase||'')[0]]:9; if(ac!==bc)return ac-bc;
    return b.c.pedir-a.c.pedir; });
  var tot=arr.length,lim=buscando?80:150,slice=arr.slice(0,lim);
  if(!slice.length){ l.innerHTML='<div style="color:var(--muted);font-size:13px;padding:16px;text-align:center">Sin resultados.</div>'; return; }
  var body=slice.map(function(x){ return _ciRow(x.p,x.c); }).join('');
  l.innerHTML='<div style="overflow-x:auto"><table class="ci-xls"><thead><tr><th>Medicamento</th><th style="text-align:right">Existencia</th><th style="text-align:right">Sugerido</th><th style="text-align:right">Pedir</th></tr></thead><tbody>'+body+'</tbody></table></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:8px">'+tot+' producto'+(tot!==1?'s':'')+(tot>lim?(' · mostrando '+lim+', afina la búsqueda'):'')+'. Escribe la cantidad en <b>Pedir</b> o toca el número <b style="color:var(--accent)">Sugerido</b> para copiarlo.</div>';
}
function _ciRow(p,c){
  var cod=p.codigo; var urge=c.accion==='COMPRAR YA';
  var cur=(_ciPedido[cod]&&_ciPedido[cod].cantidad>0)?_ciPedido[cod].cantidad:'';
  return '<tr'+(urge?' class="urge"':'')+'>'+
    '<td><div style="font-weight:600;line-height:1.2">'+esc(p.descripcion||cod)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(cod)+'</div></td>'+
    '<td class="num"'+(c.stock<c.minimo?' style="color:var(--red);font-weight:700"':'')+'>'+c.stock+'</td>'+
    '<td class="sug" onclick="_ciFillSug(this,\''+_cEsc(cod)+'\','+c.pedir+')" title="Tocar para usar el sugerido">'+c.pedir+'</td>'+
    '<td class="num"><input class="ped" type="number" min="0" inputmode="numeric" placeholder="'+c.pedir+'" value="'+cur+'" onchange="_ciSetQty(\''+_cEsc(cod)+'\',this.value)"></td>'+
  '</tr>';
}
function _ciFillSug(el,cod,sug){ var tr=el.parentNode; var inp=tr.querySelector('input.ped'); if(inp){ inp.value=sug; } _ciSetQty(cod,sug); }
function _ciSetQty(cod,v){ v=parseInt(v)||0; var p=_ciProd.find(function(x){return x.codigo===cod;});
  if(v>0){ _ciPedido[cod]={nombre:(p&&p.descripcion)||cod, cantidad:v, costo:(p&&Number(p.costo))||0}; } else { delete _ciPedido[cod]; }
  _ciPedSave(); var el=document.getElementById('ci-pedcount'); if(el) el.textContent=Object.keys(_ciPedido).filter(function(k){return (_ciPedido[k].cantidad||0)>0;}).length;
}
function _ciChip(lbl,val,col){ return '<span style="font-size:11px;color:var(--muted);background:var(--surface2);border-radius:6px;padding:2px 8px;white-space:nowrap">'+lbl+' <strong style="color:'+(col||'var(--text)')+'">'+val+'</strong></span>'; }
function _ciFila(p,c){
  var urge=c.accion==='COMPRAR YA';
  var acc=urge?'var(--red)':(c.accion==='OK'?'var(--green)':'var(--amber)');
  var enped=!!(_ciPedido[p.codigo]&&_ciPedido[p.codigo].cantidad>0);
  var derecha = urge
    ? '<div style="flex-shrink:0;text-align:right"><div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;font-weight:600">Pedir</div><div style="font-size:20px;font-weight:800;color:var(--red);line-height:1">'+c.pedir+'</div></div>'
    : '<span style="flex-shrink:0;font-size:11px;color:var(--green);font-weight:700;align-self:center">OK</span>';
  return '<div class="tbox" style="margin-bottom:8px;padding:11px 13px;border-left:4px solid '+acc+'">'+
    '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">'+
      '<div style="min-width:0;flex:1"><div style="font-weight:600;font-size:13px;line-height:1.25">'+esc(p.descripcion||p.codigo)+'</div>'+
      '<div style="font-size:10.5px;color:var(--muted);margin-top:2px">'+_ciClaseBadge(p.clase)+' &nbsp;'+esc(p.codigo)+'</div></div>'+ derecha +
    '</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'+
      _ciChip('Stock',c.stock,c.stock<c.minimo?'var(--red)':'var(--text)')+_ciChip('Mín',c.minimo)+_ciChip('Máx',c.maximo)+
      '<span style="font-size:10.5px;color:var(--muted);flex:1">'+_ciMotivo(p,c)+'</span>'+
      '<button class="btn btn-sm '+(enped?'btn-ghost':'btn-accent')+'" style="font-size:11px;padding:3px 9px" onclick="_ciAdd(\''+_cEsc(p.codigo)+'\')">'+(enped?'✓ En pedido':'+ Pedido')+'</button>'+
    '</div>'+
  '</div>';
}
function _cEsc(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function _ciAdd(cod){ var p=_ciProd.find(function(x){return x.codigo===cod;}); if(!p) return; var c=_ciCalc(p);
  if(_ciPedido[cod]&&_ciPedido[cod].cantidad>0){ delete _ciPedido[cod]; }
  else { _ciPedido[cod]={nombre:p.descripcion||cod, cantidad:(c.pedir>0?c.pedir:(c.maximo||1)), costo:Number(p.costo)||0}; }
  _ciPedSave(); renderCompras();
}
function _ciVistaPedido(){
  var b=document.getElementById('ci-body'); if(!b) return;
  var keys=Object.keys(_ciPedido).filter(function(k){return (_ciPedido[k].cantidad||0)>0;});
  if(!keys.length){ b.innerHTML='<div class="tbox" style="text-align:center;padding:34px 16px;color:var(--muted)"><div style="font-size:34px;opacity:.4;margin-bottom:8px">🧾</div><div style="font-size:13px">Tu pedido está vacío.<br>En <strong>Qué pedir</strong> o <strong>Armar pedido</strong> escribe las cantidades y aparecerán aquí.</div></div>'; return; }
  var hayCosto=keys.some(function(k){return (_ciPedido[k].costo||0)>0;});
  var total=keys.reduce(function(a,k){return a+(_ciPedido[k].costo||0)*(_ciPedido[k].cantidad||0);},0);
  var rows=keys.map(function(k){ var it=_ciPedido[k];
    return '<tr><td><div style="font-weight:600;line-height:1.2">'+esc(it.nombre)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(k)+(it.costo?(' · costo '+fmt(it.costo,2)):'')+'</div></td>'+
      '<td class="num"><input class="ped" type="number" min="0" value="'+(it.cantidad||0)+'" onchange="_ciQty(\''+_cEsc(k)+'\',this.value)"></td>'+
      '<td style="text-align:center"><button onclick="_ciQty(\''+_cEsc(k)+'\',0)" title="Quitar" style="border:none;background:none;color:var(--red);cursor:pointer;font-size:15px;font-weight:700;line-height:1">✕</button></td></tr>'; }).join('');
  b.innerHTML=_ciXlsCss()+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">'+
      '<div style="font-weight:700;font-size:14px">'+keys.length+' producto'+(keys.length!==1?'s':'')+' en el pedido</div>'+
      '<div style="display:flex;gap:8px"><button class="btn btn-accent btn-sm" onclick="_ciImprimir()">📄 Generar orden</button><button class="btn btn-ghost btn-sm" onclick="_ciVaciar()">Vaciar</button></div>'+
    '</div>'+
    '<div style="overflow-x:auto"><table class="ci-xls"><thead><tr><th>Medicamento</th><th style="text-align:right">Cantidad</th><th style="text-align:center;width:44px">Quitar</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    (hayCosto?('<div class="tbox" style="margin-top:10px;padding:12px;text-align:right;font-size:14px;font-weight:700">Total estimado: '+fmt(total,2)+'</div>'):'<div style="font-size:11px;color:var(--muted);margin-top:8px">El total y el proveedor aparecerán cuando A2 envíe el costo y el proveedor de cada producto.</div>');
}
function _ciQty(k,v){ v=parseInt(v)||0; if(v<=0){ delete _ciPedido[k]; } else { _ciPedido[k].cantidad=v; } _ciPedSave(); _ciVistaPedido(); _ciActualizarToggle(); }
function _ciActualizarToggle(){ var t=document.querySelector('#compras-content .fchips'); /* re-render para actualizar contador */ }
function _ciVaciar(){ if(!confirm('¿Vaciar el pedido?')) return; _ciPedido={}; _ciPedSave(); renderCompras(); }
function _ciImprimir(){
  var keys=Object.keys(_ciPedido).filter(function(k){return (_ciPedido[k].cantidad||0)>0;});
  if(!keys.length){ showToast('El pedido está vacío.'); return; }
  var hayCosto=keys.some(function(k){return (_ciPedido[k].costo||0)>0;});
  var total=0;
  var filas=keys.map(function(k){ var it=_ciPedido[k]; var lt=(it.costo||0)*(it.cantidad||0); total+=lt;
    return '<tr><td>'+esc(k)+'</td><td>'+esc(it.nombre)+'</td><td class="r">'+(it.cantidad||0)+'</td>'+(hayCosto?('<td class="r">'+(it.costo?fmt(it.costo,2):'')+'</td><td class="r">'+(it.costo?fmt(lt,2):'')+'</td>'):'')+'</tr>'; }).join('');
  var emp=(typeof EMPRESA!=='undefined'&&EMPRESA==='drogueria')?'Droguería Clínica':'Farmacia Claret';
  var doc='<html><head><meta charset="utf-8"><title>Orden de compra</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:26px;color:#1e293b}h1{font-size:17px;margin:0;color:#1E38A6}.sub{font-size:12px;color:#64748b;margin:3px 0 14px}table{width:100%;border-collapse:collapse;font-size:11.5px}th,td{border:1px solid #cbd5e1;padding:5px 8px;text-align:left}th{background:#1E38A6;color:#fff}.r{text-align:right}tfoot td{font-weight:700}</style></head><body>'+
    '<h1>'+emp+' — Orden de compra</h1><div class="sub">'+new Date().toLocaleDateString()+' &middot; '+keys.length+' productos &middot; borrador (formato ajustable)</div>'+
    '<table><thead><tr><th>Código</th><th>Producto</th><th class="r">Cantidad</th>'+(hayCosto?'<th class="r">Costo</th><th class="r">Total</th>':'')+'</tr></thead><tbody>'+filas+'</tbody>'+
    (hayCosto?('<tfoot><tr><td colspan="4" class="r">TOTAL</td><td class="r">'+fmt(total,2)+'</td></tr></tfoot>'):'')+'</table></body></html>';
  var ifr=document.createElement('iframe'); ifr.style.position='fixed'; ifr.style.right='0'; ifr.style.bottom='0'; ifr.style.width='0'; ifr.style.height='0'; ifr.style.border='0';
  document.body.appendChild(ifr); var d=ifr.contentWindow.document; d.open(); d.write(doc); d.close();
  setTimeout(function(){ try{ifr.contentWindow.focus(); ifr.contentWindow.print();}catch(e){} setTimeout(function(){ try{document.body.removeChild(ifr);}catch(e){} },1500); },400);
  if(typeof logAudit==='function') logAudit('compras.orden','Orden generada: '+keys.length+' productos');
}
function _ciImportar(){ var inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls'; inp.onchange=function(){ var f=inp.files&&inp.files[0]; if(!f) return; _ciCargarSheetJS(function(ok){ if(!ok){ _ciMsg('No se pudo cargar el lector de Excel.'); return;} _ciLeerExcel(f);}); }; inp.click(); }
function _ciCargarSheetJS(cb){ if(window.XLSX) return cb(true); var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=function(){cb(!!window.XLSX);}; s.onerror=function(){cb(false);}; document.head.appendChild(s); }
function _ciMsg(t){ var e=document.getElementById('ci-impmsg'); if(e) e.textContent=t; }
function _ciLeerExcel(f){
  _ciMsg('Leyendo…'); var r=new FileReader();
  r.onload=function(){ try{
    var wb=XLSX.read(new Uint8Array(r.result),{type:'array'}); var ws=wb.Sheets['ABC-XYZ']||wb.Sheets[wb.SheetNames[0]];
    var rows=XLSX.utils.sheet_to_json(ws,{header:1}); var hdr=rows[0].map(function(h){return String(h||'').trim();});
    function col(n){return hdr.indexOf(n);}
    var iC=col('Código'),iD=col('Descripción'),iCl=col('Clase'),iF=col('Facturación Bs'),iPM=col('Prom/mes'),iDM=col('Desv. mens.'),iST=col('Stock actual');
    if(iC<0||iPM<0){ _ciMsg('El Excel no tiene las columnas esperadas.'); return; }
    var data=[];
    for(var k=1;k<rows.length;k++){ var R=rows[k]; if(!R||R[iC]==null||R[iC]==='') continue;
      var cl=R[iCl]||null;
      data.push({ codigo:String(R[iC]), descripcion:iD>=0&&R[iD]!=null?String(R[iD]):null, clase:cl, abc:cl?String(cl)[0]:null, xyz:cl?String(cl).slice(1):null,
        facturacion:iF>=0?(Number(R[iF])||0):0, prom_mensual:Number(R[iPM])||0, desv_mensual:Number(R[iDM])||0, existencia_actual:iST>=0?(Number(R[iST])||0):0, actualizado_en:new Date().toISOString() }); }
    if(!data.length){ _ciMsg('No encontré filas.'); return; }
    _ciSubir(data,0);
  }catch(e){ _ciMsg('Error leyendo el Excel: '+(e.message||e)); } };
  r.readAsArrayBuffer(f);
}
function _ciSubir(data,desde){
  var lote=500, parte=data.slice(desde,desde+lote);
  if(!parte.length){ _ciMsg('✓ '+data.length+' productos actualizados.'); if(typeof logAudit==='function') logAudit('compras.importar','ABC-XYZ: '+data.length); _ciCargar(true); return; }
  _ciMsg('Subiendo '+Math.min(desde+lote,data.length)+' / '+data.length+'…');
  supabaseClient.from('productos').upsert(parte,{onConflict:'codigo'}).then(function(res){ if(res&&res.error){ _ciMsg('Error: '+(res.error.message||'')); return; } _ciSubir(data,desde+lote); }).catch(function(){ _ciMsg('Error de red.'); });
}





function _nomCard(title,mensual,venta){
  var pct=venta>0?(mensual/venta*100):null;
  var col=pct===null?'var(--muted)':(pct>35?'var(--red)':(pct>22?'var(--amber)':'var(--green)'));
  return '<div class="tbox" style="padding:12px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+title+'</div><div style="font-size:20px;font-weight:700;margin-top:4px">$'+_nomFmt(mensual)+'<span style="font-size:11px;color:var(--muted);font-weight:500"> /mes</span></div><div style="font-size:12px;margin-top:3px;color:'+col+';font-weight:600">'+(pct===null?'sin ventas':(pct.toFixed(1)+'% de ventas'))+'</div></div>';
}





var PERM_DEF = {
  compras:{compras:1,planpagos:0,reto:0,consumo:1,anomalias:0,yapague:0},
  gerente:{panel:0,bancos:0,prestamos:0,prest_resumen:1,facturas:0,historial:0,ines:0,gerencia:1,cxc:0,conta:0,cxp:0,turnos:0,nomina:0,fact:0,prest_cuotas:0,prest_historial:0,ia:0,planpagos:0,reto:1,anomalias:1,yapague:0,consumo:1,desempeno:1,vacaciones:1,almacen:1,reparto:1},
  mayra:  {panel:1,bancos:1,prestamos:1,prest_resumen:1,facturas:1,historial:1,ines:1,gerencia:0,cxc:1,conta:1,cxp:1,turnos:0,nomina:0,fact:0,prest_cuotas:1,prest_historial:1,ia:0,planpagos:0,reto:1,yapague:1,anomalias:0,consumo:1},
  grismar:{panel:1,bancos:1,prestamos:1,prest_resumen:0,facturas:1,historial:1,ines:1,gerencia:0,cxc:0,conta:0,cxp:0,turnos:0,nomina:0,fact:1,prest_cuotas:0,prest_historial:0,ia:0,planpagos:0,reto:0},
  ines:   {panel:0,bancos:0,prestamos:0,prest_resumen:0,facturas:0,historial:0,ines:1,gerencia:0,cxc:1,conta:0,cxp:0,turnos:0,nomina:0,fact:0,prest_cuotas:0,prest_historial:0,ia:0,planpagos:0,reto:0,concilcajas:1},
  angelica:{panel:0,bancos:0,prestamos:0,prest_resumen:0,facturas:0,historial:0,ines:0,gerencia:0,cxc:0,conta:0,cxp:0,turnos:1,nomina:0,fact:0,prest_cuotas:0,prest_historial:0,ia:0,planpagos:0,reto:1,yapague:1,anomalias:0},
  supervisor:{panel:0,bancos:0,prestamos:0,prest_resumen:0,facturas:0,historial:0,ines:0,gerencia:0,cxc:0,conta:0,cxp:0,turnos:1,nomina:0,fact:0,prest_cuotas:0,prest_historial:0,ia:0,planpagos:0,reto:1,yapague:1,anomalias:0},
  reto:{panel:0,bancos:0,prestamos:0,prest_resumen:0,facturas:0,historial:0,ines:0,gerencia:0,cxc:0,conta:0,cxp:0,turnos:0,nomina:0,fact:0,prest_cuotas:0,prest_historial:0,ia:0,planpagos:0,reto:1,cierre:0,mensajes:0,compras:0,anomalias:1,yapague:0},
  ventas:{hud:0,vencimientos:0,mensajes:1,compras:0,reto:0,panel:0,bancos:0,prestamos:0,facturas:0,historial:0,turnos:0,nomina:0,gerencia:0,cxc:0,conta:0,cxp:0,planpagos:0,prest_resumen:0,ines:0},
  veronica:{hud:0,vencimientos:0,mensajes:0,compras:0,reto:0,panel:0,bancos:0,prestamos:0,facturas:0,historial:0,turnos:0,vales:1,rrhh:1,gerencia:0,cxc:0,conta:0,cxp:0,planpagos:0,prest_resumen:0,ines:0,desempeno:1,vacaciones:1},
  yapague:{hud:1,vencimientos:0,mensajes:0,compras:0,reto:0,panel:0,bancos:0,prestamos:0,facturas:0,historial:0,turnos:0,vales:0,rrhh:0,gerencia:0,cxc:0,conta:0,cxp:0,planpagos:0,prest_resumen:0,ines:0,yapague:1,anomalias:0}
};
var _perms = null;
var PERM_ROLES = ['gerente','mayra','grismar','ines','angelica','supervisor','reto','compras','ventas','veronica','yapague'];
var ROLE_LABELS = { admin:'Administrador (acceso total)', gerente:'Gerente', supervisor:'Supervisor (Cajas)', reto:'Supervisor del Reto', compras:'Compras', ventas:'Ventas (Droguería/Farmacia)', mayra:'Administracion / Contabilidad', grismar:'Facturacion / Caja', ines:'Verificacion de cobros', angelica:'Supervisora de turnos', veronica:'Nómina / Vales (Verónica)', yapague:'Ya Pagué (María Inés)' };
