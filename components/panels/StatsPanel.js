'use client';
import { useState } from 'react';
import { useApp } from '../../lib/store';
import DateTimePicker from '../DateTimePicker';
import Home24hModal from '../modals/Home24hModal';
import { durStr, feedEffectiveMl, diaperWetCount, diaperSoiledCount, kstDate, kstTodayStartMs, kstMidnightMsFromDateStr } from '../../lib/helpers';

// ──────────── 날짜 범위 헬퍼 (한국 시간 00:00~23:59 기준) ────────────
// anchorMs("기준일 자정")로부터 offsetDays만큼 떨어진 하루의 범위를 계산한다.
// 기본 모드에서는 anchorMs가 "오늘"이고, 기간 선택 모드에서는 선택한 기간의 마지막 날이 anchorMs가 된다.
function dayRangeAt(anchorMs, offsetDays) {
  const start = anchorMs + offsetDays * 86400000;
  return { start, end: start + 86400000 - 1 };
}

function inDayAt(isoTime, anchorMs, offsetDays) {
  const t = new Date(isoTime).getTime();
  const { start, end } = dayRangeAt(anchorMs, offsetDays);
  return t >= start && t <= end;
}

// 낮잠(06-22) vs 밤잠(22-06) — 한국 시각 기준
function isNight(isoTime) {
  const h = kstDate(new Date(isoTime).getTime()).getUTCHours();
  return h >= 22 || h < 6;
}

// 수유 간격 평균
function avgIntervalMin(feedList) {
  const sorted = [...feedList]
    .filter(f => f.end)
    .sort((a, b) => new Date(a.start || a.time) - new Date(b.start || b.time));
  if (sorted.length < 2) return null;
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += new Date(sorted[i].start || sorted[i].time) - new Date(sorted[i-1].start || sorted[i-1].time);
  }
  return Math.round(total / (sorted.length - 1) / 60000);
}

function totalMl(list) {
  return list.reduce((acc, f) => acc + feedEffectiveMl(f), 0);
}

function fmtMin(m) {
  if (!m) return '—';
  const h = Math.floor(m / 60), mn = m % 60;
  return h > 0 ? `${h}시간 ${mn}분` : `${mn}분`;
}

// 기준일(anchorMs)을 마지막 날로 하는 n일치 "한국 자정" ms 타임스탬프 배열
function lastNDaysAt(anchorMs, n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(anchorMs - i * 86400000);
  }
  return days;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function dayLabel(ms) { return DAY_LABELS[kstDate(ms).getUTCDay()]; }
function dateLabel(ms) { const d = kstDate(ms); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; }

// 기간 선택 시 하루 단위 막대가 너무 많아지지 않도록 최대 30일로 제한
const MAX_RANGE_DAYS = 30;

// ──────────── 막대 차트 (수유 전용 — 횟수 + ml 표시) ────────────
function FeedBar({ label, count, ml, maxCount, color }) {
  const pct = maxCount > 0 ? Math.min(100, (count / maxCount) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ width: 28, fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 10, background: 'var(--bdr)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 5, transition: 'width .4s' }} />
      </div>
      <div style={{ minWidth: 64, fontSize: 10, color: 'var(--ink)', textAlign: 'right', flexShrink: 0 }}>
        {count}회{ml > 0 ? ` · ${ml}ml` : ''}
      </div>
    </div>
  );
}

// ──────────── 막대 차트 (일반) ────────────
function MiniBar({ label, value, max, color, unit = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ width: 28, fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 10, background: 'var(--bdr)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 5, transition: 'width .4s' }} />
      </div>
      <div style={{ width: 48, fontSize: 11, color: 'var(--ink)', textAlign: 'right', flexShrink: 0 }}>
        {value}{unit}
      </div>
    </div>
  );
}

// 섹션 제목 줄 — 오른쪽에 "카드를 누르면 전체 기록을 볼 수 있다"는 힌트를 통일해서 붙인다.
function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
      <p className="seclbl" style={{ marginBottom: 0 }}>{children}</p>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>전체 기록 ›</span>
    </div>
  );
}

// 통계 카드 상단의 N칸짜리 숫자 요약 행 (오늘/어제/N일평균 또는 합계/평균)
function StatRow({ items, color }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: items.map(() => '1fr').join(' '), gap: 0, textAlign: 'center', marginBottom: 12 }}>
      {items.map((s, i) => (
        <div key={i} style={{ borderRight: i < items.length - 1 ? '1px solid var(--bdr)' : 'none', padding: '0 8px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--serif)' }}>
            {s.count != null ? s.count : '—'}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginLeft: 3 }}>회</span>
          </div>
          {s.ml !== null && s.ml !== undefined && <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 2 }}>{s.ml > 0 ? s.ml + 'ml' : '—'}</div>}
          {!!s.interval && <div style={{ fontSize: 10, color: 'var(--muted)' }}>간격 {fmtMin(s.interval)}</div>}
        </div>
      ))}
    </div>
  );
}

