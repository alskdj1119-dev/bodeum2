'use client';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../lib/store';
import DateTimePicker from '../DateTimePicker';
import {
  kstDate, kstMidnightMs, kstMidnightMsFromDateStr, feedStartTime, feedEffectiveMl,
  sleepDurationMs, diaperWetCount, diaperSoiledCount, groupFeedsForDisplay,
  feedAmountMl, sleepPeriod, FEED_SIDE_LABEL, DIAPER_TYPE_LABEL, DIAPER_COLOR_LABEL, DIAPER_CONSISTENCY_LABEL,
} from '../../lib/helpers';

// 트래킹 > 일일 리포트 — 선택한 날짜(하루 또는 7일)의 수유·수면·기저귀를 한 장의 카드로 보여준다.
// 원형 시계: 안쪽부터 기저귀(점) → 수면(호) → 수유(호). 하루는 그대로, 7일은 하루 시계 위에 겹쳐 그려
// 진할수록 같은 시간대에 자주 반복된 패턴으로 읽히게 한다.
// 모든 날짜 경계는 앱 전체와 동일하게 한국 시간(KST) 자정 기준.

const DAY = 86400000;
const HOUR = 3600000;
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const CX = 90, CY = 90, R_DIAPER = 27, R_SLEEP = 45, R_FEED = 63;
const MIN_FEED_H = 0.25; // 시계에서 너무 짧아 안 보이는 수유 기록은 최소 15분 길이로 그린다

function dayStartOf(ms) {
  const k = kstDate(ms);
  return kstMidnightMs(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
}

// [startMs, endMs]를 조회 구간으로 자르고, KST 자정마다 쪼개 "그날 0~24시" 기준 [시작시, 끝시, 전날부터 이어짐 여부] 배열로 변환.
function toDaySegments(startMs, endMs, winStart, winEnd) {
  const a0 = Math.max(startMs, winStart), b0 = Math.min(endMs, winEnd);
  if (!(b0 > a0)) return [];
  const out = [];
  let cur = a0;
  while (cur < b0) {
    const ds = dayStartOf(cur);
    const de = ds + DAY;
    const segEnd = Math.min(b0, de);
    out.push([(cur - ds) / HOUR, (segEnd - ds) / HOUR, startMs < ds, ds]); // 3번째: 그날 0시 이전에 시작돼 이어진 구간인지
    cur = segEnd;
  }
  return out;
}

function polar(h, R) {
  const a = (h / 24 * 360 - 90) * Math.PI / 180;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
}

// 호 경로. 12시간을 넘으면 둘로 나눠 large-arc 플래그 문제(반원 이상/한 바퀴)를 피한다.
function arcPaths(h1, h2, R) {
  const parts = [];
  let s = h1;
  while (s < h2 - 1e-6) {
    const e = Math.min(h2, s + 12);
    const [x1, y1] = polar(s, R), [x2, y2] = polar(e, R);
    parts.push(`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`);
    s = e;
  }
  return parts;
}

// 수면 "전날부터 이어진 구간" 표시용 — 두께가 있는 호를 닫힌 도형으로 그려서 점선 테두리 + 연한 채움을 줄 수 있게 한다.
function ringPaths(h1, h2, R, half = 6) {
  const parts = [];
  let s = h1;
  while (s < h2 - 1e-6) {
    const e = Math.min(h2, s + 12);
    const [ox1, oy1] = polar(s, R + half), [ox2, oy2] = polar(e, R + half);
    const [ix1, iy1] = polar(s, R - half), [ix2, iy2] = polar(e, R - half);
    parts.push(
      `M ${ox1.toFixed(2)} ${oy1.toFixed(2)} A ${R + half} ${R + half} 0 0 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)} ` +
      `L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${R - half} ${R - half} 0 0 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`
    );
    s = e;
  }
  return parts;
}

function fmtDur(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}시간 ${r}분` : `${h}시간`;
}
function fmtMl(n) { return Math.round(n).toLocaleString('ko-KR') + 'ml'; }
function avg1(n) { return (Math.round(n * 10) / 10).toString(); }

function md(ms) { const k = kstDate(ms); return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`; }
function mdw(ms) { const k = kstDate(ms); return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 (${WD[k.getUTCDay()]})`; }
function ymdw(ms) { const k = kstDate(ms); return `${k.getUTCFullYear()}년 ${mdw(ms)}`; }


// ── 기록 상세 카드(원형 시계의 기록에 마우스를 올리거나 터치하면 뜨는 카드)용 ──
const pad2 = (n) => String(n).padStart(2, '0');
function fmtT(ms) {
  const k = kstDate(ms), h = k.getUTCHours(), m = k.getUTCMinutes();
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${pad2(m)}`;
}
function fmtRange(a, b) {
  if (dayStartOf(a) === dayStartOf(b)) return `${fmtT(a)} – ${fmtT(b)}`;
  return `${md(a)} ${fmtT(a)} – ${md(b)} ${fmtT(b)}`;
}
const CLUSTER_GAP_MS = 30 * 60000; // 기저귀가 30분 안에 연달아 기록되면 시계에서 하나의 점(개수 배지)으로 묶는다
const KIND_STYLE = {
  f: { ico: '🍼', bg: 'rgba(143,203,171,.28)', color: '#8fcbab' },
  s: { ico: '🌙', bg: 'rgba(154,166,240,.3)', color: '#9aa6f0' },
  d: { ico: '💧', bg: 'rgba(240,182,115,.32)', color: '#f0b673' },
};

