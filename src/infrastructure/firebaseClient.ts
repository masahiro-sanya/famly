import { initializeApp } from 'firebase/app';
// Firebaseクライアント初期化。
// FirestoreはRN環境でのネットワーク相性改善のためlong polling自動判定を有効化。
import { Platform } from 'react-native';
import { getAuth, initializeAuth } from 'firebase/auth';
import * as AuthMod from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID as string,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID as string,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
};

const app = initializeApp(firebaseConfig);

// RNではAsyncStorageに認証状態を永続化。Webは従来のgetAuthでOK。
const rnPersistence = (AuthMod as any)?.getReactNativePersistence
  ? (AuthMod as any).getReactNativePersistence(AsyncStorage)
  : undefined;

export const auth = Platform.OS === 'web' || !rnPersistence
  ? getAuth(app)
  : initializeAuth(app, { persistence: rnPersistence });
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
