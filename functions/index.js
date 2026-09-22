/**
 * 보듬 알림 스케줄러
 *
 * 예전에는 브라우저의 서비스워커가 setTimeout으로 스스로 알림을 예약했는데,
 * 브라우저/OS가 유휴 상태의 서비스워커를 종료시키면 예약이 사라져서 알림이
 * 안정적으로 오지 않는 문제가 있었다. 이 함수는 그 판단(누구에게 언제 알림을
 * 보낼지)을 서버에서 대신 해준다 — 몇 분마다 깨어나서 모든 가족 문서를 훑어보고,
 * 조건에 맞으면 FCM(Firebase Cloud Messaging)으로 직접 푸시를 발송한다.
 * 앱이 완전히 꺼져 있어도 도착한다.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const COLLECTION = 'families';

const DEFAULT_SETTINGS = {
  diaperAlertH: 3,
  sleepAlertH: 2,
  feedAlertH: 3,
  feedTimerAlertMin: 30,
  hungerRepeatMin: 5,
  quietStart: 23,
  quietEnd: 7,
  quietDisabled: false,
};

const HOUR = 3600 * 1000;
const MIN = 60 * 1000;

// ── 이름 처리 헬퍼 (기존 sw.js 로직 그대로) ──
function getFirstName(fullName) {
  if (!fullName) return '아이';
  const t = String(fullName).trim();
  return t.length >= 3 ? t.slice(1) : t;
}
function addGa(name) {
  if (!name || !name.length) return (name || '') + '가';
  const last = name.charCodeAt(name.length - 1);
  const syllable = last - 0xac00;
  if (syllable < 0 || syllable > 11171) return name + '가';
  const hasBatchim = syllable % 28 !== 0;
  return name + (hasBatchim ? '이가' : '가');
}
// 앱 다른 화면들(lib/helpers.js의 elapsedStr/agoStr/durStr)과 동일한 표기 규칙:
// 시간과 분 사이에 공백을 넣고, 분이 0이면 "0분"을 붙이지 않는다.
// (예전 버전은 "3시간45분"처럼 공백이 없고 "3시간0분"처럼 불필요한 0분이 붙어
//  알림 문구가 이상하게 보이는 오류가 있었음)
function elapsedLabel(ms) {
  const totalMin = Math.floor(ms / 60000);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return mm + '분';
  return mm ? hh + '시간 ' + mm + '분' : hh + '시간';
}

// "잘 부탁해 메모"의 역할 라벨 — lib/helpers.js의 HANDOFF_ROLES와 동일한 목록을
// Cloud Functions는 lib/를 import할 수 없어 여기 그대로 복제해둔다 (elapsedLabel과 같은 이유).
const HANDOFF_ROLE_LABEL = {
  mom: '엄마',
  dad: '아빠',
  family: '가족',
  helper: '도우미',
  other: '기타',
};
function roleLabel(key) {
  return HANDOFF_ROLE_LABEL[key] || key || '';
}

// family.deviceRoles(배열 [{token, role}])에서 특정 역할로 등록된 기기의 토큰만 골라낸다.
function tokensForRole(family, role) {
  const deviceRoles = Array.isArray(family.deviceRoles) ? family.deviceRoles : [];
  return deviceRoles.filter((d) => d.role === role).map((d) => d.token).filter(Boolean);
}

// 배열에서 무작위로 하나 고른다. 알림 문구를 매번 같은 문장이 아니라
// 여러 버전 중 랜덤하게 골라 보내서 "기록 누락 알림"보다 다정하게 느껴지도록 한다.
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 알림 종류별 문구 후보 — 놓친 걸 지적하기보다 응원하는 톤으로,
// 발송 기준이 되는 경과시간(t)을 문구 안에 자연스럽게 포함한다.
const HUNGER_MESSAGES = [
  (ga, name, t) => `${ga} 배가 출출할 시간이에요 🍼 마지막 맘마로부터 ${t} 지났어요, 맘마 준비해볼까요?`,
  (ga, name, t) => `슬슬 맘마 시간이 다가와요 🌿 ${name}한테 물어봐주세요, 배고프지 않은지! 마지막 맘마로부터 ${t} 지났어요.`,
  (ga, name, t) => `${ga} 기다리고 있을지도 몰라요 🍼 마지막 수유로부터 ${t} 지났어요.`,
  (ga, name, t) => `오늘도 잘 챙기고 계시죠? ${name} 맘마 시간이 됐어요 🌿 마지막 맘마로부터 ${t} 지났어요.`,
];
const FEED_TIMER_MESSAGES = [
  (ga, name, t) => `맘마 타이머가 ${t}째 진행 중이에요 🌿 다 드셨으면 타이머를 멈춰주세요.`,
  (ga, name, t) => `${name}랑 맘마 타임 ${t}째, 즐거우셨나요? 다 먹었다면 기록을 마무리해주세요 🍼`,
  (ga, name, t) => `맘마 타이머가 ${t}째 돌고 있어요 ⏱️ 끝났으면 살짝 종료 눌러주세요.`,
];
const SLEEP_TIMER_MESSAGES = [
  (ga, name, t) => `${ga} 쿨쿨 잘 자고 있나요? 🌙 잠든 지 ${t} 지났어요.`,
  (ga, name, t) => `포근한 잠 시간이었길 바라요 🌙 ${t} 지났는데, 일어났다면 기록해주세요.`,
  (ga, name, t) => `${name}의 소중한 잠, 잘 채워지고 있나요? ${t}째 자고 있어요 🌿`,
];
const DIAPER_MESSAGES = [
  (ga, name, t) => `${ga} 기저귀 상태 한번 살펴봐 줄까요? 🌿 마지막 교체로부터 ${t} 지났어요.`,
  (ga, name, t) => `뽀송뽀송하게, 기저귀 체크 타임이에요 🍃 마지막 교체로부터 ${t} 지났어요.`,
  (ga, name, t) => `${ga} 편안한지 기저귀 한번 확인해주세요 🌿 마지막 교체로부터 ${t} 지났어요.`,
];

// 한국 표준시(UTC+9, 서머타임 없음) 기준 "현재 몇 시"인지.
function kstHour(nowMs) {
  const kst = new Date(nowMs + 9 * 3600 * 1000);
  return kst.getUTCHours();
}

// 방해 금지 시간대 여부
function isQuietTime(settings, nowMs) {
  if (settings.quietDisabled) return false;
  const h = kstHour(nowMs);
  const s = Number(settings.quietStart);
  const e = Number(settings.quietEnd);
  if (s <= e) return h >= s && h < e;
  return h >= s || h < e; // 자정을 넘기는 경우 (예: 23~07)
}

// family.feeds/diapers/sleeps 배열에서 알림 판단에 필요한 값들을 뽑아낸다.
// (기존 클라이언트의 BodeumApp.js "Notify SW on db change" 로직과 동일)
function extractState(family) {
  const feeds = family.feeds || [];
  const diapers = family.diapers || [];
  const sleeps = family.sleeps || [];

  const endedFeeds = feeds
    .filter((f) => f.end)
    .sort((a, b) => (b.end || b.start || '').localeCompare(a.end || a.start || ''));
  const lastFeed = endedFeeds[0];
  const activeFeed = feeds.find((f) => f.start && !f.end);

  const sortedDiapers = [...diapers].sort((a, b) => (b.time > a.time ? 1 : -1));
  const lastDiaper = sortedDiapers[0];

  const activeSleep = sleeps.find((s) => s.start && !s.end);

  return {
    lastFeedTime: lastFeed ? lastFeed.end || lastFeed.start : null,
    activeFeedStart: activeFeed ? activeFeed.start : null,
    lastDiaperTime: lastDiaper ? lastDiaper.time : null,
    activeSleepStart: activeSleep ? activeSleep.start : null,
  };
}

// 판단된 알림들을 계산한다. 반환값: [{ key, title, body }]
function decideNotifications(family, state, nowMs) {
  const settings = { ...DEFAULT_SETTINGS, ...(family.notifSettings || {}) };
  const notifState = family.notifState || {};
  const name = getFirstName(family.babyName);
  const out = [];
  const nextState = {};

  if (isQuietTime(settings, nowMs)) {
    return { toSend: [], nextState: notifState };
  }

  // 1) 수유 경과(배고픔) 알림 — 조건을 만족하는 동안 설정된 간격으로 반복.
  // 단, 두 가지 안전장치를 둔다 — 반복 상한(HUNGER_MAX_REPEATS)과 24시간 sanity 체크.
  // 둘 다 없으면, 가족이 앱을 그만 쓴 뒤에도(젖 뗌·기기 교체 등) 예전 토큰이 fcmTokens에
  // 남아 있는 한 하루 최대 192번(5분 스케줄 기준)까지 "배고파요" 알림이 무한히 나갈 수 있었다.
  const HUNGER_MAX_REPEATS = 6;
  if (state.lastFeedTime && !state.activeFeedStart && settings.feedAlertH > 0) {
    const elapsed = nowMs - new Date(state.lastFeedTime).getTime();
    // 24시간 넘게 지난 수유는 "배고프다"가 아니라 "앱을 안 쓴다"는 뜻으로 보고 건너뛴다.
    if (elapsed >= settings.feedAlertH * HOUR && elapsed < 24 * HOUR) {
      const repeatMs = (settings.hungerRepeatMin > 0 ? settings.hungerRepeatMin : 5) * MIN;
      const prev = notifState.hunger;
      const keyChanged = !prev || prev.lastKey !== state.lastFeedTime;
      const repeatCount = keyChanged ? 0 : (prev.repeatCount || 0);
      const dueForRepeat = keyChanged || !prev.lastSentAt || nowMs - prev.lastSentAt >= repeatMs;
      if (dueForRepeat && repeatCount < HUNGER_MAX_REPEATS) {
        out.push({
          key: 'hunger',
          title: '보듬 🌿',
          body: pick(HUNGER_MESSAGES)(addGa(name), name, elapsedLabel(elapsed)),
        });
        nextState.hunger = { lastKey: state.lastFeedTime, lastSentAt: nowMs, repeatCount: repeatCount + 1 };
      } else {
        nextState.hunger = prev || { lastKey: state.lastFeedTime, repeatCount };
      }
    }
  }

  // 2) 수유 타이머 알림 — 타이머 시작 후 설정 시간(분), 1회만
  if (state.activeFeedStart && settings.feedTimerAlertMin > 0) {
    const elapsed = nowMs - new Date(state.activeFeedStart).getTime();
    if (elapsed >= settings.feedTimerAlertMin * MIN) {
      const prev = notifState.feedTimer;
      const alreadySent = prev && prev.lastKey === state.activeFeedStart && prev.sent;
      if (!alreadySent) {
        out.push({
          key: 'feedTimer',
          title: '보듬 🌿',
          body: pick(FEED_TIMER_MESSAGES)(addGa(name), name, elapsedLabel(elapsed)),
        });
        nextState.feedTimer = { lastKey: state.activeFeedStart, sent: true };
      } else {
        nextState.feedTimer = prev;
      }
    }
  }

  // 3) 수면 타이머 알림 — 타이머 시작 후 설정 시간, 1회만
  if (state.activeSleepStart && settings.sleepAlertH > 0) {
    const elapsed = nowMs - new Date(state.activeSleepStart).getTime();
    if (elapsed >= settings.sleepAlertH * HOUR) {
      const prev = notifState.sleepTimer;
      const alreadySent = prev && prev.lastKey === state.activeSleepStart && prev.sent;
      if (!alreadySent) {
        out.push({
          key: 'sleepTimer',
          title: '보듬 🌿',
          body: pick(SLEEP_TIMER_MESSAGES)(addGa(name), name, elapsedLabel(elapsed)),
        });
        nextState.sleepTimer = { lastKey: state.activeSleepStart, sent: true };
      } else {
        nextState.sleepTimer = prev;
      }
    }
  }

  // 4) 기저귀 경과 알림 — 마지막 교체 후 설정 시간, 1회만
  if (state.lastDiaperTime && settings.diaperAlertH > 0) {
    const elapsed = nowMs - new Date(state.lastDiaperTime).getTime();
    if (elapsed >= settings.diaperAlertH * HOUR) {
      const prev = notifState.diaper;
      const alreadySent = prev && prev.lastKey === state.lastDiaperTime && prev.sent;
      if (!alreadySent) {
        out.push({
          key: 'diaper',
          title: '보듬 🌿',
          body: pick(DIAPER_MESSAGES)(addGa(name), name, elapsedLabel(elapsed)),
        });
        nextState.diaper = { lastKey: state.lastDiaperTime, sent: true };
      } else {
        nextState.diaper = prev;
      }
    }
  }

  return { toSend: out, nextState: { ...notifState, ...nextState } };
}

async function sendToFamily(docSnap) {
  const family = docSnap.data() || {};
  const tokens = family.fcmTokens || [];

  const nowMs = Date.now();
  const state = extractState(family);
  const { toSend, nextState } = decideNotifications(family, state, nowMs);

  // "잘 부탁해 메모" 다시보기 예약 시간이 지난 게 있으면 다시 대기중 상태로 돌리고
  // (앱을 안 열어도 알 수 있게) 리마인더 푸시를 보낸다. 이 체크는 tokens가 비어 있어도
  // 문서 상태(handoffNotes)는 갱신해야 하므로, 아래 tokens.length 체크보다 먼저 계산해둔다.
  const handoffNotes = Array.isArray(family.handoffNotes) ? family.handoffNotes : [];
  const dueReminders = [];
  const updatedHandoffNotes = handoffNotes.map((n) => {
    if (n.status === 'snoozed' && n.snoozeUntil && n.snoozeUntil <= nowMs) {
      const flipped = { ...n, status: 'active', snoozeUntil: null };
      dueReminders.push(flipped);
      return flipped;
    }
    return n;
  });
  const handoffChanged = dueReminders.length > 0;

  if (!toSend.length && !handoffChanged) return;

  let invalidTokens = [];

  if (tokens.length) {
    for (const notif of toSend) {
      const res = await messaging.sendEachForMulticast({
        tokens,
        data: { title: notif.title, body: notif.body, tag: notif.key },
        webpush: { headers: { Urgency: 'high' } },
      });
      res.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidTokens.push(tokens[i]);
          } else {
            logger.warn(`[${docSnap.id}] FCM 발송 실패 (${notif.key}):`, code);
          }
        }
      });
    }

    // 다시보기 리마인더는 메모의 받는 역할(targetRole)로 등록된 기기에만 보낸다.
    // (메모를 남긴 본인 기기는 senderToken으로 한 번 더 안전하게 제외)
    for (const note of dueReminders) {
      const targetTokens = tokensForRole(family, note.targetRole).filter((t) => t !== note.senderToken);
      if (!targetTokens.length) continue;
      const res = await messaging.sendEachForMulticast({
        tokens: targetTokens,
        data: { title: '보듬 🌿', body: `⏰ "${note.text}" 잘 부탁해 메모, 다시 확인해주세요`, tag: 'handoffNote' },
        webpush: { headers: { Urgency: 'high' } },
      });
      res.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidTokens.push(targetTokens[i]);
          } else {
            logger.warn(`[${docSnap.id}] FCM 발송 실패 (handoffNote):`, code);
          }
        }
      });
    }
  }

  // 이전 알림 내역 — 설정 화면에서 "알림 내역"으로 확인할 수 있도록 최근 발송분을 저장해둔다.
  // 계속 쌓이면 문서가 무한정 커지므로 최근 MAX_LOG건만 유지한다.
  const MAX_LOG = 50;
  const prevLog = Array.isArray(family.notifLog) ? family.notifLog : [];
  const newLogEntries = toSend.map((n) => ({ key: n.key, title: n.title, body: n.body, sentAt: nowMs }));
  const update = {
    notifState: nextState,
    notifLog: [...prevLog, ...newLogEntries].slice(-MAX_LOG),
  };
  if (handoffChanged) {
    update.handoffNotes = updatedHandoffNotes;
  }
  if (invalidTokens.length) {
    update.fcmTokens = admin.firestore.FieldValue.arrayRemove(...invalidTokens);
  }
  await docSnap.ref.update(update);
  if (toSend.length) {
    logger.info(`[${docSnap.id}] 알림 ${toSend.length}건 발송: ${toSend.map((n) => n.key).join(', ')}`);
  }
  if (handoffChanged) {
    logger.info(`[${docSnap.id}] 잘 부탁해 메모 다시보기 리마인더 ${dueReminders.length}건 발송`);
  }
}

exports.checkNotifications = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3',
    // 가족 문서 전체를 한 번에 읽어서(필터 없음) Promise.all로 전부 동시에 처리하기 때문에,
    // 가족 수가 늘면 gen2 기본값(256 MiB/60초)으로는 메모리 초과(SIGKILL)로 죽어서
    // 그 사이클에 전 가족이 알림을 못 받는 문제가 있었다. 넉넉한 메모리·타임아웃으로 여유를 둔다.
    memory: '1GiB',
    timeoutSeconds: 540,
    // maxInstances:1이 중요하다 — 이게 없으면 이전 실행이 늦게 끝났을 때 다음 스케줄이 겹쳐 돌면서
    // 같은 가족에게 알림이 두 번씩 나갈 수 있다.
    maxInstances: 1,
  },
  async () => {
    const snap = await db.collection(COLLECTION).get();
    logger.info(`가족 문서 ${snap.size}개 확인 시작`);
    await Promise.all(snap.docs.map((d) => sendToFamily(d).catch((e) => logger.error(`[${d.id}] 처리 실패`, e))));
  }
);

// "잘 부탁해 메모"는 5분 주기 스케줄과 달리 "남기는 즉시" 상대방에게 도착해야 하므로,
// 가족 문서가 바뀔 때마다(onDocumentUpdated) 새 메모가 추가됐는지 확인해서 그 자리에서 바로 푸시를 보낸다.
// handoffNotes는 항상 최신 메모가 배열 맨 앞(index 0)에 온다 (lib/store.js addHandoffNote 참고).
exports.onHandoffNoteAdded = onDocumentUpdated(
  { document: `${COLLECTION}/{code}`, region: 'asia-northeast3' },
  async (event) => {
    const before = event.data.before.data() || {};
    const after = event.data.after.data() || {};
    const beforeNotes = Array.isArray(before.handoffNotes) ? before.handoffNotes : [];
    const afterNotes = Array.isArray(after.handoffNotes) ? after.handoffNotes : [];
    if (!afterNotes.length) return;

    const newest = afterNotes[0];
    const prevNewest = beforeNotes[0];
    // 새로 추가된 메모가 아니라 기존 메모의 상태만 바뀐 경우(확인함/다시보기)는 그냥 지나간다 —
    // 확인/다시보기는 상대방이 이미 앱을 열어 본 뒤라 즉시 푸시가 따로 필요 없다.
    if (prevNewest && prevNewest.id === newest.id) return;
    if (newest.status !== 'active') return;

    // 새 메모는 받는 역할(targetRole)로 등록된 기기에만 보낸다.
    // (메모를 남긴 본인 기기는 senderToken으로 한 번 더 안전하게 제외)
    const targetTokens = tokensForRole(after, newest.targetRole).filter((t) => t !== newest.senderToken);
    if (!targetTokens.length) return;

    const body = `${roleLabel(newest.authorRole)}가 잘 부탁해 메모를 남겼어요: "${newest.text}"`;
    try {
      const res = await messaging.sendEachForMulticast({
        tokens: targetTokens,
        data: { title: '보듬 🌿', body, tag: 'handoffNote' },
        webpush: { headers: { Urgency: 'high' } },
      });
      res.responses.forEach((r, i) => {
        if (!r.success) logger.warn(`[${event.params.code}] 잘 부탁해 메모 즉시 푸시 실패:`, r.error && r.error.code);
      });
    } catch (e) {
      logger.error(`[${event.params.code}] 잘 부탁해 메모 즉시 푸시 처리 실패`, e);
    }
  }
);
