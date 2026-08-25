import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  enableMultiTabIndexedDbPersistence,
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  arrayUnion
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyCGLZ0pOpZUgZTNOwSQEMSFXfAzm3iwijo",
  authDomain:        "kimel-54750.firebaseapp.com",
  projectId:         "kimel-54750",
  storageBucket:     "kimel-54750.firebasestorage.app",
  messagingSenderId: "757482265597",
  appId:             "1:757482265597:web:30754353e74466c3465794"
};

// Cloud Messaging 웹 푸시 인증서(VAPID) 공개 키 — Firebase 콘솔 > 프로젝트 설정 > Cloud Messaging에서 발급
const VAPID_KEY = "BODlOgetCIdy_TMTckhm-UcnB9MGp0Kx3eANL2qBz1hZw1ti9i8ILVAwx8LVcTu7MNqFZtFnPLF7XjPkXowZQM0";

let _app = null;
let _db = null;

export function getDb() {
  if (!_db) {
    _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    // 기록 객체에는 `field: cond ? value : undefined` 형태로 선택 필드가 자주 존재한다.
    // 기본 Firestore 설정은 undefined 값을 만나면 setDoc() 자체를 예외로 실패시키므로
    // (예: 수유 타이머 종료 시 "저장 실패" 오류), undefined 필드는 자동으로 무시하도록 설정한다.
    try {
      _db = initializeFirestore(_app, { ignoreUndefinedProperties: true });
    } catch (_) {
      // 이미 다른 설정으로 초기화된 경우(e.g. HMR) fallback
      _db = getFirestore(_app);
    }
    enableMultiTabIndexedDbPersistence(_db).catch(() => {});
  }
  return _db;
}

// 이 기기의 FCM(푸시) 등록 토큰을 발급받는다.
// 알림 권한이 허용된 상태에서만 호출해야 하고, 기존에 등록해둔 서비스워커(swRegistration)를
// 그대로 넘겨줘야 별도의 firebase-messaging-sw.js 없이 우리 sw.js가 푸시를 받을 수 있다.
export async function getFcmToken(swRegistration) {
  if (typeof window === 'undefined') return null;
  try {
    const { getMessaging, isSupported, getToken } = await import('firebase/messaging');
    const supported = await isSupported().catch(() => false);
    if (!supported) return null;
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
    return token || null;
  } catch (e) {
    console.error('FCM 토큰 발급 실패', e);
    return null;
  }
}

export { collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, getDocs, arrayUnion };
