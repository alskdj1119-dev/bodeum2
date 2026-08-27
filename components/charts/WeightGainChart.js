'use client';
import { weightDailyPoints, weightGains, avgRecentGain } from '../../lib/helpers';

// 홈 화면 체중 카드에 들어가는 "체중 추이" 선 그래프.
// 최근 기록이 있는 날짜 기준 최대 7일치를 표시하며, 실제 체중 값을 그대로 그린다.
// (예전엔 "전날 대비 증가폭"을 그렸는데, 그러면 체중이 늘어도 전날보다 덜 늘면
//  선이 아래로 내려가 보여 헷갈렸음 — 이제는 체중 자체가 늘면 선이 항상 위로 올라간다.)
// 상호작용 없이, 각 점 위에는 체중과 전날 대비 증감량을 말풍선(툴팁) 모양으로
// 항상 고정 표시하고, 점 아래에는 날짜를 표시한다.
export default function WeightGainChart({ weights }) {
  const points = weightDailyPoints(weights, 7);
  if (points.length < 1) return null;

  // gains[i]는 points[i]→points[i+1] 사이의 증감량(g). 말풍선에 표시할 "전날 대비" 값.
  const gains = weightGains(points);

  // mt(위 여백)는 말풍선이 그래프 위쪽으로 삐져나가지 않을 만큼 넉넉히 확보,
  // mb(아래 여백)는 날짜 한 줄만 들어가면 되므로 예전보다 줄임.
  const W = 300, H = 150, ml = 8, mr = 8, mt = 38, mb = 26;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = points.length;
  const kgs = points.map(p => p.kg);
  const minKg = Math.min(...kgs), maxKg = Math.max(...kgs);
  const span = Math.max(maxKg - minKg, 0.05); // 변화가 거의 없을 때도 위아래 여백 확보
  const yMin = minKg - span * 0.25, yMax = maxKg + span * 0.25;

  const xp = i => (n === 1 ? ml + cW / 2 : ml + i * (cW / (n - 1)));
  const yp = kg => mt + (yMax - kg) / (yMax - yMin) * cH;

  const ptStr = points.map((p, i) => `${xp(i)},${yp(p.kg)}`).join(' ');

  const avg7 = avgRecentGain(gains, 7);
  const avgColor = avg7 !== null && avg7 >= 0 ? 'var(--cw)' : 'var(--cd)';

  const boxW = 38, boxH = 24, boxGap = 5;

  return (
    <div className="chart-wrap" style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>체중 추이</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg">
        <polyline points={ptStr} fill="none" stroke="var(--cw)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const x = xp(i), y = yp(p.kg);
          const g = i === 0 ? null : gains[i - 1];
          const dotColor = g > 0 ? 'var(--cw)' : g < 0 ? 'var(--cd)' : 'var(--muted)';
          const gainColor = g > 0 ? 'var(--up)' : g < 0 ? 'var(--down)' : 'var(--muted)';
          const arrow = g > 0 ? '▲' : g < 0 ? '▼' : '—';

          // 말풍선 박스: 맨 처음 점은 오른쪽으로, 마지막 점은 왼쪽으로 펼쳐서
          // 그래프 좌우 바깥으로 삐져나가지 않게 한다.
          const boxX = i === 0 ? x : i === n - 1 ? x - boxW : x - boxW / 2;
          const boxBottom = y - boxGap;
          const boxTop = boxBottom - boxH;
          const cx = boxX + boxW / 2;

          return (
            <g key={p.date}>
              <circle cx={x} cy={y} r="3" fill={dotColor} stroke="var(--surf)" strokeWidth="1.5" />

              {/* 체중/전날 대비 증감량 — 말풍선(툴팁) 모양으로 항상 표시 */}
              <rect x={boxX} y={boxTop} width={boxW} height={boxH} rx="6" fill="var(--surf)" stroke="var(--bdr)" strokeWidth="1" />
              <text x={cx} y={boxTop + 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--ink)">{p.kg.toFixed(2)}kg</text>
              <text x={cx} y={boxTop + 20} textAnchor="middle" fontSize="9" fontWeight="600" fill={gainColor}>
                {g === null ? '—' : `${arrow} ${Math.abs(g)}g`}
              </text>

              {/* 날짜 — 점 아래 고정 표시 */}
              <text x={x} y={H - mb + 13} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="9" fill="var(--muted)">{p.label}</text>
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
