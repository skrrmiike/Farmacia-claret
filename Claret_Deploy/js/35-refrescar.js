/* ============================================================
   35-refrescar.js — Desliza hacia abajo para actualizar (prefijo _ptr)
   Con la página arriba del todo, arrastrar hacia abajo muestra el
   aviso y al soltar recarga la app (datos y versión frescos).
   No interfiere con listas internas que tengan su propio scroll.
   ============================================================ */
var _ptrY0=null,_ptrDy=0,_ptrOn=false,_ptrBusy=false;
function _ptrEl(){
  var d=document.getElementById('ptr-aviso');
  if(!d){
    d=document.createElement('div'); d.id='ptr-aviso';
    d.style.cssText='position:fixed;top:-60px;left:50%;transform:translateX(-50%);z-index:99999;background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);box-shadow:0 8px 24px rgba(0,0,0,.18);border-radius:999px;padding:9px 18px;font-size:13px;font-weight:700;transition:top .18s ease;color:var(--text,#0f172a);pointer-events:none;white-space:nowrap';
    document.body.appendChild(d);
  }
  return d;
}
function _ptrEnScroll(el){ var g=0; while(el&&el!==document.body&&g<25){ if(el.scrollTop>0)return true; el=el.parentElement; g++; } return false; }
document.addEventListener('touchstart',function(e){
  if(_ptrBusy){ _ptrY0=null; return; }
  var sc=document.scrollingElement||document.documentElement;
  if(sc.scrollTop>0||_ptrEnScroll(e.target)){ _ptrY0=null; return; }
  _ptrY0=e.touches[0].clientY; _ptrDy=0; _ptrOn=false;
},{passive:true});
document.addEventListener('touchmove',function(e){
  if(_ptrY0==null||_ptrBusy)return;
  _ptrDy=e.touches[0].clientY-_ptrY0;
  if(_ptrDy>18){
    var d=_ptrEl();
    _ptrOn=_ptrDy>90;
    d.textContent=_ptrOn?'↻ Suelta para actualizar':'↓ Desliza para actualizar…';
    d.style.top=Math.min(16,(_ptrDy-18)/6)+'px';
  }
},{passive:true});
document.addEventListener('touchend',function(){
  if(_ptrY0==null)return;
  var d=document.getElementById('ptr-aviso');
  if(_ptrOn&&_ptrDy>90){
    _ptrBusy=true;
    if(d){ d.textContent='↻ Actualizando…'; d.style.top='16px'; }
    setTimeout(function(){ location.reload(); },250);
  } else if(d){ d.style.top='-60px'; }
  _ptrY0=null; _ptrDy=0; _ptrOn=false;
},{passive:true});
