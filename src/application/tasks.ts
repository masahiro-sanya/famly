import { useEffect, useState } from 'react';
import { db } from '../infrastructure/firebaseClient';
import { getTodayKey } from '../lib/date';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  runTransaction,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteField,
  where,
} from 'firebase/firestore';
import { Task } from '../domain/models';

export function useTasks(householdId?: string | null, dateKey: string = getTodayKey()) {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    if (!householdId) {
      setTasks([]);
      return;
    }
    // メイン: インデックス利用（householdId ==, createdAt desc）
    const q1 = query(
      collection(db, 'tasks'),
      where('householdId', '==', householdId),
      where('dateKey', '==', dateKey),
      orderBy('createdAt', 'desc')
    );

    let fallbackUnsub: null | (() => void) = null;
    const unsub1 = onSnapshot(
      q1,
      (snap) => {
        const list: Task[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setTasks(list);
      },
      (err) => {
        // インデックス未作成/構築中の暫定フォールバック
        if ((err as any)?.code === 'failed-precondition') {
          const q2 = query(
            collection(db, 'tasks'),
            where('householdId', '==', householdId),
            where('dateKey', '==', dateKey)
          );
          fallbackUnsub = onSnapshot(q2, (snap) => {
            const list: Task[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            list.sort((a, b) => {
              const ta = a.createdAt ? a.createdAt.toMillis() : 0;
              const tb = b.createdAt ? b.createdAt.toMillis() : 0;
              return tb - ta; // desc
            });
            setTasks(list);
          });
        } else {
          console.error('[useTasks] onSnapshot error:', err);
        }
      }
    );

    return () => {
      unsub1();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [householdId, dateKey]);
  return tasks;
}

export async function addTask(params: {
  title: string;
  userId: string;
  householdId: string;
}) {
  await addDoc(collection(db, 'tasks'), {
    title: params.title.trim(),
    userId: params.userId,
    householdId: params.householdId,
    createdAt: serverTimestamp() as Timestamp,
    status: 'pending',
    dateKey: getTodayKey(),
    thanksCount: 0,
    reactions: {},
  });
}

export async function updateTaskTitle(taskId: string, title: string) {
  const ref = doc(db, 'tasks', taskId);
  await updateDoc(ref, { title: title.trim() });
}

export async function deleteTask(taskId: string) {
  const ref = doc(db, 'tasks', taskId);
  await deleteDoc(ref);
}

export async function updateTaskStatus(
  taskId: string,
  status: 'done' | 'pending',
  actor?: { id: string; name?: string }
) {
  const ref = doc(db, 'tasks', taskId);
  if (status === 'done') {
    await updateDoc(ref, {
      status,
      completedAt: serverTimestamp() as Timestamp,
      completedByUserId: actor?.id,
      completedByName: actor?.name,
    });
  } else {
    await updateDoc(ref, {
      status,
      completedAt: deleteField(),
      completedByUserId: deleteField(),
      completedByName: deleteField(),
    } as any);
  }
}

export async function addReaction(
  taskId: string,
  fromUserId: string,
  type: 'thanks' | 'like' | 'party' | 'heart' | 'smile' | 'sparkles' | string
): Promise<'added' | 'removed'> {
  const stampRef = doc(db, 'tasks', taskId, 'stamps', `${fromUserId}_${type}`);
  const taskRef = doc(db, 'tasks', taskId);
  const result = await runTransaction(db, async (trx) => {
    const snap = await trx.get(stampRef);
    if (snap.exists()) {
      // toggle off
      trx.delete(stampRef);
      const field = `reactions.${type}` as any;
      const update: any = { [field]: increment(-1) };
      if (type === 'thanks') update.thanksCount = increment(-1);
      trx.update(taskRef, update);
      return 'removed' as const;
    }
    trx.set(stampRef, {
      type,
      fromUserId,
      taskId,
      dateKey: getTodayKey(),
      createdAt: serverTimestamp() as Timestamp,
    } as any);
    const field = `reactions.${type}` as any;
    const update: any = { [field]: increment(1) };
    if (type === 'thanks') update.thanksCount = increment(1);
    trx.update(taskRef, update);
    return 'added' as const;
  });
  return result;
}

export async function addThanksStamp(taskId: string, fromUserId: string) {
  return addReaction(taskId, fromUserId, 'thanks');
}
