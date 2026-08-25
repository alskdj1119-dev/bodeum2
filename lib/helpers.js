// ── 공통 유틸리티 함수들 ──

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
