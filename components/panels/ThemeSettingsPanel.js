'use client';
import { useApp } from '../../lib/store';

// 설정 > 테마 — 앱 전체 색상 팔레트를 고른다.
// 기본: 기존 크림+보라(시스템/라이트/다크 모드 선택 가능) / 포레스트: 짙은 숲색 다크 /
// 샌드: 기존 베이지 배경 위에 진한 베이지 카드 + 민트 포인트.
// 선택은 이 기기(localStorage)에만 저장된다 — 가족 간 공유되는 기록 데이터와는 무관.
const PALETTES = [
  {
    id: 'default', name: '기본', desc: '지금 쓰는 크림 + 보라 테마. 아래에서 라이트/다크를 고를 수 있어요',
    bg: '#F7F2E9', card: '#FFFFFF', dots: ['#7660A2', '#5B8CB5', '#946D6D'],
  },
  {
    id: 'forest', name: '포레스트', desc: '짙은 숲색 바탕에 민트 · 인디고 · 앰버 포인트 (다크 전용)',
    bg: '#131915', card: '#1E2621', dots: ['#8FCBAB', '#9AA6F0', '#F0B673'],
  },
  {
    id: 'sand', name: '샌드', desc: '배경은 그대로, 카드와 버튼만 진한 베이지로 · 민트 포인트 (라이트 전용)',
    bg: '#F7F2E9', card: '#EBE1CE', dots: ['#4F9A7A', '#7A86D6', '#D98F3C'],
  },
];

const MODES = [
  { id: 'system', label: '시스템 따라가기' },
  { id: 'light', label: '라이트' },
  { id: 'dark', label: '다크' },
];

export default function ThemeSettingsPanel() {
  const { palette, setPalette, theme, setThemeMode, showToast } = useApp();

  function pick(id) {
    if (id === palette) return;
    setPalette(id);
    showToast('테마를 바꿨어요');
  }

  return (
    <>
      <h2 className="daytitle" style={{ fontSize: 22, marginBottom: 6 }}>테마</h2>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
        앱 전체 색상을 골라요. 이 기기에만 적용되고, 가족 코드로 연결된 다른 기기에는 영향이 없어요.
      </div>

      {PALETTES.map(p => (
        <button key={p.id} className={`thm-card${palette === p.id ? ' on' : ''}`} onClick={() => pick(p.id)}>
          <div className="thm-prev" style={{ background: p.bg }}>
            <i style={{ left: 8, top: 8, right: 8, height: 14, borderRadius: 6, background: p.card }} />
            <i style={{ left: 8, top: 28, right: 8, height: 12, borderRadius: 6, background: p.card }} />
            {p.dots.map((c, i) => (
              <i key={i} style={{ left: 14 + i * 14, top: 12, width: 6, height: 6, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="thm-name">{p.name}</div>
            <div className="thm-desc">{p.desc}</div>
          </div>
          <div className="thm-chk"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
        </button>
      ))}

      {palette === 'default' && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '18px 0 8px' }}>화면 모드 (기본 테마)</div>
          <div className="modetoggle">
            {MODES.map(m => (
              <button
                key={m.id}
                className={`modetoggle-btn${theme === m.id ? ' on' : ''}`}
                onClick={() => setThemeMode(m.id)}
                style={theme === m.id ? { background: 'var(--sage)', borderColor: 'var(--sage)' } : undefined}
              >{m.label}</button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
