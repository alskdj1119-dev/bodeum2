'use client';
import { useEffect, useRef } from 'react';
import { useApp } from '../lib/store';
import SetupScreen from './SetupScreen';
import Header from './Header';
import NavBar from './NavBar';
import Toast from './Toast';
import HomePanel from './panels/HomePanel';
import FeedPanel from './panels/FeedPanel';
import DiaperPanel from './panels/DiaperPanel';
import SleepPanel from './panels/SleepPanel';
import SettingsPanel from './panels/SettingsPanel';
import BabyInfoPanel from './panels/BabyInfoPanel';
import FeedSettingsPanel from './panels/FeedSettingsPanel';
import CardColorSettingsPanel from './panels/CardColorSettingsPanel';
import RecalcFeedsPanel from './panels/RecalcFeedsPanel';
import FamilyCodePanel from './panels/FamilyCodePanel';
import NotifSettingsPanel from './panels/NotifSettingsPanel';
import ChangelogPanel from './panels/ChangelogPanel';
import RequestsPanel from './panels/RequestsPanel';
import TrashPanel from './panels/TrashPanel';
import NotifHistoryPanel from './panels/NotifHistoryPanel';
import StatsPanel from './panels/StatsPanel';
import HealthPanel from './panels/HealthPanel';
import TrackingPanel from './panels/TrackingPanel';
import GrowthPanel from './panels/GrowthPanel';
import FeedModal from './modals/FeedModal';
import FeedSideChoiceModal from './modals/FeedSideChoiceModal';
import DiaperModal from './modals/DiaperModal';
import SleepModal from './modals/SleepModal';
import WeightModal from './modals/WeightModal';
import ConsumedModal from './modals/ConsumedModal';
import TempModal from './modals/TempModal';
import ActiveTimerEditModal from './modals/ActiveTimerEditModal';
import OrientationGuard from './OrientationGuard';

const PANELS = ['home', 'tracking', 'feed', 'diaper', 'sleep', 'health', 'growth', 'stats', 'settings', 'changelog', 'requests', 'trash', 'notifHistory', 'babyInfo', 'notifSettings', 'familyCode', 'feedSettings', 'recalcFeeds', 'cardColorSettings'];
const SUB_PANELS = ['changelog', 'requests', 'trash', 'notifHistory', 'babyInfo', 'notifSettings', 'familyCode', 'feedSettings', 'recalcFeeds', 'cardColorSettings', 'feed', 'diaper', 'sleep', 'stats', 'settings'];
// 각 서브 패널에서 뒤로가기(버튼/스와이프) 시 돌아갈 곳.
// notifHistory는 홈 화면 종 모양 아이콘으로 들어오므로 홈으로, 나머지 설정 하위 화면은 설정으로 돌아간다.
const BACK_TARGET = {
  feed: 'tracking', diaper: 'tracking', sleep: 'tracking',
  stats: 'settings',
  settings: 'home',
  changelog: 'settings', requests: 'settings', trash: 'settings',
  babyInfo: 'settings', notifSettings: 'settings', familyCode: 'settings',
  feedSettings: 'settings',
  cardColorSettings: 'settings',
  recalcFeeds: 'feedSettings',
  notifHistory: 'home',
};

