'use client';
import { weightDailyPoints, weightGains, avgRecentGain } from '../../lib/helpers';

// 홈 화면 체중 카드에 들어가는 "일별 증가율" 선 그래프.
// 최근 기록이 있는 날짜 기준 최대 7일치만 표시한다.
// 예전엔 손가락으로 누르는 동안만 값이 보였지만, 이제는 항상 최신 날짜의
// 체중/증가량을 그래프 아래에 고정으로 표시한다 (누르기/드래그 상호작용 없음).
export default function WeightGainChart({ weights }) {
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

  const latestPoint = points[points.length - 1];
  const latestGain = gains[gains.length - 1];
  const latestColor = latestGain > 0 ? 'var(--up)' : latestGain < 0 ? 'var(--down)' : 'var(--muted)';
  const latestArrow = latestGain > 0 ? '▲' : latestGain < 0 ? '▼' : '—';
  const latestWord = latestGain > 0 ? '증가' : latestGain < 0 ? '감소' : '변화 없음';

  return (
    <div className="chart-wrap" style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>일별 증가율</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg">
        <line x1={ml} y1={zeroY} x2={W - mr} y2={zeroY} stroke="var(--bdr)" strokeWidth="1" />
        <polyline points={ptStr} fill="none" stroke="var(--cw)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {gains.map((g, i) => {
          const x = xp(i), y = yp(g);
          const color = g > 0 ? 'var(--cw)' : g < 0 ? 'var(--cd)' : 'var(--muted)';
          return <circle key={points[i + 1].date} cx={x} cy={y} r="3" fill={color} stroke="var(--surf)" strokeWidth="1.5" />;
        })}
      </svg>
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{latestPoint.kg.toFixed(3)}kg</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: latestColor, marginTop: 1 }}>
          {latestArrow} {Math.abs(latestGain)}g {latestWord}
        </div>
      </div>
      {avg7 !== null && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          최근 7일 평균 <strong style={{ color: avgColor }}>{avg7 >= 0 ? '+' : ''}{avg7}g</strong>/일
        </div>
      )}
    </div>
  );
}
