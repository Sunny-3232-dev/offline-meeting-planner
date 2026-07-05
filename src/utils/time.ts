import type { EventBasics, ScheduleItem } from '../types';

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

const TIMETABLE_HEADING = '■当日の流れ';
const NEXT_SECTION_MARK_RE = /^[■▶]/;

/** schedule から「■当日の流れ」セクション文字列を機械生成する。空なら '' を返す */
export function buildTimetableSection(basics: EventBasics, schedule: ScheduleItem[]): string {
  if (schedule.length === 0) return '';
  const ranges = computeTimeRanges(basics.startTime, schedule);
  const lines = schedule.map(
    (s, i) => `${ranges[i]} ${s.title}${s.description ? `（${s.description}）` : ''}`
  );
  return `${TIMETABLE_HEADING}\n${lines.join('\n')}`;
}

/**
 * 既存の詳細文（announcement）の「■当日の流れ」セクションを、
 * schedule から機械生成したタイムテーブルで同期する。
 * - 既存セクションがあれば置換
 * - 無ければ「■参加費用」の直前（それも無ければ末尾のガイドライン▶の直前）に挿入
 * - schedule が空ならセクションごと除去
 */
export function syncTimetableSection(
  announcement: string,
  basics: EventBasics,
  schedule: ScheduleItem[]
): string {
  const newSection = buildTimetableSection(basics, schedule);

  if (!announcement) return newSection;

  // 既存の「■当日の流れ」セクションの範囲を探す（見出し行〜次の■/▶の手前まで）
  const lines = announcement.split('\n');
  let startIdx = -1;
  let endIdx = lines.length; // 除外側の終端（この行の手前まで）
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === TIMETABLE_HEADING) {
      startIdx = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (NEXT_SECTION_MARK_RE.test(lines[j].trim())) {
          endIdx = j;
          break;
        }
      }
      break;
    }
  }

  if (startIdx !== -1) {
    // 既存セクションを新しいセクションで置換（無ければ丸ごと除去）
    const before = lines.slice(0, startIdx);
    const after = lines.slice(endIdx);
    // beforeの末尾・afterの先頭の余分な空行を軽くトリム
    while (before.length > 0 && before[before.length - 1].trim() === '') before.pop();
    while (after.length > 0 && after[0].trim() === '') after.shift();

    if (!newSection) {
      // セクション除去。beforeとafterを1行空けて連結
      const merged = [...before];
      if (before.length > 0 && after.length > 0) merged.push('');
      merged.push(...after);
      return merged.join('\n').trim();
    }

    const merged = [...before];
    if (before.length > 0) merged.push('');
    merged.push(...newSection.split('\n'));
    if (after.length > 0) merged.push('', ...after);
    return merged.join('\n').trim();
  }

  // 既存セクションが無い場合
  if (!newSection) return announcement.trim();

  // 「■参加費用」の直前に挿入
  const feeIdx = lines.findIndex((l) => l.trim().startsWith('■参加費用'));
  if (feeIdx !== -1) {
    const before = lines.slice(0, feeIdx);
    while (before.length > 0 && before[before.length - 1].trim() === '') before.pop();
    const after = lines.slice(feeIdx);
    const merged = [...before];
    if (before.length > 0) merged.push('');
    merged.push(...newSection.split('\n'), '', ...after);
    return merged.join('\n').trim();
  }

  // 「■参加費用」も無ければ、末尾のガイドライン（▶）の手前に挿入
  const guidelineIdx = lines.findIndex((l) => l.trim().startsWith('▶'));
  if (guidelineIdx !== -1) {
    const before = lines.slice(0, guidelineIdx);
    while (before.length > 0 && before[before.length - 1].trim() === '') before.pop();
    const after = lines.slice(guidelineIdx);
    const merged = [...before];
    if (before.length > 0) merged.push('');
    merged.push(...newSection.split('\n'), '', ...after);
    return merged.join('\n').trim();
  }

  // どちらも無ければ末尾に追記
  return `${announcement.trim()}\n\n${newSection}`;
}
