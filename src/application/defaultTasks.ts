// Default tasks (テンプレ) の取得・編集ユースケース。
// コレクション構造: default_tasks/{householdId}/items/{docId}
import { useEffect, useState } from 'react';
import { db } from '../infrastructure/firebaseClient';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { DefaultTask } from '../domain/models';

// householdごとの items コレクション参照を返す
function col(householdId: string) {
  return collection(db, 'default_tasks', householdId, 'items');
}

/**
 * household単位のdefault_tasksを購読して返す。
 * order昇順で並べ替え（未設定時は追加時のtimestampに準拠）。
 */
export function useDefaultTasks(householdId?: string | null) {
  const [items, setItems] = useState<DefaultTask[]>([]);
  useEffect(() => {
    if (!householdId) { setItems([]); return; }
    const q = query(col(householdId), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DefaultTask[]);
    });
    return () => unsub();
  }, [householdId]);
  return items;
}

/**
 * デフォルトタスクを追加。曜日は0=日 ... 6=土。
 */
export async function addDefaultTask(params: { householdId: string; title: string; daysOfWeek: number[]; order?: number }) {
  const { householdId, title, daysOfWeek } = params;
  // 親ドキュメントが存在しない場合に備え、空ドキュメントをmergeで作成
  await setDoc(doc(db, 'default_tasks', householdId), { touchedAt: serverTimestamp() }, { merge: true } as any);
  await addDoc(col(householdId), {
    title: title.trim(),
    // 重複除去＋昇順ソートで正規化
    daysOfWeek: Array.from(new Set(daysOfWeek)).sort(),
    order: params.order ?? Date.now(),
    createdAt: serverTimestamp(),
  });
}

/** タイトルを更新 */
export async function updateDefaultTaskTitle(householdId: string, id: string, title: string) {
  await updateDoc(doc(db, 'default_tasks', householdId, id), { title: title.trim() });
}

/** 曜日配列を更新（正規化あり） */
export async function updateDefaultTaskDays(householdId: string, id: string, daysOfWeek: number[]) {
  await updateDoc(doc(db, 'default_tasks', householdId, id), { daysOfWeek: Array.from(new Set(daysOfWeek)).sort() });
}

/** アイテムを削除 */
export async function deleteDefaultTask(householdId: string, id: string) {
  await deleteDoc(doc(db, 'default_tasks', householdId, id));
}
