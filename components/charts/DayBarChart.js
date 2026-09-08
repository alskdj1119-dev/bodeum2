'use client';
import { useEffect, useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';

// 일자별 막대 차트 (통계 카드를 눌러 연 상세 팝업에서, 기간이 24시간을 넘을 때 사용).
// 기간이 길어져도(최대 30일) 막대 비율이 찌그러지지 않도록 막대 폭을 고정하고
// 가로 스크롤로 넘기며, 오른쪽에 더 볼 기록이 있으면 화살표로 알려준다.
export default function DayBarChart({ days, color, height = 64, formatTip, barWidth = 26 }) {
  const scrollRef = useRef(null);
  const barRefs = useRef([]);
  const tooltipAnchorRef = useRef(null);
  const [active, setActive] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const max = Math.max(...days.map(d => d.value), 1);

  function checkOverflow() {
    const el = scrollRef.current;
    if (!el) return;
    setHasMore(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
  }

  useEffect(() => { checkOverflow(); }, [days]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onScroll() {
    checkOverflow();
    setActive(null); // 스크롤 중엔 위치가 어긋나므로 툴팁을 닫는다
  }

  return (
    <div className="chart-wrap">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {days.map((d, i) => (
          <div
            key={i}
            ref={el => { barRefs.current[i] = el; }}
            className="chart-hit"
            onClick={() => { tooltipAnchorRef.current = barRefs.current[i]; setActive(prev => (prev === i ? null : i)); }}
            style={{ flex: `0 0 ${barWidth}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}
          >
            <div style={{
              width: '100%', background: d.value > 0 ? color : 'var(--bdr)', borderRadius: '3px 3px 0 0',
              height: Math.max(3, (d.value / max) * (height - 18)) + 'px', transition: 'height .4s', opacity: d.value > 0 ? 1 : 0.4,
            }} />
            <div style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 18, width: 30, borderRadius: '0 8px 8px 0',
          background: 'linear-gradient(to right, transparent, var(--surf2) 65%)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4, pointerEvents: 'none',
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </div>
      )}
      {active != null && (
        <ChartTooltip containerRef={tooltipAnchorRef} xPct={50} yPct={0}>
          {formatTip ? formatTip(days[active]) : `${days[active].label}: ${days[active].value}`}
        </ChartTooltip>
      )}
    </div>
  );
}
