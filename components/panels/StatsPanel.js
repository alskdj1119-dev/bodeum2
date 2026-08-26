'use client';
import { useApp } from '../../lib/store';
import { durStr, feedEffectiveMl, kstDate, KST_OFFSET_MS } from '../../lib/helpers';

// ──────────── 날짜 범위 헬퍼 (한국 시간 00:00~23:59 기준) ────────────
// 기기 시간대와 무관하게 항상 "한국 자정"을 기준으로 날짜 경계를 계산한다.
function kstMidnightMs(offsetDays = 0) {
  const nowKst = kstDate(Date.now());
  return Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate() + offsetDays, 0, 0) - KST_OFFSET_MS;
}

function dayRange(offsetDays) {
  const start = kstMidnightMs(offsetDays);
  return { start, end: start + 86400000 - 1 };
}

function inDay(isoTime, offsetDays) {
  const t = new Date(isoTime).getTime();
  const { start, end } = dayRange(offsetDays);
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

// 최근 7일 (오늘 포함 7일) — 각 날의 "한국 자정" ms 타임스탬프 배열
function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(kstMidnightMs(-i));
  }
  return days;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function dayLabel(ms) { return DAY_LABELS[kstDate(ms).getUTCDay()]; }

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

export default function StatsPanel() {
  const { db } = useApp();
  const { feeds, diapers, sleeps } = db;

  // ══ 수유 (오늘/어제/7일 — 당일 00:00~23:59 기준) ══
  const feedToday = feeds.filter(f => inDay(f.start || f.time, 0));
  const feedYest  = feeds.filter(f => inDay(f.start || f.time, -1));

  // 7일 평균: 오늘 포함 최근 7일
  const feed7d = feeds.filter(f => {
    const t = new Date(f.start || f.time).getTime();
    const { start } = dayRange(-6);
    return t >= start;
  });

  const mlToday = Math.round(totalMl(feedToday));
  const mlYest  = Math.round(totalMl(feedYest));
  const intToday = avgIntervalMin(feedToday);
  const intYest  = avgIntervalMin(feedYest);
  const int7d    = avgIntervalMin(feed7d);

  // 7일 일별 수유 횟수 + ml
  const days7 = last7Days();
  const feedByDay = days7.map(d => {
    const start = d, end = start + 86400000;
    return feeds.filter(f => {
      const t = new Date(f.start || f.time).getTime();
      return t >= start && t < end;
    });
  });
  const feedCountByDay = feedByDay.map(arr => arr.length);
  const feedMlByDay    = feedByDay.map(arr => Math.round(totalMl(arr)));
  const maxFeedDay = Math.max(...feedCountByDay, 1);

  // ══ 수면 ══
  const sleepToday = sleeps.filter(s => s.end && inDay(s.start, 0));
  const sleepYest  = sleeps.filter(s => s.end && inDay(s.start, -1));

  const sleepMsToday = sleepToday.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
  const sleepMsYest  = sleepYest.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);

  const nap24   = sleepToday.filter(s => !isNight(s.start));
  const night24 = sleepToday.filter(s => isNight(s.start));
  const napMs   = nap24.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
  const nightMs = night24.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);

  const sleepByDay = days7.map(d => {
    const start = d, end = start + 86400000;
    const ms = sleeps
      .filter(s => s.end && new Date(s.start).getTime() >= start && new Date(s.start).getTime() < end)
      .reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
    return Math.round(ms / 3600000 * 10) / 10;
  });
  const maxSleepDay = Math.max(...sleepByDay, 1);

  // ══ 기저귀 ══
  const diapToday = diapers.filter(d => inDay(d.time, 0));
  const diapYest  = diapers.filter(d => inDay(d.time, -1));
  const wetToday    = diapToday.filter(d => d.type === 'wet' || d.type === 'both').length;
  const soiledToday = diapToday.filter(d => d.type === 'soiled' || d.type === 'both').length;

  return (
    <>
      <h2 className="daytitle" style={{ fontSize: 22, marginBottom: 20 }}>통계 분석</h2>

      {/* ─── 수유 ─── */}
      <p className="seclbl" style={{ marginBottom: 10 }}>수유</p>
      <div className="sc-static" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, textAlign: 'center', marginBottom: 12 }}>
          {[
            { label: '오늘', count: feedToday.length, ml: mlToday, interval: intToday },
            { label: '어제', count: feedYest.length,  ml: mlYest,  interval: intYest },
            { label: '7일 평균', count: Math.round(feed7d.length / 7 * 10) / 10, ml: null, interval: int7d },
          ].map((s, i) => (
            <div key={i} style={{ borderRight: i < 2 ? '1px solid var(--bdr)' : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cf)', fontFamily: 'var(--serif)' }}>{s.count}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>회</div>
              {s.ml !== null && <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 2 }}>{s.ml > 0 ? s.ml + 'ml' : '—'}</div>}
              {s.interval && <div style={{ fontSize: 10, color: 'var(--muted)' }}>간격 {fmtMin(s.interval)}</div>}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '.05em' }}>최근 7일 수유 횟수</div>
        {days7.map((d, i) => (
          <FeedBar key={i} label={dayLabel(d)} count={feedCountByDay[i]} ml={feedMlByDay[i]} maxCount={maxFeedDay} color="var(--cf)" />
        ))}
      </div>

      {/* ─── 수면 ─── */}
      <p className="seclbl" style={{ marginBottom: 10 }}>수면</p>
      <div className="sc-static" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, textAlign: 'center', marginBottom: 12 }}>
          {[
            { label: '오늘 총 수면', val: sleepMsToday > 0 ? durStr(sleepMsToday) : '—', sub: sleepToday.length + '회' },
            { label: '어제 총 수면', val: sleepMsYest  > 0 ? durStr(sleepMsYest)  : '—', sub: sleepYest.length  + '회' },
          ].map((s, i) => (
            <div key={i} style={{ borderRight: i < 1 ? '1px solid var(--bdr)' : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cs)', fontFamily: 'var(--serif)' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          <div style={{ flex: 1, background: 'var(--fw)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>낮잠 (오늘)</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cf)' }}>{napMs > 0 ? durStr(napMs) : '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{nap24.length}회</div>
          </div>
          <div style={{ flex: 1, background: 'var(--sw)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>밤잠 (오늘)</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cs)' }}>{nightMs > 0 ? durStr(nightMs) : '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{night24.length}회</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '.05em' }}>최근 7일 수면 시간</div>
        {days7.map((d, i) => (
          <MiniBar key={i} label={dayLabel(d)} value={sleepByDay[i]} max={maxSleepDay} color="var(--cs)" unit="h" />
        ))}
      </div>

      {/* ─── 기저귀 ─── */}
      <p className="seclbl" style={{ marginBottom: 10 }}>기저귀</p>
      <div className="sc-static" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, textAlign: 'center' }}>
          {[
            { label: '오늘', total: diapToday.length, wet: wetToday, soiled: soiledToday },
            { label: '어제', total: diapYest.length,
              wet: diapYest.filter(d => d.type === 'wet' || d.type === 'both').length,
              soiled: diapYest.filter(d => d.type === 'soiled' || d.type === 'both').length },
          ].map((s, i) => (
            <div key={i} style={{ borderRight: i < 1 ? '1px solid var(--bdr)' : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cd)', fontFamily: 'var(--serif)' }}>{s.total}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>소변 {s.wet}회 · 대변 {s.soiled}회</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
