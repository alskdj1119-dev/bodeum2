'use client';
import { useRef, useState } from 'react';
import { weightDailyPoints, weightGains, avgRecentGain } from '../../lib/helpers';
import ChartTooltip from './ChartTooltip';

// 홈 화면 체중 카드에 들어가는 "일별 증가율" 선 그래프.
// 최근 기록이 있는 날짜 기준 최대 7일치만 표시한다.
// 점을 누르면 해당 날짜의 증가량과 체중을 툴팁으로 보여주고, 손을 떼면 사라진다.
// (드래그하며 계속 갱신하는 추적 기능은 홈 카드에서는 쓰지 않음 — 카드 자체가 클릭 가능한
//  큰 영역(.sc)이라 누르는 동안 카드 전체에 눌림 애니메이션이 걸리는데, 손가락을 움직이며
//  계속 추적하면 이 애니메이션과 겹쳐 툴팁이 간헐적으로 사라지는 문제가 있었음)
export default function WeightGainChart({ weights }) {
  const svgRef = useRef(null);
  const [active, setActive] = useState(null);
  const points = weightDailyPoints(weights, 7);
  const gains = weightGains(points);
  if (gains.length < 1) return null;

  const W = 300, H = 108, ml = 8, mr = 8, mt = 14, mb = 20;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = gains.length;
  const maxAbs = Math.max(...gains.map(g => Math.abs(g)), 10);
  const yMin = -maxAbs * 1.15, yMax = maxAbs * 1.15;

  const xp = i => (n === 1 ? ml + cW / 2 : ml + i * (cW / (n - 1)));
  const yp = g => mt + (yMax - g) / (yMax - yMin) * cH;
  const zeroY = yp(0);

  const ptStr = gains.map((g, i) => `${xp(i)},${yp(g)}`).join(' ');

  const avg7 = avgRecentGain(gains, 7);
  const avgColor = avg7 >= 0 ? 'var(--cw)' : 'var(--cd)';

  const activeGain = active != null ? gains[active] : null;
  const activePoint = active != null ? points[active + 1] : null; // 증가량 쌍 중 나중 날짜

  function nearestIndex(clientX) {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const svgX = relX * W;
    let nearest = 0, minDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xp(i) - svgX);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    return nearest;
  }
  function onDown(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(nearestIndex(e.clientX));
  }
  function onUp() {
    setActive(null);
  }

  return (
    <div className="chart-wrap" style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>일별 증가율</div>
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <line x1={ml} y1={zeroY} x2={W - mr} y2={zeroY} stroke="var(--bdr)" strokeWidth="1" />
        <polyline points={ptStr} fill="none" stroke="var(--cw)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {gains.map((g, i) => {
          const x = xp(i), y = yp(g);
          const color = g > 0 ? 'var(--cw)' : g < 0 ? 'var(--cd)' : 'var(--muted)';
          return (
            <g key={points[i + 1].date}>
              <circle cx={x} cy={y} r="3" fill={color} stroke="var(--surf)" strokeWidth="1.5" />
              <circle className="chart-hit" cx={x} cy={y} r="12" fill="transparent" />
            </g>
          );
        })}
      </svg>
      {activePoint && (
        <ChartTooltip containerRef={svgRef} xPct={(xp(active) / W) * 100} yPct={(yp(activeGain) / H) * 100}>
          {activeGain >= 0 ? '+' : ''}{activeGain}g · {activePoint.kg.toFixed(2)}kg
        </ChartTooltip>
      )}
      {avg7 !== null && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          최근 7일 평균 <strong style={{ color: avgColor }}>{avg7 >= 0 ? '+' : ''}{avg7}g</strong>/일
        </div>
      )}
    </div>
  );
}
