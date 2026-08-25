'use client';
import { createContext, useContext, useReducer, useRef, useEffect, useState } from 'react';
import { getDb } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { uid } from './helpers';

// ── 상태 초기값 ──
const initialDB = { feeds: [], diapers: [], sleeps: [], weights: [] };
const initialBaby = { name: '김이엘', prenatal: '', birthDate: '', birthTime: '', birthWeight: '' };

const BABY_KEY = 'bodeum_baby_info';
const CODE_KEY = 'bodeum_family_code';
const COLLECTION = 'families';

// ── Context ──
export const AppContext = createContext(null);

function dbReducer(state, action) {
  switch (action.type) {
    case 'SET_ALL': return { ...action.payload };
    case 'SET_FEEDS': return { ...state, feeds: action.payload };
    case 'SET_DIAPERS': return { ...state, diapers: action.payload };
    case 'SET_SLEEPS': return { ...state, sleeps: action.payload };
    case 'SET_WEIGHTS': return { ...state, weights: action.payload };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [db, dispatch] = useReducer(dbReducer, initialDB);
  const [baby, setBaby] = useState(initialBaby);
  const [familyCode, setFamilyCode] = useState(null);
  const [syncState, setSyncState] = useState('local'); // local | connecting | online | error
  const [toast, setToast] = useState({ msg: '', show: false });
  const [activeTab, setActiveTab] = useState('home');
  const [tabDir, setTabDir] = useState('forward');
  const [theme, setTheme] = useState('system');

  // 모달 상태
  const [openModal, setOpenModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);

  // 타이머 상태
  const [feedTimerMs, setFeedTimerMs] = useState(0);
  const [sleepTimerMs, setSleepTimerMs] = useState(0);
  const [linkedSleepId, setLinkedSleepId] = useState(null);
  const [pendingConsumedFeedId, setPendingConsumedFeedId] = useState(null);

  const firestoreRef = useRef(null);
  const docRef = useRef(null);
  const unsubRef = useRef(null);
  const toastTO = useRef(null);
  const skipSnapshot = useRef(false);

  // 초기 로드
  useEffect(() => {
    try {
      const b = localStorage.getItem(BABY_KEY);
      if (b) setBaby(prev => ({ ...prev, ...JSON.parse(b) }));
      const t = localStorage.getItem('bodeum_theme');
      if (t) setTheme(t);
      // Restore linked sleep ID (active during page reload)
      const ls = localStorage.getItem('bodeum_linked_sleep');
      if (ls) setLinkedSleepId(ls);
    } catch (_) {}

    const savedCode = localStorage.getItem(CODE_KEY);
    if (savedCode) launchApp(savedCode);
  }, []);

  // 테마 적용
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('bodeum_theme', theme); } catch (_) {}
  }, [theme]);

  function showToast(msg) {
    setToast({ msg, show: true });
    clearTimeout(toastTO.current);
    toastTO.current = setTimeout(() => setToast(p => ({ ...p, show: false })), 2800);
  }

  function launchApp(code) {
    setFamilyCode(code);
    try { localStorage.setItem(CODE_KEY, code); } catch (_) {}
    const fireDb = getDb();
    firestoreRef.current = fireDb;
    docRef.current = doc(fireDb, COLLECTION, code);
    subscribeToData();
  }

  function subscribeToData() {
    if (unsubRef.current) unsubRef.current();
    setSyncState('connecting');
    unsubRef.current = onSnapshot(
      docRef.current,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        if (skipSnapshot.current) { skipSnapshot.current = false; return; }
        const data = snapshot.data();
        const payload = data
          ? { feeds: data.feeds||[], diapers: data.diapers||[], sleeps: data.sleeps||[], weights: data.weights||[] }
          : initialDB;
        dispatch({ type: 'SET_ALL', payload });
        setSyncState(snapshot.metadata.fromCache ? 'cache' : 'online');
      },
      (err) => {
        setSyncState('error');
        showToast('연결 오류: ' + err.message);
      }
    );
  }

  async function saveDB(newDB) {
    const data = newDB || db;
    setSyncState('saving');
    try {
      await setDoc(docRef.current, {
        feeds: data.feeds,
        diapers: data.diapers,
        sleeps: data.sleeps,
        weights: data.weights
      });
      setSyncState('online');
    } catch (e) {
      setSyncState('error');
      showToast('저장 실패 — ' + e.message);
    }
  }

  function saveBaby(newBaby) {
    setBaby(newBaby);
    try { localStorage.setItem(BABY_KEY, JSON.stringify(newBaby)); } catch (_) {}
  }

  function goTab(tab, dir = 'forward') {
    setTabDir(dir);
    setActiveTab(tab);
  }

  function toggleTheme() {
    setTheme(prev => {
      if (prev === 'system') return 'dark';
      if (prev === 'dark') return 'light';
      return 'system';
    });
  }

  const value = {
    db, dispatch,
    baby, saveBaby,
    familyCode, launchApp,
    syncState,
    toast, showToast,
    activeTab, tabDir, goTab,
    theme, toggleTheme,
    saveDB,
    uid,
    docRef,
    openModal, setOpenModal,
    editId, setEditId,
    editType, setEditType,
    feedTimerMs, setFeedTimerMs,
    sleepTimerMs, setSleepTimerMs,
    linkedSleepId, setLinkedSleepId,
    pendingConsumedFeedId, setPendingConsumedFeedId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
