'use client';
import { useState } from 'react';
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
  const { activeTab, goTab, setOpenModal, setEditId, setEditType } = useApp();
  const effectiveTab = TAB_GROUP[activeTab] || activeTab;
  // 기록 추가 "+" — 한 손으로 누르기 쉽게 하단 메뉴바 맨 왼쪽(홈 앞)에 고정. 모든 화면에서 보인다.
  const [quickOpen, setQuickOpen] = useState(false);
  function openQuick(modal) {
    setQuickOpen(false);
    setEditId(null); setEditType(null); setOpenModal(modal);
  }

  return (
    <>
    {/* 메뉴바 뒤로 지나가는 기록들이 흐릿하게 비치도록 하단에 깔리는 반투명 블러 */}
    <div className="bnav-bg" aria-hidden="true" />
    {quickOpen && <div className="qfix-dim" onClick={() => setQuickOpen(false)} />}
    <nav className="bnav">
      {quickOpen && (
        <div className="qmenu qmenu-up">
          <button onClick={() => openQuick('feed')}>
            <span className="mico f"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></span>
            수유
          </button>
          <button onClick={() => openQuick('diaper')}>
            <span className="mico d"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg></span>
            기저귀
          </button>
          <button onClick={() => openQuick('sleep')}>
            <span className="mico s"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
            수면
          </button>
          <div className="qmenu-sep" />
          <button onClick={() => openQuick('handoffNote')}>
            <span className="mico n"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
            잘 부탁해 메모
          </button>
        </div>
      )}
      <button className={`nb-plus${quickOpen ? ' open' : ''}`} aria-label="기록 추가" onClick={() => setQuickOpen(v => !v)}>
        <svg viewBox="0 0 24 24"><line x1="12" y1="6" x2="12" y2="18"/><line x1="6" y1="12" x2="18" y2="12"/></svg>
      </button>
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
    </>
  );
}
