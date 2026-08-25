/* 보듬 Service Worker */
var CACHE = 'bodeum-v4';
var DB_NAME = 'bodeum-notif';
var DB_STORE = 'state';

/* ── IndexedDB helpers ── */
function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function(e) { e.target.result.createObjectStore(DB_STORE); };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = reject;
  });
}
function dbGet(db, key) {
  return new Promise(function(resolve, reject) {
    var req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = reject;
  });
}
function dbPut(db, key, val) {
  return new Promise(function(resolve, reject) {
    var req = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(val, key);
    req.onsuccess = resolve;
    req.onerror = reject;
  });
}

/* ── 이름 처리 헬퍼 ── */
// 성 제거: 3글자 이상이면 첫 글자(성)를 제거하여 이름만 추출
function getFirstName(fullName) {
  if (!fullName) return '아이';
  var t = fullName.trim();
  return t.length >= 3 ? t.slice(1) : t;
}

// 받침 유무에 따라 이가/가 조사 선택
function addGa(name) {
  if (!name || !name.length) return (name || '') + '가';
  var last = name.charCodeAt(name.length - 1);
  var syllable = last - 0xAC00;
  if (syllable < 0 || syllable > 11171) return name + '가';
  var hasBatchim = (syllable % 28) !== 0;
  return name + (hasBatchim ? '이가' : '가');
}

/* ── 알림 타이머 ── */
var _hungerTimer = null;
var _hungerRepeatTimer = null;
var _feedTimer = null;
var _sleepTimer = null;
var _diaperTimer = null;
var _babyName = '아이';

// 알림 설정 (기본값)
var _settings = {
  diaperAlertH: 3,   // 기저귀 교체 후 N시간 경과 알림 (0=비활성)
  sleepAlertH: 2,    // 수면 시작 후 N시간 경과 알림 (0=비활성)
  quietStart: 23,    // 조용한 시간대 시작 (0-23)
  quietEnd: 7,       // 조용한 시간대 종료 (0-23)
};

function elapsedLabel(ms) {
  var totalMin = Math.floor(ms / 60000);
  var hh = Math.floor(totalMin / 60), mm = totalMin % 60;
  return (hh > 0 ? hh + '시간' : '') + mm + '분';
}

// 조용한 시간대 여부 확인
function isQuietTime() {
  var h = new Date().getHours();
  var s = _settings.quietStart, e = _settings.quietEnd;
  if (s <= e) return h >= s && h < e;
  return h >= s || h < e; // 자정 넘김 (예: 23~07)
}

function notify(opts) {
  if (isQuietTime()) return;
  self.registration.showNotification('보듬 🌿', opts);
}

function fireHungerNotif(lastFeedTime) {
  var elapsed = Date.now() - lastFeedTime;
  var name = getFirstName(_babyName);
  notify({
    body: addGa(name) + ' 배고플 시간, 맘마 준비해주세요.\n마지막 맘마로부터 ' + elapsedLabel(elapsed) + ' 지났어요.',
    tag: 'hunger',
    renotify: true,
    requireInteraction: false
  });
  _hungerRepeatTimer = setTimeout(function() { fireHungerNotif(lastFeedTime); }, 5 * 60 * 1000);
}

