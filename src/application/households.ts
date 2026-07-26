// Households 管理（作成/参加/退出/招待コード）と購読フック
import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../infrastructure/firebaseClient';
import {
  addDoc,
  arrayRemove,
  collection,
  doc,
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

// household名の更新
export async function updateHouseholdName(householdId: string, name: string) {
  await updateDoc(doc(db, 'households', householdId), { name: name.trim() });
}

// householdメンバー一覧（users から householdId 一致で取得）
export function useHouseholdMembers(householdId?: string | null) {
  const [members, setMembers] = useState<Array<{ id: string; name?: string; email?: string }>>([]);
  useEffect(() => {
    if (!householdId) { setMembers([]); return; }
    const q = query(collection(db, 'users'), where('householdId', '==', householdId));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [householdId]);
  return members;
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

export async function leaveHousehold(userId: string, householdId: string) {
  // householdから外し、ユーザーは個人ハウスホールドへ退避（存在しなくても householdId を自分UIDに設定）
  await updateDoc(doc(db, 'households', householdId), { members: arrayRemove(userId) });
  await updateDoc(doc(db, 'users', userId), { householdId: userId });
}

// Callable 経由の参加: Functions 側でメンバー追加と householdId 更新を一括実行する。
// クライアントは他世帯の households を読めないため、参加経路はこれ一本。
export async function joinByInviteCallable(code: string): Promise<string> {
  const functions = getFunctions(undefined, 'asia-northeast1');
  const fn = httpsCallable(functions, 'joinByInvite');
  try {
    const res = await fn({ code });
    const data = res.data as { ok?: boolean; householdId?: string };
    if (!data?.ok || !data.householdId) throw new Error('参加に失敗しました');
    return data.householdId;
  } catch (e: any) {
    throw new Error(joinErrorMessage(e));
  }
}

/** Callable のエラーコードをユーザー向けメッセージに変換する */
function joinErrorMessage(e: any): string {
  switch (e?.code) {
    case 'functions/not-found':
      return '招待コードが見つかりません';
    case 'functions/invalid-argument':
      return '招待コードを入力してください';
    case 'functions/unauthenticated':
      return 'ログインし直してください';
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return '通信に失敗しました。電波状況を確認して再度お試しください';
    default:
      return e?.message || '参加に失敗しました';
  }
}
