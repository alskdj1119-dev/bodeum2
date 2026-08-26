'use client';
import { useRef, useState } from 'react';
import { weightDailyPoints, weightGains, avgRecentGain } from '../../lib/helpers';
import ChartTooltip from './ChartTooltip';

// 홈 화면 체중 카드에 들어가는 "일별 증가율" 선 그래프.
// 전일 대비 증가/감소량(g)을 점으로 찍고, 마우스를 올리거나(데스크톱) 탭하면(모바일)
// 해당 날짜의 정확한 증가량과 체중을 툴팁으로 보여준다.
export default function WeightGainChart({ weights }) {
  const svgRef = useRef(null);
  const [active, setActive] = useState(null);
  const points = weightDailyPoints(weights, 14);
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

  function toggle(i, e) {
    e.stopPropagation();
    setActive(a => (a === i ? null : i));
  }

  return (
    <div className="chart-wrap" style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>일별 증가율</div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg">
        <line x1={ml} y1={zeroY} x2={W - mr} y2={zeroY} stroke="var(--bdr)" strokeWidth="1" />
        <polyline points={ptStr} fill="none" stroke="var(--cw)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {gains.map((g, i) => {
          const x = xp(i), y = yp(g);
          const color = g > 0 ? 'var(--cw)' : g < 0 ? 'var(--cd)' : 'var(--muted)';
          return (
            <g key={points[i + 1].date}>
              <circle cx={x} cy={y} r="3" fill={color} stroke="var(--surf)" strokeWidth="1.5" />
              <circle
                className="chart-hit"
                cx={x} cy={y} r="12" fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(a => (a === i ? null : a))}
                onClick={e => toggle(i, e)}
              />
            </g>
          );
        })}
      </svg>
      {activePoint && (
        <ChartTooltip containerRef={svgRef} xPct={(xp(active) / W) * 100} yPct={(yp(activeGain) / H) * 100}>
          <b>{activePoint.date}</b><br />
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
