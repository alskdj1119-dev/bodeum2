'use client';
import { useRef, useState } from 'react';
import { weightDailyPoints, weightGains, avgRecentGain } from '../../lib/helpers';
import ChartTooltip from './ChartTooltip';

// 건강 > 체중 탭의 "일별 체중 추이" 선 그래프. 각 점에 마우스를 올리거나(데스크톱)
// 탭하면(모바일) 정확한 날짜/체중/전일 대비 증가량을 툴팁으로 보여준다.
export default function WeightValueChart({ weights }) {
  const svgRef = useRef(null);
  const [active, setActive] = useState(null);
  const points = weightDailyPoints(weights, 14);
  if (points.length < 2) return null;

  const W = 360, H = 172, ml = 10, mr = 10, mt = 32, mb = 44;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = points.length;
  const kgs = points.map(p => p.kg);
  const minKg = Math.min(...kgs), maxKg = Math.max(...kgs);
  const range = maxKg - minKg;
  const pad = range < 0.05 ? 0.15 : range * 0.3;
  const yMin = minKg - pad, yMax = maxKg + pad;

  const xp = i => (n === 1 ? ml + cW / 2 : ml + i * (cW / (n - 1)));
  const yp = kg => mt + (yMax - kg) / (yMax - yMin) * cH;

  const gains = weightGains(points);
  const avg7 = avgRecentGain(gains, 7);
  const avgColor = avg7 >= 0 ? 'var(--cw)' : 'var(--cd)';

  const ptStr = points.map((p, i) => `${xp(i)},${yp(p.kg)}`).join(' ');
  const areaD = `M${xp(0)},${mt + cH} L${ptStr.split(' ').join(' L')} L${xp(n - 1)},${mt + cH} Z`;

  const activeP = active != null ? points[active] : null;
  const activeGain = active > 0 ? gains[active - 1] : null;

  // 누르고 있는 동안만 툴팁을 보여주고, 떼거나(손가락을 치우거나) 벗어나면 바로 닫는다.
  function press(i, e) { e.stopPropagation(); setActive(i); }
  function release(i) { setActive(a => (a === i ? null : a)); }

  return (
    <div className="chart-wrap">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg">
        <path d={areaD} fill="var(--cf)" opacity="0.09" />
        <polyline points={ptStr} fill="none" stroke="var(--cf)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const x = xp(i), y = yp(p.kg);
          const showDate = n <= 7 || i % Math.ceil(n / 7) === 0 || i === n - 1;
          const gv = i > 0 ? gains[i - 1] : null;
          return (
            <g key={p.date}>
              <circle cx={x} cy={y} r="3.5" fill="var(--cf)" stroke="var(--surf)" strokeWidth="2" />
              <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ink)">{p.kg.toFixed(2)}</text>
              {showDate && <text x={x} y={H - mb + 13} textAnchor="middle" fontSize="9" fill="var(--muted)">{p.label}</text>}
              {gv != null && (
                <text x={x} y={H - mb + 27} textAnchor="middle" fontSize="9" fontWeight="600" fill={gv >= 0 ? 'var(--cw)' : 'var(--cd)'}>
                  {(gv >= 0 ? '+' : '') + gv + 'g'}
                </text>
              )}
              <circle
                className="chart-hit"
                cx={x} cy={y} r="13" fill="transparent"
                style={{ touchAction: 'manipulation' }}
                onPointerDown={e => press(i, e)}
                onPointerUp={() => release(i)}
                onPointerLeave={() => release(i)}
                onPointerCancel={() => release(i)}
              />
            </g>
          );
        })}
      </svg>
      {activeP && (
        <ChartTooltip containerRef={svgRef} xPct={(xp(active) / W) * 100} yPct={(yp(activeP.kg) / H) * 100}>
          <b>{activeP.date}</b><br />
          {activeP.kg.toFixed(3)}kg
          {activeGain != null && <> · {activeGain >= 0 ? '+' : ''}{activeGain}g</>}
        </ChartTooltip>
      )}
      {avg7 !== null && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', padding: '4px 0' }}>
          최근 7일 일평균 <strong style={{ color: avgColor }}>{avg7 >= 0 ? '+' : ''}{avg7}g</strong>
        </div>
      )}
    </div>
  );
}
