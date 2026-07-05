import type { ScheduleItem } from '../types';

/** 'HH:mm' に分を加算して 'HH:mm' を返す（24時超えは翌日扱いで折り返し） */
export function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/** 開始時刻とduration累積から各行の時刻レンジ文字列を導出 */
export function computeTimeRanges(startTime: string, items: ScheduleItem[]): string[] {
  let offset = 0;
  return items.map((item) => {
    const from = addMinutes(startTime, offset);
    offset += item.durationMinutes;
    const to = addMinutes(startTime, offset);
    return `${from}–${to}`;
  });
}

export function totalDuration(items: ScheduleItem[]): number {
  return items.reduce((sum, i) => sum + i.durationMinutes, 0);
}

/** 'YYYY-MM-DD' → '2026年7月20日(月)' 形式 */
export function formatDateJa(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  const youbi = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${y}年${m}月${d}日(${youbi})`;
}
