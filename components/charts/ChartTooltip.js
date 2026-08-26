'use client';

// 모든 인터랙티브 차트가 공통으로 쓰는 툴팁.
// 부모에 position:relative(className="chart-wrap")가 있어야 하고, xPct/yPct(0~100)로
// 차트 안에서의 위치를 퍼센트로 지정한다 (SVG viewBox 좌표를 W/H로 나눈 값 * 100).
export default function ChartTooltip({ xPct, yPct, children }) {
  if (xPct == null || yPct == null) return null;
  return (
    <div
      className="chart-tip"
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
    >
      {children}
    </div>
  );
}
