/* Datos ficticios para probar la app + dibujo de facturas de ejemplo */
const Seed = (() => {
  // Generador pseudo-aleatorio con semilla fija: los datos de ejemplo son siempre los mismos
  const rng = (seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(20261116);
  const rnd = (a, b) => a + rng() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const money = n => Math.round(n * 100) / 100;

  const ITEMS = {
    alimentacion: ['Leche entera 1 gal', 'Pan integral', 'Huevos docena', 'Pollo entero', 'Arroz 5 lb', 'Frijoles 2 lb', 'Frutas surtidas', 'Verduras frescas', 'Queso fresco', 'Jugo de naranja', 'Cereal', 'Carne molida 2 lb'],
    electricidad: ['Consumo kWh', 'Cargo de entrega', 'Cargo fijo mensual'],
    agua: ['Consumo de agua', 'Alcantarillado', 'Recolección de basura'],
    gas: ['Consumo gas natural', 'Cargo fijo'],
    internet: ['Plan Fibra 500 Mbps', 'Alquiler de equipo'],
    transporte: ['Gasolina regular 11.4 gal'],
    salud: ['Medicamento receta', 'Vitaminas', 'Analgésico', 'Jarabe'],
    ropa: ['Camisa', 'Pantalón', 'Zapatos', 'Chaqueta'],
    mascotas: ['Alimento para perro 15 lb', 'Consulta veterinaria', 'Vacuna'],
    hogar: ['Tornillos y anclajes', 'Pintura 1 gal', 'Foco LED x4', 'Cinta aislante', 'Llave de paso'],
    entretenimiento: ['Entradas cine x2', 'Palomitas y bebidas'],
    seguros: ['Prima mensual seguro auto'],
    renta: ['Renta mensual'],
    otros: ['Artículo varios'],
  };
  const VENDORS = {
    alimentacion: ['Supermercado La Esquina', 'Mercado Don Pepe', 'Panadería El Trigal', 'Carnicería La Res'],
    electricidad: ['Lone Star Electric Co.'],
    agua: ['Aguas del Valle - Servicio de Agua'],
    gas: ['Gas Natural del Sur'],
    internet: ['FibraNet Internet'],
    transporte: ['Gasolinera Ruta 59'],
    salud: ['Farmacia San Rafael'],
    ropa: ['Boutique Moda Familiar', 'Zapatería El Paso'],
    mascotas: ['Veterinaria Patitas'],
    hogar: ['Ferretería El Tornillo'],
    entretenimiento: ['Cine Plaza Mayor', 'Streaming Plus'],
    seguros: ['Seguros Frontera Auto'],
    renta: ['Residencial Los Pinos'],
    otros: ['Tienda varios'],
  };
  const ADDR = ['1200 Main St, Houston TX', '455 Oak Ave, Houston TX', '88 Ruta 59, Sugar Land TX', '720 Elm St, Katy TX'];

  /* ---- Dibujo de una factura en canvas (para copias de ejemplo y hoja de prueba) ---- */
  function fmtRecDate(iso, style) {
    const [y, m, d] = iso.split('-');
    if (style === 1) return `${+d} ${MESES_CORTO[+m - 1]} ${y}`;
    if (style === 2) return `${y}-${m}-${d}`;
    return `${m}/${d}/${y}`;
  }
  function receiptLines(rec) {
    const L = [];
    L.push({ t: rec.vendor.toUpperCase(), a: 'c', b: true });
    L.push({ t: rec.address, a: 'c' });
    L.push({ t: '' });
    L.push({ t: (rec.dateLabel || 'Fecha') + ': ' + fmtRecDate(rec.date, rec.dateStyle || 0), a: 'l' });
    L.push({ t: 'Factura No: ' + rec.number, a: 'l' });
    L.push({ rule: true });
    rec.items.forEach(([d, p]) => L.push({ l: d, r: p.toFixed(2) }));
    L.push({ rule: true });
    L.push({ l: 'Subtotal', r: rec.subtotal.toFixed(2) });
    L.push({ l: 'Impuesto 8.25%', r: rec.tax.toFixed(2) });
    L.push({ l: 'TOTAL A PAGAR', r: '$' + rec.total.toFixed(2), b: true });
    L.push({ t: '' });
    L.push({ t: 'Gracias por su preferencia', a: 'c' });
    return L;
  }
  // Dibuja la factura y devuelve su alto
  function drawReceipt(ctx, x, y, w, rec, fs = 22) {
    const lh = Math.round(fs * 1.5), pad = Math.round(fs * 1.1);
    const lines = receiptLines(rec);
    const h = lines.length * lh + pad * 2;
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#444'; ctx.lineWidth = Math.max(1, fs / 14); ctx.setLineDash([fs / 3, fs / 4]); ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); ctx.setLineDash([]);
    ctx.fillStyle = '#111'; ctx.textBaseline = 'middle';
    let cy = y + pad + lh / 2;
    for (const ln of lines) {
      ctx.font = `${ln.b ? 'bold ' : ''}${fs}px "Courier New", monospace`;
      if (ln.rule) { ctx.fillText('-'.repeat(Math.floor((w - pad * 2) / (fs * 0.6))), x + pad, cy); }
      else if (ln.l !== undefined) { ctx.textAlign = 'left'; ctx.fillText(ln.l, x + pad, cy); ctx.textAlign = 'right'; ctx.fillText(ln.r, x + w - pad, cy); }
      else if (ln.a === 'c') { ctx.textAlign = 'center'; ctx.fillText(ln.t, x + w / 2, cy); }
      else { ctx.textAlign = 'left'; ctx.fillText(ln.t, x + pad, cy); }
      cy += lh;
    }
    ctx.restore();
    return h;
  }
  function receiptFor(exp, n = 0) {
    const cat = exp.category;
    const nItems = cat === 'alimentacion' ? rint(3, 6) : (ITEMS[cat] || ITEMS.otros).length > 1 ? Math.min((ITEMS[cat] || ITEMS.otros).length, rint(2, 3)) : 1;
    const subtotal = money(exp.amount / 1.0825);
    const tax = money(exp.amount - subtotal);
    const pool = [...(ITEMS[cat] || ITEMS.otros)].sort(() => rng() - .5).slice(0, nItems);
    let left = subtotal; const items = pool.map((d, i) => { const p = i === pool.length - 1 ? money(left) : money(subtotal / nItems * rnd(.6, 1.2)); left -= p; return [d, p]; });
    // Ajuste para que los renglones sumen exactamente el subtotal
    const diff = money(subtotal - sum(items.map(i => i[1]))); items[items.length - 1][1] = money(items[items.length - 1][1] + diff);
    return { vendor: exp.vendor, address: pick(ADDR), date: exp.date, dateStyle: n % 3, number: String(10000 + rint(1, 89999)), items, subtotal, tax, total: exp.amount };
  }
  function renderReceiptBlob(rec) {
    const c = document.createElement('canvas'); c.width = 520;
    const probe = c.getContext('2d');
    c.height = 1400; const h = drawReceipt(probe, 0, 0, 520, rec, 24);
    const out = document.createElement('canvas'); out.width = 520; out.height = h;
    drawReceipt(out.getContext('2d'), 0, 0, 520, rec, 24);
    return new Promise(res => out.toBlob(res, 'image/jpeg', 0.85));
  }

  /* ---- Generación del historial ficticio ---- */
  function generate(todayIso = todayISO()) {
    const today = new Date(todayIso + 'T12:00:00');
    const curKey = monthKey(todayIso);
    const out = [];
    const add = (key, day, category, vendor, amount, payer, note = '', billId = null) => {
      const d = Math.min(day, daysInMonth(key));
      const date = `${key}-${pad(d)}`;
      if (date > todayIso) return;
      out.push({ id: uid(), date, amount: money(amount), category, vendor, payer, note, source: 'demo', demo: true, invoiceId: null, billId, createdAt: Date.now() });
    };
    for (let i = 5; i >= 0; i--) {
      const key = addMonths(curKey, -i);
      const mo = +key.slice(5);
      const summer = [6, 7, 8, 9].includes(mo);
      const grow = 1 + (5 - i) * 0.012;
      add(key, 1, 'renta', 'Residencial Los Pinos', 1450, 'Titular', 'Renta mensual', 'b-renta');
      add(key, 5, 'internet', 'FibraNet Internet', 89.99, 'Titular', '', 'b-internet');
      add(key, 8, 'internet', 'Plan móvil familiar', 78, 'Pareja', '', 'b-movil');
      add(key, 10, 'seguros', 'Seguros Frontera Auto', 168.4, 'Titular', 'Prima mensual', 'b-seguros');
      add(key, 12, 'electricidad', 'Lone Star Electric Co.', (summer ? rnd(165, 215) : rnd(95, 140)) * grow, 'Titular', '', 'b-electricidad');
      add(key, 15, 'agua', 'Aguas del Valle - Servicio de Agua', rnd(52, 76), 'Titular', '', 'b-agua');
      add(key, 18, 'gas', 'Gas Natural del Sur', summer ? rnd(18, 28) : rnd(38, 62), 'Titular', '', 'b-gas');
      add(key, 20, 'entretenimiento', 'Streaming Plus', 22.99, 'Pareja', 'Suscripción');
      // Finanzas: pago de tarjetas de crédito
      add(key, 5, 'tarjeta1', 'Tarjeta de crédito 1', rnd(180, 420), 'Titular', 'Pago de tarjeta', 'b-tarjeta1');
      add(key, 15, 'tarjeta2', 'Tarjeta de crédito 2', rnd(95, 220), 'Pareja', 'Pago de tarjeta', 'b-tarjeta2');
      add(key, 25, 'tarjeta3', 'Tarjeta de crédito 3', rnd(60, 150), 'Titular', 'Pago de tarjeta', 'b-tarjeta3');
      // Alimentación: varias compras por mes
      const trips = rint(9, 12);
      for (let k = 0; k < trips; k++) add(key, rint(1, 28), 'alimentacion', pick(VENDORS.alimentacion), rnd(22, 135) * grow, rng() > .45 ? 'Pareja' : 'Titular');
      for (let k = 0; k < rint(4, 5); k++) add(key, rint(1, 28), 'transporte', 'Gasolinera Ruta 59', rnd(34, 58), rng() > .5 ? 'Titular' : 'Pareja', 'Gasolina');
      for (let k = 0; k < rint(1, 2); k++) add(key, rint(1, 28), 'salud', 'Farmacia San Rafael', rnd(14, 92), 'Pareja');
      if (rng() > .45) add(key, rint(1, 28), 'ropa', pick(VENDORS.ropa), rnd(30, 125), 'Pareja');
      for (let k = 0; k < rint(1, 2); k++) add(key, rint(1, 28), 'entretenimiento', 'Cine Plaza Mayor', rnd(18, 46), 'Titular');
      add(key, rint(4, 25), 'mascotas', 'Veterinaria Patitas', rnd(24, 68), 'Pareja');
      for (let k = 0; k < rint(1, 2); k++) add(key, rint(1, 28), 'hogar', 'Ferretería El Tornillo', rnd(18, 112), 'Titular');
      if (rng() > .6) add(key, rint(1, 28), 'otros', 'Tienda varios', rnd(10, 45), 'Titular');
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Carga el ejemplo: gastos + copias de facturas dibujadas para los más recientes
  async function load() {
    const exps = generate();
    const withCopy = exps.filter(e => ['electricidad', 'agua', 'alimentacion', 'gas', 'salud', 'internet', 'transporte', 'mascotas'].includes(e.category)).slice(-10);
    const invoices = [];
    let n = 0;
    for (const e of withCopy) {
      const blob = await renderReceiptBlob(receiptFor(e, n++));
      const inv = { id: uid(), blob, name: `${e.vendor} ${e.date}`, createdAt: Date.now(), demo: true, text: '' };
      invoices.push(inv); e.invoiceId = inv.id; e.source = 'factura';
    }
    await DB.putMany('expenses', exps);
    await DB.putMany('invoices', invoices);
    return { expenses: exps.length, invoices: invoices.length };
  }

  async function clearDemo() {
    const exps = (await DB.all('expenses')).filter(e => e.demo);
    const invs = (await DB.all('invoices')).filter(i => i.demo);
    for (const e of exps) await DB.del('expenses', e.id);
    for (const i of invs) await DB.del('invoices', i.id);
    return exps.length;
  }

  return { load, clearDemo, drawReceipt, receiptFor, generate };
})();
