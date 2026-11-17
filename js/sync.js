/* Sincronización entre dispositivos a través del servidor local (serve.py).
   Cada registro lleva updatedAt; si dos dispositivos cambian lo mismo, gana el cambio más reciente. */
const Sync = {
  status: 'init',              // init | off | ok | syncing | offline | code
  lastOk: null, info: null, running: false, timer: null, interval: null,
  state: (() => { try { return { rev: 0, pushedAt: 0, code: '', ...JSON.parse(localStorage.getItem('gh-sync') || '{}') }; } catch { return { rev: 0, pushedAt: 0, code: '' }; } })(),
  save() { try { localStorage.setItem('gh-sync', JSON.stringify(Sync.state)); } catch { } },
  headers() { return Sync.state.code ? { 'X-Codigo': Sync.state.code } : {}; },

  setStatus(s) { Sync.status = s; Sync.render(); },
  render() {
    const el = document.getElementById('sync-chip'); if (!el) return;
    if (window.SOLO_TELEFONO) { el.style.display = 'none'; if (document.getElementById('sync-detail')) Sync.renderDetail(); return; }
    const map = { init: ['', ''], off: ['Solo en este dispositivo', 'off'], ok: ['Sincronizado', 'ok'], syncing: ['Sincronizando…', 'busy'], offline: ['Sin conexión', 'off'], code: ['Falta el código familiar', 'warn'] };
    const [text, cls] = map[Sync.status] || ['', ''];
    el.className = 'sync-chip ' + cls; el.textContent = text; el.style.display = text ? '' : 'none';
    el.title = Sync.lastOk ? 'Última sincronización: ' + new Date(Sync.lastOk).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '';
    if (document.getElementById('sync-detail')) Sync.renderDetail();
  },

  async init() {
    if (window.SOLO_TELEFONO) { Sync.status = 'solo'; Sync.render(); return; }       // versión solo teléfono: no hay servidor, nada que sincronizar
    DB.onChange = () => Sync.schedule();
    window.addEventListener('focus', () => Sync.schedule(300));
    window.addEventListener('online', () => Sync.schedule(300));
    await Sync.run();
    clearInterval(Sync.interval); Sync.interval = setInterval(() => Sync.run(), 30000);
  },
  schedule(ms = 1500) { clearTimeout(Sync.timer); Sync.timer = setTimeout(() => Sync.run(), ms); },

  async ping() {
    if (window.SOLO_TELEFONO) return null;
    try {
      const r = await fetch('api/ping', { headers: Sync.headers(), cache: 'no-store' });
      if (!r.ok) { Sync.lastError = 'ping: el servidor respondió ' + r.status; if (window.__log) window.__log('sync: ' + Sync.lastError); return null; }
      const j = await r.json(); Sync.info = j; return j;
    } catch (e) { Sync.lastError = 'ping: ' + ((e && e.message) || e); if (window.__log) window.__log('sync: ' + Sync.lastError); return null; }
  },

  async run() {
    if (window.SOLO_TELEFONO) return;
    if (Sync.running) { Sync.again = true; return; }
    Sync.running = true;
    try {
      const p = await Sync.ping();
      if (!p || !p.ok) { Sync.setStatus(location.protocol === 'file:' || Sync.status === 'init' ? 'off' : 'offline'); return; }
      if (!p.authorized) { Sync.setStatus('code'); return; }
      if (typeof p.rev === 'number' && p.rev < Sync.state.rev) {      // el servidor tiene menos historial que este dispositivo (se reinició o perdió datos): se vuelve a subir todo
        Sync.state.rev = 0; Sync.state.pushedAt = 0; Sync.save();
        for (const inv of await DB.all('invoices')) if (inv.blob && inv.blobSynced) await DB.putRaw('invoices', { ...inv, blobSynced: false });
      }
      Sync.setStatus('syncing');
      const startedAt = Date.now(), since = Sync.state.pushedAt, stamp = r => r.updatedAt || r.createdAt || 1;
      const changes = {
        expenses: (await DB.all('expenses')).filter(r => stamp(r) > since),
        invoices: (await DB.all('invoices')).filter(r => stamp(r) > since).map(({ blob, blobSynced, ...meta }) => meta),
        settings: (await DB.all('settings')).filter(r => stamp(r) > since),
        tombstones: (await DB.all('tombstones')).filter(r => stamp(r) > since),
      };
      const res = await fetch('api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', ...Sync.headers() }, body: JSON.stringify({ since: Sync.state.rev, changes }) });
      if (res.status === 401) { Sync.setStatus('code'); return; }
      if (!res.ok) throw new Error('sync ' + res.status);
      const { rev, items } = await res.json();
      const changed = await Sync.apply(items);
      try { await Sync.blobs(); } catch (e) { Sync.lastError = 'imágenes: ' + ((e && e.message) || e); if (window.__log) window.__log('sync: ' + Sync.lastError); }   // las imágenes se reintentan en la próxima ronda
      Sync.state.rev = rev; Sync.state.pushedAt = startedAt; Sync.save();
      Sync.lastOk = Date.now(); Sync.setStatus('ok');
      if (changed) await Sync.refreshUI();
    } catch (e) {
      console.warn('Sincronización:', e); Sync.lastError = ((e && e.message) || String(e)); if (window.__log) window.__log('sync: fallo - ' + Sync.lastError); Sync.setStatus('offline');
    } finally {
      Sync.running = false;
      if (Sync.again) { Sync.again = false; Sync.schedule(500); }
    }
  },

  // Aplica lo que llegó del servidor (gana el más reciente)
  async apply(items) {
    let changed = 0; const stamp = r => (r && (r.updatedAt || r.createdAt)) || 0;
    for (const t of items.tombstones || []) {
      const local = await DB.get(t.store, t.id);
      if (!local || stamp(local) < t.updatedAt) { if (local) { await DB.delRaw(t.store, t.id); changed++; } await DB.putRaw('tombstones', { key: `${t.store}:${t.id}`, store: t.store, id: t.id, updatedAt: t.updatedAt }); }
    }
    for (const [store, keyname] of [['expenses', 'id'], ['invoices', 'id'], ['settings', 'key']]) {
      for (const rec of items[store] || []) {
        const local = await DB.get(store, rec[keyname]);
        if (local && stamp(local) >= stamp(rec)) continue;
        const tomb = await DB.get('tombstones', `${store}:${rec[keyname]}`);
        if (tomb && tomb.updatedAt >= stamp(rec)) continue;
        const { rev, ...clean } = rec;
        if (store === 'invoices') { clean.blob = local ? local.blob : undefined; clean.blobSynced = local ? local.blobSynced : false; }
        await DB.putRaw(store, clean); changed++;
      }
    }
    return changed;
  },

  // Sube las imágenes de facturas nuevas y baja las que faltan
  async blobs() {
    const invs = await DB.all('invoices'); let got = 0;
    for (const inv of invs) {
      if (inv.blob && !inv.blobSynced) {
        const r = await fetch('api/invoice/' + encodeURIComponent(inv.id), { method: 'PUT', headers: Sync.headers(), body: inv.blob });
        if (r.ok) await DB.putRaw('invoices', { ...inv, blobSynced: true });
      } else if (!inv.blob && inv.hasBlob !== false) {
        const r = await fetch('api/invoice/' + encodeURIComponent(inv.id), { headers: Sync.headers() });
        if (r.ok) { const b = await r.blob(); await DB.putRaw('invoices', { ...inv, blob: new Blob([b], { type: 'image/jpeg' }), blobSynced: true }); got++; }
      }
    }
    return got;
  },

  async refreshUI() {
    await App.reload();
    if ($('#modal').classList.contains('open') || (S.scan && S.scan.results)) return;     // no interrumpir lo que se está haciendo
    const y = window.scrollY, ae = document.activeElement;
    if (ae && ['INPUT', 'SELECT', 'TEXTAREA'].includes(ae.tagName)) return;
    App.route(); window.scrollTo({ top: y });
  },

  // Sincronización completa: vuelve a enviar todo lo de este dispositivo (el servidor ignora lo que ya tiene) y trae lo que falte
  async fullSync() {
    Sync.state.rev = 0; Sync.state.pushedAt = 0; Sync.save();
    for (const inv of await DB.all('invoices')) if (inv.blob && inv.blobSynced) await DB.putRaw('invoices', { ...inv, blobSynced: false });
    while (Sync.running) await new Promise(r => setTimeout(r, 200));
    await Sync.run();
  },

  // Tarjeta "Lectura con inteligencia artificial" en Ajustes
  renderAI() {
    const el = document.getElementById('ai-detail'); if (!el) return;
    const a = (Sync.info || {}).ai;
    if (!a) { el.innerHTML = '<p class="mini" style="margin:0">Se muestra cuando la app está conectada al servidor de la computadora.</p>'; return; }
    const falta = [];
    if (!a.sdk) falta.push('el componente de IA en la computadora');
    if (!a.hasKey) falta.push('la clave de Anthropic');
    if (!a.ready) {
      el.innerHTML = `<p style="margin:0 0 8px"><b style="color:var(--gris)">● Apagada</b> · falta ${falta.join(' y ')}.</p>
        <p class="mini" style="margin:0">Se configura una sola vez en la computadora (instrucciones en <b>LEEME.md</b>, sección «Lectura con inteligencia artificial»). Mientras tanto la app usa el lector local, que es gratis y privado.</p>`;
      return;
    }
    el.innerHTML = `<label class="switch-row"><input type="checkbox" id="ai-toggle" ${S.useAI ? 'checked' : ''}> <b>Leer facturas con IA</b></label>
      <p class="mini" style="margin:8px 0 0">${S.useAI ? '<b style="color:var(--ok)">● Activada</b>' : '<b style="color:var(--gris)">● Desactivada</b>'} · modelo <b>${esc(a.model)}</b> · hoy se han leído <b>${a.usedToday}</b> de ${a.limit} permitidas.</p>
      <p class="mini" style="margin:8px 0 0">Al activarla, la foto de cada factura se envía por internet a Anthropic para leerla (puede contener nombres, direcciones o números de cuenta). Si la IA falla o no hay internet, la app usa sola el lector local.</p>`;
    document.getElementById('ai-toggle').onchange = async e => { S.useAI = e.target.checked; await DB.setSetting('useAI', S.useAI); toast(S.useAI ? 'Lectura con IA activada' : 'Lectura con IA desactivada'); Sync.renderAI(); };
  },
  setCode(code) { Sync.state.code = String(code || '').replace(/\s/g, ''); Sync.save(); return Sync.run(); },

  // Tarjeta de Ajustes en la versión solo teléfono
  phoneHTML() {
    const lb = +(localStorage.getItem('gh-backup') || 0);
    const cuando = lb ? new Date(lb).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : 'todavía no has guardado ninguno';
    return `<p style="margin:0 0 10px"><b style="color:var(--ok)">● Solo en este teléfono</b></p>
      <p class="mini" style="margin:0 0 8px">Tus gastos se guardan únicamente en este teléfono, dentro de esta app. No se envían a ningún servidor ni a otra persona.</p>
      <p class="mini" style="margin:0 0 8px"><b>Último respaldo:</b> ${cuando}. Si borras la app o cambias de teléfono, sin respaldo se pierden los gastos. Hazlo en <b>Respaldo y exportación</b>.</p>
      <details class="howto"><summary>Cómo dejarla como app en el teléfono</summary>
        <p><b>iPhone:</b> ábrela en <b>Safari</b>, toca el botón Compartir y elige <i>Añadir a pantalla de inicio</i>. Se abre como app, a pantalla completa.</p>
        <p><b>Android:</b> ábrela en <b>Chrome</b>, toca el menú ⋮ y elige <i>Instalar app</i> (o <i>Agregar a pantalla de inicio</i>).</p></details>`;
  },

  renderDetail() {
    const el = document.getElementById('sync-detail'); if (!el) return;
    const i = Sync.info || {}, st = Sync.status;
    const msg = { ok: '<b style="color:var(--ok)">● Sincronizado</b>', syncing: '<b>● Sincronizando…</b>', offline: '<b style="color:var(--gris)">● Sin conexión con el servidor</b>' + (Sync.lastError ? '<div class="mini" style="margin-top:4px">Motivo: ' + esc(Sync.lastError) + '</div>' : ''), code: '<b style="color:#8F5F0E">● Falta el código familiar</b>', off: '<b style="color:var(--gris)">● Solo en este dispositivo</b>', init: '' }[st];
    el.innerHTML = window.SOLO_TELEFONO ? Sync.phoneHTML() : `<p style="margin:0 0 10px">${msg}${Sync.lastOk ? ` <span class="mini">· última vez ${new Date(Sync.lastOk).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}</p>
      ${st === 'off' ? '<p class="mini" style="margin:0">Para sincronizar, abre la app con <b>Iniciar Gastos del Hogar.bat</b> (así el celular y la computadora comparten los datos).</p>' : ''}
      ${i.code ? `<div class="phone-box"><div style="flex:1;min-width:230px"><p style="margin:0 0 8px"><b>Conectar el celular</b> (con el mismo Wi-Fi que esta computadora):</p>
        <ol class="steps"><li>Escanea el código QR con la cámara del celular, o escribe en el navegador <b>${esc(i.lan || '')}</b></li><li>La primera vez te pide este código familiar:</li></ol><div class="code-box">${esc(i.code)}</div></div>
        <div class="qr" id="qr-box" title="${esc(i.lan || '')}"></div></div>` : ''}
      ${window.__installEvt ? '<div style="margin-top:12px"><button class="btn primary" id="b-install">Instalar la app en este dispositivo</button></div>' : ''}
      <details class="howto"><summary>Cómo dejarla como app en el celular</summary>
        <p><b>iPhone (Safari):</b> abre la dirección, toca el botón Compartir y elige <i>Agregar a pantalla de inicio</i>. Se abre como app, sin barra del navegador.</p>
        <p><b>Android (Chrome):</b> abre la dirección, toca el menú ⋮ y elige <i>Agregar a pantalla de inicio</i>. Con la dirección <code>http</code> queda como acceso directo; para que Chrome la <b>instale como app completa</b> hace falta una dirección segura (https), ver LEEME → «Instalación completa».</p>
        <p class="mini">Tip: en el router puedes reservar una dirección fija para esta computadora; así la dirección del celular no cambia.</p></details>
      ${(st === 'code' || (!Sync.state.code && st !== 'ok' && !i.code)) ? `<p class="mini" style="margin:8px 0 0">Escribe el código familiar de 8 números (lo ves en la computadora, en Ajustes):</p><div style="display:flex;gap:8px;margin-top:6px"><input class="inp" id="sync-code" inputmode="numeric" placeholder="Código familiar de 8 números" style="max-width:260px"><button class="btn primary" id="sync-code-go">Conectar</button></div>` : ''}
      <div style="margin-top:12px"><button class="btn small" id="sync-now">Sincronizar ahora</button></div>`;
    const qb = document.getElementById('qr-box');
    if (qb && i.lan && window.qrcode) { try { const q = qrcode(0, 'M'); q.addData(i.lan); q.make(); qb.innerHTML = q.createSvgTag(5, 2); } catch (e) { qb.textContent = ''; } }
    const bi = document.getElementById('b-install'); if (bi) bi.onclick = async () => { const ev = window.__installEvt; window.__installEvt = null; ev.prompt(); await ev.userChoice; Sync.renderDetail(); };
    Sync.renderAI();
    (async () => {                                   // ¿Está la app guardada en este dispositivo para abrir sin conexión?
      let txt = 'No disponible aquí (necesita la dirección https)', col = 'var(--gris)';
      try {
        if ('serviceWorker' in navigator && isSecureContext) {
          const reg = await navigator.serviceWorker.getRegistration(), keys = await caches.keys();
          const clave = ['index.html', 'js/app.js', 'js/views.js', 'css/styles.css', 'vendor/chart.umd.js'], faltan = [];
          for (const f of clave) { if (!(await caches.match(f))) faltan.push(f); }
          if (reg && reg.active && keys.length && !faltan.length) { txt = '✓ Lista: la app abre aunque no haya conexión (' + keys[0] + ')'; col = 'var(--ok)'; }
          else if (reg && reg.active && faltan.length) { txt = 'Incompleta, faltan: ' + faltan.join(', ') + '. Abre la app con conexión y espera unos segundos.'; col = '#8F5F0E'; }
          else { txt = 'Aún no guardada: abre la app con conexión y espera unos segundos'; col = '#8F5F0E'; }
        }
      } catch (e) { txt = 'No se pudo comprobar'; }
      const el = document.getElementById('sync-detail'); if (el && !document.getElementById('sw-line')) el.insertAdjacentHTML('beforeend', '<p id="sw-line" class="mini" style="margin:10px 0 0"><b>Modo sin conexión:</b> <span style="color:' + col + '">' + txt + '</span></p>');
      const bs = document.getElementById('sw-save');
      if (el && !bs && txt.indexOf('Lista') < 0 && 'caches' in window) {
        el.insertAdjacentHTML('beforeend', '<p class="mini" style="margin:6px 0 0"><button class="btn" id="sw-save">Guardar la app para usar sin conexión</button> <span id="sw-msg"></span></p>');
        document.getElementById('sw-save').onclick = async () => {
          const msg = document.getElementById('sw-msg'), lista = ['./', 'index.html', 'modo.js', 'manifest.webmanifest', 'css/styles.css', 'js/util.js', 'js/db.js', 'js/seed.js', 'js/extract.js', 'js/charts.js', 'js/views.js', 'js/pagos.js', 'js/sync.js', 'js/app.js', 'assets/logo-vertical.svg', 'assets/logo-icon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'vendor/chart.umd.js', 'vendor/tesseract.min.js', 'vendor/qrcode.js'];
          let ok = 0, err = '';
          try { const c = await caches.open('gastos-hogar-v5'); for (let i = 0; i < lista.length; i++) { msg.textContent = ' Guardando ' + (i + 1) + ' de ' + lista.length + '...'; try { const r = await fetch(lista[i], { cache: 'reload' }); if (!r.ok) throw new Error('HTTP ' + r.status); await c.put(lista[i], r); ok++; } catch (e) { err = err || (lista[i] + ': ' + (e.message || e)); } } } catch (e) { err = 'no se pudo abrir el almacén: ' + (e.message || e); }
          msg.textContent = ' Guardados ' + ok + ' de ' + lista.length + (err ? '. Error: ' + err : '. Listo, vuelve a abrir Ajustes para comprobar.');
        };
      }
    })();
    const go = document.getElementById('sync-code-go');
    if (go) go.onclick = async () => { await Sync.setCode(document.getElementById('sync-code').value); if (Sync.status === 'code') toast('Código incorrecto', 'err'); else toast('Conectado'); };
    const sn = document.getElementById('sync-now'); if (sn) sn.onclick = async () => { await Sync.fullSync(); toast(Sync.status === 'ok' ? 'Sincronizado: todo está al día' : 'No se pudo sincronizar', Sync.status === 'ok' ? '' : 'err'); };
  },
};

// Si el navegador permite instalar la app (solo con https), se guarda el aviso para ofrecer el botón en Ajustes
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installEvt = e; if (document.getElementById('sync-detail')) Sync.renderDetail(); });