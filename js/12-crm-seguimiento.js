var _msgZona='', _msgProd='', _msgOrden='vol';
var _mktStats=null, _mktProd='Hidrocortisona';
function _msgFmtU(n){ return (''+(Number(n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
function _msgOrdenar(a){ if(_msgOrden==='vol'){ return a.slice().sort(function(x,y){ return (Number(y.unidades)||0)-(Number(x.unidades)||0); }); } return a.slice().sort(function(x,y){ return (''+(x.nombre||'')).localeCompare(''+(y.nombre||'')); }); }
function _msgProdSelect(onch){ var ps=['Hidrocortisona','Tigeciclina','Voriconazol','Caspofungina']; var ic='padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:14px;width:100%;box-sizing:border-box;margin-bottom:8px'; return '<select onchange="'+onch+'(this.value)" style="'+ic+'"><option value="">💊 Todos los productos</option>'+ps.map(function(x){ return '<option value="'+x+'"'+(x===_msgProd?' selected':'')+'>'+x+'</option>'; }).join('')+'</select>'; }
function _msgOrdenToggle(){ var b=function(v,tx){ var on=(_msgOrden===v); return '<button onclick="_msgSetOrden(\''+v+'\')" style="border:1px solid '+(on?'var(--accent)':'var(--border)')+';background:'+(on?'var(--accent)':'transparent')+';color:'+(on?'#fff':'var(--muted)')+';border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">'+tx+'</button>'; }; return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><span style="font-size:11px;color:var(--muted)">Ordenar:</span>'+b('vol','📦 Volumen')+b('nombre','A-Z')+'</div>'; }
function _msgSetProd(v){ _msgProd=v; if(_msgCanal==='wa')_waRender(); else _coRender(); }
function _waSetProd(v){ _msgSetProd(v); }
function _coSetProd(v){ _msgSetProd(v); }
function _msgSetOrden(v){ _msgOrden=v; if(_msgCanal==='wa')_waRender(); else _coRender(); }
function _msgEstado(z){ return (''+(z||'')).split('/')[0].trim(); }
function _msgEstadoSelect(base,onch){ var set={}; base.forEach(function(e){ var es=_msgEstado(e.zona); if(es)set[es]=(set[es]||0)+1; }); var ests=Object.keys(set).sort(); if(!ests.length)return ''; var ic='padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:14px;width:100%;box-sizing:border-box;margin-bottom:8px'; return '<select onchange="'+onch+'(this.value)" style="'+ic+'"><option value="">📍 Todos los estados ('+base.length+')</option>'+ests.map(function(x){ return '<option value="'+esc(x)+'"'+(x===_msgZona?' selected':'')+'>'+esc(x)+' ('+set[x]+')</option>'; }).join('')+'</select>'; }
function _waFiltrados(){ var a=_waEmp.filter(function(e){ if(_msgZona && _msgEstado(e.zona)!==_msgZona)return false; if(_msgProd && (''+(e.productos||'')).toLowerCase().indexOf(_msgProd.toLowerCase())<0)return false; if(!_waBus)return true; return ((e.nombre||'')+' '+(e.telefono||'')+' '+(e.rif||'')+' '+(e.zona||'')).toLowerCase().indexOf(_waBus)>=0; }); return _msgOrdenar(a); }
function _coFiltrados(){ var a=_coEmpConCorreo().filter(function(e){ if(_msgZona && _msgEstado(e.zona)!==_msgZona)return false; if(_msgProd && (''+(e.productos||'')).toLowerCase().indexOf(_msgProd.toLowerCase())<0)return false; if(!_coBus)return true; return ((e.nombre||'')+' '+(e.correo||'')+' '+(e.rif||'')+' '+(e.zona||'')).toLowerCase().indexOf(_coBus)>=0; }); return _msgOrdenar(a); }
function _waSetZona(v){ _msgZona=v; _waRender(); }
function _coSetZona(v){ _msgZona=v; _coRender(); }
var _PROMO_IMG='promo.jpg';
var _waPlant={
  presentacion:"Buenos días 👋\n\nLe escribo de *Droguería Clínica*, distribuidora mayorista de productos farmacéuticos.\n\nNos gustaría ser un aliado en el surtido de su farmacia:\n• Precios mayoristas competitivos\n• Amplio catálogo y disponibilidad\n• Atención personalizada y despacho oportuno\n\n¿Le interesaría recibir nuestra información comercial?\n\nQuedamos atentos.",
  catalogo:"Buenos días 👋\n\nLe saluda *Droguería Clínica*, distribuidora mayorista farmacéutica.\n\nSi desea acceder a nuestro *catálogo en línea* con precios y disponibilidad actualizados, con gusto le creamos una cuenta.\n\nPor favor indíquenos:\n• *Correo electrónico*\n• *RIF* de la empresa\n\nCon esos datos le habilitamos su usuario y contraseña para ver el catálogo y realizar sus pedidos.\n\n¡Gracias! Quedamos atentos.",
  promocion:"Buenos días 👋\n\n*Droguería Clínica* — Ofertas de la semana 📋\n\nTenemos condiciones especiales en una selección de productos de alta rotación, a precio mayorista.\n\nPara recibir la lista de ofertas y precios, le habilitamos el acceso a nuestro catálogo en línea. Indíquenos su *correo* y *RIF* y le creamos su cuenta.\n\nQuedamos a la orden.",
  promo4:"💊 *Disponibilidad inmediata* 💊\n\nBuenos días 👋 Le escribo de *Droguería Clínica*. Tenemos a precio mayorista, uso hospitalario 💉:\n\n• Tigeciclina 50 mg\n• Hidrocortisona 500 mg\n• Voriconazol 200 mg\n• Caspofungina 50 mg\n\n¿Le interesa cotización? Con gusto le paso precios y presentación 📄",
  disponibilidad:"📦 *Reingreso de productos* 📦\n\nBuenos días 👋 Le saluda *Droguería Clínica*. Tenemos disponibilidad actualizada de productos de alta rotación a precio mayorista.\n\n¿Le envío la lista con los precios de hoy? 📋",
  seguimiento:"Buenos días 👋 Le escribo de *Droguería Clínica* para dar seguimiento. ¿Tuvo chance de ver nuestra información? Con gusto le ayudo con cotización o pedido cuando guste 🙌"
};
function renderMensajes(){
  var el=document.getElementById('mensajes-content'); if(!el)return;
  el.innerHTML='<div style="padding:24px;color:var(--muted)">Cargando…</div>';
  _msgCanal='crm'; if(_waEmp.length||_crmCargado)_crmRender(); else _crmCargar(function(){_crmRender();});
}
function _waCargar(){
  supabaseClient.from('wa_empresas').select('*').eq('activo',true).order('nombre').then(function(r){
    _waEmp=(r&&r.data)||[];
    supabaseClient.from('wa_campanas').select('*').order('id',{ascending:false}).limit(10).then(function(rc){ _waHist=(rc&&rc.data)||[]; _waRender(); });
  });
}
function _waPlantilla(k){ var t=document.getElementById('wa-msg'); if(t){ t.value=_waPlant[k]||''; _waCharCount(); } }
function _waCharCount(){ var t=document.getElementById('wa-msg'), c=document.getElementById('wa-cc'); if(t&&c)c.textContent=t.value.length; _waBtn(); }
function _waBtn(){ var b=document.getElementById('wa-send'); if(!b)return; var n=Object.keys(_waSel).filter(function(k){return _waSel[k];}).length; var m=(document.getElementById('wa-msg')||{}).value||''; b.disabled=!(n>0&&m.trim()); b.textContent='📤 Enviar a '+n+' seleccionada'+(n===1?'':'s'); }
function _waTog(id){ _waSel[id]=!_waSel[id]; _waBtn(); var cnt=document.getElementById('wa-cnt'); if(cnt)cnt.textContent=Object.keys(_waSel).filter(function(k){return _waSel[k];}).length+' de '+_waFiltrados().length+' seleccionadas'; }
function _waTodos(v){ _waFiltrados().forEach(function(e){ _waSel[e.id]=v; }); _waRender(); }
function _waBuscar(v){ _waBus=(v||'').toLowerCase(); _waRenderLista(); }
function _waRender(){
  var el=document.getElementById('mensajes-content'); if(!el)return;
  var inp='width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:14px';
  var chips=[['presentacion','🤝 Presentación'],['catalogo','📋 Catálogo / Cuenta'],['promocion','💰 Promoción'],['promo4','💊 4 productos'],['disponibilidad','📦 Disponibilidad'],['seguimiento','🔁 Seguimiento']].map(function(p){ return '<button class="fchip" onclick="_waPlantilla(\''+p[0]+'\')">'+p[1]+'</button>'; }).join('');
  el.innerHTML=_msgHeader()+
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#25D366,#1fa857);display:grid;place-items:center;font-size:24px;flex:none;box-shadow:0 5px 16px rgba(37,211,102,.35)">📱</div><div><div style="font-weight:800;font-size:17px;line-height:1.15">Campañas de WhatsApp</div><div style="font-size:12px;color:var(--muted)">Droguería Clínica · escribe un mensaje y envíalo a las empresas seleccionadas.</div></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr;gap:14px;max-width:1240px">'+
      '<div class="tbox" style="padding:16px;border-radius:14px">'+
        '<div style="font-weight:700;font-size:13px;margin-bottom:8px">✍️ Mensaje</div>'+
        '<div class="fchips" style="margin-bottom:9px">'+chips+'</div>'+
        '<textarea id="wa-msg" oninput="_waCharCount()" placeholder="Escribe tu mensaje aquí… (o usa una plantilla)" style="'+inp+';min-height:130px;resize:vertical"></textarea>'+'<div style="font-size:10px;color:var(--muted);margin-top:3px">Personaliza: <b>{producto}</b> = el producto que compra cada farmacia · <b>{farmacia}</b> = su nombre.</div>'+
        '<div style="font-size:11px;color:var(--muted);margin:4px 0 10px"><span id="wa-cc">0</span> caracteres</div>'+
        '<button class="btn btn-green" id="wa-send" onclick="_waEnviar()" disabled style="width:100%;background:#25D366">📤 Enviar</button>'+
        '<div style="font-size:10.5px;color:var(--muted);margin-top:7px;line-height:1.5">Se abre WhatsApp con el mensaje listo para cada empresa. Si el navegador bloquea las ventanas, permite las emergentes para este sitio.</div>'+
      '</div>'+
      '<div class="tbox" style="padding:16px;border-radius:14px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px"><div style="font-weight:700;font-size:13px">🏢 Empresas ('+_waEmp.length+')</div>'+
          '<div style="display:flex;gap:6px"><button class="btn btn-ghost btn-sm" onclick="_waImportar()">📂 Importar</button><button class="btn btn-ghost btn-sm" onclick="_msgExportExcel()">📊 Excel</button><button class="btn btn-ghost btn-sm" onclick="_waTodos(true)">✓ Todos</button><button class="btn btn-ghost btn-sm" onclick="_waTodos(false)">✗ Ninguno</button></div></div>'+
        _msgEstadoSelect(_waEmp,'_waSetZona')+_msgProdSelect('_waSetProd')+_msgOrdenToggle()+'<input placeholder="🔎 Buscar empresa…" oninput="_waBuscar(this.value)" style="'+inp+';margin-bottom:8px">'+
        '<div id="wa-cnt" style="font-size:11px;color:var(--muted);margin-bottom:8px">0 de '+_waFiltrados().length+' seleccionadas</div>'+
        '<div id="wa-lista"></div>'+
      '</div>'+
      (_waHist.length?('<div class="tbox" style="padding:16px;border-radius:14px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">📊 Últimas campañas</div>'+_waHist.map(function(c){ var f=''; try{f=fmtDate((''+c.creado_en).slice(0,10));}catch(e){} return '<div style="border-top:1px solid var(--border);padding:8px 0;font-size:12px"><div style="display:flex;justify-content:space-between"><b>'+f+'</b><span style="color:var(--muted)">'+(c.total||0)+' empresas</span></div><div style="color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc((c.mensaje||'').replace(/\n/g,' '))+'</div></div>'; }).join('')+'</div>'):'')+
    '</div>';
  _waRenderLista(); _waCharCount();
}
function _waRenderLista(){
  var el=document.getElementById('wa-lista'); if(!el)return;
  var arr=_waFiltrados();
  if(!_waEmp.length){ el.innerHTML='<div style="text-align:center;color:var(--muted);font-size:13px;padding:22px">No hay empresas. Toca <b>Importar</b> para cargar tu lista (CSV o Excel).</div>'; return; }
  if(!arr.length){ el.innerHTML='<div style="padding:14px;color:var(--muted);font-size:13px">Sin resultados.</div>'; return; }
  el.innerHTML='<div style="max-height:420px;overflow-y:auto">'+arr.map(function(e){ var sent=!!e.ultimo_envio; var f=''; if(sent){try{f=fmtDate((''+e.ultimo_envio).slice(0,10));}catch(x){}}
    return '<label style="display:flex;align-items:center;gap:11px;padding:9px 4px;border-bottom:1px solid var(--border);cursor:pointer">'+
      '<input type="checkbox" '+(_waSel[e.id]?'checked':'')+' onchange="_waTog('+e.id+')" style="width:18px;height:18px;flex:none">'+
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">'+esc(e.nombre||'')+'</div><div style="font-size:11px;color:var(--muted)">'+esc(e.telefono||'')+(e.zona?' · '+esc(e.zona):'')+'</div>'+(e.unidades?'<div style="font-size:10px;color:var(--accent);font-weight:600">📦 '+_msgFmtU(e.unidades)+' u'+(e.productos?' · '+esc(e.productos):'')+'</div>':'')+'</div>'+
      (sent?('<span style="font-size:10px;font-weight:700;background:#e8f5e9;color:#2e7d32;padding:3px 8px;border-radius:999px;white-space:nowrap">✓ '+f+'</span>'):('<span style="font-size:10px;color:var(--amber);font-weight:600">Pendiente</span>'))+
    '</label>';
  }).join('')+'</div>';
}
function _msgAvanzarContacto(ids,via){ var now=new Date().toISOString(); var adv=[]; (ids||[]).forEach(function(id){ var e=_waEmp.filter(function(x){return x.id===id;})[0]; if(!e)return; if(via==='wa')e.ultimo_envio=now; else e.ultimo_correo=now; var et=(e.estado&&(''+e.estado).trim())?e.estado:'Pendiente'; if(et==='Pendiente'){ e.estado='Contactado'; adv.push(id); } }); if(adv.length) supabaseClient.from('wa_empresas').update({estado:'Contactado'}).in('id',adv).then(function(){}); }
function _waEnviar(){
  var sel=Object.keys(_waSel).filter(function(k){return _waSel[k];}).map(Number);
  var msg=((document.getElementById('wa-msg')||{}).value||'').trim();
  if(!sel.length){ showToast('Selecciona empresas'); return; }
  if(!msg){ showToast('Escribe un mensaje'); return; }
  if(sel.length>25){ alert('WhatsApp abre una pestaña por farmacia. Para que no se trabe ni lo bloquee el navegador, envía en tandas de máximo 25.\n\nTienes '+sel.length+' seleccionadas. Usa el filtro por estado/producto para acotar.'); return; }
  if(!confirm('¿Enviar el mensaje a '+sel.length+' empresa(s)?\n\nSe abrirá WhatsApp para cada una.')) return;
  supabaseClient.from('wa_campanas').insert([{mensaje:msg,plantilla:'campana',total:sel.length,autor:(typeof currentUser!=='undefined'?currentUser:null),empresa:'drogueria'}]).select().then(function(rc){
    var campId=(rc&&rc.data&&rc.data[0]&&rc.data[0].id)||null;
    var envios=[];
    sel.forEach(function(id,i){ var e=_waEmp.filter(function(x){return x.id===id;})[0]; if(!e)return;
      envios.push({campana_id:campId,empresa_id:id,autor:(typeof currentUser!=='undefined'?currentUser:null)});
      setTimeout(function(){ var num=(''+(e.telefono||'')).replace(/[^\d+]/g,''); var prod=(''+(e.productos||'')).split(',')[0].trim(); var pmsg=msg.replace(/\{producto\}/gi, prod||'estos productos').replace(/\{farmacia\}/gi, (e.nombre||'')); window.open('https://wa.me/'+num+'?text='+encodeURIComponent(pmsg),'wa_'+id); }, i*600);
    });
    if(envios.length) supabaseClient.from('wa_envios').insert(envios).then(function(){});
    _msgAvanzarContacto(sel,'wa'); supabaseClient.from('wa_empresas').update({ultimo_envio:new Date().toISOString()}).in('id',sel).then(function(){ _waSel={}; if(typeof logAudit==='function')logAudit('mensajes.campana',sel.length+' empresas'); _waCargar(); });
    showToast('✓ Enviando a '+sel.length+' — revisa las pestañas de WhatsApp');
  });
}
function _waImportar(){ var inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,.xlsx,.xls'; inp.onchange=function(){ var f=inp.files&&inp.files[0]; if(!f)return; if(/\.xlsx?$/i.test(f.name)){ _ciCargarSheetJS(function(ok){ if(!ok){showToast('No se pudo cargar el lector de Excel');return;} _waLeerExcel(f); }); } else { _waLeerCSV(f); } }; inp.click(); }
function _waLeerCSV(f){ var r=new FileReader(); r.onload=function(){ var lines=(''+r.result).split(/\r?\n/); var out=[]; lines.forEach(function(ln,i){ ln=ln.trim(); if(!ln)return; var low=ln.toLowerCase(); if(i===0&&(low.indexOf('nombre')>=0||low.indexOf('tel')>=0))return; var p=ln.indexOf('|')>=0?ln.split('|'):ln.split(','); p=p.map(function(x){return x.trim();}); if(p.length>=1&&p[0]) out.push({nombre:p[0],telefono:p[1]||'',correo:p[2]||null,rif:p[3]||null,zona:p[4]||null,unidades:p[5]||null,compras:p[6]||null,ultima_compra:p[7]||null,productos:p[8]||null,competidor:p[9]||null}); }); _waGuardar(out); }; r.readAsText(f); }
function _waLeerExcel(f){ var r=new FileReader(); r.onload=function(e){ try{ var wb=XLSX.read(e.target.result,{type:'array'}); var rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:null}); var hdr=(rows[0]||[]).map(function(h){return(''+(h||'')).toLowerCase();}); var iN=hdr.findIndex(function(h){return h.indexOf('nombre')>=0;}); var iT=hdr.findIndex(function(h){return h.indexOf('tel')>=0;}); var iC=hdr.findIndex(function(h){return h.indexOf('correo')>=0||h.indexOf('mail')>=0;}); var iR=hdr.findIndex(function(h){return h.indexOf('rif')>=0;}); var iZ=hdr.findIndex(function(h){return h.indexOf('zona')>=0||h.indexOf('ubica')>=0||h.indexOf('ciudad')>=0||h.indexOf('estado')>=0;}); var iU=hdr.findIndex(function(h){return h.indexOf('unidad')>=0;}); var iCo=hdr.findIndex(function(h){return h.indexOf('compras')>=0;}); var iUl=hdr.findIndex(function(h){return h.indexOf('lt. compra')>=0||h.indexOf('ltima')>=0||h.indexOf('ult')>=0;}); var iP=hdr.findIndex(function(h){return h.indexOf('producto')>=0;}); var iX=hdr.findIndex(function(h){return h.indexOf('competidor')>=0;}); if(iN<0)iN=0; if(iT<0)iT=1; var out=[]; for(var k=1;k<rows.length;k++){ var row=rows[k]||[]; var nom=row[iN], tel=row[iT]; if(nom==null||(''+nom).trim()==='')continue; out.push({nombre:(''+nom).trim(),telefono:tel!=null?(''+tel).trim():'',correo:(iC>=0&&row[iC]!=null)?(''+row[iC]).trim():null,rif:(iR>=0&&row[iR]!=null)?(''+row[iR]).trim():null,zona:(iZ>=0&&row[iZ]!=null)?(''+row[iZ]).trim():null,unidades:(iU>=0&&row[iU]!=null)?row[iU]:null,compras:(iCo>=0&&row[iCo]!=null)?row[iCo]:null,ultima_compra:(iUl>=0&&row[iUl]!=null)?(''+row[iUl]).trim():null,productos:(iP>=0&&row[iP]!=null)?(''+row[iP]).trim():null,competidor:(iX>=0&&row[iX]!=null)?(''+row[iX]).trim():null}); } _waGuardar(out); }catch(err){ showToast('Error al leer: '+((err&&err.message)||'')); } }; r.readAsArrayBuffer(f); }
function _waGuardar(items){
  if(!items.length){ showToast('No encontré empresas (Nombre + Teléfono)'); return; }
  var byRif={}, existTel={};
  _waEmp.forEach(function(e){ var rf=(''+(e.rif||'')).replace(/[^A-Za-z0-9]/g,'').toUpperCase(); if(rf)byRif[rf]=e; var t=(''+(e.telefono||'')).replace(/[^\d]/g,''); if(t)existTel[t]=1; });
  var seen={}, ins=[], upd=[];
  items.forEach(function(it){
    var rf=(''+(it.rif||'')).replace(/[^A-Za-z0-9]/g,'').toUpperCase();
    var t=(''+(it.telefono||'')).replace(/[^\d]/g,'');
    var enr={ zona:(it.zona||null), unidades:(it.unidades!=null&&it.unidades!==''?parseInt(it.unidades)||0:null), compras:(it.compras!=null&&it.compras!==''?parseInt(it.compras)||0:null), ultima_compra:(it.ultima_compra||null), productos:(it.productos||null), competidor:(it.competidor||null) };
    if(rf){
      if(seen['R:'+rf])return; seen['R:'+rf]=1;
      var ex=byRif[rf];
      if(ex&&ex.id){ var u={id:ex.id, nombre:it.nombre}; for(var kk in enr){ if(enr[kk]!=null) u[kk]=enr[kk]; } if(!ex.correo&&it.correo)u.correo=it.correo; if(!ex.telefono&&it.telefono)u.telefono=it.telefono; upd.push(u); return; }
      ins.push({nombre:it.nombre,telefono:it.telefono||null,correo:it.correo||null,rif:it.rif||null,zona:enr.zona,unidades:enr.unidades,compras:enr.compras,ultima_compra:enr.ultima_compra,productos:enr.productos,competidor:enr.competidor,activo:true});
      byRif[rf]={id:null};
    } else {
      var key=t||(''+(it.nombre||'')).trim().toUpperCase(); if(!key||seen[key])return; seen[key]=1; if(t&&existTel[t])return;
      ins.push({nombre:it.nombre,telefono:it.telefono||null,correo:it.correo||null,rif:null,zona:enr.zona,unidades:enr.unidades,compras:enr.compras,ultima_compra:enr.ultima_compra,productos:enr.productos,competidor:enr.competidor,activo:true});
    }
  });
  if(!ins.length&&!upd.length){ showToast('Nada nuevo que cargar'); return; }
  showToast('Procesando '+(ins.length+upd.length)+'…');
  var CH=500, iDone=0, uDone=0, hadErr=false;
  function _fin(){ if(typeof logAudit==='function')logAudit('mensajes.import',iDone+' nuevas, '+uDone+' act.'); showToast((hadErr?'Con errores · ':'✓ ')+iDone+' agregadas, '+uDone+' actualizadas'); _waCargar(); }
  function _dU(i){ if(i>=upd.length){ _fin(); return; } var c=upd.slice(i,i+CH); supabaseClient.from('wa_empresas').upsert(c).then(function(r){ if(r&&r.error){hadErr=true;} else {uDone+=c.length;} _dU(i+CH); }); }
  function _dI(i){ if(i>=ins.length){ _dU(0); return; } var c=ins.slice(i,i+CH); supabaseClient.from('wa_empresas').insert(c).then(function(r){ if(r&&r.error){hadErr=true;} else {iDone+=c.length;} _dI(i+CH); }); }
  _dI(0);
}
/* ===================== CORREO (campañas de email · mailto) ===================== */
var _coPlant={
  promo4:{asunto:'Disponibilidad inmediata — Tigeciclina, Voriconazol, Caspofungina e Hidrocortisona',
    cuerpo:'Estimados señores:\n\nReciban un cordial saludo. Ponemos a su disposición la siguiente línea de productos inyectables de uso hospitalario, con disponibilidad inmediata y a precio mayorista:\n\n•  Tigeciclina 50 mg — polvo liofilizado para solución inyectable\n•  Hidrocortisona 500 mg — succinato de sodio para inyección\n•  Voriconazol 200 mg — polvo liofilizado para solución inyectable\n•  Caspofungina 50 mg — acetato, solución inyectable\n\nAdjuntamos imagen de la presentación. Con gusto le enviamos cotización formal según las cantidades de su interés; puede responder a este correo o contactarnos directamente.\n\nQuedamos a la orden para atenderle.'},
  presentacion:{asunto:'Presentación comercial — Distribución farmacéutica mayorista',
    cuerpo:'Estimados señores:\n\nNos dirigimos a ustedes para presentarnos como distribuidora mayorista de productos farmacéuticos. Trabajamos para ser un aliado confiable en el surtido de su farmacia, ofreciendo:\n\n•  Precios mayoristas competitivos\n•  Amplio catálogo con disponibilidad constante\n•  Atención personalizada y despacho oportuno\n\nCon gusto le haremos llegar nuestra información comercial y lista de productos. Si lo desea, indíquenos un contacto y coordinamos.\n\nAgradecemos su atención y quedamos atentos.'},
  catalogo:{asunto:'Acceso a nuestro catálogo en línea',
    cuerpo:'Estimados señores:\n\nCon gusto le ofrecemos acceso a nuestro catálogo en línea, con precios y disponibilidad actualizados.\n\nPara habilitar su cuenta, por favor respóndanos con:\n\n•  Correo electrónico de contacto\n•  RIF de la empresa\n\nUna vez recibidos sus datos, le enviaremos su usuario y contraseña para consultar el catálogo y realizar sus pedidos.\n\nQuedamos atentos y a su disposición.'},
  disponibilidad:{asunto:'Reingreso de productos — Disponibilidad actualizada',
    cuerpo:'Estimados señores:\n\nLe informamos que contamos con reingreso y disponibilidad actualizada de varios productos de alta rotación. Si desea recibir la lista con precios vigentes, con gusto se la hacemos llegar.\n\nPuede responder a este correo indicándonos los productos de su interés.\n\nQuedamos a la orden.'},
  seguimiento:{asunto:'Seguimiento a nuestra propuesta comercial',
    cuerpo:'Estimados señores:\n\nDamos seguimiento a la información comercial que le compartimos. Nos gustaría saber si tuvo oportunidad de revisarla y si podemos apoyarle con alguna cotización o pedido.\n\nQuedamos atentos a sus comentarios y con gusto le atendemos.'}
};
function _coCfgDefault(){ return {remitentes:[{id:'drogueria',marca:'Droguería Clínica',from_name:'Droguería Clínica'},{id:'biosintesis',marca:'Biosíntesis',from_name:'Biosíntesis'}],firma:'Atentamente,',promo_img:''}; }
function _coRem(){ var r=(_coCfg&&_coCfg.remitentes)||[]; return r.filter(function(x){return x.id===_coRemitente;})[0]||r[0]||{}; }
function _msgHeader(){
  var b=function(c,ic,tx){ var on=(_msgCanal===c); return '<button onclick="_msgSetCanal(\''+c+'\')" style="flex:1;border:1.5px solid '+(on?'var(--accent)':'var(--border)')+';background:'+(on?'var(--accent)':'transparent')+';color:'+(on?'#fff':'var(--muted)')+';border-radius:11px;padding:10px 8px;font-size:13px;font-weight:700;cursor:pointer">'+ic+' '+tx+'</button>'; };
  if(typeof currentRole!=='undefined'&&currentRole==='ventas'){ return '<div style="max-width:1240px;margin-bottom:14px;font-weight:800;font-size:17px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>Seguimiento de clientes</div>'; }
  return '<div style="display:flex;gap:8px;max-width:1240px;margin-bottom:14px">'+b('crm','🎯','Seguimiento')+b('mercado','📊','Mercado')+'</div>';
}
function _msgSetCanal(c){ _msgCanal=c; if(c==='wa'){ _waRender(); } else if(c==='crm'){ if(_waEmp.length)_crmRender(); else _crmCargar(function(){_crmRender();}); } else if(c==='mercado'){ if(!_mktStats)_mercadoCargar(); else _mercadoRender(); } else { if(!_coCfg){ _coCargar(); } else { _coRender(); } } }
function _coCargar(){
  supabaseClient.from('app_sections').select('data').eq('section_name','correo_cfg').maybeSingle().then(function(r){
    _coCfg=(r&&r.data&&r.data.data)||_coCfgDefault();
    if(!_coCfg.remitentes)_coCfg.remitentes=_coCfgDefault().remitentes;
    supabaseClient.from('correo_campanas').select('*').order('id',{ascending:false}).limit(10).then(function(rc){ _coHist=(rc&&rc.data)||[]; _coRender(); });
  });
}
function _coSetRem(id){ _coRemitente=id; _coRender(); }
function _coPlantilla(k){ var p=_coPlant[k]; if(!p)return; var a=document.getElementById('co-asunto'), m=document.getElementById('co-msg'); if(a)a.value=p.asunto; if(m)m.value=p.cuerpo; _coBtn(); }
function _coBtn(){ var b=document.getElementById('co-send'); if(!b)return; var n=Object.keys(_coSel).filter(function(k){return _coSel[k];}).length; var a=((document.getElementById('co-asunto')||{}).value||'').trim(); var m=((document.getElementById('co-msg')||{}).value||'').trim(); b.disabled=!(n>0&&a&&m); b.textContent='✉️ Abrir correo ('+n+')'; }
function _coTog(id){ _coSel[id]=!_coSel[id]; _coBtn(); var c=document.getElementById('co-cnt'); if(c){ var tot=_coFiltrados().length; c.textContent=Object.keys(_coSel).filter(function(k){return _coSel[k];}).length+' de '+tot+' seleccionadas'; } }
function _coTodos(v){ _coFiltrados().forEach(function(e){ _coSel[e.id]=v; }); _coRender(); }
function _coBuscar(v){ _coBus=(v||'').toLowerCase(); _coRenderLista(); }
function _coEmpConCorreo(){ return _waEmp.filter(function(e){ return e.correo && /@/.test(''+e.correo); }); }
function _coFirmaFinal(){ var rem=_coRem(); var f=(_coCfg&&_coCfg.firma)||'Atentamente,'; return '\n\n'+f+'\n'+(rem.from_name||rem.marca||''); }
function _coRender(){
  var el=document.getElementById('mensajes-content'); if(!el)return;
  if(!_coCfg){ el.innerHTML=_msgHeader()+'<div style="padding:24px;color:var(--muted)">Cargando…</div>'; return; }
  var inp='width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:14px';
  var rem=_coRem();
  var rems=((_coCfg.remitentes)||[]).map(function(r){ var on=(r.id===_coRemitente); return '<button onclick="_coSetRem(\''+r.id+'\')" style="border:1.5px solid '+(on?'var(--accent)':'var(--border)')+';background:'+(on?'rgba(37,99,235,.08)':'transparent')+';color:var(--text);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">'+esc(r.marca)+'</button>'; }).join('');
  var chips=[['promo4','💊 4 productos'],['presentacion','🤝 Presentación'],['catalogo','📋 Catálogo / Cuenta'],['disponibilidad','📦 Disponibilidad'],['seguimiento','🔁 Seguimiento']].map(function(p){ return '<button class="fchip" onclick="_coPlantilla(\''+p[0]+'\')">'+p[1]+'</button>'; }).join('');
  var tot=_coEmpConCorreo().length;
  var imgBtn='<button class="btn btn-ghost btn-sm" onclick="_coImagen()">📎 Imagen de productos</button>';
  el.innerHTML=_msgHeader()+
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#1E38A6,#2f52d0);display:grid;place-items:center;font-size:24px;flex:none;box-shadow:0 5px 16px rgba(30,56,166,.35)">✉️</div><div><div style="font-weight:800;font-size:17px;line-height:1.15">Campañas de Correo</div><div style="font-size:12px;color:var(--muted)">Se abre tu correo con el mensaje listo. Tú lo revisas, adjuntas la imagen y lo envías.</div></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr;gap:14px;max-width:1240px">'+
      '<div class="tbox" style="padding:16px;border-radius:14px">'+
        '<div style="font-weight:700;font-size:13px;margin-bottom:6px">🏷️ Firmar como</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+rems+'</div>'+
        '<div style="font-weight:700;font-size:13px;margin-bottom:6px">✍️ Asunto</div>'+
        '<input id="co-asunto" oninput="_coBtn()" placeholder="Asunto del correo" style="'+inp+';margin-bottom:10px">'+
        '<div class="fchips" style="margin-bottom:9px">'+chips+'</div>'+
        '<textarea id="co-msg" oninput="_coBtn()" placeholder="Escribe el mensaje… (o usa una plantilla)" style="'+inp+';min-height:170px;resize:vertical"></textarea>'+
        '<div style="font-size:11px;color:var(--muted);margin:8px 0 4px">Al final se agrega la firma: <b>'+esc((_coCfg.firma||'Atentamente,').replace(/\n/g,' '))+' '+esc(rem.from_name||rem.marca||'')+'</b></div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+
          '<button class="btn btn-ghost btn-sm" onclick="_coPreview()">👁️ Vista previa</button>'+
          imgBtn+
          '<button class="btn btn-ghost btn-sm" onclick="_coCopiarBcc()">📋 Copiar correos</button>'+
          '<button class="btn btn-ghost btn-sm" onclick="_coCopiarMsg()">📋 Copiar mensaje</button>'+
        '</div>'+
        '<button class="btn" onclick="_coAbrirGmail()" style="width:100%;margin-top:8px;background:#ea4335;color:#fff;padding:11px">📧 Abrir en Gmail</button>'+'<button class="btn btn-ghost btn-sm" id="co-send" onclick="_coAbrirCorreo()" disabled style="width:100%;margin-top:6px">✉️ Otra app de correo (mailto)</button>'+
        '<div style="font-size:10.5px;color:var(--muted);margin-top:7px;line-height:1.5">Se abre tu aplicación de correo con los destinatarios en <b>CCO</b> (ocultos entre sí), asunto y mensaje. <b>Recuerda adjuntar la imagen de los productos</b> antes de enviar. Si tu lista es muy grande y no se abre, usa <b>Copiar correos</b> y pégalos en CCO.</div>'+
      '</div>'+
      '<div class="tbox" style="padding:16px;border-radius:14px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px"><div style="font-weight:700;font-size:13px">📧 Farmacias con correo ('+tot+')</div>'+
          '<div style="display:flex;gap:6px"><button class="btn btn-ghost btn-sm" onclick="_msgExportExcel()">📊 Excel</button><button class="btn btn-ghost btn-sm" onclick="_coTodos(true)">✓ Todas</button><button class="btn btn-ghost btn-sm" onclick="_coTodos(false)">✗ Ninguna</button></div></div>'+
        _msgEstadoSelect(_coEmpConCorreo(),'_coSetZona')+_msgProdSelect('_coSetProd')+_msgOrdenToggle()+'<input placeholder="🔎 Buscar…" oninput="_coBuscar(this.value)" style="'+inp+';margin-bottom:8px">'+
        '<div id="co-cnt" style="font-size:11px;color:var(--muted);margin-bottom:8px">0 de '+_coFiltrados().length+' seleccionadas</div>'+
        '<div id="co-lista"></div>'+
      '</div>'+
      _coCfgEditorHTML()+
      (_coHist.length?('<div class="tbox" style="padding:16px;border-radius:14px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">📊 Últimas campañas de correo</div>'+_coHist.map(function(c){ var f=''; try{f=fmtDate((''+c.creado_en).slice(0,10));}catch(e){} return '<div style="border-top:1px solid var(--border);padding:8px 0;font-size:12px"><div style="display:flex;justify-content:space-between"><b>'+f+'</b><span style="color:var(--muted)">'+(c.total||0)+' farmacias</span></div><div style="color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.asunto||'')+'</div></div>'; }).join('')+'</div>'):'')+
    '</div>';
  _coRenderLista(); _coBtn();
}
function _coRenderLista(){
  var el=document.getElementById('co-lista'); if(!el)return;
  var base=_coEmpConCorreo();
  var arr=_coFiltrados();
  if(!base.length){ el.innerHTML='<div style="text-align:center;color:var(--muted);font-size:13px;padding:22px">Ninguna farmacia tiene correo cargado todavía. Importa la lista con columna <b>Correo</b> desde la pestaña de WhatsApp.</div>'; return; }
  if(!arr.length){ el.innerHTML='<div style="padding:14px;color:var(--muted);font-size:13px">Sin resultados.</div>'; return; }
  el.innerHTML='<div style="max-height:420px;overflow-y:auto">'+arr.map(function(e){ var sent=!!e.ultimo_correo; var f=''; if(sent){try{f=fmtDate((''+e.ultimo_correo).slice(0,10));}catch(x){}}
    return '<label style="display:flex;align-items:center;gap:11px;padding:9px 4px;border-bottom:1px solid var(--border);cursor:pointer">'+
      '<input type="checkbox" '+(_coSel[e.id]?'checked':'')+' onchange="_coTog('+e.id+')" style="width:18px;height:18px;flex:none">'+
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">'+esc(e.nombre||'')+'</div><div style="font-size:11px;color:var(--muted)">'+esc(e.correo||'')+(e.zona?' · '+esc(e.zona):'')+'</div>'+(e.unidades?'<div style="font-size:10px;color:var(--accent);font-weight:600">📦 '+_msgFmtU(e.unidades)+' u'+(e.productos?' · '+esc(e.productos):'')+'</div>':'')+'</div>'+
      (sent?('<span style="font-size:10px;font-weight:700;background:#e8f5e9;color:#2e7d32;padding:3px 8px;border-radius:999px;white-space:nowrap">✓ '+f+'</span>'):('<span style="font-size:10px;color:var(--amber);font-weight:600">Pendiente</span>'))+
    '</label>';
  }).join('')+'</div>';
}
function _coCfgEditorHTML(){
  var s='width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px;margin-bottom:6px';
  var rows=((_coCfg&&_coCfg.remitentes)||[]).map(function(r){
    return '<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px"><div style="font-weight:700;font-size:12px;color:var(--muted);margin-bottom:6px">Marca: '+esc(r.id)+'</div>'+
      '<label style="font-size:11px;color:var(--muted)">Nombre de la marca</label><input id="cocfg-'+r.id+'-name" value="'+esc(r.from_name||r.marca||'')+'" style="'+s+'"></div>';
  }).join('');
  return '<details class="tbox" style="padding:16px;border-radius:14px"><summary style="font-weight:700;font-size:13px;cursor:pointer">⚙️ Configuración (marcas, firma, imagen)</summary><div style="margin-top:10px">'+rows+
    '<label style="font-size:11px;color:var(--muted)">Firma (cierre del correo)</label><input id="cocfg-firma" value="'+esc((_coCfg&&_coCfg.firma)||'Atentamente,')+'" style="'+s+'">'+
    '<label style="font-size:11px;color:var(--muted)">URL de la imagen de productos (para adjuntar)</label><input id="cocfg-img" value="'+esc((_coCfg&&_coCfg.promo_img)||'')+'" placeholder="https://…/productos.jpg" style="'+s+'">'+
    '<button class="btn btn-accent btn-sm" onclick="_coGuardarCfg()">Guardar</button></div></details>';
}
function _coGuardarCfg(){
  if(!_coCfg)return;
  (_coCfg.remitentes||[]).forEach(function(r){ var n=document.getElementById('cocfg-'+r.id+'-name'); if(n){ r.from_name=n.value.trim(); r.marca=n.value.trim(); } });
  var fi=document.getElementById('cocfg-firma'); if(fi)_coCfg.firma=fi.value;
  var im=document.getElementById('cocfg-img'); if(im)_coCfg.promo_img=im.value.trim();
  supabaseClient.from('app_sections').update({data:_coCfg}).eq('section_name','correo_cfg').then(function(res){
    if(res&&res.error){ showToast('Error al guardar: '+(res.error.message||'')); return; }
    showToast('✓ Configuración guardada'); if(typeof logAudit==='function')logAudit('correo.cfg','config'); _coRender();
  });
}
function _coImagen(){ var src=(_coCfg&&_coCfg.promo_img)?_coCfg.promo_img:_PROMO_IMG; try{ var a=document.createElement('a'); a.href=src; a.download='productos_biosintesis.jpg'; document.body.appendChild(a); a.click(); document.body.removeChild(a); showToast('Descargando imagen para adjuntar 📎'); }catch(e){ window.open(src,'_blank'); } }
function _coCopiar(txt,msg){ try{ navigator.clipboard.writeText(txt).then(function(){ showToast(msg); },function(){ _coCopiarFallback(txt,msg); }); }catch(e){ _coCopiarFallback(txt,msg); } }
function _coCopiarFallback(txt,msg){ var t=document.createElement('textarea'); t.value=txt; document.body.appendChild(t); t.select(); try{document.execCommand('copy'); showToast(msg);}catch(e){showToast('No se pudo copiar');} document.body.removeChild(t); }
function _coDestinatarios(){ var sel=Object.keys(_coSel).filter(function(k){return _coSel[k];}).map(Number); return _coEmpConCorreo().filter(function(e){ return sel.indexOf(e.id)>=0; }); }
function _coCopiarBcc(){ var d=_coDestinatarios(); if(!d.length){ showToast('Selecciona farmacias'); return; } _coCopiar(d.map(function(e){return (''+e.correo).trim();}).join(', '), '✓ '+d.length+' correos copiados'); }
function _coCopiarMsg(){ var cuerpo=((document.getElementById('co-msg')||{}).value||'').trim(); if(!cuerpo){ showToast('Escribe el mensaje'); return; } _coCopiar(cuerpo+_coFirmaFinal(), '✓ Mensaje copiado'); }
function _coPreview(){
  var rem=_coRem(); var asunto=((document.getElementById('co-asunto')||{}).value||'').trim(); var cuerpo=((document.getElementById('co-msg')||{}).value||'').trim();
  if(!cuerpo){ showToast('Escribe el mensaje primero'); return; }
  var full=cuerpo+_coFirmaFinal();
  var _pimg=(_coCfg&&_coCfg.promo_img)?_coCfg.promo_img:_PROMO_IMG; var img='<div style="margin-top:16px"><img src="'+_pimg+'" style="max-width:100%;border-radius:10px" alt="productos"></div>';
  var w=window.open('','co_preview','width=640,height=760'); if(!w){ showToast('Permite las ventanas emergentes'); return; }
  w.document.write('<title>Vista previa</title><div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:24px auto;padding:0 16px;color:#1f2937"><div style="font-size:13px;color:#6b7280">Asunto</div><div style="font-weight:700;font-size:16px;margin-bottom:14px">'+esc(asunto||'(sin asunto)')+'</div><div style="white-space:pre-wrap;font-size:14px;line-height:1.6">'+esc(full)+'</div>'+img+'</div>');
  w.document.close();
}
function _coAbrirCorreo(){
  var rem=_coRem();
  var asunto=((document.getElementById('co-asunto')||{}).value||'').trim();
  var cuerpo=((document.getElementById('co-msg')||{}).value||'').trim();
  var dest=_coDestinatarios();
  if(!dest.length){ showToast('Selecciona farmacias'); return; }
  if(!asunto||!cuerpo){ showToast('Falta asunto o mensaje'); return; }
  var bccs=dest.map(function(e){return (''+e.correo).trim();}).join(',');
  var body=cuerpo+_coFirmaFinal()+'\n';
  var url='mailto:?bcc='+encodeURIComponent(bccs)+'&subject='+encodeURIComponent(asunto)+'&body='+encodeURIComponent(body);
  if(url.length>1900){ if(!confirm('La lista es grande y tu correo podría no abrirse completo.\n\nRecomendado: usa "Copiar correos" y pégalos en CCO.\n\n¿Intentar abrir de todos modos?')){ return; } }
  _coLog(dest,asunto,cuerpo,rem);
  showToast('Abriendo tu correo… recuerda adjuntar la imagen 📎');
  window.location.href=url;
}

function _coLog(dest,asunto,cuerpo,rem){
  supabaseClient.from('correo_campanas').insert([{asunto:asunto,cuerpo:cuerpo,remitente:rem.id,total:dest.length,enviados:dest.length,autor:(typeof currentUser!=='undefined'?currentUser:null)}]).select().then(function(rc){
    var campId=(rc&&rc.data&&rc.data[0]&&rc.data[0].id)||null;
    var ids=dest.map(function(e){return e.id;});
    var envRows=dest.map(function(e){ return {campana_id:campId,empresa_id:e.id,correo:(''+e.correo).trim(),estado:'abierto',autor:(typeof currentUser!=='undefined'?currentUser:null)}; });
    supabaseClient.from('correo_envios').insert(envRows).then(function(){});
    _msgAvanzarContacto(ids,'co'); supabaseClient.from('wa_empresas').update({ultimo_correo:new Date().toISOString()}).in('id',ids).then(function(){ if(typeof logAudit==='function')logAudit('correo.envio',dest.length+' farmacias'); _coSel={}; _coCargar(); });
  });
}
function _coAbrirGmail(){
  var rem=_coRem();
  var asunto=((document.getElementById('co-asunto')||{}).value||'').trim();
  var cuerpo=((document.getElementById('co-msg')||{}).value||'').trim();
  var dest=_coDestinatarios();
  if(!dest.length){ showToast('Selecciona farmacias'); return; }
  if(!asunto||!cuerpo){ showToast('Falta asunto o mensaje'); return; }
  var bccs=dest.map(function(e){return (''+e.correo).trim();}).join(',');
  var body=cuerpo+_coFirmaFinal()+'\n';
  var url='https://mail.google.com/mail/?view=cm&fs=1&bcc='+encodeURIComponent(bccs)+'&su='+encodeURIComponent(asunto)+'&body='+encodeURIComponent(body);
  _coLog(dest,asunto,cuerpo,rem);
  showToast('Abriendo Gmail… recuerda adjuntar la imagen 📎');
  var w=window.open(url,'_blank'); if(!w){ showToast('Permite las ventanas emergentes para abrir Gmail'); }
}
function _msgExportExcel(){
  if(!_waEmp.length){ showToast('No hay empresas cargadas'); return; }
  showToast('Generando Excel…');
  _retoLoadExcelJS(function(ok){
    if(!ok||!window.ExcelJS){ showToast('No se pudo cargar el generador de Excel'); return; }
    var wb=new ExcelJS.Workbook(); wb.creator='Claret';
    var ws=wb.addWorksheet('Contactos',{views:[{state:'frozen',ySplit:1}]});
    ws.columns=[{header:'Farmacia',key:'n',width:38},{header:'Etapa',key:'et',width:15},{header:'Zona',key:'es',width:22},{header:'Teléfono',key:'t',width:15},{header:'Correo',key:'c',width:30},{header:'WhatsApp',key:'wa',width:12},{header:'Correo enviado',key:'co',width:14},{header:'Próx. seguimiento',key:'seg',width:16},{header:'Notas',key:'no',width:42}];
    var hr=ws.getRow(1); hr.height=22; hr.eachCell(function(c){ c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1E38A6'}}; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; });
    var arr=_waEmp.slice().sort(function(a,b){ return (Number(b.unidades)||0)-(Number(a.unidades)||0); });
    arr.forEach(function(e,i){ var z=(''+(e.zona||'')).split('/'); var waf=e.ultimo_envio?(''+e.ultimo_envio).slice(0,10):''; var cof=e.ultimo_correo?(''+e.ultimo_correo).slice(0,10):'';
      var row=ws.addRow({n:e.nombre||'',et:_crmEt(e),es:(e.zona||''),t:e.telefono||'',c:e.correo||'',wa:(waf||'—'),co:(cof||'—'),seg:(e.seguimiento?(''+e.seguimiento).slice(0,10):''),no:e.notas||''});
      if(i%2===1){ row.eachCell(function(c){ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F4F6'}}; }); }
      row.getCell('wa').font={color:{argb:(waf?'FF166534':'FF9CA3AF')},bold:!!waf};
      row.getCell('co').font={color:{argb:(cof?'FF166534':'FF9CA3AF')},bold:!!cof};
    });
    ws.autoFilter='A1:I1';
    wb.xlsx.writeBuffer().then(function(buf){ var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='contactos_claret_'+((typeof HOY==='function')?HOY():'')+'.xlsx'; a.click(); setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(e){}},3000); showToast('✓ Excel descargado'); if(typeof logAudit==='function')logAudit('mensajes.export_excel',_waEmp.length+' contactos'); }).catch(function(e){ showToast('Error: '+((e&&e.message)||e)); });
  });
}
/* ===================== CRM · Seguimiento de ventas (Nilsa) ===================== */
var _crmEtF='', _crmBus='', _crmFicha=null, _crmTplSel='promo4';
var _crmTpls=[['promo4','💊 4 productos'],['presentacion','🤝 Presentación'],['catalogo','📋 Catálogo'],['disponibilidad','📦 Disponibilidad'],['seguimiento','🔁 Seguimiento']];
function _crmSelTpl(k){ _crmTplSel=k; _crmFichaRender(); }
function _msgShareWA(text,num){ try{ fetch(_PROMO_IMG).then(function(r){return r.blob();}).then(function(blob){ var file=new File([blob],'productos_biosintesis.jpg',{type:blob.type||'image/jpeg'}); if(navigator.canShare && navigator.canShare({files:[file]})){ navigator.share({files:[file],text:text}).catch(function(){}); } else { if(num) window.open('https://wa.me/'+num+'?text='+encodeURIComponent(text),'_blank'); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},1500); if(typeof showToast==='function')showToast('Imagen descargada — adjúntala en WhatsApp'); } }).catch(function(){ if(num) window.open('https://wa.me/'+num+'?text='+encodeURIComponent(text),'_blank'); }); }catch(e){ if(num) window.open('https://wa.me/'+num+'?text='+encodeURIComponent(text),'_blank'); } }
function _crmTplLabel(k){ var x=_crmTpls.filter(function(t){return t[0]===k;})[0]; return x?x[1]:k; }
function _crmProxSeg(){ var base=new Date(((typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10))+'T12:00:00'); var added=0; while(added<5){ base.setDate(base.getDate()+1); var dow=base.getDay(); if(dow!==0&&dow!==6)added++; } return base.toISOString().slice(0,10); }
function _crmSendWA(id){ var e=_waEmp.filter(function(x){return x.id===id;})[0]; if(!e)return; var num=(''+(e.telefono||'')).replace(/[^\d+]/g,''); if(!num){ showToast('Sin teléfono'); return; } var msg=(_waPlant&&_waPlant[_crmTplSel])||''; var prod=(''+(e.productos||'')).split(',')[0].trim(); msg=msg.replace(/\{producto\}/gi, prod||'estos productos').replace(/\{farmacia\}/gi, e.nombre||''); _msgAvanzarContacto([id],'wa'); var _lbl=_crmTplLabel(_crmTplSel),_now=new Date().toISOString(); e.ultimo_msg='📱 '+_lbl; e.ultimo_msg_fecha=_now; if(!Array.isArray(e.historial))e.historial=[]; e.historial.unshift({c:'wa',t:_lbl,f:_now}); if(e.historial.length>50)e.historial=e.historial.slice(0,50); var _seg=_crmProxSeg(); e.seguimiento=_seg; supabaseClient.from('wa_empresas').update({ultimo_envio:_now,ultimo_msg:e.ultimo_msg,ultimo_msg_fecha:_now,historial:e.historial,seguimiento:_seg}).eq('id',id).then(function(){}); if(typeof logAudit==='function')logAudit('crm.wa',e.nombre||''); var withImg=(typeof _PROMO_IMG!=='undefined'&&_PROMO_IMG&&(_crmTplSel==='promo4'||_crmTplSel==='disponibilidad')); if(withImg){ _msgShareWA(msg,num); } else { window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank'); } _crmFichaRender(); }
function _crmSendGmail(id){ var e=_waEmp.filter(function(x){return x.id===id;})[0]; if(!e)return; if(!e.correo){ showToast('Sin correo'); return; } var p=(_coPlant&&_coPlant[_crmTplSel])||{asunto:'',cuerpo:''}; var firma=(typeof _coFirmaFinal==='function')?_coFirmaFinal():''; var body=(p.cuerpo||'')+firma; var url='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(e.correo)+'&su='+encodeURIComponent(p.asunto||'')+'&body='+encodeURIComponent(body); _msgAvanzarContacto([id],'co'); var _lbl=_crmTplLabel(_crmTplSel),_now=new Date().toISOString(); e.ultimo_msg='✉️ '+_lbl; e.ultimo_msg_fecha=_now; if(!Array.isArray(e.historial))e.historial=[]; e.historial.unshift({c:'co',t:_lbl,f:_now}); if(e.historial.length>50)e.historial=e.historial.slice(0,50); var _seg=_crmProxSeg(); e.seguimiento=_seg; supabaseClient.from('wa_empresas').update({ultimo_correo:_now,ultimo_msg:e.ultimo_msg,ultimo_msg_fecha:_now,historial:e.historial,seguimiento:_seg}).eq('id',id).then(function(){}); if(typeof logAudit==='function')logAudit('crm.correo',e.nombre||''); window.open(url,'_blank'); _crmFichaRender(); }
var CRM_ET=[{k:'Pendiente',c:'#94a3b8',ic:'⚪'},{k:'Contactado',c:'#3b82f6',ic:'📨'},{k:'Interesado',c:'#8b5cf6',ic:'👀'},{k:'Negociando',c:'#f59e0b',ic:'🤝'},{k:'Cliente',c:'#16a34a',ic:'⭐'},{k:'No interesado',c:'#ef4444',ic:'🚫'}];
function _crmCol(et){ var x=CRM_ET.filter(function(e){return e.k===et;})[0]; return x?x.c:'#94a3b8'; }
function _crmIc(et){ var x=CRM_ET.filter(function(e){return e.k===et;})[0]; return x?x.ic:'⚪'; }
function _crmEt(e){ return (e.estado&&(''+e.estado).trim())?e.estado:'Pendiente'; }
var _crmCargado=false, _crmCargaErr=false;
function _crmCargar(cb){ supabaseClient.from('wa_empresas').select('*').eq('activo',true).order('nombre').then(function(r){ _waEmp=(r&&r.data)||[]; _crmCargado=true; _crmCargaErr=!!(r&&r.error); if(cb)cb(); }).catch(function(){ _waEmp=_waEmp||[]; _crmCargado=true; _crmCargaErr=true; if(cb)cb(); }); }
function _crmReintentar(){ _crmCargado=false; _crmCargaErr=false; _crmRender(); }
var _crmProdF='', _crmVenc=null;
var _CRM_MAP=[{k:'hidrocortisona',n:'Hidrocortisona'},{k:'voriconazol',n:'Voriconazol'},{k:'tigeciclina',n:'Tigeciclina'},{k:'togeciclina',n:'Tigeciclina'},{k:'caspofungina',n:'Caspofungina'},{k:'capofungina',n:'Caspofungina'}];
function _crmVencCargar(cb){
  if(_crmVenc){ if(cb)cb(); return; }
  _crmVenc=[];
  supabaseClient.from('lotes_vencimiento').select('descripcion,codigo,cantidad,fecha_venc').then(function(r){
    var lotes=(r&&r.data)||[]; if(!lotes.length){ if(cb)cb(); return; }
    supabaseClient.from('productos').select('descripcion,prom_mensual').then(function(rp){
      var pm={}; ((rp&&rp.data)||[]).forEach(function(p){ var k=_venKey(p.descripcion); if(k)pm[k]=Number(p.prom_mensual)||0; });
      var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10);
      lotes.forEach(function(l){
        var nom=l.descripcion||''; if(!nom)return;
        var m=(typeof _venMeses==='function')?_venMeses(l.fecha_venc):null; if(m==null||m<0)return;
        var cant=Number(l.cantidad)||0; var prom=pm[_venKey(nom)]||0;
        var riesgo=Math.max(0, Math.round(cant-prom*m)); if(riesgo<=0)return;
        var low=nom.toLowerCase(); var fam='';
        for(var i=0;i<_CRM_MAP.length;i++){ if(low.indexOf(_CRM_MAP[i].k)>=0){ fam=_CRM_MAP[i].n; break; } }
        _crmVenc.push({nom:nom,riesgo:riesgo,meses:m,fam:fam,venc:l.fecha_venc});
      });
      _crmVenc.sort(function(a,b){ if(!!b.fam!==!!a.fam) return b.fam?1:-1; return a.meses-b.meses; });
      if(cb)cb();
    }).catch(function(){ if(cb)cb(); });
  }).catch(function(){ if(cb)cb(); });
}
function _crmOportHTML(){
  if(!_crmVenc) return '<div id="crm-oport"></div>';
  var conFam=_crmVenc.filter(function(x){return x.fam;});
  if(!conFam.length) return '<div id="crm-oport"></div>';
  var byFam={}; conFam.forEach(function(x){ (byFam[x.fam]=byFam[x.fam]||[]).push(x); });
  var cards=Object.keys(byFam).map(function(fam){
    var arr=byFam[fam]; var tot=arr.reduce(function(a,x){return a+x.riesgo;},0);
    var urg=Math.min.apply(null,arr.map(function(x){return x.meses;}));
    var n=_waEmp.filter(function(e){ return (''+(e.productos||'')).toLowerCase().indexOf(fam.toLowerCase())>=0; }).length;
    var col=urg<=1?'#dc2626':(urg<=3?'#d97706':'#4F46E5');
    var on=(_crmProdF===fam);
    return '<div onclick="_crmSetProdF(\''+fam+'\')" style="flex:1;min-width:180px;border:2px solid '+(on?col:'var(--border)')+';background:'+(on?col:'var(--surface)')+';color:'+(on?'#fff':'var(--text)')+';border-radius:14px;padding:12px;cursor:pointer">'+
      '<div style="font-weight:800;font-size:14px">'+esc(fam)+'</div>'+
      '<div style="font-size:19px;font-weight:900;color:'+(on?'#fff':col)+'">'+tot.toLocaleString('es-VE')+' u</div>'+
      '<div style="font-size:11px;opacity:'+(on?'.95':'.7')+'">en riesgo · vence en '+(urg<1?'menos de 1 mes':(Math.round(urg)+' mes'+(Math.round(urg)>1?'es':'')))+'</div>'+
      '<div style="font-size:11px;font-weight:700;margin-top:4px;color:'+(on?'#fff':'var(--accent)')+'">'+n.toLocaleString('es-VE')+' farmacias lo compran →</div>'+
    '</div>';
  }).join('');
  return '<div id="crm-oport" class="tbox" style="padding:14px;margin-bottom:14px;border-left:4px solid #dc2626">'+
    '<div style="font-weight:800;font-size:14px;margin-bottom:2px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M12 22c4 0 7-2.7 7-6.5 0-4.5-4-6-4-9.5-3 1.5-4 4-4 6 0-1-1-2.5-2-3-1 2-2 4-2 6.5C7 19.3 8 22 12 22z"/></svg>Oportunidades — productos por vencer</div>'+
    '<div style="font-size:11.5px;color:var(--muted);margin-bottom:9px">Estos se van a vencer y sabemos quién los compra. Toca uno para ver solo esas farmacias.'+(_crmProdF?' <b style="color:var(--accent)">Filtrando: '+esc(_crmProdF)+'</b> · <a href="#" onclick="_crmSetProdF(\'\');return false;">quitar filtro</a>':'')+'</div>'+
    '<div style="display:flex;gap:9px;flex-wrap:wrap">'+cards+'</div></div>';
}
function _crmSetProdF(f){ _crmProdF=(_crmProdF===f)?'':f; _crmRender(); }
function _crmFiltrados(){ return _waEmp.filter(function(e){ if(_crmProdF && (''+(e.productos||'')).toLowerCase().indexOf(_crmProdF.toLowerCase())<0)return false; if(_crmEtF && _crmEt(e)!==_crmEtF)return false; if(_msgZona && _msgEstado(e.zona)!==_msgZona)return false; if(!_crmBus)return true; return ((e.nombre||'')+' '+(e.correo||'')+' '+(e.telefono||'')+' '+(e.rif||'')+' '+(e.zona||'')).toLowerCase().indexOf(_crmBus)>=0; }); }
function _crmSegHoy(){ var hoy=(typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); return _waEmp.filter(function(e){ var et=_crmEt(e); return e.seguimiento && (''+e.seguimiento).slice(0,10)<=hoy && et!=='Cliente' && et!=='No interesado'; }).sort(function(a,b){ return (''+a.seguimiento).localeCompare(''+b.seguimiento); }); }
function _crmSetEtF(v){ _crmEtF=v; _crmRender(); }
function _crmSetBus(v){ _crmBus=(v||'').toLowerCase(); var l=document.getElementById('crm-lista'); if(l)l.innerHTML=_crmListaHTML(); }
function _crmSetZona(v){ _msgZona=v; _crmRender(); }
function _crmRender(){
  var el=document.getElementById('mensajes-content'); if(!el)return;
  if(!_waEmp.length){
    if(_crmCargado){ // ya se consultó: no reintentar en bucle
      el.innerHTML=_msgHeader()+'<div class="tbox" style="padding:28px;text-align:center"><div style="font-size:32px">'+(_crmCargaErr?'⚠️':'📇')+'</div>'+
        '<div style="font-weight:700;margin-top:6px">'+(_crmCargaErr?'No pude cargar los contactos':'Todavía no hay contactos')+'</div>'+
        '<div style="color:var(--muted);font-size:12.5px;margin-top:4px">'+(_crmCargaErr?'Revisa tu conexión e inténtalo de nuevo.':'Agrega empresas para empezar el seguimiento.')+'</div>'+
        '<button class="btn btn-accent btn-sm" style="margin-top:12px" onclick="_crmReintentar()">🔄 Reintentar</button></div>';
      return;
    }
    el.innerHTML=_msgHeader()+'<div style="padding:24px;color:var(--muted)">Cargando…</div>'; _crmCargar(function(){ _crmRender(); }); return;
  }
  if(!_crmVenc){ _crmVencCargar(function(){ _crmRender(); }); }
  var tot=_waEmp.length;
  var cont=0,inte=0,cli=0; _waEmp.forEach(function(e){ var et=_crmEt(e); if(et!=='Pendiente')cont++; if(et==='Interesado'||et==='Negociando')inte++; if(et==='Cliente')cli++; });
  var pctC=tot?Math.round(cont/tot*100):0;
  function kpi(lbl,val,sub,grad){ var _c={'linear-gradient(135deg,#3b82f6,#06b6d4)':'#1E38A6','linear-gradient(135deg,#8b5cf6,#d946ef)':'#7C3AED','linear-gradient(135deg,#16a34a,#84cc16)':'#079455'}[grad]||'var(--text)'; return '<div style="flex:1;min-width:150px;background:linear-gradient(160deg,#fff,#FCFCFD);border:1px solid rgba(16,24,40,.07);border-radius:13px;padding:14px 15px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 6px 16px -6px rgba(16,24,40,.10),inset 0 1px 0 #fff"><div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+lbl+'</div><div style="font-size:23px;font-weight:600;letter-spacing:-.5px;font-variant-numeric:tabular-nums;line-height:1.15;margin-top:4px;color:'+_c+'">'+val+'</div><div style="font-size:11px;color:var(--muted);margin-top:1px">'+sub+'</div></div>'; }
  var kpis='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">'+
    kpi('Contactos',_msgFmtU(tot),'en tu cartera','linear-gradient(135deg,#6366f1,#8b5cf6)')+
    kpi('Contactadas',cont+' · '+pctC+'%','ya les escribiste','linear-gradient(135deg,#3b82f6,#06b6d4)')+
    kpi('Interesadas',inte,'en conversación','linear-gradient(135deg,#8b5cf6,#d946ef)')+
    kpi('Clientes',cli,'ya compran','linear-gradient(135deg,#16a34a,#84cc16)')+
    '</div>';
  // embudo
  var maxE=Math.max.apply(null,CRM_ET.map(function(et){ return _waEmp.filter(function(e){return _crmEt(e)===et.k;}).length; }).concat([1]));
  var funnel=CRM_ET.map(function(et){ var n=_waEmp.filter(function(e){return _crmEt(e)===et.k;}).length; var w=Math.round(n/maxE*100); var on=(_crmEtF===et.k); return '<div onclick="_crmSetEtF(\''+(on?'':et.k)+'\')" style="display:flex;align-items:center;gap:10px;margin-bottom:6px;cursor:pointer;'+(on?'font-weight:800':'')+'"><span style="width:110px;font-size:12px;color:var(--text)">'+et.ic+' '+et.k+'</span><div style="flex:1;background:var(--surface2);border-radius:6px;height:20px;overflow:hidden;position:relative"><div style="height:100%;width:'+Math.max(w,n?6:0)+'%;background:'+et.c+';border-radius:6px;transition:width .5s"></div></div><span style="width:42px;text-align:right;font-weight:700;font-size:13px">'+n+'</span></div>'; }).join('');
  var funnelCard='<div class="tbox" style="padding:14px;margin-bottom:14px"><div style="font-weight:700;font-size:13px;margin-bottom:10px">🎯 Embudo de ventas '+(_crmEtF?('· filtro: <b>'+esc(_crmEtF)+'</b> <button onclick="_crmSetEtF(\'\')" style="border:0;background:none;color:var(--accent);cursor:pointer;font-size:11px">(quitar)</button>'):'')+'</div>'+funnel+'</div>';
  // seguimientos hoy
  var seg=_crmSegHoy();
  var segCard='';
  if(seg.length){ segCard='<div class="tbox" style="padding:14px;margin-bottom:14px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fdba74"><div style="font-weight:800;font-size:14px;color:#9a3412;margin-bottom:8px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>Seguimientos de hoy ('+seg.length+')</div>'+seg.slice(0,8).map(function(e){ return '<div onclick="_crmFichaOpen('+e.id+')" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-top:1px solid rgba(154,52,18,.15);cursor:pointer"><div style="min-width:0"><div style="font-weight:700;font-size:13px;color:#7c2d12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_crmIc(_crmEt(e))+' '+esc(e.nombre||'')+'</div><div style="font-size:11px;color:#9a3412">'+esc((''+(e.seguimiento||'')).slice(0,10))+(e.notas?(' · '+esc((''+e.notas).slice(0,40))):'')+'</div></div><span style="font-size:16px">→</span></div>'; }).join('')+'</div>'; }
  // filtros + lista
  var inp='padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:14px;width:100%;box-sizing:border-box';
  var filtros='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;max-width:1240px">'+_msgEstadoSelect(_waEmp,'_crmSetZona').replace('margin-bottom:8px','margin-bottom:0;max-width:220px')+'<input placeholder="🔎 Buscar farmacia…" oninput="_crmSetBus(this.value)" style="'+inp+';flex:1;min-width:180px"></div>';
  var el2=el;
  el2.innerHTML=_msgHeader()+
    '<div style="max-width:1240px">'+
    '<div style="margin-bottom:16px"><div style="font-size:18px;font-weight:600;letter-spacing:-.3px;color:var(--text)">Seguimiento de ventas</div><div style="font-size:12px;color:var(--muted);margin-top:2px">'+_waEmp.length.toLocaleString('es-VE')+' farmacias en tu cartera · etapa por etapa</div></div>'+
    kpis+_crmOportHTML()+segCard+funnelCard+filtros+
    '<div id="crm-lista">'+_crmListaHTML()+'</div>'+
    '</div>';
}
function _crmListaHTML(){
  var arr=_crmFiltrados();
  if(!arr.length) return '<div class="tbox" style="padding:20px;text-align:center;color:var(--muted)">Sin farmacias con ese filtro.</div>';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">'+arr.slice(0,300).map(function(e){ var et=_crmEt(e); var col=_crmCol(et);
    return '<div onclick="_crmFichaOpen('+e.id+')" style="background:var(--surface);border:1px solid var(--border);border-left:4px solid '+col+';border-radius:12px;padding:11px 12px;cursor:pointer">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px"><div style="font-weight:700;font-size:13px;line-height:1.2;min-width:0">'+esc(e.nombre||'')+'</div><span style="flex:none;font-size:9px;font-weight:800;color:#fff;background:'+col+';padding:2px 7px;border-radius:999px;white-space:nowrap">'+_crmIc(et)+' '+et+'</span></div>'+
      '<div style="font-size:11px;color:var(--muted);margin-top:4px">'+esc(_msgEstado(e.zona)||'')+(e.unidades?(' · 📦 '+_msgFmtU(e.unidades)+'u'):'')+'</div>'+
      '<div style="display:flex;gap:6px;margin-top:6px">'+(e.telefono?'<span style="font-size:14px" title="WhatsApp">📱</span>':'')+(e.correo?'<span style="font-size:14px" title="Correo">✉️</span>':'')+(e.ultimo_msg?'<span style="font-size:10px;color:var(--green);font-weight:600">'+esc(e.ultimo_msg)+'</span>':(e.ultimo_envio||e.ultimo_correo?'<span style="font-size:10px;color:var(--green);font-weight:700">✓ contactada</span>':''))+(e.seguimiento?'<span style="font-size:10px;color:var(--amber);margin-left:auto">🔔 '+esc((''+e.seguimiento).slice(5,10))+'</span>':'')+'</div>'+
    '</div>';
  }).join('')+'</div>'+(arr.length>300?'<div style="text-align:center;color:var(--muted);font-size:11px;margin-top:8px">Mostrando 300 de '+arr.length+'. Usa los filtros para acotar.</div>':'');
}
function _crmFichaOpen(id){ _crmFicha=_waEmp.filter(function(e){return e.id===id;})[0]||null; if(!_crmFicha)return; _crmFichaRender(); }
function _crmFichaCerrar(){ var o=document.getElementById('crm-ov'); if(o)o.remove(); _crmFicha=null; _crmRender(); }
function _crmFichaRender(){
  var e=_crmFicha; if(!e)return;
  var old=document.getElementById('crm-ov'); if(old)old.remove();
  var et=_crmEt(e); var col=_crmCol(et);
  var inp='padding:9px 11px;border:1.5px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:14px;width:100%;box-sizing:border-box';
  var num=(''+(e.telefono||'')).replace(/[^\d+]/g,'');
  var opts=CRM_ET.map(function(x){ return '<option value="'+x.k+'"'+(x.k===et?' selected':'')+'>'+x.ic+' '+x.k+'</option>'; }).join('');
  var info=function(l,v){ return v?('<div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">'+l+'</div><div style="font-size:13px;font-weight:600">'+v+'</div></div>'):''; };
  var ov=document.createElement('div'); ov.id='crm-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:400;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
  ov.onclick=function(ev){ if(ev.target===ov)_crmFichaCerrar(); };
  ov.innerHTML='<div style="background:var(--bg);max-width:560px;width:100%;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4);margin:auto 0">'+
    '<div style="background:linear-gradient(135deg,'+col+',#0f172a);padding:18px 20px;color:#fff"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><div style="font-size:11px;opacity:.85;font-weight:700">'+_crmIc(et)+' '+et+'</div><div style="font-size:19px;font-weight:800;line-height:1.15;margin-top:2px">'+esc(e.nombre||'')+'</div><div style="font-size:12px;opacity:.9;margin-top:2px">'+esc(e.rif||'')+(e.zona?(' · '+esc(e.zona)):'')+'</div></div><button onclick="_crmFichaCerrar()" style="border:0;background:rgba(255,255,255,.2);color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;flex:none">×</button></div></div>'+
    '<div style="padding:18px 20px">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'+info('Teléfono',esc(e.telefono||'—'))+info('Correo',esc(e.correo||'—'))+info('Productos que compra',esc(e.productos||'—'))+info('Volumen',e.unidades?('📦 '+_msgFmtU(e.unidades)+' u'):'—')+info('Competidor actual',esc(e.competidor||'—'))+info('Historial',((e.ultimo_envio?('WA '+(''+e.ultimo_envio).slice(0,10)):'')+(e.ultimo_correo?(' · Correo '+(''+e.ultimo_correo).slice(0,10)):''))||'Sin contactar')+info('Último mensaje enviado', e.ultimo_msg?(esc(e.ultimo_msg)+(e.ultimo_msg_fecha?(' · '+(''+e.ultimo_msg_fecha).slice(0,10)):'')):'')+'</div>'+_crmHistHTML(e)+
      '<div style="background:var(--surface2);border-radius:12px;padding:12px;margin-bottom:16px">'+'<div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin-bottom:6px">MENSAJE PREHECHO</div>'+'<div style="margin-bottom:8px">'+_crmTpls.map(function(tp){ var on=(tp[0]===_crmTplSel); return '<button onclick="_crmSelTpl(\''+tp[0]+'\')" style="border:1px solid '+(on?'var(--accent)':'var(--border)')+';background:'+(on?'var(--accent)':'transparent')+';color:'+(on?'#fff':'var(--muted)')+';border-radius:999px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;margin:0 4px 4px 0">'+tp[1]+'</button>'; }).join('')+'</div>'+'<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px;font-size:12px;color:var(--text);white-space:pre-wrap;max-height:130px;overflow:auto;margin-bottom:6px;line-height:1.4">'+esc(((_waPlant&&_waPlant[_crmTplSel])||'').replace(/\{producto\}/gi,((''+(e.productos||'')).split(',')[0].trim())||'estos productos').replace(/\{farmacia\}/gi,e.nombre||''))+'</div>'+'<div style="font-size:10px;color:var(--muted);margin-bottom:8px">Así va por WhatsApp. En correo se envía una versión formal del mismo tema.</div>'+'<div style="display:flex;gap:8px">'+(num?'<button onclick="_crmSendWA('+e.id+')" style="flex:1;background:#25D366;color:#fff;font-weight:700;border:0;border-radius:10px;padding:11px;font-size:13px;cursor:pointer">📱 WhatsApp</button>':'')+(e.correo?'<button onclick="_crmSendGmail('+e.id+')" style="flex:1;background:#ea4335;color:#fff;font-weight:700;border:0;border-radius:10px;padding:11px;font-size:13px;cursor:pointer">📧 Gmail</button>':'')+(num?'<a href="tel:'+num+'" style="flex:none;text-decoration:none;background:var(--surface);border:1px solid var(--border);color:var(--text);font-weight:700;border-radius:10px;padding:11px 13px;font-size:13px">📞</a>':'')+'</div>'+'<button onclick="_coImagen()" style="width:100%;margin-top:8px;background:transparent;border:1px dashed var(--border);color:var(--muted);border-radius:10px;padding:8px;font-size:12px;cursor:pointer">📎 Descargar imagen de productos (para adjuntar)</button>'+'</div>'+
      '<label style="font-size:11px;color:var(--muted);font-weight:700">ETAPA</label><select onchange="_crmSet(\'estado\',this.value)" style="'+inp+';margin:3px 0 12px">'+opts+'</select>'+
      '<label style="font-size:11px;color:var(--muted);font-weight:700">PRÓXIMO SEGUIMIENTO</label><input type="date" value="'+esc((''+(e.seguimiento||'')).slice(0,10))+'" onchange="_crmSet(\'seguimiento\',this.value)" style="'+inp+';margin:3px 0 12px">'+
      '<label style="font-size:11px;color:var(--muted);font-weight:700">NOTAS</label><textarea onchange="_crmSet(\'notas\',this.value)" placeholder="Ej. Pidió cotización de Hidrocortisona, llamar el lunes…" style="'+inp+';margin-top:3px;min-height:80px;resize:vertical">'+esc(e.notas||'')+'</textarea>'+
      '<div id="crm-saved" style="text-align:center;font-size:11px;color:var(--green);min-height:14px;margin-top:8px"></div>'+
    '</div></div>';
  document.body.appendChild(ov);
}
function _crmHistHTML(e){ var h=Array.isArray(e.historial)?e.historial:[]; if(!h.length)return ''; var rows=h.slice(0,12).map(function(x){ var ic=(x.c==='co')?'✉️':'📱'; var f=''; try{ f=new Date(x.f).toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'2-digit'})+' '+new Date(x.f).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}); }catch(_){ f=(''+x.f).slice(0,10); } return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid var(--border);font-size:12px"><span>'+ic+' '+esc(x.t||'')+'</span><span style="color:var(--muted)">'+f+'</span></div>'; }).join(''); return '<div style="background:var(--surface2);border-radius:12px;padding:12px;margin-bottom:14px"><div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin-bottom:2px">HISTORIAL DE MENSAJES ('+h.length+')</div>'+rows+'</div>'; }
function _crmSet(campo,val){ var e=_crmFicha; if(!e)return; e[campo]=val; var upd={}; upd[campo]=(val===''?null:val); supabaseClient.from('wa_empresas').update(upd).eq('id',e.id).then(function(r){ var s=document.getElementById('crm-saved'); if(s)s.textContent=(r&&r.error)?('Error al guardar'):'✓ Guardado'; if(campo==='estado'){ _crmFichaRender(); } if(typeof logAudit==='function')logAudit('crm.'+campo,e.nombre||''); }); }

/* ===================== MERCADO (inteligencia de mercado) ===================== */
function _mercadoUnlocked(){ try{ return sessionStorage.getItem('mercadoOK')==='1'; }catch(e){ return false; } }
function _sha256(str){ try{ return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function(buf){ return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join(''); }); }catch(e){ return Promise.resolve(''); } }
function _mercadoCargar(){
  if(!_mercadoUnlocked()){ supabaseClient.from('app_sections').select('data').eq('section_name','mercado_cfg').maybeSingle().then(function(r){ window._mktPassSha=(r&&r.data&&r.data.data&&r.data.data.pass_sha)||''; _mercadoLock(); }); return; }
  supabaseClient.from('app_sections').select('data').eq('section_name','mercado_stats').maybeSingle().then(function(r){ _mktStats=(r&&r.data&&r.data.data)||{}; _mercadoRender(); });
}
