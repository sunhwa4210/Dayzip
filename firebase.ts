// firebase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCPOj3YH8pl6tBXTxurWxYcSuGHbde_QAY',
  authDomain: 'dayzip-535f3.firebaseapp.com',
  projectId: 'dayzip-535f3',
  storageBucket: 'dayzip-535f3.firebasestorage.app',
  messagingSenderId: '190417084213',
  appId: '1:190417084213:web:8557aff9e96a2a0498367c',
};

// 앱 초기화
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth 초기화 (React Native persistence 적용)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore / Storage / Functions
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-northeast3');

export default app;
