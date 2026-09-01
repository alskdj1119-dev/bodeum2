/* 보듬 Service Worker */
// 배포할 때마다 정적 파일 경로(빌드 해시)가 바뀌기 때문에, 캐시 이름을 바꾸지 않으면
// 예전 배포 때 저장해둔 캐시가 그대로 남아있게 된다. 지금 버전을 올려서 폰에 남아있는
// 낡은 캐시를 한 번 정리한다 — 앞으로도 캐시 구조를 크게 바꿀 때는 이 숫자를 올려줄 것.
var CACHE = 'bodeum-v8';
// 페이지 요청이 네트워크 오류로 실패했을 때 iOS 기본 "페이지를 불러올 수 없음" 화면 대신
// 보여줄 최소한의 대체 화면 (자동 재시도 포함) — 이 파일 하나만 캐시해두고, 실제 앱
// 코드/데이터는 절대 캐시하지 않는다 (낡은 빌드가 다시 서빙되는 문제 방지).
var OFFLINE_URL = '/offline.html';

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

/* ── 설치 ── */
// '/'(홈 문서)는 더 이상 여기서 미리 캐시하지 않는다 — fetch 핸들러에서 내비게이션
// 요청은 캐시를 아예 타지 않도록 바꿨기 때문에(아래 참고), 여기 미리 캐시해봐야 쓰이지 않는다.
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.add(OFFLINE_URL); }).catch(function() {})
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
  // 브라우저가 링크 미리 불러오기/뒤로가기 캐시 확인 등으로 만드는 특수 요청
  // (cache:'only-if-cached' + mode!=='same-origin')을 그대로 fetch()에 넘기면
  // 브라우저가 TypeError를 던져서 요청 자체가 "페이지 로드 실패"로 처리됨 — 건드리지 않고 지나간다.
  if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;

  // 페이지 문서(HTML 내비게이션) 요청은 캐시에 저장하지도, 캐시에서 꺼내 쓰지도 않고
  // 항상 네트워크로만 처리한다. 예전엔 이것도 캐시했었는데, 배포 때마다 안의 정적 파일
  // 경로(빌드 해시)가 바뀌다 보니 네트워크가 불안정할 때 예전 빌드를 가리키는 낡은 HTML이
  // 캐시에서 튀어나와 이미 삭제된 파일을 불러오려다 "페이지를 불러올 수 없음" 오류로
  // 이어지는 문제가 있었다 — 브라우저 기본 동작에 맡겨서 항상 최신 버전만 받도록 한다.
  if (e.request.mode === 'navigate') {
    // 정상 상황: 지금처럼 네트워크로만 처리 (낡은 캐시 재발 방지, 기존 동작 유지).
    // 네트워크가 막 끊겼다 붙는 찰나(백그라운드 복귀, 와이파이/셀룰러 전환 등)에는
    // 요청이 한 번 실패할 수 있는데, 이때 그대로 실패시키면 iOS가 자체 "페이지를
    // 불러올 수 없음" 화면을 띄워버린다 — 짧게 한 번 재시도해서 대부분 그 사이에
    // 복구되도록 하고, 그래도 안 되면 자동 재시도가 붙은 우리 화면을 보여준다.
    e.respondWith(
      fetch(e.request).catch(function() {
        return delay(800).then(function() {
          return fetch(e.request);
        }).catch(function() {
          return caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

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
