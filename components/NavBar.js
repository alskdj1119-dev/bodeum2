'use client';
import { useApp } from '../lib/store';

// 2단계 네비게이션 재편 — 7탭(홈/수유/기저귀/수면/건강/통계/설정) → 4탭(홈/트래킹/건강/성장).
// 수유·기저귀·수면은 "트래킹" 안에서 목록으로 들어가고, 통계·설정은 홈 우측 상단 톱니바퀴로 이동.
const TAB_ACTIVE_COLOR = {
  home:     'var(--sage)',
  tracking: 'var(--sage)',
  health:   'var(--cw)',
  growth:   'var(--cw)',
};

const TABS = [
  {
    id: 'home', label: '홈',
    icon: <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  },
  {
    id: 'tracking', label: '트래킹',
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  },
  {
    id: 'health', label: '건강',
    icon: <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  },
  {
    id: 'growth', label: '성장',
    icon: <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  },
];

// 트래킹 하위 화면(수유/기저귀/수면)에 있을 때도 하단 네비에서는 "트래킹"이 활성 상태로 보이게 한다.
const TAB_GROUP = { feed: 'tracking', diaper: 'tracking', sleep: 'tracking', solid: 'tracking' };

export default function NavBar() {
  const { activeTab, goTab } = useApp();
  const effectiveTab = TAB_GROUP[activeTab] || activeTab;

  return (
    <nav className="bnav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          id={`nav-${tab.id}`}
          className={`nb${effectiveTab === tab.id ? ' active' : ''}`}
          style={effectiveTab === tab.id ? { color: TAB_ACTIVE_COLOR[tab.id] } : {}}
          onClick={() => goTab(tab.id, tab.id === 'home' ? 'back' : 'forward')}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
