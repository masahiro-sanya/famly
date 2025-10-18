// default_tasks から当日分の tasks を生成する Cloud Functions (2nd Gen, Node.js 20)。
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

try { admin.initializeApp(); } catch {}
const db = admin.firestore();

/** JSTの当日キー(YYYY-MM-DD) */
function todayKeyJST(d = new Date()): string {
  // Convert current time to Asia/Tokyo without external libs
  const jst = new Date(d.getTime() + (9 * 60 - d.getTimezoneOffset()) * 60000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** JSTの曜日(0=日 ... 6=土) */
function todayWeekdayJST(d = new Date()): number {
  const jst = new Date(d.getTime() + (9 * 60 - d.getTimezoneOffset()) * 60000);
  return jst.getUTCDay(); // 0=Sun ... 6=Sat
}

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
    const dow = todayWeekdayJST();
    // 親ドキュメントがなくても拾えるように collectionGroup で items を検索
    const items = await db.collectionGroup('items').where('daysOfWeek', 'array-contains', dow).get();
    const householdIds = new Set<string>();
    items.forEach((d) => {
      const hid = d.ref.parent.parent?.id;
      if (hid) householdIds.add(hid);
    });
    await Promise.all([...householdIds].map((hid) => generateForHousehold(hid)));
    logger.info('Daily tasks generated', { households: householdIds.size });
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
