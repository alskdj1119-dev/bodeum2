'use client';
import { useApp } from '../../lib/store';
import { durStr, directFeedMl } from '../../lib/helpers';

function p2(n) { return n < 10 ? '0' + n : '' + n; }

// 날짜 범위 필터
function inLast(isoTime, hours) {
  return (Date.now() - new Date(isoTime).getTime()) <= hours * 3600 * 1000;
}

// 낮잠(06-22) vs 밤잠(22-06)
function isNight(isoTime) {
  const h = new Date(isoTime).getHours();
  return h >= 22 || h < 6;
}

// 수유 간격 평균 계산 (완료된 수유 기준)
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

// 간단 막대 차트 (CSS)
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

// 최근 7일 날짜 라벨
function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export default function StatsPanel() {
  const { db } = useApp();
  const { feeds, diapers, sleeps } = db;

  const h24 = 24, h48 = 48, h168 = 168; // 1d, 2d, 7d

  // === 수유 통계 ===
  const feed24 = feeds.filter(f => inLast(f.start || f.time, h24));
  const feed48 = feeds.filter(f => inLast(f.start || f.time, h48) && !inLast(f.start || f.time, h24));
  const feed7d  = feeds.filter(f => inLast(f.start || f.time, h168));

  function totalMl(list) {
    return list.reduce((acc, f) => {
      let amt = f.consumedAmount != null ? f.consumedAmount : f.amount;
      if (amt == null && f.type === 'breast' && f.subtype === 'direct' && f.start && f.end) {
        amt = directFeedMl(f.start, f.end);
      }
      return acc + (amt || 0);
    }, 0);
  }

  const ml24 = Math.round(totalMl(feed24));
  const ml48 = Math.round(totalMl(feed48));
  const interval24 = avgIntervalMin(feed24);
  const interval48 = avgIntervalMin(feed48);
  const interval7d  = avgIntervalMin(feed7d);

  // 최근 7일 수유 횟수 차트
  const days7 = last7Days();
  const feedByDay = days7.map(d => {
    const start = d.getTime(), end = start + 86400000;
    return feeds.filter(f => {
      const t = new Date(f.start || f.time).getTime();
      return t >= start && t < end;
    }).length;
  });
  const maxFeedDay = Math.max(...feedByDay, 1);

  // === 수면 통계 ===
  const done24 = sleeps.filter(s => s.end && inLast(s.start, h24));
  const done48 = sleeps.filter(s => s.end && inLast(s.start, h48) && !inLast(s.start, h24));

  const sleepMs24 = done24.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
  const sleepMs48 = done48.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);

  const nap24 = done24.filter(s => !isNight(s.start));
  const night24 = done24.filter(s => isNight(s.start));
  const napMs = nap24.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
  const nightMs = night24.reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);

  // 최근 7일 수면 시간 차트
  const sleepByDay = days7.map(d => {
    const start = d.getTime(), end = start + 86400000;
    const ms = sleeps
      .filter(s => s.end && new Date(s.start).getTime() >= start && new Date(s.start).getTime() < end)
      .reduce((a, s) => a + (new Date(s.end) - new Date(s.start)), 0);
    return Math.round(ms / 3600000 * 10) / 10; // hours
  });
  const maxSleepDay = Math.max(...sleepByDay, 1);

  // === 기저귀 통계 ===
  const diap24 = diapers.filter(d => inLast(d.time, h24));
  const diap48 = diapers.filter(d => inLast(d.time, h48) && !inLast(d.time, h24));

  const wet24    = diap24.filter(d => d.type === 'wet' || d.type === 'both').length;
  const soiled24 = diap24.filter(d => d.type === 'soiled' || d.type === 'both').length;

  function fmtMin(m) {
    if (!m) return '—';
    const h = Math.floor(m / 60), mn = m % 60;
    return h > 0 ? `${h}시간 ${mn}분` : `${mn}분`;
  }

  // 요일 라벨
  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
  function dayLabel(d) { return DAY_LABELS[d.getDay()]; }

  return (
    <>
      <h2 className="daytitle" style={{ fontSize: 22, marginBottom: 20 }}>통계 분석</h2>

      {/* ─── 수유 ─── */}
      <p className="seclbl" style={{ marginBottom: 10 }}>수유</p>
      <div className="sc" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, textAlign: 'center', marginBottom: 12 }}>
          {[
            { label: '오늘', count: feed24.length, ml: ml24, interval: interval24 },
            { label: '어제', count: feed48.length, ml: ml48, interval: interval48 },
            { label: '7일 평균', count: Math.round(feed7d.length / 7 * 10) / 10, ml: null, interval: interval7d },
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

        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>최근 7일 수유 횟수</div>
        {days7.map((d, i) => (
          <MiniBar key={i} label={dayLabel(d)} value={feedByDay[i]} max={maxFeedDay} color="var(--cf)" unit="회" />
        ))}
      </div>

      {/* ─── 수면 ─── */}
      <p className="seclbl" style={{ marginBottom: 10 }}>수면</p>
      <div className="sc" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, textAlign: 'center', marginBottom: 12 }}>
          {[
            { label: '오늘 총 수면', val: sleepMs24 > 0 ? durStr(sleepMs24) : '—', sub: done24.length + '회' },
            { label: '어제 총 수면', val: sleepMs48 > 0 ? durStr(sleepMs48) : '—', sub: done48.length + '회' },
          ].map((s, i) => (
            <div key={i} style={{ borderRight: i < 1 ? '1px solid var(--bdr)' : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cs)', fontFamily: 'var(--serif)' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* 낮잠/밤잠 구분 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          <div style={{ flex: 1, background: 'var(--fw)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>낮잠</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cf)' }}>{napMs > 0 ? durStr(napMs) : '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{nap24.length}회</div>
          </div>
          <div style={{ flex: 1, background: 'var(--sw)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>밤잠</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cs)' }}>{nightMs > 0 ? durStr(nightMs) : '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{night24.length}회</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>최근 7일 수면 시간</div>
        {days7.map((d, i) => (
          <MiniBar key={i} label={dayLabel(d)} value={sleepByDay[i]} max={maxSleepDay} color="var(--cs)" unit="h" />
        ))}
      </div>

      {/* ─── 기저귀 ─── */}
      <p className="seclbl" style={{ marginBottom: 10 }}>기저귀</p>
      <div className="sc" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, textAlign: 'center' }}>
          {[
            { label: '오늘', total: diap24.length, wet: wet24, soiled: soiled24 },
            { label: '어제', total: diap48.length,
              wet: diap48.filter(d => d.type === 'wet' || d.type === 'both').length,
              soiled: diap48.filter(d => d.type === 'soiled' || d.type === 'both').length },
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
