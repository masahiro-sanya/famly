"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyTasksHttp = exports.generateDailyTasks = void 0;
// default_tasks から当日分の tasks を生成する Cloud Functions (2nd Gen, Node.js 20)。
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
try {
    admin.initializeApp();
}
catch { }
const db = admin.firestore();
/** JSTの当日キー(YYYY-MM-DD) */
function todayKeyJST(d = new Date()) {
    // Convert current time to Asia/Tokyo without external libs
    const jst = new Date(d.getTime() + (9 * 60 - d.getTimezoneOffset()) * 60000);
    const y = jst.getUTCFullYear();
    const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jst.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
/** JSTの曜日(0=日 ... 6=土) */
function todayWeekdayJST(d = new Date()) {
    const jst = new Date(d.getTime() + (9 * 60 - d.getTimezoneOffset()) * 60000);
    return jst.getUTCDay(); // 0=Sun ... 6=Sat
}
/** 指定householdのテンプレから当日分をtasksへ生成（重複防止つき） */
async function generateForHousehold(householdId) {
    const dateKey = todayKeyJST();
    const dow = todayWeekdayJST();
    const defaultsSnap = await db
        .collection('default_tasks')
        .doc(householdId)
        .collection('items')
        .where('daysOfWeek', 'array-contains', dow)
        .get();
    for (const docSnap of defaultsSnap.docs) {
        const def = docSnap.data();
        const title = (def.title || '').trim();
        if (!title)
            continue;
        // Duplication guard: householdId + dateKey + title
        const exists = await db
            .collection('tasks')
            .where('householdId', '==', householdId)
            .where('dateKey', '==', dateKey)
            .where('title', '==', title)
            .limit(1)
            .get();
        if (!exists.empty)
            continue;
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
exports.generateDailyTasks = (0, scheduler_1.onSchedule)({
    schedule: '0 5 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
}, async () => {
    const householdsSnap = await db.collection('default_tasks').get();
    const tasks = [];
    householdsSnap.forEach((h) => tasks.push(generateForHousehold(h.id)));
    await Promise.all(tasks);
    logger.info('Daily tasks generated', { count: householdsSnap.size });
});
// Manual trigger for testing (secure appropriately in production)
// 手動HTTPトリガ（検証用途）。本番は認証等で保護すること。
exports.generateDailyTasksHttp = (0, https_1.onRequest)({ region: 'asia-northeast1' }, async (req, res) => {
    const householdId = req.query.householdId || undefined;
    try {
        if (householdId) {
            await generateForHousehold(householdId);
        }
        else {
            const householdsSnap = await db.collection('default_tasks').get();
            const tasks = [];
            householdsSnap.forEach((h) => tasks.push(generateForHousehold(h.id)));
            await Promise.all(tasks);
        }
        res.status(200).json({ ok: true, dateKey: todayKeyJST() });
    }
    catch (e) {
        logger.error('generateDailyTasksHttp failed', e);
        res.status(500).json({ ok: false, error: e?.message });
    }
});
