'use client';
import { useState } from 'react';

// 유치(젖니) 20개 — 정중선에서 바깥쪽 순서로 이름 붙임 (임상 표기 대신 보호자가 이해하기 쉬운 이름 사용)
const TOOTH_NAMES = ['중절치', '측절치', '견치', '제1유구치', '제2유구치'];

function buildArch(arch) {
  // 왼쪽 바깥→정중선, 정중선→오른쪽 바깥 순서로 10개 배열 (화면에 보이는 좌우 기준)
  const left = [...TOOTH_NAMES].reverse().map((name, i) => ({
    id: `${arch}_L${4 - i}`, label: `${arch === 'upper' ? '상악' : '하악'} 왼쪽 ${name}`,
  }));
  const right = TOOTH_NAMES.map((name, i) => ({
    id: `${arch}_R${i}`, label: `${arch === 'upper' ? '상악' : '하악'} 오른쪽 ${name}`,
  }));
  return [...left, ...right];
}

const UPPER_TEETH = buildArch('upper');
const LOWER_TEETH = buildArch('lower');
export const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

const W = 320;

function archPoints(baselineY, amplitude, curveDown) {
  const n = 10;
  return Array.from({ length: n }, (_, i) => {
    const x = 20 + i * ((W - 40) / (n - 1));
    const t = i / (n - 1); // 0..1
    const bulge = Math.sin(Math.PI * t) * amplitude; // 중앙에서 최대
    const y = curveDown ? baselineY + bulge : baselineY - bulge;
    return { x, y };
  });
}

// 치아 기록 다이어그램 — 위/아래 잇몸 아치 모양으로 20개 유치를 배치하고,
// 탭하면 오늘 날짜로 "났음" 표시, 다시 탭하면 취소한다.
// teethStatus: { [toothId]: 'YYYY-MM-DD' } / onToggle(toothId)
export default function TeethChart({ teethStatus, onToggle, onDateChange }) {
  const [selected, setSelected] = useState(null);
  const upperPts = archPoints(55, 28, false);
  const lowerPts = archPoints(105, 28, true);

  const eruptedCount = Object.keys(teethStatus || {}).length;

  function ToothDot({ tooth, pt }) {
    const date = teethStatus?.[tooth.id];
    const erupted = !!date;
    const isSelected = selected === tooth.id;
    return (
      <g
        className="chart-hit"
        style={{ cursor: 'pointer' }}
        onClick={() => { onToggle(tooth.id); setSelected(tooth.id); }}
      >
        <circle cx={pt.x} cy={pt.y} r="12" fill={erupted ? 'var(--cv)' : 'var(--surf)'}
          stroke={isSelected ? 'var(--cv)' : 'var(--muted)'} strokeWidth={isSelected ? 2.5 : 1.5} strokeOpacity={isSelected ? 1 : 0.5} />
        {erupted && <circle cx={pt.x} cy={pt.y} r="4" fill="var(--surf)" opacity="0.9" />}
      </g>
    );
  }

  const erupted = ALL_TEETH.filter(t => teethStatus?.[t.id]).sort((a, b) =>
    (teethStatus[a.id] || '').localeCompare(teethStatus[b.id] || '')
  );

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
        치아 기록 · 총 {eruptedCount} / 20개
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} 140`} width="100%" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="80" x2={W - 20} y2="80" stroke="var(--muted)" strokeOpacity="0.25" strokeDasharray="3 4" />
          {UPPER_TEETH.map((t, i) => <ToothDot key={t.id} tooth={t} pt={upperPts[i]} />)}
          {LOWER_TEETH.map((t, i) => <ToothDot key={t.id} tooth={t} pt={lowerPts[i]} />)}
        </svg>
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)' }}>
          동그라미를 탭하면 이가 난 날짜(오늘)로 기록돼요 · 위쪽 = 윗니, 아래쪽 = 아랫니
        </div>
      </div>

      {erupted.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {erupted.map(t => (
            <div key={t.id} className="ec" style={{ padding: '8px 12px' }}>
              <div className="edot v" />
              <div className="emain">
                <div className="epri" style={{ fontSize: 13 }}>{t.label}</div>
              </div>
              <input type="date" className="finp" value={teethStatus[t.id]}
                onChange={e => onDateChange(t.id, e.target.value)}
                style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }} />
              <button className="edel" onClick={() => onToggle(t.id)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
