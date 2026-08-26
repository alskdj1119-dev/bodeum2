'use client';
import { useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';

// 24개 시간대 버킷 막대 차트 (Home24hModal의 수유/기저귀/수면 "시간대별" 그래프에서 공통 사용).
// 막대에 마우스를 올리거나(데스크톱) 탭하면(모바일) 해당 시간대의 정확한 수치를 툴팁으로 보여준다.
export default function HourBarChart({ buckets, color, height = 40, formatTip }) {
  const rowRef = useRef(null);
  const [active, setActive] = useState(null);
  const max = Math.max(...buckets, 1);
  const activeVal = active != null ? buckets[active] : null;

  // 누르고 있는 동안만 툴팁을 보여준다. 손가락/마우스를 뗄 때 닫히고, 누른 채로
  // 좌우로 움직이면 그 x좌표에 해당하는 시간대로 계속 갱신된다(매번 다시 누를 필요 없음).
  const pressedRef = useRef(false);
  function hourAt(clientX) {
    const rect = rowRef.current.getBoundingClientRect();
    const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(23, Math.floor(relX * 24));
  }
  function onDown(e) {
    pressedRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(hourAt(e.clientX));
  }
  function onMove(e) {
    if (!pressedRef.current) return;
    setActive(hourAt(e.clientX));
  }
  function onUp() {
    pressedRef.current = false;
    setActive(null);
  }

  return (
    <div className="chart-wrap">
      <div
        ref={rowRef}
        style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, touchAction: 'pan-y' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        {buckets.map((v, h) => (
          <div
            key={h}
            className="chart-bar chart-hit"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}
          >
            <div style={{
              width: '100%', background: v > 0 ? color : 'var(--bdr)', borderRadius: '2px 2px 0 0',
              height: Math.max(3, (v / max) * (height - 6)) + 'px', transition: 'height .4s', opacity: v > 0 ? 1 : 0.4,
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>0시</span>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>12시</span>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>23시</span>
      </div>
      {active != null && (
        <ChartTooltip containerRef={rowRef} xPct={((active + 0.5) / 24) * 100} yPct={0}>
          {formatTip ? formatTip(active, activeVal) : `${active}시: ${activeVal}`}
        </ChartTooltip>
      )}
    </div>
  );
}
