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

function col(householdId: string) {
  return collection(db, 'default_tasks', householdId, 'items');
}

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

export async function addDefaultTask(params: { householdId: string; title: string; daysOfWeek: number[]; order?: number }) {
  const { householdId, title, daysOfWeek } = params;
  await addDoc(col(householdId), {
    title: title.trim(),
    daysOfWeek: Array.from(new Set(daysOfWeek)).sort(),
    order: params.order ?? Date.now(),
    createdAt: serverTimestamp(),
  });
}

export async function updateDefaultTaskTitle(householdId: string, id: string, title: string) {
  await updateDoc(doc(db, 'default_tasks', householdId, id), { title: title.trim() });
}

export async function updateDefaultTaskDays(householdId: string, id: string, daysOfWeek: number[]) {
  await updateDoc(doc(db, 'default_tasks', householdId, id), { daysOfWeek: Array.from(new Set(daysOfWeek)).sort() });
}

export async function deleteDefaultTask(householdId: string, id: string) {
  await deleteDoc(doc(db, 'default_tasks', householdId, id));
}
