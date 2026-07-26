// default_tasks から当日分の tasks を生成する Cloud Functions (2nd Gen, Node.js 20)。
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { todayKeyJST, todayWeekdayJST } from './lib/date';

try { admin.initializeApp(); } catch {}
const db = admin.firestore();

/** 指定householdのテンプレから当日分をtasksへ生成（重複防止つき） */
async function generateForHousehold(householdId: string) {
  const dateKey = todayKeyJST();
  const dow = todayWeekdayJST();
  const defaultsSnap = await db
    .collection('default_tasks')
    .doc(householdId)
    .collection('items')
    .where('daysOfWeek', 'array-contains', dow)
    .get();

  for (const docSnap of defaultsSnap.docs) {
    const def = docSnap.data() as { title: string };
    const title = (def.title || '').trim();
    if (!title) continue;

    // Duplication guard: householdId + dateKey + title
    const exists = await db
      .collection('tasks')
      .where('householdId', '==', householdId)
      .where('dateKey', '==', dateKey)
      .where('title', '==', title)
      .limit(1)
      .get();
    if (!exists.empty) continue;

    await db.collection('tasks').add({
      title,
      householdId,
      userId: 'system',
      status: 'pending',
      dateKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reactions: {},
    });
  }
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
    const householdsSnap = await db.collection('default_tasks').get();
    const ids = householdsSnap.docs.map((d) => d.id);
    await Promise.all(ids.map((hid) => generateForHousehold(hid)));
    logger.info('Daily tasks generated', { households: ids.length });
  }
);

// Manual trigger for testing (secure appropriately in production)
// 手動HTTPトリガ（検証用途）。本番は認証等で保護すること。
export const generateDailyTasksHttp = onRequest({ region: 'asia-northeast1' }, async (req, res) => {
  const householdId = (req.query.householdId as string | undefined)
    || (req.query.houholdId as string | undefined) // タイプミス対策
    || undefined;
  try {
    // householdId は必須。未指定アクセス（Botや誤アクセス）は 400 で早期終了し、
    // Firestore クエリを走らせないことで 500(FAILED_PRECONDITION) を防ぐ。
    if (!householdId) {
      res.status(400).json({ ok: false, error: 'householdId is required' });
      return;
    }

    await generateForHousehold(householdId);
    res.status(200).json({ ok: true, dateKey: todayKeyJST() });
  } catch (e: any) {
    logger.error('generateDailyTasksHttp failed', e);
    res.status(500).json({ ok: false, error: e?.message });
  }
});

/** Firestore の1バッチあたりの書き込み上限 */
const BATCH_LIMIT = 500;

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
