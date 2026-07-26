// default_tasks から当日分の tasks を生成する Cloud Functions (2nd Gen, Node.js 20)。
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { todayKeyJST, todayWeekdayJST } from './lib/date';

try { admin.initializeApp(); } catch {}
const db = admin.firestore();

/** Firestore の1バッチあたりの書き込み上限 */
const BATCH_LIMIT = 500;
/** スケジュール実行時に同時処理する household 数の上限 */
const HOUSEHOLD_CONCURRENCY = 10;

type BatchOp = (batch: admin.firestore.WriteBatch) => void;

/** バッチ上限を超えないよう分割して commit する */
async function commitInChunks(ops: BatchOp[]) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch);
    await batch.commit();
  }
}

/** すでに存在しないドキュメントへの操作だけを無視する（他のエラーは伝播させる） */
async function ignoreNotFound<T>(work: Promise<T>): Promise<T | undefined> {
  try {
    return await work;
  } catch (e: any) {
    if (e?.code === 5 || e?.code === 'not-found' || e?.code === 'auth/user-not-found') return undefined;
    throw e;
  }
}

/** 指定householdのテンプレから当日分をtasksへ生成（重複防止つき） */
async function generateForHousehold(householdId: string): Promise<number> {
  const dateKey = todayKeyJST();
  const dow = todayWeekdayJST();
  const defaultsSnap = await db
    .collection('default_tasks')
    .doc(householdId)
    .collection('items')
    .where('daysOfWeek', 'array-contains', dow)
    .get();
  if (defaultsSnap.empty) return 0;

  // 重複判定用に当日分のタイトルを1クエリでまとめて取得する
  const todaySnap = await db
    .collection('tasks')
    .where('householdId', '==', householdId)
    .where('dateKey', '==', dateKey)
    .get();
  const existingTitles = new Set(todaySnap.docs.map((d) => (d.data() as { title?: string }).title));

  const ops: BatchOp[] = [];
  for (const docSnap of defaultsSnap.docs) {
    const title = ((docSnap.data() as { title?: string }).title ?? '').trim();
    if (!title || existingTitles.has(title)) continue;
    existingTitles.add(title); // テンプレ内の重複も1件にまとめる
    const ref = db.collection('tasks').doc();
    ops.push((b) => b.set(ref, {
      title,
      householdId,
      userId: 'system',
      status: 'pending',
      dateKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reactions: {},
    }));
  }
  await commitInChunks(ops);
  return ops.length;
}

// Pub/Subスケジュール: JST 05:00 に全householdを走査
export const generateDailyTasks = onSchedule(
  {
    schedule: '0 5 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async () => {
    // collectionGroup ではなく、親ドキュメント列挙で householdId を取得する方式に変更。
    // これにより items/daysOfWeek の単一フィールド（CG）インデックスが不要になる。
    const householdsSnap = await db.collection('default_tasks').listDocuments();
    const ids = householdsSnap.map((d) => d.id);

    // 世帯数に比例して並列度が上がらないよう小分けにし、
    // 1世帯の失敗で他の世帯の生成が止まらないよう allSettled で受ける。
    let created = 0;
    const failed: string[] = [];
    for (let i = 0; i < ids.length; i += HOUSEHOLD_CONCURRENCY) {
      const chunk = ids.slice(i, i + HOUSEHOLD_CONCURRENCY);
      const results = await Promise.allSettled(chunk.map((hid) => generateForHousehold(hid)));
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') created += r.value;
        else {
          failed.push(chunk[idx]);
          logger.error('generateForHousehold failed', { householdId: chunk[idx], error: r.reason });
        }
      });
    }
    logger.info('Daily tasks generated', { households: ids.length, created, failed: failed.length });
  }
);

// 手動生成（検証用）。旧 generateDailyTasksHttp は無認証の onRequest で、
// householdId さえ分かれば誰でも他人の世帯にタスクを作れたため Callable に置き換えた。
// 生成できるのは呼び出し元自身の世帯のみ。
export const generateDailyTasksNow = onCall({ region: 'asia-northeast1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');

  const userSnap = await db.collection('users').doc(uid).get();
  const householdId: string | undefined = userSnap.exists
    ? (userSnap.data() as { householdId?: string }).householdId
    : undefined;
  if (!householdId) throw new HttpsError('failed-precondition', 'household not found');

  await generateForHousehold(householdId);
  logger.info('generateDailyTasksNow', { uid, householdId });
  return { ok: true, householdId, dateKey: todayKeyJST() };
});

