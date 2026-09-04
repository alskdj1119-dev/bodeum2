'use client';
import { useRef, useState } from 'react';
import { toLocal } from '../../lib/helpers';
import ChartTooltip from './ChartTooltip';

// 체중 외 성장 지표(키/머리둘레)용 범용 "일별 추이" 선 그래프. WeightValueChart와 같은 상호작용
// 방식(누르면 툴팁)을 쓰되, 증가량 계산 없이 값만 보여주는 단순한 버전.
// records: [{ time, value }], decimals: 소수점 표시 자리수
export default function SimpleValueChart({ records, color, unit, decimals = 1, days = 14 }) {
  const svgRef = useRef(null);
  const [active, setActive] = useState(null);
  const pressedRef = useRef(false);

  const asc = [...records].sort((a, b) => new Date(a.time) - new Date(b.time));
  const byDay = {};
  asc.forEach(r => { byDay[toLocal(r.time).slice(0, 10)] = r.value; });
  const sortedDays = Object.keys(byDay).sort().slice(-days);
  const points = sortedDays.map(d => ({ date: d, label: d.slice(5, 7) + '/' + d.slice(8, 10), value: byDay[d] }));

  if (points.length < 2) return null;

  const W = 340, H = 150, ml = 10, mr = 10, mt = 24, mb = 24;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = points.length;
  const vals = points.map(p => p.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV;
  const pad = range < 0.5 ? 1 : range * 0.3;
  const yMin = minV - pad, yMax = maxV + pad;

  const xp = i => (n === 1 ? ml + cW / 2 : ml + i * (cW / (n - 1)));
  const yp = v => mt + (yMax - v) / (yMax - yMin) * cH;

  const ptStr = points.map((p, i) => `${xp(i)},${yp(p.value)}`).join(' ');
  const areaD = `M${xp(0)},${mt + cH} L${ptStr.split(' ').join(' L')} L${xp(n - 1)},${mt + cH} Z`;

  const activeP = active != null ? points[active] : null;

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
    pressedRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(nearestIndex(e.clientX));
  }
  function onMove(e) { if (pressedRef.current) setActive(nearestIndex(e.clientX)); }
  function onUp() { pressedRef.current = false; setActive(null); }

  return (
    <div className="chart-wrap">
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <path d={areaD} fill={color} opacity="0.09" />
        <polyline points={ptStr} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const x = xp(i), y = yp(p.value);
          const showDate = n <= 7 || i % Math.ceil(n / 7) === 0 || i === n - 1;
          return (
            <g key={p.date}>
              <circle cx={x} cy={y} r="3.5" fill={color} stroke="var(--surf)" strokeWidth="2" />
              <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ink)">{p.value.toFixed(decimals)}</text>
              {showDate && <text x={x} y={H - mb + 13} textAnchor="middle" fontSize="9" fill="var(--muted)">{p.label}</text>}
              <circle className="chart-hit" cx={x} cy={y} r="13" fill="transparent" />
            </g>
          );
        })}
      </svg>
      {activeP && (
        <ChartTooltip containerRef={svgRef} xPct={(xp(active) / W) * 100} yPct={(yp(activeP.value) / H) * 100}>
          <b>{activeP.date}</b><br />{activeP.value.toFixed(decimals)}{unit}
        </ChartTooltip>
      )}
    </div>
  );
}
