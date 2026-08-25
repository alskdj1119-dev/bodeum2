/* 보듬 Service Worker */
var CACHE = 'bodeum-v5';

/* ── 설치 ── */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(['/']).catch(function() {});
    })
  );
  self.skipWaiting();
});

/* ── 활성화 ── */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(ks) {
      return Promise.all(ks.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

/* ── 네트워크 캐시 ── */
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(res) {
      var clone = res.clone();
      caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      return res;
    }).catch(function() { return caches.match(e.request); })
  );
});

/* ── FCM(Firebase Cloud Messaging) 푸시 수신 ──
   언제 알림을 보낼지(경과 시간, 방해 금지 시간대 등)는 이제 서버(Cloud Functions)가
   판단해서 data-only 메시지로 보낸다. 여기서는 받은 내용을 그대로 화면에 띄우기만 한다. */
self.addEventListener('push', function(e) {
  var payload = {};
  try { payload = e.data ? e.data.json() : {}; } catch (_) {}
  var data = payload.data || payload; // FCM data-only 메시지 형태 대응

  var title = data.title || '보듬 🌿';
  var body = data.body || '';
  var tag = data.tag || 'bodeum';

  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      tag: tag,
      renotify: true,
      requireInteraction: false,
    })
  );
});

/* ── 알림 클릭 → 앱 포커스 ── */
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
