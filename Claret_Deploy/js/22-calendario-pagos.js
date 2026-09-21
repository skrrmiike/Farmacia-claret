var _calSecOpen=null;
var _calRepMetas=[], _calRepMetasReady=false, _calRepCfg=null, _calRepDeudas=[];
function _calCargarMetas(){ if(_calRepMetasReady)return; _calRepMetasReady=true;
  try{
    Promise.all([
      supabaseClient.from('rep_metas').select('*').in('tipo',['comision','banco','nomina']),
      supabaseClient.from('rep_config').select('*').eq('id',1).maybeSingle(),
      supabaseClient.from('rep_deudas').select('*')
    ]).then(function(r){
      _calRepMetas=((r[0]&&r[0].data)||[]).filter(function(m){return m.activo!==false;});
      _calRepCfg=(r[1]&&r[1].data)||null;
      _calRepDeudas=((r[2]&&r[2].data)||[]).filter(function(d){return d.activo!==false;});
      renderCalPagos();
    }).catch(function(){});
  }catch(e){}
}
function _calDVBudget(){ // presupuesto mensual de deuda vieja (partida × 30)
  try{ var defs=(_calRepCfg&&_calRepCfg.partidas&&_calRepCfg.partidas.length)?_calRepCfg.partidas:((typeof _repPartidasDefault==='function')?_repPartidasDefault():[]);
    var p=defs.filter(function(x){return x.clave==='deuda_vieja';})[0]; return Math.round(((p?Number(p.monto):60)||0)*30*100)/100;
  }catch(e){ return 1800; }
}
function _calLoadSec(){ if(_calSecOpen)return _calSecOpen; _calSecOpen={cfg:false,sem:false,gf:false,merc:false}; try{var s=localStorage.getItem('calSecOpen'); if(s)_calSecOpen=Object.assign(_calSecOpen,JSON.parse(s));}catch(e){} return _calSecOpen; }
function _calToggleSec(k){ var o=_calLoadSec(); o[k]=!o[k]; try{localStorage.setItem('calSecOpen',JSON.stringify(o));}catch(e){} renderCalPagos(); }
function _calSec(k,titulo,extra,contenido){ var o=_calLoadSec(); var ab=!!o[k]; return '<div class="tbox" style="padding:0;margin-top:10px;overflow:hidden"><div onclick="_calToggleSec(\''+k+'\')" style="cursor:pointer;padding:11px 13px;display:flex;justify-content:space-between;align-items:center;user-select:none;gap:8px"><span style="font-weight:700;font-size:12px">'+titulo+'</span><span style="display:flex;align-items:center;gap:8px">'+(extra?'<span style="font-size:11px;color:var(--muted)">'+extra+'</span>':'')+'<span style="font-size:13px;color:var(--muted)">'+(ab?'▾':'▸')+'</span></span></div>'+(ab?('<div style="padding:0 13px 13px">'+contenido+'</div>'):'')+'</div>'; }
function _calCompras(){ var x=_cxp(); if(!Array.isArray(x.compras))x.compras=[]; return x.compras; }
function _calAbonoPlan(){ var x=_cxp(); if(!x.abono_plan||typeof x.abono_plan!=='object')x.abono_plan={activo:false,monto:10000,cadaMeses:1,dia:5,prestamos:[]}; var ap=x.abono_plan; if(!Array.isArray(ap.prestamos))ap.prestamos=[]; if(ap.monto==null)ap.monto=10000; if(!ap.cadaMeses)ap.cadaMeses=1; return ap; }
function _simAbono(l,monto,cadaMeses,iniYM,dia){
  var cap=Number(l.saldo_capital)||0; var tasa=Number(l.tasa_interes_mensual)||0;
  var y=parseInt(iniYM.slice(0,4)), m=parseInt(iniYM.slice(5,7))-1; dia=Math.min(28,Math.max(1,dia||l.dia_pago||5));
  monto=Number(monto)||0; cadaMeses=Math.max(1,parseInt(cadaMeses)||1);
  var pasos=[],nAb=0,totC=0,totA=0,fin=null;
  for(var i=0;i<360 && cap>0.01;i++){
    var fecha=new Date(y,m+i,dia).toISOString().slice(0,10);
    var com=Math.round(cap*tasa*100)/100; totC+=com;
    var abono=0; if(i%cadaMeses===0){ abono=Math.min(monto,cap); }
    abono=Math.round(abono*100)/100; var capDesp=Math.round((cap-abono)*100)/100; if(capDesp<0)capDesp=0;
    if(abono>0){ nAb++; totA+=abono; }
    pasos.push({fecha:fecha,cap:cap,com:com,abono:abono,capDesp:capDesp});
    cap=capDesp; if(cap<=0.01){ fin=fecha; break; }
    if(monto<=0) break;
  }
  return {pasos:pasos,fin:fin,nAbonos:nAb,totComision:Math.round(totC*100)/100,totAbono:Math.round(totA*100)/100,capRest:cap};
}
function _simCascada(){
  var ap=_calAbonoPlan();
  if(ap.modo!=='cascada' || ap.activo!==true) return null;
  var monto=Number(ap.monto)||10000, boost=Number(ap.boost)||20000, dia=Math.min(28,Math.max(1,Number(ap.dia)||25));
  var orden=Array.isArray(ap.orden)?ap.orden:[];
  var loans=orden.map(function(id){ return (db.prestamos||[]).filter(function(l){return _esInteres(l)&&l.id===id&&l.activo!==false;})[0]; }).filter(Boolean);
  if(!loans.length) return null;
  var st=loans.map(function(l){ var pc=(l.proxima_cuota||'2026-07-25'); return {l:l,cap:Number(l.saldo_capital)||0,tasa:Number(l.tasa_interes_mensual)||0,com0:pc.slice(0,7),started:false}; });
  var minCom=st.reduce(function(a,s){ return (!a||s.com0<a)?s.com0:a; }, null) || (ap.inicio||'2026-07');
  var sY=parseInt(minCom.slice(0,4)), sM=parseInt(minCom.slice(5,7))-1;
  var ini=ap.inicio||'2026-10'; var abIdx=parseInt(ini.slice(0,4))*12+(parseInt(ini.slice(5,7))-1);
  var ev=[];
  for(var k=0;k<72;k++){
    var d=new Date(sY,sM+k,dia); var fecha=d.toISOString().slice(0,10);
    var ym=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2); var midx=sY*12+sM+k;
    st.forEach(function(s){ if(s.cap>0.01 && ym>=s.com0){ var c=Math.round(s.cap*s.tasa*100)/100; if(c>0) ev.push({fecha:fecha,tipo:'interes',monto:c,id:s.l.id,label:s.l.banco}); } });
    if(midx>=abIdx){
      var cur=null,ci=-1; for(var i=0;i<st.length;i++){ if(st[i].cap>0.01){ cur=st[i]; ci=i; break; } }
      if(cur){ var amt=(!cur.started && ci>0)?boost:monto; amt=Math.min(amt,cur.cap); cur.started=true; if(amt>0){ ev.push({fecha:fecha,tipo:'abono',monto:amt,id:cur.l.id,label:cur.l.banco}); cur.cap=Math.round((cur.cap-amt)*100)/100; } }
    }
    if(midx>=abIdx && st.every(function(s){return s.cap<=0.01;})) break;
  }
  return ev;
}
function _calAhorroDesde(){ var cf=_cxp(); var fa=cf.fecha_ahorro; if(fa && /^\d{4}-\d{2}-\d{2}$/.test(fa)) return fa; return ((cf.inicio||HOY().slice(0,7))+'-01'); }
function _calPagosEventos(){
  var ev=[]; var F=_calFactorDolar();
  var _ini=(_cxp().inicio)||HOY().slice(0,7); var _iY=parseInt(_ini.slice(0,4)), _iM=parseInt(_ini.slice(5,7))-1;
  var _aD=(typeof _calAhorroDesde==='function')?_calAhorroDesde():(_ini+'-01'); var _aYM=_aD.slice(0,7); var _baseYM=(_aYM<_ini)?_aYM:_ini; var _bY=parseInt(_baseYM.slice(0,4)), _bM=parseInt(_baseYM.slice(5,7))-1;
  (db.prestamos||[]).filter(function(l){return l.activo!==false;}).forEach(function(l){
    if(_esInteres(l)){
      var f=l.proxima_cuota, monto=_interesMensual(l);
      if(f && monto>0){ for(var i=0;i<12;i++){ ev.push({fecha:f,monto:monto,f:F,tipo:'interes',mon:'usd',cat:'Comisión préstamo',label:l.banco,sub:l.entidad,id:l.id}); f=_interesAvanzaMes(f,l.dia_pago); } }
    } else if(Array.isArray(l.amortizacion)&&l.amortizacion.length){
      var start=Math.max(0,l.cuotas_hechas||0);
      for(var j=start;j<l.amortizacion.length;j++){ var a=l.amortizacion[j]; if(a&&a.mes){ var mm=(a.total_usd!=null?a.total_usd:0); if(j===start)mm=_prestMontoPagar(l); ev.push({fecha:a.mes,monto:mm,f:1,tipo:'prestamo',mon:'bs',cat:'Cuota préstamo',label:l.banco,sub:l.entidad,id:l.id,fijo:true}); } }
    }
  });
  /* Comisiones y cuotas del REPARTIDOR (Héctor, Eduardo, Néstor personal, banco…) — la nómina va aparte */
  try{
    (_calRepMetas||[]).forEach(function(m){
      if(m.tipo==='nomina')return;
      var obj=Number(m.objetivo)||0; if(obj<=0||!m.fecha_limite)return;
      var base=new Date(String(m.fecha_limite).slice(0,10)+'T00:00:00'); if(isNaN(base))return; var dia=(Number(m.dia_pago)||base.getDate());
      var cat=(m.tipo==='banco'?'Cuota banco':'Comisión préstamo');
      var months=(m.recurrente==='mensual')?12:1;
      for(var i=0;i<months;i++){ var yy=base.getFullYear(), mo=base.getMonth()+i; var last=new Date(yy,mo+1,0).getDate(); var dd=Math.min(dia,last); var dt=new Date(yy,mo,dd); var f=dt.toISOString().slice(0,10); ev.push({fecha:f,monto:obj,f:F,tipo:'comision',mon:'usd',cat:cat,label:m.nombre,sub:'meta del repartidor',id:'meta'+m.id+'-'+i}); }
    });
  }catch(e){}
  /* Proveedores viejos: los MARCADOS en el Repartidor (Deudas) — cuota = presupuesto 📜 × su parte, hasta saldar */
  try{
    if(typeof _repPlanDeudas==='function'){
      var _selMap={}; (_calRepDeudas||[]).forEach(function(d){ if(Number(d.reparto_pct)>0)_selMap[String(d.proveedor||'').trim().toLowerCase().replace(/\s+/g,' ')]={pct:Number(d.reparto_pct),row:d}; });
      var _plan=_repPlanDeudas().filter(function(p){ return p.restante>0.5 && _selMap[p.norm]; });
      // deudas manuales seleccionadas que no están en el Plan
      (_calRepDeudas||[]).forEach(function(d){ var nk=String(d.proveedor||'').trim().toLowerCase().replace(/\s+/g,' '); if(Number(d.reparto_pct)>0 && !_plan.some(function(p){return p.norm===nk;})){ var falta=Math.max(0,(Number(d.total)||0)-(Number(d.abonado)||0)); if(falta>0.5)_plan.push({norm:nk,proveedor:d.proveedor,restante:falta}); } });
      var _bud=_calDVBudget();
      /* Simulación mes a mes con BOLA DE NIEVE: cada mes reparte el presupuesto entre las deudas
         que aún quedan (chicas primero); conforme se saldan, el presupuesto se concentra en el siguiente. */
      var _saldo={}; _plan.forEach(function(p){ _saldo[p.norm]=p.restante; });
      var _nombre={}; _plan.forEach(function(p){ _nombre[p.norm]=p.proveedor; });
      var hoyD=new Date(HOY()+'T00:00:00');
      for(var mmes=0; mmes<18 && _bud>0.5; mmes++){
        var vivos=_plan.map(function(p){return {id:p.norm,_falta:_saldo[p.norm]};}).filter(function(x){return x._falta>0.5;});
        if(!vivos.length)break;
        var rr=(typeof _repDVReparto==='function')?_repDVReparto(vivos,_bud):null; if(!rr)break;
        var dt=new Date(hoyD.getFullYear(), hoyD.getMonth()+1+mmes, 7); var f=dt.toISOString().slice(0,10);
        vivos.forEach(function(x){ var pago=Number(rr.cuotas[x.id])||0; if(pago<=0.5)return;
          _saldo[x.id]=Math.round((_saldo[x.id]-pago)*100)/100;
          ev.push({fecha:f,monto:pago,f:F,tipo:'proveedor',mon:'usd',cat:'Deuda vieja',label:_nombre[x.id],sub:(_saldo[x.id]<=0.5?'✓ queda saldado':'abono'),id:'dv'+x.id+'-'+mmes}); });
      }
    }
  }catch(e){}
  try{
    var compras=_calCompras();
    compras.forEach(function(c){ var mt=Number(c.monto_usd)||0; if(mt<=0||!c.fecha)return; var cfac=(c.moneda==='usd')?F:1; ev.push({fecha:c.fecha,monto:mt,f:cfac,tipo:'compras',mon:(c.moneda==='usd'?'usd':'bs'),cat:'Mercancía nueva',label:c.nota||'Compra de mercancía',sub:(c.moneda==='usd'?'pagada en $':'pagada en Bs'),id:c.id}); });
  }catch(e){}
  try{
    var gf=_cxp().gastos_fijos||[];
    gf.forEach(function(g){ var mt=Number(g.monto)||0; if(mt<=0)return; var dia=Math.min(28,Math.max(1,g.dia||5));
      for(var i=0;i<16;i++){ var f=new Date(_bY, _bM+i, dia).toISOString().slice(0,10); ev.push({fecha:f,monto:mt,f:1,tipo:'gasto',mon:'bs',cat:(g.grupo||'Gasto fijo'),label:g.concepto,sub:'mensual',id:g.id}); } });
  }catch(e){}
  try{
    var nMeta=(_calRepMetas||[]).filter(function(m){return m.tipo==='nomina';})[0];
    var cf=_cxp(); var nq=nMeta?(Number(nMeta.objetivo)||0):(Number(cf.nomina&&cf.nomina.quincena_usd)||0);
    if(nq>0){
      for(var k=0;k<16;k++){ var yy=_bY, mm2=_bM+k;
        ev.push({fecha:new Date(yy,mm2,15).toISOString().slice(0,10),monto:nq,f:1,tipo:'nomina',mon:'bs',cat:'Nómina',label:'Nómina',sub:'1ª quincena (día 15)'+(nMeta?' · meta del repartidor':''),id:'nom1'});
        ev.push({fecha:new Date(yy,mm2+1,0).toISOString().slice(0,10),monto:nq,f:1,tipo:'nomina',mon:'bs',cat:'Nómina',label:'Nómina',sub:'2ª quincena (fin de mes)'+(nMeta?' · meta del repartidor':''),id:'nom2'});
      }
    }
  }catch(e){}
  return ev;
}
function _calGananciaDiaria(){ var x=_cxp(); var prom=(_calRepCfg&&Number(_calRepCfg.promedio_venta_diaria))||0; var ingreso=prom>0?prom:(Number(x.ingreso_diario)||4000); var base=ingreso*(Number(x.margen_pct)||100)/100; var F=_calFactorDolar(); return Math.round(base/(F>0?F:1)); }
function _calFlujo(){
  var ev=_calPagosEventos(); var cf=_cxp();
  var desde=_calAhorroDesde(); var ing=_calGananciaDiaria(); var sal0=Number(cf.saldo_inicial)||0;
  var byDate={}; ev.forEach(function(e){ if(e.fecha && e.fecha>=desde){ byDate[e.fecha]=(byDate[e.fecha]||0)+_evCost(e); } });
  var start=new Date(desde+'T00:00:00'); var fin=new Date(start.getFullYear(), start.getMonth()+16, 0);
  var bal=sal0; var out={};
  for(var d=new Date(start); d<=fin; d.setDate(d.getDate()+1)){ bal+=ing; var ds=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); if(byDate[ds])bal-=byDate[ds]; out[ds]=Math.round(bal); }
  return out;
}
function _calDetalleMes(ym){
  var ev=_calPagosEventos().filter(function(e){return e.fecha && e.fecha.slice(0,7)===ym;});
  if(!ev.length) return '<div style="font-size:12px;color:var(--muted);padding:10px;text-align:center">No hay pagos programados este mes.</div>';
  ev.sort(function(a,b){ var c=a.fecha.localeCompare(b.fecha); return c!==0?c:(_evCost(b)-_evCost(a)); });
  var bin=_calTasaBinance()||getTasa()||0;
  var icon={interes:'🏦',abono:'💵',prestamo:'🏦',proveedor:'🧾',compras:'📦',gasto:'🧾',nomina:'👥',comision:'🤝'};
  var tot=0, rows='', lastDay='';
  ev.forEach(function(e){
    var cost=_evCost(e); tot+=cost; var dd=e.fecha.slice(8,10);
    if(dd!==lastDay){ rows+='<div style="font-size:11px;font-weight:800;color:var(--accent);margin:10px 0 2px">Día '+parseInt(dd,10)+'</div>'; lastDay=dd; }
    var bs=bin?('<span style="font-size:9px;color:var(--muted);font-weight:400"> · '+fmt(Math.round(cost*bin))+' Bs</span>'):'';
    rows+='<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid var(--border);font-size:12px"><span style="min-width:0"><span style="opacity:.7">'+(icon[e.tipo]||'•')+'</span> '+esc(e.cat||'')+' — '+esc(e.label||'')+(e.sub?'<span style="font-size:9px;color:var(--muted)"> · '+esc(e.sub)+'</span>':'')+'</span><span style="text-align:right;white-space:nowrap"><b>$'+fmt(cost)+'</b>'+bs+'</span></div>';
  });
  return '<div style="font-size:11px;color:var(--muted);margin-bottom:2px">'+ev.length+' pagos este mes · total <b>$'+fmt(tot)+'</b> — en orden de fecha.</div>'+rows;
}
function renderCalPagos(){
  var el=document.getElementById('calpagos-content'); if(!el)return;
  if(!_calMes)_calMes=HOY().slice(0,7);
  var head='<p class="section-title" style="margin:0 0 2px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Calendario de Pagos <span style="font-size:11px;font-weight:500;color:var(--muted)">· todo lo que hay que pagar</span></p>';
  var toggle='';
  _calCargarMetas();
  var tasa=getTasa(); var ym=_calMes; var y=parseInt(ym.slice(0,4)), m=parseInt(ym.slice(5,7))-1;
  var cf=_cxp(); var ing=Number(cf.ingreso_diario)||4000; var margen=Number(cf.margen_pct)||100; var baseGan=Math.round(ing*margen/100); var gan=_calGananciaDiaria(); var nq=Number(cf.nomina&&cf.nomina.quincena_usd)||0;
  var bin=_calTasaBinance(); var F=_calFactorDolar(); var premPct=Math.round((F-1)*100); var binEff=(bin>0?bin:tasa)||0;
  var allEv=_calPagosEventos();
  var ev=allEv.filter(function(e){return e.fecha && e.fecha.slice(0,7)===ym;});
  var byDay={}; ev.forEach(function(e){ var dd=e.fecha.slice(8,10); (byDay[dd]=byDay[dd]||[]).push(e); });
  var dias=Object.keys(byDay).sort();
  if(!(_calDiaSel && _calDiaSel.slice(0,7)===ym && byDay[_calDiaSel.slice(8,10)])){ var hh=HOY(); _calDiaSel=(hh.slice(0,7)===ym && byDay[hh.slice(8,10)])?hh:(dias.length?ym+'-'+dias[0]:null); }
  var startDow=new Date(y,m,1).getDay(), ndays=new Date(y,m+1,0).getDate(), hoy=HOY();
  var totMes=ev.reduce(function(s,x){return s+_evCost(x);},0);
  var todayTot=allEv.filter(function(e){return e.fecha===hoy;}).reduce(function(s,x){return s+_evCost(x);},0);
  var hd=new Date(hoy+'T00:00:00'); var dowm=(hd.getDay()+6)%7; var ws=new Date(hd); ws.setDate(hd.getDate()-dowm); var we=new Date(ws); we.setDate(ws.getDate()+6);
  var wss=ws.toISOString().slice(0,10), wee=we.toISOString().slice(0,10);
  var weekTot=allEv.filter(function(e){return e.fecha>=wss && e.fecha<=wee;}).reduce(function(s,x){return s+_evCost(x);},0);
  var capDia=gan, capSem=gan*7, capMes=gan*ndays;
  var flujo=_calFlujo();
  var meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var inpSt='margin-top:3px;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);width:110px';
  var cfg='<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">'+
    '<label style="font-size:10px;color:var(--muted)">Ventas diarias ($)<br><input type="number" value="'+ing+'" onchange="_calSetCfg(\'ingreso\',this.value)" style="'+inpSt+'"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Margen / ganancia (%)<br><input type="number" value="'+margen+'" onchange="_calSetCfg(\'margen\',this.value)" style="'+inpSt+'"></label>'+
    '<div style="font-size:10px;color:var(--muted)">Ahorras al día ($ reales)<br><span style="font-size:15px;font-weight:800;color:var(--green)">$'+fmt(gan)+'</span><br><span style="font-size:9px;color:var(--muted)">de $'+fmt(baseGan)+' que vendes (BCV)</span></div>'+
    '<label style="font-size:10px;color:var(--muted)">Nómina por quincena ($)<br><input type="number" value="'+nq+'" onchange="_calSetCfg(\'nomina\',this.value)" style="'+inpSt+'"></label>'+
    '<label style="font-size:10px;color:var(--muted)">Efectivo hoy ($)<br><input type="number" value="'+(Number(cf.saldo_inicial)||0)+'" onchange="_calSetCfg(\'saldo\',this.value)" style="'+inpSt+'"></label><label style="font-size:10px;color:var(--muted)">Empezar a reunir desde<br><input type="date" value="'+_calAhorroDesde()+'" onchange="_calSetCfg(\'ahorro\',this.value)" style="'+inpSt+'"></label></div>';
  var fxBox='<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">'+
    '<div style="font-size:10px;color:var(--muted)">Tasa BCV (recibes)<br><span style="font-size:15px;font-weight:800">'+(tasa?fmt(tasa,0):'—')+' Bs</span></div>'+
    '<label style="font-size:10px;color:var(--muted)">Tasa Binance (compras $)<br><input type="number" value="'+(bin||0)+'" onchange="_calSetCfg(\'binance\',this.value)" style="'+inpSt+'" placeholder="ej: 900"></label>'+
    '<div style="font-size:10px;color:var(--muted)">Sobrecosto al pagar en $<br><span style="font-size:15px;font-weight:800;color:'+(premPct>0?'var(--red)':'var(--muted)')+'">+'+premPct+'%</span></div>'+
    '<span style="font-size:10px;color:var(--muted);flex:1;min-width:160px">Recibes a BCV pero compras los dólares a Binance. Por eso de $'+fmt(baseGan)+' que vendes al día, en dólares reales solo ahorras <b>$'+fmt(gan)+'</b> (el +'+premPct+'% se lo come el cambio). El calendario acumula esos dólares reales.</span></div>';
  var kpi=function(l,v,sub,col){ return '<div class="tbox" style="padding:11px;text-align:center"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+l+'</div><div style="font-size:18px;font-weight:800;margin-top:2px;color:'+(col||'var(--text)')+'">'+v+'</div>'+(sub?'<div style="font-size:10px;color:var(--muted)">'+sub+'</div>':'')+'</div>'; };
  var kpis='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 4px">'+
    kpi('Hoy','$'+fmt(todayTot),'de $'+fmt(capDia,0)+' que ahorras',todayTot>capDia?'var(--red)':'var(--green)')+
    kpi('Esta semana','$'+fmt(weekTot),'de $'+fmt(capSem,0),weekTot>capSem?'var(--red)':'var(--amber)')+
    kpi('Este mes','$'+fmt(totMes),'de $'+fmt(capMes,0),totMes>capMes?'var(--red)':'var(--accent)')+'</div>';
  var kpinote='<div style="font-size:9px;color:var(--muted);text-align:center;margin-bottom:10px">Todo en <b>dólares reales</b> (los que compras a Binance, $'+fmt(gan)+'/día) y los bolívares que necesitas. El ahorro del día ya descuenta lo que se pierde en el cambio.</div>';
  var nav='<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:2px 0"><button class="btn btn-ghost btn-sm" onclick="_calNavMes(-1)" style="font-size:18px;padding:2px 12px">‹</button><div style="font-weight:700;font-size:15px;min-width:150px;text-align:center">'+meses[m]+' '+y+'</div><button class="btn btn-ghost btn-sm" onclick="_calNavMes(1)" style="font-size:18px;padding:2px 12px">›</button></div>';
  var dows=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  var grid='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:6px">';
  dows.forEach(function(dn){ grid+='<div style="text-align:center;font-size:10px;color:var(--muted);font-weight:700;padding:2px">'+dn+'</div>'; });
  for(var i=0;i<startDow;i++)grid+='<div></div>';
  for(var d=1;d<=ndays;d++){ var dd=('0'+d).slice(-2); var fe=ym+'-'+dd; var es=byDay[dd]; var esHoy=(fe===hoy), sel=(fe===_calDiaSel);
    var tot=es?es.reduce(function(s,x){return s+_evCost(x);},0):0;
    var bal=(flujo[fe]!=null?flujo[fe]:null); var neg=(bal!=null&&bal<0);
    var bg=(es&&neg)?'#fee2e2':(es?(esHoy?'#eef2ff':'#ecfdf5'):(neg?'#fff1f1':'transparent'));
    var bord=esHoy?'2px solid var(--accent)':(neg?'1px solid var(--red)':'1px solid var(--border)');
    var ring=sel?'box-shadow:0 0 0 2px var(--accent);':'';
    var clk=es?(' onclick="_calDia(\''+fe+'\')" style="cursor:pointer;'):' style="';
    var totBsDia=binEff?Math.round(tot*binEff):0;
    grid+='<div'+clk+'min-height:58px;border:'+bord+';border-radius:6px;padding:2px 3px;background:'+bg+';'+ring+'"><div style="text-align:right;font-size:11px;color:'+(esHoy?'var(--accent)':'var(--muted)')+';font-weight:'+(esHoy?'700':'400')+'">'+d+'</div>'+(es?'<div style="font-size:9px;font-weight:700;color:'+(neg?'var(--red)':'var(--green)')+';line-height:1.05">'+(neg?'⚠️':'')+'-$'+fmt(tot,0)+'</div>':'')+(es&&totBsDia?'<div style="font-size:8px;font-weight:700;color:#b45309;line-height:1.05">'+fmt(totBsDia,0)+' Bs</div>':'')+(bal!=null?'<div style="font-size:8px;color:'+(neg?'var(--red)':'var(--muted)')+';margin-top:1px" title="ahorro acumulado en $">$'+fmt(bal,0)+'</div>':'')+'</div>';
  }
  grid+='</div>';
  var hint='<div style="font-size:10px;color:var(--muted);text-align:center;margin:8px 0 4px">El número chico de cada día es el <b>ahorro acumulado</b> (ganancia menos lo pagado). En <span style="color:var(--red)">rojo</span> = no alcanza lo ahorrado para ese pago: hay que moverlo o ahorrar más.</div>';
  var panel=_calDiaSel?('<div style="margin-top:6px">'+_calPanelDia(_calDiaSel)+'</div>'):'';
  var weeks={},weeksU={}; ev.forEach(function(e){ var dt=new Date(e.fecha+'T00:00:00'); var wk=new Date(dt); wk.setDate(dt.getDate()-dt.getDay()); var kk=wk.toISOString().slice(0,10); weeks[kk]=(weeks[kk]||0)+_evCost(e); if(e.mon==='usd')weeksU[kk]=(weeksU[kk]||0)+_evCost(e); });
  var wkk=Object.keys(weeks).sort(); var sem='';
  if(wkk.length){ sem='<div style="font-size:11px;color:var(--muted);margin-bottom:6px">Capacidad $'+fmt(capSem,0)+'/sem · 💵 dólares vs 🇻🇪 bolívares</div>'+wkk.map(function(kk,i){ var d0=new Date(kk+'T00:00:00'); var d1=new Date(d0); d1.setDate(d0.getDate()+6); var lbl=('0'+d0.getDate()).slice(-2)+' al '+('0'+d1.getDate()).slice(-2); var ov=weeks[kk]>capSem; return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-top:'+(i?'1px solid var(--border)':'0')+'"><span style="color:var(--muted)">'+(ov?'⚠️ ':'')+'Semana '+(i+1)+' ('+lbl+')</span><span style="text-align:right"><span style="font-weight:700;color:'+(ov?'var(--red)':'var(--text)')+'">$'+fmt(weeks[kk])+'</span><br><span style="font-size:9px;color:var(--muted)">💵 $'+fmt(weeksU[kk]||0)+' · 🇻🇪 $'+fmt(weeks[kk]-(weeksU[kk]||0))+'</span></span></div>'; }).join(''); }
  var gf=cf.gastos_fijos||[]; var totGf=gf.reduce(function(s,g){return s+(Number(g.monto)||0);},0);
  var ist='padding:5px 6px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);font-size:11px';
  var gfRows=gf.map(function(g){ return '<div style="display:flex;gap:5px;align-items:center;padding:4px 0;border-top:1px solid var(--border)"><input value="'+esc(g.concepto)+'" onchange="_calSetGasto(\''+g.id+'\',\'concepto\',this.value)" style="flex:1;min-width:0;'+ist+'"><input type="number" value="'+(Number(g.monto)||0)+'" onchange="_calSetGasto(\''+g.id+'\',\'monto\',this.value)" style="width:78px;text-align:right;'+ist+'" title="$/mes"><input type="number" value="'+(g.dia||5)+'" min="1" max="28" onchange="_calSetGasto(\''+g.id+'\',\'dia\',this.value)" style="width:46px;text-align:center;'+ist+'" title="día"><button onclick="_calDelGasto(\''+g.id+'\')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:15px">×</button></div>'; }).join('');
  var gfBox='<div style="display:flex;gap:5px;font-size:9px;color:var(--muted);padding-bottom:2px"><span style="flex:1">Concepto</span><span style="width:78px;text-align:right">$/mes</span><span style="width:46px;text-align:center">día</span><span style="width:15px"></span></div>'+(gfRows||'<div style="font-size:11px;color:var(--muted);padding:6px">Ninguno aún.</div>')+'<div style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="_calAddGasto()">+ Agregar gasto fijo</button></div>';
  var comp=_calCompras(); var totComp=comp.reduce(function(s,c){return s+(Number(c.monto_usd)||0);},0);
  var compRows=comp.slice().sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');}).map(function(c){ var realc=(Number(c.monto_usd)||0)*((c.moneda==='usd')?F:1); return '<div style="display:flex;gap:6px;align-items:center;padding:4px 0;border-top:1px solid var(--border)"><span style="font-size:10px;color:var(--muted);width:74px">'+(c.fecha||'')+'</span><span style="flex:1;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.nota||'Mercancía')+' <span style="font-size:9px;color:var(--muted)">('+(c.moneda==='usd'?'$':'Bs')+')</span></span><span style="font-weight:700;font-size:12px">$'+fmt(c.monto_usd)+(c.moneda==='usd'&&F>1?' <span style="font-size:9px;color:var(--red)">→$'+fmt(realc)+'</span>':'')+'</span>'+(_cxpPuede()?'<button onclick="_calDelCompra(\''+c.id+'\')" style="border:0;background:none;color:var(--red);cursor:pointer;font-size:15px">×</button>':'')+'</div>'; }).join('');
  var addComp=_cxpPuede()?('<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><input id="cal-comp-monto" type="number" placeholder="Monto $" style="width:84px;'+ist+'"><select id="cal-comp-mon" style="'+ist+'"><option value="usd">en $</option><option value="bs">en Bs</option></select><input id="cal-comp-fecha" type="date" value="'+HOY()+'" style="'+ist+'"><input id="cal-comp-nota" type="text" placeholder="Nota (proveedor, qué)" style="flex:1;min-width:110px;'+ist+'"><button class="btn btn-green btn-sm" onclick="_calAddCompra()">+ Agregar</button></div>'):'';
  var comprasBox=addComp+(compRows||'<div style="font-size:11px;color:var(--muted);padding:4px">Aún no has anotado compras de mercancía.</div>')+'<div style="font-size:10px;color:var(--muted);margin-top:6px">Cada compra se resta en su día en el calendario. Las pagadas en $ llevan el sobrecosto del dólar.</div>';
  el.innerHTML=head+toggle+kpis+kpinote+nav+grid+hint+panel+_calSec('mes','📋 Todo lo que se paga este mes — cuánto y cuándo','$'+fmt(totMes), _calDetalleMes(ym))+_calSec('cfg','⚙️ Ajustes · ventas, margen y dólar','ahorras $'+fmt(gan)+'/día', cfg+'<div style="height:12px"></div>'+fxBox)+(wkk.length?_calSec('sem','📊 Resumen por semana','', sem):'')+_calSec('gf','🧾 Gastos fijos mensuales','$'+fmt(totGf)+'/mes', gfBox)+_calSec('merc','📦 Mercancía nueva','$'+fmt(totComp)+' anotado', comprasBox);
}
function _cascResumen(){
  var ap=_calAbonoPlan(); if(ap.modo!=='cascada'||ap.activo!==true) return '';
  var ev=(typeof _simCascada==='function')?_simCascada():null; if(!ev) return '';
  var M3=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var lbl=function(f){ return M3[parseInt(f.slice(5,7))-1]+" '"+f.slice(2,4); };
  var ab=ev.filter(function(e){return e.tipo==='abono';});
  var pay={}, names={}; ab.forEach(function(e){ pay[e.id]=e.fecha; names[e.id]=e.label; });
  var orden=ap.orden||[]; var rows=orden.map(function(id,i){ if(!pay[id])return ''; var bs='<div style="display:flex;justify-content:space-between;padding:5px 0;border-top:'+(i?'1px solid rgba(255,255,255,.2)':'0')+'"><span>'+(i+1)+'. '+esc(names[id]||id)+'</span><span style="font-weight:800">salda '+lbl(pay[id])+'</span></div>'; return bs; }).join('');
  return '<div class="tbox" style="padding:14px;margin:6px 0 12px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border:0"><div style="font-weight:800;font-size:14px;margin-bottom:4px">⚡ Plan en cascada activo</div><div style="font-size:11px;opacity:.9;margin-bottom:8px">Abonos $'+fmt(ap.monto||10000)+'/mes desde '+lbl((ap.inicio||'2026-10')+'-01')+'. Al terminar uno, el siguiente arranca con cuota doble ($'+fmt(ap.boost||20000)+'). La comisión baja sola. Ya está reflejado en el calendario.</div>'+rows+'</div>';
}
function renderCalSimulador(){
  var b=document.getElementById('calp-sim'); if(!b)return;
  var tasa=getTasa(); var ap=_calAbonoPlan(); var F=_calFactorDolar(); var premPct=Math.round((F-1)*100);
  var _cascHtml=_cascResumen();
  var binance=_calTasaBinance();
  var loans=(db.prestamos||[]).filter(function(l){return _esInteres(l)&&l.activo!==false&&(Number(l.saldo_capital)||0)>0.01;});
  var M3=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var lbl=function(ym){ if(!ym)return'—'; return M3[parseInt(ym.slice(5,7))-1]+" '"+ym.slice(2,4); };
  var inpSt='margin-top:3px;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);width:120px';
  var ctrl='<div class="tbox" style="padding:12px;margin:6px 0 12px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">💸 Simulador de abonos a capital</div><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end"><label style="font-size:10px;color:var(--muted)">Monto de cada abono ($)<br><input type="number" value="'+ap.monto+'" onchange="_calSetSim(\'monto\',this.value)" style="'+inpSt+'"></label><label style="font-size:10px;color:var(--muted)">Cada cuántos meses<br><input type="number" min="1" value="'+ap.cadaMeses+'" onchange="_calSetSim(\'cada\',this.value)" style="'+inpSt+'"></label></div><div style="font-size:10px;color:var(--muted);margin-top:8px">Cada préstamo es una deuda en dólares: pagar abono y comisión cuesta +'+premPct+'% real (compras de $ a Binance). Pulsa "Reflejar en calendario" para que los abonos y la comisión que baja aparezcan en los días.</div></div>';
  if(!loans.length){ b.innerHTML=_cascHtml+ctrl+'<div class="tbox" style="text-align:center;padding:24px;color:var(--muted)">No hay préstamos personales con saldo de capital.</div>'; return; }
  var cards=loans.map(function(l){
    var on=ap.prestamos.indexOf(l.id)>=0;
    var iniYM=(l.proxima_cuota||HOY()).slice(0,7);
    var sim=_simAbono(l, ap.monto, ap.cadaMeses, iniYM, l.dia_pago);
    var comActual=_interesMensual(l);
    var idq=l.id.replace(/'/g,"\\'");
    var toggleBtn='<button class="btn '+(on?'btn-accent':'btn-ghost')+' btn-sm" onclick="_calToggleSimLoan(\''+idq+'\')">'+(on?'✓ En el calendario':'Reflejar en calendario')+'</button>';
    var head='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div><div style="font-weight:700;font-size:13px">'+esc(l.banco)+' <span class="badge" style="background:#7c3aed;color:#fff;font-size:9px">PERSONAL</span></div><div style="font-size:11px;color:var(--muted)">Capital $'+fmt(l.saldo_capital)+' · comisión hoy $'+fmt(comActual)+'/mes</div></div>'+toggleBtn+'</div>';
    var fin=sim.fin?lbl(sim.fin.slice(0,7)):'—';
    var costoRealUSD=Math.round((sim.totAbono+sim.totComision)*F);
    var costoRealBs=tasa?Math.round((sim.totAbono+sim.totComision)*F*tasa):null;
    var milestones=sim.pasos.filter(function(p){return p.abono>0;}); var shown=milestones.slice(0,12);
    var prim=sim.pasos.length?(sim.pasos[0].abono+sim.pasos[0].com):0;
    var th='padding:6px 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px;font-weight:700;border-bottom:1px solid var(--border);white-space:nowrap';
    var rowsH='<div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;min-width:430px">'+
      '<thead><tr><th style="'+th+';text-align:left">Mes</th><th style="'+th+';text-align:right">Deuda</th><th style="'+th+';text-align:right">Pagas real</th><th style="'+th+';text-align:right">Bs a reunir</th><th style="'+th+';text-align:right">Capital</th></tr></thead><tbody>'+
      shown.map(function(p){ var tm=Math.round((p.abono+p.com)*100)/100; var tmR=Math.round(tm*F); var tmBs=binance>0?Math.round(tm*binance):0; var td='padding:7px 8px;border-top:1px solid var(--border);white-space:nowrap;vertical-align:middle';
        return '<tr><td style="'+td+';color:var(--muted);font-size:11px">'+lbl(p.fecha.slice(0,7))+'</td>'+
          '<td style="'+td+';text-align:right"><div style="font-weight:700;font-size:12px">$'+fmt(tm)+'</div><div style="font-size:9px;color:var(--muted)">'+fmt(p.abono)+' + '+fmt(p.com)+'</div></td>'+
          '<td style="'+td+';text-align:right;color:var(--red);font-size:11px">'+(F>1?'$'+fmt(tmR):'—')+'</td>'+
          '<td style="'+td+';text-align:right;color:var(--amber);font-weight:700;font-size:12px">'+(tmBs?fmt(tmBs,0):'—')+'</td>'+
          '<td style="'+td+';text-align:right;color:var(--accent);font-size:12px">$'+fmt(p.capDesp)+'</td></tr>'; }).join('')+
      '</tbody></table></div>';
    var primBs=binance>0?Math.round(prim*binance):0;
    var notaMes='<div style="font-size:10px;color:var(--muted);margin-top:6px">Cada mes pagas el abono <b>más</b> la comisión de ese mes. El primer mes son <b style="color:var(--text)">$'+fmt(prim)+'</b>'+(primBs?(' = <b style="color:var(--amber)">'+fmt(primBs,0)+' Bs</b> que tienes que reunir (comprando los $ a '+fmt(binance,0)+' Bs)'):'')+', y va bajando porque la comisión baja con cada abono.</div>';
    var stats='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 6px">'+
      '<div class="tbox" style="padding:7px;text-align:center"><div style="font-size:9px;color:var(--muted)">ABONOS</div><div style="font-weight:800">'+sim.nAbonos+'</div></div>'+
      '<div class="tbox" style="padding:7px;text-align:center"><div style="font-size:9px;color:var(--muted)">SE SALDA</div><div style="font-weight:800;color:var(--green);font-size:13px">'+fin+'</div></div>'+
      '<div class="tbox" style="padding:7px;text-align:center"><div style="font-size:9px;color:var(--muted)">COMISIÓN TOTAL</div><div style="font-weight:800;color:var(--amber);font-size:13px">$'+fmt(sim.totComision)+'</div></div>'+
      '<div class="tbox" style="padding:7px;text-align:center"><div style="font-size:9px;color:var(--muted)">BS TOTALES A REUNIR</div><div style="font-weight:800;color:var(--amber);font-size:13px">'+(costoRealBs?fmt(costoRealBs,0):'—')+' Bs</div><div style="font-size:8px;color:var(--muted)">para comprar $'+fmt(sim.totAbono+sim.totComision)+'</div></div></div>';
    var more=(milestones.length>shown.length)?'<div style="font-size:10px;color:var(--muted);padding-top:4px">… y '+(milestones.length-shown.length)+' abonos más.</div>':'';
    return '<div class="tbox" style="padding:13px;margin-bottom:10px;border-left:4px solid '+(on?'var(--accent)':'#9ca3af')+'">'+head+stats+rowsH+more+notaMes+'</div>';
  }).join('');
  b.innerHTML=_cascHtml+ctrl+cards;
}
function _calSetVista(v){ _calVista=v; renderCalPagos(); }
function _calSetSim(campo,val){ if(typeof _cxpPuede==='function'&&!_cxpPuede())return; var ap=_calAbonoPlan(); if(campo==='monto')ap.monto=parseFloat(val)||0; else if(campo==='cada')ap.cadaMeses=Math.max(1,parseInt(val)||1); _cxpSave(); renderCalPagos(); }
function _calToggleSimLoan(id){ if(typeof _cxpPuede==='function'&&!_cxpPuede())return; var ap=_calAbonoPlan(); var i=ap.prestamos.indexOf(id); if(i>=0)ap.prestamos.splice(i,1); else ap.prestamos.push(id); ap.activo=ap.prestamos.length>0; _cxpSave(); renderCalPagos(); }
function _calAddCompra(){ if(typeof _cxpPuede==='function'&&!_cxpPuede())return; var mo=parseFloat((document.getElementById('cal-comp-monto')||{}).value); var mon=(document.getElementById('cal-comp-mon')||{}).value||'usd'; var fe=(document.getElementById('cal-comp-fecha')||{}).value; var no=((document.getElementById('cal-comp-nota')||{}).value||'').trim(); if(!mo||mo<=0){ showToast&&showToast('Ingresa el monto'); return; } var usd=mo; if(mon==='bs'){ var t=getTasa(); var bin=_calTasaBinance()||t; if(bin>0)usd=Math.round(mo/bin*100)/100; } if(!fe)fe=HOY(); var x=_cxp(); if(!Array.isArray(x.compras))x.compras=[]; x.compras.push({id:'mc'+Date.now().toString(36)+Math.random().toString(36).slice(2,4),fecha:fe,monto_usd:Math.round(usd*100)/100,moneda:(mon==='bs'?'bs':'usd'),nota:no}); _cxpSave(); try{ logAudit&&logAudit('cal.compra','$'+fmt(usd)+' · '+no); }catch(e){} renderCalPagos(); }
function _calDelCompra(id){ if(typeof _cxpPuede==='function'&&!_cxpPuede())return; var x=_cxp(); x.compras=(x.compras||[]).filter(function(c){return c.id!==id;}); _cxpSave(); renderCalPagos(); }
function _calAddGasto(){ var x=_cxp(); if(!Array.isArray(x.gastos_fijos))x.gastos_fijos=[]; x.gastos_fijos.push({id:'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,4),concepto:'Nuevo gasto',monto:0,dia:5,grupo:'Gasto fijo'}); _cxpSave(); renderCalPagos(); }
function _calDelGasto(id){ var x=_cxp(); x.gastos_fijos=(x.gastos_fijos||[]).filter(function(g){return g.id!==id;}); _cxpSave(); renderCalPagos(); }
function _calSetGasto(id,campo,val){ var x=_cxp(); var g=(x.gastos_fijos||[]).filter(function(z){return z.id===id;})[0]; if(!g)return; if(campo==='monto'||campo==='dia')g[campo]=parseFloat(val)||0; else g[campo]=val; _cxpSave(); if(campo==='monto'||campo==='dia')renderCalPagos(); }
function _calSetCfg(campo,val){ var x=_cxp(); var n=parseFloat(val)||0; if(campo==='ingreso')x.ingreso_diario=n; else if(campo==='nomina'){ if(!x.nomina)x.nomina={activa:true}; x.nomina.quincena_usd=n; } else if(campo==='saldo')x.saldo_inicial=n; else if(campo==='margen')x.margen_pct=n; else if(campo==='binance')x.tasa_binance=n; else if(campo==='ahorro'){ x.fecha_ahorro=val; } _cxpSave(); renderCalPagos(); }
function _calNavMes(d){ var y=parseInt(_calMes.slice(0,4)),m=parseInt(_calMes.slice(5,7))-1+d; var dt=new Date(y,m,1); _calMes=dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2); renderCalPagos(); }
function _calDia(f){ _calDiaSel=f; renderCalPagos(); }
function _calPanelDia(fecha){
  var tasa=getTasa(); var binEff=(_calTasaBinance()>0?_calTasaBinance():tasa)||0; var lst=_calPagosEventos().filter(function(e){return e.fecha===fecha;});
  if(!lst.length) return '<div style="text-align:center;color:var(--muted);font-size:12px;padding:12px">Sin pagos ese día.</div>';
  var tot=lst.reduce(function(s,x){return s+_evCost(x);},0); var venc=(fecha<HOY()); var dUsd=lst.filter(function(e){return e.mon==='usd';}).reduce(function(s,e){return s+_evCost(e);},0); var dBs=tot-dUsd;
  var icon={'prestamo':'🏦','interes':'👤','proveedor':'🧾','nomina':'👥','gasto':'💡','compras':'📦','abono':'⬇️','comision':'🤝'};
  lst.sort(function(a,b){ return _evCost(b)-_evCost(a); });
  var totNom=lst.reduce(function(s,x){return s+(Number(x.monto)||0);},0);
  var h='<div class="tbox" style="padding:13px;border:1.5px solid var(--accent);border-radius:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><strong style="font-size:13px">'+fmtDate(fecha)+(venc?' <span style="color:var(--red);font-size:10px">(vencido)</span>':'')+'</strong><span style="text-align:right"><span style="font-weight:800;font-size:14px">$'+fmt(Math.round(tot))+'</span>'+(binEff?'<br><span style="font-weight:800;font-size:13px;color:var(--amber)">'+fmt(Math.round(tot*binEff),0)+' Bs a reunir</span>':'')+'</span></div>';
  if(dUsd>0&&dBs>0){ h+='<div style="display:flex;gap:10px;justify-content:flex-end;font-size:10px;margin:-2px 0 6px"><span style="color:#15803d;font-weight:700">💵 $'+fmt(dUsd)+' en dólares</span><span style="color:#1e40af;font-weight:700">🇻🇪 $'+fmt(dBs)+' en bolívares</span></div>'; }
  h+=lst.map(function(x){ var nominal=Number(x.monto)||0; var real=Math.round(_evCost(x)); var prem=(x.f&&x.f>1); var distinto=(Math.abs(real-nominal)>1); var bs=binEff?Math.round(_evCost(x)*binEff):null; var fij=(x.fijo?' <span style="font-size:8px;color:var(--muted)">(fijo)</span>':''); return '<div style="border-top:1px solid var(--border);padding:7px 0;display:flex;justify-content:space-between;gap:8px"><div style="min-width:0"><div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(icon[x.tipo]||'•')+' '+esc(x.label)+' '+_calMonBadge(x.mon)+fij+'</div><div style="font-size:10px;color:var(--muted)">'+esc(x.cat)+(x.sub?(' · '+esc(x.sub)):'')+(prem?' · se compra en $':'')+(distinto?(' · deuda $'+fmt(nominal)):'')+'</div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:9px;color:var(--muted)">te cuesta</div><div style="font-weight:700;font-size:13px">$'+fmt(real)+'</div>'+(bs?'<div style="font-size:11px;font-weight:700;color:var(--amber)">'+fmt(bs,0)+' Bs</div>':'')+'</div></div>'; }).join('');
  h+='</div>'; return h;
}

(function() {
  try{ setTimeout(function(){ var _b=document.getElementById('boot-splash'); if(_b){ _b.style.opacity='0'; setTimeout(function(){ try{_b.style.display='none';}catch(e){} },380); } }, 4000); }catch(e){}
  if (location.hash && /buzon/i.test(location.hash)) {
    try{ var _bz=document.getElementById('boot-splash'); if(_bz)_bz.style.display='none'; }catch(e){}
    try{ _buzonPublico(); }catch(e){ console.error('buzon',e); }
    return;
  }
  if (location.hash && /reto/i.test(location.hash)) { try{ var _bs=document.getElementById('boot-splash'); if(_bs)_bs.style.display='none'; }catch(e){} try{ _retoPublico(); }catch(e){ console.error('reto',e); } return; }
  // Parámetro de emergencia: ?reset=1 limpia localStorage y recarga sin él
  if (new URLSearchParams(location.search).get('reset') === '1') {
    localStorage.clear(); sessionStorage.clear();
    location.replace(location.pathname); return;
  }
  db = loadDB();
  db.facturas  = limpiarDecimales(db.facturas);
  db.historial = limpiarDecimales(db.historial);
  saveDB(db);
  renderTasaHeader();
  renderPanel();
  renderBadges();

  // Restaurar estado del sidebar
  if (localStorage.getItem('fc_sidebar') === '0') document.body.classList.add('sb-collapsed');
  // Restaurar sesión activa
  // Restaurar sesión real de Supabase (si hay sesión activa guardada)
  supabaseClient.auth.getSession().then(({ data }) => {
    const sess = data && data.session;
    if (sess && sess.user) {
      const u = (sess.user.email||'').split('@')[0];
      const meta = sess.user.user_metadata || {};
      currentUser = u;
      currentRole = meta.role || (USERS[u] && USERS[u].role) || 'mayra';
      document.getElementById('ov-login').style.display = 'none';
      document.body.dataset.role = currentRole; try{aplicarPermisos();}catch(e){} try{initEmpresa();}catch(e){}
      applyRoleUI();
      resetInactivityTimer();
      syncFromSupabase(true).then(() => { migrateFromOldApps(); autoBackupSemanal(); });
      startRealtime();
    }
    _bootDone();
  }).catch(function(){ _bootDone(); });
  function _bootDone(){ var b=document.getElementById('boot-splash'); if(b){ b.style.opacity='0'; setTimeout(function(){ try{ if(b&&b.parentNode)b.style.display='none'; }catch(e){} },380); } }
  setTimeout(_bootDone, 4500);

  const s = db.settings;
  checkTasaBanner();
  if (getTasa() && (typeof _tasaVencida==='function' ? _tasaVencida() : false)) {
    var _uf = Object.keys(db.tasas||{}).sort().pop() || s.tasa_fecha || '—';
    setTimeout(() => showToast('Tasa no actualizada (última: ' + fmtDate(_uf) + ')'), 1200);
  }
})();



/* ===== Buzón anónimo de mejoras (página pública #buzon) ===== */
function _buzonPublico(){
  document.body.innerHTML='<div style="min-height:100vh;background:linear-gradient(160deg,#1E2E52,#1E38A6);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,Segoe UI,Arial">'+
    '<div style="background:#fff;border-radius:22px;max-width:430px;width:100%;padding:26px;box-shadow:0 30px 80px rgba(0,0,0,.35)">'+
    '<div style="text-align:center;font-size:38px">📮</div>'+
    '<div style="text-align:center;font-weight:900;font-size:20px;color:#1E2E52;margin-top:4px">Buzón de Farmacia Claret</div>'+
    '<div style="text-align:center;font-size:13px;color:#667085;margin:6px 0 16px;line-height:1.5">Cuéntanos qué podemos mejorar.<br><b>100% anónimo</b>: no guardamos tu nombre ni ningún dato tuyo.</div>'+
    '<textarea id="bz-txt" rows="5" maxlength="1200" placeholder="Escribe aquí tu idea, queja o sugerencia…" style="width:100%;box-sizing:border-box;border:1.5px solid #E4E7EC;border-radius:14px;padding:12px;font-size:15px;resize:vertical;outline:none"></textarea>'+
    '<button id="bz-btn" onclick="_buzonEnviar()" style="width:100%;margin-top:12px;padding:14px;border:0;border-radius:14px;background:linear-gradient(140deg,#079455,#05603A);color:#fff;font-weight:800;font-size:16px;cursor:pointer">Enviar mensaje</button>'+
    '<div id="bz-msg" style="text-align:center;font-size:12px;color:#667085;margin-top:10px"></div>'+
    '</div></div>';
}
function _buzonEnviar(){
  var t=(document.getElementById('bz-txt')||{}).value||''; t=t.trim();
  var msg=document.getElementById('bz-msg'); var btn=document.getElementById('bz-btn');
  if(t.length<3){ if(msg)msg.textContent='Escribe un poquito más 🙂'; return; }
  if(btn){ btn.disabled=true; btn.textContent='Enviando…'; }
  supabaseClient.from('buzon_mejoras').insert([{mensaje:t}]).then(function(r){
    if(r&&r.error){ if(msg)msg.textContent='No se pudo enviar. Intenta de nuevo.'; if(btn){btn.disabled=false;btn.textContent='Enviar mensaje';} return; }
    document.body.innerHTML='<div style="min-height:100vh;background:linear-gradient(160deg,#1E2E52,#1E38A6);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,Segoe UI,Arial"><div style="text-align:center;color:#fff"><div style="font-size:64px">💚</div><div style="font-weight:900;font-size:24px;margin-top:8px">¡Gracias!</div><div style="opacity:.85;margin-top:6px;font-size:15px">Tu mensaje llegó de forma anónima.<br>Nos ayuda a mejorar.</div><button onclick="location.reload()" style="margin-top:20px;padding:11px 24px;border:0;border-radius:12px;background:rgba(255,255,255,.15);color:#fff;font-weight:700;cursor:pointer">Enviar otro</button></div></div>';
  });
}
