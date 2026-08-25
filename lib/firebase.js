import { initializeApp, getApps } from 'firebase/app';
import {
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
    _db = getFirestore(_app);
    enableMultiTabIndexedDbPersistence(_db).catch(() => {});
  }
  return _db;
}

export { collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, getDocs };
