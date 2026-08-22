// Firestore アクセスを含まない、純粋な判断ロジック。
// Cloud Functions 本体は「読む → plan で決める → 書く」の形にして、
// 判断部分（重複防止・削除/匿名化の振り分け・参加時の遷移）をここでテストする。
// エミュレータを起動できない環境でも検証できるようにするのが狙い。

/** 招待コードで使う文字集合。O/0・I/1 のような紛らわしい文字を外している。 */
export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** 招待コードの桁数 */
export const INVITE_CODE_LENGTH = 6;
/** 招待コードとして受け付ける最大長（無駄なクエリを防ぐための上限） */
const INVITE_CODE_MAX_INPUT = 32;
/** 世帯名の最大長 */
const HOUSEHOLD_NAME_MAX = 50;
/** 世帯名の既定値 */
export const DEFAULT_HOUSEHOLD_NAME = '家族';

/**
 * 乱数バイト列から招待コードを組み立てる。
 * 文字集合が32文字＝256の約数なので、剰余による偏りが出ない。
 */
export function inviteCodeFromBytes(bytes: ArrayLike<number>): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}

/** 入力された招待コードを正規化する。受け付けられない値なら null。 */
export function normalizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!code || code.length > INVITE_CODE_MAX_INPUT) return null;
  return code;
}

/** 入力された世帯名を正規化する。空なら既定値、長すぎる場合は切り詰める。 */
export function normalizeHouseholdName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) return DEFAULT_HOUSEHOLD_NAME;
  return name.slice(0, HOUSEHOLD_NAME_MAX);
}

/**
 * テンプレのタイトル一覧から、当日あらたに作るタイトルを決める。
 * すでに当日分として存在するタイトルと、テンプレ内の重複の両方を落とす。
 */
export function planDailyTitles(
  templateTitles: ReadonlyArray<string | undefined | null>,
  existingTitles: Iterable<string | undefined | null>
): string[] {
  const seen = new Set<string>();
  for (const raw of existingTitles) {
    const title = (raw ?? '').trim();
    if (title) seen.add(title);
  }
  const planned: string[] = [];
  for (const raw of templateTitles) {
    const title = (raw ?? '').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    planned.push(title);
  }
  return planned;
}

export type TaskAnonymizePlan = {
  path: string;
  /** 作成者情報（userId / userName）を落とすか */
  clearOwner: boolean;
  /** 完了者情報（completedByUserId / completedByName）を落とすか */
  clearCompleter: boolean;
};

export type TaskCleanupPlan = {
  /** 削除するタスクのパス */
  delete: string[];
  /** 残したまま本人の情報だけ落とすタスク */
  anonymize: TaskAnonymizePlan[];
};

/**
 * 退会時に tasks をどう扱うか決める。
 * - 個人世帯（householdId == uid）のタスクは退会後に誰も読めないので削除する
 * - 共有世帯のタスクは家族の記録なので残し、本人の情報だけ落とす
 * - 削除するタスクは更新しない / 同じタスクへの更新は1回にまとめる
 */
export function planTaskCleanup(input: {
  personalPaths: ReadonlyArray<string>;
  ownedPaths: ReadonlyArray<string>;
  completedPaths: ReadonlyArray<string>;
}): TaskCleanupPlan {
  const deleted = new Set(input.personalPaths);
  const anonymize = new Map<string, TaskAnonymizePlan>();

  const mark = (path: string, field: 'clearOwner' | 'clearCompleter') => {
    if (deleted.has(path)) return; // 削除するので更新不要
    const entry = anonymize.get(path) ?? { path, clearOwner: false, clearCompleter: false };
    entry[field] = true;
    anonymize.set(path, entry);
  };

  input.ownedPaths.forEach((p) => mark(p, 'clearOwner'));
  input.completedPaths.forEach((p) => mark(p, 'clearCompleter'));

  return { delete: [...deleted], anonymize: [...anonymize.values()] };
}

export type JoinPlan = {
  /** すでに参加済みで、何もする必要がない */
  alreadyJoined: boolean;
  /** 新世帯の members へ自分を追加するか */
  addToNew: boolean;
  /** 自分を外す旧世帯の ID（不要なら null） */
  removeFrom: string | null;
};

/**
 * 招待コードで参加するときの遷移を決める。
 * users.householdId が指しているだけで members に載っていない中途半端な状態は、
 * 追加(arrayUnion は冪等)を通すことで修復する。
 */
export function planJoin(params: {
  uid: string;
  hid: string;
  members: ReadonlyArray<string>;
  prevHid?: string | null;
}): JoinPlan {
  const { uid, hid, members, prevHid } = params;
  if (prevHid === hid && members.includes(uid)) {
    return { alreadyJoined: true, addToNew: false, removeFrom: null };
  }
  // 個人世帯(prevHid == uid)は households ドキュメントを持たないので外す対象がない
  const removeFrom = prevHid && prevHid !== uid && prevHid !== hid ? prevHid : null;
  return { alreadyJoined: false, addToNew: true, removeFrom };
}
