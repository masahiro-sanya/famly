// Callable のエラーコードをユーザー向けメッセージに変換する。
// HttpsError の message は開発者向けの英語（'not a member' 等）なので、そのまま画面に出さない。
// Firebase を import しない純関数に切り出してあり、テストから直接呼べる。

/** どの Callable でも意味が変わらないコード */
const COMMON_MESSAGES: Readonly<Record<string, string>> = {
  'functions/unauthenticated': 'ログインし直してください',
  'functions/permission-denied': '操作する権限がありません',
  'functions/unavailable': '通信に失敗しました。電波状況を確認して再度お試しください',
  'functions/deadline-exceeded': '通信に失敗しました。電波状況を確認して再度お試しください',
};

/**
 * @param overrides その Callable でだけ意味が変わるコードの文言（共通文言より優先）
 * @param fallback  対応表にないコード・コード無しのエラーに使う文言
 */
export function callableErrorMessage(
  e: unknown,
  fallback: string,
  overrides: Readonly<Record<string, string>> = {}
): string {
  const code = (e as { code?: unknown } | null)?.code;
  if (typeof code !== 'string') return fallback;
  return overrides[code] ?? COMMON_MESSAGES[code] ?? fallback;
}

export const JOIN_ERRORS: Readonly<Record<string, string>> = {
  'functions/not-found': '招待コードが見つかりません',
  'functions/invalid-argument': '招待コードを入力してください',
};

export const REGENERATE_INVITE_ERRORS: Readonly<Record<string, string>> = {
  'functions/failed-precondition': '家族に参加してから招待コードを再発行してください',
  'functions/permission-denied': 'この家族のメンバーではありません',
  'functions/not-found': '家族が見つかりません',
  'functions/internal': '招待コードの再発行に失敗しました。時間をおいて再度お試しください',
};
