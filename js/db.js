/* Base de datos local (IndexedDB). Cada registro lleva updatedAt; los borrados dejan una "lápida" para poder sincronizarlos. */
const DB = (() => {
  let db;
  const openOnce = () => new Promise((resolve, reject) => {
    const r = indexedDB.open('gastos-hogar', 2);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('expenses')) d.createObjectStore('expenses', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('invoices')) d.createObjectStore('invoices', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('tombstones')) d.createObjectStore('tombstones', { keyPath: 'key' });
    };
    r.onsuccess = () => { db = r.result; db.onversionchange = () => { db.close(); location.reload(); }; resolve(); };
    r.onerror = () => reject(r.error);
    r.onblocked = () => { /* otra pestaña con la versión anterior; el intento vence por tiempo y se reintenta */ };
  });
  // En algunos iPhone la primera apertura de la base queda "colgada" sin responder: se reintenta con tiempo límite
  const open = async () => {
    let last;
    for (let i = 0; i < 5; i++) {
      if (window.__log) window.__log('db: intento ' + (i + 1) + ' de abrir la base');
      try { await Promise.race([openOnce(), new Promise((_, rej) => setTimeout(() => rej(new Error('La base de datos del teléfono no responde')), 3500))]); if (window.__log) window.__log('db: base abierta'); return; }
      catch (e) { last = e; if (window.__log) window.__log('db: fallo - ' + e.message); await new Promise(r => setTimeout(r, 300)); }
    }
    throw last;
  };
  const run = (stores, mode, fn) => new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const req = fn(Array.isArray(stores) ? Object.fromEntries(stores.map(s => [s, t.objectStore(s)])) : t.objectStore(stores));
    t.oncomplete = () => resolve(req && req.result !== undefined ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });

  const api = {
    open,
    onChange: null,                                   // la sincronización se engancha aquí
    _changed() { if (api.onChange) api.onChange(); },
    all: store => run(store, 'readonly', s => s.getAll()),
    get: (store, key) => run(store, 'readonly', s => s.get(key)),
    async put(store, val) { val.updatedAt = Date.now(); const r = await run(store, 'readwrite', s => s.put(val)); api._changed(); return r; },
    async putMany(store, vals) { const now = Date.now(); vals.forEach(v => { v.updatedAt = now; }); await run(store, 'readwrite', s => { vals.forEach(v => s.put(v)); }); api._changed(); },
    async del(store, key) {
      await run([store, 'tombstones'], 'readwrite', s => { s[store].delete(key); s.tombstones.put({ key: `${store}:${key}`, store, id: key, updatedAt: Date.now() }); });
      api._changed();
    },
    clear: store => run(store, 'readwrite', s => s.clear()),
    // Operaciones "crudas" que usa la sincronización (no cambian updatedAt ni disparan otra sincronización)
    putRaw: (store, val) => run(store, 'readwrite', s => s.put(val)),
    delRaw: (store, key) => run(store, 'readwrite', s => s.delete(key)),
    async getSetting(key, def) { const r = await api.get('settings', key); return r && r.value != null ? r.value : def; },
    setSetting(key, value) { return api.put('settings', { key, value }); },
  };
  return api;
})();
