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
  runTransaction,
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
  await updateDoc(doc(db, 'default_tasks', householdId, 'items', id), { title: title.trim() });
}

/** 曜日配列を更新（正規化あり） */
export async function updateDefaultTaskDays(householdId: string, id: string, daysOfWeek: number[]) {
  await updateDoc(doc(db, 'default_tasks', householdId, 'items', id), { daysOfWeek: Array.from(new Set(daysOfWeek)).sort() });
}

/** アイテムを削除 */
export async function deleteDefaultTask(householdId: string, id: string) {
  await deleteDoc(doc(db, 'default_tasks', householdId, 'items', id));
}

/**
 * 並び替え（隣接要素と order を入れ替える）。
 * list は useDefaultTasks で取得した昇順リストを渡す。
 */
export async function moveDefaultTask(
  householdId: string,
  list: DefaultTask[],
  id: string,
  direction: 'up' | 'down'
) {
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const neighborIndex = direction === 'up' ? idx - 1 : idx + 1;
  if (neighborIndex < 0 || neighborIndex >= list.length) return; // 端
  const a = list[idx];
  const b = list[neighborIndex];
  const aRef = doc(db, 'default_tasks', householdId, 'items', a.id);
  const bRef = doc(db, 'default_tasks', householdId, 'items', b.id);
  await runTransaction(db, async (trx) => {
    const aSnap = await trx.get(aRef);
    const bSnap = await trx.get(bRef);
    const aOrder = (aSnap.data() as any)?.order ?? Date.now();
    const bOrder = (bSnap.data() as any)?.order ?? Date.now() + 1;
    trx.update(aRef, { order: bOrder });
    trx.update(bRef, { order: aOrder });
  });
}
