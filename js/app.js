/* Arranque, estado global, navegación y acciones */
const S = {
  expenses: [], invoices: [], budgets: {}, payers: ['Titular', 'Pareja'],
  month: monthKey(todayISO()), range: 6, selCat: null,
  f: { q: '', month: 'all', cat: '', payer: '' },
  scan: {}, urls: [],
};

const App = {
  async reload() {
    S.expenses = await DB.all('expenses');
    S.invoices = await DB.all('invoices');
    S.budgets = await DB.getSetting('budgets', {});
    S.payers = await DB.getSetting('payers', ['Titular', 'Pareja']);
    S.bills = (await DB.getSetting('bills', null)) || DEFAULT_BILLS.map(b => ({ ...b }));
    S.cardNames = await DB.getSetting('cardNames', {});
    S.useAI = !!(await DB.getSetting('useAI', false));
    Pay.applyNames();
    // Limpieza: categorías que ya no existen (p. ej. Educación) -> los gastos pasan a "Otros" y se quitan sus pagos fijos
    const orphan = S.expenses.filter(e => !CAT[e.category]);
    if (orphan.length) { orphan.forEach(e => { e.category = 'otros'; }); await DB.putMany('expenses', orphan); }
    const keep = S.bills.filter(b => CAT[b.category]);
    if (keep.length !== S.bills.length) { S.bills = keep; await DB.setSetting('bills', S.bills); }
  },

  /* ---------- Ventanas ---------- */
  openModal(html, wide = false) {
    const m = $('#modal'), box = $('#modal-box');
    box.className = 'box' + (wide ? ' wide' : '');
    box.innerHTML = html; m.classList.add('open');
    $$('[data-close]', box).forEach(b => b.onclick = App.closeModal);
    return box;
  },
  closeModal() { $('#modal').classList.remove('open'); $('#modal-box').innerHTML = ''; },
  confirmBox(title, text, okLabel = 'Aceptar', danger = false, extra = '') {
    return new Promise(resolve => {
      const box = App.openModal(`<h2>${esc(title)}</h2><p style="color:var(--gris);margin:0">${esc(text)}</p>${extra}<div class="actions"><button class="btn ghost" data-no>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(okLabel)}</button></div>`);
      $('[data-no]', box).onclick = () => { App.closeModal(); resolve(false); };
      $('[data-yes]', box).onclick = () => { const x = $('#extra-check', box)?.checked; App.closeModal(); resolve(extra ? { checked: !!x } : true); };
    });
  },

  /* ---------- Gastos ---------- */
  expenseForm(exp) {
    const e = exp || { date: todayISO(), amount: '', category: 'alimentacion', vendor: '', payer: S.payers[0] || '', note: '' };
    const box = App.openModal(`<h2>${exp ? 'Editar gasto' : 'Nuevo gasto'}</h2>
      <form id="ef" class="form-grid" style="grid-template-columns:1fr 1fr">
        <label class="f">Fecha<input type="date" name="date" required value="${esc(e.date)}"></label>
        <label class="f">Monto ($)<input type="number" name="amount" step="0.01" min="0.01" required value="${e.amount === '' ? '' : Number(e.amount).toFixed(2)}" autofocus></label>
        <label class="f" style="grid-column:1/-1">Comercio o concepto<input name="vendor" required value="${esc(e.vendor)}" placeholder="Ej: Supermercado La Esquina"></label>
        <label class="f">Categoría<select name="category">${catOptions(e.category)}</select></label>
        <label class="f">Pagó<input name="payer" list="payers-l" value="${esc(e.payer)}"><datalist id="payers-l">${S.payers.map(p => `<option value="${esc(p)}">`).join('')}</datalist></label>
        <label class="f" style="grid-column:1/-1">Nota (opcional)<input name="note" value="${esc(e.note || '')}"></label>
        ${exp ? '' : `<label class="f" style="grid-column:1/-1">Foto de la factura (opcional)<input type="file" name="photo" accept="image/*"></label>`}
      </form>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ef-save">Guardar</button></div>`);
    const form = $('#ef', box);
    $('#ef-save', box).onclick = async () => {
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const rec = { ...e, id: e.id || uid(), date: fd.get('date'), amount: Math.round(parseFloat(fd.get('amount')) * 100) / 100, vendor: fd.get('vendor').trim(), category: fd.get('category'), payer: fd.get('payer').trim(), note: fd.get('note').trim(), source: e.source || 'manual', createdAt: e.createdAt || Date.now() };
      const photo = fd.get('photo');
      if (photo && photo.size) { const inv = { id: uid(), blob: photo, name: rec.vendor, createdAt: Date.now(), text: '' }; await DB.put('invoices', inv); rec.invoiceId = inv.id; rec.source = 'factura'; }
      if (!exp) Pay.link(rec);            // si corresponde a un pago pendiente del mes (luz, tarjeta...), lo marca como pagado
      await DB.put('expenses', rec); await App.reload(); App.closeModal();
      const bill = rec.billId && S.bills.find(b => b.id === rec.billId);
      toast(exp ? 'Gasto actualizado' : bill ? `Guardado y marcado como pagado: ${Pay.billName(bill)}` : 'Gasto guardado'); App.route();
    };
  },
  async deleteExpense(id) {
    const e = S.expenses.find(x => x.id === id);
    const r = await App.confirmBox('¿Borrar este gasto?', `${e.vendor} · ${fmtMoney(e.amount)} · ${fmtDate(e.date)}`, 'Borrar', true, e.invoiceId ? '<label style="display:flex;gap:8px;margin-top:14px;align-items:center"><input type="checkbox" id="extra-check" checked> Borrar también la copia de la factura</label>' : '');
    if (!r) return;
    await DB.del('expenses', id);
    if (e.invoiceId && r.checked) await DB.del('invoices', e.invoiceId);
    await App.reload(); toast('Gasto borrado'); App.route();
  },
  async deleteInvoice(invId) {
    const e = S.expenses.find(x => x.invoiceId === invId);
    const box = App.openModal(`<h2>Borrar copia de la factura</h2><p style="color:var(--gris);margin:0">${e ? esc(e.vendor) + ' · ' + fmtMoney(e.amount) + ' · ' + fmtDate(e.date) : 'Esta factura no tiene un gasto vinculado.'}</p>
      <div class="actions" style="flex-wrap:wrap"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="d-img">Borrar solo la copia</button>${e ? '<button class="btn danger" id="d-both">Borrar copia y gasto</button>' : ''}</div>
      ${e ? '<p style="font-size:12px;color:var(--gris);margin:12px 0 0">«Borrar solo la copia» conserva el gasto en tus cuentas y elimina la imagen.</p>' : ''}`);
    const done = async (both) => { await DB.del('invoices', invId); if (e) { if (both) await DB.del('expenses', e.id); else await DB.put('expenses', { ...e, invoiceId: null, source: e.source === 'factura' ? 'manual' : e.source }); } await App.reload(); App.closeModal(); toast(both ? 'Factura y gasto borrados' : 'Copia borrada'); App.route(); };
    $('#d-img', box).onclick = () => done(false);
    if (e) $('#d-both', box).onclick = () => done(true);
  },

  /* ---------- Escaneo ---------- */
  // Lee la factura y la registra sola: gasto + copia de la imagen + resumen (comercio, fecha, monto). No se pide nada.
  makeRecords(f, blob, text, batch) {
    const vendor = f.vendor || 'Comercio sin nombre', date = f.date || todayISO();
    const e = { id: uid(), date, amount: Math.round(f.amount * 100) / 100, category: f.category || 'otros', vendor, payer: S.payers[0] || '', note: '', source: 'factura', invoiceId: null, createdAt: Date.now() };
    const inv = { id: uid(), blob, name: vendor, createdAt: Date.now(), text: text || '', summary: { vendor, date, amount: e.amount, category: e.category } };
    e.invoiceId = inv.id; Pay.link(e, batch);   // luz/agua/tarjeta... -> marca el pago del mes como realizado
    return { e, inv };
  },
  async autoRegister(results) {
    const rows = [], exps = [], invs = [];
    for (const r of results) {
      const row = { thumb: r.thumb, blob: r.blob, text: r.text, ai: !!r.ai, parsed: { vendor: r.vendor, date: r.date, category: r.category },
        flags: { vendor: !r.vendor, date: !r.date, uncertain: !!(r.amount > 0 && r.check && r.check.amount) } };
      if (r.amount > 0) { const { e, inv } = App.makeRecords(r, r.blob, r.text, exps); exps.push(e); invs.push(inv); row.expId = e.id; row.invId = inv.id; }
      rows.push(row);
    }
    if (exps.length) { await DB.putMany('expenses', exps); await DB.putMany('invoices', invs); S.month = monthKey(exps.map(e => e.date).sort().pop()); }
    await App.reload();
    return rows;
  },
  async registerPending(row, f) {
    const { e, inv } = App.makeRecords(f, row.blob, row.text, []);
    await DB.put('invoices', inv); await DB.put('expenses', e); row.expId = e.id; row.invId = inv.id; await App.reload();
  },
  async updateScanRow(row, field, val) {
    const e = S.expenses.find(x => x.id === row.expId); if (!e) return;
    const upd = { ...e, [field]: val }; await DB.put('expenses', upd);
    const inv = S.invoices.find(i => i.id === row.invId);
    if (inv) await DB.put('invoices', { ...inv, name: upd.vendor, summary: { vendor: upd.vendor, date: upd.date, amount: upd.amount, category: upd.category } });
    await App.reload();
  },
  async undoBatch(rows) {
    for (const r of rows) { if (r.expId) await DB.del('expenses', r.expId); if (r.invId) await DB.del('invoices', r.invId); }
    await App.reload();
  },
  async loadDemo() {
    if (S.expenses.length && !(await App.confirmBox('Cargar datos de ejemplo', 'Se cargarán seis meses de gastos ficticios (si ya habías cargado el ejemplo, se reemplaza). Tus gastos reales no se tocan.', 'Cargar'))) return;
    toast('Cargando datos de ejemplo…');
    await Seed.clearDemo(); await Seed.load(); await App.reload(); S.month = monthKey(todayISO()); toast('Listo: datos de ejemplo cargados'); location.hash = '#/panel'; App.route();
  },

  /* ---------- Exportar ---------- */
  exportCSV() {
    const rows = S.expenses.slice().sort((a, b) => a.date.localeCompare(b.date));
    const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
    const csv = '﻿Fecha,Comercio,Categoría,Monto,Pagó,Nota,Origen\n' + rows.map(e => [e.date, q(e.vendor), q(CAT[e.category]?.name), e.amount.toFixed(2), q(e.payer), q(e.note), e.invoiceId ? 'Factura' : e.demo ? 'Ejemplo' : 'Manual'].join(',')).join('\n');
    download(`gastos_hogar_${todayISO()}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' })); toast('CSV descargado');
  },
  exportJSON() {
    download(`respaldo_gastos_hogar_${todayISO()}.json`, new Blob([JSON.stringify({ version: 1, expenses: S.expenses, budgets: S.budgets, payers: S.payers }, null, 1)], { type: 'application/json' })); toast('Respaldo descargado');
  },

  /* ---------- Respaldo completo (gastos, ajustes y fotos de facturas) y restauración ---------- */
  blobToData(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); }); },
  async dataToBlob(u) { return (await fetch(u)).blob(); },
  markBackup() { try { localStorage.setItem('gh-backup', String(Date.now())); } catch { } App.checkBackup(); },
  async exportFull() {
    toast('Preparando el respaldo…');
    const stores = { expenses: await DB.all('expenses'), settings: await DB.all('settings'), invoices: [] };
    for (const inv of await DB.all('invoices')) { const { blobSynced, blob, ...meta } = inv; stores.invoices.push(blob ? { ...meta, image: await App.blobToData(blob) } : meta); }
    const name = `respaldo_gastos_hogar_${todayISO()}.json`, file = new File([JSON.stringify({ app: 'gastos-hogar', version: 2, date: new Date().toISOString(), stores })], name, { type: 'application/json' });
    try {
      // En el teléfono se abre la hoja de compartir (Archivos, iCloud, WhatsApp, correo...); si no existe, se descarga
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Respaldo de Gastos del Hogar' });
      else download(name, file);
    } catch (e) { if (e && e.name === 'AbortError') return false; download(name, file); }
    App.markBackup(); toast('Respaldo listo'); return true;
  },
  async importFull(file) {
    let j; try { j = JSON.parse(await file.text()); } catch { toast('Ese archivo no es un respaldo válido', 'err'); return; }
    const now = Date.now();
    if (j && j.version === 2 && j.stores) {
      const n = (j.stores.expenses || []).length;
      if (!(await App.confirmBox('Restaurar respaldo', `El respaldo trae ${n} gastos. Se agregarán a los que ya tienes; si alguno ya existe, se reemplaza por el del respaldo.`, 'Restaurar'))) return;
      for (const r of j.stores.expenses || []) { r.updatedAt = now; await DB.putRaw('expenses', r); }
      for (const r of j.stores.settings || []) { r.updatedAt = now; await DB.putRaw('settings', r); }
      for (const { image, ...meta } of j.stores.invoices || []) { meta.updatedAt = now; if (image) { meta.blob = await App.dataToBlob(image); meta.blobSynced = false; } await DB.putRaw('invoices', meta); }
    } else if (j && Array.isArray(j.expenses)) {                       // respaldo antiguo: solo gastos, presupuestos y nombres
      if (!(await App.confirmBox('Restaurar respaldo', `El respaldo trae ${j.expenses.length} gastos. Se agregarán a los que ya tienes.`, 'Restaurar'))) return;
      for (const r of j.expenses) { r.updatedAt = now; await DB.putRaw('expenses', r); }
      if (j.budgets) await DB.setSetting('budgets', j.budgets);
      if (j.payers) await DB.setSetting('payers', j.payers);
    } else { toast('Ese archivo no es un respaldo válido', 'err'); return; }
    DB._changed(); await App.reload(); toast('Respaldo restaurado'); App.route();
  },
  // Versión solo teléfono: avisa si hace más de un mes que no se guarda un respaldo
  checkBackup() {
    const el = document.getElementById('aviso'); if (!el || !window.SOLO_TELEFONO) return;
    const get = k => { try { return +(localStorage.getItem(k) || 0); } catch { return 0; } };
    let first = get('gh-first'); if (!first) { first = Date.now(); try { localStorage.setItem('gh-first', String(first)); } catch { } }
    const real = S.expenses.filter(e => !e.demo).length, ref = Math.max(first, get('gh-backup')), dia = 864e5;
    if (!real || Date.now() - ref < 30 * dia || Date.now() - get('gh-snooze') < 7 * dia) { el.style.display = 'none'; return; }
    el.innerHTML = '<span>Hace más de un mes que no guardas un respaldo de tus gastos.</span><a href="#/ajustes">Guardar ahora</a><button type="button" aria-label="Cerrar" id="aviso-x">×</button>';
    el.style.display = '';
    document.getElementById('aviso-x').onclick = () => { try { localStorage.setItem('gh-snooze', String(Date.now())); } catch { } el.style.display = 'none'; };
  },

  /* ---------- Navegación ---------- */
  route() {
    const name = (location.hash.replace(/^#\/?/, '') || 'panel').split('?')[0];
    const view = Views[name] ? name : 'panel';
    Charts.destroyAll();
    if (view !== 'facturas') { S.urls.forEach(u => URL.revokeObjectURL(u)); S.urls = []; }
    $('#nav').innerHTML = NAV.map(([id, label, ic]) => `<a href="#/${id}" class="${id === view ? 'active' : ''}">${ICON[ic]}<span>${id === 'presupuesto' ? '<b class="lg">Presupuesto</b><b class="sm">Presup.</b>' : label}</span></a>`).join('');
    Views[view]();
    window.scrollTo({ top: 0 });
  },

  async init() {
    const L = m => window.__log && window.__log(m);
    L('init: abriendo base'); await DB.open(); L('init: base lista, cargando datos'); await App.reload(); L('init: datos cargados');
    document.addEventListener('keydown', e => { if (e.key === 'Escape') App.closeModal(); });
    $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') App.closeModal(); });
    window.addEventListener('hashchange', App.route);
    App.route();
    // Modo sin conexión: el navegador solo lo permite en https o en localhost
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) navigator.serviceWorker.register('sw.js').then(r => { if (window.__log) window.__log('sw: registrado'); window.__swReg = r; }).catch(e => { if (window.__log) window.__log('sw: fallo - ' + e.message); });
    window.__appReady = true;
    if (window.SOLO_TELEFONO && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });   // pide al teléfono que no borre los datos de la app
    App.checkBackup();
    Sync.init();            // sincronización con el servidor (si no hay servidor, la app funciona solo en este dispositivo)
  },
};
// Si algo impide arrancar (p. ej. la base de datos del teléfono), se muestra un mensaje en vez de una pantalla vacía
(() => {
  const v = document.getElementById('view'); if (!v) return;
  v.innerHTML = '<div class="card empty" id="boot-msg"><h3>Cargando…</h3><p>Preparando tus gastos.</p></div>';
  setTimeout(() => { if (!window.__appReady) v.innerHTML = '<div class="card empty"><h3>Está tardando más de lo normal</h3><p>Toca para volver a intentarlo.</p><p><button class="btn primary" onclick="location.reload()">Recargar</button></p></div>'; }, 9000);
  window.addEventListener('error', e => { if (!window.__appReady) v.innerHTML = '<div class="card empty"><h3>No se pudo iniciar la app</h3><p>' + String(e.message || e.error).replace(/[<>&]/g, '') + '</p><p><button class="btn primary" onclick="location.reload()">Recargar</button></p></div>'; });
})();
App.init().catch(err => { console.error(err); document.getElementById('view').innerHTML = '<div class="card empty"><h3>No se pudo iniciar la app</h3><p>' + esc(err.message || err) + '</p></div>'; });
