'use client';
import { useMemo, useRef, useState } from 'react';
import { kstDate, KST_OFFSET_MS } from '../../lib/helpers';
import ChartTooltip from './ChartTooltip';

// 한국 자정(00:00 KST) 기준 ms 타임스탬프. offsetDays만큼 오늘에서 이동.
function kstMidnightMs(offsetDays = 0) {
  const nowKst = kstDate(Date.now());
  return Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate() + offsetDays, 0, 0) - KST_OFFSET_MS;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 수면 탭 안에서 보는 "주간/월간" 수면 시간 막대 그래프.
// range: 'week'(최근 7일, 요일 표시) | 'month'(최근 30일, 5일 간격 날짜 표시)
export default function SleepBarChart({ sleeps }) {
  const [range, setRange] = useState('week');
  const rowRef = useRef(null);
  const [active, setActive] = useState(null);

  const days = range === 'week' ? 7 : 30;

  const points = useMemo(() => {
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = kstMidnightMs(-i);
      const end = start + 86400000;
      const ms = sleeps
        .filter(s => s.end && new Date(s.start).getTime() >= start && new Date(s.start).getTime() < end)
        .reduce((acc, s) => acc + (new Date(s.end) - new Date(s.start)), 0);
      const hours = Math.round(ms / 3600000 * 10) / 10;
      const d = kstDate(start);
      const label = days === 7
        ? DAY_LABELS[d.getUTCDay()]
        : (d.getUTCMonth() + 1) + '/' + d.getUTCDate();
      arr.push({ hours, label, dateStr: `${d.getUTCFullYear()}.${d.getUTCMonth()+1}.${d.getUTCDate()}` });
    }
    return arr;
  }, [sleeps, days]);

  const max = Math.max(...points.map(p => p.hours), 1);
  const avg = points.length ? Math.round((points.reduce((a, p) => a + p.hours, 0) / points.length) * 10) / 10 : 0;

  const pressedRef = useRef(false);
  function indexAt(clientX) {
    const rect = rowRef.current.getBoundingClientRect();
    const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(points.length - 1, Math.floor(relX * points.length));
  }
  function onDown(e) {
    pressedRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(indexAt(e.clientX));
  }
  function onMove(e) {
    if (!pressedRef.current) return;
    setActive(indexAt(e.clientX));
  }
  function onUp() {
    pressedRef.current = false;
    setActive(null);
  }

  const activeP = active != null ? points[active] : null;
  // 월간(30개)은 라벨을 다 표시하면 겹치므로 5일 간격으로만 표시
  const showLabelStep = days === 7 ? 1 : 5;

  return (
    <div className="chart-wrap">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', flex: 1 }}>
          {range === 'week' ? '최근 7일' : '최근 30일'} 수면 시간 · 평균 {avg}h
        </div>
        <div className="seg" style={{ width: 'auto' }}>
          <button className={`sbtn${range === 'week' ? ' on' : ''}`} onClick={() => setRange('week')}>주간</button>
          <button className={`sbtn${range === 'month' ? ' on' : ''}`} onClick={() => setRange('month')}>월간</button>
        </div>
      </div>

      <div
        ref={rowRef}
        style={{ display: 'flex', alignItems: 'flex-end', gap: days === 7 ? 6 : 2, height: 90, touchAction: 'none' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        {points.map((p, i) => (
          <div key={i} className="chart-bar chart-hit" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%', background: p.hours > 0 ? 'var(--cs)' : 'var(--bdr)', borderRadius: '2px 2px 0 0',
              height: Math.max(3, (p.hours / max) * 74) + 'px', transition: 'height .4s', opacity: p.hours > 0 ? 1 : 0.4,
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: days === 7 ? 6 : 2, marginTop: 4 }}>
        {points.map((p, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--muted)' }}>
            {i % showLabelStep === 0 || i === points.length - 1 ? p.label : ''}
          </div>
        ))}
      </div>
      {activeP && (
        <ChartTooltip containerRef={rowRef} xPct={((active + 0.5) / points.length) * 100} yPct={0}>
          <b>{activeP.dateStr}</b><br />{activeP.hours}시간
        </ChartTooltip>
      )}
    </div>
  );
}
