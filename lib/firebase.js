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
  getDocs
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyCGLZ0pOpZUgZTNOwSQEMSFXfAzm3iwijo",
  authDomain:        "kimel-54750.firebaseapp.com",
  projectId:         "kimel-54750",
  storageBucket:     "kimel-54750.firebasestorage.app",
  messagingSenderId: "757482265597",
  appId:             "1:757482265597:web:30754353e74466c3465794"
};

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

export { collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, getDocs };
