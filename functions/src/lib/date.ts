// JST(UTC+9)基準の日付ユーティリティ。
// 実行環境のタイムゾーンに依存しないよう、UTC からの固定オフセットで計算する。
// クライアント側の src/lib/date.ts と同じ計算結果になる必要がある（dateKey を突き合わせるため）。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

/** JST の当日キー(YYYY-MM-DD) */
export function todayKeyJST(date = new Date()): string {
  const jst = toJst(date);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** JST の曜日(0=日 ... 6=土) */
export function todayWeekdayJST(date = new Date()): number {
  return toJst(date).getUTCDay();
}
