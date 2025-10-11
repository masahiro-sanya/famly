import { useEffect, useState } from 'react';
import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../infrastructure/firebaseClient';

// 現在ユーザーが押した「thanks」の taskId を真偽で保持するマップ
export function useMyThanksMap(userId?: string | null) {
  const [map, setMap] = useState<Record<string, true>>({});
  useEffect(() => {
    if (!userId) {
      setMap({});
      return;
    }
    try {
      const q = query(collectionGroup(db, 'stamps'), where('fromUserId', '==', userId));
      const unsub = onSnapshot(q, (snap) => {
        const m: Record<string, true> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          const taskId = data.taskId || d.ref.parent.parent?.id;
          if (taskId) m[taskId] = true;
        });
        setMap(m);
      });
      return () => unsub();
    } catch (e) {
      console.warn('[useMyThanksMap] collectionGroup not available or rules restrict:', e);
      setMap({});
    }
  }, [userId]);
  return map;
}

