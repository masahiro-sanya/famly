import { authErrorMessage, SIGN_IN_ERRORS, SIGN_UP_ERRORS } from './authError';

describe('authErrorMessage', () => {
  it('code が無ければ fallback を返す', () => {
    expect(authErrorMessage(new Error('boom'), 'ダメでした')).toBe('ダメでした');
    expect(authErrorMessage(null, 'ダメでした')).toBe('ダメでした');
    expect(authErrorMessage({ code: 42 }, 'ダメでした')).toBe('ダメでした');
  });

  it('英語の開発者向け message は絶対に返さない', () => {
    const e = { code: 'auth/internal-error', message: 'Firebase: Error (auth/internal-error).' };
    expect(authErrorMessage(e, 'ログインに失敗しました')).toBe('ログインに失敗しました');
  });

  it('共通コードは日本語に変換する', () => {
    expect(authErrorMessage({ code: 'auth/invalid-email' }, 'x')).toBe('メールアドレスの形式が正しくありません');
    expect(authErrorMessage({ code: 'auth/network-request-failed' }, 'x'))
      .toBe('通信に失敗しました。電波状況を確認して再度お試しください');
  });

  it('ログイン失敗は「未登録」と「パスワード違い」で文言を変えない', () => {
    const notFound = authErrorMessage({ code: 'auth/user-not-found' }, 'x', SIGN_IN_ERRORS);
    const wrongPassword = authErrorMessage({ code: 'auth/wrong-password' }, 'x', SIGN_IN_ERRORS);
    const invalid = authErrorMessage({ code: 'auth/invalid-credential' }, 'x', SIGN_IN_ERRORS);
    expect(notFound).toBe(wrongPassword);
    expect(invalid).toBe(wrongPassword);
  });

  it('登録時のコードは登録用の文言を使う', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' }, 'x', SIGN_UP_ERRORS))
      .toBe('このメールアドレスは既に登録されています');
    expect(authErrorMessage({ code: 'auth/weak-password' }, 'x', SIGN_UP_ERRORS))
      .toBe('パスワードは6文字以上で入力してください');
  });

  it('overrides は共通コードより優先される', () => {
    expect(authErrorMessage({ code: 'auth/invalid-email' }, 'x', { 'auth/invalid-email': '独自' }))
      .toBe('独自');
  });
});
