import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, runTransaction, query, where, getDocs, writeBatch } from "firebase/firestore";
import { getAuth, signInAnonymously, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCustomToken } from "firebase/auth";
import { FIREBASE } from "../firebase.config.js";

// Cấu hình web app Firebase là thông tin công khai; bảo mật nằm ở firestore.rules.
const config = FIREBASE[__FB_TARGET__];
const app = initializeApp(config);
// Lưu dữ liệu đã tải trên máy: mở lại / đổi CLB hiện ngay bản đã lưu rồi cập nhật ngầm
let fs;
try { fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { fs = getFirestore(app); }
const auth = getAuth(app);
window.FB = { fs, auth, doc, collection, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, runTransaction, query, where, getDocs, writeBatch, signInAnonymously, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCustomToken };
window.FB_TARGET = __FB_TARGET__;
