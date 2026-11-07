// Households 管理（作成/参加/退出/招待コード）と購読フック
import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { callableErrorMessage, JOIN_ERRORS, REGENERATE_INVITE_ERRORS } from './callableError';
import { db } from '../infrastructure/firebaseClient';
import {
  arrayRemove,
  collection,
  doc,
  onSnapshot,
  query,
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

// Callable 経由の世帯作成: 世帯の作成・プロフィールの付け替え・旧世帯からの離脱を
// Functions 側の1トランザクションで行う。クライアントで3回に分けて書くと途中で失敗したとき
// 「プロフィールは旧世帯を指しているが members にいない」といった中途半端な状態が残るため。
// households の create はルールで禁止しており、この経路以外では作れない。
export async function createHousehold(name: string): Promise<string> {
  const functions = getFunctions(undefined, 'asia-northeast1');
  const fn = httpsCallable(functions, 'createHousehold');
  try {
    const res = await fn({ name });
    const data = res.data as { ok?: boolean; householdId?: string };
    if (!data?.ok || !data.householdId) throw new Error('家族の作成に失敗しました');
    return data.householdId;
  } catch (e: any) {
    throw new Error(callableErrorMessage(e, '家族の作成に失敗しました'));
  }
}

// Callable 経由の招待コード再発行: 生成は Functions 側に一本化する。
// クライアントの Math.random は推測しやすく、ルールでも inviteCode の更新は禁止している。
export async function regenerateInviteCode(): Promise<string> {
  const functions = getFunctions(undefined, 'asia-northeast1');
  const fn = httpsCallable(functions, 'regenerateInviteCode');
  try {
    const res = await fn({});
    const data = res.data as { ok?: boolean; inviteCode?: string };
    if (!data?.ok || !data.inviteCode) throw new Error('招待コードの再発行に失敗しました');
    return data.inviteCode;
  } catch (e: any) {
    throw new Error(callableErrorMessage(e, '招待コードの再発行に失敗しました', REGENERATE_INVITE_ERRORS));
  }
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
    throw new Error(callableErrorMessage(e, '参加に失敗しました', JOIN_ERRORS));
  }
}
