/* Service Worker · Claret — push + soporte offline (red primero, caché de respaldo) */
var CACHE = 'claret-v311';
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(['./caja.html']).catch(function(){}); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try { var ks = await caches.keys(); await Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function (k) { return caches.delete(k); })); } catch (_e) {}
    try { await self.clients.claim(); } catch (_e) {}
  })());
});
/* Red primero (versión fresca siempre que haya internet); si no hay señal, sirve la última copia buena. */
self.addEventListener('fetch', function (e) {
  var u; try { u = new URL(e.request.url); } catch (_e) { return; }
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }).catch(function(){}); }
      return r;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: false }).then(function (m) { return m || caches.match('./caja.html'); });
    })
  );
});
self.addEventListener('push', function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_e) { data = { body: (e.data && e.data.text()) || '' }; }
  var title = data.title || 'Claret';
  var opts = { body: data.body || '', data: { url: data.url || '/' }, vibrate: [120,60,120], renotify: true, tag: data.tag || 'claret', requireInteraction: true };
  e.waitUntil(self.registration.showNotification(title, opts));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) { for (var i=0;i<list.length;i++){ if('focus' in list[i]) return list[i].focus(); } if (clients.openWindow) return clients.openWindow(url); }));
});
