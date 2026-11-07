// クライアント(src/lib/date.ts)と Functions(functions/src/lib/date.ts)の JST 計算が
// 一致していることを保証する契約テスト。
// dateKey は両者が生成した値を突き合わせるため、片方だけ直すと
// 「生成したタスクが一覧に出ない」という形で壊れる（実際に18時間ずれる不具合を出した）。
// 2ファイルに実装が分かれている限り、この一致はテストで縛る。
import { getTodayKey, getTodayWeekday } from './date';
import { todayKeyJST, todayWeekdayJST } from '../../functions/src/lib/date';

// 境界（JST 00:00 前後 / 15:00 前後 = UTC 日付境界）と、うるう年・年跨ぎを含める
const SAMPLES = [
  '2026-08-22T14:59:59.999Z', // JST 23:59:59 → 当日
  '2026-08-22T15:00:00.000Z', // JST 翌00:00 → 日付が変わる
  '2026-08-22T06:00:00.000Z', // JST 15:00（旧実装が壊れていた時刻帯）
  '2026-12-31T15:00:00.000Z', // 年跨ぎ
  '2024-02-28T15:00:00.000Z', // うるう年 2/29 へ
  '2026-01-01T00:00:00.000Z',
  '2026-07-26T00:00:00+09:00',
  '2026-07-27T23:59:59+09:00',
];

describe('src と functions の JST 実装が一致する', () => {
  it.each(SAMPLES)('%s の dateKey が一致する', (iso) => {
    const d = new Date(iso);
    expect(getTodayKey(d)).toBe(todayKeyJST(d));
  });

  it.each(SAMPLES)('%s の曜日が一致する', (iso) => {
    const d = new Date(iso);
    expect(getTodayWeekday(d)).toBe(todayWeekdayJST(d));
  });

  it('1年分の毎時刻でも一致する（総当たり）', () => {
    const start = Date.UTC(2026, 0, 1, 0, 0, 0);
    const hour = 60 * 60 * 1000;
    for (let i = 0; i < 24 * 366; i++) {
      const d = new Date(start + i * hour);
      expect(getTodayKey(d)).toBe(todayKeyJST(d));
      expect(getTodayWeekday(d)).toBe(todayWeekdayJST(d));
    }
  });
});
