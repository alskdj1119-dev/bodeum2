// ── 공통 유틸리티 함수들 ──
import { useState, useEffect } from 'react';

// "OO분 전"/"방금" 같은 경과시간 텍스트(elapsedStr/agoStr)는 렌더링되는 순간의
// Date.now()로만 계산되기 때문에, 화면이 다시 그려질 이유(새 데이터 등)가 없으면
// 시간이 아무리 지나도 값이 갱신되지 않고 얼어붙는 문제가 있었다.
// 이 훅을 컴포넌트 안에서 호출해두면(반환값은 쓰지 않아도 됨) intervalMs마다
// 컴포넌트를 강제로 다시 그려서, 안에서 계산하는 elapsedStr/agoStr 값이 항상 최신으로 유지된다.
export function useNowTick(intervalMs = 30000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

// 여러 화면(FeedPanel, DiaperPanel, SleepPanel, HomePanel, Home24hModal, TrashPanel,
// HealthPanel)에서 동일하게 반복되던 타입→라벨 매핑을 한 곳으로 모음.
// (side에 'both'가 빠져 "양쪽"이 표시 안 되던 것도 여기서 함께 수정)
export const FEED_TYPE_LABEL = { breast: '모유', bottle: '분유' };
export const FEED_SUBTYPE_LABEL = { direct: '직수', pumped: '유축' };
export const FEED_SIDE_LABEL = { left: '왼쪽', right: '오른쪽', both: '양쪽' };
export const DIAPER_TYPE_LABEL = { wet: '소변', soiled: '대변', both: '소변+대변' };
export const DIAPER_COLOR_LABEL = { yellow: '노란색', brown: '갈색', green: '녹색', black: '검정색', red: '빨간색', white: '하얀색', other: '기타' };
export const DIAPER_CONSISTENCY_LABEL = { loose: '묽음', normal: '보통', hard: '딱딱', diarrhea: '설사' };
export const SLEEP_PLACE_LABEL = { crib: '침대', arms: '품', cushion: '원형쿠션' };
export const SOLID_REACTION_LABEL = { good: '잘 먹음', neutral: '보통', refused: '거부', allergy: '알레르기 의심' };
export const TEMP_METHOD_LABEL = { ear: '귀', armpit: '겨드랑이', forehead: '이마', rectal: '항문' };

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// 앱의 모든 날짜 입력/표시 기준은 "보는 사람의 기기 시간대"가 아니라
// 항상 한국(KST, UTC+9, 서머타임 없음) 기준으로 고정한다 — 가족 구성원이
// 서로 다른 시간대의 기기를 쓰더라도 같은 날짜/시간으로 보이도록 하기 위함.
export const KST_OFFSET_MS = 9 * 60 * 60000;

// 임의의 시각(ms epoch)을 "UTC getter로 읽으면 한국 시각 값이 나오는" Date로 변환.
// (실제로는 UTC+9시간 shift된 Date이지만, getUTCHours() 등을 한국 시각처럼 쓸 수 있음)
export function kstDate(ms) {
  return new Date(ms + KST_OFFSET_MS);
}

export function nowISO() {
  return kstDate(Date.now()).toISOString().slice(0, 16);
}

// Convert any ISO timestamp to datetime-local format (YYYY-MM-DDTHH:mm) in KST
export function toLocal(iso) {
  if (!iso) return '';
  return kstDate(new Date(iso).getTime()).toISOString().slice(0, 16);
}

// Convert datetime-local string (YYYY-MM-DDTHH:mm) — 항상 "한국 시각"으로 입력된
// 값으로 해석 — back to full ISO UTC string
export function fromLocal(localDT) {
  if (!localDT) return '';
  const [datePart, timePart] = localDT.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = (timePart || '0:0').split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi || 0) - KST_OFFSET_MS).toISOString();
}

export function p2(n) { return n < 10 ? '0' + n : '' + n; }

export function fmt(iso) {
  if (!iso) return '';
  const d = kstDate(new Date(iso).getTime());
  return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes());
}

