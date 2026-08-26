// ── 공통 유틸리티 함수들 ──

// 여러 화면(FeedPanel, DiaperPanel, SleepPanel, HomePanel, Home24hModal, TrashPanel,
// HealthPanel)에서 동일하게 반복되던 타입→라벨 매핑을 한 곳으로 모음.
// (side에 'both'가 빠져 "양쪽"이 표시 안 되던 것도 여기서 함께 수정)
export const FEED_TYPE_LABEL = { breast: '모유', bottle: '분유' };
export const FEED_SUBTYPE_LABEL = { direct: '직수', pumped: '유축' };
export const FEED_SIDE_LABEL = { left: '왼쪽', right: '오른쪽', both: '양쪽' };
export const DIAPER_TYPE_LABEL = { wet: '소변', soiled: '대변', both: '소변+대변' };
export const DIAPER_COLOR_LABEL = { yellow: '노란색', green: '녹색', other: '기타' };
export const SLEEP_PLACE_LABEL = { crib: '침대', arms: '품', cushion: '원형쿠션' };
export const TEMP_METHOD_LABEL = { ear: '귀', armpit: '겨드랑이', forehead: '이마', rectal: '항문' };

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export function nowISO() {
  const d = new Date(), off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// Convert any ISO timestamp to datetime-local format (YYYY-MM-DDTHH:mm) in local time
export function toLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso), off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// Convert datetime-local string (YYYY-MM-DDTHH:mm) back to full ISO UTC string
export function fromLocal(localDT) {
  if (!localDT) return '';
  return new Date(localDT).toISOString();
}

export function p2(n) { return n < 10 ? '0' + n : '' + n; }

export function fmt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return p2(d.getHours()) + ':' + p2(d.getMinutes());
}

export function fmtFull(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.getFullYear() + '년 ' + p2(d.getMonth()+1) + '월 ' + p2(d.getDate()) + '일 ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
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
  const d = new Date(iso), t = new Date(), y = new Date(t);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return '오늘';
  if (d.toDateString() === y.toDateString()) return '어제';
  return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
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

export function directFeedMl(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso) - new Date(startIso);
  return Math.round(Math.round(ms / 10000) * 50 / 90);
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
