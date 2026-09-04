'use client';
import { createContext, useContext, useReducer, useRef, useEffect, useState } from 'react';
import { getDb, getFcmToken } from './firebase';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { uid, directFeedMl, directFeedMlFromMs, directFeedDurationMs, setDirectFeedRate, setElapsedTierMinutes } from './helpers';

// ── 상태 초기값 ──
const initialDB = { feeds: [], diapers: [], sleeps: [], weights: [], temps: [], trash: [] };
function makeBaby(overrides) {
  return { id: uid(), name: '아이', prenatal: '', birthDate: '', birthTime: '', birthWeight: '', gender: '', ...overrides };
}
// 아직 아이가 하나도 등록되지 않았을 때 화면에 보여줄 빈 플레이스홀더 (id: null — 저장 시 새로 생성됨)
const PLACEHOLDER_BABY = { id: null, name: '아이', prenatal: '', birthDate: '', birthTime: '', birthWeight: '', gender: '' };
const initialNotifSettings = { diaperAlertH: 3, sleepAlertH: 2, feedAlertH: 3, feedTimerAlertMin: 30, hungerRepeatMin: 5, quietStart: 23, quietEnd: 7, quietDisabled: false };
// 직수(직접 수유) 1분당 예상 섭취량 계산 기준 — 기본 "15분 = 40ml".
const initialFeedSettings = { directFeedRateMlPerMin: 40 / 15 };
// "직전" 카드 경과시간별 색상 단계 기준 (분) — 기본 1시간/2시간/3시간.
const initialCardColorSettings = { cautionMin: 60, warnMin: 120, alertMin: 180 };

