function _ciPedN(){ return Object.keys(_ciPedido).filter(function(k){return (_ciPedido[k].cantidad||0)>0;}).length; }
function _ciCalc(p){
  var prom=Number(p.prom_mensual)||0, desv=Number(p.desv_mensual)||0;
  var lt=Number(p.lead_time)|| _ciParams.lead_time_default || 4;
  var z=_ciParams.nivel_servicio_z, cob=_ciParams.cobertura_objetivo_dias;
  var dd=prom/30, safety=z*desv*Math.sqrt(lt/30);
  var minimo=Math.round(dd*lt+safety), maximo=Math.round(dd*(lt+cob)+safety);
  var st=Number(p.existencia_actual)||0;
  var pedir=Math.max(0,maximo-st); if(p.empaque&&p.empaque>1) pedir=Math.ceil(pedir/p.empaque)*p.empaque;
  var accion = st<minimo ? 'COMPRAR YA' : (p.clase==='CZ' ? 'Revisar / dejar de comprar' : 'OK');
  return {minimo:minimo,maximo:maximo,pedir:pedir,accion:accion,stock:st,prom:prom};
}
function _ciMotivo(p,c){ return 'Vende ~'+Math.round(c.prom)+'/mes &middot; tienes '+c.stock+' &middot; mínimo '+c.minimo; }
function _ciClaseBadge(cl){ var a=(cl||'')[0]; var col=a==='A'?'badge-red':(a==='B'?'badge-amber':'badge-blue'); return '<span class="badge '+col+'" title="Valor '+a+' · Constancia '+((cl||'').slice(1,2)||'?')+'">'+esc(cl||'?')+'</span>'; }
/* ================= Armar pedido (pegar lista) — Edilso ================= */
var _apLineas=[], _apNoEnc=[], _apMeses=1, _apDias=null, _apDefDias=15, _apParamsLoaded=false, _apBus=[], _apGroupKeys=[];
var _apInp='padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text)';
var _apTiny='padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);text-align:center';
function _apLoadParams(){ _apParamsLoaded=true; try{ supabaseClient.from('compras_parametros').select('lead_time_default').eq('id',1).maybeSingle().then(function(r){ if(r&&r.data&&r.data.lead_time_default){ _apDefDias=Number(r.data.lead_time_default)||15; } if(_apDias==null)_apDias=_apDefDias; _apRender(); }); }catch(e){ if(_apDias==null)_apDias=_apDefDias; } }
function _apCompute(l){ var pm=Number(l.prom_mensual)||0; if(pm<=0) return null; var pd=pm/30; var s=pm*(Number(_apMeses)||0)+pd*(Number(_apDias)||0)-(Number(l.existencia_actual)||0); if(s<0)s=0; var e=Number(l.empaque)||1; if(e>1) s=Math.ceil(s/e)*e; return Math.round(s); }
function _apParseLinea(ln){ ln=(ln||'').trim(); if(!ln)return null; var num=/^\d+([.,]\d+)?$/;
  var p=ln.split(/[\t,;]+/);
  if(p.length>=2 && num.test(p[1].trim())){ return {code:p[0].trim(), stock:parseFloat(p[1].replace(',','.'))}; }
  var t=ln.split(/\s+/);
  if(t.length>=2 && num.test(t[t.length-1])){ var st=parseFloat(t.pop().replace(',','.')); var rest=t.join(' '); return /\s/.test(rest)?{name:rest}:{code:rest,stock:st}; }
  return /\s/.test(ln)?{name:ln}:{code:ln};
}
function _apProcesar(){
  var ta=document.getElementById('ap-lista'); if(!ta)return; var lines=(ta.value||'').split(/\n/);
  var codes=[], stockBy={}, names=[], seen={};
  lines.forEach(function(ln){ var r=_apParseLinea(ln); if(!r)return; if(r.name){ names.push(r.name); return; } var c=r.code; if(!c)return; if(seen[c])return; seen[c]=1; codes.push(c); if(r.stock!=null)stockBy[c]=r.stock; });
  if(!codes.length && !names.length){ showToast('Pega al menos un producto'); return; }
  _apNoEnc=names.slice();
  if(!codes.length){ _apLineas=[]; _apRender(); return; }
  var b=document.getElementById('ci-body'); if(b)b.innerHTML='<div style="padding:22px;color:var(--muted)">Buscando '+codes.length+' código(s) en la base…</div>';
  supabaseClient.from('productos').select('codigo,descripcion,prom_mensual,existencia_actual,empaque,costo,proveedor_nombre,proveedor_id,min_sugerido').in('codigo',codes).then(function(res){
    if(res&&res.error){ showToast('Error: '+(res.error.message||'')); _apRender(); return; }
    var found={}; (res.data||[]).forEach(function(r){ found[String(r.codigo)]=r; });
    _apLineas=[];
    codes.forEach(function(c){ var r=found[String(c)]; if(!r){ _apNoEnc.push(c); return; }
      var l={codigo:r.codigo,descripcion:r.descripcion,prom_mensual:Number(r.prom_mensual)||0,existencia_actual:(stockBy[c]!=null?stockBy[c]:(Number(r.existencia_actual)||0)),empaque:Number(r.empaque)||1,costo:Number(r.costo)||0,proveedor_nombre:r.proveedor_nombre||'(sin proveedor)',proveedor_id:r.proveedor_id};
      var sg=_apCompute(l); l.cantidad=(sg!=null?sg:0); l.auto=(sg!=null); _apLineas.push(l);
    });
    _apRender();
  });
}
function _apSetParam(k,v){ if(k==='meses')_apMeses=parseFloat(v)||0; else _apDias=parseFloat(v)||0; _apLineas.forEach(function(l){ if(l.auto!==false){ var sg=_apCompute(l); if(sg!=null)l.cantidad=sg; } }); _apRender(); }
function _apSetCant(i,v){ if(_apLineas[i]){ _apLineas[i].cantidad=parseFloat(v)||0; _apLineas[i].auto=false; _apRender(); } }
function _apSetStock(i,v){ if(_apLineas[i]){ _apLineas[i].existencia_actual=parseFloat(v)||0; if(_apLineas[i].auto!==false){ var sg=_apCompute(_apLineas[i]); if(sg!=null)_apLineas[i].cantidad=sg; } _apRender(); } }
function _apDel(i){ if(_apLineas[i]){ _apLineas.splice(i,1); _apRender(); } }
function _apLimpiar(){ _apLineas=[]; _apNoEnc=[]; _apBus=[]; _apRender(); }
function _apBuscar(term){ term=(term||'').trim(); var r=document.getElementById('ap-bus-res'); if(!r)return; if(term.length<2){ r.innerHTML=''; _apBus=[]; return; }
  supabaseClient.from('productos').select('codigo,descripcion,prom_mensual,existencia_actual,empaque,costo,proveedor_nombre,proveedor_id').or('descripcion.ilike.%'+term+'%,codigo.ilike.%'+term+'%').limit(20).then(function(res){ _apBus=(res&&res.data)||[]; r.innerHTML=_apBus.length?_apBus.map(function(p,idx){ return '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:4px 0;border-top:1px solid var(--border);font-size:12px"><span style="min-width:0">'+esc(p.descripcion||p.codigo)+' <span style="font-size:9px;color:var(--muted)">'+esc(p.codigo)+'</span></span><button class="btn btn-green btn-sm" onclick="_apAgregar('+idx+')">+ Agregar</button></div>'; }).join(''):'<div style="font-size:11px;color:var(--muted);padding:4px">Sin resultados.</div>'; }); }
