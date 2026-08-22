// default_tasks から当日分の tasks を生成する Cloud Functions (2nd Gen, Node.js 20)。
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';
import { todayKeyJST, todayWeekdayJST } from './lib/date';
import {
  INVITE_CODE_LENGTH,
  inviteCodeFromBytes,
  normalizeHouseholdName,
  normalizeInviteCode,
  planDailyTitles,
  planJoin,
  planTaskCleanup,
} from './lib/plan';

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

/** 招待コードを生成する（推測されにくいよう暗号論的乱数を使う） */
function generateInviteCode(): string {
  return inviteCodeFromBytes(randomBytes(INVITE_CODE_LENGTH));
}

const INVITE_CODE_MAX_ATTEMPTS = 5;

/**
 * 未使用の招待コードを払い出す。
 * joinByInvite はコード一致の先頭1件へ参加させるため、重複すると別世帯へ入ってしまう。
 * 生成→存在確認の間に別の作成が挟まる可能性は残る（ベストエフォート）が、
 * 32^6 の空間で5回とも衝突するのは異常事態なので、その場合は失敗させる。
 */
async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < INVITE_CODE_MAX_ATTEMPTS; i++) {
    const code = generateInviteCode();
    const dup = await db.collection('households').where('inviteCode', '==', code).limit(1).get();
    if (dup.empty) return code;
  }
  throw new HttpsError('internal', 'failed to allocate invite code');
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
  const titles = planDailyTitles(
    defaultsSnap.docs.map((d) => (d.data() as { title?: string }).title),
    todaySnap.docs.map((d) => (d.data() as { title?: string }).title)
  );

  const ops: BatchOp[] = titles.map((title) => {
    const ref = db.collection('tasks').doc();
    return (b: admin.firestore.WriteBatch) => b.set(ref, {
      title,
      householdId,
      userId: 'system',
      status: 'pending',
      dateKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reactions: {},
    });
  });
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
// アプリからは呼ばない。呼び出し方は README「Functions デプロイ手順（詳細）> 4) 動作確認」を参照。
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
  const refByPath = new Map<string, admin.firestore.DocumentReference>();
  for (const d of [...personalSnap.docs, ...ownedSnap.docs, ...completedSnap.docs]) {
    refByPath.set(d.ref.path, d.ref);
  }
  const plan = planTaskCleanup({
    personalPaths: personalSnap.docs.map((d) => d.ref.path),
    ownedPaths: ownedSnap.docs.map((d) => d.ref.path),
    completedPaths: completedSnap.docs.map((d) => d.ref.path),
  });

  const taskOps: BatchOp[] = [
    ...plan.delete.map((path) => (b: admin.firestore.WriteBatch) => b.delete(refByPath.get(path)!)),
    ...plan.anonymize.map((entry) => (b: admin.firestore.WriteBatch) => b.update(refByPath.get(entry.path)!, {
      ...(entry.clearOwner ? { userId: 'deleted', userName: del } : {}),
      ...(entry.clearCompleter ? { completedByUserId: del, completedByName: del } : {}),
    })),
  ];
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
    tasksDeleted: plan.delete.length,
    tasksAnonymized: plan.anonymize.length,
    defaultTaskItems: itemsSnap.size,
  });
  return { ok: true };
});

