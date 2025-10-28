// 端末タイムゾーンに依存せず、JST(UTC+9)基準の当日キーを返す
export function getTodayKey(date = new Date()): string {
  const jst = new Date(date.getTime() + (9 * 60 - date.getTimezoneOffset()) * 60000);
  const y = jst.getUTCFullYear();
  const m = `${jst.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${jst.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