function scheduleNotifications(lastFeedTime, activeFeedStart, babyName, lastDiaperTime, activeSleepStart) {
  if (babyName) _babyName = babyName;
  clearTimeout(_hungerTimer);
  clearTimeout(_hungerRepeatTimer);
  clearTimeout(_feedTimer);
  clearTimeout(_sleepTimer);
  clearTimeout(_diaperTimer);

  var now = Date.now();
  var name = getFirstName(_babyName);

  /* 배고픔 알림: 마지막 수유 후 2시간 30분, 이후 5분마다 반복 */
  if (lastFeedTime && !activeFeedStart) {
    var elapsed = now - lastFeedTime;
    var delay = (2.5 * 3600 * 1000) - elapsed;
    if (delay <= 0) {
      if (elapsed < 6 * 3600 * 1000) {
        fireHungerNotif(lastFeedTime);
      }
    } else {
      _hungerTimer = setTimeout(function() { fireHungerNotif(lastFeedTime); }, delay);
    }
  }

  /* 수유 타이머 30분 경과 알림 */
  if (activeFeedStart) {
    var feedElapsed = now - activeFeedStart;
    var feedDelay = 30 * 60 * 1000 - feedElapsed;
    if (feedDelay <= 0) {
      if (feedElapsed < 90 * 60 * 1000) {
        notify({
          body: '아직 맘마 중인가요? 맘마 다 먹었으면 타이머 종료해주세요.',
          tag: 'feed-timer',
          renotify: false,
          requireInteraction: false
        });
      }
    } else {
      _feedTimer = setTimeout(function() {
        notify({
          body: '아직 맘마 중인가요? 맘마 다 먹었으면 타이머 종료해주세요.',
          tag: 'feed-timer',
          renotify: true,
          requireInteraction: false
        });
      }, feedDelay);
    }
  }

  /* 수면 타이머 알림: activeSleepStart 후 N시간 */
  if (activeSleepStart && _settings.sleepAlertH > 0) {
    var sleepElapsed = now - activeSleepStart;
    var sleepDelay = _settings.sleepAlertH * 3600 * 1000 - sleepElapsed;
    if (sleepDelay > 0) {
      _sleepTimer = setTimeout(function() {
        notify({
          body: addGa(name) + ' 잠든 지 ' + _settings.sleepAlertH + '시간이 지났어요. 일어났나요?',
          tag: 'sleep-timer',
          renotify: true,
          requireInteraction: false
        });
      }, sleepDelay);
    }
  }

  /* 기저귀 알림: 마지막 교체 후 N시간 */
  if (lastDiaperTime && _settings.diaperAlertH > 0) {
    var diaperElapsed = now - lastDiaperTime;
    var diaperDelay = _settings.diaperAlertH * 3600 * 1000 - diaperElapsed;
    if (diaperDelay > 0) {
      _diaperTimer = setTimeout(function() {
        notify({
          body: '기저귀 교체한 지 ' + _settings.diaperAlertH + '시간이 지났어요. 확인해주세요.',
          tag: 'diaper-timer',
          renotify: true,
          requireInteraction: false
        });
      }, diaperDelay);
    } else if (diaperElapsed < _settings.diaperAlertH * 2 * 3600 * 1000) {
      // 이미 지났지만 2배 시간 내면 즉시 알림
      notify({
        body: '기저귀 교체한 지 ' + elapsedLabel(diaperElapsed) + ' 지났어요. 확인해주세요.',
        tag: 'diaper-timer',
        renotify: true,
        requireInteraction: false
      });
    }
  }
}

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
    }).then(function() {
      return openDB().then(function(db) {
        return Promise.all([
          dbGet(db, 'lastFeedTime'), dbGet(db, 'activeFeedStart'), dbGet(db, 'babyName'),
          dbGet(db, 'lastDiaperTime'), dbGet(db, 'activeSleepStart'), dbGet(db, 'settings'),
        ]);
      }).then(function(vals) {
        if (vals[2]) _babyName = vals[2];
        if (vals[5]) _settings = Object.assign(_settings, vals[5]);
        if (vals[0] || vals[1] || vals[3] || vals[4]) {
          scheduleNotifications(vals[0], vals[1], null, vals[3], vals[4]);
        }
      }).catch(function() {});
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

/* ── 메인 앱 → SW 메시지 ── */
self.addEventListener('message', function(e) {
  if (!e.data) return;

  if (e.data.type === 'FEED_UPDATE') {
    var lastFeedTime = e.data.lastFeedTime || null;
    var activeFeedStart = e.data.activeFeedStart || null;
    var babyName = e.data.babyName || '아이';
    var lastDiaperTime = e.data.lastDiaperTime || null;
    var activeSleepStart = e.data.activeSleepStart || null;

    openDB().then(function(db) {
      return Promise.all([
        dbPut(db, 'lastFeedTime', lastFeedTime),
        dbPut(db, 'activeFeedStart', activeFeedStart),
        dbPut(db, 'babyName', babyName),
        dbPut(db, 'lastDiaperTime', lastDiaperTime),
        dbPut(db, 'activeSleepStart', activeSleepStart),
      ]);
    }).catch(function() {});

    scheduleNotifications(lastFeedTime, activeFeedStart, babyName, lastDiaperTime, activeSleepStart);
  }

  if (e.data.type === 'SETTINGS_UPDATE') {
    _settings = Object.assign(_settings, e.data.settings || {});
    openDB().then(function(db) {
      return dbPut(db, 'settings', _settings);
    }).catch(function() {});
  }
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
