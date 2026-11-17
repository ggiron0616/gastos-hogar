/* Lectura de facturas desde fotos: detecta el papel, endereza la foto, separa cada factura, la lee (OCR) y extrae comercio, fecha y total. */
const Extract = (() => {
  let worker = null;

  async function getWorker(onProgress) {
    if (worker) return worker;
    const abs = p => new URL(p, location.href).href.replace(/\/$/, '');
    worker = await Tesseract.createWorker('spa+eng', 1, {
      workerPath: abs('vendor/worker.min.js'),
      corePath: abs('vendor/core'),
      langPath: abs('vendor/lang'),
      gzip: true,
      cacheMethod: 'none',
      logger: m => onProgress && onProgress(m),
    });
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    return worker;
  }

  /* ---------- Carga de imagen ---------- */
  async function loadCanvas(file, maxEdge = 3300) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  }
  function rotate(canvas, deg) {                         // 90 = horario, 270 = antihorario
    const o = document.createElement('canvas'); const swap = deg % 180 !== 0;
    o.width = swap ? canvas.height : canvas.width; o.height = swap ? canvas.width : canvas.height;
    const c = o.getContext('2d'); c.translate(o.width / 2, o.height / 2); c.rotate(deg * Math.PI / 180); c.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return o;
  }
  function shrink(canvas, maxSide) {
    const k = Math.min(1, maxSide / Math.max(canvas.width, canvas.height)); if (k === 1) return canvas;
    const o = document.createElement('canvas'); o.width = Math.round(canvas.width * k); o.height = Math.round(canvas.height * k);
    o.getContext('2d').drawImage(canvas, 0, 0, o.width, o.height); return o;
  }

  /* ---------- Análisis de imagen: papel, texto y orientación ---------- */
  function otsu(gray) {
    const hist = new Array(256).fill(0); for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
    const total = gray.length; let sumAll = 0; for (let i = 0; i < 256; i++) sumAll += i * hist[i];
    let wB = 0, sumB = 0, best = 0, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break;
      sumB += t * hist[t]; const mB = sumB / wB, mF = (sumAll - sumB) / wF;
      const v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; thr = t; }
    }
    return thr;
  }
  // Media local (ventana cuadrada de radio r) con imagen integral; funciona igual en todos los navegadores
  function localMean(src, w, h, r) {
    const W1 = w + 1, I = new Float64Array(W1 * (h + 1));
    for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += src[y * w + x]; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + row; } }
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
        out[y * w + x] = (I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0]) / ((x1 - x0) * (y1 - y0));
      }
    }
    return out;
  }
  function analyze(canvas, maxSide = 1100) {
    const k = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
    const w = Math.max(1, Math.round(canvas.width * k)), h = Math.max(1, Math.round(canvas.height * k));
    const sm = document.createElement('canvas'); sm.width = w; sm.height = h;
    const sctx = sm.getContext('2d', { willReadFrequently: true }); sctx.drawImage(canvas, 0, 0, w, h);
    const d = sctx.getImageData(0, 0, w, h).data, gray = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) gray[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) | 0;
    // Papel = zonas claras (la mesa oscura queda fuera); texto = puntos más oscuros que su entorno, solo dentro del papel
    const thr = Math.min(Math.max(otsu(gray), 90), 200);
    const bright = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) bright[i] = gray[i] > thr ? 1 : 0;
    const frac = localMean(bright, w, h, 9), mean = localMean(gray, w, h, 14);
    const paperBin = new Float32Array(w * h); let paperPx = 0;
    for (let i = 0; i < w * h; i++) { if (frac[i] >= 0.55) { paperBin[i] = 1; paperPx++; } }
    const core = localMean(paperBin, w, h, Math.max(3, Math.round(Math.max(w, h) / 220)));   // papel "bien adentro": sin los bordes rotos ni las sombras
    const text = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) text[i] = core[i] >= 0.97 && gray[i] < mean[i] - 16 ? 1 : 0;
    return { w, h, k, gray, text, paperFrac: paperPx / (w * h) };
  }
  // ¿Las líneas de texto van en horizontal (foto derecha) o en vertical (foto de lado)?
  function textIsSideways(an) {
    const { w, h, text } = an, r = new Float32Array(h), c = new Float32Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (text[y * w + x]) { r[y]++; c[x]++; }
    const tv = a => { let s = 0, t = 0; for (let i = 1; i < a.length; i++) s += Math.abs(a[i] - a[i - 1]); for (let i = 0; i < a.length; i++) t += a[i]; return t ? s / t : 0; };
    const tvR = tv(r), tvC = tv(c);
    return { sideways: tvC > tvR * 1.08, tvR, tvC };
  }
  const wordScore = text => ((text || '').match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/g) || []).filter(t => /[aeiouáéíóú]/i.test(t) && !/(.)\1{2,}/.test(t)).length;

  // Orientación: se lee la foto tal cual; si sale poco texto legible, se prueban los giros y gana el que lea más palabras reales
  async function fixOrientation(canvas, wk, onStatus) {
    const score = async c => wordScore((await wk.recognize(shrink(c, 1500))).data.text);
    onStatus('Revisando la orientación de la foto…', 0.05);
    const s0 = await score(canvas);
    if (s0 >= 40) return { canvas, rotation: 0 };
    let best = canvas, bestScore = s0, bestDeg = 0;
    for (const deg of [90, 270, 180]) {
      onStatus('Probando la foto girada…', 0.06);
      const c = rotate(canvas, deg), sc = await score(c);
      if (sc > bestScore * 1.15 + 2) { bestScore = sc; best = c; bestDeg = deg; }
    }
    return { canvas: best, rotation: bestDeg };
  }
  /* ---------- Segmentación: separa las facturas (corte XY por espacios en blanco) ---------- */
  function segment(canvas, an) {
    an = an || analyze(canvas, 1000);
    const { w, h, k, text: dark } = an;
    const rowProfile = (x0, y0, x1, y1) => { const r = new Array(y1 - y0).fill(0); for (let y = y0; y < y1; y++) { let c = 0; for (let x = x0; x < x1; x++) c += dark[y * w + x]; r[y - y0] = c; } return r; };
    const colProfile = (x0, y0, x1, y1) => { const r = new Array(x1 - x0).fill(0); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) r[x - x0] += dark[y * w + x]; return r; };
    const runs = (prof, tol, minGap) => {
      const cuts = []; let s = -1;
      for (let i = 0; i <= prof.length; i++) {
        const empty = i < prof.length ? prof[i] <= tol : false;
        if (empty && s < 0) s = i;
        if (!empty && s >= 0) { if (s > 0 && i - s >= minGap) cuts.push([s, i]); s = -1; }
      }
      return cuts;
    };
    const trim = (prof, tol) => { let a = 0, b = prof.length; while (a < b && prof[a] <= tol) a++; while (b > a && prof[b - 1] <= tol) b--; return [a, b]; };

    const gapY = Math.max(5, Math.round(h * 0.017)), minPartY = Math.round(h * 0.07);
    const gapX = Math.max(7, Math.round(w * 0.012)), minPartX = Math.round(w * 0.12);
    const mergeSmall = (cuts, len, minPart) => {
      const cs = cuts.slice();
      while (cs.length) {
        const bounds = [0, ...cs.flat(), len], sizes = [];
        for (let i = 0; i <= cs.length; i++) sizes.push(bounds[i * 2 + 1] - bounds[i * 2]);
        let mi = -1, mv = Infinity; sizes.forEach((p, i) => { if (p < minPart && p < mv) { mv = p; mi = i; } });
        if (mi < 0) break;
        const L = mi > 0 ? cs[mi - 1] : null, R = mi < cs.length ? cs[mi] : null;
        const rem = L && R ? ((L[1] - L[0]) <= (R[1] - R[0]) ? mi - 1 : mi) : (L ? mi - 1 : mi);
        cs.splice(rem, 1);
      }
      return cs;
    };

    // Tolerancia al ruido: proporcional a lo "lleno" que está el perfil (una foto real con bordes y sombras necesita más que una hoja limpia)
    const adaptiveTol = (prof, base) => { const nz = prof.filter(v => v > 0).sort((a, b) => a - b); return Math.max(1, Math.round(Math.max(base, nz.length ? nz[Math.floor(nz.length / 2)] * 0.2 : 0))); };
    const smooth = (a, r) => a.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - r); j <= Math.min(a.length - 1, i + r); j++) { s += a[j]; n++; } return s / n; });
    const leaves = [];
    const cut = (x0, y0, x1, y1, depth) => {
      if (x1 - x0 < 6 || y1 - y0 < 6) return;
      const rp = rowProfile(x0, y0, x1, y1); const tolY = adaptiveTol(rp, (x1 - x0) * 0.004);
      const [ya, yb] = trim(rp, tolY); if (yb <= ya) return; y0 += ya; y1 = y0 + (yb - ya);
      const cp = colProfile(x0, y0, x1, y1); const tolX = adaptiveTol(cp, (y1 - y0) * 0.004);
      const [xa, xb] = trim(cp, tolX); if (xb <= xa) return; x0 += xa; x1 = x0 + (xb - xa);
      if (depth > 8) { leaves.push([x0, y0, x1, y1]); return; }
      const split = (cuts, lo, hi, make) => { let p = lo; const parts = []; for (const [s, e] of cuts) { parts.push(make(p, lo + s)); p = lo + e; } parts.push(make(p, hi)); return parts; };
      const rp2 = rowProfile(x0, y0, x1, y1);
      // Si el marco de la factura sigue pasando por el espacio, no es un corte entre facturas
      const frameCont = ([s, e]) => { let n = 0; for (let y = y0 + s; y < y0 + e; y++) { let l = 0, r = 0; for (let dx = 0; dx < 3; dx++) { l |= dark[y * w + x0 + dx]; r |= dark[y * w + x1 - 1 - dx]; } if (l && r) n++; } return n / (e - s) > 0.6; };
      const rps = smooth(rp2, 2), cy = (y1 - y0) > 2.0 * (x1 - x0) ? [] : mergeSmall(runs(rps, adaptiveTol(rps, tolY), gapY).filter(c => !frameCont(c)), y1 - y0, minPartY);
      if (cy.length) { split(cy, y0, y1, (a, b) => [x0, a, x1, b]).forEach(r => cut(...r, depth + 1)); return; }
      const cp2 = colProfile(x0, y0, x1, y1); const cps = smooth(cp2, 2), cx = mergeSmall(runs(cps, adaptiveTol(cps, tolX), gapX), x1 - x0, minPartX);
      if (cx.length) { split(cx, x0, x1, (a, b) => [a, y0, b, y1]).forEach(r => cut(...r, depth + 1)); return; }
      leaves.push([x0, y0, x1, y1]);
    };
    cut(0, 0, w, h, 0);

    const boxes = leaves.filter(([x0, y0, x1, y1]) => (x1 - x0) > w * 0.10 && (y1 - y0) > h * 0.05);
    // Muchos fragmentos pequeños = un documento de una sola pieza (factura de servicios, estado de cuenta): se lee completo
    if (boxes.length >= 4) {
      const hs = boxes.map(b => b[3] - b[1]).sort((a, b) => a - b);
      if (hs[Math.floor(hs.length / 2)] < h * 0.14) { const u = [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])), Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))]; boxes.length = 0; boxes.push(u); }
    }
    boxes.sort((a, b) => (Math.abs(a[1] - b[1]) < h * 0.04 ? a[0] - b[0] : a[1] - b[1]));
    return boxes.map(([x0, y0, x1, y1]) => ({ x: x0 / k, y: y0 / k, w: (x1 - x0) / k, h: (y1 - y0) / k }));
  }

  function gridBoxes(canvas, cols, rows) {
    const out = []; const cw = canvas.width / cols, ch = canvas.height / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: c * cw, y: r * ch, w: cw, h: ch });
    return out;
  }

  function cropCanvas(canvas, b, padPct = 0.012) {
    const p = Math.round(canvas.width * padPct);
    const x = Math.max(0, Math.floor(b.x - p)), y = Math.max(0, Math.floor(b.y - p));
    const w = Math.min(canvas.width - x, Math.ceil(b.w + p * 2)), h = Math.min(canvas.height - y, Math.ceil(b.h + p * 2));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    return c;
  }

  // Tamaño cómodo para el OCR + normalización de la luz (recibos arrugados, sombras, papel térmico gris)
  function prepForOcr(c) {
    const target = 1300;
    const k = c.width < target ? Math.min(2.5, target / c.width) : (c.width > 1800 ? 1800 / c.width : 1);
    const o = document.createElement('canvas'); o.width = Math.round(c.width * k); o.height = Math.round(c.height * k);
    const ctx = o.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c, 0, 0, o.width, o.height);
    const img = ctx.getImageData(0, 0, o.width, o.height), d = img.data, n = o.width * o.height, gray = new Float32Array(n);
    for (let i = 0; i < n; i++) gray[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
    const mean = localMean(gray, o.width, o.height, Math.max(12, Math.round(o.width / 45)));
    for (let i = 0; i < n; i++) { const v = Math.max(0, Math.min(255, (gray[i] - mean[i]) * 2.6 + 238)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return o;
  }

  /* ---------- Interpretación del texto ---------- */
  // Comercios conocidos: [expresión, nombre, categoría]
  const BRANDS = [
    [/wal-?mart/, 'Walmart', 'alimentacion'], [/\bh[\s.\-]?e[\s.\-]?b\b/, 'H-E-B', 'alimentacion'], [/sam'?s\s*club|\bsams\s*club/, "Sam's Club", 'alimentacion'],
    [/costco/, 'Costco', 'alimentacion'], [/\btarget\b/, 'Target', 'hogar'], [/kroger/, 'Kroger', 'alimentacion'], [/\baldi\b/, 'Aldi', 'alimentacion'],
    [/whole\s*foods/, 'Whole Foods', 'alimentacion'], [/trader\s*joe/, "Trader Joe's", 'alimentacion'], [/dollar\s*general/, 'Dollar General', 'hogar'], [/family\s*dollar/, 'Family Dollar', 'hogar'],
    [/tiger\s*mart/, 'Tiger Mart', 'transporte'], [/7[\s\-]?eleven/, '7-Eleven', 'alimentacion'], [/quik\s*trip/, 'QuikTrip', 'transporte'], [/race\s*trac/, 'RaceTrac', 'transporte'],
    [/buc-?ee/, "Buc-ee's", 'transporte'], [/\bshell\b/, 'Shell', 'transporte'], [/exxon|mobil\b/, 'Exxon Mobil', 'transporte'], [/chevron/, 'Chevron', 'transporte'], [/valero/, 'Valero', 'transporte'],
    [/\bcvs\b/, 'CVS', 'salud'], [/walgreens/, 'Walgreens', 'salud'], [/home\s*depot/, 'Home Depot', 'hogar'], [/lowe'?s/, "Lowe's", 'hogar'], [/amazon/, 'Amazon', 'otros'],
    [/mcdonald/, "McDonald's", 'alimentacion'], [/whataburger/, 'Whataburger', 'alimentacion'], [/starbucks/, 'Starbucks', 'alimentacion'], [/\boncor\b/, 'Oncor', 'electricidad'],
    [/centerpoint/, 'CenterPoint Energy', 'electricidad'], [/atmos\s*energy/, 'Atmos Energy', 'gas'], [/at&t|\batt\b/, 'AT&T', 'internet'], [/t-?mobile/, 'T-Mobile', 'internet'],
    [/verizon/, 'Verizon', 'internet'], [/comcast|xfinity/, 'Xfinity', 'internet'], [/spectrum/, 'Spectrum', 'internet'],
  ];
  const KW = {
    tarjeta1:        ['tarjeta de cr', 'credit card', 'visa cardholder statement', 'estado de cuenta', 'minimum payment', 'pago minimo', 'pago mínimo'],
    renta:           ['rent', 'renta', 'alquiler', 'lease', 'apartment', 'apartamento', 'mortgage', 'hipoteca', 'residencial', 'arrendamiento', 'hoa'],
    seguros:         ['insurance', 'seguro', 'policy', 'póliza', 'poliza', 'prima '],
    electricidad:    ['electric', 'electricidad', 'energy', 'energía', 'kwh', 'luz '],
    agua:            ['water', 'agua', 'sewer', 'alcantarill', 'basura', 'trash', 'solid waste', 'utility', 'billing statement'],
    gas:             ['gas natural', 'natural gas', 'propane', 'propano'],
    internet:        ['internet', 'wifi', 'fibra', 'fiber', 'wireless', 'móvil', 'movil', 'telef', 'phone service', 'cable', 'mbps'],
    salud:           ['pharm', 'farmac', 'clinic', 'clínica', 'doctor', 'dental', 'medic', 'hospital', 'receta', 'consulta', 'urgent care'],
    mascotas:        ['veterin', ' pet ', 'mascota', 'patitas', 'perro', 'gato'],
    ropa:            ['clothing', 'ropa', 'shoe', 'calzado', 'apparel', 'boutique', 'zapat', 'camisa', 'pantal', 'jeans', 'dress'],
    entretenimiento: ['cine', 'cinema', 'movie', 'netflix', 'spotify', 'streaming', 'juego', 'teatro', 'concert', 'palomitas'],
    hogar:           ['ferreter', 'hardware', 'repair', 'reparac', 'plumb', 'mueble', 'limpieza', 'tornillo', 'pintura'],
    transporte:      ['gasolin', 'fuel', 'pump', 'price/gal', 'parking', 'estacionam', 'toll', 'uber', 'taxi', 'oil change', 'llanta', 'regular'],
    alimentacion:    ['super', 'market', 'mercado', 'grocer', 'abarrot', 'tienda', 'carnic', 'panader', 'restaur', 'pizza', 'cafe', 'café', 'leche', 'pollo', 'frutas', 'items sold'],
  };
  function guessCategory(vendor, text) {
    const v = (vendor || '').toLowerCase(), t = (text || '').toLowerCase();
    let best = 'otros', bestScore = 0;
    for (const [cat, words] of Object.entries(KW)) {
      let s = 0; for (const wd of words) { if (v.includes(wd)) s += 3; if (t.includes(wd)) s += 1; }
      if (s > bestScore) { bestScore = s; best = cat; }
    }
    return best;
  }
  function findBrand(lines) {
    const head = lines.slice(0, 14).join(' ').toLowerCase(), all = lines.join(' ').toLowerCase();
    for (const scope of [head, all]) {
      for (const [re, name, cat] of BRANDS) if (re.test(scope)) return { name, cat };
      const STOP = /^(billing|statement|utilities|utility|water|account|customer|service|payment|bill|invoice|the)$/;
      const cities = [...scope.matchAll(/city\s+of\s+([a-z]{3,})/g)].map(m => m[1]).filter(c => !STOP.test(c));
      const dom = scope.match(/\b([a-z]{4,})tx[\s.]+(?:com|gov|org|net)/);                      // www.burlesontx.com -> Burleson
      const city = cities[0] || (dom && /city|billing|utilit/.test(scope) ? dom[1] : null);
      if (city) return { name: 'City of ' + city[0].toUpperCase() + city.slice(1), cat: null };
    }
    return null;
  }

  const MONTHS = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12, dec: 12 };

  function parseAmount(s) {
    s = s.replace(/[^\d.,]/g, '');
    if (!s) return NaN;
    const lastDot = s.lastIndexOf('.'), lastCom = s.lastIndexOf(',');
    if (lastDot >= 0 && lastCom >= 0) { return parseFloat(lastDot > lastCom ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.')); }
    if (lastCom >= 0) return /,\d{2}$/.test(s) ? parseFloat(s.replace(',', '.')) : parseFloat(s.replace(/,/g, ''));
    return parseFloat(s);
  }
  const AMOUNT_RE = /(?:\d{1,3}(?:[,.]\d{3})+|\d+)[.,]\d{2}(?!\d)/g;

  function findDate(lines) {
    const now = new Date(), maxY = now.getFullYear() + 1;
    const all = line => {                      // todas las fechas de una línea, en orden de aparición
      const out = []; let m;
      const reA = /\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/g, reB = /\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4}|\d{2})\b/g,
        reC = /\b(\d{1,2})[\s\-\/.]+(?:de\s+)?([a-záéíóú]{3,10})\.?[\s\-\/,.]+(?:de\s+)?(20\d{2})\b/gi, reD = /\b([a-záéíóú]{3,10})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/gi;
      while ((m = reA.exec(line))) out.push([m.index, +m[1], +m[2], +m[3]]);
      while ((m = reB.exec(line))) { let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000; out.push(a > 12 ? [m.index, y, b, a] : [m.index, y, a, b]); }   // EE. UU.: mes/día/año
      while ((m = reC.exec(line))) { const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]; if (mo) out.push([m.index, +m[3], mo, +m[1]]); }
      while ((m = reD.exec(line))) { const mo = MONTHS[m[1].slice(0, 3).toLowerCase()]; if (mo) out.push([m.index, +m[3], mo, +m[2]]); }
      return out.sort((a, b) => a[0] - b[0]).map(x => x.slice(1));
    };
    const ok = d => d[0] >= 2020 && d[0] <= maxY && d[1] >= 1 && d[1] <= 12 && d[2] >= 1 && d[2] <= 31 && new Date(d[0], d[1] - 1, d[2]) <= new Date(now.getTime() + 4 * 864e5);
    const tiers = [
      l => /bill\s*date|invoice\s*date|fecha\s*(de\s*)?(emisi|factura)?|date\s*[:#]/i.test(l) && !/due|vence|expir/i.test(l),     // "fecha de la factura"
      l => /\d{1,2}:\d{2}/.test(l) && !/expir/i.test(l),                                                                          // fecha con hora (tickets)
      l => !/expir|due|vence|exp\./i.test(l),                                                                                    // cualquier fecha menos vencimientos
      l => true,
    ];
    for (const t of tiers) for (const ln of lines.filter(t)) for (const d of all(ln)) if (ok(d)) return d;
    return null;
  }

  function findTotal(lines) {
    const amountsIn = l => (l.match(AMOUNT_RE) || []).map(parseAmount).filter(n => !isNaN(n) && n > 0 && n < 100000);
    const rules = [
      [/total\s*amount\s*due|amount\s*due|balance\s*due|monto\s*a\s*pagar|importe\s*total|total\s*a\s*pagar|fuel\s*total/i, 4],
      [/\btotal\b|\btotal[:=\s$]/i, 3],
      [/debit\s*tend|total\s*purchase|\bdebit\b|\bvisa\b|venta|\btend\b|\bcredit\b/i, 1],
    ];
    const bad = /sub\s*-?\s*total|impuesto|\btax\b|\biva\b|propina|\btip\b|change\s*due|previous|penalt|after\s*due|usd\$|ref\s*#|appr|cash|efectivo|cambio/i;
    // Validación aritmética: subtotal + impuesto = total (si cuadra, es casi seguro el total)
    const amts = [...new Set(lines.flatMap(amountsIn))], mx = amts.length ? Math.max(...amts) : 0; let tri = null;
    for (const a of amts) for (const b of amts) { if (a <= b) continue; const c = amts.find(x => Math.abs(a + b - x) < 0.011 && x > a && x >= mx * 0.95 && a / x > 0.85); if (c) tri = tri && tri > c ? tri : c; }
    const score = new Map();
    for (const ln of lines) {
      if (bad.test(ln)) continue;
      let wgt = 0; for (const [re, p] of rules) if (re.test(ln)) wgt = Math.max(wgt, p);
      if (!wgt) continue;
      for (const a of amountsIn(ln)) score.set(a, (score.get(a) || 0) + wgt);
    }
    if (tri) score.set(tri, (score.get(tri) || 0) + 5);
    if (score.size > 1) { const big = Math.max(...score.keys()); for (const a of [...score.keys()]) if (a < big * 0.25) score.delete(a); }
    if (score.size) { const best = [...score.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]; return { value: best[0], sure: best[1] >= 3 }; }
    const every = lines.flatMap(amountsIn);
    return every.length ? { value: Math.max(...every), sure: false } : { value: 0, sure: false };
  }

  const NOT_VENDOR = /feedback|survey|thank|gracias|www\.|https?:|@|\.com|invoice|factura|recibo|receipt|customer|copy|copia|welcome|bienvenid|store\s*#|phone|tel[:.]|^\W*\d/i;
  function findVendor(lines) {
    for (const l of lines.slice(0, 12)) {
      const clean = l.replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]+/, '').replace(/[|_~=]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
      const letters = (clean.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length;
      if (letters >= 4 && letters / clean.length > 0.6 && !NOT_VENDOR.test(clean) && clean.length <= 40) {
        return clean.toLowerCase().replace(/(^|\s|[-.(])([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bCo\b\.?/, 'Co.').replace(/\s*(Billing\s+)?Statement.*$/i, '').replace(/^The\s+/, '').trim();
      }
    }
    return '';
  }

  function parse(text) {
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const brand = findBrand(lines);
    const vendor = brand ? brand.name : findVendor(lines);
    const d = findDate(lines);
    const t = findTotal(lines);
    const date = d ? `${d[0]}-${pad(d[1])}-${pad(d[2])}` : '';
    return { vendor, date, amount: t.value, category: brand && brand.cat ? brand.cat : guessCategory(vendor, text),
             check: { vendor: !vendor, date: !date, amount: !t.sure } };
  }

  /* ---------- Proceso completo ---------- */
  // Lectura con IA (opcional): la foto de cada factura se envía al servidor de esta casa, que la manda a Anthropic con la clave guardada en la PC
  async function aiReadCrop(crop) {
    const small = shrink(crop, 1568);
    const blob = await new Promise(r => small.toBlob(r, 'image/jpeg', 0.85));
    const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
    const headers = { 'Content-Type': 'application/json', ...(window.Sync ? Sync.headers() : {}) };
    const res = await fetch('api/leer-factura', { method: 'POST', headers, body: JSON.stringify({ image: b64, media_type: 'image/jpeg' }) });
    let j = {}; try { j = await res.json(); } catch { }
    if (!res.ok || !j.ok) throw new Error(j.mensaje || ('error ' + res.status));
    if (!j.receipts || !j.receipts.length) throw new Error('la IA no encontró facturas en la imagen');
    return j;
  }

  async function scan(file, opts = {}) {
    const { mode = 'auto', cols = 2, rows = 3, onStatus = () => {}, useAI = false } = opts;
    let aiOn = !!useAI, aiNote = '';
    onStatus('Preparando la imagen…', 0.02);
    let canvas = await loadCanvas(file);
    const wk = await getWorker(m => { if (m.status === 'loading language traineddata' || m.status === 'loading tesseract core') onStatus('Cargando el lector (solo la primera vez)…', 0.04); });
    let boxes;
    if (mode === 'single') boxes = [{ x: 0, y: 0, w: canvas.width, h: canvas.height }];
    else if (mode === 'grid') boxes = gridBoxes(canvas, cols, rows);
    else {
      canvas = (await fixOrientation(canvas, wk, onStatus)).canvas;
      onStatus('Buscando las facturas en la foto…', 0.08);
      await new Promise(r => setTimeout(r, 20));
      boxes = segment(canvas);
      if (!boxes.length) boxes = [{ x: 0, y: 0, w: canvas.width, h: canvas.height }];
    }
    onStatus(`Se detectaron ${boxes.length} factura${boxes.length === 1 ? '' : 's'}.`, 0.1);
    const results = [];
    for (let i = 0; i < boxes.length; i++) {
      let crop = cropCanvas(canvas, boxes[i]);
      onStatus(`Leyendo factura ${i + 1} de ${boxes.length}${aiOn ? ' con IA' : ''}…`, 0.12 + 0.86 * (i / boxes.length));
      if (aiOn) {
        try {
          const ai = await aiReadCrop(crop);
          for (const r of ai.receipts) {
            const c = r.rotation ? rotate(crop, r.rotation) : crop;
            const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.88));
            results.push({ vendor: r.vendor, date: r.date, amount: r.total, category: r.category, check: { vendor: !r.vendor, date: !r.date, amount: !r.readable },
              text: `Leída con IA (${ai.model})`, ai: true, blob, thumb: URL.createObjectURL(blob) });
          }
          continue;
        } catch (e) {
          onStatus(`La IA no respondió (${e.message}). Se usa el lector local.`, 0.12 + 0.86 * (i / boxes.length));
          aiNote = e.message; if (/clave|saldo|límite|modelo|permiso|instalar/i.test(aiNote)) aiOn = false;     // si el problema es de la cuenta, no se insiste con las demás facturas
        }
      }
      let prepped = prepForOcr(crop);
      let { data } = await wk.recognize(prepped);
      if (data.confidence < 68) {                      // lectura poco segura: quizá ese recibo está al revés (180°)
        const crop2 = rotate(crop, 180), p2 = prepForOcr(crop2), d2 = (await wk.recognize(p2)).data;
        if (d2.confidence > data.confidence + 6) { crop = crop2; prepped = p2; data = d2; }
      }
      let text = data.text, parsed = parse(text);
      if (parsed.check.amount || parsed.check.date || parsed.check.vendor) {
        // Segunda lectura con otro modo (columna única) para completar lo que falte
        try {
          await wk.setParameters({ tessedit_pageseg_mode: '4' });
          const d2 = (await wk.recognize(prepped)).data;
          const merged = text + '\n' + d2.text, p2 = parse(merged);
          const gain = (p2.check.amount ? 0 : 1) + (p2.check.date ? 0 : 1) + (p2.check.vendor ? 0 : 1) - ((parsed.check.amount ? 0 : 1) + (parsed.check.date ? 0 : 1) + (parsed.check.vendor ? 0 : 1));
          if (gain > 0) { text = merged; parsed = p2; }
        } finally { await wk.setParameters({ tessedit_pageseg_mode: '6' }); }
      }
      const blob = await new Promise(r => crop.toBlob(r, 'image/jpeg', 0.88));
      results.push({ ...parsed, text, blob, thumb: URL.createObjectURL(blob) });
    }
    onStatus('Listo', 1);
    results.aiNote = aiNote;
    return results;
  }

  return { scan, parse, segment, analyze, loadCanvas, guessCategory, _debug: { textIsSideways, rotate, shrink, wordScore, getWorker, prepForOcr } };
})();