function feedMemberLabel(m) {
  if (m.type === 'bottle') return '분유';
  if (m.subtype === 'pumped') return '유축';
  return m.side ? `직수 (${FEED_SIDE_LABEL[m.side] || m.side})` : '직수';
}
function feedMemberMl(m) {
  const ml = feedEffectiveMl(m);
  if (!ml) return '';
  const estimated = m.type === 'breast' && m.subtype === 'direct' && m.amount == null && m.consumedAmount == null && feedAmountMl(m) != null;
  return `${estimated ? '약 ' : ''}${fmtMl(ml)}`;
}

function Spark({ vals, color, isWeek }) {
  const max = Math.max(...vals), min = Math.min(...vals);
  const span = Math.max(max - min, max * 0.2, 0.0001);
  return (
    <div className="rpt-spark">
      {vals.map((v, i) => (
        <div key={i} className={`rpt-spark-bar${(isWeek || i === vals.length - 1) ? ' on' : ''}`}
          style={{ height: `${28 + ((v - min) / span) * 72}%`, background: color }} />
      ))}
    </div>
  );
}

export default function DailyReportPanel() {
  const { db, baby, filterByActiveBaby } = useApp();
  const feeds = filterByActiveBaby(db.feeds || []);
  const sleeps = filterByActiveBaby(db.sleeps || []);
  const diapers = filterByActiveBaby(db.diapers || []);

  const todayStr = kstDate(Date.now()).toISOString().slice(0, 10);
  const [mode, setMode] = useState('day'); // 'day' | 'week'
  const [dateStr, setDateStr] = useState(todayStr);
  const selStr = dateStr || todayStr;

  const endDayStart = kstMidnightMsFromDateStr(selStr);
  const spanDays = mode === 'week' ? 7 : 1;
  const winStart = endDayStart - (spanDays - 1) * DAY;
  const winEnd = endDayStart + DAY;
  const isWeek = mode === 'week';

  // ── 기간 안의 기록 (집계 기준은 앱 홈/통계와 동일: 시작 시각이 기간 안에 있는 기록) ──
  const inWin = (ms) => ms >= winStart && ms < winEnd;
  const feedsIn = feeds.filter(f => f.end || f.time).filter(f => inWin(new Date(feedStartTime(f)).getTime()));
  const feedCount = feedsIn.filter(f => !f.groupId).length; // 묶음(직수+보충)은 1회
  const feedMl = feedsIn.reduce((a, f) => a + feedEffectiveMl(f), 0);
  // 평균 수유 간격(수유텀) — 묶음은 1회로 보고, 기간 안 수유 "시작 시각"끼리의 간격을 평균낸다.
  // (7일 모드는 밤사이 간격도 포함해서 하루 전체의 실제 텀을 반영. 2회 미만이면 계산 불가)
  const feedStartsMs = feedsIn.filter(f => !f.groupId).map(f => new Date(feedStartTime(f)).getTime()).sort((a, b) => a - b);
  const feedGapMs = feedStartsMs.length >= 2 ? (feedStartsMs[feedStartsMs.length - 1] - feedStartsMs[0]) / (feedStartsMs.length - 1) : null;
  const gapText = feedGapMs != null ? ` · 평균 수유간격 ${fmtDur(feedGapMs)}` : '';
  const sleepsIn = sleeps.filter(s => s.end).filter(s => inWin(new Date(s.start).getTime()));
  const sleepMs = sleepsIn.reduce((a, s) => a + sleepDurationMs(s), 0);
  const diapersIn = diapers.filter(d => inWin(new Date(d.time).getTime()));
  const wet = diaperWetCount(diapersIn), soiled = diaperSoiledCount(diapersIn);
  const total = feedCount + sleepsIn.length + diapersIn.length;

  // 7일 평균은 "기록을 시작한 날"부터만 나눈다 (첫 기록 이전 날짜까지 포함하면 평균이 깎임).
  const allStarts = [
    ...feeds.map(f => new Date(feedStartTime(f) || 0).getTime()),
    ...sleeps.map(s => new Date(s.start || 0).getTime()),
    ...diapers.map(d => new Date(d.time || 0).getTime()),
  ].filter(t => t > 0);
  const firstDay = allStarts.length ? dayStartOf(Math.min(...allStarts)) : winStart;
  const effDays = Math.max(1, Math.min(spanDays, Math.round((winEnd - Math.max(winStart, firstDay)) / DAY)));

  // ── 원형 시계의 "기록 단위" — 마우스를 올리거나 터치하면 이 단위로 상세 카드가 뜬다 ──
  //  · 수유: 직수+보충수유처럼 묶인 기록은 하나의 호(+개수 배지)로
  //  · 수면: 기록 하나(자정을 넘기면 구간이 둘로 나뉘어 그려지지만 카드는 같은 기록 정보)
  //  · 기저귀: 30분 안에 연달아 기록된 건 하나의 점(+개수 배지)으로 묶어서 겹쳐 눌리지 않게
  const feedGroups = groupFeedsForDisplay(feeds.filter(f => f.end || f.time)).map(g => {
    const members = g.isGroup ? g.members : [g.feed];
    const st = new Date(feedStartTime(members[0])).getTime();
    const en = Math.max(...members.map(m => (m.end ? new Date(m.end).getTime() : new Date(feedStartTime(m)).getTime())));
    return { id: g.id, members, st, en: Math.max(en, st) };
  }).sort((x, y) => x.st - y.st);
  const feedMarks = feedGroups.flatMap(g => toDaySegments(g.st, Math.max(g.en, g.st + MIN_FEED_H * HOUR), winStart, winEnd)
    .map(([a, b], si) => ({ key: `f${g.id}:${si}`, kind: 'f', a, b: Math.max(b, Math.min(24, a + MIN_FEED_H)), g, badge: g.members.length > 1 ? g.members.length : 0 })));
  const sleepMarks = sleeps.filter(s => s.end).flatMap(s => {
    const st = new Date(s.start).getTime(), en = new Date(s.end).getTime();
    return toDaySegments(st, en, winStart, winEnd).map(([a, b, cont, ds], si) => ({ key: `s${s.id}:${si}`, kind: 's', a, b, cont, ds, s, st, en }));
  });
  const diapersSorted = diapers.map(d => ({ d, ms: new Date(d.time).getTime() })).filter(x => inWin(x.ms)).sort((x, y) => x.ms - y.ms);
  const diaperClusters = [];
  diapersSorted.forEach(x => {
    const last = diaperClusters[diaperClusters.length - 1];
    if (last && dayStartOf(x.ms) === dayStartOf(last[0].ms) && x.ms - last[last.length - 1].ms <= CLUSTER_GAP_MS) last.push(x);
    else diaperClusters.push([x]);
  });
  const diaperMarks = diaperClusters.map((cl, i) => ({ key: `d${i}`, kind: 'd', cl, hours: cl.map(x => (x.ms - dayStartOf(x.ms)) / HOUR) }));
  const hasContinued = sleepMarks.some(m => m.cont);
  const segOpacity = isWeek ? 0.4 : 1;
  const dotOpacity = isWeek ? 0.7 : 1;

  // ── 최근 7일 일별 추이 (하루 모드: 선택한 날이 맨 오른쪽 / 7일 모드: 조회 기간 그대로) ──
  const sparkStart = endDayStart - 6 * DAY;
  const daily = Array.from({ length: 7 }, (_, i) => {
    const ds = sparkStart + i * DAY, de = ds + DAY;
    const within = (ms) => ms >= ds && ms < de;
    return {
      feed: feeds.filter(f => (f.end || f.time) && !f.groupId && within(new Date(feedStartTime(f)).getTime())).length,
      sleepH: sleeps.filter(s => s.end && within(new Date(s.start).getTime())).reduce((a, s) => a + sleepDurationMs(s), 0) / HOUR,
      diaper: diapers.filter(d => within(new Date(d.time).getTime())).length,
    };
  });

  // ── 문구 (하루 / 7일) ──
  const babyName = (baby && baby.name) || '우리 아기';
  const periodText = isWeek ? `${md(winStart)} – ${md(endDayStart)} (7일)` : ymdw(endDayStart);
  const hlText = isWeek
    ? `7일간 하루 평균 ${avg1(total / effDays)}건 · 수유 ${feedCount} · 수면 ${sleepsIn.length} · 기저귀 ${diapersIn.length}`
    : `수유 ${feedCount} · 수면 ${sleepsIn.length} · 기저귀 ${diapersIn.length}`;
  const clockTitle = isWeek ? '7일 겹쳐보기' : '하루 패턴';
  const clockSub = isWeek ? `${md(winStart)} – ${md(endDayStart)}` : mdw(endDayStart);
  const clockHint = isWeek ? '진할수록 같은 시간대에 자주 반복됐어요' : '';

  const feedTitle = `수유 ${isWeek ? '총 ' : ''}${feedCount}회`;
  const feedSub = isWeek
    ? `총 ${fmtMl(feedMl)} · 하루 평균 ${avg1(feedCount / effDays)}회, ${fmtMl(feedMl / effDays)}${gapText}`
    : `총 수유량 ${fmtMl(feedMl)}${gapText}`;
  const sleepTitle = `수면 ${isWeek ? '총 ' : ''}${sleepsIn.length}회`;
  const sleepSub = isWeek
    ? `총 ${fmtDur(sleepMs)} · 하루 평균 ${fmtDur(sleepMs / effDays)}`
    : `총 ${fmtDur(sleepMs)}`;
  const diaperTitle = `기저귀 ${isWeek ? '총 ' : ''}${diapersIn.length}회`;
  const diaperSub = isWeek
    ? `소변 ${wet} · 대변 ${soiled} · 하루 평균 ${avg1(diapersIn.length / effDays)}회`
    : `소변 ${wet} · 대변 ${soiled}`;
  const footText = isWeek ? '일별 추이 (왼쪽이 가장 오래된 날)' : '최근 7일 추이 (오른쪽 끝이 선택한 날)';


  // ── 기록 상세 카드: 열림 상태 / 위치 ──
  //  PC: 마우스를 올리는 동안만 / 터치: 탭하면 열린 채 유지, 다른 기록을 탭하면 그 기록으로 교체, 빈 곳을 탭하면 닫힘.
  //  카드가 열리면 시계 영역만 남기고 화면 전체(헤더·하단 메뉴 포함)를 어둡게 덮는다.
  const [active, setActive] = useState(null); // { mark, x, y, pin }
  const [tipPos, setTipPos] = useState(null);
  const wrapRef = useRef(null);
  const tipRef = useRef(null);

  function openMark(mark, x, y, pin) {
    setActive(prev => (prev && prev.mark.key === mark.key && prev.pin === pin ? { ...prev, x, y } : { mark, x, y, pin }));
  }
  function pointFromEvent(e) {
    if (e && typeof e.clientX === 'number' && (e.clientX || e.clientY)) return [e.clientX, e.clientY];
    const r = e.currentTarget.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }
  function markHandlers(mark) {
    return {
      onPointerEnter: (e) => { if (e.pointerType === 'mouse') { const [x, y] = pointFromEvent(e); openMark(mark, x, y, false); } },
      onPointerLeave: (e) => { if (e.pointerType === 'mouse') setActive(prev => (prev && !prev.pin && prev.mark.key === mark.key ? null : prev)); },
      onClick: (e) => { const [x, y] = pointFromEvent(e); openMark(mark, x, y, e.nativeEvent.pointerType !== 'mouse'); },
      onFocus: (e) => { const [x, y] = pointFromEvent({ currentTarget: e.currentTarget }); openMark(mark, x, y, true); },
    };
  }

  useEffect(() => {
    if (!active) return undefined;
    const close = () => setActive(null);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);
  // 날짜·모드가 바뀌면 카드는 닫는다
  useEffect(() => { setActive(null); }, [selStr, mode]);

  useLayoutEffect(() => {
    if (!active || !tipRef.current || !wrapRef.current) { setTipPos(null); return; }
    const W = window.innerWidth, H = window.innerHeight;
    const w = tipRef.current.offsetWidth, h = tipRef.current.offsetHeight, M = 8;
    const left = Math.max(M, Math.min(W - w - M, active.x - w / 2));
    const up = active.y - h - 16 >= M;
    const top = up ? active.y - h - 16 : Math.min(active.y + 20, H - h - M);
    const r = wrapRef.current.getBoundingClientRect();
    setTipPos({ key: active.mark.key, left, top, up, cx: Math.max(16, Math.min(w - 16, active.x - left)), hole: { x: r.left, y: r.top, w: r.width, h: r.height } });
  }, [active]);

  function buildTip(mark) {
    const st = KIND_STYLE[mark.kind];
    const rows = [], items = [];
    let title = '', sub = '', tag = '';
    if (mark.kind === 'f') {
      const g = mark.g, n = g.members.length, span = g.en - g.st;
      if (isWeek) rows.push(['날짜', mdw(g.st)]);
      if (n > 1) {
        title = '수유 묶음';
        sub = `${g.members.map(feedMemberLabel).join(' + ')} · ${n}건`;
        g.members.forEach(m => {
          const ms = new Date(feedStartTime(m)).getTime(), me = m.end ? new Date(m.end).getTime() : ms;
          items.push({ n: feedMemberLabel(m), t: me > ms ? fmtRange(ms, me) : fmtT(ms), v: feedMemberMl(m) });
        });
        const total = g.members.reduce((acc, m) => acc + feedEffectiveMl(m), 0);
        rows.push(['합계', `${total ? fmtMl(total) + ' · ' : ''}${fmtDur(span)}`]);
        tag = '하나의 수유로 묶인 기록';
      } else {
        const m = g.members[0];
        title = feedMemberLabel(m);
        sub = `${fmtT(g.st)} 시작`;
        rows.push(['시간', span > 0 ? fmtRange(g.st, g.en) : fmtT(g.st)]);
        if (span > 0) rows.push(['소요', fmtDur(span)]);
        const ml = feedMemberMl(m);
        if (ml) rows.push(['수유량', ml]);
      }
      if (!isWeek) {
        const inDay = feedGroups.filter(x => inWin(x.st));
        const idx = inDay.findIndex(x => x.id === g.id);
        if (idx >= 0) rows.push(['수유 순서', `${idx + 1}번째 / 총 ${inDay.length}회`]);
      }
      const gi = feedGroups.findIndex(x => x.id === g.id);
      const prev = gi > 0 ? feedGroups[gi - 1] : null;
      if (prev && g.st - prev.en > 0 && g.st - prev.en < DAY) rows.push(['이전 수유와', `${fmtDur(g.st - prev.en)} 간격`]);
    } else if (mark.kind === 's') {
      const { s, st: a, en: b, cont, ds } = mark;
      const dur = sleepDurationMs(s);
      title = sleepPeriod(s.start) === 'day' ? '낮잠' : '밤잠';
      if (isWeek) rows.push(['날짜', mdw(Math.max(a, ds))]);
      if (cont) {
        sub = '전날부터 이어진 수면';
        rows.push(['시작', `${md(a)} ${fmtT(a)}`]);
        rows.push(['종료', `${dayStartOf(b) !== ds ? md(b) + ' ' : ''}${fmtT(b)}`]);
        rows.push(['총 수면', fmtDur(dur)]);
        tag = '전날 밤에 시작';
      } else {
        sub = `${fmtT(a)} 시작`;
        rows.push(['시간', fmtRange(a, b)]);
        rows.push(['수면 시간', fmtDur(dur)]);
        if (b > ds + DAY) tag = '자정을 넘겨 이어져요';
      }
    } else {
      const cl = mark.cl;
      const extra = (d) => [d.color && DIAPER_COLOR_LABEL[d.color], d.consistency && DIAPER_CONSISTENCY_LABEL[d.consistency], d.rash && '발진'].filter(Boolean).join(' · ');
      if (isWeek) rows.push(['날짜', mdw(cl[0].ms)]);
      if (cl.length > 1) {
        title = `기저귀 ${cl.length}건`;
        sub = `${fmtT(cl[0].ms)} – ${fmtT(cl[cl.length - 1].ms)} 사이`;
        cl.forEach(x => items.push({ n: DIAPER_TYPE_LABEL[x.d.type] || '기저귀', t: fmtT(x.ms), v: extra(x.d) }));
        rows.push(['합계', `소변 ${diaperWetCount(cl.map(x => x.d))} · 대변 ${diaperSoiledCount(cl.map(x => x.d))}`]);
        tag = '짧은 시간에 여러 번 기록됨';
      } else {
        const x = cl[0], label = DIAPER_TYPE_LABEL[x.d.type] || '기저귀';
        title = `${label} 기저귀`;
        sub = fmtT(x.ms);
        rows.push(['시간', fmtT(x.ms)], ['종류', label]);
        const ex = extra(x.d);
        if (ex) rows.push(['상태', ex]);
        if (!isWeek) rows.push(['오늘 순서', `${diapersSorted.findIndex(y => y.d.id === x.d.id) + 1}번째 / 총 ${diapersSorted.length}회`]);
      }
    }
    return { st, title, sub, rows, items, tag };
  }
  const tip = active ? buildTip(active.mark) : null;
  const tipShown = !!(tip && tipPos && tipPos.key === active.mark.key);
  const holePath = (tipShown && typeof window !== 'undefined') ? (() => {
    const { x, y, w, h } = tipPos.hole, r = 20, W = window.innerWidth, H = window.innerHeight;
    return `path(evenodd, "M0 0H${W}V${H}H0Z M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z")`;
  })() : undefined;

  const hourLabels = Array.from({ length: 24 }, (_, i) => i);

  return (
    <>
      <h2 className="daytitle" style={{ fontSize: 22, marginBottom: 16 }}>일일 리포트</h2>

      <div className="modetoggle" style={{ marginBottom: 12 }}>
        <button className={`modetoggle-btn${!isWeek ? ' on' : ''}`} onClick={() => setMode('day')}
          style={!isWeek ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}>하루</button>
        <button className={`modetoggle-btn${isWeek ? ' on' : ''}`} onClick={() => setMode('week')}
          style={isWeek ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}>7일</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <DateTimePicker mode="date" className="dtp-btn-raised" maxDate={todayStr} value={selStr} onChange={(v) => setDateStr(v || todayStr)} />
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, paddingLeft: 4 }}>
          {isWeek ? '선택한 날짜까지 포함한 7일을 보여줘요' : '선택한 날짜 하루를 보여줘요'}
        </div>
      </div>

      <div className="rpt-card">
        <div className="rpt-top">
          <div>
            <div className="rpt-baby">{babyName}의 {isWeek ? '한 주' : '하루'}</div>
            <div className="rpt-period">{periodText}</div>
          </div>
          <div className="rpt-logo">보듬이</div>
        </div>

        <div className="rpt-head">
          <div className="rpt-head-num">{total}<span> 건 기록</span></div>
          <div className="rpt-head-lbl">{total === 0 ? '이 기간에는 기록이 없어요' : hlText}</div>
        </div>

        <div className={`rpt-clockwrap${active ? ' focus' : ''}`} ref={wrapRef}>
          <svg width="176" height="176" viewBox="0 0 180 180" className={`rpt-clock${active ? ' has-active' : ''}`} style={{ flex: 'none' }}>
            {[[R_DIAPER, 10], [R_SLEEP, 12], [R_FEED, 12]].map(([r, w]) => (
              <circle key={r} cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={w} />
            ))}
            {hourLabels.map(i => {
              const [x1, y1] = polar(i, R_DIAPER - 6), [x2, y2] = polar(i, R_FEED + 7);
              const major = i % 6 === 0;
              return <line key={'l' + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`rgba(255,255,255,${major ? 0.22 : 0.1})`} strokeWidth={major ? 0.8 : 0.5} />;
            })}
            {diaperMarks.map(m => {
              const mid = polar(m.hours.reduce((p, h) => p + h, 0) / m.hours.length, R_DIAPER);
              const multi = m.cl.length > 1;
              const bp = polar(m.hours.reduce((p, h) => p + h, 0) / m.hours.length, R_DIAPER - 12);
              return (
                <g key={m.key} className={`rpt-mark${active && active.mark.key === m.key ? ' active' : ''}`} tabIndex={0} role="button"
                  aria-label={multi ? `기저귀 ${m.cl.length}건` : '기저귀 기록'} {...markHandlers(m)}>
                  <g className="vis" opacity={dotOpacity}>
                    {m.hours.map((h, i) => { const [x, y] = polar(h, R_DIAPER); return <circle key={i} cx={x} cy={y} r={multi ? 3.2 : 3.6} fill="#f0b673" stroke={multi ? '#232b25' : 'none'} strokeWidth="1" />; })}
                    {multi && <>
                      <circle cx={bp[0]} cy={bp[1]} r="5" fill="#f0b673" />
                      <text x={bp[0]} y={bp[1] + 2.4} textAnchor="middle" fontSize="6.8" fontWeight="800" fill="#2a1d0c" style={{ pointerEvents: 'none' }}>{m.cl.length}</text>
                    </>}
                  </g>
                  <circle cx={mid[0]} cy={mid[1]} r={multi ? 11 : 9} fill="transparent" />
                </g>
              );
            })}
            {sleepMarks.map(m => {
              const paths = m.cont ? ringPaths(m.a, m.b, R_SLEEP) : arcPaths(m.a, m.b, R_SLEEP);
              const hit = arcPaths(m.a, m.b, R_SLEEP);
              return (
                <g key={m.key} className={`rpt-mark${active && active.mark.key === m.key ? ' active' : ''}`} tabIndex={0} role="button"
                  aria-label={m.cont ? '전날부터 이어진 수면' : '수면 기록'} {...markHandlers(m)}>
                  <g className="vis" opacity={segOpacity}>
                    {paths.map((d, j) => m.cont
                      ? <path key={j} d={d} fill="#9aa6f0" fillOpacity="0.28" stroke="#9aa6f0" strokeWidth="1.1" strokeDasharray="2.2 2" strokeLinejoin="round" />
                      : <path key={j} d={d} fill="none" stroke="#9aa6f0" strokeWidth="12" strokeLinecap="round" />)}
                  </g>
                  {hit.map((d, j) => <path key={'h' + j} d={d} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" />)}
                </g>
              );
            })}
            {feedMarks.map(m => {
              const paths = arcPaths(m.a, m.b, R_FEED);
              const bp = polar((m.a + m.b) / 2, R_FEED + 12);
              return (
                <g key={m.key} className={`rpt-mark${active && active.mark.key === m.key ? ' active' : ''}`} tabIndex={0} role="button"
                  aria-label={m.badge ? `수유 묶음 ${m.badge}건` : '수유 기록'} {...markHandlers(m)}>
                  <g className="vis" opacity={segOpacity}>
                    {paths.map((d, j) => <path key={j} d={d} fill="none" stroke="#8fcbab" strokeWidth="12" strokeLinecap="round" />)}
                    {m.badge > 0 && <>
                      <circle cx={bp[0]} cy={bp[1]} r="4.2" fill="#8fcbab" />
                      <text x={bp[0]} y={bp[1] + 2.2} textAnchor="middle" fontSize="6.2" fontWeight="800" fill="#10261a" style={{ pointerEvents: 'none' }}>{m.badge}</text>
                    </>}
                  </g>
                  {paths.map((d, j) => <path key={'h' + j} d={d} fill="none" stroke="transparent" strokeWidth="22" strokeLinecap="round" />)}
                </g>
              );
            })}
            {hourLabels.map(i => {
              const [x, y] = polar(i, 80);
              const major = i % 6 === 0;
              return (
                <text key={'t' + i} x={x} y={y + 2.6} textAnchor="middle" fill="#fff" opacity={major ? 0.6 : 0.4}
                  fontSize="7" fontWeight={major ? 700 : 500} style={{ pointerEvents: 'none' }}>{i === 0 ? 24 : i}</text>
              );
            })}
          </svg>
          <div>
            <div className="rpt-clock-lbl">{clockTitle}</div>
            <div className="rpt-clock-date">{clockSub}</div>
            <div className="rpt-legend">
              <div><span className="rpt-dot" style={{ background: '#f0b673' }} />기저귀</div>
              <div><span className="rpt-bar" style={{ background: '#9aa6f0' }} />수면</div>
              {hasContinued && <div><span className="rpt-bar rpt-bar-cont" />전날부터 이어진 수면</div>}
              <div><span className="rpt-bar" style={{ background: '#8fcbab' }} />수유</div>
            </div>
            {clockHint && <div className="rpt-hint">{clockHint}</div>}
            <div className="rpt-hint">기록을 누르면 자세히 볼 수 있어요</div>
          </div>
        </div>

        <div className="rpt-rows">
          <div className="rpt-row">
            <div className="rpt-ico" style={{ background: 'rgba(143,203,171,.16)', color: '#8fcbab' }}>🍼</div>
            <div className="rpt-mid"><div className="rpt-title">{feedTitle}</div><div className="rpt-sub">{feedSub}</div></div>
            <Spark vals={daily.map(d => d.feed)} color="#8fcbab" isWeek={isWeek} />
          </div>
          <div className="rpt-row">
            <div className="rpt-ico" style={{ background: 'rgba(154,166,240,.16)', color: '#9aa6f0' }}>🌙</div>
            <div className="rpt-mid"><div className="rpt-title">{sleepTitle}</div><div className="rpt-sub">{sleepSub}</div></div>
            <Spark vals={daily.map(d => d.sleepH)} color="#9aa6f0" isWeek={isWeek} />
          </div>
          <div className="rpt-row">
            <div className="rpt-ico" style={{ background: 'rgba(240,182,115,.16)', color: '#f0b673' }}>💧</div>
            <div className="rpt-mid"><div className="rpt-title">{diaperTitle}</div><div className="rpt-sub">{diaperSub}</div></div>
            <Spark vals={daily.map(d => d.diaper)} color="#f0b673" isWeek={isWeek} />
          </div>
        </div>

        <div className="rpt-foot"><span>{footText}</span><span>bodeum.app</span></div>
      </div>

      {active && typeof document !== 'undefined' && createPortal(
        <>
          <div className={`rpt-scrim${active.pin ? ' pin' : ''}`} style={holePath ? { clipPath: holePath, WebkitClipPath: holePath } : undefined}
            onPointerDown={() => setActive(null)} />
          <div ref={tipRef} className={`rpt-tip${tipShown ? ' show' : ''}${tipPos && tipPos.up ? ' up' : ' down'}`}
            style={{ left: tipPos ? tipPos.left : 0, top: tipPos ? tipPos.top : 0, '--cx': (tipPos ? tipPos.cx : 16) + 'px', '--tc': tip.st.color }}
            role="tooltip">
            <div className="rpt-tip-hd">
              <div className="rpt-tip-ico" style={{ background: tip.st.bg }}>{tip.st.ico}</div>
              <div><div className="rpt-tip-title">{tip.title}</div><div className="rpt-tip-sub">{tip.sub}</div></div>
            </div>
            {tip.items.map((it, i) => (
              <div key={i} className="rpt-tip-item">
                <div className="rpt-tip-item-n">{it.n}</div>
                <div className="rpt-tip-item-t">{it.t}{it.v ? <> · <b>{it.v}</b></> : null}</div>
              </div>
            ))}
            {tip.rows.map(([k, v], i) => (
              <div key={i} className="rpt-tip-row"><span>{k}</span><span>{v}</span></div>
            ))}
            {tip.tag && <span className="rpt-tip-tag" style={{ background: tip.st.bg }}>{tip.tag}</span>}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
