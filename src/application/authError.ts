// Firebase Auth のエラーを画面表示用の日本語メッセージへ変換する純ロジック。
// firebase を import しないので、そのままユニットテストできる。

/**
 * ログイン失敗の原因は「メールが未登録」と「パスワード違い」で文言を分けない。
 * 分けると、任意のメールアドレスが登録済みかどうかを外部から判定できてしまう
 * （user enumeration）。
 */
const SIGN_IN_FAILED = 'メールアドレスまたはパスワードが正しくありません';

const COMMON_MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-email': 'メールアドレスの形式が正しくありません',
  'auth/missing-email': 'メールアドレスを入力してください',
  'auth/missing-password': 'パスワードを入力してください',
  'auth/network-request-failed': '通信に失敗しました。電波状況を確認して再度お試しください',
  'auth/too-many-requests': '試行回数が多すぎます。しばらく時間をおいて再度お試しください',
  'auth/user-disabled': 'このアカウントは利用できません',
};

/** ログイン時のみ、原因を伏せた共通文言に丸める。 */
export const SIGN_IN_ERRORS: Readonly<Record<string, string>> = {
  'auth/invalid-credential': SIGN_IN_FAILED,
  'auth/wrong-password': SIGN_IN_FAILED,
  'auth/user-not-found': SIGN_IN_FAILED,
  'auth/invalid-login-credentials': SIGN_IN_FAILED,
};

export const SIGN_UP_ERRORS: Readonly<Record<string, string>> = {
  'auth/email-already-in-use': 'このメールアドレスは既に登録されています',
  'auth/weak-password': 'パスワードは6文字以上で入力してください',
  'auth/operation-not-allowed': 'メールアドレスでの登録は現在利用できません',
};

/**
 * エラーの code だけを見てメッセージを決める。
 * Firebase の e.message は英語の開発者向け文言（"Firebase: Error (auth/...)"）なので
 * 画面には出さない。
 */
export function authErrorMessage(
  e: unknown,
  fallback: string,
  overrides: Readonly<Record<string, string>> = {}
): string {
  const code = (e as { code?: unknown } | null)?.code;
  if (typeof code !== 'string') return fallback;
  return overrides[code] ?? COMMON_MESSAGES[code] ?? fallback;
}
