'use client';
import { useApp } from '../lib/store';

const TABS = [
  {
    id: 'home', label: '홈',
    icon: <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  },
  {
    id: 'feed', label: '수유',
    icon: <svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
  },
  {
    id: 'diaper', label: '기저귀',
    icon: <svg viewBox="0 0 24 24"><path d="M2 9.5L5 6h14l3 3.5v5L19 18H5l-3-3.5V9.5z"/><path d="M2 9.5h5l3 3 3-3h5"/></svg>
  },
  {
    id: 'sleep', label: '수면',
    icon: <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  },
  {
    id: 'weight', label: '체중',
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
  },
];

export default function NavBar() {
  const { activeTab, goTab } = useApp();

  return (
    <nav className="bnav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          id={`nav-${tab.id}`}
          className={`nb${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => goTab(tab.id, tab.id === 'home' ? 'back' : 'forward')}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
