/**
 * firestore.rules の振る舞いテスト。Firestore エミュレーター上で実行する。
 *   npm run test:rules
 * ルートの `npm test`（src 配下の純ロジック）には含めない。エミュレーターが要るため。
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc,
} from 'firebase/firestore';

// demo- 始まりの ID はエミュレーター専用で、実プロジェクトへ繋がる事故が起きない。
const PROJECT_ID = 'demo-famly';
const HOST_PORT = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const [HOST, PORT] = HOST_PORT.split(':');

// 世帯 h1 のメンバー2人、無関係な他人1人。
const ALICE = 'alice';
const BOB = 'bob';
const MALLORY = 'mallory';
const H1 = 'h1';
const H_SOLO = 'h-solo';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: HOST,
      port: Number(PORT),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'households', H1), {
      name: '家族', inviteCode: 'ABC234', members: [ALICE, BOB],
    });
    await setDoc(doc(db, 'users', ALICE), { name: 'Alice', householdId: H1 });
    await setDoc(doc(db, 'users', BOB), { name: 'Bob', householdId: H1 });
    await setDoc(doc(db, 'users', MALLORY), { name: 'Mallory', householdId: MALLORY });
    // 最後の1人が退出するケース用（メンバーが Alice だけの世帯）
    await setDoc(doc(db, 'households', H_SOLO), {
      name: 'ひとり', inviteCode: 'SOLO23', members: [ALICE],
    });
    await setDoc(doc(db, 'tasks', 'shared1'), {
      title: '洗濯', householdId: H1, userId: ALICE, status: 'pending', dateKey: '2026-01-01',
    });
    await setDoc(doc(db, 'tasks', 'shared1', 'stamps', 's-alice'), { fromUserId: ALICE, type: 'thanks' });
    await setDoc(doc(db, 'tasks', 'personal1'), {
      title: '個人', householdId: MALLORY, userId: MALLORY, status: 'pending', dateKey: '2026-01-01',
    });
    await setDoc(doc(db, 'default_tasks', H1, 'items', 'd1'), { title: 'ゴミ出し', daysOfWeek: [1] });
  });
});

const asAlice = () => testEnv.authenticatedContext(ALICE).firestore();
const asBob = () => testEnv.authenticatedContext(BOB).firestore();
const asMallory = () => testEnv.authenticatedContext(MALLORY).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

describe('users', () => {
  it('未認証は読めない', async () => {
    await assertFails(getDoc(doc(asAnon(), 'users', ALICE)));
  });

  it('本人は読める・更新できる', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'users', ALICE)));
    await assertSucceeds(updateDoc(doc(asAlice(), 'users', ALICE), { name: 'Alice2' }));
  });

  it('同じ世帯のメンバーは読める（メンバー一覧表示）', async () => {
    await assertSucceeds(getDoc(doc(asBob(), 'users', ALICE)));
  });

  it('世帯外のユーザーは他人のプロフィールを読めない', async () => {
    await assertFails(getDoc(doc(asMallory(), 'users', ALICE)));
  });

  it('他人のプロフィールは更新できない', async () => {
    await assertFails(updateDoc(doc(asMallory(), 'users', ALICE), { name: 'hacked' }));
  });

  it('他人の ID でドキュメントを作れない', async () => {
    await assertFails(setDoc(doc(asMallory(), 'users', 'newcomer'), { name: 'x', householdId: 'newcomer' }));
  });

  it('削除はできない', async () => {
    await assertFails(deleteDoc(doc(asAlice(), 'users', ALICE)));
  });
});

describe('households', () => {
  it('メンバーは読める / 非メンバーは読めない', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'households', H1)));
    await assertFails(getDoc(doc(asMallory(), 'households', H1)));
  });

  it('クライアントからは作成できない（Callable 経由のみ）', async () => {
    await assertFails(setDoc(doc(asAlice(), 'households', 'h-new'), {
      name: '新世帯', inviteCode: 'ZZZ999', members: [ALICE],
    }));
  });

  it('メンバーは名前を更新できる', async () => {
    await assertSucceeds(updateDoc(doc(asAlice(), 'households', H1), { name: '新しい家族名' }));
  });

  it('招待コードはクライアントから書き換えられない（再発行は Callable 経由）', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'households', H1), { inviteCode: 'AAAAAA' }));
  });

  it('自分を members から外せる（退出）', async () => {
    await assertSucceeds(updateDoc(doc(asAlice(), 'households', H1), { members: [BOB] }));
  });

  it('退出は arrayRemove でも通る（クライアント実装の経路）', async () => {
    await assertSucceeds(updateDoc(doc(asAlice(), 'households', H1), { members: arrayRemove(ALICE) }));
  });

  it('最後の1人でも退出できる（members が空になる）', async () => {
    await assertSucceeds(updateDoc(doc(asAlice(), 'households', H_SOLO), { members: arrayRemove(ALICE) }));
  });

  it('arrayUnion でメンバーを増やすこともできない', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'households', H1), { members: arrayUnion(MALLORY) }));
  });

  it('他人を members から外せない', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'households', H1), { members: [ALICE] }));
  });

  it('members を空にして全員を外すこともできない', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'households', H1), { members: [] }));
  });

  it('メンバーが第三者を招き入れられない', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'households', H1), { members: [ALICE, BOB, MALLORY] }));
  });

  it('非メンバーが自分を members に足せない', async () => {
    await assertFails(updateDoc(doc(asMallory(), 'households', H1), { members: [ALICE, BOB, MALLORY] }));
  });

  it('削除はできない', async () => {
    await assertFails(deleteDoc(doc(asAlice(), 'households', H1)));
  });
});

describe('tasks', () => {
  it('同じ世帯のメンバーは読み書きできる', async () => {
    await assertSucceeds(getDoc(doc(asBob(), 'tasks', 'shared1')));
    await assertSucceeds(updateDoc(doc(asBob(), 'tasks', 'shared1'), { status: 'done' }));
    await assertSucceeds(deleteDoc(doc(asBob(), 'tasks', 'shared1')));
  });

  it('世帯外のユーザーは読めない・書けない', async () => {
    await assertFails(getDoc(doc(asMallory(), 'tasks', 'shared1')));
    await assertFails(updateDoc(doc(asMallory(), 'tasks', 'shared1'), { status: 'done' }));
    await assertFails(deleteDoc(doc(asMallory(), 'tasks', 'shared1')));
  });

  it('自分の世帯のタスクは作成できる', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), 'tasks', 'new1'), {
      title: '皿洗い', householdId: H1, userId: ALICE, status: 'pending', dateKey: '2026-01-01',
    }));
  });

  it('他人の世帯宛のタスクは作成できない', async () => {
    await assertFails(setDoc(doc(asMallory(), 'tasks', 'new2'), {
      title: '侵入', householdId: H1, userId: MALLORY, status: 'pending', dateKey: '2026-01-01',
    }));
  });

  it('個人世帯（householdId == uid）のタスクは本人だけが読める', async () => {
    await assertSucceeds(getDoc(doc(asMallory(), 'tasks', 'personal1')));
    await assertFails(getDoc(doc(asAlice(), 'tasks', 'personal1')));
  });

  it('未認証は読めない', async () => {
    await assertFails(getDoc(doc(asAnon(), 'tasks', 'shared1')));
  });
});

describe('tasks/stamps', () => {
  it('メンバーは自分名義のスタンプを付けられる', async () => {
    await assertSucceeds(setDoc(doc(asBob(), 'tasks', 'shared1', 'stamps', 's-bob'), {
      fromUserId: BOB, type: 'thanks',
    }));
  });

  it('他人名義のスタンプは付けられない', async () => {
    await assertFails(setDoc(doc(asBob(), 'tasks', 'shared1', 'stamps', 's-fake'), {
      fromUserId: ALICE, type: 'thanks',
    }));
  });

  it('世帯外のユーザーはスタンプを読めない・付けられない', async () => {
    await assertFails(getDocs(collection(asMallory(), 'tasks', 'shared1', 'stamps')));
    await assertFails(setDoc(doc(asMallory(), 'tasks', 'shared1', 'stamps', 's-m'), {
      fromUserId: MALLORY, type: 'thanks',
    }));
  });

  it('自分のスタンプは消せる / 他人のスタンプは消せない', async () => {
    await assertFails(deleteDoc(doc(asBob(), 'tasks', 'shared1', 'stamps', 's-alice')));
    await assertSucceeds(deleteDoc(doc(asAlice(), 'tasks', 'shared1', 'stamps', 's-alice')));
  });

  it('スタンプの更新はできない（1ユーザー1種類1回）', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'tasks', 'shared1', 'stamps', 's-alice'), { type: 'heart' }));
  });
});

describe('default_tasks', () => {
  it('メンバーは読み書きできる', async () => {
    await assertSucceeds(getDoc(doc(asBob(), 'default_tasks', H1, 'items', 'd1')));
    await assertSucceeds(setDoc(doc(asBob(), 'default_tasks', H1, 'items', 'd2'), {
      title: '風呂掃除', daysOfWeek: [2],
    }));
  });

  it('世帯外のユーザーは読み書きできない', async () => {
    await assertFails(getDoc(doc(asMallory(), 'default_tasks', H1, 'items', 'd1')));
    await assertFails(setDoc(doc(asMallory(), 'default_tasks', H1, 'items', 'd3'), {
      title: '侵入', daysOfWeek: [3],
    }));
  });
});
