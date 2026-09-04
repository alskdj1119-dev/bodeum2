'use client';
import { useRef, useState } from 'react';
import { WHO_AGE_MONTHS, WHO_DATA, WHO_MAX_MONTHS, ageMonthsAt } from '../../lib/whoGrowth';
import ChartTooltip from './ChartTooltip';

// WHO 소아 성장 표준 백분위(3rd/50th/97th) 곡선 위에 아이의 실제 측정값을 겹쳐 보여주는 차트.
// measure: 'weight' | 'height' | 'headCirc', gender: 'boy' | 'girl'
// records: [{ time, value }] — 오래된 순 정렬은 필요 없음(내부에서 정렬)
export default function WHOPercentileChart({ measure, gender, birthDate, records, unit, color }) {
  const svgRef = useRef(null);
  const [active, setActive] = useState(null);
  const pressedRef = useRef(false);

  if (!birthDate || !records || records.length === 0) return null;

  const gtable = WHO_DATA[measure]?.[gender];
  if (!gtable) return null;

  const points = records
    .map(r => ({ ageMo: ageMonthsAt(birthDate, r.time), value: r.value, time: r.time }))
    .filter(p => p.ageMo != null && p.ageMo >= 0)
    .sort((a, b) => a.ageMo - b.ageMo);
  if (points.length === 0) return null;

  const maxAge = Math.max(WHO_MAX_MONTHS, ...points.map(p => Math.ceil(p.ageMo)));
  const ageTicks = WHO_AGE_MONTHS.filter(a => a <= maxAge);

  const W = 340, H = 190, ml = 28, mr = 10, mt = 14, mb = 26;
  const cW = W - ml - mr, cH = H - mt - mb;

  const allVals = [
    ...gtable.p3.slice(0, ageTicks.length), ...gtable.p97.slice(0, ageTicks.length),
    ...points.map(p => p.value),
  ];
  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const pad = (maxV - minV) * 0.1 || 1;
  const yMin = minV - pad, yMax = maxV + pad;

  const xp = ageMo => ml + (Math.min(ageMo, maxAge) / maxAge) * cW;
  const yp = v => mt + (yMax - v) / (yMax - yMin) * cH;

  function pathFor(key) {
    return ageTicks.map((a, i) => `${i === 0 ? 'M' : 'L'}${xp(a)},${yp(gtable[key][i])}`).join(' ');
  }

  const ptStr = points.map(p => `${xp(p.ageMo)},${yp(p.value)}`).join(' ');

  function nearestIndex(clientX) {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const svgX = relX * W;
    let nearest = 0, minDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(xp(p.ageMo) - svgX);
      if (d < minDist) { minDist = d; nearest = i; }
    });
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

  const activeP = active != null ? points[active] : null;

  return (
    <div className="chart-wrap">
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <path d={pathFor('p97')} fill="none" stroke="var(--muted)" strokeOpacity="0.5" strokeDasharray="3 3" strokeWidth="1.2" />
        <path d={pathFor('p50')} fill="none" stroke="var(--muted)" strokeOpacity="0.7" strokeWidth="1.4" />
        <path d={pathFor('p3')} fill="none" stroke="var(--muted)" strokeOpacity="0.5" strokeDasharray="3 3" strokeWidth="1.2" />

        <polyline points={ptStr} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xp(p.ageMo)} cy={yp(p.value)} r="3.5" fill={color} stroke="var(--surf)" strokeWidth="2" />
            <circle className="chart-hit" cx={xp(p.ageMo)} cy={yp(p.value)} r="13" fill="transparent" />
          </g>
        ))}

        {ageTicks.filter((a, i) => i % 2 === 0 || a === ageTicks[ageTicks.length - 1]).map(a => (
          <text key={a} x={xp(a)} y={H - mb + 16} textAnchor="middle" fontSize="9" fill="var(--muted)">{a}개월</text>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
        <span>--- 3rd/97th</span>
        <span>— 50th(중앙값)</span>
        <span style={{ color }}>● 우리 아이</span>
      </div>
      {activeP && (
        <ChartTooltip containerRef={svgRef} xPct={(xp(activeP.ageMo) / W) * 100} yPct={(yp(activeP.value) / H) * 100}>
          <b>{activeP.ageMo.toFixed(1)}개월</b><br />{activeP.value}{unit}
        </ChartTooltip>
      )}
    </div>
  );
}
