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

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
/** 'YYYY-MM-DD' → 'M/D(曜)'。空や不正な日付は '' を返す */
export function formatEventDateJa(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS_JA[d.getDay()]})`;
}

const TIMETABLE_HEADING = '■当日の流れ';
const NEXT_SECTION_MARK_RE = /^[■▶]/;

/**
 * 詳細文（announcement）から「■当日の流れ」セクションを除去する。
 * 当日の流れは主催者だけが進行イメージのページで見る情報にし、公開する詳細文には載せない方針。
 * 旧バージョンで機械挿入されたセクションが保存データに残っている場合の掃除にも使う。
 */
export function removeTimetableSection(announcement: string): string {
  if (!announcement || !announcement.includes(TIMETABLE_HEADING)) return announcement;

  // セクションの範囲を探す（見出し行〜次の■/▶の手前まで）
  const lines = announcement.split('\n');
  const startIdx = lines.findIndex((l) => l.trim() === TIMETABLE_HEADING);
  if (startIdx === -1) return announcement;
  let endIdx = lines.length; // 除外側の終端（この行の手前まで）
  for (let j = startIdx + 1; j < lines.length; j++) {
    if (NEXT_SECTION_MARK_RE.test(lines[j].trim())) {
      endIdx = j;
      break;
    }
  }

  const before = lines.slice(0, startIdx);
  const after = lines.slice(endIdx);
  // beforeの末尾・afterの先頭の余分な空行を軽くトリム
  while (before.length > 0 && before[before.length - 1].trim() === '') before.pop();
  while (after.length > 0 && after[0].trim() === '') after.shift();

  const merged = [...before];
  if (before.length > 0 && after.length > 0) merged.push('');
  merged.push(...after);
  return merged.join('\n').trim();
}
