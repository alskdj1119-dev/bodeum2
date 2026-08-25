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
  quietStart: 23,
  quietEnd: 7,
  quietDisabled: false,
};

const HOUR = 3600 * 1000;
const REPEAT_MS = 5 * 60 * 1000; // 배고픔 알림 반복 간격 (5분)
const FEED_TIMER_MS = 30 * 60 * 1000; // 수유 타이머 알림 기준 (30분 경과)

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
function elapsedLabel(ms) {
  const totalMin = Math.floor(ms / 60000);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return (hh > 0 ? hh + '시간' : '') + mm + '분';
}

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

  // 1) 수유 경과(배고픔) 알림 — 조건을 만족하는 동안 5분마다 반복
  if (state.lastFeedTime && !state.activeFeedStart && settings.feedAlertH > 0) {
    const elapsed = nowMs - new Date(state.lastFeedTime).getTime();
    if (elapsed >= settings.feedAlertH * HOUR) {
      const prev = notifState.hunger;
      const keyChanged = !prev || prev.lastKey !== state.lastFeedTime;
      const dueForRepeat = keyChanged || !prev.lastSentAt || nowMs - prev.lastSentAt >= REPEAT_MS;
      if (dueForRepeat) {
        out.push({
          key: 'hunger',
          title: '보듬 🌿',
          body: `${addGa(name)} 배고플 시간, 맘마 준비해주세요.\n마지막 맘마로부터 ${elapsedLabel(elapsed)} 지났어요.`,
        });
        nextState.hunger = { lastKey: state.lastFeedTime, lastSentAt: nowMs };
      } else {
        nextState.hunger = prev;
      }
    }
  }

  // 2) 수유 타이머 알림 — 타이머 시작 후 30분, 1회만
  if (state.activeFeedStart) {
    const elapsed = nowMs - new Date(state.activeFeedStart).getTime();
    if (elapsed >= FEED_TIMER_MS) {
      const prev = notifState.feedTimer;
      const alreadySent = prev && prev.lastKey === state.activeFeedStart && prev.sent;
      if (!alreadySent) {
        out.push({
          key: 'feedTimer',
          title: '보듬 🌿',
          body: '아직 맘마 중인가요? 맘마 다 먹었으면 타이머 종료해주세요.',
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
          body: `${addGa(name)} 잠든 지 ${settings.sleepAlertH}시간이 지났어요. 일어났나요?`,
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
          body: `기저귀 교체한 지 ${settings.diaperAlertH}시간이 지났어요. 확인해주세요.`,
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
  if (!tokens.length) return;

  const nowMs = Date.now();
  const state = extractState(family);
  const { toSend, nextState } = decideNotifications(family, state, nowMs);

  if (!toSend.length) return;

  let invalidTokens = [];
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

  const update = { notifState: nextState };
  if (invalidTokens.length) {
    update.fcmTokens = admin.firestore.FieldValue.arrayRemove(...invalidTokens);
  }
  await docSnap.ref.update(update);
  logger.info(`[${docSnap.id}] 알림 ${toSend.length}건 발송: ${toSend.map((n) => n.key).join(', ')}`);
}

exports.checkNotifications = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3',
  },
  async () => {
    const snap = await db.collection(COLLECTION).get();
    logger.info(`가족 문서 ${snap.size}개 확인 시작`);
    await Promise.all(snap.docs.map((d) => sendToFamily(d).catch((e) => logger.error(`[${d.id}] 처리 실패`, e))));
  }
);
