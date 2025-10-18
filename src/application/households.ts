// Households 管理（作成/参加/退出/招待コード）と購読フック
import { useEffect, useState } from 'react';
import { db } from '../infrastructure/firebaseClient';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

export type Household = {
  id: string;
  name: string;
  inviteCode: string;
  members: string[];
  createdAt?: any;
};

export function useHousehold(householdId?: string | null) {
  const [household, setHousehold] = useState<Household | null>(null);
  useEffect(() => {
    if (!householdId) { setHousehold(null); return; }
    const ref = doc(db, 'households', householdId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setHousehold({ id: snap.id, ...(snap.data() as any) });
      else setHousehold(null);
    });
    return () => unsub();
  }, [householdId]);
  return household;
}

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createHousehold(userId: string, name: string) {
  const ref = await addDoc(collection(db, 'households'), {
    name: name.trim() || '家族',
    inviteCode: randomCode(),
    members: [userId],
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', userId), { householdId: ref.id });
  return ref.id as string;
}

export async function regenerateInviteCode(householdId: string) {
  await updateDoc(doc(db, 'households', householdId), { inviteCode: randomCode() });
}

export async function joinByInvite(userId: string, code: string) {
  const q = query(collection(db, 'households'), where('inviteCode', '==', code.trim().toUpperCase()));
  const snap = await (await import('firebase/firestore')).getDocs(q);
  if (snap.empty) throw new Error('招待コードが見つかりません');
  const h = snap.docs[0];
  await updateDoc(doc(db, 'households', h.id), { members: arrayUnion(userId) });
  await updateDoc(doc(db, 'users', userId), { householdId: h.id });
  return h.id as string;
}

export async function leaveHousehold(userId: string, householdId: string) {
  // householdから外し、ユーザーは個人ハウスホールドへ退避（存在しなくても householdId を自分UIDに設定）
  await updateDoc(doc(db, 'households', householdId), { members: arrayRemove(userId) });
  await updateDoc(doc(db, 'users', userId), { householdId: userId });
}