// Callable: 退会時に本人のデータを削除し、共有データからは本人の痕跡を消す。
// 家族と共有しているタスクは家族側の記録なので削除せず匿名化する。
export const deleteMyAccount = onCall({ region: 'asia-northeast1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const householdId: string | undefined = userSnap.exists
    ? (userSnap.data() as { householdId?: string }).householdId
    : undefined;

  // 1) 共有世帯のメンバーから外す（個人世帯は households ドキュメントを持たない）
  if (householdId && householdId !== uid) {
    await ignoreNotFound(
      db.collection('households').doc(householdId)
        .update({ members: admin.firestore.FieldValue.arrayRemove(uid) })
    );
  }

  // 2) 本人が押したスタンプを削除
  const stampsSnap = await db.collectionGroup('stamps').where('fromUserId', '==', uid).get();
  await commitInChunks(stampsSnap.docs.map((d) => (b: admin.firestore.WriteBatch) => b.delete(d.ref)));

  // 3) tasks の後始末。個人世帯のタスクは誰も読めなくなるので削除、
  //    共有世帯のタスクは家族の記録として残し、本人の情報だけ落とす。
  const [personalSnap, ownedSnap, completedSnap] = await Promise.all([
    db.collection('tasks').where('householdId', '==', uid).get(),
    db.collection('tasks').where('userId', '==', uid).get(),
    db.collection('tasks').where('completedByUserId', '==', uid).get(),
  ]);

  const del = admin.firestore.FieldValue.delete();
  const personalPaths = new Set(personalSnap.docs.map((d) => d.ref.path));
  const taskOps: BatchOp[] = personalSnap.docs.map((d) => (b: admin.firestore.WriteBatch) => b.delete(d.ref));

  // 共有タスクは残すので、同一ドキュメントへの更新を1回にまとめる
  const anonymize = new Map<string, { ref: admin.firestore.DocumentReference; data: Record<string, unknown> }>();
  const mark = (d: admin.firestore.QueryDocumentSnapshot, fields: Record<string, unknown>) => {
    if (personalPaths.has(d.ref.path)) return; // 削除するので更新不要
    const entry = anonymize.get(d.ref.path) ?? { ref: d.ref, data: {} };
    anonymize.set(d.ref.path, { ref: entry.ref, data: { ...entry.data, ...fields } });
  };
  ownedSnap.docs.forEach((d) => mark(d, { userId: 'deleted', userName: del }));
  completedSnap.docs.forEach((d) => mark(d, { completedByUserId: del, completedByName: del }));
  for (const { ref, data } of anonymize.values()) {
    taskOps.push((b) => b.update(ref, data));
  }
  await commitInChunks(taskOps);

  // 4) 個人世帯のテンプレを削除（共有世帯のテンプレは家族のものなので残す）
  const personalDefaultsRef = db.collection('default_tasks').doc(uid);
  const itemsSnap = await personalDefaultsRef.collection('items').get();
  await commitInChunks(itemsSnap.docs.map((d) => (b: admin.firestore.WriteBatch) => b.delete(d.ref)));
  await ignoreNotFound(personalDefaultsRef.delete());

  // 5) プロフィールを削除
  await ignoreNotFound(userRef.delete());

  // 6) 最後に認証ユーザーを削除（途中で失敗しても再実行できるよう最後に置く）
  await ignoreNotFound(admin.auth().deleteUser(uid));

  logger.info('deleteMyAccount done', {
    uid,
    stamps: stampsSnap.size,
    tasksDeleted: personalSnap.size,
    tasksAnonymized: anonymize.size,
    defaultTaskItems: itemsSnap.size,
  });
  return { ok: true };
});

// Callable: Join household by invite code (adds caller as member)
export const joinByInvite = onCall({ region: 'asia-northeast1' }, async (req) => {
  const uid = req.auth?.uid;
  const code = (req.data?.code as string | undefined)?.toUpperCase().trim();
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');
  if (!code) throw new HttpsError('invalid-argument', 'code is required');

  const snap = await db.collection('households').where('inviteCode', '==', code).limit(1).get();
  if (snap.empty) throw new HttpsError('not-found', 'invalid invite code');
  const hid = snap.docs[0].id;

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const prevHid: string | undefined = userSnap.exists
    ? (userSnap.data() as { householdId?: string }).householdId
    : undefined;
  if (prevHid === hid) return { ok: true, householdId: hid };

  // 旧世帯のメンバーから外す。残したままだと参加後も旧世帯のデータを読めてしまう。
  if (prevHid && prevHid !== uid) {
    await db.collection('households').doc(prevHid)
      .update({ members: admin.firestore.FieldValue.arrayRemove(uid) });
  }
  await db.collection('households').doc(hid)
    .update({ members: admin.firestore.FieldValue.arrayUnion(uid) });
  await userRef.set({ householdId: hid }, { merge: true });
  logger.info('joinByInvite', { uid, from: prevHid ?? null, to: hid });
  return { ok: true, householdId: hid };
});