export default function StatsPanel() {
  const { db, filterByActiveBaby, showToast } = useApp();
  const feeds = filterByActiveBaby(db.feeds);
  const diapers = filterByActiveBaby(db.diapers);
  const sleeps = filterByActiveBaby(db.sleeps);

  // ══ 통계 카드를 눌렀을 때 열리는 전체 기록 팝업 (수유/수면/기저귀) ══
  const [detailType, setDetailType] = useState(null); // null | 'feed' | 'sleep' | 'diaper'

  // ══ 기간 선택 — 안 건드리면 지금까지와 완전히 동일한 "오늘 기준" 기본값 ══
  const todayMs = kstTodayStartMs();
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // 기간 선택 달력에서 오늘보다 미래 날짜는 고를 수 없도록 막는 기준값("YYYY-MM-DD")
  const todayStr = (() => {
    const d = kstDate(todayMs);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  })();

  let anchorMs = todayMs;
  let rangeDays = 7;
  let isCustom = false;
  if (useCustomRange && rangeStart && rangeEnd) {
    const startMs = kstMidnightMsFromDateStr(rangeStart);
    const endMs = kstMidnightMsFromDateStr(rangeEnd);
    if (endMs >= startMs) {
      anchorMs = endMs;
      rangeDays = Math.min(MAX_RANGE_DAYS, Math.round((endMs - startMs) / 86400000) + 1);
      isCustom = true;
    }
  }

  const periodLabel = isCustom ? `선택 기간(${rangeDays}일)` : '최근 7일';
  const recentTitle = `${periodLabel} 수유 횟수`;
  const recentSleepTitle = `${periodLabel} 수면 시간`;
  const napNightLabel = isCustom ? periodLabel : '오늘';

  // ══ 기간 전체(anchorMs를 마지막 날로 하는 rangeDays일) 범위 ══
  const { start: rangeStartMs } = dayRangeAt(anchorMs, -(rangeDays - 1));
  const { end: rangeEndMs } = dayRangeAt(anchorMs, 0);
  const daysN = lastNDaysAt(anchorMs, rangeDays);

  // ══ 수유 ══
  const feedToday = feeds.filter(f => inDayAt(f.start || f.time, anchorMs, 0));
  const feedYest  = feeds.filter(f => inDayAt(f.start || f.time, anchorMs, -1));
  const feedRange = feeds.filter(f => {
    const t = new Date(f.start || f.time).getTime();
    return t >= rangeStartMs && t <= rangeEndMs;
  });

  const mlToday = Math.round(totalMl(feedToday));
  const mlYest  = Math.round(totalMl(feedYest));
  const mlRange = Math.round(totalMl(feedRange));
  const intToday = avgIntervalMin(feedToday);
  const intYest  = avgIntervalMin(feedYest);
  const intRange = avgIntervalMin(feedRange);

  // 기간 일별 수유 횟수 + ml
  const feedByDay = daysN.map(d => {
    const start = d, end = start + 86400000;
    return feeds.filter(f => {
      const t = new Date(f.start || f.time).getTime();
      return t >= start && t < end;
    });
  });
  const feedCountByDay = feedByDay.map(arr => arr.length);
  const feedMlByDay    = feedByDay.map(arr => Math.round(totalMl(arr)));
  const maxFeedDay = Math.max(...feedCountByDay, 1);

  // "평균"은 그대로 rangeDays로 나누면 기록을 안 한 날 때문에 평균이 낮아 보이므로,
  // 실제로 기록이 있었던 날짜 수로만 나눈다 (예: 7일 중 5일만 기록했으면 5로 나눔).
  const feedActiveDays = feedCountByDay.filter(c => c > 0).length;
  const avgFeedCountN = feedActiveDays > 0 ? Math.round(feedRange.length / feedActiveDays * 10) / 10 : null;
  const avgFeedMlN    = feedActiveDays > 0 ? Math.round(totalMl(feedRange) / feedActiveDays) : null;

  const feedStatItems = isCustom
    ? [
        { label: '합계', count: feedRange.length, ml: mlRange, interval: intRange },
        { label: '일 평균', count: avgFeedCountN, ml: avgFeedMlN, interval: null },
      ]
    : [
        { label: '오늘', count: feedToday.length, ml: mlToday, interval: intToday },
        { label: '어제', count: feedYest.length,  ml: mlYest,  interval: intYest },
        { label: '7일 평균', count: avgFeedCountN, ml: avgFeedMlN, interval: intRange },
      ];

  // ══ 수면 ══
  const sleepToday = sleeps.filter(s => s.end && inDayAt(s.start, anchorMs, 0));
  const sleepYest  = sleeps.filter(s => s.end && inDayAt(s.start, anchorMs, -1));
  const sleepRange = sleeps.filter(s => {
    if (!s.end) return false;
    const t = new Date(s.start).getTime();
    return t >= rangeStartMs && t <= rangeEndMs;
  });

  const sleepMsToday = sleepToday.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
  const sleepMsYest  = sleepYest.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
  const sleepMsRange = sleepRange.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);

  const nap24   = (isCustom ? sleepRange : sleepToday).filter(s => !isNight(s.start));
  const night24 = (isCustom ? sleepRange : sleepToday).filter(s => isNight(s.start));
  const napMs   = nap24.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
  const nightMs = night24.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);

  const sleepByDay = daysN.map(d => {
    const start = d, end = start + 86400000;
    const ms = sleeps
      .filter(s => s.end && new Date(s.start).getTime() >= start && new Date(s.start).getTime() < end)
      .reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
    return Math.round(ms / 3600000 * 10) / 10;
  });
  const maxSleepDay = Math.max(...sleepByDay, 1);
  const sleepActiveDays = sleepByDay.filter(h => h > 0).length;
  const avgSleepMsPerDay = sleepActiveDays > 0 ? Math.round(sleepMsRange / sleepActiveDays) : null;
  const avgSleepCountPerDay = sleepActiveDays > 0 ? Math.round(sleepRange.length / sleepActiveDays * 10) / 10 : null;

  const sleepStatItems = isCustom
    ? [
        { label: '합계', val: sleepMsRange > 0 ? durStr(sleepMsRange) : '—', sub: sleepRange.length + '회' },
        { label: '일 평균', val: avgSleepMsPerDay > 0 ? durStr(avgSleepMsPerDay) : '—', sub: avgSleepCountPerDay != null ? avgSleepCountPerDay + '회' : '—' },
      ]
    : [
        { label: '오늘 총 수면', val: sleepMsToday > 0 ? durStr(sleepMsToday) : '—', sub: sleepToday.length + '회' },
        { label: '어제 총 수면', val: sleepMsYest  > 0 ? durStr(sleepMsYest)  : '—', sub: sleepYest.length  + '회' },
      ];

  // ══ 기저귀 ══
  const diapToday = diapers.filter(d => inDayAt(d.time, anchorMs, 0));
  const diapYest  = diapers.filter(d => inDayAt(d.time, anchorMs, -1));
  const diapRange = diapers.filter(d => {
    const t = new Date(d.time).getTime();
    return t >= rangeStartMs && t <= rangeEndMs;
  });
  const wetToday    = diaperWetCount(diapToday);
  const soiledToday = diaperSoiledCount(diapToday);
  const wetRange    = diaperWetCount(diapRange);
  const soiledRange = diaperSoiledCount(diapRange);

  const diapByDay = daysN.map(d => {
    const start = d, end = start + 86400000;
    return diapers.filter(x => {
      const t = new Date(x.time).getTime();
      return t >= start && t < end;
    }).length;
  });
  const diapActiveDays = diapByDay.filter(c => c > 0).length;
  const avgDiapCount = diapActiveDays > 0 ? Math.round(diapRange.length / diapActiveDays * 10) / 10 : null;
  const avgWet    = diapActiveDays > 0 ? Math.round(wetRange / diapActiveDays * 10) / 10 : null;
  const avgSoiled = diapActiveDays > 0 ? Math.round(soiledRange / diapActiveDays * 10) / 10 : null;

  const diapStatItems = isCustom
    ? [
        { label: '합계', total: diapRange.length, wet: wetRange, soiled: soiledRange },
        { label: '일 평균', total: avgDiapCount != null ? avgDiapCount : '—', wet: avgWet != null ? avgWet : '—', soiled: avgSoiled != null ? avgSoiled : '—' },
      ]
    : [
        { label: '오늘', total: diapToday.length, wet: wetToday, soiled: soiledToday },
        { label: '어제', total: diapYest.length, wet: diaperWetCount(diapYest), soiled: diaperSoiledCount(diapYest) },
      ];

  function toggleCustom(on) {
    if (on && (!rangeStart || !rangeEnd)) {
      // 기간 선택을 처음 켤 때는 기본값(최근 7일)으로 미리 채워준다.
      const endD = kstDate(todayMs);
      const startD = kstDate(todayMs - 6 * 86400000);
      const fmt = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      setRangeStart(fmt(startD));
      setRangeEnd(fmt(endD));
    }
    setUseCustomRange(on);
  }

  const detailRecords = detailType === 'feed' ? feedRange : detailType === 'sleep' ? sleepRange : diapRange;

  return (
    <>
      <h2 className="daytitle" style={{ fontSize: 22, marginBottom: 16 }}>통계 분석</h2>

      {/* ─── 기간 선택 — 안 건드리면 항상 "오늘 기준" 기본값 그대로 ─── */}
      <div className="modetoggle" style={{ marginBottom: useCustomRange ? 10 : 20 }}>
        <button
          className={`modetoggle-btn${!useCustomRange ? ' on' : ''}`}
          onClick={() => toggleCustom(false)}
          style={!useCustomRange ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
        >기본 (오늘 기준)</button>
        <button
          className={`modetoggle-btn${useCustomRange ? ' on' : ''}`}
          onClick={() => toggleCustom(true)}
          style={useCustomRange ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
        >기간 선택</button>
      </div>
      {useCustomRange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <DateTimePicker mode="date" style={{ flex: 1 }} maxDate={todayStr} value={rangeStart} onChange={(v) => {
            if (v && rangeEnd) {
              const span = Math.round((kstMidnightMsFromDateStr(rangeEnd) - kstMidnightMsFromDateStr(v)) / 86400000) + 1;
              if (span > MAX_RANGE_DAYS) {
                showToast(`최대 ${MAX_RANGE_DAYS}일까지 선택할 수 있어요`);
                return;
              }
            }
            setRangeStart(v);
          }} />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>~</span>
          <DateTimePicker mode="date" style={{ flex: 1 }} maxDate={todayStr} value={rangeEnd} onChange={(v) => {
            if (v && rangeStart && v < rangeStart) {
              showToast('종료일이 시작일보다 빠를 수 없어요');
              return;
            }
            if (v && rangeStart) {
              const span = Math.round((kstMidnightMsFromDateStr(v) - kstMidnightMsFromDateStr(rangeStart)) / 86400000) + 1;
              if (span > MAX_RANGE_DAYS) {
                showToast(`최대 ${MAX_RANGE_DAYS}일까지 선택할 수 있어요`);
                return;
              }
            }
            setRangeEnd(v);
          }} />
        </div>
      )}

      {/* ─── 수유 ─── */}
      <SectionTitle>수유</SectionTitle>
      <div className="sc-static clickable" style={{ marginBottom: 12 }} onClick={() => setDetailType('feed')}>
        <StatRow items={feedStatItems} color="var(--cf)" />

        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '.05em' }}>{recentTitle}</div>
        {daysN.map((d, i) => (
          <FeedBar key={i} label={dayLabel(d)} count={feedCountByDay[i]} ml={feedMlByDay[i]} maxCount={maxFeedDay} color="var(--cf)" />
        ))}
      </div>

      {/* ─── 수면 ─── */}
      <SectionTitle>수면</SectionTitle>
      <div className="sc-static clickable" style={{ marginBottom: 12 }} onClick={() => setDetailType('sleep')}>
        <div style={{ display: 'grid', gridTemplateColumns: sleepStatItems.map(() => '1fr').join(' '), gap: 0, textAlign: 'center', marginBottom: 12 }}>
          {sleepStatItems.map((s, i) => (
            <div key={i} style={{ borderRight: i < sleepStatItems.length - 1 ? '1px solid var(--bdr)' : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cs)', fontFamily: 'var(--serif)' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          <div style={{ flex: 1, background: 'var(--fw)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>낮잠 ({napNightLabel})</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cf)' }}>{napMs > 0 ? durStr(napMs) : '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{nap24.length}회</div>
          </div>
          <div style={{ flex: 1, background: 'var(--sw)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>밤잠 ({napNightLabel})</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cs)' }}>{nightMs > 0 ? durStr(nightMs) : '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{night24.length}회</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '.05em' }}>{recentSleepTitle}</div>
        {daysN.map((d, i) => (
          <MiniBar key={i} label={dayLabel(d)} value={sleepByDay[i]} max={maxSleepDay} color="var(--cs)" unit="h" />
        ))}
      </div>

      {/* ─── 기저귀 ─── */}
      <SectionTitle>기저귀</SectionTitle>
      <div className="sc-static clickable" style={{ marginBottom: 20 }} onClick={() => setDetailType('diaper')}>
        <div style={{ display: 'grid', gridTemplateColumns: diapStatItems.map(() => '1fr').join(' '), gap: 0, textAlign: 'center' }}>
          {diapStatItems.map((s, i) => (
            <div key={i} style={{ borderRight: i < diapStatItems.length - 1 ? '1px solid var(--bdr)' : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cd)', fontFamily: 'var(--serif)' }}>{s.total}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>소변 {s.wet}회 · 대변 {s.soiled}회</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 통계 카드 상세 팝업 (수유/수면/기저귀 카드를 누르면 표시) ─── */}
      {detailType && (
        <Home24hModal
          type={detailType}
          records={detailRecords}
          dayList={daysN}
          rangeLabel={periodLabel}
          onClose={() => setDetailType(null)}
        />
      )}
    </>
  );
}
