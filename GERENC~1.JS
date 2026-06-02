// ── Farmacia Claret · App · Router & Init ────────────────────────────────────

let activeTab = 'panel';
let histTab    = 'facturas';
let histFilter = { search: '', empresa: 'all', desde: '', hasta: '' , orden:'reciente'};

function showTab(tab) {
  if (window.innerWidth <= 768) closeMobileSidebar();
  // Sync bottom nav active state
  const bnTabMap = {
    'panel':'bn-panel','fact-farmacia':'bn-facturas','fact-drogueria':'bn-facturas',
    'prestamos-fcia':'bn-prestamos','prestamos-drog':'bn-prestamos',
    'historial':'bn-historial','verif-ines':'bn-verif','gerencia':'bn-gerencia'
  };
  if (bnTabMap[tab]) setActiveBnTab(bnTabMap[tab]);
  // Verificar permiso de rol
  if (currentRole && TAB_ROLES[tab] && !TAB_ROLES[tab].includes(currentRole)) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById('page-'+tab);
  const tabEl = document.getElementById('tab-'+tab);
  if (page)  page.classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  activeTab = tab;
  renderTab(tab);
}

function renderTab(tab) {
  if (tab==='panel')           renderPanel();
  else if (tab==='bancos')     renderBancos();
  else if (tab==='prestamos-fcia') renderPrestamos('FARMACIA');
  else if (tab==='prestamos-drog') renderPrestamos('DROGUERIA');
  else if (tab==='fact-farmacia')  renderFacturas('farmacia');
  else if (tab==='fact-drogueria') renderFacturas('drogueria');
  else if (tab==='historial')  renderHistorial();
  else if (tab==='verif-ines')  renderVerifInes();
  else if (tab==='gerencia')    renderGerencia();
  else if (tab==='admin-panel') renderAdminPanel();
  renderBadges();
}


// ══════════════════════════════════════════════════════════════
// GERENCIA DASHBOARD
// ══════════════════════════════════════════════════════════════
let _chartFact = null, _chartPrest = null, _chartVerif = null;

// ─── Gerencia helpers ──────────────────────────────────────────
function _gerenciaKPIs() {
  const tasa    = db.settings.tasa || 0;
  const today   = HOY();
  const mesActual = today.substring(0,7);
  const factActivas  = db.facturas.filter(f => f.activa);
  const prestActivos = (db.prestamos||[]).filter(p => p.activo);
  const bancosHoy    = getBancosHoy();
  const bancoList    = ['BANESCO','BDV','BNC','CARIBE','MERCANTIL','PROVINCIAL','TESORO'];
  const totalBancoBs = bancoList.reduce((a,b)=>a+((bancosHoy.FARMACIA[b]||0)+(bancosHoy.DROGUERIA[b]||0)),0);
  const pagasMes     = db.historial.filter(h=>h.empresa && (h.pagada_en||'').startsWith(mesActual));
  // Últimos 6 meses
  const meses6 = [];
  for (let i=5;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); meses6.push(d.toISOString().substring(0,7)); }
  const pagasPorMes = meses6.map(m=>({
    mes:m, label:m.substring(5)+'/'+m.substring(0,4),
    total:db.historial.filter(h=>(h.pagada_en||'').startsWith(m)).reduce((a,h)=>a+(h.monto_usd||0),0)
  }));
  const cuotasPorMes = meses6.map(m=>{
    let total=0;
    (db.prestamos||[]).forEach(p=>{
      if(!p.fecha_inicio||!p.cuota_usd) return;
      const inicio=new Date(p.fecha_inicio+'T00:00:00');
      const mesDate=new Date(m+'-01T00:00:00');
      const primerPago=new Date(inicio); primerPago.setMonth(primerPago.getMonth()+1);
      const diff=(mesDate.getFullYear()-primerPago.getFullYear())*12+(mesDate.getMonth()-primerPago.getMonth());
      if(diff>=0 && diff<(p.cuotas_hechas||0)) total+=(p.cuota_usd||0);
    });
    return total;
  });
  const prestPorBanco={};
  prestActivos.forEach(p=>{ prestPorBanco[p.banco]=(prestPorBanco[p.banco]||0)+(p.saldo_usd||0); });
  return { tasa,today,bancoList,bancosHoy,totalBancoBs,factActivas,prestActivos,
           pagasMes,pagasPorMes,cuotasPorMes,prestPorBanco,
           totalPendUsd:factActivas.reduce((a,f)=>a+(f.monto_usd||0),0),
           totalPendBs:factActivas.reduce((a,f)=>a+(f.monto_bs_pagar||f.monto_bs||0),0),
           totalDeudaUsd:prestActivos.reduce((a,p)=>a+(p.saldo_usd||0),0),
           cuotaMes:prestActivos.reduce((a,p)=>a+(p.cuota_usd||0),0),
           totalPagadoMes:pagasMes.reduce((a,h)=>a+(h.monto_usd||0),0) };
}

