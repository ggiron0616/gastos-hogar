/* Service worker: la app abre aunque no haya internet ni servidor.
   - Archivos de la app: primero la red (con tiempo límite, por si el túnel/VPN se queda "colgado" sin internet); si falla, la copia guardada.
   - Librerías (vendor/): copia guardada primero (pesan mucho y no cambian).
   - /api/ (sincronización): nunca se guarda; sin conexión la app sigue con los datos locales.
   Las rutas se calculan respecto a la carpeta donde vive la app, así funciona en la raíz de un sitio o en una subcarpeta. */
const VERSION = 'gastos-hogar-v5';
const SHELL = [
  './', 'index.html', 'modo.js', 'manifest.webmanifest', 'css/styles.css',
  'js/util.js', 'js/db.js', 'js/seed.js', 'js/extract.js', 'js/charts.js', 'js/views.js', 'js/pagos.js', 'js/sync.js', 'js/app.js',
  'assets/logo-vertical.svg', 'assets/logo-icon.svg', 'assets/icon-192.png', 'assets/icon-512.png',
  'vendor/chart.umd.js', 'vendor/tesseract.min.js', 'vendor/qrcode.js',
];
const NET_TIMEOUT = 4000;
const BASE = new URL('./', self.location).pathname;
const rutaRel = url => url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname.replace(/^\//, '');

// Descarga un archivo y lo guarda; si falla, lo reintenta una vez
const guardar = async (c, u) => {
  for (let i = 0; i < 2; i++) { try { const r = await fetch(u, { cache: 'reload' }); if (r.ok) { await c.put(u, r); return true; } } catch (e) { } }
  return false;
};

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => guardar(c, u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const conTiempo = (req, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('tiempo agotado')), ms);
  fetch(req).then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
});

// Busca en la copia guardada: tal cual, sin parámetros (?x=) y, si es una página, la de inicio
const enCopia = async req => {
  const hit = await caches.match(req) || await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  if (req.mode === 'navigate') return (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
  return Response.error();
};

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url), rel = rutaRel(url);
  if (req.method !== 'GET' || url.origin !== location.origin || rel.startsWith('api/') || rel.startsWith('data')) return;

  if (rel.startsWith('vendor/')) {                                  // librerías: caché primero
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })));
    return;
  }
  e.respondWith(                                                    // app: red primero (con tiempo límite), caché de respaldo
    conTiempo(req, NET_TIMEOUT).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })
      .catch(() => enCopia(req))
  );
});
