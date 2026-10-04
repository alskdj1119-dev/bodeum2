'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import DateTimePicker from '../DateTimePicker';
import {
  kstDate, kstMidnightMs, kstMidnightMsFromDateStr, feedStartTime, feedEffectiveMl,
  sleepDurationMs, diaperWetCount, diaperSoiledCount,
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
    out.push([(cur - ds) / HOUR, (segEnd - ds) / HOUR, startMs < ds]); // 3번째: 그날 0시 이전에 시작돼 이어진 구간인지
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

  // ── 원형 시계용 구간 ──
  const sleepSegs = sleeps.filter(s => s.end).flatMap(s => toDaySegments(new Date(s.start).getTime(), new Date(s.end).getTime(), winStart, winEnd));
  const feedSegs = feeds.filter(f => f.end || f.time).flatMap(f => {
    const st = new Date(feedStartTime(f)).getTime();
    const en = f.end ? new Date(f.end).getTime() : st;
    const segs = toDaySegments(st, Math.max(en, st + MIN_FEED_H * HOUR), winStart, winEnd);
    return segs.map(([a, b]) => [a, Math.max(b, Math.min(24, a + MIN_FEED_H))]);
  });
  const diaperDots = diapers.filter(d => inWin(new Date(d.time).getTime())).map(d => (new Date(d.time).getTime() - dayStartOf(new Date(d.time).getTime())) / HOUR);

  const hasContinued = sleepSegs.some(seg => seg[2]);
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

        <div className="rpt-clockwrap">
          <svg width="176" height="176" viewBox="0 0 180 180" style={{ flex: 'none' }}>
            {[[R_DIAPER, 10], [R_SLEEP, 12], [R_FEED, 12]].map(([r, w]) => (
              <circle key={r} cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={w} />
            ))}
            {hourLabels.map(i => {
              const [x1, y1] = polar(i, R_DIAPER - 6), [x2, y2] = polar(i, R_FEED + 7);
              const major = i % 6 === 0;
              return <line key={'l' + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`rgba(255,255,255,${major ? 0.22 : 0.1})`} strokeWidth={major ? 0.8 : 0.5} />;
            })}
            {diaperDots.map((h, i) => {
              const [x, y] = polar(h, R_DIAPER);
              return <circle key={'d' + i} cx={x} cy={y} r="3.6" fill="#f0b673" opacity={dotOpacity} />;
            })}
            {sleepSegs.flatMap(([a, b, cont], i) => cont
              ? ringPaths(a, b, R_SLEEP).map((d, j) => (
                <path key={`s${i}-${j}`} d={d} fill="#9aa6f0" fillOpacity="0.28" stroke="#9aa6f0" strokeWidth="1.1"
                  strokeDasharray="2.2 2" strokeLinejoin="round" opacity={segOpacity} />
              ))
              : arcPaths(a, b, R_SLEEP).map((d, j) => (
                <path key={`s${i}-${j}`} d={d} fill="none" stroke="#9aa6f0" strokeWidth="12" strokeLinecap="round" opacity={segOpacity} />
              )))}
            {feedSegs.flatMap(([a, b], i) => arcPaths(a, b, R_FEED).map((d, j) => (
              <path key={`f${i}-${j}`} d={d} fill="none" stroke="#8fcbab" strokeWidth="12" strokeLinecap="round" opacity={segOpacity} />
            )))}
            {hourLabels.map(i => {
              const [x, y] = polar(i, 80);
              const major = i % 6 === 0;
              return (
                <text key={'t' + i} x={x} y={y + 2.6} textAnchor="middle" fill="#fff" opacity={major ? 0.6 : 0.4}
                  fontSize="7" fontWeight={major ? 700 : 500}>{i === 0 ? 24 : i}</text>
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
    </>
  );
}
