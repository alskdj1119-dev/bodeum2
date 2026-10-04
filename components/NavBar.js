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
// 선택된 메뉴 알약의 배경 — 글자색과 같은 계열의 옅은 색.
const TAB_ACTIVE_WASH = {
  home:     'var(--s-wash)',
  tracking: 'var(--s-wash)',
  health:   'var(--ww)',
  growth:   'var(--ww)',
};

// 아이콘: 선 두께 1.7 + 선택 시 안쪽이 은은하게 채워지는 .fl 레이어(globals.css). 성장은 막대그래프 대신 새싹.
const TABS = [
  {
    id: 'home', label: '홈',
    icon: <svg viewBox="0 0 24 24"><path className="fl" d="M5 11 12 5l7 6v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5z"/><path d="M5 11 12 5l7 6v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5z"/></svg>
  },
  {
    id: 'tracking', label: '트래킹',
    icon: <svg viewBox="0 0 24 24"><circle className="fl" cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>
  },
  {
    id: 'health', label: '건강',
    icon: <svg viewBox="0 0 24 24"><path className="fl" d="M12 19.5s-7-4.2-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.3c0 5-7 9.2-7 9.2z"/><path d="M12 19.5s-7-4.2-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.3c0 5-7 9.2-7 9.2z"/></svg>
  },
  {
    id: 'growth', label: '성장',
    icon: <svg viewBox="0 0 24 24"><path d="M12 20v-9"/><path className="fl" d="M12 11c0-3-2.2-5-5.5-5 0 3.3 2.2 5 5.5 5z"/><path d="M12 11c0-3-2.2-5-5.5-5 0 3.3 2.2 5 5.5 5z"/><path className="fl" d="M12 14c0-2.5 1.9-4.3 5-4.3 0 2.9-1.9 4.3-5 4.3z"/><path d="M12 14c0-2.5 1.9-4.3 5-4.3 0 2.9-1.9 4.3-5 4.3z"/></svg>
  },
];

// 트래킹 하위 화면(수유/기저귀/수면)에 있을 때도 하단 네비에서는 "트래킹"이 활성 상태로 보이게 한다.
const TAB_GROUP = { report: 'tracking', feed: 'tracking', diaper: 'tracking', sleep: 'tracking', solid: 'tracking' };

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
          style={effectiveTab === tab.id ? { color: TAB_ACTIVE_COLOR[tab.id], background: TAB_ACTIVE_WASH[tab.id] } : {}}
          onClick={() => goTab(tab.id, tab.id === 'home' ? 'back' : 'forward')}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
