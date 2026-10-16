import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, runTransaction, query, where, getDocs, writeBatch } from "firebase/firestore";
import { getAuth, signInAnonymously, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { FIREBASE } from "../firebase.config.js";

// Cấu hình web app Firebase là thông tin công khai; bảo mật nằm ở firestore.rules.
const config = FIREBASE[__FB_TARGET__];
const app = initializeApp(config);
const fs = getFirestore(app), auth = getAuth(app);
window.FB = { fs, auth, doc, collection, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, runTransaction, query, where, getDocs, writeBatch, signInAnonymously, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult };
window.FB_TARGET = __FB_TARGET__;
