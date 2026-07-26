// 端末タイムゾーンに依存せず、JST(UTC+9)基準の日付を扱うユーティリティ。
// JST は夏時間を持たないため、UTC からの固定オフセットで計算できる。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 与えられた時刻を JST の壁時計時刻として読める Date に変換する（getUTC* で読む前提） */
function toJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

/** JST の当日キー(YYYY-MM-DD) */
export function getTodayKey(date = new Date()): string {
  const jst = toJst(date);
  const y = jst.getUTCFullYear();
  const m = `${jst.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${jst.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** JST の曜日(0=日 ... 6=土) */
export function getTodayWeekday(date = new Date()): number {
  return toJst(date).getUTCDay();
}