// Callable: 世帯の新規作成。クライアントから直接 households を作らせると、
// 「作成」「旧世帯からの離脱」「users.householdId の更新」を1トランザクションにできず、
// 途中で失敗すると所属が壊れた状態が残る。ここで admin 権限のトランザクションにまとめる。
export const createHousehold = onCall({ region: 'asia-northeast1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');
  const name = normalizeHouseholdName(req.data?.name);

  const userRef = db.collection('users').doc(uid);
  const newRef = db.collection('households').doc();
  const inviteCode = await generateUniqueInviteCode();

  const prevHid = await db.runTransaction(async (t) => {
    // トランザクションでは読み取りを先に済ませる必要がある
    const userSnap = await t.get(userRef);
    const prev: string | undefined = userSnap.exists
      ? (userSnap.data() as { householdId?: string }).householdId
      : undefined;
    // 個人世帯(prev == uid)は households ドキュメントを持たないので外す対象がない
    const prevRef = prev && prev !== uid ? db.collection('households').doc(prev) : null;
    const prevSnap = prevRef ? await t.get(prevRef) : null;

    t.set(newRef, {
      name,
      inviteCode,
      members: [uid],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    t.set(userRef, { householdId: newRef.id }, { merge: true });
    // 旧世帯に残っていると、移った後も旧世帯のデータを読めてしまう
    if (prevRef && prevSnap?.exists) {
      t.update(prevRef, { members: admin.firestore.FieldValue.arrayRemove(uid) });
    }
    return prev ?? null;
  });

  logger.info('createHousehold', { uid, from: prevHid, to: newRef.id });
  return { ok: true, householdId: newRef.id };
});

// Callable: 招待コードの再発行。招待コードは世帯に入るための合言葉なので、
// クライアント側の Math.random で作らせない（生成の強度がここに一本化される）。
// ルールでも households.inviteCode のクライアント更新を禁止している。
export const regenerateInviteCode = onCall({ region: 'asia-northeast1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');

  const userSnap = await db.collection('users').doc(uid).get();
  const hid: string | undefined = userSnap.exists
    ? (userSnap.data() as { householdId?: string }).householdId
    : undefined;
  // 個人世帯(hid == uid)は households ドキュメントを持たず、招待もできない
  if (!hid || hid === uid) throw new HttpsError('failed-precondition', 'not in a shared household');

  const ref = db.collection('households').doc(hid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'household not found');
  const members: string[] = (snap.data() as { members?: string[] }).members ?? [];
  // プロフィールの householdId は自己申告なので、members 側でも所属を確かめる
  if (!members.includes(uid)) throw new HttpsError('permission-denied', 'not a member');

  const inviteCode = await generateUniqueInviteCode();
  await ref.update({ inviteCode });
  logger.info('regenerateInviteCode', { uid, hid });
  return { ok: true, inviteCode };
});

// Callable: Join household by invite code (adds caller as member)
export const joinByInvite = onCall({ region: 'asia-northeast1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');
  const code = normalizeInviteCode(req.data?.code);
  if (!code) throw new HttpsError('invalid-argument', 'code is required');

  const snap = await db.collection('households').where('inviteCode', '==', code).limit(1).get();
  if (snap.empty) throw new HttpsError('not-found', 'invalid invite code');
  const householdDoc = snap.docs[0];
  const hid = householdDoc.id;
  const members: string[] = (householdDoc.data() as { members?: string[] }).members ?? [];

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const prevHid: string | undefined = userSnap.exists
    ? (userSnap.data() as { householdId?: string }).householdId
    : undefined;

  const plan = planJoin({ uid, hid, members, prevHid });
  if (plan.alreadyJoined) return { ok: true, householdId: hid };

  // 先に新世帯へ追加してから旧世帯を外す。逆順だと2手目の失敗で
  // どの世帯にも属さない状態が残る。
  if (plan.addToNew) {
    await db.collection('households').doc(hid)
      .update({ members: admin.firestore.FieldValue.arrayUnion(uid) });
  }
  // 旧世帯のメンバーから外す。残したままだと参加後も旧世帯のデータを読めてしまう。
  // 旧世帯が既に無い場合まで join 全体を失敗させない。
  if (plan.removeFrom) {
    await ignoreNotFound(
      db.collection('households').doc(plan.removeFrom)
        .update({ members: admin.firestore.FieldValue.arrayRemove(uid) })
    );
  }
  await userRef.set({ householdId: hid }, { merge: true });
  logger.info('joinByInvite', { uid, from: prevHid ?? null, to: hid });
  return { ok: true, householdId: hid };
});
