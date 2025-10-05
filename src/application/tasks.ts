import { useEffect, useState } from 'react';
import { db } from '../infrastructure/firebaseClient';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Task } from '../domain/models';

export function useTasks(householdId?: string | null) {
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
          const q2 = query(collection(db, 'tasks'), where('householdId', '==', householdId));
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
  }, [householdId]);
  return tasks;
}

export async function addTask(params: {
  title: string;
  userId: string;
  userName?: string;
  householdId: string;
}) {
  await addDoc(collection(db, 'tasks'), {
    title: params.title.trim(),
    userId: params.userId,
    userName: params.userName,
    householdId: params.householdId,
    createdAt: serverTimestamp() as Timestamp,
    status: 'done',
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
