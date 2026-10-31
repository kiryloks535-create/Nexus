/* ============================================================
   NEXUS service worker — v3.1 PWA
   Strategy: Cache-First for app shell; offline fallback page;
   Background Sync replay for /api/state writes (IDB queue);
   push scaffold (server key required to activate).
   ============================================================ */
const CACHE = 'nexus-v3.4';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './offline.html'
];

/* ---- Push Notifications scaffold (optional) ------------------
   To activate push you need a push server that stores
   subscriptions and a VAPID key pair.
   1) Paste your PUBLIC key below (from your push server, e.g.
      web-push generated): const VAPID_PUBLIC_KEY='...';
   2) In the page call: registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)})
   3) Send the subscription JSON to your push server (POST).
   The 'push' listener below will then display notifications.
---------------------------------------------------------------- */
const VAPID_PUBLIC_KEY = ''; // ← paste server key here to enable push

self.addEventListener('push', function (e) {
  let data = { title: 'NEXUS', body: 'System message' };
  try { data = e.data.json(); } catch (_) { }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: './icon.svg', badge: './icon.svg', tag: 'nexus'
  }));
});

/* ---- install: pre-cache the whole app shell ---- */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); })
    // NOTE: no skipWaiting here — the page shows "UPDATE AVAILABLE — tap to reload"
    // and reloads only after the user taps (message SKIP_WAITING below).
  );
});

/* ---- activate: purge old caches ---- */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* ---- messages from the page ---- */
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ---- fetch: cache-first shell; API passes through to the page ---- */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return; // POST /api/state — page owns offline queue
  var url = new URL(e.request.url);
  if (url.pathname.indexOf('/api/') !== -1) return; // live data: never cached
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        }
        return res;
      }).catch(function () {
        if (e.request.mode === 'navigate') return caches.match('./offline.html');
        return Response.error();
      });
    })
  );
});

/* ---- Background Sync: replay queued /api/state writes ----
   Queue lives in IndexedDB (db 'nexus-queue', store 'writes').
   The PAGE writes failed POSTs there; if the browser supports
   Background Sync we register 'nexus-sync' and replay here.
   Browsers without the API fall back to the page's own
   localStorage queue + 'online' retry (see index.html). */
function idbOpen() {
  return new Promise(function (res, rej) {
    var rq = indexedDB.open('nexus-queue', 1);
    rq.onupgradeneeded = function () { rq.result.createObjectStore('writes', { autoIncrement: true }); };
    rq.onsuccess = function () { res(rq.result); };
    rq.onerror = function () { rej(rq.error); };
  });
}
function idbAll(db) {
  return new Promise(function (res, rej) {
    var tx = db.transaction('writes', 'readonly').objectStore('writes').getAll();
    tx.onsuccess = function () { res(tx.result || []); };
    tx.onerror = function () { rej(tx.error); };
  });
}
function idbClear(db) {
  return new Promise(function (res, rej) {
    var tx = db.transaction('writes', 'readwrite');
    tx.objectStore('writes').clear();
    tx.oncomplete = function () { res(); };
    tx.onerror = function () { rej(tx.error); };
  });
}
async function replayQueue() {
  var db = await idbOpen();
  var items = await idbAll(db);
  for (var i = 0; i < items.length; i++) {
    try {
      var r = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: items[i] })
      });
      if (!r.ok) return; // сервер ещё не готов — оставляем очередь
    } catch (_) { return; } // снова офлайн — оставляем очередь
  }
  await idbClear(db);
}
self.addEventListener('sync', function (e) {
  if (e.tag === 'nexus-sync') e.waitUntil(replayQueue());
});
