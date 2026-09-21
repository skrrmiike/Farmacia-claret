function _mercadoLock(){
  var el=document.getElementById('mensajes-content'); if(!el)return;
  el.innerHTML=_msgHeader()+
    '<div style="max-width:420px;margin:26px auto;text-align:center">'+
    '<div style="font-size:52px;margin-bottom:6px">🔒</div>'+
    '<div style="font-weight:800;font-size:18px;margin-bottom:4px">Inteligencia de mercado</div>'+
    '<div style="font-size:13px;color:var(--muted);margin-bottom:18px">Información confidencial. Ingresa la clave de acceso.</div>'+
    '<input id="mkt-pass" type="password" placeholder="Clave de acceso" onkeydown="if(event.key===\'Enter\')_mercadoUnlock()" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:15px;text-align:center;margin-bottom:10px">'+
    '<button class="btn btn-accent" onclick="_mercadoUnlock()" style="width:100%;padding:11px">Entrar</button>'+
    '<div id="mkt-err" style="color:var(--red);font-size:12px;margin-top:8px;min-height:14px"></div>'+
    '</div>';
  try{ var i=document.getElementById('mkt-pass'); if(i)i.focus(); }catch(e){}
}
function _mercadoUnlock(){
  var p=((document.getElementById('mkt-pass')||{}).value||''); if(!p)return;
  _sha256(p).then(function(h){ if(h && h===window._mktPassSha){ try{sessionStorage.setItem('mercadoOK','1');}catch(e){} if(typeof logAudit==='function')logAudit('mercado.acceso','ok'); _mercadoCargar(); } else { var er=document.getElementById('mkt-err'); if(er)er.textContent='Clave incorrecta'; } });
}
function _mercadoSetPass(){
  var np=prompt('Nueva clave de acceso al Mercado:'); if(np==null||!(''+np).trim())return;
  _sha256((''+np).trim()).then(function(h){ supabaseClient.from('app_sections').update({data:{pass_sha:h}}).eq('section_name','mercado_cfg').then(function(r){ if(r&&r.error){ showToast('Error: '+(r.error.message||'')); return; } window._mktPassSha=h; if(typeof logAudit==='function')logAudit('mercado.clave','cambiada'); showToast('✓ Clave actualizada'); }); });
}
function _mktSetProd(p){ _mktProd=p; _mercadoRender(); }
function _mercadoRender(){
  var el=document.getElementById('mensajes-content'); if(!el)return;
  if(!_mercadoUnlocked()){ _mercadoLock(); return; }
  var st=_mktStats; if(!st||!st.prod_tot){ el.innerHTML=_msgHeader()+'<div style="padding:24px;color:var(--muted)">Cargando datos de mercado…</div>'; return; }
  var fmt=_msgFmtU;
  var pcol={Hidrocortisona:'#2563eb',Tigeciclina:'#7c3aed',Voriconazol:'#0891b2',Caspofungina:'#059669'};
  var pt=st.prod_tot||{}; var totAll=Object.keys(pt).reduce(function(a,k){return a+(pt[k]||0);},0);
  var order=Object.keys(pt).sort(function(a,b){return pt[b]-pt[a];});
  if(order.indexOf(_mktProd)<0 && order.length)_mktProd=order[0];
  var cards=order.map(function(k){ var v=pt[k]||0; var pc=totAll>0?Math.round(v/totAll*100):0; return '<div style="flex:1;min-width:130px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px"><div style="font-size:12px;color:var(--muted);font-weight:600">'+esc(k)+'</div><div style="font-size:20px;font-weight:800;color:'+(pcol[k]||'#333')+'">'+fmt(v)+'</div><div style="font-size:10px;color:var(--muted)">'+pc+'% · unidades</div></div>'; }).join('');
  var psel=order.map(function(k){ var on=(k===_mktProd); return '<button onclick="_mktSetProd(\''+k+'\')" style="border:1.5px solid '+(on?(pcol[k]||'var(--accent)'):'var(--border)')+';background:'+(on?(pcol[k]||'var(--accent)'):'transparent')+';color:'+(on?'#fff':'var(--muted)')+';border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;margin:0 6px 6px 0">'+esc(k)+'</button>'; }).join('');
  var col=pcol[_mktProd]||'#2563eb';
  var mm=(st.prod_mes||{})[_mktProd]||{}; var meses=Object.keys(mm).sort(); var maxM=Math.max.apply(null,meses.map(function(m){return mm[m];}).concat([1]));
  var evo=meses.map(function(m){ var v=mm[m]; var w=Math.round(v/maxM*100); return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;font-size:11px"><span style="width:64px;color:var(--muted)">'+m+'</span><div style="flex:1;background:var(--surface2);border-radius:5px;overflow:hidden;height:16px"><div style="height:100%;width:'+w+'%;background:'+col+';border-radius:5px"></div></div><span style="width:66px;text-align:right;font-weight:600">'+fmt(v)+'</span></div>'; }).join('');
  var tb=(st.prod_top_buyers||{})[_mktProd]||[]; var maxB=(tb[0]&&tb[0][1])||1;
  var buyers=tb.map(function(p,i){ var w=Math.round(p[1]/maxB*100); return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px"><span style="width:18px;color:var(--muted);text-align:right">'+(i+1)+'</span><div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600">'+esc(p[0])+'</div><div style="background:var(--surface2);border-radius:4px;height:8px;overflow:hidden"><div style="height:100%;width:'+w+'%;background:'+col+'"></div></div></div><span style="width:66px;text-align:right;font-weight:700">'+fmt(p[1])+'</span></div>'; }).join('');
  var comp=(st.prod_comp&&st.prod_comp[_mktProd])||st.competidores||[]; var maxC=(comp[0]&&comp[0][1])||1;
  var comps=comp.slice(0,12).map(function(p,i){ var w=Math.round(p[1]/maxC*100); return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px"><span style="width:18px;color:var(--muted);text-align:right">'+(i+1)+'</span><div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600">'+esc(p[0])+'</div><div style="background:var(--surface2);border-radius:4px;height:8px;overflow:hidden"><div style="height:100%;width:'+w+'%;background:#ef4444"></div></div></div><span style="width:66px;text-align:right;font-weight:700">'+fmt(p[1])+'</span></div>'; }).join('');
  var est=(st.prod_estado&&st.prod_estado[_mktProd])||st.estados||[]; var maxE=(est[0]&&est[0][1])||1;
  var ests=est.slice(0,15).map(function(p){ var w=Math.round(p[1]/maxE*100); return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px"><span style="width:100px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p[0])+'</span><div style="flex:1;background:var(--surface2);border-radius:4px;height:10px;overflow:hidden"><div style="height:100%;width:'+w+'%;background:#f59e0b"></div></div><span style="width:66px;text-align:right;font-weight:600">'+fmt(p[1])+'</span></div>'; }).join('');
  var card='background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px';
  el.innerHTML=_msgHeader()+
    '<div style="max-width:920px">'+
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#7c3aed,#2563eb);display:grid;place-items:center;font-size:24px;flex:none">📊</div><div><div style="font-weight:800;font-size:17px;line-height:1.15">Inteligencia de mercado</div><div style="font-size:12px;color:var(--muted)">'+fmt(st.total_farmacias||0)+' farmacias · historial de compras del mercado</div></div></div>'+
    '<div style="'+card+'"><div style="font-weight:700;font-size:13px;margin-bottom:10px">💊 Demanda total por producto</div><div style="display:flex;gap:10px;flex-wrap:wrap">'+cards+'</div></div>'+
    '<div style="'+card+'"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Ver detalle de:</div><div style="margin-bottom:4px">'+psel+'</div>'+
      '<div style="font-weight:700;font-size:12px;margin:12px 0 6px;color:var(--muted)">📈 Evolución mensual — '+esc(_mktProd)+'</div>'+evo+
      '<div style="font-weight:700;font-size:12px;margin:16px 0 6px;color:var(--muted)">🏆 Top compradores — '+esc(_mktProd)+' (a quién apuntar)</div>'+buyers+
    '</div>'+
    '<div style="'+card+'"><div style="font-weight:700;font-size:13px;margin-bottom:4px">🎯 Competencia en '+esc(_mktProd)+'</div><div style="font-size:11px;color:var(--muted);margin-bottom:8px">Droguerías/casas que más venden '+esc(_mktProd)+' — a quién quitarle mercado.</div>'+comps+'</div>'+
    '<div style="'+card+'"><div style="font-weight:700;font-size:13px;margin-bottom:8px">📍 Demanda de '+esc(_mktProd)+' por estado</div>'+ests+'</div>'+
    '<div style="font-size:10px;color:var(--muted);text-align:center;padding-bottom:10px">Datos de referencia del mercado. Actualízalos subiendo un nuevo archivo cuando tengas data más reciente.</div>'+((typeof currentRole!=='undefined'&&(currentRole==='admin'||currentRole==='gerente'))?'<div style="text-align:center;padding-bottom:14px"><button class="btn btn-ghost btn-sm" onclick="_mercadoSetPass()">🔒 Cambiar clave de acceso</button></div>':'')+
    '</div>';
}

/* ===================== CIERRE DE CAJA (Central · supervisor) ===================== */
var _ccAct=null, _ccList=[], _ccFirmas=[], _ccEventos=[], _ccFecha='', _ccSaveT=null, _ccA2T=null;
var _CC_DENOM=[5,10,20,50,100,200,500];
function _ccHoy(){ try{ return (typeof HOY==='function')?HOY():new Date(Date.now()-4*3600*1000).toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
function _ccNum(v){ v=(''+(v==null?'':v)).trim(); if(v.indexOf(',')>=0){ v=(v.indexOf('.')>=0)?v.replace(/\./g,'').replace(',','.'):v.replace(',','.'); } v=parseFloat(v.replace(/[^0-9.\-]/g,'')); return isNaN(v)?0:v; }
function _ccFmt(n){ return (Number(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _ccFechaLarga(f){ try{ var d=new Date(f+'T12:00:00'); var s=d.toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long'}); return s.charAt(0).toUpperCase()+s.slice(1); }catch(e){ return f; } }
function _ccHora(ts){ if(!ts)return '—'; try{ return new Date(ts).toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return '—'; } }