function _gerenciaKPICards(k) {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:24px">
      <div class="scard blue"><div class="scard-label">Disponible en Bancos</div>
        <div class="scard-val">${fmt(k.totalBancoBs,0)} Bs</div>
        <div class="scard-sub">${k.tasa ? '≈ $'+fmt(k.totalBancoBs/k.tasa)+' · ' : ''}Farmacia + Droguería hoy</div></div>
      <div class="scard orange"><div class="scard-label">Facturas Pendientes</div>
        <div class="scard-val">$${fmt(k.totalPendUsd)}</div>
        <div class="scard-sub">${k.factActivas.length} facturas · ${fmt(k.totalPendBs,0)} Bs</div></div>
      <div class="scard red"><div class="scard-label">Deuda Préstamos</div>
        <div class="scard-val">$${fmt(k.totalDeudaUsd)}</div>
        <div class="scard-sub">Cuota mensual: $${fmt(k.cuotaMes)}</div></div>
      <div class="scard purple"><div class="scard-label">Pagado Este Mes</div>
        <div class="scard-val">$${fmt(k.totalPagadoMes)}</div>
        <div class="scard-sub">${k.pagasMes.length} facturas liquidadas</div></div>
    </div>`;
}

function _gerenciaTablas(k) {
  const tasa = k.tasa;
  const entraBs = k.totalBancoBs;
  // Por pagar esta semana (lo que vence pronto) — NO incluye el atraso acumulado
  const factSemana = k.factActivas.filter(f => computeEstado(f)==='POR_VENCER');
  const loanSemana = k.prestActivos.filter(pp => ['HOY','PROXIMO'].includes(estadoPrestamo(pp)));
  const saleBs = factSemana.reduce((a,f)=>a+(bsActual(f)||0),0)
               + loanSemana.reduce((a,pp)=>a+(tasa?(pp.cuota_usd||0)*tasa:0),0);
  // Vencido acumulado (atrasado): se muestra aparte para no inflar la comparación del día
  const factVenc = k.factActivas.filter(f => computeEstado(f)==='VENCIDA');
  const loanVenc = k.prestActivos.filter(pp => estadoPrestamo(pp)==='VENCIDO');
  const vencidoBs = factVenc.reduce((a,f)=>a+(bsActual(f)||0),0)
                  + loanVenc.reduce((a,pp)=>a+(tasa?(pp.cuota_usd||0)*tasa:0),0);
  const vencidoCount = factVenc.length + loanVenc.length;
  const balance = entraBs - saleBs;
  const maxV = Math.max(entraBs, saleBs, 1);
  const wIn  = Math.round(entraBs/maxV*100);
  const wOut = Math.round(saleBs/maxV*100);
  const usd = v => tasa ? '$'+fmt(v/tasa) : '';
  const bar = (label, val, w, color, sub) =>
    '<div style="margin-bottom:18px">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
      + '<span style="font-size:13px;font-weight:600;color:var(--text)">'+label+'</span>'
      + '<span style="font-family:var(--mono);font-weight:700;font-size:15px;color:'+color+'">'+fmt(val,0)+' Bs</span>'
    + '</div>'
    + '<div style="height:16px;background:var(--surface2);border-radius:99px;overflow:hidden"><div style="width:'+w+'%;height:100%;background:'+color+';border-radius:99px;transition:width .4s"></div></div>'
    + (sub ? '<div style="font-size:11px;color:var(--muted);margin-top:4px">'+sub+'</div>' : '')
    + '</div>';
  const balColor = balance >= 0 ? 'var(--green)' : 'var(--red)';
  const balText  = entraBs === 0
    ? 'Aún no se ha registrado la disponibilidad de hoy'
    : (balance >= 0 ? 'La caja de hoy cubre los pagos de esta semana' : 'Falta '+fmt(Math.abs(balance),0)+' Bs para cubrir esta semana');
  return `
    <div class="tbox">
      <span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg> Comparativa de la semana — entra vs sale</span>
      <div style="padding:16px">
        ${bar('Entra (disponible hoy)', entraBs, wIn, 'var(--green)', usd(entraBs) ? usd(entraBs)+' disponible en bancos' : 'Sin registro de hoy')}
        ${bar('Por pagar esta semana', saleBs, wOut, 'var(--red)', factSemana.length+' facturas · '+loanSemana.length+' cuotas'+(usd(saleBs)?' · '+usd(saleBs):''))}
        <div style="border-top:1px solid var(--border);padding-top:12px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:600">Balance de la semana</span>
          <span style="font-family:var(--mono);font-weight:700;font-size:19px;color:${balColor}">${fmt(balance,0)} Bs</span>
        </div>
        <div style="font-size:12px;color:${balColor};text-align:right;margin-top:3px">${balText}</div>
        ${vencidoBs>0 ? '<div style="margin-top:14px;padding:9px 12px;background:var(--surface2);border-radius:8px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;color:var(--muted)">Vencido acumulado ('+vencidoCount+' atrasados)</span><span style="font-family:var(--mono);font-weight:700;font-size:13px;color:var(--amber)">'+fmt(vencidoBs,0)+' Bs</span></div><div style="font-size:11px;color:var(--muted);margin-top:4px">Atraso histórico — se va saldando aparte, no entra en el balance de la semana.</div>' : ''}
      </div>
    </div>`;
}

function _gerenciaCharts(k) {
  if (_chartFact)  { _chartFact.destroy();  _chartFact=null; }
  if (_chartPrest) { _chartPrest.destroy(); _chartPrest=null; }
  if (typeof Chart === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => renderGerencia();
    document.head.appendChild(s);
    return;
  }
  const ctxF = document.getElementById('chart-fact');
  if (ctxF) {
    _chartFact = new Chart(ctxF, {
      type:'bar',
      data:{
        labels: k.pagasPorMes.map(m=>m.label),
        datasets:[
          { label:'Facturas a proveedores', data:k.pagasPorMes.map(m=>m.total), backgroundColor:'rgba(61,181,74,0.75)', borderColor:'#3DB54A', borderWidth:1, borderRadius:4, stack:'pagos' },
          { label:'Cuotas préstamos',       data:k.cuotasPorMes, backgroundColor:'rgba(59,130,246,0.75)', borderColor:'#3B82F6', borderWidth:1, borderRadius:4, stack:'pagos' }
        ]
      },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:true,position:'top',labels:{font:{size:11},padding:10,boxWidth:12}},
                  tooltip:{callbacks:{label:ctx=>' $'+fmt(ctx.parsed.y)}} },
        scales:{ x:{stacked:true}, y:{stacked:true,beginAtZero:true,ticks:{callback:v=>'$'+fmt(v,0)}} }
      }
    });
  }
  const ctxP = document.getElementById('chart-prest');
  const pBancos = Object.keys(k.prestPorBanco);
  const colors  = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316'];
  if (ctxP && pBancos.length) {
    _chartPrest = new Chart(ctxP, {
      type:'doughnut',
      data:{ labels:pBancos, datasets:[{ data:pBancos.map(b=>k.prestPorBanco[b]), backgroundColor:colors.slice(0,pBancos.length), borderWidth:2 }] },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'right',labels:{font:{size:11},padding:8}},
                  tooltip:{callbacks:{label:ctx=>' $'+fmt(ctx.parsed)}} } }
    });
  } else if (ctxP) {
    ctxP.parentElement.innerHTML = '<p style="text-align:center;color:var(--muted);padding:60px 0">Sin préstamos activos</p>';
  }
}

function renderGerencia() {
  const el = document.getElementById('gerencia-content');
  if (!el) return;
  const k = _gerenciaKPIs();
  el.innerHTML = `
    <p class="section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> Gerencia — Dashboard</p>
    ${_gerenciaKPICards(k)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div class="tbox">
        <span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> Pagos realizados — últimos 6 meses (USD)</span>
        <div style="position:relative;height:clamp(140px,30vw,200px)"><canvas id="chart-fact"></canvas></div>
      </div>
      <div class="tbox">
        <span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>Saldo Deuda por Banco</span>
        <div style="position:relative;height:clamp(140px,30vw,200px)"><canvas id="chart-prest"></canvas></div>
      </div>
    </div>
    ${_gerenciaTablas(k)}
  `;
  _gerenciaCharts(k);
}

// ══════════════════════════════════════════════════════════════
// ADMIN PANEL
// ══════════════════════════════════════════════════════════════
let adminTab = 'users';

function renderAdminPanel() {
  const el = document.getElementById('admin-panel-content');
  if (!el) return;
  el.innerHTML = `
    <p class="section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> Panel de Administración</p>
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn ${adminTab==='users'?'btn-accent':'btn-ghost'} btn-sm" onclick="adminTab='users';renderAdminPanel()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Usuarios</button>
      <button class="btn ${adminTab==='audit'?'btn-accent':'btn-ghost'} btn-sm" onclick="adminTab='audit';renderAdminPanel()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Log de Auditoría</button>
      <button class="btn ${adminTab==='db'?'btn-accent':'btn-ghost'} btn-sm" onclick="adminTab='db';renderAdminPanel()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg> Base de Datos</button>
    </div>
    <div id="admin-inner"></div>
  `;
  if (adminTab==='users')  renderUserManagement();
  else if (adminTab==='audit') renderAuditLog();
  else if (adminTab==='db')    renderDBAdmin();
}

function renderUserManagement() {
  const el = document.getElementById('admin-inner');
  if (!el) return;
  const users = db.users || [];
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-weight:600;font-size:14px">Usuarios del sistema</span>
      <button class="btn btn-green btn-sm write-only" onclick="abrirNuevoUsuario()">+ Nuevo Usuario</button>
    </div>
    <table class="tbl">
      <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th></tr></thead>
      <tbody>
        ${users.length ? users.map(u=>`
          <tr>
            <td class="mono">${esc(u.username)}</td>
            <td>${esc(u.nombre)}</td>
            <td><span style="background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600">${esc(u.role)}</span></td>
            <td>${u.activo ? '<span style="color:var(--green)">● Activo</span>' : '<span style="color:var(--red)">● Inactivo</span>'}</td>
            <td style="font-size:11px;color:var(--muted)">${u.creado_en ? fmtDate(u.creado_en.substring(0,10)) : '—'}</td>
            <td style="display:flex;gap:6px;justify-content:flex-end">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="abrirEditarUsuario('${esc(u.username)}')" title="Cambiar contraseña / editar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleUsuarioActivo('${esc(u.username)}')" title="${u.activo?'Desactivar':'Activar'}" style="color:${u.activo?'var(--red)':'var(--green)'}">${u.activo?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>'}</button>
            </td>
          </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sin usuarios</td></tr>'}
      </tbody>
    </table>

    <!-- Modal editar usuario (inline) -->
    <div id="edit-user-modal" style="display:none;margin-top:24px;max-width:480px">
      <div class="tbox">
        <span class="tbox-title" id="edit-user-title">Editar Usuario</span>
        <div class="form-grid" style="margin-top:12px">
          <div class="form-group">
            <label class="form-label">Usuario</label>
            <input class="form-input" id="eu-username" readonly style="background:var(--surface2)">
          </div>
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <input class="form-input" id="eu-nombre">
          </div>
          <div class="form-group">
            <label class="form-label">Rol</label>
            <select class="form-input" id="eu-role">
              <option value="mayra">mayra</option>
              <option value="grismar">grismar</option>
              <option value="ines">ines</option>
              <option value="gerente">gerente</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nueva contraseña <span style="color:var(--muted)">(dejar vacío para no cambiar)</span></label>
            <input class="form-input" id="eu-pass" type="password" autocomplete="new-password" placeholder="Nueva contraseña...">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-accent btn-sm" onclick="guardarUsuario()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Guardar</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('edit-user-modal').style.display='none'">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal nuevo usuario (inline) -->
    <div id="new-user-modal" style="display:none;margin-top:24px;max-width:480px">
      <div class="tbox">
        <span class="tbox-title">Nuevo Usuario</span>
        <div class="form-grid" style="margin-top:12px">
          <div class="form-group">
            <label class="form-label">Usuario *</label>
            <input class="form-input" id="nu-username" placeholder="usuario (minúsculas)">
          </div>
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input class="form-input" id="nu-nombre" placeholder="Nombre completo">
          </div>
          <div class="form-group">
            <label class="form-label">Rol *</label>
            <select class="form-input" id="nu-role">
              <option value="mayra">mayra</option>
              <option value="grismar">grismar</option>
              <option value="ines">ines</option>
              <option value="gerente">gerente</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña *</label>
            <input class="form-input" id="nu-pass" type="password" autocomplete="new-password">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-green btn-sm" onclick="crearUsuario()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Crear</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('new-user-modal').style.display='none'">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}

function abrirEditarUsuario(username) {
  const u = db.users?.find(x=>x.username===username);
  if (!u) return;
  document.getElementById('edit-user-modal').style.display = 'block';
  document.getElementById('new-user-modal').style.display  = 'none';
  document.getElementById('eu-username').value = u.username;
  document.getElementById('eu-nombre').value   = u.nombre;
  document.getElementById('eu-role').value     = u.role;
  document.getElementById('eu-pass').value     = '';
  document.getElementById('edit-user-title').textContent = 'Editar: '+u.nombre;
}

function abrirNuevoUsuario() {
  document.getElementById('new-user-modal').style.display  = 'block';
  document.getElementById('edit-user-modal').style.display = 'none';
  document.getElementById('nu-username').value = '';
  document.getElementById('nu-nombre').value   = '';
  document.getElementById('nu-pass').value     = '';
}

async function guardarUsuario() {
  if (!db.users) return;
  const uname  = document.getElementById('eu-username').value;
  const nombre = document.getElementById('eu-nombre').value.trim();
  const role   = document.getElementById('eu-role').value;
  const pass   = document.getElementById('eu-pass').value;
  const idx    = db.users.findIndex(x=>x.username===uname);
  if (idx<0) return;
  db.users[idx].nombre = nombre;
  db.users[idx].role   = role;
  if (pass.length > 0) {
    db.users[idx].passwordHash = await hashPassword(pass);
    logAudit('admin.cambiar_pass','Usuario: '+uname);
  }
  logAudit('admin.editar_usuario','Usuario: '+uname+' · Rol: '+role);
  saveDB(db);
  document.getElementById('edit-user-modal').style.display = 'none';
  renderUserManagement();
  showToast('Usuario actualizado: '+uname);
}

async function crearUsuario() {
  const uname  = (document.getElementById('nu-username').value||'').trim().toLowerCase();
  const nombre = document.getElementById('nu-nombre').value.trim();
  const role   = document.getElementById('nu-role').value;
  const pass   = document.getElementById('nu-pass').value;
  if (!uname||!nombre||!pass) { showToast('Completa todos los campos'); return; }
  if (!db.users) db.users=[];
  if (db.users.find(x=>x.username===uname)) { showToast('Ese usuario ya existe'); return; }
  const nuevoU = {
    username: uname, nombre, role, activo: true,
    passwordHash: await hashPassword(pass),
    creado_en: new Date().toISOString()
  };
  db.users.push(nuevoU);
  logAudit('admin.crear_usuario','Usuario: '+uname+' · Rol: '+role);
  saveDB(db);
  document.getElementById('new-user-modal').style.display = 'none';
  renderUserManagement();
  showToast('Usuario creado: '+uname);
}

function toggleUsuarioActivo(username) {
  const u = db.users?.find(x=>x.username===username);
  if (!u) return;
  if (username===currentUser) { showToast('No puedes desactivar tu propio usuario'); return; }
  u.activo = !u.activo;
  logAudit('admin.toggle_usuario','Usuario: '+username+' → '+(u.activo?'activo':'inactivo'));
  saveDB(db);
  renderUserManagement();
  showToast(u.activo ? ' Usuario activado' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg> Usuario desactivado');
}

function renderAuditLog() {
  const el = document.getElementById('admin-inner');
  if (!el) return;
  const logs = db.auditlog || [];
  const filterUser = '';
  el.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <span style="font-weight:600;font-size:14px">Registro de Auditoría</span>
      <span style="color:var(--muted);font-size:12px">${logs.length} entradas</span>
      <button class="btn btn-ghost btn-sm" onclick="limpiarAuditOld()" style="margin-left:auto"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg> Limpiar >90 días</button>
    </div>
    <div style="overflow-x:auto">
    <table class="tbl" style="font-size:12px">
      <thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
      <tbody>
        ${logs.length ? logs.slice(0,200).map(l=>`
          <tr>
            <td class="mono" style="white-space:nowrap;font-size:11px">${(l.ts||'').replace('T',' ').substring(0,19)}</td>
            <td><strong>${esc(l.nombre||l.user||'?')}</strong></td>
            <td><span style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:10px;font-family:monospace">${esc(l.action||'')}</span></td>
            <td style="color:var(--muted)">${esc(l.detail||'')}</td>
          </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin registros de auditoría</td></tr>'}
      </tbody>
    </table>
    </div>
    ${logs.length>200?`<p style="text-align:center;color:var(--muted);font-size:12px;margin-top:8px">Mostrando 200 de ${logs.length} entradas</p>`:''}
  `;
}

function limpiarAuditOld() {
  if (!confirm('¿Eliminar entradas de auditoría con más de 90 días?')) return;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-90);
  const antes = (db.auditlog||[]).length;
  db.auditlog = (db.auditlog||[]).filter(l => new Date(l.ts) > cutoff);
  logAudit('admin.limpiar_audit','Eliminadas: '+(antes-db.auditlog.length)+' entradas');
  saveDB(db);
  renderAuditLog();
  showToast('Log limpiado');
}

function renderDBAdmin() {
  const el = document.getElementById('admin-inner');
  if (!el) return;
  const keys = ['facturas','historial','prestamos','users','auditlog'];
  const info = keys.map(k=>{
    const d = db[k];
    const n = Array.isArray(d) ? d.length : (d ? Object.keys(d).length : 0);
    const sz = JSON.stringify(d||{}).length;
    return {key:k, count:n, size:sz};
  });
  const lsSz = JSON.stringify(db).length;
  el.innerHTML = `
    <div class="tbox">
      <span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg> Estado de la Base de Datos</span>
      <table class="tbl" style="margin-top:8px">
        <thead><tr><th>Sección</th><th class="r">Registros</th><th class="r">Tamaño</th></tr></thead>
        <tbody>
          ${info.map(r=>`
            <tr>
              <td class="mono">${r.key}</td>
              <td class="r">${r.count}</td>
              <td class="r">${(r.size/1024).toFixed(1)} KB</td>
            </tr>`).join('')}
          <tr style="font-weight:700;border-top:2px solid var(--border)">
            <td>TOTAL (localStorage)</td>
            <td class="r">—</td>
            <td class="r">${(lsSz/1024).toFixed(1)} KB</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:8px;font-size:12px;color:var(--muted)">
        Último backup: <strong>${db.settings.last_backup_fecha ? fmtDate(db.settings.last_backup_fecha) : 'Nunca'}</strong>
        · Backup automático cada 7 días
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="exportarDBJSON()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg> Exportar JSON</button>
        <button class="btn btn-ghost btn-sm" onclick="forzarSync()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg> Forzar Sync Supabase</button>
        <button id="btn-backup-manual" class="btn btn-accent btn-sm" onclick="ejecutarBackupManual()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> Backup Manual Ahora</button>
      </div>
    </div>
    <div class="tbox" style="margin-top:16px" id="backup-hist-box">
      <span class="tbox-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> Historial de Backups (Supabase)</span>
      <p style="color:var(--muted);font-size:12px;margin-top:8px" id="backup-hist-loading">Cargando…</p>
    </div>
  `;
  // Load backup history async
  listarBackups().then(bks => {
    const el = document.getElementById('backup-hist-loading');
    if (!el) return;
    if (!bks.length) { el.textContent = 'Sin backups en Supabase'; return; }
    el.outerHTML = '<table class="tbl" style="margin-top:8px"><thead><tr><th>Fecha</th><th>Guardado</th></tr></thead><tbody>' +
      bks.map(b=>'<tr><td>'+fmtDate(b.fecha)+'</td><td style="font-size:11px;color:var(--muted)">'+b.ts.replace('T',' ').substring(0,19)+'</td></tr>').join('') +
      '</tbody></table>';
  });
}

function exportarDBJSON() {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'farmacia_backup_'+HOY()+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  logAudit('admin.exportar_db','Backup JSON descargado');
  showToast('Backup descargado');
}

function forzarSync() {
  syncFromSupabase(true).then(()=>{
    showToast('Sync completado');
    renderAdminPanel();
  }).catch(()=>showToast('Error de sync'));
}




// ══════════════════════════════════════════════════════════════
// AUTO-LOGOUT POR INACTIVIDAD
// ══════════════════════════════════════════════════════════════
const INACTIVITY_MS = 45 * 60 * 1000; // 45 minutos
let _inactivityTimer = null;
let _warnTimer = null;

function resetInactivityTimer() {
  clearTimeout(_inactivityTimer);
  clearTimeout(_warnTimer);
  const banner = document.getElementById('inactivity-banner');
  if (banner) banner.style.display = 'none';
  if (!currentUser) return;
  // Warn 2 min before logout
  _warnTimer = setTimeout(() => {
    const b = document.getElementById('inactivity-banner');
    if (b) b.style.display = 'flex';
  }, INACTIVITY_MS - 2 * 60 * 1000);
  _inactivityTimer = setTimeout(() => {
    if (currentUser) {
      logAudit('auth.auto_logout','Sesión cerrada por inactividad (45 min)');
      saveDB(db);
      doLogout();
      showToast('⏱ Sesión cerrada por inactividad');
    }
  }, INACTIVITY_MS);
}

function extendSession() {
  const b = document.getElementById('inactivity-banner');
  if (b) b.style.display = 'none';
  resetInactivityTimer();
}

// Bind activity events
['click','keydown','mousemove','touchstart','scroll'].forEach(ev =>
  document.addEventListener(ev, () => { if (currentUser) resetInactivityTimer(); }, { passive: true })
);


function exportarHistorialExcel() {
  if (typeof XLSX === 'undefined') { showToast('SheetJS no disponible'); return; }
  let lista = [...db.historial];
  if (histFilter.empresa!=='all') lista = lista.filter(h=>h.empresa===histFilter.empresa);
  if (histFilter.search) {
    const q = histFilter.search.toLowerCase();
    lista = lista.filter(h=>(h.proveedor||'').toLowerCase().includes(q)||(h.factura||'').toLowerCase().includes(q));
  }
  if (histFilter.desde) lista = lista.filter(h=>(h.pagada_en||'')>=histFilter.desde);
  if (histFilter.hasta) lista = lista.filter(h=>(h.pagada_en||'')<=histFilter.hasta);
  lista.sort((a,b)=>((b.pagada_en||'')>(a.pagada_en||'')?1:-1));

  const rows = [
    ['Historial de Facturas Pagadas — Farmacia Claret'],
    ['Exportado:', new Date().toLocaleString('es-VE'), '', 'Total registros:', lista.length],
    [],
    ['Empresa','Proveedor','Factura','Fecha Fact.','Venció','Monto USD','Monto Bs','Pagada el','Nota Pago']
  ];
  lista.forEach(h => {
    rows.push([
      h.empresa==='farmacia'?'Farmacia':'Droguería',
      h.proveedor||'', h.factura||'',
      h.fecha||'', h.vence||'',
      h.monto_usd||0, h.monto_bs_pagar||0,
      h.pagada_en||'', h.nota_pago||''
    ]);
  });
  // Totals row
  rows.push([]);
  rows.push(['','','','','TOTAL',
    lista.reduce((a,h)=>a+(h.monto_usd||0),0),
    lista.reduce((a,h)=>a+(h.monto_bs_pagar||0),0),'','']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:12},{wch:22},{wch:16},{wch:12},{wch:12},{wch:12},{wch:14},{wch:12},{wch:24}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial');
  const hoy = HOY();
  XLSX.writeFile(wb, 'historial_facturas_'+hoy+'.xlsx');
  logAudit('historial.exportar_excel','Registros: '+lista.length);
  showToast('Excel exportado: historial_facturas_'+hoy+'.xlsx');
}

// ══════════════════════════════════════════════════════════════
// EXPORTAR VERIFICACIÓN BANCARIA A EXCEL
// ══════════════════════════════════════════════════════════════
function exportarVerifExcel(fechaParam) {
  if (typeof XLSX === 'undefined') { showToast('SheetJS no disponible'); return; }
  const hoy = fechaParam || HOY();
  const snap = db.bancos._verif?.[hoy];
  if (!snap) { showToast('Sin datos de verificación para exportar'); return; }

  const VERIF_BANCOS_LIST = VERIF_BANCOS; // use global constant

  // Build rows
  const rows = [
    ['Verificación Bancaria — Farmacia Claret', '', '', '', '', ''],
    ['Fecha:', fmtDate(hoy), '', 'Exportado:', new Date().toLocaleString('es-VE'), ''],
    [''],
    ['Banco', 'Ingreso Bs', 'Comisión Bs', 'Total (I-C)', 'Ing. Adm.', 'Diferencia'],
  ];

  let tI=0,tC=0,tT=0,tA=0,tD=0;
  VERIF_BANCOS_LIST.forEach(b => {
    const s = snap[b] || {};
    const i  = parseFloat(s.ingreso)||0;
    const c  = parseFloat(s.comision)||0;
    const t  = i - c;
    const a  = (s.admin!==null && s.admin!==undefined) ? parseFloat(s.admin)||0 : null;
    const d  = a !== null ? t - a : null;
    tI+=i; tC+=c; tT+=t;
    if(a!==null){tA+=a; tD+=(d||0);}
    rows.push([b, i||'', c||'', t||'', a!==null?a:'', d!==null?d:'']);
  });

  rows.push(['']);
  rows.push(['TOTALES', tI, tC, tT, tA||'', tD||'']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [{wch:22},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14}];

  // Style header rows (bold via comment — SheetJS free doesn't support cell styles, but structure is correct)
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Verificación '+hoy);

  // Also add historial sheet if exists
  if (db.bancos._verif_hist && db.bancos._verif_hist.length) {
    const histRows = [['Fecha','Confirmado por','Confirmado el','Ingreso','Comisión','Total','Adm.','Diferencia']];
    db.bancos._verif_hist.slice(0,50).forEach(h => {
      const t = h.totales||{};
      histRows.push([
        fmtDate(h.fecha), h.confirmada_por||'—',
        (h.confirmada_en||'').substring(0,19).replace('T',' '),
        t.ingreso||0, t.comision||0, t.total||0, t.admin||0, t.dif||0
      ]);
    });
    const wsH = XLSX.utils.aoa_to_sheet(histRows);
    wsH['!cols'] = [{wch:12},{wch:14},{wch:18},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12}];
    XLSX.utils.book_append_sheet(wb, wsH, 'Historial');
  }

  XLSX.writeFile(wb, 'verificacion_bancaria_'+hoy+'.xlsx');
  logAudit('verif.exportar_excel','Fecha: '+hoy);
  showToast('Excel exportado: verificacion_'+hoy+'.xlsx');
}

// ══════════════════════════════════════════════════════════════
// AUTO BACKUP SEMANAL
// ══════════════════════════════════════════════════════════════
async function autoBackupSemanal() {
  try {
    const lastBackup = db.settings.last_backup_fecha;
    const hoy = HOY();
    if (lastBackup) {
      const dias = Math.floor((new Date(hoy) - new Date(lastBackup)) / 86400000);
      if (dias < 7) return; // No es hora aún
    }
    // Crear snapshot
    const snapshot = {
      fecha: hoy,
      ts: new Date().toISOString(),
      facturas_count:  (db.facturas||[]).length,
      historial_count: (db.historial||[]).length,
      prestamos_count: (db.prestamos||[]).length,
      data: JSON.parse(JSON.stringify({ facturas: db.facturas, historial: db.historial, prestamos: db.prestamos, bancos: db.bancos, settings: db.settings }))
    };
    // Save backup row with date as section_name
    const { error } = await supabaseClient.from('app_sections').upsert(
      [{ section_name: 'backup_' + hoy, data: snapshot, updated_at: new Date().toISOString() }],
      { onConflict: 'section_name' }
    );
    if (!error) {
      db.settings.last_backup_fecha = hoy;
      // Save settings quietly (no full sync)
      await supabaseClient.from('app_sections').upsert(
        [{ section_name: 'settings', data: db.settings, updated_at: new Date().toISOString() }],
        { onConflict: 'section_name' }
      );
      localStorage.setItem('fc_last_backup', hoy);
      logAudit('sistema.backup','Backup automático semanal guardado: '+hoy);
      console.info('[Backup] Backup semanal guardado:', hoy);
    }
  } catch(e) {
    console.warn('[Backup] Error en backup semanal:', e);
  }
}

async function ejecutarBackupManual() {
  const btn = document.getElementById('btn-backup-manual');
  if (btn) { btn.disabled=true; btn.textContent='Guardando…'; }
  db.settings.last_backup_fecha = null; // Force
  await autoBackupSemanal();
  if (btn) { btn.disabled=false; btn.textContent='Backup Manual'; }
  showToast('Backup guardado en Supabase');
}

async function listarBackups() {
  try {
    const { data, error } = await supabaseClient
      .from('app_sections')
      .select('section_name,updated_at')
      .like('section_name', 'backup_%')
      .order('section_name', { ascending: false })
      .limit(10);
    if (error || !data) return [];
    return data.map(r => ({ fecha: r.section_name.replace('backup_',''), ts: r.updated_at }));
  } catch(e) { return []; }
}

