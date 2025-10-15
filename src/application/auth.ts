// 認証状態とプロフィール(users/{uid})の購読・更新。
import { useEffect, useState } from 'react';
import { auth, db } from '../infrastructure/firebaseClient';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { UserProfile } from '../domain/models';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

/**
 * Firebase Auth のログイン状態と、対応する users/{uid} を購読する。
 * 初回ログイン時は users/{uid} をデフォルト値で作成する。
 */
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const ref = doc(db, 'users', user.uid);
    (async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const defaultName = user.email?.split('@')[0] ?? 'Anonymous';
        await updateDocOrSet(ref, {
          name: defaultName,
          email: user.email ?? '',
          householdId: user.uid,
        });
      }
    })();
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });
    return () => unsub();
  }, [user]);

  return { user, profile } as const;
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string) {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  await fbSignOut(auth);
}

export async function updateProfileName(userId: string, name: string) {
  await updateDoc(doc(db, 'users', userId), { name });
}

export async function updateHouseholdId(userId: string, householdId: string) {
  await updateDoc(doc(db, 'users', userId), { householdId });
}

// Firestore: ドキュメントがなければ set、あれば update。
async function updateDocOrSet(ref: ReturnType<typeof doc>, data: Record<string, any>) {
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, data);
  } else {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(ref, data);
  }
}
