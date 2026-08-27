'use client';
import { weightDailyPoints, weightGains, avgRecentGain } from '../../lib/helpers';

// 홈 화면 체중 카드에 들어가는 "일별 증가율" 선 그래프.
// 최근 기록이 있는 날짜 기준 최대 7일치만 표시한다.
// 상호작용 없이, 각 점 아래에 그날의 체중/증감량을 항상 고정으로 표시한다.
export default function WeightGainChart({ weights }) {
  const points = weightDailyPoints(weights, 7);
  const gains = weightGains(points);
  if (gains.length < 1) return null;

  const W = 300, H = 140, ml = 8, mr = 8, mt = 14, mb = 40;
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

  return (
    <div className="chart-wrap" style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>일별 증가율</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg">
        <line x1={ml} y1={zeroY} x2={W - mr} y2={zeroY} stroke="var(--bdr)" strokeWidth="1" />
        <polyline points={ptStr} fill="none" stroke="var(--cw)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {gains.map((g, i) => {
          const x = xp(i), y = yp(g);
          const dotColor = g > 0 ? 'var(--cw)' : g < 0 ? 'var(--cd)' : 'var(--muted)';
          const gainColor = g > 0 ? 'var(--up)' : g < 0 ? 'var(--down)' : 'var(--muted)';
          const arrow = g > 0 ? '▲' : g < 0 ? '▼' : '—';
          const p = points[i + 1];
          // 맨 처음/마지막 점은 가운데 정렬로 두면 라벨이 그래프 좌우 바깥으로
          // 삐져나가 잘리기 때문에, 양 끝은 안쪽으로 붙는 정렬을 쓴다.
          const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
          const tx = i === 0 ? x + 3 : i === n - 1 ? x - 3 : x;
          return (
            <g key={p.date}>
              <circle cx={x} cy={y} r="3" fill={dotColor} stroke="var(--surf)" strokeWidth="1.5" />
              <text x={tx} y={H - mb + 13} textAnchor={anchor} fontSize="9" fontWeight="700" fill="var(--ink)">{p.kg.toFixed(2)}</text>
              <text x={tx} y={H - mb + 27} textAnchor={anchor} fontSize="9" fontWeight="600" fill={gainColor}>{arrow} {Math.abs(g)}g</text>
            </g>
          );
        })}
      </svg>
      {avg7 !== null && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          최근 7일 평균 <strong style={{ color: avgColor }}>{avg7 >= 0 ? '+' : ''}{avg7}g</strong>/일
        </div>
      )}
    </div>
  );
}
