'use client';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import {
  durStr, fmt, elapsedStr, feedAmountMl, feedEffectiveMl, feedColor, diaperColor,
  diaperWetCount, diaperSoiledCount, sleepColor, sleepPeriod, dailyAvgStr,
  kstDate, kstMidnightMsFromDateStr, useNowTick,
  DIAPER_TYPE_LABEL as TD, FEED_TYPE_LABEL as TF,
} from '../../lib/helpers';
import { useApp } from '../../lib/store';
import HourBarChart from '../charts/HourBarChart';
import DayBarChart from '../charts/DayBarChart';

function dateLabel(ms) { const d = kstDate(ms); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; }

// records를 dayList(하루 시작 시각 배열, KST 자정 ms)에 맞춰 일자별로 묶는다.
// getMs: 레코드에서 기준 시각을 뽑는 함수, reduceDay: 그 날짜의 레코드 배열로 {value, ml?}을 만드는 함수.
function bucketByDay(records, dayList, getMs, reduceDay) {
  return dayList.map(dayStart => {
    const dayEnd = dayStart + 86400000;
    const dayRecs = records.filter(r => { const t = getMs(r); return t >= dayStart && t < dayEnd; });
    return { ms: dayStart, label: dateLabel(dayStart), ...reduceDay(dayRecs) };
  });
}

function StatBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ flex: 1, height: 6, background: 'var(--bdr)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 4, transition: 'width .5s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

// 값 문자열이 길어지면(예: "55시간 25분") 카드 폭을 벗어나지 않도록 폰트 크기를 단계적으로 줄인다.
// 줄바꿈은 하지 않고(요청사항) 한 줄 안에서 크기만 조정한다.
function valueFontSize(value) {
  const len = String(value).length;
  if (len <= 6) return 22;
  if (len <= 8) return 18;
  return 15;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', minWidth: 0, boxShadow: 'var(--sh-sm)' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: valueFontSize(value), fontWeight: 700, color: color, fontFamily: 'var(--serif)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, whiteSpace: 'nowrap' }}>{sub}</div>}
    </div>
  );
}

