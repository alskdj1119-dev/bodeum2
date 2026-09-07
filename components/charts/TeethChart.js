'use client';
import { useState } from 'react';
import { fmtFull } from '../../lib/helpers';

// 유치(젖니) 20개 — 정중선에서 바깥쪽 순서로 이름 붙임 (임상 표기 대신 보호자가 이해하기 쉬운 이름 사용)
const TOOTH_NAMES = ['중절치', '측절치', '견치', '제1유구치', '제2유구치'];

// 소아치과에서 흔히 쓰는 유치 표기법(Universal 방식, A~T) — 상악 오른쪽 어금니(A)에서 시작해
// 상악을 가로질러 상악 왼쪽 어금니(J)까지, 이어서 하악 왼쪽 어금니(K)부터 하악 오른쪽 어금니(T)까지
// 시계 방향으로 한 바퀴 도는 순서. 그림과 목록에 같은 번호를 표시해 서로 매칭하기 쉽게 한다.
const UPPER_LETTERS = ['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A']; // 화면 왼쪽→오른쪽
const LOWER_LETTERS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T']; // 화면 왼쪽→오른쪽

function buildArch(arch, letters) {
  // 왼쪽 바깥→정중선, 정중선→오른쪽 바깥 순서로 10개 배열 (화면에 보이는 좌우 기준)
  const left = [...TOOTH_NAMES].reverse().map((name, i) => ({
    id: `${arch}_L${4 - i}`, label: `${arch === 'upper' ? '상악' : '하악'} 왼쪽 ${name}`,
  }));
  const right = TOOTH_NAMES.map((name, i) => ({
    id: `${arch}_R${i}`, label: `${arch === 'upper' ? '상악' : '하악'} 오른쪽 ${name}`,
  }));
  return [...left, ...right].map((t, i) => ({ ...t, num: letters[i] }));
}

const UPPER_TEETH = buildArch('upper', UPPER_LETTERS);
const LOWER_TEETH = buildArch('lower', LOWER_LETTERS);
export const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

// teethStatus의 각 값은 예전엔 문자열('YYYY-MM-DD', 난 날짜만) 이었는데,
// 치료·특이사항·발치 같은 추가 기록도 남길 수 있도록 { date, records: [...] } 객체로 확장했다.
// 기존에 문자열로 저장된 값도 그대로 읽을 수 있도록 여기서 정규화한다.
export function normalizeToothInfo(v) {
  if (!v) return null;
  if (typeof v === 'string') return { date: v, records: [], updatedAt: null };
  return { date: v.date || '', records: v.records || [], updatedAt: v.updatedAt || null };
}

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
// 아래 목록의 각 치아 행을 탭하면 onOpenDetail(toothId)로 상세(추가 기록) 화면을 연다.
// teethStatus: { [toothId]: 'YYYY-MM-DD' | { date, records } } / onToggle(toothId)
export default function TeethChart({ teethStatus, onToggle, onOpenDetail }) {
  const [selected, setSelected] = useState(null);
  const upperPts = archPoints(55, 28, false);
  const lowerPts = archPoints(105, 28, true);

  const eruptedCount = Object.keys(teethStatus || {}).length;

  function ToothDot({ tooth, pt }) {
    const info = normalizeToothInfo(teethStatus?.[tooth.id]);
    const erupted = !!info;
    const isSelected = selected === tooth.id;
    return (
      <g
        className="chart-hit"
        style={{ cursor: 'pointer' }}
        onClick={() => { onToggle(tooth.id); setSelected(tooth.id); }}
      >
        <circle cx={pt.x} cy={pt.y} r="12" fill={erupted ? 'var(--cv)' : 'var(--surf)'}
          stroke={isSelected ? 'var(--cv)' : 'var(--muted)'} strokeWidth={isSelected ? 2.5 : 1.5} strokeOpacity={isSelected ? 1 : 0.5} />
        <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="central"
          fontSize="10" fontWeight="700" fill={erupted ? 'var(--surf)' : 'var(--muted)'}>
          {tooth.num}
        </text>
      </g>
    );
  }

  const erupted = ALL_TEETH
    .map(t => ({ t, info: normalizeToothInfo(teethStatus?.[t.id]) }))
    .filter(x => x.info)
    .sort((a, b) => (a.info.date || '').localeCompare(b.info.date || ''));

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
        치아 기록 · 총 {eruptedCount} / 20개
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} 150`} width="100%" xmlns="http://www.w3.org/2000/svg">
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
          {erupted.map(({ t, info }) => (
            <div key={t.id} className="ec" style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => onOpenDetail(t.id)}>
              <div className="edot v" />
              <div className="emain">
                <div className="epri" style={{ fontSize: 13 }}><span style={{ fontWeight: 700, color: 'var(--cv)', marginRight: 5 }}>{t.num}</span>{t.label}</div>
                {info.records.length > 0 && (
                  <div className="esec" style={{ fontSize: 11 }}>추가 기록 {info.records.length}건</div>
                )}
              </div>
              <div className="etime">{fmtFull(info.updatedAt || info.date)}</div>
              <button className="edel" onClick={e => { e.stopPropagation(); onToggle(t.id); }}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