export default function BodeumApp() {
  const {
    familyCode, db,
    activeTab, tabDir, goTab,
    setFeedTimerMs,
    setSleepTimerMs,
    openModal,
    filterByActiveBaby, activeBabyId,
  } = useApp();

  const panelRefs = useRef({});
  const prevTabRef = useRef('home');
  const animatingRef = useRef(false);
  const touchStartX = useRef(null);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Feed timer — 지금 보고 있는 아이의 진행 중인 수유만 카운트한다.
  useEffect(() => {
    const activeFeed = filterByActiveBaby(db.feeds).find(f => f.start && !f.end);
    if (!activeFeed) { setFeedTimerMs(0); return; }
    const tick = () => {
      setFeedTimerMs(Date.now() - new Date(activeFeed.start).getTime());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [db.feeds, activeBabyId]);

  // Sleep timer — 지금 보고 있는 아이의 진행 중인 수면만 카운트한다.
  useEffect(() => {
    const activeSleep = filterByActiveBaby(db.sleeps).find(s => s.start && !s.end);
    if (!activeSleep) { setSleepTimerMs(0); return; }
    const tick = () => {
      setSleepTimerMs(Date.now() - new Date(activeSleep.start).getTime());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [db.sleeps, activeBabyId]);

  // Panel slide animation
  useEffect(() => {
    const cur = activeTab;
    const prev = prevTabRef.current;
    if (cur === prev) return;

    const dir = tabDir;
    const prevEl = panelRefs.current[prev];
    const curEl = panelRefs.current[cur];
    if (!prevEl || !curEl) { prevTabRef.current = cur; return; }

    if (animatingRef.current) {
      // cancel in-progress
      PANELS.forEach(p => {
        const el = panelRefs.current[p];
        if (el) {
          el.classList.remove('active','animating','slide-out-right','slide-out-left','slide-in-from-left','slide-in-from-right');
          el.style.display = 'none';
        }
      });
    }

    animatingRef.current = true;

    // Show both panels
    prevEl.style.display = '';
    curEl.style.display = '';
    prevEl.classList.add('active');
    curEl.classList.remove('active');

    if (dir === 'forward') {
      curEl.classList.add('slide-in-from-right');
      prevEl.classList.add('slide-out-left');
    } else {
      curEl.classList.add('slide-in-from-left');
      prevEl.classList.add('slide-out-right');
    }

    // Force reflow
    void curEl.offsetWidth;

    curEl.classList.add('animating');
    prevEl.classList.add('animating');

    curEl.classList.add('active');

    const cleanup = setTimeout(() => {
      PANELS.forEach(p => {
        const el = panelRefs.current[p];
        if (!el) return;
        el.classList.remove('animating','slide-out-right','slide-out-left','slide-in-from-left','slide-in-from-right');
        if (p !== cur) {
          el.classList.remove('active');
          el.style.display = 'none';
        }
      });
      animatingRef.current = false;
      prevTabRef.current = cur;
    }, 320);

    return () => clearTimeout(cleanup);
  }, [activeTab, tabDir]);

  // Initial panel visibility — runs when panels first appear (familyCode goes truthy)
  useEffect(() => {
    if (!familyCode) return;
    PANELS.forEach(p => {
      const el = panelRefs.current[p];
      if (!el) return;
      if (p === 'home') {
        el.classList.add('active');
        el.style.display = '';
      } else {
        el.classList.remove('active');
        el.style.display = 'none';
      }
    });
  }, [familyCode]);

  // Swipe back gesture (left-edge swipe)
  // home, settings → no swipe back (top-level tabs)
  // feed/diaper/sleep/weight → back to home
  // stats/health/설정 하위 화면 → back to settings (BACK_TARGET 참고)
  function handleTouchStart(e) {
    if (BACK_TARGET[activeTab] && e.touches[0].clientX < 30) {
      touchStartX.current = e.touches[0].clientX;
    } else {
      touchStartX.current = null;
    }
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60) {
      const dest = BACK_TARGET[activeTab];
      if (dest) goTab(dest, 'back');
    }
    touchStartX.current = null;
  }

  const panelRef = (id) => (el) => { panelRefs.current[id] = el; };

  const isSubPanel = SUB_PANELS.includes(activeTab);
  const showBack = isSubPanel;

  function handleBack() {
    goTab(BACK_TARGET[activeTab] || 'home', 'back');
  }

  if (!familyCode) return <SetupScreen />;

  return (
    <div className="app-root" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <Header showBack={showBack} onBack={handleBack} activeTab={activeTab} />

      <div className="content">
        <div className="panel" ref={panelRef('home')}><HomePanel /></div>
        <div className="panel" ref={panelRef('tracking')}><TrackingPanel /></div>
        <div className="panel" ref={panelRef('feed')}><FeedPanel /></div>
        <div className="panel" ref={panelRef('diaper')}><DiaperPanel /></div>
        <div className="panel" ref={panelRef('sleep')}><SleepPanel /></div>
        <div className="panel" ref={panelRef('growth')}><GrowthPanel /></div>
        <div className="panel" ref={panelRef('settings')}><SettingsPanel /></div>
        <div className="panel" ref={panelRef('babyInfo')}><BabyInfoPanel /></div>
        <div className="panel" ref={panelRef('feedSettings')}><FeedSettingsPanel /></div>
        <div className="panel" ref={panelRef('recalcFeeds')}><RecalcFeedsPanel /></div>
        <div className="panel" ref={panelRef('cardColorSettings')}><CardColorSettingsPanel /></div>
        <div className="panel" ref={panelRef('familyCode')}><FamilyCodePanel /></div>
        <div className="panel" ref={panelRef('notifSettings')}><NotifSettingsPanel /></div>
        <div className="panel" ref={panelRef('changelog')}><ChangelogPanel /></div>
        <div className="panel" ref={panelRef('requests')}><RequestsPanel /></div>
        <div className="panel" ref={panelRef('stats')}><StatsPanel /></div>
        <div className="panel" ref={panelRef('health')}><HealthPanel /></div>
        <div className="panel" ref={panelRef('trash')}><TrashPanel /></div>
        <div className="panel" ref={panelRef('notifHistory')}><NotifHistoryPanel /></div>
      </div>

      <NavBar />

      {openModal === 'feed' && <FeedModal />}
      {openModal === 'feedSideChoice' && <FeedSideChoiceModal />}
      {openModal === 'diaper' && <DiaperModal />}
      {openModal === 'sleep' && <SleepModal />}
      {openModal === 'weight' && <WeightModal />}
      {openModal === 'consumed' && <ConsumedModal />}
      {openModal === 'temp' && <TempModal />}
      {openModal === 'activeTimerEdit' && <ActiveTimerEditModal />}

      <Toast />

      <OrientationGuard />
    </div>
  );
}
