/* ============================================================
   34-compras-esenciales.js — Proveedores esenciales + Pronto Pago
   (prefijo _ce). Vive dentro de la pestaña Compras (vista 'esencial').
   Edilso/Grismar registran 3 proveedores esenciales (80% del
   inventario), sus garantías y % de pronto pago. Cada compra calcula
   el ahorro (auto + ajustable) y su fecha límite. Al registrar una
   compra se crea sola una meta en el Repartidor (alerta + meta) para
   pagar a tiempo y ganar el descuento.
   ============================================================ */
var _ceProv=[], _ceReg=[], _ceReady=false, _ceLoading=false, _ceTmp=null;

function _ceNum(v){ if(v==null)return 0; var n=parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; }
function _ceR2(n){ return Math.round(_ceNum(n)*100)/100; }
function _ceMoney(n){ return '$'+_ceR2(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _ceHoy(){ return (typeof HOY==='function')?HOY():new Date().toISOString().slice(0,10); }
function _ceUser(){ return (typeof currentUser!=='undefined')?currentUser:''; }
function _ceFmt(d){ if(!d)return '—'; var s=String(d).slice(0,10); var p=s.split('-'); return (p.length===3)?(p[2]+'/'+p[1]+'/'+p[0]):s; }
function _ceDias(fecha){ try{ var a=new Date(_ceHoy()+'T00:00:00Z'), b=new Date(String(fecha).slice(0,10)+'T00:00:00Z'); return Math.round((b-a)/86400000); }catch(e){ return 0; } }
function _ceMasDias(base,n){ var d=new Date(String(base).slice(0,10)+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+(Number(n)||0)); return d.toISOString().slice(0,10); }
function _cePuede(){ try{ if(typeof currentRole!=='undefined'&&currentRole==='admin')return true; }catch(e){} try{ if(typeof puedePerm==='function')return puedePerm('comp','esencial')||puedePerm('comp','precios')||puedePerm('comp','armar'); }catch(e){} return true; }
function _ceAhorro(r){ var m=r.ahorro_manual; return (m!=null&&m!=='')?_ceNum(m):_ceNum(r.ahorro_auto); }
function _ceNeto(r){ return _ceR2(_ceNum(r.monto)-_ceAhorro(r)); }

/* ---------- Carga ---------- */
function _ceCargar(force){
  var b=document.getElementById('ci-body'); if(!force&&_ceReady){ _ceRender(); return; }
  if(_ceLoading)return; _ceLoading=true;
  if(b)b.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">Cargando proveedores esenciales…</div>';
  Promise.all([
    supabaseClient.from('compras_esenciales').select('*').order('creado_en',{ascending:true}),
    supabaseClient.from('compras_pp').select('*').order('fecha',{ascending:false}).limit(400)
  ]).then(function(res){
    _ceProv=(res[0].data||[]); _ceReg=(res[1].data||[]); _ceReady=true; _ceLoading=false; _ceRender();
  }).catch(function(err){ _ceLoading=false; if(b)b.innerHTML='<div style="padding:24px;text-align:center;color:var(--red)">No se pudo cargar: '+esc(String(err&&err.message||err))+'</div>'; });
}
function _ceRefrescar(){ _ceReady=false; _ceCargar(true); }

/* ---------- Render ---------- */
function _ceRender(){
  var b=document.getElementById('ci-body'); if(!b)return;
  var provAct=_ceProv.filter(function(p){return p.activo!==false;});
  var pend=_ceReg.filter(function(r){return !r.pagado;});
  var pag=_ceReg.filter(function(r){return r.pagado;});
  var hoyY=_ceHoy().slice(0,7);
  var ahLogrado=pag.reduce(function(s,r){return s+_ceAhorro(r);},0);
  var ahLogradoMes=pag.filter(function(r){return String(r.pagado_fecha||r.fecha||'').slice(0,7)===hoyY;}).reduce(function(s,r){return s+_ceAhorro(r);},0);
  var ahPotencial=pend.reduce(function(s,r){return s+_ceAhorro(r);},0);
  var head='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px"><div><div style="font-size:16px;font-weight:800">🤝 Proveedores esenciales · Pronto Pago</div><div style="font-size:12px;color:var(--muted);margin-top:2px">3 proveedores que cubren el 80% del inventario, solo alta rotación y cantidades chicas. Mide el ahorro por pagar a tiempo.</div></div>'+(_cePuede()?'<button onclick="_ceAbrirProv()" style="background:#16a34a;color:#fff;border:none;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">＋ Proveedor esencial</button>':'')+'</div>';
  var kpis='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">'+
    '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px;border-left:4px solid #16a34a"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Ahorro logrado</div><div style="font-size:22px;font-weight:800;color:#16a34a">'+_ceMoney(ahLogrado)+'</div><div style="font-size:10.5px;color:var(--muted)">'+_ceMoney(ahLogradoMes)+' este mes</div></div>'+
    '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px;border-left:4px solid #b45309"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Ahorro potencial</div><div style="font-size:22px;font-weight:800;color:#b45309">'+_ceMoney(ahPotencial)+'</div><div style="font-size:10.5px;color:var(--muted)">'+pend.length+' compras por pagar a tiempo</div></div>'+
    '<div class="tbox" style="padding:11px 13px;flex:1;min-width:120px;border-left:4px solid #1d4ed8"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Proveedores esenciales</div><div style="font-size:22px;font-weight:800">'+provAct.length+'<span style="font-size:12px;color:var(--muted);font-weight:600"> / 3</span></div></div></div>';
  // Próximos pronto-pago (alertas)
  var prox=pend.filter(function(r){return r.fecha_limite;}).sort(function(a,b){return String(a.fecha_limite).localeCompare(String(b.fecha_limite));}).slice(0,6);
  var alertas=prox.length?('<div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Próximos pronto pago</div>'+prox.map(function(r){ var d=_ceDias(r.fecha_limite); var col=d<0?'#dc2626':(d<=2?'#b45309':'#1d4ed8');
    return '<div class="tbox" style="padding:9px 12px;margin-bottom:6px;border-left:4px solid '+col+';display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><div style="font-size:13px;font-weight:700">'+esc(r.proveedor||'')+'</div><div style="font-size:11px;color:var(--muted)">pagar '+_ceMoney(_ceNeto(r))+' antes del '+_ceFmt(r.fecha_limite)+(d<0?(' · <b style="color:#dc2626">vencido</b>'):(' · '+(d===0?'hoy':('en '+d+'d')))) +'</div></div><div style="text-align:right"><div style="font-size:13px;font-weight:800;color:#16a34a">ahorra '+_ceMoney(_ceAhorro(r))+'</div>'+(_cePuede()?'<button onclick="_cePagar('+r.id+')" class="fchip" style="font-size:10.5px;padding:2px 8px;margin-top:2px">Marcar pagado</button>':'')+'</div></div>'; }).join('')+'<div style="height:8px"></div>'):'';
  // Tarjetas por proveedor
  var cards=provAct.length?provAct.map(function(p){
    var regs=_ceReg.filter(function(r){return String(r.esencial_id)===String(p.id);});
    var pendP=regs.filter(function(r){return !r.pagado;});
    var ahP=regs.filter(function(r){return r.pagado;}).reduce(function(s,r){return s+_ceAhorro(r);},0);
    var lastRows=regs.slice(0,4).map(function(r){ var col=r.pagado?'#16a34a':'#b45309';
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid var(--border);font-size:11.5px"><span>'+_ceFmt(r.fecha)+' · '+_ceMoney(r.monto)+(r.pagado?' <span style="color:#16a34a">✓</span>':(r.fecha_limite?(' <span style="color:var(--muted)">límite '+_ceFmt(r.fecha_limite)+'</span>'):''))+'</span><span style="color:'+col+';font-weight:700;white-space:nowrap">ahorro '+_ceMoney(_ceAhorro(r))+(r.pagado?'':'<button onclick=\''+'_cePagar('+r.id+')\' class="fchip" style="font-size:10px;padding:1px 6px;margin-left:6px">pagar</button>')+'</span></div>'; }).join('');
    return '<div class="tbox" style="padding:14px;margin-bottom:10px;border-left:4px solid #16a34a">'+
      '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div style="min-width:0"><div style="font-size:15px;font-weight:800">'+esc(p.proveedor)+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:2px">Pronto pago <b style="color:#16a34a">'+_ceNum(p.pronto_pago_pct)+'%</b> · plazo '+_ceNum(p.plazo_dias)+' días</div></div><div style="text-align:right"><div style="font-size:10px;color:var(--muted);text-transform:uppercase">Ahorro logrado</div><div style="font-size:18px;font-weight:800;color:#16a34a">'+_ceMoney(ahP)+'</div></div></div>'+
      (p.garantias?('<div style="font-size:11.5px;margin-top:8px;background:var(--surface2);border-radius:8px;padding:7px 10px"><b>Garantías:</b> '+esc(p.garantias)+'</div>'):'')+
      (p.notas?('<div style="font-size:11px;color:var(--muted);margin-top:5px">'+esc(p.notas)+'</div>'):'')+
      (regs.length?('<div style="margin-top:8px">'+lastRows+'</div>'):'<div style="font-size:11.5px;color:var(--muted);margin-top:8px">Sin compras registradas todavía.</div>')+
      (_cePuede()?('<div style="display:flex;gap:6px;margin-top:10px;justify-content:flex-end"><button onclick="_ceAbrirCompra('+p.id+')" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:7px 13px;font-size:12.5px;font-weight:700;cursor:pointer">＋ Registrar compra</button><button onclick="_ceAbrirProv('+p.id+')" class="fchip" style="font-size:12px">✎ Editar</button></div>'):'')+
    '</div>';
  }).join(''):'<div class="tbox" style="padding:26px;text-align:center;color:var(--muted)">Aún no hay proveedores esenciales.<br>Agrega los 3 que cubren el 80% de tu inventario con <b>＋ Proveedor esencial</b>.</div>';
  b.innerHTML=head+kpis+alertas+cards;
}

/* ---------- Modal proveedor ---------- */
function _ceAbrirProv(id){ if(!_cePuede())return; var p=id?_ceProv.filter(function(x){return String(x.id)===String(id);})[0]:null; _ceTmp={modo:'prov',id:p?p.id:null,proveedor:p?p.proveedor:'',garantias:p?(p.garantias||''):'',pronto_pago_pct:p?_ceNum(p.pronto_pago_pct):'',plazo_dias:p?_ceNum(p.plazo_dias):8,notas:p?(p.notas||''):''}; _ceHost().innerHTML=_ceProvHTML(); }
function _ceProvHTML(){ var t=_ceTmp; var inS='width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px';
  return _ceWrap(_ceHdr(t.id?'Editar proveedor esencial':'Nuevo proveedor esencial')+
    '<label style="display:block"><span style="font-size:12px;color:var(--muted)">Proveedor</span><input type="text" value="'+esc(t.proveedor||'')+'" oninput="_ceTmpSet(\'proveedor\',this.value)" style="'+inS+'"></label>'+
    '<div style="display:flex;gap:8px"><label style="display:block;margin-top:8px;flex:1"><span style="font-size:12px;color:var(--muted)">% pronto pago</span><input type="number" inputmode="decimal" value="'+esc(String(t.pronto_pago_pct))+'" oninput="_ceTmpSet(\'pronto_pago_pct\',this.value)" placeholder="ej. 5" style="'+inS+'"></label>'+
    '<label style="display:block;margin-top:8px;flex:1"><span style="font-size:12px;color:var(--muted)">Plazo (días)</span><input type="number" inputmode="numeric" value="'+esc(String(t.plazo_dias))+'" oninput="_ceTmpSet(\'plazo_dias\',this.value)" placeholder="ej. 8" style="'+inS+'"></label></div>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Garantías / condiciones (devoluciones, canjes, plazos…)</span><textarea oninput="_ceTmpSet(\'garantias\',this.value)" rows="2" style="'+inS+';resize:vertical">'+esc(t.garantias||'')+'</textarea></label>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Notas (opcional)</span><input type="text" value="'+esc(t.notas||'')+'" oninput="_ceTmpSet(\'notas\',this.value)" style="'+inS+'"></label>'+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'+(t.id?'<button onclick="_ceBorrarProv('+t.id+')" class="fchip" style="font-size:13px;color:#dc2626">Quitar</button>':'')+'<button onclick="_ceCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_ceGuardarProv()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Guardar</button></div>',460);
}
function _ceGuardarProv(){ var t=_ceTmp; if(!t||!_cePuede())return; if(!(t.proveedor||'').trim()){showToast&&showToast('Nombre del proveedor');return;}
  var row={proveedor:t.proveedor.trim(),garantias:(t.garantias||'').trim()||null,pronto_pago_pct:_ceNum(t.pronto_pago_pct),plazo_dias:Math.round(_ceNum(t.plazo_dias))||0,notas:(t.notas||'').trim()||null,actualizado_en:new Date().toISOString()};
  var q=t.id?supabaseClient.from('compras_esenciales').update(row).eq('id',t.id).select('*'):supabaseClient.from('compras_esenciales').insert(Object.assign({creado_por:_ceUser()},row)).select('*');
  q.then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;} _ceCerrar(); _ceRefrescar(); showToast&&showToast('Proveedor guardado ✓'); });
}
function _ceBorrarProv(id){ if(!_cePuede())return; if(!window.confirm('¿Quitar este proveedor esencial? Sus compras quedan en el historial.'))return; supabaseClient.from('compras_esenciales').update({activo:false}).eq('id',id).then(function(){ _ceCerrar(); _ceRefrescar(); showToast&&showToast('Proveedor quitado'); }); }

/* ---------- Modal compra ---------- */
function _ceAbrirCompra(provId){ if(!_cePuede())return; var p=_ceProv.filter(function(x){return String(x.id)===String(provId);})[0]; if(!p)return;
  _ceTmp={modo:'compra',provId:p.id,proveedor:p.proveedor,pct:_ceNum(p.pronto_pago_pct),plazo:_ceNum(p.plazo_dias),fecha:_ceHoy(),monto:'',ahorro_manual:'',crearMeta:true}; _ceHost().innerHTML=_ceCompraHTML(); }
function _ceCompraHTML(){ var t=_ceTmp; var inS='width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;margin-top:3px';
  var monto=_ceNum(t.monto), ahAuto=_ceR2(monto*t.pct/100), ah=(t.ahorro_manual!==''&&t.ahorro_manual!=null)?_ceNum(t.ahorro_manual):ahAuto, neto=_ceR2(monto-ah), limite=_ceMasDias(t.fecha,t.plazo);
  var resumen=monto>0?('<div class="tbox" style="padding:10px 12px;margin-top:10px;background:#ecfdf5;border:0"><div style="display:grid;grid-template-columns:1fr auto;gap:3px 10px;font-size:12.5px"><span>Ahorro por pronto pago ('+t.pct+'%)</span><b style="text-align:right;color:#16a34a">'+_ceMoney(ah)+'</b><span>Pagas (con descuento)</span><b style="text-align:right">'+_ceMoney(neto)+'</b><span>Fecha límite para el descuento</span><b style="text-align:right">'+_ceFmt(limite)+'</b></div></div>'):'';
  return _ceWrap(_ceHdr('Registrar compra · '+esc(t.proveedor))+
    '<div style="display:flex;gap:8px"><label style="display:block;flex:1"><span style="font-size:12px;color:var(--muted)">Fecha de la compra</span><input type="date" value="'+esc(t.fecha||'')+'" oninput="_ceTmpSet(\'fecha\',this.value);_ceReCompra()" style="'+inS+'"></label>'+
    '<label style="display:block;flex:1"><span style="font-size:12px;color:var(--muted)">Monto de la compra ($)</span><input type="number" inputmode="decimal" value="'+esc(String(t.monto))+'" oninput="_ceTmpSet(\'monto\',this.value);_ceReCompra()" style="'+inS+'"></label></div>'+
    '<label style="display:block;margin-top:8px"><span style="font-size:12px;color:var(--muted)">Ahorro (auto = monto × '+t.pct+'%, puedes ajustarlo)</span><input type="number" inputmode="decimal" value="'+esc(String(t.ahorro_manual))+'" oninput="_ceTmpSet(\'ahorro_manual\',this.value);_ceReCompra()" placeholder="'+_ceR2(ahAuto)+'" style="'+inS+'"></label>'+
    resumen+
    '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer"><input type="checkbox" '+(t.crearMeta?'checked':'')+' onchange="_ceTmpSet(\'crearMeta\',this.checked)"><span style="font-size:12.5px">Avisar al Repartidor y crear meta para pagar a tiempo <span style="color:var(--muted)">(alerta + meta automática)</span></span></label>'+
    '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end"><button onclick="_ceCerrar()" class="fchip" style="font-size:13px">Cancelar</button><button onclick="_ceGuardarCompra()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer">Registrar</button></div>',470);
}
function _ceReCompra(){ var h=document.getElementById('ce-modal-host'); if(h)h.innerHTML=_ceCompraHTML(); }
function _ceGuardarCompra(){ var t=_ceTmp; if(!t||!_cePuede())return; var monto=_ceNum(t.monto); if(monto<=0){showToast&&showToast('Indica el monto de la compra');return;}
  var ahAuto=_ceR2(monto*t.pct/100); var ahManual=(t.ahorro_manual!==''&&t.ahorro_manual!=null)?_ceNum(t.ahorro_manual):null;
  var ah=(ahManual!=null)?ahManual:ahAuto; var neto=_ceR2(monto-ah); var limite=_ceMasDias(t.fecha,t.plazo);
  var row={esencial_id:t.provId,proveedor:t.proveedor,fecha:t.fecha,monto:_ceR2(monto),pct:t.pct,ahorro_auto:ahAuto,ahorro_manual:ahManual,fecha_limite:limite,pagado:false,creado_por:_ceUser()};
  supabaseClient.from('compras_pp').insert(row).select('*').then(function(res){ if(res.error){showToast&&showToast('Error: '+res.error.message);return;}
    var reg=res.data&&res.data[0];
    if(t.crearMeta&&reg){
      var meta={nombre:'Pronto pago: '+t.proveedor+(ah>0?(' · ahorra '+_ceMoney(ah)):''),tipo:'banco',objetivo:neto,reunido:0,fecha_limite:limite,cobro_directo:true,recurrente:null,creado_por:_ceUser()};
      supabaseClient.from('rep_metas').insert(meta).select('*').then(function(mr){ if(mr&&mr.data&&mr.data[0]){ supabaseClient.from('compras_pp').update({meta_id:mr.data[0].id}).eq('id',reg.id).then(function(){}); } _ceFin(); });
    } else { _ceFin(); }
  });
  function _ceFin(){ if(typeof logAudit==='function')logAudit('compras_pp','Compra '+_ceMoney(monto)+' a '+t.proveedor+' · ahorro '+_ceMoney(ah)); _ceCerrar(); _ceRefrescar(); showToast&&showToast('Compra registrada ✓'+(t.crearMeta?' · meta creada en Repartidor':'')); }
}
function _cePagar(id){ if(!_cePuede())return; var r=_ceReg.filter(function(x){return String(x.id)===String(id);})[0]; if(!r)return;
  if(!window.confirm('¿Marcar como pagada la compra de '+_ceMoney(r.monto)+' a '+r.proveedor+'? Ahorro '+_ceMoney(_ceAhorro(r))+'.'))return;
  supabaseClient.from('compras_pp').update({pagado:true,pagado_fecha:_ceHoy()}).eq('id',id).then(function(){
    if(r.meta_id){ return supabaseClient.from('rep_metas').update({activo:false,actualizado_en:new Date().toISOString()}).eq('id',r.meta_id); }
  }).then(function(){ if(typeof logAudit==='function')logAudit('compras_pp_pago','Pagó a '+r.proveedor+' '+_ceMoney(r.monto)); _ceRefrescar(); showToast&&showToast('Pago registrado ✓'); });
}

/* ---------- Modal helpers ---------- */
function _ceHost(){ var h=document.getElementById('ce-modal-host'); if(!h){ h=document.createElement('div'); h.id='ce-modal-host'; document.body.appendChild(h); } return h; }
function _ceCerrar(){ var h=document.getElementById('ce-modal-host'); if(h)h.innerHTML=''; _ceTmp=null; }
function _ceTmpSet(k,v){ if(_ceTmp)_ceTmp[k]=v; }
function _ceWrap(inner,w){ return '<div onclick="_ceCerrar()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto"><div onclick="event.stopPropagation()" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:'+(w||440)+'px;width:100%;margin:24px 0;padding:18px">'+inner+'</div></div>'; }
function _ceHdr(t){ return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:16px;font-weight:800">'+esc(t)+'</div><button onclick="_ceCerrar()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button></div>'; }
