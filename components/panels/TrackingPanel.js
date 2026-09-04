'use client';
import { useApp } from '../../lib/store';
import { agoStr } from '../../lib/helpers';

// 2단계 네비게이션 재편 — 수유/기저귀/수면을 "트래킹" 탭 하나로 묶는 허브 화면.
// 각 항목을 누르면 기존 수유/기저귀/수면 상세 화면(FeedPanel/DiaperPanel/SleepPanel)으로 이동한다.
export default function TrackingPanel() {
  const { db, goTab, filterByActiveBaby } = useApp();
  const feeds = filterByActiveBaby(db.feeds);
  const diapers = filterByActiveBaby(db.diapers);
  const sleeps = filterByActiveBaby(db.sleeps);
  const solids = filterByActiveBaby(db.solids || []);

  const lastFeed = [...feeds].filter(f => f.end || f.time).sort((a,b) => new Date(b.start||b.time) - new Date(a.start||a.time))[0];
  const lastDiaper = [...diapers].sort((a,b) => new Date(b.time) - new Date(a.time))[0];
  const lastSleep = [...sleeps].filter(s => s.end).sort((a,b) => new Date(b.start) - new Date(a.start))[0];
  const lastSolid = [...solids].sort((a,b) => new Date(b.time) - new Date(a.time))[0];

  const ITEMS = [
    {
      id: 'feed', label: '수유 트래커',
      sub: lastFeed ? `직전 ${agoStr(lastFeed.start || lastFeed.time)}` : '기록 없음',
      wash: 'var(--fw)', color: 'var(--cf)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
        </svg>
      ),
    },
    {
      id: 'sleep', label: '수면 트래커',
      sub: lastSleep ? `직전 ${agoStr(lastSleep.start)}` : '기록 없음',
      wash: 'var(--sw)', color: 'var(--cs)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      ),
    },
    {
      id: 'diaper', label: '기저귀 트래커',
      sub: lastDiaper ? `직전 ${agoStr(lastDiaper.time)}` : '기록 없음',
      wash: 'var(--dw)', color: 'var(--cd)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/>
        </svg>
      ),
    },
    {
      id: 'solid', label: '이유식 트래커',
      sub: lastSolid ? `직전 ${agoStr(lastSolid.time)}` : '기록 없음',
      wash: 'var(--nw)', color: 'var(--cn)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12a8 8 0 0 0 16 0z"/><path d="M4 12a8 8 0 0 1 16 0"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M8 6c.5-1.5 1.5-2.5 3-3"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      <h2 className="daytitle" style={{ fontSize: '22px', marginBottom: '18px' }}>트래킹</h2>

      {ITEMS.map(item => (
        <button key={item.id} className="settmenu" onClick={() => goTab(item.id, 'forward')}>
          <div className="settmenu-ico" style={{ background: item.wash, color: item.color }}>
            {item.icon}
          </div>
          <div className="settmenu-inf">
            <div className="settmenu-title">{item.label}</div>
            <div className="settmenu-sub">{item.sub}</div>
          </div>
          <div className="settmenu-arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
        </button>
      ))}
    </>
  );
}