export function fmtFull(iso) {
  if (!iso) return '';
  const d = kstDate(new Date(iso).getTime());
  return d.getUTCFullYear() + '년 ' + p2(d.getUTCMonth()+1) + '월 ' + p2(d.getUTCDate()) + '일 ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes());
}

export function elapsedStr(iso) {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  const hh = Math.floor(min / 60), mm = min % 60;
  if (hh === 0) return mm + '분 전';
  return hh + '시간 ' + mm + '분 전';
}

export function agoStr(iso) {
  if (!iso) return '—';
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (min < 1) return '방금 전';
  if (min < 60) return Math.floor(min) + '분 전';
  const hh = Math.floor(min / 60), mm = Math.floor(min % 60);
  if (hh < 24) return mm ? hh + '시간 ' + mm + '분 전' : hh + '시간 전';
  return Math.floor(hh / 24) + '일 전';
}

export function durStr(ms) {
  const ts = Math.floor(ms / 1000);
  const h = Math.floor(ts / 3600), m = Math.floor((ts % 3600) / 60), s = ts % 60;
  if (h > 0) return m ? h + '시간 ' + m + '분' : h + '시간';
  if (m > 0) return s ? m + '분 ' + s + '초' : m + '분';
  return s + '초';
}

export function dayLabel(iso) {
  const d = kstDate(new Date(iso).getTime());
  const t = kstDate(Date.now());
  const y = kstDate(Date.now() - 86400000);
  const key = x => x.getUTCFullYear() + '-' + x.getUTCMonth() + '-' + x.getUTCDate();
  if (key(d) === key(t)) return '오늘';
  if (key(d) === key(y)) return '어제';
  return (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일';
}

export function groupByDay(arr, getter) {
  const map = [], keys = [];
  arr.forEach(x => {
    const k = dayLabel(getter(x)), idx = keys.indexOf(k);
    if (idx < 0) { keys.push(k); map.push([k, [x]]); }
    else map[idx][1].push(x);
  });
  return map;
}

// 직수(직접 수유) 1분당 예상 섭취량(ml). 기본값은 "15분 = 40ml" 기준이며,
// 설정 화면에서 사용자가 직접 바꿀 수 있다 (store.js가 앱 로드/동기화 시점에
// setDirectFeedRate()로 이 값을 갱신한다). 여러 화면(helpers.js를 쓰는 모든 곳)이
// 매번 rate를 파라미터로 넘기지 않고 이 모듈 전역값을 공유해서 쓰도록 한다.
let directFeedRateMlPerMin = 40 / 15;

export function setDirectFeedRate(mlPerMin) {
  if (typeof mlPerMin === 'number' && mlPerMin > 0) directFeedRateMlPerMin = mlPerMin;
}

export function getDirectFeedRate() {
  return directFeedRateMlPerMin;
}

export function directFeedMlFromMs(ms) {
  if (!ms || ms <= 0) return 0;
  return Math.round((ms / 60000) * directFeedRateMlPerMin);
}

export function directFeedMl(startIso, endIso) {
  if (!startIso || !endIso) return null;
  return directFeedMlFromMs(new Date(endIso) - new Date(startIso));
}

// 직수 기록의 총 소요시간(ms) — 양쪽을 나눠 진행한 기록(sideTimes)이면 두 구간을 합산하고,
// 그렇지 않은(예전 방식) 기록이면 start~end 하나로 계산한다.
// "기록 다시 계산" 화면에서, 저장된 amount와 무관하게 순수 소요시간만 다시 뽑아낼 때 쓴다.
export function directFeedDurationMs(f) {
  if (f.sideTimes && Object.keys(f.sideTimes).length > 0) {
    return Object.values(f.sideTimes).reduce(
      (acc, t) => acc + (new Date(t.end) - new Date(t.start)), 0
    );
  }
  if (f.start && f.end) return new Date(f.end) - new Date(f.start);
  return 0;
}

// 수유 기록의 "표시용" 준비량(ml) 계산.
// amount가 직접 입력돼 있으면 그 값을 쓰고, 직수(모유+직수) 기록이면서
// 시작/종료 시간이 모두 있으면 소요 시간으로부터 추정한다.
// (HomePanel/FeedPanel/StatsPanel/Home24hModal에서 각각 따로 구현돼 있던 로직을 통합)
export function feedAmountMl(f) {
  if (f.amount != null) return f.amount;
  if (f.type === 'breast' && f.subtype === 'direct' && f.start && f.end) {
    return directFeedMl(f.start, f.end);
  }
  return null;
}

// 통계 합산 등에 쓰는 "실제 섭취량" — consumedAmount가 있으면 우선하고,
// 없으면 위 feedAmountMl() 추정치를 쓴다.
export function feedEffectiveMl(f) {
  const amt = feedAmountMl(f);
  return f.consumedAmount != null ? f.consumedAmount : (amt || 0);
}

// 체중 기록을 날짜별로 묶어 최근 N일치 포인트 배열로 만든다 (같은 날 여러 번 쟀으면 마지막 값 사용).
// 홈 화면 체중 카드의 증가율 그래프와 건강 탭의 체중 추이 그래프가 공통으로 사용한다.
export function weightDailyPoints(weights, days = 14) {
  const asc = [...weights].sort((a, b) => new Date(a.time) - new Date(b.time));
  const byDay = {};
  asc.forEach(w => { byDay[toLocal(w.time).slice(0, 10)] = w.kg; });
  const sortedDays = Object.keys(byDay).sort().slice(-days);
  return sortedDays.map(d => ({
    date: d,
    label: d.slice(5, 7) + '/' + d.slice(8, 10),
    kg: byDay[d],
  }));
}

// 연속된 날짜 포인트 사이의 증가량(g)을 계산 — points.length - 1개가 나온다.
export function weightGains(points) {
  return points.slice(1).map((p, i) => Math.round((p.kg - points[i].kg) * 1000));
}

// 최근 n개 증가량의 평균 (반올림). 데이터가 없으면 null.
export function avgRecentGain(gains, n = 7) {
  const last = gains.slice(-n);
  if (!last.length) return null;
  return Math.round(last.reduce((s, g) => s + g, 0) / last.length);
}

export function generateFamilyCode() {
  const words = ['ROSE','LILY','FERN','MINT','OAK','DAWN','DEW','NEST','LEAF','BEAM'];
  const nums = Math.floor(1000 + Math.random() * 9000);
  return words[Math.floor(Math.random() * words.length)] + '-' + nums;
}

export function timerStr(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return p2(h) + ':' + p2(m) + ':' + p2(sec);
  return p2(m) + ':' + p2(sec);
}

// "직전" 카드(수유/기저귀)의 경과시간별 색상 단계 기준 (분 단위).
// 설정 > 카드 색상 설정에서 사용자가 바꿀 수 있고, 기본값은 1시간/2시간/3시간.
let elapsedTierMinutes = { caution: 60, warn: 120, alert: 180 };

export function setElapsedTierMinutes(v) {
  if (!v) return;
  const caution = Number(v.cautionMin);
  const warn = Number(v.warnMin);
  const alert = Number(v.alertMin);
  elapsedTierMinutes = {
    caution: caution > 0 ? caution : elapsedTierMinutes.caution,
    warn: warn > 0 ? warn : elapsedTierMinutes.warn,
    alert: alert > 0 ? alert : elapsedTierMinutes.alert,
  };
}

export function getElapsedTierMinutes() {
  return elapsedTierMinutes;
}

// 경과 시간(iso 시각 기준)에 따른 색상 단계 반환: null(기본) | 'caution' | 'warn' | 'alert'
export function elapsedTier(iso) {
  if (!iso) return null;
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  const t = elapsedTierMinutes;
  if (mins >= t.alert) return 'alert';
  if (mins >= t.warn) return 'warn';
  if (mins >= t.caution) return 'caution';
  return null;
}
