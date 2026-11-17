/* Pagos del mes: control de servicios básicos y tarjetas de crédito (Finanzas) */
const Pay = {
  billName: b => b.name || CAT[b.category]?.name || 'Pago',
  active: () => S.bills.filter(b => b.active !== false),
  isCard: b => b.category.startsWith('tarjeta'),
  paid: (bill, key) => S.expenses.filter(e => e.billId === bill.id && monthKey(e.date) === key),

  // Estado de un pago en un mes: paid | pending | late
  status(bill, key) {
    const p = Pay.paid(bill, key);
    if (p.length) return { k: 'paid', exp: p.slice().sort((a, b) => b.date.localeCompare(a.date))[0], amount: sum(p.map(e => e.amount)) };
    const due = new Date(+key.slice(0, 4), +key.slice(5) - 1, Math.min(bill.day, daysInMonth(key)));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return { k: due < today ? 'late' : 'pending', past: key < monthKey(todayISO()) };
  },
  label(st) { return st.k === 'paid' ? '✓ Pagado' : st.k === 'late' ? (st.past ? 'Sin registrar' : 'Vencido') : 'Pendiente'; },

  summary(key) {
    const rows = Pay.active().map(bill => ({ bill, st: Pay.status(bill, key) }));
    const paid = rows.filter(r => r.st.k === 'paid');
    return { rows, total: rows.length, paidN: paid.length, paidAmt: sum(paid.map(r => r.st.amount)), dueAmt: sum(rows.filter(r => r.st.k !== 'paid').map(r => r.bill.amount)) };
  },

  // Vincula un gasto nuevo con el pago que le corresponde (misma categoría, aún sin pagar ese mes)
  link(exp, batch = []) {
    if (exp.billId) return;
    const key = monthKey(exp.date);
    const cands = Pay.active().filter(b => b.category === exp.category && !Pay.paid(b, key).length && !batch.some(x => x.billId === b.id && monthKey(x.date) === key));
    if (!cands.length) return;
    cands.sort((a, b) => Math.abs(a.amount - exp.amount) - Math.abs(b.amount - exp.amount));
    exp.billId = cands[0].id;
  },

  applyNames() {
    ['tarjeta1', 'tarjeta2', 'tarjeta3'].forEach((id, i) => { CAT[id].name = (S.cardNames && S.cardNames[id]) || `Tarjeta de crédito ${i + 1}`; });
  },

  // Tarjeta resumen para el Panel
  panelCard() {
    const sm = Pay.summary(S.month), pct = sm.total ? sm.paidN / sm.total * 100 : 0;
    const pend = sm.rows.filter(r => r.st.k !== 'paid').sort((a, b) => a.bill.day - b.bill.day).slice(0, 5);
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3>Pagos del mes</h3><a class="btn small ghost" href="#/pagos">Ver pagos</a></div>
      <div class="sub">${sm.paidN} de ${sm.total} realizados · faltan ~${fmtMoney0(sm.dueAmt)}</div>
      <div class="bar" style="height:10px;background:#EFEBDF;border-radius:99px;overflow:hidden;margin-bottom:8px"><b style="display:block;height:100%;width:${pct}%;background:var(--ok);border-radius:99px"></b></div>
      <ul class="top-list">${pend.map(r => `<li><span>${esc(Pay.billName(r.bill))} <small style="color:var(--gris)">· día ${r.bill.day}</small></span><span class="st ${r.st.k}">${Pay.label(r.st)}</span></li>`).join('') || '<li class="empty" style="display:block;padding:12px 0">Todos los pagos del mes están al día</li>'}</ul></div>`;
  },
};

Views.pagos = function () {
  const v = $('#view'), key = S.month, sm = Pay.summary(key), pct = sm.total ? sm.paidN / sm.total * 100 : 0;
  const rowHTML = ({ bill, st }) => `<tr>
      <td style="width:130px"><span class="st ${st.k}">${Pay.label(st)}</span></td>
      <td><b>${esc(Pay.billName(bill))}</b><div class="mini">Vence el día ${bill.day}${st.k === 'paid' ? ' · pagado el ' + fmtDate(st.exp.date) : ''}</div></td>
      <td class="r">${st.k === 'paid' ? fmtMoney(st.amount) : `<span style="color:var(--gris);font-weight:500">~${fmtMoney0(bill.amount)}</span>`}</td>
      <td style="text-align:right;white-space:nowrap">${st.k === 'paid' ? `<button class="btn small ghost" data-undo="${bill.id}">Desmarcar</button>` : `<button class="btn small primary" data-pay="${bill.id}">Marcar pagado</button>`}</td></tr>`;
  const group = (title, sub, rows, note) => `<div class="card mt"><h3>${title}</h3><div class="sub">${sub}</div>
      ${rows.length ? `<table class="pay-table"><tbody>${rows.map(rowHTML).join('')}</tbody></table>` : '<div class="empty">Sin pagos en este grupo. Agrégalos con «Editar lista».</div>'}${note || ''}</div>`;
  const home = sm.rows.filter(r => !Pay.isCard(r.bill)).sort((a, b) => a.bill.day - b.bill.day);
  const cards = sm.rows.filter(r => Pay.isCard(r.bill)).sort((a, b) => a.bill.day - b.bill.day);
  v.innerHTML = `<div class="page-head"><div><h1>Pagos del mes</h1><p>Marca cada pago cuando se haga. Aparece en tus gastos automáticamente.</p></div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${monthPicker()}<button class="btn" id="b-edit">Editar lista</button></div></div>
    <div class="grid g-3">
      <div class="card kpi"><div class="lbl">Pagos realizados</div><div class="val">${sm.paidN} <span style="font-size:20px;color:var(--gris)">de ${sm.total}</span></div>
        <div class="bar" style="height:10px;background:#EFEBDF;border-radius:99px;overflow:hidden"><b style="display:block;height:100%;width:${pct}%;background:var(--ok);border-radius:99px;transition:width .6s"></b></div></div>
      <div class="card kpi k2"><div class="lbl">Ya pagado</div><div class="val" style="color:var(--ok)">${fmtMoney(sm.paidAmt)}</div><div class="note">${monthLabel(key)}</div></div>
      <div class="card kpi k3"><div class="lbl">Falta por pagar (estimado)</div><div class="val">${fmtMoney0(sm.dueAmt)}</div><div class="note">${sm.total - sm.paidN} pago${sm.total - sm.paidN === 1 ? '' : 's'} pendiente${sm.total - sm.paidN === 1 ? '' : 's'}</div></div>
    </div>
    ${group('Servicios básicos y compromisos del hogar', 'Renta, luz, agua, gas, internet, móvil y seguro', home)}
    ${group('Finanzas · Tarjetas de crédito', 'Pago mensual de cada tarjeta', cards, '<p class="mini" style="margin:12px 0 0">Anota aquí solo el <b>pago</b> de la tarjeta. Si ya registraste las compras hechas con ella, no las repitas para no contarlas dos veces.</p>')}`;
  bindMonthPicker(() => Views.pagos());
  $('#b-edit').onclick = () => PayUI.edit();
  $$('[data-pay]').forEach(b => b.onclick = () => PayUI.form(b.dataset.pay));
  $$('[data-undo]').forEach(b => b.onclick = () => PayUI.undo(b.dataset.undo));
};

const PayUI = {
  form(billId) {
    const bill = S.bills.find(b => b.id === billId), key = S.month;
    const isNow = key === monthKey(todayISO());
    const date = isNow ? todayISO() : `${key}-${pad(Math.min(bill.day, daysInMonth(key)))}`;
    const box = App.openModal(`<h2>Registrar pago</h2><p style="color:var(--gris);margin:0 0 14px"><b>${esc(Pay.billName(bill))}</b> · ${monthLabel(key)}</p>
      <form id="pf" class="form-grid" style="grid-template-columns:1fr 1fr">
        <label class="f">Fecha de pago<input type="date" name="date" required value="${date}"></label>
        <label class="f">Monto pagado ($)<input type="number" name="amount" step="0.01" min="0.01" required value="${bill.amount.toFixed(2)}" autofocus></label>
        <label class="f">Pagó<input name="payer" list="pf-payers" value="${esc(S.payers[0] || '')}"><datalist id="pf-payers">${S.payers.map(p => `<option value="${esc(p)}">`).join('')}</datalist></label>
        <label class="f">Nota (opcional)<input name="note"></label>
        <label class="f" style="grid-column:1/-1">Comprobante o factura (opcional)<input type="file" name="photo" accept="image/*"></label>
      </form><div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="pf-save">Guardar pago</button></div>`);
    $('#pf-save', box).onclick = async () => {
      const form = $('#pf', box); if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const rec = { id: uid(), date: fd.get('date'), amount: Math.round(parseFloat(fd.get('amount')) * 100) / 100, category: bill.category, vendor: Pay.billName(bill), payer: fd.get('payer').trim(), note: fd.get('note').trim(), source: 'manual', invoiceId: null, billId: bill.id, createdAt: Date.now() };
      const photo = fd.get('photo');
      if (photo && photo.size) { const inv = { id: uid(), blob: photo, name: rec.vendor, createdAt: Date.now(), text: '' }; await DB.put('invoices', inv); rec.invoiceId = inv.id; rec.source = 'factura'; }
      await DB.put('expenses', rec); await App.reload(); App.closeModal(); toast('Pago registrado: ' + rec.vendor); Views.pagos();
    };
  },

  async undo(billId) {
    const bill = S.bills.find(b => b.id === billId);
    if (!await App.confirmBox('¿Desmarcar este pago?', `«${Pay.billName(bill)}» volverá a Pendiente. El gasto registrado se conserva en tu lista de gastos.`, 'Desmarcar')) return;
    for (const e of Pay.paid(bill, S.month)) await DB.put('expenses', { ...e, billId: null });
    await App.reload(); toast('Pago desmarcado'); Views.pagos();
  },

  edit() {
    const names = S.cardNames || {};
    const row = b => `<tr data-id="${b.id}"><td><input class="inp b-name" value="${esc(b.name || '')}" placeholder="${esc(CAT[b.category]?.name || '')}"></td>
      <td><select class="inp b-cat">${catOptions(b.category)}</select></td>
      <td><input class="inp b-day" type="number" min="1" max="31" value="${b.day}" style="width:70px"></td>
      <td><input class="inp b-amt" type="number" min="0" step="1" value="${b.amount}" style="width:95px"></td>
      <td style="text-align:center"><input type="checkbox" class="b-on" ${b.active !== false ? 'checked' : ''}></td>
      <td><button class="btn small danger b-del" type="button">Quitar</button></td></tr>`;
    const box = App.openModal(`<h2>Editar lista de pagos</h2>
      <h3 style="font-size:15px;margin:0 0 8px">Nombres de las tarjetas de crédito</h3>
      <div class="form-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">${['tarjeta1', 'tarjeta2', 'tarjeta3'].map((id, i) => `<label class="f">Tarjeta ${i + 1}<input class="inp card-name" data-id="${id}" value="${esc(names[id] || '')}" placeholder="Ej: Visa Banco"></label>`).join('')}</div>
      <h3 style="font-size:15px;margin:0 0 8px">Pagos que se controlan cada mes</h3>
      <div style="overflow-x:auto"><table><thead><tr><th>Nombre (opcional)</th><th>Categoría</th><th>Vence día</th><th>Monto aprox.</th><th>Activo</th><th></th></tr></thead><tbody id="bills-body">${S.bills.map(row).join('')}</tbody></table></div>
      <div style="margin-top:12px"><button class="btn small" id="b-addbill" type="button">${ICON.plus} Agregar pago</button></div>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="bills-save">Guardar</button></div>`, true);
    const body = $('#bills-body', box);
    const bind = () => $$('.b-del', body).forEach(b => b.onclick = () => b.closest('tr').remove());
    bind();
    $('#b-addbill', box).onclick = () => { body.insertAdjacentHTML('beforeend', row({ id: 'b-' + uid(), name: '', category: 'otros', day: 1, amount: 0 })); bind(); };
    $('#bills-save', box).onclick = async () => {
      S.bills = $$('tr', body).map(tr => ({ id: tr.dataset.id, name: $('.b-name', tr).value.trim() || null, category: $('.b-cat', tr).value, day: Math.min(31, Math.max(1, +$('.b-day', tr).value || 1)), amount: Math.max(0, +$('.b-amt', tr).value || 0), active: $('.b-on', tr).checked }));
      S.cardNames = Object.fromEntries($$('.card-name', box).map(i => [i.dataset.id, i.value.trim()]).filter(x => x[1]));
      await DB.setSetting('bills', S.bills); await DB.setSetting('cardNames', S.cardNames);
      Pay.applyNames(); App.closeModal(); toast('Lista de pagos guardada'); App.route();
    };
  },
};
