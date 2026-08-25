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
import WeightPanel from './panels/WeightPanel';
import SettingsPanel from './panels/SettingsPanel';
import ChangelogPanel from './panels/ChangelogPanel';
import RequestsPanel from './panels/RequestsPanel';
import StatsPanel from './panels/StatsPanel';
import HealthPanel from './panels/HealthPanel';
import FeedModal from './modals/FeedModal';
import DiaperModal from './modals/DiaperModal';
import SleepModal from './modals/SleepModal';
import WeightModal from './modals/WeightModal';
import ConsumedModal from './modals/ConsumedModal';
import TempModal from './modals/TempModal';

const PANELS = ['home', 'feed', 'diaper', 'sleep', 'weight', 'settings', 'changelog', 'requests', 'stats', 'health'];
const SUB_PANELS = ['changelog', 'requests', 'stats', 'health'];

function sendToSW(lastFeedTime, activeFeedStart, babyName, lastDiaperTime, activeSleepStart) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    if (reg.active) reg.active.postMessage({
      type: 'FEED_UPDATE', lastFeedTime, activeFeedStart, babyName, lastDiaperTime, activeSleepStart,
    });
  }).catch(() => {});
}

export default function BodeumApp() {
  const {
    familyCode, db, baby,
    activeTab, tabDir, goTab,
    feedTimerMs, setFeedTimerMs,
    sleepTimerMs, setSleepTimerMs,
    openModal, setOpenModal,
    pendingConsumedFeedId,
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

  // Feed timer
  useEffect(() => {
    const activeFeed = db.feeds.find(f => f.start && !f.end);
    if (!activeFeed) { setFeedTimerMs(0); return; }
    const tick = () => {
      setFeedTimerMs(Date.now() - new Date(activeFeed.start).getTime());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [db.feeds]);

  // Sleep timer
  useEffect(() => {
    const activeSleep = db.sleeps.find(s => s.start && !s.end);
    if (!activeSleep) { setSleepTimerMs(0); return; }
    const tick = () => {
      setSleepTimerMs(Date.now() - new Date(activeSleep.start).getTime());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [db.sleeps]);

  // Notify SW on db change
  useEffect(() => {
    const lastFeed = [...db.feeds].sort((a,b) => (b.end||b.start||'').localeCompare(a.end||a.start||'')).find(f => f.end);
    const activeFeed = db.feeds.find(f => f.start && !f.end);
    const lastDiaper = [...db.diapers].sort((a,b) => b.time > a.time ? 1 : -1)[0];
    const activeSleep = db.sleeps.find(s => s.start && !s.end);
    sendToSW(
      lastFeed?.end || lastFeed?.start,
      activeFeed?.start,
      baby.name,
      lastDiaper?.time,
      activeSleep?.start,
    );
  }, [db, baby.name]);

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

  // Swipe back gesture
  function handleTouchStart(e) {
    if (e.touches[0].clientX < 30) {
      touchStartX.current = e.touches[0].clientX;
    } else {
      touchStartX.current = null;
    }
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60) {
      goTab('home', 'back');
    }
    touchStartX.current = null;
  }

  const panelRef = (id) => (el) => { panelRefs.current[id] = el; };

  const isSubPanel = SUB_PANELS.includes(activeTab);
  const showBack = isSubPanel;

  function handleBack() {
    if (activeTab === 'changelog' || activeTab === 'requests' || activeTab === 'stats' || activeTab === 'health') goTab('settings', 'back');
    else if (activeTab === 'settings') goTab('home', 'back');
    else goTab('home', 'back');
  }

  if (!familyCode) return <SetupScreen />;

  return (
    <div className="app-root" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <Header showBack={showBack} onBack={handleBack} />

      <div className="content">
        <div className="panel" ref={panelRef('home')}><HomePanel /></div>
        <div className="panel" ref={panelRef('feed')}><FeedPanel /></div>
        <div className="panel" ref={panelRef('diaper')}><DiaperPanel /></div>
        <div className="panel" ref={panelRef('sleep')}><SleepPanel /></div>
        <div className="panel" ref={panelRef('weight')}><WeightPanel /></div>
        <div className="panel" ref={panelRef('settings')}><SettingsPanel /></div>
        <div className="panel" ref={panelRef('changelog')}><ChangelogPanel /></div>
        <div className="panel" ref={panelRef('requests')}><RequestsPanel /></div>
        <div className="panel" ref={panelRef('stats')}><StatsPanel /></div>
        <div className="panel" ref={panelRef('health')}><HealthPanel /></div>
      </div>

      <NavBar />

      {openModal === 'feed' && <FeedModal />}
      {openModal === 'diaper' && <DiaperModal />}
      {openModal === 'sleep' && <SleepModal />}
      {openModal === 'weight' && <WeightModal />}
      {openModal === 'consumed' && <ConsumedModal />}
      {openModal === 'temp' && <TempModal />}

      <Toast />
    </div>
  );
}
