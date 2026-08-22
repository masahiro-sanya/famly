import {
  callableErrorMessage,
  JOIN_ERRORS,
  REGENERATE_INVITE_ERRORS,
} from './callableError';

describe('callableErrorMessage', () => {
  it('共通コードは共通の文言になる', () => {
    expect(callableErrorMessage({ code: 'functions/unauthenticated' }, '既定')).toBe('ログインし直してください');
  });

  it('Callable 固有の文言が共通文言より優先される', () => {
    expect(callableErrorMessage({ code: 'functions/permission-denied' }, '既定', REGENERATE_INVITE_ERRORS))
      .toBe('この家族のメンバーではありません');
  });

  it('同じコードでも Callable ごとに文脈に合った文言になる', () => {
    const e = { code: 'functions/not-found' };
    expect(callableErrorMessage(e, '既定', JOIN_ERRORS)).toBe('招待コードが見つかりません');
    expect(callableErrorMessage(e, '既定', REGENERATE_INVITE_ERRORS)).toBe('家族が見つかりません');
  });

  it('対応表にないコードは既定文言（開発者向けメッセージを画面に出さない）', () => {
    expect(callableErrorMessage({ code: 'functions/internal', message: 'not a member' }, '既定'))
      .toBe('既定');
  });

  it.each([
    ['コード無しの Error', new Error('boom')],
    ['null', null],
    ['undefined', undefined],
    ['コードが文字列でない', { code: 13 }],
  ])('%s は既定文言になる', (_label, e) => {
    expect(callableErrorMessage(e, '既定')).toBe('既定');
  });
});