function _apAgregar(idx){ var r=_apBus[idx]; if(!r)return; if(_apLineas.some(function(l){return l.codigo===r.codigo;})){ showToast('Ya está en el pedido'); return; }
  var l={codigo:r.codigo,descripcion:r.descripcion,prom_mensual:Number(r.prom_mensual)||0,existencia_actual:Number(r.existencia_actual)||0,empaque:Number(r.empaque)||1,costo:Number(r.costo)||0,proveedor_nombre:r.proveedor_nombre||'(sin proveedor)',proveedor_id:r.proveedor_id};
  var sg=_apCompute(l); l.cantidad=(sg!=null?sg:0); l.auto=(sg!=null); _apLineas.push(l); _apRender(); }
function _apImportCat(){
  var go=function(){ var inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls'; inp.onchange=function(){ var f=inp.files&&inp.files[0]; if(f)_apLeerExcel(f); }; inp.click(); };
  if(window.XLSX){ go(); return; }
  if(typeof showToast==='function')showToast('Cargando lector de Excel…');
  var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=go; s.onerror=function(){ showToast('No se pudo cargar el lector de Excel'); }; document.head.appendChild(s);
}
function _apLeerExcel(f){
  var rd=new FileReader();
  rd.onload=function(e){ try{
    var wb=XLSX.read(e.target.result,{type:'array'});
    var sh=(wb.SheetNames.indexOf('ABC-XYZ')>=0)?'ABC-XYZ':wb.SheetNames[wb.SheetNames.length-1];
    var arr=XLSX.utils.sheet_to_json(wb.Sheets[sh],{defval:null});
    var g=function(o,keys){ for(var i=0;i<keys.length;i++){ if(o[keys[i]]!=null && o[keys[i]]!=='') return o[keys[i]]; } return null; };
    var num=function(v){ if(v==null||v==='')return null; var x=parseFloat(String(v).replace(',','.')); return isNaN(x)?null:x; };
    var prods=[];
    arr.forEach(function(o){ var cod=g(o,['Código','Codigo','codigo','CÓDIGO']); if(cod==null||String(cod).trim()==='')return;
      prods.push({ codigo:String(cod).trim(), descripcion:g(o,['Descripción','Descripcion']), abc:g(o,['ABC']), xyz:g(o,['XYZ']), clase:g(o,['Clase']), unid_ano:num(g(o,['Unid. año','Unid. ano','Unid año'])), facturacion:num(g(o,['Facturación Bs','Facturacion Bs'])), prom_mensual:num(g(o,['Prom/mes','Prom mes'])), desv_mensual:num(g(o,['Desv. mens.','Desv mens'])), cv:num(g(o,['CV'])), meses_con_venta:num(g(o,['Meses c/venta','Meses con venta'])), existencia_actual:num(g(o,['Stock actual','Existencia','Stock'])), min_sugerido:num(g(o,['Mín sugerido','Min sugerido'])), max_sugerido:num(g(o,['Máx sugerido','Max sugerido'])), accion:g(o,['Acción','Accion']) });
    });
    if(!prods.length){ showToast('No se encontraron productos (revisa las columnas del Excel)'); return; }
    if(!confirm('Se importarán / actualizarán '+prods.length+' productos en el catálogo. ¿Continuar?')){ return; }
    _apUpsertLotes(prods,0,0);
  }catch(err){ showToast('Error leyendo el Excel: '+((err&&err.message)||'')); } };
  rd.onerror=function(){ showToast('No se pudo leer el archivo'); };
  rd.readAsArrayBuffer(f);
}
function _apUpsertLotes(prods,i,ok){
  var pg=document.getElementById('ap-imp-pg');
  if(i>=prods.length){ if(pg)pg.textContent='✓ '+ok+' productos actualizados'; showToast('✓ Catálogo actualizado: '+ok+' productos'); return; }
  if(pg)pg.textContent='Importando… '+i+' / '+prods.length;
  var lote=prods.slice(i,i+500);
  supabaseClient.from('productos').upsert(lote,{onConflict:'codigo'}).then(function(r){
    if(r&&r.error){ if(pg)pg.textContent=''; showToast('Error al importar: '+((r.error.message)||'')); return; }
    _apUpsertLotes(prods,i+500,ok+lote.length);
  });
}
function _apRender(){
  var b=document.getElementById('ci-body'); if(!b)return;
  if(!_apParamsLoaded){ _apLoadParams(); }
  if(_apDias==null)_apDias=_apDefDias;
  var fld='width:112px;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:15px;font-weight:700';
  var params='<div class="tbox" style="padding:14px 16px;margin-bottom:14px;border-radius:14px;display:flex;gap:22px;flex-wrap:wrap;align-items:flex-end">'+
    '<div><div style="font-size:11px;color:var(--muted);margin-bottom:5px;font-weight:600">📅 Meses de mercancía</div><input type="number" min="0" step="0.5" value="'+_apMeses+'" onchange="_apSetParam(\'meses\',this.value)" style="'+fld+'"></div>'+
    '<div><div style="font-size:11px;color:var(--muted);margin-bottom:5px;font-weight:600">🚚 Días que tarda el proveedor</div><input type="number" min="0" value="'+_apDias+'" onchange="_apSetParam(\'dias\',this.value)" style="'+fld+'"></div>'+
    '<div style="flex:1;min-width:200px;font-size:11px;color:var(--muted);line-height:1.55;align-self:center">La <b style="color:var(--text)">cantidad sugerida</b> cubre lo que vendes en esos meses + lo que se venderá mientras llega el pedido, menos tu stock actual.</div>'+
    '</div>';
  if(!_apLineas.length && !_apNoEnc.length){
    b.innerHTML='<div style="max-width:880px">'+
      '<div style="display:flex;align-items:center;gap:13px;margin-bottom:16px">'+
        '<div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,var(--accent),#6d5efc);display:grid;place-items:center;font-size:23px;flex:none;box-shadow:0 5px 16px rgba(99,102,241,.35)">🧾</div>'+
        '<div><div style="font-weight:800;font-size:17px;line-height:1.15">Armar pedido</div><div style="font-size:12px;color:var(--muted)">Pega tus productos con el stock actual — la app calcula cuánto comprar.</div></div>'+
      '</div>'+params+
      '<div style="font-size:13px;font-weight:700;margin-bottom:7px">Pega tu lista <span style="color:var(--muted);font-weight:400;font-size:12px">— un producto por línea: solo el código, o <b>código + stock</b></span></div>'+
      '<textarea id="ap-lista" rows="9" placeholder="000123&#10;000456   20&#10;DICLOFENAC 50MG" style="width:100%;box-sizing:border-box;padding:14px;border:1.5px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;line-height:1.7;resize:vertical;outline:none"></textarea>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px">'+
        '<button class="btn btn-green" onclick="_apProcesar()" style="font-size:15px;padding:11px 22px;border-radius:11px">📊 Calcular cuánto pedir</button>'+
        '<button class="btn btn-ghost btn-sm" onclick="_apImportCat()" style="border-radius:10px">📥 Actualizar catálogo (Excel A2)</button>'+
        '<span id="ap-imp-pg" style="font-size:11px;color:var(--muted)"></span>'+
      '</div>'+
    '</div>';
    return;
  }
  var groups={}; _apGroupKeys=[]; _apLineas.forEach(function(l,i){ l._i=i; if(!groups[l.proveedor_nombre]){ groups[l.proveedor_nombre]=[]; _apGroupKeys.push(l.proveedor_nombre); } groups[l.proveedor_nombre].push(l); });
  var totU=_apLineas.reduce(function(s,l){return s+(Number(l.cantidad)||0);},0);
  var html='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">'+
    '<div style="display:flex;align-items:center;gap:12px"><div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,var(--accent),#6d5efc);display:grid;place-items:center;font-size:21px;flex:none;box-shadow:0 5px 16px rgba(99,102,241,.35)">🧾</div><div><div style="font-weight:800;font-size:16px;line-height:1.15">Pedido en armado</div><div style="font-size:12px;color:var(--muted)">'+_apLineas.length+' productos · '+fmt(totU)+' unidades'+(_apGroupKeys.length>1?(' · '+_apGroupKeys.length+' proveedores'):'')+'</div></div></div>'+
    '<div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" onclick="_apLimpiar()" style="border-radius:10px">↺ Nueva lista</button><button class="btn btn-green" onclick="_apGuardar()" style="border-radius:10px">💾 Guardar orden(es)</button></div>'+
    '</div>'+params;
  if(_apNoEnc.length){ html+='<div class="tbox" style="padding:12px 14px;margin-bottom:12px;border-radius:12px;border-left:3px solid var(--amber)"><div style="font-size:12px;font-weight:600">⚠️ No encontrados ('+_apNoEnc.length+') <span style="font-weight:400;color:var(--muted)">— búscalos y agrégalos:</span></div><div style="font-size:11px;color:var(--muted);margin:4px 0 8px">'+_apNoEnc.map(esc).join(' · ')+'</div><input id="ap-buscar" placeholder="🔎 Buscar por nombre o código…" oninput="_apBuscar(this.value)" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text)"><div id="ap-bus-res" style="margin-top:5px"></div></div>'; }
  _apGroupKeys.forEach(function(prov,gi){
    var arr=groups[prov]; var u=arr.reduce(function(s,l){return s+(Number(l.cantidad)||0);},0);
    html+='<div class="tbox" style="padding:0;margin-bottom:14px;border-radius:14px;overflow:hidden">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px 15px;background:var(--surface2,rgba(127,127,127,.06));border-bottom:1px solid var(--border)"><div style="font-weight:700;font-size:13px">📦 '+esc(prov)+'</div><div style="display:flex;align-items:center;gap:10px"><span style="font-size:11px;color:var(--muted)">'+arr.length+' prod · '+fmt(u)+' u</span><button class="btn btn-ghost btn-sm" onclick="_apImprimir('+gi+')" style="border-radius:9px">🖨️ Imprimir</button></div></div>'+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">'+
        '<tr style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.4px"><th style="text-align:left;padding:8px 14px;font-weight:600">Producto</th><th style="padding:8px;font-weight:600">Prom/mes</th><th style="padding:8px;font-weight:600">Stock inv.</th><th style="padding:8px;font-weight:600">Cantidad a pedir</th><th style="width:32px"></th></tr>';
    arr.forEach(function(l){ var noH=!(Number(l.prom_mensual)>0);
      html+='<tr style="border-top:1px solid var(--border)">'+
        '<td style="padding:8px 14px"><div style="font-weight:600;line-height:1.25">'+esc(l.descripcion||l.codigo)+'</div><div style="font-size:10px;color:var(--muted)">'+esc(l.codigo)+(l.empaque>1?(' · empaque '+l.empaque):'')+(noH?' · <span style="color:var(--amber)">sin historial</span>':'')+'</div></td>'+
        '<td style="text-align:center;color:var(--muted)">'+(noH?'—':fmt(Math.round(l.prom_mensual)))+'</td>'+
        '<td style="text-align:center"><input type="number" value="'+(Number(l.existencia_actual)||0)+'" onchange="_apSetStock('+l._i+',this.value)" style="width:62px;padding:6px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);text-align:center"></td>'+
        '<td style="text-align:center"><input type="number" value="'+(Number(l.cantidad)||0)+'" onchange="_apSetCant('+l._i+',this.value)" style="width:72px;padding:6px;border:1.5px solid var(--accent);border-radius:8px;background:var(--surface);color:var(--text);text-align:center;font-weight:800;font-size:14px"></td>'+
        '<td style="text-align:center"><button onclick="_apDel('+l._i+')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:17px;opacity:.55">×</button></td></tr>';
    });
    html+='</table></div></div>';
  });
  b.innerHTML=html;
}
function _apGuardar(){
  var vivas=_apLineas.filter(function(l){return (Number(l.cantidad)||0)>0;});
  if(!vivas.length){ showToast('No hay cantidades para guardar'); return; }
  var groups={}; vivas.forEach(function(l){ var k=String(l.proveedor_id||0); (groups[k]=groups[k]||[]).push(l); });
  var keys=Object.keys(groups);
  supabaseClient.from('ordenes_compra').select('id',{count:'exact',head:true}).then(function(cn){
    var base=(cn&&cn.count)||0, idx=0, done=0, errs=0;
    keys.forEach(function(k){
      var arr=groups[k]; var tot=arr.reduce(function(s,l){return s+(Number(l.cantidad)||0)*(Number(l.costo)||0);},0);
      var numero='OC-'+('00000'+(base+(++idx))).slice(-5);
      var pid=(k&&k!=='0'&&k!=='null')?Number(k):null;
      supabaseClient.from('ordenes_compra').insert({proveedor_id:pid,fecha:HOY().slice(0,10),numero:numero,estado:'borrador',total:Math.round(tot*100)/100}).select('id').maybeSingle().then(function(r){
        if(r&&r.error){ errs++; done++; if(done===keys.length)_apFin(errs,keys.length); return; }
        var oid=r.data&&r.data.id;
        var lineas=arr.map(function(l){ var q=Number(l.cantidad)||0, c=Number(l.costo)||0; return {orden_id:oid,codigo:l.codigo,descripcion:l.descripcion,cantidad:q,costo_unit:c,total_linea:Math.round(q*c*100)/100}; });
        supabaseClient.from('orden_compra_lineas').insert(lineas).then(function(r2){ if(r2&&r2.error)errs++; done++; if(done===keys.length)_apFin(errs,keys.length); });
      });
    });
  });
}
function _apFin(errs,n){ if(errs)showToast(errs+' de '+n+' orden(es) con error'); else showToast('✓ '+n+' orden(es) guardada(s) en borrador'); }
function _apImprimir(gi){
  var prov=_apGroupKeys[gi]; if(prov==null)return;
  var arr=_apLineas.filter(function(l){return l.proveedor_nombre===prov && (Number(l.cantidad)||0)>0;});
  if(!arr.length){ showToast('Nada que pedir en este grupo'); return; }
  var uni=arr.reduce(function(s,l){return s+(Number(l.cantidad)||0);},0);
  var logo=(typeof FARM_LOGO_SVG!=='undefined')?FARM_LOGO_SVG:'';
  var rows=arr.map(function(l){ return '<tr><td>'+esc(l.codigo)+'</td><td>'+esc(l.descripcion||'')+'</td><td class="r">'+fmt(l.cantidad||0)+'</td><td></td><td></td></tr>'; }).join('');
  var provTxt=(prov&&prov!=='(sin proveedor)')?esc(prov):'____________________________';
  var css='*{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}body{margin:26px;color:#1a1a1a;font-size:13px}.hd{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1E38A6;padding-bottom:12px}.lg{width:56px;height:56px;border-radius:12px;overflow:hidden;background:#1E38A6;flex:none}.lg svg{width:100%;height:100%}.emp{font-size:15px;font-weight:800;color:#1E38A6}.sm{font-size:11px;color:#555;line-height:1.4}.oc{margin-left:auto;text-align:right}.oc .n{font-size:18px;font-weight:800;color:#1E38A6}.prov{margin:14px 0 4px;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #ddd;padding:6px 9px;text-align:left;font-size:12px}th{background:#1E38A6;color:#fff}td.r,th.r{text-align:right}.note{margin-top:12px;font-size:12px;color:#333;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:9px 12px}.fm{display:flex;gap:50px;margin-top:44px}.fm div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;text-align:center;color:#444}';
  var html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Orden de compra</title><style>'+css+'</style></head><body>'+
    '<div class="hd"><div class="lg">'+logo+'</div><div><div class="emp">FARMACIA CLARET DE INVERSIONES HOSPITALARIAS C.A.</div><div class="sm">RIF J-30883236-7 · Calle 65, Local Nro 18-88, Sector Paraíso, Maracaibo, Zulia<br>Tel: 0261-3239306 / 4189593</div></div><div class="oc"><div class="n">ORDEN DE COMPRA</div><div class="sm">'+fmtDate(HOY())+'</div></div></div>'+
    '<div class="prov"><b>Proveedor:</b> '+provTxt+'</div>'+
    '<div class="sm">'+arr.length+' productos · '+fmt(uni)+' unidades solicitadas</div>'+
    '<table><thead><tr><th>Código</th><th>Descripción</th><th class="r">Cant. solicitada</th><th class="r">Precio unit.</th><th class="r">Total</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div class="note">Agradecemos <b>cotizar</b>: completar los precios unitarios y el total, y devolvernos esta lista. Los precios los coloca el proveedor.</div>'+
    '<div class="fm"><div>Solicitado por (Farmacia Claret)</div><div>Cotizado por (Proveedor)</div></div>'+
    '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},250);}<\/scr'+'ipt></body></html>';
  var w=window.open('','_blank'); if(!w){ showToast('Permite ventanas emergentes para imprimir'); return; } w.document.open(); w.document.write(html); w.document.close();
}
/* ================= Lista de precios (drag&drop) — precio = costo$ x tasa x (1+margen) · multi-formato / multi-fuente ================= */
var _lpItems=[], _lpTasa=null, _lpMargen=30, _lpBusca='', _lpFecha='', _lpFuenteSel='', _lpAjustesOpen=false;
function _lpToggleAjustes(){ _lpAjustesOpen=!_lpAjustesOpen; _lpRender(); }
function _lpGetTasa(){ try{ var t=getTasa(); return (t>0?t:0); }catch(e){ return 0; } }
function _lpPrecio(usd){ var u=Number(usd)||0; return u*(Number(_lpTasa)||0)*(1+(Number(_lpMargen)||0)/100); }
function _lpPrecioUsd(usd){ var u=Number(usd)||0; return u*(1+(Number(_lpMargen)||0)/100); }
function _lpF2(n){ return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _lpFuentes(){ var m={},o=[]; _lpItems.forEach(function(it){ var f=it.fuente||'—'; if(!m[f]){m[f]=1;o.push(f);}else m[f]++; }); return o.map(function(f){return {f:f,n:m[f]};}); }
function _lpCargar(){
  var b=document.getElementById('ci-body'); if(b)b.innerHTML='<div style="padding:24px;color:var(--muted)">Cargando lista de precios…</div>';
  if(_lpTasa==null)_lpTasa=_lpGetTasa();
  supabaseClient.from('lista_precios').select('*').order('producto').then(function(r){
    if(r&&r.error){ if(b)b.innerHTML='<span style="color:var(--red)">No se pudo cargar: '+esc(r.error.message||'')+'</span>'; return; }
    _lpItems=(r&&r.data)||[]; _lpFecha=''; if(_lpItems.length&&_lpItems[0].actualizado_en){ try{ _lpFecha=fmtDate(_lpItems[0].actualizado_en.slice(0,10)); }catch(e){} }
    _lpRender();
  });
}
function _lpSetTasa(v){ _lpTasa=parseFloat(String(v).replace(',','.'))||0; _lpRenderTabla(); }
function _lpSetMargen(v){ _lpMargen=parseFloat(v)||0; _lpRenderTabla(); }
function _lpBuscarSet(v){ _lpBusca=(v||'').toLowerCase(); _lpRenderTabla(); }
function _lpSetFuente(f){ _lpFuenteSel=f; _lpRender(); }
function _lpRender(){
  var b=document.getElementById('ci-body'); if(!b)return; if(_lpTasa==null)_lpTasa=_lpGetTasa();
  var fld='padding:8px 11px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:15px;font-weight:700';
  var fs=_lpFuentes();
  var chips='';
  if(fs.length){ chips='<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px"><button class="fchip'+(_lpFuenteSel===''?' active':'')+'" onclick="_lpSetFuente(\'\')">Todas ('+_lpItems.length+')</button>'+
    fs.map(function(x){ return '<button class="fchip'+(_lpFuenteSel===x.f?' active':'')+'" onclick="_lpSetFuente(\''+esc(x.f).replace(/'/g,"\\'")+'\')">'+esc(x.f)+' ('+x.n+')</button>'; }).join('')+'</div>'; }
  var ajustes='<div class="tbox" style="padding:14px 16px;margin-bottom:12px;border-radius:14px;display:flex;gap:22px;flex-wrap:wrap;align-items:flex-end">'+
      '<div><div style="font-size:11px;color:var(--muted);margin-bottom:5px;font-weight:600">💵 Tasa del día (Bs/$)</div><input type="number" step="0.01" value="'+(_lpTasa||'')+'" onchange="_lpSetTasa(this.value)" style="'+fld+';width:130px"></div>'+
      '<div><div style="font-size:11px;color:var(--muted);margin-bottom:5px;font-weight:600">📈 Margen (%)</div><input type="number" value="'+_lpMargen+'" onchange="_lpSetMargen(this.value)" style="'+fld+';width:90px"></div>'+
      '<div style="flex:1;min-width:180px;font-size:11px;color:var(--muted);line-height:1.5;align-self:center">'+(_lpItems.length?(_lpItems.length+' productos · '+fs.length+' fuente(s)'+(_lpFecha?(' · actualizado '+_lpFecha):'')):'Aún no hay lista cargada.')+'</div>'+
    '</div>'+
    '<div id="lp-drop" ondragover="event.preventDefault();this.style.borderColor=\'var(--accent)\';this.style.background=\'rgba(99,102,241,.06)\'" ondragleave="this.style.borderColor=\'var(--border)\';this.style.background=\'transparent\'" ondrop="_lpDrop(event)" onclick="_lpBrowse()" style="border:2px dashed var(--border);border-radius:12px;padding:16px;text-align:center;cursor:pointer;color:var(--muted);font-size:13px;margin-bottom:12px">📥 <b>Arrastra aquí el Excel de precios</b> (o haz clic para elegirlo) · acepta MIFAR, GlobalCare y otros formatos. Reemplaza solo las fuentes que traiga el archivo. <span id="lp-imp-pg" style="color:var(--accent)"></span></div>';
  var top='<div style="max-width:960px">'+
    '<style>@keyframes lpPulse{0%,100%{box-shadow:0 0 0 4px rgba(34,197,94,.22),0 10px 28px rgba(34,197,94,.32)}50%{box-shadow:0 0 0 10px rgba(34,197,94,.34),0 20px 50px rgba(34,197,94,.60)}}#lp-buscar{animation:lpPulse 1.9s ease-in-out infinite}#lp-buscar:focus{animation:none;box-shadow:0 0 0 9px rgba(34,197,94,.34),0 20px 52px rgba(34,197,94,.62)!important}</style>'+
    '<div style="display:flex;align-items:center;gap:13px;margin-bottom:12px">'+
      '<div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#16a34a,#22c55e);display:grid;place-items:center;font-size:23px;flex:none;box-shadow:0 5px 16px rgba(34,197,94,.35)">💲</div>'+
      '<div style="flex:1"><div style="font-weight:800;font-size:17px;line-height:1.15">Lista de precios</div><div style="font-size:12px;color:var(--muted)">Precio = costo en $ × tasa del día × (1 + margen). Se actualiza solo cada día con la tasa.</div></div>'+
      '<button onclick="_lpToggleAjustes()" class="fchip" style="font-size:12.5px;white-space:nowrap;align-self:center">⚙️ Ajustes '+(_lpAjustesOpen?'▴':'▾')+'</button>'+
    '</div>'+
    (_lpAjustesOpen?ajustes:'')+
    chips+
    '<div style="position:relative;margin-bottom:14px">'+
      '<span style="position:absolute;left:18px;top:50%;transform:translateY(-50%);font-size:23px;pointer-events:none;z-index:1">🔎</span>'+
      '<input id="lp-buscar" placeholder="Buscar producto, marca o código…" value="'+esc(_lpBusca)+'" oninput="_lpBuscarSet(this.value)" style="width:100%;box-sizing:border-box;padding:18px 18px 18px 54px;border:2.5px solid #22c55e;border-radius:16px;background:var(--surface);color:var(--text);font-size:18px;font-weight:600;outline:none;position:relative">'+
    '</div>'+
    '<div id="lp-tabla"></div></div>';
  b.innerHTML=top; _lpRenderTabla();
}
function _lpKey(it){ var A=function(x){return (''+(x==null?'':x)).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}; var prod=A(it.producto).replace(/\([^)]*\)/g,' ').replace(/\*+[^*]*\*+/g,' '); var com=A(it.comentario); var mm=com.match(/PPIO:\s*([^\u00b7|]+)/); var base=(mm?mm[1]:prod).replace(/[^A-Z0-9 ]/g,' '); var salt={CLORHIDRATO:1,HCL:1,SODICO:1,SODIO:1,SULFATO:1,MALEATO:1,POTASICO:1,POTASIO:1,CALCICO:1,CALCIO:1,MESILATO:1,FOSFATO:1,ACETATO:1,SUCCINATO:1,DIHIDRATADO:1,BASE:1,DE:1,DEL:1,LA:1,METILSULFATO:1}; var ing=[]; var ps=base.split(/\s+/); for(var i=0;i<ps.length;i++){ var t=ps[i]; if(!t)continue; if(/\d/.test(t))break; if(salt[t])continue; ing.push(t); if(ing.length>=2)break; } var st=(prod.match(/\d+(?:[.,]\d+)?\s*(?:MCG|MG|ML|GR|UI|G|U|%)/g)||[]).map(function(x){return x.replace(/[.,\s]/g,'');}); st.sort(); return ing.join('')+'|'+st.join(''); }
function _lpRenderTabla(){
  var el=document.getElementById('lp-tabla'); if(!el)return;
  var q=_lpBusca;
  var arr=_lpItems.filter(function(it){ if(_lpFuenteSel && (it.fuente||'—')!==_lpFuenteSel) return false; if(!q)return true; return ((it.producto||'')+' '+(it.marca||'')+' '+(it.codigo||'')+' '+(it.tipo||'')).toLowerCase().indexOf(q)>=0; });
  if(!_lpItems.length){ el.innerHTML='<div class="tbox" style="padding:26px;text-align:center;color:var(--muted);border-radius:12px">Arrastra el Excel de precios arriba para empezar.</div>'; return; }
  if(!arr.length){ el.innerHTML='<div style="padding:16px;color:var(--muted)">Sin resultados.</div>'; return; }
  var _lpG={}; arr.forEach(function(it){ if(!(Number(it.precio_usd)>0))return; var k=_lpKey(it); (_lpG[k]=_lpG[k]||[]).push(it); });
  var _lpBest={}; for(var _k in _lpG){ if(_lpG[_k].length<2)continue; var mn=Infinity; _lpG[_k].forEach(function(x){ if(Number(x.precio_usd)<mn)mn=Number(x.precio_usd); }); _lpBest[_k]=mn; }
  var h='<div class="tbox" style="padding:0;border-radius:14px;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:13px">';
  arr.forEach(function(it){ var nd=/no dispon/i.test(it.comentario||'')||!(Number(it.precio_usd)>0); var precio=_lpPrecio(it.precio_usd); var _bk=_lpKey(it); var _bm=_lpBest[_bk]; var _isBest=(_bm!=null)&&Number(it.precio_usd)===_bm; var _pct=(_bm!=null&&!_isBest&&_bm>0)?Math.round((Number(it.precio_usd)/_bm-1)*100):0;
    h+='<tr onclick="_lpDetalle('+(it.id||0)+')" style="border-top:1px solid var(--border);cursor:pointer'+(nd?';opacity:.55':'')+(_isBest?';background:rgba(5,150,105,.09);box-shadow:inset 3px 0 0 var(--green)':'')+'">'+
      '<td style="padding:11px 14px"><div style="font-weight:600;line-height:1.25">'+esc(it.producto||'')+(nd?' <span style="font-size:9px;color:var(--red);font-weight:700">NO DISP.</span>':'')+(_isBest?' <span style="font-size:9px;font-weight:800;color:#fff;background:var(--green);padding:1px 6px;border-radius:99px">★ MEJOR PRECIO</span>':'')+'</div>'+'<div style="font-size:10px;color:var(--muted)">'+esc(it.fuente||'—')+(it.marca&&(''+it.marca).toUpperCase().trim()!==(''+(it.fuente||'')).toUpperCase().trim()?(' · '+esc(it.marca)):'')+'</div></td>'+
      '<td style="text-align:right;padding:11px 14px;white-space:nowrap">'+(Number(it.precio_usd)>0?('<span style="font-weight:800;font-size:14px;color:var(--green)">'+fmt(Math.round(precio))+' Bs</span> <span style="color:var(--muted);font-size:15px">›</span><div style="font-size:11.5px;font-weight:700;color:#0891b2">$ '+_lpF2(_lpPrecioUsd(it.precio_usd))+'</div>'+(_pct>0?('<div style="font-size:9.5px;font-weight:700;color:var(--red)">+'+_pct+'% vs mejor</div>'):'')):'<span style="font-weight:800;font-size:12px;color:var(--red)">No disponible</span>')+'</td>'+
    '</tr>';
  });
  h+='</table></div><div style="font-size:11px;color:var(--muted);margin-top:6px">Toca un producto para ver su detalle. Mostrando '+arr.length+' de '+_lpItems.length+'.</div>';
  el.innerHTML=h;
}

/* ================= Inventario en vivo (A2 → puente cada 10 min · prefijo _iv) ================= */
var _ivBusca='', _ivT=null, _ivSeq=0, _ivSoloStock=true;
function _ivHace(ts){
  if(!ts)return '';
  var min=Math.floor((Date.now()-new Date(ts).getTime())/60000);
  if(min<1)return 'hace un momento';
  if(min<60)return 'hace '+min+' min';
  var h=Math.floor(min/60); if(h<48)return 'hace '+h+' h';
  return 'hace '+Math.floor(h/24)+' días';
}
function _ivRender(){
  var b=document.getElementById('ci-body'); if(!b)return;
  b.innerHTML='<div style="max-width:960px">'+
    '<div style="display:flex;align-items:center;gap:13px;margin-bottom:12px">'+
      '<div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#0ea5e9,#6366f1);display:grid;place-items:center;font-size:23px;flex:none;box-shadow:0 5px 16px rgba(14,165,233,.35)">📦</div>'+
      '<div style="flex:1"><div style="font-weight:800;font-size:17px;line-height:1.15">Inventario en vivo</div><div style="font-size:12px;color:var(--muted)">Existencias reales de A2 · el puente las actualiza solo cada 10 minutos.</div></div>'+
    '</div>'+
    '<div id="iv-stats" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="tbox" style="padding:10px 14px;flex:1;min-width:130px;text-align:center;color:var(--muted);font-size:12px">Cargando resumen…</div></div>'+
    '<div style="position:relative;margin-bottom:8px">'+
      '<span style="position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:21px;pointer-events:none">🔎</span>'+
      '<input id="iv-q" placeholder="Buscar producto, marca o código…" value="'+esc(_ivBusca)+'" oninput="_ivSet(this.value)" style="width:100%;box-sizing:border-box;padding:16px 16px 16px 50px;border:2px solid #0ea5e9;border-radius:14px;background:var(--surface);color:var(--text);font-size:17px;font-weight:600;outline:none">'+
    '</div>'+
    '<label style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted);cursor:pointer;margin-bottom:10px"><input type="checkbox" '+(_ivSoloStock?'checked':'')+' onchange="_ivToggle()" style="width:16px;height:16px"> Mostrar solo lo que hay en existencia</label>'+
    '<div id="iv-res"><div style="padding:14px 2px;color:var(--muted);font-size:13px">Escribe al menos 2 letras para buscar en todo el inventario.</div></div>'+
  '</div>';
  _ivStatsCargar();
  if(_ivBusca && _ivBusca.length>=2)_ivBuscar();
}
function _ivStatsCargar(){
  Promise.all([
    supabaseClient.from('productos').select('codigo',{count:'exact',head:true}),
    supabaseClient.from('productos').select('codigo',{count:'exact',head:true}).gt('existencia_actual',0),
    supabaseClient.from('productos').select('actualizado_en').not('actualizado_en','is',null).order('actualizado_en',{ascending:false}).limit(1)
  ]).then(function(r){
    var el=document.getElementById('iv-stats'); if(!el)return;
    var tot=(r[0]&&r[0].count)||0, con=(r[1]&&r[1].count)||0;
    var ult=(r[2]&&r[2].data&&r[2].data[0])?r[2].data[0].actualizado_en:null;
    var caja=function(lbl,v,col){ return '<div class="tbox" style="padding:10px 14px;flex:1;min-width:130px;text-align:center"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+lbl+'</div><div style="font-size:20px;font-weight:800;margin-top:2px'+(col?(';color:'+col):'')+'">'+v+'</div></div>'; };
    el.innerHTML=caja('Productos',fmt(tot))+caja('Con existencia',fmt(con),'var(--green)')+caja('Última actualización',(ult?_ivHace(ult):'—'));
  }).catch(function(){});
}
function _ivSet(v){ _ivBusca=(v||'').trim(); clearTimeout(_ivT); _ivT=setTimeout(_ivBuscar,280); }
function _ivToggle(){ _ivSoloStock=!_ivSoloStock; if(_ivBusca.length>=2)_ivBuscar(); }
function _ivBuscar(){
  var res=document.getElementById('iv-res'); if(!res)return;
  var q=_ivBusca;
  if(q.length<2){ res.innerHTML='<div style="padding:14px 2px;color:var(--muted);font-size:13px">Escribe al menos 2 letras para buscar en todo el inventario.</div>'; return; }
  res.innerHTML='<div style="padding:14px 2px;color:var(--muted);font-size:13px">Buscando…</div>';
  var seq=++_ivSeq;
  var toks=q.replace(/[%,()\\]/g,' ').split(/\s+/).filter(function(t){return t.length>=2;}).slice(0,4);
  if(!toks.length){ res.innerHTML='<div style="padding:14px 2px;color:var(--muted);font-size:13px">Escribe al menos 2 letras…</div>'; return; }
  var query=supabaseClient.from('productos').select('codigo,descripcion,existencia_actual,categoria,departamento,marca,unidad,actualizado_en').order('existencia_actual',{ascending:false}).limit(60);
  if(_ivSoloStock)query=query.gt('existencia_actual',0);
  toks.forEach(function(t){ query=query.or('descripcion.ilike.%'+t+'%,marca.ilike.%'+t+'%,codigo.ilike.%'+t+'%'); });
  query.then(function(r){
    if(seq!==_ivSeq)return;
    if(r&&r.error){ res.innerHTML='<div style="padding:14px 2px;color:var(--red);font-size:13px">No se pudo buscar: '+esc(r.error.message||'')+'</div>'; return; }
    var items=(r&&r.data)||[];
    if(!items.length){ res.innerHTML='<div class="tbox" style="padding:18px;text-align:center;color:var(--muted);font-size:13px">Nada coincide'+(_ivSoloStock?' con existencia — prueba quitando el filtro de abajo del buscador':'')+'.</div>'; return; }
    var h='<div class="tbox" style="padding:0;border-radius:14px;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:13px">';
    items.forEach(function(it){
      var ex=Number(it.existencia_actual)||0;
      var sub=[it.marca,it.categoria,(it.codigo?('cód. '+it.codigo):null)].filter(Boolean).map(esc).join(' · ');
      h+='<tr style="border-top:1px solid var(--border)'+(ex<=0?';opacity:.55':'')+'">'+
        '<td style="padding:10px 14px"><div style="font-weight:600;line-height:1.25">'+esc(it.descripcion||it.codigo||'')+'</div>'+(sub?('<div style="font-size:10.5px;color:var(--muted)">'+sub+'</div>'):'')+'</td>'+
        '<td style="text-align:right;padding:10px 14px;white-space:nowrap">'+
          (ex>0?('<div style="font-size:16px;font-weight:800;color:var(--green)">'+fmt(ex)+'</div><div style="font-size:9.5px;color:var(--muted)">en existencia · '+_ivHace(it.actualizado_en)+'</div>'):'<div style="font-size:12px;font-weight:800;color:var(--red)">AGOTADO</div>')+
        '</td></tr>';
    });
    h+='</table></div><div style="font-size:11px;color:var(--muted);margin-top:6px">Mostrando '+items.length+' resultado(s), los de mayor existencia primero.</div>';
    res.innerHTML=h;
  });
}
