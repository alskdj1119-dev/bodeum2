'use client';
import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';

export default function Header({ onBack, showBack, title }) {
  const { syncState, toggleTheme, theme } = useApp();
  const [dateStr, setDateStr] = useState('');
  const isDark = theme === 'dark';

  useEffect(() => {
    function update() {
      const d = new Date(), days = ['일','월','화','수','목','금','토'];
      setDateStr(d.getFullYear() + '.' + (d.getMonth()+1) + '.' + d.getDate() + ' (' + days[d.getDay()] + ')');
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