// 유형별 비율 위젯 — 기본은 횟수를 보여주고, 탭하면 전체가 ml(있는 항목만) 표시로 토글된다.
function RatioWidget({ title, items, showMl, onToggle, hasMl }) {
  const metricOf = (it) => (showMl ? (it.ml || 0) : it.count);
  const max = Math.max(...items.map(metricOf), 1);
  return (
    <div
      onClick={hasMl ? onToggle : undefined}
      style={{ background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, boxShadow: 'var(--sh-sm)', cursor: hasMl ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{title}</div>
        {hasMl && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{showMl ? '터치: 횟수 보기' : '터치: 총 ml 보기'}</div>}
      </div>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', width: 60, flexShrink: 0 }}>{item.label}</div>
          <StatBar value={metricOf(item)} max={max} color={item.color} />
          <div style={{ fontSize: 11, fontWeight: 600, color: item.color, width: 48, textAlign: 'right', whiteSpace: 'nowrap' }}>
            {showMl ? (item.ml || 0) + 'ml' : item.count + '회'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 수유 상세 ───
// dayList가 주어지면(기간이 하루를 넘는 경우) 일자별 그래프를, 아니면 기존 시간대별 그래프를 보여준다.
function FeedDetail({ records, onEdit, dayList }) {
  const totalMl = records.reduce((acc, f) => acc + feedEffectiveMl(f), 0);
  const count = records.length;
  const avgMl = count > 0 && totalMl > 0 ? Math.round(totalMl / count) : 0;
  const days = dayList && dayList.length > 0 ? dayList.length : 1;
  const mlList = records.map(f => feedEffectiveMl(f)).filter(v => v > 0);
  const minMl = mlList.length > 0 ? Math.round(Math.min(...mlList)) : 0;
  const maxMl = mlList.length > 0 ? Math.round(Math.max(...mlList)) : 0;
  const showDaily = dayList && dayList.length > 1;

  // 유형별(분유/모유-직수/모유-유축) 비율 — FeedPanel의 색상 체계(feedColor)와 동일한 색을 쓴다.
  const [showMl, setShowMl] = useState(false);
  const feedCats = [
    { label: '분유', color: 'var(--cd)', test: f => f.type === 'bottle' },
    { label: '모유(직수)', color: 'var(--cs)', test: f => f.type !== 'bottle' && f.subtype !== 'pumped' },
    { label: '모유(유축)', color: 'var(--cf)', test: f => f.type !== 'bottle' && f.subtype === 'pumped' },
  ].map(cat => {
    const recs = records.filter(cat.test);
    return { ...cat, count: recs.length, ml: Math.round(recs.reduce((a, f) => a + feedEffectiveMl(f), 0)) };
  });

  // 시간대별 바 차트 (24개 버킷) — 기간이 하루 이내일 때만 사용
  const hourBuckets = Array(24).fill(0);
  if (!showDaily) {
    records.forEach(f => {
      const h = kstDate(new Date(f.start || f.time).getTime()).getUTCHours();
      hourBuckets[h]++;
    });
  }

  // 일자별 버킷(횟수 + ml) — 기간이 하루를 넘을 때만 사용
  const dayBuckets = showDaily
    ? bucketByDay(records, dayList, f => new Date(f.start || f.time).getTime(), dayRecs => ({
        value: dayRecs.length,
        ml: Math.round(dayRecs.reduce((a, f) => a + feedEffectiveMl(f), 0)),
      }))
    : null;

  return (
    <>
      {/* 통계 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatCard label="총 섭취량" value={totalMl > 0 ? totalMl + 'ml' : count + '회'} sub={totalMl > 0 ? count + '회 수유' : '수유 횟수'} color="var(--cf)" />
        <StatCard label="수유 횟수" value={count + '회'} sub={dailyAvgStr(count, days)} color="var(--cf)" />
        {avgMl > 0 && <StatCard label="회당 평균" value={avgMl + 'ml'} sub={`최소 ${minMl}ml · 최대 ${maxMl}ml`} color="var(--cf)" />}
      </div>

      {/* 유형별 비율 */}
      {count > 0 && (
        <RatioWidget title="유형별 비율" items={feedCats} showMl={showMl} onToggle={() => setShowMl(v => !v)} hasMl={totalMl > 0} />
      )}

      {/* 시간대별/일자별 분포 */}
      {count > 0 && (
        <div style={{ background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, boxShadow: 'var(--sh-sm)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{showDaily ? '일자별 수유' : '시간대별 수유'}</div>
          {showDaily
            ? <DayBarChart days={dayBuckets} color="var(--cf)" formatTip={d => `${d.label}: ${d.value}회${d.ml > 0 ? ' · ' + d.ml + 'ml' : ''}`} />
            : <HourBarChart buckets={hourBuckets} color="var(--cf)" formatTip={(h, v) => `${h}시대: ${v}회`} />}
        </div>
      )}

      {/* 기록 목록 */}
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>수유 기록</div>
      {records.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>기록이 없어요</div>
      )}
      {[...records].sort((a, b) => new Date(b.start || b.time) - new Date(a.start || a.time)).map((f, i) => {
        const amt = feedAmountMl(f);
        const amtStr = f.consumedAmount != null && amt != null ? `준비 ${amt}ml / 섭취 ${f.consumedAmount}ml`
          : f.consumedAmount != null ? `섭취 ${f.consumedAmount}ml`
          : amt ? `${amt}ml` : '';
        let durMs = null;
        if (f.sideTimes) {
          durMs = Object.values(f.sideTimes).reduce((acc, t) => acc + (new Date(t.end) - new Date(t.start)), 0);
        } else if (f.start && f.end) {
          durMs = new Date(f.end) - new Date(f.start);
        }
        const durTxt = durMs ? ' · ' + durStr(durMs) : '';
        const fc = feedColor(f);
        return (
          <div key={f.id || i} className="ec" onClick={() => onEdit(f)} style={{ marginBottom: 8, background: fc.bg }}>
            <div className="edot" style={{ background: fc.dot }} />
            <div className="emain">
              <div className="epri">{TF[f.type] || f.type}{f.subtype === 'direct' ? ' (직수)' : f.subtype === 'pumped' ? ' (유축)' : ''}</div>
              <div className="esub">{amtStr}{durTxt}</div>
            </div>
            <div className="etime">{fmt(f.start || f.time)}<br /><span className="eago">{elapsedStr(f.start || f.time)}</span></div>
          </div>
        );
      })}
    </>
  );
}

// ─── 기저귀 상세 ───
function DiaperDetail({ records, onEdit, periodLabel, dayList }) {
  const wet = diaperWetCount(records);
  const soiled = diaperSoiledCount(records);
  const total = records.length;
  const days = dayList && dayList.length > 0 ? dayList.length : 1;
  const showDaily = dayList && dayList.length > 1;

  const hourBuckets = Array(24).fill(0);
  if (!showDaily) {
    records.forEach(d => { hourBuckets[kstDate(new Date(d.time).getTime()).getUTCHours()]++; });
  }
  const dayBuckets = showDaily
    ? bucketByDay(records, dayList, d => new Date(d.time).getTime(), dayRecs => ({ value: dayRecs.length }))
    : null;

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatCard label="총 횟수" value={total + '회'} sub={periodLabel} color="var(--cd)" />
        <StatCard label="소변" value={wet + '회'} sub={dailyAvgStr(wet, days)} color="var(--cd)" />
        <StatCard label="대변" value={soiled + '회'} sub={dailyAvgStr(soiled, days)} color="var(--cd)" />
      </div>

      {/* 유형별 비율 — 소변+대변(both) 기록은 소변·대변 양쪽 횟수에 각각 포함해서 계산 */}
      {total > 0 && (
        <div style={{ background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, boxShadow: 'var(--sh-sm)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>유형별 비율</div>
          {[{ label: '소변', count: wet, color: 'var(--cd-wet)' }, { label: '대변', count: soiled, color: 'var(--cd)' }].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', width: 60, flexShrink: 0 }}>{item.label}</div>
              <StatBar value={item.count} max={total} color={item.color} />
              <div style={{ fontSize: 11, fontWeight: 600, color: item.color, width: 24, textAlign: 'right' }}>{item.count}</div>
            </div>
          ))}

          {/* 시간대/일자 분포 */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{showDaily ? '일자별' : '시간대별'}</div>
            {showDaily
              ? <DayBarChart days={dayBuckets} color="var(--cd)" height={44} formatTip={d => `${d.label}: ${d.value}회`} />
              : <HourBarChart buckets={hourBuckets} color="var(--cd)" height={30} formatTip={(h, v) => `${h}시대: ${v}회`} />}
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>기저귀 기록</div>
      {records.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>기록이 없어요</div>
      )}
      {[...records].sort((a, b) => new Date(b.time) - new Date(a.time)).map((d, i) => {
        const dc = diaperColor(d.type);
        return (
          <div key={d.id || i} className="ec" onClick={() => onEdit(d)} style={{ marginBottom: 8, background: dc.bg }}>
            <div className="edot" style={{ background: dc.dot }} />
            <div className="emain">
              <div className="epri">{TD[d.type] || d.type}</div>
              {d.note && <div className="esub">{d.note}</div>}
            </div>
            <div className="etime">{fmt(d.time)}<br /><span className="eago">{elapsedStr(d.time)}</span></div>
          </div>
        );
      })}
    </>
  );
}

// ─── 수면 상세 ───
function SleepDetail({ records, onEdit, periodLabel, dayList }) {
  const totalMs = records.reduce((acc, s) => acc + (new Date(s.end) - new Date(s.start)), 0);
  const count = records.length;
  const avgMs = count > 0 ? Math.round(totalMs / count) : 0;
  const days = dayList && dayList.length > 0 ? dayList.length : 1;
  const showDaily = dayList && dayList.length > 1;

  const hourBuckets = Array(24).fill(0);
  if (!showDaily) {
    records.forEach(s => {
      const startH = kstDate(new Date(s.start).getTime()).getUTCHours();
      const endH = kstDate(new Date(s.end).getTime()).getUTCHours();
      for (let h = startH; h !== (endH + 1) % 24; h = (h + 1) % 24) {
        hourBuckets[h]++;
        if (h === endH) break;
      }
    });
  }
  // 일자별 낮잠(06-18시 시작)/밤잠(18-06시 시작) 구간별 시간을 나눠 쌓아 보여준다.
  const dayBuckets = showDaily
    ? bucketByDay(records, dayList, s => new Date(s.start).getTime(), dayRecs => {
        const napRecs = dayRecs.filter(s => sleepPeriod(s.start) === 'day');
        const nightRecs = dayRecs.filter(s => sleepPeriod(s.start) === 'night');
        const napHours = Math.round(napRecs.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0) / 3600000 * 10) / 10;
        const nightHours = Math.round(nightRecs.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0) / 3600000 * 10) / 10;
        return {
          value: Math.round((napHours + nightHours) * 10) / 10,
          count: dayRecs.length,
          napHours, nightHours,
          segments: [{ value: napHours, color: 'var(--cs-day)' }, { value: nightHours, color: 'var(--cs-night)' }],
        };
      })
    : null;

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatCard label="총 수면" value={totalMs > 0 ? durStr(totalMs) : '0분'} sub={count + '회 수면'} color="var(--cs)" />
        <StatCard label="수면 횟수" value={count + '회'} sub={dailyAvgStr(count, days)} color="var(--cs)" />
        {avgMs > 0 && <StatCard label="평균 수면" value={durStr(avgMs)} sub="회당 평균" color="var(--cs)" />}
      </div>

      {count > 0 && (
        <div style={{ background: 'var(--surf2)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, boxShadow: 'var(--sh-sm)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{showDaily ? '일자별 수면' : '시간대별 수면'}</div>
          {showDaily
            ? <DayBarChart days={dayBuckets} color="var(--cs)" formatTip={d => `${d.label}: 낮잠 ${d.napHours}시간 · 밤잠 ${d.nightHours}시간 (${d.count}회)`} />
            : <HourBarChart buckets={hourBuckets} color="var(--cs)" formatTip={(h, v) => v > 0 ? `${h}시대: 수면 중` : `${h}시대: 깨어있음`} />}
          {showDaily && (
            <div style={{ display: 'flex', gap: 14, marginTop: 8, justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--cs-day)', display: 'inline-block' }} />낮잠
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--cs-night)', display: 'inline-block' }} />밤잠
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>수면 기록</div>
      {records.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>기록이 없어요</div>
      )}
      {[...records].sort((a, b) => new Date(b.start) - new Date(a.start)).map((s, i) => {
        const sc = sleepColor(s.start);
        return (
          <div key={s.id || i} className="ec" onClick={() => onEdit(s)} style={{ marginBottom: 8, background: sc.bg }}>
            <div className="edot" style={{ background: sc.dot }} />
            <div className="emain">
              <div className="epri">{durStr(new Date(s.end) - new Date(s.start))}</div>
              <div className="esub">{fmt(s.start)} — {fmt(s.end)}</div>
            </div>
            <div className="etime">{fmt(s.start)}<br /><span className="eago">{elapsedStr(s.start)}</span></div>
          </div>
        );
      })}
    </>
  );
}

// ─── 메인 모달 ───
// initialDate("YYYY-MM-DD", KST 기준)가 주어지면 그 날짜의 "당일" 모드로 열리고,
// 없으면 "직전 24시간" 모드로 열린다. 안에서 두 모드를 토글로 바꿀 수 있다.
//
// records(배열)가 주어지면 "기간 모드"로 동작한다 — 통계 화면(StatsPanel)에서 카드를 눌러
// 열 때 쓰는 방식으로, 직전24시간/당일 토글 없이 이미 필터링된 기록을 그대로 보여준다.
// 이때 dayList(하루 시작 시각 배열)가 함께 주어지면, 기간이 하루를 넘는 경우 시간대별
// 그래프 대신 일자별 그래프를 보여준다(하루짜리 기간이면 기존처럼 시간대별 유지).
export default function Home24hModal({ type, initialDate, initialMode, records: recordsProp, dayList, rangeLabel, onClose }) {
  const { db, setOpenModal, setEditId, setEditType } = useApp();
  const { feeds, diapers, sleeps } = db;
  const isRangeMode = Array.isArray(recordsProp);
  const dayOnly = !isRangeMode && !!initialDate; // 요일 스트립에서 특정 날짜를 눌러 열린 경우 — "당일" 고정, 토글 불필요
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(isRangeMode ? 'range' : (dayOnly ? 'day' : (initialMode || 'recent24h')));
  const [selectedDate, setSelectedDate] = useState(() => initialDate || kstDate(Date.now()).toISOString().slice(0, 10));
  useNowTick(); // 목록의 "OO분 전" 경과시간이 시간이 지나도 갱신되도록

  useEffect(() => {
    // 슬라이드 업 애니메이션
    requestAnimationFrame(() => setOpen(true));
    return () => {};
  }, []);

  const h24 = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const feed24 = feeds.filter(f => (now - new Date(f.start || f.time).getTime()) <= h24);
  const diaper24 = diapers.filter(d => (now - new Date(d.time).getTime()) <= h24);
  const sleep24 = sleeps.filter(s => s.end && (now - new Date(s.start).getTime()) <= h24);

  // "당일"(선택한 날짜 00:00~23:59, KST) 필터
  const [, dm, dd] = selectedDate.split('-').map(Number);
  const dayStartMs = kstMidnightMsFromDateStr(selectedDate);
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const feedDay = feeds.filter(f => { const t = new Date(f.start || f.time).getTime(); return t >= dayStartMs && t < dayEndMs; });
  const diaperDay = diapers.filter(d => { const t = new Date(d.time).getTime(); return t >= dayStartMs && t < dayEndMs; });
  const sleepDay = sleeps.filter(s => s.end && (() => { const t = new Date(s.start).getTime(); return t >= dayStartMs && t < dayEndMs; })());

  const feedRecords = isRangeMode ? (recordsProp || []) : (mode === 'day' ? feedDay : feed24);
  const diaperRecords = isRangeMode ? (recordsProp || []) : (mode === 'day' ? diaperDay : diaper24);
  const sleepRecords = isRangeMode ? (recordsProp || []) : (mode === 'day' ? sleepDay : sleep24);

  const dateLabelStr = `${dm}월 ${dd}일(${['일','월','화','수','목','금','토'][kstDate(dayStartMs).getUTCDay()]})`;

  const titles = { feed: '수유', diaper: '기저귀', sleep: '수면' };
  const colors = { feed: 'var(--cf)', diaper: 'var(--cd)', sleep: 'var(--cs)' };

  function handleClose() {
    setOpen(false);
    setTimeout(onClose, 220);
  }

  function editFeed(f) {
    setEditId(f.id);
    setEditType('feeds');
    setOpenModal('feed');
    handleClose();
  }
  function editDiaper(d) {
    setEditId(d.id);
    setEditType('diapers');
    setOpenModal('diaper');
    handleClose();
  }
  function editSleep(s) {
    setEditId(s.id);
    setEditType('sleeps');
    setOpenModal('sleep');
    handleClose();
  }

  return createPortal(
    <div
      className={`mbg${open ? ' open' : ''}`}
      style={{ display: 'flex' }}
    >
      <div
        className="msheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(105%)',
          transition: 'transform .28s cubic-bezier(.32,1,.32,1)',
        }}
      >
        {/* 핸들 + 제목 */}
        <div className="mhandle" />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px 14px', borderBottom: '1px solid var(--bdr)' }}>
          <div style={{ fontSize: 19, fontWeight: 700, fontFamily: 'var(--serif)', color: colors[type] }}>
            {isRangeMode ? `${rangeLabel} ${titles[type]}` : mode === 'day' ? `${dateLabelStr} ${titles[type]}` : `직전 24시간 ${titles[type]}`}
          </div>
          <button
            onClick={handleClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, lineHeight: 1 }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 직전 24시간 / 당일 토글 — 요일 날짜를 눌러 "당일" 고정으로 연 경우나 기간 모드(통계 카드)는 불필요하므로 숨김 */}
        {!dayOnly && !isRangeMode && (
          <div className="modetoggle" style={{ padding: '12px 20px 0' }}>
            <button
              className={`modetoggle-btn${mode === 'day' ? ' on' : ''}`}
              onClick={() => { setSelectedDate(kstDate(Date.now()).toISOString().slice(0, 10)); setMode('day'); }}
              style={mode === 'day' ? { background: colors[type], borderColor: colors[type] } : undefined}
            >
              당일{mode === 'day' ? ` · ${dm}월 ${dd}일` : ''}
            </button>
            <button
              className={`modetoggle-btn${mode === 'recent24h' ? ' on' : ''}`}
              onClick={() => setMode('recent24h')}
              style={mode === 'recent24h' ? { background: colors[type], borderColor: colors[type] } : undefined}
            >
              직전 24시간
            </button>
          </div>
        )}

        {/* 내용 스크롤 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px', WebkitOverflowScrolling: 'touch' }}>
          {type === 'feed' && <FeedDetail records={feedRecords} onEdit={editFeed} dayList={isRangeMode ? dayList : null} />}
          {type === 'diaper' && <DiaperDetail records={diaperRecords} onEdit={editDiaper} periodLabel={isRangeMode ? rangeLabel : (mode === 'day' ? '당일' : '직전 24시간')} dayList={isRangeMode ? dayList : null} />}
          {type === 'sleep' && <SleepDetail records={sleepRecords} onEdit={editSleep} periodLabel={isRangeMode ? rangeLabel : (mode === 'day' ? '당일' : '직전 24시간')} dayList={isRangeMode ? dayList : null} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
