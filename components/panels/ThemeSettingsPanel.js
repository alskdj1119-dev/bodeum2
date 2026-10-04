'use client';
import { useApp } from '../../lib/store';

// 설정 > 테마 — 앱 전체 색상 팔레트를 고른다.
// 기본: 크림 + 보라 / 포레스트: 숲색 + 민트 · 인디고 · 앰버 / 샌드: 진한 베이지 카드 + 민트.
// 모든 팔레트가 라이트·다크를 둘 다 지원하고, 아이 성별(남/여)에 따른 강조색도 팔레트마다 따로 갖고 있다.
// 라이트/다크는 아래 "화면 모드"가 팔레트와 별개로 정한다. 선택은 이 기기(localStorage)에만 저장된다.
const PALETTES = [
  {
    id: 'default', name: '기본', desc: '크림 바탕 + 보라 포인트 (지금 쓰는 테마)',
    light: { bg: '#F7F2E9', card: '#FFFFFF', dots: ['#7660A2', '#5B8CB5', '#946D6D'] },
    dark: { bg: '#18150F', card: '#2C271F', dots: ['#7FAF91', '#7899B8', '#C49A6B'] },
  },
  {
    id: 'forest', name: '포레스트', desc: '숲색 계열 + 민트 · 인디고 · 앰버 포인트',
    light: { bg: '#F1F5F1', card: '#E3ECE5', dots: ['#4B9E7C', '#7280D6', '#D9913F'] },
    dark: { bg: '#131915', card: '#1E2621', dots: ['#8FCBAB', '#9AA6F0', '#F0B673'] },
  },
  {
    id: 'sand', name: '샌드', desc: '진한 베이지 카드 + 민트 포인트',
    light: { bg: '#F7F2E9', card: '#EBE1CE', dots: ['#4F9A7A', '#7A86D6', '#D98F3C'] },
    dark: { bg: '#1A1612', card: '#262019', dots: ['#78B89A', '#8F9BE6', '#E8A55A'] },
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
          <div className="thm-prev">
            {['light', 'dark'].map(mode => (
              <div key={mode} className="thm-half" style={{ background: p[mode].bg }}>
                <i style={{ left: 5, right: 5, top: 7, height: 13, borderRadius: 5, background: p[mode].card }} />
                <i style={{ left: 5, right: 5, top: 25, height: 11, borderRadius: 5, background: p[mode].card }} />
                {p[mode].dots.map((c, k) => (
                  <i key={k} style={{ left: 9 + k * 9, top: 11, width: 5, height: 5, borderRadius: '50%', background: c }} />
                ))}
              </div>
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="thm-name">{p.name}</div>
            <div className="thm-desc">{p.desc}</div>
          </div>
          <div className="thm-chk"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
        </button>
      ))}

      {(
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '18px 0 8px' }}>화면 모드</div>
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
