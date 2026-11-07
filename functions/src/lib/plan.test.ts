import {
  DEFAULT_HOUSEHOLD_NAME,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  JOIN_ATTEMPT_WINDOW_MS,
  JOIN_MAX_ATTEMPTS,
  inviteCodeFromBytes,
  isJoinBlocked,
  nextJoinAttempt,
  normalizeHouseholdName,
  normalizeInviteCode,
  planDailyTitles,
  planJoin,
  planTaskCleanup,
} from './plan';

describe('planDailyTitles（generateForHousehold の重複防止ロジック）', () => {
  it('当日すでに存在するタイトルは作らない', () => {
    expect(planDailyTitles(['洗濯', 'ゴミ出し'], ['洗濯'])).toEqual(['ゴミ出し']);
  });

  it('テンプレ内の重複も1件にまとめる', () => {
    expect(planDailyTitles(['洗濯', '洗濯'], [])).toEqual(['洗濯']);
  });

  it('空・空白だけのタイトルは無視する', () => {
    expect(planDailyTitles(['', '   ', undefined, null, '皿洗い'], [])).toEqual(['皿洗い']);
  });

  it('前後の空白を落としたうえで既存と突き合わせる', () => {
    expect(planDailyTitles(['  洗濯  '], ['洗濯'])).toEqual([]);
    expect(planDailyTitles(['  洗濯  '], [])).toEqual(['洗濯']);
  });

  it('既存側の空白・欠損値で落ちない', () => {
    expect(planDailyTitles(['洗濯'], [undefined, null, '   '])).toEqual(['洗濯']);
  });

  it('テンプレの順序を保つ', () => {
    expect(planDailyTitles(['A', 'B', 'C'], [])).toEqual(['A', 'B', 'C']);
  });

  it('全部重複なら空（＝1件も書き込まない）', () => {
    expect(planDailyTitles(['A', 'B'], ['A', 'B'])).toEqual([]);
  });
});

describe('planTaskCleanup（deleteMyAccount のデータ削除の完全性）', () => {
  it('個人世帯のタスクは削除する', () => {
    const plan = planTaskCleanup({ personalPaths: ['tasks/p1'], ownedPaths: [], completedPaths: [] });
    expect(plan.delete).toEqual(['tasks/p1']);
    expect(plan.anonymize).toEqual([]);
  });

  it('共有世帯の自作タスクは残して作成者情報だけ落とす', () => {
    const plan = planTaskCleanup({ personalPaths: [], ownedPaths: ['tasks/s1'], completedPaths: [] });
    expect(plan.delete).toEqual([]);
    expect(plan.anonymize).toEqual([{ path: 'tasks/s1', clearOwner: true, clearCompleter: false }]);
  });

  it('自分が完了しただけのタスクは完了者情報だけ落とす', () => {
    const plan = planTaskCleanup({ personalPaths: [], ownedPaths: [], completedPaths: ['tasks/s2'] });
    expect(plan.anonymize).toEqual([{ path: 'tasks/s2', clearOwner: false, clearCompleter: true }]);
  });

  it('作成も完了も自分のタスクは1回の更新にまとまる', () => {
    const plan = planTaskCleanup({
      personalPaths: [],
      ownedPaths: ['tasks/s3'],
      completedPaths: ['tasks/s3'],
    });
    expect(plan.anonymize).toEqual([{ path: 'tasks/s3', clearOwner: true, clearCompleter: true }]);
  });

  it('削除するタスクは更新対象に入れない（削除済みドキュメントへの update を避ける）', () => {
    const plan = planTaskCleanup({
      personalPaths: ['tasks/p1'],
      ownedPaths: ['tasks/p1'],
      completedPaths: ['tasks/p1'],
    });
    expect(plan.delete).toEqual(['tasks/p1']);
    expect(plan.anonymize).toEqual([]);
  });

  it('同じタスクが複数回渡っても削除は1回だけ', () => {
    const plan = planTaskCleanup({
      personalPaths: ['tasks/p1', 'tasks/p1'],
      ownedPaths: [],
      completedPaths: [],
    });
    expect(plan.delete).toEqual(['tasks/p1']);
  });

  it('個人世帯と共有世帯が混ざっていても取り違えない', () => {
    const plan = planTaskCleanup({
      personalPaths: ['tasks/p1'],
      ownedPaths: ['tasks/p1', 'tasks/s1'],
      completedPaths: ['tasks/s2'],
    });
    expect(plan.delete).toEqual(['tasks/p1']);
    expect(plan.anonymize).toEqual([
      { path: 'tasks/s1', clearOwner: true, clearCompleter: false },
      { path: 'tasks/s2', clearOwner: false, clearCompleter: true },
    ]);
  });

  it('対象が無ければ何もしない', () => {
    expect(planTaskCleanup({ personalPaths: [], ownedPaths: [], completedPaths: [] }))
      .toEqual({ delete: [], anonymize: [] });
  });
});

