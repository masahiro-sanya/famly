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

// Callable: Delete my account and related personal data
export const deleteMyAccount = onCall({ region: 'asia-northeast1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new Error('UNAUTHENTICATED');
  }
  // 1) Fetch user profile to obtain householdId
  const userDocRef = db.collection('users').doc(uid);
  const userSnap = await userDocRef.get();
  const householdId: string | undefined = userSnap.exists ? (userSnap.data() as any)?.householdId : undefined;

  // 2) Remove from household members
  if (householdId) {
    try {
      await db.collection('households').doc(householdId).update({ members: admin.firestore.FieldValue.arrayRemove(uid) });
    } catch {}
  }

  // 3) Delete stamps created by the user (collectionGroup)
  try {
    const stampsSnap = await db.collectionGroup('stamps').where('fromUserId', '==', uid).get();
    const batch = db.batch();
    stampsSnap.docs.forEach((d) => batch.delete(d.ref));
    if (!stampsSnap.empty) await batch.commit();
  } catch {}

  // 4) Anonymize tasks completed by this user
  try {
    const tasksSnap = await db.collection('tasks').where('completedByUserId', '==', uid).get();
    const batch2 = db.batch();
    tasksSnap.docs.forEach((d) => {
      batch2.update(d.ref, {
        completedByUserId: admin.firestore.FieldValue.delete(),
        completedByName: admin.firestore.FieldValue.delete(),
      } as any);
    });
    if (!tasksSnap.empty) await batch2.commit();
  } catch {}

  // 5) Delete user profile document
  try { await userDocRef.delete(); } catch {}

  // 6) Delete auth user
  try { await admin.auth().deleteUser(uid); } catch (e) {
    // If already deleted or token invalid, ignore
  }

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
  const h = snap.docs[0];
  const hid = h.id;
  // add to members
  await db.collection('households').doc(hid)
    .update({ members: admin.firestore.FieldValue.arrayUnion(uid) });
  // set user's householdId
  await db.collection('users').doc(uid).set({ householdId: hid }, { merge: true });
  return { ok: true, householdId: hid };
});
