/* Pantallas de la app. Estado global en S (definido en app.js). */
const ICON = {
  panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.8"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
};
const NAV = [
  ['panel', 'Panel', 'panel'], ['pagos', 'Pagos', 'check'], ['escanear', 'Escanear', 'scan'], ['gastos', 'Gastos', 'list'],
  ['facturas', 'Facturas', 'folder'], ['presupuesto', 'Presupuesto', 'target'], ['informe', 'Informe', 'report'], ['ajustes', 'Ajustes', 'gear'],
];

/* ---------- Cálculos compartidos ---------- */
const Calc = {
  inMonth: (key) => S.expenses.filter(e => monthKey(e.date) === key),
  total: (key) => sum(Calc.inMonth(key).map(e => e.amount)),
  budget: (id) => (S.budgets[id] ?? CAT[id].budget),
  budgetTotal: () => sum(CATEGORIES.map(c => Calc.budget(c.id))),
  byCat(key) {
    const m = {}; Calc.inMonth(key).forEach(e => m[e.category] = (m[e.category] || 0) + e.amount);
    return CATEGORIES.map(c => ({ id: c.id, name: c.name, color: c.color, value: m[c.id] || 0 })).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
  },
  byVendor(key, n = 6) {
    const m = {}; Calc.inMonth(key).forEach(e => { const v = e.vendor || 'Sin comercio'; m[v] = (m[v] || 0) + e.amount; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, n);
  },
  months(endKey, n) { return Array.from({ length: n }, (_, i) => addMonths(endKey, i - n + 1)); },
  isCurrent: (key) => key === monthKey(todayISO()),
  elapsed: (key) => Calc.isCurrent(key) ? new Date().getDate() : daysInMonth(key),
  summary(key) {
    const total = Calc.total(key), prevKey = addMonths(key, -1), el = Calc.elapsed(key);
    const prevSame = sum(Calc.inMonth(prevKey).filter(e => +e.date.slice(8) <= el).map(e => e.amount));
    const delta = prevSame ? (total - prevSame) / prevSame * 100 : null;
    const bt = Calc.budgetTotal(), dim = daysInMonth(key);
    return { total, prevKey, prevSame, delta, bt, remaining: bt - total, pctUsed: bt ? total / bt * 100 : 0, el, dim, avg: el ? total / el : 0, proj: Calc.isCurrent(key) ? total / el * dim : total };
  },
};
const catTag = id => `<span class="cat-tag"><i style="background:${CAT[id]?.color || '#999'}"></i>${esc(CAT[id]?.name || id)}</span>`;
const monthPicker = () => `<div class="month-picker"><button data-m="-1" aria-label="Mes anterior">‹</button><span>${monthLabel(S.month)}</span><button data-m="1" aria-label="Mes siguiente">›</button></div>`;
function bindMonthPicker(onChange) { $$('.month-picker button').forEach(b => b.onclick = () => { S.month = addMonths(S.month, +b.dataset.m); onChange(); }); }
const deltaPill = d => d == null ? '' : `<span class="pill ${Math.abs(d) < 0.5 ? 'flat' : d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : d < 0 ? '▼' : '•'} ${Math.abs(d).toFixed(0)}%</span>`;
function budgetBars(rows, limit) {
  return rows.slice(0, limit || rows.length).map(r => {
    const pct = r.budget ? r.spent / r.budget * 100 : (r.spent ? 999 : 0);
    const col = pct > 100 ? 'var(--peligro)' : pct >= 85 ? 'var(--alerta)' : r.color;
    return `<div class="bud ${pct > 100 ? 'over' : ''}"><div class="name"><i style="background:${r.color}"></i>${esc(r.name)}</div>
      <div class="bar"><b style="width:${Math.min(100, pct)}%;background:linear-gradient(90deg,color-mix(in srgb,${col} 80%,white),${col})"></b></div>
      <div class="amt"><strong>${fmtMoney0(r.spent)}</strong> / ${fmtMoney0(r.budget)}</div></div>`;
  }).join('');
}
function budgetRows(key) {
  const spent = {}; Calc.inMonth(key).forEach(e => spent[e.category] = (spent[e.category] || 0) + e.amount);
  return CATEGORIES.map(c => ({ id: c.id, name: c.name, color: c.color, budget: Calc.budget(c.id), spent: spent[c.id] || 0 }))
    .filter(r => r.budget || r.spent).sort((a, b) => (b.spent / (b.budget || 1)) - (a.spent / (a.budget || 1)));
}

const Views = {
  /* =========================== PANEL =========================== */
  panel() {
    const v = $('#view');
    if (!S.expenses.length) {
      v.innerHTML = `<div class="page-head"><div><h1>Bienvenido</h1><p>Aún no hay gastos registrados.</p></div></div>
        <div class="card" style="text-align:center;padding:48px 20px">
          <img src="assets/logo-icon.svg" width="84" alt="" style="margin-bottom:10px">
          <h2 style="margin-bottom:8px">Empecemos</h2>
          <p style="color:var(--gris);max-width:520px;margin:0 auto 22px">Puedes escanear la foto de una hoja con facturas, registrar un gasto a mano o cargar datos ficticios para probar el panel.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <a class="btn primary" href="#/escanear">${ICON.scan} Escanear facturas</a>
            <button class="btn" id="b-manual">${ICON.plus} Registrar un gasto</button>
            <button class="btn accent" id="b-demo">Cargar datos de ejemplo</button>
          </div></div>`;
      $('#b-manual').onclick = () => App.expenseForm();
      $('#b-demo').onclick = () => App.loadDemo();
      return;
    }
    const sm = Calc.summary(S.month), cats = Calc.byCat(S.month), top = cats[0];
    v.innerHTML = `
      <div class="page-head"><div><h1>Panel de gastos</h1><p>Resumen interactivo de la familia</p></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${monthPicker()}<button class="btn primary" id="b-add">${ICON.plus} Nuevo gasto</button></div></div>
      <div class="grid g-kpi">
        <div class="card kpi"><div class="lbl">Gastado en el mes</div><div class="val">${fmtMoney(sm.total)}</div>
          <div class="note">${deltaPill(sm.delta)} ${sm.delta == null ? 'Sin datos del mes anterior' : 'vs ' + monthLabel(sm.prevKey).split(' ')[0] + (Calc.isCurrent(S.month) ? ' (mismo día)' : '')}</div></div>
        <div class="card kpi k2"><div class="lbl">${sm.remaining >= 0 ? 'Te queda del presupuesto' : 'Te pasaste del presupuesto'}</div><div class="val" style="color:${sm.remaining >= 0 ? 'var(--bosque)' : 'var(--peligro)'}">${fmtMoney(Math.abs(sm.remaining))}</div>
          <div class="note">${sm.pctUsed.toFixed(0)}% de ${fmtMoney0(sm.bt)} usado</div></div>
        <div class="card kpi k3"><div class="lbl">Promedio diario</div><div class="val">${fmtMoney(sm.avg)}</div>
          <div class="note">${Calc.isCurrent(S.month) ? 'Proyección a fin de mes: <b>' + fmtMoney0(sm.proj) + '</b>' : sm.dim + ' días del mes'}</div></div>
        <div class="card kpi k4"><div class="lbl">Mayor categoría</div><div class="val" style="font-size:${top && top.name.length > 14 ? 24 : 30}px">${top ? esc(top.name) : '—'}</div>
          <div class="note">${top ? fmtMoney(top.value) + ' · ' + (top.value / sm.total * 100).toFixed(0) + '% del gasto' : ''}</div></div>
      </div>

      <div class="grid g-2 mt">
        <div class="card"><h3>¿En qué se va el dinero?</h3><div class="sub">Toca una categoría para filtrar los movimientos</div>
          <div class="donut-wrap"><canvas id="c-donut"></canvas><div class="donut-center"><b>${fmtMoney0(sm.total)}</b><span>${monthLabel(S.month).split(' ')[0]}</span></div></div>
          <div class="legend" id="legend"></div></div>
        <div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap"><div><h3>Tendencia mensual</h3><div class="sub">Gastado frente al presupuesto total</div></div>
          <div class="seg" id="seg-range">${[3, 6, 12].map(n => `<button data-n="${n}" class="${S.range === n ? 'on' : ''}">${n} meses</button>`).join('')}</div></div>
          <div class="chart-box tall"><canvas id="c-trend"></canvas></div></div>
      </div>

      <div class="grid g-eq mt">
        <div class="card"><h3>Ritmo de gasto del mes</h3><div class="sub">Acumulado día a día frente al mes anterior</div><div class="chart-box tall"><canvas id="c-cum"></canvas></div></div>
        <div class="card"><h3>Categorías por mes</h3><div class="sub">Las 6 que más pesan</div><div class="chart-box tall"><canvas id="c-stack"></canvas></div></div>
      </div>

      <div class="grid g-2b mt">
        <div class="card"><h3>Presupuesto por categoría</h3><div class="sub">Verde: en rango · Ámbar: cerca del límite · Rojo: excedido</div>${budgetBars(budgetRows(S.month), 9)}
          <div style="margin-top:8px"><a href="#/presupuesto" class="btn small ghost">Ajustar presupuestos</a></div></div>
        <div class="grid" style="align-content:start">
          ${Pay.panelCard()}
          <div class="card"><h3>Dónde más gastas</h3><div class="sub">Comercios del mes</div><ul class="top-list">${Calc.byVendor(S.month, 5).map(r => `<li><span>${esc(r.name)}</span><b class="num">${fmtMoney(r.value)}</b></li>`).join('') || '<li class="empty">Sin gastos</li>'}</ul></div>
        </div>
      </div>

      <div class="card mt"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><h3 id="mov-title">Últimos movimientos</h3><div class="sub" id="mov-sub"></div></div><a class="btn small ghost" href="#/gastos">Ver todos</a></div><div id="mov"></div></div>`;

    bindMonthPicker(() => Views.panel());
    $('#b-add').onclick = () => App.expenseForm();
    $$('#seg-range button').forEach(b => b.onclick = () => { S.range = +b.dataset.n; Views.panel(); });

    const drawSel = (animate) => {
      Charts.donut('c-donut', cats, { selected: S.selCat, animate, onPick: id => { S.selCat = S.selCat === id ? null : id; drawSel(false); } });
      const selRow = cats.find(r => r.id === S.selCat);
      $('.donut-center').innerHTML = selRow ? `<b style="color:${selRow.color}">${fmtMoney0(selRow.value)}</b><span>${esc(selRow.name)}</span>` : `<b>${fmtMoney0(sm.total)}</b><span>${monthLabel(S.month).split(' ')[0]}</span>`;
      $('#legend').innerHTML = cats.map(r => `<button data-id="${r.id}" class="${S.selCat === r.id ? 'on' : ''}"><i style="background:${r.color}"></i><span>${esc(r.name)}</span><em>${fmtMoney0(r.value)}<small>${sm.total ? (r.value / sm.total * 100).toFixed(0) : 0}%</small></em></button>`).join('');
      $$('#legend button').forEach(b => b.onclick = () => { S.selCat = S.selCat === b.dataset.id ? null : b.dataset.id; drawSel(false); });
      const rows = Calc.inMonth(S.month).filter(e => !S.selCat || e.category === S.selCat).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8);
      $('#mov-title').textContent = S.selCat ? 'Movimientos: ' + CAT[S.selCat].name : 'Últimos movimientos';
      $('#mov-sub').innerHTML = S.selCat ? `<a href="javascript:void(0)" id="clr">Quitar filtro</a>` : 'Del mes seleccionado';
      if (S.selCat) $('#clr').onclick = () => { S.selCat = null; drawSel(false); };
      $('#mov').innerHTML = rows.length ? `<table><thead><tr><th>Fecha</th><th>Comercio</th><th class="hide-m">Categoría</th><th class="r">Monto</th></tr></thead><tbody>${rows.map(e => `<tr><td>${fmtDate(e.date)}</td><td>${esc(e.vendor || '—')}</td><td class="hide-m">${catTag(e.category)}</td><td class="r">${fmtMoney(e.amount)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Sin movimientos</div>';
    };
    drawSel(true);

    const months = Calc.months(S.month, S.range);
    Charts.trend('c-trend', months, months.map(m => Math.round(Calc.total(m) * 100) / 100), Calc.budgetTotal());
    const tot = {}; months.forEach(m => Calc.inMonth(m).forEach(e => tot[e.category] = (tot[e.category] || 0) + e.amount));
    const topIds = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);
    const series = topIds.map(id => ({ name: CAT[id].name, color: CAT[id].color, data: months.map(m => Math.round(Calc.inMonth(m).filter(e => e.category === id).reduce((s, e) => s + e.amount, 0))) }));
    series.push({ name: 'Otras', color: '#C4CED4', data: months.map(m => Math.round(Calc.inMonth(m).filter(e => !topIds.includes(e.category)).reduce((s, e) => s + e.amount, 0))) });
    Charts.stacked('c-stack', months, series);
    // Acumulado
    const dimC = daysInMonth(S.month), dimP = daysInMonth(sm.prevKey), n = Math.max(dimC, dimP);
    const cumOf = (key, dim, limit) => { const per = Array(dim + 1).fill(0); Calc.inMonth(key).forEach(e => per[+e.date.slice(8)] += e.amount); let a = 0; return Array.from({ length: n }, (_, i) => { const d = i + 1; if (d > dim || d > limit) return null; a += per[d]; return Math.round(a * 100) / 100; }); };
    Charts.cumulative('c-cum', Array.from({ length: n }, (_, i) => i + 1), cumOf(S.month, dimC, sm.el), cumOf(sm.prevKey, dimP, 99), monthLabel(S.month), monthLabel(sm.prevKey));
  },

  /* =========================== ESCANEAR =========================== */
  escanear() {
    const v = $('#view'), sc = S.scan;
    const head = `<div class="page-head"><div><h1>Escanear facturas</h1><p>Sube una o varias fotos. La app detecta cada factura, lee el comercio, la fecha y el monto, y las registra sola.</p></div></div>`;
    if (sc.summary) return Views.scanSummary();
    v.innerHTML = head + `
      <div class="card">
        <div class="dropzone" id="drop">${ICON.upload}<h3>Arrastra la foto o toca aquí</h3><p>Foto o escaneo de una hoja tipo Carta con varias facturas (JPG, PNG, HEIC)</p></div>
        <div class="form-grid mt" style="align-items:end">
          <label class="f">Cómo están las facturas en la hoja<select id="sc-mode"><option value="auto">Detectar automáticamente</option><option value="grid">Cuadrícula fija (columnas × filas)</option><option value="single">Es una sola factura</option></select></label>
          <label class="f" id="sc-cols" style="display:none">Columnas<input type="number" id="sc-c" min="1" max="6" value="2"></label>
          <label class="f" id="sc-rows" style="display:none">Filas<input type="number" id="sc-r" min="1" max="8" value="3"></label>
          <div><button class="btn ghost" id="b-sample">Probar con la hoja de ejemplo</button></div>
        </div>
        <p style="color:var(--gris);font-size:13px;margin:14px 0 0">Consejo: foto de frente, con buena luz y sin sombras. Verás una tabla resumen y podrás corregir cualquier dato.</p>
      </div>`;
    const drop = $('#drop'), fi = $('#file-input');
    drop.onclick = () => fi.click();
    fi.onchange = () => { if (fi.files.length) Views.runScan(fi.files); fi.value = ''; };
    ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => { if (e.dataTransfer.files.length) Views.runScan(e.dataTransfer.files); });
    $('#sc-mode').onchange = e => { $('#sc-cols').style.display = $('#sc-rows').style.display = e.target.value === 'grid' ? '' : 'none'; };
    $('#b-sample').onclick = async () => {
      try { const r = await fetch('pruebas/hoja_facturas_demo.jpg'); if (!r.ok) throw 0; Views.runScan(new File([await r.blob()], 'hoja_facturas_demo.jpg', { type: 'image/jpeg' })); }
      catch { toast('No se pudo cargar la hoja de ejemplo', 'err'); }
    };
  },

  async runScan(input) {
    const files = input instanceof File ? [input] : Array.from(input || []);
    if (!files.length) return;
    const v = $('#view'); const mode = $('#sc-mode')?.value || 'auto', cols = +($('#sc-c')?.value || 2), rows = +($('#sc-r')?.value || 3);
    const url = URL.createObjectURL(files[0]); S.urls.push(url);
    v.innerHTML = `<div class="page-head"><div><h1>Leyendo ${files.length > 1 ? 'las fotos' : 'la foto'}…</h1><p id="sc-msg">Preparando…</p></div></div>
      <div class="card"><div class="progress"><b id="sc-bar"></b></div><img class="sheet-preview mt" src="${url}" alt="Foto subida"></div>`;
    try {
      const all = []; let aiNote = '';
      await Sync.ping().catch(() => { });                                     // refresca si la IA está disponible
      const useAI = !!(S.useAI && Sync.info && Sync.info.ai && Sync.info.ai.ready);
      for (let i = 0; i < files.length; i++) {
        const results = await Extract.scan(files[i], { mode, cols, rows, useAI, onStatus: (m, p) => {
          const a = $('#sc-msg'), b = $('#sc-bar'); if (a) a.textContent = (files.length > 1 ? `Foto ${i + 1} de ${files.length} · ` : '') + m; if (b) b.style.width = Math.round((i + p) / files.length * 100) + '%'; } });
        if (results.aiNote) aiNote = results.aiNote;
        all.push(...await App.autoRegister(results));
      }
      S.scan = { summary: all };
      if (aiNote) toast('La IA no pudo leer alguna foto (' + aiNote + '). Se usó el lector local.', 'err');
      if (location.hash.startsWith('#/escanear')) Views.escanear();
    } catch (err) {
      console.error(err); toast('No se pudo leer la imagen: ' + (err.message || err), 'err'); S.scan = {}; Views.escanear();
    }
  },

  // Resumen de las facturas leídas: ya están registradas; la tabla permite corregir cualquier dato
  scanSummary() {
    const v = $('#view'), rows = S.scan.summary || [];
    const expOf = r => S.expenses.find(e => e.id === r.expId);
    const registered = () => rows.filter(r => r.expId && expOf(r)), pending = () => rows.filter(r => !r.expId);
    const notes = r => { const w = []; if (r.flags.date) w.push('no se encontró la fecha: se puso la de hoy'); if (r.flags.vendor) w.push('no se encontró el comercio'); if (r.flags.uncertain) w.push('confirma el total'); return w; };
    const statusCell = r => {
      if (!r.expId) return '<span class="st late">Sin total legible</span><div class="mini">Escribe el monto y registra</div>';
      const w = notes(r), e = expOf(r), bill = e && e.billId && S.bills.find(b => b.id === e.billId);
      return (w.length ? `<span class="st pending">Revisar</span><div class="mini">${esc(w.join(' · '))}</div>` : '<span class="st paid">✓ Registrada</span>') + (r.ai ? '<div class="mini">Leída con IA</div>' : '') + (bill ? `<div class="mini">Pago marcado: ${esc(Pay.billName(bill))}</div>` : '');
    };
    const rowHTML = (r, i) => {
      const e = expOf(r), vendor = e ? e.vendor : r.parsed.vendor, date = e ? e.date : (r.parsed.date || todayISO()), cat = e ? e.category : r.parsed.category;
      return `<tr data-i="${i}"><td data-l="Factura"><div class="sum-thumb" style="background-image:url(${r.thumb})" data-zoom="${i}" title="Ver factura"></div></td>
        <td data-l="Comercio"><input class="inp cell" data-f="vendor" value="${esc(vendor)}" placeholder="Comercio"></td>
        <td data-l="Fecha"><input class="inp cell" type="date" data-f="date" value="${esc(date)}"></td>
        <td data-l="Monto" class="r"><input class="inp cell amt" type="number" step="0.01" min="0" data-f="amount" value="${e ? e.amount.toFixed(2) : ''}" placeholder="0.00"></td>
        <td data-l="Categoría"><select class="inp cell" data-f="category">${catOptions(cat)}</select></td>
        <td data-l="Estado" class="st-cell">${statusCell(r)}${r.expId ? '' : '<div style="margin-top:6px"><button class="btn small primary" data-reg="' + i + '">Registrar</button></div>'}</td></tr>`;
    };
    const total = () => sum(registered().map(r => expOf(r).amount));
    const n = rows.length, nOk = registered().length, nPend = pending().length;
    v.innerHTML = `<div class="page-head"><div><h1>Resumen de facturas</h1><p>${n} comprobante${n === 1 ? '' : 's'} leído${n === 1 ? '' : 's'} · <b>${nOk}</b> registrado${nOk === 1 ? '' : 's'} automáticamente${nPend ? ` · <b style="color:#A83B26">${nPend} sin total legible</b>` : ''}. Si algo está mal, corrígelo aquí mismo.</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="b-another">${ICON.scan} Escanear más</button></div></div>
      <div class="card"><table class="sum-table"><thead><tr><th>Factura</th><th>Comercio</th><th>Fecha</th><th class="r">Monto</th><th>Categoría</th><th>Estado</th></tr></thead><tbody>${rows.map(rowHTML).join('')}</tbody>
      <tfoot><tr><td colspan="3" style="padding:14px 10px;font-weight:700">Total registrado</td><td class="r" id="sum-total" style="font-size:19px;padding:14px 10px">${fmtMoney(total())}</td><td colspan="2"></td></tr></tfoot></table>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:14px"><button class="btn danger" id="b-undo">Deshacer este lote</button><a class="btn" href="#/facturas">Ver facturas guardadas</a><a class="btn primary" href="#/gastos">Ver en Gastos</a></div></div>`;
    const refresh = () => { $('#sum-total').textContent = fmtMoney(total()); };
    $$('.sum-table tbody tr').forEach(tr => {
      const r = rows[+tr.dataset.i];
      $$('.cell', tr).forEach(inp => inp.addEventListener('change', async () => {
        if (!r.expId) return;                                   // los pendientes se registran con el botón
        const f = inp.dataset.f; let val = inp.value;
        if (f === 'amount') { val = parseFloat(val); if (!(val > 0)) { inp.value = expOf(r).amount.toFixed(2); return toast('El monto debe ser mayor que cero', 'err'); } val = Math.round(val * 100) / 100; }
        if (f === 'vendor' && !val.trim()) { inp.value = expOf(r).vendor; return; }
        await App.updateScanRow(r, f, val);
        r.flags = { ...r.flags, [f]: false, uncertain: f === 'amount' ? false : r.flags.uncertain };
        $('.st-cell', tr).innerHTML = statusCell(r); refresh();
      }));
      const z = $('[data-zoom]', tr); if (z) z.onclick = () => App.openModal(`<img class="full" src="${r.thumb}" alt="Factura"><details style="margin-top:12px"><summary style="cursor:pointer;color:var(--gris)">Ver texto leído</summary><pre style="white-space:pre-wrap;font-size:12px;background:#F7F3EA;padding:10px;border-radius:8px">${esc(r.text)}</pre></details><div class="actions"><button class="btn" data-close>Cerrar</button></div>`, true);
      const reg = $('[data-reg]', tr); if (reg) reg.onclick = async () => {
        const amount = parseFloat($('[data-f="amount"]', tr).value); if (!(amount > 0)) return toast('Escribe el monto de la factura', 'err');
        await App.registerPending(r, { vendor: $('[data-f="vendor"]', tr).value.trim(), date: $('[data-f="date"]', tr).value, amount, category: $('[data-f="category"]', tr).value });
        toast('Factura registrada'); Views.scanSummary();
      };
    });
    $('#b-another').onclick = () => { S.scan = {}; Views.escanear(); };
    $('#b-undo').onclick = async () => { if (await App.confirmBox('¿Deshacer este lote?', `Se borrarán los ${nOk} gasto(s) y las copias de factura que se acaban de registrar.`, 'Deshacer lote', true)) { await App.undoBatch(rows); S.scan = {}; toast('Lote deshecho'); Views.escanear(); } };
  },
  /* =========================== GASTOS =========================== */
  gastos() {
    const f = S.f, v = $('#view');
    v.innerHTML = `<div class="page-head"><div><h1>Gastos</h1><p>Todos los movimientos registrados</p></div><button class="btn primary" id="b-add">${ICON.plus} Nuevo gasto</button></div>
      <div class="card"><div class="filters">
        <input class="inp" id="f-q" placeholder="Buscar comercio o nota…" value="${esc(f.q)}" style="min-width:220px">
        <select class="inp" id="f-month"><option value="all">Todos los meses</option>${Calc.months(monthKey(todayISO()), 13).reverse().map(m => `<option value="${m}" ${f.month === m ? 'selected' : ''}>${monthLabel(m)}</option>`).join('')}</select>
        <select class="inp" id="f-cat"><option value="">Todas las categorías</option>${catOptions(f.cat)}</select>
        <select class="inp" id="f-payer"><option value="">Todos los que pagan</option>${S.payers.map(p => `<option ${f.payer === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
      </div><div id="tbl"></div></div>`;
    $('#b-add').onclick = () => App.expenseForm();
    const draw = () => {
      const q = f.q.toLowerCase();
      const rows = S.expenses.filter(e => (f.month === 'all' || monthKey(e.date) === f.month) && (!f.cat || e.category === f.cat) && (!f.payer || e.payer === f.payer) && (!q || (e.vendor + ' ' + (e.note || '')).toLowerCase().includes(q)))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      const shown = rows.slice(0, 300);
      $('#tbl').innerHTML = rows.length ? `<table><thead><tr><th>Fecha</th><th>Comercio</th><th class="hide-m">Categoría</th><th class="hide-m">Pagó</th><th class="hide-m">Origen</th><th class="r">Monto</th><th></th></tr></thead><tbody>
        ${shown.map(e => `<tr><td>${fmtDate(e.date)}</td><td>${esc(e.vendor || '—')}${e.note ? `<div style="font-size:12px;color:var(--gris)">${esc(e.note)}</div>` : ''}</td><td class="hide-m">${catTag(e.category)}</td><td class="hide-m">${esc(e.payer || '')}</td>
          <td class="hide-m"><span class="src ${e.invoiceId ? 'f' : ''}">${e.invoiceId ? 'Factura' : e.demo ? 'Ejemplo' : 'Manual'}</span>${e.billId ? ' <span class="st paid" title="Pago registrado en Pagos del mes">✓ Pago</span>' : ''}</td>
          <td class="r">${fmtMoney(e.amount)}</td><td style="white-space:nowrap;text-align:right"><button class="btn small ghost" data-edit="${e.id}">Editar</button> <button class="btn small danger" data-del="${e.id}">Borrar</button></td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="5" style="padding:12px 10px;font-weight:700">${rows.length} movimiento${rows.length === 1 ? '' : 's'}${rows.length > 300 ? ' (mostrando 300)' : ''}</td><td class="r" style="font-size:17px;padding:12px 10px">${fmtMoney(sum(rows.map(r => r.amount)))}</td><td></td></tr></tfoot></table>` : '<div class="empty">No hay gastos con esos filtros.</div>';
      $$('[data-edit]').forEach(b => b.onclick = () => App.expenseForm(S.expenses.find(e => e.id === b.dataset.edit)));
      $$('[data-del]').forEach(b => b.onclick = () => App.deleteExpense(b.dataset.del));
    };
    draw();
    $('#f-q').oninput = e => { f.q = e.target.value; draw(); };
    $('#f-month').onchange = e => { f.month = e.target.value; draw(); };
    $('#f-cat').onchange = e => { f.cat = e.target.value; draw(); };
    $('#f-payer').onchange = e => { f.payer = e.target.value; draw(); };
  },

  /* =========================== FACTURAS =========================== */
  facturas() {
    const v = $('#view'), byInv = Object.fromEntries(S.expenses.filter(e => e.invoiceId).map(e => [e.invoiceId, e]));
    const list = S.invoices.slice().sort((a, b) => ((byInv[b.id]?.date || '') + b.createdAt).localeCompare((byInv[a.id]?.date || '') + a.createdAt));
    S.urls.forEach(u => URL.revokeObjectURL(u)); S.urls = [];
    const urlById = {};
    v.innerHTML = `<div class="page-head"><div><h1>Facturas guardadas</h1><p>${list.length} copia${list.length === 1 ? '' : 's'} guardada${list.length === 1 ? '' : 's'} en este dispositivo</p></div><a class="btn primary" href="#/escanear">${ICON.scan} Escanear más</a></div>
      ${list.length ? `<div class="gallery">${list.map(inv => { const e = byInv[inv.id]; const u = inv.blob ? URL.createObjectURL(inv.blob) : ''; S.urls.push(u); urlById[inv.id] = u;
        return `<div class="g-item"><div class="im" style="background-image:url(${u})" data-view="${inv.id}"></div><div class="meta"><b>${esc(e?.vendor || inv.name)}</b>${e ? fmtDate(e.date) + ' · <b style="display:inline">' + fmtMoney(e.amount) + '</b><div style="margin-top:4px">' + catTag(e.category) + '</div>' : '<span style="color:var(--gris)">Sin gasto vinculado</span>'}</div>
        <div class="act"><button class="btn small" data-view="${inv.id}">Ver</button><button class="btn small danger" data-rm="${inv.id}">Borrar copia</button></div></div>`; }).join('')}</div>` : `<div class="card empty"><p>Todavía no hay copias guardadas.</p><a class="btn primary" href="#/escanear">Escanear facturas</a></div>`}`;
    const urlOf = id => urlById[id];
    $$('[data-view]').forEach(b => b.onclick = () => { const e = byInv[b.dataset.view]; App.openModal(`<img class="full" src="${urlOf(b.dataset.view)}" alt="Factura">${e ? `<p style="text-align:center;margin:10px 0 0"><b>${esc(e.vendor)}</b> · ${fmtDate(e.date)} · ${fmtMoney(e.amount)}</p>` : ''}<div class="actions"><button class="btn" data-close>Cerrar</button></div>`, true); });
    $$('[data-rm]').forEach(b => b.onclick = () => App.deleteInvoice(b.dataset.rm));
  },

  /* =========================== PRESUPUESTO =========================== */
  presupuesto() {
    const v = $('#view'), spent = Object.fromEntries(Calc.byCat(S.month).map(r => [r.id, r.value]));
    v.innerHTML = `<div class="page-head"><div><h1>Presupuesto mensual</h1><p>Define cuánto quieres gastar por categoría. Se guarda al escribir.</p></div>${monthPicker()}</div>
      <div class="card"><table><thead><tr><th>Categoría</th><th class="r" style="width:150px">Límite mensual</th><th class="hide-m" style="width:36%">Avance en ${monthLabel(S.month).split(' ')[0]}</th><th class="r">Gastado</th></tr></thead><tbody>
      ${CATEGORIES.map(c => { const b = Calc.budget(c.id), s = spent[c.id] || 0, pct = b ? s / b * 100 : 0, col = pct > 100 ? 'var(--peligro)' : pct >= 85 ? 'var(--alerta)' : c.color;
        return `<tr><td>${catTag(c.id)}</td><td class="r"><input class="inp num" type="number" min="0" step="10" value="${b}" data-b="${c.id}" style="width:110px;text-align:right"></td>
        <td class="hide-m"><div class="bar" style="height:11px;background:#EFEBDF;border-radius:99px;overflow:hidden"><b style="display:block;height:100%;width:${Math.min(100, pct)}%;background:linear-gradient(90deg,color-mix(in srgb,${col} 80%,white),${col})"></b></div></td><td class="r">${fmtMoney0(s)} <span style="color:var(--gris);font-weight:500;font-size:12px">(${pct.toFixed(0)}%)</span></td></tr>`; }).join('')}
      </tbody><tfoot><tr><td style="font-weight:700;padding:14px 10px">Total</td><td class="r" style="font-size:18px" id="bt-total">${fmtMoney0(Calc.budgetTotal())}</td><td class="hide-m"></td><td class="r" style="font-size:18px">${fmtMoney0(sum(Object.values(spent)))}</td></tr></tfoot></table></div>`;
    bindMonthPicker(() => Views.presupuesto());
    $$('[data-b]').forEach(inp => inp.oninput = async () => { S.budgets[inp.dataset.b] = Math.max(0, parseFloat(inp.value) || 0); await DB.setSetting('budgets', S.budgets); $('#bt-total').textContent = fmtMoney0(Calc.budgetTotal()); });
  },

  /* =========================== INFORME (hoja Carta) =========================== */
  informe() {
    const v = $('#view'), sm = Calc.summary(S.month), cats = Calc.byCat(S.month), months = Calc.months(S.month, 6);
    const nInv = Calc.inMonth(S.month).filter(e => e.invoiceId).length;
    v.innerHTML = `<div class="page-head"><div><h1>Informe en hoja Carta</h1><p>Vista previa lista para imprimir o guardar como PDF (8.5 × 11 pulgadas)</p></div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${monthPicker()}<button class="btn primary" id="b-print">${ICON.print} Imprimir / Guardar PDF</button></div></div>
      <div class="sheet-wrap"><div class="paper">
        <div class="rep-head"><img src="assets/logo-vertical.svg" alt="Gastos del Hogar"><h1>Informe de gastos · <span>${monthLabel(S.month)}</span></h1><p>Resumen del mes${Calc.isCurrent(S.month) ? ' al ' + fmtDate(todayISO()) : ''}</p></div>
        <div class="rep-kpis">
          <div><small>Total gastado</small><b>${fmtMoney(sm.total)}</b></div>
          <div><small>${sm.remaining >= 0 ? 'Disponible' : 'Excedido'}</small><b style="color:${sm.remaining >= 0 ? 'var(--bosque)' : 'var(--peligro)'}">${fmtMoney(Math.abs(sm.remaining))}</b></div>
          <div><small>Promedio diario</small><b>${fmtMoney(sm.avg)}</b></div>
          <div><small>Vs. mes anterior</small><b>${sm.delta == null ? '—' : (sm.delta > 0 ? '+' : '') + sm.delta.toFixed(0) + '%'}</b></div>
        </div>
        <div class="rep-2">
          <div><h3>Distribución por categoría</h3><div class="chart-s"><canvas id="r-donut"></canvas></div></div>
          <div><h3>Detalle por categoría</h3><table><thead><tr><th>Categoría</th><th class="r">Gastado</th><th class="r">Límite</th><th class="r">%</th></tr></thead><tbody>
            ${cats.slice(0, 10).map(r => { const b = Calc.budget(r.id); return `<tr><td>${catTag(r.id)}</td><td class="r">${fmtMoney0(r.value)}</td><td class="r" style="color:var(--gris);font-weight:500">${fmtMoney0(b)}</td><td class="r" style="color:${r.value > b ? 'var(--peligro)' : 'inherit'}">${b ? (r.value / b * 100).toFixed(0) + '%' : '—'}</td></tr>`; }).join('')}
          </tbody></table></div>
        </div>
        <h3>Tendencia de los últimos 6 meses</h3><div class="chart-m"><canvas id="r-trend"></canvas></div>
        <div class="rep-2" style="margin-top:4px">
          <div><h3>Principales comercios</h3><ul class="top-list" style="font-size:12px">${Calc.byVendor(S.month, 4).map(r => `<li><span>${esc(r.name)}</span><b class="num">${fmtMoney(r.value)}</b></li>`).join('')}</ul></div>
          <div><h3>Presupuesto: categorías con más avance</h3>${budgetBars(budgetRows(S.month), 4)}</div>
        </div>
        <div class="rep-foot">Gastos del Hogar · ${Calc.inMonth(S.month).length} movimientos (${nInv} con factura archivada) · Pagos fijos: ${Pay.summary(S.month).paidN} de ${Pay.summary(S.month).total} realizados · Generado el ${fmtDate(todayISO())}</div>
      </div></div>`;
    bindMonthPicker(() => Views.informe());
    $('#b-print').onclick = () => window.print();
    Charts.donut('r-donut', cats, { animate: false, labels: false });
    Charts.trend('r-trend', months, months.map(m => Math.round(Calc.total(m) * 100) / 100), Calc.budgetTotal(), false);
  },

  /* =========================== AJUSTES =========================== */
  ajustes() {
    const v = $('#view'), nDemo = S.expenses.filter(e => e.demo).length;
    v.innerHTML = `<div class="page-head"><div><h1>Ajustes</h1><p>Datos, respaldo y opciones</p></div></div>
      <div class="grid g-2b">
        <div class="grid" style="align-content:start">
          ${window.SOLO_TELEFONO
            ? `<div class="card"><h3>Tu teléfono</h3><div class="sub">Tus gastos viven solo aquí.</div><div id="sync-detail"></div></div>`
            : `<div class="card"><h3>Sincronización: celular y computadora</h3><div class="sub">Todos los dispositivos ven los mismos gastos y facturas.</div><div id="sync-detail"></div></div>
          <div class="card"><h3>Lectura con inteligencia artificial</h3><div class="sub">Opcional. Más precisa con facturas arrugadas, borrosas o difíciles.</div><div id="ai-detail"></div></div>`}
          <div class="card"><h3>Datos de ejemplo</h3><div class="sub">Seis meses de gastos ficticios con copias de facturas, para probar el panel.</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn accent" id="s-demo">Cargar datos de ejemplo</button><button class="btn" id="s-undemo" ${nDemo ? '' : 'disabled'}>Quitar datos de ejemplo (${nDemo})</button></div></div>
          <div class="card"><h3>Respaldo y exportación</h3><div class="sub">Descarga tus gastos para abrirlos en Excel o guardarlos como respaldo.</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="s-csv">Exportar a Excel (CSV)</button><button class="btn" id="s-json">Respaldo completo (con fotos)</button><button class="btn" id="s-restore">Restaurar un respaldo</button><input type="file" id="s-restore-file" accept=".json,application/json" hidden></div></div>
          <div class="card"><h3>Quiénes pagan</h3><div class="sub">Nombres separados por coma. Aparecen al registrar cada gasto.</div>
            <input class="inp" id="s-payers" value="${esc(S.payers.join(', '))}"></div>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card"><h3>Dónde se guardan los datos</h3>${window.SOLO_TELEFONO ? '<p style="color:var(--gris);margin:6px 0 0">Tus gastos y las fotos de facturas se guardan <b>solo en este teléfono</b>, dentro de esta app. Nadie más los ve. Guarda un respaldo de vez en cuando (puedes enviarlo a Archivos, iCloud, WhatsApp o correo) para no perderlos si cambias de teléfono.</p>' : `<p style="color:var(--gris);margin:6px 0 0">Cada dispositivo guarda sus datos en su propio navegador. Cuando la computadora tiene abierto <b>Iniciar Gastos del Hogar.bat</b>, los datos y las copias de facturas también se guardan en la carpeta <code>data</code> de la computadora y se comparten con el celular. Descarga un respaldo de vez en cuando (Excel o JSON).</p>`}</div>
          <div class="card" style="border:1.5px solid #F2C9BF"><h3 style="color:var(--peligro)">Zona de cuidado</h3><div class="sub">Borra absolutamente todo: gastos, facturas y presupuestos.</div><button class="btn danger" id="s-wipe">Borrar todos los datos</button></div>
        </div>
      </div>`;
    Sync.ping().then(() => Sync.renderDetail());
    Sync.renderDetail();
    $('#s-demo').onclick = () => App.loadDemo();
    $('#s-undemo').onclick = async () => { const n = await Seed.clearDemo(); await App.reload(); toast(`Se quitaron ${n} gastos de ejemplo`); Views.ajustes(); };
    $('#s-csv').onclick = () => App.exportCSV();
    $('#s-json').onclick = () => App.exportFull();
    $('#s-restore').onclick = () => $('#s-restore-file').click();
    $('#s-restore-file').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) await App.importFull(f); };
    $('#s-payers').onchange = async e => { S.payers = e.target.value.split(',').map(s => s.trim()).filter(Boolean); await DB.setSetting('payers', S.payers); toast('Lista guardada'); };
    $('#s-wipe').onclick = async () => { if (await App.confirmBox('¿Borrar todos los datos?', 'Se eliminarán todos los gastos, copias de facturas y presupuestos. No se puede deshacer.', 'Sí, borrar todo', true)) { for (const e of S.expenses) await DB.del('expenses', e.id); for (const i of S.invoices) await DB.del('invoices', i.id); for (const k of ['budgets', 'bills', 'cardNames', 'payers']) await DB.setSetting(k, null); await App.reload(); toast('Todo borrado'); Views.ajustes(); } };
  },
};
