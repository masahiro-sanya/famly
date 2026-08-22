import { todayKeyJST, todayWeekdayJST } from './date';

// 実行環境のタイムゾーンに依存しないよう、テストは常に絶対時刻(オフセット付きISO)で指定する。
const at = (iso: string) => new Date(iso);

describe('todayKeyJST', () => {
  it('JST の日中の時刻をその日のキーに変換する', () => {
    expect(todayKeyJST(at('2026-07-26T09:00:00+09:00'))).toBe('2026-07-26');
  });

  it('15時をまたいでも日付が変わらない（タイムゾーン二重補正の回帰テスト）', () => {
    expect(todayKeyJST(at('2026-07-26T14:59:59+09:00'))).toBe('2026-07-26');
    expect(todayKeyJST(at('2026-07-26T15:00:00+09:00'))).toBe('2026-07-26');
    expect(todayKeyJST(at('2026-07-26T23:59:59+09:00'))).toBe('2026-07-26');
  });

  it('JST の 00:00 で日付が切り替わる', () => {
    expect(todayKeyJST(at('2026-07-26T23:59:59+09:00'))).toBe('2026-07-26');
    expect(todayKeyJST(at('2026-07-27T00:00:00+09:00'))).toBe('2026-07-27');
  });

  it('スケジュール実行時刻(JST 05:00)でその日のキーを返す', () => {
    expect(todayKeyJST(at('2026-07-26T05:00:00+09:00'))).toBe('2026-07-26');
  });

  it('月末・年末をまたぐ境界を正しく扱う', () => {
    expect(todayKeyJST(at('2026-01-31T23:59:59+09:00'))).toBe('2026-01-31');
    expect(todayKeyJST(at('2026-02-01T00:00:00+09:00'))).toBe('2026-02-01');
    expect(todayKeyJST(at('2026-12-31T23:59:59+09:00'))).toBe('2026-12-31');
    expect(todayKeyJST(at('2027-01-01T00:00:00+09:00'))).toBe('2027-01-01');
  });
});

describe('todayWeekdayJST', () => {
  it('JST 基準の曜日を 0=日 ... 6=土 で返す', () => {
    // 2026-07-26 は日曜日
    expect(todayWeekdayJST(at('2026-07-26T05:00:00+09:00'))).toBe(0);
    expect(todayWeekdayJST(at('2026-07-27T05:00:00+09:00'))).toBe(1);
    expect(todayWeekdayJST(at('2026-08-01T05:00:00+09:00'))).toBe(6);
  });

  it('UTC では前日でも JST の曜日を返す', () => {
    // 2026-07-27T00:00+09:00 === 2026-07-26T15:00Z
    expect(todayWeekdayJST(at('2026-07-26T15:00:00Z'))).toBe(1);
  });
});
