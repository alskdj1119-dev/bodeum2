'use client';
import { createContext, useContext, useReducer, useRef, useEffect, useState } from 'react';
import { getDb, getFcmToken } from './firebase';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { uid, directFeedMl, directFeedMlFromMs, setDirectFeedRate } from './helpers';

// ── 상태 초기값 ──
const initialDB = { feeds: [], diapers: [], sleeps: [], weights: [], temps: [], trash: [] };
const initialBaby = { name: '아이', prenatal: '', birthDate: '', birthTime: '', birthWeight: '', gender: '' };
const initialNotifSettings = { diaperAlertH: 3, sleepAlertH: 2, feedAlertH: 3, feedTimerAlertMin: 30, hungerRepeatMin: 5, quietStart: 23, quietEnd: 7, quietDisabled: false };
// 직수(직접 수유) 1분당 예상 섭취량 계산 기준 — 기본 "15분 = 40ml".
const initialFeedSettings = { directFeedRateMlPerMin: 40 / 15 };

const BABY_KEY = 'bodeum_baby_info';
const CODE_KEY = 'bodeum_family_code';
const NOTIF_KEY = 'bodeum_notif_settings';
const FEED_SETTINGS_KEY = 'bodeum_feed_settings';
// 이 기기에서 알림을 받을지 여부 (브라우저 권한과 별개 — 권한은 허용된 채로 두고 앱에서만 껐다 켰다 할 수 있게)
const NOTIF_ENABLED_KEY = 'bodeum_notif_enabled';
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
    case 'SET_TEMPS': return { ...state, temps: action.payload };
    case 'SET_TRASH': return { ...state, trash: action.payload };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [db, dispatch] = useReducer(dbReducer, initialDB);
  const [baby, setBaby] = useState(initialBaby);
  const [familyCode, setFamilyCode] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [syncState, setSyncState] = useState('local');
  const [toast, setToast] = useState({ msg: '', show: false });
  const [activeTab, setActiveTab] = useState('home');
  const [tabDir, setTabDir] = useState('forward');
  const [theme, setTheme] = useState('system');
  const [notifSettings, setNotifSettingsState] = useState(initialNotifSettings);
  const [feedSettings, setFeedSettingsState] = useState(initialFeedSettings);
  // 브라우저 알림 권한 상태: 'unsupported' | 'default' | 'granted' | 'denied'
  const [notifPermission, setNotifPermission] = useState('default');
  // 이 기기에서 알림을 받을지 여부. 브라우저 권한(notifPermission)이 'granted'여도
  // 사용자가 앱 안에서 껐다면 이 값이 false — 서버에 이 기기의 FCM 토큰을 등록/해제해 실제 발송 여부를 제어한다.
  const [notifEnabled, setNotifEnabledState] = useState(true);
  // 서버(Cloud Functions)가 최근에 실제로 발송한 알림 내역 (최신순 아님 — 저장 순서 그대로, 오래된 것부터)
  const [notifLog, setNotifLog] = useState([]);
  // 예방접종 체크 상태 — 기존엔 기기별 localStorage에만 저장돼 부부 두 기기 간 동기화가 안 됐음.
  // 다른 기록들과 동일하게 Firestore(가족 문서)로 동기화한다.
  const [vaccineStatus, setVaccineStatusState] = useState({});

  // 모달 상태
  const [openModal, setOpenModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);

  // 건강 패널 초기 탭 (weight 등으로 바로 이동)
  const [healthInitTab, setHealthInitTab] = useState(null);

  // 타이머 상태
  const [feedTimerMs, setFeedTimerMs] = useState(0);
  const [sleepTimerMs, setSleepTimerMs] = useState(0);
  const [pendingConsumedFeedId, setPendingConsumedFeedId] = useState(null);
  const [pendingSideChoiceFeedId, setPendingSideChoiceFeedId] = useState(null);

  const firestoreRef = useRef(null);
  const docRef = useRef(null);
  const unsubRef = useRef(null);
  const toastTO = useRef(null);
  const skipSnapshot = useRef(false);
  const splashStartRef = useRef(Date.now());

  // 초기 로드
  useEffect(() => {
    try {
      const b = localStorage.getItem(BABY_KEY);
      if (b) setBaby(prev => ({ ...prev, ...JSON.parse(b) }));
      const t = localStorage.getItem('bodeum_theme');
      if (t) setTheme(t);
      const ns = localStorage.getItem(NOTIF_KEY);
      if (ns) setNotifSettingsState(prev => ({ ...prev, ...JSON.parse(ns) }));
      const fs = localStorage.getItem(FEED_SETTINGS_KEY);
      if (fs) {
        const parsed = JSON.parse(fs);
        setFeedSettingsState(prev => ({ ...prev, ...parsed }));
        if (parsed.directFeedRateMlPerMin) setDirectFeedRate(parsed.directFeedRateMlPerMin);
      }
      const ne = localStorage.getItem(NOTIF_ENABLED_KEY);
      if (ne != null) setNotifEnabledState(ne === 'true');
    } catch (_) {}

    const savedCode = localStorage.getItem(CODE_KEY);
    if (savedCode) launchApp(savedCode);

    // 현재 브라우저 알림 권한 상태 확인
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission); // 'default' | 'granted' | 'denied'
    } else {
      setNotifPermission('unsupported');
    }

    // 저장된 패밀리 코드가 있는지 확인 자체는 로컬 저장소만 읽으면 되니 몇 ms 만에 끝난다.
    // 그 즉시 스플래시를 내리면 스플래시 이미지가 다 로드되기도 전에 화면이 넘어가버려서
    // (이미지 없는 빈 배경만 잠깐 보이다 사라지는) 사실상 안 보이는 것처럼 되므로,
    // 스플래시가 최소 이만큼(ms)은 사람 눈에 보이도록 강제로 시간을 채운 뒤에 내린다.
    const MIN_SPLASH_MS = 600;
    const elapsed = Date.now() - splashStartRef.current;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(() => setInitializing(false), remaining);
  }, []);

  // FCM(푸시) 토큰을 발급받아 이 가족 문서에 등록한다.
  // 서버(Cloud Functions)가 알림을 보낼 때 이 토큰들로 발송한다.
  // 권한이 이미 허용된 상태에서만 의미가 있고, 여러 번 호출해도 arrayUnion이라 중복 저장되지 않는다.
  async function registerFcmToken() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    if (!docRef.current) return null; // 아직 가족 코드로 접속하지 않음
    try {
      const reg = await navigator.serviceWorker.ready;
      const token = await getFcmToken(reg);
      if (token) {
        // setDoc + merge:true — updateDoc은 문서가 아직 없으면(막 새로 만든 가족 코드) 실패한다.
        await setDoc(docRef.current, { fcmTokens: arrayUnion(token) }, { merge: true });
      }
      return token;
    } catch (e) {
      console.error('FCM 토큰 등록 실패', e);
      return null;
    }
  }

  // 이 기기의 FCM 토큰을 가족 문서에서 제거해, 브라우저 권한은 유지한 채 서버가 이 기기로는
  // 더 이상 푸시를 보내지 않게 한다 (앱 안에서 "알림 끄기"를 눌렀을 때 호출).
  async function unregisterFcmToken() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!docRef.current) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const token = await getFcmToken(reg);
      if (token) {
        await setDoc(docRef.current, { fcmTokens: arrayRemove(token) }, { merge: true });
      }
    } catch (e) {
      console.error('FCM 토큰 해제 실패', e);
    }
  }

  function setNotifEnabled(v) {
    setNotifEnabledState(v);
    try { localStorage.setItem(NOTIF_ENABLED_KEY, v ? 'true' : 'false'); } catch (_) {}
  }

  // 사용자가 "알림 허용하기" 버튼을 눌렀을 때 호출.
  // 반드시 사용자 클릭 등 제스처 안에서 호출해야 iOS Safari 등에서도 권한 요청 창이 뜬다.
  // 브라우저 권한이 이미 granted인 상태(= 앱 안에서만 꺼뒀던 경우)에서 다시 눌러도 이 함수가 그대로
  // "다시 켜기" 역할을 한다 — Notification.requestPermission()은 이미 허용된 경우 즉시 'granted'를 반환한다.
  async function requestNotifPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      showToast('이 기기/브라우저는 알림을 지원하지 않아요');
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      setNotifPermission('granted');
      setNotifEnabled(true);
      showToast('알림이 허용되어 있어요 ✓');
      registerFcmToken();
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      setNotifPermission('denied');
      showToast('알림이 차단돼 있어요. 기기/브라우저 설정에서 이 앱의 알림을 허용해주세요');
      return 'denied';
    }
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        setNotifEnabled(true);
        showToast('알림이 허용됐어요 ✓');
        // 서비스워커 등록 후, 이 기기의 FCM 토큰을 발급받아 가족 문서에 저장한다.
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
        registerFcmToken();
      } else {
        showToast('알림이 허용되지 않았어요');
      }
      return result;
    } catch (e) {
      showToast('알림 권한 요청에 실패했어요 — ' + e.message);
      return 'default';
    }
  }

  // 사용자가 알림 설정에서 "알림 끄기"를 눌렀을 때 호출.
  // 브라우저 권한 자체는 건드리지 않고(되돌릴 수 없음), 이 기기로의 서버 발송만 중단시킨다.
  function disableNotif() {
    setNotifEnabled(false);
    unregisterFcmToken();
    showToast('이 기기의 알림을 껐어요');
  }

  // 테마 적용
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('bodeum_theme', theme); } catch (_) {}
  }, [theme]);

  // 가족 코드로 접속했고 알림 권한이 이미 허용된 상태라면(예: 이전에 허용해둔 채로 앱을 다시 켠 경우)
  // FCM 토큰을 다시 등록해둔다. arrayUnion이라 중복 저장되지 않는다.
  useEffect(() => {
    if (familyCode && notifPermission === 'granted' && notifEnabled) {
      registerFcmToken();
    }
  }, [familyCode, notifPermission, notifEnabled]);

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
          ? {
              feeds: data.feeds || [],
              diapers: data.diapers || [],
              sleeps: data.sleeps || [],
              weights: data.weights || [],
              temps: data.temps || [],
              trash: data.trash || [],
            }
          : initialDB;
        dispatch({ type: 'SET_ALL', payload });
        // 다른 기기에서 아이 정보(이름/생년월일 등)를 입력·수정했을 수도 있으니 함께 동기화한다.
        // (예전엔 기기 로컬 저장소에만 저장돼서 기기마다 "만난지 N일차"가 다르게 보이는 문제가 있었음)
        if (data && data.baby) {
          setBaby(prev => ({ ...prev, ...data.baby }));
          try { localStorage.setItem(BABY_KEY, JSON.stringify({ ...initialBaby, ...data.baby })); } catch (_) {}
        } else {
          // 예전 버전에서 이 기기 로컬 저장소에만 저장해둔 아이 정보가 있다면(가족 문서에는 아직 없음)
          // 딱 한 번 서버로 옮겨서, 이 기기 로컬 저장소 없이도 다른 기기에서 볼 수 있게 한다.
          try {
            const localRaw = localStorage.getItem(BABY_KEY);
            const localBaby = localRaw ? JSON.parse(localRaw) : null;
            if (localBaby && (localBaby.birthDate || (localBaby.name && localBaby.name !== '아이'))) {
              setDoc(docRef.current, { baby: localBaby, babyName: localBaby.name || '아이' }, { merge: true }).catch(() => {});
            }
          } catch (_) {}
        }
        // 다른 기기에서 알림 설정을 바꿨을 수도 있으니 함께 동기화한다.
        if (data && data.notifSettings) {
          setNotifSettingsState(prev => ({ ...prev, ...data.notifSettings }));
        }
        // 다른 기기에서 직수 계산 기준을 바꿨을 수도 있으니 함께 동기화한다.
        if (data && data.feedSettings) {
          setFeedSettingsState(prev => ({ ...prev, ...data.feedSettings }));
          if (data.feedSettings.directFeedRateMlPerMin) setDirectFeedRate(data.feedSettings.directFeedRateMlPerMin);
          try { localStorage.setItem(FEED_SETTINGS_KEY, JSON.stringify(data.feedSettings)); } catch (_) {}
        }
        // 서버(Cloud Functions)가 실제로 보낸 알림 내역
        if (data && Array.isArray(data.notifLog)) {
          setNotifLog(data.notifLog);
        }
        // 다른 기기에서 체크한 예방접종 상태도 함께 동기화한다.
        if (data && data.vaccineStatus) {
          setVaccineStatusState(data.vaccineStatus);
        }
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
      const payload = {
        feeds: data.feeds,
        diapers: data.diapers,
        sleeps: data.sleeps,
        weights: data.weights,
        temps: data.temps || [],
        trash: data.trash || [],
      };
      // 기록 객체에는 `field: cond ? value : undefined` 형태의 선택 필드가 흔하다.
      // Firestore의 ignoreUndefinedProperties 설정에 기대지 않고, JSON 직렬화를 통해
      // undefined 값을 가진 필드를 확실히 제거한 뒤 저장한다 (undefined 필드가 있으면
      // setDoc() 자체가 예외를 던져 "저장 실패" 오류가 발생했었음).
      const clean = JSON.parse(JSON.stringify(payload));
      // merge:true 필수 — 그냥 setDoc()을 쓰면 문서 전체를 통째로 덮어써서
      // notifSettings/babyName/fcmTokens처럼 다른 곳(updateDoc)에서 저장해둔 필드가 사라진다.
      await setDoc(docRef.current, clean, { merge: true });
      setSyncState('online');
    } catch (e) {
      setSyncState('error');
      showToast('저장 실패 — ' + e.message);
    }
  }

  // 직수(직접 수유) 기록 하나를 최종 확정 — 왼쪽/오른쪽 기록된 시간(sideTimes)을
  // 모두 더한 시간으로 최종 ml을 계산해서 amount로 저장한다.
  function finalizeDirectFeed(feedId, sideTimes, baseDB) {
    const keys = Object.keys(sideTimes || {});
    // 양쪽을 다 진행했으면 표시용 side를 'both'로 — 기존 FEED_SIDE_LABEL/필터 로직을 그대로 재사용.
    const side = keys.length === 2 ? 'both' : keys[0];
    const totalMs = Object.values(sideTimes || {}).reduce(
      (acc, t) => acc + (new Date(t.end) - new Date(t.start)), 0
    );
    const amount = directFeedMlFromMs(totalMs);
    const src = baseDB || db;
    const newFeeds = src.feeds.map(f => f.id === feedId ? { ...f, sideTimes, side, amount } : f);
    const newDB = { ...src, feeds: newFeeds };
    dispatch({ type: 'SET_ALL', payload: newDB });
    saveDB(newDB);
  }

  // 진행 중인 수유 타이머 종료 (FeedPanel, HomePanel 등에서 공용으로 사용)
  // 직수(직접 수유)는 한 번에 보통 양쪽 가슴을 다 쓰기 때문에, 한쪽 타이머를 종료하면
  // "반대쪽 타이머를 시작할까요?" 확인 모달(FeedSideChoiceModal)을 띄운다.
  // 이미 양쪽을 다 진행한 상태에서 종료하면(=두 번째 종료) 곧바로 확정한다.
  function stopActiveFeed() {
    const activeFeed = db.feeds.find(f => f.start && !f.end);
    if (!activeFeed) return;
    const endTime = new Date().toISOString();
    const isDirect = activeFeed.type === 'breast' && activeFeed.subtype === 'direct';

    if (isDirect) {
      const sideTimes = { ...(activeFeed.sideTimes || {}) };
      sideTimes[activeFeed.side] = { start: activeFeed.start, end: endTime };
      const otherSide = activeFeed.side === 'left' ? 'right' : 'left';
      const alreadyHasOtherSide = !!sideTimes[otherSide];

      const newFeeds = db.feeds.map(f => f.id !== activeFeed.id ? f : { ...f, end: endTime, sideTimes });
      const newDB = { ...db, feeds: newFeeds };
      dispatch({ type: 'SET_ALL', payload: newDB });

      if (alreadyHasOtherSide) {
        finalizeDirectFeed(activeFeed.id, sideTimes, newDB);
      } else {
        saveDB(newDB);
        setPendingSideChoiceFeedId(activeFeed.id);
        setOpenModal('feedSideChoice');
      }
      return;
    }

    // 유축/분유는 준비량과 실제 섭취량이 다를 수 있어 팝업으로 입력받음.
    const newFeeds = db.feeds.map(f => f.id === activeFeed.id ? { ...f, end: endTime } : f);
    const newDB = { ...db, feeds: newFeeds };
    dispatch({ type: 'SET_ALL', payload: newDB });
    setPendingConsumedFeedId(activeFeed.id);
    saveDB(newDB).then(() => setOpenModal('consumed'));
  }

  // FeedSideChoiceModal에서 "종료" 선택 — 지금까지 기록된 한쪽만으로 확정.
  function finishFeedSideChoice() {
    const feedId = pendingSideChoiceFeedId;
    setPendingSideChoiceFeedId(null);
    setOpenModal(null);
    if (!feedId) return;
    const f = db.feeds.find(x => x.id === feedId);
    if (f) finalizeDirectFeed(feedId, f.sideTimes || {});
  }

  // FeedSideChoiceModal에서 "이어서 하기" 선택 — 반대쪽 타이머를 같은 기록에 이어서 시작.
  function continueOtherSideFeed() {
    const feedId = pendingSideChoiceFeedId;
    setPendingSideChoiceFeedId(null);
    setOpenModal(null);
    if (!feedId) return;
    const f = db.feeds.find(x => x.id === feedId);
    if (!f) return;
    const otherSide = f.side === 'left' ? 'right' : 'left';
    const startTime = new Date().toISOString();
    const newFeeds = db.feeds.map(x => x.id === feedId ? { ...x, side: otherSide, start: startTime, end: undefined } : x);
    const newDB = { ...db, feeds: newFeeds };
    dispatch({ type: 'SET_ALL', payload: newDB });
    saveDB(newDB);
  }

  // 진행 중인 수면 타이머 종료 (SleepPanel, HomePanel 등에서 공용으로 사용)
  function stopActiveSleep() {
    const activeSleep = db.sleeps.find(s => s.start && !s.end);
    if (!activeSleep) return;
    const endTime = new Date().toISOString();
    const newSleeps = db.sleeps.map(s => s.id === activeSleep.id ? { ...s, end: endTime } : s);
    const newDB = { ...db, sleeps: newSleeps };
    dispatch({ type: 'SET_ALL', payload: newDB });
    saveDB(newDB);
  }

  function saveBaby(newBaby) {
    setBaby(newBaby);
    try { localStorage.setItem(BABY_KEY, JSON.stringify(newBaby)); } catch (_) {}
    // 아이 정보 전체(이름/태명/생년월일/출생시간/출생체중/성별)를 가족 문서에 저장해서
    // 가족 구성원이 어떤 기기로 접속하든 동일하게 보이도록 한다.
    // babyName은 예전부터 서버(Cloud Functions)가 알림 문구에 쓰고 있어서 계속 함께 저장한다.
    if (docRef.current) {
      setDoc(docRef.current, { baby: newBaby, babyName: newBaby.name || '아이' }, { merge: true }).catch(() => {});
    }
  }

  function saveVaccineStatus(vs) {
    setVaccineStatusState(vs);
    if (docRef.current) {
      setDoc(docRef.current, { vaccineStatus: vs }, { merge: true }).catch(() => {});
    }
  }

  function saveNotifSettings(ns) {
    setNotifSettingsState(ns);
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(ns)); } catch (_) {}
    // 서버(Cloud Functions)가 알림 조건을 판단할 때 쓸 수 있도록 가족 문서에도 저장해둔다.
    if (docRef.current) {
      setDoc(docRef.current, { notifSettings: ns }, { merge: true }).catch(() => {});
    }
  }

  function saveFeedSettings(fs) {
    setFeedSettingsState(fs);
    setDirectFeedRate(fs.directFeedRateMlPerMin);
    try { localStorage.setItem(FEED_SETTINGS_KEY, JSON.stringify(fs)); } catch (_) {}
    if (docRef.current) {
      setDoc(docRef.current, { feedSettings: fs }, { merge: true }).catch(() => {});
    }
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
    initializing,
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
    healthInitTab, setHealthInitTab,
    feedTimerMs, setFeedTimerMs,
    sleepTimerMs, setSleepTimerMs,
    pendingConsumedFeedId, setPendingConsumedFeedId,
    pendingSideChoiceFeedId, finishFeedSideChoice, continueOtherSideFeed,
    notifSettings, saveNotifSettings,
    feedSettings, saveFeedSettings,
    notifPermission, requestNotifPermission,
    notifEnabled, disableNotif,
    notifLog,
    vaccineStatus, saveVaccineStatus,
    stopActiveFeed, stopActiveSleep,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
