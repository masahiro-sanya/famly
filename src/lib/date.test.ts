import { getTodayKey, getTodayWeekday } from './date';

// 実行マシンのタイムゾーンに依存しないよう、テストは常に絶対時刻(オフセット付きISO)で指定する。
const at = (iso: string) => new Date(iso);

describe('getTodayKey', () => {
  it('JST の日中の時刻をその日のキーに変換する', () => {
    expect(getTodayKey(at('2026-07-26T09:00:00+09:00'))).toBe('2026-07-26');
  });

  it('15時をまたいでも日付が変わらない（タイムゾーン二重補正の回帰テスト）', () => {
    expect(getTodayKey(at('2026-07-26T14:59:59+09:00'))).toBe('2026-07-26');
    expect(getTodayKey(at('2026-07-26T15:00:00+09:00'))).toBe('2026-07-26');
    expect(getTodayKey(at('2026-07-26T23:59:59+09:00'))).toBe('2026-07-26');
  });

  it('JST の 00:00 で日付が切り替わる', () => {
    expect(getTodayKey(at('2026-07-26T23:59:59+09:00'))).toBe('2026-07-26');
    expect(getTodayKey(at('2026-07-27T00:00:00+09:00'))).toBe('2026-07-27');
  });

  it('UTC 表記の同一時刻でも同じ結果になる', () => {
    // 2026-07-26T15:00:00+09:00 === 2026-07-26T06:00:00Z
    expect(getTodayKey(at('2026-07-26T06:00:00Z'))).toBe('2026-07-26');
    // JST 00:00 は UTC では前日 15:00
    expect(getTodayKey(at('2026-07-26T15:00:00Z'))).toBe('2026-07-27');
  });

  it('月末・年末をまたぐ境界を正しく扱う', () => {
    expect(getTodayKey(at('2026-01-31T23:59:59+09:00'))).toBe('2026-01-31');
    expect(getTodayKey(at('2026-02-01T00:00:00+09:00'))).toBe('2026-02-01');
    expect(getTodayKey(at('2026-12-31T23:59:59+09:00'))).toBe('2026-12-31');
    expect(getTodayKey(at('2027-01-01T00:00:00+09:00'))).toBe('2027-01-01');
  });

  it('ゼロ埋めされた YYYY-MM-DD を返す', () => {
    expect(getTodayKey(at('2026-03-05T12:00:00+09:00'))).toBe('2026-03-05');
  });
});

describe('getTodayWeekday', () => {
  it('JST 基準の曜日を 0=日 ... 6=土 で返す', () => {
    // 2026-07-26 は日曜日
    expect(getTodayWeekday(at('2026-07-26T09:00:00+09:00'))).toBe(0);
    expect(getTodayWeekday(at('2026-07-27T09:00:00+09:00'))).toBe(1);
    expect(getTodayWeekday(at('2026-08-01T09:00:00+09:00'))).toBe(6);
  });

  it('15時以降も同じ曜日のままになる', () => {
    expect(getTodayWeekday(at('2026-07-26T23:00:00+09:00'))).toBe(0);
  });

  it('JST 00:00 直後は UTC では前日でも JST の曜日を返す', () => {
    // 2026-07-27T00:00+09:00 === 2026-07-26T15:00Z（UTCでは日曜だがJSTでは月曜）
    expect(getTodayWeekday(at('2026-07-26T15:00:00Z'))).toBe(1);
  });
});
