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

// 환경변수(.env.local, Vercel 프로젝트 설정)로 주입된다 — 운영(prod)/개발(dev) Firebase
// 프로젝트를 분리해서 쓰기 위함. 개발 중 실수로 실 데이터를 건드리는 걸 막기 위해
// 하드코딩된 값 없이, 값이 없으면 명확하게 에러를 내도록 한다.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Cloud Messaging 웹 푸시 인증서(VAPID) 공개 키 — Firebase 콘솔 > 프로젝트 설정 > Cloud Messaging에서 발급.
// 운영/개발 프로젝트마다 다르므로 이것도 환경변수로 관리한다.
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

if (typeof window !== 'undefined' && !firebaseConfig.projectId) {
  // 로컬에서 .env.local을 안 만들었거나, Vercel에 환경변수를 설정하지 않은 경우
  // "화면은 뜨는데 저장이 안 됨" 같은 알아채기 힘든 오류 대신 콘솔에 바로 원인이 보이게 한다.
  console.error(
    '[firebase] NEXT_PUBLIC_FIREBASE_* 환경변수가 설정되지 않았어요. ' +
    '.env.local(로컬) 또는 Vercel 프로젝트 설정(배포)에 값을 넣어주세요.'
  );
}

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
