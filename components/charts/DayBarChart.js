'use client';
import { useEffect, useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';

const MIN_BAR_W = 18; // 막대가 너무 얇아지면 가독성이 떨어지므로 이 밑으로는 안 줄이고 가로 스크롤로 전환
const GAP = 6;

// 일자별 막대 차트 (통계 카드를 눌러 연 상세 팝업에서, 기간이 24시간을 넘을 때 사용).
// 막대 폭은 선택 기간(막대 개수)에 맞춰 카드 너비를 꽉 채우도록 자동 계산한다 — 기간이
// 짧으면 막대가 넓어지고, 기간이 길어서 최소 폭(MIN_BAR_W) 밑으로 내려가면 그 폭으로
// 고정한 채 가로 스크롤 + 오른쪽 화살표 인디케이터로 넘긴다.
// days[i].series가 주어지면(예: 수유의 분유/모유, 기저귀의 소변/대변, 수면의 낮잠/밤잠)
// 하루 칸 안에 여러 막대를 나란히 배치해서 보여준다. legend를 주면 차트 아래에
// 색상 범례를 함께 그린다.
export default function DayBarChart({ days, color, height = 64, formatTip, barWidth = 26, legend }) {
  const scrollRef = useRef(null);
  const barRefs = useRef([]);
  const tooltipAnchorRef = useRef(null);
  const [active, setActive] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [barW, setBarW] = useState(barWidth);
  const max = Math.max(...days.flatMap(d => d.series ? d.series.map(s => s.value) : [d.value]), 1);

  function checkOverflow() {
    const el = scrollRef.current;
    if (!el) return;
    setHasMore(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
  }

  function recomputeWidth() {
    const el = scrollRef.current;
    if (!el) return;
    const n = days.length || 1;
    const avail = el.clientWidth;
    const ideal = Math.floor((avail - GAP * (n - 1)) / n);
    setBarW(Math.max(MIN_BAR_W, Math.min(barWidth, ideal)));
  }

  useEffect(() => { recomputeWidth(); checkOverflow(); }, [days]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { recomputeWidth(); checkOverflow(); });
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
        style={{ display: 'flex', alignItems: 'flex-end', gap: GAP, height, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {days.map((d, i) => (
          <div
            key={i}
            ref={el => { barRefs.current[i] = el; }}
            className="chart-hit"
            onClick={() => { tooltipAnchorRef.current = barRefs.current[i]; setActive(prev => (prev === i ? null : i)); }}
            style={{ flex: `0 0 ${barW}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}
          >
            {d.series ? (
              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }}>
                {d.series.map((s, si) => (
                  <div key={si} style={{
                    flex: 1, minWidth: 0, background: s.value > 0 ? s.color : 'var(--bdr)', borderRadius: '2px 2px 0 0',
                    height: Math.max(3, (s.value / max) * (height - 18)) + 'px', transition: 'height .4s', opacity: s.value > 0 ? 1 : 0.4,
                  }} />
                ))}
              </div>
            ) : (
              <div style={{
                width: '100%', background: d.value > 0 ? color : 'var(--bdr)', borderRadius: '3px 3px 0 0',
                height: Math.max(3, (d.value / max) * (height - 18)) + 'px', transition: 'height .4s', opacity: d.value > 0 ? 1 : 0.4,
              }} />
            )}
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
      {legend && legend.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginTop: 8, justifyContent: 'center' }}>
          {legend.map(item => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: 'inline-block' }} />{item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