describe('planJoin（joinByInvite の遷移）', () => {
  const uid = 'u1';

  it('個人世帯から参加するとき、外す旧世帯はない', () => {
    expect(planJoin({ uid, hid: 'h1', members: ['u2'], prevHid: uid }))
      .toEqual({ alreadyJoined: false, addToNew: true, removeFrom: null });
  });

  it('別の世帯から移るとき、旧世帯から外す', () => {
    expect(planJoin({ uid, hid: 'h2', members: ['u3'], prevHid: 'h1' }))
      .toEqual({ alreadyJoined: false, addToNew: true, removeFrom: 'h1' });
  });

  it('プロフィールに householdId が無くても参加できる', () => {
    expect(planJoin({ uid, hid: 'h1', members: [], prevHid: undefined }))
      .toEqual({ alreadyJoined: false, addToNew: true, removeFrom: null });
  });

  it('すでに完全に参加済みなら何もしない', () => {
    expect(planJoin({ uid, hid: 'h1', members: [uid, 'u2'], prevHid: 'h1' }))
      .toEqual({ alreadyJoined: true, addToNew: false, removeFrom: null });
  });

  it('householdId は指しているが members にいない状態は修復する', () => {
    expect(planJoin({ uid, hid: 'h1', members: ['u2'], prevHid: 'h1' }))
      .toEqual({ alreadyJoined: false, addToNew: true, removeFrom: null });
  });

  it('修復のときに参加先そのものから自分を外さない', () => {
    const plan = planJoin({ uid, hid: 'h1', members: [], prevHid: 'h1' });
    expect(plan.removeFrom).toBeNull();
  });
});

describe('normalizeInviteCode（joinByInvite のバリデーション）', () => {
  it('小文字と前後空白を正規化する', () => {
    expect(normalizeInviteCode('  ab2cd3 ')).toBe('AB2CD3');
  });

  it.each([['空文字', ''], ['空白のみ', '   ']])('%s は受け付けない', (_label, input) => {
    expect(normalizeInviteCode(input)).toBeNull();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['数値', 123],
    ['オブジェクト', { code: 'AB2CD3' }],
  ])('%s は受け付けない', (_label, input) => {
    expect(normalizeInviteCode(input)).toBeNull();
  });

  it('長すぎる入力は受け付けない（無駄なクエリを投げない）', () => {
    expect(normalizeInviteCode('A'.repeat(33))).toBeNull();
    expect(normalizeInviteCode('A'.repeat(32))).toBe('A'.repeat(32));
  });
});

describe('normalizeHouseholdName', () => {
  it('前後の空白を落とす', () => {
    expect(normalizeHouseholdName('  山田家 ')).toBe('山田家');
  });

  it.each([['空文字', ''], ['空白のみ', '  '], ['非文字列', 42]])('%s は既定値になる', (_l, input) => {
    expect(normalizeHouseholdName(input)).toBe(DEFAULT_HOUSEHOLD_NAME);
  });

  it('長すぎる名前は切り詰める', () => {
    expect(normalizeHouseholdName('あ'.repeat(80))).toHaveLength(50);
  });
});

describe('inviteCodeFromBytes', () => {
  it('決められた桁数で、決められた文字集合だけを使う', () => {
    const code = inviteCodeFromBytes([0, 31, 32, 255, 128, 7]);
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect([...code].every((c) => INVITE_ALPHABET.includes(c))).toBe(true);
  });

  it('同じバイト列からは同じコードが出る', () => {
    const bytes = [1, 2, 3, 4, 5, 6];
    expect(inviteCodeFromBytes(bytes)).toBe(inviteCodeFromBytes(bytes));
  });

  it('文字集合が256の約数なので剰余の偏りが出ない', () => {
    expect(256 % INVITE_ALPHABET.length).toBe(0);
  });
});

describe('招待コードの試行回数制限', () => {
  const T0 = 1_700_000_000_000;

  it('記録が無ければブロックしない', () => {
    expect(isJoinBlocked(null, T0)).toBe(false);
  });

  it('上限未満はブロックしない', () => {
    expect(isJoinBlocked({ attemptCount: JOIN_MAX_ATTEMPTS - 1, firstAttemptAtMs: T0 }, T0)).toBe(false);
  });

  it('ウィンドウ内で上限に達したらブロックする', () => {
    expect(isJoinBlocked({ attemptCount: JOIN_MAX_ATTEMPTS, firstAttemptAtMs: T0 }, T0 + 1000)).toBe(true);
  });

  it('ウィンドウを過ぎればブロックは解ける', () => {
    const state = { attemptCount: JOIN_MAX_ATTEMPTS + 5, firstAttemptAtMs: T0 };
    expect(isJoinBlocked(state, T0 + JOIN_ATTEMPT_WINDOW_MS)).toBe(false);
  });

  it('初回の試行はカウント1で始まる', () => {
    expect(nextJoinAttempt(null, T0)).toEqual({ attemptCount: 1, firstAttemptAtMs: T0 });
  });

  it('ウィンドウ内の試行は積み上がる（起点は動かさない）', () => {
    expect(nextJoinAttempt({ attemptCount: 3, firstAttemptAtMs: T0 }, T0 + 60_000))
      .toEqual({ attemptCount: 4, firstAttemptAtMs: T0 });
  });

  it('ウィンドウを過ぎたら数え直す', () => {
    expect(nextJoinAttempt({ attemptCount: 9, firstAttemptAtMs: T0 }, T0 + JOIN_ATTEMPT_WINDOW_MS))
      .toEqual({ attemptCount: 1, firstAttemptAtMs: T0 + JOIN_ATTEMPT_WINDOW_MS });
  });
});
