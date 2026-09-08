'use client';
import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { kstDate } from '../lib/helpers';

export default function Header({ onBack, showBack, title, activeTab }) {
  const { syncState, toggleTheme, theme, goTab } = useApp();
  const [dateStr, setDateStr] = useState('');
  const isDark = theme === 'dark';

  useEffect(() => {
    function update() {
      const d = kstDate(Date.now()), days = ['일','월','화','수','목','금','토'];
      setDateStr(d.getUTCFullYear() + '.' + (d.getUTCMonth()+1) + '.' + d.getUTCDate() + ' (' + days[d.getUTCDay()] + ')');
    }
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const dotClass = 'sync-dot ' + (
    syncState === 'online' ? 'online' :
    syncState === 'saving' ? 'saving' :
    syncState === 'error' ? 'error' : 'local'
  );

  return (
    <header className="hdr">
      {showBack ? (
        <button className="backbtn" onClick={onBack}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          뒤로
        </button>
      ) : (
        <>
          <svg className="logo" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="var(--s-wash)"/>
            <circle cx="50" cy="28" r="11" fill="var(--sage)"/>
            <path d="M22 52 Q22 80 50 80 Q78 80 78 52" fill="none" stroke="var(--sage)" strokeWidth="11" strokeLinecap="round"/>
          </svg>
          <span className="appname">{title || '보듬'}</span>
        </>
      )}
      <div className="hdr-right">
        {activeTab === 'home' && (
          <button className="theme-btn" onClick={() => goTab('notifHistory', 'forward')} title="알림 내역">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        )}
        {/* 2단계부터 설정/통계는 하단 탭에서 빠지고, 홈 우측 상단 톱니바퀴로 들어간다 (BeBo 참고) */}
        {activeTab === 'home' && (
          <button className="theme-btn" onClick={() => goTab('settings', 'forward')} title="설정">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        )}
        <button className="theme-btn" onClick={toggleTheme} title="다크모드 전환">
          {isDark ? (
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        <div className={dotClass} title={syncState}></div>
        <span className="hdrdate">{dateStr}</span>
      </div>
    </header>
  );
}