const BABY_KEY = 'bodeum_baby_info'; // 예전 버전(단일 아이) 로컬 저장 — 마이그레이션 용도로만 읽음
const BABIES_KEY = 'bodeum_babies';
const ACTIVE_BABY_KEY = 'bodeum_active_baby_id';
const CODE_KEY = 'bodeum_family_code';
const NOTIF_KEY = 'bodeum_notif_settings';
const FEED_SETTINGS_KEY = 'bodeum_feed_settings';
const CARD_COLOR_SETTINGS_KEY = 'bodeum_card_color_settings';
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
  // 다중 아이 지원 — 가족 문서 하나 안에 여러 아이를 등록해두고, 이 기기에서 지금 보고 있는
  // '활성 아이'만 activeBabyId로 고른다 (기기별 로컬 선택 — 가족 구성원마다 다른 아이를 볼 수도 있으므로 동기화 안 함).
  const [babies, setBabies] = useState([]);
  const [activeBabyId, setActiveBabyIdState] = useState(null);
  const migratedBabyRef = useRef(false);
  const [familyCode, setFamilyCode] = useState(null);
  const [syncState, setSyncState] = useState('local');
  const [toast, setToast] = useState({ msg: '', show: false });
  const [activeTab, setActiveTab] = useState('home');
  const [tabDir, setTabDir] = useState('forward');
  const [theme, setTheme] = useState('system');
  const [notifSettings, setNotifSettingsState] = useState(initialNotifSettings);
  const [feedSettings, setFeedSettingsState] = useState(initialFeedSettings);
  const [cardColorSettings, setCardColorSettingsState] = useState(initialCardColorSettings);
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

  // 초기 로드
  useEffect(() => {
    try {
      // 다중 아이 로컬 캐시 — Firestore 연결 전에도 화면이 비어 보이지 않도록 우선 로드.
      const bs = localStorage.getItem(BABIES_KEY);
      if (bs) {
        const parsedBabies = JSON.parse(bs);
        if (Array.isArray(parsedBabies) && parsedBabies.length > 0) setBabies(parsedBabies);
      } else {
        // 예전 버전(단일 아이) 로컬 저장 데이터가 있다면 배열로 마이그레이션.
        const b = localStorage.getItem(BABY_KEY);
        if (b) {
          const oldBaby = JSON.parse(b);
          if (oldBaby && (oldBaby.birthDate || (oldBaby.name && oldBaby.name !== '아이'))) {
            const migrated = [makeBaby(oldBaby)];
            setBabies(migrated);
            try { localStorage.setItem(BABIES_KEY, JSON.stringify(migrated)); } catch (_) {}
          }
        }
      }
      const savedActiveId = localStorage.getItem(ACTIVE_BABY_KEY);
      if (savedActiveId) setActiveBabyIdState(savedActiveId);
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
      const ccs = localStorage.getItem(CARD_COLOR_SETTINGS_KEY);
      if (ccs) {
        const parsedCcs = JSON.parse(ccs);
        setCardColorSettingsState(prev => ({ ...prev, ...parsedCcs }));
        setElapsedTierMinutes(parsedCcs);
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

  // 활성 아이(현재 이 기기에서 보고 있는 아이) — 목록이 비어있거나 activeBabyId가 목록에 없으면
  // 첫 번째 아이로, 그마저 없으면 빈 플레이스홀더로 안전하게 대체한다.
  // (기존 화면들이 전부 `baby.name`처럼 항상 객체라고 가정하고 쓰고 있어서, 이 이름을 그대로 유지한다)
  const activeBaby = babies.find(b => b.id === activeBabyId) || babies[0] || PLACEHOLDER_BABY;
  const baby = activeBaby;

  // 활성 아이가 바뀌거나(다른 아이로 전환) 목록이 로드되면 activeBabyId를 실제 존재하는 값으로 맞춰준다.
  useEffect(() => {
    if (babies.length === 0) return;
    if (!babies.find(b => b.id === activeBabyId)) {
      const firstId = babies[0].id;
      setActiveBabyIdState(firstId);
      try { localStorage.setItem(ACTIVE_BABY_KEY, firstId); } catch (_) {}
    }
  }, [babies, activeBabyId]);

  // 아이 성별에 따라 테마 강조색(파랑/분홍)을 자동 전환 — 수유/기저귀/수면처럼 종류별로 구분해야 하는
  // 색은 그대로 두고, 프로필/기본 강조색(--sage)만 성별에 맞게 바뀌도록 CSS에서 처리한다.
  useEffect(() => {
    const root = document.documentElement;
    if (baby.gender === 'boy' || baby.gender === 'girl') root.setAttribute('data-gender', baby.gender);
    else root.removeAttribute('data-gender');
  }, [baby.gender]);

  // 특정 아이(babyId)에 속한 기록만 걸러낸다. babyId가 없는 예전 기록(다중 아이 지원 이전에 만들어짐)은
  // 첫 번째 아이의 기록으로 간주한다 — 데이터 마이그레이션 없이도 기존 기록이 사라져 보이지 않도록.
  function filterByActiveBaby(list) {
    if (!Array.isArray(list)) return list;
    if (babies.length <= 1) return list; // 아이가 1명뿐이면 필터링 의미 없음 — 그대로 반환
    const firstId = babies[0]?.id;
    return list.filter(item => (item.babyId || firstId) === activeBabyId);
  }

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
        // 다중 아이 배열 동기화 — 다른 기기에서 아이 정보를 추가/수정했을 수도 있으니 함께 반영한다.
        if (data && Array.isArray(data.babies) && data.babies.length > 0) {
          setBabies(data.babies);
          try { localStorage.setItem(BABIES_KEY, JSON.stringify(data.babies)); } catch (_) {}
        } else if (data && data.baby) {
          // 예전 버전(단일 아이) 가족 문서 — 한 번만 배열로 마이그레이션해서 서버에도 반영한다.
          if (!migratedBabyRef.current) {
            migratedBabyRef.current = true;
            const migrated = [makeBaby(data.baby)];
            setBabies(migrated);
            try { localStorage.setItem(BABIES_KEY, JSON.stringify(migrated)); } catch (_) {}
            setDoc(docRef.current, { babies: migrated }, { merge: true }).catch(() => {});
          }
        } else {
          // 예전 버전에서 이 기기 로컬 저장소에만 저장해둔 아이 정보가 있다면(가족 문서에는 아직 없음)
          // 딱 한 번 서버로 옮겨서, 이 기기 로컬 저장소 없이도 다른 기기에서 볼 수 있게 한다.
          try {
            const localRaw = localStorage.getItem(BABY_KEY);
            const localBaby = localRaw ? JSON.parse(localRaw) : null;
            if (localBaby && (localBaby.birthDate || (localBaby.name && localBaby.name !== '아이')) && !migratedBabyRef.current) {
              migratedBabyRef.current = true;
              const migrated = [makeBaby(localBaby)];
              setBabies(migrated);
              try { localStorage.setItem(BABIES_KEY, JSON.stringify(migrated)); } catch (_) {}
              setDoc(docRef.current, { babies: migrated, babyName: localBaby.name || '아이' }, { merge: true }).catch(() => {});
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
        // 다른 기기에서 카드 색상 설정을 바꿨을 수도 있으니 함께 동기화한다.
        if (data && data.cardColorSettings) {
          setCardColorSettingsState(prev => ({ ...prev, ...data.cardColorSettings }));
          setElapsedTierMinutes(data.cardColorSettings);
          try { localStorage.setItem(CARD_COLOR_SETTINGS_KEY, JSON.stringify(data.cardColorSettings)); } catch (_) {}
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
  // 직수 계산 설정을 바꾼 뒤, 이미 저장돼 있는 특정 직수 기록들을 골라서
  // 현재 설정(getDirectFeedRate)으로 amount를 다시 계산해 저장한다.
  // (설정 변경이 예전 기록들을 자동으로 소급 변경하진 않고, 사용자가 "다시 계산" 화면에서
  //  기간/기록을 직접 골라야만 이 함수가 호출된다 — 아기가 자라며 실제 섭취량 기준이
  //  달라지는 것과, 설정을 잘못 입력해 최근 기록을 바로잡고 싶은 경우를 구분하기 위함)
  function recalcDirectFeedAmounts(feedIds) {
    const idSet = new Set(feedIds);
    if (idSet.size === 0) return;
    const newFeeds = db.feeds.map(f => {
      if (!idSet.has(f.id)) return f;
      const ms = directFeedDurationMs(f);
      return { ...f, amount: directFeedMlFromMs(ms) };
    });
    const newDB = { ...db, feeds: newFeeds };
    dispatch({ type: 'SET_ALL', payload: newDB });
    saveDB(newDB);
  }

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

  // 아이 정보 저장 — id가 없으면(플레이스홀더 편집 = 새 아이 추가) 새로 만들어 목록에 추가하고
  // 그 아이를 바로 활성 아이로 전환한다. id가 있으면 해당 아이 정보만 갱신한다.
  function saveBaby(newBaby) {
    const isNew = !newBaby.id;
    const finalBaby = isNew ? { ...newBaby, id: uid() } : newBaby;
    setBabies(prev => {
      const list = isNew ? [...prev, finalBaby] : prev.map(b => b.id === finalBaby.id ? finalBaby : b);
      try { localStorage.setItem(BABIES_KEY, JSON.stringify(list)); } catch (_) {}
      // babyName은 예전부터 서버(Cloud Functions)가 알림 문구에 쓰고 있어서, 첫 번째 아이 이름으로 계속 함께 저장한다.
      if (docRef.current) {
        setDoc(docRef.current, { babies: list, babyName: (list[0] && list[0].name) || '아이' }, { merge: true }).catch(() => {});
      }
      return list;
    });
    if (isNew) {
      setActiveBabyIdState(finalBaby.id);
      try { localStorage.setItem(ACTIVE_BABY_KEY, finalBaby.id); } catch (_) {}
    }
  }

  // 이 기기에서 보고 있을 아이를 전환 (가족 문서에는 저장하지 않음 — 기기별 로컬 선택)
  function switchBaby(id) {
    setActiveBabyIdState(id);
    try { localStorage.setItem(ACTIVE_BABY_KEY, id); } catch (_) {}
  }

  // 아이 삭제 — 그 아이에게 달려있던 기록(babyId)은 지우지 않고 그대로 남겨둔다(휴지통과 별개로,
  // 데이터 유실을 막기 위함). 필요하면 나중에 별도로 정리할 수 있다.
  function deleteBaby(id) {
    setBabies(prev => {
      const list = prev.filter(b => b.id !== id);
      try { localStorage.setItem(BABIES_KEY, JSON.stringify(list)); } catch (_) {}
      if (docRef.current) {
        setDoc(docRef.current, { babies: list, babyName: (list[0] && list[0].name) || '아이' }, { merge: true }).catch(() => {});
      }
      return list;
    });
    if (activeBabyId === id) {
      const next = babies.find(b => b.id !== id);
      switchBaby(next ? next.id : null);
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

  function saveCardColorSettings(ccs) {
    setCardColorSettingsState(ccs);
    setElapsedTierMinutes(ccs);
    try { localStorage.setItem(CARD_COLOR_SETTINGS_KEY, JSON.stringify(ccs)); } catch (_) {}
    if (docRef.current) {
      setDoc(docRef.current, { cardColorSettings: ccs }, { merge: true }).catch(() => {});
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
    babies, activeBabyId, switchBaby, deleteBaby, filterByActiveBaby,
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
    healthInitTab, setHealthInitTab,
    feedTimerMs, setFeedTimerMs,
    sleepTimerMs, setSleepTimerMs,
    pendingConsumedFeedId, setPendingConsumedFeedId,
    pendingSideChoiceFeedId, finishFeedSideChoice, continueOtherSideFeed,
    notifSettings, saveNotifSettings,
    feedSettings, saveFeedSettings, recalcDirectFeedAmounts,
    cardColorSettings, saveCardColorSettings,
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
