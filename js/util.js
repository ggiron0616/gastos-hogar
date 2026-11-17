/* Utilidades generales: categorías, formato de dinero y fechas */
const CATEGORIES = [
  { id: 'renta',           name: 'Renta / Hipoteca',        color: '#0B7B7C', budget: 1450 },
  { id: 'electricidad',    name: 'Electricidad',            color: '#FFC21A', budget: 160 },
  { id: 'agua',            name: 'Agua y basura',           color: '#2F7BFF', budget: 70 },
  { id: 'gas',             name: 'Gas',                     color: '#FF5A4D', budget: 45 },
  { id: 'internet',        name: 'Internet y teléfono',     color: '#7B5CFF', budget: 140 },
  { id: 'alimentacion',    name: 'Alimentación',            color: '#12C48B', budget: 650 },
  { id: 'transporte',      name: 'Transporte y gasolina',   color: '#9BD12E', budget: 300 },
  { id: 'salud',           name: 'Salud y farmacia',        color: '#FF4F9A', budget: 120 },
  { id: 'ropa',            name: 'Ropa y calzado',          color: '#FF9F43', budget: 100 },
  { id: 'entretenimiento', name: 'Entretenimiento',         color: '#FF7A1A', budget: 120 },
  { id: 'mascotas',        name: 'Mascotas',                color: '#B8793A', budget: 60 },
  { id: 'hogar',           name: 'Hogar y mantenimiento',   color: '#19B8D4', budget: 130 },
  { id: 'seguros',         name: 'Seguros',                 color: '#2A3FB8', budget: 180 },
  { id: 'otros',           name: 'Otros',                   color: '#9AA8B5', budget: 100 },
  // Finanzas: pago de tarjetas de crédito (los nombres se pueden cambiar en Pagos > Editar)
  { id: 'tarjeta1',        name: 'Tarjeta de crédito 1',    color: '#8A3FE0', budget: 300, group: 'Finanzas' },
  { id: 'tarjeta2',        name: 'Tarjeta de crédito 2',    color: '#D93FC0', budget: 150, group: 'Finanzas' },
  { id: 'tarjeta3',        name: 'Tarjeta de crédito 3',    color: '#F28BDA', budget: 100, group: 'Finanzas' },
];
CATEGORIES.forEach(c => { c.group = c.group || 'Hogar y consumo'; });
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const fmtMoney = (n, dec = 2) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtMoney0 = n => fmtMoney(n, 0);
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoDate(new Date());
const monthKey = iso => iso.slice(0, 7);                       // 'YYYY-MM'
const monthLabel = key => { const [y, m] = key.split('-'); return `${MESES[+m - 1]} ${y}`; };
const monthShort = key => { const [y, m] = key.split('-'); return `${MESES_CORTO[+m - 1]} ${y.slice(2)}`; };
const addMonths = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const daysInMonth = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const fmtDate = iso => { const [y, m, d] = iso.split('-'); return `${+d} ${MESES_CORTO[+m - 1]} ${y}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = arr => arr.reduce((a, b) => a + b, 0);
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
}

function download(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}


// <option> agrupados: "Hogar y consumo" y "Finanzas (tarjetas de crédito)"
function catOptions(selected, placeholder) {
  const grp = g => CATEGORIES.filter(c => c.group === g).map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  return (placeholder ? `<option value="">${esc(placeholder)}</option>` : '') +
    `<optgroup label="Hogar y consumo">${grp('Hogar y consumo')}</optgroup><optgroup label="Finanzas (tarjetas de crédito)">${grp('Finanzas')}</optgroup>`;
}

// Pagos recurrentes que se controlan cada mes (name: null = usa el nombre de la categoría)
const DEFAULT_BILLS = [
  { id: 'b-renta',        name: null,                  category: 'renta',        day: 1,  amount: 1450 },
  { id: 'b-internet',     name: 'Internet',            category: 'internet',     day: 5,  amount: 90 },
  { id: 'b-movil',        name: 'Plan móvil familiar', category: 'internet',     day: 8,  amount: 78 },
  { id: 'b-seguros',      name: 'Seguro del auto',     category: 'seguros',      day: 10, amount: 168 },
  { id: 'b-electricidad', name: null,                  category: 'electricidad', day: 12, amount: 140 },
  { id: 'b-agua',         name: null,                  category: 'agua',         day: 15, amount: 65 },
  { id: 'b-gas',          name: null,                  category: 'gas',          day: 18, amount: 40 },
  { id: 'b-tarjeta1',     name: null,                  category: 'tarjeta1',     day: 5,  amount: 300 },
  { id: 'b-tarjeta2',     name: null,                  category: 'tarjeta2',     day: 15, amount: 150 },
  { id: 'b-tarjeta3',     name: null,                  category: 'tarjeta3',     day: 25, amount: 100 },
];
